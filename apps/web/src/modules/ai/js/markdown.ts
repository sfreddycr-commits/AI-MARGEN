/**
 * Markdown mínimo y seguro para las respuestas del asistente.
 * Convierte el texto del modelo en una estructura de datos; la vista la pinta con elementos
 * de React (nunca HTML crudo). Soporta: párrafos, saltos de línea, listas, títulos simples,
 * **negrita**, *cursiva* y `código`.
 */

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'strong'; children: Inline[] }
  | { t: 'em'; children: Inline[] }
  | { t: 'code'; v: string };

export type Block =
  | { type: 'p'; lines: Inline[][] }
  | { type: 'h'; inline: Inline[] }
  | { type: 'ul'; items: Inline[][] }
  | { type: 'ol'; start: number; items: Inline[][] };

const TOKEN = /(\*\*[^*\n]+?\*\*|__[^_\n]+?__|`[^`\n]+`|\*[^*\s\n][^*\n]*?\*)/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const tok = m[0];
    const at = m.index;
    if (at > last) out.push({ t: 'text', v: text.slice(last, at) });
    if (tok.startsWith('**') || tok.startsWith('__')) {
      out.push({ t: 'strong', children: parseInline(tok.slice(2, -2)) });
    } else if (tok.startsWith('`')) {
      out.push({ t: 'code', v: tok.slice(1, -1) });
    } else {
      out.push({ t: 'em', children: parseInline(tok.slice(1, -1)) });
    }
    last = at + tok.length;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}

const UL = /^\s*[-*•]\s+(.*)$/;
const OL = /^\s*(\d{1,3})[.)]\s+(.*)$/;
const H = /^\s{0,3}#{1,6}\s+(.*)$/;

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  let para: Inline[][] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ type: 'p', lines: para });
    para = [];
  };
  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      continue;
    }
    const h = H.exec(line);
    const ul = UL.exec(line);
    const ol = OL.exec(line);
    const prev = blocks.at(-1);
    if (h) {
      flushPara();
      blocks.push({ type: 'h', inline: parseInline(h[1]!.replace(/\*\*/g, '')) });
    } else if (ul) {
      flushPara();
      if (prev?.type === 'ul' && para.length === 0) prev.items.push(parseInline(ul[1]!));
      else blocks.push({ type: 'ul', items: [parseInline(ul[1]!)] });
    } else if (ol) {
      flushPara();
      if (prev?.type === 'ol') prev.items.push(parseInline(ol[2]!));
      else blocks.push({ type: 'ol', start: Number(ol[1]), items: [parseInline(ol[2]!)] });
    } else {
      para.push(parseInline(line.trim()));
    }
  }
  flushPara();
  return blocks;
}
