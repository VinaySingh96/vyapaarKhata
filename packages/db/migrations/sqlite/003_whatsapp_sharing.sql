-- vyapaarKhata SQLite Migration 003: WhatsApp Contact Support & Sharing Preferences (Additive only)
-- Follows FR-COMMS-001 §6.2, §8.2
PRAGMA foreign_keys = ON;

ALTER TABLE "parties" ADD COLUMN "whatsapp_phone" TEXT;
ALTER TABLE "parties" ADD COLUMN "whatsapp_opt_in" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "parties" ADD COLUMN "whatsapp_opt_in_at" TEXT;
ALTER TABLE "parties" ADD COLUMN "whatsapp_opt_in_source" TEXT;

INSERT OR IGNORE INTO "permissions" ("id", "code", "module", "description")
VALUES
  ('50000000-0000-0000-0000-000000000011', 'SALES_SHARE_WHATSAPP', 'sales', 'Share posted sales invoices via WhatsApp'),
  ('50000000-0000-0000-0000-000000000012', 'SALES_SHARE_PDF', 'sales', 'Share or export posted sales invoice PDFs');

INSERT OR IGNORE INTO schema_migrations (version) VALUES ('003_whatsapp_sharing');
