// Sincronizzazione dello storico con Google Drive e coda dei documenti da
// caricare. Non sa nulla di HTTP: parla con un oggetto Drive, che nella
// pagina è src/shared/google.ts e nei test un finto in memoria.

import {
  elencaSessioni,
  leggiBackup,
  prefissoAccount,
  serializzaStorico,
  sostituisciSessioni,
  unisciSessioni,
} from '../parole/archivio';

export type CartellaDrive = 'Riepiloghi' | 'Resoconti';

export interface Drive {
  /** Il file dello storico su Drive, oppure null se non esiste ancora. */
  leggiStorico(): Promise<string | null>;
  scriviStorico(json: string): Promise<void>;
  /** Carica un documento HTML come documento Google; restituisce il link per aprirlo. */
  caricaDocumento(cartella: CartellaDrive, nome: string, html: string): Promise<string>;
}

export interface EsitoSincronizzazione {
  /** Sessioni arrivate da Drive in questo browser. */
  scaricate: number;
  /** Sessioni di questo browser mandate su Drive. */
  inviate: number;
}

/**
 * Unisce lo storico del browser con quello su Drive e lascia lo stesso
 * storico da entrambe le parti. Le sessioni non si cancellano mai, quindi
 * l'unione non perde dati. Se il file su Drive non si legge, lancia
 * un errore e non lo sovrascrive.
 */
export async function sincronizza(drive: Drive): Promise<EsitoSincronizzazione> {
  const json = await drive.leggiStorico();
  const remote = json === null ? [] : leggiBackup(json).sessioni;
  const daDrive = unisciSessioni([], remote).sessioni;
  const locali = elencaSessioni();

  const { sessioni, aggiunte: scaricate } = unisciSessioni(locali, daDrive);
  sostituisciSessioni(sessioni);

  const suDrive = new Set(daDrive.map((s) => s.ts));
  const inviate = sessioni.filter((s) => !suDrive.has(s.ts)).length;
  if (inviate > 0 || json === null) await drive.scriviStorico(serializzaStorico(sessioni));
  return { scaricate, inviate };
}

// Coda dei documenti

export interface DocumentoInCoda {
  cartella: CartellaDrive;
  nome: string;
  html: string;
}

function chiaveCoda(): string | null {
  const p = prefissoAccount();
  return p ? p + 'coda' : null;
}

function leggiCoda(): DocumentoInCoda[] {
  const k = chiaveCoda();
  if (!k) return [];
  try {
    const dati: unknown = JSON.parse(localStorage.getItem(k) ?? '[]');
    return Array.isArray(dati) ? (dati as DocumentoInCoda[]) : [];
  } catch {
    return [];
  }
}

function scriviCoda(coda: DocumentoInCoda[]): void {
  const k = chiaveCoda();
  if (!k) return;
  try {
    if (coda.length === 0) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(coda));
  } catch {
    /* senza spazio il documento resta solo da scaricare */
  }
}

/** Mette un documento in coda per Drive; senza account non fa nulla. */
export function accoda(doc: DocumentoInCoda): void {
  if (!chiaveCoda()) return;
  scriviCoda([...leggiCoda(), doc]);
}

export function documentiInCoda(): number {
  return leggiCoda().length;
}

/** Carica i documenti in coda, nell'ordine; quelli che non partono restano. */
export async function svuotaCoda(drive: Drive): Promise<{ caricati: number; rimasti: number }> {
  const coda = leggiCoda();
  const rimasti: DocumentoInCoda[] = [];
  for (const doc of coda) {
    try {
      await drive.caricaDocumento(doc.cartella, doc.nome, doc.html);
    } catch {
      rimasti.push(doc);
    }
  }
  scriviCoda(rimasti);
  return { caricati: coda.length - rimasti.length, rimasti: rimasti.length };
}
