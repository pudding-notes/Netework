/* DNS 마을 탐험 — Quick Check W4-1(URL vs Domain), W4-2(재귀·반복 질의), W4-3(캐시와 TTL)
 *
 * 턴제 지도 RPG. 시간 제한 없음(마을 시계는 이동할 때만 흐른다).
 * 나는 리졸버. 의뢰인(브라우저)이 이름을 맡기면(재귀 질의) 장로(root) → 촌장(TLD) → 관리인(권한 서버)을
 * 차례로 찾아가 묻고(반복 질의), 받은 답을 수첩(캐시)에 TTL과 함께 적는다.
 * 모르는 마을은 안개에 가려 갈 수 없다. 수첩에 위치(NS)가 있어야 지도에 나타난다.
 */
(function () {
  var GAME_ID = 'dns-village';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));

  /* ------------------------------------------------------------ 마을 */
  var NODES = {
    client: { x: 95, y: 380, ic: '🏠', n: '의뢰인의 집', sb: '브라우저 · OS (stub)', cls: 'home' },
    office: { x: 95, y: 175, ic: '🏢', n: '리졸버 사무소', sb: '나의 사무소 · 수첩', cls: 'office' },
    root: { x: 470, y: 60, ic: '⛰️', n: '장로의 언덕', sb: '루트 서버 "."', cls: 'root', zone: '', lvl: 0 },
    com: { x: 300, y: 215, ic: '🏛️', n: 'com 마을', sb: 'TLD 서버 .com', zone: 'com', lvl: 1 },
    net: { x: 470, y: 215, ic: '🏛️', n: 'net 마을', sb: 'TLD 서버 .net', zone: 'net', lvl: 1 },
    kr: { x: 640, y: 215, ic: '🏛️', n: 'kr 마을', sb: 'TLD 서버 .kr', zone: 'kr', lvl: 1 },
    excom: { x: 300, y: 380, ic: '🏪', n: 'example.com 집', sb: '권한 서버', zone: 'example.com', lvl: 2 },
    exnet: { x: 470, y: 380, ic: '📝', n: 'example.net 집', sb: '권한 서버', zone: 'example.net', lvl: 2 },
    inu: { x: 640, y: 380, ic: '🎓', n: 'inu.ac.kr 본부', sb: '권한 서버', zone: 'inu.ac.kr', lvl: 2 }
  };
  var ROADS = [['client', 'office'], ['office', 'root'], ['root', 'com'], ['root', 'net'], ['root', 'kr'], ['com', 'excom'], ['net', 'exnet'], ['kr', 'inu']];
  var CAST = {
    me: ['🧑‍💼', '나 (리졸버)'], guide: ['🦉', '선배 부엉'], root: ['👴', '장로 (root)'], com: ['🤵', 'com 촌장'], net: ['👩‍💼', 'net 촌장'], kr: ['🧑‍🌾', 'kr 촌장'],
    excom: ['🧑‍🍳', 'example.com 주인'], exnet: ['✍️', 'example.net 주인'], inu: ['🎓', 'inu.ac.kr 관리인'], client: ['🧒', '의뢰인 (브라우저)'], client2: ['👧', '두 번째 의뢰인'], sys: ['📜', '']
  };
  var A0 = {
    'www.inu.ac.kr': ['203.0.113.20', 600], 'mail.inu.ac.kr': ['203.0.113.25', 600], 'portal.inu.ac.kr': ['203.0.113.21', 600],
    'shop.example.com': ['198.51.100.40', 3600], 'game.example.com': ['198.51.100.50', 300], 'blog.example.net': ['192.0.2.30', 1800]
  };
  var NS_TTL = { 1: 172800, 2: 86400 }; // TLD 위임 2일, 권한 서버 위임 1일

  /* ------------------------------------------------------------ 스테이지 */
  function L(who, t) { return [who, t]; }
  var STAGES = [
    { title: '주소 자르기', desc: 'URL에서 DNS가 아는 건 어느 조각일까? 첫 조회를 선배와 함께.', qc: ['W4-1'], coach: true, t0: 9 * 3600,
      brief: '나는 마을의 <b>리졸버</b>. 의뢰인(브라우저)이 이름을 맡기면 <b>IP 주소</b>를 찾아다 준다. 시간 제한은 없다.<br>' +
        '먼저 의뢰서의 <b>URL을 조각내서</b> DNS에게 물어볼 조각만 골라야 한다. 조각은 끌어다 상자에 놓는다.<br>' +
        '그다음 지도에서 마을을 눌러 이동하며 길을 묻는다. 안개 낀 마을은 위치를 알아야 갈 수 있다.',
      steps: [
        { t: 'talk', lines: [L('guide', '어서 와, 신입 리졸버! 나는 선배 부엉이야. 우리 일은 <b>이름 → IP 주소</b>를 찾아 주는 거야.'), L('guide', '첫 의뢰서가 왔어. 브라우저는 URL을 통째로 들고 오지만, <b>DNS가 다루는 건 그중 한 조각뿐</b>이야. 잘라 보자!')] },
        { t: 'cut', url: [['https', 'scheme'], ['://', null], ['www.inu.ac.kr', 'host'], ['/portal/notice', 'path'], ['?page=2', 'query'], ['#top', 'frag']],
          coach: '조각을 끌어다 알맞은 상자에 놓자(눌러서 고른 뒤 상자를 눌러도 된다).' },
        { t: 'talk', lines: [L('guide', '잘했어. <b>DNS는 host(www.inu.ac.kr)만</b> 알아. 경로와 쿼리는 서버에게 가는 HTTP 요청 안에 들어가고, #fragment는 어디로도 보내지 않아.'), L('guide', '이제 진짜 조회를 해 보자. 의뢰인의 집에서 의뢰를 받아 올게.')] },
        { t: 'look', name: 'www.inu.ac.kr', who: 'client', ask: '포털 공지 좀 보려는데, <b>www.inu.ac.kr</b>의 IP 주소를 알아다 줘. 과정은 몰라도 돼. <b>최종 답만</b> 줘!' },
        { t: 'cut', url: [['http', 'scheme'], ['://', null], ['game.example.com', 'host'], [':8080', 'port'], ['/rank', 'path'], ['?season=3', 'query'], ['#me', 'frag']],
          coach: '이번엔 <b>포트(:8080)</b>도 붙어 있다. 포트는 DNS가 알려 주는 정보일까?' },
        { t: 'quiz', who: 'guide', q: '의뢰인이 DNS에게 "www.inu.ac.kr/portal/notice"를 통째로 물어본다면?', o: [
          { t: 'DNS가 경로까지 보고 공지 페이지가 있는 서버 IP를 골라 준다', why: 'DNS는 이름(host)만 다룬다. 경로마다 다른 서버를 고르는 건 DNS가 아니라 서버(또는 그 앞의 프록시)의 일이다.' },
          { t: 'DNS는 host만 다룬다. 경로는 IP를 받은 뒤 서버에게 HTTP로 보낸다', ok: true },
          { t: 'DNS가 경로를 서버에게 대신 전달해 준다', why: 'DNS는 아무것도 전달하지 않는다. 주소(IP)만 알려 준다.' }],
          ok: 'URL = scheme + host + port + path + query + fragment. 그중 DNS가 아는 건 <b>host</b>뿐.' },
        { t: 'look', name: 'game.example.com', who: 'client', ask: '이번엔 <b>game.example.com</b>! 랭킹 보러 가야 해.' }
      ],
      note: { 'W4-1': 'URL을 조각내 보니 DNS에게 가는 건 host뿐이었다. port·path·query는 서버와의 연결·HTTP 요청에, scheme·#fragment는 브라우저만 썼다.' } },

    { title: '길 묻기', desc: '의뢰인은 "답만 줘"(재귀), 장로와 촌장은 "저기 가 보게"(반복).', qc: ['W4-2'], t0: 13 * 3600,
      brief: '질의에는 두 종류가 있다.<br>' +
        '<b>재귀 질의</b>: "최종 답을 가져와." 의뢰인(브라우저·OS) → 리졸버.<br>' +
        '<b>반복 질의</b>: "모르면 다음에 물어볼 곳이라도 알려 줘." 리졸버 → 장로(root)·촌장(TLD)·관리인(권한 서버).<br>' +
        '이번엔 선배 안내 없이 조회한다. 엉뚱한 마을에 가면 신뢰도 −1.',
      steps: [
        { t: 'look', name: 'blog.example.net', who: 'client', ask: '<b>blog.example.net</b> 주소 부탁해. 결과만 알려 주면 돼!' },
        { t: 'quiz', who: 'guide', q: '방금 의뢰인이 나에게 한 질의는 어떤 종류일까?', o: [
          { t: '반복 질의: "모르면 다음에 물어볼 곳을 알려 줘"', why: '의뢰인은 다음 행선지가 아니라 최종 IP를 원했다.' },
          { t: '재귀 질의: "최종 답(IP)을 가져와"', ok: true },
          { t: '역방향 질의: "IP로 이름을 알려 줘"', why: '의뢰인은 이름으로 IP를 물었다.' }],
          ok: '브라우저·OS의 작은 리졸버(stub)는 <b>재귀 질의</b>로 맡기고 기다리기만 한다.' },
        { t: 'look', name: 'www.inu.ac.kr', who: 'client2', ask: '나는 <b>www.inu.ac.kr</b>! 수강신청 공지 봐야 해.' },
        { t: 'quiz', who: 'guide', q: '장로(root)는 왜 kr 마을에 대신 물어봐 주지 않고 "저기 가 보게"라고만 할까?', o: [
          { t: '장로는 kr 마을의 위치를 몰라서', why: '장로는 kr 마을의 위치(NS와 그 주소)를 정확히 알려 줬다.' },
          { t: '전 세계의 질의가 장로에게 몰린다. 끝까지 찾아 주면 감당할 수 없으니 다음 행선지(위임)만 알려 준다', ok: true },
          { t: '장로는 보안 때문에 답을 숨겨야 해서', why: '숨기는 게 아니다. 자기 소관(TLD 위임)까지만 답하는 구조다.' }],
          ok: 'root·TLD는 <b>반복 응답</b>(위임)만 한다. 그걸 따라다니며 끝까지 찾는 게 리졸버의 일.' },
        { t: 'look', name: 'shop.example.com', who: 'client', ask: '<b>shop.example.com</b>에서 장 좀 보려고. 주소!' },
        { t: 'quiz', who: 'guide', q: '이번 조회들에서 "반복 질의"는 누구와 누구 사이에서 일어났을까?', o: [
          { t: '의뢰인(브라우저) ↔ 리졸버', why: '그건 재귀 질의다.' },
          { t: '의뢰인(브라우저) ↔ 장로(root)', why: '브라우저는 root에 직접 묻지 않는다. 리졸버에게 맡긴다.' },
          { t: '리졸버 ↔ 장로·촌장·관리인 (root·TLD·권한 서버)', ok: true }],
          ok: '<b>재귀</b>: 클라이언트 ↔ 리졸버. <b>반복</b>: 리졸버 ↔ root·TLD·권한 서버.' }
      ],
      note: { 'W4-2': '의뢰인은 "답만 줘"(재귀)라고 맡겼고, 나는 장로 → 촌장 → 관리인을 차례로 찾아가 "다음에 물어볼 곳"을 받아 가며(반복) 최종 IP를 가져왔다.' } },

    { title: '수첩 활용', desc: '수첩(캐시)에 적힌 답과 위치는 TTL 동안 쓸 수 있다. 헛걸음하면 감점.', qc: ['W4-3'], strict: true, t0: 9 * 3600,
      brief: '받은 답과 마을 위치는 <b>수첩(캐시)</b>에 <b>TTL</b>(유효 시간)과 함께 적힌다. TTL이 남아 있으면 다시 묻지 않고 바로 쓴다.<br>' +
        '마을 시계는 이동할 때마다 <b>1분</b>씩 흐른다. TTL이 다 된 기록은 수첩에서 지워지고, 위치가 지워진 마을은 다시 안개에 가린다.<br>' +
        '이번엔 <b>헛걸음</b>(수첩으로 충분한데 장로부터 다시 묻기)도 신뢰도 −1. 수첩을 보고 <b>가장 가까운 곳</b>부터 묻자.',
      steps: [
        { t: 'look', name: 'www.inu.ac.kr', who: 'client', ask: '<b>www.inu.ac.kr</b> 주소 부탁해. (수첩이 비어 있으니 처음부터!)' },
        { t: 'look', name: 'mail.inu.ac.kr', who: 'client2', ask: '나는 <b>mail.inu.ac.kr</b>. 수첩에 쓸 만한 게 있지 않아?' },
        { t: 'wait', sec: 60, say: '1분 뒤…' },
        { t: 'look', name: 'www.inu.ac.kr', who: 'client', ask: '또 <b>www.inu.ac.kr</b>! 아까 그거.' },
        { t: 'quiz', who: 'guide', q: '수첩(캐시)이 없다면 리졸버는 어떻게 될까?', o: [
          { t: '같은 이름을 물을 때마다 장로부터 다시 찾아가야 해서 느리고, 장로에게 질의가 몰린다', ok: true },
          { t: '아무 문제 없다. 장로가 알아서 기억해 둔다', why: 'root는 리졸버 대신 기억해 주지 않는다. 기억은 리졸버의 수첩 몫이다.' },
          { t: '이름을 아예 찾을 수 없게 된다', why: '찾을 수는 있다. 매번 처음부터 묻느라 느려질 뿐이다.' }],
          ok: '캐시 덕분에 대부분의 조회는 장로까지 가지 않는다.' },
        { t: 'wait', sec: 15 * 60, say: '15분이 지났다. 수첩을 확인하자.' },
        { t: 'look', name: 'www.inu.ac.kr', who: 'client2', ask: '<b>www.inu.ac.kr</b> 한 번 더! 이번엔 수첩에 있을까?' },
        { t: 'look', name: 'game.example.com', who: 'client', ask: '<b>game.example.com</b> 부탁해.' },
        { t: 'look', name: 'blog.example.net', who: 'client2', ask: '<b>blog.example.net</b>도! com 마을은 아는데 net 마을은?' }
      ],
      note: { 'W4-3': '수첩에 A 기록이 살아 있으면 바로 답했고, 마을 위치(NS)만 살아 있으면 장로를 건너뛰었다. TTL(10분)이 지난 www 기록은 지워져 다시 물어야 했다.' } },

    { title: '이사 간 집 사건', desc: 'shop.example.com이 이사했다. 왜 일부 손님만 옛 집으로 갈까?', qc: ['W4-3'], strict: true, t0: 10 * 3600,
      brief: 'example.com 주인이 <b>shop 가게를 새 주소로 이사</b>시킨다. 자기 장부(권한 서버)는 바로 고친다.<br>' +
        '하지만 이미 여러 수첩에 적힌 옛 주소는? <b>TTL이 끝날 때까지</b> 그대로 남는다.<br>' +
        '이번 사건으로 "레코드를 바꿨는데 일부 사용자만 옛 서버로 가는 이유"를 직접 겪어 보자.',
      steps: [
        { t: 'look', name: 'shop.example.com', who: 'client', ask: '<b>shop.example.com</b> 주소! 세일 시작했대.' },
        { t: 'wait', sec: 10 * 60, say: '10분 뒤…' },
        { t: 'set', name: 'shop.example.com', ip: '198.51.100.80' },
        { t: 'talk', lines: [L('excom', '안녕하세요, example.com 주인이에요. 방금 <b>shop 가게를 198.51.100.80으로 이사</b>했어요! 제 장부(권한 서버)도 고쳤고요.'), L('excom', '그런데 리졸버님들께 일일이 알릴 방법은 없네요… 다들 알아서 아시겠죠?')] },
        { t: 'quiz', who: 'guide', q: '수첩의 shop.example.com → 198.51.100.40 기록은 TTL이 아직 40분 넘게 남아 있다. 지금 다른 의뢰인이 shop을 물으면 리졸버는?', o: [
          { t: '이사 소식이 자동으로 전파되니 새 주소(.80)로 답한다', why: 'DNS에는 변경을 리졸버에게 알려 주는 방송이 없다. 리졸버는 이사 사실을 모른다.' },
          { t: '수첩의 옛 주소(.40)로 답한다. TTL이 끝날 때까지 그 기록을 믿는다', ok: true },
          { t: '수첩의 기록을 버리고 매번 주인에게 새로 묻는다', why: '그러면 캐시가 의미가 없다. 리졸버는 TTL 동안 기록을 그대로 쓴다.' }],
          ok: '리졸버는 TTL을 믿는다. 바뀐 걸 알 방법이 없다.' },
        { t: 'look', name: 'shop.example.com', who: 'client2', ask: '나도 <b>shop.example.com</b>! 세일 끝나기 전에!' },
        { t: 'talk', lines: [L('client2', '어…? 198.51.100.40으로 갔더니 <b>"이 가게는 이사했습니다"</b>라고 붙어 있어! 옆집 친구는 새 가게에 잘 들어갔다던데?'), L('guide', '친구는 다른 리졸버를 쓰거나, 그 리졸버의 수첩엔 기록이 없어서 새로 물었겠지. <b>누구의 수첩에 옛 기록이 남아 있느냐</b>에 따라 갈린 거야.')] },
        { t: 'quiz', who: 'guide', q: 'DNS 레코드를 바꿨는데 일부 사용자만 옛 서버로 가는 이유는?', o: [
          { t: '리졸버·OS·브라우저의 캐시에 옛 기록이 TTL 동안 남아 있어서', ok: true },
          { t: 'DNS 변경은 나라별로 정해진 순서대로 전파돼서', why: '정해진 전파 순서 같은 건 없다. 각자의 캐시가 언제 만료되느냐의 차이다.' },
          { t: '새 서버가 부하를 나누려고 일부만 받아서', why: 'DNS가 자동으로 손님을 나눈 게 아니다. 옛 주소를 들고 있는 캐시 때문이다.' }],
          ok: '흔히 "DNS 전파"라고 부르지만 실제로는 <b>캐시 만료를 기다리는 시간</b>이다.' },
        { t: 'wait', sec: 60 * 60, say: '한 시간이 지났다.' },
        { t: 'look', name: 'shop.example.com', who: 'client2', ask: '다시 <b>shop.example.com</b>. 이번엔 새 가게로 가고 싶어!' },
        { t: 'quiz', who: 'excom', q: '다음에 또 이사할 때 example.com 주인은 무엇을 미리 해야 할까?', o: [
          { t: '이사 당일에 TTL을 짧게 바꾼다', why: '이미 수첩에 적힌 옛 기록은 예전의 긴 TTL(1시간)을 그대로 따른다. 미리 낮춰야 한다.' },
          { t: '며칠 전에 TTL을 짧게(예: 60초) 낮춰 두고, 이사가 끝나면 다시 늘린다', ok: true },
          { t: '권한 서버를 재시작한다', why: '리졸버들의 수첩은 그대로다. 재시작해도 캐시는 지워지지 않는다.' }],
          ok: '서버 이전 전에는 <b>TTL을 미리 낮춰 두는 것</b>이 정석이다.' },
        { t: 'quiz', who: 'client', q: '리졸버 수첩을 비웠는데도 내 PC에서만 아직 옛 주소가 나온다면?', o: [
          { t: 'OS나 브라우저에도 각자의 캐시가 있어 아직 TTL이 남아 있다', ok: true },
          { t: '권한 서버가 내 PC에만 옛 주소를 준다', why: '권한 서버는 이미 새 주소를 답하고 있다.' },
          { t: '내 PC의 IP가 바뀌어서', why: '내 IP와는 상관없다. 이름 → IP 기록이 어딘가에 남아 있는 것이다.' }],
          ok: '캐시는 <b>브라우저 · OS · 리졸버</b> 세 겹이다. 각자 TTL 동안 기억한다.' }
      ],
      note: { 'W4-3': '주인이 shop을 .80으로 옮겼지만 내 수첩의 .40 기록은 TTL(1시간) 동안 그대로 쓰였고, 그 사이 의뢰인은 옛 가게로 갔다. TTL이 끝난 뒤에야 새 주소를 받았다.' } }
  ];

  /* URL 조각 상자 */
  var BINS = [
    { id: 'dns', h: '🏘️ DNS에게 묻는다', p: '이름 → IP로 바꿀 조각' },
    { id: 'srv', h: '🖥️ 서버에게 간다', p: '연결하거나 HTTP 요청에 담는 조각' },
    { id: 'brw', h: '🧭 브라우저만 쓴다', p: '어디로도 보내지 않는 조각' }
  ];
  var SEG = {
    scheme: { bin: 'brw', nm: 'scheme', why: 'scheme(https)은 브라우저가 어떤 프로토콜·기본 포트로 접속할지 정하는 데 쓴다. DNS에 묻지도, 요청에 그대로 보내지도 않는다.' },
    host: { bin: 'dns', nm: 'host', why: 'host(도메인)가 바로 DNS에게 물어볼 이름이다. (연결한 뒤엔 Host 헤더로 서버에게도 알려 준다.)' },
    port: { bin: 'srv', nm: 'port', why: '포트는 DNS가 알려 주지 않는다. 받은 IP의 몇 번 문으로 접속할지 브라우저가 정해 TCP 연결에 쓴다.' },
    path: { bin: 'srv', nm: 'path', why: '경로는 HTTP 요청 시작줄에 담겨 서버로 간다. DNS는 모른다.' },
    query: { bin: 'srv', nm: 'query', why: '쿼리도 경로와 함께 HTTP 요청에 담겨 서버로 간다.' },
    frag: { bin: 'brw', nm: 'fragment', why: '#fragment는 서버로도 보내지 않는다. 브라우저가 페이지 안 위치로 이동할 때만 쓴다.' }
  };

  /* ------------------------------------------------------------ 상태 */
  var S = null;
  function newState(si) {
    var cfg = STAGES[si], A = {};
    for (var k in A0) A[k] = A0[k].slice();
    return { si: si, cfg: cfg, A: A, t: cfg.t0, hearts: 5, at: 'office', nb: [], gone: [], si2: -1, mode: 'idle', q: [], qi: 0,
      lk: null, msg: null, panel: null, st: { wrong: 0, waste: 0, trips: 0, cache: 0, looks: 0 }, over: false, newNode: null, newRow: null };
  }
  function fmt(t) { var h = Math.floor(t / 3600) % 24, m = Math.floor(t / 60) % 60; return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function dur(s) {
    if (s >= 86400) return Math.floor(s / 86400) + '일 ' + Math.floor(s % 86400 / 3600) + '시간';
    if (s >= 3600) return Math.floor(s / 3600) + '시간 ' + Math.floor(s % 3600 / 60) + '분';
    return Math.floor(s / 60) + '분' + (s % 60 ? ' ' + (s % 60) + '초' : '');
  }

  /* ------------------------------------------------------------ 수첩 */
  function nbValid(kind, key) { for (var i = 0; i < S.nb.length; i++) { var r = S.nb[i]; if (r.kind === kind && r.key === key && r.exp > S.t) return r; } return null; }
  function nbPut(kind, key, val, ttl, node) {
    S.nb = S.nb.filter(function (r) { return !(r.kind === kind && r.key === key); });
    S.nb.push({ kind: kind, key: key, val: val, ttl: ttl, exp: S.t + ttl, node: node });
    S.newRow = kind + key;
  }
  function advance(sec) {
    S.t += sec;
    var gone = S.nb.filter(function (r) { return r.exp <= S.t; });
    S.nb = S.nb.filter(function (r) { return r.exp > S.t; });
    if (gone.length) S.gone = gone.map(function (r) { return r.kind === 'A' ? r.key + ' (주소)' : r.key + ' 마을 위치'; });
    return gone;
  }
  function visible(id) {
    var n = NODES[id];
    if (!n.lvl) return true; // 사무소, 의뢰인, root는 언제나
    return !!nbValid('NS', n.zone);
  }
  function tldOf(name) { var p = name.split('.'); return p[p.length - 1]; }
  function authOf(name) { var ids = ['excom', 'exnet', 'inu']; for (var i = 0; i < ids.length; i++) { var z = NODES[ids[i]].zone; if (name === z || name.slice(-z.length - 1) === '.' + z) return ids[i]; } return null; }
  function nodeOfZone(z) { for (var id in NODES) if (NODES[id].zone === z && NODES[id].lvl) return id; return null; }
  function best(name) { // 수첩 기준으로 가장 가까운 출발점
    if (nbValid('A', name)) return 'cache';
    var au = authOf(name); if (au && nbValid('NS', NODES[au].zone)) return au;
    if (nbValid('NS', tldOf(name))) return nodeOfZone(tldOf(name));
    return 'root';
  }
  function rank(x) { return x === 'cache' ? 3 : x === 'root' ? 0 : NODES[x].lvl; }

  /* ------------------------------------------------------------ 진행 */
  function startStage(si) {
    S = newState(si);
    NA.ui.briefing(ov, 'STAGE ' + (si + 1) + ' · ' + S.cfg.title, S.cfg.brief, function () { render(); nextStep(); });
  }
  function nextStep() {
    if (S.over) return;
    S.si2++;
    var st = S.cfg.steps[S.si2];
    S.panel = null; S.lk = null;
    if (!st) return finish();
    S.step = st;
    if (st.t === 'talk') talk(st.lines, nextStep);
    else if (st.t === 'quiz') { S.mode = 'quiz'; S.panel = { kind: 'quiz', st: st, x: {}, opts: NA.shuffle(st.o.slice()) }; S.msg = [st.who, '지도 위의 질문에 답하자. (숫자 키 1~3)']; render(); }
    else if (st.t === 'cut') { S.mode = 'cut'; S.panel = { kind: 'cut', st: st, put: {}, sel: null, bad: {} }; S.msg = ['guide', st.coach]; render(); }
    else if (st.t === 'wait') { var gone = advance(st.sec); render(); clockFx(); talk([L('sys', '⏳ ' + st.say + (gone.length ? '<br>수첩에서 TTL이 끝난 기록이 지워졌다: <b>' + gone.map(function (r) { return r.kind === 'A' ? r.key : r.key + ' 마을 위치'; }).join(', ') + '</b>' : ''))], nextStep); }
    else if (st.t === 'set') { S.A[st.name][0] = st.ip; nextStep(); }
    else if (st.t === 'look') startLook(st);
  }
  function startLook(st) {
    S.st.looks++;
    S.lk = { name: st.name, who: st.who, ans: null, fromCache: false, done: false, t0: S.t };
    moveTo('client', 0, function () {
      talk([L(st.who, st.ask)], function () {
        S.mode = 'map';
        S.msg = ['me', '사무소(🏢)로 돌아가 <b>수첩</b>부터 확인하자.'];
        if (S.cfg.coach && S.lk.name === 'www.inu.ac.kr') S.msg = ['guide', '먼저 <b>리졸버 사무소(🏢)</b>를 눌러 돌아가자. 수첩에 답이 있는지 봐야 하거든.'];
        render();
      });
    });
  }

  /* ------------------------------------------------------------ 대화 */
  function talk(lines, then) { S.mode = 'talk'; S.q = lines; S.qi = 0; S.then = then; S.msg = lines[0]; render(); }
  function advanceTalk() {
    if (!S || S.mode !== 'talk') return;
    S.qi++;
    if (S.qi >= S.q.length) { var t = S.then; S.then = null; S.mode = 'idle'; return t && t(); }
    S.msg = S.q[S.qi]; NA.sfx.tick(); render();
  }

  /* ------------------------------------------------------------ 이동 */
  function moveTo(id, cost, done) {
    S.mode = 'moving'; var from = S.at; S.at = id;
    if (cost) { var gone = advance(cost); if (gone.length) S.goneFlash = true; }
    render();
    var tk = app.querySelector('.token'); if (tk) tk.classList.add('walk');
    if (from !== id) NA.sfx.tone(440, .06, 'triangle', .1);
    var me = S;
    setTimeout(function () { if (S !== me) return; var t2 = app.querySelector('.token'); if (t2) t2.classList.remove('walk'); done(); }, from === id ? 10 : 600);
  }
  function go(id) {
    if (!S || S.mode !== 'map' || !S.lk) return;
    if (id === S.at) return;
    if (!visible(id)) { S.msg = ['me', '안개에 가려 있다. 그 마을의 <b>위치(NS)</b>를 아직 모른다. 위치를 알려 줄 곳부터 찾아가자.']; NA.sfx.bad(); return render(); }
    S.st.trips++;
    moveTo(id, 60, function () { arrive(id); });
  }
  function arrive(id) {
    var lk = S.lk, name = lk.name;
    if (id === 'client') {
      if (!lk.ans) { S.mode = 'map'; S.msg = [lk.who, '어? 아직 주소를 못 찾았어? 기다릴게!']; return render(); }
      lk.done = true;
      var t = S.t - lk.t0;
      return talk([L(lk.who, '고마워! <b>' + name + ' = ' + lk.ans + '</b>' + (lk.fromCache ? ' (수첩에서 바로!)' : '') + ' 이제 접속하러 간다!'),
        L('sys', '🏁 조회 완료 · 걸린 시간 ' + dur(t) + (lk.fromCache ? ' · 수첩 덕분에 장로에게 가지 않았다' : ''))], function () { NA.sfx.good(); nextStep(); });
    }
    if (id === 'office') {
      S.mode = 'map';
      var a = nbValid('A', name);
      if (lk.ans) S.msg = ['me', '답은 이미 들고 있다. 의뢰인의 집(🏠)으로 가자.'];
      else if (a) S.msg = ['guide', '수첩에 <b>' + name + ' → ' + a.val + '</b>가 있다! TTL ' + dur(a.exp - S.t) + ' 남음. 오른쪽 아래 <b>[수첩의 답 쓰기]</b>를 누르자.'];
      else {
        var b = best(name);
        var hint = S.cfg.coach ? (b === 'root' ? '수첩이 비었다. 모든 조회는 <b>장로의 언덕(⛰️ root)</b>에서 시작한다. 눌러서 가자.' : '수첩에 <b>' + NODES[b].n + '</b> 위치가 있다! 장로를 건너뛰고 바로 가자.') : '수첩에 ' + name + ' 주소는 없다. 어디부터 물어볼까?';
        S.msg = [S.cfg.coach ? 'guide' : 'me', hint];
      }
      return render();
    }
    // 서버 마을
    var n = NODES[id];
    if (lk.ans) { return penalty(n, '답은 이미 들고 있다. 서버를 더 찾아갈 필요가 없다. 의뢰인에게 가져가자.', true); }
    var helps = n.lvl === 0 || (n.lvl === 1 && tldOf(name) === n.zone) || (n.lvl === 2 && authOf(name) === id);
    if (!helps) {
      S.st.wrong++;
      var who = id;
      return damage(L(who, '"' + name + '"? 그 이름은 ' + (n.lvl === 1 ? '<b>.' + n.zone + '</b> 소관이 아니네.' : '내 집 장부에 없네.') + ' 이름을 <b>오른쪽 끝(TLD)부터</b> 읽어 보게.'));
    }
    var b0 = best(name);
    var wasted = b0 !== id && rank(b0) > n.lvl;
    var lines = [];
    if (n.lvl === 0) {
      var tz = tldOf(name), tid = nodeOfZone(tz), was = visible(tid);
      nbPut('NS', tz, NODES[tid].n, NS_TTL[1], tid); if (!was) S.newNode = tid;
      lines.push(L('root', '"' + name + '"이라… 나는 끝까지는 모르네. 하지만 <b>.' + tz + '</b>은 <b>' + NODES[tid].n + '</b> 소관이지. 그 마을 위치를 알려 주겠네. <span class="ok">(반복 응답: 다음에 물어볼 곳)</span>'));
      if (S.cfg.coach) lines.push(L('guide', '지도에 <b>' + NODES[tid].n + '</b>이 나타났지? 수첩에도 위치가 적혔어(TTL 2일). 이제 그 마을을 눌러 가자.'));
    } else if (n.lvl === 1) {
      var aid = authOf(name), az = NODES[aid].zone, was2 = visible(aid);
      nbPut('NS', az, NODES[aid].n, NS_TTL[2], aid); if (!was2) S.newNode = aid;
      lines.push(L(id, '"' + name + '"? 그 집은 <b>' + az + '</b>이 관리하네. ' + (n.zone === 'kr' ? '(ac.kr도 우리 마을에서 함께 관리하지.) ' : '') + '<b>' + NODES[aid].n + '</b> 위치를 알려 주지. <span class="ok">(반복 응답: 위임)</span>'));
      if (S.cfg.coach) lines.push(L('guide', '이제 진짜 주인, <b>권한 서버</b>에게 물어볼 차례야.'));
    } else {
      var rec = S.A[name];
      nbPut('A', name, rec[0], rec[1]);
      lk.ans = rec[0];
      lines.push(L(id, '"' + name + '"? 내 장부에 있지. <b>' + rec[0] + '</b>일세. 이 답은 <b>TTL ' + dur(rec[1]) + '</b> 동안 믿어도 되네. <span class="ok">(최종 답)</span>'));
      if (S.cfg.coach) lines.push(L('guide', '답을 얻었다! 수첩에도 적혔어. 이제 <b>의뢰인의 집(🏠)</b>으로 가져가자.'));
    }
    if (wasted) {
      S.st.waste++;
      var why = b0 === 'cache' ? '수첩에 이 이름의 주소가 살아 있었다.' : '수첩에 <b>' + NODES[b0].n + '</b> 위치가 살아 있었다. 장로를 건너뛸 수 있었다.';
      if (S.cfg.strict) { S.hearts--; S.st.wrong++; NA.sfx.bad(); lines.push(L('guide', '<span class="no">헛걸음! (신뢰도 −1)</span> ' + why)); if (S.hearts <= 0) return lose(lines); }
      else lines.push(L('guide', '참고: ' + why + ' 다음엔 수첩부터 보자.'));
    }
    talk(lines, function () { S.mode = 'map'; S.msg = ['me', lk.ans ? '답을 얻었다. 의뢰인의 집(🏠)으로!' : '다음은 어디로 갈까? 새로 알게 된 곳을 누르자.']; render(); });
  }
  function penalty(n, text, waste) {
    S.st.waste++;
    var lines = [L('me', text)];
    if (S.cfg.strict) { S.hearts--; S.st.wrong++; NA.sfx.bad(); lines.unshift(L('guide', '<span class="no">헛걸음! (신뢰도 −1)</span>')); if (S.hearts <= 0) return lose(lines); }
    talk(lines, function () { S.mode = 'map'; render(); });
  }
  function damage(line) {
    S.hearts--; NA.sfx.bad();
    var lines = [line, L('guide', '<span class="no">엉뚱한 마을! (신뢰도 −1)</span> 이름은 오른쪽부터: <b>' + S.lk.name.split('.').reverse().join(' ← ') + '</b>. 장로 → 그 TLD 마을 → 권한 서버 순서.')];
    if (S.hearts <= 0) return lose(lines);
    talk(lines, function () { S.mode = 'map'; S.msg = ['me', '다시 생각해 보자.']; render(); });
  }
  function useCache() {
    if (!S || S.mode !== 'map' || !S.lk || S.at !== 'office' || S.lk.ans) return;
    var a = nbValid('A', S.lk.name); if (!a) return;
    S.lk.ans = a.val; S.lk.fromCache = true; S.st.cache++;
    NA.sfx.perfect();
    S.msg = ['guide', '수첩의 답 <b>' + a.val + '</b>을 챙겼다(TTL ' + dur(a.exp - S.t) + ' 남음). 장로에게 갈 필요 없이 의뢰인의 집(🏠)으로!'];
    render();
  }
  function lose(lines) {
    S.over = true;
    var me = S;
    talk(lines.concat([L('sys', '신뢰도가 바닥났다…')]), function () { if (S === me) debrief(false); });
  }

  /* ------------------------------------------------------------ 퀴즈 · 자르기 */
  function answer(k) {
    var p = S && S.panel; if (!p || p.kind !== 'quiz' || S.mode !== 'quiz' || p.x[k]) return;
    var o = p.opts[k]; if (!o) return;
    if (o.ok) { NA.sfx.good(); S.panel = null; return talk([L(p.st.who, '<span class="ok">정답!</span> ' + p.st.ok)], nextStep); }
    p.x[k] = true; S.hearts--; S.st.wrong++; NA.sfx.bad();
    if (S.hearts <= 0) { S.panel = null; return lose([L('guide', o.why)]); }
    S.msg = ['guide', '<span class="no">아니야! (신뢰도 −1)</span> ' + o.why]; render();
  }
  function cutPut(seg, bin) {
    var p = S && S.panel; if (!p || p.kind !== 'cut' || S.mode !== 'cut') return;
    if (bin) p.put[seg] = bin; else delete p.put[seg];
    delete p.bad[seg]; p.sel = null; NA.sfx.pop(); render();
  }
  function cutCheck() {
    var p = S.panel, segs = p.st.url.filter(function (s) { return s[1]; });
    var left = segs.filter(function (s) { return !p.put[s[1]]; });
    if (left.length) { S.msg = ['guide', '아직 상자에 넣지 않은 조각이 <b>' + left.length + '개</b> 있다.']; NA.sfx.bad(); return render(); }
    var bad = segs.filter(function (s) { return p.put[s[1]] !== SEG[s[1]].bin; });
    if (bad.length) {
      p.bad = {}; bad.forEach(function (s) { p.bad[s[1]] = true; });
      S.hearts--; S.st.wrong++; NA.sfx.bad();
      var t = '<span class="no">다시! (신뢰도 −1)</span> ' + bad.map(function (s) { return '<b>' + esc(s[0]) + '</b>: ' + SEG[s[1]].why; }).join(' ');
      if (S.hearts <= 0) { S.panel = null; return lose([L('guide', t)]); }
      S.msg = ['guide', t]; return render();
    }
    NA.sfx.good(); S.panel = null;
    talk([L('guide', '<span class="ok">완벽해!</span> DNS에게 가는 건 <b>' + esc(segs.filter(function (s) { return s[1] === 'host'; })[0][0]) + '</b>뿐.' + (p.st.url.some(function (s) { return s[1] === 'port'; }) ? ' 포트(:8080)는 DNS가 아니라 접속할 때 쓴다.' : ''))], nextStep);
  }

  /* 조각 끌기 */
  var drag = null;
  function dragSetup() {
    app.querySelectorAll('[data-chip]').forEach(function (el) {
      el.onpointerdown = function (e) {
        if (e.button !== 0 || S.mode !== 'cut') return; e.preventDefault();
        drag = { el: el, seg: el.dataset.chip, x: e.clientX, y: e.clientY, on: false };
        window.addEventListener('pointermove', dMove); window.addEventListener('pointerup', dEnd); window.addEventListener('pointercancel', dEnd);
      };
    });
    app.querySelectorAll('[data-bin]').forEach(function (el) {
      el.onclick = function (e) { if (e.target.closest('[data-chip]')) return; var p = S.panel; if (p && p.sel) cutPut(p.sel, el.dataset.bin); };
    });
  }
  function overBin(e) { var bins = app.querySelectorAll('[data-bin]'); for (var i = 0; i < bins.length; i++) { var r = bins[i].getBoundingClientRect(); if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) return bins[i]; } return null; }
  function dMove(e) {
    if (!drag) return;
    if (!drag.on) {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) < 6) return;
      drag.on = true; var g = document.createElement('div'); g.className = 'drag-ghost chipg'; g.textContent = drag.el.dataset.txt; document.body.appendChild(g); drag.g = g; drag.el.classList.add('drag-src');
    }
    drag.g.style.left = e.clientX + 'px'; drag.g.style.top = e.clientY + 'px';
    app.querySelectorAll('.bin.hot').forEach(function (b) { b.classList.remove('hot'); });
    var b = overBin(e); if (b) b.classList.add('hot');
  }
  function dEnd(e) {
    window.removeEventListener('pointermove', dMove); window.removeEventListener('pointerup', dEnd); window.removeEventListener('pointercancel', dEnd);
    var d = drag; drag = null; if (!d) return;
    if (d.g) d.g.remove(); d.el.classList.remove('drag-src');
    if (!d.on) { var p = S.panel; p.sel = p.sel === d.seg ? null : d.seg; NA.sfx.tick(); return render(); }
    var b = e && e.type === 'pointerup' ? overBin(e) : null;
    if (b) cutPut(d.seg, b.dataset.bin); else if (e && e.type === 'pointerup') cutPut(d.seg, null); else render();
  }

  /* ------------------------------------------------------------ 결산 */
  function finish() {
    S.over = true; NA.sfx.win();
    debrief(true);
  }
  function debrief(win) {
    var stars = !win ? 0 : S.hearts >= 5 ? 3 : S.hearts >= 3 ? 2 : 1;
    NA.ui.debrief({
      overlay: ov, gameId: GAME_ID, stage: S.si, win: win, stars: stars, score: S.hearts * 20,
      title: win ? '오늘의 의뢰 완료!' : '사무소 문을 닫는다',
      sub: win ? '조회 ' + S.st.looks + '건 · 이동 ' + S.st.trips + '번 · 남은 신뢰도 ' + S.hearts + '/5' : '신뢰도가 바닥났다. 선배의 해설을 떠올리며 다시 해 보자.',
      stats: [['남은 신뢰도', S.hearts + '/5'], ['조회', S.st.looks], ['이동', S.st.trips], ['수첩으로 답', S.st.cache], ['헛걸음', S.st.waste], ['엉뚱한 답', S.st.wrong]],
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
      howto: '나는 <b>리졸버</b>. 의뢰인이 맡긴 이름(재귀 질의)의 IP를 찾으러 <b>장로(root) → 촌장(TLD) → 관리인(권한 서버)</b>을 찾아간다(반복 질의).<br>' +
        '지도에서 마을을 눌러 이동한다(1분씩). 받은 답과 위치는 <b>수첩(캐시)</b>에 TTL과 함께 적힌다. 시간 제한 없음.<br>' +
        '단축키 <span class="key">Enter</span> 대화 넘기기 · <span class="key">1</span>~<span class="key">3</span> 보기 선택 · <span class="key">C</span> 수첩의 답 쓰기'
    });
  }

  /* ------------------------------------------------------------ 렌더 */
  function render() {
    if (!S) return;
    var c = S.cfg, h = ''; for (var k = 0; k < 5; k++) h += k < S.hearts ? '♥' : '<i>♥</i>';
    var steps = c.steps.length;
    var html = '<div class="hud"><span class="t">STAGE ' + (S.si + 1) + ' · ' + esc(c.title) + '</span><span class="hearts">' + h + '</span>' +
      '<span class="cnt">진행 ' + Math.min(S.si2 + 1, steps) + ' / ' + steps + '</span><span class="sp"></span><button class="na-btn" data-guide>규칙</button></div>';
    html += '<div class="main"><div class="lc"><div class="map">' + mapHTML() + '</div>' + dlgHTML() + '</div><div class="rc">' + rightHTML() + '</div></div>';
    app.innerHTML = html;
    bind();
    S.newNode = null; S.newRow = null; S.gone = [];
  }
  function mapHTML() {
    var svg = '<svg viewBox="0 0 814 458" preserveAspectRatio="none">' + ROADS.map(function (r) {
      var a = NODES[r[0]], b = NODES[r[1]], vis = visible(r[0]) && visible(r[1]);
      return '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '" stroke="' + (vis ? '#e9d7a0' : 'rgba(0,0,0,.18)') + '" stroke-width="' + (vis ? 10 : 6) + '" stroke-linecap="round" stroke-dasharray="' + (vis ? '0' : '6 10') + '"/>';
    }).join('') + '</svg>';
    var nodes = Object.keys(NODES).map(function (id) {
      var n = NODES[id], vis = visible(id);
      var cls = 'node' + (n.cls ? ' ' + n.cls : '') + (vis ? '' : ' fog') + (S.at === id ? ' here' : '') + (S.newNode === id ? ' new' : '');
      return '<button class="' + cls + '" data-go="' + id + '" style="left:' + n.x + 'px;top:' + n.y + 'px"><span class="ic">' + (vis ? n.ic : '🌫️') + '</span><span class="tx"><span class="nm">' + (vis ? esc(n.n) : '???') + '</span><span class="sb">' + (vis ? esc(n.sb) : '위치를 모른다') + '</span></span></button>';
    }).join('');
    var at = NODES[S.at];
    var token = '<div class="token" style="left:' + at.x + 'px;top:' + at.y + 'px">🧑‍💼</div>';
    var tip = S.mode === 'map' ? '<div class="tip">마을을 눌러 이동 (1분) · 안개 낀 곳은 위치를 알아야 갈 수 있다</div>' : '';
    return svg + nodes + token + tip + panelHTML();
  }
  function panelHTML() {
    var p = S.panel; if (!p) return '';
    if (p.kind === 'quiz') {
      return '<div class="panel"><div class="q">❓ ' + p.st.q + '</div>' + p.opts.map(function (o, i) {
        return '<button class="opt' + (p.x[i] ? ' x' : '') + '" data-ans="' + i + '"><span class="n">' + (i + 1) + '</span>' + esc(o.t) + '</button>';
      }).join('') + '</div>';
    }
    if (p.kind === 'cut') {
      var url = '<div class="urlbar">🔒 ' + p.st.url.map(function (s) { return '<span class="' + (s[1] ? 'seg-' + s[1] : '') + '">' + esc(s[0]) + '</span>'; }).join('') + '</div>';
      function chip(s) { return '<span class="chip seg-' + s[1] + (p.sel === s[1] ? ' sel' : '') + (p.bad[s[1]] ? ' bad' : '') + '" data-chip="' + s[1] + '" data-txt="' + esc(s[0]) + '">' + esc(s[0]) + '<small>' + SEG[s[1]].nm + '</small></span>'; }
      var segs = p.st.url.filter(function (s) { return s[1]; });
      var loose = segs.filter(function (s) { return !p.put[s[1]]; });
      var bins = '<div class="bins">' + BINS.map(function (b) {
        return '<div class="bin" data-bin="' + b.id + '"><h4>' + b.h + '</h4><p>' + b.p + '</p><div class="chips">' + segs.filter(function (s) { return p.put[s[1]] === b.id; }).map(chip).join('') + '</div></div>';
      }).join('') + '</div>';
      return '<div class="panel"><div class="q">✂️ 의뢰서의 URL을 조각내자. 각 조각은 어디에 쓰일까?</div>' + url +
        '<div class="chips">' + (loose.length ? loose.map(chip).join('') : '<span style="color:#a7c9b5;font-size:12px">모든 조각을 넣었다. 확인을 누르자.</span>') + '</div>' + bins +
        '<div class="prow"><span class="info">조각을 끌어다 상자에 놓기 · 눌러서 고른 뒤 상자를 눌러도 된다 · 상자 밖에 놓으면 다시 빠진다</span><span class="sp"></span><button class="na-btn primary" data-cutok>확인 (Enter)</button></div></div>';
    }
    return '';
  }
  function dlgHTML() {
    var m = S.msg || ['sys', ''], ca = CAST[m[0]] || CAST.sys;
    var isTalk = S.mode === 'talk';
    var acts = '';
    return '<div class="dlg' + (isTalk ? '' : ' locked') + '"><div class="pt">' + ca[0] + '</div><div class="nm">' + esc(ca[1]) + '</div><div class="txt">' + m[1] + '</div>' +
      (isTalk ? '<span class="more">▼ 클릭 · Enter</span>' : acts) + '</div>';
  }
  function rightHTML() {
    var lk = S.lk, h = '';
    if (lk) h += '<div class="req"><div class="l"><span>📮 지금 의뢰</span><span>' + esc(CAST[lk.who][1]) + '</span></div><div class="n">' + esc(lk.name) + '</div><div class="s">' + (lk.ans ? '답: <b>' + lk.ans + '</b> → 의뢰인에게 가져가자' : '재귀 질의: "최종 IP를 가져와"') + '</div></div>';
    else h += '<div class="req"><div class="l"><span>📮 지금 의뢰</span><span></span></div><div class="n">—</div><div class="s">' + (S.panel ? '지도 위의 과제를 풀자' : '대화를 진행하자') + '</div></div>';
    h += '<div class="clock">🕰️ 마을 시계 <b>' + fmt(S.t) + '</b><span class="d">이동 1번 = 1분</span></div>';
    var rows = S.nb.slice().sort(function (a, b) { return a.exp - b.exp; }).map(function (r) {
      var left = r.exp - S.t, low = r.kind === 'A' && left <= 5 * 60;
      return '<div class="r' + (S.newRow === r.kind + r.key ? ' new' : '') + '"><span class="k">' + (r.kind === 'A' ? '🏷️' : '📍') + '</span><span class="v"><b>' + esc(r.kind === 'A' ? r.key : r.key) + '</b><span>' + (r.kind === 'A' ? 'A → ' + esc(r.val) : 'NS → ' + esc(r.val) + ' 위치') + '</span></span><span class="ttl' + (low ? ' low' : '') + '">' + dur(left) + '</span></div>';
    }).join('');
    var gone = (S.gone || []).map(function (g) { return '<div class="r gone"><span class="k">🗑️</span><span class="v"><b>' + esc(g) + '</b><span>TTL 끝 · 지워짐</span></span><span class="ttl">0분</span></div>'; }).join('');
    var can = S.mode === 'map' && lk && S.at === 'office' && !lk.ans && nbValid('A', lk.name);
    h += '<div class="nb"><h3>📒 리졸버 수첩 (캐시)<small>🏷️ 주소(A) · 📍 마을 위치(NS) · 남은 TTL</small></h3>' + (rows || gone ? rows + gone : '<div class="empty">아직 비어 있다. 물어서 얻은 답과 위치가 여기 적힌다.</div>') +
      '<div class="use"><button class="na-btn primary" data-cache' + (can ? '' : ' disabled') + '>📒 수첩의 답 쓰기 (C)</button></div></div>';
    return h;
  }
  function clockFx() { var c = app.querySelector('.clock'); if (c) { c.classList.remove('tick'); void c.offsetWidth; c.classList.add('tick'); } }
  function bind() {
    app.querySelectorAll('[data-go]').forEach(function (e) { e.onclick = function () { go(e.dataset.go); }; });
    app.querySelectorAll('[data-ans]').forEach(function (e) { e.onclick = function () { answer(+e.dataset.ans); }; });
    var d = app.querySelector('.dlg'); if (d) d.onclick = function () { advanceTalk(); };
    var q = function (s, fn) { var e = app.querySelector(s); if (e) e.onclick = fn; };
    q('[data-cache]', useCache); q('[data-cutok]', cutCheck); q('[data-guide]', guide);
    if (S.panel && S.panel.kind === 'cut') dragSetup();
  }
  function guide() {
    var back = ov.innerHTML, wasHidden = ov.hidden;
    ov.innerHTML = '<div class="na-card guide"><h2>리졸버 업무 안내</h2>' +
      '<h4>URL과 도메인</h4><p>URL = scheme://host:port/path?query#fragment. DNS는 <b>host</b>만 다룬다. port·path·query는 서버와의 연결·요청에, #fragment는 브라우저 안에서만 쓴다.</p>' +
      '<h4>재귀와 반복</h4><ul><li><b>재귀 질의</b>: 의뢰인(브라우저·OS stub) → 리졸버. "최종 답을 가져와."</li><li><b>반복 질의</b>: 리졸버 → root → TLD → 권한 서버. "모르면 다음에 물어볼 곳을 알려 줘."</li></ul>' +
      '<h4>이름 읽는 법</h4><p>오른쪽부터: www.inu.ac.kr → (root) → kr → (ac.kr) → inu.ac.kr 권한 서버가 www의 주소를 안다.</p>' +
      '<h4>수첩(캐시)과 TTL</h4><p>받은 답(A)과 위치(NS)는 TTL 동안 수첩에 남는다. 살아 있는 기록이 있으면 그만큼 건너뛴다. TTL이 끝나면 지워지고 다시 물어야 한다. 원본이 바뀌어도 TTL 동안은 옛 기록이 쓰인다.</p>' +
      '<div class="na-row"><button class="na-btn primary" data-close>닫기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-close]').onclick = function () { ov.innerHTML = back; ov.hidden = wasHidden; };
  }

  /* ------------------------------------------------------------ 입력 */
  window.addEventListener('keydown', function (e) {
    if (!S || !ov.hidden) return;
    var k = e.key;
    if (S.mode === 'talk' && (k === 'Enter' || k === ' ')) { e.preventDefault(); advanceTalk(); }
    else if (S.mode === 'quiz' && /^[1-3]$/.test(k)) answer(+k - 1);
    else if (S.mode === 'cut' && k === 'Enter') { e.preventDefault(); cutCheck(); }
    else if (S.mode === 'map' && (k === 'c' || k === 'C')) useCache();
  });

  window.__game = {
    state: function () { return S; }, start: startStage, stages: STAGES, nodes: NODES,
    adv: advanceTalk, go: go, cache: useCache, answer: answer, cut: cutPut, cutCheck: cutCheck,
    best: function () { return S.lk ? best(S.lk.name) : null; },
    path: function () { // 테스트용: 정답 다음 행선지
      var lk = S.lk; if (!lk) return null;
      if (lk.ans) return 'client';
      if (S.at !== 'office' && S.at === 'client') return 'office';
      var b = best(lk.name);
      if (b === 'cache') return S.at === 'office' ? 'cache' : 'office';
      return b === 'root' ? (S.at === 'root' ? nodeOfZone(tldOf(lk.name)) : 'root') : b;
    },
    segBin: function (s) { return SEG[s].bin; }
  };
  menu();
})();
