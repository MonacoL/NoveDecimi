import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupNonValido, aggiungiSessione, elencaSessioni, esportaBackup, importaBackup } from './archivio';
import type { Sessione } from './types';

function sessione(ts: number, parola = 'casa'): Sessione {
  return {
    ts,
    date: 'giovedì 5 novembre 2026',
    total: 2,
    ok: 1,
    diff: 1,
    pct: 50,
    focusMode: false,
    words: [
      { word: 'pane', ok: true, type: [], when: null, where: [] },
      { word: parola, ok: false, type: ['blocco'], when: 'durante', where: ['labbra', 'gola'] },
    ],
  };
}

beforeEach(() => localStorage.clear());

describe('archivio delle sessioni', () => {
  it('ritrova una sessione aggiunta', () => {
    aggiungiSessione(sessione(1000));
    expect(elencaSessioni()).toEqual([sessione(1000)]);
  });

  it('elenca le sessioni dalla meno recente alla più recente', () => {
    aggiungiSessione(sessione(3000));
    aggiungiSessione(sessione(1000));
    expect(elencaSessioni().map((s) => s.ts)).toEqual([1000, 3000]);
  });

  it('restituisce uno storico vuoto se i dati salvati sono illeggibili', () => {
    localStorage.setItem('novedecimi.sessions', '{non è json');
    expect(elencaSessioni()).toEqual([]);
  });

  it('converte le annotazioni salvate prima delle scelte multiple', () => {
    const vecchia = {
      ...sessione(1000),
      words: [
        { word: 'pane', ok: true, type: null, when: null, where: null },
        { word: 'casa', ok: false, type: 'blocco', when: 'durante', where: 'labbra' },
      ],
    };
    localStorage.setItem('novedecimi.sessions', JSON.stringify([vecchia]));
    expect(elencaSessioni()[0]!.words).toEqual([
      { word: 'pane', ok: true, type: [], when: null, where: [] },
      { word: 'casa', ok: false, type: ['blocco'], when: 'durante', where: ['labbra'] },
    ]);
  });

  it('segnala quando non riesce a salvare, senza interrompere la pagina', () => {
    const spia = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(aggiungiSessione(sessione(1000))).toBe(false);
    spia.mockRestore();
  });
});

describe('backup', () => {
  it('ripristina lo storico su un dispositivo vuoto', () => {
    aggiungiSessione(sessione(1000));
    aggiungiSessione(sessione(2000, 'porta'));
    const backup = esportaBackup();
    localStorage.clear();

    expect(importaBackup(backup)).toEqual({ aggiunte: 2, ignorate: 0 });
    expect(elencaSessioni()).toEqual([sessione(1000), sessione(2000, 'porta')]);
  });

  it('non duplica le sessioni già presenti', () => {
    aggiungiSessione(sessione(1000));
    const backup = esportaBackup();
    aggiungiSessione(sessione(2000));

    expect(importaBackup(backup)).toEqual({ aggiunte: 0, ignorate: 1 });
    expect(elencaSessioni().map((s) => s.ts)).toEqual([1000, 2000]);
  });

  it('importa un backup della versione 1, con un valore solo per tipo e zona', () => {
    const v1 = {
      ...sessione(1000),
      words: [{ word: 'casa', ok: false, type: 'ripetizione', when: 'prima', where: null }],
    };
    expect(importaBackup(JSON.stringify({ app: 'novedecimi', versione: 1, sessioni: [v1] }))).toEqual({ aggiunte: 1, ignorate: 0 });
    expect(elencaSessioni()[0]!.words).toEqual([{ word: 'casa', ok: false, type: ['ripetizione'], when: 'prima', where: [] }]);
  });

  it('scarta le sessioni con dati non ammessi e tiene le altre', () => {
    const tipoInventato = { ...sessione(2000) };
    tipoInventato.words = [{ word: 'casa', ok: false, type: ['svenimento'], when: 'durante', where: [] } as never];
    const parolaNonTesto = { ...sessione(3000), words: [{ word: { html: '<b>' }, ok: true } as never] };
    const senzaTs = { ...sessione(4000), ts: 'ieri' as never };
    const backup = JSON.stringify({
      app: 'novedecimi',
      versione: 1,
      sessioni: [sessione(1000), tipoInventato, parolaNonTesto, senzaTs, 'non una sessione'],
    });

    expect(importaBackup(backup)).toEqual({ aggiunte: 1, ignorate: 4 });
    expect(elencaSessioni()).toEqual([sessione(1000)]);
  });

  it.each([
    ['un file che non è JSON', 'parola,ok\ncasa,true'],
    ['un JSON di un altro programma', JSON.stringify({ sessioni: [] })],
    ['un backup senza elenco di sessioni', JSON.stringify({ app: 'novedecimi', versione: 1 })],
  ])('rifiuta %s senza toccare lo storico', (_descrizione, contenuto) => {
    aggiungiSessione(sessione(1000));
    expect(() => importaBackup(contenuto)).toThrow(BackupNonValido);
    expect(elencaSessioni()).toEqual([sessione(1000)]);
  });
});
