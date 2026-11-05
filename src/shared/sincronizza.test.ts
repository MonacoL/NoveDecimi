import { beforeEach, describe, expect, it } from 'vitest';
import { accountAttivo, aggiungiSessione, elencaSessioni, entraNellAccount, esciDallAccount } from '../parole/archivio';
import type { Sessione } from '../parole/types';
import { accoda, documentiInCoda, sincronizza, svuotaCoda, type Drive } from './sincronizza';

function sessione(ts: number): Sessione {
  return {
    ts,
    date: '',
    total: 1,
    ok: 1,
    diff: 0,
    pct: 100,
    focusMode: false,
    modalita: 'parola',
    words: [{ word: 'pane', ok: true, type: [], when: null, where: [], inFrase: [] }],
  };
}

class DriveFinto implements Drive {
  storico: string | null = null;
  scritture = 0;
  documenti: { cartella: string; nome: string; html: string }[] = [];
  guasto = false;
  async leggiStorico() {
    return this.storico;
  }
  async scriviStorico(json: string) {
    this.scritture++;
    this.storico = json;
  }
  async caricaDocumento(cartella: 'Riepiloghi' | 'Resoconti', nome: string, html: string) {
    if (this.guasto) throw new Error('rete');
    this.documenti.push({ cartella, nome, html });
    return `https://docs.google.com/document/d/${this.documenti.length}`;
  }
  sessioniRemote(): number[] {
    return (JSON.parse(this.storico!) as { sessioni: Sessione[] }).sessioni.map((s) => s.ts);
  }
}

const luca = { sub: '123', email: 'luca@example.org' };
const altra = { sub: '456', email: 'altra@example.org' };

beforeEach(() => localStorage.clear());

describe('account sul dispositivo', () => {
  it('al primo accesso porta nell\'account lo storico fatto senza account', () => {
    aggiungiSessione(sessione(1000));
    entraNellAccount(luca);
    expect(accountAttivo()).toEqual(luca);
    expect(elencaSessioni().map((s) => s.ts)).toEqual([1000]);
    esciDallAccount();
    expect(elencaSessioni()).toEqual([]);
  });

  it('tiene separati gli storici di due account sullo stesso browser', () => {
    entraNellAccount(luca);
    aggiungiSessione(sessione(1000));
    esciDallAccount();
    entraNellAccount(altra);
    expect(elencaSessioni()).toEqual([]);
  });

  it('uscendo toglie dal browser i dati dell\'account', () => {
    entraNellAccount(luca);
    aggiungiSessione(sessione(1000));
    esciDallAccount();
    expect(accountAttivo()).toBeNull();
    expect(Object.keys(localStorage).filter((k) => k.includes('123'))).toEqual([]);
  });
});

describe('sincronizzazione con Drive', () => {
  beforeEach(() => entraNellAccount(luca));

  it('crea lo storico su Drive la prima volta', async () => {
    const drive = new DriveFinto();
    aggiungiSessione(sessione(1000));
    expect(await sincronizza(drive)).toEqual({ scaricate: 0, inviate: 1 });
    expect(drive.sessioniRemote()).toEqual([1000]);
  });

  it('unisce le sessioni dei due lati senza duplicarle', async () => {
    const drive = new DriveFinto();
    drive.storico = JSON.stringify({ app: 'novedecimi', versione: 2, sessioni: [sessione(1000), sessione(2000)] });
    aggiungiSessione(sessione(2000));
    aggiungiSessione(sessione(3000));

    expect(await sincronizza(drive)).toEqual({ scaricate: 1, inviate: 1 });
    expect(elencaSessioni().map((s) => s.ts)).toEqual([1000, 2000, 3000]);
    expect(drive.sessioniRemote()).toEqual([1000, 2000, 3000]);
  });

  it('non riscrive Drive se non c\'è niente di nuovo da inviare', async () => {
    const drive = new DriveFinto();
    drive.storico = JSON.stringify({ app: 'novedecimi', versione: 1, sessioni: [sessione(1000)] });
    expect(await sincronizza(drive)).toEqual({ scaricate: 1, inviate: 0 });
    expect(drive.scritture).toBe(0);
  });

  it('non sovrascrive un file su Drive che non riesce a leggere', async () => {
    const drive = new DriveFinto();
    drive.storico = 'non json';
    aggiungiSessione(sessione(1000));
    await expect(sincronizza(drive)).rejects.toThrow();
    expect(drive.storico).toBe('non json');
  });
});

describe('documenti in coda per Drive', () => {
  beforeEach(() => entraNellAccount(luca));

  it('carica i documenti in coda e li toglie', async () => {
    const drive = new DriveFinto();
    accoda({ cartella: 'Riepiloghi', nome: 'Riepilogo 1', html: '<p>1</p>' });
    accoda({ cartella: 'Riepiloghi', nome: 'Riepilogo 2', html: '<p>2</p>' });
    expect(await svuotaCoda(drive)).toEqual({ caricati: 2, rimasti: 0 });
    expect(drive.documenti.map((d) => d.nome)).toEqual(['Riepilogo 1', 'Riepilogo 2']);
    expect(documentiInCoda()).toBe(0);
  });

  it('tiene in coda quello che non riesce a caricare', async () => {
    const drive = new DriveFinto();
    drive.guasto = true;
    accoda({ cartella: 'Riepiloghi', nome: 'Riepilogo 1', html: '<p>1</p>' });
    expect(await svuotaCoda(drive)).toEqual({ caricati: 0, rimasti: 1 });
    expect(documentiInCoda()).toBe(1);
  });
});
