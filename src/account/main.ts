// Pagina dell'account e dei dati: dove sta lo storico e il backup.

import '../shared/style.css';
import '../shared/pagina.css';
import { mostraAvviso } from '../shared/avviso';
import { $ } from '../shared/dom';
import { scarica, timbroData } from '../shared/download';
import { montaMenu } from '../shared/menu';
import { BackupNonValido, elencaSessioni, esportaBackup, importaBackup } from '../parole/archivio';

montaMenu('account');

function aggiornaStato(): void {
  const n = elencaSessioni().length;
  $('btn-backup').hidden = n === 0;
  $('locali-stato').textContent =
    n === 0
      ? 'Nessuna sessione registrata su questo dispositivo.'
      : `${n === 1 ? '1 sessione registrata' : `${n} sessioni registrate`} in questo browser. Cancellando i dati del sito dal browser lo storico si perde, a meno di averne un backup.`;
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
    mostraAvviso(stato, `Backup importato: ${parti.join(', ')}.`, 0);
  } catch (err) {
    const msg = err instanceof BackupNonValido ? err.message : 'Non è stato possibile leggere il file.';
    mostraAvviso(stato, msg, 0);
  }
};

aggiornaStato();
