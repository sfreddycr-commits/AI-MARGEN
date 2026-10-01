/**
 * Coincidencia aproximada de nombres (líneas de factura o receta → ingredientes/proveedores).
 * Sin IA: determinista y explicable. La IA solo extrae texto; el emparejamiento lo decide este código
 * y siempre lo revisa la persona antes de confirmar.
 */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const t = ` ${s} `;
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Coeficiente de Dice sobre bigramas (0–1), con bonificación si un nombre contiene al otro. */
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ga = bigrams(na);
  const gb = bigrams(nb);
  let inter = 0;
  for (const [g, c] of ga) inter += Math.min(c, gb.get(g) ?? 0);
  const total =
    [...ga.values()].reduce((x, y) => x + y, 0) + [...gb.values()].reduce((x, y) => x + y, 0);
  let score = (2 * inter) / total;
  const wordsA = new Set(na.split(' '));
  const wordsB = nb.split(' ');
  if (wordsB.every((w) => wordsA.has(w)) || na.split(' ').every((w) => new Set(wordsB).has(w))) {
    score = Math.max(score, 0.8);
  }
  return Math.round(score * 1000) / 1000;
}

export interface Candidate {
  uuid: string;
  name: string;
}

export function bestMatch<T extends Candidate>(
  text: string,
  candidates: T[],
  threshold = 0.55,
): (T & { score: number }) | null {
  let best: (T & { score: number }) | null = null;
  for (const c of candidates) {
    const score = similarity(text, c.name);
    if (score >= threshold && (!best || score > best.score)) best = { ...c, score };
  }
  return best;
}

/** Normaliza unidades escritas por personas o facturas a las unidades del sistema. */
export function normalizeUnit(
  raw: string | null | undefined,
): 'g' | 'kg' | 'ml' | 'l' | 'unidad' | null {
  if (!raw) return null;
  const u = normalize(raw).replace(/\s/g, '');
  if (['g', 'gr', 'grs', 'gramo', 'gramos'].includes(u)) return 'g';
  if (['kg', 'kgs', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(u)) return 'kg';
  if (['ml', 'mililitro', 'mililitros', 'cc'].includes(u)) return 'ml';
  if (['l', 'lt', 'lts', 'litro', 'litros'].includes(u)) return 'l';
  if (
    [
      'u',
      'un',
      'und',
      'unid',
      'unidad',
      'unidades',
      'pz',
      'pza',
      'pieza',
      'piezas',
      'ud',
      'uds',
    ].includes(u)
  )
    return 'unidad';
  return null;
}
