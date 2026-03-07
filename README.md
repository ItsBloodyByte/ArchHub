<p align="center">
  <img src="https://img.shields.io/badge/Arch_Linux-1793D1?style=for-the-badge&logo=archlinux&logoColor=white" alt="Arch Linux" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

<h1 align="center">ArchHub</h1>
<p align="center">
  <strong>Community-Plattform für Arch Linux</strong><br>
  Artikel, Fragen & Antworten, Shell-Skripte, Paketsuche — von der Community, für die Community.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#schnellstart">Schnellstart</a> •
  <a href="#installation">Installation</a> •
  <a href="#konfiguration">Konfiguration</a> •
  <a href="#entwicklung">Entwicklung</a> •
  <a href="#api-referenz">API</a> •
  <a href="#mitwirken">Mitwirken</a> •
  <a href="#lizenz">Lizenz</a>
</p>

---

## Über ArchHub

ArchHub ist eine vollwertige Community-Plattform, gebaut für Arch-Linux-Enthusiasten. Die Plattform kombiniert eine Wissensbasis für Artikel, ein Q&A-System, eine Shell-Script-Bibliothek und eine Live-Paketsuche (Official + AUR) in einer einzigen, terminal-inspirierten Oberfläche. Alle Inhalte sind zweisprachig (Deutsch/Englisch) verfügbar.

### Highlights

- **Artikel mit Kollaboration** — Gemeinsam an Artikeln arbeiten mit Berechtigungen und Versionshistorie
- **Q&A-System** — Fragen stellen, Antworten geben, Lösungen markieren
- **Shell-Script-Bibliothek** — Skripte teilen mit Syntax-Highlighting, Versionierung und Paket-Sidebar
- **Arch Paketsuche** — Live-Suche in offiziellen Repos und AUR mit Out-of-Date/Orphaned-Warnungen
- **Collections** — Lernpfade erstellen mit Fortschritts-Tracker
- **Bug-Report-System** — Dedizierte Bug-Reports mit Status-Workflow und Bug-Hunter-Badges
- **Forking** — Inhalte forken wie auf GitHub
- **Zweisprachig** — Alle Inhalte in Deutsch und Englisch
- **Terminal-Ästhetik** — Dunkles, modernes Design inspiriert von der Linux-Kommandozeile

---

## Features

Eine vollständige Auflistung findest du in [FEATURES.md](FEATURES.md).

| Bereich | Features |
|---|---|
| **Authentifizierung** | JWT, 2FA (TOTP), Session-Management, Anti-Bot, Nutzungsbedingungen-Zustimmung |
| **Inhalte** | Markdown-Editor, Artikel, Q&A (getrennt von Bug Reports), Script-Bibliothek |
| **Paketsuche** | Official + AUR, Out-of-Date/Orphaned-Warnungen, Inline-Checks in Tutorials, Script-Sidebar |
| **Collections** | Lernpfade, Fortschritts-Tracker, Gamification |
| **Kollaboration** | Mitarbeiter einladen, Berechtigungen, Versionshistorie |
| **Community** | Reputation, 17 Badges, Voting, Kommentare, Leaderboard, Contributors-Seite |
| **Social Profiles** | GitHub, GitLab, Reddit, Xing, Mastodon, Arch Wiki, Website |
| **Admin** | Benutzerverwaltung, Moderation, E-Mail, Design/SEO, Footer, Contributors, Paket-API |
| **Legal** | Datenschutz, Impressum, Nutzungsbedingungen (admin-editierbar), Cookie-Banner |
| **DSGVO** | Datenexport, Kontolöschung, Cookie-Consent |

---

## Schnellstart

### Voraussetzungen

- **Docker** und **Docker Compose** (wird automatisch installiert)
- **Git**
- Root-Zugriff (für die automatische Installation)

### Ein-Zeilen-Installation

```bash
git clone https://github.com/ItsBloodyByte/ArchHub.git && cd ArchHub && sudo bash install.sh
```

### Was passiert:

```
1. Betriebssystem erkennen     → Debian/Ubuntu/Arch/Manjaro
2. Installationsmodus wählen   → Docker (empfohlen) oder Native
3. Docker installieren         → Falls nicht vorhanden
4. Admin-Konto einrichten      → Username, Passwort, E-Mail
5. Netzwerk konfigurieren      → Domain, Port, HTTPS
6. Container bauen & starten   → docker compose up -d --build
7. Health Check                → Warten bis alles läuft
```

### Manuelle Installation (Docker)

```bash
git clone https://github.com/ItsBloodyByte/ArchHub.git
cd ArchHub

# .env erstellen
cat > .env << EOF
MONGO_URL=mongodb://mongodb:27017
DB_NAME=archhub
JWT_SECRET=$(openssl rand -base64 48)
ADMIN_USERNAME=MeinAdmin
ADMIN_PASSWORD=SicheresPasswort123
ADMIN_EMAIL=admin@example.com
REACT_APP_BACKEND_URL=http://localhost
PORT=80
CORS_ORIGINS=*
EOF

docker compose up -d --build
```

ArchHub ist dann unter `http://localhost` erreichbar.

---

## Installation

### Unterstützte Systeme

| System | Docker | Native | Status |
|---|---|---|---|
| Debian 11/12 | ✅ | ✅ | Vollständig |
| Ubuntu 22.04/24.04 | ✅ | ✅ | Vollständig |
| Arch Linux | ✅ | ✅ | Vollständig |
| Manjaro/EndeavourOS | ✅ | ✅ | Vollständig |
| Fedora/RHEL | ✅ | — | Nur Docker |
| macOS | ✅ | — | Nur Docker |

### Container-Architektur

```
┌─────────────────────────────────────────┐
│                  Nginx                   │
│             (Port 80/443)                │
│                                          │
│  /api/*     ──→  Backend (FastAPI:8001)  │
│  /uploads/* ──→  Backend (FastAPI:8001)  │
│  /*         ──→  Frontend (React SPA)    │
└──────────────┬──────────────┬────────────┘
               │              │
        ┌──────┴──────┐ ┌────┴──────┐
        │   Backend   │ │  MongoDB  │
        │   FastAPI   │ │   Mongo 7 │
        │    :8001    │ │   :27017  │
        └─────────────┘ └───────────┘
```

### Nach der Installation

```bash
# Logs
docker compose logs -f

# Neustarten
docker compose restart

# Stoppen
docker compose down

# Update
git pull && docker compose up -d --build

# Backup
docker compose exec mongodb mongodump --out /data/backup

# Deinstallieren
sudo bash install.sh --uninstall
```

---

## Konfiguration

### Umgebungsvariablen (.env)

| Variable | Beschreibung | Standard |
|---|---|---|
| `MONGO_URL` | MongoDB-Verbindungs-URL | `mongodb://mongodb:27017` |
| `DB_NAME` | Datenbankname | `archhub` |
| `JWT_SECRET` | Token-Signierung | (generiert) |
| `JWT_EXPIRY_MINUTES` | Token-Gültigkeit | `1440` (24h) |
| `ADMIN_USERNAME` | Admin-Benutzername | `ArchAdmin` |
| `ADMIN_PASSWORD` | Admin-Passwort | (bei Installation) |
| `REACT_APP_BACKEND_URL` | Öffentliche URL | `http://localhost` |
| `PORT` | Webserver-Port | `80` |
| `CORS_ORIGINS` | CORS-Ursprünge | `*` |

### Admin-Dashboard Features

| Tab | Funktionen |
|---|---|
| **Benutzer** | Rollen, Bans, Löschen, Trust Levels |
| **Moderation** | Queue, Reports, Content-Aktionen |
| **E-Mail** | SMTP-Setup, Templates |
| **Design & SEO** | Logo, Favicon, Meta-Tags, Footer-Copyright, Contributors |
| **Pakete** | Arch Package API URL konfigurieren |
| **Ankündigungen** | System-Nachrichten |

---

## Entwicklung

### Lokale Entwicklungsumgebung

```bash
git clone https://github.com/ItsBloodyByte/ArchHub.git
cd ArchHub

# MongoDB (Docker)
docker run -d --name archhub-mongo -p 27017:27017 mongo:7

# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cat > .env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=archhub
JWT_SECRET=dev-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
EOF
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend (neues Terminal)
cd frontend
echo 'REACT_APP_BACKEND_URL=http://localhost:8001' > .env
yarn install && yarn start
```

### Projektstruktur

```
ArchHub/
├── backend/
│   ├── server.py              # FastAPI Entry Point
│   ├── config.py              # JWT, Rate Limiting
│   ├── database.py            # MongoDB-Verbindung
│   ├── deps.py                # Auth-Dependencies
│   ├── models.py              # Pydantic Models
│   ├── routes/                # API-Router (16 Module)
│   │   ├── auth.py            # Registrierung, Login, Profil, 2FA
│   │   ├── articles.py        # Artikel CRUD, Forking, Kollaboration
│   │   ├── qa.py              # Q&A, Bug Reports
│   │   ├── scripts.py         # Script Library
│   │   ├── packages.py        # Arch Package Search (Cached)
│   │   ├── collections.py     # Learning Paths + Progress
│   │   ├── admin.py           # Dashboard, Contributors, Footer
│   │   └── ...
│   ├── services/              # Business Logic
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/        # UI-Komponenten
│   │   │   ├── ui/            # Shadcn/UI
│   │   │   ├── PackageWarnings.js
│   │   │   ├── ScriptPackageSidebar.js
│   │   │   └── ...
│   │   ├── pages/             # Seiten (20+)
│   │   ├── contexts/          # Auth, Language
│   │   └── i18n/              # DE/EN Übersetzungen
│   └── package.json
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── install.sh                 # Automatischer Installer v2.0
├── FEATURES.md
└── README.md
```

---

## API-Referenz

Alle Endpunkte unter `/api`. Auth via `Authorization: Bearer <token>`.

### Auth
| Methode | Endpunkt | Beschreibung |
|---|---|---|
| `POST` | `/api/auth/register` | Registrierung |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Profil (inkl. Social Links) |
| `PUT` | `/api/auth/profile` | Profil updaten |

### Content
| Methode | Endpunkt | Beschreibung |
|---|---|---|
| `GET/POST` | `/api/articles` | Artikel CRUD |
| `GET/POST` | `/api/questions` | Q&A |
| `GET/POST` | `/api/scripts` | Scripts |
| `GET/POST` | `/api/collections` | Collections |
| `GET/POST` | `/api/collections/{slug}/progress` | Fortschritt tracken |

### Packages
| Methode | Endpunkt | Beschreibung |
|---|---|---|
| `GET` | `/api/packages/search?q=...` | Paketsuche (Official + AUR) |
| `GET` | `/api/packages/check?names=...` | Status-Check (Cached, 4h TTL) |

### Admin
| Methode | Endpunkt | Beschreibung |
|---|---|---|
| `GET/PUT` | `/api/admin/footer-settings` | Footer-Copyright |
| `GET/PUT` | `/api/admin/contributors` | Contributors verwalten |
| `GET/PUT` | `/api/admin/package-settings` | Paket-API-URL |
| `GET/PUT` | `/api/pages/{slug}` | Legal Pages (privacy, terms, imprint) |

---

## Mitwirken

Beiträge sind willkommen! Siehe [Contributors-Seite](https://archhub.dev/contributors).

1. **Fork** das Repository
2. **Feature-Branch** erstellen: `git checkout -b feature/mein-feature`
3. **Commit**: `git commit -m 'Neues Feature: ...'`
4. **Push**: `git push origin feature/mein-feature`
5. **Pull Request** erstellen

### Richtlinien

- Terminal-inspirierten Design-Stil beibehalten
- UI-Strings in beiden Sprachen in `translations.js`
- Backend-Endpunkte mit `/api`-Präfix
- MongoDB `_id` aus API-Antworten ausschließen
- Neue Features mit Tests abdecken

---

## Lizenz

Dieses Projekt steht unter der **[AGPL v3](LICENSE)**.

© 2026 ArchHub Contributors.

---

<p align="center">
  <strong>Gebaut mit Leidenschaft für die Arch-Linux-Community.</strong><br>
</p>
