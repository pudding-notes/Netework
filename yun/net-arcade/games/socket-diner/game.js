/* 소켓 식당 — Quick Check W3-5(listen vs 연결 소켓, accept), W3-4(4-tuple), W3-3(Socket vs Port), W3-2(UDP가 빠르다?)
 *
 * 턴제 식당 경영. 시간 제한 없음.
 *   식당 = 서버 프로세스, 출입문 번호 = 포트(:443)
 *   입구 안내원 = listen 소켓(fd 3). 새 손님(SYN)만 맞는다
 *   줄 = accept 큐(backlog). 커널이 handshake를 끝낸 손님이 선다
 *   accept() = 줄 맨 앞 손님에게 전담 테이블(연결 소켓, 새 fd)을 내준다
 *   손님 명찰 = 4-tuple (손님 IP:포트 → 식당 IP:443)
 * 나는 커널 겸 지배인. 도착한 주문서(패킷)를 명찰이 맞는 테이블로 끌어다 놓는다.
 */
(function () {
  var GAME_ID = 'socket-diner';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));

  var SRV = '203.0.113.10:443';
  function G(n, ic, ip, port) { return { n: n, ic: ic, ip: ip, port: port }; }

  /* ------------------------------------------------------------ 스테이지 */
  var STAGES = [
    { mode: 'setup', title: '개업 준비', desc: 'socket → bind → listen → accept. 식당 문을 여는 순서.', qc: ['W3-5'],
      brief: '서버 프로그램을 <b>식당</b>으로 생각하자. 시간 제한은 없다.<br>' +
        '식당을 열려면 순서대로 시스템 호출을 해야 한다: 건물을 짓고, 문 번호를 달고, 입구 안내원을 세우고, 손님을 테이블로 안내한다.<br>' +
        '아래 카드 중 <b>다음에 할 일</b>을 차례로 누르자. 서버가 쓰지 않는 함수도 섞여 있다.',
      cards: [
        { id: 'socket', code: 'socket()', d: '소켓을 하나 만든다', ic: '🏗️', got: '<b>식당 건물(소켓 fd 3)</b>이 생겼다. 아직 주소도 문 번호도 없다.' },
        { id: 'bind', code: 'bind(0.0.0.0:443)', d: '주소와 포트를 붙인다', ic: '🚪', got: '<b>문 번호 :443</b>을 달았다. 손님이 찾아올 주소가 생겼다.' },
        { id: 'listen', code: 'listen(backlog=3)', d: '연결 요청을 받기 시작한다', ic: '🧑‍💼', got: '<b>입구 안내원</b>을 세웠다. 이 소켓은 이제 <b>listen 소켓</b>: 새 손님만 맞는다. 줄(accept 큐)은 3칸.' },
        { id: 'accept', code: 'accept()', d: '줄 선 연결 하나를 꺼낸다', ic: '🍽️', got: '줄 맨 앞 손님을 위한 <b>전담 테이블(연결 소켓 fd 4)</b>이 새로 생겼다. 안내원(fd 3)은 문 앞에 그대로!' },
        { id: 'io', code: 'recv() / send()', d: '주문을 받고 음식을 낸다', ic: '🍲', got: '<b>fd 4</b> 테이블에서 주문을 받고(recv) 음식을 냈다(send). 안내원은 대화에 끼지 않는다.' },
        { id: 'close', code: 'close(4)', d: '다 쓴 테이블을 정리한다', ic: '🧹', got: '손님이 떠난 <b>fd 4</b>를 정리했다. 안내원(fd 3)은 다음 손님을 기다린다.' },
        { id: 'connect', code: 'connect()', d: '상대에게 연결을 건다', decoy: true }
      ],
      order: ['socket', 'bind', 'listen', 'accept', 'io', 'close'],
      why: {
        connect: 'connect()는 <b>손님(클라이언트)</b>이 식당에 찾아올 때 쓰는 함수다. 서버는 accept()로 받는다.',
        bind: '먼저 소켓(건물)이 있어야 주소를 붙일 수 있다.',
        listen: { socket: '소켓부터 만들어야 한다.', bind: '어느 문(포트)에서 받을지 먼저 bind로 정하자. bind 없이 listen하면 운영체제가 아무 포트나 붙여 손님이 찾아올 수 없다.' },
        accept: '안내원(listen)이 없으면 손님이 줄을 설 수 없다. accept()는 줄에서 꺼내는 일이다.',
        io: '테이블(연결 소켓)이 생겨야 주문을 주고받을 수 있다. accept()가 먼저.',
        close: '아직 정리할 테이블에서 할 일이 남았다.',
        _: '순서를 다시 생각해 보자: 건물 → 문 번호 → 안내원 → 테이블 안내 → 주문 → 정리.'
      },
      quizzes: [
        { q: '손님(클라이언트) 쪽 프로그램의 순서는?', o: [
          { t: 'socket() → connect() → send()/recv() → close()', ok: true },
          { t: 'socket() → bind() → listen() → accept()', why: '그건 식당(서버) 쪽 순서다.' },
          { t: 'connect() → socket() → accept() → close()', why: '소켓부터 만들어야 하고, accept()는 서버의 일이다.' }],
          ok: '손님은 문 번호만 알면 된다. 자기 포트는 운영체제가 임시로 붙여 준다.' },
        { q: 'accept()가 하는 일은?', o: [
          { t: '손님에게 SYN을 보내 연결을 시작한다', why: '연결을 거는 건 손님(connect)이다. handshake는 커널이 처리한다.' },
          { t: 'handshake가 끝나 줄 선 연결을 꺼내, 그 손님 전용 연결 소켓(새 fd)을 만들어 돌려준다', ok: true },
          { t: '안내원(listen 소켓)을 그 손님 전용으로 바꿔 준다', why: '안내원은 계속 문 앞에서 새 손님을 맞는다. 테이블은 새로 생긴다.' }],
          ok: 'listen 소켓 = 접수처, 연결 소켓 = 손님마다 새로 생기는 전담 테이블.' }
      ],
      note: { 'W3-5': 'socket → bind → listen으로 안내원(listen 소켓, fd 3)을 세웠고, accept()가 손님마다 전담 테이블(연결 소켓, fd 4)을 새로 만들었다. 안내원은 대화에 끼지 않았다.' } },

    { mode: 'serve', title: '첫 영업', desc: '안내원은 새 손님만, 주문은 명찰이 맞는 테이블로.', qc: ['W3-5'], backlog: 3, coach: true,
      brief: '드디어 영업! 나는 <b>커널 겸 지배인</b>이다. 매 턴 아래 <b>우편함</b>에 패킷(주문서)이 도착한다.<br>' +
        '🔵 <b>SYN</b>(새 손님) → <b>입구 안내원</b>에게 · 🟢 <b>주문</b>·🟠 <b>떠남(FIN)</b> → <b>명찰(4-tuple)이 같은 테이블</b>에게.<br>' +
        '줄 선 손님은 <b>accept()</b>로 테이블에 앉힌다. 떠난 손님 테이블은 <b>close()</b>. 패킷은 끌어다 놓거나, 눌러 고른 뒤 대상을 누른다.',
      guests: { a: G('민수', '🧑', '198.51.100.7', 51000), b: G('지은', '👩', '203.0.113.77', 60001), c: G('태호', '👨', '192.0.2.40', 52222) },
      turns: [
        [['syn', 'a']],
        [['syn', 'b'], ['data', 'a', '김치찌개 하나요']],
        [['quiz', { q: '안내원(listen 소켓 fd 3)은 손님의 주문도 받아 줄까?', o: [
          { t: '받는다. 문 앞에 있으니 주문도 대신 받아 둔다', why: 'listen 소켓은 데이터를 주고받지 않는다. 새 연결 요청만 받는다.' },
          { t: '받지 않는다. 안내원은 새 손님(연결 요청)만 맞고, 주문은 각 손님의 테이블(연결 소켓)이 받는다', ok: true },
          { t: '첫 주문만 받고 나머지는 테이블로 넘긴다', why: '그런 규칙은 없다.' }], ok: '역할 분리: 접수(listen)와 대화(연결 소켓).' }],
          ['data', 'b', '된장찌개요'], ['syn', 'c']],
        [['fin', 'a'], ['data', 'c', '비빔밥 주세요']],
        [['fin', 'b'], ['data', 'c', '물 좀 더요']],
        [['fin', 'c']]
      ],
      note: { 'W3-5': '새 손님 SYN은 모두 안내원(listen 소켓)이 받았고, accept()마다 전담 테이블(fd 4, 5, 6)이 생겨 그 손님의 주문만 받았다.' } },

    { mode: 'serve', title: '같은 문, 다른 명찰', desc: '모든 손님이 :443으로 들어온다. 무엇으로 테이블을 구분할까?', qc: ['W3-4'], backlog: 3,
      brief: '이번엔 손님이 헷갈린다. <b>같은 사람의 탭 두 개</b>(같은 IP, 다른 포트), <b>포트 번호가 우연히 같은 다른 사람</b>(다른 IP, 같은 포트)이 섞여 온다.<br>' +
        '식당 쪽 주소는 모두 <b>203.0.113.10:443</b>으로 같다. 테이블은 <b>4-tuple 전체</b>로 구분한다.<br>' +
        '명찰을 끝까지 읽고 배달하자.',
      guests: { a: G('민수 탭1', '🧑', '198.51.100.7', 51000), b: G('민수 탭2', '🧑', '198.51.100.7', 51001), c: G('지은', '👩', '203.0.113.77', 51000), d: G('태호', '👨', '192.0.2.40', 51001) },
      turns: [
        [['syn', 'a'], ['syn', 'b']],
        [['data', 'b', '메뉴판 주세요'], ['data', 'a', '물 주세요'], ['syn', 'c']],
        [['data', 'c', '라면 하나'], ['data', 'a', '숟가락도요'], ['syn', 'd']],
        [['quiz', { q: '지금 테이블들은 식당 쪽 주소가 모두 :443이다. 커널은 도착한 패킷을 어느 테이블로 보낼지 무엇으로 정할까?', o: [
          { t: '손님 IP만 본다', why: '민수의 탭 두 개는 IP가 같다. IP만으로는 구분할 수 없다.' },
          { t: '(손님 IP, 손님 포트, 식당 IP, 식당 포트) 4-tuple 전체', ok: true },
          { t: '손님 포트만 본다', why: '민수 탭1과 지은은 포트가 51000으로 같다. 포트만으로도 구분할 수 없다.' }], ok: '4개가 모두 같아야 같은 연결이다.' }],
          ['data', 'd', '비빔밥요'], ['fin', 'b'], ['data', 'c', '계산서 주세요']],
        [['fin', 'a'], ['fin', 'c']],
        [['data', 'd', '잘 먹었어요'], ['fin', 'd']]
      ],
      note: { 'W3-4': '식당 포트는 모두 :443이었지만, 민수의 탭 두 개(같은 IP, 다른 포트)와 지은(다른 IP, 같은 포트 51000)을 4-tuple 전체로 구분해 각자의 테이블에 배달했다.' } },

    { mode: 'serve', title: '소켓 세기', desc: '줄이 짧고 손님은 많다. 포트는 하나, 소켓은 몇 개?', qc: ['W3-3'], backlog: 2,
      brief: '저녁 러시! 줄(backlog)이 <b>2칸</b>뿐이다. 줄이 꽉 찬 상태에서 새 손님이 오면 커널이 받지 못한다. <b>accept()를 제때</b> 하자.<br>' +
        '중간중간 <b>포트와 소켓의 개수</b>를 묻는 질문이 온다. 문 번호와 테이블 번호를 잘 세어 두자.',
      guests: { a: G('하늘', '👧', '198.51.100.21', 50100), b: G('바다', '👦', '198.51.100.22', 50200), c: G('산', '🧔', '203.0.113.90', 50300), d: G('들', '👱', '192.0.2.70', 50400), e: G('별', '👩‍🦱', '198.51.100.21', 50101) },
      turns: [
        [['syn', 'a'], ['syn', 'b']],
        [['syn', 'c'], ['data', 'a', '불고기']],
        [['quiz', { dyn: 'socks' }], ['data', 'b', '냉면'], ['data', 'c', '김밥'], ['syn', 'd']],
        [['quiz', { q: '지금 이 식당이 손님을 받는 데 쓰는 포트는 몇 개일까?', o: [
          { t: '테이블 수만큼. 손님마다 포트를 하나씩 새로 연다', why: '테이블(연결 소켓)이 늘어도 식당 쪽 포트는 :443 그대로다.' },
          { t: '1개 (:443)', ok: true },
          { t: '0개. accept() 이후엔 포트를 쓰지 않는다', why: '모든 테이블의 4-tuple에 식당 쪽 :443이 들어 있다.' }], ok: '포트는 문 번호 하나. 소켓은 안내원 + 테이블 수만큼.' }],
          ['fin', 'a'], ['syn', 'e'], ['data', 'd', '떡볶이']],
        [['data', 'e', '라볶이'], ['fin', 'b'], ['fin', 'c']],
        [['quiz', { q: 'Socket과 Port의 차이를 한 문장으로 하면?', o: [
          { t: 'Port는 호스트 안의 서비스를 가리키는 16비트 번호, Socket은 프로세스가 그 번호에 묶어 실제로 읽고 쓰는 OS 객체(손잡이)다', ok: true },
          { t: '둘은 같은 것을 부르는 다른 이름이다', why: '포트 하나(:443)에 소켓이 여러 개(안내원 + 테이블들) 있었다.' },
          { t: 'Port는 랜선을 꽂는 구멍, Socket은 거기 꽂는 케이블이다', why: '여기서 포트는 물리적인 구멍이 아니라 번호다.' }], ok: '문 번호(포트) 하나에 안내원 1 + 테이블 N = 소켓 N+1개.' }],
          ['fin', 'd'], ['fin', 'e']]
      ],
      note: { 'W3-3': '식당 포트는 내내 :443 하나였고, 소켓은 안내원(listen) 1개 + 손님 테이블(연결 소켓) 수만큼 늘었다 줄었다 했다.' } },

    { mode: 'assign', title: '정식 vs 테이크아웃', desc: '주문마다 TCP 정식 홀과 UDP 테이크아웃 창구 중 어디가 맞을까?', qc: ['W3-2'],
      brief: '식당에 <b>UDP 테이크아웃 창구</b>를 열었다. 테이블(연결) 없이 창구 하나(소켓 하나)가 누구에게서 오든 바로 받고 바로 내준다.<br>' +
        '<b>🍽️ TCP 정식 홀</b>: 착석(handshake) 후 순서대로, 빠지면 다시 내준다. 대신 시작이 느리고 하나 늦으면 뒤도 기다린다.<br>' +
        '<b>🥡 UDP 창구</b>: 착석 없이 바로. 순서·재전송·혼잡 제어는 없다(필요하면 앱이 직접).<br>' +
        '주문을 끌어다 알맞은 곳에 놓자.',
      items: [
        ['📦 앱 설치 파일 다운로드', '1바이트도 틀리면 안 된다', 'tcp', '파일은 전부, 순서대로 와야 한다. 빠진 조각은 반드시 다시 받아야 한다.'],
        ['💸 송금 요청', '중복·누락 절대 금지', 'tcp', '돈은 정확해야 한다. 신뢰성 있는 연결 위에서 주고받는다.'],
        ['📄 웹 페이지 HTML (HTTP/1.1)', '빠지면 페이지가 깨진다', 'tcp', 'HTTP/1.1·2는 TCP 위에서 돈다.'],
        ['🎮 게임 캐릭터 위치', '초당 60번 갱신', 'udp', '늦게 도착한 옛 위치는 쓸모없다. 다시 보내 기다리느니 다음 위치를 쓰는 게 낫다.'],
        ['🎙️ 음성 통화', '조금 끊겨도 지연이 더 싫다', 'udp', '재전송을 기다리면 대화가 밀린다. 약간의 손실은 귀가 메운다.'],
        ['🔎 DNS 질의', '짧은 질문 하나, 짧은 답 하나', 'udp', '질문 하나에 연결부터 맺는 건 낭비다. DNS는 기본으로 UDP 53을 쓴다(응답이 크면 TCP로).'],
        ['📧 이메일 보내기 (SMTP)', '본문이 통째로 가야 한다', 'tcp', '메일 본문은 빠짐없이 순서대로 가야 한다. SMTP는 TCP 위에서 돈다.'],
        ['🌡️ 센서 측정값', '초당 100번, 몇 개 빠져도 괜찮다', 'udp', '다음 값이 금방 온다. 하나하나 확인받을 필요가 없다.']
      ],
      quizzes: [
        { q: '"UDP가 빠르다"는 말은 어떤 의미에서 맞을까?', o: [
          { t: 'UDP 패킷이 선 위를 더 빨리 달려서, 같은 회선에서 처리량도 항상 더 크다', why: '전송 속도는 회선이 정한다. 처리량이 더 크다는 뜻이 아니다.' },
          { t: 'handshake·재전송 대기·순서 대기가 없어 시작과 전달 지연이 작다', ok: true },
          { t: '헤더가 작아서 같은 회선으로 두 배 넘게 보낼 수 있다', why: '헤더 차이(8 vs 20바이트)는 크지 않다. 두 배는 과장이다.' }],
          ok: '"빠르다"는 처리량이 아니라 <b>지연과 제어</b>의 문제다.' },
        { q: 'UDP로 보내는데 순서와 재전송이 꼭 필요해졌다면?', o: [
          { t: '불가능하다. UDP를 쓰면 포기해야 한다', why: '앱이 직접 만들 수 있다. HTTP/3의 QUIC이 바로 UDP 위에 그걸 만든 예다.' },
          { t: '운영체제가 알아서 UDP에도 재전송을 붙여 준다', why: 'UDP는 그런 기능이 없다. 그대로 전달할 뿐이다.' },
          { t: '앱(또는 QUIC 같은 상위 프로토콜)이 번호 매기기·확인·재전송을 직접 구현한다', ok: true }],
          ok: 'UDP의 단순함은 공짜가 아니다. 필요한 신뢰성은 <b>앱의 몫</b>.' }
      ],
      note: { 'W3-2': '파일·송금·웹 페이지·메일은 TCP 정식 홀로, 게임 위치·음성·DNS·센서값은 UDP 창구로 보냈다. UDP는 처리량이 아니라 시작·대기 지연이 작아서 "빠르다".' } }
  ];

  /* ------------------------------------------------------------ 상태 */
  var S = null;
  function newState(si) {
    return { si: si, cfg: STAGES[si], hearts: 5, over: false, coach: null, quiz: null, x: {},
      // setup
      done: [], tl: [], qi: 0,
      // serve
      turn: 0, queue: [], tables: [], mail: [], pid: 0, gone: {}, sel: null, flash: {}, st: { served: 0, wrong: 0, accepts: 0, closes: 0, overflow: 0, maxSock: 1 },
      // assign
      put: {}, bad: {} };
  }
  function startStage(si) {
    S = newState(si);
    NA.ui.briefing(ov, 'STAGE ' + (si + 1) + ' · ' + S.cfg.title, S.cfg.brief, function () {
      if (S.cfg.mode === 'serve') { S.coach = { who: '🧑‍🍳 사장님', t: S.cfg.coach ? '첫 턴을 시작하자. 오른쪽 <b>[다음 턴]</b>을 누르면 손님이 온다.' : '준비됐으면 <b>[다음 턴]</b>.' }; }
      if (S.cfg.mode === 'setup') S.coach = { who: '🧑‍🍳 사장님', t: '식당을 열자! 위 카드 중 <b>가장 먼저 할 일</b>을 누르자.' };
      if (S.cfg.mode === 'assign') S.coach = { who: '🧑‍🍳 사장님', t: '주문을 끌어다 <b>정식 홀</b>이나 <b>테이크아웃 창구</b>에 놓자. 다 놓으면 확인.' };
      render();
    });
  }
  function hurt(cls, who, t) {
    S.hearts--; S.st.wrong = (S.st.wrong || 0) + 1; NA.sfx.bad();
    S.coach = { cls: cls || 'no', who: who, t: t };
    if (S.hearts <= 0) { S.over = true; render(); var me = S; setTimeout(function () { if (S === me) debrief(false); }, 1500); return true; }
    return false;
  }

  /* ------------------------------------------------------------ 퀴즈 공통 */
  function askQuiz(q, then) {
    if (q.dyn === 'socks') {
      var n = S.tables.length;
      q = { q: '지금 이 식당에 열려 있는 소켓은 모두 몇 개일까? (테이블 ' + n + '개)', o: [
        { t: n + '개 (테이블 수만큼)', why: '안내원(listen 소켓 fd 3)도 소켓이다. 하나 더 세야 한다.' },
        { t: (n + 1) + '개 (안내원 1 + 테이블 ' + n + ')', ok: true },
        { t: '1개 (포트가 :443 하나니까)', why: '포트는 하나지만 소켓은 안내원과 테이블마다 따로 있다.' }], ok: '포트 :443 하나에 소켓 ' + (n + 1) + '개.' };
    }
    S.quiz = { q: q, opts: NA.shuffle(q.o.slice()), then: then }; S.x = {};
    S.coach = { who: '❓ 사장님의 질문', t: '' };
    render();
  }
  function answer(k) {
    var Q = S && S.quiz; if (!Q || S.over || S.x[k]) return;
    var o = Q.opts[k]; if (!o) return;
    if (o.ok) { NA.sfx.good(); var t = Q.then; S.quiz = null; S.coach = { cls: 'ok', who: '✓ 정답!', t: Q.q.ok }; render(); return t && setTimeout(t, 900); }
    S.x[k] = true;
    if (hurt('no', '✗ 아니다 (신뢰도 −1)', o.why)) return;
    render();
  }

  /* ------------------------------------------------------------ setup */
  function card(id) {
    if (!S || S.over || S.quiz || S.cfg.mode !== 'setup' || S.done.indexOf(id) >= 0) return;
    var c = S.cfg, want = c.order[S.done.length], cd = c.cards.filter(function (x) { return x.id === id; })[0];
    if (id !== want) {
      var w = c.why[id]; if (w && typeof w === 'object') w = w[want] || c.why._;
      S.badCard = id;
      if (hurt('no', '✗ 아직 아니다 (신뢰도 −1)', (w || c.why._))) return;
      return render();
    }
    S.done.push(id); S.tl.push(cd); NA.sfx.good();
    S.coach = { cls: 'ok', who: '✓ ' + cd.code, t: cd.got + (S.done.length === 3 ? '<br>📨 손님이 SYN을 보냈다 → <b>커널이 handshake를 대신 끝내고</b> 줄에 세웠다.' : '') };
    if (S.done.length === c.order.length) { render(); return setTimeout(function () { nextSetupQuiz(); }, 900); }
    render();
  }
  function nextSetupQuiz() {
    var q = S.cfg.quizzes[S.qi++];
    if (!q) return finish();
    askQuiz(q, nextSetupQuiz);
  }

  /* ------------------------------------------------------------ serve */
  function nextTurn() {
    if (!S || S.over || S.quiz || S.cfg.mode !== 'serve' || S.busy) return;
    if (S.turn >= S.cfg.turns.length) return;
    // CLOSE_WAIT 방치 검사
    var stale = S.tables.filter(function (t) { return t.fin && S.turn - t.finAt >= 2 && !t.warned; });
    var evs = S.cfg.turns[S.turn].slice();
    S.turn++;
    stale.forEach(function (t) { t.warned = true; });
    if (stale.length && hurt('no', '⚠️ 정리 안 한 테이블 (신뢰도 −1)', '손님이 떠난 테이블 <b>fd ' + stale.map(function (t) { return t.fd; }).join(', ') + '</b>을 두 턴째 정리하지 않았다. 이게 쌓이면 <b>CLOSE_WAIT</b>이 된다. close()를 부르자.')) return;
    runEvents(evs);
  }
  function runEvents(evs) {
    while (evs.length) {
      var e = evs.shift();
      if (e[0] === 'quiz') return askQuiz(e[1], function () { runEvents(evs); });
      var g = e[1];
      if (S.gone[g]) continue;
      S.mail.push({ id: ++S.pid, kind: e[0], g: g, text: e[2] || '' });
    }
    NA.sfx.tone(880, .05, 'triangle', .12);
    if (!S.coach || !S.coach.keep) S.coach = { who: '📬 턴 ' + S.turn, t: S.cfg.coach && S.turn === 1 ? '새 손님의 <b>SYN</b>이 우편함에 왔다. 끌어다 <b>입구 안내원</b>에게 놓자(눌러서 고른 뒤 안내원을 눌러도 된다).' : '우편함의 패킷을 처리하자. 다 했으면 [다음 턴].' };
    render();
    checkEnd();
  }
  function guest(g) { return S.cfg.guests[g]; }
  function tuple(g) { var x = guest(g); return x.ip + ':' + x.port; }
  function tableOf(g) { for (var i = 0; i < S.tables.length; i++) if (S.tables[i].g === g) return S.tables[i]; return null; }
  function route(pid, target) {
    if (!S || S.over || S.quiz) return;
    var pk = S.mail.filter(function (p) { return p.id === pid; })[0]; if (!pk) return;
    var gn = guest(pk.g), t = target === 'listen' ? null : S.tables.filter(function (x) { return x.fd === +target; })[0];
    S.sel = null;
    var ok = false, msg = '';
    if (pk.kind === 'syn') {
      if (target === 'listen') ok = true;
      else msg = 'SYN은 <b>새 손님의 연결 요청</b>이다. 테이블(연결 소켓)은 이미 맺어진 손님 전용. 새 손님은 <b>입구 안내원(listen 소켓)</b>이 맞는다.';
    } else {
      var own = tableOf(pk.g);
      if (!own) msg = gn.n + '(' + tuple(pk.g) + ')은 아직 테이블이 없다. 줄에 서 있다면 먼저 <b>accept()</b>로 앉히자.' + (target === 'listen' ? ' 안내원은 주문을 받지 않는다.' : '');
      else if (target === 'listen') msg = '안내원(listen 소켓)은 <b>새 연결 요청만</b> 받는다. 주문은 그 손님의 <b>테이블 fd ' + own.fd + '</b>로.';
      else if (t !== own) {
        var tg = guest(t.g);
        msg = '명찰이 다르다! 주문서는 <b>' + tuple(pk.g) + '</b> → :443인데, fd ' + t.fd + '는 <b>' + tuple(t.g) + '</b> 손님(' + tg.n + ') 자리다. ' +
          (tg.ip === gn.ip ? '<b>IP는 같지만 포트가 다르다</b>(다른 연결).' : tg.port === gn.port ? '<b>포트는 같지만 IP가 다르다</b>(다른 손님).' : '') + ' 4-tuple이 모두 같은 테이블은 <b>fd ' + own.fd + '</b>.';
      } else ok = true;
    }
    if (!ok) { S.badTarget = target; if (hurt('no', '✗ 잘못 배달 (신뢰도 −1)', msg)) return; return render(); }
    S.mail = S.mail.filter(function (p) { return p !== pk; });
    if (pk.kind === 'syn') {
      if (S.queue.length >= S.cfg.backlog) {
        S.gone[pk.g] = true; S.st.overflow++;
        S.mail = S.mail.filter(function (p) { return p.g !== pk.g; });
        if (hurt('no', '🚫 줄이 꽉 찼다 (신뢰도 −1)', '줄(accept 큐, backlog ' + S.cfg.backlog + '칸)이 가득해서 커널이 <b>' + gn.n + '</b>의 연결을 받지 못했다. 손님은 돌아갔다. 줄 선 손님을 <b>accept()</b>로 제때 앉히자.')) return;
      } else {
        S.queue.push(pk.g); NA.sfx.pop();
        S.coach = { cls: 'ok', who: '✓ 안내원이 맞이함', t: '커널이 <b>' + gn.n + '</b>와 handshake를 끝내고 줄에 세웠다. 이제 <b>accept()</b>로 테이블에 앉히자.' };
      }
    } else if (pk.kind === 'data') {
      S.st.served++; S.flash[t.fd] = true; NA.sfx.good();
      S.coach = { cls: 'ok', who: '✓ fd ' + t.fd + ' 서빙!', t: '<b>' + gn.n + '</b>의 "' + esc(pk.text) + '" → 테이블 <b>fd ' + t.fd + '</b>(' + tuple(pk.g) + ' ↔ ' + SRV + '). recv()로 받고 send()로 음식을 냈다.' };
    } else {
      t.fin = true; t.finAt = S.turn; NA.sfx.tone(500, .1, 'triangle', .14);
      S.coach = { cls: 'ok', who: '✓ ' + gn.n + ' 떠남 (FIN)', t: '테이블 fd ' + t.fd + '의 손님이 떠났다(read()가 0). 이제 <b>close(' + t.fd + ')</b>로 테이블을 정리하자.' };
    }
    render(); checkEnd();
  }
  function accept() {
    if (!S || S.over || S.quiz || S.cfg.mode !== 'serve') return;
    if (!S.queue.length) { S.coach = { who: '🧑‍🍳 사장님', t: '줄에 선 손님이 없다. (실제 accept()는 손님이 올 때까지 기다린다.)' }; return render(); }
    var g = S.queue.shift(), used = S.tables.map(function (t) { return t.fd; }), fd = 4;
    while (used.indexOf(fd) >= 0) fd++;
    S.tables.push({ fd: fd, g: g, fin: false });
    S.tables.sort(function (a, b) { return a.fd - b.fd; });
    S.st.accepts++; S.st.maxSock = Math.max(S.st.maxSock, S.tables.length + 1);
    NA.sfx.perfect(); S.flash[fd] = true;
    S.coach = { cls: 'ok', who: '✓ accept() → fd ' + fd, t: '<b>' + guest(g).n + '</b>에게 전담 테이블 <b>fd ' + fd + '</b>(연결 소켓)를 내줬다. 명찰: ' + tuple(g) + ' ↔ ' + SRV + '. 안내원(fd 3)은 그대로 문 앞에.' + (fd < 4 + S.tables.length - 1 ? ' (운영체제는 비어 있는 가장 작은 번호를 다시 쓴다.)' : '') };
    render(); checkEnd();
  }
  function closeFd(fd) {
    if (!S || S.over || S.quiz) return;
    var t = S.tables.filter(function (x) { return x.fd === fd; })[0]; if (!t) return;
    if (!t.fin) { S.badTarget = String(fd); if (hurt('no', '✗ 아직 식사 중 (신뢰도 −1)', '<b>' + guest(t.g).n + '</b>은 아직 떠나지 않았다(FIN 없음). 지금 close()하면 대화 중에 연결을 끊어 버린다.')) return; return render(); }
    S.tables = S.tables.filter(function (x) { return x !== t; }); S.st.closes++;
    NA.sfx.tick(true);
    S.coach = { cls: 'ok', who: '✓ close(' + fd + ')', t: '테이블 fd ' + fd + ' 정리 완료. 이 번호는 다음 accept()에서 다시 쓰일 수 있다.' };
    render(); checkEnd();
  }
  function checkEnd() {
    if (S.cfg.mode !== 'serve' || S.over || S.quiz) return;
    if (S.turn >= S.cfg.turns.length && !S.mail.length && !S.queue.length && !S.tables.length) { S.over = true; NA.sfx.win(); var me = S; setTimeout(function () { if (S === me) debrief(true); }, 900); }
  }

  /* ------------------------------------------------------------ assign */
  function putItem(i, zone) { if (!S || S.over || S.quiz || S.cfg.mode !== 'assign') return; if (zone) S.put[i] = zone; else delete S.put[i]; delete S.bad[i]; S.sel = null; NA.sfx.pop(); render(); }
  function checkAssign() {
    if (!S || S.over || S.quiz || S.cfg.mode !== 'assign') return;
    var it = S.cfg.items, left = it.filter(function (x, i) { return !S.put[i]; }).length;
    if (left) { S.coach = { cls: 'no', who: '아직', t: '배정하지 않은 주문이 <b>' + left + '개</b> 남았다.' }; NA.sfx.bad(); return render(); }
    var bad = {}, errs = [];
    it.forEach(function (x, i) { if (S.put[i] !== x[2]) { bad[i] = 1; errs.push('<b>' + x[0] + '</b> → ' + (x[2] === 'tcp' ? 'TCP 정식' : 'UDP 창구') + ': ' + x[3]); } });
    S.bad = bad;
    if (errs.length) { if (hurt('no', '✗ 다시 (신뢰도 −1)', '<ul>' + errs.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul>')) return; return render(); }
    NA.sfx.good(); S.assigned = true;
    S.coach = { cls: 'ok', who: '✓ 완벽한 배정!', t: '확실해야 하는 건 TCP, 늦느니 버리는 게 나은 건 UDP.' };
    render();
    setTimeout(nextAssignQuiz, 1100);
  }
  function nextAssignQuiz() { var q = S.cfg.quizzes[S.qi++]; if (!q) return finish(); askQuiz(q, nextAssignQuiz); }

  /* ------------------------------------------------------------ 끌기 */
  var drag = null;
  function dragSetup() {
    app.querySelectorAll('[data-pk],[data-ord]').forEach(function (el) {
      el.onpointerdown = function (e) {
        if (e.button !== 0 || !S || S.over || S.quiz) return; e.preventDefault();
        drag = { el: el, pk: el.dataset.pk ? +el.dataset.pk : null, ord: el.dataset.ord != null ? +el.dataset.ord : null, x: e.clientX, y: e.clientY, on: false };
        window.addEventListener('pointermove', dMove); window.addEventListener('pointerup', dEnd); window.addEventListener('pointercancel', dEnd);
      };
    });
  }
  function targets(d) { return [].slice.call(app.querySelectorAll(d && d.pk != null ? '[data-sock]' : '[data-zone]')); }
  function hitT(e, d) { var ts = targets(d); for (var i = 0; i < ts.length; i++) { var r = ts[i].getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return ts[i]; } return null; }
  function dMove(e) {
    if (!drag) return;
    if (!drag.on) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 6) return;
      drag.on = true; var g = document.createElement('div'); g.className = 'drag-ghost pkg'; g.textContent = drag.el.dataset.lbl; document.body.appendChild(g); drag.g = g; drag.el.classList.add('drag-src');
    }
    drag.g.style.left = e.clientX + 'px'; drag.g.style.top = e.clientY + 'px';
    app.querySelectorAll('.drop,.hot').forEach(function (x) { x.classList.remove('drop', 'hot'); });
    var t = hitT(e, drag); if (t) t.classList.add(drag.pk != null ? 'drop' : 'hot');
  }
  function dEnd(e) {
    window.removeEventListener('pointermove', dMove); window.removeEventListener('pointerup', dEnd); window.removeEventListener('pointercancel', dEnd);
    var d = drag; drag = null; if (!d) return;
    if (d.g) d.g.remove(); d.el.classList.remove('drag-src');
    app.querySelectorAll('.drop,.hot').forEach(function (x) { x.classList.remove('drop', 'hot'); });
    if (!d.on) { var key = d.pk != null ? 'p' + d.pk : 'o' + d.ord; S.sel = S.sel === key ? null : key; NA.sfx.tick(); return render(); }
    var t = e && e.type === 'pointerup' ? hitT(e, d) : null;
    if (d.pk != null) { if (t) route(d.pk, t.dataset.sock); else render(); }
    else { if (t) putItem(d.ord, t.dataset.zone); else if (e && e.type === 'pointerup') putItem(d.ord, null); else render(); }
  }
  function clickTarget(kind, val) {
    if (!S || !S.sel) return;
    if (kind === 'sock' && S.sel[0] === 'p') route(+S.sel.slice(1), val);
    if (kind === 'zone' && S.sel[0] === 'o') putItem(+S.sel.slice(1), val);
  }

  /* ------------------------------------------------------------ 결산 */
  function finish() { S.over = true; NA.sfx.win(); var me = S; setTimeout(function () { if (S === me) debrief(true); }, 700); }
  function debrief(win) {
    var stars = !win ? 0 : S.hearts >= 5 ? 3 : S.hearts >= 3 ? 2 : 1, st = S.st;
    var stats = S.cfg.mode === 'serve' ? [['남은 신뢰도', S.hearts + '/5'], ['서빙', st.served], ['accept()', st.accepts], ['close()', st.closes], ['최대 소켓 수', st.maxSock], ['돌려보낸 손님', st.overflow]]
      : [['남은 신뢰도', S.hearts + '/5'], ['실수', st.wrong || 0]];
    NA.ui.debrief({
      overlay: ov, gameId: GAME_ID, stage: S.si, win: win, stars: stars, score: S.hearts * 20,
      title: win ? '영업 종료! 오늘도 성황' : '가게 문을 닫는다',
      sub: win ? '남은 신뢰도 ' + S.hearts + '/5' : '신뢰도가 바닥났다. 사장님의 해설을 떠올리며 다시 해 보자.',
      stats: stats, qc: S.cfg.qc, playNotes: S.cfg.note,
      onRetry: function () { startStage(S.si); },
      onNext: S.si + 1 < STAGES.length ? function () { startStage(S.si + 1); } : null,
      onMenu: menu
    });
  }
  function menu() {
    S = null; app.innerHTML = '';
    NA.ui.renderTags(GAME_ID);
    NA.ui.stageMenu({
      overlay: ov, gameId: GAME_ID, stages: STAGES, onPick: startStage,
      howto: '서버 프로그램 = <b>식당</b>. 문 번호 = <b>포트(:443)</b>, 입구 안내원 = <b>listen 소켓</b>, 전담 테이블 = <b>연결 소켓</b>(accept()마다 새 fd), 손님 명찰 = <b>4-tuple</b>.<br>' +
        '턴마다 우편함에 도착한 패킷을 알맞은 소켓으로 <b>끌어다 놓는다</b>. 틀리면 신뢰도 −1(5칸). 시간 제한 없음.<br>' +
        '단축키 <span class="key">Enter</span> 다음 턴 · <span class="key">A</span> accept() · <span class="key">1</span>~<span class="key">3</span> 보기'
    });
  }

  /* ------------------------------------------------------------ 렌더 */
  function render() {
    if (!S) return;
    var c = S.cfg, h = ''; for (var k = 0; k < 5; k++) h += k < S.hearts ? '♥' : '<i>♥</i>';
    var cnt = c.mode === 'serve' ? '턴 ' + S.turn + ' / ' + c.turns.length : c.mode === 'setup' ? '준비 ' + S.done.length + ' / ' + c.order.length : '배정 ' + Object.keys(S.put).length + ' / ' + c.items.length;
    var html = '<div class="hud"><span class="t">STAGE ' + (S.si + 1) + ' · ' + esc(c.title) + '</span><span class="hearts">' + h + '</span><span class="cnt">' + cnt + '</span><span class="sp"></span><button class="na-btn" data-guide>규칙</button></div>';
    html += '<div class="main"><div class="rest">' + (c.mode === 'serve' ? serveHTML() : c.mode === 'setup' ? setupHTML() : assignHTML()) + '</div><div class="side">' + sideHTML() + '</div></div>';
    app.innerHTML = html;
    bind();
    S.flash = {}; S.badTarget = null; S.badCard = null;
  }
  function setupHTML() {
    var c = S.cfg;
    var cards;
    if (!S.cardOrder) S.cardOrder = NA.shuffle(c.cards.map(function (x) { return x.id; }));
    cards = '<div class="cards">' + S.cardOrder.map(function (id, i) {
      var cd = c.cards.filter(function (x) { return x.id === id; })[0], used = S.done.indexOf(id) >= 0;
      return '<button class="card' + (used ? ' used' : '') + (S.badCard === id ? ' bad' : '') + '" data-card="' + id + '"><code>' + (i + 1) + '. ' + esc(cd.code) + '</code><span>' + esc(cd.d) + '</span></button>';
    }).join('') + '</div>';
    var tl = '<div class="timeline"><h4>🏪 개업 일지 (서버 쪽 시스템 호출 순서)</h4>' + c.order.map(function (id, i) {
      var cd = S.tl[i];
      return cd ? '<div class="tl"><span class="ic">' + cd.ic + '</span><code>' + esc(cd.code) + '</code><span>' + cd.got + '</span></div>' : '<div class="tl ph"><span class="ic">⬜</span><code>' + (i + 1) + '단계</code><span>?</span></div>';
    }).join('') + '</div>';
    return '<div class="setup">' + cards + tl + '</div>';
  }
  function serveHTML() {
    var c = S.cfg;
    var qs = ''; for (var i = 0; i < c.backlog; i++) { var g = S.queue[i]; qs += g ? '<div class="qs full"><span class="gi">' + guest(g).ic + '</span>' + esc(guest(g).n) + '<span class="tp">' + tuple(g) + '</span></div>' : '<div class="qs">빈 자리</div>'; }
    var front = '<div class="front"><div class="door"><span class="sign">🚪 ' + SRV + ' <small>식당 주소·문 번호(포트)</small></span>' +
      '<div class="host' + (S.badTarget === 'listen' ? ' bad' : '') + '" data-sock="listen"><span class="ic">🧑‍💼</span><span><b>입구 안내원 · fd 3</b><small>listen 소켓<br>새 손님(SYN)만 맞는다</small></span></div></div>' +
      '<div class="queue"><h4><span>⏳ 줄 (accept 큐 · backlog ' + c.backlog + ')</span><span>handshake 끝난 손님</span></h4><div class="qslots">' + qs + '</div>' +
      '<div class="qa"><button class="na-btn primary" data-accept' + (S.queue.length ? '' : ' disabled') + '>accept() (A)</button><small>줄 맨 앞 손님에게 새 테이블(fd)을 내준다</small></div></div></div>';
    var tables = S.tables.map(function (t) {
      var g = guest(t.g);
      return '<div class="table' + (t.fin ? ' fin' : '') + (S.flash[t.fd] ? ' served' : '') + (S.badTarget === String(t.fd) ? ' bad' : '') + '" data-sock="' + t.fd + '"><div class="hd"><span class="fd">fd ' + t.fd + '</span><span class="gi">' + g.ic + '</span><b>' + esc(g.n) + '</b></div>' +
        '<div class="tp">손님 <i>' + g.ip + ':' + g.port + '</i><br>식당 ' + SRV + '</div>' +
        '<div class="stt">' + (t.fin ? '<span>손님이 떠남 (FIN)</span><button data-close="' + t.fd + '">close(' + t.fd + ')</button>' : '<span>🍽️ 식사 중 · 연결 소켓</span>') + '</div></div>';
    }).join('');
    if (!tables) tables = '<div class="empty">아직 테이블이 없다. 줄 선 손님을 accept()로 앉히면 전담 테이블(연결 소켓)이 생긴다.</div>';
    var pks = S.mail.slice(0, 4).map(function (p) {
      var g = guest(p.g), lab = { syn: '🔵 SYN · 새 손님', data: '🟢 주문', fin: '🟠 FIN · 떠남' }[p.kind];
      return '<div class="pk ' + p.kind + (S.sel === 'p' + p.id ? ' sel' : '') + '" data-pk="' + p.id + '" data-lbl="' + esc(lab + ' ' + g.ip + ':' + g.port) + '"><span class="k">' + lab + '</span><span class="tp">' + g.ip + ':' + g.port + '<br>→ ' + SRV + '</span><span class="tx">' + g.ic + ' ' + esc(p.kind === 'data' ? '"' + p.text + '"' : g.n) + '</span></div>';
    }).join('');
    var more = S.mail.length > 4 ? ' · 뒤에 ' + (S.mail.length - 4) + '장 더' : '';
    var mail = '<div class="mail"><h4><span>📬 우편함 (도착한 패킷 ' + S.mail.length + more + ')</span><span>끌어다 소켓에 놓기 · 눌러 고른 뒤 대상 누르기</span></h4><div class="pks">' + (pks || '<span class="none">비어 있다. [다음 턴]을 누르자.</span>') + '</div></div>';
    return front + '<div class="hall">' + tables + '</div>' + mail;
  }
  function assignHTML() {
    var it = S.cfg.items;
    function ord(x, i) { return '<div class="ord' + (S.sel === 'o' + i ? ' sel' : '') + (S.bad[i] ? ' bad' : '') + '" data-ord="' + i + '" data-lbl="' + esc(x[0]) + '">' + esc(x[0]) + '<small>' + esc(x[1]) + '</small></div>'; }
    var loose = it.map(function (x, i) { return S.put[i] ? '' : ord(x, i); }).join('');
    function zone(id, h, p) { return '<div class="zone ' + id + '" data-zone="' + id + '"><h4>' + h + '</h4><p>' + p + '</p><div class="in">' + it.map(function (x, i) { return S.put[i] === id ? ord(x, i) : ''; }).join('') + '</div></div>'; }
    return '<div class="assign"><div class="orders">' + (loose || '<span style="color:#d9b994;font-size:13px;align-self:center">모든 주문을 배정했다. 오른쪽 [확인]을 누르자.</span>') + '</div>' +
      '<div class="zones">' + zone('tcp', '🍽️ TCP 정식 홀', '착석(handshake) → 순서대로 → 빠지면 다시. 정확하지만 시작이 느리고, 하나 늦으면 뒤도 기다린다.') +
      zone('udp', '🥡 UDP 테이크아웃 창구', '착석 없이 창구 하나로 바로. 빠르게 시작하지만 순서·재전송·혼잡 제어는 없다.') + '</div></div>';
  }
  function sideHTML() {
    var c = S.cfg, h = '';
    if (c.mode === 'serve') {
      var done = S.turn >= c.turns.length;
      h += '<div class="turn"><span class="n">턴<b>' + S.turn + ' / ' + c.turns.length + '</b></span><button class="na-btn primary" data-turn' + (done || S.quiz || S.over ? ' disabled' : '') + '>' + (done ? '남은 일을 마무리하자' : '다음 턴 ▶ (Enter)') + '</button></div>';
    }
    if (c.mode === 'assign') h += '<div class="turn"><span class="n">배정<b>' + Object.keys(S.put).length + ' / ' + c.items.length + '</b></span><button class="na-btn primary" data-check' + (S.assigned || S.over || S.quiz ? ' disabled' : '') + '>확인 (Enter)</button></div>';
    var co = S.coach || { who: '', t: '' };
    var quiz = '';
    if (S.quiz) quiz = '<div class="q">' + esc(S.quiz.q.q) + '</div>' + S.quiz.opts.map(function (o, i) { return '<button class="opt' + (S.x[i] ? ' x' : '') + '" data-ans="' + i + '"><span class="n">' + (i + 1) + '</span>' + esc(o.t) + '</button>'; }).join('');
    h += '<div class="coach' + (co.cls && !S.quiz ? ' ' + co.cls : co.cls === 'no' ? ' no' : '') + '"><span class="who">' + co.who + '</span>' + (S.quiz && co.cls !== 'no' ? '' : co.t || '') + quiz + '</div>';
    if (c.mode === 'serve') h += '<div class="stats"><div>서빙<b>' + S.st.served + '</b></div><div>테이블<b>' + S.tables.length + '</b></div><div>줄<b>' + S.queue.length + '/' + c.backlog + '</b></div></div>';
    return h;
  }
  function bind() {
    var all = function (sel, fn) { app.querySelectorAll(sel).forEach(function (e) { e.onclick = function (ev) { fn(e, ev); }; }); };
    all('[data-card]', function (e) { card(e.dataset.card); });
    all('[data-ans]', function (e) { answer(+e.dataset.ans); });
    all('[data-accept]', accept); all('[data-turn]', nextTurn); all('[data-check]', checkAssign); all('[data-guide]', guide);
    all('[data-close]', function (e, ev) { ev.stopPropagation(); closeFd(+e.dataset.close); });
    all('[data-sock]', function (e, ev) { if (ev.target.closest('[data-close]')) return; clickTarget('sock', e.dataset.sock); });
    all('[data-zone]', function (e, ev) { if (ev.target.closest('[data-ord]')) return; clickTarget('zone', e.dataset.zone); });
    dragSetup();
  }
  function guide() {
    var back = ov.innerHTML, wasHidden = ov.hidden;
    ov.innerHTML = '<div class="na-card guide"><h2>소켓 식당 운영 안내</h2>' +
      '<h4>서버 순서</h4><p>socket() → bind(주소:포트) → listen(backlog) → accept() 반복 → recv()/send() → close(). 손님(클라이언트)은 socket() → connect() → send()/recv() → close().</p>' +
      '<h4>listen 소켓 vs 연결 소켓</h4><p>listen 소켓(안내원)은 새 연결 요청만 받는다. 커널이 handshake를 끝낸 연결은 줄(accept 큐)에 서고, accept()가 그 손님 전용 연결 소켓(새 fd)을 만들어 준다. 주문(데이터)은 연결 소켓으로 오간다.</p>' +
      '<h4>4-tuple</h4><p>(손님 IP, 손님 포트, 식당 IP, 식당 포트). 식당 쪽이 모두 :443이어도 손님 쪽이 달라서 연결이 구분된다. 4개가 모두 같아야 같은 연결.</p>' +
      '<h4>Port vs Socket</h4><p>포트는 서비스를 가리키는 16비트 번호(문 번호), 소켓은 프로세스가 읽고 쓰는 OS 객체(fd). :443 하나에 소켓은 listen 1 + 연결 N.</p>' +
      '<h4>TCP vs UDP</h4><p>TCP: 연결·순서·재전송·혼잡 제어. UDP: 연결 없이 바로, 대신 그런 기능은 앱 몫. "UDP가 빠르다"는 지연이 작다는 뜻이지 처리량이 크다는 뜻이 아니다.</p>' +
      '<div class="na-row"><button class="na-btn primary" data-close-guide>닫기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-close-guide]').onclick = function () { ov.innerHTML = back; ov.hidden = wasHidden; };
  }

  /* ------------------------------------------------------------ 입력 */
  window.addEventListener('keydown', function (e) {
    if (!S || !ov.hidden || S.over) return;
    var k = e.key;
    if (S.quiz) { if (/^[1-3]$/.test(k)) answer(+k - 1); return; }
    if (S.cfg.mode === 'serve') { if (k === 'Enter') { e.preventDefault(); nextTurn(); } else if (k === 'a' || k === 'A') accept(); }
    else if (S.cfg.mode === 'assign' && k === 'Enter') { e.preventDefault(); checkAssign(); }
    else if (S.cfg.mode === 'setup' && /^[1-7]$/.test(k) && S.cardOrder) card(S.cardOrder[+k - 1]);
  });

  window.__game = {
    state: function () { return S; }, start: startStage, stages: STAGES,
    card: card, answer: answer, turn: nextTurn, route: route, accept: accept, close: closeFd, put: putItem, check: checkAssign,
    // 테스트용: 패킷의 정답 대상
    target: function (pk) { if (pk.kind === 'syn') return 'listen'; var t = tableOf(pk.g); return t ? String(t.fd) : null; }
  };
  menu();
})();
