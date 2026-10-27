import imaplib
import smtplib
import email
from email.header import decode_header
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re


def _decode_header_value(header_value):
    if not header_value:
        return ""
    try:
        decoded_fragments = decode_header(header_value)
        result = []
        for fragment, charset in decoded_fragments:
            if isinstance(fragment, bytes):
                charset = charset or "utf-8"
                try:
                    result.append(fragment.decode(charset, errors="replace"))
                except (LookupError, UnicodeDecodeError):
                    result.append(fragment.decode("utf-8", errors="replace"))
            else:
                result.append(str(fragment))
        return "".join(result)
    except Exception:
        return str(header_value)


def _extract_body(msg):
    body = ""
    html_fallback = ""
    try:
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                content_disposition = str(part.get("Content-Disposition", ""))
                if "attachment" in content_disposition:
                    continue
                payload = part.get_payload(decode=True)
                if payload is None:
                    continue
                charset = part.get_content_charset() or "utf-8"
                try:
                    decoded_text = payload.decode(charset, errors="replace")
                except (LookupError, UnicodeDecodeError):
                    decoded_text = payload.decode("utf-8", errors="replace")

                if content_type == "text/plain":
                    body = decoded_text
                    break
                elif content_type == "text/html" and not html_fallback:
                    html_fallback = decoded_text
        else:
            payload = msg.get_payload(decode=True)
            if payload is not None:
                charset = msg.get_content_charset() or "utf-8"
                try:
                    body = payload.decode(charset, errors="replace")
                except (LookupError, UnicodeDecodeError):
                    body = payload.decode("utf-8", errors="replace")

        if not body and html_fallback:
            clean_text = re.sub(r"<[^>]+>", " ", html_fallback)
            body = " ".join(clean_text.split())

        return body.strip()
    except Exception:
        return ""


class EmailService:
    def __init__(
        self,
        smtp_server="smtp.gmail.com",
        imap_server="imap.gmail.com",
        port_smtp=587,
        port_imap=993,
        timeout=20,
    ):
        self.smtp_server = smtp_server
        self.imap_server = imap_server
        self.port_smtp = port_smtp
        self.port_imap = port_imap
        self.timeout = timeout

    def send_email(self, user_email, password, recipient, subject, body):
        if not user_email or not password:
            return {"status": "error", "message": "Email and App Password are required"}
        if not recipient:
            return {"status": "error", "message": "Recipient email address is required"}

        server = None
        try:
            msg = MIMEMultipart()
            msg["From"] = user_email
            msg["To"] = recipient
            msg["Subject"] = subject or "(No Subject)"
            msg.attach(MIMEText(body or "", "plain", "utf-8"))

            server = smtplib.SMTP(self.smtp_server, self.port_smtp, timeout=self.timeout)
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(user_email, password)
            server.send_message(msg)
            return {"status": "success", "message": "Email sent successfully"}
        except smtplib.SMTPAuthenticationError:
            return {
                "status": "error",
                "message": "Authentication failed. For Gmail, please make sure you are using a 16-character App Password (not your standard account password).",
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            if server:
                try:
                    server.quit()
                except Exception:
                    pass

    def fetch_inbox(self, user_email, password, max_emails=5):
        if not user_email or not password:
            return {"status": "error", "message": "Email and App Password are required"}

        try:
            max_emails = int(max_emails)
        except (ValueError, TypeError):
            max_emails = 5

        mail = None
        try:
            mail = imaplib.IMAP4_SSL(self.imap_server, self.port_imap)
            mail.login(user_email, password)
            mail.select("inbox")

            status, data = mail.search(None, "ALL")
            if status != "OK" or not data or not data[0]:
                return {"status": "success", "emails": []}

            mail_ids = data[0].split()
            if not mail_ids:
                return {"status": "success", "emails": []}

            latest_ids = mail_ids[-max_emails:]
            emails = []

            for m_id in reversed(latest_ids):
                status, msg_data = mail.fetch(m_id, "(RFC822)")
                if status != "OK" or not msg_data:
                    continue

                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        raw_subject = msg.get("subject", "No Subject")
                        raw_sender = msg.get("from", "Unknown Sender")

                        subject = _decode_header_value(raw_subject) or "No Subject"
                        sender = _decode_header_value(raw_sender) or "Unknown Sender"
                        body = _extract_body(msg)

                        email_id_str = m_id.decode(errors="ignore") if isinstance(m_id, bytes) else str(m_id)

                        emails.append({
                            "id": email_id_str,
                            "sender": sender,
                            "subject": subject,
                            "body": body,
                        })

            return {"status": "success", "emails": emails}
        except imaplib.IMAP4.error as e:
            return {
                "status": "error",
                "message": f"IMAP authentication error: {str(e)}. If using Gmail, ensure IMAP is enabled in Gmail settings and use an App Password.",
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            if mail:
                try:
                    mail.logout()
                except Exception:
                    pass
