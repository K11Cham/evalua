// DOCX → tokens. mammoth converts the file to simple HTML; we lay its paragraphs and tables out on a
// virtual page so the same layout analysis (and the same source highlighting) works as for PDFs.
import type { DocTokens, Token } from '../core/types.ts';

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_m, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENT[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();

export const DOCX_PAGE_W = 1000;
const MARGIN = 48;
const LINE = 26;
const CHAR_W = 7.2;

export function docxHtmlToDoc(html: string): DocTokens {
  const tokens: Token[] = [];
  let y = MARGIN;
  const block = /<table[\s\S]*?<\/table>|<(p|h[1-6]|li)\b[^>]*>[\s\S]*?<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = block.exec(html))) {
    const chunk = m[0];
    if (/^<table/i.test(chunk)) {
      const rows = [...chunk.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) =>
        [...r[1].matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/gi)].map((c) => ({
          span: Number(/colspan="(\d+)"/i.exec(c[2])?.[1] ?? 1),
          text: decode(c[3]),
        })),
      );
      const ncols = Math.max(1, ...rows.map((r) => r.reduce((a, c) => a + c.span, 0)));
      const colW = (DOCX_PAGE_W - 2 * MARGIN) / ncols;
      y += 6;
      for (const r of rows) {
        let col = 0;
        for (const c of r) {
          if (c.text) {
            const w = Math.min(colW * c.span - 16, Math.max(12, c.text.length * CHAR_W));
            // Spanning header cells are centred over the columns they cover.
            const x = c.span > 1 ? MARGIN + col * colW + (colW * c.span - w) / 2 : MARGIN + col * colW + 8;
            tokens.push({ text: c.text, page: 0, x, y, w, h: 16, conf: 1 });
          }
          col += c.span;
        }
        y += LINE;
      }
      y += 10;
    } else {
      const text = decode(chunk);
      if (text) tokens.push({ text, page: 0, x: MARGIN, y, w: Math.min(DOCX_PAGE_W - 2 * MARGIN, text.length * CHAR_W), h: 16, conf: 1 });
      y += text ? LINE : LINE / 2;
    }
  }
  return { kind: 'docx', pages: [{ width: DOCX_PAGE_W, height: Math.max(400, y + MARGIN) }], tokens, engine: 'Word document text', warnings: [] };
}
