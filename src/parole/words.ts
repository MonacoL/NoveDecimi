// Liste di parole dell'esercizio, riprese dall'artefatto.

export const WORDS_ALL: readonly string[] = [
  "acqua","albero","amico","ancora","anima","aperto","aria","azione",
  "bambino","bocca","bosco","braccio","buono",
  "campo","cane","canto","carta","casa","caso","caldo","colore","corpo","cosa",
  "costa","croce","cuore","cura","cucina","classe","clima","corsa",
  "dente","domani","donna","estate",
  "famiglia","finestra","fiore","forte","fronte",
  "gente","giorno","grande","idea","insieme",
  "lavoro","letto","libro","luce","luna",
  "mano","mare","mattina","mente","mondo","montagna","musica",
  "nome","notte","nuvola","occhio","oggi","ombra","ora",
  "padre","pane","parola","passo","piede","porta","primo","prova","paese",
  "palla","pensiero","persona","pace","posto","prato","punto","pelle",
  "rispetto","rosso","radice","ramo","ragazzo","rete","ritmo","rosa",
  "rumore","ragione","ricerca","riposo","ritorno","regola","ricco",
  "sale","sangue","sera","sole","strada","suono",
  "tavolo","tempo","terra","testa","tipo","treno","tanto","tutto","torre",
  "tenda","tigre","tornare","tragitto","tenero",
  "uomo","uscita","vento","verde","vita","voce","volta"
];

// Parole che iniziano con i suoni difficili: c dura (ca, co, cu, cr, cl), p, t, r.
export const WORDS_FOCUS: readonly string[] = [
  // C dura
  "campo","cane","canto","carta","casa","caso","caldo","colore","corpo","cosa",
  "costa","croce","cuore","cura","cucina","classe","clima","corsa","candela",
  "capire","cantare","capello","coperta","coraggio","campagna","credere","curva",
  // P
  "padre","pane","parola","passo","piede","porta","primo","prova","paese",
  "palla","pensiero","persona","pace","posto","prato","punto","pelle",
  "paura","pietra","presto","polso","popolo","prezzo","piccolo","piano",
  // T
  "tavolo","tempo","terra","testa","tipo","treno","tanto","tutto","torre",
  "tenda","tigre","tornare","tragitto","tenero","topo","testo","tubo",
  "talento","toccare","tranquillo","tristezza","timido",
  // R
  "radice","ramo","ragazzo","rete","rispetto","ritmo","rosa","rosso",
  "rumore","ragione","ricerca","riposo","ritorno","regola","ricco",
  "realtà","resto","relazione","ricordo","re","riso"
];

/** Il suono iniziale da mostrare sotto la parola, se è uno dei suoni difficili. */
export function getSoundLabel(word: string): string | null {
  const w = word.toLowerCase();
  if (/^[pt]/.test(w)) return w[0]!.toUpperCase();
  if (/^r/.test(w)) return 'R';
  if (/^c[aourlh]/.test(w)) return 'C';
  return null;
}

export function shuffle<T>(a: readonly T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
}
