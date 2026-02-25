/**
 * LEADMASTER – PLZ Scraper Workflow – COMPLETE DEFINITION
 *
 * Kompletter n8n Workflow mit:
 * ✅ Schritt 1: Abfrage lesen & PLZ-Kombinationen
 * ✅ Schritt 2a: Gelbeseiten URLs sammeln
 * ✅ Schritt 2b: Telefonbuch URLs sammeln
 * ✅ Schritt 3: URL_Queue abarbeiten & Detailseiten crawlen
 * ✅ Schritt 4: Duplikat-Check, Master-Update & Telegram
 *
 * Dieses Modul wird von deploy.js importiert und zu n8n hochgeladen.
 */

const CONFIG = {
  // Google Sheets
  SHEETS: {
    ABFRAGE_QUEUE: '1ySGkyk6JYyo7m4E9FuPmuFhxAov3q2xFv1nUQTwomqA',
    PLZ_DB: '12o5DdRCV7nwSA66EkXen2xjYWCzI2F4rPScg-8QxZLw',
    MASTER: '1jpLnSCLQRD5PWzI0_bHIC89QsaXLNOPI0mKrNOWPGJY'
  },
  // Telegram
  TELEGRAM: {
    BOT_TOKEN: '8348680663:AAETChGMdu5QzQaO4fjoN7sx2xHY1vziJfY',
    CHAT_ID: 6136860005
  }
};

const workflow = {
  name: 'LEADMASTER – PLZ Scraper (GS + TB)',
  active: false,
  settings: {
    executionTimeout: 3600000,
    saveManualExecutions: true
  },
  nodes: [
    // ========================================================================
    // STEP 1: START & LOAD QUERY
    // ========================================================================
    {
      name: 'Start',
      type: 'n8n-nodes-base.start',
      typeVersion: 1,
      position: [50, 50],
      parameters: {}
    },
    {
      name: '1a. Abfrage laden',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [250, 50],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: CONFIG.SHEETS.ABFRAGE_QUEUE,
        range: "'Abfrage'!A1:B",
        firstDataRow: 2
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    {
      name: '1b. PLZ Datenbank laden',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [450, 50],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: CONFIG.SHEETS.PLZ_DB,
        range: "'Sheet1'!A1:B",
        firstDataRow: 2
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    {
      name: '1c. Code: PLZ Kombinationen',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [650, 50],
      parameters: {
        language: 'javaScript',
        jsCode: `const abfragen = $('1a. Abfrage laden').all();
const plzDaten = $('1b. PLZ Datenbank laden').all();
const kombinationen = [];

for (const abfrage of abfragen) {
  const json = abfrage.json;
  const keys = Object.keys(json);
  const ort = (json[keys[0]] || '').toString().trim();
  const branche = (json[keys[1]] || '').toString().trim();

  if (!ort || !branche || ort.toLowerCase() === 'ort') continue;

  for (const plzRow of plzDaten) {
    const pJson = plzRow.json;
    const pKeys = Object.keys(pJson);
    const stadt = (pJson[pKeys[1]] || '').toString().trim();
    const plz = (pJson[pKeys[0]] || '').toString().trim();

    if (stadt.toLowerCase() === ort.toLowerCase()) {
      kombinationen.push({
        json: {
          plz,
          stadt,
          branche,
          status_gs: '',
          status_tb: ''
        }
      });
    }
  }
}

return kombinationen.slice(0, 50);`
      }
    },
    {
      name: '1d. Kombinationen schreiben',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [850, 50],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: CONFIG.SHEETS.ABFRAGE_QUEUE,
        operation: 'append',
        range: "'Abfrage_Kombiniert'!A:E",
        dataStartRow: 1
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    {
      name: '1e. Kombinationen laden (aktiv)',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [1050, 50],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: CONFIG.SHEETS.ABFRAGE_QUEUE,
        range: "'Abfrage_Kombiniert'!A1:E",
        firstDataRow: 2
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    {
      name: '1f. Code: Filter offene',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [1250, 50],
      parameters: {
        language: 'javaScript',
        jsCode: `const items = $input.all();
return items.filter(item => {
  const json = item.json;
  const keys = Object.keys(json);
  const gsStatus = (json[keys[3]] || '').toString().trim();
  const tbStatus = (json[keys[4]] || '').toString().trim();
  return !gsStatus || !tbStatus;
});`
      }
    },
    // ========================================================================
    // STEP 2: GELBESEITEN SCRAPE
    // ========================================================================
    {
      name: '2a. Split Kombinationen',
      type: 'n8n-nodes-base.splitInBatches',
      typeVersion: 1,
      position: [1450, 50],
      parameters: {
        batchSize: 1
      }
    },
    {
      name: '2b. GS: URL bauen',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [250, 300],
      parameters: {
        language: 'javaScript',
        jsCode: `const json = $input.first().json;
const keys = Object.keys(json);
const plz = json[keys[0]];
const branche = json[keys[2]];
return [{
  json: {
    url: \`https://www.gelbeseiten.de/suche/\${encodeURIComponent(branche)}/\${plz}\`,
    plz,
    branche,
    page: 1,
    maxPage: 10
  }
}];`
      }
    },
    {
      name: '2c. GS: HTTP Request',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4,
      position: [450, 300],
      parameters: {
        url: '={{$node["2b. GS: URL bauen"].json.url}}?pageNum={{$node["2c. GS: HTTP Request"].json.page || 1}}',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9'
        },
        responseFormat: 'text'
      }
    },
    {
      name: '2d. GS: Parse URLs',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [650, 300],
      parameters: {
        language: 'javaScript',
        jsCode: `const cheerio = require('cheerio');
const html = $input.first().json.body || '';
const $ = cheerio.load(html);
const plz = $node['2b. GS: URL bauen'].json.plz;
const branche = $node['2b. GS: URL bauen'].json.branche;

const urls = [];
$('article').each((i, el) => {
  const link = $(el).find('a[href*="/gsp/"]').first().attr('href')
            || $(el).find('a[href*="-Y"]').first().attr('href')
            || $(el).find('h2 a').first().attr('href');
  if (!link) return;

  const url = link.startsWith('http') ? link : 'https://www.gelbeseiten.de' + link;
  const name = $(el).find('h2').first().text().trim();
  if (url && !urls.find(u => u.url === url)) {
    urls.push({
      url,
      firmenname_vorschau: name,
      plz,
      branche,
      quelle: 'GS',
      status: 'offen',
      versuche: 0
    });
  }
});

let maxPage = 1;
$('[class*="pagination"] a, .pagination a').each((i, el) => {
  const n = parseInt($(el).text().trim());
  if (!isNaN(n) && n > maxPage) maxPage = n;
});

return [{ json: { urls: urls.slice(0, 20), totalPages: Math.min(maxPage, 10) } }];`
      }
    },
    {
      name: '2e. GS: URLs append',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [850, 300],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: CONFIG.SHEETS.ABFRAGE_QUEUE,
        operation: 'append',
        range: "'URL_Queue'!A:G",
        dataStartRow: 1
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    // ========================================================================
    // STEP 3: TELEFONBUCH SCRAPE
    // ========================================================================
    {
      name: '3a. TB: URL bauen',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [250, 500],
      parameters: {
        language: 'javaScript',
        jsCode: `const json = $input.first().json;
const keys = Object.keys(json);
const plz = json[keys[0]];
const branche = json[keys[2]];
return [{
  json: {
    url: \`https://www.dastelefonbuch.de/Suche/\${encodeURIComponent(branche)}/\${plz}\`,
    plz,
    branche,
    page: 1
  }
}];`
      }
    },
    {
      name: '3b. TB: HTTP Request',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4,
      position: [450, 500],
      parameters: {
        url: '={{$node["3a. TB: URL bauen"].json.url}}/{{$node["3a. TB: URL bauen"].json.page || 1}}',
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.de.it2media.tb.ipad.v2+json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        }
      }
    },
    {
      name: '3c. TB: Parse URLs',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [650, 500],
      parameters: {
        language: 'javaScript',
        jsCode: `const data = $input.first().json;
const plz = $node['3a. TB: URL bauen'].json.plz;
const branche = $node['3a. TB: URL bauen'].json.branche;
const urls = [];

if (data.hitlist && Array.isArray(data.hitlist.hits)) {
  data.hitlist.hits.forEach(hit => {
    if (hit.url) {
      urls.push({
        url: hit.url,
        firmenname_vorschau: hit.displayName || '',
        plz,
        branche,
        quelle: 'TB',
        status: 'offen',
        versuche: 0
      });
    }
  });
}

const totalPages = data.hitlist ? Math.min(Math.ceil((data.hitlist.totalHitCount || 0) / (data.hitlist.pageLength || 20)), 10) : 1;
return [{ json: { urls: urls.slice(0, 20), totalPages } }];`
      }
    },
    {
      name: '3d. TB: URLs append',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [850, 500],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: CONFIG.SHEETS.ABFRAGE_QUEUE,
        operation: 'append',
        range: "'URL_Queue'!A:G",
        dataStartRow: 1
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    // ========================================================================
    // STEP 4: QUEUE PROCESS
    // ========================================================================
    {
      name: '4a. URL_Queue laden',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [1050, 600],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: CONFIG.SHEETS.ABFRAGE_QUEUE,
        range: "'URL_Queue'!A1:G",
        firstDataRow: 2
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    {
      name: '4b. Code: Filter offen',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [1250, 600],
      parameters: {
        language: 'javaScript',
        jsCode: `const items = $input.all();
return items.filter(item => {
  const json = item.json;
  const keys = Object.keys(json);
  const status = (json[keys[5]] || '').toString().trim();
  const versuche = parseInt(json[keys[6]] || '0');
  return status === 'offen' && versuche < 3;
});`
      }
    },
    {
      name: '4c. Split URLs',
      type: 'n8n-nodes-base.splitInBatches',
      typeVersion: 1,
      position: [1450, 600],
      parameters: {
        batchSize: 1
      }
    },
    {
      name: '4d. Code: Delay',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [1650, 600],
      parameters: {
        language: 'javaScript',
        jsCode: `const idx = $runIndex || 0;
let delay = Math.floor(Math.random() * 3000) + 3000; // 3-6s

if (idx > 0 && idx % 200 === 0) delay += 600000; // +10min
else if (idx > 0 && idx % 50 === 0) delay += 120000; // +2min

await new Promise(r => setTimeout(r, delay));
return $input.all();`
      }
    },
    {
      name: '4e. Switch: GS oder TB',
      type: 'n8n-nodes-base.switchNode',
      typeVersion: 1,
      position: [1850, 600],
      parameters: {
        mode: 'expression',
        cases: [
          { condition: '={{$node["4a. URL_Queue laden"].json.quelle === "GS"}}', output: 0 },
          { condition: '={{$node["4a. URL_Queue laden"].json.quelle === "TB"}}', output: 1 }
        ]
      }
    },
    {
      name: '4f. GS Detail HTTP',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4,
      position: [1650, 750],
      parameters: {
        url: '={{$node["4a. URL_Queue laden"].json.url}}',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        responseFormat: 'text'
      }
    },
    {
      name: '4g. GS Parse Detail',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [1850, 750],
      parameters: {
        language: 'javaScript',
        jsCode: `const cheerio = require('cheerio');
const html = $input.first().json.body || '';
const $ = cheerio.load(html);
const listingUrl = $node['4a. URL_Queue laden'].json.url;

const webseite = (() => {
  let ws = '';
  $('a[href^="http"]').each((i, el) => {
    const h = $(el).attr('href') || '';
    if (!h.includes('gelbeseiten.de') && !h.includes('google.') && !h.includes('facebook.') && !ws) ws = h;
  });
  return ws;
})();

return [{json: {
  firmenname: $('[itemprop="name"]').first().text().trim() || $('h1').first().text().trim(),
  inhaber: $('[class*="contact-name"], [itemprop="employee"]').first().text().trim(),
  strasse: $('[itemprop="streetAddress"]').text().trim(),
  plz: $('[itemprop="postalCode"]').text().trim(),
  stadt: $('[itemprop="addressLocality"]').text().trim(),
  telefon: $('[itemprop="telephone"]').first().text().trim() || $('[class*="phoneNumber"]').first().text().trim(),
  telefon2: '',
  email: $('a[href^="mailto:"]').first().attr('href')?.replace('mailto:','') || '',
  webseite,
  bewertung: $('[itemprop="ratingValue"]').first().text().trim(),
  bewertungen_anzahl: $('[itemprop="reviewCount"]').first().text().trim(),
  google_maps_link: $('a[href*="maps.google"], a[href*="goo.gl/maps"]').first().attr('href') || '',
  kategorie: '',
  oeffnungszeiten: '',
  quelle: 'GS',
  listing_url: listingUrl,
  branche: $node['4a. URL_Queue laden'].json.branche,
  plz_suche: $node['4a. URL_Queue laden'].json.plz
}}];`
      }
    },
    {
      name: '4h. TB Detail HTTP',
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4,
      position: [1650, 900],
      parameters: {
        url: '={{$node["4a. URL_Queue laden"].json.url}}',
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.de.it2media.tb.ipad.v2+json',
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)'
        }
      }
    },
    {
      name: '4i. TB Parse Detail',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [1850, 900],
      parameters: {
        language: 'javaScript',
        jsCode: `const d = $input.first().json?.detail || $input.first().json || {};
const listingUrl = $node['4a. URL_Queue laden'].json.url;

return [{json: {
  firmenname: d.displayName || '',
  inhaber: d.owner || d.contactPerson || '',
  strasse: d.address?.street || '',
  plz: d.address?.zip || '',
  stadt: d.address?.city || '',
  telefon: d.phones?.[0]?.number || '',
  telefon2: d.phones?.[1]?.number || '',
  email: d.email || '',
  webseite: d.urls?.find(u => u.type === 'web')?.url || '',
  bewertung: d.rating?.value?.toString() || '',
  bewertungen_anzahl: d.rating?.count?.toString() || '',
  google_maps_link: '',
  kategorie: d.categories?.[0] || '',
  oeffnungszeiten: Array.isArray(d.openingHours) ? d.openingHours.map(h => h.text || '').join(' | ') : '',
  quelle: 'TB',
  listing_url: listingUrl,
  branche: $node['4a. URL_Queue laden'].json.branche,
  plz_suche: $node['4a. URL_Queue laden'].json.plz
}}];`
      }
    },
    {
      name: '4j. Master laden',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [2050, 825],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: CONFIG.SHEETS.MASTER,
        range: "'Master'!A1:Z",
        firstDataRow: 2
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    {
      name: '4k. Duplikat & Action',
      type: 'n8n-nodes-base.code',
      typeVersion: 1,
      position: [2250, 825],
      parameters: {
        language: 'javaScript',
        jsCode: `const master = $('4j. Master laden').all();
const newEntry = $input.first().json;

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/\\b(gmbh|co\\.|kg|e\\.v\\.|ug|gbr)\\b/g, '')
    .replace(/[^\\wäöüß\\s]/g, '')
    .replace(/\\s+/g,' ').trim();
}

function score(a, b) {
  let s = 0;
  const na = normalize(a.firmenname || a.Firmenname || '');
  const nb = normalize(b.firmenname || b.Firmenname || '');
  if (na && nb && na === nb) s += 50;
  else if (na && nb && (na.includes(nb) || nb.includes(na))) s += 25;

  const pa = (a.plz || a.PLZ || '').trim();
  const pb = (b.plz || b.PLZ || '').trim();
  if (pa && pb && pa === pb) s += 30;

  const ta = (a.telefon || a.Telefon || '').replace(/\\D/g,'');
  const tb = (b.telefon || b.Telefon || '').replace(/\\D/g,'');
  if (ta && tb && ta === tb) s += 40;
  return s;
}

let best = { score: 0, row: null };
for (const m of master) {
  const s = score(newEntry, m.json);
  if (s > best.score) { best.score = s; best.row = m; }
}

if (best.score >= 60 && best.row) {
  return [{ json: { action: 'update', row: best.row.json } }];
}

const filled = ['firmenname','strasse','plz','stadt','telefon','email','webseite']
  .filter(f => newEntry[f]).length;
const pct = Math.round(filled / 7 * 100);
const id = \`\${newEntry.plz_suche}-\${(newEntry.branche||'XX').substring(0,4).toUpperCase()}-\${String(master.length+1).padStart(4,'0')}\`;

return [{ json: {
  action: 'insert',
  master_id: id,
  Firmenname: newEntry.firmenname || '',
  Inhaber: newEntry.inhaber || '',
  Strasse: newEntry.strasse || '',
  PLZ: newEntry.plz || '',
  Stadt: newEntry.stadt || '',
  Telefon: newEntry.telefon || '',
  Telefon2: newEntry.telefon2 || '',
  Email: newEntry.email || '',
  Webseite: newEntry.webseite || '',
  Kategorie: newEntry.kategorie || newEntry.branche || '',
  Bewertung: newEntry.bewertung || '',
  Bewertungen_Anzahl: newEntry.bewertungen_anzahl || '',
  Oeffnungszeiten: newEntry.oeffnungszeiten || '',
  Google_Maps_Link: newEntry.google_maps_link || '',
  GS_URL: newEntry.quelle === 'GS' ? newEntry.listing_url : '',
  TB_URL: newEntry.quelle === 'TB' ? newEntry.listing_url : '',
  Quellen: newEntry.quelle || '',
  Vollstaendigkeit_Prozent: pct + '%',
  Branche_Suche: newEntry.branche || '',
  PLZ_Suche: newEntry.plz_suche || '',
  Datum_erstellt: new Date().toLocaleDateString('de-DE'),
  Datum_aktualisiert: new Date().toLocaleDateString('de-DE')
}}];`
      }
    },
    {
      name: '4l. Switch: Insert/Update',
      type: 'n8n-nodes-base.switchNode',
      typeVersion: 1,
      position: [2450, 825],
      parameters: {
        mode: 'expression',
        cases: [
          { condition: '={{$node["4k. Duplikat & Action"].json.action === "insert"}}', output: 0 },
          { condition: '={{$node["4k. Duplikat & Action"].json.action === "update"}}', output: 1 }
        ]
      }
    },
    {
      name: '4m. Master Append',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [2300, 750],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: CONFIG.SHEETS.MASTER,
        operation: 'append',
        range: "'Master'!A:Z",
        dataStartRow: 1
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    {
      name: '4n. Master Update',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [2300, 900],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: CONFIG.SHEETS.MASTER,
        operation: 'update',
        range: "'Master'!A:Z"
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    {
      name: '4o. URL_Queue update',
      type: 'n8n-nodes-base.googleSheets',
      typeVersion: 4,
      position: [2650, 825],
      parameters: {
        authentication: 'oauth2',
        spreadsheetId: CONFIG.SHEETS.ABFRAGE_QUEUE,
        operation: 'update',
        range: "'URL_Queue'!F:F"
      },
      credentials: {
        googleSheetsOAuth2: 'google_oauth'
      }
    },
    {
      name: 'Telegram Finish',
      type: 'n8n-nodes-base.telegram',
      typeVersion: 1,
      position: [2850, 825],
      parameters: {
        botToken: CONFIG.TELEGRAM.BOT_TOKEN,
        chatId: CONFIG.TELEGRAM.CHAT_ID,
        text: '✅ LEADMASTER Scraping fertig!'
      }
    }
  ],
  connections: {
    'Start': [{ node: '1a. Abfrage laden', type: 'main', index: [0] }],
    '1a. Abfrage laden': [{ node: '1c. Code: PLZ Kombinationen', type: 'main', index: [0, 0] }],
    '1b. PLZ Datenbank laden': [{ node: '1c. Code: PLZ Kombinationen', type: 'main', index: [0, 1] }],
    '1c. Code: PLZ Kombinationen': [{ node: '1d. Kombinationen schreiben', type: 'main', index: [0] }],
    '1d. Kombinationen schreiben': [{ node: '1e. Kombinationen laden (aktiv)', type: 'main', index: [0] }],
    '1e. Kombinationen laden (aktiv)': [{ node: '1f. Code: Filter offene', type: 'main', index: [0] }],
    '1f. Code: Filter offene': [{ node: '2a. Split Kombinationen', type: 'main', index: [0] }],
    '2a. Split Kombinationen': [
      { node: '2b. GS: URL bauen', type: 'main', index: [0] },
      { node: '3a. TB: URL bauen', type: 'main', index: [0] }
    ],
    '2b. GS: URL bauen': [{ node: '2c. GS: HTTP Request', type: 'main', index: [0] }],
    '2c. GS: HTTP Request': [{ node: '2d. GS: Parse URLs', type: 'main', index: [0] }],
    '2d. GS: Parse URLs': [{ node: '2e. GS: URLs append', type: 'main', index: [0] }],
    '3a. TB: URL bauen': [{ node: '3b. TB: HTTP Request', type: 'main', index: [0] }],
    '3b. TB: HTTP Request': [{ node: '3c. TB: Parse URLs', type: 'main', index: [0] }],
    '3c. TB: Parse URLs': [{ node: '3d. TB: URLs append', type: 'main', index: [0] }],
    '4a. URL_Queue laden': [{ node: '4b. Code: Filter offen', type: 'main', index: [0] }],
    '4b. Code: Filter offen': [{ node: '4c. Split URLs', type: 'main', index: [0] }],
    '4c. Split URLs': [{ node: '4d. Code: Delay', type: 'main', index: [0] }],
    '4d. Code: Delay': [{ node: '4e. Switch: GS oder TB', type: 'main', index: [0] }],
    '4e. Switch: GS oder TB': [
      { node: '4f. GS Detail HTTP', type: 'main', index: [0] },
      { node: '4h. TB Detail HTTP', type: 'main', index: [1] }
    ],
    '4f. GS Detail HTTP': [{ node: '4g. GS Parse Detail', type: 'main', index: [0] }],
    '4g. GS Parse Detail': [{ node: '4j. Master laden', type: 'main', index: [0] }],
    '4h. TB Detail HTTP': [{ node: '4i. TB Parse Detail', type: 'main', index: [0] }],
    '4i. TB Parse Detail': [{ node: '4j. Master laden', type: 'main', index: [0] }],
    '4j. Master laden': [{ node: '4k. Duplikat & Action', type: 'main', index: [0] }],
    '4k. Duplikat & Action': [{ node: '4l. Switch: Insert/Update', type: 'main', index: [0] }],
    '4l. Switch: Insert/Update': [
      { node: '4m. Master Append', type: 'main', index: [0] },
      { node: '4n. Master Update', type: 'main', index: [1] }
    ],
    '4m. Master Append': [{ node: '4o. URL_Queue update', type: 'main', index: [0] }],
    '4n. Master Update': [{ node: '4o. URL_Queue update', type: 'main', index: [0] }],
    '4o. URL_Queue update': [{ node: 'Telegram Finish', type: 'main', index: [0] }]
  }
};

module.exports = workflow;
