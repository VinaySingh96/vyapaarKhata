import { UnitOfWork } from '@vyapaarkhata/domain';

/** Events sent per push request. */
const SYNC_BATCH_SIZE = 100;
/** Upper bound of batches per tenant per tick (100 x 50 = 5,000 events). */
const MAX_BATCHES_PER_TENANT_PER_TICK = 50;

export interface SyncWorkerOptions {
  uow: UnitOfWork;
  localTenantId: string;
  centralTenantId?: string;
  installationId: string;
  centralServerUrl: string;
  intervalMs?: number;
  log?: any;
}

export class AutoSyncWorker {
  private timer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private uow: UnitOfWork;
  private localTenantId: string;
  private centralTenantId: string;
  private installationId: string;
  private centralServerUrl: string;
  private intervalMs: number;
  private log: any;

  constructor(opts: SyncWorkerOptions) {
    this.uow = opts.uow;
    this.localTenantId = opts.localTenantId || '00000000-0000-0000-0000-000000000001';
    this.centralTenantId = opts.centralTenantId || opts.localTenantId || '00000000-0000-0000-0000-000000000001';
    this.installationId = opts.installationId || '00000000-0000-0000-0000-000000000001';
    this.centralServerUrl = opts.centralServerUrl.replace(/\/+$/, '');
    this.intervalMs = opts.intervalMs || 10 * 60 * 1000; // 10 minutes
    this.log = opts.log || console;
  }

  public start() {
    if (this.timer) return;

    this.log.info(
      `[Auto-Sync] Background sync worker scheduled every ${Math.round(this.intervalMs / 60000)}m ` +
      `(Local: ${this.localTenantId} -> Central: ${this.centralTenantId} at ${this.centralServerUrl})`
    );

    // Initial sync trigger 3 seconds after startup
    setTimeout(() => {
      this.syncNow().catch((err) => {
        this.log.warn({ err }, '[Auto-Sync] Initial startup sync encountered warning');
      });
    }, 3000);

    // Periodic sync interval (e.g. 10 minutes)
    this.timer = setInterval(() => {
      this.syncNow().catch((err) => {
        this.log.warn({ err }, '[Auto-Sync] Periodic sync encountered warning');
      });
    }, this.intervalMs);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.log.info('[Auto-Sync] Background sync worker stopped');
    }
  }

  public async syncNow(): Promise<{ syncedCount: number; pendingRemaining: number }> {
    if (this.isSyncing) {
      this.log.debug('[Auto-Sync] Sync already in progress, skipping duplicate tick');
      return { syncedCount: 0, pendingRemaining: 0 };
    }

    this.isSyncing = true;
    try {
      // 1. Identify distinct tenants that have pending outbox events
      const pendingTenantIds = await this.uow.runInTransaction(async (ctx) => {
        if (ctx.outbox.listPendingTenants) {
          const ids = await ctx.outbox.listPendingTenants();
          if (ids.length > 0) return ids;
        }
        return [this.localTenantId];
      });

      let totalSynced = 0;
      let totalRemaining = 0;

      for (const tId of pendingTenantIds) {
        // Drain this tenant's backlog in batches so busy (online) stores never fall behind;
        // capped per tick so one tenant cannot starve the others.
        for (let batchNo = 0; batchNo < MAX_BATCHES_PER_TENANT_PER_TICK; batchNo++) {
          const result = await this.pushBatch(tId);
          totalSynced += result.synced;
          if (result.failed || result.pending === 0) {
            totalRemaining += result.pending;
            break;
          }
          if (result.synced === 0) {
            totalRemaining += result.pending;
            break; // central acknowledged nothing; retry next tick instead of spinning
          }
          if (batchNo === MAX_BATCHES_PER_TENANT_PER_TICK - 1) {
            totalRemaining += result.pending - result.synced;
          }
        }
      }

      return {
        syncedCount: totalSynced,
        pendingRemaining: totalRemaining,
      };
    } catch (err: any) {
      this.log.warn(
        `[Auto-Sync] Unable to connect to Central Cloud at ${this.centralServerUrl}: ${err.message}. Will retry in next interval.`
      );
      return { syncedCount: 0, pendingRemaining: -1 };
    } finally {
      this.isSyncing = false;
    }
  }

  /** Pushes one batch of pending outbox events for a tenant to Central Cloud. */
  private async pushBatch(tId: string): Promise<{ synced: number; pending: number; failed: boolean }> {
    const pendingEvents = await this.uow.runInTransaction(async (ctx) => {
      return ctx.outbox.listPending(tId, SYNC_BATCH_SIZE);
    });

    if (pendingEvents.length === 0) return { synced: 0, pending: 0, failed: false };

    this.log.info(
      `[Auto-Sync] Preparing to push ${pendingEvents.length} pending event(s) to Central Cloud for tenant ${tId}...`
    );

    const batchId = `AUTO-${Date.now()}-${tId.slice(0, 8)}`;
    const payload = {
      tenantId: tId,
      installationId: this.installationId,
      batchId,
      events: pendingEvents.map((e) => ({
        eventId: e.eventId,
        eventType: e.eventType,
        aggregateType: e.aggregateType,
        aggregateId: e.aggregateId,
        sequenceNumber: e.sequenceNumber,
        payload: e.payload,
        createdAt: e.createdAt,
      })),
    };

    // Transmit to Central Cloud with tenant-specific headers and payload
    try {
      const res = await fetch(`${this.centralServerUrl}/api/v1/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tId,
          'x-installation-id': this.installationId,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        this.log.warn(`[Auto-Sync] Central Cloud rejected sync for tenant ${tId} (status ${res.status}): ${text}`);
        return { synced: 0, pending: pendingEvents.length, failed: true };
      }

      const json = (await res.json()) as any;
      if (!json.success) {
        this.log.warn(`[Auto-Sync] Central Cloud rejected sync for tenant ${tId}: ${json.error?.message}`);
        return { synced: 0, pending: pendingEvents.length, failed: true };
      }

      const ackIds: string[] = json.data?.acknowledgedEventIds || [];
      if (ackIds.length > 0) {
        // Mark locally as synced for this tenant
        await this.uow.runInTransaction(async (ctx) => {
          await ctx.outbox.markSynced(tId, ackIds);
        });

        this.log.info(
          `✅ [Auto-Sync] Successfully synchronized ${ackIds.length} event(s) for tenant ${tId} to Central Cloud (Accepted: ${json.data?.acceptedCount || 0}, Duplicates: ${json.data?.duplicateCount || 0})`
        );
      }

      return { synced: ackIds.length, pending: pendingEvents.length, failed: false };
    } catch (pushErr: any) {
      this.log.warn(`[Auto-Sync] Unable to sync batch for tenant ${tId} against Central Cloud: ${pushErr.message}`);
      return { synced: 0, pending: pendingEvents.length, failed: true };
    }
  }
}
