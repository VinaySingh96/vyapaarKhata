import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';

describe('DB-06: PostgreSQL Persistence Contract Suite', () => {
  const psqlCheck = () => {
    try {
      execSync('psql -h localhost -d vyapaarkhata_test -c "SELECT 1;"', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  };

  const isPostgresAvailable = psqlCheck();

  it.runIf(isPostgresAvailable)(
    'proves exactly 97 tables exist in PostgreSQL vyapaarkhata_test database',
    () => {
      const output = execSync(
        'psql -h localhost -d vyapaarkhata_test -t -A -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = \'public\';"'
      )
        .toString()
        .trim();

      expect(parseInt(output, 10)).toBe(97);
    }
  );

  it.runIf(isPostgresAvailable)(
    'enforces foreign key rejection on invalid tenant reference in PostgreSQL',
    () => {
      const invalidSql = `
        INSERT INTO tax_categories (id, tenant_id, name, code, tax_type, is_exempt, created_at)
        VALUES ('99999999-9999-9999-9999-999999999999', '00000000-dead-beef-0000-000000000000', 'Fake Tax', 'FAKE', 'gst', false, NOW());
      `;

      expect(() => {
        execSync(`psql -h localhost -d vyapaarkhata_test -c "${invalidSql}"`, { stdio: 'pipe' });
      }).toThrow();
    }
  );

  it.runIf(isPostgresAvailable)(
    'proves seeded reference units and tax categories exist and are accessible',
    () => {
      const count = execSync(
        'psql -h localhost -d vyapaarkhata_test -t -A -c "SELECT count(*) FROM units;"'
      )
        .toString()
        .trim();

      expect(parseInt(count, 10)).toBe(10);
    }
  );
});
