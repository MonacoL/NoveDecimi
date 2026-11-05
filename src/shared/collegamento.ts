// Collegamento fra le pagine e Google: entrare, uscire, sincronizzare e
// caricare i documenti. Le funzioni che possono aprire la finestra di Google
// vanno chiamate da un tocco della persona.

import { accountAttivo, entraNellAccount, esciDallAccount, prefissoAccount } from '../parole/archivio';
import { AccessoNecessario, DriveGoogle, chiediAccesso, dimenticaAccesso, googleConfigurato, haToken, leggiAccount } from './google';
import { sincronizza, svuotaCoda, type CartellaDrive, type EsitoSincronizzazione } from './sincronizza';

export { googleConfigurato };

export const drive = new DriveGoogle();

/** true se c'è un account e il sito può parlare con Drive. */
export function conAccount(): boolean {
  return googleConfigurato && accountAttivo() !== null;
}

/** true se si può usare Drive subito, senza chiedere un tocco. */
export function driveRaggiungibile(): boolean {
  return conAccount() && haToken();
}

function segnaSincronizzazione(): void {
  const p = prefissoAccount();
  try {
    if (p) localStorage.setItem(p + 'ultimaSync', String(Date.now()));
  } catch {
    /* solo informativo */
  }
}

/** Istante dell'ultima sincronizzazione riuscita da questo browser, oppure null. */
export function ultimaSincronizzazione(): number | null {
  const p = prefissoAccount();
  const v = p ? Number(localStorage.getItem(p + 'ultimaSync')) : 0;
  return v > 0 ? v : null;
}

/** Sincronizza storico e coda, se si può farlo senza chiedere nulla. null se non si può. */
export async function sincronizzaInSilenzio(): Promise<EsitoSincronizzazione | null> {
  if (!driveRaggiungibile()) return null;
  try {
    const esito = await sincronizza(drive);
    await svuotaCoda(drive);
    segnaSincronizzazione();
    return esito;
  } catch {
    return null;
  }
}

/** Sincronizza su richiesta della persona, chiedendo l'accesso se il token è scaduto. */
export async function sincronizzaOra(riprova = true): Promise<EsitoSincronizzazione> {
  const a = accountAttivo();
  if (!a) throw new Error('Nessun account.');
  if (!haToken()) await chiediAccesso(a.email);
  try {
    const esito = await sincronizza(drive);
    await svuotaCoda(drive);
    segnaSincronizzazione();
    return esito;
  } catch (e) {
    if (e instanceof AccessoNecessario && riprova) {
      await chiediAccesso(a.email);
      return sincronizzaOra(false);
    }
    throw e;
  }
}

/** Accesso con Google: lega lo storico all'account e lo sincronizza con Drive. */
export async function entra(): Promise<EsitoSincronizzazione> {
  const token = await chiediAccesso();
  entraNellAccount(await leggiAccount(token));
  const esito = await sincronizza(drive);
  segnaSincronizzazione();
  return esito;
}

/** Esce dall'account: i dati lasciano il browser, su Drive restano. */
export async function esci(): Promise<void> {
  await dimenticaAccesso();
  esciDallAccount();
}

/** Carica subito un documento su Drive, chiedendo l'accesso se serve; restituisce il link. */
export async function caricaOra(cartella: CartellaDrive, nome: string, html: string): Promise<string> {
  const a = accountAttivo();
  if (!a) throw new Error('Nessun account.');
  if (!haToken()) await chiediAccesso(a.email);
  return drive.caricaDocumento(cartella, nome, html);
}
