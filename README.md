# Kritik-Archiv

Ein kostenloses, lokales Projekt für ein großes Archiv mit:
- verifizierten Nutzern
- Rollenmodell: Admin, Moderator, Nutzer
- moderierten Beiträgen
- Ordner-/Archivstruktur
- Datei- und Medien-Uploads
- Admin-Bereich für Rollen und Moderation

## Stack
- Frontend: Next.js
- Backend: Node.js + Express
- Datenschutzfreundlich und lokal lauffähig ohne teure Dienste
- Datenspeicherung: lokal im ersten Setup, später optional mit Supabase/Postgres

## Start

1. Backend starten:
   ```bash
   cd backend
   npm install
   cp .env.example .env
   npm run dev
   ```

2. Frontend starten:
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   npm run dev
   ```

3. Öffne das Frontend unter:
   ```text
   http://localhost:3000
   ```

## Rollen
- Admin: alles verwalten
- Moderator: Beiträge prüfen
- Nutzer: Beiträge einreichen

## Architektur
- `backend` = API
- `frontend` = Weboberfläche
- `docs` = Dokumentation und Planung

## Ziel für Punkt 1
Lauffähiges, lokal nutzbares System mit Basis-Auth, Rollen und Dashboard.
