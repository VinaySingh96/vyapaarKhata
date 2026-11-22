-- Migration 003: WhatsApp Contact Support & Sharing Preferences (Additive only)
-- Follows FR-COMMS-001 §6.2, §8.2

ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "whatsapp_phone" VARCHAR(255);
ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "whatsapp_opt_in" VARCHAR(50) NOT NULL DEFAULT 'unknown';
ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "whatsapp_opt_in_at" TIMESTAMPTZ;
ALTER TABLE "parties" ADD COLUMN IF NOT EXISTS "whatsapp_opt_in_source" VARCHAR(100);

-- System permissions for WhatsApp and PDF sharing (FR-COMMS-001 §4.2)
INSERT INTO "permissions" ("id", "code", "module", "description")
VALUES
  ('50000000-0000-0000-0000-000000000011', 'SALES_SHARE_WHATSAPP', 'sales', 'Share posted sales invoices via WhatsApp'),
  ('50000000-0000-0000-0000-000000000012', 'SALES_SHARE_PDF', 'sales', 'Share or export posted sales invoice PDFs')
ON CONFLICT ("id") DO NOTHING;

INSERT INTO schema_migrations (version) VALUES ('003_whatsapp_sharing') ON CONFLICT (version) DO NOTHING;

