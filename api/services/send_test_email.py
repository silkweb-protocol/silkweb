"""Send a branded test email to information@silkweb.io"""
import asyncio
import smtplib
import ssl
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from api.config import settings


def send():
    html = """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#0a0a12;border:1px solid #1a1a2e;border-radius:16px;overflow:hidden;">

<tr><td style="background:linear-gradient(135deg,#1a1a2e,#0f0f1a);padding:40px 40px 30px;text-align:center;">
<table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
<tr><td style="width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#4F46E5,#312E81);text-align:center;vertical-align:middle;">
<img src="https://silkweb.io/favicon-192.png" width="36" height="36" style="display:inline-block;margin-top:12px;" alt="SilkWeb"/>
</td></tr>
</table>
<h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">SilkWeb</h1>
<p style="margin:8px 0 0;font-size:13px;color:#6366F1;letter-spacing:3px;text-transform:uppercase;">THE AI DISCOVERY PROTOCOL</p>
</td></tr>

<tr><td style="padding:40px;">
<h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#e2e8f0;">Welcome to SilkWeb</h2>
<p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#94A3B8;">You now have access to 20 AI agents across cybersecurity, finance, healthcare, legal, logistics, and more. Each agent is trained, tested, and ready to work.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid #1e1e30;border-radius:12px;margin:0 0 24px;">
<tr><td style="padding:20px;">
<p style="margin:0 0 8px;font-size:11px;color:#6366F1;letter-spacing:2px;text-transform:uppercase;">YOUR API KEY</p>
<p style="margin:0;font-size:14px;font-family:monospace;color:#e2e8f0;">sw_user_XXXX...XXXX</p>
<p style="margin:8px 0 0;font-size:12px;color:#475569;">Keep this key safe. Use it in the X-API-Key header.</p>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="8">
<tr>
<td width="30%" style="text-align:center;padding:16px;background:#111118;border:1px solid #1e1e30;border-radius:12px;">
<p style="margin:0;font-size:24px;font-weight:700;color:#6366F1;">20</p>
<p style="margin:4px 0 0;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:1px;">Agents</p>
</td>
<td width="30%" style="text-align:center;padding:16px;background:#111118;border:1px solid #1e1e30;border-radius:12px;">
<p style="margin:0;font-size:24px;font-weight:700;color:#6366F1;">80+</p>
<p style="margin:4px 0 0;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:1px;">Capabilities</p>
</td>
<td width="30%" style="text-align:center;padding:16px;background:#111118;border:1px solid #1e1e30;border-radius:12px;">
<p style="margin:0;font-size:24px;font-weight:700;color:#6366F1;">Free</p>
<p style="margin:4px 0 0;font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:1px;">Beta</p>
</td>
</tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
<tr><td align="center">
<a href="https://silkweb.io/agents/" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Meet Your Agents</a>
</td></tr>
</table>
</td></tr>

<tr><td style="padding:0 40px 40px;">
<p style="margin:0 0 16px;font-size:11px;color:#6366F1;letter-spacing:2px;text-transform:uppercase;">FEATURED AGENTS</p>
<table width="100%" cellpadding="0" cellspacing="8">
<tr>
<td width="48%" style="padding:12px;background:#111118;border:1px solid #1e1e30;border-radius:10px;">
<p style="margin:0;font-size:14px;font-weight:600;color:#3B82F6;">Guardian</p>
<p style="margin:2px 0 0;font-size:12px;color:#64748B;">Cybersecurity</p>
</td>
<td width="48%" style="padding:12px;background:#111118;border:1px solid #1e1e30;border-radius:10px;">
<p style="margin:0;font-size:14px;font-weight:600;color:#8B5CF6;">Sage</p>
<p style="margin:2px 0 0;font-size:12px;color:#64748B;">Finance &amp; Risk</p>
</td>
</tr>
<tr>
<td width="48%" style="padding:12px;background:#111118;border:1px solid #1e1e30;border-radius:10px;">
<p style="margin:0;font-size:14px;font-weight:600;color:#DC2626;">Counsel</p>
<p style="margin:2px 0 0;font-size:12px;color:#64748B;">Contract Law</p>
</td>
<td width="48%" style="padding:12px;background:#111118;border:1px solid #1e1e30;border-radius:10px;">
<p style="margin:0;font-size:14px;font-weight:600;color:#22C55E;">Healer</p>
<p style="margin:2px 0 0;font-size:12px;color:#64748B;">Healthcare</p>
</td>
</tr>
</table>
</td></tr>

<tr><td style="padding:24px 40px;border-top:1px solid #1a1a2e;text-align:center;">
<p style="margin:0 0 8px;font-size:12px;color:#475569;">silkweb.io &bull; api.silkweb.io</p>
<p style="margin:0;font-size:11px;color:#334155;">&copy; 2026 SilkWeb Protocol &mdash; Armstrong Alliance Group</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Welcome to SilkWeb — Your Agents Are Ready"
    msg["From"] = "SilkWeb <information@silkweb.io>"
    msg["To"] = "information@silkweb.io"

    plain = "Welcome to SilkWeb! You now have access to 20 AI agents. Visit silkweb.io/agents to get started."
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context) as server:
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, "information@silkweb.io", msg.as_string())

    print("Test email sent to information@silkweb.io")


send()
