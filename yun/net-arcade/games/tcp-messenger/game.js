/* TCP 메신저 — Quick Check W3-1(3-way handshake는 왜 3번), W3-8(TIME_WAIT vs CLOSE_WAIT)
 *
 * 턴제 메신저. 시간 제한 없음.
 * 대화창이 곧 시퀀스 다이어그램이다. 상대가 보낸 말풍선(패킷)을 보고,
 * 답장 말풍선을 조립해(플래그 SYN·ACK·FIN·RST + seq + ack) 보낸다.
 *   SYN과 FIN은 순서번호를 1 소비하고, 데이터는 길이만큼 소비한다. ack = 상대에게서 다음에 받을 번호.
 * 오른쪽에서 나와 상대의 TCP 상태가 바뀌는 걸 본다. 틀리면 신뢰도 -1(5칸).
 */
(function () {
  var GAME_ID = 'tcp-messenger';
  var app = document.getElementById('app');
  var ov = document.getElementById('overlay');
  var esc = NA.ui.esc;
  NA.fitStage(document.getElementById('stage'));

  var FLAGS = ['SYN', 'ACK', 'FIN', 'RST'];
  var STATES = ['CLOSED', 'LISTEN', 'SYN_SENT', 'SYN_RCVD', 'ESTABLISHED', 'FIN_WAIT_1', 'FIN_WAIT_2', 'CLOSE_WAIT', 'LAST_ACK', 'TIME_WAIT'];

  function P(f, seq, ack, data) { return { f: f, seq: seq, ack: ack, data: data || null }; }
  function sys(t) { return { t: 'sys', text: t }; }

  /* ------------------------------------------------------------ 스테이지 */
  var STAGES = [
    /* ================================================ 1 */
    { title: '첫 인사', desc: '내가 먼저 말을 건다. SYN → SYN+ACK → ACK, 그리고 첫 메시지.', qc: ['W3-1'], coach: true,
      me: { n: '내 채팅 앱', role: '클라이언트' }, peer: { n: '채팅 서버', av: '🖥️', sub: 'chat.example.com:443' },
      brief: '여기는 <b>TCP 메신저</b>. 말풍선 하나가 패킷 하나다. 시간 제한은 없다.<br>' +
        '답장은 아래에서 <b>플래그</b>(SYN·ACK·FIN·RST)와 <b>seq</b>(내 번호), <b>ack</b>(상대에게서 다음에 받을 번호)를 골라 조립한다.<br>' +
        '규칙: <b>SYN·FIN은 번호를 1 소비</b>, 데이터는 길이만큼 소비. ack = 상대 seq + 상대가 소비한 만큼.<br>' +
        '오른쪽에서 나와 상대의 <b>TCP 상태</b>가 어떻게 바뀌는지 지켜보자.',
      init: { me: 'CLOSED', peer: 'LISTEN', mySeq: 300, peerSeq: null },
      steps: [
        sys('앱이 <b>connect()</b>를 불렀다. 운영체제가 내 첫 번호(ISN)로 <b>300</b>을 골랐다. 3-way handshake 시작!'),
        { t: 'me', want: P(['SYN'], 300, null), seqOpts: [0, 1, 300], ackOpts: [null, 0, 1], to: 'SYN_SENT',
          coach: '첫 말풍선은 <b>SYN</b>("연결하자, 내 번호는 300부터야"). 아직 상대 번호를 모르니 <b>ACK 플래그 없이</b> ack는 <b>없음</b>.',
          why: { f: '연결을 여는 첫 패킷은 SYN 하나뿐이다. 아직 받은 게 없으니 ACK는 붙이지 않는다.', seq: 'seq에는 내 ISN 300을 쓴다.' } },
        { t: 'peer', p: P(['SYN', 'ACK'], 7000, 301), peerTo: 'SYN_RCVD', note: '서버가 <b>SYN+ACK</b>로 답했다. "네 SYN 받았어(ack 301), 내 번호는 7000부터야."' },
        { t: 'me', want: P(['ACK'], 301, 7001), seqOpts: [300, 301, 7001], ackOpts: [null, 7000, 7001, 301], to: 'ESTABLISHED', peerTo: 'ESTABLISHED',
          coach: '이제 <b>ACK</b>로 "네 번호 7000도 받았어"를 알린다. 서버의 SYN이 번호 1을 소비했으니 ack는? 내 SYN도 1을 소비했으니 내 seq는?',
          why: { seq: '내 SYN이 300을 썼다. 다음 내 번호는 301.', ack: '서버 SYN(7000)이 1을 소비했다. 다음에 받을 번호는 7001.' } },
        sys('🎉 <b>ESTABLISHED</b>! 양쪽 모두 상대의 첫 번호를 확인했다. 이제 메시지를 보내자.'),
        { t: 'me', want: P(['ACK'], 301, 7001, 'hi!'), seqOpts: [300, 301, 302], ackOpts: [null, 7001, 7002], data: 'hi!',
          coach: '데이터 <b>hi!</b>(3바이트)를 보낸다. 방금 ACK는 번호를 소비하지 않으니 seq는 그대로. ACK도 같이 붙인다.',
          why: { seq: 'ACK만 있는 패킷은 번호를 소비하지 않는다. 그대로 301.', ack: '서버에게서 아직 새로 받은 게 없다. 7001 그대로.', f: '연결이 맺어진 뒤의 패킷은 늘 ACK를 단다.' } },
        { t: 'peer', p: P(['ACK'], 7001, 304, 'hello'), note: '서버: "hi! 받았어(ack 304)", 그리고 <b>hello</b>(5바이트).' },
        { t: 'me', want: P(['ACK'], 304, 7006), seqOpts: [301, 304, 305], ackOpts: [null, 7001, 7005, 7006],
          coach: 'hello를 받았다고 알리자. 내 hi!가 3을 소비했고, 서버의 hello는 5를 소비했다.',
          why: { seq: '301 + 3(hi!) = 304.', ack: '7001 + 5(hello) = 7006.' } },
        { t: 'quiz', q: '3-way handshake는 왜 3번일까? 2번(SYN, SYN+ACK)으로 끝내면 무엇이 부족할까?', o: [
          { t: '서버의 첫 번호(7000)가 클라이언트에게 잘 도착했는지 서버가 확인할 수 없다', ok: true },
          { t: '세 번째 ACK에 첫 데이터를 반드시 실어야 해서 한 번이 더 필요하다', why: '세 번째 ACK에 데이터를 실을 수도 있지만 필수는 아니다. 핵심은 확인이다.' },
          { t: '플래그가 SYN·ACK·FIN 세 종류라 하나씩 보내야 해서', why: '플래그 개수와는 상관없다.' }],
          ok: '양쪽 모두 "상대가 내 ISN을 받았다"를 확인해야 한다. 세 번째 ACK가 서버의 ISN을 확인해 준다.' }
      ],
      note: { 'W3-1': 'SYN(300) → SYN+ACK(7000, ack 301) → ACK(ack 7001). 세 번째 ACK가 와야 서버도 자기 번호 7000이 전달된 걸 안다.' } },

    /* ================================================ 2 */
    { title: '서버가 되어', desc: '이번엔 받는 쪽. LISTEN에서 SYN을 받고 SYN+ACK로 답한다.', qc: ['W3-1'],
      me: { n: '웹 서버', role: '서버' }, peer: { n: '손님 브라우저', av: '🧑‍💻', sub: '198.51.100.23:51234' },
      brief: '이번엔 내가 <b>서버</b>다. listen()으로 문을 열고 기다린다(LISTEN). 내 ISN은 <b>9000</b>.<br>' +
        '손님의 SYN을 받으면, <b>받았다는 ACK</b>와 <b>내 번호를 알리는 SYN</b>을 한 말풍선에 담아 보낸다.',
      init: { me: 'LISTEN', peer: 'CLOSED', mySeq: 9000 },
      steps: [
        { t: 'peer', p: P(['SYN'], 4100, null), peerTo: 'SYN_SENT', note: '손님이 SYN을 보냈다. "연결하자, 내 번호는 4100부터."' },
        { t: 'me', want: P(['SYN', 'ACK'], 9000, 4101), seqOpts: [4101, 9000, 9001], ackOpts: [null, 4100, 4101, 9001], to: 'SYN_RCVD',
          coach: '받은 SYN에 대한 <b>ACK</b>와 내 번호 9000을 알리는 <b>SYN</b>을 한 번에!',
          why: { f: 'SYN을 받았다는 ACK와, 내 첫 번호를 알리는 SYN이 둘 다 필요하다. 그래서 SYN+ACK.', seq: '내 ISN 9000.', ack: '손님 SYN(4100)이 1을 소비했다. 4101.' } },
        { t: 'peer', p: P(['ACK'], 4101, 9001), peerTo: 'ESTABLISHED', meTo: 'ESTABLISHED', note: '손님의 ACK: "네 번호 9000 받았어(ack 9001)."' },
        { t: 'quiz', q: '방금 받은 세 번째 ACK가 없었다면 나(서버)는 무엇을 알 수 없었을까?', o: [
          { t: '손님이 누구인지(IP 주소)', why: 'IP는 첫 SYN부터 알고 있었다.' },
          { t: '내 첫 번호(9000)가 손님에게 잘 전달됐는지', ok: true },
          { t: '손님의 첫 번호(4100)', why: '그건 첫 SYN에서 이미 받았다.' }],
          ok: '서버도 "내 ISN이 전달됐다"를 확인해야 연결을 확정할 수 있다.' },
        { t: 'peer', p: P(['ACK'], 4101, 9001, 'GET /'), note: '손님이 요청 <b>GET /</b>(5바이트)를 보냈다.' },
        { t: 'me', want: P(['ACK'], 9001, 4106, 'OK'), seqOpts: [9000, 9001, 9002], ackOpts: [null, 4101, 4105, 4106], data: 'OK',
          coach: '요청을 받았다는 ACK와 함께 답 <b>OK</b>(2바이트)를 보낸다.',
          why: { seq: '내 SYN이 9000을 썼으니 9001.', ack: '4101 + 5(GET /) = 4106.' } }
      ],
      note: { 'W3-1': '손님 SYN(4100)에 SYN+ACK(9000, ack 4101)로 답했고, 세 번째 ACK(ack 9001)를 받고서야 내 번호가 전달된 걸 확인했다.' } },

    /* ================================================ 3 */
    { title: '유령 SYN', desc: '옛 연결의 SYN이 뒤늦게 도착했다. 엉뚱한 SYN+ACK를 어떻게 거를까?', qc: ['W3-1'],
      me: { n: '내 채팅 앱', role: '클라이언트' }, peer: { n: '채팅 서버', av: '🖥️', sub: 'chat.example.com:443' },
      brief: '몇 분 전에 끊긴 옛 연결의 SYN(<b>seq 100</b>)이 네트워크 어딘가에서 헤매다 <b>이제야 서버에 도착</b>한다.<br>' +
        '서버는 그게 옛 것인지 모르고 SYN+ACK로 답할 것이다. 나는 방금 새 연결(ISN <b>300</b>)을 시작했다.<br>' +
        '<b>ack 번호</b>를 잘 보자. 이상한 답장에는 <b>RST</b>(거절)로 답할 수 있다.',
      init: { me: 'CLOSED', peer: 'LISTEN', mySeq: 300 },
      steps: [
        { t: 'me', want: P(['SYN'], 300, null), seqOpts: [100, 300, 301], ackOpts: [null, 1], to: 'SYN_SENT',
          coach: '새 연결의 SYN부터. 내 ISN은 300.', why: { seq: '이번 ISN은 300. 100은 옛 연결의 번호다.' } },
        sys('👻 그 사이 옛 SYN(seq 100)이 서버에 먼저 도착했다…'),
        { t: 'peer', p: P(['SYN', 'ACK'], 5000, 101), peerTo: 'SYN_RCVD', note: '서버의 SYN+ACK. 그런데 <b>ack 101</b>?' },
        { t: 'me', want: P(['RST'], 101, null), seqOpts: [101, 300, 301, 5001], ackOpts: [null, 101, 5001], to: 'SYN_SENT', peerTo: 'LISTEN',
          coach: '내 SYN은 300이었으니 ack는 <b>301</b>이어야 한다. ack 101은 내가 보낸 적 없는 SYN(100)에 대한 답이다. 받아들이면 안 된다!',
          why: { f: '이 SYN+ACK는 유령 SYN에 대한 답이다. ACK로 받아 주면 엉뚱한 연결이 열린다. <b>RST</b> 하나로 거절한다.',
            seq: 'RST의 seq에는 받은 패킷의 ack 값(101)을 쓴다. 그래야 서버가 자기 기대 범위의 패킷으로 받아들여 연결을 지운다.', ack: 'RST만 보낼 때는 ACK 플래그 없이 ack를 비운다.' } },
        sys('서버가 RST를 받고 유령 연결을 지웠다(SYN_RCVD → LISTEN).'),
        { t: 'peer', p: P(['SYN', 'ACK'], 6000, 301), peerTo: 'SYN_RCVD', note: '이번엔 진짜 내 SYN(300)에 대한 SYN+ACK. <b>ack 301</b>!' },
        { t: 'me', want: P(['ACK'], 301, 6001), seqOpts: [300, 301, 6001], ackOpts: [null, 101, 6000, 6001], to: 'ESTABLISHED', peerTo: 'ESTABLISHED',
          coach: '이번 ack(301)는 내 SYN과 맞는다. 정상적으로 ACK!',
          why: { seq: '301.', ack: '6000 + 1 = 6001.', f: '정상 SYN+ACK에는 ACK로 답한다.' } },
        { t: 'quiz', q: 'handshake가 2번(SYN, SYN+ACK)으로 끝났다면 유령 SYN은 어떻게 됐을까?', o: [
          { t: '서버가 SYN+ACK를 보내는 순간 연결이 열려, 아무도 쓰지 않는 연결에 자원을 붙잡는다', ok: true },
          { t: '서버가 seq 100을 보고 옛 SYN인 걸 알아서 무시한다', why: '서버는 seq만 보고 옛 SYN인지 알 수 없다. 그래서 클라이언트의 확인(세 번째 단계)이 필요하다.' },
          { t: '어차피 상관없다. 유령 SYN은 네트워크에서 저절로 사라진다', why: '이번처럼 늦게라도 도착할 수 있다.' }],
          ok: '세 번째 단계가 있어야 클라이언트가 "그건 내 연결이 아니야"(RST)라고 말할 기회가 생긴다.' }
      ],
      note: { 'W3-1': '유령 SYN(100)에 대한 SYN+ACK(ack 101)는 내 SYN(300)과 맞지 않아 RST로 거절했다. 2번으로 끝났다면 서버는 그 연결을 이미 열어 버렸을 것이다.' } },

    /* ================================================ 4 */
    { title: '먼저 끊기', desc: '내가 먼저 FIN. FIN_WAIT을 지나 TIME_WAIT에서 기다리는 이유.', qc: ['W3-8'],
      me: { n: '내 채팅 앱', role: '클라이언트' }, peer: { n: '채팅 서버', av: '🖥️', sub: 'chat.example.com:443' },
      brief: '대화를 마치고 <b>내가 먼저 끊는다</b>(능동 종료). 끊을 때는 양쪽이 각자 <b>FIN</b>을 보내고 서로 ACK한다(4-way).<br>' +
        '지금 내 다음 번호는 <b>500</b>, 서버의 다음 번호는 <b>8000</b>. FIN도 번호를 1 소비한다.<br>' +
        '마지막 ACK를 보낸 뒤 왜 바로 사라지지 않고 <b>TIME_WAIT</b>에서 기다리는지 겪어 보자.',
      init: { me: 'ESTABLISHED', peer: 'ESTABLISHED', mySeq: 500, peerSeq: 8000 },
      steps: [
        sys('앱이 <b>close()</b>를 불렀다. 내가 먼저 끊는다.'),
        { t: 'me', want: P(['FIN', 'ACK'], 500, 8000), seqOpts: [499, 500, 501], ackOpts: [null, 8000, 8001], to: 'FIN_WAIT_1',
          coach: '"나는 더 보낼 게 없어" = <b>FIN</b>. 연결 중이니 <b>ACK</b>도 함께 단다.',
          why: { f: '끊을 때는 FIN. 연결 중 패킷이니 ACK도 단다.', seq: '내 다음 번호 500.', ack: '서버의 다음 번호는 8000. 아직 FIN을 받지 않았으니 +1 하지 않는다.' } },
        { t: 'peer', p: P(['ACK'], 8000, 501), peerTo: 'CLOSE_WAIT', meTo: 'FIN_WAIT_2', note: '서버(의 커널): "네 FIN 받았어(ack 501)." 서버 앱은 아직 close()를 안 불렀다.' },
        sys('나는 <b>FIN_WAIT_2</b>: 서버의 FIN을 기다린다. 서버는 <b>CLOSE_WAIT</b>: 앱이 close()를 부를 때까지 기다리는 중.'),
        { t: 'peer', p: P(['FIN', 'ACK'], 8000, 501), peerTo: 'LAST_ACK', note: '서버 앱이 close()를 불렀다. 서버의 <b>FIN</b>.' },
        { t: 'me', want: P(['ACK'], 501, 8001), seqOpts: [500, 501, 502], ackOpts: [null, 8000, 8001, 8002], to: 'TIME_WAIT',
          coach: '서버의 FIN에 마지막 <b>ACK</b>. 서버의 FIN은 번호 1을 소비했다.',
          why: { seq: '내 FIN이 500을 썼다. 501.', ack: '서버 FIN(8000)이 1을 소비. 8001.', f: '마지막은 ACK 하나.' } },
        { t: 'quiz', q: '마지막 ACK를 보냈다. 이제 바로 CLOSED로 사라져도 될까?', o: [
          { t: '그렇다. 할 말은 다 했으니 바로 사라진다', why: '마지막 ACK가 사라지면 서버는 FIN을 다시 보낸다. 내가 이미 사라졌다면 받아 줄 상대가 없다.' },
          { t: '아니다. 마지막 ACK가 사라질 수 있으니 2MSL 동안 TIME_WAIT으로 남아 기다린다', ok: true },
          { t: '아니다. 서버가 CLOSED가 될 때까지 계속 ACK를 반복해서 보낸다', why: 'ACK를 반복해서 보내지는 않는다. 서버가 FIN을 다시 보내면 그때 다시 ACK한다.' }],
          ok: 'TIME_WAIT = 먼저 닫은 쪽의 <b>정상 대기</b>. 늦게 도착한 옛 패킷이 새 연결에 섞이지 않게 하는 역할도 한다.' },
        { t: 'lost', note: '💥 방금 보낸 마지막 ACK가 사라졌다!' },
        { t: 'peer', p: P(['FIN', 'ACK'], 8000, 501), note: '서버가 ACK를 못 받아 <b>FIN을 재전송</b>했다.' },
        { t: 'me', want: P(['ACK'], 501, 8001), seqOpts: [501, 502], ackOpts: [null, 8001, 8002], to: 'TIME_WAIT',
          coach: 'TIME_WAIT에 남아 있었던 덕분에 다시 ACK할 수 있다! 같은 FIN이니 같은 ACK.',
          why: { seq: '번호는 그대로 501.', ack: '같은 FIN(8000)에 대한 답이니 8001.' } },
        { t: 'peer', p: null, peerTo: 'CLOSED', note: '서버가 ACK를 받고 <b>CLOSED</b>.' },
        sys('⏳ 2MSL이 지났다. 나도 TIME_WAIT을 끝내고 <b>CLOSED</b>.'),
        { t: 'state', me: 'CLOSED' }
      ],
      note: { 'W3-8': '내가 먼저 FIN을 보내 FIN_WAIT → TIME_WAIT으로 갔다. 마지막 ACK가 사라졌을 때 TIME_WAIT에 남아 있어서 재전송된 FIN에 다시 답할 수 있었다. TIME_WAIT은 정상 대기다.' } },

    /* ================================================ 5 */
    { title: '닫지 않는 서버', desc: '손님이 먼저 끊었다. 내 앱이 close()를 안 하면 CLOSE_WAIT이 쌓인다.', qc: ['W3-8'],
      me: { n: '웹 서버 앱', role: '서버' }, peer: { n: '손님 브라우저', av: '🧑‍💻', sub: '198.51.100.23:51234' },
      brief: '이번엔 <b>손님이 먼저 끊는다</b>. 나는 서버 앱 개발자다.<br>' +
        'FIN에 대한 ACK는 <b>커널이 자동으로</b> 보낸다. 그다음 내 앱이 <b>close()</b>를 불러야 내 FIN이 나간다.<br>' +
        '지금 내 다음 번호는 <b>9100</b>, 손님의 다음 번호는 <b>4200</b>.',
      init: { me: 'ESTABLISHED', peer: 'ESTABLISHED', mySeq: 9100, peerSeq: 4200 },
      steps: [
        { t: 'peer', p: P(['FIN', 'ACK'], 4200, 9100), peerTo: 'FIN_WAIT_1', note: '손님이 FIN을 보냈다. 먼저 끊는다.' },
        { t: 'auto', p: P(['ACK'], 9100, 4201), meTo: 'CLOSE_WAIT', peerTo: 'FIN_WAIT_2', note: '내 <b>커널이 자동으로</b> ACK했다(ack 4201). 나는 <b>CLOSE_WAIT</b>: 앱이 close()를 부를 때까지 여기서 기다린다.' },
        { t: 'quiz', q: '앱의 read()가 0을 돌려줬다(= 손님이 FIN을 보냈다). 앱은 무엇을 해야 할까?', o: [
          { t: '다음 요청을 기다리며 계속 read()를 부른다', why: '상대는 더 보내지 않는다. 이대로면 연결이 CLOSE_WAIT에 영원히 남는다.' },
          { t: 'close()를 불러 내 쪽도 닫는다', ok: true },
          { t: '아무것도 안 해도 커널이 알아서 닫아 준다', why: '커널은 내 앱이 아직 보낼 게 있는지 모른다. 내 쪽을 닫는 건 앱이 close()로 알려야 한다.' }],
          ok: '상대가 끊으면(read() = 0) 내 앱도 <b>close()</b>. 그래야 내 FIN이 나간다.' },
        { t: 'me', want: P(['FIN', 'ACK'], 9100, 4201), seqOpts: [9100, 9101], ackOpts: [null, 4200, 4201, 4202], to: 'LAST_ACK',
          coach: 'close()를 불렀다. 이제 내 <b>FIN</b>. 연결 중이니 ACK도 단다.',
          why: { f: '내 쪽을 닫는 FIN(+ACK).', seq: '내 다음 번호 9100. 방금 ACK는 번호를 소비하지 않았다.', ack: '손님 FIN(4200)이 1을 소비했다. 4201.' } },
        { t: 'peer', p: P(['ACK'], 4201, 9101), peerTo: 'TIME_WAIT', meTo: 'CLOSED', note: '손님의 마지막 ACK. 나는 <b>CLOSED</b>, 손님은 <b>TIME_WAIT</b>(먼저 끊은 쪽이니까).' },
        sys('📟 며칠 뒤, 다른 서버에서 장애가 났다. <b>ss -tan</b>을 보니 <b>CLOSE_WAIT 1,204개</b>, TIME_WAIT 37개가 쌓여 있다. 새 손님을 받지 못한다.'),
        { t: 'quiz', q: '어느 쪽이 코드 버그의 신호일까?', o: [
          { t: 'TIME_WAIT 37개. 먼저 닫은 소켓이 안 사라졌으니 누수다', why: 'TIME_WAIT은 먼저 닫은 쪽이 2MSL 동안 기다리는 정상 상태다. 시간이 지나면 저절로 사라진다.' },
          { t: 'CLOSE_WAIT 1,204개. 상대가 끊었는데 내 앱이 close()를 부르지 않았다', ok: true },
          { t: '둘 다 정상. 커널이 알아서 정리한다', why: 'CLOSE_WAIT은 앱이 close()를 부를 때까지 영원히 남는다.' }],
          ok: 'CLOSE_WAIT이 쌓이면 <b>close() 누락</b>을 의심한다.' },
        { t: 'quiz', q: 'CLOSE_WAIT을 없애려면 코드를 어떻게 고칠까?', o: [
          { t: '연결을 쓰고 나면, 예외가 나도 반드시 close()가 불리게 한다 (try/finally, with 문)', ok: true },
          { t: '서버를 주기적으로 재시작한다', why: '증상만 잠깐 사라진다. close() 누락이라는 원인은 그대로다.' },
          { t: 'TIME_WAIT 시간을 줄이는 커널 설정을 바꾼다', why: 'CLOSE_WAIT은 TIME_WAIT과 상관없다. 앱의 close() 문제다.' }],
          ok: '자원 정리는 <b>finally/with</b>로. 오류가 나도 소켓은 닫혀야 한다.' }
      ],
      note: { 'W3-8': '손님이 먼저 FIN을 보내자 내 커널이 ACK하고 나는 CLOSE_WAIT에 들어갔다. 앱이 close()를 불러야 빠져나왔다. CLOSE_WAIT이 쌓이는 건 close() 누락, 즉 코드 버그의 신호다.' } }
  ];

  /* ------------------------------------------------------------ 상태 */
  var S = null;
  function newState(si) {
    var c = STAGES[si];
    return { si: si, cfg: c, me: c.init.me, peer: c.init.peer, i: -1, msgs: [], hearts: 5, mode: 'idle', comp: null, opts: null, x: {},
      coach: null, st: { wrong: 0, sent: 0, first: 0 }, over: false, flash: {} };
  }
  function startStage(si) {
    S = newState(si);
    NA.ui.briefing(ov, 'STAGE ' + (si + 1) + ' · ' + S.cfg.title, S.cfg.brief, function () { render(); next(); });
  }
  function next() {
    if (!S || S.over) return;
    S.i++;
    var st = S.cfg.steps[S.i];
    if (!st) return finish();
    S.step = st; S.comp = null; S.opts = null; S.x = {}; S.mode = 'idle';
    if (st.t === 'sys') { push({ side: 'sys', text: st.text }); render(); return later(next, 700); }
    if (st.t === 'peer') {
      S.mode = 'typing'; render();
      return later(function () {
        S.mode = 'idle';
        if (st.p) push({ side: 'peer', p: st.p });
        if (st.note) push({ side: 'sys', text: st.note });
        setStates(st.meTo, st.peerTo);
        NA.sfx.tone(700, .06, 'sine', .14); NA.sfx.tone(900, .08, 'sine', .12, null, .06);
        render(); later(next, 650);
      }, 750);
    }
    if (st.t === 'auto') { push({ side: 'me', p: st.p, auto: true }); if (st.note) push({ side: 'sys', text: st.note }); setStates(st.meTo, st.peerTo); render(); return later(next, 900); }
    if (st.t === 'state') { setStates(st.me, st.peer); render(); return later(next, 500); }
    if (st.t === 'lost') { for (var k = S.msgs.length - 1; k >= 0; k--) if (S.msgs[k].side === 'me') { S.msgs[k].lost = true; break; } push({ side: 'sys', text: st.note }); NA.sfx.bad(); render(); return later(next, 900); }
    if (st.t === 'me') { S.mode = 'compose'; S.comp = { f: {}, seq: undefined, ack: undefined, bad: {} }; S.tries = 0; S.coach = { who: S.cfg.coach ? '🐣 선배' : '💬 힌트', t: st.coach }; render(); return; }
    if (st.t === 'quiz') { S.mode = 'quiz'; S.opts = NA.shuffle(st.o.slice()); S.coach = { who: '❓ 질문', t: '아래 보기 중 하나를 고르자. (숫자 키 1~3)' }; render(); return; }
  }
  function later(fn, ms) { var me = S; setTimeout(function () { if (S === me) fn(); }, ms); }
  function push(m) { m.isNew = true; S.msgs.forEach(function (x) { x.isNew = false; }); S.msgs.push(m); }
  function setStates(me, peer) { if (me && me !== S.me) { S.me = me; S.flash.me = true; } if (peer && peer !== S.peer) { S.peer = peer; S.flash.pe = true; } }

  /* ------------------------------------------------------------ 조립·전송 */
  function toggleFlag(f) { if (!S || S.mode !== 'compose') return; S.comp.f[f] = !S.comp.f[f]; delete S.comp.bad.f; if (f === 'ACK' && !S.comp.f.ACK) S.comp.ack = null; NA.sfx.pop(); render(); }
  function pickSeq(v) { if (!S || S.mode !== 'compose') return; S.comp.seq = v; delete S.comp.bad.seq; NA.sfx.pop(); render(); }
  function pickAck(v) { if (!S || S.mode !== 'compose') return; S.comp.ack = v; delete S.comp.bad.ack; if (v != null) S.comp.f.ACK = true; NA.sfx.pop(); render(); }
  function flagsOf(c) { return FLAGS.filter(function (f) { return c.f[f]; }); }
  function send() {
    if (!S || S.mode !== 'compose') return;
    var st = S.step, w = st.want, c = S.comp, fl = flagsOf(c);
    if (!fl.length) { S.coach = { cls: 'no', who: '아직', t: '플래그를 하나 이상 고르자.' }; NA.sfx.bad(); return render(); }
    if (c.seq === undefined) { S.coach = { cls: 'no', who: '아직', t: '<b>seq</b>를 고르자.' }; NA.sfx.bad(); return render(); }
    if (c.ack === undefined) c.ack = null;
    var errs = [], bad = {};
    var fOk = fl.length === w.f.length && w.f.every(function (f) { return c.f[f]; });
    if (!fOk) { bad.f = 1; errs.push('<b>플래그</b>: ' + ((st.why && st.why.f) || '필요한 플래그는 ' + w.f.join('+') + '.')); }
    if (c.seq !== w.seq) { bad.seq = 1; errs.push('<b>seq</b>: ' + ((st.why && st.why.seq) || '내 다음 번호는 ' + w.seq + '.')); }
    if (c.ack !== w.ack) {
      bad.ack = 1;
      if (w.ack == null) errs.push('<b>ack</b>: ' + ((st.why && st.why.ack) || 'ACK 플래그가 없는 패킷이니 ack는 비운다.'));
      else if (c.ack == null) errs.push('<b>ack</b>: 받은 게 있으니 ack 번호를 채워야 한다. ' + ((st.why && st.why.ack) || ''));
      else errs.push('<b>ack</b>: ' + ((st.why && st.why.ack) || '다음에 받을 번호는 ' + w.ack + '.'));
    }
    if (errs.length) {
      c.bad = bad; S.hearts--; S.st.wrong++; S.tries++; NA.sfx.bad();
      S.coach = { cls: 'no', who: '✗ 상대가 이해하지 못했다! (신뢰도 −1)', t: '<ul>' + errs.map(function (e) { return '<li>' + e + '</li>'; }).join('') + '</ul>' };
      if (S.hearts <= 0) { S.over = true; render(); var me = S; return setTimeout(function () { if (S === me) debrief(false); }, 1400); }
      return render();
    }
    S.st.sent++; if (!S.tries) S.st.first++;
    push({ side: 'me', p: P(fl, c.seq, c.ack, w.data) });
    setStates(st.to, st.peerTo);
    S.mode = 'idle'; S.comp = null;
    S.coach = { cls: 'ok', who: '✓ 전송!', t: explainSent(w, st) };
    NA.sfx.send(); NA.sfx.good();
    render(); later(next, 750);
  }
  function explainSent(w, st) {
    var used = (w.f.indexOf('SYN') >= 0 || w.f.indexOf('FIN') >= 0 ? 1 : 0) + (w.data ? w.data.length : 0);
    return '<b>' + w.f.join('+') + '</b> seq ' + w.seq + (w.ack != null ? ', ack ' + w.ack : '') + (w.data ? ', 데이터 "' + esc(w.data) + '"' : '') +
      '. 이 패킷은 번호를 <b>' + used + '</b> 소비한다 → 내 다음 번호 ' + (w.seq + used) + '.' + (st.to ? ' 내 상태: <b>' + st.to + '</b>.' : '');
  }
  function answer(k) {
    if (!S || S.mode !== 'quiz' || S.x[k]) return;
    var o = S.opts[k]; if (!o) return;
    if (o.ok) { S.mode = 'idle'; S.coach = { cls: 'ok', who: '✓ 정답!', t: S.step.ok }; NA.sfx.good(); render(); return later(next, 1600); }
    S.x[k] = true; S.hearts--; S.st.wrong++; NA.sfx.bad();
    S.coach = { cls: 'no', who: '✗ 아니다 (신뢰도 −1)', t: o.why };
    if (S.hearts <= 0) { S.over = true; render(); var me = S; return setTimeout(function () { if (S === me) debrief(false); }, 1400); }
    render();
  }

  /* ------------------------------------------------------------ 결산 */
  function finish() { S.over = true; NA.sfx.win(); var me = S; setTimeout(function () { if (S === me) debrief(true); }, 600); }
  function debrief(win) {
    var stars = !win ? 0 : S.hearts >= 5 ? 3 : S.hearts >= 3 ? 2 : 1;
    NA.ui.debrief({
      overlay: ov, gameId: GAME_ID, stage: S.si, win: win, stars: stars, score: S.hearts * 20,
      title: win ? '대화 완료!' : '연결이 꼬였다',
      sub: win ? '보낸 말풍선 ' + S.st.sent + '개 · 남은 신뢰도 ' + S.hearts + '/5' : '신뢰도가 바닥났다. 번호 계산 규칙을 다시 보고 해 보자.',
      stats: [['남은 신뢰도', S.hearts + '/5'], ['보낸 패킷', S.st.sent], ['한 번에 성공', S.st.first], ['틀림', S.st.wrong]],
      qc: S.cfg.qc, playNotes: S.cfg.note,
      onRetry: function () { startStage(S.si); },
      onNext: S.si + 1 < STAGES.length ? function () { startStage(S.si + 1); } : null,
      onMenu: menu
    });
  }
  function menu() {
    S = null; app.innerHTML = '';
    NA.ui.renderTags(GAME_ID);
    NA.ui.stageMenu({
      overlay: ov, gameId: GAME_ID, stages: STAGES, onPick: startStage,
      howto: '말풍선 하나 = 패킷 하나. 상대의 말풍선을 보고 <b>플래그(SYN·ACK·FIN·RST) + seq + ack</b>를 골라 답장한다. 시간 제한 없음.<br>' +
        'SYN·FIN은 번호를 1, 데이터는 길이만큼 소비. ack = 상대에게서 다음에 받을 번호. 틀리면 신뢰도 −1(5칸).<br>' +
        '단축키 <span class="key">S</span><span class="key">A</span><span class="key">F</span><span class="key">R</span> 플래그 · <span class="key">Enter</span> 보내기 · <span class="key">1</span>~<span class="key">3</span> 보기'
    });
  }

  /* ------------------------------------------------------------ 렌더 */
  function render() {
    if (!S) return;
    var c = S.cfg, h = ''; for (var k = 0; k < 5; k++) h += k < S.hearts ? '♥' : '<i>♥</i>';
    var html = '<div class="hud"><span class="t">STAGE ' + (S.si + 1) + ' · ' + esc(c.title) + '</span><span class="hearts">' + h + '</span>' +
      '<span class="cnt">' + esc(c.me.n) + '(' + c.me.role + ') ↔ ' + esc(c.peer.n) + ' · 진행 ' + Math.max(0, Math.min(S.i + 1, c.steps.length)) + ' / ' + c.steps.length + '</span><span class="sp"></span><button class="na-btn" data-guide>규칙</button></div>';
    html += '<div class="main"><div class="phone"><div class="top"><span class="av">' + c.peer.av + '</span><span><b>' + esc(c.peer.n) + '</b><br><small>' + esc(c.peer.sub) + '</small></span><span class="sp"></span><span class="axis">◀ 상대 · 나 ▶</span></div>' +
      '<div class="chat">' + chatHTML() + '</div>' + compHTML() + '</div><div class="side">' + sideHTML() + '</div></div>';
    app.innerHTML = html;
    bind();
    S.flash = {};
  }
  function bubble(m) {
    if (m.side === 'sys') return '<div class="row sys' + (m.isNew ? ' new' : '') + '"><div class="bub">' + m.text + '</div></div>';
    var p = m.p, tags = p.f.map(function (f) { return '<span class="tag ' + f + '">' + f + '</span>'; }).join('');
    var nums = 'seq ' + p.seq + (p.ack != null ? ' · ack ' + p.ack : '');
    var body = '<div class="bub' + (m.lost ? ' lost' : '') + '"><div class="fl">' + tags + '<span class="nums">' + nums + '</span></div>' +
      (p.data ? '<div class="dt">💬 ' + esc(p.data) + ' <small>(' + p.data.length + '바이트)</small></div>' : '') + '</div>';
    var meta = '<span class="meta">' + (m.lost ? '<span class="lostmark">💥 유실</span>' : m.auto ? '커널 자동' : '') + '</span>';
    if (m.side === 'me') return '<div class="row me' + (m.isNew ? ' new' : '') + '">' + meta + body + '</div>';
    return '<div class="row peer' + (m.isNew ? ' new' : '') + '"><span class="av">' + S.cfg.peer.av + '</span>' + body + meta + '</div>';
  }
  function chatHTML() {
    var MAX = 7, list = S.msgs.slice(-MAX), hidden = S.msgs.length - list.length;
    var h = hidden ? '<div class="more-up">▲ 이전 말풍선 ' + hidden + '개</div>' : '';
    h += list.map(bubble).join('');
    if (S.mode === 'typing') h += '<div class="row peer"><span class="av">' + S.cfg.peer.av + '</span><span class="typing"><i></i><i></i><i></i></span></div>';
    return h;
  }
  function compHTML() {
    if (S.mode === 'compose') {
      var st = S.step, c = S.comp;
      var fl = FLAGS.map(function (f) { return '<button class="fbtn ' + f + (c.f[f] ? ' on' : '') + (c.bad.f ? ' bad' : '') + '" data-flag="' + f + '">' + f + '</button>'; }).join('');
      var sq = st.seqOpts.map(function (v) { return '<button class="num' + (c.seq === v ? ' on' : '') + (c.bad.seq ? ' bad' : '') + '" data-seq="' + v + '">' + v + '</button>'; }).join('');
      var ak = st.ackOpts.map(function (v) {
        var dis = v != null && false;
        return '<button class="num' + (v == null ? ' none' : '') + (c.ack === v || (v == null && c.ack === null) ? ' on' : '') + (c.bad.ack ? ' bad' : '') + '" data-ack="' + (v == null ? '' : v) + '"' + (dis ? ' disabled' : '') + '>' + (v == null ? '없음' : v) + '</button>';
      }).join('');
      return '<div class="comp"><div class="line"><span class="lab">플래그</span>' + fl + '</div>' +
        '<div class="line"><span class="lab">seq</span>' + sq + '<span class="data" style="margin-left:6px">내 번호</span></div>' +
        '<div class="line"><span class="lab">ack</span>' + ak + '<span class="data" style="margin-left:6px">다음에 받을 상대 번호</span></div>' +
        '<div class="line"><span class="lab">데이터</span><span class="data">' + (st.want.data ? '<b>"' + esc(st.want.data) + '"</b> (' + st.want.data.length + '바이트, 자동으로 실림)' : '없음') + '</span><button class="send" data-send>보내기 ▶ (Enter)</button></div></div>';
    }
    if (S.mode === 'quiz') {
      return '<div class="comp"><div class="q">❓ ' + esc(S.step.q) + '</div><div class="opts">' + S.opts.map(function (o, i) {
        return '<button class="opt' + (S.x[i] ? ' x' : '') + '" data-ans="' + i + '"><span class="n">' + (i + 1) + '</span>' + esc(o.t) + '</button>';
      }).join('') + '</div></div>';
    }
    return '<div class="comp wait">' + (S.mode === 'typing' ? esc(S.cfg.peer.n) + '이(가) 입력 중…' : '…') + '</div>';
  }
  function sideHTML() {
    var states = STATES.map(function (s) {
      var m = S.me === s, p = S.peer === s;
      return '<div class="st' + (m ? ' me' : '') + (p ? ' pe' : '') + ((m && S.flash.me) || (p && S.flash.pe) ? ' flash' : '') + '"><span>' + s + '</span><span class="bd">' + (m ? '<span class="m">나</span>' : '') + (p ? '<span class="p">상대</span>' : '') + '</span></div>';
    }).join('');
    var co = S.coach || { who: '💬', t: '' };
    return '<div class="fsm"><h3><span>TCP 상태</span><span class="who"><b class="me">■ 나: ' + S.me + '</b><b class="pe">■ 상대: ' + S.peer + '</b></span></h3><div class="states">' + states + '</div></div>' +
      '<div class="coach' + (co.cls ? ' ' + co.cls : '') + '"><span class="who">' + co.who + '</span>' + (co.t || '') + '</div>' +
      '<div class="rules"><b>번호 규칙</b> · SYN·FIN = 1 소비 · 데이터 = 길이만큼 · ACK만 = 0<br><b>ack</b> = 상대 seq + 상대가 소비한 양 (다음에 받을 번호)</div>';
  }
  function bind() {
    app.querySelectorAll('[data-flag]').forEach(function (e) { e.onclick = function () { toggleFlag(e.dataset.flag); }; });
    app.querySelectorAll('[data-seq]').forEach(function (e) { e.onclick = function () { pickSeq(+e.dataset.seq); }; });
    app.querySelectorAll('[data-ack]').forEach(function (e) { e.onclick = function () { pickAck(e.dataset.ack === '' ? null : +e.dataset.ack); }; });
    app.querySelectorAll('[data-ans]').forEach(function (e) { e.onclick = function () { answer(+e.dataset.ans); }; });
    var s = app.querySelector('[data-send]'); if (s) s.onclick = send;
    var g = app.querySelector('[data-guide]'); if (g) g.onclick = guide;
  }
  function guide() {
    var back = ov.innerHTML, wasHidden = ov.hidden;
    ov.innerHTML = '<div class="na-card guide"><h2>TCP 메신저 규칙</h2>' +
      '<h4>번호 계산</h4><p>seq = 이 패킷의 첫 번호. SYN·FIN은 1을, 데이터는 길이만큼 소비한다. ACK만 있는 패킷은 소비하지 않는다. ack = 상대에게서 다음에 받을 번호 = 상대 seq + 상대가 소비한 양.</p>' +
      '<h4>연결 (3-way)</h4><p>SYN → SYN+ACK → ACK. 세 번째 ACK가 와야 서버도 자기 ISN이 전달된 걸 안다. 엉뚱한 ack가 붙은 SYN+ACK에는 RST로 거절한다.</p>' +
      '<h4>종료 (4-way)</h4><p>먼저 끊는 쪽: FIN → FIN_WAIT_1 → (ACK) FIN_WAIT_2 → (FIN에 ACK) TIME_WAIT(2MSL 대기) → CLOSED.<br>' +
      '나중에 끊는 쪽: FIN 받음 → 커널이 ACK → CLOSE_WAIT → 앱이 close() → FIN → LAST_ACK → (ACK) CLOSED.</p>' +
      '<h4>버그 신호</h4><p>TIME_WAIT은 정상. CLOSE_WAIT이 쌓이면 앱의 close() 누락.</p>' +
      '<div class="na-row"><button class="na-btn primary" data-close>닫기</button></div></div>';
    ov.hidden = false;
    ov.querySelector('[data-close]').onclick = function () { ov.innerHTML = back; ov.hidden = wasHidden; };
  }

  /* ------------------------------------------------------------ 입력 */
  window.addEventListener('keydown', function (e) {
    if (!S || !ov.hidden || S.over) return;
    var k = e.key.toUpperCase();
    if (S.mode === 'compose') {
      if (k === 'ENTER') { e.preventDefault(); send(); }
      else if ({ S: 'SYN', A: 'ACK', F: 'FIN', R: 'RST' }[k]) toggleFlag({ S: 'SYN', A: 'ACK', F: 'FIN', R: 'RST' }[k]);
    } else if (S.mode === 'quiz' && /^[1-3]$/.test(k)) answer(+k - 1);
  });

  window.__game = {
    state: function () { return S; }, start: startStage, stages: STAGES,
    flag: toggleFlag, seq: pickSeq, ack: pickAck, send: send, answer: answer,
    solve: function () { var w = S.step.want; S.comp.f = {}; w.f.forEach(function (f) { S.comp.f[f] = true; }); S.comp.seq = w.seq; S.comp.ack = w.ack; render(); }
  };
  menu();
})();
