"""Email service — sends branded emails via Hostinger SMTP.

Functions:
  send_welcome_email       — after signup, explains SilkWeb + CTA to register
  send_indexing_email       — after crawl completes, shows what AI knows
  send_admin_notification   — generic admin alert (signup, business reg, etc.)
  send_receipt_email        — cryptographic task receipt (existing)
"""

import asyncio
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from api.config import settings

logger = logging.getLogger(__name__)

ADMIN_EMAIL = "information@silkweb.io"
LOGO_URL = "https://silkweb.io/logo.png"
ONBOARDING_URL = "https://silkweb.io/onboarding.html"
AGENTS_URL = "https://silkweb.io/agents/"


# ── Shared SMTP helper ──────────────────────────────────────────────────────


def _smtp_send(to_email: str, subject: str, plain: str, html: str):
    """Blocking SMTP send via Hostinger SSL. Run in executor for async."""
    msg = MIMEMultipart("alternative")
    msg["From"] = f"SilkWeb <{settings.smtp_from}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg["Reply-To"] = ADMIN_EMAIL

    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html, "html"))

    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context) as server:
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, to_email, msg.as_string())


async def _send_in_executor(to_email: str, subject: str, plain: str, html: str):
    """Run the blocking SMTP send in a thread-pool executor."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _smtp_send, to_email, subject, plain, html)


# ── Shared HTML scaffolding ─────────────────────────────────────────────────


def _wrap_html(inner_html: str) -> str:
    """Wrap content in the dark branded email template."""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#0a0a12;border:1px solid rgba(192,200,224,0.08);border-radius:12px;overflow:hidden;">

<!-- Header with logo -->
<tr><td style="padding:32px 40px 24px;border-bottom:1px solid rgba(192,200,224,0.06);">
  <table width="100%"><tr>
    <td>
      <img src="{LOGO_URL}" alt="SilkWeb" width="32" height="32" style="vertical-align:middle;margin-right:10px;">
      <span style="font-size:20px;font-weight:700;color:#c0c8e0;letter-spacing:-0.5px;vertical-align:middle;">SilkWeb</span>
    </td>
    <td align="right">
      <span style="font-size:11px;background:rgba(99,102,241,0.08);padding:4px 10px;border-radius:100px;border:1px solid rgba(99,102,241,0.15);color:#818cf8;">AI SEARCH ENGINE</span>
    </td>
  </tr></table>
</td></tr>

<!-- Body -->
{inner_html}

<!-- Footer -->
<tr><td style="padding:24px 40px;border-top:1px solid rgba(192,200,224,0.06);text-align:center;">
  <span style="font-size:11px;color:#4b5563;">SilkWeb &mdash; The AI Search Engine for Local Business</span><br>
  <span style="font-size:11px;color:#4b5563;"><a href="https://silkweb.io" style="color:#818cf8;text-decoration:none;">silkweb.io</a></span>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""


def _button_html(text: str, url: str) -> str:
    """Render a branded CTA button."""
    return f"""<table cellpadding="0" cellspacing="0" style="margin:24px auto;"><tr><td>
  <a href="{url}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6366f1,#818cf8);color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">{text}</a>
</td></tr></table>"""


def _section_label(text: str) -> str:
    """Render an uppercase section label."""
    return f'<p style="margin:24px 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#818cf8;font-weight:700;">{text}</p>'


def _check_item(text: str) -> str:
    """Render a green-checkmark list item."""
    return f'<div style="padding:6px 0;font-size:14px;color:#c0c8e0;">&#x2705; {text}</div>'


# ═════════════════════════════════════════════════════════════════════════════
# 1. WELCOME EMAIL — sent immediately after signup
# ═════════════════════════════════════════════════════════════════════════════


async def send_welcome_email(to_email: str, user_name: str) -> bool:
    """Send the welcome email explaining SilkWeb and linking to onboarding."""
    name = user_name or "there"
    subject = f"Welcome to SilkWeb, {name} - Here's What Happens Next"

    plain = f"""Welcome to SilkWeb, {name}!

You just signed up for the AI Search Engine.

Here's what that means: When someone asks ChatGPT, Claude, or any AI for a service like yours, AI searches for the best match. Before today, AI couldn't find your business. We're about to change that.

NEXT STEP: Register your business so we can index your website and make you visible to AI.

Register here: {ONBOARDING_URL}

This takes 60 seconds. After you register, we'll scan your website and show you exactly what AI will know about you.

- The SilkWeb Team
silkweb.io
"""

    inner = f"""
<tr><td style="padding:32px 40px 0;">
  <h1 style="margin:0;font-size:24px;color:#c0c8e0;font-weight:600;">Welcome to SilkWeb, {name}!</h1>
</td></tr>

<tr><td style="padding:16px 40px 0;">
  <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">
    You just signed up for the <strong style="color:#c0c8e0;">AI Search Engine</strong>.
  </p>
</td></tr>

<tr><td style="padding:20px 40px 0;">
  <div style="background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.12);border-radius:8px;padding:20px;">
    <p style="margin:0 0 8px;font-size:15px;color:#c0c8e0;font-weight:600;">Here's what that means:</p>
    <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.7;">
      When someone asks <strong style="color:#c0c8e0;">ChatGPT, Claude, or any AI</strong> for a service like yours, AI searches for the best match.
      Before today, AI couldn't find your business.<br><br>
      <strong style="color:#10B981;">We're about to change that.</strong>
    </p>
  </div>
</td></tr>

<tr><td style="padding:24px 40px 0;">
  {_section_label("NEXT STEP")}
  <p style="margin:0;font-size:15px;color:#c0c8e0;line-height:1.7;">
    Register your business so we can <strong>index your website</strong> and make you visible to AI.
  </p>
  {_button_html("Register Your Business", ONBOARDING_URL)}
  <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">
    This takes 60 seconds. After you register, we'll scan your website and show you exactly what AI will know about you.
  </p>
</td></tr>

<tr><td style="padding:32px 40px 32px;"> </td></tr>
"""

    html = _wrap_html(inner)

    try:
        await _send_in_executor(to_email, subject, plain, html)
        logger.info(f"Welcome email sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Welcome email failed for {to_email}: {e}")
        return False


# ═════════════════════════════════════════════════════════════════════════════
# 2. INDEXING EMAIL — sent after background crawl + AI profile generation
# ═════════════════════════════════════════════════════════════════════════════


async def send_indexing_email(
    to_email: str,
    user_name: str,
    business_name: str,
    crawl_data: dict,
    ai_profile: dict,
) -> bool:
    """Send the indexing-complete email showing what AI now knows."""
    name = user_name or "there"
    biz = business_name or "Your Business"
    industry = crawl_data.get("industry") or "your industry"
    city = crawl_data.get("location", {}).get("city") or ""
    state = crawl_data.get("location", {}).get("state") or ""
    location_str = f"{city}, {state}" if city and state else city or state or "your area"

    subject = f"{biz} is Now Visible to AI"

    # ── Build services list ──────────────────────────────────────────────
    services = crawl_data.get("services", [])[:8]
    contact = crawl_data.get("contact", {})
    location = crawl_data.get("location", {})
    faqs = ai_profile.get("faq_entries", [])[:5]

    services_plain = "\n".join(f"  - {s}" for s in services) if services else "  (none detected)"
    faqs_plain = "\n".join(f"  Q: {f['question']}\n  A: {f['answer']}" for f in faqs) if faqs else ""

    plain = f"""Great news, {name}!

We just scanned your website and {biz} is now on the AI Search Engine.

WHAT THIS MEANS:
Before today, when someone asked AI "find me a {industry} in {location_str}", your business didn't exist. Now it does.

WHAT AI NOW KNOWS ABOUT YOU:
Services found:
{services_plain}

Contact: {contact.get('phone', 'N/A')} | {contact.get('email', 'N/A')}
Location: {location_str}

QUESTIONS THAT WILL FIND YOU:
{faqs_plain}

WHAT HAPPENS NEXT:
- AI platforms update their indexes regularly
- The more complete your profile, the higher you rank
- Use our AI agents to grow your business further

Explore your AI agents: {AGENTS_URL}

- The SilkWeb Team
silkweb.io
"""

    # ── Build HTML services ──────────────────────────────────────────────
    services_html = "".join(_check_item(s) for s in services)
    if not services:
        services_html = '<p style="font-size:14px;color:#6b7280;">No services auto-detected yet. Update your profile to add them.</p>'

    contact_rows = ""
    if contact.get("phone"):
        contact_rows += _check_item(f"Phone: {contact['phone']}")
    if contact.get("email"):
        contact_rows += _check_item(f"Email: {contact['email']}")
    if contact.get("address"):
        contact_rows += _check_item(f"Address: {contact['address']}")
    if location_str:
        contact_rows += _check_item(f"Location: {location_str}")

    faqs_html = ""
    for faq in faqs:
        faqs_html += f"""<div style="padding:12px 16px;margin-bottom:8px;background:rgba(192,200,224,0.03);border:1px solid rgba(192,200,224,0.06);border-radius:8px;">
  <p style="margin:0 0 4px;font-size:14px;color:#818cf8;font-weight:600;">&#x1F50D; &quot;{faq['question']}&quot;</p>
  <p style="margin:0;font-size:13px;color:#94a3b8;">{faq['answer']}</p>
</div>"""

    inner = f"""
<tr><td style="padding:32px 40px 0;">
  <h1 style="margin:0;font-size:24px;color:#c0c8e0;font-weight:600;">{biz} is Now Visible to AI</h1>
</td></tr>

<tr><td style="padding:16px 40px 0;">
  <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.7;">
    Great news, <strong style="color:#c0c8e0;">{name}</strong>. We just scanned your website and
    <strong style="color:#c0c8e0;">{biz}</strong> is now on the AI Search Engine.
  </p>
</td></tr>

<tr><td style="padding:24px 40px 0;">
  <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:8px;padding:20px;">
    <p style="margin:0;font-size:15px;color:#c0c8e0;font-weight:600;">What this means:</p>
    <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;line-height:1.7;">
      Before today, when someone asked AI <em style="color:#c0c8e0;">&quot;find me a {industry} in {location_str}&quot;</em>, your business didn't exist.<br>
      <strong style="color:#10B981;">Now it does.</strong>
    </p>
  </div>
</td></tr>

<!-- Services found -->
<tr><td style="padding:24px 40px 0;">
  {_section_label("WHAT AI NOW KNOWS ABOUT YOU")}
  <div style="background:rgba(192,200,224,0.03);border:1px solid rgba(192,200,224,0.06);border-radius:8px;padding:16px;">
    <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Services Found</p>
    {services_html}
  </div>
</td></tr>

<!-- Contact info -->
<tr><td style="padding:12px 40px 0;">
  <div style="background:rgba(192,200,224,0.03);border:1px solid rgba(192,200,224,0.06);border-radius:8px;padding:16px;">
    <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Your Contact Info</p>
    {contact_rows}
  </div>
</td></tr>

<!-- FAQ questions -->
<tr><td style="padding:24px 40px 0;">
  {_section_label("WHEN SOMEONE ASKS AI THESE QUESTIONS, THEY'LL FIND YOU")}
  {faqs_html}
</td></tr>

<!-- What happens next -->
<tr><td style="padding:24px 40px 0;">
  {_section_label("WHAT HAPPENS NEXT")}
  <div style="padding:0 0 0 8px;">
    {_check_item("AI platforms update their indexes regularly")}
    {_check_item("The more complete your profile, the higher you rank")}
    {_check_item("Use our AI agents to grow your business further")}
  </div>
  {_button_html("Explore Your AI Agents", AGENTS_URL)}
</td></tr>

<tr><td style="padding:16px 40px 32px;"> </td></tr>
"""

    html = _wrap_html(inner)

    try:
        await _send_in_executor(to_email, subject, plain, html)
        logger.info(f"Indexing email sent to {to_email} for {biz}")
        return True
    except Exception as e:
        logger.error(f"Indexing email failed for {to_email}: {e}")
        return False


# ═════════════════════════════════════════════════════════════════════════════
# 3. ADMIN NOTIFICATION — generic, used for signup + business registration
# ═════════════════════════════════════════════════════════════════════════════


async def send_admin_notification(subject: str, body: str):
    """Send a notification email to the admin inbox."""
    full_subject = f"[SilkWeb] {subject}"

    html = f"""<!DOCTYPE html>
<html><body style="margin:0;padding:20px;background:#0a0a0f;color:#e2e8f0;font-family:monospace;">
<h2 style="color:#6366f1;">{subject}</h2>
<pre style="background:#111;padding:16px;border-radius:8px;color:#94a3b8;white-space:pre-wrap;">{body}</pre>
<hr style="border-color:#222;">
<p style="color:#475569;font-size:12px;">SilkWeb Admin Notification &mdash; api.silkweb.io</p>
</body></html>"""

    try:
        def _send():
            msg = MIMEMultipart("alternative")
            msg["Subject"] = full_subject
            msg["From"] = f"SilkWeb Notifications <{settings.smtp_user}>"
            msg["To"] = ADMIN_EMAIL

            msg.attach(MIMEText(body, "plain"))
            msg.attach(MIMEText(html, "html"))

            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context) as server:
                server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(settings.smtp_user, ADMIN_EMAIL, msg.as_string())

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send)
        logger.info(f"Admin notification sent: {subject}")
    except Exception as e:
        logger.error(f"Admin notification failed: {e}")


# ═════════════════════════════════════════════════════════════════════════════
# 4. RECEIPT EMAIL — existing task-completion receipt (preserved)
# ═════════════════════════════════════════════════════════════════════════════


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
        subject = f"Task Completed \u2014 {capability} [{task_id[:16]}]"

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

        await _send_in_executor(to_email, subject, plain, html)
        logger.info(f"Receipt email sent for task {task_id} to {to_email}")
        return True

    except Exception as e:
        logger.error(f"Failed to send receipt email for task {task_id}: {e}")
        return False
