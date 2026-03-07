#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  ArchHub — Automated Installation Script v2.0
#
#  Supports:
#    Docker/Docker Compose  (recommended, all platforms)
#    Native: Debian 11/12, Ubuntu 22.04+, Arch Linux, Manjaro, EndeavourOS
#
#  Usage:
#    curl -fsSL https://raw.githubusercontent.com/ItsBloodyByte/ArchHub/main/install.sh | sudo bash
#    — or —
#    git clone https://github.com/ItsBloodyByte/ArchHub.git && cd ArchHub && sudo bash install.sh
#
#  Repository: https://github.com/ItsBloodyByte/ArchHub
#  License:    AGPL v3
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
IFS=$'\n\t'

# ── Constants ─────────────────────────────────────────────────────────────────
readonly REPO_URL="https://github.com/ItsBloodyByte/ArchHub.git"
readonly REPO_NAME="ArchHub"
readonly MIN_DOCKER_VERSION="24.0"
readonly REQUIRED_PORTS_DOCKER=(80 443)
readonly REQUIRED_PORTS_NATIVE=(3000 8001 27017)
readonly PYTHON_MIN="3.10"
readonly NODE_MIN="18"
readonly MONGO_VERSION="7"

# ── Colors & Output ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
CYAN='\033[0;36m'; MAGENTA='\033[0;35m'; BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

print_banner() {
  clear
  echo -e "${CYAN}"
  cat << 'BANNER'
     ╔══════════════════════════════════════════════════════════╗
     ║              _             _     _   _       _          ║
     ║             / \   _ __ ___| |__ | | | |_   _| |__       ║
     ║            / _ \ | '__/ __| '_ \| |_| | | | | '_ \     ║
     ║           / ___ \| | | (__| | | |  _  | |_| | |_) |    ║
     ║          /_/   \_\_|  \___|_| |_|_| |_|\__,_|_.__/     ║
     ║                                                          ║
     ║           Community Platform for Arch Linux              ║
     ║                    Installer v2.0                        ║
     ╚══════════════════════════════════════════════════════════╝
BANNER
  echo -e "${NC}"
  echo -e "  ${DIM}Repository: https://github.com/ItsBloodyByte/ArchHub${NC}"
  echo -e "  ${DIM}Lizenz:     AGPL v3${NC}"
  echo ""
}

log_info()    { echo -e "  ${GREEN}[✓]${NC} $1"; }
log_warn()    { echo -e "  ${YELLOW}[!]${NC} $1"; }
log_error()   { echo -e "  ${RED}[✗]${NC} $1"; }
log_step()    { echo -e "\n${BLUE}${BOLD}  ── $1 ──${NC}\n"; }
log_sub()     { echo -e "  ${DIM}    → $1${NC}"; }
prompt()      { echo -ne "  ${BOLD}$1${NC}"; }

# ── Detect OS ─────────────────────────────────────────────────────────────────
detect_os() {
  OS_ID="unknown"; OS_NAME="Unknown"; OS_FAMILY="unknown"
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="${ID}"; OS_NAME="${PRETTY_NAME}"
  elif [ -f /etc/debian_version ]; then
    OS_ID="debian"; OS_NAME="Debian $(cat /etc/debian_version)"
  fi
  case "${OS_ID}" in
    debian|ubuntu|linuxmint|pop|raspbian) OS_FAMILY="debian" ;;
    arch|manjaro|endeavouros|garuda|artix) OS_FAMILY="arch" ;;
    fedora|centos|rhel|rocky|alma)        OS_FAMILY="rhel" ;;
    *)                                     OS_FAMILY="unknown" ;;
  esac
}

# ── Check Root ────────────────────────────────────────────────────────────────
check_root() {
  if [ "$EUID" -ne 0 ]; then
    log_error "Dieses Skript muss als root ausgeführt werden."
    echo -e "  Starte es mit: ${BOLD}sudo bash install.sh${NC}"
    exit 1
  fi
}

# ── Check Port Availability ──────────────────────────────────────────────────
check_ports() {
  local ports=("$@")
  for port in "${ports[@]}"; do
    if ss -tlnp 2>/dev/null | grep -q ":${port} " || netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
      log_warn "Port ${port} ist bereits belegt!"
      return 1
    fi
  done
  return 0
}

# ── Choose Installation Mode ─────────────────────────────────────────────────
choose_mode() {
  log_step "Installationsmodus wählen"
  echo -e "  ${BOLD}[1]${NC} Docker Compose ${GREEN}(empfohlen)${NC}"
  echo -e "      Alles in isolierten Containern. Einfachstes Setup."
  echo ""
  echo -e "  ${BOLD}[2]${NC} Native Installation"
  echo -e "      Direkt auf dem System (Python, Node.js, MongoDB)."
  echo -e "      Für Entwickler oder wenn Docker nicht gewünscht ist."
  echo ""
  while true; do
    prompt "Deine Wahl [1]: "; read -r choice
    choice="${choice:-1}"
    case "$choice" in
      1) INSTALL_MODE="docker"; break ;;
      2) INSTALL_MODE="native"; break ;;
      *) log_warn "Bitte 1 oder 2 eingeben." ;;
    esac
  done
}

# ══════════════════════════════════════════════════════════════════════════════
#  Docker Installation
# ══════════════════════════════════════════════════════════════════════════════

install_docker_engine() {
  if command -v docker &>/dev/null && docker compose version &>/dev/null; then
    log_info "Docker und Docker Compose sind bereits installiert."
    log_sub "$(docker --version)"
    log_sub "$(docker compose version)"
    return
  fi

  log_step "Docker installieren"

  case "${OS_FAMILY}" in
    debian)
      log_info "Installiere Docker für ${OS_NAME}..."
      apt-get update -qq
      apt-get install -y -qq ca-certificates curl gnupg lsb-release >/dev/null 2>&1

      install -m 0755 -d /etc/apt/keyrings
      if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
        curl -fsSL "https://download.docker.com/linux/${OS_ID}/gpg" | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
      fi

      local codename
      codename=$(. /etc/os-release && echo "${VERSION_CODENAME:-$(lsb_release -cs)}")
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${OS_ID} ${codename} stable" \
        > /etc/apt/sources.list.d/docker.list

      apt-get update -qq
      apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null 2>&1
      ;;

    arch)
      log_info "Installiere Docker für Arch Linux..."
      pacman -Sy --noconfirm --needed docker docker-compose docker-buildx >/dev/null 2>&1
      ;;

    rhel)
      log_info "Installiere Docker für ${OS_NAME}..."
      dnf install -y -q dnf-plugins-core >/dev/null 2>&1
      dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo 2>/dev/null || true
      dnf install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin >/dev/null 2>&1
      ;;

    *)
      log_error "Betriebssystem nicht unterstützt: ${OS_NAME}"
      echo -e "  Installiere Docker manuell: ${CYAN}https://docs.docker.com/get-docker/${NC}"
      exit 1
      ;;
  esac

  systemctl enable --now docker >/dev/null 2>&1
  log_info "Docker erfolgreich installiert."
  log_sub "$(docker --version)"
}

# ══════════════════════════════════════════════════════════════════════════════
#  Native Dependencies
# ══════════════════════════════════════════════════════════════════════════════

install_native_deps_debian() {
  log_info "Installiere Abhängigkeiten für ${OS_NAME}..."

  apt-get update -qq
  apt-get install -y -qq \
    python3 python3-pip python3-venv \
    nodejs npm \
    curl git build-essential \
    gnupg >/dev/null 2>&1

  # Node.js 20 via NodeSource (if system version too old)
  local node_ver
  node_ver=$(node --version 2>/dev/null | sed 's/v//' | cut -d. -f1)
  if [ "${node_ver:-0}" -lt "${NODE_MIN}" ]; then
    log_sub "Node.js aktualisieren auf v20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y -qq nodejs >/dev/null 2>&1
  fi

  # Yarn
  if ! command -v yarn &>/dev/null; then
    npm install -g yarn >/dev/null 2>&1
  fi

  # MongoDB 7
  if ! command -v mongod &>/dev/null; then
    log_sub "MongoDB ${MONGO_VERSION} installieren..."
    curl -fsSL https://www.mongodb.org/static/pgp/server-${MONGO_VERSION}.0.asc | gpg --dearmor -o /etc/apt/keyrings/mongodb.gpg 2>/dev/null
    local codename
    codename=$(. /etc/os-release && echo "${VERSION_CODENAME:-$(lsb_release -cs)}")
    echo "deb [signed-by=/etc/apt/keyrings/mongodb.gpg] https://repo.mongodb.org/apt/${OS_ID} ${codename}/mongodb-org/${MONGO_VERSION}.0 multiverse" \
      > /etc/apt/sources.list.d/mongodb-org.list
    apt-get update -qq
    apt-get install -y -qq mongodb-org >/dev/null 2>&1
    systemctl enable --now mongod >/dev/null 2>&1
  fi

  log_info "Alle Abhängigkeiten installiert."
}

install_native_deps_arch() {
  log_info "Installiere Abhängigkeiten für Arch Linux..."

  pacman -Sy --noconfirm --needed \
    python python-pip python-virtualenv \
    nodejs npm yarn \
    mongodb-bin mongosh-bin \
    curl git base-devel >/dev/null 2>&1 || {
    # mongodb-bin is in AUR, try with available packages
    pacman -Sy --noconfirm --needed \
      python python-pip python-virtualenv \
      nodejs npm yarn \
      curl git base-devel >/dev/null 2>&1

    # MongoDB from AUR (if not installed)
    if ! command -v mongod &>/dev/null; then
      log_warn "MongoDB muss aus dem AUR installiert werden."
      echo -e "  Installiere es mit: ${BOLD}yay -S mongodb-bin${NC}"
      echo -e "  Oder verwende die ${BOLD}Docker-Installation${NC} (empfohlen)."

      prompt "Trotzdem fortfahren ohne MongoDB? (j/n) [n]: "; read -r skip_mongo
      if [[ ! "${skip_mongo}" =~ ^[jJyY]$ ]]; then
        log_error "Installation abgebrochen. Verwende die Docker-Installation."
        exit 1
      fi
    fi
  }

  # Enable MongoDB if available
  if command -v mongod &>/dev/null; then
    systemctl enable --now mongodb >/dev/null 2>&1 || systemctl enable --now mongod >/dev/null 2>&1 || true
  fi

  log_info "Alle Abhängigkeiten installiert."
}

install_native_deps() {
  log_step "System-Abhängigkeiten installieren"

  case "${OS_FAMILY}" in
    debian) install_native_deps_debian ;;
    arch)   install_native_deps_arch ;;
    *)
      log_error "Native Installation wird für ${OS_NAME} nicht unterstützt."
      log_info  "Bitte verwende die Docker-Installation (Option 1)."
      exit 1
      ;;
  esac
}

# ══════════════════════════════════════════════════════════════════════════════
#  Common Setup Functions
# ══════════════════════════════════════════════════════════════════════════════

clone_repo() {
  log_step "Repository klonen"

  if [ -f "docker-compose.yml" ] && [ -d "backend" ] && [ -d "frontend" ]; then
    log_info "ArchHub-Projekt erkannt. Überspringe Klonen."
    INSTALL_DIR="$(pwd)"
    return
  fi

  if [ -d "${REPO_NAME}" ]; then
    log_info "Verzeichnis '${REPO_NAME}' existiert bereits. Aktualisiere..."
    cd "${REPO_NAME}"
    git pull --ff-only 2>/dev/null || log_warn "Git Pull fehlgeschlagen. Nutze lokale Version."
    INSTALL_DIR="$(pwd)"
    return
  fi

  if ! command -v git &>/dev/null; then
    case "${OS_FAMILY}" in
      debian) apt-get install -y -qq git >/dev/null 2>&1 ;;
      arch)   pacman -Sy --noconfirm --needed git >/dev/null 2>&1 ;;
    esac
  fi

  git clone "${REPO_URL}" "${REPO_NAME}"
  cd "${REPO_NAME}"
  INSTALL_DIR="$(pwd)"
  log_info "Repository geklont nach: ${INSTALL_DIR}"
}

setup_admin() {
  log_step "Admin-Konto einrichten"
  echo -e "  ${CYAN}Erstelle das Administrator-Konto für das Dashboard.${NC}"
  echo ""

  while true; do
    prompt "Admin-Benutzername [ArchAdmin]: "; read -r ADMIN_USERNAME
    ADMIN_USERNAME="${ADMIN_USERNAME:-ArchAdmin}"
    [[ ${#ADMIN_USERNAME} -ge 3 && "${ADMIN_USERNAME}" =~ ^[a-zA-Z0-9_-]+$ ]] && break
    log_warn "3+ Zeichen, nur Buchstaben/Zahlen/Unterstriche/Bindestriche."
  done

  while true; do
    prompt "Admin-Passwort (min. 8 Zeichen): "; read -rs ADMIN_PASSWORD; echo ""
    [[ ${#ADMIN_PASSWORD} -lt 8 ]] && { log_warn "Mindestens 8 Zeichen."; continue; }
    prompt "Passwort bestätigen: "; read -rs ADMIN_PASSWORD_CONFIRM; echo ""
    [[ "${ADMIN_PASSWORD}" == "${ADMIN_PASSWORD_CONFIRM}" ]] && break
    log_warn "Passwörter stimmen nicht überein."
  done

  prompt "Admin-E-Mail (optional, Enter überspringen): "; read -r ADMIN_EMAIL
  ADMIN_EMAIL="${ADMIN_EMAIL:-}"
  echo ""
  log_info "Admin-Konto: ${BOLD}${ADMIN_USERNAME}${NC}"
}

setup_network() {
  log_step "Netzwerk-Konfiguration"

  prompt "Domain oder IP [localhost]: "; read -r DOMAIN
  DOMAIN="${DOMAIN:-localhost}"

  if [[ "${INSTALL_MODE}" == "docker" ]]; then
    prompt "Port [80]: "; read -r PORT
    PORT="${PORT:-80}"
  else
    PORT="3000"
    log_info "Native-Modus: Frontend auf Port 3000, Backend auf Port 8001"
  fi

  if [[ "${DOMAIN}" == "localhost" || "${DOMAIN}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    [[ "${PORT}" == "80" ]] && BACKEND_URL="http://${DOMAIN}" || BACKEND_URL="http://${DOMAIN}:${PORT}"
  else
    prompt "HTTPS verwenden? (j/n) [j]: "; read -r USE_HTTPS
    [[ "${USE_HTTPS:-j}" =~ ^[jJyY]$ ]] && BACKEND_URL="https://${DOMAIN}" || BACKEND_URL="http://${DOMAIN}"
  fi

  log_info "URL: ${CYAN}${BACKEND_URL}${NC}"
}

generate_secret() {
  openssl rand -base64 48 2>/dev/null || head -c 48 /dev/urandom | base64
}

# ══════════════════════════════════════════════════════════════════════════════
#  Docker Compose Setup
# ══════════════════════════════════════════════════════════════════════════════

setup_docker() {
  log_step "Docker-Konfiguration erstellen"

  local jwt_secret
  jwt_secret=$(generate_secret)

  cat > .env <<EOF
MONGO_URL=mongodb://mongodb:27017
DB_NAME=archhub
JWT_SECRET=${jwt_secret}
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=1440
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_EMAIL=${ADMIN_EMAIL}
REACT_APP_BACKEND_URL=${BACKEND_URL}
PORT=${PORT}
CORS_ORIGINS=*
EOF

  chmod 600 .env
  log_info ".env erstellt (JWT-Secret automatisch generiert)."

  log_step "Docker-Container bauen und starten"
  log_info "Images werden gebaut (dies kann 3-5 Minuten dauern)..."

  docker compose build 2>&1 | while IFS= read -r line; do
    echo -e "  ${DIM}${line}${NC}"
  done

  log_info "Container starten..."
  docker compose up -d

  log_info "Warte auf Health Check..."
  local retries=45
  while [ $retries -gt 0 ]; do
    if curl -sf "http://localhost:${PORT}/api/badges" >/dev/null 2>&1; then
      log_info "Backend ist bereit!"
      return
    fi
    retries=$((retries - 1))
    sleep 2
  done

  log_warn "Backend antwortet noch nicht. Prüfe mit: ${BOLD}docker compose logs -f${NC}"
}

# ══════════════════════════════════════════════════════════════════════════════
#  Native Setup
# ══════════════════════════════════════════════════════════════════════════════

setup_native() {
  log_step "Native Konfiguration"

  local jwt_secret
  jwt_secret=$(generate_secret)

  # Backend .env
  cat > backend/.env <<EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=archhub
JWT_SECRET=${jwt_secret}
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=1440
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_EMAIL=${ADMIN_EMAIL}
CORS_ORIGINS=*
EOF
  chmod 600 backend/.env
  log_info "backend/.env erstellt."

  # Frontend .env
  cat > frontend/.env <<EOF
REACT_APP_BACKEND_URL=${BACKEND_URL}
EOF
  log_info "frontend/.env erstellt."

  # Backend setup
  log_step "Backend einrichten"
  cd backend
  python3 -m venv venv
  source venv/bin/activate
  pip install --quiet --upgrade pip
  pip install --quiet -r requirements.txt
  deactivate
  cd ..
  log_info "Python-Abhängigkeiten installiert."

  # Frontend setup
  log_step "Frontend einrichten"
  cd frontend
  yarn install --silent 2>/dev/null || npm install --silent 2>/dev/null
  yarn build --silent 2>/dev/null || npm run build --silent 2>/dev/null
  cd ..
  log_info "Frontend gebaut."

  # Create systemd services
  log_step "Systemd-Dienste erstellen"

  cat > /etc/systemd/system/archhub-backend.service <<EOF
[Unit]
Description=ArchHub Backend (FastAPI)
After=network.target mongod.service mongodb.service
Wants=mongod.service mongodb.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}/backend
Environment=PATH=${INSTALL_DIR}/backend/venv/bin:/usr/local/bin:/usr/bin
ExecStart=${INSTALL_DIR}/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  # Install serve for production frontend
  npm install -g serve >/dev/null 2>&1 || yarn global add serve >/dev/null 2>&1

  cat > /etc/systemd/system/archhub-frontend.service <<EOF
[Unit]
Description=ArchHub Frontend (React)
After=network.target archhub-backend.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}/frontend
ExecStart=$(which serve) -s build -l 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now archhub-backend archhub-frontend
  log_info "Dienste erstellt und gestartet."

  # Wait for backend
  log_info "Warte auf Backend..."
  local retries=30
  while [ $retries -gt 0 ]; do
    if curl -sf "http://localhost:8001/api/badges" >/dev/null 2>&1; then
      log_info "Backend ist bereit!"
      return
    fi
    retries=$((retries - 1))
    sleep 2
  done

  log_warn "Backend antwortet noch nicht. Prüfe mit: ${BOLD}journalctl -u archhub-backend -f${NC}"
}

# ══════════════════════════════════════════════════════════════════════════════
#  Uninstall
# ══════════════════════════════════════════════════════════════════════════════

uninstall() {
  log_step "ArchHub deinstallieren"

  if [ -f "docker-compose.yml" ]; then
    prompt "Docker-Container und Volumes entfernen? (j/n) [n]: "; read -r rm_docker
    if [[ "${rm_docker}" =~ ^[jJyY]$ ]]; then
      docker compose down -v 2>/dev/null || true
      log_info "Docker-Container und Volumes entfernt."
    fi
  fi

  if systemctl is-active --quiet archhub-backend 2>/dev/null; then
    systemctl stop archhub-backend archhub-frontend 2>/dev/null || true
    systemctl disable archhub-backend archhub-frontend 2>/dev/null || true
    rm -f /etc/systemd/system/archhub-backend.service /etc/systemd/system/archhub-frontend.service
    systemctl daemon-reload
    log_info "Systemd-Dienste entfernt."
  fi

  log_info "Deinstallation abgeschlossen."
  log_warn "Projektdateien und Datenbank wurden NICHT gelöscht."
  echo -e "  Manuell entfernen: ${BOLD}rm -rf ${INSTALL_DIR:-$(pwd)}${NC}"
}

# ══════════════════════════════════════════════════════════════════════════════
#  Summary
# ══════════════════════════════════════════════════════════════════════════════

print_summary() {
  echo ""
  echo -e "${GREEN}${BOLD}"
  echo "  ╔══════════════════════════════════════════════════════════╗"
  echo "  ║        ArchHub wurde erfolgreich installiert!           ║"
  echo "  ╚══════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  echo -e "  ${BOLD}URL:${NC}              ${CYAN}${BACKEND_URL}${NC}"
  echo -e "  ${BOLD}Modus:${NC}            ${INSTALL_MODE}"
  echo -e "  ${BOLD}Admin-Login:${NC}      ${ADMIN_USERNAME}"
  echo -e "  ${BOLD}Admin-Passwort:${NC}   ********"
  [[ -n "${ADMIN_EMAIL}" ]] && echo -e "  ${BOLD}Admin-E-Mail:${NC}     ${ADMIN_EMAIL}"
  echo ""

  if [[ "${INSTALL_MODE}" == "docker" ]]; then
    echo -e "  ${CYAN}${BOLD}Docker-Befehle:${NC}"
    echo -e "  ${BOLD}Logs:${NC}             docker compose logs -f"
    echo -e "  ${BOLD}Stoppen:${NC}          docker compose down"
    echo -e "  ${BOLD}Neustarten:${NC}       docker compose restart"
    echo -e "  ${BOLD}Update:${NC}           git pull && docker compose up -d --build"
    echo -e "  ${BOLD}DB-Backup:${NC}        docker compose exec mongodb mongodump --out /data/backup"
    echo -e "  ${BOLD}Deinstallieren:${NC}   sudo bash install.sh --uninstall"
  else
    echo -e "  ${CYAN}${BOLD}Service-Befehle:${NC}"
    echo -e "  ${BOLD}Backend-Logs:${NC}     journalctl -u archhub-backend -f"
    echo -e "  ${BOLD}Frontend-Logs:${NC}    journalctl -u archhub-frontend -f"
    echo -e "  ${BOLD}Stoppen:${NC}          sudo systemctl stop archhub-backend archhub-frontend"
    echo -e "  ${BOLD}Neustarten:${NC}       sudo systemctl restart archhub-backend archhub-frontend"
    echo -e "  ${BOLD}Update:${NC}           git pull && sudo systemctl restart archhub-backend"
    echo -e "  ${BOLD}Deinstallieren:${NC}   sudo bash install.sh --uninstall"
  fi

  echo ""
  echo -e "  ${YELLOW}Sicherheits-Tipps:${NC}"
  echo -e "  • Ändere das Admin-Passwort nach dem ersten Login"
  echo -e "  • Aktiviere 2FA im Profil unter Einstellungen → Sicherheit"
  echo -e "  • Konfiguriere SMTP im Admin-Dashboard für E-Mail-Benachrichtigungen"
  echo ""
  echo -e "  ${MAGENTA}${BOLD}Viel Spaß mit ArchHub!${NC}  ${DIM}\"I use Arch btw.\"${NC}"
  echo ""
}

# ══════════════════════════════════════════════════════════════════════════════
#  Main
# ══════════════════════════════════════════════════════════════════════════════

main() {
  # Handle flags
  case "${1:-}" in
    --uninstall|-u)
      check_root
      INSTALL_DIR="$(pwd)"
      uninstall
      exit 0
      ;;
    --help|-h)
      echo "Usage: sudo bash install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --uninstall, -u    ArchHub deinstallieren"
      echo "  --help, -h         Diese Hilfe anzeigen"
      echo ""
      echo "Repository: ${REPO_URL}"
      exit 0
      ;;
  esac

  print_banner
  check_root
  detect_os

  log_info "System erkannt: ${BOLD}${OS_NAME}${NC} (${OS_FAMILY})"

  choose_mode
  clone_repo

  if [[ "${INSTALL_MODE}" == "docker" ]]; then
    install_docker_engine
  else
    install_native_deps
  fi

  setup_admin
  setup_network

  if [[ "${INSTALL_MODE}" == "docker" ]]; then
    setup_docker
  else
    setup_native
  fi

  print_summary
}

main "$@"
