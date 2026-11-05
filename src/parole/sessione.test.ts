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
      words: [
        { word: 'pane', ok: true, type: [], when: null, where: [] },
        { word: 'casa', ok: false, type: ['blocco'], when: 'durante', where: [] },
        { word: 'tavolo', ok: true, type: [], when: null, where: [] },
      ],
    });
  });
});
