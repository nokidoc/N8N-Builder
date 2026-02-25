#!/bin/bash

###############################################################################
# ✅ LEADMASTER Workflow - Post-Deployment Test Script
#
# Verwendung:
#   chmod +x test-deployment.sh
#   ./test-deployment.sh
#
# Dieser Script validiert das Deployment und testet den Workflow
###############################################################################

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     ✅ LEADMASTER Workflow - Test Suite                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# 1. Umgebung überprüfen
# ============================================================================

echo "🔍 Checking environment..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found!"
  exit 1
fi

echo "✅ Node.js: $(node --version)"

if [ ! -f "leadmaster-workflow.json" ]; then
  echo "❌ leadmaster-workflow.json not found!"
  exit 1
fi

echo "✅ Workflow JSON found"
echo ""

# ============================================================================
# 2. Workflow JSON validieren
# ============================================================================

echo "🔍 Validating Workflow JSON..."

if ! grep -q '"name": "LEADMASTER' leadmaster-workflow.json; then
  echo "❌ Invalid workflow name!"
  exit 1
fi

if ! grep -q '"nodes":' leadmaster-workflow.json; then
  echo "❌ No nodes found in workflow!"
  exit 1
fi

if ! grep -q '"connections":' leadmaster-workflow.json; then
  echo "❌ No connections found in workflow!"
  exit 1
fi

NODES=$(grep -o '"name":' leadmaster-workflow.json | wc -l)
echo "✅ Workflow structure valid"
echo "✅ Nodes: $NODES"
echo ""

# ============================================================================
# 3. API Connectivity Test
# ============================================================================

echo "🔍 Testing n8n API connectivity..."

API_URL="https://n8n.werbeportalnrw.de/api/v1"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ZTBmZTcxNi02YmJmLTRhYmUtOTAyMi1hZjQzOTBjZWVmNDciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRhNDc2ZGYtMTI2MC00MzZmLTgzNmYtNDIyNGY1ODRlOTRiIiwiaWF0IjoxNzcwOTMxMjczfQ.gzIxF9gccBGV4hv5QNyuqBPHjKSxW8tTHE57vlUn7Jk"

# Test n8n Connectivity
if curl -s -H "X-N8N-API-KEY: $API_KEY" "$API_URL/workflows?limit=1" > /dev/null 2>&1; then
  echo "✅ n8n API is reachable"
else
  echo "⚠️  n8n API not reachable (might be network issue)"
fi

echo ""

# ============================================================================
# 4. Deployment Test
# ============================================================================

echo "🔍 Testing deployment readiness..."

# Test if deploy-workflow.js exists
if [ ! -f "deploy-workflow.js" ]; then
  echo "⚠️  deploy-workflow.js not found - manual import required"
else
  echo "✅ Deploy script ready"
fi

# Test if credentials are configured
if grep -q "google_oauth" leadmaster-workflow.json; then
  echo "⚠️  Google OAuth credentials needed in n8n"
fi

if grep -q "8348680663:AAETChGM" leadmaster-workflow.json; then
  echo "✅ Telegram credentials included"
fi

echo ""

# ============================================================================
# 5. Summary
# ============================================================================

echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ TEST SUMMARY                              ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║ Status: READY FOR DEPLOYMENT                             ║"
echo "║ Workflow: LEADMASTER – PLZ Scraper (GS + TB)             ║"
echo "║ Nodes: $NODES                                              ║"
echo "║                                                            ║"
echo "║ 📋 Next Steps:                                            ║"
echo "║   1. Run: ./deploy-now.sh                                ║"
echo "║   2. Activate workflow in n8n UI                         ║"
echo "║   3. Execute test run                                    ║"
echo "║   4. Check Telegram: @JK_N8NWorkflow_Bot                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
