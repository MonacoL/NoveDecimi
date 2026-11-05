// Pagina dell'account e dei dati: dove sta lo storico e il backup.

import '../shared/style.css';
import '../shared/pagina.css';
import { mostraAvviso } from '../shared/avviso';
import { $ } from '../shared/dom';
import { scarica, timbroData } from '../shared/download';
import { montaMenu } from '../shared/menu';
import { BackupNonValido, accountAttivo, elencaSessioni, esportaBackup, importaBackup } from '../parole/archivio';
import { drive, entra, esci, googleConfigurato, sincronizzaInSilenzio, sincronizzaOra, ultimaSincronizzazione } from '../shared/collegamento';
import type { EsitoSincronizzazione } from '../shared/sincronizza';

montaMenu('account');

// Account Google

function descriviEsito(e: EsitoSincronizzazione): string {
  if (e.scaricate === 0 && e.inviate === 0) return 'Storico allineato con Drive.';
  const parti: string[] = [];
  if (e.scaricate > 0) parti.push(e.scaricate === 1 ? '1 sessione arrivata da Drive' : `${e.scaricate} sessioni arrivate da Drive`);
  if (e.inviate > 0) parti.push(e.inviate === 1 ? '1 sessione inviata a Drive' : `${e.inviate} sessioni inviate a Drive`);
  return parti.join(', ') + '.';
}

function aggiornaGoogle(): void {
  $('google').hidden = !googleConfigurato;
  const a = accountAttivo();
  $('google-fuori').hidden = a !== null;
  $('google-dentro').hidden = a === null;
  if (!a) return;
  $('google-email').textContent = a.email;
  const ultima = ultimaSincronizzazione();
  $('google-sync').textContent = ultima
    ? `Ultima sincronizzazione da questo browser: ${new Date(ultima).toLocaleString('it-IT', { dateStyle: 'long', timeStyle: 'short' })}.`
    : 'Non ancora sincronizzato da questo browser.';
}

async function mostraCartella(): Promise<void> {
  try {
    const link = $<HTMLAnchorElement>('link-cartella');
    link.href = await drive.linkCartella();
    link.hidden = false;
  } catch {
    /* il link compare alla prossima sincronizzazione */
  }
}

/** Esegue un'azione legata a Google mostrando l'esito o l'errore. */
async function conGoogle(pulsante: HTMLButtonElement, azione: () => Promise<string>): Promise<void> {
  const avviso = $('google-avviso');
  pulsante.disabled = true;
  try {
    mostraAvviso(avviso, await azione(), 0);
  } catch (e) {
    mostraAvviso(avviso, e instanceof Error ? e.message : 'Qualcosa non ha funzionato con Google.', 0);
  } finally {
    pulsante.disabled = false;
    aggiornaGoogle();
    aggiornaStato();
aggiornaGoogle();
void sincronizzaInSilenzio().then((esito) => {
  if (!esito) return;
  void mostraCartella();
  aggiornaStato();
  aggiornaGoogle();
});
  }
}

$<HTMLButtonElement>('btn-entra').onclick = (e) =>
  conGoogle(e.currentTarget as HTMLButtonElement, async () => {
    const esito = await entra();
    void mostraCartella();
    return 'Accesso fatto. ' + descriviEsito(esito);
  });

$<HTMLButtonElement>('btn-sincronizza').onclick = (e) =>
  conGoogle(e.currentTarget as HTMLButtonElement, async () => {
    const esito = await sincronizzaOra();
    void mostraCartella();
    return descriviEsito(esito);
  });

$<HTMLButtonElement>('btn-esci').onclick = (e) =>
  conGoogle(e.currentTarget as HTMLButtonElement, async () => {
    await esci();
    $('link-cartella').hidden = true;
    return 'Account scollegato da questo browser. Lo storico è su Drive e torna al prossimo accesso.';
  });

function aggiornaStato(): void {
  const n = elencaSessioni().length;
  $('btn-backup').hidden = n === 0;
  const conAccount = googleConfigurato && accountAttivo() !== null;
  $('locali-stato').textContent =
    n === 0
      ? 'Nessuna sessione registrata su questo dispositivo.'
      : `${n === 1 ? '1 sessione registrata' : `${n} sessioni registrate`} in questo browser.` +
        (conAccount
          ? ' Con l\'account lo storico è anche su Drive.'
          : ' Cancellando i dati del sito dal browser lo storico si perde, a meno di averne un backup.');
}

$('btn-backup').onclick = () => {
  scarica(`novedecimi-backup-${timbroData()}.json`, esportaBackup(), 'application/json');
};

$('btn-import').onclick = () => $('import-file').click();

$<HTMLInputElement>('import-file').onchange = async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  const stato = $('backup-status');
  try {
    const { aggiunte, ignorate } = importaBackup(await file.text());
    const parti = [aggiunte === 1 ? '1 sessione aggiunta' : `${aggiunte} sessioni aggiunte`];
    if (ignorate > 0) parti.push(ignorate === 1 ? '1 già presente o non valida' : `${ignorate} già presenti o non valide`);
    aggiornaStato();
aggiornaGoogle();
void sincronizzaInSilenzio().then((esito) => {
  if (!esito) return;
  void mostraCartella();
  aggiornaStato();
  aggiornaGoogle();
});
    mostraAvviso(stato, `Backup importato: ${parti.join(', ')}.`, 0);
  } catch (err) {
    const msg = err instanceof BackupNonValido ? err.message : 'Non è stato possibile leggere il file.';
    mostraAvviso(stato, msg, 0);
  }
};

aggiornaStato();
aggiornaGoogle();
void sincronizzaInSilenzio().then((esito) => {
  if (!esito) return;
  void mostraCartella();
  aggiornaStato();
  aggiornaGoogle();
});
