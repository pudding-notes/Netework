/* 패킷 솔리테어 — Week 3 Quick Check W3-7(누적 ACK·중복 ACK), W3-6(흐름 제어)
 *
 * 턴제. 시간 제한 없음.
 * 송신자(딜러)가 세그먼트 카드를 한 장씩 선로에 올린다. 카드는 1~3턴 뒤 도착하고, 가끔 사라지거나 순서가 바뀐다.
 * 카드가 도착하면:
 *   1) 놓기   — 정리 칸(앱에 순서대로 전달) / 버퍼(순서가 안 맞는 카드 보관) / 버림(중복 카드)
 *   2) ACK    — "다음에 필요한 바이트 번호"를 골라 딜러에게 보낸다
 * 같은 ACK가 3번 더 오면(중복 ACK 3개) 딜러가 빠진 카드를 빠른 재전송한다.
 */
(function () {
  var GAME_ID = 'packet-solitaire';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));
  var RTO_TURNS = 7;

  var STAGES = [
    { title: '정리 칸 기초', desc: '카드가 조금 뒤섞여 온다. ACK = 다음에 필요한 바이트 번호.', qc: ['W3-7'],
      n: 8, lens: 'fixed', win: 4, loss: [], delay: { 2: 2 }, cap: 6, coach: true,
      brief: '나는 <b>수신자</b>. 송신자(딜러)가 데이터를 <b>카드(세그먼트)</b>로 잘라 한 장씩 보낸다.<br>' +
        '카드의 <b>seq</b>는 그 카드의 첫 바이트 번호, <b>len</b>은 바이트 수다. seq 101, len 100 = 101~200번 바이트.<br>' +
        '<b>정리 칸</b>은 앱에게 데이터를 순서대로 넘기는 곳이라 <b>바로 다음 바이트</b>로 시작하는 카드만 받는다.<br>' +
        '카드를 놓은 뒤에는 딜러에게 <b>ACK</b>를 보낸다. <b>ACK = 다음에 필요한 바이트 번호</b>.<br>' +
        '시간 제한은 없다. 오른쪽 선배의 안내를 따라 해 보자.' },
    { title: '사라진 카드', desc: '카드가 선로에서 사라진다. 중복 ACK가 3개 쌓이면 딜러가 다시 보낸다.', qc: ['W3-7'],
      n: 12, lens: 'fixed', win: 5, loss: [3, 7], delay: { 5: 1 }, spurious: { turn: 6, i: 1 }, cap: 6,
      brief: '이번엔 카드가 선로에서 <b>사라진다</b>. 그 뒤 카드들은 계속 도착한다.<br>' +
        '정리 칸은 빠진 카드를 기다려야 하니 뒤 카드들은 <b>버퍼</b>에 보관한다.<br>' +
        'ACK는 "여기까지 다 받았다"만 말할 수 있어서, 구멍이 메워질 때까지 <b>같은 번호</b>를 계속 보내게 된다(<b>중복 ACK</b>).<br>' +
        '딜러는 같은 번호의 <b>중복 ACK를 3개</b> 받으면(처음 ACK까지 치면 같은 번호 4번) 타임아웃을 기다리지 않고 빠진 카드를 <b>빠른 재전송</b>한다.<br>' +
        '가끔 이미 받은 카드가 또 온다. 그건 <b>버림</b> 칸으로.' },
    { title: '길이가 제각각', desc: '카드마다 바이트 길이가 다르다. 끝 번호를 직접 계산하라.', qc: ['W3-7'],
      n: 10, lens: 'var', win: 5, loss: [4], delay: { 2: 1 }, cap: 6,
      brief: '이제 카드 길이가 120~480 바이트로 제각각이다. 카드에 범위가 적혀 있지 않다.<br>' +
        '<b>다음에 필요한 바이트 = 정리 칸 맨 위 카드의 seq + len</b>. 순서번호는 카드 장수가 아니라 <b>바이트</b>를 센다.<br>' +
        '버퍼에 이어지는 카드가 있으면 그것까지 더해서 계산한다.' },
    { title: '좁은 손', desc: '버퍼가 3칸뿐이고 앱이 가끔 바쁘다. rwnd로 딜러를 늦춰라.', qc: ['W3-6'],
      n: 12, lens: 'fixed', win: 5, loss: [], delay: {}, cap: 3, flow: true, busy: [[4, 7], [12, 15]],
      brief: '버퍼가 <b>3칸</b>뿐이다. 그리고 앱이 가끔 <b>바빠서</b> 정리 칸(앱)이 잠긴다. 그동안은 순서가 맞는 카드도 버퍼에서 기다려야 한다.<br>' +
        'ACK를 보낼 때 <b>rwnd(지금 버퍼의 빈 칸 수)</b>도 함께 알린다. 딜러는 확인받은 곳부터 rwnd장까지만 보낸다.<br>' +
        'rwnd를 실제 빈 칸보다 크게 알리면 버퍼가 넘쳐서 카드를 버려야 한다.<br>' +
        '앱이 다시 읽기 시작해 칸이 비면, 카드가 안 와도 <b>창고 업데이트 ACK</b>로 rwnd를 다시 알려야 딜러가 보내기 시작한다.' }
  ];

  var S = null;

  /* ------------------------------------------------------------ 상태 */
  function newState(si) {
    var cfg = STAGES[si], cards = [], seq = 1;
    var varLens = [120, 200, 250, 300, 480, 160, 350];
    for (var i = 0; i < cfg.n; i++) {
      var len = cfg.lens === 'var' ? varLens[(i * 3 + si) % varLens.length] : 100;
      cards.push({ i: i, seq: seq, len: len });
      seq += len;
    }
    return {
      si: si, cfg: cfg, cards: cards, n: cfg.n, total: seq, turn: 0, lane: [],
      una: 0, nxt: 0, dup: 0, frDone: -1, stall: 0, lastAck: null, lastRwnd: cfg.cap || 99,
      found: [], buffer: [], inbox: [], cur: null, phase: 'wait', hearts: 5, score: 0,
      st: { acks: 0, dup: 0, fr: 0, rto: 0, lies: 0, stale: 0, overflow: 0, dupDiscard: 0, badPlace: 0, winUpd: 0 },
      log: [], fb: null, appBusy: false, rwnd: cfg.cap || 0, arrivals: 0, poof: 0, over: false, opts: []
    };
  }

  function seqOf(i) { return i < S.n ? S.cards[i].seq : S.total; }
  function endOf(c) { return c.seq + c.len - 1; }
  function idxOfSeq(v) { for (var i = 0; i < S.n; i++) if (S.cards[i].seq === v) return i; return v === S.total ? S.n : -1; }
  function have(i) { return S.found.indexOf(i) >= 0 || S.buffer.indexOf(i) >= 0; }
  function expected() { for (var i = 0; i < S.n; i++) if (!have(i)) return i; return S.n; }
  function free() { return (S.cfg.cap || 99) - S.buffer.length; }
  function log(s, cls) { S.log.unshift({ t: S.turn, s: s, c: cls || '' }); if (S.log.length > 30) S.log.pop(); }

  /* ------------------------------------------------------------ 딜러(송신자) */
  function send(i, kind) {
    var retx = !!kind;
    var lost = !retx && S.cfg.loss.indexOf(i) >= 0;
    var arrive = S.turn + 1 + (retx ? 0 : (S.cfg.delay[i] || 0));
    S.lane.push({ i: i, arrive: arrive, lost: lost, retx: retx, sent: S.turn });
  }
  function dealerSend() {
    var wnd = Math.min(S.cfg.win, S.cfg.flow ? S.lastRwnd : 99);
    if (S.nxt < S.n && S.nxt - S.una < wnd) { send(S.nxt, null); S.nxt++; }
    else if (S.cfg.flow && S.nxt < S.n && S.lastRwnd === 0) log('딜러: rwnd가 0이라 보내지 않고 기다린다', 'v');
  }
  function dealerAck(v, rwnd, winUpd) {
    var idx = idxOfSeq(v);
    if (S.cfg.flow) S.lastRwnd = rwnd;
    if (idx < 0) { log('딜러: ACK ' + v + '은 카드 경계가 아니라 무시했다', 'r'); return; }
    if (idx > S.una) {
      S.una = idx; S.dup = 0; S.stall = 0;
    } else if (idx === S.una && S.una < S.nxt && !winUpd) {
      S.dup++;
      if (S.dup >= 3 && S.frDone !== S.una) {
        send(S.una, 'fr'); S.frDone = S.una; S.st.fr++; S.score += 200;
        log('딜러: ACK ' + v + ' 중복 3개 → seq ' + v + ' 카드를 빠른 재전송!', 'v');
        S.fb = { cls: 'info', title: '빠른 재전송 발동!', body: '딜러가 ACK <b>' + v + '</b>의 중복을 3개 받았다. "' + v + '번 바이트부터가 빠졌고, 그 뒤 카드들은 도착하고 있구나"라고 판단해 타임아웃을 기다리지 않고 seq ' + v + ' 카드를 다시 보냈다.' };
      }
    }
  }

  /* ------------------------------------------------------------ 턴 진행 */
  function inBusy(t) { return (S.cfg.busy || []).some(function (r) { return t >= r[0] && t <= r[1]; }); }

  function chain() {
    var moved = [];
    while (!S.appBusy) {
      var k = S.buffer.indexOf(S.found.length);
      if (k < 0) break;
      S.buffer.splice(k, 1); var i = S.found.length; S.found.push(i); moved.push(i);
    }
    if (moved.length) log('버퍼에 있던 ' + moved.map(function (i) { return 'seq ' + seqOf(i); }).join(', ') + ' 이(가) 정리 칸에 이어붙었다', 'g');
    return moved;
  }

  function beginTurn() {
    S.turn++; S.poof = 0;
    if (S.cfg.busy) {
      var b = inBusy(S.turn);
      if (b && !S.appBusy) log('앱이 바빠졌다. 정리 칸이 잠긴다', 'r');
      if (!b && S.appBusy) log('앱이 다시 읽기 시작했다', 'g');
      S.appBusy = b;
    }
    var moved = chain();
    if (S.found.length >= S.n && S.lastAck === S.total) { log('앱이 마지막 카드까지 읽었다', 'g'); return endGame(true); }
    if (moved.length && S.cfg.flow) S.fb = { cls: 'info', title: '앱이 데이터를 읽었다', body: '버퍼에 있던 카드 ' + moved.length + '장이 앱으로 넘어가 빈 칸이 늘었다. 지금 빈 칸은 <b>' + free() + '</b>칸. 딜러에게 알려 줘야 더 보내 준다.' };
    if (S.una < S.nxt) {
      S.stall++;
      if (S.stall >= RTO_TURNS) {
        S.stall = 0; S.st.rto++; send(S.una, 'rto');
        log('딜러: 오랫동안 확인이 없어 타임아웃 → seq ' + seqOf(S.una) + ' 재전송 (느린 복구)', 'r');
      }
    } else S.stall = 0;
    if (S.cfg.spurious && S.cfg.spurious.turn === S.turn) {
      send(S.cfg.spurious.i, 'spur');
      log('딜러: 타이머가 너무 일찍 터져서 seq ' + seqOf(S.cfg.spurious.i) + ' 카드를 한 번 더 보냈다', 'v');
    }
    dealerSend();
    var arr = [], keep = [];
    S.lane.forEach(function (c) {
      if (c.arrive <= S.turn) { if (c.lost) S.poof++; else arr.push(c); }
      else keep.push(c);
    });
    S.lane = keep;
    if (S.poof) log('선로에서 카드 ' + S.poof + '장이 사라졌다 (무엇이 사라졌는지는 모른다)', 'r');
    arr.sort(function (a, b) { return a.sent - b.sent; });
    S.inbox = arr;
    if (S.inbox.length) nextCard();
    else {
      S.phase = 'wait';
      if (S.cfg.flow && !S.lane.length && S.lastRwnd < free() && S.nxt < S.n)
        S.fb = { cls: 'info', title: '딜러가 기다리고 있다', body: '딜러는 마지막으로 받은 rwnd <b>' + S.lastRwnd + '</b>만큼만 보낸다. 지금 빈 칸은 <b>' + free() + '</b>칸. rwnd를 고르고 <b>창고 업데이트 ACK</b>를 보내자.' };
      render();
    }
  }

  function nextCard() {
    S.cur = S.inbox.shift(); S.arrivals++; S.phase = 'place'; S.fresh = true;
    render();
  }

  /* ------------------------------------------------------------ 놓기 */
  function place(dest) {
    if (S.phase !== 'place' || S.over) return;
    var c = S.cards[S.cur.i], dup = have(c.i), co = coach();
    if (co && co.need && co.need !== dest) { S.fb = { cls: 'info', title: '선배', body: co.wrong || '선배가 말한 칸에 놓아 보자.' }; render(); return; }
    var top = S.found.length ? S.cards[S.found.length - 1] : null;
    var showR = S.cfg.lens !== 'var';
    if (dest === 'found') {
      if (dup) return reject('이미 받은 카드', 'seq ' + c.seq + ' 카드는 이미 정리 칸이나 버퍼에 있다. 같은 데이터가 두 번 온 것이니 <b>버림</b> 칸으로.');
      if (S.appBusy) return reject('앱이 바쁘다', '지금은 앱이 데이터를 읽지 않아 정리 칸이 잠겨 있다. <b>버퍼</b>에 보관하자.');
      if (c.i !== S.found.length) {
        var need = top ? (showR ? '정리 칸 맨 위 카드가 ' + endOf(top) + '번 바이트에서 끝나니' : '정리 칸 맨 위 카드(seq ' + top.seq + ', len ' + top.len + ')에 바로 이어지려면') : '정리 칸은 1번 바이트부터 시작하니';
        return reject('이어지지 않는다', need + ', seq ' + c.seq + ' 카드와의 사이에 <b>아직 못 받은 바이트</b>가 있다. 이 카드는 <b>버퍼</b>에 보관하자.');
      }
      S.found.push(c.i); S.score += 50;
      var mv = chain();
      S.fb = { cls: 'ok', title: '정리 칸에 놓았다', body: 'seq ' + c.seq + ' 카드가 앞 데이터에 바로 이어져 앱에게 넘어갔다.' + (mv.length ? ' 버퍼에서 기다리던 카드 ' + mv.length + '장도 줄줄이 이어붙었다!' : '') };
    } else if (dest === 'buf') {
      if (dup) return reject('이미 받은 카드', '같은 카드를 두 장 보관할 필요는 없다. <b>버림</b> 칸으로.');
      if (free() <= 0) return reject('버퍼가 꽉 찼다', '빈 칸이 없다.' + (c.i === S.found.length && !S.appBusy ? ' 이 카드는 정리 칸에 바로 놓을 수 있다.' : ' 놓을 곳이 없으니 버릴 수밖에 없다(버퍼 넘침).'));
      S.buffer.push(c.i); S.score += 30;
      if (c.i === S.found.length && !S.appBusy) { chain(); S.fb = { cls: 'info', title: '바로 이어지는 카드였다', body: '이 카드는 정리 칸에 바로 놓아도 됐다. 버퍼에서 곧장 이어붙였다.' }; }
      else S.fb = { cls: 'ok', title: '버퍼에 보관', body: S.appBusy && c.i === S.found.length ? '순서는 맞지만 앱이 바빠서 버퍼에서 기다린다. 이 카드도 <b>받은 데이터</b>이니 ACK에 포함된다.' :
        '앞에 빠진 바이트가 있어서 정리 칸에 못 놓고 보관했다. 빠진 카드가 오면 자동으로 이어붙는다.' };
    } else {
      if (dup) {
        S.st.dupDiscard++; S.score += 40;
        S.fb = { cls: 'ok', title: '중복 카드를 버렸다', body: '이미 받은 seq ' + c.seq + ' 카드가 또 왔다. 딜러가 재전송했거나 타이머가 일찍 터진 것이다. 그래도 ACK는 보내야 한다. 받았다는 소식이 딜러에게 안 갔을 수도 있으니까.' };
      } else if (free() <= 0 && !(c.i === S.found.length && !S.appBusy)) {
        S.st.overflow++; S.hearts--;
        S.fb = { cls: 'no', title: '버퍼 넘침! 카드를 잃었다 (신뢰도 −1)', body: '놓을 곳이 없어 seq ' + c.seq + ' 카드를 버렸다. 딜러가 다시 보내야 한다.' + (S.cfg.flow ? ' 딜러는 내가 알린 <b>rwnd ' + S.lastRwnd + '</b>만큼 보냈다. 빈 칸 수보다 크게 알리면 이렇게 넘친다.' : '') };
        log('버퍼 넘침: seq ' + c.seq + ' 버림', 'r');
      } else return reject('버리면 안 된다', '처음 받은 데이터다. 버리면 딜러가 다시 보내야 한다. ' + (c.i === S.found.length && !S.appBusy ? '<b>정리 칸</b>에 놓을 수 있다.' : '<b>버퍼</b>에 보관하자.'));
    }
    S.phase = 'ack'; makeOpts();
    if (S.hearts <= 0) return endGame(false);
    render();
  }
  function reject(title, body) {
    S.st.badPlace++;
    S.fb = { cls: 'no', title: title, body: body };
    NA.sfx.bad(); render();
  }

  /* ------------------------------------------------------------ ACK */
  function makeOpts() {
    var corr = seqOf(expected()), c = S.cards[S.cur.i], cand = [];
    cand.push(c.seq, c.seq + c.len, endOf(c), corr - 1);
    S.buffer.forEach(function (i) { cand.push(S.cards[i].seq + S.cards[i].len); });
    if (S.found.length) cand.push(S.cards[S.found.length - 1].seq);
    cand = cand.filter(function (v, k, a) { return v > 0 && v !== corr && a.indexOf(v) === k; });
    cand.sort(function (a, b) { return Math.abs(a - corr) - Math.abs(b - corr); });
    S.opts = NA.shuffle([corr].concat(NA.shuffle(cand.slice(0, 4)).slice(0, 2)));
    S.badOpts = {};
  }

  function sendAck(v, opts) {
    if (S.over) return;
    var winUpd = opts && opts.winUpd;
    var corr = seqOf(expected()), co = coach();
    if (!winUpd) {
      if (S.phase !== 'ack') return;
      if (co && co.ack && v !== corr) { S.fb = { cls: 'info', title: '선배', body: co.wrongAck || 'ACK는 다음에 필요한 바이트 번호야.' }; render(); return; }
      if (v > corr) {
        S.st.lies++; S.hearts--; S.badOpts[v] = 1;
        S.fb = { cls: 'no', title: '거짓 ACK! (신뢰도 −1)', body: 'ACK ' + v + '는 "' + (v - 1) + '번 바이트까지 다 받았다"는 뜻이다. 그런데 ' + corr + '번 바이트부터는 아직 없다. 딜러가 믿고 그 데이터를 지워 버리면 영원히 사라진다. 다시 고르자.' };
        log('거짓 ACK ' + v + ' 시도 (막음)', 'r');
        NA.sfx.bad();
        if (S.hearts <= 0) return endGame(false);
        return render();
      }
    }
    var isDup = !winUpd && S.lastAck === v && v === corr;
    dealerAck(v, S.rwnd, winUpd);
    var frNow = S.fb && S.fb.title === '빠른 재전송 발동!';
    if (winUpd) {
      S.st.winUpd++;
      S.fb = { cls: 'ok', title: '창고 업데이트 ACK', body: '같은 ACK ' + v + '에 rwnd <b>' + S.rwnd + '</b>만 새로 실어 보냈다. 딜러는 이걸 중복 ACK로 세지 않고, 보낼 수 있는 양만 다시 계산한다.' };
      log('창고 업데이트: ACK ' + v + ', rwnd ' + S.rwnd, 'g');
    } else if (v < corr) {
      S.st.stale++; S.score = Math.max(0, S.score - 30);
      S.fb = { cls: 'no', title: '낡은 ACK', body: 'ACK ' + v + '는 이미 받은 바이트를 다시 달라는 뜻이다. 실제로는 ' + corr + '번 바이트부터 필요했다. 딜러가 헷갈려 쓸데없이 카드를 다시 보낼 수 있다.' };
      log('ACK ' + v + ' (낡음, 정답 ' + corr + ')', 'r');
      NA.sfx.bad();
    } else {
      S.st.acks++; S.score += 100;
      if (isDup) S.st.dup++;
      if (!frNow) S.fb = { cls: 'ok', title: isDup ? '중복 ACK ' + v : 'ACK ' + v + ' ✓', body: isDup ?
        '아직 ' + v + '번 바이트가 빠져 있으니 같은 번호를 다시 보냈다. 딜러의 중복 ACK 카운터: <b>' + Math.min(3, S.dup) + '/3</b>.' :
        (v - 1) + '번 바이트까지 빠짐없이 받았다는 뜻이다. 딜러는 그 앞의 카드를 모두 확인 완료로 친다.' };
      log((isDup ? '중복 ' : '') + 'ACK ' + v + (S.cfg.flow ? ' (rwnd ' + S.rwnd + ')' : ''), isDup ? 'v' : 'g');
      NA.sfx.good();
    }
    if (!winUpd) S.lastAck = v;
    if (S.cfg.flow && S.rwnd > free()) log('주의: 빈 칸은 ' + free() + '칸인데 rwnd ' + S.rwnd + '를 알렸다', 'r');
    S.cur = null; S.opts = [];
    if (S.found.length >= S.n && S.lastAck === S.total) return endGame(true);
    if (winUpd) return render();
    if (S.inbox.length) nextCard(); else beginTurn();
  }

  /* ------------------------------------------------------------ 튜토리얼 */
  function coach() {
    if (!S || !S.cfg.coach) return null;
    var a = S.arrivals, ph = S.phase;
    if (ph === 'wait' && a <= 4) return { msg: '이번 턴엔 도착한 카드가 없다. 위 <b>선로</b>를 봐. 카드가 아직 오는 중이야. 그냥 <b>다음 턴</b>을 누르면 돼.' };
    var M = {
      1: { place: { need: 'found', msg: '첫 카드가 도착했어! <b>seq 1, len 100</b> → 1~100번 바이트야. 정리 칸은 1번 바이트부터 받으니 <b>정리 칸</b>을 눌러 놓아 봐.' },
           ack: { ack: true, msg: '이제 딜러에게 ACK를 보내. <b>ACK = 다음에 필요한 바이트 번호</b>. 1~100을 받았으니 다음에 필요한 건 <b>101</b>번 바이트야.', wrongAck: '1~100번을 받았어. 그다음 바이트 번호는?' } },
      2: { place: { need: 'found', msg: 'seq 101 카드. 정리 칸 맨 위 카드가 100번에서 끝나니 딱 이어져. <b>정리 칸</b>에.' },
           ack: { ack: true, msg: '정리 칸 끝이 200번이야. 다음에 필요한 바이트는?', wrongAck: '정리 칸 맨 위 카드의 끝 번호 + 1 이야.' } },
      3: { place: { need: 'buf', msg: '어? <b>seq 301</b>이 먼저 왔어. 정리 칸은 201번 바이트가 필요해서 이 카드를 못 받아. <b>버퍼</b>에 보관해.', wrong: '정리 칸은 201번 바이트로 시작하는 카드만 받아. 301은 <b>버퍼</b>로.' },
           ack: { ack: true, msg: '301~400을 받긴 했지만 201~300이 비어 있어. ACK는 "여기까지 빠짐없이"만 말할 수 있으니 여전히 <b>201</b>. 같은 번호를 또 보내는 걸 <b>중복 ACK</b>라고 해.', wrongAck: '빠짐없이 받은 건 200번까지야. 그러니 다음에 필요한 건 201.' } },
      4: { place: { need: 'found', msg: '드디어 <b>seq 201</b>! 정리 칸에 놓으면 버퍼의 301 카드가 자동으로 이어붙어.' },
           ack: { ack: true, msg: '이제 정리 칸이 400번까지 이어졌어. ACK <b>401</b> 하나로 두 장을 한꺼번에 확인해. 이게 <b>누적 ACK</b>야.', wrongAck: '정리 칸 맨 위 카드가 이제 301~400이야.' } }
    };
    if (M[a]) return M[a][ph === 'ack' ? 'ack' : 'place'];
    if (a === 5 && ph === 'place') return { msg: '이제 혼자 해 봐! 단축키: <span class="key">Q</span> 정리 칸 <span class="key">W</span> 버퍼 <span class="key">E</span> 버림 <span class="key">1</span><span class="key">2</span><span class="key">3</span> ACK <span class="key">N</span> 다음 턴' };
    return null;
  }

  /* ------------------------------------------------------------ 시작/끝 */
  function startStage(si) {
    S = newState(si);
    NA.ui.briefing(ov, 'STAGE ' + (si + 1) + ' · ' + S.cfg.title, S.cfg.brief, function () {
      send(0, null); S.nxt = 1;
      log('딜러가 첫 카드를 선로에 올렸다', '');
      beginTurn();
    });
  }
  function endGame(win) {
    if (S.over) return;
    S.over = true; render();
    if (win) NA.sfx.win(); else NA.sfx.lose();
    var st = S.st, stars = !win ? 0 : S.hearts >= 5 ? 3 : S.hearts >= 3 ? 2 : 1;
    var notes = {
      'W3-7': '구멍이 메워질 때까지 같은 ACK를 ' + st.dup + '번 반복했고, 딜러는 3번째 중복 ACK에서 빠른 재전송을 ' + st.fr + '번 했다. 타임아웃 재전송은 ' + st.rto + '번.',
      'W3-6': '버퍼가 넘친 것 ' + st.overflow + '번, 창고 업데이트 ' + st.winUpd + '번. rwnd로 빈 칸 수를 알려 딜러를 늦춘 것이 흐름 제어다. 보호 대상은 네트워크가 아니라 내 버퍼(수신자)였다.'
    };
    setTimeout(function () {
      NA.ui.debrief({
        overlay: ov, gameId: GAME_ID, stage: S.si, win: win, stars: stars, score: S.score,
        title: win ? '모든 카드 정리 완료!' : '오늘은 여기까지',
        sub: win ? S.turn + '턴 만에 ' + S.n + '장을 앱에 넘겼다. 남은 신뢰도 ' + S.hearts + '/5.' : '신뢰도가 바닥났다. 해설을 보고 다시 해 보자.',
        stats: [['점수', S.score], ['정확한 ACK', st.acks], ['중복 ACK', st.dup], ['빠른 재전송', st.fr], ['타임아웃', st.rto], ['거짓 ACK', st.lies]],
        qc: S.cfg.qc, playNotes: notes,
        onRetry: function () { startStage(S.si); },
        onNext: S.si + 1 < STAGES.length ? function () { startStage(S.si + 1); } : null,
        onMenu: menu
      });
    }, 700);
  }
  function menu() {
    S = null; app.innerHTML = '';
    NA.ui.renderTags(GAME_ID);
    NA.ui.stageMenu({
      overlay: ov, gameId: GAME_ID, stages: STAGES, onPick: startStage,
      howto: '나는 <b>수신자</b>. 카드(세그먼트)가 한 장씩 도착하면 <b>놓고</b>, <b>ACK</b>를 보낸다. <b>시간 제한 없음.</b><br>' +
        '<b>정리 칸</b> = 앱에 순서대로 넘김 · <b>버퍼</b> = 순서가 안 맞는 카드 보관 · <b>버림</b> = 중복 카드<br>' +
        '<b>ACK = 다음에 필요한 바이트 번호.</b> 같은 ACK를 3번 더 보내면(중복 ACK 3개) 딜러가 빠진 카드를 빠른 재전송한다.'
    });
  }

  /* ------------------------------------------------------------ 렌더 */
  function cardHTML(i, cls) {
    var c = S.cards[i], showR = S.cfg.lens !== 'var';
    return '<div class="card ' + (cls || '') + '"><span class="s">seq</span><span class="seq">' + c.seq + '</span>' +
      '<span class="len">len ' + c.len + '</span><span class="rng">' + (showR ? c.seq + ' ~ ' + endOf(c) : '끝 = ?') + '</span></div>';
  }

  function render() {
    if (!S) return;
    var cfg = S.cfg, co = coach();
    var h = '';
    for (var k = 0; k < 5; k++) h += k < S.hearts ? '♥' : '<i>♥</i>';
    var html = '<div class="bar"><span class="st">STAGE ' + (S.si + 1) + '<small>' + esc(cfg.title) + '</small></span>' +
      '<span class="hearts">' + h + '</span><span class="cnt">턴 ' + S.turn + ' · 앱에 넘김 ' + S.found.length + ' / ' + S.n + '</span>' +
      '<span class="sp"></span><button class="na-btn" data-guide>규칙</button></div>';
    html += '<div class="layout"><div class="main"><div class="row1">';

    // 딜러
    var out = S.nxt - S.una;
    html += '<div class="zone"><h3><span>송신자 (딜러)</span><span>보낸 카드 ' + S.nxt + ' / ' + S.n + '</span></h3><div class="dealer">' +
      '<span class="who">🃏 딜러</span>' +
      '<span class="stat">확인받은 곳<br><b>' + (S.una > 0 ? seqOf(S.una) - 1 + '번까지' : '아직 없음') + '</b></span>' +
      '<span class="stat">확인 대기<br><b>' + out + '장</b></span>' +
      '<span class="stat">중복 ACK<span class="dots">' + [0, 1, 2].map(function (d) { return '<i class="' + (d < S.dup ? 'on' : '') + '"></i>'; }).join('') + '</span></span>' +
      '<span class="stat">타임아웃까지<br><b>' + (out ? (RTO_TURNS - S.stall) + '턴' : '-') + '</b></span>' +
      (cfg.flow ? '<span class="stat">받은 rwnd<br><b>' + S.lastRwnd + '</b></span>' : '') +
      '</div></div>';

    // 선로
    html += '<div class="zone"><h3><span>선로 (네트워크)</span><span>뒤집힌 카드는 아직 이동 중</span></h3><div class="lane">';
    if (!S.lane.length) html += '<span class="empty">이동 중인 카드 없음</span>';
    S.lane.slice().sort(function (a, b) { return a.arrive - b.arrive; }).forEach(function (c) {
      html += '<div class="cardback' + (c.retx ? ' retx' : '') + '">' + (c.retx ? '재' : '') + '</div>';
    });
    if (S.poof) html += '<span class="poof">💨 이번 턴에 카드 ' + S.poof + '장이 사라졌다</span>';
    html += '</div></div></div>';

    // 테이블
    var placing = S.phase === 'place' && !S.over;
    var need = co && co.need;
    function zcls(dest) { var c = 'zone' + (placing ? ' target' : ''); if (need && placing) c += need === dest ? ' pulse' : ' lock'; return c; }
    html += '<div class="row2"><div class="zone inbox"><h3><span>도착한 카드</span></h3>';
    if (S.cur) html += cardHTML(S.cur.i, 'big' + (S.cur.retx ? ' retx' : '') + (S.fresh ? ' in' : '')) +
      '<div class="hint">' + (S.phase === 'place' ? '어디에 놓을까?' : '놓았다. 이제 ACK') + (S.inbox.length ? '<br>이번 턴에 ' + S.inbox.length + '장 더 도착' : '') + '</div>';
    else html += '<div class="slot bigslot">' + (S.phase === 'wait' ? '도착 없음' : '') + '</div>';
    html += '</div><div class="midcol">';

    // 정리 칸
    var top = S.found.length ? S.found[S.found.length - 1] : -1;
    html += '<div class="' + zcls('found') + '" data-dest="found"><h3><span>정리 칸 → 앱 <span class="key">Q</span></span><span class="' + (S.appBusy ? 'app-busy' : 'app-free') + '">' + (S.appBusy ? '앱 바쁨 (잠김)' : '앱이 읽는 중') + '</span></h3><div class="found">';
    if (top >= 0) {
      html += '<div class="pile">' + (S.found.length > 2 ? cardHTML(S.found[S.found.length - 3], 'under2') : '') + (S.found.length > 1 ? cardHTML(S.found[S.found.length - 2], 'under') : '') + cardHTML(top) + '</div>';
      html += '<div class="info">앱에 넘긴 카드 <b>' + S.found.length + '</b>장<br>맨 위 카드: seq ' + S.cards[top].seq + ', len ' + S.cards[top].len + '</div>';
    } else html += '<div class="slot" style="width:112px;height:150px">1번 바이트부터</div><div class="info">아직 비어 있다</div>';
    html += '</div></div>';
    html += '<div class="' + zcls('trash') + ' trashzone" data-dest="trash"><h3><span>버림 <span class="key">E</span></span></h3><div class="trash">🗑️ 중복 카드, 또는 놓을 곳이 없는 카드</div></div></div>';

    // 버퍼
    var cap = cfg.cap;
    html += '<div class="' + zcls('buf') + '" data-dest="buf"><h3><span>버퍼 (수신 버퍼) <span class="key">W</span></span><span>빈 칸 <b>' + free() + '</b> / ' + cap + '</span></h3><div class="buf">';
    var sorted = S.buffer.slice().sort(function (a, b) { return a - b; });
    for (var s = 0; s < cap; s++) html += s < sorted.length ? cardHTML(sorted[s], 'mini') : '<div class="slot">빈 칸</div>';
    html += '</div></div>';

    html += '</div>';

    // ACK / 대기
    if (S.phase === 'ack' && !S.over) {
      html += '<div class="zone ackpanel"><h3><span>딜러에게 ACK 보내기</span><span>ACK = 다음에 필요한 바이트 번호</span></h3><div class="acks">';
      S.opts.forEach(function (v, i) {
        var pulse = co && co.ack && v === seqOf(expected()) ? ' pulse' : '';
        html += '<button class="ackbtn' + pulse + '" data-ack="' + v + '"' + (S.badOpts[v] ? ' disabled' : '') + '>[' + (i + 1) + '] ACK ' + v + '</button>';
      });
      html += '</div>' + (cfg.flow ? rwndHTML() : '') + '</div>';
    } else if (S.phase === 'wait' && !S.over) {
      html += '<div class="zone ackpanel"><h3><span>이번 턴엔 도착한 카드가 없다</span></h3><div class="waitbox">' +
        '<button class="na-btn primary" data-turn>다음 턴 ▶ <span style="opacity:.6">[N]</span></button>' +
        (cfg.flow && S.lastAck != null ? '<button class="na-btn" data-winupd>창고 업데이트 ACK ' + S.lastAck + ' 보내기</button>' : '') +
        '</div>' + (cfg.flow && S.lastAck != null ? rwndHTML() : '') + '</div>';
    } else html += '<div class="zone ackpanel idle"><h3><span>딜러에게 ACK 보내기</span></h3><div class="waitbox">' + (S.over ? '' : '먼저 도착한 카드를 놓자.') + '</div></div>';
    html += '</div>';

    // 옆 패널
    html += '<div class="side">';
    if (co && co.msg) html += '<div class="coach"><span class="who">선배 카드 정리사</span>' + co.msg + '</div>';
    if (S.fb) html += '<div class="feedback ' + S.fb.cls + '"><h4>' + S.fb.title + '</h4>' + S.fb.body + '</div>';
    html += '<div class="log">' + S.log.slice(0, 12).map(function (l) { return '<div class="' + l.c + '"><span class="t">T' + l.t + '</span>' + esc(l.s) + '</div>'; }).join('') + '</div>';
    html += '</div></div>';

    app.innerHTML = html;
    S.fresh = false;
    bind();
  }
  function rwndHTML() {
    var h = '<div class="rwnd">알릴 rwnd (빈 칸 수): ';
    for (var r = 0; r <= S.cfg.cap; r++) h += '<button data-rwnd="' + r + '" class="' + (r === S.rwnd ? 'on' : '') + '">' + r + '</button>';
    return h + ' <span style="color:#9fc7b3">↑↓로도 바꿀 수 있다</span></div>';
  }

  function guide() {
    ov.innerHTML = '<div class="na-card guide"><h2>패킷 솔리테어 규칙</h2>' +
      '<h4>카드 읽기</h4><p>seq = 카드의 첫 바이트 번호, len = 바이트 수. 마지막 바이트 = seq + len − 1. 순서번호는 카드 장수가 아니라 <b>바이트</b>를 센다.</p>' +
      '<h4>놓기</h4><ul><li><b>정리 칸</b>: 앞 데이터에 바로 이어지는 카드만. 놓으면 앱에게 넘어간다.</li>' +
      '<li><b>버퍼</b>: 앞에 빠진 바이트가 있는 카드를 보관. 빠진 카드가 오면 자동으로 이어붙는다.</li>' +
      '<li><b>버림</b>: 이미 받은 카드(중복). 놓을 곳이 없으면 어쩔 수 없이 버리지만 그건 데이터 손실이다.</li></ul>' +
      '<h4>ACK</h4><p>"여기까지 빠짐없이 받았으니 <b>이 바이트부터</b> 보내 줘". 구멍이 있으면 구멍의 시작 번호를 계속 보낸다(중복 ACK). 아직 없는 데이터를 받았다고 하면 거짓 ACK다.</p>' +
      '<h4>딜러(송신자)</h4><p>중복 ACK 3개(같은 번호가 3번 더) → 빠른 재전송. ACK가 오랫동안 진전이 없으면 ' + RTO_TURNS + '턴 뒤 타임아웃 재전송(느림). 한 번에 확인 대기 카드는 최대 ' + S.cfg.win + '장(윈도우).</p>' +
      (S.cfg.flow ? '<h4>rwnd</h4><p>ACK와 함께 버퍼의 빈 칸 수를 알린다. 딜러는 확인받은 곳부터 rwnd장까지만 보낸다. 흐름 제어 = 수신자의 버퍼를 보호.</p>' : '') +
      '<div class="na-row"><button class="na-btn primary" data-close>닫기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-close]').onclick = function () { ov.hidden = true; };
  }

  function bind() {
    app.querySelectorAll('[data-dest]').forEach(function (z) { z.onclick = function () { place(z.dataset.dest); }; });
    app.querySelectorAll('[data-ack]').forEach(function (b) { b.onclick = function () { sendAck(+b.dataset.ack); }; });
    app.querySelectorAll('[data-rwnd]').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); S.rwnd = +b.dataset.rwnd; render(); }; });
    var t = app.querySelector('[data-turn]'); if (t) t.onclick = beginTurn;
    var w = app.querySelector('[data-winupd]'); if (w) w.onclick = function () { sendAck(S.lastAck, { winUpd: true }); };
    var g = app.querySelector('[data-guide]'); if (g) g.onclick = guide;
  }

  document.addEventListener('keydown', function (e) {
    if (!S || S.over || !ov.hidden) return;
    NA.sfx.unlock();
    var k = e.key.toLowerCase();
    if (S.phase === 'place') { if (k === 'q') place('found'); else if (k === 'w') place('buf'); else if (k === 'e') place('trash'); }
    else if (S.phase === 'ack') { var n = parseInt(k, 10); if (n >= 1 && n <= S.opts.length) sendAck(S.opts[n - 1]); }
    else if (S.phase === 'wait' && (k === 'n' || k === 'enter')) { e.preventDefault(); beginTurn(); }
    if (S.cfg.flow && (k === 'arrowup' || k === 'arrowdown')) { e.preventDefault(); S.rwnd = Math.max(0, Math.min(S.cfg.cap, S.rwnd + (k === 'arrowup' ? 1 : -1))); render(); }
  });
  document.addEventListener('pointerdown', function () { NA.sfx.unlock(); });

  window.__game = { state: function () { return S; }, start: startStage, place: place, ack: sendAck, turn: beginTurn,
    correct: function () { return seqOf(expected()); }, have: function (i) { return have(i); }, free: free,
    winUpd: function () { sendAck(S.lastAck, { winUpd: true }); } };
  menu();
})();
