export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled';
export type PlanTier = 'starter' | 'standard' | 'enterprise';
export type StoreType = 'jewellery' | 'building_materials' | 'general';
export type InstallationType = 'primary_laptop' | 'secondary_laptop' | 'android';
export type InstallationStatus = 'active' | 'pending_approval' | 'revoked';

export interface CentralTenant {
  id: string;
  slug: string;
  name: string;
  legalName?: string;
  storeType: StoreType;
  licenseNumber?: string;
  secretKey?: string;
  gstin?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  status: TenantStatus;
  plan: PlanTier;
  maxInstallations: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailySalesEarningsSummary {
  date: string;
  sales: number;
  earnings: number;
  invoicesCount: number;
  paymentsCount: number;
}

export interface MonthlySalesEarningsSummary {
  month: string;
  sales: number;
  earnings: number;
  invoicesCount: number;
  paymentsCount: number;
}

export interface TenantDashboardMetrics {
  tenantId: string;
  tenantName: string;
  storeType: StoreType;
  licenseNumber?: string;
  totalSyncEvents: number;
  lastSyncedAt?: string;
  // Daily Metrics
  todaySales: number;
  todayEarnings: number;
  todayInvoicesCount?: number;
  // Monthly Metrics
  thisMonthSales: number;
  thisMonthEarnings: number;
  thisMonthInvoicesCount?: number;
  // All-time Totals
  totalSales: number;
  totalEarnings: number;
  totalInvoicesCount: number;
  totalPaymentsCount: number;
  eventsByType: Record<string, number>;
  // Historical Breakdowns
  dailyBreakdown: DailySalesEarningsSummary[];
  monthlyBreakdown: MonthlySalesEarningsSummary[];
}

export interface CentralInstallation {
  id: string;
  tenantId: string;
  installationType: InstallationType;
  deviceName: string;
  hardwareFingerprint?: string;
  appVersion?: string;
  status: InstallationStatus;
  apiKey?: string;
  lastHeartbeatAt?: string;
  lastSyncedAt?: string;
  lastSequenceSynced: number;
  createdAt: string;
  updatedAt: string;
}

export interface CentralSubscription {
  id: string;
  tenantId: string;
  planTier: PlanTier;
  billingCycle: 'monthly' | 'yearly';
  validFrom: string;
  validUntil: string;
  status: 'active' | 'past_due' | 'expired';
  features: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SyncEventPayload {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId?: string;
  sequenceNumber?: number;
  payload: Record<string, unknown>;
  createdAt?: string;
}

export interface SyncPushBatch {
  tenantId: string;
  installationId: string;
  batchId: string;
  events: SyncEventPayload[];
}

export interface SyncPushResult {
  batchId: string;
  tenantId: string;
  acceptedCount: number;
  duplicateCount: number;
  acknowledgedEventIds: string[];
  serverTimestamp: string;
}

export interface CentralSyncRecord {
  id: string;
  tenantId: string;
  installationId?: string;
  eventId: string;
  sequenceNumber?: number;
  aggregateType: string;
  aggregateId?: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: 'received' | 'processed' | 'failed';
  receivedAt: string;
  processedAt?: string;
}

export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  totalInstallations: number;
  activeInstallations: number;
  totalSyncEvents: number;
  syncEventsToday: number;
  lastSyncTimestamp?: string;
}
