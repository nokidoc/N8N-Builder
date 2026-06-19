import { workflow, node, trigger, ifElse, expr } from '@n8n/workflow-sdk';

// ── TRIGGER ───────────────────────────────────────────────────────────────────
const telegramTrigger = trigger({
  type: 'n8n-nodes-base.telegramTrigger',
  version: 1.1,
  config: {
    name: 'Telegram Trigger',
    credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: { updates: ['message'] }
  }
});

const inputParsen = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Input Parsen',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const msg = item.json.message || item.json;
const text = (msg.text || '').trim();
const chatId = String(msg.chat ? msg.chat.id : (msg.from ? msg.from.id : ''));
const istSongBefehl = text.toLowerCase().startsWith('!song');
const artist = istSongBefehl ? text.replace(/^!song\\s*/i, '').trim() : '';
return { json: { rawInput: text, chatId, istSongBefehl, artist } };`
    }
  }
});

const istSongBefehl = ifElse({
  version: 2.2,
  config: {
    name: 'Ist !song Befehl?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.istSongBefehl }}'), operator: { type: 'boolean', operation: 'true' } }],
        combinator: 'and'
      }
    }
  }
});

const warteNachricht = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Warte Nachricht',
    credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: {
      resource: 'message', operation: 'sendMessage',
      chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ "🎤 Analysiere Lyrics von *" + $json.artist + "* und schreibe neuen Song...\\n⏳ Bitte warten (ca. 30 Sek.)" }}'),
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' }
    }
  }
});

const artistDurchleiten = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Artist Durchleiten',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `return { json: $('Input Parsen').item.json };`
    }
  }
});

const sheetsLesen = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.5,
  config: {
    name: 'Sheets Lesen',
    credentials: { googleSheetsOAuth2Api: { id: 'oNARbQVtBeLd1FF3', name: 'Google Sheets account' } },
    parameters: {
      resource: 'sheet',
      operation: 'read',
      documentId: { __rl: true, mode: 'id', value: '1jJkYxSQMuD7EQtpjQOc94UgIOgRyIRHRBpoIuVmtaLg' },
      sheetName: { __rl: true, mode: 'id', value: '0' },
      options: {}
    }
  }
});

const promptBauen = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Prompt Bauen',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: `const artistInput = $('Input Parsen').item.json.artist || '';
const chatId = $('Input Parsen').item.json.chatId || '';

const gefilterteZeilen = items
  .map(function(i) { return i.json; })
  .filter(function(r) {
    const interpret = (r['Interpret'] || '').toLowerCase().trim();
    const suche = artistInput.toLowerCase().trim();
    return interpret.includes(suche) || suche.includes(interpret.split(' ')[0]);
  })
  .filter(function(r) { return r['Lyrics'] && r['Lyrics'].length > 50; });

if (gefilterteZeilen.length === 0) {
  return [{ json: { fehler: true, chatId, artist: artistInput, message: 'Keine Lyrics gefunden.' } }];
}

const songBeispiele = gefilterteZeilen.slice(0, 8).map(function(r) {
  return '[Song: ' + (r['Songtitel'] || 'Unbekannt') + ']\\n' + (r['Lyrics'] || '').substring(0, 2000);
}).join('\\n\\n---\\n\\n');

const prompt = 'Du bist ein professioneller Ghostwriter und Rapper.\\n\\n' +
'DEINE AUFGABE:\\n' +
'Analysiere die folgenden Songtexte von ' + artistInput + ' und schreibe danach einen neuen, originellen Song im exakt gleichen Stil.\\n\\n' +
'ANALYSE-KRITERIEN (identifiziere diese aus den Texten):\\n' +
'• Reimtechnik: Wie viele Silben reimen? Welches Reimschema?\\n' +
'• Vokabular: Slang, Fremdwörter, Straßensprache, akademische Begriffe?\\n' +
'• Themen & Motive: Was sind die wiederkehrenden Themen?\\n' +
'• Punchlines & Vergleiche: Welche rhetorischen Figuren werden genutzt?\\n' +
'• Flow & Rhythmus: Silbenzahl pro Zeile, Geschwindigkeit?\\n' +
'• Tonalität: Aggressiv, nachdenklich, arrogant, emotional?\\n\\n' +
'TEXTE VON ' + artistInput + ' (' + gefilterteZeilen.length + ' Songs im Sheet):\\n\\n' +
songBeispiele +
'\\n\\nREGELN FÜR DEN NEUEN SONG:\\n' +
'• Triff den Stil und Vibe von ' + artistInput + ' so exakt wie möglich\\n' +
'• Verwende KEINE bereits verwendeten Reime oder Zeilen aus den Beispielen\\n' +
'• Kopiere NIEMALS ganze Phrasen — der Text muss 100% originell sein\\n' +
'• Mindestens 2 Strophen + 1 Refrain (ca. 20–24 Zeilen)\\n' +
'• Kein Kommentar, kein Disclaimer — nur der fertige Songtext\\n' +
'• Markiere Strophen mit [Strophe 1], [Refrain], [Strophe 2] etc.\\n\\n' +
'SCHREIBE JETZT DEN NEUEN SONG:';

return [{ json: { prompt, chatId, artist: artistInput, songAnzahl: gefilterteZeilen.length, fehler: false } }];`
    }
  }
});

const hatLyrics = ifElse({
  version: 2.2,
  config: {
    name: 'Hat Lyrics im Sheet?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.fehler }}'), operator: { type: 'boolean', operation: 'false' } }],
        combinator: 'and'
      }
    }
  }
});

const fehlerNachricht = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Fehler Nachricht',
    credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: {
      resource: 'message', operation: 'sendMessage',
      chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ "❌ Keine Lyrics für *" + $json.artist + "* im Sheet gefunden.\\n\\n_Tipp: Erst mit dem Analyse-Bot Lyrics sammeln, dann !song benutzen._" }}'),
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' }
    }
  }
});

const geminiRequest = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Gemini Request',
    credentials: { googlePalmApi: { id: 'ujN3LgpcVPawIWRL', name: 'Google Gemini(PaLM) Api account' } },
    parameters: {
      method: 'POST',
      url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googlePalmApi',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ contents: [{ parts: [{ text: $json.prompt }] }], generationConfig: { temperature: 0.9, maxOutputTokens: 2048 } }) }}'),
      options: { response: { response: { responseFormat: 'json' } }, timeout: 60000 }
    }
  }
});

const antwortExtrahieren = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Antwort Extrahieren',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const resp = item.json;
let songText = '';
try {
  songText = resp.candidates[0].content.parts[0].text || '';
} catch(e) {
  songText = 'Fehler beim Abrufen der KI-Antwort.';
}
const chatId = $('Prompt Bauen').item.json.chatId || '';
const artist = $('Prompt Bauen').item.json.artist || '';
const songAnzahl = $('Prompt Bauen').item.json.songAnzahl || 0;
return { json: { songText, chatId, artist, songAnzahl } };`
    }
  }
});

const ergebnisSenden = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Ergebnis Senden',
    credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: {
      resource: 'message', operation: 'sendMessage',
      chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ "🎵 *Neuer Song im Stil von " + $json.artist + "*\\n_(basierend auf " + $json.songAnzahl + " Songs aus dem Sheet)_\\n\\n" + $json.songText.substring(0, 3800) }}'),
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' }
    }
  }
});

const istLang = ifElse({
  version: 2.2,
  config: {
    name: 'Song zu lang?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.songText.length }}'), operator: { type: 'number', operation: 'gte', rightValue: 3800 } }],
        combinator: 'and'
      }
    }
  }
});

const ergebnisTeil2 = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Ergebnis Teil 2',
    credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: {
      resource: 'message', operation: 'sendMessage',
      chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ "_(Fortsetzung...)_\\n\\n" + $json.songText.substring(3800) }}'),
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' }
    }
  }
});

const hilfeNachricht = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Hilfe Nachricht',
    credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: {
      resource: 'message', operation: 'sendMessage',
      chatId: expr('{{ $json.chatId }}'),
      text: '💡 *Song Generator Befehl:*\n\n`!song Künstlername`\n\n_Beispiel: !song Kollegah_\n\nDer Künstler muss bereits im Sheet analysiert sein.',
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' }
    }
  }
});

// Workflow ID: lDmTjoyJtd0GRKNX
export default workflow('song-generator-v1', 'Song Generator – Stil-Analyse & KI-Songtext')
  .add(telegramTrigger).to(inputParsen)
  .to(istSongBefehl
    .onTrue(warteNachricht.to(artistDurchleiten).to(sheetsLesen).to(promptBauen)
      .to(hatLyrics
        .onTrue(geminiRequest.to(antwortExtrahieren).to(ergebnisSenden)
          .to(istLang
            .onTrue(ergebnisTeil2)
            .onFalse()))
        .onFalse(fehlerNachricht)
      ))
    .onFalse(hilfeNachricht)
  );
