/**
 * Divide un script SQL en sentencias, respetando la directiva `DELIMITER` (estilo cliente mysql),
 * comillas y comentarios. Necesario para crear SPs/funciones sin `multipleStatements`.
 */
export function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let delimiter = ';';
  let buf = '';
  let i = 0;
  let quote: string | null = null;
  let atLineStart = true;

  const flush = () => {
    const s = buf.trim();
    if (s) statements.push(s);
    buf = '';
  };

  while (i < sql.length) {
    const ch = sql[i]!;

    // Directiva DELIMITER al inicio de una línea (fuera de comillas)
    if (!quote && atLineStart) {
      const rest = sql.slice(i);
      const m = /^[ \t]*DELIMITER[ \t]+(\S+)[ \t]*(\r?\n|$)/i.exec(rest);
      if (m) {
        flush();
        delimiter = m[1]!;
        i += m[0].length;
        atLineStart = true;
        continue;
      }
    }

    if (quote) {
      buf += ch;
      if (ch === '\\' && quote !== '`') {
        buf += sql[i + 1] ?? '';
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i++;
      atLineStart = ch === '\n';
      continue;
    }

    // Comentarios
    if (ch === '-' && sql[i + 1] === '-' && /\s/.test(sql[i + 2] ?? ' ')) {
      const end = sql.indexOf('\n', i);
      i = end === -1 ? sql.length : end + 1;
      buf += '\n';
      atLineStart = true;
      continue;
    }
    if (ch === '#') {
      const end = sql.indexOf('\n', i);
      i = end === -1 ? sql.length : end + 1;
      buf += '\n';
      atLineStart = true;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
      buf += ' ';
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      buf += ch;
      i++;
      atLineStart = false;
      continue;
    }

    if (sql.startsWith(delimiter, i)) {
      flush();
      i += delimiter.length;
      continue;
    }

    buf += ch;
    atLineStart = ch === '\n';
    i++;
  }
  flush();
  return statements;
}
