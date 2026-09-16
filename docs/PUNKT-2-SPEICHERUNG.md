# Punkt 2: Dauerhafte lokale Speicherung

Das Backend verwendet jetzt SQLite. Die Datenbank wird beim ersten Start automatisch unter `backend/data/kritik-archiv.sqlite` angelegt. Dieser Ordner wird nicht in Git gespeichert.

## Admin anlegen

```bash
cd backend
cp .env.example .env
```

Setze in `.env` eigene Werte:

```env
JWT_SECRET=ein-langer-zufaelliger-geheimer-wert
ADMIN_EMAIL=deine-email@example.com
ADMIN_USERNAME=dein-admin-name
ADMIN_PASSWORD=ein-sicheres-passwort
```

Der Admin wird beim Start automatisch einmalig erstellt. Danach:

```bash
npm install
npm run dev
```

Die Tabellen und die Startordner werden automatisch angelegt. Neue Nutzer bleiben nach Neustarts gespeichert und können im Admin-Bereich verifiziert werden.
