import { loadMigrationFiles, type MigrationFile } from './migrator.js';
import { splitSql } from './split-sql.js';

/**
 * Verificación estática de convenciones de base de datos (gate de CI `db:check`).
 *
 * Reglas:
 *  C1  Rutinas solo en `routines/`: las migraciones versionadas no crean SP/funciones/vistas.
 *  C2  Prefijos: procedimientos `sp_`, funciones `fn_`, vistas `vw_`; el archivo coincide con el objeto.
 *  C3  Rutinas repetibles hacen `DROP ... IF EXISTS` antes de `CREATE` (o `CREATE OR REPLACE VIEW`).
 *  C4  Toda tabla tiene PRIMARY KEY y nombre snake_case.
 *  C5  Toda columna `<x>_id` tiene FOREIGN KEY (salvo comentario `-- no-fk: <motivo>` en su línea).
 *  C6  Tablas con `tenant_id`: FK a `tenants` e índice cuyo primer campo es `tenant_id`.
 *  C7  SPs que tocan tablas con `tenant_id` reciben `p_tenant_id` como primer parámetro,
 *      salvo que declaren `-- scope: global` (auth/admin) con justificación.
 */

export interface ConventionIssue {
  rule: string;
  file: string;
  message: string;
}

interface TableInfo {
  name: string;
  file: string;
  columns: string[];
  hasTenantId: boolean;
}

const IDENT = '`?([A-Za-z0-9_]+)`?';

function extractParenBody(sql: string, openIdx: number): string {
  let depth = 0;
  for (let i = openIdx; i < sql.length; i++) {
    if (sql[i] === '(') depth++;
    else if (sql[i] === ')') {
      depth--;
      if (depth === 0) return sql.slice(openIdx + 1, i);
    }
  }
  return sql.slice(openIdx + 1);
}

/** Separa por comas de primer nivel. */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => p.trim());
}

export async function checkConventions(input?: MigrationFile[]): Promise<ConventionIssue[]> {
  const issues: ConventionIssue[] = [];
  const files = input ?? (await loadMigrationFiles());
  const tables = new Map<string, TableInfo>();

  // --- Migraciones versionadas: tablas ---
  for (const f of files.filter((x) => x.kind === 'versioned')) {
    if (
      /CREATE\s+(DEFINER\s*=\s*\S+\s+)?(PROCEDURE|FUNCTION|TRIGGER)\b/i.test(f.sql) ||
      /CREATE\s+(OR\s+REPLACE\s+)?(ALGORITHM\s*=\s*\w+\s+)?VIEW\b/i.test(f.sql)
    ) {
      issues.push({
        rule: 'C1',
        file: f.file,
        message:
          'Las migraciones versionadas no deben crear SP, funciones, triggers ni vistas (use routines/).',
      });
    }

    const rawLines = f.sql.split('\n');
    const re = new RegExp(`CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?${IDENT}\\s*\\(`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(f.sql))) {
      const name = m[1]!;
      const body = extractParenBody(f.sql, m.index + m[0].length - 1);
      const parts = splitTopLevel(body);
      const columns: string[] = [];
      const fkColumns = new Set<string>();
      const indexFirstCols: string[] = [];
      let hasPk = false;
      let tenantFkToTenants = false;

      for (const p of parts) {
        const up = p.toUpperCase();
        if (/^PRIMARY\s+KEY/.test(up) || /\bPRIMARY\s+KEY\b/.test(up)) hasPk = true;
        const fk =
          /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+`?([A-Za-z0-9_]+)`?\s*\(([^)]+)\)/i.exec(p);
        if (fk) {
          const cols = fk[1]!.split(',').map((c) => c.replace(/`/g, '').trim());
          cols.forEach((c) => fkColumns.add(c));
          if (fk[2] === 'tenants' && cols.includes('tenant_id')) tenantFkToTenants = true;
          // En InnoDB la FK crea/usa un índice que inicia con su primera columna
          indexFirstCols.push(cols[0]!);
          continue;
        }
        const idx =
          /^(?:UNIQUE\s+)?(?:KEY|INDEX)\s+`?[A-Za-z0-9_]*`?\s*\(([^)]+)\)/i.exec(p) ||
          /^PRIMARY\s+KEY\s*\(([^)]+)\)/i.exec(p) ||
          /^CONSTRAINT\s+`?\w+`?\s+UNIQUE\s*(?:KEY\s*)?`?\w*`?\s*\(([^)]+)\)/i.exec(p);
        if (idx) {
          indexFirstCols.push(idx[1]!.split(',')[0]!.replace(/`/g, '').replace(/\(.*$/, '').trim());
          continue;
        }
        if (/^(CONSTRAINT|CHECK|FULLTEXT|SPATIAL)\b/i.test(p)) continue;
        const col = /^`?([A-Za-z0-9_]+)`?\s+/.exec(p);
        if (col) columns.push(col[1]!);
      }

      if (!/^[a-z][a-z0-9_]*$/.test(name)) {
        issues.push({ rule: 'C4', file: f.file, message: `Tabla "${name}" debe ser snake_case.` });
      }
      if (!hasPk) {
        issues.push({ rule: 'C4', file: f.file, message: `Tabla "${name}" no tiene PRIMARY KEY.` });
      }
      for (const c of columns) {
        if (!c.endsWith('_id') || fkColumns.has(c)) continue;
        const line = rawLines.find((l) => new RegExp(`^\\s*\`?${c}\`?\\s`).test(l)) ?? '';
        if (/--\s*no-fk:\s*\S/.test(line)) continue;
        issues.push({
          rule: 'C5',
          file: f.file,
          message: `Columna "${name}.${c}" no tiene FOREIGN KEY (o agregue "-- no-fk: <motivo>").`,
        });
      }
      const hasTenantId = columns.includes('tenant_id');
      if (hasTenantId && name !== 'tenants') {
        if (!tenantFkToTenants) {
          issues.push({
            rule: 'C6',
            file: f.file,
            message: `Tabla "${name}" tiene tenant_id sin FOREIGN KEY a tenants.`,
          });
        }
        if (!indexFirstCols.includes('tenant_id')) {
          issues.push({
            rule: 'C6',
            file: f.file,
            message: `Tabla "${name}" necesita un índice que inicie con tenant_id.`,
          });
        }
      }
      tables.set(name, { name, file: f.file, columns, hasTenantId });
    }
  }

  // --- Rutinas repetibles ---
  const tenantTables = [...tables.values()].filter((t) => t.hasTenantId).map((t) => t.name);
  for (const f of files.filter((x) => x.kind === 'repeatable')) {
    const prefix = f.name.slice(0, 3);
    const kindByPrefix = { sp_: 'PROCEDURE', fn_: 'FUNCTION', vw_: 'VIEW' } as const;
    const kind = kindByPrefix[prefix as keyof typeof kindByPrefix];
    const statements = splitSql(f.sql);

    const createRe =
      /CREATE\s+(?:OR\s+REPLACE\s+)?(?:DEFINER\s*=\s*\S+\s+)?(?:ALGORITHM\s*=\s*\w+\s+)?(?:SQL\s+SECURITY\s+\w+\s+)?(PROCEDURE|FUNCTION|VIEW)\s+`?([A-Za-z0-9_]+)`?/i;
    const creates = statements
      .map((s) => createRe.exec(s))
      .filter((x): x is RegExpExecArray => !!x);

    if (creates.length !== 1) {
      issues.push({
        rule: 'C2',
        file: f.file,
        message: 'Cada archivo de rutina debe crear exactamente un objeto.',
      });
      continue;
    }
    const [, createdKind, createdName] = creates[0]!;
    if (createdKind!.toUpperCase() !== kind || createdName !== f.name) {
      issues.push({
        rule: 'C2',
        file: f.file,
        message: `El archivo debe crear ${kind} ${f.name} (encontrado ${createdKind} ${createdName}).`,
      });
    }
    const replaces = /CREATE\s+OR\s+REPLACE/i.test(f.sql);
    const drops = new RegExp(`DROP\\s+${kind}\\s+IF\\s+EXISTS\\s+\`?${f.name}\`?`, 'i').test(f.sql);
    if (!drops && !(kind === 'VIEW' && replaces)) {
      issues.push({
        rule: 'C3',
        file: f.file,
        message: `Falta "DROP ${kind} IF EXISTS ${f.name}" antes del CREATE.`,
      });
    }

    if (kind === 'PROCEDURE') {
      const touches = tenantTables.filter((t) => new RegExp(`\\b${t}\\b`).test(f.sql));
      const global = /--\s*scope:\s*global\b/i.test(f.sql);
      if (touches.length && !global) {
        const params = /CREATE\s+PROCEDURE\s+`?\w+`?\s*\(\s*(?:IN\s+)?`?(\w+)`?/i.exec(f.sql);
        if (params?.[1] !== 'p_tenant_id') {
          issues.push({
            rule: 'C7',
            file: f.file,
            message: `El SP usa tablas con tenant (${touches.join(', ')}) y su primer parámetro debe ser p_tenant_id (o declarar "-- scope: global").`,
          });
        }
      }
    }
  }

  return issues;
}
