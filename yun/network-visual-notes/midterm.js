/* 중간고사 대비 — quiz past questions (100 OX with answers), week 5 OX, abbreviation full forms, short essays, mock exam generator */
'use strict';
(function () {
const T = H.tbl;

/* ---------- 10/19 quiz: 100 OX statements with the answer key [statement, O|X, why, ref] ---------- */
const QZ = [
  ["인터넷 속도가 1 Gbps면 latency도 항상 낮다.", "X", "<b>Bandwidth</b>(초당 실을 수 있는 양)와 <b>Latency</b>(한 비트가 도착하기까지 걸리는 시간)는 별개다. 차선이 많은 고속도로(1 Gbps)라도 부산까지의 거리(전파 지연)·톨게이트 대기(큐잉)는 그대로다.", "w1.perf"],
  ["Cloud는 “인터넷 어딘가에 있는 다른 사람의 컴퓨터”라고만 이해해도 충분하다.", "X", "“남의 컴퓨터”는 출발점일 뿐이다. Cloud는 컴퓨팅 자원을 <b>네트워크로 필요한 만큼 빌려 쓰는 모델</b>이고, Region·AZ·VPC·관리형 서비스처럼 <b>어디에 어떻게 배치할지</b>가 설계 대상이다.", "w1.place"],
  ["Client와 Server는 장치 종류가 아니라 통신에서의 역할이다.", "O", "Client/Server는 <b>통신에서의 역할</b>이다. 같은 노트북이 브라우저(Client)이면서 동시에 localhost:8000 서버(Server)일 수 있다.", "w1.cs"],
  ["Edge computing은 Cloud를 완전히 대체하는 기술이다.", "X", "Edge는 Cloud를 <b>보완</b>한다. 지연에 민감한 판단은 현장(Edge)에서, 저장·학습·집계는 Cloud에서 — 둘을 <b>나눠 쓰는 것</b>이 핵심이다.", "w1.place"],
  ["AI 서비스도 결국 네트워크를 통해 request와 response를 주고받는다.", "O", "AI 서비스도 Client → API Server → GPU 서버로 가는 <b>request/response</b>이다. 모델이 클 뿐 네트워크 흐름은 같다.", "w1.journey"],
  ["인터넷은 하나의 거대한 단일 네트워크가 아니라, 공통 프로토콜(IP)로 상호 연결된 독립 네트워크들의 집합이다.", "O", "인터넷 = <b>Network of Networks</b>. 각 ISP·기관의 독립 네트워크가 공통 언어 <b>IP</b>로 서로 연결된 것이다.", "w1.internet"],
  ["Switch는 서로 다른 네트워크 사이에서 IP 주소를 보고 패킷의 다음 경로를 결정하는 L3 장비이다.", "X", "설명은 <b>Router</b>(L3, IP로 경로 결정)에 대한 것이다. <b>Switch는 L2</b> 장비로, 같은 네트워크 안에서 <b>MAC 주소</b>를 보고 프레임을 전달한다.", "w1.layer"],
  ["Packet switching 방식에서는 여러 사용자가 링크를 공유하므로, 트래픽이 몰리면 혼잡(Congestion)으로 지연과 손실이 발생할 수 있다.", "O", "Packet switching은 링크를 <b>나눠 쓴다</b>(효율 ↑). 대신 몰리면 라우터 큐가 차서 <b>지연(큐잉)·손실</b>이 생긴다 — 이것이 혼잡이다.", "w1.packet"],
  ["Throughput은 링크가 이론적으로 전달할 수 있는 최대 데이터량을 의미한다.", "X", "그건 <b>Bandwidth</b>(이론상 최대)의 정의다. <b>Throughput</b>은 실제로 전달된 양이며, 경로 중 <b>가장 좁은 병목</b>과 프로토콜 오버헤드에 좌우된다.", "w1.perf"],
  ["Endpoint는 주소, Port, Path의 조합으로 표현되는 서비스의 구체적 접근 지점이다.", "O", "Endpoint = <b>주소(host) + Port + Path</b>. 예: <code>http://127.0.0.1:8000/api/chat</code> — 서비스에 접근하는 구체적 지점이다.", "w1.cs"],
  ["MQTT는 Broker 없이 발행자와 구독자가 직접 연결되는, 고성능 네트워크 전용의 무거운 메시지 프로토콜이다.", "X", "MQTT는 <b>Broker를 거치는</b> Publish/Subscribe 구조이고, 저전력·저대역 IoT 장치를 위한 <b>가벼운</b> 프로토콜이다. 장치는 Broker 하나만 알면 된다.", "w1.place"],
  ["Availability Zone(AZ)은 한 Region 안에서 장애가 서로 전파되지 않도록 분리된 구역이다.", "O", "AZ는 한 Region 안에서 전원·네트워크가 분리된 데이터센터 구역이다. 한 AZ 장애가 다른 AZ로 번지지 않도록 <b>여러 AZ에 나눠 배치</b>한다.", "w1.place"],
  ["Local Inference는 단말이 데이터를 클라우드 서버로 보내 추론 결과를 받아오는 방식이다.", "X", "그건 Cloud(원격) 추론이다. <b>Local inference</b>는 데이터를 보내지 않고 <b>단말·Edge 장치에서 직접</b> 추론해 지연·대역폭·개인정보 부담을 줄인다.", "w1.place"],
  ["HTTP, DNS, MQTT는 네트워크 계층(Network Layer)에서 동작하는 프로토콜이다.", "X", "HTTP · DNS · MQTT는 모두 <b>응용 계층(Application, L7)</b> 프로토콜이다. 네트워크 계층(L3)은 IP.", "w1.layer"],
  ["QUIC은 TCP 위에서 동작하며 빠른 연결과 암호화를 내장한 전송 프로토콜이다.", "X", "QUIC은 <b>UDP 위</b>에서 동작한다. 신뢰성·혼잡 제어·TLS 1.3 암호화를 사용자 공간에서 직접 구현했다(HTTP/3의 기반).", "w4.ver"],
  ["HTTPS는 HTTP를 TLS로 암호화한 형태이며, TLS의 이전 이름은 SSL이다.", "O", "HTTPS = HTTP over <b>TLS</b>. TLS는 SSL(Secure Sockets Layer)의 후속으로, 지금도 관습적으로 “SSL 인증서”라고 부른다.", "w4.https"],
  ["AI Coding Agent가 생성한 네트워크 코드는 문법 오류만 없으면 포트·보안·로그를 별도로 확인하지 않고 배포해도 된다.", "X", "문법이 맞아도 <b>0.0.0.0 노출 · 하드코딩된 포트 · 인증 없음 · 로그 부재</b> 같은 문제가 남는다. AI가 만든 코드는 포트·보안·로그를 <b>사람이 검증</b>해야 한다.", "w1.lab"],
  ["192.168.1.20/24와 192.168.2.20/24는 같은 subnet에 속한다.", "X", "/24면 앞 3옥텟이 네트워크 부분이다. <b>192.168.1</b>.0 ≠ <b>192.168.2</b>.0 → 다른 subnet.", "w2.and"],
  ["192.168.10.0/26의 Broadcast 주소는 192.168.10.63이다.", "O", "/26 → 블록 크기 2^(32−26) = <b>64</b>. 0~63이 한 블록이므로 Network = .0, <b>Broadcast = .63</b>.", "w2.range"],
  ["192.168.10.0/26에서 호스트에 할당 가능한 주소는 64개이다.", "X", "주소는 64개지만 Network(.0)와 Broadcast(.63)를 빼면 할당 가능한 호스트는 <b>64 − 2 = 62개</b>.", "w2.range"],
  ["127.0.0.1:8000에서 127.0.0.1은 호스트(자기 자신)를, 8000은 그 호스트 안의 프로세스(서비스)를 식별한다.", "O", "IP는 <b>호스트</b>를, Port는 그 호스트 안의 <b>프로세스(서비스)</b>를 가리킨다. 아파트 동·호수 비유: IP = 건물, Port = 호수.", "w2.port"],
  ["목적지가 내 subnet 밖에 있을 때 호스트는 패킷을 Default Gateway에 맡긴다.", "O", "목적지가 <b>내 subnet 밖</b>(IP AND Mask 결과가 다름)이면 Default Gateway에 맡긴다. 그다음 경로는 Router들이 결정한다.", "w2.decide"],
  ["같은 subnet 안의 호스트와 통신할 때도 패킷은 항상 Default Gateway(라우터)를 거쳐야 한다.", "X", "같은 subnet이면 <b>ARP로 상대 MAC을 알아내 직접</b> 보낸다(Switch만 거침). Gateway는 subnet 밖으로 나갈 때만.", "w2.decide"],
  ["패킷이 Router를 지날 때마다 MAC 주소는 바뀌지만, 목적지 IP 주소는 (NAT가 없다면) 그대로 유지된다.", "O", "MAC은 “이 링크의 다음 장비” → hop마다 <b>새로 씀</b>. IP는 “최종 목적지” → <b>유지</b>(NAT가 없을 때).", "w2.hop"],
  ["ARP는 같은 네트워크에서 IPv4 주소에 해당하는 MAC 주소를 알아내는 프로토콜이다.", "O", "ARP = Address Resolution Protocol. “192.168.0.1 가진 사람?”을 브로드캐스트해 그 IP의 <b>MAC</b>을 알아낸다.", "w2.hop"],
  ["Private IP를 가진 PC가 Internet에 접속할 수 있는 것은 공유기(게이트웨이)의 NAT가 Private 주소를 Public 주소로 변환해 주기 때문이다.", "O", "Private IP는 인터넷에서 라우팅되지 않는다. 공유기 NAT가 출발지를 <b>Public IP(:port)로 바꿔</b> 내보내고, 응답은 NAT 테이블로 되돌린다.", "w2.nat"],
  ["서버 프로세스를 0.0.0.0에 bind하면 Public Internet에 자동으로 공개된다.", "X", "0.0.0.0 bind는 “이 PC의 <b>모든 NIC</b>에서 받겠다”는 뜻일 뿐이다. 인터넷 공개에는 <b>Public IP + 포트포워딩/터널 + 방화벽 허용</b>이 따로 필요하다.", "w2.expose"],
  ["172.16.5.10은 Private IP 대역에 속한다.", "O", "Private 대역 172.16.0.0/12 = <b>172.16.0.0 ~ 172.31.255.255</b>. 172.16.5.10은 그 안이다.", "w2.addr"],
  ["172.32.1.1은 Private IP 대역(172.16.0.0/12)에 속한다.", "X", "/12면 두 번째 옥텟은 <b>16~31</b>까지다. 172.<b>32</b>는 범위 밖 → Public 주소.", "w2.addr"],
  ["Subnetting은 Prefix 길이를 줄여 하나의 주소 공간을 여러 Subnet으로 분할하는 일이다.", "X", "Subnetting은 Prefix를 <b>늘려서</b>(예: /24 → /26) 호스트 비트를 빌려 subnet을 만든다. Prefix를 줄이는 것은 합치기(Supernetting·요약).", "w2.split"],
  ["Longest Prefix Match는 여러 경로 중 prefix가 가장 짧은(가장 넓은) 경로를 선택하는 규칙이다.", "X", "LPM은 매칭되는 경로 중 prefix가 <b>가장 긴(가장 구체적인)</b> 경로를 고른다. /0(default)은 가장 짧아 맨 마지막 후보.", "w2.route"],
  ["Default Route(0.0.0.0/0)는 더 구체적인 경로가 없을 때 사용하는 기본 경로이다.", "O", "0.0.0.0/0은 모든 주소와 매칭되지만 prefix 길이가 0이라, 더 구체적인 경로가 없을 때만 쓰인다 — “모르면 여기로”.", "w2.route"],
  ["DHCP가 IP를 할당받는 DORA 절차는 Discover → Offer → Request → ACK 순서이다.", "O", "<b>D</b>iscover(브로드캐스트) → <b>O</b>ffer → <b>R</b>equest → <b>A</b>CK = DORA.", "w2.dhcp"],
  ["DHCP로 받은 IP 주소는 Lease Time과 무관하게 영구적으로 사용할 수 있다.", "X", "DHCP 주소는 <b>임대(Lease)</b>다. 기간 안에 갱신해야 하고, 만료되면 반납되어 다른 장치에 줄 수 있다.", "w2.dhcp"],
  ["PAT(NAPT)는 IP 주소와 함께 Port까지 변환하는 방식이며, 흔히 그냥 NAT라고 부른다.", "O", "PAT(NAPT)는 IP와 <b>Port까지</b> 바꿔서 Public IP 하나를 여러 장치가 나눠 쓴다. 가정용 공유기의 “NAT”가 사실 이것.", "w2.nat"],
  ["클라우드에서 Security Group은 서브넷 단위로, Network ACL은 인스턴스 단위로 적용되는 접근 제어 규칙이다.", "X", "<b>반대</b>다. Security Group은 <b>인스턴스(ENI) 단위</b>(stateful), Network ACL은 <b>서브넷 단위</b>(stateless) 규칙이다.", "w2.vpc"],
  ["Private Subnet은 인터넷에서 직접 접근할 수 없으며, 밖으로 나가야 할 때는 NAT Gateway를 사용할 수 있다.", "O", "Private Subnet에는 IGW 경로가 없어 밖에서 들어올 수 없다. 패키지 설치처럼 <b>나가야</b> 할 때는 NAT Gateway(Public Subnet에 위치)를 거친다.", "w2.vpc"],
  ["Connection refused는 응답이 아예 오지 않는 상태로, 주로 방화벽이나 경로 문제를 뜻한다.", "X", "그건 <b>timed out</b>의 설명이다. <b>Refused</b>는 SYN이 서버 OS에 <b>도착했는데</b> 그 포트에 listen 소켓이 없어 <b>RST가 즉시</b> 돌아온 것 → 프로세스·포트·bind 주소를 본다.", "w3.diag"],
  ["netstat -ano는 도메인 이름에 대한 DNS 질의 결과를 확인하는 명령이다.", "X", "netstat -ano는 <b>연결·LISTEN 포트와 PID</b>를 보여 준다(“내 서버가 그 포트에 떠 있나?”). DNS 확인은 <b>nslookup</b>.", "w2.trouble"],
  ["Troubleshooting Ladder에서는 보통 DNS부터 확인한 뒤 마지막에 서비스 실행과 Bind/Port를 확인한다.", "X", "Ladder는 <b>아래(내 쪽)부터</b>: Service 실행 → Bind/Port → 방화벽 → 경로(NAT·라우팅) → DNS. 서비스가 안 떠 있으면 DNS를 고쳐도 소용없다.", "w2.trouble"],
  ["3-way handshake에서 세 번째 ACK가 필요한 이유 중 하나는, 늦게 도착한 오래된 중복 SYN(Old Duplicate SYN)으로 잘못된 연결이 성립하는 것을 막기 위해서이다.", "O", "세 번째 ACK가 없으면 Server는 <b>Client가 지금 원하는 연결인지</b> 확인할 수 없다. 오래된 중복 SYN에 Client가 ACK하지 않으므로 잘못된 연결이 성립하지 않는다.", "w3.hs"],
  ["TCP 3-way handshake는 SYN → ACK → SYN+ACK 순서로 진행된다.", "X", "순서는 <b>SYN → SYN+ACK → ACK</b>. Server가 받은 SYN에 ACK하면서 자기 SYN을 함께 보낸다.", "w3.hs"],
  ["UDP는 TCP보다 링크의 대역폭 자체를 늘려 주기 때문에 어떤 상황에서도 데이터 전송이 더 빠르다.", "X", "UDP는 대역폭을 늘리지 않는다. 연결 설정·재전송·혼잡 제어를 <b>생략</b>해 오버헤드와 대기가 적을 뿐이고, 손실 처리는 앱의 몫이다(“UDP는 생략이다”).", "w3.udp"],
  ["UDP 헤더는 8바이트이며 Source Port, Destination Port, Length, Checksum 네 필드로 구성된다.", "O", "UDP 헤더 = <b>8바이트</b>: Source Port(2) · Destination Port(2) · Length(2) · Checksum(2).", "w3.hdr"],
  ["Port는 번호(주소)이고 Socket은 그 주소에 묶인 통신 객체이므로, 하나의 포트 위에 여러 개의 소켓이 존재할 수 있다.", "O", "Port는 16비트 <b>번호</b>, Socket은 그 번호에 묶인 <b>통신 객체(FD)</b>다. 서버의 443에는 listen 소켓 1개 + 연결 소켓 N개가 함께 존재한다.", "w3.sock"],
  ["TCP 연결은 목적지 IP와 목적지 Port의 2-tuple만으로 식별된다.", "X", "TCP 연결은 <b>4-tuple</b>(출발지 IP · 출발지 Port · 목적지 IP · 목적지 Port)로 식별한다. 2-tuple로 구분하는 것은 UDP demux.", "w3.mux"],
  ["listen 소켓은 새 연결을 받아 큐에 넣는 역할만 하고, 실제 데이터 send/recv는 accept()가 반환한 연결 소켓이 담당한다.", "O", "listen 소켓은 “접수 창구”, accept()가 돌려준 <b>연결 소켓</b>이 실제 상담(send/recv)을 맡는다.", "w3.sock"],
  ["accept()는 서버 애플리케이션이 클라이언트와 3-way handshake를 직접 수행하는 함수이다.", "X", "Handshake는 <b>커널(OS)</b>이 처리해 완료된 연결을 Accept queue에 넣는다. accept()는 그 큐에서 <b>하나를 꺼내</b> 연결 소켓을 받을 뿐이다.", "w3.sock"],
  ["Flow control은 네트워크(병목 라우터)를 보호하고, Congestion control은 수신자의 버퍼를 보호한다.", "X", "<b>반대</b>다. Flow control(rwnd)은 <b>수신자 버퍼</b>를, Congestion control(cwnd)은 <b>네트워크(병목)</b>를 보호한다.", "w3.flow"],
  ["TCP 송신자가 실제로 보낼 수 있는 양(Effective Window)은 min(rwnd, cwnd)이다.", "O", "송신자는 수신자(rwnd)와 네트워크(cwnd) <b>둘 다</b> 감당할 수 있는 만큼만 보낸다 → <b>min(rwnd, cwnd)</b>.", "w3.flow"],
  ["누적 ACK 환경에서 같은 ack 번호의 중복 ACK가 반복되면, 송신자는 뒤의 데이터는 도착하고 있으나 특정 조각 하나가 빠졌음을 알 수 있다.", "O", "누적 ACK는 “여기까지 다 받았다”이므로, 같은 ack가 반복되면 그 뒤 데이터는 도착 중인데 <b>한 조각이 빠진 것</b>이다. 3 dup ACK → 빠른 재전송.", "w3.loss"],
  ["CLOSE_WAIT은 먼저 close()한 쪽이 늦은 패킷을 흡수하기 위해 2×MSL 동안 머무는 정상적인 상태이다.", "X", "그건 <b>TIME_WAIT</b>의 설명이다. <b>CLOSE_WAIT</b>은 <b>상대가 먼저</b> 닫았는데 내 앱이 아직 close()를 안 한 상태 — 기한 없이 남는다.", "w3.close"],
  ["CLOSE_WAIT 소켓이 계속 누적된다면, 내 애플리케이션이 close()를 호출하지 않는 코드 버그(소켓 누수)를 의심해야 한다.", "O", "CLOSE_WAIT은 내 코드가 close()를 해야 끝난다. 누적 = <b>소켓 누수 버그</b> → with · finally로 반드시 닫자.", "w3.close"],
  ["Connection refused는 대상 포트에 listen 소켓이 없어 RST가 돌아온 경우이고, Connection timed out은 SYN에 응답이 없는 경우라서 두 오류의 조사 방향이 다르다.", "O", "Refused = 도착했고 거절(RST) → <b>서버 프로세스·포트·bind</b> 조사. Timed out = 응답 없음 → <b>방화벽·SG·라우팅·NAT</b> 조사.", "w3.diag"],
  ["TCP의 Sequence Number는 몇 번째 세그먼트인지를 나타내는 세그먼트 번호이다.", "X", "Seq는 세그먼트 번호가 아니라 그 세그먼트 <b>첫 바이트의 번호</b>(바이트 단위)다.", "w3.seq"],
  ["seq=1, len=1460인 세그먼트를 정상적으로 받은 수신자는 ack=1461을 보낸다.", "O", "ack = “다음에 받을 바이트 번호” = 1 + 1460 = <b>1461</b>.", "w3.seq"],
  ["Slow Start는 cwnd를 매 RTT마다 +1 MSS씩 천천히 늘리는 단계이다.", "X", "Slow Start는 ACK마다 +1 MSS → RTT마다 <b>2배</b>(지수). RTT마다 +1 MSS는 ssthresh 이후의 <b>Congestion Avoidance</b>.", "w3.cc"],
  ["AIMD는 천천히(가산적으로) 올리고 손실 시 급히(절반으로) 내리는 혼잡 제어 규칙이다.", "O", "AIMD = Additive Increase(+1 MSS/RTT), Multiplicative Decrease(손실 시 ½). 톱니 모양 cwnd 그래프가 나온다.", "w3.cc"],
  ["수신자가 win=0을 광고해 전송이 멈추는 Zero Window 현상의 주된 원인은 네트워크 혼잡이다.", "X", "win=0은 <b>수신 앱이 버퍼를 늦게 읽어서</b>(flow control) 생긴다. 네트워크 혼잡은 cwnd 쪽 이야기.", "w3.flow"],
  ["BDP(Bandwidth-Delay Product)는 대역폭 × RTT로, 링크를 꽉 채우는 데 필요한 윈도우 크기를 의미한다.", "O", "BDP = Bandwidth × RTT = “파이프 안에 동시에 떠 있을 수 있는 데이터 양”. 윈도우가 이보다 작으면 링크를 다 못 쓴다.", "w3.window"],
  ["TCP는 바이트 스트림이므로 송신 측의 send() 3번이 수신 측에서 recv() 1번으로 합쳐져 읽힐 수 있다.", "O", "TCP는 <b>메시지 경계가 없는 바이트 스트림</b>이다. send 3번이 recv 1번으로 합쳐지거나 쪼개질 수 있어, 앱이 길이·구분자로 경계를 정해야 한다.", "w3.vs"],
  ["UDP는 unicast만 가능하고, TCP는 broadcast와 multicast까지 지원한다.", "X", "<b>반대</b>다. UDP는 연결이 없으므로 unicast·<b>broadcast·multicast</b> 모두 가능하고(DHCP·mDNS), TCP는 1:1 연결이라 <b>unicast만</b> 된다.", "w3.udp"],
  ["SO_REUSEADDR은 TIME_WAIT 때문에 서버 재시작 시 bind()가 EADDRINUSE로 실패하는 것을 피하기 위한 소켓 옵션이다.", "O", "서버 재시작 직후 이전 연결의 TIME_WAIT 때문에 bind()가 EADDRINUSE로 실패하는 것을 SO_REUSEADDR로 피한다.", "w3.close"],
  ["ss 출력에서 Recv-Q가 계속 쌓이면 네트워크가 병목이고, Send-Q가 계속 쌓이면 수신 앱이 병목이다.", "X", "<b>반대</b>다. Recv-Q가 쌓임 = <b>내(수신) 앱이 안 읽음</b> → 앱 병목. Send-Q가 쌓임 = 보냈지만 ACK를 못 받음 → <b>네트워크·상대 수신 측</b> 병목.", "w3.diag"],
  ["QUIC은 커널이 아닌 사용자 공간(User Space)에서 구현되며, Connection ID 덕분에 Wi-Fi ↔ LTE처럼 IP가 바뀌어도 연결을 유지할 수 있다.", "O", "QUIC은 <b>User space</b> 라이브러리라 빠르게 개선·배포된다. 연결을 4-tuple이 아닌 <b>Connection ID</b>로 식별해 IP가 바뀌어도 유지된다.", "w4.ver"],
  ["HTTP/3는 443 포트를 사용하므로 TCP 위에서 동작한다.", "X", "HTTP/3는 <b>UDP 443</b> 위의 QUIC이다. 포트 번호는 TCP/UDP를 결정하지 않는다(TCP 443 = HTTP/1.1·2, UDP 443 = HTTP/3).", "w4.ver"],
  ["DNS가 주로 UDP를 사용하는 이유는 질의 하나·응답 하나로 끝나는 통신에 3-way handshake로 1 RTT를 더 쓰는 것이 아깝기 때문이다.", "O", "질의 1개·응답 1개로 끝나는데 handshake로 1 RTT를 더 쓰는 것은 아깝다. 응답이 크거나(zone transfer) 잘리면 TCP로 다시 묻는다.", "w3.udp"],
  ["Exponential Backoff는 타임아웃이 반복될 때마다 RTO를 절반으로 줄여 더 빨리 재전송하는 규칙이다.", "X", "Exponential backoff는 타임아웃이 반복될 때마다 RTO를 <b>2배로 늘린다</b>(혼잡할 때 재전송을 더 몰아넣지 않으려고).", "w3.rto"],
  ["이더넷 MTU가 1500B이고 IP 헤더와 TCP 헤더가 각각 20B라면 MSS는 1460B이다.", "O", "MSS = MTU − IP 헤더 − TCP 헤더 = 1500 − 20 − 20 = <b>1460B</b>.", "w3.hdr"],
  ["TIME_WAIT 상태는 연결 종료 시 나중에 close()한 쪽(수동 종료 측)에 생긴다.", "X", "TIME_WAIT은 <b>먼저 close()한 쪽(능동 종료)</b>에 생긴다. 나중에 닫는 쪽은 CLOSE_WAIT → LAST_ACK를 거친다.", "w3.close"],
  ["DNS는 URL 전체가 아니라 host(도메인) 부분만 알며, path와 query string은 알지 못한다.", "O", "DNS는 <b>host</b>(예: www.example.com)만 IP로 바꾼다. path·query는 HTTP 요청 안에 들어가 서버가 읽는다.", "w4.url"],
  ["URL의 Fragment(#…) 부분은 서버로 전송되어 서버가 페이지 위치를 결정하는 데 사용된다.", "X", "Fragment(#…)는 <b>브라우저 안에서만</b> 쓰인다(페이지 내 위치). 서버로 전송되지 않는다.", "w4.url"],
  ["클라이언트(Stub Resolver)와 재귀 리졸버 사이에서는 재귀 질의가, 재귀 리졸버와 root·TLD·권한 서버 사이에서는 반복 질의가 일어난다.", "O", "Stub ↔ 리졸버 = <b>재귀</b>(“끝까지 알아와 줘”). 리졸버 ↔ Root·TLD·권한 서버 = <b>반복</b>(“나는 모르니 저기 물어봐”).", "w4.resolve"],
  ["DNS 레코드를 바꿨는데 일부 사용자만 옛 서버로 가는 것은, 리졸버·OS·브라우저 캐시에 남은 이전 응답의 TTL이 아직 만료되지 않았기 때문이다.", "O", "각 캐시(리졸버·OS·브라우저)는 받은 응답을 <b>TTL 동안</b> 재사용한다. 만료 전인 사용자는 옛 IP로 간다.", "w4.ttl"],
  ["DNS Propagation은 변경된 레코드를 권한 서버가 전 세계 리졸버로 능동적으로 푸시(push)하는 과정이다.", "X", "푸시는 없다. 권한 서버는 기다릴 뿐이고, 각 리졸버의 <b>캐시 TTL이 만료되어 다시 물을 때</b> 새 값이 퍼진다 — “propagation”은 캐시 만료의 다른 이름.", "w4.ttl"],
  ["HTTP/1.1 메시지에서 헤더와 본문의 경계는 빈 줄(CRLF CRLF)로 구분된다.", "O", "시작줄 + 헤더들 + <b>빈 줄(CRLF CRLF)</b> + 본문. 빈 줄이 “헤더 끝”을 알린다.", "w4.msg"],
  ["PUT은 같은 요청을 N번 보내도 서버 상태가 1번 보낸 것과 같아 멱등이지만, POST는 보낼 때마다 새 자원이 생성될 수 있어 멱등이 아니다.", "O", "멱등 = N번 보내도 <b>서버 상태</b>가 1번과 같다. PUT(통째로 교체)은 멱등, POST(생성)는 보낼 때마다 새 자원이 생길 수 있다.", "w4.method"],
  ["응답만 유실되었을 가능성이 있더라도, POST 요청은 자동 재시도해도 항상 안전하다.", "X", "응답만 유실되었을 수 있으므로 POST 재시도는 <b>중복 생성·중복 결제</b> 위험이 있다. Idempotency-Key 같은 장치가 필요하다.", "w4.method"],
  ["DELETE는 같은 요청을 두 번째 보내면 404가 반환될 수 있으므로 멱등이 아니다.", "X", "멱등은 <b>응답</b>이 아니라 <b>서버 상태</b> 기준이다. 두 번째 DELETE가 404를 받아도 “지워진 상태”는 같으므로 <b>멱등</b>이다.", "w4.method"],
  ["404는 주로 애플리케이션 서버가 만든 응답이고, 502는 프록시(리버스 프록시·LB)가 뒷단 서버에 연결하지 못했거나 잘못된 응답을 받았을 때 만든 응답이다.", "O", "404는 App Server가 “그 경로 없음”이라고 답한 것(DNS·TCP·TLS는 성공). 502·504는 <b>프록시·LB</b>가 뒷단 실패를 번역한 것이다.", "w4.status"],
  ["401 Unauthorized는 누구인지는 알지만 권한이 없을 때, 403 Forbidden은 누구인지 모를 때(토큰 없음·만료) 사용한다.", "X", "<b>반대</b>다. 401 = <b>누구인지 모름</b>(토큰 없음·만료), 403 = <b>누군지 알지만 권한 없음</b>.", "w4.status"],
  ["HTTP/2는 한 TCP 연결에서 여러 스트림을 다중화해 HTTP 계층의 HOL blocking을 해결했지만, TCP 계층의 HOL blocking은 남아 있어 HTTP/3가 등장했다.", "O", "HTTP/2는 한 연결에 스트림을 다중화해 HTTP 계층 HOL을 해결했지만, TCP는 바이트 순서를 지켜야 해 패킷 하나 유실 시 <b>모든 스트림이 대기</b>(TCP HOL) → HTTP/3(QUIC).", "w4.ver"],
  ["HTTPS를 사용하면 접속하는 도메인 이름(SNI)과 목적지 IP 주소까지 모두 암호화되어 경로상에서 보이지 않는다.", "X", "<b>목적지 IP</b>는 IP 헤더에, <b>SNI</b>는 ClientHello에 평문으로 보인다(ECH를 쓰지 않는 한). 그래서 “어느 사이트에 가는지”는 보인다.", "w4.https"],
  ["HTTPS에서는 URL의 path와 query string, HTTP 헤더, 본문이 암호화되어 경로상에서 보이지 않는다.", "O", "TLS 안으로 들어가는 것은 HTTP 메시지 전체 — <b>path · query · 헤더(쿠키·토큰) · 본문</b>이다.", "w4.https"],
  ["브라우저는 인증서를 검증할 때 신뢰 체인(Leaf → Intermediate → Root), 유효기간, SAN에 있는 도메인 이름과 접속 도메인의 일치 여부 등을 확인한다.", "O", "체인(Leaf → Intermediate → Root), 유효기간, <b>SAN</b>의 도메인 일치, 폐기 여부 등을 확인한다.", "w4.tls"],
  ["서버가 Intermediate 인증서를 빠뜨려도 Root CA가 Trust Store에 있으면 인증서 검증은 항상 성공한다.", "X", "Root는 Intermediate를, Intermediate는 Leaf를 서명했다. Intermediate가 없으면 Leaf에서 Root까지 <b>체인을 이을 수 없어 검증 실패</b>한다(일부 브라우저만 우회 다운로드로 구제).", "w4.tls"],
  ["DevTools 워터폴에서 다른 구간은 짧고 TTFB만 길다면, DNS나 TCP 연결보다 서버 측 처리(애플리케이션·DB·upstream) 지연을 먼저 의심해야 한다.", "O", "TTFB = 요청을 보낸 뒤 첫 바이트까지 = <b>서버 처리 시간</b> + 1 RTT. 다른 구간이 짧고 이것만 길면 App·DB·upstream을 본다.", "w4.obs"],
  ["CNAME 레코드는 zone 최상단(apex, 예: example.com)에도 자유롭게 둘 수 있다.", "X", "apex(example.com)에는 SOA·NS 레코드가 반드시 있는데, CNAME은 <b>다른 레코드와 공존할 수 없어</b> 둘 수 없다. 그래서 클라우드 DNS는 ALIAS·ANAME을 제공한다.", "w4.rec"],
  ["MX 레코드는 IP 주소를 도메인 이름으로 바꾸는 역방향 조회용 레코드이다.", "X", "그건 <b>PTR</b>(역방향) 레코드다. <b>MX</b>는 그 도메인의 <b>메일 서버</b>를 지정한다.", "w4.rec"],
  ["'그런 이름 없음(NXDOMAIN)' 응답은 캐시되지 않으므로, 레코드를 새로 추가하면 즉시 모든 사용자에게 반영된다.", "X", "NXDOMAIN도 SOA의 negative TTL 동안 <b>캐시된다(Negative caching)</b>. 막 만든 레코드가 일부 사용자에게 안 보이는 이유.", "w4.ttl"],
  ["Cache-Control: no-cache는 응답을 캐시에 저장하는 것 자체를 금지한다는 의미이다.", "X", "그건 <b>no-store</b>다. <b>no-cache</b>는 저장은 하되 쓰기 전에 <b>매번 검증</b>(If-None-Match → 304)한다.", "w4.cache"],
  ["304 Not Modified는 캐시 검증 결과 기존 캐시를 그대로 써도 된다는 응답이며 본문이 없다.", "O", "304 = “네가 가진 사본(ETag) 그대로 써도 된다”. 본문 없이 헤더만 와서 전송량이 줄어든다.", "w4.cache"],
  ["TLS에서 실제 데이터 암호화에는 주로 공개키 암호(RSA 등)가 쓰이고, 대칭키 암호는 신원 증명에만 쓰인다.", "X", "<b>반대</b>다. 실제 데이터는 빠른 <b>대칭키</b>(AES-GCM 등)로 암호화하고, 공개키·서명(ECDHE·RSA·ECDSA)은 <b>키 교환과 신원 증명</b>에 쓴다.", "w4.tls"],
  ["Forward Secrecy가 보장되면 서버 개인키가 나중에 유출되더라도 과거에 기록된 트래픽을 복호화할 수 없다.", "O", "(EC)DHE로 연결마다 <b>일회용 키</b>를 만들고 버리므로, 서버 장기 개인키가 유출돼도 과거 세션 키를 계산할 수 없다.", "w4.tls"],
  ["TLS 0-RTT 재개 방식의 첫 데이터는 재전송(replay) 공격 위험이 있어 멱등 요청에만 사용하는 것이 바람직하다.", "O", "0-RTT 첫 데이터는 공격자가 <b>그대로 다시 보낼(replay)</b> 수 있다. GET처럼 반복돼도 안전한 <b>멱등 요청</b>에만 쓴다.", "w4.tls"],
  ["CORS는 서버를 보호하기 위해 서버가 다른 출처에서 온 요청을 네트워크 단계에서 차단하는 규칙이다.", "X", "CORS는 <b>브라우저</b>가 사용자를 보호하려고 다른 Origin 응답을 <b>JS가 읽지 못하게</b> 하는 규칙이다. 요청은 서버에 도달하며 curl에는 적용되지 않는다. 서버 보호는 인증·인가로.", "w5.origin"],
  ["신규 HTTPS 연결(TCP + TLS 1.3)에서 첫 요청의 응답을 받기까지는, DNS 조회를 제외하면 대략 TCP 1 RTT + TLS 1 RTT + HTTP 1 RTT가 든다.", "O", "DNS 제외 시 TCP handshake 1 RTT + TLS 1.3 1 RTT + HTTP 요청/응답 1 RTT ≈ <b>3 RTT</b>.", "w4.cost"],
  ["ERR_NAME_NOT_RESOLVED는 TCP 연결 단계의 실패이므로 서버 실행 여부와 방화벽부터 확인해야 한다.", "X", "ERR_NAME_NOT_RESOLVED는 <b>DNS 단계</b> 실패(이름 → IP 실패)다. 도메인 오타·레코드·DNS 설정을 nslookup으로 확인한다. TCP는 시작도 안 했다.", "w4.diag"],
  ["Virtual Hosting은 하나의 IP·포트에 여러 사이트를 두고 HTTP의 Host 헤더로 구분하는 방식이다.", "O", "한 IP:443에 여러 사이트가 있어도 HTTP <b>Host 헤더</b>(HTTPS면 TLS의 SNI도)로 어느 사이트인지 구분한다.", "w4.msg"],
  ["curl --resolve 옵션을 사용하면 이름을 특정 IP로 고정해 DNS 문제와 서버 문제를 구분할 수 있다.", "O", "<code>curl --resolve host:443:IP</code>로 DNS를 건너뛰고 특정 IP에 붙어 본다. 성공하면 DNS 문제, 실패하면 서버·경로 문제.", "w4.obs"]
];
OXBANK.quiz = QZ;

/* ---------- Week 5 OX (new) ---------- */
OXBANK.w5 = [
  ['REST는 HTTP 위에서 동작하는 별도의 통신 프로토콜이다.', 'X', 'REST는 프로토콜이 아니라 <b>설계 스타일</b>(Roy Fielding, 2000)이다. 지켜야 할 <b>제약의 묶음</b>이며, 실제 전송은 HTTP가 한다.', 'w5.rest'],
  ['REST의 제약에는 Client-Server, Stateless, Cacheable, Uniform Interface, Layered System이 있고 Code on Demand는 선택 사항이다.', 'O', '6가지 제약 중 Code on Demand만 <b>선택</b>이다. 그중 핵심은 Uniform Interface.', 'w5.rest'],
  ['HTTP와 JSON을 사용하는 API는 자동으로 RESTful하다.', 'X', 'HTTP+JSON은 <b>수단</b>일 뿐이다. 동사 URI · 모든 요청을 POST · 항상 200 같은 설계라면 HTTP+JSON이어도 REST가 아니다.', 'w5.rest'],
  ['API는 클라이언트와 서버 사이의 “계약”으로, 요청 형식 · 응답 형식 · 오류 형식을 미리 약속한 것이다.', 'O', '식당 메뉴판 비유 — 무엇을(자원) 어떻게 주문하고(Method·Body) 무엇이 나오는지(응답·상태 코드)를 미리 약속한다.', 'w5.contract'],
  ['Richardson 성숙도 모델에서 Level 2는 자원별 URI에 HTTP Method와 상태 코드를 의미대로 사용하는 단계이다.', 'O', 'Level 0 = 한 endpoint에 전부 POST, 1 = 자원별 URI, <b>2 = + HTTP Method·상태 코드</b>, 3 = + HATEOAS. 대부분의 실무 REST API가 Level 2.', 'w5.uniform'],
  ['Richardson Level 0은 하나의 endpoint로 모든 요청을 POST로 보내는 방식이다.', 'O', '“/api에 POST하고 Body 안에 action을 적는” POX·RPC 스타일. HTTP는 운반 수단으로만 쓰인다.', 'w5.uniform'],
  ['HATEOAS는 Richardson 성숙도 Level 1에 해당한다.', 'X', 'HATEOAS(응답에 다음 행동의 링크 포함)는 <b>Level 3</b>이다. Level 1은 자원별 URI를 나누는 단계.', 'w5.uniform'],
  ['Resource는 서버가 가진 개념적 대상이고, Representation은 그 상태를 JSON · XML 등으로 표현해 주고받는 형태이다.', 'O', '사람(Resource)과 사진(Representation) 비유 — 주고받는 것은 사진이지 사람 자체가 아니다.', 'w5.repr'],
  ['같은 자원에 JSON과 XML 등 여러 Representation이 있을 수 있고, 클라이언트는 Accept 헤더로 원하는 형식을 요청할 수 있다.', 'O', 'Content Negotiation — 요청의 <b>Accept</b>로 원하는 형식을 말하고, 응답의 <b>Content-Type</b>으로 실제 형식을 알린다.', 'w5.repr'],
  ['/getStudents, /deleteStudent처럼 URI에 동사를 넣는 것이 REST에서 권장된다.', 'X', 'URI는 <b>명사(자원)</b>, 행위는 <b>Method</b>로. <code>GET /students</code>, <code>DELETE /students/10</code>.', 'w5.uri'],
  ['REST URI에서 컬렉션은 보통 복수형 명사(/students)로 쓴다.', 'O', '/students(컬렉션) → /students/10(아이템). 소문자 · 하이픈 · 끝 슬래시 없음도 함께 지킨다.', 'w5.uri'],
  ['필터·정렬 조건은 /students/grade/3/sort/name처럼 경로 계층에 넣는 것이 권장된다.', 'X', '경로는 <b>자원의 위치</b>, 조건은 <b>query string</b> — <code>/students?grade=3&sort=name</code>.', 'w5.page'],
  ['/students/10/courses는 학생 10이 수강하는 과목이라는 Sub-resource를 나타낸다.', 'O', 'Collection(/students) · Item(/students/10) · Sub-resource(/students/10/courses)로 자원 트리를 만든다.', 'w5.tree'],
  ['중첩 URI는 깊을수록 관계가 명확해지므로 4~5단계 이상으로 깊게 만드는 것이 좋다.', 'X', '중첩은 <b>2단계 이내</b>가 권장된다. 깊어지면 URI가 길고 깨지기 쉬워진다 — 필요하면 /enrollments처럼 독립 자원으로 뺀다.', 'w5.tree'],
  ['POST로 자원을 생성하면 201 Created와 함께 Location 헤더로 새 자원의 URI를 알려 주는 것이 좋다.', 'O', '새 id는 서버가 정하므로 <b>Location: /students/11</b>로 돌려주면 클라이언트가 바로 GET할 수 있다.', 'w5.crud'],
  ['DELETE에 성공하고 돌려줄 본문이 없으면 204 No Content가 적절하다.', 'O', '204 = 성공, Body 없음.', 'w5.crud'],
  ['PUT 요청 Body에서 빠진 필드는 기존 값이 그대로 유지된다.', 'X', '그건 <b>PATCH</b>다. PUT은 Body를 자원의 완전한 새 표현으로 보고 통째로 교체하므로 빠진 필드는 <b>삭제·기본값</b>이 된다.', 'w5.putpatch'],
  ['PATCH는 바꾸려는 필드만 보내는 부분 수정이다.', 'O', '<code>PATCH /students/10 {"grade": 4}</code> — 나머지 필드는 그대로.', 'w5.putpatch'],
  ['“로그인”, “결제 승인”처럼 CRUD로 표현하기 어려운 행위는 /sessions, /payments처럼 행위의 결과를 명사 자원으로 모델링할 수 있다.', 'O', '행위를 <b>명사화</b>한다 — 로그인 = 세션 생성(POST /sessions), 결제 = 결제 자원 생성(POST /payments).', 'w5.putpatch'],
  ['이미 등록된 학번으로 다시 생성을 시도하는 것처럼 현재 자원 상태와 충돌하면 409 Conflict가 적절하다.', 'O', '형식은 맞지만 <b>현재 상태와 충돌</b> → 409. 형식이 틀리면 400/422, 대상이 없으면 404.', 'w5.status'],
  ['요청 JSON의 문법은 맞지만 값이 Schema 규칙(예: grade=7, 1~4만 허용)을 어기면 FastAPI는 422를 반환한다.', 'O', 'JSON 자체가 깨지면 400 계열, 문법은 맞는데 값이 규칙 위반이면 <b>422 Unprocessable</b>. FastAPI는 둘 다 Validation 단계에서 422로 응답한다.', 'w5.json'],
  ['오류가 나도 항상 200 OK와 {"success": false}를 반환하면 클라이언트가 처리하기 쉬워 권장된다.', 'X', '상태 코드가 거짓말을 하면 캐시·모니터링·재시도 로직이 모두 “성공”으로 착각한다. <b>상태 코드 + 일관된 오류 Body</b>가 계약이다.', 'w5.error'],
  ['오류 응답 Body에 stack trace나 내부 파일 경로를 자세히 담는 것은 운영 환경에서도 권장된다.', 'X', '내부 구조가 공격자에게 노출된다. 운영에서는 <b>code · message · 요청 id</b> 정도만, 자세한 내용은 서버 로그에.', 'w5.error'],
  ['FastAPI가 422를 반환했다면 handler 함수는 실행되지 않은 것이다.', 'O', 'Router → <b>Validation(422)</b> → Handler 순서다. 검증에서 걸리면 handler까지 가지 않는다.', 'w5.pipe'],
  ['500 Internal Server Error는 요청 검증 단계에서 입력 형식이 틀렸을 때 반환된다.', 'X', '입력 형식 오류는 422(검증 단계). 500은 handler · DB 등 <b>검증 이후</b> 서버 내부에서 처리 못 한 예외다.', 'w5.pipe'],
  ['Pydantic(기본 모드)의 int 필드에 문자열 "3"은 3으로 변환되어 통과하지만 3.5는 422가 난다.', 'O', '기본(lax) 모드는 손실 없는 변환만 허용한다. "3" → 3 OK, 3.0 OK, <b>3.5는 소수부 손실</b>이라 거부(int_from_float).', 'w5.json'],
  ['요청 Schema와 응답 Schema를 분리하면 비밀번호 같은 내부 필드가 응답에 노출되는 것을 막을 수 있다.', 'O', 'StudentIn(입력)과 StudentOut(출력)을 나누면 response_model이 <b>출력 필터</b> 역할을 한다.', 'w5.json'],
  ['목록 조회 API에는 limit 상한을 두어 한 번에 너무 많은 데이터를 돌려주지 않도록 하는 것이 좋다.', 'O', '<code>?limit=1000000</code> 한 번에 서버가 멈추지 않도록 상한(예: 100)을 두고 페이지네이션한다.', 'w5.page'],
  ['응답에서 기존 필드를 삭제하거나 의미를 바꾸는 것은 하위 호환성을 깨는 변경이라 새 버전(/v2)이 필요할 수 있다.', 'O', '이미 그 필드를 쓰는 클라이언트가 깨진다 → Breaking change → 새 버전.', 'w5.version'],
  ['응답 JSON에 새 필드를 추가하는 것은 일반적으로 하위 호환성을 깨는 Breaking change이다.', 'X', '필드 <b>추가</b>는 보통 호환된다(클라이언트는 모르는 필드를 무시). 삭제·이름 변경·타입 변경·필수 요청 필드 추가가 깨는 변경.', 'w5.version'],
  ['OpenAPI는 REST API 계약을 기계가 읽을 수 있는 형식(JSON·YAML)으로 적은 명세이고, Swagger UI는 그 명세를 브라우저에서 보고 실행해 보는 도구이다.', 'O', 'FastAPI는 코드와 Schema에서 /openapi.json을 자동 생성하고 /docs에 Swagger UI를 띄운다.', 'w5.openapi'],
  ['Stateless란 서버가 DB에도 아무 데이터를 저장하지 않는다는 뜻이다.', 'X', 'Stateless는 <b>요청 사이의 세션 상태를 서버 메모리에 두지 않는다</b>는 뜻이다. 각 요청이 자기완결적이고, 데이터는 DB·Redis 같은 공유 저장소에 둔다.', 'w5.stateless'],
  ['Stateless 설계에서는 요청마다 필요한 정보(토큰 등)를 담아 보내므로, LB가 어느 서버로 보내도 처리할 수 있어 Scale-out이 쉽다.', 'O', '특정 서버에 붙어 있을 필요(sticky session)가 없으니 서버를 늘리기만 하면 된다.', 'w5.stateless'],
  ['401은 인증(누구인지) 실패, 403은 인가(권한) 실패이다.', 'O', '401 → 다시 로그인하면 해결될 수 있다. 403 → 다시 로그인해도 같다.', 'w5.auth'],
  ['JWT 같은 Bearer 토큰은 보통 Authorization: Bearer &lt;token&gt; 헤더로 보낸다.', 'O', '토큰 자체에 사용자 정보와 서명이 들어 있어 서버가 세션 저장소 없이 검증할 수 있다(Stateless와 잘 맞음).', 'w5.auth'],
  ['Origin은 scheme + host + port로 구성되며, 셋 중 하나라도 다르면 다른 Origin이다.', 'O', 'http://localhost:5500 과 http://localhost:8000 은 <b>port</b>가 달라 다른 Origin.', 'w5.origin'],
  ['http://localhost:5500과 http://127.0.0.1:5500은 같은 컴퓨터이므로 같은 Origin이다.', 'X', '브라우저는 host를 <b>문자열로</b> 비교한다. 같은 컴퓨터여도 <b>다른 Origin</b>.', 'w5.origin'],
  ['CORS 오류가 났다면 요청은 서버에 도달조차 하지 못한 것이다.', 'X', 'Simple Request는 서버가 <b>처리하고 응답까지 보냈다</b>. 브라우저가 Allow-Origin 헤더가 없다며 그 응답을 JS에 넘겨주지 않을 뿐이다(서버 로그에는 200이 찍힌다).', 'w5.cors'],
  ['Content-Type: application/json으로 POST하는 fetch는 Simple Request가 아니어서 브라우저가 OPTIONS Preflight를 먼저 보낸다.', 'O', 'Simple이 허용하는 Content-Type은 text/plain · x-www-form-urlencoded · multipart/form-data — HTML form이 원래 보낼 수 있던 것뿐.', 'w5.preflight'],
  ['Authorization 같은 커스텀 헤더를 붙여도 Simple Request 조건은 유지된다.', 'X', '허용 목록 밖의 헤더(Authorization 등)가 붙으면 <b>Preflight</b> 대상이다. 서버는 Allow-Headers에 그 헤더를 넣어 답해야 한다.', 'w5.preflight'],
  ['credentials(쿠키)를 포함하는 요청에는 Access-Control-Allow-Origin: * 를 쓸 수 없다.', 'O', '규격상 브라우저가 거부한다. <b>명시적 Origin 목록</b>을 써야 한다.', 'w5.headers'],
  ['프론트엔드 JS가 응답의 Location 헤더를 읽으려면 서버가 Access-Control-Expose-Headers로 노출을 허용해야 한다.', 'O', '기본으로 노출되는 응답 헤더는 몇 개뿐이다. expose_headers를 빼면 Location이 null로 읽힌다(Lab ② C).', 'w5.headers'],
  ['CORS 오류는 프론트엔드 fetch 코드의 옵션만 바꾸면 해결되며 서버 설정과는 무관하다.', 'X', '허용 여부는 <b>서버 응답 헤더</b>가 정한다. mode: "no-cors"는 오류만 숨기고 응답을 읽을 수 없게 만든다. 서버의 allow_origins를 고치는 것이 정답.', 'w5.debug'],
  ['프론트엔드와 API를 같은 Origin(예: 리버스 프록시의 /api 경로)으로 묶으면 CORS 자체가 필요 없어진다.', 'O', '브라우저 입장에서 같은 Origin 호출이 되므로 SOP에 걸리지 않는다 — “아예 없애는 구조”.', 'w5.debug'],
];

/* ---------- Abbreviations [abbr, accepted full forms, week groups] (용어표 Week1-2/3/4/5) ---------- */
const ABBR = [
  ["ACL", ["Access Control List"], ["w1-2"]],
  ["AI", ["Artificial Intelligence"], ["w1-2"]],
  ["ALB", ["Application Load Balancer"], ["w1-2"]],
  ["API", ["Application Programming Interface"], ["w1-2", "w5"]],
  ["ARP", ["Address Resolution Protocol"], ["w1-2"]],
  ["AZ", ["Availability Zone"], ["w1-2"]],
  ["BLE", ["Bluetooth Low Energy"], ["w1-2"]],
  ["CDN", ["Content Delivery Network"], ["w1-2", "w4", "w5"]],
  ["CIDR", ["Classless Inter-Domain Routing"], ["w1-2"]],
  ["DHCP", ["Dynamic Host Configuration Protocol"], ["w1-2"]],
  ["DNS", ["Domain Name System"], ["w1-2", "w3", "w4", "w5"]],
  ["DORA", ["Discover · Offer · Request · ACK"], ["w1-2"]],
  ["GPU", ["Graphics Processing Unit"], ["w1-2"]],
  ["HTTP", ["HyperText Transfer Protocol"], ["w1-2", "w3", "w4", "w5"]],
  ["HTTPS", ["HyperText Transfer Protocol Secure"], ["w1-2", "w4", "w5"]],
  ["IGW", ["Internet Gateway"], ["w1-2"]],
  ["IoT", ["Internet of Things"], ["w1-2", "w5"]],
  ["IP", ["Internet Protocol"], ["w1-2", "w3"]],
  ["ISP", ["Internet Service Provider"], ["w1-2"]],
  ["LAN", ["Local Area Network"], ["w1-2"]],
  ["LB", ["Load Balancer"], ["w1-2", "w3", "w4", "w5"]],
  ["MAC", ["Media Access Control"], ["w1-2"]],
  ["MQTT", ["Message Queuing Telemetry Transport"], ["w1-2"]],
  ["NAPT", ["Network Address Port Translation"], ["w1-2"]],
  ["NAT", ["Network Address Translation"], ["w1-2"]],
  ["NIC", ["Network Interface Card"], ["w1-2"]],
  ["PAT", ["Port Address Translation"], ["w1-2"]],
  ["QUIC", ["Quick UDP Internet Connections"], ["w1-2", "w3", "w4"]],
  ["REST", ["Representational State Transfer"], ["w1-2", "w5"]],
  ["RTT", ["Round-Trip Time"], ["w1-2", "w3", "w4", "w5"]],
  ["SSH", ["Secure Shell"], ["w1-2", "w3"]],
  ["SSL", ["Secure Sockets Layer (TLS의 이전 이름)"], ["w1-2", "w4"]],
  ["TCP", ["Transmission Control Protocol"], ["w1-2", "w3", "w4", "w5"]],
  ["TLS", ["Transport Layer Security"], ["w1-2", "w3", "w4", "w5"]],
  ["UDP", ["User Datagram Protocol"], ["w1-2", "w3", "w4"]],
  ["URL", ["Uniform Resource Locator"], ["w1-2", "w4", "w5"]],
  ["VPC", ["Virtual Private Cloud"], ["w1-2"]],
  ["WAN", ["Wide Area Network"], ["w1-2"]],
  ["ACK", ["Acknowledgment"], ["w3"]],
  ["AF_INET", ["Address Family: Internet (IPv4)"], ["w3"]],
  ["AF_UNIX", ["Address Family: Unix (local)"], ["w3"]],
  ["AIMD", ["Additive Increase, Multiplicative Decrease"], ["w3"]],
  ["BBR", ["Bottleneck Bandwidth and Round-trip propagation time"], ["w3"]],
  ["BDP", ["Bandwidth-Delay Product"], ["w3"]],
  ["cwnd", ["congestion window"], ["w3"]],
  ["DEMUX", ["Demultiplexing"], ["w3"]],
  ["EADDRINUSE", ["Error: Address In Use"], ["w3"]],
  ["EMFILE", ["Error: Too Many (open) Files"], ["w3"]],
  ["EPIPE", ["Error: Broken Pipe"], ["w3"]],
  ["FCS", ["Frame Check Sequence"], ["w3"]],
  ["FD", ["File Descriptor"], ["w3"]],
  ["FIN", ["Finish"], ["w3"]],
  ["gRPC", ["gRPC Remote Procedure Call", "Google Remote Procedure Call"], ["w3", "w5"]],
  ["HOL", ["Head-of-Line (Blocking)"], ["w3", "w4"]],
  ["IANA", ["Internet Assigned Numbers Authority"], ["w3"]],
  ["ISN", ["Initial Sequence Number"], ["w3"]],
  ["LLM", ["Large Language Model"], ["w3", "w4", "w5"]],
  ["mDNS", ["multicast DNS"], ["w3"]],
  ["MSL", ["Maximum Segment Lifetime"], ["w3"]],
  ["MSS", ["Maximum Segment Size"], ["w3"]],
  ["MTU", ["Maximum Transmission Unit"], ["w3"]],
  ["MUX", ["Multiplexing"], ["w3"]],
  ["nc", ["netcat"], ["w3"]],
  ["PSH", ["Push"], ["w3"]],
  ["RST", ["Reset"], ["w3"]],
  ["RTO", ["Retransmission Timeout"], ["w3"]],
  ["RTTVAR", ["RTT Variation"], ["w3"]],
  ["rwnd", ["receive window"], ["w3"]],
  ["SACK", ["Selective Acknowledgment"], ["w3"]],
  ["SO_REUSEADDR", ["Socket Option: Reuse Address"], ["w3"]],
  ["SOCK_DGRAM", ["Socket type: Datagram (UDP)"], ["w3"]],
  ["SOCK_STREAM", ["Socket type: Stream (TCP)"], ["w3"]],
  ["SRTT", ["Smoothed RTT"], ["w3"]],
  ["ss", ["socket statistics"], ["w3"]],
  ["SSE", ["Server-Sent Events"], ["w3", "w4", "w5"]],
  ["ssthresh", ["slow start threshold"], ["w3"]],
  ["SYN", ["Synchronize"], ["w3"]],
  ["TCB", ["Transmission Control Block"], ["w3"]],
  ["URG", ["Urgent"], ["w3"]],
  ["AAAA", ["IPv6 Address record (quad-A)"], ["w4"]],
  ["ACME", ["Automatic Certificate Management Environment"], ["w4"]],
  ["AEAD", ["Authenticated Encryption with Associated Data"], ["w4"]],
  ["AES", ["Advanced Encryption Standard"], ["w4"]],
  ["ALPN", ["Application-Layer Protocol Negotiation"], ["w4"]],
  ["CA", ["Certificate Authority"], ["w4"]],
  ["CAA", ["Certification Authority Authorization"], ["w4"]],
  ["ccTLD", ["country-code Top-Level Domain"], ["w4"]],
  ["CN", ["Common Name"], ["w4"]],
  ["CNAME", ["Canonical Name"], ["w4"]],
  ["CORS", ["Cross-Origin Resource Sharing"], ["w4", "w5"]],
  ["CRL", ["Certificate Revocation List"], ["w4"]],
  ["CRLF", ["Carriage Return + Line Feed"], ["w4"]],
  ["DoH", ["DNS over HTTPS"], ["w4"]],
  ["DoT", ["DNS over TLS"], ["w4"]],
  ["DV", ["Domain Validation"], ["w4"]],
  ["ECDHE", ["Elliptic Curve Diffie-Hellman Ephemeral"], ["w4"]],
  ["ECDSA", ["Elliptic Curve Digital Signature Algorithm"], ["w4"]],
  ["ECH", ["Encrypted Client Hello"], ["w4"]],
  ["ETag", ["Entity Tag"], ["w4"]],
  ["FQDN", ["Fully Qualified Domain Name"], ["w4"]],
  ["gTLD", ["generic Top-Level Domain"], ["w4"]],
  ["HPACK", ["HTTP/2 Header Compression"], ["w4"]],
  ["HSTS", ["HTTP Strict Transport Security"], ["w4"]],
  ["JSON", ["JavaScript Object Notation"], ["w4", "w5"]],
  ["JWT", ["JSON Web Token"], ["w4", "w5"]],
  ["MIME", ["Multipurpose Internet Mail Extensions"], ["w4", "w5"]],
  ["MX", ["Mail Exchange"], ["w4"]],
  ["NS", ["Name Server"], ["w4"]],
  ["NXDOMAIN", ["Non-Existent Domain"], ["w4"]],
  ["OCSP", ["Online Certificate Status Protocol"], ["w4"]],
  ["PFS", ["Perfect Forward Secrecy"], ["w4"]],
  ["PTR", ["Pointer (reverse record)"], ["w4"]],
  ["QPACK", ["HTTP/3 Header Compression (QUIC)"], ["w4"]],
  ["RSA", ["Rivest–Shamir–Adleman"], ["w4"]],
  ["SAN", ["Subject Alternative Name"], ["w4"]],
  ["SERVFAIL", ["Server Failure"], ["w4"]],
  ["SNI", ["Server Name Indication"], ["w4"]],
  ["SOA", ["Start of Authority"], ["w4"]],
  ["TLD", ["Top-Level Domain"], ["w4"]],
  ["TTFB", ["Time To First Byte"], ["w4"]],
  ["TTFT", ["Time To First Token"], ["w4"]],
  ["TTL", ["Time To Live"], ["w4"]],
  ["TXT", ["Text record"], ["w4"]],
  ["ASGI", ["Asynchronous Server Gateway Interface"], ["w5"]],
  ["CRUD", ["Create · Read · Update · Delete"], ["w5"]],
  ["CSRF", ["Cross-Site Request Forgery"], ["w5"]],
  ["DB", ["Database"], ["w5"]],
  ["HATEOAS", ["Hypermedia As The Engine Of Application State"], ["w5"]],
  ["HTML", ["HyperText Markup Language"], ["w5"]],
  ["ISO", ["International Organization for Standardization"], ["w5"]],
  ["JS", ["JavaScript"], ["w5"]],
  ["JSP", ["JavaServer Pages"], ["w5"]],
  ["OAS", ["OpenAPI Specification"], ["w5"]],
  ["OAuth", ["Open Authorization"], ["w5"]],
  ["ORM", ["Object-Relational Mapping"], ["w5"]],
  ["POX", ["Plain Old XML"], ["w5"]],
  ["RFC", ["Request for Comments"], ["w5"]],
  ["RMM", ["Richardson Maturity Model"], ["w5"]],
  ["RPC", ["Remote Procedure Call"], ["w5"]],
  ["SOP", ["Same-Origin Policy"], ["w5"]],
  ["SPA", ["Single Page Application"], ["w5"]],
  ["SQL", ["Structured Query Language"], ["w5"]],
  ["SSR", ["Server-Side Rendering"], ["w5"]],
  ["UI", ["User Interface"], ["w5"]],
  ["URI", ["Uniform Resource Identifier"], ["w5"]],
  ["XHR", ["XMLHttpRequest"], ["w5"]],
  ["XML", ["eXtensible Markup Language"], ["w5"]],
  ["XSS", ["Cross-Site Scripting"], ["w5"]],
  ["YAML", ["YAML Ain't Markup Language"], ["w5"]]
];
const AB_EXTRA = { MAC: ['Medium Access Control'], ACK: ['Acknowledgement'], SACK: ['Selective Acknowledgement'], SSL: ['Secure Socket Layer'], HOL: ['Head-of-Line Blocking'], cwnd: ['Congestion Window'], rwnd: ['Receive Window'], CRLF: ['Carriage Return Line Feed'] };
ABBR.forEach(r => { if (AB_EXTRA[r[0]]) r[1] = r[1].concat(AB_EXTRA[r[0]]); });
/* descriptive glossary entries that are not real expansions — practice only, never in the mock exam */
const AB_SKIP = new Set(['AAAA', 'TXT', 'HPACK', 'QPACK', 'SOCK_DGRAM', 'SOCK_STREAM', 'AF_INET', 'AF_UNIX', 'nc', 'ss', 'JS', 'DB', 'UI', 'AI', 'gRPC']);
const AB_WK = { 'w1-2': '1–2주', w3: '3주', w4: '4주', w5: '5주' };
const abNorm = s => String(s).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]/g, '').replace(/s$/, '');
function abCheck(input, forms) {
  const a = abNorm(input); if (!a) return false;
  return forms.some(f => abNorm(f) === a || String(f).toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '') === a);
}
const abWeeksOf = r => r[2].map(g => g === 'w1-2' ? ['w1', 'w2'] : [g]).flat();

/* ---------- Short essays: concept / flow (Quick Check of every week + these) ---------- */
const ESSAY = [
  { w: 'w1', q: '“인터넷은 Network of Networks다”라는 말의 의미를 IP의 역할과 함께 설명하라.', ref: 'w1.internet', model: '인터넷은 하나의 거대한 네트워크가 아니라 가정 · 학교 · ISP · 클라우드 등 <b>독립적으로 운영되는 네트워크들</b>이 서로 연결된 것이다. 서로 다른 네트워크가 대화할 수 있는 것은 <b>공통 프로토콜 IP</b>로 주소를 정하고 Router가 네트워크 사이로 패킷을 전달하기 때문이다.', kw: ['독립 네트워크들의 연결', '공통 프로토콜 IP', 'Router가 네트워크 사이 전달'] },
  { w: 'w1', q: 'Client와 Server가 “장치 종류가 아니라 역할”이라는 말을 예를 들어 설명하라.', ref: 'w1.cs', model: '먼저 <b>요청하는 쪽이 Client</b>, 기다렸다가 <b>응답하는 쪽이 Server</b>다. 같은 노트북이 브라우저로는 Client, FastAPI(localhost:8000)를 띄우면 Server가 된다. API Server도 DB에 질의할 때는 Client다.', kw: ['요청 = Client · 응답 = Server', '같은 장치가 둘 다 가능', '예: 노트북 · API Server→DB'] },
  { w: 'w1', q: 'Cloud와 Edge에 각각 어떤 처리를 두는 것이 좋은지, 스마트 카메라 예로 설명하라.', ref: 'w1.place', model: 'Edge(현장)에서 영상을 <b>먼저 추론(local inference)</b>해 즉시 판단하고 <b>이벤트·특징만</b> 올리면 <b>지연 ↓ · 트래픽 ↓ · 개인정보 노출 ↓</b>. Cloud는 <b>장기 저장 · 통합 분석 · 모델 학습·배포</b>를 맡는다. 대체가 아니라 보완 관계.', kw: ['Edge = 즉시 판단 · 지연↓', '이벤트만 전송 → 트래픽↓', 'Cloud = 저장·분석·학습', '보완 관계'] },
  { w: 'w1', q: '네트워크 문제를 “어느 계층의 문제인가”로 나누어 보는 이유를 계층별 예와 함께 설명하라.', ref: 'w1.layer', model: '계층마다 <b>책임과 도구</b>가 다르기 때문이다. L7(HTTP·DNS: 404, 이름 해석 실패) · L4(TCP·UDP·Port: refused, timeout) · L3(IP·라우팅: 경로, subnet) · L2/L1(MAC·Wi-Fi·케이블). 아래 계층이 실패하면 위 계층은 동작할 수 없으므로 계층을 정하면 <b>조사 범위가 좁혀진다</b>.', kw: ['계층마다 책임·도구가 다름', '계층별 예 2개 이상', '조사 범위를 좁힘'] },
  { w: 'w1', q: 'Latency · Bandwidth · Throughput를 구분해 설명하고, 1 Gbps 회선인데도 느릴 수 있는 이유를 말하라.', ref: 'w1.perf', model: '<b>Latency</b> = 한 비트(요청)가 도착하기까지 걸리는 시간(전파·처리·큐잉). <b>Bandwidth</b> = 링크가 초당 실을 수 있는 최대량. <b>Throughput</b> = 실제로 전달된 양으로 경로상 <b>병목</b>이 결정한다. 1 Gbps는 Bandwidth일 뿐이라 먼 거리(RTT)·혼잡(큐잉)·좁은 구간이 있으면 느리다.', kw: ['Latency = 시간', 'Bandwidth = 최대 용량', 'Throughput = 실제 양 · 병목', '대역폭이 커도 지연은 별개'] },
  { w: 'w2', q: '같은 subnet인지 판단하는 방법과, 다를 때 패킷이 어디로 가는지 설명하라.', ref: 'w2.decide', model: '내 IP와 목적지 IP를 각각 <b>Subnet Mask와 AND</b>해 네트워크 주소를 비교한다. 같으면 <b>ARP로 상대 MAC</b>을 알아내 직접 보낸다. 다르면 <b>Default Gateway</b>의 MAC으로 프레임을 보내 Router에 맡긴다.', kw: ['IP AND Mask 비교', '같으면 ARP → 직접 전달', '다르면 Default Gateway'] },
  { w: 'w2', q: '집 PC(192.168.0.23)가 인터넷 서버로 요청을 보낼 때 IP·MAC·Port가 어떻게 바뀌는지 흐름으로 설명하라.', ref: 'w2.hop', model: '① 목적지가 subnet 밖 → Gateway 행. ARP로 공유기 MAC을 얻어 <b>목적지 MAC = 공유기</b>. ② 공유기 NAT(PAT)가 <b>출발지 192.168.0.23:51500 → Public IP:새 포트</b>로 바꾸고 테이블에 기록. ③ 이후 Router를 지날 때마다 <b>MAC은 매 hop 새로</b> 쓰고 IP는 유지. ④ 응답은 Public IP:포트로 돌아와 NAT 테이블로 <b>역변환</b>되어 PC에 도착.', kw: ['Gateway MAC (ARP)', 'NAT: 출발지 IP·Port 변환', 'MAC은 hop마다, IP는 유지', '응답은 NAT 테이블로 역변환'] },
  { w: 'w2', q: 'Longest Prefix Match와 Default Route(0.0.0.0/0)의 관계를 설명하라.', ref: 'w2.route', model: 'Router는 목적지와 매칭되는 경로 중 <b>prefix가 가장 긴(가장 구체적인)</b> 경로를 고른다. 0.0.0.0/0은 모든 주소와 매칭되지만 길이가 0이라 <b>더 구체적인 경로가 없을 때만</b> 쓰이는 기본 경로다. Router는 최종 경로가 아니라 <b>next hop</b>만 결정한다.', kw: ['가장 긴 prefix 우선', '/0 = 마지막 후보', 'next hop만 결정'] },
  { w: 'w2', q: 'DHCP로 주소를 받는 과정(DORA)을 설명하라.', ref: 'w2.dhcp', model: '<b>Discover</b>(주소 없는 클라이언트가 브로드캐스트) → <b>Offer</b>(서버가 쓸 주소 제안) → <b>Request</b>(그 주소를 쓰겠다고 요청) → <b>ACK</b>(확정). IP·Mask·Gateway·DNS를 함께 받고, 주소는 <b>Lease</b> 기간 동안 빌려 쓰며 갱신한다.', kw: ['Discover → Offer → Request → ACK', '처음엔 브로드캐스트', 'Gateway·DNS도 받음', 'Lease(임대)'] },
  { w: 'w2', q: '서버를 0.0.0.0:8000에 bind했는데 인터넷에서 접속이 안 된다. 이유와 필요한 것을 설명하라.', ref: 'w2.expose', model: '0.0.0.0은 “이 PC의 <b>모든 NIC</b>에서 받겠다”는 뜻일 뿐이다. PC는 Private IP라 인터넷에서 직접 닿지 않는다. <b>Public IP + 공유기 포트포워딩(또는 터널) + OS 방화벽·SG 허용</b>이 각각 필요하다.', kw: ['0.0.0.0 = 모든 NIC', 'Private IP는 라우팅 안 됨', '포트포워딩/터널', '방화벽 허용'] },
  { w: 'w3', q: 'TCP 3-way handshake 과정과 세 번째 ACK가 필요한 이유를 설명하라.', ref: 'w3.hs', model: 'Client <b>SYN(seq=x)</b> → Server <b>SYN+ACK(seq=y, ack=x+1)</b> → Client <b>ACK(ack=y+1)</b>. 양쪽이 서로의 ISN을 확인하고 연결 상태(ESTABLISHED)를 만든다. 세 번째 ACK가 있어야 Server가 Client의 수신 능력과 의도를 확인하고, <b>오래된 중복 SYN</b>으로 잘못된 연결이 생기는 것을 막는다.', kw: ['SYN → SYN+ACK → ACK', 'ISN 교환', '오래된 중복 SYN 방지'] },
  { w: 'w3', q: 'TCP 연결 종료 과정과 TIME_WAIT이 존재하는 이유를 설명하라.', ref: 'w3.close', model: '먼저 닫는 쪽 <b>FIN</b> → 상대 <b>ACK</b>(상대는 CLOSE_WAIT) → 상대가 close() 후 <b>FIN</b> → 먼저 닫은 쪽 <b>ACK</b> 후 <b>TIME_WAIT(2×MSL)</b>. 이유: 마지막 ACK가 유실되면 다시 오는 FIN에 답하기 위해, 그리고 늦게 도착하는 옛 패킷이 같은 4-tuple의 새 연결에 섞이지 않도록.', kw: ['FIN · ACK · FIN · ACK', '먼저 닫은 쪽이 TIME_WAIT', '2×MSL', '마지막 ACK 유실 대비 · 늦은 패킷 흡수'] },
  { w: 'w3', q: 'TCP 혼잡 제어에서 cwnd가 어떻게 변하는지 Slow Start · Congestion Avoidance · 손실 대응으로 설명하라.', ref: 'w3.cc', model: '<b>Slow Start</b>: cwnd=1에서 RTT마다 2배. <b>ssthresh</b>에 닿으면 <b>Congestion Avoidance</b>: RTT마다 +1(AIMD). 손실 시 ssthresh = cwnd/2로 낮추고, <b>3 dup ACK</b>면 cwnd ½(빠른 재전송·회복), <b>타임아웃</b>이면 cwnd = 1로 Slow Start부터.', kw: ['Slow Start ×2', 'ssthresh 이후 +1', '3 dup ACK → ½', '타임아웃 → 1'] },
  { w: 'w3', q: 'Flow control과 Congestion control의 차이를 설명하라.', ref: 'w3.flow', model: '<b>Flow control</b>은 <b>수신자</b> 보호 — 수신자가 남은 버퍼(rwnd)를 ACK에 광고. <b>Congestion control</b>은 <b>네트워크</b> 보호 — 송신자가 손실·지연으로 혼잡을 추정해 cwnd 조절. 실제 전송량은 <b>min(rwnd, cwnd)</b>.', kw: ['Flow = 수신자 · rwnd', 'Congestion = 네트워크 · cwnd', 'min(rwnd, cwnd)'] },
  { w: 'w3', q: 'Connection refused와 Connection timed out의 원인과 조사 방향을 비교하라.', ref: 'w3.diag', model: '<b>Refused</b>: SYN이 서버 OS에 도착했지만 그 포트에 listen 소켓이 없어 <b>RST</b> → 프로세스 실행 · 포트 · bind 주소 확인. <b>Timed out</b>: SYN에 <b>응답 자체가 없음</b> → 방화벽 · Security Group · 라우팅 · NAT 확인.', kw: ['refused = RST · 도착함', 'timeout = 응답 없음', '프로세스·포트 vs 방화벽·경로'] },
  { w: 'w4', q: '브라우저에 https://www.example.com/a?x=1 을 입력한 뒤 첫 응답을 받기까지의 흐름을 단계별로 설명하라.', ref: 'w4.flow', model: '① URL 분해(scheme · host · path · query) ② <b>DNS</b>로 host만 IP로(캐시 → 리졸버 → Root·TLD·권한) ③ <b>TCP 3-way handshake</b>(443) ④ <b>TLS handshake</b>(SNI · 인증서 검증 · 키 교환) ⑤ 암호화된 <b>HTTP 요청</b>(GET /a?x=1, Host) ⑥ 서버 처리 후 상태 코드 + 헤더 + 본문 응답. 신규 연결이면 DNS 제외 약 3 RTT.', kw: ['URL 분해 · host만 DNS', 'TCP handshake', 'TLS (인증서 검증)', 'HTTP 요청/응답', '≈ 3 RTT'] },
  { w: 'w4', q: 'DNS의 재귀 질의와 반복 질의를 누가 누구에게 하는지 중심으로 설명하라.', ref: 'w4.resolve', model: '<b>재귀</b>: Stub(내 PC) → 재귀 리졸버 “끝까지 알아와 줘”. <b>반복</b>: 리졸버 → Root → TLD → 권한 서버 순으로 묻고, 각 서버는 “나는 모르니 저기 물어봐”(referral)로 답한다. 결과는 TTL 동안 각 단계에 캐시된다.', kw: ['재귀 = 클라이언트 ↔ 리졸버', '반복 = 리졸버 ↔ Root·TLD·권한', 'TTL 캐시'] },
  { w: 'w4', q: '멱등성이 무엇이고 왜 재시도 정책과 관련되는지 POST와 PUT을 예로 설명하라.', ref: 'w4.method', model: '멱등 = 같은 요청을 N번 보내도 <b>서버 상태</b>가 1번과 같음. 응답이 유실됐을 때 요청이 처리됐는지 알 수 없으므로, <b>멱등(GET·PUT·DELETE)만 안전하게 자동 재시도</b>할 수 있다. POST는 재시도 시 <b>중복 생성·결제</b> 위험 → Idempotency-Key.', kw: ['서버 상태 기준', '응답 유실 시 재시도', 'PUT 멱등 · POST 비멱등', 'Idempotency-Key'] },
  { w: 'w4', q: 'HTTPS가 숨기는 것과 숨기지 못하는 것을 구분하라.', ref: 'w4.https', model: '숨김: HTTP 메시지 전체 — <b>path · query · 헤더(쿠키·토큰) · 본문</b>. 숨기지 못함: <b>목적지 IP · 포트 · SNI(도메인)</b>, 트래픽 양·시간. (ECH를 쓰면 SNI도 숨길 수 있다.)', kw: ['path·query·헤더·본문 암호화', 'IP·포트 보임', 'SNI(도메인) 보임'] },
  { w: 'w4', q: '상태 코드 404와 502를 “누가 만든 응답인가” 관점에서 비교하라.', ref: 'w4.status', model: '<b>404</b>는 보통 <b>App Server</b>가 “그 경로·자원이 없다”고 답한 것 — DNS·TCP·TLS·HTTP 전달은 성공. <b>502</b>는 <b>프록시·LB</b>가 뒷단 서버에 연결하지 못했거나 잘못된 응답을 받아 만든 것 — 뒷단 프로세스·포트를 본다.', kw: ['404 = App Server', '502 = 프록시·LB', '조사 위치가 다름'] },
  { w: 'w5', q: 'FastAPI에서 요청 하나가 처리되는 경로(파이프라인)와 각 단계에서 날 수 있는 상태 코드를 설명하라.', ref: 'w5.pipe', model: '(브라우저 Preflight) → 연결(DNS·TCP·TLS) → <b>Uvicorn</b>(ASGI, HTTP 파싱) → <b>Middleware</b>(CORS·인증, 401) → <b>Router</b>(Method+Path, 404·405) → <b>Validation</b>(Pydantic, 422) → <b>Handler</b>(비즈니스 로직, 400·403·409) → <b>Service·DB</b>(예외 시 500). 422면 handler는 실행되지 않았다.', kw: ['Router → Validation → Handler 순서', '404/405 = 라우팅', '422 = 검증', '500 = handler 이후'] },
  { w: 'w5', q: 'CORS Preflight가 일어나는 조건과 흐름을 설명하라.', ref: 'w5.preflight', model: '다른 Origin으로 <b>Simple이 아닌 요청</b>(PUT·DELETE·PATCH, application/json, Authorization 등 커스텀 헤더)을 보내면 브라우저가 먼저 <b>OPTIONS</b>로 묻는다(Origin · Access-Control-Request-Method/Headers). 서버가 <b>Allow-Origin · Allow-Methods · Allow-Headers</b>로 허용하면 그제야 본 요청을 보낸다.', kw: ['Simple이 아닌 요청', 'OPTIONS 먼저', 'Allow-Origin/Methods/Headers', '허용 후 본 요청'] },
  { w: 'w5', q: 'Stateless가 Scale-out과 직결되는 이유를 설명하라.', ref: 'w5.stateless', model: '요청 하나가 처리에 필요한 정보(토큰 등)를 모두 담고 서버 메모리에 세션을 두지 않으면, <b>어느 서버가 받아도 같은 결과</b>를 낼 수 있다. 그래서 LB 뒤에 서버를 늘리기만 하면 된다(sticky session 불필요). 공유해야 할 상태는 DB·Redis로.', kw: ['요청이 자기완결적', '어느 서버든 처리', 'LB + 서버 증설', '공유 상태는 DB·Redis'] },
  { w: 'w5', q: 'REST API에서 항상 200 + {"success": false}로 응답하는 설계의 문제를 설명하라.', ref: 'w5.error', model: '상태 코드가 실제 결과를 말하지 않아 <b>캐시 · 모니터링 · 재시도 · 클라이언트 분기</b>가 모두 “성공”으로 착각한다. 실패는 <b>4xx·5xx 상태 코드</b>로, Body는 code · message 등 <b>일관된 오류 형식</b>으로 주는 것이 계약이다.', kw: ['상태 코드가 거짓', '캐시·모니터링·재시도 오작동', '4xx/5xx + 일관된 오류 Body'] },
];

function essayPool() {
  const p = [];
  ['w1', 'w2', 'w3', 'w4', 'w5'].forEach(w => ((QUIZ[w] || {}).qc || []).forEach((q, k) => { if (q.type !== 'ox' && q.model) p.push({ ...q, w, id: 'qc:' + w + ':' + k, src: 'Quick Check' }); }));
  ESSAY.forEach((q, k) => p.push({ ...q, id: 'es:' + k, src: '개념·흐름' }));
  return p;
}
const quizWeek = r => (r[3] || 'w1').slice(0, 2);
const WEEKS = ['w1', 'w2', 'w3', 'w4', 'w5'];
const rng = () => rngFrom((Date.now() ^ (Math.random() * 1e9)) >>> 0);
const kwHTML = (q, chk, dis) => (q.kw || []).length ? `<div class="kw"><span class="cm" style="font-size:12.5px">내 답에 들어간 요소 체크</span>${q.kw.map((k, j) => `<label><input type="checkbox" data-kw="${j}" ${chk.includes(j) ? 'checked' : ''} ${dis ? 'disabled' : ''}><span>${k}</span></label>`).join('')}</div>` : '';

/* ---------- Mock exam generator ---------- */
const SIZES = { s: ['짧게', 20, 5, 3], m: ['기본', 30, 10, 5], l: ['길게', 50, 15, 8] };
const PTS = { ox: 1, ab: 1, es: 5 };
function mountExam(host) {
  let cfg = LS.get('mt.cfg', { size: 'm', ratio: 30, weeks: WEEKS.slice() }), ex = LS.get('mt.cur', null), i = 0;
  if (!SIZES[cfg.size]) cfg.size = 'm'; if (![30, 50].includes(cfg.ratio)) cfg.ratio = 30;
  const box = document.createElement('div'); host.appendChild(box);
  const save = () => LS.set('mt.cur', ex);
  function build() {
    const R = rng(), [, nOx, nAb, nEs] = SIZES[cfg.size], sel = cfg.weeks.length ? cfg.weeks : WEEKS;
    const total = nOx + nAb + nEs, W = new Set(LS.get('ox.wrong', []));
    const nPast = Math.min(nOx, Math.ceil(total * cfg.ratio / 100));
    const pick = (arr, n, wrongFirst) => { const a = R.shuffle(arr.filter(wrongFirst)), b = R.shuffle(arr.filter(x => !wrongFirst(x))); return a.concat(b).slice(0, n); };
    let past = QZ.map((r, k) => ({ id: 'quiz:' + k, k, r })).filter(x => sel.includes(quizWeek(x.r)));
    if (past.length < nPast) past = QZ.map((r, k) => ({ id: 'quiz:' + k, k, r }));
    const pastSel = pick(past, nPast, x => W.has(x.id)).map(x => ({ t: 'ox', past: true, id: x.id, w: quizWeek(x.r), no: x.k + 1, q: x.r[0], a: x.r[1], why: x.r[2], ref: x.r[3] }));
    const fresh = []; sel.forEach(w => (OXBANK[w] || []).forEach((r, k) => fresh.push({ t: 'ox', past: false, id: w + ':' + k, w, q: r[0], a: r[1], why: r[2], ref: r[3] })));
    const freshSel = pick(fresh, nOx - pastSel.length, x => W.has(x.id));
    const oxs = R.shuffle(pastSel.concat(freshSel));
    const AW = new Set(LS.get('ab.wrong', []));
    const abPool = ABBR.filter(r => !AB_SKIP.has(r[0]) && abWeeksOf(r).some(w => sel.includes(w)));
    const abSel = pick(abPool, nAb * 3, r => AW.has(r[0]));
    const abs = []; for (let k = 0; k < nAb && abSel.length >= (k + 1) * 3; k++) abs.push({ t: 'ab', terms: abSel.slice(k * 3, k * 3 + 3).map(r => r[0]) });
    const EW = new Set(LS.get('es.wrong', []));
    const ess = pick(essayPool().filter(q => sel.includes(q.w)), nEs, q => EW.has(q.id)).map(q => ({ t: 'es', id: q.id }));
    ex = { size: cfg.size, ratio: cfg.ratio, weeks: sel, total: oxs.length + abs.length + ess.length, nPast: pastSel.length, items: oxs.concat(abs, ess).map(it => ({ ...it, pick: null, ans: [], txt: '', kw: [], ov: [] })), done: false };
    i = 0; save(); draw();
  }
  const esById = id => essayPool().find(q => q.id === id);
  const abRow = t => ABBR.find(r => r[0] === t);
  function grade(it) {
    if (it.t === 'ox') return it.pick ? (it.pick === it.a ? 1 : 0) : 0;
    if (it.t === 'ab') return it.terms.reduce((s, t, j) => s + ((it.ov[j] != null ? it.ov[j] : abCheck(it.ans[j] || '', abRow(t)[1])) ? 1 : 0), 0);
    const q = esById(it.id); return q && it.shown ? Math.round(it.kw.length / Math.max(1, (q.kw || []).length) * PTS.es * 2) / 2 : 0;
  }
  const maxOf = it => it.t === 'ox' ? 1 : it.t === 'ab' ? it.terms.length : PTS.es;
  const answered = it => it.t === 'ox' ? !!it.pick : it.t === 'ab' ? !!it.checked : !!it.shown;
  const TYPE = { ox: 'OX', ab: '약어 원래 이름', es: '서술형' };
  function draw() {
    const S = SIZES[cfg.size];
    let h = `<div class="lab oxq mt"><div class="lab-head"><span class="tag">중간고사 모의시험</span>OX · 약어 원래 이름 · 서술형 — 퀴즈 기출 OX가 전체의 ${cfg.ratio}% 이상</div>
<div class="lab-ctl"><div class="ctl"><label for="mt-size">분량</label><select id="mt-size">${Object.entries(SIZES).map(([k, v]) => `<option value="${k}" ${cfg.size === k ? 'selected' : ''}>${v[0]} · OX ${v[1]} + 약어 ${v[2]} + 서술 ${v[3]}</option>`).join('')}</select></div>
<div class="ctl"><label for="mt-ratio">기출 비중</label><select id="mt-ratio">${[30, 50].map(v => `<option value="${v}" ${cfg.ratio === v ? 'selected' : ''}>${v}% 이상</option>`).join('')}</select></div>
${WEEKS.map(w => `<div class="ctl tog"><input type="checkbox" id="mt-${w}" ${cfg.weeks.includes(w) ? 'checked' : ''}><label for="mt-${w}">${w.slice(1)}주</label></div>`).join('')}
<button class="btn pri" data-new>새 시험지</button></div><div class="lab-out">`;
    if (!ex) { h += `<p>분량과 범위를 고르고 <b>새 시험지</b>를 누르면 시작한다. 퀴즈 기출 OX는 그 시험지 전체 문항 수의 <b>${cfg.ratio}% 이상</b>(올림)이 반드시 들어간다.</p>`; box.innerHTML = h + '</div></div>'; bind(); return; }
    const its = ex.items, pct = Math.round(ex.nPast / ex.total * 100);
    h += `<div class="mt-comp"><span>OX <b>${its.filter(x => x.t === 'ox').length}</b> <i>(기출 ${ex.nPast} · 새 ${its.filter(x => x.t === 'ox' && !x.past).length})</i></span><span>약어 <b>${its.filter(x => x.t === 'ab').length}</b> <i>(×3 용어)</i></span><span>서술 <b>${its.filter(x => x.t === 'es').length}</b></span><span class="mt-past">기출 ${ex.nPast}/${ex.total} = <b>${pct}%</b> ✓</span></div>`;
    h += `<div class="oxdots">${its.map((r, k) => `<button data-go="${k}" class="${k === i ? 'cur' : answered(r) ? (grade(r) >= maxOf(r) ? 'ok' : grade(r) > 0 ? 'part' : 'no') : ''} t-${r.t}" aria-label="${k + 1}번">${k + 1}</button>`).join('')}<button data-go="${its.length}" class="${i >= its.length ? 'cur' : ''}" style="width:auto;padding:0 8px">결과</button></div>`;
    if (i < its.length) {
      const it = its[i], first = its.findIndex(x => x.t === it.t), last = its.length - 1 - [...its].reverse().findIndex(x => x.t === it.t);
      h += `<div class="oxcard"><div class="oxmeta">${TYPE[it.t]} ${i - first + 1}/${last - first + 1}${it.t === 'ox' ? ` · ${it.w.slice(1)}주차${it.past ? ` · <b class="mt-pt">퀴즈 기출 #${it.no}</b>` : ''}` : ''}${it.t === 'es' ? ` · ${esById(it.id).w.slice(1)}주차 · ${esById(it.id).src}` : ''} · ${maxOf(it)}점</div>`;
      if (it.t === 'ox') {
        h += `<div class="oxq-t">${it.q}</div><div class="oxbtn"><button data-ox="O" class="o ${it.pick ? (it.a === 'O' ? 'right' : it.pick === 'O' ? 'wrong' : 'dim') : ''}" ${it.pick ? 'disabled' : ''}>O</button><button data-ox="X" class="x ${it.pick ? (it.a === 'X' ? 'right' : it.pick === 'X' ? 'wrong' : 'dim') : ''}" ${it.pick ? 'disabled' : ''}>X</button></div>`;
        if (it.pick) h += `<div class="model"><div class="mh">${it.pick === it.a ? '⭕ 정답' : '❌ 오답'} — 정답은 ${it.a}</div>${it.why}<div style="margin-top:6px">${H.ref(it.ref, '관련 설명으로 이동')}</div></div>`;
      } else if (it.t === 'ab') {
        h += `<div class="oxq-t">다음 약어의 원래 이름(full name)을 모두 적으시오.</div><div class="ab-rows">${it.terms.map((t, j) => { const r = abRow(t), ok = it.ov[j] != null ? it.ov[j] : abCheck(it.ans[j] || '', r[1]); return `<div class="ab-row ${it.checked ? (ok ? 'ok' : 'no') : ''}"><b class="mono">${esc(t)}</b><input type="text" data-ab="${j}" value="${esc(it.ans[j] || '')}" ${it.checked ? 'disabled' : ''} autocomplete="off" spellcheck="false" placeholder="영문 원래 이름">${it.checked ? `<div class="ab-ans">${ok ? '⭕' : '❌'} ${r[1].map(esc).join(' <span class="cm">/</span> ')} <span class="cm">· ${r[2].map(g => AB_WK[g]).join(', ')}</span>${!ok ? ` <button class="btn sm" data-ov="${j}">맞은 걸로</button>` : it.ov[j] ? ` <button class="btn sm" data-ov="${j}">취소</button>` : ''}</div>` : ''}</div>`; }).join('')}</div>`;
        if (!it.checked) h += `<div style="margin-top:10px"><button class="btn pri" data-abchk>채점</button> <span class="cm" style="font-size:13px">대소문자 · 띄어쓰기 · 하이픈 · 괄호 속 보충 설명은 무시한다</span></div>`;
      } else {
        const q = esById(it.id);
        h += `<div class="oxq-t">${q.q}</div><textarea class="mt-ta" data-es rows="5" placeholder="핵심 단어 중심으로 3~5줄" ${it.shown ? 'disabled' : ''}>${esc(it.txt)}</textarea>`;
        if (!it.shown) h += `<div style="margin-top:8px"><button class="btn pri" data-show>모범 답안과 비교</button></div>`;
        else h += `<div class="model"><div class="mh">모범 답안 · 체크한 요소 비율로 ${grade(it)} / ${PTS.es}점</div>${q.model}${kwHTML(q, it.kw, false)}<div style="margin-top:6px">${H.ref(q.ref, '관련 설명으로 이동')}</div></div>`;
      }
      if (answered(it)) h += `<div style="margin-top:12px"><button class="btn pri" data-go="${i + 1}">${i + 1 < its.length ? '다음 문제 ▶' : '결과 보기 ▶'}</button></div>`;
      h += '</div>';
    } else {
      const sum = (f) => its.filter(f).reduce((s, x) => s + grade(x), 0), mx = (f) => its.filter(f).reduce((s, x) => s + maxOf(x), 0);
      const rows = [['OX · 퀴즈 기출', x => x.t === 'ox' && x.past], ['OX · 새 문제', x => x.t === 'ox' && !x.past], ['약어 원래 이름', x => x.t === 'ab'], ['서술형', x => x.t === 'es']];
      const tot = sum(() => true), tmx = mx(() => true), un = its.filter(x => !answered(x)).length;
      h += `<div class="big" style="margin-bottom:4px">${tot} / ${tmx}점</div><p class="mono cm" style="margin:0 0 10px">${Math.round(tot / tmx * 100)}%${un ? ` · 안 푼 문제 ${un}` : ''}</p>`;
      h += T(['유형', '점수', '정답률'], rows.filter(([, f]) => its.some(f)).map(([l, f]) => [l, `${sum(f)} / ${mx(f)}`, `${Math.round(sum(f) / Math.max(1, mx(f)) * 100)}%`]));
      const byW = WEEKS.filter(w => its.some(x => x.t === 'ox' && x.w === w)).map(w => { const r = its.filter(x => x.t === 'ox' && x.w === w); return `${w.slice(1)}주 ${r.filter(x => x.pick === x.a).length}/${r.length}`; }).join(' · ');
      h += `<p class="cm" style="font-size:14px">OX 주차별 — ${byW}</p>`;
      const wr = its.filter(x => answered(x) && grade(x) < maxOf(x));
      if (wr.length) h += `<p><b>다시 볼 문제 ${wr.length}개</b> — 다음 시험지에 먼저 나온다</p><div class="oxrev">${wr.map(x => x.t === 'ox' ? `<div><div class="oxq-t" style="font-size:15.5px">${x.past ? `<b class="mt-pt">기출 #${x.no}</b> ` : ''}${x.q} <b class="mono">→ ${x.a}</b></div><div class="cm" style="font-size:14px">${x.why} ${H.ref(x.ref, '복습')}</div></div>` : x.t === 'ab' ? `<div><div class="oxq-t" style="font-size:15.5px">${x.terms.map(t => `<b class="mono">${esc(t)}</b> = ${esc(abRow(t)[1][0])}`).join('<br>')}</div></div>` : `<div><div class="oxq-t" style="font-size:15.5px">${esById(x.id).q}</div><div class="cm" style="font-size:14px">빠진 요소: ${esById(x.id).kw.filter((_, j) => !x.kw.includes(j)).join(' · ')} ${H.ref(esById(x.id).ref, '복습')}</div></div>`).join('')}</div>`;
      h += `<div style="margin-top:10px"><button class="btn pri" data-new>새 시험지</button></div>`;
    }
    box.innerHTML = h + '</div></div>'; bind();
  }
  function record(it) {
    if (it.t === 'ox') { const W = new Set(LS.get('ox.wrong', [])); if (it.pick === it.a) W.delete(it.id); else W.add(it.id); LS.set('ox.wrong', [...W]); }
    if (it.t === 'ab') { const W = new Set(LS.get('ab.wrong', [])); it.terms.forEach((t, j) => { const ok = it.ov[j] != null ? it.ov[j] : abCheck(it.ans[j] || '', abRow(t)[1]); if (ok) W.delete(t); else W.add(t); }); LS.set('ab.wrong', [...W]); }
    if (it.t === 'es') { const W = new Set(LS.get('es.wrong', [])); if (grade(it) >= PTS.es * 0.6) W.delete(it.id); else W.add(it.id); LS.set('es.wrong', [...W]); }
    save();
  }
  function bind() {
    box.querySelector('[data-new]') && box.querySelectorAll('[data-new]').forEach(b => b.onclick = () => {
      cfg = { size: box.querySelector('#mt-size').value, ratio: +box.querySelector('#mt-ratio').value, weeks: WEEKS.filter(w => box.querySelector('#mt-' + w).checked) };
      if (!cfg.weeks.length) cfg.weeks = WEEKS.slice(); LS.set('mt.cfg', cfg); build(); });
    box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { i = +b.dataset.go; draw(); });
    box.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => APP.goto(b.dataset.goto));
    if (!ex || i >= ex.items.length) return;
    const it = ex.items[i];
    box.querySelectorAll('[data-ox]').forEach(b => b.onclick = () => answerOX(b.dataset.ox));
    box.querySelectorAll('[data-ab]').forEach(inp => { inp.oninput = () => { it.ans[+inp.dataset.ab] = inp.value; save(); }; inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const n = box.querySelector(`[data-ab="${+inp.dataset.ab + 1}"]`); if (n) n.focus(); else chkAb(); } }; });
    const ac = box.querySelector('[data-abchk]'); if (ac) ac.onclick = chkAb;
    box.querySelectorAll('[data-ov]').forEach(b => b.onclick = () => { const j = +b.dataset.ov; it.ov[j] = it.ov[j] ? null : true; record(it); draw(); });
    const ta = box.querySelector('[data-es]'); if (ta) ta.oninput = () => { it.txt = ta.value; save(); };
    const sh = box.querySelector('[data-show]'); if (sh) sh.onclick = () => { it.shown = true; record(it); draw(); };
    box.querySelectorAll('[data-kw]').forEach(cb => cb.onchange = () => { const j = +cb.dataset.kw; it.kw = cb.checked ? [...new Set([...it.kw, j])] : it.kw.filter(x => x !== j); record(it); draw(); });
    function chkAb() { it.checked = true; record(it); draw(); }
  }
  function answerOX(v) { const it = ex && ex.items[i]; if (!it || it.t !== 'ox' || it.pick) return; it.pick = v; record(it); draw(); }
  document.addEventListener('keydown', e => {
    if (!box.isConnected || !ex || i >= ex.items.length || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const r = box.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const it = ex.items[i], k = e.key.toLowerCase();
    if (it.t === 'ox' && (k === 'o' || k === '0')) { answerOX('O'); e.preventDefault(); }
    else if (it.t === 'ox' && k === 'x') { answerOX('X'); e.preventDefault(); }
    else if ((k === 'enter' || k === 'arrowright') && answered(it)) { i++; draw(); e.preventDefault(); }
  });
  draw();
}

/* ---------- Quiz answer sheet (10/19 quiz, 100) ---------- */
function mountKey(host) {
  let f = 'all', cur = -1;
  const box = document.createElement('div'); host.appendChild(box);
  const W = () => new Set(LS.get('ox.wrong', []));
  function draw() {
    const w = W(), show = QZ.map((r, k) => k).filter(k => f === 'all' || (f === 'O' || f === 'X' ? QZ[k][1] === f : f === 'wrong' ? w.has('quiz:' + k) : quizWeek(QZ[k]) === f));
    let h = `<div class="lab"><div class="lab-head"><span class="tag">정답표</span>10/19 퀴즈 OX 100문항 · 번호를 누르면 문제 · 해설</div><div class="lab-ctl"><div class="ctl"><label for="qk-f">보기</label><select id="qk-f">${[['all', '전체 100'], ['O', '정답 O만'], ['X', '정답 X만'], ['wrong', '내가 틀린 것'], ...WEEKS.map(x => [x, x.slice(1) + '주 관련'])].map(([v, l]) => `<option value="${v}" ${f === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div><span class="mono cm" style="margin-left:auto">O ${QZ.filter(r => r[1] === 'O').length} · X ${QZ.filter(r => r[1] === 'X').length}${w.size ? ` · 내 오답 ${QZ.filter((_, k) => w.has('quiz:' + k)).length}` : ''}</span></div><div class="lab-out">`;
    h += `<div class="qkey">${show.map(k => `<button data-k="${k}" class="${QZ[k][1] === 'O' ? 'o' : 'x'}${k === cur ? ' cur' : ''}${w.has('quiz:' + k) ? ' wr' : ''}"><span>${k + 1}</span><b>${QZ[k][1]}</b></button>`).join('') || '<p class="cm">해당 문항이 없다.</p>'}</div>`;
    if (cur >= 0) { const r = QZ[cur]; h += `<div class="model"><div class="mh">문제 ${cur + 1} — 정답 ${r[1]}</div><div class="oxq-t" style="font-size:16px;margin-bottom:6px">${r[0]}</div>${r[2]}<div style="margin-top:6px">${H.ref(r[3], '관련 설명으로 이동')}</div></div>`; }
    else h += `<p class="cm" style="margin:10px 0 0;font-size:13.5px">빨간 테두리 = 이 브라우저에서 틀린 적 있는 문항. 직접 풀어 보려면 시험 대비 탭 OX 연습(E.2)에서 “퀴즈 기출”만 체크하거나 아래 모의시험(M.5)을 쓴다.</p>`;
    box.innerHTML = h + '</div></div>';
    box.querySelector('#qk-f').onchange = e => { f = e.target.value; cur = -1; draw(); };
    box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { cur = cur === +b.dataset.k ? -1 : +b.dataset.k; draw(); });
    box.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => APP.goto(b.dataset.goto));
  }
  draw();
}

/* ---------- Abbreviation drill ---------- */
function mountAbbr(host) {
  let sel = LS.get('ab.weeks', Object.keys(AB_WK)), deck = [], i = 0, mode = 'drill', st = [];
  const box = document.createElement('div'); host.appendChild(box);
  function newDeck(onlyWrong) {
    const W = new Set(LS.get('ab.wrong', []));
    let p = ABBR.filter(r => r[2].some(g => sel.includes(g))); if (onlyWrong) p = p.filter(r => W.has(r[0]));
    const R = rng(); deck = R.shuffle(p.filter(r => W.has(r[0]))).concat(R.shuffle(p.filter(r => !W.has(r[0])))); st = deck.map(() => ({ v: '', ok: null })); i = 0; draw();
  }
  function draw() {
    const W = new Set(LS.get('ab.wrong', [])), done = st.filter(s => s.ok != null), right = done.filter(s => s.ok).length;
    let h = `<div class="lab oxq"><div class="lab-head"><span class="tag">약어</span>용어표 ${ABBR.length}개 · 영문 원래 이름 쓰기 · 틀린 약어는 먼저 나온다</div><div class="lab-ctl">${Object.entries(AB_WK).map(([g, l]) => `<div class="ctl tog"><input type="checkbox" id="ab-${g}" ${sel.includes(g) ? 'checked' : ''}><label for="ab-${g}">${l} (${ABBR.filter(r => r[2].includes(g)).length})</label></div>`).join('')}<button class="btn pri" data-new>섞어서 시작</button><button class="btn" data-wrong ${W.size ? '' : 'disabled'}>틀린 약어 (${W.size})</button><button class="btn" data-mode>${mode === 'drill' ? '표로 보기' : '연습으로'}</button></div><div class="lab-out">`;
    if (mode === 'table') {
      const list = ABBR.filter(r => r[2].some(g => sel.includes(g)));
      h += `<div class="ab-tbl">${list.map(r => `<div class="${W.has(r[0]) ? 'wr' : ''}"><b class="mono">${esc(r[0])}</b><span>${r[1].map(esc).join(' / ')}</span></div>`).join('')}</div>`;
    } else if (!deck.length) h += '<p>선택한 범위에 약어가 없다.</p>';
    else if (i < deck.length) {
      const r = deck[i], s = st[i];
      h += `<div class="oxbar"><div class="oxprog"><i style="width:${done.length / deck.length * 100}%"></i></div><span class="mono">${i + 1} / ${deck.length} · 정답 ${right}</span></div><div class="oxcard"><div class="oxmeta">${r[2].map(g => AB_WK[g]).join(', ')}${W.has(r[0]) && s.ok == null ? ' · <b>지난번 오답</b>' : ''}</div><div class="ab-big mono">${esc(r[0])}</div><input type="text" class="ab-in" data-in value="${esc(s.v)}" ${s.ok != null ? 'disabled' : ''} autocomplete="off" spellcheck="false" placeholder="원래 이름을 영어로 · Enter로 채점">`;
      if (s.ok != null) h += `<div class="model"><div class="mh">${s.ok ? '⭕ 정답' : '❌ 오답'}</div><b>${r[1].map(esc).join(' / ')}</b>${!s.ok ? ` <button class="btn sm" data-ov>맞은 걸로</button>` : ''}</div><div style="margin-top:10px"><button class="btn pri" data-next>다음 ▶</button></div>`;
      else h += `<div style="margin-top:10px;display:flex;gap:8px"><button class="btn pri" data-chk>채점</button><button class="btn" data-skip>모르겠다 (정답 보기)</button></div>`;
      h += '</div>';
    } else h += `<div class="big">${right} / ${deck.length}</div><p>${deck.length - right ? `틀린 ${deck.length - right}개는 “틀린 약어”로 다시 풀 수 있다.` : '전부 맞혔다.'}</p><button class="btn pri" data-new>다시 섞기</button>`;
    box.innerHTML = h + '</div></div>';
    const rd = () => { sel = Object.keys(AB_WK).filter(g => box.querySelector('#ab-' + g).checked); if (!sel.length) sel = Object.keys(AB_WK); LS.set('ab.weeks', sel); };
    box.querySelectorAll('[data-new]').forEach(b => b.onclick = () => { rd(); mode = 'drill'; newDeck(false); });
    const wb = box.querySelector('[data-wrong]'); if (wb) wb.onclick = () => { rd(); mode = 'drill'; newDeck(true); };
    box.querySelector('[data-mode]').onclick = () => { rd(); mode = mode === 'drill' ? 'table' : 'drill'; draw(); };
    const inp = box.querySelector('[data-in]');
    const mark = ok => { const r = deck[i]; st[i].ok = ok; const W2 = new Set(LS.get('ab.wrong', [])); if (ok) W2.delete(r[0]); else W2.add(r[0]); LS.set('ab.wrong', [...W2]); draw(); const n = box.querySelector('[data-next]'); if (n) n.focus(); };
    if (inp) { inp.oninput = () => st[i].v = inp.value; inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); mark(abCheck(inp.value, deck[i][1])); } }; }
    const c = box.querySelector('[data-chk]'); if (c) c.onclick = () => mark(abCheck(inp.value, deck[i][1]));
    const sk = box.querySelector('[data-skip]'); if (sk) sk.onclick = () => mark(false);
    const ov = box.querySelector('[data-ov]'); if (ov) ov.onclick = () => mark(true);
    const nx = box.querySelector('[data-next]'); if (nx) nx.onclick = () => { i++; draw(); const n = box.querySelector('[data-in]'); if (n) n.focus(); };
  }
  newDeck(false);
}

/* ---------- Essay drill ---------- */
function mountEssay(host) {
  let sel = LS.get('es.weeks', WEEKS.slice()), list = [], i = 0;
  const box = document.createElement('div'); host.appendChild(box);
  function newList() { const W = new Set(LS.get('es.wrong', [])), p = essayPool().filter(q => sel.includes(q.w)), R = rng(); list = R.shuffle(p.filter(q => W.has(q.id))).concat(R.shuffle(p.filter(q => !W.has(q.id)))); i = 0; draw(); }
  function draw() {
    const all = essayPool();
    let h = `<div class="lab oxq"><div class="lab-head"><span class="tag">서술형</span>Quick Check ${all.filter(q => q.src === 'Quick Check').length} + 개념·흐름 ${ESSAY.length} = ${all.length}문항 · 내 말로 쓰고 모범 답안의 핵심 요소로 자가 채점</div><div class="lab-ctl">${WEEKS.map(w => `<div class="ctl tog"><input type="checkbox" id="es-${w}" ${sel.includes(w) ? 'checked' : ''}><label for="es-${w}">${w.slice(1)}주 (${all.filter(q => q.w === w).length})</label></div>`).join('')}<button class="btn pri" data-new>섞어서 시작</button></div><div class="lab-out">`;
    if (!list.length) h += '<p>선택한 범위에 문항이 없다.</p>';
    else {
      const q = list[i], s = LS.get('es.' + q.id, { txt: '', shown: false, kw: [] });
      h += `<div class="oxbar"><div class="oxprog"><i style="width:${(i + 1) / list.length * 100}%"></i></div><span class="mono">${i + 1} / ${list.length}</span></div><div class="oxcard"><div class="oxmeta">${q.w.slice(1)}주차 · ${q.src}</div><div class="oxq-t">${q.q}</div><textarea class="mt-ta" data-es rows="5" placeholder="핵심 단어 중심으로 3~5줄">${esc(s.txt)}</textarea>`;
      h += s.shown ? `<div class="model"><div class="mh">모범 답안</div>${q.model}${kwHTML(q, s.kw, false)}<div style="margin-top:6px">${H.ref(q.ref, '관련 설명으로 이동')}</div></div>` : `<div style="margin-top:8px"><button class="btn pri" data-show>모범 답안과 비교</button></div>`;
      h += `<div style="margin-top:12px;display:flex;gap:8px"><button class="btn" data-mv="-1" ${i ? '' : 'disabled'}>◀ 이전</button><button class="btn pri" data-mv="1" ${i < list.length - 1 ? '' : 'disabled'}>다음 ▶</button></div></div>`;
    }
    box.innerHTML = h + '</div></div>';
    box.querySelector('[data-new]').onclick = () => { sel = WEEKS.filter(w => box.querySelector('#es-' + w).checked); if (!sel.length) sel = WEEKS.slice(); LS.set('es.weeks', sel); newList(); };
    box.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { i = Math.max(0, Math.min(list.length - 1, i + +b.dataset.mv)); draw(); });
    box.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => APP.goto(b.dataset.goto));
    if (!list.length) return;
    const q = list[i], key = 'es.' + q.id, s = LS.get(key, { txt: '', shown: false, kw: [] });
    const upd = () => { LS.set(key, s); const W = new Set(LS.get('es.wrong', [])); if (s.shown) { if (s.kw.length >= Math.ceil((q.kw || []).length * 0.6)) W.delete(q.id); else W.add(q.id); } LS.set('es.wrong', [...W]); };
    const ta = box.querySelector('[data-es]'); ta.oninput = () => { s.txt = ta.value; LS.set(key, s); };
    const sh = box.querySelector('[data-show]'); if (sh) sh.onclick = () => { s.shown = true; upd(); draw(); };
    box.querySelectorAll('[data-kw]').forEach(cb => cb.onchange = () => { const j = +cb.dataset.kw; s.kw = cb.checked ? [...new Set([...s.kw, j])] : s.kw.filter(x => x !== j); upd(); });
  }
  newList();
}

addWeek({ id: 'mt', num: 'M', short: '중간고사', title: '중간고사 대비 — 기출 · 약어 · 서술', range: '1~5주차',
  lead: '중간고사 유형은 <b>OX</b> · <b>용어(약어)의 원래 이름 모두 적기</b> · <b>개념/흐름 위주의 간단한 서술형</b>. 10/19 퀴즈 OX 100문항의 정답과 해설을 정리하고, 모의시험에는 그 기출이 <b>전체의 30% 이상</b> 반드시 들어가도록 만들었다.',
  sections: [
{ id: 'mt.guide', title: '시험지 구성과 공부 순서', slides: '중간 필기 · 용어표 Week1-5',
  blocks: [
    T(['분량', 'OX (기출 + 새 문제)', '약어', '서술', '전체', '기출 최소'], Object.values(SIZES).map(([l, o, a, e]) => { const t = o + a + e, p = Math.ceil(t * 0.3); return [l, `${o} (${p} + ${o - p})`, `${a}문항 × 3`, e, t, `<b>${p}</b> (${Math.round(p / t * 100)}%)`]; })),
    H.key(`<b>기출 30% 보장 규칙</b><br>기출 OX 수 = <b>올림(전체 문항 수 × 30%)</b>. 시험지를 만들 때 이 수만큼 퀴즈 기출 100문항에서 먼저 뽑고, 나머지 OX만 새 문제은행(1~5주차 ${WEEKS.reduce((a, w) => a + (OXBANK[w] || []).length, 0)}문항)에서 채운다.<br>선택한 주차의 기출이 모자라면 범위 밖 기출로 채워서라도 비율을 지킨다. “기출 비중 50% 이상”도 고를 수 있다.`),
    `<ol><li><b>퀴즈 정답표</b>(M.2)로 100문항의 답과 이유를 훑는다 — 틀린 이유가 “반대로 말함”인 문항(36 · 49 · 62 · 64 · 81 · 93)이 특히 함정.</li><li><b>약어</b>(M.3) — 용어표 Week1-5의 약어를 영문 원래 이름으로 쓴다. 틀린 약어는 다음에 먼저 나온다.</li><li><b>서술형</b>(M.4) — 각 주차 Quick Check와 흐름 문제를 내 말로 쓰고 핵심 요소를 체크한다.</li><li><b>모의시험</b>(M.5)으로 섞어서 실전처럼. 한 화면에 한 문제, 결과는 유형별 · 주차별로.</li></ol>`,
    H.note('세 연습의 오답 기록은 모두 이 브라우저에 저장되고 서로 공유된다 — 정답표에서 빨간 테두리로 보이는 기출, 시험 대비 탭 OX 연습의 “내 오답만”, 모의시험의 우선 출제가 같은 기록을 쓴다.'),
  ] },
{ id: 'mt.key', title: '10/19 퀴즈 OX 100 — 정답과 해설', slides: '중간ox퀴즈.txt', tag: '기출', blocks: [{ mount: mountKey }] },
{ id: 'mt.abbr', title: '약어 → 원래 이름', slides: '용어표 Week1-2 · 3 · 4 · 5', tag: '연습', blocks: [{ mount: mountAbbr }] },
{ id: 'mt.essay', title: '개념 · 흐름 서술형', slides: 'Quick Check W1~W5 + 흐름', tag: '연습', blocks: [{ mount: mountEssay }] },
{ id: 'mt.exam', title: '중간고사 모의시험', slides: '기출 ≥ 30%', tag: '실전', blocks: [{ mount: mountExam }] },
] });
})();
