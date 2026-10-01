import { describe, expect, it } from 'vitest';
import { splitSql } from './split-sql.js';

describe('splitSql', () => {
  it('separa sentencias simples por ;', () => {
    expect(splitSql('SELECT 1; SELECT 2;')).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('respeta DELIMITER para cuerpos de SP', () => {
    const sql = `DROP PROCEDURE IF EXISTS sp_x;
DELIMITER $$
CREATE PROCEDURE sp_x()
BEGIN
  SELECT 1;
  SELECT 2;
END$$
DELIMITER ;
SELECT 3;`;
    const out = splitSql(sql);
    expect(out).toHaveLength(3);
    expect(out[0]).toBe('DROP PROCEDURE IF EXISTS sp_x');
    expect(out[1]).toContain('SELECT 1;');
    expect(out[1]).toContain('SELECT 2;');
    expect(out[1]?.endsWith('END')).toBe(true);
    expect(out[2]).toBe('SELECT 3');
  });

  it('no corta dentro de comillas ni comentarios', () => {
    const out = splitSql(`INSERT INTO t VALUES ('a;b'); -- comentario; con punto y coma
/* bloque; */ SELECT "x;y";`);
    expect(out).toHaveLength(2);
    expect(out[0]).toContain("'a;b'");
    expect(out[1]).toContain('"x;y"');
  });

  it('maneja comillas escapadas', () => {
    expect(splitSql(`SELECT 'it\\'s; ok'; SELECT 2;`)).toHaveLength(2);
  });
});
