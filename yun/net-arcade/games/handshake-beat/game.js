/* 핸드셰이크 비트 — TCP 상태 리듬게임 (무한)
 * 상대가 보낸 패킷(또는 내 앱의 호출)이 노트가 되어 오른쪽에서 흘러온다.
 * 노트가 판정선에 닿을 때 내 소켓이 보낼 답을 누른다: S SYN · D SYN+ACK · F ACK · J FIN · K RST · Space 보내지 않음
 * 연결(세션)마다 서버/클라이언트 역할과 사건(유령 ACK, 닫힌 포트, 중복 데이터, FIN 재전송, RST…)이 무작위.
 * 게이지가 바닥날 때까지 계속되고, 세션마다 BPM이 조금씩 오른다.
 */
(function () {
  var GAME_ID = 'handshake-beat';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));
  function R(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function chance(p) { return Math.random() < p; }

  var KEYS = [
    { k: 'syn', key: 's', lab: 'SYN', d: '연결 요청', c: '#4de2ff' },
    { k: 'synack', key: 'd', lab: 'SYN+ACK', d: '요청 수락', c: '#5dffa0' },
    { k: 'ack', key: 'f', lab: 'ACK', d: '받았다', c: '#ffc94d' },
    { k: 'fin', key: 'j', lab: 'FIN', d: '나도 끝', c: '#b18cff' },
    { k: 'rst', key: 'k', lab: 'RST', d: '거절·강제 종료', c: '#ff5470' },
    { k: 'none', key: ' ', lab: '안 보냄', d: '답할 게 없다', c: '#8a93c2', kl: 'Space' }
  ];
  var KBY = {}; KEYS.forEach(function (k) { KBY[k.k] = k; });
  var STATES = ['CLOSED', 'LISTEN', 'SYN_SENT', 'SYN_RCVD', 'ESTABLISHED', 'FIN_WAIT_1', 'FIN_WAIT_2', 'TIME_WAIT', 'CLOSE_WAIT', 'LAST_ACK'];
  var SDESC = { CLOSED: '연결 없음', LISTEN: '연결 요청을 기다림', SYN_SENT: 'SYN 보내고 답 기다림', SYN_RCVD: 'SYN+ACK 보내고 ACK 기다림', ESTABLISHED: '연결됨 · 데이터 주고받기',
    FIN_WAIT_1: '내 FIN의 ACK 기다림', FIN_WAIT_2: '상대 FIN 기다림', TIME_WAIT: '마지막 ACK 후 잠시 대기', CLOSE_WAIT: '상대는 끝냄 · 내 close() 기다림', LAST_ACK: '내 FIN의 마지막 ACK 기다림' };

  /* ------------------------------------------------------------ 세션(연결 하나) 대본 */
  function step(kind, lab, sub, from, expect, to, why) { return { kind: kind, lab: lab, sub: sub || '', from: from, expect: expect, to: to, why: why }; }
  function genSession(lv, n) {
    var role = n % 2 === 1 ? 'server' : 'client', S = [], st, seq = R(1, 90) * 100, mySeq = R(1, 90) * 1000, port = role === 'server' ? NA.pick([80, 443, 8080, 3000]) : NA.pick([443, 8080, 22]);
    var title;
    if (role === 'server') {
      // 닫힌 포트 사건
      if (lv >= 2 && chance(.15)) {
        title = '나는 서버 · 그런데 ' + port + '번은 listen하지 않는다';
        S.push(step('pkt', 'SYN', 'seq=' + seq + ' → :' + port, 'CLOSED', 'rst', 'CLOSED', '듣고 있는 소켓이 없는 포트로 SYN이 왔다 → RST로 거절한다. 상대 쪽에서는 "Connection refused".'));
        return { role: role, port: port, title: title, start: 'CLOSED', steps: S };
      }
      title = '나는 서버 · :' + port + ' LISTEN'; st = 'LISTEN';
      if (lv >= 3 && chance(.25)) S.push(step('pkt', 'ACK', 'ack=' + R(100, 999) + ' (연결 없음)', st, 'rst', st, 'LISTEN 소켓에 연결도 맺지 않은 ACK가 왔다(유령 ACK) → RST로 거절하고 계속 LISTEN.'));
      S.push(step('pkt', 'SYN', 'seq=' + seq, st, 'synack', 'SYN_RCVD', 'LISTEN에서 SYN을 받으면 SYN+ACK로 수락한다(내 SYN + 네 SYN 잘 받았다는 ACK).')); st = 'SYN_RCVD';
      S.push(step('pkt', 'ACK', 'ack=' + (mySeq + 1), st, 'none', 'ESTABLISHED', 'SYN_RCVD에서 ACK를 받으면 3-way handshake 끝. ACK에는 답하지 않는다 → ESTABLISHED.')); st = 'ESTABLISHED';
    } else {
      title = '나는 클라이언트 · 서버 :' + port + '에 접속'; st = 'CLOSED';
      S.push(step('app', '앱: connect()', '서버 :' + port, st, 'syn', 'SYN_SENT', '앱이 connect()를 부르면 SYN을 보내 연결을 청한다 → SYN_SENT.')); st = 'SYN_SENT';
      if (lv >= 3 && chance(.2)) {
        S.push(step('pkt', 'RST', '포트 닫힘', st, 'none', 'CLOSED', 'SYN의 답으로 RST가 왔다 = Connection refused. RST에는 답하지 않는다 → CLOSED.'));
        return { role: role, port: port, title: title, start: 'CLOSED', steps: S };
      }
      S.push(step('pkt', 'SYN+ACK', 'seq=' + seq + ' ack=' + (mySeq + 1), st, 'ack', 'ESTABLISHED', 'SYN_SENT에서 SYN+ACK를 받으면 ACK로 답한다 → ESTABLISHED. (3-way의 세 번째)')); st = 'ESTABLISHED';
    }
    // 데이터
    var dseq = seq + 1, nd = R(1, Math.min(4, 1 + Math.floor(lv / 2)));
    for (var i = 0; i < nd; i++) {
      var len = NA.pick([100, 200, 500]);
      S.push(step('pkt', 'DATA', 'seq=' + dseq + ' len=' + len, st, 'ack', st, '데이터를 받으면 ACK(ack=' + (dseq + len) + ')로 답한다. 상태는 그대로 ESTABLISHED.'));
      if (lv >= 2 && chance(.25)) S.push(step('pkt', 'DATA', 'seq=' + dseq + ' len=' + len + ' (또 옴)', st, 'ack', st, '같은 데이터가 또 왔다 = 내 ACK가 사라져 상대가 재전송했다. 버리되 ACK는 다시 보낸다.'));
      dseq += len;
    }
    // 끝내기
    var r = Math.random();
    if (lv >= 3 && r < .15) {
      S.push(step('pkt', 'RST', '상대가 강제 종료', st, 'none', 'CLOSED', 'RST를 받으면 답하지 않고 바로 CLOSED. (FIN처럼 정중하게 닫는 게 아니다)'));
    } else if (r < .58) {
      // 상대가 먼저 닫음 (수동 종료)
      S.push(step('pkt', 'FIN', 'seq=' + dseq, st, 'ack', 'CLOSE_WAIT', '상대가 FIN으로 "보낼 것 끝"을 알렸다 → ACK로 답한다 → CLOSE_WAIT.')); st = 'CLOSE_WAIT';
      if (lv >= 2 && chance(.3)) S.push(step('app', '앱: read()=0', '(EOF)', st, 'none', st, 'read()가 0을 돌려줬다 = 상대가 FIN을 보냈다는 뜻(EOF). 보낼 패킷은 없다. 이제 앱이 close()를 할 차례.'));
      S.push(step('app', '앱: close()', '', st, 'fin', 'LAST_ACK', 'CLOSE_WAIT에서 앱이 close()를 부르면 내 FIN을 보낸다 → LAST_ACK. (close()를 안 하면 CLOSE_WAIT이 쌓인다)')); st = 'LAST_ACK';
      S.push(step('pkt', 'ACK', '내 FIN 확인', st, 'none', 'CLOSED', 'LAST_ACK에서 ACK를 받으면 끝 → CLOSED. ACK에는 답하지 않는다.'));
    } else {
      // 내가 먼저 닫음 (능동 종료)
      S.push(step('app', '앱: close()', '', st, 'fin', 'FIN_WAIT_1', 'ESTABLISHED에서 내 앱이 먼저 close() → FIN을 보낸다 → FIN_WAIT_1.')); st = 'FIN_WAIT_1';
      S.push(step('pkt', 'ACK', '내 FIN 확인', st, 'none', 'FIN_WAIT_2', 'FIN_WAIT_1에서 ACK를 받으면 답 없이 FIN_WAIT_2로. 이제 상대의 FIN을 기다린다.')); st = 'FIN_WAIT_2';
      S.push(step('pkt', 'FIN', '상대도 끝', st, 'ack', 'TIME_WAIT', 'FIN_WAIT_2에서 상대 FIN을 받으면 ACK → TIME_WAIT. 먼저 닫은 쪽이 TIME_WAIT을 겪는다.')); st = 'TIME_WAIT';
      if (lv >= 4 && chance(.35)) S.push(step('pkt', 'FIN', '(재전송)', st, 'ack', st, 'TIME_WAIT 중에 FIN이 또 왔다 = 내 마지막 ACK가 사라졌다. ACK를 다시 보낸다. TIME_WAIT이 있는 이유!'));
    }
    return { role: role, port: port, title: title, start: S[0].from, steps: S };
  }

  /* ------------------------------------------------------------ 상태 */
  var TW = 860, TH = 300, HIT = 150, S = null, raf = 0, last = 0, cv, cx;
  function bpm() { return Math.min(126, 72 + 5 * (S.lv - 1)); }
  function lead() { return Math.max(2.6, 4.6 - .17 * (S.lv - 1)); }
  function newGame() {
    S = { lv: 0, life: 100, score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, t: 0, notes: [], fx: [], feed: null, paused: false, over: false, beatT: 0, state: 'CLOSED', sess: null, nextSessAt: 0 };
    build(); nextSession(1.2);
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop);
  }
  function nextSession(delay) {
    S.lv++;
    var se = genSession(S.lv, S.lv), beat = 60 / bpm(), t = S.t + delay + lead();
    S.sess = se; S.pendingState = se.start; S.stateAt = t - lead() * .6;
    var minBeats = Math.max(1, Math.ceil(150 / ((TW - HIT) / lead()) / beat));   // 노트끼리 최소 150px 떨어지게
    se.steps.forEach(function (st, i) {
      var gap = Math.max(minBeats, S.lv >= 4 && i > 0 && chance(.35) ? 1 : 2);   // 레벨 4부터 1박 간격도 섞인다
      if (i > 0) t += gap * beat;
      S.notes.push({ st: st, t: t, done: false, sess: S.lv });
    });
    S.sessEnd = t + 1.2;
    S.banner = { t: S.t, s: '연결 #' + S.lv + ' · ' + se.title + ' · BPM ' + bpm() };
    drawSide();
  }

  /* ------------------------------------------------------------ 루프 */
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    if (S && !S.paused && !S.over && ov.hidden) tick(dt);
    draw();
  }
  function tick(dt) {
    S.t += dt;
    if (S.pendingState && S.t >= S.stateAt) { setState(S.pendingState); S.pendingState = null; }
    // 메트로놈
    var beat = 60 / bpm();
    S.beatT += dt; if (S.beatT >= beat) { S.beatT -= beat; NA.sfx.tone(180, .03, 'triangle', .04); }
    S.notes.forEach(function (n) {
      if (n.done) return;
      if (S.t - n.t > .32) {
        n.done = true;
        if (n.st.expect === 'none') judge(n, 'none', .2, true);
        else judge(n, null, 1, false);
      }
    });
    S.notes = S.notes.filter(function (n) { return !n.done || S.t - n.t < 1; });
    S.fx.forEach(function (f) { f.life -= dt; }); S.fx = S.fx.filter(function (f) { return f.life > 0; });
    if (!S.over && S.t > S.sessEnd && !S.notes.some(function (n) { return !n.done; })) {
      S.score += 50 * S.lv; S.fx.push({ txt: '연결 #' + S.lv + ' 완료 +' + 50 * S.lv, c: '#ffc94d', life: 1.4, big: true });
      NA.sfx.perfect(); setState('CLOSED'); nextSession(1.4);
    }
  }
  function setState(s) {
    S.state = s;
    var el = app.querySelector('[data-state]');
    if (el) { el.textContent = s; app.querySelector('[data-sdesc]').textContent = SDESC[s] || ''; var box = app.querySelector('.statebox'); box.classList.remove('chg'); void box.offsetWidth; box.classList.add('chg'); }
    app.querySelectorAll('[data-fsm]').forEach(function (c) { c.classList.toggle('on', c.dataset.fsm === s); });
  }

  /* ------------------------------------------------------------ 판정 */
  function press(k) {
    if (!S || S.paused || S.over || !ov.hidden) return;
    flashKey(k);
    var cand = S.notes.filter(function (n) { return !n.done && Math.abs(S.t - n.t) <= .32; }).sort(function (a, b) { return Math.abs(S.t - a.t) - Math.abs(S.t - b.t); })[0];
    if (!cand) { NA.sfx.tone(240, .04, 'square', .05); return; }
    cand.done = true;
    judge(cand, k, Math.abs(S.t - cand.t), false);
  }
  function judge(n, k, off, auto) {
    var st = n.st, ok = k === st.expect, grade;
    if (ok) {
      grade = auto ? 'OK' : off <= .11 ? 'PERFECT' : 'GOOD';
      S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo);
      var base = grade === 'PERFECT' ? 100 : grade === 'GOOD' ? 60 : 40;
      S.score += Math.round(base * (1 + Math.min(S.combo, 30) * .03));
      S.life = Math.min(100, S.life + (grade === 'PERFECT' ? 4 : 2));
      if (grade === 'PERFECT') S.perfect++; else S.good++;
      if (!auto) NA.sfx.tone({ syn: 660, synack: 784, ack: 880, fin: 587, rst: 330, none: 523 }[k], .09, 'square', .12);
      S.feed = { ok: true, st: st, k: k };
    } else {
      grade = k == null ? 'MISS' : 'WRONG';
      S.combo = 0; S.miss++; S.life -= 18; NA.sfx.bad();
      S.feed = { ok: false, st: st, k: k };
      var stg = document.getElementById('stage'); stg.classList.remove('shake'); void stg.offsetWidth; stg.classList.add('shake');
    }
    setState(st.to);
    S.fx.push({ txt: grade + (ok ? '' : ' → ' + KBY[st.expect].lab), c: ok ? (grade === 'PERFECT' ? '#5dffa0' : '#4de2ff') : '#ff5470', life: .9 });
    drawHud(); drawFeed();
    if (S.life <= 0) { S.life = 0; drawHud(); gameOver(); }
  }

  /* ------------------------------------------------------------ 그리기 */
  function rr(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }
  function draw() {
    if (!cx) return;
    cx.setTransform(2, 0, 0, 2, 0, 0);
    cx.fillStyle = '#0b1024'; cx.fillRect(0, 0, TW, TH);
    if (!S) return;
    var speed = (TW - HIT) / lead(), beat = 60 / bpm(), cy = TH / 2;
    // 박자 선
    var phase = S.beatT / beat;
    for (var i = 0; i < 12; i++) { var x = HIT + (i - phase) * beat * speed; if (x < HIT - 2 || x > TW) continue; cx.fillStyle = i % 4 === 0 ? 'rgba(77,226,255,.18)' : 'rgba(77,226,255,.07)'; cx.fillRect(x, 30, 2, TH - 60); }
    // 길
    cx.fillStyle = 'rgba(255,255,255,.04)'; cx.fillRect(0, cy - 62, TW, 124);
    cx.font = '400 12px ' + NA.FONT; cx.fillStyle = '#8a93c2'; cx.textAlign = 'right'; cx.textBaseline = 'middle';
    cx.fillText('상대 →', TW - 10, 18); cx.textAlign = 'left'; cx.fillText('← 내 소켓', 10, 18);
    // 판정선
    var pulse = 1 - Math.min(1, S.beatT / beat);
    cx.fillStyle = 'rgba(255,201,77,' + (.35 + .5 * pulse) + ')'; cx.fillRect(HIT - 3, cy - 74, 6, 148);
    rr(HIT - 64, cy - 66, 128, 132, 14); cx.lineWidth = 2; cx.strokeStyle = 'rgba(255,201,77,.5)'; cx.stroke();
    // 노트
    S.notes.slice().reverse().forEach(function (n) {
      var x = HIT + (n.t - S.t) * speed;
      if (x > TW + 80) return;
      var w = 120, h = 104, a = n.done ? Math.max(0, 1 - (S.t - n.t) * 2) : 1;
      cx.globalAlpha = a;
      rr(x - w / 2, cy - h / 2, w, h, 12);
      cx.fillStyle = n.st.kind === 'app' ? '#3a2f10' : '#f2f5ff'; cx.fill();
      cx.lineWidth = 3; cx.strokeStyle = n.st.kind === 'app' ? '#ffc94d' : '#4de2ff'; cx.stroke();
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillStyle = n.st.kind === 'app' ? '#ffc94d' : '#0a0e1c';
      cx.font = '700 ' + (n.st.lab.length > 8 ? 15 : 22) + 'px ' + NA.FONT; cx.fillText(n.st.lab, x, cy - 14);
      cx.font = '400 11.5px ' + NA.FONT; cx.fillStyle = n.st.kind === 'app' ? '#e8d9a8' : '#3a4466';
      wrap(n.st.sub, x, cy + 18, w - 12, 14);
      cx.globalAlpha = 1;
    });
    // 판정 글자
    S.fx.forEach(function (f, i) {
      cx.globalAlpha = Math.min(1, f.life * 2); cx.textAlign = 'center'; cx.font = '700 ' + (f.big ? 26 : 20) + 'px ' + NA.FONT;
      cx.lineWidth = 4; cx.strokeStyle = '#000'; var y = f.big ? TH / 2 : cy - 92 + (1 - f.life) * -14;
      cx.strokeText(f.txt, f.big ? TW / 2 : HIT + 40, y); cx.fillStyle = f.c; cx.fillText(f.txt, f.big ? TW / 2 : HIT + 40, y); cx.globalAlpha = 1;
    });
    if (S.banner && S.t - S.banner.t < 3.2) {
      cx.globalAlpha = Math.min(1, (3.2 - (S.t - S.banner.t)) * 2);
      cx.fillStyle = 'rgba(0,0,0,.6)'; cx.fillRect(0, TH - 34, TW, 34);
      cx.font = '700 14px ' + NA.FONT; cx.fillStyle = '#ffc94d'; cx.textAlign = 'center'; cx.fillText(S.banner.s, TW / 2, TH - 17); cx.globalAlpha = 1;
    }
    if (S.paused) { cx.fillStyle = 'rgba(0,0,0,.55)'; cx.fillRect(0, 0, TW, TH); }
  }
  function wrap(t, x, y, w, lh) {
    if (!t) return;
    if (cx.measureText(t).width <= w) return cx.fillText(t, x, y);
    var words = t.split(' '), line = '', lines = [];
    words.forEach(function (wd) { var tt = line ? line + ' ' + wd : wd; if (cx.measureText(tt).width > w && line) { lines.push(line); line = wd; } else line = tt; });
    lines.push(line);
    lines.slice(0, 2).forEach(function (l, i) { cx.fillText(l, x, y + (i - (lines.length > 1 ? .5 : 0)) * lh); });
  }

  /* ------------------------------------------------------------ 화면 */
  function build() {
    app.innerHTML = '<div class="hud"><span class="t">🥁 핸드셰이크 비트</span><div class="life"><i data-life></i><span data-lifet>100</span></div>' +
      '<span class="st">점수 <b data-score>0</b></span><span class="st">연결 <b data-lv>1</b></span><span class="st">BPM <b data-bpm>72</b></span><span class="st">콤보 <b data-combo>0</b></span>' +
      '<span class="sp"></span><button class="na-btn" data-pause>일시정지 (Esc)</button></div>' +
      '<div class="main"><div class="left">' +
        '<div class="statebox"><span class="lbl">내 소켓 상태</span><b data-state>CLOSED</b><span class="sd" data-sdesc>연결 없음</span><span class="role" data-role></span></div>' +
        '<div class="track"><canvas width="1720" height="600"></canvas></div>' +
        '<div class="keys">' + KEYS.map(function (k) { return '<button class="key" data-key="' + k.k + '" style="--kc:' + k.c + '"><span class="kk">' + (k.kl || k.key.toUpperCase()) + '</span><span class="kl">' + k.lab + '</span><span class="kd">' + k.d + '</span></button>'; }).join('') + '</div>' +
        '<div class="feed" data-feed></div>' +
      '</div><div class="side" data-side></div></div>';
    cv = app.querySelector('canvas'); cx = cv.getContext('2d');
    app.querySelectorAll('[data-key]').forEach(function (b) { b.onpointerdown = function (e) { e.preventDefault(); press(b.dataset.key); }; });
    app.querySelector('[data-pause]').onclick = function () { pause(true); };
    drawHud(); drawFeed();
  }
  function flashKey(k) { var b = app.querySelector('[data-key="' + k + '"]'); if (!b) return; b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); }
  function drawHud() {
    var q = function (s) { return app.querySelector(s); };
    q('[data-life]').style.width = S.life + '%'; q('[data-life]').className = S.life < 30 ? 'low' : '';
    q('[data-lifet]').textContent = Math.round(S.life);
    q('[data-score]').textContent = S.score; q('[data-lv]').textContent = S.lv; q('[data-bpm]').textContent = bpm(); q('[data-combo]').textContent = S.combo;
  }
  function drawFeed() {
    var f = S.feed, el = app.querySelector('[data-feed]');
    if (!f) { el.className = 'feed'; el.innerHTML = '노트가 <b>노란 판정선</b>에 닿는 순간 내 소켓이 보낼 답을 누른다. 위의 <b>내 소켓 상태</b>를 보고 정하자. 답할 게 없으면 <b>Space</b>(가만히 있어도 된다).'; return; }
    el.className = 'feed ' + (f.ok ? 'ok' : 'no');
    el.innerHTML = '<b>' + f.st.from + '</b>에서 ' + (f.st.kind === 'app' ? esc(f.st.lab) : '<b>' + esc(f.st.lab) + '</b> 받음') + ' → 정답 <b class="k" style="color:' + KBY[f.st.expect].c + '">' + KBY[f.st.expect].lab + '</b>' +
      (f.ok ? '' : f.k ? ' (누른 것: ' + KBY[f.k].lab + ')' : ' (놓침)') + ' → <b>' + f.st.to + '</b><br><span>' + esc(f.st.why) + '</span>';
  }
  function drawSide() {
    var se = S.sess;
    app.querySelector('[data-role]').textContent = se.role === 'server' ? '역할: 서버 · :' + se.port : '역할: 클라이언트 → :' + se.port;
    app.querySelector('[data-side]').innerHTML = '<div class="panel"><h4>TCP 상태 지도</h4><div class="fsm">' +
      STATES.map(function (s) { return '<span class="chip' + (s === S.state ? ' on' : '') + '" data-fsm="' + s + '">' + s + '</span>'; }).join('') + '</div>' +
      '<div class="flows"><p><b>여는 길</b> 서버 LISTEN → SYN_RCVD → ESTABLISHED<br>클라 CLOSED → SYN_SENT → ESTABLISHED</p>' +
      '<p><b>먼저 닫음</b> FIN_WAIT_1 → FIN_WAIT_2 → TIME_WAIT</p><p><b>나중에 닫음</b> CLOSE_WAIT → LAST_ACK → CLOSED</p></div></div>' +
      '<div class="panel"><h4>답하는 요령</h4><ul class="rules">' +
      '<li><b>SYN</b> 받으면(LISTEN) → SYN+ACK</li><li><b>SYN+ACK</b> 받으면 → ACK</li><li><b>DATA·FIN</b> 받으면 → ACK</li>' +
      '<li><b>ACK·RST</b>에는 답하지 않는다 → Space</li><li>앱이 <b>connect()</b> → SYN, <b>close()</b> → FIN</li><li>엉뚱한 패킷(닫힌 포트, 연결 없는 ACK) → RST</li></ul></div>';
  }

  /* ------------------------------------------------------------ 입력 */
  document.addEventListener('keydown', function (e) {
    if (!S || S.over) return;
    if (e.key === 'Escape') { e.preventDefault(); if (S.paused && ov.querySelector('[data-quit]')) pause(false); else if (!S.paused) pause(true); return; }
    if (e.repeat || S.paused || !ov.hidden) return;
    var k = e.key.toLowerCase(), m = KEYS.filter(function (x) { return x.key === k; })[0];
    if (m) { e.preventDefault(); press(m.k); }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && S && !S.over && !S.paused) pause(true); });
  function pause(on) {
    if (!S || S.over) return;
    S.paused = on;
    if (!on) { ov.hidden = true; last = performance.now(); return; }
    ov.innerHTML = '<div class="na-card"><h2>일시정지</h2><p class="sub">지금 상태: <b>' + S.state + '</b> (' + esc(SDESC[S.state]) + ')</p>' +
      '<div class="howto">키: <span class="key">S</span> SYN · <span class="key">D</span> SYN+ACK · <span class="key">F</span> ACK · <span class="key">J</span> FIN · <span class="key">K</span> RST · <span class="key">Space</span> 안 보냄<br>' +
      'ACK와 RST에는 답하지 않는다. 데이터와 FIN에는 ACK. 앱의 connect()는 SYN, close()는 FIN.</div>' +
      '<div class="na-row"><button class="na-btn primary" data-go>계속 (Esc)</button><button class="na-btn" data-quit>그만하고 결과 보기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-go]').onclick = function () { pause(false); };
    ov.querySelector('[data-quit]').onclick = function () { ov.hidden = true; S.paused = false; gameOver(); };
  }

  function gameOver() {
    if (S.over) return;
    S.over = true; NA.sfx.lose();
    var stars = S.lv >= 10 ? 3 : S.lv >= 6 ? 2 : S.lv >= 3 ? 1 : 0, me = S;
    setTimeout(function () {
      if (S !== me) return;
      NA.ui.debrief({
        overlay: ov, gameId: GAME_ID, endless: true, win: false, stars: stars, score: S.score,
        title: '연결 끊김', sub: '연결 ' + S.lv + '번째에서 게이지 소진 · ★는 연결 3/6/10번째에서',
        stats: [['점수', S.score], ['PERFECT', S.perfect], ['GOOD·OK', S.good], ['MISS·오답', S.miss], ['최대 콤보', S.maxCombo]],
        qc: ['W3-1', 'W3-8'], playNotes: {},
        onRetry: newGame, onNext: null, onMenu: menu
      });
    }, 900);
  }
  function menu() {
    cancelAnimationFrame(raf); S = null; app.innerHTML = ''; cx = null;
    NA.ui.renderTags(GAME_ID);
    NA.ui.stageMenu({
      overlay: ov, gameId: GAME_ID, stages: [], onPick: function () {},
      howto: '상대가 보낸 <b>패킷</b>(흰 노트)과 내 앱의 <b>호출</b>(노란 노트)이 오른쪽에서 흘러온다. <b>노란 판정선</b>에 닿을 때 내 소켓이 보낼 답을 누른다.<br>' +
        '<span class="key">S</span> SYN · <span class="key">D</span> SYN+ACK · <span class="key">F</span> ACK · <span class="key">J</span> FIN · <span class="key">K</span> RST · <span class="key">Space</span> 안 보냄 (화면 버튼을 눌러도 된다)<br>' +
        '연결마다 서버·클라이언트가 번갈아 오고, 유령 ACK·닫힌 포트·중복 데이터·FIN 재전송 같은 사건이 무작위로 섞인다. 게이지가 바닥날 때까지 끝나지 않는다.',
      endless: { title: '비트 시작', desc: 'BPM 72에서 시작해 연결마다 조금씩 빨라진다(최대 126).', onPick: newGame }
    });
  }

  window.__game = { state: function () { return S; }, start: newGame, press: press, genSession: genSession,
    autoplay: function (acc) { if (!S) return; var n = S.notes.filter(function (n) { return !n.done && Math.abs(S.t - n.t) < .06; })[0]; if (!n) return; var k = n.st.expect; if (Math.random() > (acc == null ? 1 : acc)) k = k === 'ack' ? 'fin' : 'ack'; press(k); } };
  if (NA.wantsEndless()) { NA.ui.renderTags(GAME_ID); newGame(); } else menu();
})();
