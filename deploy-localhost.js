#!/usr/bin/env node

/**
 * 🚀 LEADMASTER Workflow Deployer - Localhost Version
 * Deployed den Workflow direkt zu lokalem n8n
 */

const http = require('http');
const fs = require('fs');

// Workflow laden
const workflow = JSON.parse(fs.readFileSync('./leadmaster-workflow.json', 'utf8'));

const API_CONFIG = {
  hostname: 'localhost',
  port: 5678,
  path: '/api/v1'
};

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     🚀 LEADMASTER Workflow Deployer (Localhost)            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📦 Workflow:', workflow.name);
console.log('📊 Nodes:', workflow.nodes ? workflow.nodes.length : 0);
console.log('🔗 Connections:', workflow.connections ? workflow.connections.length : 0);
console.log('🎯 Target: http://localhost:5678\n');

function apiRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_CONFIG.hostname,
      port: API_CONFIG.port,
      path: `${API_CONFIG.path}${path}`,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function deploy() {
  try {
    // 1. n8n Verbindung testen
    console.log('⏳ Testing n8n connection...');

    let connectionTest = await apiRequest('GET', '/workflows?limit=1');
    if (connectionTest.status === 401 || connectionTest.status === 200) {
      console.log('✅ n8n is reachable!\n');
    } else {
      console.log('⚠️  Unexpected response:', connectionTest.status);
    }

    // 2. Workflow erstellen
    console.log('⏳ Creating workflow...');

    const createPayload = {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      active: false,
      tags: workflow.tags || ['leadmaster', 'scraper']
    };

    const createResponse = await apiRequest('POST', '/workflows', createPayload);

    if (createResponse.status !== 200 && createResponse.status !== 201) {
      console.log('❌ Failed to create workflow');
      console.log('Status:', createResponse.status);
      console.log('Response:', JSON.stringify(createResponse.data, null, 2));
      process.exit(1);
    }

    const workflowId = createResponse.data.id;
    console.log('✅ Workflow created!');
    console.log('   ID:', workflowId);
    console.log('   URL: http://localhost:5678/workflow/' + workflowId);
    console.log('');

    // 3. Success Message
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ DEPLOYMENT SUCCESSFUL!                    ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║ Workflow: LEADMASTER – PLZ Scraper (GS + TB)              ║');
    console.log('║ Status: ✅ Created (Inactive)                             ║');
    console.log('║ Workflow ID: ' + workflowId);
    console.log('║                                                            ║');
    console.log('║ 📋 Next Steps:                                            ║');
    console.log('║   1. Go to: http://localhost:5678/workflow/' + workflowId);
    console.log('║   2. Click: Activate (toggle)                            ║');
    console.log('║   3. Test: Execute workflow                               ║');
    console.log('║   4. Check: Telegram notifications                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ Deployment error:', error.message);
    console.error('\n💡 Is n8n running on localhost:5678?');
    console.error('   Try: http://localhost:5678\n');
    process.exit(1);
  }
}

deploy();
