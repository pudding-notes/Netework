/* Week 9 — Cloud Networking */
'use strict';
(function () {
const T = H.tbl;
const lines = arr => `<ul class="ln-list">${arr.map(x => `<li>${x}</li>`).join('')}</ul>`;
const ip = (src, dst, extra = []) => ({ L: 'L3', n: 'IP · TCP', f: [['Src', src], ['Dst', dst], ...extra] });
const fmt = n => Number(n).toLocaleString('en-US');
const pct = (x, d = 4) => (x * 100).toFixed(d).replace(/0+$/, '').replace(/\.$/, '') + '%';
function parseCIDR(s) { const m = String(s).trim().match(/^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/); if (!m) return null; const a = IP.parse(m[1]), p = +m[2]; if (a == null || p > 32) return null; return { a, p, net: IP.net(a, p) }; }
const inCIDR = (addr, c) => IP.net(addr, c.p) === c.net;

/* route table used by the LPM lab (S15) */
const RT = [['①', '10.0.0.0/16', 'local', 'VPC 내부 직접'], ['②', '172.16.0.0/16', 'vgw (학교 VPN)', '학교 VPN'], ['③', '172.16.5.0/24', 'pcx (다른 VPC)', '다른 VPC (Peering)'], ['④', '0.0.0.0/0', 'nat-a', 'NAT GW → 인터넷']];
/* NACL inbound rules (S23) */
const NACL_IN = [[90, 'ALL', '198.51.100.0/24', 'DENY', '공격 대역 차단'], [100, '443', '0.0.0.0/0', 'ALLOW', ''], [110, '80', '0.0.0.0/0', 'ALLOW', ''], [120, '1024-65535', '0.0.0.0/0', 'ALLOW', '응답 · NAT 귀환'], ['*', 'ALL', '0.0.0.0/0', 'DENY', '기본 거부']];
const portIn = (spec, p) => spec === 'ALL' || (spec.includes('-') ? (p >= +spec.split('-')[0] && p <= +spec.split('-')[1]) : +spec === p);

addWeek({ id: 'w9', num: 9, short: '9주', title: 'Cloud Networking', range: 'Week 9',
  lead: '2주차의 IP · CIDR · 라우팅 · NAT를 클라우드 위에 <b>“설정”으로</b> 다시 짓는다. 어디에(Region · AZ) → 울타리(VPC · CIDR · Subnet) → 길(Route Table · IGW · NAT GW) → 문단속(Security Group · NACL) → 안 죽게(Load Balancer · Multi-AZ).',
  sections: [

{ id: 'w9.q', title: '이번 주의 질문 — 무엇을 어디에 두고, 어떤 길과 문을?', slides: 'S1–S4',
  blocks: [
    H.key('핵심 질문: 인터넷 사용자는 API에 접속할 수 있고, <b>DB는 인터넷에서 절대 보이지 않으며</b>, 서버는 OpenAI API를 호출할 수 있게 하려면 — 무엇을 어디에 두고, 어떤 길과 문을 만들어야 하는가?'),
    T(['2~7주차에서 배운 것', '온프레미스(직접 구축)', '클라우드 (이번 주)'], [['IP 대역 · CIDR', '사내 네트워크 주소 계획', '<b>VPC CIDR · Subnet CIDR</b>'], ['서브넷 분할 (/24 → /26)', 'VLAN · 스위치 포트', '<b>Subnet</b> (AZ마다)'], ['라우팅 테이블 · 기본 게이트웨이', '라우터 장비 설정', '<b>Route Table</b> (콘솔 · 코드)'], ['공유기 NAT', '방화벽 · NAT 장비', '<b>NAT Gateway · IGW</b>'], ['방화벽 규칙 · 포트', '방화벽 어플라이언스', '<b>Security Group · NACL</b>'], ['L4/L7 로드밸런서', 'L4 스위치 · Nginx', '<b>ALB · NLB</b> (관리형)'], ['DNS', '사내 DNS 서버', 'Route 53 · VPC Resolver']]),
    H.cards([['무엇이 같은가', '패킷은 똑같다. IP 헤더, TCP 핸드셰이크, Longest Prefix Match, NAT 변환 — 원리는 2~3주차 그대로.', ''], ['무엇이 다른가', '장비를 사지 않고 API · 콘솔 · 코드(IaC)로 몇 분 만에 만든다. 대신 <b>설정 한 줄 실수</b>가 곧 장애 · 보안 사고 · 요금 폭탄.', 'L3'], ['7주차와의 연결', 'MQTT 브로커 · SSE 게이트웨이 · DB는 결국 어딘가의 서버에 있다 → 그 “어딘가”를 설계하는 주.', 'L7']]),
    { h3: '핵심 용어 12개 (S4)' },
    T(['용어', '한 줄 정의'], [['Region', '지리적으로 떨어진 클라우드 거점 (예: 서울 ap-northeast-2)'], ['Availability Zone', '리전 안의 전력 · 냉각 · 네트워크가 독립된 데이터센터 묶음'], ['VPC', '클라우드 안에 만드는 논리적으로 격리된 나만의 IP 네트워크'], ['CIDR', '10.0.0.0/16처럼 IP 대역을 “주소/접두사 길이”로 표기'], ['Subnet', 'VPC CIDR을 잘라 하나의 AZ에 배치한 IP 구간'], ['Route Table', '목적지(CIDR) → 다음 홉(Target) 규칙표. 서브넷마다 연결'], ['Public Subnet', 'Route Table에 0.0.0.0/0 → IGW 경로가 있는 서브넷'], ['Private Subnet', 'IGW 경로가 없는 서브넷. 인터넷에서 직접 접근 불가'], ['Internet Gateway', 'VPC와 인터넷을 잇는 출입구. 공인 IP ↔ 사설 IP 1:1 변환'], ['NAT Gateway', 'Private 서브넷의 “나가는” 연결만 대신 해 주는 주소 변환기'], ['Security Group', '인스턴스(ENI)에 붙는 Stateful 방화벽. 허용 규칙만'], ['NACL', '서브넷 경계의 Stateless 방화벽. 허용 · 거부 + 번호 순서']]),
  ] },

{ id: 'w9.onprem', title: '온프레미스 vs 클라우드 · 아파트 단지로 보기', slides: 'S5–S6',
  blocks: [
    T(['', '온프레미스', '클라우드'], [['구축 시간', '장비 발주 · 설치 수 주', 'API 호출 · 코드 실행 수 분'], ['비용 구조', '초기 구매 (<b>CAPEX</b>)', '쓴 만큼 과금 (<b>OPEX</b>) — 켜 두면 계속 나감'], ['책임 범위', '건물 · 전원 · 장비 · 설정 전부', '물리 인프라는 클라우드사, <b>네트워크 설정 · 접근 권한은 사용자</b> (공동 책임 모델)']]),
    H.key('<b>공동 책임 모델</b>(Shared Responsibility): 데이터센터가 무너지는 건 클라우드사 책임이지만, DB 포트를 인터넷에 연 것은 <b>우리 책임</b>이다. 이번 주 내용이 바로 “우리 책임” 영역.'),
    T(['클라우드', '아파트 단지', '포인트'], [['<b>Region</b>', '도시 (서울 · 도쿄 · 버지니아)', '어느 도시에 단지를 지을까'], ['<b>AZ</b>', '도시 안 서로 떨어진 단지 (전기 · 수도 따로)', '한 단지가 정전돼도 옆 단지는 멀쩡'], ['<b>VPC</b>', '우리 단지 담장 안', '주소 체계(CIDR)를 우리가 정한다'], ['<b>Subnet</b>', '동 (건물 한 채)', '한 동은 <b>한 단지(AZ)에만</b> 서 있다'], ['<b>Route Table</b>', '단지 내 길 안내 표지판', '“외부로 나가려면 정문으로”'], ['<b>Internet Gateway</b>', '단지 정문', '손님이 들어오고 주민이 나가는 문'], ['<b>NAT Gateway</b>', '택배 발송 전용 창구', '주민은 보낼 수 있지만, 외부인은 들어올 수 없다'], ['<b>Security Group</b>', '세대 현관 도어락', '허락한 사람만. 내가 나갔다 오면 자동으로 열림 (Stateful)'], ['<b>NACL</b>', '동 출입구 경비실', '명부를 순서대로 확인. 들어올 때 · 나갈 때 따로 (Stateless)'], ['<b>Load Balancer</b>', '단지 안내 데스크', '손님을 여러 동의 빈 창구로 나눠 보냄']]),
    H.note('비유의 한계: 실제 VPC에는 담장이 없다 — 같은 물리 서버 위에서 소프트웨어(가상화 · 캡슐화)가 다른 고객의 패킷과 섞이지 않게 분리해 준다.'),
  ] },

{ id: 'w9.az', title: 'Region과 Availability Zone · 장애 영역', slides: 'S7–S8',
  blocks: [
    { fig: `<div style="border:2px solid var(--l7);border-radius:12px;padding:10px 12px;max-width:720px"><b style="color:var(--l7)">Region: ap-northeast-2 (서울)</b><div class="azgrid" style="margin-top:8px">${['a', 'b', 'c'].map(z => `<div style="border:1.5px dashed var(--l3);border-radius:10px;padding:8px"><b class="mono" style="color:var(--l3)">ap-northeast-2${z}</b><div style="display:flex;gap:4px;margin:6px 0">${'<span style="flex:1;border:1px solid var(--line);border-radius:6px;padding:4px;font-size:12px;text-align:center">데이터센터</span>'.repeat(2)}</div><small class="cm">독립 전원 · 냉각 · 네트워크</small></div>`).join('')}</div><p class="cm" style="margin:6px 0 0;font-size:13px;text-align:center">⟷ AZ 간 고속 전용망 · 왕복 지연 수 ms 이내 ⟷</p></div>`, cap: 'Region ⊃ AZ ⊃ 데이터센터.' },
    H.cards([['Region을 고를 때', '① 사용자와의 지연 (RTT)<br>② 데이터 국외 이전 · 개인정보 규정<br>③ 서비스 지원 여부 (GPU 등)<br>④ 가격', ''], ['AZ 이름의 함정', '2a는 계정마다 실제 물리 AZ가 다를 수 있다 → 계정 간 비교는 <b>AZ ID</b>(apne2-az1)로.', 'L3'], ['서비스 범위 3종류', '<b>Global</b> (IAM · Route 53)<br><b>Regional</b> (VPC · S3)<br><b>Zonal</b> (Subnet · EC2 · NAT GW)', 'L7']]),
    H.key('<b>VPC는 Region 단위</b>로 만들고 모든 AZ에 걸쳐 있다. 그 안의 <b>Subnet은 반드시 AZ 하나에 속한다</b> — 이 범위 차이가 Multi-AZ 설계의 출발점.'),
    { h3: '장애 영역(Failure Domain) — “무엇이 함께 죽는가?” (S8)' },
    T(['장애 영역', '원인', '대응'], [['프로세스 · 컨테이너', '앱 버그 · 메모리 부족', '자동 재시작'], ['인스턴스 (서버 1대)', '하드웨어 고장 · OS 패치', '서버 2대 이상 + LB'], ['<b>Availability Zone</b>', '정전 · 냉각 고장 · 네트워크 단절', '<b>Multi-AZ</b> (이번 주 기본값)'], ['Region', '대규모 장애 · 재해', 'Multi-Region (비용 · 복잡도 큼)']]),
    H.note('Blast Radius(영향 범위) — 아래로 갈수록 드물지만 치명적. 예: API 서버 2대를 같은 AZ에 두면 서버 고장엔 버티지만 AZ 정전엔 같이 죽는다 → AZ a · c에 1대씩.'),
  ] },

{ id: 'w9.vpc', title: 'VPC — 클라우드 안의 나만의 네트워크', slides: 'S9–S10',
  blocks: [
    { fig: `<div style="border:2px solid var(--l7);border-radius:12px;padding:10px 12px;max-width:760px"><div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px"><b style="color:var(--l7)">VPC 10.0.0.0/16 <small class="cm">(Region 전체에 걸침)</small></b><span class="seg" style="border-color:var(--ok)"><b>Internet Gateway</b></span></div><div class="vpcgrid" style="margin-top:8px">${[['a', 0], ['c', 1]].map(([z, k]) => `<div style="border:1.5px dashed var(--l3);border-radius:10px;padding:8px"><b class="mono" style="color:var(--l3)">AZ ${z}</b>${[['Public Subnet', `10.0.${k}.0/24`, 'ok'], ['Private App', `10.0.1${k}.0/24`, 'l4'], ['Private DB', `10.0.2${k}.0/24`, 'bad']].map(([n, c, col]) => `<div style="border-left:4px solid var(--${col});background:var(--sunk);border-radius:6px;padding:5px 8px;margin-top:6px;display:flex;justify-content:space-between;gap:6px;font-size:13.5px"><span>${n}</span><code>${c}</code></div>`).join('')}<small class="cm">Route Table · NACL · SG</small></div>`).join('')}</div></div>` },
    H.cards([['VPC가 정하는 것', 'IP 대역(CIDR) · 서브넷 분할 · 경로(Route Table) · 출입구(IGW · NAT) · 방화벽(SG · NACL) · DNS', ''], ['격리의 의미', '다른 VPC와는 기본적으로 통신 불가. 연결하려면 Peering · Transit Gateway · VPN을 <b>명시적으로</b>.', 'L3'], ['Default VPC 주의', '계정마다 자동 생성된 172.31.0.0/16. 모든 서브넷이 Public이라 실습 외 운영에 쓰지 않는다.', 'L7']]),
    H.key('VPC 안의 모든 서브넷 사이에는 <b>local 경로가 자동으로</b> 있다 — 같은 VPC면 기본적으로 라우팅된다. 막는 것은 <b>길이 아니라 문(SG · NACL)</b>의 역할.'),
    { h3: 'AWS · Azure · GCP 용어 대응 (S10)' },
    T(['개념', 'AWS', 'Azure', 'GCP', '차이점'], [['가상 네트워크', 'VPC', 'Virtual Network (VNet)', 'VPC Network', 'GCP VPC는 Global'], ['서브넷 범위', 'Subnet (<b>AZ 하나</b>)', 'Subnet (Region)', 'Subnet (Region)', 'AWS만 서브넷이 AZ에 묶인다'], ['경로', 'Route Table', 'Route Table (UDR)', 'Routes', '모두 Longest Prefix Match'], ['인터넷 출입구', 'Internet Gateway', '(기본 제공)', '(기본 인터넷 게이트웨이)', 'AWS는 IGW를 직접 붙여야'], ['아웃바운드 NAT', 'NAT Gateway', 'NAT Gateway', 'Cloud NAT', '모두 관리형 SNAT'], ['인스턴스 방화벽', 'Security Group', 'NSG / ASG', 'Firewall Rules', 'Stateful'], ['서브넷 방화벽', 'Network ACL', 'NSG(서브넷 연결)', '(Firewall Rules로 통합)', 'AWS NACL만 Stateless'], ['고정 공인 IP', 'Elastic IP', 'Public IP (Static)', 'Static External IP', '보유만 해도 과금'], ['예약 IP (서브넷당)', '5개', '5개', '4개', '가용 IP 계산 시 차감']]),
  ] },

{ id: 'w9.cidr', title: 'CIDR 복습과 서브넷 IP 계산 — 256이 아니다', slides: 'S11–S12',
  blocks: [
    T(['CIDR', '고정 비트', '주소 수', '쓰임'], [['/16', '16', '65,536', 'VPC 최대 크기 (AWS)'], ['/18', '18', '16,384', '큰 VPC를 4등분'], ['/20', '20', '4,096', '대형 서브넷 (컨테이너)'], ['/22', '22', '1,024', '중형 서브넷'], ['/24', '24', '256', '일반적인 서브넷'], ['/26', '26', '64', '작은 서브넷 (2주차 실습)'], ['/28', '28', '16', 'VPC · 서브넷 최소 크기']], { mono: [0] }),
    H.key('주소 수 = <b>2^(32 − 접두사 길이)</b>. 접두사가 1 줄면 주소는 2배. 예: /20 → 2^12 = 4,096 · /16 안에 /24는 2^(24−16) = <b>256개</b>.'),
    { lab: { title: 'AWS 서브넷 계산기 — 예약 5개를 빼라', init: { c: '10.0.1.0/24', vpc: '10.0.0.0/16' },
      ctl: [{ k: 'c', type: 'text', label: '서브넷 CIDR', w: 160 }, { k: 'vpc', type: 'text', label: 'VPC CIDR', w: 160 }, { type: 'btns', items: ['10.0.1.0/24', '10.0.1.0/26', '10.0.1.0/28', '10.0.20.0/24', '10.0.0.0/23'].map(v => ({ label: v, act: st => st.c = v })) }],
      out: st => { const c = parseCIDR(st.c), v = parseCIDR(st.vpc); if (!c) return '<span class="err">CIDR 형식: a.b.c.d/n</span>';
        if (c.p < 16 || c.p > 28) return `<div class="verdict bad">AWS 서브넷은 /16 ~ /28만 가능</div>`;
        const n = IP.total(c.p), base = c.net, bc = IP.bc(c.net, c.p);
        const inside = v && inCIDR(c.net, v) && c.p >= v.p;
        const rows = [[IP.str(base), '네트워크 주소'], [IP.str(base + 1), 'VPC 라우터 (기본 게이트웨이 .1)'], [IP.str(base + 2), 'DNS 예약 — 실제 VPC DNS는 VPC CIDR +2' + (v ? ` = <b>${IP.str(v.net + 2)}</b>` : '')], [IP.str(base + 3), '향후 예약'], [`${IP.str(base + 4)} ~ ${IP.str(bc - 1)}`, `<b class="cok">사용 가능 ${fmt(n - 5)}개</b>`], [IP.str(bc), '브로드캐스트 (VPC는 브로드캐스트를 지원하지 않지만 예약)']];
        return T(['주소', '용도'], rows, { mono: [0] }) + `<div class="verdict ${inside ? 'ok' : 'bad'}">${fmt(n)} − 5 = 사용 가능 ${fmt(n - 5)}개${inside ? '' : ' · ⚠ VPC CIDR 범위 밖'}</div>` +
          (v && inside ? `<p style="margin:0">이 VPC(/${v.p}) 안에 /${c.p} 서브넷은 2^(${c.p}−${v.p}) = <b>${fmt(2 ** (c.p - v.p))}개</b> 들어간다. 2주차와 달리 클라우드 서브넷은 <b>5개</b> 빠진다 (네트워크 + 브로드캐스트 2개가 아니라).</p>` : ''); } } },
    T(['문제', '풀이', '답'], [['/24 서브넷의 사용 가능 IP', '256 − 5', '<b>251</b>'], ['/26 서브넷의 사용 가능 IP', '64 − 5', '<b>59</b>'], ['/28 서브넷의 사용 가능 IP', '16 − 5', '<b>11</b>'], ['/16 VPC를 /24로 나누면 몇 개?', '2^(24−16)', '256개'], ['10.0.20.0/24의 VPC DNS 주소', 'VPC CIDR +2', '10.0.0.2'], ['컨테이너 300개가 들어갈 서브넷', '300 + 5 > 256', '/23 이상']]),
    T(['사설 IP 대역 (RFC 1918)', '크기', '비고'], [['10.0.0.0/8', '1,677만 개', '대규모 · 클라우드 VPC에 가장 흔함'], ['172.16.0.0/12', '104만 개', 'AWS Default VPC 172.31.0.0/16이 여기'], ['192.168.0.0/16', '6.5만 개', '가정 · 연구실 공유기 (<b>겹치기 쉬움!</b>)']], { mono: [0] }),
    H.warn('자주 하는 실수: 서브넷 /28로 시작 → 오토스케일링 · 컨테이너가 늘자 <b>IP 고갈</b>로 배포 실패 · VPC DNS는 각 서브넷의 +2가 아니라 <b>VPC CIDR의 +2</b>(10.0.0.2) · EKS는 Pod마다 VPC IP를 써서 /24가 금방 찬다 → /20 이상.'),
  ] },

{ id: 'w9.plan', title: 'VPC CIDR 계획 — 실제 설계표', slides: 'S13',
  blocks: [
    T(['서브넷', 'AZ', 'CIDR', '용도', '가용 IP'], [['public-a', 'a', '10.0.0.0/24', 'ALB · NAT GW', '251'], ['public-c', 'c', '10.0.1.0/24', 'ALB · NAT GW', '251'], ['app-a', 'a', '10.0.10.0/24', 'API 서버 · 브로커', '251'], ['app-c', 'c', '10.0.11.0/24', 'API 서버 · 브로커', '251'], ['db-a', 'a', '10.0.20.0/24', 'RDS Primary', '251'], ['db-c', 'c', '10.0.21.0/24', 'RDS Standby', '251'], ['(예약)', 'b · d', '10.0.128.0/17', 'AZ 추가 · 새 계층', '—']], { mono: [2] }),
    H.cards([['번호 규칙', '세 번째 옥텟: 0~9 Public, 10~19 App, 20~29 DB · 끝자리 0 = AZ a, 1 = AZ c → <b>주소만 보고 위치를 안다</b>', ''], ['겹치면 안 되는 대상', '연구실 · 학교망(192.168.x) · 다른 VPC(개발/운영/다른 리전) · VPN으로 연결할 집 · 회사 → 겹치면 Peering · VPN 경로를 만들 수 없다 (어느 쪽 10.0.1.5인지 모름)', 'L3'], ['환경별 VPC 분리', 'dev 10.10.0.0/16 · stage 10.20.0.0/16 · prod 10.30.0.0/16<br>→ 나중에 연결해도 충돌 없음 · 두 번째 옥텟만 보고 환경을 안다', 'L7']]),
    H.key('VPC CIDR은 만든 뒤 바꾸기 어렵다(보조 CIDR 추가는 가능하지만 제약 많음). 처음에 <b>넉넉하게 · 겹치지 않게</b> 잡는 것이 가장 싼 설계 결정이다.'),
    H.warn('AI에게 CIDR을 맡기면 10.0.0.0/16 하나로 모든 환경을 만드는 실수를 자주 한다.'),
  ] },

{ id: 'w9.route', title: 'Subnet과 Route Table — Public/Private는 이름이 아니라 경로가 정한다', slides: 'S14–S15',
  blocks: [
    `<div class="pair"><div><h4>Subnet의 규칙</h4>${lines(['하나의 AZ에만 속한다 (AZ 장애 = 그 서브넷 장애)', 'VPC CIDR 안에서 서로 겹치지 않는다', 'Route Table 1개와 연결 (지정 안 하면 <b>Main RT</b>)', 'NACL 1개와 연결'])}</div><div><h4>Route Table = 목적지 → 다음 홉</h4>${lines(['<b>local</b> 경로는 자동 생성 · 삭제 불가 → VPC 내부 통신', '목적지 IP와 가장 길게 일치하는 경로 (Longest Prefix Match)', '0.0.0.0/0 = 기본 경로 — 나머지 전부'])}</div></div>`,
    `<div class="pair"><div><h4 class="cok">public-rt <small class="cm">(public-a · public-c)</small></h4>${T(['Destination', 'Target', '의미'], [['10.0.0.0/16', 'local', 'VPC 안은 직접'], ['0.0.0.0/0', '<b>igw-0a1b…</b>', '나머지는 인터넷 정문으로']], { mono: [0, 1] })}</div><div><h4>private-rt-a <small class="cm">(app-a · db-a)</small></h4>${T(['Destination', 'Target', '의미'], [['10.0.0.0/16', 'local', 'VPC 안은 직접'], ['0.0.0.0/0', '<b>nat-0c3d…</b> (AZ a)', '나가는 것만 NAT로'], ['pl-s3', 'vpce-…', 'S3는 Endpoint로']], { mono: [0, 1] })}</div></div>`,
    H.key('“public-subnet”이라는 이름표는 아무 의미가 없다. <b>0.0.0.0/0 → IGW 경로가 있으면 Public, 없으면 Private</b> — 콘솔에서 항상 Route Table 탭을 확인. db 서브넷은 외부 호출이 필요 없으면 0.0.0.0/0 행 자체를 두지 않는다 → <b>Isolated subnet</b>.'),
    { h3: '경로 고르기 연습 — Longest Prefix Match (S15)' },
    { lab: { title: 'app-a 서버가 이 목적지로 보내면 어느 경로를 탈까?', init: { d: '172.16.5.4' },
      ctl: [{ k: 'd', type: 'text', label: '목적지 IP', w: 150 }, { type: 'btns', items: ['10.0.20.15', '8.8.8.8', '172.16.9.4', '172.16.5.4', '10.1.0.7'].map(v => ({ label: v, act: st => st.d = v })) }],
      out: st => { const a = IP.parse(st.d); if (a == null) return '<span class="err">IPv4 주소를 입력</span>';
        const m = RT.map(r => ({ r, c: parseCIDR(r[1]) })).filter(x => inCIDR(a, x.c)); const best = m.reduce((b, x) => !b || x.c.p > b.c.p ? x : b, null);
        return T(['#', 'Destination', 'Target', '일치?'], RT.map(r => { const hit = m.find(x => x.r === r); return [r[0], r[1], r[2], hit ? (hit === best ? `<b class="cok">✓ 선택 (/${hit.c.p} 가장 김)</b>` : `✓ /${hit.c.p}`) : '—']; }), { mono: [1], hl: r => best && r[0] === best.r[0] }) +
          `<div class="verdict ${best.r[0] === '④' && a >>> 24 === 10 ? 'bad' : 'ok'}">${best.r[0]} → ${best.r[3]}</div>` +
          (st.d.trim() === '10.1.0.7' || (best.r[0] === '④' && a >>> 24 === 10) ? `<p style="margin:0" class="cbad">함정! 10.1.0.0/16은 다른 VPC인데 경로가 없어 기본 경로(NAT)로 나간다 → 인터넷으로 나가서 실패. “경로가 없다”가 아니라 <b>“엉뚱한 경로가 있다”</b>가 진짜 원인인 경우가 많다.</p>` : `<p style="margin:0">일치하는 경로를 모두 고른 뒤 접두사(/ 뒤 숫자)가 <b>가장 긴</b> 것을 선택. 0.0.0.0/0은 길이 0 → 항상 마지막 후보. 2주차 라우팅과 100% 같다.</p>`); } } },
    H.warn('라우팅 테이블에서 목적지가 여러 행에 해당하면 <b>더 구체적인(긴) 경로가 우선</b>한다 — 0.0.0.0/0처럼 넓은 경로가 우선한다는 것은 틀린 말.'),
  ] },

{ id: 'w9.public', title: 'Public Subnet의 3가지 조건 · Internet Gateway (1:1 변환)', slides: 'S16–S17',
  blocks: [
    { lab: { title: '“Public 서브넷인데 접속이 안 돼요” — 하나라도 빠지면', init: { rt: true, pip: false, sg: true, nacl: true, bind: true },
      ctl: [{ k: 'rt', type: 'toggle', label: '① 경로: RT에 0.0.0.0/0 → IGW' }, { k: 'pip', type: 'toggle', label: '② 공인 IP: Public IPv4 / EIP' }, { k: 'sg', type: 'toggle', label: '③ 문: SG 443 from 0.0.0.0/0' }, { k: 'nacl', type: 'toggle', label: '③ 문: NACL 허용' }, { k: 'bind', type: 'toggle', label: '앱이 0.0.0.0:443에서 listen' }],
      out: st => { let v;
        if (!st.rt) v = ['bad', '타임아웃', 'IGW 경로가 없다 → VPC 밖으로 나갈 길 자체가 없다 (응답도 못 나감).'];
        else if (!st.pip) v = ['bad', '접속할 주소가 없다', '사설 IP만 있으면 IGW가 변환해 줄 주소가 없다 → DNS에 등록할 공인 IP 자체가 없음.'];
        else if (!st.sg || !st.nacl) v = ['bad', '타임아웃', '길과 주소가 있어도 문이 닫혀 있으면 패킷이 조용히 버려진다.'];
        else if (!st.bind) v = ['bad', 'Connection refused', '길 · 문은 열림 — 서버까지 도착했지만 듣는 프로세스가 없다 (127.0.0.1 바인딩 등).'];
        else v = ['ok', '200 OK', '경로 + 공인 IP + 문 + 리스너 모두 OK.'];
        return `<div class="verdict ${v[0]}">${v[1]}</div><p style="margin:0">${v[2]}</p>`; } } },
    `<div class="pair"><div><h4 class="cok">Public 서브넷에 둔다 ○</h4>${lines(['Internet-facing Load Balancer (ALB · NLB)', 'NAT Gateway', 'Bastion (가능하면 대신 Session Manager)'])}</div><div><h4 class="cbad">두지 않는다 ✕</h4>${lines(['DB · 캐시(Redis) · 내부 API 서버', 'MQTT 브로커 자체 (앞에 NLB, 브로커는 Private)', '“일단 되게 하려고” 공인 IP를 붙인 앱 서버'])}</div></div>`,
    H.key('원칙: 인터넷에서 <b>직접</b> 받아야 하는 것만 Public에. 나머지는 Private에 두고 LB가 대신 받아서 전달한다.'),
    { trace: { mode: 'ladder', title: 'IGW — 인스턴스는 자기 공인 IP를 모른다', side: 110, rowH: 56,
      lanes: [{ id: 'e', label: 'EC2', sub: '사설 10.0.0.25' }, { id: 'g', label: 'Internet Gateway' }, { id: 'u', label: '사용자 브라우저', sub: '203.0.113.50' }],
      events: [
        { from: 'e', to: 'g', label: 'src 10.0.0.25', color: 'l3', pkt: [ip('10.0.0.25:443', '203.0.113.50:50123')], say: '서버 안에서 <code>ip addr</code>을 보면 10.0.0.25만 보인다.' },
        { from: 'g', to: 'u', label: 'src 3.35.10.20', color: 'l3', pkt: [ip('3.35.10.20:443', '203.0.113.50:50123')], say: 'IGW가 사설 ↔ 공인을 <b>1:1</b>로 바꾼다. <code>curl ifconfig.me</code> → 3.35.10.20.' },
        { from: 'u', to: 'g', label: 'dst 3.35.10.20', color: 'l3', pkt: [ip('203.0.113.50:50123', '3.35.10.20:443')], say: '1:1이라 <b>외부에서 먼저 들어오는 연결도 가능</b>하다 — 그만큼 문단속(SG)이 중요.' },
        { from: 'g', to: 'e', label: 'dst 10.0.0.25', color: 'l3', pkt: [ip('203.0.113.50:50123', '10.0.0.25:443')], say: '역변환해서 EC2로.' },
      ] } },
    H.cards([['IGW의 특징', 'VPC당 1개, AZ 장애와 무관 (리전 수준 관리형) · 대역폭 병목 · 비용 없음 · IPv6는 변환 없이 통과', ''], ['Public IP vs Elastic IP', '자동 Public IP: 인스턴스를 멈췄다 켜면 <b>바뀐다</b><br>Elastic IP: 계정에 <b>고정</b> — DNS · 화이트리스트에 등록할 주소<br>공인 IPv4는 보유 시간만큼 과금', 'L3'], ['2주차 연결', '공유기 NAT는 <b>N:1</b>(포트로 구분), IGW는 <b>1:1</b>.', 'L7']]),
    H.note('서버 안에서 보이는 주소(10.0.0.25)와 외부가 보는 주소(3.35.10.20)는 다르다 — 바인딩은 0.0.0.0, 공지 주소는 DNS 이름으로.'),
  ] },

{ id: 'w9.nat', title: 'Private Subnet과 NAT Gateway — 아웃바운드 전용', slides: 'S18–S19',
  blocks: [
    { trace: { title: 'Private 서버가 OpenAI API를 부를 때 — 출발지 IP가 두 번 바뀌고, 돌아올 때 거꾸로 두 번 복원', rowH: 90,
      nodes: [{ id: 'api', label: 'API 서버', sub: 'Private app-a · 10.0.10.5', icon: 'server', x: .04, y: 0 }, { id: 'nat', label: 'NAT Gateway', sub: 'Public · 10.0.0.8 + EIP', icon: 'router', x: .36, y: 0 }, { id: 'igw', label: 'IGW', sub: 'EIP 52.79.1.2', icon: 'globe', x: .64, y: 0 }, { id: 'oa', label: 'api.openai.com', sub: '104.18.x.x', icon: 'cloud', x: .96, y: 0 }, { id: 'h', label: '외부 해커', icon: 'user', x: .96, y: 1 }],
      links: [['api', 'nat', { label: '0.0.0.0/0 → nat' }], ['nat', 'igw'], ['igw', 'oa'], ['h', 'igw', { dash: true }]],
      tables: [{ id: 'map', title: 'NAT GW 매핑 테이블', cols: ['내부', '외부(NAT)'], rows: [] }],
      events: [
        { from: 'api', to: 'nat', label: '① 10.0.10.5:51544 → :443', color: 'l3', pkt: [ip('10.0.10.5 : 51544', '104.18.x.x : 443', [['누가 바꾸나', '(그대로)']])], say: 'private-rt의 기본 경로가 NAT GW를 가리킨다.' },
        { from: 'nat', to: 'igw', label: '② SNAT → 10.0.0.8:61001', color: 'l3', pkt: [ip('10.0.0.8 : 61001', '104.18.x.x : 443', [['누가 바꾸나', 'NAT GW (SNAT)']])], tables: { map: [['10.0.10.5:51544', '10.0.0.8:61001']] }, say: 'NAT GW가 출발지를 <b>자기 사설 IP + 새 포트</b>로 바꾸고 매핑을 기록한다 — 포트로 내부 연결을 구분하는 <b>N:1 NAT(PAT)</b>, 2주차 공유기와 같은 원리.' },
        { from: 'igw', to: 'oa', label: '③ EIP 1:1 → 52.79.1.2:61001', color: 'l3', pkt: [ip('52.79.1.2 : 61001', '104.18.x.x : 443', [['누가 바꾸나', 'IGW (EIP 1:1)']])], say: '외부(OpenAI)가 보는 주소는 <b>오직 52.79.1.2</b> — 서버가 몇 대든 NAT GW 하나의 EIP로 보인다 → 외부 API 화이트리스트에 EIP 하나만 등록하면 된다.' },
        { from: 'oa', to: 'igw', label: '④ 응답 → 52.79.1.2:61001', color: 'ok', pkt: [ip('104.18.x.x : 443', '52.79.1.2 : 61001')], say: '' },
        { from: 'igw', to: 'nat', label: '⑤ 1:1 역변환 → 10.0.0.8', color: 'ok', pkt: [ip('104.18.x.x : 443', '10.0.0.8 : 61001')], say: '' },
        { from: 'nat', to: 'api', label: '⑥ 매핑 조회 → 10.0.10.5:51544', color: 'ok', pkt: [ip('104.18.x.x : 443', '10.0.10.5 : 51544', [['누가 바꾸나', 'NAT GW (매핑 테이블)']])], say: '나간 연결의 응답은 매핑 덕분에 돌아온다.' },
        { from: 'h', to: 'igw', label: '외부 → 10.0.10.5 ?', color: 'bad', say: '<b>✕ 들어오는 경로 없음</b>. 외부에서 NAT를 거쳐 내부 서버로 <b>새 연결을 시작할 수는 없다</b> — 매핑 테이블에 없는 연결이니까.' },
      ] } },
    lines(['NAT GW는 <b>Public 서브넷에</b> 두고, Private RT가 그것을 가리킨다', 'NAT GW는 <b>AZ 단위(Zonal)</b> — AZ마다 하나씩 두어야 HA', '시간 요금 + 처리 GB당 요금 — 대용량 다운로드 주의']),
    H.warn('NAT GW는 연결을 바깥에서 시작할 수 없게 하는 장치이지 <b>방화벽이 아니다</b>. 나가는 트래픽 제어(어디로 나가도 되는가)는 SG 아웃바운드 · 방화벽이 맡는다.'),
    H.note('실제 클라우드에서 IGW 구간 변환은 내부적으로 처리되어 패킷 캡처에 두 단계가 모두 보이지는 않는다 — 원리 이해용 추적표.'),
  ] },

{ id: 'w9.endpoint', title: 'VPC Endpoint — 인터넷을 거치지 않는 지름길', slides: 'S20',
  blocks: [
    `<div class="pair"><div><h4 class="cbad">Endpoint 없이</h4><p class="mono">Private 서버 → NAT GW → IGW → S3<br><small class="cm">인터넷 경유 · NAT GB 과금</small></p></div><div><h4 class="cok">Endpoint로</h4><p class="mono">Private 서버 → VPC Endpoint → S3<br><small class="cm">AWS 내부망으로 직행</small></p></div></div>`,
    T(['종류', '동작 방식', '대상', '비용', '설정 위치'], [['<b>Gateway Endpoint</b>', 'Route Table에 prefix list → vpce 경로 추가', 'S3 · DynamoDB만', '<b>무료</b>', 'Route Table'], ['<b>Interface Endpoint</b> (PrivateLink)', '서브넷에 ENI(사설 IP) 생성, DNS가 그 IP로 응답', '대부분의 AWS 서비스 · 타사', '시간 + GB 과금', 'Subnet + SG + DNS']]),
    H.key('언제 쓰나 — S3로 대용량 로그 · 모델 파일 업로드, 외부로 아예 못 나가는 Isolated 서브넷. 수 GB짜리 모델 가중치를 S3에서 받는 서버라면 Gateway Endpoint 하나로 NAT 처리 비용이 0 — 비용 · 보안 · 속도를 동시에 개선.'),
  ] },

{ id: 'w9.sg', title: 'Security Group — 인스턴스의 Stateful 방화벽', slides: 'S21',
  blocks: [
    T(['SG', '프로토콜 · 포트', 'Source', '의미'], [['alb-sg', 'TCP 443', '0.0.0.0/0', '누구나 HTTPS 접속'], ['alb-sg', 'TCP 80', '0.0.0.0/0', '→ 443 리다이렉트용'], ['app-sg', 'TCP 8000', '<b>sg-alb</b>', 'ALB에서 온 것만'], ['db-sg', 'TCP 5432', '<b>sg-app</b>', '앱 서버에서 온 것만'], ['broker-sg', 'TCP 8883', 'sg-nlb · 기기 대역', 'IoT 기기 MQTT over TLS']], { mono: [0, 1, 2] }),
    H.cards([['기본 동작', '인바운드: <b>전부 거부</b>에서 시작<br>아웃바운드: 기본 전부 허용<br><b>Allow 규칙만</b> — 규칙은 OR (하나라도 맞으면 허용)', ''], ['Stateful', '허용된 요청의 <b>응답은 자동 허용</b> — 응답용 규칙(임시 포트)을 따로 만들 필요 없다', 'L3'], ['SG 참조 (Chaining)', 'Source에 IP 대신 다른 SG ID → “app-sg를 단 모든 인스턴스”. 서버가 늘고 IP가 바뀌어도 규칙 그대로', 'L7']]),
    H.warn('안티패턴: 0.0.0.0/0 → 22 (SSH) · 3306 · 5432 · 6379 · “일단 All traffic 허용” · 하나의 SG를 모든 서버가 공유. 인터넷에 22번을 열면 몇 분 안에 무차별 로그인 시도가 들어온다 → 관리 접속은 Session Manager나 특정 IP(/32)로만.'),
  ] },

{ id: 'w9.state', title: 'Stateful vs Stateless — 도어락과 경비원 · NACL 규칙', slides: 'S22–S23',
  blocks: [
    `<div class="pair"><div><h4>Security Group = 똑똑한 도어락 (Stateful)</h4>${lines(['손님(요청)이 들어올 때 명단 확인', '들어온 손님이 나갈 때(응답)는 <b>기억</b>하고 있어 그냥 열어 준다', '→ 인바운드 443만 허용하면 응답은 자동 통과'])}</div><div><h4>NACL = 기억 못 하는 경비원 (Stateless)</h4>${lines(['들어오는 사람 · 나가는 사람을 <b>각각 따로</b> 명부와 대조', '방금 들어간 손님이 나와도 처음 보는 사람 취급', '→ 응답이 나가는 <b>임시 포트(1024–65535) 아웃바운드도</b> 허용해야'])}</div></div>`,
    { lab: { title: '같은 HTTPS 요청 하나가 SG와 NACL을 지날 때', init: { sgin: true, nin: true, nout: false },
      ctl: [{ k: 'sgin', type: 'toggle', label: 'SG 인바운드 443 허용' }, { k: 'nin', type: 'toggle', label: 'NACL 인바운드 443 허용' }, { k: 'nout', type: 'toggle', label: 'NACL 아웃바운드 1024–65535 허용' }],
      out: st => { const reqOK = st.nin && st.sgin, resOK = reqOK && st.nout;
        const rows = [['203.0.113.50:50123 → 10.0.0.30:443 (요청)', '인바운드', st.sgin ? '443 허용 → <b class="cok">통과</b>, 연결 기억' : '<b class="cbad">차단</b>', st.nin ? '443 허용? → <b class="cok">통과</b>' : '<b class="cbad">차단</b>'], ['10.0.0.30:443 → 203.0.113.50:50123 (응답)', '아웃바운드', reqOK ? '기억된 연결의 응답 → <b class="cok">자동 통과</b>' : '—', reqOK ? (st.nout ? '50123번 허용? → <b class="cok">통과</b>' : '<b class="cbad">50123번 규칙 없음 → 차단!</b>') : '—']];
        return T(['패킷', '방향', 'SG 검사', 'NACL 검사'], rows, { mono: [0] }) + `<div class="verdict ${resOK ? 'ok' : 'bad'}">${resOK ? '200 OK' : '타임아웃'}</div><p style="margin:0">${resOK ? 'SG는 응답을 기억해 통과시키고, NACL은 아웃바운드 임시 포트 규칙으로 통과.' : reqOK ? '<b>가장 흔한 사고</b> — 요청은 들어오는데(Flow Logs 인바운드 ACCEPT) 응답이 못 나가 타임아웃만 보인다. Custom NACL에 아웃바운드 임시 포트를 빠뜨렸다.' : '요청 단계에서 막혔다.'}</p>`; } } },
    H.note('임시 포트(Ephemeral port): 클라이언트 OS가 연결마다 임의로 고르는 출발 포트 (3주차의 소켓). 리눅스 기본 32768–60999, NACL에는 보통 1024–65535를 연다.'),
    { h3: 'Network ACL — 번호가 작은 것부터, 처음 일치한 규칙으로 (S23)' },
    { lab: { title: 'NACL 인바운드 평가기', init: { src: '198.51.100.7', port: '443' },
      ctl: [{ k: 'src', type: 'text', label: '출발지 IP', w: 150 }, { k: 'port', type: 'text', label: '목적지 포트', w: 80 }, { type: 'btns', items: [['198.51.100.7', '443'], ['203.0.113.9', '443'], ['203.0.113.9', '22'], ['104.18.1.1', '61001']].map(([a, b]) => ({ label: `${a}:${b}`, act: st => { st.src = a; st.port = b; } })) }],
      out: st => { const a = IP.parse(st.src), p = +st.port; if (a == null || !(p >= 0)) return '<span class="err">IP와 포트를 확인</span>'; let hit = -1;
        NACL_IN.forEach((r, i) => { if (hit < 0 && portIn(r[1], p) && inCIDR(a, parseCIDR(r[2]))) hit = i; });
        return T(['Rule #', 'Port', 'Source', 'Allow/Deny', '평가'], NACL_IN.map((r, i) => [String(r[0]), r[1], r[2], r[3] === 'DENY' ? `<b class="cbad">${r[3]}</b>` : `<b class="cok">${r[3]}</b>`, i < hit ? '불일치 → 다음' : i === hit ? '<b>← 첫 일치, 여기서 결정</b>' : '(검사 안 함)']), { mono: [0, 1, 2], hl: (r, i) => i === hit }) +
          `<div class="verdict ${NACL_IN[hit][3] === 'ALLOW' ? 'ok' : 'bad'}">${NACL_IN[hit][3]}${NACL_IN[hit][4] ? ' — ' + NACL_IN[hit][4] : ''}</div>${hit === 0 && p === 443 ? '<p style="margin:0">#90이 먼저 검사되므로 이 대역의 443 요청은 #100에 닿기 전에 거부된다. 번호를 10 간격으로 두면 사이에 끼워 넣기 쉽다.</p>' : ''}`; } } },
    H.cards([['기본값', '<b>Default NACL: 모두 허용</b> (그래서 보통 SG만 신경 씀)<br>새로 만든 <b>Custom NACL: 모두 거부</b>에서 시작', ''], ['언제 쓰나', '특정 IP 대역 차단(Deny), 서브넷 단위의 굵은 경계 · 규정 준수. 세밀한 허용은 SG로.', 'L3']]),
  ] },

{ id: 'w9.sgnacl', title: 'SG vs NACL — 다층 방어 · SG Chaining 3-tier', slides: 'S24–S25',
  blocks: [
    T(['항목', 'Security Group', 'Network ACL'], [['적용 단위', '<b>ENI</b> (인스턴스 · LB · RDS)', '<b>Subnet</b>'], ['상태', '<b>Stateful</b> — 응답 자동 허용', '<b>Stateless</b> — 양방향 각각'], ['규칙 종류', 'Allow만', 'Allow + Deny'], ['평가', '모든 규칙 OR', '번호 순 · 첫 일치'], ['Source 지정', 'CIDR · 다른 SG · prefix list', 'CIDR만'], ['기본값', '인바운드 거부 · 아웃바운드 허용', 'Default: 모두 허용'], ['주 용도', '세밀한 서비스 간 허용', '대역 차단 · 굵은 경계']]),
    H.key('패킷은 <b>NACL(서브넷 문) → SG(인스턴스 문)</b> 순으로 두 번 검사받는다. 단, 같은 서브넷의 EC2 A ↔ B 통신은 NACL을 거치지 않고 SG만 — NACL은 서브넷 <b>“경계”</b>를 넘을 때만 적용된다.'),
    { h3: 'SG Chaining — 각 계층은 바로 앞 계층의 SG에서 온 것만 (S25)' },
    { fig: `<div class="hflow">${[['Internet', '0.0.0.0/0'], ['ALB · alb-sg', '443 from 0.0.0.0/0'], ['API · app-sg', '8000 from <b>alb-sg</b>'], ['PostgreSQL · db-sg', '5432 from <b>app-sg</b>']].map(([a, b]) => `<div class="fl-step"><span><b>${a}</b><br><small>${b}</small></span></div>`).join('<span class="fl-arr">→</span>')}</div>`, cap: 'IP 주소는 한 번도 등장하지 않는다.' },
    { lab: { title: '공격자가 시도한다면?', init: { a: 'db' },
      ctl: [{ k: 'a', type: 'select', label: '시도', opts: [['db', '인터넷 → DB 5432 직접'], ['api', '인터넷 → API 8000 직접 (ALB 우회)'], ['own', '장악된 API 서버 → DB 5432'], ['scale', 'Auto Scaling으로 API 2 → 10대']] }],
      out: st => { const v = { db: ['bad', '차단', 'DB는 Private 서브넷 + db-sg는 app-sg만 허용 — 경로도 문도 없다.'], api: ['bad', '차단', 'app-sg는 alb-sg만 허용 — ALB를 우회할 수 없다.'], own: ['', '허용', '정상 경로이기도 하다 → DB 계정 권한 · 암호화로 2차 방어 (Defense in Depth).'], scale: ['ok', '규칙 수정 0', 'SG 참조라 새 서버도 app-sg만 달면 자동으로 DB에 접근 가능. IP를 하드코딩했다면 교체 · 재배포 때마다 깨진다. 규칙 자체가 아키텍처 문서가 된다.'] }[st.a];
        return `<div class="verdict ${v[0]}">${v[1]}</div><p style="margin:0">${v[2]}</p>`; } } },
    H.warn('AI가 만든 Terraform에서 가장 먼저 볼 곳: <code>cidr_blocks = ["0.0.0.0/0"]</code>가 ALB가 아닌 SG에 들어 있는가? 있다면 그 줄이 보안 사고의 입구다.'),
  ] },

{ id: 'w9.access', title: 'Private 서버에는 어떻게 접속하나? — 22번을 열지 않는 방법', slides: 'S26',
  blocks: [
    T(['방법', '구조', '장점', '주의'], [['Bastion Host', 'Public 서브넷의 점프 서버에 SSH → 다시 Private 서버로 SSH', '익숙하고 단순', 'Bastion 자체가 공격 대상 · 키 관리 · 22번 노출'], ['<b>Session Manager (SSM)</b>', '에이전트가 <b>바깥(AWS API)으로</b> 연결을 열고, 콘솔/CLI가 그 연결로 셸 접속', '<b>인바운드 포트 0개</b> · IAM으로 권한 · 접속 로그 자동', 'SSM 에이전트 · IAM 역할 · NAT 또는 Endpoint 필요'], ['VPN / Client VPN', '노트북을 VPC 네트워크에 붙여 사설 IP로 직접', '여러 서버 · DB 툴 사용에 편함', 'VPN 서버 운영 · CIDR 충돌 주의']]),
    H.pre('$ aws ssm start-session --target i-0abc123def456     # 22번 포트 없이 Private 서버 셸 접속'),
    H.key('7주차의 “기기가 바깥으로 연결을 열어 두는” 패턴과 같다 — SSM 에이전트는 MQTT 센서처럼 안쪽에서 바깥으로 연결한다. 그래서 인바운드 규칙이 필요 없다.'),
  ] },

{ id: 'w9.lb', title: 'Load Balancer — Public에서 받아 Private으로 나눠 주기', slides: 'S27',
  blocks: [
    { trace: { title: 'LB만 인터넷에 노출하고, 실제 서버는 Private 서브넷에', rowH: 72,
      nodes: [{ id: 'u', label: '사용자', icon: 'user', x: .03, y: 1 }, { id: 'lb', label: 'ALB', sub: 'Public a · c 두 AZ에 노드', icon: 'lb', x: .32, y: 1 }, { id: 'a1', label: 'API #1', sub: 'app-a', icon: 'server', x: .7, y: 0 }, { id: 'a2', label: 'API #2', sub: 'app-a', icon: 'server', x: .7, y: 1 }, { id: 'a3', label: 'API #3', sub: 'app-c', icon: 'server', x: .7, y: 2 }, { id: 'a4', label: 'API #4 ✕', sub: 'Health check 실패', icon: 'server', x: .7, y: 3 }],
      links: [['u', 'lb', { label: 'HTTPS 443' }], ['lb', 'a1'], ['lb', 'a2'], ['lb', 'a3'], ['lb', 'a4', { dash: true }]],
      events: [
        { from: 'lb', to: 'a4', label: 'GET /health → 500', color: 'bad', say: 'Target Group의 Health Check: <code>GET /health</code>가 2xx면 정상. 연속 실패 시 대상에서 <b>제외</b>한다.' },
        { from: 'u', to: 'lb', label: '요청 1', color: 'l7', say: '사용자는 대표 주소(ALB DNS) 하나로만 접속한다.' },
        { from: 'lb', to: 'a1', label: '→ #1', color: 'ok', say: '정상 서버로만 나눠 보낸다.' },
        { from: 'lb', to: 'a3', label: '→ #3', color: 'ok', say: '#4는 건너뛴다. 회복되면 다시 넣는다 → 뒤의 서버를 늘리거나 교체해도 사용자는 같은 주소로 계속 접속.' },
      ] } },
    T(['', 'ALB', 'NLB'], [['계층', '<b>L7</b> (HTTP · HTTPS)', '<b>L4</b> (TCP · UDP · TLS)'], ['라우팅', '경로 · 호스트 · 헤더', '포트 기준'], ['TLS', 'LB에서 종료 (4주차)', '통과 또는 종료'], ['고정 IP', '없음 (DNS 이름)', 'AZ별 고정 IP · EIP'], ['적합', 'REST · WebSocket · SSE', 'MQTT · 게임 · 초저지연']]),
    H.note('7주차 연결: WebSocket · SSE는 ALB에서 그대로 동작하지만 유휴 타임아웃(기본 60초)을 heartbeat보다 길게 맞춰야 한다. MQTT(8883)는 보통 NLB 뒤에.'),
  ] },

{ id: 'w9.ha', title: 'High Availability — Multi-AZ와 가용성 숫자', slides: 'S28–S29',
  blocks: [
    T(['', 'AZ a', 'AZ c'], [['Public', 'ALB 노드 · NAT GW', 'ALB 노드 · NAT GW'], ['App', 'API × 2 (Auto Scaling)', 'API × 2 (Auto Scaling)'], ['DB', 'RDS Primary', 'RDS Standby (동기 복제)'], ['Route', 'private-rt-a → <b>같은 AZ의 NAT</b>', 'private-rt-c → <b>같은 AZ의 NAT</b>']]),
    H.cards([['AZ a 장애 시', 'ALB는 c 노드로만 보냄 → API c가 처리 → RDS Standby 자동 승격 (수십 초~수 분)', ''], ['NAT를 AZ마다 두는 이유', 'NAT GW가 AZ a에만 있으면 AZ a 장애 때 c의 서버도 외부 호출 불가 (<b>단일 장애점</b>). 같은 AZ끼리 → AZ 간 전송 요금도 절약', 'L3'], ['N+1 용량', 'AZ 하나가 죽어도 남은 쪽이 전체 트래픽을 감당해야 한다 (평소 50% 이하 사용)', 'L7']]),
    H.warn('Multi-AZ는 공짜가 아니다: NAT 2개 · 서버 2배 · DB Standby · AZ 간 전송 요금. 어떤 계층까지 이중화할지가 설계 결정.'),
    { lab: { title: '가용성 계산기 — 9가 하나 늘면', init: { az: 99.5, n: 2, lb: 99.99, api: 99.9, db: 99.95 },
      ctl: [{ k: 'az', type: 'range', label: 'AZ 하나의 가용성', unit: '%', min: 95, max: 99.99, step: 0.01 }, { k: 'n', type: 'range', label: '독립 AZ 수', min: 1, max: 3 }, { k: 'lb', type: 'num', label: 'LB', unit: '%', min: 90, max: 100 }, { k: 'api', type: 'num', label: 'API', unit: '%', min: 90, max: 100 }, { k: 'db', type: 'num', label: 'DB', unit: '%', min: 90, max: 100 }],
      out: st => { const f = 1 - st.az / 100, par = 1 - f ** st.n, ser = st.lb / 100 * st.api / 100 * st.db / 100; const yr = x => { const m = (1 - x) * 365 * 24 * 60; return m >= 1440 ? (m / 1440).toFixed(2) + '일' : m >= 60 ? (m / 60).toFixed(1) + '시간' : m >= 1 ? m.toFixed(1) + '분' : (m * 60).toFixed(0) + '초'; };
        return T(['구성', '계산', '가용성', '연간 중단'], [[`AZ 1개`, `${st.az}%`, pct(st.az / 100), yr(st.az / 100)], [`<b>병렬</b> — AZ ${st.n}개에 복제`, `1 − ${f.toFixed(4)}^${st.n}`, `<b>${pct(par)}</b>`, `<b>${yr(par)}</b>`], ['<b>직렬</b> — LB × API × DB', `${st.lb} × ${st.api} × ${st.db}`, pct(ser, 3), yr(ser)]]) +
          `<p style="margin:0">병렬(복제)은 실패 확률을 <b>곱해서 줄이고</b>, 직렬 체인은 가용성을 <b>곱해서 낮춘다</b> — 체인이 길수록 전체는 가장 약한 고리보다 낮아진다. 함정: 실제 장애는 완전히 독립이 아니다 (같은 배포 실수 · 같은 설정 오류 · 리전 공통 장애).</p>`; } } },
    T(['가용성', '연간 허용 중단', '월간 허용 중단'], [['99%', '3.65일', '약 7.3시간'], ['99.9%', '8.76시간', '약 43.8분'], ['99.95%', '4.38시간', '약 21.9분'], ['99.99%', '52.6분', '약 4.4분'], ['99.999%', '5.26분', '약 26초']]),
    H.key('<b>SLA</b>(Service Level Agreement)는 클라우드사가 약속한 가용성. 우리 서비스의 가용성은 <b>우리 설계</b>가 결정한다 — 단일 AZ에 서버 1대라면 SLA는 의미가 없다.'),
  ] },

{ id: 'w9.connect', title: 'VPC 밖과 연결하기 · VPC 안의 DNS', slides: 'S30–S31',
  blocks: [
    T(['방식', '구조', '장점', '주의'], [['<b>VPC Peering</b>', 'VPC 2개를 1:1 직결', '단순 · 추가 홉 없음 · 저렴', '<b>비전이(non-transitive)</b>: A–B, A–C 연결해도 B→C 불가 · CIDR 겹치면 불가 · N(N−1)/2'], ['<b>Transit Gateway</b>', '허브 하나에 여러 VPC · VPN', '중앙 관리 · 전이 라우팅', '연결 · GB당 과금'], ['Site-to-Site VPN', '온프레미스 ↔ VPC IPsec 터널', '빠른 구축 · 저렴', '인터넷 품질 · 대역폭 한계'], ['Direct Connect', '전용 회선', '안정적 지연 · 대역폭', '구축 기간 · 비용']]),
    H.key('모든 방식의 공통 전제: <b>CIDR이 겹치지 않을 것</b>. dev · stage · prod 대역을 나눈 이유(9.6). VPC 2~3개면 Peering, 그 이상은 TGW.'),
    { h3: 'VPC 안의 DNS — 이름으로 찾고, 사설 IP로 연결 (S31)' },
    { trace: { mode: 'ladder', title: 'DB Failover 후 DNS가 Standby IP로 바뀐다', side: 100, rowH: 50,
      lanes: [{ id: 'a', label: 'API 서버' }, { id: 'r', label: 'VPC Resolver', sub: '10.0.0.2' }, { id: 'd', label: 'RDS' }],
      events: [
        { from: 'a', to: 'r', label: 'mydb.abc…rds.amazonaws.com ?', color: 'l7', say: '서버 설정에는 IP가 아니라 <b>DNS 이름</b>을 쓴다 (4주차).' },
        { from: 'r', to: 'a', label: '10.0.20.37 (사설 IP)', color: 'ok', say: 'VPC Resolver는 VPC CIDR +2. 사설 · 공용 이름 모두 응답.' },
        { from: 'a', to: 'd', label: 'TCP 10.0.20.37:5432', color: 'l4', say: 'local 경로 · db-sg 5432 ← app-sg.' },
        { from: 'd', to: 'd', label: '⚡ Failover — Standby 승격', color: 'bad', say: 'AZ a 장애.' },
        { from: 'a', to: 'r', label: '다시 조회 (TTL 만료 후)', color: 'l7', say: '앱의 DNS 캐시 TTL이 너무 길면 Failover가 늦어진다.' },
        { from: 'r', to: 'a', label: '10.0.21.44 (새 Primary)', color: 'ok', say: '이름은 그대로, IP만 바뀌었다 → 설정 변경 없이 따라간다.' },
      ] } },
    T(['요소', '역할'], [['VPC Resolver', 'VPC CIDR +2 주소의 DNS. 사설 · 공용 이름 모두 응답'], ['Private Hosted Zone', 'api.internal 같은 VPC 전용 도메인'], ['enableDnsHostnames', '인스턴스에 DNS 이름 부여 (켜 두기)'], ['Split-horizon', '같은 이름이 VPC 안/밖에서 다른 IP로 응답']]),
    H.note('디버깅: 서버에서 <code>dig mydb...rds.amazonaws.com</code>이 사설 IP를 주는가? 공인 IP가 나온다면 DNS 설정(VPC 밖 Resolver 사용 등)이 잘못된 것.'),
  ] },

{ id: 'w9.arch', title: 'Architecture View — 3-tier on VPC · 요청 하나의 여행', slides: 'S32–S34',
  blocks: [
    T(['SG', 'Inbound'], [['alb', '443 ← 0.0.0.0/0'], ['api', '8000 ← alb'], ['broker', '8883 ← nlb'], ['rds', '5432 ← api'], ['redis', '6379 ← api']], { mono: [1] }),
    T(['Route', '대상'], [['public', '→ IGW'], ['private-a', '→ NAT-a'], ['private-c', '→ NAT-c'], ['db', '→ local only']], { mono: [1] }),
    { trace: { title: '“AI 요약 버튼”을 눌렀을 때', sub: '사용자 → ALB(Public) → API(Private) → DB(Private), 외부 호출은 NAT로', rowH: 86,
      nodes: [{ id: 'u', label: '사용자', icon: 'user', x: .03, y: 0 }, { id: 'dns', label: 'Route 53', icon: 'dns', x: .03, y: 1 }, { id: 'igw', label: 'IGW', icon: 'globe', x: .22, y: 0 }, { id: 'alb', label: 'ALB', sub: 'alb-sg · Public', icon: 'lb', x: .42, y: 0 }, { id: 'api', label: 'API', sub: 'app-sg · Private', icon: 'server', x: .62, y: 0 }, { id: 'db', label: 'RDS', sub: 'db-sg · Private DB', icon: 'db', x: .62, y: 1 }, { id: 'nat', label: 'NAT-a', icon: 'router', x: .82, y: 1 }, { id: 'oa', label: 'api.openai.com', icon: 'cloud', x: .97, y: 0 }],
      links: [['u', 'igw'], ['u', 'dns', { dash: true }], ['igw', 'alb'], ['alb', 'api'], ['api', 'db'], ['api', 'nat'], ['nat', 'oa']],
      events: [
        { from: 'u', to: 'dns', label: '① DNS 조회', color: 'l7', say: 'api.myservice.kr → ALB의 공인 IP들. <b>끊으면</b>: 이름 해석 실패.' },
        { from: 'u', to: 'igw', label: '② IGW 통과', color: 'l3', say: '공인 IP → ALB 노드의 사설 IP로 변환, public 서브넷 진입.' },
        { from: 'igw', to: 'alb', label: '③ alb-sg 443 · TLS 종료', color: 'l4', say: '443 허용 확인 → TLS 종료 → 건강한 API 대상 선택. <b>끊으면</b>: 타임아웃.' },
        { from: 'alb', to: 'api', label: '④ app-sg: 8000 ← alb-sg', color: 'l4', say: 'SG chaining. <b>끊으면</b>(app-sg가 alb-sg 미허용 · Health check 실패): <b>502</b>.' },
        { from: 'api', to: 'db', label: '⑤ 10.0.20.37:5432', color: 'l4', say: 'rds DNS → 사설 IP · db-sg 5432 ← app-sg · local 경로.' },
        { from: 'api', to: 'nat', label: '⑥ 0.0.0.0/0 → NAT-a', color: 'l3', say: '외부 AI API 호출 — src = NAT의 EIP. <b>끊으면</b>: API 서버 로그에 외부 호출 타임아웃.' },
        { from: 'nat', to: 'oa', label: 'api.openai.com', color: 'l3', say: '' },
        { from: 'oa', to: 'nat', label: '⑦ 응답 귀환 (Stateful · 매핑)', color: 'ok', say: 'NAT 매핑으로 API 서버에 복귀 → 결과 JSON → ALB → 사용자. 증상이 단계마다 다르다 — 이것이 클라우드 네트워크 디버깅의 전부.' },
      ] } },
    { h3: '7주차 실시간 · IoT 시스템을 VPC에 배치하기 (S34)' },
    T(['구성요소', '위치', '앞단', 'SG 인바운드', '이유'], [['IoT 센서 (ESP32)', 'VPC 밖 (교실 Wi-Fi)', '—', '—', '인터넷 너머에서 브로커로 접속'], ['MQTT 브로커', 'Private App', 'NLB (Public)', '8883 ← nlb-sg / 기기 대역', '브로커에 공인 IP 직접 부여 X · TLS 필수'], ['MQTT→SSE 브리지', 'Private App', 'ALB (Public)', '8000 ← alb-sg', '브라우저는 /events로만'], ['대시보드 정적 파일', 'S3 + CDN', '—', '—', '같은 도메인 /api로 CORS 회피 (5주차)'], ['시계열 DB', 'Private DB', '—', '5432 ← bridge-sg', '인터넷 비노출'], ['<b>WebRTC TURN 서버</b>', '<b>Public</b>', '—', '3478 UDP/TCP · 릴레이 포트', 'P2P 실패 시 중계 — 공인 IP가 본질적으로 필요']]),
    H.note('ALB 유휴 타임아웃 ≥ SSE heartbeat 주기 · NLB의 TCP 유휴 타임아웃 ≥ MQTT keepalive × 1.5. TURN 서버처럼 “Public에 있어야만 하는” 예외를 이유와 함께 적을 수 있으면 설계를 이해한 것.'),
  ] },

{ id: 'w9.choice', title: 'Design Choice · 네트워크 비용 감각', slides: 'S35–S36',
  blocks: [
    T(['결정', '선택지 A', '선택지 B', '판단 기준'], [['외부 호출 경로', 'NAT Gateway (관리형)', 'NAT Instance / Endpoint', '트래픽 적고 실습이면 Endpoint · 운영은 NAT GW'], ['NAT 개수', 'AZ마다 1개', '1개 공유', '가용성 우선 → AZ별 · 비용 · 실습 → 1개'], ['서버 노출', 'LB 뒤 Private', '공인 IP 직접', '거의 항상 A. 예외: TURN · 일부 게임 서버'], ['접근 제어', 'SG 중심 (+ SG 참조)', 'NACL 중심', '세밀한 허용은 SG · 대역 차단은 NACL'], ['관리 접속', 'Session Manager', 'Bastion + SSH', '인바운드 0개가 가능하면 A'], ['VPC 연결', 'Peering', 'Transit Gateway', 'VPC 2~3개면 Peering · 그 이상은 TGW'], ['AWS 서비스 접근', 'Gateway/Interface Endpoint', 'NAT 경유', '대용량 S3 · 격리 서브넷 → Endpoint'], ['가용 영역', 'Multi-AZ', 'Single-AZ', '운영 → Multi · 개발 · 실습 → Single']]),
    H.key('Design Sheet에는 “무엇을 골랐나”보다 <b>“왜 다른 것을 버렸나”</b>를 적는다 — 그것이 설계 문서다.'),
    T(['비용 항목', '과금 방식', '주의'], [['NAT Gateway', '시간당 + 처리 GB당', 'AZ별 2개 × 24시간 × 30일. 대용량 다운로드가 NAT를 지나면 GB 요금이 더 커진다'], ['공인 IPv4 · EIP', '보유 시간당', '쓰지 않고 잡아 둔 EIP도 과금 → 실습 후 Release'], ['데이터 전송', '인터넷으로 나가는 GB · AZ 간 GB', '들어오는 트래픽은 보통 무료'], ['Load Balancer', '시간당 + 사용량 단위(LCU)', '트래픽이 없어도 켜져 있으면 과금'], ['Interface Endpoint', 'AZ별 시간당 + GB당', 'Gateway Endpoint(S3 · DynamoDB)는 무료']]),
    H.warn('실습 체크리스트: NAT GW 삭제 → EIP Release → LB 삭제 → 인스턴스 종료 · Terraform이면 <code>terraform destroy</code> 한 번. 결제 알림(Budget)도 설정.'),
  ] },

{ id: 'w9.trouble', title: 'Common Failure Modes · 바깥에서 안쪽으로 한 겹씩', slides: 'S37–S38',
  blocks: [
    T(['증상', '흔한 원인', '확인 위치'], [['Public 서버인데 브라우저에서 타임아웃', 'IGW 경로 없음 · 공인 IP 없음 · SG 443 미허용', 'Route Table → Public IP → SG'], ['Private 서버에서 pip install / apt 실패', 'NAT 경로 없음 · <b>NAT GW가 Private 서브넷에 있음</b>', 'private-rt의 0.0.0.0/0 · NAT의 서브넷'], ['요청은 들어오는데 응답이 안 감 (타임아웃)', 'Custom NACL에 아웃바운드 임시 포트 누락', 'NACL Outbound 1024–65535'], ['Connection refused (즉시 실패)', '길 · 문은 열림, 앱이 포트를 안 듣거나 127.0.0.1 바인딩', '서버에서 ss -ltnp (3주차)'], ['ALB 502 / 503', '대상 Health check 실패 · app-sg가 alb-sg 미허용', 'Target Group 상태 · SG 참조'], ['DB 연결 타임아웃', 'db-sg Source가 app-sg가 아님 · 다른 VPC/서브넷', 'db-sg Inbound · Flow Logs REJECT'], ['Peering했는데 통신 불가', '양쪽 RT 미추가 · CIDR 겹침 · 3단계 경유(비전이)', '양쪽 RT · CIDR 표'], ['배포 중 IP 부족 오류', '/28 등 작은 서브넷 · 예약 5개 미고려', '서브넷 Available IPv4 수'], ['AZ 하나 장애 시 전체 외부 호출 실패', 'NAT GW를 한 AZ에만 둠', 'AZ별 private-rt 대상 NAT']]),
    H.key('<b>타임아웃 vs Refused</b>가 첫 단서: 타임아웃 = 중간(경로 · SG · NACL)에서 패킷이 사라짐 · Refused = 서버까지 도착했지만 듣는 프로세스가 없음.'),
    { lab: { title: '어느 겹에서 멈췄나 — 증상으로 좁히기', init: { s: 'nctime' },
      ctl: [{ k: 's', type: 'select', label: '관찰', opts: [['dig', 'dig가 공인 IP를 준다'], ['nctime', 'nc -zv db 5432 → 타임아웃'], ['ncref', 'nc -zv api 8000 → refused'], ['ext', 'curl 외부 실패 + 내부 성공'], ['502', 'ALB가 502']] }],
      out: st => { const L = ['DNS', 'Route Table', 'NACL', 'Security Group', 'OS · 리스너', 'Application']; const m = { dig: [0, 'DNS 설정 — VPC 밖 Resolver를 쓰고 있다'], nctime: [3, '경로 · SG · NACL 중 하나 (보통 db-sg Source) — Flow Logs에서 REJECT 확인'], ncref: [4, '리스너 — ss -ltnp로 0.0.0.0:8000 바인딩 확인'], ext: [1, 'NAT 경로 — private-rt의 0.0.0.0/0 → nat, NAT가 Public 서브넷에 있는지'], '502': [5, 'Target Health check · app-sg가 alb-sg 허용하는지'] }[st.s];
        return `<div class="hflow">${L.map((x, i) => `<div class="fl-step" style="${i === m[0] ? 'outline:2px solid var(--bad)' : 'opacity:.6'}"><b>${i + 1}</b><span>${x}</span></div>`).join('<span class="fl-arr">→</span>')}</div><p style="margin:0">${m[1]}</p>`; } } },
    H.pre(`# 서버 안에서 (Session Manager로 접속)
$ curl -sv https://api.openai.com -o /dev/null   # 외부 호출(NAT) 확인
$ nc -zv mydb.abc.rds.amazonaws.com 5432         # DB 포트 도달?
$ dig +short mydb.abc.rds.amazonaws.com          # 사설 IP?
$ ss -ltnp | grep 8000                           # 앱이 듣는 주소
$ ip route                                       # 기본 게이트웨이 = .1`),
    H.note('Reachability Analyzer — 출발지 · 목적지를 지정하면 Route · SG · NACL을 설정만으로 분석해 “어느 규칙에서 막히는지” 알려 준다 (패킷을 보내지 않음).'),
  ] },

{ id: 'w9.flow', title: 'VPC Flow Logs 읽기 — VPC의 “통화 기록”', slides: 'S39',
  blocks: [
    { lab: { title: 'Flow Log 한 줄 해부', init: { l: '2 123456789012 eni-0d4e5f 10.0.10.5 10.0.20.37 51544 5432 6 3 180 1731830400 1731830460 REJECT OK' },
      ctl: [{ k: 'l', type: 'text', label: '로그 (version 2)', w: 560 }, { type: 'btns', items: [{ label: '1번째 줄 (ACCEPT)', act: st => st.l = '2 123456789012 eni-0a1b2c 203.0.113.50 10.0.0.30 50123 443 6 12 3120 1731830400 1731830460 ACCEPT OK' }, { label: '2번째 줄 (REJECT)', act: st => st.l = '2 123456789012 eni-0d4e5f 10.0.10.5 10.0.20.37 51544 5432 6 3 180 1731830400 1731830460 REJECT OK' }] }],
      out: st => { const f = st.l.trim().split(/\s+/); if (f.length < 14) return '<span class="err">필드 14개가 필요하다</span>';
        const proto = { 6: 'TCP', 17: 'UDP', 1: 'ICMP' }[f[7]] || f[7]; const t0 = new Date(+f[10] * 1000), t1 = new Date(+f[11] * 1000);
        const rows = [['version · account · interface', `${f[0]} · ${f[1]} · ${f[2]}`, '어느 ENI(어느 서버)의 기록인가'], ['srcaddr → dstaddr', `${f[3]} → ${f[4]}`, ''], ['srcport → dstport', `${f[5]} → ${f[6]}`, +f[5] >= 1024 ? '임시 포트 → 서비스 포트' : ''], ['protocol', `${f[7]}`, `${proto} (6 = TCP, 17 = UDP, 1 = ICMP)`], ['packets · bytes', `${f[8]} · ${f[9]}`, '집계 구간 동안의 양'], ['start · end', `${f[10]} · ${f[11]}`, `${Math.round((t1 - t0) / 1000)}초 구간 (Unix time)`], ['action', `<b class="${f[12] === 'ACCEPT' ? 'cok' : 'cbad'}">${f[12]}</b>`, 'SG · NACL 판정 결과'], ['log-status', f[13], '']];
        const why = f[12] === 'REJECT' && f[6] === '5432' ? 'API 서버 → DB 5432 REJECT → db-sg 또는 NACL이 막았다. 앱 로그의 “DB timeout”의 진짜 원인.' : f[12] === 'ACCEPT' ? '허용된 연결 — 응답이 안 간다면 반대 방향(아웃바운드) 기록을 찾아본다.' : 'SG · NACL이 막았다.';
        return T(['필드', '값', '의미'], rows, { mono: [1] }) + `<p style="margin:0">${why}</p>`; } } },
    H.warn('SG가 막으면 REJECT로 남지만 <b>Route가 없으면 기록 자체가 없을 수 있다</b> — 없는 것도 단서. Flow Logs에는 <b>패킷 내용(HTTP Body 등)이 없다</b> — 메타데이터(주소 · 포트 · 양 · 판정)만.'),
    H.note('보안 감사에도 쓴다: “DB 포트에 VPC 밖 IP가 접근 시도한 적 있는가?” — CloudWatch Logs · Athena로 쿼리.'),
  ] },

{ id: 'w9.iac', title: 'Infrastructure as Code — VPC와 SG를 코드로', slides: 'S40–S41',
  blocks: [
    `<div class="pair"><div><h4>VPC · Subnet · IGW</h4>${H.pre(`resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
}
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.0.0/24"
  availability_zone       = "ap-northeast-2a"
  map_public_ip_on_launch = true
}
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}`)}</div><div><h4>Route Table — 이것이 “Public”을 만든다</h4>${H.pre(`resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}
resource "aws_route_table_association" "pa" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}`)}</div></div>`,
    H.key('워크플로: <code>terraform plan</code>(무엇이 바뀌나 미리 보기) → 리뷰 → <code>apply</code> → 실습 끝나면 <code>destroy</code>. subnet 이름이 public_a여도 <b>association이 없으면 Main RT</b>를 쓴다 — 코드 리뷰에서 “이름”이 아니라 route_table_association을 찾아라.'),
    H.pre(`resource "aws_vpc_security_group_ingress_rule" "app_from_alb" {
  security_group_id            = aws_security_group.app.id
  referenced_security_group_id = aws_security_group.alb.id   # SG 참조
  ip_protocol = "tcp"
  from_port   = 8000
  to_port     = 8000
}
# terraform plan에서 볼 것
  + resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
      + cidr_ipv4   = "0.0.0.0/0"    ← !!!
      + from_port   = 5432`),
    lines(['0.0.0.0/0이 alb 외 SG의 ingress에 있는가?', 'ip_protocol = "-1"(모든 포트) 인바운드가 있는가?', 'db 규칙의 Source가 app SG 참조인가?', 'egress가 꼭 전체 허용이어야 하는가? (Terraform은 기본 egress를 지운다)']),
    H.warn('plan은 변경 전에 읽는 마지막 기회다. AI가 만든 코드를 apply하기 전에 plan의 + 줄에서 0.0.0.0/0과 22 · 3306 · 5432를 검색하자.'),
  ] },

{ id: 'w9.lab', title: 'Hands-on Lab · AI 리뷰 · 과제', slides: 'S42–S44, S46',
  blocks: [
    { h3: 'Lab ① — VPC Design Sheet (종이 · 표)' },
    T(['#', '할 일', '산출물'], [['1', 'VPC CIDR 선정 (dev/prod 분리, 연구실 192.168 회피)', 'CIDR 1줄 + 이유'], ['2', '2 AZ × 3계층 = 6개 서브넷 CIDR · 가용 IP 계산', '서브넷 표'], ['3', 'Route Table 3종(public · private-a · private-c)', 'RT 표'], ['4', 'SG 매트릭스: 누가(Source) → 누구에게(포트)', 'SG 표'], ['5', 'NACL은 Default 유지 or Custom? 근거', '한 문단'], ['6', '패킷 2개 추적 (사용자 → API, API → 외부 API)', '경로 그림']]),
    T(['From \\ To', 'ALB', 'API', 'DB'], [['Internet', '443', '✕', '✕'], ['ALB', '—', '8000', '✕'], ['API', '✕', '—', '5432'], ['DB', '✕', '✕', '—']]),
    { h3: 'Lab ② — 구축하고, 일부러 깨뜨리기' },
    T(['#', '변경', '예상 증상', '확인 방법'], [['A', 'public-rt에서 0.0.0.0/0 → IGW 삭제', '웹 서버 접속 타임아웃', 'curl -v · Reachability Analyzer'], ['B', '웹 서버 SG 443 Source를 내 IP/32로', '다른 사람만 타임아웃', '친구 PC · LTE로 접속'], ['C', 'Custom NACL, 아웃바운드 1024–65535 누락', '요청 도착 · 응답 실패 → 타임아웃', 'Flow Logs ACCEPT/REJECT 비교'], ['D', 'Private 서버에서 pip install (NAT 없음 → 있음)', '실패 → 성공', 'curl ifconfig.me로 NAT EIP 확인'], ['E', '앱을 127.0.0.1:8000으로 바인딩', '타임아웃이 아니라 Refused/502', 'ss -ltnp · ALB Target 상태'], ['F', 'db-sg Source를 app-sg → 10.0.10.5/32로', '서버 교체 후 DB 연결 실패', 'Auto Scaling 새 IP와 비교']]),
    H.note('계정 사용이 어려운 학생은 실험 표의 “예상 증상”을 근거와 함께 예측하는 것으로 대체한다 — 증상을 예측할 수 있으면 원리를 이해한 것. NAT Gateway · EIP · ALB는 Free Tier가 아니다.'),
    { mount: el => { const C = ['DB · Redis · 브로커가 Public 서브넷에 있거나 publicly_accessible = true인가?', '0.0.0.0/0 인바운드가 ALB(NLB) 외의 SG에 있는가?', '22번(SSH)을 인터넷에 열었는가? → Session Manager로 대체', 'NAT Gateway가 Private 서브넷에 있지 않은가? (Public이어야 함)', 'NAT가 한 AZ에만 있어 단일 장애점이 되지 않는가?', 'SG Source에 IP 대신 SG 참조를 썼는가?', 'VPC CIDR이 연구실 · 다른 환경과 겹치지 않는가?', 'subnet association 누락으로 Main RT를 쓰는 서브넷이 없는가?'];
      const saved = LS.get('w9.verify', []);
      const draw = () => { el.innerHTML = `<div class="lab"><div class="lab-head"><span class="tag">체크리스트</span>VERIFY — AI가 만든 3-tier VPC</div><div class="lab-out">${C.map((c, i) => `<label class="ck"><input type="checkbox" data-i="${i}" ${saved.includes(i) ? 'checked' : ''}><span>${esc(c)}</span></label>`).join('')}</div></div>`;
        el.querySelectorAll('input').forEach(b => b.onchange = () => { const i = +b.dataset.i, k = saved.indexOf(i); if (b.checked && k < 0) saved.push(i); if (!b.checked && k >= 0) saved.splice(k, 1); LS.set('w9.verify', saved); draw(); }); };
      draw(); } },
    H.note('AI는 “동작하는” 인프라를 빠르게 만든다. 하지만 “열려 있으면 안 되는 문”은 동작 테스트로 드러나지 않는다 — 사람이 규칙 단위로 읽어야 한다.'),
    T(['과제 단계', '할 일'], [['STEP 1 · CIDR · 서브넷', 'VPC CIDR과 2 AZ × 3계층 서브넷 표, dev/prod 분리'], ['STEP 2 · Route · 보안 규칙', 'RT 표, SG 매트릭스(SG 참조), NACL 정책 · 7주차 시스템 배치'], ['STEP 3 · 장애 · 확장', 'AZ 장애 · 트래픽 3배 · 새 VPC 연결(Peering) 상황 분석']]),
  ] },

{ id: 'w9.qc', title: 'Quick Check — Week 9', slides: 'S45, S47', tag: '점검',
  blocks: [
    `<p>강의 팁: 답하기 전에 “이건 <b>길(Route)</b>의 문제인가, <b>문(SG · NACL)</b>의 문제인가, <b>주소(CIDR · NAT)</b>의 문제인가?”를 먼저 정하자.</p>`,
    { qc: 'w9' },
    { h3: 'Takeaways' },
    H.cards([['Region ⊃ AZ', 'AZ는 장애 영역의 단위. VPC는 Region, Subnet은 AZ 하나에 속한다.', ''], ['VPC · CIDR은 처음이 전부', '겹치지 않게 · 넉넉하게 · 번호 규칙으로. 서브넷마다 5개 예약.', 'L3'], ['Public은 Route가 만든다', '0.0.0.0/0 → IGW가 있으면 Public. 이름표는 의미 없다.', 'L7'], ['IGW 1:1, NAT N:1', 'IGW는 공인 ↔ 사설 변환, NAT GW는 나가는 연결만. NAT는 AZ마다.', 'L4'], ['SG는 Stateful, NACL은 Stateless', 'SG 참조로 최소 권한 체인. NACL은 임시 포트까지 양방향.', 'L3'], ['타임아웃은 길 · 문, Refused는 앱', 'DNS → Route → NACL → SG → 리스너 순서로 좁히고 Flow Logs로 확인.', 'L7']]),
    H.note('다음 주로 — 이 VPC 안에서 서버 대신 컨테이너를 띄우고, 트래픽에 따라 늘리고 줄이는 구조로.'),
  ] },
] });

QUIZ.w9 = { bank: [], qc: [
  { q: 'Region과 Availability Zone의 관계는? 왜 서버를 서로 다른 AZ에 두는가?', ref: 'w9.az', model: 'Region(지리적 거점) 안에 전력 · 냉각 · 네트워크가 <b>독립된</b> 데이터센터 묶음인 AZ가 여러 개 있다(Region ⊃ AZ). AZ는 <b>장애 영역</b>의 단위라, 서로 다른 AZ에 두면 한 AZ가 정전 · 단절돼도 다른 AZ의 서버가 서비스를 계속한다.', kw: ['Region ⊃ AZ', 'AZ = 독립 전원·냉각·네트워크', '장애 영역 분리 → 한 AZ 장애에도 지속'] },
  { q: 'VPC CIDR을 처음에 신중하게 정해야 하는 이유 두 가지는?', ref: 'w9.plan', model: '① 만든 뒤 <b>바꾸기 어렵다</b>(보조 CIDR 추가도 제약) → 서브넷 · 서버가 늘 자리를 넉넉히. ② 다른 VPC · 연구실 · 회사망과 <b>겹치면 Peering · VPN 경로를 만들 수 없다</b>.', kw: ['변경 어려움 · 확장 여유', '겹치면 Peering/VPN 불가'] },
  { q: '10.0.1.0/26 서브넷에서 AWS가 허용하는 사용 가능 IP 수는?', ref: 'w9.cidr', model: '/26 = 2^(32−26) = 64개. AWS는 서브넷마다 <b>5개를 예약</b>(네트워크 · VPC 라우터 · DNS · 향후 예약 · 브로드캐스트)하므로 <b>64 − 5 = 59개</b>.', kw: ['64개', '5개 예약', '59개'] },
  { q: 'Public Subnet과 Private Subnet을 구분하는 실제 기준은 무엇인가?', ref: 'w9.route', model: '서브넷에 연결된 <b>Route Table에 0.0.0.0/0 → IGW 경로가 있는지</b>. 있으면 Public, 없으면 Private. 이름표는 아무 의미가 없다.', kw: ['Route Table', '0.0.0.0/0 → IGW 유무', '이름 아님'] },
  { q: 'Public 서브넷의 서버가 인터넷과 통신하기 위한 3가지 조건은?', ref: 'w9.public', model: '① <b>경로</b>: RT에 0.0.0.0/0 → IGW ② <b>공인 IP</b>: Public IPv4 또는 Elastic IP ③ <b>문 열기</b>: SG 인바운드(예: 443) + NACL 허용.', kw: ['IGW 경로', '공인 IP (EIP)', 'SG · NACL 허용'] },
  { q: 'Private 서버가 외부 API를 호출할 때 출발지 IP는 어떻게 바뀌는가?', ref: 'w9.nat', model: '10.0.10.5(서버 사설) → <b>NAT GW가 SNAT</b>로 자기 사설 IP:새 포트(10.0.0.8:61001)로 바꾸고 매핑 기록 → <b>IGW가 EIP로 1:1 변환</b>(52.79.1.2). 외부는 NAT의 EIP만 본다. 응답은 거꾸로 두 번 복원된다.', kw: ['NAT GW SNAT (포트 매핑)', 'IGW가 EIP로 1:1', '외부는 EIP만 봄 · 응답은 역변환'] },
  { q: 'Security Group과 NACL의 차이를 Stateful/Stateless로 설명하라.', ref: 'w9.sgnacl', model: '<b>SG</b>는 ENI 단위 <b>Stateful</b> — 허용된 요청의 응답을 기억해 자동 허용, Allow만. <b>NACL</b>은 서브넷 단위 <b>Stateless</b> — 들어오고 나가는 패킷을 각각 따로 검사, Allow · Deny + 번호 순 첫 일치.', kw: ['SG = ENI · Stateful · 응답 자동 허용', 'NACL = 서브넷 · Stateless · 양방향 각각', 'NACL은 Deny · 번호 순'] },
  { q: 'NACL에서 임시 포트(1024–65535)를 열어야 하는 이유는?', ref: 'w9.state', model: 'NACL은 Stateless라 응답을 기억하지 못한다. 서버의 응답은 클라이언트가 고른 <b>임시 포트</b>로 나가므로, 아웃바운드에 그 범위를 허용하지 않으면 요청은 들어와도 <b>응답이 못 나가 타임아웃</b>이 된다.', kw: ['Stateless · 응답 기억 못 함', '응답은 클라이언트 임시 포트로', '누락 시 타임아웃'] },
  { q: 'SG Source에 IP 대신 다른 SG를 지정하면 무엇이 좋은가?', ref: 'w9.sgnacl', model: '“그 SG를 단 모든 인스턴스”를 허용하므로 Auto Scaling · 교체로 <b>서버가 늘거나 IP가 바뀌어도 규칙 수정이 필요 없다</b>. 최소 권한 체인(ALB → API → DB)을 IP 없이 표현해 규칙 자체가 아키텍처 문서가 된다.', kw: ['IP 바뀌어도 규칙 유지', 'Auto Scaling에 강함', '최소 권한 체인'] },
  { q: '“타임아웃”과 “Connection refused”는 각각 어느 계층의 문제를 암시하는가?', ref: 'w9.trouble', model: '<b>타임아웃</b> = 중간(경로 · Route Table · SG · NACL)에서 패킷이 사라졌다. <b>Refused</b> = 서버까지 도착했지만 그 포트를 <b>듣는 프로세스가 없다</b>(앱 미실행 · 127.0.0.1 바인딩).', kw: ['타임아웃 = 경로·SG·NACL', 'Refused = 리스너/앱'] },
] };
})();
