#!/usr/bin/env python3
"""
N8N Workflow Manager
Verwalte deine n8n Workflows via API: auflisten, anzeigen, bearbeiten, exportieren.

Verwendung:
    python3 workflow-manager.py --help
    python3 workflow-manager.py list
    python3 workflow-manager.py get <workflow-id>
    python3 workflow-manager.py edit <workflow-id>
    python3 workflow-manager.py export <workflow-id>
    python3 workflow-manager.py import <datei.json>

Konfiguration (Umgebungsvariablen):
    N8N_URL      - z.B. https://n8n.werbeportalnrw.de
    N8N_API_KEY  - Deinen API Key (Settings → API → API Key erstellen)
"""

import os
import sys
import json
import argparse
import subprocess
from datetime import datetime

try:
    import urllib.request
    import urllib.error
except ImportError:
    print("Fehler: Python urllib nicht verfügbar")
    sys.exit(1)

# ─── Konfiguration ────────────────────────────────────────────────────────────

N8N_URL = os.environ.get("N8N_URL", "https://n8n.werbeportalnrw.de")
N8N_API_KEY = os.environ.get("N8N_API_KEY", "")

# ─── API Client ───────────────────────────────────────────────────────────────

def api_request(method, path, data=None):
    """Sendet einen API-Request an den n8n Server."""
    if not N8N_API_KEY:
        print("FEHLER: N8N_API_KEY nicht gesetzt!")
        print("")
        print("Setze die Variable so:")
        print("  export N8N_API_KEY='dein-api-key'")
        print("  export N8N_URL='https://n8n.werbeportalnrw.de'")
        print("")
        print("API Key findest du in n8n unter: Settings → API → API Key erstellen")
        sys.exit(1)

    url = f"{N8N_URL.rstrip('/')}/api/v1{path}"
    headers = {
        "X-N8N-API-KEY": N8N_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        try:
            error_json = json.loads(error_body)
            msg = error_json.get("message", error_body)
        except Exception:
            msg = error_body
        print(f"HTTP Fehler {e.code}: {msg}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Verbindungsfehler: {e.reason}")
        print(f"Ist der Server '{N8N_URL}' erreichbar?")
        sys.exit(1)

# ─── Kommandos ────────────────────────────────────────────────────────────────

def cmd_list(args):
    """Listet alle Workflows auf."""
    params = "?limit=250"
    if args.active:
        params += "&active=true"
    elif args.inactive:
        params += "&active=false"

    result = api_request("GET", f"/workflows{params}")
    workflows = result.get("data", [])

    if not workflows:
        print("Keine Workflows gefunden.")
        return

    print(f"\n{'─' * 70}")
    print(f"  N8N Workflows auf {N8N_URL}")
    print(f"  Gefunden: {len(workflows)} Workflows")
    print(f"{'─' * 70}\n")

    # Tabellenformat
    fmt = "{:<6}  {:<35}  {:<10}  {}"
    print(fmt.format("ID", "Name", "Status", "Aktualisiert"))
    print("─" * 70)

    for wf in workflows:
        wf_id = str(wf.get("id", ""))
        name = wf.get("name", "(kein Name)")[:34]
        active = "AKTIV" if wf.get("active") else "inaktiv"
        updated = wf.get("updatedAt", "")[:10]  # Nur Datum
        print(fmt.format(wf_id, name, active, updated))

    print(f"\n{'─' * 70}")
    print(f"Gesamt: {len(workflows)} Workflows\n")

    if args.json:
        print("\nJSON Ausgabe:")
        print(json.dumps(workflows, indent=2, ensure_ascii=False))


def cmd_get(args):
    """Zeigt Details eines Workflows."""
    result = api_request("GET", f"/workflows/{args.id}")

    print(f"\n{'─' * 70}")
    print(f"  Workflow: {result.get('name')}")
    print(f"  ID:       {result.get('id')}")
    print(f"  Status:   {'AKTIV' if result.get('active') else 'inaktiv'}")
    print(f"  Erstellt: {result.get('createdAt', '')[:19]}")
    print(f"  Geändert: {result.get('updatedAt', '')[:19]}")
    print(f"{'─' * 70}\n")

    nodes = result.get("nodes", [])
    print(f"Nodes ({len(nodes)} gesamt):")
    for node in nodes:
        node_type = node.get("type", "").split(".")[-1]
        print(f"  • {node.get('name', '(kein Name)')} [{node_type}]")

    connections = result.get("connections", {})
    print(f"\nVerbindungen: {len(connections)} Quell-Nodes")

    if args.json:
        print(f"\n{'─' * 70}")
        print("Vollständiger JSON:")
        print(json.dumps(result, indent=2, ensure_ascii=False))


def cmd_export(args):
    """Exportiert einen Workflow als JSON-Datei."""
    result = api_request("GET", f"/workflows/{args.id}")

    name = result.get("name", f"workflow-{args.id}")
    # Dateiname bereinigen
    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in name)
    filename = args.output or f"{safe_name}_{args.id}.json"

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    print(f"Workflow exportiert: {filename}")
    print(f"  Name: {result.get('name')}")
    print(f"  ID:   {result.get('id')}")


def cmd_import(args):
    """Importiert einen Workflow aus einer JSON-Datei."""
    if not os.path.exists(args.file):
        print(f"Datei nicht gefunden: {args.file}")
        sys.exit(1)

    with open(args.file, "r", encoding="utf-8") as f:
        workflow_data = json.load(f)

    # ID entfernen für neuen Import (oder behalten für Update)
    wf_id = workflow_data.get("id")
    if wf_id and not args.new:
        # Update bestehenden Workflow
        result = api_request("PATCH", f"/workflows/{wf_id}", workflow_data)
        print(f"Workflow aktualisiert: {result.get('name')} (ID: {result.get('id')})")
    else:
        # Neuen Workflow erstellen
        workflow_data.pop("id", None)
        workflow_data.pop("createdAt", None)
        workflow_data.pop("updatedAt", None)
        result = api_request("POST", "/workflows", workflow_data)
        print(f"Neuer Workflow erstellt: {result.get('name')} (ID: {result.get('id')})")


def cmd_edit(args):
    """Öffnet einen Workflow im Editor zum Bearbeiten."""
    # Erst exportieren
    result = api_request("GET", f"/workflows/{args.id}")
    name = result.get("name", f"workflow-{args.id}")
    safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in name)
    tmp_file = f"/tmp/n8n_edit_{safe_name}_{args.id}.json"

    with open(tmp_file, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2, ensure_ascii=False)

    editor = os.environ.get("EDITOR", "nano")
    print(f"Öffne Workflow '{name}' in {editor}...")
    print(f"Datei: {tmp_file}")
    subprocess.call([editor, tmp_file])

    # Nach Bearbeitung hochladen?
    answer = input("\nÄnderungen hochladen? [j/N] ").strip().lower()
    if answer in ("j", "ja", "y", "yes"):
        with open(tmp_file, "r", encoding="utf-8") as f:
            updated_data = json.load(f)
        result = api_request("PATCH", f"/workflows/{args.id}", updated_data)
        print(f"Workflow aktualisiert: {result.get('name')} (ID: {result.get('id')})")
    else:
        print("Keine Änderungen gespeichert.")
        print(f"Datei bleibt unter: {tmp_file}")


def cmd_activate(args):
    """Aktiviert oder deaktiviert einen Workflow."""
    action = "activate" if args.on else "deactivate"
    result = api_request("POST", f"/workflows/{args.id}/{action}")
    status = "AKTIVIERT" if result.get("active") else "deaktiviert"
    print(f"Workflow '{result.get('name')}' ist jetzt {status}.")


# ─── CLI Parser ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="N8N Workflow Manager - Workflows verwalten via API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Beispiele:
  python3 workflow-manager.py list
  python3 workflow-manager.py list --active
  python3 workflow-manager.py get 42
  python3 workflow-manager.py edit 42
  python3 workflow-manager.py export 42
  python3 workflow-manager.py export 42 -o mein-workflow.json
  python3 workflow-manager.py import mein-workflow.json
  python3 workflow-manager.py activate 42
  python3 workflow-manager.py deactivate 42

Konfiguration:
  export N8N_URL="https://n8n.werbeportalnrw.de"
  export N8N_API_KEY="dein-api-key"
        """,
    )

    sub = parser.add_subparsers(dest="command", required=True)

    # list
    p_list = sub.add_parser("list", help="Alle Workflows auflisten")
    p_list.add_argument("--active", action="store_true", help="Nur aktive Workflows")
    p_list.add_argument("--inactive", action="store_true", help="Nur inaktive Workflows")
    p_list.add_argument("--json", action="store_true", help="JSON-Ausgabe")

    # get
    p_get = sub.add_parser("get", help="Workflow-Details anzeigen")
    p_get.add_argument("id", help="Workflow-ID")
    p_get.add_argument("--json", action="store_true", help="Vollständiger JSON")

    # edit
    p_edit = sub.add_parser("edit", help="Workflow im Editor bearbeiten")
    p_edit.add_argument("id", help="Workflow-ID")

    # export
    p_export = sub.add_parser("export", help="Workflow als JSON exportieren")
    p_export.add_argument("id", help="Workflow-ID")
    p_export.add_argument("-o", "--output", help="Ausgabedatei (Standard: <name>_<id>.json)")

    # import
    p_import = sub.add_parser("import", help="Workflow aus JSON-Datei importieren")
    p_import.add_argument("file", help="JSON-Datei")
    p_import.add_argument("--new", action="store_true", help="Immer als neuen Workflow importieren")

    # activate / deactivate
    p_on = sub.add_parser("activate", help="Workflow aktivieren")
    p_on.add_argument("id", help="Workflow-ID")
    p_on.set_defaults(on=True)

    p_off = sub.add_parser("deactivate", help="Workflow deaktivieren")
    p_off.add_argument("id", help="Workflow-ID")
    p_off.set_defaults(on=False)

    args = parser.parse_args()

    # Konfig prüfen
    if N8N_URL:
        pass  # URL hat Default-Wert

    dispatch = {
        "list": cmd_list,
        "get": cmd_get,
        "edit": cmd_edit,
        "export": cmd_export,
        "import": cmd_import,
        "activate": cmd_activate,
        "deactivate": cmd_activate,
    }

    dispatch[args.command](args)


if __name__ == "__main__":
    main()
