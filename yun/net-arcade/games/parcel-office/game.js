/* 택배 발송 사무소 — Week 3 Quick Check W3-7(중복 ACK·빠른 재전송), W3-10(RTT부터 재기), W3-6(흐름 제어)
 *
 * 여유 있는 실시간. 언제든 일시정지(Space)와 속도 조절(0.5× / 1× / 2×).
 * 나는 송신자. 택배(세그먼트)를 보내면 장부(송신 윈도우)에 모래시계(RTO)가 올라간다.
 * 네트워크는 안개 속이라 분실이 보이지 않는다. 오직 영수증(ACK)과 모래시계로 판단한다.
 *   - 영수증을 처리하면 그 번호 앞까지의 택배가 한꺼번에 확인된다 (누적 ACK)
 *   - 중복 영수증 3장(같은 번호가 3번 더) → 모래시계를 기다리지 말고 재발송 (빠른 재전송)
 *   - 모래시계가 다 되면 재발송 (타임아웃)
 */
(function () {
  var GAME_ID = 'parcel-office';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));
  var GRACE = 12;          // 모래시계가 다 된 뒤 재발송을 미룰 수 있는 시간
  var LEN = 100;

  var STAGES = [
    { title: '하나 보내고 기다리기', desc: 'Stop-and-Wait. 영수증이 와야 다음 택배를 보낸다. 왕복 시간(RTT)을 재 보자.', qc: ['W3-10'],
      n: 3, win: 1, rtt: [6], rto: 15, loss: [], ackLoss: [], coach: true,
      brief: '나는 택배 사무소, 곧 <b>송신자</b>다. 택배 = 세그먼트, 영수증 = ACK.<br>' +
        '택배를 보내면 <b>발송 장부</b>에 그 택배의 <b>모래시계(RTO)</b>가 올라간다. 영수증이 오기 전에 모래만 다 떨어지면 다시 보내야 한다.<br>' +
        '가운데 길의 <b>안개</b>가 네트워크다. 안에서 무슨 일이 생기는지는 보이지 않는다.<br>' +
        '시간이 흐르지만 넉넉하다. 언제든 <span class="key">Space</span>로 멈추고 생각해도 된다.' },
    { title: '장부 4칸', desc: '영수증을 기다리지 않고 4개까지 연달아 보낸다. 영수증 하나가 사라져도 괜찮을까?', qc: ['W3-7'],
      n: 8, win: 4, rtt: [6], rto: 15, loss: [], ackLoss: [2],
      brief: '이제 장부가 <b>4칸</b>이다. 영수증을 기다리지 않고 4개까지 연달아 보낼 수 있다(<b>슬라이딩 윈도우</b>).<br>' +
        '영수증에는 "다음에 보내 줄 번호"만 적혀 있다(<b>누적 ACK</b>). ACK 501이면 500번 바이트까지 전부 잘 받았다는 뜻.<br>' +
        '그래서 영수증 한 장이 길에서 사라져도, 다음 영수증이 앞의 것까지 한꺼번에 확인해 준다.' },
    { title: '분실 사고', desc: '택배가 안개 속에서 사라진다. 중복 영수증이 3장 모이면?', qc: ['W3-7'],
      n: 10, win: 5, rtt: [6], rto: 20, loss: [2, 6], ackLoss: [],
      brief: '이번엔 택배가 <b>사라진다</b>. 하지만 안개 때문에 직접 볼 수 없다.<br>' +
        '수신자는 빠진 번호부터 다시 달라고 <b>같은 번호 영수증</b>을 계속 보낸다(중복 ACK).<br>' +
        '같은 번호가 또 온 <b>중복 영수증이 3장</b> 모이면(처음 것까지 같은 번호 4장) 그 번호 택배가 분실됐다고 본다. 모래시계(20초)를 기다리지 말고 <b>바로 재발송</b>하자(<b>빠른 재전송</b>).<br>' +
        '멀쩡한 택배를 괜히 다시 보내면 헛발송이다.' },
    { title: '모래시계 고르기', desc: '노선이 국내에서 해외로 바뀐다. 모래시계(RTO)는 몇 초가 좋을까?', qc: ['W3-10'],
      n: 10, win: 4, rtt: [4, 4, 4, 4, 4, 10, 10, 10, 10, 10], rto: 6, rtoChoices: [6, 13, 24], loss: [7], ackLoss: [], routeChangeAt: 5,
      brief: '모래시계 길이(<b>RTO</b>)를 직접 고른다: <b>6초 / 13초 / 24초</b>. 발송대에서 언제든 바꿀 수 있다.<br>' +
        '<b>너무 짧으면</b>: 영수증이 오는 중인데 모래가 다 떨어져서 멀쩡한 택배를 또 보낸다(헛발송).<br>' +
        '<b>너무 길면</b>: 진짜 분실됐을 때 한참 기다린다.<br>' +
        '오른쪽 아래 <b>RTT 기록</b>을 보자. 모래시계는 평균 RTT보다 넉넉하게(약 1.5~2배). 중간에 <b>노선이 해외로 바뀐다</b>.' },
    { title: '수신 창고가 가득', desc: '창고가 3칸뿐이고 가끔 정리가 멈춘다. 영수증의 "빈 칸"을 지켜라.', qc: ['W3-6'],
      n: 10, win: 6, rtt: [6], rto: 18, loss: [], ackLoss: [], cap: 3, appRead: 3, appPause: [[8, 22], [36, 48]],
      brief: '수신자의 <b>창고(수신 버퍼)</b>가 3칸뿐이다. 창고 직원(앱)이 3초마다 하나씩 정리하는데 가끔 쉰다.<br>' +
        '영수증에 <b>창고 빈 칸(rwnd)</b>이 적혀 온다. 장부는 6칸이지만, <b>확인 대기 택배 수가 rwnd를 넘으면 안 된다</b>.<br>' +
        '넘치게 보내면 창고 앞에서 버려진다. 빈 칸이 0이면 기다리자. 창고가 비면 수신자가 <b>창고 업데이트 영수증</b>을 보내 준다.' }
  ];

  var S = null, raf = 0, last = 0;

  /* ------------------------------------------------------------ 상태 */
  function newState(si, cfgIn) {
    var cfg = cfgIn || STAGES[si], P = [];
    for (var i = 0; i < cfg.n; i++) P.push({ i: i, seq: 1 + i * LEN, state: 'wait', sentAt: 0, rtoLeft: 0, retx: 0, suspect: false });
    return {
      si: si, cfg: cfg, P: P, n: cfg.n, total: 1 + cfg.n * LEN, t: 0, speed: 1, paused: true,
      next: 0, rto: cfg.rto, road: [], inbox: [], lastAck: 1, dup: 0, rwnd: cfg.cap || null,
      R: { got: {}, buf: [], lastAdv: cfg.cap || 0, appCd: cfg.appRead || 0, ackLostDone: {} },
      hearts: 5, score: 0, rtts: [], fb: null, over: false, routeNoted: false, rid: 0,
      st: { fr: 0, rto: 0, waste: 0, neglect: 0, overflow: 0, saved: 0, lucky: 0, processed: 0, dupSeen: 0 }
    };
  }
  /* 처음 겪는 중요한 사건에서는 자동으로 멈춰서 읽을 시간을 준다 */
  function autoPause(key) {
    S.firsts = S.firsts || {};
    if (S.firsts[key]) return '';
    S.firsts[key] = 1; S.paused = true;
    return '<br><span style="color:var(--dim)">(처음이라 잠시 멈췄다. 읽고 나서 Space 또는 ▶로 계속)</span>';
  }
  function seqOf(i) { return i < S.n ? S.P[i].seq : S.total; }
  function idxOfSeq(v) { return v >= S.total ? S.n : Math.floor((v - 1) / LEN); }
  function outstanding() { return S.P.filter(function (p) { return p.state === 'out' || p.state === 'timeout'; }); }
  function rttOf(i) { var a = S.cfg.rtt; return a[Math.min(i, a.length - 1)]; }
  function oneWay(i) { return rttOf(i) / 2 * NA.rand(.9, 1.1); }
  function inPause() { return (S.cfg.appPause || []).some(function (r) { return S.t >= r[0] && S.t < r[1]; }); }

  /* ------------------------------------------------------------ 송신 */
  function transmit(i, retx) {
    var p = S.P[i];
    p.state = 'out'; p.sentAt = S.t; p.rtoLeft = S.rto; p.suspect = false;
    if (retx) p.retx++;
    var lost = !retx && S.cfg.loss.indexOf(i) >= 0;
    var d = oneWay(i);
    S.road.push({ k: 'p', i: i, t0: S.t, t1: S.t + d, lost: lost, lostAt: NA.rand(.42, .58), retx: retx });
    NA.sfx.send();
  }

  function sendNext() {
    if (S.over || S.next >= S.n) return;
    if (outstanding().length >= S.cfg.win) { S.fb = { cls: 'no', title: '장부가 꽉 찼다', body: '장부 ' + S.cfg.win + '칸이 모두 확인 대기 중이다. 영수증을 처리해서 칸을 비워야 다음 택배를 보낼 수 있다.' }; render(); return; }
    if (S.cfg.cap != null && S.rwnd != null && outstanding().length >= S.rwnd) {
      S.fb = { cls: 'no', title: '창고 빈 칸을 넘겼다', body: '마지막 영수증의 창고 빈 칸(rwnd)은 <b>' + S.rwnd + '</b>인데 이미 ' + outstanding().length + '개가 확인 대기 중이다. 이 택배는 창고 앞에서 버려질 수 있다.' };
    }
    if (S.paused && S.si === 0) S.paused = false;
    transmit(S.next, false); S.next++;
    if (S.cfg.routeChangeAt != null && S.next - 1 === S.cfg.routeChangeAt && !S.routeNoted) {
      S.routeNoted = true;
      S.fb = { cls: 'info', title: '노선 변경: 해외 경유', body: '지금부터 보내는 택배는 해외를 거친다. 왕복 시간이 길어질 것이다. <b>RTT 기록</b>을 지켜보고 모래시계 길이를 다시 생각하자.' + autoPause('route') };
    }
    render();
  }

  function resend(i) {
    var p = S.P[i]; if (!p || p.state === 'done' || p.state === 'wait' || S.over) return;
    var delivered = !!S.R.got[i];
    var inFlight = S.road.some(function (r) { return r.k === 'p' && r.i === i && !r.lost; });
    var wasted = delivered || inFlight;
    if (p.suspect && S.dup >= 3 && !wasted) {
      S.st.fr++; S.st.saved += Math.max(0, p.rtoLeft); S.score += 300;
      S.fb = { cls: 'ok', title: '빠른 재전송 성공!', body: '중복 영수증 3장을 보고 seq ' + p.seq + '을 바로 다시 보냈다. 모래시계는 아직 <b>' + Math.max(0, p.rtoLeft).toFixed(1) + '초</b> 남아 있었다. 그만큼 빨리 복구한다.' };
      NA.sfx.perfect();
    } else if (p.state === 'timeout' && !wasted) {
      S.st.rto++; S.score += 100;
      S.fb = { cls: 'ok', title: '타임아웃 재전송', body: '모래시계가 다 될 때까지 영수증이 오지 않아 다시 보냈다. 실제로 분실된 택배였다.' + (S.si === 2 ? ' 중복 영수증 3장이 먼저 모였다면 더 빨리 보낼 수 있었다.' : '') };
      NA.sfx.good();
    } else if (!wasted) {
      S.st.lucky++; S.score += 50;
      S.fb = { cls: 'info', title: '감으로 다시 보냈다', body: '실제로 분실된 택배라 다행이다. 하지만 근거(중복 영수증 3장, 또는 모래시계 종료) 없이 보내면 대부분 헛발송이 된다.' };
    } else {
      S.st.waste++; S.score = Math.max(0, S.score - 50);
      var why = delivered ? '이 택배는 이미 창고에 도착해 있었다.' : '이 택배는 아직 안개 속을 이동 중이었다.';
      if (p.state === 'timeout') why += ' 모래시계(' + S.rto + '초)가 왕복 시간보다 짧아서 영수증이 오기 전에 다 떨어진 것이다.';
      S.fb = { cls: 'no', title: '헛발송' + (S.st.waste % 2 === 0 ? ' (신뢰도 −1)' : ''), body: why + ' 같은 택배가 두 번 가서 길만 막힌다.' };
      if (S.st.waste % 2 === 0) S.hearts--;
      NA.sfx.bad();
    }
    transmit(i, true);
    if (S.hearts <= 0) return endGame(false);
    render();
  }

  /* ------------------------------------------------------------ 수신 측 (보이지 않음) */
  function rcvExpected() { for (var i = 0; i < S.n; i++) if (!S.R.got[i]) return i; return S.n; }
  function rcvAck(fromI, kind) {
    var R = S.R, rw = S.cfg.cap != null ? S.cfg.cap - R.buf.length : null;
    var lost = fromI != null && S.cfg.ackLoss.indexOf(fromI) >= 0 && !R.ackLostDone[fromI];
    if (lost) R.ackLostDone[fromI] = 1;
    if (rw != null) R.lastAdv = rw;
    S.road.push({ k: 'a', ack: seqOf(rcvExpected()), rwnd: rw, t0: S.t, t1: S.t + oneWay(fromI || 0), lost: lost, lostAt: NA.rand(.42, .58), upd: kind === 'upd' });
  }
  function parcelArrive(r) {
    var R = S.R, i = r.i;
    if (R.got[i]) { rcvAck(i); return; }
    if (S.cfg.cap != null && R.buf.length >= S.cfg.cap) {
      S.st.overflow++;
      var pen = S.st.overflow % 2 === 0;
      if (pen) S.hearts--;
      S.fb = { cls: 'no', title: '창고가 넘쳤다!' + (pen ? ' (신뢰도 −1)' : ''), body: 'seq ' + S.P[i].seq + ' 택배가 창고 앞에서 버려졌다. 확인 대기 택배 수가 영수증의 창고 빈 칸(rwnd)보다 많으면 이렇게 된다. 흐름 제어는 <b>수신자의 창고</b>를 지키는 규칙이다. 버려진 택배는 다시 보내야 한다.' + autoPause('overflow') };
      NA.sfx.boom();
      rcvAck(i);
      if (S.hearts <= 0) endGame(false);
      render(); return;
    }
    R.got[i] = 1; R.buf.push(i);
    if (S.cfg.cap == null) R.buf = [];
    rcvAck(i);
  }
  function appTick(dt) {
    if (S.cfg.cap == null) return;
    var R = S.R;
    if (inPause()) return;
    R.appCd -= dt;
    if (R.appCd > 0) return;
    R.appCd = S.cfg.appRead;
    var e = rcvExpected();
    var k = -1;
    R.buf.forEach(function (i, j) { if (i < e && (k < 0 || i < R.buf[k])) k = j; });
    if (k < 0) return;
    R.buf.splice(k, 1);
    if (R.lastAdv === 0) rcvAck(null, 'upd');
  }

  /* ------------------------------------------------------------ 영수증 처리 */
  function processReceipt(id) {
    var k = -1;
    S.inbox.forEach(function (r, j) { if (r.id === id) k = j; });
    if (k < 0 || S.over) return;
    var r = S.inbox.splice(k, 1)[0], idx = idxOfSeq(r.ack);
    S.st.processed++;
    if (r.rwnd != null && r.ack >= S.lastAck) S.rwnd = r.rwnd;   // 지난 영수증의 빈 칸 정보는 무시
    var newly = [];
    for (var i = 0; i < idx; i++) if (S.P[i].state !== 'done' && S.P[i].state !== 'wait') { S.P[i].state = 'done'; newly.push(i); }
    if (newly.length) {
      var lastNew = S.P[newly[newly.length - 1]];
      if (!lastNew.retx) { S.rtts.push(+(S.t - lastNew.sentAt).toFixed(1)); if (S.rtts.length > 8) S.rtts.shift(); }
      S.dup = 0; S.P.forEach(function (p) { p.suspect = false; });
      S.lastAck = r.ack; S.score += 40 * newly.length;
      var co = S.cfg.coach;
      S.fb = { cls: 'ok', title: '영수증 ACK ' + r.ack + ' 처리', body: (r.ack - 1) + '번 바이트까지 잘 받았다는 뜻이다. ' + (newly.length > 1 ? '택배 <b>' + newly.length + '개</b>가 한꺼번에 확인됐다(누적 ACK).' : '택배 1개가 확인됐다.') +
        (!lastNew.retx ? ' 이번 왕복 시간: <b>' + S.rtts[S.rtts.length - 1] + '초</b>.' : '') + (co ? '' : '') + (r.rwnd != null ? ' 창고 빈 칸: <b>' + r.rwnd + '</b>.' : '') };
      NA.sfx.good();
    } else if (r.ack === S.lastAck && outstanding().length) {
      if (r.upd) {
        S.fb = { cls: 'info', title: '창고 업데이트 영수증', body: '창고 직원이 정리를 해서 빈 칸이 <b>' + r.rwnd + '</b>칸으로 늘었다는 소식이다. 같은 번호지만 중복 영수증으로 세지 않는다.' };
      } else {
        S.dup++; S.st.dupSeen++;
        var sp = S.P[idxOfSeq(r.ack)];
        if (S.dup >= 3 && sp && sp.state !== 'done') {
          sp.suspect = true;
          S.fb = { cls: 'info', title: '중복 영수증 3장째!', body: '수신자가 계속 <b>' + r.ack + '번부터</b> 달라고 한다. 뒤의 택배들은 도착하는데 seq ' + r.ack + ' 택배만 빠졌다는 뜻이다. 장부에서 그 택배를 <b>지금 재발송</b>하자.' + autoPause('dup3') };
        } else S.fb = { cls: 'info', title: '중복 영수증 ' + S.dup + '장째', body: '또 ACK ' + r.ack + '이다. ' + r.ack + '번 바이트가 아직 도착하지 않았는데 그 뒤 택배들이 도착하고 있다는 신호일 수 있다.' + (S.dup < 3 ? ' 3장이 될 때까지 지켜보자.' : '') };
      }
    } else if (r.ack < S.lastAck) {
      S.fb = { cls: 'info', title: '지난 영수증', body: 'ACK ' + r.ack + '은 이미 확인한 범위다. 늦게 도착한 영수증이라 효과가 없다.' };
    } else if (r.rwnd != null) {
      S.fb = { cls: 'info', title: '영수증 ACK ' + r.ack, body: '새로 확인된 택배는 없다. 창고 빈 칸: <b>' + r.rwnd + '</b>.' };
    }
    if (S.P.every(function (p) { return p.state === 'done'; })) return endGame(true);
    render();
  }

  /* ------------------------------------------------------------ 시간 흐름 */
  function tick(ts) {
    raf = requestAnimationFrame(tick);
    var dt = Math.min(.1, (ts - (last || ts)) / 1000); last = ts;
    if (!S || S.over || S.paused || !ov.hidden) { draw(); return; }
    dt *= S.speed;
    S.t += dt;
    var changed = false;
    // 도로
    for (var j = S.road.length - 1; j >= 0; j--) {
      var r = S.road[j], f = (S.t - r.t0) / (r.t1 - r.t0);
      if (r.lost && f >= r.lostAt) { S.road.splice(j, 1); continue; }
      if (f >= 1) {
        S.road.splice(j, 1);
        if (r.k === 'p') parcelArrive(r);
        else { S.inbox.push({ id: ++S.rid, ack: r.ack, rwnd: r.rwnd, upd: r.upd }); NA.sfx.pop(); changed = true; }
      }
    }
    appTick(dt);
    // 모래시계: TCP처럼 타이머는 하나. 가장 오래된 미확인 택배의 것만 흐른다
    var outsNow = outstanding().sort(function (a, b) { return a.i - b.i; });
    var owner = outsNow[0];
    if (owner && S.timerOwner !== owner.i) { S.timerOwner = owner.i; if (owner.state === 'out') owner.rtoLeft = S.rto; }
    if (!owner) S.timerOwner = -1;
    S.P.forEach(function (p) {
      if (p.state === 'out' && p !== owner) return;
      if (p.state === 'out') {
        p.rtoLeft -= dt;
        if (p.rtoLeft <= 0) {
          p.state = 'timeout'; p.toAt = S.t; changed = true;
          S.fb = { cls: 'no', title: '모래시계 끝: seq ' + p.seq, body: S.rto + '초 동안 이 택배를 확인하는 영수증이 오지 않았다. 장부에서 <b>재발송</b>하자. (' + GRACE + '초 넘게 미루면 방치로 신뢰도 −1)' + autoPause('timeout') };
          NA.sfx.tick(true);
        }
      } else if (p.state === 'timeout' && S.t - p.toAt > GRACE) {
        S.st.neglect++; S.hearts--;
        S.fb = { cls: 'no', title: '방치! (신뢰도 −1)', body: 'seq ' + p.seq + '의 모래시계가 끝난 지 ' + GRACE + '초가 지나 자동으로 다시 보냈다.' };
        transmit(p.i, true); changed = true;
        if (S.hearts <= 0) { endGame(false); return; }
      }
    });
    if (changed) render(); else liveUpdate();
    draw();
  }

  function liveUpdate() {
    app.querySelectorAll('[data-sand]').forEach(function (el) {
      var p = S.P[+el.dataset.sand];
      if (el.parentElement.classList.contains('idle')) return;
      var ratio = p.state === 'out' ? Math.max(0, p.rtoLeft / S.rto) : 0;
      el.style.width = (ratio * 100) + '%';
    });
    app.querySelectorAll('[data-left]').forEach(function (el) {
      var p = S.P[+el.dataset.left];
      el.textContent = p.state === 'out' ? Math.max(0, p.rtoLeft).toFixed(1) + '초 남음' : '재발송 대기 ' + Math.max(0, GRACE - (S.t - p.toAt)).toFixed(0) + '초';
    });
    app.querySelectorAll('[data-age]').forEach(function (el) {
      var p = S.P[+el.dataset.age]; el.textContent = '보낸 지 ' + (S.t - p.sentAt).toFixed(1) + '초';
    });
    var c = app.querySelector('[data-clock]'); if (c) c.textContent = '⏱ ' + S.t.toFixed(0) + '초';
  }

  /* ------------------------------------------------------------ 도로 그리기 (캔버스) */
  var cv = null, cx = null;
  function draw() {
    if (!cv || !S) return;
    var W = 960, H = 216;
    cx.setTransform(2, 0, 0, 2, 0, 0);
    cx.clearRect(0, 0, W, H);
    // 배경 길
    cx.fillStyle = '#3b2c1c'; cx.fillRect(0, 0, W, H);
    cx.fillStyle = '#4b3a26'; cx.fillRect(110, 62, W - 220, 40); cx.fillRect(110, 132, W - 220, 40);
    cx.strokeStyle = 'rgba(255,230,190,.25)'; cx.setLineDash([10, 8]); cx.lineWidth = 2;
    cx.beginPath(); cx.moveTo(110, 82); cx.lineTo(W - 110, 82); cx.moveTo(110, 152); cx.lineTo(W - 110, 152); cx.stroke(); cx.setLineDash([]);
    txt('택배 →', 118, 56, 12, '#e6b25c');
    txt('← 영수증 (ACK)', W - 118, 190, 12, '#f6efe0', 'right');
    // 건물
    house(10, 50, '우리 사무소', '#c89b62', '📮');
    house(W - 100, 50, '수신 창고', '#7aa3c8', '🏭');
    var X0 = 110, X1 = W - 110;
    S.road.forEach(function (r) {
      var f = Math.max(0, Math.min(1, (S.t - r.t0) / (r.t1 - r.t0)));
      if (r.k === 'p') {
        var x = X0 + (X1 - X0) * f;
        cx.fillStyle = r.retx ? '#9b7be0' : '#c89b62'; cx.fillRect(x - 30, 66, 60, 32);
        cx.strokeStyle = '#2a1a08'; cx.lineWidth = 2; cx.strokeRect(x - 30, 66, 60, 32);
        cx.fillStyle = '#2a1a08'; cx.fillRect(x - 2, 66, 4, 32);
        txt('seq ' + S.P[r.i].seq, x, 87, 11, '#fff', 'center', true);
      } else {
        var x2 = X1 - (X1 - X0) * f;
        cx.fillStyle = '#f6efe0'; cx.fillRect(x2 - 34, 137, 68, 30);
        cx.strokeStyle = '#8a7556'; cx.lineWidth = 2; cx.strokeRect(x2 - 34, 137, 68, 30);
        txt('ACK ' + r.ack, x2, 155, 11, '#2a1a08', 'center', true);
        if (r.rwnd != null) txt('빈 칸 ' + r.rwnd, x2, 132, 10, '#f6efe0', 'center');
      }
    });
    // 안개
    var fx0 = X0 + (X1 - X0) * .3, fx1 = X0 + (X1 - X0) * .7;
    var g = cx.createLinearGradient(fx0 - 40, 0, fx1 + 40, 0);
    g.addColorStop(0, 'rgba(160,150,140,0)'); g.addColorStop(.12, 'rgba(160,150,140,.97)');
    g.addColorStop(.88, 'rgba(160,150,140,.97)'); g.addColorStop(1, 'rgba(160,150,140,0)');
    cx.fillStyle = g; cx.fillRect(fx0 - 40, 30, fx1 - fx0 + 80, 160);
    txt('네트워크 (안개)', (fx0 + fx1) / 2, 116, 14, '#3b2c1c', 'center', true);
    txt('안에서 무슨 일이 생기는지 보이지 않는다', (fx0 + fx1) / 2, 132, 10, '#3b2c1c', 'center');
    if (S.paused && !S.over && ov.hidden) {
      cx.fillStyle = 'rgba(0,0,0,.45)'; cx.fillRect(0, 0, W, H);
      txt(S.si === 0 && S.t === 0 ? '택배를 보내면 시간이 흐르기 시작한다' : '일시정지 (Space로 계속)', W / 2, H / 2 + 6, 18, '#fff', 'center', true);
    }
  }
  function txt(s, x, y, size, color, align, bold) {
    cx.font = (bold ? '700 ' : '400 ') + size + 'px ' + NA.FONT;
    cx.textAlign = align || 'left'; cx.fillStyle = color; cx.fillText(s, x, y);
  }
  function house(x, y, label, color, icon) {
    cx.fillStyle = color; cx.fillRect(x, y + 30, 90, 100);
    cx.beginPath(); cx.moveTo(x - 6, y + 32); cx.lineTo(x + 45, y); cx.lineTo(x + 96, y + 32); cx.closePath(); cx.fill();
    cx.fillStyle = '#2a1a08'; cx.fillRect(x + 32, y + 90, 26, 40);
    txt(icon, x + 45, y + 72, 26, '#000', 'center');
    txt(label, x + 45, y + 150, 12, '#f1dfc3', 'center', true);
  }

  /* ------------------------------------------------------------ 튜토리얼 */
  function coach() {
    if (!S || !S.cfg.coach) return null;
    var out = outstanding().length, done = S.P.filter(function (p) { return p.state === 'done'; }).length;
    if (S.next === 0) return '택배를 보내 보자. 왼쪽 <b>발송</b> 버튼(<span class="key">S</span>)을 눌러. 보내는 순간부터 시간이 흐른다.';
    if (S.inbox.length) return '영수증 도착! <b>ACK ' + S.inbox[0].ack + '</b> = "' + (S.inbox[0].ack - 1) + '번 바이트까지 잘 받았으니 <b>' + S.inbox[0].ack + '번부터</b> 보내 줘". 오른쪽 영수증함에서 눌러서 처리하자.';
    if (out && done === 0) return '택배가 <b>안개(네트워크)</b> 속으로 들어갔어. 장부의 <b>모래시계(RTO)</b>가 줄어드는 게 보이지? 영수증이 오기 전에 다 떨어지면 다시 보내야 해. 기다려 보자. 급하면 <span class="key">Space</span>로 멈춰도 돼.';
    if (!out && done < S.n) return '오른쪽 아래에 <b>왕복 시간(RTT)</b>이 기록됐어. 장부가 비었으니 다음 택배를 보내. 한 번에 하나씩(<b>Stop-and-Wait</b>)이라 택배 하나에 RTT만큼 걸린다는 걸 느껴 봐.';
    if (out) return '택배 하나 보내고 영수증 기다리고… 3개를 보내는 데 RTT의 3배가 걸린다. "연결은 되는데 느리다"면 먼저 이 <b>RTT</b>부터 재 보는 이유야.';
    return null;
  }

  /* ------------------------------------------------------------ 렌더 */
  function render() {
    if (!S) return;
    var cfg = S.cfg, h = '';
    for (var k = 0; k < 5; k++) h += k < S.hearts ? '♥' : '<i>♥</i>';
    var done = S.P.filter(function (p) { return p.state === 'done'; }).length;
    var html = '<div class="bar"><span class="st">' + (S.E ? '∞ 근무 ' + S.E.lv : 'STAGE ' + (S.si + 1)) + '<small>' + esc(cfg.title) + '</small></span>' +
      '<span class="hearts">' + h + '</span><span class="cnt">배송 확인 ' + done + ' / ' + S.n + (S.E ? ' · 점수 ' + S.score : '') + '</span><span class="sp"></span>' +
      '<div class="speed"><button data-speed="0" class="' + (S.paused ? 'on' : '') + '">정지</button>' +
      [.5, 1, 2].map(function (v) { return '<button data-speed="' + v + '" class="' + (!S.paused && S.speed === v ? 'on' : '') + '">' + v + '×</button>'; }).join('') +
      '<span class="clock" data-clock>⏱ ' + S.t.toFixed(0) + '초</span></div>' +
      '<button class="na-btn" data-guide>규칙</button></div>';

    // A: 발송대 + 도로
    var out = outstanding().length;
    var canSend = !S.over && S.next < S.n && out < cfg.win;
    html += '<div class="rowA"><div class="zone desk"><h3><span>발송대</span><span>장부 빈 칸 <b>' + (cfg.win - out) + '</b> / ' + cfg.win + '</span></h3>';
    if (S.next < S.n) html += '<div class="next"><div class="l">다음 택배</div><div class="v">seq ' + seqOf(S.next) + '</div><div class="s">' + LEN + '바이트 (' + seqOf(S.next) + '~' + (seqOf(S.next) + LEN - 1) + ')</div></div>';
    else html += '<div class="next"><div class="l">다음 택배</div><div class="v">없음</div><div class="s">모두 보냈다. 확인을 기다리자</div></div>';
    html += '<button class="sendbtn' + (S.cfg.coach && S.next === 0 ? ' pulse' : '') + '" data-send' + (canSend ? '' : ' disabled') + '>발송 ▶ <span style="opacity:.6;font-size:12px">[S]</span></button>';
    if (cfg.rtoChoices) html += '<div class="rto-pick">모래시계: ' + cfg.rtoChoices.map(function (v) { return '<button data-rto="' + v + '" class="' + (S.rto === v ? 'on' : '') + '">' + v + '초</button>'; }).join('') + '</div>';
    else html += '<div class="info">모래시계(RTO): <b>' + S.rto + '초</b></div>';
    if (cfg.cap != null) { var rw = S.rwnd == null ? cfg.cap : S.rwnd, more = '<b style="color:' + (rw - out > 0 ? 'var(--ok)' : 'var(--bad)') + '">' + Math.max(0, rw - out) + '개</b>';
      html += cfg.rtoChoices ? '<div class="info">창고 빈 칸 <b>' + rw + '</b> − 대기 <b>' + out + '</b> → 더 보내기 ' + more + '</div>' :
        '<div class="info">창고 빈 칸(마지막 영수증) <b>' + rw + '</b> − 확인 대기 <b>' + out + '</b><br>→ 지금 더 보내도 되는 양: ' + more + '</div>'; }
    html += '</div><div class="zone road"><canvas id="road" width="1920" height="432"></canvas></div></div>';

    // B: 장부 + 영수증함
    html += '<div class="rowB"><div class="zone"><h3><span>발송 장부 (송신 윈도우)</span><span>맨 앞 택배의 모래시계(RTO)만 흐른다 · 재발송 <span class="key">1</span>~<span class="key">' + cfg.win + '</span></span></h3><div class="ledger">';
    var outs = outstanding().sort(function (a, b) { return a.i - b.i; });
    for (var s = 0; s < cfg.win; s++) {
      var p = outs[s];
      if (!p) { html += '<div class="slot empty">빈 칸</div>'; continue; }
      var cls = p.state === 'timeout' ? 'timeout' : p.suspect ? 'suspect' : 'out';
      var isOwner = s === 0;
      var lab = p.state === 'timeout' ? '⌛ 시간 초과! 재발송하자' : p.suspect ? '중복 영수증 3장: 분실 의심!' : (isOwner ? (p.retx ? '재발송함 · 타이머 작동 중' : '타이머 작동 중') : '타이머 대기 (앞 택배 확인 후 시작)');
      html += '<div class="slot ' + cls + '"><span class="seq">seq ' + p.seq + '</span><span class="sub" data-age="' + p.i + '">보낸 지 ' + (S.t - p.sentAt).toFixed(1) + '초</span>' +
        '<div class="sand' + (isOwner ? '' : ' idle') + '"><i data-sand="' + p.i + '" style="width:' + (p.state === 'out' ? (isOwner ? Math.max(0, p.rtoLeft / S.rto) * 100 : 100) : 0) + '%"></i></div>' +
        '<span class="sub"' + (isOwner ? ' data-left="' + p.i + '"' : '') + '>' + (isOwner ? '' : '-') + '</span><span class="lab">' + lab + '</span>' +
        '<button class="resend' + (p.state === 'timeout' || p.suspect ? ' pulse' : '') + '" data-resend="' + p.i + '">[' + (s + 1) + '] 재발송</button></div>';
    }
    html += '</div></div>';
    html += '<div class="zone"><h3><span>영수증함 (ACK)</span><span>눌러서 처리 · <span class="key">A</span> 하나씩</span></h3>' +
      '<div class="rhead"><span>마지막 확인: <b>ACK ' + S.lastAck + '</b></span><span>중복 영수증 <span class="dots">' + [0, 1, 2].map(function (d) { return '<i class="' + (d < S.dup ? 'on' : '') + '"></i>'; }).join('') + '</span></span></div><div class="rlist">';
    if (!S.inbox.length) html += '<div class="rempty">도착한 영수증이 없다</div>';
    var showN = S.inbox.length > 4 ? 3 : 4;
    S.inbox.slice(0, showN).forEach(function (r, j) {
      html += '<button class="rbtn' + (S.cfg.coach && j === 0 ? ' pulse' : '') + '" data-rc="' + r.id + '">ACK ' + r.ack + '<span>' + (r.rwnd != null ? '창고 빈 칸 ' + r.rwnd + (r.upd ? ' · 업데이트' : '') : '처리하기') + '</span></button>';
    });
    if (S.inbox.length > showN) html += '<div class="rmore">+ ' + (S.inbox.length - showN) + '장 더</div>';
    html += '</div></div></div>';

    // C: 해설 + RTT
    var co = coach();
    html += '<div class="rowC"><div>';
    if (co) html += '<div class="coach"><span class="who">선배 사무장</span>' + co + '</div>';
    else if (S.fb) html += '<div class="feedback ' + S.fb.cls + '"><h4>' + S.fb.title + '</h4>' + S.fb.body + '</div>';
    else html += '<div class="feedback"><h4>근무 중</h4>택배를 보내고, 영수증을 처리하고, 모래시계를 지켜보자.</div>';
    html += '</div><div class="zone rtt"><h3><span>RTT 기록 (왕복 시간)</span><span>모래시계 ' + S.rto + '초</span></h3>';
    if (S.rtts.length) {
      var mx = Math.max.apply(null, S.rtts.concat([S.rto]));
      html += '<div class="bars">' + S.rtts.map(function (v) { return '<i style="height:' + (v / mx * 100) + '%"><span>' + v + '</span></i>'; }).join('') + '</div>';
      var avg = S.rtts.reduce(function (a, b) { return a + b; }, 0) / S.rtts.length;
      html += '평균 RTT <b>' + avg.toFixed(1) + '초</b> · 최근 <b>' + S.rtts[S.rtts.length - 1] + '초</b>';
    } else html += '<div class="rempty">영수증을 처리하면 왕복 시간이 기록된다</div>';
    html += '</div></div>';

    app.innerHTML = html;
    cv = document.getElementById('road'); cx = cv.getContext('2d');
    bind(); liveUpdate(); draw();
  }

  function bind() {
    var sb = app.querySelector('[data-send]'); if (sb) sb.onclick = sendNext;
    app.querySelectorAll('[data-resend]').forEach(function (b) { b.onclick = function () { resend(+b.dataset.resend); }; });
    app.querySelectorAll('[data-rc]').forEach(function (b) { b.onclick = function () { processReceipt(+b.dataset.rc); }; });
    app.querySelectorAll('[data-speed]').forEach(function (b) {
      b.onclick = function () { var v = +b.dataset.speed; if (v === 0) S.paused = true; else { S.paused = false; S.speed = v; } render(); };
    });
    app.querySelectorAll('[data-rto]').forEach(function (b) {
      b.onclick = function () {
        S.rto = +b.dataset.rto;
        S.fb = { cls: 'info', title: '모래시계 ' + S.rto + '초로 변경', body: '지금부터 보내는(또는 다시 보내는) 택배에 적용된다. 평균 RTT와 비교해 보자.' };
        render();
      };
    });
    var g = app.querySelector('[data-guide]'); if (g) g.onclick = guide;
  }

  function guide() {
    var was = S.paused; S.paused = true;
    ov.innerHTML = '<div class="na-card guide"><h2>택배 발송 사무소 규칙</h2>' +
      '<h4>보내기</h4><p>발송하면 택배가 장부(송신 윈도우)에 올라가고 모래시계(RTO)가 흐른다. 장부가 꽉 차면 더 보낼 수 없다.</p>' +
      '<h4>영수증(ACK)</h4><p>"이 번호부터 보내 줘"라는 뜻이다. ACK 501이면 500번 바이트까지 모두 도착했다. 그 앞의 택배는 한꺼번에 확인된다(누적 ACK).</p>' +
      '<h4>재발송하는 두 가지 근거</h4><ul><li><b>중복 영수증 3장</b>(같은 번호가 3번 더 옴): 그 번호 택배만 빠졌다 → 바로 재발송(빠른 재전송)</li><li><b>모래시계 종료</b>: RTO 동안 확인이 없다 → 재발송(타임아웃). ' + GRACE + '초 넘게 미루면 방치.</li></ul>' +
      '<p>근거 없이 다시 보내면 대부분 헛발송이다(2번마다 신뢰도 −1).</p>' +
      '<h4>타이머는 하나</h4><p>실제 TCP처럼 모래시계는 <b>가장 오래된 미확인 택배</b> 하나에서만 흐른다. 그 택배가 확인되면 다음으로 오래된 택배 기준으로 다시 채워지고, 재발송하면 그 택배의 모래시계가 처음부터 다시 흐른다. (실제 TCP는 타임아웃으로 재전송할 때마다 RTO를 두 배로 늘린다.)</p>' +
      '<h4>모래시계 길이</h4><p>평균 RTT보다 넉넉하게. 짧으면 헛발송, 길면 분실 복구가 느리다. 실제 TCP는 RTT 평균과 흔들림으로 RTO를 계산한다.</p>' +
      (S.cfg.cap != null ? '<h4>창고 빈 칸(rwnd)</h4><p>확인 대기 택배 수가 영수증의 빈 칸 수를 넘지 않게 보낸다. 흐름 제어 = 수신자의 창고를 지키는 규칙.</p>' : '') +
      '<p>조작: <span class="key">S</span> 발송 · <span class="key">A</span> 영수증 처리 · <span class="key">1</span>~<span class="key">6</span> 재발송 · <span class="key">Space</span> 일시정지</p>' +
      '<div class="na-row"><button class="na-btn primary" data-close>닫기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-close]').onclick = function () { ov.hidden = true; S.paused = was; render(); };
  }

  /* ------------------------------------------------------------ 무한 근무 */
  function R(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function genShift(lv) {
    var n = 8 + Math.min(lv, 6), win = R(4, Math.min(6, 4 + lv)), base = R(4, 8), tags = [];
    var c = { n: n, win: win, rtt: [base], loss: [], ackLoss: [], qc: ['W3-7', 'W3-10'] };
    if (lv >= 3 && Math.random() < .45) {
      var far = R(base + 4, base + 7), at = R(3, n - 4), arr = [];
      for (var i = 0; i < n; i++) arr.push(i < at ? base : far);
      c.rtt = arr; c.routeChangeAt = at; tags.push('노선 변경');
    }
    var mx = Math.max.apply(null, c.rtt);
    if (lv >= 2) { c.rtoChoices = [Math.max(3, Math.round(base * .9)), Math.round(mx * 1.6) + 1, Math.round(mx * 3.2) + 2]; c.rto = c.rtoChoices[c.routeChangeAt != null ? 0 : 1]; tags.push('모래시계 고르기'); }
    else c.rto = Math.round(mx * 2) + 2;
    var pl = Math.min(.3, .08 + .035 * lv);
    for (var j = 0; j < n; j++) { if (Math.random() < pl) c.loss.push(j); else if (Math.random() < .08) c.ackLoss.push(j); }
    if (c.loss.length) tags.push('분실 ' + c.loss.length + '건 예상');
    if (lv >= 4 && Math.random() < .35) { c.cap = R(2, 4); c.win = Math.max(c.win, c.cap + 2); c.appRead = R(2, 4); var ps = R(6, 20); c.appPause = [[ps, ps + R(8, 14)]]; tags.push('창고 ' + c.cap + '칸'); c.qc.push('W3-6'); }
    c.title = tags.length ? tags.join(' · ') : '평범한 근무';
    c.desc = '택배 ' + n + '개 · 장부 ' + c.win + '칸';
    c.brief = '택배 <b>' + n + '개</b> · 장부 <b>' + c.win + '칸</b> · 왕복 약 <b>' + base + '초</b>' + (c.routeChangeAt != null ? ' → 중간에 <b>노선이 해외로</b> 바뀐다' : '') + '<br>' +
      (c.rtoChoices ? '모래시계 길이를 고를 수 있다: ' + c.rtoChoices.join(' / ') + '초. RTT 기록을 보고 맞추자.<br>' : '모래시계 <b>' + c.rto + '초</b>.<br>') +
      (c.cap ? '수신 창고가 <b>' + c.cap + '칸</b>뿐이고 중간에 정리가 멈춘다. 영수증의 빈 칸(rwnd)을 지키자.<br>' : '') +
      '분실은 안개 속에서 무작위로 일어난다. 중복 영수증 3장이면 바로, 모래시계가 끝나면 재발송.<br>신뢰도와 점수는 다음 근무로 이어진다.';
    return c;
  }
  var E = null;
  function startEndless() { E = { lv: 0, hearts: 5, score: 0, shifts: 0, fr: 0, rto: 0, waste: 0, t: 0, firsts: {} }; nextShift(); }
  function nextShift() {
    E.lv++;
    var cfg = genShift(E.lv);
    S = newState(-1, cfg); S.E = E; S.hearts = E.hearts; S.score = E.score; S.firsts = E.firsts; cv = null;
    NA.ui.briefing(ov, '∞ 근무 ' + E.lv + ' · ' + cfg.title, cfg.brief, function () { S.paused = false; render(); });
  }
  function endShift(win) {
    S.over = true; render();
    var st = S.st;
    E.fr += st.fr; E.rto += st.rto; E.waste += st.waste; E.t += S.t; E.hearts = S.hearts;
    if (!win) {
      NA.sfx.lose(); E.score = S.score;
      var stars = E.shifts >= 8 ? 3 : E.shifts >= 4 ? 2 : E.shifts >= 1 ? 1 : 0;
      return setTimeout(function () {
        NA.ui.debrief({
          overlay: ov, gameId: GAME_ID, endless: true, win: false, stars: stars, score: E.score,
          title: '근무 종료', sub: '근무 ' + E.shifts + '번 완료 · ★는 1/4/8번에서',
          stats: [['점수', E.score], ['완료 근무', E.shifts], ['빠른 재전송', E.fr], ['타임아웃 재전송', E.rto], ['헛발송', E.waste], ['총 시간', E.t.toFixed(0) + '초']],
          qc: ['W3-7', 'W3-10', 'W3-6'], playNotes: {},
          onRetry: startEndless, onNext: null, onMenu: menu
        });
      }, 800);
    }
    NA.sfx.win();
    var bonus = 150 * E.lv; S.score += bonus; E.score = S.score; E.shifts++;
    var avg = S.rtts.length ? (S.rtts.reduce(function (a, b) { return a + b; }, 0) / S.rtts.length).toFixed(1) : '-';
    var me = S;
    setTimeout(function () {
      if (S !== me) return;
      NA.ui.briefing(ov, '근무 ' + E.lv + ' 완료! +' + bonus,
        S.n + '개를 ' + S.t.toFixed(0) + '초 만에 배송 확인. 평균 RTT <b>' + avg + '초</b>' + (S.cfg.loss.length ? ' · 실제 분실 ' + S.cfg.loss.length + '건' : '') + '<br>' +
        '빠른 재전송 ' + st.fr + ' · 타임아웃 재전송 ' + st.rto + ' · 헛발송 ' + st.waste + '<br>' +
        '점수 <b>' + E.score + '</b> · 신뢰도 ' + E.hearts + '/5. 다음 근무는 더 까다로워질 수 있다.', nextShift);
    }, 900);
  }

  /* ------------------------------------------------------------ 시작/끝 */
  function startStage(si) {
    S = newState(si); cv = null;
    NA.ui.briefing(ov, 'STAGE ' + (si + 1) + ' · ' + S.cfg.title, S.cfg.brief, function () {
      S.paused = si === 0; // 1단계는 첫 발송과 함께 시작
      render();
    });
  }
  function endGame(win) {
    if (S.over) return;
    if (S.E) return endShift(win);
    S.over = true; render();
    if (win) NA.sfx.win(); else NA.sfx.lose();
    var st = S.st, stars = !win ? 0 : S.hearts >= 5 ? 3 : S.hearts >= 3 ? 2 : 1;
    var avg = S.rtts.length ? (S.rtts.reduce(function (a, b) { return a + b; }, 0) / S.rtts.length).toFixed(1) : '-';
    var notes = {
      'W3-7': '중복 영수증을 ' + st.dupSeen + '장 받았고, 3장째에 빠른 재전송 ' + st.fr + '번으로 모래시계 ' + st.saved.toFixed(1) + '초를 아꼈다. 수신자가 같은 ACK를 반복한 건 "그 번호만 빠졌고 뒤는 오고 있다"는 뜻이었다.',
      'W3-10': '평균 RTT ' + avg + '초. ' + (S.si === 0 ? '하나씩 보내면 택배마다 RTT만큼 기다려야 해서 느렸다.' : '모래시계를 RTT에 맞추지 않으면 헛발송(' + st.waste + '번)이나 느린 복구가 생겼다.') + ' 느릴 때는 RTT부터 잰다.',
      'W3-6': '창고가 넘친 것 ' + st.overflow + '번. 영수증의 빈 칸(rwnd)을 지키는 것이 흐름 제어이고, 보호 대상은 네트워크가 아니라 수신자의 창고였다.'
    };
    setTimeout(function () {
      NA.ui.debrief({
        overlay: ov, gameId: GAME_ID, stage: S.si, win: win, stars: stars, score: S.score,
        title: win ? '모든 택배 배송 확인!' : '오늘은 여기까지',
        sub: win ? S.t.toFixed(0) + '초 만에 ' + S.n + '개 배송 확인. 남은 신뢰도 ' + S.hearts + '/5.' : '신뢰도가 바닥났다. 규칙을 보고 다시 해 보자.',
        stats: [['걸린 시간', S.t.toFixed(0) + '초'], ['평균 RTT', avg + '초'], ['빠른 재전송', st.fr], ['타임아웃 재전송', st.rto], ['헛발송', st.waste], ['방치', st.neglect]],
        qc: S.cfg.qc, playNotes: notes,
        onRetry: function () { startStage(S.si); },
        onNext: S.si + 1 < STAGES.length ? function () { startStage(S.si + 1); } : null,
        onMenu: menu
      });
    }, 800);
  }
  function menu() {
    S = null; E = null; app.innerHTML = ''; cv = null;
    NA.ui.renderTags(GAME_ID);
    NA.ui.stageMenu({
      overlay: ov, gameId: GAME_ID, stages: STAGES, onPick: startStage,
      endless: { title: '무한 근무', desc: '근무마다 택배 수·장부·RTT·분실이 무작위. 신뢰도가 바닥날 때까지.', onPick: startEndless },
      howto: '나는 <b>송신자</b>. 택배를 보내고, 영수증(ACK)을 처리하고, 모래시계(RTO)를 챙긴다.<br>' +
        '시간이 흐르지만 넉넉하다. <span class="key">Space</span>로 언제든 멈추고 0.5×로 느리게 할 수 있다.<br>' +
        '재발송 근거는 두 가지: <b>중복 영수증 3장</b>(빠른 재전송), <b>모래시계 종료</b>(타임아웃).'
    });
  }

  document.addEventListener('keydown', function (e) {
    if (!S || S.over || !ov.hidden) return;
    NA.sfx.unlock();
    var k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); if (!(S.si === 0 && S.next === 0)) { S.paused = !S.paused; render(); } }
    else if (k === 's') sendNext();
    else if (k === 'a') { if (S.inbox.length) processReceipt(S.inbox[0].id); }
    else {
      var n = parseInt(k, 10);
      if (n >= 1 && n <= S.cfg.win) { var outs = outstanding().sort(function (a, b) { return a.i - b.i; }); if (outs[n - 1]) resend(outs[n - 1].i); }
    }
  });
  document.addEventListener('pointerdown', function () { NA.sfx.unlock(); });

  window.__game = { state: function () { return S; }, endless: startEndless, E: function () { return E; }, start: startStage, send: sendNext, resend: resend, process: processReceipt,
    outstanding: outstanding, setSpeed: function (v) { S.speed = v; S.paused = false; } };
  raf = requestAnimationFrame(tick);
  if (NA.wantsEndless()) { NA.ui.renderTags(GAME_ID); startEndless(); } else menu();
})();
