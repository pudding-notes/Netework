/* Week 2 — Internet & IP Networking */
'use strict';
(function () {
const T = H.tbl;
const ip = (s, d, extra = []) => ({ L: 'L3', n: 'IP', f: [['Src', s], ['Dst', d], ...extra] });
const eth = (s, d) => ({ L: 'L2', n: 'Ethernet', f: [['Src MAC', s], ['Dst MAC', d]] });
const tcp = (s, d, extra = []) => ({ L: 'L4', n: 'TCP', f: [['Src Port', s], ['Dst Port', d], ...extra] });
const udp = (s, d) => ({ L: 'L4', n: 'UDP', f: [['Src Port', s], ['Dst Port', d]] });
const arp = (op, f) => ({ L: 'L2', n: 'ARP', f: [['op', op], ...f] });
const ipOK = s => IP.parse(s) !== null;
const dot = b => b.replace(/(.{8})(?!$)/g, '$1.');

const RT = [{ d: '192.168.0.0', p: 24, gw: 'On-link', why: '내 LAN — 직접 전달' }, { d: '10.0.0.0', p: 8, gw: '10.1.1.1', why: '특정 사설망 경로' }, { d: '10.20.0.0', p: 16, gw: '10.1.1.2', why: '더 구체적인 사설망 경로 (LPM 설명용 추가)' }, { d: '0.0.0.0', p: 0, gw: '192.168.0.1', why: 'Default Route — 그 외 전부' }];
function lpm(dst, table) { const m = table.filter(r => IP.net(dst, r.p) === IP.parse(r.d)).sort((a, b) => b.p - a.p); return { m, best: m[0] }; }

const SYM = {
  refused: ['Connection refused', '그 포트에 뜬 프로세스가 없음 · 127.0.0.1에만 bind', 'Service · Bind', 'netstat -ano', [1, 2]],
  timeout: ['Connection timed out', '방화벽·Security Group이 조용히 차단', 'Firewall · Route', '방화벽 규칙 · tracert', [3, 5, 6]],
  unreach: ['Network is unreachable', 'Gateway·Routing 설정 오류', 'IP · Gateway', 'ipconfig · route print', [4, 5]],
  dns: ['Name not resolved', 'DNS 이름 오타 · DNS 서버 문제', 'DNS', 'nslookup', [7]],
  http: ['403 / 404 응답이 온다', '네트워크는 정상 — 애플리케이션 문제', 'Application', '서버 로그 · 경로 확인', []],
};
const LADDER = [['Service', '프로세스가 실행 중인가?', 'tasklist · 서버 로그'], ['Bind / Port', '올바른 IP·Port에 bind 했는가?', 'netstat -ano'], ['Local Firewall', 'Host에서 허용되는가?', 'Windows Firewall · ufw'], ['IP / Subnet', '주소 설정이 정상인가?', 'ipconfig /all'], ['Gateway / Route', '경로가 존재하는가?', 'route print · tracert'], ['NAT / Cloud Rule', '외부 접근이 허용되는가?', 'Security Group'], ['DNS', '이름이 올바른 IP로 바뀌는가?', 'nslookup']];

addWeek({ id: 'w2', num: 2, short: '2주', title: 'Internet & IP Networking', range: 'Week 2',
  lead: '“내 노트북에서 localhost로 잘 되는 서버가 왜 다른 컴퓨터에서는 안 열릴까?” — 주소(IP·Subnet) → 경로(Gateway·Routing) → 변환(NAT) → 서비스(Port·Bind) 순서로 답한다.',
  sections: [

{ id: 'w2.q', title: '주소를 안다는 것만으로 통신할 수 있을까', slides: 'S2, S4',
  blocks: [
    `<p>친구 PC에서 내 FastAPI(<code>localhost:8000</code>)에 접속하려면 네 개의 관문을 모두 통과해야 한다. 이번 주 전체가 이 네 질문에 대한 답이다.</p>`,
    T(['질문', '개념', '섹션'], [['<b>WHERE</b> 상대는 어디에 있는가?', 'IP Address · Subnet', '2.2–2.5'], ['<b>HOW</b> 어느 경로로 갈 것인가?', 'Gateway · Routing', '2.6–2.8'], ['<b>WHO</b> 어떤 프로그램인가?', 'Port · Bind', '2.9, 2.13'], ['<b>CAN</b> 외부에서 들어올 수 있는가?', 'NAT · Firewall', '2.10–2.13']]),
    { h3: 'Big Picture — 각 장비는 next hop만 결정한다 (S4)' },
    { trace: { title: 'Laptop → Cloud Server', sub: 'MAC은 설명용 축약', rowH: 100, minW: 680,
      nodes: [{ id: 'l', label: 'Laptop', sub: '192.168.0.23', icon: 'laptop', x: .07, y: 0 }, { id: 'hr', label: 'Home Router', sub: '192.168.0.1', icon: 'router', x: .29, y: 0 }, { id: 'isp', label: 'ISP', icon: 'router', x: .50, y: 0 }, { id: 'ir', label: 'Internet Routers', icon: 'router', x: .71, y: 0 }, { id: 'cs', label: 'Cloud Server', sub: '34.1.2.3', icon: 'server', x: .93, y: 0 }],
      links: [['l', 'hr'], ['hr', 'isp'], ['isp', 'ir'], ['ir', 'cs']],
      tables: [{ id: 'd', title: '이 hop에서 내린 판단', cols: ['장비', '판단 근거', 'next hop'] }],
      events: [
        { from: 'l', to: 'hr', label: '→ Gateway', pkt: [eth('aa:aa', 'bb:bb'), ip('192.168.0.23', '34.1.2.3')], tables: { d: [['Laptop', '34.1.2.3은 내 subnet 밖', 'Default Gateway 192.168.0.1']] }, say: 'Laptop은 목적지가 자기 네트워크 밖이라는 것만 알면 된다. 그래서 <b>Default Gateway</b>에게 넘긴다.' },
        { from: 'hr', to: 'isp', label: '→ ISP', pkt: [eth('cc:cc', 'dd:dd'), ip('192.168.0.23 → (NAT) 203.0.113.5', '34.1.2.3')], tables: { d: [['Laptop', '34.1.2.3은 내 subnet 밖', 'Default Gateway 192.168.0.1'], ['Home Router', 'Default Route', 'ISP']] }, say: '공유기도 전체 경로를 모른다. Default Route로 ISP에 넘긴다(이때 NAT로 출발지가 바뀌는 것은 2.10).' },
        { from: 'isp', to: 'ir', label: '→ 다음 라우터', pkt: [eth('ee:ee', 'ff:ff'), ip('203.0.113.5', '34.1.2.3')], tables: { d: [['Laptop', '34.1.2.3은 내 subnet 밖', 'Default Gateway 192.168.0.1'], ['Home Router', 'Default Route', 'ISP'], ['ISP', '34.0.0.0/8 경로', 'Internet Router']] }, say: 'ISP 라우터는 라우팅 테이블에서 34.x로 가는 경로를 찾아 다음 라우터에 넘긴다.' },
        { from: 'ir', to: 'cs', label: '→ 서버', pkt: [eth('11:11', '22:22'), ip('203.0.113.5', '34.1.2.3')], tables: { d: [['Laptop', '34.1.2.3은 내 subnet 밖', 'Default Gateway 192.168.0.1'], ['Home Router', 'Default Route', 'ISP'], ['ISP', '34.0.0.0/8 경로', 'Internet Router'], ['Internet Router', '34.1.2.0/24 = 직접 연결', 'Cloud Server']] }, say: '마지막 라우터가 서버에 전달. <b>누구도 전체 경로를 모르고 “다음 한 칸”만 안다.</b> 그래서 “인터넷이 안 된다”는 대부분 “어느 구간에서 next hop 결정이 실패했는가”의 문제다.' },
      ] } },
  ] },

{ id: 'w2.ipv4', title: 'IPv4 주소와 2진수', slides: 'S5–S7',
  blocks: [
    T(['', 'IPv4', 'IPv6'], [['길이', '32-bit (8-bit × 4, 0~255)', '128-bit'], ['예', '192.168.10.37', '2001:db8::1'], ['주소 수', '2³² ≈ 43억', '사실상 무한'], ['비고', '전 세계 기기 수보다 적다 → NAT 등장', '주소 부족 해결, 장비 교체 필요 → 보급 느림(필기)']]),
    `<p>IP 주소는 “컴퓨터 한 대”가 아니라 <b>네트워크 인터페이스</b>에 할당된다. 노트북 한 대에도 Wi-Fi · 이더넷 · Loopback(127.0.0.1) · Docker/WSL 가상 인터페이스가 각각 IP를 가진다 — ipconfig에서 가상 어댑터의 172.x를 내 IP로 착각하지 말 것.</p>`,
    { lab: { title: '10진수 ↔ 2진수, 그리고 Network / Host Part', init: { ip: '192.168.10.37', p: 24 },
      ctl: [{ k: 'ip', type: 'text', label: 'IPv4 주소', w: 180 }, { k: 'p', label: 'Prefix (/)', min: 0, max: 32 }],
      out: st => { const n = IP.parse(st.ip); if (n === null) return '<span class="err">0~255 숫자 네 개를 점으로 구분해 입력</span>';
        const o = IP.oct(n); const w = [128, 64, 32, 16, 8, 4, 2, 1];
        return `<div class="result">${o.map(x => `${String(x).padStart(3, ' ')} = ${IP.bin8(x)}  <span class="cm">(${w.filter((_, j) => IP.bin8(x)[j] === '1').join('+') || '0'})</span>`).join('<br>')}</div>` +
          bitsHTML([{ label: st.ip + '/' + st.p, n, p: st.p }], { cut: st.p }) +
          `<p style="margin:6px 0 0"><span class="L3">파란 칸 = Network Part (앞 ${st.p} bit)</span> · <span class="L4">주황 칸 = Host Part (뒤 ${32 - st.p} bit)</span><br>Network 주소 = Host Part를 전부 0으로 = <b class="mono">${IP.str(IP.net(n, st.p))}/${st.p}</b> · Host ID = ${(n & ~IP.mask(st.p)) >>> 0}</p>
<p class="cm" style="margin:6px 0 0;font-size:14px">2진수를 알아야 하는 이유: Subnet Mask와 CIDR이 결국 “앞의 몇 bit가 Network인가”를 정의하기 때문. Network Part가 같은 두 호스트는 같은 방 안에 있는 것과 같다 → Router 없이 직접 전달.</p>`; } } },
  ] },

{ id: 'w2.and', title: 'Subnet Mask · CIDR · AND 연산', slides: 'S8–S9',
  blocks: [
    `<p><b>Subnet Mask</b>는 Network Part 자리에 1, Host Part 자리에 0을 둔 32 bit 값이고, <b>CIDR</b> <code>/24</code>는 “앞의 1이 24개”라는 같은 정보다. <code>255.255.255.0 = /24</code>. Prefix가 길수록 Network는 작아지고 Host 공간은 줄어든다(1 bit = 2배 차이).</p>`,
    H.key('IP AND Subnet Mask = Network Address. 두 주소의 AND 결과가 같으면 같은 네트워크(직접 전달), 다르면 다른 네트워크(Default Gateway에게).'),
    { lab: { title: 'AND 연산으로 같은 네트워크인지 판단', init: { a: '192.168.10.37', b: '192.168.11.5', p: 24 },
      ctl: [{ k: 'a', type: 'text', label: 'IP A', w: 160 }, { k: 'b', type: 'text', label: 'IP B', w: 160 }, { k: 'p', label: 'Prefix (/)', min: 0, max: 32 }],
      out: st => { const A = IP.parse(st.a), B = IP.parse(st.b); if (A === null || B === null) return '<span class="err">IP 형식을 확인하세요</span>';
        const M = IP.mask(st.p), na = IP.net(A, st.p), nb = IP.net(B, st.p); const same = na === nb;
        const diff = i => i < st.p && IP.bin(na)[i] !== IP.bin(nb)[i];
        return bitsHTML([{ label: 'A ' + st.a, n: A, p: st.p }, { label: 'Mask /' + st.p, n: M, mask: true, right: IP.str(M) }, { hr: 1 }, { label: 'A AND Mask', n: na, cls: (i, b) => i < st.p ? (diff(i) ? 'x' : 'n') : 'z', right: IP.str(na), rc: 'l3' }], { cut: st.p }) +
          '<div style="height:8px"></div>' +
          bitsHTML([{ label: 'B ' + st.b, n: B, p: st.p }, { label: 'Mask /' + st.p, n: M, mask: true }, { hr: 1 }, { label: 'B AND Mask', n: nb, cls: (i, b) => i < st.p ? (diff(i) ? 'x' : 'n') : 'z', right: IP.str(nb), rc: same ? 'l3' : 'bad' }], { cut: st.p }) +
          `<div class="verdict ${same ? 'ok' : 'bad'}">${same ? '같은 네트워크 → Switch로 직접 전달 (Router 불필요)' : '다른 네트워크 → Default Gateway에게 넘긴다'}</div>` + (same ? '' : '<span class="cm" style="font-size:14px"> 빨간 칸 = Network Part 안에서 서로 다른 비트</span>') +
          `<p style="margin:8px 0 0;font-size:14.5px">해 보기: 강의 예 192.168.10.37 / 192.168.10.200 / 192.168.11.5를 /24로 비교한 뒤 prefix를 /23으로 줄여 보라. 세 번째 옥텟 10(0000101<b>0</b>)과 11(0000101<b>1</b>)은 앞 7 bit가 같아서 /23부터 같은 네트워크가 된다.</p>`; } } },
    H.warn('<b>Mask를 잘못 적으면</b> — 실제 /24인데 /16으로 두면 192.168.10.37과 192.168.11.5가 “같은 네트워크”(192.168.0.0)로 계산된다. Host는 Gateway로 보내지 않고 직접 ARP를 던지는데, 그 장비는 같은 LAN에 없으니 응답이 없고 통신이 실패한다. Host는 패킷마다 이 AND를 한다 — “ping이 안 된다”의 첫 확인 지점.'),
  ] },

{ id: 'w2.range', title: 'Network · Broadcast · 사용 가능 Host', slides: 'S10–S11',
  blocks: [
    T(['주소', '의미', 'Host에 할당?'], [['Network (Host Part 전부 0)', '네트워크 그 자체의 이름. Routing Table에 등장', '불가'], ['Broadcast (Host Part 전부 1)', '같은 네트워크 전체에게. ARP 질의·DHCP Discover가 사용', '불가'], ['그 사이', '보통 첫 번째(.1)가 Default Gateway, 나머지를 PC·서버·IoT가', '가능']]),
    H.key('사용 가능 Host 수 = 2<sup>(32 − prefix)</sup> − 2 &nbsp;&nbsp; /24 → 254 · /26 → 62 · /28 → 14 · /30 → 2'),
    { lab: { title: '주소 범위 계산기', init: { ip: '192.168.10.37', p: 24 },
      ctl: [{ k: 'ip', type: 'text', label: 'IPv4 주소', w: 180 }, { k: 'p', label: 'Prefix (/)', min: 8, max: 30 }],
      out: st => { const n = IP.parse(st.ip); if (n === null) return '<span class="err">IP 형식을 확인하세요</span>';
        const net = IP.net(n, st.p), bc = IP.bc(n, st.p);
        return `<div class="result">Network   = IP AND Mask    = <b>${IP.str(net)}/${st.p}</b><br>Broadcast = Host Part → 1   = <b>${IP.str(bc)}</b><br>Host 범위 = ${IP.str(net + 1)} ~ ${IP.str(bc - 1)}<br>Host 수   = 2^${32 - st.p} − 2 = ${IP.fmt(IP.total(st.p))} − 2 = <b>${IP.fmt(IP.hosts(st.p))}</b></div>` +
          bitsHTML([{ label: 'Network', n: net, p: st.p, right: IP.str(net), rc: 'l3' }, { label: 'Broadcast', n: bc, p: st.p, right: IP.str(bc), rc: 'bad' }], { cut: st.p }) +
          T(['Prefix', 'Mask', '총 주소', 'Host', '전형적 용도'], [[8, '255.0.0.0', '16,777,216', '16,777,214', '대형 사설망 10.0.0.0/8'], [16, '255.255.0.0', '65,536', '65,534', 'VPC 전체 주소 공간'], [24, '255.255.255.0', '256', '254', '일반 LAN · Cloud Subnet'], [26, '255.255.255.192', '64', '62', '소규모 Subnet 분할'], [28, '255.255.255.240', '16', '14', 'Cloud 소형 Subnet'], [30, '255.255.255.252', '4', '2', 'Router 간 링크'], [32, '255.255.255.255', '1', '—', '단일 호스트 (보안 규칙)']].map(r => ['/' + r[0], ...r.slice(1)]), { mono: [0, 1, 2, 3], hl: r => r[0] === '/' + st.p }) +
          `<p style="margin:0;font-size:14.5px">외우지 말 것: /24는 254, prefix가 1 늘면 ½, 2 늘면 ¼. 보안 규칙의 <code>0.0.0.0/0</code> = 모든 주소, <code>10.0.5.12/32</code> = 이 한 대만. Cloud는 예약 주소가 더 많다 — AWS는 Subnet마다 5개 예약이라 /24도 251개.</p>`; } } },
  ] },

{ id: 'w2.split', title: 'Subnet 쪼개기', slides: 'S12',
  blocks: [
    `<p>Prefix를 <b>k bit 늘리면</b> 네트워크는 <b>2<sup>k</sup>개</b>, 각 호스트 공간은 <b>1/2<sup>k</sup></b>이 된다. 192.168.10.0/24 → /26이면 2 bit를 빌려 4개, 각 64주소(Host 62).</p>`,
    { lab: { title: '/24를 나누고, 이 IP는 몇 번째 Subnet인지', init: { base: '192.168.10.0', np: 26, probe: '192.168.10.130' },
      ctl: [{ k: 'base', type: 'text', label: '원래 /24', w: 160 }, { k: 'np', label: '새 Prefix (/)', min: 25, max: 30 }, { k: 'probe', type: 'text', label: '찾을 IP', w: 160 }],
      out: st => { const b = IP.parse(st.base), pr = IP.parse(st.probe); if (b === null || pr === null) return '<span class="err">IP 형식을 확인하세요</span>';
        const n24 = IP.net(b, 24), size = 2 ** (32 - st.np), cnt = 2 ** (st.np - 24), k = st.np - 24;
        const inside = IP.net(pr, 24) === n24; const idx = inside ? Math.floor((pr - n24) / size) : -1;
        const last = pr & 255, bits = IP.bin8(last);
        const rows = Array.from({ length: cnt }, (_, i) => [String(i + 1), `${IP.str(n24 + i * size)}/${st.np}`, `.${i * size}`, `.${i * size + 1} ~ .${i * size + size - 2}`, `.${i * size + size - 1}`]);
        return `<div class="result">빌린 bit = ${st.np} − 24 = ${k} → Subnet ${cnt}개 · 크기 2^${32 - st.np} = ${size} (Host ${size - 2})<br>` +
          (inside ? `${st.probe}의 마지막 옥텟 ${last} = <b>${bits.slice(0, k)}</b>${bits.slice(k)} → 빌린 ${k} bit = ${bits.slice(0, k)}₂ = ${idx} → <b>${idx + 1}번째 Subnet</b> (${IP.str(IP.net(pr, st.np))}/${st.np})` : `<span class="err">${st.probe}는 이 /24 안에 없다</span>`) + '</div>' +
          `<div style="display:flex;gap:3px;margin:0 0 12px">${rows.map((r, i) => `<div style="flex:1;min-width:0;padding:8px 2px;text-align:center;border-radius:5px;font-family:var(--f-mono);font-size:12.5px;font-weight:600;background:${i === idx ? 'var(--ink)' : 'var(--l3s)'};color:${i === idx ? 'var(--paper)' : 'var(--l3)'};overflow:hidden">${cnt <= 16 ? r[2] : ''}</div>`).join('')}</div>` +
          T(['#', 'Subnet', 'Network', '사용 가능 Host', 'Broadcast'], rows.slice(0, 16), { mono: [1, 2, 3, 4], hl: (r, i) => i === idx }) + (cnt > 16 ? '<p class="cm">(앞 16개만 표시)</p>' : '');
      } } },
    `<p><b>Lab 1 다시 보기</b> — 192.168.45.30/24를 /26 네 개로: 30 = <code><b>00</b>011110</code> → 빌린 2 bit = 00 → <b>1번째</b> Subnet 192.168.45.0/26 (.1~.62, BC .63). 다른 방법: 30 ÷ 64의 몫 0 → 1번째.</p>`,
    H.key('왜 나누는가? 주소를 아끼려는 것이 아니라 <b>보안·가용성 경계</b>를 만들기 위해서다. 공개 LB는 Public Subnet, DB는 밖에서 닿지 않는 Private Subnet. 9주차 VPC 설계에 이 계산이 그대로 쓰인다 (2.14).'),
  ] },

{ id: 'w2.decide', title: '같은 Subnet이면 직접, 다르면 Gateway로', slides: 'S13–S16',
  blocks: [
    `<p>Host는 패킷을 보낼 때마다 3단계로 판단한다.</p>`,
    T(['단계', '같은 네트워크 (YES)', '다른 네트워크 (NO)'], [['① 목적지 IP 확인', '', ''], ['② 내 IP · 목적지 IP에 Mask AND', '', ''], ['③ 두 Network 주소가 같은가?', '같다', '다르다'], ['ARP로 찾는 MAC', '<b>목적지</b>의 MAC', '<b>Default Gateway</b>의 MAC'], ['전달', 'Switch로 직접 — Router를 전혀 거치지 않음', 'Dst IP는 그대로, Dst MAC만 Gateway 것 → Gateway가 Routing Table로 다음 hop']]),
    H.key('목적지가 아무리 멀어도 “나”는 Gateway까지만 책임진다.'),
    H.note('예시 주소 — Host A <code>192.168.1.10</code> / MAC <code>3c-22-fb-12-34-56</code> · Host B <code>192.168.1.80</code> / <code>00-1b-44-11-3a-b7</code> · Router 왼쪽 <code>192.168.1.1</code> / <code>00-11-22-33-44-55</code>, 오른쪽 <code>10.0.0.1</code> / <code>00-11-22-33-44-66</code> · Host C <code>10.0.0.20</code> / <code>c8-5b-76-0a-0b-0c</code>. MAC은 설명용 예시.'),
    { trace: { title: '① 같은 Subnet: 192.168.1.10 → 192.168.1.80', sub: '다음 ▶을 누를 때마다 그 단계만 움직인다', rowH: 100, minW: 640,
      nodes: [{ id: 'a', label: 'Host A', sub: '192.168.1.10/24', icon: 'pc', x: .1, y: 0 }, { id: 'sw', label: 'Switch', sub: 'Layer 2', icon: 'switch', x: .45, y: 0 }, { id: 'b', label: 'Host B', sub: '192.168.1.80', icon: 'pc', x: .85, y: 0 }, { id: 'r', label: 'Router (GW)', sub: '192.168.1.1', icon: 'router', x: .45, y: 1 }],
      links: [['a', 'sw'], ['sw', 'b'], ['sw', 'r']],
      tables: [{ id: 'arp', title: 'Host A의 ARP Cache (arp -a)', cols: ['Internet Address', 'Physical Address', 'Type'] }, { id: 'barp', title: 'Host B의 ARP Cache', cols: ['Internet Address', 'Physical Address', 'Type'] }],
      events: [
        { from: 'a', to: 'a', label: 'AND 판단', say: '<span class="mono">192.168.1.10 AND 255.255.255.0 = 192.168.1.0</span><br><span class="mono">192.168.1.80 AND 255.255.255.0 = 192.168.1.0</span> → <b>같은 네트워크</b>. 필요한 것은 라우팅이 아니라 <b>상대(B)의 MAC</b>이다. ARP Cache가 비어 있으니 물어봐야 한다.' },
        { from: 'a', to: 'sw', label: 'ARP who-has .80', pkt: [eth('3c-22-fb-12-34-56', 'ff-ff-ff-ff-ff-ff'), arp('request', [['Who has', '192.168.1.80'], ['Tell', '192.168.1.10']])], say: '“Who has 192.168.1.80? Tell 192.168.1.10” — 목적지 MAC이 <b>ff-ff-ff-ff-ff-ff(Broadcast)</b>: 같은 네트워크 전체에게 묻는다. 출발지 MAC은 A 자신의 것.' },
        { from: 'sw', to: 'b', label: 'Broadcast 복사', on: ['r'], pkt: [eth('3c-22-fb-12-34-56', 'ff-ff-ff-ff-ff-ff'), arp('request', [['Who has', '192.168.1.80'], ['Tell', '192.168.1.10']])], say: 'Switch는 Broadcast 프레임을 들어온 포트를 뺀 <b>모든 포트로 복사</b>한다. 프레임 내용은 그대로(바뀐 값 없음). Router도 받지만 192.168.1.80이 자기 IP가 아니라 무시한다.' },
        { from: 'b', to: 'b', label: '“그건 나다”', tables: { barp: [['192.168.1.10', '3c-22-fb-12-34-56', 'dynamic']] }, say: 'B는 Who has 192.168.1.80 = 내 IP임을 확인한다. 요청에 들어 있던 <b>A의 IP·MAC을 자기 ARP Cache에 먼저 기록</b>한다(곧 A에게 답장할 것이므로).' },
        { from: 'b', to: 'a', path: ['b', 'sw', 'a'], label: 'ARP reply', cmp: false, pkt: [eth('00-1b-44-11-3a-b7', '3c-22-fb-12-34-56'), arp('reply', [['192.168.1.80 is at', '00-1b-44-11-3a-b7']])], tables: { arp: [['192.168.1.80', '00-1b-44-11-3a-b7', 'dynamic']] }, say: 'B만 <b>Unicast</b>로 답한다(Dst MAC = A). A는 ARP Cache에 기록 — 다음부터는 묻지 않는다.' },
        { from: 'a', to: 'b', path: ['a', 'sw', 'b'], label: '데이터 프레임', cmp: false, pkt: [eth('3c-22-fb-12-34-56', '00-1b-44-11-3a-b7'), ip('192.168.1.10', '192.168.1.80', [['TTL', 64]]), tcp(51500, 8000)], say: '이제 Dst MAC = B, Dst IP = B. <b>Router를 전혀 거치지 않으므로</b> TTL도 그대로 64로 도착한다.' },
      ] } },
    { trace: { title: '② 다른 Subnet: 192.168.1.10 → 10.0.0.20', sub: 'Router 안에서 일어나는 3단계를 따로 본다', rowH: 100, minW: 680,
      nodes: [{ id: 'a', label: 'Host A', sub: '192.168.1.10/24', icon: 'pc', x: .08, y: 0 }, { id: 'sw', label: 'Switch', icon: 'switch', x: .30, y: 0 }, { id: 'r', label: 'Router (GW)', sub: '.1.1 | 10.0.0.1', icon: 'router', x: .53, y: 0 }, { id: 'sw2', label: 'Switch', icon: 'switch', x: .75, y: 0 }, { id: 'c', label: 'Host C', sub: '10.0.0.20/24', icon: 'pc', x: .93, y: 0 }],
      links: [['a', 'sw'], ['sw', 'r'], ['r', 'sw2'], ['sw2', 'c']],
      tables: [{ id: 'arp', title: 'Host A의 ARP Cache', cols: ['Internet Address', 'Physical Address', 'Type'] }, { id: 'rarp', title: 'Router의 ARP Cache (오른쪽 10.0.0.0/24)', cols: ['Internet Address', 'Physical Address', 'Type'] }],
      events: [
        { from: 'a', to: 'a', label: 'AND 판단', say: '<span class="mono">10.0.0.20 AND 255.255.255.0 = 10.0.0.0</span> ≠ <span class="mono">192.168.1.0</span> → <b>다른 네트워크</b> → Default Gateway(192.168.1.1)에게 보낸다. 그러려면 C가 아니라 <b>Gateway의 MAC</b>이 필요하다.' },
        { from: 'a', to: 'r', path: ['a', 'sw', 'r'], label: 'ARP who-has .1.1', pkt: [eth('3c-22-fb-12-34-56', 'ff-ff-ff-ff-ff-ff'), arp('request', [['Who has', '192.168.1.1'], ['Tell', '192.168.1.10']])], say: '목적지 C의 MAC이 아니라 <b>Gateway</b>의 MAC을 묻는다(Who has 192.168.1.1).' },
        { from: 'r', to: 'a', path: ['r', 'sw', 'a'], label: 'ARP reply', pkt: [eth('00-11-22-33-44-55', '3c-22-fb-12-34-56'), arp('reply', [['192.168.1.1 is at', '00-11-22-33-44-55']])], tables: { arp: [['192.168.1.1', '00-11-22-33-44-55', 'dynamic']] }, say: 'Gateway가 왼쪽 인터페이스 MAC으로 답하고, A의 ARP Cache에 기록된다.' },
        { from: 'a', to: 'r', path: ['a', 'sw', 'r'], label: 'Gateway에게', cmp: false, pkt: [eth('3c-22-fb-12-34-56', '00-11-22-33-44-55'), ip('192.168.1.10', '10.0.0.20', [['TTL', 64]]), tcp(51500, 8000)], say: '<b>Dst IP는 C(10.0.0.20) 그대로</b>, Dst MAC만 Gateway(00-11-22-33-44-55). “최종 목적지”와 “다음에 건네줄 장비”가 다르다.' },
        { from: 'r', to: 'r', label: '① L2 제거 · TTL−1', pkt: [ip('192.168.1.10', '10.0.0.20', [['TTL', 63]]), tcp(51500, 8000)], say: 'Router는 Dst MAC이 <b>자기 MAC</b>이라 프레임을 받아들이고 <b>Ethernet 헤더를 벗긴다</b> — L2 헤더는 그 링크에서만 의미가 있다. IP 헤더의 <b>TTL을 1 줄인다</b>(64 → 63).' },
        { from: 'r', to: 'r', label: '② 경로 찾기', say: 'Routing Table에서 <span class="mono">10.0.0.20</span>과 일치하는 행: <span class="mono">10.0.0.0/24 → On-link (오른쪽 인터페이스)</span> = <b>직접 연결된 네트워크</b>. 그러니 next hop은 C 자신이다. 이제 <b>C의 MAC</b>이 필요한데 Router의 ARP Cache가 비어 있다.' },
        { from: 'r', to: 'c', path: ['r', 'sw2', 'c'], label: 'ARP who-has .20', cmp: false, pkt: [eth('00-11-22-33-44-66', 'ff-ff-ff-ff-ff-ff'), arp('request', [['Who has', '10.0.0.20'], ['Tell', '10.0.0.1']])], say: 'Router도 Host와 똑같이 ARP를 쓴다. 이번엔 <b>오른쪽 인터페이스</b>(10.0.0.1, 00-11-22-33-44-66)에서 Broadcast로 묻는다.' },
        { from: 'c', to: 'r', path: ['c', 'sw2', 'r'], label: 'ARP reply', pkt: [eth('c8-5b-76-0a-0b-0c', '00-11-22-33-44-66'), arp('reply', [['10.0.0.20 is at', 'c8-5b-76-0a-0b-0c']])], tables: { rarp: [['10.0.0.20', 'c8-5b-76-0a-0b-0c', 'dynamic']] }, say: 'C가 답하고 Router의 ARP Cache에 기록된다.' },
        { from: 'r', to: 'r', label: '③ 새 L2 헤더', cmp: 3, pkt: [eth('00-11-22-33-44-66', 'c8-5b-76-0a-0b-0c'), ip('192.168.1.10', '10.0.0.20', [['TTL', 63]]), tcp(51500, 8000)], say: 'Router가 <b>새 Ethernet 헤더</b>를 붙인다. #4(A가 보낸 프레임)와 비교해 보자: <b>Src MAC = Router 오른쪽, Dst MAC = C</b>로 둘 다 바뀌었고 TTL은 63. <b>Src IP·Dst IP·포트는 그대로</b>다.' },
        { from: 'r', to: 'c', path: ['r', 'sw2', 'c'], label: 'C에게 전달', pkt: [eth('00-11-22-33-44-66', 'c8-5b-76-0a-0b-0c'), ip('192.168.1.10', '10.0.0.20', [['TTL', 63]]), tcp(51500, 8000)], say: 'C는 Dst MAC = 내 MAC, Dst IP = 내 IP를 확인하고 포트 8000으로 올린다. C가 보기에 출발지는 <b>192.168.1.10</b> — 중간 Router는 IP를 바꾸지 않았다(NAT이 없을 때).' },
      ] } },
    H.warn('<b>Default Gateway가 틀리면?</b> 같은 LAN 장비는 보이지만(직접 전달) 인터넷으로는 못 나간다 — “핑은 되는데 웹이 안 되는” 전형적 증상. ipconfig의 IP · Mask · Gateway · DNS 네 줄만 제대로 읽어도 절반은 진단된다.'),
    `<p>${H.exam('Quick Check Q4')}Default Gateway가 필요한 경우 = 목적지가 <b>내 Subnet 밖</b>일 때(AND 결과가 다를 때).</p>`,
  ] },

{ id: 'w2.route', title: 'Routing Table과 Longest Prefix Match', slides: 'S17, S36',
  blocks: [
    `<p>Routing Table은 <b>Destination → Next Hop / Interface</b>의 목록이다. 목적지와 일치하는 행이 여러 개면 <b>prefix가 가장 긴(가장 구체적인) 행</b>이 이긴다 = Longest Prefix Match. <code>0.0.0.0/0</code>은 모든 주소와 일치하지만 가장 약하다 = “더 구체적인 경로가 없으면 여기로”.</p>`,
    { lab: { title: '목적지 IP → 어느 행이 선택되나', init: { dst: '10.20.5.9' },
      ctl: [{ k: 'dst', type: 'text', label: '목적지 IP', w: 170 }, { type: 'btns', items: ['10.20.5.9', '10.3.3.3', '192.168.0.77', '8.8.8.8'].map(v => ({ label: v, act: st => st.dst = v })) }],
      out: st => { const d = IP.parse(st.dst); if (d === null) return '<span class="err">IP 형식을 확인하세요</span>'; const r = lpm(d, RT);
        return T(['Destination', 'Next Hop', '의미', '앞 prefix bit 비교', '결과'], RT.map(x => { const m = IP.net(d, x.p) === IP.parse(x.d); return [`${x.d}/${x.p}`, x.gw, x.why, x.p ? dot(IP.bin(d)).slice(0, x.p + Math.floor((x.p - 1) / 8)) + '…' : '(0 bit — 항상 일치)', m ? (r.best === x ? '<b>✓ 선택</b>' : '✓ 일치') : '✗']; }), { mono: [0, 1, 3], hl: row => row[0] === `${r.best.d}/${r.best.p}` }) +
          `<div class="verdict ok">${st.dst} → ${r.m.length}개 행 일치 → 가장 긴 /${r.best.p} → Next hop ${r.best.gw}</div>`; } } },
    { h3: 'route print 출력 읽기' },
    H.pre(`> route print  (IPv4 Route Table)
Network Destination   Netmask          Gateway
0.0.0.0               0.0.0.0          192.168.0.1     ← Default Route (0.0.0.0/0)
192.168.0.0           255.255.255.0    On-link         ← 내 LAN, 직접 전달
127.0.0.0             255.0.0.0        On-link         ← Loopback`),
    `<p>0.0.0.0/0 줄이 없으면 그 PC는 인터넷으로 나가는 길을 아예 모른다. Lab 1 결과: <code>0.0.0.0 0.0.0.0 → 192.168.45.1</code>.</p>`,
  ] },

{ id: 'w2.hop', title: 'Hop마다 MAC은 바뀌고 IP는 유지된다', slides: 'S18',
  blocks: [
    H.key('L2 주소(MAC) = “이 링크에서 다음 장비” → hop마다 새로 쓴다. L3 주소(IP) = “최종 목적지” → 끝까지 유지 (NAT이 없을 때).'),
    T(['장비 · 인터페이스', 'IP', 'MAC (설명용 예시)'], [['PC A', '192.168.0.23/24', '3c:22:fb:12:34:56'], ['Router 1 · eth0 (PC 쪽)', '192.168.0.1', '00:11:22:33:44:01'], ['Router 1 · eth1 (R2 쪽)', '10.0.0.1', '00:11:22:33:44:02'], ['Router 2 · eth0 (R1 쪽)', '10.0.0.2', '00:aa:bb:cc:dd:01'], ['Router 2 · eth1 (서버 쪽)', '34.1.2.1', '00:aa:bb:cc:dd:02'], ['Server', '34.1.2.3/24', '52:54:00:9a:bc:de']], { mono: [1, 2] }),
    `<p>Router는 인터페이스마다 IP와 MAC을 따로 가진다. 그래서 “Router의 MAC”이라고 하면 <b>어느 쪽 인터페이스인지</b>가 중요하다.</p>`,
    { trace: { title: 'PC A → R1 → R2 → Server', sub: '노란색 = 이 단계에서 바뀐 값 · ⚙ = 장비 안에서 일어난 일', rowH: 96, minW: 660,
      nodes: [{ id: 'pc', label: 'PC A', sub: '192.168.0.23', icon: 'pc', x: .08, y: 0 }, { id: 'r1', label: 'Router 1', sub: '.0.1 | 10.0.0.1', icon: 'router', x: .36, y: 0 }, { id: 'r2', label: 'Router 2', sub: '10.0.0.2 | 34.1.2.1', icon: 'router', x: .64, y: 0 }, { id: 'sv', label: 'Server', sub: '34.1.2.3', icon: 'server', x: .92, y: 0 }],
      links: [['pc', 'r1'], ['r1', 'r2'], ['r2', 'sv']],
      tables: [{ id: 'log', title: '링크 위를 지나간 프레임 기록', cols: ['구간', 'Src MAC', 'Dst MAC', 'Src IP', 'Dst IP', 'TTL'] }, { id: 'rt', title: 'Router 1의 Routing Table', cols: ['Destination', 'Next Hop', 'Interface', ''], rows: [['192.168.0.0/24', 'On-link', 'eth0', ''], ['10.0.0.0/30', 'On-link', 'eth1', ''], ['34.1.2.0/24', '10.0.0.2', 'eth1', ''], ['0.0.0.0/0', '10.0.0.2', 'eth1', '']] }],
      events: [
        { from: 'pc', to: 'pc', label: 'IP 패킷 만들기', pkt: [ip('192.168.0.23', '34.1.2.3', [['TTL', 64]]), tcp(51500, 443)], say: 'PC A가 TCP 세그먼트에 <b>IP 헤더</b>를 붙인다. Src IP = 나(192.168.0.23), Dst IP = <b>최종 목적지</b> 34.1.2.3, TTL = 64(OS 기본값). 이 두 IP는 이후 끝까지 바뀌지 않는다.' },
        { from: 'pc', to: 'pc', label: 'Ethernet 헤더 붙이기', pkt: [eth('3c:22:fb:12:34:56', '00:11:22:33:44:01'), ip('192.168.0.23', '34.1.2.3', [['TTL', 64]]), tcp(51500, 443)], say: '34.1.2.3은 내 subnet 밖 → Default Gateway(192.168.0.1)로. ARP Cache에서 <b>192.168.0.1 → 00:11:22:33:44:01</b>을 찾아 Dst MAC에 쓴다. Src MAC = 내 NIC.' },
        { from: 'pc', to: 'r1', label: 'Hop 1', pkt: [eth('3c:22:fb:12:34:56', '00:11:22:33:44:01'), ip('192.168.0.23', '34.1.2.3', [['TTL', 64]]), tcp(51500, 443)], tables: { log: [['PC → R1', '3c:22:fb:12:34:56', '00:11:22:33:44:01', '192.168.0.23', '34.1.2.3', '64']] }, say: '첫 번째 링크. 이 프레임의 Dst MAC은 R1 eth0, Dst IP는 서버다.' },
        { from: 'r1', to: 'r1', label: '① 수신 · L2 제거', pkt: [ip('192.168.0.23', '34.1.2.3', [['TTL', 64]]), tcp(51500, 443)], say: 'R1 eth0은 Dst MAC <span class="mono">00:11:22:33:44:01</span> = <b>내 MAC</b>이라 프레임을 받아들이고 <b>Ethernet 헤더를 벗긴다</b>. 이제 남은 것은 IP 패킷.' },
        { from: 'r1', to: 'r1', label: '② TTL−1 · 경로 찾기', pkt: [ip('192.168.0.23', '34.1.2.3', [['TTL', 63]]), tcp(51500, 443)], tables: { rt: [['192.168.0.0/24', 'On-link', 'eth0', ''], ['10.0.0.0/30', 'On-link', 'eth1', ''], ['34.1.2.0/24', '10.0.0.2', 'eth1', '✓ 선택 (/24)'], ['0.0.0.0/0', '10.0.0.2', 'eth1', '일치하지만 /0']] }, say: '<b>TTL 64 → 63</b>. Dst IP 34.1.2.3으로 Routing Table을 찾는다: <span class="mono">34.1.2.0/24</span>와 <span class="mono">0.0.0.0/0</span> 두 행이 일치 → <b>더 긴 /24</b>(Longest Prefix Match) → next hop <b>10.0.0.2</b>, 나가는 인터페이스 eth1.' },
        { from: 'r1', to: 'r1', label: '③ 새 L2 헤더', cmp: 2, pkt: [eth('00:11:22:33:44:02', '00:aa:bb:cc:dd:01'), ip('192.168.0.23', '34.1.2.3', [['TTL', 63]]), tcp(51500, 443)], say: 'next hop 10.0.0.2의 MAC을 ARP Cache에서 찾아(<b>00:aa:bb:cc:dd:01</b>) 새 Ethernet 헤더를 붙인다. Src MAC = 나가는 인터페이스 eth1(<b>00:11:22:33:44:02</b>). Hop 1 프레임과 비교하면 <b>MAC 두 개와 TTL만</b> 바뀌었다.' },
        { from: 'r1', to: 'r2', label: 'Hop 2', pkt: [eth('00:11:22:33:44:02', '00:aa:bb:cc:dd:01'), ip('192.168.0.23', '34.1.2.3', [['TTL', 63]]), tcp(51500, 443)], tables: { log: [['PC → R1', '3c:22:fb:12:34:56', '00:11:22:33:44:01', '192.168.0.23', '34.1.2.3', '64'], ['R1 → R2', '00:11:22:33:44:02', '00:aa:bb:cc:dd:01', '192.168.0.23', '34.1.2.3', '63']] }, say: '두 번째 링크. 아래 기록표에서 두 행을 비교해 보자 — <b>MAC 열만 다르고 IP 열은 같다</b>.' },
        { from: 'r2', to: 'r2', label: '①②③ 같은 처리', cmp: 6, pkt: [eth('00:aa:bb:cc:dd:02', '52:54:00:9a:bc:de'), ip('192.168.0.23', '34.1.2.3', [['TTL', 62]]), tcp(51500, 443)], say: 'R2도 똑같다: 내 MAC 확인 → L2 제거 → TTL 63 → 62 → Routing Table에서 <span class="mono">34.1.2.0/24 = On-link</span>(서버가 직접 연결됨) → 이번에는 next hop이 <b>서버 자신</b>이라 서버의 MAC(52:54:00:9a:bc:de)을 Dst MAC에 쓴다.' },
        { from: 'r2', to: 'sv', label: 'Hop 3', pkt: [eth('00:aa:bb:cc:dd:02', '52:54:00:9a:bc:de'), ip('192.168.0.23', '34.1.2.3', [['TTL', 62]]), tcp(51500, 443)], tables: { log: [['PC → R1', '3c:22:fb:12:34:56', '00:11:22:33:44:01', '192.168.0.23', '34.1.2.3', '64'], ['R1 → R2', '00:11:22:33:44:02', '00:aa:bb:cc:dd:01', '192.168.0.23', '34.1.2.3', '63'], ['R2 → Server', '00:aa:bb:cc:dd:02', '52:54:00:9a:bc:de', '192.168.0.23', '34.1.2.3', '62']] }, say: '마지막 링크. 기록표 세 행: <b>MAC은 매번 새로, IP는 처음 그대로, TTL은 hop마다 −1</b>.' },
        { from: 'sv', to: 'sv', label: '위 계층으로 올림', cmp: 8, pkt: [tcp(51500, 443)], say: '서버는 Dst MAC = 내 MAC → L2 제거, Dst IP = 내 IP → L3 제거, Dst Port 443 → 웹 서버 프로세스에 전달. 서버가 본 출발지는 <b>192.168.0.23</b>. tracert가 보여 주는 것은 IP가 바뀐 기록이 아니라 <b>IP가 지나온 Router 목록</b>이다. ' + H.exam('Quick Check Q5') + '바뀌는 것은 MAC (NAT이 끼면 Src IP도 바뀐다 → 2.10)' },
      ] } },
  ] },

{ id: 'w2.addr', title: 'Public · Private · localhost · 0.0.0.0', slides: 'S19–S21',
  blocks: [
    T(['Private IPv4 대역', '범위'], [['10.0.0.0/8', '10.0.0.0 ~ 10.255.255.255'], ['172.16.0.0/12', '172.16.0.0 ~ <b>172.31</b>.255.255'], ['192.168.0.0/16', '192.168.0.0 ~ 192.168.255.255']], { mono: [0, 1] }),
    `<p><b>Private IP</b>는 LAN·Campus·VPC 안에서 자유롭게 쓰지만 <b>인터넷에서 라우팅되지 않는다</b> — 그래서 서로 다른 집이 같은 192.168.0.10을 써도 된다. <b>Public IP</b>는 전역적으로 유일하고 ISP·Cloud가 할당하며, 외부에 서비스를 열려면 필요하다. ipconfig는 192.168.x인데 “내 IP 확인” 사이트가 다른 주소를 보여 주는 이유가 NAT다(2.10).</p>`,
    { lab: { title: 'Private / Public 판별', init: { ip: '172.32.0.5' },
      ctl: [{ k: 'ip', type: 'text', label: 'IP', w: 170 }, { type: 'btns', items: ['172.20.1.5', '172.32.0.5', '10.1.2.3', '8.8.8.8', '127.0.0.1'].map(v => ({ label: v, act: st => st.ip = v })) }],
      out: st => { const n = IP.parse(st.ip); if (n === null) return '<span class="err">IP 형식</span>'; const k = IP.kind(n);
        return `<div class="verdict ${k[0] === 'Public' ? 'bad' : 'ok'}">${st.ip} → ${k[0]} (${k[1]})</div>` + bitsHTML([{ label: '172.16.0.0/12', n: IP.parse('172.16.0.0'), p: 12 }, { label: st.ip, n, cls: (i, b) => i < 12 ? (b === IP.bin(IP.parse('172.16.0.0'))[i] ? 'n' : 'x') : 'z' }], { cut: 12 }) + `<p style="margin:6px 0 0;font-size:14.5px">/12는 앞 12 bit 고정: 172 = 10101100, 두 번째 옥텟의 앞 4 bit <b>0001</b>까지. 그래서 16~31만 Private이고 <b>172.32는 Public</b>이다.</p>`; } } },
    { h3: '헷갈리는 주소 4종 세트' },
    T(['표기', '정체', '뜻'], [['localhost', '이름(hostname)', '보통 127.0.0.1 또는 ::1'], ['127.0.0.1', 'Loopback IP', '내 컴퓨터 자신'], ['0.0.0.0', 'Bind 의미', '<b>모든</b> IPv4 interface에서 수신'], ['192.168.x.x', 'Private IP', 'LAN 안의 실제 interface 주소']], { mono: [0] }),
    { h3: '어디에 bind 하느냐가 “누가 접속할 수 있는가”를 정한다' },
    { lab: { title: 'uvicorn main:app --host ??? --port 8000', init: { bind: '127.0.0.1', fw: true },
      ctl: [{ k: 'bind', type: 'select', label: 'Bind 주소', opts: [['127.0.0.1', '127.0.0.1'], ['192.168.0.23', '192.168.0.23'], ['0.0.0.0', '0.0.0.0']] }, { k: 'fw', type: 'toggle', label: 'Windows 방화벽이 8000 허용' }],
      out: st => { const b = st.bind, fw = st.fw;
        const me = b !== '192.168.0.23' ? ['O', 'ok', '접속됨'] : ['X', 'bad', 'localhost(127.0.0.1)로 들어온 요청은 그 bind에 닿지 않음 → refused'];
        const lan = b === '127.0.0.1' ? ['X', 'bad', 'LAN 쪽 NIC에는 listen 소켓이 없음 → refused (방화벽이 먼저 버리면 timeout)'] : !fw ? ['X', 'bad', '방화벽이 조용히 차단 → timeout'] : ['O', 'ok', '접속됨'];
        const inet = ['X', 'bad', '공유기 NAT Table에 항목 없음 → timeout (포트포워딩·터널 필요)'];
        return T(['접속하는 쪽', '결과', '이유'], [['내 PC (localhost)', ...me], ['같은 LAN의 다른 PC', ...lan], ['인터넷', ...inet]].map(r => [r[0], `<span class="${r[2] === 'ok' ? 'cok' : 'cbad'}">${r[1]}</span>`, r[3]])) +
          `<p style="margin:0">AI가 만든 코드의 기본값은 대개 <b>127.0.0.1</b>이다. 팀원이 접속하려면 <code>--host 0.0.0.0</code>. ${H.exam('Quick Check Q7')}0.0.0.0은 “인터넷에 공개”가 아니라 “이 PC의 모든 NIC에서 수신”이다 — 공개 여부는 방화벽과 NAT이 따로 정한다. 확인: <code>netstat -ano</code>.</p>`; } } },
  ] },

{ id: 'w2.nat', title: 'NAT과 PAT', slides: 'S22–S24',
  blocks: [
    `<p>Private IP를 출발지로 그대로 내보내면, 요청은 가지만 <b>응답의 목적지가 Private IP</b>라서 인터넷 라우터가 어디로 보낼지 몰라 버린다(필기). 그래서 공유기(NAT Router)는 안쪽 Private IP와 바깥쪽 Public IP를 모두 가지고, <b>나갈 때 출발지를 바꾸고, 돌아올 때 되돌린다</b>. 실제로는 Port까지 바꾸는 <b>PAT(NAPT)</b>가 흔히 “NAT”이라 불린다.</p>`,
    { trace: { title: '세 기기가 하나의 Public IP를 나눠 쓴다', sub: '⚙ 단계에서 공유기가 주소를 고쳐 쓰는 순간을 보자', rowH: 92, minW: 700,
      nodes: [{ id: 'h0', label: 'Laptop', sub: '192.168.0.10', icon: 'laptop', x: .09, y: 0 }, { id: 'h1', label: 'Phone', sub: '192.168.0.11', icon: 'phone', x: .09, y: 1 }, { id: 'h2', label: 'IoT', sub: '192.168.0.12', icon: 'iot', x: .09, y: 2 }, { id: 'nat', label: 'NAT Router', sub: '203.0.113.5', icon: 'router', x: .43, y: 1 }, { id: 's34', label: 'Server', sub: '34.1.2.3', icon: 'server', x: .88, y: .4 }, { id: 'u', label: '인터넷 사용자', icon: 'globe', x: .88, y: 1.75 }],
      links: [['h0', 'nat'], ['h1', 'nat'], ['h2', 'nat'], ['nat', 's34'], ['nat', 'u']],
      tables: [{ id: 'nat', title: 'NAT Table (공유기)', cols: ['Private (내부)', 'Public (변환)', 'Remote'] }],
      events: [
        { from: 'h0', to: 'nat', label: '나가는 요청', pkt: [ip('192.168.0.10', '34.1.2.3'), tcp(51500, 443)], say: 'Laptop이 <b>Private 주소 192.168.0.10:51500</b>을 출발지로 보낸다. 이대로 인터넷에 나가면 서버의 응답이 192.168.0.10으로 향하는데, 그 주소는 인터넷에서 라우팅되지 않는다.' },
        { from: 'nat', to: 'nat', label: 'Src 변환 + 기록', pkt: [ip('203.0.113.5', '34.1.2.3'), tcp(40001, 443)], tables: { nat: [['192.168.0.10:51500', '203.0.113.5:40001', '34.1.2.3:443']] }, say: 'NAT Router가 <b>Src IP 192.168.0.10 → 203.0.113.5</b>(자기 Public IP), <b>Src Port 51500 → 40001</b>로 바꾸고, 이 짝을 <b>NAT Table에 기록</b>한다. 기록은 <b>나갈 때</b> 만들어진다. Dst(서버)는 건드리지 않는다.' },
        { from: 'nat', to: 's34', label: '인터넷으로', pkt: [ip('203.0.113.5', '34.1.2.3'), tcp(40001, 443)], say: '서버 쪽으로 나간다. 이제 인터넷의 누구도 192.168.0.10을 보지 못한다.' },
        { from: 'h1', to: 'nat', label: '같은 포트 51500', cmp: false, pkt: [ip('192.168.0.11', '34.1.2.3'), tcp(51500, 443)], say: 'Phone도 우연히 같은 Src Port <b>51500</b>을 쓴다. 각 기기의 OS가 따로 포트를 고르니 충분히 생기는 일이다.' },
        { from: 'nat', to: 'nat', label: '다른 포트로 변환', pkt: [ip('203.0.113.5', '34.1.2.3'), tcp(40002, 443)], tables: { nat: [['192.168.0.10:51500', '203.0.113.5:40001', '34.1.2.3:443'], ['192.168.0.11:51500', '203.0.113.5:40002', '34.1.2.3:443']] }, say: 'Src IP는 똑같이 203.0.113.5지만 <b>변환 포트를 40002</b>로 다르게 준다. 그래서 바깥에서 보면 두 연결이 <b>포트 번호로 구분</b>된다 — 이것이 PAT(Port까지 바꾸는 NAT).' },
        { from: 'nat', to: 's34', label: '인터넷으로', pkt: [ip('203.0.113.5', '34.1.2.3'), tcp(40002, 443)], say: '서버는 같은 IP 203.0.113.5에서 포트만 다른 두 연결(40001, 40002)을 본다.' },
        { from: 'h2', to: 's34', path: ['h2', 'nat', 's34'], label: 'IoT도 (변환 후)', cmp: false, pkt: [ip('203.0.113.5', '34.1.2.3'), tcp(40003, 443)], tables: { nat: [['192.168.0.10:51500', '203.0.113.5:40001', '34.1.2.3:443'], ['192.168.0.11:51500', '203.0.113.5:40002', '34.1.2.3:443'], ['192.168.0.12:60010', '203.0.113.5:40003', '34.1.2.3:443']] }, say: 'IoT(192.168.0.12:60010)도 같은 과정을 거쳐 203.0.113.5:<b>40003</b>으로 나간다(패킷 상세 = 공유기를 지난 뒤). 세 기기 → Public IP 하나. 필기: 일반 라우터에 NAT Table 관리만 더해지는 것이라 오버헤드가 크지 않다.' },
        { from: 's34', to: 'nat', label: '응답 → :40002', cmp: 5, pkt: [ip('34.1.2.3', '203.0.113.5'), tcp(443, 40002)], say: '서버는 받은 패킷의 출발지로 답한다 → Dst <b>203.0.113.5:40002</b>. #6과 비교하면 Src와 Dst가 <b>뒤바뀌었을 뿐</b>이다. 서버는 Phone의 존재를 모른다.' },
        { from: 'nat', to: 'nat', label: 'Table 조회 → Dst 복원', pkt: [ip('34.1.2.3', '192.168.0.11'), tcp(443, 51500)], say: 'NAT Table에서 <span class="mono">203.0.113.5:40002</span> 행을 찾는다 → <b>192.168.0.11:51500</b>. <b>Dst IP와 Dst Port를 원래대로</b> 고쳐 쓴다. 나갈 때는 Src를, 돌아올 때는 Dst를 바꾼다. ' + H.exam('Quick Check Q6') },
        { from: 'nat', to: 'h1', label: 'Phone에게', pkt: [ip('34.1.2.3', '192.168.0.11'), tcp(443, 51500)], say: 'Phone은 자기가 보낸 연결(192.168.0.11:51500 ↔ 34.1.2.3:443)의 응답을 받는다. Phone 입장에서는 NAT이 있었는지조차 모른다.' },
        { from: 'u', to: 'nat', label: '밖에서 먼저 :8000?', drop: true, cmp: false, pkt: [ip('198.51.100.7', '203.0.113.5'), tcp(55000, 8000)], say: '외부에서 먼저 들어오려 하면? NAT Table에 <b>203.0.113.5:8000</b> 행이 없다 — <b>나간 적 없는 연결은 되돌릴 주소가 없다</b>. 여기에 방화벽(들어오는 연결 기본 차단), 바뀌는 Public IP까지 겹친다. “내 코드가 잘못됐나?”보다 “구조상 막혀 있는가?”를 먼저 묻자.' },
      ] } },
  ] },

{ id: 'w2.expose', title: '외부에서 접속하게 만드는 3가지 방법', slides: 'S25',
  blocks: [
    T(['방법', '원리', '필요 / 장점', '약점'], [['① Port Forwarding', 'Router에 구멍을 낸다<br><code>203.0.113.5:8080 → 192.168.0.23:8000</code>', '공인 IP + 공유기 관리 권한', 'IP 변동, 보안 노출, 학교망 불가'], ['② Reverse Tunnel', '내부에서 밖으로 연결을 <b>먼저</b> 연다 (ngrok · Cloudflare Tunnel · SSH -R)', 'NAT·방화벽을 그대로 통과', '외부 서비스 의존, 주소가 임시'], ['③ Cloud에 배포', '처음부터 Public IP가 있는 곳에 (EC2 · Cloud Run)', '안정적인 주소·인증서·확장', '비용, Security Group 설정']]),
    `<p>세 방법 모두 <b>주소 + 경로 + 허용</b>이라는 같은 조건을 서로 다르게 만족시킨다. 수업 Lab에서 ①을 쓰지 않는 이유(설명할 수 있어야 함): 학교망에서는 공유기 권한도 공인 IP도 없고, IP가 바뀌며, 내 PC를 직접 노출한다. ②가 되는 이유: 터널은 안에서 밖으로 먼저 나간 연결이라 NAT Table이 만들어진다 — <b>나가야 돌아온다</b>.</p>`,
  ] },

{ id: 'w2.dhcp', title: 'DHCP와 ARP', slides: 'S26–S27',
  blocks: [
    { trace: { mode: 'ladder', title: 'DHCP — IP 설정을 받아오는 4단계 (DORA)', lanes: [{ id: 'c', label: 'Client', sub: '아직 IP 없음' }, { id: 's', label: 'DHCP Server', sub: '공유기' }],
      events: [
        { from: 'c', to: 's', label: '① DISCOVER', sub: 'Broadcast 255.255.255.255', color: 'l7', pkt: [ip('0.0.0.0', '255.255.255.255'), udp(68, 67), { L: 'L7', n: 'DHCP', f: [['type', 'DISCOVER']] }], say: '“거기 DHCP 서버 있나요?” 아직 IP가 없으니 출발지 0.0.0.0, 목적지는 <b>Broadcast</b>.' },
        { from: 's', to: 'c', label: '② OFFER', sub: '192.168.0.23 어때요?', color: 'l3', pkt: [ip('192.168.0.1', '255.255.255.255'), udp(67, 68), { L: 'L7', n: 'DHCP', f: [['type', 'OFFER'], ['yiaddr', '192.168.0.23']] }], say: '사용 가능한 주소를 제안한다.' },
        { from: 'c', to: 's', label: '③ REQUEST', sub: '그 IP를 쓰겠습니다', color: 'l7', pkt: [ip('0.0.0.0', '255.255.255.255'), udp(68, 67), { L: 'L7', n: 'DHCP', f: [['type', 'REQUEST'], ['requested', '192.168.0.23']] }], say: '공식 요청.' },
        { from: 's', to: 'c', label: '④ ACK', sub: 'IP·Mask·GW·DNS·Lease', color: 'ok', state: { c: '192.168.0.23/24' }, pkt: [ip('192.168.0.1', '255.255.255.255'), udp(67, 68), { L: 'L7', n: 'DHCP', f: [['type', 'ACK'], ['IP', '192.168.0.23/24'], ['Gateway', '192.168.0.1'], ['DNS', '8.8.8.8'], ['Lease', '24h']] }], say: 'IP · Mask · Gateway · DNS · <b>Lease Time</b> 확정. Lease가 끝나기 전에 갱신하므로 <b>내 IP는 언제든 바뀔 수 있다</b> → 서버 PC는 고정 IP나 DHCP 예약. 확인: <code>ipconfig /release</code> → <code>/renew</code>. 필기: 공유기 하나가 NAT과 DHCP를 함께 제공한다.' },
      ] } },
    `<p><b>ARP</b>(IPv4 → MAC)의 동작은 2.6 트레이스에서 봤다. Broadcast로 묻고(“Who has 192.168.1.20? Tell 192.168.1.10”) Unicast로 답한다(“192.168.1.20 is at 00-1b-44-11-3a-b7”). 결과는 <b>ARP Cache</b>(<code>arp -a</code>)에 임시 저장된다. Lab 1에서 Gateway 192.168.45.1의 MAC 38-f4-5e-23-fd-85를 여기서 찾았다. ARP 표에는 같은 LAN 장비만 나온다.</p>`,
    H.key('IP는 “누구”를, MAC은 “지금 이 링크에서 어디로”를 가리킨다.'),
  ] },

{ id: 'w2.port', title: 'Port · Socket · Firewall', slides: 'S28–S30',
  blocks: [
    `<p><b>IP = 어느 Host인가, Port = 그 Host의 어느 서비스(프로세스)인가.</b> 같은 서버에 웹·DB·SSH가 함께 떠 있을 수 있는 이유가 Port다. ${H.exam('Quick Check Q3')}<code>127.0.0.1:8000</code> — 127.0.0.1은 Host(나 자신), 8000은 그 안의 서비스.</p>`,
    T(['Port', '서비스', '범위', '이름', '용도'], [['22', 'SSH', '0 – 1023', 'Well-known', '표준 서비스'], ['53 / 80 / 443', 'DNS / HTTP / HTTPS', '1024 – 49151', 'Registered', '등록된 앱 (3306, 8080 …)'], ['3306 / 5432 / 6379', 'MySQL / PostgreSQL / Redis', '49152 – 65535', 'Dynamic / Ephemeral', 'Client Src Port — OS가 자동 선택']], { mono: [0, 2] }),
    `<p><b>Socket = 네 값의 조합</b> (Src IP · Src Port · Dst IP · Dst Port). 하나라도 다르면 다른 연결이다. 같은 서버에 브라우저 탭 두 개를 열면 <code>192.168.0.23:<b>51500</b> → 34.1.2.3:443</code>, <code>192.168.0.23:<b>51501</b> → 34.1.2.3:443</code> — Src Port만 달라도 섞이지 않는다 (3주차에서 자세히).</p>`,
    { h3: '“주소가 맞다”와 “접속이 허용된다”는 다른 문제' },
    { lab: { title: '요청이 통과해야 하는 세 관문', init: { sg: true, hf: true, bind: true },
      ctl: [{ k: 'sg', type: 'toggle', label: 'Cloud: Security Group이 443 허용' }, { k: 'hf', type: 'toggle', label: 'Host: 방화벽 허용' }, { k: 'bind', type: 'toggle', label: 'App: 0.0.0.0에 bind' }],
      out: st => { const g = [['Security Group', 'Cloud 계층 — 인스턴스에 닿기 전', st.sg], ['Host Firewall', 'OS 안 — Windows Firewall · ufw · iptables', st.hf], ['App bind', '프로세스 — 127.0.0.1이면 외부 요청 못 받음', st.bind]];
        let stop = g.findIndex(x => !x[2]);
        const res = stop === 0 ? ['bad', 'Security Group이 조용히 버림 → <b>Connection timed out</b>'] : stop === 1 ? ['bad', 'Host 방화벽이 버림 → 보통 <b>timed out</b>'] : stop === 2 ? ['bad', '도착했지만 그 주소에 listen 없음 → RST → <b>Connection refused</b>'] : ['ok', '모든 계층 통과 → 200 OK'];
        return `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:stretch;margin-bottom:10px"><div class="card" style="flex:0 0 auto"><h4>Client</h4><p>SYN → :443</p></div>${g.map((x, i) => `<div class="card" style="flex:1;min-width:160px;border-color:${stop === -1 || i < stop ? 'var(--ok)' : i === stop ? 'var(--bad)' : 'var(--line)'};opacity:${stop !== -1 && i > stop ? .4 : 1}"><h4>${i < stop || stop === -1 ? '✓' : i === stop ? '✗' : '·'} ${x[0]}</h4><p>${x[1]}</p></div>`).join('')}</div><div class="verdict ${res[0]}">${res[1]}</div>` +
          `<p style="margin:0">두 계층(Cloud·Host)과 bind를 모두 통과해야 한다. 한쪽만 열어 두고 “안 된다”고 하는 경우가 가장 많다. 규칙은 “무엇을 막는가”가 아니라 <b>“무엇만 허용하는가”</b>로 쓴다(예: <code>ALLOW TCP 443 FROM 0.0.0.0/0</code>, <code>DENY TCP 22 FROM Internet</code>).</p>`; } } },
  ] },

{ id: 'w2.vpc', title: 'Cloud에서도 같은 원리: VPC', slides: 'S31–S32',
  blocks: [
    `<p>VPC = 내가 직접 설계하는 가상 네트워크. AWS·Azure·GCP 용어는 달라도 핵심은 같다: <b>IP Prefix · Subnet · Route · Gateway · NAT · Firewall</b>.</p>`,
    { trace: { title: 'VPC 10.0.0.0/16 안의 트래픽', rowH: 100, minW: 700,
      zones: [{ x0: .02, x1: .98, y0: .55, y1: 1.45, label: 'Public Subnet 10.0.1.0/24 · route 0.0.0.0/0 → IGW', c: 'l2' }, { x0: .02, x1: .44, y0: 1.55, y1: 2.5, label: 'Private 10.0.11.0/24 · 0/0 → NAT GW', c: 'l3' }, { x0: .58, x1: .98, y0: 1.55, y1: 2.5, label: 'Private 10.0.12.0/24 · 0/0 → NAT GW', c: 'l7' }],
      nodes: [{ id: 'inet', label: 'Internet', icon: 'cloud', x: .3, y: 0 }, { id: 'igw', label: 'Internet Gateway', x: .62, y: 0 }, { id: 'lb', label: 'Load Balancer', icon: 'lb', x: .2, y: 1 }, { id: 'ngw', label: 'NAT Gateway', icon: 'router', x: .78, y: 1 }, { id: 'api', label: 'API Server', icon: 'server', x: .08, y: 2.05 }, { id: 'gpu', label: 'GPU Worker', icon: 'gpu', x: .36, y: 2.05 }, { id: 'db', label: 'Database', icon: 'db', x: .66, y: 2.05 }, { id: 'ca', label: 'Cache', icon: 'db', x: .94, y: 2.05 }],
      links: [['inet', 'igw'], ['igw', 'lb'], ['igw', 'ngw'], ['lb', 'api'], ['api', 'db'], ['gpu', 'ngw', { dash: 1 }]], padB: 40,
      events: [
        { from: 'inet', to: 'api', path: ['inet', 'igw', 'lb', 'api'], label: 'HTTPS 요청', color: 'ok', say: '사용자 요청은 Internet Gateway → <b>Public Subnet의 LB</b> → Private Subnet의 API Server로.' },
        { from: 'api', to: 'db', label: 'SQL', color: 'l4', say: 'API는 VPC 내부 주소로 DB에 접근한다.' },
        { from: 'gpu', to: 'inet', path: ['gpu', 'ngw', 'igw', 'inet'], label: 'pip install', color: 'l3', say: 'Private Subnet은 <b>나갈 때만</b> NAT Gateway를 쓴다(패키지 설치·외부 API). 집 공유기 NAT과 같은 원리.' },
        { from: 'inet', to: 'db', path: ['inet', 'igw', 'db'], label: '직접 DB?', drop: true, color: 'bad', say: '밖에서 DB로 바로 가는 길은 없다 — Private Subnet의 route가 IGW를 가리키지 않고, NAT은 밖에서 먼저 들어올 수 없다. <b>Subnet 설계 = 보안·가용성 경계 설계.</b>' },
      ] } },
    T(['이름', 'CIDR', '주소 수', 'AZ', '용도'], [['VPC', '10.0.0.0/16', '65,536', '—', '전체 주소 공간'], ['Public A', '10.0.1.0/24', '256', 'AZ-a', 'ALB · Bastion · NAT GW'], ['Public B', '10.0.2.0/24', '256', 'AZ-c', '가용영역 이중화'], ['Private A', '10.0.11.0/24', '256', 'AZ-a', 'API · GPU Worker'], ['Private B', '10.0.12.0/24', '256', 'AZ-c', 'Database · Cache']], { mono: [1, 2] }),
    `<ol><li><b>겹치지 않게</b> — 사내망·다른 VPC와 CIDR이 겹치면 VPN 연결이 불가능해진다.</li><li><b>여유 있게</b> — 나중을 위해 번호 공간을 비워 둔다(.3~.10).</li><li><b>읽히게</b> — Public 1~9, Private 11~19처럼 규칙을 정한다.</li></ol>`,
  ] },

{ id: 'w2.trouble', title: 'Troubleshooting Ladder와 오류 메시지', slides: 'S33–S35, S39',
  blocks: [
    H.key('“거부(refused)”는 도착은 했다는 뜻, “시간 초과(timeout)”는 도착조차 못 했다는 뜻. 오류 메시지가 이미 계층을 말하고 있다.'),
    { lab: { title: '증상을 고르면 사다리의 어디를 먼저 볼지 표시', init: { s: 'refused' },
      ctl: [{ k: 's', type: 'select', label: '오류 메시지', opts: Object.entries(SYM).map(([k, v]) => [k, v[0]]) }],
      out: st => { const m = SYM[st.s];
        return `<div class="result"><b>${m[0]}</b><br>가장 흔한 원인: ${m[1]}<br>의심 계층: ${m[2]} · 확인: <code>${m[3]}</code></div>` + T(['#', '단계', '질문', '확인'], LADDER.map((r, i) => [String(i + 1), r[0], r[1], `<code>${r[2]}</code>`]), { hl: (r, i) => m[4].includes(i + 1) }) +
          (m[4].length ? '' : '<p style="margin:0">상태 코드(403/404)가 왔다면 네트워크는 정상이다 — 애플리케이션 로그를 본다.</p>'); } } },
    `<p>위에서 아래로 하나씩 배제한다 — 이 순서가 곧 과제(Network Diagnosis Memo)의 진단 순서다. 명령어는 외우는 것이 아니라 <b>출력의 어느 줄이 어느 개념인지</b> 짚을 수 있어야 한다: <code>ipconfig /all</code> · <code>ping</code> · <code>tracert</code> · <code>route print</code> · <code>arp -a</code> · <code>netstat -ano</code> · <code>nslookup</code>.</p>`,
    { h3: 'AI에게 “고쳐줘”가 아니라 “진단하게” (S39)' },
    T(['Bad', 'Better'], [['“다른 컴퓨터에서 접속이 안 돼. 고쳐줘.”', '“FastAPI가 Windows PC에서 실행 중이고 localhost:8000은 접속된다. 같은 Wi-Fi의 다른 PC에서는 timeout이 발생한다. Bind address · Private IP · Subnet · Firewall · Port 관점에서 진단 순서를 제시하고, 각 단계의 확인 명령과 기대 출력을 알려줘.”']]),
    `<p>차이: 증상 · 환경 · 이미 확인한 사실 · 원하는 출력 형식을 함께 준다.</p>`,
  ] },

{ id: 'w2.all', title: '종합: 한 번의 왕복에서 바뀌는 모든 주소', slides: 'S4 · S13–S27 종합', tag: '종합',
  blocks: [
    `<p>지금까지 따로 본 DHCP · AND 판단 · ARP · Routing · NAT을 <b>패킷 하나의 왕복</b>으로 이어 본다. Laptop이 서버 34.1.2.3:443에 TCP 연결을 시작하는 첫 패킷(SYN)과 그 응답(SYN+ACK)이다. 장비 안에서 일어나는 일은 ⚙ 단계로 따로 나눴다. 아래 “구간별 헤더 기록” 표가 마지막에 이 절 전체의 답이 된다.</p>`,
    T(['장비 · 인터페이스', 'IP', 'MAC (설명용 예시)'], [['Laptop', '192.168.0.23/24 (DHCP)', '3c-22-fb-12-34-56'], ['공유기 LAN 쪽', '192.168.0.1', '00-11-22-33-44-55'], ['공유기 WAN 쪽', '203.0.113.5 (Public)', '00-11-22-33-44-66'], ['ISP Router (공유기 쪽)', '203.0.113.1', '7c-ad-4f-00-00-01'], ['ISP Router (서버 쪽)', '34.1.2.1', '7c-ad-4f-00-00-02'], ['Cloud Server', '34.1.2.3', '52-54-00-9a-bc-de']], { mono: [1, 2] }),
    H.note('실제 인터넷에는 ISP와 서버 사이에 라우터가 여러 개 있다. 여기서는 “Internet Router” 하나로 줄였다 — 라우터가 몇 개든 하는 일(L2 제거 → TTL−1 → 경로 → 새 L2)은 같다.'),
    { trace: { title: 'Laptop ⇄ Cloud Server, SYN과 SYN+ACK', sub: '노란색 = 바뀐 값 · ⚙ = 장비 내부', rowH: 104, minW: 700, chipH: 104,
      nodes: [{ id: 'l', label: 'Laptop', sub: '192.168.0.23', icon: 'laptop', x: .07, y: 0 }, { id: 'hr', label: '공유기 (NAT)', sub: '.0.1 | 203.0.113.5', icon: 'router', x: .36, y: 0 }, { id: 'isp', label: 'Internet Router', sub: '.113.1 | 34.1.2.1', icon: 'router', x: .64, y: 0 }, { id: 'sv', label: 'Cloud Server', sub: '34.1.2.3:443', icon: 'server', x: .93, y: 0 }],
      links: [['l', 'hr'], ['hr', 'isp'], ['isp', 'sv']],
      tables: [{ id: 'cfg', title: 'Laptop 네트워크 설정 (ipconfig)', cols: ['항목', '값'] }, { id: 'arp', title: 'Laptop ARP Cache', cols: ['IP', 'MAC'] }, { id: 'nat', title: '공유기 NAT Table', cols: ['내부', '외부(변환)', '상대'] }, { id: 'log', title: '구간별 헤더 기록', cols: ['구간', 'Src MAC → Dst MAC', 'Src IP:Port', 'Dst IP:Port', 'TTL'] }],
      events: (() => {
        const E = (s, d) => eth(s, d), L = '3c-22-fb-12-34-56', HL = '00-11-22-33-44-55', HW = '00-11-22-33-44-66', IA = '7c-ad-4f-00-00-01', IB = '7c-ad-4f-00-00-02', S = '52-54-00-9a-bc-de';
        const syn = (sp, f = 'SYN') => tcp(sp, 443, [['Flags', f]]);
        const sa = dp => ({ L: 'L4', n: 'TCP', f: [['Src Port', 443], ['Dst Port', dp], ['Flags', 'SYN, ACK']] });
        const IPx = (s, d, ttl) => ip(s, d, [['TTL', ttl]]);
        const log = [];
        const add = r => { log.push(r); return log.slice(); };
        const cfg = [['IPv4', '192.168.0.23'], ['Mask', '255.255.255.0 (/24)'], ['Gateway', '192.168.0.1'], ['DNS', '8.8.8.8']];
        return [
          { from: 'l', to: 'l', label: 'DHCP로 받은 설정', state: { l: '192.168.0.23/24' }, tables: { cfg }, say: '출발점: Laptop은 2.15의 DHCP(DORA)로 <b>IP · Mask · Gateway · DNS</b> 네 값을 받아 두었다. 이 네 값이 아래 모든 판단의 재료다.' },
          { from: 'l', to: 'l', label: 'AND 판단', say: '<span class="mono">34.1.2.3 AND 255.255.255.0 = 34.1.2.0</span> ≠ <span class="mono">192.168.0.0</span> → 내 Subnet 밖 → <b>Gateway 192.168.0.1에게</b> 넘긴다. 필요한 것은 Gateway의 MAC.' },
          { from: 'l', to: 'hr', label: 'ARP who-has .0.1', pkt: [E(L, 'ff-ff-ff-ff-ff-ff'), arp('request', [['Who has', '192.168.0.1'], ['Tell', '192.168.0.23']])], say: 'ARP Cache가 비어 있으니 Broadcast로 묻는다.' },
          { from: 'hr', to: 'l', label: 'ARP reply', pkt: [E(HL, L), arp('reply', [['192.168.0.1 is at', HL]])], tables: { arp: [['192.168.0.1', HL]] }, say: '공유기 LAN 쪽 MAC <b>00-11-22-33-44-55</b>를 받아 ARP Cache에 적는다.' },
          { from: 'l', to: 'l', label: 'SYN 조립 (캡슐화)', cmp: false, pkt: [E(L, HL), IPx('192.168.0.23', '34.1.2.3', 64), syn(51500)], say: '위에서 아래로 헤더를 붙인다: <b>TCP</b>(Src Port 51500은 OS가 고른 임시 포트, Dst Port 443, SYN) → <b>IP</b>(나 → 서버, TTL 64) → <b>Ethernet</b>(나 → 공유기 MAC).' },
          { from: 'l', to: 'hr', label: '① Laptop → 공유기', pkt: [E(L, HL), IPx('192.168.0.23', '34.1.2.3', 64), syn(51500)], tables: { log: add(['Laptop → 공유기', '3c-22… → 00-11-22-33-44-55', '192.168.0.23:51500', '34.1.2.3:443', '64']) }, say: '첫 번째 링크(집 Wi-Fi/LAN).' },
          { from: 'hr', to: 'hr', label: '⚙ L2 제거 · TTL−1', pkt: [IPx('192.168.0.23', '34.1.2.3', 63), syn(51500)], say: 'Dst MAC = 내 LAN 쪽 MAC → 받아들이고 Ethernet 헤더를 벗긴다. TTL 64 → 63.' },
          { from: 'hr', to: 'hr', label: '⚙ NAT: Src 변환', pkt: [IPx('203.0.113.5', '34.1.2.3', 63), syn(40001)], tables: { nat: [['192.168.0.23:51500', '203.0.113.5:40001', '34.1.2.3:443']] }, say: '나가는 패킷이므로 <b>Src IP 192.168.0.23 → 203.0.113.5, Src Port 51500 → 40001</b>. 이 짝을 NAT Table에 기록한다 — 응답이 돌아올 길.' },
          { from: 'hr', to: 'hr', label: '⚙ Default Route · 새 L2', cmp: 4, pkt: [E(HW, IA), IPx('203.0.113.5', '34.1.2.3', 63), syn(40001)], say: '공유기의 Routing Table에는 34.1.2.3에 대한 구체적 경로가 없다 → <b>0.0.0.0/0 → ISP 203.0.113.1</b>. WAN 쪽 MAC으로 새 Ethernet 헤더. #5(Laptop이 만든 프레임)와 비교하면 공유기가 바꾼 것 전부가 보인다: <b>MAC 2개 · Src IP · Src Port · TTL</b>. Dst IP:Port는 그대로.' },
          { from: 'hr', to: 'isp', label: '② 공유기 → ISP', pkt: [E(HW, IA), IPx('203.0.113.5', '34.1.2.3', 63), syn(40001)], tables: { log: add(['공유기 → ISP', '00-11-22-33-44-66 → 7c-ad-4f-00-00-01', '203.0.113.5:40001', '34.1.2.3:443', '63']) }, say: '인터넷 구간. 여기서부터는 아무도 192.168.0.23을 모른다.' },
          { from: 'isp', to: 'isp', label: '⚙ L2 제거 → LPM → 새 L2', pkt: [E(IB, S), IPx('203.0.113.5', '34.1.2.3', 62), syn(40001)], say: 'Router의 3단계: 내 MAC 확인·L2 제거 → TTL 63 → 62 → <span class="mono">34.1.2.0/24 = On-link</span>(서버가 직접 연결) → 서버 MAC으로 새 L2. <b>IP와 포트는 건드리지 않는다</b>(일반 Router는 NAT을 하지 않는다).' },
          { from: 'isp', to: 'sv', label: '③ ISP → 서버', pkt: [E(IB, S), IPx('203.0.113.5', '34.1.2.3', 62), syn(40001)], tables: { log: add(['ISP → 서버', '7c-ad-4f-00-00-02 → 52-54-00-9a-bc-de', '203.0.113.5:40001', '34.1.2.3:443', '62']) }, say: '서버에 도착.' },
          { from: 'sv', to: 'sv', label: '⚙ 수신 · SYN+ACK 준비', cmp: 11, pkt: [E(S, IB), IPx('34.1.2.3', '203.0.113.5', 64), sa(40001)], say: '서버는 MAC·IP가 자기 것임을 확인하고 :443 listen 소켓에 SYN을 넘긴다. 서버가 보는 상대는 <b>203.0.113.5:40001</b>(공유기)이다. 응답은 받은 패킷을 뒤집어 만든다: <b>Src ↔ Dst (MAC·IP·Port 모두)</b>, TTL은 서버 OS 기본값 64, Flags = SYN, ACK.' },
          { from: 'sv', to: 'isp', label: '④ 서버 → ISP', pkt: [E(S, IB), IPx('34.1.2.3', '203.0.113.5', 64), sa(40001)], tables: { log: add(['서버 → ISP', '52-54-00-9a-bc-de → 7c-ad-4f-00-00-02', '34.1.2.3:443', '203.0.113.5:40001', '64']) }, say: '응답 출발. 서버의 Default Gateway는 34.1.2.1(ISP Router).' },
          { from: 'isp', to: 'hr', label: '⑤ ISP → 공유기', pkt: [E(IA, HW), IPx('34.1.2.3', '203.0.113.5', 63), sa(40001)], tables: { log: add(['ISP → 공유기', '7c-ad-4f-00-00-01 → 00-11-22-33-44-66', '34.1.2.3:443', '203.0.113.5:40001', '63']) }, say: 'ISP Router가 같은 3단계를 거쳐 <b>MAC만 새로 쓰고 TTL을 1 줄여</b> 공유기 WAN 쪽으로 보낸다.' },
          { from: 'hr', to: 'hr', label: '⚙ NAT 역변환 · 새 L2', pkt: [E(HL, L), IPx('34.1.2.3', '192.168.0.23', 62), { L: 'L4', n: 'TCP', f: [['Src Port', 443], ['Dst Port', 51500], ['Flags', 'SYN, ACK']] }], say: '공유기는 NAT Table에서 <span class="mono">203.0.113.5:40001</span>을 찾는다 → <b>Dst IP → 192.168.0.23, Dst Port → 51500</b>으로 되돌린다. TTL 63 → 62, LAN 쪽 MAC으로 새 L2 헤더(Dst = Laptop).' },
          { from: 'hr', to: 'l', label: '⑥ 공유기 → Laptop', pkt: [E(HL, L), IPx('34.1.2.3', '192.168.0.23', 62), { L: 'L4', n: 'TCP', f: [['Src Port', 443], ['Dst Port', 51500], ['Flags', 'SYN, ACK']] }], tables: { log: add(['공유기 → Laptop', '00-11-22-33-44-55 → 3c-22-fb-12-34-56', '34.1.2.3:443', '192.168.0.23:51500', '62']) }, say: 'Laptop의 TCP는 이 SYN+ACK를 <b>192.168.0.23:51500 ↔ 34.1.2.3:443</b> 연결의 응답으로 인식한다 — 자기가 보낸 그대로의 4-tuple이다.' },
          { from: 'l', to: 'l', label: '정리', say: '<b>구간별 헤더 기록</b> 표를 위에서 아래로 읽자. ① <b>MAC 열</b>은 구간마다 전부 다르다(링크마다 새로 씀). ② <b>IP:Port 열</b>은 공유기에서만 바뀐다(NAT) — 집 안에서는 192.168.0.23:51500, 밖에서는 203.0.113.5:40001. ③ <b>TTL</b>은 Router를 지날 때마다 1씩 줄고, 응답은 서버가 다시 64로 시작한다. ④ 응답은 Src와 Dst를 뒤집어 같은 길을 되짚는다.' },
        ];
      })() } },
  ] },

{ id: 'w2.p1', title: '서브넷 계산 연습', slides: 'S10–S12 · Lab 1 · QC Q2', tag: '연습',
  blocks: [{ prac: { id: 'p21', title: '주소 하나로 네 가지 구하기',
    gen: rng => { const k = rng.int(0, 2); const ipn = k === 0 ? IP.parse(`10.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`) : k === 1 ? IP.parse(`172.${rng.int(16, 31)}.${rng.int(0, 255)}.${rng.int(1, 254)}`) : IP.parse(`192.168.${rng.int(0, 255)}.${rng.int(1, 254)}`); const p = rng.pick([20, 21, 22, 23, 24, 25, 26, 27, 28]); return { ip: ipn, p, q: p + 2 }; },
    problem: P => `<p>호스트 <b class="mono">${IP.str(P.ip)}/${P.p}</b> 에 대해 구하라.</p><ol><li>Network 주소</li><li>Broadcast 주소</li><li>사용 가능한 Host 수</li><li>/${P.q} 네 개로 나눌 때 이 호스트는 몇 번째 Subnet인가 (1~4)</li></ol>`,
    answers: P => [{ label: 'Network', ans: IP.str(IP.net(P.ip, P.p)) }, { label: 'Broadcast', ans: IP.str(IP.bc(P.ip, P.p)) }, { label: 'Host 수', ans: IP.hosts(P.p), type: 'num' }, { label: `/${P.q} 중 몇 번째`, ans: Math.floor((P.ip - IP.net(P.ip, P.p)) / IP.total(P.q)) + 1, type: 'num' }],
    solution: P => { const oi = Math.floor(P.p / 8), keep = P.p % 8, o = IP.oct(P.ip)[Math.min(oi, 3)], blk = 2 ** (8 - keep); const off = P.ip - IP.net(P.ip, P.p), sz = IP.total(P.q), idx = Math.floor(off / sz);
      return [`/${P.p} = 8 × ${Math.floor(P.p / 8)} + ${keep} → 경계는 <b>${oi + 1}번째 옥텟의 앞 ${keep} bit</b>${keep ? '' : ' (옥텟 경계와 일치)'}.` + bitsHTML([{ label: 'IP', n: P.ip, p: P.p }, { label: 'Mask', n: IP.mask(P.p), mask: true }], { cut: P.p }),
        keep ? `Network: ${oi + 1}번째 옥텟 ${o}를 블록 크기 2^(8−${keep}) = ${blk}의 배수로 내림 → ${Math.floor(o / blk) * blk}. 뒤 옥텟은 0 → <b>${IP.str(IP.net(P.ip, P.p))}</b>` : `Network: Host 옥텟을 0으로 → <b>${IP.str(IP.net(P.ip, P.p))}</b>`,
        `Broadcast: Host Part ${32 - P.p} bit를 모두 1로 = Network + 2^${32 - P.p} − 1 → <b>${IP.str(IP.bc(P.ip, P.p))}</b>`,
        `Host 수 = 2^${32 - P.p} − 2 = <b>${IP.fmt(IP.hosts(P.p))}</b> (범위 ${IP.str(IP.net(P.ip, P.p) + 1)} ~ ${IP.str(IP.bc(P.ip, P.p) - 1)})`,
        `/${P.q} Subnet 크기 = 2^${32 - P.q} = ${IP.fmt(sz)}. 네트워크 시작부터 거리 ${IP.fmt(off)} ÷ ${IP.fmt(sz)} = 몫 ${idx} → <b>${idx + 1}번째</b>. (빌린 2 bit = ${IP.bin(P.ip).slice(P.p, P.p + 2)}₂ = ${idx}로 읽어도 같다)`]; } } }] },

{ id: 'w2.p2', title: '어디로 보낼까? (AND 판단 + LPM)', slides: 'S9, S15, S17 · QC Q1·Q4', tag: '연습',
  blocks: [{ prac: { id: 'p22', title: '목적지 하나, 판단 세 개',
    gen: rng => { const a = rng.int(0, 255); const me = IP.parse(`192.168.${a}.${rng.int(2, 120)}`); const p = rng.pick([23, 24, 25, 26]); const gw = IP.net(me, p) + 1; const b = rng.int(0, 255), c = rng.int(0, 255);
      const table = [{ d: IP.str(IP.net(me, p)), p, gw: 'On-link' }, { d: '10.0.0.0', p: 8, gw: '10.255.0.1' }, { d: `10.${b}.0.0`, p: 16, gw: '10.255.0.2' }, { d: '0.0.0.0', p: 0, gw: IP.str(gw) }];
      const dst = rng.pick([IP.parse(`192.168.${a}.${rng.int(1, 254)}`), IP.parse(`10.${b}.${c}.${rng.int(1, 254)}`), IP.parse(`10.${(b + rng.int(1, 200)) % 256}.${c}.${rng.int(1, 254)}`), IP.parse(`${rng.pick([8, 34, 52, 142])}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`), IP.parse(`192.168.${(a + 1) % 256}.${rng.int(1, 254)}`)]);
      return { me, p, table, dst }; },
    problem: P => `<p>내 PC <b class="mono">${IP.str(P.me)}/${P.p}</b>, Routing Table:</p>${T(['Destination', 'Next Hop'], P.table.map(r => [`${r.d}/${r.p}`, r.gw]), { mono: [0, 1] })}<p>목적지 <b class="mono">${IP.str(P.dst)}</b>로 보낼 때</p><ol><li>같은 네트워크인가? (예/아니오)</li><li>선택되는 경로의 prefix 길이</li><li>Next Hop (On-link 또는 IP)</li></ol>`,
    answers: P => { const same = IP.net(P.me, P.p) === IP.net(P.dst, P.p); const r = lpm(P.dst, P.table).best; return [{ label: '같은 네트워크?', ans: same ? ['예', 'yes', 'o'] : ['아니오', '아니요', 'no', 'x'], show: same ? '예' : '아니오' }, { label: '선택 prefix', ans: r.p, type: 'num' }, { label: 'Next Hop', ans: [r.gw], show: r.gw }]; },
    solution: P => { const r = lpm(P.dst, P.table); return [`내 IP AND /${P.p} = ${IP.str(IP.net(P.me, P.p))}, 목적지 AND /${P.p} = ${IP.str(IP.net(P.dst, P.p))} → <b>${IP.net(P.me, P.p) === IP.net(P.dst, P.p) ? '같다' : '다르다'}</b>` + bitsHTML([{ label: '나', n: P.me, p: P.p }, { label: '목적지', n: P.dst, p: P.p }], { cut: P.p }),
      `일치하는 행: ${r.m.map(m => `${m.d}/${m.p}`).join(', ')} → 가장 긴 <b>/${r.best.p}</b> → Next hop <b>${r.best.gw}</b>. On-link가 선택되면 같은 네트워크라는 뜻과 같고, 0.0.0.0/0만 맞으면 Default Gateway로 간다.`]; } } }] },

{ id: 'w2.qc', title: 'Quick Check — Week 2', slides: 'S40', tag: '점검',
  blocks: [`<p>답을 말할 때 “왜 그런지”를 한 문장으로 덧붙일 것 (강의 지시).</p>`, { qc: 'w2' }] },
] });
})();
