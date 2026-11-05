// Documenti scaricabili (riepilogo, resoconto) descritti una volta sola come
// sequenza di blocchi, e poi scritti in RTF per il download o in HTML per
// Google Drive, che lo converte in documento Google. Così i due formati non
// divergono.

/** Un pezzo di testo, normale o in grassetto. */
export type Parte = string | { grassetto: string };

export type Blocco =
  | { tipo: 'sezione'; testo: string }
  | { tipo: 'paragrafo'; testo: string | Parte[] }
  | { tipo: 'tabella'; intestazione: string[]; righe: string[][] };

export interface Documento {
  titolo: string;
  /** false se il titolo è già nel primo paragrafo, come nel riepilogo. */
  mostraTitolo?: boolean;
  blocchi: Blocco[];
}

const parti = (t: string | Parte[]): Parte[] => (typeof t === 'string' ? [t] : t);

// RTF

/** Codifica per RTF: Latin-1 come \'xx, il resto come \uN?. */
export function rtfEscape(s: string): string {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/[^\x00-\x7E]/g, (c) => {
      const code = c.charCodeAt(0);
      return code <= 0xff ? `\\'${code.toString(16).padStart(2, '0')}` : `\\u${code}?`;
    });
}

/** Larghezza utile della pagina A4 con margini normali, in twip. */
const LARGHEZZA_RTF = 9600;

function tabellaRTF(intestazione: string[], righe: string[][]): string {
  const colonne = intestazione.length;
  const passo = Math.floor(LARGHEZZA_RTF / colonne);
  const bordi = '\\clbrdrt\\brdrs\\brdrw10\\clbrdrl\\brdrs\\brdrw10\\clbrdrb\\brdrs\\brdrw10\\clbrdrr\\brdrs\\brdrw10';
  const definizione = '\\trowd\\trgaph80' + Array.from({ length: colonne }, (_, i) => `${bordi}\\cellx${passo * (i + 1)}`).join('');
  const riga = (celle: string[], grassetto: boolean) =>
    definizione + '\n' + celle.map((c) => `\\pard\\intbl ${grassetto ? `{\\b ${rtfEscape(c)}}` : rtfEscape(c)}\\cell`).join('') + '\\row\n';
  return riga(intestazione, true) + righe.map((r) => riga(r, false)).join('') + '\\pard\\sa120\n';
}

export function documentoRTF(doc: Documento): string {
  let body = '';
  if (doc.mostraTitolo !== false) body += `{\\b\\fs32 ${rtfEscape(doc.titolo)}}\\par\n`;
  for (const b of doc.blocchi) {
    if (b.tipo === 'sezione') body += `\\par\n{\\b ${rtfEscape(b.testo)}}\\par\n`;
    else if (b.tipo === 'paragrafo') {
      body += parti(b.testo).map((p) => (typeof p === 'string' ? rtfEscape(p) : `{\\b ${rtfEscape(p.grassetto)}}`)).join('') + '\\par\n';
    } else body += tabellaRTF(b.intestazione, b.righe);
  }
  return `{\\rtf1\\ansi\\ansicpg1252\\deff0\n{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}}\n\\f0\\fs22\\widowctrl\\sa120\n${body}}`;
}

// HTML

export function htmlEscape(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function documentoHTML(doc: Documento): string {
  const E = htmlEscape;
  const corpo: string[] = [];
  if (doc.mostraTitolo !== false) corpo.push(`<h1>${E(doc.titolo)}</h1>`);
  for (const b of doc.blocchi) {
    if (b.tipo === 'sezione') corpo.push(`<h2>${E(b.testo)}</h2>`);
    else if (b.tipo === 'paragrafo') {
      corpo.push(`<p>${parti(b.testo).map((p) => (typeof p === 'string' ? E(p) : `<b>${E(p.grassetto)}</b>`)).join('')}</p>`);
    } else {
      const testa = `<tr>${b.intestazione.map((c) => `<th>${E(c)}</th>`).join('')}</tr>`;
      const righe = b.righe.map((r) => `<tr>${r.map((c) => `<td>${E(c)}</td>`).join('')}</tr>`).join('');
      corpo.push(`<table border="1" cellpadding="4" style="border-collapse:collapse">${testa}${righe}</table>`);
    }
  }
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${E(doc.titolo)}</title></head><body style="font-family:Arial,sans-serif">${corpo.join('\n')}</body></html>`;
}
