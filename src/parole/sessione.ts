// Costruzione della sessione da salvare, a partire dalle parole lette.

import type { Modalita, ParolaLetta, Sessione } from './types';

/** Una parola come la registra l'esercizio: le annotazioni ci sono solo se la parola ha avuto balbuzie. */
export type Risultato = Pick<ParolaLetta, 'word' | 'ok'> & Partial<Pick<ParolaLetta, 'type' | 'when' | 'where' | 'inFrase'>>;

export function dataEstesa(d: Date): string {
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function creaSessione(risultati: Risultato[], focusMode: boolean, modalita: Modalita, adesso: Date): Sessione {
  const ok = risultati.filter((r) => r.ok).length;
  return {
    ts: adesso.getTime(),
    date: dataEstesa(adesso),
    total: risultati.length,
    ok,
    diff: risultati.length - ok,
    pct: Math.round((ok / risultati.length) * 100),
    focusMode,
    modalita,
    words: risultati.map((r) => ({
      word: r.word,
      ok: r.ok,
      type: r.type ?? [],
      when: r.when ?? null,
      where: r.where ?? [],
      inFrase: r.inFrase ?? [],
    })),
  };
}
