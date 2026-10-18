# TCP 메신저

상태: 플레이 가능

- 주차: Week 3
- 원형: 메신저 대화 (말풍선 = 패킷), 턴제
- Quick Check: W3-1, W3-8

## 핵심 플레이

대화창이 곧 시퀀스 다이어그램이다. 상대 말풍선(패킷)을 보고, 답장을 조립해 보낸다.

- 플래그 SYN·ACK·FIN·RST를 켜고, seq(내 번호)와 ack(상대에게서 다음에 받을 번호)를 고른다
- 번호 규칙: SYN·FIN은 1, 데이터는 길이만큼 소비. ACK만 있는 패킷은 소비하지 않는다
- 오른쪽에 나와 상대의 TCP 상태(CLOSED ~ TIME_WAIT 10개)가 실시간으로 표시된다
- 틀리면 신뢰도 −1(5칸), 항목별 해설을 보고 그 자리에서 고친다

## 스테이지

1. 첫 인사 (튜토리얼): 클라이언트로 SYN → SYN+ACK → ACK, 첫 메시지 (W3-1)
2. 서버가 되어: LISTEN에서 SYN+ACK로 답하고 세 번째 ACK의 의미 확인 (W3-1)
3. 유령 SYN: 옛 SYN에 대한 엉뚱한 SYN+ACK(ack 101)를 RST로 거절 (W3-1)
4. 먼저 끊기: FIN_WAIT_1 → FIN_WAIT_2 → TIME_WAIT, 마지막 ACK 유실 시 재전송된 FIN에 다시 답하기 (W3-8)
5. 닫지 않는 서버: 커널 자동 ACK → CLOSE_WAIT → close() → LAST_ACK. CLOSE_WAIT이 쌓이면 close() 누락 (W3-8)

## 조작

클릭. 단축키: S·A·F·R 플래그, Enter 보내기, 1~3 보기.
