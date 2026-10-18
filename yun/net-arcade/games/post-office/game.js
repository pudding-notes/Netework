/* 우체국 분류소 — Week 2 Quick Check W2-1(같은 subnet?), W2-2(broadcast·host 수), W2-4(Default Gateway)
 *
 * 턴제. 시간 제한 없음.
 * 편지(패킷)의 받는 주소를 보고 도장을 찍는다.
 *   직접 배달   : 같은 서브넷 (동네 번호가 같다)
 *   큰 우체국   : 다른 서브넷 → Default Gateway
 *   동네 방송   : 우리 서브넷의 브로드캐스트 주소
 * 비유: IP 주소 = 동네 번호(네트워크 부분) + 집 번지(호스트 부분). 마스크는 "어디까지가 동네 번호인지" 긋는 자.
 */
(function () {
  var GAME_ID = 'post-office';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));

  /* ------------------------------------------------------------ IP */
  function ip2i(s) { var p = s.split('.').map(Number); return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3]; }
  function i2ip(n) { return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
  function maskOf(p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; }
  function netOf(n, p) { return (n & maskOf(p)) >>> 0; }
  function bcOf(n, p) { return (netOf(n, p) | (~maskOf(p) >>> 0)) >>> 0; }
  function oct(n, k) { return (n >>> (24 - 8 * k)) & 255; }
  function bit(n, i) { return (n >>> (31 - i)) & 1; }
  function parse(s) { var a = s.split('/'); return { ip: ip2i(a[0]), p: +a[1] }; }

  /* ------------------------------------------------------------ 편지 꾸미기 */
  var FLAVOR = {
    lan: [['🖨️ 사무실 프린터', '보고서 3부 인쇄 부탁해요'], ['📺 거실 스마트 TV', '영상 이어서 틀어 줘'], ['💻 동생 노트북', '과제 파일 보내 줄게'],
      ['🗄️ NAS 저장소', '사진 백업해 둬'], ['🎮 게임기', '같이 한 판?'], ['📱 내 휴대폰', '파일 옮기기']],
    gw: [['🌐 구글 DNS', '이 이름의 IP가 뭐예요?'], ['☁️ 클라우드 서버', 'API 요청입니다'], ['🏫 학교 포털', '로그인 요청'],
      ['🤖 AI API 서버', '질문이 있어요'], ['🎬 스트리밍 서버', '다음 영상 주세요'], ['🏠 옆 동네 친구 PC', '같이 과제하자']],
    bc: [['📢 동네 전체 공지', '우리 동네 모두 들어 주세요'], ['📢 동네 방송', '이 동네 장비들 모두 응답!']]
  };

  /* ------------------------------------------------------------ 하루(스테이지) */
  function L(ip, who, msg) { return { ip: ip, who: who, msg: msg }; }
  var DAYS = [
    { title: '첫 출근: /24 동네', desc: '선배와 함께 도장 찍는 법을 배운다. 192.168.1.x 와 192.168.2.x 는 같은 동네일까?',
      qc: ['W2-1'], hint: true, coach: true, bcast: false,
      waves: [{ me: '192.168.1.20/24', letters: [
        L('192.168.1.50', '🖨️ 사무실 프린터', '보고서 인쇄 부탁해요'),
        L('192.168.2.20', '🏠 옆 동네 친구 PC', '끝 번호가 나랑 똑같네?'),
        L('8.8.8.8', '🌐 구글 DNS', 'www.inu.ac.kr 의 IP가 뭐예요?'),
        L('192.168.1.1', '📡 우리 집 공유기', '설정 페이지 열어 줘'),
        L('192.168.1.200', '📺 거실 스마트 TV', '영상 이어서 틀어 줘'),
        L('192.168.0.20', '🏢 아래층 사무실 PC', '서류 보내 드려요'),
        L('10.0.0.20', '🏫 학교 서버', '과제 제출합니다'),
        L('192.168.1.7', '🎮 게임기', '같이 한 판?')
      ] }],
      brief: '<b>IP 주소 = 동네 번호 + 집 번지</b>. 몇 비트까지가 동네 번호인지는 <b>/숫자</b>(프리픽스)가 정한다.<br>' +
        '내 주소는 <b>192.168.1.20/24</b> → 앞 24비트(192.168.1)가 동네 번호, 마지막 덩어리가 집 번지다.<br>' +
        '편지의 동네 번호가 우리와 같으면 <b>직접 배달</b>, 다르면 <b>큰 우체국(Default Gateway)</b>에 맡긴다.<br>' +
        '시간 제한은 없다. 오른쪽 위 선배의 안내를 따라 해 보자.' },
    { title: '캠퍼스 /16', desc: '세 번째 숫자가 달라도 같은 동네일 수 있다. 큰 우체국은 언제 필요할까?',
      qc: ['W2-4'], hint: true, bcast: false,
      waves: [{ me: '10.20.5.7/16', letters: [
        L('10.20.200.3', '📚 도서관 키오스크', '대출 기록 조회'),
        L('10.21.5.7', '🏫 옆 캠퍼스 서버', '끝자리가 나랑 같네?'),
        L('8.8.8.8', '🌐 구글 DNS', '이름 좀 찾아 주세요'),
        L('10.20.0.1', '📡 캠퍼스 라우터', '라우터 자신에게 보내는 편지'),
        L('10.20.5.99', '🖨️ 학과 프린터', '포스터 출력'),
        L('172.16.5.7', '☁️ 클라우드 VPC 서버', 'API 요청'),
        L('10.20.77.1', '🔬 연구실 서버', '실험 데이터'),
        L('10.2.5.7', '🏥 다른 기관 서버', '10.20 이랑 비슷해 보이지?'),
        L('203.0.113.5', '🤖 AI API 서버', '질문이 있어요'),
        L('10.20.255.30', '🎓 기숙사 PC', '같이 공부하자')
      ] }],
      brief: '오늘은 캠퍼스망 <b>10.20.5.7/16</b>. /16이면 앞 두 덩어리(10.20)까지만 동네 번호다.<br>' +
        '그래서 10.20.<b>200</b>.3 처럼 세 번째 숫자가 달라도 <b>같은 동네</b>다. 어제와 반대 함정에 주의!<br>' +
        '<b>큰 우체국(Gateway)은 목적지가 동네 밖일 때만</b> 필요하다. 동네 안이면 직접 간다.' },
    { title: '/26 쪼개진 동네', desc: '한 덩어리를 64씩 나눈다. 동네 방송 도장 해금, 퇴근 전 정산.',
      qc: ['W2-2', 'W2-4'], hint: false, bcast: true,
      waves: [{ me: '192.168.10.37/26', fixed: [
        L('192.168.10.63', '📢 동네 전체 공지', '우리 동네 모두 들어 주세요'),
        L('192.168.10.64', '🏢 옆 블록 사무실', '바로 옆 번지인데?'),
        L('192.168.10.5', '🖨️ 사무실 프린터', '인쇄 부탁해요'),
        L('192.168.10.62', '🗄️ NAS 저장소', '백업해 둬'),
        L('192.168.10.70', '💻 옆 팀 노트북', '자료 공유'),
        L('192.168.11.37', '🏠 옆 동네 친구 PC', '끝 번호가 같아!')
      ], gen: 4, settle: ['bc', 'hosts'] }],
      brief: '<b>192.168.10.37/26</b>. 26비트가 동네 번호라서 마지막 덩어리의 앞 2비트까지 동네 번호다.<br>' +
        '마지막 덩어리를 <b>64칸씩</b> 자른 것이 한 동네: .0~.63 | .64~.127 | .128~.191 | .192~.255<br>' +
        '동네의 <b>마지막 번지(집 번지 비트가 전부 1)</b>는 <b>브로드캐스트 주소</b>다. 이 주소로 온 편지는 <b>동네 방송</b> 도장.<br>' +
        '오늘부터 확대경이 판정까지 해 주지는 않는다. 필요하면 "판정 힌트" 체크를 켜도 된다.' },
    { title: '이사 가는 날 /27 · /28', desc: '오전과 오후에 주소가 바뀐다. 블록 크기 32와 16.',
      qc: ['W2-2'], hint: false, bcast: true,
      waves: [
        { me: '172.16.5.70/27', fixed: [
          L('172.16.5.95', '📢 동네 전체 공지', '모두 확인해 주세요'),
          L('172.16.5.96', '🏢 옆 블록 서버', '바로 다음 번지'),
          L('172.16.5.66', '🖨️ 프린터', '인쇄'),
          L('172.16.5.63', '💻 앞 블록 노트북', '바로 앞 번지'),
          L('172.16.5.90', '🗄️ NAS', '백업')
        ], gen: 2, settle: ['net', 'bc'] },
        { me: '10.1.1.200/28', fixed: [
          L('10.1.1.207', '📢 동네 전체 공지', '새 동네 인사'),
          L('10.1.1.208', '🏢 옆 블록 서버', '바로 다음 번지'),
          L('10.1.1.193', '📡 새 공유기', '설정 확인'),
          L('10.1.1.191', '💻 앞 블록 노트북', '바로 앞 번지')
        ], gen: 2, settle: ['hosts', 'last'] }
      ],
      brief: '오전 주소는 <b>172.16.5.70/27</b>: 마지막 덩어리를 <b>32칸씩</b> 자른다.<br>' +
        '오후에 <b>10.1.1.200/28</b>로 이사한다: <b>16칸씩</b>.<br>' +
        '요령: 블록 크기 = 2^(32 − 프리픽스). 내 번지를 블록 크기로 나눈 몫 × 블록 크기가 동네 시작 번지다.' },
    { title: '/22 덩어리 넘기', desc: '동네 번호의 경계가 세 번째 덩어리 한가운데를 지난다.',
      qc: ['W2-1'], hint: false, bcast: true,
      waves: [{ me: '10.20.33.5/22', fixed: [
        L('10.20.34.200', '🔬 연구동 서버', '세 번째 숫자가 다른데?'),
        L('10.20.36.5', '🏢 옆 건물 PC', '끝 번호가 같다'),
        L('10.20.35.255', '📢 동네 전체 공지', '모두 확인'),
        L('10.20.31.255', '💻 앞 블록 노트북', '.255로 끝나는데?'),
        L('10.20.33.250', '🖨️ 프린터', '인쇄')
      ], gen: 4, settle: ['bc', 'hosts'] }],
      brief: '<b>10.20.33.5/22</b>. 22비트 = 앞 두 덩어리(16비트) + 세 번째 덩어리의 앞 6비트.<br>' +
        '세 번째 덩어리를 <b>4칸씩</b> 묶는다: 32~35가 한 동네 → 10.20.32.0 ~ 10.20.35.255.<br>' +
        '마지막 숫자 .255에 속지 말자. 브로드캐스트인지는 <b>동네 전체의 마지막 번지</b>인지로 판단한다.' }
  ];

  /* ------------------------------------------------------------ 튜토리얼 대본 */
  var COACH = {
    0: [
      { need: 'expand', msg: '첫 편지야! 받는 주소는 <b>192.168.1.50</b>, 우리 주소는 <b>192.168.1.20/24</b>.<br>컴퓨터는 주소를 0과 1로 본다. 아래 <b>① 이진수로 펼치기</b>를 눌러 봐.' },
      { need: 'mask', msg: '32칸짜리 비트가 보이지? <b>/24</b>는 앞 24칸이 동네 번호라는 뜻이야. 보라색 선이 경계야.<br><b>② 마스크 씌우기</b>를 누르면 집 번지 칸을 0으로 지우고 동네 번호만 남겨(AND 연산).' },
      { need: 'compare', msg: '이게 두 주소의 <b>동네 번호(네트워크 주소)</b>야. <b>③ 동네 번호 비교</b>를 눌러 보자.' },
      { need: 'stamp', stamp: 'lan', msg: '동네 번호가 <b>192.168.1.0</b>으로 같아! 같은 동네니까 큰 우체국을 거칠 필요 없어.<br>오른쪽 <b>직접 배달</b> 도장을 찍어.' }
    ],
    1: [
      { need: 'expand', msg: '이번 주소는 <b>192.168.2.20</b>. 끝 번호 .20이 우리 주소랑 똑같네? 그래도 속단은 금물. <b>① 이진수로 펼치기</b>.' },
      { need: 'mask', msg: '<b>② 마스크 씌우기</b>로 동네 번호만 남겨 보자.' },
      { need: 'compare', msg: '<b>③ 동네 번호 비교</b>.' },
      { need: 'stamp', stamp: 'gw', msg: '빨간 칸이 보여? 동네 번호가 <b>192.168.1.0 ≠ 192.168.2.0</b>. 끝 번호가 같아도 <b>다른 동네</b>야.<br>우리는 그 동네로 가는 길을 모르니 <b>큰 우체국(Gateway)</b> 도장!' }
    ],
    2: [
      { need: 'free', msg: '이제 혼자 해 봐. 확대경 대신 <b>동네 지도</b> 탭을 써도 돼. 지도에서 🏠가 우리 동네, ✉️가 편지 목적지야.<br>단축키: <span class="key">1</span> 직접 <span class="key">2</span> 큰 우체국 <span class="key">B</span> 확대경 다음 단계 <span class="key">Enter</span> 다음 편지' }
    ]
  };

  /* ------------------------------------------------------------ 상태 */
  var S = null;

  function genLetter(me, bcast) {
    var net = netOf(me.ip, me.p), bc = bcOf(me.ip, me.p), size = bc - net + 1, r = Math.random();
    var kind = r < .45 ? 'lan' : 'gw', ip;
    if (kind === 'lan') { do { ip = net + NA.randi(1, size - 2); } while (ip === me.ip); }
    else {
      var k = Math.random();
      if (k < .5) { ip = net + (Math.random() < .5 ? -size : size) + NA.randi(1, size - 2); }
      else if (k < .75) { ip = me.ip + NA.pick([-2, -1, 1, 2]) * (me.p >= 24 ? 256 : size); }
      else ip = ip2i(NA.pick(['8.8.8.8', '1.1.1.1', '142.250.196.110', '203.0.113.5']));
      ip = ip >>> 0;
    }
    var f = NA.pick(FLAVOR[kind]);
    return L(i2ip(ip), f[0], f[1]);
  }

  function buildLetters(day, w) {
    var wave = day.waves[w], me = parse(wave.me);
    if (wave.letters) return wave.letters.slice();
    var arr = wave.fixed.slice();
    for (var i = 0; i < (wave.gen || 0); i++) arr.push(genLetter(me, day.bcast));
    // 첫 편지는 쉬운 것(같은 동네)으로 고정하고 나머지는 섞는다
    var first = arr.filter(function (l) { return kindOf(ip2i(l.ip), me) === 'lan'; })[0];
    var rest = NA.shuffle(arr.filter(function (l) { return l !== first; }));
    return first ? [first].concat(rest) : rest;
  }

  function kindOf(dst, me) {
    if (dst === bcOf(me.ip, me.p)) return 'bc';
    return netOf(dst, me.p) === netOf(me.ip, me.p) ? 'lan' : 'gw';
  }

  /* ------------------------------------------------------------ 무한 근무 */
  function randMe(lv) {
    var pool = lv <= 1 ? [24, 16] : lv === 2 ? [24, 16, 25, 26] : lv === 3 ? [25, 26, 27, 28] : [20, 21, 22, 23, 25, 26, 27, 28, 29, 30];
    var p = NA.pick(pool), ip, r = Math.random();
    do {
      if (r < .4) ip = ip2i('192.168.' + NA.randi(0, 255) + '.' + NA.randi(0, 255));
      else if (r < .7) ip = ip2i('10.' + NA.randi(0, 255) + '.' + NA.randi(0, 255) + '.' + NA.randi(0, 255));
      else ip = ip2i('172.' + NA.randi(16, 31) + '.' + NA.randi(0, 255) + '.' + NA.randi(0, 255));
    } while (ip === netOf(ip, p) || ip === bcOf(ip, p) || ip === netOf(ip, p) + 1);
    return i2ip(ip) + '/' + p;
  }
  function genLetterE(me, lv) {
    var net = netOf(me.ip, me.p), bc = bcOf(me.ip, me.p), size = bc - net + 1, r = Math.random(), ip, kind;
    if (lv >= 2 && r < .14) { ip = bc; kind = 'bc'; }
    else if (r < .3) { ip = NA.pick([net - 1, bc + 1, bc - 1, net + 1, net + size + 1]); kind = kindOf(ip >>> 0, me); }   // 경계 근처 함정
    else if (r < .4 && me.p > 8) { ip = (me.ip + NA.pick([-1, 1]) * (me.p > 24 ? size : me.p > 16 ? 256 : 65536)) >>> 0; kind = kindOf(ip, me); } // 끝 번호가 같은 함정
    else { var l = genLetter(me, false); ip = ip2i(l.ip); kind = kindOf(ip, me); }
    ip = ip >>> 0; if (ip === me.ip) ip = (ip + 2) >>> 0;
    kind = kindOf(ip, me);
    var f = NA.pick(FLAVOR[kind]);
    return L(i2ip(ip), f[0], f[1]);
  }
  function endlessWave(lv) {
    var me = randMe(lv), pm = parse(me), arr = [];
    for (var i = 0; i < 6; i++) arr.push(genLetterE(pm, lv));
    return { me: me, letters: arr, settle: lv >= 2 ? [NA.pick(['bc', 'hosts', 'net', 'last'])] : null };
  }
  function startEndless() {
    var day = { title: '무한 근무', qc: ['W2-1', 'W2-2', 'W2-4'], hint: false, coach: false, bcast: false, waves: [endlessWave(1)] };
    S = { di: -1, endless: true, lv: 1, day: day, w: 0, hearts: 5, score: 0, hint: false, tab: 'bits', handled: 0,
      st: { ok: 0, bad: 0, lan: 0, gw: 0, bc: 0, settleOk: 0, settleBad: 0, toolUse: 0 }, coachIdx: 0, answered: false };
    NA.ui.briefing(ov, '∞ 무한 근무', '편지가 <b>끝없이</b> 온다. 6통마다 우체국이 <b>이사</b>하고, 이사할수록 프리픽스가 어려워진다(/24·/16 → /25~/28 → /20~/30).<br>' +
      '두 번째 이사부터 <b>동네 방송</b> 도장과 <b>퇴근 전 정산</b> 문제가 섞인다. 주소와 편지는 매번 무작위.<br>' +
      '도구는 마음껏. 단, <b>판정 힌트</b>를 켜고 찍으면 점수가 절반이다. 신뢰도 5칸이 바닥나면 근무 종료.', function () { startWave(0); });
  }
  function endEndless() {
    S.over = true; NA.sfx.lose();
    var stars = S.lv >= 9 ? 3 : S.lv >= 5 ? 2 : S.lv >= 2 ? 1 : 0;
    NA.ui.debrief({
      overlay: ov, gameId: GAME_ID, endless: true, win: false, stars: stars, score: S.score,
      title: '근무 종료', sub: '이사 ' + (S.lv - 1) + '번 · 편지 ' + S.handled + '통 처리 · ★는 이사 1/4/8번에서',
      stats: [['점수', S.score], ['바른 도장', S.st.ok], ['틀린 도장', S.st.bad], ['정산 정답', S.st.settleOk]],
      qc: S.day.qc, playNotes: {},
      onRetry: startEndless, onNext: null, onMenu: menu
    });
  }

  function startDay(di) {
    var day = DAYS[di];
    S = { di: di, day: day, w: 0, hearts: 5, score: 0, hint: day.hint, tab: 'bits',
      st: { ok: 0, bad: 0, lan: 0, gw: 0, bc: 0, settleOk: 0, settleBad: 0, toolUse: 0 }, coachIdx: 0, answered: false };
    NA.ui.briefing(ov, 'DAY ' + (di + 1) + ' · ' + day.title, day.brief, function () { startWave(0); });
  }

  function startWave(w) {
    S.w = w; S.me = parse(S.day.waves[w].me);
    S.letters = buildLetters(S.day, w); S.idx = 0;
    newLetter();
  }

  function newLetter() {
    S.cur = S.letters[S.idx]; S.dst = ip2i(S.cur.ip); S.step = 0; S.answered = false; S.choice = null; S.fresh = true;
    S.coachStep = 0;
    S.tab = 'bits';
    render();
  }

  function coach() {
    if (!S.day.coach) return null;
    var g = S.w === 0 ? S.idx : -1;
    var list = COACH[g] || (g === 2 ? COACH[2] : null);
    if (!list) return null;
    return list[Math.min(S.coachStep, list.length - 1)];
  }

  /* ------------------------------------------------------------ 행동 */
  function toolNext() {
    if (S.answered && S.step >= 3) return;
    var c = coach(), want = ['expand', 'mask', 'compare'][S.step];
    if (c && c.need !== 'free' && c.need !== want) return;
    if (S.step === 2 && !S.hint && !S.answered) return; // 판정 힌트 꺼짐: 비교는 직접
    S.step = Math.min(3, S.step + 1); S.st.toolUse++;
    if (c && c.need === want) S.coachStep++;
    S.tab = 'bits';
    NA.sfx.pop();
    render();
  }

  function stamp(kind) {
    if (S.answered) return;
    if (kind === 'bc' && !S.day.bcast) return;
    var c = coach();
    if (c && c.need !== 'free') {
      if (c.need !== 'stamp') return;
      if (kind !== c.stamp) { flashCoach('그 도장이 아니야. 위의 동네 번호 두 개를 다시 봐!'); NA.sfx.bad(); return; }
    }
    var right = kindOf(S.dst, S.me);
    S.answered = true; S.choice = kind; S.right = right;
    S.step = 3;
    if (S.endless) S.handled++;
    if (kind === right) { S.st.ok++; S.st[right]++; S.score += S.endless ? (S.hint ? 50 : 100) + 20 * (S.lv - 1) : 100; NA.sfx.good(); }
    else { S.st.bad++; S.hearts--; NA.sfx.bad(); }
    if (c) S.coachStep++;
    render();
    var nb = document.querySelector('[data-next]'); if (nb) nb.focus({ preventScroll: true });
  }

  function flashCoach(msg) {
    var el = document.querySelector('.coach'); if (!el) return;
    el.innerHTML = '<span class="who">선배 우체국장</span>' + msg;
  }

  function next() {
    if (!S.answered) return;
    if (S.hearts <= 0) return endDay(false);
    S.idx++;
    if (S.idx < S.letters.length) return newLetter();
    var wave = S.day.waves[S.w];
    if (wave.settle) return settle(wave.settle.slice());
    afterWave();
  }

  function afterWave() {
    if (S.endless) {
      S.lv++; S.day.bcast = S.lv >= 2; S.day.waves.push(endlessWave(S.lv));
      var nw = S.day.waves[S.w + 1].me;
      NA.sfx.perfect();
      return NA.ui.briefing(ov, '이사 공지 · ' + S.lv + '번째 동네', '새 주소: <b>' + nw + '</b><br>블록 크기 = 2^(32 − ' + nw.split('/')[1] + ') = <b>' +
        Math.pow(2, 32 - +nw.split('/')[1]) + '</b>' + (S.lv === 2 ? '<br>이제부터 <b>동네 방송</b> 도장(키 3)과 정산 문제가 나온다.' : ''), function () { startWave(S.w + 1); });
    }
    if (S.w + 1 < S.day.waves.length) {
      var nw = S.day.waves[S.w + 1].me;
      NA.ui.briefing(ov, '이사 공지', '우리 우체국이 새 동네로 이사했다.<br>새 주소: <b>' + nw + '</b><br>블록 크기 = 2^(32 − ' + nw.split('/')[1] + ') = <b>' +
        Math.pow(2, 32 - +nw.split('/')[1]) + '</b>칸', function () { startWave(S.w + 1); });
    } else endDay(true);
  }

  /* ------------------------------------------------------------ 정산 */
  function settleQ(type) {
    var me = S.me, net = netOf(me.ip, me.p), bc = bcOf(me.ip, me.p), size = bc - net + 1;
    var Q = {
      bc: { q: '우리 동네의 브로드캐스트 주소(마지막 번지)는?', a: i2ip(bc), w: [i2ip(bc + 1), i2ip(bc - 1), i2ip((net | 255) >>> 0)],
        why: '집 번지 비트를 전부 1로 채운 주소. 동네 시작 ' + i2ip(net) + ' + 블록 크기 ' + size + ' − 1 = ' + i2ip(bc) + '.' },
      hosts: { q: '우리 동네에 집(호스트)을 몇 채 둘 수 있나?', a: String(size - 2), w: [String(size), String(size - 1), String(size * 2 - 2)],
        why: '주소는 2^' + (32 - me.p) + ' = ' + size + '개. 첫 번지(네트워크 주소)와 마지막 번지(브로드캐스트)는 집에 줄 수 없으니 ' + (size - 2) + '채.' },
      net: { q: '우리 동네 번호(네트워크 주소)는?', a: i2ip(net), w: [i2ip(net + 1), i2ip(me.ip), i2ip(net + size)],
        why: '내 주소 AND 마스크 = 집 번지 비트를 전부 0으로. ' + i2ip(me.ip) + ' → ' + i2ip(net) + '.' },
      last: { q: '집에 줄 수 있는 마지막 번지는?', a: i2ip(bc - 1), w: [i2ip(bc), i2ip(bc - 2), i2ip(bc + 1)],
        why: '브로드캐스트 ' + i2ip(bc) + ' 바로 앞 번지. 브로드캐스트는 집에 줄 수 없다.' }
    }[type];
    var wrong = Q.w.filter(function (v, i, a) { return v !== Q.a && a.indexOf(v) === i; });
    Q.opts = NA.shuffle([Q.a].concat(NA.shuffle(wrong).slice(0, 2)));
    return Q;
  }

  function settle(queue) {
    var Q = settleQ(queue.shift());
    var me = S.me;
    app.innerHTML = bar() +
      '<div class="panel settle" style="max-width:760px;margin:0 auto">' +
      '<h3>퇴근 전 정산 · ' + esc(i2ip(me.ip)) + ' /' + me.p + '</h3>' +
      '<div class="q">' + esc(Q.q) + '</div>' +
      '<div class="opts">' + Q.opts.map(function (o, i) { return '<button class="opt" data-o="' + i + '">' + (i + 1) + '. ' + esc(o) + '</button>'; }).join('') + '</div>' +
      '<div class="hintbox" data-hb><button class="na-btn" data-hintbtn>힌트 보기</button></div>' +
      '<div data-res></div></div>';
    var size = Math.pow(2, 32 - me.p), myLast = me.ip & 255;
    app.querySelector('[data-hintbtn]').onclick = function () {
      app.querySelector('[data-hb]').innerHTML = '블록 크기 = 2^(32 − ' + me.p + ') = <b>' + size + '</b>' +
        (me.p >= 24 ? ' · 내 번지 ' + myLast + ' ÷ ' + size + ' = 몫 ' + Math.floor(myLast / size) + ' → 동네 시작 번지 <b>' + (Math.floor(myLast / size) * size) + '</b>' :
          ' · 동네 번호의 경계는 ' + (Math.floor((me.p - 1) / 8) + 1) + '번째 덩어리에 있다') +
        '<br>첫 번지 = 동네 번호, 마지막 번지 = 시작 + ' + size + ' − 1 = 브로드캐스트, 집 수 = ' + size + ' − 2';
    };
    var btns = app.querySelectorAll('.opt');
    btns.forEach(function (b) {
      b.onclick = function () {
        var v = Q.opts[+b.dataset.o], ok = v === Q.a;
        btns.forEach(function (x, j) { x.disabled = true; if (Q.opts[j] === Q.a) x.classList.add('right'); });
        if (!ok) { b.classList.add('wrong'); S.hearts--; S.st.settleBad++; NA.sfx.bad(); } else { S.st.settleOk++; S.score += 150; NA.sfx.good(); }
        app.querySelector('[data-res]').innerHTML =
          '<div class="result ' + (ok ? 'ok' : 'no') + '"><h4>' + (ok ? '정확해요!' : '정답은 ' + esc(Q.a)) + '</h4><p>' + esc(Q.why) + '</p>' +
          mapHTML(true, true) +
          '<div class="na-row"><button class="na-btn primary" data-next>' + (queue.length ? '다음 정산 (Enter)' : '마무리 (Enter)') + '</button></div></div>';
        var nb = app.querySelector('[data-next]');
        nb.onclick = function () {
          if (S.hearts <= 0) return endDay(false);
          if (queue.length) settle(queue); else afterWave();
        };
        nb.focus();
      };
    });
    S.settling = { btns: btns };
  }

  /* ------------------------------------------------------------ 종료 */
  function endDay(win) {
    if (S.endless) return endEndless();
    S.over = true;
    var st = S.st, stars = !win ? 0 : S.hearts >= 5 ? 3 : S.hearts >= 3 ? 2 : 1;
    if (win) NA.sfx.win(); else NA.sfx.lose();
    var notes = {
      'W2-1': '편지마다 (주소 AND 마스크)로 동네 번호를 구해 비교했다. 끝 번호가 같아도 동네 번호가 다르면 다른 동네였다.',
      'W2-4': '큰 우체국(Gateway)에 맡긴 편지 ' + st.gw + '통은 모두 동네 밖이었고, 동네 안 ' + st.lan + '통은 직접 배달했다.',
      'W2-2': '정산에서 브로드캐스트·호스트 수 문제를 ' + st.settleOk + '번 맞혔다. 블록 크기 2^(32−프리픽스)에서 2를 뺀 것이 호스트 수였다.'
    };
    NA.ui.debrief({
      overlay: ov, gameId: GAME_ID, stage: S.di, win: win, stars: stars, score: S.score,
      title: win ? 'DAY ' + (S.di + 1) + ' 퇴근!' : '오늘은 여기까지',
      sub: win ? '남은 신뢰도 ' + S.hearts + '/5.' : '신뢰도가 바닥났다. 해설을 다시 보고 처음부터 해 보자.',
      stats: [['점수', S.score], ['바른 도장', st.ok], ['틀린 도장', st.bad], ['정산 정답', st.settleOk]],
      qc: S.day.qc, playNotes: notes,
      onRetry: function () { startDay(S.di); },
      onNext: S.di + 1 < DAYS.length ? function () { startDay(S.di + 1); } : null,
      onMenu: menu
    });
  }

  function menu() {
    S = null; app.innerHTML = '';
    NA.ui.renderTags(GAME_ID);
    NA.ui.stageMenu({
      overlay: ov, gameId: GAME_ID, stages: DAYS, onPick: startDay,
      endless: { title: '무한 근무', desc: '주소·편지가 매번 무작위. 6통마다 이사, 프리픽스가 점점 어려워진다.', onPick: startEndless },
      howto: '나는 동네 우체국 직원. 편지의 <b>받는 주소</b>를 보고 도장을 찍는다. <b>시간 제한 없음.</b><br>' +
        '<b>직접 배달</b> = 같은 서브넷 · <b>큰 우체국</b> = 다른 서브넷 → Default Gateway · <b>동네 방송</b> = 브로드캐스트<br>' +
        '헷갈리면 <b>비트 확대경</b>과 <b>동네 지도</b>를 마음껏 쓰자. 도구를 써도 감점은 없다.'
    });
  }

  /* ------------------------------------------------------------ 렌더 */
  function bar() {
    var h = '';
    for (var i = 0; i < 5; i++) h += i < S.hearts ? '♥' : '<i>♥</i>';
    var cnt = S.endless ? '동네 ' + S.lv + ' · 편지 ' + Math.min(S.idx + 1, S.letters.length) + '/' + S.letters.length + ' · 점수 ' + S.score :
      '편지 ' + Math.min(S.idx + 1, S.letters.length) + ' / ' + S.letters.length + (S.day.waves.length > 1 ? ' · ' + (S.w === 0 ? '오전' : '오후') : '');
    return '<div class="po-bar"><span class="day">' + (S.endless ? '∞' : 'DAY ' + (S.di + 1)) + '<small>' + esc(S.day.title) + '</small></span>' +
      '<span class="hearts" title="신뢰도">' + h + '</span>' +
      '<span class="count">' + cnt + '</span>' +
      '<span class="sp"></span><button class="na-btn" data-guide>안내서</button></div>';
  }

  function render() {
    var me = S.me, net = netOf(me.ip, me.p), c = coach();
    var html = bar() + '<div class="po-grid">';

    // 왼쪽: 동네 안내판 + 선배
    html += '<div><div class="panel board"><h3>우리 동네 안내판</h3>' +
      '<div class="ip">' + i2ip(me.ip) + ' /' + me.p + '</div>' +
      '<div class="row"><span>마스크</span><span>' + i2ip(maskOf(me.p)) + '</span></div>' +
      '<div class="row"><span>동네 번호</span><span>' + (S.day.hint ? i2ip(net) : '? (직접 구해 보자)') + '</span></div>' +
      '<div class="row"><span>큰 우체국 (Gateway)</span><span class="gw">' + i2ip(net + 1) + '</span></div>' +
      '<div class="meta">/' + me.p + ' = 앞 <b>' + me.p + '비트</b>가 동네 번호, 나머지 <b>' + (32 - me.p) + '비트</b>가 집 번지.<br>한 동네의 주소 수 = 2^' + (32 - me.p) + ' = <b>' + Math.pow(2, 32 - me.p) + '</b></div>' +
      '</div>';
    if (c) html += '<div class="coach"><span class="who">선배 우체국장</span>' + c.msg + '</div>';
    else html += '<div class="coach"><span class="who">선배 우체국장</span>' + tip() + '</div>';
    html += '</div>';

    // 가운데: 편지 + 도구 + 결과
    html += '<div class="col-mid">' + letterHTML() + toolHTML() + '</div>';

    // 오른쪽: 도장
    var lock = !!(c && c.need !== 'free' && c.need !== 'stamp');
    html += '<div class="stamps' + (S.answered ? ' compact' : '') + '">' +
      stampBtn('lan', '직접 배달', '같은 동네(서브넷). ARP로 집을 찾아 바로 간다.', '1', lock, c) +
      stampBtn('gw', '큰 우체국으로', '다른 동네. Default Gateway에 맡긴다.', '2', lock, c) +
      stampBtn('bc', '동네 방송', '우리 동네 브로드캐스트 주소. 모두에게.', '3', lock || !S.day.bcast, c) +
      (S.answered ? resultHTML() : '<div class="result-ph">도장을 찍으면 여기에 해설이 나온다.</div>') +
      '</div>';
    html += '</div>';
    app.innerHTML = html;
    bind();
  }

  function tip() {
    var tips = [
      '끝 번호가 같다고 같은 동네가 아니다. <b>동네 번호</b>를 비교하자.',
      '동네 번호 = 주소 AND 마스크. 집 번지 비트를 전부 0으로 지운 값이다.',
      '블록 크기 = 2^(32 − 프리픽스). 내 번지가 들어 있는 블록이 우리 동네다.',
      '동네의 첫 번지는 동네 번호(네트워크 주소), 마지막 번지는 브로드캐스트다. 둘 다 집에 줄 수 없다.',
      'Gateway 자신도 우리 동네 주민이다. 공유기에게 보내는 편지는 직접 배달!'
    ];
    return tips[(S.idx + Math.max(0, S.di) + (S.lv || 0)) % tips.length] + (S.day.hint ? '' : '<br><span style="color:var(--dim)">확대경의 "판정 힌트"를 켜면 비교 결과까지 보여 준다.</span>');
  }

  function letterHTML() {
    var mark = '';
    if (S.answered) mark = '<div class="stampmark ' + S.choice + '">' + { lan: '직접 배달', gw: '큰 우체국', bc: '동네 방송' }[S.choice] + '</div>';
    return '<div class="letter' + (S.fresh ? ' in' : '') + '">' +
      '<div class="from">보내는 곳<br>' + i2ip(S.me.ip) + '<br>(우리 우체국)</div>' +
      '<div class="lbl">받는 주소 (목적지 IP)</div><div class="to">' + esc(S.cur.ip) + '</div>' +
      '<div class="who">' + esc(S.cur.who) + '</div><div class="msg">“' + esc(S.cur.msg) + '”</div>' +
      (S.answered ? mark : '<div class="postmark"></div>') + '</div>';
  }

  function stampBtn(k, t, d, key, disabled, c) {
    var pulse = c && c.need === 'stamp' && c.stamp === k ? ' pulse' : '';
    return '<button class="stamp ' + k + pulse + '" data-stamp="' + k + '"' + (disabled || S.answered ? ' disabled' : '') + '>' +
      '<span class="k">[' + key + ']</span><span class="t">' + t + '</span><span class="d">' + d + '</span></button>';
  }

  /* 비트 확대경 */
  function bitsRow(n, p, opt) {
    var h = '<div class="bitrow">';
    for (var o = 0; o < 4; o++) {
      h += '<span class="oct">';
      for (var i = 0; i < 8; i++) {
        var bi = o * 8 + i, b = bit(n, bi), cls = bi < p ? 'net' : 'host';
        if (opt && opt.masked && bi >= p) { cls += ' zero'; b = 0; }
        if (opt && opt.cmp != null && bi < p) cls += bit(opt.cmp, bi) === bit(n, bi) ? ' match' : ' diff';
        if (opt && opt.ones && bi >= p && bit(n, bi)) cls += ' ones';
        var line = bi === p - 1 ? ' style="border-right:3px solid var(--vio)"' : '';
        h += '<span class="bit ' + cls + '"' + line + '>' + b + '</span>';
      }
      h += '</span>';
    }
    return h + '</div>';
  }
  function decHTML(n, p) {
    var parts = [];
    for (var k = 0; k < 4; k++) {
      var allNet = (k + 1) * 8 <= p;
      parts.push('<span class="' + (allNet ? '' : 'h') + '">' + oct(n, k) + '</span>');
    }
    return '<span class="decrow">' + parts.join('.') + '</span>';
  }

  function toolHTML() {
    var me = S.me, p = me.p, dst = S.dst;
    var h = '<div class="tools"><div class="tabs">' +
      '<button class="tab' + (S.tab === 'bits' ? ' on' : '') + '" data-tab="bits">🔍 비트 확대경</button>' +
      '<button class="tab' + (S.tab === 'map' ? ' on' : '') + '" data-tab="map">🗺️ 동네 지도</button></div>' +
      '<div class="panel tool-body">';
    if (S.tab === 'map') {
      h += mapHTML(S.answered || S.hint, false);
    } else {
      var step = S.answered ? 3 : S.step;
      h += '<div class="bits">';
      h += '<div class="name"><b>내 주소</b>' + i2ip(me.ip) + '</div>' + (step >= 1 ? bitsRow(me.ip, p) : decHTML(me.ip, 32)) +
        '<div class="name"><b>받는 주소</b>' + esc(S.cur.ip) + '</div>' + (step >= 1 ? bitsRow(dst, p, { ones: step >= 3 }) : decHTML(dst, 32));
      if (step >= 2) {
        var nMe = netOf(me.ip, p), nD = netOf(dst, p), showCmp = step >= 3;
        h += '<div class="sep"></div>' +
          '<div class="name"><b>마스크 /' + p + '</b>' + i2ip(maskOf(p)) + '</div>' + bitsRow(maskOf(p), p) +
          '<div class="sep"></div>' +
          '<div class="name"><b>내 동네 번호</b>' + i2ip(nMe) + '</div>' + bitsRow(nMe, p, { masked: true, cmp: showCmp ? nD : null }) +
          '<div class="name"><b>받는 곳 동네 번호</b>' + i2ip(nD) + '</div>' + bitsRow(nD, p, { masked: true, cmp: showCmp ? nMe : null });
      }
      h += '</div>';
      if (step === 1) h += '<p class="boundary-note">보라색 선 왼쪽 ' + p + '칸 = 동네 번호, 오른쪽 ' + (32 - p) + '칸 = 집 번지</p>';
      if (step >= 3) {
        var same = netOf(me.ip, p) === netOf(dst, p), isBc = dst === bcOf(me.ip, p);
        h += '<div class="verdict ' + (same ? 'same' : 'diff') + '">' + (same ?
          '동네 번호가 <b>같다</b> → 같은 서브넷.' + (isBc ? ' 게다가 집 번지 비트가 <b>전부 1</b>(보라색) → 이 동네의 브로드캐스트 주소!' : '') :
          '동네 번호가 <b>다르다</b>(빨간 칸) → 다른 서브넷.') + '</div>';
      } else if (step === 2 && !S.hint) {
        h += '<div class="verdict">두 <b>동네 번호</b>를 직접 비교해 보자. 같으면 같은 동네다.</div>';
      }
      var labels = ['① 이진수로 펼치기', '② 마스크 씌우기 (AND)', '③ 동네 번호 비교', ''];
      var c = coach(), want = ['expand', 'mask', 'compare'][S.step];
      var canNext = !S.answered && S.step < 3 && !(S.step === 2 && !S.hint);
      var pulse = c && c.need === want ? ' pulse' : '';
      h += '<div class="tool-actions">' +
        (canNext ? '<button class="na-btn' + (c && c.need === want ? ' primary' : '') + pulse + '" data-tool>' + labels[S.step] + ' <span style="opacity:.6">[B]</span></button>' : '') +
        (S.day.coach ? '' : '<label><input type="checkbox" data-hint' + (S.hint ? ' checked' : '') + '> 판정 힌트</label>') +
        '</div>';
    }
    return h + '</div></div>';
  }

  /* 동네 지도: 동네 번호의 마지막 비트가 들어 있는 덩어리를 블록 단위로 그린다 */
  function mapHTML(showDst, compact) {
    var me = S.me, p = me.p, dst = S.dst;
    var k = Math.min(3, Math.floor((p - 1) / 8));
    var b = Math.pow(2, 8 * (k + 1) - p);
    var myV = oct(me.ip, k), myStart = myV - myV % b;
    var prefixSame = true;
    for (var j = 0; j < k; j++) if (oct(me.ip, j) !== oct(dst, j)) prefixSame = false;
    var head = [];
    for (j = 0; j < k; j++) head.push(oct(me.ip, j));
    var headStr = head.length ? head.join('.') + '.' : '';
    var tail = k < 3 ? '.x'.repeat(3 - k) : '';
    var h = '';
    if (!compact) {
      h += '<div class="map-note">/' + p + '에서 동네 번호는 <b>' + (k + 1) + '번째 덩어리</b>에서 끝난다. 그 덩어리를 <b>' + b + '칸씩</b> 묶은 것이 한 동네.' +
        (k > 0 ? ' 앞 덩어리(' + headStr.replace(/\.$/, '') + ')는 통째로 동네 번호라 같아야 한다.' : '') + '</div>';
    }
    if (!prefixSame) {
      h += '<div class="verdict diff">' + (showDst ? '받는 주소는 앞 덩어리부터 <b>' + i2ip(dst).split('.').slice(0, k).join('.') + '</b>로 달라서 이 지도 밖, 다른 동네다.' :
        '받는 주소의 앞 덩어리(' + i2ip(dst).split('.').slice(0, k).join('.') + ')가 우리(' + headStr.replace(/\.$/, '') + ')와 같은지 먼저 보자.') + '</div>';
    }
    var blocks = 256 / b, from = 0, to = blocks;
    if (blocks > 8) { var mi = myStart / b; from = Math.max(0, Math.min(blocks - 8, mi - 3)); to = from + 8; }
    var dV = oct(dst, k);
    h += '<div class="mapbar">';
    for (var i = from; i < to; i++) {
      var s = i * b, e = s + b - 1, mine = s === myStart;
      var pin = '';
      if (mine) pin += '🏠';
      if (showDst && prefixSame && dV >= s && dV <= e) pin += '✉️';
      h += '<div class="blk' + (mine ? ' mine' : '') + '">' + (pin ? '<span class="pin">' + pin + '</span>' : '') +
        (mine ? '우리 동네' : '동네') + '<span class="rng">' + (b === 1 ? s : s + '–' + e) + '</span></div>';
    }
    h += '</div><div class="maplegend">' + headStr + '<b>[' + (k + 1) + '번째 덩어리]</b>' + tail +
      (blocks > 8 ? ' · 전체 ' + blocks + '개 동네 중 일부' : '') + (showDst ? '' : ' · ✉️ 위치는 도장을 찍은 뒤 공개') + '</div>';
    var net = netOf(me.ip, p), bc = bcOf(me.ip, p);
    h += '<div class="meta">우리 동네 범위: <b>' + i2ip(net) + '</b> ~ <b>' + i2ip(bc) + '</b> (첫 번지 = 동네 번호, 마지막 번지 = 브로드캐스트)</div>';
    return h;
  }

  function resultHTML() {
    var me = S.me, p = me.p, ok = S.choice === S.right;
    var nMe = netOf(me.ip, p), nD = netOf(S.dst, p), gw = i2ip(nMe + 1);
    var names = { lan: '직접 배달', gw: '큰 우체국', bc: '동네 방송' };
    var meaning = {
      lan: '같은 동네(서브넷)라서 큰 우체국을 거칠 필요가 없다. 실제로는 <b>ARP</b>로 "' + esc(S.cur.ip) + ' 누구야?"라고 물어 그 집의 MAC 주소를 알아낸 뒤 스위치로 바로 보낸다.' +
        (S.dst === nMe + 1 ? '<br>공유기(Gateway) 자신도 우리 동네 주민이다. 공유기에게 보내는 편지는 직접 간다.' : ''),
      gw: '다른 동네라 우리는 가는 길을 모른다. 그래서 <b>큰 우체국(Default Gateway ' + gw + ')</b>에 맡기고, 라우터가 다음 길을 찾는다. 받는 주소(IP)는 바꾸지 않는다.' +
        ((S.dst & 255) === (me.ip & 255) ? '<br>끝 번호가 우리와 같아도 <b>동네 번호가 다르면 다른 동네</b>다. (Quick Check W2-1)' : ''),
      bc: '동네 번호는 같고 <b>집 번지 비트가 전부 1</b>이다. 이 동네의 <b>브로드캐스트 주소</b>라서 동네 모든 집에 한꺼번에 전달된다.'
    }[S.right];
    return '<div class="result ' + (ok ? 'ok' : 'no') + '">' +
      '<h4>' + (ok ? '정확해요! ' + names[S.right] : names[S.choice] + '가 아니라 ' + names[S.right] + ' (신뢰도 −1)') + '</h4>' +
      '<div class="calc">내 동네 번호 = ' + i2ip(me.ip) + ' AND ' + i2ip(maskOf(p)) + ' = <b>' + i2ip(nMe) + '</b><br>' +
      '받는 곳 동네 번호 = ' + esc(S.cur.ip) + ' AND ' + i2ip(maskOf(p)) + ' = <b>' + i2ip(nD) + '</b> → ' + (nMe === nD ? '같다' : '다르다') + '</div>' +
      '<p>' + meaning + '</p>' +
      '<div class="na-row"><button class="na-btn primary" data-next>' + (S.hearts <= 0 ? '결과 보기' : '다음 편지') + ' (Enter)</button></div></div>';
  }

  function guide() {
    ov.innerHTML = '<div class="na-card guide"><h2>우체국 업무 안내서</h2>' +
      '<h4>주소 읽는 법</h4><p>IP 주소 32비트 = <b>동네 번호(네트워크 부분)</b> + <b>집 번지(호스트 부분)</b>. /숫자(프리픽스)가 앞에서 몇 비트까지 동네 번호인지 정한다. 마스크는 그 경계를 1과 0으로 쓴 것이다 (/24 = 255.255.255.0).</p>' +
      '<h4>동네 번호 구하기</h4><p>주소 AND 마스크. 집 번지 비트가 모두 0이 되고 동네 번호만 남는다. 두 주소의 동네 번호가 같으면 같은 서브넷이다.</p>' +
      '<h4>도장 고르기</h4><ul><li><b>직접 배달</b>: 동네 번호가 같다. ARP로 MAC을 알아내 바로 보낸다.</li>' +
      '<li><b>큰 우체국</b>: 동네 번호가 다르다. Default Gateway(라우터)에게 맡긴다.</li>' +
      '<li><b>동네 방송</b>: 우리 동네의 마지막 번지(집 번지 비트 전부 1) = 브로드캐스트 주소.</li></ul>' +
      '<h4>빠른 계산</h4><p>블록 크기 = 2^(32 − 프리픽스). /26 → 64, /27 → 32, /28 → 16. 동네 시작 = (내 번지 ÷ 블록 크기의 몫) × 블록 크기. 끝 = 시작 + 블록 크기 − 1. 호스트 수 = 블록 크기 − 2.</p>' +
      '<div class="na-row"><button class="na-btn primary" data-close>닫기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-close]').onclick = function () { ov.hidden = true; };
  }

  function bind() {
    S.fresh = false;
    app.querySelectorAll('[data-stamp]').forEach(function (b) { b.onclick = function () { stamp(b.dataset.stamp); }; });
    var t = app.querySelector('[data-tool]'); if (t) t.onclick = toolNext;
    app.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { S.tab = b.dataset.tab; render(); }; });
    var hc = app.querySelector('[data-hint]'); if (hc) hc.onchange = function () { S.hint = hc.checked; render(); };
    var nb = app.querySelector('[data-next]'); if (nb) nb.onclick = next;
    var g = app.querySelector('[data-guide]'); if (g) g.onclick = guide;
  }

  document.addEventListener('keydown', function (e) {
    if (!S || S.over || !ov.hidden) return;
    NA.sfx.unlock();
    if (S.settling && app.querySelector('.settle')) {
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= 3) { var ob = app.querySelector('.opt[data-o="' + (n - 1) + '"]'); if (ob && !ob.disabled) ob.click(); }
      if (e.key === 'Enter') { var sn = app.querySelector('[data-next]'); if (sn) { e.preventDefault(); sn.click(); } }
      return;
    }
    if (e.key === '1') stamp('lan');
    else if (e.key === '2') stamp('gw');
    else if (e.key === '3') stamp('bc');
    else if (e.key === 'b' || e.key === 'B') toolNext();
    else if (e.key === 'm' || e.key === 'M') { S.tab = S.tab === 'map' ? 'bits' : 'map'; render(); }
    else if (e.key === 'Enter' && S.answered) { e.preventDefault(); next(); }
  });
  document.addEventListener('pointerdown', function () { NA.sfx.unlock(); });

  window.__game = { state: function () { return S; }, start: startDay, endless: startEndless, stamp: stamp, next: next, tool: toolNext,
    answer: function () { return kindOf(S.dst, S.me); } };
  if (NA.wantsEndless()) { NA.ui.renderTags(GAME_ID); startEndless(); } else menu();
})();
