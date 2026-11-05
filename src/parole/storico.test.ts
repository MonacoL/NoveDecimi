import { describe, expect, it } from 'vitest';
import { aggregaPerModalita, perGiorno } from './storico';
import type { ParolaLetta, Sessione } from './types';

const parola = (ok: boolean, inFrase: ParolaLetta['inFrase'] = []): ParolaLetta => ({
  word: 'casa',
  ok,
  type: ok ? [] : ['blocco'],
  when: ok ? null : 'prima',
  where: [],
  inFrase,
});

function sessione(ts: number, modalita: Sessione['modalita'], words: ParolaLetta[]): Sessione {
  const ok = words.filter((w) => w.ok).length;
  return { ts, date: '', total: words.length, ok, diff: words.length - ok, pct: 0, focusMode: false, modalita, words };
}

const mattina = new Date(2026, 10, 3, 9).getTime();
const sera = new Date(2026, 10, 3, 21).getTime();

describe('storico per giorno e modalità', () => {
  const sessioni = [
    sessione(sera, 'frase', [parola(true), parola(false, ['estratta', 'altra']), parola(false, ['altra'])]),
    sessione(mattina, 'parola', [parola(true), parola(true), parola(true), parola(false)]),
  ];

  it('dà una riga per modalità nello stesso giorno, prima le parole', () => {
    const giorni = perGiorno(sessioni);
    expect(giorni.map((g) => [g.chiave, g.modalita, g.total, g.pct])).toEqual([
      ['2026-11-03', 'parola', 4, 75],
      ['2026-11-03', 'frase', 3, 33],
    ]);
  });

  it('conta dove nella frase una volta per frase', () => {
    const frase = perGiorno(sessioni).find((g) => g.modalita === 'frase')!;
    expect(frase.inFrase).toEqual({ estratta: 1, altra: 2 });
  });

  it('non somma mai le due modalità', () => {
    const tot = aggregaPerModalita(sessioni);
    expect(tot.parola?.pct).toBe(75);
    expect(tot.frase?.pct).toBe(33);
    expect(Object.keys(tot)).toEqual(['parola', 'frase']);
  });

  it('omette le modalità senza sessioni', () => {
    expect(Object.keys(aggregaPerModalita([sessioni[1]!]))).toEqual(['parola']);
  });
});
