#!/bin/bash

###############################################################################
# 🚀 LEADMASTER Workflow - Quick Deploy Script
#
# Verwendung:
#   chmod +x deploy-now.sh
#   ./deploy-now.sh
#
# Dieser Script deployed den LEADMASTER Workflow direkt zu n8n
###############################################################################

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🚀 LEADMASTER Workflow Deployer                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# 1. Umgebungsvariablen laden
# ============================================================================

export N8N_API_URL="https://n8n.werbeportalnrw.de/api/v1"
export N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ZTBmZTcxNi02YmJmLTRhYmUtOTAyMi1hZjQzOTBjZWVmNDciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRhNDc2ZGYtMTI2MC00MzZmLTgzNmYtNDIyNGY1ODRlOTRiIiwiaWF0IjoxNzcwOTMxMjczfQ.gzIxF9gccBGV4hv5QNyuqBPHjKSxW8tTHE57vlUn7Jk"

echo "💡 N8N_API_URL: $N8N_API_URL"
echo "💡 API Key: ${N8N_API_KEY:0:20}..."
echo ""

# ============================================================================
# 2. Workflow-Datei überprüfen
# ============================================================================

if [ ! -f "leadmaster-workflow.json" ]; then
  echo "❌ Fehler: leadmaster-workflow.json nicht gefunden!"
  echo "   Bitte stelle sicher, dass du im Projekt-Verzeichnis bist."
  exit 1
fi

echo "✅ Workflow-Datei gefunden: leadmaster-workflow.json"
NODES=$(grep -o '"type"' leadmaster-workflow.json | wc -l)
echo "📊 Nodes in Workflow: $NODES"
echo ""

# ============================================================================
# 3. Deploy ausführen
# ============================================================================

echo "⏳ Deploye Workflow zu n8n..."
echo ""

node deploy-workflow.js

echo ""
echo "✅ Deployment abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo "   1. Öffne: https://n8n.werbeportalnrw.de"
echo "   2. Finde den Workflow: 'LEADMASTER – PLZ Scraper (GS + TB)'"
echo "   3. Aktiviere ihn: Settings → Active: ON"
echo "   4. Teste ihn: 'Execute Workflow'"
echo ""
echo "💬 Telegram-Benachrichtigungen: @JK_N8NWorkflow_Bot"
echo ""
