# Workflow-Anfrage Template V2.0

**Kopiere dieses Template und fülle es aus, BEVOR du eine neue Workflow-Anfrage stellst**

---

## 🔐 BASIS-KONFIGURATION (WICHTIG!)

**Diese Infos brauchst du NUR einmal zu füllen - dann kannst du sie immer wieder verwenden!**

Kopiere diese Sektion immer VOR deiner Workflow-Anfrage und gib sie dem GPT!

### N8N Setup
```
✅ Self-Hosted: n8n.werbeportalnrw.de
URL: https://n8n.werbeportalnrw.de
```

### Verfügbare Services & Credentials
```
✅ Google Maps API - Konfiguriert
✅ Google Sheets Integration - Konfiguriert  
✅ Telegram Bot - Konfiguriert
   Token: 8348680663:AAETChGMdu5QzQaO4fjoN7sx2xHY1vziJfY
   Chat-ID: 6136860005
✅ Browserless Chrome - Verfügbar (für Web-Scraping)
✅ Auto-Test Webhook - AKTIV & GETESTET
```

### Auto-Test System
```
STATUS: ✅ Aktiv
FUNKTION: Jeder neue Workflow wird automatisch getestet
NOTIFICATIONS: Via Telegram
RETRY: Automatisch 3x bei Fehler
```

### Wichtig zu wissen
```
- Auto-Test läuft AUTOMATISCH nach Workflow-Bau
- Keine manuellen Tests nötig
- Du bekommst Telegram-Nachricht wenn fertig
- Workflow wird als INAKTIV gespeichert (du aktivierst manual)
```

---

## 📋 ALLGEMEINE INFOS

### Workflow-Name
```
[Kurzer, prägnanter Name]
Beispiel: "Lead-Gen Google Maps Berlin"
```

### Kurzbeschreibung (1-2 Sätze)
```
[Was soll der Workflow konkret tun?]
```

---

## 🎯 ZIEL & ANFORDERUNGEN

### Primäres Ziel
```
[Was ist das Hauptziel?]
- Option: Daten sammeln
- Option: Automatisierung
- Option: Integration
- Option: Benachrichtigungen senden
- Option: Andere: ___________
```

### Nebenaspekte
```
[ ] Performance-kritisch?
[ ] Kostsensitiv? (viele API-Calls?)
[ ] Sicherheit wichtig? (sensible Daten?)
[ ] Häufige Ausführung? (täglich/stündlich/etc.)
```

---

## 📥 INPUT - Was geht rein?

### Trigger-Typ
```
Wähle einen:
[ ] Webhook (externe Auslösung)
[ ] Zeitbasiert (Zeitplan)
[ ] Manuell (Button-klick)
[ ] Andere Workflow (wird aufgerufen)
[ ] Cron Job
[ ] Andere: ___________
```

### Benötigte Input-Daten
```
[Was muss der Workflow eingeben?]

Beispiel:
- searchQuery: "Pizza Berlin" (String)
- maxResults: 10 (Number)
- radius: 5000 (Meter, Number)

Oder: "Trigger Button von bestimmtem Node"
```

### Test-Daten Beispiel
```
[Realistisches Beispiel für Test]

{
  "searchQuery": "Pizza Berlin",
  "maxResults": 10,
  "radius": 5000
}
```

---

## 📤 OUTPUT - Was geht raus?

### Output-Ziel
```
Wohin sollen die Daten?
[ ] Google Sheet
[ ] Telegram
[ ] JSON Response
[ ] CSV Export
[ ] Email
[ ] Andere Service: ___________
[ ] Mehrere Ziele: ___________
```

### Output-Struktur
```
[Wie soll die Ausgabe strukturiert sein?]

Beispiel:
{
  "businessName": "Pizzeria Luigi",
  "address": "Hauptstr. 1, Berlin",
  "phone": "030-123456",
  "rating": 4.5,
  "website": "https://...",
  "scrapedAt": "2026-02-14T14:30:00Z"
}

Oder bei Google Sheets:
Headers: Geschäft | Adresse | Telefon | Rating | Website
```

### Validierungskriterien
```
[Was macht einen erfolgreichen Test aus?]

Muss erfolgreich sein wenn:
- [ ] Mindestens X Datensätze zurückkommen
- [ ] Alle Felder gefüllt sind (keine leeren Werte)
- [ ] Datentypen korrekt (String, Number, Boolean, etc.)
- [ ] Keine Duplikate
- [ ] Keine Fehler in Logs
- [ ] Response-Zeit unter X Sekunden
- [ ] Andere: ___________
```

---

## 🔧 TECHNISCHE ANFORDERUNGEN

### APIs & Services die benötigt werden
```
[ ] Google Maps
[ ] Google Sheets
[ ] Telegram
[ ] Browserless (Web-Scraping)
[ ] Andere APIs: ___________
```

### Existierende Integrations-Punkte
```
[Soll dieser Workflow mit anderen verbunden sein?]

Beispiel:
- Input aus: "Lead-Gen Workflow" (Geschäfts-IDs)
- Output an: "Instagram Poster" (Kampagnen-Daten)
- Nutzt Google Sheet: "Campaigns Master"

Oder: "Standalone, keine Integrations-Anforderungen"
```

### Performance-Anforderungen
```
[ ] Muss schnell sein (unter 10 Sekunden pro Item)
[ ] Normal ist OK (10-60 Sekunden)
[ ] Kann länger dauern (Batch-Processing OK)
[ ] Andere Anforderung: ___________
```

---

## 🛡️ ERROR HANDLING & ROBUSTHEIT

### Wie mit Fehlern umgehen?
```
[ ] Retry automatisch bei Fehler
[ ] Fallback-Wert verwenden wenn Daten fehlen
[ ] Skip Datensatz wenn Error (einfach weiter)
[ ] Stoppen & Alert wenn kritischer Fehler
[ ] Andere: ___________
```

### Welche Fehler sind OK?
```
[Welche Fehler sind tolerierbar?]

Beispiel:
- API Rate Limit: OK, später erneut versuchen
- Missing Phone Number: OK, Fallback auf Website
- Invalid Address: NOT OK, Datensatz als Fehler markieren
```

### Notification bei Fehlern?
```
[ ] Ja, Telegram-Nachricht
[ ] Ja, Email
[ ] Nur wenn kritisch
[ ] Keine Notifications
```

---

## 💰 KOSTEN & KAPAZITÄT

### Ungefähre Ausführungs-Häufigkeit
```
[ ] Einmalig
[ ] Stündlich
[ ] Täglich
[ ] Mehrmals täglich
[ ] Bei Bedarf (manuell)
[ ] Andere: ___________
```

### Geschätzte Datenmenge
```
[ ] Klein: < 10 Items
[ ] Mittel: 10-100 Items
[ ] Groß: 100-1000 Items
[ ] Sehr groß: > 1000 Items
```

### Kosten sind wichtig?
```
[ ] Ja, so günstig wie möglich
[ ] Neutral, solange funktioniert
[ ] Unwichtig, Features sind Priorität
```

---

## 🔍 SPEZIELLE ANFORDERUNGEN

### Anti-Ban / Scraping-Schutz nötig?
```
[ ] Ja, aggressive Scraping ohne Ban-Risiko
[ ] Ja, aber gemäßigt (langsam aber sicher)
[ ] Nein, nicht relevant
[ ] Weiß nicht / nicht sicher
```

Falls Ja:
```
- Delays zwischen Requests: ___ Sekunden
- Max Requests pro Minute: ___
- User-Agent Rotation: [ ] Ja [ ] Nein
- Proxy/IP-Rotation: [ ] Ja [ ] Nein
```

### Besonderheiten
```
[Irgendwas Spezielles was wichtig ist?]

Beispiel:
- Muss auch Deutsche Umlaute korrekt verarbeiten
- Braucht Google Maps API Key aus Production (nicht Test)
- Daten sind sensibel, bitte anonymisieren
- Andere: ___________
```

---

## 📚 REFERENZEN & KONTEXT

### Ähnliche Workflows
```
[Gibt es ähnliche Workflows die bereits existieren?]

Beispiel:
- "Lead-Gen Google Maps München" (als Vorlage nutzen)
- "Instagram Auto-Poster" (für Output-Integration)
- Oder: "Keine Ähnlichkeiten"
```

### Dokumentation oder Anforderungen
```
[Hast du Links oder Docs mit mehr Details?]

Beispiel:
- Google Drive Link: https://...
- Confluence Page: https://...
- Screenshot: [anhängen]
- Oder: "Alles oben beschrieben"
```

---

## 🧪 TESTING-STRATEGIE

### Wie soll getestet werden?
```
[ ] Auto-Test mit Webhook (Standard - läuft automatisch!)
[ ] Manuelle Tests mit echten Daten
[ ] Test mit Production-Daten (mit Vorsicht!)
[ ] Andere: ___________
```

### Test-Daten Quelle
```
[ ] Dummy-Daten (Claude generiert)
[ ] Google Sheet "Test-Daten"
[ ] Real-Daten (muss ich dir geben)
[ ] Andere: ___________
```

### Erfolgs-Kriterium für Test
```
[Wann ist der Test erfolgreich?]

Standard: 
- Workflow läuft ohne Fehler
- Output-Format ist korrekt
- Keine Empty/Invalid-Daten

Oder spezifisch:
- ___________
```

---

## ✅ FINALE CHECKLISTE

Vor dem Absenden überprüfen:

- [ ] Workflow-Name ist eindeutig & aussagekräftig
- [ ] Ziel ist klar definiert
- [ ] Input & Output sind spezifiziert
- [ ] Test-Daten-Beispiel vorhanden
- [ ] Performance-Anforderungen klar
- [ ] Fehlerbehandlung gedacht
- [ ] Kosten/Häufigkeit realistisch
- [ ] Alle Services/APIs aufgelistet
- [ ] Validierungskriterien definiert
- [ ] BASIS-KONFIGURATION oben eintragen!
- [ ] Keine Ambiguität oder Fragezeichen

---

## 🚀 WIE DU DAS NUTZT:

### **Wenn du einen neuen Workflow brauchst:**

```
OPTION A (Mit GPT Interview - EMPFOHLEN):
1. ChatGPT öffnen
2. Custom GPT "N8N Claude Workflow-Architect" wählen
3. Kopiere die BASIS-KONFIGURATION (oben)
4. Gib die Basis-Config dem GPT
5. Sag: "Hier ist meine System-Config, jetzt frag mich zum Workflow..."
6. GPT macht Interview
7. Am Ende: Spezifikation
8. Kopiere ALLES zu mir

OPTION B (Manuell mit Template):
1. Fülle dieses Template aus
2. Kopiere alles
3. Gib es mir
4. Ich baue & teste
```

---

## 📝 ZUM ABSCHLUSS:

```
✅ FERTIG!

Wenn du dieses Template ausgefüllt hast:

1. Kopiere ALLES (BASIS-CONFIG + deine Antworten)
2. Gib es Claude mit:

"Baue mir einen Workflow nach dieser Spezifikation:

[Dein ausgefülltes Template]"

Claude wird das bauen und automatisch testen!
Auto-Test läuft im Hintergrund.
Du kriegst Telegram-Nachricht wenn fertig.
```

---

**Viel Erfolg!** 🚀

*Letzte Aktualisierung: 14.02.2026*
