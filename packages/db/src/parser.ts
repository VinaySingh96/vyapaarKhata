import fs from 'node:fs';

export interface ColumnDef {
  name: string;
  type: string;
  isPk: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  defaultValue?: string;
  note?: string;
}

export interface TableDef {
  name: string;
  color?: string;
  columns: ColumnDef[];
}

export interface RefDef {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: string; // '<', '>', '-'
}

export function parseSchema(content: string): { tables: TableDef[]; refs: RefDef[] } {
  const tableRegex = /Table\s+([a-zA-Z0-9_]+)\s*\{([^}]*)\}/gs;
  const tables: TableDef[] = [];

  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const body = match[2];

    let color: string | undefined;
    const colorMatch = body.match(/\/\/\s*@color:\s*([#a-zA-Z0-9]+)/);
    if (colorMatch) {
      color = colorMatch[1];
    }

    const lines = body.split('\n');
    const columns: ColumnDef[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//') || line.startsWith('Note:')) continue;

      const tokens = line.split(/\s+/);
      const name = tokens[0];
      const type = tokens[1];

      const isPk = /\[.*pk.*\]/i.test(line);
      const isNotNull = /\[.*not\s+null.*\]/i.test(line);
      const isUnique = /\[.*unique.*\]/i.test(line);

      let defaultValue: string | undefined;
      const defaultMatch = line.match(/default:\s*(`[^`]+`|'[^']+'|"[^"]+"|[0-9a-zA-Z_-]+)/);
      if (defaultMatch) {
        defaultValue = defaultMatch[1].replace(/^`|`$/g, '').trim();
      }

      columns.push({
        name,
        type,
        isPk,
        isNotNull,
        isUnique,
        defaultValue,
      });
    }

    tables.push({ name: tableName, color, columns });
  }

  const refRegex = /Ref:\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*([<>-])\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/g;
  const refs: RefDef[] = [];

  while ((match = refRegex.exec(content)) !== null) {
    const t1 = match[1];
    const c1 = match[2];
    const op = match[3];
    const t2 = match[4];
    const c2 = match[5];

    let fromTable = t1;
    let fromColumn = c1;
    let toTable = t2;
    let toColumn = c2;

    // Normalizing child -> parent
    // If op is '>', e.g. users.id > user_memberships.user_id:
    // child is user_memberships.user_id, parent is users.id
    if (op === '>') {
      if (c1 === 'id' && c2 !== 'id') {
        fromTable = t2;
        fromColumn = c2;
        toTable = t1;
        toColumn = c1;
      }
    }

    refs.push({
      fromTable,
      fromColumn,
      toTable,
      toColumn,
      type: op,
    });
  }

  return { tables, refs };
}
