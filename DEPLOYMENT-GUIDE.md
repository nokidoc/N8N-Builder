# 🚀 LEADMASTER Workflow - Deployment Guide

## Status
✅ **Workflow ist READY zum Deployment**

---

## Option 1: Automatischer Deploy (Empfohlen)

### Schritt 1: SSH auf deinen Hetzner Server
```bash
ssh root@46.224.118.95
```
Passwort: `Tinte123!`

### Schritt 2: Zum Projekt-Verzeichnis gehen
```bash
cd /home/user/N8N-Builder
# oder falls dort nicht vorhanden:
cd ~/N8N-Builder
```

### Schritt 3: Deploy-Script ausführen
```bash
export N8N_API_URL="https://n8n.werbeportalnrw.de/api/v1"
export N8N_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ZTBmZTcxNi02YmJmLTRhYmUtOTAyMi1hZjQzOTBjZWVmNDciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRhNDc2ZGYtMTI2MC00MzZmLTgzNmYtNDIyNGY1ODRlOTRiIiwiaWF0IjoxNzcwOTMxMjczfQ.gzIxF9gccBGV4hv5QNyuqBPHjKSxW8tTHE57vlUn7Jk"

node deploy-workflow.js
```

Erwartet: ✅ Deployment erfolgreich

---

## Option 2: Manueller Import in n8n UI

### Schritt 1: Workflow-JSON herunterladen
```bash
cat > /tmp/leadmaster-workflow.json << 'EOF'
[WORKFLOW_JSON_HIER]
EOF
```

### Schritt 2: n8n öffnen
- Gehe zu: https://n8n.werbeportalnrw.de
- Login mit deinen Credentials

### Schritt 3: Workflow importieren
- Klick auf "Workflows" → "Import"
- Paste die JSON-Datei

---

## Workflow Details

| Eigenschaft | Wert |
|---|---|
| **Name** | LEADMASTER – PLZ Scraper (GS + TB) |
| **Nodes** | 32 |
| **Connections** | 29 |
| **Status** | Inaktiv (muss aktiviert werden) |
| **Timeout** | 60 Minuten |

### Benötigte Credentials:
- ✅ Google OAuth2 (für Google Sheets)
- ✅ Telegram Bot Token
- ✅ Browserless Chrome (optional für Web Scraping)

---

## Nach dem Deployment

### 1. Workflow aktivieren
- Im n8n UI: Settings → Active: `ON`

### 2. Test durchführen
- Manuell ausführen: "Execute Workflow"
- Prüfe die Telegram-Benachrichtigung: `@JK_N8NWorkflow_Bot`

### 3. Schedule konfigurieren (Optional)
- Im n8n UI: Settings → Trigger → Cron Expression
- Beispiel: `0 2 * * *` (täglich um 2 Uhr)

---

## Fehlerbehandlung

### "Credential not found"
→ Google OAuth2 in n8n konfigurieren

### "Telegram: Chat not found"
→ Chat ID überprüfen (sollte: `6136860005`)

### "Connection timeout bei Scraping"
→ Browserless-Service überprüfen: `http://46.224.118.95:3000`

---

## Support
Bei Problemen: Telegram Bot `@JK_N8NWorkflow_Bot`
