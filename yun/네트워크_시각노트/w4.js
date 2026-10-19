/* Week 4 — DNS, HTTP & HTTPS */
'use strict';
(function () {
const T = H.tbl;
const ip = (s, d) => ({ L: 'L3', n: 'IP', f: [['Src', s], ['Dst', d]] });
const udp = (s, d) => ({ L: 'L4', n: 'UDP', f: [['Src Port', s], ['Dst Port', d]] });
const tcp = (s, d, fl) => ({ L: 'L4', n: 'TCP', f: [['Src Port', s], ['Dst Port', d], ...(fl ? [['Flags', fl]] : [])] });
const dns = f => ({ L: 'L7', n: 'DNS', f });
const http = f => ({ L: 'L7', n: 'HTTP', f });
const tls = f => ({ L: 'L7', n: 'TLS', f });
const slot = (out, spec) => { const s = out.querySelector('.slot'); if (!s) return; s.innerHTML = ''; mountTrace(s, spec); };
const ms = x => Math.round(x * 1000);

const STATUS = {
  none: ['상태 코드 없음', 'br', 'DNS 실패 · TCP 거부/타임아웃 · 인증서 오류 → 브라우저 자체 오류 화면. CORS·Mixed Content는 응답이 왔지만 브라우저가 막은 것'],
  200: ['200 OK', 'app', '성공. 본문에 결과'], 201: ['201 Created', 'app', '생성됨 — Location 헤더에 새 자원 URL'], 304: ['304 Not Modified', 'app', '캐시 그대로 — 본문 없음 (ETag / If-None-Match). CDN·프록시도 만들 수 있다'],
  301: ['301 Moved Permanently', 'px', '영구 이동 (http→https 등). 프록시·앱 어디서든 설정 가능'], 400: ['400 Bad Request', 'app', '형식 오류 — JSON 파싱 실패·필수값 누락 → 요청 본문 · Content-Type'],
  401: ['401 Unauthorized', 'app', '<b>누구인지 모름</b> — 토큰 없음·만료 → Authorization 헤더'], 403: ['403 Forbidden', 'app', '<b>누군지 알지만 권한 없음</b> → 권한 · 역할 설정'],
  404: ['404 Not Found', 'app', '경로·자원 없음 → URL · 라우터 prefix (프록시의 라우팅 실패일 수도)'], 405: ['405 Method Not Allowed', 'app', '경로는 있으나 메서드 불일치 → 라우트 정의'],
  429: ['429 Too Many Requests', 'px', '호출 한도 초과 → Retry-After (게이트웨이 또는 앱)'], 500: ['500 Internal Server Error', 'app', '처리 중 예외 → 앱 로그의 스택 트레이스'],
  502: ['502 Bad Gateway', 'px', '프록시가 뒷단 연결 실패·잘못된 응답 (뒷단 포트에 listen 없음 → refused/reset)'], 503: ['503 Service Unavailable', 'px', '살아 있는 upstream 없음 · 점검 · 과부하 (일시적)'], 504: ['504 Gateway Timeout', 'px', '뒷단이 제한 시간 안에 답하지 않음 (느린 쿼리 등)'],
};
const ARCH = { nodes: [{ id: 'br', label: 'Browser', icon: 'browser', x: .07, y: 0 }, { id: 'dns', label: 'DNS Resolver', icon: 'dns', x: .25, y: 1 }, { id: 'cdn', label: 'CDN Edge', icon: 'globe', x: .36, y: 0 }, { id: 'px', label: 'LB · Proxy', icon: 'lb', x: .58, y: 0 }, { id: 'app', label: 'App Server', icon: 'proc', x: .78, y: 0 }, { id: 'db', label: 'DB · Cache', icon: 'db', x: .94, y: 0 }],
  links: [['br', 'dns', { dash: 1 }], ['br', 'cdn', { label: 'h2 · h3' }], ['cdn', 'px', { label: 'HTTP/1.1' }], ['px', 'app'], ['app', 'db', { label: 'TCP 5432' }]] };
const DIAG = {
  'ERR_NAME_NOT_RESOLVED': ['DNS', '이름에 대한 레코드가 없다 (NXDOMAIN)', '도메인 오타 · 레코드 등록 · nslookup'],
  'ERR_CONNECTION_REFUSED': ['TCP', '포트에 listen 소켓이 없다', '서버 실행 · 포트 · 바인드 주소'],
  'ERR_CONNECTION_TIMED_OUT': ['TCP', 'SYN에 응답이 없다', '방화벽 · 보안그룹 · 라우팅'],
  'ERR_CERT_COMMON_NAME_INVALID': ['TLS', '인증서 이름 불일치', '인증서 SAN · 접속 도메인'],
  'ERR_CERT_DATE_INVALID': ['TLS', '만료 또는 PC 시계 오류', '인증서 갱신 · 시스템 시간'],
  'CERTIFICATE_VERIFY_FAILED': ['TLS', '체인 검증 실패 (Python·curl)', 'Intermediate 누락 · 사설 CA'],
  'ERR_TOO_MANY_REDIRECTS': ['HTTP', '리다이렉트가 순환한다', 'http↔https 규칙 · 프록시 헤더'],
  '404 / 405': ['App', '경로 없음 / 메서드 불일치', 'URL prefix · 라우터 정의'],
  '401 / 403': ['App', '인증 안 됨 / 권한 없음', 'Authorization 헤더 · 토큰 만료'],
  '502 / 504': ['HTTP (프록시)', '뒷단 연결 실패 / 시간 초과', 'upstream 프로세스 · 타임아웃'],
  'blocked by CORS policy': ['브라우저', '다른 출처 응답 공유를 거부 (응답은 이미 옴)', 'Access-Control-Allow-Origin · preflight'],
  'Mixed Content': ['브라우저', 'HTTPS 페이지 안의 HTTP 요청 차단', 'API URL의 scheme'],
};
function flowSegs(st) { const s = []; if (!st.reuse) { s.push(['DNS', st.dns, 'l7']); if (st.proto === 'h3') s.push(['QUIC+TLS', st.rtt, 'l3']); else { s.push(['TCP', st.rtt, 'l4']); s.push(['TLS', st.rtt, 'l3']); } } s.push(['요청', st.rtt, 'l1']); s.push(['서버 처리', st.srv, 'ok']); s.push(['다운로드', st.dl, 'line']); return s; }

addWeek({ id: 'w4', num: 4, short: '4주', title: 'DNS, HTTP & HTTPS', range: 'Week 4',
  lead: 'TCP는 “바이트”를 옮겨 줄 뿐이다. 그 위에 DNS(이름 → 주소), HTTP(바이트 → 요청·응답), TLS(바이트 → 안전한 바이트)라는 약속을 얹는다. 주소창에 URL을 치고 화면이 뜨기까지의 모든 왕복을 따라간다.',
  sections: [

{ id: 'w4.flow', title: '주소창에 URL을 치면 일어나는 일', slides: 'S3, S5',
  blocks: [
    T(['문제', '해결', '바꾸는 것'], [['connect()에는 IP가 필요한데 사용자는 이름만 안다', '<span class="L7">DNS</span>', '이름 → 주소'], ['받은 바이트 중 어디까지가 요청이고 무엇을 원하는가', '<span class="L7">HTTP</span>', '바이트 → 요청·응답'], ['중간에서 누가 엿보거나 바꾸면', '<span class="L7">HTTPS (TLS)</span>', '바이트 → 안전한 바이트']]),
    { trace: { mode: 'ladder', title: '한 번의 페이지 요청 = 여러 프로토콜의 릴레이', sub: 'RTT 30 ms · 신규 연결', minW: 720, side: 120,
      lanes: [{ id: 'b', label: 'Browser' }, { id: 'r', label: 'DNS Resolver' }, { id: 's', label: 'Server', sub: '93.184.215.14' }],
      events: [
        { from: 'b', to: 'b', label: '① URL 파싱 (0 RTT)', color: 'l1', say: 'scheme·host·port·path를 분리하고, HSTS·캐시를 확인한다. 로컬 작업이라 왕복이 없다.' },
        { from: 'b', to: 'r', label: '② A? example.com', color: 'l7', pkt: [ip('192.168.0.23', '8.8.8.8'), udp(51000, 53), dns([['Query', 'example.com A?']])], say: '<b>DNS 조회</b> — host만 IP로 바꾼다(UDP 53). 캐시 miss면 수십~수백 ms (4.4).' },
        { from: 'r', to: 'b', label: 'A 93.184.215.14', color: 'l7', pkt: [ip('8.8.8.8', '192.168.0.23'), udp(53, 51000), dns([['Answer', 'A 93.184.215.14 TTL 3600']])], say: '예시에서 약 20 ms.' },
        { from: 'b', to: 's', label: '③ SYN', color: 'l4', pkt: [ip('192.168.0.23', '93.184.215.14'), tcp(51500, 443, 'SYN')], say: '<b>TCP 연결</b> — 3주차 3-way handshake. 1 RTT(30 ms).' },
        { from: 's', to: 'b', label: 'SYN+ACK', color: 'l4', pkt: [ip('93.184.215.14', '192.168.0.23'), tcp(443, 51500, 'SYN, ACK')], say: '(ACK는 다음 메시지와 함께 바로 나간다.)' },
        { from: 'b', to: 's', label: '④ ClientHello', color: 'l3', pkt: [ip('192.168.0.23', '93.184.215.14'), tcp(51500, 443, 'ACK'), tls([['Handshake', 'ClientHello'], ['SNI', 'example.com'], ['ALPN', 'h2, http/1.1']])], say: '<b>TLS 1.3 핸드셰이크</b> — 인증서 검증·세션 키 합의. 1 RTT (4.16).' },
        { from: 's', to: 'b', label: 'ServerHello · 인증서', color: 'l3', pkt: [ip('93.184.215.14', '192.168.0.23'), tcp(443, 51500, 'ACK'), tls([['Handshake', 'ServerHello + {Certificate, Finished}']])], say: '여기서부터 암호화. 30 ms.' },
        { from: 'b', to: 's', label: '⑤ GET /', color: 'l7', pkt: [ip('192.168.0.23', '93.184.215.14'), tcp(51500, 443, 'PSH, ACK'), { L: 'L7', n: 'TLS', enc: '🔒 GET / HTTP/2  Host: example.com' }], say: '<b>HTTP 요청</b>. 요청이 가는 데 반 RTT, 응답이 오는 데 반 RTT.' },
        { from: 's', to: 'b', label: '200 OK + HTML', color: 'l7', state: { s: '서버 처리 50 ms' }, pkt: [ip('93.184.215.14', '192.168.0.23'), tcp(443, 51500, 'PSH, ACK'), { L: 'L7', n: 'TLS', enc: '🔒 HTTP/2 200 OK  <!doctype html>…' }], say: '첫 바이트(TTFB)까지 = DNS 20 + TCP 30 + TLS 30 + 요청 30 + 서버 50 = <b>160 ms</b>, 다운로드 20 ms 더해 <b>180 ms</b>. 서버가 실제로 “일한” 시간은 50 ms뿐 — 나머지는 <b>거리(RTT)와 절차의 비용</b>이다.' },
        { from: 'b', to: 'b', label: '⑥ 렌더링 · 추가 요청', color: 'l1', say: 'HTML을 읽고 CSS·JS·이미지·API를 수십 번 더 요청한다. 같은 서버로의 두 번째 요청부터는 DNS·TCP·TLS가 사라진다 — <b>캐시와 연결 재사용의 힘</b>.' },
      ] } },
    { lab: { title: '타임라인 계산기 — 첫 바이트까지 몇 ms?', init: { rtt: 30, dns: 20, srv: 50, dl: 20, reuse: false, proto: 'h2' },
      ctl: [{ k: 'rtt', label: 'RTT', unit: 'ms', min: 1, max: 300 }, { k: 'dns', label: 'DNS', unit: 'ms', min: 0, max: 300 }, { k: 'srv', label: '서버 처리', unit: 'ms', min: 0, max: 500 }, { k: 'dl', label: '다운로드', unit: 'ms', min: 0, max: 300 }, { k: 'proto', type: 'select', label: '프로토콜', opts: [['h2', 'TCP + TLS 1.3 (h2)'], ['h3', 'QUIC (h3)']] }, { k: 'reuse', type: 'toggle', label: '같은 서버 두 번째 요청 (연결 재사용)' }],
      out: st => { const s = flowSegs(st); const ttfb = s.filter(x => x[0] !== '다운로드').reduce((a, x) => a + x[1], 0), tot = ttfb + st.dl;
        return `<div class="result">${s.map(x => `${x[0]} ${x[1]}`).join(' + ')} ms<br>TTFB = <b>${ttfb} ms</b> · 완료 = <b>${tot} ms</b> · 서버가 일한 비율 ${(st.srv / tot * 100).toFixed(0)}%</div>` + barsHTML([{ label: st.reuse ? '재사용 연결' : '신규 연결', segs: s.map(x => ({ v: x[1], c: x[2], t: x[1] > tot * .07 ? x[0] : '' })), val: tot + ' ms' }], tot) + `<div class="assume"><b>가정</b> 강의 예시처럼 단계가 순서대로 일어나고, 렌더링·추가 요청은 제외.</div>`; } } },
  ] },

{ id: 'w4.url', title: 'URL 해부 — URL ≠ Domain', slides: 'S6',
  blocks: [
    { lab: { title: 'URL 조각과 그것을 읽는 주체', init: { url: 'https://api.example.com:8443/v1/users/42?fields=name&lang=ko#profile' },
      ctl: [{ k: 'url', type: 'text', label: 'URL', w: 460 }],
      out: st => { const u = parseURL(st.url); if (!u) return '<span class="err">scheme://host[:port]/path?query#fragment 형식</span>';
        const enc = u.query && /[^\x00-\x7f]/.test(u.query) ? `<p>퍼센트 인코딩: <code>${esc(u.query.slice(1).split('&').map(kv => kv.split('=').map(encodeURIComponent).join('=')).join('&'))}</code></p>` : '<p class="cm" style="font-size:14px">해 보기: query에 한글을 넣어 보면(예: <code>?q=네트워크</code>) 퍼센트 인코딩 결과가 나온다.</p>';
        return `<div class="result" style="font-size:16px"><span class="L7">${esc(u.scheme)}</span>://<span class="L3">${esc(u.host)}</span><span class="L4">:${u.port}</span>${u.implicit ? '<span class="cm">(기본값)</span>' : ''}<b>${esc(u.path)}</b><span class="cok">${esc(u.query)}</span><span class="cm">${esc(u.frag)}</span></div>` +
          T(['구성요소', '값', '역할', '누가 읽는가'], [['scheme', u.scheme, '프로토콜과 기본 포트 결정 (http=80, https=443)', '브라우저'], ['host', u.host, 'DNS로 IP를 찾을 이름. HTTP Host 헤더로도 전달', '<b>DNS 리졸버</b> · 서버'], ['port', u.port + (u.implicit ? ' (생략)' : ''), 'TCP connect()의 목적지 포트', 'TCP (3주차)'], ['path', u.path, '서버 안의 자원 위치', '서버의 라우터'], ['query', u.query || '—', 'key=value, &로 구분. 한글·공백은 퍼센트 인코딩', '서버 애플리케이션'], ['fragment', u.frag || '—', '페이지 안의 위치. <b>서버로 전송되지 않는다</b>', '브라우저만']], { mono: [1] }) + enc; } } },
    H.key(`${H.exam('Quick Check Q1')} DNS가 아는 것은 host뿐이다. path·query는 DNS도 IP 라우터도 모른다 — HTTPS라면 경로 중간의 누구도 볼 수 없다 (단, 서버 로그와 브라우저 기록에는 남는다).`),
  ] },

{ id: 'w4.dnsh', title: '도메인 이름의 계층 구조', slides: 'S7',
  blocks: [
    `<p>오른쪽에서 왼쪽으로 읽는다: <code>www.inu.ac.kr.</code> = <b>. (root) → kr → ac.kr → inu.ac.kr → www</b>. 끝의 점(.)이 root(FQDN). DNS는 하나의 거대한 DB가 아니라 <b>위임(delegation)의 사슬</b>이다 — 각 단계는 다음 단계를 누가 아는지만 알려 준다. 2주차 next hop 라우팅과 같은 발상.</p>`,
    { lab: { title: '도메인 → 위임 사슬', init: { d: 'www.inu.ac.kr' },
      ctl: [{ k: 'd', type: 'text', label: '도메인', w: 240 }, { type: 'btns', items: ['www.inu.ac.kr', 'api.example.com', 'portal.inu.ac.kr'].map(v => ({ label: v, act: s => s.d = v })) }],
      out: st => { const p = st.d.replace(/\.$/, '').split('.').filter(Boolean); if (!p.length) return ''; const chain = [['. (root)', 'Root Server', 'TLD 서버의 위치만 안다']];
        for (let i = p.length - 1; i >= 0; i--) { const name = p.slice(i).join('.'); const lvl = p.length - i; chain.push([name, lvl === 1 ? 'TLD 서버' : i === 0 ? '(호스트 이름)' : lvl === 2 ? '권한 서버 (2nd level)' : '하위 영역', lvl === 1 ? `그 아래 도메인의 권한 서버(NS)를 안다 · ${/^(kr|jp|uk|de|cn)$/.test(name) ? 'ccTLD(국가)' : 'gTLD'}` : i === 0 ? '최종 A 레코드가 가리키는 대상' : '도메인 소유자가 레코드를 관리 — 최종 답은 여기서']); }
        return `<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:12px">${chain.map((c, i) => `<span style="font-family:var(--f-mono);font-weight:600;padding:6px 12px;border-radius:6px;background:${i === chain.length - 1 ? 'var(--ink)' : 'var(--l7s)'};color:${i === chain.length - 1 ? 'var(--paper)' : 'var(--l7)'}">${esc(c[0])}</span>${i < chain.length - 1 ? '<span class="cm">→</span>' : ''}`).join('')}</div>` + T(['이름', '단계', '아는 것'], chain.map(c => [esc(c[0]), c[1], c[2]]), { mono: [0] }); } } },
    T(['단계', '설명'], [['<b>Root</b>', '13개 이름(a~m.root-servers.net)이지만 anycast로 전 세계 수백 곳에 복제'], ['<b>TLD</b>', 'gTLD(.com · .org · .dev)와 국가 ccTLD(.kr · .jp)'], ['<b>Authoritative</b>', '도메인 소유자가 실제 레코드(A · CNAME · MX …)를 관리. <b>최종 답</b>']]),
    H.note('필기: inu.ac.kr이라는 도메인으로 권한 서버를 두면 그 밑에 mail, portal, ese 같은 이름을 마음대로 만들 수 있다.'),
  ] },

{ id: 'w4.resolve', title: 'DNS 해석: 재귀 질의와 반복 질의', slides: 'S8',
  blocks: [
    { lab: { title: 'www.example.com의 IP를 찾기', tag: '트레이스', init: { cached: false },
      ctl: [{ k: 'cached', type: 'toggle', label: '리졸버 캐시에 이미 있음' }],
      out: st => `<div class="result">${st.cached ? '캐시 hit → ②~⑦ 생략 → 클라이언트 기준 1 RTT로 끝' : 'Client ↔ Resolver: <b>재귀 질의</b> (“끝까지 알아와 줘”)<br>Resolver ↔ Root / TLD / 권한 서버: <b>반복 질의</b> (“나는 모른다, 저기 물어봐” = referral)'}</div><div class="slot"></div>`,
      after: (st, out) => { const L = [{ id: 'c', label: 'Client', sub: 'Stub' }, { id: 'r', label: 'Resolver', sub: '재귀' }, { id: 'root', label: 'Root' }, { id: 'tld', label: 'TLD (.com)' }, { id: 'auth', label: '권한 서버', sub: 'ns1.example.com' }];
        const q = n => dns([['Query', 'www.example.com A?'], ['RD', n]]);
        const ev = [{ from: 'c', to: 'r', label: '① A? www.example.com', color: 'l7', pkt: [ip('192.168.0.23', '168.126.63.1'), udp(51000, 53), q('1 (재귀 요청)')], say: 'Stub resolver(내 OS)가 리졸버에게 “<b>끝까지 알아와 줘</b>”(재귀, RD=1).' }];
        if (st.cached) ev.push({ from: 'r', to: 'c', label: '⑧ 93.184.215.14', color: 'ok', state: { r: '캐시 hit!' }, pkt: [ip('168.126.63.1', '192.168.0.23'), udp(53, 51000), dns([['Answer', 'A 93.184.215.14 (TTL 남은 값)']])], say: 'Root·TLD·권한 서버는 아무 일도 하지 않았다 — 대부분의 조회가 이렇게 끝난다.' });
        else ev.push(
          { from: 'r', to: 'root', label: '②', color: 'l3', pkt: [udp(40000, 53), q('0 (반복)')], say: '리졸버는 Root부터 묻는다.' },
          { from: 'root', to: 'r', label: '③ .com → a.gtld-servers.net', color: 'l1', pkt: [udp(53, 40000), dns([['Referral', '.com NS a.gtld-servers.net']])], say: 'Root: “나는 모른다. .com은 저기에 물어봐.” — <b>referral(위임)</b>.' },
          { from: 'r', to: 'tld', label: '④', color: 'l3', pkt: [udp(40000, 53), q('0 (반복)')], say: '리졸버가 TLD에 다시 묻는다.' },
          { from: 'tld', to: 'r', label: '⑤ example.com → ns1', color: 'l1', pkt: [udp(53, 40000), dns([['Referral', 'example.com NS ns1.example.com']])], say: 'TLD: “example.com은 ns1.example.com이 안다.”' },
          { from: 'r', to: 'auth', label: '⑥', color: 'l3', pkt: [udp(40000, 53), q('0 (반복)')], say: '권한 서버에게 묻는다.' },
          { from: 'auth', to: 'r', label: '⑦ A 93.184.215.14 TTL 3600', color: 'ok', pkt: [udp(53, 40000), dns([['Answer', 'A 93.184.215.14'], ['TTL', 3600], ['AA', '1 (권한 있는 답)']])], say: '<b>최종 답</b>은 권한 서버에서 나온다(aa 플래그).' },
          { from: 'r', to: 'c', label: '⑧ 93.184.215.14', color: 'ok', state: { r: '캐시 저장 (TTL 3600)' }, pkt: [ip('168.126.63.1', '192.168.0.23'), udp(53, 51000), dns([['Answer', 'A 93.184.215.14 TTL 3600']])], say: `리졸버·OS·브라우저가 TTL 동안 캐시한다. ${H.exam('Quick Check Q2')}재귀는 클라이언트↔리졸버, 반복은 리졸버↔각 서버.` });
        slot(out, { mode: 'ladder', title: st.cached ? '캐시 hit' : '모든 캐시가 빈 상태', lanes: L, minW: 780, side: 90, rowH: 54, events: ev }); } } },
  ] },

{ id: 'w4.ttl', title: 'DNS 캐시와 TTL', slides: 'S9',
  blocks: [
    `<p>답은 여러 층(브라우저 → OS·hosts → Recursive Resolver → 권한 서버)에 복사되고, <b>TTL(Time To Live, 초)</b>이 그 유통기한이다. 가까운 층에서 찾을수록 빠르다 — 대부분의 조회는 로컬에서 0~수 ms. 캐시된 답의 TTL은 시간이 지나며 줄어든다:</p>`,
    H.pre(`$ dig +noall +answer example.com
example.com.  3600  IN  A  93.184.215.14
$ dig +noall +answer example.com          (58초 뒤)
example.com.  3542  IN  A  93.184.215.14   ← 캐시에서 TTL이 줄어든다`),
    { lab: { title: 'TTL과 레코드 변경 — 누가 언제까지 옛 서버로 가나', init: { ttl: 3600, chg: 7200 },
      ctl: [{ k: 'ttl', label: 'TTL', unit: '초', min: 60, max: 86400 }, { k: 'chg', label: '레코드 변경 시점', unit: '초', min: 0, max: 86400 }],
      out: st => { const users = [.9, .5, .1, -.2].map(f => Math.max(0, st.chg - st.ttl * f)); const end = st.chg + st.ttl * 1.3;
        return `<div class="result">t=${st.chg}s에 새 IP로 변경. 직전에 캐시한 사용자는 최대 t=${st.chg + st.ttl}s까지 <b>옛 IP</b>로 간다 → 최악 전환 지연 = TTL = <b>${(st.ttl / 3600).toFixed(2)}시간</b></div>` +
          barsHTML(users.map((t0, i) => { const old = t0 < st.chg; return { label: `사용자 ${i + 1}`, segs: [{ v: t0, c: 'sunk', t: '' }, { v: st.ttl, c: old ? 'bad' : 'ok', t: old ? '옛 IP 캐시' : '새 IP 캐시' }], val: old ? `변경 후 ${Math.round(t0 + st.ttl - st.chg)}s 동안 옛 서버` : '정상' }; }), end) +
          `<p style="margin:0">${H.exam('Quick Check Q3')}일부 사용자만 옛 서버로 가는 이유 = 그들의 캐시에 옛 레코드가 TTL이 남은 채로 있기 때문. “DNS 전파에 48시간”은 전파가 아니라 <b>전 세계 캐시의 TTL 만료를 기다리는 것</b>. 이전 계획이 있으면 <b>며칠 전에 TTL부터 낮춘다</b>.</p>`; } } },
    T(['', 'TTL 짧게 (60~300 s)', 'TTL 길게 (3600~86400 s)'], [['장점', '변경이 빨리 퍼진다 (이전·장애 전환)', '캐시 적중↑ → 빠르고 권한 서버 부하↓'], ['단점', '질의 수·조회 지연 증가', '잘못된 레코드가 오래 남아 되돌리기 어렵다']]),
    `<p><b>Negative caching</b> — “없음(NXDOMAIN)”도 SOA의 negative TTL 동안 캐시된다(레코드를 막 만들었는데 안 보이는 이유). Windows: <code>ipconfig /flushdns</code>로 OS 캐시 비우기.</p>`,
  ] },

{ id: 'w4.rec', title: 'DNS 레코드 타입과 dig 읽기', slides: 'S10–S11',
  blocks: [
    `<p>레코드 한 줄 = <b>이름 · TTL · 클래스 · 타입 · 값</b> — <code>example.com.  3600  IN  A  93.184.215.14</code></p>`,
    T(['타입', '의미', '예', '쓰임'], [['A', 'IPv4 주소', 'example.com. A 93.184.215.14', '기본 이름 해석'], ['AAAA', 'IPv6 주소', 'example.com. AAAA 2001:db8::10', 'IPv6'], ['CNAME', '다른 이름의 별칭', 'www CNAME example.com.', 'CDN·SaaS (zone 최상단 불가)'], ['NS', '이 영역의 권한 서버', 'example.com. NS ns1.example.com.', '하위 영역 위임'], ['MX', '메일 서버 (우선순위)', 'MX 10 mail.example.com.', '이메일 수신'], ['TXT', '임의 텍스트', '"v=spf1 include:_spf.google.com ~all"', '소유 인증 · SPF · DKIM'], ['SOA', '영역 기본 정보', 'serial · refresh · retry · expire · neg TTL', '부정 캐시'], ['CAA', '발급 허용 CA', '0 issue "letsencrypt.org"', '인증서 오발급 방지'], ['PTR', 'IP → 이름', '14.215.184.93.in-addr.arpa. PTR example.com.', '로그·메일 검증']], { mono: [0, 2] }),
    H.warn('흔한 실수: 루트 도메인(example.com)에 CNAME을 걸려는 것 → 그래서 클라우드 DNS는 ALIAS·ANAME 같은 비표준 확장을 제공한다.'),
    H.pre(`$ dig www.example.com
;; ->>HEADER<<- opcode: QUERY, status: NOERROR        ← NXDOMAIN = 이름 없음 · SERVFAIL = 답을 못 함
;; flags: qr rd ra; QUERY: 1, ANSWER: 2              ← rd 재귀요청 · ra 재귀가능 · (aa 권한 있는 답)
;; ANSWER SECTION:
www.example.com.  300  IN  CNAME  example.com.       ← 별칭 → 원래 이름으로
example.com.      300  IN  A      93.184.215.14      ← 최종 IPv4, TTL 300
;; Query time: 23 msec
;; SERVER: 168.126.63.1#53 (UDP)                     ← 물어본 리졸버, UDP 53`),
    `<p>대부분 UDP 53 1회 왕복. 응답이 잘리면(TC 플래그) TCP 53으로 재질의. 평문 DNS는 경로에서 보인다 → <b>DoT(853) · DoH(443)</b>는 암호화. NXDOMAIN과 SERVFAIL은 조사 방향이 다르지만 브라우저에는 둘 다 “사이트에 연결할 수 없음”. Windows: <code>nslookup</code>, <code>Resolve-DnsName</code>.</p>`,
  ] },

{ id: 'w4.dnsctl', title: 'DNS는 트래픽 제어 장치이기도 하다', slides: 'S12',
  blocks: [
    { trace: { title: 'GeoDNS — 같은 질문, 다른 답', rowH: 96, minW: 640,
      nodes: [{ id: 'kr', label: '서울 사용자', icon: 'user', x: .1, y: 0 }, { id: 'us', label: '미국 사용자', icon: 'user', x: .1, y: 2 }, { id: 'g', label: 'GeoDNS', sub: 'www.shop.com', icon: 'dns', x: .46, y: 1 }, { id: 'skr', label: '서울 리전', sub: '13.124.x.x', icon: 'server', x: .88, y: 0 }, { id: 'sus', label: '미국 리전', sub: '54.80.x.x', icon: 'server', x: .88, y: 2 }],
      links: [['kr', 'g'], ['us', 'g'], ['kr', 'skr'], ['us', 'sus']],
      events: [
        { from: 'kr', to: 'g', label: 'A?', color: 'l7', say: '서울 사용자의 리졸버가 묻는다.' },
        { from: 'g', to: 'kr', label: '13.124.x.x', color: 'l7', say: 'GeoDNS는 <b>묻는 위치(리졸버 기준)</b>에 따라 다른 IP를 준다.' },
        { from: 'us', to: 'g', label: 'A?', color: 'l7', say: '같은 이름을 미국에서 묻는다.' },
        { from: 'g', to: 'us', label: '54.80.x.x', color: 'l7', say: '다른 답.' },
        { from: 'kr', to: 'skr', label: 'HTTPS', color: 'ok', say: '각자 가까운 리전으로 → RTT가 작다(1주차 Scenario A/B).' },
      ] } },
    T(['방식', '원리', '주의'], [['CDN 연결', 'CNAME 체인: www.shop.com → d123.cdn.net → 사용자와 가까운 엣지 IP', ''], ['GeoDNS · 지연 기반', '묻는 위치에 따라 다른 답', '리졸버가 멀면 엉뚱한 리전'], ['DNS Round Robin', 'A 레코드 여러 개를 돌려 가며', '서버 상태를 몰라 죽은 서버 IP도 나눠 준다'], ['Failover', '헬스체크 + 레코드 교체', '효과는 TTL만큼 늦게']]),
    T(['개발 환경', '이름 해석', '예'], [['hosts 파일', 'DNS보다 먼저 참조되는 로컬 고정 매핑', 'C:\\Windows\\System32\\drivers\\etc\\hosts'], ['Docker Compose', '같은 네트워크의 서비스 이름 = 호스트 이름', 'postgres://db:5432'], ['Kubernetes', '클러스터 내부 DNS', 'api.default.svc.cluster.local']], { mono: [2] }),
    H.key('DNS는 주소록이면서 가장 앞단의 부하 분산기다. 단, 캐시 때문에 즉시성은 없다 — 초 단위 전환은 로드 밸런서가 맡는다.'),
  ] },

{ id: 'w4.http', title: 'HTTP — 바이트 스트림 위의 요청·응답 약속', slides: 'S13',
  blocks: [
    `<ol><li><b>요청 → 응답</b> — 항상 클라이언트가 먼저 묻는다. 서버는 먼저 말을 걸 수 없다 → 실시간 알림에는 WebSocket·SSE가 따로 필요.</li><li><b>무상태(Stateless)</b> — 서버는 이전 요청을 기억하지 않는다. 매 요청이 필요한 정보(인증·언어·조건)를 스스로 담아 와야 한다 → 쿠키·토큰.</li><li><b>텍스트 기반(HTTP/1.1)</b> — 줄 단위 메시지. 소켓으로 직접 써서 보낼 수도 있다. HTTP/2부터는 같은 의미를 바이너리 프레임에.</li></ol>`,
    T(['HTTP가 정한다', '다른 계층·설계에 맡긴다'], [['메시지 형식 (시작줄 · 헤더 · 빈 줄 · 본문)', '전달 신뢰성·순서 → TCP / QUIC'], ['메서드의 의미와 성질 (안전·멱등)', '암호화·서버 인증 → TLS'], ['상태 코드의 의미', '이름 → IP → DNS'], ['헤더의 의미 (캐시 · 인증 · 콘텐츠 협상)', 'JSON 구조·URL 설계 → REST (다음 주)']]),
    H.key('HTTP는 3주차 “메시지 경계 문제”에 대한 하나의 답이다 — 헤더는 빈 줄(CRLF CRLF)로 끝나고, 본문의 길이는 Content-Length로 미리 알린다.'),
    H.note('필기: 첫 요청 GET /에 서버는 Landing page(HTML)를 보낸다. HTML은 배치, JavaScript는 브라우저에서 실행되는 상호작용을 담당한다.'),
  ] },

{ id: 'w4.msg', title: 'HTTP 메시지 구조', slides: 'S14–S15',
  blocks: [
    { lab: { title: 'Request = 시작줄 + 헤더 + 빈 줄 + 본문', init: { body: '{"name":"kim","age":21}' },
      ctl: [{ k: 'body', type: 'text', label: '요청 본문 (한글도 넣어 보기)', w: 320 }],
      out: st => { const n = utf8(st.body); const line = (t, c, lab) => `<div style="display:grid;grid-template-columns:110px minmax(0,1fr) 60px;gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line2)"><span style="font-size:12.5px;font-weight:600;color:${COLOR(c)}">${lab}</span><code style="background:none;border:0;font-size:14px;overflow-x:auto;white-space:pre">${esc(t)}</code><span class="cm mono" style="font-size:12px">${lab === 'Body' ? n + ' B' : '\\r\\n'}</span></div>`;
        return `<div style="max-width:760px">${line('POST /v1/users HTTP/1.1', 'l7', 'Request line')}${line('Host: api.example.com', 'l3', 'Headers')}${line('Content-Type: application/json', 'l3', '')}${line('Content-Length: ' + n, 'l4', '')}${line('Authorization: Bearer eyJhbGciOi…', 'l3', '')}${line('', 'bad', 'Empty line')}${line(st.body, 'ok', 'Body')}</div>` +
          `<div class="result" style="margin-top:12px">Content-Length = 본문의 <b>바이트</b> 수 = <b>${n}</b>${n !== st.body.length ? ` (글자는 ${st.body.length}자 — 한글은 UTF-8로 3바이트씩)` : ''}</div>`; } } },
    T(['부분', '내용'], [['<b>Request line</b>', 'Method + Request-target + Version — 공백으로 구분'], ['<b>Headers</b>', '이름: 값 한 줄씩. <b>Host는 HTTP/1.1의 유일한 필수 헤더</b> (한 IP의 여러 사이트 = 가상 호스팅)'], ['<b>Empty line</b>', '\\r\\n\\r\\n을 만나면 서버는 “이제 본문”'], ['<b>Body</b>', 'Content-Length 바이트만큼. GET은 보통 본문 없음']]),
    H.warn('소켓으로 직접 HTTP를 보낼 때 \\r\\n 대신 \\n만 쓰거나 마지막 빈 줄을 빠뜨리면 서버는 요청이 끝나지 않았다고 보고 계속 기다린다 — 가장 흔한 실습 버그.'),
    `<p>${H.exam('Quick Check Q4')}헤더와 본문의 경계 = <b>빈 줄(CRLF CRLF)</b>, 본문의 끝 = <b>Content-Length</b> 또는 chunked.</p>`,
    { h3: 'Response — 시작줄만 다르고 구조는 같다' },
    H.pre(`HTTP/1.1 201 Created                              ← Version + Status Code + Reason
Content-Type: application/json; charset=utf-8      ← 본문 해석 방법 (charset이 틀리면 한글 깨짐)
Content-Length: 31
Location: /v1/users/42                             ← 201이면 새 자원, 3xx면 리다이렉트 목적지
Cache-Control: no-store
Set-Cookie: sid=9f2c…; HttpOnly; Secure            ← 상태를 클라이언트에 맡긴다

{"id":42,"name":"kim","age":21}`),
    `<p>같은 틀이라 파서 하나로 둘 다 읽을 수 있고, 프록시가 중간에서 헤더를 고쳐 쓸 수 있다. Reason phrase(Created)는 사람용이라 HTTP/2에서는 사라졌다.</p>`,
  ] },

{ id: 'w4.method', title: 'Method · 안전성 · 멱등성', slides: 'S16–S17',
  blocks: [
    T(['Method', '의미', 'Body', 'Safe', 'Idempotent', '예'], [['GET', '자원 조회', '✕', '✓', '✓', 'GET /users/42'], ['HEAD', '헤더만 조회', '✕', '✓', '✓', '크기·수정 시각'], ['POST', '생성 · 처리', '✓', '✕', '<b>✕</b>', 'POST /users'], ['PUT', '전체 교체 (없으면 생성)', '✓', '✕', '✓', 'PUT /users/42'], ['PATCH', '부분 수정', '✓', '✕', '설계 따라', 'PATCH /users/42 {"age":22}'], ['DELETE', '삭제', '선택', '✕', '✓', 'DELETE /users/42'], ['OPTIONS', '허용 메서드 확인', '✕', '✓', '✓', 'CORS preflight']], { mono: [0, 5] }),
    `<ul><li><b>Safe</b> — 서버 상태를 바꾸지 않는다. 크롤러·프리페치·캐시가 마음껏 호출해도 된다.</li><li><b>Idempotent(멱등)</b> — N번 보내도 1번과 서버 상태가 같다. DELETE 두 번째가 404여도 상태는 같으므로 멱등.</li></ul>`,
    H.warn('GET으로 삭제·결제를 구현하면 안 되는 이유: 브라우저 프리페치, 검색 크롤러, 캐시가 “GET은 안전하다”고 믿고 마음대로 호출하기 때문.'),
    { lab: { title: '응답이 사라졌을 때, 다시 보내도 되는가?', tag: '트레이스', init: { key: false },
      ctl: [{ k: 'key', type: 'toggle', label: 'Idempotency-Key 사용' }],
      out: st => `<div class="verdict ${st.key ? 'ok' : 'bad'}">${st.key ? '같은 키 → 저장된 결과 반환 → 주문 1건' : '키 없이 재시도 → 주문 2건 = 중복 결제'}</div><div class="slot"></div>`,
      after: (st, out) => { const k = st.key ? [['Idempotency-Key', 'a1b2']] : [];
        slot(out, { mode: 'ladder', title: 'POST /orders 재시도', lanes: [{ id: 'c', label: 'Client' }, { id: 's', label: 'Server' }], tables: [{ id: 'o', title: 'Server의 주문 DB', cols: ['주문', '키'] }], events: [
          { from: 'c', to: 's', label: 'POST /orders', color: 'l7', pkt: [http([['Request', 'POST /orders'], ...k])], tables: { o: [['#101', st.key ? 'a1b2' : '—']] }, say: '주문 #101이 생성됐다.' },
          { from: 's', to: 'c', label: '201 Created', color: 'ok', drop: true, pkt: [http([['Status', '201 주문 #101']])], say: '그런데 응답이 유실됐다. 네트워크는 “요청이 실패했는지”와 “응답만 사라졌는지”를 구분해 주지 않는다 (3주차: ACK는 앱의 처리를 보장하지 않는다).' },
          { kind: 'gap', text: '— 타임아웃 → 재시도 —', say: 'Client는 실패한 줄 알고 다시 보낸다.' },
          { from: 'c', to: 's', label: 'POST /orders', color: 'l7', pkt: [http([['Request', 'POST /orders'], ...k])], tables: { o: st.key ? [['#101', 'a1b2']] : [['#101', '—'], ['#102', '—']] }, state: { s: st.key ? '같은 키 → 저장된 결과' : '새 주문 생성 (!)' }, say: st.key ? '서버가 키 a1b2를 보고 “같은 요청”임을 알아 새로 만들지 않는다 — POST를 <b>멱등하게 만들었다</b>.' : 'POST는 멱등이 아니라 새 주문이 하나 더 생긴다.' },
          { from: 's', to: 'c', label: st.key ? '201 주문 #101' : '201 주문 #102', color: st.key ? 'ok' : 'bad', pkt: [http([['Status', st.key ? '201 주문 #101' : '201 주문 #102']])], say: `${H.exam('Quick Check Q5')}자동 재시도는 <b>멱등 요청에만</b> 안전하다. PUT은 “이 자원을 이 내용으로” — 몇 번 해도 같다. POST는 “새로 만들어 줘” — 보낼 때마다 생긴다 → Idempotency-Key.` },
        ] }); } } },
  ] },

{ id: 'w4.status', title: 'Status Code — 누가 답했나', slides: 'S18–S20',
  blocks: [
    T(['범위', '뜻', '예'], [['1xx', '정보 — 처리 중 · 프로토콜 전환', '100 Continue · 101 Switching Protocols (WebSocket)'], ['2xx', '성공', '200 · 201 · 204'], ['3xx', '리다이렉션 — 다른 곳을 보거나 캐시를 써라', '301·308 영구 · 302·307 임시 · 304'], ['4xx', '클라이언트 오류 — 요청을 고쳐야', '400 · 401 · 403 · 404 · 405 · 409 · 422 · 429'], ['5xx', '서버 오류 — 서버나 중간 장비 실패', '500 · 502 · 503 · 504']], { mono: [0] }),
    T(['판단 질문', '4xx', '5xx'], [['같은 요청을 다시 보내면?', '요청을 바꾸기 전엔 계속 실패', '잠시 후 성공할 수도 (재시도 후보 — 멱등일 때만)'], ['누가 고쳐야?', '호출하는 쪽 (URL·인증·본문)', '서버 운영·개발 쪽 (로그·뒷단·용량)'], ['알림?', '급증할 때만', '항상 — SLO 위반 지표']]),
    { lab: { title: '상태 코드를 고르면 그 응답을 만든 주체를 표시', init: { code: '502' },
      ctl: [{ k: 'code', type: 'select', label: '상태 코드', opts: Object.entries(STATUS).map(([k, v]) => [k, v[0]]) }],
      out: st => { const s = STATUS[st.code]; return `<div class="result"><b>${s[0]}</b> — ${({ br: '브라우저가 스스로 띄운 오류 화면', px: 'LB · Reverse Proxy · CDN이 만든 응답', app: 'App Server(FastAPI 등)가 만든 응답' })[s[1]]}<br>${s[2]}</div><div class="slot"></div>` + (['502', '504'].includes(st.code) ? '<p style="margin:0">502·504 = 프록시가 보고하는 <b>뒷단의 전송 계층 실패</b> — 3주차 refused / timed out이 HTTP 코드로 번역되어 나타난 것.</p>' : ''); },
      after: (st, out) => { const s = STATUS[st.code]; const ev = s[1] === 'br' ? [{ from: 'br', to: 'cdn', label: 'DNS·TCP·TLS 실패', drop: true, color: 'bad', say: '상태 코드가 없다 = HTTP까지 가지 못했다.' }] : st.code === '502' ? [{ from: 'br', to: 'px', path: ['br', 'cdn', 'px'], label: 'GET', color: 'l7' }, { from: 'px', to: 'app', label: 'connect', drop: true, color: 'bad', say: '프록시가 뒷단에 연결하지 못한다 (프로세스 다운·포트 오류).' }, { from: 'px', to: 'br', path: ['px', 'cdn', 'br'], label: '502', color: 'bad', on: ['px'], say: '그래서 <b>프록시</b>가 502를 만들어 돌려준다.' }] : st.code === '504' ? [{ from: 'br', to: 'px', path: ['br', 'cdn', 'px'], label: 'GET', color: 'l7' }, { from: 'px', to: 'app', label: 'req', color: 'l7' }, { from: 'app', to: 'db', label: '느린 쿼리…', color: 'l4', say: '앱이 DB를 기다리느라 늦는다.' }, { from: 'px', to: 'br', path: ['px', 'cdn', 'br'], label: '504', color: 'bad', on: ['px'], say: '프록시의 제한 시간(예: 60s)을 넘겨 <b>프록시</b>가 504를 만든다.' }] : [{ from: 'br', to: s[1], path: s[1] === 'app' ? ['br', 'cdn', 'px', 'app'] : ['br', 'cdn', 'px'], label: 'GET', color: 'l7' }, { from: s[1], to: 'br', path: s[1] === 'app' ? ['app', 'px', 'cdn', 'br'] : ['px', 'cdn', 'br'], label: st.code, color: +st.code >= 400 ? 'bad' : 'ok', on: [s[1]], say: `${s[0]}을 만든 것은 <b>${s[1] === 'app' ? 'App Server' : 'LB · Proxy'}</b>. 상태 코드를 받았다면 DNS·TCP·TLS는 이미 성공했다.` }];
        slot(out, { title: '어디서 만들어졌나', rowH: 96, minW: 700, nodes: ARCH.nodes, links: ARCH.links, start: 'end', events: ev }); } } },
    `<p>${H.exam('Quick Check Q6')}404는 보통 <b>App Server</b>(라우팅 실패), 502는 <b>Reverse Proxy·LB</b>(뒷단 연결 실패). 느린 쿼리 → 504, 연결 풀 고갈 → 500, 앱 프로세스 다운 → 502.</p>`,
    H.note('필기의 “4xx = 프론트, 5xx = 백엔드”는 대략적인 감이다. 정확히는 4xx = 요청을 바꿔야 함(호출하는 쪽), 5xx = 서버 쪽 실패. AI가 “401이면 권한 설정을 바꾸라”고 하면 401(누구인지 모름)과 403(누군지 알지만 안 됨)을 구분하는지부터 검증하라.'),
  ] },

{ id: 'w4.state', title: 'Header · Body · 로그인 상태 유지', slides: 'S21–S23',
  blocks: [
    T(['Request Header', '역할', 'Response Header', '역할'], [['Host', '대상 호스트 (필수)', 'Content-Type', '본문 형식·문자셋'], ['User-Agent', '클라이언트 종류', 'Content-Length', '본문 바이트 수(경계)'], ['Accept / Accept-Encoding', '원하는 형식 / 압축', 'Content-Encoding', '적용된 압축 (gzip · br)'], ['Authorization', 'Bearer 토큰 · Basic', 'Location', '리다이렉트 · 생성된 자원'], ['Cookie', '저장된 쿠키를 서버로', 'Set-Cookie', '쿠키 저장 (HttpOnly · Secure · SameSite)'], ['Content-Type', '요청 본문 형식', 'Cache-Control / ETag', '캐시 범위·수명 / 버전'], ['Origin', '요청 출처 (CORS 판단)', 'Access-Control-Allow-Origin', '다른 출처에 공유 허용'], ['If-None-Match', '“이 ETag 그대로면 304”', 'Strict-Transport-Security', 'HSTS — 앞으로 HTTPS만']], { mono: [0, 2] }),
    T(['Content-Type', '본문', '쓰임'], [['application/json', '{"name":"kim"}', 'REST API 표준'], ['application/x-www-form-urlencoded', 'name=kim&age=21', 'HTML form 기본'], ['multipart/form-data', '--boundary 로 구분된 파트', '파일 업로드'], ['text/event-stream', 'data: {"token":"안"}', 'SSE — LLM 토큰 스트리밍']], { mono: [0, 1] }),
    `<p><b>본문의 끝</b>을 알리는 두 방법: <b>Content-Length</b>(길이를 먼저) 또는 <b>Transfer-Encoding: chunked</b>(조각마다 크기, 크기 0 조각이 끝 — 끝을 모르는 스트리밍). 값이 틀리면 응답이 잘리거나 영원히 기다린다. 헤더 이름은 대소문자 구분 없음(HTTP/2부터 소문자).</p>`,
    { h3: '무상태 HTTP에서 “로그인 상태” — 서버가 기억하느냐, 클라이언트가 증명하느냐' },
    { lab: { title: '세션 쿠키 vs 토큰(JWT)', tag: '트레이스', init: { m: 'session' },
      ctl: [{ k: 'm', type: 'select', label: '방식', opts: [['session', '세션 쿠키'], ['jwt', '토큰 (JWT)']] }],
      out: st => '<div class="slot"></div>' + T(['', '세션 쿠키', '토큰 (JWT)'], [['상태 저장 위치', '서버 (메모리 · Redis)', '클라이언트 (토큰 안에 사용자 정보 + 서명)'], ['서버 확장', '여러 서버가 세션 저장소를 공유해야', '서명 키만 있으면 어느 서버든 검증'], ['강제 로그아웃', '세션 삭제로 즉시', '만료 전까지 어렵다 (짧은 만료 + refresh)']]),
      after: (st, out) => { const j = st.m === 'jwt';
        slot(out, { mode: 'ladder', title: j ? '토큰 — 클라이언트가 증명한다' : '세션 쿠키 — 서버가 기억한다', lanes: [{ id: 'c', label: 'Browser' }, { id: 's', label: 'Server' }, { id: 'db', label: j ? '(저장소 없음)' : '세션 저장소' }], tables: [{ id: 'cl', title: '브라우저가 가진 것', cols: ['항목', '값'] }], events: j ? [
          { from: 'c', to: 's', label: 'POST /login', color: 'l7', pkt: [http([['Request', 'POST /login'], ['body', 'id · pw']])], say: '로그인.' },
          { from: 's', to: 'c', label: '200 {access_token}', color: 'ok', pkt: [http([['Status', '200'], ['body', '{"access_token":"eyJ…"}']])], tables: { cl: [['access_token', 'eyJ… (user 42 + 서명)']] }, say: '서버는 사용자 정보에 <b>서명한 토큰</b>을 발급만 하고 저장하지 않는다.' },
          { from: 'c', to: 's', label: 'GET /me', color: 'l7', state: { s: '서명 검증만 → user 42' }, pkt: [http([['Request', 'GET /me'], ['Authorization', 'Bearer eyJ…']])], say: '매 요청에 토큰을 담는다. 서버는 <b>서명만 검증</b> — 저장소 조회 없음 → 서버를 늘리기 쉽다. 대신 만료 전에는 강제 로그아웃이 어렵다.' },
        ] : [
          { from: 'c', to: 's', label: 'POST /login', color: 'l7', pkt: [http([['Request', 'POST /login'], ['body', 'id · pw']])], say: '로그인.' },
          { from: 's', to: 'db', label: 'abc → user 42', color: 'l4', say: '서버가 저장소에 세션 엔트리를 만든다(필기: 서버 DB의 키값).' },
          { from: 's', to: 'c', label: 'Set-Cookie: sid=abc', color: 'ok', pkt: [http([['Status', '200'], ['Set-Cookie', 'sid=abc; HttpOnly; Secure']])], tables: { cl: [['Cookie sid', 'abc (키만 가짐)']] }, say: '클라이언트는 <b>키만</b> 들고, 정보는 서버가 가진다. HttpOnly = JS에서 못 읽음, Secure = HTTPS에서만, SameSite = 다른 사이트발 요청에 동봉 제한.' },
          { from: 'c', to: 's', label: 'GET /me', color: 'l7', pkt: [http([['Request', 'GET /me'], ['Cookie', 'sid=abc']])], say: '브라우저가 매 요청에 Cookie를 자동으로 붙인다 — 무상태 HTTP를 상태 있게 만드는 장치.' },
          { from: 's', to: 'db', label: 'abc 조회', color: 'l4', state: { s: '→ user 42' }, say: '서버가 저장소에서 찾아 사용자를 확인. 세션을 지우면 즉시 로그아웃 가능, 대신 서버들이 저장소를 공유해야 한다.' },
        ] }); } } },
  ] },

{ id: 'w4.cache', title: 'HTTP 캐싱 — 가장 빠른 요청은 보내지 않는 요청', slides: 'S24',
  blocks: [
    { lab: { title: '두 번째 요청은 어떻게 처리되나', tag: '트레이스', init: { cc: 'max-age=60', el: 30, chg: false },
      ctl: [{ k: 'cc', type: 'select', label: 'Cache-Control', opts: [['max-age=60', 'max-age=60'], ['no-cache', 'no-cache'], ['no-store', 'no-store'], ['max-age=31536000, immutable', 'max-age=1년, immutable']] }, { k: 'el', label: '첫 요청 후 경과', unit: '초', min: 0, max: 300 }, { k: 'chg', type: 'toggle', label: '그 사이 서버 파일이 바뀜' }],
      out: st => '<div class="slot"></div>',
      after: (st, out) => { const max = st.cc.startsWith('max-age=3') ? 31536000 : 60; const kind = st.cc === 'no-store' ? 'full' : st.cc === 'no-cache' ? 'reval' : st.el < max ? 'fresh' : 'reval';
        const first = [{ from: 'b', to: 's', label: '① GET /app.css', color: 'l7', pkt: [http([['Request', 'GET /app.css']])], say: '첫 요청.' }, { from: 's', to: 'b', label: '200 · ETag "v7"', color: 'ok', pkt: [http([['Status', '200 OK'], ['ETag', '"v7"'], ['Cache-Control', st.cc]])], tables: { c: st.cc === 'no-store' ? [] : [['/app.css', '"v7"', st.cc]] }, say: st.cc === 'no-store' ? '<b>no-store</b> → 브라우저는 저장하지 않는다.' : `브라우저 캐시에 본문과 ETag "v7"을 저장한다 (${st.cc}).` }, { kind: 'gap', text: `— ${st.el}초 뒤 같은 요청 —` }];
        const second = kind === 'fresh' ? [{ from: 'b', to: 'b', label: '캐시에서 바로 (0 RTT)', color: 'ok', say: `경과 ${st.el}s < max-age ${max}s → <b>네트워크에 나가지도 않는다</b>.${st.chg ? ' 서버 파일이 바뀌었어도 모른다! — 그래서 정적 파일은 해시 파일명(app.3f9a.css)을 쓴다.' : ''}` }]
          : kind === 'full' ? [{ from: 'b', to: 's', label: 'GET /app.css', color: 'l7', say: '저장된 것이 없으니 처음부터.' }, { from: 's', to: 'b', label: '200 + 본문 전체', color: 'l4', say: '매번 전체를 받는다. 개인정보·토큰 응답에 쓴다.' }]
          : [{ from: 'b', to: 's', label: 'GET  If-None-Match: "v7"', color: 'l7', pkt: [http([['Request', 'GET /app.css'], ['If-None-Match', '"v7"']])], say: st.cc === 'no-cache' ? '<b>no-cache</b> = 저장은 하되 <b>쓰기 전에 매번 검증</b>. “캐시하지 마라”가 아니다!' : `max-age ${max}s가 지나 만료 → 서버에 “v7 그대로인가요?”라고 조건부로 묻는다.` }, { from: 's', to: 'b', label: st.chg ? '200 + 새 본문 ETag "v8"' : '304 Not Modified', color: st.chg ? 'l4' : 'ok', pkt: [http([['Status', st.chg ? '200 OK' : '304 Not Modified'], ['ETag', st.chg ? '"v8"' : '"v7"']])], tables: { c: [['/app.css', st.chg ? '"v8"' : '"v7"', st.cc]] }, say: st.chg ? '바뀌었으니 새 본문을 받는다.' : '<b>본문 없이</b> “그대로 써라” — 1 RTT, 적은 바이트.' }];
        slot(out, { mode: 'ladder', title: st.cc, lanes: [{ id: 'b', label: 'Browser (+캐시)' }, { id: 's', label: 'Server' }], tables: [{ id: 'c', title: '브라우저 캐시', cols: ['URL', 'ETag', '정책'] }], start: 'end', events: first.concat(second) }); } } },
    T(['Cache-Control', '의미'], [['max-age=N', 'N초 동안 묻지 않고 재사용'], ['no-cache', '저장은 하되, 쓰기 전에 매번 서버에 검증'], ['no-store', '저장 자체 금지 — 개인정보·토큰'], ['private / public', '브라우저만 / CDN 같은 공유 캐시도'], ['immutable', '절대 안 바뀜 — 해시가 붙은 정적 파일'], ['s-maxage=N', '공유 캐시(CDN) 전용 수명']], { mono: [0] }),
    H.warn('<b>no-cache는 “캐시하지 마라”가 아니라 “쓰기 전에 매번 확인하라”다.</b> 저장 자체를 막으려면 no-store — AI가 만든 설정에서 가장 자주 틀리는 부분.'),
    H.note('필기: 프록시 서버도 같은 원리로 응답을 캐싱해, 재요청을 바로 돌려주고 원 서버로 몰리는 요청을 분산한다(기관에서 자주 사용).'),
  ] },

{ id: 'w4.ver', title: 'HTTP/1.0 → 1.1 → 2 → 3', slides: 'S25–S28',
  blocks: [
    { fig: barsHTML([{ label: 'HTTP/1.0', segs: [{ v: 2, c: 'l4', t: 'TCP' }, { v: 2, c: 'l7', t: '1' }, { v: 2, c: 'l4', t: 'TCP' }, { v: 2, c: 'l7', t: '2' }, { v: 2, c: 'l4', t: 'TCP' }, { v: 2, c: 'l7', t: '3' }], val: '12' }, { label: '1.1 Keep-Alive', segs: [{ v: 2, c: 'l4', t: 'TCP' }, { v: 2, c: 'l7', t: '1' }, { v: 2, c: 'l7', t: '2' }, { v: 2, c: 'l7', t: '3' }], val: '8' }, { label: '1.1 Pipelining', segs: [{ v: 2, c: 'l4', t: 'TCP' }, { v: 7, c: 'bad', t: '1 (느림) — 2·3 대기' }, { v: 1, c: 'l7', t: '2' }, { v: 1, c: 'l7', t: '3' }], val: '11' }, { label: 'HTTP/2', segs: [{ v: 2, c: 'l4', t: 'TCP' }, { v: 1.4, c: 'ok', t: '1·2·3 동시' }], val: '3.4' }], 12), cap: '같은 요청 3개를 처리하는 시간(RTT 단위, 개념도). 1.0은 요청마다 새 연결(필기: 당시 OS의 TCP 관리 오버헤드 때문), 1.1은 연결 재사용, 하지만 한 연결에서 응답은 요청 순서대로만 → 앞이 느리면 뒤가 막힌다 = <b>애플리케이션 계층 HOL Blocking</b>.' },
    `<p>HTTP/1.1 시절의 우회책: 브라우저가 호스트당 <b>연결 6개</b>(각각 핸드셰이크 + TLS + Slow Start), 도메인 샤딩, CSS 스프라이트, 파일 합치기 — 모두 요청 수를 줄이려는 꼼수였다.</p>`,
    { h3: 'HTTP/2 — 한 연결 안의 여러 스트림' },
    { fig: `<div><div style="display:flex;flex-wrap:wrap;gap:3px">${[['H1', 'l3'], ['H3', 'l7'], ['H5', 'ok'], ['D1', 'l3'], ['D5', 'ok'], ['D3', 'l7'], ['D1', 'l3'], ['D5', 'ok'], ['D5', 'ok'], ['D3', 'l7'], ['D1', 'l3'], ['D5', 'ok']].map(([t, c]) => `<span style="flex:1 0 42px;padding:8px 0;text-align:center;border-radius:4px;background:${COLOR(c)};color:var(--on);font-family:var(--f-mono);font-weight:700;font-size:13px">${t}</span>`).join('')}</div></div>`, cap: 'TCP 연결 1개 위에 스트림 1(index.html) · 3(style.css) · 5(photo.jpg)의 프레임이 섞여 흐른다. H = HEADERS, D = DATA, 숫자 = 스트림 ID — 받는 쪽이 ID로 재조립(필기: 크기·순서 상관없이 쪼개 보냄).' },
    T(['특징', '내용'], [['Binary Framing', '줄바꿈 텍스트 대신 길이·타입·스트림 ID가 붙은 프레임 — 파싱이 빠르고 모호함이 없다'], ['Multiplexing', '한 연결에서 요청·응답 수백 개가 동시에 — HTTP 계층에서는 서로 막지 않는다'], ['HPACK', '반복되는 헤더(Host·User-Agent·Cookie)를 테이블 인덱스로 압축'], ['Negotiation', 'TLS 핸드셰이크의 ALPN으로 “h2” 합의 — 사실상 HTTPS에서만']]),
    { h3: 'HTTP/2의 남은 문제 — HOL Blocking이 TCP 계층으로 내려갔을 뿐' },
    { fig: (() => { const row = (q) => [['1', 'l3'], ['3', 'l7'], ['5', 'ok'], ['1', 'l3'], ['5', 'ok'], ['3', 'l7']].map(([s, c], i) => { const lost = i === 1, blocked = i > 1 && (!q || s === '3'); return `<span style="flex:1 0 64px;padding:8px 0;text-align:center;border-radius:4px;font-family:var(--f-mono);font-weight:700;font-size:13px;background:${lost ? 'var(--bad-s)' : blocked ? 'var(--sunk)' : COLOR(c)};color:${lost ? 'var(--bad)' : blocked ? 'var(--mute)' : 'var(--on)'};border:${blocked ? '1.5px dashed var(--line)' : '0'}">${lost ? '✕ S3' : 'S' + s}${blocked ? ' 대기' : ''}</span>`; }).join('');
      return `<div style="display:flex;flex-direction:column;gap:12px;max-width:760px"><div><b>HTTP/2 over TCP</b> — TCP는 스트림을 모른다 → 바이트 하나가 빠지면 뒤의 모든 프레임이 대기<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:6px">${row(false)}</div></div><div><b>HTTP/3 over QUIC</b> — QUIC은 스트림을 안다 → 빠진 스트림 3만 대기, 1·5는 계속 전달<div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:6px">${row(true)}</div></div></div>`; })() },
    `<ul><li><b>QUIC = UDP + 신뢰성·혼잡제어·TLS 1.3</b>, 사용자 공간 라이브러리라 개선이 빠르다.</li><li>연결 수립 <b>1 RTT · 재방문 0-RTT</b> (TCP+TLS 1.3의 2 RTT보다 하나 적다).</li><li><b>Connection ID</b> — IP가 바뀌어도(Wi-Fi ↔ LTE) 연결 유지. TCP 4-tuple과의 결정적 차이.</li><li>발견: 첫 접속은 HTTP/2 → 응답의 <code>Alt-Svc: h3=":443"</code>을 보고 다음부터 UDP 443 시도. 손실·이동이 잦은 모바일일수록 이점이 크다.</li></ul>`,
    `<p>${H.exam('Quick Check Q7')}HTTP/2는 다중화로 HTTP 계층 HOL을 해결했지만 TCP 계층 HOL이 남았다 → HTTP/3가 QUIC으로 해결.</p>`,
    T(['항목', 'HTTP/1.1', 'HTTP/2', 'HTTP/3'], [['전송 계층', 'TCP', 'TCP', 'QUIC (UDP)'], ['메시지', '텍스트 줄', '바이너리 프레임', '바이너리 프레임'], ['동시 요청', '연결당 1개 (브라우저 6연결)', '1연결 · 다중 스트림', '1연결 · 다중 스트림'], ['HOL Blocking', 'HTTP + TCP 계층', 'TCP 계층에 남음', '스트림 단위로 해소'], ['헤더 압축', '없음', 'HPACK', 'QPACK'], ['암호화', '선택', '사실상 필수', '필수 (TLS 1.3 내장)'], ['신규 연결', '2 RTT', '2 RTT', '1 RTT (재방문 0)'], ['협상', '—', 'ALPN “h2”', 'Alt-Svc → ALPN “h3”'], ['네트워크 변경', '끊김', '끊김', 'Connection ID로 유지'], ['DevTools Protocol', 'http/1.1', 'h2', 'h3']]),
    H.key('의미(메서드·상태 코드·헤더)는 그대로, 전선 위에 싣는 방법만 바뀌었다. 그래서 CDN·LB가 “앞은 HTTP/3, 뒤는 HTTP/1.1”로 번역할 수 있다. UDP 443이 막히면 브라우저는 조용히 HTTP/2로 돌아간다.'),
  ] },

{ id: 'w4.https', title: 'HTTPS: 지키는 것과 못 지키는 것', slides: 'S29–S31',
  blocks: [
    T(['보장', '수단'], [['<b>기밀성</b> — 도청해도 내용을 모른다', '대칭키 암호 (AES-GCM · ChaCha20)'], ['<b>무결성</b> — 한 비트라도 바꾸면 탐지', 'AEAD 인증 태그'], ['<b>인증</b> — 진짜 그 도메인의 서버인가', '인증서와 서명']]),
    { trace: { title: '공용 Wi-Fi에서 HTTPS 요청 하나를 엿보면', rowH: 90, minW: 600,
      nodes: [{ id: 'c', label: 'Client', icon: 'laptop', x: .1, y: 0 }, { id: 'eve', label: '같은 Wi-Fi의 관찰자', icon: 'user', x: .5, y: 1 }, { id: 'ap', label: '공유기 / ISP', icon: 'router', x: .5, y: 0 }, { id: 's', label: 'api.example.com', icon: 'server', x: .9, y: 0 }],
      links: [['c', 'ap'], ['ap', 's'], ['ap', 'eve', { dash: 1 }]],
      events: [{ from: 'c', to: 's', path: ['c', 'ap', 's'], label: 'HTTPS 요청', pkt: [ip('192.168.0.23', '34.1.2.3'), tcp(51500, 443), { L: 'L7', n: 'TLS 헤더', f: [['SNI', 'api.example.com (ECH 없으면 보임)']] }, { L: 'L7', n: 'HTTP', enc: '🔒 GET /v1/users/42?token=…  Cookie: …  Body: …' }], say: `관찰자에게 보이는 것: DNS 질의(DoH가 아니면), <b>IP 주소, 포트 443, SNI의 도메인 이름</b>, 시각과 양. 보이지 않는 것: <b>Method · Path · Query · Header · Cookie · Body</b>. ${H.exam('Quick Check Q8')}HTTPS는 “어디에”는 숨기지 못하고 “무엇을”을 숨긴다.` }] } },
    H.warn('종단(서버·브라우저)에서는 전부 평문이다. URL 쿼리에 넣은 토큰은 서버 접근 로그·브라우저 기록·Referer에 남는다 → 비밀은 헤더나 본문으로. HTTPS는 전송 구간 보호이지 서버 안의 데이터 보호가 아니다.'),
    { h3: 'TLS를 이해하기 위한 암호 세 가지' },
    T(['종류', '예', '하는 일', '한계'], [['<b>대칭키 암호</b>', 'AES · ChaCha20', '같은 키로 잠그고 연다. 매우 빠르다 — 실제 데이터 암호화', '처음 보는 상대와 키를 어떻게 나눌까?'], ['<b>공개키 · 서명</b>', 'RSA · ECDSA · Ed25519', '개인키로 서명, 공개키로 누구나 검증 → “이 서버가 진짜”', '느리다'], ['<b>키 교환</b>', 'ECDHE (X25519)', '공개값만 주고받는데 둘만 같은 비밀값 계산. 도청자는 계산 못 함', '상대가 누군지는 모름 → 서명이 보완']]),
    `<p>TLS의 조합: ① 인증서 서명 검증(상대 확인) → ② ECDHE 키 합의(세션 키) → ③ 대칭키로 HTTP 데이터 암호화. <b>Forward Secrecy</b>: 세션 키를 매번 새로 만들고 버리므로, 나중에 서버 개인키가 유출돼도 과거 녹화 트래픽은 못 푼다(TLS 1.3 필수).</p>`,
    { h3: '인증서와 신뢰 체인 — 브라우저는 서버가 아니라 CA를 믿는다' },
    { lab: { title: '검증 다섯 단계 — 어디서 실패하나', init: { f: 'ok' },
      ctl: [{ k: 'f', type: 'select', label: '상황', opts: [['ok', '정상'], ['chain', 'Intermediate 누락 (curl·Python)'], ['name', '이름 불일치'], ['date', '만료 / PC 시계 오류'], ['revoke', '폐기된 인증서']] }],
      out: st => { const f = st.f; const steps = [['① 체인', '서명을 따라 신뢰 저장소의 Root에 닿는가', 'chain', 'CERTIFICATE_VERIFY_FAILED (브라우저는 되는데 curl·Python만 실패하는 흔한 경우)'], ['② 이름', 'SAN에 접속한 도메인이 있는가 (*.example.com 포함)', 'name', 'ERR_CERT_COMMON_NAME_INVALID'], ['③ 기간', '지금이 유효기간 안인가 (PC 시계가 틀려도 실패)', 'date', 'ERR_CERT_DATE_INVALID'], ['④ 폐기', '도중에 취소되지 않았는가 (OCSP · CRL)', 'revoke', 'ERR_CERT_REVOKED'], ['⑤ 소유', '서버가 그 공개키의 개인키를 가졌는가 (핸드셰이크 서명)', '-', '']];
        const stop = steps.findIndex(s => s[2] === f);
        return `<div style="display:flex;flex-direction:column;gap:4px;max-width:520px;margin-bottom:12px">${[['Root CA', '신뢰 저장소에 미리 설치 · 자기 서명 · 오프라인 보관'], ['Intermediate CA', f === 'chain' ? '⚠ 서버가 보내지 않음' : 'Root가 서명 · 실제 발급 담당'], ['Leaf 인증서', `CN/SAN = ${f === 'name' ? 'other.example.org' : 'api.example.com'} · ${f === 'date' ? '유효 2025-01-01 ~ 2025-03-31' : '유효 2026-09-01 ~ 2026-11-30'}${f === 'revoke' ? ' · OCSP: revoked' : ''}`]].map(([a, b], i) => `<div style="border:1.5px ${i === 1 && f === 'chain' ? 'dashed var(--bad)' : 'solid var(--line)'};border-radius:8px;padding:8px 12px"><b>${a}</b> <span class="cm" style="font-size:13.5px">${b}</span></div>${i < 2 ? '<div class="cm" style="text-align:center;font-size:13px">↓ 서명</div>' : ''}`).join('')}</div>` +
          T(['검증', '내용', '결과'], steps.map((s, i) => [s[0], s[1], stop === -1 || i < stop ? '<span class="cok">✓</span>' : i === stop ? `<span class="cbad">✗ ${s[3]}</span>` : '<span class="cm">—</span>'])) +
          `<div class="verdict ${stop === -1 ? 'ok' : 'bad'}">${stop === -1 ? '모두 통과 → 🔒' : '검증 실패 → 경고 화면, 상태 코드 없음 (HTTP까지 못 감)'}</div><p style="margin:0">${H.exam('Quick Check Q9')}브라우저가 검증하는 것 = 체인 · 이름 · 기간 · 폐기 · 소유. Let's Encrypt는 ACME로 90일 인증서를 무료·자동 발급·갱신한다. 확인: <code>openssl s_client -connect example.com:443 -servername example.com -showcerts</code></p>`; } } },
  ] },

{ id: 'w4.tls', title: 'TLS 1.3 Handshake', slides: 'S32',
  blocks: [
    { trace: { mode: 'ladder', title: 'TCP 연결 직후, 1 RTT 만에 암호화된 HTTP', lanes: [{ id: 'c', label: 'Client (Browser)' }, { id: 's', label: 'Server' }], span: [{ a: 1, b: 2, text: '1 RTT', until: 2, x: 30 }],
      events: [
        { kind: 'gap', text: '— TCP 3-way handshake 완료 (1 RTT) —', say: 'TLS는 TCP 연결 위에서 시작한다.' },
        { from: 'c', to: 's', label: 'ClientHello', sub: 'key_share · SNI · ALPN [h2, http/1.1]', color: 'l3', pkt: [tcp(51500, 443), tls([['Handshake', 'ClientHello'], ['cipher suites', 'TLS_AES_128_GCM_SHA256 …'], ['key_share', 'X25519 공개값 A'], ['SNI', 'example.com'], ['ALPN', 'h2, http/1.1']])], say: 'TLS 1.3은 ClientHello에 <b>키 재료(ECDHE 공개값)를 미리 실어</b> 보낸다 — 왕복 하나를 줄인 비결.' },
        { from: 's', to: 'c', label: 'ServerHello + {Certificate, CertificateVerify, Finished}', color: 'l3', state: { c: '세션 키 계산', s: '세션 키 계산' }, pkt: [tcp(443, 51500), tls([['Handshake', 'ServerHello'], ['key_share', 'X25519 공개값 B'], ['선택', 'AES-128-GCM · ALPN h2']]), { L: 'L7', n: 'TLS (암호화)', enc: '🔒 Certificate 체인 · CertificateVerify(개인키 서명) · Finished' }], say: 'ServerHello 직후부터 양쪽이 세션 키를 계산하고, <b>인증서부터 이미 암호화된 채로</b> 보낸다. CertificateVerify = “개인키를 가졌다”는 서명(검증 ⑤).' },
        { from: 'c', to: 's', label: '{Finished} + GET / HTTP/2', color: 'ok', pkt: [tcp(51500, 443), { L: 'L7', n: 'TLS (암호화)', enc: '🔒 Finished · GET / HTTP/2' }], say: '핸드셰이크 끝 — 첫 HTTP 요청을 같이 실어 보낸다. 협상된 <b>ALPN 값(h2)이 곧 HTTP 버전</b>.' },
        { from: 's', to: 'c', label: '{HTTP/2 200 OK …}', color: 'l7', pkt: [tcp(443, 51500), { L: 'L7', n: 'TLS (암호화)', enc: '🔒 HTTP/2 200 OK …' }], say: 'TLS 1.2는 2 RTT(키 교환과 인증서가 평문으로 한 번 더 왕복). 0-RTT 재개는 재방문 시 첫 메시지에 데이터를 싣지만 <b>재전송(replay) 위험</b>이 있어 멱등 요청만.' },
      ] } },
  ] },

{ id: 'w4.cost', title: '연결 비용 계산하기', slides: 'S33',
  blocks: [
    { lab: { title: '서버가 0 ms에 응답해도 거리는 사라지지 않는다', init: { rtt: 30, dns: 20 },
      ctl: [{ k: 'rtt', label: 'RTT', unit: 'ms', min: 1, max: 300 }, { k: 'dns', label: 'DNS (miss)', unit: 'ms', min: 0, max: 200 }],
      out: st => { const r = st.rtt, d = st.dns; const R = [['신규 (TCP+TLS1.3)', d + 3 * r, 'bad'], ['HTTP/3 신규', d + 2 * r, 'l7'], ['재사용 연결', r, 'ok'], ['HTTP/3 재방문 0-RTT', r, 'ok'], ['CDN 엣지(RTT 10) 신규', d + 30, 'l3']];
        return `<div class="result">신규 = DNS ${d} + TCP ${r} + TLS ${r} + 요청 ${r} = <b>${d + 3 * r} ms + α</b> · 재사용 = <b>${r} ms + α</b></div>` + barsHTML(R.map(([n, v, c]) => ({ label: n, segs: [{ v, c, t: '' }], val: v + ' ms + α' })), Math.max(...R.map(x => x[1]))) +
          T(['단계', 'RTT', '줄이는 방법'], [['DNS (miss)', '리졸버 + 반복 질의', 'TTL · 가까운 리졸버 · 캐시'], ['TCP 핸드셰이크', '1', 'Keep-Alive · 커넥션 풀'], ['TLS 1.3', '1', '세션 재개 · TLS를 사용자 가까이서 종료'], ['요청 → 첫 바이트', '1 + 서버(α)', '서버 성능 · 응답 캐시']]) +
          `<p style="margin:0">강의 표: 국내 30 ms → 약 110 ms, 해외 150 ms → 약 470 ms. 매 요청마다 새 연결을 맺는 클라이언트 코드는 “서버가 빨라도” 느리다 — <code>requests.Session()</code>·커넥션 풀·CDN이 존재하는 이유.</p>`; } } },
  ] },

{ id: 'w4.obs', title: 'DevTools와 curl로 직접 보기', slides: 'S35–S37',
  blocks: [
    T(['DevTools Timing에서 긴 구간', '먼저 의심할 것'], [['DNS Lookup', '리졸버 느림 · 캐시 미스 · 도메인 수가 너무 많음'], ['Initial connection · SSL', 'RTT가 큼(거리) · 연결 재사용이 안 됨'], ['Waiting (TTFB)', '서버 처리 · DB 쿼리 · 콜드 스타트'], ['Content Download', '응답이 큼 · 압축 없음 · 대역폭 부족']]),
    H.key(`${H.exam('Quick Check Q10')} TTFB만 길다면 네트워크(DNS·연결·TLS)는 정상이고 서버 쪽 처리(앱 로직·DB 쿼리·콜드 스타트)를 의심한다.`),
    `<p>F12 → Network → 요청 → Timing. Protocol 열(http/1.1 · h2 · h3), Size((disk cache)), Initiator. 두 번째 요청부터 DNS·Initial connection·SSL 칸이 사라지면 연결이 재사용되는 중이다. 실습 전 “Disable cache”·“Preserve log”.</p>`,
    { lab: { title: 'curl -w 누적 시간 → 구간', init: { a: .021, b: .052, c: .087, d: .141 },
      ctl: [{ k: 'a', label: 'time_namelookup', unit: 's', min: 0, max: 1, step: .001, type: 'num' }, { k: 'b', label: 'time_connect', unit: 's', min: 0, max: 1, step: .001, type: 'num' }, { k: 'c', label: 'time_appconnect', unit: 's', min: 0, max: 1, step: .001, type: 'num' }, { k: 'd', label: 'time_starttransfer', unit: 's', min: 0, max: 2, step: .001, type: 'num' }],
      out: st => { const ok = st.a <= st.b && st.b <= st.c && st.c <= st.d; const S = [['DNS', st.a, 'l7'], ['TCP', st.b - st.a, 'l4'], ['TLS', st.c - st.b, 'l3'], ['요청+서버', st.d - st.c, 'ok']];
        return (ok ? '' : '<p class="err">누적값은 namelookup ≤ connect ≤ appconnect ≤ starttransfer 순서여야 한다</p>') + `<div class="result">DNS       = namelookup                 = ${ms(st.a)} ms<br>TCP       = connect − namelookup       = ${ms(st.b - st.a)} ms<br>TLS       = appconnect − connect       = ${ms(st.c - st.b)} ms<br>요청+서버 = starttransfer − appconnect = ${ms(st.d - st.c)} ms</div>` + (ok ? barsHTML([{ label: '구간', segs: S.map(([t, v, c]) => ({ v: Math.max(v, 0), c, t: `${t} ${ms(v)}` })), val: ms(st.d) + ' ms' }], st.d) : '') +
          H.pre(`$ curl -o /dev/null -s -w "%{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer}" https://example.com/`) + `<p style="margin:0"><b>-w 시간은 모두 시작부터 누적</b>이다. TLS − TCP = TLS 핸드셰이크, TTFB − TLS = 요청 전송 + 서버 처리. <code>curl -v</code>의 <code>*</code> 줄 = 연결·TLS 과정(인증서·ALPN), <code>&gt;</code> = 보낸 헤더, <code>&lt;</code> = 받은 헤더. <code>--resolve h:443:IP</code>로 DNS를 우회해 특정 서버를 직접 시험할 수 있다.</p>`; } } },
    { h3: 'Python으로 HTTP 보기 — 3주 소켓 위에 4주 HTTP 문자열' },
    H.pre(`req = ("GET / HTTP/1.1\\r\\n" "Host: example.com\\r\\n" "Connection: close\\r\\n" "\\r\\n")
with socket.create_connection(("example.com", 80), timeout=5) as s:
    s.sendall(req.encode())
    data = b""
    while chunk := s.recv(4096):      # 서버가 닫아야 b"" → 루프 종료 (Connection: close)
        data += chunk
head, _, body = data.partition(b"\\r\\n\\r\\n")   # 헤더/본문 경계`),
    `<p>requests 라이브러리: <code>Session()</code>(연결 재사용), <code>timeout=(3, 10)</code>(연결·읽기 따로 — 없으면 무한 대기), <code>raise_for_status()</code>(requests는 404·500에도 예외를 안 낸다 — 상태 확인은 앱의 책임). 라이브러리가 해 주는 것(TLS 검증·리다이렉트·쿠키)과 안 해 주는 것(재시도·상태 처리)을 구분하라.</p>`,
  ] },

{ id: 'w4.diag', title: '증상 → 단계 판정과 Design Choice', slides: 'S38–S40',
  blocks: [
    { lab: { title: '오류 메시지 → 어느 단계에서 멈췄나', init: { e: 'ERR_CONNECTION_REFUSED' },
      ctl: [{ k: 'e', type: 'select', label: '오류', opts: Object.keys(DIAG).map(k => [k, k]) }],
      out: st => { const d = DIAG[st.e]; const st5 = ['DNS', 'TCP', 'TLS', 'HTTP', 'App', '브라우저']; const at = st5.findIndex(x => d[0].startsWith(x));
        return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${st5.map((x, i) => `<div style="flex:1;min-width:84px;text-align:center;padding:10px 4px;border-radius:8px;font-weight:700;border:2px solid ${i === at ? 'var(--bad)' : i < at && x !== '브라우저' ? 'var(--ok)' : 'var(--line)'};background:${i === at ? 'var(--bad-s)' : i < at && x !== '브라우저' ? 'var(--ok-s)' : 'var(--paper)'};color:${i === at ? 'var(--bad)' : i < at && x !== '브라우저' ? 'var(--ok)' : 'var(--mute)'}">${x}<br><span style="font-size:12px;font-weight:500">${i === at ? '✗ 여기서 멈춤' : i < at && x !== '브라우저' ? '✓ 통과' : '—'}</span></div>`).join('')}</div><div class="result">${st.e}<br>${d[1]}<br>먼저 확인: ${d[2]}</div>` + T(['오류', '단계', '의미'], Object.entries(DIAG).map(([k, v]) => [k, v[0], v[1]]), { mono: [0], hl: r => r[0] === st.e }); } } },
    H.key('상태 코드가 있으면 DNS·TCP·TLS는 통과한 것이고, 없으면 그 앞 단계에서 멈춘 것이다. CORS 오류는 서버가 이미 응답을 보낸 뒤 “브라우저가” 막은 것이다.'),
    `<p><b>범위 좁히기 — 아래에서 위로</b>: ① DNS(<code>nslookup</code> · <code>dig +short</code>) → ② TCP(<code>Test-NetConnection host -Port 443</code> · <code>nc -vz</code>) → ③ TLS(<code>curl -v</code> · <code>openssl s_client</code>) → ④ HTTP(<code>curl -i</code> · DevTools) → ⑤ App(서버 로그 · 요청 ID). 브라우저만 실패 → 캐시·쿠키·CORS·확장. curl만 실패 → 인증서 체인·프록시·User-Agent 차단.</p>`,
    T(['상황', '권장', '이유'], [['DNS 서버 이전 예정', '며칠 전 TTL 낮추기', '옛 IP가 캐시에 남는 시간 최소화'], ['정적 파일 (JS·CSS)', 'max-age=1년 + immutable + 해시 파일명', '바뀌면 이름이 바뀌어 무효화 불필요'], ['개인 데이터 API 응답', 'no-store (또는 private)', 'CDN 같은 공유 캐시로 노출 사고 방지'], ['TLS 종료 위치', 'LB·CDN (+ 내부 재암호화)', '인증서 관리 일원화 · RTT 단축'], ['HTTP 버전', 'h2 기본 + h3 활성화', '모바일 이점, 막히면 자동 폴백'], ['로그인 상태', '웹: 세션 쿠키 · 앱/서버 간: 토큰', '즉시 무효화 vs 무상태 확장'], ['자동 재시도', '멱등 + Idempotency-Key', '중복 주문·결제 방지'], ['LLM 응답 전달', 'SSE (text/event-stream)', '첫 토큰까지 시간(TTFT)이 체감 속도 좌우']]),
    H.note('세 질문으로 귀결된다 — 얼마나 빨리 바뀌어야 하는가(TTL·캐시), 누가 볼 수 있는가(no-store·TLS), 두 번 실행돼도 되는가(멱등성).'),
  ] },

{ id: 'w4.p1', title: '연결 비용 · curl -w 계산', slides: 'S33, S36 · QC Q10', tag: '연습',
  blocks: [{ prac: { id: 'p41', title: 'curl -w 결과 읽기',
    gen: rng => { const rtt = rng.pick([10, 20, 30, 40, 60, 80, 120, 150]), dns = rng.int(5, 40), srv = rng.int(10, 120); const a = dns / 1000, b = a + rtt / 1000, c = b + rtt / 1000, d = c + (rtt + srv) / 1000; return { rtt, srv, w: [a, b, c, d].map(x => +x.toFixed(3)) }; },
    problem: P => `<p><code>curl -w</code> 결과(누적 초): namelookup <b>${P.w[0]}</b>, connect <b>${P.w[1]}</b>, appconnect <b>${P.w[2]}</b>, starttransfer <b>${P.w[3]}</b></p><ol><li>TCP 핸드셰이크 (ms)</li><li>TLS 핸드셰이크 (ms)</li><li>요청 전송 + 서버 처리 (ms)</li><li>같은 서버에 연결을 재사용해 다시 요청하면 TTFB는 약 몇 ms? (서버 처리 시간 같다고 가정)</li></ol>`,
    answers: P => [{ label: 'TCP', ans: ms(P.w[1] - P.w[0]), type: 'num', tol: 1, unit: 'ms' }, { label: 'TLS', ans: ms(P.w[2] - P.w[1]), type: 'num', tol: 1, unit: 'ms' }, { label: '요청+서버', ans: ms(P.w[3] - P.w[2]), type: 'num', tol: 1, unit: 'ms' }, { label: '재사용 TTFB', ans: ms(P.w[3] - P.w[2]), type: 'num', tol: 1, unit: 'ms' }],
    solution: P => [`-w 값은 모두 누적이므로 차이를 구한다: TCP = ${P.w[1]} − ${P.w[0]} = <b>${ms(P.w[1] - P.w[0])} ms</b>`, `TLS = ${P.w[2]} − ${P.w[1]} = <b>${ms(P.w[2] - P.w[1])} ms</b> (TCP와 거의 같다 = 둘 다 1 RTT = ${P.rtt} ms)`, `요청+서버 = ${P.w[3]} − ${P.w[2]} = <b>${ms(P.w[3] - P.w[2])} ms</b> (= RTT ${P.rtt} + 서버 ${P.srv})`, `재사용이면 DNS·TCP·TLS가 사라지고 이 구간만 남는다 → <b>${ms(P.w[3] - P.w[2])} ms</b> (신규 ${ms(P.w[3])} ms 대비)`] } }] },

{ id: 'w4.p2', title: 'HTTP 메시지 · 상태 코드 판정', slides: 'S14, S16, S19–S20 · QC Q4–Q6', tag: '연습',
  blocks: [{ prac: { id: 'p42', title: '바이트 · 멱등 · 주체',
    gen: rng => { const name = rng.pick(['kim', 'lee', '윤대준', '네트워크', 'park', '인천']); return { body: `{"name":"${name}","age":${rng.int(18, 30)}}`, m: rng.pick(['GET', 'PUT', 'POST', 'DELETE', 'PATCH']), code: rng.pick(['401', '403', '404', '502', '504', '500']) }; },
    problem: P => `<p>요청 본문 <code>${esc(P.body)}</code> (UTF-8)</p><ol><li>Content-Length</li><li>${P.m} 요청은 멱등인가? (예 / 아니오 / 설계 따라)</li><li>응답 <b>${P.code}</b>을 만든 주체는? (앱 / 프록시)</li></ol>`,
    answers: P => [{ label: 'Content-Length', ans: utf8(P.body), type: 'num' }, { label: `${P.m} 멱등?`, ans: P.m === 'POST' ? ['아니오', '아니요', 'no', 'x'] : P.m === 'PATCH' ? ['설계따라', '설계 따라', '설계에따라'] : ['예', 'yes', 'o'], show: P.m === 'POST' ? '아니오' : P.m === 'PATCH' ? '설계 따라' : '예' }, { label: `${P.code} 주체`, ans: STATUS[P.code][1] === 'px' ? ['프록시', 'proxy', 'lb'] : ['앱', 'app', '서버', '애플리케이션'], show: STATUS[P.code][1] === 'px' ? '프록시' : '앱' }],
    solution: P => { const a = [...P.body].filter(c => c.charCodeAt(0) < 128).length, k = [...P.body].length - a; return [`ASCII ${a}자 × 1 B + 한글 ${k}자 × 3 B = <b>${utf8(P.body)} B</b> — Content-Length는 글자 수가 아니라 바이트 수`, `${P.m}: ${({ GET: '안전 + 멱등', PUT: '멱등 (전체 교체 — 몇 번 해도 같은 상태)', POST: '<b>멱등 아님</b> (매번 생성 → Idempotency-Key 필요)', DELETE: '멱등 (두 번째가 404여도 상태는 같음)', PATCH: '설계에 따라 다름' })[P.m]}`, `${STATUS[P.code][0]} — ${STATUS[P.code][2]} → <b>${STATUS[P.code][1] === 'px' ? '프록시(LB)' : '앱 서버'}</b>`]; } } }] },

{ id: 'w4.qc', title: 'Quick Check — Week 4', slides: 'S42', tag: '점검',
  blocks: [{ qc: 'w4' }] },
] });
})();
