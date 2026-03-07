"""Site pages and seed routes."""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, Body

from database import db
from deps import get_current_user

router = APIRouter()


@router.get("/pages/{slug}")
async def get_page(slug: str):
    page = await db.site_pages.find_one({"slug": slug}, {"_id": 0})
    if not page:
        if slug == "privacy":
            return get_default_privacy_page()
        if slug == "imprint":
            return get_default_imprint_page()
        if slug == "terms":
            return get_default_terms_page()
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@router.put("/pages/{slug}")
async def update_page(slug: str, data: dict = Body(...), user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    now = datetime.now(timezone.utc).isoformat()
    page_doc = {
        "slug": slug, "title": data.get("title", slug),
        "content_markdown": data.get("content_markdown", ""),
        "updated_by": user["username"], "updated_at": now
    }
    await db.site_pages.update_one({"slug": slug}, {"$set": page_doc}, upsert=True)
    return {"message": "Page updated", "slug": slug}


@router.post("/seed")
async def seed_data():
    existing = await db.articles.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    default_templates = [
        {"trigger": "welcome", "name": "Willkommen / Welcome", "subject_de": "Willkommen bei ArchHub, {{username}}!", "subject_en": "Welcome to ArchHub, {{username}}!", "body_html_de": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#1793D1'>Willkommen bei ArchHub!</h2><p>Hallo <strong>{{username}}</strong>,</p><p>dein Account wurde erfolgreich erstellt.</p><p style='color:#888;font-size:12px;margin-top:24px'>— ArchHub</p></div>", "body_html_en": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#1793D1'>Welcome to ArchHub!</h2><p>Hello <strong>{{username}}</strong>,</p><p>Your account has been created.</p><p style='color:#888;font-size:12px;margin-top:24px'>— ArchHub</p></div>", "placeholders": ["username"], "active": True},
        {"trigger": "article_approved", "name": "Artikel genehmigt / Article Approved", "subject_de": "Dein Artikel wurde genehmigt: {{article_title}}", "subject_en": "Your article was approved: {{article_title}}", "body_html_de": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#2ecc71'>Artikel genehmigt!</h2><p>Hallo <strong>{{username}}</strong>,</p><p>dein Artikel <strong>\"{{article_title}}\"</strong> wurde genehmigt.</p></div>", "body_html_en": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#2ecc71'>Article Approved!</h2><p>Hello <strong>{{username}}</strong>,</p><p>Your article <strong>\"{{article_title}}\"</strong> has been approved.</p></div>", "placeholders": ["username", "article_title"], "active": True},
        {"trigger": "article_rejected", "name": "Artikel abgelehnt / Article Rejected", "subject_de": "Dein Artikel benötigt Überarbeitung: {{article_title}}", "subject_en": "Your article needs revision: {{article_title}}", "body_html_de": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#e74c3c'>Artikel abgelehnt</h2><p>Hallo <strong>{{username}}</strong>,</p><p><strong>Grund:</strong> {{reason}}</p></div>", "body_html_en": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#e74c3c'>Article Rejected</h2><p>Hello <strong>{{username}}</strong>,</p><p><strong>Reason:</strong> {{reason}}</p></div>", "placeholders": ["username", "article_title", "reason"], "active": True},
        {"trigger": "new_comment", "name": "Neuer Kommentar / New Comment", "subject_de": "{{commenter}} hat deinen Artikel kommentiert", "subject_en": "{{commenter}} commented on your article", "body_html_de": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#1793D1'>Neuer Kommentar</h2><p><strong>{{commenter}}</strong> hat kommentiert.</p></div>", "body_html_en": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#1793D1'>New Comment</h2><p><strong>{{commenter}}</strong> commented.</p></div>", "placeholders": ["username", "commenter", "article_title"], "active": True},
        {"trigger": "new_answer", "name": "Neue Antwort / New Answer", "subject_de": "{{answerer}} hat deine Frage beantwortet", "subject_en": "{{answerer}} answered your question", "body_html_de": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#1793D1'>Neue Antwort</h2><p><strong>{{answerer}}</strong> hat geantwortet.</p></div>", "body_html_en": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#1793D1'>New Answer</h2><p><strong>{{answerer}}</strong> answered.</p></div>", "placeholders": ["username", "answerer", "question_title"], "active": True},
        {"trigger": "badge_earned", "name": "Abzeichen erhalten / Badge Earned", "subject_de": "Du hast ein neues Abzeichen erhalten!", "subject_en": "You earned a new badge!", "body_html_de": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#f39c12'>Neues Abzeichen!</h2><p>Du hast <strong>\"{{badge_name}}\"</strong> erhalten.</p></div>", "body_html_en": "<div style='font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:32px;border-radius:8px'><h2 style='color:#f39c12'>New Badge!</h2><p>You earned <strong>\"{{badge_name}}\"</strong>.</p></div>", "placeholders": ["username", "badge_name"], "active": True},
    ]
    for t in default_templates:
        t["updated_by"] = "system"
        t["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.email_templates.delete_many({})
    await db.email_templates.insert_many(default_templates)
    await db.articles.create_index([("slug", 1)], unique=True)
    await db.articles.create_index([("status", 1), ("created_at", -1)])
    await db.articles.create_index([("author_id", 1)])
    await db.articles.create_index([("tags", 1)])
    await db.articles.create_index([("category", 1)])
    await db.users.create_index([("username_lower", 1)], unique=True)
    await db.votes.create_index([("user_id", 1), ("target_id", 1), ("target_type", 1)], unique=True)
    await db.scripts.create_index([("created_at", -1)])
    await db.scripts.create_index([("category", 1)])
    await db.questions.create_index([("created_at", -1)])
    return {"message": "Database indexes created. No demo content seeded."}


def get_default_imprint_page():
    return {
        "slug": "imprint",
        "title": "Impressum",
        "content_markdown": """# Impressum

## Angaben gemäß § 5 TMG

**ArchHub Community-Projekt**

Dies ist ein nicht-kommerzielles, Open-Source-Community-Projekt.

### Projektverantwortung

ArchHub wird von einer Gruppe ehrenamtlicher Entwickler und Arch-Linux-Enthusiasten betrieben.

### Kontakt

- **E-Mail**: kontakt@archhub.dev
- **Plattform**: Über die Nachrichtenfunktion auf ArchHub

## Haftungsausschluss

### Haftung für Inhalte

Die Inhalte dieser Plattform werden von Community-Mitgliedern erstellt. Wir übernehmen keine Gewähr für die Richtigkeit, Vollständigkeit und Aktualität der bereitgestellten Inhalte. Als Community-Plattform sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte verantwortlich. Beiträge der Nutzer werden nach bestem Wissen moderiert.

### Haftung für Links

Unsere Plattform enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.

### Urheberrecht

Die durch die Nutzer erstellten Inhalte unterliegen der AGPL v3 Lizenz, sofern nicht anders angegeben. Der Quellcode der Plattform ist unter AGPL v3 veröffentlicht.

## Streitschlichtung

Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.

*Letzte Aktualisierung: Februar 2026*
""",
        "updated_by": "system",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }


def get_default_privacy_page():
    return {
        "slug": "privacy",
        "title": "Datenschutzerklärung",
        "content_markdown": """# Datenschutzerklärung

## 1. Verantwortlicher

Verantwortlich für die Datenverarbeitung auf dieser Plattform ist das ArchHub-Community-Projekt.

## 2. Grundsätze der Datenverarbeitung

ArchHub folgt dem Prinzip **Privacy by Design**. Wir erheben nur die Daten, die für den Betrieb der Plattform zwingend erforderlich sind.

### Was wir NICHT tun:
- Kein Tracking durch Drittanbieter (kein Google Analytics, kein Facebook Pixel)
- Keine Weitergabe von Daten an Dritte
- Keine Werbung
- Keine Erstellung von Nutzerprofilen für Marketingzwecke

## 3. Erhobene Daten

### 3.1 Registrierung
Bei der Registrierung werden gespeichert:
- **Pseudonym** (frei gewählt, kein Klarname erforderlich)
- **Passwort** (verschlüsselt gespeichert, bcrypt-Hash)
- **E-Mail** (optional, nur zur Passwort-Wiederherstellung)

### 3.2 Nutzung der Plattform
Bei der Nutzung werden gespeichert:
- Erstellte Artikel, Fragen, Antworten und Kommentare
- Abstimmungen (Upvotes/Downvotes)
- Lesezeichen

### 3.3 Technische Daten
Der Server protokolliert:
- IP-Adresse (für Sicherheitszwecke, wird nach 7 Tagen gelöscht)
- Zeitpunkt des Zugriffs
- Aufgerufene Seiten

## 4. Cookies

### 4.1 Essenzielle Cookies
ArchHub verwendet **ausschließlich technisch notwendige Cookies**:
- **Authentifizierung**: JWT-Token zur Sitzungsverwaltung (localStorage)
- **Einstellungen**: Sprache, Theme (localStorage)
- **Cookie-Einwilligung**: Speicherung deiner Cookie-Präferenz

### 4.2 Keine Drittanbieter-Cookies
Wir setzen **keine** Cookies von Drittanbietern ein.

## 5. Rechtsgrundlagen (Art. 6 DSGVO)

- **Art. 6 Abs. 1 lit. a DSGVO**: Einwilligung (Cookie-Banner)
- **Art. 6 Abs. 1 lit. b DSGVO**: Vertragserfüllung (Account-Funktionen)
- **Art. 6 Abs. 1 lit. f DSGVO**: Berechtigtes Interesse (Plattform-Sicherheit)

## 6. Deine Rechte

Du hast folgende Rechte nach DSGVO:
- **Auskunft** (Art. 15 DSGVO): Welche Daten wir über dich speichern
- **Berichtigung** (Art. 16 DSGVO): Korrektur falscher Daten
- **Löschung** (Art. 17 DSGVO): Löschung deiner Daten ("Recht auf Vergessenwerden")
- **Einschränkung** (Art. 18 DSGVO): Einschränkung der Verarbeitung
- **Datenübertragbarkeit** (Art. 20 DSGVO): Export deiner Daten
- **Widerspruch** (Art. 21 DSGVO): Widerspruch gegen die Verarbeitung

## 7. Datensicherheit

- Alle Verbindungen sind TLS/SSL-verschlüsselt (HTTPS)
- Passwörter werden mit bcrypt gehasht
- Regelmäßige Sicherheitsupdates
- Open-Source-Code (AGPL v3) ermöglicht unabhängige Überprüfung

## 8. Kontakt

Bei Fragen zum Datenschutz kontaktiere das ArchHub-Team über die Plattform.

*Letzte Aktualisierung: Februar 2026*
""",
        "updated_by": "system",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }



def get_default_terms_page():
    return {
        "slug": "terms",
        "title": "Nutzungsbedingungen",
        "content_markdown": """# Nutzungsbedingungen

## 1. Geltungsbereich

Diese Nutzungsbedingungen gelten für die Nutzung der Plattform **ArchHub**, einem Community-Projekt rund um Arch Linux. Mit der Registrierung und Nutzung der Plattform akzeptierst du diese Bedingungen.

## 2. Registrierung und Account

- Für die aktive Teilnahme (Erstellen von Artikeln, Fragen, Antworten, Skripten) ist ein Account erforderlich.
- Du bist für die Sicherheit deines Accounts verantwortlich. Wir empfehlen die Aktivierung der **Zwei-Faktor-Authentifizierung (2FA)**.
- Pro Person ist nur **ein Account** erlaubt. Mehrfach-Accounts können gesperrt werden.
- Der gewählte Benutzername darf keine beleidigenden oder irreführenden Inhalte enthalten.

## 3. Inhalte und Verantwortung

### 3.1 Nutzergenerierte Inhalte
- Du bist allein verantwortlich für Inhalte, die du auf ArchHub veröffentlichst.
- Veröffentlichte Inhalte stehen unter der **AGPL v3** Lizenz, sofern nicht anders angegeben.
- Du darfst keine Inhalte veröffentlichen, die gegen geltendes Recht verstoßen.

### 3.2 Verbotene Inhalte
Folgende Inhalte sind untersagt:
- Malware, Schadcode oder bewusst destruktive Skripte
- Spam, Werbung oder kommerzielle Inhalte ohne Genehmigung
- Beleidigungen, Hassrede oder Diskriminierung
- Persönliche Daten Dritter ohne deren Einwilligung
- Urheberrechtlich geschützte Inhalte ohne Berechtigung

### 3.3 Skripte und Code
- ArchHub warnt automatisch vor potenziell **destruktiven Befehlen** in Skripten (z.B. `rm -rf`, `mkfs`).
- Trotzdem: **Führe niemals Code aus, den du nicht verstehst.** ArchHub übernimmt keine Haftung für Schäden durch Nutzung von Community-Skripten.
- Teste Skripte immer in einer **isolierten Umgebung** (VM, Container) bevor du sie auf deinem System ausführst.

## 4. Community-Regeln

- Behandle andere Nutzer mit Respekt.
- Das Reputationssystem spiegelt deinen Beitrag zur Community wider. Manipulation (z.B. durch Fake-Accounts) führt zur Sperrung.
- Moderatoren und Admins haben das Recht, Inhalte zu entfernen oder Accounts zu sperren, die gegen diese Regeln verstoßen.

## 5. Moderation

- Neue Artikel durchlaufen einen Moderationsprozess, bis ein Nutzer als **vertrauenswürdig** eingestuft wird (Trust Level).
- Bug Reports werden von Moderatoren geprüft und mit einem Status versehen (Offen, Bestätigt, Behoben).
- Gemeldete Inhalte werden zeitnah überprüft.

## 6. Verfügbarkeit

- ArchHub wird ehrenamtlich betrieben. Wir garantieren keine bestimmte Verfügbarkeit.
- Wir behalten uns das Recht vor, den Dienst jederzeit zu ändern, einzuschränken oder einzustellen.

## 7. Haftungsausschluss

- ArchHub wird **"as is"** bereitgestellt, ohne Gewährleistung jeglicher Art.
- Wir haften nicht für Schäden, die durch die Nutzung von auf der Plattform veröffentlichten Inhalten entstehen.
- Dies gilt insbesondere für Shell-Skripte, Konfigurationsanleitungen und Paketempfehlungen.

## 8. Datenschutz

Die Erhebung und Verarbeitung personenbezogener Daten ist in unserer [Datenschutzerklärung](/privacy) geregelt.

## 9. Änderungen

Wir behalten uns vor, diese Nutzungsbedingungen jederzeit anzupassen. Wesentliche Änderungen werden über die Plattform kommuniziert.

## 10. Salvatorische Klausel

Sollten einzelne Bestimmungen dieser Nutzungsbedingungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.

*Letzte Aktualisierung: Februar 2026*
""",
        "updated_by": "system",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
