# ArchHub — Vollständige Feature-Liste

## Authentifizierung & Sicherheit
- JWT-basierte Authentifizierung mit konfigurierbarer Token-Laufzeit
- Optionale Zwei-Faktor-Authentifizierung (TOTP) mit QR-Code-Generierung
- 2FA-Pflicht für Inhaltserstellung (konfigurierbar)
- Passwort-Hashing mit bcrypt
- Session-Management (aktive Sitzungen anzeigen, einzeln oder alle widerrufen)
- Anti-Bot-Registrierung (Honeypot-Feld + Rate-Limiting)
- Benutzername-Blockliste (Admin-verwaltbar, verhindert Impersonation)
- CORS-Konfiguration über Umgebungsvariablen

## Benutzerverwaltung
- Benutzerregistrierung mit E-Mail-Validierung
- Benutzerprofil mit Bio, Reputationssystem, Abzeichen-Anzeige
- Generative SVG-Avatare (einzigartig pro Benutzer)
- Benutzername ändern (aktualisiert alle Referenzen plattformweit)
- Passwort ändern (mit Bestätigung des aktuellen Passworts)
- Self-Service-Kontolöschung (GDPR-konform, doppelte Bestätigung)
- Rollensystem: User, Moderator, Admin

## Reputations- & Abzeichen-System
- Reputation durch Upvotes, akzeptierte Antworten, Inhalte
- Automatische Abzeichen-Vergabe basierend auf Aktivität:
  - `first_article` — Erster veröffentlichter Artikel
  - `first_question` — Erste gestellte Frage
  - `first_answer` — Erste gegebene Antwort
  - `first_comment` — Erster Kommentar
  - `accepted_answer` — Antwort wurde als Lösung markiert
  - `ten_articles` — 10 veröffentlichte Artikel
  - `helpful` — 10 Upvotes erhalten
  - `popular` — 50 Upvotes erhalten
  - `trusted_voice` — 500 Reputation erreicht
  - `veteran` — 2000 Reputation erreicht
  - `arch_btw` — Easter-Egg-Abzeichen (interaktives Terminal)
  - `pioneer` — ArchHub-Pionier (erste 50 aktive Beitragenden, legendäres Abzeichen)
- Community-Leaderboard mit Rangliste

## Artikel-System
- Erstellung mit fortschrittlichem Markdown-Editor (Live-Vorschau, Split-Modus)
- Markdown-Toolbar (Fett, Kursiv, Überschriften, Code, Links, Tabellen, etc.)
- Wortzähler, Zeichenzähler, Lesezeit-Schätzung
- Kategorien: general, tutorial, installation, package-management, system-administration, security, desktop, kernel, networking, scripting
- Schwierigkeitsgrad: Einsteiger, Fortgeschritten, Experte
- Tags für Verschlagwortung
- Zusammenfassungen
- Status-Workflow: Entwurf → Eingereicht → Genehmigt/Abgelehnt → Veröffentlicht
- Inhaltsverzeichnis (automatisch aus Überschriften generiert)

## Artikel-Kollaboration
- Einladung von Mitarbeitern per Benutzername
- Flexible Berechtigungen pro Kollaborateur:
  - Bearbeiten erlauben/verbieten
  - Veröffentlichen erlauben/verbieten
  - Einladen erlauben/verbieten
  - Löschen erlauben/verbieten
- Berechtigungen jederzeit anpassbar durch den Autor
- Kollaborateure auf der Artikel-Detailseite sichtbar
- Benachrichtigung bei Einladung
- Kollaborationsartikel erscheinen in der Entwurfsliste des Mitarbeiters

## Versionshistorie
- Jede Bearbeitung eines Artikels erstellt eine neue Version
- Versionen zeigen: Versionsnummer, Bearbeiter-Username, Zeitstempel, Kommentar
- Diff-Ansicht: Änderungen zwischen Versionen vergleichen (farbig markiert)
- Version wiederherstellen
- Öffentlich zugänglich für alle Benutzer

## Artikel-Forking
- Artikel forken (als eigenen Entwurf kopieren)
- Fork-Netzwerk-Visualisierung (Ursprungsartikel und alle Forks)
- Fork-Schutz: Admins/Mods können Forking für einzelne Artikel deaktivieren
- Fork-Referenzierung (Quellverweis)

## Q&A-System (Fragen & Antworten)
- Fragen stellen mit Markdown-Editor und Tags
- Antworten mit Markdown
- Voting-System (Up/Downvote) für Fragen und Antworten
- Antwort als Lösung akzeptieren (durch Fragesteller, Admin oder Moderator)
- Sortierung: Neueste, Meistbewertete, Unbeantwortet
- Sprachfilter (Deutsch/Englisch/Alle)

## Shell-Script-Bibliothek
- Skripte erstellen mit Syntax-Highlighting
- Unterstützte Sprachen: Bash, Python, Fish, Zsh, Perl
- Kategorien: utility, backup, package-management, maintenance, monitoring, networking, security, automation
- Skript-Forking mit Quellverweis
- Skript-Bearbeitung mit Versionshistorie und optionalen Kommentaren
- Skript-des-Tages-Feature (automatisch ausgewählt)
- Querverweise: Skripte in Artikel einbetten, Artikelverweise in Skripten

## Mehrsprachigkeit (i18n)
- Vollständige Unterstützung für Deutsch und Englisch
- Sprachumschaltung über die Benutzeroberfläche (Globe-Icon)
- Alle UI-Elemente, Fehlermeldungen und Hinweise übersetzt
- Inhalte in beiden Sprachen erstellbar:
  - Primäre Sprache wählen (Deutsch oder Englisch)
  - Optional: Übersetzung hinzufügen (Titel, Inhalt, Zusammenfassung)
  - Inhalte wechseln automatisch basierend auf der gewählten UI-Sprache
- Sprachfilter auf allen Listen (Artikel, Skripte, Q&A)

## Kommentar-System
- Markdown-Kommentare auf Artikeln
- Verschachtelte Kommentare (Antworten auf Kommentare)
- Voting auf Kommentare

## Voting & Bookmarking
- Up/Downvote auf Artikeln, Fragen, Antworten, Kommentaren
- Bookmark-Funktion (Artikel speichern)
- Bookmarks-Übersicht im Benutzerprofil

## Inhaltsmeldung
- Inhalte melden (Artikel, Kommentare, Fragen, Antworten)
- Meldegründe: Spam, Beleidigung, Off-Topic, Gefährlich, Sonstige
- Admin-Einsicht in gemeldete Inhalte

## Suche
- Globale Volltextsuche über Artikel, Fragen und Skripte
- Filterung nach Typ (Artikel, Fragen, Skripte)

## Admin-Dashboard
- Tab-basiertes Layout mit folgenden Bereichen:

### Benutzer-Verwaltung
- Alle Benutzer auflisten (Suche, Sortierung)
- Rollen zuweisen (User, Moderator, Admin)
- Benutzer sperren/entsperren
- Benutzer löschen (GDPR-konform)

### Inhalte-Moderation
- Eingereichte Artikel genehmigen oder ablehnen
- Ablehnungsgrund angeben

### Ankündigungen
- Plattformweite Ankündigungsbanner erstellen
- Banner aktivieren/deaktivieren

### Benutzername-Blockliste
- Gesperrte Benutzernamen verwalten
- Neue Benutzernamen zur Blockliste hinzufügen
- Benutzernamen von der Blockliste entfernen

### E-Mail-System
- SMTP-Konfiguration (Server, Port, Benutzername, Passwort, Verschlüsselung)
- Test-E-Mail senden
- E-Mail-Templates bearbeiten (6 Standard-Templates)
- Templates in Deutsch und Englisch
- Platzhalter-System ({{username}}, {{article_title}}, etc.)
- Templates aktivieren/deaktivieren

### Design & SEO
- Website-Titel ändern
- Favicon hochladen
- Logo hochladen (wird in Navbar und Footer angezeigt)
- Meta-Beschreibung und Keywords
- Open-Graph-Bild konfigurieren
- GEO/AIO: Schema.org-Typ, Organisationsname, KI-freundliche Beschreibung
- JSON-LD Structured Data für Suchmaschinen

## Benutzer-Einstellungen
- Tab-basiertes Layout:
  - **Profil**: Bio bearbeiten
  - **Sicherheit**: Passwort ändern, Benutzername ändern, 2FA aktivieren/deaktivieren, Session-Management
  - **Benachrichtigungen**: E-Mail-Benachrichtigungen pro Kategorie aktivieren/deaktivieren
  - **Privatsphäre**: Datenexport (GDPR), Konto löschen

## DSGVO/GDPR-Konformität
- Cookie-Banner mit Akzeptieren/Ablehnen
- Datenexport (alle persönlichen Daten als JSON)
- Kontolöschung mit Anonymisierung
- Impressum-Seite
- Datenschutzerklärung-Seite

## UI/UX & Design
- Dunkles, terminal-inspiriertes Design-Thema
- Light-Mode-Unterstützung (umschaltbar)
- Terminal-Style-Header mit Tipp-Animation
- Ambient-Hintergrund-Animation (schwebende blaue Kugeln, CSS-only)
- Interaktives Terminal auf der Homepage mit Easter-Egg
- Responsive Design (Mobile, Tablet, Desktop)
- Markdown-Rendering mit Syntax-Highlighting
- React Portals für modale Dialoge (korrekte CSS-Stacking-Order)

## Technische Details
- **Frontend**: React 19, TailwindCSS, Shadcn/UI, lucide-react, react-router-dom, i18next, react-syntax-highlighter, react-helmet-async
- **Backend**: FastAPI, Motor (async MongoDB), Pydantic, python-jose (JWT), pyotp (TOTP), smtplib (E-Mail)
- **Datenbank**: MongoDB 7
- **Deployment**: Docker & Docker Compose
- **Betriebssysteme**: Debian, Ubuntu, Arch Linux (automatisiertes Installationsskript)
