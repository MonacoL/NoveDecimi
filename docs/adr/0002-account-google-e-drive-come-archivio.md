# Account Google e Drive come archivio dello storico

Lo storico deve seguire la persona su ogni dispositivo, ma Novedecimi è un sito statico su GitHub Pages e non ha un server. Login e password gestiti solo nel browser non possono funzionare tra dispositivi diversi: un altro dispositivo non avrebbe niente contro cui controllare la password né dati da recuperare. Per questo l'account è l'accesso con Google, fatto interamente nel browser con Google Identity Services, e lo storico si salva come file JSON nella cartella `Novedecimi` del Google Drive della persona, con lo scope `drive.file`, che dà accesso solo ai file creati dall'app.

L'account è facoltativo. Senza account l'app funziona come prima, con lo storico in `localStorage`.

## Conseguenze

- Nessun dato passa da un server di Novedecimi: i dati stanno nel browser e nel Drive della persona.
- La regola "ogni dispositivo appartiene a una sola persona" non vale più. In locale lo storico è tenuto separato per account, e uscendo dall'account i dati di quell'account lasciano il browser.
- La sincronizzazione unisce gli storici per istante di fine sessione (`ts`). Le sessioni non si cancellano, quindi l'unione non perde mai dati.
- Serve un progetto Google Cloud con un client OAuth. Finché resta in modalità test lo possono usare solo gli account aggiunti a mano, fino a 100.
