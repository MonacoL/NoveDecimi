import { describe, expect, it } from 'vitest';
import type { Blocco } from '../shared/documento';
import { costruisciResoconto } from './resoconto';
import type { ParolaLetta, Sessione } from './types';

const parola = (word: string, ok: boolean, extra: Partial<ParolaLetta> = {}): ParolaLetta => ({
  word,
  ok,
  type: ok ? [] : ['blocco'],
  when: ok ? null : 'prima',
  where: [],
  inFrase: [],
  ...extra,
});

function sessione(ts: number, modalita: Sessione['modalita'], words: ParolaLetta[]): Sessione {
  const ok = words.filter((w) => w.ok).length;
  return { ts, date: '', total: words.length, ok, diff: words.length - ok, pct: 0, focusMode: false, modalita, words };
}

const giorno = (d: number, h = 18) => new Date(2026, 10, d, h).getTime();
const tabelle = (b: Blocco[]) => b.filter((x): x is Extract<Blocco, { tipo: 'tabella' }> => x.tipo === 'tabella');
const sezioni = (b: Blocco[]) => b.filter((x) => x.tipo === 'sezione').map((x) => (x as { testo: string }).testo);

describe('resoconto di un periodo', () => {
  const sessioni = [
    sessione(giorno(1), 'parola', [parola('fuori', false)]),
    sessione(giorno(3, 9), 'parola', [parola('pane', true), parola('casa', false, { where: ['labbra', 'gola'] })]),
    sessione(giorno(3, 20), 'frase', [parola('sole', true), parola('tetto', false, { inFrase: ['altra'] })]),
    sessione(giorno(4), 'parola', [parola('rosa', true), parola('mare', true)]),
  ];
  const doc = costruisciResoconto(sessioni, new Date(2026, 10, 3), new Date(2026, 10, 4));

  it('copre solo le sessioni del periodo, estremi compresi', () => {
    expect(doc.titolo).toBe('Resoconto, esercizio parole');
    const intro = JSON.stringify(doc.blocchi[0]);
    expect(intro).toContain('3 novembre 2026');
    expect(intro).toContain('4 novembre 2026');
    expect(JSON.stringify(doc)).not.toContain('fuori');
  });

  it('dedica una sezione a ciascuna modalità, senza un totale comune', () => {
    expect(sezioni(doc.blocchi)).toEqual(['Parola singola', 'Parola in una frase']);
    const [giorniParola] = tabelle(doc.blocchi);
    expect(giorniParola!.intestazione).toEqual(['Giorno', 'Sessioni', 'Parole lette', 'Fluenti', 'Con balbuzie', 'Parole fluenti %']);
    expect(giorniParola!.righe.map((r) => r.slice(1))).toEqual([
      ['1', '2', '1', '1', '50%'],
      ['1', '2', '2', '0', '100%'],
      ['2', '4', '3', '1', '75%'],
    ]);
    expect(giorniParola!.righe.at(-1)![0]).toBe('Totale');
  });

  it('elenca annotazioni e parole con balbuzie, e in modalità frase dove è caduto l\'episodio', () => {
    const testo = JSON.stringify(doc);
    expect(testo).toContain('Labbra');
    expect(testo).toContain('Frasi fluenti %');
    expect(testo).toContain('Dove nella frase');
    expect(testo).toContain('tetto');
    expect(testo).toContain('blocco, prima, altra parola');
    expect(testo).toContain('la somma può superare');
  });

  it('dice quando nel periodo non ci sono sessioni', () => {
    const vuoto = costruisciResoconto(sessioni, new Date(2026, 10, 10), new Date(2026, 10, 12));
    expect(sezioni(vuoto.blocchi)).toEqual([]);
    expect(JSON.stringify(vuoto)).toContain('Nessuna sessione in questo periodo.');
  });
});
