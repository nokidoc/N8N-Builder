#!/usr/bin/env node

/**
 * 🚀 LEADMASTER Workflow Deployer via n8n-mcp
 * Deployed den Workflow direkt zu n8n über den lokalen MCP
 */

const https = require('https');
const fs = require('fs');

// Workflow laden
const workflow = JSON.parse(fs.readFileSync('./leadmaster-workflow.json', 'utf8'));

const API_CONFIG = {
  hostname: 'n8n.werbeportalnrw.de',
  port: 443,
  api_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ZTBmZTcxNi02YmJmLTRhYmUtOTAyMi1hZjQzOTBjZWVmNDciLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODRhNDc2ZGYtMTI2MC00MzZmLTgzNmYtNDIyNGY1ODRlOTRiIiwiaWF0IjoxNzcwOTMxMjczfQ.gzIxF9gccBGV4hv5QNyuqBPHjKSxW8tTHE57vlUn7Jk'
};

console.log('🚀 LEADMASTER Workflow Deployer\n');
console.log('📦 Workflow:', workflow.name);
console.log('📊 Nodes:', workflow.nodes ? workflow.nodes.length : 0);
console.log('🔗 Connections:', workflow.connections ? workflow.connections.length : 0);
console.log('');

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
    // 1. Workflow erstellen
    console.log('⏳ Creating workflow on n8n...');

    const createResponse = await apiRequest('POST', '/workflows', {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      active: false,
      tags: workflow.tags || ['leadmaster', 'scraper']
    });

    if (createResponse.status !== 200) {
      console.log('❌ Failed to create workflow');
      console.log('Status:', createResponse.status);
      console.log('Response:', createResponse.data);
      process.exit(1);
    }

    const workflowId = createResponse.data.id;
    console.log('✅ Workflow created! ID:', workflowId);
    console.log('');

    // 2. Workflow Update mit vollständigen Daten
    console.log('⏳ Updating workflow with complete configuration...');

    const updateResponse = await apiRequest('PATCH', `/workflows/${workflowId}`, {
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings || {},
      staticData: workflow.staticData || {}
    });

    if (updateResponse.status !== 200) {
      console.log('⚠️  Warning: Could not fully update workflow');
      console.log('Status:', updateResponse.status);
    } else {
      console.log('✅ Workflow updated with full configuration');
    }

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║              ✅ DEPLOYMENT SUCCESSFUL                      ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log('║ Workflow: LEADMASTER – PLZ Scraper (GS + TB)              ║');
    console.log('║ Status: Created (Inactive)                                ║');
    console.log('║                                                            ║');
    console.log('║ 📋 Next Steps:                                            ║');
    console.log('║   1. Go to: https://n8n.werbeportalnrw.de                 ║');
    console.log('║   2. Find the workflow in the Workflows tab               ║');
    console.log('║   3. Click it and activate: Settings → Active: ON         ║');
    console.log('║   4. Test run: Execute Workflow                           ║');
    console.log('║   5. Check Telegram: @JK_N8NWorkflow_Bot                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

  } catch (error) {
    console.error('❌ Deployment error:', error.message);
    process.exit(1);
  }
}

deploy();
