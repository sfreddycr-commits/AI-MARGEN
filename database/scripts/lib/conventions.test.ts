import { describe, expect, it } from 'vitest';
import { checkConventions } from './conventions.js';
import type { MigrationFile } from './migrator.js';

const v = (file: string, sql: string): MigrationFile => ({
  kind: 'versioned',
  version: file.slice(1, 5),
  name: file,
  file,
  checksum: 'x',
  sql,
});
const r = (name: string, sql: string): MigrationFile => ({
  kind: 'repeatable',
  version: name,
  name,
  file: `R__${name}.sql`,
  checksum: 'x',
  sql,
});

const TENANTS = v(
  'V0001__t.sql',
  `CREATE TABLE tenants (id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, name VARCHAR(10), PRIMARY KEY (id));`,
);

const GOOD_TABLE = v(
  'V0002__i.sql',
  `CREATE TABLE ingredients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tenant_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  KEY ix_ingredients_tenant_name (tenant_id, name),
  CONSTRAINT fk_ingredients_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id)
);`,
);

describe('checkConventions', () => {
  it('acepta un esquema correcto', async () => {
    const issues = await checkConventions([
      TENANTS,
      GOOD_TABLE,
      r(
        'sp_ingredient_list',
        `DROP PROCEDURE IF EXISTS sp_ingredient_list;
DELIMITER $$
CREATE PROCEDURE sp_ingredient_list(IN p_tenant_id BIGINT UNSIGNED)
BEGIN SELECT name FROM ingredients WHERE tenant_id = p_tenant_id; END$$
DELIMITER ;`,
      ),
    ]);
    expect(issues).toEqual([]);
  });

  it('C1: rechaza SP dentro de migración versionada', async () => {
    const issues = await checkConventions([
      v('V0001__x.sql', 'CREATE PROCEDURE sp_a() BEGIN END;'),
    ]);
    expect(issues.map((i) => i.rule)).toContain('C1');
  });

  it('C2/C3: el archivo debe crear el objeto con su nombre y hacer DROP previo', async () => {
    const issues = await checkConventions([r('sp_a', 'CREATE PROCEDURE sp_b() BEGIN END;')]);
    expect(issues.map((i) => i.rule)).toEqual(expect.arrayContaining(['C2', 'C3']));
  });

  it('C4/C5/C6: PK, FK de *_id y tenant indexado', async () => {
    const issues = await checkConventions([
      TENANTS,
      v(
        'V0002__bad.sql',
        `CREATE TABLE recipes (
  tenant_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  legacy_id BIGINT UNSIGNED NULL -- no-fk: referencia externa
);`,
      ),
    ]);
    const rules = issues.map((i) => i.rule);
    expect(rules).toContain('C4');
    expect(issues.some((i) => i.rule === 'C5' && i.message.includes('product_id'))).toBe(true);
    expect(issues.some((i) => i.message.includes('legacy_id'))).toBe(false);
    expect(issues.filter((i) => i.rule === 'C6')).toHaveLength(2);
  });

  it('C7: SP sobre tabla con tenant debe recibir p_tenant_id primero', async () => {
    const issues = await checkConventions([
      TENANTS,
      GOOD_TABLE,
      r(
        'sp_ingredient_list',
        `DROP PROCEDURE IF EXISTS sp_ingredient_list;
CREATE PROCEDURE sp_ingredient_list(IN p_name VARCHAR(10)) BEGIN SELECT * FROM ingredients; END;`,
      ),
    ]);
    expect(issues.map((i) => i.rule)).toEqual(['C7']);
  });

  it('C7: permite SP global declarado explícitamente', async () => {
    const issues = await checkConventions([
      TENANTS,
      GOOD_TABLE,
      r(
        'sp_admin_count',
        `-- scope: global (panel super_admin)
DROP PROCEDURE IF EXISTS sp_admin_count;
CREATE PROCEDURE sp_admin_count() BEGIN SELECT COUNT(*) FROM ingredients; END;`,
      ),
    ]);
    expect(issues).toEqual([]);
  });
});
