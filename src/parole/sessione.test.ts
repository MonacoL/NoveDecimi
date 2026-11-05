import { describe, expect, it } from 'vitest';
import { creaSessione } from './sessione';

describe('creazione della sessione da salvare', () => {
  it('calcola i conteggi e completa le annotazioni mancanti', () => {
    const adesso = new Date(2026, 10, 5, 18, 30);
    const s = creaSessione(
      [
        { word: 'pane', ok: true },
        { word: 'casa', ok: false, type: ['blocco'], when: 'durante' },
        { word: 'tavolo', ok: true },
      ],
      true,
      'parola',
      adesso,
    );

    expect(s).toEqual({
      ts: adesso.getTime(),
      date: 'giovedì 5 novembre 2026',
      total: 3,
      ok: 2,
      diff: 1,
      pct: 67,
      focusMode: true,
      modalita: 'parola',
      words: [
        { word: 'pane', ok: true, type: [], when: null, where: [], inFrase: [] },
        { word: 'casa', ok: false, type: ['blocco'], when: 'durante', where: [], inFrase: [] },
        { word: 'tavolo', ok: true, type: [], when: null, where: [], inFrase: [] },
      ],
    });
  });
});

describe('sessione in modalità frase', () => {
  it('registra la modalità e dove nella frase', () => {
    const s = creaSessione(
      [{ word: 'casa', ok: false, type: ['blocco'], when: 'prima', inFrase: ['altra'] }],
      false,
      'frase',
      new Date(2026, 10, 5),
    );
    expect(s.modalita).toBe('frase');
    expect(s.words[0]!.inFrase).toEqual(['altra']);
  });
});
