# Auto-Test-Webhook Konfiguration

**Status:** ✅ AKTIV & PRODUKTIONSBEREIT  
**Gültig ab:** 14.02.2026  
**Workflow:** Claude Auto-Tester - Master Control

---

## Webhook-Details

### URL (GEHEIM - nur für Claude)
```
[WEBHOOK-URL HIER EINTRAGEN - du bekommst sie vom Code-Claude]
```

### Authentifizierung
- Keine Token nötig (Webhook öffentlich, aber nur interne Nutzung)
- Rate-Limit: Maximal 10 Tests parallel

---

## Wie die Auto-Test funktioniert

### Ablauf:
```
1. Neuer Workflow wird gebaut & als INAKTIV gespeichert
2. Claude (ich) triggert Auto-Test-Webhook mit Workflow-Details
3. Auto-Tester aktiviert den Workflow kurzzeitig
4. Test-Daten werden gesendet
5. Ergebnisse werden überwacht
6. Workflow wird wieder deaktiviert
7. Telegram-Nachricht mit Ergebnis
8. Wenn OK: Claude improved Workflow ggf. & testet erneut
9. Wenn Fehler: Claude debuggt & Loop zurück zu Schritt 2
```

---

## API-Payloads

### Anfrage an Auto-Tester (INPUT):

```json
{
  "workflowId": "abc123def456",
  "workflowName": "Lead-Gen Google Maps",
  "testData": {
    "searchQuery": "Pizza Berlin",
    "maxResults": 5
  },
  "expectedOutput": "success",
  "maxRetries": 3,
  "timeoutSeconds": 30
}
```

**Parameter erklären:**
- `workflowId`: Die ID des zu testenden Workflows (aus n8n)
- `workflowName`: Menschenlesbare Beschreibung
- `testData`: Die Test-Eingaben für den Workflow
- `expectedOutput`: "success" oder spezifische Struktur erwartet
- `maxRetries`: Wie oft soll der Test wiederholt werden bei Fehler?
- `timeoutSeconds`: Maximale Wartezeit auf Ergebnis

### Antwort vom Auto-Tester (OUTPUT):

```json
{
  "status": "test_completed",
  "result": "success|error|timeout",
  "workflowId": "abc123def456",
  "workflowName": "Lead-Gen Google Maps",
  "executionId": "xyz789",
  "duration": 12500,
  "timestamp": "2026-02-14T14:30:00Z",
  "message": "Workflow ausgeführt, 5 Datensätze verarbeitet",
  "errors": [],
  "testOutput": {
    /* Hier die tatsächlichen Ausgaben des Workflows */
  }
}
```

---

## Validierungskriterien für erfolgreiche Tests

Ein Test ist **ERFOLGREICH** wenn:

- ✅ Workflow wurde aktiviert
- ✅ Workflow wurde ohne Fehler ausgeführt
- ✅ Output-Struktur ist korrekt
- ✅ Keine Error-Messages in Logs
- ✅ Daten sind valide (nicht leer, richtige Typen)

Ein Test **SCHLÄGT FEHL** wenn:

- ❌ Workflow kann nicht aktiviert werden
- ❌ Execution wirft Error
- ❌ Timeout überschritten (Standard: 30 Sekunden)
- ❌ Output-Format nicht korrekt
- ❌ Validierung der Output-Daten schlägt fehl

---

## Test-Daten Quellen

### Optionen für Test-Daten:

**1. Google Sheet "Test-Daten"**
- Zentrale Stelle für alle Test-Cases
- Wird von Auto-Tester ausgelesen
- Format: Jede Reihe = ein Test-Case
- Sheet-URL: [EINTRAGEN wenn vorhanden]

**2. Dummy-Daten (Claude-generiert)**
- Claude erstellt realistische Test-Daten
- Wird bei jedem Test neu generiert
- Ideal für schnelle Tests

**3. Real-Daten aus Production**
- Nur mit Vorsicht (nicht bei sensiblen Daten!)
- Gute für Integrations-Tests
- Braucht Anonymisierung

**Empfehlung:** Option 2 (Dummy-Daten) für Speed & Safety

---

## Telegram-Notifications

### Format bei erfolgreichen Tests:

```
✅ TEST ERFOLGREICH
━━━━━━━━━━━━━━━━━━━━━━━━
Workflow: Lead-Gen Google Maps
Status: SUCCESS
Dauer: 12.5 Sekunden
Datensätze: 5 verarbeitet

Execution-ID: xyz789
Timestamp: 14.02.2026 14:30

🚀 Workflow ist produktionsbereit!
```

### Format bei fehlgeschlagenen Tests:

```
❌ TEST FEHLGESCHLAGEN
━━━━━━━━━━━━━━━━━━━━━━━━
Workflow: Lead-Gen Google Maps
Status: ERROR
Fehler: "API Rate Limit exceeded"

Execution-ID: xyz789
Timestamp: 14.02.2026 14:30

🔧 Claude debuggt und testet erneut...
Versuch 1/3
```

---

## Fehlerbehandlung & Retry-Logik

### Auto-Retry-Bedingungen:

| Fehler | Retry? | Max Versuche | Aktion |
|--------|--------|--------------|--------|
| API Rate Limit | ✅ Ja | 3x | Delay erhöhen |
| Network Timeout | ✅ Ja | 3x | 5 Sek warten |
| Invalid Input | ❌ Nein | 0x | Claude muss debuggen |
| Missing Credentials | ❌ Nein | 0x | Manuelle Aktion |
| Execution Timeout | ✅ Ja | 2x | Timeout erhöhen |

---

## Claude's Auto-Test Entscheidungsbaum

```
Auto-Test Trigger
    ↓
Payload validieren
    ↓
Workflow aktivieren
    ├─ FEHLER? → Debuggen & manuell fixen
    ├─ OK? ↓
    ↓
Test-Daten senden
    ├─ FEHLER? → Retry (max 3x)
    ├─ OK? ↓
    ↓
Execution überwachen
    ├─ Timeout? → Retry mit größerem Timeout
    ├─ Error? → Logs analysieren
    ├─ Success? ↓
    ↓
Output validieren
    ├─ Invalid? → Claude debuggt Input/Output
    ├─ Valid? ↓
    ↓
Workflow deaktivieren
    ↓
Telegram-Notification senden
    ↓
✅ FERTIG oder 🔧 NÄCHSTER VERSUCH
```

---

## Best Practices für Claude

### Bevor Auto-Test triggerst:

1. ✅ Workflow existiert & ID ist korrekt
2. ✅ Test-Daten sind realistisch & valide
3. ✅ Expected Output ist definiert
4. ✅ Alle Dependencies sind erfolgreich
5. ✅ Keine Breaking Changes seit letztem Build

### Während Auto-Test läuft:

1. ✅ Logs monitoren
2. ✅ Bei Fehler sofort analysieren
3. ✅ Nicht auf nächsten Test warten
4. ✅ Debuggen & sofort erneut testen

### Nach Test:

1. ✅ Ergebnis dokumentieren
2. ✅ Bei Erfolg: "Produktionsbereit"
3. ✅ Bei Fehler: Root-Cause dokumentieren
4. ✅ Nächsten Test triggern oder zur Rückfrage gehen

---

## Troubleshooting

### "Webhook nicht erreichbar"
- Webhook-URL in n8n überprüfen
- n8n instance läuft?
- Firewall/Port OK?

### "Workflow aktivieren fehlgeschlagen"
- Workflow-ID korrekt?
- Sind alle Dependencies aktiv?
- Gibt es Fehler im Workflow selbst?

### "Test hängt/Timeout"
- Workflow hat Infinite Loop?
- API Call hängt?
- Größere Datenmengen?
- → Timeout erhöhen oder Daten verkleinern

### "Output-Validierung fehlgeschlagen"
- Expected Output definiert?
- Output-Struktur hat sich geändert?
- Type-Mismatches?
- → Claude debuggt Input/Output separat

---

## Integration mit Workflow-Baustandards

Diese Auto-Test-Webhook ist **fest integriert** mit den Workflow-Baustandards:

✅ **Sticky Note** muss erwähnen: "Auto-Test wird verwendet"  
✅ **Error Handler** müssen für Auto-Test optimiert sein  
✅ **Output** muss in erwarteter Struktur sein  
✅ **Test-Daten** müssen definiert sein  

→ Siehe `Workflow-Baustandards.md` für Details

---

## Zukünftige Optimierungen

- [ ] Performance-Monitoring (Execution-Zeiten tracken)
- [ ] A/B Testing Support (zwei Versionen testen)
- [ ] Automated Rollback (bei zu vielen Fehlern)
- [ ] Custom Validation Scripts
- [ ] Webhook Scheduling (zeitgesteuerte Tests)

---

**Status:** Produktionsbereit  
**Letzte Aktualisierung:** 14.02.2026  
**Wartung durch:** Jörg  
**Claude nutzt diese Config:** JA ✅
