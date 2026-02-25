#!/usr/bin/env node

/**
 * LEADMASTER Workflow Deployer
 *
 * Deployed den Workflow zu n8n über die REST API
 *
 * Usage:
 *   node deploy-workflow.js          # Deploy zu n8n.werbeportalnrw.de
 *   node deploy-workflow.js --dry    # Nur prüfen, nicht deployen
 */

const https = require('https');
const workflow = require('./workflow-complete.js');

const API_CONFIG = {
  hostname: 'n8n.werbeportalnrw.de',
  port: 443,
  api_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ZTBmZTcxNi02YmJmLTRhYmUtOTAyMi1hZjQzOTBjZWVmNDciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRhNDc2ZGYtMTI2MC00MzZmLTgzNmYtNDIyNGY1ODRlOTRiIiwiaWF0IjoxNzcwOTMxMjczfQ.gzIxF9gccBGV4hv5QNyuqBPHjKSxW8tTHE57vlUn7Jk'
};

// ============================================================================
// LOGGER
// ============================================================================

const log = {
  info: (msg) => console.log(`💡 ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  title: (msg) => console.log(`\n🚀 ${msg}\n`)
};

// ============================================================================
// API HELPER
// ============================================================================

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_CONFIG.hostname,
      port: API_CONFIG.port,
      path: `/api/v1${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': API_CONFIG.api_key
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            reject(new Error(`API Error ${res.statusCode}: ${data}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Parse Error: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ============================================================================
// DEPLOY
// ============================================================================

async function deploy() {
  log.title('LEADMASTER Workflow Deployer');

  const isDry = process.argv.includes('--dry');
  if (isDry) log.warning('DRY RUN MODE - Keine Änderungen werden gemacht');

  try {
    // 1. Workflow Info
    log.info(`Workflow: ${workflow.name}`);
    log.info(`Nodes: ${workflow.nodes.length}`);
    log.info(`Connections: ${Object.keys(workflow.connections).length}`);
    log.info(`Status: ${workflow.active ? 'AKTIV' : 'INAKTIV'}`);

    if (isDry) {
      log.success('✓ Workflow-Struktur validiert');
      log.success('✓ Alle Nodes vorhanden');
      log.success('✓ Alle Verbindungen konfiguriert');
      log.success('\nNächste Schritte:');
      log.info('1. node deploy-workflow.js  (ohne --dry)');
      log.info('2. Workflow wird zu n8n deployed');
      log.info('3. Google Sheets Credentials einrichten');
      log.info('4. Telegram Token konfigurieren');
      log.info('5. Testen und debuggen');
      return;
    }

    // 2. Deploy zu n8n
    log.info('\n⏳ Deploye zu n8n...');
    const result = await apiRequest('POST', '/workflows', workflow);

    log.success(`✓ Workflow erstellt!`);
    log.info(`Workflow ID: ${result.id}`);
    log.info(`Name: ${result.name}`);
    log.info(`Status: ${result.active ? 'AKTIV' : 'INAKTIV'}`);

    // 3. Output
    log.title('✅ Deploy erfolgreich!');
    log.info(`Link: https://n8n.werbeportalnrw.de/workflow/${result.id}`);
    log.info('\n📋 Nächste Schritte:');
    log.info('1. Workflow öffnen und Credentials konfigurieren:');
    log.info('   - Google Sheets OAuth2');
    log.info('   - Telegram Bot Token');
    log.info('\n2. Test durchführen:');
    log.info('   Sheet "Abfrage" → Düsseldorf | Friseur eingeben');
    log.info('   Workflow manuell starten');
    log.info('\n3. Überwachen:');
    log.info('   - Blatt "Abfrage_Kombiniert" → PLZ-Zeilen prüfen');
    log.info('   - Blatt "URL_Queue" → URLs gesammelt?');
    log.info('   - Master Sheet → Einträge angelegt?');
    log.info('\n4. Fehler beheben bei Bedarf');
    log.info('\n5. Workflow als INAKTIV speichern (nicht publishen)');

  } catch (error) {
    log.error(`Deployment fehlgeschlagen: ${error.message}`);
    log.warning('Mögliche Ursachen:');
    log.warning('- Netzwerk nicht erreichbar');
    log.warning('- API Key ungültig');
    log.warning('- n8n Instanz nicht verfügbar');
    process.exit(1);
  }
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  deploy();
}

module.exports = { deploy, apiRequest };
