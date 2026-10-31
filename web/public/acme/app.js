/* AcmeAP: the Accounts Payable portal of Acme Insurance, a fictional company.
   Demo only: static, offline, no network calls. Every person, vendor and amount is made up. */
(() => {
  'use strict';

  const KEY = 'acmeap-demo-v1';
  const reduceMotion = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const main = document.getElementById('main');
  const aiBody = document.getElementById('ai-body');
  const $id = (id) => document.getElementById(id);
  const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const whole = (n) => '$' + n.toLocaleString('en-US');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const stamp = () => new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: 'numeric', minute: '2-digit' }).replace(',', '');

  /* ---------- data ---------- */
  const LINE = { item: 'Copy paper, 8.5 x 11, 10 reams per box', qty: 40, invPrice: 52, poPrice: 48 };
  const MM = { inv: LINE.qty * LINE.invPrice, po: LINE.qty * LINE.poPrice, perUnit: LINE.invPrice - LINE.poPrice };
  MM.diff = MM.inv - MM.po;
  const ESCALATE_OVER = 5000;
  const FLAG_OVER = 10000;

  const ACCRUALS = [
    ['10/22', 'Northwind Office Supply', 'PO-7740', 'Toner cartridges (24)', '6100 Office supplies', 1512],
    ['10/25', 'Northwind Office Supply', 'PO-7742', 'Task chairs (12)', '6100 Office supplies', 3348],
    ['10/29', 'Northwind Office Supply', 'PO-7750', 'Copy paper (20 boxes)', '6100 Office supplies', 960],
    ['10/30', 'Harbor Facilities', 'PO-7701', 'Janitorial services, October', '6250 Facilities', 8400],
    ['10/17', 'Harbor Facilities', 'PO-7712', 'Lobby lighting repair', '6250 Facilities', 2175],
    ['10/24', 'Harbor Facilities', 'PO-7733', 'Generator inspection', '6250 Facilities', 1250],
    ['10/30', 'Bluebird Couriers', 'PO-7705', 'Courier runs, 10/16 to 10/30', '6310 Courier and postage', 528],
    ['10/27', 'Bluebird Couriers', 'PO-7705', 'Same-day legal document delivery', '6310 Courier and postage', 214.5],
    ['10/23', 'Pine &amp; Co. Printing', 'PO-7748', 'Claim form reprint (5,000)', '6420 Printing', 2640],
    ['10/28', 'Pine &amp; Co. Printing', 'PO-7751', 'Window envelopes (10,000)', '6420 Printing', 890],
    ['10/30', 'Summit Data Systems', 'PO-7720', 'Server maintenance, October', '6530 IT services', 12600],
    ['10/26', 'Summit Data Systems', 'PO-7738', 'Laptop docking stations (30)', '6530 IT services', 5370],
    ['10/23', 'Crestline Staffing', 'PO-7709', 'Temp claims processors, week of 10/19', '6610 Temporary staff', 14880],
    ['10/30', 'Crestline Staffing', 'PO-7709', 'Temp claims processors, week of 10/26', '6610 Temporary staff', 9920],
  ].map(([date, vendor, po, desc, gl, amt], i) => ({ id: 'L' + (i + 1), date, vendor, po, desc, gl, amt }));
  const ACCRUAL_TOTAL = ACCRUALS.reduce((sum, l) => sum + l.amt, 0);
  const groupAccruals = () => {
    const groups = new Map();
    for (const l of ACCRUALS) {
      const k = l.vendor + '|' + l.gl;
      if (!groups.has(k)) groups.set(k, { vendor: l.vendor, gl: l.gl, lines: [], total: 0 });
      const g = groups.get(k);
      g.lines.push(l);
      g.total += l.amt;
    }
    return [...groups.values()];
  };
  // Self-check: the numbers shown on screen must add up.
  console.assert(MM.inv === 2080 && MM.po === 1920 && MM.perUnit === 4 && MM.diff === 160, 'AcmeAP: mismatch math');
  console.assert(ACCRUALS.length === 14 && ACCRUAL_TOTAL === 64687.5 && groupAccruals().reduce((s, g) => s + g.total, 0) === ACCRUAL_TOTAL, 'AcmeAP: accrual totals');

  const FIELDS = [
    ['vendor', 'Vendor', 'Pine & Co. Printing', 'high'],
    ['number', 'Invoice number', 'PC-3307', 'high'],
    ['date', 'Invoice date', '10/29/2026', 'high'],
    ['due', 'Due date', '11/28/2026', 'med'],
    ['po', 'PO number', 'PO-7745', 'high'],
    ['desc', 'Description', 'Tri-fold brochures (500) and design setup', 'med'],
    ['amount', 'Amount', '$1,275.00', 'high'],
    ['gl', 'GL code', '6420 Printing', 'med'],
  ];

  const INV_EMAIL = `Hi Northwind billing team,

Thank you for invoice NW-55120 for 40 boxes of copy paper on our PO-7731.

The invoice shows ${money(LINE.invPrice)} per box, but the price agreed on PO-7731 is ${money(LINE.poPrice)} per box. That is ${money(MM.diff)} more in total (${money(MM.inv)} billed vs ${money(MM.po)} agreed).

Could you please send a corrected invoice for ${money(MM.po)}? We will process it as soon as it arrives.

Thank you,
Maria Lopez
Accounts Payable, Acme Insurance`;

  const MAIL_REPLY = `Hi Carla,

Thanks for checking in. Invoice BB-5512 for $1,140.00 is approved and scheduled for payment in our 11/03 ACH run. The remittance advice will come to this address the same day.

Please let me know if you have any other questions.

Best regards,
Maria Lopez
Accounts Payable, Acme Insurance`;

  const SIMPLE = {
    'INV-20422': {
      key: 'po', vendor: 'Harbor Facilities', meta: 'Vendor invoice HF-88120 · Received 10/27 · Due 11/26, Net 30',
      warn: '<strong>No PO number on this invoice.</strong> Invoices over $1,000 need a purchase order before they can be paid.',
      cards: [
        ['Invoice', 'HF-88120', [['Description', 'HVAC quarterly maintenance, Building B'], ['Service date', '10/21'], ['Amount', '$3,450.00'], ['PO number', '<span class="diff">None given</span>']]],
        ['Last similar PO', 'PO-7698', [['Description', 'HVAC quarterly maintenance, Q3'], ['Requester', 'Dana Reyes, Facilities'], ['Amount', '$3,450.00'], ['Status', 'Closed 9/30']]],
      ],
      actions: [['hold', 'Put on hold', 'hold', 'Put on hold until a PO is provided'], ['ask', 'Email requester', 'asked', 'Emailed Dana Reyes (Facilities) asking for the Q4 PO number']],
      done: { asked: '<strong>Waiting on Facilities.</strong> Dana Reyes has been asked for the Q4 PO number. Nothing pays until it arrives.' },
      intro: 'This invoice is missing a purchase order. I can explain why that blocks payment.',
      explainLabel: 'Explain the missing PO',
      explain: '<p>Harbor billed $3,450.00 for HVAC maintenance but left the PO number off the invoice. Without a PO there is no proof someone approved the spend, so it cannot be paid yet.</p><p>Last quarter the same work was on PO-7698, requested by Dana Reyes in Facilities. Q4 most likely needs a new PO.</p>',
      next: '<p><b>Put it on hold</b>, then <b>email the requester</b> (Dana Reyes) for the Q4 PO number. Do not reuse the old PO: the approval has to be real.</p>',
      after: '<p>Nothing to do until Facilities replies. If there is no answer by Monday, a quick call to Dana usually beats a second email.</p>',
    },
    'INV-20425': {
      key: 'dup', vendor: 'Bluebird Couriers', meta: 'Vendor invoice BB5530 · Received 10/29 · Due 11/15, Net 30',
      warn: '<strong>Possible duplicate of INV-20409.</strong> Same vendor, same amount, same invoice date. The invoice numbers differ only by a dash.',
      cards: [
        ['This invoice', 'INV-20425', [['Vendor invoice', '<span class="diff">BB5530</span>'], ['Invoice date', '<span class="diff">10/16</span>'], ['Amount', '<span class="diff">$486.00</span>'], ['Description', 'Courier runs, 10/01 to 10/15'], ['Received', '10/29']]],
        ['Already in AcmeAP', 'INV-20409', [['Vendor invoice', '<span class="ref">BB-5530</span>'], ['Invoice date', '<span class="ref">10/16</span>'], ['Amount', '<span class="ref">$486.00</span>'], ['Description', 'Courier runs, 10/01 to 10/15'], ['Status', 'Approved, pays 11/15']]],
      ],
      actions: [['reject', 'Reject as duplicate', 'rejected', 'Rejected as a duplicate of INV-20409. Vendor notified'], ['clear', 'Not a duplicate', 'cleared', 'Reviewed: not a duplicate. Sent to normal approval']],
      done: {
        rejected: '<strong>Rejected as a duplicate.</strong> INV-20409 is the one that pays, so nothing is paid twice.',
        cleared: '<strong>Cleared.</strong> It goes to normal approval.',
      },
      intro: 'This looks like an invoice we already have. I can show you why.',
      explainLabel: 'Why is it a possible duplicate?',
      explain: '<p>Bluebird sent BB5530 for $486.00, dated 10/16. We already have BB-5530 for $486.00, dated 10/16, approved as INV-20409.</p><p>Same vendor, same amount, same date, and the numbers match once you ignore the dash. Vendors often re-send an invoice when they think it got lost. Paying both would cost $486.00.</p>',
      next: '<p>Open both PDFs side by side. If the service dates and amounts match, <b>reject it as a duplicate</b>. If anything differs, ask Bluebird before you decide.</p>',
      after: '<p>Done. If Bluebird re-sends invoices often, mention it when you next talk to them. That is a process fix, not just a one-off.</p>',
    },
  };

  const TONE = {
    mismatch: ['Price mismatch', 'warn'], hold: ['On hold', 'neutral'], waiting: ['Waiting on vendor', 'info'],
    corrected: ['Corrected invoice', 'info'], released: ['Released for payment', 'ok'], escalated: ['Escalated', 'warn'],
    missing: ['Missing PO', 'warn'], asked: ['Waiting on requester', 'info'],
    dup: ['Possible duplicate', 'warn'], rejected: ['Rejected as duplicate', 'ok'], cleared: ['Not a duplicate', 'ok'],
  };

  /* ---------- state (localStorage, every access guarded) ---------- */
  const fresh = () => ({
    inv: { status: 'mismatch', exception: false, composer: false, sent: false, sentAt: '', draft: '', log: [
      ['10/29 8:12 AM', 'Invoice NW-55120 arrived from billing@northwind-office.example'],
      ['10/29 8:12 AM', 'Matched to PO-7731 and receiving record RCV-3318'],
      ['10/29 8:13 AM', 'Flagged: unit price $52.00 does not match PO price $48.00'],
    ] },
    po: { status: 'missing', exception: false, log: [['10/27 2:40 PM', 'Invoice HF-88120 arrived with no PO number'], ['10/27 2:40 PM', 'Flagged: invoices over $1,000 need a PO']] },
    dup: { status: 'dup', exception: false, log: [['10/29 9:05 AM', 'Invoice BB5530 arrived from ar@bluebird-couriers.example'], ['10/29 9:05 AM', 'Flagged: looks like INV-20409 (BB-5530), already approved']] },
    mail: { looked: false, draft: '', sent: false, sentAt: '' },
    entry: { vals: {}, checked: {}, read: false, submitted: false },
    month: { grouped: false, reviewed: {}, booked: false },
  });
  const load = () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (v && typeof v === 'object') return Object.assign(fresh(), v);
    } catch (e) { /* blocked or corrupt storage: start fresh */ }
    return fresh();
  };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* demo still works without storage */ } };
  let S = load();

  /* ---------- small UI helpers ---------- */
  const chip = (label, tone) => `<span class="chip chip-${tone}">${label}</span>`;
  const stChip = (st) => chip(...(TONE[st] || TONE.mismatch));
  const mailChip = () => (S.mail.sent ? chip('Replied', 'ok') : chip('Vendor question', 'info'));
  const entryChip = () => (S.entry.submitted ? chip('Submitted for approval', 'ok') : chip('New invoice', 'info'));
  const monthChip = () => (S.month.booked ? chip('Accrual booked', 'ok') : S.month.grouped ? chip('Review flagged lines', 'warn') : chip('Month-end', 'neutral'));
  const fixedInv = () => S.inv.status === 'corrected' || S.inv.status === 'released';
  const openCount = () => [S.inv.status !== 'released', S.po.status !== 'asked', !['rejected', 'cleared'].includes(S.dup.status), !S.mail.sent, !S.entry.submitted, !S.month.booked].filter(Boolean).length;

  // aria-disabled (not disabled) keeps the button focusable so keyboard users can reach the "why" tooltip.
  const btn = (act, label, o = {}) => {
    const tip = o.off && o.why ? 'tip-' + act : '';
    return `<span class="btn-wrap"><button type="button" id="b-${act}" class="btn ${o.cls || ''}" data-act="${act}"${o.off ? ' aria-disabled="true"' : ''}${tip ? ` aria-describedby="${tip}"` : ''}>${label}</button>${tip ? `<span class="tip" role="tooltip" id="${tip}">${o.why}</span>` : ''}</span>`;
  };
  const crumbs = (href, label, here) => `<nav class="crumbs" aria-label="Breadcrumb"><a href="${href}">${label}</a><span aria-hidden="true">/</span><span>${here}</span></nav>`;
  const timeline = (log) => `<section class="panel"><h2>Timeline</h2><ol class="timeline">${log.slice().reverse().map(([t, x]) => `<li><time>${esc(t)}</time><span>${esc(x)}</span></li>`).join('')}</ol></section>`;
  const composer = (o) => `<section class="panel" aria-labelledby="${o.id}-h">
      <div class="composer-head"><h2 id="${o.id}-h">${o.heading}</h2>${o.sent ? '' : `<button type="button" class="btn btn-ai" data-act="ai-draft">&#10022; Draft with AI</button>`}</div>
      <p class="mail-meta"><span>To: ${o.to}</span><span>Subject: ${o.subject}</span></p>
      <label class="sr-only" for="${o.id}">Message</label>
      <textarea id="${o.id}" rows="11"${o.sent ? ' readonly' : ''} placeholder="Write your message, or let AI draft it.">${esc(o.value)}</textarea>
      ${o.sent ? `<p class="sent">Sent ${esc(o.sentAt)}.</p>` : `<div class="composer-foot"><p class="review-note"><strong>Review before sending.</strong> Check names, numbers and tone. You are the one sending it.</p>${btn(o.sendAct, 'Send', { cls: 'btn-primary' })}</div>`}
      <p class="form-error" id="${o.id}-err" role="alert"></p>
    </section>`;

  let gen = 0; // bumps on every route change so stale animations stop
  function aiSay(title, html, delay = 450) {
    const out = $id('ai-out');
    if (!out) return;
    const my = gen;
    out.innerHTML = '<div class="ai-card"><p class="thinking">Thinking</p></div>';
    setTimeout(() => {
      if (my !== gen) return;
      out.innerHTML = `<div class="ai-card"><h3>${title}</h3><div class="ai-text">${html}</div><p class="ai-foot">AI suggests. You decide.</p></div>`;
    }, reduceMotion ? 0 : delay);
  }
  function typeInto(el, text, ticks = 50) {
    const my = gen;
    return new Promise((done) => {
      if (reduceMotion) { el.value = text; done(true); return; }
      const step = Math.max(1, Math.ceil(text.length / ticks));
      let i = 0;
      el.value = '';
      const t = setInterval(() => {
        if (my !== gen || !el.isConnected) { clearInterval(t); done(false); return; }
        i = Math.min(text.length, i + step);
        el.value = text.slice(0, i);
        el.scrollTop = el.scrollHeight;
        if (i >= text.length) { clearInterval(t); done(true); }
      }, 16);
    });
  }
  const showErr = (id, msg) => { const e = $id(id); if (e) e.textContent = msg; };

  /* ---------- views ---------- */
  function viewQueue() {
    const rows = [
      ['#/invoices/INV-20418', stChip(S.inv.status), 'Northwind Office Supply', 'INV-20418 · PO-7731', `${money(MM.inv)} invoice vs PO-7731 ${money(MM.po)} · 40 boxes copy paper, ${money(LINE.invPrice)} vs ${money(LINE.poPrice)}`, money(fixedInv() ? MM.po : MM.inv), 'Due 11/26'],
      ['#/invoices/INV-20422', stChip(S.po.status), 'Harbor Facilities', 'INV-20422', 'HVAC quarterly maintenance. No PO number on the invoice.', money(3450), 'Due 11/26'],
      ['#/invoices/INV-20425', stChip(S.dup.status), 'Bluebird Couriers', 'INV-20425', 'Same vendor, amount and date as INV-20409 (BB-5530)', money(486), 'Due 11/15'],
      ['#/vendors/email', mailChip(), 'Vendor asks: where&#39;s my payment?', 'Email from Bluebird Couriers · 10/29 4:52 PM', 'About invoice BB-5512 for $1,140.00', money(1140), 'Reply today'],
      ['#/invoices/new', entryChip(), 'New invoice to enter', 'PDF from Pine &amp; Co. Printing · PC-3307.pdf', 'Arrived 10/29 by email. Needs keying and routing for approval.', S.entry.submitted ? money(1275) : 'Not entered', 'Enter by 11/02'],
      ['#/month-end', monthChip(), 'Month-end accruals: October', '14 received-not-invoiced lines', 'Group, review and book before the books close', money(ACCRUAL_TOTAL), 'Due 11/03'],
    ];
    const n = openCount();
    return {
      html: `<div class="page-head"><div><h1 tabindex="-1">Work queue</h1><p class="meta">Friday, October 30 · ${n ? `${n} of 6 items need you` : 'All clear. Nice work.'}</p></div></div>
        <ul class="qlist">${rows.map(([href, ch, title, ref, sub, amt, due]) => `<li><a class="qrow" href="${href}"><span class="q-chip">${ch}</span><span class="q-main"><span class="q-title">${title}</span><span class="q-ref">${ref}</span><span class="q-sub">${sub}</span></span><span class="q-side"><span class="q-amt">${amt}</span><span class="q-due">${due}</span></span><span class="q-go" aria-hidden="true">&rsaquo;</span></a></li>`).join('')}</ul>
        <p class="hint">New to AI Assist? Open any item. AI explains it and drafts the routine parts. You check the work and make the call.</p>`,
      ai: { intro: 'Six items today. I can suggest an order so the urgent ones go first.', items: [['ai-plan', 'Plan my day']] },
      acts: {
        'ai-plan': () => aiSay('Suggested order', `<ol>
          <li><b>Hold INV-20418</b> (Northwind). It would pay ${money(MM.diff)} too much in Tuesday's run.</li>
          <li><b>Reply to Bluebird.</b> A vendor is waiting. About 2 minutes.</li>
          <li><b>Check INV-20425.</b> Stops a ${money(486)} double payment.</li>
          <li><b>Enter the Pine &amp; Co. invoice.</b> I will read the PDF for you.</li>
          <li><b>Ask Facilities for a PO</b> on INV-20422.</li>
          <li><b>October accruals.</b> Due 11/03. I will group the 14 lines.</li></ol>`),
      },
    };
  }

  function viewInvoices() {
    const rows = [
      ['INV-20418', 'Northwind Office Supply', fixedInv() ? 'NW-55120-R1' : 'NW-55120', fixedInv() ? MM.po : MM.inv, '11/26', stChip(S.inv.status), true],
      ['INV-20422', 'Harbor Facilities', 'HF-88120', 3450, '11/26', stChip(S.po.status), true],
      ['INV-20425', 'Bluebird Couriers', 'BB5530', 486, '11/15', stChip(S.dup.status), true],
      ['INV-20409', 'Bluebird Couriers', 'BB-5530', 486, '11/15', chip('Approved', 'ok'), false],
      ['INV-20397', 'Bluebird Couriers', 'BB-5512', 1140, '11/03', chip('Scheduled 11/03', 'info'), false],
    ];
    if (S.entry.submitted) rows.unshift(['INV-20431', 'Pine &amp; Co. Printing', 'PC-3307', 1275, '11/28', chip('Awaiting approval', 'info'), false]);
    return {
      html: `<div class="page-head"><div><h1 tabindex="-1">Invoices</h1><p class="meta">Open invoices this month</p></div><a class="btn btn-primary" href="#/invoices/new">Enter new invoice</a></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Invoice</th><th>Vendor</th><th>Vendor invoice #</th><th class="num">Amount</th><th>Due</th><th>Status</th></tr></thead><tbody>
        ${rows.map(([id, v, vn, amt, due, ch, link]) => `<tr><td>${link ? `<a href="#/invoices/${id}">${id}</a>` : id}</td><td>${v}</td><td>${vn}</td><td class="num">${money(amt)}</td><td>${due}</td><td>${ch}</td></tr>`).join('')}
        </tbody></table></div>`,
      ai: { intro: 'Open an invoice and I will explain any problem in plain language.', items: [['ai-first', 'Which one first?']] },
      acts: { 'ai-first': () => aiSay('Start here', `<p><b>INV-20418.</b> Unless someone puts it on hold, it pays ${money(MM.diff)} too much in the 11/03 run.</p>`) },
    };
  }

  function viewMismatch() {
    const s = S.inv;
    const st = s.status;
    const fixed = fixedInv();
    const price = fixed ? LINE.poPrice : LINE.invPrice;
    const hi = fixed ? '' : ' class="diff"';
    const lo = fixed ? '' : ' class="ref"';
    const canEscalate = MM.diff > ESCALATE_OVER;
    const done = st === 'released';
    const set = (patch, text) => { Object.assign(s, patch); if (text) s.log.push([stamp(), text]); save(); render(); };
    const nextStep = () => ({
      mismatch: `<p><b>1. Put it on hold</b> so it does not go out in Tuesday's payment run at the wrong price.</p><p><b>2. Email Northwind</b> for a corrected invoice at ${money(LINE.poPrice)} a box. I can draft it.</p><p>The difference is ${money(MM.diff)}, under the ${whole(ESCALATE_OVER)} escalation limit, so this is your call. No manager needed.</p>`,
      hold: `<p>It is on hold. Now <b>email Northwind</b> and ask for a corrected invoice at ${money(LINE.poPrice)} a box (${money(MM.po)} total). I can draft it for you.</p>`,
      waiting: `<p>When the corrected invoice arrives, click <b>Mark corrected invoice received</b>, check it says ${money(MM.po)}, then release it.</p>${s.exception ? '' : '<p>Optional: <b>log an exception</b> so the price issue shows up in the monthly vendor review.</p>'}`,
      corrected: `<p>Invoice, PO and receiving now all match at ${money(MM.po)}. <b>Release it</b> so it makes the 11/03 payment run.</p>`,
      released: `<p>Done. It pays ${money(MM.po)} on 11/03.</p><p>Worth a thought: this is Northwind's second price mismatch this quarter. Asking them to fix their price list stops the next one. Spotting patterns like this is the part of the job AI cannot do for you.</p>`,
      escalated: '<p>Your AP manager has it now. Add notes to the timeline if they ask.</p>',
    })[st];
    const draft = async () => {
      if (s.sent) { aiSay('Already sent', '<p>The email to Northwind is sent. Next: wait for the corrected invoice.</p>'); return; }
      if (!s.composer) { s.composer = true; save(); render(); }
      const ta = $id('inv-draft');
      if (!ta) return;
      ta.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      aiSay('Drafting the vendor email', '<p>I am writing a polite request for a corrected invoice in the email box. Read it before you send, and change anything that does not sound like you.</p>', 200);
      if (await typeInto(ta, INV_EMAIL)) { s.draft = ta.value; save(); ta.focus({ preventScroll: true }); }
    };
    return {
      html: `${crumbs('#/queue', 'Work queue', 'INV-20418')}
        <div class="page-head"><div><h1 tabindex="-1">INV-20418 · Northwind Office Supply</h1><p class="meta">Vendor invoice ${fixed ? 'NW-55120-R1 (corrected)' : 'NW-55120'} · Received 10/29 · Due 11/26, Net 30</p></div>
          <div class="chips">${stChip(st)}${s.exception ? chip('Exception logged', 'neutral') : ''}</div></div>
        ${fixed
          ? `<div class="banner banner-ok"><strong>Three-way match passes.</strong> Invoice, PO and receiving all say 40 boxes at ${money(LINE.poPrice)}, total ${money(MM.po)}.</div>`
          : `<div class="banner banner-warn"><strong>Price mismatch: ${money(MM.perUnit)} per box, ${money(MM.diff)} total.</strong> The invoice says ${money(LINE.invPrice)} a box; PO-7731 says ${money(LINE.poPrice)}. Quantity matches: 40 ordered, 40 received, 40 billed.</div>`}
        <p class="line-item">Line 1 of 1 · ${LINE.item}</p>
        <div class="cards">
          <section class="card"><h2>Invoice <span>${fixed ? 'NW-55120-R1' : 'NW-55120'}</span></h2><dl>
            <dt>Quantity</dt><dd>40 boxes</dd>
            <dt>Unit price</dt><dd${hi}>${money(price)}</dd><dt>Total</dt><dd${hi}>${money(LINE.qty * price)}</dd>
            <dt>Invoice date</dt><dd>${fixed ? '10/30' : '10/27'}</dd></dl></section>
          <section class="card"><h2>Purchase order <span>PO-7731</span></h2><dl>
            <dt>Quantity</dt><dd>40 boxes</dd>
            <dt>Unit price</dt><dd${lo}>${money(LINE.poPrice)}</dd><dt>Total</dt><dd${lo}>${money(MM.po)}</dd>
            <dt>Approved by</dt><dd>Kevin Brandt</dd></dl></section>
          <section class="card"><h2>Receiving record <span>RCV-3318</span></h2><dl>
            <dt>Quantity received</dt><dd>40 boxes</dd>
            <dt>Received</dt><dd>10/28</dd><dt>Received by</dt><dd>Tomas Okafor</dd><dt>Condition</dt><dd>Good</dd></dl></section>
        </div>
        <section class="panel"><h2>Actions</h2><div class="actions">
          ${btn('hold', 'Put on hold', { off: st !== 'mismatch' })}
          ${btn('email', 'Email vendor', { off: s.sent || done })}
          ${btn('escalate', 'Escalate', { off: !canEscalate || done || st === 'escalated', why: canEscalate ? '' : `Escalate is only for differences over ${whole(ESCALATE_OVER)}. This one is ${money(MM.diff)}, so you can resolve it yourself.` })}
          ${btn('exception', 'Log exception', { off: s.exception })}
          ${st === 'waiting' ? btn('corrected', 'Mark corrected invoice received') : ''}
          ${btn('release', 'Release', { cls: st === 'corrected' ? 'btn-primary' : '', off: st !== 'corrected', why: done ? '' : 'Release unlocks after a corrected invoice is marked received.' })}
        </div></section>
        ${s.composer || s.sent ? composer({ id: 'inv-draft', heading: 'Email vendor', to: 'billing@northwind-office.example', subject: 'Corrected invoice needed: NW-55120 (PO-7731)', value: s.draft, sent: s.sent, sentAt: s.sentAt, sendAct: 'send' }) : ''}
        ${timeline(s.log)}`,
      ai: { intro: 'This invoice does not match its purchase order. I can explain it, draft the vendor email and suggest what to do next.', items: [['ai-explain', 'Explain this mismatch'], ['ai-draft', 'Draft vendor email'], ['ai-next', 'Suggest next step']] },
      acts: {
        hold: () => set({ status: 'hold' }, 'Put on hold by Maria Lopez so it does not pay at the wrong price'),
        email: () => { if (!s.composer) { s.composer = true; save(); render(); } const ta = $id('inv-draft'); if (ta) { ta.scrollIntoView({ block: 'center' }); ta.focus({ preventScroll: true }); } },
        escalate: () => set({ status: 'escalated' }, 'Escalated to AP manager'),
        exception: () => set({ exception: true }, `Exception EXC-0912 logged: price variance ${money(MM.diff)}, Northwind Office Supply`),
        corrected: () => set({ status: 'corrected' }, `Corrected invoice NW-55120-R1 received: 40 boxes at ${money(LINE.poPrice)}, total ${money(MM.po)}`),
        release: () => set({ status: 'released' }, 'Released for payment in the 11/03 ACH run'),
        send: () => {
          const v = ($id('inv-draft') || {}).value || '';
          if (!v.trim()) { showErr('inv-draft-err', 'Write the email or let AI draft it first.'); return; }
          set({ sent: true, draft: v, sentAt: stamp(), status: done ? st : 'waiting' }, 'Emailed Northwind billing asking for a corrected invoice at the PO price');
        },
        'ai-explain': () => aiSay('Why this was flagged', `<p>Northwind billed <b>${money(LINE.invPrice)}</b> a box. The purchase order we agreed to says <b>${money(LINE.poPrice)}</b> a box.</p><p>We received all 40 boxes on 10/28, so the quantity is right. Only the price is off: ${money(MM.perUnit)} &times; 40 boxes = <b>${money(MM.diff)}</b> more than we agreed to pay.</p><p>This usually means the vendor used an old price list. It is small, so a corrected invoice fixes it. No escalation needed.</p>`),
        'ai-draft': draft,
        'ai-next': () => aiSay('Suggested next step', nextStep()),
      },
    };
  }

  function viewSimple(id) {
    const c = SIMPLE[id];
    const s = S[c.key];
    const st = s.status;
    const doneMsg = c.done[st];
    const set = (patch, text) => { Object.assign(s, patch); if (text) s.log.push([stamp(), text]); save(); render(); };
    const acts = {
      exception: () => set({ exception: true }, 'Exception logged for monthly vendor review'),
      'ai-explain': () => aiSay('What is going on', c.explain),
      'ai-next': () => aiSay('Suggested next step', doneMsg ? c.after : c.next),
    };
    c.actions.forEach(([act, , to, text]) => { acts[act] = () => set({ status: to }, text); });
    return {
      html: `${crumbs('#/queue', 'Work queue', id)}
        <div class="page-head"><div><h1 tabindex="-1">${id} · ${c.vendor}</h1><p class="meta">${c.meta}</p></div><div class="chips">${stChip(st)}${s.exception ? chip('Exception logged', 'neutral') : ''}</div></div>
        <div class="banner ${doneMsg ? 'banner-ok' : 'banner-warn'}">${doneMsg || c.warn}</div>
        <div class="cards">${c.cards.map(([t, ref, rows]) => `<section class="card"><h2>${t} <span>${ref}</span></h2><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></section>`).join('')}</div>
        <section class="panel"><h2>Actions</h2><div class="actions">${c.actions.map(([act, label, to]) => btn(act, label, { off: !!doneMsg || st === to })).join('')}${btn('exception', 'Log exception', { off: s.exception })}</div></section>
        ${timeline(s.log)}`,
      ai: { intro: c.intro, items: [['ai-explain', c.explainLabel], ['ai-next', 'Suggest next step']] },
      acts,
    };
  }

  function viewEntry() {
    const e = S.entry;
    const nChecked = FIELDS.filter(([k]) => e.checked[k]).length;
    const ready = FIELDS.every(([k]) => e.checked[k] && String(e.vals[k] || '').trim());
    const head = `${crumbs('#/invoices', 'Invoices', 'New invoice')}
      <div class="page-head"><div><h1 tabindex="-1">New invoice to enter</h1><p class="meta">PC-3307.pdf from Pine &amp; Co. Printing · arrived 10/29 by email</p></div><div class="chips">${entryChip()}</div></div>`;
    const ai = { intro: 'I can read the PDF and fill in the fields. You check each one before it goes for approval.', items: [['read', 'Let AI read it'], ['ai-check', 'What should I double-check?']] };
    const check = () => aiSay('Where to look twice', '<p>Amber dots are where I worked something out instead of reading it:</p><ol><li><b>Due date:</b> I calculated it from "Net 30".</li><li><b>Description:</b> I summarized two lines.</li><li><b>GL code:</b> I guessed from past Pine &amp; Co. invoices.</li></ol><p>Green ones I read straight off the PDF. A quick look is still your call.</p>');
    if (e.submitted) {
      return {
        html: `${head}<div class="banner banner-ok"><strong>Submitted for approval.</strong> INV-20431 is routed to Jordan Park (Marketing budget owner). AI read 8 fields; you checked all 8.</div>
          <section class="panel"><h2>What was submitted</h2><dl>${FIELDS.map(([k, label]) => `<dt>${label}</dt><dd>${esc(e.vals[k] || '')}</dd>`).join('')}</dl></section>
          <a class="btn" href="#/queue">Back to work queue</a>`,
        ai, acts: { read: () => aiSay('Already done', '<p>This invoice is submitted. Nice work.</p>'), 'ai-check': check },
      };
    }
    const dotFor = (conf) => (e.read ? `dot-${conf}` : 'dot-none');
    const dotText = (conf) => (e.read ? (conf === 'high' ? 'AI is confident' : 'Double-check this one') : 'Not read yet');
    return {
      html: `${head}<div class="entry">
        <figure class="pdf-wrap"><div class="pdf-bar"><span>PC-3307.pdf</span><span>Page 1 of 1</span></div>
          <div class="pdf" role="img" aria-label="Invoice PDF from Pine and Co. Printing, invoice PC-3307, total 1,275 dollars">
            <div class="pdf-head"><div><div class="pdf-logo">Pine &amp; Co.</div><div class="pdf-small">Printing and Design<br>88 Cedar Row, Millbrook</div></div><div class="pdf-title">INVOICE</div></div>
            <div class="pdf-grid"><div><b>Bill to</b><br>Acme Insurance<br>Accounts Payable<br>1200 Lakeview Plaza, Suite 400</div><div><b>Invoice #</b> PC-3307<br><b>Date</b> Oct 29, 2026<br><b>Terms</b> Net 30<br><b>Your PO</b> PO-7745</div></div>
            <table><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody><tr><td>Tri-fold brochure, 100 lb gloss, full color</td><td>500</td><td>2.35</td><td>1,175.00</td></tr><tr><td>Design setup</td><td>1</td><td>100.00</td><td>100.00</td></tr></tbody>
              <tfoot><tr><td colspan="3">Total due (USD)</td><td>1,275.00</td></tr></tfoot></table>
            <p class="pdf-small">Thank you for your business. Questions: billing@pine-and-co.example</p>
          </div></figure>
        <section class="panel"><div class="composer-head"><h2>Invoice details</h2><button type="button" id="b-read" class="btn btn-ai" data-act="read">&#10022; Let AI read it</button></div>
          <p class="legend"><span><i class="dot dot-high"></i>AI is confident</span><span><i class="dot dot-med"></i>Double-check this one</span></p>
          <div class="fields">${FIELDS.map(([k, label, , conf]) => `<div class="field"><label for="f-${k}">${label}</label>
            <input id="f-${k}" data-field="${k}" value="${esc(e.vals[k] || '')}" autocomplete="off">
            <span class="dot ${dotFor(conf)}" id="d-${k}" title="${dotText(conf)}"><span class="sr-only">${dotText(conf)}</span></span>
            <label class="check"><input type="checkbox" id="c-${k}" data-check="${k}"${e.checked[k] ? ' checked' : ''}>Checked<span class="sr-only"> ${label}</span></label></div>`).join('')}</div>
          <div class="composer-foot"><p class="muted" aria-live="polite">${nChecked} of ${FIELDS.length} checked</p>${btn('submit', 'Submit for approval', { cls: 'btn-primary', off: !ready, why: 'Tick Checked on all 8 fields first. You are confirming each one matches the PDF.' })}</div>
        </section></div>`,
      ai,
      acts: {
        read: async () => {
          if (e.read) { aiSay('Already read', '<p>All 8 fields are filled. Your part now: compare each one with the PDF and tick <b>Checked</b>.</p>'); return; }
          const b = $id('b-read');
          if (!b || b.getAttribute('aria-disabled') === 'true') return;
          b.setAttribute('aria-disabled', 'true');
          b.textContent = 'Reading the PDF...';
          aiSay('Reading PC-3307.pdf', '<p>Filling in the 8 fields. Green dot: I read it straight off the page. Amber dot: I worked it out, so check it against the PDF.</p>', 150);
          const my = gen;
          for (const [k, , val, conf] of FIELDS) {
            const el = $id('f-' + k);
            if (!el) break;
            el.classList.add('typing');
            await typeInto(el, val, 14);
            if (my !== gen) return;
            el.classList.remove('typing');
            e.vals[k] = val;
            const d = $id('d-' + k);
            if (d) { d.className = 'dot dot-' + conf; d.title = conf === 'high' ? 'AI is confident' : 'Double-check this one'; }
          }
          e.read = true;
          save();
          render();
        },
        'ai-check': check,
        submit: () => { e.submitted = true; save(); render(); },
      },
    };
  }

  function viewVendors() {
    const vendors = [
      ['Northwind Office Supply', 'billing@northwind-office.example', 'Net 30', 1, 48210],
      ['Harbor Facilities', 'ar@harbor-facilities.example', 'Net 30', 1, 96540],
      ['Bluebird Couriers', 'ar@bluebird-couriers.example', 'Net 30', 3, 14302.5],
      ['Pine &amp; Co. Printing', 'billing@pine-and-co.example', 'Net 30', S.entry.submitted ? 1 : 0, 22875],
      ['Summit Data Systems', 'invoices@summit-data.example', 'Net 45', 0, 151200],
      ['Crestline Staffing', 'ar@crestline-staffing.example', 'Net 15', 0, 203640],
    ];
    return {
      html: `<div class="page-head"><div><h1 tabindex="-1">Vendors</h1><p class="meta">Vendor inbox and directory</p></div></div>
        <section class="panel"><h2>Vendor inbox</h2><ul class="qlist"><li><a class="qrow" href="#/vendors/email"><span class="q-chip">${mailChip()}</span><span class="q-main"><span class="q-title">Payment status for invoice BB-5512</span><span class="q-ref">Carla Mendes, Bluebird Couriers</span></span><span class="q-side"><span class="q-due">10/29 4:52 PM</span></span><span class="q-go" aria-hidden="true">&rsaquo;</span></a></li></ul></section>
        <div class="table-wrap"><table class="table"><thead><tr><th>Vendor</th><th>AP contact</th><th>Terms</th><th class="num">Open invoices</th><th class="num">Spend this year</th></tr></thead><tbody>
        ${vendors.map(([n, mail, terms, open, ytd]) => `<tr><td>${n}</td><td>${mail}</td><td>${terms}</td><td class="num">${open}</td><td class="num">${money(ytd)}</td></tr>`).join('')}
        </tbody></table></div>`,
      ai: { intro: 'I can help you answer vendor questions faster.', items: [['ai-wait', 'What is waiting on me?']] },
      acts: { 'ai-wait': () => aiSay('Waiting on you', S.mail.sent ? '<p>Nothing right now. You already answered Bluebird.</p>' : '<p>Bluebird Couriers asked about a payment on 10/29 at 4:52 PM. Answering within a day saves a follow-up call. Open the email in the inbox.</p>') },
    };
  }

  function viewEmail() {
    const m = S.mail;
    return {
      html: `${crumbs('#/vendors', 'Vendors', 'Inbox')}
        <div class="page-head"><div><h1 tabindex="-1">Vendor asks: where's my payment?</h1><p class="meta">Email from Bluebird Couriers · 10/29 4:52 PM</p></div><div class="chips">${mailChip()}</div></div>
        <section class="panel"><dl class="mail-hdr"><dt>From</dt><dd>Carla Mendes &lt;ar@bluebird-couriers.example&gt;</dd><dt>To</dt><dd>ap@acme-insurance.example</dd><dt>Subject</dt><dd>Payment status for invoice BB-5512</dd></dl>
          <div class="mail-body"><p>Hi Acme AP team,</p><p>Can you tell me when invoice BB-5512 for $1,140.00 will be paid? It covers our September deliveries. It is due 11/03 and we have not seen a remittance yet.</p><p>Thanks,<br>Carla Mendes<br>Accounts Receivable, Bluebird Couriers</p></div></section>
        <section class="panel"><div class="composer-head"><h2>Payment status</h2>${m.looked ? '' : btn('lookup', 'Look up BB-5512')}</div>
          ${m.looked ? `<dl><dt>Acme invoice</dt><dd>INV-20397</dd><dt>Amount</dt><dd>$1,140.00</dd><dt>Approved</dt><dd>10/22 by Rosa Gomez</dd><dt>Payment</dt><dd>${chip('Scheduled for 11/03', 'info')} ACH run</dd><dt>Remittance</dt><dd>Emailed to the vendor on payment day</dd></dl>` : '<p class="muted">Look it up before you reply, so the vendor gets the real date.</p>'}</section>
        ${composer({ id: 'mail-draft', heading: 'Reply', to: 'ar@bluebird-couriers.example', subject: 'Re: Payment status for invoice BB-5512', value: m.draft, sent: m.sent, sentAt: m.sentAt, sendAct: 'mail-send' })}`,
      ai: { intro: 'A vendor wants to know when they get paid. Look up the status, and I will draft the reply from it.', items: [['ai-draft', 'Draft reply'], ['ai-next', 'Suggest next step']] },
      acts: {
        lookup: () => { m.looked = true; save(); render(); },
        'ai-draft': async () => {
          if (m.sent) { aiSay('Already sent', '<p>You already replied to Carla.</p>'); return; }
          if (!m.looked) { aiSay('Look it up first', '<p>Click <b>Look up BB-5512</b> first. I write the reply from what the system says, so Carla gets the real payment date and not a guess.</p>'); return; }
          const ta = $id('mail-draft');
          if (!ta) return;
          ta.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
          aiSay('Drafting the reply', '<p>I used the status you looked up: approved, scheduled for 11/03. Read it, adjust the tone if you like, then send.</p>', 200);
          if (await typeInto(ta, MAIL_REPLY)) { m.draft = ta.value; save(); ta.focus({ preventScroll: true }); }
        },
        'ai-next': () => aiSay('Suggested next step', m.sent ? '<p>Done. If Bluebird asks about payments often, offer them access to the supplier portal so they can check status themselves.</p>' : m.looked ? '<p>You have the facts. Let me <b>draft the reply</b>, then review and send it.</p>' : '<p><b>Look up BB-5512</b> first. Never promise a date you have not checked.</p>'),
        'mail-send': () => {
          const v = ($id('mail-draft') || {}).value || '';
          if (!v.trim()) { showErr('mail-draft-err', 'Write the reply or let AI draft it first.'); return; }
          Object.assign(m, { sent: true, draft: v, sentAt: stamp() });
          save();
          render();
        },
      },
    };
  }

  function viewMonth() {
    const m = S.month;
    const flagged = ACCRUALS.filter((l) => l.amt > FLAG_OVER);
    const allReviewed = flagged.every((l) => m.reviewed[l.id]);
    const review = (l) => (l.amt > FLAG_OVER ? `${chip('Over ' + whole(FLAG_OVER), 'warn')} <label class="check"><input type="checkbox" id="r-${l.id}" data-review="${l.id}"${m.reviewed[l.id] ? ' checked' : ''}${m.booked ? ' disabled' : ''}>Reviewed<span class="sr-only"> ${l.desc}</span></label>` : '');
    const total = `<tfoot><tr><th colspan="COLS">Total accrual, ${ACCRUALS.length} lines</th><td class="num">${money(ACCRUAL_TOTAL)}</td>EXTRA</tr></tfoot>`;
    const flat = `<div class="table-wrap"><table class="table"><thead><tr><th>Received</th><th>Vendor</th><th>PO</th><th>Description</th><th>GL code</th><th class="num">Amount</th></tr></thead><tbody>
      ${ACCRUALS.map((l) => `<tr><td>${l.date}</td><td>${l.vendor}</td><td>${l.po}</td><td>${l.desc}</td><td>${l.gl}</td><td class="num">${money(l.amt)}</td></tr>`).join('')}
      </tbody>${total.replace('COLS', '5').replace('EXTRA', '')}</table></div>`;
    const grouped = `<div class="table-wrap"><table class="table"><thead><tr><th>Received</th><th>PO</th><th>Description</th><th class="num">Amount</th><th>Review</th></tr></thead>
      ${groupAccruals().map((g) => `<tbody><tr class="group-row"><th colspan="3" scope="rowgroup">${g.vendor} · GL ${g.gl} · ${g.lines.length} lines</th><td class="num">${money(g.total)}</td><td></td></tr>
        ${g.lines.map((l) => `<tr${l.amt > FLAG_OVER ? ' class="flag-row"' : ''}><td>${l.date}</td><td>${l.po}</td><td>${l.desc}</td><td class="num">${money(l.amt)}</td><td>${review(l)}</td></tr>`).join('')}</tbody>`).join('')}
      ${total.replace('COLS', '3').replace('EXTRA', '<td></td>')}</table></div>`;
    const why = () => aiSay('Why accrue?', '<p>These goods and services arrived in October, but the bills have not. If we wait for the invoices, October looks cheaper than it really was.</p><p>An accrual books the cost in October now. It reverses on 11/01 when the real invoices arrive, so nothing is counted twice.</p>');
    return {
      html: `<div class="page-head"><div><h1 tabindex="-1">Month-end accruals: October</h1><p class="meta">Received but not yet invoiced. Book these so October costs land in October. Due 11/03.</p></div><div class="chips">${monthChip()}</div></div>
        ${m.booked ? `<div class="banner banner-ok"><strong>Accrual JE-1031 booked for ${money(ACCRUAL_TOTAL)}</strong> to 2100 Accrued liabilities. It reverses automatically on 11/01.</div>` : ''}
        <div class="toolbar"><p class="muted" aria-live="polite">${m.grouped ? `Grouped by vendor and GL code · ${flagged.length} lines over ${whole(FLAG_OVER)} flagged for review` : `${ACCRUALS.length} lines, not grouped yet`}</p>
          <div class="actions">${m.grouped ? '' : `<button type="button" id="b-group" class="btn btn-ai" data-act="group">&#10022; Let AI group them</button>`}${m.grouped ? btn('book', 'Book accrual', { cls: 'btn-primary', off: !allReviewed || m.booked, why: m.booked ? '' : `Review the ${flagged.length} flagged lines first.` }) : ''}</div></div>
        ${m.grouped ? grouped : flat}`,
      ai: { intro: 'I can group the 14 lines by vendor and GL code, total them and flag anything large. You review and book.', items: [['group', 'Let AI group them'], ['ai-why', 'Why accrue at all?']] },
      acts: {
        group: () => {
          if (m.grouped) { aiSay('Already grouped', `<p>The lines are grouped. Check the ${flagged.length} flagged lines, then book the accrual.</p>`); return; }
          const b = $id('b-group');
          if (b) { b.setAttribute('aria-disabled', 'true'); b.textContent = 'Grouping 14 lines...'; }
          aiSay('Grouped and flagged', `<p>I grouped the 14 lines into ${groupAccruals().length} vendor and GL groups and added up each one.</p><p><b>${flagged.length} lines are over ${whole(FLAG_OVER)}</b>, so I flagged them. Large accruals are where mistakes cost the most. Check each against its PO, tick Reviewed, then book.</p>`, 700);
          const my = gen;
          setTimeout(() => { if (my !== gen) return; m.grouped = true; save(); render(); }, reduceMotion ? 0 : 700);
        },
        'ai-why': why,
        book: () => { m.booked = true; save(); render(); },
      },
    };
  }

  function viewGrowth() {
    // On the ezworkspace host (dev server or deployed) the coach is the same app; opened as a file, use the live site.
    const train = location.protocol.startsWith('http') ? '/#/train' : 'https://ezworkspace.vercel.app/#/train';
    const wins = [
      [S.inv.status === 'released', 'Resolved a price mismatch from start to finish'],
      [S.mail.sent, 'Answered a vendor with an AI draft you reviewed'],
      [S.entry.submitted, 'Entered an invoice with AI reading the PDF'],
      [S.month.booked, 'Booked month-end accruals with AI grouping'],
    ];
    return {
      html: `<div class="page-head"><div><h1 tabindex="-1">My growth</h1><p class="meta">Maria Lopez · AP Specialist</p></div></div>
        <section class="hero"><p class="big">About 5 hours a week back</p><p class="muted">That is roughly the time AI now saves you on routine work. Spend it on the parts of the job that need a person.</p>
          <ul class="breakdown"><li><b>2 h</b> reading and keying invoice PDFs</li><li><b>1.5 h</b> writing first-draft emails</li><li><b>1.5 h</b> sorting accrual lines</li></ul></section>
        <div class="two-col">
          <section class="panel"><h2>AI now handles</h2><ul class="ticks">
            <li><b>Reading invoice PDFs</b><span>Fills in the fields. You check them.</span></li>
            <li><b>First-draft emails</b><span>Vendor requests and replies. You review and send.</span></li>
            <li><b>Grouping accrual lines</b><span>By vendor and GL code, with totals and flags.</span></li>
          </ul></section>
          <section class="panel own"><h2>You now own</h2><ul class="ticks">
            <li><b>Exception judgment</b><span>When to hold, escalate or release.</span></li>
            <li><b>Vendor relationships</b><span>Fixing recurring issues with the people behind the invoices.</span></li>
            <li><b>Improving the process</b><span>Spotting patterns, like a vendor's old price list, and fixing the cause.</span></li>
            <li><b>Coaching new hires</b><span>Showing the next person how to work with AI.</span></li>
          </ul></section>
        </div>
        <section class="panel"><h2>This week with AI</h2><ul class="wins">${wins.map(([ok, t]) => `<li class="${ok ? 'won' : ''}"><span class="mark" aria-hidden="true">${ok ? '&#10003;' : ''}</span>${t}<span class="sr-only">${ok ? ' (done)' : ' (not yet)'}</span></li>`).join('')}</ul></section>
        <div class="coach"><p>Want to get better at the parts AI cannot do?</p><a href="${train}" target="_blank" rel="noopener">Learn these with your ezworkspace coach &rarr;</a></div>`,
      ai: { intro: 'Here is what changed in your job, and where your freed-up time can go.', items: [['ai-grow', 'What should I learn next?']] },
      acts: { 'ai-grow': () => aiSay('Learn next', '<p>Start with <b>exception judgment</b>. On INV-20418 you hold, ask, verify, then release. That is the skill.</p><p>Next, <b>spot patterns</b>: Northwind has had two price mismatches this quarter. Fixing that at the source saves everyone time.</p><p>Your ezworkspace coach can walk you through both, step by step.</p>') },
    };
  }

  /* ---------- router ---------- */
  const ROUTES = [
    [/^#\/queue$/, 'queue', viewQueue],
    [/^#\/invoices$/, 'invoices', viewInvoices],
    [/^#\/invoices\/new$/, 'invoices', viewEntry],
    [/^#\/invoices\/(INV-\d+)$/, 'invoices', (id) => (id === 'INV-20418' ? viewMismatch() : SIMPLE[id] ? viewSimple(id) : viewInvoices())],
    [/^#\/vendors$/, 'vendors', viewVendors],
    [/^#\/vendors\/email$/, 'vendors', viewEmail],
    [/^#\/month-end$/, 'month-end', viewMonth],
    [/^#\/growth$/, 'growth', viewGrowth],
  ];
  let ACTS = {};
  let lastRoute = '';
  let booted = false;

  function render() {
    const hash = location.hash || '#/queue';
    const hit = ROUTES.find((r) => r[0].test(hash)) || ROUTES[0];
    const param = (hash.match(hit[0]) || [])[1];
    const routeChanged = hash !== lastRoute;
    lastRoute = hash;
    if (routeChanged) gen++;
    const focusId = !routeChanged && document.activeElement && main.contains(document.activeElement) ? document.activeElement.id : '';
    const v = hit[2](param);
    ACTS = v.acts || {};
    main.innerHTML = v.html;
    if (routeChanged) {
      aiBody.innerHTML = `<p class="ai-intro">${v.ai.intro}</p><div class="ai-actions">${v.ai.items.map(([a, l]) => `<button type="button" class="ai-btn" data-act="${a}">${l}</button>`).join('')}</div><div id="ai-out" aria-live="polite"></div>`;
      document.querySelectorAll('.sidenav a').forEach((a) => (a.dataset.nav === hit[1] ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
      main.scrollTop = 0;
      if (booted) { const h = main.querySelector('h1'); if (h) h.focus({ preventScroll: true }); }
    } else if (focusId) {
      const el = $id(focusId);
      if (el) el.focus({ preventScroll: true });
    }
    const n = openCount();
    $id('queue-count').textContent = n ? String(n) : '';
    booted = true;
  }

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    if (b.getAttribute('aria-disabled') === 'true') { ev.preventDefault(); return; }
    const f = ACTS[b.dataset.act];
    if (f) f(b);
  });
  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.id === 'inv-draft') { S.inv.draft = t.value; save(); }
    else if (t.id === 'mail-draft') { S.mail.draft = t.value; save(); }
    else if (t.dataset && t.dataset.field) { S.entry.vals[t.dataset.field] = t.value; save(); }
  });
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.dataset && t.dataset.check) { S.entry.checked[t.dataset.check] = t.checked; save(); render(); }
    else if (t.dataset && t.dataset.review) { S.month.reviewed[t.dataset.review] = t.checked; save(); render(); }
  });
  window.addEventListener('hashchange', render);
  $id('reset').addEventListener('click', () => {
    try { localStorage.removeItem(KEY); } catch (e) { /* nothing stored */ }
    S = fresh();
    lastRoute = '';
    if (location.hash === '#/queue') render(); else location.hash = '#/queue';
  });

  render();
})();
