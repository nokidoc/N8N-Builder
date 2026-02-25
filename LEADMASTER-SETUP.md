# 🚀 LEADMASTER – PLZ-basierter Lead Scraper

## ✨ Übersicht

**LEADMASTER** ist ein n8n Workflow, der:
- ✅ PLZ-Kombinationen aus Google Sheets generiert
- ✅ URLs von **gelbeseiten.de** und **dastelefonbuch.de** scrapped
- ✅ Detailseiten crawlt und Firmendaten extrahiert
- ✅ Duplikate prüft und Master-Datenbank aktualisiert
- ✅ Mit Rate Limiting und Fehlerbehandlung arbeitet
- ✅ Telegram-Benachrichtigungen sendet

## 📋 Komponenten

### Dateistruktur
```
/home/user/N8N-Builder/
├── workflow-complete.js        # ✅ Komplette Workflow-Definition
├── deploy-workflow.js          # 🚀 Deploy-Script zu n8n
├── test-workflow.js           # 🧪 Lokale Tests
├── build-workflow.js          # 🔨 Builder (fallback)
└── LEADMASTER-SETUP.md        # 📖 Diese Datei
```

### Google Sheets (müssen bereits existieren)

| Dateiname | Sheet ID | Zweck |
|-----------|----------|-------|
| Abfrage Tabelle | `1ySGkyk6JYyo7m4E9FuPmuFhxAov3q2xFv1nUQTwomqA` | **Blatt "Abfrage"**: User-Input (Ort, Branche)<br>**Blatt "Abfrage_Kombiniert"**: Generierte PLZ-Kombinationen<br>**Blatt "URL_Queue"**: URLs zum Crawlen |
| PLZ Datenbank | `12o5DdRCV7nwSA66EkXen2xjYWCzI2F4rPScg-8QxZLw` | PLZ → Stadt Mapping |
| Master Sheet | `1jpLnSCLQRD5PWzI0_bHIC89QsaXLNOPI0mKrNOWPGJY` | Finales Master mit allen Firmendaten |

### Google Sheets - Blatt-Strukturen

#### 1. "Abfrage" (INPUT)
```
| A (Ort)        | B (Branche)    |
|---|---|
| Düsseldorf     | Friseur        |
| Köln           | Maler          |
| Berlin         | Restaurants    |
```

#### 2. "Abfrage_Kombiniert" (AUTO-GENERIERT)
```
| A (PLZ)  | B (Stadt)     | C (Branche) | D (Status_GS) | E (Status_TB) |
|---|---|---|---|---|
| 40227    | Düsseldorf    | Friseur     |               |               |
| 40210    | Düsseldorf    | Friseur     |               |               |
```

#### 3. "URL_Queue" (AUTO-GENERIERT)
```
| A (url) | B (firmenname) | C (plz) | D (branche) | E (quelle) | F (status) | G (versuche) |
|---|---|---|---|---|---|---|
| https://... | Friseur XY | 40227 | Friseur | GS | offen | 0 |
```

#### 4. "Master" (FINALES RESULTAT)
```
| master_id | Firmenname | Strasse | PLZ | Stadt | Telefon | Email | ... |
|---|---|---|---|---|---|---|---|
| 40227-FRIS-0001 | Friseur Müller | Königstr. 5 | 40227 | Düsseldorf | 0211... | ... | ... |
```

## 🔧 Setup & Installation

### Schritt 1: Workflow validieren (lokal)
```bash
node test-workflow.js
# Erwartet: ✅ ALLE TESTS BESTANDEN (5/5)
```

### Schritt 2: Zu n8n deployen
```bash
node deploy-workflow.js
# Erwartet: ✅ Workflow erfolgreich erstellt!
```

Wenn Netzwerk nicht erreichbar:
- Workflow manuell importieren: `workflow-complete.js` als JSON kopieren
- Oder über n8n UI: "Import" → Paste-Workflow

### Schritt 3: Credentials in n8n konfigurieren

1. **Google Sheets OAuth2**
   - Node: "Abfrage laden" (und alle anderen GS-Nodes)
   - Click: "Edit Credentials"
   - Authenticate with your Google account
   - Gib Google Sheets Zugriff

2. **Telegram Bot**
   - Node: "Telegram Finish"
   - Bot Token: `8348680663:AAETChGMdu5QzQaO4fjoN7sx2xHY1vziJfY`
   - Chat ID: `6136860005`

## 🧪 Selbst-Test durchführen

### Test 1: PLZ-Kombinationen
1. In Google Sheet "Abfrage" eintragen:
   - **A**: Düsseldorf
   - **B**: Friseur
2. Workflow manuell ausführen
3. Prüfen: "Abfrage_Kombiniert" → Mindestens 5 PLZ-Zeilen?

### Test 2: URLs sammeln
1. Nach Step 1 prüfen: "URL_Queue" Blatt
2. Erwartung: **Mind. 10 URLs** (Mix aus GS + TB)
3. Spalten: url, firmenname_vorschau, plz, branche, quelle, status, versuche

### Test 3: Detailseiten crawlen
1. Nach URL-Sammlung prüfen: "Master" Sheet
2. Erwartung: **Mind. 5 neue Einträge**
3. Felder gefüllt: Firmenname, Strasse, Telefon, Stadt, PLZ

### Test 4: Fehlerbehandlung
1. Prüfen: "URL_Queue" → Status-Updates?
2. Wenn Fehler: versuche += 1
3. Nach 3 Versuchen: status = "Fehler"

## ⚙️ Workflow-Ablauf (Detailliert)

### SCHRITT 1: Abfrage & PLZ-Kombinationen (ca. 3-5 Sekunden)
```
Start
  ↓
[1a] Abfrage laden (GS)
  + [1b] PLZ Datenbank laden
  ↓
[1c] Code: PLZ Kombinationen generieren
  ↓
[1d] Append in "Abfrage_Kombiniert"
  ↓
[1e] Load aktive Kombinationen (nur offene)
  ↓
[1f] Filter & Split in Batches (1 PLZ pro Durchlauf)
```

**Logik:**
- Für jedes Ort + Branche Paar
- Finde alle PLZ für diesen Ort
- Erstelle Kombination (PLZ, Stadt, Branche)
- Speichere in GS

### SCHRITT 2a: Gelbeseiten URLs sammeln
```
[2a] GS: URL bauen
  ↓
[2b] GS: HTTP Request (Pagination Loop bis max 10)
  ↓ (Delay: 3-5 Sekunden)
[2c] GS: Parse mit Cheerio
  ↓
[2d] Append URLs in "URL_Queue"
```

**Details:**
- URL: `https://www.gelbeseiten.de/suche/{branche}/{plz}`
- Pagination: `?pageNum=1,2,3...`
- Header: User-Agent Rotation
- Parse: `<article>` → Link + Name
- Status: "offen"

### SCHRITT 2b: Telefonbuch URLs sammeln
```
[3a] TB: URL bauen
  ↓
[3b] TB: HTTP Request (JSON-Response, Pagination)
  ↓ (Delay: 5-10 Sekunden nach GS)
[3c] TB: Parse JSON
  ↓
[3d] Append URLs in "URL_Queue"
```

**Details:**
- URL: `https://www.dastelefonbuch.de/Suche/{branche}/{plz}`
- Header: `Accept: application/vnd.de.it2media.tb.ipad.v2+json`
- Parse: `hitlist.hits[]`

### SCHRITT 3: URL_Queue abarbeiten
```
[4a] URL_Queue laden
  ↓
[4b] Filter: nur status="offen" && versuche<3
  ↓
[4c] Split in Batches (1 URL pro Durchlauf)
  ↓
[4d] Delay (3-6s random + Rate Limits)
  ↓
[4e] Switch: GS oder TB?
  ├─→ [4f] GS: HTTP Detail Request
  │     ↓
  │     [4g] GS: Parse mit Cheerio
  │
  └─→ [4h] TB: HTTP Detail Request
        ↓
        [4i] TB: Parse JSON
```

**Delay-Strategie:**
- Random: 3-6 Sekunden
- Nach 50 URLs: +2 Minuten Pause
- Nach 200 URLs: +10 Minuten Pause

### SCHRITT 4: Master-Update & Duplikat-Check
```
[4j] Master laden (aktuell)
  ↓
[4k] Code: Duplikat-Check & Action
  ├─→ Score >= 60? → UPDATE Mode
  └─→ Score < 60? → INSERT Mode
  ↓
[4l] Switch: INSERT oder UPDATE?
  ├─→ [4m] Append Zeile
  └─→ [4n] Update bestehende Zeile
  ↓
[4o] URL_Queue: status = "erledigt"
  ↓
[Telegram] Bot: "Scraping fertig!"
```

**Duplikat-Matching:**
- Name-Normalisierung (GmbH, Co., etc. entfernen)
- Score: Firmenname (50) + PLZ (30) + Telefon (40)
- **>=60**: Anreichern (fehlende Felder füllen)
- **<60**: Neuer Eintrag

## 📊 Rate Limits & Anti-Block

```javascript
// Random Delay zwischen Requests
const delay = Math.floor(Math.random() * 3000) + 3000; // 3-6 Sekunden

// Automatische Pausen
if (index % 200 === 0) pause = 10 * 60 * 1000;    // Nach 200: 10 Min
if (index % 50 === 0)  pause = 2 * 60 * 1000;     // Nach 50: 2 Min

// User-Agent Rotation
const agents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Firefox/121.0'
];
```

## 🚨 Fehlerbehandlung

| Fehler | Behandlung |
|--------|-----------|
| HTTP 429 (Too Many Requests) | Warte 15 Min, retry |
| Timeout | versuche += 1, weiter |
| Parse-Error | Logg Error, status = "error" bei versuche=3 |
| Google Sheets Error | Continue On Fail = true |

## 📈 Monitoring

### Workflow-Execution überprüfen
1. n8n UI → Workflow öffnen
2. Click: "Execution History"
3. Prüfe: Fehler in den einzelnen Nodes

### Debug-Ansätze

**Wenn keine PLZ-Kombinationen generiert:**
- Check: "Abfrage" Blatt hat Daten?
- Check: PLZ-Datenbank hat Mapping?

**Wenn keine URLs gesammelt:**
- Check: GS/TB Websites erreichbar?
- Check: HTTP Response 200 OK?
- Check: Parse-Code findet HTML-Elemente?

**Wenn Master nicht aktualisiert:**
- Check: Google Sheets Credentials aktiv?
- Check: Duplikat-Matching Score-Logik?
- Check: Master Sheet hat Kopfzeile?

## 🔗 Verbindungen & Datenfluss

```
Start ──→ Abfrage laden ────┐
          PLZ DB laden ─────┼──→ Code: Kombi ──→ GS Append ──→ Load & Filter
                                                            │
                                                            ├─→ GS: URL sammeln
                                                            │
                                                            ├─→ TB: URL sammeln
                                                            │
                                                            └─→ URL_Queue
                                                                    ↓
                                                            Code: Filter (offen)
                                                                    ↓
                                                            Code: Delay
                                                                    ↓
                                                            Switch: GS oder TB?
                                                            ├─→ GS Detail
                                                            └─→ TB Detail
                                                                    ↓
                                                            Master laden
                                                                    ↓
                                                            Duplikat-Check
                                                                    ↓
                                                            Switch: Insert/Update
                                                            ├─→ GS Append
                                                            └─→ GS Update
                                                                    ↓
                                                            URL_Queue Update
                                                                    ↓
                                                            Telegram Bot
```

## 🎯 Nächste Schritte nach Setup

1. **Testen** mit kleinem Datensatz (1-2 Orte)
2. **Fehler beheben** basierend auf Execution History
3. **Master Sheet validieren** (Firmen, Telefon, etc. korrekt?)
4. **Scale up** zu allen Orte/Branchen
5. **Produktiv nehmen** wenn alle Tests bestanden

## 📞 Support & Tipps

### Performance-Tuning
- Batch-Size erhöhen? (derzeit: 1 pro Loop, ok so!)
- Rate Limits reduzieren? (Vorsicht: Blocking-Risk!)
- Pagination-Limit senken? (derzeit: 10 Pages)

### Fehlerquellen
- ❌ HTTP 429 → Rate Limit erhöhen
- ❌ Timeout → Delay erhöhen
- ❌ Parse-Error → HTML-Struktur hat sich geändert, Code anpassen

## ✅ Checkliste vor Produktion

- [ ] Test 1 bestanden (PLZ-Kombinationen)
- [ ] Test 2 bestanden (URLs gesammelt)
- [ ] Test 3 bestanden (Master gefüllt)
- [ ] Test 4 bestanden (Fehlerbehandlung)
- [ ] Telegram Bot sendet Nachrichten
- [ ] Google Sheets Credentials aktiv
- [ ] Workflow ist **INAKTIV** (nicht publishen!)
- [ ] Git Push zur Feature-Branch abgeschlossen

---

**Status:** ✅ Ready to Deploy
**Nodes:** 32
**Connections:** 32
**Estimated Runtime:** ~10-30 Min pro 50 URLs (abhängig von Delays & Pagination)
