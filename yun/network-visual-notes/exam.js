/* 시험 대비 — summary, random quiz, confusing pairs, notes to double-check */
'use strict';
(function () {
const T = H.tbl;

function mountBank(host) {
  const weeks = ['w1', 'w2', 'w3', 'w4'];
  let sel = LS.get('bank.weeks', weeks.slice()), round = [], i = 0;
  const box = document.createElement('div'); host.appendChild(box);
  const newRound = () => {
    const rng = rngFrom(Date.now() & 0xffffffff); const wrong = LS.get('wrong', []);
    const pool = []; sel.forEach(w => (QUIZ[w].bank || []).forEach((q, k) => pool.push({ ...q, qid: w + ':' + k, w })));
    const pri = rng.shuffle(pool.filter(q => wrong.includes(q.qid))), rest = rng.shuffle(pool.filter(q => !wrong.includes(q.qid)));
    round = rng.shuffle(pri.concat(rest).slice(0, Math.min(10, pool.length))).map(q => ({ ...q, order: rng.shuffle(q.opts.map((_, j) => j)), picked: null }));
    i = 0; draw();
  };
  function draw() {
    const done = round.filter(q => q.picked != null), right = done.filter(q => q.order[q.picked] === q.a).length;
    let h = `<div class="lab"><div class="lab-head"><span class="tag">모의 퀴즈</span>문제은행 ${weeks.reduce((a, w) => a + QUIZ[w].bank.length, 0)}문항에서 10문제 · 틀린 문제는 다음 라운드에 먼저 나온다</div><div class="lab-ctl">${weeks.map(w => `<div class="ctl tog"><input type="checkbox" id="bk-${w}" value="${w}" ${sel.includes(w) ? 'checked' : ''}><label for="bk-${w}">${w.slice(1)}주 (${QUIZ[w].bank.length})</label></div>`).join('')}<button class="btn" data-new>이 범위로 새 라운드</button><span class="mono cm" style="margin-left:auto">${right} / ${done.length} 정답 · ${round.length}문제</span></div><div class="lab-out">`;
    if (i < round.length) {
      const q = round[i];
      h += `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px">${round.map((r, k) => `<button class="btn sm" data-go="${k}" style="min-width:34px;${k === i ? 'background:var(--btn);color:var(--btn-ink);border-color:var(--btn)' : r.picked != null ? (r.order[r.picked] === r.a ? 'border-color:var(--ok);color:var(--ok)' : 'border-color:var(--bad);color:var(--bad)') : ''}">${k + 1}</button>`).join('')}<button class="btn sm" data-go="${round.length}">결과</button></div>
<div class="q" style="font-weight:600;font-size:17px;margin-bottom:6px">${i + 1}. ${q.q}</div><div class="mc">${q.order.map((oi, j) => { const cls = q.picked == null ? '' : oi === q.a ? 'right' : j === q.picked ? 'wrong' : ''; return `<button data-pick="${j}" class="${cls}" ${q.picked != null ? 'disabled' : ''}>${String.fromCharCode(9312 + j)} ${q.opts[oi]}</button>`; }).join('')}</div>`;
      if (q.picked != null) h += `<div class="model"><div class="mh">${q.order[q.picked] === q.a ? '정답' : '오답'}</div>${q.why}<div style="margin-top:6px">${H.ref(q.ref, '관련 설명으로 이동')}</div></div><div style="margin-top:10px"><button class="btn pri" data-go="${i + 1}">${i + 1 < round.length ? '다음 문제 ▶' : '결과 보기 ▶'}</button></div>`;
    } else {
      const wrongs = round.filter(q => q.picked != null && q.order[q.picked] !== q.a);
      h += `<div class="big" style="margin-bottom:8px">${right} / ${round.length}</div>${done.length < round.length ? `<p class="cm">안 푼 문제 ${round.length - done.length}개</p>` : ''}${wrongs.length ? `<p><b>틀린 문제</b> — 다음 라운드에 먼저 나온다</p><ul>${wrongs.map(q => `<li>${q.q} ${H.ref(q.ref, '복습')}</li>`).join('')}</ul>` : done.length ? '<p>모두 맞혔다. 새 라운드로 다른 문제를 풀어 보자.</p>' : ''}<button class="btn pri" data-new>새 라운드</button>`;
    }
    box.innerHTML = h + '</div></div>';
    box.querySelectorAll('[data-new]').forEach(b => b.onclick = () => { sel = weeks.filter(w => box.querySelector('#bk-' + w).checked); if (!sel.length) sel = weeks.slice(); LS.set('bank.weeks', sel); newRound(); });
    box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { i = +b.dataset.go; draw(); });
    box.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { const q = round[i]; q.picked = +b.dataset.pick; let w = LS.get('wrong', []); w = q.order[q.picked] !== q.a ? [...new Set([...w, q.qid])] : w.filter(x => x !== q.qid); LS.set('wrong', w); draw(); });
    box.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => APP.goto(b.dataset.goto));
  }
  newRound();
}

/* ---------- OX random mock quiz ---------- */
function mountOX(host) {
  const weeks = ['w1', 'w2', 'w3', 'w4', 'w5', 'quiz'].filter(w => OXBANK[w]);
  const gl = w => w === 'quiz' ? '퀴즈 기출' : w.slice(1) + '주';
  const ALL = []; weeks.forEach(w => OXBANK[w].forEach((r, k) => ALL.push({ id: w + ':' + k, w, no: k + 1, q: r[0], a: r[1], why: r[2], ref: r[3] })));
  let sel = LS.get('ox.groups', weeks.slice()).filter(w => weeks.includes(w)), cnt = LS.get('ox.cnt', 50), round = [], i = 0, onlyWrong = false;
  if (![50, 100, 'all'].includes(cnt)) cnt = 50;
  const box = document.createElement('div'); host.appendChild(box);
  const wrongSet = () => new Set(LS.get('ox.wrong', []));
  function newRound(wrongOnly) {
    onlyWrong = !!wrongOnly;
    const rng = rngFrom((Date.now() ^ (Math.random() * 1e9)) >>> 0); const W = wrongSet();
    let pool = ALL.filter(q => sel.includes(q.w)); if (onlyWrong) pool = pool.filter(q => W.has(q.id));
    const n = cnt === 'all' ? pool.length : Math.min(+cnt, pool.length);
    const pri = rng.shuffle(pool.filter(q => W.has(q.id))), rest = rng.shuffle(pool.filter(q => !W.has(q.id)));
    round = rng.shuffle(pri.concat(rest).slice(0, n)).map(q => ({ ...q, pick: null }));
    i = 0; draw();
  }
  function answer(v) {
    const q = round[i]; if (!q || q.pick) return; q.pick = v;
    const W = wrongSet(); if (v === q.a) W.delete(q.id); else W.add(q.id); LS.set('ox.wrong', [...W]);
    draw();
  }
  function draw() {
    const done = round.filter(q => q.pick), right = done.filter(q => q.pick === q.a).length, W = wrongSet();
    let h = `<div class="lab oxq"><div class="lab-head"><span class="tag">OX 모의 퀴즈</span>문제은행 ${ALL.length}문항 · 매 라운드 무작위 · 틀린 문제는 다음 라운드에 먼저</div>
<div class="lab-ctl">${weeks.map(w => `<div class="ctl tog"><input type="checkbox" id="ox-${w}" value="${w}" ${sel.includes(w) ? 'checked' : ''}><label for="ox-${w}">${gl(w)} (${OXBANK[w].length})</label></div>`).join('')}
<div class="ctl"><label for="ox-cnt">문항 수</label><select id="ox-cnt">${[['50', '50'], ['100', '100'], ['all', '범위 전체']].map(([v, l]) => `<option value="${v}" ${String(cnt) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
<button class="btn pri" data-new>새 라운드</button><button class="btn" data-wrong ${W.size ? '' : 'disabled'}>내 오답만 (${W.size})</button></div><div class="lab-out">`;
    if (!round.length) h += `<p>${onlyWrong ? '선택한 범위에 저장된 오답이 없다.' : '선택한 범위에 문제가 없다.'}</p>`;
    else if (i < round.length) {
      const q = round[i];
      h += `<div class="oxbar"><div class="oxprog"><i style="width:${done.length / round.length * 100}%"></i></div><span class="mono">${i + 1} / ${round.length} · 정답 ${right}</span></div>
<div class="oxdots">${round.map((r, k) => `<button data-go="${k}" class="${k === i ? 'cur' : r.pick ? (r.pick === r.a ? 'ok' : 'no') : ''}" aria-label="${k + 1}번">${k + 1}</button>`).join('')}</div>
<div class="oxcard"><div class="oxmeta">${q.w === 'quiz' ? `<b style="color:var(--l7)">퀴즈 기출 #${q.no}</b>` : q.w.slice(1) + '주차'}${W.has(q.id) && !q.pick ? ' · <b>지난번 오답</b>' : ''}</div><div class="oxq-t">${q.q}</div>
<div class="oxbtn"><button data-ox="O" class="o ${q.pick ? (q.a === 'O' ? 'right' : q.pick === 'O' ? 'wrong' : 'dim') : ''}" ${q.pick ? 'disabled' : ''}>O</button><button data-ox="X" class="x ${q.pick ? (q.a === 'X' ? 'right' : q.pick === 'X' ? 'wrong' : 'dim') : ''}" ${q.pick ? 'disabled' : ''}>X</button></div>`;
      if (q.pick) h += `<div class="model"><div class="mh">${q.pick === q.a ? '⭕ 정답' : '❌ 오답'} — 정답은 ${q.a}</div>${q.why}<div style="margin-top:6px">${H.ref(q.ref, '관련 설명으로 이동')}</div></div><div style="margin-top:12px;display:flex;gap:8px"><button class="btn pri" data-go="${i + 1}">${i + 1 < round.length ? '다음 문제 ▶' : '결과 보기 ▶'}</button></div>`;
      else h += `<p class="cm" style="font-size:13px;margin:10px 0 0">키보드: O / X 로 답하고 Enter 또는 → 로 다음 문제</p>`;
      h += `</div>`;
    } else {
      const wr = round.filter(q => q.pick && q.pick !== q.a);
      const byW = weeks.filter(w => round.some(q => q.w === w)).map(w => { const r = round.filter(q => q.w === w); return `${gl(w)} ${r.filter(q => q.pick === q.a).length}/${r.length}`; }).join(' · ');
      h += `<div class="big" style="margin-bottom:4px">${right} / ${round.length}</div><p class="mono cm" style="margin:0 0 10px">${byW}${done.length < round.length ? ` · 안 푼 문제 ${round.length - done.length}` : ''}</p>`;
      if (wr.length) h += `<p><b>틀린 문제 ${wr.length}개</b> — 해설과 함께 다시 보기</p><div class="oxrev">${wr.map(q => `<div><div class="oxq-t" style="font-size:15.5px">${q.q} <b class="mono">→ ${q.a}</b></div><div class="cm" style="font-size:14px">${q.why} ${H.ref(q.ref, '복습')}</div></div>`).join('')}</div>`;
      else if (done.length) h += '<p>전부 맞혔다. 범위를 넓히거나 새 라운드로 다른 문제를 풀어 보자.</p>';
      h += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn pri" data-new>새 라운드</button>${wr.length ? `<button class="btn" data-retry>방금 틀린 ${wr.length}문제 다시</button>` : ''}</div>`;
    }
    box.innerHTML = h + '</div></div>';
    const readSel = () => { sel = weeks.filter(w => box.querySelector('#ox-' + w).checked); if (!sel.length) sel = weeks.slice(); LS.set('ox.groups', sel); cnt = box.querySelector('#ox-cnt').value; if (cnt !== 'all') cnt = +cnt; LS.set('ox.cnt', cnt); };
    box.querySelectorAll('[data-new]').forEach(b => b.onclick = () => { readSel(); newRound(false); });
    const wb = box.querySelector('[data-wrong]'); if (wb) wb.onclick = () => { readSel(); newRound(true); };
    const rb = box.querySelector('[data-retry]'); if (rb) rb.onclick = () => { const ids = new Set(round.filter(q => q.pick && q.pick !== q.a).map(q => q.id)); round = rngFrom(Date.now() >>> 0).shuffle(round.filter(q => ids.has(q.id))).map(q => ({ ...q, pick: null })); i = 0; draw(); };
    box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { i = +b.dataset.go; draw(); });
    box.querySelectorAll('[data-ox]').forEach(b => b.onclick = () => answer(b.dataset.ox));
    box.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => APP.goto(b.dataset.goto));
  }
  box.tabIndex = -1;
  document.addEventListener('keydown', e => {
    if (!box.isConnected || !round.length || i >= round.length) return;
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const r = box.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const k = e.key.toLowerCase();
    if (k === 'o' || k === '0') { answer('O'); e.preventDefault(); }
    else if (k === 'x') { answer('X'); e.preventDefault(); }
    else if ((k === 'enter' || k === 'arrowright') && round[i].pick) { i++; draw(); e.preventDefault(); }
  });
  newRound(false);
}

const PAIRS = [
  ['Connection refused', 'SYN이 서버 OS에 <b>도착</b> → 그 포트에 listen 소켓 없음 → <b>RST</b>. 조사: 프로세스 실행 · 포트 · bind 주소(127.0.0.1?)', 'Connection timed out', 'SYN에 <b>응답이 아예 없음</b> → 도착했는지조차 모름. 조사: 방화벽 · Security Group · 라우팅 · NAT', 'w3.diag'],
  ['TIME_WAIT', '<b>내가 먼저</b> 닫은 쪽. 2×MSL(≈60s) 후 자동 소멸. 정상 동작의 흔적 — <b>양</b>이 문제. 대응: Keep-Alive · 커넥션 풀 · SO_REUSEADDR', 'CLOSE_WAIT', '<b>상대가 먼저</b> 닫았는데 내 앱이 close() 안 함. 무한정. 버그의 흔적 — <b>존재</b>가 문제. 대응: with · finally', 'w3.close'],
  ['Flow control (rwnd)', '<b>수신자</b> 보호. 수신자가 버퍼 남은 양을 ACK에 광고. 0이면 정지 — 원인은 느린 수신 앱', 'Congestion control (cwnd)', '<b>네트워크</b> 보호. 송신자가 손실·지연으로 혼잡을 추정. SS ×2 → CA +1 → ½ 또는 1. 실제 전송량 = min(rwnd, cwnd)', 'w3.flow'],
  ['MAC (L2)', '“이 링크에서 <b>다음 장비</b>”. Router를 지날 때마다 <b>새로 씀</b>. ARP로 알아냄', 'IP (L3)', '“<b>최종 목적지</b>”. 끝까지 <b>유지</b>(NAT 없을 때). tracert = IP가 지나온 Router 목록', 'w2.hop'],
  ['Port', '호스트 안의 프로세스를 가리키는 <b>16비트 번호</b>(주소)', 'Socket', '그 주소에 묶인 <b>통신 창구 객체</b> = 파일 디스크립터. 연결은 4-tuple. 한 포트에 소켓 수천 개(listen 1 + 연결 N)', 'w3.sock'],
  ['UDP demux (2-tuple)', '목적지 IP·Port만 본다 → 출발지가 달라도 같은 소켓', 'TCP demux (4-tuple)', '출발지 IP·Port까지 → 연결마다 별도 소켓', 'w3.mux'],
  ['재귀 질의', '<b>클라이언트 ↔ 리졸버</b>. “끝까지 알아와 줘”', '반복 질의', '<b>리졸버 ↔ Root · TLD · 권한 서버</b>. “나는 모른다, 저기 물어봐”(referral)', 'w4.resolve'],
  ['no-cache', '저장은 <b>한다</b>. 쓰기 전에 매번 검증(If-None-Match → 304)', 'no-store', '저장 자체를 <b>안 한다</b>. 개인정보·토큰 응답', 'w4.cache'],
  ['401 Unauthorized', '<b>누구인지 모름</b> — 토큰 없음·만료 → Authorization 헤더', '403 Forbidden', '<b>누군지 알지만 권한 없음</b> → 권한·역할', 'w4.status'],
  ['404', '보통 <b>App Server</b>가 만든 응답(경로 없음). DNS·TCP·TLS는 성공', '502 / 504', '<b>프록시·LB</b>가 만든 응답 — 뒷단 연결 실패 / 시간 초과 (3주차 refused·timeout의 번역)', 'w4.status'],
  ['3 dup ACK', '가벼운 손실(뒤 데이터는 도착 중) → 빠른 재전송 → cwnd ½', '타임아웃 (RTO)', '심각한 혼잡 → 재전송 + 지수 백오프 → cwnd = 1, Slow Start부터. 마지막 조각 유실 시 이쪽', 'w3.loss'],
  ['0.0.0.0 bind', '이 PC의 <b>모든 NIC</b>에서 수신 → LAN에서 접속 가능(방화벽 허용 시)', '인터넷 공개', 'Public IP + NAT 포트포워딩/터널 + 방화벽 허용이 <b>따로</b> 필요', 'w2.addr'],
  ['HTTP/2', 'TCP 위 스트림 다중화 → HTTP 계층 HOL 해결. 패킷 하나 유실 시 <b>모든 스트림 대기</b>(TCP 계층 HOL)', 'HTTP/3 (QUIC)', 'UDP 위 → <b>유실된 스트림만</b> 대기. 1 RTT(재방문 0). Connection ID로 IP 바뀌어도 유지', 'w4.ver'],
];
const NOTES = [
  ['TTL의 뜻', '필기에 “Time to Limit”으로 적힌 부분 → <b>Time To Live</b>. DNS·캐시 응답을 재사용해도 되는 유효 시간(초). IP 헤더의 TTL은 hop 수 한도로, 이름은 같아도 뜻이 다르다(1.9 tracert).', 'w4.ttl'],
  ['UDP는 단방향?', '필기 “UDP → 단방향, 받기만 함”은 오해 소지가 있다. UDP도 양방향으로 보낸다(echo 서버가 sendto로 답함). 차이는 <b>연결 상태가 없어</b> 매번 상대 주소를 지정한다는 것. 강의 핵심: UDP demux는 2-tuple, 서버·클라이언트 관계가 명확하지 않음.', 'w3.sock'],
  ['RTO 추정식', '필기의 RTT_O ← α·RTT_N + (1−α)·RTT_O (α≈0.1)는 <b>SRTT의 지수 가중 이동평균</b>이다(표준 α = 1/8). 슬라이드는 여기에 변동폭 RTTVAR을 더해 <b>RTO = SRTT + 4×RTTVAR</b>로 정한다.', 'w3.rto'],
  ['Slow Start 그래프 마지막 구간', '타임아웃 뒤 ssthresh가 절반(≈17)이 되므로 cwnd는 1→2→4→8→16 다음 <b>17에서 +1 선형으로 바뀌어야</b> 한다. 슬라이드 그림은 32 근처까지 지수 증가로 그려져 있다(필기 “이상한 듯”이 맞음).', 'w3.cc'],
  ['“요즘 트렌드는 UDP”', '정확히는 <b>UDP 위에 신뢰성·혼잡제어·암호화를 구현한 QUIC(HTTP/3)</b>의 확산이다. UDP를 그냥 쓰면 TCP가 해 주던 일을 앱이 다시 만들어야 한다(“UDP는 생략이다”).', 'w3.udp'],
  ['4xx = 프론트, 5xx = 백엔드?', '대략적인 감으로는 맞지만 정확히는 <b>4xx = 요청을 바꿔야 함</b>(호출하는 쪽: URL·토큰·본문), <b>5xx = 서버·중간 장비 실패</b>(재시도 후보, 멱등일 때만). 502·504는 프록시가 만든다.', 'w4.status'],
  ['옛 SYN에 대해 Client가 “무시”', '실제 TCP는 보통 <b>RST</b>로 거절한다. 어느 쪽이든 핵심은 같다 — Client의 세 번째 ACK가 없으면 연결이 성립하지 않아 Server 자원이 낭비되지 않는다.', 'w3.hs'],
];

addWeek({ id: 'ex', num: 'E', short: '시험 대비', title: '퀴즈 10/19 · 중간고사 11/3', range: '1~5주차',
  lead: '필기 기준 “원론적·이론적 내용 위주, 각 챕터 마지막 Quick Check 중요”. 주차별 핵심 → 랜덤 모의 퀴즈 → 헷갈리는 짝 → 필기와 대조할 점 순서로 정리한다.',
  sections: [
{ id: 'ex.guide', title: '주차별 핵심 (Takeaways)', slides: 'W1 S30 · W2 S42 · W3 S42 · W4 S44',
  blocks: [
    `<ol><li><b>Quick Check 32문항</b>(1.10 · 2.18 · 3.23 · 4.22)을 먼저 내 말로 답하고, 모범 답안의 핵심 요소 체크로 빠진 것을 확인한다.</li><li><b>랜덤 OX 모의 퀴즈</b>(E.2, 1~5주차 + 퀴즈 기출 100)로 섞어서 확인한다. 틀린 문제는 다음 라운드에 먼저 나오고, “관련 설명으로 이동”이 해당 섹션으로 데려간다. 객관식(E.3)은 보조 연습.</li><li><b>헷갈리는 짝</b>(E.4)과 <b>필기와 대조할 점</b>(E.5)을 훑는다.</li><li>계산형(서브넷 · Seq/ACK · cwnd · 연결 비용)은 각 주차 끝 ✎ 연습에서 🎲로 반복한다.</li></ol>`,
    H.note('OX 문제은행은 1~5주차와 10/19 퀴즈 기출 100문항까지, 객관식과 헷갈리는 짝은 1~4주차 범위다. 중간고사 유형(OX · 약어 원래 이름 · 서술형) 연습과 모의시험은 <b>중간고사</b> 탭에 있다.'),
    H.cards([['1주 · 큰 그림', 'Internet = Network of Networks · Client/Server는 역할 · Cloud/Edge는 처리 위치 · Latency ≠ Bandwidth, Throughput은 병목 · 문제는 “어느 계층인가”', ''], ['2주 · 주소 → 경로 → 변환 → 서비스', 'IP AND Mask로 판단 · next hop만 결정(LPM) · MAC은 hop마다, IP는 유지 · 나가야 돌아온다(NAT) · 0.0.0.0 ≠ 공개', 'L3'], ['3주 · 연결은 상태다', '포트 = 프로세스 주소, 연결 = 4-tuple · 신뢰성 = 번호 + 확인 + 재전송 · rwnd(수신자) vs cwnd(네트워크) · UDP는 생략 · listen vs 연결 소켓, 열었으면 닫자', 'L4'], ['4주 · DNS · HTTP · HTTPS', 'URL 분해(host만 DNS) · DNS = 위임 + 캐시(TTL) · 시작줄+헤더+빈 줄+본문 · 멱등성이 재시도를 결정 · 상태 코드 = 누가 답했나 · 버전은 싣는 방법 · HTTPS는 무엇을 숨기고 어디는 못 숨김', 'L7']]),
  ] },
{ id: 'ex.ox', title: '랜덤 OX 모의 퀴즈', slides: 'OX 문제은행 · 퀴즈 기출', tag: '점검', blocks: [`<p>1~4주차 각 50문항 · 5주차 44문항(아래 범위 체크) · <b>10/19 퀴즈 기출 100문항</b>의 OX 문제은행에서 무작위로 뽑는다. 기출만 풀려면 “퀴즈 기출”만 체크한다. 답하면 바로 해설이 나오고, 틀린 문제는 이 브라우저에 저장되어 다음 라운드에 먼저 나온다. “내 오답만”으로 틀린 것만 모아 풀 수 있다.</p>`, { mount: mountOX }] },
{ id: 'ex.bank', title: '객관식 연습', slides: '객관식 62문항', tag: '연습', blocks: [{ mount: mountBank }] },
{ id: 'ex.pairs', title: '헷갈리는 짝 비교', slides: '1~4주차',
  blocks: PAIRS.map(([a, ad, b, bd, ref]) => `<div class="pair"><div><h4>${a}</h4><p>${ad}</p></div><div><h4>${b}</h4><p>${bd}</p></div></div><div style="margin:-2px 0 16px">${H.ref(ref)}</div>`) },
{ id: 'ex.notes', title: '필기와 대조해 볼 점', slides: '중간 필기 PDF',
  blocks: NOTES.map(([t, d, ref]) => `<h3 class="sub">${t}</h3><p>${d}</p><p>${H.ref(ref)}</p>`) },
] });
})();
