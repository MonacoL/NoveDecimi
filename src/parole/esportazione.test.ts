import { describe, expect, it } from 'vitest';
import { buildCSV } from './esportazione';
import type { ParolaLetta, Sessione } from './types';

const fluente = (word: string): ParolaLetta => ({ word, ok: true, type: null, when: null, where: null });
const conBalbuzie = (
  word: string,
  type: ParolaLetta['type'],
  when: ParolaLetta['when'],
  where: ParolaLetta['where'],
): ParolaLetta => ({ word, ok: false, type, when, where });

function sessione(ts: number, words: ParolaLetta[]): Sessione {
  const ok = words.filter((w) => w.ok).length;
  return {
    ts,
    date: '',
    total: words.length,
    ok,
    diff: words.length - ok,
    pct: Math.round((ok / words.length) * 100),
    focusMode: false,
    words,
  };
}

// Orari locali, così il giorno non dipende dal fuso del computer che esegue i test.
const martediMattina = new Date(2026, 10, 3, 9, 0).getTime();
const martediSera = new Date(2026, 10, 3, 21, 30).getTime();
const mercoledi = new Date(2026, 10, 4, 18, 0).getTime();

describe('esportazione CSV dello storico', () => {
  it('aggrega per giorno nelle cinque sezioni', () => {
    const sessioni = [
      sessione(mercoledi, [fluente('sole'), conBalbuzie('=casa', 'blocco', 'prima', 'petto')]),
      sessione(martediMattina, [
        fluente('pane'),
        conBalbuzie('casa', 'blocco', 'durante', 'labbra'),
        conBalbuzie('porta', 'ripetizione', 'prima', null),
      ]),
      sessione(martediSera, [fluente('tavolo'), conBalbuzie('rosa', 'prolungamento', 'dopo', 'gola')]),
    ];

    const atteso = [
      '﻿Data,Sessioni,Parole totali,Fluenti,Con balbuzie,Parole fluenti %',
      '2026-11-03,2,5,2,3,40%',
      '2026-11-04,1,2,1,1,50%',
      'TOTALE PERIODO,3,7,3,4,43%',
      '',
      'TIPO DI DISFLUENZA',
      'Data,Ripetizione,Blocco,Prolungamento',
      '2026-11-03,1,1,1',
      '2026-11-04,0,1,0',
      'TOTALE,1,2,1',
      '',
      'CONSAPEVOLEZZA',
      'Data,Prima,Durante,Dopo',
      '2026-11-03,1,1,1',
      '2026-11-04,1,0,0',
      'TOTALE,2,1,1',
      '',
      'ZONA DI TENSIONE',
      'Data,Labbra,Lingua,Palato,Gola,Petto',
      '2026-11-03,1,0,0,1,0',
      '2026-11-04,0,0,0,0,1',
      'TOTALE,1,0,0,1,1',
      '',
      'PAROLE CON BALBUZIE',
      'Data,Parola,Tipo,Consapevolezza,Zona di tensione',
      '2026-11-03,casa,blocco,durante,labbra',
      '2026-11-03,porta,ripetizione,prima,',
      '2026-11-03,rosa,prolungamento,dopo,gola',
      '2026-11-04,"=casa",blocco,prima,petto',
    ].join('\r\n');

    expect(buildCSV(sessioni)).toBe(atteso);
  });

  it('omette la sezione delle parole quando non ci sono episodi di balbuzie', () => {
    const csv = buildCSV([sessione(mercoledi, [fluente('sole'), fluente('luna')])]);
    expect(csv).not.toContain('PAROLE CON BALBUZIE');
    expect(csv.split('\r\n').at(-1)).toBe('TOTALE,0,0,0,0,0');
  });

  it('non produce nulla senza sessioni', () => {
    expect(buildCSV([])).toBe('');
  });
});
