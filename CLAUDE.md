# Novedecimi

Strumenti per il percorso logopedico di Luca sulla balbuzie. La logopedista suggerisce modifiche, ma la piattaforma resta uno strumento personale. Termini del dominio in `GLOSSARY.md`.

## Regole di scrittura

Valgono per ogni testo: interfaccia, documentazione, issue, messaggi di commit, risposte in chat.

- **Linguaggio non giudicante.** I testi descrivono cosa è successo, non com'è andata la lettura. Niente "detto bene", "ottimo", "bravo", niente colori che si leggono come un voto. Usare i termini di `GLOSSARY.md` e mai quelli elencati sotto _Evitare_.
- **Anti-pattern AI di cima-scrittura.** Vietati il trattino em (—) e il punto medio (·) come separatore, emoji e frecce decorative, aperture e chiusure formulaiche, lessico vuoto ("fondamentale", "innovativo", "cruciale"), elenchi forzati a gruppi di tre. Grassetto al massimo una volta per paragrafo. La lista completa è in `nucleo/anti-pattern-ai.md` del repository `cima-scrittura`.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `MonacoL/NoveDecimi`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
