/* 네트워크 역전재판 — Quick Check W3-9(refused vs timeout), W3-10(느림은 측정부터), W4-6(404 vs 502), W4-10(TTFB)
 *
 * 턴제 추리. 시간 제한 없음.
 *  1) 조사  : 터미널 명령을 실행해 결과를 증거로 모은다 (법정 기록)
 *  2) 심문  : 증언마다 "잠깐!"(추궁)으로 캐묻고, 모순되는 증언에 증거를 골라 "이의 있음!"
 *  3) 지목  : 고장 난 곳과 응답을 만든 범인을 고른다
 * 틀린 증거·틀린 지목은 재판장 신뢰 -1. 신뢰 5칸이 모두 사라지면 패소.
 */
(function () {
  var GAME_ID = 'net-court';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));

  var CAST = {
    judge: { n: '재판장', i: '👨‍⚖️', loc: '재판장석' },
    pros: { n: '검사 강단정', i: '🕴️', loc: '검사석' },
    me: { n: '변호사 (나)', i: '🧑‍💼', loc: '변호인석' },
    aide: { n: '조수 핑코', i: '🐤', loc: '변호인석' },
    sys: { n: '', i: '⚖️', loc: '' }
  };
  var MAXT = 5;

  /* ------------------------------------------------------------ 사건 */
  var CASES = [
    /* ===================================================== 1 */
    { title: '거절당한 접속 사건', desc: '따라하기. 3ms 만에 실패한 접속. 범인은 방화벽일까?', qc: ['W3-9'], tutorial: true,
      witness: { n: '백엔드 개발자 이배포', i: '🧑‍🔧' },
      brief: '역전재판처럼 <b>증거로 증언의 모순을 찌르는</b> 추리 게임이다. 시간 제한은 없다.<br>' +
        '① <b>조사</b>: 터미널 명령을 실행하면 결과가 <b>법정 기록</b>(오른쪽)에 증거로 쌓인다.<br>' +
        '② <b>심문</b>: 증언마다 <b>잠깐!</b>으로 캐묻고, 증거와 어긋나는 증언에 증거를 골라 <b>이의 있음!</b><br>' +
        '③ <b>지목</b>: 진짜 원인을 고른다. 틀리면 재판장 신뢰가 한 칸 깎인다(5칸).<br>' +
        '대화는 클릭 또는 <span class="key">Enter</span>로 넘긴다.',
      intro: [
        ['sys', '— 네트워크 지방법원 제1법정 —'],
        ['judge', '지금부터 「거절당한 접속 사건」 재판을 시작합니다.', 'hammer'],
        ['pros', '사건은 간단합니다. 어제 배포 후, 쇼핑몰 앱이 API 서버 <b>api.shop.kr:8080</b>에 접속하지 못했습니다.'],
        ['pros', '원인은 뻔하죠. <b>네트워크 장애</b>! 방화벽 팀을 기소합니다.', 'shake'],
        ['aide', '변호사님, 방화벽 팀은 억울하대요! 재판 전에 증거부터 모아요.'],
        ['aide', '왼쪽 목록의 명령어를 눌러 보세요. 결과는 <b>법정 기록</b>(오른쪽)에 증거로 들어가요. 번호 키로도 돼요.']
      ],
      cmds: [
        { label: '접속 재현', cmd: 'curl -v http://api.shop.kr:8080/health', ev: 'refused',
          out: '*   Trying 10.0.1.30:8080...\n* connect to 10.0.1.30 port 8080 failed: Connection refused\n* Failed to connect to api.shop.kr port 8080 after 3 ms: Connection refused\ncurl: (7) Failed to connect to api.shop.kr port 8080 after 3 ms: Connection refused',
          say: '기다리지도 않고 3ms 만에 실패했어요. <b>refused</b> = 거절당했다는 뜻이에요.' },
        { label: '서버가 살아 있나', cmd: 'ping -c 3 api.shop.kr', ev: 'ping',
          out: 'PING api.shop.kr (10.0.1.30) 56(84) bytes of data.\n64 bytes from 10.0.1.30: icmp_seq=1 ttl=64 time=0.41 ms\n64 bytes from 10.0.1.30: icmp_seq=2 ttl=64 time=0.38 ms\n64 bytes from 10.0.1.30: icmp_seq=3 ttl=64 time=0.40 ms\n\n--- api.shop.kr ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss',
          say: '서버 10.0.1.30이 꼬박꼬박 대답했어요. 컴퓨터는 켜져 있네요.' },
        { label: '이름 풀이', cmd: 'nslookup api.shop.kr', ev: 'dns',
          out: 'Server:   10.0.0.2\nAddress:  10.0.0.2#53\n\nName:     api.shop.kr\nAddress:  10.0.1.30',
          say: 'DNS는 이름을 10.0.1.30으로 잘 바꿔 줬어요.' },
        { label: '패킷 엿보기 (서버)', cmd: '[서버] sudo tcpdump -n -i eth0 tcp port 8080', ev: 'rst',
          out: 'listening on eth0, link-type EN10MB (Ethernet)\n10:02:11.204 IP 10.0.2.15.51234 > 10.0.1.30.8080: Flags [S], seq 1203384, win 64240\n10:02:11.204 IP 10.0.1.30.8080 > 10.0.2.15.51234: Flags [R.], seq 0, ack 1203385, win 0',
          say: '[S]는 SYN, [R.]는 RST! 클라이언트의 SYN이 서버에 <b>도착</b>했고, 서버가 바로 RST로 거절했어요.' },
        { label: 'listen 포트 (서버)', cmd: '[서버] sudo ss -ltnp', ev: 'listen',
          out: 'State   Recv-Q  Send-Q   Local Address:Port   Peer Address:Port  Process\nLISTEN  0       128            0.0.0.0:22          0.0.0.0:*      users:(("sshd",pid=612))\nLISTEN  0       511          127.0.0.1:8000        0.0.0.0:*      users:(("node",pid=4210))',
          say: '어? 앱(node)은 <b>127.0.0.1:8000</b>에서 기다리고 있어요. 8080은 목록에 없네요.' }
      ],
      need: ['refused', 'ping', 'rst', 'listen'],
      ev: {
        refused: { n: 'curl 오류 (refused)', i: '📄', s: '3ms 만에 Connection refused로 실패', d: 'curl: (7) Failed to connect to\napi.shop.kr port 8080\nafter 3 ms: Connection refused' },
        ping: { n: 'ping 결과', i: '📡', s: '10.0.1.30 응답 3/3, 손실 0%', d: '3 packets transmitted,\n3 received, 0% packet loss\ntime ≈ 0.4 ms' },
        dns: { n: 'nslookup 결과', i: '📖', s: 'api.shop.kr → 10.0.1.30 (정상)', d: 'Name:    api.shop.kr\nAddress: 10.0.1.30' },
        rst: { n: 'tcpdump 기록', i: '🔍', s: 'SYN이 서버에 도착 → 서버가 RST로 응답', d: '클라 → 서버  Flags [S]   (SYN)\n서버 → 클라  Flags [R.]  (RST)' },
        listen: { n: 'ss -ltnp 결과', i: '📋', s: '8080에서 listen 중인 프로그램 없음', d: 'LISTEN 0.0.0.0:22     sshd\nLISTEN 127.0.0.1:8000 node\n\n127.0.0.1 = 같은 컴퓨터 안에서\n오는 접속만 받는다' }
      },
      trialIntro: [
        ['judge', '그럼 증인을 부르겠습니다. 증인, 이름과 직업을.', 'hammer'],
        ['wit', '백엔드 개발자 이배포입니다. 어제 배포한 게 저예요.'],
        ['pros', '증인, 그날 무슨 일이 있었는지 증언하세요.'],
        ['aide', '이제 <b>심문</b>이에요! <b>◀ ▶</b>로 증언을 넘기고, <b>잠깐!</b>으로 캐물을 수 있어요.'],
        ['aide', '증거와 어긋나는 증언을 찾으면, 오른쪽에서 증거를 고르고 <b>이의 있음!</b> 틀리면 재판장님 신뢰(위 게이지)가 깎여요.']
      ],
      ttitle: '접속 실패에 대해',
      testimony: [
        { t: '배포 후, 클라이언트가 api.shop.kr:8080에 접속하지 못했습니다.',
          press: [['me', '잠깐! 접속하지 못했다… 어떤 오류였죠?', 'hold'], ['wit', '"Connection refused"요. 기다리지도 않고 바로 실패했죠.'], ['aide', '바로 실패… 상대가 뭔가 답장을 했다는 뜻 아닐까요?']] },
        { t: '그건 서버 컴퓨터가 꺼져 있었기 때문일 거예요.', contra: ['ping', 'rst'],
          press: [['me', '잠깐! 꺼져 있었다고 확신합니까?', 'hold'], ['wit', '접속이 안 됐으니까요. 꺼진 컴퓨터는 대답을 못 하잖아요.'], ['aide', '꺼진 컴퓨터는 대답을 못 한다… 그런데 서버가 대답한 증거가 있었죠?']],
          hit: [['me', '이 증거가 보여 주듯 서버 10.0.1.30은 <b>살아서 대답하고</b> 있었습니다!'], ['me', '컴퓨터가 꺼져 있었다면 아무도 답하지 않으니 클라이언트는 기다리다 <b>timeout</b>이 났을 겁니다. 3ms 만의 refused와 맞지 않아요!'], ['wit', '으윽… 서버는 켜져 있었다고…?!', 'shake']],
          hint: '"꺼져 있었다"의 정반대, 서버가 <b>대답한</b> 흔적을 찾아보자.' },
        { t: '아니면 방화벽이 패킷을 몰래 버린 거죠. 그러니 방화벽 팀 책임입니다.', contra: ['refused', 'rst'],
          press: [['me', '잠깐! 방화벽이 버렸다면 클라이언트는 어떻게 되죠?', 'hold'], ['wit', '패킷이 사라지니까 접속이 안 되죠. 뭐가 문제예요?'], ['aide', '패킷이 사라지면… 클라이언트는 아무 답장도 못 받을 텐데요.']],
          hit: [['me', '방화벽이 패킷을 조용히 버렸다면(DROP) 클라이언트는 아무 답도 못 받고 기다리다 <b>timeout</b>이 납니다.'], ['me', '실제로는 3ms 만에 <b>refused</b>. tcpdump에도 SYN이 서버에 <b>도착</b>했고, 서버가 <b>RST</b>로 답한 게 찍혀 있습니다!'], ['pros', '크윽… 방화벽이 아니라면 대체…!', 'shake']],
          hint: '"몰래 버렸다"면 오류가 어떻게 나야 할까? 실제 오류나 패킷 기록과 비교해 보자.' },
        { t: '앱은 분명히 8080 포트에서 접속을 기다리고 있었어요.', contra: ['listen'],
          press: [['me', '잠깐! 직접 확인했습니까?', 'hold'], ['wit', '설정 파일에 PORT=8080이라고 써 놨으니까요! …아마도요.'], ['aide', '설정 파일 말고, <b>실제로</b> 열려 있는 포트를 본 증거가 있었죠?']],
          hit: [['me', 'ss -ltnp 결과를 보세요! 앱(node)은 <b>127.0.0.1:8000</b>에서 기다리고 있었습니다. 8080에는 아무도 없어요.'], ['me', 'listen 중인 프로그램이 없는 포트로 SYN이 오면, 서버 운영체제가 <b>RST</b>로 거절합니다. 그게 바로 Connection refused!'], ['wit', '으아아! 환경 변수가 안 먹었구나…! 게다가 127.0.0.1이면 밖에서는 8000으로도 못 들어오잖아!', 'break']],
          hint: '설정 파일이 아니라 <b>실제로 listen 중인 포트</b>를 보여 주는 증거는?' }
      ],
      after: [['judge', '흠… 그렇다면 이 사건의 진짜 원인은 무엇입니까, 변호인?', 'hammer']],
      picks: [
        { q: '접속이 거절당한 진짜 원인은?', o: [
          { t: '방화벽이 SYN 패킷을 버렸다', why: '버렸다면 답이 없으니 timeout이 났어야 한다. 실제로는 서버가 RST로 답했다.' },
          { t: '서버 컴퓨터가 꺼져 있었다', why: 'ping에 응답했고 RST도 보냈다. 서버는 켜져 있었다.' },
          { t: '8080 포트에 listen 중인 프로그램이 없었다 (앱은 127.0.0.1:8000)', ok: true },
          { t: 'DNS가 엉뚱한 IP를 알려 줬다', why: 'nslookup은 10.0.1.30을 돌려줬고, 그 서버가 직접 RST를 보냈다.' }] },
        { q: '어떻게 고칠까?', o: [
          { t: '접속 timeout을 30초로 늘린다', why: '거절(RST)은 기다린다고 바뀌지 않는다. 그 포트에서 기다리는 프로그램이 없다.' },
          { t: '앱이 0.0.0.0:8080에서 listen하도록 설정을 고치고, ss -ltnp로 다시 확인한다', ok: true },
          { t: '방화벽 규칙을 전부 연다', why: '방화벽은 범인이 아니다. 열어 봐야 결과는 같고 보안만 나빠진다.' }] }
      ],
      outro: [
        ['me', '진범은 <b>포트와 bind 주소</b>입니다! 앱은 127.0.0.1:8000에서 기다렸고, 8080에는 아무도 없었습니다.', 'obj'],
        ['judge', '방화벽 팀에게… <b>무죄</b>를 선고합니다!', 'verdict'],
        ['aide', '정리! <b>refused</b> = 호스트까지는 갔는데 그 포트에 listen이 없어 RST가 옴 → 서비스·포트·bind 확인.'],
        ['aide', '<b>timeout</b> = 대답이 아예 없음 → 경로·방화벽·호스트 상태 확인. 다음 사건이 바로 그쪽이에요!']
      ],
      notes: { 'W3-9': '이번 사건은 refused였다. 서버는 살아 있었고(ping) SYN도 도착했지만(tcpdump), 8080에서 listen하는 프로그램이 없어 RST가 돌아왔다(ss -ltnp).' } },

    /* ===================================================== 2 */
    { title: '침묵하는 DB 사건', desc: '30초 동안 아무 대답도 없다. DB가 죽은 걸까?', qc: ['W3-9'],
      witness: { n: '서버 담당 정서버', i: '👷' },
      brief: '이번 오류는 <b>Connection timed out</b>. 30초를 기다려도 아무 대답이 없다.<br>' +
        '지난 사건의 refused와 무엇이 다른지 생각하며 증거를 모으자.<br>' +
        '힌트: 2주차에 배운 <b>서브넷(/24)</b>이 다시 나온다.',
      intro: [
        ['judge', '「침묵하는 DB 사건」 재판을 시작합니다.', 'hammer'],
        ['pros', '새로 만든 분석 서버가 DB 서버 <b>db.shop.kr:5432</b>에 접속하면, 30초 동안 멈춰 있다가 실패합니다.'],
        ['pros', 'DB 프로세스가 죽은 게 틀림없습니다! DB 담당자를 기소합니다.', 'shake'],
        ['aide', '지난번엔 바로 거절(refused)이었는데, 이번엔 한참 기다리다 실패… 느낌이 달라요. 조사해 봐요!']
      ],
      cmds: [
        { label: '접속 재현', cmd: 'nc -vz -w 30 db.shop.kr 5432', ev: 'timeout',
          out: 'nc: connect to db.shop.kr (10.0.1.40) port 5432 (tcp) timed out: Operation now in progress',
          say: '30초를 꼬박 기다렸는데 아무 대답이 없었어요. 이게 <b>timeout</b>!' },
        { label: '사내 PC에서 접속', cmd: '[사내 PC 10.0.1.20] nc -vz db.shop.kr 5432', ev: 'office',
          out: 'Connection to db.shop.kr (10.0.1.40) 5432 port [tcp/postgresql] succeeded!',
          say: '같은 시각, 사내 PC에서는 바로 접속돼요! DB는 살아 있다는 거네요.' },
        { label: 'ping', cmd: 'ping -c 3 db.shop.kr', ev: 'ping',
          out: 'PING db.shop.kr (10.0.1.40) 56(84) bytes of data.\n\n--- db.shop.kr ping statistics ---\n3 packets transmitted, 0 received, 100% packet loss',
          say: 'ping도 100% 손실… 그런데 ping이 안 된다고 꼭 서버가 죽은 걸까요?' },
        { label: '패킷 엿보기 (DB)', cmd: '[DB 서버] sudo tcpdump -n "tcp port 5432 and host 10.0.2.15"', ev: 'nodump',
          out: 'listening on eth0, link-type EN10MB (Ethernet)\n(분석 서버에서 nc를 다시 실행하고 30초 대기)\n^C\n0 packets captured\n0 packets received by filter',
          say: '분석 서버(10.0.2.15)에서 온 패킷이 <b>0개</b>! DB 서버까지 오지도 못했어요.' },
        { label: '보안 그룹 규칙', cmd: 'aws ec2 describe-security-groups --group-ids sg-db', ev: 'sg',
          out: 'sg-db 인바운드 규칙\n  유형         프로토콜  포트   소스\n  PostgreSQL   TCP       5432   10.0.1.0/24\n  SSH          TCP       22     10.0.1.0/24\n\n※ 규칙에 맞지 않는 트래픽은 응답 없이 버려진다 (DROP)',
          say: '허용된 소스는 <b>10.0.1.0/24</b>뿐이에요. ICMP(ping) 규칙도 없네요.' },
        { label: '분석 서버 IP', cmd: '[분석 서버] ip -4 addr show eth0', ev: 'myip',
          out: '2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9001\n    inet 10.0.2.15/24 brd 10.0.2.255 scope global eth0',
          say: '분석 서버 주소는 <b>10.0.2.15/24</b>예요.' }
      ],
      need: ['timeout', 'office', 'nodump', 'sg', 'myip'],
      ev: {
        timeout: { n: 'nc 오류 (timed out)', i: '📄', s: '30초 동안 무응답 후 timed out', d: 'nc: connect to db.shop.kr\n(10.0.1.40) port 5432\ntimed out' },
        office: { n: '사내 PC 접속 기록', i: '🏢', s: '같은 시각 10.0.1.20 → DB 5432 성공', d: 'Connection to db.shop.kr\n(10.0.1.40) 5432 port\n[tcp/postgresql] succeeded!' },
        ping: { n: 'ping 결과', i: '📡', s: '3개 보내고 0개 응답 (100% 손실)', d: '3 packets transmitted,\n0 received, 100% packet loss' },
        nodump: { n: 'DB 서버 tcpdump', i: '🔍', s: '분석 서버에서 온 패킷 0개', d: 'tcp port 5432\nand host 10.0.2.15\n\n0 packets captured' },
        sg: { n: '보안 그룹 sg-db', i: '🛡️', s: '5432·22 모두 10.0.1.0/24만 허용', d: 'PostgreSQL TCP 5432 10.0.1.0/24\nSSH        TCP 22   10.0.1.0/24\n\n규칙 밖 트래픽 → 응답 없이 DROP' },
        myip: { n: '분석 서버 IP', i: '🖥️', s: '10.0.2.15/24', d: 'inet 10.0.2.15/24\nbrd 10.0.2.255' }
      },
      trialIntro: [
        ['judge', '증인, 이름과 직업을.', 'hammer'],
        ['wit', '서버 담당 정서버입니다. 분석 서버를 제가 세팅했어요.'],
        ['pros', '증인, DB가 죽었던 그날에 대해 증언하세요.']
      ],
      ttitle: 'DB 접속 실패에 대해',
      testimony: [
        { t: '분석 서버에서 DB에 접속하면 30초 뒤에 실패합니다.',
          press: [['me', '잠깐! 실패할 때 오류 메시지는?', 'hold'], ['wit', '"timed out"이요. 30초 내내 아무 반응이 없어요.'], ['aide', 'refused가 아니라 timed out… 대답 자체가 없었다는 거죠.']] },
        { t: 'DB 프로세스가 죽어 있었던 게 분명합니다.', contra: ['office', 'timeout'],
          press: [['me', '잠깐! 왜 분명하다는 거죠?', 'hold'], ['wit', '접속이 안 되니까요! 프로세스가 죽으면 접속이 안 되잖아요.'], ['aide', '프로세스만 죽었다면… 지난 사건처럼 서버가 RST로 바로 거절했을 텐데요?']],
          hit: [['me', '같은 시각 사내 PC(10.0.1.20)에서는 5432 접속이 <b>성공</b>했습니다. DB는 살아 있었어요!'], ['me', '게다가 서버는 켜져 있는데 프로세스만 죽었다면, 서버가 RST로 <b>바로 거절</b>해 refused가 났을 겁니다. 30초 침묵과는 맞지 않아요!'], ['wit', '그… 그럼 왜 대답이 없었던 거지…?', 'shake']],
          hint: 'DB가 살아 있었다는 증거, 혹은 "프로세스가 죽었다면 오류가 어떻게 났을지"를 떠올려 보자.' },
        { t: '분석 서버의 SYN은 DB 서버에 도착했어요. DB가 바빠서 무시한 겁니다.', contra: ['nodump'],
          press: [['me', '잠깐! 도착한 걸 확인했나요?', 'hold'], ['wit', '보냈으면 도착했겠죠. 같은 회사 네트워크인데요.'], ['aide', 'DB 서버 쪽에서 직접 패킷을 지켜본 증거가 있었죠?']],
          hit: [['me', 'DB 서버에서 tcpdump로 지켜봤지만, 분석 서버에서 온 패킷은 <b>0개</b>! SYN은 DB 서버에 도착조차 못 했습니다.'], ['wit', '도… 도착을 안 했다고?! 그럼 중간에서 누가…!', 'shake']],
          hint: 'DB 서버 입장에서 패킷이 왔는지 <b>직접 본</b> 증거가 있다.' },
        { t: '분석 서버도 DB 접속이 허용된 대역 안에 있습니다.', contra: ['myip', 'sg'],
          press: [['me', '잠깐! 허용 대역이 어떻게 되죠?', 'hold'], ['wit', '10.0.1.0/24요. 분석 서버도 10.0.x.x니까 같은 거죠!'], ['aide', '/24면 앞 24비트, 그러니까 <b>앞 세 덩어리</b>가 같아야 같은 대역 아닌가요?']],
          hit: [['me', '허용 대역은 <b>10.0.1.0/24</b> = 10.0.1.0 ~ 10.0.1.255. 분석 서버는 <b>10.0.2.15</b>. 세 번째 덩어리가 다릅니다!'], ['me', '규칙에 없는 트래픽은 보안 그룹이 <b>응답 없이 버립니다(DROP)</b>. 그래서 클라이언트는 아무 답도 못 받고 30초를 기다린 겁니다!'], ['wit', '으아아! /24를 /16처럼 읽었어…!', 'break']],
          hint: '/24 허용 대역과 분석 서버의 실제 IP를 나란히 놓아 보자.' },
        { t: '게다가 ping도 안 되잖아요. DB 서버가 죽은 게 맞아요.', contra: ['sg', 'office'],
          press: [['me', '잠깐! ping이 안 되면 무조건 죽은 건가요?', 'hold'], ['wit', '당연하죠! ping이 생존 확인용이잖아요.'], ['aide', 'ping(ICMP)을 허용하는 규칙이 있었는지 다시 봐요.']],
          hit: [['me', '보안 그룹에는 ICMP(ping) 허용 규칙도 없었습니다. ping도 똑같이 <b>버려졌을</b> 뿐이에요.'], ['me', '<b>ping이 안 된다고 호스트가 죽었다고 단정할 수 없습니다.</b> 실제로 사내 PC에서는 접속이 됐어요!'], ['pros', '크으윽…!', 'shake']],
          hint: 'ping 패킷도 보안 그룹 규칙을 통과해야 한다. 규칙에 ICMP가 있었나?' }
      ],
      after: [['judge', '그렇다면 변호인, 접속이 침묵한 진짜 원인은?', 'hammer']],
      picks: [
        { q: '분석 서버의 접속이 timeout된 진짜 원인은?', o: [
          { t: 'DB 프로세스가 죽어 있었다', why: '사내 PC는 접속에 성공했다. 프로세스만 죽었다면 RST로 바로 refused가 났을 것이다.' },
          { t: 'DB 서버 CPU가 바빠서 늦게 답했다', why: 'DB 서버의 tcpdump에 패킷이 0개였다. 도착조차 안 했으니 바쁠 수도 없다.' },
          { t: '보안 그룹이 10.0.1.0/24 밖(10.0.2.15)에서 온 패킷을 응답 없이 버렸다', ok: true },
          { t: 'DNS가 이름을 못 찾았다', why: 'nc는 10.0.1.40으로 접속을 시도했다. 이름은 이미 풀렸다.' }] },
        { q: '어떻게 고칠까?', o: [
          { t: '재시도 횟수와 timeout을 늘린다', why: '버려지는 패킷은 몇 번을 보내도 버려진다. 기다릴수록 사용자만 오래 멈춘다.' },
          { t: 'DB를 재시작한다', why: 'DB는 멀쩡했다. 재시작해도 보안 그룹은 그대로다.' },
          { t: '보안 그룹 인바운드에 5432 / 소스 10.0.2.15/32 규칙을 추가하고 다시 확인한다', ok: true }] }
      ],
      outro: [
        ['me', '진범은 <b>보안 그룹(방화벽)</b>! 허용 대역 밖에서 온 SYN을 아무 말 없이 버리고 있었습니다.', 'obj'],
        ['judge', 'DB 담당자에게 <b>무죄</b>를 선고합니다!', 'verdict'],
        ['aide', '정리! 같은 접속 실패라도 <b>refused</b>는 문 앞에서 거절(RST), <b>timeout</b>은 아무 대답 없음.'],
        ['aide', 'timeout이면 경로·방화벽·호스트 상태부터! 그리고 ping이 막혀 있어도 서버는 살아 있을 수 있어요.']
      ],
      notes: { 'W3-9': '이번 사건은 timeout이었다. DB는 살아 있었지만(사내 PC 성공), 보안 그룹이 10.0.1.0/24 밖의 SYN을 응답 없이 버려 DB 서버에 도착하지도 못했다(tcpdump 0개).' } },

    /* ===================================================== 3 */
    { title: '느림보 다운로드 사건', desc: '연결은 되는데 느리다. 회선을 10배로 늘리면 해결될까?', qc: ['W3-10'],
      witness: { n: '팀장 한급해', i: '🤵' },
      brief: '이번엔 <b>연결은 되는데 느리다</b>. 2GB 파일을 받는 데 30분이 넘게 걸린다.<br>' +
        '검사는 측정도 없이 회선 업그레이드를 주장한다. 먼저 <b>무엇을 잴지</b> 정하고 조사를 시작하자.<br>' +
        '재현 → 관찰 → 계층 특정 → 가설 → 검증.',
      intro: [
        ['judge', '「느림보 다운로드 사건」 재판을 시작합니다.', 'hammer'],
        ['pros', '사내 파일 서버에서 2GB 데이터셋을 받는 데 30분이 넘게 걸립니다. 연결은 잘 됩니다.'],
        ['pros', '1Gbps 회선이 좁은 겁니다! 당장 10Gbps로 업그레이드! 통신사를 기소합니다!', 'shake'],
        ['aide', '업그레이드는 엄청 비싸요… 진짜 대역폭 문제인지부터 확인해야 하지 않을까요?']
      ],
      pre: { q: '「연결은 되는데 느리다」. 무엇부터 할까?', o: [
        { t: '연결은 되니 네트워크는 무관하다. 서버 코드부터 최적화한다', why: '연결 성공은 3-way handshake가 됐다는 뜻일 뿐이다. 전송 중 손실·지연은 아직 모른다.' },
        { t: 'RTT(지연)와 처리량을 재서, 지연 문제인지 대역폭·손실 문제인지 나눈다', ok: true },
        { t: '측정은 시간 낭비. 회선 업그레이드부터 신청한다', why: '병목이 대역폭이 아니면 돈만 쓰고 그대로 느리다. 측정이 먼저다.' }] },
      preOk: [['aide', '맞아요! <b>측정부터</b>. RTT, 처리량, 재전송, 그리고 서버 처리 시간까지 차례로 재 봐요.']],
      cmds: [
        { label: 'RTT·손실 측정', cmd: 'ping -c 100 files.corp', ev: 'ping',
          out: 'PING files.corp (10.0.3.5) 56(84) bytes of data.\n...\n--- files.corp ping statistics ---\n100 packets transmitted, 98 received, 2% packet loss, time 99141ms\nrtt min/avg/max/mdev = 11.2/12.1/14.0/0.6 ms',
          say: 'RTT는 평균 12ms로 정상이에요. 그런데 <b>2% 손실</b>이 있네요.' },
        { label: '처리량 측정', cmd: 'iperf3 -c files.corp -t 10', ev: 'iperf',
          out: 'Connecting to host files.corp, port 5201\n[ ID] Interval           Transfer     Bitrate         Retr\n[  5]   0.00-10.00  sec  9.62 MBytes  8.07 Mbits/sec  312    sender\n[  5]   0.00-10.01  sec  9.55 MBytes  8.00 Mbits/sec         receiver',
          say: '1Gbps 회선에서 고작 <b>8Mbps</b>! 그리고 재전송(Retr)이 312번.' },
        { label: 'TCP 내부 상태', cmd: 'ss -ti dst files.corp', ev: 'ss',
          out: 'ESTAB  0  0   10.0.3.21:50112   10.0.3.5:80\n\t cubic rtt:12.3/0.8 mss:1448 cwnd:9 ssthresh:7\n\t retrans:0/312 delivery_rate 8.0Mbps',
          say: 'cwnd가 9밖에 안 돼요. 손실이 날 때마다 줄어들어서 커지질 못하는 거예요.' },
        { label: '회선 사용률 (스위치)', cmd: '[스위치] show interface Gi1/0/12', ev: 'util',
          out: 'GigabitEthernet1/0/12 is up, line protocol is up\n  BW 1000000 Kbit/sec\n  5 minute output rate 8120000 bits/sec, 702 packets/sec\n  (사용률 약 0.8%)',
          say: '1Gbps 중 0.8%만 쓰고 있어요. 길은 텅텅 비어 있네요.' },
        { label: '서버 상태', cmd: '[파일 서버] top -bn1 | head -3', ev: 'server',
          out: 'top - 14:20:31 up 41 days,  load average: 0.08, 0.05, 0.02\n%Cpu(s):  3.1 us,  0.9 sy,  0.0 ni, 95.8 id,  0.0 wa\nMiB Mem :  64215.4 total,  41022.7 free',
          say: 'CPU 3%, 디스크 대기(wa) 0%. 서버는 한가해요.' },
        { label: 'NIC 오류 카운터', cmd: '[내 PC] ethtool -S eth0 | grep -i err', ev: 'crc',
          out: '     rx_errors: 18342\n     rx_crc_errors: 18342\n     tx_errors: 0',
          say: '받는 쪽 <b>CRC 오류 18,342개</b>! 프레임이 깨져서 도착하고 있어요.' }
      ],
      need: ['ping', 'iperf', 'ss', 'util', 'server', 'crc'],
      ev: {
        ping: { n: 'ping 100회', i: '📡', s: 'RTT 평균 12.1ms, 손실 2%', d: '100 transmitted, 98 received\n2% packet loss\nrtt avg 12.1 ms' },
        iperf: { n: 'iperf3 처리량', i: '📈', s: '8Mbps, 재전송 312번 (10초)', d: 'Bitrate 8.07 Mbits/sec\nRetr 312' },
        ss: { n: 'ss -ti 상태', i: '🧮', s: 'cwnd 9, 재전송 312', d: 'cubic rtt:12.3 mss:1448\ncwnd:9 ssthresh:7\nretrans:0/312' },
        util: { n: '스위치 포트 사용률', i: '🔌', s: '1Gbps 중 8Mbps (0.8%)', d: 'BW 1000000 Kbit/sec\noutput rate 8120000 bits/sec' },
        server: { n: '파일 서버 top', i: '🗄️', s: 'CPU 3%, 디스크 대기 0%', d: '%Cpu 3.1 us, 95.8 id,\n0.0 wa\nload average 0.08' },
        crc: { n: 'NIC 오류 카운터', i: '⚡', s: '수신 CRC 오류 18,342개', d: 'rx_errors:     18342\nrx_crc_errors: 18342\ntx_errors:     0' }
      },
      trialIntro: [
        ['judge', '증인, 이름과 직업을.', 'hammer'],
        ['wit', '데이터팀 팀장 한급해요. 회의 들어가야 하니 빨리 끝냅시다.'],
        ['pros', '증인, 느린 다운로드에 대해 증언하세요.']
      ],
      ttitle: '느린 다운로드에 대해',
      testimony: [
        { t: '파일 하나 받는 데 30분이에요. 연결 자체는 아무 문제 없이 됩니다.',
          press: [['me', '잠깐! 연결은 된다는 거죠?', 'hold'], ['wit', '접속은 바로 돼요. 받기 시작하면 느릴 뿐이죠.'], ['aide', '연결이 된다 = handshake는 성공. 문제는 그 뒤의 전송이에요. 참고로 2GB를 30분이면 약 9Mbps예요.']] },
        { t: '연결이 되니 네트워크는 정상이죠. 파일 서버가 느린 겁니다.', contra: ['server'],
          press: [['me', '잠깐! 서버가 느리다는 근거는?', 'hold'], ['wit', '네트워크가 정상이면 서버밖에 더 있어요?'], ['aide', '서버가 정말 바빴는지 직접 본 증거가 있었죠?']],
          hit: [['me', '파일 서버는 CPU 3%, 디스크 대기 0%. <b>한가하기 그지없었습니다!</b>'], ['me', '그리고 "연결이 된다"는 handshake가 성공했다는 것뿐, 전송 품질까지 보장하지 않아요.'], ['wit', '서, 서버가 아니라고…?', 'shake']],
          hint: '서버가 정말 바빴는지, 서버의 상태를 보여 주는 증거는?' },
        { t: '1Gbps 회선이 꽉 차서 느린 겁니다. 그러니 10Gbps가 필요해요.', contra: ['util'],
          press: [['me', '잠깐! 꽉 찬 걸 확인했나요?', 'hold'], ['wit', '느리면 꽉 찬 거죠! 상식이에요.'], ['aide', '회선이 실제로 얼마나 쓰이고 있었는지 잰 증거가 있어요.']],
          hit: [['me', '스위치 포트 사용률은 고작 <b>0.8%</b>(8Mbps)! 1Gbps 길은 텅 비어 있었습니다.'], ['me', '10Gbps로 넓혀도 지금 쓰는 건 그 0.08%… 돈만 날리고 똑같이 느릴 겁니다!'], ['pros', '으윽, 회선이 텅 비어 있었다고?!', 'shake']],
          hint: '회선이 정말 꽉 찼는지, <b>실제 사용률</b>을 보여 주는 증거는?' },
        { t: '아니면 지연(RTT)이 엄청 길어서 그런 거겠죠.', contra: ['ping'],
          press: [['me', '잠깐! RTT를 재 봤나요?', 'hold'], ['wit', '느리니까 길겠죠.'], ['aide', '느리다 ≠ RTT가 길다. 직접 잰 값이 있었죠?']],
          hit: [['me', 'ping으로 잰 RTT는 평균 <b>12.1ms</b>. 사내망으로는 지극히 정상입니다!'], ['wit', '…그럼 대체 뭐가 문제란 거예요!', 'shake']],
          hint: 'RTT를 직접 잰 증거를 찾아보자.' },
        { t: '패킷은 하나도 안 잃어버렸어요. TCP가 다 알아서 해 주니까요.', contra: ['iperf', 'ss', 'ping'],
          press: [['me', '잠깐! 손실이 전혀 없었다고요?', 'hold'], ['wit', 'TCP는 신뢰성 있는 프로토콜이잖아요. 잃어버릴 리가 없죠.'], ['aide', 'TCP가 잃어버린 걸 <b>다시 보내서</b> 복구하는 거지, 손실이 안 나는 건 아니에요!']],
          hit: [['me', 'ping 손실 2%, iperf 재전송 312번, ss의 retrans도 312! 패킷은 계속 사라지고 있었습니다.'], ['me', 'TCP는 손실을 재전송으로 메우지만, 손실을 혼잡 신호로 보고 <b>cwnd를 줄입니다</b>. 그래서 cwnd가 9에 갇혀 8Mbps밖에 안 나온 겁니다!'], ['wit', '재… 재전송…?!', 'shake']],
          hint: '손실이나 재전송이 있었다는 걸 보여 주는 측정값을 찾아보자.' },
        { t: '손실이 있었다 쳐도, 원인은 아무도 몰라요! 그러니 업그레이드밖에 없어요.', contra: ['crc'],
          press: [['me', '잠깐! 정말 원인을 알 수 없나요?', 'hold'], ['wit', '패킷이 어디서 사라지는지 무슨 수로 알아요?'], ['aide', '받는 쪽 네트워크 카드가 세고 있던 숫자가 있었죠?']],
          hit: [['me', '내 PC 네트워크 카드의 <b>rx_crc_errors 18,342</b>! 프레임이 깨진 채 도착해 버려지고 있었습니다.'], ['me', 'CRC 오류는 전기 신호가 망가졌다는 뜻. <b>물리 계층</b>, 케이블이나 커넥터 불량입니다!'], ['wit', '크아아악! 그 케이블, 의자로 몇 번 밟았는데…!', 'break']],
          hint: '손실이 <b>어디서</b> 생기는지 알려 주는 카운터가 있었다.' }
      ],
      after: [['judge', '변호인, 이 느림의 진범을 지목하십시오.', 'hammer']],
      picks: [
        { q: '느림의 진짜 원인은?', o: [
          { t: '회선 대역폭 부족', why: '스위치 포트 사용률은 0.8%였다. 길은 비어 있었다.' },
          { t: '파일 서버의 처리 지연', why: 'CPU 3%, 디스크 대기 0%. 서버는 한가했다.' },
          { t: '긴 RTT(지연)', why: 'RTT는 12ms로 정상이었다.' },
          { t: '불량 케이블로 인한 패킷 손실 → 재전송과 cwnd 감소', ok: true }] },
        { q: '먼저 해 볼 조치는?', o: [
          { t: '10Gbps로 업그레이드한다', why: '손실 때문에 cwnd가 묶여 있으면 길을 넓혀도 그대로다.' },
          { t: 'PC의 랜 케이블과 스위치 포트를 바꾸고, 같은 측정을 다시 해서 확인한다', ok: true },
          { t: 'TCP 재전송을 끈다', why: '재전송은 끌 수 있는 기능이 아니고, 끄면 파일이 깨진다. 원인(손실)을 없애야 한다.' }] }
      ],
      outro: [
        ['me', '진범은 <b>불량 케이블</b>! 손실 → 재전송 → cwnd 감소로 1Gbps 회선을 8Mbps로 만들었습니다.', 'obj'],
        ['judge', '통신사에게 <b>무죄</b>를 선고합니다!', 'verdict'],
        ['aide', '정리! "연결은 되는데 느리다"면 <b>RTT와 처리량부터</b> 재서 지연 문제인지 대역폭·손실 문제인지 나눠요.'],
        ['aide', '그다음 재전송, 윈도우(cwnd), 서버 처리 시간. 고친 뒤에도 <b>다시 측정</b>해서 검증!']
      ],
      notes: { 'W3-10': '측정 순서: RTT 12ms(정상) → 처리량 8Mbps(1Gbps의 0.8%) → 재전송 312번·cwnd 9 → 서버는 한가 → NIC CRC 오류. 측정 없이 회선을 늘렸다면 돈만 쓰고 그대로였다.' } },

    /* ===================================================== 4 */
    { title: '두 개의 오류 화면 사건', desc: '404와 502가 동시에. 각각 누가 만든 응답일까?', qc: ['W4-6'],
      witness: { n: '프런트 개발자 윤화면', i: '👩‍💻' },
      brief: '쇼핑몰에서 <b>404</b>와 <b>502</b>가 동시에 터졌다.<br>' +
        '구조: 브라우저 → <b>nginx</b>(리버스 프록시) → 뒤쪽 앱 서버들(상품 :3000, 장바구니 :3001)<br>' +
        '오류 화면이 떴다고 다 같은 범인이 아니다. <b>그 응답을 누가 만들었는지</b> 따져 보자.',
      intro: [
        ['judge', '「두 개의 오류 화면 사건」 재판을 시작합니다.', 'hammer'],
        ['pros', '쇼핑몰에서 두 오류가 동시에 터졌습니다. 상품 페이지 /products/42는 <b>404</b>, 장바구니 /api/cart는 <b>502</b>.'],
        ['pros', '오류 화면은 브라우저에 뜨니 브라우저와 DNS 문제입니다! 프런트 팀을 기소합니다!', 'shake'],
        ['aide', '요청은 브라우저 → nginx → 뒤쪽 앱 순서로 가요. 각 응답의 출처를 하나씩 확인해 봐요.']
      ],
      cmds: [
        { label: '404 응답 자세히', cmd: 'curl -v https://shop.kr/products/42', ev: 'c404',
          out: '> GET /products/42 HTTP/1.1\n> Host: shop.kr\n>\n< HTTP/1.1 404 Not Found\n< Server: nginx\n< Content-Type: application/json; charset=utf-8\n< X-Powered-By: Express\n<\n{"error":"product 42 not found"}',
          say: '서버가 보낸 HTTP 응답이에요. Server는 nginx인데… <b>X-Powered-By: Express</b>, 그리고 JSON 본문?' },
        { label: '502 응답 자세히', cmd: 'curl -v https://shop.kr/api/cart', ev: 'c502',
          out: '> GET /api/cart HTTP/1.1\n> Host: shop.kr\n>\n< HTTP/1.1 502 Bad Gateway\n< Server: nginx\n< Content-Type: text/html\n<\n<html><head><title>502 Bad Gateway</title></head>\n<body><center><h1>502 Bad Gateway</h1></center>\n<hr><center>nginx</center></body></html>',
          say: '이건 nginx의 기본 오류 페이지네요. 맨 아래에 <b>nginx</b>라고 서명까지 있어요.' },
        { label: '이름 풀이', cmd: 'nslookup shop.kr', ev: 'dns',
          out: 'Server:   1.1.1.1\nAddress:  1.1.1.1#53\n\nNon-authoritative answer:\nName:     shop.kr\nAddress:  203.0.113.10',
          say: 'DNS는 정상이에요. shop.kr → 203.0.113.10.' },
        { label: '상품 앱 로그', cmd: '[서버] journalctl -u products -n 2', ev: 'applog',
          out: 'products[2210]: GET /products/42 → 404  (상품 42: 지난주 삭제됨)\nproducts[2210]: GET /products/41 → 200  12ms',
          say: '상품 앱이 <b>직접</b> 404를 돌려준 기록이에요!' },
        { label: 'nginx 오류 로그', cmd: '[서버] tail -n 1 /var/log/nginx/error.log', ev: 'nginxerr',
          out: '2026/10/17 09:14:52 [error] 1203#0: *88 connect() failed (111: Connection refused) while connecting to upstream, client: 198.51.100.7, server: shop.kr, request: "GET /api/cart HTTP/1.1", upstream: "http://127.0.0.1:3001/api/cart"',
          say: 'nginx가 뒤쪽 127.0.0.1:3001에 연결하려다 <b>Connection refused</b>! 1번 사건에서 본 그거예요.' },
        { label: 'nginx 설정', cmd: '[서버] grep -A1 location /etc/nginx/sites-enabled/shop', ev: 'conf',
          out: 'location /products/ {\n    proxy_pass http://127.0.0.1:3000;\nlocation /api/cart {\n    proxy_pass http://127.0.0.1:3001;',
          say: '/api/cart는 3001번 포트로 넘기도록 되어 있어요. 장바구니 앱의 포트가 3001이니 설정은 맞네요.' },
        { label: '장바구니 서비스 상태', cmd: '[서버] systemctl status cart', ev: 'cartdown',
          out: '× cart.service - Cart API (listen :3001)\n     Loaded: loaded (/etc/systemd/system/cart.service; enabled)\n     Active: failed (Result: exit-code) since 09:12:03\n    Process: 3301 ExecStart=/usr/bin/node cart.js (code=exited, status=1/FAILURE)',
          say: '장바구니 앱이 09:12에 <b>죽어</b> 있어요!' }
      ],
      need: ['c404', 'c502', 'applog', 'nginxerr', 'conf', 'cartdown'],
      ev: {
        c404: { n: 'curl -v /products/42', i: '📄', s: 'HTTP 404 · X-Powered-By: Express · JSON 본문', d: '< HTTP/1.1 404 Not Found\n< Server: nginx\n< X-Powered-By: Express\n{"error":"product 42\n not found"}' },
        c502: { n: 'curl -v /api/cart', i: '📄', s: 'HTTP 502 · nginx 기본 오류 페이지', d: '< HTTP/1.1 502 Bad Gateway\n< Server: nginx\n<h1>502 Bad Gateway</h1>\n<center>nginx</center>' },
        dns: { n: 'nslookup 결과', i: '📖', s: 'shop.kr → 203.0.113.10 (정상)', d: 'Name:    shop.kr\nAddress: 203.0.113.10' },
        applog: { n: '상품 앱 로그', i: '🧾', s: '상품 앱이 직접 404 반환 (상품 삭제됨)', d: 'GET /products/42 → 404\n(상품 42: 지난주 삭제됨)' },
        nginxerr: { n: 'nginx error.log', i: '🧾', s: 'upstream :3001 연결 실패 (refused)', d: 'connect() failed\n(111: Connection refused)\nwhile connecting to upstream\nupstream: 127.0.0.1:3001' },
        conf: { n: 'nginx 설정', i: '⚙️', s: '/api/cart → 127.0.0.1:3001 (올바름)', d: '/products/ → 127.0.0.1:3000\n/api/cart  → 127.0.0.1:3001' },
        cartdown: { n: 'cart 서비스 상태', i: '💀', s: '장바구니 앱(:3001) 09:12부터 죽어 있음', d: 'cart.service (listen :3001)\nActive: failed\nsince 09:12:03' }
      },
      trialIntro: [
        ['judge', '증인, 이름과 직업을.', 'hammer'],
        ['wit', '프런트 개발자 윤화면이에요. 오류 화면을 제일 먼저 발견했어요.'],
        ['pros', '증인, 두 오류 화면에 대해 증언하세요.']
      ],
      ttitle: '두 오류 화면에 대해',
      testimony: [
        { t: '두 오류 화면 다 브라우저가 만든 거예요. 서버는 아무 응답도 안 했어요.', contra: ['c404', 'c502'],
          press: [['me', '잠깐! 서버가 아무 응답도 안 했다고요?', 'hold'], ['wit', '오류 화면은 브라우저에 뜨잖아요. 그러니 브라우저가 만든 거죠.'], ['aide', '화면이 브라우저에 뜨는 거랑, 그 내용을 누가 보냈는지는 별개예요.']],
          hit: [['me', 'curl -v 결과를 보세요! <b>HTTP/1.1 404</b>, <b>HTTP/1.1 502</b>라는 상태 줄과 헤더가 서버 쪽에서 왔습니다.'], ['me', '브라우저가 스스로 만드는 오류는 ERR_CONNECTION_REFUSED처럼 <b>HTTP 응답 자체가 없는</b> 경우예요. 404·502는 서버 쪽 누군가가 만든 응답입니다!'], ['wit', '서… 서버가 보낸 거였어?', 'shake']],
          hint: '서버가 실제로 HTTP 응답을 보냈다는 증거가 있다.' },
        { t: '404는 DNS가 도메인을 못 찾아서 난 거예요.', contra: ['dns', 'applog'],
          press: [['me', '잠깐! DNS가 못 찾으면 404가 나나요?', 'hold'], ['wit', '"Not Found"잖아요. 이름을 못 찾았다는 뜻 아니에요?'], ['aide', 'DNS가 실패하면 서버에 요청이 가지도 못할 텐데요…']],
          hit: [['me', 'DNS는 shop.kr을 203.0.113.10으로 잘 찾았고, 요청은 상품 앱까지 갔습니다.'], ['me', 'DNS가 실패하면 서버에 연결도 못 하니 HTTP 응답이 아예 없어요(ERR_NAME_NOT_RESOLVED). <b>404는 DNS가 만들 수 없는 응답</b>입니다!'], ['wit', '그, 그렇구나…!', 'shake']],
          hint: 'DNS가 정상이었다는 증거, 또는 요청이 서버까지 갔다는 증거.' },
        { t: '응답 헤더에 Server: nginx라고 써 있잖아요. 그러니 404도 nginx가 만든 거예요.', contra: ['applog', 'c404'],
          press: [['me', '잠깐! Server 헤더만으로 단정할 수 있나요?', 'hold'], ['wit', 'Server가 nginx면 nginx가 만든 거 아니에요?'], ['aide', 'nginx는 뒤쪽 앱의 응답을 전달할 때도 Server 헤더를 자기 이름으로 바꿔 달아요. 다른 단서는 없을까요?']],
          hit: [['me', '같은 응답에 <b>X-Powered-By: Express</b>와 앱이 쓴 JSON 본문이 있습니다. 상품 앱 로그에도 직접 404를 돌려준 기록이 남아 있어요.'], ['me', '404는 <b>원본 서버(상품 앱)</b>가 "그 자원이 없다"고 만든 응답이고, nginx는 그걸 전달만 했습니다!'], ['wit', '헤더 하나만 보고 판단했네요…', 'shake']],
          hint: 'Server 헤더 말고, 응답을 <b>실제로 만든 앱</b>의 흔적을 찾자.' },
        { t: '502는 nginx 설정이 잘못돼서 난 거예요. 그러니 nginx를 고쳐야 해요.', contra: ['nginxerr', 'conf', 'cartdown'],
          press: [['me', '잠깐! 설정이 어떻게 잘못됐다는 거죠?', 'hold'], ['wit', '502 화면 맨 아래에 nginx라고 써 있었으니까요!'], ['aide', '502를 만든 건 nginx가 맞아요. 그런데 nginx가 <b>왜</b> 그걸 만들었는지는 다른 문제예요.']],
          hit: [['me', 'nginx 설정은 /api/cart를 127.0.0.1:3001로 정확히 넘기고 있었고, error.log에는 그 3001에 연결하려다 <b>Connection refused</b>가 찍혀 있습니다.'], ['me', '장바구니 앱은 09:12부터 죽어 있었어요. 502는 nginx가 "<b>뒤쪽 서버에게서 정상 응답을 못 받았다</b>"고 보고한 것뿐입니다!'], ['wit', '으아앗! 장바구니 서버가 죽어 있었다니…!', 'break']],
          hint: 'nginx가 뒤쪽 서버와 무슨 일을 겪었는지 보여 주는 증거는?' }
      ],
      after: [['judge', '변호인, 각 응답을 만든 자를 지목하십시오.', 'hammer']],
      picks: [
        { q: '404 응답을 만든 것은?', o: [
          { t: '브라우저', why: '브라우저는 서버가 보낸 404를 보여 줬을 뿐이다.' },
          { t: 'DNS 서버', why: 'DNS는 이름 → IP만 알려 준다. HTTP 상태 코드를 만들지 않는다.' },
          { t: 'nginx 프록시', why: 'nginx는 전달하며 Server 헤더를 바꿨을 뿐, 본문과 X-Powered-By는 상품 앱이 만든 것이다.' },
          { t: '원본 서버 (상품 앱)', ok: true }] },
        { q: '502 응답을 만든 것은?', o: [
          { t: '브라우저', why: 'curl도 HTTP 502를 받았다. 서버 쪽에서 온 응답이다.' },
          { t: '장바구니 앱', why: '장바구니 앱은 죽어 있어서 아무 응답도 만들 수 없었다.' },
          { t: 'nginx (프록시·게이트웨이)', ok: true },
          { t: 'DNS 서버', why: 'DNS는 HTTP 응답을 만들지 않는다.' }] },
        { q: '502를 고치려면 어디를 조사할까?', o: [
          { t: 'nginx 설정 파일을 다시 쓴다', why: '설정은 올바르게 3001을 가리키고 있었다.' },
          { t: '뒤쪽(업스트림) 장바구니 서비스의 상태와 로그', ok: true },
          { t: '삭제된 상품 42를 복구한다', why: '그건 404 쪽 이야기다. 그리고 그 404는 정상 동작일 수도 있다.' },
          { t: '사용자 PC의 DNS 캐시를 비운다', why: 'DNS는 정상이었다.' }] }
      ],
      outro: [
        ['me', '404는 <b>상품 앱</b>이, 502는 <b>nginx</b>가 만들었습니다. 그리고 502의 진짜 원인은 죽어 있던 <b>장바구니 앱</b>!', 'obj'],
        ['judge', '프런트 팀에게 <b>무죄</b>를 선고합니다!', 'verdict'],
        ['aide', '정리! <b>404</b> = 원본 서버가 "그 자원이 없다" → 경로·라우트·데이터 확인.'],
        ['aide', '<b>502</b> = 프록시·게이트웨이가 "뒤쪽 서버에게서 정상 응답을 못 받았다" → 업스트림 서버 상태 확인!']
      ],
      notes: { 'W4-6': '404는 X-Powered-By: Express와 앱 로그로 상품 앱이 만든 것을 확인했다(Server: nginx는 프록시가 덧붙인 것). 502는 nginx가 만들었고, 원인은 :3001 업스트림(장바구니 앱)이 죽어 있던 것이었다.' } },

    /* ===================================================== 5 */
    { title: '첫 바이트의 행방 사건', desc: '페이지가 3초 늦다. DNS? 회선? DevTools Timing이 답을 안다.', qc: ['W4-10'],
      witness: { n: '기획자 오조급', i: '👨‍💼' },
      brief: '주문 내역 페이지가 열리기까지 3초 가까이 걸린다.<br>' +
        'DevTools Network 탭의 <b>Timing</b>은 시간을 구간별로 나눠 보여 준다: DNS → 연결(TCP·TLS) → 요청 전송 → <b>Waiting(TTFB)</b> → 다운로드.<br>' +
        '어느 구간이 긴지 보면 범인이 사는 곳이 보인다.',
      intro: [
        ['judge', '「첫 바이트의 행방 사건」 재판을 시작합니다.', 'hammer'],
        ['pros', '주문 내역 페이지 /orders가 뜨기까지 3초 가까이 걸립니다. 사용자 불만이 폭주하고 있습니다!'],
        ['pros', 'DNS가 느리거나 사용자 회선이 좁은 겁니다! DNS 업체와 통신사를 기소합니다!', 'shake'],
        ['aide', 'DevTools의 Timing부터 봐요. 시간을 구간별로 쪼개서 보여 주거든요.']
      ],
      cmds: [
        { label: 'DevTools Timing: /orders', cmd: 'DevTools ▸ Network ▸ /orders ▸ Timing', ev: 'timing',
          out: 'Queueing ......................     1.2 ms\nStalled .......................     2.0 ms\nDNS Lookup ....................     3.1 ms\nInitial connection ............    22.4 ms\n   └ SSL ......................    12.0 ms\nRequest sent ..................     0.2 ms\nWaiting for server response ...  2812.0 ms   ← TTFB\nContent Download ..............    14.8 ms',
          say: 'DNS 3ms, 연결 22ms, 다운로드 15ms… 그런데 <b>Waiting(TTFB)만 2.8초</b>!' },
        { label: 'DevTools Timing: /logo.png', cmd: 'DevTools ▸ Network ▸ /logo.png ▸ Timing (같은 서버)', ev: 'static',
          out: 'DNS Lookup ....................     0 ms   (캐시)\nInitial connection ............     0 ms   (연결 재사용)\nRequest sent ..................     0.1 ms\nWaiting for server response ...     9.6 ms   ← TTFB\nContent Download ..............     4.1 ms',
          say: '같은 서버인데 정적 파일 logo.png는 첫 바이트가 9.6ms 만에 와요.' },
        { label: '회선 속도', cmd: 'speedtest', ev: 'speed',
          out: 'Latency:   9.8 ms\nDownload:  312.4 Mbps\nUpload:    94.1 Mbps',
          say: '사용자 회선은 312Mbps. 넉넉해요.' },
        { label: 'APM 트레이스', cmd: 'APM ▸ Traces ▸ GET /orders', ev: 'apm',
          out: 'GET /orders                               2798 ms\n ├─ auth.verifyToken                         11 ms\n ├─ db.query  SELECT * FROM orders\n │           WHERE user_id = ?             2641 ms\n └─ render.template                          39 ms',
          say: '서버 안에서만 2.8초. 그중 <b>DB 쿼리 하나가 2.6초</b>예요!' },
        { label: 'DB 느린 쿼리 로그', cmd: '[DB] tail slow-query.log && EXPLAIN', ev: 'slowlog',
          out: '# Query_time: 2.641  Lock_time: 0.000  Rows_sent: 37  Rows_examined: 4812330\nSELECT * FROM orders WHERE user_id = 1042;\n\nEXPLAIN → type: ALL (전체 스캔)   key: NULL (인덱스 없음)',
          say: '37줄을 돌려주려고 <b>481만 줄</b>을 훑었어요. user_id에 인덱스가 없어요!' }
      ],
      need: ['timing', 'static', 'apm', 'slowlog'],
      ev: {
        timing: { n: 'Timing: /orders', i: '⏱️', s: 'TTFB 2,812ms · 나머지 구간은 짧음', d: 'DNS Lookup          3.1 ms\nInitial connection 22.4 ms\n └ SSL             12.0 ms\nWaiting (TTFB)   2812.0 ms\nContent Download   14.8 ms' },
        static: { n: 'Timing: /logo.png', i: '🖼️', s: '같은 서버, TTFB 9.6ms', d: 'Waiting (TTFB)  9.6 ms\nContent Download 4.1 ms' },
        speed: { n: 'speedtest', i: '📶', s: '다운로드 312Mbps, 지연 9.8ms', d: 'Latency  9.8 ms\nDownload 312.4 Mbps' },
        apm: { n: 'APM 트레이스', i: '🧭', s: '서버 처리 2,798ms 중 DB 쿼리 2,641ms', d: 'GET /orders       2798 ms\n auth              11 ms\n db.query        2641 ms\n render            39 ms' },
        slowlog: { n: 'DB 느린 쿼리 로그', i: '🐢', s: '37줄 반환에 481만 줄 스캔 (인덱스 없음)', d: 'Query_time: 2.641\nRows_sent: 37\nRows_examined: 4812330\nEXPLAIN: type ALL, key NULL' }
      },
      trialIntro: [
        ['judge', '증인, 이름과 직업을.', 'hammer'],
        ['wit', '기획자 오조급입니다. 사용자 불만 메일을 제가 다 받고 있어요.'],
        ['pros', '증인, 느린 페이지에 대해 증언하세요.']
      ],
      ttitle: '느린 주문 내역 페이지에 대해',
      testimony: [
        { t: '/orders 페이지가 뜨기까지 3초 가까이 걸립니다.',
          press: [['me', '잠깐! 다른 페이지도 느린가요?', 'hold'], ['wit', '이미지 같은 건 금방 떠요. 주문 내역만 그래요.'], ['aide', '같은 서버인데 어떤 건 빠르고 어떤 건 느리다… 단서예요!']] },
        { t: '이건 DNS가 느려서 첫 바이트가 늦게 온 거예요.', contra: ['timing'],
          press: [['me', '잠깐! DNS가 느렸다는 근거는?', 'hold'], ['wit', 'TTFB에는 DNS 시간도 들어가잖아요!'], ['aide', 'DevTools Timing에서는 DNS Lookup이 Waiting(TTFB)과 <b>따로</b> 표시돼요. 숫자를 확인해 봐요.']],
          hit: [['me', 'Timing을 보세요! DNS Lookup은 <b>3.1ms</b>. Waiting(TTFB)과는 따로 잰 구간입니다.'], ['me', 'DNS·TCP·TLS를 다 합쳐도 30ms가 안 됩니다. 2.8초는 전부 <b>Waiting</b> 구간에 있어요!'], ['pros', '크윽, DNS가 3ms라고?!', 'shake']],
          hint: '구간별 시간이 나온 증거에서 DNS 값을 확인하자.' },
        { t: '아니면 사용자 회선이 좁아서 늦게 도착하는 거예요.', contra: ['static', 'speed', 'timing'],
          press: [['me', '잠깐! 회선이 좁으면 어느 구간이 길어질까요?', 'hold'], ['wit', '그야… 전부 다요?'], ['aide', '회선이 좁으면 데이터를 <b>받는</b> 구간(Content Download)이 길어지겠죠.']],
          hit: [['me', '회선이 좁다면 <b>Content Download</b>가 길어야 합니다. 실제로는 14.8ms. 회선도 312Mbps로 넉넉해요.'], ['me', '게다가 같은 서버의 logo.png는 9.6ms 만에 첫 바이트가 왔습니다. 길은 멀쩡해요!'], ['wit', '회, 회선 탓이 아니라니…', 'shake']],
          hint: '회선이 좁다면 어떤 숫자가 나빠야 할까? 실제 측정값과 비교하자.' },
        { t: '서버는 요청을 받자마자 바로 답을 보냈어요.', contra: ['apm'],
          press: [['me', '잠깐! 서버 안에서 걸린 시간을 봤나요?', 'hold'], ['wit', '서버가 뭘 그렇게 오래 하겠어요.'], ['aide', '서버 안에서 시간을 어디에 썼는지 기록한 증거가 있었죠?']],
          hit: [['me', 'APM 트레이스를 보세요. 서버 안에서만 <b>2,798ms</b>! 요청을 받고 첫 바이트를 보내기까지 서버가 붙잡고 있었습니다.'], ['wit', '서버가… 3초 가까이…?!', 'shake']],
          hint: '서버 <b>안에서</b> 걸린 시간을 쪼개 보여 주는 증거는?' },
        { t: 'DB는 이번 일과 상관없어요. 결과도 고작 37줄인걸요.', contra: ['slowlog'],
          press: [['me', '잠깐! 37줄이면 빠르다는 건가요?', 'hold'], ['wit', '데이터가 적으니까 당연히 빠르죠.'], ['aide', '돌려준 줄 수랑, 찾느라 <b>훑은</b> 줄 수는 다를 수 있어요.']],
          hit: [['me', '37줄을 돌려주려고 <b>4,812,330줄</b>을 훑었습니다! user_id에 인덱스가 없어 <b>전체 스캔</b>, 쿼리 하나에 2.6초!'], ['wit', '으아아! 인덱스… 그거 지난달에 지웠는데…!', 'break']],
          hint: 'DB가 실제로 몇 줄을 훑었는지 기록한 증거가 있다.' }
      ],
      after: [['judge', '변호인, 첫 바이트를 붙잡고 있던 진범을 지목하십시오.', 'hammer']],
      picks: [
        { q: 'TTFB만 긴 진짜 원인은?', o: [
          { t: 'DNS 조회 지연', why: 'DNS Lookup은 3.1ms였고, TTFB와 따로 잰 구간이다.' },
          { t: '사용자 회선 대역폭 부족', why: 'Content Download 14.8ms, 회선 312Mbps. 받는 구간은 짧았다.' },
          { t: 'TLS 핸드셰이크', why: 'SSL은 12ms였다. 연결 준비 구간은 정상이다.' },
          { t: '서버 처리 (인덱스 없는 DB 쿼리)', ok: true }] },
        { q: '해결책은?', o: [
          { t: 'DNS 업체를 바꾼다', why: 'DNS는 3ms였다. 바꿔도 2.8초는 그대로다.' },
          { t: 'orders.user_id에 인덱스를 추가하고, TTFB를 다시 측정한다', ok: true },
          { t: '사용자에게 회선 업그레이드를 권한다', why: '사용자 회선은 넉넉했다. 기다리는 건 서버다.' }] }
      ],
      outro: [
        ['me', '진범은 <b>서버 처리</b>, 인덱스 없는 DB 쿼리였습니다! 첫 바이트는 서버 안에서 2.6초 동안 갇혀 있었어요.', 'obj'],
        ['judge', 'DNS 업체와 통신사에게 <b>무죄</b>를 선고합니다!', 'verdict'],
        ['aide', '정리! <b>TTFB</b> = 요청을 보낸 뒤 첫 바이트가 오기까지. DNS·TCP·TLS가 짧은데 TTFB만 길면 <b>서버 쪽</b>(앱 로직, DB 쿼리, 업스트림 호출)을 의심!'],
        ['aide', '이걸로 모든 사건 종결! 증거는 거짓말을 하지 않아요.']
      ],
      notes: { 'W4-10': 'DNS 3ms, 연결 22ms, 다운로드 15ms인데 TTFB만 2,812ms였다. APM으로 서버 안을 쪼개 보니 인덱스 없는 DB 쿼리가 2,641ms를 차지했다.' } }
  ];

  /* ------------------------------------------------------------ 상태 */
  var S = null;
  function newState(ci) {
    var c = CASES[ci];
    return { ci: ci, c: c, trust: MAXT, have: [], sel: null, phase: 'intro', mode: 'talk',
      q: [], qi: 0, then: null, typing: false, shown: 0, tm: null, speaker: 'sys',
      ran: {}, lastCmd: -1, termText: '', si: 0, broken: {}, pressed: {}, pk: 0, wrongOpt: {}, wrongs: 0, over: false, lastFx: null };
  }
  function cast(who) { return who === 'wit' ? { n: S.c.witness.n, i: S.c.witness.i, loc: '증언대' } : CAST[who]; }

  /* ------------------------------------------------------------ 효과 */
  var SFX = {
    blip: function () { NA.sfx.tone(820, .02, 'square', .035); },
    obj: function () { NA.sfx.tone(220, .08, 'sawtooth', .22, 2.2); NA.sfx.tone(440, .25, 'square', .2, 1.3, .07); NA.sfx.noise(.2, .25); },
    hold: function () { NA.sfx.tone(520, .1, 'square', .18, 1.5); NA.sfx.tone(780, .15, 'square', .14, null, .08); },
    hammer: function () { NA.sfx.noise(.08, .5); NA.sfx.tone(140, .15, 'triangle', .3, .5); },
    damage: function () { NA.sfx.tone(300, .12, 'sawtooth', .22, .4); NA.sfx.noise(.25, .3); },
    got: function () { NA.sfx.tone(660, .06, 'square', .14); NA.sfx.tone(880, .06, 'square', .14, null, .06); NA.sfx.tone(1320, .12, 'triangle', .14, null, .12); },
    breakdown: function () { for (var i = 0; i < 6; i++) NA.sfx.tone(900 - i * 120, .09, 'sawtooth', .18, null, i * .06); NA.sfx.noise(.6, .3); },
    verdict: function () { NA.sfx.win(); setTimeout(function () { NA.sfx.win(); }, 450); }
  };
  function shout(kind) {
    var sc = app.querySelector('.scene'); if (!sc) return;
    var label = { obj: '이의 있음!', hold: '잠깐!', take: '받아라!' }[kind];
    var d = document.createElement('div'); d.className = 'shout';
    d.innerHTML = '<div class="b ' + kind + '">' + label + '</div>';
    sc.appendChild(d); setTimeout(function () { d.remove(); }, 950);
    if (kind === 'hold') SFX.hold(); else SFX.obj();
    shake(sc); flash(kind === 'obj' ? '' : '');
  }
  function shake(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
  function flash(red) {
    var sc = app.querySelector('.scene'); if (!sc) return;
    var f = document.createElement('div'); f.className = 'flash go' + (red ? ' red' : ''); sc.appendChild(f);
    setTimeout(function () { f.remove(); }, 400);
  }
  function verdictFx(ok) {
    var sc = app.querySelector('.scene'); if (!sc) return;
    var v = document.createElement('div'); v.className = 'verdict ' + (ok ? 'ok' : 'ng');
    var word = ok ? ['무', '죄'] : ['유', '죄'];
    v.innerHTML = word.map(function (w, i) { return '<span style="animation-delay:' + (i * .35) + 's">' + w + '</span>'; }).join('');
    sc.appendChild(v);
    if (ok) {
      SFX.verdict();
      var cols = ['#ff4d5e', '#f2c94c', '#4de2ff', '#5dffa0', '#b18cff'];
      for (var i = 0; i < 60; i++) {
        var c = document.createElement('i'); c.className = 'confetti';
        c.style.left = (Math.random() * 100) + '%'; c.style.background = cols[i % cols.length];
        c.style.animationDuration = (1.4 + Math.random() * 1.6) + 's'; c.style.animationDelay = (Math.random() * .6) + 's';
        sc.appendChild(c);
      }
    } else NA.sfx.lose();
    setTimeout(function () { sc.querySelectorAll('.verdict,.confetti').forEach(function (x) { x.remove(); }); }, 3600);
  }

  /* ------------------------------------------------------------ 대화 */
  function talk(lines, then) {
    S.mode = 'talk'; S.q = lines.slice(); S.qi = -1; S.then = then;
    nextLine();
  }
  function nextLine() {
    S.qi++;
    if (S.qi >= S.q.length) { S.typing = false; var t = S.then; S.then = null; if (t) t(); return; }
    var ln = S.q[S.qi];
    var prev = S.speaker;
    S.speaker = ln[0]; S.line = ln[1]; S.shown = 0; S.typing = true;
    renderScene(prev !== S.speaker);
    renderDbox();
    var fx = ln[2];
    if (fx === 'hammer') { SFX.hammer(); shake(app.querySelector('.scene')); }
    else if (fx === 'shake') { var p = app.querySelector('.portrait'); if (p) { p.classList.add('shake'); } SFX.damage(); flash(true); }
    else if (fx === 'break') { var p2 = app.querySelector('.portrait'); if (p2) p2.classList.add('break'); SFX.breakdown(); flash(true); shake(app.querySelector('.court')); }
    else if (fx === 'obj' || fx === 'hold') shout(fx);
    else if (fx === 'verdict') verdictFx(true);
    typeOn();
  }
  var TOK = /(<[^>]+>)/;
  function visibleLen(html) { return html.split(TOK).reduce(function (n, t) { return n + (TOK.test(t) ? 0 : t.length); }, 0); }
  function cutHTML(html, n) {
    var out = '', parts = html.split(TOK);
    for (var i = 0; i < parts.length; i++) {
      var t = parts[i];
      if (TOK.test(t)) { out += t; continue; }
      if (n <= 0) break;
      out += t.slice(0, n); n -= t.length;
    }
    return out;
  }
  function typeOn() {
    clearInterval(S.tm);
    var me = S, total = visibleLen(S.line);
    S.tm = setInterval(function () {
      if (S !== me || !S.typing) { clearInterval(me.tm); return; }
      S.shown += 2;
      if (S.shown % 6 === 0) SFX.blip();
      if (S.shown >= total) { S.shown = total; S.typing = false; clearInterval(S.tm); }
      var tx = app.querySelector('.dbox .txt'); if (tx) tx.innerHTML = cutHTML(S.line, S.shown);
      if (!S.typing) renderDbox();
    }, 28);
  }
  function advance() {
    if (!S || S.mode !== 'talk') return;
    if (S.typing) { S.typing = false; S.shown = visibleLen(S.line); clearInterval(S.tm); renderDbox(); return; }
    nextLine();
  }

  /* ------------------------------------------------------------ 진행 */
  function startCase(ci) {
    if (S) clearInterval(S.tm);
    S = newState(ci);
    NA.ui.briefing(ov, '사건 ' + (ci + 1) + ' · ' + S.c.title, S.c.brief, function () {
      render();
      talk(S.c.intro, function () { if (S.c.pre) startPick([S.c.pre], function () { talk(S.c.preOk || [], startInvest); }); else startInvest(); });
    });
  }
  function startInvest() { S.phase = 'invest'; S.mode = 'invest'; S.speaker = 'aide'; S.line = '증거를 모으자. 핵심 증거를 모두 모으면 <b>법정으로</b> 갈 수 있다.'; S.shown = 9999; render(); }
  function runCmd(i) {
    if (!S || S.mode !== 'invest') return;
    var cm = S.c.cmds[i]; if (!cm) return;
    S.lastCmd = i; S.ran[i] = true;
    NA.sfx.send();
    var isNew = cm.ev && S.have.indexOf(cm.ev) < 0;
    if (isNew) { S.have.push(cm.ev); S.sel = cm.ev; S.newEv = cm.ev; }
    S.speaker = 'aide';
    render();
    var lines = [['aide', cm.say]];
    if (isNew) { SFX.got(); lines.push(['sys', '증거품 「' + S.c.ev[cm.ev].n + '」을(를) 법정 기록에 추가했다.']); }
    var me = S;
    talk(lines, function () { if (S === me) { S.mode = 'invest'; S.line = haveAll() ? '핵심 증거가 모두 모였다! <b>법정으로</b> 가자.' : '다른 명령도 실행해 보자. (핵심 증거 ' + needCount() + '/' + S.c.need.length + ')'; S.shown = 9999; render(); } });
  }
  function needCount() { return S.c.need.filter(function (e) { return S.have.indexOf(e) >= 0; }).length; }
  function haveAll() { return needCount() === S.c.need.length; }
  function toCourt() {
    if (!S || S.mode !== 'invest' || !haveAll()) return;
    S.phase = 'trial'; S.speaker = 'judge';
    render();
    talk(S.c.trialIntro, startCross);
  }
  function startCross() { S.phase = 'cross'; S.mode = 'cross'; S.speaker = 'wit'; render(); }
  function stmt() { return S.c.testimony[S.si]; }
  function nav(d) {
    if (!S || S.mode !== 'cross') return;
    var n = S.c.testimony.length;
    S.si = (S.si + d + n) % n; NA.sfx.tick(); render();
  }
  function press() {
    if (!S || S.mode !== 'cross') return;
    var st = stmt(); if (S.broken[S.si]) return;
    S.pressed[S.si] = true;
    var me = S;
    talk(st.press, function () { if (S === me) startCross(); });
  }
  function present() {
    if (!S || S.mode !== 'cross' || !S.sel) return;
    var st = stmt(), ev = S.sel, me = S, si = S.si;
    if (S.broken[si]) return;
    S.speaker = 'me'; render();
    var evn = S.c.ev[ev].n;
    if (st.contra && st.contra.indexOf(ev) >= 0) {
      talk([['me', '이의 있음! 이 「' + evn + '」을(를) 보십시오!', 'obj']].concat(st.hit), function () {
        if (S !== me) return;
        S.broken[si] = true;
        var left = S.c.testimony.filter(function (t, i) { return t.contra && !S.broken[i]; }).length;
        if (left === 0) { S.phase = 'pick'; talk(S.c.after, function () { startPick(S.c.picks, finale); }); }
        else {
          // 다음 모순이 남은 증언으로 이동
          for (var k = 1; k <= S.c.testimony.length; k++) { var j = (si + k) % S.c.testimony.length; if (S.c.testimony[j].contra && !S.broken[j]) { S.si = j; break; } }
          talk([['judge', '흠… 증인, 증언을 계속하십시오. (남은 모순 ' + left + '개)', 'hammer']], startCross);
        }
      });
    } else {
      var hint = st.contra ? st.hint : '이 증언은 사실인 것 같다. <b>잠깐!</b>으로 캐물어 단서를 얻고, 다른 증언을 노리자.';
      talk([['me', '이의 있음! 이 「' + evn + '」을(를) 보십시오!', 'obj'],
        ['judge', st.contra ? '…그 증거가 이 증언과 무슨 관계가 있습니까?' : '…그 증언에 모순이 있다고요? 저는 잘 모르겠군요.', 'hammer'],
        ['pros', '변호인은 재판을 장난으로 아는 모양이군요.']], function () {
        if (S !== me) return;
        damage(function () { talk([['aide', hint]], startCross); });
      });
    }
  }
  function damage(then) {
    S.trust--; S.wrongs++;
    SFX.damage(); flash(true);
    renderHud();
    var tr = app.querySelector('.trust'); if (tr) { tr.classList.remove('hit'); void tr.offsetWidth; tr.classList.add('hit'); }
    if (S.trust <= 0) { lose(); return; }
    then();
  }
  function startPick(list, done) { S.mode = 'pick'; S.picks = list; S.pk = 0; S.pickDone = done; S.wrongOpt = {}; render(); }
  function choose(oi) {
    if (!S || S.mode !== 'pick') return;
    var pq = S.picks[S.pk], o = pq.o[oi]; if (!o || S.wrongOpt[oi]) return;
    var me = S;
    if (o.ok) {
      NA.sfx.perfect();
      S.pk++; S.wrongOpt = {};
      if (S.pk >= S.picks.length) { var d = S.pickDone; S.mode = 'talk'; d(); }
      else { talk([['judge', '좋습니다. 다음 질문입니다.', 'hammer']], function () { if (S === me) { S.mode = 'pick'; render(); } }); }
    } else {
      S.wrongOpt[oi] = true;
      talk([['judge', '…변호인, 그게 정말 결론입니까?', 'hammer'], ['aide', o.why]], function () {
        if (S !== me) return;
        damage(function () { S.mode = 'pick'; render(); });
      });
    }
  }
  function finale() {
    var me = S;
    S.phase = 'verdict';
    talk(S.c.outro, function () { if (S === me) endCase(true); });
  }
  function lose() {
    var me = S; S.over = true; S.mode = 'end'; clearInterval(S.tm);
    S.speaker = 'judge'; S.line = '변호인의 주장에는 신뢰가 가지 않는군요. 판결을 내리겠습니다.'; S.shown = 9999;
    render(); verdictFx(false);
    setTimeout(function () { if (S === me) debrief(false); }, 2600);
  }
  function endCase() {
    S.over = true; S.mode = 'end';
    var me = S;
    setTimeout(function () { if (S === me) debrief(true); }, 600);
  }
  function debrief(win) {
    var stars = !win ? 0 : S.trust >= 5 ? 3 : S.trust >= 3 ? 2 : 1;
    var pressedN = Object.keys(S.pressed).length;
    NA.ui.debrief({
      overlay: ov, gameId: GAME_ID, stage: S.ci, win: win, stars: stars, score: S.trust * 20,
      title: win ? '진상 규명! 무죄 판결' : '패소…',
      sub: S.c.title + ' · 재판장 신뢰 ' + S.trust + '/' + MAXT + (win ? '' : ' · 신뢰가 바닥났다. 증거와 증언을 다시 맞춰 보자.'),
      stats: [['남은 신뢰', S.trust + '/' + MAXT], ['논파한 증언', Object.keys(S.broken).length], ['추궁', pressedN], ['헛짚기', S.wrongs], ['모은 증거', S.have.length + '/' + Object.keys(S.c.ev).length]],
      qc: S.c.qc, playNotes: S.c.notes,
      onRetry: function () { startCase(S.ci); },
      onNext: S.ci + 1 < CASES.length ? function () { startCase(S.ci + 1); } : null,
      onMenu: menu
    });
  }
  function menu() {
    if (S) clearInterval(S.tm);
    S = null; app.innerHTML = '';
    NA.ui.renderTags(GAME_ID);
    NA.ui.stageMenu({
      overlay: ov, gameId: GAME_ID, stages: CASES, onPick: startCase,
      howto: '① <b>조사</b>: 명령을 실행해 증거를 모은다 → ② <b>심문</b>: <b>잠깐!</b>으로 캐묻고, 모순된 증언에 증거를 골라 <b>이의 있음!</b> → ③ <b>지목</b>: 진범을 고른다.<br>' +
        '헛짚으면 재판장 신뢰 -1 (5칸). 시간 제한 없음. 단축키 <span class="key">Enter</span> 넘기기 · <span class="key">←</span><span class="key">→</span> 증언 · <span class="key">Q</span> 잠깐 · <span class="key">E</span> 이의 있음'
    });
  }

  /* ------------------------------------------------------------ 렌더 */
  function render() {
    if (!S) return;
    if (!app.querySelector('.court')) {
      app.innerHTML = '<div class="court"><div class="lcol"><div class="hud"></div><div class="scene"></div><div class="dbox"></div></div><div class="record"></div></div>';
      app.querySelector('.dbox').addEventListener('click', function (e) { if (e.target.closest('button')) return; advance(); });
    }
    renderHud(); renderScene(true); renderDbox(); renderRecord();
  }
  function renderHud() {
    var ph = { intro: '개정', invest: '조사', trial: '공판', cross: '심문', pick: '지목', verdict: '판결' }[S.phase] || '';
    var g = ''; for (var i = 0; i < MAXT; i++) g += '<i' + (i < S.trust ? '' : ' class="off"') + '></i>';
    app.querySelector('.hud').innerHTML = '<span class="case">사건 ' + (S.ci + 1) + ' · ' + esc(S.c.title) + '</span><span class="phase">' + ph + '</span><span class="sp"></span>' +
      '<span class="trust">재판장 신뢰 <span class="g">' + g + '</span></span>';
  }
  function renderScene(enter) {
    var sc = app.querySelector('.scene'); if (!sc) return;
    var keep = [].slice.call(sc.querySelectorAll('.shout,.flash,.verdict,.confetti'));
    if (S.mode === 'invest' || (S.mode === 'talk' && S.phase === 'invest')) {
      sc.className = 'scene';
      var c = S.c, rows = c.cmds.map(function (cm, i) {
        return '<button data-cmd="' + i + '" class="' + (S.ran[i] ? 'done' : '') + (S.lastCmd === i ? ' on' : '') + '"' + (S.mode !== 'invest' ? ' disabled' : '') + '><span class="k">' + (i + 1) + '</span>' + esc(cm.label) + '</button>';
      }).join('');
      var cm = c.cmds[S.lastCmd];
      var screen = cm ? '<span class="pr">$ ' + esc(cm.cmd) + '</span>\n' + esc(cm.out) + '\n<span class="pr">$</span> <span class="cur"></span>'
        : '<span class="muted"># 조사 터미널\n# 왼쪽 명령을 눌러 실행한다. 결과 속 핵심은 법정 기록에 증거로 남는다.\n# 핵심 증거 ' + c.need.length + '개를 모으면 법정으로 갈 수 있다.</span>\n<span class="pr">$</span> <span class="cur"></span>';
      sc.innerHTML = '<div class="term"><div class="cmds"><h4><span>조사 명령</span><span>핵심 ' + needCount() + '/' + c.need.length + '</span></h4>' + rows +
        '<span class="sp"></span><button class="go" data-court' + (haveAll() && S.mode === 'invest' ? '' : ' disabled') + '>법정으로 ▶</button></div><div class="screen">' + screen + '</div></div>';
      sc.querySelectorAll('[data-cmd]').forEach(function (b) { b.onclick = function () { runCmd(+b.dataset.cmd); }; });
      sc.querySelector('[data-court]').onclick = toCourt;
    } else if (S.mode === 'pick') {
      sc.className = 'scene bg-judge';
      var pq = S.picks[S.pk];
      sc.innerHTML = '<div class="pick"><div class="q"><small>' + (S.phase === 'invest' || S.phase === 'intro' ? '조사 방침' : '지목 ' + (S.pk + 1) + '/' + S.picks.length) + '</small>' + esc(pq.q) + '</div>' +
        pq.o.map(function (o, i) { return '<button data-o="' + i + '" class="' + (S.wrongOpt[i] ? 'x' : '') + '"><span class="n">' + (i + 1) + '.</span><span>' + esc(o.t) + '</span></button>'; }).join('') + '</div>';
      sc.querySelectorAll('[data-o]').forEach(function (b) { b.onclick = function () { choose(+b.dataset.o); }; });
    } else {
      var who = S.mode === 'cross' ? 'wit' : S.speaker, ca = cast(who);
      sc.className = 'scene bg-' + who;
      var h = '<div class="loc">' + esc(ca.loc || '') + '</div><div class="floor"></div>';
      if (who !== 'sys') h += '<div class="portrait' + (enter ? ' in' : '') + '"><div class="face">' + ca.i + '</div><div class="plate">' + esc(ca.n) + '</div></div>';
      else h += '<div class="portrait"><div class="face">⚖️</div></div>';
      if (S.phase === 'cross') {
        h += '<div class="tbanner"><span class="h cross">~ 심문: ' + esc(S.c.ttitle) + ' ~</span></div>';
        h += '<div class="sdots">' + S.c.testimony.map(function (t, i) {
          return '<span class="' + (i === S.si ? 'cur ' : '') + (S.broken[i] ? 'broken ' : '') + (S.pressed[i] ? 'pressed' : '') + '">증언 ' + (i + 1) + '</span>';
        }).join('') + '</div>';
      }
      sc.innerHTML = h;
    }
    keep.forEach(function (k) { sc.appendChild(k); });
  }
  function renderDbox() {
    var db = app.querySelector('.dbox'); if (!db) return;
    if (S.mode === 'cross') {
      var st = stmt(), br = !!S.broken[S.si];
      db.className = 'dbox locked';
      db.innerHTML = '<span class="who" style="color:#6dffa8">' + esc(S.c.witness.n) + ' · 증언 ' + (S.si + 1) + '/' + S.c.testimony.length + '</span>' +
        '<div class="txt testi' + (br ? ' broken' : '') + '">' + esc(st.t) + (br ? '  <span style="color:#ff4d5e;text-decoration:none">[논파]</span>' : '') + '</div>' +
        '<div class="ctrl"><button class="nav" data-a="prev">◀ 이전</button><button class="press" data-a="press"' + (br ? ' disabled' : '') + '>잠깐! (Q)</button>' +
        '<button class="obj" data-a="obj"' + (br || !S.sel ? ' disabled' : '') + '>이의 있음! (E)</button><button class="nav" data-a="next">다음 ▶</button>' +
        '<span class="sp"></span><span class="info">' + (S.sel ? '제시할 증거: ' + esc(S.c.ev[S.sel].n) : '오른쪽에서 증거를 고르자') + '</span></div>';
      db.querySelector('[data-a="prev"]').onclick = function () { nav(-1); };
      db.querySelector('[data-a="next"]').onclick = function () { nav(1); };
      db.querySelector('[data-a="press"]').onclick = press;
      db.querySelector('[data-a="obj"]').onclick = present;
      return;
    }
    var ca = cast(S.speaker) || CAST.sys;
    var col = { judge: '#e0b04a', pros: '#ff7a86', me: '#7ab4ff', aide: '#ffc94d', wit: '#6dffa8', sys: '#c9d2ff' }[S.speaker];
    var isTalk = S.mode === 'talk';
    db.className = 'dbox' + (isTalk ? '' : ' locked');
    var shown = S.typing ? cutHTML(S.line || '', S.shown) : (S.line || '');
    db.innerHTML = (ca.n ? '<span class="who" style="color:' + col + '">' + esc(ca.n) + '</span>' : '') +
      '<div class="txt"' + (S.speaker === 'sys' ? ' style="color:#c9d2ff;text-align:center"' : '') + '>' + shown + '</div>' +
      (isTalk && !S.typing ? '<span class="more">▼ Enter</span>' : '');
  }
  function renderRecord() {
    var rc = app.querySelector('.record'); if (!rc) return;
    var c = S.c, list = S.have.map(function (id) {
      var e = c.ev[id];
      return '<div class="ev' + (S.sel === id ? ' sel' : '') + (S.newEv === id ? ' new' : '') + '" data-ev="' + id + '"><span class="ic">' + e.i + '</span><span class="nm">' + esc(e.n) + '</span></div>';
    }).join('');
    if (!S.have.length) list = '<div class="ev empty">아직 증거가 없다</div>';
    S.newEv = null;
    var det = '<div class="ph">증거를 누르면 자세히 볼 수 있다.' + (S.phase === 'cross' ? '<br>모순된 증언에서 증거를 고른 뒤 <b>이의 있음!</b>' : '') + '</div>';
    if (S.sel) { var e = c.ev[S.sel]; det = '<div class="t">' + e.i + ' ' + esc(e.n) + '</div><div class="s">' + esc(e.s) + '</div><pre>' + esc(e.d) + '</pre>'; }
    var canP = S.mode === 'cross' && S.sel && !S.broken[S.si];
    rc.innerHTML = '<h3>📁 법정 기록 <small>증거 ' + S.have.length + '개</small></h3><div class="evlist">' + list + '</div><div class="evdetail">' + det + '</div>' +
      '<button class="present"' + (canP ? '' : ' disabled') + '>' + (S.mode === 'cross' ? '이 증거를 제시! (E)' : S.phase === 'invest' ? '조사 중' : '심문 때 제시할 수 있다') + '</button>';
    rc.querySelectorAll('[data-ev]').forEach(function (d) { d.onclick = function () { selectEv(d.dataset.ev); }; });
    rc.querySelector('.present').onclick = present;
  }
  function selectEv(id) {
    if (!S || S.have.indexOf(id) < 0) return;
    S.sel = id; NA.sfx.pop(); renderRecord(); if (S.mode === 'cross') renderDbox();
  }

  /* ------------------------------------------------------------ 입력 */
  window.addEventListener('keydown', function (e) {
    if (!S || !ov.hidden) return;
    var k = e.key;
    if (S.mode === 'talk' && (k === 'Enter' || k === ' ')) { e.preventDefault(); advance(); }
    else if (S.mode === 'invest') { if (/^[1-9]$/.test(k)) runCmd(+k - 1); else if (k === 'Enter') toCourt(); }
    else if (S.mode === 'cross') {
      if (k === 'ArrowLeft') nav(-1); else if (k === 'ArrowRight') nav(1);
      else if (k === 'q' || k === 'Q') press(); else if (k === 'e' || k === 'E') present();
      else if (/^[1-9]$/.test(k) && S.have[+k - 1]) selectEv(S.have[+k - 1]);
    } else if (S.mode === 'pick' && /^[1-9]$/.test(k)) choose(+k - 1);
  });

  window.__game = {
    state: function () { return S; }, cases: CASES, start: startCase,
    adv: function () { if (S && S.mode === 'talk') { if (S.typing) advance(); advance(); } },
    cmd: runCmd, court: toCourt, nav: nav, press: press, present: present, select: selectEv, pick: choose,
    goto: function (i) { S.si = i; render(); }
  };
  menu();
})();
