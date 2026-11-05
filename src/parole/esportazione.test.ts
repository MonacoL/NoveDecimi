import { describe, expect, it } from 'vitest';
import { buildCSV } from './esportazione';
import type { ParolaLetta, Sessione } from './types';

const fluente = (word: string): ParolaLetta => ({ word, ok: true, type: [], when: null, where: [], inFrase: [] });
const conBalbuzie = (
  word: string,
  type: ParolaLetta['type'],
  when: ParolaLetta['when'],
  where: ParolaLetta['where'],
  inFrase: ParolaLetta['inFrase'] = [],
): ParolaLetta => ({ word, ok: false, type, when, where, inFrase });

function sessione(ts: number, words: ParolaLetta[], modalita: Sessione['modalita'] = 'parola'): Sessione {
  const ok = words.filter((w) => w.ok).length;
  return {
    ts,
    date: '',
    total: words.length,
    ok,
    diff: words.length - ok,
    pct: Math.round((ok / words.length) * 100),
    focusMode: false,
    modalita,
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
      sessione(mercoledi, [fluente('sole'), conBalbuzie('=casa', ['blocco'], 'prima', ['petto'])]),
      sessione(martediMattina, [
        fluente('pane'),
        conBalbuzie('casa', ['blocco', 'ripetizione'], 'durante', ['labbra', 'gola']),
        conBalbuzie('porta', ['ripetizione'], 'prima', []),
      ]),
      sessione(martediSera, [fluente('tavolo'), conBalbuzie('rosa', ['prolungamento'], 'dopo', ['gola'])]),
    ];

    const atteso = [
      '\ufeffData,Modalità,Sessioni,Parole o frasi,Fluenti,Con balbuzie,Fluenti %',
      '2026-11-03,parola,2,5,2,3,40%',
      '2026-11-04,parola,1,2,1,1,50%',
      'TOTALE PERIODO,parola,3,7,3,4,43%',
      '',
      'TIPO DI DISFLUENZA',
      'Un episodio può avere più tipi: la somma può superare le parole con balbuzie.',
      'Data,Modalità,Ripetizione,Blocco,Prolungamento',
      '2026-11-03,parola,2,1,1',
      '2026-11-04,parola,0,1,0',
      'TOTALE,parola,2,2,1',
      '',
      'CONSAPEVOLEZZA',
      'Data,Modalità,Prima,Durante,Dopo',
      '2026-11-03,parola,1,1,1',
      '2026-11-04,parola,1,0,0',
      'TOTALE,parola,2,1,1',
      '',
      'ZONA DI TENSIONE',
      'Un episodio può avere più zone: la somma può superare le parole con balbuzie.',
      'Data,Modalità,Labbra,Lingua,Palato,Gola,Petto',
      '2026-11-03,parola,1,0,0,2,0',
      '2026-11-04,parola,0,0,0,0,1',
      'TOTALE,parola,1,0,0,2,1',
      '',
      'PAROLE CON BALBUZIE',
      'Data,Modalità,Parola,Tipo,Consapevolezza,Zona di tensione,Dove nella frase',
      '2026-11-03,parola,casa,ripetizione; blocco,durante,labbra; gola,',
      '2026-11-03,parola,porta,ripetizione,prima,,',
      '2026-11-03,parola,rosa,prolungamento,dopo,gola,',
      '2026-11-04,parola,"=casa",blocco,prima,petto,',
    ].join('\r\n');

    expect(buildCSV(sessioni)).toBe(atteso);
  });

  it('omette la sezione delle parole quando non ci sono episodi di balbuzie', () => {
    const csv = buildCSV([sessione(mercoledi, [fluente('sole'), fluente('luna')])]);
    expect(csv).not.toContain('PAROLE CON BALBUZIE');
    expect(csv.split('\r\n').at(-1)).toBe('TOTALE,parola,0,0,0,0,0');
  });

  it('tiene parole e frasi su righe separate, senza un totale comune', () => {
    const csv = buildCSV([
      sessione(martediMattina, [fluente('pane'), conBalbuzie('casa', ['blocco'], 'prima', [])]),
      sessione(martediSera, [fluente('sole'), conBalbuzie('luna', ['ripetizione'], 'dopo', [], ['altra'])], 'frase'),
    ]);
    const righe = csv.split('\r\n');
    expect(righe).toContain('2026-11-03,parola,1,2,1,1,50%');
    expect(righe).toContain('2026-11-03,frase,1,2,1,1,50%');
    expect(righe).toContain('TOTALE PERIODO,parola,1,2,1,1,50%');
    expect(righe).toContain('TOTALE PERIODO,frase,1,2,1,1,50%');
    expect(righe).toContain('DOVE NELLA FRASE');
    expect(righe).toContain('2026-11-03,frase,0,1');
    expect(righe).toContain('2026-11-03,frase,luna,ripetizione,dopo,,altra parola');
  });

  it('non produce nulla senza sessioni', () => {
    expect(buildCSV([])).toBe('');
  });
});
