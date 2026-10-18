/* 주소 블록 퍼즐 — Week 2 Quick Check W2-2(브로드캐스트·호스트 수)
 *
 * 턴제. 시간 제한 없음.
 * 주소판(16×16)에 서브넷 블록을 놓는다.
 *   1) 요청서(호스트 N대)를 보고 블록 크기(프리픽스)를 고른다: 호스트 수 = 2^(32−p) − 2
 *   2) 주소판에 놓는다: 블록은 자기 크기의 배수 번지에서만 시작할 수 있다(경계 정렬)
 *   3) 놓은 블록에 대한 짧은 퀴즈(브로드캐스트, 호스트 수, 첫/마지막 호스트)
 */
(function () {
  var GAME_ID = 'block-puzzle';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));
  var COLORS = ['#4de2ff', '#ffc94d', '#5dffa0', '#b18cff', '#ff8ad8', '#ff9f5a', '#7aa7ff', '#c8f05a'];

  function ip2i(s) { var p = s.split('.').map(Number); return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]; }
  function i2ip(n) { n = n >>> 0; return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }

  function R(who, hosts, note) { return { who: who, hosts: hosts, note: note || '' }; }
  var STAGES = [
    { title: '블록 크기 익히기', desc: '호스트 수에 맞는 가장 작은 블록을 고르고, 경계에 맞춰 놓는다.', qc: ['W2-2'],
      base: '192.168.10.0', bp: 24, coach: true,
      reqs: [R('💼 영업팀', 50, 'PC와 노트북'), R('🛠️ 개발팀', 20, '개발 서버 포함'), R('🗣️ 회의실', 10, '회의실 무선'), R('🗄️ 서버실', 100, '서버와 스토리지')],
      brief: '주소판 한 칸 = 주소 1개. 16×16 = <b>192.168.10.0/24</b>의 256개 주소다.<br>' +
        '팀마다 서브넷 블록을 하나씩 나눠 준다. 블록 크기는 <b>2의 거듭제곱</b>이고 프리픽스로 정해진다: /26 = 2^(32−26) = 64칸.<br>' +
        '블록의 첫 주소(네트워크 주소)와 마지막 주소(브로드캐스트)는 장비에 줄 수 없어서 <b>호스트 수 = 칸 수 − 2</b>.<br>' +
        '시간 제한은 없다. 오른쪽 선배를 따라 해 보자.' },
    { title: '빈자리 찾기', desc: '이미 쓰는 블록 사이에서 경계가 맞는 빈자리를 찾는다.', qc: ['W2-2'],
      base: '172.16.5.0', bp: 24,
      pre: [{ start: 32, p: 27, label: '기존 프린터망' }, { start: 128, p: 28, label: '기존 CCTV' }, { start: 200, p: 29, label: '기존 VPN' }],
      reqs: [R('📞 콜센터', 60), R('🎨 디자인팀', 25), R('🧪 연구실', 12), R('📡 무선 AP', 5, 'AP 장비 5대'), R('🔗 라우터 링크 A', 2, '라우터 2대를 잇는 선'), R('🔗 라우터 링크 B', 2, '라우터 2대를 잇는 선')],
      brief: '회색 블록은 이미 다른 팀이 쓰고 있다. 그 사이의 빈자리에 새 블록을 놓는다.<br>' +
        '블록은 <b>자기 크기의 배수 번지</b>에서만 시작할 수 있다. /27(32칸)은 .0, .32, .64, .96 … 에서만.<br>' +
        '블록을 고르면 놓을 수 있는 시작 칸에 <b>노란 점</b>이 찍힌다.<br>' +
        '라우터 두 대만 잇는 링크에는 /30(호스트 2대)이 딱 맞는다.' },
    { title: '빈틈없이 채우기', desc: '요청 7개를 256칸에 정확히 채운다. 순서를 잘못 정하면 자리가 쪼개진다.', qc: ['W2-2'],
      base: '10.10.10.0', bp: 24, free: true,
      reqs: [R('🏭 생산 라인', 120), R('📦 물류팀', 50), R('🧾 회계팀', 25), R('🔐 보안팀', 10), R('🖨️ 프린터 모음', 4), R('🔗 본사 링크', 2), R('🔗 지사 링크', 2)],
      brief: '요청 7개의 블록을 모두 합치면 <b>정확히 256칸</b>이다. 하나도 낭비하면 안 된다.<br>' +
        '이번엔 <b>요청 순서를 직접 고른다</b>. 왼쪽 목록에서 요청을 누른 뒤 블록을 놓는다.<br>' +
        '작은 블록을 아무 데나 먼저 놓으면 큰 블록이 들어갈 경계 자리가 쪼개질 수 있다. 막히면 <b>되돌리기</b>.' },
    { title: 'VPC 설계', desc: '10.0.0.0/16 VPC를 /24 단위로 나눠 가용 영역 두 곳에 서브넷을 배치한다.', qc: ['W2-2'],
      base: '10.0.0.0', bp: 16,
      reqs: [R('🌐 퍼블릭 AZ-a', 200, '로드밸런서·NAT'), R('🌐 퍼블릭 AZ-b', 200, '로드밸런서·NAT'), R('⚙️ 앱 AZ-a', 1000, 'API 서버'), R('⚙️ 앱 AZ-b', 1000, 'API 서버'),
        R('🗃️ DB AZ-a', 400, '데이터베이스'), R('🗃️ DB AZ-b', 400, '데이터베이스'), R('📈 확장 예비', 4000, '나중을 위해 비워 둘 큰 영역')],
      brief: '이제 주소판 한 칸 = <b>/24 하나(256개 주소)</b>. 16×16 = <b>10.0.0.0/16</b>, 6만 5천여 개 주소다(강의 2주차 VPC 설계).<br>' +
        '같은 규칙이 그대로 쓰인다: /22 = 2^10 = 1024개 주소 = 4칸, 시작은 4칸의 배수.<br>' +
        '가용 영역(AZ) 두 곳에 같은 크기 서브넷을 짝지어 놓는다. (참고: 실제 AWS는 서브넷마다 주소 5개를 예약한다.)' }
  ];

  var S = null;

  /* ------------------------------------------------------------ 상태 */
  function newState(si) {
    var cfg = STAGES[si];
    var st = {
      si: si, cfg: cfg, base: ip2i(cfg.base), unit: cfg.bp === 24 ? 1 : 256,
      cells: new Array(256).fill(null), blocks: [], reqs: cfg.reqs.map(function (r) { return { who: r.who, hosts: r.hosts, note: r.note, done: false, bid: null }; }),
      cur: cfg.free ? -1 : 0, sel: null, phase: cfg.free ? 'choose' : 'pick', quiz: null, hover: null, fb: null, bid: 0, cstep: 0,
      st: { mistakes: 0, small: 0, misalign: 0, overlap: 0, over: 0, quizOk: 0, quizBad: 0, undo: 0 }
    };
    S = st;
    (cfg.pre || []).forEach(function (b) { addBlock(b.start, b.p, b.label, true); });
    return st;
  }
  function tray() { return S.cfg.bp === 24 ? [25, 26, 27, 28, 29, 30] : [20, 21, 22, 23, 24]; }
  function sizeOf(p) { return Math.pow(2, 32 - p); }
  function cellsOf(p) { return sizeOf(p) / S.unit; }
  function hostsOf(p) { return sizeOf(p) - 2; }
  function addrOf(cell) { return (S.base + cell * S.unit) >>> 0; }
  function short(cell) { return S.unit === 1 ? '.' + (addrOf(cell) & 255) : i2ip(addrOf(cell)); }
  function bestP(h) { var t = tray(), b = null; t.forEach(function (p) { if (hostsOf(p) >= h && (b === null || p > b)) b = p; }); return b; }
  function canStart(start, n) {
    if (start % n !== 0 || start + n > 256) return false;
    for (var i = start; i < start + n; i++) if (S.cells[i] !== null) return false;
    return true;
  }
  function addBlock(start, p, label, pre) {
    var n = cellsOf(p), id = ++S.bid;
    for (var i = start; i < start + n; i++) S.cells[i] = id;
    var b = { id: id, start: start, p: p, n: n, label: label, pre: !!pre, color: pre ? null : COLORS[(id - 1) % COLORS.length] };
    S.blocks.push(b);
    return b;
  }
  function removeBlock(b) {
    for (var i = b.start; i < b.start + b.n; i++) S.cells[i] = null;
    S.blocks.splice(S.blocks.indexOf(b), 1);
  }
  function cidr(b) { return i2ip(addrOf(b.start)) + '/' + b.p; }

  /* ------------------------------------------------------------ 튜토리얼 */
  function coach() {
    if (!S || !S.cfg.coach) return null;
    var done = S.reqs.filter(function (r) { return r.done; }).length;
    if (done === 0) {
      if (S.phase === 'pick') return { need: 26, msg: '첫 요청: <b>영업팀 50대</b>. 블록 목록을 봐. /27은 32칸 → 호스트 <b>30대</b>라 부족해. /26은 64칸 → 호스트 <b>62대</b>. 50대가 들어가는 가장 작은 블록은 <b>/26</b>이야. 눌러 봐.' };
      if (S.phase === 'place') return { cell: 0, msg: '보드에 <b>노란 점</b>이 찍힌 칸이 /26 블록이 시작할 수 있는 곳이야: .0, .64, .128, .192. 64칸짜리 블록은 <b>64의 배수</b>에서만 시작해. 맨 위 <b>.0</b> 칸을 눌러 놓아 봐.' };
      if (S.phase === 'quiz') return { msg: '블록이 생겼어: 192.168.10.0/26. 이 블록의 마지막 주소가 <b>브로드캐스트</b>야. 시작 0 + 64칸 − 1 = ?' };
    }
    if (done === 1 && S.phase === 'pick') return { msg: '이번엔 혼자 골라 봐. <b>개발팀 20대</b>. 호스트 + 2(네트워크·브로드캐스트) = 22칸 이상인 가장 작은 블록은? 단축키 <span class="key">1</span>~<span class="key">6</span>.' };
    if (done === 1 && S.phase === 'place') return { msg: '노란 점 중 아무 데나 괜찮아. 다만 큰 블록(서버실 100대 → /25, 128칸)이 들어갈 <b>.128 자리</b>를 남겨 두면 좋아.' };
    return null;
  }

  /* ------------------------------------------------------------ 행동 */
  function chooseReq(i) {
    if (S.phase !== 'choose' && S.phase !== 'pick') return;
    if (S.reqs[i].done) return;
    S.cur = i; S.sel = null; S.phase = 'pick';
    S.fb = { cls: 'info', title: S.reqs[i].who + ' 요청 선택', body: '호스트 <b>' + S.reqs[i].hosts + '대</b>. 맞는 블록 크기를 고르자.' };
    render();
  }
  function pick(p) {
    if (S.phase !== 'pick' && S.phase !== 'place') return;
    var c = coach();
    if (c && c.need && p !== c.need) { S.fb = { cls: 'info', title: '선배', body: '50대가 들어가는 가장 작은 블록을 골라 보자. /27은 30대, /26은 62대야.' }; render(); return; }
    var r = S.reqs[S.cur], best = bestP(r.hosts);
    if (hostsOf(p) < r.hosts) {
      S.st.mistakes++; S.st.small++;
      S.fb = { cls: 'no', title: '/' + p + '는 너무 작다', body: '/' + p + ' = ' + sizeOf(p) + '개 주소 → 호스트 <b>' + hostsOf(p) + '대</b>까지. ' + r.hosts + '대가 필요하다. (첫 주소 = 네트워크 주소, 마지막 = 브로드캐스트라서 2개를 뺀다.)' };
      NA.sfx.bad(); render(); return;
    }
    S.sel = p; S.phase = 'place';
    var starts = 0; for (var i = 0; i < 256; i++) if (canStart(i, cellsOf(p))) starts++;
    if (p !== best) S.fb = { cls: 'info', title: '/' + p + ' 선택 (더 작게 가능)', body: '/' + best + '(' + sizeOf(best) + '개, 호스트 ' + hostsOf(best) + '대)로도 충분하다. /' + p + '로 놓으면 주소 <b>' + (sizeOf(p) - sizeOf(best)) + '개</b>를 더 쓴다. 다른 블록을 골라도 된다.' };
    else S.fb = { cls: 'ok', title: '/' + p + ' 선택', body: sizeOf(p) + '개 주소 → 호스트 ' + hostsOf(p) + '대. ' + r.hosts + '대가 들어가는 가장 작은 블록이다. 노란 점 칸에 놓자.' };
    if (!starts) S.fb = { cls: 'no', title: '놓을 자리가 없다', body: '/' + p + ' 블록이 시작할 수 있는 빈 경계 자리가 남아 있지 않다. 앞에서 놓은 블록이 자리를 쪼갰다. <b>되돌리기</b>로 다시 배치해 보자.' };
    NA.sfx.pop(); render();
  }
  function place(cell) {
    if (S.phase !== 'place' || S.sel == null) return;
    var c = coach();
    if (c && c.cell != null && cell !== c.cell) { S.fb = { cls: 'info', title: '선배', body: '이번엔 맨 위 <b>.0</b> 칸에 놓아 보자.' }; render(); return; }
    var n = cellsOf(S.sel);
    if (!canStart(cell, n)) {
      S.st.mistakes++;
      if (cell % n !== 0) {
        S.st.misalign++;
        var lo = cell - cell % n, hi = lo + n;
        S.fb = { cls: 'no', title: '경계가 맞지 않는다', body: '/' + S.sel + ' 블록(' + n + '칸)은 <b>' + n + '의 배수</b> 칸에서만 시작할 수 있다. ' + short(cell) + '은 안 되고, 가까운 시작은 <b>' + short(lo) + '</b> 또는 <b>' + (hi < 256 ? short(hi) : '없음') + '</b>.<br>그래야 블록의 첫 주소에서 호스트 비트가 전부 0(네트워크 주소)이 된다.' };
      } else if (cell + n > 256) {
        S.fb = { cls: 'no', title: '주소판 밖', body: '블록이 주소판 끝을 넘어간다.' };
      } else {
        S.st.overlap++;
        S.fb = { cls: 'no', title: '이미 쓰는 주소와 겹친다', body: '같은 주소를 두 서브넷이 나눠 쓸 수는 없다. 다른 노란 점 자리를 찾자.' };
      }
      NA.sfx.bad(); render(); return;
    }
    var r = S.reqs[S.cur];
    var b = addBlock(cell, S.sel, r.who, false);
    r.done = true; r.bid = b.id;
    if (S.sel !== bestP(r.hosts)) S.st.over++;
    S.quiz = makeQuiz(b); S.phase = 'quiz'; S.hover = null;
    S.fb = null; NA.sfx.good(); render();
  }
  function undo() {
    var mine = S.blocks.filter(function (b) { return !b.pre; });
    if (!mine.length || S.phase === 'quiz') return;
    var b = mine[mine.length - 1];
    S.reqs.forEach(function (r) { if (r.bid === b.id) { r.done = false; r.bid = null; if (!S.cfg.free) S.cur = S.reqs.indexOf(r); } });
    removeBlock(b); S.st.undo++;
    S.sel = null; S.phase = S.cfg.free ? 'choose' : 'pick';
    if (S.cfg.free) S.cur = -1;
    S.fb = { cls: 'info', title: '되돌렸다', body: cidr(b) + ' 블록을 치웠다. 다시 배치해 보자.' };
    render();
  }

  /* ------------------------------------------------------------ 퀴즈 */
  function makeQuiz(b) {
    var net = addrOf(b.start), size = sizeOf(b.p);
    var Q = {
      bc: { q: '이 블록의 브로드캐스트 주소는?', a: i2ip(net + size - 1), w: [i2ip(net + size), i2ip(net + size - 2), i2ip(net + size / 2 - 1)],
        why: '시작 ' + i2ip(net) + ' + ' + size + '개 − 1 = <b>' + i2ip(net + size - 1) + '</b>. 호스트 비트가 전부 1인 주소다.' },
      hosts: { q: '이 블록에 둘 수 있는 호스트는 몇 대?', a: String(size - 2), w: [String(size), String(size - 1), String(size / 2 - 2)],
        why: '2^(32−' + b.p + ') = ' + size + '개 주소에서 네트워크 주소와 브로드캐스트를 빼면 <b>' + (size - 2) + '대</b>.' },
      first: { q: '이 블록에서 장비에 줄 수 있는 첫 주소는?', a: i2ip(net + 1), w: [i2ip(net), i2ip(net + 2), i2ip(net + size - 1)],
        why: '첫 주소 ' + i2ip(net) + '은 네트워크 주소(호스트 비트 전부 0)라 장비에 줄 수 없다. 그다음인 <b>' + i2ip(net + 1) + '</b>부터.' },
      last: { q: '이 블록에서 장비에 줄 수 있는 마지막 주소는?', a: i2ip(net + size - 2), w: [i2ip(net + size - 1), i2ip(net + size - 3), i2ip(net + size)],
        why: '마지막 ' + i2ip(net + size - 1) + '은 브로드캐스트라 장비에 줄 수 없다. 그 바로 앞 <b>' + i2ip(net + size - 2) + '</b>까지.' }
    };
    var done = S.reqs.filter(function (r) { return r.done; }).length;
    var order = ['bc', 'hosts', 'last', 'first'];
    var key = S.cfg.coach && done <= 2 ? ['bc', 'hosts'][done - 1] || 'bc' : order[(done + S.si) % order.length];
    var q = Q[key];
    var wrong = q.w.filter(function (v, i, a) { return v !== q.a && a.indexOf(v) === i && v.indexOf('-') < 0; });
    return { b: b, q: q.q, a: q.a, why: q.why, opts: NA.shuffle([q.a].concat(NA.shuffle(wrong).slice(0, 2))), answered: null };
  }
  function answer(v) {
    var Z = S.quiz; if (!Z || Z.answered) return;
    Z.answered = v;
    if (v === Z.a) { S.st.quizOk++; NA.sfx.good(); } else { S.st.quizBad++; NA.sfx.bad(); }
    render();
  }
  function nextReq() {
    if (!S.quiz || !S.quiz.answered) return;
    S.quiz = null; S.sel = null;
    if (S.reqs.every(function (r) { return r.done; })) return endStage();
    if (S.cfg.free) { S.cur = -1; S.phase = 'choose'; S.fb = { cls: 'info', title: '다음 요청을 고르자', body: '왼쪽 목록에서 요청을 누른다. 큰 블록부터 놓으면 자리가 덜 쪼개진다.' }; }
    else { S.cur = S.reqs.findIndex(function (r) { return !r.done; }); S.phase = 'pick'; S.fb = null; }
    render();
  }

  /* ------------------------------------------------------------ 시작/끝 */
  function startStage(si) {
    newState(si);
    NA.ui.briefing(ov, 'STAGE ' + (si + 1) + ' · ' + S.cfg.title, S.cfg.brief, function () { render(); });
  }
  function endStage() {
    S.phase = 'done'; render();
    var st = S.st, slips = st.mistakes + st.quizBad + st.over;
    var stars = slips <= 1 ? 3 : slips <= 4 ? 2 : 1;
    var used = 0; S.blocks.forEach(function (b) { if (!b.pre) used += sizeOf(b.p); });
    var need = 0; S.reqs.forEach(function (r) { need += r.hosts; });
    NA.sfx.win();
    setTimeout(function () {
      NA.ui.debrief({
        overlay: ov, gameId: GAME_ID, stage: S.si, win: true, stars: stars, score: Math.max(0, 1000 - slips * 100),
        title: '주소 배정 완료!', sub: '요청 ' + S.reqs.length + '개에 주소 ' + used + '개를 나눠 줬다(필요 호스트 ' + need + '대).',
        stats: [['너무 작은 블록', st.small], ['경계 어긋남', st.misalign], ['겹침', st.overlap], ['큰 블록 낭비', st.over], ['퀴즈 정답', st.quizOk + '/' + (st.quizOk + st.quizBad)], ['되돌리기', st.undo]],
        qc: S.cfg.qc,
        playNotes: { 'W2-2': '블록마다 2^(32−프리픽스)개 주소에서 2개(네트워크·브로드캐스트)를 빼 호스트 수를 계산했고, 브로드캐스트는 늘 블록의 마지막 주소였다. /26이면 64개, .0~.63에서 브로드캐스트 .63, 호스트 62대.' },
        onRetry: function () { startStage(S.si); },
        onNext: S.si + 1 < STAGES.length ? function () { startStage(S.si + 1); } : null,
        onMenu: menu
      });
    }, 600);
  }
  function menu() {
    S = null; app.innerHTML = '';
    NA.ui.renderTags(GAME_ID);
    NA.ui.stageMenu({
      overlay: ov, gameId: GAME_ID, stages: STAGES, onPick: startStage,
      howto: '요청서의 <b>호스트 수</b>를 보고 블록 크기(프리픽스)를 고른 뒤 주소판에 놓는다. <b>시간 제한 없음.</b><br>' +
        '호스트 수 = 2^(32 − 프리픽스) − 2 · 블록은 <b>자기 크기의 배수</b> 번지에서만 시작한다.<br>' +
        '놓을 때마다 그 블록의 브로드캐스트·호스트 수를 묻는 짧은 퀴즈가 나온다.'
    });
  }

  /* ------------------------------------------------------------ 렌더 */
  function render() {
    if (!S) return;
    var cfg = S.cfg, c = coach();
    var done = S.reqs.filter(function (r) { return r.done; }).length;
    var html = '<div class="bar"><span class="st">STAGE ' + (S.si + 1) + '<small>' + esc(cfg.title) + '</small></span>' +
      '<span class="cnt">주소판 ' + esc(cfg.base) + '/' + cfg.bp + (S.unit > 1 ? ' · 한 칸 = /24' : ' · 한 칸 = 주소 1개') + ' · 배정 ' + done + ' / ' + S.reqs.length + '</span>' +
      '<span class="sp"></span><button class="na-btn" data-undo' + (S.phase === 'quiz' ? ' disabled' : '') + '>되돌리기 [U]</button><button class="na-btn" data-guide>규칙</button></div>';
    html += '<div class="layout">';

    // 왼쪽: 요청서 + 트레이
    html += '<div class="col"><div class="panel"><h3><span>요청서</span><span>' + (cfg.free ? '눌러서 고르기' : '차례대로') + '</span></h3>';
    var r = S.cur >= 0 ? S.reqs[S.cur] : null;
    if (r && !r.done) html += '<div class="req"><div class="who">' + esc(r.who) + (r.note ? ' · ' + esc(r.note) : '') + '</div><div class="need">호스트 ' + r.hosts + '대 <small>필요</small></div><div class="note">최소 ' + (r.hosts + 2) + '개 주소 (네트워크·브로드캐스트 포함)</div></div>';
    else html += '<div class="req"><div class="who">' + (S.phase === 'done' ? '모두 배정했다' : '요청을 고르자') + '</div><div class="need">' + (S.phase === 'done' ? '완료' : '—') + '</div><div class="note">' + (cfg.free && S.phase !== 'done' ? '아래 목록에서 요청을 누른다' : '') + '</div></div>';
    html += '<div class="reqlist">';
    S.reqs.forEach(function (q, i) {
      var b = q.bid ? S.blocks.filter(function (x) { return x.id === q.bid; })[0] : null;
      var cls = q.done ? 'done' : i === S.cur ? 'cur' : (cfg.free && (S.phase === 'choose' || S.phase === 'pick') ? 'pick' : '');
      html += '<button class="ritem ' + cls + '" data-req="' + i + '"><span>' + esc(q.who) + ' · <b>' + q.hosts + '대</b></span><span>' + (b ? cidr(b) : q.done ? '' : '대기') + '</span></button>';
    });
    html += '</div></div>';
    html += '<div class="panel"><h3><span>블록 크기</span><span>' + (S.phase === 'pick' || S.phase === 'place' ? '골라서 놓기' : '') + '</span></h3><div class="tray">';
    tray().forEach(function (p, k) {
      var on = S.sel === p, dis = !(S.phase === 'pick' || S.phase === 'place');
      var pulse = c && c.need === p ? ' pulse' : '';
      html += '<button class="tbtn' + (on ? ' on' : '') + pulse + '" data-p="' + p + '"' + (dis ? ' disabled' : '') + '><span class="k">' + (k + 1) + '</span><span class="p">/' + p + '</span>' +
        '<span class="s">' + (S.unit > 1 ? cellsOf(p) + '칸 · ' : '') + '주소 <b>' + sizeOf(p) + '</b> · 호스트 <b>' + hostsOf(p) + '</b></span></button>';
    });
    html += '</div></div></div>';

    // 가운데: 주소판
    html += '<div class="panel boardwrap"><h3><span>주소판 ' + esc(cfg.base) + '/' + cfg.bp + '</span><span>' + (S.sel ? '/' + S.sel + ' = ' + cellsOf(S.sel) + '칸 블록' : '') + '</span></h3>';
    html += '<div class="colnums"><span></span>';
    for (var x = 0; x < 16; x++) html += '<span>+' + (S.unit > 1 ? x : x) + '</span>';
    html += '</div><div class="board" id="board">';
    for (var row = 0; row < 16; row++) {
      html += '<div class="rl">' + (S.unit === 1 ? '.' + (row * 16) : '10.0.' + (row * 16) + '.x') + '</div>';
      for (var col = 0; col < 16; col++) {
        var i = row * 16 + col;
        html += '<div class="cell' + (col % 4 === 0 ? ' q4' : '') + '" data-cell="' + i + '"></div>';
      }
    }
    S.blocks.forEach(function (b) {
      var w = Math.min(16, b.n), h = Math.max(1, b.n / 16), r0 = Math.floor(b.start / 16), c0 = b.start % 16;
      var style = 'left:' + (75 + c0 * 28) + 'px;top:' + (r0 * 28) + 'px;width:' + (w * 28 - 1) + 'px;height:' + (h * 28 - 1) + 'px;';
      if (!b.pre) style += 'background:' + b.color + '33;border-color:' + b.color + ';color:' + b.color + ';';
      var big = b.n >= 16;
      html += '<div class="blk' + (b.pre ? ' pre' : '') + '" style="' + style + '">' + (big ? '<b>' + esc(cidr(b)) + '</b>' + (h >= 2 ? esc(b.label) : '') : '<b>/' + b.p + '</b>') + '</div>';
    });
    html += '</div><div class="boardfoot" id="foot">' + footText() + '</div></div>';

    // 오른쪽
    html += '<div class="col">';
    if (c) html += '<div class="coach"><span class="who">선배 네트워크 관리자</span>' + c.msg + '</div>';
    if (S.phase === 'quiz' && S.quiz) {
      var Z = S.quiz, b2 = Z.b;
      html += '<div class="quiz"><div class="q">' + esc(cidr(b2)) + ' — ' + esc(Z.q) + '</div><div class="qopts">';
      Z.opts.forEach(function (o, k) {
        var cls = Z.answered ? (o === Z.a ? ' right' : o === Z.answered ? ' wrong' : '') : '';
        html += '<button class="qopt' + cls + '" data-ans="' + esc(o) + '"' + (Z.answered ? ' disabled' : '') + '>' + (k + 1) + '. ' + esc(o) + '</button>';
      });
      html += '</div>';
      if (Z.answered) {
        var net = addrOf(b2.start), size = sizeOf(b2.p);
        html += '<div class="blockinfo" style="margin-top:8px">' + (Z.answered === Z.a ? '<b style="color:var(--ok)">정답!</b> ' : '<b style="color:var(--bad)">아쉽다.</b> ') + Z.why +
          '<br>네트워크 주소 <b>' + i2ip(net) + '</b> · 브로드캐스트 <b>' + i2ip(net + size - 1) + '</b><br>호스트 ' + i2ip(net + 1) + ' ~ ' + i2ip(net + size - 2) + ' (<b>' + (size - 2) + '대</b>)</div>' +
          '<div class="na-row" style="margin-top:8px"><button class="na-btn primary" data-next>다음 요청 (Enter)</button></div>';
      }
      html += '</div>';
    } else if (S.fb) html += '<div class="feedback ' + S.fb.cls + '"><h4>' + S.fb.title + '</h4>' + S.fb.body + '</div>';
    else if (!c) html += '<div class="feedback"><h4>배정 중</h4>요청서의 호스트 수를 보고 블록 크기를 고른 뒤, 노란 점 칸에 놓자.</div>';
    var used = 0; S.blocks.forEach(function (b) { if (!b.pre) used += sizeOf(b.p); });
    html += '<div class="panel stats"><h3><span>현황</span></h3>배정한 주소 <b>' + used + '</b> / ' + (256 * S.unit) +
      ' · 실수 <b>' + S.st.mistakes + '</b> · 퀴즈 <b>' + S.st.quizOk + '/' + (S.st.quizOk + S.st.quizBad) + '</b>' +
      '<br>호스트 수 = 2^(32 − p) − 2 · 시작은 블록 크기의 배수</div>';
    html += '</div></div>';
    app.innerHTML = html;
    paint();
    bind();
  }

  function footText() {
    if (S.phase === 'quiz') return '블록을 놓았다. 오른쪽 퀴즈에 답하자.';
    if (!S.sel) return S.phase === 'choose' ? '왼쪽에서 요청을 고르자.' : '왼쪽에서 블록 크기를 고르면 놓을 수 있는 시작 칸에 <b>노란 점</b>이 찍힌다.';
    var n = cellsOf(S.sel);
    if (S.hover == null) return '/' + S.sel + ' 블록(' + sizeOf(S.sel) + '개 주소' + (S.unit > 1 ? ', ' + n + '칸' : '') + ')은 <b>' + n + '칸의 배수</b>에서만 시작한다. 칸에 마우스를 올려 보자.';
    var h = S.hover, net = addrOf(h), size = sizeOf(S.sel);
    if (h % n !== 0) return short(h) + '에서는 시작할 수 없다 (' + n + '칸의 배수가 아님). 가까운 시작: <b>' + short(h - h % n) + '</b>';
    if (!canStart(h, n)) return i2ip(net) + '/' + S.sel + ' 자리는 이미 쓰는 주소와 겹치거나 판 밖이다.';
    return '<b>' + i2ip(net) + '/' + S.sel + '</b> → ' + i2ip(net) + ' ~ ' + i2ip(net + size - 1) + ' · 호스트 ' + (size - 2) + '대. 클릭하면 놓는다.';
  }

  function paint() {
    var cells = app.querySelectorAll('.cell');
    var n = S.sel ? cellsOf(S.sel) : 0;
    cells.forEach(function (el, i) {
      el.className = 'cell' + (i % 4 === 0 ? ' q4' : '');
      if (S.cells[i] !== null) { var b = S.blocks.filter(function (x) { return x.id === S.cells[i]; })[0]; if (b && b.pre) el.classList.add('pre'); }
      if (S.phase === 'place' && n && canStart(i, n)) el.classList.add('start');
    });
    if (S.phase === 'place' && n && S.hover != null) {
      var ok = canStart(S.hover, n);
      for (var j = S.hover; j < Math.min(256, S.hover + n); j++) cells[j].classList.add(ok ? 'ok' : 'bad');
    }
    var f = document.getElementById('foot'); if (f) f.innerHTML = footText();
  }

  function guide() {
    var rows = tray().map(function (p) { return '<tr><td>/' + p + '</td><td>' + sizeOf(p) + '</td><td>' + hostsOf(p) + '</td><td>' + (S.unit === 1 ? sizeOf(p) + '의 배수' : cellsOf(p) + '칸의 배수') + '</td></tr>'; }).join('');
    ov.innerHTML = '<div class="na-card guide"><h2>주소 블록 규칙</h2>' +
      '<h4>블록 크기</h4><table><tr><th>프리픽스</th><th>주소 수</th><th>호스트 수</th><th>시작 위치</th></tr>' + rows + '</table>' +
      '<h4>왜 2개를 빼나</h4><p>블록의 첫 주소는 <b>네트워크 주소</b>(호스트 비트 전부 0), 마지막 주소는 <b>브로드캐스트</b>(호스트 비트 전부 1)라서 장비에 줄 수 없다.</p>' +
      '<h4>왜 경계에 맞춰야 하나</h4><p>/26이면 마지막 6비트가 호스트 부분이다. 블록이 64의 배수에서 시작해야 첫 주소의 호스트 6비트가 전부 0이 된다. 어긋나면 하나의 /26으로 표현할 수 없다.</p>' +
      '<p>조작: <span class="key">1</span>~<span class="key">6</span> 블록 크기 · 칸 클릭으로 놓기 · <span class="key">U</span> 되돌리기 · <span class="key">Enter</span> 다음</p>' +
      '<div class="na-row"><button class="na-btn primary" data-close>닫기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-close]').onclick = function () { ov.hidden = true; };
  }

  function bind() {
    app.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { pick(+b.dataset.p); }; });
    app.querySelectorAll('[data-req]').forEach(function (b) { b.onclick = function () { if (S.cfg.free) chooseReq(+b.dataset.req); }; });
    app.querySelectorAll('[data-ans]').forEach(function (b) { b.onclick = function () { answer(b.dataset.ans); }; });
    var nb = app.querySelector('[data-next]'); if (nb) nb.onclick = nextReq;
    var u = app.querySelector('[data-undo]'); if (u) u.onclick = undo;
    var g = app.querySelector('[data-guide]'); if (g) g.onclick = guide;
    var board = document.getElementById('board');
    board.addEventListener('mouseover', function (e) {
      var c = e.target.closest('.cell'); if (!c) return;
      var i = +c.dataset.cell; if (S.hover === i) return; S.hover = i; paint();
    });
    board.addEventListener('mouseleave', function () { S.hover = null; paint(); });
    board.addEventListener('click', function (e) { var c = e.target.closest('.cell'); if (c) place(+c.dataset.cell); });
  }

  document.addEventListener('keydown', function (e) {
    if (!S || S.phase === 'done' || !ov.hidden) return;
    NA.sfx.unlock();
    var k = e.key.toLowerCase(), n = parseInt(k, 10);
    if (S.phase === 'quiz') {
      if (n >= 1 && n <= 3 && S.quiz && !S.quiz.answered) answer(S.quiz.opts[n - 1]);
      else if (k === 'enter') { e.preventDefault(); nextReq(); }
      return;
    }
    if (n >= 1 && n <= tray().length) pick(tray()[n - 1]);
    else if (k === 'u') undo();
  });
  document.addEventListener('pointerdown', function () { NA.sfx.unlock(); });

  window.__game = { state: function () { return S; }, start: startStage, pick: pick, place: place, answer: answer, next: nextReq, choose: chooseReq, undo: undo,
    best: function () { return bestP(S.reqs[S.cur].hosts); }, canStart: function (i) { return canStart(i, cellsOf(S.sel)); }, cellsOf: cellsOf };
  menu();
})();
