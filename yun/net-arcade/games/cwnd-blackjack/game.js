/* 혼잡 제어 블랙잭 — Week 3 Quick Check W3-6(혼잡 제어 vs 흐름 제어), W3-2(UDP가 빠르다?), Week 1 W1-1(대역폭 vs 지연)
 *
 * 턴제(시간 제한 없음) + 카지노 연출.
 *   cwnd = 이번 라운드(한 RTT)에 거는 카드(패킷) 수
 *   DOUBLE = 슬로 스타트(×2), HIT = 혼잡 회피(+1), STAND = 그대로
 *   병목 = 파이프(P장, 보이지 않음) + 라우터 큐(Q장). 넘치면 BUST(손실) → cwnd 반토막(곱셈 감소)
 *   딱 파이프만큼 보내면 PERFECT PIPE 잭팟, 손실 없이 이어 가면 콤보 배율
 */
(function () {
  var GAME_ID = 'cwnd-blackjack';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));
  var MULT = [1, 1, 1.2, 1.5, 2, 2.5, 3];
  var MAXCARDS = 60;

  var STAGES = [
    { title: '슬로 스타트 테이블', desc: '1장에서 시작해 두 배씩. 처음 BUST가 나면 무슨 일이 생길까?', qc: ['W3-6'],
      rounds: 10, goal: 230, P: function () { return 40; }, Q: 8, ss: 64, rtt: 30, coach: true,
      brief: '여기는 <b>혼잡 제어 카지노</b>. 매 라운드(= 한 RTT) 보낼 패킷 수 <b>cwnd</b>만큼 카드를 건다.<br>' +
        '<b>DOUBLE</b> = 슬로 스타트(×2) · <b>HIT</b> = 혼잡 회피(+1) · <b>STAND</b> = 그대로<br>' +
        '네트워크 병목은 <b>파이프</b>(보이지 않음) + <b>라우터 큐</b>. 넘치면 패킷이 버려지는 <b>BUST</b>!<br>' +
        '손실 없이 이어 가면 <b>콤보 배율</b>이 오르고, 큐 없이 파이프를 딱 채우면 <b>PERFECT PIPE 잭팟</b>.<br>' +
        '목표: 10라운드 안에 칩 <b>230</b>개. 시간 제한은 없다.' },
    { title: 'AIMD 톱니', desc: '다른 사용자가 들어오고 나간다. 파이프가 줄었다 늘었다 한다.', qc: ['W3-6'],
      rounds: 16, goal: 320, P: function (r) { return r <= 6 ? 30 : r <= 11 ? 12 : 40; }, Q: 6, ss: 16, rtt: 30,
      brief: '이번엔 처음부터 <b>ssthresh(문턱) = 16</b>. 16장까지는 DOUBLE, 넘으면 HIT(+1)만 가능하다.<br>' +
        '중간에 다른 사용자가 같은 길을 쓰기 시작해 <b>파이프가 확 줄어든다</b>. 그러다 다시 넓어진다.<br>' +
        '손실 → 반토막, 다시 +1씩… 오른쪽 차트에 그려지는 <b>톱니(AIMD)</b>를 보자.<br>' +
        '<b>RTT가 늘면</b> 큐가 차는 중이라는 신호다. 그때 STAND하는 것도 전략이다.<br>목표: 16라운드, 칩 <b>320</b>.' },
    { title: '수신자가 막는다', desc: '수신자의 rwnd 카드가 공개된다. 진짜 병목은 누구일까?', qc: ['W3-6'],
      rounds: 12, goal: 300, P: function () { return 40; }, Q: 8, ss: 64, rtt: 30,
      rwnd: function (r) { return r <= 4 ? 24 : r <= 7 ? 8 : r <= 10 ? 24 : 12; },
      brief: '테이블에 <b>수신자의 rwnd 카드</b>가 펼쳐져 있다. 수신자 버퍼에 남은 칸이다.<br>' +
        '실제로 보내는 양 = <b>min(cwnd, rwnd)</b>. cwnd를 아무리 키워도 rwnd보다 많이 나가지 않는다.<br>' +
        '<b>흐름 제어(rwnd)는 수신자</b>를, <b>혼잡 제어(cwnd)는 네트워크</b>를 보호한다. 이번 판에서 누가 막고 있는지 보자.<br>목표: 12라운드, 칩 <b>300</b>.' },
    { title: 'UDP 난입', desc: '옆자리 UDP 플레이어는 연결도 없이, 줄이지도 않고 퍼붓는다.', qc: ['W3-2'],
      rounds: 12, goal: 240, P: function () { return 48; }, Q: 8, ss: 64, rtt: 30, udp: 20, hs: true,
      brief: '옆자리에 <b>UDP 플레이어</b>가 앉았다. 매 라운드 무조건 <b>20장</b>을 보낸다.<br>' +
        'TCP인 나는 먼저 <b>3-way handshake</b>로 연결부터 해야 한다(1라운드 소모, 데이터 0).<br>' +
        '같은 파이프를 나눠 쓰니 넘치면 둘 다 잃는다. UDP는 줄이지도, 다시 보내지도 않는다.<br>' +
        '"UDP가 빠르다"가 어떤 의미에서 맞고 틀린지 지켜보자. 목표: 12라운드, 칩 <b>240</b>.' },
    { title: '해외 테이블', desc: '대역폭은 같은데 RTT가 150ms. 파이프가 훨씬 길다.', qc: ['W1-1'],
      rounds: 12, goal: 1000, P: function () { return 200; }, Q: 12, ss: 1024, rtt: 150, far: true,
      brief: '이번 서버는 해외다. 대역폭은 테이블 1(국내)과 같은데 <b>RTT가 150ms</b>(국내 30ms의 5배).<br>' +
        '대역폭 × RTT = 길 위에 떠 있을 수 있는 양(<b>BDP</b>). RTT가 5배라 파이프도 5배, <b>40장 → 200장</b>이다.<br>' +
        '1장에서 시작하는 슬로 스타트로 이 파이프를 채우려면 라운드가 더 필요하고, 라운드 하나가 150ms다.<br>' +
        '오른쪽 위 <b>시계</b>를 보자. "1 Gbps면 빠르다"가 왜 틀린지 체감하게 된다. 목표: 12라운드, 칩 <b>1000</b>.' }
  ];

  var S = null;

  /* ------------------------------------------------------------ 효과음 */
  var SFX = {
    chip: function (i) { NA.sfx.tone(1700 + (i % 5) * 120, .035, 'square', .05); },
    deal: function () { NA.sfx.noise(.04, .06); },
    jackpot: function () { var n = [523, 659, 784, 1046, 1318, 1568, 2093]; for (var i = 0; i < n.length; i++) NA.sfx.tone(n[i], .12, 'square', .13, null, i * .06); NA.sfx.tone(2093, .5, 'triangle', .12, null, .45); },
    bust: function () { NA.sfx.boom(); var n = [400, 300, 220, 150]; for (var i = 0; i < n.length; i++) NA.sfx.tone(n[i], .16, 'sawtooth', .12, null, .1 + i * .1); },
    win: function () { NA.sfx.tone(660, .1, 'square', .12); NA.sfx.tone(990, .14, 'square', .12, null, .08); },
    warn: function () { NA.sfx.tone(880, .1, 'triangle', .12); NA.sfx.tone(700, .14, 'triangle', .1, null, .1); },
    up: function () { NA.sfx.tone(500, .06, 'square', .1, 1.8); }
  };

  /* ------------------------------------------------------------ 상태 */
  function newState(si, cfgIn) {
    var cfg = cfgIn || STAGES[si];
    return {
      si: si, cfg: cfg, round: 0, cwnd: 1, ss: cfg.ss, chips: 0, streak: 0, hist: [], last: null,
      busy: false, ms: 0, lastRtt: cfg.rtt, lastQ: 0, connected: !cfg.hs, seen: {}, msg: null,
      st: { busts: 0, timeouts: 0, perfects: 0, queues: 0, maxStreak: 0, rwndLimited: 0, udpSent: 0, udpLost: 0, myLost: 0, delivered: 0 }
    };
  }
  function ssLabel() { return S.cfg.ss >= 64 && S.ss === S.cfg.ss && !S.st.busts ? '∞ (아직 모름)' : String(S.ss); }
  function phase() { return S.cwnd < S.ss ? 'ss' : 'ca'; }
  function mult() { return MULT[Math.min(S.streak, MULT.length - 1)]; }
  function recommend() { if (!S.connected) return 'go'; return phase() === 'ss' ? 'double' : 'hit'; }

  /* ------------------------------------------------------------ 한 라운드 계산 */
  function resolve() {
    var cfg = S.cfg, r = S.round + 1;
    var P = cfg.P(r), Q = cfg.Q, room = P + Q;
    var rw = cfg.rwnd ? cfg.rwnd(r) : Infinity;
    var sent = Math.min(S.cwnd, rw), udp = cfg.udp || 0, total = sent + udp;
    var dropped = Math.max(0, total - room);
    var myDrop = total ? Math.round(dropped * sent / total) : 0, udpDrop = dropped - myDrop;
    var del = sent - myDrop, queue = Math.max(0, Math.min(total, room) - P);
    var res = { r: r, P: P, Q: Q, room: room, rwnd: rw, cwnd: S.cwnd, sent: sent, udp: udp, myDrop: myDrop, udpDrop: udpDrop, del: del, queue: queue, ss: S.ss };
    var m = mult(), gain;
    if (myDrop > 0) {
      res.type = sent > 2 * room ? 'timeout' : 'bust';
      gain = del - myDrop;
      S.streak = 0;
      S.ss = Math.max(2, Math.floor(S.cwnd / 2));
      S.cwnd = res.type === 'timeout' ? 1 : S.ss;
      S.st.busts++; if (res.type === 'timeout') S.st.timeouts++;
      S.st.myLost += myDrop;
    } else {
      res.type = total === P ? 'perfect' : queue > 0 ? 'queue' : 'ok';
      gain = Math.round(del * m) + (res.type === 'perfect' ? P : 0);
      if (res.type !== 'queue') S.streak++;
      if (res.type === 'perfect') S.st.perfects++;
      if (res.type === 'queue') S.st.queues++;
    }
    if (rw < Infinity && res.cwnd > rw && myDrop === 0) { res.rwLimited = true; S.st.rwndLimited++; }
    res.mult = m; res.gain = gain;
    S.st.maxStreak = Math.max(S.st.maxStreak, S.streak);
    S.st.delivered += del; S.st.udpSent += udp; S.st.udpLost += udpDrop;
    S.chips = Math.max(0, S.chips + gain);
    S.lastQ = queue; S.lastRtt = cfg.rtt + queue * 2; S.ms += S.lastRtt;
    res.nextCwnd = S.cwnd; res.nextSs = S.ss;
    S.round = r; S.hist.push(res); S.last = res;
    return res;
  }

  /* ------------------------------------------------------------ 행동 */
  function act(type) {
    if (!S || S.busy || S.over || S.lesson) return;
    if (!S.connected) { if (type === 'go') handshake(); return; }
    var before = S.cwnd;
    if (type === 'double') { if (phase() !== 'ss') return; S.cwnd *= 2; }
    else if (type === 'hit') S.cwnd += 1;
    else if (type !== 'stand') return;
    S.lastAct = type;
    if (S.cwnd !== before) SFX.up();
    S.busy = true;
    lockFlow = true; render(true); lockFlow = false;
    var res = resolve();
    animate(res);
  }

  function handshake() {
    S.busy = true; S.connected = true;
    var r = S.round + 1, udp = S.cfg.udp || 0, P = S.cfg.P(r);
    S.round = r; S.ms += S.cfg.rtt; S.st.udpSent += udp;
    var res = { r: r, hs: true, P: P, Q: S.cfg.Q, room: P + S.cfg.Q, sent: 0, udp: udp, myDrop: 0, udpDrop: 0, del: 0, queue: 0, cwnd: 0, ss: S.ss, type: 'hs', gain: 0, mult: 1, nextCwnd: 1, nextSs: S.ss };
    S.hist.push(res); S.last = res;
    render(true);
    animate(res);
  }

  /* ------------------------------------------------------------ 연출 */
  function animate(res) {
    var felt = app.querySelector('.felt'), table = app.querySelector('.table');
    felt.innerHTML = '';
    var n = res.sent + res.udp, scale = Math.max(1, Math.ceil(n / MAXCARDS));
    var cards = [], myCards = Math.ceil(res.sent / scale), udpCards = Math.ceil(res.udp / scale);
    // 순서: 내 카드와 UDP 카드를 섞어서 딜
    var seq = [];
    for (var i = 0; i < myCards; i++) seq.push('me');
    for (i = 0; i < udpCards; i++) seq.splice(Math.floor((i + .5) * (seq.length + 1) / (udpCards + 1)) + i, 0, 'udp');
    var okN = Math.ceil(Math.min(n, res.P) / scale), qN = Math.ceil(Math.max(0, Math.min(n, res.room) - res.P) / scale);
    if (res.hs) {
      ['SYN', 'SYN+ACK', 'ACK'].forEach(function (t, k) {
        var d = document.createElement('div'); d.className = 'pk deal';
        d.style.width = '70px'; d.style.animationDelay = (k * 220) + 'ms';
        d.innerHTML = '<div class="in"><div class="b"></div><div class="f" style="font-size:11px;color:#164577">' + t + '</div></div>';
        felt.appendChild(d); cards.push({ el: d, cls: 'ok' });
        setTimeout(SFX.deal, k * 220);
      });
    }
    seq.forEach(function (who, k) {
      var d = document.createElement('div');
      var cls = k < okN ? 'ok' : k < okN + qN ? 'q' : 'x';
      d.className = 'pk deal' + (who === 'udp' ? ' udp' : '');
      d.style.animationDelay = (k * 22 + (res.hs ? 700 : 0)) + 'ms';
      d.innerHTML = '<div class="in"><div class="b"></div><div class="f">' + (cls === 'ok' ? '✓' : cls === 'q' ? '⏳' : '✗') + '</div></div>';
      felt.appendChild(d); cards.push({ el: d, cls: cls });
    });
    if (scale > 1) { var m = document.createElement('div'); m.className = 'more'; m.textContent = '카드 1장 = 패킷 ' + scale + '개'; felt.appendChild(m); }
    var dealT = (res.hs ? 700 : 0) + seq.length * 22 + 320;
    for (var s = 0; s < Math.min(8, seq.length); s++) setTimeout(SFX.deal, s * 45);
    // 뒤집기
    setTimeout(function () {
      cards.forEach(function (c, k) {
        setTimeout(function () { c.el.classList.add('flip', c.cls); if (c.cls === 'x' && k % 3 === 0) NA.sfx.tone(160, .05, 'sawtooth', .05); }, k * 14);
      });
    }, dealT);
    var flipT = dealT + cards.length * 14 + 380;
    var me = S;
    setTimeout(function () { if (S === me) payoff(res, table); }, flipT);
    setTimeout(function () { if (S === me) finishRound(res); }, flipT + 1700);
  }

  function payoff(res, table) {
    // 파이프 그림 갱신
    var pipe = app.querySelector('.pipe');
    if (pipe) {
      var total = res.sent + res.udp, w = Math.min(100, total / res.room * 100);
      var cls = res.myDrop + res.udpDrop > 0 ? 'x' : res.queue > 0 ? 'q' : '';
      pipe.querySelector('.flow').className = 'flow ' + cls;
      pipe.querySelector('.flow').style.width = w + '%';
      pipe.querySelector('.lbl2').innerHTML = '이번 판 공개: 파이프 <b>' + res.P + '</b> + 큐 <b>' + res.Q + '</b> = 최대 ' + res.room + '장';
    }
    var b = app.querySelector('.banner');
    var head = '', sub = '', cls2 = '';
    if (res.type === 'hs') { head = 'CONNECTED'; sub = '3-way handshake 완료 · 데이터 0장 (UDP는 벌써 ' + res.udp + '장)'; cls2 = 'win'; SFX.win(); }
    else if (res.type === 'timeout') { head = 'TIMEOUT BUST'; sub = res.myDrop + '장 손실 · cwnd → 1부터 다시'; cls2 = 'timeout'; SFX.bust(); fx(table, 'red', true); }
    else if (res.type === 'bust') { head = 'BUST!'; sub = res.myDrop + '장 손실 · cwnd ' + res.cwnd + ' → ' + res.nextCwnd + ' (반토막)' + (res.sent + res.udp - res.room <= 2 ? ' · 아깝다! ' + (res.sent + res.udp - res.room) + '장 차이' : ''); cls2 = 'bust'; SFX.bust(); fx(table, 'red', true); }
    else if (res.type === 'perfect') { head = 'PERFECT PIPE!'; sub = '큐 없이 파이프 ' + res.P + '장을 딱 채웠다 · 잭팟 +' + res.P; cls2 = 'perfect'; SFX.jackpot(); fx(table, 'gold'); coins(table, 26); sparks(table, 40); }
    else if (res.type === 'queue') { head = 'QUEUE…'; sub = '손실은 없지만 라우터 큐에 ' + res.queue + '장 대기 · RTT +' + res.queue * 2 + 'ms · 콤보 정지'; cls2 = 'queue'; SFX.warn(); }
    else { head = res.mult > 1 ? 'COMBO ×' + res.mult : 'SAFE'; sub = res.del + '장 전달 · 파이프의 ' + Math.round((res.sent + res.udp) / res.P * 100) + '% 사용'; cls2 = 'win'; SFX.win(); if (res.mult >= 2) sparks(table, 24); }
    if (res.rwLimited && res.type !== 'bust') sub += ' · rwnd ' + res.rwnd + '에 막힘';
    b.className = 'banner ' + cls2; b.innerHTML = '<div class="h">' + head + '</div><div class="s">' + sub + '</div>';
    void b.offsetWidth; b.classList.add('show');
    if (res.gain) floatNum(table, res.gain);
    countUp(S.chips - res.gain, S.chips);
  }

  function finishRound(res) {
    S.busy = false;
    var lesson = lessonFor(res);
    if (S.round >= S.cfg.rounds) { render(); return endStage(); }
    if (lesson) { S.lesson = lesson; render(); return; }
    render();
  }

  function fx(table, color, shake) {
    var f = document.createElement('div'); f.className = 'flash ' + color; table.appendChild(f);
    setTimeout(function () { f.remove(); }, 1000);
    if (shake) { var st = document.getElementById('stage'); st.classList.remove('shake'); void st.offsetWidth; st.classList.add('shake'); }
  }
  function coins(table, n) {
    for (var i = 0; i < n; i++) {
      var c = document.createElement('div'); c.className = 'coin'; c.textContent = NA.pick(['🪙', '💰', '✨', '🪙']);
      c.style.left = NA.rand(2, 96) + '%'; c.style.animationDuration = NA.rand(1.2, 2.2) + 's'; c.style.animationDelay = NA.rand(0, .5) + 's';
      table.appendChild(c); (function (el) { setTimeout(function () { el.remove(); }, 3000); })(c);
    }
  }
  function sparks(table, n) {
    var r = table.getBoundingClientRect(), k = r.width / table.offsetWidth || 1;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('div'); s.className = 'spark';
      s.style.left = '50%'; s.style.top = '46%';
      s.style.background = NA.pick(['#ffd25a', '#ff7a00', '#5dffa0', '#ffffff', '#ff3d7f']);
      var a = Math.random() * Math.PI * 2, d = NA.rand(80, 260);
      s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      table.appendChild(s); (function (el) { setTimeout(function () { el.remove(); }, 900); })(s);
    }
    void k;
  }
  function floatNum(table, g) {
    var f = document.createElement('div'); f.className = 'floatnum' + (g < 0 ? ' neg' : '');
    f.textContent = (g > 0 ? '+' : '') + g + ' 🪙'; f.style.left = '44%'; f.style.top = '58%';
    table.appendChild(f); setTimeout(function () { f.remove(); }, 1300);
  }
  function countUp(from, to) {
    var el = app.querySelector('.chips .n'), box = app.querySelector('.chips'); if (!el) return;
    var steps = Math.min(30, Math.abs(to - from)), i = 0;
    if (!steps) return;
    box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
    var iv = setInterval(function () {
      i++; el.textContent = Math.round(from + (to - from) * i / steps);
      if (to > from && i % 2 === 0) SFX.chip(i);
      if (i >= steps) clearInterval(iv);
    }, 26);
    var g = app.querySelector('.goal .g i'); if (g) g.style.width = Math.min(100, to / S.cfg.goal * 100) + '%';
  }

  /* ------------------------------------------------------------ 처음 겪는 사건 해설 (자동 멈춤) */
  function lessonFor(res) {
    var c = S.cfg, L = null;
    function once(k, v) { if (S.seen[k]) return; S.seen[k] = 1; L = v; }
    if (res.type === 'hs') once('hs', { t: '연결만 했는데 1라운드가 지났다', b: 'TCP는 데이터를 보내기 전에 <b>3-way handshake</b>로 연결부터 맺는다. 그 사이 UDP는 연결 없이 벌써 <b>' + res.udp + '장</b>을 보냈다.<br>이게 "UDP가 빠르다"의 <b>맞는 의미</b>다: 시작 지연이 없다. 처리량이 더 크다는 뜻은 아니다.' });
    else if (res.type === 'timeout') once('timeout', { t: 'TIMEOUT BUST — 처음부터 다시', b: '한꺼번에 너무 많이 잃어서 ACK 흐름이 끊겼다. 송신자는 <b>타임아웃</b>으로 판단하고 cwnd를 <b>1</b>로 되돌려 슬로 스타트부터 다시 시작한다.<br>ssthresh는 손실 직전 cwnd의 절반(' + res.nextSs + ')으로 낮아진다.' });
    else if (res.type === 'bust') once('bust', { t: 'BUST! 손실 = 혼잡 신호', b: '라우터 큐(' + res.Q + '장)까지 꽉 차서 <b>' + res.myDrop + '장</b>이 버려졌다. TCP(Reno)는 이걸 "네트워크가 막혔다"는 신호로 본다(중복 ACK 3개로 손실을 알아챈 경우).<br>' +
      '→ cwnd를 <b>반으로</b>(' + res.cwnd + ' → ' + res.nextCwnd + ', 곱셈 감소), ssthresh도 그 값으로. 이제부터는 +1씩(가산 증가). 이 반복이 <b>AIMD 톱니</b>다.<br>' +
      '혼잡 제어가 지키는 대상은 <b>네트워크(병목 라우터의 큐)</b>다.' + (res.udpDrop ? '<br>UDP도 ' + res.udpDrop + '장을 잃었지만 줄이지도, 다시 보내지도 않는다.' : '') });
    else if (res.type === 'queue' && (S.si >= 1 || S.E || c.coach)) once('queue', { t: 'QUEUE — RTT가 늘었다', b: '손실은 없지만 파이프(' + res.P + '장)를 넘친 <b>' + res.queue + '장</b>이 라우터 큐에서 기다렸다. 그래서 RTT가 늘었다.<br>' +
      'Reno 같은 손실 기반 방식은 버려질 때까지 계속 늘린다. <b>지연 기반 방식(Vegas, BBR)</b>은 이렇게 RTT가 늘 때 멈춘다. 다음 라운드에 STAND하면 바로 그 전략이다.' });
    else if (res.type === 'perfect') once('perfect', { t: 'PERFECT PIPE — 이게 최적점', b: '큐를 하나도 쌓지 않고 파이프 ' + res.P + '장을 꽉 채웠다. 길 위에 떠 있을 수 있는 양 = <b>대역폭 × RTT (BDP)</b>.<br>이보다 적게 보내면 대역폭이 남고, 많이 보내면 큐가 찬다.' });
    else if (res.rwLimited) once('rwnd', { t: 'rwnd에 막혔다 — 이건 흐름 제어', b: 'cwnd는 ' + res.cwnd + '인데 수신자가 알려 준 rwnd가 <b>' + res.rwnd + '</b>라 그만큼만 보냈다. 실제 전송 = <b>min(cwnd, rwnd)</b>.<br>' +
      '<b>흐름 제어(rwnd)</b>는 수신자의 버퍼를, <b>혼잡 제어(cwnd)</b>는 네트워크를 보호한다. 지금 병목은 네트워크가 아니라 수신자라서 손실도 없다.' });
    return L;
  }

  /* ------------------------------------------------------------ 무한 카지노 */
  function R(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function genTable(lv) {
    var rtt = NA.pick(lv <= 1 ? [20, 30, 30] : [20, 30, 30, 50, 80, 150]), k = rtt / 30;
    var base1 = R(14, 36 + lv * 6), base2 = R(10, 36 + lv * 6), cut = R(3, 6);
    var p1 = Math.min(300, Math.round(base1 * k)), p2 = Math.min(300, Math.round(base2 * k));
    var t = { rounds: rtt >= 100 ? 10 : 8, Q: R(4, 12), rtt: rtt, ss: 64, tags: [] };
    if (lv >= 2 && Math.random() < .4) { t.P = function (r) { return r <= cut ? p1 : p2; }; t.tags.push(p2 < p1 ? '사용자 증가' : '사용자 감소'); }
    else t.P = function () { return p1; };
    if (rtt >= 100) { t.far = true; t.ss = 1024; t.tags.push('해외 서버'); }
    else if (lv >= 2 && Math.random() < .35) { t.ss = NA.pick([8, 16, 32]); t.tags.push('ssthresh ' + t.ss); }
    if (lv >= 3 && Math.random() < .3) { var a = R(6, 30), b = R(6, 30), j = R(3, 6); t.rwnd = function (r) { return r <= j ? a : b; }; t.tags.push('rwnd 공개'); }
    else if (lv >= 3 && Math.random() < .3) { t.udp = R(6, Math.max(8, Math.floor(p1 / 2))); t.hs = true; t.tags.push('UDP 난입'); }
    t.title = t.tags.length ? t.tags.join(' · ') : '평범한 테이블';
    t.desc = 'RTT ' + rtt + 'ms';
    t.qc = ['W3-6'];
    // 목표 = 정석(Reno: 문턱 전 DOUBLE, 뒤로 HIT) 플레이 칩 × 배율(레벨이 오를수록 정석에 가깝게)
    t.base = simulate(t);
    t.goal = Math.max(20, Math.round(t.base * Math.min(1, .75 + .05 * lv)));
    t.brief = '이번 테이블 조건: <b>RTT ' + rtt + 'ms</b>' + (t.far ? ' (파이프가 RTT에 비례해 길다)' : '') + ' · 라운드 <b>' + t.rounds + '</b> · 목표 칩 <b>' + t.goal + '</b><br>' +
      (t.ss < 64 ? '처음부터 <b>ssthresh = ' + t.ss + '</b>. 넘으면 HIT만 가능.<br>' : '') +
      (t.P(1) !== t.P(t.rounds) ? '중간에 <b>다른 사용자</b>가 들어오거나 나가서 파이프 크기가 바뀐다.<br>' : '') +
      (t.rwnd ? '수신자 <b>rwnd 카드</b>가 공개된다. 실제 전송 = min(cwnd, rwnd).<br>' : '') +
      (t.udp ? '옆자리 <b>UDP</b>가 매 라운드 ' + t.udp + '장을 퍼붓는다. 나는 handshake부터.<br>' : '') +
      '파이프와 큐 크기는 비밀. 목표에 못 미치면 ♥ −1, ♥ 3개가 다 떨어지면 폐장.';
    return t;
  }
  function simulate(cfg) {
    var save = S; S = newState(-1, cfg);
    for (var r = 0; r < cfg.rounds; r++) {
      if (!S.connected) { S.connected = true; S.round++; continue; }
      if (phase() === 'ss') S.cwnd *= 2; else S.cwnd += 1;
      resolve();
    }
    var c = S.chips; S = save; return c;
  }
  var E = null;
  function startEndless() {
    E = { lv: 0, hearts: 3, total: 0, cleared: 0, seen: {}, busts: 0, perfects: 0 };
    nextTable();
  }
  function nextTable() {
    E.lv++;
    var cfg = genTable(E.lv);
    S = newState(-1, cfg); S.E = E; S.seen = E.seen;
    NA.ui.briefing(ov, '∞ TABLE ' + E.lv + ' · ' + cfg.title, cfg.brief, function () { render(); });
  }
  function endTableEndless() {
    var win = S.chips >= S.cfg.goal, table = app.querySelector('.table'), b = app.querySelector('.banner'), c = S.cfg;
    E.total += S.chips; E.busts += S.st.busts; E.perfects += S.st.perfects;
    if (win) { E.cleared++; b.className = 'banner perfect'; b.innerHTML = '<div class="h">TABLE CLEAR</div><div class="s">칩 ' + S.chips + ' / 목표 ' + c.goal + '</div>'; SFX.jackpot(); coins(table, 30); fx(table, 'gold'); }
    else { E.hearts--; b.className = 'banner bust'; b.innerHTML = '<div class="h">목표 미달 ♥ −1</div><div class="s">칩 ' + S.chips + ' / 목표 ' + c.goal + '</div>'; NA.sfx.lose(); }
    void b.offsetWidth; b.classList.add('show');
    var ps = [], last = null;
    for (var r = 1; r <= c.rounds; r++) { var v = c.P(r); if (v !== last) { ps.push(r + '라운드부터 ' + v); last = v; } }
    var me = S;
    setTimeout(function () {
      if (S !== me) return;
      if (E.hearts <= 0) return endlessDebrief();
      NA.ui.briefing(ov, win ? 'TABLE ' + E.lv + ' 통과!' : 'TABLE ' + E.lv + ' 목표 미달 (♥ ' + E.hearts + ' 남음)',
        '이 테이블의 비밀: 파이프 <b>' + ps.join(' → ') + '</b>장 · 큐 <b>' + c.Q + '</b>장' + (c.far ? ' (RTT ' + c.rtt + 'ms라 파이프가 길었다)' : '') + '<br>' +
        '정석(Reno: 문턱 전 DOUBLE, 이후 HIT)이었다면 칩 <b>' + c.base + '</b>. 나는 <b>' + S.chips + '</b>.<br>' +
        '누적 칩 <b>' + E.total + '</b> · 통과 ' + E.cleared + '테이블. 다음 테이블은 조건이 더 까다로워질 수 있다.', nextTable);
    }, 2000);
  }
  function endlessDebrief() {
    var stars = E.cleared >= 10 ? 3 : E.cleared >= 5 ? 2 : E.cleared >= 2 ? 1 : 0;
    NA.ui.debrief({
      overlay: ov, gameId: GAME_ID, endless: true, win: false, stars: stars, score: E.total,
      title: '카지노 폐장', sub: '테이블 ' + E.lv + '개 · 통과 ' + E.cleared + ' · ★는 통과 2/5/10테이블에서',
      stats: [['누적 칩', E.total], ['통과 테이블', E.cleared], ['BUST', E.busts], ['PERFECT', E.perfects]],
      qc: ['W3-6', 'W3-2', 'W1-1'], playNotes: {},
      onRetry: startEndless, onNext: null, onMenu: menu
    });
  }

  /* ------------------------------------------------------------ 시작/끝 */
  function startStage(si) {
    S = newState(si);
    NA.ui.briefing(ov, 'TABLE ' + (si + 1) + ' · ' + S.cfg.title, S.cfg.brief, function () { render(); });
  }
  function endStage() {
    S.over = true;
    if (S.E) return endTableEndless();
    var win = S.chips >= S.cfg.goal, table = app.querySelector('.table');
    var stars = !win ? 0 : S.chips >= S.cfg.goal * 1.3 ? 3 : S.chips >= S.cfg.goal * 1.1 ? 2 : 1;
    var b = app.querySelector('.banner');
    if (win) { b.className = 'banner perfect'; b.innerHTML = '<div class="h">JACKPOT!</div><div class="s">칩 ' + S.chips + ' / 목표 ' + S.cfg.goal + '</div>'; SFX.jackpot(); setTimeout(SFX.jackpot, 500); coins(table, 50); sparks(table, 60); fx(table, 'gold'); }
    else { b.className = 'banner bust'; b.innerHTML = '<div class="h">TABLE OVER</div><div class="s">칩 ' + S.chips + ' / 목표 ' + S.cfg.goal + '</div>'; NA.sfx.lose(); }
    void b.offsetWidth; b.classList.add('show');
    var st = S.st;
    var farNote = S.cfg.far ? ' 총 ' + S.ms + 'ms가 걸렸다. 같은 라운드를 국내(30ms)에서 했다면 약 ' + (S.round * 30) + 'ms.' : '';
    var notes = {
      'W3-6': 'BUST ' + st.busts + '번마다 cwnd가 반토막 났다(혼잡 제어 = 네트워크 보호).' + (st.rwndLimited ? ' rwnd에 막힌 라운드 ' + st.rwndLimited + '번은 손실 없이 수신자 버퍼를 지킨 흐름 제어였다.' : ''),
      'W3-2': 'UDP는 handshake 없이 첫 라운드부터 보냈다(지연 측면에서 빠름). 하지만 ' + st.udpSent + '장 중 ' + st.udpLost + '장을 잃고도 줄이거나 다시 보내지 않았다(신뢰성·혼잡 제어는 앱 몫).',
      'W1-1': '대역폭이 같아도 RTT 150ms라 라운드 하나가 5배 길었고, 1장에서 시작하는 슬로 스타트로 긴 파이프를 채우는 데 라운드가 더 들었다.' + farNote
    };
    var me = S;
    setTimeout(function () {
      if (S !== me) return;
      NA.ui.debrief({
        overlay: ov, gameId: GAME_ID, stage: S.si, win: win, stars: stars, score: S.chips,
        title: win ? 'JACKPOT! 테이블 클리어' : '목표 칩 미달',
        sub: '칩 ' + S.chips + ' / 목표 ' + S.cfg.goal + ' · 최대 콤보 ' + st.maxStreak + (S.cfg.far ? ' · 걸린 시간 ' + S.ms + 'ms' : ''),
        stats: [['칩', S.chips], ['BUST', st.busts], ['PERFECT', st.perfects], ['큐 대기', st.queues], ['최대 콤보', st.maxStreak], ['전달 패킷', st.delivered]],
        qc: S.cfg.qc, playNotes: notes,
        onRetry: function () { startStage(S.si); },
        onNext: S.si + 1 < STAGES.length ? function () { startStage(S.si + 1); } : null,
        onMenu: menu
      });
    }, 2400);
  }
  function menu() {
    S = null; E = null; app.innerHTML = '';
    NA.ui.renderTags(GAME_ID);
    NA.ui.stageMenu({
      overlay: ov, gameId: GAME_ID, stages: STAGES, onPick: startStage,
      endless: { title: '무한 카지노', desc: '테이블마다 RTT·파이프·사용자·UDP가 무작위. 목표 미달 3번이면 폐장.', onPick: startEndless },
      howto: '매 라운드(= RTT) 보낼 카드 수 <b>cwnd</b>를 정한다. <b>DOUBLE</b>(슬로 스타트 ×2) · <b>HIT</b>(+1) · <b>STAND</b>(그대로)<br>' +
        '숨은 파이프 + 큐를 넘치면 <b>BUST</b> → cwnd 반토막. 큐 없이 딱 채우면 <b>PERFECT PIPE</b>. 손실 없이 이어 가면 <b>콤보 ×3</b>까지.<br>시간 제한 없음. 단축키 <span class="key">D</span> <span class="key">H</span> <span class="key">S</span>'
    });
  }

  /* ------------------------------------------------------------ 렌더 */
  function coachText() {
    var c = S.cfg, ph = phase();
    if (!S.connected) return '먼저 <b>연결</b>(3-way handshake)을 해야 데이터를 보낼 수 있다. 그동안 UDP는 이미 보내고 있다.';
    if (c.coach && S.round === 0) return '지금 cwnd는 <b>1장</b>. 슬로 스타트에서는 ACK가 돌아올 때마다 늘어서 라운드마다 <b>두 배</b>가 된다. <b>DOUBLE</b>을 눌러 보자!';
    if (S.last && S.last.type === 'bust') return '손실 후 cwnd = ' + S.cwnd + ', ssthresh = ' + S.ss + '. 이제 문턱 위라 <b>HIT(+1)</b>로 조심스럽게 늘리는 게 정석(혼잡 회피).';
    if (S.last && S.last.type === 'queue') return 'RTT가 <b>' + S.lastRtt + 'ms</b>로 늘었다 = 큐가 차는 중. 더 키우면 BUST 위험! <b>STAND</b>로 버티면 지연 기반(BBR식), <b>HIT</b>로 밀면 손실 기반(Reno식).';
    if (S.last && S.last.rwLimited) return '수신자 rwnd(<b>' + S.last.rwnd + '</b>)가 막고 있다. cwnd를 키워도 더 나가지 않는다. 지금 병목은 수신자다.';
    if (ph === 'ss') return 'cwnd ' + S.cwnd + ' < ssthresh ' + ssLabel() + ' → 아직 <b>슬로 스타트</b>. 정석은 DOUBLE. 파이프 크기는 BUST가 나야 드러난다.';
    return 'cwnd ' + S.cwnd + ' ≥ ssthresh ' + S.ss + ' → <b>혼잡 회피</b>. 정석은 HIT(+1). RTT를 보며 STAND로 버틸 수도 있다.';
  }

  function chartSVG() {
    var H = S.hist, W = 276, Hh = 150, n = S.cfg.rounds;
    var maxV = 8;
    H.forEach(function (h) { maxV = Math.max(maxV, h.cwnd, h.room || 0, h.ss < 200 ? h.ss : 0); });
    maxV = Math.max(maxV, S.cwnd) * 1.1;
    var bw = W / n, y = function (v) { return Hh - 14 - v / maxV * (Hh - 24); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '">';
    s += '<line x1="0" y1="' + (Hh - 14) + '" x2="' + W + '" y2="' + (Hh - 14) + '" stroke="#7a2a3a"/>';
    H.forEach(function (h, i) {
      if (h.hs) { s += '<text x="' + (i * bw + bw / 2) + '" y="' + (Hh - 18) + '" fill="#4de2ff" font-size="8" text-anchor="middle">HS</text>'; return; }
      var x = i * bw + 2, top = y(h.cwnd), col = h.type === 'bust' || h.type === 'timeout' ? '#ff3d3d' : h.cwnd < h.ss ? '#5dffa0' : '#4de2ff';
      s += '<rect x="' + x + '" y="' + top + '" width="' + (bw - 4) + '" height="' + (Hh - 14 - top) + '" fill="' + col + '" opacity=".85"/>';
      s += '<line x1="' + (i * bw) + '" y1="' + y(h.room) + '" x2="' + ((i + 1) * bw) + '" y2="' + y(h.room) + '" stroke="#ffd25a" stroke-width="2" stroke-dasharray="3 2"/>';
      if (h.type === 'bust' || h.type === 'timeout') s += '<text x="' + (x + (bw - 4) / 2) + '" y="' + (top - 3) + '" fill="#ff3d3d" font-size="11" text-anchor="middle">✗</text>';
      if (h.type === 'perfect') s += '<text x="' + (x + (bw - 4) / 2) + '" y="' + (top - 3) + '" fill="#ffd25a" font-size="10" text-anchor="middle">★</text>';
    });
    s += '<text x="2" y="' + (Hh - 2) + '" fill="#e9a9b5" font-size="9">라운드 →</text>';
    s += '<text x="' + (W - 2) + '" y="' + (Hh - 2) + '" fill="#ffd25a" font-size="9" text-anchor="end">- - 공개된 한계(파이프+큐)</text>';
    return s + '</svg>';
  }

  function render(lock) {
    if (!S) return;
    var c = S.cfg, ph = phase(), rec = recommend(), dis = lock || S.busy || S.over || S.lesson;
    var eh = ''; if (S.E) { for (var hi = 0; hi < 3; hi++) eh += hi < S.E.hearts ? '♥' : '<i>♥</i>'; }
    var html = '<div class="bar"><span class="st">' + (S.E ? '∞ TABLE ' + S.E.lv : 'TABLE ' + (S.si + 1)) + '<small>' + esc(c.title) + '</small></span>' +
      (S.E ? '<span class="ehearts">' + eh + '</span>' : '') +
      '<span class="round">ROUND <b>' + Math.min(S.round + 1, c.rounds) + '</b> / ' + c.rounds + '</span>' +
      '<div class="combo' + (S.streak >= 2 ? ' hot' : '') + '">' + (S.streak >= 2 ? '🔥 ×' + mult() : 'COMBO ×' + mult()) + '</div>' +
      '<span class="sp"></span>' +
      '<div class="goal"><div class="l"><span>목표</span><span>' + S.chips + ' / ' + c.goal + '</span></div><div class="g"><i style="width:' + Math.min(100, S.chips / c.goal * 100) + '%"></i></div></div>' +
      '<div class="chips"><span class="ic">🪙</span><span class="n">' + S.chips + '</span></div>' +
      '<button class="na-btn" data-guide>규칙</button></div>';
    html += '<div class="layout">';

    // 왼쪽: 내 손
    html += '<div class="col"><div class="pane hand"><h3><span>내 베팅 (cwnd)</span><span>' + (S.connected ? '' : '연결 전') + '</span></h3>' +
      '<div class="big"><span class="cw' + (S.lastAct && lock ? ' up' : '') + '">' + (S.connected ? S.cwnd : 0) + '</span><span class="unit">장 / RTT<br>ssthresh ' + ssLabel() + '</span></div>' +
      '<span class="phase ' + ph + '">' + (ph === 'ss' ? 'SLOW START · ×2 가능' : '혼잡 회피 · +1씩') + '</span>' +
      '<div class="ssbar">cwnd와 문턱(ssthresh)<div class="track"><div class="fill" style="width:' + Math.min(100, S.cwnd / Math.max(S.ss, S.cwnd) * 100) + '%"></div><div class="mark" style="left:calc(' + Math.min(100, S.ss / Math.max(S.ss, S.cwnd) * 100) + '% - 2px)"></div></div></div></div>';
    html += '<div class="acts">';
    if (!S.connected) html += btn('go', 'CONNECT', '3-way handshake (1라운드, 데이터 0)', 'Enter', dis, rec);
    else {
      html += btn('double', 'DOUBLE ×2', ph === 'ss' ? '슬로 스타트: ' + S.cwnd + ' → ' + S.cwnd * 2 : '문턱 위에서는 잠김', 'D', dis || ph !== 'ss', rec);
      html += btn('hit', 'HIT +1', '혼잡 회피: ' + S.cwnd + ' → ' + (S.cwnd + 1), 'H', dis, rec);
      html += btn('stand', 'STAND', '그대로 ' + S.cwnd + '장', 'S', dis, rec);
    }
    html += '</div>';
    if (c.rwnd) { var rw = c.rwnd(S.round + 1); html += '<div class="pane"><h3><span>수신자 카드 (공개)</span></h3><div class="side-card"><div class="pcard"><span class="v">' + rw + '</span><span class="s">rwnd</span></div><div class="txt">수신자 버퍼 빈 칸. 이번 라운드 실제 전송 = <b>min(' + S.cwnd + ', ' + rw + ') = ' + Math.min(S.cwnd, rw) + '</b></div></div></div>'; }
    if (c.udp) html += '<div class="pane"><h3><span>옆자리: UDP 플레이어</span></h3><div class="side-card"><div class="pcard udp"><span class="v">' + c.udp + '</span><span class="s">UDP</span></div><div class="txt">연결 없이 매 라운드 <b>' + c.udp + '장</b> 고정. 지금까지 ' + S.st.udpSent + '장 중 <b>' + S.st.udpLost + '장 손실</b>, 재전송 0.</div></div></div>';
    html += '</div>';

    // 가운데: 테이블
    var last = S.last;
    html += '<div class="table"><div class="arc">◆ CONGESTION CONTROL CASINO ◆ 파이프 + 큐를 넘기면 BUST ◆</div>' +
      '<div class="lane"><div class="node"><span class="ico">🧑‍💻</span>나 (송신자)</div>' +
      '<div class="pipe"><div class="lbl">병목 링크 · 라우터 큐</div><div class="tube"><div class="flow' + flowCls() + '" style="width:' + flowW() + '%"></div></div><div class="lbl2">' + (last && !last.hs ? '지난 판: 파이프 ' + last.P + ' + 큐 ' + last.Q : '파이프 크기는 비밀 · BUST가 나면 드러난다') + '</div></div>' +
      '<div class="node"><span class="ico">🖥️</span>수신자</div></div>' +
      '<div class="felt"></div>' +
      '<div class="dealer">' + dealerLine() + '</div>' +
      '<div class="banner"></div></div>';

    // 오른쪽
    html += '<div class="col"><div class="pane chart"><h3><span>cwnd 기록 (톱니)</span><span>' + S.round + '라운드</span></h3>' + chartSVG() + '</div>';
    html += '<div class="pane meter"><h3><span>' + (c.far ? '해외 서버 · 시계' : '지연 신호 (RTT)') + '</span><span>' + (c.far ? '⏱ ' + S.ms + 'ms' : '') + '</span></h3>' +
      '<span class="rtt' + (S.lastQ ? ' hi' : '') + '">' + S.lastRtt + 'ms</span> 기본 ' + c.rtt + 'ms' + (S.lastQ ? ' + 큐 대기 ' + S.lastQ * 2 + 'ms' : '') +
      '<div class="qbar"><i style="width:' + Math.min(100, S.lastQ / c.Q * 100) + '%"></i></div>' + (c.far ? '<div style="margin-top:4px">국내(30ms)였다면 지금까지 ' + S.round * 30 + 'ms</div>' : '') + '</div>';
    html += '<div class="pane talk"><span class="who">🎩 딜러의 귀띔</span>' + coachText() + '</div>';
    html += '</div></div>';
    if (S.lesson) html += '<div class="lesson"><div class="box"><h2>' + S.lesson.t + '</h2><p>' + S.lesson.b + '</p><div class="na-row"><button class="na-btn primary" data-lesson>계속 (Enter)</button></div></div></div>';
    app.innerHTML = html;
    bind();
  }
  function flowW() { var l = S.last; if (!l || l.hs || lockFlow) return 0; return Math.min(100, (l.sent + l.udp) / l.room * 100); }
  function flowCls() { var l = S.last; if (!l || l.hs) return ''; return l.myDrop + l.udpDrop > 0 ? ' x' : l.queue > 0 ? ' q' : ''; }
  var lockFlow = false;
  function btn(k, t, d, key, disabled, rec) {
    return '<button class="act ' + k + (rec === k && !disabled ? ' rec' : '') + '" data-act="' + k + '"' + (disabled ? ' disabled' : '') + '><span class="k">' + key + '</span><span class="t">' + t + '</span><span class="d">' + d + '</span></button>';
  }
  function dealerLine() {
    var l = S.last;
    if (!l) return '카드를 걸어라. 이번 라운드에 <b>' + (S.connected ? S.cwnd : 0) + '장</b>을 보낼 차례.';
    if (l.hs) return '연결 완료. 이제 데이터를 걸 수 있다.';
    var s = '지난 판: ' + l.sent + '장 보냄' + (l.udp ? ' + UDP ' + l.udp + '장' : '') + ' → ';
    if (l.type === 'bust' || l.type === 'timeout') s += '<b>' + l.myDrop + '장 손실</b>, cwnd ' + l.cwnd + ' → ' + l.nextCwnd;
    else if (l.type === 'perfect') s += '<b>PERFECT</b> 잭팟 +' + l.P;
    else if (l.type === 'queue') s += '전부 도착했지만 큐에 ' + l.queue + '장 대기';
    else s += '전부 도착, <b>+' + l.gain + '</b> 칩 (×' + l.mult + ')';
    return s;
  }

  function guide() {
    ov.innerHTML = '<div class="na-card guide"><h2>혼잡 제어 블랙잭 규칙</h2>' +
      '<h4>베팅 = cwnd</h4><p>한 라운드는 한 RTT. cwnd장의 패킷을 보낸다. <b>DOUBLE</b>(×2)은 cwnd &lt; ssthresh일 때만(슬로 스타트), <b>HIT</b>(+1)은 언제나(혼잡 회피), <b>STAND</b>는 그대로.</p>' +
      '<h4>숨은 병목</h4><p>파이프(P장)까지는 바로 전달, 넘친 만큼은 라우터 큐(Q장)에서 기다리며 RTT가 늘어난다. P+Q를 넘으면 그 초과분이 버려진다(BUST).</p>' +
      '<h4>BUST 후</h4><ul><li>보통 손실: ssthresh = cwnd/2, cwnd = ssthresh (곱셈 감소, TCP Reno 빠른 복구)</li><li>보낸 양이 한계의 두 배를 넘으면 타임아웃: cwnd = 1부터 슬로 스타트 다시</li></ul>' +
      '<h4>칩</h4><p>전달한 패킷 × 콤보 배율(연속 무손실, 최대 ×3). 큐가 생기면 콤보가 멈추고, BUST면 배율 초기화 + 잃은 만큼 차감. 큐 없이 파이프를 딱 채우면 <b>PERFECT PIPE</b>(+P).</p>' +
      '<p>단축키: <span class="key">D</span> DOUBLE · <span class="key">H</span> HIT · <span class="key">S</span> STAND · <span class="key">Enter</span> 연결/계속</p>' +
      '<div class="na-row"><button class="na-btn primary" data-close>닫기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-close]').onclick = function () { ov.hidden = true; };
  }

  function bind() {
    app.querySelectorAll('[data-act]').forEach(function (b) { b.onclick = function () { act(b.dataset.act); }; });
    var g = app.querySelector('[data-guide]'); if (g) g.onclick = guide;
    var l = app.querySelector('[data-lesson]'); if (l) l.onclick = closeLesson;
  }
  function closeLesson() { S.lesson = null; render(); }

  document.addEventListener('keydown', function (e) {
    if (!S || S.over || !ov.hidden) return;
    NA.sfx.unlock();
    var k = e.key.toLowerCase();
    if (S.lesson) { if (k === 'enter' || k === ' ') { e.preventDefault(); closeLesson(); } return; }
    if (k === 'd') act('double'); else if (k === 'h') act('hit'); else if (k === 's') act('stand');
    else if (k === 'enter' && !S.connected) { e.preventDefault(); act('go'); }
  });
  document.addEventListener('pointerdown', function () { NA.sfx.unlock(); });

  window.__game = { state: function () { return S; }, endless: startEndless, E: function () { return E; }, start: startStage, act: act, rec: recommend, closeLesson: closeLesson };
  if (NA.wantsEndless()) { NA.ui.renderTags(GAME_ID); startEndless(); } else menu();
})();
