"""Email notification service."""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from database import db

logger = logging.getLogger(__name__)


async def get_smtp_settings():
    s = await db.site_settings.find_one({"key": "smtp"}, {"_id": 0})
    return s.get("data") if s else None


async def send_email_notification(trigger: str, recipient_user: dict, placeholders: dict):
    """Send an email based on a trigger. Checks user prefs and template availability."""
    try:
        if not recipient_user.get("email"):
            return
        notif_prefs = recipient_user.get("notification_prefs", {})
        email_prefs = notif_prefs.get("email", {})
        trigger_pref_map = {
            "welcome": "system", "article_approved": "moderation", "article_rejected": "moderation",
            "new_comment": "comments", "new_answer": "comments", "badge_earned": "badges",
            "account_banned": "system", "report_resolved": "system", "new_vote": "votes",
        }
        pref_key = trigger_pref_map.get(trigger, "system")
        if not email_prefs.get(pref_key, True):
            return
        smtp = await get_smtp_settings()
        if not smtp or not smtp.get("host"):
            return
        template = await db.email_templates.find_one({"trigger": trigger, "active": True}, {"_id": 0})
        if not template:
            return
        user_lang = recipient_user.get("preferred_lang", "de")
        subject = template.get(f"subject_{user_lang}", template.get("subject_de", ""))
        body = template.get(f"body_html_{user_lang}", template.get("body_html_de", ""))
        for key, val in placeholders.items():
            subject = subject.replace(f"{{{{{key}}}}}", str(val))
            body = body.replace(f"{{{{{key}}}}}", str(val))
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{smtp.get('from_name', 'ArchHub')} <{smtp.get('from_email', smtp['username'])}>"
        msg["To"] = recipient_user["email"]
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html", "utf-8"))
        use_ssl = smtp.get("port", 587) == 465
        if use_ssl:
            server = smtplib.SMTP_SSL(smtp["host"], smtp["port"], timeout=10)
        else:
            server = smtplib.SMTP(smtp["host"], smtp["port"], timeout=10)
            server.starttls()
        server.login(smtp["username"], smtp["password"])
        server.send_message(msg)
        server.quit()
        logger.info(f"Email sent: trigger={trigger}, to={recipient_user['email']}")
    except Exception as e:
        logger.error(f"Email send failed: {e}")
