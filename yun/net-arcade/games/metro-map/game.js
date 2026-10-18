/* AI 서비스 노선도 — Week 1 Quick Check W1-1(대역폭 vs 지연), W1-2(Cloud = 운영 모델), W1-3(Client/Server는 역할), W1-4(Edge와 Cloud), W1-5(AI도 request/response)
 *
 * 미니 메트로 풍 노선도. 턴제, 시간 제한 없음.
 *   route  : 역을 차례로 눌러 질문 승객의 노선을 잇는다
 *   pick   : 승객마다 빠른 노선(대역폭)과 가까운 노선(지연) 중 고른다. 시간 = 왕복 × RTT + 크기 ÷ 대역폭
 *   roles  : 장면마다 장비의 역할(클라이언트/서버/둘 다)을 붙인다
 *   sort   : 일을 Edge 역과 Cloud 역에 나눠 놓는다 (끌어다 놓기)
 *   scale  : 서버를 직접 사서 운영 vs 클라우드로 날마다 늘리고 줄이기
 */
(function () {
  var GAME_ID = 'metro-map';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));

  /* ------------------------------------------------------------ 스테이지 */
  var STAGES = [
    { mode: 'route', title: '질문 승객의 여정', desc: '프롬프트 하나가 GPU까지 가는 노선을 직접 잇는다.', qc: ['W1-5'],
      brief: '여기는 <b>AI 서비스 노선도</b>. 내가 챗봇에 질문을 보내면, 그 질문(프롬프트)은 <b>승객</b>이 되어 여러 역을 거친다.<br>' +
        '역을 <b>차례로 눌러</b> 노선을 이어 보자. 시작은 💻 브라우저. 엉뚱한 역이 섞여 있다. 시간 제한은 없다.',
      stations: {
        browser: { x: 90, y: 300, ic: '💻', n: '브라우저', s: '질문 입력', sq: true },
        dns: { x: 230, y: 130, ic: '📖', n: 'DNS', s: '이름 → IP' },
        net: { x: 390, y: 300, ic: '🌐', n: '인터넷', s: '라우터들' },
        lb: { x: 540, y: 140, ic: '🚪', n: 'Gateway · LB', s: '입구·분배' },
        api: { x: 690, y: 290, ic: '🖥️', n: 'API 서버', s: '요청 처리' },
        gpu: { x: 650, y: 480, ic: '🎮', n: 'GPU 서버', s: '모델 추론', sq: true },
        local: { x: 170, y: 480, ic: '🧠', n: '브라우저 속 AI', s: '내 PC에서 추론?' },
        wire: { x: 420, y: 500, ic: '🛰️', n: 'GPU 전용 회선', s: 'HTTP 없이 직통?' }
      },
      order: ['browser', 'dns', 'net', 'lb', 'api', 'gpu'],
      say: {
        dns: '📖 <b>DNS 역</b>: "api.chat.example은 어디?" → IP를 받아 온다. 이름만으로는 갈 수 없다.',
        net: '🌐 <b>인터넷 역</b>: 프롬프트가 HTTPS 요청에 실려 여러 라우터를 지난다.',
        lb: '🚪 <b>Gateway·로드밸런서 역</b>: 서비스의 입구. 인증을 확인하고, 요청을 한가한 API 서버로 나눈다.',
        api: '🖥️ <b>API 서버 역</b>: 요청을 읽고 대화 맥락을 붙여 추론을 맡긴다.',
        gpu: '🎮 <b>GPU 서버 역</b>: 모델이 토큰을 하나씩 만들어 낸다. 결과는 같은 길을 거꾸로 따라 <b>응답</b>으로 돌아간다.'
      },
      why: {
        local: '이 챗봇의 큰 모델은 내 브라우저에 들어 있지 않다. 질문은 네트워크를 타고 데이터센터의 GPU로 간다.',
        wire: 'AI 서비스도 특별한 전용선이 아니라 평범한 인터넷과 HTTP(S) 위에서 요청·응답을 주고받는다.',
        _: '순서를 다시 생각하자: 이름을 IP로 바꾸고 → 인터넷을 지나 → 서비스 입구 → 처리 서버 → GPU.'
      },
      quizzes: [
        { q: '"AI 서비스도 결국 네트워크로 request와 response를 주고받는다." 맞을까?', o: [
          { t: '맞다. 프롬프트는 HTTP 요청으로 API 서버에 가고, GPU 추론 결과가 응답으로 돌아온다', ok: true },
          { t: '틀리다. AI 모델은 브라우저에 내려받아 실행되므로 질문할 때 요청이 오가지 않는다', why: '방금 노선에서 봤듯이 큰 모델은 데이터센터 GPU에 있다.' },
          { t: '틀리다. AI는 GPU 전용 회선을 써서 HTTP 같은 인터넷 프로토콜을 쓰지 않는다', why: '평범한 인터넷과 HTTPS를 쓴다.' }],
          ok: 'Browser → DNS → Internet → Gateway/LB → API Server → GPU. 이번 학기의 모든 계층을 지난다.' }
      ],
      note: { 'W1-5': '프롬프트는 브라우저 → DNS → 인터넷 → Gateway·LB → API 서버 → GPU 노선을 따라 요청으로 갔고, 결과는 같은 길을 거꾸로 응답으로 돌아왔다.' } },

    { mode: 'pick', title: '빠른 노선, 가까운 역', desc: '1Gbps 태평양선과 100Mbps 서울선. 승객마다 어디가 더 빠를까?', qc: ['W1-1'],
      brief: '서버가 두 곳에 있다. <b>🔵 서울선</b>: 가깝지만 좁다(대역폭 100Mbps, 왕복 지연 RTT 5ms). <b>🔴 태평양선</b>: 넓지만 멀다(1Gbps, RTT 150ms).<br>' +
        '걸리는 시간 ≈ <b>왕복 횟수 × RTT</b> + <b>데이터 크기 ÷ 대역폭</b>. 승객(작업)마다 더 빨리 끝나는 노선을 고르자.<br>' +
        '(실제로는 TCP 연결 준비 등이 더 붙지만, 여기서는 이 두 가지만 센다.)',
      lines: { seoul: { n: '서울선', rtt: 5, bw: 100, col: '#2f7de1' }, pac: { n: '태평양선', rtt: 150, bw: 1000, col: '#e8463a' } },
      pax: [
        { ic: '💬', n: '챗봇과 대화', d: '짧은 질문·답을 10번 주고받음 (총 20KB)', trips: 10, bytes: 20e3 },
        { ic: '📦', n: 'AI 모델 파일 받기', d: '요청 1번, 4GB 다운로드', trips: 1, bytes: 4e9 },
        { ic: '⌨️', n: '검색어 자동완성', d: '글자마다 1번 왕복 × 15번 (각 1KB)', trips: 15, bytes: 15e3 },
        { ic: '🎬', n: '강의 영상 올리기', d: '요청 1번, 1.5GB 업로드', trips: 1, bytes: 1.5e9 }
      ],
      quizzes: [
        { q: '"인터넷 속도가 1Gbps면 latency도 항상 낮다." 맞을까?', o: [
          { t: '맞다. 대역폭이 크면 패킷이 선 위를 더 빨리 달려 왕복 시간도 준다', why: '태평양선은 1Gbps인데도 RTT가 150ms였다. 신호가 가는 속도는 대역폭과 상관없다.' },
          { t: '틀리다. 1Gbps는 초당 실어 나르는 양이고, latency는 거리·홉 수·큐 대기가 정하는 지연이다', ok: true },
          { t: '맞다. 1Gbps 링크에서는 큐가 생기지 않아 RTT가 항상 수 ms 이하다', why: '거리가 멀면 RTT는 클 수밖에 없다.' }],
          ok: '작은 요청을 여러 번 주고받으면 <b>RTT</b>가, 큰 파일 하나면 <b>대역폭</b>이 시간을 정한다.' }
      ],
      note: { 'W1-1': '챗봇 대화·자동완성처럼 작은 요청을 여러 번 주고받는 일은 RTT가 짧은 서울선이, 모델 파일·영상처럼 큰 데이터 하나는 대역폭이 큰 태평양선이 빨랐다.' } },

    { mode: 'roles', title: '누가 서버일까', desc: '같은 노트북도 장면마다 클라이언트였다가 서버가 된다.', qc: ['W1-3'],
      brief: '클라이언트와 서버는 <b>장비 종류</b>가 아니라 <b>통신에서의 역할</b>이다.<br>' +
        '<b>요청을 보내는 쪽 = 클라이언트</b>, <b>요청을 받아 서비스하는 쪽 = 서버</b>. 화살표(→)가 요청 방향이다.<br>' +
        '장면마다 각 장비의 역할을 골라 붙이자. 중간에서 받기도 하고 보내기도 하면 <b>둘 다</b>.',
      scenes: [
        { d: '노트북의 파이썬 코드가 AI API를 호출해 요약을 받는다.', nodes: [['💻', '내 노트북', 'c'], ['🤖', 'AI API 서버', 's']], arrows: ['HTTP 요청'] },
        { d: '내 노트북에서 FastAPI를 띄웠다. 친구가 폰 브라우저로 접속해 결과를 본다.', nodes: [['📱', '친구 폰', 'c'], ['💻', '내 노트북 (FastAPI)', 's']], arrows: ['GET /'] },
        { d: '노트북이 챗봇 API를 부르면, API 서버는 다시 GPU 추론 서버에 일을 맡긴다.', nodes: [['💻', '내 노트북', 'c'], ['🖥️', 'API 서버', 'b'], ['🎮', 'GPU 추론 서버', 's']], arrows: ['질문', '추론 요청'] },
        { d: '작은 IoT 카메라가 웹 관리 페이지를 연다. 노트북 브라우저로 접속해 설정을 바꾼다.', nodes: [['💻', '노트북 브라우저', 'c'], ['📷', 'IoT 카메라', 's']], arrows: ['설정 페이지 요청'] },
        { d: '쇼핑몰 웹 서버가 주문 내역을 보여 주려고 DB 서버에 쿼리를 보낸다.', nodes: [['🖥️', '웹 서버', 'c'], ['🗄️', 'DB 서버', 's']], arrows: ['SELECT 쿼리'] }
      ],
      why: {
        c: '이 장면에서 <b>요청을 보내는</b> 쪽이다 → 클라이언트.',
        s: '이 장면에서 <b>요청을 받아 서비스하는</b> 쪽이다 → 서버.',
        b: '앞쪽에게는 요청을 받는 서버이고, 뒤쪽에게는 요청을 보내는 클라이언트다 → 둘 다.'
      },
      quizzes: [
        { q: '"Client와 Server는 장치 종류가 아니라 통신에서의 역할이다." 맞을까?', o: [
          { t: '틀리다. 서버는 데이터센터의 고성능 장비이고 개인 PC는 항상 클라이언트다', why: 'FastAPI를 띄운 노트북은 서버였다.' },
          { t: '틀리다. 스마트폰이나 IoT 기기는 서버가 될 수 없다', why: 'IoT 카메라가 웹 페이지를 서비스하는 서버였다.' },
          { t: '맞다. 같은 장비도 요청을 보내면 클라이언트, 받아서 서비스하면 서버다', ok: true }],
          ok: '역할은 <b>누가 요청하고 누가 응답하느냐</b>로 정해진다. API 서버처럼 둘 다인 경우도 흔하다.' }
      ],
      note: { 'W1-3': '같은 노트북이 AI API를 부를 땐 클라이언트, FastAPI를 띄웠을 땐 서버였다. API 서버는 앞에선 서버, GPU 서버에겐 클라이언트였고, 작은 IoT 카메라도 서버가 될 수 있었다.' } },

    { mode: 'sort', title: 'Edge 역 세우기', desc: 'AI 카메라 100대. 무엇을 가까이(Edge)에서, 무엇을 Cloud에서 할까?', qc: ['W1-4'],
      brief: '매장 100곳에 <b>AI CCTV 카메라</b>를 단다. 카메라 가까이에 작은 컴퓨터를 둔 <b>Edge 역</b>과, 멀리 있는 <b>Cloud 역</b>이 있다.<br>' +
        '일마다 어디서 처리할지 <b>끌어다 놓자</b>(눌러서 고른 뒤 역을 눌러도 된다).<br>' +
        '판단 기준: <b>지연</b>(얼마나 빨리 반응해야 하나), <b>대역폭</b>(얼마나 많이 보내야 하나), <b>규모</b>(데이터를 모아야 하나).',
      ctx: '카메라 1대 = 4K 영상 약 <b>25Mbps</b> · 매장 업로드 회선 <b>50Mbps</b> · 클라우드까지 RTT <b>80ms</b> · 침입 경보는 <b>0.1초</b> 안에',
      items: [
        ['🚨 침입자 실시간 감지', '0.1초 안에 경보', 'edge', '클라우드 왕복(80ms)과 영상 업로드를 기다리면 늦는다. 카메라 옆에서 바로 추론한다.'],
        ['🙈 얼굴 블러 처리', '개인정보를 밖으로 내보내기 전에', 'edge', '원본이 매장 밖으로 나가기 전에 가까이서 처리해야 한다.'],
        ['📉 "사람 나타남" 이벤트만 골라 보내기', '영상 대신 짧은 기록', 'edge', '4K 영상을 통째로 보내면 회선이 모자란다. Edge에서 요약해 작은 이벤트만 올린다.'],
        ['🗄️ 1년치 이벤트·클립 보관', '전체 매장 기록', 'cloud', '모든 매장의 기록을 한곳에 오래 저장하는 일은 Cloud가 맡는다.'],
        ['🧠 모델 재학습', '쌓인 데이터로 GPU 학습', 'cloud', '대량의 데이터와 큰 GPU가 필요하다. Cloud의 몫.'],
        ['📊 전국 매장 통계 대시보드', '100곳을 한눈에', 'cloud', '여러 Edge의 결과를 모아 분석하는 건 Cloud에서.'],
        ['🔄 새 모델을 모든 카메라에 배포', '버전 관리', 'cloud', '모델 버전 관리와 배포 지휘는 중앙(Cloud)에서 하고, 실행은 Edge가 한다.']
      ],
      quizzes: [
        { q: '"Edge computing은 Cloud를 완전히 대체하는 기술이다." 맞을까?', o: [
          { t: '맞다. Edge가 더 가까워 항상 빠르므로 Cloud 데이터센터는 필요 없어진다', why: '저장, 학습, 전체 분석은 여전히 Cloud에 남았다.' },
          { t: '틀리다. Edge는 지연·대역폭이 중요한 처리를 가까이서 하고, 저장·학습·집계는 Cloud가 맡는 보완 관계다', ok: true },
          { t: '맞다. Edge는 Cloud를 지역마다 옮겨 놓은 것이라 같은 일을 모두 대신할 수 있다', why: 'Edge 장비는 작고 흩어져 있다. 큰 저장·학습은 감당하기 어렵다.' }],
          ok: 'Edge에서 추론해 이벤트만 올리고, Cloud는 저장과 전체 분석·학습을 한다.' }
      ],
      note: { 'W1-4': '실시간 감지·블러·이벤트 요약은 Edge에서, 장기 보관·재학습·전체 통계·모델 배포 관리는 Cloud에서 했다. 둘은 서로를 대체하지 않고 보완했다.' } },

    { mode: 'scale', title: '클라우드 노선 운영', desc: '시험 전날 밤 질문이 폭주한다. 서버를 사 둘까, 그때그때 빌릴까?', qc: ['W1-2'],
      brief: '학교 AI 튜터 서비스를 일주일 운영한다. 서버 1대가 초당 <b>100</b>개 요청을 처리한다.<br>' +
        '<b>1단계 · 직접 사기(온프레미스)</b>: 일주일 내내 쓸 서버 수를 한 번 정한다. 1대 하루 비용 <b>10</b>.<br>' +
        '<b>2단계 · 클라우드</b>: 날마다 수요를 보고 서버 수를 늘리고 줄인다. 1대 하루 비용 <b>12</b>(조금 비싸다). 처리 못 한 요청이 생기면 신뢰도 −1.',
      demand: [80, 120, 150, 260, 920, 140, 40],
      days: ['월', '화', '수', '목', '금\n(시험 전날)', '토', '일'],
      quizzes: [
        { q: '"Cloud는 인터넷 어딘가에 있는 다른 사람의 컴퓨터"라고만 이해해도 충분할까?', o: [
          { t: '충분하다. 원격 데이터센터의 서버를 빌려 쓰는 것이 전부다', why: '방금 날마다 서버 수를 바꾸고 쓴 만큼만 냈다. 위치보다 운영 방식의 차이였다.' },
          { t: '부족하다. 필요할 때 자원을 늘리고 줄이는 운영 모델(가상화·자동 확장·관리형 서비스)까지 포함한다', ok: true },
          { t: '충분하다. 클라우드와 온프레미스는 위치만 다르고 운영 방식과 비용 구조는 같다', why: '온프레미스는 정점에 맞춰 사 두고, 클라우드는 쓴 만큼 냈다. 비용 구조가 다르다.' }],
          ok: '클라우드를 고르는 이유는 "어디 있나"보다 <b>"어떻게 운영되나"</b>(탄력성, 쓴 만큼 비용, 관리 책임 분담)다.' }
      ],
      note: { 'W1-2': '직접 산 서버는 금요일 정점에 맞추면 평일 내내 놀았고, 적게 사면 시험 전날 요청을 놓쳤다. 클라우드에선 날마다 늘리고 줄여 쓴 만큼만 냈다.' } }
  ];

  /* ------------------------------------------------------------ 상태 */
  var S = null;
  function newState(si) {
    return { si: si, cfg: STAGES[si], hearts: 5, over: false, coach: null, quiz: null, x: {}, qi: 0, st: { wrong: 0 },
      path: [], bad: null, cur: 0, picks: {}, roles: {}, scene: 0, put: {}, sel: null, badIt: {},
      phase: 'buy', buy: 3, inst: 1, day: 0, log: [], cost: { prem: 0, cloud: 0 }, drops: { prem: 0, cloud: 0 } };
  }
  function startStage(si) {
    S = newState(si);
    NA.ui.briefing(ov, 'STAGE ' + (si + 1) + ' · ' + S.cfg.title, S.cfg.brief, function () {
      var m = S.cfg.mode;
      S.coach = { who: '🚇 노선 관리인', t: {
        route: '💻 <b>브라우저</b>에서 출발한다. 브라우저 역부터 눌러 노선을 시작하자.',
        pick: '첫 승객부터 노선을 골라 주자. 카드의 왕복 횟수와 크기를 보자.',
        roles: '장면을 읽고, 각 장비 아래에서 역할을 고른 뒤 <b>[확인]</b>.',
        sort: '일 카드를 끌어다 <b>Edge 역</b>이나 <b>Cloud 역</b>에 놓자.',
        scale: '1단계: 일주일 동안 쓸 서버 수를 정하자. 수요는 미리 볼 수 있다(보통은 모른다!).'
      }[m] };
      render();
    });
  }
  function hurt(t) {
    S.hearts--; S.st.wrong++; NA.sfx.bad();
    S.coach = { cls: 'no', who: '✗ 다시 (신뢰도 −1)', t: t };
    if (S.hearts <= 0) { S.over = true; render(); var me = S; setTimeout(function () { if (S === me) debrief(false); }, 1400); return true; }
    return false;
  }
  function nextQuiz() { var q = S.cfg.quizzes[S.qi++]; if (!q) return finish(); S.quiz = { q: q, opts: NA.shuffle(q.o.slice()) }; S.x = {}; S.coach = { who: '❓ 정리 질문', t: '' }; render(); }
  function answer(k) {
    var Q = S && S.quiz; if (!Q || S.over || S.x[k]) return;
    var o = Q.opts[k]; if (!o) return;
    if (o.ok) { NA.sfx.good(); S.quiz = null; S.coach = { cls: 'ok', who: '✓ 정답!', t: Q.q.ok }; render(); var me = S; return setTimeout(function () { if (S === me) nextQuiz(); }, 1300); }
    S.x[k] = true; if (hurt(o.why)) return; render();
  }

  /* ------------------------------------------------------------ route */
  function clickStation(id) {
    if (!S || S.over || S.quiz || S.cfg.mode !== 'route' || S.anim) return;
    var c = S.cfg, want = c.order[S.path.length];
    if (S.path.indexOf(id) >= 0) return;
    if (id !== want) { S.bad = id; if (hurt(c.why[id] || (S.path.length === 0 ? '출발역은 💻 브라우저다.' : c.why._))) return; return render(); }
    S.path.push(id); NA.sfx.tone(520 + S.path.length * 70, .08, 'triangle', .14);
    S.coach = { cls: 'ok', who: '✓ ' + c.stations[id].n + ' 역 연결', t: c.say[id] || '출발! 💻 브라우저에서 프롬프트 승객이 탔다. 다음 역은?' };
    if (S.path.length === c.order.length) { render(); return runTrain(); }
    render();
  }
  function runTrain() {
    S.anim = true; var c = S.cfg, seq = S.path.concat(S.path.slice(0, -1).reverse()), i = 0, me = S;
    S.coach = { cls: 'ok', who: '🚇 운행 시작', t: '프롬프트 승객이 <b>요청</b>으로 GPU까지 가고, 답이 <b>응답</b>으로 돌아온다.' };
    render();
    (function step() {
      if (S !== me) return;
      var tr = app.querySelector('.train'), tg = app.querySelector('.tag');
      if (i >= seq.length) { S.anim = false; S.trainDone = true; render(); return setTimeout(function () { if (S === me) nextQuiz(); }, 900); }
      var st = c.stations[seq[i]], back = i >= S.path.length;
      if (tr) { tr.style.left = st.x + 'px'; tr.style.top = st.y + 'px'; tr.textContent = back ? '💌' : '🙋'; }
      if (tg) { tg.style.left = st.x + 'px'; tg.style.top = (st.y - 30) + 'px'; tg.textContent = back ? '응답 (답변)' : i === S.path.length - 1 ? '추론 중…' : '요청 (프롬프트)'; }
      NA.sfx.tick(i % 2); i++;
      setTimeout(step, 520);
    })();
  }

  /* ------------------------------------------------------------ pick */
  function tTime(line, p) { var L = S.cfg.lines[line]; return p.trips * L.rtt + p.bytes * 8 / (L.bw * 1e6) * 1000; }
  function fmtMs(ms) { return ms >= 1000 ? (ms / 1000).toFixed(ms >= 10000 ? 0 : 1) + '초' : ms.toFixed(ms < 10 ? 1 : 0) + 'ms'; }
  function pick(line) {
    if (!S || S.over || S.quiz || S.cfg.mode !== 'pick') return;
    var p = S.cfg.pax[S.cur]; if (!p) return;
    var a = tTime('seoul', p), b = tTime('pac', p), best = a < b ? 'seoul' : 'pac', L = S.cfg.lines;
    var calc = function (k) { var l = L[k]; return l.n + ': ' + p.trips + ' × ' + l.rtt + 'ms + ' + fmtBytes(p.bytes) + ' ÷ ' + (l.bw >= 1000 ? l.bw / 1000 + 'Gbps' : l.bw + 'Mbps') + ' = <b>' + fmtMs(tTime(k, p)) + '</b>'; };
    if (line !== best) { if (hurt(p.ic + ' ' + p.n + '은(는) <b>' + L[best].n + '</b>이 더 빠르다.<br>' + calc('seoul') + '<br>' + calc('pac') + '<br>' + (best === 'seoul' ? '왕복이 많고 데이터가 작으면 <b>RTT</b>가 시간을 정한다.' : '데이터가 크면 <b>대역폭</b>이 시간을 정한다.'))) return; return render(); }
    S.picks[S.cur] = line; NA.sfx.good();
    S.coach = { cls: 'ok', who: '✓ ' + L[line].n + '!', t: calc('seoul') + '<br>' + calc('pac') + '<br>' + (best === 'seoul' ? '왕복이 많은 작은 요청 → <b>지연(RTT)</b>이 지배.' : '큰 데이터 한 번 → <b>대역폭</b>이 지배.') };
    S.cur++;
    render();
    if (S.cur >= S.cfg.pax.length) { var me = S; setTimeout(function () { if (S === me) nextQuiz(); }, 1400); }
  }
  function fmtBytes(b) { return b >= 1e9 ? (b / 1e9) + 'GB' : b >= 1e6 ? (b / 1e6) + 'MB' : (b / 1e3) + 'KB'; }

  /* ------------------------------------------------------------ roles */
  function setRole(i, r) { if (!S || S.over || S.quiz || S.cfg.mode !== 'roles') return; S.roles[i] = r; S.badNodes = null; NA.sfx.pop(); render(); }
  function checkRoles() {
    if (!S || S.over || S.quiz || S.cfg.mode !== 'roles') return;
    var sc = S.cfg.scenes[S.scene], miss = sc.nodes.filter(function (n, i) { return !S.roles[i]; }).length;
    if (miss) { S.coach = { cls: 'no', who: '아직', t: '역할을 고르지 않은 장비가 있다.' }; NA.sfx.bad(); return render(); }
    var bad = [], errs = [];
    sc.nodes.forEach(function (n, i) { if (S.roles[i] !== n[2]) { bad.push(i); errs.push('<b>' + n[1] + '</b>: ' + S.cfg.why[n[2]]); } });
    if (bad.length) { S.badNodes = bad; if (hurt('<ul>' + errs.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul>')) return; return render(); }
    NA.sfx.good();
    S.done = S.done || []; S.done.push(sc);
    S.coach = { cls: 'ok', who: '✓ 맞다!', t: sc.nodes.map(function (n) { return n[0] + ' ' + n[1] + ' = <b>' + { c: '클라이언트', s: '서버', b: '둘 다' }[n[2]] + '</b>'; }).join('<br>') };
    S.scene++; S.roles = {};
    render();
    if (S.scene >= S.cfg.scenes.length) { var me = S; setTimeout(function () { if (S === me) nextQuiz(); }, 1300); }
  }

  /* ------------------------------------------------------------ sort */
  function putItem(i, z) { if (!S || S.over || S.quiz || S.cfg.mode !== 'sort') return; if (z) S.put[i] = z; else delete S.put[i]; delete S.badIt[i]; S.sel = null; NA.sfx.pop(); render(); }
  function checkSort() {
    if (!S || S.over || S.quiz || S.cfg.mode !== 'sort' || S.sorted) return;
    var it = S.cfg.items, left = it.filter(function (x, i) { return !S.put[i]; }).length;
    if (left) { S.coach = { cls: 'no', who: '아직', t: '역에 놓지 않은 일이 <b>' + left + '개</b> 남았다.' }; NA.sfx.bad(); return render(); }
    var bad = {}, errs = [];
    it.forEach(function (x, i) { if (S.put[i] !== x[2]) { bad[i] = 1; errs.push('<b>' + x[0] + '</b> → ' + (x[2] === 'edge' ? 'Edge' : 'Cloud') + ': ' + x[3]); } });
    S.badIt = bad;
    if (errs.length) { if (hurt('<ul>' + errs.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul>')) return; return render(); }
    S.sorted = true; NA.sfx.good();
    S.coach = { cls: 'ok', who: '✓ 완벽한 배치!', t: '빨리 반응해야 하거나 너무 커서 못 보내는 일은 <b>Edge</b>, 모으고 오래 두고 크게 계산하는 일은 <b>Cloud</b>.' };
    render(); var me = S; setTimeout(function () { if (S === me) nextQuiz(); }, 1300);
  }

  /* ------------------------------------------------------------ scale */
  function adj(d) {
    if (!S || S.over || S.quiz || S.cfg.mode !== 'scale') return;
    if (S.phase === 'buy') S.buy = Math.max(1, Math.min(12, S.buy + d));
    else if (S.phase === 'cloud') S.inst = Math.max(1, Math.min(12, S.inst + d));
    NA.sfx.tick(d > 0); render();
  }
  function runPrem() {
    if (!S || S.phase !== 'buy') return;
    var D = S.cfg.demand, cap = S.buy * 100;
    S.cost.prem = S.buy * 10 * D.length;
    S.premLog = D.map(function (d) { return { d: d, cap: cap, drop: Math.max(0, d - cap), idle: Math.max(0, cap - d) }; });
    S.drops.prem = S.premLog.reduce(function (a, x) { return a + x.drop; }, 0);
    var idleAvg = Math.round(S.premLog.reduce(function (a, x) { return a + x.idle / x.cap; }, 0) / D.length * 100);
    S.phase = 'prem-done'; NA.sfx.good();
    S.coach = { cls: S.drops.prem ? 'no' : 'ok', who: '📋 온프레미스 일주일 결과', t: '서버 <b>' + S.buy + '대</b>(초당 ' + cap + ') · 비용 <b>' + S.cost.prem + '</b><br>' +
      (S.drops.prem ? '시험 전날 밤에 요청 <b>' + S.drops.prem + '개/초</b>를 처리하지 못했다. 정점에 맞추려면 10대가 필요했다.' : '정점까지 버텼다. 하지만 평균 <b>' + idleAvg + '%</b>의 서버가 놀았다.') +
      '<br>(이번 판엔 감점 없음. 직접 사면 이렇게 <b>정점 대비 vs 낭비</b> 사이에서 고민해야 한다.)<br>이제 <b>클라우드</b>로 같은 일주일을 운영해 보자.' };
    render();
  }
  function startCloud() { if (!S || S.phase !== 'prem-done') return; S.phase = 'cloud'; S.day = 0; S.inst = 1; S.log = []; S.coach = { who: '☁️ 클라우드 운영', t: '날마다 그날 수요를 보고 서버 수(<b>+ / −</b>)를 맞춘 뒤 <b>[하루 운영]</b>. 1대 = 초당 100.' }; render(); }
  function runDay() {
    if (!S || S.over || S.quiz || S.phase !== 'cloud') return;
    var d = S.cfg.demand[S.day], cap = S.inst * 100, drop = Math.max(0, d - cap);
    S.log.push({ d: d, cap: cap, drop: drop, idle: Math.max(0, cap - d) });
    S.cost.cloud += S.inst * 12; S.day++;
    if (drop) { S.drops.cloud += drop; if (hurt(S.cfg.days[S.day - 1].replace('\n', ' ') + '요일 수요 ' + d + '인데 서버 ' + S.inst + '대(' + cap + ')뿐이라 <b>' + drop + '개/초</b>를 놓쳤다. 클라우드는 수요에 맞춰 바로 늘릴 수 있다!')) return; }
    else { NA.sfx.good(); S.coach = { cls: 'ok', who: '✓ ' + S.cfg.days[S.day - 1].split('\n')[0] + '요일 무사히', t: '수요 ' + d + ' · 서버 ' + S.inst + '대 · 오늘 비용 ' + S.inst * 12 + (cap - d >= 200 ? '<br>남는 서버가 많다. 줄여도 된다.' : '') }; }
    if (S.day >= S.cfg.demand.length) {
      S.phase = 'done';
      S.coach = { cls: 'ok', who: '📊 일주일 비교', t: '온프레미스(' + S.buy + '대 고정): 비용 <b>' + S.cost.prem + '</b>, 놓친 요청 ' + S.drops.prem + '<br>클라우드(날마다 조절): 비용 <b>' + S.cost.cloud + '</b>, 놓친 요청 ' + S.drops.cloud +
        '<br>단가는 클라우드가 더 비쌌지만, <b>쓴 만큼만</b> 냈다. 이게 클라우드의 <b>운영 모델</b>이다.' };
      render(); var me = S; return setTimeout(function () { if (S === me) nextQuiz(); }, 2200);
    }
    render();
  }

  /* ------------------------------------------------------------ 끌기 (sort) */
  var drag = null;
  function dragSetup() {
    app.querySelectorAll('[data-it]').forEach(function (el) {
      el.onpointerdown = function (e) {
        if (e.button !== 0 || !S || S.over || S.quiz || S.sorted) return; e.preventDefault();
        drag = { el: el, i: +el.dataset.it, x: e.clientX, y: e.clientY, on: false };
        window.addEventListener('pointermove', dMove); window.addEventListener('pointerup', dEnd); window.addEventListener('pointercancel', dEnd);
      };
    });
  }
  function hitBin(e) { var bs = app.querySelectorAll('[data-bin]'); for (var i = 0; i < bs.length; i++) { var r = bs[i].getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return bs[i]; } return null; }
  function dMove(e) {
    if (!drag) return;
    if (!drag.on) { if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 6) return; drag.on = true; var g = document.createElement('div'); g.className = 'drag-ghost itg'; g.textContent = drag.el.dataset.lbl; document.body.appendChild(g); drag.g = g; drag.el.classList.add('drag-src'); }
    drag.g.style.left = e.clientX + 'px'; drag.g.style.top = e.clientY + 'px';
    app.querySelectorAll('.bin2.hot').forEach(function (b) { b.classList.remove('hot'); });
    var b = hitBin(e); if (b) b.classList.add('hot');
  }
  function dEnd(e) {
    window.removeEventListener('pointermove', dMove); window.removeEventListener('pointerup', dEnd); window.removeEventListener('pointercancel', dEnd);
    var d = drag; drag = null; if (!d) return;
    if (d.g) d.g.remove(); d.el.classList.remove('drag-src');
    if (!d.on) { S.sel = S.sel === d.i ? null : d.i; NA.sfx.tick(); return render(); }
    var b = e && e.type === 'pointerup' ? hitBin(e) : null;
    if (b) putItem(d.i, b.dataset.bin); else if (e && e.type === 'pointerup') putItem(d.i, null); else render();
  }

  /* ------------------------------------------------------------ 결산 */
  function finish() { S.over = true; NA.sfx.win(); var me = S; setTimeout(function () { if (S === me) debrief(true); }, 600); }
  function debrief(win) {
    var stars = !win ? 0 : S.hearts >= 5 ? 3 : S.hearts >= 3 ? 2 : 1;
    var stats = [['남은 신뢰도', S.hearts + '/5'], ['실수', S.st.wrong]];
    if (S.cfg.mode === 'scale') stats.push(['온프레미스 비용', S.cost.prem], ['클라우드 비용', S.cost.cloud]);
    NA.ui.debrief({
      overlay: ov, gameId: GAME_ID, stage: S.si, win: win, stars: stars, score: S.hearts * 20,
      title: win ? '노선 개통!' : '운행 중단', sub: win ? '남은 신뢰도 ' + S.hearts + '/5' : '신뢰도가 바닥났다. 해설을 보고 다시 해 보자.',
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
      howto: 'AI 서비스의 길을 <b>지하철 노선도</b>로 그린다. 질문은 승객, 장비는 역, 연결은 노선. 시간 제한 없음.<br>' +
        '스테이지마다 노선 잇기 · 노선 고르기 · 역할 붙이기 · Edge/Cloud 배치 · 서버 운영을 한다. 틀리면 신뢰도 −1(5칸).<br>' +
        '단축키 <span class="key">Enter</span> 확인 · <span class="key">1</span>~<span class="key">3</span> 보기'
    });
  }

  /* ------------------------------------------------------------ 렌더 */
  function render() {
    if (!S) return;
    var c = S.cfg, h = ''; for (var k = 0; k < 5; k++) h += k < S.hearts ? '♥' : '<i>♥</i>';
    var html = '<div class="hud"><span class="t">STAGE ' + (S.si + 1) + ' · ' + esc(c.title) + '</span><span class="hearts">' + h + '</span><span class="cnt">' + esc(c.desc) + '</span><span class="sp"></span><button class="na-btn" data-guide>규칙</button></div>';
    html += '<div class="main"><div class="work">' + ({ route: routeHTML, pick: pickHTML, roles: rolesHTML, sort: sortHTML, scale: scaleHTML }[c.mode])() + '</div><div class="side">' + sideHTML() + '</div></div>';
    app.innerHTML = html;
    bind();
    S.bad = null;
  }
  function routeHTML() {
    var c = S.cfg, st = c.stations, p = S.path;
    var lines = '';
    for (var i = 1; i < p.length; i++) { var a = st[p[i - 1]], b = st[p[i]]; lines += '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="#e8463a" stroke-width="12" stroke-linecap="round"/>'; }
    var stations = Object.keys(st).map(function (id) {
      var s = st[id], on = p.indexOf(id) >= 0;
      return '<button class="stn' + (s.sq ? ' sq' : '') + (on ? ' on' : '') + (S.bad === id ? ' bad' : '') + '" data-st="' + id + '" style="left:' + s.x + 'px;top:' + s.y + 'px"><span class="dot">' + s.ic + '</span><span class="lb">' + esc(s.n) + '<small>' + esc(s.s) + '</small></span></button>';
    }).join('');
    var start = st[p[0] || 'browser'];
    var train = S.anim || S.trainDone ? '<div class="train" style="left:' + start.x + 'px;top:' + start.y + 'px">🙋</div><div class="tag" style="left:' + start.x + 'px;top:' + (start.y - 30) + 'px">요청 (프롬프트)</div>' : '';
    return '<div class="bar"><h3>🚇 AI 질문선</h3><p>역을 차례로 눌러 노선을 잇자. 연결 ' + p.length + ' / ' + c.order.length + '</p></div>' +
      '<div class="map"><svg viewBox="0 0 820 594" preserveAspectRatio="none">' + lines + '</svg>' + stations + train + '</div>';
  }
  function pickHTML() {
    var c = S.cfg, L = c.lines;
    var svg = '<svg viewBox="0 0 820 300" preserveAspectRatio="none">' +
      '<path d="M120 150 L 320 70" stroke="' + L.seoul.col + '" stroke-width="8" fill="none" stroke-linecap="round"/>' +
      '<path d="M120 150 L 300 230 L 690 230" stroke="' + L.pac.col + '" stroke-width="22" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<text x="380" y="270" font-size="13" fill="#2f7de1" font-family="sans-serif">~~~ 태평양 ~~~</text></svg>';
    var stn = function (x, y, ic, n, s) { return '<div class="stn" style="left:' + x + 'px;top:' + y + 'px;cursor:default"><span class="dot">' + ic + '</span><span class="lb">' + n + '<small>' + s + '</small></span></div>'; };
    var map = '<div class="map" style="flex:0 0 300px">' + svg + stn(120, 150, '🏫', '내 학교', '사용자') + stn(320, 70, '🏙️', '서울 서버', '100Mbps · RTT 5ms') + stn(690, 230, '🗽', '미국 서버', '1Gbps · RTT 150ms') +
      '<div class="legend"><span><i style="background:' + L.seoul.col + ';height:4px"></i>서울선: 좁지만 가깝다</span><span><i style="background:' + L.pac.col + ';height:10px"></i>태평양선: 넓지만 멀다</span></div></div>';
    var pax = '<div class="pax">' + c.pax.map(function (p, i) {
      var done = S.picks[i], cur = i === S.cur;
      var res = done ? '<div class="res">서울선 ' + fmtMs(tTime('seoul', p)) + ' · 태평양선 ' + fmtMs(tTime('pac', p)) + ' → <b>' + L[done].n + '</b></div>' : '';
      return '<div class="pc' + (cur ? ' cur' : '') + (done ? ' done' : '') + '"><h4>' + p.ic + ' ' + esc(p.n) + '</h4><p>' + esc(p.d) + '</p>' + res +
        (done ? '' : '<div class="btns"><button class="seoul" data-pick="seoul"' + (cur ? '' : ' disabled') + '>🔵 서울선</button><button class="pac" data-pick="pac"' + (cur ? '' : ' disabled') + '>🔴 태평양선</button></div>') + '</div>';
    }).join('') + '</div>';
    return '<div class="bar"><h3>🚇 어느 노선이 빠를까</h3><p>시간 ≈ 왕복 × RTT + 크기 ÷ 대역폭. 승객 ' + Math.min(S.cur + 1, c.pax.length) + ' / ' + c.pax.length + '</p></div>' + map + pax;
  }
  function rolesHTML() {
    var c = S.cfg, sc = c.scenes[S.scene];
    var past = (S.done || []).slice(-3).map(function (x) { return '<div>✓ ' + esc(x.d) + '</div>'; }).join('');
    if (!sc) return '<div class="bar"><h3>👥 누가 서버일까</h3><p>모든 장면 완료!</p></div><div class="roles"><div class="past">' + past + '</div></div>';
    var chain = '';
    sc.nodes.forEach(function (n, i) {
      if (i) chain += '<div class="arrow"><b>→</b>' + esc(sc.arrows[i - 1]) + '</div>';
      var r = S.roles[i], bad = S.badNodes && S.badNodes.indexOf(i) >= 0;
      chain += '<div class="node' + (bad ? ' bad' : '') + '"><span class="ic">' + n[0] + '</span><span class="nm">' + esc(n[1]) + '</span><span class="tg">' +
        [['c', '클라이언트'], ['s', '서버'], ['b', '둘 다']].map(function (o) { return '<button class="' + o[0] + (r === o[0] ? ' on' : '') + '" data-role="' + i + ':' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</span></div>';
    });
    return '<div class="bar"><h3>👥 장면 ' + (S.scene + 1) + ' / ' + c.scenes.length + '</h3><p>→ 는 요청이 가는 방향. 각 장비의 역할을 고르자.</p></div>' +
      '<div class="roles"><div class="scn"><div class="d">' + esc(sc.d) + '</div><div class="chain">' + chain + '</div></div><div class="past">' + past + '</div></div>';
  }
  function sortHTML() {
    var c = S.cfg, it = c.items;
    function card(x, i) { return '<div class="it' + (S.sel === i ? ' sel' : '') + (S.badIt[i] ? ' bad' : '') + '" data-it="' + i + '" data-lbl="' + esc(x[0]) + '">' + esc(x[0]) + '<small>' + esc(x[1]) + '</small></div>'; }
    var pool = it.map(function (x, i) { return S.put[i] ? '' : card(x, i); }).join('');
    function bin(z, h, p) { return '<div class="bin2 ' + z + '" data-bin="' + z + '"><h4>' + h + '</h4><p>' + p + '</p><div class="in">' + it.map(function (x, i) { return S.put[i] === z ? card(x, i) : ''; }).join('') + '</div></div>'; }
    return '<div class="bar"><h3>📍 Edge 역 세우기</h3><p>일 카드를 끌어다 역에 놓자. 배치 ' + Object.keys(S.put).length + ' / ' + it.length + '</p></div>' +
      '<div class="sortw"><div class="ctx">📋 ' + c.ctx + '</div><div class="pool">' + (pool || '<span style="font-size:12px;color:#777;align-self:center">모두 배치했다. 오른쪽 [확인]을 누르자.</span>') + '</div>' +
      '<div class="bins2">' + bin('edge', '🏪 Edge 역 (매장 안 작은 컴퓨터)', '가깝다 → 지연이 작다. 영상을 밖으로 보내지 않아도 된다. 하지만 작고 흩어져 있다.') +
      bin('cloud', '☁️ Cloud 역 (멀리 있는 데이터센터)', '크고 모여 있다 → 저장·학습·전체 분석에 강하다. 하지만 멀고, 보내는 데 대역폭이 든다.') + '</div></div>';
  }
  function scaleHTML() {
    var c = S.cfg, D = c.demand, max = 1000;
    var logs = S.phase === 'cloud' || S.phase === 'done' ? S.log : S.premLog || [];
    var days = '<div class="days">' + D.map(function (d, i) {
      var lg = logs[i], cur = S.phase === 'cloud' && i === S.day;
      var cap = lg ? lg.cap : null;
      return '<div class="day' + (cur ? ' cur' : '') + '"><span class="dn">' + esc(c.days[i]).replace('\n', '<br>') + '</span><div class="bars"><i class="dm" style="height:' + (d / max * 100) + '%"></i>' + (cap != null ? '<i class="cp" style="height:' + Math.min(100, cap / max * 100) + '%"></i>' : '') + '</div>' +
        '<span class="v">수요 ' + d + (lg ? '<br>처리 ' + cap + (lg.drop ? '<br><span class="drop">놓침 ' + lg.drop + '</span>' : lg.idle >= 200 ? '<br><span class="idle">남음 ' + lg.idle + '</span>' : '') : '') + '</span></div>';
    }).join('') + '</div>';
    var ctrl = '';
    if (S.phase === 'buy') ctrl = '<div class="ctrl"><span class="lbl">🏢 직접 살 서버 수</span><button data-adj="-1">−</button><span class="num">' + S.buy + '</span><button data-adj="1">+</button><small>초당 ' + S.buy * 100 + ' 처리 · 일주일 비용 ' + S.buy * 70 + '</small><button class="go" data-prem>일주일 운영 ▶</button></div>';
    else if (S.phase === 'prem-done') ctrl = '<div class="ctrl"><span class="lbl">🏢 온프레미스: 비용 ' + S.cost.prem + ' · 놓친 요청 ' + S.drops.prem + '</span><button class="go" data-cloud>☁️ 클라우드로 다시 운영 ▶</button></div>';
    else if (S.phase === 'cloud') ctrl = '<div class="ctrl"><span class="lbl">☁️ ' + esc(c.days[S.day].split('\n')[0]) + '요일 수요 ' + D[S.day] + '</span><button data-adj="-1">−</button><span class="num">' + S.inst + '</span><button data-adj="1">+</button><small>대 · 초당 ' + S.inst * 100 + ' · 오늘 ' + S.inst * 12 + '</small><button class="go" data-day' + (S.over || S.quiz ? ' disabled' : '') + '>하루 운영 ▶ (Enter)</button></div>';
    else ctrl = '<div class="ctrl"><span class="lbl">운영 완료</span></div>';
    var cmp = '<div class="cmp"><div>🏢 온프레미스 (' + S.buy + '대 고정)<b>비용 ' + S.cost.prem + ' · 놓침 ' + S.drops.prem + '</b></div><div>☁️ 클라우드 (날마다 조절)<b>비용 ' + S.cost.cloud + ' · 놓침 ' + S.drops.cloud + '</b></div></div>';
    return '<div class="bar"><h3>☁️ ' + (S.phase === 'buy' || S.phase === 'prem-done' ? '1단계 · 서버 직접 사기' : '2단계 · 클라우드') + '</h3><p>빨간 막대 = 수요(초당 요청), 파란 막대 = 처리 능력. 서버 1대 = 초당 100.</p></div>' +
      '<div class="scale">' + days + ctrl + cmp + '</div>';
  }
  function sideHTML() {
    var c = S.cfg, co = S.coach || { who: '', t: '' }, h = '';
    var quiz = S.quiz ? '<div class="q">' + esc(S.quiz.q.q) + '</div>' + S.quiz.opts.map(function (o, i) { return '<button class="opt' + (S.x[i] ? ' x' : '') + '" data-ans="' + i + '"><span class="n">' + (i + 1) + '</span>' + esc(o.t) + '</button>'; }).join('') : '';
    h += '<div class="coach' + (co.cls ? ' ' + co.cls : '') + '"><span class="who">' + co.who + '</span>' + (S.quiz && co.cls !== 'no' ? '' : co.t || '') + quiz + '</div>';
    if (c.mode === 'roles' && S.scene < c.scenes.length) h += '<div class="act"><button class="na-btn primary" data-roles' + (S.quiz || S.over ? ' disabled' : '') + '>확인 (Enter)</button><small>요청을 보내면 클라이언트, 받아서 서비스하면 서버.</small></div>';
    if (c.mode === 'sort') h += '<div class="act"><button class="na-btn primary" data-sort' + (S.sorted || S.quiz || S.over ? ' disabled' : '') + '>확인 (Enter)</button><small>지연 · 대역폭 · 규모를 생각하자.</small></div>';
    return h;
  }
  function bind() {
    var all = function (sel, fn) { app.querySelectorAll(sel).forEach(function (e) { e.onclick = function (ev) { fn(e, ev); }; }); };
    all('[data-st]', function (e) { clickStation(e.dataset.st); });
    all('[data-pick]', function (e) { pick(e.dataset.pick); });
    all('[data-role]', function (e) { var a = e.dataset.role.split(':'); setRole(+a[0], a[1]); });
    all('[data-roles]', checkRoles); all('[data-sort]', checkSort);
    all('[data-bin]', function (e, ev) { if (ev.target.closest('[data-it]')) return; if (S.sel != null) putItem(S.sel, e.dataset.bin); });
    all('[data-adj]', function (e) { adj(+e.dataset.adj); });
    all('[data-prem]', runPrem); all('[data-cloud]', startCloud); all('[data-day]', runDay);
    all('[data-ans]', function (e) { answer(+e.dataset.ans); });
    all('[data-guide]', guide);
    if (S.cfg.mode === 'sort') dragSetup();
  }
  function guide() {
    var back = ov.innerHTML, wasHidden = ov.hidden;
    ov.innerHTML = '<div class="na-card guide"><h2>노선도 안내</h2>' +
      '<h4>AI 서비스의 길</h4><p>브라우저 → DNS(이름→IP) → 인터넷 → Gateway·로드밸런서 → API 서버 → GPU. 결과는 응답으로 거꾸로 돌아온다.</p>' +
      '<h4>대역폭 vs 지연</h4><p>대역폭 = 초당 실어 나르는 양, 지연(RTT) = 왕복에 걸리는 시간. 시간 ≈ 왕복 × RTT + 크기 ÷ 대역폭.</p>' +
      '<h4>클라이언트 · 서버</h4><p>장비 종류가 아니라 역할. 요청하면 클라이언트, 응답하면 서버. 둘 다일 수도 있다.</p>' +
      '<h4>Edge · Cloud</h4><p>Edge: 가까이서 빠르게, 보낼 양을 줄인다. Cloud: 모아서 저장·학습·분석. 보완 관계.</p>' +
      '<h4>Cloud = 운영 모델</h4><p>필요할 때 늘리고 줄이며 쓴 만큼 낸다(탄력성, 가상화, 관리형 서비스).</p>' +
      '<div class="na-row"><button class="na-btn primary" data-close>닫기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-close]').onclick = function () { ov.innerHTML = back; ov.hidden = wasHidden; };
  }

  /* ------------------------------------------------------------ 입력 */
  window.addEventListener('keydown', function (e) {
    if (!S || !ov.hidden || S.over) return;
    var k = e.key;
    if (S.quiz) { if (/^[1-3]$/.test(k)) answer(+k - 1); return; }
    if (k !== 'Enter') return;
    e.preventDefault();
    var m = S.cfg.mode;
    if (m === 'roles') checkRoles(); else if (m === 'sort') checkSort(); else if (m === 'scale') { if (S.phase === 'buy') runPrem(); else if (S.phase === 'prem-done') startCloud(); else runDay(); }
  });

  window.__game = {
    state: function () { return S; }, start: startStage, stages: STAGES,
    station: clickStation, pick: pick, role: setRole, roles: checkRoles, put: putItem, sort: checkSort, adj: adj, prem: runPrem, cloud: startCloud, day: runDay, answer: answer,
    best: function () { var p = S.cfg.pax[S.cur]; return p ? (tTime('seoul', p) < tTime('pac', p) ? 'seoul' : 'pac') : null; }
  };
  menu();
})();
