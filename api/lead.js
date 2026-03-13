// api/lead.js — verstuurt lead e-mail via Resend
// Stel in Vercel in: Settings → Environment Variables → RESEND_API_KEY
// Gratis account: resend.com → API Keys → Create API Key

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { naam, telefoon, interesse, datum } = req.body;

  if (!naam || !telefoon) {
    return res.status(400).json({ error: 'naam en telefoon zijn verplicht' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY niet ingesteld in Vercel' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'AI Assistent <noreply@briqk.nl>',
        to:   ['info@roelwillemsen.nl'],
        subject: `Nieuwe lead: ${naam}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
            <div style="background:#1a5c3a;border-radius:12px 12px 0 0;padding:20px 24px">
              <h2 style="color:#f5c800;margin:0;font-size:18px">Nieuwe lead via website</h2>
              <p style="color:rgba(255,255,255,.6);margin:4px 0 0;font-size:13px">AI-assistent · roelwillemsen.nl</p>
            </div>
            <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px">
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:8px 0;color:#6b7280;font-size:13px;width:120px">Naam</td>
                  <td style="padding:8px 0;font-weight:600;font-size:14px">${naam}</td>
                </tr>
                <tr style="border-top:1px solid #f3f4f6">
                  <td style="padding:8px 0;color:#6b7280;font-size:13px">Telefoon</td>
                  <td style="padding:8px 0;font-weight:600;font-size:14px">${telefoon}</td>
                </tr>
                <tr style="border-top:1px solid #f3f4f6">
                  <td style="padding:8px 0;color:#6b7280;font-size:13px">Interesse</td>
                  <td style="padding:8px 0;font-size:14px">${interesse || 'Niet opgegeven'}</td>
                </tr>
                <tr style="border-top:1px solid #f3f4f6">
                  <td style="padding:8px 0;color:#6b7280;font-size:13px">Datum</td>
                  <td style="padding:8px 0;font-size:14px">${datum || new Date().toLocaleDateString('nl-NL')}</td>
                </tr>
              </table>
              <div style="margin-top:20px;padding:14px 16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0">
                <p style="margin:0;font-size:13px;color:#166534">
                  Tip: Bel ${naam} op ${telefoon} — leads converteren het beste binnen 30 minuten.
                </p>
              </div>
            </div>
            <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:16px">Verstuurd via Briqk AI · briqk.nl</p>
          </div>
        `
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: 'E-mail mislukt', detail: data });
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Lead API fout:', err);
    return res.status(500).json({ error: 'Serverfout' });
  }
}
