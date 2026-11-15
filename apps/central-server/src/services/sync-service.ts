import { randomUUID } from 'node:crypto';
import { CentralDatabase } from '../db/central-db.js';
import { SyncPushBatch, SyncPushResult, CentralSyncRecord } from '../types/index.js';

export class SyncService {
  constructor(private db: CentralDatabase) {}

  /**
   * Ingest a batch of events pushed from a local installation.
   * Atomically saves each event in the central sync inbox with idempotency.
   */
  public async ingestSyncBatch(batch: SyncPushBatch): Promise<SyncPushResult> {
    const { tenantId, installationId, batchId, events } = batch;
    const client = await this.db.getPool().connect();

    let acceptedCount = 0;
    let duplicateCount = 0;
    const acknowledgedEventIds: string[] = [];
    let maxSequenceNumber = 0;

    try {
      await client.query('BEGIN');

      // Verify tenant is active
      const tCheck = await client.query('SELECT status FROM central_tenants WHERE id = $1', [tenantId]);
      if (tCheck.rows.length === 0) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }
      if (tCheck.rows[0].status === 'suspended' || tCheck.rows[0].status === 'cancelled') {
        throw new Error(`Tenant is ${tCheck.rows[0].status}. Sync writes rejected.`);
      }

      for (const ev of events) {
        const rawEventId = ev.eventId;
        const aggregateType = ev.aggregateType || ev.eventType.split('.')[0] || 'system';
        const aggregateId = ev.aggregateId || null;
        const seq = ev.sequenceNumber || 0;
        if (seq > maxSequenceNumber) maxSequenceNumber = seq;

        const insertRes = await client.query(
          `INSERT INTO central_sync_inbox (
             id, tenant_id, installation_id, event_id, sequence_number, aggregate_type, aggregate_id, event_type, payload, status, received_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, 'received', NOW()
           )
           ON CONFLICT (tenant_id, event_id) DO NOTHING
           RETURNING event_id`,
          [
            randomUUID(),
            tenantId,
            installationId || null,
            rawEventId,
            seq,
            aggregateType,
            aggregateId,
            ev.eventType,
            JSON.stringify(ev.payload || {}),
          ]
        );

        acknowledgedEventIds.push(rawEventId);
        if (insertRes.rows.length > 0) {
          acceptedCount++;
        } else {
          duplicateCount++;
        }
      }

      // Update installation sync timestamp & sequence
      if (installationId) {
        await client.query(
          `UPDATE central_installations
           SET last_synced_at = NOW(),
               last_heartbeat_at = NOW(),
               last_sequence_synced = GREATEST(last_sequence_synced, $1),
               updated_at = NOW()
           WHERE id = $2 AND tenant_id = $3`,
          [maxSequenceNumber, installationId, tenantId]
        );
      }

      await client.query('COMMIT');

      return {
        batchId,
        tenantId,
        acceptedCount,
        duplicateCount,
        acknowledgedEventIds,
        serverTimestamp: new Date().toISOString(),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Pull sync events for a tenant (e.g. for downstream devices or audit replay).
   */
  public async pullSyncEvents(
    tenantId: string,
    sinceSequence: number = 0,
    limit: number = 100
  ): Promise<CentralSyncRecord[]> {
    const res = await this.db.query(
      `SELECT * FROM central_sync_inbox
       WHERE tenant_id = $1 AND sequence_number > $2
       ORDER BY sequence_number ASC
       LIMIT $3`,
      [tenantId, sinceSequence, limit]
    );

    return res.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      installationId: r.installation_id || undefined,
      eventId: r.event_id,
      sequenceNumber: r.sequence_number,
      aggregateType: r.aggregate_type,
      aggregateId: r.aggregate_id || undefined,
      eventType: r.event_type,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
      status: r.status,
      receivedAt: new Date(r.received_at).toISOString(),
      processedAt: r.processed_at ? new Date(r.processed_at).toISOString() : undefined,
    }));
  }

  /**
   * Get sync status and telemetry for a tenant.
   */
  public async getSyncStatus(tenantId: string): Promise<{
    tenantId: string;
    totalEventsIngested: number;
    highestSequenceNumber: number;
    lastSyncedAt?: string;
    installations: {
      id: string;
      deviceName: string;
      lastSyncedAt?: string;
      lastSequenceSynced: number;
    }[];
  }> {
    const aggRes = await this.db.query(
      `SELECT COUNT(*) as total_events,
              COALESCE(MAX(sequence_number), 0) as max_seq,
              MAX(received_at) as last_sync
       FROM central_sync_inbox
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const instRes = await this.db.query(
      `SELECT id, device_name, last_synced_at, last_sequence_synced
       FROM central_installations
       WHERE tenant_id = $1
       ORDER BY last_synced_at DESC NULLS LAST`,
      [tenantId]
    );

    return {
      tenantId,
      totalEventsIngested: parseInt(aggRes.rows[0]?.total_events || '0', 10),
      highestSequenceNumber: parseInt(aggRes.rows[0]?.max_seq || '0', 10),
      lastSyncedAt: aggRes.rows[0]?.last_sync ? new Date(aggRes.rows[0].last_sync).toISOString() : undefined,
      installations: instRes.rows.map((r) => ({
        id: r.id,
        deviceName: r.device_name,
        lastSyncedAt: r.last_synced_at ? new Date(r.last_synced_at).toISOString() : undefined,
        lastSequenceSynced: r.last_sequence_synced || 0,
      })),
    };
  }

  /**
   * List recent sync events across all tenants or for a specific tenant for the Admin UI log stream.
   */
  public async listRecentEvents(tenantId?: string, limit: number = 50): Promise<
    (CentralSyncRecord & { tenantName?: string; deviceName?: string })[]
  > {
    let sql = `
      SELECT s.*, t.name as tenant_name, i.device_name
      FROM central_sync_inbox s
      JOIN central_tenants t ON t.id = s.tenant_id
      LEFT JOIN central_installations i ON i.id = s.installation_id
    `;
    const params: any[] = [];
    if (tenantId) {
      params.push(tenantId);
      sql += ` WHERE s.tenant_id = $1`;
    }
    params.push(limit);
    sql += ` ORDER BY s.received_at DESC LIMIT $${params.length}`;

    const res = await this.db.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      tenantName: r.tenant_name,
      installationId: r.installation_id || undefined,
      deviceName: r.device_name || undefined,
      eventId: r.event_id,
      sequenceNumber: r.sequence_number,
      aggregateType: r.aggregate_type,
      aggregateId: r.aggregate_id || undefined,
      eventType: r.event_type,
      payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
      status: r.status,
      receivedAt: new Date(r.received_at).toISOString(),
      processedAt: r.processed_at ? new Date(r.processed_at).toISOString() : undefined,
    }));
  }
}
