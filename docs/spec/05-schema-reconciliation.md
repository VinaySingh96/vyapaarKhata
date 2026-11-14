# vyapaarKhata — exact schema reconciliation

## Source files
- Original uploaded source: `schema.sql`
- Updated DBML for dbdiagram.io: `vyapaarkhata-schema-updated.dbml`
- Earlier generated table inventory: `05-schema-table-list.csv`

## Counts
- Original SQL/DBML tables: **102**
- Explicitly removed delivery/dispatch/fleet tables: **6**
- Updated DBML tables: **96**
- Earlier CSV data rows: **108** (plus one header row; 109 physical lines)
- Corrected CSV data rows: **96** (plus one header row; 97 physical lines)

## Exact table set difference
### Removed from original schema
- `deliveries`
- `delivery_challan_lines`
- `delivery_challans`
- `delivery_trips`
- `drivers`
- `vehicles`

### Added to updated DBML
- None

## Why the earlier CSV count was 108
The earlier CSV was not generated from the uploaded original `schema.sql`. Compared with the original schema it contained **12 table names not present in the original**:
- `landed_cost_allocations`
- `landed_cost_documents`
- `landed_cost_lines`
- `opening_account_balances`
- `opening_balance_batches`
- `opening_party_balances`
- `opening_stock_lines`
- `purchase_return_lines`
- `purchase_returns`
- `sales_return_lines`
- `sales_returns`
- `tax_document_submissions`

It also omitted these **6 original tables**:
- `deliveries`
- `delivery_challan_lines`
- `delivery_challans`
- `delivery_trips`
- `drivers`
- `vehicles`

The overlap between that CSV and the original schema is 96 tables. The corrected CSV is generated directly from the updated DBML table declarations and therefore contains exactly the updated schema's table set.

## Reference integrity
- Updated DBML `Ref:` declarations: **180**
- Each reference's referenced table/column was checked against the updated DBML definitions in the schema-generation pass.

## Scope note
The corrected DBML is intentionally a minimal transformation of the uploaded original schema: six delivery/dispatch/fleet tables removed, their references removed, dispatch-only `sales_order_lines.dispatched_quantity` removed, and `installations.is_primary` added to represent the single authoritative local server installation. No other tables were added or removed.
