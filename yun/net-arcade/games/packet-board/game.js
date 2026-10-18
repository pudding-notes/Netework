/* 패킷 여행 보드게임 — Quick Check W2-3(IP vs 포트), W2-4(Default Gateway), W2-5(홉마다 MAC 교체), W2-6(NAT)
 *
 * 턴제 말판 게임. 시간 제한 없음.
 * 내 말 = 패킷(겹겹이 싼 소포). 주사위를 굴려 원형 말판을 한 바퀴 돈다.
 *   관문 칸(장비): 주사위 눈이 남아도 멈춘다. 소포를 고치거나(스티커 붙이기) 질문에 답해야 지나갈 수 있다.
 *   이벤트 칸: O/X 퀴즈, 지름길, 혼잡 등.
 * 틀리면 장비가 소포를 반송하고 신뢰도 -1 (5칸). 소포 구조: 이더넷 봉투(MAC) > IP 봉투(IP, TTL) > TCP 봉투(포트) > 데이터
 */
(function () {
  var GAME_ID = 'packet-board';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));

  var N = 28; // 말판 칸 수 (10×6 둘레)
  var FIELDS = ['eth.dst', 'eth.src', 'ip.src', 'ip.dst', 'ip.ttl', 'tcp.sp', 'tcp.dp'];
  var FK = { 'tcp.sp': '포트', 'tcp.dp': '포트', 'ip.src': 'IP', 'ip.dst': 'IP', 'ip.ttl': 'TTL', 'eth.src': 'MAC', 'eth.dst': 'MAC' };
  var FL = { 'tcp.sp': '출발 포트', 'tcp.dp': '목적 포트', 'ip.src': '출발 IP', 'ip.dst': '목적 IP', 'ip.ttl': 'TTL', 'eth.src': '출발 MAC', 'eth.dst': '목적 MAC' };
  var LAYER_OF = { tcp: '포트', ip: 'IP', eth: 'MAC' };

  /* ------------------------------------------------------------ 스티커 (주소록) */
  function K(v, k, who) { return { v: v, k: k, who: who }; }
  var TTL = {}; [60, 61, 62, 63, 64, 65].forEach(function (n) { TTL['t' + n] = K(String(n), 'TTL', 'TTL ' + n); });
  function stickers(o) { var r = {}; for (var k in TTL) r[k] = TTL[k]; for (var j in o) r[j] = o[j]; return r; }

  var HOME = {
    me: K('192.168.0.10', 'IP', '내 노트북'), sib: K('192.168.0.11', 'IP', '동생 노트북'), tv: K('192.168.0.20', 'IP', '거실 TV'),
    prn: K('192.168.0.30', 'IP', '프린터'), gw: K('192.168.0.1', 'IP', '공유기 (Gateway)'), pub: K('198.51.100.7', 'IP', '공유기 공인 IP'),
    srv: K('203.0.113.10', 'IP', '웹 서버'),
    mMe: K('3c:22:fb:00:00:10', 'MAC', '내 노트북'), mPrn: K('00:1e:0b:00:00:30', 'MAC', '프린터'),
    mGw: K('a4:91:b1:00:00:01', 'MAC', '공유기 (집 안쪽)'), mGwO: K('a4:91:b1:00:00:02', 'MAC', '공유기 (인터넷 쪽)'),
    mIsp: K('00:1b:21:00:02:01', 'MAC', 'ISP 라우터'), mSrv: K('52:54:00:00:00:99', 'MAC', '웹 서버'),
    p443: K('443', '포트', 'HTTPS (서버)'), p631: K('631', '포트', '프린터 IPP'), p51000: K('51000', '포트', '임시 포트 (인쇄)'),
    p51234: K('51234', '포트', '임시 포트'), p49152: K('49152', '포트', '임시 포트 (TV)'),
    p40001: K('40001', '포트', '공유기 새 포트'), p40002: K('40002', '포트', '공유기 포트 (동생)'), p40003: K('40003', '포트', '공유기 포트 (TV)')
  };

  /* ------------------------------------------------------------ 스테이지 */
  // 관문: kind edit(스티커) / choice(질문) / order(포장 순서). at = 말판 위치(28 = 한 바퀴 돌아 도착)
  var STAGES = [
    /* =========================================== 1 */
    { title: '집 안 택배', desc: '같은 노트북 안의 FastAPI(:8000)와 DB(:5432)로. IP는 어느 집, 포트는 어느 방.', qc: ['W2-3'],
      show: ['ip', 'tcp'],
      st: stickers({
        lo: K('127.0.0.1', 'IP', 'loopback (내 PC)'), lan: K('192.168.0.10', 'IP', '내 노트북 LAN IP'),
        p8000: K('8000', '포트', 'FastAPI (listen)'), p5432: K('5432', '포트', 'PostgreSQL (listen)'),
        p51234: K('51234', '포트', '임시 포트 (브라우저)'), p43210: K('43210', '포트', '임시 포트 (→DB)'), p80: K('80', '포트', 'HTTP 기본 포트')
      }),
      tiles: { 0: ['🌐', '브라우저 (내 노트북)'], 5: ['⚙️', '운영체제 커널'], 10: ['🐍', 'FastAPI :8000'], 12: ['📝', 'DB에 물어보기'], 16: ['🐘', 'PostgreSQL :5432'], 20: ['📨', 'FastAPI의 답장'] },
      zones: [[1, '🔁', '노트북 안 (loopback)']],
      gates: [
        { at: 0, kind: 'edit', title: '첫 소포 포장', reset: { data: 'GET /docs (요청)', 'ip.ttl': 't64' },
          say: '첫 소포야! 브라우저가 같은 노트북에서 도는 FastAPI(<b>127.0.0.1:8000</b>)에 요청을 보낸다. <b>IP = 어느 집</b>, <b>포트 = 그 집의 어느 방</b>. 봉투 칸을 누르고 아래 스티커를 골라 붙여 봐.',
          edit: ['ip.src', 'ip.dst', 'tcp.sp', 'tcp.dp'], expect: { 'ip.src': 'lo', 'ip.dst': 'lo', 'tcp.sp': 'p51234', 'tcp.dp': 'p8000' },
          hand: ['lo', 'lan', 'p8000', 'p5432', 'p51234', 'p80'],
          why: { 'ip.dst': { lan: '192.168.0.10도 내 노트북이긴 하지만, 같은 PC 안의 서버를 부를 때는 "나 자신"을 뜻하는 127.0.0.1을 쓴다. 이번 서버 주소는 127.0.0.1:8000.', _: '목적 IP = 찾아갈 집. 같은 PC 안이니 "나 자신" 127.0.0.1.' },
            'ip.src': '출발 IP = 보내는 집. 같은 PC 안의 대화라 보내는 쪽도 127.0.0.1.',
            'tcp.dp': { p5432: '5432는 DB의 방이다. 이번에 찾아가는 FastAPI는 8000번 방.', p80: '80은 HTTP의 기본 포트일 뿐, FastAPI는 8000번에서 기다리고 있다.', _: '목적 포트 = 찾아갈 방(프로그램). FastAPI는 8000.' },
            'tcp.sp': '출발 포트 = 보내는 쪽(브라우저 연결)의 방 번호. 운영체제가 남는 번호를 골라 준다(임시 포트 51234).' },
          ok: 'IP 봉투에는 <b>IP(어느 집)</b>, TCP 봉투에는 <b>포트(어느 방)</b>. 127.0.0.1:8000 = "내 PC의 8000번 방".' },
        { at: 5, kind: 'choice', title: '목적지가 127.0.0.1', say: '운영체제가 소포를 받았다. 목적 IP가 127.0.0.1이다.',
          q: '이 소포는 어디로 갈까?', o: [
            { t: '랜카드를 타고 공유기로 나간다', why: '127.0.0.1은 loopback, "내 PC 자신"이다. 밖으로 나가지 않는다.' },
            { t: '랜카드로 나가지 않고 PC 안에서 바로 되돌아온다 (loopback)', ok: true },
            { t: 'DNS 서버에 127.0.0.1이 누구인지 물어본다', why: '이미 숫자 IP다. DNS는 이름 → IP를 바꿀 때만 쓴다.' }],
          ok: '그래서 이번 여행엔 <b>이더넷 봉투(MAC)가 없다</b>. 랜선을 타지 않으니까.' },
        { at: 10, kind: 'choice', title: '어느 방에 줄까', say: '소포가 노트북 안에서 되돌아왔다. 이제 운영체제가 받을 프로그램을 고른다.',
          q: '운영체제는 이 소포를 어느 프로그램에게 줄까?', o: [
            { t: '목적 포트 8000에서 listen 중인 FastAPI', ok: true },
            { t: '5432에서 listen 중인 PostgreSQL', why: '목적 포트가 8000이다. 같은 집(127.0.0.1)이라도 방(포트)이 다르면 다른 프로그램이다.' },
            { t: '51234를 쓰는 프로그램', why: '51234는 출발 포트, 보낸 쪽(브라우저 연결)의 번호다.' }],
          ok: '<b>IP는 집을, 포트는 그 집 안의 프로그램을</b> 가린다.' },
        { at: 12, kind: 'edit', title: 'FastAPI가 DB에 묻는다', reset: { data: 'SELECT * FROM docs', 'ip.ttl': 't64' },
          say: 'FastAPI가 답하기 전에 같은 노트북의 DB(PostgreSQL)에게 데이터를 물어본다. 새 소포를 싸자.',
          edit: ['ip.src', 'ip.dst', 'tcp.sp', 'tcp.dp'], expect: { 'ip.src': 'lo', 'ip.dst': 'lo', 'tcp.sp': 'p43210', 'tcp.dp': 'p5432' },
          hand: ['lo', 'lan', 'p5432', 'p8000', 'p43210', 'p51234'],
          why: { 'tcp.dp': 'DB는 5432번 방에서 기다린다.', 'tcp.sp': { p8000: '8000은 FastAPI가 손님을 받는 방이다. DB에게 묻는 새 연결은 운영체제가 고른 임시 포트(43210)를 쓴다.', p51234: '51234는 브라우저 연결이 쓰는 번호다. 새 연결엔 새 임시 포트(43210).', _: '새 연결의 출발 포트는 운영체제가 고른 임시 포트.' },
            'ip.dst': 'DB도 같은 노트북 안이다. 127.0.0.1.', 'ip.src': '같은 노트북 안의 대화. 127.0.0.1.' },
          ok: '집(127.0.0.1)은 같고 방만 다르다: 8000 = FastAPI, 5432 = DB.' },
        { at: 16, kind: 'choice', title: '같은 집, 다른 방', say: '소포가 다시 운영체제에 도착했다.',
          q: '이번 소포(목적 127.0.0.1:5432)는 누구에게?', o: [
            { t: 'FastAPI', why: 'FastAPI는 8000번 방이다.' },
            { t: 'PostgreSQL', ok: true },
            { t: '브라우저', why: '브라우저 연결은 51234번이다.' }],
          ok: 'DB가 결과를 FastAPI에 돌려줬다(43210번 연결로). 이제 FastAPI가 브라우저에게 답장할 차례.' },
        { at: 20, kind: 'edit', title: 'FastAPI의 답장', reset: { data: 'HTTP 200 OK (문서 목록)', 'ip.ttl': 't64' },
          say: 'FastAPI가 브라우저에게 답장을 쓴다. 답장은 <b>보낸 사람과 받는 사람이 뒤바뀐다</b>.',
          edit: ['ip.src', 'ip.dst', 'tcp.sp', 'tcp.dp'], expect: { 'ip.src': 'lo', 'ip.dst': 'lo', 'tcp.sp': 'p8000', 'tcp.dp': 'p51234' },
          hand: ['lo', 'lan', 'p8000', 'p51234', 'p5432', 'p43210'],
          why: { 'tcp.sp': 'FastAPI가 자기 방(8000)에서 보내는 답장이다.', 'tcp.dp': { p43210: '43210은 FastAPI↔DB 연결이다. 브라우저 연결은 51234.', _: '답장은 브라우저 연결(51234)로 돌아가야 한다.' },
            'ip.src': '127.0.0.1', 'ip.dst': '127.0.0.1' },
          ok: '출발 ↔ 목적이 뒤바뀌었다. 8000 → 51234.' },
        { at: 28, kind: 'choice', title: '브라우저 도착', say: '답장이 운영체제에 도착했다. 브라우저 탭이 여러 개 열려 있다.',
          q: '운영체제는 이 답장을 어느 연결에 넘길까?', o: [
            { t: '목적 포트 51234를 쓰는 브라우저 연결', ok: true },
            { t: '8000번 FastAPI', why: '8000은 답장을 보낸 쪽(출발 포트)이다.' },
            { t: '아무 브라우저 탭에나', why: '탭(연결)마다 출발 포트가 다르다. 51234번 연결만 이 답장의 주인이다.' }],
          ok: '배달 완료! 127.0.0.1(집) + 포트(방)로 같은 PC 안의 프로그램끼리 대화했다.' }
      ],
      note: { 'W2-3': '127.0.0.1(IP)은 내 PC 자신, 8000·5432(포트)는 그 안의 프로그램이었다. 같은 IP라도 포트가 다르면 다른 프로그램에게 갔다.' } },

    /* =========================================== 2 */
    { title: '동네 밖으로', desc: '같은 동네 프린터는 직접, 바깥 웹 서버는 Gateway에게 맡긴다.', qc: ['W2-4'],
      show: ['eth', 'ip', 'tcp'], st: stickers(HOME),
      tiles: { 0: ['💻', '내 노트북 192.168.0.10/24'], 3: ['🔀', '갈림길: 같은 동네?'], 4: ['🔎', 'ARP: 프린터 MAC'], 7: ['🔌', '집 스위치'], 9: ['🖨️', '프린터'],
        14: ['💻', '두 번째 소포'], 17: ['🔀', '갈림길: 같은 동네?'], 18: ['🔎', 'ARP: Gateway MAC'], 23: ['📡', '공유기 (Gateway)'] },
      zones: [[1, '〰️', '집 안 랜선'], [10, '🏠', '집으로'], [24, '🌐', '응답 귀가']],
      gates: [
        { at: 0, kind: 'order', title: '포장 순서', reset: { data: 'PRINT 보고서.pdf', 'ip.ttl': 't64' },
          say: '프린터에 인쇄 요청을 보낸다. 먼저 <b>포장 순서</b>! 데이터에 어떤 봉투부터 씌울까? 안쪽부터 차례로 누르자.',
          ok: '데이터 → <b>TCP</b>(4계층, 포트) → <b>IP</b>(3계층, IP) → <b>이더넷</b>(2계층, MAC). 겉봉투일수록 아래 계층이고, 받는 쪽은 겉부터 벗긴다.' },
        { at: 0, kind: 'edit', title: '인쇄 요청 주소 쓰기',
          say: '목적지는 프린터 <b>192.168.0.30</b>의 <b>631번</b>(IPP 인쇄) 방. 이더넷 봉투는 갈림길을 지난 뒤에 쓴다.',
          edit: ['ip.src', 'ip.dst', 'tcp.sp', 'tcp.dp'], expect: { 'ip.src': 'me', 'ip.dst': 'prn', 'tcp.sp': 'p51000', 'tcp.dp': 'p631' },
          hand: ['me', 'prn', 'gw', 'srv', 'p631', 'p443', 'p51000', 'mPrn'],
          why: { 'tcp.sp': '출발 포트는 운영체제가 고른 임시 포트 51000.', 'tcp.dp': '프린터의 IPP 인쇄 서비스는 631번.', 'ip.dst': '최종 목적지는 프린터 192.168.0.30.', 'ip.src': '보내는 집은 내 노트북 192.168.0.10.' },
          ok: '이제 이 소포를 누구에게 건넬지(이더넷 봉투) 정할 차례.' },
        { at: 3, kind: 'choice', title: '갈림길', say: '내 주소 <b>192.168.0.10/24</b>, 목적지 <b>192.168.0.30</b>.',
          q: '어떻게 보낼까?', o: [
            { t: '같은 동네(192.168.0.0/24) → 프린터에게 직접', ok: true },
            { t: '다른 동네 → Gateway(공유기)에게 맡긴다', why: '둘 다 mask(/24)를 AND 하면 192.168.0.0. 같은 동네다.' },
            { t: '무조건 Gateway를 거친다', why: 'Gateway는 목적지가 내 서브넷 밖일 때만 필요하다.' }],
          ok: '같은 서브넷이면 Gateway 없이 직접. 그러려면 프린터의 MAC이 필요하다 → ARP.' },
        { at: 4, kind: 'edit', title: 'ARP: 프린터 MAC',
          say: 'ARP로 "192.168.0.30 누구야?" 물었더니 프린터가 자기 MAC을 알려 줬다. <b>이더넷 봉투</b>를 쓰자.',
          edit: ['eth.dst', 'eth.src'], expect: { 'eth.dst': 'mPrn', 'eth.src': 'mMe' },
          hand: ['mPrn', 'mMe', 'mGw', 'mSrv', 'prn', 'me'],
          why: { 'eth.dst': { mGw: '같은 동네라 공유기를 거칠 필요가 없다. 목적 MAC은 프린터 자신.', _: '같은 동네니까 목적 MAC = 프린터.' }, 'eth.src': '출발 MAC = 내 노트북의 랜카드.' },
          ok: '이더넷 봉투 완성. 스위치가 이 MAC을 보고 프린터 포트로 보낸다.' },
        { at: 9, kind: 'choice', title: '프린터 도착', say: '소포가 스위치를 지나 프린터에 도착했다!',
          q: '스위치는 무엇을 보고 이 소포를 프린터 쪽 포트로 보냈을까?', o: [
            { t: 'TCP 봉투의 목적 포트 631', why: '스위치는 2계층 장비라 이더넷 봉투(MAC)만 본다.' },
            { t: '이더넷 봉투의 목적 MAC', ok: true },
            { t: 'IP 봉투의 출발 IP', why: '스위치는 IP를 보지 않는다. 그리고 출발지는 길 찾기와 상관없다.' }],
          ok: '같은 동네 배달 완료. <b>Gateway를 한 번도 거치지 않았다</b>.' },
        { at: 14, kind: 'edit', title: '두 번째 소포: 웹 서버', reset: { data: 'GET / (웹 페이지)', 'ip.ttl': 't64', 'eth.src': null, 'eth.dst': null },
          say: '이번엔 웹 서버 <b>203.0.113.10</b>의 <b>443번</b>(HTTPS)에 요청한다.',
          edit: ['ip.src', 'ip.dst', 'tcp.sp', 'tcp.dp'], expect: { 'ip.src': 'me', 'ip.dst': 'srv', 'tcp.sp': 'p51234', 'tcp.dp': 'p443' },
          hand: ['me', 'srv', 'gw', 'pub', 'p443', 'p631', 'p51234', 'mSrv'],
          why: { 'ip.dst': { gw: '공유기를 거치더라도 IP 봉투의 목적지는 최종 목적지(웹 서버)다.', _: '최종 목적지는 웹 서버 203.0.113.10.' }, 'tcp.dp': 'HTTPS는 443.', 'tcp.sp': '새 연결의 임시 포트 51234.', 'ip.src': '내 노트북 192.168.0.10.' },
          ok: '주소 완성. 이제 갈림길.' },
        { at: 17, kind: 'choice', title: '갈림길', say: '내 주소 <b>192.168.0.10/24</b>, 목적지 <b>203.0.113.10</b>.',
          q: '어떻게 보낼까?', o: [
            { t: '같은 동네 → 서버에게 직접', why: '동네 번호 192.168.0.0 ≠ 203.0.113.0. 다른 동네다.' },
            { t: '서버 MAC을 몰라서 보낼 수 없다', why: '서버 MAC은 알 필요가 없다. 동네 밖이면 Gateway에게 맡기면 된다.' },
            { t: '다른 동네 → Default Gateway(192.168.0.1)에게 맡긴다', ok: true }],
          ok: '<b>목적지가 내 서브넷 밖</b> → Default Gateway. Gateway의 MAC을 ARP로 알아내자.' },
        { at: 18, kind: 'edit', title: 'ARP: Gateway MAC',
          say: 'ARP로 "192.168.0.1(Gateway) 누구야?" → 공유기가 MAC을 알려 줬다. 봉투를 고치자. <b>바꿀 필요 없는 칸은 그대로</b> 두면 된다.',
          edit: ['eth.dst', 'eth.src', 'ip.dst'], expect: { 'eth.dst': 'mGw', 'eth.src': 'mMe', 'ip.dst': 'srv' },
          hand: ['mGw', 'mMe', 'mSrv', 'mPrn', 'gw', 'srv'],
          why: { 'eth.dst': { mSrv: '서버 MAC은 서버 동네에서만 쓰는 주소다. 우리 동네에서 직접 닿을 수도 없다. 동네 밖이면 목적 MAC은 Gateway.', _: '동네 밖으로 갈 때 목적 MAC = Gateway(공유기)의 MAC.' },
            'ip.dst': 'Gateway에게 맡겨도 <b>목적 IP는 최종 목적지(웹 서버) 그대로</b>다. Gateway는 이더넷 봉투(MAC)로만 가리킨다.', 'eth.src': '출발 MAC = 내 노트북.' },
          ok: '목적 IP = 웹 서버, 목적 MAC = Gateway. "최종 목적지는 IP로, 바로 다음 장비는 MAC으로".' },
        { at: 23, kind: 'choice', title: '공유기 도착', say: '공유기(Gateway)가 소포를 받았다. 이더넷 봉투의 목적 MAC이 자기 것이라 받았다.',
          q: '공유기는 무엇을 보고 다음 길을 정할까?', o: [
            { t: 'IP 봉투의 목적 IP (203.0.113.10)', ok: true },
            { t: '이더넷 봉투의 목적 MAC', why: '목적 MAC은 공유기 자신이었다. "나한테 온 소포"라는 뜻일 뿐이다.' },
            { t: 'TCP 봉투의 목적 포트', why: '라우터는 3계층 장비. 길 찾기는 IP로 한다.' }],
          ok: '공유기가 인터넷으로 넘겼다. 이제 응답을 기다리며 집으로!' },
        { at: 28, kind: 'choice', title: '응답 도착', say: '웹 서버의 응답이 노트북에 도착했다.',
          q: '이 응답의 이더넷 봉투 출발 MAC은 누구의 것일까?', o: [
            { t: '웹 서버', why: '서버 MAC은 서버 동네 안에서만 쓰였다. 우리 동네에 들어올 땐 공유기가 새 이더넷 봉투를 붙였다.' },
            { t: '공유기 (집 안쪽 포트)', ok: true },
            { t: '프린터', why: '프린터는 이 응답과 상관없다.' }],
          ok: '동네 밖에서 온 소포는 마지막 구간을 Gateway가 전달한다.' }
      ],
      note: { 'W2-4': '프린터(같은 /24)는 직접 프린터 MAC으로, 웹 서버(동네 밖)는 Gateway의 MAC을 붙여 맡겼다. 목적 IP는 끝까지 웹 서버였다.' } },

    /* =========================================== 3 */
    { title: '스티커 릴레이', desc: '라우터 3개를 지난다. 홉마다 바뀌는 것과 끝까지 그대로인 것.', qc: ['W2-5'],
      show: ['eth', 'ip', 'tcp'],
      st: stickers({
        pc: K('198.51.100.20', 'IP', '연구실 PC'), srv: K('203.0.113.10', 'IP', '웹 서버'),
        ip1: K('198.51.100.1', 'IP', 'R1 학교 라우터'), ip2: K('192.0.2.1', 'IP', 'R2 ISP 라우터'), ip3: K('203.0.113.1', 'IP', 'R3 데이터센터'),
        mPc: K('3c:22:fb:00:00:20', 'MAC', '연구실 PC'), r1a: K('a4:00:00:00:01:01', 'MAC', 'R1 (연구실 쪽)'), r1b: K('a4:00:00:00:01:02', 'MAC', 'R1 (ISP 쪽)'),
        r2a: K('00:1b:21:00:02:01', 'MAC', 'R2 (학교 쪽)'), r2b: K('00:1b:21:00:02:02', 'MAC', 'R2 (DC 쪽)'),
        r3a: K('00:50:56:00:03:01', 'MAC', 'R3 (ISP 쪽)'), r3b: K('00:50:56:00:03:02', 'MAC', 'R3 (서버 쪽)'), mSrv: K('52:54:00:00:00:99', 'MAC', '웹 서버'),
        p50123: K('50123', '포트', '임시 포트'), p443: K('443', '포트', 'HTTPS (서버)')
      }),
      tiles: { 0: ['🔬', '연구실 PC'], 5: ['🏫', 'R1 학교 라우터'], 11: ['🏢', 'R2 ISP 라우터'], 17: ['🗄️', 'R3 데이터센터'], 20: ['🖥️', '웹 서버'], 21: ['📨', '서버의 답장'], 26: ['🔁', '돌아오는 라우터들'] },
      zones: [[1, '〰️', '학교망'], [6, '🌐', '인터넷'], [12, '🌐', '인터넷'], [18, '〰️', '데이터센터'], [22, '🌐', '돌아오는 길']],
      start: { data: 'GET / (웹 페이지)', 'tcp.sp': 'p50123', 'tcp.dp': 'p443', 'ip.src': 'pc', 'ip.dst': 'srv', 'ip.ttl': 't64' },
      gates: [
        { at: 0, kind: 'edit', title: '첫 홉: R1',
          say: '연구실 PC(공인 IP라 NAT가 없다)에서 웹 서버로 출발. 서버는 동네 밖 → 첫 홉은 Gateway인 <b>R1</b>. 이더넷 봉투를 쓰자.',
          edit: ['eth.dst', 'eth.src'], expect: { 'eth.dst': 'r1a', 'eth.src': 'mPc' },
          hand: ['r1a', 'r1b', 'mPc', 'mSrv', 'r2a', 'ip1'],
          why: { 'eth.dst': { mSrv: '서버는 멀리 있다. 지금 구간의 상대는 바로 옆 R1이다.', r1b: '그건 R1의 반대편(ISP 쪽) 포트다. 연구실에서 닿는 건 R1의 연구실 쪽 포트.', _: '첫 구간의 목적 MAC = Gateway R1(연구실 쪽 포트).' }, 'eth.src': '출발 MAC = 연구실 PC.' },
          ok: '이더넷 봉투 = <b>이번 구간</b>용 주소. IP 봉투 = <b>최종 목적지</b>.' },
        { at: 5, kind: 'edit', title: 'R1: 스티커 갈아붙이기',
          say: 'R1이 소포를 받았다. 이더넷 봉투는 "R1까지"만 쓰는 것이었다. <b>R1 → R2 구간</b>용으로 고치자. 다른 칸도 바꿔야 할까?',
          edit: ['eth.dst', 'eth.src', 'ip.src', 'ip.dst', 'ip.ttl'], expect: { 'eth.dst': 'r2a', 'eth.src': 'r1b', 'ip.src': 'pc', 'ip.dst': 'srv', 'ip.ttl': 't63' },
          hand: ['r1a', 'r1b', 'r2a', 'mSrv', 'ip1', 'ip2', 'pc', 'srv', 't64', 't63', 't65'],
          why: { 'eth.src': '새 구간의 출발 MAC = R1이 내보내는 포트(ISP 쪽).', 'eth.dst': '다음 홉 R2(학교 쪽 포트).',
            'ip.src': '<b>IP 봉투는 그대로</b>. 출발 IP는 끝까지 연구실 PC다.', 'ip.dst': '<b>IP 봉투는 그대로</b>. 목적 IP는 끝까지 웹 서버다.',
            'ip.ttl': '라우터를 지날 때마다 TTL은 1씩 줄어든다. 64 → 63.' },
          ok: '<b>MAC과 TTL만 바뀌고 IP는 그대로</b>. MAC = 다음 장비, IP = 최종 목적지.' },
        { at: 11, kind: 'edit', title: 'R2: 스티커 갈아붙이기',
          say: 'R2(ISP)에 도착. 다음 구간은 <b>R2 → R3</b>.',
          edit: ['eth.dst', 'eth.src', 'ip.src', 'ip.dst', 'ip.ttl'], expect: { 'eth.dst': 'r3a', 'eth.src': 'r2b', 'ip.src': 'pc', 'ip.dst': 'srv', 'ip.ttl': 't62' },
          hand: ['r1b', 'r2a', 'r2b', 'r3a', 'mSrv', 'ip2', 'ip3', 'pc', 'srv', 't63', 't62', 't61'],
          why: { 'eth.src': '출발 MAC = R2의 데이터센터 쪽 포트.', 'eth.dst': '다음 홉 R3(ISP 쪽 포트).', 'ip.src': 'IP 봉투는 그대로. 연구실 PC.', 'ip.dst': 'IP 봉투는 그대로. 웹 서버.', 'ip.ttl': '63 → 62.' },
          ok: '실제 인터넷 구간은 이더넷이 아닌 링크일 수도 있지만, <b>구간마다 그 링크의 2계층 주소를 새로 쓰는</b> 원리는 같다.' },
        { at: 17, kind: 'edit', title: 'R3: 마지막 구간',
          say: 'R3는 웹 서버와 같은 동네(데이터센터)에 있다. 마지막 구간!',
          edit: ['eth.dst', 'eth.src', 'ip.src', 'ip.dst', 'ip.ttl'], expect: { 'eth.dst': 'mSrv', 'eth.src': 'r3b', 'ip.src': 'pc', 'ip.dst': 'srv', 'ip.ttl': 't61' },
          hand: ['r2b', 'r3a', 'r3b', 'mSrv', 'ip3', 'pc', 'srv', 't62', 't61', 't60'],
          why: { 'eth.dst': '이제 서버가 같은 동네다. 목적 MAC = 웹 서버.', 'eth.src': '출발 MAC = R3의 서버 쪽 포트.', 'ip.src': 'IP 봉투는 그대로.', 'ip.dst': 'IP 봉투는 그대로.', 'ip.ttl': '62 → 61.' },
          ok: '드디어 서버의 MAC이 등장했다. 서버 동네 안에서만 쓰는 주소다.' },
        { at: 20, kind: 'choice', title: '서버 도착', say: '웹 서버가 소포를 받았다. 출발할 때와 비교해 보자.',
          q: '출발할 때와 똑같이 남아 있는 것은?', o: [
            { t: '출발 MAC과 목적 MAC', why: 'MAC은 구간(홉)마다 새로 썼다.' },
            { t: 'TTL', why: '라우터 3개를 지나 64 → 61로 줄었다.' },
            { t: '출발 IP와 목적 IP', ok: true }],
          ok: '<b>IP = 끝까지 같은 최종 주소, MAC = 홉마다 바뀌는 구간 주소.</b>' },
        { at: 21, kind: 'edit', title: '서버의 답장', reset: { data: 'HTTP 200 OK', 'ip.ttl': null, 'eth.src': null, 'eth.dst': null, 'tcp.sp': null, 'tcp.dp': null, 'ip.src': null, 'ip.dst': null },
          say: '서버가 답장을 쓴다. 출발과 목적이 뒤바뀐다. 첫 홉은 <b>R3</b>. TTL은 서버가 새로 정한다(리눅스 기본 64).',
          edit: ['eth.dst', 'eth.src', 'ip.src', 'ip.dst', 'ip.ttl', 'tcp.sp', 'tcp.dp'],
          expect: { 'eth.dst': 'r3b', 'eth.src': 'mSrv', 'ip.src': 'srv', 'ip.dst': 'pc', 'ip.ttl': 't64', 'tcp.sp': 'p443', 'tcp.dp': 'p50123' },
          hand: ['r3b', 'r3a', 'mSrv', 'mPc', 'srv', 'pc', 'ip3', 't64', 't61', 'p443', 'p50123'],
          why: { 'eth.dst': { mPc: '연구실 PC는 멀리 있다. 첫 구간의 상대는 바로 옆 R3(서버 쪽 포트).', _: '답장의 첫 홉 = R3(서버 쪽 포트).' }, 'eth.src': '출발 MAC = 웹 서버.',
            'ip.src': '답장의 출발 IP = 웹 서버.', 'ip.dst': '답장의 목적 IP = 연구실 PC(최종 목적지).', 'ip.ttl': { t61: '61은 요청이 도착했을 때 남은 값이다. 답장은 서버가 새로 64부터 시작한다.', _: '새 소포의 TTL은 64부터.' },
            'tcp.sp': '서버 쪽 포트 443.', 'tcp.dp': 'PC 쪽 임시 포트 50123.' },
          ok: '답장 출발! 돌아가는 길에도 라우터마다 MAC과 TTL이 바뀐다.' },
        { at: 26, kind: 'choice', title: '돌아오는 길', say: '답장이 R3 → R2 → R1을 거꾸로 지나고 있다.',
          q: 'R2를 지날 때 바뀌는 것은?', o: [
            { t: '이더넷 봉투(출발·목적 MAC)와 TTL', ok: true },
            { t: '목적 IP', why: '목적 IP는 끝까지 연구실 PC다.' },
            { t: '출발 포트', why: '라우터는 TCP 봉투를 건드리지 않는다.' }],
          ok: '오는 길도 원리는 똑같다.', auto: { 'eth.src': 'r1a', 'eth.dst': 'mPc', 'ip.ttl': 't61' } },
        { at: 28, kind: 'choice', title: '연구실 도착', say: '답장이 연구실 PC에 도착했다.',
          q: '도착한 답장의 출발 MAC은 누구의 것일까?', o: [
            { t: '웹 서버', why: '서버의 MAC은 데이터센터 구간에서만 쓰였다.' },
            { t: 'R1 (연구실 쪽 포트)', ok: true },
            { t: 'R3', why: 'R3의 MAC은 데이터센터와 ISP 사이 구간에서 쓰였다.' }],
          ok: '마지막 구간을 건넨 장비는 우리 Gateway R1이다.' }
      ],
      note: { 'W2-5': 'R1~R3을 지날 때마다 이더넷 봉투(MAC)와 TTL만 바뀌었고, IP 봉투(연구실 PC → 웹 서버)는 끝까지 그대로였다.' } },

    /* =========================================== 4 */
    { title: '공유기의 장부', desc: '세 기기가 하나의 공인 IP로 나간다. 돌아온 답장은 누구 것?', qc: ['W2-6'], nat: true,
      show: ['eth', 'ip', 'tcp'], st: stickers(HOME),
      tiles: { 0: ['💻', '내 노트북 192.168.0.10'], 2: ['🤔', '사설 주소의 한계'], 4: ['📡', '공유기 · 나가는 길'], 13: ['🖥️', '웹 서버'], 22: ['📡', '공유기 · 들어오는 길'] },
      zones: [[1, '〰️', '집 안 랜선'], [5, '🌐', '인터넷'], [14, '🌐', '돌아오는 길'], [23, '〰️', '집 안 랜선']],
      start: { data: 'GET / (웹 페이지)', 'tcp.sp': 'p51234', 'tcp.dp': 'p443', 'ip.src': 'me', 'ip.dst': 'srv', 'ip.ttl': 't64', 'eth.src': 'mMe', 'eth.dst': 'mGw' },
      ledger: [{ who: '동생 노트북', a: '192.168.0.11:51234', b: '198.51.100.7:40002' }, { who: '거실 TV', a: '192.168.0.20:49152', b: '198.51.100.7:40003' }],
      gates: [
        { at: 2, kind: 'choice', title: '사설 주소의 한계', say: '내 노트북 주소는 <b>192.168.0.10</b>. 이웃집 노트북도 192.168.0.10일 수 있다.',
          q: '인터넷의 라우터가 192.168.0.10으로 답장을 보내 줄 수 있을까?', o: [
            { t: '있다. 모든 라우터가 사설 주소로 가는 길도 안다', why: '사설 대역(10/8, 172.16/12, 192.168/16)은 집집마다 겹쳐 쓰는 주소라 인터넷에서 라우팅되지 않는다.' },
            { t: '없다. 사설 주소는 인터넷에서 길을 찾을 수 없다', ok: true },
            { t: '있다. ISP가 노트북마다 공인 IP를 따로 붙여 준다', why: '집에 받는 공인 IP는 공유기의 것 하나뿐이다.' }],
          ok: '그래서 공유기가 나갈 때 출발지를 <b>자기 공인 IP</b>로 바꿔 준다. 이게 NAT.' },
        { at: 4, kind: 'edit', title: 'NAT: 출발지 바꾸기',
          say: '공유기가 출발지를 공인 주소로 바꾸고 <b>장부</b>에 적는다. 방금 <b>동생 노트북도 51234번</b>으로 나갔다! 장부를 보고 내 소포에 <b>아직 안 쓴 공인 포트</b>를 붙이자.',
          edit: ['ip.src', 'tcp.sp'], expect: { 'ip.src': 'pub', 'tcp.sp': 'p40001' },
          hand: ['pub', 'me', 'gw', 'srv', 'p51234', 'p40001', 'p40002', 'p443'],
          why: { 'ip.src': { me: '192.168.0.10은 인터넷에서 쓸 수 없는 사설 주소다.', gw: '192.168.0.1은 공유기의 집 안쪽 주소(사설)다. 인터넷 쪽 공인 IP를 써야 한다.', _: '인터넷으로 나가는 출발 IP = 공유기의 공인 IP 198.51.100.7.' },
            'tcp.sp': { p51234: '동생도 51234였다. 공인 포트를 51234로 쓰면 돌아온 답장이 누구 것인지 구분할 수 없다.', p40002: '40002는 이미 동생 연결이 쓰고 있다(장부 확인).', _: '아직 장부에 없는 새 공인 포트 40001.' } },
          auto: { 'eth.src': 'mGwO', 'eth.dst': 'mIsp', 'ip.ttl': 't63' },
          ledgerAdd: { who: '내 노트북', a: '192.168.0.10:51234', b: '198.51.100.7:40001' },
          ok: '장부 기록: <b>192.168.0.10:51234 ↔ 198.51.100.7:40001</b>. 이더넷 봉투와 TTL은 공유기가 라우터로서 함께 바꿨다.' },
        { at: 13, kind: 'edit', title: '서버의 답장', reset: { data: 'HTTP 200 OK', 'ip.ttl': 't64', 'tcp.sp': null, 'tcp.dp': null, 'ip.src': null, 'ip.dst': null, 'eth.src': null, 'eth.dst': null },
          say: '서버가 답장을 쓴다. 서버는 공유기 뒤의 노트북을 모른다. <b>서버가 본 손님은 누구</b>였을까?',
          edit: ['ip.src', 'ip.dst', 'tcp.sp', 'tcp.dp'], expect: { 'ip.src': 'srv', 'ip.dst': 'pub', 'tcp.sp': 'p443', 'tcp.dp': 'p40001' },
          hand: ['srv', 'pub', 'me', 'gw', 'p443', 'p40001', 'p51234', 'p40002'],
          why: { 'ip.dst': { me: '서버가 받은 소포의 출발지는 198.51.100.7이었다. 192.168.0.10은 서버가 볼 수도, 보낼 수도 없다.', _: '서버가 본 손님 = 공유기의 공인 IP.' },
            'tcp.dp': { p51234: '서버가 본 출발 포트는 공유기가 바꾼 40001이다.', _: '서버가 본 출발 포트 40001로 돌려보낸다.' }, 'ip.src': '출발 = 웹 서버.', 'tcp.sp': '서버 쪽 443.' },
          auto: { 'eth.src': 'mSrv', 'eth.dst': null },
          ok: '서버 입장에선 198.51.100.7:40001이 손님이다. NAT 뒤의 사설 주소는 보이지 않는다.' },
        { at: 22, kind: 'edit', title: '답장 #1 분배', reset: { data: '답장 #1', 'tcp.sp': 'p443', 'ip.src': 'srv', 'ip.dst': 'pub', 'tcp.dp': 'p40003', 'ip.ttl': 't61', 'eth.src': 'mIsp', 'eth.dst': 'mGwO' },
          say: '같은 공인 IP로 답장 <b>세 통</b>이 한꺼번에 돌아왔다! 첫 번째는 <b>:40003</b>행. <b>장부</b>를 보고 원래 기기의 사설 주소로 되돌리자.',
          edit: ['ip.dst', 'tcp.dp'], expect: { 'ip.dst': 'tv', 'tcp.dp': 'p49152' },
          hand: ['me', 'sib', 'tv', 'pub', 'p51234', 'p49152', 'p40003'],
          why: { _: '장부에서 198.51.100.7:40003 줄을 찾자 → 거실 TV 192.168.0.20:49152.' },
          ok: '40003 → 거실 TV.' },
        { at: 22, kind: 'edit', title: '답장 #2 분배', reset: { data: '답장 #2', 'tcp.sp': 'p443', 'ip.src': 'srv', 'ip.dst': 'pub', 'tcp.dp': 'p40002', 'ip.ttl': 't61', 'eth.src': 'mIsp', 'eth.dst': 'mGwO' },
          say: '두 번째는 <b>:40002</b>행. 사설 포트가 나와 똑같이 51234인 그 연결이다.',
          edit: ['ip.dst', 'tcp.dp'], expect: { 'ip.dst': 'sib', 'tcp.dp': 'p51234' },
          hand: ['me', 'sib', 'tv', 'pub', 'p51234', 'p49152', 'p40002'],
          why: { 'ip.dst': { me: '사설 포트는 나도 51234지만 공인 포트 40002는 동생 연결이다. 공유기는 공인 포트로 구분한다.', _: '장부: 40002 → 동생 노트북 192.168.0.11:51234.' }, _: '장부: 40002 → 192.168.0.11:51234.' },
          ok: '40002 → 동생 노트북. 사설 포트가 같아도 공인 포트가 달라서 구분됐다.' },
        { at: 22, kind: 'edit', title: '답장 #3 분배', reset: { data: '답장 #3 (내 웹 페이지)', 'tcp.sp': 'p443', 'ip.src': 'srv', 'ip.dst': 'pub', 'tcp.dp': 'p40001', 'ip.ttl': 't61', 'eth.src': 'mIsp', 'eth.dst': 'mGwO' },
          say: '마지막은 <b>:40001</b>행.',
          edit: ['ip.dst', 'tcp.dp'], expect: { 'ip.dst': 'me', 'tcp.dp': 'p51234' },
          hand: ['me', 'sib', 'tv', 'pub', 'p51234', 'p49152', 'p40001'],
          why: { _: '장부: 40001 → 내 노트북 192.168.0.10:51234.' },
          auto: { 'eth.src': 'mGw', 'eth.dst': 'mMe', 'ip.ttl': 't60' },
          ok: '세 통 모두 주인에게! <b>장부(NAT 테이블)</b>가 있어서 하나의 공인 IP를 여러 기기가 나눠 쓸 수 있다.' },
        { at: 28, kind: 'choice', title: '내 노트북 도착', say: '답장이 내 노트북에 도착했다.',
          q: '내 노트북이 받은 답장의 출발지는?', o: [
            { t: '198.51.100.7:40001 (공유기)', why: '공유기는 들어오는 길에 <b>목적지</b>만 원래대로 바꿨다. 출발지는 서버 그대로다.' },
            { t: '203.0.113.10:443 (웹 서버)', ok: true },
            { t: '192.168.0.1:443 (공유기 안쪽)', why: '공유기는 출발지를 건드리지 않았다.' }],
          ok: '노트북은 웹 서버와 직접 대화한다고 느낀다. 중간의 번역은 공유기가 몰래 해 준다.' }
      ],
      note: { 'W2-6': '공유기는 나갈 때 출발지를 198.51.100.7:4000x로 바꿔 장부에 적었고, 돌아온 답장 세 통은 장부를 보고 원래 기기의 사설 IP:포트로 되돌려 줬다.' } },

    /* =========================================== 5 */
    { title: '패킷 월드 투어', desc: '포장부터 귀가까지 혼자서. 갈림길, ARP, NAT, 라우터 2개.', qc: ['W2-3', 'W2-4', 'W2-5', 'W2-6'], nat: true,
      show: ['eth', 'ip', 'tcp'],
      st: stickers({
        me: HOME.me, gw: HOME.gw, pub: HOME.pub, srv: K('203.0.113.80', 'IP', '게임 서버'), sib: HOME.sib,
        mMe: HOME.mMe, mGw: HOME.mGw, mGwO: HOME.mGwO, ra: K('00:1b:21:00:02:01', 'MAC', 'ISP 라우터 (집 쪽)'), rb: K('00:1b:21:00:02:02', 'MAC', 'ISP 라우터 (밖 쪽)'),
        da: K('00:50:56:00:03:01', 'MAC', 'DC 라우터 (ISP 쪽)'), db: K('00:50:56:00:03:02', 'MAC', 'DC 라우터 (서버 쪽)'), mSrv: K('52:54:00:00:00:80', 'MAC', '게임 서버'),
        ipR: K('192.0.2.1', 'IP', 'ISP 라우터'),
        p443: HOME.p443, p52000: K('52000', '포트', '임시 포트'), p40010: K('40010', '포트', '공유기 새 포트'), p40009: K('40009', '포트', '공유기 포트 (동생)'), p8000: K('8000', '포트', '내 FastAPI')
      }),
      tiles: { 0: ['💻', '내 노트북 192.168.0.10/24'], 2: ['🔀', '갈림길'], 3: ['🔎', 'ARP'], 7: ['📡', '공유기 · 나가는 길'], 12: ['🛰️', 'ISP 라우터'], 17: ['🗄️', 'DC(데이터센터) 라우터'], 19: ['🎮', '게임 서버'], 20: ['📨', '서버의 답장'], 26: ['📡', '공유기 · 들어오는 길'] },
      zones: [[1, '〰️', '집 안 랜선'], [8, '🌐', '인터넷'], [13, '🌐', '인터넷'], [18, '〰️', '데이터센터'], [21, '🌐', '돌아오는 길'], [27, '〰️', '집 안 랜선']],
      ledger: [{ who: '동생 노트북', a: '192.168.0.11:52000', b: '198.51.100.7:40009' }],
      gates: [
        { at: 0, kind: 'order', title: '포장 순서', reset: { data: 'LOGIN 요청', 'ip.ttl': 't64' }, say: '게임 서버 <b>203.0.113.80:443</b>에 로그인 요청! 먼저 포장 순서.',
          ok: '데이터 → TCP → IP → 이더넷.' },
        { at: 0, kind: 'edit', title: '주소 쓰기', say: '출발 포트는 운영체제가 고른 임시 포트 <b>52000</b>.',
          edit: ['ip.src', 'ip.dst', 'tcp.sp', 'tcp.dp'], expect: { 'ip.src': 'me', 'ip.dst': 'srv', 'tcp.sp': 'p52000', 'tcp.dp': 'p443' },
          hand: ['me', 'srv', 'gw', 'pub', 'p443', 'p52000', 'p8000', 'mSrv'],
          why: { 'ip.dst': '최종 목적지 = 게임 서버.', 'ip.src': '지금은 아직 집 안. 출발 IP = 내 노트북(사설).', 'tcp.sp': '임시 포트 52000.', 'tcp.dp': '서버의 443.' },
          ok: '주소 완성.' },
        { at: 2, kind: 'choice', title: '갈림길', say: '내 주소 192.168.0.10/24, 목적지 203.0.113.80.',
          q: '어떻게 보낼까?', o: [
            { t: '다른 동네 → Default Gateway에게', ok: true },
            { t: '같은 동네 → 직접', why: '192.168.0.0 ≠ 203.0.113.0.' },
            { t: 'DNS 서버에게 맡긴다', why: 'DNS는 이름을 IP로 바꿔 줄 뿐, 소포를 전달하지 않는다.' }],
          ok: 'Gateway의 MAC을 ARP로 알아내자.' },
        { at: 3, kind: 'edit', title: 'ARP: Gateway MAC', say: '공유기가 ARP에 답했다.',
          edit: ['eth.dst', 'eth.src', 'ip.dst'], expect: { 'eth.dst': 'mGw', 'eth.src': 'mMe', 'ip.dst': 'srv' },
          hand: ['mGw', 'mGwO', 'mMe', 'mSrv', 'gw', 'srv'],
          why: { 'eth.dst': { mGwO: '그건 공유기의 인터넷 쪽 포트다. 집 안에서 닿는 건 집 안쪽 포트.', _: '동네 밖 → 목적 MAC = Gateway(집 안쪽).' }, 'ip.dst': '목적 IP는 최종 목적지 그대로.', 'eth.src': '내 노트북.' },
          ok: '출발!' },
        { at: 7, kind: 'edit', title: '공유기: NAT + 새 이더넷 봉투',
          say: '공유기는 <b>라우터이면서 NAT</b>다. 이번엔 전부 직접! 출발 IP:포트(장부 확인), 다음 구간(ISP 라우터) 이더넷 봉투, TTL까지.',
          edit: ['eth.dst', 'eth.src', 'ip.src', 'ip.dst', 'ip.ttl', 'tcp.sp'], expect: { 'eth.dst': 'ra', 'eth.src': 'mGwO', 'ip.src': 'pub', 'ip.dst': 'srv', 'ip.ttl': 't63', 'tcp.sp': 'p40010' },
          hand: ['ra', 'rb', 'mGw', 'mGwO', 'mSrv', 'pub', 'me', 'srv', 'p40010', 'p40009', 'p52000', 't64', 't63'],
          why: { 'ip.src': 'NAT: 출발 IP를 공유기 공인 IP로.', 'tcp.sp': { p40009: '40009는 동생 연결이 쓰고 있다(장부). 그리고 동생의 사설 포트도 52000이다!', p52000: '동생도 사설 포트 52000으로 나갔다. 그대로 쓰면 겹친다.', _: '새 공인 포트 40010.' },
            'ip.dst': '목적 IP는 그대로(게임 서버).', 'eth.src': '공유기의 인터넷 쪽 포트.', 'eth.dst': '다음 홉 = ISP 라우터(집 쪽).', 'ip.ttl': '64 → 63.' },
          ledgerAdd: { who: '내 노트북', a: '192.168.0.10:52000', b: '198.51.100.7:40010' },
          ok: '장부 기록: 192.168.0.10:52000 ↔ 198.51.100.7:40010. NAT가 아니면 라우터는 IP를 바꾸지 않는다.' },
        { at: 12, kind: 'edit', title: 'ISP 라우터', say: '다음 구간은 데이터센터 라우터.',
          edit: ['eth.dst', 'eth.src', 'ip.src', 'ip.dst', 'ip.ttl'], expect: { 'eth.dst': 'da', 'eth.src': 'rb', 'ip.src': 'pub', 'ip.dst': 'srv', 'ip.ttl': 't62' },
          hand: ['ra', 'rb', 'da', 'db', 'mSrv', 'ipR', 'pub', 'me', 'srv', 't63', 't62', 't61'],
          why: { 'ip.src': { me: '사설 주소는 공유기에서 이미 사라졌다. 출발 IP는 공인 198.51.100.7 그대로.', _: 'IP는 그대로(198.51.100.7).' }, 'ip.dst': 'IP는 그대로.', 'eth.src': 'ISP 라우터의 밖 쪽(데이터센터 방향) 포트.', 'eth.dst': '다음 홉 = 데이터센터 라우터(ISP 쪽).', 'ip.ttl': '63 → 62.' },
          ok: 'MAC과 TTL만 바뀌었다.' },
        { at: 17, kind: 'edit', title: '데이터센터 라우터', say: '서버와 같은 동네. 마지막 구간!',
          edit: ['eth.dst', 'eth.src', 'ip.src', 'ip.dst', 'ip.ttl'], expect: { 'eth.dst': 'mSrv', 'eth.src': 'db', 'ip.src': 'pub', 'ip.dst': 'srv', 'ip.ttl': 't61' },
          hand: ['rb', 'da', 'db', 'mSrv', 'pub', 'srv', 'ipR', 't62', 't61', 't60'],
          why: { 'eth.dst': '같은 동네의 게임 서버.', 'eth.src': '데이터센터 라우터의 서버 쪽 포트.', 'ip.src': 'IP는 그대로.', 'ip.dst': 'IP는 그대로.', 'ip.ttl': '62 → 61.' },
          ok: '도착 직전!' },
        { at: 19, kind: 'choice', title: '게임 서버 도착', say: '서버가 요청을 받았다.',
          q: '서버 입장에서 이 요청은 누가 보냈을까?', o: [
            { t: '192.168.0.10:52000 (내 노트북)', why: 'NAT 뒤의 사설 주소는 서버에게 보이지 않는다.' },
            { t: '데이터센터 라우터', why: '라우터는 IP 봉투의 출발지를 바꾸지 않는다(NAT 제외).' },
            { t: '198.51.100.7:40010 (우리 집 공유기)', ok: true }],
          ok: '맞다. 서버는 공유기의 공인 주소로 답한다.' },
        { at: 20, kind: 'edit', title: '서버의 답장', reset: { data: 'LOGIN OK', 'ip.ttl': null, 'eth.src': null, 'eth.dst': null, 'tcp.sp': null, 'tcp.dp': null, 'ip.src': null, 'ip.dst': null },
          say: '답장을 전부 써 보자. 첫 홉은 데이터센터 라우터, TTL은 새로 64.',
          edit: ['eth.dst', 'eth.src', 'ip.src', 'ip.dst', 'ip.ttl', 'tcp.sp', 'tcp.dp'],
          expect: { 'eth.dst': 'db', 'eth.src': 'mSrv', 'ip.src': 'srv', 'ip.dst': 'pub', 'ip.ttl': 't64', 'tcp.sp': 'p443', 'tcp.dp': 'p40010' },
          hand: ['db', 'da', 'mSrv', 'mMe', 'srv', 'pub', 'me', 't64', 't61', 'p443', 'p40010', 'p52000'],
          why: { 'ip.dst': '서버가 본 손님 = 198.51.100.7.', 'tcp.dp': '서버가 본 출발 포트 = 40010.', 'eth.dst': { mMe: '내 노트북은 멀리 있다. 첫 홉은 데이터센터 라우터(서버 쪽).', _: '첫 홉 = 데이터센터 라우터(서버 쪽).' },
            'eth.src': '게임 서버.', 'ip.src': '게임 서버.', 'ip.ttl': '새 소포는 64부터.', 'tcp.sp': '443.' },
          ok: '답장 출발!' },
        { at: 26, kind: 'edit', title: '공유기: 장부 보고 되돌리기', reset: { 'ip.ttl': 't62', 'eth.src': 'ra', 'eth.dst': 'mGwO' },
          say: '답장이 공유기(인터넷 쪽)에 도착했다(TTL 62). 장부를 보고 원래 주인에게, 그리고 집 안 구간 이더넷 봉투로!',
          edit: ['eth.dst', 'eth.src', 'ip.dst', 'ip.ttl', 'tcp.dp'], expect: { 'eth.dst': 'mMe', 'eth.src': 'mGw', 'ip.dst': 'me', 'ip.ttl': 't61', 'tcp.dp': 'p52000' },
          hand: ['mMe', 'mGw', 'mGwO', 'ra', 'me', 'sib', 'pub', 't62', 't61', 'p52000', 'p40010', 'p40009'],
          why: { 'ip.dst': { sib: '장부의 40010 줄은 내 노트북이다. 동생은 40009.', _: '장부: 40010 → 192.168.0.10:52000.' }, 'tcp.dp': '장부: 40010 → 사설 포트 52000.',
            'eth.dst': '집 안 마지막 구간 → 내 노트북.', 'eth.src': '공유기의 집 안쪽 포트.', 'ip.ttl': '62 → 61.' },
          ok: '번역 완료.' },
        { at: 28, kind: 'choice', title: '귀가', say: '로그인 성공! 여행을 돌아보자.',
          q: '이번 여행에서 IP 주소가 바뀐 곳은?', o: [
            { t: '라우터를 지날 때마다', why: '라우터에서는 MAC과 TTL만 바뀌었다.' },
            { t: '한 번도 안 바뀌었다', why: 'NAT가 나갈 때 출발지를, 들어올 때 목적지를 바꿨다.' },
            { t: '공유기(NAT)에서만', ok: true }],
          ok: '월드 투어 완주!' }
      ],
      note: { 'W2-3': '192.168.0.10(집)과 52000·443(방)을 각각 IP 봉투와 TCP 봉투에 붙였다.', 'W2-4': '게임 서버는 동네 밖이라 Gateway의 MAC으로 맡겼다.', 'W2-5': '라우터 두 곳에서 MAC과 TTL만 바뀌고 IP는 그대로였다.', 'W2-6': '공유기가 52000 → 40010으로 바꿔 장부에 적고, 답장을 장부대로 되돌렸다.' } }
  ];

  /* ------------------------------------------------------------ 이벤트 카드 */
  var QUIZ = [
    ['같은 PC 안에서 127.0.0.1로 보낸 소포는 랜선을 탄다.', false, '127.0.0.1(loopback)은 PC 안에서 되돌아온다.'],
    ['포트 번호는 TCP/UDP 헤더에 들어간다.', true, 'IP 헤더에는 IP, TCP/UDP 헤더에는 포트.'],
    ['라우터를 지날 때마다 목적지 IP가 다음 라우터의 IP로 바뀐다.', false, '바뀌는 건 MAC(다음 장비)이다. 목적 IP는 최종 목적지 그대로.'],
    ['같은 서브넷의 기기에게 보낼 때도 반드시 Gateway를 거친다.', false, 'Gateway는 서브넷 밖으로 갈 때만 필요하다.'],
    ['192.168.x.x 주소는 인터넷 라우터가 직접 길을 찾아 준다.', false, '사설 대역은 인터넷에서 라우팅되지 않는다. 그래서 NAT가 필요하다.'],
    ['TTL은 라우터를 지날 때마다 1씩 줄어든다.', true, '0이 되면 버려진다. 길을 잃은 소포가 영원히 돌지 않게 하는 장치.'],
    ['ARP는 IP 주소로 같은 동네 기기의 MAC 주소를 알아내는 절차다.', true, '"192.168.0.1 누구야?" → "나야, 내 MAC은 …".'],
    ['브라우저의 출발 포트는 항상 443으로 고정이다.', false, '443은 서버 쪽 포트다. 브라우저 쪽은 운영체제가 고른 임시 포트.'],
    ['포트 번호는 16비트라 0~65535 범위다.', true, '2^16 = 65536개.'],
    ['스위치는 IP 주소를 보고 소포를 전달한다.', false, '스위치는 2계층 장비라 MAC 주소를 본다.'],
    ['공유기는 NAT 장부를 보고 돌아온 답장을 원래 기기에 돌려준다.', true, '공인 IP:포트 ↔ 사설 IP:포트 대응표.'],
    ['0.0.0.0에 bind하면 인터넷 어디서나 자동으로 접속된다.', false, '모든 인터페이스에서 받겠다는 뜻일 뿐, 외부 공개는 NAT·방화벽이 정한다.']
  ];
  var MOVES = [
    ['⚡', '광케이블 구간! 앞으로 2칸', 2], ['🗂️', 'ARP 캐시 적중! 앞으로 1칸', 1], ['🚧', '링크 혼잡… 뒤로 1칸', -1], ['🚀', '한산한 회선! 앞으로 3칸', 3]
  ];

  /* ------------------------------------------------------------ 상태 */
  var S = null;
  function cfgSt(key) { return S.cfg.st[key]; }
  function vOf(key) { return key ? (cfgSt(key) || { v: key }).v : null; }
  function newState(si) {
    var cfg = STAGES[si], pk = { data: '' };
    FIELDS.forEach(function (f) { pk[f] = null; });
    if (cfg.start) for (var k in cfg.start) pk[k] = cfg.start[k];
    var gates = cfg.gates.map(function (g, i) { return Object.assign({ i: i }, g); });
    return { si: si, cfg: cfg, pos: 0, gates: gates, gi: 0, hearts: 5, mode: 'idle', pk: pk, ed: null, sel: null, selStk: null, bad: {},
      ledger: (cfg.ledger || []).map(function (r) { return Object.assign({}, r); }), newLedger: -1,
      dice: null, rolling: false, turns: 0, msg: null, record: [], st: { wrong: 0, quizOk: 0, quizBad: 0, events: 0 }, opts: null, xopt: {}, order: [], over: false };
  }
  function gate() { return S.gates[S.gi]; }
  function nextGateAt() { var g = gate(); return g ? g.at : N; }
  function lastGateAt() { var a = 0; for (var i = 0; i < S.gi; i++) a = S.gates[i].at; return a; }

  /* ------------------------------------------------------------ 진행 */
  function startStage(si) {
    S = newState(si);
    NA.ui.briefing(ov, 'STAGE ' + (si + 1) + ' · ' + S.cfg.title, brief(S.cfg), function () { render(); arrive(); });
  }
  function brief(c) {
    var b = {
      0: '내 말은 <b>패킷(소포)</b>. 주사위를 굴려 말판을 한 바퀴 돈다. 시간 제한은 없다.<br>' +
        '<b>관문 칸</b>(노란 칸)에서는 주사위 눈이 남아도 멈춘다. 소포 봉투에 <b>주소 스티커</b>를 붙이거나 질문에 답해야 지나간다.<br>' +
        '봉투 칸을 누르고 → 아래 스티커를 누르면 붙는다. 다 붙였으면 <b>봉인하고 출발</b>. 틀리면 반송되고 신뢰도 −1.<br>' +
        '이번 무대는 <b>노트북 안</b>. 브라우저 → FastAPI(:8000) → DB(:5432) → 다시 브라우저.',
      1: '내 노트북 <b>192.168.0.10/24</b>. 같은 동네 프린터와 동네 밖 웹 서버에 각각 소포를 보낸다.<br>' +
        '이번부터 <b>이더넷 봉투(MAC)</b>가 생긴다. MAC은 "바로 다음 장비", IP는 "최종 목적지".<br>' +
        '갈림길에서 같은 동네인지 판단하고, <b>동네 밖이면 Default Gateway</b>에게 맡긴다.',
      2: '연구실 PC(공인 IP)에서 웹 서버까지 <b>라우터 3개</b>를 지난다.<br>' +
        '라우터 관문마다 봉투의 <b>모든 칸을 고칠 수 있다</b>. 무엇을 바꾸고 무엇을 그대로 둘지가 이번 과제.<br>' +
        '힌트: 이더넷 봉투는 구간마다 새로. TTL은 라우터마다 1씩 감소.',
      3: '집에는 <b>내 노트북, 동생 노트북, 거실 TV</b>가 있고, 인터넷 쪽 주소는 공유기의 공인 IP <b>198.51.100.7</b> 하나뿐이다.<br>' +
        '공유기가 나가는 소포의 출발지를 바꾸고 <b>NAT 장부</b>(소포 판 아래)에 적는다. 돌아온 답장은 장부를 보고 원래 기기로.',
      4: '포장, 갈림길, ARP, NAT, 라우터 2개, 답장, 되돌리기까지 <b>혼자서</b> 해 본다.<br>' +
        '스티커가 많고 함정도 섞여 있다. 소포 판의 칸 이름과 스티커의 주인을 잘 보자.'
    };
    return b[c === STAGES[0] ? 0 : STAGES.indexOf(c)];
  }

  function arrive() {
    // 현재 위치에서 할 일: 관문 → 이벤트 → 굴리기
    if (S.over) return;
    var g = gate();
    if (g && g.at === S.pos) return startGate(g);
    if (S.pos >= N) return finish();
    var t = tileOf(S.pos);
    if (t.t === 'ev' && !S.evDone[S.pos]) { S.evDone[S.pos] = true; return startEvent(); }
    S.mode = 'roll';
    S.msg = { who: '가이드', t: S.turns === 0 ? '주사위를 굴려 출발하자. <span class="key">Space</span>' : '주사위를 굴리자. 다음 관문까지 <b>' + (nextGateAt() - S.pos) + '칸</b>.' };
    render();
  }
  function roll() {
    if (!S || S.mode !== 'roll' || S.rolling) return;
    S.rolling = true; S.turns++;
    var me = S, n = 0, face = app.querySelector('.dice .face');
    if (face) face.classList.add('roll');
    var tm = setInterval(function () {
      if (S !== me) return clearInterval(tm);
      var f = app.querySelector('.dice .face'); if (f) f.textContent = NA.randi(1, 6);
      NA.sfx.tick(n % 2); n++;
      if (n > 8) {
        clearInterval(tm);
        var d = NA.randi(1, 6); S.dice = d; S.rolling = false;
        var target = Math.min(S.pos + d, nextGateAt());
        var stopNote = S.pos + d > nextGateAt() ? ' (관문에서 멈춤)' : '';
        S.msg = { who: '가이드', t: '🎲 <b>' + d + '</b>!' + stopNote };
        moveTo(target, arrive);
      }
    }, 70);
    render();
  }
  function moveTo(target, done) {
    var me = S; S.mode = 'moving'; render();
    (function step() {
      if (S !== me) return;
      if (S.pos === target) return done();
      S.pos += S.pos < target ? 1 : -1;
      NA.sfx.tone(520 + (S.pos % 4) * 60, .05, 'triangle', .12);
      renderBoard();
      var tl = app.querySelector('.tile[data-i="' + (S.pos % N) + '"]'); if (tl) { tl.classList.remove('hop'); void tl.offsetWidth; tl.classList.add('hop'); }
      setTimeout(step, 210);
    })();
  }

  /* ------------------------------------------------------------ 이벤트 칸 */
  function startEvent() {
    S.st.events++;
    if (Math.random() < .6) {
      var q = S.quizPool.length ? S.quizPool.pop() : NA.pick(QUIZ);
      S.mode = 'event'; S.ev = { quiz: q };
      S.msg = { who: '❓ 이벤트 퀴즈', t: '맞히면 앞으로 2칸! 틀려도 신뢰도는 깎이지 않는다.' };
    } else {
      var m = NA.pick(MOVES);
      if (m[2] < 0 && S.pos - 1 < lastGateAt()) m = MOVES[1];
      S.mode = 'event'; S.ev = { move: m };
      S.msg = { who: m[0] + ' 이벤트', t: m[1] };
    }
    NA.sfx.pop(); render();
  }
  function evAnswer(b) {
    if (!S || S.mode !== 'event' || !S.ev) return;
    var ev = S.ev;
    if (ev.quiz) {
      if (ev.answered != null) return evGo();
      ev.answered = b;
      var ok = b === ev.quiz[1];
      if (ok) { S.st.quizOk++; NA.sfx.good(); } else { S.st.quizBad++; NA.sfx.bad(); }
      S.msg = { cls: ok ? 'ok' : 'no', who: ok ? '정답! 앞으로 2칸' : '아쉽다! (' + (ev.quiz[1] ? 'O' : 'X') + ')', t: ev.quiz[2] };
      render();
    } else evGo();
  }
  function evGo() {
    var ev = S.ev, d = ev.quiz ? (ev.answered === ev.quiz[1] ? 2 : 0) : ev.move[2];
    S.ev = null;
    var target = d >= 0 ? Math.min(S.pos + d, nextGateAt()) : Math.max(S.pos + d, lastGateAt());
    if (target === S.pos) { S.mode = 'roll'; return arrive(); }
    moveTo(target, function () { S.evDone[S.pos] = true; arrive(); });
  }

  /* ------------------------------------------------------------ 관문 */
  function startGate(g) {
    if (g.reset) for (var k in g.reset) S.pk[k] = g.reset[k];
    S.before = Object.assign({}, S.pk);
    S.bad = {}; S.sel = null; S.selStk = null; S.xopt = {}; S.order = [];
    S.mode = 'gate';
    S.msg = { who: '🧭 가이드', t: g.say };
    if (g.kind === 'edit') { S.ed = {}; g.edit.forEach(function (f) { S.ed[f] = S.pk[f]; }); S.sel = g.edit[0]; }
    if (g.kind === 'choice') S.opts = NA.shuffle(g.o.map(function (o, i) { return Object.assign({ i: i }, o); }));
    if (g.kind === 'order') S.orderBtns = NA.shuffle(['tcp', 'ip', 'eth']);
    NA.sfx.tone(660, .08, 'square', .12); NA.sfx.tone(880, .1, 'square', .1, null, .07);
    render();
  }
  function pickSlot(f) {
    var g = gate(); if (!S || S.mode !== 'gate' || g.kind !== 'edit' || g.edit.indexOf(f) < 0) return;
    if (S.selStk) { place(f, S.selStk); S.selStk = null; }
    else S.sel = f;
    render();
  }
  function pickStk(key) {
    var g = gate(); if (!S || S.mode !== 'gate' || g.kind !== 'edit') return;
    if (S.sel) {
      place(S.sel, key);
      // 다음 빈 칸(또는 다음 칸)으로 자동 이동
      var i = g.edit.indexOf(S.sel), nx = null;
      for (var k = 1; k <= g.edit.length; k++) { var f = g.edit[(i + k) % g.edit.length]; if (!S.ed[f]) { nx = f; break; } }
      S.sel = nx || S.sel;
    } else S.selStk = S.selStk === key ? null : key;
    render();
  }
  function place(f, key) { S.ed[f] = key; delete S.bad[f]; NA.sfx.pop(); }
  function resetEdit() { var g = gate(); g.edit.forEach(function (f) { S.ed[f] = S.before[f]; }); S.bad = {}; render(); }

  function whyFor(g, f, key) {
    var w = g.why && (g.why[f] != null ? g.why[f] : g.why._);
    var txt = '';
    if (w && typeof w === 'object') txt = w[key] || w._ || '';
    else if (w) txt = w;
    var st = cfgSt(key);
    if (st && st.k !== FK[f]) txt = st.k + ' 스티커를 붙였다. ' + { tcp: 'TCP', ip: 'IP', eth: '이더넷' }[f.split('.')[0]] + ' 봉투의 이 칸에는 ' + FK[f] + '가 들어간다. ' + txt;
    return '<li><b>' + FL[f] + '</b>: ' + (txt || '이 칸의 값을 다시 생각해 보자.') + '</li>';
  }
  function seal() {
    var g = gate(); if (!S || S.mode !== 'gate' || g.kind !== 'edit') return;
    var empty = g.edit.filter(function (f) { return !S.ed[f]; });
    if (empty.length) { S.msg = { cls: 'no', who: '아직 빈 칸', t: empty.map(function (f) { return FL[f]; }).join(', ') + ' 칸이 비어 있다. 칸을 누르고 스티커를 골라 붙이자.' }; S.sel = empty[0]; NA.sfx.bad(); return render(); }
    var wrong = g.edit.filter(function (f) { return vOf(S.ed[f]) !== vOf(g.expect[f]); });
    if (wrong.length) {
      S.bad = {}; wrong.forEach(function (f) { S.bad[f] = true; });
      S.msg = { cls: 'no', who: '📦 반송! (신뢰도 −1)', t: '<ul>' + wrong.map(function (f) { return whyFor(g, f, S.ed[f]); }).join('') + '</ul>' };
      S.sel = wrong[0];
      return damage();
    }
    g.edit.forEach(function (f) { S.pk[f] = S.ed[f]; });
    pass(g);
  }
  function choose(k) {
    var g = gate(); if (!S || S.mode !== 'gate' || g.kind !== 'choice') return;
    var o = S.opts[k]; if (!o || S.xopt[k]) return;
    if (o.ok) return pass(g);
    S.xopt[k] = true;
    S.msg = { cls: 'no', who: '📦 반송! (신뢰도 −1)', t: o.why };
    damage();
  }
  function orderPick(layer) {
    var g = gate(); if (!S || S.mode !== 'gate' || g.kind !== 'order' || S.order.indexOf(layer) >= 0) return;
    S.order.push(layer); NA.sfx.pop();
    var want = ['tcp', 'ip', 'eth'];
    if (S.order[S.order.length - 1] !== want[S.order.length - 1]) {
      var nm = { tcp: 'TCP 봉투', ip: 'IP 봉투', eth: '이더넷 봉투' };
      S.msg = { cls: 'no', who: '📦 반송! (신뢰도 −1)', t: (S.order.length === 1 ? '맨 안쪽' : S.order.length + '번째') + '에 ' + nm[layer] + '? 안쪽부터 <b>위 계층</b>이다: 데이터를 먼저 TCP(4계층)가 감싸고, 그걸 IP(3계층)가, 맨 겉을 이더넷(2계층)이 감싼다.' };
      S.order = [];
      return damage();
    }
    if (S.order.length === 3) return pass(g);
    render();
  }
  function damage() {
    S.hearts--; S.st.wrong++;
    NA.sfx.bad();
    render();
    var c = app.querySelector('.center'); if (c) { c.classList.remove('shake'); void c.offsetWidth; }
    if (S.hearts <= 0) { var me = S; S.over = true; setTimeout(function () { if (S === me) debrief(false); }, 1600); }
  }
  function pass(g) {
    if (g.auto) for (var k in g.auto) S.pk[k] = g.auto[k];
    if (g.ledgerAdd) { S.ledger.push(Object.assign({}, g.ledgerAdd)); S.newLedger = S.ledger.length - 1; }
    if (g.kind === 'edit' || g.auto) S.record.push({ where: (tileOf(g.at).n), title: g.title, pk: Object.assign({}, S.pk) });
    S.mode = 'after'; S.bad = {}; S.sel = null; S.selStk = null;
    S.msg = { cls: 'ok', who: '✓ 통과! ' + g.title, t: g.ok };
    NA.sfx.good();
    render();
    app.querySelectorAll('.slot.chg').forEach(function (e) { e.classList.add('okflash'); });
  }
  function cont() {
    if (!S || S.mode !== 'after') return;
    S.gi++; S.newLedger = -1;
    var g = gate();
    if (g && g.at === S.pos) return startGate(g);
    if (S.pos >= N || !g) return finish();
    arrive();
  }
  function finish() {
    if (S.over) return; S.over = true; S.mode = 'done';
    NA.sfx.win();
    var me = S;
    var rows = S.record.map(function (r) {
      var p = r.pk;
      function cell(f) { var k = p[f]; return k ? esc((cfgSt(k) || { who: k }).who) : '—'; }
      function ipp(a, b) { return (p[a] ? vOf(p[a]) : '—') + (S.cfg.show.indexOf('tcp') >= 0 && p[b] ? ':' + vOf(p[b]) : ''); }
      return '<tr><td class="c">' + esc(r.title) + '</td>' + (S.cfg.show.indexOf('eth') >= 0 ? '<td class="m">' + cell('eth.src') + '</td><td class="m">' + cell('eth.dst') + '</td>' : '') +
        '<td class="i">' + esc(ipp('ip.src', 'tcp.sp')) + '</td><td class="i">' + esc(ipp('ip.dst', 'tcp.dp')) + '</td><td class="t">' + (p['ip.ttl'] ? vOf(p['ip.ttl']) : '—') + '</td></tr>';
    }).join('');
    var head = '<tr><th>관문</th>' + (S.cfg.show.indexOf('eth') >= 0 ? '<th>출발 MAC</th><th>목적 MAC</th>' : '') + '<th>출발 IP:포트</th><th>목적 IP:포트</th><th>TTL</th></tr>';
    var notes = { 0: '같은 127.0.0.1 안에서 포트만 바뀌며 프로그램을 오갔다.', 1: '목적 IP는 그대로인데 목적 MAC만 프린터 → Gateway로 달랐다.', 2: '보라색(MAC) 칸은 줄마다 바뀌고, 파란색(IP) 칸은 요청 내내 똑같다.', 3: '공유기에서만 IP:포트가 바뀌었다. 나갈 땐 출발지, 들어올 땐 목적지.', 4: 'MAC은 홉마다, IP는 NAT에서만 바뀌었다.' };
    setTimeout(function () {
      if (S !== me) return;
      ov.innerHTML = '<div class="na-card trip"><h2>🗺️ 여행 기록</h2><p class="note">관문을 통과할 때마다 소포의 주소를 기록했다. ' + notes[S.si] + '</p>' +
        '<table>' + head + rows + '</table><div class="na-row"><button class="na-btn primary" data-go>결산 보기 (Enter)</button></div></div>';
      ov.hidden = false;
      var done = false;
      function go() { if (done) return; done = true; window.removeEventListener('keydown', kd); debrief(true); }
      function kd(e) { if (e.key === 'Enter') { e.preventDefault(); go(); } }
      ov.querySelector('[data-go]').onclick = go;
      setTimeout(function () { window.addEventListener('keydown', kd); }, 200);
    }, 700);
  }
  function debrief(win) {
    var stars = !win ? 0 : S.hearts >= 5 ? 3 : S.hearts >= 3 ? 2 : 1;
    NA.ui.debrief({
      overlay: ov, gameId: GAME_ID, stage: S.si, win: win, stars: stars, score: S.hearts * 20 + S.st.quizOk * 5,
      title: win ? '배달 완료!' : '소포가 너무 많이 반송됐다',
      sub: win ? S.turns + '턴 만에 한 바퀴. 남은 신뢰도 ' + S.hearts + '/5.' : '신뢰도가 바닥났다. 해설을 보고 다시 출발하자.',
      stats: [['남은 신뢰도', S.hearts + '/5'], ['반송', S.st.wrong], ['턴', S.turns], ['이벤트 퀴즈', S.st.quizOk + '/' + (S.st.quizOk + S.st.quizBad)]],
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
      howto: '내 말은 <b>패킷</b>. 주사위를 굴려 말판을 한 바퀴 돈다. <b>관문 칸</b>에서는 반드시 멈춰 소포 봉투에 <b>주소 스티커</b>를 붙이거나 질문에 답한다.<br>' +
        '소포 = 이더넷 봉투(MAC) ⊃ IP 봉투(IP·TTL) ⊃ TCP 봉투(포트) ⊃ 데이터. 틀리면 반송, 신뢰도 −1. 시간 제한 없음.<br>' +
        '단축키 <span class="key">Space</span> 주사위 · <span class="key">Enter</span> 봉인/계속 · <span class="key">1</span>~<span class="key">4</span> 선택'
    });
  }

  /* ------------------------------------------------------------ 말판 */
  function ringPos(i) {
    if (i <= 9) return [0, i];
    if (i <= 13) return [i - 9, 9];
    if (i <= 23) return [5, 9 - (i - 14)];
    return [5 - (i - 23), 0];
  }
  function tileOf(i) {
    var c = S.cfg, idx = i % N;
    var gAt = {}; S.gates.forEach(function (g) { gAt[g.at % N] = true; });
    if (c.tiles[idx]) return { i: idx, ic: c.tiles[idx][0], n: c.tiles[idx][1], t: idx === 0 ? 'home' : gAt[idx] ? 'gate' : 'road' };
    if (gAt[idx]) return { i: idx, ic: '🚪', n: '관문', t: 'gate' };
    var z = c.zones[0]; c.zones.forEach(function (zz) { if (zz[0] <= idx) z = zz; });
    if (idx % 3 === 2) return { i: idx, ic: '❓', n: '이벤트', t: 'ev' };
    return { i: idx, ic: z[1], n: z[2], t: 'road' };
  }
  function renderBoard() {
    var b = app.querySelector('.board'); if (!b) return;
    b.querySelectorAll('.tile').forEach(function (el) {
      var i = +el.dataset.i, here = (S.pos % N) === i;
      el.classList.toggle('here', here);
      el.classList.toggle('passed', i < S.pos && i !== 0);
      var tk = el.querySelector('.token');
      if (here && !tk) { tk = document.createElement('div'); tk.className = 'token'; tk.textContent = '📦'; el.appendChild(tk); }
      if (!here && tk) tk.remove();
    });
  }

  /* ------------------------------------------------------------ 렌더 */
  function render() {
    if (!S) return;
    var c = S.cfg;
    var h = ''; for (var k = 0; k < 5; k++) h += k < S.hearts ? '♥' : '<i>♥</i>';
    var gDone = S.gi, gAll = S.gates.length;
    var html = '<div class="hud"><span class="t">STAGE ' + (S.si + 1) + ' · ' + esc(c.title) + '</span><span class="hearts" title="신뢰도">' + h + '</span>' +
      '<span class="cnt">관문 ' + gDone + ' / ' + gAll + ' · 턴 ' + S.turns + '</span><span class="sp"></span><button class="na-btn" data-guide>규칙</button></div><div class="board">';
    var doneAt = {}; for (var gi = 0; gi < S.gi; gi++) doneAt[S.gates[gi].at % N] = (doneAt[S.gates[gi].at % N] || 0) + 1;
    var cntAt = {}; S.gates.forEach(function (g) { cntAt[g.at % N] = (cntAt[g.at % N] || 0) + 1; });
    for (var i = 0; i < N; i++) {
      var t = tileOf(i), rc = ringPos(i), cls = 'tile ' + t.t;
      if (t.t === 'gate' && doneAt[i] === cntAt[i]) cls += ' done';
      var ty = t.t === 'gate' ? (doneAt[i] === cntAt[i] ? '✓ 통과' : '관문' + (cntAt[i] > 1 ? ' ×' + cntAt[i] : '')) : t.t === 'ev' ? '이벤트' : t.t === 'home' ? '출발 · 도착' : '';
      html += '<div class="' + cls + '" data-i="' + i + '" style="grid-row:' + (rc[0] + 1) + ';grid-column:' + (rc[1] + 1) + '"><span class="ix">' + i + '</span><span class="ic">' + t.ic + '</span><span class="nm">' + esc(t.n) + '</span><span class="ty">' + ty + '</span></div>';
    }
    html += '<div class="center"><div class="pk">' + packetHTML() + '</div><div class="side">' + sideHTML() + '</div><div class="hand">' + handHTML() + '</div></div></div>';
    app.innerHTML = html;
    renderBoard();
    bind();
  }
  function slotHTML(f) {
    var g = gate(), editing = S.mode === 'gate' && g && g.kind === 'edit' && g.edit.indexOf(f) >= 0;
    var key = editing ? S.ed[f] : S.pk[f], st = key ? cfgSt(key) : null;
    var cls = 'slot' + (f === 'ip.ttl' ? ' ttl' : '') + (key ? '' : ' empty') + (editing ? ' ed' : '') + (editing && S.sel === f ? ' sel' : '') + (S.bad[f] ? ' bad' : '');
    var prev = S.before ? S.before[f] : undefined;
    if (S.before && (S.mode === 'gate' || S.mode === 'after') && prev !== key && key) cls += ' chg';
    return '<div class="' + cls + '" data-slot="' + f + '"><span class="l">' + FL[f] + '</span><span class="v">' + (st ? esc(st.v) : '?') + '</span>' +
      (f === 'ip.ttl' ? '' : '<span class="w">' + (st ? esc(st.who) : '비어 있음') + '</span>') + '</div>';
  }
  function packetHTML() {
    var c = S.cfg, has = function (l) { return c.show.indexOf(l) >= 0; };
    var inner = '<div class="data"><span class="l">📄 데이터</span>' + esc(S.pk.data || '') + '</div>';
    var tcp = '<div class="env tcp"><div class="row"><span class="tag">TCP 봉투<small>4계층 · 포트</small></span>' + slotHTML('tcp.sp') + slotHTML('tcp.dp') + inner + '</div></div>';
    var ip = '<div class="env ip"><div class="row"><span class="tag">IP 봉투<small>3계층</small></span>' + slotHTML('ip.src') + slotHTML('ip.dst') + slotHTML('ip.ttl') + '</div>' + tcp + '</div>';
    var eth = has('eth') ? '<div class="env eth"><div class="row"><span class="tag">이더넷 봉투<small>2계층 · MAC</small></span>' + slotHTML('eth.dst') + slotHTML('eth.src') + '</div>' + ip + '</div>'
      : '<div class="env eth off"><div class="row"><span class="tag">이더넷 봉투<small>2계층</small></span><span class="none">loopback: 랜선을 타지 않으니 이더넷 봉투가 없다</span></div></div>' + ip;
    var hd = '<h3><span>📦 내 소포 (패킷)</span><span>' + (S.mode === 'gate' && gate().kind === 'edit' ? '노란 테두리 칸을 고칠 수 있다' : '') + '</span></h3>';
    var led = '';
    if (c.nat) {
      led = '<div class="ledger"><div class="h"><span>📒 공유기 NAT 장부</span><small>사설 IP:포트 ↔ 공인 IP:포트</small></div>' +
        (S.ledger.length ? S.ledger.map(function (r, i) { return '<div class="r' + (i === S.newLedger ? ' new' : '') + '"><b>' + esc(r.who) + '</b><span>' + esc(r.a) + '</span><span>↔</span><span>' + esc(r.b) + '</span></div>'; }).join('') : '<div class="empty">아직 기록 없음</div>') + '</div>';
    }
    return hd + eth + led;
  }
  function sideHTML() {
    var t = tileOf(S.pos), g = gate(), m = S.msg || { who: '', t: '' };
    var h = '<div class="where"><span>📍 ' + t.ic + ' ' + esc(t.n) + '</span><small>' + (S.mode === 'gate' || S.mode === 'after' ? '관문: ' + esc(g.title) : '칸 ' + (S.pos % N)) + '</small></div>';
    h += '<div class="msg' + (m.cls ? ' ' + m.cls : '') + '"><span class="who">' + m.who + '</span>' + m.t + '</div><div class="act">';
    if (S.mode === 'roll' || S.mode === 'moving') {
      h += '<div class="dice"><div class="face">' + (S.dice || '🎲') + '</div><button class="na-btn primary" data-roll' + (S.mode === 'roll' && !S.rolling ? '' : ' disabled') + '>주사위 굴리기 (Space)</button></div>';
    } else if (S.mode === 'event' && S.ev) {
      if (S.ev.quiz && S.ev.answered == null) h += '<div class="q">O/X: ' + esc(S.ev.quiz[0]) + '</div><div class="btns"><button class="na-btn primary" data-ox="1">O (1)</button><button class="na-btn primary" data-ox="0">X (2)</button></div>';
      else h += '<div class="btns"><button class="na-btn primary" data-evgo>계속 (Enter)</button></div>';
    } else if (S.mode === 'gate' && g.kind === 'edit') {
      h += '<div class="btns"><button class="na-btn primary" data-seal' + (S.over ? ' disabled' : '') + '>봉인하고 출발 (Enter)</button><button class="na-btn" data-reset>처음 값으로</button></div>';
    } else if (S.mode === 'gate' && g.kind === 'choice') {
      h += '<div class="q">' + esc(g.q) + '</div>' + S.opts.map(function (o, i) { return '<button class="opt' + (S.xopt[i] ? ' x' : '') + '" data-opt="' + i + '"' + (S.over ? ' disabled' : '') + '><span class="n">' + (i + 1) + '</span>' + esc(o.t) + '</button>'; }).join('');
    } else if (S.mode === 'gate' && g.kind === 'order') {
      var nm = { tcp: 'TCP 봉투', ip: 'IP 봉투', eth: '이더넷 봉투' };
      h += '<div class="orderseq">싼 순서: 📄 데이터' + S.order.map(function (l) { return ' → <b>' + nm[l] + '</b>'; }).join('') + '</div><div class="orderbox">' +
        S.orderBtns.map(function (l, i) { return '<button class="' + l + '" data-ord="' + l + '"' + (S.order.indexOf(l) >= 0 || S.over ? ' disabled' : '') + '>' + (i + 1) + '. ' + nm[l] + '</button>'; }).join('') + '</div>';
    } else if (S.mode === 'after') {
      h += '<div class="btns"><button class="na-btn primary" data-cont>계속 (Enter)</button></div>';
    }
    return h + '</div>';
  }
  function handHTML() {
    var g = gate();
    if (!(S.mode === 'gate' && g && g.kind === 'edit')) return '<h3><span>🏷️ 주소 스티커</span><span></span></h3><div class="idle">관문에서 봉투를 고칠 때 스티커가 나온다.</div>';
    var used = {}; g.edit.forEach(function (f) { if (S.ed[f]) used[S.ed[f]] = true; });
    var hint = S.sel ? '<b>' + FL[S.sel] + '</b> 칸에 붙일 스티커를 고르자' : S.selStk ? '붙일 칸을 누르자' : '칸이나 스티커를 먼저 고르자';
    return '<h3><span>🏷️ 주소 스티커 (파랑 IP · 노랑 포트 · 보라 MAC · 초록 TTL)</span><span>' + hint + '</span></h3><div class="stks">' +
      g.hand.map(function (key) {
        var s = cfgSt(key);
        return '<button class="stk ' + s.k + (s.k === 'MAC' ? ' mac' : '') + (S.selStk === key ? ' sel' : '') + (used[key] ? ' used' : '') + '" data-stk="' + key + '" title="' + esc(s.who) + '"><span class="v">' + esc(s.v) + '</span><span class="w">' + esc(s.who) + '</span></button>';
      }).join('') + '</div>';
  }
  function bind() {
    app.querySelectorAll('[data-slot]').forEach(function (e) { e.onclick = function () { pickSlot(e.dataset.slot); }; });
    app.querySelectorAll('[data-stk]').forEach(function (e) { e.onclick = function () { pickStk(e.dataset.stk); }; });
    app.querySelectorAll('[data-opt]').forEach(function (e) { e.onclick = function () { choose(+e.dataset.opt); }; });
    app.querySelectorAll('[data-ord]').forEach(function (e) { e.onclick = function () { orderPick(e.dataset.ord); }; });
    app.querySelectorAll('[data-ox]').forEach(function (e) { e.onclick = function () { evAnswer(e.dataset.ox === '1'); }; });
    var q = function (s, fn) { var e = app.querySelector(s); if (e) e.onclick = fn; };
    q('[data-roll]', roll); q('[data-seal]', seal); q('[data-reset]', resetEdit); q('[data-cont]', cont); q('[data-evgo]', function () { evAnswer(); }); q('[data-guide]', guide);
  }
  function guide() {
    var back = ov.innerHTML, wasHidden = ov.hidden;
    ov.innerHTML = '<div class="na-card guide"><h2>패킷 여행 규칙</h2>' +
      '<h4>소포 = 패킷</h4><p>안쪽부터 데이터 → <b>TCP 봉투</b>(포트: 그 집의 어느 방) → <b>IP 봉투</b>(IP: 최종 목적지 집, TTL) → <b>이더넷 봉투</b>(MAC: 바로 다음 장비).</p>' +
      '<h4>관문 칸</h4><ul><li>장비 칸에서는 주사위 눈이 남아도 멈춘다.</li><li>노란 테두리 칸을 누르고 스티커를 고르면 붙는다(스티커 먼저 골라도 된다). <b>봉인하고 출발</b>로 검사.</li><li>틀리면 반송되고 신뢰도 −1. 해설을 보고 고쳐서 다시 봉인한다.</li></ul>' +
      '<h4>기억할 규칙</h4><ul><li>목적지가 내 서브넷 밖이면 목적 MAC = Default Gateway.</li><li>라우터: 이더넷 봉투를 새로 쓰고 TTL −1. IP 봉투는 그대로.</li><li>NAT(공유기): 나갈 때 출발 IP:포트를 공인 주소로 바꾸고 장부에 기록, 들어올 때 장부대로 목적지를 되돌린다.</li></ul>' +
      '<h4>이벤트 칸</h4><p>O/X 퀴즈(맞히면 +2칸, 틀려도 감점 없음)나 이동 카드. 관문은 건너뛸 수 없다.</p>' +
      '<div class="na-row"><button class="na-btn primary" data-close>닫기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-close]').onclick = function () { ov.innerHTML = back; ov.hidden = wasHidden; };
  }

  /* ------------------------------------------------------------ 입력 */
  window.addEventListener('keydown', function (e) {
    if (!S || !ov.hidden) return;
    var k = e.key, g = gate();
    if (S.mode === 'roll' && (k === ' ' || k === 'Enter')) { e.preventDefault(); roll(); }
    else if (S.mode === 'after' && (k === 'Enter' || k === ' ')) { e.preventDefault(); cont(); }
    else if (S.mode === 'event' && S.ev) {
      if (S.ev.quiz && S.ev.answered == null) { if (k === '1' || k === 'o' || k === 'O') evAnswer(true); else if (k === '2' || k === 'x' || k === 'X') evAnswer(false); }
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); evAnswer(); }
    } else if (S.mode === 'gate' && g) {
      if (g.kind === 'edit' && k === 'Enter') { e.preventDefault(); seal(); }
      else if (g.kind === 'edit' && k === 'Escape') { S.sel = null; S.selStk = null; render(); }
      else if (g.kind === 'choice' && /^[1-4]$/.test(k)) choose(+k - 1);
      else if (g.kind === 'order' && /^[1-3]$/.test(k)) orderPick(S.orderBtns[+k - 1]);
    }
  });

  var _ns = newState;
  newState = function (si) { var s = _ns(si); s.evDone = {}; s.quizPool = NA.shuffle(QUIZ.slice()); return s; };

  window.__game = {
    state: function () { return S; }, start: startStage, stages: STAGES,
    roll: roll, slot: pickSlot, stk: pickStk, seal: seal, choose: choose, order: orderPick, cont: cont, ev: evAnswer,
    solve: function () { // 테스트용: 현재 관문의 정답을 채운다
      var g = gate(); if (!g) return;
      if (g.kind === 'edit') g.edit.forEach(function (f) { S.ed[f] = g.expect[f]; });
      if (g.kind === 'choice') return S.opts.findIndex(function (o) { return o.ok; });
      if (g.kind === 'order') return ['tcp', 'ip', 'eth'];
    }
  };
  menu();
})();
