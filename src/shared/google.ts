// Accesso con Google e chiamate a Google Drive, tutto nel browser (ADR 0002).
// Google Identity Services dà un token d'accesso di circa un'ora, senza
// refresh token: il token resta in sessionStorage (vale per la scheda) e,
// quando scade, se ne chiede uno nuovo con un tocco della persona, perché il
// browser blocca le finestre di Google aperte senza un gesto.
//
// Lo scope drive.file permette di vedere solo i file creati da Novedecimi.

import type { Account } from '../parole/archivio';
import type { CartellaDrive, Drive } from './sincronizza';

const CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const SCOPE = 'https://www.googleapis.com/auth/drive.file openid email';
const CHIAVE_TOKEN = 'novedecimi.google.token';
const NOME_CARTELLA = 'Novedecimi';
const NOME_STORICO = 'storico-novedecimi.json';
const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const CARTELLA_MIME = 'application/vnd.google-apps.folder';

/** true se il sito è stato compilato con un client OAuth di Google. */
export const googleConfigurato = CLIENT_ID !== '';

interface Token {
  valore: string;
  scade: number;
}

interface RispostaToken {
  access_token?: string;
  expires_in?: number;
  error?: string;
}

interface ClientToken {
  requestAccessToken(opzioni?: { prompt?: string; login_hint?: string }): void;
}

interface GoogleOAuth {
  accounts: {
    oauth2: {
      initTokenClient(c: {
        client_id: string;
        scope: string;
        callback: (r: RispostaToken) => void;
        error_callback?: (e: { type: string }) => void;
      }): ClientToken;
      revoke(token: string, fatto?: () => void): void;
    };
  };
}

/** Errore che chiede alla persona di accedere di nuovo con un tocco. */
export class AccessoNecessario extends Error {
  constructor() {
    super("Serve di nuovo l'accesso con Google.");
    this.name = 'AccessoNecessario';
  }
}

let caricamento: Promise<GoogleOAuth> | null = null;

function caricaGIS(): Promise<GoogleOAuth> {
  const g = (window as unknown as { google?: GoogleOAuth }).google;
  if (g?.accounts?.oauth2) return Promise.resolve(g);
  caricamento ??= new Promise((risolvi, rifiuta) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => risolvi((window as unknown as { google: GoogleOAuth }).google);
    s.onerror = () => {
      caricamento = null;
      rifiuta(new Error('Non è stato possibile raggiungere Google.'));
    };
    document.head.append(s);
  });
  return caricamento;
}

function tokenSalvato(): string | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(CHIAVE_TOKEN) ?? 'null') as Token | null;
    // Un minuto di margine, per non usare un token che scade a metà chiamata.
    return t && t.scade - 60_000 > Date.now() ? t.valore : null;
  } catch {
    return null;
  }
}

function salvaToken(valore: string, secondi: number): void {
  try {
    sessionStorage.setItem(CHIAVE_TOKEN, JSON.stringify({ valore, scade: Date.now() + secondi * 1000 }));
  } catch {
    /* il token resta valido solo per questa pagina */
  }
}

/** true se c'è un token valido e si può parlare con Drive senza chiedere nulla. */
export function haToken(): boolean {
  return tokenSalvato() !== null;
}

/**
 * Chiede a Google un token. Va chiamata dentro un gesto della persona (un
 * tocco), altrimenti il browser blocca la finestra di Google.
 */
export async function chiediAccesso(email?: string): Promise<string> {
  const g = await caricaGIS();
  return new Promise((risolvi, rifiuta) => {
    const client = g.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (r.access_token) {
          salvaToken(r.access_token, r.expires_in ?? 3600);
          risolvi(r.access_token);
        } else rifiuta(new Error('Accesso con Google non concesso.'));
      },
      error_callback: () => rifiuta(new Error('Accesso con Google interrotto.')),
    });
    client.requestAccessToken(email ? { prompt: '', login_hint: email } : { prompt: 'select_account' });
  });
}

/** L'account Google del token, per legare lo storico alla persona. */
export async function leggiAccount(token: string): Promise<Account> {
  const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error("Non è stato possibile leggere l'account Google.");
  const u = (await r.json()) as { sub: string; email: string };
  return { sub: u.sub, email: u.email };
}

/** Revoca il token e lo dimentica, all'uscita dall'account. */
export async function dimenticaAccesso(): Promise<void> {
  const t = tokenSalvato();
  try {
    sessionStorage.removeItem(CHIAVE_TOKEN);
  } catch {
    /* niente da togliere */
  }
  if (t) {
    try {
      (await caricaGIS()).accounts.oauth2.revoke(t);
    } catch {
      /* il token scade comunque entro un'ora */
    }
  }
}

// Drive

async function chiamata(url: string, init: RequestInit = {}): Promise<Response> {
  const token = tokenSalvato();
  if (!token) throw new AccessoNecessario();
  const r = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  if (r.status === 401) {
    sessionStorage.removeItem(CHIAVE_TOKEN);
    throw new AccessoNecessario();
  }
  if (!r.ok) throw new Error(`Drive ha risposto ${r.status}.`);
  return r;
}

const virgolette = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

async function cerca(nome: string, genitore: string | null, mime?: string): Promise<string | null> {
  const condizioni = [`name = '${virgolette(nome)}'`, 'trashed = false'];
  if (genitore) condizioni.push(`'${genitore}' in parents`);
  if (mime) condizioni.push(`mimeType = '${mime}'`);
  const q = encodeURIComponent(condizioni.join(' and '));
  const r = await chiamata(`${API}/files?q=${q}&fields=files(id)&spaces=drive&pageSize=1`);
  const { files } = (await r.json()) as { files: { id: string }[] };
  return files[0]?.id ?? null;
}

async function creaCartella(nome: string, genitore: string | null): Promise<string> {
  const r = await chiamata(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nome, mimeType: CARTELLA_MIME, ...(genitore && { parents: [genitore] }) }),
  });
  return ((await r.json()) as { id: string }).id;
}

/** Corpo multipart/related: metadati JSON più contenuto, come vuole l'upload di Drive. */
function multipart(metadati: object, contenuto: string, tipo: string): { body: string; tipo: string } {
  const confine = 'novedecimi' + Math.random().toString(36).slice(2);
  const body =
    `--${confine}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadati)}\r\n` +
    `--${confine}\r\nContent-Type: ${tipo}; charset=UTF-8\r\n\r\n${contenuto}\r\n--${confine}--`;
  return { body, tipo: `multipart/related; boundary=${confine}` };
}

/** Drive di Novedecimi: la cartella Novedecimi e le sue sottocartelle, ricordate per la pagina. */
export class DriveGoogle implements Drive {
  private cartelle = new Map<string, Promise<string>>();

  private cartella(nome: string | null): Promise<string> {
    const chiave = nome ?? '';
    let p = this.cartelle.get(chiave);
    if (!p) {
      p = (async () => {
        if (nome === null) return (await cerca(NOME_CARTELLA, null, CARTELLA_MIME)) ?? creaCartella(NOME_CARTELLA, null);
        const radice = await this.cartella(null);
        return (await cerca(nome, radice, CARTELLA_MIME)) ?? creaCartella(nome, radice);
      })();
      p.catch(() => this.cartelle.delete(chiave));
      this.cartelle.set(chiave, p);
    }
    return p;
  }

  /** Il link della cartella Novedecimi su Drive. */
  async linkCartella(): Promise<string> {
    return `https://drive.google.com/drive/folders/${await this.cartella(null)}`;
  }

  async leggiStorico(): Promise<string | null> {
    const id = await cerca(NOME_STORICO, await this.cartella(null));
    if (!id) return null;
    return (await chiamata(`${API}/files/${id}?alt=media`)).text();
  }

  async scriviStorico(json: string): Promise<void> {
    const radice = await this.cartella(null);
    const id = await cerca(NOME_STORICO, radice);
    if (id) {
      await chiamata(`${UPLOAD}/files/${id}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: json,
      });
    } else {
      const m = multipart({ name: NOME_STORICO, parents: [radice], mimeType: 'application/json' }, json, 'application/json');
      await chiamata(`${UPLOAD}/files?uploadType=multipart&fields=id`, { method: 'POST', headers: { 'Content-Type': m.tipo }, body: m.body });
    }
  }

  async caricaDocumento(cartella: CartellaDrive, nome: string, html: string): Promise<string> {
    const genitore = await this.cartella(cartella);
    // Il mimeType di Google Docs chiede a Drive di convertire l'HTML in documento Google.
    const m = multipart({ name: nome, parents: [genitore], mimeType: 'application/vnd.google-apps.document' }, html, 'text/html');
    const r = await chiamata(`${UPLOAD}/files?uploadType=multipart&fields=id,webViewLink`, {
      method: 'POST',
      headers: { 'Content-Type': m.tipo },
      body: m.body,
    });
    const f = (await r.json()) as { id: string; webViewLink?: string };
    return f.webViewLink ?? `https://docs.google.com/document/d/${f.id}/edit`;
  }
}
