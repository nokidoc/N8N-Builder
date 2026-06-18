import { workflow, node, trigger, ifElse, merge, splitInBatches, nextBatch, expr } from '@n8n/workflow-sdk';

// ── ANALYSE HELPER (shared code string) ─────────────────────────────────────
const ANALYSE_CODE = `const NL = String.fromCharCode(10);
const d = item.json;
const lyrics = (d.lyrics_kurz || d.lyrics || '').toLowerCase();

// TEMPO
let tempo = 'mittel';
const lyricsLines = lyrics.split(NL).filter(function(l) { return l.trim().length > 5; });
const wordCount = lyrics.split(/\\s+/).length;
if (lyricsLines.length > 0) {
  const wpl = wordCount / lyricsLines.length;
  if (wpl > 12) tempo = 'sehr schnell';
  else if (wpl > 9) tempo = 'schnell';
  else if (wpl < 5) tempo = 'langsam';
}

// ENERGIE
const aggrWords = ['krieg','schuss','kugel','kill','tod','blut','waffe','messer','beef','aggro','feind','schiess','schieß','gang','harte','opfer','beef','frontal'];
const melanWords = ['weinen','traenen','tränen','schmerz','allein','verloren','trauer','vermiss','sehnsucht','dunkel','einsam'];
let energyScore = 5;
for (let i = 0; i < aggrWords.length; i++) { if (lyrics.indexOf(aggrWords[i]) !== -1) energyScore++; }
for (let i = 0; i < melanWords.length; i++) { if (lyrics.indexOf(melanWords[i]) !== -1) energyScore--; }
energyScore = Math.max(1, Math.min(10, energyScore));

// STIMMUNG
const moods = [];
const aggrHit = aggrWords.slice(0, 10).some(function(w) { return lyrics.indexOf(w) !== -1; });
if (aggrHit) moods.push('aggressiv');
const melanHit = melanWords.some(function(w) { return lyrics.indexOf(w) !== -1; });
if (melanHit) moods.push('melancholisch');
if (lyrics.indexOf('stolz') !== -1 || lyrics.indexOf('king') !== -1 || lyrics.indexOf('beste') !== -1 || lyrics.indexOf('nummer 1') !== -1 || lyrics.indexOf('boss') !== -1) moods.push('selbstbewusst');
if (lyrics.indexOf('fami') !== -1 || lyrics.indexOf('bruder') !== -1 || lyrics.indexOf('mutter') !== -1 || lyrics.indexOf('mama') !== -1) moods.push('emotional');
if (moods.length === 0) moods.push('neutral');
const stimmung = moods.join(', ');

// FLOW
let flow = 'straight';
if (lyrics.indexOf('triplet') !== -1 || lyrics.indexOf('trill') !== -1 || lyrics.indexOf('drill') !== -1) flow = 'triplet';
else if (energyScore >= 8) flow = 'synkopiert';

// THEMEN
const themenMap = [
  ['Strassenleben', ['strasse','straße','block','kiez','ghetto','gasse','milieu','gang','knast','gitter','banlieue']],
  ['Familie', ['familie','mutter','vater','bruder','schwester','cousin','mama','papa','eltern','geschwister']],
  ['Drogen', ['kokain','koks','gras','weed','dope','stoff','dealer','droge','lila','ot','piece','crystal','mdma']],
  ['Geld', ['geld','kohle','schein','euro','dollar','reich','arm','batzen','cash','money','brote','millionen']],
  ['Liebe', ['liebe','herz','maedchen','mädchen','frau','kuessen','küssen','vermiss','baby','girl','beziehung']],
  ['Gewalt', ['krieg','schuss','kugel','blut','messer','schiess','schieß','kampf','prügel','waffe']],
  ['Loyalitaet', ['loyal','treue','solidarity','solid','ride or die','zusammen','fuer immer','füreinander']],
  ['Herkunft', ['albanien','türkei','tuerkei','arabisch','heimat','migrant','auslaender','ausländer','balkan','kosovo']],
  ['Religion', ['allah','wallah','inshallah','bismillah','gott','beten','haram','halal','mashallah','subhanallah']],
  ['Erfolg', ['erfolg','ruhm','fame','charts','nummer 1','top','king','boss','rap god','legend']]
];
const themen = [];
for (let i = 0; i < themenMap.length; i++) {
  const kws = themenMap[i][1];
  for (let j = 0; j < kws.length; j++) {
    if (lyrics.indexOf(kws[j]) !== -1) { themen.push(themenMap[i][0]); break; }
  }
}
if (themen.length === 0) themen.push('Allgemein');

// REIMSCHEMA
let reimschema = 'AABB';
if (energyScore >= 8 || lyricsLines.length > 20) reimschema = 'multisyllabisch';
else if (melanHit) reimschema = 'ABAB';

// SPRACHSTIL
const stile = [];
if (lyrics.indexOf('wallah') !== -1 || lyrics.indexOf('alter') !== -1 || lyrics.indexOf('bro') !== -1 || lyrics.indexOf('digga') !== -1 || lyrics.indexOf('cuz') !== -1) stile.push('Streetslang');
if ((d.lyrics || '').length > 1000) stile.push('Storytelling');
if (energyScore >= 7) stile.push('Punchlines');
if (stile.length === 0) stile.push('Allgemein');
const sprachstil = stile.join(', ');

// KLINGT WIE
const similar = [];
if (lyrics.indexOf('wallah') !== -1 || lyrics.indexOf('albanien') !== -1 || lyrics.indexOf('kmn') !== -1 || lyrics.indexOf('frankfurt') !== -1) {
  similar.push('KMN Gang', 'Zuna', 'Nash');
} else if (lyrics.indexOf('berlin') !== -1 || lyrics.indexOf('187') !== -1) {
  similar.push('Gzuz', 'Sa4', 'Bonez MC');
} else if (lyrics.indexOf('kölln') !== -1 || lyrics.indexOf('köln') !== -1 || lyrics.indexOf('dortmund') !== -1 || lyrics.indexOf('ruhr') !== -1) {
  similar.push('Eno', 'Luciano', 'Bausa');
} else if (lyrics.indexOf('münchen') !== -1 || lyrics.indexOf('muenchen') !== -1 || lyrics.indexOf('bavarian') !== -1) {
  similar.push('Trettmann', 'Cro');
} else {
  similar.push('Deutschrap allgemein');
}
const klingtWie = similar.join(', ');

// BESONDERHEITEN
const artist = d.artist || '';
const besonderheiten = artist
  ? artist + ' verbindet ' + themen.slice(0, 2).join(' und ') + ' mit ' + stimmung + 'er Energie (' + energyScore + '/10).'
  : 'Verbindet ' + themen.slice(0, 2).join(' und ') + ' mit ' + stimmung + 'er Stimmung.';

const analyse = [
  'TEMPO: ' + tempo,
  'ENERGIE: ' + energyScore + '/10',
  'STIMMUNG: ' + stimmung,
  'FLOW: ' + flow,
  'REIMSCHEMA: ' + reimschema,
  'THEMEN: ' + themen.join(', '),
  'SPRACHSTIL: ' + sprachstil,
  'KLINGT WIE: ' + klingtWie,
  'BESONDERHEITEN: ' + besonderheiten
].join(NL);

return { json: Object.assign({}, d, { response: analyse }) };`;

// ── TRIGGER ──────────────────────────────────────────────────────────────────
const telegramTrigger = trigger({
  type: 'n8n-nodes-base.telegramTrigger',
  version: 1.1,
  config: {
    name: 'Telegram Nachricht',
    credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: { updates: ['message'] }
  }
});

// ── INPUT PARSEN ─────────────────────────────────────────────────────────────
const inputParsen = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Input parsen',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const text = (item.json.message && item.json.message.text) ? item.json.message.text.trim() : '';
const chatId = String(item.json.message && item.json.message.chat ? item.json.message.chat.id : '');
let inputType = 'artist';
let oembedUrl = '';
if (text.indexOf('spotify.com') !== -1 || text.indexOf('spotify:') !== -1) {
  inputType = 'spotify';
  oembedUrl = 'https://open.spotify.com/oembed?url=' + encodeURIComponent(text);
} else if (text.indexOf('youtube.com') !== -1 || text.indexOf('youtu.be') !== -1) {
  inputType = 'youtube';
  oembedUrl = 'https://www.youtube.com/oembed?url=' + encodeURIComponent(text) + '&format=json';
} else if (text.indexOf(' - ') !== -1) {
  inputType = 'song';
}
return { json: { inputType, rawInput: text, oembedUrl, chatId } };`
    }
  }
});

// ── URL BRANCH ───────────────────────────────────────────────────────────────
const istUrl = ifElse({
  version: 2.2,
  config: {
    name: 'Ist URL?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.oembedUrl }}'), operator: { type: 'string', operation: 'notEmpty' } }],
        combinator: 'and'
      }
    }
  }
});

const oembedAbrufen = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'oEmbed abrufen',
    parameters: {
      method: 'GET',
      url: expr('{{ $json.oembedUrl }}'),
      options: { response: { response: { responseFormat: 'json', neverError: true } } }
    }
  }
});

const titelAusOembed = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Titel aus oEmbed',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const rawTitle = item.json.title || '';
const prev = $('Input parsen').item.json;
const chatId = prev.chatId;
const inputType = prev.inputType;
const rawInput = prev.rawInput;
let artist = '';
let songTitle = rawTitle;
const suffixes = ['(official video)', '(official music video)', '(lyrics)', '(lyric video)', '(official audio)', '(official)', '(hd)', '(4k)'];
let cleaned = rawTitle.toLowerCase();
let title = rawTitle;
for (let i = 0; i < suffixes.length; i++) {
  const idx = cleaned.indexOf(suffixes[i]);
  if (idx !== -1) { title = title.substring(0, idx).trim(); cleaned = title.toLowerCase(); }
}
const midDot = title.indexOf(' · ');
if (midDot !== -1) {
  songTitle = title.substring(0, midDot).trim();
  artist = title.substring(midDot + 3).trim();
} else {
  const dashIdx = title.indexOf(' - ');
  if (dashIdx !== -1) { artist = title.substring(0, dashIdx).trim(); songTitle = title.substring(dashIdx + 3).trim(); }
  else { songTitle = title; }
}
const searchQuery = (artist ? artist + ' ' : '') + songTitle;
const geniusSearchUrl = 'https://genius.com/search?q=' + encodeURIComponent(searchQuery);
return { json: { artist, songTitle, geniusSearchUrl, chatId, rawInput, source: inputType } };`
    }
  }
});

// ── MERGE SINGLE SONG ────────────────────────────────────────────────────────
const mergeSingleSong = merge({
  version: 3.2,
  config: { name: 'Merge Single Song', parameters: { mode: 'append' } }
});

// ── SONG BRANCH (Bindestrich) ─────────────────────────────────────────────────
const hatBindestrich = ifElse({
  version: 2.2,
  config: {
    name: 'Hat Bindestrich?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.inputType }}'), operator: { type: 'string', operation: 'equals' }, rightValue: 'song' }],
        combinator: 'and'
      }
    }
  }
});

const titelAusText = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Titel aus Text',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const text = item.json.rawInput || '';
const chatId = item.json.chatId;
let artist = '';
let songTitle = text;
const dashIdx = text.indexOf(' - ');
if (dashIdx !== -1) {
  artist = text.substring(0, dashIdx).trim();
  songTitle = text.substring(dashIdx + 3).trim();
}
const geniusSearchUrl = 'https://genius.com/search?q=' + encodeURIComponent(text);
return { json: { artist, songTitle, geniusSearchUrl, chatId, rawInput: text, source: 'text' } };`
    }
  }
});

// ── ARTIST BRANCH ────────────────────────────────────────────────────────────
const artistVorbereiten = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Artist vorbereiten',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const raw = item.json.rawInput || '';
const chatId = item.json.chatId;
let cleaned = raw.trim();
cleaned = cleaned.replace(/\\([^)]*\\)/g, '').replace(/\\[[^\\]]*\\]/g, '').trim();
const featIdx = cleaned.toLowerCase().indexOf(' feat');
if (featIdx !== -1) cleaned = cleaned.substring(0, featIdx).trim();
const ftIdx = cleaned.toLowerCase().indexOf(' ft.');
if (ftIdx !== -1) cleaned = cleaned.substring(0, ftIdx).trim();
cleaned = cleaned.replace(/[_]/g, ' ').replace(/\\s+/g, ' ').trim();
const artistName = cleaned || raw.trim();
const artistSlug = artistName.split(' ').map(function(w) { return w ? w[0].toUpperCase() + w.slice(1) : ''; }).join('-');
const slugLower = artistSlug.toLowerCase();
const geniusArtistUrl = 'https://genius.com/artists/' + artistSlug;
return { json: { artistName, artistSlug, chatId, geniusArtistUrl, slugLower, rawInput: raw } };`
    }
  }
});

const artistStartNachricht = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Artist Start Nachricht',
    credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: {
      resource: 'message',
      operation: 'sendMessage',
      chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ "🎤 Lade Top-Songs für *" + $json.artistName + "*..." }}'),
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' }
    }
  }
});

const artistDataDurchleiten = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Artist Data Durchleiten',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `return { json: $('Artist vorbereiten').item.json };`
    }
  }
});

const geniusApiArtistSuche = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Genius API Artist Suche',
    parameters: {
      method: 'GET',
      url: expr('{{ "https://api.deezer.com/search/artist?q=" + encodeURIComponent($json.artistName) + "&limit=5" }}'),
      options: { response: { response: { responseFormat: 'json', neverError: true } }, timeout: 15000 }
    }
  }
});

const artistIdExtrahieren = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Artist ID extrahieren',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const artistData = $('Artist Data Durchleiten').item.json;
let artistId = '';
try {
  const data = item.json.data || [];
  if (data.length > 0) artistId = String(data[0].id || '');
} catch(e) { artistId = ''; }
return { json: Object.assign({}, artistData, { artistId, artistAka: '', artistBio: '' }) };`
    }
  }
});

const hatArtistId = ifElse({
  version: 2.2,
  config: {
    name: 'Hat Artist ID?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.artistId }}'), operator: { type: 'string', operation: 'notEmpty' } }],
        combinator: 'and'
      }
    }
  }
});

const geniusApiTopSongs = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Genius API Top Songs',
    parameters: {
      method: 'GET',
      url: expr('{{ "https://api.deezer.com/artist/" + $json.artistId + "/top?limit=15" }}'),
      options: { response: { response: { responseFormat: 'json', neverError: true } }, timeout: 15000 }
    }
  }
});

const songsAusApiExtrahieren = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Songs aus API extrahieren',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: `const artistData = $('Artist ID extrahieren').first().json;
const artistName = artistData.artistName || '';
const chatId = artistData.chatId || '';
let songs = [];
try { songs = (items[0].json.data) || []; } catch(e) { songs = []; }
if (songs.length === 0) {
  return [{ json: { songUrl: '', songTitle: '', artist: artistName, artistAka: '', artistBio: '', chatId, source: 'artist-batch', error: 'keine Songs via API', album: '', release_year: '', feat_artists: '' } }];
}
return songs.slice(0, 15).map(function(s) {
  return { json: {
    songUrl: '',
    songTitle: s.title || '',
    artist: artistName,
    artistAka: '', artistBio: '', chatId,
    source: 'artist-batch',
    album: (s.album && s.album.title) ? s.album.title : '',
    release_year: '',
    feat_artists: ''
  } };
});`
    }
  }
});

// ── MERGE SONG LISTEN ─────────────────────────────────────────────────────────
const mergeSongListen = merge({
  version: 3.2,
  config: { name: 'Merge Song Listen', parameters: { mode: 'append' } }
});

const geniusArtistSeite = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Genius Artist Seite',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `return { json: { solution: { response: '' } } };`
    }
  }
});

const songListeExtrahieren = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Song Liste extrahieren',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: `const artistData = $('Artist Data Durchleiten').first().json;
const artistName = artistData.artistName || '';
const chatId = artistData.chatId || '';
const slugLower = artistData.slugLower || '';
const html = (items[0].json.solution || {}).response || '';
const results = [];
const seen = {};
let artistAka = '';
let artistBio = '';
const akaIdx = html.indexOf('AKA:');
if (akaIdx !== -1) {
  const akaStart = akaIdx + 4;
  const akaTagEnd = html.indexOf('<', akaStart);
  const akaRaw = html.substring(akaStart, akaTagEnd !== -1 ? akaTagEnd : akaStart + 100);
  artistAka = akaRaw.replace(new RegExp('<[^>]+>', 'g'), '').replace(/&amp;/g, '&').trim();
}
const bioMarkers = ['class="rich_text_formatting"', 'class="artist_bio"', '"about":'];
for (let b = 0; b < bioMarkers.length; b++) {
  const bIdx = html.indexOf(bioMarkers[b]);
  if (bIdx !== -1) {
    const bStart = html.indexOf('>', bIdx);
    const bEnd = html.indexOf('</p>', bStart);
    if (bStart !== -1 && bEnd !== -1 && bEnd - bStart < 3000) {
      const raw = html.substring(bStart + 1, bEnd);
      const plain = raw.replace(new RegExp('<[^>]+>', 'g'), '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
      if (plain.length > 30) { artistBio = plain.substring(0, 500); break; }
    }
  }
}
let pos = 0;
while (results.length < 10 && pos < html.length) {
  const mPos = html.indexOf('-lyrics', pos);
  if (mPos === -1) break;
  const hStart = html.lastIndexOf('href="', mPos);
  if (hStart === -1 || mPos - hStart > 300) { pos = mPos + 1; continue; }
  const urlStart = hStart + 6;
  const urlEnd = html.indexOf('"', urlStart);
  if (urlEnd === -1) { pos = mPos + 1; continue; }
  const url = html.substring(urlStart, urlEnd);
  const low = url.toLowerCase();
  const isAbsolute = low.indexOf('genius.com/') !== -1;
  const isRelative = url.startsWith('/') && !url.startsWith('//');
  if (!isAbsolute && !isRelative) { pos = mPos + 1; continue; }
  if (low.indexOf('/albums/') !== -1 || low.indexOf('/artists/') !== -1) { pos = mPos + 1; continue; }
  const fullUrl = url.startsWith('http') ? url : 'https://genius.com' + url;
  const fullLow = fullUrl.toLowerCase();
  if (seen[fullLow]) { pos = mPos + 1; continue; }
  seen[fullLow] = true;
  const songSlug = fullUrl.substring(fullUrl.lastIndexOf('/') + 1).replace(/-lyrics$/, '');
  let clean = songSlug;
  if (clean.toLowerCase().indexOf(slugLower + '-') === 0) { clean = clean.substring(slugLower.length + 1); }
  const songTitle = clean.split('-').map(function(w) { return w ? w[0].toUpperCase() + w.slice(1) : ''; }).join(' ');
  results.push({ json: { songUrl: fullUrl, songTitle, artist: artistName, artistAka, artistBio, chatId, source: 'artist-batch', album: '', release_year: '', feat_artists: '' } });
  pos = mPos + 1;
}
if (results.length === 0) {
  return [{ json: { error: 'Keine Songs gefunden', artistName, artistAka, artistBio, chatId, songUrl: '', songTitle: 'Unbekannt', artist: artistName, source: 'artist-batch', album: '', release_year: '', feat_artists: '' } }];
}
return results;`
    }
  }
});

// ── SINGLE SONG PATH ──────────────────────────────────────────────────────────
const analyseStartenNachricht = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Analyse starten Nachricht',
    credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: {
      resource: 'message',
      operation: 'sendMessage',
      chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ "🔍 Analysiere: *" + $json.songTitle + "*" + ($json.artist ? " von *" + $json.artist + "*" : "") + "..." }}'),
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' }
    }
  }
});

const songDatenDurchleiten = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Song-Daten durchleiten',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `return { json: $('Merge Single Song').item.json };`
    }
  }
});

const geniusApiSongSuche = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Genius API Song Suche',
    parameters: {
      method: 'GET',
      url: expr('{{ "https://genius.com/api/search/songs?q=" + encodeURIComponent(($json.artist ? $json.artist + " " : "") + $json.songTitle) }}'),
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'User-Agent', value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        { name: 'Accept', value: 'application/json' }
      ]},
      options: { response: { response: { responseFormat: 'text', neverError: true } }, timeout: 15000 }
    }
  }
});

const songUrlAusApiExtrahieren = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Song URL aus API extrahieren',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const prevData = $('Song-Daten durchleiten').item.json;
let songUrl = '';
try {
  const bodyStr = item.json.data || item.json.body || '';
  if (bodyStr && bodyStr.indexOf('{') === 0) {
    const resp = JSON.parse(bodyStr);
    const sections = (resp.response && resp.response.sections) ? resp.response.sections : [];
    for (let s = 0; s < sections.length; s++) {
      const hits = sections[s].hits || [];
      for (let h = 0; h < hits.length; h++) {
        const result = hits[h].result;
        if (result && result.url && result.url.indexOf('-lyrics') !== -1) {
          songUrl = result.url;
          break;
        }
      }
      if (songUrl) break;
    }
  }
} catch(e) { songUrl = ''; }
return { json: Object.assign({}, prevData, { songUrl: songUrl || '' }) };`
    }
  }
});

const hatApiSongUrl = ifElse({
  version: 2.2,
  config: {
    name: 'Hat API Song URL?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.songUrl }}'), operator: { type: 'string', operation: 'notEmpty' } }],
        combinator: 'and'
      }
    }
  }
});

const urlApiPassthrough = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'URL API Passthrough',
    parameters: { mode: 'runOnceForEachItem', jsCode: `return { json: item.json };` }
  }
});

const mergeSongUrl = merge({
  version: 3.2,
  config: { name: 'Merge Song URL', parameters: { mode: 'append' } }
});

const geniusSuche = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Genius Suche',
    parameters: {
      method: 'POST',
      url: 'http://n8n_flaresolverr:8191/v1',
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ cmd: "request.get", url: $json.geniusSearchUrl, maxTimeout: 60000 }) }}'),
      options: { response: { response: { responseFormat: 'json', neverError: true } }, timeout: 90000 }
    }
  }
});

const songUrlHtmlExtrahieren = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Song URL HTML extrahieren',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const prevData = $('Song-Daten durchleiten').item.json;
const html = (item.json.solution || {}).response || '';
let songUrl = '';
if (html.length > 100) {
  let pos = 0;
  while (pos < html.length) {
    const href = html.indexOf('href="https://genius.com/', pos);
    if (href === -1) break;
    const urlStart = href + 6;
    const urlEnd = html.indexOf('"', urlStart);
    if (urlEnd === -1) break;
    const url = html.substring(urlStart, urlEnd);
    if (url.indexOf('-lyrics') !== -1 && url.toLowerCase().indexOf('/albums/') === -1 && url.toLowerCase().indexOf('/artists/') === -1) {
      songUrl = url;
      break;
    }
    pos = href + 1;
  }
}
return { json: Object.assign({}, prevData, { songUrl: songUrl || '' }) };`
    }
  }
});

const songGefunden = ifElse({
  version: 2.2,
  config: {
    name: 'Song gefunden?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.songUrl }}'), operator: { type: 'string', operation: 'notEmpty' } }],
        combinator: 'and'
      }
    }
  }
});

const songSeiteGeladen = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Song Seite laden',
    parameters: {
      method: 'GET',
      url: expr('{{ "https://lrclib.net/api/get?artist_name=" + encodeURIComponent($json.artist || "") + "&track_name=" + encodeURIComponent($json.songTitle || "") }}'),
      options: { response: { response: { responseFormat: 'json', neverError: true } }, timeout: 15000 }
    }
  }
});

const lyricsExtrahieren = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Lyrics extrahieren',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const prevData = $('Merge Song URL').item.json;
let lyrics = (item.json && item.json.plainLyrics) || '';
if (!lyrics || lyrics.length < 20) lyrics = '[Lyrics nicht gefunden]';
return { json: Object.assign({}, prevData, { lyrics: lyrics.substring(0, 45000), lyrics_kurz: lyrics.substring(0, 2000), album: prevData.album || '', release_year: prevData.release_year || '', feat_artists: prevData.feat_artists || '' }) };`
    }
  }
});

// ── ANALYSE (ersetzt Ollama) ──────────────────────────────────────────────────
const stilDnaAnalyse = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Ollama Stil-DNA',
    parameters: { mode: 'runOnceForEachItem', jsCode: ANALYSE_CODE }
  }
});

const ergebnisZusammenfuehren = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Ergebnis zusammenfuehren',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const d = item.json;
return { json: {
  'Interpret': d.artist || '',
  'Songtitel': d.songTitle || '',
  'Lyrics': (d.lyrics || '').substring(0, 45000),
  'Genius URL': d.songUrl || '',
  'chatId': d.chatId
} };`
    }
  }
});

const sheetsVorbereitungSingle = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Sheets Vorbereitung Single',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const d = $('Ergebnis zusammenfuehren').item.json;
return { json: {
  'Interpret': d['Interpret'] || '',
  'Songtitel': d['Songtitel'] || '',
  'Lyrics': d['Lyrics'] || '',
  'Genius URL': d['Genius URL'] || ''
} };`
    }
  }
});

const inGoogleSheetsEintragen = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.5,
  config: {
    name: 'In Google Sheets eintragen',
    credentials: { googleSheetsOAuth2Api: { id: 'oNARbQVtBeLd1FF3', name: 'Google Sheets account' } },
    parameters: {
      resource: 'sheet',
      operation: 'append',
      documentId: { __rl: true, mode: 'id', value: '1jJkYxSQMuD7EQtpjQOc94UgIOgRyIRHRBpoIuVmtaLg' },
      sheetName: { __rl: true, mode: 'id', value: '0' },
      columns: { mappingMode: 'autoMapInputData', schema: [] },
      options: {}
    }
  }
});

const ergebnisSenden = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Ergebnis senden',
    credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: {
      resource: 'message',
      operation: 'sendMessage',
      chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ "✅ *" + $json["Songtitel"] + "*" + ($json["Interpret"] ? " von *" + $json["Interpret"] + "*" : "") + " gespeichert!" }}'),
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' }
    }
  }
});

const emailSongBericht = node({
  type: 'n8n-nodes-base.emailSend',
  version: 2.1,
  config: {
    name: 'E-Mail Song Bericht',
    credentials: { smtp: { id: 'LxLg9nFpoHESQMxv', name: 'SMTP account' } },
    parameters: {
      fromEmail: 'nokidoc@hotmail.com',
      toEmail: 'nokidoc@hotmail.com',
      subject: expr('{{ "Stil-DNA: " + $json["Songtitel"] + ($json["Interpret"] ? " - " + $json["Interpret"] : "") }}'),
      emailFormat: 'html',
      html: expr('{{ "<h2>" + $json["Songtitel"] + "</h2><p><strong>Interpret:</strong> " + ($json["Interpret"] || "-") + "</p><h3>Stil-DNA</h3><pre>" + ($json["Stil DNA"] || "") + "</pre>" }}'),
      options: { appendAttribution: false }
    }
  }
});

const fehlerSenden = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Fehler senden',
    credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: {
      resource: 'message',
      operation: 'sendMessage',
      chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ "Song nicht gefunden: *" + $json.songTitle + "*" }}'),
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' }
    }
  }
});

// ── BATCH PATH ────────────────────────────────────────────────────────────────
const geniusSucheBatch = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: {
    name: 'Genius Suche Batch',
    onError: 'continueErrorOutput',
    parameters: {
      method: 'GET',
      url: expr('{{ "https://api.genius.com/search?q=" + encodeURIComponent(($json.artist || "") + " " + ($json.songTitle || "")) }}'),
      sendHeaders: true,
      headerParameters: { parameters: [
        { name: 'Authorization', value: 'Bearer WbB--ybyl9eUkl_leDuZ2E5rWqqdo5XNMvBCor6WhK4dYNicIHEXqp4UkyPonOQX' }
      ]},
      options: { response: { response: { responseFormat: 'json', neverError: true } }, timeout: 15000 }
    }
  }
});

const geniusSongUrlBatchExtrahieren = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Genius Song URL Batch',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const passthrough = $('Song Lade Passthrough').item.json;
let songUrl = '';
try {
  const hits = (item.json.response && item.json.response.hits) ? item.json.response.hits : [];
  for (let h = 0; h < hits.length; h++) {
    const r = hits[h].result;
    if (r && r.url) { songUrl = r.url; break; }
  }
} catch(e) { songUrl = ''; }
return { json: Object.assign({}, passthrough, { geniusSongUrl: songUrl }) };`
    }
  }
});

const lrclibBatch = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: {
    name: 'Lrclib Lyrics Batch',
    onError: 'continueErrorOutput',
    parameters: {
      method: 'GET',
      url: expr('{{ "https://lrclib.net/api/get?artist_name=" + encodeURIComponent($json.artist || "") + "&track_name=" + encodeURIComponent($json.songTitle || "") + "&album_name=" + encodeURIComponent($json.album || "") }}'),
      options: { response: { response: { responseFormat: 'json', neverError: true } }, timeout: 15000 }
    }
  }
});

// ── FALLBACK 1: lrclib SEARCH (fuzzy match — catches "Remastered", live, etc.) ─
const lrclibSearchBatch = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: {
    name: 'Lrclib Search Batch',
    onError: 'continueErrorOutput',
    parameters: {
      method: 'GET',
      url: expr('{{ "https://lrclib.net/api/search?artist_name=" + encodeURIComponent($json.artist || "") + "&track_name=" + encodeURIComponent(($json.songTitle || "").replace(/\\s*(Remastered|Instrumental|Live|Remix|Radio Edit|Extended|Edit).*$/i, "").trim()) }}'),
      options: { response: { response: { responseFormat: 'text', neverError: true } }, timeout: 15000 }
    }
  }
});

const lrclibSearchExtrahierenBatch = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Lrclib Search Extrahieren Batch',
    onError: 'continueErrorOutput',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const passthrough = $('Song Lade Passthrough').item.json;
let geniusSongUrl = '';
try { geniusSongUrl = $('Genius Song URL Batch').item.json.geniusSongUrl || ''; } catch(e) {}
let results = [];
try { results = JSON.parse(item.json.data || item.json.body || '[]'); } catch(e) {}
if (!Array.isArray(results)) results = [];
let lyrics = '';
for (let i = 0; i < Math.min(results.length, 5); i++) {
  if (results[i] && results[i].plainLyrics && results[i].plainLyrics.length > 20) {
    lyrics = results[i].plainLyrics; break;
  }
}
if (!lyrics || lyrics.length < 20) throw new Error('Lrclib search: no lyrics found');
return { json: Object.assign({}, passthrough, { lyrics: lyrics.substring(0, 45000), lyrics_kurz: lyrics.substring(0, 2000), songUrl: geniusSongUrl }) };`
    }
  }
});

// ── FALLBACK 2: ChartLyrics (breite Abdeckung, kein Auth nötig) ───────────────
const chartLyricsSearchBatch = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.4,
  config: {
    name: 'ChartLyrics Search Batch',
    onError: 'continueErrorOutput',
    parameters: {
      method: 'GET',
      url: expr('{{ "http://api.chartlyrics.com/SearchLyricDirect?artist=" + encodeURIComponent($json.artist || "") + "&song=" + encodeURIComponent(($json.songTitle || "").replace(/\\s*(Remastered|Instrumental|Live|Remix|Radio Edit|Extended|Edit).*$/i, "").trim()) }}'),
      options: { response: { response: { responseFormat: 'text', neverError: true } }, timeout: 20000 }
    }
  }
});

const chartLyricsExtrahierenBatch = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'ChartLyrics Extrahieren Batch',
    onError: 'continueErrorOutput',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const passthrough = $('Song Lade Passthrough').item.json;
let geniusSongUrl = '';
try { geniusSongUrl = $('Genius Song URL Batch').item.json.geniusSongUrl || ''; } catch(e) {}
const xmlText = item.json.data || item.json.body || '';
const match = xmlText.match(/<Lyric>([\\s\\S]*?)<\\/Lyric>/);
let lyrics = match ? match[1].trim() : '';
if (!lyrics || lyrics.length < 20) throw new Error('ChartLyrics: no lyrics found');
return { json: Object.assign({}, passthrough, { lyrics: lyrics.substring(0, 45000), lyrics_kurz: lyrics.substring(0, 2000), songUrl: geniusSongUrl }) };`
    }
  }
});

// ── FALLBACK 3: Songtexte.com via SSH Playwright ──────────────────────────────
const songtexteConfigBatch = node({
  type: 'n8n-nodes-base.ssh', version: 1,
  config: {
    name: 'Songtexte Config Batch',
    onError: 'continueErrorOutput',
    credentials: { sshPassword: { id: 'KTmZVW20BNBjTZMx', name: 'SSH SERVER' } },
    parameters: {
      command: expr("=printf '%s' '{{ JSON.stringify({artist: $json.artist, song: $json.songTitle}) }}' > /tmp/st_cfg_batch.json && echo 'Config OK'")
    }
  }
});

const SONGTEXTE_SCRIPT_BATCH = `const{chromium}=require('/opt/fb-scraper/node_modules/playwright-extra');const S=require('/opt/fb-scraper/node_modules/puppeteer-extra-plugin-stealth');chromium.use(S());const fs=require('fs');const cfg=JSON.parse(fs.readFileSync('/tmp/st_cfg_batch.json','utf8'));const artist=cfg.artist||'';const song=cfg.song||'';const query=(artist+' '+song).trim();(async()=>{let cp='';try{cp=require('child_process').execSync('find /root/.cache/ms-playwright -name "chrome" -type f 2>/dev/null').toString().trim().split('\\n')[0];}catch(e){}const b=await chromium.launch({executablePath:cp,headless:true,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage']});const ctx=await b.newContext({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',viewport:{width:1280,height:800}});const p=await ctx.newPage();try{const searchUrl='https://www.songtexte.com/search?q='+encodeURIComponent(query);await p.goto(searchUrl,{waitUntil:'domcontentloaded',timeout:30000});await p.waitForTimeout(3000);let songUrl='';try{const links=await p.$$eval('a[href]',els=>els.map(e=>e.href).filter(h=>h&&/songtexte\\.com\\/songtext\\//.test(h)));if(links.length)songUrl=links[0];}catch(e){}if(!songUrl){console.log(JSON.stringify({error:'no_results',query:query}));await b.close();return;}await p.goto(songUrl,{waitUntil:'domcontentloaded',timeout:30000});await p.waitForTimeout(2000);let title='';try{title=await p.$eval('h1',el=>el.innerText.trim());}catch(e){}let lyrics='';try{lyrics=await p.$eval('#songtext',el=>el.innerText.trim());}catch(e){}if(!lyrics){try{lyrics=await p.$$eval('[id*="songtext"],[class*="songtext"],[class*="lyric"],[id*="lyric"]',els=>els.map(e=>e.innerText.trim()).filter(t=>t.length>20).join('\\n\\n'));}catch(e){}}if(!lyrics||lyrics.trim().length<20){console.log(JSON.stringify({error:'no_lyrics',url:songUrl}));await b.close();return;}console.log(JSON.stringify({ok:true,lyrics:lyrics.substring(0,45000),url:songUrl,title:title.substring(0,300),artist:artist,song:song}));}catch(e){console.log(JSON.stringify({error:'exception',detail:String(e.message).slice(0,400)}));}await b.close();})();`;

const songtexteScriptBatch = node({
  type: 'n8n-nodes-base.ssh', version: 1,
  config: {
    name: 'Songtexte Script Batch',
    onError: 'continueErrorOutput',
    credentials: { sshPassword: { id: 'KTmZVW20BNBjTZMx', name: 'SSH SERVER' } },
    parameters: { command: `cat << 'JSEOF' > /tmp/st_batch.js\n${SONGTEXTE_SCRIPT_BATCH}\nJSEOF\necho "Script OK"` }
  }
});

const songtexteRunBatch = node({
  type: 'n8n-nodes-base.ssh', version: 1,
  config: {
    name: 'Songtexte Run Batch',
    onError: 'continueErrorOutput',
    credentials: { sshPassword: { id: 'KTmZVW20BNBjTZMx', name: 'SSH SERVER' } },
    parameters: { command: 'timeout 60 node /tmp/st_batch.js 2>&1 || echo \'{"error":"timeout","detail":"Playwright timed out after 60s"}\'' }
  }
});

const songtexteExtrahierenBatch = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Songtexte Extrahieren Batch',
    onError: 'continueErrorOutput',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const passthrough = $('Song Lade Passthrough').item.json;
let geniusSongUrl = '';
try { geniusSongUrl = $('Genius Song URL Batch').item.json.geniusSongUrl || ''; } catch(e) {}
const stdout = item.json.stdout || '';
const lines = stdout.split('\\n');
let result = null;
for (let i = lines.length - 1; i >= 0; i--) {
  const l = lines[i].trim();
  if (l.startsWith('{')) { try { result = JSON.parse(l); break; } catch(e) {} }
}
if (!result) throw new Error('Songtexte: Kein JSON-Output. stdout: ' + stdout.slice(0, 200));
if (result.error) throw new Error('Songtexte: ' + result.error);
let lyrics = (result.lyrics || '').trim();
const cutIdx = lyrics.indexOf('Lyrics powered by');
if (cutIdx > 50) lyrics = lyrics.substring(0, cutIdx).trim();
const songtextMarker = lyrics.toUpperCase().lastIndexOf(' SONGTEXT');
if (songtextMarker > 0) {
  const afterMarker = lyrics.indexOf('\\n', songtextMarker);
  if (afterMarker > 0) lyrics = lyrics.substring(afterMarker + 1).trim();
}
if (!lyrics || lyrics.length < 20) throw new Error('Songtexte: Lyrics leer nach Bereinigung');
return { json: Object.assign({}, passthrough, { lyrics: lyrics.substring(0, 45000), lyrics_kurz: lyrics.substring(0, 2000), songUrl: geniusSongUrl || result.url || '' }) };`
    }
  }
});

const lyricsNotFound = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Lyrics Not Found',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `return { json: Object.assign({}, $('Song Lade Passthrough').item.json, { lyrics: '', lyrics_kurz: '' }) };`
    }
  }
});

const ergebnisBatchNoLyrics = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Ergebnis Batch No Lyrics', parameters: { mode: 'runOnceForEachItem',
    jsCode: `const d = item.json;
return { json: {
  'Interpret': d.artist || '',
  'Kuenstler AKA': d.artistAka || '',
  'Kuenstler Bio': d.artistBio || '',
  'Songtitel': d.songTitle || '',
  'Lyrics': '[Lyrics nicht gefunden]',
  'Genius URL': d.songUrl || '',
  'Album': d.album || '',
  'Erscheinungsjahr': d.release_year || '',
  'Featured Artists': d.feat_artists || '',
  'Stil DNA': '[Keine Lyrics verfügbar]',
  'Quelle': d.source || '',
  'Abgerufen am': new Date().toISOString().split('T')[0],
  'chatId': d.chatId,
  'artist': d.artist,
  'songTitle': d.songTitle,
  'songIndex': d.songIndex || 0,
  'songTotal': d.songTotal || 10
} };` } }
});

const sheetsBatchNoLyrics = node({
  type: 'n8n-nodes-base.googleSheets', version: 4.5,
  config: { name: 'Sheets Batch No Lyrics', credentials: { googleSheetsOAuth2Api: { id: 'oNARbQVtBeLd1FF3', name: 'Google Sheets account' } },
    parameters: { resource: 'sheet', operation: 'append',
      documentId: { __rl: true, mode: 'id', value: '1jJkYxSQMuD7EQtpjQOc94UgIOgRyIRHRBpoIuVmtaLg' },
      sheetName: { __rl: true, mode: 'id', value: '0' },
      columns: { mappingMode: 'autoMapInputData', schema: [] }, options: {} } }
});

const telegramNoLyricsBatch = node({
  type: 'n8n-nodes-base.telegram', version: 1.2,
  config: { name: 'Telegram No Lyrics Batch', credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: { resource: 'message', operation: 'sendMessage', chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ "⏭ *" + $json.songTitle + "* (" + ($json.songIndex || "?") + "/" + ($json.songTotal || 15) + ") – keine Lyrics gefunden, übersprungen.\\n\\n_⏳ 30 Sek. Pause..._" }}'),
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' } } }
});

const pause30SekundenError = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Pause 30 Sekunden Error', parameters: { mode: 'runOnceForEachItem',
    jsCode: `await new Promise(function(resolve) { setTimeout(resolve, 30000); });
return { json: item.json };` } }
});

const lyricsExtrahierenBatch = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    onError: 'continueErrorOutput',
    name: 'Lyrics extrahieren Batch',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const passthrough = $('Song Lade Passthrough').item.json;
let geniusSongUrl = '';
try { geniusSongUrl = $('Genius Song URL Batch').item.json.geniusSongUrl || ''; } catch(e) {}
let lyrics = (item.json && item.json.plainLyrics) || '';
if (!lyrics || lyrics.length < 20) throw new Error('lrclib: Keine Lyrics gefunden');
return { json: Object.assign({}, passthrough, { lyrics: lyrics.substring(0, 45000), lyrics_kurz: lyrics.substring(0, 2000), songUrl: geniusSongUrl }) };`
    }
  }
});

// Passthrough nach Lyrics Gefunden Nachricht — stellt Songdaten wieder her
const lyricsPassthrough = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Lyrics Batch Passthrough',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `let d = null;
try { d = $('Lyrics extrahieren Batch').item.json; } catch(e) {}
if (!d || !d.artist) { try { d = $('Lrclib Search Extrahieren Batch').item.json; } catch(e) {} }
if (!d || !d.artist) { try { d = $('ChartLyrics Extrahieren Batch').item.json; } catch(e) {} }
if (!d || !d.artist) { try { d = $('Songtexte Extrahieren Batch').item.json; } catch(e) {} }
return { json: d || {} };`
    }
  }
});

// ── ANALYSE BATCH (ersetzt Ollama Analyse Batch) ──────────────────────────────
const analyseBatch = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Ollama Analyse Batch',
    parameters: { mode: 'runOnceForEachItem', jsCode: ANALYSE_CODE }
  }
});

const ergebnisBatch = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Ergebnis Batch 2',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const d = item.json;
return { json: {
  'Interpret': d.artist || '',
  'Songtitel': d.songTitle || '',
  'Lyrics': (d.lyrics || '').substring(0, 45000),
  'Genius URL': d.songUrl || ''
} };`
    }
  }
});

const sheetsVorbereitung = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Sheets Vorbereitung',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const d = $('Ergebnis Batch').item.json;
return { json: {
  'Interpret': d['Interpret'] || '',
  'Songtitel': d['Songtitel'] || '',
  'Lyrics': d['Lyrics'] || '',
  'Genius URL': d['Genius URL'] || ''
} };`
    }
  }
});

const sheetsBatch = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.5,
  config: {
    name: 'Sheets Batch',
    credentials: { googleSheetsOAuth2Api: { id: 'oNARbQVtBeLd1FF3', name: 'Google Sheets account' } },
    parameters: {
      resource: 'sheet',
      operation: 'append',
      documentId: { __rl: true, mode: 'id', value: '1jJkYxSQMuD7EQtpjQOc94UgIOgRyIRHRBpoIuVmtaLg' },
      sheetName: { __rl: true, mode: 'id', value: '0' },
      columns: { mappingMode: 'autoMapInputData', schema: [] },
      options: {}
    }
  }
});

const duplikatLesenBatch = node({
  type: 'n8n-nodes-base.googleSheets',
  version: 4.5,
  config: {
    name: 'Duplikat Lesen Batch',
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

const duplikatPruefenBatch = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Duplikat Pruefen Batch',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: `const rows = items.map(function(i) { return i.json; });
const interpret = $('Ergebnis Batch 2').item.json['Interpret'] || '';
const songtitel = $('Ergebnis Batch 2').item.json['Songtitel'] || '';
const isDuplicate = rows.some(function(r) {
  return (r['Interpret'] || '').toLowerCase().trim() === interpret.toLowerCase().trim() &&
         (r['Songtitel'] || '').toLowerCase().trim() === songtitel.toLowerCase().trim();
});
return [{ json: { isDuplicate: isDuplicate, interpret: interpret, songtitel: songtitel } }];`
    }
  }
});

const istKeinDuplikat = ifElse({
  version: 2.2,
  config: {
    name: 'Ist kein Duplikat?',
    parameters: {
      conditions: {
        options: { caseSensitive: false, leftValue: '', typeValidation: 'loose' },
        conditions: [{ leftValue: expr('{{ $json.isDuplicate }}'), operator: { type: 'boolean', operation: 'false' } }],
        combinator: 'and'
      }
    }
  }
});

const duplikatUebersprungen = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Duplikat Uebersprungen',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `return { json: item.json };`
    }
  }
});

// Vor dem Laden: "Song X/10: Titel wird geladen"
const songLadeStatusNachricht = node({
  type: 'n8n-nodes-base.telegram', version: 1.2,
  config: { name: 'Song Lade Status', credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: { resource: 'message', operation: 'sendMessage', chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ "🎵 Song " + ($json.songIndex || "?") + "/" + ($json.songTotal || 15) + ": *" + $json.songTitle + "*\\n⏳ Lade Lyrics..." }}'),
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' } } }
});

// Passthrough nach Song Lade Status — stellt songUrl etc. wieder her
const songLadePassthrough = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Song Lade Passthrough',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const allSongs = $('Merge Song Listen').all();
const idx = $('Pro Song Batch').context.currentRunIndex || 0;
const total = allSongs.length || 10;
const songData = allSongs[idx] ? allSongs[idx].json : {};
return { json: Object.assign({}, songData, { songIndex: idx + 1, songTotal: total }) };`
    }
  }
});

/// Nach Lyrics-Extraktion: Ausschnitt senden
const lyricsGefundenNachricht = node({
  type: 'n8n-nodes-base.telegram', version: 1.2,
  config: { name: 'Lyrics Gefunden Nachricht', credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: { resource: 'message', operation: 'sendMessage', chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ "📄 Lyrics für *" + $json.songTitle + "*" + ($json.album ? " (" + $json.album + ($json.release_year ? ", " + $json.release_year : "") + ")" : "") + ":\\n\\n```\\n" + ($json.lyrics_kurz || "").substring(0, 400) + "...\\n```" }}'),
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' } } }
});

// Passthrough nach Sheets Batch — stellt Ergebnis-Daten wieder her
const ergebnisBatchPassthrough = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Ergebnis Batch Passthrough',
    parameters: {
      mode: 'runOnceForEachItem',
      jsCode: `const s = $('Song Lade Passthrough').item.json;
const d = $('Ergebnis Batch 2').item.json;
return { json: {
  'Songtitel': d['Songtitel'] || '',
  'chatId': s.chatId || '',
  'songIndex': s.songIndex || 0,
  'songTotal': s.songTotal || 10,
  'artist': s.artist || ''
} };`
    }
  }
});

const telegramSongErfolgBatch = node({
  type: 'n8n-nodes-base.telegram', version: 1.2,
  config: { name: 'Telegram Song Erfolg Batch', credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: { resource: 'message', operation: 'sendMessage', chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ "✅ *" + $json["Songtitel"] + "* (" + ($json.songIndex || "?") + "/" + ($json.songTotal || 10) + ") gespeichert!\\n_⏳ 30 Sek. Pause..._" }}'),
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' } } }
});

// 30 Sekunden Pause zwischen Songs
const pause30Sekunden = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Pause 30 Sekunden', parameters: { mode: 'runOnceForEachItem',
    jsCode: `await new Promise(function(resolve) { setTimeout(resolve, 30000); });
return { json: item.json };` } }
});

const batchFertigAggregat = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Batch Fertig 2',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: `let chatId = '';
let artist = '';
let total = 10;
try {
  const s = $('Song Lade Passthrough').all();
  if (s && s.length > 0) {
    chatId = s[s.length - 1].json.chatId || '';
    artist = s[s.length - 1].json.artist || s[s.length - 1].json.artistName || '';
  }
} catch(e) {}
try { total = $('Pro Song Batch').context.maxRunIndex || 10; } catch(e) {}
return [{ json: { chatId, artist, total } }];`
    }
  }
});

const artistFertigNachricht = node({
  type: 'n8n-nodes-base.telegram',
  version: 1.2,
  config: {
    name: 'Artist Fertig Nachricht',
    credentials: { telegramApi: { id: 'gWXjrrJ3u7XBFEPO', name: 'Telegram account' } },
    parameters: {
      resource: 'message',
      operation: 'sendMessage',
      chatId: expr('{{ $json.chatId }}'),
      text: expr('{{ "🎉 *Fertig!* Top-" + ($json.total || 10) + " Songs von *" + $json.artist + "* verarbeitet — alle gefundenen Lyrics sind im Sheet gespeichert." }}'),
      additionalFields: { appendAttribution: false, parse_mode: 'Markdown' }
    }
  }
});

const emailBatchBericht = node({
  type: 'n8n-nodes-base.emailSend',
  version: 2.1,
  config: {
    name: 'E-Mail Batch Bericht',
    credentials: { smtp: { id: 'LxLg9nFpoHESQMxv', name: 'SMTP account' } },
    parameters: {
      fromEmail: 'nokidoc@hotmail.com',
      toEmail: 'nokidoc@hotmail.com',
      subject: expr('{{ "Stil-DNA: " + $json.artist + " (" + $json.count + " Songs)" }}'),
      emailFormat: 'html',
      html: expr('{{ "<h2>Analyse abgeschlossen</h2><p><strong>Kuenstler:</strong> " + $json.artist + "</p><p><strong>Songs (" + $json.count + "):</strong><br>" + ($json.songListe || "").split(", ").join("<br>") + "</p>" }}'),
      options: { appendAttribution: false }
    }
  }
});

const proSongBatch = splitInBatches({
  version: 3,
  config: { name: 'Pro Song Batch', parameters: { batchSize: 1 } }
});

// ── MANUELLER TEST-TRIGGER ────────────────────────────────────────────────────
const manualTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Manueller Test-Trigger', parameters: {} }
});

const manualTestInput = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Manual Test Input',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: `// Testdaten – Artist und echte chatId des Nutzers
return [{ json: { rawInput: 'Azet', chatId: '6136860005', inputType: 'artist' } }];`
    }
  }
});

// ── WORKFLOW ──────────────────────────────────────────────────────────────────
export default workflow('AfcEeD4NpFPKMbvy', 'Telegram Song-Analyse (Spotify / YouTube / Text / Künstler)')
  .add(manualTrigger).to(manualTestInput).to(artistVorbereiten)
  .add(telegramTrigger).to(inputParsen)
  .to(istUrl
    .onTrue(oembedAbrufen.to(titelAusOembed).to(mergeSingleSong.input(0)))
    .onFalse(hatBindestrich
      .onTrue(titelAusText.to(mergeSingleSong.input(1)))
      .onFalse(artistVorbereiten.to(artistStartNachricht).to(artistDataDurchleiten)
        .to(geniusApiArtistSuche).to(artistIdExtrahieren)
        .to(hatArtistId
          .onTrue(geniusApiTopSongs.to(songsAusApiExtrahieren).to(mergeSongListen.input(0)))
          .onFalse(geniusArtistSeite.to(songListeExtrahieren).to(mergeSongListen.input(1)))
        )
      )
    )
  )
  .add(mergeSingleSong)
  .to(analyseStartenNachricht).to(songDatenDurchleiten)
  .to(geniusApiSongSuche).to(songUrlAusApiExtrahieren)
  .to(hatApiSongUrl
    .onTrue(urlApiPassthrough.to(mergeSongUrl.input(0)))
    .onFalse(geniusSuche.to(songUrlHtmlExtrahieren).to(mergeSongUrl.input(1)))
  )
  .add(mergeSongUrl)
  .to(songGefunden
    .onTrue(songSeiteGeladen.to(lyricsExtrahieren)
      .to(ergebnisZusammenfuehren).to(sheetsVorbereitungSingle).to(inGoogleSheetsEintragen).to(ergebnisSenden))
    .onFalse(fehlerSenden)
  )
  .add(mergeSongListen)
  .to(proSongBatch
    .onDone(batchFertigAggregat.to(artistFertigNachricht))
    .onEachBatch(songLadeStatusNachricht.to(songLadePassthrough).to(geniusSucheBatch).to(geniusSongUrlBatchExtrahieren).to(lrclibBatch).to(lyricsExtrahierenBatch)
      .to(lyricsPassthrough).to(ergebnisBatch).to(duplikatLesenBatch).to(duplikatPruefenBatch)
      .to(istKeinDuplikat
        .onTrue(sheetsBatch.to(ergebnisBatchPassthrough).to(telegramSongErfolgBatch).to(pause30Sekunden).to(nextBatch(proSongBatch)))
        .onFalse(duplikatUebersprungen)
      ))
  )
  .add(duplikatUebersprungen.to(nextBatch(proSongBatch)))
  .add(geniusSucheBatch.onError(lyricsNotFound))
  // lrclib exact miss (HTTP error or no lyrics) → lrclib fuzzy search → ChartLyrics → Songtexte → give up
  .add(lrclibBatch.onError(lrclibSearchBatch))
  .add(lyricsExtrahierenBatch.onError(lrclibSearchBatch))
  .add(lrclibSearchBatch.to(lrclibSearchExtrahierenBatch))
  .add(lyricsGefundenNachricht.to(lyricsPassthrough))
  .add(lrclibSearchExtrahierenBatch.to(lyricsGefundenNachricht))
  .add(lrclibSearchExtrahierenBatch.onError(chartLyricsSearchBatch))
  .add(lrclibSearchBatch.onError(chartLyricsSearchBatch))
  .add(chartLyricsSearchBatch.to(chartLyricsExtrahierenBatch))
  .add(chartLyricsExtrahierenBatch.to(lyricsGefundenNachricht))
  .add(chartLyricsExtrahierenBatch.onError(songtexteConfigBatch))
  .add(chartLyricsSearchBatch.onError(songtexteConfigBatch))
  .add(songtexteConfigBatch.to(songtexteScriptBatch).to(songtexteRunBatch).to(songtexteExtrahierenBatch))
  .add(songtexteExtrahierenBatch.to(lyricsGefundenNachricht))
  .add(songtexteExtrahierenBatch.onError(lyricsNotFound))
  .add(songtexteConfigBatch.onError(lyricsNotFound))
  .add(lyricsNotFound.to(pause30SekundenError).to(nextBatch(proSongBatch)));
