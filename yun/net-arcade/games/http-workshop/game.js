/* HTTP 공방 & 보안 검문소 — Quick Check W4-4(헤더/본문 경계), W4-5(멱등), W4-7(HTTP/2·3), W4-8(HTTPS로 보이는 것), W4-9(인증서), W2-7(0.0.0.0 bind)
 *
 * 턴제 의뢰 처리. 시간 제한 없음. 스테이지마다 의뢰서가 몇 장 쌓여 있다.
 *   assemble : 블록을 쌓아 HTTP 메시지 조립 (시작줄 → 헤더 → 빈 줄 → 본문)
 *   pickline : 원문에서 경계가 되는 줄 고르기
 *   choice   : 상황 판단 (+ 서버 장부가 결과를 보여 줌)
 *   multi    : 여러 개 고르기 (HTTP 창구 / bind 접속 가능 여부)
 *   sort     : 도청자 시점 분류 (보인다 / 암호화)
 *   cert     : 인증서 심사 (통과 / 거부 사유)
 * 틀리면 신뢰도 -1(5칸), 해설을 보고 그 자리에서 다시.
 */
(function () {
  var GAME_ID = 'http-workshop';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));

  function B(k, t, x) { return Object.assign({ k: k, t: t }, x || {}); }
  var BL = B('blank', '(빈 줄)');

  /* ------------------------------------------------------------ 스테이지 */
  var STAGES = [
    /* ================================================== 1 */
    { title: '메시지 조립 공방', desc: '시작줄, 헤더, 빈 줄, 본문. 헤더가 끝나는 곳은 무엇으로 알까?', qc: ['W4-4'],
      brief: '여기는 <b>HTTP 공방</b>. 손님 주문서를 보고 HTTP 메시지를 조립한다. 시간 제한은 없다.<br>' +
        'HTTP 메시지 = <b>시작줄</b> → <b>헤더들</b> → <b>빈 줄</b> → (<b>본문</b>). 줄 끝마다 \\r\\n(CRLF)가 붙는다.<br>' +
        'TCP는 바이트를 줄줄이 흘려보낼 뿐이라, <b>어디까지가 헤더이고 본문이 어디서 끝나는지</b>는 HTTP가 직접 표시해야 한다.<br>' +
        '틀리면 신뢰도 −1(5칸). 해설을 보고 그 자리에서 고치면 된다.',
      tasks: [
        { type: 'assemble', title: '메뉴판 보여 주세요', prompt: '손님 주문: <b>cafe.kr</b>의 메뉴판(<b>/menu</b>)을 보고 싶어요.',
          coach: '오른쪽 블록을 <b>끌어다 왼쪽 메시지에 놓자</b>(눌러도 맨 아래에 붙는다). 순서는 <b>시작줄 → 헤더 → 빈 줄 → (본문)</b>. 놓은 줄은 끌어서 순서를 바꾸거나, 상자로 끌어 빼거나, 눌러서 뺀다. 메뉴를 "조회"만 하니 본문은 없다.',
          blocks: { s1: B('start', 'GET /menu HTTP/1.1'), s2: B('start', 'POST /menu HTTP/1.1', { why: '메뉴를 "보기만" 하는 요청이다. 조회는 GET.' }),
            h1: B('header', 'Host: cafe.kr', { need: 'HTTP/1.1 요청에는 Host 헤더가 꼭 있어야 한다. 서버 하나(IP 하나)에 여러 사이트가 있을 수 있어서다.' }), bl: BL },
          tray: ['s2', 'h1', 'bl', 's1'], want: { start: 's1', headers: ['h1'], body: null },
          ok: '<b>GET /menu HTTP/1.1</b> \\r\\n <b>Host: cafe.kr</b> \\r\\n <b>\\r\\n</b>. 마지막 빈 줄이 "헤더 끝!"을 알린다. 본문이 없어도 빈 줄은 있어야 한다.' },
        { type: 'assemble', title: '홍차 한 잔 주문', prompt: '손님 주문: <b>/orders</b>에 새 주문을 만든다. 본문은 JSON <b>{"item":"tea"}</b> (14바이트).',
          coach: '이번엔 본문이 있다. 서버가 <b>본문의 형식</b>과 <b>몇 바이트인지</b> 알아야 한다. 함정 블록에 주의!',
          blocks: { s1: B('start', 'POST /orders HTTP/1.1'), s2: B('start', 'GET /orders HTTP/1.1', { why: '주문을 "새로 만드는" 요청이다. GET이 아니라 POST.' }),
            h1: B('header', 'Host: cafe.kr', { need: 'Host 헤더는 HTTP/1.1 요청의 필수 헤더다.' }),
            h2: B('header', 'Content-Type: application/json', { need: '본문이 JSON이라고 알려 줘야 서버가 해석할 수 있다.' }),
            h3: B('header', 'Content-Length: 14', { need: '본문이 몇 바이트인지 알려 줘야 서버가 어디까지 읽을지 안다.' }),
            h4: B('header', 'Content-Length: 99', { why: '본문은 14바이트다. 99라고 하면 서버는 85바이트를 더 기다리며 멈춘다.' }),
            bl: BL, d1: B('body', '{"item":"tea"}') },
          tray: ['h4', 's1', 'd1', 'h2', 'bl', 's2', 'h3', 'h1'], want: { start: 's1', headers: ['h1', 'h2', 'h3'], body: 'd1' },
          ok: '빈 줄이 <b>헤더의 끝</b>을, Content-Length 14가 <b>본문의 끝</b>을 알려 준다.' },
        { type: 'assemble', title: '응답 만들기', prompt: '이번엔 서버 쪽. 메뉴 요청에 <b>200 OK</b>로 HTML <b>&lt;h1&gt;Hi!&lt;/h1&gt;</b> (12바이트)을 돌려준다.',
          coach: '응답의 시작줄은 <b>버전 상태코드 이유</b> 순서다. 요청에만 쓰는 헤더도 섞여 있다.',
          blocks: { s1: B('start', 'HTTP/1.1 200 OK'), s2: B('start', '200 OK HTTP/1.1', { why: '응답 시작줄은 "HTTP/1.1 200 OK"처럼 버전이 맨 앞이다.' }),
            h1: B('header', 'Content-Type: text/html', { need: '본문이 HTML이라고 알려야 브라우저가 화면으로 그린다.' }),
            h2: B('header', 'Content-Length: 12', { need: '본문 길이(12바이트)를 알려야 받는 쪽이 어디서 끝나는지 안다.' }),
            h3: B('header', 'Host: cafe.kr', { why: 'Host는 요청 헤더다. 응답에는 쓰지 않는다.' }),
            h4: B('header', 'Content-Length: 13', { why: '<h1>Hi!</h1>는 12바이트다.' }),
            bl: BL, d1: B('body', '<h1>Hi!</h1>') },
          tray: ['h3', 'd1', 's2', 'h2', 'bl', 'h4', 's1', 'h1'], want: { start: 's1', headers: ['h1', 'h2'], body: 'd1' },
          ok: '요청이든 응답이든 구조는 같다: 시작줄 → 헤더 → 빈 줄 → 본문.' },
        { type: 'pickline', title: '헤더는 어디서 끝날까', prompt: '받은 요청 원문이다. 이 중 몇 줄은 헤더처럼 생겼지만 사실 본문이다.',
          q: '"헤더 끝!"을 알리는 줄을 누르자.',
          lines: [['POST /notes HTTP/1.1', 1], ['Host: memo.kr', 1], ['Content-Type: text/plain', 1], ['Content-Length: 23', 1], ['', 1], ['Subject: hello', 1], ['To: you', 0]],
          answer: 4,
          why: { 5: '이 줄은 헤더처럼 생겼지만 빈 줄 뒤에 있으니 본문이다.', 6: '이 줄도 본문이다(빈 줄 뒤).', _: '아직 헤더 줄이다. 헤더의 끝은 내용 없는 빈 줄(\\r\\n\\r\\n)로 표시된다.' },
          ok: '빈 줄(\\r\\n\\r\\n)이 경계다. 그 뒤 <b>Subject: hello \\r\\n To: you</b>는 본문(14 + 2 + 7 = 23바이트)이라, 헤더처럼 생겨도 헤더가 아니다.' },
        { type: 'pickline', title: '두 응답이 붙어서 왔다', prompt: '한 연결로 응답 두 개가 연달아 도착했다(keep-alive). 바이트는 끊김 없이 이어져 있다.',
          q: '두 번째 응답이 시작되는 줄을 누르자.',
          lines: [['HTTP/1.1 200 OK', 1], ['Content-Type: text/plain', 1], ['Content-Length: 17', 1], ['', 1], ['Content-Length: 5', 0], ['HTTP/1.1 404 Not Found', 1], ['Content-Length: 0', 1], ['', 1]],
          answer: 5,
          why: { 4: '이 줄은 헤더처럼 보이지만 첫 응답의 <b>본문</b>이다. "Content-Length: 5"는 정확히 17바이트, 첫 응답의 Content-Length와 같다.', 3: '이 빈 줄은 첫 응답의 헤더가 끝난 곳이다. 본문은 그 뒤에 17바이트.', _: '첫 응답의 헤더 → 빈 줄 → 본문 17바이트를 다 읽은 다음 바이트부터가 두 번째 응답이다.' },
          ok: '<b>헤더의 끝은 빈 줄, 본문의 끝은 Content-Length</b>. 이 두 표시가 없으면 받는 쪽은 메시지를 나눌 수 없다.' }
      ],
      note: { 'W4-4': '메시지를 조립하고 원문을 읽을 때마다 빈 줄(\\r\\n\\r\\n)이 헤더와 본문의 경계였고, 본문이 어디서 끝나는지는 Content-Length가 알려 줬다.' } },

    /* ================================================== 2 */
    { title: '두 번 들어온 주문', desc: '응답이 사라졌다. 다시 보내도 될까? GET, PUT, POST, DELETE, PATCH.', qc: ['W4-5'],
      brief: '요청을 보냈는데 <b>응답이 사라졌다</b>(타임아웃). 서버가 처리했는지 아닌지 모른다.<br>' +
        '다시 보내도 되는지는 그 요청이 <b>멱등(idempotent)</b>한지, 즉 <b>여러 번 보내도 서버 상태가 한 번 보낸 것과 같은지</b>에 달렸다.<br>' +
        '오른쪽 <b>서버 장부</b>가 선택의 결과를 보여 준다.',
      tasks: [
        { type: 'choice', title: '주문 조회', req: 'GET /orders/101 HTTP/1.1\nHost: cafe.kr', event: '💥 응답이 오는 길에 사라졌다(타임아웃).',
          ledger: ['#101 아메리카노 ×1'], q: '다시 보내도 될까?', o: [
            { t: '된다. GET은 조회만 해서 몇 번 보내도 서버 상태가 바뀌지 않는다', ok: true, res: [['#101 아메리카노 ×1', '']] },
            { t: '안 된다. 두 번 조회하면 두 번 결제된다', why: '조회는 서버 상태를 바꾸지 않는다(안전한 메서드).' },
            { t: '된다. 단 POST로 바꿔서 보내야 한다', why: 'POST는 오히려 재시도가 위험한 메서드다.' }],
          ok: 'GET은 <b>안전(safe)</b>하고 <b>멱등</b>하다. 브라우저도 GET은 알아서 다시 보내곤 한다.' },
        { type: 'choice', title: '닉네임 바꾸기', req: 'PUT /profile/7 HTTP/1.1\nHost: cafe.kr\nContent-Type: application/json\n\n{"nick":"DJ"}', event: '💥 타임아웃. 닉네임이 바뀌었는지 모른다.',
          ledger: ['프로필 7 · 닉네임 guest (또는 DJ?)'], q: '다시 보내도 될까?', o: [
            { t: '안 된다. 닉네임이 "DJDJ"가 된다', why: 'PUT은 덧붙이기가 아니라 "이 상태로 통째로 바꿔"다.', res: [['프로필 7 · 닉네임 DJ', 'new']] },
            { t: '된다. PUT은 "이 상태로 만들어"라 두 번 보내도 결과가 같다', ok: true, res: [['프로필 7 · 닉네임 DJ (몇 번 보내도 같음)', 'new']] },
            { t: '안 된다. 두 번째 PUT은 409 충돌로 거절된다', why: '같은 내용을 다시 PUT하는 건 충돌이 아니다. 결과가 같을 뿐이다.' }],
          ok: 'PUT은 멱등이다. 응답이 사라져도 그대로 다시 보내면 된다.' },
        { type: 'choice', title: '홍차 주문', req: 'POST /orders HTTP/1.1\nHost: cafe.kr\nContent-Type: application/json\n\n{"item":"tea"}', event: '💥 타임아웃. 주문이 들어갔는지 모른다.',
          ledger: ['#101 아메리카노 ×1', '#102 홍차 ×1 (들어갔을 수도)'], q: '이 요청을 그대로 다시 보내면 어떻게 될 수 있을까?', o: [
            { t: '서버가 같은 내용을 알아보고 하나로 합친다', why: '서버는 두 요청이 같은 의도인지 알 방법이 없다. POST는 보낼 때마다 새로 만든다.' },
            { t: '두 번째 요청은 405로 거절된다', why: '405는 그 메서드를 허용하지 않을 때다. POST는 허용된 메서드라 또 처리된다.' },
            { t: '첫 요청이 이미 처리됐다면 홍차 주문이 두 개가 된다', ok: true, res: [['#101 아메리카노 ×1', ''], ['#102 홍차 ×1', ''], ['#103 홍차 ×1 ← 중복!', 'dup']] }],
          ok: 'POST는 <b>멱등이 아니다</b>. "새로 하나 만들어"를 두 번 하면 두 개가 생긴다. 그래서 그냥 재시도하면 위험하다.' },
        { type: 'choice', title: '멱등 키가 붙은 주문', req: 'POST /orders HTTP/1.1\nHost: cafe.kr\nIdempotency-Key: k-77\n\n{"item":"green tea"}', event: '💥 타임아웃. 이 서버는 Idempotency-Key를 기억했다가 같은 키의 요청은 한 번만 처리한다.',
          ledger: ['#101 아메리카노 ×1', '#102 홍차 ×1'], q: '어떻게 다시 보낼까?', o: [
            { t: '새 키(k-78)를 만들어 다시 보낸다', why: '새 키 = 새 주문이라는 뜻이다. 첫 요청이 처리됐다면 녹차가 두 잔이 된다.', res: [['#103 녹차 (k-77)', ''], ['#104 녹차 (k-78) ← 중복!', 'dup']] },
            { t: '같은 키(k-77)로 다시 보낸다', ok: true, res: [['#101 아메리카노 ×1', ''], ['#102 홍차 ×1', ''], ['#103 녹차 (k-77) · 한 번만 처리됨', 'new']] },
            { t: '키를 빼고 다시 보낸다', why: '키가 없으면 서버가 중복인지 알아볼 수 없다.' }],
          ok: '같은 키로 재시도하면 서버가 "이미 처리한 k-77"이라며 저장해 둔 응답을 돌려준다. <b>POST 재시도에는 멱등 키</b>.' },
        { type: 'choice', title: '주문 취소', req: 'DELETE /orders/103 HTTP/1.1\nHost: cafe.kr', event: '💥 타임아웃이라 다시 보냈더니 이번엔 404 Not Found가 왔다.',
          ledger: ['#101 아메리카노 ×1', '#102 홍차 ×1'], q: '404는 무슨 뜻일까?', o: [
            { t: '첫 요청이 이미 지웠다. 서버 상태는 한 번 지운 것과 같다', ok: true, res: [['#101 아메리카노 ×1', ''], ['#102 홍차 ×1', '']] },
            { t: '두 번째 DELETE가 다른 주문까지 지웠다', why: 'DELETE /orders/103은 103만 가리킨다. 이미 없으니 404일 뿐이다.' },
            { t: 'DELETE는 멱등이 아니라서 오류가 났다', why: '멱등은 "응답 코드가 같다"가 아니라 "서버 상태가 같다"는 뜻이다. 상태는 같으니 멱등이다.' }],
          ok: 'DELETE는 멱등이다. 응답(200 → 404)은 달라도 서버 상태(103 없음)는 같다.' },
        { type: 'choice', title: '지갑 충전', req: 'PATCH /wallet/7 HTTP/1.1\nHost: cafe.kr\n\n{"add": 1000}', event: '💥 타임아웃. 잔액 5,000원에 1,000원이 더해졌는지 모른다.',
          ledger: ['지갑 7 · 잔액 5,000원 (또는 6,000원?)'], q: '이 요청은 그대로 다시 보내도 안전할까?', o: [
            { t: '그렇다. PATCH는 PUT처럼 항상 멱등이다', why: 'PATCH는 멱등이 보장되지 않는다. 내용이 "더하기"면 반복할 때마다 바뀐다.', res: [['지갑 7 · 잔액 7,000원 ← 두 번 더해짐!', 'dup']] },
            { t: '그렇다. 금액이 같으니 결과도 같다', why: '같은 "1,000원 더해"를 두 번 적용하면 2,000원이 더해진다.', res: [['지갑 7 · 잔액 7,000원 ← 두 번 더해짐!', 'dup']] },
            { t: '아니다. "1,000원 더해"는 반복할수록 결과가 달라진다', ok: true, res: [['지갑 7 · 잔액 조회 후 결정 (6,000원이었다)', 'new']] }],
          ok: '멱등은 메서드 이름이 아니라 <b>요청의 의미</b>로 정해진다. "잔액을 6,000으로"(PUT식)나 멱등 키를 쓰면 안전하게 재시도할 수 있다.' }
      ],
      note: { 'W4-5': 'GET·PUT·DELETE는 다시 보내도 서버 상태가 같았고, 그냥 POST(와 "더하기" PATCH)는 재시도하면 중복이 생겼다. POST는 같은 멱등 키로 재시도해야 안전했다.' } },

    /* ================================================== 3 */
    { title: '창구가 몇 개?', desc: 'HTTP/1.1, HTTP/2, HTTP/3. 하나가 막히면 누가 같이 기다릴까?', qc: ['W4-7'],
      brief: '브라우저가 같은 서버에 <b>📄 HTML, 🎨 CSS, 🖼️ 이미지</b> 세 가지를 요청한다.<br>' +
        '상황마다 <b>"덩달아 기다려야 하는 것"</b>을 모두 고른다. 아무것도 안 기다리면 고르지 않고 제출한다.<br>' +
        '줄 서서 앞사람 때문에 뒷사람이 못 가는 현상을 <b>HOL(Head-of-Line) 블로킹</b>이라 한다.',
      tasks: [
        { type: 'multi', vis: 'lanes', title: 'HTTP/1.1: 창구 하나', proto: 'HTTP/1.1', pd: '연결(TCP) 1개. 요청을 HTML → CSS → 이미지 순서로 보냈다. 응답은 같은 연결로 <b>요청 순서대로</b>만 돌아온다.',
          wire: 'H1 H2 C1 I1 I2', slow: 'H', note: '⏳ 서버가 HTML을 만드는 데 2초가 걸린다. CSS와 이미지는 이미 준비됐다.',
          q: 'HTML이 늦는 바람에 덩달아 기다려야 하는 응답은?', items: ['H', 'C', 'I'], answer: ['C', 'I'],
          why: 'HTTP/1.1 연결 하나에서는 응답이 요청 순서대로만 나간다. HTML이 늦으면 준비된 CSS·이미지도 뒤에서 줄 선다(<b>HTTP 계층의 HOL 블로킹</b>). HTML 자신은 "덩달아"가 아니니 고르지 않는다.',
          ok: 'HTTP 계층의 HOL 블로킹. 그래서 HTTP/1.1 시절 브라우저는 연결을 6개쯤 따로 열었다.' },
        { type: 'multi', vis: 'lanes', title: 'HTTP/2: 한 연결, 여러 스트림', proto: 'HTTP/2', pd: '연결(TCP) 1개 안에 <b>스트림 3개</b>. 응답을 작은 <b>프레임</b>으로 잘라 섞어 보낸다.',
          wire: 'C1 I1 I2 H1 H2', slow: 'H', note: '⏳ 똑같이 HTML 생성이 2초 걸린다.',
          q: 'HTML이 늦는 바람에 덩달아 기다려야 하는 응답은?', items: ['H', 'C', 'I'], answer: [],
          why: 'HTTP/2는 스트림마다 프레임을 섞어 보낸다. 준비된 CSS·이미지는 HTML을 기다리지 않고 먼저 나간다. 덩달아 기다리는 응답은 <b>없다</b>.',
          ok: 'HTTP/2는 <b>HTTP 계층의 HOL 블로킹</b>을 없앴다(멀티플렉싱).' },
        { type: 'multi', vis: 'lanes', title: 'HTTP/2: 패킷 하나가 사라지면', proto: 'HTTP/2', pd: '연결(TCP) 1개 안에 스트림 3개. 이번엔 서버는 빠른데, 네트워크에서 <b>패킷 하나</b>가 사라졌다.',
          wire: 'H1 C1 I1 H2 C2 I2', lost: 1, note: '💥 C1(CSS 첫 조각)이 사라졌다. 그 뒤 패킷들은 도착했다. 재전송까지 한 RTT 이상 걸린다.',
          q: '재전송이 올 때까지 앱(브라우저)에 전달되지 못하고 기다리는 스트림은?', items: ['H', 'C', 'I'], answer: ['H', 'C', 'I'],
          why: 'HTTP/2는 <b>TCP 하나</b> 위에서 돈다. TCP는 바이트를 순서대로만 앱에 넘기므로, C1 뒤에 도착한 I1·H2·I2도 C1이 다시 올 때까지 운영체제 버퍼에 묶인다. 세 스트림이 모두 기다린다(<b>TCP 계층의 HOL 블로킹</b>).',
          ok: 'HOL 블로킹이 HTTP 계층에서 <b>TCP 계층</b>으로 내려갔을 뿐이다. 손실이 잦은 모바일망에서 특히 아프다.' },
        { type: 'multi', vis: 'lanes', title: 'HTTP/3: 스트림마다 따로', proto: 'HTTP/3', pd: '<b>QUIC</b>(UDP 위) 연결 1개 안에 스트림 3개. QUIC은 <b>스트림마다 순서를 따로</b> 관리한다.',
          wire: 'H1 C1 I1 H2 C2 I2', lost: 1, note: '💥 똑같이 C1이 사라졌다.',
          q: '재전송이 올 때까지 기다리는 스트림은?', items: ['H', 'C', 'I'], answer: ['C'],
          why: 'QUIC은 스트림별로 순서를 맞춘다. C1이 빠지면 <b>CSS 스트림만</b> 기다리고, HTML·이미지 프레임은 바로 앱에 전달된다.',
          ok: 'HTTP/3는 <b>전송 계층에서</b> 스트림을 독립시켜 TCP의 HOL 블로킹을 끊었다.' },
        { type: 'choice', title: '왜 UDP일까', req: 'HTTP/1.1 → TCP\nHTTP/2   → TCP (스트림 섞기)\nHTTP/3   → QUIC → UDP', event: '🤔 HTTP/3는 TCP를 버리고 UDP 위의 QUIC을 쓴다.',
          q: '왜 UDP 위에 QUIC을 만들었을까?', o: [
            { t: 'UDP가 TCP보다 처리량이 커서', why: 'UDP 자체가 더 많이 실어 나르는 건 아니다. 문제는 처리량이 아니라 순서 대기(HOL)다.' },
            { t: 'QUIC이 스트림별 순서·재전송·암호화를 직접 맡으려고. UDP는 그 바탕이 되는 얇은 운반 수단이다', ok: true },
            { t: '암호화를 빼서 더 빠르게 하려고', why: 'QUIC은 TLS 1.3을 내장해 오히려 항상 암호화한다.' }],
          ok: 'TCP는 운영체제 안에 있어 바꾸기 어렵다. UDP 위에 QUIC을 올리면 <b>스트림 독립 전송</b>을 새로 설계할 수 있다.' }
      ],
      note: { 'W4-7': 'HTTP/1.1은 HTML이 늦자 CSS·이미지가 줄을 섰고(HTTP 계층 HOL), HTTP/2는 그걸 없앴지만 패킷 하나가 사라지자 세 스트림이 모두 멈췄다(TCP 계층 HOL). HTTP/3(QUIC)에선 CSS만 기다렸다.' } },

    /* ================================================== 4 */
    { title: '도청자의 망원경', desc: '카페 와이파이 주인은 HTTPS 접속에서 무엇을 볼 수 있을까?', qc: ['W4-8'],
      brief: '이번엔 <b>도청자</b>가 되어 본다. 카페 와이파이를 지나는 패킷을 엿보고 있다.<br>' +
        '각 항목이 <b>👁️ 보인다</b>인지 <b>🔒 암호화</b>인지 표시하고 제출한다.<br>' +
        '핵심: TLS는 TCP 위에서 <b>HTTP 메시지</b>를 감싼다. 그 아래(IP·TCP 헤더)와 연결을 열기 전의 정보는 감싸지 못한다.',
      tasks: [
        { type: 'sort', title: '은행 이체를 엿보다', scope: 'https://bank.kr/account/123?token=abc 에서 50,000원 이체',
          prompt: 'DJ가 카페 와이파이로 은행에 접속해 이체한다. <b>HTTPS</b>다.',
          items: [
            ['목적지 IP', '203.0.113.5', 1, 'IP 헤더는 TLS 바깥(아래 계층)이다. 라우터가 읽어야 길을 찾는다.'],
            ['목적지 포트', '443', 1, 'TCP 헤더도 TLS 바깥이다.'],
            ['DNS 질의', 'bank.kr의 IP는?', 1, '보통 DNS 질의는 암호화 전에 평문으로 나간다. (DoH·DoT를 쓰면 가려진다.)'],
            ['TLS 첫 인사의 SNI', 'bank.kr', 1, '서버가 어느 인증서를 줄지 알아야 해서 평문으로 보낸다. (ECH를 쓰면 가려진다.)'],
            ['URL 경로', '/account/123', 0, '경로는 HTTP 요청 시작줄 안에 있어 암호화된다.'],
            ['쿼리', '?token=abc', 0, '쿼리도 요청 시작줄의 일부라 암호화된다.'],
            ['쿠키', 'Cookie: session=…', 0, '헤더는 HTTP 메시지 안에 있어 암호화된다.'],
            ['요청 본문', '이체 금액 50,000원', 0, '본문은 암호화된다.'],
            ['응답 상태 코드', '200 OK', 0, '응답 시작줄도 HTTP 메시지라 암호화된다.'],
            ['데이터 크기와 시각', '몇 KB를 몇 시에', 1, '내용은 못 봐도 크기와 타이밍은 보인다. 이것만으로 어떤 페이지인지 추측하기도 한다.']
          ],
          ok: '보이는 것: <b>IP·포트, 도메인(DNS·SNI), 크기와 타이밍</b>. 암호화되는 것: <b>경로·쿼리·헤더·쿠키·본문·상태 코드</b>.' },
        { type: 'sort', title: '자물쇠 없는 사이트', scope: 'http://shop.kr/login?id=dj (HTTPS 아님)',
          prompt: '이번엔 <b>HTTP</b>(자물쇠 없음) 사이트에 로그인한다.',
          items: [
            ['목적지 IP', '198.51.100.9', 1, 'IP 헤더는 언제나 보인다.'],
            ['URL 경로와 쿼리', '/login?id=dj', 1, 'HTTP는 암호화가 없다. 시작줄이 그대로 보인다.'],
            ['쿠키', 'Cookie: session=…', 1, '헤더도 평문이다. 세션을 훔쳐 로그인 상태를 가로챌 수 있다.'],
            ['요청 본문', 'password=hunter2', 1, '비밀번호까지 그대로 보인다.']
          ],
          ok: 'HTTP에서는 <b>전부</b> 보인다. HTTPS가 가려 주는 범위를 비교해 보자.' },
        { type: 'choice', title: '와이파이 주인이 모르는 것', req: 'https://bank.kr/account/123', event: '👁️ 카페 와이파이 주인이 로그를 들여다본다.',
          q: 'HTTPS 접속에서 와이파이 주인이 알 수 <b>없는</b> 것은?', o: [
            { t: 'DJ가 bank.kr에 접속했다는 사실', why: 'IP, DNS 질의, SNI로 도메인이 드러난다.' },
            { t: 'DJ가 본 계좌 번호(/account/123)', ok: true },
            { t: '접속한 시각과 주고받은 데이터 양', why: '크기와 타이밍은 암호화로 가려지지 않는다.' }],
          ok: 'HTTPS는 <b>내용</b>을 지키지만 <b>누구와 언제 얼마나</b> 통신했는지는 다 가리지 못한다.' }
      ],
      note: { 'W4-8': 'HTTPS에서도 목적지 IP·포트, 도메인(DNS 질의·SNI), 크기와 시각은 보였고, 경로·쿼리·쿠키·본문·상태 코드는 암호화됐다. HTTP는 전부 보였다.' } },

    /* ================================================== 5 */
    { title: '인증서 검문소', desc: '도메인, 유효기간, 신뢰 체인, 폐기 여부. 위조 인증서를 가려낸다.', qc: ['W4-9'],
      brief: '여기는 <b>브라우저의 인증서 검문소</b>. 서버가 내민 인증서를 심사한다. 오늘은 <b>2026-10-17</b>.<br>' +
        '검사 항목은 네 가지: <b>① 도메인</b>(주소창 도메인이 SAN 목록에 있나) <b>② 유효기간</b> <b>③ 신뢰 체인</b>(신뢰하는 루트 CA까지 서명이 이어지나) <b>④ 폐기 여부</b>.<br>' +
        '문제가 없으면 <b>통과</b>, 있으면 <b>거부 사유</b>를 누른다. 검사 항목이 아닌 정보에 흔들리지 말자.',
      tasks: [
        { type: 'cert', title: '쇼핑몰', url: 'https://shop.kr', san: 'shop.kr, www.shop.kr', from: '2026-03-01', to: '2027-03-01', chain: ['shop.kr', 'Good Issuing CA', 'Good Root CA ✓'], rev: '정상', answer: 'pass',
          coach: '네 항목을 차례로 보자. ① 주소창 <b>shop.kr</b>이 SAN에 있나? ② 오늘이 기간 안인가? ③ 체인 끝의 루트가 신뢰 저장소(✓)에 있나? ④ 폐기되지 않았나?',
          ok: '네 항목 모두 통과. 주소창에 자물쇠가 뜬다.' },
        { type: 'cert', title: '로그인 페이지', url: 'https://login.shop.kr', san: 'shop.kr, www.shop.kr', from: '2026-03-01', to: '2027-03-01', chain: ['shop.kr', 'Good Issuing CA', 'Good Root CA ✓'], rev: '정상', answer: 'domain',
          ok: 'SAN에 login.shop.kr이 없다. 이 인증서는 다른 이름용이다.' },
        { type: 'cert', title: 'API 서버', url: 'https://api.shop.kr', san: '*.shop.kr', from: '2026-05-10', to: '2026-11-10', chain: ['*.shop.kr', 'Good Issuing CA', 'Good Root CA ✓'], rev: '정상', answer: 'pass',
          ok: '와일드카드 <b>*.shop.kr</b>은 api.shop.kr처럼 <b>한 단계</b> 하위 이름을 덮는다. 만료가 다가오지만 오늘은 기간 안이다.' },
        { type: 'cert', title: '은행', url: 'https://bank.kr', san: 'bank.kr, www.bank.kr', from: '2025-09-30', to: '2026-09-30', chain: ['bank.kr', 'Global Trust CA', 'Global Trust Root ✓'], rev: '정상', answer: 'date',
          ok: '2026-09-30에 만료됐다. 오늘(10-17)은 기간 밖이다.' },
        { type: 'cert', title: '결제 페이지', url: 'https://pay.bank.kr', san: 'pay.bank.kr', from: '2026-01-01', to: '2027-01-01', chain: ['pay.bank.kr', 'PayBank Self Root ✗ (신뢰 저장소에 없음)'], rev: '정상', answer: 'chain',
          ok: '스스로 서명한 루트다. 브라우저가 믿는 CA의 서명이 없으니 누구나 만들 수 있는 인증서다.' },
        { type: 'cert', title: '사내 메일', url: 'https://mail.corp.kr', san: 'mail.corp.kr', from: '2026-02-01', to: '2027-02-01', chain: ['mail.corp.kr', 'Good Issuing CA', 'Good Root CA ✓'], rev: '폐기됨 (2026-10-02, 개인키 유출)', answer: 'revoked',
          ok: '개인키가 유출돼 CA가 폐기했다. 다른 항목이 다 멀쩡해도 거부한다.' },
        { type: 'cert', title: '두 단계 하위 도메인', url: 'https://img.cdn.shop.kr', san: '*.shop.kr', from: '2026-05-10', to: '2026-11-10', chain: ['*.shop.kr', 'Good Issuing CA', 'Good Root CA ✓'], rev: '정상', answer: 'domain',
          ok: '*.shop.kr은 한 단계(cdn.shop.kr)까지만 덮는다. img.cdn.shop.kr은 두 단계라 맞지 않는다.' },
        { type: 'cert', title: '수상한 겉모습', url: 'https://shop.kr', san: 'shop.kr, www.shop.kr', from: '2026-08-01', to: '2027-08-01', chain: ['shop.kr', 'Good Issuing CA', 'Good Root CA ✓'], rev: '정상', answer: 'pass',
          extra: [['서버 IP', '203.0.113.99 (지난주와 다름)'], ['인증서 파일 크기', '1.2 KB (작다)'], ['발급받은 회사', '직원 3명']],
          ok: '서버 IP, 파일 크기, 회사 규모는 <b>검사 항목이 아니다</b>. 네 항목이 정상이면 통과다. (서버를 옮기면 IP는 바뀔 수 있다.)' },
        { type: 'cert', title: '아직 이른 인증서', url: 'https://event.shop.kr', san: 'event.shop.kr', from: '2026-11-01', to: '2027-11-01', chain: ['event.shop.kr', 'Good Issuing CA', 'Good Root CA ✓'], rev: '정상', answer: 'date',
          ok: '유효기간은 <b>시작일</b>도 본다. 11월 1일부터라 오늘은 아직 쓸 수 없다.' }
      ],
      note: { 'W4-9': '도메인(SAN·와일드카드 한 단계), 유효기간(만료·시작 전), 신뢰 루트까지의 체인(자체 서명 거부), 폐기 여부로 판정했다. 서버 IP나 파일 크기는 검사 항목이 아니었다.' } },

    /* ================================================== 6 */
    { title: '열린 문, 닫힌 문', desc: '0.0.0.0에 bind하면 인터넷에 공개될까? 누가 접속할 수 있는지 고른다.', qc: ['W2-7'],
      brief: '내 노트북에서 FastAPI 서버를 띄웠다. <b>bind 주소</b>는 "어느 네트워크 인터페이스에서 손님을 받을지"다.<br>' +
        '<b>127.0.0.1</b> = 이 PC 안에서만, <b>0.0.0.0</b> = 이 PC의 모든 인터페이스에서.<br>' +
        '하지만 실제로 밖에서 들어올 수 있는지는 <b>공유기(NAT·포트포워딩)</b>, <b>방화벽</b>, <b>보안 그룹</b>이 정한다. 접속할 수 있는 사람을 모두 고르자.',
      tasks: [
        { type: 'multi', vis: 'bind', title: '개발 서버 기본값', cfg: [['bind', '127.0.0.1:8000'], ['공유기 포트포워딩', '없음'], ['PC 방화벽', '8000 허용']],
          q: '접속할 수 있는 사람은?', items: ['self', 'lan', 'net'], answer: ['self'],
          why: '127.0.0.1(loopback)은 PC 안에서만 닿는 주소다. 같은 Wi-Fi의 폰도, 인터넷도 이 문에 닿지 못한다.',
          ok: '127.0.0.1 bind = <b>나만</b>.' },
        { type: 'multi', vis: 'bind', title: '0.0.0.0으로 바꿨다', cfg: [['bind', '0.0.0.0:8000'], ['공유기 포트포워딩', '없음'], ['PC 방화벽', '8000 허용']],
          q: '접속할 수 있는 사람은?', items: ['self', 'lan', 'net'], answer: ['self', 'lan'],
          why: '0.0.0.0은 이 PC의 <b>모든 인터페이스</b>(192.168.0.10 포함)에서 받겠다는 뜻이라 같은 Wi-Fi의 폰도 들어온다. 하지만 인터넷에서 오는 패킷은 공유기의 공인 IP에서 멈춘다. 포트포워딩이 없으면 공유기가 누구에게 넘길지 모른다.',
          ok: '0.0.0.0 bind ≠ 인터넷 공개. <b>같은 LAN까지</b>.' },
        { type: 'multi', vis: 'bind', title: '포트포워딩을 열었다', cfg: [['bind', '0.0.0.0:8000'], ['공유기 포트포워딩', '공인 :8000 → 192.168.0.10:8000'], ['PC 방화벽', '8000 허용']],
          q: '접속할 수 있는 사람은?', items: ['self', 'lan', 'net'], answer: ['self', 'lan', 'net'],
          why: '공유기가 공인 IP:8000으로 온 연결을 노트북으로 넘겨 주고, 노트북은 모든 인터페이스에서 받고, 방화벽도 허용한다. 이제 인터넷에서도 들어온다.',
          ok: '인터넷 공개는 <b>bind + 포트포워딩 + 방화벽</b>이 모두 열려야 한다. 그러니 이 상태라면 인증·보안 설정이 꼭 필요하다.' },
        { type: 'multi', vis: 'bind', title: '방화벽이 막고 있다', cfg: [['bind', '0.0.0.0:8000'], ['공유기 포트포워딩', '없음'], ['PC 방화벽', '8000 차단']],
          q: '접속할 수 있는 사람은?', items: ['self', 'lan', 'net'], answer: ['self'],
          why: 'PC 방화벽이 바깥에서 들어오는 8000번 연결을 막는다. 같은 PC 안(loopback)의 접속은 들어오는 외부 트래픽이 아니라 그대로 된다.',
          ok: 'bind가 열려 있어도 <b>방화벽</b>이 막으면 LAN에서도 못 들어온다.' },
        { type: 'multi', vis: 'bind', title: '포트포워딩 + 127.0.0.1', cfg: [['bind', '127.0.0.1:8000'], ['공유기 포트포워딩', '공인 :8000 → 192.168.0.10:8000'], ['PC 방화벽', '8000 허용']],
          q: '접속할 수 있는 사람은?', items: ['self', 'lan', 'net'], answer: ['self'],
          why: '공유기가 192.168.0.10:8000으로 넘겨 줘도, 서버는 127.0.0.1에서만 기다린다. 192.168.0.10:8000에는 아무도 없으니 거절(RST)된다.',
          ok: '포트포워딩도 <b>bind 주소</b>가 받아 줘야 의미가 있다.' },
        { type: 'multi', vis: 'bind', cloud: true, title: '클라우드 서버', cfg: [['bind', '0.0.0.0:8000'], ['보안 그룹 인바운드', '22번만 허용 (8000 없음)'], ['VM 공인 IP', '있음']],
          q: '접속할 수 있는 사람은?', items: ['self', 'lan', 'net'], answer: ['self'],
          why: '보안 그룹은 VM 바깥의 문지기다. 8000 규칙이 없으니 같은 VPC의 서버든 인터넷이든 VM 안으로 못 들어온다. VM 안에서 자기 자신에게 접속하는 것만 된다.',
          ok: '클라우드에서는 <b>보안 그룹</b>이 공유기·방화벽 역할을 한다.' },
        { type: 'multi', vis: 'bind', cloud: true, title: 'VPC 안에만 열기', cfg: [['bind', '0.0.0.0:8000'], ['보안 그룹 인바운드', '8000 ← 10.0.0.0/16 (VPC)'], ['VM 공인 IP', '있음']],
          q: '접속할 수 있는 사람은?', items: ['self', 'lan', 'net'], answer: ['self', 'lan'],
          why: '보안 그룹이 VPC 대역(10.0.0.0/16)에서 오는 8000번만 허용한다. 인터넷 사용자의 출발 IP는 그 대역이 아니라 막힌다.',
          ok: '공개 범위는 bind가 아니라 <b>보안 그룹의 소스 대역</b>이 정했다.' }
      ],
      note: { 'W2-7': '0.0.0.0 bind만으로는 같은 LAN까지였고, 인터넷 공개는 포트포워딩·방화벽·보안 그룹이 모두 열려야 했다. 127.0.0.1 bind면 포트포워딩을 해도 나만 접속할 수 있었다.' } }
  ];

  var STREAM = { H: { ic: '📄', nm: 'HTML' }, C: { ic: '🎨', nm: 'CSS' }, I: { ic: '🖼️', nm: '이미지' } };
  var PARTY = { self: { ic: '💻', nm: '같은 PC의 브라우저', zn: '내 노트북 안' }, lan: { ic: '📱', nm: '같은 Wi-Fi의 친구 폰', zn: '집 Wi-Fi (192.168.0.x)' }, net: { ic: '🌍', nm: '카페의 외부인', zn: '인터넷' } };
  var PARTY_CLOUD = { self: { ic: '🖥️', nm: 'VM 안의 curl', zn: 'VM 안' }, lan: { ic: '🗄️', nm: '같은 VPC의 다른 서버', zn: 'VPC (10.0.0.0/16)' }, net: { ic: '🌍', nm: '인터넷 사용자', zn: '인터넷' } };
  var DECIDE = [['pass', '✅ 통과'], ['domain', '⛔ 도메인 불일치'], ['date', '⛔ 유효기간'], ['chain', '⛔ 신뢰할 수 없는 발급자'], ['revoked', '⛔ 폐기됨']];
  var CERT_WHY = {
    pass: '통과시키면 안 된다. 네 항목 중 하나가 어긋나 있다.',
    domain: '주소창 도메인은 SAN 목록에 들어 있다(와일드카드는 한 단계까지 덮는다).',
    date: '오늘(2026-10-17)은 유효기간 안이다.',
    chain: '체인 끝의 루트가 신뢰 저장소(✓)에 있다.',
    revoked: '폐기 상태는 "정상"이다.'
  };

  /* ------------------------------------------------------------ 상태 */
  var S = null;
  function newState(si) {
    return { si: si, cfg: STAGES[si], ti: 0, hearts: 5, st: { wrong: 0, firstTry: 0 }, over: false };
  }
  function task() { return S.cfg.tasks[S.ti]; }
  function startStage(si) {
    S = newState(si);
    NA.ui.briefing(ov, 'STAGE ' + (si + 1) + ' · ' + S.cfg.title, S.cfg.brief, function () { startTask(0); });
  }
  function startTask(i) {
    S.ti = i; var t = task();
    S.done = false; S.missed = false; S.bad = {}; S.x = {}; S.res = null;
    S.seq = []; S.picked = {}; S.sorted = {}; S.stamp = null;
    S.msg = { who: '🔧 공방장', t: t.coach || defaultCoach(t) };
    if (t.type === 'choice') S.opts = NA.shuffle(t.o.map(function (o) { return o; }));
    render();
  }
  function defaultCoach(t) {
    return {
      assemble: '블록을 끌어다 메시지에 놓자. 시작줄 → 헤더 → 빈 줄 → (본문). 놓은 줄은 끌어서 순서를 바꿀 수 있다.',
      pickline: '줄을 눌러 고르자.',
      choice: '보기를 고르자. 서버 장부가 결과를 보여 준다.',
      multi: t.vis === 'lanes' ? '덩달아 기다리는 것을 모두 눌러 고른 뒤 제출. 없으면 아무것도 고르지 않고 제출.' : '접속할 수 있는 사람을 모두 눌러 고른 뒤 제출.',
      sort: '항목마다 👁️(보인다) 또는 🔒(암호화)를 고른 뒤 제출.',
      cert: '네 항목(도메인·기간·체인·폐기)을 확인하고 판정하자.'
    }[t.type];
  }

  /* ------------------------------------------------------------ 판정 */
  function wrong(html) {
    S.hearts--; S.st.wrong++; S.missed = true;
    S.msg = { cls: 'no', who: '✗ 다시! (신뢰도 −1)', t: html };
    NA.sfx.bad();
    if (S.hearts <= 0) { S.over = true; var me = S; render(); setTimeout(function () { if (S === me) debrief(false); }, 1400); return; }
    render();
  }
  function right(extra) {
    var t = task();
    S.done = true; if (!S.missed) S.st.firstTry++;
    S.msg = { cls: 'ok', who: '✓ 완성!', t: (extra || '') + t.ok };
    NA.sfx.good();
    render();
  }
  function next() {
    if (!S || !S.done || S.over) return;
    if (S.ti + 1 < S.cfg.tasks.length) startTask(S.ti + 1);
    else { S.over = true; NA.sfx.win(); debrief(true); }
  }
  function submit() {
    if (!S || S.over) return;
    if (S.done) return next();
    var t = task();
    if (t.type === 'assemble') return checkAssemble(t);
    if (t.type === 'multi') return checkMulti(t);
    if (t.type === 'sort') return checkSort(t);
  }

  /* assemble */
  function checkAssemble(t) {
    var bl = t.blocks, seq = S.seq, errs = [], badIx = {};
    if (!seq.length) return wrong('아직 아무 블록도 쌓지 않았다.');
    var bi = -1; seq.forEach(function (id, i) { if (bl[id].k === 'blank' && bi < 0) bi = i; });
    if (bl[seq[0]].k !== 'start') { errs.push('맨 앞은 <b>시작줄</b>이어야 한다. 받는 쪽은 첫 줄을 "무슨 요청/응답인지"로 읽는다.'); badIx[0] = 1; }
    else if (seq[0] !== t.want.start) { errs.push(bl[seq[0]].why || '주문과 다른 시작줄이다.'); badIx[0] = 1; }
    seq.forEach(function (id, i) { if (i > 0 && bl[id].k === 'start') { errs.push('시작줄은 맨 앞에 한 번만.'); badIx[i] = 1; } });
    if (bi < 0) errs.push('<b>빈 줄</b>이 없다. 빈 줄이 없으면 받는 쪽은 헤더가 어디서 끝나는지 몰라 계속 기다린다.');
    var end = bi < 0 ? seq.length : bi;
    var heads = seq.slice(1, end);
    heads.forEach(function (id, j) {
      if (bl[id].k === 'body') { errs.push('본문이 빈 줄보다 앞에 있다. 받는 쪽은 그 줄을 <b>헤더</b>로 읽는다.'); badIx[j + 1] = 1; }
      else if (bl[id].k === 'header' && t.want.headers.indexOf(id) < 0) { errs.push(bl[id].why || '필요 없는 헤더다.'); badIx[j + 1] = 1; }
    });
    t.want.headers.forEach(function (h) { if (heads.indexOf(h) < 0 && seq.indexOf(h) < 0) errs.push(bl[h].need || ('빠진 헤더: ' + bl[h].t)); });
    if (bi >= 0) {
      var after = seq.slice(bi + 1);
      after.forEach(function (id, j) {
        if (bl[id].k === 'header') { errs.push('헤더가 빈 줄 뒤에 있다. 빈 줄 뒤는 전부 <b>본문</b>으로 읽힌다.'); badIx[bi + 1 + j] = 1; }
        else if (bl[id].k === 'blank') { errs.push('빈 줄은 한 번만.'); badIx[bi + 1 + j] = 1; }
      });
      if (!t.want.body && after.some(function (id) { return bl[id].k === 'body'; })) errs.push('이 메시지에는 본문이 없다.');
      if (t.want.body && after.indexOf(t.want.body) < 0) errs.push('본문이 빠졌다. 빈 줄 뒤에 본문을 놓자.');
    }
    if (errs.length) { S.bad = badIx; return wrong('<ul>' + errs.slice(0, 4).map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul>'); }
    S.bad = {};
    var nh = t.want.headers.length, body = t.want.body ? bl[t.want.body].t : null;
    right('<span class="parsed">받는 쪽의 해석: 시작줄 → 헤더 ' + nh + '개 → <b>빈 줄에서 헤더 끝</b>' + (body ? ' → 본문 ' + body.length + '바이트(Content-Length)' : ' → 본문 없음') + '</span><br>');
  }
  function asmAdd(id) { if (!S || S.done || S.over || S.seq.indexOf(id) >= 0) return; S.seq.push(id); S.bad = {}; NA.sfx.pop(); render(); }
  function asmRemove(i) { if (!S || S.done || S.over) return; S.seq.splice(i, 1); S.bad = {}; NA.sfx.tick(); render(); }
  // 끼워 넣기·순서 바꾸기 (드래그 앤 드롭)
  function asmInsert(id, at) { if (!S || S.done || S.over || S.seq.indexOf(id) >= 0) return; S.seq.splice(at, 0, id); S.bad = {}; NA.sfx.pop(); render(); }
  function asmMove(from, to) { if (!S || S.done || S.over) return; var id = S.seq.splice(from, 1)[0]; if (to > from) to--; S.seq.splice(to, 0, id); S.bad = {}; NA.sfx.pop(); render(); }

  /* 포인터로 끌기: 블록 상자 → 메시지(원하는 위치), 메시지 줄 → 다른 위치, 메시지 줄 → 블록 상자(빼기). 짧게 누르면 기존 클릭 동작 */
  var drag = null;
  function dragSetup() {
    app.querySelectorAll('[data-add],[data-rm]').forEach(function (el) {
      el.onpointerdown = function (e) {
        if (e.button !== 0 || !S || S.done || S.over) return;
        if (el.dataset.add && S.seq.indexOf(el.dataset.add) >= 0) return;
        e.preventDefault();
        drag = { el: el, add: el.dataset.add || null, rm: el.dataset.rm != null ? +el.dataset.rm : null, x: e.clientX, y: e.clientY, on: false, ghost: null, at: null, out: false };
        window.addEventListener('pointermove', dragMove);
        window.addEventListener('pointerup', dragEnd);
        window.addEventListener('pointercancel', dragCancel);
      };
    });
  }
  function dragMove(e) {
    if (!drag) return;
    if (!drag.on) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 6) return;
      drag.on = true;
      var g = document.createElement('div');
      g.className = 'drag-ghost ' + (drag.el.className.match(/k-\w+/) || [''])[0];
      var t = task(), id = drag.add || S.seq[drag.rm];
      g.textContent = t.blocks[id].k === 'blank' ? '(빈 줄)' : t.blocks[id].t;
      document.body.appendChild(g); drag.ghost = g;
      drag.el.classList.add('drag-src');
      NA.sfx.tick(true);
    }
    drag.ghost.style.left = e.clientX + 'px'; drag.ghost.style.top = e.clientY + 'px';
    var box = app.querySelector('.msgbox'), tray = app.querySelector('.tray');
    var inBox = hit(box, e), inTray = hit(tray, e);
    clearMarks();
    drag.at = null; drag.out = false;
    if (inBox) {
      var lines = [].slice.call(box.querySelectorAll('.ln[data-rm]')), at = lines.length;
      for (var i = 0; i < lines.length; i++) { var r = lines[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { at = i; break; } }
      drag.at = at;
      var mark = document.createElement('div'); mark.className = 'drop-mark';
      if (at < lines.length) box.insertBefore(mark, lines[at]); else box.appendChild(mark);
      box.classList.add('drop-on');
    } else if (inTray && drag.rm != null) { drag.out = true; tray.classList.add('drop-out'); }
  }
  function hit(el, e) { if (!el) return false; var r = el.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }
  function clearMarks() {
    app.querySelectorAll('.drop-mark').forEach(function (m) { m.remove(); });
    app.querySelectorAll('.drop-on,.drop-out').forEach(function (m) { m.classList.remove('drop-on', 'drop-out'); });
  }
  function dragStop() {
    window.removeEventListener('pointermove', dragMove); window.removeEventListener('pointerup', dragEnd); window.removeEventListener('pointercancel', dragCancel);
    if (drag && drag.ghost) drag.ghost.remove();
    if (drag && drag.el) drag.el.classList.remove('drag-src');
    clearMarks();
  }
  function dragCancel() { dragStop(); drag = null; }
  function dragEnd() {
    var d = drag; dragStop(); drag = null; if (!d) return;
    if (!d.on) { if (d.add) asmAdd(d.add); else asmRemove(d.rm); return; }   // 짧게 누르기 = 클릭
    if (d.add && d.at != null) return asmInsert(d.add, d.at);
    if (d.rm != null && d.at != null) { if (d.at === d.rm || d.at === d.rm + 1) return render(); return asmMove(d.rm, d.at); }
    if (d.rm != null && d.out) return asmRemove(d.rm);
    render();
  }

  /* pickline */
  function pickLine(i) {
    var t = task(); if (!S || S.done || S.over || t.type !== 'pickline' || S.x[i]) return;
    if (i === t.answer) { S.picked[i] = 'right'; return right(); }
    S.x[i] = true; S.bad = {}; S.bad[i] = 1;
    wrong(t.why[i] || t.why._);
  }

  /* choice */
  function choose(k) {
    var t = task(); if (!S || S.done || S.over || t.type !== 'choice' || S.x[k]) return;
    var o = S.opts[k];
    if (o.res) S.res = o.res;
    if (o.ok) { S.picked[k] = 'right'; return right(); }
    S.x[k] = true; wrong(o.why);
  }

  /* multi */
  function toggle(id) { if (!S || S.done || S.over) return; S.picked[id] = !S.picked[id]; NA.sfx.pop(); render(); }
  function checkMulti(t) {
    var sel = t.items.filter(function (id) { return S.picked[id]; });
    var ok = sel.length === t.answer.length && sel.every(function (id) { return t.answer.indexOf(id) >= 0; });
    S.showRes = true;
    if (ok) return right();
    wrong(t.why);
  }

  /* sort */
  function setSort(i, v) { if (!S || S.done || S.over) return; S.sorted[i] = v; delete S.bad[i]; NA.sfx.pop(); render(); }
  function checkSort(t) {
    var miss = t.items.filter(function (it, i) { return S.sorted[i] == null; }).length;
    if (miss) { S.msg = { cls: 'no', who: '아직 덜 골랐다', t: miss + '개 항목이 남았다. 모두 고른 뒤 제출하자.' }; NA.sfx.bad(); return render(); }
    var errs = [], bad = {};
    t.items.forEach(function (it, i) { if (S.sorted[i] !== it[2]) { bad[i] = 1; errs.push('<b>' + it[0] + '</b>: ' + (it[2] ? '👁️ 보인다. ' : '🔒 암호화. ') + it[3]); } });
    S.bad = bad;
    if (errs.length) return wrong('<ul>' + errs.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul>');
    right();
  }

  /* cert */
  function decide(k) {
    var t = task(); if (!S || S.done || S.over || t.type !== 'cert' || S.x[k]) return;
    S.stamp = k === 'pass' ? 'pass' : 'deny';
    if (k === t.answer) { S.picked[k] = 'right'; NA.sfx.tone(160, .12, 'triangle', .3, .5); return right(); }
    S.x[k] = true;
    var why = k === 'pass' ? CERT_WHY.pass : CERT_WHY[k];
    wrong(why + (t.extra && k !== 'pass' ? '' : ''));
  }

  /* ------------------------------------------------------------ 결산 */
  function debrief(win) {
    var stars = !win ? 0 : S.hearts >= 5 ? 3 : S.hearts >= 3 ? 2 : 1;
    NA.ui.debrief({
      overlay: ov, gameId: GAME_ID, stage: S.si, win: win, stars: stars, score: S.hearts * 20,
      title: win ? '의뢰 완료!' : '오늘은 문을 닫는다',
      sub: win ? '의뢰 ' + S.cfg.tasks.length + '건 처리. 남은 신뢰도 ' + S.hearts + '/5.' : '신뢰도가 바닥났다. 해설을 보고 다시 해 보자.',
      stats: [['남은 신뢰도', S.hearts + '/5'], ['한 번에 성공', S.st.firstTry + '/' + S.cfg.tasks.length], ['다시 하기', S.st.wrong]],
      qc: S.cfg.qc, playNotes: S.cfg.note,
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
      howto: '<b>공방</b>에서 HTTP 메시지를 조립하고 요청을 다루며, <b>검문소</b>에서 HTTPS와 인증서, 서버의 문(bind)을 심사한다. 시간 제한 없음.<br>' +
        '스테이지마다 의뢰서 몇 장. 틀리면 신뢰도 −1(5칸), 해설을 보고 그 자리에서 다시.<br>' +
        '단축키 <span class="key">Enter</span> 제출/다음 · <span class="key">1</span>~<span class="key">9</span> 선택'
    });
  }

  /* ------------------------------------------------------------ 렌더 */
  function render() {
    if (!S) return;
    var t = task(), c = S.cfg;
    var h = ''; for (var k = 0; k < 5; k++) h += k < S.hearts ? '♥' : '<i>♥</i>';
    var prog = c.tasks.map(function (x, i) { return '<i class="' + (i < S.ti || (i === S.ti && S.done) ? 'done' : i === S.ti ? 'cur' : '') + '"></i>'; }).join('');
    var html = '<div class="hud"><span class="t">STAGE ' + (S.si + 1) + ' · ' + esc(c.title) + '</span><span class="hearts">' + h + '</span>' +
      '<span class="cnt">의뢰 ' + (S.ti + 1) + ' / ' + c.tasks.length + '</span><span class="prog">' + prog + '</span><span class="sp"></span><button class="na-btn" data-guide>규칙</button></div>';
    html += '<div class="main"><div class="work"><div class="ticket"><span class="no">의뢰서 #' + (S.ti + 1) + '</span><h3>' + esc(t.title) + '</h3><p>' + (t.prompt || promptOf(t)) + '</p></div>' +
      '<div class="wbody">' + bodyHTML(t) + '</div><div class="bar">' + barHTML(t) + '</div></div>' +
      '<div class="side"><div class="coach' + (S.msg.cls ? ' ' + S.msg.cls : '') + '"><span class="who">' + S.msg.who + '</span>' + S.msg.t + '</div>' + sideExtra(t) + '</div></div>';
    app.innerHTML = html;
    bind();
  }
  function promptOf(t) {
    if (t.type === 'choice') return '요청을 보냈는데 문제가 생겼다.';
    if (t.type === 'multi' && t.vis === 'lanes') return t.pd;
    if (t.type === 'multi' && t.vis === 'bind') return t.cloud ? '클라우드 VM에서 서버를 띄웠다.' : '내 노트북(192.168.0.10)에서 FastAPI를 띄웠다.';
    if (t.type === 'cert') return '서버가 인증서를 내밀었다. 네 항목을 심사하자.';
    return '';
  }
  function crlf(on) { return on ? '<span class="crlf">\\r\\n</span>' : ''; }
  function bodyHTML(t) {
    if (t.type === 'assemble') {
      var bl = t.blocks;
      var lines = S.seq.map(function (id, i) {
        var b = bl[id], txt = b.k === 'blank' ? '' : esc(b.t);
        return '<div class="ln k-' + b.k + (S.bad[i] ? ' bad' : '') + '" data-rm="' + i + '"><span class="n">' + (i + 1) + '</span>' + (b.k === 'blank' ? '<span>(빈 줄)</span>' : '<span>' + txt + '</span>') + crlf(b.k !== 'body') + '</div>';
      }).join('');
      if (!S.seq.length) lines = '<div class="ln ph"><span class="n">1</span>여기에 블록이 쌓인다</div>';
      var tray = t.tray.map(function (id, i) {
        var b = bl[id];
        return '<button class="blk k-' + b.k + (S.seq.indexOf(id) >= 0 ? ' used' : '') + '" data-add="' + id + '" title="' + esc(b.t) + '">' + (i + 1) + '. ' + esc(b.t) + '</button>';
      }).join('');
      return '<div class="asm"><div class="msgbox"><span class="lbl">조립 중인 메시지 · 줄을 끌어 순서 바꾸기 · 상자로 끌면 빠짐</span>' + lines + '</div>' +
        '<div class="tray"><span class="lbl">블록 상자 · 끌어다 놓거나 눌러서 붙이기</span>' + tray + '<div class="legend"><span class="s">시작줄</span><span class="h">헤더</span><span class="b">빈 줄</span><span class="d">본문</span></div></div></div>';
    }
    if (t.type === 'pickline') {
      return '<div class="q">' + esc(t.q) + '</div><div class="msgbox pick">' + t.lines.map(function (l, i) {
        var cls = 'ln' + (S.x[i] ? ' bad' : '') + (S.picked[i] === 'right' ? ' right' : '') + (l[0] === '' ? ' k-blank' : '');
        return '<div class="' + cls + '" data-line="' + i + '"><span class="n">' + (i + 1) + '</span><span>' + (l[0] === '' ? '(빈 줄)' : esc(l[0])) + '</span>' + crlf(l[1]) + '</div>';
      }).join('') + '</div><div class="lbl">\\r\\n = 줄 끝(CRLF). \\r\\n가 없는 줄은 바로 다음 바이트와 이어져 있다.</div>';
    }
    if (t.type === 'choice') {
      var req = esc(t.req).replace(/^(GET|POST|PUT|DELETE|PATCH)/, '<span class="m">$1</span>');
      var led = '';
      if (t.ledger) {
        var rows = S.res || t.ledger.map(function (r) { return [r, '']; });
        led = '<div class="ledger"><h4>📒 서버 장부' + (S.res ? ' (결과)' : ' (지금)') + '</h4>' + rows.map(function (r) { return '<div class="r ' + r[1] + '">' + esc(r[0]) + '</div>'; }).join('') + '</div>';
      }
      return '<div class="ch"><div><pre class="req">' + req + '</pre><div class="event">' + esc(t.event) + '</div></div>' + (led || '<div></div>') + '</div>' +
        '<div class="q">' + t.q + '</div><div class="opts">' + S.opts.map(function (o, i) {
          return '<button class="opt' + (S.x[i] ? ' x' : '') + (S.picked[i] === 'right' ? ' right' : '') + '" data-opt="' + i + '"><span class="n">' + (i + 1) + '</span>' + esc(o.t) + '</button>';
        }).join('') + '</div>';
    }
    if (t.type === 'multi' && t.vis === 'lanes') {
      var pk = t.wire.split(' ');
      var wire = '<div class="wire"><span class="lb">' + (t.lost != null ? '보낸 순서 →' : '응답이 나가는 순서 →') + '</span>' + pk.map(function (p, i) {
        return '<span class="pkt ' + (i === t.lost ? 'lost' : p[0]) + (t.slow && p[0] === t.slow ? ' slow' : '') + '">' + (i === t.lost ? '💥' + p : p) + '</span>';
      }).join('') + '</div>';
      var conn = '<div class="conns">' + (t.proto === 'HTTP/1.1' ? '<div class="conn"><b>TCP 연결 1개</b> · 응답은 요청 순서대로 한 줄로</div>' : t.proto === 'HTTP/2' ? '<div class="conn"><b>TCP 연결 1개</b> · 스트림 3개를 프레임으로 섞음 · TCP는 바이트 순서대로만 앱에 전달</div>' : '<div class="conn"><b>QUIC 연결 1개</b> (UDP 위) · 스트림마다 순서·재전송을 따로</div>') + '</div>';
      var st = '<div class="streams">' + t.items.map(function (id, i) {
        var s = STREAM[id], on = !!S.picked[id], res = '';
        if (S.done || S.showRes && S.done) res = t.answer.indexOf(id) >= 0 ? ' res-wait' : ' res-go';
        var lab = S.done ? (t.answer.indexOf(id) >= 0 ? '⏳ 기다린다' : '✓ 바로 전달') : on ? '⏳ 기다린다 (선택됨)' : '눌러서 선택';
        return '<button class="stream' + (on ? ' on' : '') + res + '" data-tg="' + id + '"><span class="ic">' + s.ic + '</span><span class="nm">' + (i + 1) + '. ' + s.nm + '</span><span class="st">' + lab + '</span></button>';
      }).join('') + '</div>';
      return '<div class="lanes"><div class="proto"><span class="tag">' + t.proto + '</span></div>' + conn + wire + '<div class="event">' + esc(t.note) + '</div><div class="q">' + esc(t.q) + '</div>' + st + '</div>';
    }
    if (t.type === 'multi' && t.vis === 'bind') {
      var P = t.cloud ? PARTY_CLOUD : PARTY;
      var cfg = '<div class="cfg">' + t.cfg.map(function (r) { return '<div><span class="k">' + esc(r[0]) + '</span><span class="v">' + esc(r[1]) + '</span></div>'; }).join('') + '</div>';
      var zones = '<div class="zones">' + t.items.map(function (id, i) {
        var p = P[id], on = !!S.picked[id], res = S.done ? (t.answer.indexOf(id) >= 0 ? ' res-go' : ' res-wait') : '';
        var lab = S.done ? (t.answer.indexOf(id) >= 0 ? '✓ 접속된다' : '✗ 막힌다') : on ? '✓ 접속된다 (선택됨)' : '눌러서 선택';
        return '<div class="zone"><span class="zn">' + esc(p.zn) + '</span><button class="stream' + (on ? ' on' : '') + res + '" data-tg="' + id + '"><span class="ic">' + p.ic + '</span><span class="nm">' + (i + 1) + '. ' + esc(p.nm) + '</span><span class="st">' + lab + '</span></button></div>';
      }).join('') + '</div>';
      var path = t.cloud ? '🌍 인터넷 → 🛡️ 보안 그룹 → 🖥️ VM(서버 프로세스)' : '🌍 인터넷 → 📡 공유기(공인 IP, NAT) → 🧱 PC 방화벽 → 💻 서버 프로세스';
      return '<div class="lbl">서버 설정</div>' + cfg + '<div class="scope">경로: <b>' + path + '</b></div><div class="q">' + esc(t.q) + '</div>' + zones;
    }
    if (t.type === 'sort') {
      return '<div class="scope">🔭 엿보는 대상: <b>' + esc(t.scope) + '</b></div><div class="sort">' + t.items.map(function (it, i) {
        var v = S.sorted[i], cls = 'it' + (S.bad[i] ? ' bad' : '') + (S.done ? ' good' : '');
        return '<div class="' + cls + '"><span class="tx">' + esc(it[0]) + '<small>' + esc(it[1]) + '</small></span>' +
          '<button class="see' + (v === 1 ? ' on' : '') + '" data-sort="' + i + ':1">👁️ 보임</button><button class="lock' + (v === 0 ? ' on' : '') + '" data-sort="' + i + ':0">🔒 암호</button></div>';
      }).join('') + '</div>';
    }
    if (t.type === 'cert') {
      var rows = [['발급 대상 (SAN)', t.san], ['유효기간', t.from + ' ~ ' + t.to], ['인증서 체인', '<span class="chain">' + t.chain.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('<span class="arrow">→</span>') + '</span>'], ['폐기 확인 (OCSP)', t.rev]];
      (t.extra || []).forEach(function (r) { rows.push([r[0], r[1], 1]); });
      var stamp = S.stamp ? '<div class="stamp ' + S.stamp + '">' + (S.stamp === 'pass' ? '통과' : '거부') + '</div>' : '';
      return '<div><div class="browser">🔒<span class="url">' + esc(t.url) + '</span><span class="today">오늘 2026-10-17</span></div>' +
        '<div class="cert">' + rows.map(function (r) { return '<span class="k">' + esc(r[0]) + '</span><span class="v' + (r[2] ? ' dim' : '') + '">' + (r[0] === '인증서 체인' ? r[1] : esc(r[1])) + '</span>'; }).join('') + '</div></div>' +
        '<div class="decide">' + DECIDE.map(function (d, i) {
          return '<button class="' + (d[0] === 'pass' ? 'pass' : 'deny') + (S.x[d[0]] ? ' x' : '') + (S.picked[d[0]] === 'right' ? ' right' : '') + '" data-dec="' + d[0] + '">' + (i + 1) + '. ' + d[1] + '</button>';
        }).join('') + '</div>' + stamp;
    }
    return '';
  }
  function barHTML(t) {
    if (S.done) return '<button class="na-btn primary" data-next>' + (S.ti + 1 < S.cfg.tasks.length ? '다음 의뢰 ▶ (Enter)' : '결산 보기 (Enter)') + '</button><span class="sp"></span><span class="info">✓ 의뢰 완료</span>';
    if (t.type === 'assemble') return '<button class="na-btn primary" data-submit' + (S.over ? ' disabled' : '') + '>완성! 보내기 (Enter)</button><button class="na-btn" data-clear>전부 비우기</button><span class="sp"></span><span class="info">블록 ' + S.seq.length + '개</span>';
    if (t.type === 'multi') { var n = t.items.filter(function (id) { return S.picked[id]; }).length; return '<button class="na-btn primary" data-submit' + (S.over ? ' disabled' : '') + '>제출 (Enter)' + (n ? '' : ' · 선택 없음') + '</button><span class="sp"></span><span class="info">' + n + '개 선택</span>'; }
    if (t.type === 'sort') { var m = Object.keys(S.sorted).length; return '<button class="na-btn primary" data-submit' + (S.over ? ' disabled' : '') + '>제출 (Enter)</button><span class="sp"></span><span class="info">' + m + ' / ' + t.items.length + ' 분류</span>'; }
    return '<span class="info">위에서 고르자</span>';
  }
  function sideExtra(t) {
    if (t.type === 'cert') return '<div class="sidebox"><h4>검사 항목</h4><ol><li>도메인: 주소창 이름이 SAN에 있나 (와일드카드 *는 한 단계만)</li><li>유효기간: 시작일 ≤ 오늘 ≤ 만료일</li><li>신뢰 체인: 신뢰 저장소(✓)의 루트 CA까지 서명이 이어지나</li><li>폐기 여부: CA가 폐기하지 않았나</li></ol></div>';
    if (t.type === 'assemble' || t.type === 'pickline') return '<div class="sidebox"><h4>HTTP 메시지 구조</h4>시작줄 \\r\\n<br>헤더: 값 \\r\\n (여러 줄)<br>\\r\\n ← <b style="color:#ffd27a">빈 줄 = 헤더 끝</b><br>본문 (길이 = Content-Length)</div>';
    if (t.type === 'sort') return '<div class="sidebox"><h4>층으로 생각하기</h4>IP 헤더 · TCP 헤더 → 라우터가 읽어야 함<br>TLS ┐ 이 안의 <b style="color:#ffd27a">HTTP 메시지 전체</b>가 암호화<br>그 밖: DNS 질의, TLS 첫 인사(SNI), 크기·시각</div>';
    return '';
  }
  function bind() {
    var all = function (sel, fn) { app.querySelectorAll(sel).forEach(function (e) { e.onclick = function () { fn(e); }; }); };
    dragSetup();
    all('[data-line]', function (e) { pickLine(+e.dataset.line); });
    all('[data-opt]', function (e) { choose(+e.dataset.opt); });
    all('[data-tg]', function (e) { toggle(e.dataset.tg); });
    all('[data-sort]', function (e) { var a = e.dataset.sort.split(':'); setSort(+a[0], +a[1]); });
    all('[data-dec]', function (e) { decide(e.dataset.dec); });
    all('[data-submit]', submit); all('[data-next]', next);
    all('[data-clear]', function () { if (!S.done) { S.seq = []; S.bad = {}; render(); } });
    all('[data-guide]', guide);
  }
  function guide() {
    var back = ov.innerHTML, wasHidden = ov.hidden;
    ov.innerHTML = '<div class="na-card guide"><h2>공방 & 검문소 규칙</h2>' +
      '<h4>HTTP 메시지</h4><p>시작줄 → 헤더 → <b>빈 줄</b> → 본문. 빈 줄이 헤더의 끝, Content-Length가 본문의 끝.</p>' +
      '<h4>멱등</h4><p>여러 번 보내도 서버 상태가 한 번 보낸 것과 같으면 멱등. GET·PUT·DELETE는 멱등, POST는 아니다. POST 재시도에는 멱등 키.</p>' +
      '<h4>HTTP/1.1 · 2 · 3</h4><p>1.1: 한 연결에서 응답이 순서대로(HTTP 계층 HOL). 2: 스트림을 섞어 HTTP 계층 HOL은 해결, 하지만 TCP 하나라 패킷 손실 시 전부 멈춤. 3: QUIC(UDP 위)으로 스트림별 독립.</p>' +
      '<h4>HTTPS</h4><p>암호화: 경로·쿼리·헤더·쿠키·본문·상태 코드. 보임: IP·포트, 도메인(DNS·SNI), 크기·시각.</p>' +
      '<h4>인증서</h4><p>도메인(SAN), 유효기간, 신뢰 루트까지의 체인, 폐기 여부.</p>' +
      '<h4>bind</h4><p>127.0.0.1 = PC 안에서만, 0.0.0.0 = 모든 인터페이스. 인터넷 공개 여부는 NAT·포트포워딩·방화벽·보안 그룹이 정한다.</p>' +
      '<div class="na-row"><button class="na-btn primary" data-close>닫기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-close]').onclick = function () { ov.innerHTML = back; ov.hidden = wasHidden; };
  }

  /* ------------------------------------------------------------ 입력 */
  window.addEventListener('keydown', function (e) {
    if (!S || !ov.hidden || S.over) return;
    var k = e.key, t = task();
    if (k === 'Enter') { e.preventDefault(); return submit(); }
    if (S.done || !/^[1-9]$/.test(k)) return;
    var n = +k - 1;
    if (t.type === 'assemble' && t.tray[n]) asmAdd(t.tray[n]);
    else if (t.type === 'pickline') pickLine(n);
    else if (t.type === 'choice') choose(n);
    else if (t.type === 'multi' && t.items[n]) toggle(t.items[n]);
    else if (t.type === 'cert' && DECIDE[n]) decide(DECIDE[n][0]);
  });

  window.__game = {
    state: function () { return S; }, start: startStage, stages: STAGES,
    add: asmAdd, line: pickLine, choose: choose, toggle: toggle, sort: setSort, decide: decide, submit: submit, next: next,
    solve: function () { // 테스트용: 정답 입력
      var t = task();
      if (t.type === 'assemble') { S.seq = [t.want.start].concat(t.want.headers, ['bl'], t.want.body ? [t.want.body] : []); render(); return 'submit'; }
      if (t.type === 'pickline') return pickLine(t.answer);
      if (t.type === 'choice') return choose(S.opts.findIndex(function (o) { return o.ok; }));
      if (t.type === 'multi') { S.picked = {}; t.answer.forEach(function (id) { S.picked[id] = true; }); render(); return 'submit'; }
      if (t.type === 'sort') { t.items.forEach(function (it, i) { S.sorted[i] = it[2]; }); render(); return 'submit'; }
      if (t.type === 'cert') return decide(t.answer);
    }
  };
  menu();
})();
