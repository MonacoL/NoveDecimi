import { describe, expect, it } from 'vitest';
import { buildRTF, rtfEscape } from './riepilogo';

const giovedi = new Date(2026, 10, 5, 18, 30);

describe('riepilogo RTF', () => {
  it('codifica lettere accentate, parentesi graffe e caratteri fuori da Latin-1', () => {
    expect(rtfEscape('perché {sì} €')).toBe("perch\\'e9 \\{s\\'ec\\} \\u8364?");
  });

  it('elenca le parole con balbuzie con le loro annotazioni', () => {
    const rtf = buildRTF(
      [
        { word: 'pane', ok: true, type: null, when: null, where: null },
        { word: 'casa', ok: false, type: 'blocco', when: 'durante', where: 'labbra' },
        { word: 'porta', ok: false, type: 'ripetizione', when: 'prima', where: null },
      ],
      giovedi,
    );

    expect(rtf.startsWith('{\\rtf1\\ansi')).toBe(true);
    expect(rtf).toContain("{\\b Esercizio parole}, gioved\\'ec 5 novembre 2026\\par");
    expect(rtf).toContain('Fluenti: 1 (33%)\\par');
    expect(rtf).toContain('Con balbuzie: 2\\par');
    expect(rtf).toContain('1. {\\b casa}: Blocco, Durante, Labbra\\par');
    expect(rtf).toContain('2. {\\b porta}: Ripetizione, Prima\\par');
    expect(rtf).not.toContain('\\emdash');
  });

  it('dice che non ci sono episodi quando tutte le parole sono fluenti', () => {
    const rtf = buildRTF([{ word: 'pane', ok: true, type: null, when: null, where: null }], giovedi);
    expect(rtf).toContain('Nessun episodio di balbuzie annotato.\\par');
    expect(rtf).not.toContain('Tipo di disfluenza');
  });
});
