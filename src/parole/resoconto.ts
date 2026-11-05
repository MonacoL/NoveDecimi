// Resoconto di un periodo per la logopedista: per ogni modalità i giorni, le
// annotazioni del periodo e le parole con balbuzie. Parole e frasi stanno in
// sezioni separate e non hanno un totale comune (ADR 0004).

import type { Blocco, Documento } from '../shared/documento';
import { NOMI_DOVE } from './esportazione';
import { NOMI_DOVE_FRASE, NOMI_ZONA, NOTA_CONTEGGI } from './riepilogo';
import { dataEstesa } from './sessione';
import { aggrega, chiaveGiorno, perGiorno, type Aggregato } from './storico';
import { DOVE_NELLA_FRASE, MODALITA, TIPI_DISFLUENZA, ZONE_DI_TENSIONE, inOrdine, type Modalita, type Sessione } from './types';

const TITOLI: Record<Modalita, string> = { parola: 'Parola singola', frase: 'Parola in una frase' };
const maiuscola = (s: string) => s[0]!.toUpperCase() + s.slice(1);
const giornoBreve = (ts: number) => new Date(ts).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });

/** Le sessioni dei giorni locali da `da` ad `a`, estremi compresi. */
export function sessioniDelPeriodo(sessioni: Sessione[], da: Date, a: Date): Sessione[] {
  const inizio = chiaveGiorno(da.getTime());
  const fine = chiaveGiorno(a.getTime());
  return sessioni.filter((s) => {
    const k = chiaveGiorno(s.ts);
    return k >= inizio && k <= fine;
  });
}

function rigaNumeri(g: Aggregato): string[] {
  return [String(g.sessioni), String(g.total), String(g.ok), String(g.diff), g.pct + '%'];
}

function sezioneModalita(m: Modalita, sessioni: Sessione[]): Blocco[] {
  const frase = m === 'frase';
  const giorni = perGiorno(sessioni);
  const tot = aggrega(sessioni);
  const b: Blocco[] = [{ tipo: 'sezione', testo: TITOLI[m] }];

  b.push({
    tipo: 'tabella',
    intestazione: ['Giorno', 'Sessioni', frase ? 'Frasi dette' : 'Parole lette', 'Fluenti', 'Con balbuzie', frase ? 'Frasi fluenti %' : 'Parole fluenti %'],
    righe: [...giorni.map((g) => [giornoBreve(g.ts), ...rigaNumeri(g)]), ['Totale', ...rigaNumeri(tot)]],
  });

  if (tot.diff === 0) {
    b.push({ tipo: 'paragrafo', testo: 'Nessun episodio di balbuzie annotato.' });
    return b;
  }

  const righe: string[][] = [];
  if (frase) for (const d of DOVE_NELLA_FRASE) righe.push(['Dove nella frase', NOMI_DOVE_FRASE[d], String(tot.inFrase[d])]);
  for (const t of TIPI_DISFLUENZA) righe.push(['Tipo di disfluenza', maiuscola(t), String(tot.tipo[t])]);
  for (const c of ['prima', 'durante', 'dopo'] as const) righe.push(['Consapevolezza', maiuscola(c), String(tot.consapevolezza[c])]);
  for (const z of ZONE_DI_TENSIONE) if (tot.zona[z] > 0) righe.push(['Zona di tensione', NOMI_ZONA[z], String(tot.zona[z])]);
  b.push({ tipo: 'paragrafo', testo: NOTA_CONTEGGI });
  b.push({ tipo: 'tabella', intestazione: ['Annotazione', 'Voce', 'Episodi'], righe });

  b.push({
    tipo: 'tabella',
    intestazione: ['Giorno', frase ? 'Parola estratta' : 'Parola', 'Annotazioni'],
    righe: giorni.flatMap((g) =>
      g.conBalbuzie.map((w) => [
        giornoBreve(g.ts),
        w.word,
        [
          ...inOrdine(w.type, TIPI_DISFLUENZA),
          ...(w.when ? [w.when] : []),
          ...inOrdine(w.where, ZONE_DI_TENSIONE),
          ...inOrdine(w.inFrase, DOVE_NELLA_FRASE).map((d) => NOMI_DOVE[d]),
        ].join(', '),
      ]),
    ),
  });
  return b;
}

export function costruisciResoconto(tutte: Sessione[], da: Date, a: Date): Documento {
  const sessioni = sessioniDelPeriodo(tutte, da, a);
  const n = sessioni.length;
  const blocchi: Blocco[] = [
    {
      tipo: 'paragrafo',
      testo: [
        'Dal ',
        { grassetto: dataEstesa(da) },
        ' al ',
        { grassetto: dataEstesa(a) },
        n === 0 ? '.' : `: ${n === 1 ? '1 sessione' : `${n} sessioni`}.`,
      ],
    },
  ];
  if (n === 0) {
    blocchi.push({ tipo: 'paragrafo', testo: 'Nessuna sessione in questo periodo.' });
  } else {
    for (const m of MODALITA) {
      const gruppo = sessioni.filter((s) => s.modalita === m);
      if (gruppo.length > 0) blocchi.push(...sezioneModalita(m, gruppo));
    }
  }
  blocchi.push({
    tipo: 'paragrafo',
    testo: 'Un episodio di balbuzie comprende anche quello sentito arrivare o sentito nel corpo, non solo le disfluenze udibili.',
  });
  return { titolo: 'Resoconto, esercizio parole', blocchi };
}
