/* Week 3 — TCP, UDP & Socket */
'use strict';
(function () {
const T = H.tbl;
const ip = (s, d) => ({ L: 'L3', n: 'IP', f: [['Src', s], ['Dst', d]] });
const tcp = (sp, dp, seq, ack, flags, extra = []) => ({ L: 'L4', n: 'TCP', f: [['Src Port', sp], ['Dst Port', dp], ['Flags', flags], ['Seq', seq], ['Ack', ack ?? '—'], ...extra] });
const udp = (s, d, extra = []) => ({ L: 'L4', n: 'UDP', f: [['Src Port', s], ['Dst Port', d], ...extra] });
const data = s => ({ L: 'L7', n: 'Data', f: [['payload', s]] });
const slot = (st, out, spec) => { const s = out.querySelector('.slot'); if (!s) return; s.innerHTML = ''; mountTrace(s, spec); };
const fmtB = b => b >= 1e6 ? (b / 1e6).toFixed(2) + ' MB' : b >= 1e3 ? (b / 1e3).toFixed(1) + ' KB' : b.toFixed(0) + ' B';
const parseEv = s => { const ev = {}; String(s).split(/[,\s]+/).forEach(x => { const m = x.match(/^(\d+)(d|t)/i); if (m) ev[+m[1]] = /d/i.test(m[2]) ? 'dup' : 'to'; }); return ev; };
const roundTable = d => { const ch = []; for (let i = 0; i < d.length; i += 16) ch.push(d.slice(i, i + 16)); return ch.map(c => `<div class="tw"><table class="t"><tr><th>round</th>${c.map(x => `<td class="m">${x.t}</td>`).join('')}</tr><tr><th>cwnd</th>${c.map(x => `<td class="m" style="font-weight:600;color:var(--${x.cw < x.ss ? 'l3' : 'ok'})">${x.cw}</td>`).join('')}</tr><tr><th>ssthresh</th>${c.map(x => `<td class="m" style="color:var(--l4)">${x.ss}</td>`).join('')}</tr></table></div>`).join(''); };

/* handshake trace */
const hsTrace = (x, y, title) => ({ mode: 'ladder', title: title || '3-Way Handshake', lanes: [{ id: 'c', label: 'Client', sub: '203.0.113.5:52310' }, { id: 's', label: 'Server', sub: '198.51.100.9:443' }],
  span: [{ a: 1, b: 2, text: '1 RTT', until: 2, x: 30 }],
  events: [
    { from: 'c', to: 'c', label: '', state: { c: 'CLOSED', s: 'LISTEN' }, color: 'l1', say: '시작: Server는 <code>listen()</code>으로 <b>LISTEN</b> 상태, Client는 아직 CLOSED. 연결이 아직 어디에도 “없다”.', row: 0, tall: .5 },
    { from: 'c', to: 's', label: 'SYN', sub: `seq=${x}`, state: { c: 'SYN_SENT' }, pkt: [ip('203.0.113.5', '198.51.100.9'), tcp(52310, 443, x, null, 'SYN')], say: `Client가 자기 초기 순서번호(ISN) <b>x = ${x}</b>를 담아 SYN을 보낸다 → <b>SYN_SENT</b>.` },
    { from: 's', to: 'c', label: 'SYN + ACK', sub: `seq=${y}  ack=${x + 1}`, state: { s: 'SYN_RCVD' }, pkt: [ip('198.51.100.9', '203.0.113.5'), tcp(443, 52310, y, x + 1, 'SYN, ACK')], say: `Server는 자기 ISN <b>y = ${y}</b>를 보내면서 <b>ack = x+1 = ${x + 1}</b>으로 “x까지 받았다, 다음엔 ${x + 1}을 다오”라고 답한다. <b>SYN도 1바이트로 센다</b>(그래서 +1). → SYN_RCVD` },
    { from: 'c', to: 's', label: 'ACK', sub: `seq=${x + 1}  ack=${y + 1}`, state: { c: 'ESTABLISHED' }, pkt: [ip('203.0.113.5', '198.51.100.9'), tcp(52310, 443, x + 1, y + 1, 'ACK')], say: `Client가 <b>ack = y+1 = ${y + 1}</b>으로 Server의 ISN을 확인한다. Client는 ESTABLISHED. 여기까지 <b>1 RTT</b>.` },
    { from: 's', to: 's', label: 'ESTABLISHED', state: { s: 'ESTABLISHED' }, color: 'ok', say: 'ACK를 받은 Server도 ESTABLISHED. 양쪽 커널에 이 연결의 상태(TCB)가 생겼다 — 이것이 “연결”이다.' },
    { from: 'c', to: 's', label: 'DATA', sub: `seq=${x + 1}부터 payload`, pkt: [ip('203.0.113.5', '198.51.100.9'), tcp(52310, 443, x + 1, y + 1, 'PSH, ACK'), data('GET / …')], say: `실제 데이터는 seq = ${x + 1}부터. (Wireshark는 보기 편하게 상대값 Seq=0, 1로 보여 준다 — Lab 2의 SYN 뒤 Ack=1.)` },
  ] });

/* lost-segment trace */
function lossTrace(lost, N = 6) {
  const mss = 1460, ev = [], got = new Set(); let acked = 1;
  const buf = () => [...Array(N).keys()].filter(i => got.has(i)).map(i => { const s = 1 + i * mss; const inOrder = s < acked; return [`${s}~${s + mss - 1}`, inOrder ? '앱에 전달 ✓' : '버퍼 보관 (앞에 구멍)']; });
  for (let i = 0; i < N; i++) {
    const seq = 1 + i * mss, isLost = i + 1 === lost;
    ev.push({ from: 's', to: 'r', label: `seq=${seq}`, drop: isLost, pkt: [tcp(52310, 443, seq, null, 'ACK', [['Len', mss]])], say: isLost ? `<b>${i + 1}번째 세그먼트(seq=${seq}) 유실.</b>` : `${i + 1}번째 세그먼트 전송.`, tables: { buf: buf() } });
    if (!isLost) {
      got.add(i); while (got.has((acked - 1) / mss)) acked += mss;
      const dup = lost && i + 1 > lost;
      ev.push({ from: 'r', to: 's', label: `ACK ${acked}${dup ? ' (dup)' : ''}`, color: dup ? 'bad' : 'ok', pkt: [tcp(443, 52310, '…', acked, 'ACK')], tables: { buf: buf() }, say: dup ? `뒤 세그먼트는 도착했지만 ${1 + (lost - 1) * mss}이 비어 있어 <b>같은 ACK ${acked}를 반복</b>(중복 ACK ${i + 1 - lost}번째). 도착한 조각은 버퍼에만 보관된다 — Head-of-Line Blocking.` : `누적 ACK ${acked}: “${acked - 1}번째 바이트까지 빠짐없이 받았다.”` });
    }
  }
  if (lost) {
    const d = N - lost, rs = 1 + (lost - 1) * mss;
    if (d >= 3) ev.push({ from: 's', to: 'r', label: `재전송 seq=${rs}`, color: 'l7', state: { s: '3 dup ACK!' }, pkt: [tcp(52310, 443, rs, null, 'ACK', [['Len', mss]])], say: '<b>중복 ACK 3개</b> = “그 조각만 없다”는 충분한 증거 → 타이머를 기다리지 않고 <b>빠른 재전송(Fast Retransmit)</b>. cwnd는 절반으로(3.14).' });
    else { ev.push({ kind: 'gap', text: `— 중복 ACK ${d}개뿐 → RTO 만료까지 대기 —`, say: `뒤따르는 데이터가 ${d}개라 중복 ACK가 3개에 못 미친다. ${lost === N ? '<b>마지막 조각이 유실되면 중복 ACK 자체가 생기지 않는다.</b>' : ''} 결국 타임아웃(RTO)을 기다린다 — 짧은 요청·응답이 유독 느려지는 원인.` }); ev.push({ from: 's', to: 'r', label: `(타임아웃 후) seq=${rs}`, color: 'bad', pkt: [tcp(52310, 443, rs, null, 'ACK', [['Len', mss]])], say: '타임아웃 재전송. cwnd = 1로 줄이고 Slow Start부터(3.14).' }); }
    got.add(lost - 1); while (got.has((acked - 1) / mss)) acked += mss;
    ev.push({ from: 'r', to: 's', label: `ACK ${acked}`, color: 'ok', pkt: [tcp(443, 52310, '…', acked, 'ACK')], tables: { buf: buf() }, say: `구멍이 채워지자 버퍼에 있던 뒤 조각까지 한꺼번에 앱으로 올라가고, <b>ACK ${acked}</b> 하나로 전부 확인된다.` });
  }
  return { mode: 'ladder', title: lost ? `${lost}번째 세그먼트가 유실되면` : '유실 없음', lanes: [{ id: 's', label: 'Sender' }, { id: 'r', label: 'Receiver' }], rowH: 50, tables: [{ id: 'buf', title: 'Receiver 수신 버퍼', cols: ['바이트 구간', '상태'] }], events: ev };
}

const SYM3 = {
  refused: ['Connection refused', '해당 포트에 listen 소켓이 없다 (RST 수신)', '전송 / 앱', '프로세스 실행 여부 · 포트 번호 · 바인드 주소'],
  timeout: ['Connection timed out', 'SYN에 대한 응답이 아예 없다', '네트워크 / 방화벽', '보안그룹·방화벽 · 라우팅 · 경로상 차단'],
  noroute: ['No route to host', '라우팅 테이블에 경로가 없다', '네트워크', '서브넷·게이트웨이 설정 (Week 2)'],
  inuse: ['EADDRINUSE', '이미 그 포트를 쓰는 소켓이 있다', '전송 / OS', '기존 프로세스 · TIME_WAIT · SO_REUSEADDR'],
  reset: ['Connection reset by peer', 'RST 수신 — 상대가 연결을 버렸다', '전송 / 앱', '상대 프로세스 종료·크래시 · 유휴 타임아웃 · LB 설정'],
  pipe: ['Broken pipe', '닫힌 소켓에 또 썼다', '앱', '쓰기 전 연결 상태 확인 · 재연결 로직'],
  fd: ['Too many open files', '파일 디스크립터 고갈', '앱 / OS', 'close() 누락(CLOSE_WAIT) · ulimit'],
  name: ['Name or service not known', '이름 해석 실패 — 연결 시도 전에 실패', 'DNS / 앱', '/etc/resolv.conf · 호스트명 오타'],
  slow: ['연결은 되는데 느리다', '재전송·윈도우 축소·큐 대기', '전송 / 네트워크', '재전송률 · Recv-Q/Send-Q · RTT 변동'],
};
const DESIGN = [['file', '파일 전송 · Git push', '완전성', 'TCP', '한 바이트만 틀려도 안 된다. 지연은 감수할 수 있다.'], ['rest', 'REST API · DB 쿼리', '정확성 · 순서', 'TCP', '요청/응답 신뢰성이 우선. 커넥션 풀로 핸드셰이크 비용 상쇄.'], ['voice', '실시간 음성 · 영상통화', '낮은 지연', 'UDP', '늦게 도착한 프레임은 쓸모없다. 약간의 손실은 코덱이 보정.'], ['game', '온라인 게임 (위치 동기)', '최신성', 'UDP', '오래된 좌표를 재전송할 이유가 없다. 다음 값이 곧 온다.'], ['iot', 'IoT 센서 주기 보고', '경량 · 배터리', 'UDP', '값 하나 놓쳐도 다음 주기가 있다. 헤더 8바이트가 유리.'], ['dns', 'DNS 조회', '1회 왕복', 'UDP', '핸드셰이크 비용이 조회 자체보다 크다 (큰 응답은 TCP).'], ['web', '웹 (최신 스택)', '지연 + 신뢰성', 'QUIC', 'UDP 위에 신뢰성과 암호화를 직접 구현해 둘 다 얻는다.'], ['llm', 'LLM 스트리밍 응답', '점진 전달', 'TCP / HTTP', 'SSE·WebSocket으로 한 연결을 열어 두고 토큰을 흘려보낸다.'], ['grpc', '내부 마이크로서비스', '다중화 · 스키마', 'gRPC (TCP)', 'HTTP/2 스트림으로 한 연결에 다수 호출을 다중화한다.']];
const HDR = { ports: ['Source / Destination Port (16 bit씩)', '어느 프로세스에서 어느 프로세스로 — demux의 기준 (3.2)'], seq: ['Sequence Number (32)', '이 세그먼트 첫 바이트의 위치 — 순서 복원·중복 제거 (3.7)'], ack: ['Acknowledgment Number (32)', '다음에 받고 싶은 바이트 = 그 앞까지 누적 확인 (3.7, 3.10)'], flags: ['Flags (9)', 'SYN·ACK·FIN·RST·PSH — 상태 전이를 만든다. RST = “이 연결은 없다” → refused'], win: ['Window Size (16)', 'Flow control의 rwnd 광고. 최대 64KB, Window Scale 옵션으로 확장 (3.13)'], opt: ['Options (0~40 B)', 'MSS 협상 · Window Scale · SACK · Timestamp — 성능의 상당 부분이 여기'] };

addWeek({ id: 'w3', num: 3, short: '3주', title: 'TCP, UDP & Socket', range: 'Week 3',
  lead: '“연결”은 케이블이 아니라 양쪽 메모리에 남은 상태다. 그 상태가 어떻게 생기고(3-way), 데이터를 어떻게 빠짐없이 옮기고(Seq·ACK·재전송), 속도를 어떻게 조절하고(rwnd·cwnd), 어떻게 사라지는가(4-way)를 패킷 단위로 따라간다.',
  sections: [

{ id: 'w3.role', title: 'IP는 호스트까지, TCP/UDP는 프로세스까지', slides: 'S3, S5',
  blocks: [
    `<p>2주차에 IP로 “어느 네트워크의 어느 호스트인가”를 정했다. 그런데 한 호스트에서 브라우저·게임·터미널이 동시에 통신한다. <b>도착한 패킷을 누구에게 줄 것인가?</b> 전송계층은 호스트 대 호스트 위에 <b>프로세스 대 프로세스</b> 통신을 올린다. 그 주소가 <span class="L4">Port</span>, 손잡이가 <span class="L4">Socket</span>이다.</p>`,
    H.key('IP 주소는 “아파트 동호수”, 포트는 “받는 사람 이름”이다. 둘 중 하나만으로는 배달이 끝나지 않는다.'),
    { trace: { title: '한 IP로 모였다가(mux) 포트로 갈라진다(demux)', rowH: 84, minW: 700,
      nodes: [{ id: 'br', label: '브라우저', sub: ':52310', icon: 'proc', x: .08, y: 0 }, { id: 'gm', label: '게임', sub: ':52411', icon: 'proc', x: .08, y: 1 }, { id: 'tm', label: '터미널', sub: ':52502', icon: 'proc', x: .08, y: 2 }, { id: 'ta', label: 'Host A 전송·IP', sub: '203.0.113.5', icon: 'laptop', x: .3, y: 1 }, { id: 'tb', label: 'Host B 전송·IP', sub: '198.51.100.9', icon: 'server', x: .68, y: 1 }, { id: 'web', label: '웹 서버', sub: ':443 TCP', icon: 'proc', x: .92, y: 0 }, { id: 'gs', label: '게임 서버', sub: ':7777 UDP', icon: 'proc', x: .92, y: 1 }, { id: 'ssh', label: 'SSH', sub: ':22 TCP', icon: 'proc', x: .92, y: 2 }],
      links: [['br', 'ta'], ['gm', 'ta'], ['tm', 'ta'], ['ta', 'tb'], ['tb', 'web'], ['tb', 'gs'], ['tb', 'ssh']],
      events: [
        { from: 'br', to: 'web', path: ['br', 'ta', 'tb', 'web'], label: ':52310 → :443', pkt: [ip('203.0.113.5', '198.51.100.9'), { L: 'L4', n: 'TCP', f: [['Src Port', 52310], ['Dst Port', 443]] }], say: 'IP 헤더는 Host B까지만 데려다준다. Host B의 전송계층이 <b>목적지 포트 443</b>을 보고 웹 서버 프로세스에 넘긴다.' },
        { from: 'gm', to: 'gs', path: ['gm', 'ta', 'tb', 'gs'], label: ':52411 → :7777', pkt: [ip('203.0.113.5', '198.51.100.9'), udp(52411, 7777)], say: '같은 IP 쌍인데 포트가 다르다 → 게임 서버로. IP만 보면 이 둘을 구분할 수 없다.' },
        { from: 'tm', to: 'ssh', path: ['tm', 'ta', 'tb', 'ssh'], label: ':52502 → :22', pkt: [ip('203.0.113.5', '198.51.100.9'), { L: 'L4', n: 'TCP', f: [['Src Port', 52502], ['Dst Port', 22]] }], say: '전송계층이 제공하는 것: ① 프로세스 식별(Port) ② 순서·신뢰성(TCP일 때) ③ 속도 조절(Flow/Congestion). 이번 주의 모든 개념은 이 세 가지를 구현하는 장치다.' },
      ] } },
  ] },

{ id: 'w3.mux', title: 'Mux / Demux — UDP는 2-tuple, TCP는 4-tuple', slides: 'S6, S16',
  blocks: [
    T(['', 'UDP demux', 'TCP demux'], [['보는 값', '<b>2-tuple</b>: 목적지 IP, 목적지 Port', '<b>4-tuple</b>: 출발지 IP·Port + 목적지 IP·Port'], ['결과', '출발지가 달라도 <b>같은 소켓</b>으로 들어온다', '연결마다 <b>별도 소켓</b> — 같은 443에 수천 개 공존']]),
    { trace: { title: '세 클라이언트 → 같은 서버', rowH: 88, minW: 640,
      nodes: [{ id: 'c1', label: 'Client 1', sub: '203.0.113.5:52310', icon: 'laptop', x: .12, y: 0 }, { id: 'c2', label: 'Client 2', sub: '203.0.113.5:52311', icon: 'laptop', x: .12, y: 1 }, { id: 'c3', label: 'Client 3', sub: '203.0.113.9:41002', icon: 'laptop', x: .12, y: 2 }, { id: 'sv', label: 'Server', sub: '198.51.100.9', icon: 'server', x: .78, y: 1 }],
      links: [['c1', 'sv'], ['c2', 'sv'], ['c3', 'sv']],
      tables: [{ id: 'tcp', title: 'Server의 TCP 소켓 (:443)', cols: ['소켓', '4-tuple'], rows: [['listen', '*:443 — 새 연결 접수용']] }, { id: 'udp', title: 'Server의 UDP 소켓 (:7777)', cols: ['소켓', '받은 데이터그램 출발지'], rows: [['UDP *:7777', '—']] }],
      events: [
        { from: 'c1', to: 'sv', label: 'TCP → :443', pkt: [ip('203.0.113.5', '198.51.100.9'), { L: 'L4', n: 'TCP', f: [['Src Port', 52310], ['Dst Port', 443]] }], tables: { tcp: [['listen', '*:443 — 새 연결 접수용'], ['연결 #1', '203.0.113.5:52310 ↔ :443']] }, say: 'TCP 연결 하나 = 연결 소켓 하나.' },
        { from: 'c2', to: 'sv', label: 'TCP → :443', pkt: [ip('203.0.113.5', '198.51.100.9'), { L: 'L4', n: 'TCP', f: [['Src Port', 52311], ['Dst Port', 443]] }], tables: { tcp: [['listen', '*:443 — 새 연결 접수용'], ['연결 #1', '203.0.113.5:52310 ↔ :443'], ['연결 #2', '203.0.113.5:52311 ↔ :443']] }, say: '같은 PC, 같은 서버 포트 — 그런데 <b>Src Port만 달라도</b> 4-tuple이 달라 별개의 연결이다.' },
        { from: 'c3', to: 'sv', label: 'TCP → :443', pkt: [ip('203.0.113.9', '198.51.100.9'), { L: 'L4', n: 'TCP', f: [['Src Port', 41002], ['Dst Port', 443]] }], tables: { tcp: [['listen', '*:443 — 새 연결 접수용'], ['연결 #1', '203.0.113.5:52310 ↔ :443'], ['연결 #2', '203.0.113.5:52311 ↔ :443'], ['연결 #3', '203.0.113.9:41002 ↔ :443']] }, say: '“포트를 하나 열었는데 동시 접속이 수천 개”가 가능한 이유. 포트는 번호 하나지만 연결은 네 값의 조합으로 구분된다.' },
        { from: 'c1', to: 'sv', label: 'UDP → :7777', pkt: [ip('203.0.113.5', '198.51.100.9'), udp(52310, 7777)], tables: { udp: [['UDP *:7777', '203.0.113.5:52310']] }, say: 'UDP는 연결이 없으니 소켓이 하나뿐이다.' },
        { from: 'c3', to: 'sv', label: 'UDP → :7777', pkt: [ip('203.0.113.9', '198.51.100.9'), udp(41002, 7777)], tables: { udp: [['UDP *:7777', '203.0.113.5:52310, 203.0.113.9:41002 …']] }, say: '출발지가 달라도 <b>같은 소켓</b>으로 들어온다 — 그래서 UDP 앱은 recvfrom()으로 매번 “누가 보냈는지”를 받아 직접 구분한다.' },
      ] } },
    { lab: { title: '새 연결의 4-tuple은 기존 연결과 다른가?', init: { cip: '203.0.113.5', cport: 52312 },
      ctl: [{ k: 'cip', type: 'text', label: 'Client IP', w: 160 }, { k: 'cport', label: 'Client Port', min: 49152, max: 65535, type: 'num' }, { type: 'btns', items: [{ label: '52310으로', act: s => s.cport = 52310 }, { label: 'IP .9로', act: s => s.cip = '203.0.113.9' }] }],
      out: st => { const E = [['#1', '203.0.113.5', 52310], ['#2', '203.0.113.5', 52311], ['#3', '203.0.113.9', 41002]]; const dup = E.find(r => r[1] === st.cip && r[2] === +st.cport);
        return T(['연결', 'Client IP', 'Client Port', 'Server IP', 'Server Port'], E.map(r => [r[0], r[1], r[2], '198.51.100.9', 443]).concat([['새 연결', st.cip, st.cport, '198.51.100.9', 443]]), { mono: [1, 2, 3, 4], hl: r => r[0] === '새 연결' }) +
          `<div class="verdict ${dup ? 'bad' : 'ok'}">${dup ? `${dup[0]}과 네 값이 모두 같다 → 같은 연결로 취급되어 새로 만들 수 없다` : '하나라도 다르다 → 별개의 연결'}</div><p style="margin:0">그래서 <b>클라이언트 포트는 OS가 자동 할당</b>한다 — connect() 때 ephemeral 포트를 골라 4-tuple을 유일하게 만든다. 이 구간이 고갈되면 새 연결을 못 만든다.</p>`; } } },
  ] },

{ id: 'w3.ports', title: 'Port 번호 체계', slides: 'S7',
  blocks: [
    T(['범위', '이름', '설명'], [['0 – 1023', 'Well-known', '표준 서비스. 리눅스에서 바인딩에 root 권한 필요'], ['1024 – 49151', 'Registered', 'IANA 등록 앱용 (8080, 3306, 6379 …)'], ['49152 – 65535', 'Dynamic / Ephemeral', 'OS가 클라이언트 소스 포트로 자동 할당']], { mono: [0] }),
    T(['포트', '서비스', '전송', '개발 중 자주 만나는 상황'], [['22', 'SSH', 'TCP', '원격 접속·git push 실패의 1차 확인 대상'], ['53', 'DNS', 'UDP (+TCP)', '응답이 512B를 넘거나 zone transfer면 TCP'], ['80 / 443', 'HTTP / HTTPS', 'TCP', 'HTTP/3는 같은 443을 <b>UDP</b>(QUIC)로'], ['3306 / 5432', 'MySQL / PostgreSQL', 'TCP', '컨테이너 포트 매핑 실수로 연결 거부'], ['6379 / 11211', 'Redis / Memcached', 'TCP', '외부에 열면 그대로 사고 — bind 주소 확인'], ['8000 / 8080', '개발 서버', 'TCP', 'EADDRINUSE(이미 사용 중)의 주인공']], { mono: [0] }),
    H.note('포트는 “예약”된 것이 아니라 “합의”된 것이다. 8080에 SSH를 띄우는 것도 가능하다 — 대신 아무도 찾아오지 못한다.'),
  ] },

{ id: 'w3.vs', title: 'TCP vs UDP: 무엇을 해주고, 무엇을 안 해주나', slides: 'S8',
  blocks: [
    T(['', 'TCP', 'UDP'], [['연결', '연결형 — 3-way handshake 후 전송', '비연결형 — 바로 전송'], ['신뢰성', '순서 보장 · 재전송 · 중복 제거', '보장 없음 (손실·순서 뒤바뀜 가능)'], ['속도 조절', 'Flow + Congestion control', '없음 — 앱이 보내는 대로'], ['헤더', '20바이트 이상 (최대 60)', '8바이트 고정'], ['통신 형태', '1:1 (unicast)', '1:1 · 1:N (broadcast/multicast)'], ['데이터 경계', '바이트 스트림 — 경계 없음', '데이터그램 — 보낸 단위 유지'], ['대표 용도', 'HTTP/1.1·2, SSH, DB, 파일 전송', 'DNS, 실시간 영상/음성, 게임, QUIC']]),
    H.key('“TCP는 느리고 UDP는 빠르다”가 아니다. TCP가 대신 해주는 일의 목록이 곧 그 비용이고, UDP를 쓰면 그 목록을 앱이 직접 구현하게 된다.'),
    { h3: '게임 입력 #2가 유실되면 (필기 예시)' },
    T(['시점', 'TCP 서버가 반영한 입력', 'UDP 서버가 반영한 입력'], [['#1 도착', '#1', '#1'], ['#2 유실', '#1', '#1'], ['#3 도착', '#1 (#3은 버퍼에서 대기 — #2가 비었으므로)', '#1 #3'], ['#4 도착', '#1 (#3 #4 대기)', '#1 #3 #4'], ['#2 재전송 도착', '#1 #2 #3 #4 (늦게 한꺼번에 → 렉)', '— (#2는 그냥 사라짐)']]),
    `<p>TCP는 신뢰성을 위해 빠진 것을 기다리느라 뒤 입력까지 멈춘다(지연↑). UDP는 무조건 보내고 다음 값을 바로 반영한다. 실시간성이 중요하면 UDP, 정확해야 하면 TCP.</p>`,
  ] },

{ id: 'w3.state', title: 'TCP Connection = 양쪽 메모리의 상태', slides: 'S9',
  blocks: [
    `<ul><li><b>오해</b> “선이 연결된다” — 전용 회선은 없다. <b>중간 라우터는 이 연결의 존재를 전혀 모른다.</b> 패킷은 매번 독립적으로 라우팅된다.</li><li><b>실제</b> 양쪽 OS 커널이 제어블록 <b>TCB</b>(Transmission Control Block)를 만든다.</li><li><b>결과</b> 상태는 비용이다 — 연결이 늘면 메모리·타이머·포트가 소모된다. 동시 접속 한계, TIME_WAIT 누적 문제가 여기서 나온다.</li></ul>`,
    T(['TCB 항목', '내용'], [['4-tuple', '출발지 IP·Port, 목적지 IP·Port'], ['상태', 'LISTEN / ESTABLISHED / TIME_WAIT …'], ['순서번호', 'snd_nxt, rcv_nxt, 미확인 구간'], ['윈도우', 'rwnd(수신) · cwnd(혼잡) · ssthresh'], ['타이머', 'RTO, keepalive, TIME_WAIT 타이머'], ['버퍼', '송신 큐 / 수신 큐 (재전송 대비 보관)']]),
    H.key('“연결이 끊겼다” = 보통 “한쪽의 상태가 사라졌는데 다른 쪽은 모른다”는 뜻이다.'),
  ] },

{ id: 'w3.hs', title: '3-Way Handshake', slides: 'S10–S11',
  blocks: [
    `<p>연결 수립: <b>양쪽의 초기 순서번호(ISN)를 교환하고, 서로의 수신 능력을 확인</b>한다. 각 단계에서 TCP 헤더의 Flags·Seq·Ack가 어떻게 바뀌는지 패킷 상세를 보자.</p>`,
    { lab: { title: 'ISN을 바꿔 가며 같은 규칙 확인', tag: '트레이스', init: { x: 1000, y: 5000 },
      ctl: [{ type: 'btns', items: [{ label: '강의 표기 (x=1000, y=5000)', act: s => { s.x = 1000; s.y = 5000; } }, { label: '🎲 실제처럼 무작위 ISN', act: s => { s.x = 1 + Math.floor(Math.random() * 4e9); s.y = 1 + Math.floor(Math.random() * 4e9); } }] }],
      out: st => `<div class="result">SYN: seq=x=${st.x} → SYN+ACK: seq=y=${st.y}, ack=x+1=${st.x + 1} → ACK: seq=${st.x + 1}, ack=y+1=${st.y + 1}</div><div class="slot"></div>`,
      after: (st, out) => slot(st, out, hsTrace(st.x, st.y)) } },
    { h3: '왜 2번이 아니고 3번인가' },
    `<ol><li><b>양방향 확인</b> — C→S, S→C 두 방향 각각의 ISN이 상대에게 확인되어야 한다. 방향마다 확인이 필요하므로 최소 3개(SYN / SYN+ACK가 두 역할을 겸함 / ACK).</li><li><b>오래된 중복 SYN 차단</b> — 아래 트레이스.</li><li><b>ISN은 0이 아니다</b> — 난수로 잡아 이전 연결의 잔여 패킷 혼입과 순서번호 추측 공격을 어렵게 한다.</li></ol>`,
    { trace: { mode: 'ladder', title: '과거 연결의 SYN이 늦게 도착하면', lanes: [{ id: 'c', label: 'Client', sub: '지금은 연결할 생각 없음' }, { id: 's', label: 'Server' }],
      events: [
        { from: 'c', to: 's', label: '옛 SYN seq=900', dash: 1, color: 'l1', state: { s: 'SYN_RCVD' }, pkt: [tcp(52200, 443, 900, null, 'SYN')], say: '예전에 보냈다가 네트워크에서 떠돌던 SYN이 뒤늦게 도착했다. Server는 새 연결 요청인 줄 알고 SYN_RCVD.' },
        { from: 's', to: 'c', label: 'SYN+ACK', sub: 'seq=5000 ack=901', pkt: [tcp(443, 52200, 5000, 901, 'SYN, ACK')], say: 'Server가 정상 절차대로 응답한다.' },
        { from: 'c', to: 's', label: 'RST', color: 'bad', state: { c: '“나는 SYN 보낸 적 없음”' }, pkt: [tcp(52200, 443, 901, null, 'RST')], say: 'Client는 자기가 연 적 없는 연결이므로 <b>세 번째 ACK를 보내지 않는다</b>(실제 TCP는 RST로 거절, 필기는 “무시”). ' },
        { from: 's', to: 's', label: '연결 성립 안 함', color: 'ok', state: { s: 'CLOSED (자원 해제)' }, say: '세 번째 메시지가 Client의 의사를 확인하는 장치다. <b>2-way였다면</b> 옛 SYN 하나만으로 Server가 ESTABLISHED가 되어 아무도 쓰지 않는 연결에 자원을 잡는다(필기: 메모리 낭비 방지).' },
      ] } },
    { h3: '연결 수립 비용 — “왜 첫 호출만 느린가?”' },
    { lab: { title: 'RTT에 따른 데이터 전송 시작까지의 시간', init: { rtt: 30 },
      ctl: [{ k: 'rtt', label: 'RTT', unit: 'ms', min: 1, max: 300 }],
      out: st => { const r = st.rtt; const R = [['TCP only', 1, 'l4'], ['TCP + TLS 1.3', 2, 'l3'], ['TCP + TLS 1.2', 3, 'bad'], ['QUIC 신규', 1, 'l7'], ['QUIC 재방문 0-RTT', 0, 'ok']];
        return barsHTML(R.map(([n, k, c]) => ({ label: n, segs: k ? Array.from({ length: k }, (_, j) => ({ v: r, c, t: 'RTT ' + (j + 1) })) : [{ v: .001, c }], val: k * r + ' ms' })), 3 * r) + `<p style="margin:0">서울–도쿄 30 ms면 TCP만 30 ms. 매 요청마다 새 연결을 맺으면 이 비용이 매번 반복된다 → <b>Keep-Alive와 커넥션 풀</b>(4주차).</p>`; } } },
  ] },

{ id: 'w3.seq', title: '순서번호는 바이트를 센다', slides: 'S12',
  blocks: [
    H.key('Seq = “이 세그먼트의 첫 바이트가 몇 번째 바이트인가”, Ack = “다음에 받고 싶은 바이트 번호”(= 그 앞까지 누적 확인).'),
    { lab: { title: '세그먼트 길이를 바꿔 보기', tag: '트레이스', init: { l1: 1460, l2: 1460, l3: 500 },
      ctl: [{ k: 'l1', label: '세그먼트 1', unit: 'B', min: 1, max: 1460 }, { k: 'l2', label: '세그먼트 2', unit: 'B', min: 1, max: 1460 }, { k: 'l3', label: '세그먼트 3', unit: 'B', min: 1, max: 1460 }],
      out: st => { const s2 = 1 + st.l1, s3 = s2 + st.l2, e = s3 + st.l3; return `<div class="result">seg1 seq=1, len=${st.l1} → ACK ${1 + st.l1}<br>seg2 seq=${s2} (=1+${st.l1}), len=${st.l2}<br>seg3 seq=${s3} (=${s2}+${st.l2}), len=${st.l3} → 누적 ACK <b>${e}</b> (=${s3}+${st.l3})</div><div class="slot"></div>`; },
      after: (st, out) => { const s2 = 1 + st.l1, s3 = s2 + st.l2, e = s3 + st.l3; slot(st, out, { mode: 'ladder', title: '데이터 전송', lanes: [{ id: 'c', label: 'Client' }, { id: 's', label: 'Server' }], events: [
        { from: 'c', to: 's', label: `DATA ${st.l1} B`, sub: `seq=1, len=${st.l1}`, pkt: [tcp(52310, 443, 1, 1, 'PSH, ACK', [['Len', st.l1]])], say: `첫 바이트 번호 1부터 ${st.l1}바이트.` },
        { from: 's', to: 'c', label: `ACK ${1 + st.l1}`, color: 'ok', pkt: [tcp(443, 52310, 1, 1 + st.l1, 'ACK')], say: `“${st.l1}번째 바이트까지 받았다. 다음엔 <b>${1 + st.l1}</b>부터 주세요.”` },
        { from: 'c', to: 's', label: `DATA ${st.l2} B`, sub: `seq=${s2}`, pkt: [tcp(52310, 443, s2, 1, 'PSH, ACK', [['Len', st.l2]])], say: '“세그먼트 2번”이 아니라 “' + s2 + '번째 바이트부터”.' },
        { from: 'c', to: 's', label: `DATA ${st.l3} B`, sub: `seq=${s3}`, pkt: [tcp(52310, 443, s3, 1, 'PSH, ACK', [['Len', st.l3]])], say: 'ACK를 기다리지 않고 이어서 보냈다(파이프라인, 필기). 슬라이딩 윈도우(3.12)가 이걸 허용한다.' },
        { from: 's', to: 'c', label: `ACK ${e}`, color: 'ok', pkt: [tcp(443, 52310, 1, e, 'ACK')], say: `<b>누적 ACK</b> 하나로 둘 다 확인. 중간 ACK가 유실돼도 뒤의 ACK가 덮어준다. 필기: 길이가 있는데 번호를 또 붙이는 이유 — 양쪽 버퍼에서 순서를 관리하기 때문.` },
      ] }); } } },
    `<ul><li><b>MSS와 분할</b> — 이더넷 MTU 1500 − IP 20 − TCP 20 = <b>MSS 1460</b>. 앱이 1MB를 send()해도 이 단위로 쪼개진다.</li><li><b>스트림에는 경계가 없다</b> — send() 3번이 recv() 1번으로 합쳐질 수 있다. 그래서 앱이 길이 헤더나 구분자를 정해야 한다. Lab 2: 1MB를 받는 데 recv()가 78번, 조각 크기는 매번 달랐다.</li></ul>`,
  ] },

{ id: 'w3.close', title: '4-Way 종료와 상태 전이', slides: 'S13–S15',
  blocks: [
    { trace: { mode: 'ladder', title: '양방향이므로 방향마다 따로 닫는다', lanes: [{ id: 'c', label: 'Client', sub: '먼저 close()' }, { id: 's', label: 'Server' }],
      events: [
        { from: 'c', to: 's', label: 'FIN', sub: 'seq=u “보낼 것 없음”', state: { c: 'FIN_WAIT_1' }, pkt: [tcp(52310, 443, 'u', '…', 'FIN, ACK')], say: 'Client 앱이 close() → FIN. “나는 더 보낼 것이 없다.” FIN도 SYN처럼 순서번호 1을 쓴다.' },
        { from: 's', to: 'c', label: 'ACK', sub: 'ack=u+1', state: { s: 'CLOSE_WAIT', c: 'FIN_WAIT_2' }, pkt: [tcp(443, 52310, 'v', 'u+1', 'ACK')], say: 'Server 커널이 ACK. Server는 <b>CLOSE_WAIT</b> — 앱이 close()를 부를 때까지 여기 머문다.' },
        { from: 's', to: 'c', label: 'DATA (선택)', dash: 1, color: 'l7', pkt: [tcp(443, 52310, 'v', 'u+1', 'PSH, ACK'), data('남은 응답 …')], say: '<b>half-close</b>: Client→Server 방향만 닫혔다. Server는 아직 보낼 수 있다. 그래서 ACK와 FIN을 합치지 않는다.' },
        { from: 's', to: 'c', label: 'FIN', sub: 'seq=v (앱이 close())', state: { s: 'LAST_ACK' }, pkt: [tcp(443, 52310, 'v', 'u+1', 'FIN, ACK')], say: 'Server 앱도 close() → FIN.' },
        { from: 'c', to: 's', label: 'ACK', sub: 'ack=v+1', state: { c: 'TIME_WAIT (2×MSL)' }, pkt: [tcp(52310, 443, 'u+1', 'v+1', 'ACK')], say: 'Client는 마지막 ACK 후 <b>TIME_WAIT</b>으로 2×MSL(리눅스 약 60초) 대기 — 이 ACK가 유실되면 Server의 FIN 재전송을 받아 줘야 하고, 늦게 온 옛 패킷이 새 연결에 섞이는 것도 막는다.' },
        { from: 's', to: 's', label: 'CLOSED', color: 'l1', state: { s: 'CLOSED' }, say: 'Server는 ACK를 받고 바로 CLOSED.' },
        { kind: 'gap', text: '— 약 60초 후 —', state: { c: 'CLOSED' }, say: 'Client도 CLOSED. Lab 2 관찰: 먼저 close한 클라이언트 쪽(46546)에 TIME-WAIT가 남았다. 서버가 FIN을 받자마자 close하면(--no-delay) ACK와 FIN이 한 패킷으로 합쳐져 3개로 끝났다.' },
      ] } },
    { h3: 'TCP 상태 전이도 — netstat/ss가 보여주는 값들의 지도' },
    T(['Client 측 (능동 연결·능동 종료)', '전이 조건', 'Server 측 (수동 연결·수동 종료)', '전이 조건'], [['CLOSED', '', 'CLOSED', ''], ['SYN_SENT', 'SYN 전송', 'LISTEN', 'listen()'], ['ESTABLISHED', 'SYN/ACK 수신 → ACK', 'SYN_RCVD', 'SYN 수신 → SYN/ACK'], ['FIN_WAIT_1', 'close() → FIN', 'ESTABLISHED', 'ACK 수신'], ['FIN_WAIT_2', 'ACK 수신', 'CLOSE_WAIT', '상대 FIN 수신 → ACK'], ['TIME_WAIT', '상대 FIN 수신 → ACK', 'LAST_ACK', 'close() → FIN'], ['CLOSED', '2×MSL 경과', 'CLOSED', 'ACK 수신']], { mono: [0, 2] }),
    T(['', 'TIME_WAIT — 내가 먼저 닫은 쪽', 'CLOSE_WAIT — 상대가 먼저 닫은 쪽'], [['왜', '마지막 ACK 유실 대비 + 옛 패킷 혼입 방지', '상대 FIN에 ACK했지만 <b>내 앱이 close()를 안 함</b>'], ['얼마나', '2×MSL (약 60초)', '<b>무한정</b> — 앱이 close()할 때까지'], ['증상', '부하 테스트 후 수만 개 → 포트 고갈 “Cannot assign requested address”', '계속 누적 → FD 고갈 “Too many open files”'], ['대응', '서버가 먼저 닫지 않게, Keep-Alive·커넥션 풀, SO_REUSEADDR', '<b>코드 버그</b>. try/finally·with로 반드시 닫기']]),
    H.key(`${H.exam('Quick Check Q8')} TIME_WAIT은 정상 동작의 흔적(양이 문제), CLOSE_WAIT은 버그의 흔적(존재 자체가 문제).`),
  ] },

{ id: 'w3.rel', title: 'TCP의 신뢰성, 어디까지인가', slides: 'S17',
  blocks: [
    T(['보장한다 ✓', '보장하지 않는다 ✕'], [['<b>순서</b> — 보낸 순서대로 앱에 전달', '<b>전달 시간</b> — 재전송되면 더 늦다'], ['<b>무손실</b> — 유실 구간 재전송 (연결이 살아 있는 한)', '<b>메시지 경계</b> — send() 단위 유지 안 됨'], ['<b>무중복</b> — 중복 세그먼트는 버림', '<b>상대 앱의 처리</b> — ACK는 “커널이 받았다”일 뿐'], ['<b>무결성(약하게)</b> — 16비트 체크섬', '<b>보안</b> — 암호화·인증은 TLS의 몫']]),
    { trace: { mode: 'ladder', title: 'ACK가 유실되면 — 중복을 순서번호로 걸러낸다', lanes: [{ id: 's', label: 'Sender' }, { id: 'r', label: 'Receiver' }], tables: [{ id: 'app', title: 'Receiver 앱이 받은 데이터', cols: ['바이트', '횟수'] }],
      events: [
        { from: 's', to: 'r', label: 'seq=1 len=100', pkt: [tcp(52310, 443, 1, null, 'PSH, ACK', [['Len', 100]])], tables: { app: [['1~100', '1번']] }, say: '데이터가 잘 도착해 앱에 전달됐다.' },
        { from: 'r', to: 's', label: 'ACK 101', drop: true, color: 'ok', pkt: [tcp(443, 52310, '…', 101, 'ACK')], say: '그런데 ACK가 유실됐다.' },
        { from: 's', to: 'r', label: 'seq=1 len=100 (재전송)', color: 'bad', state: { s: 'RTO 만료' }, pkt: [tcp(52310, 443, 1, null, 'PSH, ACK', [['Len', 100]])], say: 'Sender는 받았는지 모르니 타임아웃 후 다시 보낸다.' },
        { from: 'r', to: 's', label: 'ACK 101', color: 'ok', state: { r: '1~100 이미 받음 → 버림' }, pkt: [tcp(443, 52310, '…', 101, 'ACK')], tables: { app: [['1~100', '1번 (중복은 버림)']] }, say: 'Receiver는 순서번호로 “이미 받은 바이트”임을 알아보고 버린다 → 앱은 같은 데이터를 두 번 받지 않는다(필기의 중복 패킷 문제). 단 ACK는 “앱이 처리했다”는 보장이 아니다 → 4주차 멱등성.' },
      ] } },
    H.key('“TCP를 썼는데 데이터가 깨졌다” → 대부분 TCP가 아니라 메시지 경계 처리(파싱)의 문제다.'),
  ] },

{ id: 'w3.loss', title: '유실 → 중복 ACK → 빠른 재전송', slides: 'S18, S20',
  blocks: [
    `<p>누적 ACK는 “여기까지”만 말한다. 중간 한 조각이 비면(<b>hole</b>) 뒤 데이터는 도착해도 앱에 올려줄 수 없고(<b>Head-of-Line Blocking</b>), 수신자는 같은 ACK를 반복한다(<b>중복 ACK</b>). 유실 위치를 바꿔 가며 언제 빠른 재전송이 되고 언제 타임아웃을 기다리는지 보자.</p>`,
    { lab: { title: '6개 세그먼트 중 하나를 잃어버리기', tag: '트레이스', init: { lost: '2' },
      ctl: [{ k: 'lost', type: 'select', label: '유실시킬 세그먼트', opts: [['0', '없음'], ['1', '1번째'], ['2', '2번째 (강의 예)'], ['3', '3번째'], ['4', '4번째'], ['5', '5번째'], ['6', '6번째 (마지막)']] }],
      out: st => { const l = +st.lost, d = 6 - l; return `<div class="result">${!l ? '유실 없음 — 누적 ACK가 차례로 증가' : `${l}번째(seq=${1 + (l - 1) * 1460}) 유실 → 뒤 ${d}개 도착마다 ACK ${1 + (l - 1) * 1460} 반복 (중복 ACK ${d}개) → ${d >= 3 ? '<b>3개 이상: 빠른 재전송</b>' : '<b>3개 미만: 타임아웃까지 대기</b>'}`}</div><div class="slot"></div>`; },
      after: (st, out) => slot(st, out, lossTrace(+st.lost)) } },
    T(['', '타임아웃 재전송', '빠른 재전송 (Fast Retransmit)'], [['판단 근거', '타이머 만료 (수백 ms ~ 수 초)', '중복 ACK 3회 (수십 ms)'], ['혼잡 해석', '심각한 혼잡', '가벼운 손실 (경로는 살아 있음)'], ['cwnd', '1 MSS로 초기화 (Slow Start부터)', '절반으로 줄이고 계속 (Fast Recovery)'], ['조건', '언제나 가능', '뒤따르는 데이터가 있어야 성립']]),
    `<p><b>SACK</b>(Selective ACK) 옵션은 “1461~2920만 빠졌다”를 정확히 알려 불필요한 재전송을 줄인다. ${H.exam('Quick Check Q7')}중복 ACK가 반복되면 송신자는 그 번호의 조각만 빠졌고 뒤는 도착하고 있음을 안다.</p>`,
  ] },

{ id: 'w3.rto', title: 'RTO 계산과 지수 백오프', slides: 'S19',
  blocks: [
    `<p>얼마나 기다렸다가 다시 보낼까? ① 보낸 시각과 ACK 시각의 차이로 <b>RTT를 측정</b>(매번 흔들림) → ② 지수 가중 이동평균으로 <b>SRTT</b>를, 변동폭 <b>RTTVAR</b>도 추적 → ③ <b>RTO = SRTT + 4 × RTTVAR</b>. 너무 짧으면 불필요한 재전송, 너무 길면 복구가 느리다.</p>`,
    { lab: { title: 'RTT 측정값 → SRTT · RTTVAR · RTO', init: { s: '100, 120, 90, 300, 110, 105' },
      ctl: [{ k: 's', type: 'text', label: 'RTT 측정값 (ms, 쉼표로)', w: 300 }],
      out: st => { const sm = String(st.s).split(/[,\s]+/).map(Number).filter(x => x > 0).slice(0, 20); if (!sm.length) return '<span class="err">숫자를 쉼표로 구분해 입력</span>'; const d = rtoSeq(sm); const l = d[d.length - 1];
        return `<div class="result">SRTT   ← 7/8·SRTT + 1/8·RTT<br>RTTVAR ← 3/4·RTTVAR + 1/4·|SRTT − RTT|<br>RTO    = SRTT + 4·RTTVAR = ${l.srtt.toFixed(1)} + 4×${l.rv.toFixed(1)} = <b>${l.rto.toFixed(1)} ms</b></div>` +
          T(['#', 'RTT', 'SRTT', 'RTTVAR', 'RTO'], d.map((x, i) => [i + 1, x.r, x.srtt.toFixed(1), x.rv.toFixed(1), x.rto.toFixed(1)]), { mono: [0, 1, 2, 3, 4] }) + '<div class="chartbox"></div>' +
          `<div class="assume"><b>가정</b> α=1/8, β=1/4, 첫 측정으로 SRTT=R, RTTVAR=R/2 초기화(RFC 6298 표준값). 필기의 RTT_O ← α·RTT_N + (1−α)·RTT_O 는 SRTT를 구하는 바로 이 EWMA 식이다. 해 보기: 300 같은 튀는 값을 넣으면 SRTT는 조금만 움직이지만 RTTVAR이 커져 RTO가 크게 늘어난다.</div>`; },
      after: (st, out) => { const sm = String(st.s).split(/[,\s]+/).map(Number).filter(x => x > 0).slice(0, 20); if (!sm.length) return; const d = rtoSeq(sm); const ym = Math.ceil(Math.max(...d.map(x => Math.max(x.r, x.rto))) / 100) * 100;
        lineChart(out.querySelector('.chartbox'), { h: 260, xmax: Math.max(1, d.length - 1), ymax: ym, yticks: Array.from({ length: ym / 100 + 1 }, (_, i) => i * 100), xticks: d.map((_, i) => i), xlabel: '측정 순서', ylabel: 'ms', series: [{ pts: d.map((x, i) => [i, x.r]), color: 'l1', w: 1.5, dash: '3 3', dots: true }, { pts: d.map((x, i) => [i, x.srtt]), color: 'l3', w: 3 }, { pts: d.map((x, i) => [i, x.rto]), color: 'bad', w: 2.5, dash: '7 4' }], legend: [['측정 RTT', 'l1', 1], ['SRTT', 'l3'], ['RTO', 'bad', 1]] }); } } },
    { h3: '타임아웃이 반복되면 — 지수 백오프' },
    { fig: barsHTML([1, 2, 3, 4, 5].map(k => ({ label: `재전송 ${k}회째`, segs: [{ v: 2 ** (k - 1), c: k < 5 ? 'l4' : 'bad', t: (2 ** (k - 1)) + '× RTO' }] })), 16), cap: '재전송이 또 실패하면 RTO를 2배씩(1× → 2× → 4× → 8×…). 백오프가 누적되면 실패 통보까지 수십 초 — “연결이 죽었는데 앱이 한참 멈춰 있는” 이유.' },
    H.warn('AI에게 소켓 코드를 시킬 때 첫 번째 검증 포인트: <code>settimeout()</code>이 있는가? 없다면 장애 시 무한 대기한다. 앱은 자신의 타임아웃을 따로 걸어야 한다.'),
  ] },

{ id: 'w3.window', title: '슬라이딩 윈도우', slides: 'S21',
  blocks: [
    `<p>ACK를 하나씩 기다리지 않고 <b>윈도우 크기만큼 미리 보낸다</b>. 윈도우 = <b>min(rwnd, cwnd)</b> — 수신자가 광고하는 rwnd(상대 버퍼)와 송신자가 계산하는 cwnd(네트워크 여유)의 교집합.</p>`,
    { lab: { title: '전송과 ACK를 번갈아 눌러 윈도우를 움직이기', init: { W: 3, base: 2, next: 4 },
      ctl: [{ k: 'W', label: '윈도우 (MSS)', min: 1, max: 6 }, { type: 'btns', items: [{ label: '보낼 수 있는 만큼 전송', pri: 1, act: s => s.next = Math.min(s.base + s.W, 10) }, { label: '가장 오래된 것 ACK 수신', act: s => { if (s.base < s.next) s.base++; } }, { label: '처음부터', act: s => { s.base = 0; s.next = 0; } }] }],
      out: st => { const cells = Array.from({ length: 10 }, (_, i) => { const s = i < st.base ? ['ok', 'ACK 완료'] : i < st.next ? ['l4', '전송·미확인'] : i < st.base + st.W ? ['l3', '전송 가능'] : ['line', '대기']; const inW = i >= st.base && i < st.base + st.W; return `<div style="flex:1;min-width:58px;border-radius:5px;padding:8px 2px;text-align:center;background:${s[0] === 'line' ? 'var(--sunk)' : COLOR(s[0])};color:${s[0] === 'line' ? 'var(--mute)' : 'var(--on)'};font-family:var(--f-mono);font-size:12px;font-weight:600;outline:${inW ? '3px solid var(--ink)' : 'none'};outline-offset:1px">${1 + i * 1460}<br><span style="font-weight:400">${s[1]}</span></div>`; }).join('');
        return `<div class="result">ACK 완료 ${st.base}개 · in-flight ${st.next - st.base}개 · 윈도우 ${st.W} → 더 보낼 수 있는 것 ${Math.max(0, Math.min(st.base + st.W, 10) - st.next)}개</div><div style="overflow-x:auto"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(64px,1fr));gap:5px;padding:4px">${cells}</div></div><p class="cm" style="font-size:14px;margin:8px 0 0">굵은 테두리 = 윈도우. ACK가 오면 오른쪽으로 미끄러진다. 헤더의 윈도우 필드는 16 bit(최대 64KB) — 고속·장거리 회선에서는 <b>Window Scaling</b> 옵션으로 확장한다.</p>`; } } },
    { lab: { title: '왜 필요한가 — 처리량 ≈ 윈도우 ÷ RTT', init: { w: 1, rtt: 30 },
      ctl: [{ k: 'w', label: '윈도우', unit: 'MSS', min: 1, max: 64 }, { k: 'rtt', label: 'RTT', unit: 'ms', min: 1, max: 300 }],
      out: st => { const bps = st.w * 1460 * 8 / (st.rtt / 1000); return `<div class="result">처리량 상한 ≈ 윈도우 × MSS ÷ RTT = ${st.w} × 1460 B × 8 ÷ ${st.rtt} ms = <b>${(bps / 1e6).toFixed(2)} Mbps</b></div><p style="margin:0">윈도우 1 = Stop-and-Wait: 강의 예 RTT 30 ms·MSS 1460 B → <b>약 0.39 Mbps</b>. 윈도우 2배 → 처리량 2배, RTT 2배 → 처리량 ½. “대역폭은 넉넉한데 속도가 안 나온다” → 윈도우가 작거나 손실로 계속 줄어드는 중일 가능성이 높다.</p><div class="assume"><b>가정</b> 손실 없음, 링크 대역폭은 충분히 큼 — 이 값은 상한이다.</div>`; } } },
  ] },

{ id: 'w3.flow', title: 'Flow Control과 BDP', slides: 'S22',
  blocks: [
    `<p>수신자는 <b>“내 버퍼가 이만큼 남았다”(rwnd)</b>를 매 ACK의 Window Size 필드에 실어 보낸다. 필기: 받는 쪽 버퍼가 넘치면 drop되어 복구가 안 되므로 <b>받는 쪽이 컨트롤</b>한다.</p>`,
    { trace: { mode: 'ladder', title: '수신 앱이 느리면 Zero Window', lanes: [{ id: 's', label: 'Sender' }, { id: 'r', label: 'Receiver 커널', sub: '수신 버퍼 8 KB' }], tables: [{ id: 'b', title: '수신 버퍼', cols: ['쌓인 양', '남은 공간(rwnd)'], rows: [['0 KB', '8 KB']] }],
      events: [
        { from: 's', to: 'r', label: 'DATA 4 KB', pkt: [tcp(52310, 443, 1, null, 'ACK', [['Len', 4096]])], tables: { b: [['4 KB', '4 KB']] }, say: '데이터가 수신 버퍼에 쌓인다. 앱(recv)은 바빠서 아직 읽어 가지 않았다.' },
        { from: 'r', to: 's', label: 'ACK  win=4096', color: 'ok', pkt: [tcp(443, 52310, '…', 4097, 'ACK', [['Window', 4096]])], say: 'ACK에 “<b>4 KB까지 더 받을 수 있다</b>”를 싣는다.' },
        { from: 's', to: 'r', label: 'DATA 4 KB', pkt: [tcp(52310, 443, 4097, null, 'ACK', [['Len', 4096]])], tables: { b: [['8 KB', '0 KB']] }, say: '버퍼가 가득 찼다.' },
        { from: 'r', to: 's', label: 'ACK  win=0', color: 'bad', state: { s: '전송 정지' }, pkt: [tcp(443, 52310, '…', 8193, 'ACK', [['Window', 0]])], say: '<b>Zero Window</b> → 송신 정지. 진짜 원인은 네트워크가 아니라 <b>수신 앱이 느린 것</b>(recv 루프가 막혔거나 처리 스레드가 blocking 작업 중).' },
        { from: 's', to: 'r', label: 'Window Probe', color: 'l1', pkt: [tcp(52310, 443, 8193, null, 'ACK', [['Len', 0]])], say: '송신자는 주기적으로 “이제 받을 수 있나?”를 묻는다.' },
        { from: 'r', to: 's', label: 'ACK  win=6144', color: 'ok', state: { s: '전송 재개', r: '앱이 6 KB 읽어 감' }, pkt: [tcp(443, 52310, '…', 8193, 'ACK', [['Window', 6144]])], tables: { b: [['2 KB', '6 KB']] }, say: '앱이 읽어 가 공간이 생기면 다시 보낸다. Wireshark 필터: <code>tcp.analysis.zero_window</code>.' },
      ] } },
    { h3: 'BDP = 대역폭 × RTT — 파이프를 꽉 채우려면 윈도우가 이만큼 커야 한다' },
    { lab: { title: '파이프 부피와 윈도우', init: { bw: 1000, rtt: 30, win: 64 },
      ctl: [{ k: 'bw', label: '대역폭', unit: 'Mbps', min: 1, max: 10000 }, { k: 'rtt', label: 'RTT', unit: 'ms', min: 1, max: 300 }, { k: 'win', label: '윈도우', unit: 'KB', min: 1, max: 16384 }],
      out: st => { const bdp = st.bw * 1e6 / 8 * st.rtt / 1000, util = Math.min(1, st.win * 1000 / bdp);
        return `<div class="result">BDP = ${st.bw} Mbps ÷ 8 × ${st.rtt} ms = <b>${fmtB(bdp)}</b><br>링크 사용률 ≈ 윈도우 ${st.win} KB ÷ BDP = <b>${(util * 100).toFixed(1)}%</b> → 처리량 ≈ ${Math.min(st.bw, st.win * 8000 / (st.rtt / 1000) / 1e6).toFixed(1)} Mbps</div>` +
          barsHTML([{ label: '파이프 (BDP)', segs: [{ v: util, c: util >= 1 ? 'ok' : 'l4', t: '' }, { v: 1 - util, c: 'line', t: '' }], val: (util * 100).toFixed(1) + '% 채움' }], 1) +
          `<p style="margin:0">강의 예: 1 Gbps × 30 ms ≈ <b>3.75 MB</b>. 윈도우가 64 KB에 묶이면 링크의 <b>2%도 못 쓴다</b> → Window Scaling이 필수인 이유. Flow control은 “상대 컵의 크기”, congestion control은 “중간 수도관의 굵기” — 실제 전송량은 작은 쪽에 맞춰진다.</p><div class="assume"><b>가정</b> 1 KB = 1000 B (강의 계산과 같은 10진 단위), 손실 없음.</div>`; } } },
  ] },

{ id: 'w3.cc', title: '혼잡제어: Slow Start & AIMD', slides: 'S23–S25',
  blocks: [
    `<p>병목 라우터의 큐가 차면 지연이 늘고(bufferbloat), 결국 버려진다. <b>TCP는 라우터에게 “막혔나요?”라고 묻지 않는다</b> — 손실과 지연 변화를 관찰해 스스로 추정한다(그래서 무선처럼 손실이 혼잡과 무관한 환경에서는 오판). 같은 병목의 흐름들이 모두 같은 규칙(AIMD)을 따른다는 <b>공평성</b> 전제 위에 인터넷이 돌아간다. 필기: 트래픽은 호스트가 만들므로 호스트들이 같이 조금씩 줄이면 완화된다.</p>`,
    T(['단계', '규칙'], [['① Slow Start', '1 MSS에서 시작해 <b>매 RTT마다 2배</b>. 느린 것이 아니라 “낮게 시작”'], ['② Congestion Avoidance', 'ssthresh 이상이면 <b>매 RTT마다 +1 MSS</b>'], ['③ 3 dup ACK', 'ssthresh = cwnd/2, cwnd = ssthresh (<b>절반</b>, Multiplicative Decrease) 후 선형 증가'], ['④ 타임아웃', 'ssthresh = cwnd/2, <b>cwnd = 1</b>, Slow Start부터']]),
    { lab: { title: 'cwnd 시뮬레이터 — 손실 이벤트를 넣어 보기', init: { ss0: 32, rounds: 30, ev: '12d, 22t' },
      ctl: [{ k: 'ss0', label: '초기 ssthresh', unit: 'MSS', min: 2, max: 64 }, { k: 'rounds', label: '라운드 수', min: 8, max: 40 }, { k: 'ev', type: 'text', label: '손실 이벤트 (d = 3 dup ACK, t = 타임아웃)', w: 220, ph: '예: 12d, 22t' }],
      out: st => { const d = cwndSim({ ss0: st.ss0, rounds: st.rounds, ev: parseEv(st.ev) }); return '<div class="chartbox"></div>' + roundTable(d) + `<div class="assume"><b>규칙</b> 한 라운드 = 1 RTT, 단위 MSS. 이벤트가 감지된 라운드의 <b>다음 라운드</b>부터 줄어든 값이 쓰인다. Slow Start는 ssthresh에 닿으면 멈추고 +1로 바뀐다. <span class="L3">파랑</span> = Slow Start, <span class="cok">초록</span> = Congestion Avoidance.</div>`; },
      after: (st, out) => { const ev = parseEv(st.ev); const d = cwndSim({ ss0: st.ss0, rounds: st.rounds, ev }); const ym = Math.max(8, ...d.map(x => Math.max(x.cw, x.ss))) + 4;
        lineChart(out.querySelector('.chartbox'), { h: 320, xmax: st.rounds, ymax: ym, yticks: Array.from({ length: Math.floor(ym / 10) + 1 }, (_, i) => i * 10), xticks: Array.from({ length: Math.floor(st.rounds / 2) + 1 }, (_, i) => i * 2), xlabel: '전송 라운드 (RTT)', ylabel: 'cwnd (MSS)', series: [{ pts: d.map(x => [x.t, x.ss]), color: 'l4', w: 2, dash: '6 4', step: true }, { pts: d.map(x => [x.t, x.cw]), color: 'l3', w: 3, dots: i => d[i].cw < d[i].ss ? 'l3' : 'ok' }], marks: Object.entries(ev).filter(([t]) => +t <= st.rounds).map(([t, e]) => ({ x: +t, y: d[+t].cw, t: e === 'dup' ? '3 dup ACK' : '타임아웃', c: e === 'dup' ? 'l4' : 'bad' })), legend: [['cwnd', 'l3'], ['ssthresh', 'l4', 1]] }); } } },
    H.key('AIMD = Additive Increase, Multiplicative Decrease. 천천히 올리고 급히 내리는 비대칭이 인터넷이 붕괴하지 않는 이유다. 실제 전송량 = min(rwnd, cwnd).'),
    H.warn('<b>강의 그래프 확인 포인트</b> (필기 “마지막 구간이 이상한 듯”): 타임아웃 뒤 ssthresh는 약 17로 내려가는데 슬라이드 그림은 Slow Start로 32 근처까지 올라간다. 규칙대로라면 cwnd가 새 ssthresh에 닿는 순간 +1 선형으로 바뀌어야 한다 — 위 시뮬레이터가 규칙대로 그린 모양.'),
    T(['알고리즘', '혼잡 신호', '특징'], [['Reno / NewReno', '손실', '교과서 표준 AIMD. 고속·장거리에서 회복이 느리다'], ['CUBIC', '손실 (3차 함수)', '리눅스 기본값. 손실 직전 지점까지 빠르게 복귀 후 근처에서 완만히 탐색'], ['BBR', '대역폭·RTT', '큐가 차기 전에 지연 증가 감지. 버퍼블로트에 강하지만 공평성 논쟁']]),
    `<p>확인: <code>sysctl net.ipv4.tcp_congestion_control</code> → cubic. 중요한 것은 이름 암기가 아니라 “TCP는 스스로 속도를 조절하고, 그 조절이 지연·손실에 반응한다”는 구조다.</p>`,
  ] },

{ id: 'w3.udp', title: 'UDP와 QUIC', slides: 'S26–S27',
  blocks: [
    { fig: `<div style="max-width:560px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;font-family:var(--f-mono);font-size:13.5px;font-weight:600;text-align:center">${['Source Port 16', 'Destination Port 16', 'Length 16', 'Checksum 16'].map(x => `<div style="background:var(--l4s);color:var(--l4);padding:10px;border-radius:4px">${x}</div>`).join('')}<div style="grid-column:1/3;background:var(--l7s);color:var(--l7);padding:10px;border-radius:4px">Payload — 보낸 단위 그대로</div></div></div>`, cap: 'UDP 헤더 8바이트가 전부. 필기: 포트 두 개 = 다중화, Length = 길이, Checksum = 오류 검출.' },
    `<p><b>UDP가 하지 않는 것</b>: 연결 수립·종료, 순서 보장, 재전송, 흐름 제어, 혼잡 제어. 대신 <b>데이터그램 경계 유지</b>(sendto 1번 = recvfrom 1번), <b>1:N</b>(broadcast·multicast), <b>상태 없음</b>(확장이 쉽지만 누가 누구인지 앱이 관리).</p>`,
    T(['같은 메시지 3개 전송', '받는 쪽에서 보이는 모습'], [['TCP recv()', '<code>hellonicebye</code> 처럼 붙어 오거나 쪼개져 온다 — 경계 없음'], ['UDP recvfrom()', '<code>hello</code> · <code>nice</code> · <code>bye</code> 3번 그대로']]),
    `<p><b>DNS가 UDP를 쓰는 이유</b>: 질의 하나·응답 하나로 끝나는데 핸드셰이크에 1 RTT를 더 쓰기 아깝다. 실패하면 다시 물으면 된다.</p>`,
    { h3: '“UDP가 빠르다”는 정확히 무슨 뜻인가' },
    T(['', ''], [['<span class="cok">맞는 부분</span> 시작 지연이 없다', '핸드셰이크 1 RTT가 없고, 유실돼도 재전송을 기다리지 않는다 — “늦은 데이터는 쓸모없는” 실시간 음성·영상에 결정적'], ['<span class="cbad">틀린 부분</span> 대역폭이 더 크지 않다', '같은 회선에서 최대 처리량은 비슷하다. 혼잡제어가 없어 과도하게 보내면 손실이 폭증해 오히려 느려질 수 있다 (필기: 막히는 건 똑같이 막힌다)'], ['<b>숨은 비용</b> 결국 다시 만든다', '순서·재전송·혼잡제어가 필요해지면 앱이 직접 구현 → 사실상 “나만의 TCP”']]),
    `<p>${H.exam('Quick Check Q2')}<b>QUIC (HTTP/3)</b> — 그래서 나온 절충안: UDP 위, 사용자 공간에서 구현(개선 배포가 빠름) · 전송+암호화 통합(1 RTT, 재방문 0-RTT) · 스트림 단위 독립(HOL 완화) · Connection ID(Wi-Fi↔LTE로 IP가 바뀌어도 유지). HTTP/3는 443을 그대로 쓰지만 UDP라, 방화벽이 UDP 443을 막으면 조용히 TCP로 돌아간다.</p>`,
  ] },

{ id: 'w3.hdr', title: 'TCP 헤더와 캡슐화', slides: 'S28–S29',
  blocks: [
    { lab: { title: 'TCP 헤더 — 필드를 골라 보기', init: { f: 'flags' },
      ctl: [{ k: 'f', type: 'select', label: '필드', opts: Object.entries(HDR).map(([k, v]) => [k, v[0]]) }],
      out: st => { const rows = [[['ports', 'Source Port', 16], ['ports', 'Destination Port', 16]], [['seq', 'Sequence Number', 32]], [['ack', 'Acknowledgment Number', 32]], [['x', 'Offset', 4], ['x', 'Rsvd', 3], ['flags', 'Flags', 9], ['win', 'Window Size', 16]], [['x', 'Checksum', 16], ['x', 'Urgent Pointer', 16]], [['opt', 'Options (0 ~ 40 bytes)', 32]]];
        return `<div style="max-width:640px;display:flex;flex-direction:column;gap:3px">${rows.map(r => `<div style="display:flex;gap:3px">${r.map(([k, l, w]) => `<div style="flex:${w};padding:9px 4px;text-align:center;border-radius:4px;font-size:${w < 8 ? 11.5 : 13.5}px;font-weight:600;background:${k === st.f ? 'var(--ink)' : 'var(--l4s)'};color:${k === st.f ? 'var(--paper)' : 'var(--l4)'}">${l}</div>`).join('')}</div>`).join('')}</div><div class="result" style="margin-top:12px"><b>${HDR[st.f][0]}</b><br>${HDR[st.f][1]}</div><p style="margin:0">필드 하나하나가 이번 주 개념이다. <b>RST</b>는 “이 연결은 없다” — 닫힌 포트로 SYN을 보내면 RST가 돌아오고 앱에는 <b>Connection refused</b>(Lab 2 그림 4). 필기: 필드가 많을수록 받는 쪽 파싱이 무겁다(UDP 8바이트와 대조).</p>`; } } },
    { lab: { title: '캡슐화 — MTU에서 MSS로', init: { mtu: 1500, file: 1000000 },
      ctl: [{ k: 'mtu', label: 'MTU', unit: 'B', min: 576, max: 9000 }, { k: 'file', label: '파일 크기', unit: 'B', min: 1000, max: 100000000, type: 'num' }],
      out: st => { const mss = st.mtu - 40, n = Math.ceil(st.file / mss);
        return `<div style="overflow-x:auto;margin-bottom:10px">${H.pk([['Eth 14', 'l2'], ['IP 20', 'l3'], ['TCP 20', 'l4'], [`data ${mss}`, 'l7'], ['FCS 4', 'l2']])}</div><div class="result">MSS = MTU ${st.mtu} − IP 20 − TCP 20 = <b>${mss} B</b> (UDP payload = ${st.mtu - 28} B)<br>${IP.fmt(st.file)} B ÷ ${mss} = <b>${IP.fmt(n)}개</b> 세그먼트 · 헤더 오버헤드 40 ÷ ${st.mtu} = ${(40 / st.mtu * 100).toFixed(2)}%</div><p style="margin:0">강의 예: 1MB ≈ 690개 세그먼트, 오버헤드 약 2.7%. MTU를 넘으면 <b>IP 단편화</b>가 일어나고 조각 하나만 잃어도 전체를 다시 보내야 한다 — VPN·터널에서 MTU를 줄이는 이유(해 보기: 1400). IP 주소는 hop마다 그대로, MAC은 바뀌고, TCP 헤더는 종단 간 그대로.</p>`; } } },
  ] },

{ id: 'w3.sock', title: 'Socket API', slides: 'S30–S34',
  blocks: [
    `<p><b>Socket</b> = (프로토콜, 로컬 IP, 로컬 Port, 원격 IP, 원격 Port)로 지정되는 통신 endpoint. 프로세스에게는 <b>정수 하나(파일 디스크립터)</b>로 보인다 — 파일·파이프·소켓을 같은 API(read/write/close)로 다루는 UNIX 철학. ${H.exam('Quick Check Q3')}<b>Port ≠ Socket</b>: Port는 번호(주소), Socket은 그 주소에 묶인 통신 창구(객체). 한 포트 위에 소켓 수천 개가 있을 수 있다.</p>`,
    T(['종류', '생성', '특징', '용도'], [['Stream', 'socket(AF_INET, SOCK_STREAM)', 'TCP · 연결형 · 바이트 스트림', 'HTTP, DB, SSH'], ['Datagram', 'socket(AF_INET, SOCK_DGRAM)', 'UDP · 비연결형 · 경계 유지', 'DNS, 스트리밍, 게임'], ['Raw', 'socket(AF_INET, SOCK_RAW)', '헤더 직접 조립 (권한 필요)', 'ping, 패킷 분석'], ['Unix Domain', 'socket(AF_UNIX, SOCK_STREAM)', '같은 호스트 내부', 'Docker socket']], { mono: [1] }),
    { trace: { mode: 'ladder', title: '함수 호출과 커널이 하는 일', sub: '핸드셰이크는 커널이 한다', minW: 760, side: 110,
      lanes: [{ id: 'ca', label: 'Client 코드' }, { id: 'ck', label: 'Client 커널' }, { id: 'sk', label: 'Server 커널' }, { id: 'sa', label: 'Server 코드' }],
      tables: [{ id: 'fd', title: 'Server 프로세스의 소켓(FD)', cols: ['FD', '소켓', '상태'] }],
      events: [
        { from: 'sa', to: 'sk', label: 'socket() · bind() · listen(128)', color: 'l4', tables: { fd: [['3', 'listen 소켓 0.0.0.0:9000', 'LISTEN']] }, say: '<code>socket()</code>으로 만들고(아직 주소 없음) → <code>bind()</code>로 IP+Port를 붙이고(EADDRINUSE 가능) → <code>listen(backlog)</code>으로 수동 대기 + 접속 대기열 생성.' },
        { from: 'sa', to: 'sa', label: 'accept() ⏳ 블로킹', color: 'l4', say: '<code>accept()</code>는 “연결 하나를 꺼내 달라”며 기다린다.' },
        { from: 'ca', to: 'ck', label: 'socket() · connect()', color: 'l4', say: '클라이언트는 bind를 생략한다 — 서버와 주고받을 때만 포트가 필요하므로 OS가 ephemeral 포트를 자동 할당(필기). <code>connect()</code>가 핸드셰이크를 시작시킨다.' },
        { from: 'ck', to: 'sk', label: 'SYN', color: 'l1', pkt: [tcp(52310, 9000, 'x', null, 'SYN')], say: '여기부터는 <b>커널</b>이 한다.' },
        { from: 'sk', to: 'ck', label: 'SYN+ACK', color: 'l1', pkt: [tcp(9000, 52310, 'y', 'x+1', 'SYN, ACK')], say: 'Server 커널이 응답(SYN queue에 기록).' },
        { from: 'ck', to: 'sk', label: 'ACK', color: 'l1', state: { ca: 'connect() 반환' }, pkt: [tcp(52310, 9000, 'x+1', 'y+1', 'ACK')], say: '핸드셰이크 완료 → 연결이 <b>accept queue</b>에 들어간다. connect()가 여기서 반환 — 실패한다면(refused/timeout) 바로 여기서 드러난다.' },
        { from: 'sk', to: 'sa', label: 'accept() 반환 → conn', color: 'ok', tables: { fd: [['3', 'listen 소켓 0.0.0.0:9000', 'LISTEN'], ['4', '연결 소켓 ↔ 127.0.0.1:52310', 'ESTABLISHED']] }, say: '<b>accept()는 새 연결을 “만드는” 함수가 아니라 이미 맺어진 연결을 큐에서 “꺼내는” 함수</b>다. 새 소켓(FD 4)이 생겼다.' },
        { from: 'ca', to: 'sa', label: 'sendall(b"hello")', color: 'l7', pkt: [tcp(52310, 9000, 'x+1', 'y+1', 'PSH, ACK'), data('hello')], say: '데이터는 <b>연결 소켓(conn)</b>으로만 오간다. 필기: 반복문 안에서 srv(listen)는 쓰지 않고 conn만 쓴다.' },
        { from: 'sa', to: 'ca', label: 'conn.sendall(data)', color: 'l7', pkt: [tcp(9000, 52310, 'y+1', 'x+6', 'PSH, ACK'), data('hello')], say: 'echo.' },
        { from: 'ca', to: 'sa', label: 'close() → FIN', color: 'l4', state: { sa: 'recv() == b""' }, tables: { fd: [['3', 'listen 소켓 0.0.0.0:9000', 'LISTEN']] }, say: '클라이언트가 닫으면 서버의 <code>recv()</code>가 <b>0(b"")</b>을 반환 = 상대가 FIN을 보냈다. 서버도 conn.close() → 다시 accept()로. listen 소켓을 닫는 것은 더 이상 서버를 안 쓰겠다는 뜻.' },
      ] } },
    { h3: 'listen 소켓과 연결 소켓 — 서버 포트는 하나, 소켓은 N+1개' },
    T(['대기열', '들어 있는 것', '넘치면'], [['SYN queue', 'SYN을 받고 SYN/ACK를 보낸 상태 (SYN_RCVD)', 'SYN flood 공격의 표적 → SYN cookie'], ['Accept queue', '핸드셰이크가 끝난(ESTABLISHED) 연결', '앱이 accept()를 늦게 부르면 차고 새 연결이 버려짐 (Recv-Q↑)']]),
    `<p><code>listen(128)</code>의 128 = accept queue 길이. “서버가 느리다”의 상당수는 처리 속도가 아니라 <b>accept 지연</b>이다 → 멀티스레드 · select/epoll · asyncio. 필기: 소켓을 계속 너무 많이 늘어나게 만드는 것이 DDoS. ${H.exam('Quick Check Q5')}<code>ss -lt</code>는 listen 소켓만, <code>ss -t</code>는 연결 소켓을 보여 준다.</p>`,
    { h3: 'Python TCP Echo — 함수 호출 순서가 곧 프로토콜의 절차' },
    H.pre(`srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(("0.0.0.0", 9000))
srv.listen(128)
while True:
    conn, addr = srv.accept()        # 연결 소켓
    with conn:
        conn.settimeout(5.0)
        while True:
            data = conn.recv(4096)
            if not data:             # FIN 수신
                break
            conn.sendall(data)`),
    T(['줄', '이유'], [['SO_REUSEADDR', 'TIME_WAIT 때문에 재시작(bind)이 막히는 것을 피한다 — Lab 2: 끄면 Errno 98'], ['recv()가 b""', '상대가 FIN을 보냈다 — 연결 종료 신호'], ['sendall()', 'send()는 일부만 보낼 수 있다'], ['settimeout()', '없으면 장애 시 무한 대기 — AI 생성 코드의 1순위 점검 항목'], ['with conn:', '예외가 나도 close() → CLOSE_WAIT 누수 방지'], ['recv(4096)', '“4096바이트를 받는다”가 아니라 “<b>최대</b> 4096까지 지금 온 만큼”']]),
    { h3: 'Python UDP Echo — 사라진 함수들이 곧 UDP가 하지 않는 일' },
    T(['', 'TCP 코드', 'UDP 코드'], [['연결', 'listen() · accept() · connect()', '없음 — bind() 후 바로'], ['주소 지정', '연결 시 1회', '매 패킷마다 (sendto / recvfrom)'], ['종료 감지', 'recv()가 0 → FIN', '없음 — 상대가 죽어도 모름'], ['유실 대응', '커널이 재전송', '앱이 타임아웃·재시도·순서번호 직접']]),
    `<p>Lab 2 관찰: UDP 서버를 끈 뒤에도 sendto()는 성공했고, 응답이 없어 2초 후 타임아웃. <code>ss -uan</code>에서 UDP 소켓은 LISTEN/ESTAB 없이 <b>UNCONN</b>. 필기: recvfrom은 매번 “누가 보냈는지”를 함께 돌려준다. UDP는 서버·클라이언트 관계가 명확하지 않다 — 그냥 보내고 받는 관계. (UDP도 양방향으로 주고받을 수 있다 — echo 서버가 sendto로 답한다.)</p>`,
  ] },

{ id: 'w3.diag', title: '관찰과 진단', slides: 'S35–S37',
  blocks: [
    { lab: { title: '증상 → 기술적 의미 → 먼저 볼 곳', init: { s: 'refused' },
      ctl: [{ k: 's', type: 'select', label: '오류 / 증상', opts: Object.entries(SYM3).map(([k, v]) => [k, v[0]]) }],
      out: st => { const m = SYM3[st.s]; return `<div class="result"><b>${m[0]}</b><br>의미: ${m[1]}<br>계층: ${m[2]} · 먼저 확인: ${m[3]}</div>` + T(['오류', '의미', '계층'], Object.values(SYM3).map(r => [r[0], r[1], r[2]]), { hl: r => r[0] === m[0] }); } } },
    H.key(`${H.exam('Quick Check Q9')} refused = “상대는 살아 있고 그 문 앞에 아무도 없다”(RST 수신 → 프로세스·포트·bind), timed out = “문에 도달했는지조차 모른다”(응답 없음 → 방화벽·라우팅). 조사 방향이 완전히 반대다.`),
    H.pre(`$ netstat -anp tcp
State       Recv-Q Send-Q  Local Address:Port    Peer Address:Port
LISTEN      0      128     0.0.0.0:9000          0.0.0.0:*
ESTAB       0      0       192.168.0.12:52310    93.184.216.34:443
TIME-WAIT   0      0       192.168.0.12:52288    93.184.216.34:443
CLOSE-WAIT  1      0       192.168.0.12:52301    10.0.0.7:8080`),
    T(['항목', '읽는 법'], [['Recv-Q', '커널이 받았는데 앱이 안 읽어간 양. 계속 쌓이면 <b>앱이 병목</b>'], ['Send-Q', '보냈지만 ACK 안 온 양. 계속 쌓이면 <b>네트워크나 상대가 병목</b>'], ['TIME-WAIT 다수', '내가 먼저 닫는 쪽 → 커넥션 재사용 검토'], ['CLOSE-WAIT 존재', 'close() 누락 — 코드 버그']]),
    `<p>${H.exam('Quick Check Q10')}“연결은 되는데 느리다” → RTT와 변동, 재전송률(<code>tcp.analysis.retransmission</code>), Recv-Q/Send-Q, 윈도우 크기(zero_window, BDP 대비)를 측정한다.</p>`,
    `<p><b>Wireshark로 보는 순서</b>: ① 서버 실행 → ss -lt로 LISTEN ② 접속 → 핸드셰이크 3개 ③ 데이터 → Seq/Ack/Len 추적 ④ 종료 → FIN 4개와 TIME_WAIT ⑤ 서버를 끈 뒤 접속 → RST. “Follow → TCP Stream”이 한 연결의 전체 생애를 보여 준다.</p>`,
    T(['문제 범위 좁히기 (S37)', ''], [['① 재현', '언제·누가·어디서? 100%인가 간헐적인가(간헐적이면 재전송·타임아웃 의심)'], ['② 관찰', 'ss · 로그 · tcpdump/Wireshark — 추측 전에 증거'], ['③ 계층 특정', 'ping(네트워크) → nc 포트(전송) → curl(앱) 순서로 올라가며'], ['④ 설정 확인', '127.0.0.1 vs 0.0.0.0, 포트 매핑, 방화벽, DNS'], ['⑤ 가설 검증', '한 번에 하나만 바꾼다'], ['⑥⑦ 수정·확인', '실패 재현 절차로 다시 검증하고 기록']]),
    H.note('좋은 프롬프트는 증상이 아니라 증거를 담는다: “ss에는 LISTEN이 있고, 로컬 curl은 되지만 외부에서는 timed out”.'),
  ] },

{ id: 'w3.design', title: 'Design Choice — 요구사항이 프로토콜을 정한다', slides: 'S38',
  blocks: [
    { lab: { title: '사례를 골라 보기 (과제 1: 게임 · 파일전송 · IoT 센서 · 영상통화)', init: { c: 'game' },
      ctl: [{ k: 'c', type: 'select', label: '사례', opts: DESIGN.map(d => [d[0], d[1]]) }],
      out: st => { const d = DESIGN.find(x => x[0] === st.c); return `<div class="result">${d[1]} → 핵심 요구: ${d[2]} → <b>${d[3]}</b><br>${d[4]}</div>` + T(['사례', '핵심 요구', '선택', '이유'], DESIGN.map(x => [x[1], x[2], '<b>' + x[3] + '</b>', x[4]]), { hl: r => r[0] === d[1] }); } } },
    H.key('질문은 언제나 같다 — 이 데이터는 늦게라도 정확해야 하는가, 아니면 부정확해도 지금 도착해야 하는가?'),
  ] },

{ id: 'w3.p1', title: 'Seq / ACK 추적', slides: 'S10, S12, S18 · QC Q1·Q7', tag: '연습',
  blocks: [{ prac: { id: 'p31', title: 'ISN과 세그먼트 길이로 번호 맞히기',
    gen: rng => ({ x: rng.int(1000, 90000), y: rng.int(1000, 90000), l: [rng.int(2, 15) * 100, rng.int(2, 15) * 100, rng.int(1, 14) * 100 + rng.int(0, 99)] }),
    problem: P => `<p>Client ISN = <b class="mono">${P.x}</b>, Server ISN = <b class="mono">${P.y}</b>. 핸드셰이크 후 Client가 ${P.l[0]}, ${P.l[1]}, ${P.l[2]} 바이트 세그먼트를 연달아 보낸다.</p><ol><li>SYN+ACK의 ack</li><li>Client 첫 데이터 세그먼트의 seq</li><li>세 개가 모두 도착했을 때 Server의 누적 ACK</li><li>두 번째만 유실됐다면, 세 번째가 도착했을 때 Server가 보내는 ACK</li></ol>`,
    answers: P => [{ label: 'SYN+ACK의 ack', ans: P.x + 1, type: 'num' }, { label: '첫 데이터 seq', ans: P.x + 1, type: 'num' }, { label: '누적 ACK', ans: P.x + 1 + P.l[0] + P.l[1] + P.l[2], type: 'num' }, { label: '유실 시 ACK', ans: P.x + 1 + P.l[0], type: 'num' }],
    solution: P => { const a = P.x + 1, b = a + P.l[0], c = b + P.l[1], e = c + P.l[2]; return [`SYN이 1을 소모 → SYN+ACK의 ack = x+1 = <b>${a}</b>`, `핸드셰이크 마지막 ACK의 seq도 x+1이고, 데이터는 seq = <b>${a}</b>부터`, `seg2 = ${a}+${P.l[0]} = ${b}, seg3 = ${b}+${P.l[1]} = ${c}, 누적 ACK = ${c}+${P.l[2]} = <b>${e}</b>`, `seg2(seq=${b})가 비면 누적 ACK는 그 앞에서 멈춘다 → <b>${b}</b> (중복 ACK). seg3은 버퍼에 보관.`]; } } }] },

{ id: 'w3.p2', title: 'MSS · 처리량 · BDP 계산', slides: 'S21–S22, S29', tag: '연습',
  blocks: [{ prac: { id: 'p32', title: '숫자 네 개',
    gen: rng => ({ mtu: rng.pick([1500, 1500, 1400, 1280, 9000]), file: rng.int(2, 50) * 100000, rtt: rng.pick([10, 20, 30, 40, 50, 80, 100]), bw: rng.pick([100, 200, 500, 1000]) }),
    problem: P => `<p>MTU <b>${P.mtu} B</b>(IP·TCP 헤더 각 20 B), RTT <b>${P.rtt} ms</b>, 대역폭 <b>${P.bw} Mbps</b>.</p><ol><li>MSS (B)</li><li>${IP.fmt(P.file)} B 파일의 세그먼트 수 (올림)</li><li>Stop-and-Wait(윈도우 1 MSS) 처리량 상한 (Mbps, 소수 둘째 자리)</li><li>BDP (KB, 1 KB = 1000 B, 소수 첫째 자리)</li></ol>`,
    answers: P => { const m = P.mtu - 40; return [{ label: 'MSS', ans: m, type: 'num', unit: 'B' }, { label: '세그먼트 수', ans: Math.ceil(P.file / m), type: 'num' }, { label: 'Stop-and-Wait', ans: +(m * 8 / (P.rtt / 1000) / 1e6).toFixed(2), type: 'num', tol: .011, unit: 'Mbps' }, { label: 'BDP', ans: +(P.bw * 1e6 / 8 * P.rtt / 1e6).toFixed(1), type: 'num', tol: .051, unit: 'KB' }]; },
    solution: P => { const m = P.mtu - 40; return [`MSS = ${P.mtu} − 20 − 20 = <b>${m}</b>`, `${IP.fmt(P.file)} ÷ ${m} = ${(P.file / m).toFixed(2)} → 올림 <b>${Math.ceil(P.file / m)}</b> (마지막 조각도 세그먼트 하나)`, `RTT마다 MSS 하나: ${m} × 8 ÷ ${P.rtt / 1000} s = ${IP.fmt(Math.round(m * 8 / (P.rtt / 1000)))} bps ≈ <b>${(m * 8 / (P.rtt / 1000) / 1e6).toFixed(2)} Mbps</b> — 바이트→비트(×8)를 잊지 말 것`, `BDP = ${P.bw} × 10⁶ ÷ 8 × ${P.rtt / 1000} = ${IP.fmt(P.bw * 1e6 / 8 * P.rtt / 1000)} B = <b>${(P.bw * 1e6 / 8 * P.rtt / 1e6).toFixed(1)} KB</b>. 윈도우가 이보다 작으면 링크를 다 못 쓴다.`]; } } }] },

{ id: 'w3.p3', title: 'cwnd 추적', slides: 'S24', tag: '연습',
  blocks: [{ prac: { id: 'p33', title: '라운드별 cwnd 표 만들기',
    gen: rng => { const ss0 = rng.pick([8, 16, 32]); const d = rng.int(ss0 === 8 ? 6 : 7, 10); const t = rng.int(d + 4, d + 8); return { ss0, ev: { [d]: 'dup', [t]: 'to' }, d, t, ask: t + rng.int(2, 5) }; },
    problem: P => `<p>cwnd = 1 MSS, ssthresh = ${P.ss0}에서 시작. 라운드 ${P.d}에서 3 dup ACK, 라운드 ${P.t}에서 타임아웃이 감지된다. (규칙: 3 dup → ssthresh = cwnd/2, cwnd = ssthresh · 타임아웃 → ssthresh = cwnd/2, cwnd = 1 · Slow Start는 ssthresh에서 멈춤 · 감지된 다음 라운드부터 반영)</p><ol><li>라운드 ${P.d}의 cwnd</li><li>라운드 ${P.d + 1}의 cwnd</li><li>타임아웃 직후 ssthresh</li><li>라운드 ${P.ask}의 cwnd</li></ol>`,
    answers: P => { const d = cwndSim({ ss0: P.ss0, rounds: P.ask, ev: P.ev }); return [{ label: `라운드 ${P.d}`, ans: d[P.d].cw, type: 'num' }, { label: `라운드 ${P.d + 1}`, ans: d[P.d + 1].cw, type: 'num' }, { label: '타임아웃 후 ssthresh', ans: d[P.t + 1].ss, type: 'num' }, { label: `라운드 ${P.ask}`, ans: d[P.ask].cw, type: 'num' }]; },
    solution: P => { const d = cwndSim({ ss0: P.ss0, rounds: P.ask, ev: P.ev }); return [roundTable(d), `라운드 ${P.d}: cwnd ${d[P.d].cw} → 3 dup ACK → ssthresh = ${d[P.d + 1].ss}, cwnd = ${d[P.d + 1].cw} → 이후 +1`, `라운드 ${P.t}: cwnd ${d[P.t].cw} → 타임아웃 → ssthresh = <b>${d[P.t + 1].ss}</b>, cwnd = 1 → Slow Start로 ${d[P.t + 1].ss}까지 ×2, 그 뒤 +1 → 라운드 ${P.ask}에서 <b>${d[P.ask].cw}</b>`]; } } }] },

{ id: 'w3.qc', title: 'Quick Check — Week 3', slides: 'S40', tag: '점검',
  blocks: [`<p>“답을 검색하지 말고 먼저 본인 말로 적어 보라. 그다음 AI에게 물어 어긋나는 부분을 찾는 것이 이번 주 학습법이다.” (강의)</p>`, { qc: 'w3' }] },
] });
})();
