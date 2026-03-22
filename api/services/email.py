"""Email service — sends receipt tickets via Hostinger SMTP."""

import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from api.config import settings

logger = logging.getLogger(__name__)


def _build_receipt_html(
    task_id: str,
    capability: str,
    from_agent: str,
    to_agent: str,
    receipt_hash: str,
    executor_sig: str,
    cost: str | None,
    completed_at: str,
) -> str:
    """Build a branded receipt email."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#12121a;border:1px solid rgba(192,200,224,0.08);border-radius:12px;overflow:hidden;">

<!-- Header -->
<tr><td style="padding:32px 40px 24px;border-bottom:1px solid rgba(192,200,224,0.06);">
  <table width="100%"><tr>
    <td><span style="font-size:20px;font-weight:700;color:#c0c8e0;letter-spacing:-0.5px;">SilkWeb</span></td>
    <td align="right"><span style="font-size:11px;color:#6b7280;background:rgba(16,185,129,0.08);padding:4px 10px;border-radius:100px;border:1px solid rgba(16,185,129,0.15);color:#10B981;">VERIFIED RECEIPT</span></td>
  </tr></table>
</td></tr>

<!-- Title -->
<tr><td style="padding:32px 40px 16px;">
  <h1 style="margin:0;font-size:22px;color:#c0c8e0;font-weight:600;">Task Completed</h1>
  <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">Your agent task has been executed and cryptographically signed.</p>
</td></tr>

<!-- Details -->
<tr><td style="padding:0 40px 24px;">
  <table width="100%" style="background:rgba(192,200,224,0.03);border:1px solid rgba(192,200,224,0.06);border-radius:8px;" cellpadding="16" cellspacing="0">
    <tr><td style="border-bottom:1px solid rgba(192,200,224,0.06);">
      <span style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px;">Task ID</span><br>
      <span style="font-size:13px;color:#c0c8e0;font-family:monospace;">{task_id}</span>
    </td></tr>
    <tr><td style="border-bottom:1px solid rgba(192,200,224,0.06);">
      <span style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px;">Capability</span><br>
      <span style="font-size:13px;color:#c0c8e0;">{capability}</span>
    </td></tr>
    <tr><td style="border-bottom:1px solid rgba(192,200,224,0.06);">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="50%">
          <span style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px;">Requester</span><br>
          <span style="font-size:12px;color:#c0c8e0;font-family:monospace;">{from_agent[:24]}...</span>
        </td>
        <td width="50%">
          <span style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px;">Executor</span><br>
          <span style="font-size:12px;color:#c0c8e0;font-family:monospace;">{to_agent[:24]}...</span>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="border-bottom:1px solid rgba(192,200,224,0.06);">
      <span style="font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px;">Completed</span><br>
      <span style="font-size:13px;color:#c0c8e0;">{completed_at}</span>
    </td></tr>
    {"<tr><td style='border-bottom:1px solid rgba(192,200,224,0.06);'><span style='font-size:11px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px;'>Cost</span><br><span style='font-size:13px;color:#10B981;font-weight:600;'>$" + cost + " USD</span></td></tr>" if cost else ""}
  </table>
</td></tr>

<!-- Cryptographic Proof -->
<tr><td style="padding:0 40px 24px;">
  <div style="background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.12);border-radius:8px;padding:16px;">
    <span style="font-size:11px;text-transform:uppercase;color:#818cf8;letter-spacing:0.5px;font-weight:600;">Ed25519 Cryptographic Proof</span>
    <div style="margin-top:12px;">
      <span style="font-size:10px;color:#6b7280;">SHA-256 HASH</span><br>
      <span style="font-size:11px;color:#c0c8e0;font-family:monospace;word-break:break-all;">{receipt_hash}</span>
    </div>
    <div style="margin-top:10px;">
      <span style="font-size:10px;color:#6b7280;">EXECUTOR SIGNATURE</span><br>
      <span style="font-size:11px;color:#c0c8e0;font-family:monospace;word-break:break-all;">{executor_sig[:64]}...</span>
    </div>
  </div>
</td></tr>

<!-- Verify Button -->
<tr><td align="center" style="padding:0 40px 32px;">
  <a href="https://silkweb.io/verify?task={task_id}" style="display:inline-block;padding:12px 32px;background-color:#6366f1;background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Verify Receipt</a>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 40px;border-top:1px solid rgba(192,200,224,0.06);text-align:center;">
  <span style="font-size:11px;color:#4b5563;">This receipt is cryptographically signed and independently verifiable.</span><br>
  <span style="font-size:11px;color:#4b5563;">SilkWeb Protocol &mdash; <a href="https://silkweb.io" style="color:#818cf8;text-decoration:none;">silkweb.io</a></span>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


async def send_receipt_email(
    to_email: str,
    task_id: str,
    capability: str,
    from_agent: str,
    to_agent: str,
    receipt_hash: str,
    executor_sig: str,
    cost: str | None = None,
    completed_at: str = "",
) -> bool:
    """Send a receipt ticket email. Returns True on success."""
    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"SilkWeb <{settings.smtp_from}>"
        msg["To"] = to_email
        msg["Subject"] = f"Task Completed — {capability} [{task_id[:16]}]"
        msg["Reply-To"] = "information@silkweb.io"

        # Plain text fallback
        plain = f"""SilkWeb Receipt

Task: {task_id}
Capability: {capability}
Requester: {from_agent}
Executor: {to_agent}
Completed: {completed_at}
Hash: {receipt_hash}

Verify at: https://silkweb.io/verify?task={task_id}
"""

        html = _build_receipt_html(
            task_id=task_id,
            capability=capability,
            from_agent=from_agent,
            to_agent=to_agent,
            receipt_hash=receipt_hash,
            executor_sig=executor_sig,
            cost=cost,
            completed_at=completed_at,
        )

        msg.attach(MIMEText(plain, "plain"))
        msg.attach(MIMEText(html, "html"))

        # Send via Hostinger SMTP
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context) as server:
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, to_email, msg.as_string())

        logger.info(f"Receipt email sent for task {task_id} to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send receipt email for task {task_id}: {e}")
        return False
