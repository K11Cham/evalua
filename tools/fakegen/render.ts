// Turns a FakeSpec into table blocks, then HTML (for PDF / scans / photos).
import type { FakeCourse, FakeSpec, FakeYear } from './types.ts';

export interface Cell {
  t: string;
  span?: number;
  align?: 'l' | 'c' | 'r';
}
export interface TableBlock {
  heading?: string;
  head: Cell[][];
  body: Cell[][];
  pageBreak?: boolean;
}

function field(course: FakeCourse | undefined, f: string): string {
  if (!course) return '—';
  if (f === 'n') return course.n;
  if (f === 'g') return course.g;
  if (f === 'cr') return course.cr == null ? '' : String(course.cr);
  if (f === 'h') return course.h == null ? '' : String(course.h);
  if (f.startsWith('x.')) return course.x?.[f.slice(2)] ?? '';
  return '';
}

export function buildTables(spec: FakeSpec): TableBlock[] {
  if (spec.layout === 'matrix') {
    const names: string[] = [];
    for (const y of spec.years) for (const c of y.courses) if (!names.includes(c.n)) names.push(c.n);
    const head: Cell[][] = [
      [{ t: spec.rowHeader ?? '' }, ...spec.years.map((y): Cell => ({ t: y.short ?? y.label, span: spec.cols.length, align: 'c' }))],
    ];
    if (spec.cols.some((c) => c.h)) {
      head.push([{ t: '' }, ...spec.years.flatMap(() => spec.cols.map((c): Cell => ({ t: c.h, align: 'c' })))]);
    }
    const body = names.map((n): Cell[] => [
      { t: n },
      ...spec.years.flatMap((y) => {
        const course = y.courses.find((c) => c.n === n);
        return spec.cols.map((col): Cell => ({ t: field(course, col.f), align: col.align ?? 'c' }));
      }),
    ]);
    return [{ head, body }];
  }
  return spec.years.map((y: FakeYear): TableBlock => ({
    heading: spec.layout === 'slip' && spec.years.length === 1 ? undefined : y.label,
    pageBreak: y.pageBreak,
    head: [spec.cols.map((c): Cell => ({ t: c.h, align: c.align }))],
    body: y.courses.map((course) => spec.cols.map((c): Cell => ({ t: field(course, c.f), align: c.align }))),
  }));
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function tableHtml(t: TableBlock): string {
  const row = (cells: Cell[], tag: 'th' | 'td') =>
    `<tr>${cells
      .map((c) => `<${tag}${c.span && c.span > 1 ? ` colspan="${c.span}"` : ''} class="a-${c.align ?? 'l'}">${esc(c.t)}</${tag}>`)
      .join('')}</tr>`;
  return `<div class="tblock">${t.heading ? `<div class="theading">${esc(t.heading)}</div>` : ''}<table><thead>${t.head
    .map((r) => row(r, 'th'))
    .join('')}</thead><tbody>${t.body.map((r) => row(r, 'td')).join('')}</tbody></table></div>`;
}

const FONT: Record<string, string> = {
  serif: `"Times New Roman", "Noto Serif", "Songti SC", "SimSun", "Batang", "Nirmala UI", serif`,
  sans: `Arial, "Helvetica Neue", "Microsoft YaHei", "Malgun Gothic", "Nirmala UI", sans-serif`,
  typewriter: `"Courier New", Courier, monospace`,
};

/** Splits a spec's tables into physical pages at explicit page breaks. */
export function pagesOf(spec: FakeSpec): TableBlock[][] {
  const pages: TableBlock[][] = [[]];
  for (const t of buildTables(spec)) {
    if (t.pageBreak && pages[pages.length - 1].length) pages.push([]);
    pages[pages.length - 1].push(t);
  }
  return pages;
}

export interface HtmlOpts {
  /** Render only this physical page (0-based) — used for raster formats. */
  onlyPage?: number;
}

export function specHtml(spec: FakeSpec, opts: HtmlOpts = {}): string {
  const pages = pagesOf(spec);
  const font = FONT[spec.style ?? 'sans'];
  const dense = spec.layout === 'matrix' || spec.twoUp || spec.cols.length > 5;
  const header = `
    <header>
      <div class="seal" aria-hidden="true"><span>${esc(spec.country.toUpperCase())}</span></div>
      <div class="issuer">${spec.issuer.map((l, i) => `<div class="i${i}">${esc(l)}</div>`).join('')}</div>
      <h1${spec.titleColor ? ` style="color:${spec.titleColor};text-decoration:underline"` : ''}>${esc(spec.title)}</h1>
      ${spec.subtitle ? `<h2>${esc(spec.subtitle)}</h2>` : ''}
    </header>
    <section class="info">${spec.info
      .map((i) => `<div class="irow"><span class="ilabel">${esc(i.label)}:</span> <span class="ivalue">${esc(i.value)}</span></div>`)
      .join('')}</section>`;
  const footer = `
    <section class="notes">${(spec.notes ?? []).map((n) => `<p>${esc(n)}</p>`).join('')}</section>
    <section class="sigs">${(spec.signatures ?? [])
      .map((s) => `<div class="sig"><div class="scribble"></div><div class="line"></div><div>${esc(s)}</div></div>`)
      .join('')}<div class="stamp" aria-hidden="true"><span>REGISTRY</span></div></section>`;
  const pageHtml = (tables: TableBlock[], idx: number) => `
    <div class="page${idx > 0 ? ' later' : ''}">
      <div class="specimen">SPECIMEN</div>
      ${idx === 0 ? header : `<div class="cont">${esc(spec.student.name)} — ${idx + 1}/${pages.length}</div>`}
      <div class="tables${spec.twoUp ? ' twoup' : ''}">${tables.map(tableHtml).join('')}</div>
      ${idx === pages.length - 1 ? footer : ''}
      <div class="foot">${esc(spec.specimen)}</div>
    </div>`;
  const body =
    opts.onlyPage == null ? pages.map(pageHtml).join('') : pageHtml(pages[opts.onlyPage], opts.onlyPage);
  return `<!doctype html><html lang="${spec.lang}" dir="${spec.rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: ${font}; color: #111; font-size: ${dense ? 10.5 : 12}px; line-height: 1.35; }
  .page { position: relative; width: 794px; min-height: 1123px; padding: 52px 56px 60px; overflow: hidden; }
  .page.later { break-before: page; }
  .specimen { position: absolute; left: 50%; top: 46%; transform: translate(-50%,-50%) rotate(-32deg); font: 700 120px Arial, sans-serif; letter-spacing: 12px; color: rgba(0,0,0,0.045); pointer-events: none; white-space: nowrap; }
  header { text-align: center; position: relative; margin-bottom: 14px; }
  .issuer { font-weight: 700; font-size: 1.05em; letter-spacing: .3px; }
  .issuer .i0 { font-size: 1.25em; }
  .issuer .i2 { font-weight: 400; }
  h1 { font-size: 1.5em; margin: 12px 0 2px; letter-spacing: .5px; }
  h2 { font-size: 1.05em; margin: 2px 0 0; font-weight: 600; }
  .seal { position: absolute; ${spec.rtl ? 'right' : 'left'}: 0; top: 0; width: 64px; height: 64px; border: 2px solid #333; border-radius: 50%; display: grid; place-items: center; }
  .seal::before { content: ""; position: absolute; inset: 5px; border: 1px solid #333; border-radius: 50%; }
  .seal span { font: 700 6.5px Arial, sans-serif; max-width: 44px; text-align: center; line-height: 1.1; }
  .info { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 28px; border-top: 1.5px solid #222; border-bottom: 1.5px solid #222; padding: 9px 2px; margin-bottom: 14px; }
  .ilabel { color: #333; }
  .ivalue { font-weight: 700; }
  .tables.twoup { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; align-items: start; }
  .tblock { margin-bottom: 12px; break-inside: avoid; }
  .theading { font-weight: 700; margin: 4px 0 4px; font-size: 1.02em; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #333; padding: ${dense ? '3px 5px' : '5px 8px'}; vertical-align: middle; }
  th { background: #ececec; font-weight: 700; font-size: .93em; }
  .a-l { text-align: start; } .a-c { text-align: center; } .a-r { text-align: end; }
  .notes { margin-top: 10px; font-size: .92em; }
  .notes p { margin: 3px 0; }
  .sigs { display: flex; gap: 40px; margin-top: 34px; position: relative; font-size: .92em; }
  .sig { width: 190px; text-align: center; }
  .sig .line { border-top: 1px solid #222; margin-bottom: 3px; }
  .scribble { height: 30px; margin: 0 30px; border-bottom: 2px solid #1c2f7a; border-radius: 60% 30% 70% 20% / 80% 40% 90% 30%; transform: rotate(-6deg) skewX(-18deg); opacity: .8; }
  .stamp { position: absolute; ${spec.rtl ? 'left' : 'right'}: 24px; top: -34px; width: 104px; height: 104px; border: 3px double rgba(125,30,45,.55); border-radius: 50%; display: grid; place-items: center; transform: rotate(-14deg); }
  .stamp span { font: 700 13px Arial, sans-serif; color: rgba(125,30,45,.55); letter-spacing: 2px; }
  .cont { text-align: end; font-size: .9em; color: #333; margin-bottom: 12px; }
  .foot { position: absolute; left: 56px; right: 56px; bottom: 22px; text-align: center; font: 8px Arial, sans-serif; color: #555; letter-spacing: .4px; }
  </style></head><body>${body}</body></html>`;
}

/** A "phone photo on a desk" scene wrapping a page image. */
export function photoSceneHtml(dataUrl: string, v: { rx: number; ry: number; rz: number; glareX: number; glareY: number; warm: number }): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; }
  body { background: linear-gradient(115deg, #6b4a31, #8a6645 45%, #5a3d28); display: grid; place-items: center; overflow: hidden; perspective: 1700px; }
  .sheet { width: 794px; transform: rotateX(${v.rx}deg) rotateY(${v.ry}deg) rotateZ(${v.rz}deg) scale(.86); box-shadow: 18px 26px 40px rgba(0,0,0,.55); position: relative; }
  .sheet img { display: block; width: 100%; filter: sepia(${v.warm}) brightness(.97); }
  .glare { position: absolute; inset: 0; background: radial-gradient(ellipse 34% 20% at ${v.glareX}% ${v.glareY}%, rgba(255,255,255,.78), rgba(255,255,255,0) 70%); }
  .shade { position: absolute; inset: 0; background: linear-gradient(200deg, rgba(0,0,0,0) 45%, rgba(0,0,0,.30)); }
  </style></head><body><div class="sheet"><img src="${dataUrl}"><div class="glare"></div><div class="shade"></div></div></body></html>`;
}

export function scanPdfHtml(dataUrls: string[]): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; } html, body { margin: 0; }
  img { display: block; width: 210mm; height: 297mm; object-fit: fill; break-after: page; }
  </style></head><body>${dataUrls.map((u) => `<img src="${u}">`).join('')}</body></html>`;
}
