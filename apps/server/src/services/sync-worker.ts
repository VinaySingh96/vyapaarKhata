import { UnitOfWork } from '@vyapaarkhata/domain';

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
      // 1. Fetch pending outbox events from local DB
      const pendingEvents = await this.uow.runInTransaction(async (ctx) => {
        return ctx.outbox.listPending(this.localTenantId, 100);
      });

      if (pendingEvents.length === 0) {
        this.log.debug(`[Auto-Sync] Local store ${this.localTenantId} is up to date (0 pending events)`);
        return { syncedCount: 0, pendingRemaining: 0 };
      }

      this.log.info(
        `[Auto-Sync] Preparing to push ${pendingEvents.length} pending event(s) to Central Cloud for tenant ${this.centralTenantId}...`
      );

      const batchId = `AUTO-${Date.now()}`;
      const payload = {
        tenantId: this.centralTenantId,
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

      // 2. Transmit to Central Cloud
      const res = await fetch(`${this.centralServerUrl}/api/v1/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': this.centralTenantId,
          'x-installation-id': this.installationId,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        this.log.warn(
          `[Auto-Sync] Central Cloud rejected sync (status ${res.status}): ${text}`
        );
        return { syncedCount: 0, pendingRemaining: pendingEvents.length };
      }

      const json = (await res.json()) as any;
      if (!json.success) {
        this.log.warn(`[Auto-Sync] Central Cloud rejected sync: ${json.error?.message}`);
        return { syncedCount: 0, pendingRemaining: pendingEvents.length };
      }

      const ackIds: string[] = json.data?.acknowledgedEventIds || [];
      if (ackIds.length > 0) {
        // 3. Mark locally as synced
        await this.uow.runInTransaction(async (ctx) => {
          await ctx.outbox.markSynced(this.localTenantId, ackIds);
        });

        this.log.info(
          `✅ [Auto-Sync] Successfully synchronized ${ackIds.length} event(s) to Central Cloud (Accepted: ${json.data?.acceptedCount || 0}, Duplicates: ${json.data?.duplicateCount || 0})`
        );
      }

      return {
        syncedCount: ackIds.length,
        pendingRemaining: Math.max(0, pendingEvents.length - ackIds.length),
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
}
