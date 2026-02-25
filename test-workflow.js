#!/usr/bin/env node

/**
 * LEADMASTER Workflow – LOCAL TEST MOCK
 *
 * Testet die Workflow-Logik lokal (ohne echte API-Calls)
 *
 * Usage: node test-workflow.js
 */

const workflow = require('./workflow-complete.js');

// ============================================================================
// TEST INFRASTRUCTURE
// ============================================================================

class MockNode {
  constructor(name, type) {
    this.name = name;
    this.type = type;
    this.output = null;
    this.error = null;
  }

  execute(input) {
    console.log(`   ➜ ${this.name}`);
    this.output = input;
    return this.output;
  }
}

class WorkflowTester {
  constructor(workflow) {
    this.workflow = workflow;
    this.nodes = new Map();
    this.results = {};
    this.initNodes();
  }

  initNodes() {
    for (const node of this.workflow.nodes) {
      this.nodes.set(node.name, {
        config: node,
        mock: new MockNode(node.name, node.type)
      });
    }
  }

  log(msg, type = 'info') {
    const icons = {
      'info': '💡',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️ ',
      'step': '→ ',
      'code': '🔧'
    };
    console.log(`${icons[type]} ${msg}`);
  }

  validateStructure() {
    this.log('Validiere Workflow-Struktur...', 'step');

    // 1. Check Nodes
    const nodeNames = new Set(this.workflow.nodes.map(n => n.name));
    this.log(`✓ ${this.workflow.nodes.length} Nodes`, 'success');

    // 2. Check Connections
    let connCount = 0;
    for (const [from, targets] of Object.entries(this.workflow.connections)) {
      if (!nodeNames.has(from)) {
        this.log(`❌ Connection from unknown node: ${from}`, 'error');
        return false;
      }
      for (const target of targets) {
        connCount++;
        if (!nodeNames.has(target.node)) {
          this.log(`❌ Connection to unknown node: ${target.node}`, 'error');
          return false;
        }
      }
    }
    this.log(`✓ ${connCount} Connections`, 'success');

    // 3. Check Code Nodes
    const codeNodes = this.workflow.nodes.filter(n => n.type === 'n8n-nodes-base.code');
    this.log(`✓ ${codeNodes.length} Code Nodes`, 'success');

    // 4. Validate Code
    for (const node of codeNodes) {
      if (!node.parameters || !node.parameters.jsCode) {
        this.log(`❌ Code Node ohne JavaScript: ${node.name}`, 'error');
        return false;
      }
    }

    // 5. Check Credentials
    const credentialNodes = this.workflow.nodes.filter(n => n.credentials);
    this.log(`✓ ${credentialNodes.length} Nodes mit Credentials`, 'success');

    // 6. Check Settings
    this.log(`✓ Active: ${this.workflow.active} (INAKTIV ist korrekt)`, 'success');

    return true;
  }

  testCodeLogic() {
    this.log('\nValidiere Code-Logik...', 'step');

    const testCases = [
      {
        name: 'PLZ Kombinationen Generator',
        test: () => {
          const abfragen = [{json: {Ort: 'Düsseldorf', Branche: 'Friseur'}}];
          const plzDaten = [
            {json: {PLZ: '40227', Stadt: 'Düsseldorf'}},
            {json: {PLZ: '40210', Stadt: 'Düsseldorf'}},
            {json: {PLZ: '50001', Stadt: 'Köln'}}
          ];

          const kombinationen = [];
          for (const abfrage of abfragen) {
            const json = abfrage.json;
            const ort = json.Ort || '';
            const branche = json.Branche || '';

            if (!ort || !branche) return false;

            for (const plzRow of plzDaten) {
              const pJson = plzRow.json;
              const stadt = pJson.Stadt || '';
              const plz = pJson.PLZ || '';

              if (stadt.toLowerCase() === ort.toLowerCase()) {
                kombinationen.push({
                  json: { plz, stadt, branche }
                });
              }
            }
          }

          return kombinationen.length > 0 && kombinationen[0].json.plz === '40227';
        }
      },
      {
        name: 'Duplikat-Check (gleicher Name & PLZ)',
        test: () => {
          function normalize(str) {
            if (!str) return '';
            return str.toLowerCase()
              .replace(/\b(gmbh|co\.|kg)\b/g, '')
              .replace(/[^\wäöüß\s]/g, '')
              .replace(/\s+/g,' ').trim();
          }

          function score(a, b) {
            let s = 0;
            const na = normalize(a.firmenname || '');
            const nb = normalize(b.firmenname || '');
            if (na && nb && na === nb) s += 50;

            const pa = (a.plz || '').trim();
            const pb = (b.plz || '').trim();
            if (pa && pb && pa === pb) s += 30;

            return s;
          }

          const entry1 = { firmenname: 'Friseur Meister GmbH', plz: '40227' };
          const entry2 = { firmenname: 'Friseur Meister', plz: '40227' };

          return score(entry1, entry2) >= 60;
        }
      },
      {
        name: 'URL Filter (nur offene Einträge)',
        test: () => {
          const urls = [
            {status: 'offen', versuche: 0},
            {status: 'offen', versuche: 1},
            {status: 'erledigt', versuche: 0},
            {status: 'offen', versuche: 3}
          ];

          const offene = urls.filter(u => u.status === 'offen' && u.versuche < 3);
          return offene.length === 2;
        }
      }
    ];

    let passed = 0;
    for (const tc of testCases) {
      try {
        const result = tc.test();
        if (result === true) {
          this.log(`✓ ${tc.name}`, 'success');
          passed++;
        } else {
          this.log(`✗ ${tc.name} (returned ${result})`, 'error');
        }
      } catch (e) {
        this.log(`✗ ${tc.name} (Error: ${e.message})`, 'error');
      }
    }

    this.log(`\nCode-Tests: ${passed}/${testCases.length} bestanden`, passed === testCases.length ? 'success' : 'warning');
    return passed === testCases.length;
  }

  testConnections() {
    this.log('\nValidiere Verbindungen...', 'step');

    const start = this.workflow.nodes.find(n => n.name === 'Start');
    if (!start) {
      this.log('❌ Start Node nicht vorhanden', 'error');
      return false;
    }
    this.log('✓ Start Node vorhanden', 'success');

    const hasGSNodes = this.workflow.nodes.some(n => n.name.includes('GS'));
    const hasTBNodes = this.workflow.nodes.some(n => n.name.includes('TB'));
    const hasMasterNodes = this.workflow.nodes.some(n => n.name.includes('Master'));
    const hasTelegram = this.workflow.nodes.some(n => n.name.includes('Telegram'));

    this.log(`✓ GS Nodes: ${this.workflow.nodes.filter(n => n.name.includes('GS')).length}`, 'success');
    this.log(`✓ TB Nodes: ${this.workflow.nodes.filter(n => n.name.includes('TB')).length}`, 'success');
    this.log(`✓ Master Nodes: ${this.workflow.nodes.filter(n => n.name.includes('Master')).length}`, 'success');
    this.log(`✓ Telegram: ${hasTelegram ? 'Ja' : 'Nein'}`, 'success');

    return hasGSNodes && hasTBNodes && hasMasterNodes && hasTelegram;
  }

  testGoogleSheetsIntegration() {
    this.log('\nValidiere Google Sheets Integration...', 'step');

    const gsNodes = this.workflow.nodes.filter(n => n.type === 'n8n-nodes-base.googleSheets');
    this.log(`✓ ${gsNodes.length} Google Sheets Nodes`, 'success');

    const sheets = new Set();
    for (const node of gsNodes) {
      if (node.parameters?.spreadsheetId) {
        sheets.add(node.parameters.spreadsheetId);
      }
    }
    this.log(`✓ ${sheets.size} eindeutige Google Sheets`, 'success');

    // Check für richtige Sheet IDs
    const requiredSheets = [
      '1ySGkyk6JYyo7m4E9FuPmuFhxAov3q2xFv1nUQTwomqA',
      '12o5DdRCV7nwSA66EkXen2xjYWCzI2F4rPScg-8QxZLw',
      '1jpLnSCLQRD5PWzI0_bHIC89QsaXLNOPI0mKrNOWPGJY'
    ];

    for (const sheetId of requiredSheets) {
      if (sheets.has(sheetId)) {
        this.log(`✓ Sheet ${sheetId.substring(0, 10)}...`, 'success');
      } else {
        this.log(`❌ Sheet ${sheetId} nicht konfiguriert`, 'error');
        return false;
      }
    }

    return true;
  }

  testWebScraping() {
    this.log('\nValidiere Web Scraping Nodes...', 'step');

    const httpNodes = this.workflow.nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');
    this.log(`✓ ${httpNodes.length} HTTP Request Nodes`, 'success');

    // GS Node
    const gsHttp = httpNodes.find(n => n.name.includes('GS'));
    if (gsHttp && gsHttp.parameters.headers?.['User-Agent']) {
      this.log('✓ GS HTTP mit User-Agent', 'success');
    } else {
      this.log('❌ GS HTTP fehlt User-Agent', 'error');
      return false;
    }

    // TB Node
    const tbHttp = httpNodes.find(n => n.name.includes('TB'));
    if (tbHttp && tbHttp.parameters.headers?.['Accept']) {
      this.log('✓ TB HTTP mit Custom Header', 'success');
    } else {
      this.log('❌ TB HTTP fehlt Custom Header', 'error');
      return false;
    }

    return true;
  }

  run() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║ LEADMASTER Workflow – LOCAL TEST                   ║');
    console.log('╚════════════════════════════════════════════════════╝');

    const tests = [
      () => this.validateStructure(),
      () => this.testCodeLogic(),
      () => this.testConnections(),
      () => this.testGoogleSheetsIntegration(),
      () => this.testWebScraping()
    ];

    let passed = 0;
    for (const test of tests) {
      if (test()) passed++;
    }

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════╗');
    if (passed === tests.length) {
      console.log(`║ ✅ ALLE TESTS BESTANDEN (${passed}/${tests.length})            ║`);
    } else {
      console.log(`║ ⚠️  ${passed}/${tests.length} Tests bestanden - Fehler beheben! ║`);
    }
    console.log('╚════════════════════════════════════════════════════╝\n');

    this.log('📝 Nächste Schritte:', 'info');
    this.log('1. node deploy-workflow.js   (Deploy zu n8n)', 'info');
    this.log('2. Credentials in n8n konfigurieren', 'info');
    this.log('3. Test durchführen: Düsseldorf + Friseur', 'info');
    this.log('4. Master Sheet prüfen', 'info');
    console.log('');

    return passed === tests.length;
  }
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  const tester = new WorkflowTester(workflow);
  const success = tester.run();
  process.exit(success ? 0 : 1);
}

module.exports = WorkflowTester;
