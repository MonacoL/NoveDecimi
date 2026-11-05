import { describe, expect, it } from 'vitest';
import { documentoHTML, documentoRTF, rtfEscape, type Documento } from './documento';

const doc: Documento = {
  titolo: 'Resoconto <prova>',
  blocchi: [
    { tipo: 'paragrafo', testo: ['Dal ', { grassetto: '3 novembre' }, ' & oltre'] },
    { tipo: 'sezione', testo: 'Parola singola' },
    { tipo: 'tabella', intestazione: ['Giorno', 'Fluenti %'], righe: [['martedì', '80%']] },
  ],
};

describe('documento in RTF', () => {
  it('codifica lettere accentate, parentesi graffe e caratteri fuori da Latin-1', () => {
    expect(rtfEscape('perché {sì} €')).toBe("perch\\'e9 \\{s\\'ec\\} \\u8364?");
  });

  it('scrive titolo, grassetti, sezioni e tabelle', () => {
    const rtf = documentoRTF(doc);
    expect(rtf.startsWith('{\\rtf1\\ansi')).toBe(true);
    expect(rtf).toContain('{\\b\\fs32 Resoconto <prova>}\\par');
    expect(rtf).toContain('Dal {\\b 3 novembre} & oltre\\par');
    expect(rtf).toContain('{\\b Parola singola}\\par');
    expect(rtf).toContain('\\trowd');
    expect(rtf).toContain("\\intbl {\\b Giorno}\\cell");
    expect(rtf).toContain("\\intbl marted\\'ec\\cell");
    expect(rtf.trim().endsWith('}')).toBe(true);
  });
});

describe('documento in HTML', () => {
  it('scrive titolo, sezioni e tabelle con il testo sempre codificato', () => {
    const html = documentoHTML(doc);
    expect(html).toContain('<title>Resoconto &lt;prova&gt;</title>');
    expect(html).toContain('<h1>Resoconto &lt;prova&gt;</h1>');
    expect(html).toContain('<p>Dal <b>3 novembre</b> &amp; oltre</p>');
    expect(html).toContain('<h2>Parola singola</h2>');
    expect(html).toContain('<th>Giorno</th>');
    expect(html).toContain('<td>martedì</td>');
    expect(html).not.toContain('<prova>');
  });
});
