/* core.js — utilities and components: trace viewer (topology / ladder), lab, bits, bars, chart, quick check, practice. */
'use strict';
const COURSE = { weeks: [] };
function addWeek(w) { COURSE.weeks.push(w); }
const QUIZ = {};

/* ---------- small helpers ---------- */
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
const LS = {
  get(k, d) { try { const v = localStorage.getItem('ntn.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ntn.' + k, JSON.stringify(v)); } catch (e) { } },
};
const H = {
  tbl(head, rows, o = {}) {
    const mono = o.mono || [];
    const th = head ? '<tr>' + head.map(h => `<th>${h}</th>`).join('') + '</tr>' : '';
    const tr = rows.map((r, ri) => `<tr class="${o.hl && o.hl(r, ri) ? 'hl' : ''}">` + r.map((c, i) => `<td class="${mono.includes(i) ? 'm' : ''}">${c}</td>`).join('') + '</tr>').join('');
    return `<div class="tw"><table class="t">${th}${tr}</table></div>`;
  },
  key: s => `<div class="key">${s}</div>`,
  warn: s => `<div class="warn">${s}</div>`,
  note: s => `<div class="note">${s}</div>`,
  exam: (s = 'Quick Check') => `<span class="exam">${s}</span>`,
  pre: s => `<pre>${esc(s)}</pre>`,
  pk: parts => `<span class="pk">${parts.map(([t, c]) => `<span style="background:var(--${c})">${esc(t)}</span>`).join('')}</span>`,
  ref: (id, t = '관련 설명으로 이동') => `<button class="reflink" data-goto="${id}">↳ ${t}</button>`,
  cards: list => `<div class="cards n${list.length}">${list.map(([h, p, c]) => `<div class="card ${c ? 'cc-' + c : ''}"><h4>${h}</h4><p>${p}</p></div>`).join('')}</div>`,
};

/* ---------- IP ---------- */
const IP = {
  parse(s) { const m = String(s).trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/); if (!m) return null; const o = m.slice(1).map(Number); if (o.some(x => x > 255)) return null; return ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3]; },
  str(n) { n = n >>> 0; return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); },
  mask(p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; },
  net(ip, p) { return (ip & IP.mask(p)) >>> 0; },
  bc(ip, p) { return (IP.net(ip, p) | (~IP.mask(p) >>> 0)) >>> 0; },
  bin(n) { return (n >>> 0).toString(2).padStart(32, '0'); },
  bin8(o) { return o.toString(2).padStart(8, '0'); },
  oct(n) { return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255]; },
  hosts(p) { return p >= 31 ? (p === 32 ? 1 : 2) : 2 ** (32 - p) - 2; },
  total(p) { return 2 ** (32 - p); },
  fmt(n) { return Number(n).toLocaleString('en-US'); },
  kind(n) {
    if (IP.net(n, 8) === IP.parse('10.0.0.0')) return ['Private', '10.0.0.0/8'];
    if (IP.net(n, 12) === IP.parse('172.16.0.0')) return ['Private', '172.16.0.0/12'];
    if (IP.net(n, 16) === IP.parse('192.168.0.0')) return ['Private', '192.168.0.0/16'];
    if (IP.net(n, 8) === IP.parse('127.0.0.0')) return ['Loopback', '127.0.0.0/8'];
    if (n === 0) return ['특수', '0.0.0.0 — bind 시 “모든 interface”'];
    return ['Public', '사설 대역이 아님'];
  },
};
function rngFrom(seed) {
  let a = seed >>> 0;
  const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.shuffle = arr => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  return f;
}
function parseURL(s) {
  const m = String(s).trim().match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^\/:?#]+)(?::(\d+))?([^?#]*)(\?[^#]*)?(#.*)?$/);
  if (!m) return null;
  const scheme = m[1].toLowerCase(); const def = { http: 80, https: 443, ws: 80, wss: 443, ftp: 21 }[scheme];
  const port = m[3] ? +m[3] : def; if (port === undefined || port > 65535) return null;
  return { scheme, host: m[2], port, implicit: !m[3], path: m[4] || '/', query: m[5] || '', frag: m[6] || '' };
}

/* ---------- icons ---------- */
const ICON = {
  pc: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>',
  laptop: '<rect x="5" y="5" width="14" height="10" rx="1"/><path d="M2 19h20l-2-4H4z"/>',
  server: '<rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="13" width="16" height="7" rx="1.5"/><path d="M8 6.5h.01M8 16.5h.01"/>',
  router: '<circle cx="12" cy="12" r="9"/><path d="M7 12h10M14 9l3 3-3 3M12 7v10"/>',
  switch: '<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M6 10h8l-2-2M18 14h-8l2 2"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z"/>',
  db: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  iot: '<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  gpu: '<rect x="2" y="6" width="20" height="12" rx="1.5"/><circle cx="9" cy="12" r="3"/><path d="M15 10h4M15 14h4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  cam: '<rect x="3" y="7" width="13" height="10" rx="1.5"/><path d="M16 11l5-3v8l-5-3z"/>',
  dns: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="7" cy="6" r=".8"/><circle cx="7" cy="12" r=".8"/><circle cx="7" cy="18" r=".8"/>',
  lb: '<circle cx="12" cy="6" r="3"/><path d="M12 9v4M12 13l-6 5M12 13l6 5M12 13v6"/>',
  fw: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 15h18M9 4v5M15 9v6M9 15v5"/>',
  broker: '<circle cx="12" cy="12" r="4"/><path d="M4 4l5 5M20 4l-5 5M4 20l5-5M20 20l-5-5"/>',
  proc: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 10l3 2-3 2M13 15h3"/>',
  storage: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 14h4"/>',
  queue: '<rect x="3" y="8" width="4" height="8"/><rect x="10" y="8" width="4" height="8"/><rect x="17" y="8" width="4" height="8"/>',
  cert: '<rect x="4" y="3" width="16" height="13" rx="1"/><path d="M8 7h8M8 10h5"/><circle cx="15" cy="17" r="3"/>',
  browser: '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 8h18"/>',
};
const icon = n => n && ICON[n] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>` : '';

const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
const COLOR = c => c ? (c.startsWith('#') ? c : `var(--${({ L7: 'l7', L4: 'l4', L3: 'l3', L2: 'l2', L1: 'l1' })[c] || c})`) : 'var(--ink)';
function evColor(e) { if (e.color) return COLOR(e.color); if (e.pkt && e.pkt.length) return COLOR(e.pkt[e.pkt.length - 1].L); return 'var(--ink)'; }
function arrowHead(svg, x, y, ang, color, size = 10) {
  const a1 = ang + Math.PI * 0.84, a2 = ang - Math.PI * 0.84;
  const p = svgEl('path', { d: `M${x},${y} L${x + size * Math.cos(a1)},${y + size * Math.sin(a1)} L${x + size * Math.cos(a2)},${y + size * Math.sin(a2)} Z` }, svg);
  p.style.fill = color; return p;
}
function svgText(svg, x, y, s, o = {}) {
  const t = svgEl('text', { x, y, 'text-anchor': o.anchor || 'middle', 'dominant-baseline': o.base || 'middle', class: o.mono ? 'mono' : '' }, svg);
  t.textContent = s; t.style.fill = o.color || 'var(--ink)'; t.style.fontSize = (o.size || 13) + 'px'; if (o.weight) t.style.fontWeight = o.weight; if (o.op != null) t.style.opacity = o.op;
  if (o.halo) { t.style.paintOrder = 'stroke'; t.style.stroke = 'var(--paper)'; t.style.strokeWidth = '5px'; t.style.strokeLinejoin = 'round'; }
  return t;
}

/* =================== TRACE VIEWER =================== */
/* Static by default; when the user steps forward (다음 ▶ / →) or presses ↻, only that step is animated:
   the packet chip travels the path while the arrow is drawn, devices rewrite headers in place (old → new). */
const ANIM = {
  opts: [['slow', '느리게', 1.7], ['norm', '보통', 1], ['fast', '빠르게', .55], ['off', '애니메이션 끔', 0]],
  get k() { return LS.get('anim', 'norm'); },
  get f() { const o = ANIM.opts.find(x => x[0] === ANIM.k); return o ? o[2] : 1; },
};
const PAIRK = [['Src MAC', 'Dst MAC'], ['Src', 'Dst'], ['Src Port', 'Dst Port']];
const LNAME = { L7: 'L7 응용', L4: 'L4 전송', L3: 'L3 네트워크', L2: 'L2 링크', L1: 'L1' };
function mountTrace(host, spec) {
  const ev = spec.events || [];
  const N = ev.length;
  const box = document.createElement('div'); box.className = 'trace'; box.tabIndex = N ? 0 : -1;
  host.appendChild(box);
  const head = document.createElement('div'); head.className = 'tr-head';
  head.innerHTML = `<div class="tt">${spec.title || ''}${spec.sub ? `<small>${spec.sub}</small>` : ''}</div>` + (N ? `<div class="tr-ctl"><select class="spd" aria-label="애니메이션 속도" title="다음 ▶을 누를 때 보여 줄 애니메이션 속도">${ANIM.opts.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><button class="btn sm" data-a="replay" title="이 단계 다시 보기 (R)">↻</button><button class="btn sm" data-a="first" title="처음">⏮</button><button class="btn" data-a="prev" aria-label="이전">◀<span class="bw"> 이전</span></button><span class="pos"></span><button class="btn pri" data-a="next">다음 ▶</button></div>` : '');
  box.appendChild(head);
  const view = document.createElement('div'); view.className = 'tr-view'; box.appendChild(view);
  const hint = document.createElement('div'); hint.className = 'sx-hint'; hint.textContent = '↔ 그림을 옆으로 밀면 나머지가 보여요'; hint.hidden = true; box.appendChild(hint);
  const note = document.createElement('div'); note.className = 'tr-note'; if (N) box.appendChild(note);
  const hasPkt = ev.some(e => e.pkt && e.pkt.length) || (spec.tables && spec.tables.length);
  const showList = N > 1 && spec.list !== false;
  const grid = document.createElement('div'); grid.className = 'tr-grid' + (showList && hasPkt ? '' : ' one');
  if (N && (hasPkt || showList)) box.appendChild(grid);
  const list = document.createElement('div'); list.className = 'tr-list';
  const det = document.createElement('div'); det.className = 'tr-side';
  if (showList) grid.appendChild(list);
  if (hasPkt) grid.appendChild(det);
  let cur = spec.start === 'end' ? N - 1 : Math.min(spec.start || 0, Math.max(0, N - 1));
  const laneName = id => { const n = (spec.nodes || spec.lanes || []).find(x => x.id === id); return n ? n.label : id; };
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  if (showList) {
    list.innerHTML = `<table><tr><th>No</th><th>구간</th><th>내용</th></tr>${ev.map((e, i) => `<tr data-i="${i}"><td class="m">${i + 1}</td><td>${e.from ? esc(laneName(e.from)) + (e.to && e.to !== e.from ? ' → ' + esc(laneName(e.to)) : ' 내부') : '—'}</td><td class="m">${esc(e.label || e.text || '')}</td></tr>`).join('')}</table>`;
    list.querySelectorAll('tr[data-i]').forEach(r => r.onclick = () => go(+r.dataset.i));
  }
  const spd = head.querySelector('.spd');
  if (spd) { spd.value = ANIM.k; spd.onchange = () => { LS.set('anim', spd.value); document.querySelectorAll('select.spd').forEach(s => s.value = spd.value); if (ANIM.f) go(cur, true); }; }
  head.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { const a = b.dataset.a; if (a === 'replay') go(cur, true); else go(a === 'first' ? 0 : a === 'prev' ? cur - 1 : cur + 1); box.focus({ preventScroll: true }); });
  box.addEventListener('keydown', e => { if (e.target.tagName === 'SELECT') return; if (e.key === 'ArrowRight') { go(cur + 1); e.preventDefault(); } else if (e.key === 'ArrowLeft') { go(cur - 1); e.preventDefault(); } else if (e.key === 'r' || e.key === 'R') { go(cur, true); e.preventDefault(); } });

  const draw = spec.mode === 'ladder' ? drawLadder : drawTopo;
  function go(i, replay) {
    if (!N) { draw(-1); return; }
    const ni = Math.max(0, Math.min(N - 1, i));
    const anim = ANIM.f > 0 && (replay === true || ni === cur + 1);
    cur = ni; render(anim);
  }
  function render(anim) {
    timers.forEach(clearTimeout); timers = [];
    const D = draw(cur, anim) || 0;
    hint.hidden = !(view.scrollWidth > view.clientWidth + 4);
    if (!N) return;
    head.querySelector('.pos').textContent = `${cur + 1} / ${N}`;
    head.querySelector('[data-a="prev"]').disabled = cur === 0;
    head.querySelector('[data-a="next"]').disabled = cur === N - 1;
    const e = ev[cur];
    note.innerHTML = `<span class="ev">#${cur + 1}${e.from ? ' · ' + esc(laneName(e.from)) + (e.to && e.to !== e.from ? ' → ' + esc(laneName(e.to)) : ' 내부') : ''}${e.label ? ' · ' + esc(e.label) : ''}</span>${e.say || ''}`;
    note.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => window.APP && APP.goto(b.dataset.goto));
    if (showList) list.querySelectorAll('tr[data-i]').forEach(r => { const i = +r.dataset.i; r.className = i === cur ? 'cur' : i > cur ? 'fut' : ''; if (i === cur) { const top = r.offsetTop, h = list.clientHeight; if (top < list.scrollTop + 24 || top > list.scrollTop + h - 30) list.scrollTop = top - h / 2; } });
    if (hasPkt) { det.innerHTML = detailHTML(cur); det.classList.toggle('anim', !!anim); det.style.setProperty('--d', Math.round(D) + 'ms'); }
  }

  /* ----- packet comparison ----- */
  function baseOf(i) {
    const e = ev[i]; if (!e || !e.pkt || !e.pkt.length || e.cmp === false) return -1;
    if (typeof e.cmp === 'number') return e.cmp;
    for (let k = i - 1; k >= 0; k--) if (ev[k].pkt && ev[k].pkt.length) return k;
    return -1;
  }
  const dcache = {};
  function diffOf(i) {
    if (dcache[i]) return dcache[i];
    const e = ev[i], b = baseOf(i); const d = { base: b, ch: [], add: [], rm: [], swap: [], map: {} };
    dcache[i] = d;
    if (b < 0) return d;
    const bp = ev[b].pkt, strict = e.from === e.to || typeof e.cmp === 'number';
    e.pkt.forEach(l => {
      const ol = bp.find(x => x.n === l.n);
      if (!ol) { if (strict) d.add.push(l); return; }
      if (l.enc || ol.enc) return;
      const chg = [];
      (l.f || []).forEach(([k, v]) => { const of = (ol.f || []).find(x => x[0] === k); if (of && String(of[1]) !== String(v)) { chg.push({ l, k, o: of[1], v }); d.map[l.n + '|' + k] = of[1]; } });
      PAIRK.forEach(([a, bb]) => { const ca = chg.find(c => c.k === a), cb = chg.find(c => c.k === bb); if (ca && cb && String(ca.v) === String(cb.o) && String(cb.v) === String(ca.o)) { d.swap.push({ l, a, b: bb, va: ca.v, vb: cb.v }); chg.splice(chg.indexOf(ca), 1); chg.splice(chg.indexOf(cb), 1); } });
      d.ch.push(...chg); d.n = (d.n || 0) + 1;
    });
    if (strict) bp.forEach(ol => { if (!e.pkt.find(x => x.n === ol.n)) d.rm.push(ol); });
    if (!d.n && !d.add.length && !d.rm.length) d.base = -1;
    return d;
  }
  function changeHTML(i) {
    const e = ev[i]; if (!e.pkt || !e.pkt.length) return '';
    const d = diffOf(i);
    if (d.base < 0) return e.cmp === false ? `<div class="chg-sum same"><b>새 패킷</b> — 앞 단계와는 다른 흐름이라 비교하지 않음</div>` : '';
    const items = [];
    d.rm.forEach(l => items.push(`<li><i class="${l.L}">−</i><b>${esc(l.n)}</b> 헤더 제거</li>`));
    d.add.forEach(l => items.push(`<li><i class="${l.L}">+</i><b>${esc(l.n)}</b> 헤더 새로 붙임</li>`));
    d.swap.forEach(s => items.push(`<li><i class="${s.l.L}">⇄</i><b>${esc(s.l.n)}</b> ${esc(s.a)} ↔ ${esc(s.b)} 뒤바뀜 <span class="m">(${esc(s.va)} → ${esc(s.vb)})</span></li>`));
    d.ch.forEach(c => items.push(`<li><i class="${c.l.L}">✎</i><b>${esc(c.l.n)}</b> ${esc(c.k)} <span class="m"><s>${esc(c.o)}</s> → <mark>${esc(c.v)}</mark></span></li>`));
    const who = e.from === e.to ? `${esc(laneName(e.from))} 안에서 바뀐 것` : `#${d.base + 1} 패킷과 비교해 바뀐 것`;
    if (!items.length) return `<div class="chg-sum same"><b>${who}</b> — 없음. 헤더를 그대로 두고 전달한다.</div>`;
    return `<div class="chg-sum"><h5>${who}</h5><ul>${items.map((x, k) => x.replace('<li>', `<li style="--k:${k}">`)).join('')}</ul></div>`;
  }
  function tableRows(id, i) { for (let k = i; k >= 0; k--) if (ev[k].tables && ev[k].tables[id]) return ev[k].tables[id]; const t = spec.tables.find(x => x.id === id); return t.rows || []; }
  function detailHTML(i) {
    const e = ev[i]; let h = '';
    if (e.pkt && e.pkt.length) {
      const d = diffOf(i);
      h += '<div class="tr-det">' + changeHTML(i) + '<h5>패킷 상세 (위 = 바깥 헤더)</h5>';
      e.pkt.forEach(l => {
        const added = d.add.includes(l) ? ' add' : '';
        if (l.enc) { h += `<div class="lyr ${l.L} enc${added}"><div class="ln">${esc(l.n)}<small>${l.L}</small></div><div class="fs">${esc(l.enc)}</div></div>`; return; }
        const fs = (l.f || []).map(([k, v]) => { const chg = d.map[l.n + '|' + k] !== undefined || (e.hl && e.hl.includes(k)); return `<span class="f${chg ? ' chg' : ''}"><i>${esc(k)}</i>${esc(v)}</span>`; }).join('');
        h += `<div class="lyr ${l.L}${added}"><div class="ln">${esc(l.n)}<small>${LNAME[l.L] || ''}</small></div><div class="fs">${fs}</div></div>`;
      });
      h += '</div>';
    } else h += `<div class="tr-det"><h5>패킷 없음</h5><p class="cm" style="margin:0;font-size:14px">${e.from ? esc(laneName(e.from)) + ' 안에서 일어나는 처리라 오가는 패킷이 없다.' : '오가는 패킷이 없는 단계.'}</p></div>`;
    if (spec.tables && spec.tables.length) {
      h += '<div class="tr-tables">';
      spec.tables.forEach(t => {
        const rows = tableRows(t.id, i), prev = i > 0 ? tableRows(t.id, i - 1).map(r => JSON.stringify(r)) : [];
        h += `<div class="tb"><h5>${t.title}</h5>` + (rows.length ? `<table><tr>${t.cols.map(c => `<th>${c}</th>`).join('')}</tr>${rows.map(r => `<tr class="${i > 0 && !prev.includes(JSON.stringify(r)) ? 'chg' : ''}">${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>` : `<div class="empty">(비어 있음)</div>`) + '</div>';
      });
      h += '</div>';
    }
    return h;
  }
  /* compact packet card that travels along the path / sits on a device */
  function chipHTML(i, withOld) {
    const e = ev[i], d = diffOf(i);
    const fv = (l, [k, v]) => { const o = d.map[l.n + '|' + k]; if (o === undefined) return `<span class="fv">${esc(v)}</span>`; return `<span class="fv chg">${withOld ? `<s class="ov">${esc(o)}</s>` : ''}<span class="nv">${esc(v)}</span></span>`; };
    const row = (l, cls) => {
      if (l.enc) return `<div class="cr ${l.L} ${cls}"><b>${esc(l.n)}</b><span class="k">${esc(l.enc)}</span></div>`;
      const f = l.f || []; const used = new Set(); const parts = [];
      PAIRK.forEach(([a, b]) => { const fa = f.find(x => x[0] === a), fb = f.find(x => x[0] === b); if (fa && fb) { used.add(a); used.add(b); parts.push(`<span class="pr">${fv(l, fa)} <span class="ar">→</span> ${fv(l, fb)}</span>`); } });
      const rest = f.filter(x => !used.has(x[0]));
      const chg = rest.filter(x => d.map[l.n + '|' + x[0]] !== undefined);
      const lim = parts.length ? 3 : 4;
      const show = rest.filter(x => chg.includes(x) || rest.indexOf(x) < lim).slice(0, Math.max(lim, chg.length));
      show.forEach(x => parts.push(`<span class="k">${esc(x[0])}</span>${fv(l, x)}`));
      return `<div class="cr ${l.L} ${cls}"><b>${esc(l.n)}</b><span class="cv">${parts.join(' ')}</span></div>`;
    };
    let h = '';
    if (withOld) d.rm.forEach(l => h += row(l, 'rm'));
    e.pkt.forEach(l => h += row(l, d.add.includes(l) && withOld ? 'add' : ''));
    return h;
  }

  /* ----- topology ----- */
  function drawTopo(i, anim) {
    const nodes = spec.nodes || [];
    const rowH = spec.rowH || 104;
    const rows = Math.max(...nodes.map(n => n.y)) + 1;
    /* layout: shrink nodes that would collide in the same row, widen the canvas only if that is not enough */
    const viewW = view.clientWidth - 24, MINW = 86, GAP = 14, TOP = 10;
    const wd = {}; nodes.forEach(n => wd[n.id] = n.w || spec.nodeW || 150);
    const pairs = []; nodes.forEach((a, ai) => nodes.forEach((b, bi) => { if (bi > ai && Math.abs(a.y - b.y) * rowH < 74 && a.x !== b.x) pairs.push([a.id, b.id, Math.abs(a.x - b.x)]); }));
    let W = Math.max(340, viewW);
    let padX = Math.max(...Object.values(wd)) / 2 + 8;
    pairs.forEach(([a, b, df]) => { const allow = Math.max(MINW, df * (W - 2 * padX) - GAP); if ((wd[a] + wd[b]) / 2 > allow) { wd[a] = Math.min(wd[a], allow); wd[b] = Math.min(wd[b], allow); } });
    padX = Math.max(...Object.values(wd)) / 2 + 8;
    pairs.forEach(([a, b, df]) => { W = Math.max(W, Math.ceil(((wd[a] + wd[b]) / 2 + GAP) / df + 2 * padX)); });
    const selfPkt = ev.some(x => x.from && x.from === x.to && x.pkt && x.pkt.length);
    let Hh = rows * rowH + TOP;
    view.innerHTML = '';
    const wrap = document.createElement('div'); wrap.className = 'topo'; wrap.style.width = W + 'px'; wrap.style.height = Hh + 'px';
    view.appendChild(wrap);
    const PX = f => padX + f * (W - 2 * padX), PY = y => TOP + y * rowH + rowH / 2;
    const zoneEls = [];
    const svg = svgEl('svg', { width: W, height: Hh }, wrap);
    const st = {}, down = new Set(), used = new Set(), offN = new Set();
    for (let k = 0; k <= i && k < N; k++) {
      const e = ev[k];
      if (e.state) Object.entries(e.state).forEach(([n, v]) => { st[n] = { v, k }; });
      (e.down || []).forEach(l => down.add(l.join('|')));
      (e.up || []).forEach(l => down.delete(l.join('|')));
      (e.off || []).forEach(n => offN.add(n)); (e.onN || []).forEach(n => offN.delete(n));
      if (k < i && e.from && e.to && e.from !== e.to) (e.path || [e.from, e.to]).reduce((a, b) => { used.add([a, b].sort().join('|')); return b; });
    }
    const pos = {}; const el = {}; const newBadges = [];
    nodes.forEach(n => {
      const d = document.createElement('div'); d.className = 'tn';
      d.style.left = PX(n.x) + 'px'; d.style.top = PY(n.y) + 'px'; d.style.width = 'max-content'; d.style.maxWidth = wd[n.id] + 'px'; d.style.minWidth = Math.min(wd[n.id], 104) + 'px'; if (wd[n.id] < 120) d.classList.add('narrow');
      d.innerHTML = `<div class="nl">${icon(n.icon)}<span>${esc(n.label)}</span></div>${n.sub ? `<div class="ns">${esc(n.sub)}</div>` : ''}`;
      if (st[n.id] && st[n.id].v) { const s = document.createElement('div'); s.className = 'st' + (st[n.id].k < i ? ' keep' : ''); s.textContent = st[n.id].v; d.appendChild(s); if (st[n.id].k === i) newBadges.push(s); }
      if (offN.has(n.id)) d.classList.add('off');
      wrap.appendChild(d); el[n.id] = d; pos[n.id] = { x: PX(n.x), y: PY(n.y) };
    });
    /* zones wrap the nodes they contain (fallback: fractional box) */
    (spec.zones || []).forEach(z => {
      const inside = nodes.filter(n => n.x >= z.x0 && n.x <= z.x1 && n.y >= z.y0 && n.y <= z.y1);
      let L, T, R, B;
      if (inside.length) { L = Math.min(...inside.map(n => pos[n.id].x - el[n.id].offsetWidth / 2)) - 12; R = Math.max(...inside.map(n => pos[n.id].x + el[n.id].offsetWidth / 2)) + 12; T = Math.min(...inside.map(n => pos[n.id].y - el[n.id].offsetHeight / 2)) - 26; B = Math.max(...inside.map(n => pos[n.id].y + el[n.id].offsetHeight / 2)) + 10; }
      else { L = PX(z.x0); R = PX(z.x1); T = PY(z.y0); B = PY(z.y1); }
      const d = document.createElement('div'); d.className = 'zone'; d.style.left = L + 'px'; d.style.width = (R - L) + 'px'; d.style.top = T + 'px'; d.style.height = (B - T) + 'px'; if (z.c) d.style.borderColor = COLOR(z.c);
      d.innerHTML = `<span style="${z.c ? 'color:' + COLOR(z.c) : ''}">${z.label || ''}</span>`; wrap.insertBefore(d, wrap.firstChild); zoneEls.push(B);
    });
    /* height = real content: lowest node (+ its state badge), zones, and the tallest in-device packet card */
    let bottom = Math.max(0, ...zoneEls);
    nodes.forEach(n => { const d = el[n.id]; bottom = Math.max(bottom, pos[n.id].y + d.offsetHeight / 2 + (d.querySelector('.st') ? 28 : 0)); });
    if (selfPkt) ev.forEach((x, k) => {
      if (k !== i || !(x.from && x.from === x.to && x.pkt && x.pkt.length && el[x.from])) return;
      const m = document.createElement('div'); m.className = 'pchip at'; m.style.visibility = 'hidden'; m.innerHTML = `<div class="ch">${esc(x.label || '')}</div>` + chipHTML(k, true); wrap.appendChild(m);
      bottom = Math.max(bottom, pos[x.from].y + el[x.from].offsetHeight / 2 + 30 + m.offsetHeight); m.remove();
    });
    Hh = Math.ceil(bottom + 16); wrap.style.height = Hh + 'px'; svg.setAttribute('height', Hh);
    const sc = W > viewW + 1 && viewW / W >= 0.7 ? viewW / W : 1;
    if (sc < 1) { const bx = document.createElement('div'); bx.style.cssText = `width:${Math.floor(W * sc)}px;height:${Math.ceil(Hh * sc)}px;margin:0 auto;overflow:hidden`; view.insertBefore(bx, wrap); bx.appendChild(wrap); wrap.style.transform = `scale(${sc})`; wrap.style.transformOrigin = '0 0'; wrap.style.margin = '0'; }
    { const vh = Math.ceil(Hh * sc) + 16; if (!anim) view.style.transition = 'none'; view.style.height = vh + 'px'; if (!anim) { view.offsetHeight; view.style.transition = ''; } }
    const e = i >= 0 ? ev[i] : null;
    if (e) [e.from, e.to, ...(e.on || [])].forEach(id => el[id] && el[id].classList.add('on'));
    const edge = (a, b) => { const A = pos[a], B = pos[b]; const hw = el[a].offsetWidth / 2 + 4, hh = el[a].offsetHeight / 2 + 4; const dx = B.x - A.x, dy = B.y - A.y; const s = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9)); return { x: A.x + dx * Math.min(s, .5), y: A.y + dy * Math.min(s, .5) }; };
    (spec.links || []).forEach(l => {
      const [a, b, o = {}] = l; if (!pos[a] || !pos[b]) return;
      const p1 = edge(a, b), p2 = edge(b, a); const key = [a, b].sort().join('|');
      const isDown = down.has(a + '|' + b) || down.has(b + '|' + a);
      const ln = svgEl('line', { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y }, svg);
      ln.style.stroke = isDown ? 'var(--bad)' : used.has(key) ? 'var(--ink2)' : 'var(--line)'; ln.style.strokeWidth = used.has(key) ? 2.2 : 1.8;
      if (o.dash || isDown) ln.style.strokeDasharray = '6 5';
      if (isDown) svgText(svg, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2, '✕ 장애', { color: 'var(--bad)', weight: 700, size: 13, halo: true });
      else if (o.label) svgText(svg, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 10, o.label, { color: 'var(--mute)', size: 12, mono: true, halo: true });
    });
    if (!e) return 0;
    if (view.scrollWidth > view.clientWidth + 4 && e.from && pos[e.from]) { const xs = [e.from, e.to].filter(id => pos[id]).map(id => pos[id].x); const cx = (Math.min(...xs) + Math.max(...xs)) / 2; view.scrollLeft = Math.max(0, cx - view.clientWidth / 2); }
    const F = ANIM.f;
    const fadeIn = (x, delay, dur = 220) => x && x.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur, delay, fill: 'both' });
    if (!e.from || !e.to || e.from === e.to) return e.from && pos[e.from] ? selfAt(e.from) : 0;

    /* travelling event */
    const path = e.path || [e.from, e.to];
    const col = evColor(e);
    const segs = [];
    for (let s = 0; s < path.length - 1; s++) {
      const a = path[s], b = path[s + 1]; if (!pos[a] || !pos[b]) continue;
      let p1 = edge(a, b), p2 = edge(b, a);
      const off = e.lane ? e.lane * 8 : 0; if (off) { const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x); const ox = -Math.sin(ang) * off, oy = Math.cos(ang) * off; p1 = { x: p1.x + ox, y: p1.y + oy }; p2 = { x: p2.x + ox, y: p2.y + oy }; }
      const last = s === path.length - 2;
      const frac = e.drop && last ? 0.55 : 1;
      const xe = p1.x + (p2.x - p1.x) * frac, ye = p1.y + (p2.y - p1.y) * frac;
      const ln = svgEl('line', { x1: p1.x, y1: p1.y, x2: xe, y2: ye }, svg); ln.style.stroke = col; ln.style.strokeWidth = 4; ln.style.strokeLinecap = 'round';
      let mk;
      if (e.drop && last) mk = svgText(svg, xe + 2, ye, '✕', { color: 'var(--bad)', size: 26, weight: 700, halo: true });
      else mk = arrowHead(svg, xe, ye, Math.atan2(ye - p1.y, xe - p1.x), col, 13);
      segs.push({ ln, mk, p1, pe: { x: xe, y: ye }, len: Math.hypot(xe - p1.x, ye - p1.y) });
    }
    let lab = null;
    if (e.label && path.length >= 2 && pos[path[0]] && pos[path[1]]) {
      const segI = Math.floor((path.length - 1) / 2);
      const a = pos[path[segI]], b = pos[path[segI + 1]];
      lab = document.createElement('div'); lab.className = 'plab'; lab.style.background = col; lab.textContent = e.label;
      let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      if (Math.abs(b.x - a.x) > Math.abs(b.y - a.y)) my -= 18 + (e.lane || 0) * 8;
      lab.style.left = mx + 'px'; lab.style.top = my + 'px'; wrap.appendChild(lab);
    }
    if (!anim || !segs.length) return 0;
    const segDur = Math.min(760, 2600 / segs.length) * F, hold = 200 * F;
    const total = segs.length * segDur + (segs.length - 1) * hold;
    const chip = document.createElement('div'); chip.className = 'pchip';
    chip.innerHTML = (e.pkt && e.pkt.length ? `<div class="ch" style="background:${col}">${esc(e.label || '')}</div>` + chipHTML(i, false) : `<div class="ch solo" style="background:${col}">${esc(e.label || '패킷')}</div>`);
    chip.style.borderColor = col;
    wrap.appendChild(chip);
    const tr = p => `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
    const kf = []; let t = 0;
    segs.forEach((s, k) => {
      s.ln.style.strokeDasharray = `${s.len} ${s.len}`;
      s.ln.animate([{ strokeDashoffset: s.len }, { strokeDashoffset: 0 }], { duration: segDur, delay: t, fill: 'both', easing: 'linear' });
      fadeIn(s.mk, t + segDur - 80, 160);
      kf.push({ transform: tr(s.p1), offset: Math.min(1, t / total) });
      t += segDur;
      kf.push({ transform: tr(s.pe), offset: Math.min(1, t / total) });
      if (k < segs.length - 1) { t += hold; const hop = el[path[k + 1]]; if (hop) hop.animate([{ boxShadow: `0 0 0 0 ${col}` }, { boxShadow: `0 0 0 6px transparent` }], { duration: Math.max(hold, 260), delay: t - hold, fill: 'none' }); }
    });
    chip.animate(kf, { duration: total, fill: 'both', easing: 'linear' });
    if (e.drop) {
      chip.animate([{ opacity: 1, filter: 'none' }, { opacity: 0, filter: 'grayscale(1)' }], { duration: 500 * F + 150, delay: total + 120, fill: 'forwards' });
      chip.classList.add('dropping'); later(() => chip.classList.add('dead'), total);
    } else {
      chip.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, delay: total + 260 * F, fill: 'forwards' });
      const dst = el[e.to]; if (dst) dst.animate([{ boxShadow: `0 0 0 0 ${col}` }, { boxShadow: `0 0 0 14px transparent` }], { duration: 650, delay: total });
    }
    fadeIn(lab, total, 260);
    newBadges.forEach(b => b.animate([{ opacity: 0, transform: 'translate(-50%,12px)' }, { opacity: 1, transform: 'translate(-50%,5px)' }], { duration: 300, delay: total, fill: 'both' }));
    return total;

    /* something happens inside one device */
    function selfAt(id) {
      const d = el[id], p = pos[id];
      newBadges.forEach(b => anim && b.animate([{ opacity: 0, transform: 'translate(-50%,12px)' }, { opacity: 1, transform: 'translate(-50%,5px)' }], { duration: 300, delay: 300 * F, fill: 'both' }));
      if (!(e.pkt && e.pkt.length)) {
        if (!e.label) return 0;
        const lab = document.createElement('div'); lab.className = 'plab'; lab.style.background = evColor(e); lab.textContent = e.label; lab.style.left = p.x + 'px'; lab.style.top = p.y - d.offsetHeight / 2 - 16 + 'px'; wrap.appendChild(lab);
        if (anim) { lab.animate([{ opacity: 0, transform: 'translate(-50%,-20%) scale(.8)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 320 * F + 80, fill: 'both' }); d.animate([{ boxShadow: `0 0 0 0 ${evColor(e)}` }, { boxShadow: '0 0 0 12px transparent' }], { duration: 600 }); }
        return anim ? 320 * F : 0;
      }
      const chip = document.createElement('div'); chip.className = 'pchip at' + (anim ? ' anim' : '');
      const col = evColor(e);
      chip.innerHTML = `<div class="ch" style="background:${col}">${/^⚙/.test(e.label || '') ? '' : '⚙ '}${esc(e.label || '처리')}</div>` + chipHTML(i, true);
      chip.style.borderColor = col;
      const below = p.y + d.offsetHeight / 2 + (st[id] && st[id].v ? 30 : 8);
      wrap.appendChild(chip);
      let x = p.x; const cw = chip.offsetWidth; x = Math.max(cw / 2 + 4, Math.min(W - cw / 2 - 4, x));
      chip.style.transform = `translate(${x}px, ${below}px) translate(-50%, 0)`;
      if (!anim) return 0;
      const dly = 520 * F;
      chip.style.setProperty('--d', dly + 'ms'); chip.style.setProperty('--f', F);
      chip.animate([{ opacity: 0, transform: `translate(${x}px, ${below - 14}px) translate(-50%, 0) scale(.9)` }, { opacity: 1, transform: `translate(${x}px, ${below}px) translate(-50%, 0) scale(1)` }], { duration: 300, fill: 'both' });
      d.animate([{ boxShadow: `0 0 0 0 ${col}` }, { boxShadow: '0 0 0 12px transparent' }], { duration: 700, iterations: 2 });
      return dly + 450 * F;
    }
  }

  /* ----- ladder ----- */
  function drawLadder(i, anim) {
    const lanes = spec.lanes; const n = lanes.length;
    const viewW = view.clientWidth - 24;
    const base = n <= 2 ? 380 : n === 3 ? 560 : Math.max(700, Math.min(spec.minW || 0, 820));
    const W = Math.max(base, Math.min(viewW, 2 * 128 + 440 * Math.max(1, n - 1)));
    const side = Math.min(spec.side ?? 128, Math.max(110, W * .2));
    const sc = W > viewW + 1 && viewW / W >= 0.6 ? viewW / W : 1;
    const rowH = spec.rowH || 58, top = 76;
    const rowOf = []; let r = 0; ev.forEach(e => { if (e.row != null) r = e.row; rowOf.push(r); r += (e.tall || 1); });
    const Hh = top + (Math.max(r, 1)) * rowH + 18;
    view.innerHTML = '';
    const svg = svgEl('svg', { width: Math.floor(W * sc), height: Math.ceil(Hh * sc), viewBox: `0 0 ${W} ${Hh}`, class: 'ladder' }, view);
    svg.style.display = 'block'; svg.style.margin = '0 auto';
    const X = {}; lanes.forEach((l, j) => X[l.id] = n === 1 ? W / 2 : side + j * (W - 2 * side) / (n - 1));
    lanes.forEach(l => {
      const bx = X[l.id], bw = Math.min(150, (W - 2 * side) / Math.max(1, n - 1) - 10, 170);
      const rr = svgEl('rect', { x: bx - bw / 2, y: 8, width: bw, height: l.sub ? 46 : 34, rx: 8 }, svg); rr.style.fill = 'var(--paper)'; rr.style.stroke = 'var(--ink2)'; rr.style.strokeWidth = 1.5;
      svgText(svg, bx, l.sub ? 24 : 25, l.label, { weight: 700, size: 14 });
      if (l.sub) svgText(svg, bx, 42, l.sub, { size: 11.5, mono: true, color: 'var(--mute)' });
      const ln = svgEl('line', { x1: bx, y1: l.sub ? 54 : 42, x2: bx, y2: Hh - 6 }, svg); ln.style.stroke = 'var(--line)'; ln.style.strokeWidth = 2; ln.style.strokeDasharray = '4 4';
    });
    const slope = spec.slope ?? 16;
    const F = ANIM.f; let D = 0;
    for (let k = 0; k <= i && k < N; k++) {
      const e = ev[k]; const y = top + rowOf[k] * rowH + 12; const isCur = k === i; const A = isCur && anim;
      const g = svgEl('g', {}, svg); g.style.opacity = isCur ? 1 : .5; g.style.cursor = 'pointer'; g.addEventListener('click', () => go(k));
      const hit = svgEl('rect', { x: 0, y: y - 18, width: W, height: rowH - 4 }, g); hit.style.fill = isCur ? 'var(--sunk)' : 'transparent';
      const late = []; // elements revealed on arrival
      let travel = 0;
      if (e.kind === 'gap') { late.push(svgText(g, W / 2, y + 8, e.text || '', { color: 'var(--mute)', size: 13, weight: 600, halo: true })); travel = 250 * F; }
      else if (e.from && e.to && e.from !== e.to) {
        const x1 = X[e.from], x2 = X[e.to], y1 = y, y2 = y + slope;
        const col = evColor(e); const frac = e.drop ? .55 : 1; const xe = x1 + (x2 - x1) * frac, ye = y1 + (y2 - y1) * frac;
        const ln = svgEl('line', { x1, y1, x2: xe, y2: ye }, g); ln.style.stroke = col; ln.style.strokeWidth = isCur ? 3.5 : 2.2; if (e.dash) ln.style.strokeDasharray = '7 5';
        if (e.drop) late.push(svgText(g, xe, ye, '✕', { color: 'var(--bad)', size: 24, weight: 700, halo: true })); else late.push(arrowHead(g, x2, y2, Math.atan2(y2 - y1, x2 - x1), col, isCur ? 12 : 10));
        const mx = (x1 + x2) / 2;
        late.push(svgText(g, mx, y - 4 + slope / 2 - 10, e.label || '', { mono: true, weight: 700, size: isCur ? 14 : 13, color: col, halo: true }));
        if (e.sub) late.push(svgText(g, mx, y + slope / 2 + 12, e.sub, { mono: true, size: 12, color: 'var(--ink2)', halo: true }));
        if (A) {
          travel = 950 * F;
          const len = Math.hypot(xe - x1, ye - y1);
          if (!e.dash) { ln.style.strokeDasharray = `${len} ${len}`; ln.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: travel, fill: 'both', easing: 'linear' }); }
          else ln.animate([{ opacity: 0 }, { opacity: 1 }], { duration: travel, fill: 'both' });
          const mv = svgEl('g', {}, svg); mv.style.pointerEvents = 'none';
          const tx = svgText(mv, 0, 0, (e.label || '') + (e.sub ? '  ' + e.sub : ''), { mono: true, weight: 700, size: 12.5, color: 'var(--paper)' });
          const bb = tx.getBBox(); const bg = svgEl('rect', { x: bb.x - 7, y: bb.y - 3, width: bb.width + 14, height: bb.height + 6, rx: 10 }); bg.style.fill = col; mv.insertBefore(bg, tx);
          mv.animate([{ transform: `translate(${x1}px, ${y1}px)` }, { transform: `translate(${xe}px, ${ye}px)` }], { duration: travel, fill: 'both', easing: 'linear' });
          mv.animate([{ opacity: 1 }, { opacity: e.drop ? 0 : 0 }], { duration: 260, delay: travel + (e.drop ? 60 : 160), fill: 'forwards' });
        }
      } else if (e.from && !(e.state && e.state[e.from])) {
        late.push(svgText(g, X[e.from], y + 6, e.label || '', { size: 13, weight: 700, color: evColor(e), halo: true })); travel = 250 * F;
      } else travel = 200 * F;
      if (e.state) Object.entries(e.state).forEach(([id, s]) => {
        const j = lanes.findIndex(l => l.id === id); const left = j === 0 && n > 1;
        const tx = svgText(g, X[id] + (left ? -12 : 12), y + slope / 2 + (e.from && e.to && e.from !== e.to ? 0 : 6), s, { anchor: left ? 'end' : 'start', mono: true, size: 12.5, weight: 700, color: isCur ? 'var(--chg-ink)' : 'var(--ink2)', halo: !isCur });
        late.push(tx);
        if (isCur) { const bb = tx.getBBox(); const bg = svgEl('rect', { x: bb.x - 4, y: bb.y - 1, width: bb.width + 8, height: bb.height + 2, rx: 4 }); bg.style.fill = 'var(--chg)'; g.insertBefore(bg, tx); late.push(bg); }
      });
      if (A) { late.forEach(x => x.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: Math.max(0, travel - 120), fill: 'both' })); D = travel; }
    }
    for (let k = Math.max(0, i + 1); k < N; k++) { const e = ev[k]; if (!(e.from && e.to && e.from !== e.to)) continue; const y = top + rowOf[k] * rowH + 12; const g = svgEl('line', { x1: X[e.from], y1: y, x2: X[e.to], y2: y + slope }, svg); g.style.stroke = 'var(--line)'; g.style.strokeWidth = 1.5; g.style.strokeDasharray = '2 6'; }
    if (spec.span) spec.span.forEach(s => { if (i < s.until) return; const y1 = top + rowOf[s.a] * rowH + 12, y2 = top + rowOf[s.b] * rowH + 12 + slope; const x = s.x ?? 24; const l = svgEl('line', { x1: x, y1, x2: x, y2 }, svg); l.style.stroke = 'var(--ink)'; l.style.strokeWidth = 2; arrowHead(svg, x, y1, -Math.PI / 2, 'var(--ink)', 8); arrowHead(svg, x, y2, Math.PI / 2, 'var(--ink)', 8); svgText(svg, x + 8, (y1 + y2) / 2, s.text, { anchor: 'start', weight: 700, size: 13, halo: true }); });
    return D;
  }

  let rt, lastW = 0; const ro = new ResizeObserver(() => { const w = view.clientWidth; if (w === lastW) return; lastW = w; clearTimeout(rt); rt = setTimeout(() => { if (N) render(false); else { draw(-1); hint.hidden = !(view.scrollWidth > view.clientWidth + 4); } }, 60); });
  ro.observe(view);
  lastW = view.clientWidth;
  N ? render(false) : (draw(-1), hint.hidden = !(view.scrollWidth > view.clientWidth + 4));
  return { go, box };
}

/* =================== LAB =================== */
function mountLab(host, spec) {
  const st = Object.assign({}, typeof spec.init === 'function' ? spec.init() : spec.init || {});
  const box = document.createElement('div'); box.className = 'lab'; host.appendChild(box);
  box.innerHTML = `<div class="lab-head"><span class="tag">${spec.tag || '실험'}</span>${spec.title || ''}</div>`;
  const ctl = document.createElement('div'); ctl.className = 'lab-ctl'; box.appendChild(ctl);
  const out = document.createElement('div'); out.className = 'lab-out'; box.appendChild(out);
  const uid = 'c' + Math.random().toString(36).slice(2, 8);
  const ctls = typeof spec.ctl === 'function' ? spec.ctl(st) : spec.ctl || [];
  ctls.forEach((c, ci) => {
    const id = uid + ci;
    const d = document.createElement('div'); d.className = 'ctl';
    if (c.type === 'btns') { d.style.flexDirection = 'row'; d.style.gap = '6px'; d.style.flexWrap = 'wrap'; c.items.forEach(it => { const b = document.createElement('button'); b.className = 'btn' + (it.pri ? ' pri' : ''); b.textContent = it.label; b.onclick = () => { it.act(st); sync(); update(); }; d.appendChild(b); }); ctl.appendChild(d); return; }
    if (c.type === 'toggle') { d.className = 'ctl tog'; d.innerHTML = `<input type="checkbox" id="${id}"><label for="${id}">${c.label}</label>`; const inp = d.querySelector('input'); inp.checked = !!st[c.k]; inp.onchange = () => { st[c.k] = inp.checked; update(); }; c._sync = () => inp.checked = !!st[c.k]; ctl.appendChild(d); return; }
    d.innerHTML = `<label for="${id}">${c.label}${c.unit ? ` (${c.unit})` : ''}</label>`;
    if (c.type === 'select') {
      const s = document.createElement('select'); s.id = id; c.opts.forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; s.appendChild(o); }); s.value = st[c.k]; s.onchange = () => { st[c.k] = s.value; update(); }; c._sync = () => s.value = st[c.k]; d.appendChild(s);
    } else if (c.type === 'text') {
      const t = document.createElement('input'); t.type = 'text'; t.id = id; t.spellcheck = false; t.value = st[c.k]; if (c.w) t.style.width = c.w + 'px'; if (c.ph) t.placeholder = c.ph;
      let tm; t.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { st[c.k] = t.value; update(); }, 200); }; c._sync = () => t.value = st[c.k]; d.appendChild(t);
    } else {
      const rg = document.createElement('div'); rg.className = 'rg';
      const r = document.createElement('input'); r.type = 'range'; r.min = c.min; r.max = c.max; r.step = c.step || 1; r.value = st[c.k]; r.setAttribute('aria-label', c.label);
      const nb = document.createElement('input'); nb.type = 'number'; nb.id = id; nb.min = c.min; nb.max = c.max; nb.step = c.step || 1; nb.value = st[c.k];
      const set = v => { v = +v; if (isNaN(v)) return; v = Math.max(c.min, Math.min(c.max, v)); st[c.k] = v; r.value = v; nb.value = v; update(); };
      r.oninput = () => set(r.value); nb.onchange = () => set(nb.value);
      c._sync = () => { r.value = st[c.k]; nb.value = st[c.k]; };
      if (c.type !== 'num') rg.appendChild(r); rg.appendChild(nb); d.appendChild(rg);
    }
    ctl.appendChild(d);
  });
  if (!ctls.length) ctl.remove();
  function sync() { ctls.forEach(c => c._sync && c._sync()); }
  function update() {
    try { out.innerHTML = spec.out(st); } catch (e) { out.innerHTML = `<span class="err">${esc(e.message)}</span>`; console.error(e); }
    out.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => window.APP && APP.goto(b.dataset.goto));
    if (spec.after) spec.after(st, out);
  }
  update();
  let rt, lw = out.clientWidth; new ResizeObserver(() => { if (out.clientWidth === lw) return; lw = out.clientWidth; clearTimeout(rt); rt = setTimeout(() => spec.after && spec.after(st, out), 120); }).observe(out);
}

/* =================== FIGURE HELPERS =================== */
/* bit rows: rows=[{label, n, p, mask:true|false, right, cls:(i,bit)=>'n'|'h'|'z'|'x'}] , cut = prefix line */
function bitsHTML(rows, o = {}) {
  let h = `<div class="bitsw"><div class="bits">`;
  rows.forEach(r => {
    if (r.hr) { h += `<div></div><div class="hr"></div><div></div>`; return; }
    const b = IP.bin(r.n);
    let cells = '<div class="bo">';
    for (let oc = 0; oc < 4; oc++) {
      cells += '<div class="oc">';
      for (let j = 0; j < 8; j++) {
        const i = oc * 8 + j, bit = b[i];
        let cls = r.cls ? r.cls(i, bit) : r.mask ? (bit === '1' ? 'n' : 'z') : (i < r.p ? 'n' : 'h');
        if (o.cut != null && i === o.cut && o.cut < 32) cls += ' cut';
        cells += `<span class="b ${cls}">${bit}</span>`;
      }
      cells += '</div>';
    }
    cells += '</div>';
    h += `<div class="bl">${r.label}</div>${cells}<div class="br" style="${r.rc ? 'color:' + COLOR(r.rc) : ''}">${r.right ?? ''}</div>`;
  });
  return h + '</div></div>';
}
/* bars: rows=[{label, segs:[{v, c, t}], val}] */
function barsHTML(rows, max) {
  return `<div class="bars">${rows.map(r => `<div class="bar"><div class="bl">${r.label}</div><div style="display:flex;min-width:0"><div class="bt" style="width:${Math.max(.5, r.segs.reduce((a, s) => a + s.v, 0) / max * 100)}%">${r.segs.map(s => `<div class="sg" style="flex:${s.v} 0 0;background:${COLOR(s.c)}" title="${esc(s.t || '')}">${s.t || ''}</div>`).join('')}</div>${r.val != null ? `<span class="bv">${r.val}</span>` : ''}</div></div>`).join('')}</div>`;
}
/* line chart into element: o={h, xmax, ymax, xticks, yticks, xlabel, ylabel, series:[{pts:[[x,y]], color, w, dash, dots, step}], marks:[{x,y,t,c}], hlines:[{y,t,c}]} */
function lineChart(el, o) {
  el.innerHTML = '';
  const W = Math.max(320, el.clientWidth), Hh = o.h || 300;
  const m = { l: 54, r: 18, t: 18, b: 46 };
  const svg = svgEl('svg', { width: W, height: Hh, class: 'chart' }, el);
  const X = v => m.l + v / o.xmax * (W - m.l - m.r), Y = v => Hh - m.b - v / o.ymax * (Hh - m.t - m.b);
  (o.yticks || []).forEach(v => { const l = svgEl('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, svg); l.style.stroke = 'var(--line2)'; svgText(svg, m.l - 8, Y(v), String(v), { anchor: 'end', size: 12, mono: true, color: 'var(--mute)' }); });
  (o.xticks || []).forEach(v => svgText(svg, X(v), Hh - m.b + 16, String(v), { size: 12, mono: true, color: 'var(--mute)' }));
  const ax = svgEl('path', { d: `M${m.l},${m.t} V${Hh - m.b} H${W - m.r}` }, svg); ax.style.stroke = 'var(--ink2)'; ax.style.fill = 'none';
  if (o.xlabel) svgText(svg, (m.l + W - m.r) / 2, Hh - 8, o.xlabel, { size: 12.5, color: 'var(--mute)' });
  if (o.ylabel) { const t = svgText(svg, 14, (m.t + Hh - m.b) / 2, o.ylabel, { size: 12.5, color: 'var(--mute)' }); t.setAttribute('transform', `rotate(-90 14 ${(m.t + Hh - m.b) / 2})`); }
  (o.hlines || []).forEach(hl => { const l = svgEl('line', { x1: m.l, x2: W - m.r, y1: Y(hl.y), y2: Y(hl.y) }, svg); l.style.stroke = COLOR(hl.c); l.style.strokeDasharray = '5 4'; if (hl.t) svgText(svg, W - m.r - 4, Y(hl.y) - 9, hl.t, { anchor: 'end', size: 12, color: COLOR(hl.c), halo: true }); });
  (o.series || []).forEach(s => {
    let d = ''; s.pts.forEach((p, i) => { if (!i) d = `M${X(p[0])},${Y(p[1])}`; else if (s.step) d += ` H${X(p[0])} V${Y(p[1])}`; else d += ` L${X(p[0])},${Y(p[1])}`; });
    const pth = svgEl('path', { d }, svg); pth.style.stroke = COLOR(s.color); pth.style.strokeWidth = s.w || 2.5; pth.style.fill = 'none'; if (s.dash) pth.style.strokeDasharray = s.dash; pth.style.strokeLinejoin = 'round';
    if (s.dots) s.pts.forEach((p, i) => { const c = svgEl('circle', { cx: X(p[0]), cy: Y(p[1]), r: 4 }, svg); c.style.fill = COLOR(typeof s.dots === 'function' ? s.dots(i) : s.color); });
  });
  (o.marks || []).forEach(mk => { const c = svgEl('circle', { cx: X(mk.x), cy: Y(mk.y), r: 8 }, svg); c.style.fill = 'none'; c.style.stroke = COLOR(mk.c); c.style.strokeWidth = 2.5; svgText(svg, X(mk.x), Y(mk.y) - 18, mk.t, { size: 12.5, weight: 700, color: COLOR(mk.c), halo: true }); });
  if (o.legend) { let x = m.l + 6; o.legend.forEach(([t, c, dash]) => { const l = svgEl('line', { x1: x, x2: x + 20, y1: m.t + 4, y2: m.t + 4 }, svg); l.style.stroke = COLOR(c); l.style.strokeWidth = 3; if (dash) l.style.strokeDasharray = '5 3'; const tt = svgText(svg, x + 26, m.t + 4, t, { anchor: 'start', size: 12.5, halo: true }); x += 40 + t.length * 8.5; }); }
}

/* =================== QUICK CHECK =================== */
function mountQC(host, wid) {
  const list = (QUIZ[wid] || {}).qc || [];
  list.forEach((q, i) => {
    const id = 'qa.' + wid + '.' + i;
    const saved = LS.get(id, { text: '', shown: false, kw: [], ox: null });
    const c = document.createElement('div'); c.className = 'qcard'; host.appendChild(c);
    const draw = () => {
      let h = `<div class="q"><span>Q${i + 1}</span>${q.q}</div>`;
      if (q.type === 'ox') h += `<div class="ox"><button data-ox="O" class="${saved.ox ? (q.ans === 'O' ? 'right' : saved.ox === 'O' ? 'wrong' : '') : ''}">O</button><button data-ox="X" class="${saved.ox ? (q.ans === 'X' ? 'right' : saved.ox === 'X' ? 'wrong' : '') : ''}">X</button></div>`;
      else h += `<textarea placeholder="모범 답안을 보기 전에 내 말로 먼저 적어 보세요 (이 브라우저에만 저장)">${esc(saved.text)}</textarea><div class="acts"><button class="btn ${saved.shown ? '' : 'pri'}" data-show>${saved.shown ? '모범 답안 숨기기' : '모범 답안 보기'}</button></div>`;
      const show = q.type === 'ox' ? !!saved.ox : saved.shown;
      if (show) h += `<div class="model"><div class="mh">${q.type === 'ox' ? (saved.ox === q.ans ? '정답 — ' : '오답 — 정답은 ') + q.ans : '모범 답안'}</div>${q.model}${(q.kw || []).length ? `<div class="kw"><span class="cm" style="font-size:12.5px">내 답에 들어간 요소 체크</span>${q.kw.map((k, j) => `<label><input type="checkbox" data-kw="${j}" ${saved.kw.includes(j) ? 'checked' : ''}><span>${k}</span></label>`).join('')}</div>` : ''}${q.ref ? `<div style="margin-top:6px">${H.ref(q.ref)}</div>` : ''}</div>`;
      c.innerHTML = h;
      const ta = c.querySelector('textarea'); if (ta) ta.oninput = () => { saved.text = ta.value; LS.set(id, saved); };
      c.querySelectorAll('[data-ox]').forEach(b => b.onclick = () => { saved.ox = b.dataset.ox; LS.set(id, saved); draw(); });
      const sb = c.querySelector('[data-show]'); if (sb) sb.onclick = () => { saved.shown = !saved.shown; LS.set(id, saved); draw(); };
      c.querySelectorAll('[data-kw]').forEach(cb => cb.onchange = () => { const j = +cb.dataset.kw; saved.kw = cb.checked ? [...new Set([...saved.kw, j])] : saved.kw.filter(x => x !== j); LS.set(id, saved); });
      c.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => APP.goto(b.dataset.goto));
    };
    draw();
  });
}

/* =================== PRACTICE =================== */
function normAns(s) { return String(s).trim().toLowerCase().replace(/\s+/g, '').replace(/,/g, ''); }
function checkAns(input, a) {
  if (input === '' || input == null) return null;
  if (a.type === 'num') { const v = parseFloat(String(input).replace(/,/g, '')); if (isNaN(v)) return false; return Math.abs(v - a.ans) <= (a.tol ?? 1e-9) + 1e-9; }
  const alts = Array.isArray(a.ans) ? a.ans : [a.ans]; return alts.some(x => normAns(x) === normAns(input));
}
function mountPractice(host, spec) {
  const box = document.createElement('div'); box.className = 'prac'; host.appendChild(box);
  let P, open = false;
  const roll = () => { P = spec.gen(rngFrom(1 + Math.floor(Math.random() * 1e9))); open = false; draw(); };
  function draw() {
    const A = spec.answers(P);
    box.innerHTML = `<div class="prac-head"><b>✎ ${spec.title}</b><button class="btn sm" data-roll style="margin-left:auto">🎲 새 숫자로 바꾸기</button></div><div class="prac-body"><div class="prose">${spec.problem(P)}</div>
<div class="ans">${A.map((a, i) => `<label for="pa${i}_${spec.id}">${a.label}</label><input id="pa${i}_${spec.id}" autocomplete="off" spellcheck="false"><span class="res" data-r="${i}"></span>`).join('')}</div>
<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" data-check>채점</button><button class="btn" data-show>정답 보기</button><button class="btn" data-sol>${open ? '풀이 숨기기' : '풀이 보기'}</button></div>
${open ? `<div class="sol"><ol>${spec.solution(P).map(s => `<li>${s}</li>`).join('')}</ol></div>` : ''}</div>`;
    box.querySelector('[data-roll]').onclick = roll;
    box.querySelector('[data-check]').onclick = () => A.forEach((a, i) => { const r = checkAns(box.querySelector('#pa' + i + '_' + spec.id).value, a); const el = box.querySelector(`[data-r="${i}"]`); el.className = 'res ' + (r === null ? '' : r ? 'ok' : 'bad'); el.textContent = r === null ? '' : r ? '✓ 정답' : '✗ 다시'; });
    box.querySelector('[data-show]').onclick = () => A.forEach((a, i) => { const el = box.querySelector(`[data-r="${i}"]`); el.className = 'res'; el.textContent = '→ ' + (a.show ?? (Array.isArray(a.ans) ? a.ans[0] : a.ans)) + (a.unit ? ' ' + a.unit : ''); });
    box.querySelector('[data-sol]').onclick = () => { const vals = A.map((_, i) => box.querySelector('#pa' + i + '_' + spec.id).value); open = !open; draw(); A.forEach((_, i) => box.querySelector('#pa' + i + '_' + spec.id).value = vals[i]); if (spec.afterSol && open) spec.afterSol(P, box); };
  }
  roll();
}

/* TCP cwnd model (slide rules) */
function cwndSim(o) {
  const out = []; let cw = 1, ss = o.ss0;
  for (let t = 0; t <= o.rounds; t++) {
    out.push({ t, cw, ss });
    const e = o.ev[t];
    if (e === 'dup') { ss = Math.max(Math.floor(cw / 2), 2); cw = ss; }
    else if (e === 'to') { ss = Math.max(Math.floor(cw / 2), 2); cw = 1; }
    else if (cw < ss) cw = Math.min(cw * 2, ss);
    else cw += 1;
  }
  return out;
}
function rtoSeq(samples) {
  const out = []; let srtt, rv;
  samples.forEach((r, i) => { if (i === 0) { srtt = r; rv = r / 2; } else { rv = 0.75 * rv + 0.25 * Math.abs(srtt - r); srtt = 0.875 * srtt + 0.125 * r; } out.push({ r, srtt, rv, rto: srtt + 4 * rv }); });
  return out;
}
const utf8 = s => new TextEncoder().encode(s).length;
