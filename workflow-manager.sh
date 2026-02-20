#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# N8N Workflow Manager - Schnellstart Script
# Wrapper für workflow-manager.py mit Konfigurationshilfe
# ─────────────────────────────────────────────────────────────────────────────

N8N_URL="${N8N_URL:-https://n8n.werbeportalnrw.de}"

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}  N8N Workflow Manager - ${N8N_URL}${NC}"
    echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
    echo ""
}

check_api_key() {
    if [ -z "$N8N_API_KEY" ]; then
        echo -e "${RED}FEHLER: N8N_API_KEY nicht gesetzt!${NC}"
        echo ""
        echo -e "${YELLOW}So erhältst du deinen API Key:${NC}"
        echo "  1. Gehe zu: ${N8N_URL}/settings/api"
        echo "  2. Klicke auf 'Create an API key'"
        echo "  3. Kopiere den Key"
        echo ""
        echo -e "${YELLOW}Dann setze die Variable:${NC}"
        echo "  export N8N_API_KEY='dein-api-key-hier'"
        echo "  export N8N_URL='${N8N_URL}'"
        echo ""
        echo "Oder erstelle eine .env Datei:"
        echo "  echo \"N8N_API_KEY=dein-key\" >> .env"
        echo "  source .env"
        echo ""
        exit 1
    fi
}

# .env laden falls vorhanden
if [ -f ".env" ]; then
    source .env
fi

case "$1" in
    "list"|"ls")
        print_header
        check_api_key
        python3 "$(dirname "$0")/workflow-manager.py" list "${@:2}"
        ;;
    "get"|"show")
        print_header
        check_api_key
        if [ -z "$2" ]; then
            echo -e "${RED}Fehler: Workflow-ID erforderlich${NC}"
            echo "Verwendung: $0 get <ID>"
            exit 1
        fi
        python3 "$(dirname "$0")/workflow-manager.py" get "$2" "${@:3}"
        ;;
    "edit")
        print_header
        check_api_key
        if [ -z "$2" ]; then
            echo -e "${RED}Fehler: Workflow-ID erforderlich${NC}"
            echo "Verwendung: $0 edit <ID>"
            exit 1
        fi
        python3 "$(dirname "$0")/workflow-manager.py" edit "$2"
        ;;
    "export")
        print_header
        check_api_key
        if [ -z "$2" ]; then
            echo -e "${RED}Fehler: Workflow-ID erforderlich${NC}"
            echo "Verwendung: $0 export <ID> [ausgabe.json]"
            exit 1
        fi
        python3 "$(dirname "$0")/workflow-manager.py" export "$2" ${3:+-o "$3"}
        ;;
    "import")
        print_header
        check_api_key
        if [ -z "$2" ]; then
            echo -e "${RED}Fehler: JSON-Datei erforderlich${NC}"
            echo "Verwendung: $0 import <datei.json>"
            exit 1
        fi
        python3 "$(dirname "$0")/workflow-manager.py" import "$2" "${@:3}"
        ;;
    "activate"|"on")
        check_api_key
        python3 "$(dirname "$0")/workflow-manager.py" activate "$2"
        ;;
    "deactivate"|"off")
        check_api_key
        python3 "$(dirname "$0")/workflow-manager.py" deactivate "$2"
        ;;
    "setup")
        print_header
        echo -e "${BLUE}Konfiguration einrichten:${NC}"
        echo ""
        read -p "N8N URL [${N8N_URL}]: " input_url
        url="${input_url:-$N8N_URL}"
        read -p "N8N API Key: " input_key
        echo ""
        echo "# N8N Konfiguration" > .env
        echo "N8N_URL=${url}" >> .env
        echo "N8N_API_KEY=${input_key}" >> .env
        echo "# .env zu .gitignore hinzugefügt" >> /dev/null
        # .gitignore aktualisieren
        if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
            echo ".env" >> .gitignore
        fi
        echo -e "${GREEN}Konfiguration gespeichert in .env${NC}"
        echo -e "${YELLOW}WICHTIG: .env wurde zu .gitignore hinzugefügt (API Key bleibt privat)${NC}"
        ;;
    "help"|"--help"|"-h"|"")
        print_header
        echo -e "${BOLD}Verwendung:${NC} $0 <Kommando> [Optionen]"
        echo ""
        echo -e "${BOLD}Kommandos:${NC}"
        echo "  list              Alle Workflows auflisten"
        echo "  list --active     Nur aktive Workflows"
        echo "  list --inactive   Nur inaktive Workflows"
        echo "  get <ID>          Workflow-Details anzeigen"
        echo "  get <ID> --json   Mit vollständigem JSON"
        echo "  edit <ID>         Workflow im Editor bearbeiten"
        echo "  export <ID>       Workflow als JSON-Datei exportieren"
        echo "  import <datei>    Workflow aus JSON importieren"
        echo "  activate <ID>     Workflow aktivieren"
        echo "  deactivate <ID>   Workflow deaktivieren"
        echo "  setup             Konfiguration einrichten"
        echo ""
        echo -e "${BOLD}Konfiguration:${NC}"
        echo "  export N8N_URL='https://n8n.werbeportalnrw.de'"
        echo "  export N8N_API_KEY='dein-api-key'"
        echo "  Oder: $0 setup"
        echo ""
        ;;
    *)
        echo -e "${RED}Unbekanntes Kommando: $1${NC}"
        echo "Hilfe: $0 help"
        exit 1
        ;;
esac
