/* Week 7 — Real-time & IoT Networking */
'use strict';
(function () {
const T = H.tbl;
const req = (line, f = []) => ({ L: 'L7', n: 'HTTP 요청', f: [['요청줄', line], ...f] });
const res = (status, f = []) => ({ L: 'L7', n: 'HTTP 응답', f: [['상태', status], ...f] });
const ev = (n, f) => ({ L: 'L7', n, f });
const mq = (n, f) => ({ L: 'L7', n: 'MQTT ' + n, f });
const lines = arr => `<ul class="ln-list">${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;
const fmt = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 1 });

/* MQTT topic filter matching (spec rules) */
function mqttMatch(filter, topic) {
  const f = filter.split('/'), t = topic.split('/');
  const hi = f.indexOf('#'); if (hi >= 0 && hi !== f.length - 1) return { ok: null, why: '잘못된 구독 — #은 맨 끝에만 올 수 있다' };
  if (f.some(x => x !== '+' && x !== '#' && /[+#]/.test(x))) return { ok: null, why: '잘못된 구독 — 와일드카드는 한 단계를 통째로 차지해야 한다 (예: room+ ✕)' };
  if (/[+#]/.test(topic)) return { ok: null, why: '와일드카드는 구독 전용 — PUBLISH 토픽에는 쓸 수 없다' };
  if (topic.startsWith('$') && (f[0] === '#' || f[0] === '+')) return { ok: false, why: '$로 시작하는 토픽($SYS 등)은 # · + 로 시작하는 구독에 포함되지 않는다' };
  if (hi < 0 && f.length !== t.length && f.includes('+')) return { ok: false, why: f.length < t.length ? `+는 정확히 한 단계만 대신한다 — 구독은 ${f.length}단계, 발행은 ${t.length}단계라 단계 수가 맞지 않는다` : `구독 패턴(${f.length}단계)이 발행 토픽(${t.length}단계)보다 길다` };
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return { ok: true, why: i === t.length ? '#은 부모 단계 자신도 포함한다' : `#이 ${t.slice(i).join('/')} 를 모두 받는다` };
    if (i >= t.length) return { ok: false, why: '구독 패턴이 발행 토픽보다 단계가 많다' };
    if (f[i] === '+') continue;
    if (f[i] !== t[i]) return { ok: false, why: f[i].toLowerCase() === t[i].toLowerCase() ? `대소문자 구분 — ${f[i]} ≠ ${t[i]}` : `${i + 1}번째 단계가 다르다 — ${f[i]} ≠ ${t[i]}` };
  }
  if (t.length > f.length) return { ok: false, why: `+는 정확히 한 단계만 — 발행 토픽에 단계가 더 있다 (${t.slice(f.length).join('/')})` };
  return { ok: true, why: f.includes('+') ? '+가 각각 한 단계에 대응' : '정확히 일치' };
}
/* SSE stream parser (browser semantics) */
function parseSSE(raw) {
  const out = []; let data = [], evn = '', id = '', retry = null, lastId = ''; const ls = raw.replace(/\r\n/g, '\n').split('\n'); ls.pop();
  ls.forEach((l, i) => {
    if (l === '') { if (data.length) out.push({ type: evn || 'message', data: data.join('\n'), id: lastId, line: i + 1 }); data = []; evn = ''; return; }
    if (l.startsWith(':')) return;
    const k = l.indexOf(':'), f = k < 0 ? l : l.slice(0, k), v = k < 0 ? '' : l.slice(k + 1).replace(/^ /, '');
    if (f === 'data') data.push(v); else if (f === 'event') evn = v; else if (f === 'id') { id = v; lastId = v; } else if (f === 'retry' && /^\d+$/.test(v)) retry = +v;
  });
  return { events: out, pending: data.length ? data.join('\n') : null, retry, lastId };
}
function sseRes(raw) {
  const p = parseSSE(raw);
  return (p.events.length ? T(['#', 'event.type', 'event.data', 'lastEventId'], p.events.map((e, i) => [String(i + 1), e.type === 'message' ? 'message (onmessage)' : `<b>${esc(e.type)}</b> (addEventListener)`, `<code>${esc(e.data).replace(/\n/g, '⏎')}</code>`, esc(e.id || '—')]), { mono: [1] }) : '<div class="verdict bad">onmessage가 한 번도 호출되지 않는다</div>') +
    (p.pending != null ? `<p style="margin:6px 0 0" class="cbad">⚠ 아직 디스패치되지 않은 data: <code>${esc(p.pending).replace(/\n/g, '⏎')}</code> — 이벤트 끝의 빈 줄(\\n\\n)이 없어서 브라우저는 계속 기다린다.</p>` : '') +
    `<p class="cm" style="margin:6px 0 0;font-size:13.5px">${p.retry != null ? `retry = ${p.retry}ms 후 재연결 · ` : ''}재연결 시 보낼 Last-Event-ID: <b>${esc(p.lastId || '(없음)')}</b> · 줄 끝(\\n)으로 끝나지 않은 마지막 줄은 아직 도착하지 않은 것으로 본다</p>`;
}
const enc = new TextEncoder();
async function wsAccept(key) { const h = await crypto.subtle.digest('SHA-1', enc.encode(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')); return btoa(String.fromCharCode(...new Uint8Array(h))); }

addWeek({ id: 'w7', num: 7, short: '7주', title: 'Real-time & IoT Networking', range: 'Week 7',
  lead: '“물어봐야 답하는” HTTP를 넘어, <b>서버와 기기가 먼저 말하는</b> 구조 — Polling · Long Polling · SSE · WebSocket · WebRTC, 그리고 IoT의 BLE · MQTT. 새 프로토콜이 많아 보이지만 아래층은 그대로다: 대부분 TCP 위의 <b>오래 유지되는 연결</b>이고, WebRTC만 UDP 위에서 동작한다.',
  sections: [

{ id: 'w7.q', title: '이번 주의 질문 — 서버가 먼저 말해야 한다면?', slides: 'S1–S4',
  blocks: [
    H.key('핵심 질문: 센서 값이 바뀌었을 때, 브라우저 화면이 “새로고침 없이” 1초 안에 바뀌려면 <b>누가 · 어떤 연결로 · 어떤 형식으로</b> 알려야 하는가?'),
    { fig: `<div class="stack" style="max-width:640px">${[['l7', 'Week 7 — 실시간 프로토콜 ← 이번 주', 'SSE · WebSocket · WebRTC · MQTT'], ['bad', 'Week 6 — 인증 · 보안', 'TLS · Session · JWT · OAuth'], ['l7', 'Week 5 — REST API', 'Resource · CRUD · CORS'], ['l4', 'Week 2~4 — HTTP · TCP · IP', '요청/응답 · 바이트 스트림 · 주소']].map(([c, a, b], i) => `<div style="background:var(--${c});${i ? 'opacity:.75' : ''}">${a} <span>${b}</span></div>`).join('')}</div>`, cap: 'Week 5~6은 “클라이언트가 묻고 서버가 답하는” 세계였다. 새 채팅 · 주가 · 센서 경보 · AI 답변의 다음 토큰 — 사건은 서버(또는 기기) 쪽에서 생긴다.' },
    T(['선택지', '한 줄'], [['① 계속 물어볼까', '<b>Polling</b> · Long Polling'], ['② 연결을 열어 두고 흘려보낼까', '<b>SSE</b>'], ['③ 양쪽이 자유롭게 말할까', '<b>WebSocket</b>'], ['④ 브라우저끼리 직접', '<b>WebRTC</b>'], ['⑤ 기기는 중개자를 통해', '<b>MQTT</b>']]),
    { h3: '핵심 용어 12개 (S4)' },
    T(['용어', '한 줄 정의'], [['Polling', '클라이언트가 일정 주기로 “새 거 있어?”를 반복 요청'], ['Long Polling', '서버가 새 데이터가 생길 때까지 응답을 붙잡아 두는 Polling'], ['SSE', 'Server-Sent Events. HTTP 응답을 끝내지 않고 이벤트를 계속 흘려보냄'], ['WebSocket', 'HTTP Upgrade 후 하나의 TCP 연결로 양방향 Frame 교환'], ['WebRTC', '브라우저 간 P2P 음성 · 영상 · 데이터 전송 (UDP 기반)'], ['STUN / TURN', 'NAT 바깥 주소 확인 서버 / P2P 실패 시 중계 서버'], ['BLE', 'Bluetooth Low Energy. 근거리 · 저전력, GATT로 데이터 교환'], ['MQTT', 'IoT용 경량 Publish/Subscribe 메시징 프로토콜 (TCP 1883)'], ['Broker', '메시지를 받아 구독자에게 배달하는 MQTT 중개 서버'], ['Topic', '메시지 주소. inu/301/temp처럼 /로 계층화된 문자열'], ['Pub / Sub', '발행자는 Topic에 보내고, 구독자는 Topic을 듣는다 — 서로 모름'], ['QoS', '전달 보장 수준. 0 최대 1회 · 1 최소 1회 · 2 정확히 1회']]),
  ] },

{ id: 'w7.pull', title: 'HTTP는 왜 “실시간”에 약한가 — Pull vs Push', slides: 'S5–S6',
  blocks: [
    { trace: { mode: 'ladder', title: 'HTTP 기본 모델 — 서버는 질문을 받기 전에는 답할 수 없다', side: 110, rowH: 52,
      lanes: [{ id: 'b', label: 'Browser' }, { id: 's', label: 'Server' }],
      events: [
        { from: 'b', to: 's', label: 'GET /messages', color: 'l7', pkt: [req('GET /messages')], say: 'Client-initiated — 클라이언트가 먼저 묻는다.' },
        { from: 's', to: 'b', label: '200 OK [메시지 3개]', color: 'ok', say: '답했다. 이제 연결은 “할 일 없음”.' },
        { from: 's', to: 's', label: '⚡ 새 메시지 도착!', color: 'bad', say: '서버에 새 메시지가 생겼다 — <b>하지만 보낼 방법이 없다</b>. 브라우저가 다시 물을 때까지 대기.' },
        { from: 'b', to: 's', label: 'GET /messages (다음 요청)', color: 'l7', say: '브라우저가 다시 물어야' },
        { from: 's', to: 'b', label: '200 OK [메시지 4개]', color: 'ok', say: '그제야 알게 된다.' },
      ] } },
    `<div class="pair"><div><h4>Pull (당기기)</h4><p>클라이언트가 필요할 때 가져간다. REST API · 웹 페이지 로딩. 단순하고 캐시 · 재시도가 쉽다. 하지만 <b>변화 감지가 늦다</b>.</p></div><div><h4>Push (밀어주기)</h4><p>사건이 생긴 쪽(서버 · 기기)이 즉시 알린다. 채팅 · 알림 · 센서 경보. 빠르지만 <b>연결을 유지</b>해야 하고 서버가 “누가 듣고 있는지” 관리해야 한다.</p></div></div>`,
    H.key('왜 서버가 먼저 연결할 수 없나? 브라우저 · 스마트폰 · 센서는 대부분 <b>NAT · 방화벽 뒤</b>(2주차)에 있어 외부에서 들어오는 연결이 막힌다 → 항상 <b>안쪽에서 바깥으로</b> 연결을 열어 두는 방식이 필요하다.<br>이번 주의 모든 기술은 같은 질문에 대한 다른 답: “클라이언트가 열어 둔 연결을 어떻게 오래, 싸게, 안전하게 유지할 것인가?”'),
    { h3: '카페 주문으로 이해하기 (S6)' },
    T(['방식', '카페에서는', '특징', '코드'], [['<b>Polling</b>', '1분마다 카운터에 가서 “제 거 나왔어요?”', '대부분 “아직이요” — 헛걸음이 많고 최대 1분 늦게 안다', 'setInterval(fetch, 60000)'], ['<b>Long Polling</b>', '카운터 앞에 서서 “나오면 바로 주세요”', '즉시 받지만, 받으면 다시 줄을 서야 한다. 직원은 서 있는 손님을 기억', '응답 대기 → 재요청'], ['<b>SSE</b>', '진동벨을 받아 자리에서 기다림', '가게 → 손님 <b>한 방향만</b>. 벨로 주문을 추가할 수는 없다', 'EventSource'], ['<b>WebSocket</b>', '직원과 무전기로 연결', '<b>양쪽</b> 아무 때나 말한다 — 대신 무전기를 계속 켜 둬야', 'new WebSocket()']], { mono: [3] }),
    H.note('덧붙여 WebRTC = 손님끼리 직접 영상통화(가게는 번호 교환만 도와줌), MQTT = 가게 게시판에 “3번 음료 완료”를 붙이면 구독한 사람만 알림을 받는 구조.'),
  ] },

{ id: 'w7.budget', title: '“실시간”의 기준은 서비스마다 다르다 — 지연 예산', slides: 'S7',
  blocks: [
    T(['서비스', '허용 지연 (대략)', '방향', '놓치면 안 되나?'], [['화상 통화 · 음성', '단방향 150ms 이하', '양방향 · 연속', '가끔 손실 OK (끊김보다 낫다)'], ['온라인 게임 입력', '50~100ms', '양방향', '최신 값만 중요'], ['채팅 메시지', '수백 ms ~ 1초', '양방향', '절대 손실 X · 순서 중요'], ['LLM 답변 스트리밍', '첫 토큰 1초 내외', '서버 → 클라이언트', '끊기면 이어받기 필요'], ['주가 · 스포츠 스코어', '1초 이내', '서버 → 다수', '최신 값만 중요'], ['센서 대시보드', '1~5초', '기기 → 서버 → 화면', '일부 손실 OK'], ['화재 · 낙상 경보', '1초 이내', '기기 → 서버', '절대 손실 X'], ['펌웨어 업데이트 알림', '수 분도 OK', '서버 → 기기', '늦어도 반드시 전달']]),
    H.cards([['Hard vs Soft Real-time', '<b>Hard</b>: 마감을 놓치면 시스템 실패 (에어백, 산업 제어).<br><b>Soft</b>: 늦으면 품질이 떨어질 뿐 (채팅, 영상). 웹 · IoT 대부분은 Soft.', ''], ['지연을 이루는 것', '전파(거리) + 전송(크기/대역폭) + 큐잉 + 처리 + <b>“알게 되기까지의 대기”</b> ← 이번 주의 주제. Polling은 이 대기를 주기만큼 늘린다.', 'L3'], ['설계 질문 4가지', '① 누가 먼저 말하나<br>② 지연 예산은<br>③ 손실 · 중복을 견디나<br>④ 클라이언트는 브라우저? 센서?', 'L7']]),
    H.key('Real-time = “충분히 빠르게”. “실시간으로 해 주세요”는 설계 정보가 없다 — “경보는 1초 내, 손실 없이, 서버→브라우저 단방향”처럼 바꿔 말하면 프로토콜이 거의 정해진다.'),
  ] },

{ id: 'w7.polling', title: 'Polling — 주기적으로 물어보기와 그 비용', slides: 'S8–S9',
  blocks: [
    H.pre(`// polling.js — 3초마다 새 경보 확인
let since = 100;
setInterval(async () => {
  const r = await fetch(\`/alerts?since=\${since}\`);
  const items = await r.json();
  if (items.length) {
    since = items.at(-1).id;      // 마지막으로 본 id (커서)
    items.forEach(showAlert);
  }
}, 3000);`),
    `<div class="pair"><div><h4 class="cok">장점</h4>${lines(['기존 HTTP · REST · 캐시 · 인증 그대로', '방화벽 · 프록시 문제 거의 없음', '서버가 상태(연결)를 기억할 필요 없음'])}</div><div><h4 class="cbad">단점</h4>${lines(['평균 지연 = <b>주기/2</b>', '대부분 응답이 빈 응답(낭비)', '사용자 수 × 빈도만큼 서버 부하'])}</div></div>`,
    H.note('since=100(커서)을 보내는 이유: 서버가 “이 클라이언트가 어디까지 봤는지” 기억하지 않아도 된다 → Stateless 유지 (5주차).'),
    { lab: { title: 'Polling 비용 계산기 — “3초마다 확인”이 1만 명이 되면', init: { n: 10000, t: 3, ev: 60 },
      ctl: [{ k: 'n', type: 'range', label: '동시 접속자 N', min: 100, max: 100000, step: 100 }, { k: 't', type: 'range', label: 'Polling 주기 T', unit: '초', min: 0.2, max: 60, step: 0.2 }, { k: 'ev', type: 'range', label: '실제 이벤트 간격', unit: '초', min: 1, max: 600 }],
      out: st => { const rps = st.n / st.t, kb = 1.1, mbps = rps * kb * 8 / 1000, perMin = rps * 60, useful = Math.min(1, st.t / st.ev);
        const v = st.t <= 0.4 ? ['bad', '사실상 DoS'] : st.t <= 1 ? ['bad', '서버 · DB 부담 큼'] : st.t <= 5 ? ['', '작은 서비스면 OK'] : st.t <= 30 ? ['ok', '대시보드 OK, 경보 X'] : ['ok', '변화가 드문 작업 확인용'];
        return T(['지표', '계산', '값'], [['요청률', 'N / T', `<b>${fmt(rps)} req/s</b>`], ['트래픽', '요청률 × 1.1 KB (요청 헤더 800 B + 빈 응답 300 B)', `${fmt(rps * kb / 1000)} MB/s ≈ ${fmt(mbps)} Mbps`], ['1분 동안 요청', '요청률 × 60', `${fmt(perMin)}번`], ['쓸모 있는 응답', 'T / 이벤트 간격', `${(useful * 100).toFixed(useful < .1 ? 1 : 0)}%`], ['평균 감지 지연', 'T / 2', `<b>${fmt(st.t / 2)}초</b> (최악 ${fmt(st.t)}초)`]]) +
          `<div class="verdict ${v[0]}">${v[1]}</div><p style="margin:0">주기를 줄이면 지연은 줄지만 요청 수는 그만큼 늘어난다 — <b>둘을 동시에 줄일 수 없다</b>.</p>`; } } },
    T(['주기 T', '요청률 (N=1만)', '평균 지연', '판단'], [['30초', '333 req/s', '15초', '대시보드 OK, 경보 X'], ['3초', '3,333 req/s', '1.5초', '작은 서비스면 OK'], ['1초', '10,000 req/s', '0.5초', '서버 · DB 부담 큼'], ['0.2초', '50,000 req/s', '0.1초', '사실상 DoS']]),
    H.key('Polling의 비용은 <b>(사용자 수 ÷ 주기)</b>에 비례하고, 지연은 <b>주기</b>에 비례한다. 이 트레이드오프를 깨는 것이 Push 방식이다.<br>주기를 3초 → 1초로 줄이면 → 요청 수 <b>3배 증가</b>, 평균 지연 1.5초 → 0.5초.'),
    H.note('Polling이 “정답”인 경우도 있다 — 변화가 드물고 몇 초 늦어도 되는 경우(빌드 상태, 결제 처리 결과, 202 Accepted 후 완료 확인). 개선: 변화 없으면 주기를 늘리는 Adaptive polling, ETag + 304로 응답 크기 축소.'),
  ] },

{ id: 'w7.long', title: 'Long Polling — 답이 생길 때까지 기다리기', slides: 'S10',
  blocks: [
    { trace: { mode: 'ladder', title: '서버가 즉시 답하지 않고 응답을 보류한다', side: 110, rowH: 52,
      lanes: [{ id: 'b', label: 'Browser' }, { id: 's', label: 'Server (async)' }],
      events: [
        { from: 'b', to: 's', label: 'GET /alerts/wait?since=100', color: 'l7', pkt: [req('GET /alerts/wait?since=100')], say: '요청을 보낸다. 서버는 새 경보가 없으면 <b>응답을 보류</b>한다 (최대 30초).' },
        { from: 's', to: 's', label: '응답 보류… ⚡ 경보 #101', color: 'bad', say: '기다리는 중에 경보가 생겼다.' },
        { from: 's', to: 'b', label: '200 [#101] ← 즉시', color: 'ok', say: '지연 ≈ 네트워크 왕복 시간. Polling처럼 주기를 기다리지 않는다.' },
        { from: 'b', to: 's', label: 'GET /alerts/wait?since=101 (바로 재요청)', color: 'l7', say: '받으면 <b>바로 다시</b> 줄을 선다 — 메시지마다 재요청 + 헤더.' },
        { from: 's', to: 'b', label: '204 No Content (30초 타임아웃)', color: 'l4', pkt: [res('204 No Content')], say: '30초 동안 아무 일이 없으면 빈 응답으로 끝내고 클라이언트가 다시 요청. 프록시 타임아웃(60초 등)보다 짧게.' },
      ] } },
    H.pre(`# FastAPI — 새 경보를 최대 30초 기다림
new_alert = asyncio.Event()
@app.get("/alerts/wait")
async def wait_alerts(since: int):
    if has_newer(since):              # 이미 있으면 즉시
        return newer_than(since)
    try:
        await asyncio.wait_for(new_alert.wait(), 30)
    except asyncio.TimeoutError:
        return Response(status_code=204)
    return newer_than(since)`),
    `<div class="pair"><div><h4 class="cok">좋아진 점</h4>${lines(['지연 ≈ 네트워크 왕복 시간', '빈 응답이 크게 줄어듦', '그냥 HTTP라 어디서나 동작'])}</div><div><h4 class="cbad">남은 문제</h4>${lines(['대기 중 요청 = 서버 자원 점유', '메시지마다 재요청 + 헤더', '프록시 타임아웃(60초 등) 주의'])}</div></div>`,
    H.warn('서버는 반드시 <b>비동기(async)</b>여야 한다. 스레드 하나가 요청 하나를 30초씩 붙잡는 동기 서버라면 수백 명만 접속해도 스레드가 바닥난다.'),
  ] },

{ id: 'w7.sse', title: 'SSE — 끝나지 않는 HTTP 응답', slides: 'S11–S12',
  blocks: [
    { trace: { mode: 'ladder', title: '서버가 응답을 닫지 않고, 이벤트가 생길 때마다 한 줄씩', side: 110, rowH: 50,
      lanes: [{ id: 'b', label: 'Browser', sub: 'EventSource' }, { id: 's', label: 'Server' }],
      events: [
        { from: 'b', to: 's', label: 'GET /events', color: 'l7', pkt: [req('GET /events', [['Accept', 'text/event-stream']])], say: '평범한 HTTP GET.' },
        { from: 's', to: 'b', label: '200 text/event-stream', color: 'ok', pkt: [res('200 OK', [['Content-Type', 'text/event-stream'], ['Cache-Control', 'no-cache'], ['(Content-Length 없음)', '응답이 아직 안 끝남']])], say: '새 프로토콜이 아니라 <b>평범한 HTTP 응답</b>이다. 다만 Content-Length 없이 열어 두고 텍스트 이벤트를 조금씩 흘려보낸다 (chunked / HTTP/2 stream).' },
        { from: 's', to: 'b', label: 'data: {"temp": 24.5}', color: 'l7', pkt: [ev('SSE 이벤트', [['data', '{"temp": 24.5}'], ['(빈 줄)', '이벤트 끝 → onmessage']])], say: '이벤트 하나 = “필드: 값” 줄들 + <b>빈 줄</b>.' },
        { from: 's', to: 'b', label: 'data: {"temp": 24.7}', color: 'l7', say: '또 하나.' },
        { from: 's', to: 'b', label: ': ping (주석 = heartbeat)', color: 'l4', say: '콜론으로 시작하는 줄은 무시된다 — 프록시의 유휴 타임아웃을 막는 heartbeat.' },
        { from: 's', to: 'b', label: 'event: alert  data: {"level":2}', color: 'bad', pkt: [ev('SSE 이벤트', [['event', 'alert'], ['data', '{"level": 2}']])], say: '이름 붙은 이벤트 → <code>es.addEventListener("alert", …)</code>.' },
        { from: 'b', to: 's', label: '⚠ 끊김 → 3초 후 자동 재연결', color: 'l7', pkt: [req('GET /events', [['Last-Event-ID', '42']])], say: '연결이 끊기면 브라우저가 <b>retry</b>만큼 기다렸다 <b>자동 재연결</b>하고, 마지막 id를 <b>Last-Event-ID</b> 헤더로 보낸다 → 서버는 43번부터 이어서 보낸다.' },
      ] } },
    `<div class="pair"><div><h4 class="cok">SSE가 해 주는 것</h4>${lines(['서버 → 브라우저 Push', '자동 재연결 (retry)', 'Last-Event-ID로 이어받기', '브라우저 내장 EventSource'])}</div><div><h4 class="cbad">SSE가 못 하는 것</h4>${lines(['클라이언트 → 서버 전송 (보낼 땐 별도 POST)', '바이너리 데이터 (텍스트 UTF-8만)', 'EventSource에 커스텀 헤더 지정'])}</div></div>`,
    H.key('HTTP 위에서 동작하므로 인증 쿠키 · TLS · 프록시 · HTTP/2를 그대로 쓴다 — WebSocket보다 <b>인프라 친화적</b>인 것이 가장 큰 장점. 적합: 알림 · 피드 · 진행률 · 대시보드 · LLM 답변 스트리밍.'),
    { h3: 'SSE 메시지 형식 읽기 — 규칙은 “필드: 값” 줄들 + 빈 줄 하나 (S12)' },
    { lab: { title: '스트림을 고쳐 보면 브라우저가 무엇을 받는지 보인다', init: { raw: 'retry: 3000\n\nid: 41\ndata: {"room": 301, "temp": 24.5}\n\nid: 42\nevent: alert\ndata: {"room": 301, "level": "HIGH"}\n\n: keep-alive ping\n\nid: 43\ndata: 첫 번째 줄\ndata: 두 번째 줄\n\n', preset: '' },
      ctl: [{ type: 'btns', items: [{ label: '정상 예시', act: st => st.raw = 'retry: 3000\n\nid: 41\ndata: {"room": 301, "temp": 24.5}\n\nid: 42\nevent: alert\ndata: {"room": 301, "level": "HIGH"}\n\n: keep-alive ping\n\nid: 43\ndata: 첫 번째 줄\ndata: 두 번째 줄\n\n' }, { label: '빈 줄 빠뜨림 (흔한 버그)', act: st => st.raw = 'id: 1\ndata: {"temp": 24.5}\nid: 2\ndata: {"temp": 24.7}\n' }, { label: '마지막 빈 줄 없음', act: st => st.raw = 'id: 41\ndata: {"temp": 24.5}\n\nid: 42\ndata: {"temp": 24.7}\n' }] }],
      out: st => `<textarea data-raw class="mt-ta mono" rows="9" spellcheck="false" style="font-size:13px">${esc(st.raw)}</textarea><div data-res>${sseRes(st.raw)}</div>`,
      after: (st, out) => { const ta = out.querySelector('[data-raw]'); if (!ta) return; let tm; ta.oninput = () => { clearTimeout(tm); tm = setTimeout(() => { st.raw = ta.value; out.querySelector('[data-res]').innerHTML = sseRes(st.raw); }, 250); }; } } },
    T(['필드', '의미', '브라우저 동작'], [['data:', '이벤트 내용 (여러 줄이면 \\n으로 합침)', 'event.data 문자열'], ['event:', '이벤트 이름 (생략 시 message)', 'addEventListener("alert")'], ['id:', '이벤트 번호', '재연결 시 Last-Event-ID 헤더로 전송'], ['retry:', '재연결 대기 시간(ms)', '끊기면 그만큼 기다렸다 재접속'], [': 주석', '무시되는 줄', 'heartbeat — 프록시 유휴 타임아웃 방지'], ['(빈 줄)', '<b>이벤트의 끝</b>', '여기서 onmessage 호출']], { mono: [0] }),
    H.warn('가장 흔한 버그: 이벤트 끝의 빈 줄(<code>\\n\\n</code>)을 빠뜨림 → 서버는 보냈는데 브라우저 onmessage가 <b>영원히 호출되지 않는다</b>.'),
  ] },

{ id: 'w7.ssecode', title: 'SSE 구현 · LLM 스트리밍 · 실무 함정', slides: 'S13–S15',
  blocks: [
    `<div class="pair"><div><h4>Server — FastAPI</h4>${H.pre(`async def sensor_stream(request: Request):
    eid = 0
    yield "retry: 3000\\n\\n"
    while True:
        if await request.is_disconnected():   # 탭 닫힘
            break
        eid += 1
        msg = json.dumps({"room": 301, "temp": temp()})
        yield f"id: {eid}\\ndata: {msg}\\n\\n"  # 빈 줄 필수!
        await asyncio.sleep(1)

@app.get("/events")
async def events(request: Request):
    return StreamingResponse(sensor_stream(request),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache",
                 "X-Accel-Buffering": "no"})  # nginx 버퍼링 끔`)}</div><div><h4>Client — Browser</h4>${H.pre(`const es = new EventSource("/events");
es.onmessage = (e) => {
  const d = JSON.parse(e.data);
  t.textContent = d.temp + " °C";
};
es.addEventListener("alert", (e) => alert(e.data));
es.onerror = () => console.log("재연결 시도 중…");`)}<p class="cm" style="font-size:13.5px">직접 확인: <code>curl -N localhost:8000/events</code> (-N: 버퍼링 끄기) · DevTools → Network → EventStream 탭</p></div></div>`,
    H.note('같은 Origin이 아니면 SSE도 CORS 대상이다(5주차). 쿠키를 보내려면 <code>new EventSource(url, {withCredentials: true})</code> + 서버 Allow-Credentials.'),
    { h3: 'SSE를 매일 쓰고 있다 — AI 챗봇의 타자 효과 (S14)' },
    { lab: { title: 'LLM 토큰 스트리밍 — 형식은 SSE, 수신은 fetch', init: { k: 4 },
      ctl: [{ k: 'k', type: 'range', label: '받은 이벤트 수', min: 0, max: 5 }],
      out: st => { const toks = ['TCP', '는 ', '신뢰성', ' 있는 전송…'], t = [0.4, 0.45, 0.5, 0.55];
        const stream = ['HTTP/1.1 200 OK', 'Content-Type: text/event-stream', '', ...toks.map(x => `data: {"delta": "${x}"}\n`), 'data: [DONE]'];
        const shown = Math.min(st.k, 5), text = toks.slice(0, Math.min(shown, 4)).join('');
        return `<div class="pair"><div>${H.pre('POST /v1/chat   {"stream": true, "messages": [...]}\n\n' + stream.slice(0, 3 + shown).join('\n'))}</div><div><h4>사용자 화면</h4><div style="font-size:20px;min-height:40px;padding:10px;border:1px solid var(--line);border-radius:8px">${esc(text)}${shown < 5 ? '<span style="animation:blink 1s steps(1) infinite">▌</span>' : ''}</div><p class="cm" style="font-size:13.5px">${shown ? `${shown <= 4 ? t[shown - 1] + '초' : '완료'} — 첫 글자는 0.4초에 보인다 (TTFT)` : '요청 직후'}</p></div></div>`; } } },
    T(['질문', '답'], [['왜 스트리밍인가', '답변 완성까지 10초 → 첫 글자는 0.4초. 체감 지연(<b>TTFT</b>, Time To First Token)이 크게 준다'], ['왜 WebSocket이 아닌가', '질문 1번 → 답변 스트림 1번. <b>서버→클라이언트 단방향</b>이면 충분하다'], ['왜 EventSource가 아닌가', '질문을 <b>POST Body</b>로 보내야 함 → <code>fetch()</code> + ReadableStream으로 직접 읽는다']]),
    H.key('형식은 SSE, 수신은 fetch — “<b>SSE 형식 ≠ EventSource API</b>”를 구분하자.'),
    { h3: 'SSE 실무 함정 4가지 (S15)' },
    T(['함정', '증상', '해결'], [['① 프록시 버퍼링', 'Nginx · CDN이 응답을 모았다가 한 번에 → 이벤트가 수십 초 뒤 몰려서 도착', 'proxy_buffering off; 또는 X-Accel-Buffering: no · gzip 끄기'], ['② 연결 수 제한', 'HTTP/1.1에서 브라우저는 도메인당 동시 연결 약 <b>6개</b> → 탭 7개째부터 SSE가 멈춤', 'HTTP/2 (한 연결에 다수 스트림) · SharedWorker'], ['③ 인증 헤더 불가', 'EventSource는 <b>Authorization 헤더를 못 붙인다</b> → Bearer 방식과 충돌', '같은 사이트 쿠키(HttpOnly) 또는 fetch 기반 스트림'], ['④ 유휴 타임아웃', '이벤트가 뜸하면 LB · 프록시가 60초 등에서 끊는다', '15~30초마다 : ping 주석 · id:로 이어받기']]),
    H.note('진단 순서: curl -N으로 서버 직접 접속 → 정상인데 프록시 경유만 이상하면 ①·④, 여러 탭에서만 이상하면 ②, 401이면 ③.'),
  ] },

{ id: 'w7.ws', title: 'WebSocket — HTTP로 시작해서 전용 회선으로', slides: 'S16–S18',
  blocks: [
    { trace: { mode: 'ladder', title: 'HTTP 요청 한 번으로 “프로토콜 전환”을 합의한 뒤, 같은 TCP 연결을 양방향 통로로', side: 110, rowH: 48,
      lanes: [{ id: 'b', label: 'Browser' }, { id: 's', label: 'Server' }],
      events: [
        { from: 'b', to: 's', label: 'TCP 3-way handshake (+ TLS)', color: 'l4', say: '3주차 · 6주차 그대로.' },
        { from: 'b', to: 's', label: 'GET /ws  Upgrade: websocket', color: 'l7', pkt: [req('GET /ws/chat HTTP/1.1', [['Upgrade', 'websocket'], ['Connection', 'Upgrade'], ['Sec-WebSocket-Key', 'dGhlIHNhbXBsZSBub25jZQ=='], ['Sec-WebSocket-Version', '13'], ['Origin', 'https://app.inu.ac.kr'], ['Cookie', 'sid=abc123']])], say: '“이 연결을 websocket으로 바꾸자”. 80 · 443 포트를 그대로 써서 방화벽 · 프록시를 통과하고, 쿠키 · Origin 같은 기존 웹 보안 정보를 첫 요청에 실을 수 있다.' },
        { from: 's', to: 'b', label: '101 Switching Protocols', color: 'ok', pkt: [res('101 Switching Protocols', [['Upgrade', 'websocket'], ['Connection', 'Upgrade'], ['Sec-WebSocket-Accept', 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=']])], say: '<b>101</b> — 200이 아니다! 이제부터 이 TCP 연결은 HTTP가 아니다.' },
        { from: 'b', to: 's', label: 'Frame: {"type":"join","room":301}', color: 'l3', pkt: [ev('WebSocket Frame', [['opcode', '0x1 Text'], ['MASK', '1 (브라우저→서버는 필수)'], ['Payload', '{"type":"join","room":301}']])], say: '이제는 메시지(Frame) 단위. 헤더 2~14바이트.' },
        { from: 'b', to: 's', label: 'Frame: {"user":"kim","msg":"안녕"}', color: 'l3', say: '클라이언트가 보낸다.' },
        { from: 's', to: 'b', label: 'Frame: {"user":"lee","msg":"hi"}', color: 'l7', say: '서버도 아무 때나 보낸다 — <b>Full-duplex</b>. 요청-응답 짝이 없으므로 “누구 답인지”는 애플리케이션이 type · id 필드로 정한다.' },
        { from: 's', to: 'b', label: 'Frame: {"msg":"반가워"}', color: 'l7', say: '동시에 양쪽이 보낼 수도 있다.' },
        { from: 'b', to: 's', label: 'Close Frame (1000)', color: 'l4', say: '정상 종료 코드 1000.' },
      ] } },
    T(['URL', '포트', '아래 계층'], [['ws://host/ws', '80', 'TCP (평문)'], ['wss://host/ws', '443', 'TLS + TCP ← <b>운영 필수</b>']], { mono: [0] }),
    H.key('WebSocket은 메시지(Message) 단위로 주고받는다 — TCP의 “바이트 스트림 경계 문제”(3주차)를 프로토콜이 Frame으로 대신 해결해 준다.'),
    { h3: 'Opening Handshake 해부 — Sec-WebSocket-Accept는 암호화가 아니다 (S17)' },
    { lab: { title: 'Accept = Base64( SHA-1( Key + 고정 GUID ) ) — 직접 계산', init: { key: 'dGhlIHNhbXBsZSBub25jZQ==' },
      ctl: [{ k: 'key', type: 'text', label: 'Sec-WebSocket-Key', w: 260 }],
      out: st => `<p class="mono" style="font-size:13px;word-break:break-all;margin:0">SHA-1( "${esc(st.key)}" + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11" )</p><div data-acc class="verdict ok">계산 중…</div><p style="margin:0">고정 GUID를 붙여 해시 → 일반 HTTP 서버가 실수로 101을 주는 일을 막는 <b>“진짜 WebSocket 서버인지” 확인용</b>이다. <b>암호화 · 인증이 아니고, 이후 메시지 암호화 키로 쓰이지도 않는다</b> — 보안은 wss(TLS)와 쿠키 · 토큰 · Origin 검사로.</p>`,
      after: async (st, out) => { const el = out.querySelector('[data-acc]'); if (!el) return; if (!(window.crypto && crypto.subtle)) { el.textContent = '(crypto.subtle 사용 불가)'; return; } el.textContent = 'Sec-WebSocket-Accept: ' + await wsAccept(st.key); } } },
    T(['헤더', '역할'], [['Upgrade / Connection', '“이 연결을 websocket으로 바꾸자”'], ['Sec-WebSocket-Key', '클라이언트가 만든 16바이트 난수(Base64)'], ['Sec-WebSocket-Version', '13 (RFC 6455 표준)'], ['Origin', '어느 웹페이지가 연결하는지 — <b>서버가 검사해야 함</b>'], ['Sec-WebSocket-Accept', 'Key로 계산한 증명값']], { mono: [0] }),
    H.warn('101이 아닌 응답(400 · 403 · 426)이 오면 핸드셰이크 실패 → 브라우저는 상세 이유 없이 onerror + close code <b>1006</b>만 알려 준다. Network 탭의 101 행부터 확인.'),
    { h3: '편지 vs 전화 통화 (S18)' },
    T(['', '편지 (HTTP)', '전화 (WebSocket)'], [['시작', '보낼 때마다 봉투에 주소 · 우표(헤더 수백 바이트)', '처음 한 번 전화를 건다 = Upgrade, “여보세요” = 101'], ['누가 말하나', '내가 보내야 답장이 온다', '둘 다 아무 때나 — 말머리 몇 바이트(Frame 헤더)'], ['조용할 때', '—', '“듣고 있어요?” = Ping / Pong'], ['끝', '편지마다 독립', '“끊을게요” = Close Frame · 그냥 끊기면 = 1006'], ['비용 구조', '통마다 봉투 비용 — 자주 보내면 비쌈', '연결 유지 비용 — 오래 켜 두면 회선 점유'], ['어울리는 일', '가끔 필요한 조회 · 등록 · 수정 (REST)', '쉴 새 없이 주고받는 채팅 · 협업 편집 · 게임']]),
  ] },

{ id: 'w7.frame', title: 'WebSocket Frame 구조 — 헤더는 2~14바이트', slides: 'S19',
  blocks: [
    { fig: `<div class="bits" style="font-family:var(--f-mono);font-size:12.5px;display:grid;grid-template-columns:repeat(32,minmax(0,1fr));gap:2px;max-width:720px">${[['FIN', 1, 'l3'], ['RSV', 3, 'l1'], ['opcode', 4, 'l7'], ['MASK', 1, 'bad'], ['Payload len', 7, 'l4'], ['Extended length (0 / 16 / 64 bit)', 16, 'l4'], ['Masking key (32 bit, 클라이언트 → 서버일 때만)', 32, 'bad'], ['Payload data (텍스트 · 바이너리)', 32, 'ok']].map(([t, w, c]) => `<div style="grid-column:span ${w};background:var(--${c});color:#fff;padding:6px 4px;border-radius:4px;text-align:center;overflow:hidden;white-space:nowrap;text-overflow:ellipsis" title="${t}">${t}</div>`).join('')}</div>`, cap: '0 · 8 · 16 · 31비트. 메시지 하나 = Frame 하나 이상.' },
    T(['opcode', '의미', '쓰임'], [['0x1', 'Text', 'JSON 채팅 메시지 (UTF-8)'], ['0x2', 'Binary', '이미지 · 센서 바이너리 · Protobuf'], ['0x8', 'Close', '종료 요청 + 이유 코드'], ['0x9 / 0xA', 'Ping / Pong', '연결 생존 확인 (heartbeat)'], ['0x0', 'Continuation', '큰 메시지를 여러 Frame으로 분할']], { mono: [0] }),
    { lab: { title: 'Frame 헤더 크기 계산기', init: { len: 10, dir: 'c2s' },
      ctl: [{ k: 'len', type: 'num', label: 'Payload 길이', unit: 'B', min: 0, max: 100000000 }, { k: 'dir', type: 'select', label: '방향', opts: [['c2s', '브라우저 → 서버 (MASK 필수)'], ['s2c', '서버 → 브라우저']] }],
      out: st => { const L = +st.len, ext = L <= 125 ? 0 : L <= 65535 ? 2 : 8, m = st.dir === 'c2s' ? 4 : 0, hdr = 2 + ext + m;
        return T(['부분', '바이트', '이유'], [['기본 (FIN · opcode · MASK · len7)', '2', '항상'], ['Extended length', String(ext), L <= 125 ? '0~125는 7비트에 그대로' : L <= 65535 ? '126 → 다음 16비트가 길이 (최대 64KB)' : '127 → 다음 64비트가 길이'], ['Masking key', String(m), m ? '브라우저→서버 Frame은 반드시 마스킹 (프록시 캐시 오염 방지 — 암호화 아님)' : '서버→브라우저는 마스킹 안 함'], ['<b>헤더 합계</b>', `<b>${hdr}</b>`, `Payload ${fmt(L)} B + 헤더 ${hdr} B`]]) +
          `<p style="margin:0">예: <code>{"t":24.5}</code>(10바이트)는 헤더 2바이트(+마스크 4)면 된다. 같은 내용을 HTTP Polling으로 받으면 요청 · 응답 헤더만 수백~1,000바이트.</p>`; } } },
    H.cards([['FIN', '1이면 메시지의 마지막 Frame. 0이면 다음 Continuation Frame이 이어진다.', ''], ['MASK', '브라우저→서버 Frame은 반드시 마스킹. 중간 프록시 캐시 오염 공격을 막는 장치(<b>암호화 아님</b>).', 'L3'], ['Payload length', '0~125 → 7비트에 그대로 · 126 → 다음 16비트 · 127 → 다음 64비트. 그래서 헤더 = 2 ~ 14 바이트.', 'L7']]),
  ] },

{ id: 'w7.wsops', title: 'WebSocket 구현과 연결 수명 관리 — Heartbeat · Close Code · 재연결', slides: 'S20–S21',
  blocks: [
    H.pre(`# ws_server.py — 강의실 채팅 (FastAPI)
rooms: dict[str, set[WebSocket]] = {}      # 방 → 연결들 (서버 메모리 상태!)
@app.websocket("/ws/{room}")
async def chat(ws: WebSocket, room: str):
    if ws.headers.get("origin") not in ALLOWED_ORIGINS:
        await ws.close(code=1008); return  # 정책 위반
    await ws.accept()                       # ← 여기서 101 응답
    rooms.setdefault(room, set()).add(ws)
    try:
        while True:
            msg = await ws.receive_json()   # Text Frame 수신
            for peer in list(rooms[room]):  # broadcast
                await peer.send_json({"room": room, **msg})
    except WebSocketDisconnect:
        rooms[room].discard(ws)             # 연결 정리 필수`),
    H.note('확인: DevTools → Network → WS 필터 → Messages 탭(↑ 보낸 Frame / ↓ 받은 Frame) · 탭 2개 열어 보기 · <code>websocat ws://localhost:8000/ws/301</code>. rooms 딕셔너리는 서버 메모리 상태 — 서버가 1대일 때만 동작한다 (7.11).'),
    H.cards([['① Heartbeat', 'NAT · 프록시 · LB는 조용한 TCP 연결을 수십 초~수 분 후 말없이 끊는다.<br>서버가 20~30초마다 Ping → 브라우저가 자동 Pong. Pong이 안 오면 죽은 연결로 정리.', ''], ['② Close code', '1000 정상 · 1001 떠남(탭 닫기 · 재시작)<br><b>1006 비정상 — Close Frame 없이 끊김</b><br>1008 정책 위반(Origin · 인증) · 1009 너무 큼 · 1011 서버 오류', 'L3'], ['③ Reconnect', '지수 백오프 + 지터.<br>재연결 후 놓친 메시지 복구 — 마지막 id를 보내 “그 이후 것” 요청 (SSE의 Last-Event-ID를 직접 구현).', 'L7']]),
    { lab: { title: '재연결 간격 — 지수 백오프 + 지터', init: { jit: true, seed: 1 },
      ctl: [{ k: 'jit', type: 'toggle', label: '지터(무작위) 섞기' }, { type: 'btns', items: [{ label: '다시 뽑기', act: st => st.seed++ }] }],
      out: st => { const R = rngFrom(st.seed * 7919), clients = 6, tries = 7;
        const rows = []; for (let c = 0; c < clients; c++) { let t = 0; const pts = []; for (let n = 0; n < tries; n++) { const base = Math.min(30000, 1000 * 2 ** n), d = st.jit ? base * (0.5 + R()) : base; t += d; pts.push(t / 1000); } rows.push(pts); }
        const max = Math.max(...rows.flat());
        return `<div style="position:relative;height:${clients * 22 + 24}px;border:1px solid var(--line);border-radius:8px;background:var(--sunk)">${rows.map((pts, c) => pts.map(x => `<span title="${x.toFixed(1)}s" style="position:absolute;left:calc(${x / max * 96}% + 2%);top:${8 + c * 22}px;width:9px;height:9px;border-radius:50%;background:var(--${['l3', 'l7', 'l4', 'ok', 'bad', 'l1'][c]})"></span>`).join('')).join('')}<span class="cm" style="position:absolute;right:8px;bottom:2px;font-size:11px">${max.toFixed(0)}초</span></div>` +
          `<p style="margin:6px 0 0">간격: 1s → 2s → 4s → 8s → 16s → 30s → 30s (상한). ${st.jit ? '점들이 흩어져 있다 — 서버가 재시작돼도 1만 명이 <b>같은 순간</b>에 몰리지 않는다.' : '<b class="cbad">지터 없음</b> — 6개 클라이언트가 정확히 같은 순간에 재접속한다. 1만 명이면 서버가 다시 쓰러진다 = <b>thundering herd</b>.'}</p>`; } } },
    H.pre(`// 지수 백오프 + 지터 재연결
let n = 0;
function connect() {
  const ws = new WebSocket(URL);
  ws.onopen  = () => { n = 0; };
  ws.onclose = (e) => {
    if (e.code === 1000) return;                       // 정상 종료면 재연결 안 함
    const d = Math.min(30000, 1000 * 2 ** n++) * (0.5 + Math.random());
    setTimeout(connect, d);
  };
}`),
  ] },

{ id: 'w7.wssec', title: 'WebSocket 보안과 Scale-out — CORS도, 서버 1대도 믿지 말 것', slides: 'S22–S23',
  blocks: [
    { trace: { mode: 'ladder', title: 'Cross-Site WebSocket Hijacking (CSWSH)', side: 110, rowH: 52,
      lanes: [{ id: 'u', label: '사용자 브라우저', sub: 'chat.inu 쿠키 보유' }, { id: 'e', label: 'evil.com 페이지' }, { id: 'c', label: 'wss://chat.inu/ws' }],
      events: [
        { from: 'e', to: 'u', label: '① 악성 JS 실행', color: 'bad', say: '사용자가 evil.com을 열었다.' },
        { from: 'u', to: 'c', label: '② 연결 + 쿠키 자동 첨부', color: 'bad', pkt: [req('GET /ws (Upgrade)', [['Origin', 'https://evil.com'], ['Cookie', 'sid=… (자동)']])], say: '브라우저는 WebSocket에 <b>SOP · CORS를 적용하지 않는다</b>. 쿠키도 자동으로 붙는다.' },
        { from: 'c', to: 'u', label: '③ 101 성공 → 대화 내용 탈취', color: 'bad', say: 'Origin을 검사하지 않는 서버는 공격자 페이지가 로그인된 사용자 행세로 송수신하게 허용한다. CORS처럼 “응답 읽기”를 막아 주는 장치가 없다 → <b>서버가 Origin 헤더를 검사</b>해야 한다 (아니면 403 / 1008).' },
      ] } },
    T(['체크 항목', '방법'], [['암호화', '항상 wss:// (TLS). ws://는 로컬 개발만'], ['<b>Origin 검사</b>', '핸드셰이크 때 허용 목록과 비교 → 아니면 403 / 1008'], ['인증', '쿠키(SameSite) 또는 연결 직후 첫 메시지로 토큰. URL 쿼리 토큰은 로그에 남음'], ['인가', '방(room) 입장 · 메시지 전송마다 권한 확인 (6주차)'], ['입력 검증', 'JSON 스키마 검사 · 최대 메시지 크기 제한 (1009)'], ['속도 제한', '연결 수 / 초당 메시지 수 제한'], ['토큰 만료', '연결은 몇 시간 유지 — 중간에 토큰이 만료되면? 재인증 · 강제 종료 정책']]),
    H.key('인증은 핸드셰이크 시점 <b>한 번만</b> 일어난다 — 연결이 살아 있는 동안 권한이 바뀌거나 토큰이 만료되는 경우를 별도로 설계해야 한다.'),
    { h3: 'Scale-out — 연결은 상태(State)다 (S23)' },
    { trace: { title: 'A 서버에 붙은 kim의 메시지를 B 서버에 붙은 lee에게', sub: 'Redis Pub/Sub backplane', rowH: 88,
      nodes: [{ id: 'k', label: 'kim', icon: 'laptop', x: .03, y: 0 }, { id: 'l', label: 'lee', icon: 'phone', x: .03, y: 1 }, { id: 'lb', label: 'Load Balancer', icon: 'lb', x: .26, y: .5 }, { id: 'a', label: 'WS Server A', sub: '{kim, park}', icon: 'server', x: .52, y: 0 }, { id: 'b', label: 'WS Server B', sub: '{lee}', icon: 'server', x: .52, y: 1 }, { id: 'r', label: 'Redis Pub/Sub', sub: 'backplane', icon: 'broker', x: .9, y: .5 }],
      links: [['k', 'lb'], ['l', 'lb'], ['lb', 'a'], ['lb', 'b'], ['a', 'r'], ['b', 'r']],
      events: [
        { from: 'k', to: 'a', label: '① kim 메시지 → A', color: 'l7', say: 'kim은 A 서버에 연결되어 있다. A의 메모리에는 lee가 없다 — backplane이 없다면 여기서 끝.' },
        { from: 'a', to: 'r', label: '② publish', color: 'l4', say: '모든 WS 서버가 Redis(또는 MQTT · Kafka)의 같은 채널을 구독한다. A가 채널에 발행.' },
        { from: 'r', to: 'b', label: '③ 구독자에게', color: 'l4', say: 'B도 그 채널의 구독자라 메시지를 받는다.' },
        { from: 'b', to: 'l', label: '④ B가 lee에게 전송', color: 'ok', say: '어느 서버에서 들어온 메시지든 모두에게 퍼진다.' },
      ] } },
    T(['문제', '해결'], [['서버마다 연결 목록이 다름', '<b>Pub/Sub backplane</b>으로 메시지 공유'], ['재연결 시 다른 서버로 감', '상태는 Redis · DB에, 서버는 연결만 (5주차 Stateless)'], ['서버 배포 시 연결이 모두 끊김', 'Graceful shutdown(1001) + 클라이언트 지터 재연결']]),
    H.pre(`# nginx — Upgrade 헤더 전달 필수 (빠지면 핸드셰이크 400/426)
location /ws/ {
  proxy_pass http://ws_backend;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 3600s;     # 기본 60s면 정확히 60초마다 끊김
}`),
    H.note('서버 1대는 수만 개 연결을 유지할 수 있지만, 연결 하나하나가 메모리 · 파일 디스크립터(소켓, 3주차)를 차지한다 — ulimit -n 확인.'),
  ] },

{ id: 'w7.cmp', title: 'Polling · Long Polling · SSE · WebSocket 한눈에', slides: 'S24–S25',
  blocks: [
    T(['항목', 'Polling', 'Long Polling', 'SSE', 'WebSocket'], [['방향', 'Client → Server (Pull)', 'Pull (Push 흉내)', '<b>Server → Client</b>', '<b>양방향</b> (Full-duplex)'], ['연결', '요청마다', '요청마다, 오래 대기', '1개 HTTP 응답 유지', '1개 TCP 연결 유지'], ['프로토콜', 'HTTP', 'HTTP', 'HTTP (text/event-stream)', 'HTTP Upgrade → WS'], ['지연', '주기/2 (평균)', '≈ RTT', '≈ 0 (즉시)', '≈ 0 (즉시)'], ['메시지당 오버헤드', '헤더 수백 B~1 KB', '헤더 수백 B~1 KB', '수십 B', '2~14 B'], ['데이터', '모든 형식', '모든 형식', 'UTF-8 텍스트', '텍스트 + 바이너리'], ['재연결', '필요 없음', '직접 구현', '<b>자동</b> (Last-Event-ID)', '직접 구현'], ['인프라 호환', '최고', '좋음 (타임아웃 주의)', '좋음 (버퍼링 주의)', 'Upgrade 지원 필요'], ['서버 상태', '없음', '대기 요청', '열린 스트림', '열린 연결 + 세션'], ['대표 사례', '작업 완료 확인', '구형 채팅', '알림 · LLM 스트리밍', '채팅 · 게임 · 협업 편집']]),
    H.key('고르는 첫 질문: “<b>클라이언트도 자주 보내는가?</b>” — 아니면 SSE부터 검토, 그렇다면 WebSocket. 변화가 드물면 Polling도 충분한 답이다.'),
    { lab: { title: '10바이트 센서 값 {"t":24.5} 1개를 받는 데 오가는 바이트 (S25)', init: { per: 10 },
      ctl: [{ k: 'per', type: 'range', label: 'Polling 1초 주기, 이벤트는 몇 초에 1번?', min: 1, max: 60 }],
      out: st => { const poll = st.per * 1100 + 10, lp = 1100 + 10, sse = 40, ws = 16;
        return barsHTML([{ label: 'Polling (1초)', segs: [{ v: poll, c: 'bad', t: '' }], val: fmt(poll) + ' B' }, { label: 'Long Polling', segs: [{ v: lp, c: 'l4', t: '' }], val: fmt(lp) + ' B' }, { label: 'SSE', segs: [{ v: sse, c: 'l7', t: '' }], val: sse + ' B' }, { label: 'WebSocket', segs: [{ v: ws, c: 'ok', t: '' }], val: ws + ' B' }], poll) +
          `<p style="margin:6px 0 0">Polling은 이벤트 1개에 ${st.per}번 요청해 1번 쓸모 → <b>${fmt(poll / sse)}배</b>(SSE 대비). 센서 1만 개 × 초당 1개라면 차이는 Mbps 단위 → 모바일 데이터 · 배터리 · 서버 비용. (가정: 요청 헤더 800 B + 응답 헤더 300 B, SSE ≈ 40 B, WS = 10 + 2 + 마스크 4 B)</p>`; } } },
  ] },

{ id: 'w7.rtc', title: 'WebRTC — 브라우저끼리 직접, 서버는 “소개”만', slides: 'S26–S27',
  blocks: [
    `<div class="pair"><div><h4>WebRTC 프로토콜 스택</h4><div class="stack">${[['l7', 'SRTP (음성 · 영상)', ''], ['l7', 'SCTP (DataChannel)', ''], ['bad', 'DTLS (암호화 키 교환)', ''], ['l3', 'ICE · STUN · TURN (경로 찾기)', ''], ['l4', 'UDP', '']].map(([c, a]) => `<div style="background:var(--${c})">${a}</div>`).join('')}</div></div><div>${lines(['<b>왜 UDP인가</b> — 영상 통화에서 0.5초 전 프레임을 재전송받는 건 의미가 없다. 늦게 오는 정확한 데이터보다 지금의 대충 맞는 데이터 — TCP 재전송 대기(<b>HOL blocking</b>, 3주차)를 피한다.', '<b>왜 P2P인가</b> — 서버를 거치면 지연 · 대역폭 비용이 2배. 모든 미디어는 DTLS-SRTP로 <b>필수 암호화</b>.', '대표 사례: 화상 회의 · 원격 진료 · 클라우드 게임 · 화면 공유 · DataChannel 파일 전송 · IoT 카메라'])}</div></div>`,
    H.warn('WebRTC에는 <b>Signaling 방법이 정해져 있지 않다</b> — 보통 앞에서 배운 WebSocket으로 직접 구현한다. 이번 주 기술들이 서로 부품이 되는 지점.'),
    { trace: { mode: 'ladder', title: 'Offer · Answer · ICE — 미디어 조건과 도달 가능한 주소 교환', side: 96, rowH: 50,
      lanes: [{ id: 'a', label: 'Peer A' }, { id: 'st', label: 'STUN' }, { id: 'sg', label: 'Signaling', sub: 'WebSocket' }, { id: 'b', label: 'Peer B' }],
      events: [
        { from: 'a', to: 'st', label: '① 내 공인 주소는?', color: 'l4', say: 'A는 NAT 뒤에 있어 자기 바깥 주소를 모른다.' },
        { from: 'st', to: 'a', label: '203.0.113.7:54321', color: 'l4', say: '“밖에서 보면 너는 203.0.113.7:54321” — <b>srflx</b> 후보.' },
        { from: 'a', to: 'sg', label: '② Offer (SDP)', color: 'l7', pkt: [ev('SDP Offer', [['m=', 'audio · video'], ['codec', 'opus · VP8'], ['fingerprint', 'DTLS 인증서 지문']])], say: '<b>SDP</b> = 세션 설명서 — 코덱, 미디어 종류, 암호화 지문. “이렇게 통화하자”.' },
        { from: 'sg', to: 'b', label: 'Offer 전달', color: 'l7', say: 'Signaling 서버는 <b>전달만</b> 한다. 통화 내용은 모른다.' },
        { from: 'b', to: 'sg', label: '③ Answer (SDP)', color: 'l7', say: '“좋아, 나는 이 조건”.' },
        { from: 'sg', to: 'a', label: 'Answer 전달', color: 'l7', say: '' },
        { from: 'a', to: 'b', label: 'ICE candidate들 (Signaling 경유)', color: 'l3', say: '<b>ICE candidate</b> = 나에게 도달할 수 있는 주소 후보. host(사설 IP) · srflx(STUN이 알려준 공인 IP:포트) · relay(TURN). Trickle ICE: 찾는 즉시 보낸다.' },
        { from: 'a', to: 'b', label: '④ 후보 쌍 연결 시도 → P2P (UDP)', color: 'ok', say: '후보 쌍마다 STUN check → 성공한 경로로 <b>직접</b> 미디어 · 데이터. 디버깅은 chrome://webrtc-internals.' },
      ] } },
    T(['후보', '의미', '언제 성공'], [['host', '내 사설 IP', '같은 LAN'], ['srflx', 'STUN이 알려준 공인 IP:포트', '대부분의 가정용 NAT'], ['relay', 'TURN 서버 주소', '최후 수단 — 대칭형 NAT · 회사 방화벽']], { mono: [0] }),
  ] },

{ id: 'w7.nat', title: 'STUN · TURN — 아파트 안의 두 친구가 통화하기 · Mesh · SFU · MCU', slides: 'S28–S29',
  blocks: [
    T(['#', '역할', '비유', '하는 일'], [['1', '<b>Signaling 서버</b>', '공통 친구 · 메신저', '서로의 정보를 전달만. 통화 내용은 모름'], ['2', '<b>STUN 서버</b>', '건물 밖 거울', '“밖에서 보면 너는 203.0.113.7 아파트 54321호” — 바깥 주소를 알려 줌. 가볍고 싸다'], ['3', 'Hole punching', '동시에 문 두드리기', '양쪽이 동시에 상대 바깥 주소로 보내 NAT 테이블에 “통로”를 만든다'], ['4', '<b>TURN 서버</b>', '중계 교환원', '직접 안 되면 <b>모든 대화를 대신 전달</b>. 확실하지만 대역폭 비용이 큼']]),
    H.key('STUN = “내 바깥 주소 알려 줘”(미디어는 안 거침) · TURN = “직접 안 되니 대신 중계해 줘”(미디어가 거침). 대부분의 연결은 STUN만으로 성공하지만 기업망 · 모바일망 일부는 TURN이 꼭 필요하다 — “같은 Wi-Fi에선 되는데 LTE에선 안 돼요” = TURN 서버 없음을 의심.'),
    H.warn('STUN 서버는 미디어를 중계하지 않는다 — 시험 함정. 중계는 TURN.'),
    { h3: '참가자가 늘어나면 — Mesh · SFU · MCU (S29)' },
    { lab: { title: '회의 인원과 영상 비트레이트로 계산', init: { n: 5, br: 1.5 },
      ctl: [{ k: 'n', type: 'range', label: '참가자 N', min: 2, max: 12 }, { k: 'br', type: 'range', label: '영상 1개', unit: 'Mbps', min: 0.3, max: 4, step: 0.1 }],
      out: st => { const n = st.n, b = st.br;
        const rows = [['Mesh (P2P)', 'N−1개 업로드 · N−1개 다운로드', (n - 1) * b, (n - 1) * b, `${n * (n - 1) / 2}개 연결`, '2~4명 소규모'], ['SFU', '업로드 1개 · 다운로드 N−1개 (서버는 골라서 전달만, 디코딩 X)', b, (n - 1) * b, `서버 연결 ${n}개`, 'Zoom · Meet 류 대부분'], ['MCU', '업 · 다운 각 1개 (서버가 영상을 합성)', b, b, '서버 CPU 부담 큼', '저사양 단말 · 녹화']];
        return T(['구조', '스트림', '내 업로드', '내 다운로드', '비고', '적합'], rows.map(r => [`<b>${r[0]}</b>`, r[1], `<b class="${r[2] > 5 ? 'cbad' : ''}">${fmt(r[2])} Mbps</b>`, `${fmt(r[3])} Mbps`, r[4], r[5]])) +
          `<p style="margin:0">Mesh에서 ${n}명 회의의 업로드 = ${n - 1} × ${b} = <b>${fmt((n - 1) * b)} Mbps</b>. ${(n - 1) * b > 5 ? '가정용 업로드로는 버겁다 → SFU가 표준이 된 이유.' : '이 정도면 Mesh도 가능하다.'}</p>`; } } },
  ] },

{ id: 'w7.iot', title: 'IoT 네트워크는 무엇이 다른가 · 기술 지도', slides: 'S30–S31',
  blocks: [
    T(['제약', '내용', '숫자'], [['① 배터리', '코인 전지로 1~수년. 무선 송신이 전력의 대부분 → 보내는 바이트 · 깨어 있는 시간을 줄여야', 'ESP32 Wi-Fi 송신 ≈ 수백 mA · 딥슬립 ≈ 수십 µA'], ['② 작은 컴퓨터', 'MCU의 RAM은 수백 KB. 무거운 HTTP 라이브러리 · JSON · TLS도 부담', 'ESP32 SRAM ≈ 520 KB'], ['③ 불안정한 링크', '신호 약함 · 이동 · 간섭으로 수시로 끊긴다. <b>끊겼다 붙는 것이 정상</b>', '재연결 · 세션 · 메시지 보관 필수'], ['④ 들어오는 연결 불가', 'NAT · 이동통신망 뒤 → 서버가 먼저 접속 못 함', '기기가 바깥으로 연결을 열어 둠'], ['⑤ 많은 수 · 다대다', '센서 수천 개 → 대시보드 · DB · 알람 · AI가 동시에', '요청-응답보다 <b>발행-구독</b>']]),
    H.key('IoT 프로토콜의 공통 목표: 작은 헤더 · 오래 유지되는 바깥 방향 연결 · 끊김에 강한 전달 보장 · 다대다 배포 — <b>MQTT가 정확히 이 조합</b>이다.'),
    T(['링크 기술', '거리', '속도', '전력', '대표 용도'], [['BLE', '~10~50 m', '~1~2 Mbps', '매우 낮음', '웨어러블 · 스마트폰 연동'], ['Wi-Fi', '~50 m', '수십~수백 Mbps', '높음', '카메라 · 가전 · ESP32'], ['Zigbee / Thread', '~10~100 m (메시)', '250 kbps', '낮음', '스마트홈 조명 · 센서'], ['LoRaWAN', '수 km~15 km', '수 kbps 이하', '매우 낮음', '농업 · 계량기 · 원격지'], ['NB-IoT / LTE-M', '셀룰러 전국망', '수십 kbps~1 Mbps', '낮음', '스마트 미터 · 물류'], ['5G / LTE', '셀룰러', '수백 Mbps~', '높음', '차량 · 영상 · 산업']]),
    { fig: `<div class="stack" style="max-width:560px">${[['l7', 'Application', 'MQTT · CoAP · HTTP · WebSocket'], ['l4', 'Transport', 'TCP (MQTT) · UDP (CoAP)'], ['l3', 'Network', 'IP · IPv6 · 6LoWPAN'], ['l1', 'Link / PHY', 'Wi-Fi · BLE · Zigbee · LoRa · LTE']].map(([c, a, b]) => `<div style="background:var(--${c})">${a} <span>${b}</span></div>`).join('')}</div>`, cap: 'BLE · Zigbee · LoRa 기기는 IP 인터넷에 직접 못 붙는다 → 스마트폰 · 허브 · 게이트웨이가 받아 MQTT/HTTP로 전달. Wi-Fi · LTE 기기(ESP32)는 IP가 있어 브로커에 직접 연결.' },
    H.warn('“BLE냐 MQTT냐?”는 잘못된 질문 — <b>BLE는 무선 링크, MQTT는 메시지 프로토콜</b>로 다른 계층이다. 실제 제품은 “BLE 센서 → 폰 → MQTT → 서버”처럼 함께 쓴다.'),
  ] },

{ id: 'w7.ble', title: 'BLE — Advertising과 GATT', slides: 'S32',
  blocks: [
    { trace: { mode: 'ladder', title: 'Advertising으로 존재를 알리고, 연결 후 GATT로 값 교환', side: 120, rowH: 52,
      lanes: [{ id: 'p', label: 'Peripheral', sub: '심박 센서 · 밴드' }, { id: 'c', label: 'Central', sub: '스마트폰 앱' }],
      events: [
        { from: 'p', to: 'c', label: '① Advertising (주기적 방송)', color: 'l4', say: '“나 여기 있어요” — 연결 없이 짧게 방송.' },
        { from: 'c', to: 'p', label: '② Connect', color: 'l7', say: 'Central(폰)이 Peripheral을 찾아 연결한다.' },
        { from: 'c', to: 'p', label: 'Read 0x2A38 (Body Sensor Location)', color: 'l7', say: '<b>Read</b> — 한 번 읽기.' },
        { from: 'c', to: 'p', label: 'Notify 구독 0x2A37', color: 'l7', say: '<b>Notify</b>를 켠다.' },
        { from: 'p', to: 'c', label: 'Notify: 72 bpm', color: 'ok', say: '값이 바뀌면 센서가 <b>먼저</b> 보낸다 → BLE 안의 “Push”.' },
        { from: 'p', to: 'c', label: 'Notify: 75 bpm', color: 'ok', say: '대부분 시간 잠들어 있다가 짧은 간격(Connection Interval)에만 깨어 무선을 켠다 → 저전력.' },
      ] } },
    H.pre(`GATT 구조 (심박 센서 예)
Profile — 기기 전체
 └ Service  0x180D  Heart Rate
    └ Char 0x2A37 Heart Rate Measurement [Notify]
    └ Char 0x2A38 Body Sensor Location   [Read]
 └ Service  0x180F  Battery
    └ Char 0x2A19 Battery Level          [Read · Notify]`),
    H.cards([['Characteristic 연산', 'Read 한 번 읽기 · Write 쓰기(설정 변경) · <b>Notify</b> 값이 바뀌면 센서가 먼저 보냄', ''], ['웹과의 연결', 'BLE는 <b>IP가 없다</b> → 폰 앱(또는 Web Bluetooth)이 값을 받아 MQTT · HTTP로 서버에 전달하는 Gateway 역할', 'L3'], ['표준 UUID', '0x180D · 0x2A37처럼 표준 서비스는 번호만 보고 어느 앱이든 해석 — REST의 “공통 문법”과 같은 아이디어', 'L7']]),
  ] },

{ id: 'w7.mqtt', title: 'MQTT — Broker 중심 Publish / Subscribe', slides: 'S33–S34',
  blocks: [
    { trace: { title: '보내는 쪽과 받는 쪽이 서로를 모른다 — Topic이라는 주소로 만난다', rowH: 74,
      nodes: [{ id: 't1', label: '온도센서 301', sub: 'PUB inu/301/temp', icon: 'iot', x: .04, y: 0 }, { id: 't2', label: '온도센서 302', sub: 'PUB inu/302/temp', icon: 'iot', x: .04, y: 1 }, { id: 'd', label: '문 열림 센서', sub: 'PUB inu/301/door', icon: 'iot', x: .04, y: 2 }, { id: 'b', label: 'Broker', sub: 'Mosquitto · EMQX', icon: 'broker', x: .5, y: 1 }, { id: 's1', label: '대시보드', sub: 'SUB inu/+/temp', icon: 'browser', x: .96, y: 0 }, { id: 's2', label: 'DB 저장기', sub: 'SUB inu/#', icon: 'db', x: .96, y: 1 }, { id: 's3', label: '알람 서비스', sub: 'SUB inu/+/door', icon: 'proc', x: .96, y: 2 }],
      links: [['t1', 'b'], ['t2', 'b'], ['d', 'b'], ['b', 's1'], ['b', 's2'], ['b', 's3']],
      events: [
        { from: 't1', to: 'b', label: 'PUB inu/301/temp 24.5', color: 'l7', pkt: [mq('PUBLISH', [['topic', 'inu/301/temp'], ['payload', '24.5'], ['QoS', '0']])], say: '센서는 <b>Broker에만</b> 연결한다. 구독자가 누구인지, 몇 명인지 모른다.' },
        { from: 'b', to: 's1', label: '→ 대시보드 (inu/+/temp ✓)', color: 'ok', pkt: [mq('PUBLISH', [['topic', 'inu/301/temp'], ['payload', '24.5'], ['매칭된 구독', 'inu/+/temp']])], say: '+ 는 한 단계 아무거나 → inu/301/temp 일치.' },
        { from: 'b', to: 's2', label: '→ DB 저장기 (inu/# ✓)', color: 'ok', pkt: [mq('PUBLISH', [['topic', 'inu/301/temp'], ['payload', '24.5'], ['매칭된 구독', 'inu/#']])], say: '# 은 그 아래 전부 → 일치. 한 번 발행 = 구독자 전원에게 (<b>Fan-out</b>).' },
        { from: 'd', to: 'b', label: 'PUB inu/301/door open', color: 'l7', pkt: [mq('PUBLISH', [['topic', 'inu/301/door'], ['payload', 'open']])], say: '문 열림.' },
        { from: 'b', to: 's3', label: '→ 알람 (inu/+/door ✓)', color: 'bad', pkt: [mq('PUBLISH', [['topic', 'inu/301/door'], ['payload', 'open'], ['매칭된 구독', 'inu/+/door']])], say: '알람 서비스만 받는다 (대시보드는 temp만 구독).' },
        { from: 'b', to: 's2', label: '→ DB 저장기 (inu/# ✓)', color: 'ok', pkt: [mq('PUBLISH', [['topic', 'inu/301/door'], ['payload', 'open'], ['매칭된 구독', 'inu/#']])], say: 'DB 저장기는 전부 받는다. 구독자를 추가해도 <b>센서 코드는 그대로</b>.' },
      ] } },
    H.cards([['공간 분리', '서로의 IP · 개수를 모른다. 구독자를 추가해도 센서 코드는 그대로', ''], ['시간 분리', '구독자가 잠시 꺼져 있어도 Broker가 보관 후 전달 (세션 · QoS)', 'L3'], ['동기 분리', '발행자는 보내고 바로 잠든다 — 누가 언제 받든 기다리지 않음', 'L7']]),
    H.key('MQTT = <b>TCP 1883</b> (TLS <b>8883</b>) 위의 경량 바이너리 프로토콜. 고정 헤더 최소 <b>2바이트</b>. Publisher와 Subscriber는 서로의 IP를 알 필요가 없다 — Broker 주소만 안다.'),
    { h3: '유튜브 구독으로 이해하기 (S34)' },
    T(['유튜브', 'MQTT', '예시'], [['유튜브 플랫폼', '<b>Broker</b>', 'mosquitto · EMQX · AWS IoT Core'], ['영상을 올리는 크리에이터', '<b>Publisher</b>', 'ESP32 온도센서'], ['채널 · 재생목록 이름', '<b>Topic</b>', 'inu/301/temp'], ['구독 버튼', 'SUBSCRIBE', '대시보드가 inu/+/temp 구독'], ['새 영상 알림', 'PUBLISH 전달', '{"temp": 24.5}가 구독자 전원에게'], ['채널 상단 고정 영상', '<b>Retained message</b>', '새 구독자에게 마지막 온도 값을 즉시'], ['“운영 중단” 자동 공지', '<b>Last Will (LWT)</b>', '센서가 갑자기 꺼지면 status = offline 자동 발행'], ['한 번 업로드로 모두에게', 'Fan-out', '센서 1번 → 대시보드 · DB · 알람 모두']]),
    H.note('차이점: 유튜브는 영상을 영구 보관하지만 MQTT Broker는 기본적으로 지나가는 메시지를 저장하지 않는다(Retained 1개 · 세션 큐 예외). 기록은 DB 구독자가 따로 한다.'),
  ] },

{ id: 'w7.topic', title: 'Topic 설계와 Wildcard — + 는 한 단계, # 은 그 아래 전부', slides: 'S35–S36',
  blocks: [
    H.pre(`inu/
 ├─ bldg7/
 │   ├─ room301/  temp · humi · door
 │   └─ room302/  temp · humi
 └─ bldg8/
     └─ lab1/     temp · co2
devices/esp32-01/status   (online/offline)`),
    { lab: { title: 'Wildcard 매칭기 — 먼저 O/X를 생각해 본 뒤 확인', init: { f: 'inu/+/temp', t: 'inu/bldg7/301/temp' },
      ctl: [{ k: 'f', type: 'text', label: '구독 (SUBSCRIBE)', w: 200 }, { k: 't', type: 'text', label: '발행 (PUBLISH)', w: 220 }, { type: 'btns', items: [['inu/+/temp', 'inu/301/temp'], ['inu/+/temp', 'inu/bldg7/301/temp'], ['inu/#', 'inu/bldg7/301/temp'], ['inu/#', 'inu'], ['inu/bldg7/+', 'inu/bldg7/301/temp'], ['inu/Bldg7/#', 'inu/bldg7/301/temp'], ['+/+/temp', 'inu/301/temp'], ['inu/#/temp', 'inu/301/temp'], ['#', '$SYS/broker/clients'], ['inu/+/temp', 'inu/+/temp']].map(([a, b], i) => ({ label: String(i + 1), act: st => { st.f = a; st.t = b; } })) }],
      out: st => { const r = mqttMatch(st.f.trim(), st.t.trim()); const fs = st.f.trim().split('/'), ts = st.t.trim().split('/');
        const n = Math.max(fs.length, ts.length);
        const grid = `<div class="segs">${Array.from({ length: n }, (_, i) => { const a = fs[i], b = ts[i]; const okc = a === '#' || a === '+' ? 'l3' : a === b ? 'ok' : 'bad'; return `<span class="seg"><code style="color:var(--${a === undefined ? 'mute' : okc})">${a === undefined ? '—' : esc(a)}</code><small>${b === undefined ? '—' : esc(b)}</small></span>`; }).join('')}</div>`;
        return `${grid}<div class="verdict ${r.ok === true ? 'ok' : 'bad'}">${r.ok === true ? 'O — 수신' : r.ok === false ? 'X — 수신 안 함' : '— 잘못된 사용'}</div><p style="margin:0">${esc(r.why)}</p>`; } } },
    T(['#', '구독', '발행', '수신?', '이유'], [['1', 'inu/+/temp', 'inu/301/temp', 'O', '+가 301 한 단계에 대응'], ['2', 'inu/+/temp', 'inu/bldg7/301/temp', '<b class="cbad">X</b>', '+는 정확히 한 단계만 — 여기는 두 단계'], ['3', 'inu/#', 'inu/bldg7/301/temp', 'O', '#은 그 아래 모든 단계'], ['4', 'inu/#', 'inu', 'O', '#은 부모 단계 자신도 포함'], ['5', 'inu/bldg7/+', 'inu/bldg7/301/temp', '<b class="cbad">X</b>', '+ 뒤에 단계가 더 있음'], ['6', 'inu/Bldg7/#', 'inu/bldg7/301/temp', '<b class="cbad">X</b>', '대소문자 구분'], ['7', '+/+/temp', 'inu/301/temp', 'O', '세 단계 모두 일치'], ['8', 'inu/#/temp', 'inu/301/temp', '—', '잘못된 구독 — #은 맨 끝에만']], { mono: [1, 2] }),
    `<div class="pair"><div><h4>설계 규칙</h4>${lines(['큰 범위 → 작은 범위: 회사/건물/방/측정값', '선행 / 금지 (/inu/…는 빈 단계가 생김) · 공백 · 대소문자 혼용 피하기', '기기 ID를 토픽에 넣으면 권한(ACL) 관리가 쉽다'])}</div><div><h4 class="cbad">주의</h4>${lines(['와일드카드는 <b>구독 전용</b> — inu/+/temp로 PUBLISH 불가', '$SYS/#는 브로커 상태 토픽. # 구독에 포함되지 않는다', '토픽 = REST의 URI 같은 “계약” — 배포 후 바꾸기 어렵다'])}</div></div>`,
    H.note('실습: <code>mosquitto_sub -v -t \'inu/+/temp\'</code> — -v를 붙이면 어떤 토픽으로 왔는지 함께 찍혀 와일드카드 동작이 보인다.'),
  ] },

{ id: 'w7.session', title: 'MQTT 세션 한 번 따라가기 — CONNECT부터 DISCONNECT까지', slides: 'S37',
  blocks: [
    { trace: { mode: 'ladder', title: 'TCP 연결 위에서 CONNECT → SUBSCRIBE → PUBLISH → PING → DISCONNECT', side: 104, rowH: 46,
      lanes: [{ id: 'p', label: 'Sensor (Pub)' }, { id: 'b', label: 'Broker' }, { id: 'd', label: 'Dashboard (Sub)' }],
      events: [
        { from: 'd', to: 'b', label: 'CONNECT (clientId=dash1, keepAlive=60)', color: 'l7', pkt: [mq('CONNECT', [['clientId', 'dash1'], ['keepAlive', '60초'], ['크기', '수십 B']])], say: 'Client ID는 브로커 안에서 <b>유일</b>해야 한다. 같은 ID로 두 번 접속 → <b>먼저 접속한 쪽이 끊긴다</b>.' },
        { from: 'b', to: 'd', label: 'CONNACK (0 = 성공)', color: 'ok', say: '' },
        { from: 'd', to: 'b', label: 'SUBSCRIBE inu/+/temp (QoS 1)', color: 'l7', say: '구독은 on_connect 안에서 — 재연결 때 자동으로 다시 구독된다.' },
        { from: 'b', to: 'd', label: 'SUBACK (granted QoS 1)', color: 'ok', say: '' },
        { from: 'p', to: 'b', label: 'CONNECT (clientId=esp32-01)', color: 'l7', say: '센서도 바깥으로 연결을 연다.' },
        { from: 'b', to: 'p', label: 'CONNACK', color: 'ok', say: '' },
        { from: 'p', to: 'b', label: 'PUBLISH inu/301/temp {24.5}', color: 'l7', pkt: [mq('PUBLISH', [['고정 헤더', '2 B'], ['topic', 'inu/301/temp (12 B)'], ['payload', '24.5 (4 B)'], ['합계', '≈ 20 B (HTTP POST면 헤더만 수백 B)']])], say: '' },
        { from: 'b', to: 'd', label: 'PUBLISH inu/301/temp {24.5}', color: 'ok', say: '브로커가 구독자에게 전달.' },
        { from: 'd', to: 'b', label: 'PINGREQ (60초 동안 할 말 없을 때)', color: 'l4', pkt: [mq('PINGREQ', [['크기', '2 B']])], say: '<b>Keep Alive</b>: 설정 시간의 1.5배 동안 아무 패킷도 없으면 브로커가 연결을 죽은 것으로 판단 → LWT 발행.' },
        { from: 'b', to: 'd', label: 'PINGRESP', color: 'l4', say: '' },
        { from: 'p', to: 'b', label: 'DISCONNECT (정상 종료)', color: 'l4', say: '정상 DISCONNECT면 LWT는 발행되지 않는다.' },
      ] } },
    T(['패킷', '크기 (대략)'], [['CONNECT', '수십 B'], ['PUBLISH (QoS 0)', '2 B 헤더 + 토픽 + payload'], ['PUBACK', '4 B'], ['PINGREQ / RESP', '2 B']]),
  ] },

{ id: 'w7.qos', title: 'QoS 0 · 1 · 2 — 전달 보장의 3단계', slides: 'S38–S39',
  blocks: [
    { lab: { title: 'QoS를 고르면 패킷 흐름이 보인다', init: { q: '1', lost: true },
      ctl: [{ k: 'q', type: 'select', label: 'QoS', opts: [['0', 'QoS 0 — At most once'], ['1', 'QoS 1 — At least once'], ['2', 'QoS 2 — Exactly once']] }, { k: 'lost', type: 'toggle', label: '첫 확인 응답이 유실됨' }],
      out: st => { const S = { '0': [['→', 'PUBLISH'], st.lost ? null : null], '1': st.lost ? [['→', 'PUBLISH (id=7)'], ['✕', 'PUBACK (7) 유실'], ['→', 'PUBLISH (id=7, DUP=1) 재전송'], ['←', 'PUBACK (7)']] : [['→', 'PUBLISH (id=7)'], ['←', 'PUBACK (7)']], '2': st.lost ? [['→', 'PUBLISH (id=9)'], ['✕', 'PUBREC (9) 유실'], ['→', 'PUBLISH (id=9, DUP=1)'], ['←', 'PUBREC (9) — 이미 받은 id라 중복 저장 안 함'], ['→', 'PUBREL (9)'], ['←', 'PUBCOMP (9)']] : [['→', 'PUBLISH (id=9)'], ['←', 'PUBREC (9)'], ['→', 'PUBREL (9)'], ['←', 'PUBCOMP (9)']] }[st.q].filter(Boolean);
        const v = { '0': ['최대 1번 · 유실 가능', '확인 없음. 끊기면 그냥 사라진다. 가장 빠르고 가볍다.', '1초마다 오는 온도 — 하나쯤 빠져도 다음 값이 온다', '1'], '1': ['최소 1번 · <b>중복 가능</b>', st.lost ? 'ACK가 유실되면 송신자는 받았는지 모르니 DUP=1로 다시 보낸다 → 수신자는 같은 메시지를 <b>2번 받는다</b>.' : 'ACK를 받으면 끝.', '경보 · 명령 — 대신 수신 측이 중복 처리(멱등성)', '2'], '2': ['정확히 1번 · 가장 느림', '4-way 핸드셰이크로 중복까지 제거. 왕복 2번, 양쪽이 상태(id)를 저장해야 한다.', '과금 · 재고 차감 — 중복이 치명적인 경우', '4'] }[st.q];
        return `<div class="pair"><div><h4>Sender → Receiver</h4><ol class="ln-list" style="list-style:none;padding:0">${S.map(([d, t]) => `<li class="mono" style="${d === '✕' ? 'color:var(--bad);text-decoration:line-through' : ''}">${d === '←' ? '&nbsp;&nbsp;&nbsp;← ' : d === '✕' ? '&nbsp;&nbsp;&nbsp;✕ ' : '→ '}${esc(t)}</li>`).join('')}</ol></div><div><h4>QoS ${st.q} — ${v[0]}</h4><p>${v[1]}</p><p class="cm" style="font-size:14px">용도: ${v[2]} · 정상 패킷 수 ${v[3]}</p></div></div>`; } } },
    T(['QoS', '우편 비유', '보장', '패킷'], [['0', '일반 우편 · 전단지 — 넣고 끝', 'At most once — 유실 가능', '1'], ['1', '등기 우편 — 서명이 분실되면 한 통 더 → 두 통 받을 수 있음', 'At least once — 중복 가능', '2'], ['2', '내용증명 + 수령 확인 — 보냈다 · 받았다 · 확인했다 · 완료', 'Exactly once', '4']]),
    H.key('실제 적용 QoS = <b>min(발행 QoS, 구독 QoS)</b>. QoS는 구간별(Pub↔Broker, Broker↔Sub)로 적용된다 — 센서가 QoS 2로 보내도 대시보드가 QoS 0으로 구독했다면 Broker→대시보드 구간은 QoS 0.'),
    H.note('QoS 2가 항상 최선은 아니다 — 대부분 <b>QoS 1 + 수신 측 중복 제거</b>(메시지 고유 id, 이미 처리한 id는 무시)로 같은 효과를 더 싸게 얻는다. 4주차 Idempotency-Key와 같은 아이디어.'),
  ] },

{ id: 'w7.retain', title: 'Retain · Last Will · Persistent Session', slides: 'S40–S41',
  blocks: [
    H.cards([['Retained Message', '토픽별 <b>마지막 메시지 1개</b>를 브로커가 저장 → 새 구독자는 <b>구독 즉시</b> 그 값을 받는다 (대시보드를 켜자마자 “현재 온도”).<br>지우려면 빈 payload를 retain으로 발행.', ''], ['Last Will & Testament', 'CONNECT 때 “내가 <b>비정상</b>으로 사라지면 이 메시지를 대신 발행해 줘” 등록.<br>Keep Alive 초과 · TCP 끊김 시 브로커가 발행. <b>정상 DISCONNECT면 발행 안 함</b>.', 'L3'], ['Persistent Session', 'cleanStart=false (+ 만료 시간)로 접속하면 브로커가 구독 정보와 못 받은 QoS 1·2 메시지를 보관.<br>같은 Client ID로 돌아오면 이어서 수신.', 'L7']]),
    { trace: { mode: 'ladder', title: '조합 패턴 — 기기 온라인 상태 표시', side: 110, rowH: 50,
      lanes: [{ id: 's', label: 'esp32-01' }, { id: 'b', label: 'Broker', sub: 'retained 저장' }, { id: 'd', label: 'Dashboard' }],
      tables: [{ id: 'ret', title: 'Broker의 retained 값', cols: ['topic', 'payload'], rows: [] }],
      events: [
        { from: 's', to: 'b', label: 'CONNECT + Will(status=offline, retain)', color: 'l7', pkt: [mq('CONNECT', [['will topic', 'devices/esp32-01/status'], ['will payload', 'offline'], ['will retain', 'true'], ['keepAlive', '30']])], say: 'Will 등록 — 아직 발행된 것은 아니다.' },
        { from: 's', to: 'b', label: 'PUBLISH status=online (retain)', color: 'ok', tables: { ret: [['devices/esp32-01/status', 'online']] }, say: '접속 직후 online을 retain으로 발행.' },
        { from: 'd', to: 'b', label: 'SUBSCRIBE devices/+/status', color: 'l7', say: '대시보드는 나중에 켜졌다.' },
        { from: 'b', to: 'd', label: 'online (retained — 즉시)', color: 'ok', say: '언제 켜도 retained 값으로 <b>현재 상태</b>를 바로 안다.' },
        { from: 's', to: 's', label: '⚡ 전원 뽑힘 (DISCONNECT 없음)', color: 'bad', say: '패킷이 끊겼다.' },
        { from: 'b', to: 'd', label: '30×1.5 = 45초 후 offline (LWT)', color: 'bad', tables: { ret: [['devices/esp32-01/status', 'offline']] }, say: 'Keep Alive의 1.5배 동안 소식이 없으면 브로커가 Will을 <b>대신 발행</b>. retain이라 이후 구독자도 offline을 본다.' },
      ] } },
    H.pre(`c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="sensor-301")   # 센서별 고유 id
c.will_set("devices/sensor-301/status", "offline", qos=1, retain=True)
c.connect("localhost", 1883, keepalive=30)
c.loop_start()                                        # 네트워크 스레드
c.publish("devices/sensor-301/status", "online", qos=1, retain=True)
while True:
    c.publish("inu/bldg7/room301/temp", json.dumps({"temp": t(), "ts": int(time.time())}), qos=0)
    time.sleep(1)

def on_connect(c, ud, flags, rc, props):
    c.subscribe("inu/+/+/temp", qos=1)                # 재접속 시 재구독`),
    H.warn('Retained 값은 <b>오래된 값</b>일 수도 있다 — payload에 측정 시각(ts)을 함께 넣어 “3시간 전 값”을 구분하자. 코드 리뷰 포인트: 1초 온도는 QoS 0, 상태(status)는 QoS 1 + retain.'),
  ] },

{ id: 'w7.coap', title: 'MQTT · HTTP · CoAP 비교와 MQTT 보안', slides: 'S42–S43',
  blocks: [
    T(['항목', 'MQTT', 'HTTP (REST)', 'CoAP'], [['모델', 'Pub/Sub (Broker)', 'Request/Response', 'Request/Response + Observe'], ['전송 계층', 'TCP (TLS)', 'TCP (TLS)', '<b>UDP</b> (DTLS)'], ['최소 헤더', '2 B', '수백 B (텍스트)', '4 B'], ['서버 → 기기', '구독으로 즉시', '어려움 (Polling)', 'Observe로 가능'], ['다대다 배포', '기본 기능', '직접 구현', '제한적'], ['전달 보장', 'QoS 0/1/2', '재시도 직접', 'CON(확인) / NON'], ['적합', '센서 스트림 · 명령 · 상태', '설정 · 조회 · 펌웨어 다운로드', '초저전력 · 6LoWPAN']]),
    H.key('브라우저는 TCP 1883에 직접 접속할 수 없다 → <b>MQTT over WebSocket</b>(wss://broker/mqtt, MQTT.js) 또는 브라우저는 SSE · WebSocket으로 백엔드와만 통신하고 백엔드가 MQTT를 구독(권한 관리가 쉽다). HTTP를 버리는 게 아니다 — 텔레메트리는 MQTT, 설정 · 펌웨어 · 관리 API는 HTTP.'),
    { h3: 'MQTT 보안 — 브로커는 공용 게시판이 아니다 (S43)' },
    T(['영역', '방법'], [['암호화', 'TLS 8883 / wss. 평문 1883은 같은 Wi-Fi의 누구나 payload와 비밀번호를 본다'], ['인증', 'username/password는 최소한. 기기마다 X.509 클라이언트 인증서(<b>mTLS</b>)가 IoT 표준 — AWS IoT Core는 필수'], ['인가 (ACL)', '기기는 자기 토픽에만 쓰기 <code>devices/esp32-01/#</code>. 대시보드는 읽기만. # 구독은 관리자만'], ['입력 검증', '구독자는 payload를 신뢰하지 않는다 — 스키마 · 값 범위 (온도 9999°C?)']]),
    `<div class="pair"><div>${H.pre('# mosquitto.conf\nlistener 8883\ncafile   /etc/mosquitto/ca.crt\ncertfile /etc/mosquitto/server.crt\nkeyfile  /etc/mosquitto/server.key\nallow_anonymous false\npassword_file /etc/mosquitto/passwd\nacl_file /etc/mosquitto/acl')}</div><div>${H.pre('# acl — %c = client id\npattern write devices/%c/#\nuser dashboard\ntopic read inu/#')}</div></div>`,
    H.warn('test.mosquitto.org · broker.hivemq.com 같은 공개 테스트 브로커는 전 세계 누구나 #을 구독할 수 있다 — 실습용 가짜 데이터만. 6주차 질문이 그대로 반복된다: 누구인가(인증서 · 계정) → 무엇을 할 수 있나(토픽 ACL).'),
  ] },

{ id: 'w7.arch', title: 'Architecture View — 온도 값 하나의 여행', slides: 'S44–S46',
  blocks: [
    { trace: { title: '24.5°C가 화면에 뜨기까지', sub: '센서 → 브로커 → 백엔드 → SSE → 브라우저', rowH: 92,
      nodes: [{ id: 's', label: 'Sensor', sub: 'ESP32', icon: 'iot', x: .03, y: 0 }, { id: 'ap', label: '공유기', icon: 'router', x: .22, y: 0 }, { id: 'b', label: 'MQTT Broker', icon: 'broker', x: .42, y: 0 }, { id: 'be', label: 'Backend', sub: '구독 · 저장', icon: 'server', x: .62, y: 0 }, { id: 'db', label: 'DB', icon: 'db', x: .62, y: 1 }, { id: 'br', label: 'Dashboard', sub: 'EventSource', icon: 'browser', x: .96, y: 0 }],
      links: [['s', 'ap', { label: 'Wi-Fi' }], ['ap', 'b', { label: 'TCP 1883' }], ['b', 'be', { label: 'MQTT' }], ['be', 'db'], ['be', 'br', { label: 'SSE' }]],
      events: [
        { from: 's', to: 's', label: '① 측정 (~1 ms)', color: 'l4', say: 'ESP32가 온도 24.5 읽음 → JSON 생성.' },
        { from: 's', to: 'b', label: '② PUBLISH 20 B (~5 ms)', color: 'l7', pkt: [mq('PUBLISH', [['topic', 'inu/bldg7/room301/temp'], ['QoS', '0'], ['연결', '이미 열려 있는 TCP']])], say: '<b>이미 열려 있는</b> TCP 연결로 보낸다 — 연결 설정 비용 없음.' },
        { from: 'b', to: 'b', label: '③ 구독자 3명 확인 · retain 갱신 (~1 ms)', color: 'l4', say: '' },
        { from: 'b', to: 'be', label: '④ on_message (~5 ms)', color: 'l7', say: '범위 검사 → DB INSERT → “방 301 업데이트” 이벤트. paho 콜백은 별도 스레드 → asyncio 큐에 넣을 땐 <b>call_soon_threadsafe</b>.' },
        { from: 'be', to: 'db', label: 'INSERT', color: 'l4', say: '' },
        { from: 'be', to: 'br', label: '⑤ data: {...}\\n\\n (~1 ms)', color: 'ok', say: '열려 있는 /events 스트림에 쓰기.' },
        { from: 'br', to: 'br', label: '⑥ onmessage → 24.5 (~10 ms)', color: 'ok', say: '합계 ≈ <b>25 ms</b>. 브라우저 3초 Polling이었다면 평균 1.5초 — 연결을 미리 열어 두는 것만으로 지연이 수십 배 준다.' },
      ] } },
    T(['', 'Sensor', 'Broker', 'Backend', 'Gateway', 'Dashboard', 'WebRTC'], [['W7 개념', 'PUBLISH · LWT · 고유 client id', 'Topic · ACL · Retain · 세션', 'SUBSCRIBE inu/# · DB · 규칙', 'SSE 또는 WebSocket', 'EventSource / WS · 재연결', '교실 카메라 P2P · TURN'], ['프로토콜', 'TCP 1883/8883', 'MQTT', 'MQTT + SQL', 'HTTP / WS', 'HTTP / WS', 'UDP (SRTP)'], ['장애 증상', '재부팅 반복 → 같은 ID 충돌', 'ACL 거부 · 폭주', '구독 누락 · 중복', '버퍼링 · 60초 끊김', '1006 · 탭 6개 제한', 'LTE에서만 실패'], ['관찰 도구', '시리얼 로그', 'mosquitto_sub -v · $SYS', '앱 로그 · DB', 'curl -N · nginx 로그', 'DevTools WS/EventStream', 'webrtc-internals']]),
    H.key('Backend가 MQTT와 브라우저 사이를 번역(<b>Bridge</b>)한다 → 브라우저에 브로커 계정을 줄 필요가 없고 인증 · 필터링을 한 곳에서. 한 시스템 안에 Pull(REST) · Push(SSE) · 양방향(WS) · Pub/Sub(MQTT) · P2P(WebRTC)가 공존한다 — 구간마다 요구사항이 다르기 때문.'),
    { h3: 'Design Choice — 질문 순서로 고른다 (S46)' },
    { lab: { title: '결정 트리', init: { a: false, b: false, c: false, d: false, e: true },
      ctl: [{ k: 'a', type: 'toggle', label: '클라이언트가 센서 · MCU 같은 제약 기기' }, { k: 'b', type: 'toggle', label: '음성 · 영상 / P2P 저지연 데이터' }, { k: 'c', type: 'toggle', label: '클라이언트도 자주 보내는 양방향' }, { k: 'd', type: 'toggle', label: '서버 → 클라이언트 단방향 스트림' }, { k: 'e', type: 'toggle', label: '변화가 드물고 몇 초 늦어도 됨' }],
      out: st => { const Q = [['a', '제약 기기인가?', 'MQTT (+ BLE 게이트웨이)'], ['b', '음성 · 영상 · P2P인가?', 'WebRTC (+ WS Signaling)'], ['c', '양방향인가?', 'WebSocket'], ['d', '서버→클라 단방향 스트림인가?', 'SSE'], ['e', '드물고 늦어도 되나?', 'Polling (Adaptive)']]; const hit = Q.findIndex(q => st[q[0]]);
        return `<div class="flow">${Q.map((q, i) => `<div class="fl-row ${hit === i ? 'stop' : hit < 0 || i < hit ? 'pass' : 'skip'}" style="${hit === i ? 'border-color:var(--ok);background:var(--ok-s)' : ''}"><span class="fl-q">${q[1]}</span><span class="fl-a">${hit === i ? 'Yes → ' + q[2] : i < hit || hit < 0 ? 'No' : ''}</span></div>`).join('')}</div>` + (hit < 0 ? '<div class="verdict">해당 없음 — 요구사항을 다시 정량화하자</div>' : `<div class="verdict ok">${Q[hit][2]}</div>`); } } },
    T(['서비스', '선택'], [['강의실 채팅', 'WebSocket'], ['LLM 답변 표시', 'SSE (fetch stream)'], ['주가 · 스코어 표시', 'SSE'], ['협업 화이트보드', 'WebSocket'], ['화상 수업', 'WebRTC + SFU'], ['교실 온습도 수집', 'MQTT'], ['심박 밴드 → 앱', 'BLE → (앱) → MQTT'], ['보고서 생성 완료', 'Polling / 202']]),
  ] },

{ id: 'w7.trouble', title: 'Common Failure Modes · Troubleshooting', slides: 'S47–S48',
  blocks: [
    T(['증상', '흔한 원인', '확인 방법'], [['SSE 이벤트가 수십 초 뒤 한꺼번에', '프록시 · CDN 버퍼링, gzip', 'curl -N 직접 vs 프록시 경유 비교'], ['WebSocket이 정확히 60초마다 끊김', 'nginx proxy_read_timeout 기본 60s, LB 유휴 타임아웃', 'close code 1006 · 주기 측정 → heartbeat'], ['WS 핸드셰이크 실패 (400 · 426)', '프록시가 Upgrade/Connection 헤더 미전달', 'Network 탭에서 101 대신 무엇이 왔는지'], ['https 페이지에서 ws:// 차단', 'Mixed Content', 'wss://로 변경'], ['새 탭을 열면 SSE가 멈춤', 'HTTP/1.1 도메인당 연결 6개 제한', '탭 수 줄여 재현 · HTTP/2 확인'], ['MQTT 클라이언트가 계속 끊겼다 붙음', '<b>같은 Client ID</b>로 두 기기가 접속', '브로커 로그 “already connected”'], ['구독했는데 메시지가 안 옴', '토픽 오타 · 대소문자 · 와일드카드 위치 · ACL 거부', "mosquitto_sub -v -t '#'"], ['재접속 후 대시보드에 오래된 값', 'Retained 메시지 (과거 값)', 'payload의 timestamp'], ['같은 Wi-Fi는 되는데 LTE에선 영상통화 실패', '<b>TURN 서버 없음</b> (대칭형 NAT)', 'webrtc-internals에서 relay 후보 유무']]),
    H.key('실시간 장애의 상당수는 코드가 아니라 <b>중간 계층(프록시 · LB · NAT · 브로커 설정)</b>과 “오래 열린 연결”의 상호작용에서 생긴다.'),
    H.pre(`$ curl -N http://localhost:8000/events          # SSE 직접
$ curl -N https://app.inu.ac.kr/events          # 프록시 경유 비교
$ websocat ws://localhost:8000/ws/301           # WebSocket 터미널 클라이언트
$ mosquitto_sub -h localhost -v -t '#'          # MQTT 모든 메시지 (토픽 포함)
$ mosquitto_sub -h localhost -v -t '$SYS/broker/clients/#'`),
    T(['대상', '어디서 보나'], [['SSE', 'DevTools Network → 요청 → EventStream 탭'], ['WebSocket', 'Network → WS 필터 → Messages 탭 (↑↓ Frame)'], ['Close code', 'ws.onclose의 e.code / e.reason'], ['WebRTC', 'chrome://webrtc-internals (ICE 후보 · 비트레이트)'], ['MQTT', 'mosquitto -v 로그 · MQTT Explorer'], ['패킷', 'Wireshark 필터: websocket · mqtt · stun']]),
    H.note('판단: CLI ✓ + 브라우저 ✕ → CORS · Mixed Content · Origin 검사 / 직접 ✓ + 프록시 ✕ → 프록시 설정.'),
  ] },

{ id: 'w7.lab', title: 'Hands-on Lab · AI 검증 · 과제', slides: 'S49–S51, S53',
  blocks: [
    { h3: 'Lab ① — Broker 띄우고 Pub/Sub 관찰 (코드 없이)' },
    H.pre(`$ docker run -d --name mqtt -p 1883:1883 eclipse-mosquitto:2 mosquitto -c /mosquitto-no-auth.conf
$ mosquitto_sub -h localhost -v -t 'inu/+/+/temp'                       # 터미널 A
$ mosquitto_pub -h localhost -t inu/bldg7/room301/temp -m '{"temp": 24.5}'   # 터미널 B
$ mosquitto_pub -t inu/bldg7/room301/temp -m '25.0' -r                  # Retain
$ mosquitto_sub -t x --will-topic devices/me/status --will-payload offline -k 5   # 강제 종료해 보기`),
    T(['', '실험', '관찰'], [['A', '와일드카드 매칭 표 8개 경우 확인', '7.18'], ['B', 'Retain 메시지를 지우려면?', '빈 메시지 + -r'], ['C', 'LWT 창을 Ctrl+C(정상) vs 강제 종료', '강제 종료만 offline 발행'], ['D', '같은 -i 클라이언트 ID로 구독 2개', '먼저 접속한 쪽이 끊김'], ['E', 'Wireshark mqtt 필터로 PUBLISH 크기', '≈ 20 B']]),
    { h3: 'Lab ② — MQTT → FastAPI → SSE 대시보드' },
    H.pre(`def on_message(c, ud, msg):                 # MQTT 스레드
    data = msg.payload.decode()
    for q in list(queues):                  # 이벤트 루프로 전달
        loop.call_soon_threadsafe(q.put_nowait, data)

@app.get("/events")
async def events(req: Request):
    q = asyncio.Queue(); queues.add(q)
    async def gen():
        try:
            while not await req.is_disconnected():
                yield f"data: {await q.get()}\\n\\n"
        finally: queues.discard(q)
    return StreamingResponse(gen(), media_type="text/event-stream")`),
    T(['#', '변경', '관찰할 것'], [['A', '센서 시뮬레이터 실행', '브라우저 숫자가 1초마다 변함'], ['B', '브로커 재시작', '센서 · bridge 재연결 여부 (재구독?)'], ['C', '탭 7개 열기', 'HTTP/1.1 연결 제한 재현'], ['D', 'yield 끝 \\n\\n 제거', 'onmessage 미호출'], ['E', '센서 강제 종료', 'LWT로 offline 표시'], ['F', '같은 기능을 3초 Polling으로', '지연 · 요청 수 비교']]),
    H.key('paho 콜백은 <b>별도 스레드</b>에서 실행된다 → asyncio 큐에 넣을 땐 <code>call_soon_threadsafe</code>. AI가 생성한 코드에서 가장 자주 빠지는 부분.'),
    { mount: el => { const C = ['센서 구간에 HTTP Polling을 제안하지 않았는가? (배터리 · 오버헤드)', '단방향 대시보드에 불필요한 WebSocket을 쓰지 않았는가?', 'MQTT client_id가 고정 문자열로 중복되지 않는가?', '구독을 on_connect 안에서 하는가? (재연결 시 재구독)', 'paho 콜백 → asyncio 전달에 스레드 안전 처리가 있는가?', 'WebSocket에 Origin 검사 · wss · 인증이 있는가?', 'QoS 2 남용 없이 중복 처리(멱등성)를 설계했는가?', '공개 브로커 · allow_anonymous true를 운영용으로 쓰지 않는가?'];
      const saved = LS.get('w7.verify', []);
      const draw = () => { el.innerHTML = `<div class="lab"><div class="lab-head"><span class="tag">체크리스트</span>VERIFY — AI 실시간 코드 검증</div><div class="lab-out">${C.map((c, i) => `<label class="ck"><input type="checkbox" data-i="${i}" ${saved.includes(i) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div></div>`;
        el.querySelectorAll('input').forEach(b => b.onchange = () => { const i = +b.dataset.i, k = saved.indexOf(i); if (b.checked && k < 0) saved.push(i); if (!b.checked && k >= 0) saved.splice(k, 1); LS.set('w7.verify', saved); draw(); }); };
      draw(); } },
    { h3: '과제 — Realtime Protocol Matrix' },
    T(['단계', '할 일'], [['STEP 1 · 서비스 선정', '성격이 다른 실시간 서비스 4개 — 지연 예산 · 방향 · 손실 허용을 숫자로'], ['STEP 2 · 비교 매트릭스', '4개 서비스 × Polling · SSE · WebSocket · WebRTC · MQTT, 칸마다 근거 + 아키텍처 그림'], ['STEP 3 · 실험 · 실패 시나리오', 'Polling vs SSE 요청 수 · 지연 측정, 서비스별 실패 시나리오 2개(끊김 · 증설 · 중복)와 대응']]),
  ] },

{ id: 'w7.qc', title: 'Quick Check — Week 7', slides: 'S52, S54', tag: '점검',
  blocks: [
    `<p>강의 팁: 먼저 “<b>누가 먼저 말하는가 · 연결은 몇 개인가 · 어느 계층(HTTP/TCP/UDP)의 이야기인가</b>”를 정하면 대부분 풀린다.</p>`,
    { qc: 'w7' },
    { h3: 'Takeaways' },
    H.cards([['Pull의 한계', 'Polling 비용은 사용자 수 ÷ 주기, 지연은 주기에 비례. 변화가 드물면 여전히 좋은 답.', ''], ['SSE = 끝나지 않는 HTTP', '서버→클라이언트 단방향 · 자동 재연결 · Last-Event-ID. LLM 스트리밍의 기반.', 'L7'], ['WebSocket = Upgrade 후 양방향', '101 핸드셰이크 · 2~14 B Frame · Ping/Pong. Origin 검사와 Scale-out은 직접.', 'L3'], ['WebRTC = P2P + UDP', 'Signaling으로 SDP · ICE 교환, STUN으로 주소 확인, 안 되면 TURN 중계.', 'L4'], ['MQTT = Broker 중심 Pub/Sub', 'Topic 계층 · 와일드카드 · Retain · LWT · 세션. 기기는 바깥으로 연결을 열어 둔다.', 'L7'], ['QoS = 비용과 보장의 교환', '0 유실 가능 · 1 중복 가능 · 2 정확히 1번. 대부분 QoS 1 + 멱등 처리.', 'L3']]),
    H.note('다음 단계 · Cloud (Week 9~) — 오늘 만든 브로커 · 게이트웨이 · 대시보드를 클라우드 위에서 확장하고 운영하기.'),
  ] },
] });

QUIZ.w7 = { bank: [], qc: [
  { q: 'Polling 주기를 3초 → 1초로 줄이면 서버 요청 수와 평균 지연은 각각 어떻게 변하는가?', ref: 'w7.polling', model: '요청률 = N / T이므로 요청 수는 <b>3배로 늘어난다</b>(N=1만이면 3,333 → 10,000 req/s). 평균 지연 = T/2이므로 <b>1.5초 → 0.5초로 줄어든다</b>. 둘을 동시에 줄일 수 없다는 것이 Polling의 한계.', kw: ['요청 수 3배 증가 (N/T)', '평균 지연 1.5 → 0.5초 (T/2)', '트레이드오프'] },
  { q: 'Long Polling에서 서버가 비동기(async)여야 하는 이유는?', ref: 'w7.long', model: '요청 하나가 데이터가 생길 때까지(예: 30초) <b>응답을 보류</b>한 채 서버 자원을 점유한다. 동기 서버는 요청마다 스레드를 붙잡아 수백 명만 접속해도 <b>스레드가 바닥난다</b>. async면 기다리는 동안 다른 요청을 처리할 수 있다.', kw: ['응답 보류 동안 자원 점유', '동기 = 스레드 고갈', 'async는 대기 중 다른 일'] },
  { q: 'SSE와 WebSocket의 방향성 차이는? LLM 스트리밍에 SSE가 많이 쓰이는 이유는?', ref: 'w7.ssecode', model: 'SSE는 <b>서버 → 클라이언트 단방향</b>, WebSocket은 <b>양방향(Full-duplex)</b>. LLM은 질문 1번 → 답변 스트림 1번이라 단방향이면 충분하고, SSE는 평범한 HTTP라 인증 · TLS · 프록시를 그대로 쓴다(질문은 POST Body라 fetch로 스트림을 읽는다).', kw: ['SSE 단방향 · WS 양방향', '질문 1번 → 답 스트림', 'HTTP 그대로 (인프라 친화)'] },
  { q: 'SSE 이벤트 끝에 빈 줄이 없으면 무슨 일이 생기는가? Last-Event-ID의 역할은?', ref: 'w7.sse', model: '빈 줄이 이벤트의 끝이므로, 없으면 브라우저가 이벤트를 디스패치하지 않아 <b>onmessage가 호출되지 않는다</b>. <b>Last-Event-ID</b>는 재연결 시 브라우저가 마지막으로 받은 id를 자동으로 보내는 헤더로, 서버가 그 다음 이벤트부터 이어서 보내 누락 없이 재개(Resume)하게 한다.', kw: ['빈 줄 = 이벤트 끝', 'onmessage 미호출', 'Last-Event-ID = 재연결 시 이어받기'] },
  { q: 'WebSocket 핸드셰이크의 응답 상태 코드는? Sec-WebSocket-Accept는 암호화인가?', ref: 'w7.ws', model: '<b>101 Switching Protocols</b> (200 아님). Sec-WebSocket-Accept는 Key + 고정 GUID의 SHA-1을 Base64한 <b>증명값</b>으로, 진짜 WebSocket 서버인지 확인할 뿐 <b>암호화가 아니며</b> 이후 메시지 암호화 키로도 쓰이지 않는다. 암호화는 wss(TLS).', kw: ['101 Switching Protocols', 'Accept = 해시 증명값', '암호화 아님 · 암호화는 wss'] },
  { q: 'WebSocket은 CORS의 보호를 받는가? 서버가 대신 검사해야 하는 헤더는?', ref: 'w7.wssec', model: '<b>받지 않는다.</b> 브라우저는 WebSocket에 SOP · CORS를 적용하지 않아 다른 사이트 페이지도 쿠키를 실어 연결할 수 있다(CSWSH). 서버가 핸드셰이크의 <b>Origin</b> 헤더를 허용 목록과 비교해 거부(403 / 1008)해야 한다.', kw: ['CORS 적용 안 됨', 'Origin 헤더 검사', 'CSWSH'] },
  { q: 'WebRTC에서 STUN과 TURN의 차이는? Signaling은 누가 정하는가?', ref: 'w7.nat', model: '<b>STUN</b>은 NAT 바깥에서 보이는 내 공인 IP:포트를 알려 주는 가벼운 서버(미디어는 안 거침). <b>TURN</b>은 P2P가 실패할 때 <b>모든 미디어를 중계</b>하는 서버(확실하지만 비쌈). Signaling은 WebRTC 표준에 <b>정해져 있지 않아</b> 개발자가 직접(보통 WebSocket) 구현한다.', kw: ['STUN = 바깥 주소 확인', 'TURN = 중계', 'Signaling은 표준 없음 · 직접 구현'] },
  { q: 'MQTT에서 inu/+/temp 구독은 inu/bldg7/301/temp를 받는가?', ref: 'w7.topic', model: '<b>받지 않는다.</b> +는 정확히 <b>한 단계</b>만 대응하는데 inu와 temp 사이가 bldg7/301 두 단계다. 받으려면 inu/+/+/temp 또는 inu/#.', kw: ['받지 않음', '+ = 정확히 한 단계', 'inu/+/+/temp 또는 inu/#'] },
  { q: 'QoS 1에서 중복이 생길 수 있는 이유와 대처법은? QoS 2가 항상 최선인가?', ref: 'w7.qos', model: 'PUBACK이 유실되면 송신자는 전달 여부를 몰라 <b>DUP=1로 재전송</b>하므로 수신자가 같은 메시지를 두 번 받을 수 있다. 대처: 메시지에 고유 id를 넣고 <b>이미 처리한 id는 무시</b>(멱등 처리). QoS 2는 4-way로 정확히 한 번이지만 느리고 상태 저장 부담이 커서 항상 최선은 아니다 — 대부분 QoS 1 + 멱등.', kw: ['ACK 유실 → 재전송 → 중복', '고유 id로 중복 제거 (멱등)', 'QoS 2는 비쌈 · 항상 최선 아님'] },
  { q: 'Retained message와 Last Will은 각각 언제 쓰는가?', ref: 'w7.retain', model: '<b>Retained</b>: 토픽의 마지막 값 1개를 브로커가 저장해 <b>새 구독자가 구독 즉시</b> 현재 상태를 받게 할 때(대시보드의 현재 온도 · 기기 상태). <b>Last Will</b>: 클라이언트가 Keep Alive 초과 등으로 <b>비정상 종료</b>될 때 브로커가 대신 발행할 메시지(예: status=offline). 정상 DISCONNECT면 발행 안 됨.', kw: ['Retained = 새 구독자에게 마지막 값 즉시', 'LWT = 비정상 종료 시 대신 발행', '정상 DISCONNECT면 LWT 없음'] },
] };
})();
