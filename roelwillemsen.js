(function () {
  'use strict';

  /* ─── CONFIG ─────────────────────────────────────────────────── */
  const C = {
    bedrijf:       'Roel Willemsen Garantiemakelaars',
    primair:       '#1a5c3a',
    accent:        '#f5c800',
    welkomst:      'Goedendag! Ik ben de AI-assistent van Roel Willemsen. Hoe kan ik je helpen? 🏠',
    suggesties:    ['Wat kost een taxatie?', 'Hoe verkoop ik mijn huis?', 'Afspraak maken'],
    // Roept /api/chat aan — key staat veilig in Vercel env vars
    apiChat:  '/api/chat',
    apiLead:  '/api/lead',
    prompt: `Je bent de vriendelijke AI-assistent van Roel Willemsen Garantiemakelaars in Arnhem.

BEDRIJFSINFO:
- Adres: Ella Fitzgeraldstraat 37, 6836 DP Arnhem
- Telefoon: 026-3274455 | info@roelwillemsen.nl
- Openingstijden: maandag t/m vrijdag 09:00-17:00
- NVM Garantiemakelaar met 45+ jaar ervaring in Arnhem
- Klantbeoordeling: 9.2/10 op Funda | KVK: 09084524

TEAM:
- David Franke — Vastgoedadviseur, 06-10904231
- Maurice Freijters — NVM Register Makelaar & Taxateur, 06-53162169
- Marenthe Freijters — Marketeer
- Leny Huisman — Commercieel Medewerker Binnendienst
- Loïs Freijters — Commercieel Medewerker Binnendienst

DIENSTEN & PRIJZEN:
- Huis verkopen: No Cure = No Pay, courtage ~1-1,5%
- Aankoop begeleiding: professionele hulp bij aankoop
- Taxatie: €350-€600, erkend taxateur
- Gratis waardebepaling: kosteloos en vrijblijvend
- Bouwtechnische keuring, verduurzamingsadvies

VERKOOPPROCES: 1) Onderzoek & afspraken 2) Presentatie & prijs 3) Bezichtiging & onderhandelen 4) Overdracht

VEELGESTELDE VRAGEN:
- Hoe lang duurt een verkoop? Gemiddeld 4-8 weken
- No Cure = No Pay: je betaalt pas bij daadwerkelijke verkoop
- Werkgebied: Arnhem, Velp, Arnhem-Zuid, Elst, Zevenaar
- Gratis waardebepaling: volledig gratis en vrijblijvend
- Afspraak: binnen 1-2 werkdagen
- Weekend: niet bereikbaar, alleen ma-vr 09:00-17:00

GEDRAGSREGELS:
- Vriendelijk, professioneel, max 3-4 zinnen
- Stimuleer altijd contact of afspraak
- Antwoord ALLEEN in het Nederlands
- Bij twijfel: verwijs naar 026-3274455 of info@roelwillemsen.nl`
  };

  /* ─── LEAD STATE ─────────────────────────────────────────────── */
  // Trefwoorden die de lead-flow triggeren
  const LEAD_KW = ['afspraak', 'bellen', 'terugbel', 'contact opnemen', 'bespreken',
                   'meer weten', 'interesse', 'kom langs', 'afspreken', 'gratis waarde',
                   'waardebepaling', 'taxatie aanvragen', 'inplannen'];

  let leadState = null;  // null | 'naam' | 'telefoon' | 'interesse' | 'submitting' | 'done'
  let lead = { naam: '', telefoon: '', interesse: '' };
  let msgCount = 0;
  let history = [];   // voor conversatiegeheugen
  let busy = false;

  /* ─── STYLES ─────────────────────────────────────────────────── */
  const P = C.primair, A = C.accent;
  const css = document.createElement('style');
  css.textContent = `
    #lnch-toggle {
      position:fixed; bottom:24px; right:24px; width:60px; height:60px;
      background:${P}; border:none; border-radius:50%; cursor:pointer;
      font-size:26px; box-shadow:0 6px 24px rgba(0,0,0,.25); z-index:99999;
      transition:transform .2s; display:flex; align-items:center; justify-content:center;
    }
    #lnch-toggle:hover { transform:scale(1.1); }
    #lnch-badge {
      position:absolute; top:-4px; right:-4px; background:${A}; color:#0f3d26;
      font-size:11px; font-weight:700; width:19px; height:19px; border-radius:50%;
      display:flex; align-items:center; justify-content:center;
    }
    #lnch-window {
      position:fixed; bottom:98px; right:24px; width:350px; height:520px;
      background:#fff; border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,.18);
      z-index:99998; display:none; flex-direction:column; overflow:hidden;
      border:1px solid #e5e7eb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      animation:lnchUp .25s ease;
    }
    @keyframes lnchUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    #lnch-window.open { display:flex; }
    .lnch-hd {
      background:${P}; padding:14px 18px; display:flex; align-items:center; gap:12px; flex-shrink:0;
    }
    .lnch-av {
      width:40px; height:40px; background:${A}; border-radius:50%;
      display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;
    }
    .lnch-ht h4 { color:#fff; font-size:13px; font-weight:700; margin:0; }
    .lnch-ht p  { color:rgba(255,255,255,.55); font-size:11px; margin:2px 0 0; }
    .lnch-on {
      width:8px; height:8px; background:#22c55e; border-radius:50%; margin-left:auto;
      animation:lnchP 2s infinite;
    }
    @keyframes lnchP { 0%,100%{opacity:1} 50%{opacity:.4} }
    #lnch-msgs {
      flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column;
      gap:10px; background:#f9f9f9; scroll-behavior:smooth;
    }
    .lmsg {
      max-width:83%; padding:9px 13px; border-radius:13px; font-size:13px;
      line-height:1.5; animation:lnchUp .2s ease; word-break:break-word;
    }
    .lmsg.bot  {
      background:#fff; color:#1a1a1a; align-self:flex-start;
      border:1px solid #e5e7eb; border-bottom-left-radius:3px;
    }
    .lmsg.user {
      background:${P}; color:#fff; align-self:flex-end;
      border-bottom-right-radius:3px;
    }
    .lmsg.lead-prompt {
      background:linear-gradient(135deg,${P},#0f3d26); color:#fff;
      align-self:flex-start; border-bottom-left-radius:3px; max-width:90%;
    }
    .lmsg.lead-success {
      background:linear-gradient(135deg,#166534,#15803d); color:#fff;
      align-self:flex-start; border-bottom-left-radius:3px; max-width:90%;
      text-align:center; padding:16px;
    }
    .lmsg.lead-success .ls-icon { font-size:28px; display:block; margin-bottom:6px; }
    .lmsg.lead-success .ls-title { font-weight:700; font-size:14px; margin-bottom:4px; }
    .lmsg.lead-success .ls-sub { font-size:12px; opacity:.85; }
    .ltyping {
      display:flex; gap:5px; padding:12px 14px; background:#fff;
      border:1px solid #e5e7eb; border-radius:13px; border-bottom-left-radius:3px;
      align-self:flex-start;
    }
    .ldot {
      width:6px; height:6px; background:#9ca3af; border-radius:50%;
      animation:lnchB 1.4s infinite;
    }
    .ldot:nth-child(2){animation-delay:.2s} .ldot:nth-child(3){animation-delay:.4s}
    @keyframes lnchB { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
    #lnch-sugs {
      padding:8px 12px; display:flex; gap:6px; flex-wrap:wrap;
      border-top:1px solid #f0f0f0; background:#fff; flex-shrink:0;
    }
    .lsug {
      font-size:11.5px; padding:5px 11px; border:1.5px solid ${P};
      color:${P}; border-radius:100px; cursor:pointer; background:none;
      font-family:inherit; transition:all .2s; white-space:nowrap;
    }
    .lsug:hover { background:${P}; color:#fff; }
    .lnch-ir {
      padding:10px 12px; display:flex; gap:8px;
      border-top:1px solid #e5e7eb; background:#fff; flex-shrink:0;
    }
    #lnch-input {
      flex:1; border:1.5px solid #e5e7eb; border-radius:9px; padding:9px 12px;
      font-size:13px; font-family:inherit; outline:none; resize:none;
      background:#fafafa; transition:border-color .2s; max-height:80px;
    }
    #lnch-input:focus { border-color:${P}; background:#fff; }
    #lnch-send {
      width:38px; height:38px; background:${P}; border:none; border-radius:9px;
      cursor:pointer; color:#fff; font-size:15px; flex-shrink:0;
      display:flex; align-items:center; justify-content:center; align-self:flex-end;
      transition:background .2s;
    }
    #lnch-send:hover { filter:brightness(1.15); }
    #lnch-send:disabled { opacity:.4; cursor:not-allowed; }
    .lnch-ft {
      text-align:center; padding:6px; font-size:10px; color:#ccc;
      background:#fff; border-top:1px solid #f5f5f5; flex-shrink:0;
    }
    .lnch-ft a { color:#ccc; text-decoration:none; }
    @media(max-width:400px) { #lnch-window{width:calc(100vw - 32px);right:16px;} }
  `;
  document.head.appendChild(css);

  /* ─── HTML ───────────────────────────────────────────────────── */
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <button id="lnch-toggle" onclick="window.__lnchToggle()">
      💬<span id="lnch-badge">1</span>
    </button>
    <div id="lnch-window">
      <div class="lnch-hd">
        <div class="lnch-av">🏠</div>
        <div class="lnch-ht">
          <h4>${C.bedrijf}</h4>
          <p>Altijd bereikbaar · Antwoord in seconden</p>
        </div>
        <div class="lnch-on"></div>
      </div>
      <div id="lnch-msgs">
        <div class="lmsg bot">${C.welkomst}</div>
      </div>
      <div id="lnch-sugs">
        ${C.suggesties.map(s => `<button class="lsug" onclick="window.__lnchQ('${s}')">${s}</button>`).join('')}
      </div>
      <div class="lnch-ir">
        <textarea id="lnch-input" placeholder="Stel je vraag..." rows="1" maxlength="400"></textarea>
        <button id="lnch-send">➤</button>
      </div>
      <div class="lnch-ft">Mogelijk gemaakt door <a href="https://briqk.nl" target="_blank">Briqk.nl</a></div>
    </div>`;
  document.body.appendChild(wrap);

  /* ─── REFS ───────────────────────────────────────────────────── */
  const win   = document.getElementById('lnch-window');
  const msgs  = document.getElementById('lnch-msgs');
  const input = document.getElementById('lnch-input');
  const send  = document.getElementById('lnch-send');
  const sugs  = document.getElementById('lnch-sugs');

  /* ─── HELPERS ────────────────────────────────────────────────── */
  function addMsg(text, cls) {
    const d = document.createElement('div');
    d.className = 'lmsg ' + cls;
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function addMsgHTML(html, cls) {
    const d = document.createElement('div');
    d.className = 'lmsg ' + cls;
    d.innerHTML = html;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function addTyping() {
    const d = document.createElement('div');
    d.className = 'ltyping';
    d.innerHTML = '<div class="ldot"></div><div class="ldot"></div><div class="ldot"></div>';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function isLeadTrigger(text) {
    const t = text.toLowerCase();
    return LEAD_KW.some(kw => t.includes(kw));
  }

  function isValidPhone(t) {
    return /^[\d\s\-+()]{9,}$/.test(t.trim());
  }

  /* ─── LEAD FLOW ──────────────────────────────────────────────── */
  function startLeadFlow(interesse) {
    lead = { naam: '', telefoon: '', interesse: interesse || '' };
    leadState = 'naam';
    sugs.style.display = 'none';
    addMsgHTML(`
      <strong>Super! Ik plan graag een gratis gesprek voor je in. 📅</strong><br><br>
      Hoe is jouw naam?
    `, 'lead-prompt');
  }

  async function handleLeadInput(text) {
    if (leadState === 'naam') {
      lead.naam = text.trim();
      leadState = 'telefoon';
      addMsgHTML(
        `Fijn, ${lead.naam}! 👋<br><br>Wat is jouw telefoonnummer zodat we je kunnen bereiken?`,
        'lead-prompt'
      );
      return;
    }

    if (leadState === 'telefoon') {
      if (!isValidPhone(text)) {
        addMsg('Dat lijkt geen geldig telefoonnummer. Probeer het nog eens (bijv. 06-12345678).', 'lead-prompt');
        return;
      }
      lead.telefoon = text.trim();
      // Als we al weten wat de interesse is, skip dan de interesse-vraag
      if (lead.interesse) {
        await submitLead();
      } else {
        leadState = 'interesse';
        addMsgHTML(
          `Goed! En waar kan ik je mee helpen?<br><br>` +
          `<em>Bijv: huis verkopen, gratis waardebepaling, taxatie, aankoop...</em>`,
          'lead-prompt'
        );
      }
      return;
    }

    if (leadState === 'interesse') {
      lead.interesse = text.trim();
      await submitLead();
      return;
    }
  }

  async function submitLead() {
    leadState = 'submitting';
    const t = addTyping();
    try {
      await fetch(C.apiLead, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
    } catch (_) { /* altijd doorgaan */ }
    t.remove();
    leadState = 'done';
    addMsgHTML(`
      <span class="ls-icon">✅</span>
      <div class="ls-title">Aanvraag ontvangen!</div>
      <div class="ls-sub">
        Bedankt ${lead.naam}! Roel Willemsen neemt <strong>binnen 1 werkdag</strong> contact met je op via ${lead.telefoon}.<br><br>
        Spoed? Bel <strong>026-3274455</strong> (ma-vr 09-17u).
      </div>
    `, 'lead-success');
    input.placeholder = 'Nog een vraag?';
  }

  /* ─── CHAT (Groq via serverless) ─────────────────────────────── */
  async function chat(userMsg) {
    history.push({ role: 'user', content: userMsg });
    const t = addTyping();
    try {
      const res = await fetch(C.apiChat, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: C.prompt },
            ...history.slice(-8) // max 8 berichten context
          ]
        })
      });
      const data = await res.json();
      t.remove();
      const antwoord = res.ok
        ? (data.choices?.[0]?.message?.content || 'Bel ons: 026-3274455')
        : 'Bel ons gerust op 026-3274455!';
      history.push({ role: 'assistant', content: antwoord });
      addMsg(antwoord, 'bot');

      // Na 3+ berichten: zachte lead-CTA als suggestie
      if (msgCount === 3) {
        setTimeout(() => {
          const cta = document.createElement('button');
          cta.className = 'lsug';
          cta.textContent = '📅 Gratis afspraak inplannen';
          cta.onclick = () => {
            sugs.style.display = 'none';
            startLeadFlow('');
          };
          sugs.style.display = 'flex';
          sugs.innerHTML = '';
          sugs.appendChild(cta);
        }, 800);
      }
    } catch (e) {
      t.remove();
      addMsg('Bel ons gerust op 026-3274455!', 'bot');
    }
  }

  /* ─── SEND ───────────────────────────────────────────────────── */
  async function doSend() {
    const msg = input.value.trim();
    if (!msg || busy) return;
    busy = true;
    send.disabled = true;
    input.value = '';
    msgCount++;

    addMsg(msg, 'user');

    // Lead flow actief?
    if (leadState && leadState !== 'done') {
      await handleLeadInput(msg);
      busy = false;
      send.disabled = false;
      input.focus();
      return;
    }

    // Lead trigger in normale chat?
    if (!leadState && isLeadTrigger(msg)) {
      // Bepaal interesse op basis van bericht
      const interesse = msg.length > 6 ? msg : '';
      setTimeout(() => startLeadFlow(interesse), 300);
      busy = false;
      send.disabled = false;
      return;
    }

    // Normale AI chat
    await chat(msg);
    busy = false;
    send.disabled = false;
    input.focus();
  }

  /* ─── EVENTS ─────────────────────────────────────────────────── */
  send.addEventListener('click', doSend);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 80) + 'px';
  });

  /* ─── PUBLIC API ─────────────────────────────────────────────── */
  window.__lnchToggle = () => {
    win.classList.toggle('open');
    document.getElementById('lnch-badge').style.display = 'none';
    if (win.classList.contains('open')) input.focus();
  };

  window.__lnchQ = (tekst) => {
    sugs.style.display = 'none';
    if (isLeadTrigger(tekst)) {
      startLeadFlow(tekst);
      return;
    }
    input.value = tekst;
    doSend();
  };

  window.__lnchSend = doSend;

})();
