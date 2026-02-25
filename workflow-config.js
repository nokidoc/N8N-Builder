module.exports = {
  "name": "LEADMASTER – PLZ Scraper (GS + TB)",
  "nodes": [
    {
      "name": "Start",
      "type": "n8n-nodes-base.start",
      "typeVersion": 1,
      "position": [
        50,
        50
      ],
      "parameters": {}
    },
    {
      "name": "Abfrage laden",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4,
      "position": [
        250,
        50
      ],
      "parameters": {
        "authentication": "oauth2",
        "spreadsheetId": "1ySGkyk6JYyo7m4E9FuPmuFhxAov3q2xFv1nUQTwomqA",
        "range": "'Abfrage'!A1:B",
        "firstDataRow": 2
      },
      "credentials": {
        "googleSheetsOAuth2": "google_oauth"
      }
    },
    {
      "name": "PLZ Datenbank",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4,
      "position": [
        450,
        50
      ],
      "parameters": {
        "authentication": "oauth2",
        "spreadsheetId": "12o5DdRCV7nwSA66EkXen2xjYWCzI2F4rPScg-8QxZLw",
        "range": "'Sheet1'!A1:B",
        "firstDataRow": 2
      },
      "credentials": {
        "googleSheetsOAuth2": "google_oauth"
      }
    },
    {
      "name": "Code: Kombinationen",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [
        650,
        50
      ],
      "parameters": {
        "language": "javaScript",
        "jsCode": "const abfragen = $('Abfrage laden').all();\nconst plzDaten = $('PLZ Datenbank').all();\nconst result = [];\n\nfor (const abfrage of abfragen) {\n  const json = abfrage.json;\n  const ort = json[Object.keys(json)[0]]?.toString().trim();\n  const branche = json[Object.keys(json)[1]]?.toString().trim();\n\n  if (!ort || !branche) continue;\n\n  for (const plz of plzDaten) {\n    const pJson = plz.json;\n    const stadt = pJson[Object.keys(pJson)[1]]?.toString().trim() || '';\n    const plzNum = pJson[Object.keys(pJson)[0]]?.toString().trim() || '';\n\n    if (stadt.toLowerCase() === ort.toLowerCase()) {\n      result.push({\n        json: {\n          plz: plzNum,\n          stadt,\n          branche,\n          status_gs: '',\n          status_tb: ''\n        }\n      });\n    }\n  }\n}\n\nreturn result.slice(0, 100);"
      }
    },
    {
      "name": "Append Kombinationen",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4,
      "position": [
        850,
        50
      ],
      "parameters": {
        "authentication": "oauth2",
        "spreadsheetId": "1ySGkyk6JYyo7m4E9FuPmuFhxAov3q2xFv1nUQTwomqA",
        "operation": "append",
        "range": "'Abfrage_Kombiniert'!A:E",
        "dataStartRow": 1
      },
      "credentials": {
        "googleSheetsOAuth2": "google_oauth"
      }
    },
    {
      "name": "Load Kombiniert",
      "type": "n8n-nodes-base.googleSheets",
      "typeVersion": 4,
      "position": [
        1050,
        50
      ],
      "parameters": {
        "authentication": "oauth2",
        "spreadsheetId": "1ySGkyk6JYyo7m4E9FuPmuFhxAov3q2xFv1nUQTwomqA",
        "range": "'Abfrage_Kombiniert'!A1:E",
        "firstDataRow": 2
      },
      "credentials": {
        "googleSheetsOAuth2": "google_oauth"
      }
    },
    {
      "name": "GS Loop",
      "type": "n8n-nodes-base.splitInBatches",
      "typeVersion": 1,
      "position": [
        1250,
        50
      ],
      "parameters": {
        "batchSize": 1
      }
    },
    {
      "name": "GS URL",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [
        1450,
        50
      ],
      "parameters": {
        "language": "javaScript",
        "jsCode": "const json = $input.first().json;\nconst plz = json[Object.keys(json)[0]];\nconst branche = json[Object.keys(json)[2]];\nreturn [{\n  json: {\n    url: `https://www.gelbeseiten.de/suche/${encodeURIComponent(branche)}/${plz}`,\n    page: 1,\n    maxPage: 5\n  }\n}];"
      }
    },
    {
      "name": "GS Fetch",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        1650,
        50
      ],
      "parameters": {
        "url": "={{$node[\"GS URL\"].json.url}}",
        "method": "GET",
        "headers": {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        "responseFormat": "text"
      }
    },
    {
      "name": "GS Parse",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [
        1850,
        50
      ],
      "parameters": {
        "language": "javaScript",
        "jsCode": "const cheerio = require('cheerio');\nconst html = $input.first().json.body || $input.first().json;\nconst $ = cheerio.load(html);\n\nconst urls = [];\n$('article').each((i, el) => {\n  const link = $(el).find('a').first().attr('href');\n  if (link) {\n    urls.push({\n      url: link.startsWith('http') ? link : 'https://www.gelbeseiten.de' + link,\n      name: $(el).find('h2').first().text().trim(),\n      source: 'GS'\n    });\n  }\n});\n\nreturn [{ json: { urls: urls.slice(0, 10) } }];"
      }
    },
    {
      "name": "TB URL",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [
        1450,
        250
      ],
      "parameters": {
        "language": "javaScript",
        "jsCode": "const json = $input.first().json;\nconst plz = json[Object.keys(json)[0]];\nconst branche = json[Object.keys(json)[2]];\nreturn [{\n  json: {\n    url: `https://www.dastelefonbuch.de/Suche/${encodeURIComponent(branche)}/${plz}`,\n    page: 1\n  }\n}];"
      }
    },
    {
      "name": "TB Fetch",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [
        1650,
        250
      ],
      "parameters": {
        "url": "={{$node[\"TB URL\"].json.url}}",
        "method": "GET",
        "headers": {
          "Accept": "application/vnd.de.it2media.tb.ipad.v2+json",
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"
        }
      }
    },
    {
      "name": "TB Parse",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [
        1850,
        250
      ],
      "parameters": {
        "language": "javaScript",
        "jsCode": "const data = $input.first().json;\nconst urls = [];\n\nif (data.hitlist && data.hitlist.hits) {\n  data.hitlist.hits.forEach(hit => {\n    if (hit.url) {\n      urls.push({\n        url: hit.url,\n        name: hit.displayName || '',\n        source: 'TB'\n      });\n    }\n  });\n}\n\nreturn [{ json: { urls: urls.slice(0, 10) } }];"
      }
    },
    {
      "name": "Telegram",
      "type": "n8n-nodes-base.telegram",
      "typeVersion": 1,
      "position": [
        2050,
        150
      ],
      "parameters": {
        "botToken": "8348680663:AAETChGMdu5QzQaO4fjoN7sx2xHY1vziJfY",
        "chatId": 6136860005,
        "text": "✅ LEADMASTER Scraping fertig!"
      }
    }
  ],
  "connections": {
    "Start": [
      {
        "node": "Abfrage laden",
        "type": "main",
        "index": [
          0
        ]
      }
    ],
    "Abfrage laden": [
      {
        "node": "Code: Kombinationen",
        "type": "main",
        "index": [
          0,
          0
        ]
      }
    ],
    "PLZ Datenbank": [
      {
        "node": "Code: Kombinationen",
        "type": "main",
        "index": [
          0,
          1
        ]
      }
    ],
    "Code: Kombinationen": [
      {
        "node": "Append Kombinationen",
        "type": "main",
        "index": [
          0
        ]
      }
    ],
    "Append Kombinationen": [
      {
        "node": "Load Kombiniert",
        "type": "main",
        "index": [
          0
        ]
      }
    ],
    "Load Kombiniert": [
      {
        "node": "GS Loop",
        "type": "main",
        "index": [
          0
        ]
      }
    ],
    "GS Loop": [
      {
        "node": "GS URL",
        "type": "main",
        "index": [
          0
        ]
      },
      {
        "node": "TB URL",
        "type": "main",
        "index": [
          0
        ]
      }
    ],
    "GS URL": [
      {
        "node": "GS Fetch",
        "type": "main",
        "index": [
          0
        ]
      }
    ],
    "GS Fetch": [
      {
        "node": "GS Parse",
        "type": "main",
        "index": [
          0
        ]
      }
    ],
    "GS Parse": [
      {
        "node": "Telegram",
        "type": "main",
        "index": [
          0
        ]
      }
    ],
    "TB URL": [
      {
        "node": "TB Fetch",
        "type": "main",
        "index": [
          0
        ]
      }
    ],
    "TB Fetch": [
      {
        "node": "TB Parse",
        "type": "main",
        "index": [
          0
        ]
      }
    ],
    "TB Parse": [
      {
        "node": "Telegram",
        "type": "main",
        "index": [
          0
        ]
      }
    ]
  },
  "active": false,
  "settings": {
    "executionTimeout": 3600000,
    "maxRetries": 0
  }
};