/* 프로토콜 산성비 — 한컴타자 산성비를 네트워크 문제로.
 * 문제는 매번 무작위로 만들어진다(숫자·주소·포트·상황). 지반(♥)이 다 녹을 때까지 끝나지 않는다.
 * 한/영 상태와 상관없이 입력된다: 두벌식으로 친 한글(ㅅ체)은 영문 키(tcp)로 되돌려 비교한다.
 */
(function () {
  var GAME_ID = 'acid-rain';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));

  /* ------------------------------------------------------------ 도우미 */
  function R(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function P(a) { return a[Math.floor(Math.random() * a.length)]; }
  var YES = ['o', 'yes', 'y', '예', '네', '응', '맞다', '같다'], NO = ['x', 'no', 'n', '아니오', '아니요', '아니', '아니다', '다르다'];
  function ox(b) { return b ? YES : NO; }
  function list(cat, items) { // items: [문제, [정답들], 표시, 해설]
    return function () { var it = P(items); return { q: it[0], a: it[1], show: it[2], why: it[3] }; };
  }

  /* ------------------------------------------------------------ 문제 생성기 */
  var GENS = [
    /* ===== Week 1 ===== */
    { wk: 1, tier: 1, cat: '용어', gen: list('용어', [
      ['요청을 보내는 쪽 (역할)', ['client', '클라이언트'], 'Client', '장비 종류가 아니라 역할이다. 요청을 보내면 클라이언트.'],
      ['요청을 받아 응답하는 쪽 (역할)', ['server', '서버'], 'Server', '요청을 받아 서비스하면 서버. 노트북도 서버가 될 수 있다.'],
      ['사용자 가까이에서 처리하는 컴퓨팅', ['edge', '엣지', '에지'], 'Edge', '지연·대역폭이 중요한 일을 가까이서 한다. Cloud를 대체하지 않고 보완한다.'],
      ['필요할 때 늘렸다 줄이며 쓴 만큼 내는 운영 모델', ['cloud', '클라우드'], 'Cloud', '"남의 컴퓨터"가 아니라 운영 모델(탄력성·관리형 서비스)이다.'],
      ['초당 실어 나르는 데이터 양 (예: 1Gbps)', ['bandwidth', '대역폭'], '대역폭', '양이다. 왕복에 걸리는 시간(지연)과는 다른 값이다.'],
      ['왕복에 걸리는 시간 (약자 3글자)', ['rtt'], 'RTT', 'Round Trip Time. 거리·홉 수·큐 대기가 정한다.'],
      ['요청을 여러 서버에 나눠 주는 장치 (약자)', ['lb', '로드밸런서', 'loadbalancer'], 'LB', 'Load Balancer. 서비스 입구에서 한가한 서버로 요청을 나눈다.'],
      ['AI 모델 추론을 맡는 연산 장치', ['gpu'], 'GPU', '질문은 네트워크를 타고 데이터센터의 GPU 서버까지 간다.']]) },
    { wk: 1, tier: 1, cat: 'RTT', gen: function () {
      var r = P([5, 10, 20, 40, 80, 150]), n = R(2, 6);
      return { q: 'RTT ' + r + 'ms · 왕복 ' + n + '번 → 기다리는 시간(ms)?', a: [String(n * r)], show: n * r + 'ms', why: '왕복 횟수 × RTT = ' + n + ' × ' + r + '. 작은 요청을 여러 번 주고받으면 RTT가 시간을 정한다.' };
    } },
    { wk: 1, tier: 2, cat: '대역폭', gen: function () {
      var B = P([80, 160, 400, 800]), t = R(1, 9), S = t * B / 8;
      return { q: S + 'MB 파일 · ' + B + 'Mbps 회선 → 전송 몇 초?', a: [String(t)], show: t + '초', why: S + 'MB × 8 = ' + S * 8 + 'Mb, ÷ ' + B + 'Mbps = ' + t + '초. 바이트(B)를 비트(b)로 바꿀 때 ×8.' };
    } },
    { wk: 1, tier: 3, cat: '지연', gen: function () {
      var d = R(5, 60) * 100;
      return { q: '광섬유로 ' + d + 'km 떨어진 서버, 최소 RTT(ms)? (빛 ≈ 200km/ms)', a: [String(d / 100)], show: d / 100 + 'ms', why: '왕복 ' + d * 2 + 'km ÷ 200km/ms = ' + d / 100 + 'ms. 대역폭을 늘려도 이보다 줄일 수는 없다.' };
    } },

    /* ===== Week 2 ===== */
    { wk: 2, tier: 1, cat: '용어', gen: list('용어', [
      ['IP로 같은 네트워크 장비의 MAC을 알아내는 프로토콜', ['arp'], 'ARP', '"이 IP 가진 장비 MAC 알려 줘"를 방송으로 묻는다.'],
      ['사설 IP ↔ 공인 IP를 바꿔 주는 기능', ['nat'], 'NAT', '공유기가 장부(변환 표)에 출발지 IP·포트를 바꿔 적는다.'],
      ['다른 네트워크로 나가는 출구 (기본 ○○○○○○)', ['gateway', '게이트웨이', 'gw'], 'Gateway', '목적지가 다른 서브넷이면 기본 게이트웨이(라우터)에 맡긴다.'],
      ['라우터를 지날 때마다 새로 붙는 2계층 주소', ['mac', '맥'], 'MAC 주소', '구간마다 출발·도착 MAC이 바뀐다. IP는(NAT 없으면) 그대로.'],
      ['같은 네트워크 안 장비를 MAC으로 이어 주는 장비', ['switch', '스위치'], '스위치', '스위치는 MAC 표를 보고 포트로 전달한다.'],
      ['네트워크와 네트워크를 IP로 이어 주는 장비', ['router', '라우터'], '라우터', '라우터는 IP를 보고 다음 홉으로 넘긴다.'],
      ['IPv4 주소는 몇 비트?', ['32'], '32비트', '8비트씩 4칸. 192.168.0.1'],
      ['MAC 주소는 몇 비트?', ['48'], '48비트', '16진수 12자리. aa:bb:cc:dd:ee:ff']]) },
    { wk: 2, tier: 1, cat: 'TTL', gen: function () {
      var t = P([64, 128, 255]), n = R(2, 15);
      return { q: 'TTL ' + t + '로 출발, 라우터 ' + n + '개 지남 → 도착 TTL?', a: [String(t - n)], show: String(t - n), why: '라우터를 지날 때마다 1씩 준다. 0이 되면 버려진다(끝없는 순환 방지).' };
    } },
    { wk: 2, tier: 2, cat: '서브넷', gen: function () {
      var p = R(24, 30), n = Math.pow(2, 32 - p);
      return { q: '/' + p + ' 서브넷, 쓸 수 있는 호스트 수?', a: [String(n - 2)], show: String(n - 2), why: '주소 2^' + (32 - p) + ' = ' + n + '개 − 네트워크 주소·브로드캐스트 2개.' };
    } },
    { wk: 2, tier: 2, cat: '마스크', gen: function () {
      var p = R(25, 30), m = 256 - Math.pow(2, 32 - p);
      if (Math.random() < .5) return { q: '/' + p + ' 의 마스크 255.255.255.?', a: [String(m)], show: String(m), why: '마지막 칸 앞쪽 ' + (p - 24) + '비트가 1 → ' + m + '.' };
      return { q: '마스크 255.255.255.' + m + ' 은 /몇?', a: [String(p), '/' + p], show: '/' + p, why: '24 + 마지막 칸의 1 비트 수(' + (p - 24) + ') = ' + p + '.' };
    } },
    { wk: 2, tier: 2, cat: '사설 IP', gen: function () {
      var priv = Math.random() < .5, ip;
      if (priv) ip = P([function () { return '10.' + R(0, 255) + '.' + R(0, 255) + '.' + R(1, 254); }, function () { return '172.' + R(16, 31) + '.' + R(0, 255) + '.' + R(1, 254); }, function () { return '192.168.' + R(0, 255) + '.' + R(1, 254); }])();
      else ip = P([function () { return '172.' + P([R(1, 15), R(32, 99)]) + '.' + R(0, 255) + '.' + R(1, 254); }, function () { return '192.' + P([R(1, 167), R(169, 223)]) + '.' + R(0, 255) + '.' + R(1, 254); }, function () { return P([8, 11, 52, 104, 142, 203]) + '.' + R(0, 255) + '.' + R(0, 255) + '.' + R(1, 254); }])();
      return { q: ip + ' 는 사설 IP? (o/x)', a: ox(priv), show: priv ? '사설 IP 맞다 (o)' : '공인 IP (x)', why: '사설 대역: 10.0.0.0/8, 172.16.0.0/12(172.16~31), 192.168.0.0/16.' };
    } },
    { wk: 2, tier: 3, cat: '네트워크 주소', gen: function () {
      var p = R(25, 30), b = Math.pow(2, 32 - p), x = R(1, 254), net = Math.floor(x / b) * b, bc = net + b - 1, ip = '192.168.' + R(0, 9) + '.' + x;
      if (Math.random() < .5) return { q: ip + '/' + p + ' → 네트워크 주소 끝자리?', a: [String(net)], show: String(net), why: '/' + p + ' 블록 크기 ' + b + '. ' + x + '를 ' + b + '의 배수로 내림 → ' + net + '.' };
      return { q: ip + '/' + p + ' → 브로드캐스트 끝자리?', a: [String(bc)], show: String(bc), why: '블록 ' + net + '~' + bc + '(크기 ' + b + ')의 마지막 주소.' };
    } },
    { wk: 2, tier: 3, cat: '같은 서브넷', gen: function () {
      var p = R(25, 28), b = Math.pow(2, 32 - p), x = R(1, 254), base = Math.floor(x / b) * b, same = Math.random() < .5, y;
      if (same) { do { y = base + R(1, b - 2); } while (y === x); }
      else { do { y = R(1, 254); } while (Math.floor(y / b) * b === base); }
      return { q: '192.168.0.' + x + ' 와 192.168.0.' + y + ' (/' + p + ') 같은 서브넷? (o/x)', a: ox(same), show: same ? '같다 (o) → 직접 전달' : '다르다 (x) → 게이트웨이로', why: '/' + p + ' 블록 크기 ' + b + ': ' + x + ' → ' + base + '~' + (base + b - 1) + ' 블록. ' + y + (same ? '도 같은 블록.' : '는 다른 블록.') };
    } },

    /* ===== Week 3 ===== */
    { wk: 3, tier: 1, cat: 'TCP 플래그', gen: list('TCP 플래그', [
      ['3-way handshake의 첫 패킷 플래그', ['syn'], 'SYN', '클라이언트가 SYN으로 연결을 청한다.'],
      ['SYN을 받은 서버의 답 (플래그 2개)', ['synack', 'acksyn'], 'SYN+ACK', '내 SYN도 보내고, 네 SYN도 받았다(ACK).'],
      ['SYN+ACK를 받은 클라이언트의 마지막 답', ['ack'], 'ACK', 'SYN → SYN+ACK → ACK. 이제 ESTABLISHED.'],
      ['"더 보낼 것 없다" 연결 종료 요청 플래그', ['fin'], 'FIN', 'FIN과 ACK를 양쪽이 주고받아 4-way로 닫는다.'],
      ['연결을 즉시 강제로 끊는 플래그', ['rst'], 'RST', '닫힌 포트로 SYN이 오면 RST로 거절한다(Connection refused).']]) },
    { wk: 3, tier: 1, cat: '포트', gen: function () {
      var t = P([[80, 'HTTP', ['http']], [443, 'HTTPS', ['https']], [53, 'DNS', ['dns']], [22, 'SSH', ['ssh']], [21, 'FTP', ['ftp']], [25, 'SMTP(메일 전송)', ['smtp']]]);
      if (Math.random() < .5) return { q: t[0] + '번 포트의 서비스?', a: t[2], show: t[1], why: '잘 알려진 포트: 80 HTTP · 443 HTTPS · 53 DNS · 22 SSH · 21 FTP · 25 SMTP.' };
      return { q: t[1] + ' 기본 포트 번호?', a: [String(t[0])], show: String(t[0]), why: '잘 알려진 포트: 80 HTTP · 443 HTTPS · 53 DNS · 22 SSH · 21 FTP · 25 SMTP.' };
    } },
    { wk: 3, tier: 1, cat: 'TCP/UDP', gen: list('TCP/UDP', [
      ['화상 통화 영상 (tcp/udp)', ['udp'], 'UDP', '늦게 온 화면은 쓸모없다. 재전송 기다림 없이 다음 프레임.'],
      ['실시간 게임 캐릭터 위치 (tcp/udp)', ['udp'], 'UDP', '최신 위치만 중요하다. 지난 패킷 재전송은 오히려 방해.'],
      ['인터넷 전화(VoIP) 음성 (tcp/udp)', ['udp'], 'UDP', '조금 끊겨도 지연이 작은 쪽이 낫다.'],
      ['보통의 DNS 질의 (tcp/udp)', ['udp'], 'UDP', '질문 하나, 답 하나. 연결 준비 없이 빠르게(큰 응답은 TCP).'],
      ['파일 다운로드 (tcp/udp)', ['tcp'], 'TCP', '한 바이트도 빠지면 안 된다. 순서·재전송 보장.'],
      ['웹 페이지 HTTP/1.1 (tcp/udp)', ['tcp'], 'TCP', 'HTTP/1.1은 TCP 위에서 동작한다.'],
      ['SSH 원격 접속 (tcp/udp)', ['tcp'], 'TCP', '명령이 빠지거나 뒤섞이면 안 된다.'],
      ['이메일 전송 SMTP (tcp/udp)', ['tcp'], 'TCP', '메일 내용이 정확히 도착해야 한다.']]) },
    { wk: 3, tier: 1, cat: '소켓', gen: list('소켓', [
      ['통신 끝점을 새로 만드는 호출', ['socket'], 'socket()', '가장 먼저 소켓을 만든다.'],
      ['서버 소켓에 IP·포트를 묶는 호출', ['bind'], 'bind()', '"나는 8080번에서 받겠다"를 정한다.'],
      ['연결 요청을 받기 시작하는 호출', ['listen'], 'listen()', '대기열(backlog)을 가진 listen 소켓이 된다.'],
      ['대기열에서 연결을 꺼내 새 소켓을 받는 호출', ['accept'], 'accept()', '연결마다 새 연결 소켓이 생긴다. listen 소켓은 그대로.'],
      ['클라이언트가 서버에 연결을 요청하는 호출', ['connect'], 'connect()', '이때 3-way handshake가 일어난다.'],
      ['다 쓴 연결을 닫는 호출', ['close'], 'close()', '안 하면 CLOSE_WAIT이 쌓인다.']]) },
    { wk: 3, tier: 2, cat: 'TCP 상태', gen: list('TCP 상태', [
      ['서버가 연결을 기다리는 상태', ['listen'], 'LISTEN', 'bind → listen 후 SYN을 기다린다.'],
      ['SYN을 보내고 답을 기다리는 상태', ['synsent'], 'SYN_SENT', '클라이언트가 connect()를 부르면.'],
      ['SYN 받고 SYN+ACK 보낸 서버 상태', ['synrcvd', 'synreceived'], 'SYN_RCVD', '마지막 ACK가 오면 ESTABLISHED.'],
      ['연결이 맺어져 데이터를 주고받는 상태', ['established'], 'ESTABLISHED', 'handshake가 끝난 상태.'],
      ['FIN 받고 ACK 보냈지만 아직 close() 안 한 상태', ['closewait'], 'CLOSE_WAIT', '앱이 close()를 해야 벗어난다. 쌓이면 코드 버그.'],
      ['먼저 끊은 쪽이 마지막에 잠시 기다리는 상태', ['timewait'], 'TIME_WAIT', '마지막 ACK가 사라졌을 때를 대비해 2MSL 동안 기다린다.']]) },
    { wk: 3, tier: 2, cat: 'seq/ack', gen: function () {
      var k = R(0, 2);
      if (k === 0) { var x = R(100, 9000); return { q: 'SYN seq=' + x + ' 받음 → SYN+ACK의 ack?', a: [String(x + 1)], show: String(x + 1), why: 'SYN은 번호 하나를 쓴다. 다음에 기대하는 번호 = ' + x + ' + 1.' }; }
      if (k === 1) { var s = R(1, 90) * 100 + 1, n = P([100, 200, 500, 1000, 1460]); return { q: 'seq=' + s + ', ' + n + '바이트 받음 → 보낼 ack?', a: [String(s + n)], show: String(s + n), why: 'ack = 다음에 받고 싶은 바이트 번호 = ' + s + ' + ' + n + '.' }; }
      var a = R(2, 90) * 100 + 1; return { q: '상대가 ack=' + a + ' 를 보냄 → 내가 보낼 다음 seq?', a: [String(a)], show: String(a), why: 'ack는 "다음엔 ' + a + '번부터 줘"라는 뜻이다.' };
    } },
    { wk: 3, tier: 2, cat: '장애', gen: list('장애', [
      ['닫힌 포트, RST로 바로 거절됨 (영어 한 단어)', ['refused', 'connectionrefused', '거절'], 'Connection refused', '서버까지는 닿았지만 그 포트에서 듣는 프로그램이 없다.'],
      ['방화벽이 조용히 버려 기다리다 실패 (영어 한 단어)', ['timeout', 'timedout', '타임아웃', '시간초과'], 'Timeout', '응답이 아예 없다. 경로나 방화벽을 의심한다.'],
      ['빠른 재전송을 부르는 중복 ACK 개수', ['3'], '3개', '같은 ack가 3번 더 오면 타이머를 기다리지 않고 다시 보낸다.'],
      ['손실 후 다시 보낼 때까지 기다리는 타이머 (약자)', ['rto'], 'RTO', 'Retransmission TimeOut. RTT를 보고 정한다.']]) },
    { wk: 3, tier: 3, cat: '혼잡 제어', gen: function () {
      var k = R(0, 3);
      if (k === 0) { var c = P([1, 2, 4]), r = R(1, 4), v = c * Math.pow(2, r); return { q: '슬로 스타트, cwnd ' + c + ' → RTT ' + r + '번 뒤 cwnd? (ssthresh 넉넉)', a: [String(v)], show: String(v), why: '슬로 스타트는 RTT마다 두 배: ' + c + ' → ' + v + '.' }; }
      if (k === 1) { var c2 = R(8, 30); return { q: '혼잡 회피, cwnd ' + c2 + ' → RTT 1번 뒤 cwnd?', a: [String(c2 + 1)], show: String(c2 + 1), why: '혼잡 회피는 RTT마다 1씩(MSS 단위) 늘린다.' }; }
      if (k === 2) { var c3 = R(4, 20) * 2; return { q: 'Reno, cwnd ' + c3 + '에서 중복 ACK 3개 → 새 ssthresh?', a: [String(c3 / 2)], show: String(c3 / 2), why: '손실 신호면 ssthresh = cwnd ÷ 2.' }; }
      return { q: '타임아웃 발생! cwnd는 몇으로 돌아가나?', a: ['1'], show: '1', why: '타임아웃은 심각한 신호. cwnd 1부터 슬로 스타트를 다시 한다.' };
    } },

    /* ===== Week 4 ===== */
    { wk: 4, tier: 1, cat: '상태 코드', gen: function () {
      var t = P([[200, '성공 (OK)'], [201, '새 자원 생성됨 (Created)'], [301, '영구 이동 (Moved Permanently)'], [304, '바뀐 것 없음, 캐시 써라 (Not Modified)'],
        [400, '요청 형식이 잘못됨 (Bad Request)'], [401, '로그인(인증) 필요 (Unauthorized)'], [403, '인증돼도 권한 없음 (Forbidden)'], [404, '그런 자원 없음 (Not Found)'],
        [500, '서버 내부 오류'], [502, '프록시가 뒤 서버에게 잘못된 응답 받음'], [503, '과부하·점검으로 지금 못 함'], [504, '프록시가 뒤 서버를 기다리다 시간 초과']]);
      return { q: '상태 코드? ' + t[1], a: [String(t[0])], show: String(t[0]), why: '2xx 성공 · 3xx 이동/캐시 · 4xx 요청 쪽 문제 · 5xx 서버 쪽 문제.' };
    } },
    { wk: 4, tier: 1, cat: 'HTTP 메서드', gen: list('HTTP 메서드', [
      ['자원 조회 (HTTP 메서드)', ['get'], 'GET', '읽기만 한다. 여러 번 보내도 결과가 같다.'],
      ['새 자원 생성·제출 (HTTP 메서드)', ['post'], 'POST', '두 번 보내면 주문이 두 개 생길 수 있다(멱등 아님).'],
      ['자원을 통째로 교체 (HTTP 메서드)', ['put'], 'PUT', '같은 내용으로 여러 번 바꿔도 결과가 같다(멱등).'],
      ['자원의 일부만 수정 (HTTP 메서드)', ['patch'], 'PATCH', '바꿀 필드만 보낸다.'],
      ['자원 삭제 (HTTP 메서드)', ['delete'], 'DELETE', '여러 번 지워도 결과는 "없음"(멱등).']]) },
    { wk: 4, tier: 1, cat: 'DNS 레코드', gen: list('DNS 레코드', [
      ['이름 → IPv4 주소 (레코드)', ['a'], 'A', 'example.com → 93.184.216.34'],
      ['이름 → IPv6 주소 (레코드)', ['aaaa'], 'AAAA', 'A를 네 개 붙인 이름. IPv6 주소가 4배 길어서.'],
      ['이름 → 다른 이름(별칭) (레코드)', ['cname'], 'CNAME', 'www.example.com → example.com'],
      ['도메인의 메일 서버 (레코드)', ['mx'], 'MX', 'Mail eXchanger.'],
      ['도메인을 맡은 네임서버 (레코드)', ['ns'], 'NS', '"이 구역은 저 서버에게 물어봐".'],
      ['이름을 IP로 바꿔 주는 시스템 (약자)', ['dns'], 'DNS', 'Domain Name System.']]) },
    { wk: 4, tier: 2, cat: 'DNS 계층', gen: list('DNS 계층', [
      ['DNS 계층 맨 꼭대기 서버', ['root', '루트'], 'Root', '".com은 저기"처럼 TLD 서버를 알려 준다.'],
      ['.com·.kr을 맡은 서버 (약자)', ['tld'], 'TLD', 'Top-Level Domain. 도메인의 권한 서버를 알려 준다.'],
      ['도메인의 최종 답을 가진 서버 (○○ 서버)', ['authoritative', '권한', '권한서버', '권한있는'], '권한(Authoritative) 서버', '여기서 실제 IP를 받는다.'],
      ['나 대신 root→TLD→권한 서버를 돌아다니는 서버', ['resolver', '리졸버', '재귀리졸버'], 'Resolver', '결과를 TTL 동안 캐시한다.']]) },
    { wk: 4, tier: 2, cat: 'URL', gen: function () {
      var host = P(['shop.example.com', 'api.inu.ac.kr', 'chat.example.net', 'www.example.org']), path = P(['/cart', '/v1/users', '/login', '/index.html', '/search?q=tcp']), k = R(0, 2);
      if (k === 0) return { q: 'https://' + host + path + ' → 접속 포트?', a: ['443'], show: '443', why: '포트를 생략한 https는 443.' };
      if (k === 1) return { q: 'http://' + host + path + ' → 접속 포트?', a: ['80'], show: '80', why: '포트를 생략한 http는 80.' };
      var p = P([8080, 3000, 8443, 5000, 8000]);
      return { q: 'http://' + host + ':' + p + path + ' → 접속 포트?', a: [String(p)], show: String(p), why: '호스트 뒤 :' + p + '가 포트다. 적혀 있으면 기본값 대신 그걸 쓴다.' };
    } },
    { wk: 4, tier: 2, cat: '보안·성능', gen: list('보안·성능', [
      ['HTTPS에서 HTTP 아래 들어가는 암호화 계층', ['tls', 'ssl'], 'TLS', 'HTTP over TLS = HTTPS.'],
      ['서버가 진짜임을 증명하는 문서', ['인증서', 'certificate', 'cert'], '인증서', 'CA가 서명한 인증서로 서버 신원을 확인한다.'],
      ['요청 후 첫 바이트가 오기까지 시간 (약자)', ['ttfb'], 'TTFB', 'Time To First Byte. 크면 서버 처리가 느린 것.'],
      ['HTTPS여도 도청자가 볼 수 있는 것: 목적지 ○○', ['ip', 'ip주소'], 'IP 주소', '내용은 암호화돼도 누구와 통신하는지(IP)는 보인다.']]) },
    { wk: 4, tier: 3, cat: 'DNS TTL', gen: function () {
      var t = P([60, 300, 600, 3600]);
      if (Math.random() < .5) { var e = R(1, t / 10 - 1) * 10; return { q: 'DNS 캐시 TTL ' + t + '초, ' + e + '초 지남 → 남은 TTL(초)?', a: [String(t - e)], show: String(t - e), why: 'TTL은 캐시해도 되는 남은 시간. ' + t + ' − ' + e + '.' }; }
      var e2 = Math.random() < .5 ? R(1, t / 10 - 1) * 10 : t + R(1, 30) * 10, re = e2 >= t;
      return { q: 'TTL ' + t + '초 캐시, ' + e2 + '초 뒤 같은 이름 조회 → 다시 물어봐야? (o/x)', a: ox(re), show: re ? '다시 묻는다 (o)' : '캐시 사용 (x)', why: re ? 'TTL이 지났으니 캐시를 버리고 다시 묻는다.' : '아직 TTL 안이라 캐시된 답을 쓴다(그래서 이사한 IP가 늦게 반영되기도).' };
    } }
  ];
  var WKC = { 1: '#b18cff', 2: '#4de2ff', 3: '#ffc94d', 4: '#5dffa0' };

  var MODES = [
    { title: '전체 혼합', desc: '1~4주차 문제가 모두 섞여 내린다.', wk: [1, 2, 3, 4] },
    { title: '1주차 집중', desc: '역할 · Edge/Cloud · RTT · 대역폭 계산', wk: [1] },
    { title: '2주차 집중', desc: '서브넷 · 마스크 · 사설 IP · TTL · ARP/NAT', wk: [2] },
    { title: '3주차 집중', desc: '플래그 · 포트 · 소켓 · 상태 · seq/ack · cwnd', wk: [3] },
    { title: '4주차 집중', desc: '상태 코드 · 메서드 · DNS · URL · TLS', wk: [4] }
  ];

  /* ------------------------------------------------------------ 한/영 입력 */
  var CHO = 'rRseEfaqQtTdwWczxvg', JUNG = ['k', 'o', 'i', 'O', 'j', 'p', 'u', 'P', 'h', 'hk', 'ho', 'hl', 'y', 'n', 'nj', 'np', 'nl', 'b', 'm', 'ml', 'l'];
  var JONG = ['', 'r', 'R', 'rt', 's', 'sw', 'sg', 'e', 'f', 'fr', 'fa', 'fq', 'ft', 'fx', 'fv', 'fg', 'a', 'q', 'qt', 't', 'T', 'd', 'w', 'c', 'z', 'x', 'v', 'g'];
  var JAMO = { 'ㄱ': 'r', 'ㄲ': 'R', 'ㄳ': 'rt', 'ㄴ': 's', 'ㄵ': 'sw', 'ㄶ': 'sg', 'ㄷ': 'e', 'ㄸ': 'E', 'ㄹ': 'f', 'ㄺ': 'fr', 'ㄻ': 'fa', 'ㄼ': 'fq', 'ㄽ': 'ft', 'ㄾ': 'fx', 'ㄿ': 'fv', 'ㅀ': 'fg', 'ㅁ': 'a', 'ㅂ': 'q', 'ㅃ': 'Q', 'ㅄ': 'qt', 'ㅅ': 't', 'ㅆ': 'T', 'ㅇ': 'd', 'ㅈ': 'w', 'ㅉ': 'W', 'ㅊ': 'c', 'ㅋ': 'z', 'ㅌ': 'x', 'ㅍ': 'v', 'ㅎ': 'g',
    'ㅏ': 'k', 'ㅐ': 'o', 'ㅑ': 'i', 'ㅒ': 'O', 'ㅓ': 'j', 'ㅔ': 'p', 'ㅕ': 'u', 'ㅖ': 'P', 'ㅗ': 'h', 'ㅘ': 'hk', 'ㅙ': 'ho', 'ㅚ': 'hl', 'ㅛ': 'y', 'ㅜ': 'n', 'ㅝ': 'nj', 'ㅞ': 'np', 'ㅟ': 'nl', 'ㅠ': 'b', 'ㅡ': 'm', 'ㅢ': 'ml', 'ㅣ': 'l' };
  function qwerty(s) {
    var o = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i], c = ch.charCodeAt(0);
      if (c >= 0xAC00 && c <= 0xD7A3) { c -= 0xAC00; o += CHO[Math.floor(c / 588)] + JUNG[Math.floor((c % 588) / 28)] + JONG[c % 28]; }
      else o += JAMO[ch] || ch;
    }
    return o;
  }
  function norm(s) { return String(s).toLowerCase().replace(/[\s_\-+\/.()·,:]/g, ''); }

  /* ------------------------------------------------------------ 상태 */
  var FIELD_W = 860, FIELD_H = 560, GROUND = 30;
  var S = null, raf = 0, last = 0, uid = 0;

  function newGame(mi) {
    cancelAnimationFrame(raf);
    S = { mi: mi, mode: MODES[mi], hearts: 5, score: 0, level: 1, cleared: 0, combo: 0, maxCombo: 0, wrong: 0, missed: [], drops: [], t: 0, spawnT: 1.2,
      freeze: 0, paused: false, over: false, recent: [], scale: 1, feed: null, levelMsg: null, catMiss: {} };
    build();
    last = performance.now();
    raf = requestAnimationFrame(loop);
    toast('LEVEL 1', '답을 치고 Enter! 한/영 상관없음');
  }

  function tierMax() { return S.level >= 5 ? 3 : S.level >= 3 ? 2 : 1; }
  function fallTime() { return Math.max(9, 22 - (S.level - 1) * 1.3); }
  function spawnGap() { return Math.max(1.7, 4.2 - (S.level - 1) * .28); }
  function maxOn() { return Math.min(8, 3 + S.level); }

  function makeQ() {
    var pool = GENS.filter(function (g) { return S.mode.wk.indexOf(g.wk) >= 0 && g.tier <= tierMax(); });
    for (var tries = 0; tries < 12; tries++) {
      var g = P(pool), q = g.gen();
      var dup = S.recent.indexOf(q.q) >= 0 || S.drops.some(function (d) { return d.a.some(function (a) { return q.a.indexOf(a) >= 0; }); });
      if (!dup || tries === 11) { S.recent.push(q.q); if (S.recent.length > 10) S.recent.shift(); q.g = g; return q; }
    }
  }
  function spawn() {
    var q = makeQ(), g = q.g, item = null;
    var r = Math.random();
    if (S.level >= 2 && r < .08) item = P(['umb', 'stop', S.hearts < 5 ? 'heal' : 'stop']);
    var el = document.createElement('div');
    el.className = 'drop' + (item ? ' item ' + item : '');
    el.style.setProperty('--wc', WKC[g.wk]);
    el.innerHTML = '<span class="cat">' + (item ? { umb: '☂ 우산', stop: '❄ 얼음', heal: '❤ 회복' }[item] + ' · ' : '') + esc(g.cat) + ' <i>W' + g.wk + '</i></span><span class="q">' + esc(q.q) + '</span>';
    fieldEl.appendChild(el);
    var w = el.offsetWidth, h = el.offsetHeight;
    // 최근 떨어진 것들과 겹치지 않는 x
    var x = 0, best = -1;
    for (var k = 0; k < 8; k++) {
      var cx = R(8, FIELD_W - w - 8), dmin = 9999;
      S.drops.forEach(function (d) { if (d.y < 160) dmin = Math.min(dmin, Math.abs((d.x + d.w / 2) - (cx + w / 2)) - (d.w + w) / 2); });
      if (dmin > best) { best = dmin; x = cx; }
      if (dmin > 20) break;
    }
    var d = { id: ++uid, el: el, x: x, y: -h - 4, w: w, h: h, a: q.a.map(norm), show: q.show, q: q.q, why: q.why, g: g, item: item,
      v: (FIELD_H - GROUND + h) / (fallTime() * (g.tier === 3 ? 1.35 : g.tier === 2 ? 1.12 : 1)) };
    el.style.left = x + 'px'; el.style.transform = 'translateY(' + d.y + 'px)';
    S.drops.push(d);
  }

  function loop(now) {
    var dt = Math.min(.1, (now - last) / 1000) * S.scale; last = now;
    if (!S.paused && !S.over) step(dt);
    raf = requestAnimationFrame(loop);
  }
  function step(dt) {
    S.t += dt;
    if (S.freeze > 0) { S.freeze -= dt; fieldEl.classList.toggle('frozen', S.freeze > 0); }
    else {
      S.spawnT -= dt;
      if ((S.spawnT <= 0 && S.drops.length < maxOn()) || (S.drops.length === 0 && S.spawnT < spawnGap() - .8)) { spawn(); S.spawnT = spawnGap(); }
      for (var i = S.drops.length - 1; i >= 0; i--) {
        var d = S.drops[i];
        d.y += d.v * dt;
        var floor = FIELD_H - GROUND - d.h;
        d.el.style.transform = 'translateY(' + d.y + 'px)';
        d.el.classList.toggle('danger', d.y > floor * .72);
        if (d.y >= floor) miss(d);
      }
    }
    hudTime.textContent = fmtT(S.t);
  }
  function fmtT(t) { var m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

  /* ------------------------------------------------------------ 맞힘 / 놓침 */
  function removeDrop(d) { var i = S.drops.indexOf(d); if (i >= 0) S.drops.splice(i, 1); }
  function submit(raw) {
    if (!S || S.over || S.paused) return;
    var a1 = norm(raw), a2 = norm(qwerty(raw));
    if (!a1 && !a2) return;
    var hits = S.drops.filter(function (d) { return d.a.indexOf(a1) >= 0 || (a2 && d.a.indexOf(a2) >= 0); });
    if (!hits.length) {
      S.combo = 0; S.wrong++; NA.sfx.bad();
      inputEl.classList.remove('shake'); void inputEl.offsetWidth; inputEl.classList.add('shake');
      setFeed('no', '✗ "' + raw + '" 에 맞는 문제가 없다');
      return drawHud();
    }
    hits.sort(function (a, b) { return b.y - a.y; });
    var d = hits[0];
    removeDrop(d);
    S.combo++; S.maxCombo = Math.max(S.maxCombo, S.combo); S.cleared++;
    var pts = Math.round(d.g.tier * 10 * S.level * (1 + Math.min(S.combo - 1, 10) * .1));
    S.score += pts;
    pop(d, '+' + pts);
    NA.sfx.tone(600 + Math.min(S.combo, 12) * 40, .07, 'square', .12);
    setFeed('ok', '✓ ' + d.q + ' → <b>' + esc(d.show) + '</b>');
    if (d.item) useItem(d.item);
    var lv = 1 + Math.floor(S.cleared / 8);
    if (lv > S.level) {
      var oldT = tierMax(); S.level = lv; NA.sfx.perfect();
      toast('LEVEL ' + lv, tierMax() > oldT ? (tierMax() === 2 ? '새 문제: 서브넷·상태·seq/ack 등 계산 문제가 섞인다' : '새 문제: 네트워크 주소·cwnd·TTL 계산') : '빗줄기가 조금 빨라진다');
    }
    drawHud();
  }
  function useItem(k) {
    if (k === 'umb') {
      var n = S.drops.length;
      S.drops.slice().forEach(function (d) { removeDrop(d); S.score += d.g.tier * 5 * S.level; pop(d, '☂'); });
      toast('☂ 우산!', '화면의 산성비 ' + n + '개를 막았다');
    } else if (k === 'stop') { S.freeze = 4; toast('❄ 얼음', '4초 동안 비가 멈춘다'); }
    else if (k === 'heal') { S.hearts = Math.min(5, S.hearts + 1); toast('❤ 회복', '지반이 하나 복구됐다'); }
  }
  function pop(d, txt) {
    d.el.style.top = d.y + 'px'; d.el.style.transform = 'none';
    d.el.classList.add('pop');
    var f = document.createElement('div'); f.className = 'pts'; f.textContent = txt;
    f.style.left = (d.x + d.w / 2) + 'px'; f.style.top = (d.y + 10) + 'px'; fieldEl.appendChild(f);
    setTimeout(function () { d.el.remove(); f.remove(); }, 600);
  }
  function miss(d) {
    removeDrop(d);
    S.hearts--; S.combo = 0; NA.sfx.noise(.25, .2);
    d.el.classList.add('melt');
    var sp = document.createElement('div'); sp.className = 'splash';
    sp.innerHTML = '정답 <b>' + esc(d.show) + '</b>';
    sp.style.left = Math.min(FIELD_W - 200, Math.max(4, d.x + d.w / 2 - 90)) + 'px';
    fieldEl.appendChild(sp);
    setTimeout(function () { d.el.remove(); }, 500); fieldEl.querySelectorAll('.splash').forEach(function (o) { if (o !== sp) o.remove(); });
    setTimeout(function () { sp.remove(); }, 2600);
    S.missed.unshift({ q: d.q, show: d.show, why: d.why, cat: d.g.cat, wk: d.g.wk });
    S.catMiss[d.g.cat] = (S.catMiss[d.g.cat] || 0) + 1;
    groundEl.classList.remove('hit'); void groundEl.offsetWidth; groundEl.classList.add('hit');
    drawHud(); drawNotes();
    if (S.hearts <= 0) gameOver();
  }

  /* ------------------------------------------------------------ 화면 */
  var fieldEl, groundEl, inputEl, hudTime, feedEl, notesEl, toastEl;
  function build() {
    app.innerHTML =
      '<div class="hud"><span class="t">☔ ' + esc(S.mode.title) + '</span><span class="hearts" data-h></span>' +
      '<span class="st">점수 <b data-score>0</b></span><span class="st">LEVEL <b data-lv>1</b></span><span class="st">콤보 <b data-combo>0</b></span><span class="st">⏱ <b data-time>0:00</b></span>' +
      '<span class="sp"></span><button class="na-btn" data-pause>일시정지 (Esc)</button></div>' +
      '<div class="main"><div class="left">' +
        '<div class="field"><div class="rain"></div><div class="toast" hidden></div><div class="ground"><span>지반</span></div></div>' +
        '<div class="inrow"><span class="lbl">⌨ 답</span><input class="ans" type="text" autocomplete="off" spellcheck="false" maxlength="24" placeholder="정답을 치고 Enter (한/영 상관없음)">' +
          '<div class="feed">숫자·영문·한글 모두 OK. 예) 443, syn, ㅅ체(tcp), 클라이언트</div></div>' +
      '</div><div class="side"><div class="panel notes"><h4>☂ 오답 노트 <small>바닥에 닿은 문제</small></h4><div data-notes></div></div>' +
        '<div class="panel tip"><h4>규칙</h4><p>떨어지는 문제의 답을 치고 <b>Enter</b>. 바닥에 닿으면 지반 ♥ −1, 다 녹으면 끝.</p>' +
        '<p>8문제마다 LEVEL↑. 금테 문제는 아이템: <b>☂</b> 화면 정리 · <b>❄</b> 4초 멈춤 · <b>❤</b> 회복</p>' +
        '<p>틀린 입력은 콤보만 끊긴다. 문제는 매번 새로 만들어진다.</p></div></div></div>';
    fieldEl = app.querySelector('.field'); groundEl = app.querySelector('.ground'); inputEl = app.querySelector('.ans');
    hudTime = app.querySelector('[data-time]'); feedEl = app.querySelector('.feed'); notesEl = app.querySelector('[data-notes]'); toastEl = app.querySelector('.toast');
    app.querySelector('[data-pause]').onclick = function () { pause(true); };
    fieldEl.onclick = function () { inputEl.focus(); };
    inputEl.addEventListener('keydown', onKey);
    drawHud(); drawNotes();
    setTimeout(function () { inputEl.focus(); }, 50);
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); return pause(true); }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (e.isComposing || e.keyCode === 229) { setTimeout(take, 20); return; }  // 한글 조합 중이면 조합이 끝난 뒤 읽는다
    take();
  }
  function take() { var v = inputEl.value; inputEl.value = ''; if (v.trim()) submit(v.trim()); }
  function drawHud() {
    var h = ''; for (var k = 0; k < 5; k++) h += k < S.hearts ? '♥' : '<i>♥</i>';
    app.querySelector('[data-h]').innerHTML = h;
    app.querySelector('[data-score]').textContent = S.score;
    app.querySelector('[data-lv]').textContent = S.level;
    app.querySelector('[data-combo]').textContent = S.combo;
    groundEl.style.setProperty('--hp', S.hearts / 5);
  }
  function setFeed(cls, html) { feedEl.className = 'feed ' + cls; feedEl.innerHTML = html; }
  function drawNotes() {
    notesEl.innerHTML = S.missed.length ? S.missed.slice(0, 3).map(function (m) {
      return '<div class="note" style="--wc:' + WKC[m.wk] + '"><span class="c">' + esc(m.cat) + ' · W' + m.wk + '</span><span class="q">' + esc(m.q) + '</span><span class="a">정답 <b>' + esc(m.show) + '</b> — ' + esc(m.why) + '</span></div>';
    }).join('') : '<p class="empty">아직 없다. 놓친 문제는 여기서 정답과 해설을 보여 준다.</p>';
  }
  var toastTimer = 0;
  function toast(t, s) {
    toastEl.innerHTML = '<b>' + esc(t) + '</b>' + (s ? '<span>' + esc(s) + '</span>' : '');
    toastEl.hidden = false; toastEl.classList.remove('in'); void toastEl.offsetWidth; toastEl.classList.add('in');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.hidden = true; }, 2200);
  }

  /* ------------------------------------------------------------ 일시정지 / 끝 */
  function pause(on) {
    if (!S || S.over) return;
    S.paused = on;
    fieldEl.classList.toggle('paused', on);
    if (!on) { ov.hidden = true; last = performance.now(); inputEl.focus(); return; }
    ov.innerHTML = '<div class="na-card"><h2>일시정지</h2><p class="sub">문제는 가려 두었다. 쉬었다 와도 된다.</p>' +
      '<div class="howto">답을 치고 <span class="key">Enter</span>. 바닥에 닿으면 지반 ♥ −1. 8문제마다 LEVEL이 오르고, LEVEL 3부터 계산 문제, LEVEL 5부터 주소·cwnd 문제가 섞인다.<br>' +
      '두벌식 한글 상태로 친 영어(ㅅ체 → tcp)도 그대로 인식한다. 문제는 매번 무작위로 만들어진다.</div>' +
      '<div class="na-row"><button class="na-btn primary" data-go>계속 (Esc)</button><button class="na-btn" data-quit>그만하고 결과 보기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-go]').onclick = function () { pause(false); };
    ov.querySelector('[data-quit]').onclick = function () { S.paused = false; gameOver(true); };
  }
  document.addEventListener('keydown', function (e) {
    if (S && S.paused && !S.over && e.key === 'Escape') { e.preventDefault(); pause(false); }
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && S && !S.over && !S.paused) pause(true); });

  function gameOver(quit) {
    if (S.over) return;
    S.over = true; inputEl.blur(); inputEl.disabled = true;
    NA.sfx.lose();
    var stars = S.level >= 8 ? 3 : S.level >= 5 ? 2 : S.level >= 2 ? 1 : 0;
    var prev = NA.progress.best(GAME_ID, S.mi), isBest = !prev || S.score > prev.score;
    NA.progress.saveBest(GAME_ID, S.mi, stars, S.score);
    var me = S;
    setTimeout(function () { if (S === me) showResult(quit, stars, isBest, prev); }, quit ? 0 : 1100);
  }
  function showResult(quit, stars, isBest, prev) {
    var acc = S.cleared + S.wrong ? Math.round(S.cleared / (S.cleared + S.wrong) * 100) : 0;
    var worst = Object.keys(S.catMiss).sort(function (a, b) { return S.catMiss[b] - S.catMiss[a]; }).slice(0, 3);
    var seen = {}, notes = S.missed.filter(function (m) { if (seen[m.q]) return false; seen[m.q] = 1; return true; }).slice(0, 6);
    var stat = function (k, v) { return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; };
    ov.innerHTML = '<div class="na-card result"><h2 style="color:var(--bad)">' + (quit ? '그만하기' : '지반 붕괴!') + '</h2>' +
      '<div class="rs-top"><div class="big">' + S.score + '<small>점' + (isBest && S.score ? ' · 최고 기록!' : prev ? ' · 최고 ' + prev.score : '') + '</small></div><div class="stars">' + NA.ui.stars(stars) + '</div></div>' +
      '<div class="stat-grid">' + stat('LEVEL', S.level) + stat('버틴 시간', fmtT(S.t)) + stat('맞힘', S.cleared) + stat('정확도', acc + '%') + stat('최대 콤보', S.maxCombo) + '</div>' +
      (worst.length ? '<p class="weak">자주 놓친 유형: ' + worst.map(function (c) { return '<b>' + esc(c) + '</b> ' + S.catMiss[c] + '번'; }).join(' · ') + '</p>' : '') +
      '<div class="rnotes">' + (notes.length ? notes.map(function (m) { return '<div class="note" style="--wc:' + WKC[m.wk] + '"><span class="q">' + esc(m.q) + '</span><span class="a">정답 <b>' + esc(m.show) + '</b> — ' + esc(m.why) + '</span></div>'; }).join('') : '<p class="empty">놓친 문제 없음!</p>') + '</div>' +
      '<div class="na-row"><button class="na-btn primary" data-retry>다시 하기 (Enter)</button><button class="na-btn" data-menu>모드 선택</button></div></div>';
    ov.hidden = false;
    var card = ov.querySelector('.na-card');
    function kd(e) { if (!ov.contains(card) || ov.hidden) return window.removeEventListener('keydown', kd); if (e.key === 'Enter' || e.key === 'r' || e.key === 'R') { e.preventDefault(); window.removeEventListener('keydown', kd); ov.hidden = true; newGame(S.mi); } }
    setTimeout(function () { window.addEventListener('keydown', kd); }, 700);
    ov.querySelector('[data-retry]').onclick = function () { window.removeEventListener('keydown', kd); ov.hidden = true; newGame(S.mi); };
    ov.querySelector('[data-menu]').onclick = function () { window.removeEventListener('keydown', kd); menu(); };
  }

  /* ------------------------------------------------------------ 메뉴 */
  function menu() {
    cancelAnimationFrame(raf); S = null; app.innerHTML = '';
    var gm = NA.GAME_BY_ID[GAME_ID];
    var html = '<div class="na-card"><h2>' + esc(gm.title) + '</h2><p class="sub">' + esc(gm.pitch) + '</p>' +
      '<div class="howto">하늘에서 네트워크 문제가 떨어진다. 바닥에 닿기 전에 <b>답을 치고 Enter</b>. 바닥에 닿으면 지반 ♥ −1, 5칸이 다 녹을 때까지 <b>끝나지 않는다</b>.<br>' +
      '문제는 매번 무작위로 만들어지니(IP·포트·seq 번호…) 외울 수 없다. 한/영 상태는 신경 쓰지 않아도 된다. <span class="key">Esc</span> 일시정지</div><div class="stage-list">';
    MODES.forEach(function (m, i) {
      var b = NA.progress.best(GAME_ID, i);
      html += '<button class="stage-btn" data-i="' + i + '"><span class="n">' + (i === 0 ? 'WEEK 1–4' : 'WEEK ' + m.wk[0]) + '</span><span class="t">' + esc(m.title) + '</span><span class="d">' + esc(m.desc) + '</span>' +
        '<span class="stars">' + (b ? NA.ui.stars(b.stars) + '  최고 ' + b.score + '점' : '기록 없음') + '</span></button>';
    });
    html += '</div><div class="na-row"><a class="na-btn" href="../../index.html">← 아케이드 허브</a><button class="na-btn" data-mute>' + (NA.sfx.muted ? '소리 켜기' : '소리 끄기') + '</button></div></div>';
    ov.innerHTML = html; ov.hidden = false;
    ov.querySelectorAll('.stage-btn').forEach(function (b) { b.onclick = function () { NA.sfx.unlock(); ov.hidden = true; newGame(+b.dataset.i); }; });
    ov.querySelector('[data-mute]').onclick = function (e) { NA.sfx.unlock(); var m = NA.sfx.toggle(); e.target.textContent = m ? '소리 켜기' : '소리 끄기'; };
  }

  window.__game = {
    state: function () { return S; }, start: newGame, submit: submit, qwerty: qwerty, gens: GENS,
    speed: function (k) { if (S) S.scale = k; }, answers: function () { return S ? S.drops.map(function (d) { return d.a[0]; }) : []; }
  };
  menu();
})();
