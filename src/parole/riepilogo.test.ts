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
        { word: 'pane', ok: true, type: [], when: null, where: [], inFrase: [] },
        { word: 'casa', ok: false, type: ['blocco', 'ripetizione'], when: 'durante', where: ['labbra', 'gola'], inFrase: [] },
        { word: 'porta', ok: false, type: ['ripetizione'], when: 'prima', where: [], inFrase: [] },
      ],
      'parola',
      giovedi,
    );

    expect(rtf.startsWith('{\\rtf1\\ansi')).toBe(true);
    expect(rtf).toContain("{\\b Esercizio parole}, gioved\\'ec 5 novembre 2026\\par");
    expect(rtf).toContain('Fluenti: 1 (33%)\\par');
    expect(rtf).toContain('Con balbuzie: 2\\par');
    expect(rtf).toContain('1. {\\b casa}: Ripetizione, Blocco, Durante, Labbra, Gola\\par');
    expect(rtf).toContain('2. {\\b porta}: Ripetizione, Prima\\par');
    expect(rtf).toContain('Ripetizione: 2\\par');
    expect(rtf).toContain('la somma pu\\\'f2 superare');
    expect(rtf).not.toContain('\\emdash');
  });

  it('dice che non ci sono episodi quando tutte le parole sono fluenti', () => {
    const rtf = buildRTF([{ word: 'pane', ok: true, type: [], when: null, where: [], inFrase: [] }], 'parola', giovedi);
    expect(rtf).toContain('Nessun episodio di balbuzie annotato.\\par');
    expect(rtf).not.toContain('Tipo di disfluenza');
  });

  it('in modalità frase conta le frasi e dice dove è caduto l\'episodio', () => {
    const rtf = buildRTF(
      [
        { word: 'pane', ok: true, type: [], when: null, where: [], inFrase: [] },
        { word: 'casa', ok: false, type: ['blocco'], when: 'prima', where: [], inFrase: ['altra'] },
      ],
      'frase',
      giovedi,
    );
    expect(rtf).toContain("{\\b Esercizio parole}, modalit\\'e0 frase, gioved\\'ec 5 novembre 2026\\par");
    expect(rtf).toContain('Frasi dette: 2\\par');
    expect(rtf).toContain('Altra parola: 1\\par');
    expect(rtf).toContain('1. {\\b casa}: Blocco, Prima, Altra parola\\par');
    expect(rtf).not.toContain('Parole lette');
  });
});
