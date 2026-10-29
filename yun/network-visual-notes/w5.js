/* Week 5 — Web & REST API Architecture */
'use strict';
(function () {
const T = H.tbl;
const req = (line, f = []) => ({ L: 'L7', n: 'HTTP 요청', f: [['요청줄', line], ...f] });
const res = (status, f = []) => ({ L: 'L7', n: 'HTTP 응답', f: [['상태', status], ...f] });
const slot = (out, spec) => { const s = out.querySelector('.slot'); if (!s) return; s.innerHTML = ''; mountTrace(s, spec); };
const lines = arr => `<ul class="ln-list">${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;
const J = o => JSON.stringify(o);

/* ---------- data used by labs ---------- */
const BAD_API = [
  ['학생 목록 보기', 'POST /getAllStudents', 'GET /students', 'Method가 GET이면 “조회”임이 첫 줄에 드러난다'],
  ['학생 추가', 'POST /addNewStudent', 'POST /students', '컬렉션에 POST = 새 원소 생성'],
  ['학년 수정', 'POST /updateInfo', 'PATCH /students/10', '대상(10번)은 URI, 행위(부분 수정)는 Method'],
  ['학생 삭제', 'GET /removeStu?id=10', 'DELETE /students/10', 'GET으로 삭제하면 크롤러·프리페치가 지운다 — 특히 위험'],
];
const CONSTRAINTS = [
  ['Client–Server', '관심사 분리', 'UI와 데이터 저장을 분리해 각자 독립적으로 진화', 'Frontend 배포가 Backend 배포를 기다림'],
  ['Stateless', '요청의 자기완결성', '서버는 이전 요청을 기억하지 않음. 요청에 필요한 정보를 모두 포함', '특정 서버에만 세션 → Scale-out 불가'],
  ['Cacheable', '캐시 가능 여부 명시', '응답이 캐시 가능한지(Cache-Control, ETag) 스스로 밝힘', '같은 목록을 매번 DB에서 다시 조회'],
  ['Uniform Interface', '일관된 인터페이스 — <b>REST의 핵심</b>', 'URI로 자원 식별, 표준 메서드로 조작', '/getStudent, /doDelete … API마다 문법이 다름'],
  ['Layered System', '계층화', '클라이언트는 중간에 CDN·LB·Gateway가 있는지 몰라도 됨', '프록시 하나 추가하는 데 클라이언트 수정 필요'],
  ['Code on Demand', '(선택) 코드 전송', '서버가 실행 코드(JavaScript)를 내려보낼 수 있음', '유일한 선택 제약 — 없어도 REST'],
];
const STU = { id: 10, name: 'Kim', grade: 3, email: 'kim@inu.ac.kr' };
const FLOW = [ // status-code decision (S22)
  ['auth', '인증 정보가 있고 유효한가?', '401 Unauthorized', '“누구세요?” — 토큰 없음·만료'],
  ['perm', '이 사용자에게 권한이 있는가?', '403 Forbidden', '“당신은 안 됩니다” — 신원은 확인됨'],
  ['fmt', '요청 형식(JSON·타입)이 맞는가?', '400 / 422', 'JSON이 깨졌으면 400, 문법은 맞는데 값이 규칙 위반이면 422'],
  ['exist', '대상 자원이 존재하는가?', '404 Not Found', '그런 학생이 없다'],
  ['conf', '현재 상태와 충돌하지 않는가?', '409 Conflict', '이미 등록된 학번 · 품절'],
  ['rate', '요청 한도를 넘지 않았는가?', '429 Too Many Requests', '속도 제한 (Retry-After)'],
];
const SUCCESS = { get: ['200 OK', '조회 성공 — 결과를 Body에'], post: ['201 Created', '생성 성공 + Location에 새 주소'], patch: ['200 OK', '수정 후 결과 반환'], del: ['204 No Content', '삭제 성공 — Body 없음'], async: ['202 Accepted', '접수만 됨 (비동기 작업, AI 추론 큐)'] };
const STAGES = [ // backend pipeline (S26–S27)
  ['pre', '브라우저 사전 확인', 'Origin이 다르면 OPTIONS(Preflight)부터', 'CORS 오류'],
  ['net', '연결 (DNS·TCP·TLS)', 'Week 2~4 — IP를 찾고 연결을 연다', 'ERR_CONNECTION_REFUSED'],
  ['uv', 'Uvicorn', 'ASGI 서버 · TCP 8000 accept · HTTP 파싱', '(연결 거부면 여기까지도 못 옴)'],
  ['mw', 'Middleware', 'CORS · 로깅 · 인증 · 압축', 'CORS 차단 / 401'],
  ['rt', 'Router', 'Method + Path 매칭', '404 / 405'],
  ['val', 'Validation', 'Pydantic Schema 검사', '422'],
  ['hd', 'Handler', '비즈니스 로직 · 직접 raise', '400 · 403 · 409'],
  ['db', 'Service · DB', 'SQL · ORM · 외부 API', '500 (DB 오류·예외)'],
  ['out', 'Response', 'response_model 직렬화 · JSON', '500 (응답 모델 불일치)'],
];
const SYMPTOM = { cors: ['CORS 오류 (Console)', 0], refused: ['ERR_CONNECTION_REFUSED', 1], c401: ['401', 3], c404: ['404 / 405', 4], c422: ['422', 5], c409: ['409 / 403 (직접 raise)', 6], c500db: ['500 — Traceback이 DB 쪽', 7], c500out: ['500 — 응답 모델 불일치', 8], ok: ['200 + JSON (성공)', 9] };
const CHANGES = [
  ['응답에 새 필드 추가 (예: "phone")', false], ['선택(optional) 요청 필드 추가', false], ['새 endpoint 추가', false], ['새 enum 값 추가 (클라이언트가 무시 가능할 때)', false],
  ['필드 이름 변경 (grade → year)', true], ['필드 삭제', true], ['필드 타입 변경 (id: int → string)', true], ['선택 필드를 필수로 변경', true], ['URI · 상태 코드 · 오류 형식 변경', true],
];
const CORS_MSG = {
  noacao: ["No 'Access-Control-Allow-Origin' header is present", '서버가 CORS 헤더를 안 붙임 / 해당 Origin 미허용', 'allow_origins에 정확한 Origin 추가 (포트까지)'],
  pref: ["Response to preflight request doesn't pass access control check", 'OPTIONS 응답이 2xx가 아니거나 헤더 누락', 'OPTIONS가 인증·라우팅 전에 처리되는지 확인'],
  redir: ['Redirect is not allowed for a preflight request', 'Preflight가 307/301 리다이렉트됨 (끝 슬래시, http→https)', 'URL을 정확히 — /students 와 /students/ 통일'],
  hdr: ['Request header field authorization is not allowed', 'Allow-Headers에 해당 헤더 없음', 'allow_headers에 Authorization 추가'],
  star: ["The value of the 'Access-Control-Allow-Origin' header must not be the wildcard '*' when … credentials mode is 'include'", '* + credentials 조합', '명시적 Origin 목록 사용'],
  mixed: ['Mixed Content: … was loaded over HTTPS, but requested an insecure resource', 'HTTPS 페이지에서 HTTP API 호출 (CORS 아님)', 'API도 HTTPS로'],
};

/* ---------- Origin helper ---------- */
function parseOrigin(u) {
  const m = String(u).trim().match(/^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^\/:?#]+)(?::(\d+))?/);
  if (!m) return null;
  const scheme = m[1].toLowerCase(), host = m[2].toLowerCase(), def = { http: 80, https: 443 }[scheme];
  const port = m[3] ? +m[3] : def;
  return { scheme, host, port, explicit: !!m[3], origin: `${scheme}://${host}${m[3] && +m[3] !== def ? ':' + m[3] : ''}` };
}

/* ---------- Pydantic-like validator (StudentIn / StudentPatch), matches pydantic v2 lax mode ---------- */
function validateStudent(text, mode) {
  let body;
  try { body = JSON.parse(text); } catch (e) { const p = (e.message.match(/position (\d+)/) || [])[1]; return { ok: false, errs: [{ type: 'json_invalid', loc: ['body', p != null ? +p : 0], msg: 'JSON decode error' }], why: 'JSON 문법 자체가 깨졌다 (작은따옴표 · 마지막 쉼표 · 주석 등)' }; }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errs: [{ type: 'model_type', loc: ['body'], msg: 'Input should be a valid dictionary or object to extract fields from' }], why: 'Body가 객체 { } 가 아니다' };
  const errs = [], out = {};
  const intField = (k, v) => {
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number') { if (!Number.isInteger(v)) { errs.push({ type: 'int_from_float', loc: ['body', k], msg: 'Input should be a valid integer, got a number with a fractional part' }); return; } return v; }
    if (typeof v === 'string') { const s = v.trim(); if (/^[+-]?\d+(\.0*)?$/.test(s)) return parseInt(s, 10); errs.push({ type: 'int_parsing', loc: ['body', k], msg: 'Input should be a valid integer, unable to parse string as an integer' }); return; }
    errs.push({ type: 'int_type', loc: ['body', k], msg: 'Input should be a valid integer' });
  };
  // name
  if (!('name' in body)) { if (mode === 'post') errs.push({ type: 'missing', loc: ['body', 'name'], msg: 'Field required' }); }
  else if (body.name === null && mode === 'patch') out.name = null;
  else if (typeof body.name !== 'string') errs.push({ type: 'string_type', loc: ['body', 'name'], msg: 'Input should be a valid string' });
  else { const n = [...body.name].length; if (n < 1) errs.push({ type: 'string_too_short', loc: ['body', 'name'], msg: 'String should have at least 1 character' }); else if (n > 50) errs.push({ type: 'string_too_long', loc: ['body', 'name'], msg: 'String should have at most 50 characters' }); else out.name = body.name; }
  // grade
  if (!('grade' in body)) { if (mode === 'post') errs.push({ type: 'missing', loc: ['body', 'grade'], msg: 'Field required' }); }
  else if (body.grade === null && mode === 'patch') out.grade = null;
  else { const g = intField('grade', body.grade); if (g !== undefined) { if (g < 1) errs.push({ type: 'greater_than_equal', loc: ['body', 'grade'], msg: 'Input should be greater than or equal to 1' }); else if (g > 4) errs.push({ type: 'less_than_equal', loc: ['body', 'grade'], msg: 'Input should be less than or equal to 4' }); else out.grade = g; } }
  // email (optional)
  if ('email' in body) { const v = body.email; if (v === null) out.email = null; else if (typeof v !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) errs.push({ type: 'value_error', loc: ['body', 'email'], msg: 'value is not a valid email address' }); else out.email = v; }
  const extra = Object.keys(body).filter(k => !['name', 'grade', 'email'].includes(k));
  return errs.length ? { ok: false, errs, extra } : { ok: true, out, extra };
}

addWeek({ id: 'w5', num: 5, short: '5주', title: 'Web & REST API Architecture', range: 'Week 5',
  lead: 'Frontend와 Backend가 <b>HTTP API라는 “계약”</b>으로 연결되는 구조. 4주차 HTTP가 “문법”이었다면, 이번 주는 그 문법으로 어떤 “문장”을 만들지(REST)와 브라우저가 그 약속을 어떻게 지키게 하는지(CORS)를 다룬다.',
  sections: [

{ id: 'w5.q', title: '이번 주의 질문 — HTTP 위의 “계약”', slides: 'S1–S4',
  blocks: [
    H.key('핵심 질문: 브라우저 JavaScript가 fetch()를 호출해 학생 목록을 받아 오기까지, “어떤 약속”이 지켜져야 하고 어디서 깨질 수 있는가?'),
    { fig: `<div class="stack" style="max-width:640px">${[['l7', 'Week 5 — API 설계 (REST) ← 이번 주', '/students/10 · CRUD · JSON · CORS'], ['l7', 'Week 4 — HTTP · TLS · DNS', 'Method · Status · Header · Body'], ['l4', 'Week 3 — TCP · UDP', 'Port · Socket · 바이트 스트림'], ['l3', 'Week 2 — IP · Ethernet', '주소 · 라우팅 · 프레임']].map(([c, a, b], i) => `<div style="background:var(--${c});${i ? 'opacity:.75' : ''}">${a} <span>${b}</span></div>`).join('')}</div>`, cap: 'API 설계는 HTTP 위에 올라간다. 4주차의 메서드(의도)·상태 코드(결과)·헤더(조건)·본문(내용)과 “HTTP는 상태를 기억하지 않는다”가 이번 주 내내 쓰인다.' },
    `<p><b>HTTP가 “문법”이라면 REST API는 “문체와 어휘집”이다.</b> 문법이 맞아도 어휘가 엉망이면 상대 팀(그리고 AI)은 오해한다.</p>`,
    T(['Week 5가 답하는 질문', '답'], [['URL 하나에 무엇을 대응시킬까?', '<b>Resource</b> (5.6 – 5.8)'], ['생성·조회·수정·삭제할 때 메서드와 상태 코드를 어떻게 고를까?', '<b>CRUD</b> (5.9 – 5.12)'], ['서로 다른 팀·서로 다른 포트가 이 약속을 어떻게 공유하고 지킬까?', '<b>OpenAPI · CORS</b> (5.18, 5.21 – 5.25)']]),
    { h3: '핵심 용어 12개 — 본인 말로 한 줄씩 (S4)' },
    T(['용어', '한 줄 정의'], [['API', '프로그램끼리 기능·데이터를 주고받기 위한 약속된 인터페이스'], ['REST', 'Fielding(2000)이 정의한 6가지 제약 기반의 아키텍처 스타일'], ['Resource', 'URI로 이름 붙일 수 있는 모든 대상 — 학생, 수업, 주문'], ['Representation', '자원의 특정 시점 상태를 표현한 것 — 보통 JSON'], ['Endpoint', 'Method + Path 조합. 하나의 Backend handler에 대응'], ['CRUD', 'Create · Read · Update · Delete — 데이터 조작 4가지'], ['JSON / Schema', '경량 데이터 형식 / 그 구조·타입·제약을 정의한 규칙'], ['OpenAPI · Swagger', 'REST API 명세 표준(YAML/JSON) · 그 문서·테스트 UI 도구'], ['Stateless', '서버가 이전 요청을 기억하지 않음. 요청이 자기완결적'], ['Origin', 'scheme + host + port. 브라우저 보안 경계의 단위'], ['CORS', '서버가 응답 헤더로 cross-origin 읽기를 허용하는 메커니즘'], ['Preflight', '실제 요청 전 브라우저가 보내는 OPTIONS 사전 확인 요청']]),
    H.note('강의: 이 12개를 본인 말로 설명할 수 있으면 Swagger 문서와 브라우저 Console의 CORS 오류 메시지를 “읽을 수” 있다. 퀴즈도 이 용어들을 중심으로 출제된다.'),
  ] },

{ id: 'w5.contract', title: 'API는 “계약”이다 — 식당 주문으로 보기', slides: 'S5–S6',
  blocks: [
    `<p>API는 서버 코드가 아니라 <b>두 팀(또는 시스템) 사이의 경계선</b>이다. 양쪽은 상대의 내부를 몰라도 계약만 지키면 협업할 수 있다.</p>`,
    T(['식당', '웹', '역할'], [['손님', 'Frontend (브라우저 · 앱 · IoT · AI Agent)', '화면 구성 · 사용자 입력 · fetch() 호출'], ['메뉴판', '<b>API 명세</b> (OpenAPI 문서)', '무엇을 어떻게 주문할 수 있는지'], ['웨이터', 'HTTP', '요청·응답 운반 (TCP 연결 위에서)'], ['주방', 'Backend (FastAPI + DB)', 'Handler · 비즈니스 로직 · Database'], ['음식', 'Response', 'JSON 데이터 — 또는 “품절입니다”']]),
    { trace: { title: '주문서 한 장이 처리되는 길', sub: '손님은 주방 안을 몰라도 메뉴판만 보고 주문한다', rowH: 96,
      nodes: [{ id: 'fe', label: 'Frontend', sub: '손님 · fetch()', icon: 'browser', x: .06, y: 0 }, { id: 'api', label: 'Backend Handler', sub: '주방 · FastAPI', icon: 'proc', x: .5, y: 0 }, { id: 'db', label: 'Database', sub: '냉장고', icon: 'db', x: .94, y: 0 }],
      links: [['fe', 'api', { label: 'HTTP' }], ['api', 'db']],
      tables: [{ id: 'stock', title: '주방 재고 (DB)', cols: ['메뉴', '남은 수량'], rows: [['김치찌개', '1']] }],
      events: [
        { from: 'fe', to: 'fe', label: '메뉴판 보고 주문서 쓰기', say: '손님은 API 문서(메뉴판)를 보고 요청을 만든다. 레시피도, 냉장고 위치도 몰라도 된다.' },
        { from: 'fe', to: 'api', label: 'POST /orders', color: 'l7', pkt: [req('POST /orders', [['Content-Type', 'application/json'], ['Body', '{"menu":"김치찌개","qty":1}']])], say: '<b>웨이터(HTTP)</b>가 주문서를 주방까지 운반한다.' },
        { from: 'api', to: 'db', label: '재고 확인 · 차감', color: 'l4', tables: { stock: [['김치찌개', '0']] }, say: '주방은 손님 얼굴을 몰라도 <b>주문서에 적힌 내용만으로</b> 처리한다 (Stateless).' },
        { from: 'api', to: 'fe', label: '201 Created', color: 'ok', pkt: [res('201 Created', [['Location', '/orders/31'], ['Body', '{"id":31,"menu":"김치찌개","qty":1}']])], say: '음식이 나왔다 — <b>201 Created + JSON</b>.' },
        { from: 'fe', to: 'api', label: 'POST /orders (또)', color: 'l7', pkt: [req('POST /orders', [['Content-Type', 'application/json'], ['Body', '{"menu":"김치찌개","qty":1}']])], say: '다른 손님이 같은 주문을 넣었다.' },
        { from: 'api', to: 'fe', label: '409 Conflict', color: 'bad', pkt: [res('409 Conflict', [['Content-Type', 'application/problem+json'], ['Body', '{"title":"sold out","status":409}']])], say: '“품절입니다” — <b>409 Conflict</b>. 서버가 고장 난 것이 아니라 <b>현재 상태와 충돌</b>해서 거절한 <b>정상적인 응답</b>이다 (5.11).' },
      ] } },
    T(['', '좋은 계약', '나쁜 계약'], [['특징', '안정적이고 예측 가능', '구현에 끌려다님'], ['모습', '이름만 보고 동작을 짐작할 수 있고, 바뀔 때는 버전으로 알린다', 'DB 컬럼명이 그대로 노출되고, 백엔드 수정이 곧 프론트 장애가 된다']]),
    `<p><b>계약이 정하는 것</b></p>` + lines(['URI · Method', '요청 형식 · 응답 형식', '상태 코드 · 오류 형식', '인증 방법']),
    H.key('“API = 서버 코드”가 아니다. 구현을 바꿔도 계약이 유지되면 상대는 영향을 받지 않는다 — 메뉴판만 같으면 주방장이 바뀌어도 손님은 똑같이 주문한다.'),
    H.note('AI 시대: LLM Tool / Function calling도 결국 API 명세를 읽고 호출한다. 사람 + Agent가 같은 계약의 소비자다.'),
  ] },

{ id: 'w5.arch', title: '웹 아키텍처의 변화 — HTML에서 JSON으로', slides: 'S7',
  blocks: [
    H.cards([['① Server-Side Rendering', '서버가 완성된 HTML을 응답 (PHP · JSP · Django Template).<br>화면과 데이터가 한 덩어리 — 클릭마다 페이지 전체를 새로 받는다.', ''], ['② SPA + REST API', 'HTML은 한 번, 이후엔 JSON만 (React · Vue + FastAPI).<br>프론트/백엔드 분리 → 다른 포트·도메인 → <b>CORS가 등장</b>.', 'L3'], ['③ Multi-Client API', '하나의 API를 Web · App · IoT · AI가 함께 쓴다 (API Gateway → Microservice).<br>API가 “제품”이 됨 → 명세·버전·인증·속도 제한이 필수.', 'L7']]),
    { trace: { mode: 'ladder', title: '② SPA — 이번 학기 실습 구조', sub: 'Frontend :5500 · FastAPI :8000', side: 110,
      lanes: [{ id: 'b', label: 'Browser', sub: 'React / JS' }, { id: 'fe', label: 'Frontend 서버', sub: 'localhost:5500' }, { id: 'api', label: 'API 서버', sub: 'localhost:8000' }],
      events: [
        { from: 'b', to: 'fe', label: 'GET /index.html', color: 'l7', pkt: [req('GET /index.html', [['Host', 'localhost:5500']])], say: '처음 한 번은 화면 틀(HTML·JS)을 받는다.' },
        { from: 'fe', to: 'b', label: '200 text/html', color: 'ok', pkt: [res('200 OK', [['Content-Type', 'text/html'], ['Body', '<!doctype html> … <script src="app.js">']])], say: '여기까지는 ①과 같다. 차이는 그다음부터.' },
        { from: 'b', to: 'api', label: 'fetch /v1/students', color: 'l7', pkt: [req('GET /v1/students', [['Host', 'localhost:8000'], ['Origin', 'http://localhost:5500']])], say: '이후에는 JS가 <b>다른 포트(8000)</b>의 API에 데이터만 요청한다. 브라우저가 <b>Origin 헤더</b>를 자동으로 붙인다 — 5500 ≠ 8000이라 cross-origin (5.21).' },
        { from: 'api', to: 'b', label: '200 application/json', color: 'ok', pkt: [res('200 OK', [['Content-Type', 'application/json'], ['Access-Control-Allow-Origin', 'http://localhost:5500'], ['Body', '{"items":[{"id":10,"name":"Kim"}, …]}']])], say: 'API는 HTML이 아니라 <b>JSON</b>만 준다. 화면 그리기는 브라우저의 JS가 한다. 서버가 <b>Access-Control-Allow-Origin</b>으로 “5500은 읽어도 된다”고 허락해야 JS가 이 응답을 읽을 수 있다 → 그래서 이번 주에 CORS를 함께 배운다.' },
      ] } },
  ] },

{ id: 'w5.rest', title: 'REST — 프로토콜이 아니라 “설계 스타일”', slides: 'S8–S9',
  blocks: [
    `<p><b>REST = “모두가 같은 방식으로 자원을 다루자”는 약속.</b> 도서관 이용 규칙으로 보면 직관이 잡힌다.</p>`,
    T(['도서관 이용 규칙', 'REST', '예'], [['모든 책에는 고유한 청구기호가 있다', '<b>URI</b>', '/books/813.6-K12'], ['할 수 있는 행동이 정해져 있다 (열람·대출·반납)', '<b>Method</b>', 'GET · POST · DELETE'], ['사서는 나를 기억하지 않는다 → 매번 회원증을 보여 준다', '<b>Stateless</b>', 'Authorization 헤더'], ['책 자체가 아니라 “도서 정보 카드”를 받는다', '<b>Representation</b>', 'JSON']], { mono: [2] }),
    { lab: { title: '같은 일, 두 가지 방식 — 제멋대로 만든 API를 REST로', init: { i: '3' },
      ctl: [{ k: 'i', type: 'select', label: '하고 싶은 일', opts: BAD_API.map((r, i) => [String(i), r[0]]) }],
      out: st => { const r = BAD_API[+st.i];
        return `<div class="pair"><div><h4 class="cbad">✕ 제멋대로 만든 API</h4><p class="mono" style="font-size:16px">${r[1]}</p><p class="cm" style="font-size:14px">동사가 경로에 들어가 있어 이름 짓는 법을 매번 외워야 한다.</p></div><div><h4 class="cok">○ REST 방식</h4><p class="mono" style="font-size:16px">${r[2]}</p><p class="cm" style="font-size:14px">${r[3]}</p></div></div>` +
          `<p style="margin:10px 0 0">오른쪽은 “<b>명사(자원) + 정해진 동사(메서드)</b>” 규칙만 알면 된다. /courses가 있다는 것만 들어도 <code>GET /courses/7</code>, <code>DELETE /courses/7</code>을 예상할 수 있다.</p>`; } } },
    H.key('REST는 “정답 코드”가 아니라 “공통 문법”이다. 문법이 같으면 사람도, 도구(Swagger·DevTools)도, AI도 API를 빨리 이해한다.'),
    { h3: 'Roy Fielding(2000)의 6가지 제약 — “깨지면” 무슨 일이 생기나' },
    T(['#', '제약', '뜻', '깨지면 →'], CONSTRAINTS.map((c, i) => [String(i + 1), `<b>${c[0]}</b><br><span class="cm" style="font-size:13px">${c[1]}</span>`, c[2], `<span class="cbad" style="font-weight:500">${c[3]}</span>`]), { hl: (r, i) => i === 3 }),
    H.warn('REST는 HTTP 위에서 구현되는 경우가 대부분이지만 <b>HTTP 그 자체는 아니다</b>. “JSON을 HTTP로 주고받는다”고 해서 REST API가 되는 것은 아니다.'),
  ] },

{ id: 'w5.uniform', title: 'Uniform Interface와 Richardson 성숙도', slides: 'S10–S12',
  blocks: [
    `<p>모든 API가 같은 “문법”을 쓰면 처음 보는 API도 읽을 수 있다. Uniform Interface는 네 가지 하위 원칙으로 이루어진다.</p>`,
    T(['#', '원칙', '뜻', '예'], [['01', '자원의 식별', 'URI 하나가 하나의 자원을 가리킨다', '<code>GET /students/10</code>'], ['02', '표현을 통한 조작', '자원 자체가 아니라 JSON <b>표현</b>을 주고받아 상태를 바꾼다', '<code>PATCH /students/10</code><br><code>{"grade": 4}</code>'], ['03', '자기 서술적 메시지', '메시지만 보고 해석 가능 — Method · Content-Type · 상태 코드가 의미를 전달', '<code>Content-Type: application/json</code>'], ['04', 'HATEOAS', '응답 안에 다음에 할 수 있는 행동의 링크를 포함', '<code>"links": {"courses": "/students/10/courses"}</code>']]),
    H.note('실무의 “REST API” 대부분은 ①~③까지만 지키고 HATEOAS는 생략한다. 그래서 엄밀히는 “RESTful HTTP API”라고 부르는 것이 정확하다.'),
    { h3: 'Richardson Maturity Model — 우리 API는 얼마나 REST다운가' },
    { fig: `<div class="rmm">${[['3', 'Hypermedia Controls', '응답에 다음 행동 링크(HATEOAS) 포함', '{"id":10, "links":{"enroll":"…"}}', ''], ['2', 'HTTP Verbs', '메서드 + 상태 코드를 의미대로 — <b>실무 표준</b>', 'GET /students/10 → 200 / 404', 'goal'], ['1', 'Resources', '자원별 URI는 있지만 메서드는 구분 안 함', 'POST /students/10/get', ''], ['0', 'The Swamp of POX', 'URI 하나, POST 하나로 모든 일을 처리', 'POST /api {"action":"getStudent","id":10}', '']].map(([n, t, d, e, c]) => `<div class="rmm-row ${c}"><div class="rmm-n">Level ${n}</div><div><b>${t}</b>${c ? ' <span class="rmm-goal">★ 이번 수업의 목표선</span>' : ''}<div class="cm" style="font-size:14px">${d}</div><code>${esc(e)}</code></div></div>`).join('')}</div>`, cap: '아래로 갈수록 HTTP를 “그냥 운반 수단으로만” 쓰는 API. AI가 만든 API를 볼 때: 메서드를 구분하는가(L2)? 상태 코드가 항상 200 + {"success": false} 는 아닌가? — Level 2는 반드시 넘어야 한다.' },
    { lab: { title: '“10번 학생의 학년을 4로 바꿔 줘” — Level 0 vs Level 2', init: { exist: false },
      ctl: [{ k: 'exist', type: 'toggle', label: '10번 학생이 DB에 있다' }],
      out: st => { const ok = st.exist;
        const l0 = `# 요청\nPOST /api\n{"action": "updateGrade", "id": 10, "grade": 4}\n\n# 응답\nHTTP/1.1 200 OK\n${ok ? '{"success": true}' : '{"success": false, "error": "NOT_FOUND"}'}`;
        const l2 = `# 요청\nPATCH /students/10\n{"grade": 4}\n\n# 응답\n${ok ? 'HTTP/1.1 200 OK\n{"id": 10, "name": "Kim", "grade": 4}' : 'HTTP/1.1 404 Not Found\n{"title": "student not found"}'}`;
        return `<div class="pair"><div><h4>Level 0 — POST 하나로 모든 일</h4>${H.pre(l0)}</div><div><h4>Level 2 — 메서드와 상태 코드를 의미대로</h4>${H.pre(l2)}</div></div>` +
          T(['비교', 'Level 0', 'Level 2'], [['의도가 어디에 있나', 'Body 안의 "action" 문자열을 읽어야 안다', 'PATCH = 부분 수정. 첫 줄만 봐도 안다'], ['대상이 어디에 있나', 'Body 안의 "id"', 'URI /students/10 자체가 대상'], ['결과가 어디에 있나', ok ? '200 — 성공도 Body를 열어 봐야 확정' : '<span class="cbad">200인데 실패?</span> — Body를 열어 봐야 안다', ok ? '200 — 상태 코드로 성공을 안다' : '<b>404</b> — 상태 코드만으로 실패를 안다'], ['DevTools · 모니터링', ok ? '성공(200)' : '<span class="cbad">“성공(200)”으로 집계</span> — 오류율 0%', ok ? '성공(200)' : '실패(404)로 집계 — 오류율 그래프·재시도·캐시가 올바르게 동작']]) +
          `<p style="margin:0">${ok ? '성공할 때는 둘 다 “동작”한다. 토글을 끄고 실패 상황을 보라.' : '둘 다 “동작”은 한다. 하지만 Level 0은 의미가 Body 안에 숨어 있어서 사람이든 프로그램이든 매번 열어 봐야 한다. Level 2는 HTTP가 이미 가진 어휘를 쓴다.'}</p>`; } } },
  ] },

{ id: 'w5.repr', title: 'Resource vs Representation — 사람과 사진', slides: 'S13–S14',
  blocks: [
    `<p><b>자원(Resource)은 “개념”</b>(서버에 있는 진짜 상태 — DB 속 한 행)이고, <b>우리가 주고받는 것은 그 자원의 “표현(Representation)”</b>이다. 사람(자원)은 하나지만 사진(표현)은 증명사진 · 단체사진 · 명함처럼 여러 가지다.</p>`,
    H.key('REST = <b>Re</b>presentational <b>S</b>tate <b>T</b>ransfer — 자원의 상태(State)를 표현(Representation)으로 주고받는다(Transfer). 이름 자체가 이 절이다.'),
    { lab: { title: '같은 학생(/students/10), 다른 모습', init: { acc: 'json', view: 'item' },
      ctl: [{ k: 'view', type: 'select', label: '어떤 사진?', opts: [['item', '증명사진 — 상세 조회'], ['list', '단체사진 속 한 명 — 목록'], ['fields', '명함 — 필드 선택']] }, { k: 'acc', type: 'select', label: 'Accept 헤더', opts: [['json', 'application/json'], ['csv', 'text/csv'], ['html', 'text/html'], ['xml', 'application/xml (미지원)']] }],
      out: st => {
        const path = st.view === 'item' ? '/students/10' : st.view === 'list' ? '/students' : '/students/10?fields=name';
        const acc = { json: 'application/json', csv: 'text/csv', html: 'text/html', xml: 'application/xml' }[st.acc];
        const rows = st.view === 'item' ? [STU] : st.view === 'list' ? [{ id: 9, name: 'Lee' }, { id: 10, name: 'Kim' }, { id: 11, name: 'Park' }] : [{ name: 'Kim' }];
        let status = '200 OK', body;
        if (st.acc === 'xml') { status = '406 Not Acceptable'; body = '(이 서버는 application/xml 표현을 제공하지 않는다)'; }
        else if (st.acc === 'json') body = st.view === 'item' ? J(STU) : st.view === 'list' ? J({ items: rows }) : J(rows[0]);
        else if (st.acc === 'csv') { const ks = Object.keys(rows[0]); body = ks.join(',') + '\n' + rows.map(r => ks.map(k => r[k]).join(',')).join('\n'); }
        else body = rows.map(r => '<tr>' + Object.values(r).map(v => `<td>${v}</td>`).join('') + '</tr>').join('\n');
        return H.pre(`GET ${path}\nAccept: ${acc}\n\nHTTP/1.1 ${status}${status.startsWith('200') ? `\nContent-Type: ${acc}` : ''}\n\n${body}`) +
          `<p style="margin:0">클라이언트는 <b>Accept</b>로 원하는 형식을 말하고, 서버는 <b>Content-Type</b>으로 실제 형식을 알려 준다 (<b>Content Negotiation</b>). 지원하지 않으면 <b>406 Not Acceptable</b>.</p>`; } } },
    H.cards([['표현 ≠ DB 테이블', 'DB에 <code>password_hash</code>, <code>created_by</code>, 내부 메모가 있어도 응답 표현에는 넣지 않는다.<br>표현은 “클라이언트가 알아야 할 것”만 담는 계약이며, DB 스키마가 바뀌어도 유지될 수 있어야 한다.', 'L3'], ['수정할 때는?', '사진을 고쳐서 “이렇게 바꿔 주세요”라고 보낸다 — 받은 JSON을 고쳐 PATCH로 보낼 뿐이다.<br>실제 DB를 바꾸는 것은 서버이고, 서버는 규칙에 맞지 않으면 거절할 수 있다.', 'L7']]),
    H.note('사진을 찢어도 사람은 다치지 않는다 — 클라이언트가 받은 JSON을 마음대로 바꿔도 서버의 자원은 그대로다. 바꾸려면 “요청”을 보내야 한다.'),
  ] },

{ id: 'w5.uri', title: 'URI 설계 규칙 — 명사는 URI, 동사는 Method', slides: 'S15–S16',
  blocks: [
    T(['규칙', '✕ 피할 것', '○ 권장', '이유'], [['동사 금지', 'GET /getStudent?id=10', 'GET /students/10', '행위는 Method가 표현'], ['복수형 컬렉션', 'GET /student/list', 'GET /students', '컬렉션 → 원소 구조가 일관'], ['계층 관계', 'GET /enrollmentsOfStudent?sid=10', 'GET /students/10/enrollments', '포함 관계를 경로로 표현'], ['소문자 · 하이픈', 'GET /StudentGrades', 'GET /student-grades', 'URI 경로는 대소문자 구분'], ['필터는 Query', 'GET /students/grade/3', 'GET /students?grade=3', '경로 = 식별, 쿼리 = 조건'], ['확장자 금지', 'GET /students/10.json', 'Accept: application/json', '형식은 헤더로 협상'], ['끝 슬래시 통일', '/students 와 /students/ 혼용', '한 가지로 통일', '리다이렉트(307) → CORS 문제'], ['깊은 중첩 피하기', '/schools/1/depts/2/students/10', '/students/10', '중첩은 2단계 이내']], { mono: [1, 2] }),
    H.key('경로(Path)는 “무엇을”, 쿼리(Query)는 “어떤 조건으로”, 헤더는 “어떤 형식·권한으로”.'),
    H.warn('민감 정보(비밀번호·토큰)는 URI·쿼리에 넣지 않는다 — 서버 로그·브라우저 기록에 남는다.'),
    { lab: { title: 'URI 리뷰어 — 규칙 위반 찾기', init: { m: 'GET', u: '/getStudent?id=10' },
      ctl: [{ k: 'm', type: 'select', label: 'Method', opts: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(x => [x, x]) }, { k: 'u', type: 'text', label: 'URI', w: 300 }, { type: 'btns', items: ['/getStudent?id=10', '/student/list', '/StudentGrades', '/students/grade/3', '/students/10.json', '/schools/1/depts/2/students/10', '/login?pw=1234', '/students/10/enrollments'].map(v => ({ label: v, act: st => st.u = v })) }],
      out: st => {
        const u = String(st.u).trim(); if (!u.startsWith('/')) return '<span class="err">/로 시작하는 경로를 입력하세요</span>';
        const [path, q = ''] = u.split('?'); const segs = path.split('/').filter(Boolean); const issues = [];
        const VERB = /^(get|add|create|update|delete|remove|do|make|set|fetch|find|cancel)([A-Z_-].*)?$/;
        segs.forEach((s, i) => { if (VERB.test(s)) { if (!(i === segs.length - 1 && s === 'cancel' && st.m === 'POST')) issues.push(['동사 금지', `<code>${s}</code> — 행위는 Method(${st.m})가 표현한다`]); } });
        if (segs.includes('list')) issues.push(['복수형 컬렉션', '<code>/list</code> 대신 복수형 컬렉션 자체(<code>/students</code>)']);
        if (segs[0] && !/s$|-[a-z]+s$/.test(segs[0]) && !/^v\d+$/.test(segs[0]) && !VERB.test(segs[0])) issues.push(['복수형 컬렉션', `<code>/${segs[0]}</code> → 복수형(<code>/${segs[0]}s</code>)이 관례`]);
        if (/[A-Z]/.test(path)) issues.push(['소문자 · 하이픈', 'URI 경로는 대소문자를 구분한다 → <code>' + path.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() + '</code>']);
        if (/\.(json|xml|csv|html)$/.test(path)) issues.push(['확장자 금지', '형식은 <code>Accept</code> 헤더로 협상한다']);
        if (path.length > 1 && path.endsWith('/')) issues.push(['끝 슬래시 통일', '/students 와 /students/ 중 하나로 — 섞이면 307 리다이렉트 → Preflight 실패']);
        const ids = segs.filter(s => /^\d+$|^\{.*\}$/.test(s)).length; if (ids >= 3 || segs.filter(s => !/^v\d+$/.test(s)).length > 5) issues.push(['깊은 중첩 피하기', '중첩은 2단계 이내 — 대상이 고유 id를 가지면 <code>/students/10</code>처럼 바로']);
        if (/(^|\/)(grade|dept|year)\/\w+/.test(path)) issues.push(['필터는 Query', '조건은 경로가 아니라 <code>?grade=3</code>']);
        if (/(pw|password|token|secret|key)=/i.test(q)) issues.push(['민감 정보 금지', '비밀번호·토큰은 쿼리에 넣지 않는다 — 로그·기록에 남는다']);
        if (st.m === 'GET' && /(delete|remove|cancel|update)/i.test(path)) issues.push(['GET은 안전해야', 'GET으로 상태를 바꾸면 크롤러·프리페치가 실행해 버린다']);
        let prev = '';
        const roles = segs.map(sg => { let r; if (/^v\d+$/.test(sg)) r = ['버전', 'l1']; else if (prev === 'col') r = ['Item (하나)', 'l3']; else r = [prev ? 'Sub-resource / 하위 컬렉션' : 'Collection (전체)', 'l7']; prev = r[0].startsWith('Collection') || r[0].startsWith('Sub') ? 'col' : r[0] === '버전' ? '' : 'item'; return `<span class="seg"><code>/${esc(sg)}</code><small style="color:var(--${r[1]})">${r[0]}</small></span>`; }).join('');
        return (issues.length ? `<div class="verdict bad">${issues.length}개 규칙 위반</div>` + T(['규칙', '왜'], issues) : `<div class="verdict ok">규칙 위반 없음</div>`) + `<div class="segs"><span class="seg"><b>${st.m}</b><small>동사 = Method</small></span>${roles}${q ? `<span class="seg"><code>?${esc(q)}</code><small>조건 = Query</small></span>` : ''}</div>`;
      } } },
    { h3: 'URI 읽기 · 쓰기 연습 (S16)' },
    T(['요청', '읽는 법'], [['GET /students', '학생 목록을 보여 줘'], ['GET /students/10', '10번 학생을 보여 줘'], ['GET /students/10/enrollments', '10번 학생의 수강 목록'], ['GET /students?grade=3&sort=name', '3학년을 이름순으로'], ['POST /courses/7/enrollments', '7번 수업에 수강 신청'], ['DELETE /notices/5', '5번 공지를 지워 줘']], { mono: [0] }),
    T(['요구사항', 'URI'], [['301호 센서 목록을 보고 싶다', 'GET /rooms/301/sensors'], ['새 수업을 개설한다', 'POST /courses'], ['5번 공지의 제목만 고친다', 'PATCH /notices/5'], ['2학년 학생만 골라 본다', 'GET /students?grade=2'], ['10번 학생을 7번 수업에서 뺀다', 'DELETE /courses/7/students/10']], { mono: [1] }),
    H.key('URI를 만드는 3단계 공식<br>① 명사 찾기 — 요구사항에서 “무엇”에 밑줄 (수업, 학생)<br>② 하나 vs 전체 — 전체면 /courses, 하나면 /courses/7<br>③ 동사는 Method로 — 보기 = GET, 만들기 = POST, 고치기 = PATCH, 지우기 = DELETE'),
    H.note('읽었을 때 어색하면 설계가 어색한 것이다. “GET /getStudent” → “가져와 학생 가져오기를”처럼 동사가 두 번 나온다.'),
  ] },

{ id: 'w5.tree', title: 'Collection · Item · Sub-resource — 자원 트리', slides: 'S17',
  blocks: [
    `<p>스마트 교실 예시. 자원을 먼저 <b>명사 목록</b>으로 뽑고, 그 사이의 관계(1:N, N:M)를 트리로 그린 다음 URI를 정한다 — <b>과제의 첫 단계</b>다.</p>`,
    { fig: `<div class="rtree"><div class="rt-root">/v1</div><div class="rt-cols">${[['/students', [['/{student_id}', 'Item', [['/enrollments', 'Sub-resource']]]]], ['/courses', [['/{course_id}', 'Item', [['/students', 'Sub-collection']]]]], ['/rooms', [['/{room_id}', 'Item', [['/sensors', 'Sub-resource']]]]]].map(([c, kids]) => `<div class="rt-col"><div class="rt-n c">${c}<small>Collection</small></div>${kids.map(([k, kt, sub]) => `<div class="rt-n i">${k}<small>${kt}</small></div>${sub.map(([s, st]) => `<div class="rt-n s">${s}<small>${st}</small></div>`).join('')}`).join('')}</div>`).join('')}</div></div>` },
    T(['URI', '의미'], [['/v1/students', '학생 전체 (컬렉션)'], ['/v1/students/10', '10번 학생'], ['/v1/students/10/enrollments', '10번 학생의 수강 내역'], ['/v1/courses/7/students', '7번 수업의 수강생'], ['/v1/rooms/301/sensors', '301호 센서 목록'], ['/v1/rooms/301/sensors/t1', '301호 온도센서 t1']], { mono: [0] }),
    H.key('같은 관계, 두 방향의 경로 — 수강(enrollment)은 학생과 수업 사이의 <b>관계 자원</b>이다. 양쪽에서 조회할 수 있지만, 생성은 <code>POST /enrollments {"student_id":10,"course_id":7}</code>처럼 한 곳으로 모으면 일관성을 지키기 쉽다.'),
  ] },

{ id: 'w5.crud', title: 'CRUD 매핑 — 학생 한 명의 일생', slides: 'S18–S19',
  blocks: [
    T(['작업', 'Method', 'URI', '요청 Body', '성공 응답', '멱등', '안전'], [['목록 조회', 'GET', '/students?grade=3', '없음', '200 + 배열', 'O', 'O'], ['단건 조회', 'GET', '/students/10', '없음', '200 + 객체 / 404', 'O', 'O'], ['생성', 'POST', '/students', '{"name","grade"}', '<b>201 + Location</b>', 'X', 'X'], ['전체 교체', 'PUT', '/students/10', '모든 필드', '200 또는 204', 'O', 'X'], ['부분 수정', 'PATCH', '/students/10', '바꿀 필드만', '200 + 수정된 객체', '△', 'X'], ['삭제', 'DELETE', '/students/10', '없음', '<b>204 No Content</b>', 'O', 'X']], { mono: [1, 2, 3] }),
    { trace: { mode: 'ladder', title: '요청 → 응답 → DB가 어떻게 바뀌는지 한 단계씩', sub: 'DB 상태표를 같이 보자', side: 120, rowH: 56,
      lanes: [{ id: 'c', label: 'Client' }, { id: 's', label: 'API Server' }, { id: 'd', label: 'DB', sub: 'students' }],
      tables: [{ id: 'db', title: 'DB · students 테이블', cols: ['id', 'name', 'grade'], rows: [] }],
      events: [
        { from: 'c', to: 's', label: 'C · POST /students', color: 'l7', pkt: [req('POST /students', [['Content-Type', 'application/json'], ['Body', '{"name":"Kim","grade":3}']])], say: '<b>Create</b> — 컬렉션(/students)에 새 학생을 만든다. id는 클라이언트가 아니라 <b>서버가 정한다</b>.' },
        { from: 's', to: 'd', label: 'INSERT', color: 'l4', tables: { db: [['11', 'Kim', '3']] }, say: 'DB에 새 행이 생긴다. 서버가 id 11을 붙였다.' },
        { from: 's', to: 'c', label: '201 Created', color: 'ok', pkt: [res('201 Created', [['Location', '/students/11'], ['Body', '{"id":11,"name":"Kim","grade":3}']])], say: '<b>201 + Location</b>: 생성됐다는 사실과 새 자원의 주소를 함께 알린다 → 클라이언트는 바로 GET할 수 있다. 200으로만 응답하면 “만들어졌는지” 구분이 흐려진다.' },
        { from: 'c', to: 's', label: 'R · GET /students/11', color: 'l7', pkt: [req('GET /students/11', [['Body', '(없음)']])], say: '<b>Read</b> — Body 없이 조회.' },
        { from: 's', to: 'c', label: '200 OK', color: 'ok', pkt: [res('200 OK', [['Body', '{"id":11,"name":"Kim","grade":3}']])], say: 'DB는 <b>변화 없음</b> — GET은 안전(Safe)하다. 표에 노란 줄이 없는 것을 보라.' },
        { from: 'c', to: 's', label: 'U · PATCH /students/11', color: 'l7', pkt: [req('PATCH /students/11', [['Content-Type', 'application/json'], ['Body', '{"grade":4}']])], say: '<b>Update</b> — 바꿀 필드만 보낸다.' },
        { from: 's', to: 'd', label: 'UPDATE', color: 'l4', tables: { db: [['11', 'Kim', '4']] }, say: '<b>grade만 3 → 4</b>. name은 그대로.' },
        { from: 's', to: 'c', label: '200 OK', color: 'ok', pkt: [res('200 OK', [['Body', '{"id":11,"name":"Kim","grade":4}']])], say: '수정된 객체를 돌려준다.' },
        { from: 'c', to: 's', label: 'D · DELETE /students/11', color: 'l7', pkt: [req('DELETE /students/11', [['Body', '(없음)']])], say: '<b>Delete</b>.' },
        { from: 's', to: 'd', label: 'DELETE', color: 'l4', tables: { db: [] }, say: '행이 사라진다.' },
        { from: 's', to: 'c', label: '204 No Content', color: 'ok', pkt: [res('204 No Content', [['Body', '(없음)']])], say: '<b>204</b> — 성공했지만 돌려줄 내용이 없다(Body 없음).' },
        { from: 'c', to: 's', label: 'GET /students/11', color: 'l7', pkt: [req('GET /students/11', [['Body', '(없음)']])], say: '삭제 후 다시 조회하면?' },
        { from: 's', to: 'c', label: '404 Not Found', color: 'bad', pkt: [res('404 Not Found', [['Body', '{"title":"student not found"}']])], say: '<b>404</b> — 그런 자원이 없다.' },
        { from: 'c', to: 's', label: 'DELETE /students/11 (한 번 더)', color: 'l7', pkt: [req('DELETE /students/11', [['Body', '(없음)']])], say: '같은 DELETE를 한 번 더 보내면?' },
        { from: 's', to: 'c', label: '404 (또는 204)', color: 'bad', state: { d: 'DB: 여전히 “없음”' }, pkt: [res('404 Not Found', [['Body', '{"title":"student not found"}']])], say: '응답 코드는 달라도 <b>DB 상태는 똑같이 “없음”</b> — 그래서 DELETE는 <b>멱등</b>이다(4주차: 두 번째 DELETE가 404여도 상태는 같다).' },
      ] } },
    H.key('멱등: 여러 번 보내도 결과 상태가 같다 → 재시도가 안전한 것은 GET · PUT · DELETE. POST는 중복 생성 위험(4주차 Idempotency-Key).'),
  ] },

{ id: 'w5.putpatch', title: 'PUT vs PATCH, 그리고 CRUD로 어려운 “행위”', slides: 'S20–S21',
  blocks: [
    `<p><b>“통째로 교체”와 “부분 수정”은 다른 계약이다.</b> 차이는 <b>빠진 필드</b>를 어떻게 다루는가에서 드러난다.</p>`,
    { lab: { title: '같은 Body를 PUT과 PATCH로 보내 보기', init: { m: 'PUT', fName: true, fGrade: true, fEmail: false, grade: 4 },
      ctl: [{ k: 'm', type: 'select', label: 'Method', opts: [['PUT', 'PUT — 전체 교체'], ['PATCH', 'PATCH — 부분 수정']] }, { k: 'fName', type: 'toggle', label: 'Body에 name 포함' }, { k: 'fGrade', type: 'toggle', label: 'Body에 grade 포함' }, { k: 'fEmail', type: 'toggle', label: 'Body에 email 포함' }, { k: 'grade', label: 'grade 값', min: 1, max: 4 }],
      out: st => {
        const body = {}; if (st.fName) body.name = 'Kim'; if (st.fGrade) body.grade = st.grade; if (st.fEmail) body.email = 'kim@inu.ac.kr';
        const after = { id: 10 }; ['name', 'grade', 'email'].forEach(k => { after[k] = k in body ? body[k] : st.m === 'PUT' ? null : STU[k]; });
        const lost = ['name', 'grade', 'email'].filter(k => !(k in body) && st.m === 'PUT' && STU[k] != null);
        return `<div class="pair"><div><h4>BEFORE · GET /students/10</h4>${H.pre(JSON.stringify(STU, null, 2))}</div><div><h4>${st.m} /students/10 → 결과</h4>${H.pre('Body: ' + J(body) + '\n\n' + JSON.stringify(after, null, 2))}</div></div>` +
          (lost.length ? `<div class="verdict bad">PUT: 빠진 필드 ${lost.join(', ')} → null (사라짐)</div>` : `<div class="verdict ok">${st.m === 'PUT' ? 'PUT: 모든 필드를 보냈으니 잃은 것 없음' : 'PATCH: 보낸 필드만 바뀌고 나머지는 그대로'}</div>`) +
          `<p style="margin:0">PUT의 Body = 자원의 <b>“완전한 새 표현”</b>. PATCH의 Body = <b>바꿀 내용(변경 명세)만</b>.</p>`; } } },
    T(['', 'PUT', 'PATCH'], [['Body의 의미', '자원의 “완전한 새 표현”', '바꿀 내용(변경 명세)만'], ['빠진 필드', '삭제/기본값으로 간주', '그대로 유지'], ['멱등성', '항상 멱등', '형식에 따라 다름 — Merge Patch는 사실상 멱등, “+1” 같은 연산은 비멱등'], ['형식 표준', 'application/json', 'application/merge-patch+json (RFC 7396)<br>application/json-patch+json (RFC 6902)'], ['실무 사용', '설정 객체 전체 저장, 파일 업로드', '프로필 일부 수정 — 대부분의 “수정” 화면']]),
    H.warn('AI가 PUT 핸들러를 만들면 확인할 것: 빠진 필드를 어떻게 처리하는가? “PUT인데 부분 수정처럼 동작”하면 계약 위반이며, 클라이언트 버그의 씨앗이 된다.'),
    { h3: '수강 취소 · 출석 체크 · 결제 승인 — 동사가 꼭 필요할 때 (S21)' },
    T(['방법', '요청', '언제'], [['A. 상태 필드로 표현', '<code>PATCH /enrollments/5</code><br><code>{"status": "cancelled"}</code>', '단순한 상태 전이. <b>가장 REST다운 방법</b>'], ['B. 행위를 자원으로 명사화', '<code>POST /enrollments/5/cancellation</code><br><code>{"reason": "시간표 충돌"}</code>', '취소 이력·사유를 별도 자원으로 남길 때'], ['C. Controller 리소스', '<code>POST /enrollments/5/cancel</code><br>(body 없음)', '실무에서 흔한 타협. 동사는 하위 경로에만'], ['<span class="cbad">✕ 안티패턴</span>', '<code>GET /cancelEnrollment?id=5</code>', '<span class="cbad">GET은 안전해야 함 — 크롤러·프리페치가 수강을 취소!</span>']]),
    H.key('판단 기준<br>① 상태 하나만 바뀌면 A<br>② 행위 자체에 기록·사유·승인 절차가 있으면 B<br>③ 팀 합의가 있으면 C<br>어떤 경우든 <b>GET으로 상태를 바꾸지 않는다</b>.'),
  ] },

{ id: 'w5.status', title: 'REST 응답 상태 코드 고르기', slides: 'S22–S23',
  blocks: [
    `<p>4주차의 상태 코드를 “API 설계 결정”으로 바꿔 본다. 실패 상황은 <b>위에서 아래로 질문</b>하며 고른다.</p>`,
    { lab: { title: '결정 흐름 — 체크를 하나씩 풀어 보기', init: { auth: true, perm: true, fmt: true, exist: true, conf: true, rate: true, op: 'post', bad: 'value' },
      ctl: [{ k: 'op', type: 'select', label: '요청 종류', opts: [['get', '조회 (GET)'], ['post', '생성 (POST)'], ['patch', '수정 (PATCH)'], ['del', '삭제 (DELETE)'], ['async', 'AI 추론 요청 (비동기)']] }, ...FLOW.map(([k, q]) => ({ k, type: 'toggle', label: q.replace('?', '') })), { k: 'bad', type: 'select', label: '형식이 틀렸다면', opts: [['json', 'JSON 자체가 깨짐'], ['value', '문법은 맞는데 값이 규칙 위반']] }],
      out: st => {
        const stop = FLOW.findIndex(([k]) => !st[k]);
        const code = stop < 0 ? SUCCESS[st.op] : [stop === 2 ? (st.bad === 'json' ? '400 Bad Request' : '422 Unprocessable Content') : FLOW[stop][2], FLOW[stop][3]];
        return `<div class="flow">${FLOW.map(([k, q, c], i) => `<div class="fl-row ${stop === i ? 'stop' : stop < 0 || i < stop ? 'pass' : 'skip'}"><span class="fl-q">${q}</span><span class="fl-a">${stop === i ? 'No → ' + (i === 2 ? (st.bad === 'json' ? '400' : '422') : c) : stop < 0 || i < stop ? 'Yes ↓' : '—'}</span></div>`).join('')}</div>` +
          `<div class="verdict ${stop < 0 ? 'ok' : 'bad'}" style="font-size:18px">${code[0]}</div><p style="margin:0">${code[1]}${stop < 0 ? '' : ` · 첫 자리 <b>4</b> = 요청을 보낸 쪽(클라이언트)이 고칠 것`}</p>`; } } },
    T(['성공 시', '상황'], Object.values(SUCCESS).map(x => [`<b>${x[0]}</b>`, x[1]])),
    T(['서버 측', '상황'], [['500', '처리 중 예외 — 클라이언트 잘못 아님'], ['502 / 504', '프록시 뒤 서버 응답 없음 · 시간 초과'], ['503', '과부하·점검 중 (Retry-After)']]),
    { h3: '상황별 연습 — 먼저 답을 떠올린 뒤 펼쳐 보기 (S23)' },
    { mount: el => { const Q = [['학생 목록 조회에 성공했다', '200', 'OK — 결과를 Body에 담아 반환'], ['새 학생 등록에 성공했다', '201', 'Created — Location에 새 주소'], ['학생을 삭제했고, 돌려줄 내용이 없다', '204', 'No Content — Body 없음'], ['로그인하지 않고 성적을 조회했다', '401', '“누구세요?” — 인증 필요'], ['학생 계정으로 성적 입력을 시도했다', '403', '“당신은 안 됩니다” — 권한 없음'], ['grade에 “삼학년”을 넣어 보냈다', '422', '형식은 JSON인데 값이 규칙 위반'], ['이미 등록된 학번으로 또 등록했다', '409', 'Conflict — 현재 상태와 충돌'], ['서버 코드에서 DB 연결이 끊겼다', '500', '클라이언트 잘못이 아님 — 서버가 고칠 일']];
      el.innerHTML = `<div class="flip">${Q.map(([q, c, d], i) => `<details><summary><span class="mono cm">${i + 1}</span> ${q}</summary><div><b class="mono" style="font-size:18px">${c}</b> ${d}</div></details>`).join('')}</div>`; } },
    H.key('첫 자리만 봐도 “누가 고쳐야 하나”가 보인다<br>2xx 성공<br>4xx 요청을 보낸 쪽(클라이언트)이 고칠 것<br>5xx 서버가 고칠 것'),
    H.warn('안티패턴: 모든 응답을 200으로 보내고 Body에 <code>{"success": false}</code>를 담기. 캐시·모니터링·재시도 로직·브라우저 DevTools 모두 상태 코드를 기준으로 동작한다.'),
  ] },

{ id: 'w5.error', title: '오류 응답도 계약이다', slides: 'S24',
  blocks: [
    `<p>상태 코드 + <b>일관된 오류 Body 형식</b> → 프론트엔드가 메시지를 안정적으로 처리한다.</p>`,
    { fig: `<div class="pair"><div><h4>표준 형식 — RFC 9457 Problem Details</h4>${H.pre('HTTP/1.1 409 Conflict\nContent-Type: application/problem+json\n\n{\n  "type": "https://api.inu.ac.kr/errors/duplicate",\n  "title": "Student already exists",\n  "status": 409,\n  "detail": "학번 202601234 는 이미 등록됨",\n  "instance": "/v1/students"\n}')}</div><div><h4>FastAPI 기본 — 검증 오류 (Pydantic v2)</h4>${H.pre('HTTP/1.1 422 Unprocessable Content\n\n{"detail": [\n  {"type": "missing",\n   "loc": ["body", "name"],\n   "msg": "Field required"},\n  {"type": "less_than_equal",\n   "loc": ["body", "grade"],\n   "msg": "Input should be less than or equal to 4"}\n]}')}</div></div>` },
    H.cards([['일관성', '모든 endpoint가 같은 오류 구조.<br>프론트는 파서 하나로 처리', ''], ['기계 + 사람', 'type / code는 프로그램이 읽고,<br>detail은 사람이 읽는다', ''], ['위치 정보', '어느 필드가 왜 틀렸는지(loc)<br>→ 폼 옆에 바로 표시', ''], ['정보 노출 금지', 'Stack trace · SQL 문 · 내부 경로는<br>절대 응답에 넣지 않는다', '']]),
    H.key('400 vs 422<br>400 = JSON 자체가 깨졌거나 해석 불가<br>422 = 문법은 맞지만 값이 규칙 위반(타입·범위)<br>FastAPI는 검증 실패를 422로 응답한다.'),
  ] },

{ id: 'w5.endpoint', title: 'Endpoint 해부 — 요청의 각 부분은 handler의 어디로', slides: 'S25',
  blocks: [
    { fig: `<div class="pair"><div><h4>HTTP REQUEST</h4>${H.pre('PATCH /v1/students/10?notify=true HTTP/1.1\nHost: api.example.com\nAuthorization: Bearer eyJhbGci...\nContent-Type: application/json\n\n{"grade": 4}')}</div><div><h4>FASTAPI HANDLER</h4>${H.pre('@app.patch("/v1/students/{sid}")\ndef update_student(\n    sid: int,                  # path\n    body: StudentPatch,        # body\n    notify: bool = False,      # query\n    user = Depends(auth),      # header\n): ...')}</div></div>` },
    T(['요청 구성요소', '예시', 'FastAPI에서 받는 방법', '쓰임'], [['Method + Path', 'PATCH /v1/students/{sid}', '@app.patch("…") 데코레이터', '<b>Endpoint</b> = 어떤 handler를 부를지 결정'], ['Path parameter', '10', 'sid: int', '어떤 자원인지 식별 — 타입 자동 변환·검증'], ['Query parameter', '?notify=true', 'notify: bool = False', '선택 옵션 · 필터 · 정렬 · 페이지'], ['Header', 'Authorization', 'Depends(auth), Header()', '인증 · 형식 · 메타데이터'], ['Body', '{"grade": 4}', 'body: StudentPatch (Pydantic)', '생성·수정할 데이터 — Schema 검증']], { mono: [1, 2] }),
    H.key('Endpoint = Method + Path. 같은 /students/10이라도 GET · PATCH · DELETE는 서로 다른 endpoint이며 다른 handler로 간다. 맞는 path에 없는 method → <b>405</b>.'),
  ] },

{ id: 'w5.pipe', title: '버튼 하나 눌렀을 때 — Backend 안에서 지나가는 길', slides: 'S26–S27',
  blocks: [
    `<p>“학년 저장” 버튼부터 DB까지, 그리고 다시 화면까지. <b>오류는 단계마다 다른 상태 코드로 나타난다.</b> 이번 학기에 배운 DNS · TCP · TLS · HTTP가 모두 등장한다.</p>`,
    { trace: { title: '요청 한 개의 여행 (FastAPI 기준)', sub: '각 단계 아래 = 여기서 실패하면 보이는 증상', rowH: 96, nodeW: 140,
      nodes: [{ id: 'js', label: 'JS · fetch', sub: '버튼 클릭', icon: 'browser', x: 0, y: 0 }, { id: 'br', label: 'Browser', sub: '실패 시: CORS 오류', icon: 'browser', x: .5, y: 0 }, { id: 'uv', label: 'Uvicorn', sub: '실패 시: 연결 거부', icon: 'server', x: 1, y: 0 }, { id: 'mw', label: 'Middleware', sub: 'CORS 차단 / 401', icon: 'fw', x: 1, y: 1 }, { id: 'rt', label: 'Router', sub: '404 / 405', icon: 'switch', x: .5, y: 1 }, { id: 'val', label: 'Pydantic', sub: '422', icon: 'lock', x: 0, y: 1 }, { id: 'hd', label: 'Handler', sub: '400 · 403 · 409', icon: 'proc', x: .25, y: 2 }, { id: 'db', label: 'DB', sub: '500', icon: 'db', x: .75, y: 2 }],
      links: [['js', 'br'], ['br', 'uv'], ['uv', 'mw'], ['mw', 'rt'], ['rt', 'val'], ['val', 'hd'], ['hd', 'db']],
      events: [
        { from: 'js', to: 'br', label: '① 저장 클릭', color: 'l7', pkt: [req('PATCH /v1/students/10', [['Content-Type', 'application/json'], ['Body', '{"grade":4}']])], say: '사용자가 “저장”을 클릭 → JS가 <code>fetch(".../v1/students/10", {method: "PATCH"})</code> 호출.' },
        { from: 'br', to: 'br', label: '② 사전 확인', say: '브라우저의 사전 확인 — 다른 Origin이고 PATCH라서 <b>OPTIONS로 Preflight</b>를 먼저 보낸다(5.23). 여기서 막히면 <b>CORS 오류</b>, 실제 PATCH는 나가지도 않는다.' },
        { from: 'br', to: 'uv', label: '③ DNS · TCP · TLS', color: 'l4', say: '연결 준비 (Week 2~4): DNS로 IP 찾기 → TCP 3-way handshake → TLS. 서버가 안 떠 있으면 <b>ERR_CONNECTION_REFUSED</b>.' },
        { from: 'uv', to: 'mw', label: '④ HTTP로 해석', color: 'l7', pkt: [req('PATCH /v1/students/10', [['Content-Type', 'application/json'], ['Authorization', 'Bearer eyJ…'], ['Body', '{"grade":4}']])], say: '<b>Uvicorn</b>(ASGI 서버)이 도착한 바이트를 HTTP 요청(메서드·경로·헤더·Body)으로 해석한다. <b>Middleware</b>(CORS·로깅·인증)는 Router보다 먼저 동작한다.' },
        { from: 'mw', to: 'rt', label: '⑤ 길 찾기', color: 'l7', say: '<b>Router</b>: PATCH + /v1/students/{sid} → <code>update_student()</code> 선택. 경로가 없으면 404, 경로는 있는데 메서드가 없으면 405.' },
        { from: 'rt', to: 'val', label: '⑥ Pydantic 검문', color: 'l7', say: '<code>{"grade": 4}</code> 검사 — 통과 못 하면 <b>여기서 바로 422</b>. 그러니 422가 나왔다면 handler 코드는 <b>실행조차 안 됐다</b>.' },
        { from: 'val', to: 'hd', label: '⑦ Handler', color: 'l7', say: '비즈니스 로직. 권한·중복 같은 규칙 위반은 handler가 직접 <code>raise</code> → 400 · 403 · 409.' },
        { from: 'hd', to: 'db', label: 'UPDATE', color: 'l4', say: '<code>UPDATE students SET grade = 4 WHERE id = 10</code>. DB 오류·예외는 500.' },
        { from: 'db', to: 'js', label: '⑧ 200 + JSON', color: 'ok', path: ['db', 'hd', 'val', 'rt', 'mw', 'uv', 'br', 'js'], pkt: [res('200 OK', [['Content-Type', 'application/json'], ['Body', '{"id":10,"name":"Kim","grade":4}']])], say: '응답이 돌아온다 — <b>response_model</b>로 직렬화(password_hash 같은 필드는 걸러짐) → 브라우저 → JS가 받아서 화면 갱신.' },
      ] } },
    { lab: { title: '증상 → 몇 번 단계에서 멈췄나?', init: { s: 'c422' },
      ctl: [{ k: 's', type: 'select', label: '본 증상', opts: Object.entries(SYMPTOM).map(([k, v]) => [k, v[0]]) }],
      out: st => { const at = SYMPTOM[st.s][1];
        return `<div class="pipe">${STAGES.map((s, i) => `<div class="pp ${i < at ? 'pass' : i === at ? 'stop' : 'skip'}"><b>${s[1]}</b><small>${s[2]}</small><em>${s[3]}</em></div>`).join('')}</div>` +
          `<div class="verdict ${at === 9 ? 'ok' : 'bad'}">${at === 9 ? '모든 단계 통과' : `${STAGES[at][1]} 단계에서 멈춤`}</div><p style="margin:0">${at === 5 ? '422 → Pydantic 검문에서 반환. <b>handler는 실행되지 않았다</b> (Quick Check Q6).' : at >= 7 && at < 9 ? '500 → handler 이후. uvicorn 로그의 Traceback을 본다.' : at === 0 ? 'CORS → 2번(브라우저)에서 멈춤. 서버 설정을 본다 (5.24).' : at === 1 ? '연결 거부 → 서버 미실행 · 포트 · 바인딩(Week 3).' : at === 9 ? '' : '상태 코드가 있다 = TCP 연결·HTTP 파싱은 성공했다.'}</p>`; } } },
    H.cards([['Middleware 순서', 'CORS는 Router보다 먼저 동작한다.<br>Preflight(OPTIONS)는 handler까지 가지 않고 CORS middleware가 바로 응답 → OPTIONS용 handler를 따로 만들 필요가 없다.', 'L3'], ['Response Model', '나가는 데이터도 검증한다.<br><code>response_model=Student</code>로 지정하면 DB 객체에 password_hash가 있어도 응답에서 걸러진다 — 입력 검증만큼 출력 필터링이 중요하다.', 'L7']]),
    H.key('디버깅의 절반은 “몇 번 단계에서 멈췄는가”를 알아내는 것이다<br>422면 6번에서<br>연결 거부면 3~4번에서<br>CORS면 2번에서'),
  ] },

{ id: 'w5.json', title: 'JSON 읽기와 Schema 검증 — 입구 검문소', slides: 'S28–S30',
  blocks: [
    { fig: `<div class="pair"><div><h4>학생 한 명의 JSON 표현</h4>${H.pre('{                                   // 객체 시작\n  "id": 10,                         // 숫자: 따옴표 없음\n  "name": "Kim",                    // 문자열: 큰따옴표\n  "graduated": false,               // true / false\n  "phone": null,                    // 값 없음\n  "courses": [                      // 배열 시작\n    {"code": "NET301", "credit": 3},\n    {"code": "AI201",  "credit": 3}\n  ],                                // 배열 끝\n  "address": {"city": "Incheon"}    // 객체 안의 객체\n}                                   // 객체 끝 — 쉼표 없음')}<p class="cm" style="font-size:13px;margin:0">설명용 주석이다. 실제 JSON에는 주석을 쓸 수 없다.</p></div><div><h4>규칙 다섯 개</h4>${lines(['<b>{ } 객체</b> — 이름표가 붙은 상자. "이름": 값의 묶음', '<b>[ ] 배열</b> — 순서가 있는 목록', '<b>이름은 항상 큰따옴표</b> — "name" ○ · name ✕ · \'name\' ✕', '<b>값의 종류는 6가지</b> — 문자열 · 숫자 · true/false · null · 배열 · 객체', '<b>쉼표는 항목 사이에만</b> — 마지막 쉼표 · 주석 금지'])}</div></div>` },
    { h3: 'Schema = 실행 가능한 계약 (S29)' },
    H.pre(`# schemas.py
from pydantic import BaseModel, Field, EmailStr
class StudentIn(BaseModel):          # 요청 Schema
    name: str = Field(min_length=1, max_length=50)
    grade: int = Field(ge=1, le=4)
    email: EmailStr | None = None
class StudentOut(StudentIn):         # 응답 Schema
    id: int
class StudentPatch(BaseModel):       # PATCH용: 모두 선택
    name: str | None = None
    grade: int | None = Field(None, ge=1, le=4)`),
    { lab: { title: 'Pydantic 검문소 — Body를 넣어 보기', init: { mode: 'post', body: '{"name": "Kim", "grade": 3}' },
      ctl: [{ k: 'mode', type: 'select', label: 'Endpoint', opts: [['post', 'POST /v1/students (StudentIn)'], ['patch', 'PATCH /v1/students/10 (StudentPatch)']] }, { k: 'body', type: 'text', label: 'Request Body (JSON)', w: 360 },
        { type: 'btns', items: ['{"name": "Kim", "grade": 3}', '{"grade": 3}', '{"name": "Kim", "grade": 7}', '{"name": "", "grade": 2}', '{"name": "Kim", "grade": "3"}', '{"name": "Kim", "grade": "삼"}', "{'name': 'Kim'}", '{"grade": 3,}', '{"email": null}'].map(v => ({ label: v, act: st => st.body = v })) }],
      out: st => { const r = validateStudent(st.body, st.mode);
        if (r.ok) return `<div class="verdict ok">✓ 통과 → handler 실행 → ${st.mode === 'post' ? '201 Created' : '200 OK'}</div>${H.pre('handler가 받은 값: ' + J(r.out))}<p style="margin:0">${/"grade"\s*:\s*"/.test(st.body) ? '문자열 "3"이 숫자 3으로 <b>자동 변환</b>되어 통과했다 (기본 lax 모드).<br>' : ''}${st.mode === 'patch' && /null/.test(st.body) ? '<b>null vs 누락</b>: PATCH에서 {"email": null}은 “지워라”, 필드 없음은 “그대로”.<br>' : ''}${r.extra && r.extra.length ? `Schema에 없는 필드(${r.extra.join(', ')})는 기본 설정에서 무시된다.` : ''}</p>`;
        return `<div class="verdict bad">✕ 422 Unprocessable Content — handler는 실행되지 않음</div>${H.pre('{"detail": [\n' + r.errs.map(e => '  ' + J(e)).join(',\n') + '\n]}')}<p style="margin:0">${r.why || '<b>loc</b>을 보면 어느 필드가 왜 틀렸는지 알 수 있어 프론트엔드가 폼 옆에 바로 표시할 수 있다.'}</p>`; } } },
    H.note('검사 규칙은 Pydantic v2 기본(lax) 동작에 맞췄다. 이메일 형식 검사만 단순화했다.'),
    T(['JSON 타입', '예', 'Python'], [['string', '"Kim"', 'str'], ['number', '3, 3.14', 'int / float'], ['boolean', 'true / false', 'bool'], ['null', 'null', 'None'], ['array', '[1, 2, 3]', 'list'], ['object', '{"k": "v"}', 'dict / Model']], { mono: [1] }),
    H.cards([['날짜', 'JSON에는 날짜 타입이 없다 → ISO 8601 문자열<br><code>"2026-10-16T09:00:00+09:00"</code>', ''], ['null vs 누락', 'PATCH에서 <code>{"email": null}</code>은 “지워라”,<br>필드 없음은 “그대로”. 둘을 구분해야 한다', ''], ['이름 규칙', 'Python은 snake_case, JS는 camelCase.<br>API 전체에서 하나로 통일', ''], ['큰 정수', 'JS Number는 2^53까지 정확.<br>64-bit ID는 문자열로 보내는 경우가 많다', ''], ['입력 ≠ 출력', '요청 Schema와 응답 Schema를 분리<br>→ id·비밀번호 처리 실수 방지', '']]),
    H.key('Pydantic 모델 하나로<br>① 입력 검증(422)<br>② 응답 필터링<br>③ OpenAPI 문서 생성<br>이 동시에 이루어진다. 검증을 입구에서 하면 handler의 if문이 사라지고, 규칙을 어긴 데이터는 DB에 저장될 수 없다.'),
  ] },

{ id: 'w5.page', title: '컬렉션 조회 — 필터 · 정렬 · 페이지네이션', slides: 'S31–S32',
  blocks: [
    H.pre(`GET /v1/students?grade=3&dept=ee           # 필터
GET /v1/students?sort=-created_at,name     # 정렬 (- = 내림차순)
GET /v1/students?fields=id,name            # 필드 선택
GET /v1/students?q=kim                     # 검색

# 페이지 응답 형식 예
{ "items": [ {...}, {...} ],
  "total": 1234,
  "next": "/v1/students?cursor=eyJpZCI6NDB9&limit=20" }`),
    `<p><b>Offset</b>은 “처음부터 40쪽 넘긴 뒤 20쪽 읽기”, <b>Cursor</b>는 “책갈피 다음부터 20쪽 읽기”다.</p>`,
    { lab: { title: '읽는 사이 새 글이 올라오면 — Offset vs Cursor', tag: '실험', init: { lim: 5, ins: 1, deep: 40 },
      ctl: [{ k: 'lim', label: 'limit', min: 3, max: 8 }, { k: 'ins', label: '1쪽을 읽는 사이 새로 올라온 글 수', min: 0, max: 3 }, { k: 'deep', label: '깊은 페이지 offset', min: 0, max: 100000, step: 20, type: 'num' }],
      out: st => {
        const N = 30, lim = st.lim, ins = st.ins;
        const before = Array.from({ length: N }, (_, i) => N - i);          // newest first: 30,29,…
        const after = [...Array.from({ length: ins }, (_, i) => N + ins - i), ...before];
        const p1 = before.slice(0, lim);
        const offP2 = after.slice(lim, lim * 2);
        const last = p1[p1.length - 1];
        const curP2 = after.filter(id => id < last).slice(0, lim);
        const dup = offP2.filter(x => p1.includes(x));
        const chip = (id, cls) => `<span class="pgc ${cls}">${id}</span>`;
        return `<div class="pg"><div><b>1쪽</b> (둘 다 같음) ${p1.map(x => chip(x, '')).join('')}</div>` +
          `<div><b>새 글 ${ins}개 추가</b> ${after.slice(0, ins).map(x => chip(x, 'new')).join('') || '<span class="cm">없음</span>'}</div>` +
          `<div><b>Offset 2쪽</b> <code>?offset=${lim}&limit=${lim}</code> ${offP2.map(x => chip(x, dup.includes(x) ? 'dup' : '')).join('')}</div>` +
          `<div><b>Cursor 2쪽</b> <code>?cursor=${last}&limit=${lim}</code> ${curP2.map(x => chip(x, '')).join('')}</div></div>` +
          `<div class="verdict ${dup.length ? 'bad' : 'ok'}">${dup.length ? `Offset: 방금 본 글 ${dup.join(', ')}이(가) 2쪽에 또 나온다 (중복)` : 'Offset도 이번엔 중복 없음 — 새 글 수를 1 이상으로 올려 보라'}</div>` +
          T(['', 'Offset / Page', 'Cursor (Keyset)'], [['서버 SQL', `<code>… ORDER BY id DESC LIMIT ${lim} OFFSET ${st.deep}</code>`, `<code>… WHERE id &lt; ${last} ORDER BY id DESC LIMIT ${lim}</code>`], ['DB가 훑는 행', `<b>${IP.fmt(st.deep + lim)}</b>개 (앞 ${IP.fmt(st.deep)}개를 세고 버림)`, `인덱스로 바로 점프 → 약 <b>${lim}</b>개`], ['장점', '구현 쉬움, “7페이지로 이동” 가능', '대용량에서도 일정한 속도, 실시간 추가에도 중복·누락 없음'], ['단점', '깊은 페이지 느림, 중간 삽입 시 중복·누락', '임의 페이지 점프 불가'], ['적합', '관리자 화면, 작은 테이블', '무한 스크롤 피드, 센서 로그, 채팅 기록']]) +
          `<div class="assume"><b>가정</b> 최신 글이 위(id 내림차순). 강의 그림은 id 오름차순(WHERE id &gt; 40)이지만 원리는 같다.</div>`; } } },
    H.warn('서버는 limit의 최대값(예: 100)을 강제해야 한다. 클라이언트가 <code>?limit=1000000</code>을 보내는 순간 DB와 네트워크가 함께 멈춘다.'),
    H.key('클라이언트 입장에서 가장 쉬운 방법: 응답의 <code>"next"</code> 링크를 그대로 다시 호출하고, next가 null이면 끝. 서버가 커서를 만들어 주므로 계산할 필요가 없다.'),
  ] },

{ id: 'w5.version', title: '버전 관리와 하위 호환성', slides: 'S33',
  blocks: [
    `<p>이미 배포된 앱은 API가 바뀌어도 즉시 업데이트되지 않는다. 그래서 “이 변경이 기존 클라이언트를 깨뜨리는가?”를 먼저 따진다.</p>`,
    T(['방식', '예시', '장점', '단점'], [['URI 경로', '/v1/students → /v2/students', '명확, 캐시·라우팅 쉬움', 'URI가 자원이 아닌 버전을 담음'], ['Header', 'Accept: application/vnd.inu.v2+json', 'URI가 깔끔', '브라우저·curl에서 확인 불편'], ['Query', '/students?version=2', '간단', '누락 시 기본값 혼란']], { mono: [1] }),
    { lab: { title: '이 변경, 버전을 올려야 할까?', init: { c: '4' },
      ctl: [{ k: 'c', type: 'select', label: '변경', opts: CHANGES.map((c, i) => [String(i), c[0]]) }],
      out: st => { const [t, br] = CHANGES[+st.c];
        return `<div class="verdict ${br ? 'bad' : 'ok'}">${br ? '！ 호환 깨짐 (Breaking) — 새 버전 필요' : '＋ 호환 유지 (Non-breaking) — 버전 그대로'}</div><p style="margin:0">${br ? '이 필드·형식을 믿고 있던 이미 배포된 앱이 바로 고장 난다.' : '기존 클라이언트는 모르는 것을 무시하면 그만이다 — <b>Tolerant Reader</b>.'}</p>`; } } },
    H.key('“Tolerant Reader” 원칙<br>클라이언트는 모르는 필드를 무시하고<br>서버는 새 필드를 추가만 한다<br>→ 대부분의 변경은 버전 없이 배포할 수 있다.'),
  ] },

{ id: 'w5.openapi', title: 'OpenAPI & Swagger — 계약을 문서로', slides: 'S34–S35',
  blocks: [
    `<p>사람도, 코드 생성기도, AI Agent도 <b>같은 명세</b>를 읽는다.</p>`,
    H.pre(`openapi: 3.1.0
info: {title: Student API, version: 1.0.0}
paths:
  /v1/students/{sid}:
    get:
      summary: 학생 단건 조회
      parameters:
        - name: sid
          in: path
          required: true
          schema: {type: integer}
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Student"
        "404": {description: Not found}`),
    T(['FastAPI 코드(타입 힌트 + Pydantic)에서 자동 생성', '용도'], [['/openapi.json', '명세 원본'], ['/docs', 'Swagger UI — 브라우저에서 바로 테스트'], ['/redoc', 'ReDoc — 읽기용 문서'], ['Codegen', 'TS · Kotlin 클라이언트 자동 생성'], ['AI Tool', 'LLM Function calling 정의로 변환']], { mono: [0] }),
    T(['', 'Code-first', 'Design-first'], [['순서', '코드 → 명세', '명세 → 코드'], ['특징', 'FastAPI 방식. 빠르지만 구현에 끌려가기 쉬움', '팀 간 계약을 먼저 합의. 대규모 협업에 유리']]),
    H.key('Swagger = 도구 이름, OpenAPI = 명세 표준 이름. “Swagger 문서 주세요”는 보통 openapi.json(또는 /docs 링크)을 달라는 뜻이다.'),
    { h3: 'Swagger UI(/docs) 사용법 (S35)' },
    `<ol><li><b>서버 실행 후 /docs 열기</b> — uvicorn 실행 → 브라우저에서 <code>localhost:8000/docs</code></li><li><b>endpoint 펼치기</b> — 색으로 메서드 구분: GET 파랑 · POST 초록 · DELETE 빨강</li><li><b>Try it out 클릭</b> — 입력 칸이 활성화되고 Schema 예시가 미리 채워져 있다</li><li><b>값 입력 후 Execute</b> — Path 파라미터(sid), Body(JSON)를 채워 실행</li><li><b>응답 확인</b> — 상태 코드 · 응답 헤더 · Body · 같은 요청의 curl 명령까지</li><li><b>실패도 일부러 해 보기</b> — grade=7, 없는 sid → 422 / 404 응답 모양 확인</li></ol>`,
    H.warn('Swagger UI는 API 서버 자신이 제공하는 페이지(<b>같은 Origin</b>)라서 CORS 문제가 없다. 그래서 “Swagger에선 되는데 내 프론트에선 안 돼요”가 생긴다 (5.21).'),
  ] },

{ id: 'w5.stateless', title: 'Stateless — 왜 Scale-out과 직결되는가', slides: 'S36–S37',
  blocks: [
    `<p>요청 하나만 보고 처리할 수 있어야, <b>어느 서버가 받아도 된다</b>. “늘 먹던 걸로요”가 통하지 않는 카페가 오히려 확장에 강하다.</p>`,
    { lab: { title: 'Load Balancer가 두 번째 요청을 다른 서버로 보내면', tag: '트레이스', init: { mode: 'stateful' },
      ctl: [{ k: 'mode', type: 'select', label: '서버 설계', opts: [['stateful', 'Stateful — 서버 메모리에 “현재 페이지”를 기억'], ['stateless', 'Stateless — 요청이 필요한 정보를 모두 가짐']] }],
      out: st => `<div class="result">${st.mode === 'stateful' ? '단골을 기억하는 바리스타 A만 주문을 안다 → A가 쉬거나 B에게 배정되면 주문 실패' : '주문서(요청)에 모든 정보 → 어느 바리스타(서버)든 처리 → 손님이 몰리면 바리스타를 더 투입(Scale-out)'}</div><div class="slot"></div>`,
      after: (st, out) => { const sf = st.mode === 'stateful';
        slot(out, { title: sf ? 'Stateful — 서버 A 메모리 세션' : 'Stateless — 커서·토큰을 요청에 포함', rowH: 80, nodeW: 140,
          nodes: [{ id: 'c', label: 'Client', icon: 'laptop', x: 0, y: 1 }, { id: 'lb', label: 'Load Balancer', icon: 'lb', x: .38, y: 1 }, { id: 'a', label: 'Server A', sub: sf ? 'session: page=?' : '', icon: 'server', x: .76, y: 0 }, { id: 'b', label: 'Server B', icon: 'server', x: .76, y: 1 }, { id: 'cc', label: 'Server C', icon: 'server', x: .76, y: 2 }, { id: 'db', label: 'DB · Redis', sub: '공유 상태', icon: 'db', x: 1, y: 1 }],
          links: [['c', 'lb'], ['lb', 'a'], ['lb', 'b'], ['lb', 'cc'], ['a', 'db'], ['b', 'db'], ['cc', 'db']],
          events: sf ? [
            { from: 'c', to: 'a', path: ['c', 'lb', 'a'], label: 'GET /students (1쪽)', color: 'l7', state: { a: 'session[page]=1' }, pkt: [req('GET /students', [['Cookie', 'sid=abc (A 메모리 세션)']])], say: 'LB가 첫 요청을 A로 보냈다. A는 이 손님이 “1쪽을 봤다”를 <b>자기 메모리</b>에 기억한다.' },
            { from: 'c', to: 'b', path: ['c', 'lb', 'b'], label: 'GET /students/next', color: 'bad', state: { b: '세션 없음 → ?' }, pkt: [req('GET /students/next', [['Cookie', 'sid=abc']])], say: '두 번째 요청을 LB가 <b>B</b>로 보냈다. B는 “다음 페이지”가 무엇인지 모른다 → 실패. 해결하려면 Sticky session이 필요하고, A가 죽으면 상태도 사라진다.' },
            { from: 'a', to: 'a', label: 'A 장애', off: ['a'], say: 'A가 쉬는 날(서버 장애) — A 메모리의 세션도 함께 사라진다. 손님이 늘어도 바리스타를 쉽게 늘릴 수 없다.' },
          ] : [
            { from: 'c', to: 'a', path: ['c', 'lb', 'a'], label: 'GET ?cursor=…&limit=20', color: 'l7', pkt: [req('GET /students?cursor=20&limit=20', [['Authorization', 'Bearer eyJ…']])], say: '요청에 <b>커서와 토큰</b>이 들어 있다 — 주문서에 모든 정보.' },
            { from: 'c', to: 'b', path: ['c', 'lb', 'b'], label: 'GET ?cursor=40&limit=20', color: 'ok', pkt: [req('GET /students?cursor=40&limit=20', [['Authorization', 'Bearer eyJ…']])], say: 'LB가 B로 보내도 문제없다. B는 요청만 보고 다음 20개를 준다. 공유 상태는 <b>DB·Redis</b>(가게 공용 장부)에 있다.' },
            { from: 'c', to: 'cc', path: ['c', 'lb', 'cc'], label: 'GET ?cursor=60&limit=20', color: 'ok', off: ['a'], pkt: [req('GET /students?cursor=60&limit=20', [['Authorization', 'Bearer eyJ…']])], say: 'A가 빠져도 C가 이어서 처리한다. 서버는 언제든 늘리고 줄일 수 있다 (Week 9~12 Cloud).' },
          ] }); } } },
    T(['카페', 'API 서버', '예시'], [['단골을 기억하는 바리스타의 머릿속', '서버 메모리에 저장된 세션 상태', 'session["page"] = 3'], ['주문서에 적힌 내용', '요청에 담긴 정보 (경로 · 쿼리 · Body)', '?cursor=40&limit=20'], ['회원카드', '인증 토큰', 'Authorization: Bearer eyJ…'], ['가게 공용 장부 (POS)', '공유 저장소 — DB · Redis', '모든 서버가 같은 DB를 본다']], { mono: [2] }),
    H.key('Stateless ≠ 데이터가 없다. 가게 장부(DB)는 있어도 된다 — 다만 “이 손님이 지금 뭘 하던 중인지”(session state)를 서버 메모리에 두지 않는다.'),
  ] },

{ id: 'w5.auth', title: 'API 인증 방식과 토큰 흐름', slides: 'S38–S39',
  blocks: [
    T(['방식', '요청 예시', '주로 쓰는 곳', '주의점'], [['API Key', 'X-API-Key: sk_live_8f2…', '서버 ↔ 서버, 공개 데이터 API', '브라우저 코드에 넣으면 누구나 볼 수 있음'], ['Session Cookie', 'Cookie: sid=abc', '같은 사이트의 웹 앱', 'CSRF 대비 SameSite · cross-origin이면 credentials 설정'], ['Bearer (JWT)', 'Authorization: Bearer eyJ…', 'SPA · 모바일 앱 · 마이크로서비스', '만료 짧게 + refresh, 저장 위치(XSS) 고민'], ['OAuth 2.0', 'Bearer (Access Token)', '“구글로 로그인”, 제3자 권한 위임', '토큰 발급 흐름이 별도 — 이후 요청은 Bearer']], { mono: [1] }),
    `<p><b>토큰 인증 = 놀이공원 손목밴드.</b> 매표소에서 한 번 신분을 확인하면 밴드를 주고, 이후 놀이기구마다 밴드만 보여 주면 된다. 폐장 시간이 지나면 밴드는 무효다.</p>`,
    { trace: { mode: 'ladder', title: '로그인 → 토큰 → 요청 → 만료', lanes: [{ id: 'c', label: 'Client', sub: '학생 2026001' }, { id: 's', label: 'API' }], rowH: 54,
      events: [
        { from: 'c', to: 's', label: '① POST /login', color: 'l7', pkt: [req('POST /login', [['Body', '{"id":"2026001","pw":"••••"}']])], say: '<b>매표소에서 신분 확인</b> — 아이디·비밀번호는 이때 한 번만.' },
        { from: 's', to: 'c', label: '② 200 access_token', color: 'ok', pkt: [res('200 OK', [['Body', '{"access_token":"eyJ…","expires_in":900}']])], say: '<b>손목밴드 발급</b> — 15분(900초) 유효한 토큰.' },
        { from: 'c', to: 's', label: '③ GET /v1/grades', color: 'l7', pkt: [req('GET /v1/grades', [['Authorization', 'Bearer eyJ…']])], say: '<b>놀이기구마다 밴드 제시</b> — Authorization 헤더.' },
        { from: 's', to: 'c', label: '④ 200 [성적 목록]', color: 'ok', pkt: [res('200 OK', [['Body', '[{"course":"NET301","grade":"A"}]']])], say: '서버는 무엇을 기억하나? <b>아무것도</b> — 토큰 안에 사용자 정보와 서명이 들어 있어 서명만 검사한다. 그래서 어느 서버가 받아도 된다(Stateless).' },
        { from: 'c', to: 's', label: '성적 입력 시도', color: 'l7', pkt: [req('POST /v1/grades', [['Authorization', 'Bearer eyJ… (학생 권한)']])], say: '같은 토큰으로 교수만 가능한 성적 입력을 시도하면?' },
        { from: 's', to: 'c', label: '403 Forbidden', color: 'bad', pkt: [res('403 Forbidden', [['Body', '{"title":"professor only"}']])], say: '<b>403</b> — 신원은 확인됐지만 권한 없음. 다시 로그인해도 같다.' },
        { kind: 'gap', text: '— 15분 후 —', say: '폐장 시간이 지났다.' },
        { from: 'c', to: 's', label: '⑤ GET /v1/grades', color: 'l7', pkt: [req('GET /v1/grades', [['Authorization', 'Bearer eyJ… (만료)']])], say: '만료된 밴드로 다시 입장 시도.' },
        { from: 's', to: 'c', label: '⑥ 401 token expired', color: 'bad', pkt: [res('401 Unauthorized', [['WWW-Authenticate', 'Bearer'], ['Body', '{"title":"token expired"}']])], say: '<b>401</b> — 인증 실패. 다시 로그인하거나 refresh 토큰으로 재발급받으면 해결될 수 있다.' },
      ] } },
    H.key('401 vs 403 — “누구세요?” vs “당신은 안 됩니다”<br>401 = 인증(Authentication) 실패 · 토큰이 없거나 만료 · 다시 로그인하면 해결될 수 있다<br>403 = 인가(Authorization) 실패 · 신원은 확인됐지만 권한 없음 · 다시 로그인해도 같다'),
    H.warn('밴드를 잃어버리면? 토큰을 가진 사람은 누구든 그 사용자로 인정된다 → 만료 시간을 짧게, HTTPS로만, URL에 넣지 않는다. 그리고 <b>Authorization 헤더를 붙이는 순간 cross-origin 요청은 Preflight 대상</b>이 된다 → 인증과 CORS는 함께 설정해야 한다 (5.23).'),
  ] },

{ id: 'w5.origin', title: 'Origin과 Same-Origin Policy', slides: 'S40–S42',
  blocks: [
    `<p>브라우저 보안의 경계 단위 = <b>Origin = scheme + host + port</b>. path · query는 Origin에 포함되지 않는다. 아파트로 보면 <b>scheme = 단지, host = 동, port = 호수</b> — 셋이 모두 같아야 “같은 집”이다.</p>`,
    { lab: { title: 'Origin 비교기', init: { a: 'http://localhost:5500', b: 'http://localhost:8000/students' },
      ctl: [{ k: 'a', type: 'text', label: '페이지(호출하는 쪽)', w: 240 }, { k: 'b', type: 'text', label: 'fetch 대상 URL', w: 300 }, { type: 'btns', items: ['http://localhost:5500/api/students', 'http://localhost:8000/students', 'http://127.0.0.1:5500/students', 'https://localhost:5500/students', 'http://api.localhost:5500/students', 'http://localhost:80/x'].map(v => ({ label: v.replace('http://', '').replace('https://', 's:'), act: st => st.b = v })) }],
      out: st => { const A = parseOrigin(st.a), B = parseOrigin(st.b); if (!A || !B) return '<span class="err">scheme://host[:port] 형식으로 입력하세요</span>';
        const cmp = [['scheme (단지)', A.scheme, B.scheme], ['host (동)', A.host, B.host], ['port (호수)', A.port + (A.explicit ? '' : ' (기본값)'), B.port + (B.explicit ? '' : ' (기본값)')]];
        const diff = cmp.filter(([, x, y], i) => i === 2 ? A.port !== B.port : x !== y).map(r => r[0].split(' ')[0]);
        return T(['요소', '페이지', '대상', ''], cmp.map(([k, x, y], i) => [k, x, y, (i === 2 ? A.port === B.port : x === y) ? '<span class="cok">같음</span>' : '<span class="cbad">다름</span>']), { mono: [1, 2] }) +
          `<div class="verdict ${diff.length ? 'bad' : 'ok'}">${diff.length ? `Cross-origin — ${diff.join(' · ')} 다름` : 'Same-origin — 세 요소 모두 같음'}</div>` +
          `<p style="margin:0">${diff.length ? '요청은 나간다. 하지만 서버가 Access-Control-Allow-Origin으로 허락하지 않으면 <b>JS가 응답을 읽을 수 없다</b>.' : 'CORS 설정 없이도 응답을 읽을 수 있다.'}${A.host !== B.host && /^(localhost|127\.0\.0\.1)$/.test(A.host) && /^(localhost|127\.0\.0\.1)$/.test(B.host) ? '<br><b>localhost와 127.0.0.1은 같은 컴퓨터지만 다른 Origin이다</b> — 브라우저는 이름(문자열)으로 비교한다. 실습에서 가장 흔한 CORS 혼란의 원인 1위.' : ''}${!A.explicit || !B.explicit ? '<br>포트를 생략하면 http = 80, https = 443으로 본다.' : ''}</p>`; } } },
    T(['다른 집에 대해', '가능?', '웹에서'], [['편지 보내기', '<span class="cok">가능</span>', '요청 보내기 — &lt;form&gt;, &lt;img&gt;, fetch 모두 일단 나간다'], ['다른 집 우편함 열어 읽기', '<span class="cbad">금지</span>', '응답을 JS가 읽기 — 기본적으로 브라우저가 막는다 (<b>SOP</b>)'], ['그 집이 “읽어도 돼요” 허락', '<span class="cok">가능</span>', '서버가 Access-Control-Allow-Origin으로 허락 = <b>CORS</b>']]),
    H.key('Same-Origin Policy는 요청을 막는 것이 아니라 <b>다른 Origin의 응답을 JS가 “읽는 것”</b>을 막는다. CORS는 이 기본 금지를 서버가 “이 Origin은 읽어도 된다”고 풀어 주는 예외 규칙이다.'),
    { h3: 'CORS는 왜 “브라우저”에서만 일어나는가 (S42)' },
    { trace: { title: 'SOP가 없다면', sub: '은행에 로그인된 사용자가 악성 페이지를 연 경우', rowH: 90,
      nodes: [{ id: 'u', label: '사용자 브라우저', sub: 'bank.com 쿠키 보유', icon: 'browser', x: .45, y: 0 }, { id: 'e', label: 'evil.com', sub: '악성 페이지 JS', icon: 'globe', x: 0, y: 1 }, { id: 'bk', label: 'bank.com API', icon: 'server', x: 1, y: 1 }],
      links: [['e', 'u'], ['u', 'bk']],
      events: [
        { from: 'e', to: 'u', label: '① 악성 스크립트 실행', color: 'bad', say: '사용자가 evil.com을 열자 그 페이지의 JS가 사용자 브라우저 안에서 실행된다.' },
        { from: 'u', to: 'bk', label: '② fetch(balance) + 쿠키', color: 'l7', pkt: [req('GET /balance', [['Origin', 'https://evil.com'], ['Cookie', 'session=… (자동 첨부)']])], say: '브라우저는 bank.com 요청에 <b>쿠키를 자동으로 첨부</b>한다.' },
        { from: 'bk', to: 'e', path: ['bk', 'u', 'e'], label: '③ 잔액 → evil.com이 읽음?', color: 'bad', drop: true, pkt: [res('200 OK', [['Body', '{"balance": 1250000}']])], say: 'SOP가 없다면 evil.com이 잔액을 읽는다. <b>SOP가 이 마지막 단계(응답 읽기)를 막는다</b>. 그래서 SOP는 서버를 지키는 장치가 아니라 <b>브라우저 안의 사용자</b>를 지키는 장치다.' },
      ] } },
    T(['호출 주체', 'CORS 적용?'], [['브라우저 fetch / XHR', '<b>적용</b>'], ['curl · Postman', '무관'], ['Python requests', '무관'], ['서버 → 서버 호출', '무관'], ['Swagger UI (같은 Origin)', '해당 없음']]),
    H.warn('“curl로는 되는데 브라우저에서만 안 돼요” → 거의 확실히 CORS. 그래서 CORS는 보안 장치가 아니라 “완화” 장치다 — <b>서버 접근 제어는 CORS가 아니라 인증·인가로</b> 해야 한다.'),
  ] },

{ id: 'w5.cors', title: 'CORS 기본 흐름 — Simple Request', slides: 'S43–S44',
  blocks: [
    `<p>브라우저가 Origin을 알리고, 서버가 허용 여부를 응답 헤더로 답한다. 아파트 경비실로 보면 <b>브라우저 = 경비원</b>, <b>CORS 헤더 = 택배 송장의 “전달 허용” 스티커</b>다.</p>`,
    { lab: { title: '송장에 스티커가 있을 때와 없을 때', tag: '트레이스', init: { ok: true },
      ctl: [{ k: 'ok', type: 'toggle', label: '서버가 Access-Control-Allow-Origin 을 붙인다' }],
      out: st => `<div class="slot"></div>`,
      after: (st, out) => slot(out, { mode: 'ladder', title: st.ok ? '허용된 경우' : '헤더가 없는 경우', side: 110,
        lanes: [{ id: 'js', label: 'JS', sub: '주민 · 5500호' }, { id: 'b', label: 'Browser', sub: '경비원' }, { id: 'api', label: 'API', sub: '8000호' }],
        tables: [{ id: 'db', title: '서버 DB', cols: ['상태'], rows: [['학생 2명']] }],
        events: [
          { from: 'js', to: 'b', label: 'fetch(":8000/v1/students")', color: 'l7', say: '① 주민(JS)이 “8000호 물건 받아 줘”.' },
          { from: 'b', to: 'api', label: 'POST /v1/students', color: 'l7', pkt: [req('POST /v1/students', [['Origin', 'http://localhost:5500'], ['Content-Type', 'text/plain'], ['Body', 'name=Kim']])], say: '② 경비원(브라우저)이 요청을 전달하며 “5500호에서 왔어요”(<b>Origin 헤더</b>)를 붙인다. Origin은 브라우저가 자동으로 붙이며 <b>JS가 조작할 수 없다</b>.' },
          { from: 'api', to: 'api', label: '처리 · DB 저장', tables: { db: [['학생 3명 (Kim 추가됨)']] }, say: '서버는 요청을 받아 <b>처리했다</b>.' },
          { from: 'api', to: 'b', label: '200 OK', color: st.ok ? 'ok' : 'l1', pkt: [res('200 OK', st.ok ? [['Access-Control-Allow-Origin', 'http://localhost:5500'], ['Body', '{"id":3}']] : [['Body', '{"id":3}']])], say: st.ok ? '③④ 택배 도착 — 송장에 <b>“5500호 수령 허용”</b> 스티커(Access-Control-Allow-Origin)가 있다.' : '③④ 택배 도착 — 그런데 송장에 <b>허용 스티커가 없다</b>(Access-Control-Allow-Origin 헤더 없음).' },
          st.ok ? { from: 'b', to: 'js', label: 'Origin 일치 → 응답 전달 ✓', color: 'ok', say: '경비원이 주민에게 택배를 전달 → <b>JS가 응답을 읽는다</b>. 판단은 브라우저가 한다 — 서버는 헤더로 “의견”만 낸다.' }
                : { from: 'b', to: 'js', label: 'TypeError: Failed to fetch ✕', color: 'bad', drop: true, say: '경비원이 전달 거부 → Console에 <b>CORS 오류</b>. 하지만 <b>택배는 이미 도착했다 = 서버는 요청을 처리했다</b>(DB 표를 보라). Network 탭에는 200이 찍혀 있는 경우가 많다.' },
        ] }) } },
    H.key('차단돼도 요청은 서버에 도달했다 — 부작용이 있는 요청이면 이미 실행됐다. 그래서 부작용이 클 수 있는 요청(PUT · DELETE · JSON POST)은 실제 요청 전에 “보내도 되는지” 먼저 묻는다 → <b>Preflight</b> (5.23).'),
    H.note('경비원은 이 아파트(브라우저) 안에만 있다 → 단지 밖에서 직접 받는 사람(curl · Postman · 서버)은 스티커가 없어도 그냥 받는다. 그래서 CORS 오류를 고치는 곳은 프론트엔드 코드가 아니라 “송장을 붙이는 쪽” — <b>서버의 CORS 설정</b>이다.'),
  ] },

{ id: 'w5.preflight', title: 'Simple vs Preflight — OPTIONS로 먼저 묻기', slides: 'S45–S47',
  blocks: [
    `<p>아래 조건을 <b>모두</b> 만족해야 Simple — 하나라도 벗어나면 Preflight. 작은 일(편지 넣기)은 그냥 하고, 큰 공사(벽 뚫기)는 관리사무소에 먼저 허가를 받는다.</p>`,
    T(['항목', 'Simple 허용 범위', '이런 요청은 Preflight 발생'], [['Method', 'GET · HEAD · POST', 'PUT · PATCH · DELETE'], ['Content-Type', 'text/plain<br>application/x-www-form-urlencoded<br>multipart/form-data', '<b>application/json</b> ← REST API 대부분!'], ['요청 헤더', 'Accept, Accept-Language, Content-Language, Content-Type(위 3종) 등 안전 목록만', 'Authorization, X-API-Key, X-Request-Id 등 커스텀 헤더']]),
    { lab: { title: 'fetch 만들기 — Preflight가 생길까?', tag: '트레이스', init: { m: 'PATCH', ct: 'application/json', auth: true, allow: true, cached: false },
      ctl: [{ k: 'm', type: 'select', label: 'method', opts: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].map(x => [x, x]) }, { k: 'ct', type: 'select', label: 'Content-Type', opts: [['none', '(없음)'], ['text/plain', 'text/plain'], ['application/x-www-form-urlencoded', 'x-www-form-urlencoded'], ['multipart/form-data', 'multipart/form-data (FormData)'], ['application/json', 'application/json']] }, { k: 'auth', type: 'toggle', label: 'Authorization 헤더' }, { k: 'allow', type: 'toggle', label: '서버가 이 Origin·메서드·헤더를 허용' }, { k: 'cached', type: 'toggle', label: '10분 안에 같은 요청을 이미 했다 (Max-Age)' }],
      out: st => { const why = [];
        if (!['GET', 'HEAD', 'POST'].includes(st.m)) why.push(`${st.m} 메서드`);
        if (st.ct === 'application/json') why.push('JSON Content-Type');
        if (st.auth) why.push('Authorization 헤더');
        const pre = why.length > 0;
        return `<div class="verdict ${pre ? 'bad' : 'ok'}">${pre ? `Preflight 발생 — ${why.join(' · ')}` : 'Simple Request — Preflight 없음'}</div>${pre && st.cached && st.allow ? '<p style="margin:0 0 6px">Max-Age 캐시가 살아 있어 이번에는 OPTIONS를 다시 보내지 않는다 (RTT 한 번 절약).</p>' : ''}<div class="slot"></div>`; },
      after: (st, out) => { const hs = []; if (st.ct !== 'none') hs.push('content-type'); if (st.auth) hs.push('authorization');
        const pre = !['GET', 'HEAD', 'POST'].includes(st.m) || st.ct === 'application/json' || st.auth; const ask = pre && !(st.cached && st.allow);
        const real = { from: 'b', to: 'a', label: `${st.m} /v1/students/10`, color: 'l7', pkt: [req(`${st.m} /v1/students/10`, [['Origin', 'http://localhost:5500'], ...(st.auth ? [['Authorization', 'Bearer eyJ…']] : []), ...(st.ct !== 'none' ? [['Content-Type', st.ct]] : [])])], say: pre ? '② 허가증이 있을 때만 <b>진짜 요청</b>이 나간다.' : 'Simple Request는 묻지 않고 바로 보낸다 — HTML &lt;form&gt;이 원래 보낼 수 있던 요청이기 때문.' };
        const ev = [];
        if (ask) {
          ev.push({ from: 'b', to: 'a', label: 'OPTIONS /v1/students/10', color: 'l3', pkt: [req('OPTIONS /v1/students/10', [['Origin', 'http://localhost:5500'], ['Access-Control-Request-Method', st.m], ...(hs.length ? [['Access-Control-Request-Headers', hs.join(', ')]] : [])])], say: `① <b>문의서 제출</b> — “${st.m} 공사를${hs.length ? ' ' + hs.join(' · ') + ' 장비로' : ''} 해도 될까요?” 요청 쪽 헤더(Access-Control-Request-*)는 브라우저가 자동으로 붙인다.` });
          ev.push(st.allow ? { from: 'a', to: 'b', label: '204 허가', color: 'ok', pkt: [res('204 No Content', [['Access-Control-Allow-Origin', 'http://localhost:5500'], ['Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE'], ['Access-Control-Allow-Headers', 'authorization, content-type'], ['Access-Control-Max-Age', '600']])], say: '<b>허가증 발급</b> — 허용 Origin · 메서드 · 헤더, 그리고 <b>유효기간 600초</b>(Max-Age). 그동안은 다시 묻지 않는다. CORS middleware가 handler까지 가지 않고 바로 답한다.' }
                            : { from: 'a', to: 'b', label: '400 / 허용 헤더 없음', color: 'bad', pkt: [res('400 Bad Request', [['Body', 'Disallowed CORS origin']])], say: '허가가 안 났다(OPTIONS 응답이 404 · 405 · 401 · 400이거나 허용 헤더 없음).' });
        }
        if (!pre || st.allow) { ev.push(real); ev.push({ from: 'a', to: 'b', label: '200 OK', color: 'ok', pkt: [res('200 OK', [['Access-Control-Allow-Origin', 'http://localhost:5500'], ['Body', '{"id":10,"grade":4}']])], say: '실제 응답에도 Access-Control-Allow-Origin이 있어야 JS가 읽는다.' }); }
        else ev.push({ kind: 'gap', text: '— 실제 요청은 아예 전송되지 않는다 —', say: '<b>Preflight 실패 = 실제 요청 없음</b>. 공사는 시작조차 안 됐다 → Network 탭에 ' + st.m + ' 요청 자체가 안 보이거나 실패로 표시된다. Simple request와 달리 <b>부작용이 생기기 전에</b> 막는다.' });
        slot(out, { mode: 'ladder', title: ask ? 'Preflight → 실제 요청' : pre ? 'Preflight 캐시 사용' : 'Simple Request', lanes: [{ id: 'b', label: 'Browser', sub: 'localhost:5500' }, { id: 'a', label: 'API', sub: 'localhost:8000' }], events: ev }); } } },
    T(['요청 예시 (cross-origin)', 'Preflight?', '이유'], [['fetch(url) — 기본 GET', 'No', 'Simple 조건 충족'], ['fetch(url, {method:"POST", body: formData})', 'No', 'multipart/form-data'], ['fetch(url, {method:"POST", headers:{"Content-Type":"application/json"}})', '<b>Yes</b>', 'JSON Content-Type'], ['fetch(url, {headers:{Authorization:"Bearer …"}})', '<b>Yes</b>', 'Authorization 헤더'], ['fetch(url, {method:"DELETE"})', '<b>Yes</b>', 'DELETE 메서드']], { mono: [0] }),
    H.key('“Simple” 조건 = HTML &lt;form&gt;이 원래 보낼 수 있던 요청. CORS 이전부터 가능했던 요청은 그대로 두고, 새로 가능해진 요청만 사전 확인을 받는다.'),
    H.note('Max-Age: Preflight 결과 캐시. 600초 동안은 같은 요청에 OPTIONS를 다시 보내지 않는다. 브라우저마다 상한이 있다(Chrome 2시간). DevTools에서는 OPTIONS 행을 먼저 보라.'),
  ] },

{ id: 'w5.headers', title: 'CORS 응답 헤더와 allow_origins=["*"]의 함정', slides: 'S48–S49',
  blocks: [
    T(['헤더', '등장', '의미', '예시'], [['Access-Control-Allow-Origin', '모든 응답', '읽기를 허용할 Origin (하나 또는 *)', 'http://localhost:5500'], ['Access-Control-Allow-Methods', 'Preflight', '허용 메서드 목록', 'GET, POST, PATCH, DELETE'], ['Access-Control-Allow-Headers', 'Preflight', '허용 요청 헤더', 'content-type, authorization'], ['Access-Control-Max-Age', 'Preflight', 'Preflight 결과 캐시 시간(초)', '600'], ['Access-Control-Allow-Credentials', '모든 응답', '쿠키·인증정보 포함 요청 허용', 'true'], ['Access-Control-Expose-Headers', '실제 응답', 'JS가 읽을 수 있는 추가 응답 헤더', 'Location, X-Total-Count'], ['Vary: Origin', '실제 응답', 'Origin별로 응답이 다름 → 캐시 분리', 'Vary: Origin']], { mono: [0, 3] }),
    H.cards([['Expose-Headers를 빼먹으면', '<code>r.headers.get("Location")</code>이 null<br>— 201 응답의 새 URI를 JS가 못 읽는다.', 'L4'], ['Vary: Origin을 빼먹으면', 'CDN이 A 사이트용 응답을 캐시해<br>B 사이트에도 주는 혼선이 생긴다.', 'L4']]),
    H.note('요청 측 헤더(Origin, Access-Control-Request-*)는 브라우저가 자동으로 붙이고, 응답 측 헤더(Access-Control-Allow-*)는 서버(또는 프록시)가 붙인다.'),
    { h3: 'AI가 가장 자주 생성하는 CORS 설정 — 그대로 배포해도 될까? (S49)' },
    { fig: `<div class="pair"><div><h4 class="cbad">✕ 위험 — AI가 흔히 생성하는 코드</h4>${H.pre('app.add_middleware(\n    CORSMiddleware,\n    allow_origins=["*"],\n    allow_credentials=True,\n    allow_methods=["*"],\n    allow_headers=["*"],\n)')}</div><div><h4 class="cok">○ 권장 — 명시적 허용 목록</h4>${H.pre('ORIGINS = os.getenv("CORS_ORIGINS", "").split(",")\napp.add_middleware(\n    CORSMiddleware,\n    allow_origins=ORIGINS,   # 환경별로 다르게\n    allow_credentials=True,\n    allow_methods=["GET","POST","PATCH","DELETE"],\n    allow_headers=["Content-Type","Authorization"],\n    expose_headers=["Location"], max_age=600)')}</div></div>` },
    `<ol><li><b>규격 충돌</b> — 쿠키를 포함한 요청(credentials)에 대해 <code>Allow-Origin: *</code>는 브라우저가 거부한다. “*” + credentials는 원래 성립하지 않는 조합.</li><li><b>Origin 반사</b> — 이를 피하려고 일부 프레임워크·코드는 요청의 Origin을 그대로 되돌려 준다 → 사실상 “모든 사이트 + 쿠키 허용”.</li><li><b>결과</b> — 악성 사이트가 로그인한 사용자의 브라우저로 API를 호출하고 응답까지 읽을 수 있다 (5.21의 evil.com 시나리오).</li></ol>`,
    H.key('“*”가 괜찮은 경우: 인증 없이 누구나 읽어도 되는 공개 API(날씨·공공데이터). 로그인·개인정보가 있다면 반드시 허용 Origin을 열거한다.'),
  ] },

{ id: 'w5.debug', title: 'CORS 오류 읽기 · 해결 · 아예 없애는 구조', slides: 'S50–S52',
  blocks: [
    { lab: { title: 'Console 메시지 → 원인 → 조치', init: { m: 'noacao' },
      ctl: [{ k: 'm', type: 'select', label: 'Console 메시지', opts: Object.entries(CORS_MSG).map(([k, v]) => [k, v[0].length > 60 ? v[0].slice(0, 58) + '…' : v[0]]) }],
      out: st => { const [msg, cause, fix] = CORS_MSG[st.m]; return `<div class="result" style="font-size:14px;color:var(--bad)">✕ ${esc(msg)}</div>` + T(['원인', '조치'], [[cause, fix]]); } } },
    H.warn('함정: 서버에서 500 오류가 나면 오류 응답에 CORS 헤더가 빠지는 경우가 있다 → 브라우저에는 “CORS 오류”로 보이지만 진짜 원인은 서버 예외. 서버 로그를 함께 본다.'),
    { h3: '실제로 따라하기 — localhost vs 127.0.0.1 (S51)' },
    `<ol><li><b>Console 읽기</b> — <code>Access to fetch at 'http://localhost:8000/v1/students' from origin 'http://127.0.0.1:5500' has been blocked by CORS policy: Response to preflight request doesn't pass access control check</code><br>“from origin” 뒤의 주소를 본다 → 127.0.0.1:5500에서 요청했다</li><li><b>Network 탭 보기</b> — students (preflight) <b>400</b>, students (fetch) <b>CORS error</b><br>OPTIONS(preflight) 응답이 400 → 서버가 이 Origin을 거절했다. preflight 행을 클릭해 Response Headers에 Access-Control-Allow-Origin이 있는지 본다</li><li><b>원인 찾기</b> — <code>allow_origins=["http://localhost:5500"]</code>인데 요청 Origin은 <code>http://127.0.0.1:5500</code> → 목록에 없음!<br>허용 목록과 실제 Origin을 글자 단위로 비교: scheme · host · port · 끝 슬래시</li><li><b>수정 · 재확인</b> — 목록에 127.0.0.1:5500 추가 후 서버 재시작 → OPTIONS 200 → POST 201 ✓<br>또는 브라우저 주소를 localhost:5500으로 통일 — <b>원인을 없애는 쪽이 더 좋다</b></li></ol>`,
    H.note('FastAPI의 CORSMiddleware는 허용되지 않은 Origin의 preflight에 400을 돌려준다. Origin 끝에 슬래시를 붙이면 안 된다 — <code>"http://localhost:5500/"</code> ✕ (브라우저가 보내는 Origin에는 경로가 없다).'),
    H.key('순서를 지키면 CORS는 어렵지 않다<br>Console에서 “어느 Origin이 무엇 때문에”<br>→ Network에서 “어느 요청이”<br>→ 설정에서 “무엇이 빠졌나”'),
    { h3: 'CORS를 “없애는” 아키텍처 (S52)' },
    T(['', 'A. CORS 허용', 'B. 개발 서버 Proxy', 'C. Reverse Proxy 통합'], [['구조', '서로 다른 Origin 유지<br>app.com → api.com', 'Vite · Next dev server<br>localhost:5173 /api → localhost:8000', '같은 Origin으로 서비스<br>Nginx app.com: / → 정적파일, /api → FastAPI'], ['설정', '서버에 CORS 설정<br>Preflight RTT 발생', '<code>proxy {"/api": "http://localhost:8000"}</code>', '<code>location /api/ { proxy_pass http://api:8000/; }</code>'], ['적합', '공개 API, 여러 프론트가 하나의 API 사용', '로컬 개발 단계 (배포 환경과 다를 수 있음에 주의)', '실제 배포에서 가장 깔끔. Week 9~12 Cloud 구조로 연결']]),
    H.warn('B는 개발 편의, C는 운영 구조다. “개발 때는 proxy로 잘 됐는데 배포하니 CORS 오류”는 B와 A·C의 차이를 몰랐을 때 생긴다.'),
  ] },

{ id: 'w5.view', title: 'Architecture View · Design Choice', slides: 'S53–S54',
  blocks: [
    T(['구성요소', 'W5 개념', '장애 증상'], [['<b>Browser</b> · Frontend JS fetch()', 'Origin · SOP · Preflight 판단', 'CORS 오류 · Mixed Content'], ['<b>CDN</b> · 정적 파일, GET 캐시', 'Cache-Control · Vary: Origin', '오래된 응답 · 교차 캐시'], ['<b>Reverse Proxy</b> · TLS 종료, /api 라우팅', 'Same-origin 통합 (CORS 회피)', '502 · 504 · 리다이렉트'], ['<b>FastAPI</b> · Middleware, Router · Schema', 'CORS · 422 · Endpoint · 상태 코드', '404 · 405 · 422 · 500'], ['<b>Service</b> · 비즈니스 규칙', '409 · 403 · 멱등 처리', '409 · 403 · 로직 버그'], ['<b>Database</b> · 자원의 실제 상태', 'Resource / Representation 원천', '500 · 느린 응답 · N+1 쿼리']]),
    H.note('관찰 도구: DevTools Network(Origin·OPTIONS 행) · curl -i / -X OPTIONS · Swagger /docs · uvicorn 로그 · DB 쿼리 로그'),
    H.key('CORS는 Browser와 FastAPI middleware “양 끝”에서만 의미가 있다. 중간 계층(CDN·Proxy)이 헤더를 지우거나 캐시를 섞으면 양 끝 설정이 맞아도 실패한다.'),
    { h3: 'REST가 항상 정답은 아니다 — 통신 패턴에 맞는 스타일 (S54)' },
    T(['', 'REST (HTTP+JSON)', 'GraphQL', 'gRPC', 'WebSocket · SSE'], [['통신 모델', '자원 단위 요청·응답', '클라이언트가 쿼리로 필드 선택', '함수 호출(RPC)', '지속 연결, 서버 push'], ['전송 / 형식', 'HTTP/1.1~3 · JSON', 'HTTP POST · JSON', 'HTTP/2 · Protobuf(바이너리)', 'TCP 업그레이드 · 텍스트/바이너리'], ['강점', '단순, 캐시, 도구·인력 풍부', 'Over/Under-fetching 해결', '빠름, 강한 타입, 스트리밍', '실시간 양방향 / 단방향 스트림'], ['약점', '화면마다 여러 번 호출', 'HTTP 캐시 어려움, 복잡도', '브라우저 직접 호출 제약', '연결 관리, 확장 어려움'], ['적합 예', '공개 API, CRUD 서비스', '복잡한 화면의 모바일 앱', '마이크로서비스 내부', '채팅, 센서 대시보드, LLM 토큰 스트림(SSE)']]),
    H.key('판단 기준<br>외부 공개 · 다양한 클라이언트? → REST<br>서비스 간 내부 고속 호출? → gRPC<br>서버가 먼저 알려야 하나? → WebSocket / SSE<br>현실의 시스템은 섞어 쓴다 — 브라우저 ↔ Gateway는 REST, Gateway ↔ 내부 서비스는 gRPC, AI 응답 스트리밍은 SSE.'),
  ] },

{ id: 'w5.trouble', title: 'Common Failure Modes와 Troubleshooting', slides: 'S55–S56',
  blocks: [
    T(['증상', '흔한 원인', '확인 방법'], [['404 Not Found', '경로 오타, prefix(/v1, /api) 누락, 라우터 미등록', '/docs에서 실제 경로 확인, curl -i'], ['405 Method Not Allowed', '경로는 맞지만 해당 메서드 handler 없음 (PATCH 미구현)', '응답의 Allow 헤더 확인'], ['307 → 이후 실패', '끝 슬래시 자동 리다이렉트 — Body·헤더·Preflight 손실', 'curl -i 로 Location 확인, URL 통일'], ['422 Unprocessable', '필드명 불일치(camel/snake), 타입 오류, JSON 대신 form 전송', '응답 detail[].loc 읽기'], ['415 / 400', 'Content-Type 누락 → JSON으로 해석 안 됨', 'Request Headers에서 Content-Type 확인'], ['CORS 오류', 'Origin 미허용, 포트/127.0.0.1 차이, OPTIONS 실패', 'Network 탭 OPTIONS 행 + Console'], ['500 Internal', 'handler 예외, DB 연결, response_model 불일치', 'uvicorn 로그의 Traceback'], ['ERR_CONNECTION_REFUSED', '서버 미실행, 포트 다름, 0.0.0.0 vs 127.0.0.1 바인딩', 'ss -ltnp | grep 8000 (Week 3)']]),
    H.key('상태 코드가 있다 = TCP 연결·HTTP 파싱은 성공했다. 연결 오류와 HTTP 오류와 CORS 오류는 <b>서로 다른 계층</b>의 문제다.'),
    { h3: '브라우저에서 안 되면, 브라우저를 빼고 확인한다 (S56)' },
    `<ol><li><b>Reproduce</b> — curl로 같은 요청 <code>curl -i localhost:8000/v1/students</code></li><li><b>Observe</b> — 상태 코드 · 헤더 · Body</li><li><b>Locate</b> — 연결 / HTTP / CORS 구분</li><li><b>Check Config</b> — Preflight 직접 재현 <code>curl -i -X OPTIONS … -H "Origin: …"</code></li><li><b>Fix &amp; Verify</b> — 설정 수정 후 curl ✓ + DevTools ✓ 둘 다 확인</li></ol>`,
    { lab: { title: '판단표 — 어느 쪽 문제인가?', init: { curl: true, br: false, allow: true, screen: false },
      ctl: [{ k: 'curl', type: 'toggle', label: 'curl 성공' }, { k: 'br', type: 'toggle', label: '브라우저(fetch) 성공' }, { k: 'allow', type: 'toggle', label: 'curl -X OPTIONS 응답에 Allow-* 헤더 있음' }, { k: 'screen', type: 'toggle', label: '화면에 데이터가 제대로 나옴' }],
      out: st => { let v;
        if (!st.curl) v = ['bad', '서버 · 경로 · 포트 문제 (CORS 아님)', 'curl도 실패하면 브라우저 이전의 문제다 — 서버 실행, 경로 prefix, 포트·바인딩을 본다.'];
        else if (!st.br && !st.allow) v = ['bad', 'middleware 설정', 'OPTIONS에 Allow-* 헤더가 없다 → CORSMiddleware의 allow_origins · allow_headers를 본다.'];
        else if (!st.br) v = ['bad', 'CORS / Mixed Content', 'curl ✓ + 브라우저 ✕ → 거의 확실히 CORS (또는 HTTPS 페이지에서 HTTP API 호출). Console의 “from origin” 뒤 주소와 허용 목록을 글자 단위로 비교.'];
        else if (!st.screen) v = ['bad', '프론트 코드 (파싱 · 필드명)', '응답은 잘 왔다. JS가 필드명(camelCase/snake_case)을 잘못 읽거나 파싱을 잘못하는 중.'];
        else v = ['ok', '정상', '모든 단계 통과.'];
        return `<div class="verdict ${v[0]}">${v[1]}</div><p style="margin:0">${v[2]}</p>`; } } },
    H.pre(`$ curl -i -X OPTIONS http://localhost:8000/v1/students \\
    -H "Origin: http://localhost:5500" \\
    -H "Access-Control-Request-Method: POST" \\
    -H "Access-Control-Request-Headers: content-type"
HTTP/1.1 200 OK
access-control-allow-origin: http://localhost:5500
access-control-allow-methods: GET, POST, PATCH, DELETE
access-control-allow-headers: Content-Type, Authorization`),
    H.note('AI에게 “CORS 고쳐줘”라고 하기 전에, 위 curl 결과를 함께 주고 “어느 단계가 문제인지 먼저 진단해 줘”라고 요청하자.'),
  ] },

{ id: 'w5.lab', title: 'Hands-on Lab · AI 검증 · 과제', slides: 'S57–S59, S61',
  blocks: [
    { h3: 'Lab ① — FastAPI REST 서버 (/v1/students CRUD + CORS + Swagger)' },
    H.pre(`# main.py   $ uvicorn main:app --reload --port 8000
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from schemas import StudentIn, StudentOut, StudentPatch
app = FastAPI(title="Student API", version="1.0.0")
app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5500"],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"], expose_headers=["Location"])
db: dict[int, StudentOut] = {}; seq = 0

@app.post("/v1/students", status_code=201, response_model=StudentOut)
def create(body: StudentIn, response: Response):
    global seq; seq += 1
    db[seq] = StudentOut(id=seq, **body.model_dump())
    response.headers["Location"] = f"/v1/students/{seq}"
    return db[seq]

@app.get("/v1/students/{sid}", response_model=StudentOut)
def read(sid: int):
    if sid not in db: raise HTTPException(404, "student not found")
    return db[sid]`),
    `<ol><li>GET 목록 · PATCH · DELETE(204) endpoint를 직접 추가한다</li><li><code>http://localhost:8000/docs</code>에서 5개 endpoint를 모두 실행해 본다</li><li>grade=7로 POST → 422 응답의 detail을 읽는다</li><li>없는 id로 GET → 404, 같은 경로에 PUT → 405를 확인한다</li><li><code>/openapi.json</code>을 열어 Schema가 어떻게 기술되는지 본다</li></ol>`,
    { h3: 'Lab ② — Frontend(5500) → API(8000): 일부러 깨뜨리고, 관찰하고, 고친다' },
    T(['', '변경', '관찰할 것'], [['A', 'allow_origins 를 주석 처리', 'Console 오류 메시지 기록, Network 탭에서 OPTIONS 행 확인'], ['B', '브라우저 주소를 127.0.0.1:5500 으로', 'localhost와 다른 Origin임을 확인'], ['C', 'expose_headers 제거', 'Location 이 null 로 찍히는 것 확인'], ['D', 'Content-Type 을 text/plain 으로', 'Preflight가 사라지는 대신 422 발생 — 왜?'], ['E', 'curl 로 같은 요청', 'CORS와 무관하게 성공함을 확인']]),
    H.key('실험 D가 핵심 질문: Preflight를 피하는 방법이 있다고 해서 그것이 올바른 설계는 아니다. <b>서버 설정을 고치는 것이 정답</b>이다. (text/plain이면 Simple이라 Preflight는 없지만, FastAPI가 Body를 JSON으로 해석하지 못해 422가 난다.)'),
    { h3: 'AI가 만든 API를 “리뷰어”의 눈으로 (S59)' },
    { mount: el => { const C = ['URI가 명사·복수형이고 동사가 없는가? (/getStudents ✕)', 'POST는 201 + Location, DELETE는 204를 반환하는가?', '항상 200 + {"success": false} 패턴을 쓰지 않는가?', 'PUT과 PATCH가 계약대로 다르게 동작하는가?', '요청 Schema와 응답 Schema가 분리되어 있는가?', '목록 조회에 limit 상한이 있는가?', 'allow_origins=["*"] + allow_credentials=True 조합이 없는가?', '오류 응답에 stack trace·내부 경로가 노출되지 않는가?'];
      const saved = LS.get('w5.verify', []);
      const draw = () => { el.innerHTML = `<div class="lab"><div class="lab-head"><span class="tag">체크리스트</span>VERIFY — AI 결과물 검증</div><div class="lab-out">${C.map((c, i) => `<label class="ck"><input type="checkbox" data-i="${i}" ${saved.includes(i) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}<p class="cm" style="margin:8px 0 0;font-size:13.5px">${saved.length} / ${C.length} 확인 · 이 브라우저에 저장</p></div></div>`;
        el.querySelectorAll('input').forEach(b => b.onchange = () => { const i = +b.dataset.i; const k = saved.indexOf(i); if (b.checked && k < 0) saved.push(i); if (!b.checked && k >= 0) saved.splice(k, 1); LS.set('w5.verify', saved); draw(); }); };
      draw(); } },
    H.note('프롬프트 예: “FastAPI로 스마트 교실의 학생·수업·수강신청을 관리하는 REST API를 만들어 줘. Pydantic 스키마와 CORS 설정을 포함하고, 프론트엔드는 http://localhost:5500 에서 동작해. 각 endpoint의 성공/실패 상태 코드를 표로 정리하고, OpenAPI 문서에서 확인할 수 있게 해 줘.” → 후속: “이 API의 Richardson 성숙도 레벨은? 멱등하지 않은 endpoint와 재시도 시 위험을 설명해 줘.”'),
    { h3: '과제 — REST API Design (스마트 교실 또는 IoT 서비스)' },
    T(['단계', '할 일'], [['STEP 1 · 자원 모델링', '자원(명사) 5개 이상과 관계(1:N, N:M)를 트리로 그린다 (5.8)'], ['STEP 2 · Endpoint 명세', '최소 8개 endpoint의 Method · URI · Request · Response · 상태 코드(성공/실패)를 표로 정의'], ['STEP 3 · 구현 · 검증', 'FastAPI로 4개 이상 구현, /docs 캡처, 다른 포트 프론트에서 CORS 설정 전/후 비교']]),
    T(['평가 항목', '기준', '비중'], [['자원 · URI 설계', '명사·복수형·계층 규칙, 필터는 query, 중첩 2단계 이내', '25%'], ['Method · 상태 코드', 'CRUD 매핑, 201/204/404/409/422 등 실패 케이스까지 정의', '25%'], ['Schema · 오류 형식', '요청/응답 Schema 분리, 일관된 오류 Body, 페이지네이션', '20%'], ['CORS 시나리오', 'CORS가 필요한 클라이언트 상황 설명 + 허용 Origin 설계 근거', '15%'], ['AI 활용 기록', '사용한 프롬프트, AI 결과물의 문제점과 수정 내역', '15%']]),
    H.note('제출: PDF 보고서(설계표 + 캡처) + main.py · openapi.json · 다음 주 수업 전까지'),
  ] },

{ id: 'w5.qc', title: 'Quick Check — Week 5', slides: 'S60, S62', tag: '점검',
  blocks: [
    `<p>강의 팁: 답을 적기 전에 “<b>어느 계층·어느 주체(브라우저/서버/네트워크)의 이야기인가</b>”를 먼저 정하면 대부분의 질문이 풀린다.</p>`,
    { qc: 'w5' },
    { h3: 'Takeaways' },
    H.cards([['REST는 제약의 묶음이다', 'Client-Server · Stateless · Cacheable · Uniform Interface · Layered.<br>HTTP+JSON만으로 REST가 되진 않는다.', ''], ['URI는 명사, Method는 동사', '/students/10 + GET · PATCH · DELETE.<br>행위는 메서드로, 조건은 쿼리로.', 'L3'], ['상태 코드와 오류도 계약이다', '201+Location, 204, 404, 409, 422.<br>200 + {"success":false}는 계약을 흐린다.', 'L7'], ['Schema가 계약을 실행한다', 'Pydantic 하나로 입력 검증 · 출력 필터 · OpenAPI 문서가 동시에.', 'L7'], ['Stateless가 Scale-out을 만든다', '요청이 자기완결적이면 어느 서버가 받아도 된다.<br>공유 상태는 DB·Redis로.', 'L4'], ['CORS는 브라우저의 규칙이다', 'Origin = scheme + host + port.<br>서버는 Allow-* 헤더로 허용하고, Preflight가 먼저 묻는다.', 'L3']]),
    H.note('다음 주 · Week 6 — 오늘 만든 API를 지키기: 인증 · 인가 · 웹 보안 (Security)'),
  ] },
] });

QUIZ.w5 = { bank: [], qc: [
  { q: 'REST는 프로토콜인가, 설계 스타일인가? 6가지 제약 중 3개를 말해 보라.', ref: 'w5.rest', model: '<b>설계 스타일</b>(Roy Fielding, 2000)이다. 제약: Client-Server · Stateless · Cacheable · Uniform Interface · Layered System · Code on Demand(선택) 중 3개. HTTP+JSON을 쓴다고 REST가 되는 것은 아니다.', kw: ['설계 스타일 (프로토콜 아님)', '제약 3개', 'Uniform Interface가 핵심'] },
  { q: 'GET /getStudent?id=10 보다 GET /students/10 이 권장되는 이유는?', ref: 'w5.uri', model: 'URI는 <b>자원(명사)</b>, 행위는 <b>메서드</b>로 표현해야 일관성과 예측 가능성을 얻는다. 동사가 경로에 들어가면 Method와 중복되고 API마다 문법이 달라진다. /students 컬렉션만 알면 GET·PATCH·DELETE /students/10을 짐작할 수 있다.', kw: ['URI = 명사(자원)', '행위 = Method', '예측 가능성·일관성'] },
  { q: 'PUT과 PATCH의 차이를 “빠진 필드” 관점에서 설명하라.', ref: 'w5.putpatch', model: 'PUT은 Body를 자원의 <b>완전한 새 표현</b>으로 보고 통째로 교체하므로 <b>빠진 필드는 삭제·기본값</b>이 된다. PATCH는 <b>바꿀 필드만</b> 보내며 빠진 필드는 <b>그대로 유지</b>된다.', kw: ['PUT = 전체 교체 · 빠진 필드 삭제', 'PATCH = 부분 수정 · 빠진 필드 유지'] },
  { q: 'POST 생성 성공 시 200 대신 201 + Location을 쓰는 이유는?', ref: 'w5.crud', model: '<b>생성됐다는 사실</b>과 <b>새 자원의 주소</b>를 명확히 알린다. 새 id는 서버가 정하므로 Location 헤더로 돌려주면 클라이언트가 바로 GET할 수 있다. 200만으로는 “만들어졌는지” 구분이 흐려진다.', kw: ['생성 사실을 명확히', 'Location = 새 자원 URI', 'id는 서버가 정함'] },
  { q: '401과 403의 차이는? 각각 다시 로그인하면 해결되는가?', ref: 'w5.auth', model: '<b>401</b>은 인증(Authentication) 실패 — 토큰이 없거나 만료. 다시 로그인하면 <b>해결될 수 있다</b>. <b>403</b>은 인가(Authorization) 실패 — 신원은 확인됐지만 권한 없음. 다시 로그인해도 <b>같다</b>.', kw: ['401 = 인증 실패 · 재로그인으로 해결 가능', '403 = 권한 없음 · 재로그인해도 동일'] },
  { q: 'FastAPI가 422를 반환했다면, handler 코드는 실행되었는가?', ref: 'w5.pipe', model: '<b>실행되지 않았다.</b> 422는 Pydantic 검증(Validation) 단계에서 반환되며, 이 단계는 handler보다 앞에 있다. (500이면 handler 이후 문제다.)', kw: ['실행 안 됨', '검증 단계에서 반환', 'handler보다 앞'] },
  { q: 'Origin을 구성하는 3요소는? localhost와 127.0.0.1은 같은 Origin인가?', ref: 'w5.origin', model: '<b>scheme · host · port</b>. localhost와 127.0.0.1은 같은 컴퓨터지만 브라우저는 host를 문자열로 비교하므로 <b>다른 Origin</b>이다.', kw: ['scheme + host + port', '다른 Origin', '문자열 비교'] },
  { q: 'CORS는 curl 요청도 차단하는가? 그 이유는?', ref: 'w5.origin', model: '<b>차단하지 않는다.</b> CORS(SOP)는 <b>브라우저</b>가 사용자를 보호하기 위해 적용하는 정책이라 curl · Postman · 서버 간 호출에는 적용되지 않는다. 서버 접근 제어는 인증·인가로 해야 한다.', kw: ['차단하지 않음', '브라우저의 정책', '접근 제어는 인증·인가'] },
  { q: 'JSON body로 POST하는 fetch가 Preflight를 발생시키는 이유는?', ref: 'w5.preflight', model: '<b>application/json</b>은 Simple Request가 허용하는 Content-Type(text/plain · x-www-form-urlencoded · multipart/form-data)이 아니기 때문이다. Simple 조건 = HTML form이 원래 보낼 수 있던 요청.', kw: ['application/json은 Simple 허용 Content-Type 아님', 'Simple = form이 보낼 수 있던 요청'] },
  { q: 'allow_origins=["*"]와 credentials를 함께 쓰면 안 되는 이유는?', ref: 'w5.headers', model: '규격상 credentials(쿠키) 요청에 대해 <b>Allow-Origin: *는 브라우저가 거부</b>한다. 이를 피하려고 요청 Origin을 그대로 반사하면 <b>모든 사이트에 쿠키 포함 접근을 허용</b>하게 되어, 악성 사이트가 로그인한 사용자의 브라우저로 API를 호출하고 응답까지 읽을 수 있다.', kw: ['* + credentials는 규격상 거부', 'Origin 반사 = 모든 사이트 허용', '명시적 Origin 목록'] },
] };
})();
