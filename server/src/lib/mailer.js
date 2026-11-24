/**
 * Mailer abstraction for WebCraft auth emails.
 *
 * Two adapters:
 *   - dev (default): logs the magic/reset link to the console so developers can
 *     copy-paste it during local development. No real email is sent.
 *   - smtp: real SMTP transport. Credentials are TODO(owner) placeholders and
 *     must be configured before production use. nodemailer is lazily required
 *     so the dev adapter works without installing it.
 *
 * The active adapter is chosen by MAIL_ADAPTER env var ("dev" | "smtp").
 * Defaults to "dev" so existing users are never blocked by missing SMTP creds.
 */

// Dev adapter: log the link to stdout. Safe for local development.
function devSend({ to, subject, html, text }) {
  // eslint-disable-next-line no-console
  console.log('\n=== DEV MAILER ===')
  // eslint-disable-next-line no-console
  console.log(`To: ${to}`)
  // eslint-disable-next-line no-console
  console.log(`Subject: ${subject}`)
  // eslint-disable-next-line no-console
  console.log(`Text: ${text}`)
  // eslint-disable-next-line no-console
  console.log(`HTML: ${html}`)
  // eslint-disable-next-line no-console
  console.log('==================\n')
  return { accepted: [to], rejected: [], response: 'dev-mailer-logged' }
}

// SMTP adapter: TODO(owner) credentials. Leave empty until configured.
// nodemailer is lazily required so the dev adapter works without it.
function smtpSend({ to, subject, html, text }) {
  const host = process.env.SMTP_HOST || ''
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  const user = process.env.SMTP_USER || ''
  const pass = process.env.SMTP_PASS || ''
  const from = process.env.SMTP_FROM || 'no-reply@webcraft.local'

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (TODO(owner): paste credentials here).',
    )
  }

  // eslint-disable-next-line global-require
  const nodemailer = require('nodemailer')
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
  return transporter.sendMail({ from, to, subject, text, html })
}

export function sendMail(options) {
  const adapter = process.env.MAIL_ADAPTER || 'dev'
  if (adapter === 'smtp') return smtpSend(options)
  return devSend(options)
}

export default { sendMail }
