import fs from 'node:fs';

const content = fs.readFileSync('docs/spec/schema.sql', 'utf-8');

// Parse Table names
const tableRegex = /Table\s+([a-zA-Z0-9_]+)\s*\{([^}]*)\}/gs;
const tables = new Map<string, { columns: string[]; raw: string }>();

let match: RegExpExecArray | null;
while ((match = tableRegex.exec(content)) !== null) {
  const tableName = match[1];
  const body = match[2];
  const columns = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !line.startsWith('Note:'))
    .map((line) => line.split(/\s+/)[0])
    .filter(Boolean);

  tables.set(tableName, { columns, raw: body });
}

// Parse Ref lines
const refRegex = /Ref:\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*([<>-])\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/g;
const refs: Array<{ fromTable: string; fromCol: string; type: string; toTable: string; toCol: string }> = [];

while ((match = refRegex.exec(content)) !== null) {
  refs.push({
    fromTable: match[1],
    fromCol: match[2],
    type: match[3],
    toTable: match[4],
    toCol: match[5],
  });
}

console.log(`Tables detected: ${tables.size}`);
console.log(`Refs detected: ${refs.length}`);

// Check removed tables
const removedTables = [
  'vehicles',
  'drivers',
  'deliveries',
  'delivery_challans',
  'delivery_challan_lines',
  'delivery_trips',
];

const foundRemoved = removedTables.filter((t) => tables.has(t));
console.log(`Removed tables present (should be 0): ${foundRemoved.length} (${foundRemoved.join(', ')})`);

// Check installations.is_primary
const installations = tables.get('installations');
console.log(`installations.is_primary present: ${installations?.columns.includes('is_primary')}`);

// Check sales_order_lines.dispatched_quantity
const sol = tables.get('sales_order_lines');
console.log(`sales_order_lines.dispatched_quantity present (should be false): ${sol?.columns.includes('dispatched_quantity')}`);

// Validate references integrity
let brokenRefs = 0;
for (const ref of refs) {
  const from = tables.get(ref.fromTable);
  const to = tables.get(ref.toTable);

  if (!from) {
    console.error(`Broken Ref: from table "${ref.fromTable}" does not exist`);
    brokenRefs++;
  } else if (!from.columns.includes(ref.fromCol)) {
    console.error(`Broken Ref: from column "${ref.fromTable}.${ref.fromCol}" does not exist`);
    brokenRefs++;
  }

  if (!to) {
    console.error(`Broken Ref: to table "${ref.toTable}" does not exist`);
    brokenRefs++;
  } else if (!to.columns.includes(ref.toCol)) {
    console.error(`Broken Ref: to column "${ref.toTable}.${ref.toCol}" does not exist`);
    brokenRefs++;
  }
}

console.log(`Broken references count: ${brokenRefs}`);
