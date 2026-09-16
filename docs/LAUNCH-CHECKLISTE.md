# Vor dem Launch

## Zwingend erledigen

- `backend/package.json` installieren: `cd backend && npm install`
- in Produktion einen langen zufälligen `JWT_SECRET` setzen
- Betreiberangaben in `/imprint` ersetzen
- Datenschutzhinweise in `/privacy` an tatsächliches Hosting und Logging anpassen
- CORS auf die tatsächliche Frontend-Domain beschränken
- Datenbank und `backend/data/media/` regelmäßig sichern
- Uploads zusätzlich mit einem Virenscanner prüfen
- HTTPS und sichere Secret-Verwaltung verwenden

Die Seiten `/privacy` und `/imprint` sind Vorlagen, keine fertige Rechtsberatung.
