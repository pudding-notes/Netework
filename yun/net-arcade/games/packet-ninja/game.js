/* 패킷 닌자 — 과일닌자 + 방화벽 규칙(ACL)
 * 패킷이 아래에서 튀어 오른다. 오른쪽 방화벽 규칙을 위에서부터 읽어 처음 맞는 규칙대로:
 *   차단(DENY) 대상이면 마우스로 베고, 허용(ALLOW) 대상이면 그냥 떨어지게 두어 서버로 들여보낸다.
 * 패킷 15개마다 규칙이 개정되고(무작위), 점점 복잡해진다. 신뢰도 5칸이 바닥날 때까지 끝나지 않는다.
 */
(function () {
  var GAME_ID = 'packet-ninja';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));

  function R(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function P(a) { return a[Math.floor(Math.random() * a.length)]; }
  function ip2i(s) { var p = s.split('.').map(Number); return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]; }
  function i2ip(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
  function maskOf(p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; }
  function netOf(n, p) { return (n & maskOf(p)) >>> 0; }
  function inNet(ip, net) { return netOf(ip, net.p) === net.net; }

  /* ------------------------------------------------------------ 규칙 */
  var SV = { 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS', 80: 'HTTP', 443: 'HTTPS', 445: 'SMB', 3306: 'MySQL', 3389: 'RDP', 8080: 'HTTP-alt', 123: 'NTP', 5060: 'SIP' };
  var COMMON = [22, 23, 25, 53, 80, 443, 445, 3306, 3389, 8080];
  var INNER = [{ net: ip2i('10.0.0.0'), p: 8 }, { net: ip2i('192.168.0.0'), p: 16 }, { net: ip2i('172.16.0.0'), p: 12 }];
  function isPrivate(ip) { return INNER.some(function (n) { return inNet(ip, n); }) || (ip >>> 24) === 127; }
  function badNet(lv) {
    var p = lv >= 7 ? P([24, 22, 20]) : 24;
    var n = ip2i(P([45, 77, 91, 103, 185, 198, 203]) + '.' + R(1, 254) + '.' + R(0, 255) + '.0');
    return { net: netOf(n, p), p: p };
  }
  function netStr(n) { return n ? i2ip(n.net) + '/' + n.p : '어디서나'; }
  function portStr(ps) { return ps ? ps.map(function (p) { return p + (SV[p] ? ' ' + SV[p] : ''); }).join(', ') : '모든 포트'; }
  function protoStr(p) { return p === 'any' ? '모두' : p.toUpperCase(); }
  function rule(act, proto, src, ports) { return { act: act, proto: proto, src: src || null, ports: ports || null }; }

  function genPolicy(lv) {
    var rules = [], tier = lv <= 2 ? 1 : lv <= 4 ? 2 : 3, def, title;
    if (tier === 1) {
      def = 'allow'; title = '기본 허용 + 차단 목록';
      var pool = [function () { return rule('deny', 'tcp', null, [P([23, 445, 3389])]); }, function () { return rule('deny', 'any', badNet(lv)); }, function () { return rule('deny', P(['udp', 'icmp']), null); }];
      pool = NA.shuffle(pool);
      for (var i = 0; i < (lv === 1 ? 1 : 2); i++) rules.push(pool[i]());
    } else if (tier === 2) {
      def = 'deny'; title = '기본 차단 + 허용 목록';
      if (lv >= 4 && Math.random() < .6) rules.push(rule('deny', 'any', badNet(lv)));
      rules.push(rule('allow', 'tcp', null, [80, 443]));
      NA.shuffle([rule('allow', 'udp', null, [53]), rule('allow', 'icmp', null), rule('allow', 'tcp', null, [25])]).slice(0, R(1, 2)).forEach(function (r) { rules.push(r); });
    } else {
      title = '먼저 맞는 규칙이 이긴다';
      var inner = P(INNER), svc = P([[22], [3306], [3389]]);
      if (Math.random() < .7) rules.push(rule('deny', 'any', badNet(lv)));
      rules.push(rule('allow', 'tcp', inner, svc));
      rules.push(rule('deny', 'tcp', null, svc));
      rules.push(rule('allow', 'tcp', null, [80, 443]));
      if (Math.random() < .6) rules.push(rule('allow', 'udp', null, [53]));
      def = Math.random() < .6 ? 'deny' : 'allow';
      if (def === 'allow') rules.push(rule('deny', 'udp', null));
    }
    rules.push(rule(def, 'any', null, null)); rules[rules.length - 1].def = true;
    return { rules: rules, title: title, tier: tier };
  }
  function matches(r, pk) {
    if (r.proto !== 'any' && r.proto !== pk.proto) return false;
    if (r.src && !inNet(pk.src, r.src)) return false;
    if (r.ports && (pk.port == null || r.ports.indexOf(pk.port) < 0)) return false;
    return true;
  }
  function evaluate(pol, pk) { for (var i = 0; i < pol.rules.length; i++) if (matches(pol.rules[i], pk)) return i; return pol.rules.length - 1; }

  function randExternal() { var ip; do { ip = ip2i(R(1, 223) + '.' + R(0, 255) + '.' + R(0, 255) + '.' + R(1, 254)); } while (isPrivate(ip)); return ip; }
  function genPacket(pol) {
    // 규칙 하나를 노리고 그 규칙에 걸리게(가끔은 아슬아슬하게 비껴가게) 만든 뒤, 실제 판정은 처음부터 다시 평가한다
    var rs = pol.rules, r = P(pol.tier === 1 ? rs : rs.concat(rs.filter(function (x) { return x.act === 'deny'; })));
    var proto = r.proto === 'any' ? P(['tcp', 'tcp', 'udp', 'icmp']) : r.proto;
    var port = proto === 'icmp' ? null : r.ports ? P(r.ports) : proto === 'udp' ? P([53, 53, 123, 5060]) : P(COMMON);
    var src;
    if (r.src) {
      var size = Math.pow(2, 32 - r.src.p);
      if (Math.random() < .3) src = (Math.random() < .5 ? r.src.net - R(1, 200) : r.src.net + size + R(0, 200)) >>> 0;   // 경계 바로 밖
      else src = (r.src.net + R(1, size - 2)) >>> 0;
    } else src = Math.random() < .2 ? (P(INNER).net + R(1, 60000)) >>> 0 : randExternal();
    if (Math.random() < .12 && proto !== 'icmp') port = P(COMMON);
    var pk = { proto: proto, port: port, src: src };
    pk.rule = evaluate(pol, pk); pk.block = rs[pk.rule].act === 'deny';
    return pk;
  }

  /* ------------------------------------------------------------ 상태 */
  var W = 800, H = 644, PW = 216, PH = 68, PER = 15, G = 560;
  var S = null, raf = 0, last = 0, cv, cx;
  function newGame() {
    S = { hearts: 5, score: 0, lv: 0, combo: 0, maxCombo: 0, cut: 0, passOk: 0, bad: 0, flying: [], bits: [], texts: [], trail: [],
      launched: 0, judged: 0, t: 0, nextWave: 1, paused: false, over: false, slow: 0, feed: null, flash: -1, flashT: 0, mistakes: [] };
    build(); nextPolicy();
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop);
  }
  function nextPolicy() {
    S.lv++; S.pol = genPolicy(S.lv); S.feed = null; S.flash = -1; S.launched = 0; S.judged = 0; S.flying = []; S.paused = true;
    drawSide(); drawHud();
    var rows = S.pol.rules.map(function (r, i) { return ruleRow(r, i, true); }).join('');
    ov.innerHTML = '<div class="na-card"><h2>' + (S.lv === 1 ? '방화벽 근무 시작' : '방화벽 규칙 개정 · ' + S.lv + '번째') + '</h2>' +
      '<p class="sub">' + esc(S.pol.title) + ' · 위에서부터 읽어 <b>처음 맞는 규칙</b>대로 처리한다. 규칙은 오른쪽에 계속 보인다.</p>' +
      '<table class="acl big"><tr><th>#</th><th>동작</th><th>프로토콜</th><th>출발지</th><th>목적지 포트</th></tr>' + rows + '</table>' +
      '<div class="howto">' + (S.lv === 1 ? '<b>차단</b> 대상 패킷은 마우스로 <b>베고</b>(드래그, 눌러도 된다), <b>허용</b> 대상은 그냥 떨어지게 두어 서버로 보낸다.<br>' : '') +
      '이번 규칙으로 패킷 <b>' + PER + '개</b>. 잘못 베거나(정상 차단) 놓치면(침입 허용) 신뢰도 −1.</div>' +
      '<div class="na-row"><button class="na-btn primary" data-go>시작 (Enter)</button></div></div>';
    ov.hidden = false;
    var go = function () { window.removeEventListener('keydown', kd); ov.hidden = true; S.paused = false; last = performance.now(); S.nextWave = S.t + .6; S.fresh = 1; drawSide(); setTimeout(function () { if (S) { S.fresh = 0; var el = app.querySelector('.panel.rules'); if (el) el.classList.remove('fresh'); } }, 3500); };
    var kd = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    ov.querySelector('[data-go]').onclick = go;
    setTimeout(function () { window.addEventListener('keydown', kd); }, 200);
  }
  function timeScale() { return Math.min(.85, .5 + .035 * (S.lv - 1)) * (S.slow > 0 ? .45 : 1); }
  var LANES = 3;
  function pickLane() {
    // 지금 떠 있는 패킷과 가장 덜 겹치는 칸(세로 줄)을 고른다
    var lw = (W - PW - 40) / (LANES - 1), best = 0, bestN = 1e9;
    NA.shuffle([0, 1, 2]).forEach(function (l) {
      var cx0 = 20 + l * lw, n = S.flying.filter(function (f) { return !f.done && Math.abs(f.x - cx0) < PW * .8; }).length;
      if (n < bestN) { bestN = n; best = l; }
    });
    return 20 + best * lw + R(-12, 12);
  }
  function launch() {
    var pk = genPacket(S.pol), g = G, h = R(Math.round(H * .74), Math.round(H * .88));
    var x = Math.max(4, Math.min(W - PW - 4, pickLane())), vy = -Math.sqrt(2 * g * h), vx = NA.rand(-25, 25);
    S.flying.push({ pk: pk, x: x, y: H + 10, vx: vx, vy: vy, rot: NA.rand(-.15, .15), vr: NA.rand(-.4, .4), done: false });
    S.launched++;
  }
  function launchItem() {
    var g = G, h = R(Math.round(H * .6), Math.round(H * .8)), x = R(80, W - 160);
    S.flying.push({ item: 'slow', x: x, y: H + 10, vx: NA.rand(-40, 40), vy: -Math.sqrt(2 * g * h), rot: 0, vr: 0, done: false, w: 72, h: 72 });
  }

  /* ------------------------------------------------------------ 루프 */
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    if (S && !S.paused && !S.over && ov.hidden) step(dt * timeScale(), dt);
    draw();
  }
  function step(dt, real) {
    S.t += dt; if (S.slow > 0) S.slow -= real;
    if (S.flashT > 0) S.flashT -= real;
    if (S.launched < PER && S.t >= S.nextWave) {
      var k = Math.min(S.lv >= 6 ? 4 : 3, 1 + Math.floor(S.lv / 2), PER - S.launched);
      k = S.launched < 3 ? 1 : R(1, k);   // 새 규칙의 처음 3개는 하나씩 천천히
      for (var i = 0; i < k; i++) (function (d) { setTimeout(function () { if (S && !S.over && S.launched < PER) launch(); }, d); })(i * 420);
      if (S.lv >= 2 && Math.random() < .07) launchItem();
      S.nextWave = S.t + (S.launched < 3 ? 2.6 : Math.max(2, 3.6 - .15 * S.lv) + k * .45);
    }
    var g = G;
    S.flying.forEach(function (f) {
      f.vy += g * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      if (f.x < 4) { f.x = 4; f.vx = Math.abs(f.vx); } if (f.x > W - (f.w || PW) - 4) { f.x = W - (f.w || PW) - 4; f.vx = -Math.abs(f.vx); }
      if (!f.done && f.vy > 0 && f.y > H + 6) { f.done = true; if (!f.item) judge(f, false); }
    });
    S.flying = S.flying.filter(function (f) { return !f.done || f.y < H + 200; }).filter(function (f) { return !f.done; });
    S.bits.forEach(function (b) { b.vy += g * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt; b.life -= real; });
    S.bits = S.bits.filter(function (b) { return b.life > 0; });
    S.texts.forEach(function (t) { t.y -= 40 * real; t.life -= real; });
    S.texts = S.texts.filter(function (t) { return t.life > 0; });
    var cut = performance.now() - 160; S.trail = S.trail.filter(function (p) { return p.t > cut; });
    if (S.launched >= PER && !S.flying.some(function (f) { return !f.item; }) && S.judged >= PER && !S.over) { S.flying = []; bonusAndNext(); }
  }
  function bonusAndNext() {
    var b = 100 * S.lv; S.score += b; S.paused = true; NA.sfx.perfect();
    S.texts.push({ x: W / 2, y: H / 2, s: '규칙 ' + S.lv + ' 완료 +' + b, c: '#ffc94d', life: 1.4, big: true });
    var me = S; setTimeout(function () { if (S === me && !S.over) nextPolicy(); }, 1100);
    drawHud();
  }

  /* ------------------------------------------------------------ 판정 */
  function judge(f, sliced) {
    var pk = f.pk, r = S.pol.rules[pk.rule], ok = sliced === pk.block, cx0 = f.x + PW / 2;
    S.judged++;
    if (ok) {
      if (sliced) { S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.cut++; var pts = Math.round(10 * S.lv * (1 + Math.min(S.combo - 1, 10) * .1)); S.score += pts; S.texts.push({ x: cx0, y: f.y, s: '+' + pts + (S.combo >= 3 ? ' ×' + S.combo : ''), c: '#5dffa0', life: .9 }); NA.sfx.tone(520 + Math.min(S.combo, 10) * 50, .07, 'square', .12); }
      else { S.passOk++; S.score += 2 * S.lv; S.texts.push({ x: cx0, y: H - 30, s: '✓ 통과', c: '#4de2ff', life: .7 }); }
      S.feed = { ok: true, pk: pk, sliced: sliced, why: why(pk) };
    } else {
      S.hearts--; S.combo = 0; S.bad++; NA.sfx.bad();
      S.texts.push({ x: cx0, y: sliced ? f.y : H - 40, s: sliced ? '✗ 정상 트래픽 차단!' : '✗ 침입 허용!', c: '#ff5470', life: 1.3 });
      S.feed = { ok: false, pk: pk, sliced: sliced, why: why(pk) };
      S.mistakes.unshift({ pk: pk, sliced: sliced, rule: r, idx: pk.rule });
      S.flash = pk.rule; S.flashT = 2.2;
      var st = document.getElementById('stage'); st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake');
      if (S.hearts <= 0) return gameOver();
    }
    drawHud(); drawSide();
  }
  function slice(f, ang) {
    if (f.done || S.paused || S.over) return;
    f.done = true;
    var w = f.w || PW, h = f.h || PH, a = ang == null ? 0 : ang;
    for (var s = -1; s <= 1; s += 2) S.bits.push({ x: f.x + (s > 0 ? w / 2 : 0), y: f.y, w: w / 2, h: h, vx: f.vx + s * 140 + Math.cos(a) * 60, vy: Math.min(f.vy, 0) - 120, rot: f.rot, vr: s * 3, life: 1.2, half: s, f: f });
    NA.sfx.noise(.08, .12);
    if (f.item) { S.slow = 5; S.texts.push({ x: f.x + 36, y: f.y, s: '⏳ 슬로모 5초', c: '#b18cff', life: 1.2 }); NA.sfx.perfect(); return; }
    judge(f, true);
  }
  function hitTest(x0, y0, x1, y1) {
    S.flying.forEach(function (f) {
      if (f.done) return;
      var w = f.w || PW, h = f.h || PH, n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6));
      for (var i = 0; i <= n; i++) {
        var x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
        if (x >= f.x && x <= f.x + w && y >= f.y && y <= f.y + h) { slice(f, Math.atan2(y1 - y0, x1 - x0)); break; }
      }
    });
  }

  /* ------------------------------------------------------------ 입력 */
  var down = false, lp = null;
  function pos(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
  function onDown(e) { if (!S || S.paused || S.over) return; NA.sfx.unlock(); down = true; lp = pos(e); S.trail.push({ x: lp.x, y: lp.y, t: performance.now() }); hitTest(lp.x, lp.y, lp.x + .1, lp.y + .1); cv.setPointerCapture && cv.setPointerCapture(e.pointerId); }
  function onMove(e) { if (!down || !S || S.paused || S.over) return; var p = pos(e); S.trail.push({ x: p.x, y: p.y, t: performance.now() }); hitTest(lp.x, lp.y, p.x, p.y); lp = p; }
  function onUp() { down = false; lp = null; }

  /* ------------------------------------------------------------ 그리기 */
  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  var PC = { tcp: '#3a8dff', udp: '#ff9f1c', icmp: '#2fd38a' };
  function packetBody(pk, w, h) {
    rr(0, 0, w, h, 12); cx.fillStyle = '#f4f7ff'; cx.fill();
    cx.lineWidth = 3; cx.strokeStyle = PC[pk.proto]; cx.stroke();
    rr(0, 0, 58, h, 12); cx.fillStyle = PC[pk.proto]; cx.fill(); cx.fillRect(40, 0, 18, h);
    cx.fillStyle = '#0a0e1c'; cx.font = '700 16px ' + NA.FONT; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(pk.proto.toUpperCase(), 29, h / 2);
    cx.textAlign = 'left';
    cx.font = '700 16px ' + NA.FONT; cx.fillStyle = '#111a33';
    cx.fillText(pk.port == null ? 'ping' : '→ ' + pk.port + (SV[pk.port] ? ' ' + SV[pk.port] : ''), 66, 24);
    cx.font = '400 13px ' + NA.FONT; cx.fillStyle = '#3a4466';
    cx.fillText('from ' + i2ip(pk.src), 66, 48);
  }
  function draw() {
    if (!cx) return;
    cx.setTransform(2, 0, 0, 2, 0, 0);
    var g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1024'); g.addColorStop(1, '#141c3c');
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    cx.strokeStyle = 'rgba(77,226,255,.06)'; cx.lineWidth = 1;
    for (var gx = 0; gx < W; gx += 40) { cx.beginPath(); cx.moveTo(gx, 0); cx.lineTo(gx, H); cx.stroke(); }
    for (var gy = 0; gy < H; gy += 40) { cx.beginPath(); cx.moveTo(0, gy); cx.lineTo(W, gy); cx.stroke(); }
    // 서버 띠
    cx.fillStyle = 'rgba(77,226,255,.12)'; cx.fillRect(0, H - 22, W, 22);
    cx.fillStyle = '#4de2ff'; cx.font = '400 12px ' + NA.FONT; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('▼ 떨어진 패킷은 내부 서버로 들어간다 (허용) ▼', W / 2, H - 11);
    if (!S) return;
    if (S.slow > 0) { cx.fillStyle = 'rgba(177,140,255,.10)'; cx.fillRect(0, 0, W, H); }
    S.flying.forEach(function (f) {
      cx.save(); var w = f.w || PW, h = f.h || PH; cx.translate(f.x + w / 2, f.y + h / 2); cx.rotate(f.rot); cx.translate(-w / 2, -h / 2);
      if (f.item) { cx.beginPath(); cx.arc(36, 36, 34, 0, Math.PI * 2); cx.fillStyle = '#2a2050'; cx.fill(); cx.lineWidth = 3; cx.strokeStyle = '#b18cff'; cx.stroke(); cx.font = '32px sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('⏳', 36, 38); }
      else packetBody(f.pk, w, h);
      cx.restore();
    });
    S.bits.forEach(function (b) {
      cx.save(); cx.globalAlpha = Math.max(0, Math.min(1, b.life)); cx.translate(b.x + b.w / 2, b.y + b.h / 2); cx.rotate(b.rot);
      cx.beginPath(); cx.rect(-b.w / 2, -b.h / 2, b.w, b.h); cx.clip();
      cx.translate(b.half > 0 ? -b.w * 1.5 : -b.w / 2, -b.h / 2);
      if (b.f.item) { cx.beginPath(); cx.arc(36, 36, 34, 0, Math.PI * 2); cx.fillStyle = '#2a2050'; cx.fill(); } else packetBody(b.f.pk, b.w * 2, b.h);
      cx.restore();
    });
    // 칼날 궤적
    if (S.trail.length > 1) {
      cx.lineCap = 'round'; cx.lineJoin = 'round';
      for (var i = 1; i < S.trail.length; i++) { var a = S.trail[i - 1], c = S.trail[i]; cx.strokeStyle = 'rgba(255,255,255,' + (i / S.trail.length) + ')'; cx.lineWidth = 2 + 6 * i / S.trail.length; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(c.x, c.y); cx.stroke(); }
    }
    S.texts.forEach(function (t) {
      cx.globalAlpha = Math.max(0, Math.min(1, t.life * 1.5)); cx.font = '700 ' + (t.big ? 30 : 17) + 'px ' + NA.FONT; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.lineWidth = 4; cx.strokeStyle = '#000'; cx.strokeText(t.s, t.x, t.y); cx.fillStyle = t.c; cx.fillText(t.s, t.x, t.y); cx.globalAlpha = 1;
    });
    if (S.paused && ov.hidden && !S.over) { cx.fillStyle = 'rgba(0,0,0,.4)'; cx.fillRect(0, 0, W, H); }
  }

  /* ------------------------------------------------------------ 화면 */
  function build() {
    app.innerHTML = '<div class="hud"><span class="t">🥷 패킷 닌자</span><span class="hearts" data-h></span><span class="st">점수 <b data-score>0</b></span><span class="st">규칙 <b data-lv>1</b>번째</span>' +
      '<span class="st">남은 패킷 <b data-left>0</b></span><span class="st">콤보 <b data-combo>0</b></span><span class="sp"></span><button class="na-btn" data-pause>일시정지 (Esc·Space)</button></div>' +
      '<div class="main"><div class="field"><canvas width="1600" height="1288"></canvas></div><div class="side" data-side></div></div>';
    cv = app.querySelector('canvas'); cx = cv.getContext('2d');
    cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
    app.querySelector('[data-pause]').onclick = function () { pause(true); };
  }
  function drawHud() {
    if (!S) return;
    var h = ''; for (var k = 0; k < 5; k++) h += k < S.hearts ? '♥' : '<i>♥</i>';
    var q = function (s) { return app.querySelector(s); };
    q('[data-h]').innerHTML = h; q('[data-score]').textContent = S.score; q('[data-lv]').textContent = S.lv;
    q('[data-left]').textContent = Math.max(0, PER - S.judged); q('[data-combo]').textContent = S.combo;
  }
  function ruleRow(r, i, plain) {
    var fl = !plain && S.flash === i && S.flashT > 0;
    return '<tr class="' + (r.act === 'deny' ? 'deny' : 'allow') + (fl ? ' flash' : '') + '"><td>' + (r.def ? '기본' : i + 1) + '</td><td class="act">' + (r.act === 'deny' ? '차단 ✂' : '허용 ↓') + '</td>' +
      '<td>' + protoStr(r.proto) + '</td><td>' + esc(netStr(r.src)) + '</td><td>' + esc(r.proto === 'icmp' ? '-' : portStr(r.ports)) + '</td></tr>';
  }
  function pkStr(pk) { return pk.proto.toUpperCase() + ' ' + (pk.port == null ? 'ping' : ':' + pk.port + (SV[pk.port] ? ' ' + SV[pk.port] : '')) + ' · ' + i2ip(pk.src); }
  function why(pk) {
    var r = S.pol.rules[pk.rule], skip = [];
    for (var i = 0; i < pk.rule; i++) skip.push(i + 1);
    var s = (pk.rule > 0 ? '규칙 ' + skip.join('·') + '에는 안 맞고 ' : '') + (r.def ? '<b>기본 규칙</b>' : '<b>규칙 ' + (pk.rule + 1) + '</b>') + '에 처음 걸린다 → <b>' + (r.act === 'deny' ? '차단(베기)' : '허용(통과)') + '</b>';
    if (r.src && inNet(pk.src, r.src) && r.src.p !== 8 && r.src.p !== 16) s += '<br>' + i2ip(pk.src) + '는 ' + netStr(r.src) + ' 범위(' + i2ip(r.src.net) + '~' + i2ip((r.src.net + Math.pow(2, 32 - r.src.p) - 1) >>> 0) + ') 안이다.';
    else {
      var near = S.pol.rules.filter(function (x) { return x.src && !inNet(pk.src, x.src) && Math.abs(pk.src - x.src.net) < 1024 + Math.pow(2, 32 - x.src.p); })[0];
      if (near) s += '<br>' + i2ip(pk.src) + '는 ' + netStr(near.src) + ' 범위(' + i2ip(near.src.net) + '~' + i2ip((near.src.net + Math.pow(2, 32 - near.src.p) - 1) >>> 0) + ') <b>밖</b>이다.';
    }
    return s;
  }
  function drawSide() {
    if (!S || !S.pol) return;
    var f = S.feed, fb = '';
    if (f) fb = '<div class="feed ' + (f.ok ? 'ok' : 'no') + '"><h4>' + (f.ok ? (f.sliced ? '✓ 차단 성공' : '✓ 정상 통과') : (f.sliced ? '✗ 정상 트래픽을 베었다 (−1)' : '✗ 차단 대상을 놓쳤다 (−1)')) + '</h4><div class="pk">' + esc(pkStr(f.pk)) + '</div><p>' + f.why + '</p></div>';
    else fb = '<div class="feed"><h4>근무 중</h4><p>패킷마다 규칙을 <b>위에서부터</b> 읽어 처음 맞는 줄을 찾자. 차단이면 베고, 허용이면 떨어지게 둔다.</p></div>';
    app.querySelector('[data-side]').innerHTML = '<div class="panel rules' + (S.fresh > 0 ? ' fresh' : '') + '"><h4>🛡️ 지금 방화벽 규칙 · ' + S.lv + '번째 <small>위에서부터 · 처음 맞는 줄</small></h4>' +
      '<table class="acl"><tr><th>#</th><th>동작</th><th>종류</th><th>출발지</th><th>포트</th></tr>' + S.pol.rules.map(function (r, i) { return ruleRow(r, i); }).join('') + '</table></div>' + fb +
      '<div class="panel tip"><p><b>✂ 베기</b> = 차단(DENY) · <b>↓ 두기</b> = 허용(ALLOW)</p><p>⏳ 보라 구슬을 베면 5초 슬로모. 패킷 ' + PER + '개마다 규칙이 바뀐다.</p></div>';
  }

  /* ------------------------------------------------------------ 일시정지 / 끝 */
  function pause(on) {
    if (!S || S.over) return;
    if (on && S.paused) return;
    S.paused = on;
    if (!on) { ov.hidden = true; last = performance.now(); return; }
    ov.innerHTML = '<div class="na-card"><h2>일시정지</h2><p class="sub">지금 규칙을 천천히 읽어 보자. 위에서부터, 처음 맞는 줄이 정답.</p>' +
      '<table class="acl big"><tr><th>#</th><th>동작</th><th>종류</th><th>출발지</th><th>목적지 포트</th></tr>' + S.pol.rules.map(function (r, i) { return ruleRow(r, i, true); }).join('') + '</table>' +
      '<div class="na-row"><button class="na-btn primary" data-go>계속 (Esc·Space)</button><button class="na-btn" data-quit>그만하고 결과 보기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-go]').onclick = function () { pause(false); };
    ov.querySelector('[data-quit]').onclick = function () { ov.hidden = true; gameOver(); };
  }
  document.addEventListener('keydown', function (e) {
    if (!S || S.over || (e.key !== 'Escape' && e.key !== ' ')) return;
    if (e.key === ' ' && !ov.hidden && !ov.querySelector('[data-quit]')) return;
    if (S.paused && !ov.hidden && ov.querySelector('[data-quit]')) { e.preventDefault(); pause(false); }
    else if (!S.paused && ov.hidden) { e.preventDefault(); pause(true); }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && S && !S.over && !S.paused) pause(true); });

  function gameOver() {
    if (S.over) return;
    S.over = true; NA.sfx.lose(); drawHud();
    var stars = S.lv >= 8 ? 3 : S.lv >= 5 ? 2 : S.lv >= 2 ? 1 : 0;
    var me = S;
    setTimeout(function () {
      if (S !== me) return;
      var m = S.mistakes[0];
      NA.ui.debrief({
        overlay: ov, gameId: GAME_ID, endless: true, win: false, stars: stars, score: S.score,
        title: '방화벽 근무 종료', sub: '규칙 ' + S.lv + '번째까지 · ★는 규칙 2/5/8번째에서' + (m ? '<br>마지막 실수: ' + esc(pkStr(m.pk)) + ' → ' + (m.rule.def ? '기본 규칙' : '규칙 ' + (m.idx + 1)) + '에 걸려 ' + (m.rule.act === 'deny' ? '차단' : '허용') + '이었다.' : ''),
        stats: [['점수', S.score], ['벤 패킷', S.cut], ['통과시킨 패킷', S.passOk], ['실수', S.bad], ['최대 콤보', S.maxCombo]],
        qc: ['W2-7'], playNotes: { 'W2-7': '서버가 어떤 포트를 열고 있든, 들어오는 패킷을 통과시킬지는 방화벽 규칙(출발지·프로토콜·포트)이 정했다. 0.0.0.0 bind도 결국 이런 규칙과 NAT·Security Group을 거쳐야 밖에서 닿는다.' },
        onRetry: newGame, onNext: null, onMenu: menu
      });
    }, 900);
  }
  function menu() {
    cancelAnimationFrame(raf); S = null; app.innerHTML = ''; cx = null;
    NA.ui.renderTags(GAME_ID);
    NA.ui.stageMenu({
      overlay: ov, gameId: GAME_ID, stages: [], onPick: function () {},
      howto: '패킷이 아래에서 튀어 오른다. 오른쪽 <b>방화벽 규칙</b>을 위에서부터 읽어 <b>처음 맞는 규칙</b>이 정답이다.<br>' +
        '<b>차단</b>이면 마우스로 <b>베고</b>(드래그 또는 클릭), <b>허용</b>이면 그냥 떨어지게 둔다. 잘못 베거나 놓치면 신뢰도 −1.<br>' +
        '패킷 ' + PER + '개마다 규칙이 무작위로 개정되고 점점 복잡해진다(차단 목록 → 허용 목록 → 예외가 있는 순서 규칙, CIDR 범위). <span class="key">Esc</span> 일시정지',
      endless: { title: '방화벽 근무', desc: '규칙·패킷이 매번 무작위. 신뢰도 5칸이 바닥날 때까지.', onPick: newGame }
    });
  }

  window.__game = {
    state: function () { return S; }, start: newGame, jump: function (lv) { S.lv = lv - 1; nextPolicy(); }, slice: function (f) { slice(f); }, genPolicy: genPolicy, evaluate: evaluate, genPacket: genPacket,
    autoplay: function (acc) { if (!S) return; S.flying.forEach(function (f) { if (!f.done && !f.item && f.vy > -50 && f.y < H - 120) { var want = f.pk.block; if (Math.random() > (acc == null ? 1 : acc)) want = !want; if (want) slice(f); } }); }
  };
  if (NA.wantsEndless()) { NA.ui.renderTags(GAME_ID); newGame(); } else menu();
})();
