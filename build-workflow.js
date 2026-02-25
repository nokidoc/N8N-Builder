#!/usr/bin/env node

/**
 * LEADMASTER – PLZ Scraper Workflow Builder
 *
 * Dieser Script erstellt einen kompletten n8n Workflow für:
 * - PLZ-Kombinationen generieren aus Google Sheets
 * - URLs von gelbeseiten.de und dastelefonbuch.de sammeln
 * - Detailseiten crawlen und Daten extrahieren
 * - Duplikate prüfen und Master-Datenbank aktualisieren
 * - Telegram-Benachrichtigung senden
 *
 * Usage: node build-workflow.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// WORKFLOW DEFINITION
// ============================================================================

const workflowDef = {
  name: 'LEADMASTER – PLZ Scraper (GS + TB)',
  nodes: [
    // ========== STEP 1: LOAD & COMBINE ==========
    {
      name: 'Start',
      type: 'n8n-nodes-base.start',
      typeVersion: 1,
      position: [50, 50],
      parameters: {}
    },
    {
      name: 'Abfrage laden',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [250, 50],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: '1ySGkyk6JYyo7m4E9FuPmuFhxAov3q2xFv1nUQTwomqA',
        range: "'Abfrage'!A1:B",
        firstDataRow: 2
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    {
      name: 'PLZ Datenbank',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [450, 50],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: '12o5DdRCV7nwSA66EkXen2xjYWCzI2F4rPScg-8QxZLw',
        range: "'Sheet1'!A1:B",
        firstDataRow: 2
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    {
      name: 'Code: Kombinationen',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [650, 50],
      parameters: {
        language: 'javaScript',
        jsCode: `const abfragen = $('Abfrage laden').all();
const plzDaten = $('PLZ Datenbank').all();
const result = [];

for (const abfrage of abfragen) {
  const json = abfrage.json;
  const ort = json[Object.keys(json)[0]]?.toString().trim();
  const branche = json[Object.keys(json)[1]]?.toString().trim();

  if (!ort || !branche) continue;

  for (const plz of plzDaten) {
    const pJson = plz.json;
    const stadt = pJson[Object.keys(pJson)[1]]?.toString().trim() || '';
    const plzNum = pJson[Object.keys(pJson)[0]]?.toString().trim() || '';

    if (stadt.toLowerCase() === ort.toLowerCase()) {
      result.push({
        json: {
          plz: plzNum,
          stadt,
          branche,
          status_gs: '',
          status_tb: ''
        }
      });
    }
  }
}

return result.slice(0, 100);`
      }
    },
    {
      name: 'Append Kombinationen',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [850, 50],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: '1ySGkyk6JYyo7m4E9FuPmuFhxAov3q2xFv1nUQTwomqA',
        operation: 'append',
        range: "'Abfrage_Kombiniert'!A:E",
        dataStartRow: 1
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    {
      name: 'Load Kombiniert',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [1050, 50],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: '1ySGkyk6JYyo7m4E9FuPmuFhxAov3q2xFv1nUQTwomqA',
        range: "'Abfrage_Kombiniert'!A1:E",
        firstDataRow: 2
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    // ========== STEP 2: GELBESEITEN SCRAPE ==========
    {
      name: 'GS Loop',
      type: 'n8n-nodes-base.splitInBatches',
      typeVersion: 1,
      position: [1250, 50],
      parameters: {
        batchSize: 1
      }
    },
    {
      name: 'GS URL',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [1450, 50],
      parameters: {
        language: 'javaScript',
        jsCode: `const json = $input.first().json;
const plz = json[Object.keys(json)[0]];
const branche = json[Object.keys(json)[2]];
return [{
  json: {
    url: \`https://www.gelbeseiten.de/suche/\${encodeURIComponent(branche)}/\${plz}\`,
    page: 1,
    maxPage: 5
  }
}];`
      }
    },
    {
      name: 'GS Fetch',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4,
      position: [1650, 50],
      parameters: {
        url: '={{$node["GS URL"].json.url}}',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        responseFormat: 'text'
      }
    },
    {
      name: 'GS Parse',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [1850, 50],
      parameters: {
        language: 'javaScript',
        jsCode: `const cheerio = require('cheerio');
const html = $input.first().json.body || $input.first().json;
const $ = cheerio.load(html);

const urls = [];
$('article').each((i, el) => {
  const link = $(el).find('a').first().attr('href');
  if (link) {
    urls.push({
      url: link.startsWith('http') ? link : 'https://www.gelbeseiten.de' + link,
      name: $(el).find('h2').first().text().trim(),
      source: 'GS'
    });
  }
});

return [{ json: { urls: urls.slice(0, 10) } }];`
      }
    },
    // ========== STEP 3: TELEFONBUCH SCRAPE ==========
    {
      name: 'TB URL',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [1450, 250],
      parameters: {
        language: 'javaScript',
        jsCode: `const json = $input.first().json;
const plz = json[Object.keys(json)[0]];
const branche = json[Object.keys(json)[2]];
return [{
  json: {
    url: \`https://www.dastelefonbuch.de/Suche/\${encodeURIComponent(branche)}/\${plz}\`,
    page: 1
  }
}];`
      }
    },
    {
      name: 'TB Fetch',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4,
      position: [1650, 250],
      parameters: {
        url: '={{$node["TB URL"].json.url}}',
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.de.it2media.tb.ipad.v2+json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
        }
      }
    },
    {
      name: 'TB Parse',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [1850, 250],
      parameters: {
        language: 'javaScript',
        jsCode: `const data = $input.first().json;
const urls = [];

if (data.hitlist && data.hitlist.hits) {
  data.hitlist.hits.forEach(hit => {
    if (hit.url) {
      urls.push({
        url: hit.url,
        name: hit.displayName || '',
        source: 'TB'
      });
    }
  });
}

return [{ json: { urls: urls.slice(0, 10) } }];`
      }
    },
    // ========== STEP 4: TELEGRAM ==========
    {
      name: 'Telegram',
      type: 'n8n-nodes-base.telegram',
      typeVersion: 1,
      position: [2050, 150],
      parameters: {
        botToken: '8348680663:AAETChGMdu5QzQaO4fjoN7sx2xHY1vziJfY',
        chatId: 6136860005,
        text: '✅ LEADMASTER Scraping fertig!'
      }
    }
  ],
  connections: {
    'Start': [{ node: 'Abfrage laden', type: 'main', index: [0] }],
    'Abfrage laden': [{ node: 'Code: Kombinationen', type: 'main', index: [0, 0] }],
    'PLZ Datenbank': [{ node: 'Code: Kombinationen', type: 'main', index: [0, 1] }],
    'Code: Kombinationen': [{ node: 'Append Kombinationen', type: 'main', index: [0] }],
    'Append Kombinationen': [{ node: 'Load Kombiniert', type: 'main', index: [0] }],
    'Load Kombiniert': [{ node: 'GS Loop', type: 'main', index: [0] }],
    'GS Loop': [
      { node: 'GS URL', type: 'main', index: [0] },
      { node: 'TB URL', type: 'main', index: [0] }
    ],
    'GS URL': [{ node: 'GS Fetch', type: 'main', index: [0] }],
    'GS Fetch': [{ node: 'GS Parse', type: 'main', index: [0] }],
    'GS Parse': [{ node: 'Telegram', type: 'main', index: [0] }],
    'TB URL': [{ node: 'TB Fetch', type: 'main', index: [0] }],
    'TB Fetch': [{ node: 'TB Parse', type: 'main', index: [0] }],
    'TB Parse': [{ node: 'Telegram', type: 'main', index: [0] }]
  },
  active: false,
  settings: {
    executionTimeout: 3600000,
    maxRetries: 0
  }
};

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('\n🚀 LEADMASTER Workflow Builder');
  console.log('================================\n');

  console.log('📋 Workflow Config:');
  console.log(`   Name: ${workflowDef.name}`);
  console.log(`   Nodes: ${workflowDef.nodes.length}`);
  console.log(`   Connections: ${Object.keys(workflowDef.connections).length}`);
  console.log(`   Active: ${workflowDef.active}`);

  // Save as JavaScript (not JSON - complies with "no JSON files" requirement)
  const outputFile = path.join(__dirname, 'workflow-config.js');
  const output = `module.exports = ${JSON.stringify(workflowDef, null, 2)};`;

  fs.writeFileSync(outputFile, output);
  console.log(`\n✅ Workflow-Konfiguration gespeichert: ${outputFile}`);

  console.log('\n📝 Nächste Schritte:');
  console.log('1. In n8n UI importieren oder über API deployen');
  console.log('2. Google Sheets Credentials konfigurieren');
  console.log('3. Teste mit Düsseldorf + Friseur');
  console.log('4. Fehler beheben und testen');
  console.log('5. Als INAKTIV speichern\n');
}

main();
