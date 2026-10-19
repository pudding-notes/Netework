/* Week 1 — AI 시대의 Network Architecture */
'use strict';
(function () {
const T = H.tbl;
const ip = (s, d, extra = []) => ({ L: 'L3', n: 'IP', f: [['Src', s], ['Dst', d], ...extra] });
const tcp = (s, d, extra = []) => ({ L: 'L4', n: 'TCP', f: [['Src Port', s], ['Dst Port', d], ...extra] });
const udp = (s, d) => ({ L: 'L4', n: 'UDP', f: [['Src Port', s], ['Dst Port', d]] });
const eth = (s, d) => ({ L: 'L2', n: 'Ethernet', f: [['Src MAC', s], ['Dst MAC', d]] });
const app = (n, f) => ({ L: 'L7', n, f });

addWeek({ id: 'w1', num: 1, short: '1주', title: 'AI 시대의 Network Architecture', range: 'Introduction + Week 1',
  lead: '세부 프로토콜보다 큰 그림이 먼저다. 요청 하나가 어떤 구성요소를 지나가는지, “빠르다”는 말을 어떻게 쪼개 볼지, 왜 계층으로 나눠 생각하는지를 잡는다.',
  sections: [

{ id: 'w1.course', title: '이 과목을 보는 관점', slides: 'S2–S9',
  blocks: [
    H.key('이 과목의 질문은 “코드를 얼마나 많이 쓰는가”가 아니라 “왜 이 구조가 동작하는가를 설명할 수 있는가”이다.'),
    `<p>AI 코딩 에이전트가 코드를 대신 쓰는 시대라서, 네트워크 공부의 목적이 <b>프로토콜 암기</b>에서 <b>시스템 이해·설계·검증</b>으로 옮겨 갔다. 그래서 평가도 코드보다 구조 설명, 오류 원인, 대안 선택, AI 결과 검증을 본다.</p>`,
    T(['기존 접근', '2026 개발 환경', '새 학습목표'], [['계층별 프로토콜 중심', 'AI Coding Agent', '구조를 읽는다'], ['TCP/IP 동작 원리', 'Cloud-native 서비스', '기술을 선택한다'], ['교과서 예제 중심', 'Web/App/IoT 연동', 'AI 생성 코드를 검증한다'], ['직접 코딩 능력 강조', 'API 기반 AI 서비스', '장애를 계층별로 추적한다']]),
    `<p>AI는 “정답 생성기”가 아니라 파트너다. <b>USE AI</b>(초안·대안 비교·오류 해석) → <b>BUT VERIFY</b>(포트·주소·보안 설정·실제 패킷/로그 확인) → <b>YOU EXPLAIN</b>(왜 REST인가? 왜 Private Subnet인가? 어디서 장애가 났는가?).</p>`,
    { h3: '15주 여정과 지금의 위치' },
    T(['단계', '주차', '내용'], [['<b>FOUNDATION</b> ← 지금', '1–4', 'Internet · IP · TCP/UDP · DNS · HTTP'], ['APPLICATION', '5–7', 'REST · Security · Realtime · MQTT'], ['CLOUD', '9–12', 'VPC · Docker · Scale · Queue'], ['AI SYSTEM', '13–15', 'Inference · Debugging · System Design']], { hl: r => r[1] === '1–4' }),
    { h3: '학기 말에 설명해야 하는 그림 (S9)' },
    { trace: { title: '목표 아키텍처', sub: '박스 아래 = 그 구성요소를 주로 다루는 주차', rowH: 92, minW: 700,
      nodes: [{ id: 'web', label: 'Web', icon: 'browser', x: .07, y: 0 }, { id: 'app', label: 'App', icon: 'phone', x: .07, y: 1 }, { id: 'iot', label: 'IoT', icon: 'iot', sub: 'W7', x: .07, y: 2 },
        { id: 'dns', label: 'DNS', icon: 'dns', sub: 'W4', x: .26, y: 0 }, { id: 'cdn', label: 'CDN', icon: 'globe', sub: 'W4·W11', x: .26, y: 1 }, { id: 'tls', label: 'TLS', icon: 'lock', sub: 'W4·W6', x: .43, y: 1 },
        { id: 'lb', label: 'Load Balancer', icon: 'lb', sub: 'W4·W11', x: .61, y: 1 }, { id: 'api', label: 'REST API', icon: 'server', sub: 'W5', x: .79, y: 1 },
        { id: 'pg', label: 'PostgreSQL', icon: 'db', sub: 'W10', x: .79, y: 0 }, { id: 'redis', label: 'Redis', icon: 'db', sub: 'W10', x: .94, y: 0 }, { id: 'sto', label: 'Storage', icon: 'storage', sub: 'W10', x: .94, y: 1 },
        { id: 'q', label: 'Queue', icon: 'queue', sub: 'W12', x: .79, y: 2 }, { id: 'gpu', label: 'GPU Worker', icon: 'gpu', sub: 'W13', x: .94, y: 2 }],
      links: [['web', 'dns', { dash: 1 }], ['web', 'cdn'], ['app', 'cdn'], ['iot', 'cdn'], ['cdn', 'tls'], ['tls', 'lb'], ['lb', 'api'], ['api', 'pg'], ['api', 'redis'], ['api', 'sto'], ['api', 'q'], ['q', 'gpu']] } },
    `<p>각 박스의 <b>역할</b>, 화살표의 <b>연결 프로토콜</b>, 그리고 <b>병목과 장애 지점</b>을 말할 수 있어야 한다. 1~4주차가 끝나면 왼쪽 절반(DNS·CDN·TLS·LB까지)을 설명할 수 있다.</p>`,
    H.key('시험: 온라인 퀴즈 10/19 · 중간고사 11/3 — “원론적·이론적 내용 위주, 각 챕터 마지막 Quick Check 중요” (수업 필기)'),
    { h3: '이 노트 보는 법' },
    `<ul><li><b>트레이스</b>: 패킷 한 개 = 한 단계. <b>◀ ▶</b>(또는 트레이스를 클릭한 뒤 ← →)로 넘긴다. 지금 패킷이 지나는 구간만 굵은 화살표로 표시된다.</li>
<li><b>패킷 상세</b>: 위에서부터 바깥 헤더. 색은 계층 — <span class="L2">L2 MAC</span> · <span class="L3">L3 IP</span> · <span class="L4">L4 TCP/UDP</span> · <span class="L7">L7 응용</span>. 직전 패킷과 달라진 값에는 <span style="background:var(--chg);color:var(--chg-ink);padding:0 4px;border-radius:3px">노란 형광펜</span>이 칠해진다.</li>
<li><b>실험</b>: 값을 바꾸면 결과가 즉시 다시 계산된다. 움직이는 그림은 없다.</li>
<li><b>연습 ✎</b>과 <b>Quick Check</b>는 각 주차 끝에 있다.</li></ul>`,
  ] },

{ id: 'w1.journey', title: 'ChatGPT에 질문을 보내면 무슨 일이 일어날까', slides: 'S11–S12',
  blocks: [
    `<p>“네트워크”는 케이블과 라우터만의 이야기가 아니다. 질문 하나가 오가는 길을 한 패킷씩 따라가 보자. 이번 학기에 배울 것이 전부 이 길 위에 있다.</p>`,
    { trace: { title: '질문 하나의 여정', sub: 'IP 주소는 설명용 예시', rowH: 100, minW: 700,
      nodes: [{ id: 'br', label: 'Browser', icon: 'browser', sub: '192.168.0.23', x: .08, y: 1 }, { id: 'dns', label: 'DNS', icon: 'dns', sub: 'Resolver', x: .30, y: 0 }, { id: 'inet', label: 'Internet', icon: 'cloud', x: .32, y: 1 }, { id: 'lb', label: 'Gateway / LB', icon: 'lb', sub: '203.0.113.10', x: .54, y: 1 }, { id: 'api', label: 'API Server', icon: 'server', sub: '10.0.11.20', x: .75, y: 1 }, { id: 'gpu', label: 'AI / GPU', icon: 'gpu', x: .93, y: 1 }],
      links: [['br', 'dns'], ['br', 'inet'], ['inet', 'lb'], ['lb', 'api'], ['api', 'gpu']],
      events: [
        { from: 'br', to: 'dns', label: 'chatgpt.com 의 IP는?', pkt: [ip('192.168.0.23', '8.8.8.8'), udp(51000, 53), app('DNS', [['Query', 'chatgpt.com A?']])], say: '브라우저는 이름(chatgpt.com)만 안다. 패킷을 보내려면 IP가 필요하므로 먼저 <b>DNS</b>에 묻는다. DNS는 서버의 이름을 IP 주소로 바꿔 주는 주소록이다 (4주차).' },
        { from: 'dns', to: 'br', label: 'A 203.0.113.10', pkt: [ip('8.8.8.8', '192.168.0.23'), udp(53, 51000), app('DNS', [['Answer', 'chatgpt.com A 203.0.113.10']])], say: 'DNS가 IP를 알려 준다. 응답이라 출발지와 목적지가 뒤바뀐 것을 보자(노란색).' },
        { from: 'br', to: 'lb', path: ['br', 'inet', 'lb'], label: '질문 (HTTPS)', cmp: false, pkt: [ip('192.168.0.23', '203.0.113.10'), tcp(51500, 443), { L: 'L7', n: 'TLS', enc: '🔒 암호화된 HTTP 요청 (POST /chat …)' }], say: '이제 그 IP로 질문을 보낸다. 패킷은 <b>Internet</b> — 수많은 독립 네트워크의 모임 — 을 지나 서비스 입구까지 간다. 중간 장비들은 “다음 칸”만 정해 넘긴다 (2주차). 내용은 TLS로 암호화되어 중간에서는 보이지 않는다 (4주차).' },
        { from: 'lb', to: 'api', label: '서버 하나 선택', pkt: [ip('10.0.1.5', '10.0.11.20'), tcp(40210, 8000), app('HTTP', [['Request', 'POST /v1/chat']])], say: '<b>Gateway / Load Balancer</b>가 여러 API 서버 중 하나를 골라 넘긴다. 데이터센터 안쪽은 Private IP(10.x)를 쓴다. 암호화는 보통 LB에서 풀린다.' },
        { from: 'api', to: 'gpu', label: 'prompt', pkt: [app('Job', [['task', 'inference'], ['prompt', '“…”']])], say: '<b>API Server</b>는 요청을 해석하고, 실제 추론은 <b>GPU</b>에 맡긴다 (13주차).' },
        { from: 'gpu', to: 'api', label: '생성된 토큰', pkt: [app('Job', [['result', '“답변 …”']])], say: 'GPU가 결과를 돌려준다.' },
        { from: 'api', to: 'br', path: ['api', 'lb', 'inet', 'br'], label: '답변 (응답)', pkt: [ip('203.0.113.10', '192.168.0.23'), tcp(443, 51500), { L: 'L7', n: 'TLS', enc: '🔒 암호화된 HTTP 응답 200 OK' }], say: '응답은 같은 길을 되돌아온다. <b>AI 서비스도 결국 request와 response</b>를 주고받는 네트워크 서비스다 (Quick Check ⑤).' },
      ] } },
    { h3: 'Network Architecture = 구성요소 + 연결 + 설계 결정 (S12)' },
    T(['Components (무엇이)', 'Connections (어떻게 연결)', 'Design Decisions (무엇을 판단)'], [['Client · Server', 'Ethernet · Wi-Fi', '어디에 배치할까?'], ['Router · Gateway', 'IP', '어떻게 연결할까?'], ['Cloud · Edge', 'TCP · UDP', '얼마나 빠르게?'], ['Database · Storage', 'HTTP · MQTT · TLS', '얼마나 안전하게? 장애 시 어떻게?']]),
    H.note('필기: Host는 네트워크에 연결된 장치 전체를 아우르는 말. Cloud는 Edge와 Core(Router/Gateway) 위에서 연결된다.'),
  ] },

{ id: 'w1.internet', title: 'Internet: “Network of Networks”', slides: 'S13',
  blocks: [
    `<p>인터넷은 하나의 거대한 네트워크가 아니라 <b>서로 연결된 수많은 네트워크의 집합</b>이다. 집·캠퍼스 → ISP → Backbone → Cloud Network → Service. 각 네트워크는 <b>운영 주체가 다르고 독립적으로 운영</b>되지만, 모두 <b>공통 프로토콜(IP)</b>을 쓰기 때문에 이어진다.</p>`,
    { trace: { title: '서로 다른 네트워크를 건너는 패킷', rowH: 92, minW: 700,
      nodes: [{ id: 'home', label: 'Home', sub: '공유기', icon: 'router', x: .07, y: 0 }, { id: 'campus', label: 'Campus', sub: '학교망', icon: 'router', x: .07, y: 2 }, { id: 'ispa', label: 'ISP A', icon: 'router', x: .30, y: 0 }, { id: 'ispb', label: 'ISP B', icon: 'router', x: .30, y: 2 }, { id: 'bb', label: 'Backbone', sub: '국제 회선', icon: 'globe', x: .53, y: 1 }, { id: 'cl', label: 'Cloud Network', icon: 'cloud', x: .75, y: 1 }, { id: 'svc', label: 'Service', icon: 'server', sub: '34.1.2.3', x: .93, y: 1 }],
      links: [['home', 'ispa'], ['campus', 'ispb'], ['ispa', 'ispb'], ['ispa', 'bb'], ['ispb', 'bb'], ['bb', 'cl'], ['cl', 'svc']],
      events: [
        { from: 'home', to: 'svc', path: ['home', 'ispa', 'bb', 'cl', 'svc'], label: 'IP 패킷', pkt: [ip('203.0.113.5', '34.1.2.3')], say: '집에서 보낸 패킷이 <b>네 개의 서로 다른 네트워크</b>를 지난다. 운영자는 다 다르지만 IP 헤더 형식은 같다.' },
        { from: 'campus', to: 'svc', path: ['campus', 'ispb', 'bb', 'cl', 'svc'], label: 'IP 패킷', pkt: [ip('117.16.196.10', '34.1.2.3')], say: '학교에서 보낸 패킷은 다른 ISP를 거치지만 같은 서비스에 도착한다. 사용자는 중간 경로를 거의 의식하지 않는다.' },
        { from: 'home', to: 'svc', path: ['home', 'ispa', 'ispb', 'bb', 'cl', 'svc'], down: [['ispa', 'bb']], label: '우회', pkt: [ip('203.0.113.5', '34.1.2.3')], say: 'ISP A–Backbone 구간에 장애가 나면 패킷은 ISP B를 돌아간다. <b>성능(hop·지연 증가)·장애·보안(어느 망을 지나는가)은 경로의 영향을 받는다.</b> “인터넷이 느리다”는 대개 “어느 구간이 느린가”의 문제다.' },
      ] } },
  ] },

{ id: 'w1.cs', title: 'Client–Server와 Endpoint', slides: 'S14–S15',
  blocks: [
    `<p><b>Client</b>가 먼저 요청(Request)하고 <b>Server</b>가 응답(Response)한다. 둘은 <b>장치 종류가 아니라 통신에서의 역할</b>이다. 같은 노트북도 브라우저로 접속할 때는 Client, FastAPI를 띄우면 Server다. ${H.exam('Quick Check ③')}</p>`,
    T(['Client의 질문', 'Server의 질문'], [['어디로 접속하지?', '어떤 주소/포트에서 기다리지?'], ['어떤 프로토콜을 쓰지?', '누가 접속해도 되는가?'], ['요청에 무엇을 담지?', '어떻게 확장하지?']]),
    { h3: 'Host · Server · Service · Endpoint — 층위가 다른 네 개념' },
    T(['개념', '뜻', '예'], [['<b>Host</b>', '네트워크에 연결된 장치', 'PC, VM, 스마트폰, IoT'], ['<b>Server</b>', '요청에 서비스를 제공하는 <b>역할</b>. 한 Host에 여러 Server 가능', 'nginx, FastAPI, PostgreSQL'], ['<b>Service</b>', '사용자에게 제공되는 기능', 'Web, API, DB, AI inference'], ['<b>Endpoint</b>', '서비스에 접근하는 구체적 지점 = <b>주소 + Port + Path</b>', 'https://api.example.com:443/users']]),
    { lab: { title: 'URL 하나가 가리키는 곳', init: { url: 'https://api.example.com:443/users' },
      ctl: [{ k: 'url', type: 'text', label: 'URL', w: 340 }],
      out: st => {
        const u = parseURL(st.url); if (!u) return '<span class="err">scheme://host[:port]/path 형식으로 입력해 보세요</span>';
        const srv = [[443, 'nginx (HTTPS)', 'Web 서비스'], [80, 'nginx (HTTP)', '443으로 리다이렉트'], [8000, 'FastAPI', 'REST API'], [5432, 'PostgreSQL', 'DB'], [22, 'sshd', '원격 접속']];
        const hit = srv.find(s => s[0] === u.port);
        return `<div class="result"><span class="L3">${esc(u.host)}</span> <span class="cm">→ DNS로 IP를 찾아 어느 Host인지</span><br><span class="L4">:${u.port}</span>${u.implicit ? ' <span class="cm">(생략 → ' + u.scheme + ' 기본값)</span>' : ''} <span class="cm">→ 그 Host의 어느 Server인지</span><br><span class="L7">${esc(u.path)}</span> <span class="cm">→ 그 Server 안의 어느 자원인지</span></div>` +
          `<b>Host ${esc(u.host)} 안에 떠 있는 Server들</b>` + T(['Port', 'Server', 'Service'], srv.map(s => [':' + s[0], s[1], s[2]]), { mono: [0], hl: r => r[0] === ':' + u.port }) +
          (hit ? `<div class="verdict ok">→ ${hit[1]} 로 도착</div>` : `<div class="verdict bad">:${u.port}에서 기다리는 Server가 없다 → Connection refused (3주차)</div>`);
      } } },
  ] },

{ id: 'w1.place', title: 'On-Premise · Cloud · Edge', slides: 'S16–S18',
  blocks: [
    `<p>“서버가 <b>어디에</b> 있는가?”는 성능·비용·보안·운영 방식에 영향을 준다.</p>`,
    T(['', 'On-Premise', 'Cloud', 'Edge'], [['위치', '기관/회사 내부 서버', '원격 데이터센터 자원', '데이터 발생 지점 가까이'], ['장점', '직접 통제, 데이터 주권', '빠른 확장, 관리형 서비스', '낮은 지연, 트래픽 절감'], ['단점', '구축·운영 부담', '비용 구조·의존성', '제한된 자원·분산 관리']]),
    `<p>${H.exam('Quick Check ②④')}Cloud는 “남의 컴퓨터”만이 아니라 확장·관리형 서비스·비용 구조까지 포함하는 운영 방식이고, Edge는 Cloud를 <b>대체</b>하지 않고 <b>보완</b>한다.</p>`,
    { h3: '왜 Edge가 필요한가 — AI Camera (S17)' },
    `<p>원본 영상을 전부 Cloud로 올리지 않고 <b>Edge 장치에서 먼저 추론(local inference)</b>한 뒤 <b>이벤트·특징만</b> 보낸다. 판단은 현장에서 즉시(lower latency), 장기 저장·통합 분석·모델 관리는 Cloud(cloud coordination).</p>`,
    { lab: { title: '카메라를 늘리면 업링크에 무엇이 실리나', init: { cams: 20, mbps: 4, ev: 2, rtt: 40 },
      ctl: [{ k: 'cams', label: '카메라 수', min: 1, max: 200 }, { k: 'mbps', label: '영상 1대', unit: 'Mbps', min: 1, max: 20 }, { k: 'ev', label: '이벤트 전송량', unit: 'kbps/대', min: 1, max: 50 }, { k: 'rtt', label: 'Cloud 왕복', unit: 'ms', min: 5, max: 300 }],
      out: st => { const raw = st.cams * st.mbps, ev = st.cams * st.ev / 1000;
        return `<div class="result">원본 전송 = ${st.cams}대 × ${st.mbps} Mbps = <b>${raw.toLocaleString()} Mbps</b><br>Edge 추론 후 이벤트만 = ${st.cams}대 × ${st.ev} kbps = <b>${ev.toFixed(2)} Mbps</b> (약 ${Math.round(raw / ev).toLocaleString()}배 적음)<br>판단 지연(네트워크 부분) — Cloud: ≥ ${st.rtt} ms · Edge: ≈ 0 ms</div>` +
          barsHTML([{ label: 'Cloud에서 처리', segs: [{ v: raw, c: 'bad', t: raw + ' Mbps' }] }, { label: 'Edge에서 거른 후', segs: [{ v: ev, c: 'l2', t: '' }], val: ev.toFixed(2) + ' Mbps' }], raw) +
          `<div class="assume"><b>가정</b> 추론 시간은 양쪽 같다고 보고 네트워크 부분만 비교. 비트레이트는 평균값.</div>`; } } },
    { h3: 'IoT도 결국 Network Architecture다 (S18)' },
    { trace: { title: '센서 값 하나가 앱까지', rowH: 90, minW: 680,
      nodes: [{ id: 's', label: 'Sensor', icon: 'iot', x: .07, y: 0 }, { id: 'e', label: 'ESP32', icon: 'iot', x: .25, y: 0 }, { id: 'ap', label: 'Wi-Fi / BLE', icon: 'router', x: .43, y: 0 }, { id: 'b', label: 'MQTT Broker', icon: 'broker', x: .62, y: 0 }, { id: 'sv', label: 'Server', icon: 'server', x: .80, y: 0 }, { id: 'a', label: 'App', icon: 'phone', x: .95, y: 0 }],
      links: [['s', 'e'], ['e', 'ap'], ['ap', 'b'], ['b', 'sv'], ['sv', 'a']],
      events: [
        { from: 's', to: 'e', label: '23.1℃', color: 'l1', say: '센서가 값을 읽어 마이크로컨트롤러로 넘긴다.' },
        { from: 'e', to: 'b', path: ['e', 'ap', 'b'], label: 'PUBLISH', pkt: [app('MQTT', [['topic', 'room1/temp'], ['payload', '23.1']])], say: 'ESP32는 <b>Broker 하나만</b> 안다. 누가 이 값을 받을지는 몰라도 된다.' },
        { from: 'b', to: 'sv', label: '구독자에게 전달', pkt: [app('MQTT', [['topic', 'room1/temp'], ['payload', '23.1']])], say: 'Broker가 구독자(Server)에게 나눠 준다. 서버·앱이 늘어도 센서 코드는 그대로다 (7주차 MQTT).' },
        { from: 'sv', to: 'a', label: '알림', color: 'l7', say: '강의의 설계 질문: 센서가 서버와 직접 HTTP 통신할까, Broker를 둘까? 연결이 끊기면 데이터는(버퍼링 후 재전송 / 버림)? 실시간성과 전력 소비 중 무엇이 중요한가?' },
      ] } },
  ] },

{ id: 'w1.perf', title: 'Latency · Bandwidth · Throughput', slides: 'S19–S20',
  blocks: [
    `<p>“빠른 네트워크”라는 말을 세 가지로 분해한다.</p>`,
    H.cards([['Latency (ms)', '데이터가 목적지에 도달하고 응답이 돌아오는 데 걸리는 시간. 게임·로봇·실시간 AI에서 중요. 왕복 시간 = <b>RTT</b>(ping 값).', 'L3'], ['Bandwidth (Mbps·Gbps)', '링크가 <b>이론적으로</b> 전달할 수 있는 최대 데이터량. 비유: 도로 폭.', 'L4'], ['Throughput (Mbps·Gbps)', '<b>실제로</b> 일정 시간 동안 전달된 데이터량. 비유: 실제 통과 차량 수. 혼잡·프로토콜·서버 성능의 영향을 받는다.', 'L7']]),
    H.key('Bandwidth가 커도 latency가 낮다는 뜻은 아니다. 도로가 넓어도 목적지가 멀면 오래 걸린다. — Quick Check ① “1 Gbps면 latency도 항상 낮다” → X'),
    { h3: '같은 1 Gbps인데 왜 체감 속도가 다를까 (S20)' },
    { lab: { title: '작은 요청 N번 — 국내 서버(A) vs 미국 서버(B)', init: { rttA: 5, rttB: 150, bw: 1000, n: 20, kb: 50 },
      ctl: [{ k: 'rttA', label: 'RTT A', unit: 'ms', min: 1, max: 300 }, { k: 'rttB', label: 'RTT B', unit: 'ms', min: 1, max: 300 }, { k: 'bw', label: 'Bandwidth', unit: 'Mbps', min: 10, max: 1000 }, { k: 'n', label: '요청 횟수 N', min: 1, max: 100 }, { k: 'kb', label: '요청당 크기', unit: 'KB', min: 1, max: 5000 }],
      out: st => { const tx = st.kb * 8 / st.bw; const A = st.n * (st.rttA + tx), B = st.n * (st.rttB + tx);
        return `<div class="result">요청 1회 전송 시간 = ${st.kb} KB × 8 ÷ ${st.bw} Mbps = ${tx.toFixed(2)} ms<br>T ≈ N × (RTT + 전송 시간)<br>A = ${st.n} × (${st.rttA} + ${tx.toFixed(2)}) = <b>${A.toFixed(0)} ms</b><br>B = ${st.n} × (${st.rttB} + ${tx.toFixed(2)}) = <b>${B.toFixed(0)} ms</b> → A의 <b>${(B / A).toFixed(1)}배</b></div>` +
          barsHTML([{ label: 'A 국내', segs: [{ v: st.n * st.rttA, c: 'l3', t: 'RTT×N' }, { v: st.n * tx, c: 'l4', t: '전송' }], val: A.toFixed(0) + ' ms' }, { label: 'B 미국', segs: [{ v: st.n * st.rttB, c: 'l3', t: 'RTT×N' }, { v: st.n * tx, c: 'l4', t: '전송' }], val: B.toFixed(0) + ' ms' }], Math.max(A, B)) +
          `<p class="cm" style="margin:0;font-size:14px"><span class="L3">■</span> RTT 대기 &nbsp; <span class="L4">■</span> 크기÷대역폭. 대역폭을 1000→100으로 줄여도 차이는 거의 그대로 — 작은 요청 여러 번은 <b>RTT가 지배</b>한다. 요청 크기를 5000 KB로 키우면 그제야 대역폭이 중요해진다.</p>
<div class="assume"><b>가정</b> 요청을 순차로(응답을 받고 다음 요청) 보낸다. 서버 처리·연결 수립 비용은 0. 1 KB = 1000 B.</div>`; } } },
    { h3: '실제 Throughput은 가장 좁은 구간(병목)을 넘지 못한다' },
    { lab: { title: '경로 위 링크 세 개', init: { l1: 1000, l2: 100, l3: 500 },
      ctl: [{ k: 'l1', label: '링크1 LAN', unit: 'Mbps', min: 10, max: 1000 }, { k: 'l2', label: '링크2 ISP', unit: 'Mbps', min: 10, max: 1000 }, { k: 'l3', label: '링크3 서버', unit: 'Mbps', min: 10, max: 1000 }],
      out: st => { const m = Math.min(st.l1, st.l2, st.l3);
        return `<div class="result">Throughput ≤ min(${st.l1}, ${st.l2}, ${st.l3}) = <b>${m} Mbps</b></div>` + barsHTML([['PC → Router', st.l1], ['Router → ISP', st.l2], ['ISP → Server', st.l3]].map(([l, v]) => ({ label: l, segs: [{ v, c: v === m ? 'bad' : 'l3', t: v === m ? '병목' : '' }], val: v + ' Mbps' })), 1000) +
          `<p style="margin:0">필기: “멀리 있을수록 Throughput이 보틀넥(min)에 수렴.” 여기에 혼잡, TCP 윈도우 제한(3주차 BDP), 서버 성능까지 겹치면 실제 값은 더 낮다.</p>`; } } },
  ] },

{ id: 'w1.packet', title: '데이터는 패킷으로 쪼개져 이동한다', slides: 'S21',
  blocks: [
    `<p>Application Data는 여러 <b>Packet</b>으로 쪼개져 각자 목적지로 간다(<b>Packet switching</b>). 여러 사용자가 링크를 공유할 수 있지만, 패킷마다 경로와 지연이 달라질 수 있고, 혼잡하면 지연·손실이 생긴다.</p>`,
    { trace: { title: '패킷 4개, 서로 다른 길', rowH: 90, minW: 640,
      nodes: [{ id: 'src', label: 'Source', icon: 'pc', x: .07, y: 1 }, { id: 'r1', label: 'R1', icon: 'router', x: .37, y: 0 }, { id: 'r2', label: 'R2', icon: 'router', x: .37, y: 2 }, { id: 'r3', label: 'R3', icon: 'router', x: .64, y: 1 }, { id: 'dst', label: 'Destination', icon: 'server', x: .92, y: 1 }],
      links: [['src', 'r1'], ['src', 'r2'], ['r1', 'r3'], ['r2', 'r3'], ['r1', 'dst'], ['r3', 'dst']],
      tables: [{ id: 'rx', title: '목적지에 도착한 순서', cols: ['도착 순서', '패킷', '경로'] }],
      events: [
        { from: 'src', to: 'dst', path: ['src', 'r1', 'dst'], label: 'P1', color: 'l3', tables: { rx: [['1', 'P1', 'R1']] }, say: 'P1은 R1을 거쳐 바로 도착.' },
        { from: 'src', to: 'dst', path: ['src', 'r2', 'r3', 'dst'], label: 'P2', color: 'l2', lane: 1, say: 'P2는 R2 → R3로 돌아간다. 길이 길어 아직 도착하지 않았다.' },
        { from: 'src', to: 'dst', path: ['src', 'r1', 'dst'], label: 'P4', color: 'l7', tables: { rx: [['1', 'P1', 'R1'], ['2', 'P4', 'R1']] }, say: '나중에 보낸 P4가 빠른 길로 먼저 도착했다.' },
        { from: 'src', to: 'dst', path: ['src', 'r1', 'r3', 'dst'], label: 'P3', color: 'l4', tables: { rx: [['1', 'P1', 'R1'], ['2', 'P4', 'R1'], ['3', 'P3', 'R1→R3'], ['4', 'P2', 'R2→R3']] }, say: 'P3, 그리고 마지막으로 P2 도착. <b>보낸 순서(1,2,3,4) ≠ 도착 순서(1,4,3,2)</b>. 순서를 다시 맞추는 일은 3주차 TCP가 한다.' },
      ] } },
    { h3: 'Circuit switching vs Packet switching (필기)' },
    T(['', 'Circuit switching', 'Packet switching'], [['경로', '통신 전에 경로·자원을 <b>고정 예약</b>', '패킷마다 그때그때 전달'], ['자원', '안 쓰는 동안에도 예약 자원이 놀고 있음', '보낼 것이 있는 사용자만 링크 사용'], ['지연', '예약되면 일정', '큐 대기에 따라 변함'], ['약점', '사용자가 많으면 회선을 미리 쪼개야 함', '몰리면 지연·손실']]),
    { fig: (() => { const act = [[1, 1, 0, 0, 0, 0, 1, 0], [0, 0, 0, 0, 0, 0, 0, 0], [0, 1, 1, 1, 0, 0, 0, 0]]; const cl = ['l3', 'l2', 'l7'];
      const grid = act.map((r, u) => `<div style="display:flex;gap:4px;align-items:center"><b style="width:56px;font-size:14px">사용자 ${'ABC'[u]}</b>${r.map(v => `<span style="width:min(34px,7vw);height:28px;border-radius:4px;border:1px solid var(--line);background:${v ? COLOR(cl[u]) : 'var(--sunk)'}"></span>`).join('')}</div>`).join('');
      const seq = []; for (let t = 0; t < 8; t++) for (let u = 0; u < 3; u++) if (act[u][t]) seq.push(u);
      return `<div style="display:flex;gap:40px;flex-wrap:wrap"><div><div style="font-weight:600;margin-bottom:6px">Circuit — 시간 칸을 사용자별로 고정</div><div style="display:flex;flex-direction:column;gap:4px">${grid}</div><div class="cap">24칸 중 6칸만 실제 사용 (B는 한 번도 안 보냄)</div></div><div><div style="font-weight:600;margin-bottom:6px">Packet — 보낼 것만 링크에 올림</div><div style="display:flex;gap:4px">${seq.map(u => `<span style="width:34px;height:28px;border-radius:4px;background:${COLOR(cl[u])};color:var(--on);font-weight:700;display:flex;align-items:center;justify-content:center;font-size:13px">${'ABC'[u]}</span>`).join('')}</div><div class="cap">같은 데이터를 6칸에. 대신 동시에 몰리면 큐에서 기다린다.</div></div></div>`; })() },
    { h3: '혼잡하면 지연이 늘고, 결국 버려진다' },
    { lab: { title: '라우터 큐 (20칸) — 0.2초 간격으로 관찰', init: { inR: 120, cap: 100 },
      ctl: [{ k: 'inR', label: '들어오는 양', unit: 'pkt/s', min: 20, max: 200 }, { k: 'cap', label: '나가는 링크', unit: 'pkt/s', min: 20, max: 200 }],
      out: st => { let q = 0, drop = 0; const rows = [];
        for (let t = 1; t <= 10; t++) { q = q + (st.inR - st.cap) * 0.2; if (q < 0) q = 0; let d = 0; if (q > 20) { d = q - 20; drop += d; q = 20; } rows.push([(t * 0.2).toFixed(1) + 's', Math.round(q) + ' / 20', (q / st.cap * 1000).toFixed(0) + ' ms', Math.round(drop)]); }
        return `<div class="result">${st.inR > st.cap ? `들어오는 ${st.inR} > 나가는 ${st.cap} → 큐가 초당 ${st.inR - st.cap}개씩 증가 → 20칸이 차면 drop` : `들어오는 ${st.inR} ≤ 나가는 ${st.cap} → 큐가 쌓이지 않는다`}</div>` + T(['시각', '큐', '대기 지연', '누적 drop'], rows, { mono: [0, 1, 2, 3], hl: r => +r[3] > 0 }) +
          `<p style="margin:0">필기: “트래픽은 라우터가 아니라 호스트가 만든다.” 그래서 3주차 TCP 혼잡제어는 <b>보내는 호스트들이 스스로 속도를 줄이는</b> 방식이다.</p>`; } } },
  ] },

{ id: 'w1.layer', title: 'Layer는 왜 필요한가', slides: 'S22',
  blocks: [
    `<p>복잡한 통신 문제를 <b>역할별로 나누어 생각하기 위한 추상화</b>다. 이번 학기의 관점: 계층을 외우는 것이 목표가 아니라, 문제가 생겼을 때 <b>“어느 계층의 문제인가?”</b>를 구분하는 것.</p>`,
    { fig: `<div class="stack"><div style="background:var(--l7)">Application <span>HTTP · DNS · MQTT — 무엇을 주고받나</span></div><div style="background:var(--l4)">Transport <span>TCP · UDP · QUIC — 어느 프로세스까지</span></div><div style="background:var(--l3)">Network <span>IP · Routing — 어느 호스트까지</span></div><div style="background:var(--l2)">Link <span>Ethernet · Wi-Fi — 다음 장비까지</span></div><div style="background:var(--l1)">Physical <span>Signal · Cable · Radio</span></div></div>` },
    { h3: '캡슐화 — 내려가며 헤더가 붙는다' },
    { fig: `<div style="display:flex;flex-direction:column;gap:6px">${[['Application', [['data', 'l7']]], ['Transport', [['TCP', 'l4'], ['data', 'l7']]], ['Network', [['IP', 'l3'], ['TCP', 'l4'], ['data', 'l7']]], ['Link', [['Eth', 'l2'], ['IP', 'l3'], ['TCP', 'l4'], ['data', 'l7'], ['FCS', 'l2']]]].map(([n, p]) => `<div style="display:flex;gap:12px;align-items:center"><b style="width:100px;font-size:14px">${n}</b>${H.pk(p)}</div>`).join('')}</div>`, cap: '보낼 때 위→아래로 헤더 추가, 받을 때 아래→위로 제거. 각 계층은 자기 헤더만 읽는다. 바이트 단위 계산(MTU 1500 → MSS 1460)은 3주차.' },
    { h3: '장비는 필요한 계층까지만 연다' },
    { trace: { title: 'Host A → Switch → Router → Host B', sub: '패킷 상세의 노란색 = 장비가 새로 쓴 값', rowH: 96, minW: 640,
      nodes: [{ id: 'a', label: 'Host A', sub: 'L1~L7', icon: 'pc', x: .08, y: 0 }, { id: 'sw', label: 'Switch', sub: 'L1~L2', icon: 'switch', x: .36, y: 0 }, { id: 'r', label: 'Router', sub: 'L1~L3', icon: 'router', x: .64, y: 0 }, { id: 'b', label: 'Host B', sub: 'L1~L7', icon: 'server', x: .92, y: 0 }],
      links: [['a', 'sw'], ['sw', 'r'], ['r', 'b']],
      events: [
        { from: 'a', to: 'sw', label: '프레임', pkt: [eth('aa:aa', 'bb:bb (Router)'), ip('192.168.0.23', '34.1.2.3'), tcp(51500, 443), app('HTTP', [['Request', 'GET /']])], say: 'Host A는 모든 계층을 거쳐 프레임을 만든다.' },
        { from: 'sw', to: 'r', label: '그대로 전달', pkt: [eth('aa:aa', 'bb:bb (Router)'), ip('192.168.0.23', '34.1.2.3'), tcp(51500, 443), app('HTTP', [['Request', 'GET /']])], say: '<b>Switch(L2)</b>는 목적지 MAC만 보고 해당 포트로 내보낸다. IP 이상은 열어 보지 않는다 — 아무 값도 바뀌지 않았다.' },
        { from: 'r', to: 'r', label: 'L2 벗기고 IP 확인', pkt: [ip('192.168.0.23', '34.1.2.3'), tcp(51500, 443), app('HTTP', [['Request', 'GET /']])], say: '<b>Router(L3)</b>는 Dst MAC이 자기 것임을 확인하고 <b>Ethernet 헤더를 벗긴다</b>. 그다음 IP 헤더의 Dst IP를 보고 다음 장비를 정한다. TCP·HTTP는 열어 보지 않는다.' },
        { from: 'r', to: 'b', cmp: 1, label: '새 L2 헤더', pkt: [eth('cc:cc', 'dd:dd (Host B)'), ip('192.168.0.23', '34.1.2.3'), tcp(51500, 443), app('HTTP', [['Request', 'GET /']])], say: '다음 장비(Host B)로 가는 <b>새 L2 헤더</b>를 붙여 내보낸다. Switch가 넘겨준 #2 프레임과 비교하면 <b>MAC 두 개만 바뀌고</b>(노란색) IP·TCP·HTTP는 그대로다 (2주차 핵심).' },
        { from: 'b', to: 'b', label: 'L7까지 해석', say: 'Host B는 끝까지 올라가 포트(443)로 프로세스를 찾고 HTTP를 해석한다. 진단 예: 같은 LAN은 되는데 인터넷만 안 됨 → L3(Gateway·Routing), 서버 프로세스가 안 떠 있음 → L4/L7.' },
      ] } },
  ] },

{ id: 'w1.lab', title: 'Mini Lab: 내 PC에서 인터넷까지 관찰하기', slides: 'S27–S28',
  blocks: [
    `<p>프로토콜을 깊게 배우기 전에도 “관찰”부터 시작할 수 있다. 명령어마다 답하는 질문이 다르다. 아래 값은 <b>Lab 1에서 직접 측정한 결과</b>다.</p>`,
    T(['명령', '답하는 질문', 'Lab 1 결과'], [['<code>ipconfig</code>', '내 IP · Mask · Default Gateway · DNS Server는?', '192.168.45.30 /24, GW 192.168.45.1'], ['<code>ping</code>', '도달하는가? RTT는?', 'GW &lt;1 ms · google.com 평균 44 ms'], ['<code>tracert</code>', '몇 개의 hop(라우터)을 거치는가?', '9 hop, 7→8 구간에서 9 → 42 ms'], ['<code>nslookup</code>', '이 이름은 어떤 IP로 바뀌는가?', 'DNS가 A 레코드(IP)를 반환']]),
    `<p>강의 질문 “<b>IP와 domain의 차이는?</b>” — IP는 네트워크가 쓰는 숫자 주소, domain은 사람이 쓰는 이름이다. <code>ping example.com</code>은 먼저 DNS로 이름을 IP로 바꾼 뒤 그 IP로 보낸다.</p>`,
    { trace: { title: 'tracert google.com 이 실제로 하는 일', sub: 'Lab 1 측정값', rowH: 96, minW: 680,
      nodes: [{ id: 'pc', label: '내 PC', sub: '192.168.45.30', icon: 'laptop', x: .07, y: 0 }, { id: 'gw', label: '공유기', sub: 'hop 1', icon: 'router', x: .27, y: 0 }, { id: 'isp', label: '통신사망', sub: 'hop 2~7', icon: 'router', x: .48, y: 0 }, { id: 'g8', label: 'Google 라우터', sub: 'hop 8', icon: 'router', x: .70, y: 0 }, { id: 'go', label: 'google.com', sub: 'hop 9', icon: 'server', x: .92, y: 0 }],
      links: [['pc', 'gw'], ['gw', 'isp'], ['isp', 'g8'], ['g8', 'go']],
      tables: [{ id: 'out', title: 'tracert 출력 (쌓이는 중)', cols: ['hop', 'RTT', '주소'] }],
      events: [
        { from: 'pc', to: 'gw', label: 'TTL = 1', pkt: [ip('192.168.45.30', '172.217.211.138', [['TTL', 1]]), app('ICMP', [['Type', 'Echo Request']])], say: 'tracert는 <b>TTL을 1부터</b> 늘려 가며 보낸다. 라우터는 패킷을 넘길 때마다 TTL을 1 줄이고, 0이 되면 버리면서 “시간 초과”를 돌려준다.' },
        { from: 'gw', to: 'gw', label: 'TTL 1 → 0 · 폐기', pkt: [ip('192.168.45.30', '172.217.211.138', [['TTL', 0]]), app('ICMP', [['Type', 'Echo Request']])], say: '공유기는 넘기기 전에 TTL을 1 줄인다 → <b>0</b>. TTL이 0인 패킷은 더 보내지 않고 버린다(무한히 떠도는 패킷 방지). 대신 출발지에게 알려 준다.' },
        { from: 'gw', to: 'pc', cmp: false, label: 'Time Exceeded', pkt: [ip('192.168.45.1', '192.168.45.30'), app('ICMP', [['Type', 'Time Exceeded']])], tables: { out: [['1', '<1 ms', '192.168.45.1']] }, say: '첫 번째 라우터(공유기)가 TTL 0이 되어 응답 → hop 1이 누구인지 알게 된다.' },
        { from: 'pc', to: 'isp', path: ['pc', 'gw', 'isp'], label: 'TTL = 2', drop: true, pkt: [ip('192.168.45.30', '172.217.211.138', [['TTL', 2]]), app('ICMP', [['Type', 'Echo Request']])], tables: { out: [['1', '<1 ms', '192.168.45.1'], ['2', '*', '요청 시간 초과']] }, say: 'hop 2는 응답을 보내지 않았다(*). 그 라우터가 ICMP 응답을 끈 것일 뿐, 뒤 hop이 응답하므로 <b>통과는 정상</b>이다.' },
        { from: 'pc', to: 'g8', path: ['pc', 'gw', 'isp', 'g8'], label: 'TTL = 8', pkt: [ip('192.168.45.30', '172.217.211.138', [['TTL', 8]]), app('ICMP', [['Type', 'Echo Request']])], tables: { out: [['1', '<1 ms', '192.168.45.1'], ['2', '*', '요청 시간 초과'], ['3~7', '…~9 ms', '통신사 내부망'], ['8', '42 ms', '142.250.163.48']] }, say: 'hop 7까지 9 ms였던 RTT가 hop 8에서 42 ms로 뛴다. <b>전체 지연의 대부분이 이 구간</b>(국외 구간)에서 생긴다.' },
        { from: 'pc', to: 'go', path: ['pc', 'gw', 'isp', 'g8', 'go'], label: 'TTL = 9', pkt: [ip('192.168.45.30', '172.217.211.138', [['TTL', 9]]), app('ICMP', [['Type', 'Echo Request']])], tables: { out: [['1', '<1 ms', '192.168.45.1'], ['2', '*', '요청 시간 초과'], ['3~7', '…~9 ms', '통신사 내부망'], ['8', '42 ms', '142.250.163.48'], ['9', '43 ms', '172.217.211.138']] }, say: '목적지 도착(Echo Reply). tracert가 보여 주는 것은 “IP가 바뀐 기록”이 아니라 <b>패킷이 지나온 라우터 목록</b>이다 (2주차).' },
      ] } },
  ] },

{ id: 'w1.qc', title: 'Quick Check — Week 1', slides: 'S29', tag: '점검',
  blocks: [`<p>강의 마지막 Quick Check. O/X를 고른 뒤 해설을 확인하자.</p>`, { qc: 'w1' }] },
] });
})();
