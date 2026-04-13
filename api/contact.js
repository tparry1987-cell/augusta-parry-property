import { Resend } from 'resend';

const TO = process.env.CONTACT_TO_EMAIL || 'augustasteffy143@gmail.com';
const FROM = process.env.CONTACT_FROM_EMAIL || 'Augusta Parry Enquiries <onboarding@resend.dev>';

const escape = (s = '') =>
  String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    res.status(500).json({ error: 'Server not configured (missing RESEND_API_KEY)' });
    return;
  }

  const { name = '', email = '', phone = '', property = '', message = '' } = req.body || {};

  if (!String(name).trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    res.status(400).json({ error: 'Name and valid email required' });
    return;
  }

  const rows = [
    ['Name', name],
    ['Email', `<a href="mailto:${escape(email)}" style="color:#c4956a;text-decoration:none">${escape(email)}</a>`],
    phone && ['Phone', escape(phone)],
    property && ['Property', escape(property)],
  ].filter(Boolean);

  const html = `
    <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1a2332">
      <p style="font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:#c4956a;margin:0 0 8px">New Enquiry</p>
      <h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:400;margin:0 0 24px">${escape(name)}</h1>
      <table style="width:100%;border-collapse:collapse;font-family:-apple-system,'Segoe UI',sans-serif;font-size:14px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:10px 0;color:#6b6560;width:120px;vertical-align:top;border-bottom:1px solid #eee">${k}</td><td style="padding:10px 0;border-bottom:1px solid #eee">${v}</td></tr>`
          )
          .join('')}
      </table>
      ${
        message
          ? `<div style="margin-top:32px;font-family:-apple-system,'Segoe UI',sans-serif;font-size:14px;line-height:1.6">
               <p style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#6b6560;margin:0 0 8px">Message</p>
               <p style="margin:0;white-space:pre-wrap">${escape(message)}</p>
             </div>`
          : ''
      }
      <p style="margin-top:40px;font-family:-apple-system,sans-serif;font-size:11px;color:#9a928a">
        Sent from augusta-parry-property.vercel.app · Reply directly to this email to respond.
      </p>
    </div>`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: FROM,
      to: TO,
      replyTo: email,
      subject: `Enquiry — ${name}${property ? ` · ${property}` : ''}`,
      html,
    });
    if (error) {
      console.error('Resend error', error);
      res.status(502).json({ error: 'Email provider rejected the message' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Handler error', err);
    res.status(500).json({ error: 'Unexpected error' });
  }
}
