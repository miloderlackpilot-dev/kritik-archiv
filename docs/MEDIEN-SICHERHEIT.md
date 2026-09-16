# Sicherheitscheck für Medien-Uploads

Der Upload akzeptiert nur JPG, PNG, WebP und PDF bis 10 MB. Neben dem vom Browser gemeldeten MIME-Typ wird eine Dateisignatur geprüft:

- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47 0D 0A 1A 0A`
- WebP: `RIFF....WEBP`
- PDF: `%PDF-`

Bei einem Widerspruch wird die temporär gespeicherte Datei gelöscht und der Upload abgelehnt. Diese einfache Signaturprüfung ersetzt keine vollständige Virenprüfung. Für einen öffentlichen Betrieb sollten zusätzlich ein Virenscanner, ein separates Storage mit Zugriffskontrollen und regelmäßige Backups eingesetzt werden.
