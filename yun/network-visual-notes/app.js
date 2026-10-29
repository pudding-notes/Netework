/* app.js — week pages, table of contents, routing (#w2, #w2-and), D-day */
'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const anchor = id => id.replace(/\./g, '-');
  const secIndex = {};
  COURSE.weeks.forEach(w => w.sections.forEach((s, i) => { secIndex[s.id] = { w, s, i }; }));
  let curWeek = null, obs = null;

  function tabs() {
    $('tabs').innerHTML = COURSE.weeks.map(w => `<a href="#${w.id}" data-w="${w.id}">${w.short}</a>`).join('');
  }
  function renderWeek(w) {
    curWeek = w;
    document.querySelectorAll('#tabs a').forEach(a => a.setAttribute('aria-current', a.dataset.w === w.id ? 'page' : 'false'));
    const main = $('main'); main.innerHTML = '';
    const head = document.createElement('div'); head.className = 'wk-head';
    head.innerHTML = `<div class="eb">${w.short}${w.range ? ' · 강의 ' + w.range : ''}</div><h1>${w.title}</h1>${w.lead ? `<p>${w.lead}</p>` : ''}`;
    main.appendChild(head);
    const sel = document.createElement('select'); sel.className = 'tocsel'; sel.setAttribute('aria-label', '섹션 이동');
    sel.innerHTML = w.sections.map((s, i) => `<option value="${s.id}">${w.num}.${i + 1} ${s.title.replace(/<[^>]+>/g, '')}</option>`).join('');
    sel.onchange = () => goto(sel.value);
    main.appendChild(sel);
    $('toc').innerHTML = `<h4>${w.short} · ${w.title}</h4>` + w.sections.map((s, i) => `<a href="#${anchor(s.id)}" data-id="${s.id}"><span class="n">${w.num}.${i + 1}</span><span>${s.title}</span>${s.tag ? `<span class="tg">${s.tag}</span>` : ''}</a>`).join('');
    w.sections.forEach((s, i) => {
      const sec = document.createElement('section'); sec.className = 'sec'; sec.id = anchor(s.id); sec.dataset.id = s.id;
      sec.innerHTML = `<header><span class="num">${w.num}.${i + 1}</span><h2>${s.title}</h2>${s.slides ? `<span class="sl">${w.id === 'ex' ? '' : '강의 '}${s.slides}</span>` : ''}</header>`;
      main.appendChild(sec);
      (s.blocks || []).forEach(b => mountBlock(sec, b));
    });
    const nav = document.createElement('div'); nav.style.cssText = 'display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;margin-top:8px';
    const wi = COURSE.weeks.indexOf(w);
    nav.innerHTML = (wi > 0 ? `<a class="btn" href="#${COURSE.weeks[wi - 1].id}">◀ ${COURSE.weeks[wi - 1].short}</a>` : '<span></span>') + (wi < COURSE.weeks.length - 1 ? `<a class="btn pri" href="#${COURSE.weeks[wi + 1].id}" style="text-decoration:none">${COURSE.weeks[wi + 1].short} ▶</a>` : '');
    nav.querySelectorAll('a').forEach(a => a.style.textDecoration = 'none');
    main.appendChild(nav);
    main.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => goto(b.dataset.goto));
    // active section
    if (obs) obs.disconnect();
    obs = new IntersectionObserver(ents => {
      ents.forEach(en => { if (en.isIntersecting) { const id = en.target.dataset.id; document.querySelectorAll('#toc a').forEach(a => a.classList.toggle('on', a.dataset.id === id)); sel.value = id; const on = document.querySelector('#toc a.on'); if (on) on.scrollIntoView({ block: 'nearest' }); LS.set('last', id); } });
    }, { rootMargin: '-70px 0px -65% 0px' });
    main.querySelectorAll('section.sec').forEach(s => obs.observe(s));
  }
  function mountBlock(sec, b) {
    if (typeof b === 'string') { const d = document.createElement('div'); d.className = /^<div class="tw">/.test(b) ? 'prose wide' : 'prose'; d.innerHTML = b; sec.appendChild(d); return; }
    if (b.h3) { const h = document.createElement('h3'); h.className = 'sub'; h.innerHTML = b.h3; sec.appendChild(h); return; }
    if (b.trace) { mountTrace(sec, typeof b.trace === 'function' ? b.trace() : b.trace); return; }
    if (b.lab) { mountLab(sec, b.lab); return; }
    if (b.qc) { mountQC(sec, b.qc); return; }
    if (b.prac) { mountPractice(sec, b.prac); return; }
    if (b.fig) { const d = document.createElement('div'); d.className = 'fig'; sec.appendChild(d); if (typeof b.fig === 'function') b.fig(d); else d.innerHTML = b.fig; if (b.cap) d.insertAdjacentHTML('beforeend', `<div class="cap">${b.cap}</div>`); return; }
    if (b.mount) { const d = document.createElement('div'); sec.appendChild(d); b.mount(d); return; }
  }
  /* history/hash can be blocked when the page runs inside a sandboxed frame (artifact preview) — never let that break navigation */
  function setHash(h) { try { history.replaceState(null, '', '#' + h); } catch (e) { } }
  function readHash() { try { return decodeURIComponent(location.hash.slice(1)); } catch (e) { return ''; } }
  function showWeek(w) { renderWeek(w); window.scrollTo(0, 0); setHash(w.id); LS.set('last', w.sections[0].id); }
  function goto(id) {
    const info = secIndex[id];
    if (!info) { const w = COURSE.weeks.find(x => x.id === id); if (w) showWeek(w); return; }
    if (curWeek !== info.w) renderWeek(info.w);
    setHash(anchor(id));
    const el = document.getElementById(anchor(id));
    if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  function route(h) {
    if (h == null) h = readHash();
    const w = COURSE.weeks.find(x => x.id === h);
    if (w) { showWeek(w); return; }
    const id = h.replace('-', '.');
    if (secIndex[id]) { goto(id); return; }
    const last = LS.get('last', null);
    if (last && secIndex[last]) { goto(last); return; }
    renderWeek(COURSE.weeks[0]);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    e.preventDefault(); route(a.getAttribute('href').slice(1));
  });
  window.APP = { goto };
  tabs();
  window.addEventListener('hashchange', () => route());
  route();
  (function () {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const d = (m, dd) => Math.round((new Date(2026, m - 1, dd) - t) / 864e5);
    const q = d(10, 19), m = d(11, 3); const parts = [];
    if (q >= 0) parts.push(`퀴즈 ${q ? 'D-' + q : 'D-day'}`); if (m >= 0) parts.push(`중간 ${m ? 'D-' + m : 'D-day'}`);
    $('dday').textContent = parts.join(' · '); $('dday').hidden = !parts.length;
  })();
})();
