Table brands {
  // @color: #059669
  id uuid [pk]
  name varchar
  code varchar
  logo_url text
  primary_color varchar
  secondary_color varchar
  support_email varchar
  support_phone varchar
  default_locale varchar
  default_currency char
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
  updated_at timestamptz
}

Table brand_domains {
  // @color: #059669
  id uuid [pk]
  brand_id uuid [not null]
  domain varchar
  is_primary boolean [not null, default: `false`]
  is_verified boolean [not null, default: `false`]
  created_at timestamptz [not null]
}

Table tenants {
  // @color: #dc2626
  id uuid [pk]
  brand_id uuid [not null]
  name varchar
  slug varchar
  status varchar [not null, default: `'trial'`]
  country_code char
  timezone varchar
  currency char
  locale varchar
  trial_starts_at timestamptz
  trial_ends_at timestamptz
  created_at timestamptz [not null]
  updated_at timestamptz
  deleted_at timestamptz
}

Table business_profiles {
  // @color: #059669
  id uuid [pk]
  tenant_id uuid [not null, unique]
  legal_name varchar
  trade_name varchar
  business_type varchar
  gstin varchar
  pan varchar
  email varchar
  phone varchar
  website varchar
  logo_url text
  financial_year_start_month int [not null, default: `4`]
  default_tax_inclusive boolean [not null, default: `false`]
  created_at timestamptz [not null]
  updated_at timestamptz
}

Table business_locations {
  // @color: #059669
  id uuid [pk]
  tenant_id uuid [not null]
  name varchar
  code varchar
  location_type varchar
  phone varchar
  email varchar
  address_line_1 varchar
  address_line_2 varchar
  city varchar
  district varchar
  state_code varchar
  postal_code varchar
  country_code char
  gstin varchar
  is_default boolean [not null, default: `false`]
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
  updated_at timestamptz
}

Table users {
  // @color: #7c3aed
  id uuid [pk]
  email varchar
  phone varchar
  full_name varchar
  password_hash text
  auth_provider varchar
  auth_provider_user_id varchar
  is_platform_admin boolean [not null, default: `false`]
  is_active boolean [not null, default: `true`]
  last_login_at timestamptz
  created_at timestamptz [not null]
  updated_at timestamptz
}

Table user_memberships {
  // @color: #7c3aed
  id uuid [pk]
  tenant_id uuid [not null]
  user_id uuid [not null]
  status varchar [not null, default: `'invited'`]
  is_owner boolean [not null, default: `false`]
  joined_at timestamptz
  created_at timestamptz [not null]
}

Table roles {
  // @color: #059669
  id uuid [pk]
  tenant_id uuid
  name varchar
  code varchar
  description text
  is_system_role boolean [not null, default: `false`]
  created_at timestamptz [not null]
}

Table permissions {
  // @color: #4f46e5
  id uuid [pk]
  code varchar
  module varchar
  description text
}

Table role_permissions {
  // @color: #059669
  role_id uuid [not null]
  permission_id uuid [not null]
}

Table membership_roles {
  // @color: #7c3aed
  membership_id uuid [not null]
  role_id uuid [not null]
}

Table tenant_settings {
  // @color: #dc2626
  id uuid [pk]
  tenant_id uuid [not null]
  setting_key varchar
  setting_value jsonb [not null]
  updated_at timestamptz [not null]
}

Table subscription_plans {
  // @color: #d97706
  id uuid [pk]
  code varchar
  name varchar
  description text
  monthly_price varchar
  yearly_price varchar
  trial_days int [not null, default: `14`]
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
  updated_at timestamptz
}

Table features {
  // @color: #db2777
  id uuid [pk]
  code varchar
  name varchar
  description text
}

Table plan_features {
  // @color: #4f46e5
  id uuid [pk]
  plan_id uuid [not null]
  feature_id uuid [not null]
  enabled boolean [not null, default: `true`]
  usage_limit varchar
}

Table tenant_subscriptions {
  // @color: #dc2626
  id uuid [pk]
  tenant_id uuid [not null]
  plan_id uuid [not null]
  status varchar [not null]
  billing_cycle varchar
  starts_at timestamptz [not null]
  ends_at timestamptz
  trial_ends_at timestamptz
  cancelled_at timestamptz
  external_subscription_id varchar
  created_at timestamptz [not null]
  updated_at timestamptz
}

Table subscription_invoices {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  subscription_id uuid [not null]
  invoice_number varchar
  amount varchar
  tax_amount varchar
  total_amount varchar
  currency char
  status varchar
  due_at timestamptz
  paid_at timestamptz
  created_at timestamptz [not null]
}

Table license_activations {
  // @color: #dc2626
  id uuid [pk]
  tenant_id uuid [not null]
  installation_id uuid
  subscription_id uuid [not null]
  activation_token_hash text [not null]
  activated_at timestamptz
  last_validated_at timestamptz
  grace_until timestamptz
  revoked_at timestamptz
  created_at timestamptz [not null]
}

Table catalog_templates {
  // @color: #d97706
  id uuid [pk]
  brand_id uuid
  code varchar
  name varchar
  description text
  industry varchar
  version int [not null, default: `1`]
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
}

Table template_categories {
  // @color: #dc2626
  id uuid [pk]
  template_id uuid [not null]
  parent_id uuid
  name varchar
  code varchar
  sort_order int [not null, default: `0`]
}

Table template_attributes {
  // @color: #dc2626
  id uuid [pk]
  template_id uuid [not null]
  name varchar
  code varchar
  data_type varchar
  is_required boolean [not null, default: `false`]
  allowed_values jsonb
}

Table product_categories {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  parent_id uuid
  name varchar
  code varchar
  description text
  sort_order int [not null, default: `0`]
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
  updated_at timestamptz
}

Table attribute_definitions {
  // @color: #0891b2
  id uuid [pk]
  tenant_id uuid [not null]
  name varchar
  code varchar
  data_type varchar
  unit_id uuid
  allowed_values jsonb
  is_required boolean [not null, default: `false`]
  created_at timestamptz [not null]
}

Table category_attributes {
  // @color: #d97706
  category_id uuid [not null]
  attribute_id uuid [not null]
  is_required boolean [not null, default: `false`]
  sort_order int [not null, default: `0`]
}

Table products {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  category_id uuid
  product_type varchar [not null, default: `'goods'`]
  name varchar
  description text
  brand_name varchar
  manufacturer varchar
  is_stock_tracked boolean [not null, default: `true`]
  tracking_method varchar [not null, default: `'quantity'`]
  valuation_method varchar [not null, default: `'weighted_average'`]
  base_unit_id uuid [not null]
  default_purchase_unit_id uuid
  default_sales_unit_id uuid
  default_tax_category_id uuid
  hsn_sac_code varchar
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
  updated_at timestamptz
  deleted_at timestamptz
}

Table product_variants {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  product_id uuid [not null]
  sku varchar
  barcode varchar
  variant_name varchar
  purchase_price varchar
  selling_price varchar
  mrp varchar
  reorder_level varchar
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
  updated_at timestamptz
}

Table variant_attribute_values {
  // @color: #db2777
  id uuid [pk]
  variant_id uuid [not null]
  attribute_id uuid [not null]
  value_text text
  value_number varchar
  value_boolean boolean
  value_json jsonb
}

Table units {
  // @color: #7c3aed
  id uuid [pk]
  tenant_id uuid
  name varchar
  symbol varchar
  dimension varchar
  decimal_places int [not null, default: `2`]
  is_system boolean [not null, default: `false`]
  is_active boolean [not null, default: `true`]
}

Table unit_conversions {
  // @color: #7c3aed
  id uuid [pk]
  tenant_id uuid [not null]
  from_unit_id uuid [not null]
  to_unit_id uuid [not null]
  conversion_factor varchar
  product_id uuid
  variant_id uuid
  created_at timestamptz [not null]
}

Table tax_categories {
  // @color: #dc2626
  id uuid [pk]
  tenant_id uuid [not null]
  name varchar
  code varchar
  tax_type varchar [not null, default: `'gst'`]
  is_exempt boolean [not null, default: `false`]
  created_at timestamptz [not null]
}

Table tax_rates {
  // @color: #dc2626
  id uuid [pk]
  tenant_id uuid [not null]
  tax_category_id uuid [not null]
  name varchar
  rate varchar
  effective_from date [not null]
  effective_to date
  is_active boolean [not null, default: `true`]
}

Table tax_components {
  // @color: #dc2626
  id uuid [pk]
  tenant_id uuid [not null]
  tax_rate_id uuid [not null]
  component_name varchar
  component_code varchar
  rate varchar
}

Table tax_rules {
  // @color: #dc2626
  id uuid [pk]
  tenant_id uuid [not null]
  tax_category_id uuid [not null]
  source_state_code varchar
  destination_state_code varchar
  customer_type varchar
  is_interstate boolean
  effective_from date [not null]
  effective_to date
  created_at timestamptz [not null]
}

Table price_lists {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  name varchar
  code varchar
  currency char
  is_default boolean [not null, default: `false`]
  valid_from date
  valid_to date
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
}

Table product_prices {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  price_list_id uuid [not null]
  variant_id uuid [not null]
  unit_id uuid [not null]
  price varchar
  min_quantity varchar
  valid_from date
  valid_to date
  created_at timestamptz [not null]
}

Table parties {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  party_type varchar [not null]
  display_name varchar
  legal_name varchar
  gstin varchar
  pan varchar
  email varchar
  phone varchar
  alternate_phone varchar
  notes text
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
  updated_at timestamptz
  deleted_at timestamptz
}

Table party_roles {
  // @color: #4f46e5
  party_id uuid [not null]
  role varchar
}

Table party_contacts {
  // @color: #4f46e5
  id uuid [pk]
  party_id uuid [not null]
  name varchar
  designation varchar
  phone varchar
  email varchar
  is_primary boolean [not null, default: `false`]
}

Table party_addresses {
  // @color: #4f46e5
  id uuid [pk]
  party_id uuid [not null]
  address_type varchar [not null]
  address_line_1 varchar
  address_line_2 varchar
  city varchar
  district varchar
  state_code varchar
  postal_code varchar
  country_code char
  is_default boolean [not null, default: `false`]
}

Table party_credit_settings {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  party_id uuid [not null]
  credit_limit varchar
  credit_days int
  allow_credit boolean [not null, default: `true`]
  updated_at timestamptz [not null]
}

Table inventory_locations {
  // @color: #0891b2
  id uuid [pk]
  tenant_id uuid [not null]
  business_location_id uuid [not null]
  parent_id uuid
  name varchar
  code varchar
  location_type varchar
  is_default boolean [not null, default: `false`]
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
}

Table stock_balances {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  inventory_location_id uuid [not null]
  variant_id uuid [not null]
  quantity_on_hand varchar
  quantity_reserved varchar
  quantity_available varchar
  average_unit_cost varchar
  updated_at timestamptz [not null]
}

Table stock_movements {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  inventory_location_id uuid [not null]
  variant_id uuid [not null]
  movement_type varchar [not null]
  quantity varchar
  unit_id uuid [not null]
  base_quantity varchar
  unit_cost varchar
  total_cost varchar
  reference_type varchar
  reference_id uuid
  idempotency_key varchar
  notes text
  occurred_at timestamptz [not null]
  created_by uuid
  created_at timestamptz [not null]
}

Table stock_adjustments {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  adjustment_number varchar
  inventory_location_id uuid [not null]
  reason varchar
  status varchar [not null, default: `'draft'`]
  adjustment_date date [not null]
  notes text
  created_by uuid
  posted_at timestamptz
  created_at timestamptz [not null]
}

Table stock_adjustment_lines {
  // @color: #d97706
  id uuid [pk]
  adjustment_id uuid [not null]
  variant_id uuid [not null]
  unit_id uuid [not null]
  system_quantity varchar
  counted_quantity varchar
  difference_quantity varchar
  unit_cost varchar
  notes text
}

Table stock_transfers {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  transfer_number varchar
  source_location_id uuid [not null]
  destination_location_id uuid [not null]
  status varchar [not null, default: `'draft'`]
  transfer_date date [not null]
  notes text
  created_by uuid
  completed_at timestamptz
  created_at timestamptz [not null]
}

Table stock_transfer_lines {
  // @color: #d97706
  id uuid [pk]
  transfer_id uuid [not null]
  variant_id uuid [not null]
  unit_id uuid [not null]
  quantity varchar
  base_quantity varchar
}

Table stock_reservations {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  inventory_location_id uuid [not null]
  variant_id uuid [not null]
  reference_type varchar
  reference_id uuid [not null]
  quantity varchar
  status varchar
  expires_at timestamptz
  released_at timestamptz
  created_at timestamptz [not null]
}

Table inventory_batches {
  // @color: #0891b2
  id uuid [pk]
  tenant_id uuid [not null]
  variant_id uuid [not null]
  inventory_location_id uuid [not null]
  batch_number varchar
  manufacture_date date
  expiry_date date
  quantity_received varchar
  quantity_remaining varchar
  unit_cost varchar
  created_at timestamptz [not null]
}

Table stock_counts {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  count_number varchar
  inventory_location_id uuid [not null]
  status varchar [not null, default: `'draft'`]
  count_date date [not null]
  created_by uuid
  posted_at timestamptz
  created_at timestamptz [not null]
}

Table stock_count_lines {
  // @color: #d97706
  id uuid [pk]
  stock_count_id uuid [not null]
  variant_id uuid [not null]
  system_quantity varchar
  counted_quantity varchar
  difference_quantity varchar
  unit_id uuid [not null]
  notes text
}

Table purchase_orders {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  supplier_id uuid [not null]
  business_location_id uuid [not null]
  order_number varchar
  order_date date [not null]
  expected_date date
  status varchar [not null, default: `'draft'`]
  subtotal varchar
  discount_amount varchar
  tax_amount varchar
  total_amount varchar
  notes text
  created_by uuid
  created_at timestamptz [not null]
  updated_at timestamptz
}

Table purchase_order_lines {
  // @color: #4f46e5
  id uuid [pk]
  purchase_order_id uuid [not null]
  variant_id uuid [not null]
  description_snapshot varchar
  unit_id uuid [not null]
  quantity varchar
  received_quantity varchar
  unit_price varchar
  discount_amount varchar
  tax_rate varchar
  tax_amount varchar
  line_total varchar
}

Table purchase_receipts {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  supplier_id uuid [not null]
  purchase_order_id uuid
  inventory_location_id uuid [not null]
  receipt_number varchar
  receipt_date date [not null]
  status varchar [not null, default: `'draft'`]
  supplier_delivery_reference varchar
  notes text
  created_by uuid
  posted_at timestamptz
  created_at timestamptz [not null]
}

Table purchase_receipt_lines {
  // @color: #4f46e5
  id uuid [pk]
  receipt_id uuid [not null]
  purchase_order_line_id uuid
  variant_id uuid [not null]
  unit_id uuid [not null]
  received_quantity varchar
  accepted_quantity varchar
  rejected_quantity varchar
  unit_cost varchar
  batch_id uuid
  notes text
}

Table purchase_bills {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  supplier_id uuid [not null]
  business_location_id uuid [not null]
  bill_number varchar
  supplier_invoice_number varchar
  bill_date date [not null]
  due_date date
  status varchar [not null, default: `'draft'`]
  subtotal varchar
  discount_amount varchar
  tax_amount varchar
  other_charges varchar
  total_amount varchar
  amount_paid varchar
  notes text
  created_by uuid
  posted_at timestamptz
  created_at timestamptz [not null]
}

Table purchase_bill_lines {
  // @color: #4f46e5
  id uuid [pk]
  purchase_bill_id uuid [not null]
  purchase_receipt_line_id uuid
  variant_id uuid
  description_snapshot varchar
  hsn_sac_code varchar
  unit_id uuid [not null]
  quantity varchar
  unit_price varchar
  discount_amount varchar
  taxable_amount varchar
  tax_amount varchar
  line_total varchar
}

Table purchase_expense_allocations {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  purchase_bill_id uuid [not null]
  expense_id uuid
  description varchar
  allocation_method varchar
  amount varchar
  created_at timestamptz [not null]
}

Table quotations {
  // @color: #0891b2
  id uuid [pk]
  tenant_id uuid [not null]
  party_id uuid [not null]
  business_location_id uuid [not null]
  quotation_number varchar
  quotation_date date [not null]
  valid_until date
  status varchar [not null, default: `'draft'`]
  subtotal varchar
  discount_amount varchar
  tax_amount varchar
  total_amount varchar
  terms text
  notes text
  created_by uuid
  created_at timestamptz [not null]
}

Table quotation_lines {
  // @color: #0891b2
  id uuid [pk]
  quotation_id uuid [not null]
  variant_id uuid
  description_snapshot varchar
  sku_snapshot varchar
  hsn_sac_snapshot varchar
  unit_id uuid [not null]
  quantity varchar
  unit_price varchar
  discount_amount varchar
  taxable_amount varchar
  tax_amount varchar
  line_total varchar
}

Table sales_orders {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  party_id uuid [not null]
  business_location_id uuid [not null]
  order_number varchar
  order_date date [not null]
  expected_delivery_date date
  status varchar [not null, default: `'draft'`]
  subtotal varchar
  discount_amount varchar
  tax_amount varchar
  total_amount varchar
  notes text
  created_by uuid
  created_at timestamptz [not null]
}

Table sales_order_lines {
  // @color: #d97706
  id uuid [pk]
  sales_order_id uuid [not null]
  variant_id uuid [not null]
  description_snapshot varchar
  sku_snapshot varchar
  unit_id uuid [not null]
  quantity varchar
  reserved_quantity varchar
  unit_price varchar
  discount_amount varchar
  tax_amount varchar
  line_total varchar
}

Table sales_invoices {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  party_id uuid [not null]
  business_location_id uuid [not null]
  invoice_number varchar
  invoice_date date [not null]
  due_date date
  financial_year varchar
  status varchar [not null, default: `'draft'`]
  place_of_supply_state_code varchar
  billing_address_snapshot jsonb
  shipping_address_snapshot jsonb
  customer_name_snapshot varchar
  customer_gstin_snapshot varchar
  subtotal varchar
  discount_amount varchar
  taxable_amount varchar
  tax_amount varchar
  round_off varchar
  total_amount varchar
  amount_paid varchar
  notes text
  terms text
  created_by uuid
  posted_at timestamptz
  created_at timestamptz [not null]
  updated_at timestamptz
}

Table sales_invoice_lines {
  // @color: #d97706
  id uuid [pk]
  invoice_id uuid [not null]
  variant_id uuid
  description_snapshot varchar
  sku_snapshot varchar
  hsn_sac_snapshot varchar
  unit_name_snapshot varchar
  unit_id uuid
  quantity varchar
  base_quantity varchar
  unit_price varchar
  discount_amount varchar
  taxable_amount varchar
  tax_amount varchar
  line_total varchar
}

Table invoice_tax_components {
  // @color: #0891b2
  id uuid [pk]
  invoice_line_id uuid [not null]
  tax_name_snapshot varchar
  tax_code_snapshot varchar
  rate varchar
  taxable_amount varchar
  tax_amount varchar
}

Table invoice_charges {
  // @color: #0891b2
  id uuid [pk]
  invoice_id uuid [not null]
  description varchar
  charge_type varchar
  taxable_amount varchar
  tax_amount varchar
  amount varchar
}

Table credit_notes {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  party_id uuid [not null]
  invoice_id uuid
  credit_note_number varchar
  credit_note_date date [not null]
  reason text
  taxable_amount varchar
  tax_amount varchar
  total_amount varchar
  status varchar [not null, default: `'draft'`]
  created_at timestamptz [not null]
}

Table credit_note_lines {
  // @color: #d97706
  id uuid [pk]
  credit_note_id uuid [not null]
  invoice_line_id uuid
  variant_id uuid
  description_snapshot varchar
  quantity varchar
  unit_id uuid
  unit_price varchar
  taxable_amount varchar
  tax_amount varchar
  line_total varchar
}

Table debit_notes {
  // @color: #dc2626
  id uuid [pk]
  tenant_id uuid [not null]
  party_id uuid [not null]
  purchase_bill_id uuid
  debit_note_number varchar
  debit_note_date date [not null]
  reason text
  total_amount varchar
  status varchar [not null, default: `'draft'`]
  created_at timestamptz [not null]
}

Table debit_note_lines {
  // @color: #dc2626
  id uuid [pk]
  debit_note_id uuid [not null]
  purchase_bill_line_id uuid
  variant_id uuid
  description_snapshot varchar
  quantity varchar
  unit_id uuid
  taxable_amount varchar
  tax_amount varchar
  line_total varchar
}

Table payment_methods {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  name varchar
  code varchar
  is_active boolean [not null, default: `true`]
}

Table financial_accounts {
  // @color: #db2777
  id uuid [pk]
  tenant_id uuid [not null]
  name varchar
  account_type varchar
  bank_name varchar
  account_number_masked varchar
  opening_balance varchar
  is_default boolean [not null, default: `false`]
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
}

Table payments {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  party_id uuid
  financial_account_id uuid
  payment_method_id uuid [not null]
  payment_number varchar
  direction varchar [not null]
  status varchar [not null, default: `'draft'`]
  payment_date date [not null]
  amount varchar
  reference_number varchar
  notes text
  created_by uuid
  posted_at timestamptz
  created_at timestamptz [not null]
}

Table payment_allocations {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  payment_id uuid [not null]
  document_type varchar
  document_id uuid [not null]
  allocated_amount varchar
  created_at timestamptz [not null]
}

Table party_ledger_entries {
  // @color: #4f46e5
  id uuid [pk]
  tenant_id uuid [not null]
  party_id uuid [not null]
  entry_date date [not null]
  document_type varchar
  document_id uuid [not null]
  debit_amount varchar
  credit_amount varchar
  narration text
  created_at timestamptz [not null]
}

Table expense_categories {
  // @color: #7c3aed
  id uuid [pk]
  tenant_id uuid [not null]
  name varchar
  code varchar
  parent_id uuid
  is_active boolean [not null, default: `true`]
}

Table expenses {
  // @color: #7c3aed
  id uuid [pk]
  tenant_id uuid [not null]
  party_id uuid
  expense_category_id uuid [not null]
  financial_account_id uuid
  expense_number varchar
  expense_date date [not null]
  description text
  taxable_amount varchar
  tax_amount varchar
  total_amount varchar
  payment_status varchar
  created_by uuid
  created_at timestamptz [not null]
}

Table expense_attachments {
  // @color: #7c3aed
  id uuid [pk]
  tenant_id uuid [not null]
  expense_id uuid [not null]
  file_name varchar
  file_url text [not null]
  content_type varchar
  file_size bigint
  created_at timestamptz [not null]
}

Table accounts {
  // @color: #0891b2
  id uuid [pk]
  tenant_id uuid [not null]
  parent_id uuid
  account_code varchar
  name varchar
  account_type varchar
  normal_balance varchar
  is_system_account boolean [not null, default: `false`]
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
}

Table fiscal_years {
  // @color: #db2777
  id uuid [pk]
  tenant_id uuid [not null]
  name varchar
  starts_on date [not null]
  ends_on date [not null]
  is_closed boolean [not null, default: `false`]
}

Table journal_entries {
  // @color: #059669
  id uuid [pk]
  tenant_id uuid [not null]
  fiscal_year_id uuid
  journal_number varchar
  entry_date date [not null]
  narration text
  reference_type varchar
  reference_id uuid
  status varchar [not null, default: `'draft'`]
  total_debit varchar
  total_credit varchar
  created_by uuid
  posted_at timestamptz
  created_at timestamptz [not null]
}

Table journal_lines {
  // @color: #059669
  id uuid [pk]
  journal_entry_id uuid [not null]
  account_id uuid [not null]
  party_id uuid
  description text
  debit_amount varchar
  credit_amount varchar
  line_number int [not null]
}

Table file_attachments {
  // @color: #db2777
  id uuid [pk]
  tenant_id uuid [not null]
  entity_type varchar
  entity_id uuid [not null]
  file_name varchar
  storage_key text [not null]
  content_type varchar
  file_size bigint
  uploaded_by uuid
  created_at timestamptz [not null]
}

Table audit_logs {
  // @color: #0891b2
  id uuid [pk]
  tenant_id uuid
  user_id uuid
  entity_type varchar
  entity_id uuid
  action varchar
  old_values jsonb
  new_values jsonb
  ip_address varchar
  device_id uuid
  created_at timestamptz [not null]
}

Table activity_logs {
  // @color: #0891b2
  id uuid [pk]
  tenant_id uuid [not null]
  user_id uuid
  activity_type varchar
  description text
  metadata jsonb
  created_at timestamptz [not null]
}

Table installations {
  // @color: #0891b2
  id uuid [pk]
  tenant_id uuid [not null]
  installation_code varchar
  installation_name varchar
  platform varchar
  is_primary boolean [not null, default: `true`]
  app_version varchar
  database_version varchar
  last_seen_at timestamptz
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
}

Table installation_devices {
  // @color: #0891b2
  id uuid [pk]
  tenant_id uuid [not null]
  installation_id uuid [not null]
  device_code varchar
  device_name varchar
  device_type varchar
  last_seen_at timestamptz
  is_active boolean [not null, default: `true`]
  created_at timestamptz [not null]
}

Table sync_outbox {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  installation_id uuid [not null]
  event_id uuid [not null, unique]
  aggregate_type varchar
  aggregate_id uuid [not null]
  aggregate_version bigint
  sequence_number bigint [not null]
  event_type varchar
  payload jsonb [not null]
  status varchar [not null, default: `'pending'`]
  attempts int [not null, default: `0`]
  next_retry_at timestamptz
  last_error text
  created_at timestamptz [not null]
  acknowledged_at timestamptz
}

Table sync_inbox {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  source_installation_id uuid [not null]
  event_id uuid [not null]
  event_type varchar
  payload_hash varchar
  processed_at timestamptz
  created_at timestamptz [not null]
}

Table sync_cursors {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  installation_id uuid [not null]
  stream_name varchar
  last_acknowledged_sequence bigint [not null, default: `0`]
  updated_at timestamptz [not null]
}

Table sync_failures {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  outbox_event_id uuid [not null]
  failure_type varchar
  error_message text
  attempt_number int [not null]
  failed_at timestamptz [not null]
  resolved_at timestamptz
}

Table sync_conflicts {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid [not null]
  installation_id uuid [not null]
  entity_type varchar
  entity_id uuid [not null]
  local_version bigint
  cloud_version bigint
  local_payload jsonb
  cloud_payload jsonb
  resolution_strategy varchar
  resolved_by uuid
  resolved_at timestamptz
  created_at timestamptz [not null]
}

Table system_settings {
  // @color: #d97706
  id uuid [pk]
  tenant_id uuid
  setting_key varchar
  setting_value jsonb [not null]
  updated_at timestamptz [not null]
}

Table backup_records {
  // @color: #059669
  id uuid [pk]
  tenant_id uuid [not null]
  installation_id uuid [not null]
  backup_type varchar
  storage_location text [not null]
  file_size bigint
  checksum varchar
  status varchar
  started_at timestamptz [not null]
  completed_at timestamptz
  error_message text
}

Table hsn_sac_codes {
  // @color: #4f46e5
  id uuid [pk]
  code varchar
  description text
  code_type varchar
  is_active boolean [not null, default: `true`]
}

Table document_sequences {
  // @color: #dc2626
  id uuid [pk]
  tenant_id uuid [not null]
  business_location_id uuid
  document_type varchar
  financial_year varchar
  prefix varchar
  next_number bigint [not null, default: `1`]
  padding_length int [not null, default: `4`]
}

Ref: brand_domains.brand_id < brands.id
Ref: tenants.brand_id < brands.id
Ref: business_profiles.tenant_id - tenants.id
Ref: business_locations.tenant_id < tenants.id
Ref: users.id > user_memberships.user_id
Ref: tenants.id > user_memberships.tenant_id
Ref: roles.tenant_id < tenants.id
Ref: role_permissions.role_id < roles.id
Ref: role_permissions.permission_id < permissions.id
Ref: membership_roles.membership_id < user_memberships.id
Ref: membership_roles.role_id < roles.id
Ref: tenant_settings.tenant_id < tenants.id
Ref: plan_features.plan_id < subscription_plans.id
Ref: plan_features.feature_id < features.id
Ref: tenant_subscriptions.tenant_id < tenants.id
Ref: tenant_subscriptions.plan_id < subscription_plans.id
Ref: subscription_invoices.tenant_id < tenants.id
Ref: subscription_invoices.subscription_id < tenant_subscriptions.id
Ref: license_activations.tenant_id < tenants.id
Ref: license_activations.subscription_id < tenant_subscriptions.id
Ref: license_activations.installation_id < installations.id
Ref: catalog_templates.brand_id < brands.id
Ref: template_categories.template_id < catalog_templates.id
Ref: template_categories.parent_id < template_categories.id
Ref: template_attributes.template_id < catalog_templates.id
Ref: product_categories.tenant_id < tenants.id
Ref: product_categories.parent_id < product_categories.id
Ref: attribute_definitions.tenant_id < tenants.id
Ref: category_attributes.category_id < product_categories.id
Ref: category_attributes.attribute_id < attribute_definitions.id
Ref: products.tenant_id < tenants.id
Ref: products.category_id < product_categories.id
Ref: products.base_unit_id < units.id
Ref: products.default_purchase_unit_id < units.id
Ref: products.default_sales_unit_id < units.id
Ref: products.default_tax_category_id < tax_categories.id
Ref: product_variants.product_id < products.id
Ref: product_variants.tenant_id < tenants.id
Ref: variant_attribute_values.variant_id < product_variants.id
Ref: variant_attribute_values.attribute_id < attribute_definitions.id
Ref: unit_conversions.from_unit_id < units.id
Ref: unit_conversions.to_unit_id < units.id
Ref: unit_conversions.product_id < products.id
Ref: unit_conversions.variant_id < product_variants.id
Ref: attribute_definitions.unit_id < units.id
Ref: tax_categories.tenant_id < tenants.id
Ref: tax_rates.tax_category_id < tax_categories.id
Ref: tax_components.tax_rate_id < tax_rates.id
Ref: tax_rules.tax_category_id < tax_categories.id
Ref: price_lists.tenant_id < tenants.id
Ref: product_prices.price_list_id < price_lists.id
Ref: product_prices.variant_id < product_variants.id
Ref: product_prices.unit_id < units.id
Ref: parties.tenant_id < tenants.id
Ref: party_roles.party_id < parties.id
Ref: party_contacts.party_id < parties.id
Ref: party_addresses.party_id < parties.id
Ref: party_credit_settings.party_id < parties.id
Ref: party_credit_settings.tenant_id < tenants.id
Ref: inventory_locations.tenant_id < tenants.id
Ref: inventory_locations.business_location_id < business_locations.id
Ref: inventory_locations.parent_id < inventory_locations.id
Ref: stock_balances.inventory_location_id < inventory_locations.id
Ref: stock_balances.variant_id < product_variants.id
Ref: stock_movements.inventory_location_id < inventory_locations.id
Ref: stock_movements.variant_id < product_variants.id
Ref: stock_movements.unit_id < units.id
Ref: stock_adjustments.inventory_location_id < inventory_locations.id
Ref: stock_adjustment_lines.adjustment_id < stock_adjustments.id
Ref: stock_adjustment_lines.variant_id < product_variants.id
Ref: stock_adjustment_lines.unit_id < units.id
Ref: stock_transfers.source_location_id > inventory_locations.id
Ref: stock_transfers.destination_location_id < inventory_locations.id
Ref: stock_transfer_lines.transfer_id < stock_transfers.id
Ref: stock_transfer_lines.variant_id < product_variants.id
Ref: stock_transfer_lines.unit_id < units.id
Ref: stock_reservations.inventory_location_id < inventory_locations.id
Ref: stock_reservations.variant_id < product_variants.id
Ref: inventory_batches.variant_id < product_variants.id
Ref: inventory_batches.inventory_location_id < inventory_locations.id
Ref: stock_counts.inventory_location_id < inventory_locations.id
Ref: stock_count_lines.stock_count_id < stock_counts.id
Ref: stock_count_lines.variant_id < product_variants.id
Ref: stock_count_lines.unit_id < units.id
Ref: purchase_orders.supplier_id < parties.id
Ref: purchase_orders.business_location_id < business_locations.id
Ref: purchase_order_lines.purchase_order_id < purchase_orders.id
Ref: purchase_order_lines.variant_id < product_variants.id
Ref: purchase_order_lines.unit_id < units.id
Ref: purchase_receipts.supplier_id < parties.id
Ref: purchase_receipts.purchase_order_id < purchase_orders.id
Ref: purchase_receipts.inventory_location_id < inventory_locations.id
Ref: purchase_receipt_lines.receipt_id < purchase_receipts.id
Ref: purchase_receipt_lines.purchase_order_line_id < purchase_order_lines.id
Ref: purchase_receipt_lines.variant_id < product_variants.id
Ref: purchase_receipt_lines.unit_id < units.id
Ref: purchase_receipt_lines.batch_id < inventory_batches.id
Ref: purchase_bills.supplier_id < parties.id
Ref: purchase_bills.business_location_id < business_locations.id
Ref: purchase_bill_lines.purchase_bill_id < purchase_bills.id
Ref: purchase_bill_lines.purchase_receipt_line_id < purchase_receipt_lines.id
Ref: purchase_bill_lines.variant_id < product_variants.id
Ref: purchase_bill_lines.unit_id < units.id
Ref: purchase_expense_allocations.purchase_bill_id < purchase_bills.id
Ref: purchase_expense_allocations.expense_id < expenses.id
Ref: quotations.party_id < parties.id
Ref: quotations.business_location_id < business_locations.id
Ref: quotation_lines.quotation_id < quotations.id
Ref: quotation_lines.variant_id < product_variants.id
Ref: quotation_lines.unit_id < units.id
Ref: sales_orders.party_id < parties.id
Ref: sales_orders.business_location_id < business_locations.id
Ref: sales_order_lines.sales_order_id < sales_orders.id
Ref: sales_order_lines.variant_id < product_variants.id
Ref: sales_order_lines.unit_id < units.id
Ref: sales_invoices.party_id < parties.id
Ref: sales_invoices.business_location_id < business_locations.id
Ref: sales_invoice_lines.invoice_id < sales_invoices.id
Ref: sales_invoice_lines.variant_id < product_variants.id
Ref: sales_invoice_lines.unit_id < units.id
Ref: invoice_tax_components.invoice_line_id < sales_invoice_lines.id
Ref: invoice_charges.invoice_id < sales_invoices.id
Ref: credit_notes.party_id < parties.id
Ref: credit_notes.invoice_id < sales_invoices.id
Ref: credit_note_lines.credit_note_id < credit_notes.id
Ref: credit_note_lines.invoice_line_id < sales_invoice_lines.id
Ref: credit_note_lines.variant_id < product_variants.id
Ref: credit_note_lines.unit_id < units.id
Ref: debit_notes.party_id < parties.id
Ref: debit_notes.purchase_bill_id < purchase_bills.id
Ref: debit_note_lines.debit_note_id < debit_notes.id
Ref: debit_note_lines.purchase_bill_line_id < purchase_bill_lines.id
Ref: debit_note_lines.variant_id < product_variants.id
Ref: debit_note_lines.unit_id < units.id
Ref: payment_methods.tenant_id < tenants.id
Ref: financial_accounts.tenant_id < tenants.id
Ref: payments.tenant_id < tenants.id
Ref: payments.party_id < parties.id
Ref: payments.financial_account_id < financial_accounts.id
Ref: payments.payment_method_id < payment_methods.id
Ref: payment_allocations.payment_id < payments.id
Ref: payment_allocations.tenant_id < tenants.id
Ref: party_ledger_entries.party_id < parties.id
Ref: party_ledger_entries.tenant_id < tenants.id
Ref: expense_categories.tenant_id < tenants.id
Ref: expense_categories.parent_id < expense_categories.id
Ref: expenses.tenant_id < tenants.id
Ref: expenses.party_id < parties.id
Ref: expenses.expense_category_id < expense_categories.id
Ref: expenses.financial_account_id < financial_accounts.id
Ref: expense_attachments.expense_id < expenses.id
Ref: accounts.tenant_id < tenants.id
Ref: accounts.parent_id < accounts.id
Ref: fiscal_years.tenant_id < tenants.id
Ref: journal_entries.tenant_id < tenants.id
Ref: journal_entries.fiscal_year_id < fiscal_years.id
Ref: journal_lines.journal_entry_id < journal_entries.id
Ref: journal_lines.account_id < accounts.id
Ref: journal_lines.party_id < parties.id
Ref: file_attachments.tenant_id < tenants.id
Ref: audit_logs.tenant_id < tenants.id
Ref: audit_logs.user_id < users.id
Ref: activity_logs.tenant_id < tenants.id
Ref: activity_logs.user_id < users.id
Ref: installations.tenant_id < tenants.id
Ref: installation_devices.tenant_id < tenants.id
Ref: installation_devices.installation_id < installations.id
Ref: sync_outbox.tenant_id < tenants.id
Ref: sync_outbox.installation_id < installations.id
Ref: sync_inbox.tenant_id < tenants.id
Ref: sync_inbox.source_installation_id > installations.id
Ref: sync_cursors.tenant_id < tenants.id
Ref: sync_cursors.installation_id < installations.id
Ref: sync_failures.tenant_id < tenants.id
Ref: sync_failures.outbox_event_id < sync_outbox.id
Ref: sync_conflicts.tenant_id < tenants.id
Ref: sync_conflicts.installation_id < installations.id
Ref: backup_records.tenant_id < tenants.id
Ref: backup_records.installation_id < installations.id
Ref: system_settings.tenant_id < tenants.id
