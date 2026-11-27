/* 기말 대비 — final OX 100 (given expected questions), glossary terms of weeks 5·6·7·9 by importance, abbreviations, mock exam */
'use strict';
(function () {
const T = H.tbl;
const D = {
"ox": [["REST는 HTTP처럼 표준 문서로 정의된 통신 프로토콜이다.", "X", "REST는 프로토콜이 아니라 Roy Fielding(2000)이 정리한 6가지 제약(Client-Server, Stateless, Cacheable, Uniform Interface, Layered System, Code on Demand) 기반의 아키텍처 설계 스타일입니다.", "w5"],
["REST의 6가지 제약 중 Code on Demand는 유일한 선택(optional) 제약으로, 없어도 REST라고 할 수 있다.", "O", "Code on Demand는 서버가 JavaScript 같은 실행 코드를 내려보낼 수 있다는 선택 제약이며, 나머지 5개 제약과 달리 지키지 않아도 REST입니다.", "w5"],
["Uniform Interface는 URI로 자원을 식별하고 표준 메서드로 조작하게 하는 REST의 핵심 제약이다.", "O", "Uniform Interface는 자원 식별, 표현을 통한 조작, 자기 서술적 메시지, HATEOAS로 구성되며, 모든 API가 같은 문법을 쓰게 하는 REST의 핵심입니다.", "w5"],
["Richardson Maturity Model의 Level 2는 HTTP 메서드와 상태 코드를 의미대로 사용하는 단계로, 실무 표준이자 이번 수업의 목표선이다.", "O", "Level 0은 URI·POST 하나, Level 1은 자원별 URI, Level 2는 메서드+상태 코드의 의미대로 사용, Level 3는 HATEOAS입니다. 실무 REST API는 최소 Level 2를 넘어야 합니다.", "w5"],
["모든 응답을 200 OK로 보내고 Body에 {\"success\": false}를 담는 방식은 권장되는 오류 처리 방식이다.", "X", "이는 대표적인 안티패턴입니다. 캐시·모니터링·재시도 로직·DevTools는 모두 상태 코드를 기준으로 동작하므로, 실패는 404·409·422 등 알맞은 상태 코드로 알려야 합니다.", "w5"],
["GET /getStudent?id=10 보다 GET /students/10이 권장되는 이유는 URI는 자원(명사)을, Method는 행위(동사)를 담당하기 때문이다.", "O", "URI에 동사를 넣지 않고, 복수형 컬렉션 + id로 자원을 식별하며 행위는 GET·POST·PATCH·DELETE 같은 메서드로 표현합니다.", "w5"],
["3학년 학생만 조회할 때는 GET /students/grade/3처럼 경로(path)에 조건을 넣는 것이 권장된다.", "X", "경로는 자원 '식별', 쿼리는 '조건'을 표현합니다. 필터는 GET /students?grade=3처럼 쿼리 파라미터로 쓰는 것이 권장됩니다.", "w5"],
["비밀번호나 토큰은 HTTPS로 암호화되므로 URI의 쿼리 파라미터에 넣어도 안전하다.", "X", "민감 정보를 URI·쿼리에 넣으면 서버 로그와 브라우저 기록에 그대로 남습니다. 비밀번호·토큰은 Body나 Authorization 헤더로 보내야 합니다.", "w5"],
["같은 URI(/students/10)라도 Accept 헤더에 따라 JSON, CSV, HTML 등 서로 다른 표현(Representation)을 받을 수 있다.", "O", "Content Negotiation입니다. 클라이언트는 Accept로 원하는 형식을 말하고 서버는 Content-Type으로 실제 형식을 알려 줍니다. 지원하지 않으면 406 Not Acceptable입니다.", "w5"],
["API 응답 표현(Representation)에는 DB 테이블의 모든 컬럼(password_hash 등 포함)을 그대로 담는 것이 좋다.", "X", "표현은 DB 테이블과 같지 않습니다. 클라이언트가 알아야 할 것만 담는 계약이므로 password_hash, 내부 메모 같은 컬럼은 응답에 넣지 않습니다.", "w5"],
["POST로 자원 생성에 성공하면 201 Created와 함께 Location 헤더로 새 자원의 URI를 알려 주는 것이 좋다.", "O", "새 id는 서버가 정하므로 Location 헤더(그리고 보통 Body)로 새 자원 URI를 돌려주면 클라이언트가 바로 GET할 수 있습니다. 200만 쓰면 생성 여부가 흐려집니다.", "w5"],
["DELETE /students/11을 여러 번 보내도 DB 상태는 똑같이 '없음'이므로 DELETE는 멱등(idempotent)하다.", "O", "멱등은 여러 번 보내도 결과 상태가 같다는 뜻입니다. GET·PUT·DELETE는 멱등하므로 재시도가 안전합니다.", "w5"],
["POST는 멱등하므로 네트워크 오류가 나면 자유롭게 재시도해도 중복 생성 위험이 없다.", "X", "POST는 멱등하지 않습니다. 재시도하면 같은 자원이 중복 생성될 수 있으므로 Idempotency-Key 같은 장치가 필요합니다.", "w5"],
["PUT 요청 Body에서 빠진 필드는 기존 값이 그대로 유지된다.", "X", "PUT은 자원 전체를 교체하는 계약이므로 빠진 필드는 삭제(null)·기본값으로 간주됩니다. 보낸 필드만 바꾸고 나머지를 유지하는 것은 PATCH입니다.", "w5"],
["GET /cancelEnrollment?id=5처럼 GET으로 상태를 바꾸면, 크롤러나 브라우저 프리페치가 의도치 않게 수강을 취소할 수 있다.", "O", "GET은 안전(safe)해야 하는 메서드입니다. 어떤 경우든 GET으로 상태를 변경하지 않고 PATCH·POST 등으로 표현해야 합니다.", "w5"],
["FastAPI는 JSON 문법은 맞지만 값이 규칙을 위반한 요청(예: grade=7)에 대해 500 Internal Server Error를 반환한다.", "X", "Schema(Pydantic) 검증 실패는 422 Unprocessable Content입니다. 400은 JSON 자체가 깨진 경우, 500은 서버 측 예외로 클라이언트 잘못이 아닌 경우입니다.", "w5"],
["FastAPI가 422를 반환했다면 handler 코드는 이미 실행된 뒤에 오류가 발생한 것이다.", "X", "422는 Router 다음 Validation(Pydantic) 단계에서 반환됩니다. 즉 handler 코드는 실행조차 되지 않았습니다. 500이면 handler 이후 단계의 문제입니다.", "w5"],
["response_model을 지정하면 DB 객체에 password_hash가 있어도 응답에서 자동으로 걸러진다.", "O", "response_model=StudentOut처럼 응답 Schema를 지정하면 출력도 검증·필터링됩니다. 입력 검증만큼 출력 필터링이 중요합니다.", "w5"],
["Offset 방식 페이지네이션은 대용량 데이터에서도 깊은 페이지까지 일정한 속도를 보장한다.", "X", "Offset은 앞의 행을 세고 버리므로 뒤로 갈수록 느려지고 중간 삽입 시 중복·누락이 생깁니다. 대용량에서 일정한 속도는 Cursor(Keyset) 방식의 장점입니다.", "w5"],
["응답에 새 필드를 추가하는 것은 하위 호환을 깨는 변경이므로 반드시 새 버전(/v2)이 필요하다.", "X", "새 필드 추가·선택 요청 필드 추가·새 endpoint 추가는 호환 유지(Non-breaking) 변경입니다. 필드 이름 변경·삭제, 타입 변경, 선택→필수 변경이 Breaking입니다.", "w5"],
["OpenAPI는 REST API 명세 표준의 이름이고, Swagger는 그 문서·테스트 UI 도구의 이름이다.", "O", "Swagger = 도구, OpenAPI = 명세 표준입니다. FastAPI는 /openapi.json, /docs(Swagger UI), /redoc을 자동으로 만들어 줍니다.", "w5"],
["Stateless란 서버에 DB를 포함한 어떤 데이터도 저장하지 않는다는 뜻이다.", "X", "Stateless는 '대화 상태(session state)'를 서버 메모리에 두지 않는다는 뜻입니다. 자원 상태(DB)는 있어도 되며, 공유 상태는 DB·Redis에 둡니다.", "w5"],
["Origin은 scheme + host + port로 구성되며, path와 query는 Origin에 포함되지 않는다.", "O", "Origin은 브라우저 보안 경계의 단위이며 scheme·host·port 세 요소가 모두 같아야 같은 Origin입니다.", "w5"],
["http://localhost:5500과 http://127.0.0.1:5500은 같은 컴퓨터를 가리키므로 같은 Origin이다.", "X", "브라우저는 host를 문자열로 비교하므로 localhost와 127.0.0.1은 다른 Origin입니다. 실습에서 가장 흔한 CORS 혼란의 원인입니다.", "w5"],
["CORS는 브라우저의 규칙이므로 curl이나 Python requests로 보낸 요청은 CORS 때문에 차단되지 않는다.", "O", "CORS(SOP)는 브라우저 안의 사용자를 보호하는 장치입니다. curl·Postman·서버 간 호출에는 적용되지 않습니다. 그래서 'curl은 되는데 브라우저만 안 되면' 거의 CORS입니다.", "w5"],
["Console에 CORS 오류가 떴다면 서버는 요청을 전혀 받지 못한 것이다.", "X", "Simple Request의 경우 서버는 요청을 받아 처리(DB 수정까지)하고 응답도 보냈지만, Access-Control-Allow-Origin이 없어 브라우저가 JS에 응답을 넘기지 않은 것일 수 있습니다.", "w5"],
["Content-Type: application/json으로 POST하는 cross-origin fetch 요청은 Preflight(OPTIONS) 요청을 발생시킨다.", "O", "Simple Request의 Content-Type은 text/plain, application/x-www-form-urlencoded, multipart/form-data뿐입니다. application/json, PUT·PATCH·DELETE, Authorization 헤더는 Preflight를 발생시킵니다.", "w5"],
["쿠키를 포함한 요청(credentials)에 대해 서버가 Access-Control-Allow-Origin: * 로 응답하면 브라우저가 거부한다.", "O", "'*' + credentials는 규격상 성립하지 않는 조합입니다. 로그인·개인정보가 있는 API는 허용 Origin을 명시적으로 열거해야 합니다.", "w5"],
["Access-Control-Expose-Headers를 설정하지 않아도 JS는 cross-origin 응답의 Location 헤더를 항상 읽을 수 있다.", "X", "Expose-Headers를 빼먹으면 r.headers.get(\"Location\")이 null이 됩니다. 201 응답의 새 URI를 JS가 읽게 하려면 expose_headers=[\"Location\"]이 필요합니다.", "w5"],
["TLS가 제공하는 세 가지 보안 목표는 기밀성(Confidentiality), 무결성(Integrity), 인증(Authentication)이다.", "O", "기밀성은 대칭키 암호(AES-GCM 등), 무결성은 MAC/AEAD 인증 태그, 인증은 인증서 + 전자서명이 담당합니다.", "w6"],
["TLS는 공개키 암호가 대칭키 암호보다 빠르기 때문에 실제 데이터 암호화에 공개키 암호를 사용한다.", "X", "공개키 암호는 대칭키보다 수백~수천 배 느립니다. TLS는 공개키 기술로 키를 교환(ECDHE)하고, 실제 데이터는 빠른 대칭키(AES)로 암호화하는 하이브리드 방식을 씁니다.", "w6"],
["Forward Secrecy 덕분에 나중에 서버 개인키가 유출되더라도 과거에 녹화된 TLS 대화는 풀 수 없다.", "O", "세션 키는 연결마다 새로 만들어지고 연결 종료 시 폐기되므로, 서버 개인키가 나중에 유출돼도 과거 대화를 복호화할 수 없습니다.", "w6"],
["해시는 단방향 함수이므로 해시값으로부터 원문을 되돌릴 수 없다.", "O", "해시는 단방향·고정 길이·눈사태 효과·충돌 저항의 성질을 가집니다. 같은 입력은 항상 같은 출력을 내지만 출력으로 입력을 복원할 수는 없습니다.", "w6"],
["전자서명은 데이터를 암호화해 다른 사람이 내용을 읽지 못하게 숨기는 기술이다.", "X", "서명은 데이터를 숨기지 않습니다. 누구나 읽을 수 있지만 바꾸면 들킵니다(무결성 + 발급자 증명). 이것이 JWT가 암호화가 아닌 이유입니다.", "w6"],
["HTTPS 인증서는 해당 사이트가 피싱 사이트가 아닌 '믿을 수 있는 착한 사이트'임을 보증한다.", "X", "인증서는 '이 서버가 그 도메인의 주인'임만 보증합니다. 피싱 사이트도 자기 도메인의 인증서는 쉽게 받을 수 있습니다.", "w6"],
["인증서 체인 검증에서 브라우저가 처음부터 신뢰하는 출발점은 OS·브라우저 Trust Store에 내장된 Root CA이다.", "O", "브라우저는 Leaf → Intermediate → Root 순서로 서명을 검증하며, 신뢰의 출발점은 미리 설치된 Root CA(자기 서명)입니다.", "w6"],
["HTTPS를 적용하면 XSS와 SQL Injection 공격도 함께 방어된다.", "X", "TLS는 '네트워크 구간'만 지킵니다. 브라우저 안의 XSS, 서버 로직의 IDOR, DB의 SQL Injection은 각각 출력 이스케이프·CSP, 소유권 검사, 파라미터 바인딩으로 따로 막아야 합니다.", "w6"],
["HSTS(Strict-Transport-Security) 헤더는 브라우저가 해당 사이트에 HTTPS로만 접속하도록 강제해 SSL Strip 공격을 막는다.", "O", "예: Strict-Transport-Security: max-age=31536000 → 1년간 HTTPS로만 접속하게 하여 http:// 첫 요청을 가로채는 공격을 방지합니다.", "w6"],
["인증(Authentication)은 '무엇을 해도 되는가'를, 인가(Authorization)는 '당신은 누구인가'를 확인하는 것이다.", "X", "반대입니다. 인증(AuthN)은 '누구인가', 인가(AuthZ)는 '무엇을 해도 되는가'입니다. 인증이 먼저 이루어져야 인가를 판단할 수 있습니다.", "w6"],
["403 Forbidden은 보통 토큰 만료 때문이므로 다시 로그인하면 해결된다.", "X", "토큰이 없거나 만료된 경우는 401 Unauthorized(인증 실패)입니다. 403은 신원은 확인됐지만 권한이 없는 인가 실패라 다시 로그인해도 해결되지 않습니다.", "w6"],
["'비밀번호 + 보안 질문' 조합은 두 가지를 확인하므로 MFA(다중 요소 인증)에 해당한다.", "X", "MFA는 서로 다른 '종류'의 요소(지식·소유·생체)를 조합해야 합니다. 비밀번호와 보안 질문은 둘 다 지식 요소이므로 MFA가 아닙니다.", "w6"],
["비밀번호를 SHA-256 한 번으로만 해시해 저장하면 같은 비밀번호는 같은 해시가 되고, GPU 대입 공격에 취약하다.", "O", "단순 해시는 너무 빠르고 Salt가 없어 레인보우 테이블과 대량 대입에 취약합니다. Argon2id·bcrypt 같은 느린 해시 + Salt를 사용해야 합니다.", "w6"],
["Salt는 비밀 값이므로 해시와 분리해 별도의 안전한 저장소에 보관해야 한다.", "X", "Salt는 비밀이 아니며 해시 문자열 안에 함께 저장됩니다($argon2id$…$salt$hash). 역할은 사람마다 해시를 다르게 만들어 미리 만든 레인보우 테이블을 무력화하는 것입니다.", "w6"],
["Argon2id·bcrypt 같은 비밀번호 해시는 공격자의 대량 대입 비용을 높이기 위해 일부러 느리게 설계되었다.", "O", "정상 로그인은 0.1초가 걸려도 불편하지 않지만, 10억 개를 대입하는 공격자에게는 0.1초 × 10억 = 약 3년이 됩니다.", "w6"],
["로그인 실패 시 '아이디 없음'과 '비밀번호 틀림'을 구분해서 알려 주는 것이 보안상 바람직하다.", "X", "둘을 구분하면 계정 존재 여부가 노출됩니다. 로그인 실패 메시지는 모호하게 하고 401로 응답하는 것이 원칙입니다.", "w6"],
["Session 방식에서 쿠키에는 의미 없는 무작위 Session ID만 담기고, 사용자 정보는 서버의 세션 저장소에 있다.", "O", "세탁소 번호표처럼 sid 자체에는 정보가 없고, 서버가 메모리·Redis·DB 저장소에서 sid로 사용자 정보를 조회합니다. 그래서 즉시 로그아웃이 쉽습니다.", "w6"],
["HttpOnly 속성이 설정된 쿠키는 JavaScript의 document.cookie로 읽을 수 없다.", "O", "HttpOnly는 XSS로 세션 쿠키를 탈취하는 것을 막습니다. Secure는 HTTPS에서만 전송, SameSite는 CSRF 방어 속성입니다.", "w6"],
["SameSite=None 쿠키는 Secure 속성 없이도 정상적으로 사용할 수 있다.", "X", "SameSite=None은 모든 요청에 쿠키를 보내므로 반드시 Secure와 함께 설정해야 합니다. Secure가 없으면 쿠키가 붙지 않는 장애가 생깁니다.", "w6"],
["JWT의 Header와 Payload는 Base64URL로 인코딩만 되어 있어 누구나 디코딩해 내용을 읽을 수 있다.", "O", "JWT(JWS)는 서명만 할 뿐 암호화가 아닙니다. 그래서 Payload에 비밀번호·주민번호·성적 같은 민감 정보를 넣으면 안 됩니다.", "w6"],
["JWT의 Payload에서 role을 student에서 professor로 바꾸면, 서명이 맞지 않아 서버 검증에서 거부된다.", "O", "서명은 header.payload를 서버 키로 계산한 값이므로 내용이 바뀌면 서명이 불일치합니다. 읽을 수는 있지만 고칠 수는 없습니다(홀로그램 입장권 비유).", "w6"],
["JWT 방식은 Session 방식보다 만료 전에 특정 사용자를 즉시 로그아웃(강제 무효화)시키기 쉽다.", "X", "Session은 저장소에서 삭제하면 즉시 차단되지만, JWT는 서버가 기억하지 않으므로 만료 전에는 무효화가 어렵습니다(블랙리스트 필요). 대신 Scale-out에 유리합니다.", "w6"],
["Access Token은 짧은 수명(예: 5~15분)으로, Refresh Token은 긴 수명으로 운영하는 것이 일반적이다.", "O", "Access Token은 모든 요청에 쓰이므로 짧게 해 탈취 피해를 줄이고, Refresh Token은 재발급 endpoint에서만 쓰며 HttpOnly 쿠키·DB 기록으로 깊이 보관합니다.", "w6"],
["OAuth 2.0은 사용자의 비밀번호를 제3자 앱에 넘겨 주는 방식으로 권한을 위임한다.", "X", "OAuth 2.0에서 비밀번호는 Authorization Server(예: 구글 로그인 화면)에만 입력하고, 앱은 scope가 제한된 Access Token만 받습니다(발레파킹 키 비유).", "w6"],
["OAuth 2.0 자체는 인가(권한 위임) 프로토콜이며, '구글로 로그인'처럼 신원까지 받으려면 OpenID Connect(ID Token)를 얹는다.", "O", "OAuth는 권한 위임을 위한 표준이고, 인증(신원 확인)은 그 위에 OpenID Connect를 사용해 ID Token으로 처리합니다.", "w6"],
["API Key만으로도 요청을 보낸 사용자가 누구인지 식별할 수 있다.", "X", "API Key는 '어떤 앱·프로젝트'를 식별하는 값이지 사용자를 나타내지 않습니다. 사용자별 데이터가 있다면 세션·토큰 같은 사용자 인증이 따로 필요합니다.", "w6"],
["IDOR은 인증은 했지만 자원의 소유권 검사를 하지 않아, URL의 id만 바꾸면 남의 데이터에 접근할 수 있는 취약점이다.", "O", "예: /students/2026001/grades → 2026002로 바꾸면 남의 성적이 보이는 경우입니다. 서버에서 path의 id와 토큰의 sub를 비교하고 실패 시 403(또는 404)으로 막습니다.", "w6"],
["SQL Injection의 가장 근본적인 방어책은 따옴표 같은 위험 문자를 블랙리스트로 지우는 입력 필터링이다.", "X", "블랙리스트 필터링은 언제나 우회됩니다. 핵심은 파라미터 바인딩(Prepared Statement)·ORM으로 데이터와 명령을 구조적으로 분리하는 것입니다.", "w6"],
["HTTP 기본 모델에서 서버는 클라이언트의 요청을 받기 전에는 먼저 데이터를 보낼 수 없다.", "O", "HTTP는 Client-initiated 요청/응답 모델입니다. 게다가 클라이언트는 대부분 NAT·방화벽 뒤에 있어 서버가 먼저 연결할 수도 없으므로, 클라이언트가 연결을 열어 두는 방식이 필요합니다.", "w7"],
["Polling 주기를 3초에서 1초로 줄이면 서버 요청 수는 줄어들고 평균 감지 지연도 줄어든다.", "X", "Polling 요청률은 '사용자 수 ÷ 주기'이므로 주기를 줄이면 요청 수는 3배로 늘어납니다(1만 명 기준 3,333 → 10,000 req/s). 지연과 비용을 동시에 줄일 수 없는 것이 Polling의 한계입니다.", "w7"],
["Long Polling 서버는 대기 중인 요청이 오래 자원을 점유하므로 비동기(async)로 구현해야 한다.", "O", "스레드 하나가 요청 하나를 30초씩 붙잡는 동기 서버라면 수백 명만 접속해도 스레드가 바닥납니다.", "w7"],
["SSE(Server-Sent Events)는 하나의 연결로 클라이언트와 서버가 양방향 메시지를 주고받는 기술이다.", "X", "SSE는 서버 → 클라이언트 단방향 Push입니다. 클라이언트가 서버로 보낼 때는 별도 POST가 필요하며, 양방향(Full-duplex)은 WebSocket입니다.", "w7"],
["SSE는 Content-Type: text/event-stream을 사용하는 HTTP 응답이며, 각 이벤트는 빈 줄로 끝난다.", "O", "SSE는 새 프로토콜이 아니라 끝나지 않는 HTTP 응답입니다. 이벤트 끝의 빈 줄(\\n\\n)을 빠뜨리면 브라우저 onmessage가 호출되지 않습니다.", "w7"],
["SSE 연결이 끊겼다가 재연결될 때 브라우저는 Last-Event-ID 헤더를 자동으로 보내 이어받기를 할 수 있다.", "O", "서버가 id: 필드로 이벤트 번호를 보내면, 재연결 시 브라우저가 Last-Event-ID를 보내 그 다음 이벤트부터 누락 없이 받을 수 있습니다.", "w7"],
["SSE는 이미지 같은 바이너리 데이터를 별도 인코딩 없이 그대로 전송할 수 있다.", "X", "SSE는 UTF-8 텍스트만 전송할 수 있습니다. 텍스트 + 바이너리를 모두 보낼 수 있는 것은 WebSocket입니다.", "w7"],
["브라우저 내장 EventSource API는 Authorization 헤더를 자유롭게 지정할 수 있어 Bearer 토큰 방식과 잘 맞는다.", "X", "EventSource에는 커스텀 헤더를 지정할 수 없습니다. 같은 사이트 HttpOnly 쿠키를 쓰거나 fetch 기반 스트림으로 읽어야 합니다.", "w7"],
["LLM 답변 스트리밍은 SSE 형식을 많이 쓰지만, 질문을 POST Body로 보내야 하므로 EventSource 대신 fetch()로 스트림을 읽는 경우가 많다.", "O", "질문 1번 → 답변 스트림 1번인 단방향 구조라 SSE면 충분합니다. 다만 'SSE 형식 ≠ EventSource API'로, 수신은 fetch() + ReadableStream을 씁니다.", "w7"],
["WebSocket 핸드셰이크에 성공하면 서버는 200 OK로 응답한다.", "X", "WebSocket은 HTTP Upgrade 요청에 101 Switching Protocols로 응답하며, 그 이후 같은 TCP 연결은 더 이상 HTTP가 아닌 WebSocket Frame 통로가 됩니다.", "w7"],
["Sec-WebSocket-Accept 값은 이후 WebSocket 메시지를 암호화하는 키로 사용된다.", "X", "Sec-WebSocket-Accept는 Key + 고정 GUID를 SHA-1 후 Base64한 증명값으로, 진짜 WebSocket 서버인지 확인하는 용도일 뿐 암호화·인증이 아닙니다. 보안은 wss(TLS)와 Origin·토큰 검사로 합니다.", "w7"],
["wss://는 TLS 위에서 동작하는 WebSocket으로, 운영 환경에서는 ws:// 대신 wss://를 사용해야 한다.", "O", "ws://는 80번 평문, wss://는 443번 TLS + TCP입니다. 또 https 페이지에서 ws://로 연결하면 Mixed Content로 차단됩니다.", "w7"],
["WebSocket close code 1006은 Close Frame 없이 비정상적으로 연결이 끊겼음을 의미한다.", "O", "1000 정상 종료, 1001 떠남, 1006 비정상 끊김, 1008 정책 위반, 1009 메시지 과대, 1011 서버 내부 오류입니다. 핸드셰이크 실패 시에도 브라우저는 1006만 알려 줍니다.", "w7"],
["브라우저는 WebSocket 연결에도 CORS를 적용하므로, 서버가 따로 Origin 헤더를 검사할 필요가 없다.", "X", "브라우저는 WebSocket에 SOP·CORS를 적용하지 않습니다. 서버가 핸드셰이크 때 Origin을 허용 목록과 비교하지 않으면 Cross-Site WebSocket Hijacking(CSWSH)에 노출됩니다.", "w7"],
["재연결 시 지수 백오프에 무작위 지터(jitter)를 섞는 이유는 다수 클라이언트가 동시에 재접속하는 thundering herd를 막기 위해서다.", "O", "서버 재시작 직후 1만 명이 같은 순간 재접속하면 서버가 다시 죽을 수 있습니다. 재연결 시점을 무작위로 흩어 부하를 분산합니다.", "w7"],
["WebSocket 서버를 여러 대로 늘려도 Redis Pub/Sub 같은 backplane 없이 모든 사용자에게 메시지가 자동으로 전달된다.", "X", "연결 목록은 서버마다 메모리에 따로 있으므로(연결은 상태), A 서버의 메시지를 B 서버 사용자에게 전하려면 Redis·MQTT·Kafka 같은 Pub/Sub backplane이 필요합니다.", "w7"],
["WebRTC는 미디어 전송에 TCP를 사용하여 재전송으로 영상 품질을 보장한다.", "X", "WebRTC는 UDP 기반(SRTP·SCTP over DTLS)입니다. 영상 통화에서는 늦게 오는 정확한 데이터보다 지금의 데이터가 중요하므로 TCP 재전송 대기(HOL blocking)를 피합니다.", "w7"],
["WebRTC 표준에는 Signaling 방법이 정해져 있지 않아, 보통 WebSocket 등으로 직접 구현한다.", "O", "Signaling 서버는 SDP(Offer/Answer)와 ICE 후보를 교환하는 '소개' 역할만 하며, 그 방법은 개발자가 정합니다.", "w7"],
["STUN 서버는 P2P 직접 연결이 실패했을 때 모든 미디어 트래픽을 대신 중계한다.", "X", "STUN은 NAT 바깥 공인 주소를 알려 주는 가벼운 서버입니다. 직접 연결이 안 될 때 모든 트래픽을 중계하는 것은 TURN 서버입니다.", "w7"],
["BLE와 MQTT는 같은 계층의 기술이므로 IoT 제품에서는 둘 중 하나만 선택해야 한다.", "X", "BLE는 무선 링크(Link/PHY) 기술, MQTT는 메시지(Application) 프로토콜로 서로 다른 계층입니다. 실제로는 'BLE 센서 → 폰(Gateway) → MQTT → 서버'처럼 함께 씁니다.", "w7"],
["MQTT에서 Publisher와 Subscriber는 메시지를 주고받기 위해 서로의 IP 주소를 알아야 한다.", "X", "MQTT는 Broker 중심 Pub/Sub 구조로, 양쪽 모두 Broker에만 연결하고 Topic으로 만납니다(공간·시간·동기 분리). 구독자를 추가해도 센서 코드는 그대로입니다.", "w7"],
["MQTT 구독 패턴 inu/+/temp는 발행 토픽 inu/bldg7/301/temp를 수신한다.", "X", "+는 정확히 한 단계만 대응합니다. inu/bldg7/301/temp는 inu와 temp 사이가 두 단계이므로 수신하지 않습니다.", "w7"],
["MQTT 구독 패턴 inu/#은 inu/bldg7/301/temp처럼 inu 아래의 모든 단계 토픽을 수신한다.", "O", "#은 그 아래 모든 단계(부모 단계 자신 포함)에 대응하며, 토픽의 맨 끝에만 사용할 수 있습니다.", "w7"],
["MQTT 와일드카드 +와 #은 구독뿐 아니라 PUBLISH 토픽에도 사용할 수 있다.", "X", "와일드카드는 구독(SUBSCRIBE) 전용입니다. inu/+/temp 같은 토픽으로는 발행할 수 없습니다.", "w7"],
["MQTT QoS 1은 최소 1회 전달을 보장하지만, 수신자가 같은 메시지를 중복으로 받을 수 있다.", "O", "PUBACK을 받지 못하면 DUP=1로 재전송하므로 중복이 생길 수 있습니다. 대부분 QoS 1 + 수신 측 중복 제거(멱등 처리)로 운영하며, QoS 2가 항상 최선은 아닙니다.", "w7"],
["Retained message는 토픽별 마지막 메시지 1개를 브로커가 저장해 두었다가, 새 구독자에게 구독 즉시 전달한다.", "O", "대시보드를 켜자마자 '현재 값'을 보여 줄 때 씁니다. 오래된 값일 수 있으므로 payload에 timestamp를 넣는 것이 좋고, 빈 payload를 retain으로 발행하면 지워집니다.", "w7"],
["Last Will(LWT)은 클라이언트가 Keep Alive 초과 등으로 비정상 종료될 때 브로커가 대신 발행하며, 정상 DISCONNECT 시에는 발행되지 않는다.", "O", "CONNECT 때 등록해 두면 비정상 종료 시 브로커가 'offline' 같은 메시지를 대신 발행합니다. Keep Alive 30초라면 약 1.5배인 45초 안에 감지됩니다.", "w7"],
["MQTT에서 같은 Client ID로 두 클라이언트가 접속하면, 먼저 접속한 쪽의 연결이 끊긴다.", "O", "Client ID는 브로커 안에서 유일해야 합니다. 두 기기가 같은 ID를 쓰면 서로를 끊으며 계속 끊겼다 붙는 장애가 생깁니다.", "w7"],
["주소창에 localhost:8000을 입력하면 어느 기기에서 입력하든 내 노트북의 서버를 가리킨다.", "X", "localhost는 '입력한 그 기기 자신'을 가리킵니다. 친구 휴대폰에서 입력하면 친구 휴대폰을 가리키므로, 다른 사람이 쓰게 하려면 인터넷에서 접속 가능한 주소와 서버가 필요합니다.", "w9"],
["AWS에서 VPC는 하나의 리전에 속하고, 서브넷 하나는 하나의 AZ에 속한다.", "O", "VPC는 한 Region 안의 가상 네트워크이며, 그 안을 나눈 서브넷은 각각 하나의 Availability Zone에 배치됩니다.", "w9"],
["Availability Zone(AZ)은 서울·도쿄처럼 서로 다른 지리적 지역을 의미한다.", "X", "서울처럼 클라우드가 운영되는 지리적 지역은 Region입니다. AZ는 한 리전 안에서 장애 영향을 줄이도록 분리한 데이터센터 구역입니다.", "w9"],
["10.x.x.x, 172.16~31.x.x, 192.168.x.x는 사설 IP 범위로, 인터넷에서 직접 찾아올 수 없다.", "O", "사설 IP는 한 네트워크 안에서만 쓰는 주소(아파트 단지 안의 '101동 1203호')이고, 공인 IP는 인터넷 전체에서 유일한 주소(도로명 주소)입니다.", "w9"],
["10.0.10.0/24는 10.0.0.0/16 범위 안에 포함되는 더 작은 주소 범위이며, 10.0.10.5는 이 /24 서브넷에 속한다.", "O", "/16은 앞 16비트(10.0) 고정, /24는 앞 24비트(10.0.10) 고정입니다. 10.0.10.5는 10.0.10으로 시작하므로 앱 서브넷에 속합니다.", "w9"],
["라우팅 테이블에서 목적지가 여러 행에 해당하면 0.0.0.0/0처럼 더 넓은 범위의 경로가 우선한다.", "X", "더 구체적인(prefix가 긴) 경로가 우선합니다. DB 10.0.20.5는 10.0.0.0/16과 0.0.0.0/0에 모두 해당하지만 /16(local)이 우선합니다.", "w9"],
["Public Subnet과 Private Subnet은 라우팅 테이블에 0.0.0.0/0 → IGW 경로가 있는지 여부로 구분된다.", "O", "이름표가 아니라 라우팅 테이블의 한 줄이 차이를 만듭니다. IGW 경로가 있으면 Public, NAT 또는 경로가 없으면 Private Subnet입니다.", "w9"],
["NAT Gateway를 사용하면 외부 인터넷에서 Private Subnet의 API 서버로 새 연결을 시작할 수 있다.", "X", "NAT Gateway는 내부 서버가 밖으로 나가는(Outbound) 연결만 시작할 수 있게 하는 출구입니다. 응답은 돌아오지만 외부에서 새 연결을 시작할 수는 없습니다.", "w9"],
["로드 밸런서를 사용하면 뒤의 서버를 늘리거나 교체해도 사용자는 같은 대표 주소로 계속 접속할 수 있다.", "O", "사용자는 로드 밸런서 주소 하나만 알면 되고, 로드 밸런서가 정상인 서버들에 요청을 나눠 보냅니다.", "w9"],
["로드 밸런서는 상태 확인(health check)을 통과한 정상 서버로만 요청을 보낸다.", "O", "서버를 두 AZ에 나눠 두는 Multi-AZ 배치와 함께 쓰면 한 서버가 멈춰도 다른 서버가 요청을 받습니다. 단, DB와 외부 호출 경로의 장애 대비는 따로 설계해야 합니다.", "w9"],
["Security Group은 Stateful이므로 허용된 인바운드 연결에 대한 응답 트래픽은 별도 규칙 없이 자동으로 허용된다.", "O", "Security Group은 리소스(네트워크 인터페이스)에 적용하는 가상 방화벽이며, 허용된 연결의 응답을 자동 허용합니다.", "w9"],
["DB(PostgreSQL 5432) 보안 그룹은 관리 편의를 위해 인터넷 전체(0.0.0.0/0)에 열어 두는 것이 권장된다.", "X", "DB 포트 5432는 API 서버의 요청에만 허용해야 합니다. 예시 설계는 LB는 443(인터넷), API는 8000(LB에서만), DB는 5432(API에서만)입니다.", "w9"],
["Network ACL은 서브넷 단위로 적용되며, 규칙 번호 순으로 허용·거부를 판단하고 양방향 규칙을 모두 확인해야 한다.", "O", "Security Group은 리소스 단위·Stateful인 반면, Network ACL은 서브넷 단위이며 응답 방향 규칙도 직접 확인해야 합니다.", "w9"],
["AWS에서 /24 서브넷을 만들면 256개 IP 주소를 모두 서버에 할당할 수 있다.", "X", "/24는 2⁸ = 256개 주소이지만 AWS가 5개를 예약하므로 실제로 사용할 수 있는 주소는 251개입니다.", "w9"],
["VPC Flow Logs에는 HTTP 요청 본문(Body)까지 기록되므로 요청 내용을 분석할 수 있다.", "X", "Flow Logs에는 IP, 포트, ACCEPT/REJECT 같은 흐름 정보만 기록되고 요청 본문은 담기지 않습니다. 차단 여부를 좁히는 데 사용합니다.", "w9"]],
"terms": [["API", "Application Programming Interface — 응용 프로그래밍 인터페이스", "프로그램끼리 기능·데이터를 주고받기 위해 약속된 인터페이스. 서버 코드자체가 아니라 팀(시스템) 사이의 경계선이다.", ["w5"], "API와 계약", 3, [10, 21, 55, 65, 93]],
["API Contract", "API 계약 · 명세", "URI·Method·요청/응답 형식·상태 코드·인증·오류 형식을 미리 정한 약속. 구현이 바뀌어도 계약이 같으면 상대는 영향을 받지 않는다.", ["w5"], "API와 계약", 1, []],
["Frontend", "프론트엔드 — 화면 쪽", "브라우저·모바일 앱·IoT 기기·AI Agent처럼 API를 호출해 결과를 사용자에게 보여 주는 쪽.", ["w5"], "API와 계약", 1, []],
["Backend", "백엔드 — 서버 쪽", "요청을 받아 비즈니스 로직과 DB 작업을 처리하고 응답을 돌려주는 쪽 (FastAPI·Spring·Node).", ["w5"], "API와 계약", 2, []],
["Handler", "핸들러 · 처리 함수", "특정 Endpoint로 들어온 요청을 실제로 처리하는 Backend 함수 (예: update_student()).", ["w5"], "API와 계약", 2, [17]],
["Business Logic", "비즈니스 로직", "수강 정원 확인·중복 학번 검사처럼 서비스의 규칙을 구현한 코드. Handler가 호출한다.", ["w5"], "API와 계약", 1, []],
["Good / Bad Contract", "좋은 계약 / 나쁜 계약", "좋은 계약은 이름만 보고 동작을 짐작할 수 있고 변경을 버전으로 알린다. 나쁜 계약은 DB 컬럼명이 그대로 노출되어 백엔드 수정이 곧 프론트 장애가된다.", ["w5"], "API와 계약", 1, []],
["Function Calling", "LLM Tool / Function calling", "LLM이 API 명세(함수 정의)를 읽고 직접 호출하는 방식. AI Agent도 API의소비자가 된다.", ["w5"], "API와 계약", 1, []],
["SSR", "Server-Side Rendering — 서버 측 렌더링", "서버가 템플릿과 DB로 완성된 HTML 페이지를 만들어 응답하는 구조 (PHP·JSP·Django Template). 클릭마다 페이지 전체를 새로 받는다.", ["w5"], "웹 아키텍처의 변화", 2, []],
["SPA", "Single Page Application — 단일 페이지 애플리케이션", "HTML은 한 번만 받고 이후에는 JS가 fetch()로 JSON만 받아 화면을 바꾸는 구조 (React·Vue).", ["w5"], "웹 아키텍처의 변화", 2, []],
["fetch()", "브라우저 HTTP 요청 함수", "브라우저 JavaScript에서 HTTP 요청을 보내고 응답을 Promise로 받는표준 API. CORS 규칙의 적용 대상이다.", ["w5"], "웹 아키텍처의 변화", 1, [27, 66]],
["Multi-Client API", "다중 클라이언트 API", "하나의 API를 Web·App·IoT·LLM Agent가 함께 쓰는 구조. 명세·버전·인증·속도 제한이 필수가 된다.", ["w5"], "웹 아키텍처의 변화", 1, []],
["API Gateway", "API 게이트웨이", "여러 클라이언트의 요청을 한 입구에서 받아 인증·라우팅 후 내부Microservice로 전달하는 서버.", ["w5"], "웹 아키텍처의 변화", 2, []],
["Microservice", "마이크로서비스", "기능별로 독립 배포되는 작은 서비스 단위. 서비스 사이는API(REST·gRPC)로 통신한다.", ["w5"], "웹 아키텍처의 변화", 1, []],
["Frontend/Backend 분리", "포트·도메인 분리", "Frontend(5500)와 API(8000)가 서로 다른 포트·도메인에서 동작하는 구조. 그래서 CORS가 등장한다.", ["w5"], "웹 아키텍처의 변화", 1, []],
["REST", "Representational State Transfer — 표현 상태 전송", "Roy Fielding(2000)이 웹의 확장성을 6가지 제약으로 정리한 아키텍처 스타일. 프로토콜이 아니며 HTTP 그 자체도 아니다.", ["w5"], "REST 아키텍처 제약", 3, [1, 2, 3, 21]],
["RESTful HTTP API", "REST 스타일의 HTTP API", "HATEOAS를 생략하고 ①~③ 원칙(자원 식별·표현·자기 서술)만 지키는실무 API를 엄밀하게 부르는 말.", ["w5"], "REST 아키텍처 제약", 1, []],
["Client–Server", "관심사 분리", "UI와 데이터 저장을 분리해 각자 독립적으로 진화하게 하는 제약. 깨지면Frontend 배포가 Backend 배포를 기다린다.", ["w5"], "REST 아키텍처 제약", 2, []],
["Stateless (제약)", "무상태 — 요청의 자기완결성", "서버는 이전 요청을 기억하지 않고, 요청마다 필요한 정보를 모두 담는다. 깨지면 특정 서버에 세션이 묶여 Scale-out이 어렵다.", ["w5"], "REST 아키텍처 제약", 3, []],
["Cacheable", "캐시 가능성 명시", "응답이 캐시 가능한지를 Cache-Control·ETag로 스스로 밝히는 제약. 깨지면 같은 목록을 매번 DB에서 다시 조회한다.", ["w5"], "REST 아키텍처 제약", 2, []],
["Uniform Interface", "일관된 인터페이스", "URI로 자원을 식별하고 표준 메서드로 조작하는 REST의 핵심 제약. 처음보는 API도 같은 문법으로 읽을 수 있다.", ["w5"], "REST 아키텍처 제약", 3, [3]],
["Layered System", "계층화 시스템", "클라이언트는 중간에 CDN·LB·Gateway가 있는지 몰라도 되는 구조. 프록시를 추가해도 클라이언트를 고치지 않는다.", ["w5"], "REST 아키텍처 제약", 2, []],
["Code on Demand", "(선택) 코드 전송", "서버가 실행 코드(JavaScript)를 내려보낼 수 있다는 제약. 6개 중 유일한선택 사항으로, 없어도 REST다.", ["w5"], "REST 아키텍처 제약", 3, [2]],
["Identification of Resources", "자원의 식별", "URI 하나가 하나의 자원을 가리킨다 (GET /students/10).", ["w5"], "Uniform Interface와 성숙도", 2, []],
["Manipulation through Representations", "표현을 통한 조작", "클라이언트는 자원 자체가 아니라 JSON 표현을 주고받아 상태 변경을 요청한다 (PATCH /students/10 {\"grade\":4}).", ["w5"], "Uniform Interface와 성숙도", 2, []],
["Self-descriptive Message", "자기 서술적 메시지", "Method·Content-Type·상태 코드만 보고 메시지의 의미를 해석할 수 있어야 한다는 원칙.", ["w5"], "Uniform Interface와 성숙도", 2, []],
["HATEOAS", "Hypermedia As The Engine Of Application State", "응답 안에 다음에 할 수 있는 행동의 링크를 포함하는 원칙 (\"links\": {\"courses\": \"/students/10/courses\"}). 실무에서는 흔히 생략한다.", ["w5"], "Uniform Interface와 성숙도", 3, []],
["Richardson Maturity Model", "리처드슨 성숙도 모델 (RMM)", "API가 얼마나 REST다운지를 Level 0~3의 4단계로 나눈 모델.", ["w5"], "Uniform Interface와 성숙도", 3, [4]],
["Level 0 — Swamp of POX", "Plain Old XML의 늪", "URI 하나, POST 하나로 모든 일을 처리 (POST /api{\"action\":\"getStudent\"}). HTTP를 단순 운반 수단으로만 쓴다.", ["w5"], "Uniform Interface와 성숙도", 2, []],
["Level 1 — Resources", "자원 도입", "자원별 URI는 있지만 메서드를 구분하지 않는다 (POST/students/10/get).", ["w5"], "Uniform Interface와 성숙도", 2, []],
["Level 2 — HTTP Verbs", "메서드와 상태 코드", "메서드와 상태 코드를 의미대로 사용하는 단계 (GET /students/10 →200/404). 실무 표준이자 이 수업의 목표선.", ["w5"], "Uniform Interface와 성숙도", 3, []],
["Level 3 — Hypermedia Controls", "하이퍼미디어 제어", "Level 2에 더해 응답에 다음 행동 링크(HATEOAS)를 포함하는 단계.", ["w5"], "Uniform Interface와 성숙도", 2, []],
["200 + {\"success\": false}", "안티패턴 — 성공 코드 속 실패", "실패를 200으로 응답하고 Body에 숨기는 패턴. 캐시·모니터링·재시도·DevTools가 모두 '성공'으로 오인한다.", ["w5"], "Uniform Interface와 성숙도", 3, []],
["Resource", "자원", "URI로 이름 붙일 수 있는 모든 개념적 대상 — 학생, 수업, 주문. 서버에 있는 '진짜' 상태(DB)다.", ["w5", "w9"], "자원과 표현", 3, []],
["Representation", "표현", "자원의 특정 시점 상태를 표현한 것. 보통 JSON이며, 같은 자원도 상세·목록·필드 선택에 따라 다른 모습이 될 수 있다.", ["w5"], "자원과 표현", 3, [9, 10]],
["Content Negotiation", "콘텐츠 협상", "같은 URI에 대해 클라이언트가 Accept로 원하는 형식을 말하고, 서버가Content-Type으로 실제 형식을 알려 주는 과정.", ["w5"], "자원과 표현", 3, []],
["Accept", "요청 헤더 — 원하는 형식", "클라이언트가 받고 싶은 표현 형식 (application/json, text/csv, text/html).", ["w5"], "자원과 표현", 2, []],
["Content-Type", "본문 형식 헤더", "요청·응답 Body의 실제 형식 (application/json). 누락되면 서버가 JSON으로 해석하지 못해 415·400·422가 난다.", ["w5"], "자원과 표현", 2, [27, 62]],
["406 Not Acceptable", "지원하지 않는 표현", "클라이언트가 Accept로 요청한 형식을 서버가 제공할 수 없을 때의 응답.", ["w5"], "자원과 표현", 1, []],
["MIME Type", "Multipurpose Internet Mail Extensions — 미디어 타입", "type/subtype 형태로 데이터 형식을 나타내는 이름 (application/json, multipart/form-data).", ["w5"], "자원과 표현", 1, []],
["표현 ≠ DB 테이블", "Representation ≠ Schema", "password_hash·created_by 같은 내부 컬럼은 응답 표현에 넣지 않는다. 표현은 '클라이언트가 알아야 할 것'만 담는 계약이다.", ["w5"], "자원과 표현", 1, []],
["URI", "Uniform Resource Identifier — 통합 자원 식별자", "자원을 식별하는 문자열. URI는 '명사(자원)'를, Method는 '동사(행위)'를담당한다.", ["w5"], "URI 설계", 3, [3, 6, 8, 9, 11]],
["Collection", "컬렉션 (복수형)", "같은 종류 자원의 모음 (/students). 복수형 명사를 쓴다.", ["w5"], "URI 설계", 2, []],
["Item", "단일 자원 · 원소", "컬렉션 안의 자원 하나 (/students/10).", ["w5"], "URI 설계", 2, []],
["Sub-resource", "하위 자원", "다른 자원에 포함된 자원을 경로 계층으로 표현한 것 (/students/10/enrollments, /rooms/301/sensors).", ["w5"], "URI 설계", 2, []],
["Relationship Resource", "관계 자원", "학생–수업 사이의 수강(enrollment)처럼 두 자원의 관계 자체를 자원으로만든 것. 생성은 한 곳(POST /enrollments)으로 모은다.", ["w5"], "URI 설계", 1, []],
["Path Parameter", "경로 매개변수", "자원을 식별하는 URI 경로 안의 값 (/students/{sid}의 10). 경로 = '무엇을'.", ["w5"], "URI 설계", 3, []],
["Query Parameter", "쿼리 매개변수", "?key=value로 전달하는 필터·정렬·페이지 조건 (?grade=3). 쿼리 = '어떤조건으로'.", ["w5"], "URI 설계", 3, []],
["동사 금지 규칙", "No verbs in URI", "/getStudent 대신 GET /students/10. 행위는 Method가 표현한다.", ["w5"], "URI 설계", 3, []],
["Kebab-case", "소문자 · 하이픈 규칙", "URI 경로는 대소문자를 구분하므로 /StudentGrades 대신 /student-grades처럼 소문자와 하이픈을 쓴다.", ["w5"], "URI 설계", 1, []],
["Trailing Slash", "끝 슬래시", "/students와 /students/를 혼용하면 307 리다이렉트가 생기고 Body·헤더·Preflight가 손실될 수 있다. 한 가지로 통일한다.", ["w5"], "URI 설계", 1, []],
["Nesting Depth", "중첩 깊이", "/schools/1/depts/2/students/10처럼 깊게 중첩하지 않고 2단계 이내로유지한다.", ["w5"], "URI 설계", 1, []],
["민감 정보 URI 금지", "No secrets in URL", "비밀번호·토큰은 URI·쿼리에 넣지 않는다. 서버 로그와 브라우저 기록에 남는다.", ["w5"], "URI 설계", 3, []],
["Resource Tree", "자원 트리", "명사 목록을 뽑고 관계(1:N, N:M)를 트리로 그린 그림. URI 설계와 과제의첫 단계다.", ["w5"], "URI 설계", 1, []],
["CRUD", "Create · Read · Update · Delete", "데이터 조작 4가지. 각각 POST · GET · PUT/PATCH · DELETE에 대응한다.", ["w5"], "CRUD와 메서드", 3, []],
["GET", "조회", "자원 또는 목록을 조회한다. 안전하고 멱등하며 Body가 없다 → 200.", ["w5"], "CRUD와 메서드", 2, [6, 7, 15]],
["POST", "생성", "컬렉션에 새 자원을 만든다 (POST /students). 새 id는 서버가 정한다 →201 + Location. 비멱등.", ["w5"], "CRUD와 메서드", 2, [11, 13, 27, 66]],
["PUT", "전체 교체", "Body를 자원의 '완전한 새 표현'으로 보고 통째로 교체한다. 빠진 필드는삭제·기본값이 된다. 항상 멱등.", ["w5"], "CRUD와 메서드", 3, [14]],
["PATCH", "부분 수정", "Body에 바꿀 필드만 담는다. 빠진 필드는 그대로 유지. 대부분의 '수정' 화면에서 쓴다.", ["w5"], "CRUD와 메서드", 3, []],
["DELETE", "삭제", "자원을 삭제한다 → 204 No Content. 반복해도 결과가 '없음'으로 같으므로 멱등.", ["w5"], "CRUD와 메서드", 2, [12]],
["Safe Method", "안전한 메서드", "서버 상태를 바꾸지 않는 메서드 (GET·HEAD·OPTIONS). 크롤러·프리페치가 호출해도 문제없어야 한다.", ["w5"], "CRUD와 메서드", 3, []],
["Idempotent", "멱등성", "같은 요청을 여러 번 보내도 결과 상태가 같은 성질. GET·PUT·DELETE는멱등 → 재시도가 안전하다.", ["w5"], "CRUD와 메서드", 3, [12]],
["Idempotency-Key", "멱등 키 헤더", "POST 재시도 시 중복 생성을 막기 위해 요청마다 고유 키를 붙이는 방식 (Week 4).", ["w5"], "CRUD와 메서드", 3, []],
["Location", "응답 헤더 — 새 자원 주소", "201 Created 응답에서 새로 만든 자원의 URI를 알려 준다 (Location: /students/11).", ["w5"], "CRUD와 메서드", 3, []],
["JSON Merge Patch", "RFC 7396 · application/merge-patch+json", "보낸 필드는 덮어쓰고 null은 삭제로 해석하는 PATCH 형식. 사실상 멱등이다.", ["w5"], "CRUD와 메서드", 1, []],
["JSON Patch", "RFC 6902 · application/json-patch+json", "[{\"op\":\"replace\",\"path\":\"/grade\",\"value\":4}]처럼 연산 목록으로 수정을 표현하는 PATCH 형식.", ["w5"], "CRUD와 메서드", 1, []],
["Controller Resource", "컨트롤러 리소스", "POST /enrollments/5/cancel처럼 CRUD로 표현하기 어려운 행위를 하위 경로의 동사로 두는 실무 타협.", ["w5"], "CRUD와 메서드", 1, []],
["행위의 명사화", "Reifying an action", "POST /enrollments/5/cancellation처럼 행위를 별도 자원으로 만들어사유·이력을 남기는 방법.", ["w5"], "CRUD와 메서드", 1, []],
["GET으로 상태 변경 금지", "Unsafe GET 안티패턴", "GET /cancelEnrollment?id=5처럼 GET으로 상태를 바꾸면 크롤러·프리페치가 실수로 실행할 수 있다.", ["w5"], "CRUD와 메서드", 3, []],
["200 OK", "성공", "조회 성공 또는 수정 후 결과를 Body에 담아 반환.", ["w5"], "상태 코드 선택", 2, [5, 67]],
["201 Created", "생성됨", "생성 성공. Location 헤더(그리고 보통 Body)로 새 자원 URI를 함께 알려준다.", ["w5"], "상태 코드 선택", 3, [11]],
["202 Accepted", "접수됨", "요청을 접수만 하고 처리는 나중에 하는 비동기 작업 (AI 추론 큐 등).", ["w5"], "상태 코드 선택", 1, []],
["204 No Content", "내용 없음", "삭제 성공처럼 돌려줄 Body가 없을 때. Preflight 응답에도 자주 쓴다.", ["w5"], "상태 코드 선택", 3, []],
["307 Temporary Redirect", "임시 리다이렉트", "메서드·Body를 유지한 채 다른 URL로 다시 요청하라는 응답. 끝 슬래시 불일치에서 자주 발생하며 Preflight는 리다이렉트를 허용하지 않는다.", ["w5"], "상태 코드 선택", 1, []],
["400 Bad Request", "잘못된 요청", "JSON 자체가 깨졌거나 해석할 수 없는 요청.", ["w5"], "상태 코드 선택", 2, []],
["401 Unauthorized", "인증 실패 — '누구세요?'", "인증 정보가 없거나 유효하지 않음 (실제 의미는Unauthenticated). 다시 로그인하면 해결될 수 있다.", ["w5", "w6"], "상태 코드 선택", 3, []],
["403 Forbidden", "인가 실패 — '당신은 안 됩니다'", "신원은 확인됐지만 권한이 없음. 다시 로그인해도 같다. 존재 자체를 숨기려면 404를 쓰기도 한다.", ["w5", "w6"], "상태 코드 선택", 3, [40]],
["404 Not Found", "자원 없음", "대상 자원이 없거나 경로 오타·prefix(/v1) 누락.", ["w5"], "상태 코드 선택", 2, []],
["405 Method Not Allowed", "허용되지 않은 메서드", "경로는 맞지만 그 메서드의 handler가 없음. 응답의 Allow 헤더로 가능한메서드를 확인한다.", ["w5"], "상태 코드 선택", 2, []],
["409 Conflict", "충돌", "현재 상태와 충돌하는 요청 (이미 등록된 학번, 정원 초과).", ["w5"], "상태 코드 선택", 3, []],
["415 Unsupported Media Type", "지원하지 않는 형식", "서버가 처리할 수 없는 Content-Type으로 Body를 보냄.", ["w5"], "상태 코드 선택", 2, []],
["422 Unprocessable Content", "처리할 수 없는 내용", "JSON 문법은 맞지만 값이 규칙(타입·범위·필수)을 위반. FastAPI 검증 실패의 기본 응답.", ["w5"], "상태 코드 선택", 3, []],
["429 Too Many Requests", "요청 과다", "요청 한도(Rate limit)를 초과. Retry-After로 다시 시도할 시점을 알릴 수있다.", ["w5"], "상태 코드 선택", 2, []],
["500 Internal Server Error", "서버 내부 오류", "처리 중 예외·DB 오류·response_model 불일치. 클라이언트 잘못이 아니다.", ["w5"], "상태 코드 선택", 2, [16]],
["502 / 504", "Bad Gateway / Gateway Timeout", "프록시 뒤 서버가 응답하지 않거나 시간 초과.", ["w5"], "상태 코드 선택", 2, []],
["503 Service Unavailable", "서비스 이용 불가", "과부하·점검 중. Retry-After 헤더와 함께 쓴다.", ["w5"], "상태 코드 선택", 2, []],
["2xx · 4xx · 5xx", "누가 고쳐야 하나", "첫 자리로 책임이 보인다: 2xx 성공 · 4xx 요청을 보낸 쪽(클라이언트) · 5xx서버.", ["w5"], "상태 코드 선택", 1, []],
["Problem Details", "RFC 9457 · application/problem+json", "type·title·status·detail·instance 필드로 오류를 표현하는 HTTP API 표준 오류 형식.", ["w5"], "오류 응답 설계", 2, []],
["type / title", "오류 종류 · 요약", "type은 오류 종류를 나타내는 URI(프로그램용), title은 사람이 읽는 짧은요약.", ["w5"], "오류 응답 설계", 1, [27, 62]],
["detail / instance", "상세 설명 · 발생 위치", "detail은 이번 오류의 구체적 설명, instance는 오류가 난 요청 경로.", ["w5"], "오류 응답 설계", 1, []],
["FastAPI detail 배열", "Pydantic 검증 오류 형식", "422 응답의 {\"detail\": [{type, loc, msg}]} 구조. 필드별 오류가 배열로 담긴다.", ["w5"], "오류 응답 설계", 1, []],
["loc", "location — 오류 위치", "오류가 난 위치 (['body', 'name']). 프론트가 해당 입력 칸 옆에 메시지를표시할 수 있다.", ["w5"], "오류 응답 설계", 1, []],
["오류 형식 일관성", "Consistent Error Body", "모든 endpoint가 같은 오류 구조를 쓰면 프론트는 파서 하나로 처리할 수있다.", ["w5"], "오류 응답 설계", 1, []],
["정보 노출 금지", "No internal leakage", "Stack trace·SQL 문·내부 경로는 절대 응답에 넣지 않는다. 서버 로그로만남긴다.", ["w5"], "오류 응답 설계", 1, []],
["400 vs 422", "문법 오류 vs 값 오류", "400은 JSON 자체가 깨짐, 422는 문법은 맞지만 값이 규칙 위반. FastAPI는 두 경우 모두 422와 detail.type(json_invalid / int_parsing 등)으로구분한다.", ["w5"], "오류 응답 설계", 3, []],
["Endpoint", "엔드포인트", "Method + Path 조합. 같은 /students/10이라도 GET·PATCH·DELETE는서로 다른 endpoint이며 다른 handler로 간다.", ["w5"], "Endpoint와 요청 처리 흐름", 2, []],
["Routing", "라우팅", "요청의 Method와 Path를 보고 어떤 handler를 호출할지 결정하는 과정.", ["w5"], "Endpoint와 요청 처리 흐름", 2, []],
["Router", "라우터", "라우팅을 수행하는 구성 요소. 경로가 없으면 404, 경로는 있지만 메서드가없으면 405.", ["w5"], "Endpoint와 요청 처리 흐름", 2, []],
["Decorator", "@app.get / @app.patch", "FastAPI에서 함수 위에 붙여 Method + Path를 handler에 연결하는 문법.", ["w5"], "Endpoint와 요청 처리 흐름", 1, []],
["Request Body", "요청 본문", "생성·수정할 데이터. FastAPI에서는 Pydantic 모델 타입 매개변수로 받아Schema 검증한다.", ["w5"], "Endpoint와 요청 처리 흐름", 1, []],
["Header Parameter", "헤더 매개변수", "인증·형식·메타데이터. FastAPI에서는 Depends(auth)·Header()로 받는다.", ["w5"], "Endpoint와 요청 처리 흐름", 1, []],
["Depends", "FastAPI 의존성 주입", "current_user 같은 함수를 endpoint 실행 전에 호출해 인증 결과를 넘겨 준다.", ["w5", "w6"], "Endpoint와 요청 처리 흐름", 1, []],
["Uvicorn", "ASGI 서버", "TCP 8000 연결을 accept하고 바이트를 HTTP 요청으로 파싱해 FastAPI에 넘기는 서버. 실행: uvicorn main:app --reload.", ["w5"], "Endpoint와 요청 처리 흐름", 2, []],
["ASGI", "Asynchronous Server Gateway Interface", "Python 비동기 웹 서버와 애플리케이션 사이의 표준 인터페이스.", ["w5"], "Endpoint와 요청 처리 흐름", 2, []],
["Middleware", "미들웨어", "Router 앞에서 모든 요청·응답을 거치는 처리 단계 (CORS·로깅·인증·압축). CORS middleware는 Router보다 먼저 동작한다.", ["w5"], "Endpoint와 요청 처리 흐름", 2, []],
["Service Layer", "서비스 계층", "Handler가 호출하는 비즈니스 규칙·DB(SQL·ORM)·외부 API 처리 부분.", ["w5"], "Endpoint와 요청 처리 흐름", 1, []],
["ORM", "Object-Relational Mapping — 객체-관계 매핑", "DB 테이블을 객체로 다루게 해 주는 도구. SQL을 직접 쓰지 않고 조회·수정한다.", ["w5"], "Endpoint와 요청 처리 흐름", 1, []],
["response_model", "응답 모델", "FastAPI에서 응답 Schema를 지정하는 옵션. DB 객체에password_hash가 있어도 응답에서 걸러 준다 (출력 필터링).", ["w5"], "Endpoint와 요청 처리 흐름", 3, [18]],
["단계별 오류 위치", "Stage-to-Status mapping", "연결 거부 → 서버 앞 / 404·405 → Router / 422 → Validation (handler 미실행) / 500 → handler 이후.", ["w5"], "Endpoint와 요청 처리 흐름", 3, []],
["N+1 Query", "N+1 쿼리 문제", "목록 1번 조회 후 항목마다 추가 쿼리를 N번 보내 응답이 느려지는 현상.", ["w5"], "Endpoint와 요청 처리 흐름", 1, []],
["JSON", "JavaScript Object Notation", "이름–값 쌍과 배열로 데이터를 표현하는 경량 텍스트 형식. REST API의 기본 표현 형식.", ["w5"], "JSON과 Schema", 2, [9, 16, 27]],
["Object { }", "객체", "\"이름\": 값의 묶음. 이름은 항상 큰따옴표로 감싼다.", ["w5"], "JSON과 Schema", 1, []],
["Array [ ]", "배열", "순서가 있는 값의 목록. 보통 같은 모양의 항목을 나열한다.", ["w5"], "JSON과 Schema", 1, []],
["JSON 값 6종", "JSON value types", "string · number · boolean(true/false) · null · array · object. 날짜 타입은 없다.", ["w5"], "JSON과 Schema", 1, []],
["JSON 문법 금지 사항", "Common JSON errors", "작은따옴표, 마지막 항목 뒤 쉼표, 주석은 JSON에서 허용되지 않는다.", ["w5"], "JSON과 Schema", 1, []],
["Schema", "스키마", "데이터의 구조·타입·제약을 정의한 규칙. '실행 가능한 계약'으로서 입력검증·응답 필터·문서 생성을 동시에 한다.", ["w5"], "JSON과 Schema", 2, []],
["JSON Schema", "JSON 스키마 표준", "JSON 데이터의 구조를 JSON으로 기술하는 표준. OpenAPI가 데이터 모델 기술에 사용한다.", ["w5"], "JSON과 Schema", 1, []],
["Pydantic", "Python 데이터 검증 라이브러리", "타입 힌트로 Schema를 선언하고 검증·변환하는 라이브러리. FastAPI의검증 엔진이며, 실패하면 422를 만든다.", ["w5"], "JSON과 Schema", 2, []],
["BaseModel / Field", "Pydantic 모델 · 필드 제약", "BaseModel을 상속해 Schema를 만들고 Field(min_length=1, ge=1, le=4)로 길이·범위 제약을 건다.", ["w5"], "JSON과 Schema", 1, []],
["Type Coercion", "타입 변환", "\"3\" 같은 문자열을 int 3으로 자동 변환해 통과시키는 Pydantic의 기본 동작 (lax 모드).", ["w5"], "JSON과 Schema", 2, []],
["Request / Response Schema 분리", "StudentIn · StudentOut · StudentPatch", "입력과 출력 Schema를 분리해 id·비밀번호 처리 실수를 막는다. PATCH용은 모든 필드를 선택(None)으로 둔다.", ["w5"], "JSON과 Schema", 2, []],
["null vs 누락", "Explicit null vs Omitted", "PATCH에서 {\"email\": null}은 '지워라', 필드가 없으면 '그대로'. 둘을 구분해야 한다.", ["w5"], "JSON과 Schema", 1, []],
["snake_case / camelCase", "이름 표기 규칙", "Python은 snake_case, JS는 camelCase. API 전체에서 하나로 통일하지 않으면 422(필드명 불일치)가 난다.", ["w5"], "JSON과 Schema", 1, []],
["ISO 8601", "날짜·시간 문자열 표준", "JSON에 날짜 타입이 없어 \"2026-10-16T09:00:00+09:00\" 같은 문자열로표현한다.", ["w5"], "JSON과 Schema", 1, []],
["Large Integer", "큰 정수 문제", "JS Number는 2^53까지만 정확하므로 64-bit ID는 문자열로 보내는 경우가 많다.", ["w5"], "JSON과 Schema", 1, []],
["Pagination", "페이지네이션", "큰 목록을 limit 단위로 나누어 보내는 방식. GET /students가 10만 명을한 번에 돌려주면 안 된다.", ["w5"], "컬렉션 조회와 버전 관리", 2, []],
["Offset Pagination", "오프셋 방식 (?offset=40&limit=20)", "앞의 N개를 세고 버린 뒤 반환. '7페이지로 이동'이 쉽지만 깊은 페이지가느리고 중간 삽입 시 중복·누락이 생긴다.", ["w5"], "컬렉션 조회와 버전 관리", 3, []],
["Cursor Pagination", "커서(Keyset) 방식 (?cursor=40&limit=20)", "마지막 위치(책갈피) 다음부터 반환 (WHERE id > 40). 대용량에서도 빠르고 중복·누락이 없지만 임의 페이지 점프는 불가.", ["w5"], "컬렉션 조회와 버전 관리", 3, []],
["limit 상한", "Max page size", "서버가 limit 최대값(예: 100)을 강제해야 한다. ?limit=1000000 한 번에DB와 네트워크가 멈출 수 있다.", ["w5"], "컬렉션 조회와 버전 관리", 2, []],
["next 링크", "다음 페이지 URL", "응답에 담긴 다음 페이지 주소. 클라이언트는 그대로 다시 호출하고 null이면 끝이다.", ["w5"], "컬렉션 조회와 버전 관리", 1, []],
["Filter / Sort / Fields / q", "필터 · 정렬 · 필드 선택 · 검색", "?grade=3 · ?sort=-created_at,name · ?fields=id,name · ?q=kim처럼쿼리로 조건을 표현하는 관례.", ["w5"], "컬렉션 조회와 버전 관리", 1, []],
["API Versioning", "버전 관리", "이미 배포된 앱이 바로 업데이트되지 않으므로 호환이 깨지는 변경은 새 버전으로 낸다. URI(/v1)·Header·Query 방식이 있다.", ["w5"], "컬렉션 조회와 버전 관리", 2, []],
["URI Versioning", "경로 버전 (/v1 → /v2)", "가장 명확하고 캐시·라우팅이 쉬운 방식. 대신 URI가 자원이 아닌 버전을담는다.", ["w5"], "컬렉션 조회와 버전 관리", 2, []],
["Media Type Versioning", "헤더 버전 (Accept: application/vnd.inu.v2+json)", "URI는 깔끔하지만 브라우저·curl에서 확인하기 불편하다.", ["w5"], "컬렉션 조회와 버전 관리", 1, []],
["Breaking Change", "호환 깨짐", "필드 이름 변경·삭제, 타입 변경, 선택→필수 변경, URI·상태 코드·오류 형식 변경. 새 버전이 필요하다.", ["w5"], "컬렉션 조회와 버전 관리", 3, []],
["Non-breaking Change", "호환 유지", "응답 필드·선택 요청 필드·새 endpoint 추가 등. 버전 그대로 배포할 수 있다.", ["w5"], "컬렉션 조회와 버전 관리", 3, []],
["Tolerant Reader", "관대한 독자 원칙", "클라이언트는 모르는 필드를 무시하고, 서버는 필드를 추가만 한다. 대부분의 변경을 버전 없이 배포할 수 있다.", ["w5"], "컬렉션 조회와 버전 관리", 1, []],
["OpenAPI", "OpenAPI Specification (OAS)", "REST API의 경로·파라미터·Schema·응답을 YAML/JSON으로 기술하는명세 표준 (현재 3.1).", ["w5"], "OpenAPI와 문서화", 3, [21]],
["Swagger", "Swagger 도구군", "OpenAPI 명세를 문서·테스트 UI·코드로 다루는 도구 이름. 'Swagger 문서'는 보통 openapi.json이나 /docs를 뜻한다.", ["w5"], "OpenAPI와 문서화", 3, [21]],
["Swagger UI (/docs)", "대화형 API 문서", "FastAPI가 자동 제공하는 페이지. Try it out → Execute로 브라우저에서바로 API를 호출하고 curl 명령까지 보여 준다.", ["w5"], "OpenAPI와 문서화", 2, []],
["ReDoc (/redoc)", "읽기용 API 문서", "같은 OpenAPI 명세를 읽기 좋게 보여 주는 문서 페이지.", ["w5"], "OpenAPI와 문서화", 1, []],
["/openapi.json", "기계가 읽는 명세 파일", "FastAPI가 타입 힌트와 Pydantic 모델로 자동 생성하는 OpenAPI 문서.", ["w5"], "OpenAPI와 문서화", 1, []],
["$ref / components", "명세 재사용", "#/components/schemas/Student처럼 공통 Schema를 한 곳에 정의하고 참조하는 OpenAPI 문법.", ["w5"], "OpenAPI와 문서화", 1, []],
["Codegen", "코드 자동 생성", "OpenAPI 명세로 TypeScript·Kotlin 클라이언트 코드를 자동 생성하는것.", ["w5"], "OpenAPI와 문서화", 1, []],
["Code-first", "코드 → 명세", "코드를 먼저 쓰고 명세를 생성하는 방식 (FastAPI). 빠르지만 구현에 끌려가기 쉽다.", ["w5"], "OpenAPI와 문서화", 1, []],
["Design-first", "명세 → 코드", "팀 간 계약(명세)을 먼저 합의하고 코드를 쓰는 방식. 대규모 협업에 유리하다.", ["w5"], "OpenAPI와 문서화", 1, []],
["Stateless", "무상태", "서버가 이전 요청의 대화 상태를 메모리에 두지 않는 것. 자원 상태(DB)는있어도 된다.", ["w5", "w9"], "Stateless와 인증", 3, []],
["Stateful", "상태 유지", "서버 메모리에 '현재 페이지' 같은 세션 상태를 기억하는 방식. 다른 서버로가면 상태를 모른다.", ["w5", "w9"], "Stateless와 인증", 3, []],
["Session State", "세션(대화) 상태", "사용자가 지금 무엇을 하던 중인지에 대한 정보. Stateless 설계에서는 요청(커서·토큰)이나 공유 저장소에 둔다.", ["w5"], "Stateless와 인증", 2, []],
["Scale-out", "수평 확장", "서버 대수를 늘려 처리량을 키우는 것. WebSocket에서는 서버 간 메시지 공유가필요하다.", ["w5", "w7"], "Stateless와 인증", 2, []],
["Sticky Session", "고정 세션", "LB가 같은 사용자를 항상 같은 서버로 보내는 방식. 그 서버가 죽으면 상태도 사라진다.", ["w5", "w7"], "Stateless와 인증", 2, []],
["Shared Store", "공유 저장소 (DB · Redis)", "모든 서버가 함께 보는 상태 저장소. Stateless 서버의 공유 상태를 맡는다.", ["w5"], "Stateless와 인증", 2, []],
["Redis", "인메모리 키-값 저장소", "세션·캐시·카운터 등을 빠르게 공유하기 위해 쓰는 메모리 기반 DB.", ["w5"], "Stateless와 인증", 1, [73]],
["Authentication", "인증 — 누구인가", "“누구세요?” — 사용자(또는 서버)의 신원을 확인하는 것. 실패하면 401.", ["w5", "w6"], "Stateless와 인증", 3, [30, 39]],
["Authorization (인가)", "인가 — 무엇을 할 수 있는가", "확인된 사용자에게 그 작업 권한이 있는지 판단하는 것. 실패 시 403. HTTP 헤더 이름과 혼동 주의.", ["w5"], "Stateless와 인증", 1, [39, 65]],
["API Key", "X-API-Key 헤더", "사용자가 아니라 앱·프로젝트를 식별하는 고정 비밀 문자열 (X-API-Key). 수명이 길어 브라우저·앱 코드에 넣지 않는다.", ["w5", "w6"], "Stateless와 인증", 3, [55]],
["Session Cookie", "세션 쿠키 (Cookie: sid=…)", "같은 사이트 웹 앱의 인증 방식. CSRF 대비 SameSite, cross-origin이면credentials 설정이 필요하다.", ["w5"], "Stateless와 인증", 1, []],
["Bearer Token", "Authorization: Bearer …", "“가진 사람이 주인”인 토큰. Authorization: Bearer <token>으로 보낸다. 훔치면 그대로 쓸 수 있다.", ["w5", "w6"], "Stateless와 인증", 2, []],
["JWT", "JSON Web Token", "header.payload.signature 세 부분을 점으로 이은 서명된 토큰. 서버는 저장소 조회 없이 서명만 검증한다. ‘홀로그램 입장권’ 비유.", ["w5", "w6"], "Stateless와 인증", 3, [49, 50, 51]],
["Access / Refresh Token", "접근 토큰 / 갱신 토큰", "짧게 만료되는 접근 토큰과, 다시 로그인하지 않고 새 접근 토큰을 받기 위한 갱신 토큰.", ["w5"], "Stateless와 인증", 2, [28, 29, 52]],
["expires_in", "토큰 만료 시간(초)", "발급된 토큰의 유효 시간. 만료 후 요청은 401 token expired.", ["w5"], "Stateless와 인증", 1, []],
["OAuth 2.0", "Open Authorization 2.0", "비밀번호를 넘기지 않고 제3자 앱에 scope가 제한된 권한을 위임하는 인가 프레임워크. ‘발레파킹 키’ 비유.", ["w5", "w6"], "Stateless와 인증", 3, [53, 54]],
["WWW-Authenticate", "인증 방식 안내 헤더", "401 응답에서 어떤 방식으로 인증해야 하는지 알려 준다 (WWW-Authenticate: Bearer).", ["w5", "w6"], "Stateless와 인증", 1, []],
["CSRF / XSS", "Cross-Site Request Forgery / Cross-Site Scripting", "다른 사이트가 쿠키를 이용해 요청을 위조하는 공격 / 악성 스크립트가 페이지에서 실행되는 공격. 토큰 저장 위치를 고민하게 한다.", ["w5"], "Stateless와 인증", 2, [37]],
["SameSite", "쿠키 속성", "Strict: 다른 사이트발 요청에 전송 안 함 / Lax: 링크 이동(GET)만전송 (브라우저 기본) / None: 항상 전송, Secure 필수.", ["w5", "w6"], "Stateless와 인증", 3, [48]],
["Origin", "출처", "scheme + host + port. 브라우저 보안 경계의 단위이며 path·query는 포함되지 않는다.", ["w5"], "Origin과 CORS", 3, []],
["Same-Origin / Cross-Origin", "동일 출처 / 교차 출처", "세 요소가 모두 같으면 Same, 하나라도 다르면 Cross. localhost와127.0.0.1도 문자열이 달라 Cross다.", ["w5"], "Origin과 CORS", 3, [27, 29]],
["SOP", "Same-Origin Policy — 동일 출처 정책", "다른 Origin의 응답을 JS가 '읽는 것'을 막는 브라우저 규칙. 요청을 '보내는 것'은 원래 가능하다.", ["w5"], "Origin과 CORS", 3, []],
["CORS", "Cross-Origin Resource Sharing — 교차 출처 리소스 공유", "서버가 응답 헤더로 특정 Origin의 cross-origin 읽기를 허용해 SOP를 완화하는 메커니즘. 보안 장치가 아니라 완화 장치다.", ["w5"], "Origin과 CORS", 3, [25, 26, 71]],
["Origin 헤더", "요청 출처 헤더", "브라우저가 cross-origin 요청에 자동으로 붙이는 헤더. JS가 조작할 수 없으며 경로·끝 슬래시가 없다.", ["w5"], "Origin과 CORS", 2, []],
["Simple Request", "단순 요청", "GET·HEAD·POST + 안전 헤더 + text/plain·form-urlencoded·multipart 형식만 쓰는 요청. HTML <form>이 원래 보낼 수있던 요청이라 Preflight 없이 바로 나간다.", ["w5"], "Origin과 CORS", 3, []],
["CORS 판단 주체", "Browser decides", "허용 여부는 브라우저가 판단하고 서버는 헤더로 의견만 낸다. 차단돼도 요청은 서버에 도달해 이미 처리됐을 수 있다.", ["w5"], "Origin과 CORS", 3, []],
["CORS 적용 범위", "Browser-only rule", "브라우저 fetch/XHR에만 적용된다. curl·Postman·Python requests·서버↔서버 호출은 무관하다.", ["w5"], "Origin과 CORS", 2, []],
["TypeError: Failed to fetch", "CORS 차단 시 JS 오류", "브라우저가 응답 전달을 거부했을 때 JS에서 보이는 오류. Network 탭에는 200이 찍혀 있을 수 있다.", ["w5"], "Origin과 CORS", 2, []],
["Mixed Content", "혼합 콘텐츠", "HTTPS 페이지에서 ws://·http:// 자원을 호출해 브라우저가 차단하는 것. wss://로 해결.", ["w5", "w6", "w7"], "Origin과 CORS", 2, []],
["Preflight", "사전 요청", "Simple이 아닌 cross-origin 요청 전에 브라우저가 OPTIONS로 '보내도 되는지' 먼저 묻는 요청. 실패하면 실제 요청은 아예 전송되지 않는다.", ["w5"], "Preflight와 CORS 헤더", 3, [27]],
["OPTIONS", "사전 확인 메서드", "Preflight에 쓰이는 HTTP 메서드. CORS middleware가 handler까지 가지 않고 바로 응답한다.", ["w5"], "Preflight와 CORS 헤더", 2, [27]],
["Preflight 유발 조건", "Non-simple triggers", "PUT·PATCH·DELETE 메서드, application/json Content-Type, Authorization·X-API-Key 같은 커스텀 헤더.", ["w5"], "Preflight와 CORS 헤더", 1, []],
["Access-Control-Request-Method", "요청 예정 메서드", "Preflight에서 실제로 보낼 메서드를 알리는 요청 헤더 (브라우저가 자동으로 붙임).", ["w5"], "Preflight와 CORS 헤더", 1, []],
["Access-Control-Request-Headers", "요청 예정 헤더", "Preflight에서 실제로 붙일 헤더 목록을 알리는 요청 헤더 (authorization, content-type).", ["w5"], "Preflight와 CORS 헤더", 1, []],
["Access-Control-Allow-Origin", "허용 Origin", "응답을 읽어도 되는 Origin (하나 또는 *). 모든 응답에 필요하다.", ["w5"], "Preflight와 CORS 헤더", 3, [28]],
["Access-Control-Allow-Methods", "허용 메서드", "Preflight 응답에서 허용하는 메서드 목록 (GET, POST, PATCH, DELETE).", ["w5"], "Preflight와 CORS 헤더", 2, []],
["Access-Control-Allow-Headers", "허용 요청 헤더", "Preflight 응답에서 허용하는 요청 헤더 목록. 없으면 'Request header field …is not allowed' 오류.", ["w5"], "Preflight와 CORS 헤더", 2, []],
["Access-Control-Max-Age", "Preflight 캐시 시간(초)", "이 시간 동안 같은 요청에 OPTIONS를 다시 보내지 않는다. 브라우저마다 상한이있다 (Chrome 2시간).", ["w5"], "Preflight와 CORS 헤더", 1, []],
["Access-Control-Allow-Credentials", "인증정보 허용", "쿠키·인증정보를 포함한 요청(credentials: 'include')의 응답을 읽도록 허용 (true).", ["w5"], "Preflight와 CORS 헤더", 3, []],
["Access-Control-Expose-Headers", "노출 응답 헤더", "JS가 읽을 수 있는 추가 응답 헤더 (Location, X-Total-Count). 빠지면 r.headers.get('Location')이 null.", ["w5"], "Preflight와 CORS 헤더", 3, [29]],
["Vary: Origin", "Origin별 캐시 분리", "Origin마다 응답이 다름을 알려 CDN이 A 사이트용 응답을 B 사이트에 주는 혼선을 막는다.", ["w5"], "Preflight와 CORS 헤더", 2, []],
["CORSMiddleware", "FastAPI CORS 설정", "allow_origins·allow_methods·allow_headers·expose_headers·max_age로 CORS 응답 헤더를 붙이는 미들웨어.", ["w5"], "Preflight와 CORS 헤더", 2, []],
["Wildcard + Credentials", "\"*\" + 쿠키 조합 금지", "credentials 요청에 Allow-Origin: *는 브라우저가 거부한다. 원래 성립하지 않는 조합이다.", ["w5"], "Preflight와 CORS 헤더", 3, []],
["Origin Reflection", "Origin 반사", "요청 Origin을 그대로 Allow-Origin으로 돌려주는 설정. 사실상 '모든 사이트 +쿠키 허용'이라 위험하다.", ["w5"], "Preflight와 CORS 헤더", 2, []],
["Allowlist", "허용 Origin 목록", "허용할 Origin을 환경변수 등으로 명시적으로 열거하는 방식. 로그인·개인정보가있는 API의 기본 원칙.", ["w5"], "Preflight와 CORS 헤더", 2, []],
["Dev Server Proxy", "개발 서버 프록시 (Vite · Next)", "개발 서버가 /api 요청을 API로 대신 전달해 Same-Origin처럼 보이게 하는 방식. 로컬 개발용이라 배포 환경과 다를 수 있다.", ["w5"], "CORS 진단·아키텍처와 설계 선택", 2, []],
["Reverse Proxy 통합", "Same-Origin 배포 (Nginx)", "Nginx가 / 는 정적 파일, /api 는 FastAPI로 보내 하나의 Origin으로 서비스. Cross-origin 자체가 없어 CORS 설정이 필요 없다.", ["w5"], "CORS 진단·아키텍처와 설계 선택", 2, []],
["proxy_pass", "Nginx 전달 지시어", "location /api/ { proxy_pass http://api:8000/; }처럼 요청을 뒷단 서버로 넘기는 설정.", ["w5"], "CORS 진단·아키텍처와 설계 선택", 1, []],
["TLS Termination", "TLS 종료", "Reverse Proxy·로드밸런서가 HTTPS를 풀고 뒷단에는 HTTP로넘기는 구성.", ["w5", "w6"], "CORS 진단·아키텍처와 설계 선택", 2, []],
["curl -i", "응답 헤더 포함 출력", "상태 줄·헤더·Body를 함께 출력한다. 브라우저를 빼고 같은 요청을 재현할때 쓴다.", ["w5"], "CORS 진단·아키텍처와 설계 선택", 1, []],
["curl -X OPTIONS", "Preflight 흉내내기", "-H \"Origin: …\" -H \"Access-Control-Request-Method: …\"를 붙여 서버의 Preflight 응답을 직접 확인한다.", ["w5"], "CORS 진단·아키텍처와 설계 선택", 1, []],
["판단표", "curl vs Browser triage", "curl ✕ → 서버·경로·포트 / curl ✓·브라우저 ✕ → CORS·Mixed Content / 둘 다 ✓·화면 ✕ → 프론트 코드.", ["w5"], "CORS 진단·아키텍처와 설계 선택", 1, []],
["ERR_CONNECTION_REFUSED", "연결 거부", "서버 미실행·포트 불일치·0.0.0.0 vs 127.0.0.1 바인딩 문제. 상태 코드가없으므로 HTTP 이전 단계다 (ss -ltnp로 확인).", ["w5"], "CORS 진단·아키텍처와 설계 선택", 1, []],
["GraphQL", "그래프 쿼리 언어 API", "클라이언트가 쿼리로 필요한 필드를 골라 받는 방식. Over/Under-fetching을 해결하지만 HTTP 캐시가 어렵다.", ["w5"], "CORS 진단·아키텍처와 설계 선택", 1, []],
["Over / Under-fetching", "과다 / 과소 조회", "필요 이상의 데이터를 받거나, 한 화면에 여러 번 호출해야 하는 REST의 약점.", ["w5"], "CORS 진단·아키텍처와 설계 선택", 1, []],
["gRPC", "Google Remote Procedure Call", "HTTP/2 위에서 Protobuf(바이너리)로 함수를 호출하는 방식. 빠르고 타입이 강해 마이크로서비스 내부 통신에 쓴다.", ["w5"], "CORS 진단·아키텍처와 설계 선택", 1, []],
["Protobuf", "Protocol Buffers", "gRPC가 쓰는 바이너리 직렬화 형식. 스키마(.proto)로 타입을 정의한다.", ["w5"], "CORS 진단·아키텍처와 설계 선택", 1, []],
["WebSocket", "웹소켓", "HTTP Upgrade로 시작한 뒤 하나의 TCP 연결을 양방향 메시지 통로로 쓰는 프로토콜.", ["w5", "w7"], "CORS 진단·아키텍처와 설계 선택", 3, [67, 68, 69, 70, 71, 73, 75]],
["SSE", "Server-Sent Events — 서버 전송 이벤트", "HTTP 응답을 끝내지 않고 이벤트를 텍스트로 계속 흘려보내는 서버→클라이언트단방향 Push 방식.", ["w5", "w7"], "CORS 진단·아키텍처와 설계 선택", 3, [61, 62, 63, 64, 66]],
["AI 생성 API 검증 체크리스트", "Reviewer's checklist", "명사·복수형 URI, 201+Location·204, 200+{success:false} 금지, PUT/PATCH 구분, Schema 분리, limit 상한, * + credentials 금지, 내부정보 비노출.", ["w5"], "CORS 진단·아키텍처와 설계 선택", 1, []],
["Confidentiality", "기밀성", "허가된 사람만 데이터를 읽을 수 있게 하는 성질. 도청을 막는다. TLS에서는 대칭키 암호가 담당한다.", ["w6"], "보안의 큰 그림", 3, [30]],
["Integrity", "무결성", "데이터가 중간에 바뀌지 않았음을 보장하는 성질. 해시·MAC·서명으로 확인한다.", ["w6"], "보안의 큰 그림", 3, [30]],
["Authorization", "인가 · AuthZ", "“그걸 해도 되나요?” — 확인된 신원이 특정 자원·행동에 대한 권한을 가졌는지 판단하는 것. 실패하면 403.", ["w6"], "보안의 큰 그림", 3, [39, 65]],
["Audit / Logging", "감사 · 기록", "누가 언제 무엇을 했는지 남기는 것. 사고 분석과 이상 징후 탐지에 쓴다. 비밀번호·토큰은 기록하지 않는다.", ["w6"], "보안의 큰 그림", 2, []],
["Threat / Control", "위협 / 통제(방어)", "공격 방법(XSS, MITM 등)과 그것을 막는 장치(HttpOnly, TLS등). 요청 경로 위에 짝지어 배치해 본다.", ["w6"], "보안의 큰 그림", 1, [28, 29]],
["Defense in Depth", "다층 방어", "NACL(서브넷 문) → SG(인스턴스 문)처럼 여러 겹으로 막는 설계. 같은 서브넷 내부 통신은 NACL을 거치지 않는다.", ["w6", "w9"], "보안의 큰 그림", 2, []],
["Principle of Least Privilege", "최소 권한 원칙", "필요한 권한만, 필요한 시간만 준다. 기본값은 거부, 허용은 명시.", ["w6"], "보안의 큰 그림", 2, []],
["Plaintext / Ciphertext", "평문 / 암호문", "암호화 전의 읽을 수 있는 데이터 / 암호화되어 키 없이는 의미를알 수 없는 데이터.", ["w6"], "암호 기초", 2, []],
["Symmetric Key", "대칭키 암호", "암호화와 복호화에 같은 키를 쓰는 방식 (AES, ChaCha20). 빠르지만 키를 안전하게 나누는 문제가 있다.", ["w6"], "암호 기초", 3, []],
["AES", "Advanced Encryption Standard", "가장 널리 쓰이는 대칭키 블록 암호. TLS에서는 AES-GCM 형태로데이터 암호화에 쓴다.", ["w6"], "암호 기초", 2, []],
["Asymmetric Key", "공개키(비대칭) 암호", "공개키·개인키 한 쌍을 쓰는 방식 (RSA, ECDSA, X25519). 느리지만 키 교환·서명에 쓴다.", ["w6"], "암호 기초", 3, []],
["Public Key", "공개키", "누구에게나 공개하는 키. ‘열린 자물쇠’ 비유 — 잠그기(암호화)와서명 검증만 가능하다.", ["w6"], "암호 기초", 2, []],
["Private Key", "개인키 · 비밀키", "소유자만 보관하는 키. 유출되면 그 신원을 사칭할 수 있다 (서버의 key.pem). Git에 올리지 않는다.", ["w6"], "암호 기초", 3, []],
["RSA", "Rivest–Shamir–Adleman", "큰 수의 소인수분해 어려움에 기반한 공개키 알고리즘. 인증서 서명·키에 널리 쓰인다.", ["w6"], "암호 기초", 2, []],
["ECC / ECDSA", "Elliptic Curve Cryptography / EC Digital Signature Algorithm", "타원곡선 기반 공개키 암호와 서명 방식. RSA보다 짧은 키로 같은강도를 낸다 (ES256).", ["w6"], "암호 기초", 2, []],
["Diffie–Hellman (DH · ECDHE)", "키 합의 · Elliptic Curve DH Ephemeral", "공개된 값만 주고받고도 양쪽이 같은 비밀(세션 키)을 계산하는 방법. ‘물감 섞기’ 비유. E는 연결마다 새 키를 쓴다는 뜻.", ["w6"], "암호 기초", 2, []],
["Session Key", "세션 키", "한 연결에서만 쓰는 대칭키. 키 합의로 만들고 연결이 끝나면 버린다.", ["w6"], "암호 기초", 2, []],
["Forward Secrecy", "전방 비밀성 (PFS)", "서버 개인키가 나중에 유출돼도 과거에 녹화된 통신은 풀 수 없는성질. 연결마다 임시 키(ECDHE)를 쓰기 때문.", ["w6"], "암호 기초", 3, [32]],
["Hash Function", "해시 함수", "임의 입력을 고정 길이 값으로 바꾸는 단방향 함수. 원문 복원 불가, 1비트만 달라도 결과가 크게 바뀐다 (눈사태 효과).", ["w6"], "암호 기초", 3, []],
["SHA-256", "Secure Hash Algorithm 256-bit", "256비트 해시값을 만드는 대표 해시 함수. 파일 검증·서명에 쓰지만, 너무 빨라서 비밀번호 저장용으로는 부적합.", ["w6"], "암호 기초", 2, [42]],
["Collision Resistance", "충돌 저항성", "같은 해시값을 갖는 서로 다른 두 입력을 찾기 어려운 성질.", ["w6"], "암호 기초", 1, []],
["MAC / HMAC", "Message Authentication Code / Hash-based MAC", "비밀키와 해시로 만든 ‘검증 태그’ . 키를 아는 쪽만 만들고 검증할수 있다 (JWT HS256, 웹훅 서명).", ["w6"], "암호 기초", 2, []],
["Digital Signature", "전자서명", "데이터 해시를 개인키로 서명하고 공개키로 누구나 검증하는 방식. 무결성 + 발급자 증명. 내용을 숨기지는 않는다.", ["w6"], "암호 기초", 3, []],
["AEAD", "Authenticated Encryption with Associated Data", "암호화와 무결성 검증을 한 번에 하는 방식 (AES-GCM, ChaCha20-Poly1305). TLS 1.3은 AEAD만 쓴다.", ["w6"], "암호 기초", 2, []],
["Encoding vs Encryption", "인코딩 vs 암호화", "Base64 같은 인코딩은 ‘포장’일 뿐 누구나 되돌릴 수 있다. 암호화는 키가 있어야 풀린다.", ["w6"], "암호 기초", 2, []],
["TLS", "Transport Layer Security — 전송 계층 보안", "TCP 위에서 기밀성·무결성·서버 인증을 제공하는 프로토콜. SSL의 후속이며 현재 1.2·1.3을 쓴다.", ["w6"], "TLS와 HTTPS", 3, [30, 31, 32, 69]],
["SSL", "Secure Sockets Layer", "TLS의 옛 이름·이전 버전. 모든 버전이 폐기되었지만 ‘SSL 인증서’처럼 관용적으로 남아 있다.", ["w6"], "TLS와 HTTPS", 2, [38]],
["HTTPS", "HTTP Secure (HTTP over TLS)", "TLS로 암호화된 통로 위의 HTTP. 기본 포트 443. URL 경로·쿼리·헤더·Body가 모두 암호화된다.", ["w6"], "TLS와 HTTPS", 2, [8, 35, 37, 38]],
["TLS Handshake", "TLS 핸드셰이크", "암호 방식 협상·키 합의·서버 인증을 하는 연결 시작 과정. TLS 1.3은 1-RTT로 끝난다.", ["w6"], "TLS와 HTTPS", 3, []],
["ClientHello / ServerHello", "클라이언트·서버 인사 메시지", "지원 암호 목록·key_share·SNI를 보내는 첫 메시지 / 선택한 암호와 서버 key_share를 돌려주는 응답.", ["w6"], "TLS와 HTTPS", 2, []],
["key_share", "키 공유 값", "ECDHE 키 합의를 위해 각자 보내는 임시 공개값.", ["w6"], "TLS와 HTTPS", 1, []],
["CertificateVerify", "인증서 검증 메시지", "서버가 자기 개인키로 핸드셰이크 내용에 서명해 ‘인증서의 진짜주인’임을 증명하는 메시지.", ["w6"], "TLS와 HTTPS", 1, []],
["Finished", "완료 메시지", "지금까지의 핸드셰이크가 변조되지 않았음을 양쪽이 확인하는 마지막 메시지.", ["w6"], "TLS와 HTTPS", 1, []],
["SNI", "Server Name Indication — 서버 이름 표시", "한 IP에 여러 도메인이 있을 때 어떤 도메인의 인증서가 필요한지ClientHello에 적어 보내는 값.", ["w6"], "TLS와 HTTPS", 2, []],
["RTT", "Round-Trip Time — 왕복 시간", "요청이 갔다가 응답이 돌아오는 시간. TCP 1-RTT + TLS 1.3 1-RTT 후 첫 HTTP 요청이 나간다.", ["w6"], "TLS와 HTTPS", 1, []],
["Cipher Suite", "암호 스위트", "키 교환·서명·대칭 암호·해시 알고리즘의 조합 (예: TLS_AES_128_GCM_SHA256).", ["w6"], "TLS와 HTTPS", 2, []],
["MITM", "Man-In-The-Middle — 중간자 공격", "통신 중간에 끼어들어 엿보거나 바꾸는 공격. 인증서 검증으로 막는다.", ["w6"], "TLS와 HTTPS", 3, []],
["Sniffing", "스니핑 · 도청", "네트워크를 지나가는 패킷을 몰래 읽는 것. 평문 HTTP는 공용Wi-Fi에서 그대로 보인다.", ["w6"], "TLS와 HTTPS", 2, []],
["HSTS", "HTTP Strict Transport Security", "Strict-Transport-Security 헤더로 “이 사이트는 일정 기간HTTPS로만 접속하라”고 브라우저에 지시. SSL Strip을 막는다.", ["w6"], "TLS와 HTTPS", 3, [38]],
["SSL Strip", "HTTPS 다운그레이드 공격", "첫 http:// 요청을 가로채 사용자를 평문 HTTP에 붙잡아 두는 공격.", ["w6"], "TLS와 HTTPS", 3, [38]],
["openssl s_client", "TLS 연결 진단 명령", "openssl s_client -connect host:443 -servername host -showcerts 로 서버가 보내는 인증서 체인과 협상 결과를 확인한다.", ["w6"], "TLS와 HTTPS", 1, []],
["Certificate (X.509)", "디지털 인증서", "“이 공개키는 이 도메인의 것”이라고 CA가 서명한 전자 신분증. X.509는 그 형식 표준.", ["w6"], "인증서와 신뢰", 2, []],
["CA", "Certificate Authority — 인증 기관", "인증서를 발급하고 서명하는 신뢰 기관 (Let's Encrypt, DigiCert, Sectigo 등).", ["w6"], "인증서와 신뢰", 3, []],
["Root CA", "최상위 인증 기관", "OS·브라우저의 Trust Store에 미리 들어 있는 출발점. 자기 자신이 서명(Self-signed)한다.", ["w6"], "인증서와 신뢰", 3, [36]],
["Intermediate CA", "중간 인증 기관", "Root가 서명한 CA. 실제 발급 업무를 맡아 Root 개인키를 오프라인에 둘 수 있게 한다.", ["w6"], "인증서와 신뢰", 2, []],
["Leaf Certificate", "서버(말단) 인증서", "웹 서버가 핸드셰이크에서 보내는 실제 도메인 인증서.", ["w6"], "인증서와 신뢰", 2, []],
["Certificate Chain", "인증서 체인", "Leaf → Intermediate → Root로 서명을 따라 올라가며 검증하는 신뢰 경로. fullchain.pem으로 함께 보낸다.", ["w6"], "인증서와 신뢰", 3, []],
["Trust Store", "신뢰 저장소", "OS·브라우저에 내장된 신뢰할 Root CA 목록.", ["w6"], "인증서와 신뢰", 3, [36]],
["Subject / SAN", "주체 / Subject Alternative Name", "인증서가 보증하는 이름. SAN에 적힌 도메인이 주소창 도메인과같아야 한다.", ["w6"], "인증서와 신뢰", 2, []],
["Issuer", "발급자", "인증서에 서명한 CA.", ["w6"], "인증서와 신뢰", 1, []],
["Validity (Not Before / Not After)", "유효 기간", "인증서가 유효한 시작·끝 시각. PC 시계가 틀려도 검증이 실패한다.", ["w6"], "인증서와 신뢰", 1, []],
["Self-signed Certificate", "자체 서명 인증서", "CA가 아니라 스스로 서명한 인증서. 개발용으로는 쓰지만 브라우저가 경고한다 (ERR_CERT_AUTHORITY_INVALID).", ["w6"], "인증서와 신뢰", 2, []],
["Revocation (OCSP · CRL)", "인증서 폐기 확인", "유출 등으로 취소된 인증서인지 확인하는 방법. OCSP = Online Certificate Status Protocol, CRL = Certificate Revocation List.", ["w6"], "인증서와 신뢰", 2, []],
["Let's Encrypt / certbot", "무료 CA / 자동 발급 도구", "도메인 검증만으로 무료 인증서를 발급하는 CA와, 발급·자동 갱신을 해 주는 클라이언트.", ["w6"], "인증서와 신뢰", 1, []],
["ERR_CERT_DATE_INVALID", "만료·시계 오류이름 불일치", "인증서 만료 또는 사용자 PC 시계 오류.", ["w6"], "인증서와 신뢰", 1, []],
["Credential", "자격 증명", "신원을 증명하는 정보 — ID/비밀번호, OTP, 인증서, 토큰 등.", ["w6"], "인증 요소와 MFA", 2, []],
["Knowledge Factor", "지식 요소 (Something you know)", "비밀번호·PIN처럼 사용자가 아는 것. 피싱·유출·재사용에 약하다.", ["w6"], "인증 요소와 MFA", 2, []],
["Possession Factor", "소유 요소 (Something you have)", "OTP 앱·스마트폰·보안키처럼 사용자가 가진 것.", ["w6"], "인증 요소와 MFA", 2, []],
["Inherence Factor", "생체 요소 (Something you are)", "지문·얼굴·홍채. 바꿀 수 없으므로 보통 기기 안에서만 확인한다.", ["w6"], "인증 요소와 MFA", 2, []],
["MFA / 2FA", "Multi-Factor / Two-Factor Authentication", "서로 다른 종류의 인증 요소를 둘 이상 조합하는 것. 비밀번호 + 보안 질문은 MFA가 아니다.", ["w6"], "인증 요소와 MFA", 3, [41]],
["OTP", "One-Time Password — 일회용 비밀번호", "한 번만 쓰는 코드.", ["w6"], "인증 요소와 MFA", 2, []],
["TOTP", "Time-based One-Time Password", "공유 비밀값 + 현재 시각(30초 단위)을 해시해 6자리 코드를 만드는 방식. 네트워크 없이 앱에서 생성된다.", ["w6"], "인증 요소와 MFA", 2, []],
["SMS 인증", "문자 인증 코드", "구현은 쉽지만 유심 복제·가로채기 위험이 있어 약한 2FA로 본다.", ["w6"], "인증 요소와 MFA", 1, []],
["FIDO2 / WebAuthn", "Fast IDentity Online 2 / Web Authentication", "기기의 개인키로 서명해 로그인하는 표준. 피싱 사이트에서는 서명이 동작하지 않는다.", ["w6"], "인증 요소와 MFA", 2, []],
["Passkey", "패스키", "FIDO2 기반으로 비밀번호를 대체하는 로그인 수단. 서버에는 공개키만 저장된다.", ["w6"], "인증 요소와 MFA", 2, []],
["Phishing", "피싱", "진짜처럼 꾸민 사이트·메일로 비밀번호나 코드를 입력하게 만드는 공격.", ["w6"], "인증 요소와 MFA", 2, []],
["Plaintext Password", "평문 비밀번호", "비밀번호를 그대로 저장하는 것. DB 유출 즉시 모든 계정이 탈취된다. 절대 금지.", ["w6"], "비밀번호 저장과 로그인", 2, []],
["Salt", "솔트", "사용자마다 다른 무작위 값을 섞어 해시하는 것. 같은 비밀번호도해시가 달라져 레인보우 테이블이 무력화된다. 비밀이 아니며 해시 문자열에 함께 저장된다.", ["w6"], "비밀번호 저장과 로그인", 3, [43]],
["Pepper", "페퍼", "모든 해시에 섞는 서버 측 비밀값. DB와 분리된 곳(환경변수·HSM)에 둔다. 선택 사항.", ["w6"], "비밀번호 저장과 로그인", 2, []],
["Rainbow Table", "레인보우 테이블", "흔한 비밀번호의 해시값을 미리 계산해 둔 표. Salt가 없으면 유출된 해시를 즉시 역추적한다.", ["w6"], "비밀번호 저장과 로그인", 2, []],
["Slow Hash / KDF", "느린 해시 · Key Derivation Function", "일부러 시간·메모리를 많이 쓰도록 설계한 비밀번호 전용 해시. 대량 대입 공격을 비싸게 만든다.", ["w6"], "비밀번호 저장과 로그인", 3, []],
["Argon2id", "아르곤2id", "메모리를 많이 쓰는 최신 비밀번호 해시 (2015 Password Hashing Competition 우승). 현재 1순위 권장.", ["w6"], "비밀번호 저장과 로그인", 3, [44]],
["bcrypt", "비크립트", "오래 검증된 비밀번호 해시. 입력은 72바이트까지만 반영된다는제약이 있다.", ["w6"], "비밀번호 저장과 로그인", 3, [44]],
["scrypt / PBKDF2", "기타 비밀번호 해시", "메모리 집약형 해시 / 반복 횟수 기반 해시. 규정상 필요할 때 사용.", ["w6"], "비밀번호 저장과 로그인", 1, []],
["pwdlib", "Python 비밀번호 해시 라이브러리", "PasswordHash.recommended()로 Argon2 해시·검증을 제공. FastAPI 공식 튜토리얼이 사용한다.", ["w6"], "비밀번호 저장과 로그인", 1, []],
["hash() / verify()", "해시 생성 / 검증", "가입 시 hash(평문)을 저장하고, 로그인 시 verify(입력, 저장된 해시)로 비교한다. 해시를 직접 문자열 비교하지 않는다.", ["w6"], "비밀번호 저장과 로그인", 2, [10, 18]],
["Generic Error Message", "모호한 실패 메시지", "“아이디 또는 비밀번호가 올바르지 않습니다”처럼 계정 존재 여부를 알려 주지 않는 메시지 (User Enumeration 방지).", ["w6"], "비밀번호 저장과 로그인", 3, []],
["User Enumeration", "계정 존재 노출", "‘없는 아이디’와 ‘틀린 비밀번호’ 응답이 달라 공격자가 가입된 계정을 알아내는 문제.", ["w6"], "비밀번호 저장과 로그인", 3, []],
["Cookie", "쿠키", "서버가 Set-Cookie로 주면 브라우저가 저장했다가, 조건이 맞는요청마다 Cookie 헤더로 자동 첨부하는 작은 값 (약 4KB).", ["w6"], "쿠키와 세션", 2, []],
["Set-Cookie", "쿠키 설정 응답 헤더", "Set-Cookie: sid=…; HttpOnly; Secure; SameSite=Lax 처럼값과 속성을 함께 보낸다.", ["w6"], "쿠키와 세션", 2, []],
["Session", "세션", "서버가 로그인 상태를 저장소에 기록하고, 브라우저에는 Session ID만 주는 방식. ‘세탁소 번호표 + 가게 장부’ 비유.", ["w6"], "쿠키와 세션", 3, []],
["Session ID (sid)", "세션 식별자", "의미 없는 긴 무작위 번호. 이 값만 있으면 그 사용자로 인정되므로 비밀번호처럼 보호한다.", ["w6"], "쿠키와 세션", 3, [46]],
["Session Store", "세션 저장소", "sid → 사용자 정보를 보관하는 곳 (메모리·Redis·DB). 서버가여러 대면 공유 저장소가 필요하다.", ["w6"], "쿠키와 세션", 2, []],
["Stateful / Stateless", "상태 유지 / 무상태", "서버가 로그인 상태를 기억하는 방식(세션) / 요청 자체가 증명을담아 서버가 기억하지 않는 방식(JWT).", ["w6"], "쿠키와 세션", 2, []],
["Session Fixation", "세션 고정 공격", "공격자가 미리 정한 sid로 피해자를 로그인시키는 공격. 로그인 성공 시 sid를 새로 발급해 막는다.", ["w6"], "쿠키와 세션", 2, []],
["Session Hijacking", "세션 탈취", "sid를 훔쳐 그 사용자로 행세하는 공격. HttpOnly·Secure·짧은만료로 위험을 줄인다.", ["w6"], "쿠키와 세션", 2, []],
["HttpOnly", "쿠키 속성 — JS 접근 금지", "document.cookie로 읽을 수 없게 한다. XSS로 세션 쿠키를 훔치는 것을 막는다.", ["w6"], "쿠키와 세션", 3, [47]],
["Secure", "쿠키 속성 — HTTPS 전용", "HTTPS 연결에서만 쿠키를 전송한다.", ["w6"], "쿠키와 세션", 3, []],
["Max-Age / Expires", "쿠키 수명", "쿠키가 유지되는 시간. 없으면 브라우저를 닫을 때 삭제되는 세션쿠키가 된다.", ["w6"], "쿠키와 세션", 2, []],
["Domain / Path", "쿠키 범위", "쿠키를 보낼 호스트와 경로. Domain을 생략하면 현재 호스트에만 보낸다.", ["w6"], "쿠키와 세션", 1, [7, 23]],
["Logout", "로그아웃", "세션 방식은 저장소에서 sid 삭제, 토큰 방식은 Refresh Token 폐기 + 클라이언트 토큰 삭제.", ["w6"], "쿠키와 세션", 1, []],
["Header", "헤더", "서명 알고리즘(alg)과 타입(typ)을 담은 첫 부분. {\"alg\":\"HS256\",\"typ\":\"JWT\"}", ["w6"], "JWT", 2, []],
["Payload / Claims", "페이로드 / 클레임", "사용자·권한·만료 정보를 담은 두 번째 부분. Base64URL 인코딩일 뿐이라 누구나 읽을 수 있다.", ["w6"], "JWT", 3, []],
["Signature", "서명", "header.payload를 비밀키(HMAC) 또는 개인키(RSA/ECDSA)로서명한 값. 내용을 바꾸면 검증에 실패한다.", ["w6"], "JWT", 3, []],
["Base64URL", "URL 안전 Base64 인코딩", "+ / 대신 - _ 를 쓰고 = 패딩을 뺀 Base64. 암호화가 아니다.", ["w6"], "JWT", 3, [49]],
["sub · exp · iat", "Subject · Expiration · Issued At", "사용자 식별자 · 만료 시각(Unix 초) · 발급 시각. 등록된 표준 클레임.", ["w6"], "JWT", 2, [73]],
["iss · aud · nbf · jti", "Issuer · Audience · Not Before · JWT ID", "발급자 · 받을 대상 API · 이 시각 이전엔 무효 · 토큰 고유 번호.", ["w6"], "JWT", 1, []],
["Custom Claim", "사용자 정의 클레임", "role, scope처럼 서비스가 정해 넣는 클레임. 민감 정보는 넣지 않는다.", ["w6"], "JWT", 1, []],
["HS256", "HMAC with SHA-256", "하나의 비밀키로 서명·검증. 발급·검증 서버가 같은 키를 공유한다. 키는 최소 256비트 무작위 값.", ["w6"], "JWT", 2, []],
["RS256 / ES256", "RSA / ECDSA with SHA-256", "개인키로 서명, 공개키로 검증. 여러 서비스가 공개키만으로 독립검증할 수 있어 OAuth·OIDC에 쓰인다.", ["w6"], "JWT", 2, []],
["alg: none", "서명 없음 알고리즘", "서명이 없는 토큰. 이를 그대로 통과시킨 라이브러리 취약점이 있었다 → 서버가 허용 알고리즘을 고정한다.", ["w6"], "JWT", 2, []],
["Algorithm Confusion", "알고리즘 혼동 공격", "RS256 공개키를 HS256 비밀키로 착각하게 만들어 위조 토큰을통과시키는 공격. algorithms=[…] 고정으로 막는다.", ["w6"], "JWT", 2, []],
["Decode vs Verify", "디코딩 vs 검증", "디코딩은 Payload를 읽는 것(누구나 가능), 검증은 서명·만료·발급자를 확인하는 것(서버의 일).", ["w6"], "JWT", 3, []],
["JWS / JWE", "JSON Web Signature / Encryption", "서명만 한 JWT(일반적인 형태) / 내용까지 암호화한 JWT.", ["w6"], "JWT", 1, []],
["PyJWT", "Python JWT 라이브러리", "jwt.encode()로 발급, jwt.decode(token, key, algorithms= […])로 서명·exp를 검증한다.", ["w6"], "JWT", 1, []],
["ExpiredSignatureError / InvalidTokenError", "PyJWT 예외", "만료된 토큰 / 서명 불일치 등 유효하지 않은 토큰. 둘 다 401로 응답한다.", ["w6"], "JWT", 1, []],
["Clock Skew", "시계 차이", "서버 간 시각이 달라 exp·nbf 검증이 엇나가는 문제. 약간의 허용오차(leeway)를 둔다.", ["w6"], "JWT", 1, []],
["Token Blacklist / Denylist", "토큰 차단 목록", "만료 전 JWT를 무효화하려고 jti를 기록해 두는 목록. Stateless장점을 일부 포기한다.", ["w6"], "JWT", 3, []],
["Authorization Header", "인증 정보 헤더", "Authorization: Bearer eyJ… 처럼 자격 증명을 담는 요청 헤더. 쿠키와 달리 자동 첨부되지 않는다.", ["w6"], "Access · Refresh Token과 저장 위치", 2, []],
["Access Token", "접근 토큰", "API 호출에 쓰는 짧은 수명(5~15분)의 출입증. ‘당일 손목밴드’ 비유.", ["w6"], "Access · Refresh Token과 저장 위치", 3, [52]],
["Refresh Token", "갱신 토큰", "Access Token이 만료되면 새로 받기 위한 긴 수명 토큰. refresh endpoint에만 보내고 서버에 기록해 폐기 가능하게 한다. ‘연간회원권’ 비유.", ["w6"], "Access · Refresh Token과 저장 위치", 3, [52]],
["Refresh Token Rotation", "갱신 토큰 교체", "재발급 때마다 Refresh Token도 새것으로 바꾸고 이전 것은 폐기. 폐기된 토큰이 다시 오면 도난으로 판단한다.", ["w6"], "Access · Refresh Token과 저장 위치", 2, []],
["Token Expiration", "토큰 만료", "exp가 지나면 401. 짧을수록 탈취 피해 시간이 줄어든다.", ["w6"], "Access · Refresh Token과 저장 위치", 2, []],
["localStorage / sessionStorage", "웹 스토리지", "JS로 읽고 쓰는 브라우저 저장소. 간단하지만 XSS가 발생하면 토큰이 탈취된다.", ["w6"], "Access · Refresh Token과 저장 위치", 2, []],
["In-memory Storage", "메모리 저장", "JS 변수에만 토큰을 두는 방식. 새로고침 시 사라지므로 Refresh쿠키와 조합한다.", ["w6"], "Access · Refresh Token과 저장 위치", 1, []],
["Silent Refresh", "자동 재발급", "앱 시작·만료 직전에 refresh endpoint를 호출해 사용자 모르게Access Token을 다시 받는 방식.", ["w6"], "Access · Refresh Token과 저장 위치", 1, []],
["Resource Owner", "자원 소유자", "권한을 허락하는 사용자.", ["w6"], "OAuth 2.0과 OIDC", 2, []],
["Client", "클라이언트 (앱)", "권한을 요청하고 Access Token으로 API를 호출하는 앱.", ["w6"], "OAuth 2.0과 OIDC", 2, []],
["Authorization Server", "인가 서버", "로그인·동의 화면을 제공하고 토큰을 발급하는 서버 (accounts.google.com).", ["w6"], "OAuth 2.0과 OIDC", 2, []],
["Resource Server", "자원 서버", "Access Token을 검증하고 데이터를 제공하는 API (Google Calendar API).", ["w6"], "OAuth 2.0과 OIDC", 2, []],
["Scope", "권한 범위", "토큰으로 할 수 있는 일의 목록 (calendar.events, grades:read). 필요한 최소 범위만 요청한다.", ["w6"], "OAuth 2.0과 OIDC", 2, []],
["Consent", "동의", "사용자가 “이 앱에 이 권한을 허락합니다”를 확인하는 단계.", ["w6"], "OAuth 2.0과 OIDC", 1, []],
["client_id / client_secret", "앱 식별자 / 앱 비밀", "앱의 공개 식별자 / 서버형 앱만 안전하게 보관할 수 있는 비밀. 브라우저·모바일 앱에는 두지 않는다.", ["w6"], "OAuth 2.0과 OIDC", 1, []],
["redirect_uri", "리디렉션 주소", "인가 코드를 돌려받을 미리 등록된 주소. 등록과 정확히 일치해야한다.", ["w6"], "OAuth 2.0과 OIDC", 1, []],
["Authorization Code", "인가 코드", "로그인·동의 후 받는 짧은 수명의 1회용 교환권. 뒷단에서 토큰으로 바꾼다.", ["w6"], "OAuth 2.0과 OIDC", 2, []],
["Authorization Code Flow", "인가 코드 흐름", "코드 → 토큰 교환을 거치는 표준 흐름. 웹·모바일·SPA 모두 이방식 + PKCE를 쓴다.", ["w6"], "OAuth 2.0과 OIDC", 2, []],
["PKCE", "Proof Key for Code Exchange (RFC 7636)", "앱이 code_verifier의 해시(code_challenge)를 먼저 보내고, 토큰 교환 때 원래 값을 보여 준다. 코드를 가로채도 토큰을 못 받는다.", ["w6"], "OAuth 2.0과 OIDC", 2, []],
["state", "상태 매개변수", "요청과 응답이 같은 흐름인지 확인하는 무작위 값. OAuth 흐름의CSRF를 막는다.", ["w6", "w9"], "OAuth 2.0과 OIDC", 2, []],
["Implicit Flow", "암시적 흐름 (비권장)", "토큰을 URL로 바로 받던 옛 방식. 노출 위험 때문에 OAuth 2.0 Security BCP에서 더 이상 권장하지 않는다.", ["w6"], "OAuth 2.0과 OIDC", 1, []],
["Client Credentials Flow", "클라이언트 자격 증명 흐름", "사용자 없이 서버 ↔ 서버가 자기 자격으로 토큰을 받는 흐름.", ["w6"], "OAuth 2.0과 OIDC", 1, []],
["OIDC", "OpenID Connect", "OAuth 2.0 위에 ‘인증’을 얹은 표준. 사용자 신원을 담은 ID Token(JWT)을 함께 발급한다 (“구글로 로그인”).", ["w6"], "OAuth 2.0과 OIDC", 3, []],
["ID Token", "신원 토큰", "OIDC가 발급하는 ‘누가 로그인했는지’ 정보를 담은 JWT. API 호출용 Access Token과 용도가 다르다.", ["w6"], "OAuth 2.0과 OIDC", 3, [54]],
["SSO", "Single Sign-On — 통합 로그인", "한 번 로그인으로 여러 서비스를 이용하는 구조. OIDC·SAML로구현한다.", ["w6"], "OAuth 2.0과 OIDC", 2, []],
["Key Rotation", "키 교체", "비밀키·API Key를 주기적으로 또는 유출 시 즉시 폐기하고 새로발급하는 것.", ["w6"], "API Key와 인가 모델", 1, []],
["mTLS", "mutual TLS — 상호 TLS 인증", "서버뿐 아니라 클라이언트도 인증서로 신원을 증명하는 TLS. IoT·서버 간 통신에 쓴다.", ["w6"], "API Key와 인가 모델", 2, []],
["RBAC", "Role-Based Access Control — 역할 기반 접근 제어", "역할(student · professor · admin)에 권한을 묶어 판단한다.", ["w6"], "API Key와 인가 모델", 2, []],
["ABAC", "Attribute-Based Access Control — 속성 기반 접근 제어", "학과·시간·위치·기기 같은 속성 조합으로 판단한다 (“학기 중, 교내망에서만 성적 입력”).", ["w6"], "API Key와 인가 모델", 2, []],
["Ownership Check", "소유권 검사", "요청한 자원이 그 사용자의 것인지 확인 (grade.student_id ==user.sub).", ["w6"], "API Key와 인가 모델", 3, []],
["IDOR", "Insecure Direct Object Reference", "URL·파라미터의 id만 바꿔 남의 데이터에 접근되는 취약점. 인증은 됐지만 소유권 검사가 빠진 경우.", ["w6"], "API Key와 인가 모델", 3, [56]],
["Broken Access Control", "접근 제어 실패", "인가 검사 누락·우회 전반. OWASP Top 10에서 가장 위험한 항목으로 꼽힌다.", ["w6"], "API Key와 인가 모델", 2, []],
["Server-side Enforcement", "서버 측 강제", "프론트에서 버튼을 숨기는 것은 보안이 아니다. 권한 검사는 매 요청마다 서버에서 한다.", ["w6"], "API Key와 인가 모델", 2, []],
["OWASP / OWASP Top 10", "Open Worldwide Application Security Project", "웹 보안 지침을 공개하는 비영리 단체 / 가장 중요한 웹 보안 위험10가지 목록.", ["w6"], "웹 공격과 방어", 2, []],
["XSS", "Cross-Site Scripting — 사이트 간 스크립팅", "사용자 입력이 HTML에 섞여 공격자 스크립트가 다른 사용자의브라우저에서 실행되는 공격. ‘게시판의 마법 쪽지’ 비유.", ["w6"], "웹 공격과 방어", 3, [37]],
["Output Escaping", "출력 이스케이프", "< > \" ' 를 &lt; 등으로 바꿔 글자로만 표시하는 것. React·Jinja2는 기본으로 이스케이프한다.", ["w6"], "웹 공격과 방어", 2, []],
["innerHTML / dangerouslySetInnerHTML", "위험한 HTML 삽입 API", "문자열을 HTML로 해석해 넣는 API. XSS의 주요 통로이므로 사용을 최소화한다.", ["w6"], "웹 공격과 방어", 1, []],
["CSP", "Content Security Policy — 콘텐츠 보안 정책", "허용된 출처의 스크립트·리소스만 실행·로드하도록 하는 응답 헤더. XSS 피해를 줄인다.", ["w6"], "웹 공격과 방어", 2, []],
["CSRF", "조", "쿠키 자동 첨부를 악용해 사용자가 모르게 요청을 보내게 하는 공", ["w6"], "웹 공격과 방어", 3, []],
["CSRF Token", "CSRF 방지 토큰", "서버가 폼마다 준 난수를 요청에 함께 보내야 처리하는 방식. 공격자는 이 값을 알 수 없다.", ["w6"], "웹 공격과 방어", 2, []],
["SQL Injection (SQLi)", "SQL 삽입", "입력이 SQL 문법의 일부가 되어 쿼리가 바뀌는 공격 (admin' --).", ["w6"], "웹 공격과 방어", 3, [37, 57]],
["Parameter Binding", "파라미터 바인딩 · Prepared Statement", "쿼리 구조와 입력 값을 분리해 입력을 ‘값’으로만 취급하는 방식. ORM도 내부적으로 사용한다.", ["w6"], "웹 공격과 방어", 3, []],
["Command / Prompt Injection", "명령 삽입 / 프롬프트 삽입", "입력이 셸 명령 / LLM 지시문으로 해석되는 같은 뿌리의 공격. 데이터와 명령을 섞지 않는다.", ["w6"], "웹 공격과 방어", 1, []],
["Brute Force / Dictionary", "무차별 대입 / 사전 공격", "모든 조합 / 흔한 비밀번호 목록을 차례로 시도하는 공격.", ["w6"], "웹 공격과 방어", 2, []],
["Credential Stuffing", "크리덴셜 스터핑", "다른 사이트에서 유출된 ID/PW 쌍을 그대로 대입하는 공격. 비밀번호 재사용을 노린다.", ["w6"], "웹 공격과 방어", 2, []],
["Password Spraying", "패스워드 스프레이", "많은 계정에 흔한 비밀번호 1~2개씩 시도해 계정 잠금을 피하는공격.", ["w6"], "웹 공격과 방어", 1, []],
["Rate Limiting · 429", "요청 속도 제한 · Too Many Requests", "IP·계정별 시도 횟수를 제한하고 초과 시 429 + Retry-After로 응답한다.", ["w6"], "웹 공격과 방어", 2, []],
["CAPTCHA", "Completely Automated Public Turing test to tell Computers and Humans Apart", "사람과 봇을 구분하는 테스트. 연속 실패 시 추가한다.", ["w6"], "웹 공격과 방어", 1, []],
["Clickjacking", "클릭재킹", "투명한 iframe으로 진짜 사이트를 덮어 사용자가 모르게 클릭하게 하는 공격. X-Frame-Options / frame-ancestors로 막는다.", ["w6"], "웹 공격과 방어", 1, []],
["Strict-Transport-Security", "HSTS 헤더", "max-age 동안 HTTPS로만 접속하도록 지시.", ["w6"], "보안 헤더와 Secret 관리", 2, [38]],
["Content-Security-Policy", "CSP 헤더", "default-src 'self'; script-src 'self' 처럼 허용 출처를 지정. 처음에는 Report-Only로 관찰한다.", ["w6"], "보안 헤더와 Secret 관리", 1, []],
["X-Content-Type-Options: nosniff", "MIME 추측 금지프레임 삽입 제한", "브라우저가 Content-Type을 추측해 파일을 스크립트로 실행하는 것을 막는다.", ["w6"], "보안 헤더와 Secret 관리", 1, []],
["Referrer-Policy", "리퍼러 정책", "다른 사이트로 이동할 때 보내는 이전 URL 정보를 줄인다 (strict-origin-when-cross-origin).", ["w6"], "보안 헤더와 Secret 관리", 1, []],
["Cache-Control: no-store", "캐시 금지", "개인정보 응답이 공용 PC·프록시 캐시에 남지 않게 한다.", ["w6"], "보안 헤더와 Secret 관리", 1, []],
["Secret", "비밀 설정값", "JWT 서명 키·DB 비밀번호·API Key 등. 코드가 아니라 설정이다.", ["w6"], "보안 헤더와 Secret 관리", 2, []],
["Hard-coded Secret", "하드코딩된 비밀", "SECRET_KEY = \"mysecretkey\"처럼 코드에 박힌 비밀. Git에올라가는 순간 공개된다.", ["w6"], "보안 헤더와 Secret 관리", 2, []],
["Environment Variable", "환경변수", "os.environ[\"JWT_SECRET\"]처럼 실행 환경에서 비밀을 주입하는 방식. 없으면 시작이 실패하게 한다.", ["w6"], "보안 헤더와 Secret 관리", 1, []],
[".env / .gitignore", "로컬 설정 파일 / Git 제외 목록", ".env에 로컬 비밀을 두고 .gitignore에 반드시 추가한다.", ["w6"], "보안 헤더와 Secret 관리", 2, []],
["secrets.token_hex(32)", "안전한 난수 생성", "Python에서 256비트 무작위 비밀키를 만드는 방법. random 모듈은 보안용이 아니다.", ["w6"], "보안 헤더와 Secret 관리", 1, []],
["Secret Manager", "비밀 관리 서비스", "AWS·GCP Secret Manager, HashiCorp Vault, Kubernetes Secret처럼 비밀을 저장·배포·교체하는 서비스 (Week 9~12).", ["w6"], "보안 헤더와 Secret 관리", 1, []],
["FastAPI Security", "fastapi.security", "OAuth2PasswordBearer, OAuth2PasswordRequestForm 등인증 도우미를 제공하는 모듈.", ["w6"], "실습 · 진단 도구", 1, []],
["OAuth2PasswordBearer", "Bearer 토큰 추출기", "Authorization 헤더에서 토큰을 꺼내는 의존성. 없으면 401을 반환하고, /docs에 [Authorize] 버튼을 만든다.", ["w6"], "실습 · 진단 도구", 1, []],
["OAuth2PasswordRequestForm", "로그인 폼 파서", "username·password를 form 형식(application/x-www-form-urlencoded)으로 받는 클래스.", ["w6"], "실습 · 진단 도구", 1, []],
["HTTPException", "FastAPI 오류 응답", "raise HTTPException(401, \"invalid token\")처럼 상태 코드와detail을 반환한다.", ["w6"], "실습 · 진단 도구", 1, []],
["curl -i / -v", "응답 헤더 · 상세 출력", "상태 줄과 헤더를 함께 보거나(-i), TLS 핸드셰이크까지 상세히 본다(-v).", ["w6"], "실습 · 진단 도구", 1, []],
["jwt.get_unverified_header()", "검증 없이 헤더 보기", "디버깅용으로 alg 등을 확인한다. 검증 결과로 쓰면 안 된다.", ["w6"], "실습 · 진단 도구", 1, []],
["DevTools Application 탭", "브라우저 저장소 관찰", "Cookies·localStorage를 보고 HttpOnly·Secure·SameSite속성을 확인한다.", ["w6"], "실습 · 진단 도구", 1, []],
["Security Code Review", "보안 코드 리뷰", "하드코딩 Secret, 약한 해시, 검증 꺼짐, 긴 만료, IDOR, 계정 노출, Rate limit, CORS, 로그 노출을 체크리스트로 점검한다.", ["w6"], "실습 · 진단 도구", 1, []],
["Real-time", "실시간 — “충분히 빠르게”", "서비스가 요구하는 시간 안에 변화가 전달되는 것. 절대적 기준이 아니라 지연 예산(Latency budget)으로 정의한다.", ["w7"], "실시간 통신 기초", 3, []],
["Latency Budget", "지연 예산", "“경보는 1초 내”처럼 서비스가 허용하는 최대 지연을 숫자로 정한 것. 프로토콜 선택의 출발점이다.", ["w7"], "실시간 통신 기초", 2, []],
["Hard Real-time", "경성 실시간", "마감을 놓치면 시스템 실패가 되는 실시간 (에어백·산업 제어).", ["w7"], "실시간 통신 기초", 2, []],
["Soft Real-time", "연성 실시간", "늦으면 품질만 떨어지는 실시간 (채팅·영상). 웹·IoT 서비스 대부분이 여기에 속한다.", ["w7"], "실시간 통신 기초", 2, []],
["Request/Response", "요청-응답 모델", "클라이언트가 요청해야만 서버가 응답하는 HTTP의 기본 모델. 서버가 먼저 말할수 없다.", ["w7"], "실시간 통신 기초", 3, []],
["Client-initiated", "클라이언트 주도", "연결과 요청을 항상 클라이언트가 시작한다는 HTTP의 성질. 실시간 Push가 어려운 근본 원인.", ["w7"], "실시간 통신 기초", 2, []],
["Pull", "당기기", "클라이언트가 필요할 때 데이터를 가져가는 방식 (REST·Polling). 단순하지만 변화 감지가 늦다.", ["w7"], "실시간 통신 기초", 2, []],
["Push", "밀어주기", "사건이 생긴 쪽(서버·기기)이 즉시 알리는 방식 (SSE·WebSocket·MQTT). 연결유지가 필요하다.", ["w7"], "실시간 통신 기초", 3, []],
["Persistent Connection", "지속 연결", "한 번 연 연결을 오래 유지하며 여러 메시지를 주고받는 것. 이번 주 Push 기술의공통 기반.", ["w7"], "실시간 통신 기초", 2, []],
["Full-duplex", "전이중", "양쪽이 동시에 독립적으로 보낼 수 있는 통신 (WebSocket).", ["w7"], "실시간 통신 기초", 3, []],
["Half-duplex / Simplex", "반이중 / 단방향", "한 번에 한쪽만 보내거나(반이중), 한 방향으로만 보내는(단방향, SSE) 통신.", ["w7"], "실시간 통신 기초", 2, []],
["NAT 뒤의 클라이언트", "Inbound 연결 불가", "브라우저·폰·센서는 대부분 NAT·방화벽 뒤에 있어 외부에서 먼저 연결할 수 없다. 그래서 안쪽에서 바깥으로 연결을 열어 둔다.", ["w7"], "실시간 통신 기초", 2, []],
["TTFT", "Time To First Token — 첫 토큰까지 시간", "LLM 답변의 첫 글자가 보이기까지의 시간. 스트리밍(SSE)으로 체감 지연을 줄인다.", ["w7"], "실시간 통신 기초", 2, []],
["Polling", "주기적 조회", "클라이언트가 일정 주기로 “새 데이터 있나?”를 반복 요청하는 방식. 기존 REST API를 그대로 쓴다.", ["w7"], "Polling 계열", 3, [59, 60]],
["Polling Interval (T)", "조회 주기", "Polling 요청 사이의 간격. 평균 감지 지연은 T/2, 최악 T.", ["w7"], "Polling 계열", 3, []],
["요청률 = N / T", "Polling 부하 공식", "N명이 T초마다 요청하면 초당 N/T 요청. 1만 명·3초 주기 → 약 3,333 req/s.", ["w7"], "Polling 계열", 1, []],
["Empty Response", "빈 응답", "변화가 없어 내용 없이 돌아오는 Polling 응답. 헤더 비용만 드는 낭비다.", ["w7"], "Polling 계열", 2, []],
["Cursor (since)", "커서 · 마지막으로 본 위치", "?since=100처럼 어디까지 봤는지를 요청에 담는 값. 서버가 클라이언트 상태를기억하지 않아도 된다 (Stateless).", ["w7"], "Polling 계열", 2, []],
["Adaptive Polling", "적응형 Polling", "변화가 없으면 주기를 늘리고, 변화가 잦으면 줄이는 Polling 개선 기법.", ["w7"], "Polling 계열", 1, []],
["ETag / 304", "Entity Tag / Not Modified", "자원 버전 식별자. If-None-Match로 보내 변화가 없으면 304로 Body 없이 응답→ Polling 비용 절감.", ["w7"], "Polling 계열", 2, []],
["Long Polling", "롱 폴링 · 응답 보류", "서버가 새 데이터가 생기거나 타임아웃이 될 때까지 응답을 붙잡아 두는 Polling. 받으면 즉시 재요청한다.", ["w7"], "Polling 계열", 3, [60]],
["Hold Timeout", "보류 시간", "Long Polling 요청을 최대 몇 초 붙잡을지 (예: 30초). 프록시 타임아웃(60초 등) 보다 짧아야 한다.", ["w7"], "Polling 계열", 2, []],
["204 No Content (Long Polling)", "타임아웃 응답", "대기 시간 동안 새 데이터가 없을 때 돌려주는 빈 응답. 클라이언트는 바로 재요청한다.", ["w7"], "Polling 계열", 2, []],
["asyncio.Event / wait_for", "Python 비동기 대기", "이벤트가 생길 때까지 스레드를 막지 않고 기다리는 도구. Long Polling 서버 구현에 쓴다.", ["w7"], "Polling 계열", 1, []],
["Async Server", "비동기 서버", "요청 하나가 스레드를 점유하지 않고 대기하는 서버 (FastAPI·Uvicorn). 대기 연결이 많은 실시간 서버에 필수.", ["w7"], "Polling 계열", 3, []],
["202 Accepted + Polling", "작업 완료 확인 패턴", "오래 걸리는 작업을 접수만 하고, 클라이언트가 상태를 주기적으로 확인하는 패턴 (Week 5). Polling이 적합한 대표 사례.", ["w7"], "Polling 계열", 2, []],
["text/event-stream", "SSE MIME 타입", "SSE 응답의 Content-Type. 이 값이 있어야 브라우저가 이벤트 스트림으로 해석한다.", ["w7"], "SSE", 3, []],
["EventSource", "브라우저 SSE API", "new EventSource(url)로 SSE를 수신하는 내장 객체. 자동 재연결을 해 주지만GET만, 커스텀 헤더 불가.", ["w7"], "SSE", 3, [65, 66]],
["Event", "SSE 이벤트", "이벤트 종류. 생략하면 message. addEventListener(\"alert\")로 이름별 수신.", ["w7", "w7"], "SSE", 2, []],
["data:", "이벤트 내용 필드", "이벤트 본문. 여러 줄이면 \\n으로 이어 붙여 event.data가 된다.", ["w7"], "SSE", 2, []],
["id:", "이벤트 번호 필드", "이벤트 식별자. 재연결 시 브라우저가 Last-Event-ID 헤더로 돌려보낸다.", ["w7"], "SSE", 2, []],
["retry:", "재연결 대기 필드", "연결이 끊겼을 때 다시 접속하기까지 기다릴 시간(ms)을 서버가 지정.", ["w7"], "SSE", 2, []],
[": (comment)", "주석 줄", "콜론으로 시작하는 무시되는 줄. “: ping”처럼 heartbeat로 써서 유휴 타임아웃을 막는다.", ["w7"], "SSE", 1, []],
["Last-Event-ID", "마지막 이벤트 번호 헤더", "재연결 시 마지막으로 받은 id를 서버에 알려, 그 이후 이벤트부터 이어받게 (Resume) 하는 헤더.", ["w7"], "SSE", 3, [63]],
["Auto Reconnect", "자동 재연결", "EventSource가 끊김을 감지하면 retry 시간 후 스스로 다시 연결하는 기능. SSE의 큰 장점.", ["w7"], "SSE", 2, []],
["StreamingResponse", "FastAPI 스트리밍 응답", "async generator가 yield하는 문자열을 끊지 않고 이어서 보내는 응답. SSE 서버 구현에 쓴다.", ["w7"], "SSE", 2, []],
["Chunked Transfer", "청크 전송 인코딩", "Content-Length 없이 데이터를 조각(chunk)으로 나눠 보내는 HTTP/1.1 방식. 끝나지 않는 응답을 가능하게 한다.", ["w7"], "SSE", 2, []],
["withCredentials", "SSE 쿠키 전송 옵션", "cross-origin SSE에서 쿠키를 보내려면 new EventSource(url, {withCredentials: true}) + 서버 Allow-Credentials.", ["w7"], "SSE", 1, []],
["LLM Streaming", "토큰 스트리밍", "LLM이 생성한 토큰을 SSE 형식(data: {...})으로 하나씩 보내는 방식. 끝은 보통data: [DONE].", ["w7"], "SSE", 3, []],
["fetch + ReadableStream", "fetch 기반 스트림 수신", "POST·Authorization 헤더가 필요할 때 EventSource 대신 쓰는 방법. SSE 형식≠ EventSource API.", ["w7"], "SSE", 3, []],
["Proxy Buffering", "프록시 버퍼링", "Nginx·CDN이 응답을 모았다 한 번에 보내는 동작. SSE 이벤트가 수십 초 뒤 몰려도착하는 원인.", ["w7"], "SSE 운영 이슈", 2, []],
["proxy_buffering off", "Nginx 버퍼링 끄기", "SSE 경로에서 버퍼링을 끄는 Nginx 설정.", ["w7"], "SSE 운영 이슈", 1, []],
["X-Accel-Buffering: no", "응답별 버퍼링 끄기 헤더", "서버가 응답 헤더로 Nginx에게 이 응답만 버퍼링하지 말라고 알리는 방법.", ["w7"], "SSE 운영 이슈", 1, []],
["Connection Limit (6)", "도메인당 동시 연결 제한", "HTTP/1.1에서 브라우저는 도메인당 약 6개 연결만 연다. SSE 탭이 많으면 7번째부터 멈춘다. HTTP/2로 해결.", ["w7"], "SSE 운영 이슈", 2, []],
["HTTP/2 Multiplexing", "다중화", "하나의 TCP 연결에서 여러 요청·스트림을 동시에 처리. SSE 연결 수 제한을 사실상 없앤다.", ["w7"], "SSE 운영 이슈", 2, []],
["Idle Timeout", "유휴 타임아웃", "데이터가 없을 때 LB가 연결을 끊기까지의 시간 (ALB 기본 60초). SSE ·WebSocket은 heartbeat보다 길게.", ["w7", "w9"], "SSE 운영 이슈", 2, []],
["Heartbeat", "생존 신호", "연결이 살아 있음을 알리려고 주기적으로 보내는 작은 메시지 (SSE 주석, WebSocket Ping, MQTT PINGREQ).", ["w7"], "SSE 운영 이슈", 2, []],
["curl -N", "버퍼링 없이 스트림 보기", "curl이 출력을 모으지 않고 받는 즉시 찍게 하는 옵션. SSE를 서버 직접/프록시 경유로 비교할 때 쓴다.", ["w7"], "SSE 운영 이슈", 1, []],
["EventStream 탭", "DevTools SSE 보기", "Network 탭에서 SSE 요청을 클릭하면 id·type·data를 표로 보여 주는 탭.", ["w7"], "SSE 운영 이슈", 1, []],
["ws:// / wss://", "WebSocket URL 스킴", "ws는 평문(80), wss는 TLS 암호화(443). 운영에서는 반드시 wss.", ["w7"], "WebSocket 기본", 3, []],
["HTTP Upgrade", "프로토콜 전환", "HTTP/1.1 요청에 Upgrade: websocket을 실어 연결의 프로토콜을 바꾸자고 합의하는 메커니즘.", ["w7"], "WebSocket 기본", 3, []],
["Opening Handshake", "연결 핸드셰이크", "Upgrade 요청 1번 + 101 응답 1번. 이후 같은 TCP 연결은 HTTP가 아니라WebSocket이다.", ["w7"], "WebSocket 기본", 2, []],
["101 Switching Protocols", "프로토콜 전환 응답", "서버가 Upgrade를 수락했다는 상태 코드. 101이 아니면 핸드셰이크 실패.", ["w7"], "WebSocket 기본", 3, []],
["Upgrade / Connection 헤더", "전환 요청 헤더", "Upgrade: websocket, Connection: Upgrade. 프록시가 이 둘을 전달하지 않으면 WebSocket이 실패한다.", ["w7"], "WebSocket 기본", 1, []],
["Sec-WebSocket-Key", "클라이언트 난수 키", "클라이언트가 만든 16바이트 난수의 Base64 값. 서버가 Accept 계산에 쓴다.", ["w7"], "WebSocket 기본", 2, []],
["Sec-WebSocket-Accept", "서버 증명값", "Base64(SHA-1(Key + 고정 GUID)). 진짜 WebSocket 서버임을 증명하는 값이며, 암호화·인증이 아니다.", ["w7"], "WebSocket 기본", 3, [68]],
["Sec-WebSocket-Version: 13", "프로토콜 버전", "현재 표준(RFC 6455) 버전 번호.", ["w7"], "WebSocket 기본", 1, []],
["Message", "WebSocket 메시지", "애플리케이션이 주고받는 단위. 하나 이상의 Frame으로 전송되며 TCP의 바이트경계 문제를 대신 해결해 준다.", ["w7"], "WebSocket 기본", 2, []],
["onopen / onmessage / onclose / onerror", "브라우저 WebSocket 이벤트", "연결 성립·메시지 수신·종료·오류 시 호출되는 콜백.", ["w7"], "WebSocket 기본", 1, []],
["ws.send()", "메시지 전송", "텍스트(문자열) 또는 바이너리(ArrayBuffer·Blob)를 Frame으로 보낸다.", ["w7"], "WebSocket 기본", 1, []],
["Broadcast", "방송 · 일괄 전송", "한 클라이언트의 메시지를 같은 방(room)의 모든 연결에 보내는 것. 채팅 서버의핵심 동작.", ["w7"], "WebSocket 기본", 2, []],
["Room", "방 · 채널", "메시지를 함께 받는 연결들의 그룹. 서버가 room → 연결 목록으로 관리한다.", ["w7"], "WebSocket 기본", 1, []],
["websocat", "CLI WebSocket 클라이언트", "터미널에서 WebSocket에 접속해 메시지를 주고받는 도구. 브라우저 없이 서버를확인할 때 쓴다.", ["w7"], "WebSocket 기본", 1, []],
["Frame", "프레임", "WebSocket의 전송 단위. 2~14바이트 헤더 + Payload.", ["w7"], "WebSocket Frame", 2, []],
["FIN bit", "마지막 조각 표시", "1이면 메시지의 마지막 Frame, 0이면 Continuation Frame이 이어진다.", ["w7"], "WebSocket Frame", 2, []],
["Opcode", "연산 코드", "Frame 종류를 나타내는 4비트. 0x1 Text, 0x2 Binary, 0x8 Close, 0x9 Ping, 0xA Pong, 0x0 Continuation.", ["w7"], "WebSocket Frame", 2, []],
["Text / Binary Frame", "텍스트 · 바이너리 프레임", "UTF-8 문자열(JSON 채팅) / 임의 바이트(이미지·Protobuf·센서 데이터).", ["w7"], "WebSocket Frame", 1, [62]],
["Continuation Frame", "이어지는 프레임", "큰 메시지를 여러 Frame으로 나눌 때 두 번째 이후 조각 (Fragmentation).", ["w7"], "WebSocket Frame", 1, []],
["MASK bit / Masking Key", "마스킹", "클라이언트→서버 Frame은 32비트 키로 반드시 마스킹. 중간 프록시 캐시 오염공격 방지용이며 암호화가 아니다.", ["w7"], "WebSocket Frame", 2, []],
["Payload Length", "페이로드 길이", "0~125는 7비트에 그대로, 126이면 다음 16비트, 127이면 다음 64비트가 길이.", ["w7"], "WebSocket Frame", 1, []],
["Control Frame", "제어 프레임", "Close·Ping·Pong처럼 연결 관리를 위한 Frame. Payload 125바이트 이하.", ["w7"], "WebSocket Frame", 1, []],
["Ping / Pong", "생존 확인", "한쪽이 Ping을 보내면 상대가 Pong으로 답한다. 브라우저는 Pong을 자동 응답한다.", ["w7"], "WebSocket Frame", 2, []],
["Close Frame", "종료 프레임", "Close code와 이유를 담아 정상 종료를 알리는 Frame (Closing Handshake).", ["w7"], "WebSocket Frame", 2, [70]],
["Close Code", "종료 코드", "1000 정상, 1001 떠남, 1006 비정상(Close Frame 없이 끊김), 1008 정책 위반, 1009 메시지 너무 큼, 1011 서버 오류.", ["w7"], "WebSocket 운영 · 보안 · 확장", 2, [70]],
["1006 Abnormal Closure", "비정상 종료", "Close Frame 없이 연결이 끊겼을 때 브라우저가 보고하는 코드. 핸드셰이크 실패·프록시 타임아웃·네트워크 단절이 원인.", ["w7"], "WebSocket 운영 · 보안 · 확장", 3, []],
["Exponential Backoff", "지수 백오프", "재연결 간격을 1·2·4·8…초로 늘려 가는 방식 (상한 예: 30초).", ["w7"], "WebSocket 운영 · 보안 · 확장", 3, []],
["Jitter", "무작위 흔들림", "재연결 간격에 무작위 값을 곱해 클라이언트들이 같은 순간 몰리지 않게 하는 기법.", ["w7"], "WebSocket 운영 · 보안 · 확장", 3, [72]],
["Thundering Herd", "몰려드는 재접속", "서버 재시작 직후 수많은 클라이언트가 동시에 재연결해 서버가 다시 쓰러지는 현상.", ["w7"], "WebSocket 운영 · 보안 · 확장", 3, [72]],
["Graceful Shutdown", "정상 종료 절차", "배포 시 1001로 연결을 정리하고 새 연결을 받지 않은 채 종료하는 것.", ["w7"], "WebSocket 운영 · 보안 · 확장", 2, []],
["CSWSH", "Cross-Site WebSocket Hijacking", "Origin을 검사하지 않는 WebSocket 서버에 공격자 페이지가 사용자의 쿠키로연결해 대화를 탈취하는 공격.", ["w7"], "WebSocket 운영 · 보안 · 확장", 2, []],
["Origin 검사", "Origin Check", "WebSocket에는 SOP·CORS가 적용되지 않으므로 서버가 핸드셰이크의 Origin헤더를 허용 목록과 직접 비교해야 한다.", ["w7"], "WebSocket 운영 · 보안 · 확장", 3, []],
["Token in Query String", "URL 토큰 전달", "?token=… 방식. 서버·프록시 로그에 남아 유출 위험. 쿠키나 연결 직후 첫 메시지로 인증하는 편이 낫다.", ["w7"], "WebSocket 운영 · 보안 · 확장", 2, []],
["Rate Limiting", "속도 제한", "연결 수·초당 메시지 수를 제한해 스팸·DoS를 막는 것.", ["w7"], "WebSocket 운영 · 보안 · 확장", 1, []],
["Stateful Connection", "상태를 가진 연결", "WebSocket 연결은 특정 서버에 묶인 상태다. 서버를 늘리면 연결 정보가 나뉜다.", ["w7"], "WebSocket 운영 · 보안 · 확장", 2, []],
["Pub/Sub Backplane", "메시지 공유 백플레인", "모든 서버가 Redis·MQTT·Kafka의 같은 채널을 구독해 어느 서버로 들어온 메시지든 전체에 퍼뜨리는 구조.", ["w7"], "WebSocket 운영 · 보안 · 확장", 3, []],
["Redis Pub/Sub", "레디스 발행-구독", "Redis의 채널 기반 메시지 배포 기능. WebSocket Scale-out의 흔한 백플레인.", ["w7"], "WebSocket 운영 · 보안 · 확장", 2, []],
["proxy_read_timeout", "Nginx 읽기 타임아웃", "뒷단 서버의 응답이 이 시간(기본 60초) 없으면 연결을 끊는다. WebSocket 경로는 길게 + heartbeat.", ["w7"], "WebSocket 운영 · 보안 · 확장", 1, []],
["ulimit -n", "파일 디스크립터 한도", "프로세스가 열 수 있는 소켓·파일 수. 연결 수만 개를 유지하는 서버는 이 값을 확인해야 한다.", ["w7"], "WebSocket 운영 · 보안 · 확장", 1, []],
["WebRTC", "Web Real-Time Communication", "브라우저 간 음성·영상·데이터를 P2P로 직접 주고받는 표준 기술. UDP 기반.", ["w7"], "WebRTC", 3, [74, 75]],
["P2P", "Peer-to-Peer — 직접 연결", "서버를 거치지 않고 두 단말이 직접 데이터를 주고받는 구조.", ["w7"], "WebRTC", 2, [76]],
["Peer", "피어", "WebRTC 연결의 한쪽 끝(브라우저·앱).", ["w7"], "WebRTC", 1, []],
["RTCPeerConnection", "WebRTC 연결 객체", "브라우저에서 P2P 연결을 만들고 ICE 서버(STUN·TURN)를 설정하는 API.", ["w7"], "WebRTC", 1, []],
["Signaling", "시그널링", "연결 전 SDP와 ICE 후보를 교환하는 과정. 방법은 표준에 정해져 있지 않아 보통WebSocket으로 구현한다.", ["w7"], "WebRTC", 3, [75]],
["SDP", "Session Description Protocol — 세션 기술 프로토콜", "코덱·미디어 종류·암호화 지문 등 “어떻게 통화할지”를 적은 텍스트 설명서.", ["w7"], "WebRTC", 2, []],
["Offer / Answer", "제안 / 응답", "한쪽이 SDP Offer를 보내고 상대가 SDP Answer로 수락하는 협상 모델.", ["w7"], "WebRTC", 2, []],
["MediaStream", "미디어 스트림", "카메라·마이크에서 얻은 음성·영상 트랙의 묶음 (getUserMedia).", ["w7"], "WebRTC", 1, []],
["DataChannel", "데이터 채널", "WebRTC로 임의 데이터(채팅·파일·게임 상태)를 P2P 전송하는 채널. SCTP 기반.", ["w7"], "WebRTC", 2, []],
["SRTP", "Secure Real-time Transport Protocol", "음성·영상을 암호화해 UDP로 전송하는 프로토콜.", ["w7"], "WebRTC", 2, []],
["DTLS", "Datagram Transport Layer Security", "UDP용 TLS. WebRTC에서 암호화 키 교환에 쓰이며 모든 미디어는 필수 암호화된다.", ["w7"], "WebRTC", 2, []],
["SCTP", "Stream Control Transmission Protocol", "DataChannel이 DTLS 위에서 쓰는 전송 프로토콜. 신뢰성·순서 보장 여부를 선택할 수 있다.", ["w7"], "WebRTC", 1, []],
["HOL Blocking", "Head-of-Line Blocking", "앞 패킷 재전송을 기다리느라 뒤 데이터가 막히는 현상 (TCP). 실시간 미디어가UDP를 쓰는 이유.", ["w7"], "WebRTC", 2, []],
["webrtc-internals", "chrome://webrtc-internals", "Chrome의 WebRTC 디버깅 페이지. ICE 후보·선택된 경로·비트레이트를 보여준다.", ["w7"], "WebRTC", 1, []],
["NAT Traversal", "NAT 통과", "NAT 뒤의 두 단말이 서로 직접 연결할 경로를 찾는 기술의 총칭.", ["w7"], "NAT 통과", 2, []],
["ICE", "Interactive Connectivity Establishment", "가능한 주소 후보를 모아 후보 쌍을 시험하고, 성공한 경로를 고르는 절차.", ["w7"], "NAT 통과", 3, []],
["ICE Candidate", "ICE 후보", "나에게 도달할 수 있는 주소 후보 (IP:포트 + 유형).", ["w7"], "NAT 통과", 2, []],
["host candidate", "호스트 후보", "단말의 사설 IP. 같은 LAN이면 바로 성공한다.", ["w7"], "NAT 통과", 1, []],
["srflx candidate", "Server Reflexive — 반사 후보", "STUN이 알려준 공유기 바깥(공인) IP:포트.", ["w7"], "NAT 통과", 1, []],
["relay candidate", "중계 후보", "TURN 서버의 주소. 직접 연결이 모두 실패할 때의 최후 수단.", ["w7"], "NAT 통과", 1, []],
["STUN", "Session Traversal Utilities for NAT", "“밖에서 보면 너의 주소는 이것”을 알려 주는 가벼운 서버. 공인 IP:포트 확인용.", ["w7"], "NAT 통과", 3, [76]],
["TURN", "Traversal Using Relays around NAT", "P2P가 불가능할 때 모든 미디어를 대신 중계하는 서버. 확실하지만 대역폭 비용이크다.", ["w7"], "NAT 통과", 3, []],
["Hole Punching", "홀 펀칭", "양쪽이 동시에 상대 바깥 주소로 패킷을 보내 NAT 테이블에 통로를 만드는 기법.", ["w7"], "NAT 통과", 2, []],
["Symmetric NAT", "대칭형 NAT", "목적지마다 다른 바깥 포트를 쓰는 NAT. Hole punching이 실패해 TURN이 필요해진다.", ["w7"], "NAT 통과", 2, []],
["Trickle ICE", "점진적 후보 전송", "후보를 다 모을 때까지 기다리지 않고 찾는 즉시 상대에게 보내 연결 시간을 줄이는 방식.", ["w7"], "NAT 통과", 1, []],
["Mesh", "메시 (Full P2P)", "모든 참가자가 서로 직접 연결. N명이면 각자 N−1개 업로드, 총 N(N−1)/2 연결. 2~4명에 적합.", ["w7"], "다자간 구조", 2, []],
["SFU", "Selective Forwarding Unit — 선택적 전달 장치", "서버가 받은 스트림을 디코딩 없이 골라 전달. 업로드 1개, 다운로드 N−1개. 대부분 화상회의의 표준.", ["w7"], "다자간 구조", 2, []],
["MCU", "Multipoint Control Unit — 다지점 제어 장치", "서버가 영상들을 합성해 하나로 보내는 구조. 클라이언트는 편하지만 서버 CPU부담이 크다.", ["w7", "w7"], "다자간 구조", 1, []],
["Simulcast", "다중 해상도 동시 송출", "같은 영상을 여러 해상도로 동시에 올려 SFU가 수신자 상태에 맞는 것을 고르게하는 기법.", ["w7"], "다자간 구조", 1, []],
["Upload Bandwidth", "업로드 대역폭", "Mesh에서 병목. 720p 1.5 Mbps × 4명 = 6 Mbps처럼 참가자 수에 비례해 증가.", ["w7"], "다자간 구조", 1, []],
["IoT", "Internet of Things — 사물인터넷", "센서·액추에이터 등 사물이 네트워크로 데이터를 주고받는 시스템.", ["w7"], "IoT 네트워크 기초", 2, [77]],
["ESP32", "Wi-Fi·BLE 내장 MCU", "Wi-Fi와 BLE를 함께 지원하는 저가 MCU. 실습 센서 기기의 대표 예. SRAM 약520 KB.", ["w7"], "IoT 네트워크 기초", 1, []],
["Deep Sleep", "딥슬립 · 절전 모드", "필요할 때만 깨어나 측정·전송하고 나머지는 잠드는 모드. 배터리 수명의 핵심.", ["w7"], "IoT 네트워크 기초", 1, []],
["Telemetry", "원격 측정 데이터", "기기가 주기적으로 보내는 측정값 스트림 (온도·습도·위치).", ["w7"], "IoT 네트워크 기초", 2, []],
["Gateway", "게이트웨이", "BLE·Zigbee·LoRa처럼 IP가 없는 기기의 데이터를 받아 MQTT·HTTP로 서버에전달하는 중간 장치 (스마트폰·허브).", ["w7"], "IoT 네트워크 기초", 2, []],
["Wi-Fi", "IEEE 802.11 무선 LAN", "수십~수백 Mbps, 전력 소모 큼. 카메라·가전·ESP32에 쓴다.", ["w7"], "IoT 네트워크 기초", 1, []],
["Zigbee / Thread", "저전력 메시 네트워크", "250 kbps, 기기끼리 메시로 중계. 스마트홈 조명·센서에 쓴다.", ["w7"], "IoT 네트워크 기초", 1, []],
["LoRaWAN", "Long Range Wide Area Network", "수 km~15 km, 수 kbps 이하의 초저전력 장거리 통신. 농업·계량기에 쓴다.", ["w7"], "IoT 네트워크 기초", 2, []],
["NB-IoT / LTE-M", "Narrowband IoT / LTE for Machines", "이동통신망 기반 저전력 IoT 통신. 스마트 미터·물류 추적에 쓴다.", ["w7"], "IoT 네트워크 기초", 2, []],
["6LoWPAN", "IPv6 over Low-Power Wireless PAN", "저전력 무선망에서 IPv6 패킷을 압축해 쓰는 기술.", ["w7"], "IoT 네트워크 기초", 1, []],
["Link vs Application Protocol", "링크 기술 vs 메시지 프로토콜", "BLE·Wi-Fi·LoRa는 무선 링크, MQTT·CoAP·HTTP는 메시지 프로토콜. “BLE냐MQTT냐”는 다른 층의 질문이다.", ["w7"], "IoT 네트워크 기초", 1, []],
["CoAP", "Constrained Application Protocol", "UDP 기반의 경량 REST 프로토콜. 헤더 4 B, Observe로 서버 Push도 가능. 초저전력 기기용.", ["w7"], "BLE", 1, []],
["BLE", "Bluetooth Low Energy — 저전력 블루투스", "근거리(~수십 m)·저전력 무선 기술. 대부분 잠들어 있다가 짧은 간격에만 깨어 통신한다.", ["w7"], "BLE", 3, [77]],
["Advertising", "광고 · 존재 알림", "Peripheral이 “나 여기 있어”를 주기적으로 방송하는 패킷. Central이 스캔해 발견한다.", ["w7"], "BLE", 1, []],
["Peripheral", "주변 장치", "데이터를 제공하는 쪽 (심박 센서·밴드).", ["w7"], "BLE", 2, []],
["Central", "중심 장치", "Peripheral을 찾아 연결하는 쪽 (스마트폰 앱).", ["w7"], "BLE", 2, []],
["GATT", "Generic Attribute Profile", "BLE 연결 후 데이터를 Service·Characteristic 계층으로 정리해 주고받는 규칙.", ["w7"], "BLE", 2, []],
["Service", "서비스", "관련 기능의 묶음 (예: 0x180D Heart Rate, 0x180F Battery).", ["w7"], "BLE", 1, []],
["Characteristic", "특성 · 값", "실제 데이터 하나 (예: 0x2A37 Heart Rate Measurement). Read·Write·Notify속성을 가진다.", ["w7"], "BLE", 1, []],
["UUID", "Universally Unique Identifier", "Service·Characteristic의 식별 번호. 표준은 16비트 축약형(0x180D)을 쓴다.", ["w7"], "BLE", 1, []],
["Notify", "알림 (BLE의 Push)", "값이 바뀌면 Peripheral이 먼저 Central에 보내는 동작.", ["w7"], "BLE", 2, []],
["Connection Interval", "연결 간격", "연결된 두 기기가 깨어나 통신하는 주기. 길수록 전력이 적게 들고 지연은 늘어난다.", ["w7"], "BLE", 1, []],
["Web Bluetooth", "브라우저 BLE API", "브라우저 JavaScript에서 BLE 기기에 연결하는 API (Chrome 계열 지원).", ["w7"], "BLE", 1, []],
["MQTT", "Message Queuing Telemetry Transport", "TCP 위의 경량 Publish/Subscribe 메시징 프로토콜. 고정 헤더 최소 2 B. 1999년 위성 원격 감시용으로 시작.", ["w7"], "MQTT 기본", 3, [77, 78, 79, 80, 81, 82, 85]],
["Publish/Subscribe", "발행-구독 (Pub/Sub)", "발행자는 Topic에 보내고 구독자는 Topic을 듣는다. 서로를 직접 알지 못한다.", ["w7"], "MQTT 기본", 3, []],
["Broker", "브로커 · 중개 서버", "모든 클라이언트가 연결하는 중심 서버. 메시지를 받아 Topic을 구독한 클라이언트에게 배달한다 (Mosquitto·EMQX·AWS IoT Core).", ["w7"], "MQTT 기본", 3, []],
["Publisher", "발행자", "Topic으로 메시지를 보내는 클라이언트 (센서).", ["w7"], "MQTT 기본", 2, [78]],
["Subscriber", "구독자", "Topic을 구독해 메시지를 받는 클라이언트 (대시보드·DB 저장기·알람).", ["w7"], "MQTT 기본", 2, [78]],
["Topic", "토픽 · 메시지 주소", "inu/bldg7/room301/temp처럼 /로 계층화된 UTF-8 문자열. 대소문자를 구분한다.", ["w7"], "MQTT 기본", 3, []],
["Payload", "페이로드", "메시지 본문. 형식은 자유 (JSON·문자열·바이너리).", ["w7"], "MQTT 기본", 2, []],
["Client ID", "클라이언트 식별자", "브로커 안에서 유일해야 하는 ID. 같은 ID로 두 번 접속하면 먼저 접속한 쪽이 끊긴다.", ["w7"], "MQTT 기본", 3, [85]],
["Decoupling", "분리", "공간 분리(서로 IP를 모름)·시간 분리(구독자가 꺼져 있어도 됨)·동기 분리(발행후 기다리지 않음).", ["w7"], "MQTT 기본", 2, []],
["Fan-out", "팬아웃 · 다중 배포", "한 번 발행한 메시지가 여러 구독자에게 동시에 퍼지는 것.", ["w7"], "MQTT 기본", 2, []],
["Port 1883 / 8883", "MQTT 포트", "1883은 평문 TCP, 8883은 TLS. 브라우저용 MQTT over WebSocket은 보통8083/8084 또는 443.", ["w7"], "MQTT 기본", 2, []],
["Mosquitto", "Eclipse Mosquitto", "가장 널리 쓰이는 오픈소스 MQTT 브로커. mosquitto_pub·mosquitto_sub CLI를 제공한다.", ["w7"], "MQTT 기본", 1, []],
["MQTT over WebSocket", "브라우저용 MQTT", "브라우저가 TCP 1883에 직접 접속할 수 없어 MQTT 패킷을 WebSocket에 감싸보내는 방식 (MQTT.js).", ["w7"], "MQTT 기본", 2, []],
["paho-mqtt", "Eclipse Paho Python 클라이언트", "Python MQTT 클라이언트 라이브러리. 2.x부터 CallbackAPIVersion 지정이 필요하다.", ["w7"], "MQTT 기본", 1, []],
["PubSubClient", "Arduino MQTT 라이브러리", "ESP32·Arduino에서 MQTT 발행·구독에 쓰는 경량 라이브러리.", ["w7"], "MQTT 기본", 1, []],
["Topic Level", "토픽 단계", "/로 나뉜 각 부분. inu/bldg7/room301/temp는 4단계.", ["w7"], "Topic과 Wildcard", 2, []],
["Topic Tree", "토픽 트리", "회사/건물/방/측정값처럼 큰 범위에서 작은 범위로 내려가는 계층 설계.", ["w7"], "Topic과 Wildcard", 2, []],
["+ (Single-level Wildcard)", "한 단계 와일드카드", "정확히 한 단계를 대신한다. inu/+/temp는 inu/301/temp는 받지만inu/bldg7/301/temp는 받지 않는다.", ["w7"], "Topic과 Wildcard", 3, []],
["# (Multi-level Wildcard)", "다단계 와일드카드", "그 아래 모든 단계와 부모 자신까지 포함. 반드시 맨 끝에만 쓴다 (inu/#).", ["w7"], "Topic과 Wildcard", 3, []],
["Wildcard는 구독 전용", "Subscribe-only", "와일드카드는 SUBSCRIBE에서만 쓸 수 있고 PUBLISH 토픽에는 쓸 수 없다.", ["w7"], "Topic과 Wildcard", 3, []],
["$SYS", "브로커 상태 토픽", "$SYS/broker/clients/connected처럼 브로커가 접속 수·메시지 수를 발행하는토픽. # 구독에 포함되지 않는다.", ["w7"], "Topic과 Wildcard", 2, []],
["Leading Slash", "선행 슬래시", "/inu/…처럼 맨 앞에 /를 쓰면 빈 단계가 생긴다. 피해야 할 설계.", ["w7"], "Topic과 Wildcard", 1, []],
["Topic as Contract", "토픽 = 계약", "토픽 이름은 REST URI처럼 배포 후 바꾸기 어려운 약속이다. URI는 자원을 식별하고, 토픽은 데이터 흐름을 분류한다.", ["w7"], "Topic과 Wildcard", 1, []],
["CONNECT / CONNACK", "접속 요청 / 접속 응답", "Client ID·Keep Alive·Will·인증 정보를 보내고, 브로커가 결과 코드로 답한다 (0= 성공).", ["w7"], "MQTT 패킷과 세션", 2, [54]],
["SUBSCRIBE / SUBACK", "구독 요청 / 응답", "토픽 필터와 원하는 QoS를 보내고, 브로커가 허용된(granted) QoS로 답한다.", ["w7"], "MQTT 패킷과 세션", 2, []],
["UNSUBSCRIBE", "구독 해제", "더 이상 해당 토픽을 받지 않겠다는 요청.", ["w7"], "MQTT 패킷과 세션", 1, []],
["PUBLISH", "발행 패킷", "토픽 + payload를 담은 패킷. QoS 0이면 헤더 2 B + 토픽 + payload만으로 끝난다.", ["w7"], "MQTT 패킷과 세션", 2, [81]],
["PINGREQ / PINGRESP", "생존 확인 패킷", "Keep Alive 동안 보낼 데이터가 없을 때 주고받는 2바이트 패킷.", ["w7"], "MQTT 패킷과 세션", 1, []],
["DISCONNECT", "정상 종료 패킷", "정상 종료 알림. 이 경우 Last Will은 발행되지 않는다.", ["w7"], "MQTT 패킷과 세션", 2, [84]],
["Keep Alive", "생존 유지 시간", "클라이언트가 이 시간 안에 최소 한 번 패킷을 보내기로 한 약속. 1.5배 동안 아무것도 없으면 브로커가 연결을 끊고 LWT를 발행한다.", ["w7"], "MQTT 패킷과 세션", 3, [84]],
["Fixed Header", "고정 헤더", "모든 MQTT 패킷 앞의 최소 2바이트 (패킷 종류·플래그·남은 길이).", ["w7"], "MQTT 패킷과 세션", 1, []],
["on_connect / on_message", "paho 콜백", "접속 성공 시 / 메시지 수신 시 호출되는 함수. 구독은 on_connect 안에서 해야재연결 때 자동 재구독된다.", ["w7"], "MQTT 패킷과 세션", 1, []],
["loop_start / loop_forever", "paho 네트워크 루프", "네트워크 처리를 별도 스레드로 돌리거나(loop_start) 현재 스레드를 막고 돌린다 (loop_forever).", ["w7"], "MQTT 패킷과 세션", 1, []],
["call_soon_threadsafe", "스레드 안전 이벤트 루프 호출", "다른 스레드(paho 콜백)에서 asyncio 이벤트 루프로 작업을 안전하게 넘기는 함수. MQTT→SSE 브리지의 핵심.", ["w7"], "MQTT 패킷과 세션", 1, []],
["QoS", "Quality of Service — 전달 보장 수준", "MQTT 메시지가 얼마나 확실히 전달되는지의 단계 (0·1·2). 높을수록 왕복이 늘어난다.", ["w7"], "QoS", 3, [82]],
["QoS 0 — At most once", "최대 1번", "PUBLISH만 보내고 확인 없음. 유실 가능, 가장 가볍다. 주기적 센서 값에 적합.", ["w7"], "QoS", 3, []],
["QoS 1 — At least once", "최소 1번", "PUBLISH → PUBACK. ACK가 없으면 재전송하므로 중복 수신이 가능하다. 경보·명령에 적합.", ["w7"], "QoS", 3, []],
["QoS 2 — Exactly once", "정확히 1번", "PUBLISH → PUBREC → PUBREL → PUBCOMP 4단계. 중복·유실 모두 없지만 가장 느리다. 과금·재고 차감에 적합.", ["w7"], "QoS", 3, []],
["PUBACK", "QoS 1 수신 확인", "QoS 1 PUBLISH를 받았다는 4바이트 응답.", ["w7"], "QoS", 2, []],
["PUBREC / PUBREL / PUBCOMP", "QoS 2 확인 3단계", "받음(Received) → 해제(Release) → 완료(Complete). Packet ID로 같은 메시지를 추적한다.", ["w7"], "QoS", 1, []],
["Packet Identifier", "패킷 ID", "QoS 1·2 메시지를 확인 응답과 짝짓는 번호.", ["w7"], "QoS", 1, []],
["DUP flag", "중복 표시", "재전송된 PUBLISH임을 나타내는 플래그.", ["w7"], "QoS", 1, []],
["Effective QoS = min(Pub, Sub)", "실제 적용 QoS", "QoS는 구간별(Pub↔Broker, Broker↔Sub)로 적용된다. 발행 QoS 2라도 구독QoS 0이면 그 구간은 0.", ["w7"], "QoS", 2, []],
["Idempotent Consumer", "멱등 소비자 · 중복 제거", "메시지 고유 id를 기억해 이미 처리한 것은 무시하는 수신 측 설계. QoS 1 + 중복제거가 QoS 2보다 실용적인 경우가 많다.", ["w7"], "QoS", 2, []],
["Retained Message", "보존 메시지", "토픽별 마지막 메시지 1개를 브로커가 저장해 새 구독자에게 즉시 전달. 빈payload를 retain으로 발행하면 삭제된다.", ["w7"], "상태 유지 기능과 보안", 3, [83]],
["LWT", "Last Will and Testament — 유언 메시지", "CONNECT 때 등록해 두면, 클라이언트가 비정상으로 사라질 때 브로커가 대신 발행하는 메시지 (예: status = offline).", ["w7"], "상태 유지 기능과 보안", 3, [84]],
["Persistent Session", "지속 세션", "cleanStart=false(+ 만료 시간)로 접속하면 브로커가 구독 정보와 못 받은 QoS 1·2 메시지를 보관한다.", ["w7"], "상태 유지 기능과 보안", 2, []],
["Clean Start / Clean Session", "새 세션 시작 플래그", "true면 이전 세션을 버리고 새로 시작 (MQTT 5: Clean Start, 3.1.1: Clean Session).", ["w7"], "상태 유지 기능과 보안", 2, []],
["Online/Offline 패턴", "기기 상태 표시", "Will = offline(retain) 등록 → 접속 직후 online(retain) 발행. 대시보드는 언제켜도 현재 상태를 안다.", ["w7"], "상태 유지 기능과 보안", 1, []],
["Timestamp in Payload", "측정 시각 포함", "Retained 값이 오래된 값일 수 있으므로 payload에 측정 시각(ts)을 넣어 구분한다.", ["w7"], "상태 유지 기능과 보안", 1, []],
["TLS (MQTT)", "MQTTS · 8883", "MQTT 통신 암호화. 평문 1883은 같은 네트워크의 누구나 payload와 비밀번호를 볼 수 있다.", ["w7"], "상태 유지 기능과 보안", 2, [30, 31, 32, 69]],
["mTLS / X.509", "상호 TLS · 클라이언트 인증서", "기기마다 인증서를 발급해 서버와 클라이언트가 서로 인증하는 방식. 대형 IoT 플랫폼의 표준.", ["w7"], "상태 유지 기능과 보안", 1, []],
["ACL", "Access Control List — 접근 제어 목록", "누가 어떤 토픽에 읽기/쓰기를 할 수 있는지 정한 규칙 (pattern write devices/%c/#).", ["w7"], "상태 유지 기능과 보안", 2, [98]],
["allow_anonymous", "익명 접속 허용 설정", "Mosquitto에서 false로 두어야 인증 없는 접속을 막는다. 운영 환경에서 true 금지.", ["w7"], "상태 유지 기능과 보안", 2, []],
["Public Test Broker", "공개 테스트 브로커", "test.mosquitto.org 등. 누구나 # 구독이 가능하므로 실제 데이터를 보내면 안 된다.", ["w7"], "상태 유지 기능과 보안", 1, []],
["Bridge (MQTT → SSE/WS)", "프로토콜 번역 계층", "Backend가 MQTT를 구독해 브라우저에는 SSE·WebSocket으로 전달하는 구조. 브라우저에 브로커 계정을 줄 필요가 없다.", ["w7"], "아키텍처 · 선택 · 진단", 2, []],
["Push Gateway", "푸시 게이트웨이", "브라우저와의 SSE·WebSocket 연결을 전담하는 서버 계층.", ["w7"], "아키텍처 · 선택 · 진단", 1, []],
["Time-series DB", "시계열 데이터베이스", "시간 순 측정값 저장에 최적화된 DB (InfluxDB·TimescaleDB). 센서 이력 저장에쓴다.", ["w7"], "아키텍처 · 선택 · 진단", 1, []],
["Message Overhead", "메시지당 오버헤드", "실제 데이터 외에 붙는 바이트. HTTP 헤더 수백 B~1 KB, SSE 수십 B, WebSocket 2~14 B, MQTT 2 B~.", ["w7"], "아키텍처 · 선택 · 진단", 1, []],
["Protocol Decision Tree", "프로토콜 선택 순서", "제약 기기? → MQTT / 미디어·P2P? → WebRTC / 양방향? → WebSocket / 단방향 스트림? → SSE / 드문 변화? → Polling.", ["w7"], "아키텍처 · 선택 · 진단", 1, []],
["Failure Scenario", "실패 시나리오", "끊김·서버 증설·중복·보안 위반 시 시스템이 어떻게 동작하는지 미리 적어 두는설계 산출물.", ["w7"], "아키텍처 · 선택 · 진단", 1, []],
["mosquitto_sub -v", "토픽 포함 구독 출력", "-v로 메시지가 어떤 토픽으로 왔는지 함께 출력. -t '#'로 모든 메시지를 엿본다 (디버깅 전용).", ["w7"], "아키텍처 · 선택 · 진단", 1, []],
["mosquitto_pub -r", "보존 메시지 발행", "-r 옵션으로 Retained 메시지를 발행한다.", ["w7"], "아키텍처 · 선택 · 진단", 1, []],
["MQTT Explorer", "MQTT GUI 클라이언트", "토픽 트리와 메시지를 시각적으로 보여 주는 디버깅 도구.", ["w7"], "아키텍처 · 선택 · 진단", 1, []],
["WS Messages 탭", "DevTools WebSocket 보기", "Network → WS 필터 → Messages 탭에서 ↑ 보낸 Frame / ↓ 받은 Frame을확인한다.", ["w7"], "아키텍처 · 선택 · 진단", 1, []],
["Wireshark 필터", "websocket · mqtt · stun", "패킷 단위로 Frame·MQTT 패킷·STUN 요청을 확인하는 표시 필터.", ["w7"], "아키텍처 · 선택 · 진단", 1, []],
["On-premises", "온프레미스 · 직접 구축", "자체 건물 · 서버실에 장비를 사서 설치하고 운영하는 방식. 라우터 · 방화벽 · 스위치가 물리 장비다.", ["w9"], "클라우드 네트워크 기초", 2, []],
["Cloud", "클라우드", "클라우드 사업자의 인프라를 API · 콘솔로 빌려 쓰는 방식. 네트워크 장비가 “설정항목”이 된다.", ["w9"], "클라우드 네트워크 기초", 2, []],
["CAPEX / OPEX", "출", "장비를 미리 사는 비용(CAPEX)과 쓴 만큼 내는 비용(OPEX). 클라우드는 OPEX", ["w9"], "클라우드 네트워크 기초", 2, []],
["Shared Responsibility Model", "공동 책임 모델", "물리 인프라 보안은 클라우드사, 네트워크 설정 · 접근 권한 · 데이터는 사용자 책임이라는 원칙.", ["w9"], "클라우드 네트워크 기초", 2, []],
["Virtualization", "가상화", "물리 서버 · 네트워크 위에 여러 고객의 논리 자원을 분리해 만드는 기술. VPC 격리의 기반.", ["w9"], "클라우드 네트워크 기초", 1, []],
["Encapsulation (Overlay)", "캡슐화 · 오버레이 네트워크", "고객 패킷을 클라우드 내부 패킷에 감싸 전달해 같은 물리망에서도 고객끼리 섞이지 않게 하는 방식.", ["w9"], "클라우드 네트워크 기초", 1, []],
["Managed Service", "관리형 서비스", "NAT GW · ALB · RDS처럼 클라우드사가 가용성 · 패치를 책임지는 서비스. 장비대신 설정만 관리한다.", ["w9"], "클라우드 네트워크 기초", 2, []],
["AWS · Azure · GCP", "3대 퍼블릭 클라우드", "Amazon Web Services · Microsoft Azure · Google Cloud Platform. 용어는달라도 VPC · 서브넷 · 방화벽 개념은 대응된다.", ["w9"], "클라우드 네트워크 기초", 1, [87, 99]],
["Region", "리전", "지리적으로 떨어진 클라우드 거점 (예: ap-northeast-2 서울). VPC는 리전 단위로 만든다.", ["w9"], "리전 · 가용 영역 · 장애 영역", 3, []],
["Availability Zone (AZ)", "가용 영역", "리전 안에서 전력 · 냉각 · 네트워크가 독립된 데이터센터 묶음. 서브넷은 AZ 하나에 속한다.", ["w9"], "리전 · 가용 영역 · 장애 영역", 3, [88]],
["AZ ID", "가용 영역 ID", "apne2-az1처럼 계정과 무관하게 실제 물리 AZ를 가리키는 식별자. ‘2a’ 이름은계정마다 다를 수 있다.", ["w9"], "리전 · 가용 영역 · 장애 영역", 1, []],
["Global / Regional / Zonal", "서비스 범위", "IAM · Route 53(전역), VPC · S3(리전), Subnet · EC2 · NAT GW(AZ). 범위를알아야 장애 영향 범위를 안다.", ["w9"], "리전 · 가용 영역 · 장애 영역", 2, []],
["Failure Domain", "장애 영역", "하나의 원인으로 함께 고장 나는 범위 (프로세스 < 인스턴스 < AZ < 리전).", ["w9"], "리전 · 가용 영역 · 장애 영역", 2, []],
["Blast Radius", "폭발 반경 · 영향 범위", "장애 하나가 영향을 미치는 범위. 설계는 이것을 작게 만드는 방향으로 한다.", ["w9"], "리전 · 가용 영역 · 장애 영역", 2, []],
["Multi-AZ", "다중 가용 영역", "같은 계층을 둘 이상의 AZ에 대칭 배치해 AZ 하나가 사라져도 서비스를 유지하는설계.", ["w9"], "리전 · 가용 영역 · 장애 영역", 2, []],
["Multi-Region", "다중 리전", "리전 전체 장애 · 재해에 대비해 다른 리전에도 복제하는 설계. 비용 · 복잡도가 크다.", ["w9"], "리전 · 가용 영역 · 장애 영역", 1, []],
["Data Residency", "데이터 국외 이전 · 소재지 규정", "개인정보 등을 특정 국가 안에 두어야 하는 법적 요구. 리전 선택 기준 중 하나.", ["w9"], "리전 · 가용 영역 · 장애 영역", 1, []],
["VPC", "Virtual Private Cloud — 가상 사설 클라우드", "클라우드 안에 만드는 논리적으로 격리된 나만의 IP 네트워크. CIDR · 서브넷 · 경로 · 출입구 · 방화벽을 직접 설계한다.", ["w9"], "VPC와 CIDR", 3, [87, 100]],
["Default VPC", "기본 VPC", "계정마다 자동 생성된 172.31.0.0/16 VPC. 모든 서브넷이 Public이라 운영에는쓰지 않는다.", ["w9"], "VPC와 CIDR", 2, []],
["CIDR", "Classless Inter-Domain Routing", "10.0.0.0/16처럼 IP 대역을 “주소/접두사 길이”로 표기하는 방식 (Week 2).", ["w9"], "VPC와 CIDR", 3, []],
["Prefix Length", "접두사 길이 (/n)", "네트워크로 고정된 앞쪽 비트 수. 주소 수 = 2^(32 − n). /16 = 65,536 · /24 =256 · /28 = 16.", ["w9"], "VPC와 CIDR", 2, []],
["RFC 1918 Private Range", "사설 IP 대역", "10.0.0.0/8 · 172.16.0.0/12 · 192.168.0.0/16. 인터넷에서 라우팅되지 않아VPC 내부에 쓴다.", ["w9"], "VPC와 CIDR", 3, []],
["VPC CIDR Size", "VPC 크기 범위", "AWS VPC CIDR은 /16(최대) ~ /28(최소). 만든 뒤 바꾸기 어려워 처음에 넉넉히잡는다.", ["w9"], "VPC와 CIDR", 2, []],
["Secondary CIDR", "보조 CIDR", "VPC에 대역을 추가로 붙이는 기능. 제약이 많아 처음 계획을 대신하지는 못한다.", ["w9"], "VPC와 CIDR", 1, []],
["CIDR Overlap", "대역 겹침", "두 네트워크의 IP 범위가 겹치는 것. 겹치면 Peering · VPN 경로를 만들 수 없다.", ["w9"], "VPC와 CIDR", 2, []],
["CIDR Plan", "주소 계획표", "환경(dev/stage/prod) · AZ · 계층별로 겹치지 않게 대역을 배정한 표. 번호 규칙으로 주소만 보고 위치를 알게 한다.", ["w9"], "VPC와 CIDR", 1, []],
["Isolation", "격리", "다른 VPC · 고객과 기본적으로 통신 불가한 성질. 연결은 Peering · TGW · VPN으로 명시적으로 만든다.", ["w9"], "VPC와 CIDR", 1, []],
["Subnet", "서브넷", "VPC CIDR을 잘라 하나의 AZ에 배치한 IP 구간. Route Table · NACL과 하나씩연결된다.", ["w9"], "서브넷", 3, []],
["Reserved IPs (5)", "서브넷 예약 주소 5개", "네트워크 주소(.0) · VPC 라우터(.1) · DNS(.2) · 향후 예약(.3) · 브로드캐스트(마지막). /24 서브넷의 사용 가능 IP는 251개.", ["w9"], "서브넷", 3, []],
["Usable IPs", "사용 가능 IP 수", "2^(32 − n) − 5. /26 = 59개, /28 = 11개.", ["w9"], "서브넷", 2, []],
["Tier", "계층", "Public(입구) · App(Private) · DB(Private)처럼 역할별로 서브넷을 나누는 단위. 3-tier가 기본형.", ["w9"], "서브넷", 2, []],
["Public Subnet", "퍼블릭 서브넷", "연결된 Route Table에 0.0.0.0/0 → IGW 경로가 있는 서브넷. 이름표가 아니라경로가 결정한다.", ["w9"], "서브넷", 3, [92]],
["Private Subnet", "프라이빗 서브넷", "IGW 경로가 없는 서브넷. 인터넷에서 직접 접근 불가, 외부 호출은 NAT GW를 거친다.", ["w9"], "서브넷", 3, [92, 93]],
["Isolated Subnet", "격리 서브넷", "0.0.0.0/0 경로 자체가 없는 서브넷. 외부로 나가지도 들어오지도 않는다 (DB 등).", ["w9"], "서브넷", 2, []],
["IP Exhaustion", "IP 고갈", "서브넷이 작아 새 인스턴스 · 컨테이너에 줄 IP가 없어 배포가 실패하는 상황.", ["w9"], "서브넷", 2, []],
["map_public_ip_on_launch", "자동 공인 IP 할당", "서브넷에서 인스턴스 생성 시 Public IPv4를 자동 부여하는 설정. Public 서브넷에서만 켠다.", ["w9"], "서브넷", 1, []],
["Route Table", "라우팅 테이블", "목적지(Destination CIDR) → 다음 홉(Target) 규칙표. 서브넷마다 하나가 연결된다.", ["w9"], "라우팅", 3, []],
["Destination / Target", "목적지 / 대상", "어디로 가는 패킷이(10.0.0.0/16, 0.0.0.0/0) · 어디로 보내지는가(local, igw, nat, vpce, pcx, tgw).", ["w9"], "라우팅", 2, []],
["local Route", "로컬 경로", "VPC CIDR → local. 자동 생성 · 삭제 불가. 같은 VPC 안 서브넷끼리는 기본적으로 라우팅된다.", ["w9"], "라우팅", 3, []],
["Default Route (0.0.0.0/0)", "기본 경로", "더 구체적인 경로가 없을 때 쓰는 “나머지 전부” 경로.", ["w9"], "라우팅", 3, []],
["Longest Prefix Match", "최장 접두사 일치", "목적지와 일치하는 경로 중 접두사가 가장 긴 것을 고르는 규칙 (Week 2). /24가/16보다 우선한다.", ["w9"], "라우팅", 3, []],
["Main Route Table", "기본 라우팅 테이블", "명시적으로 연결하지 않은 서브넷이 쓰는 테이블. 의도치 않은 경로의 원인이 되기쉽다.", ["w9"], "라우팅", 2, []],
["Route Table Association", "서브넷 연결", "서브넷과 Route Table을 묶는 설정. 누락되면 Main RT를 쓴다.", ["w9"], "라우팅", 2, []],
["Prefix List", "프리픽스 목록", "여러 CIDR을 하나의 이름으로 묶은 목록 (예: S3 서비스 대역). Route · SG에서참조한다.", ["w9"], "라우팅", 1, []],
["VPC Router", "VPC 라우터", "서브넷의 +1 주소에 있는 가상 라우터. 인스턴스의 기본 게이트웨이다.", ["w9"], "라우팅", 1, []],
["Internet Gateway (IGW)", "인터넷 게이트웨이", "VPC와 인터넷을 잇는 관리형 출입구. 공인 IP ↔ 사설 IP를 1:1로 변환한다. VPC당 1개.", ["w9"], "인터넷 게이트웨이와 공인 IP", 3, []],
["1:1 NAT", "일대일 주소 변환", "인스턴스 하나의 사설 IP와 공인 IP 하나를 짝지어 변환. 외부에서 먼저 들어오는연결도 가능하다.", ["w9"], "인터넷 게이트웨이와 공인 IP", 1, []],
["Public IPv4", "공인 IPv4 (자동 할당)", "인스턴스에 자동으로 붙는 공인 주소. 중지 후 시작하면 바뀔 수 있다.", ["w9"], "인터넷 게이트웨이와 공인 IP", 2, []],
["Elastic IP (EIP)", "탄력적 IP · 고정 공인 IP", "계정에 고정된 공인 IPv4. DNS · 화이트리스트에 등록할 주소. 보유만 해도 과금될 수 있다.", ["w9"], "인터넷 게이트웨이와 공인 IP", 2, []],
["Public Subnet 3조건", "인터넷 통신 조건", "① 0.0.0.0/0 → IGW 경로 ② 공인 IP 또는 EIP ③ SG · NACL 허용. 하나라도 빠지면 통신 불가.", ["w9"], "인터넷 게이트웨이와 공인 IP", 2, []],
["ENI", "Elastic Network Interface — 가상 네트워크 카드", "인스턴스 · LB · RDS에 붙는 가상 NIC. 사설 IP · 공인 IP · SG가 여기에 연결된다.", ["w9"], "인터넷 게이트웨이와 공인 IP", 2, []],
["Binding 0.0.0.0", "모든 인터페이스에서 대기", "서버 앱이 모든 IP로 들어오는 요청을 받도록 하는 설정. 127.0.0.1이면 외부 · LB에서 접근 불가 (Week 3).", ["w9"], "인터넷 게이트웨이와 공인 IP", 3, []],
["NAT Gateway", "NAT 게이트웨이", "Private 서브넷의 나가는 연결만 대신 해 주는 관리형 주소 변환기. Public 서브넷에 두고 EIP를 붙인다.", ["w9"], "NAT Gateway와 Endpoint", 3, [93]],
["SNAT", "Source NAT — 출발지 주소 변환", "패킷의 출발지 IP를 NAT 자신의 주소로 바꾸는 것. 응답은 매핑 테이블로 원래 서버에 돌려준다.", ["w9"], "NAT Gateway와 Endpoint", 2, []],
["PAT (N:1 NAT)", "Port Address Translation", "포트 번호로 여러 내부 연결을 구분해 하나의 공인 IP로 내보내는 방식. 가정용 공유기와 같은 원리.", ["w9"], "NAT Gateway와 Endpoint", 2, []],
["Outbound-only", "아웃바운드 전용", "내부에서 시작한 연결만 허용되고 외부에서 먼저 연결할 수 없는 성질. 방화벽 기능과는 별개다.", ["w9"], "NAT Gateway와 Endpoint", 3, []],
["Zonal NAT", "AZ 단위 NAT", "NAT GW는 한 AZ에 속한다. AZ마다 하나씩 두고 각 AZ의 Private RT가 같은 AZ의 NAT를 가리켜야 HA.", ["w9"], "NAT Gateway와 Endpoint", 2, []],
["NAT Instance", "NAT 인스턴스", "EC2에 NAT 기능을 직접 구성한 방식. 저렴하지만 가용성 · 확장을 직접 관리해야한다.", ["w9"], "NAT Gateway와 Endpoint", 1, []],
["VPC Endpoint", "VPC 엔드포인트", "인터넷 · NAT를 거치지 않고 AWS 서비스에 사설 경로로 접근하는 연결.", ["w9"], "NAT Gateway와 Endpoint", 2, []],
["Gateway Endpoint", "게이트웨이 엔드포인트", "Route Table에 prefix list → vpce 경로를 추가하는 방식. S3 · DynamoDB 전용, 무료.", ["w9"], "NAT Gateway와 Endpoint", 2, []],
["Interface Endpoint (PrivateLink)", "인터페이스 엔드포인트", "서브넷에 ENI(사설 IP)를 만들고 DNS가 그 IP를 돌려주는 방식. 대부분의 서비스지원, 시간 · GB 과금.", ["w9"], "NAT Gateway와 Endpoint", 2, []],
["IP Allowlist via NAT", "NAT EIP 화이트리스트", "외부 API가 허용 IP를 요구할 때 NAT GW의 EIP 하나만 등록하면 되는 장점.", ["w9"], "NAT Gateway와 Endpoint", 1, []],
["Security Group (SG)", "보안 그룹", "ENI에 붙는 Stateful 방화벽. 허용 규칙만 있고, 규칙끼리는 OR로 평가한다.", ["w9"], "보안 그룹", 3, [96]],
["Inbound / Outbound Rule", "인바운드 / 아웃바운드 규칙", "들어오는 / 나가는 트래픽 허용 규칙. SG 기본값은 인바운드 전부 거부, 아웃바운드 전부 허용.", ["w9"], "보안 그룹", 2, []],
["Source / Destination", "출발지 / 목적지", "규칙의 상대방. CIDR · 다른 SG ID · prefix list를 지정할 수 있다.", ["w9"], "보안 그룹", 2, []],
["SG Referencing (Chaining)", "SG 참조 · 체이닝", "Source에 IP 대신 다른 SG를 지정. ALB → app → db처럼 “앞 계층 SG에서 온것만” 허용하는 최소 권한 구조.", ["w9"], "보안 그룹", 2, []],
["Least Privilege", "최소 권한", "필요한 포트 · 출발지만 허용하는 원칙. 0.0.0.0/0은 입구(LB)에만.", ["w9"], "보안 그룹", 2, []],
["0.0.0.0/0 Anti-pattern", "전체 공개 안티패턴", "DB(5432 · 3306) · Redis(6379) · SSH(22)를 0.0.0.0/0에 여는 것. AI 생성 설정에서 가장 먼저 확인할 부분.", ["w9"], "보안 그룹", 3, []],
["Default Security Group", "기본 보안 그룹", "VPC마다 자동 생성. 같은 SG끼리 인바운드 허용. 운영 자원에는 목적별 SG를 따로 만든다.", ["w9"], "보안 그룹", 2, []],
["NACL", "Network Access Control List — 네트워크 ACL", "서브넷 경계에 적용되는 Stateless 방화벽. 허용 · 거부 규칙과 번호 순서를 가진다.", ["w9"], "네트워크 ACL", 3, []],
["Rule Number", "규칙 번호", "작은 번호부터 검사하고 처음 일치한 규칙으로 결정. 10 간격으로 매겨 사이에 끼워 넣기 쉽게 한다.", ["w9"], "네트워크 ACL", 3, []],
["Deny Rule", "거부 규칙", "특정 IP 대역을 명시적으로 차단. SG에는 없고 NACL에만 있는 기능.", ["w9"], "네트워크 ACL", 2, []],
["* (Asterisk) Rule", "기본 거부 규칙", "모든 규칙 끝에 있는 “나머지 전부 거부” 규칙. 수정 · 삭제 불가.", ["w9"], "네트워크 ACL", 2, []],
["Ephemeral Port", "임시 포트", "클라이언트 OS가 연결마다 임의로 고르는 출발 포트 (리눅스 32768–60999). NACL에는 보통 1024–65535를 허용한다.", ["w9"], "네트워크 ACL", 2, []],
["Default NACL / Custom NACL", "기본 / 사용자 NACL", "Default는 모두 허용, 새로 만든 Custom은 모두 거부에서 시작한다.", ["w9"], "네트워크 ACL", 2, []],
["Bastion Host", "배스천 · 점프 서버", "Public 서브넷의 중계 서버에 SSH로 들어간 뒤 Private 서버로 다시 접속하는 방식. 22번 노출 · 키 관리 부담.", ["w9"], "관리 접속", 2, []],
["Session Manager (SSM)", "AWS Systems Manager 세션 매니저", "에이전트가 바깥으로 연결을 열어 두고 그 연결로 셸에 접속. 인바운드 포트 0개 ·IAM 권한 · 접속 기록.", ["w9"], "관리 접속", 2, []],
["SSH (Port 22)", "Secure Shell", "원격 셸 접속 프로토콜. 인터넷에 열면 수분 내 무차별 로그인 시도가 들어온다.", ["w9"], "관리 접속", 2, []],
["Client VPN", "클라이언트 VPN", "개인 PC를 VPC 네트워크에 연결해 사설 IP로 접근하는 방식. CIDR 충돌에 주의.", ["w9"], "관리 접속", 1, []],
["/32 CIDR", "단일 IP 지정", "IP 하나만 허용할 때 쓰는 접두사 길이 (예: 203.0.113.7/32).", ["w9"], "관리 접속", 2, []],
["IAM Role", "Identity and Access Management 역할", "사람 · 서버에 부여하는 권한 묶음. SSM 접속 권한도 IAM으로 제어한다.", ["w9"], "관리 접속", 1, []],
["Load Balancer", "로드밸런서", "요청을 여러 대상 서버로 나눠 보내는 장치. Public에 두고 서버는 Private에 숨긴다.", ["w9"], "로드밸런서와 고가용성", 3, []],
["ALB", "Application Load Balancer", "L7(HTTP · HTTPS) 로드밸런서. 경로 · 호스트 · 헤더 라우팅, TLS 종료. REST ·WebSocket · SSE에 적합.", ["w9"], "로드밸런서와 고가용성", 2, []],
["NLB", "Network Load Balancer", "L4(TCP · UDP · TLS) 로드밸런서. AZ별 고정 IP · 초저지연. MQTT · 게임 서버에적합.", ["w9"], "로드밸런서와 고가용성", 2, []],
["Internet-facing / Internal LB", "외부용 / 내부용 LB", "인터넷에서 접근하는 LB(Public 서브넷) / VPC 내부에서만 쓰는 LB(Private).", ["w9"], "로드밸런서와 고가용성", 1, []],
["Target Group", "대상 그룹", "LB가 요청을 보낼 서버 · 컨테이너 · IP의 묶음.", ["w9"], "로드밸런서와 고가용성", 2, []],
["Health Check", "상태 검사", "LB가 주기적으로 /health 등을 호출해 실패한 대상을 트래픽에서 제외하는 기능.", ["w9"], "로드밸런서와 고가용성", 3, [95]],
["High Availability (HA)", "고가용성", "일부 구성요소가 고장 나도 서비스가 계속되도록 하는 설계.", ["w9"], "로드밸런서와 고가용성", 2, []],
["Availability (%)", "가용성", "99.9% = 연 8.76시간 중단 · 99.99% = 52.6분 · 99.999% = 5.26분.", ["w9"], "로드밸런서와 고가용성", 1, [88]],
["SLA", "Service Level Agreement — 서비스 수준 협약", "사업자가 약속한 가용성 수치. 우리 서비스의 가용성은 우리 설계가 결정한다.", ["w9"], "로드밸런서와 고가용성", 2, []],
["Failover", "장애 조치 · 전환", "Primary가 실패하면 Standby가 자동으로 역할을 넘겨받는 것 (RDS Multi-AZ).", ["w9"], "로드밸런서와 고가용성", 2, []],
["Primary / Standby", "주 / 대기", "평소 요청을 처리하는 쪽과 동기 복제로 대기하는 쪽.", ["w9"], "로드밸런서와 고가용성", 1, []],
["N+1 Capacity", "N+1 용량", "구성요소 하나가 빠져도 남은 쪽이 전체 부하를 감당할 수 있게 여유를 두는 설계.", ["w9"], "로드밸런서와 고가용성", 1, []],
["Auto Scaling", "자동 확장", "부하에 따라 서버 수를 자동으로 늘리고 줄이는 기능. SG 참조가 필요한 이유.", ["w9"], "로드밸런서와 고가용성", 2, []],
["Cross-AZ Data Transfer", "AZ 간 데이터 전송", "다른 AZ로 오가는 트래픽. 과금 대상이므로 같은 AZ 내 경로를 선호한다.", ["w9"], "로드밸런서와 고가용성", 1, []],
["VPC Peering", "VPC 피어링", "두 VPC를 1:1로 직접 연결. 비전이적이며 CIDR이 겹치면 불가.", ["w9"], "VPC 외부 연결과 DNS", 2, []],
["Non-transitive", "비전이성", "A–B, A–C를 연결해도 B→C는 A를 거쳐 통신할 수 없는 성질.", ["w9"], "VPC 외부 연결과 DNS", 2, []],
["Transit Gateway (TGW)", "트랜짓 게이트웨이", "여러 VPC · VPN을 허브 하나에 연결해 중앙에서 라우팅. VPC가 많을 때 쓴다.", ["w9"], "VPC 외부 연결과 DNS", 2, []],
["Site-to-Site VPN", "사이트 간 VPN", "온프레미스와 VPC를 인터넷 위 IPsec 터널로 연결.", ["w9"], "VPC 외부 연결과 DNS", 2, []],
["IPsec", "Internet Protocol Security", "IP 계층에서 패킷을 암호화 · 인증하는 프로토콜 묶음. VPN 터널에 쓴다.", ["w9"], "VPC 외부 연결과 DNS", 1, []],
["VGW", "Virtual Private Gateway", "VPC 쪽 VPN 종단점. Route Table의 Target으로 지정한다.", ["w9"], "VPC 외부 연결과 DNS", 1, []],
["Direct Connect", "전용선 연결", "온프레미스와 클라우드를 전용 회선으로 연결. 안정적 지연 · 대역폭, 구축 기간 ·비용 큼.", ["w9"], "VPC 외부 연결과 DNS", 2, []],
["VPC Resolver", "VPC DNS 리졸버", "VPC CIDR +2 주소(예: 10.0.0.2)의 DNS 서버. 사설 · 공용 이름을 모두 응답한다.", ["w9"], "VPC 외부 연결과 DNS", 1, []],
["Private Hosted Zone", "사설 호스팅 영역", "api.internal처럼 VPC 안에서만 쓰는 도메인 (Route 53).", ["w9"], "VPC 외부 연결과 DNS", 1, []],
["enableDnsHostnames", "DNS 호스트 이름 활성화", "인스턴스에 DNS 이름을 부여하는 VPC 설정. 켜 두는 것이 기본.", ["w9"], "VPC 외부 연결과 DNS", 1, []],
["Split-horizon DNS", "분할 DNS", "같은 이름이 VPC 안에서는 사설 IP, 밖에서는 공인 IP로 응답되는 구성.", ["w9"], "VPC 외부 연결과 DNS", 1, []],
["DNS TTL", "Time To Live", "DNS 응답 캐시 유지 시간. 너무 길면 Failover 후 새 IP를 늦게 따라간다 (Week 4).", ["w9"], "VPC 외부 연결과 DNS", 1, []],
["Timeout vs Refused", "타임아웃 vs 연결 거부", "타임아웃 = 중간(Route · SG · NACL)에서 패킷이 사라짐, Refused = 서버까지도착했지만 듣는 프로세스가 없음.", ["w9"], "진단과 비용", 2, []],
["Layered Troubleshooting", "계층별 진단 순서", "DNS → Route Table → NACL → SG → OS 리스너 → Application 순으로 바깥에서 안쪽으로 좁힌다.", ["w9"], "진단과 비용", 2, []],
["VPC Flow Logs", "VPC 흐름 로그", "ENI 단위로 연결의 출발지 · 목적지 · 포트 · 바이트 · ACCEPT/REJECT를 기록하는 로그. 패킷 내용은 없다.", ["w9"], "진단과 비용", 3, [100]],
["ACCEPT / REJECT", "허용 / 거부 판정", "Flow Log의 action 필드. SG · NACL이 막으면 REJECT로 남는다.", ["w9"], "진단과 비용", 3, []],
["Flow Log Fields", "흐름 로그 기본 필드 (v2)", "version · account-id · interface-id · srcaddr · dstaddr · srcport · dstport ·protocol · packets · bytes · start · end · action · log-status.", ["w9"], "진단과 비용", 1, []],
["Protocol Number", "IP 프로토콜 번호", "Flow Log의 protocol 값. 6 = TCP, 17 = UDP, 1 = ICMP.", ["w9"], "진단과 비용", 1, []],
["Reachability Analyzer", "도달 가능성 분석기", "출발지 · 목적지를 지정하면 Route · SG · NACL 설정만으로 막히는 지점을 알려주는 도구 (패킷 미전송).", ["w9"], "진단과 비용", 1, []],
["nc -zv", "netcat 포트 점검", "특정 호스트 · 포트로 TCP 연결이 되는지만 확인하는 명령. 타임아웃 / refused구분에 쓴다.", ["w9"], "진단과 비용", 1, []],
["dig +short", "DNS 조회", "이름이 어떤 IP로 해석되는지 확인. 내부 자원은 사설 IP가 나와야 한다.", ["w9"], "진단과 비용", 1, []],
["NAT GW 요금", "시간 + 처리 GB", "NAT Gateway는 존재 시간과 처리한 데이터량으로 과금. 대용량 트래픽은Endpoint로 우회.", ["w9"], "진단과 비용", 1, []],
["Public IPv4 Charge", "공인 IPv4 과금", "보유한 공인 IPv4 주소에 시간당 요금이 붙는다. 실습 후 EIP Release.", ["w9"], "진단과 비용", 1, []],
["Data Transfer Out", "외부 전송 요금", "인터넷으로 나가는 트래픽 과금. 들어오는 트래픽은 보통 무료.", ["w9"], "진단과 비용", 1, []],
["Pricing Calculator / Budget", "요금 계산기 / 예산 알림", "정확한 단가 확인과 과금 초과 알림 설정 도구. 실습 전 반드시 설정한다.", ["w9"], "진단과 비용", 1, []],
["IaC", "Infrastructure as Code — 코드형 인프라", "인프라를 코드로 정의해 Git으로 버전 관리 · 리뷰 · 재현하는 방식.", ["w9"], "IaC와 Terraform", 2, []],
["Terraform", "테라폼", "HCL 언어로 여러 클라우드 인프라를 선언하는 IaC 도구.", ["w9"], "IaC와 Terraform", 2, []],
["HCL", "HashiCorp Configuration Language", "Terraform 설정 언어. resource 블록에 자원 종류와 속성을 선언한다.", ["w9"], "IaC와 Terraform", 1, []],
["terraform plan", "변경 계획 미리 보기", "무엇이 생성 · 변경 · 삭제될지 보여 준다. apply 전 마지막 리뷰 지점.", ["w9"], "IaC와 Terraform", 2, []],
["terraform apply / destroy", "적용 / 전체 삭제", "계획을 실제로 적용 / 만든 자원을 모두 삭제. 실습 후 destroy로 비용을 막는다.", ["w9"], "IaC와 Terraform", 2, []],
["aws_vpc_security_group_ingress_rule", "SG 인바운드 규칙 리소스", "규칙을 별도 resource로 정의하는 AWS provider v5 권장 방식. referenced_security_group_id로 SG를 참조한다.", ["w9"], "IaC와 Terraform", 1, []],
["Drift", "구성 표류", "콘솔에서 직접 바꿔 코드와 실제 인프라가 달라진 상태. plan으로 발견한다.", ["w9"], "IaC와 Terraform", 2, []],
["3-tier Architecture", "3계층 아키텍처", "인터넷 → ALB(Public) → App(Private) → DB(Private) 구조. 클라우드 웹 서비스의 기본형.", ["w9"], "아키텍처 패턴", 2, []],
["Hub-and-Spoke", "허브 앤 스포크", "중앙 허브(TGW · 공용 VPC)에 여러 VPC를 연결하는 구조.", ["w9"], "아키텍처 패턴", 1, []],
["dev / stage / prod", "환경 분리", "개발 · 검증 · 운영 환경을 별도 VPC(겹치지 않는 CIDR)로 나누는 관행.", ["w9"], "아키텍처 패턴", 1, []],
["TURN on Public Subnet", "공인 IP가 필요한 예외", "WebRTC TURN 서버처럼 본질적으로 공인 주소가 필요한 서버는 Public에 둔다 (Week 7).", ["w9"], "아키텍처 패턴", 1, []],
["Broker behind NLB", "NLB 뒤 MQTT 브로커", "MQTT 브로커는 Private에 두고 NLB(TLS 8883)로만 노출하는 배치 (Week 7).", ["w9"], "아키텍처 패턴", 1, []],
["Design Sheet", "설계 시트", "CIDR 표 · 서브넷 표 · Route 표 · SG 매트릭스 · 장애/확장 시나리오를 모은 설계 문서 (과제).", ["w9"], "아키텍처 패턴", 1, []],
["SG Matrix", "보안 그룹 매트릭스", "From(행) × To(열)로 허용 포트를 정리한 표. 의도하지 않은 경로를 한눈에 찾는다.", ["w9"], "아키텍처 패턴", 1, []]],
"abbr": [["API", ["Application Programming Interface"], ["w5", "w6", "w7", "w9"], 3, "프로그램끼리 기능·데이터를 주고받기 위해 약속된 인터페이스. 서버 코드자체가 아니라 팀(시스템) 사이의 경계선이다."],
["CDN", ["Content Delivery Network"], ["w5", "w7", "w9"], 2, "사용자 가까운 곳에 콘텐츠를 캐시해 지연을 줄이는 서버망"],
["DNS", ["Domain Name System"], ["w5", "w9"], 3, "도메인 이름 → IP. 위임(Root → TLD → 권한) + 캐시(TTL)"],
["HTTP", ["HyperText Transfer Protocol"], ["w5", "w7"], 2, "웹의 응용 계층 요청/응답 프로토콜. 시작줄 + 헤더 + 빈 줄 + 본문"],
["HTTPS", ["HyperText Transfer Protocol Secure"], ["w5", "w6"], 3, "TLS로 암호화된 통로 위의 HTTP. 기본 포트 443. URL 경로·쿼리·헤더·Body가 모두 암호화된다."],
["IoT", ["Internet of Things"], ["w5", "w7"], 2, "센서·액추에이터 등 사물이 네트워크로 데이터를 주고받는 시스템."],
["LB", ["Load Balancer"], ["w5", "w7", "w9"], 3, "여러 서버에 요청을 나눠 주는 장치 (L4/L7)"],
["REST", ["Representational State Transfer"], ["w5"], 3, "Roy Fielding(2000)이 웹의 확장성을 6가지 제약으로 정리한 아키텍처 스타일. 프로토콜이 아니며 HTTP 그 자체도 아니다."],
["RTT", ["Round-Trip Time"], ["w5", "w6", "w7"], 3, "요청이 갔다가 응답이 돌아오는 시간. TCP 1-RTT + TLS 1.3 1-RTT 후 첫 HTTP 요청이 나간다."],
["TCP", ["Transmission Control Protocol"], ["w5", "w7", "w9"], 3, "연결형 · 신뢰성 L4. 3-way handshake, Seq/ACK, 재전송, 흐름·혼잡 제어"],
["TLS", ["Transport Layer Security"], ["w5", "w6", "w7", "w9"], 3, "TCP 위에서 기밀성·무결성·서버 인증을 제공하는 프로토콜. SSL의 후속이며 현재 1.2·1.3을 쓴다."],
["URL", ["Uniform Resource Locator"], ["w5"], 3, "scheme://host:port/path?query#fragment — host만 DNS로 감"],
["gRPC", ["gRPC Remote Procedure Call", "Google Remote Procedure Call"], ["w5"], 2, "HTTP/2 위에서 Protobuf(바이너리)로 함수를 호출하는 방식. 빠르고 타입이 강해 마이크로서비스 내부 통신에 쓴다."],
["LLM", ["Large Language Model"], ["w5", "w7"], 1, "대규모 언어 모델"],
["SSE", ["Server-Sent Events"], ["w5", "w7"], 3, "HTTP 응답을 끝내지 않고 이벤트를 텍스트로 계속 흘려보내는 서버→클라이언트단방향 Push 방식."],
["CORS", ["Cross-Origin Resource Sharing"], ["w5", "w6", "w7"], 3, "서버가 응답 헤더로 특정 Origin의 cross-origin 읽기를 허용해 SOP를 완화하는 메커니즘. 보안 장치가 아니라 완화 장치다."],
["JSON", ["JavaScript Object Notation"], ["w5", "w7"], 3, "이름–값 쌍과 배열로 데이터를 표현하는 경량 텍스트 형식. REST API의 기본 표현 형식."],
["JWT", ["JSON Web Token"], ["w5", "w6"], 3, "header.payload.signature 세 부분을 점으로 이은 서명된 토큰. 서버는 저장소 조회 없이 서명만 검증한다. ‘홀로그램 입장권’ 비유."],
["MIME", ["Multipurpose Internet Mail Extensions"], ["w5", "w7"], 1, "type/subtype 형태로 데이터 형식을 나타내는 이름 (application/json, multipart/form-data)."],
["ASGI", ["Asynchronous Server Gateway Interface"], ["w5"], 1, "Python 비동기 웹 서버와 애플리케이션 사이의 표준 인터페이스."],
["CRUD", ["Create · Read · Update · Delete"], ["w5"], 3, "데이터 조작 4가지. 각각 POST · GET · PUT/PATCH · DELETE에 대응한다."],
["CSRF", ["Cross-Site Request Forgery"], ["w5", "w6"], 3, "쿠키 자동 첨부를 악용해 사용자가 모르게 요청을 보내게 하는 공"],
["DB", ["Database"], ["w5", "w9"], 1, "데이터베이스"],
["HATEOAS", ["Hypermedia As The Engine Of Application State"], ["w5"], 2, "응답 안에 다음에 할 수 있는 행동의 링크를 포함하는 원칙 (\"links\": {\"courses\": \"/students/10/courses\"}). 실무에서는 흔히 생략한다."],
["HTML", ["HyperText Markup Language"], ["w5"], 2, "웹 페이지 문서 형식 — 과거 서버 렌더링 응답"],
["ISO", ["International Organization for Standardization"], ["w5"], 1, "국제표준화기구"],
["JS", ["JavaScript"], ["w5"], 1, "이름–값 쌍과 배열로 데이터를 표현하는 경량 텍스트 형식. REST API의 기본 표현 형식."],
["JSP", ["JavaServer Pages"], ["w5"], 1, "Java 서버 페이지 렌더링"],
["OAS", ["OpenAPI Specification"], ["w5"], 2, "REST API의 경로·파라미터·Schema·응답을 YAML/JSON으로 기술하는명세 표준 (현재 3.1)."],
["OAuth", ["Open Authorization"], ["w5", "w6"], 3, "비밀번호를 넘기지 않고 제3자 앱에 scope가 제한된 권한을 위임하는 인가 프레임워크. ‘발레파킹 키’ 비유."],
["ORM", ["Object-Relational Mapping"], ["w5"], 1, "DB 테이블을 객체로 다루게 해 주는 도구. SQL을 직접 쓰지 않고 조회·수정한다."],
["POX", ["Plain Old XML"], ["w5"], 1, "URI 하나, POST 하나로 모든 일을 처리 (POST /api{\"action\":\"getStudent\"}). HTTP를 단순 운반 수단으로만 쓴다."],
["RFC", ["Request for Comments"], ["w5", "w6", "w7", "w9"], 1, "인터넷 표준 문서"],
["RMM", ["Richardson Maturity Model"], ["w5"], 2, "Richardson 성숙도 0~3: POX → 자원 URI → Method·상태 코드 → HATEOAS"],
["RPC", ["Remote Procedure Call"], ["w5"], 2, "원격 함수 호출 스타일 — 동사 중심 (REST와 대비)"],
["SOP", ["Same-Origin Policy"], ["w5", "w7"], 3, "다른 Origin의 응답을 JS가 '읽는 것'을 막는 브라우저 규칙. 요청을 '보내는 것'은 원래 가능하다."],
["SPA", ["Single Page Application"], ["w5"], 1, "HTML은 한 번만 받고 이후에는 JS가 fetch()로 JSON만 받아 화면을 바꾸는 구조 (React·Vue)."],
["SQL", ["Structured Query Language"], ["w5"], 1, "DB 질의 언어"],
["SSR", ["Server-Side Rendering"], ["w5"], 1, "서버가 템플릿과 DB로 완성된 HTML 페이지를 만들어 응답하는 구조 (PHP·JSP·Django Template). 클릭마다 페이지 전체를 새로 받는다."],
["UI", ["User Interface"], ["w5"], 1, "사용자 화면"],
["URI", ["Uniform Resource Identifier"], ["w5"], 3, "자원을 식별하는 문자열. URI는 '명사(자원)'를, Method는 '동사(행위)'를담당한다."],
["XHR", ["XMLHttpRequest"], ["w5"], 1, "브라우저 비동기 요청 API (fetch 이전)"],
["XML", ["eXtensible Markup Language"], ["w5"], 1, "태그 기반 데이터 형식"],
["XSS", ["Cross-Site Scripting"], ["w5", "w6"], 3, "사용자 입력이 HTML에 섞여 공격자 스크립트가 다른 사용자의브라우저에서 실행되는 공격. ‘게시판의 마법 쪽지’ 비유."],
["YAML", ["YAML Ain't Markup Language"], ["w5"], 1, "들여쓰기 기반 설정·명세 형식"],
["AAA", ["Authentication, Authorization, Accounting"], ["w6"], 2, ""],
["ABAC", ["Attribute-Based Access Control"], ["w6"], 2, "학과·시간·위치·기기 같은 속성 조합으로 판단한다 (“학기 중, 교내망에서만 성적 입력”)."],
["AEAD", ["Authenticated Encryption with Associated Data"], ["w6"], 2, "암호화와 무결성 검증을 한 번에 하는 방식 (AES-GCM, ChaCha20-Poly1305). TLS 1.3은 AEAD만 쓴다."],
["AES", ["Advanced Encryption Standard"], ["w6"], 3, "가장 널리 쓰이는 대칭키 블록 암호. TLS에서는 AES-GCM 형태로데이터 암호화에 쓴다."],
["AuthN", ["Authentication"], ["w6"], 2, ""],
["AuthZ", ["Authorization"], ["w6"], 2, "“가진 사람이 주인”인 토큰. Authorization: Bearer <token>으로 보낸다. 훔치면 그대로 쓸 수 있다."],
["BCP", ["Best Current Practice"], ["w6"], 1, ""],
["CA", ["Certificate Authority"], ["w6"], 3, "인증서를 발급하고 서명하는 신뢰 기관 (Let's Encrypt, DigiCert, Sectigo 등)."],
["CAPTCHA", ["Completely Automated Public Turing test to tell Computers and Humans Apart"], ["w6"], 1, "사람과 봇을 구분하는 테스트. 연속 실패 시 추가한다."],
["CRL", ["Certificate Revocation List"], ["w6"], 2, "폐기된 인증서 목록"],
["CSP", ["Content Security Policy"], ["w6"], 2, "허용된 출처의 스크립트·리소스만 실행·로드하도록 하는 응답 헤더. XSS 피해를 줄인다."],
["DH", ["Diffie–Hellman"], ["w6"], 2, ""],
["ECDHE", ["Elliptic Curve Diffie–Hellman Ephemeral", "Elliptic Curve Diffie-Hellman Ephemeral"], ["w6"], 2, "연결마다 일회용 키를 만드는 키 교환 → Forward Secrecy"],
["ECC", ["Elliptic Curve Cryptography"], ["w6"], 2, "타원곡선 기반 공개키 암호와 서명 방식. RSA보다 짧은 키로 같은강도를 낸다 (ES256)."],
["ECDSA", ["Elliptic Curve Digital Signature Algorithm"], ["w6"], 2, "타원곡선 전자서명"],
["FIDO", ["Fast IDentity Online"], ["w6"], 1, "기기의 개인키로 서명해 로그인하는 표준. 피싱 사이트에서는 서명이 동작하지 않는다."],
["GCM", ["Galois/Counter Mode"], ["w6"], 1, ""],
["HMAC", ["Hash-based Message Authentication Code"], ["w6"], 3, ""],
["HS256", ["HMAC with SHA-256"], ["w6"], 1, "하나의 비밀키로 서명·검증. 발급·검증 서버가 같은 키를 공유한다. 키는 최소 256비트 무작위 값."],
["HSTS", ["HTTP Strict Transport Security"], ["w6"], 3, "Strict-Transport-Security 헤더로 “이 사이트는 일정 기간HTTPS로만 접속하라”고 브라우저에 지시. SSL Strip을 막는다."],
["IDOR", ["Insecure Direct Object Reference"], ["w6"], 3, "URL·파라미터의 id만 바꿔 남의 데이터에 접근되는 취약점. 인증은 됐지만 소유권 검사가 빠진 경우."],
["JWE", ["JSON Web Encryption"], ["w6"], 1, ""],
["JWS", ["JSON Web Signature"], ["w6"], 1, "서명만 한 JWT(일반적인 형태) / 내용까지 암호화한 JWT."],
["KDF", ["Key Derivation Function"], ["w6"], 1, ""],
["MAC", ["Message Authentication Code"], ["w6"], 2, "비밀키와 해시로 만든 ‘검증 태그’ . 키를 아는 쪽만 만들고 검증할수 있다 (JWT HS256, 웹훅 서명)."],
["MFA", ["Multi-Factor Authentication"], ["w6"], 3, "서로 다른 종류의 인증 요소를 둘 이상 조합하는 것. 비밀번호 + 보안 질문은 MFA가 아니다."],
["2FA", ["Two-Factor Authentication"], ["w6"], 3, ""],
["MITM", ["Man-In-The-Middle"], ["w6"], 3, "통신 중간에 끼어들어 엿보거나 바꾸는 공격. 인증서 검증으로 막는다."],
["mTLS", ["mutual Transport Layer Security"], ["w6", "w7"], 2, "서버뿐 아니라 클라이언트도 인증서로 신원을 증명하는 TLS. IoT·서버 간 통신에 쓴다."],
["OCSP", ["Online Certificate Status Protocol"], ["w6"], 2, "인증서 폐기 여부 실시간 조회"],
["OIDC", ["OpenID Connect"], ["w6"], 3, "OAuth 2.0 위에 ‘인증’을 얹은 표준. 사용자 신원을 담은 ID Token(JWT)을 함께 발급한다 (“구글로 로그인”)."],
["OTP", ["One-Time Password"], ["w6"], 3, "한 번만 쓰는 코드."],
["TOTP", ["Time-based One-Time Password"], ["w6"], 3, "공유 비밀값 + 현재 시각(30초 단위)을 해시해 6자리 코드를 만드는 방식. 네트워크 없이 앱에서 생성된다."],
["OWASP", ["Open Worldwide Application Security Project"], ["w6"], 1, "웹 보안 지침을 공개하는 비영리 단체 / 가장 중요한 웹 보안 위험10가지 목록."],
["PBKDF2", ["Password-Based Key Derivation Function 2"], ["w6"], 1, ""],
["PFS", ["Perfect Forward Secrecy"], ["w6"], 3, "서버 개인키가 나중에 유출돼도 과거 트래픽은 안전"],
["PKCE", ["Proof Key for Code Exchange"], ["w6"], 2, "앱이 code_verifier의 해시(code_challenge)를 먼저 보내고, 토큰 교환 때 원래 값을 보여 준다. 코드를 가로채도 토큰을 못 받는다."],
["PKI", ["Public Key Infrastructure"], ["w6"], 2, ""],
["RBAC", ["Role-Based Access Control"], ["w6"], 2, "역할(student · professor · admin)에 권한을 묶어 판단한다."],
["RS256", ["RSA Signature with SHA-256"], ["w6"], 2, "개인키로 서명, 공개키로 검증. 여러 서비스가 공개키만으로 독립검증할 수 있어 OAuth·OIDC에 쓰인다."],
["ES256", ["ECDSA Signature with SHA-256"], ["w6"], 2, ""],
["RSA", ["Rivest–Shamir–Adleman"], ["w6"], 2, "큰 수의 소인수분해 어려움에 기반한 공개키 알고리즘. 인증서 서명·키에 널리 쓰인다."],
["SAN", ["Subject Alternative Name"], ["w6"], 2, "인증서가 유효한 도메인 목록 — 접속 도메인과 일치해야 함"],
["SHA", ["Secure Hash Algorithm"], ["w6"], 1, "256비트 해시값을 만드는 대표 해시 함수. 파일 검증·서명에 쓰지만, 너무 빨라서 비밀번호 저장용으로는 부적합."],
["sid", ["Session ID"], ["w6"], 1, "의미 없는 긴 무작위 번호. 이 값만 있으면 그 사용자로 인정되므로 비밀번호처럼 보호한다."],
["SNI", ["Server Name Indication"], ["w6"], 3, "한 IP에 여러 도메인이 있을 때 어떤 도메인의 인증서가 필요한지ClientHello에 적어 보내는 값."],
["SQLi", ["SQL Injection"], ["w6"], 3, "입력이 SQL 문법의 일부가 되어 쿼리가 바뀌는 공격 (admin' --)."],
["SSL", ["Secure Sockets Layer"], ["w6"], 2, "TLS의 옛 이름·이전 버전. 모든 버전이 폐기되었지만 ‘SSL 인증서’처럼 관용적으로 남아 있다."],
["SSO", ["Single Sign-On"], ["w6"], 2, "한 번 로그인으로 여러 서비스를 이용하는 구조. OIDC·SAML로구현한다."],
["WAF", ["Web Application Firewall"], ["w6"], 2, ""],
["WebAuthn", ["Web Authentication"], ["w6"], 1, ""],
["ACL", ["Access Control List"], ["w7", "w9"], 3, "누가 어떤 토픽에 읽기/쓰기를 할 수 있는지 정한 규칙 (pattern write devices/%c/#)."],
["BLE", ["Bluetooth Low Energy"], ["w7"], 3, "근거리(~수십 m)·저전력 무선 기술. 대부분 잠들어 있다가 짧은 간격에만 깨어 통신한다."],
["CoAP", ["Constrained Application Protocol"], ["w7"], 1, "UDP 기반의 경량 REST 프로토콜. 헤더 4 B, Observe로 서버 Push도 가능. 초저전력 기기용."],
["CSWSH", ["Cross-Site WebSocket Hijacking"], ["w7"], 1, "Origin을 검사하지 않는 WebSocket 서버에 공격자 페이지가 사용자의 쿠키로연결해 대화를 탈취하는 공격."],
["DoS", ["Denial of Service"], ["w7"], 1, ""],
["DTLS", ["Datagram Transport Layer Security"], ["w7"], 1, "UDP용 TLS. WebRTC에서 암호화 키 교환에 쓰이며 모든 미디어는 필수 암호화된다."],
["GATT", ["Generic Attribute Profile"], ["w7"], 1, "BLE 연결 후 데이터를 Service·Characteristic 계층으로 정리해 주고받는 규칙."],
["GUID", ["Globally Unique Identifier"], ["w7"], 1, ""],
["HOL", ["Head-of-Line (Blocking)"], ["w7"], 2, "앞의 하나가 막혀 뒤가 전부 대기 (HTTP/2의 TCP HOL)"],
["ICE", ["Interactive Connectivity Establishment"], ["w7"], 3, "가능한 주소 후보를 모아 후보 쌍을 시험하고, 성공한 경로를 고르는 절차."],
["LoRaWAN", ["Long Range Wide Area Network"], ["w7"], 1, "수 km~15 km, 수 kbps 이하의 초저전력 장거리 통신. 농업·계량기에 쓴다."],
["6LoWPAN", ["IPv6 over Low-Power Wireless Personal Area Networks"], ["w7"], 1, "저전력 무선망에서 IPv6 패킷을 압축해 쓰는 기술."],
["LTE-M", ["Long Term Evolution for Machines"], ["w7"], 1, ""],
["LWT", ["Last Will and Testament"], ["w7"], 3, "CONNECT 때 등록해 두면, 클라이언트가 비정상으로 사라질 때 브로커가 대신 발행하는 메시지 (예: status = offline)."],
["MCU", ["Microcontroller Unit", "Multipoint Control Unit"], ["w7"], 1, "서버가 영상들을 합성해 하나로 보내는 구조. 클라이언트는 편하지만 서버 CPU부담이 크다."],
["MQTT", ["Message Queuing Telemetry Transport"], ["w7"], 3, "TCP 위의 경량 Publish/Subscribe 메시징 프로토콜. 고정 헤더 최소 2 B. 1999년 위성 원격 감시용으로 시작."],
["NAT", ["Network Address Translation"], ["w7", "w9"], 3, "Private ↔ Public 주소 변환. 나가야 돌아온다"],
["NB-IoT", ["Narrowband Internet of Things"], ["w7"], 1, "이동통신망 기반 저전력 IoT 통신. 스마트 미터·물류 추적에 쓴다."],
["P2P", ["Peer-to-Peer"], ["w7"], 3, "서버를 거치지 않고 두 단말이 직접 데이터를 주고받는 구조."],
["QoS", ["Quality of Service"], ["w7"], 3, "MQTT 메시지가 얼마나 확실히 전달되는지의 단계 (0·1·2). 높을수록 왕복이 늘어난다."],
["RTC", ["Real-Time Communication"], ["w7"], 1, ""],
["SCTP", ["Stream Control Transmission Protocol"], ["w7"], 1, "DataChannel이 DTLS 위에서 쓰는 전송 프로토콜. 신뢰성·순서 보장 여부를 선택할 수 있다."],
["SDP", ["Session Description Protocol"], ["w7"], 3, "코덱·미디어 종류·암호화 지문 등 “어떻게 통화할지”를 적은 텍스트 설명서."],
["SFU", ["Selective Forwarding Unit"], ["w7"], 1, "서버가 받은 스트림을 디코딩 없이 골라 전달. 업로드 1개, 다운로드 N−1개. 대부분 화상회의의 표준."],
["SHA-1", ["Secure Hash Algorithm 1"], ["w7"], 1, "256비트 해시값을 만드는 대표 해시 함수. 파일 검증·서명에 쓰지만, 너무 빨라서 비밀번호 저장용으로는 부적합."],
["SRTP", ["Secure Real-time Transport Protocol"], ["w7"], 1, "음성·영상을 암호화해 UDP로 전송하는 프로토콜."],
["STUN", ["Session Traversal Utilities for NAT"], ["w7"], 3, "“밖에서 보면 너의 주소는 이것”을 알려 주는 가벼운 서버. 공인 IP:포트 확인용."],
["TTFT", ["Time To First Token"], ["w7"], 1, "LLM 답변의 첫 글자가 보이기까지의 시간. 스트리밍(SSE)으로 체감 지연을 줄인다."],
["TURN", ["Traversal Using Relays around NAT"], ["w7"], 3, "P2P가 불가능할 때 모든 미디어를 대신 중계하는 서버. 확실하지만 대역폭 비용이크다."],
["UDP", ["User Datagram Protocol"], ["w7", "w9"], 3, "비연결 · 비신뢰 L4. 8바이트 헤더, 생략으로 빠름 (DNS · 스트리밍 · QUIC)"],
["UUID", ["Universally Unique Identifier"], ["w7"], 1, "Service·Characteristic의 식별 번호. 표준은 16비트 축약형(0x180D)을 쓴다."],
["WebRTC", ["Web Real-Time Communication"], ["w7"], 3, "브라우저 간 음성·영상·데이터를 P2P로 직접 주고받는 표준 기술. UDP 기반."],
["WS", ["WebSocket"], ["w7"], 3, "ws는 평문(80), wss는 TLS 암호화(443). 운영에서는 반드시 wss."],
["WSS", ["WebSocket Secure"], ["w7"], 3, ""],
["ALB", ["Application Load Balancer"], ["w9"], 3, "L7(HTTP · HTTPS) 로드밸런서. 경로 · 호스트 · 헤더 라우팅, TLS 종료. REST ·WebSocket · SSE에 적합."],
["AWS", ["Amazon Web Services"], ["w9"], 1, ""],
["AZ", ["Availability Zone"], ["w9"], 3, "리전 안에서 전력 · 냉각 · 네트워크가 독립된 데이터센터 묶음. 서브넷은 AZ 하나에 속한다."],
["CAPEX", ["Capital Expenditure"], ["w9"], 1, "장비를 미리 사는 비용(CAPEX)과 쓴 만큼 내는 비용(OPEX). 클라우드는 OPEX"],
["CIDR", ["Classless Inter-Domain Routing"], ["w9"], 3, "10.0.0.0/16처럼 IP 대역을 “주소/접두사 길이”로 표기하는 방식 (Week 2)."],
["EC2", ["Elastic Compute Cloud"], ["w9"], 1, ""],
["ECS", ["Elastic Container Service"], ["w9"], 1, ""],
["EIP", ["Elastic IP"], ["w9"], 3, "계정에 고정된 공인 IPv4. DNS · 화이트리스트에 등록할 주소. 보유만 해도 과금될 수 있다."],
["EKS", ["Elastic Kubernetes Service"], ["w9"], 1, ""],
["ENI", ["Elastic Network Interface"], ["w9"], 3, "인스턴스 · LB · RDS에 붙는 가상 NIC. 사설 IP · 공인 IP · SG가 여기에 연결된다."],
["GCP", ["Google Cloud Platform"], ["w9"], 1, ""],
["HA", ["High Availability"], ["w9"], 3, "일부 구성요소가 고장 나도 서비스가 계속되도록 하는 설계."],
["HCL", ["HashiCorp Configuration Language"], ["w9"], 1, "Terraform 설정 언어. resource 블록에 자원 종류와 속성을 선언한다."],
["IaC", ["Infrastructure as Code"], ["w9"], 3, "인프라를 코드로 정의해 Git으로 버전 관리 · 리뷰 · 재현하는 방식."],
["IAM", ["Identity and Access Management"], ["w9"], 1, "사람 · 서버에 부여하는 권한 묶음. SSM 접속 권한도 IAM으로 제어한다."],
["ICMP", ["Internet Control Message Protocol"], ["w9"], 1, ""],
["IGW", ["Internet Gateway"], ["w9"], 3, "VPC와 인터넷을 잇는 관리형 출입구. 공인 IP ↔ 사설 IP를 1:1로 변환한다. VPC당 1개."],
["IP", ["Internet Protocol"], ["w9"], 2, "IP 계층에서 패킷을 암호화 · 인증하는 프로토콜 묶음. VPN 터널에 쓴다."],
["IPsec", ["Internet Protocol Security"], ["w9"], 1, "IP 계층에서 패킷을 암호화 · 인증하는 프로토콜 묶음. VPN 터널에 쓴다."],
["LCU", ["Load Balancer Capacity Unit"], ["w9"], 1, ""],
["NACL", ["Network Access Control List"], ["w9"], 3, "서브넷 경계에 적용되는 Stateless 방화벽. 허용 · 거부 규칙과 번호 순서를 가진다."],
["NLB", ["Network Load Balancer"], ["w9"], 3, "L4(TCP · UDP · TLS) 로드밸런서. AZ별 고정 IP · 초저지연. MQTT · 게임 서버에적합."],
["NSG", ["Network Security Group (Azure)"], ["w9"], 1, ""],
["OPEX", ["Operating Expenditure"], ["w9"], 1, ""],
["PAT", ["Port Address Translation"], ["w9"], 3, "포트 번호로 여러 내부 연결을 구분해 하나의 공인 IP로 내보내는 방식. 가정용 공유기와 같은 원리."],
["RDS", ["Relational Database Service"], ["w9"], 1, ""],
["RT", ["Route Table"], ["w9"], 1, ""],
["S3", ["Simple Storage Service"], ["w9"], 1, ""],
["SG", ["Security Group"], ["w9"], 3, "ENI에 붙는 Stateful 방화벽. 허용 규칙만 있고, 규칙끼리는 OR로 평가한다."],
["SLA", ["Service Level Agreement"], ["w9"], 3, "사업자가 약속한 가용성 수치. 우리 서비스의 가용성은 우리 설계가 결정한다."],
["SNAT", ["Source Network Address Translation"], ["w9"], 3, "패킷의 출발지 IP를 NAT 자신의 주소로 바꾸는 것. 응답은 매핑 테이블로 원래 서버에 돌려준다."],
["SSH", ["Secure Shell"], ["w9"], 1, "원격 셸 접속 프로토콜. 인터넷에 열면 수분 내 무차별 로그인 시도가 들어온다."],
["SSM", ["AWS Systems Manager"], ["w9"], 1, "에이전트가 바깥으로 연결을 열어 두고 그 연결로 셸에 접속. 인바운드 포트 0개 ·IAM 권한 · 접속 기록."],
["TGW", ["Transit Gateway"], ["w9"], 1, "여러 VPC · VPN을 허브 하나에 연결해 중앙에서 라우팅. VPC가 많을 때 쓴다."],
["TTL", ["Time To Live"], ["w9"], 2, "DNS 응답 캐시 유지 시간. 너무 길면 Failover 후 새 IP를 늦게 따라간다 (Week 4)."],
["UDR", ["User-Defined Route (Azure)"], ["w9"], 1, ""],
["VGW", ["Virtual Private Gateway"], ["w9"], 1, "VPC 쪽 VPN 종단점. Route Table의 Target으로 지정한다."],
["VNet", ["Virtual Network (Azure)"], ["w9"], 1, ""],
["VPC", ["Virtual Private Cloud"], ["w9"], 3, "클라우드 안에 만드는 논리적으로 격리된 나만의 IP 네트워크. CIDR · 서브넷 · 경로 · 출입구 · 방화벽을 직접 설계한다."],
["VPCE", ["VPC Endpoint"], ["w9"], 1, ""],
["VPN", ["Virtual Private Network"], ["w9"], 1, ""]]};
const FOX = D.ox;            // [statement, 'O'|'X', explanation, week]
const FT = D.terms;          // [term, sub, def, [weeks], topic, tier, [ox numbers]]
const FA = D.abbr;           // [abbr, [full forms], [weeks], tier, meaning]
const WEEKS = ['w5', 'w6', 'w7', 'w9'];
const WL = { w5: '5주 REST API', w6: '6주 인증·보안', w7: '7주 실시간·IoT', w9: '9주 클라우드' };
const WS = { w5: '5주', w6: '6주', w7: '7주', w9: '9주' };
const TIER = { 3: ['★★★', '핵심'], 2: ['★★', '중요'], 1: ['★', '참고'] };
const rng = () => rngFrom((Date.now() ^ (Math.random() * 1e9)) >>> 0);
const setOf = k => new Set(LS.get(k, []));
function mark(prefix, key, ok) { const W = setOf(prefix + '.wrong'), K = setOf(prefix + '.ok'); if (ok) { W.delete(key); K.add(key); } else { W.add(key); K.delete(key); } LS.set(prefix + '.wrong', [...W]); LS.set(prefix + '.ok', [...K]); }
const oxW = k => (FOX[k] || [])[3];
const termsOfOX = n => FT.filter(t => t[6].includes(n) && t[5] >= 2).slice(0, 6);
const oxChips = t => t[6].length ? `<span class="ft-ox">OX ${t[6].join('·')}번</span>` : '';

/* abbreviation helpers (same rules as the midterm drill) */
const abNorm = s => String(s).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]/g, '').replace(/s$/, '');
function abCheck(input, forms) {
  const a = abNorm(input); if (!a) return false;
  return forms.some(f => abNorm(f) === a || String(f).toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '') === a);
}
function abHL(full, ab) {
  const s = String(full), letters = ab.replace(/[^a-z0-9]/gi, '').toLowerCase(), mk = new Set(); let pos = 0;
  const strong = j => /[A-Z0-9]/.test(s[j]) || j === 0 || /[\s\-–·:,(+/]/.test(s[j - 1]);
  for (const c of letters) {
    let j = -1;
    for (let t = pos; t < s.length; t++) if (s[t].toLowerCase() === c && strong(t)) { j = t; break; }
    if (j < 0) for (let t = pos; t < s.length; t++) if (s[t].toLowerCase() === c) { j = t; break; }
    if (j < 0) break; mk.add(j); pos = j + 1;
  }
  return [...s].map((ch, j) => mk.has(j) ? `<b class="ini">${esc(ch)}</b>` : esc(ch)).join('');
}
const abFull = r => r[1].map(f => abHL(f, r[0])).join(' <span class="cm">/</span> ');
const termSub = t => esc(t[1]);

/* ---------- shared bits ---------- */
const tierBoxes = (id, tiers, count) => [3, 2, 1].map(t => `<div class="ctl tog"><input type="checkbox" id="${id}-t${t}" ${tiers.includes(t) ? 'checked' : ''}><label for="${id}-t${t}">${TIER[t][0]} ${TIER[t][1]} (${count(t)})</label></div>`).join('');
const weekSel = (id, sel) => `<div class="ctl"><label for="${id}-wk">주차</label><select id="${id}-wk"><option value="all">전체</option>${WEEKS.map(w => `<option value="${w}" ${sel.length === 1 && sel[0] === w ? 'selected' : ''}>${WL[w]}</option>`).join('')}</select></div>`;
function progress(list, keyOf, okSet) {
  return `<div class="ab-prog">${[3, 2, 1].map(t => { const a = list.filter(r => r.tier === t), k = a.filter(r => okSet.has(keyOf(r))).length; return `<div class="ab-tier t${t}"><span>${TIER[t][0]} ${TIER[t][1]}</span><div class="oxprog"><i style="width:${a.length ? k / a.length * 100 : 0}%"></i></div><b class="mono">${k}/${a.length}</b></div>`; }).join('')}</div>`;
}
const TL = FT.map((t, k) => ({ k, key: t[0], t, tier: t[5], weeks: t[3] }));
const AL = FA.map((a, k) => ({ k, key: a[0], a, tier: a[3], weeks: a[2] }));

/* ---------- OX practice (100 given questions) ---------- */
function mountOXF(host) {
  let sel = LS.get('fx.weeks', WEEKS.slice()), order = LS.get('fx.order', 'seq'), set = [], i = 0, picks = {};
  const box = document.createElement('div'); host.appendChild(box);
  function newSet(onlyWrong) {
    const W = setOf('fx.wrong'); let p = FOX.map((r, k) => k).filter(k => sel.includes(oxW(k)));
    if (onlyWrong) p = p.filter(k => W.has(k));
    set = order === 'seq' && !onlyWrong ? p : rng().shuffle(p); i = 0; picks = {}; draw();
  }
  function answer(v) { const k = set[i]; if (k == null || picks[k]) return; picks[k] = v; mark('fx', k, FOX[k][1] === v); draw(); }
  function draw() {
    const W = setOf('fx.wrong'), K = setOf('fx.ok'), done = set.filter(k => picks[k]), right = done.filter(k => picks[k] === FOX[k][1]).length;
    let h = `<div class="lab oxq"><div class="lab-head"><span class="tag">OX 100</span>교수님이 준 기말 예상 OX — 시험에 그대로 나온다 · 해설은 자료 원문</div>
<div class="lab-ctl">${WEEKS.map(w => `<div class="ctl tog"><input type="checkbox" id="fx-${w}" ${sel.includes(w) ? 'checked' : ''}><label for="fx-${w}">${WS[w]} (${FOX.filter(r => r[3] === w).length})</label></div>`).join('')}
<div class="abseg">${[['seq', '번호순'], ['mix', '섞기']].map(([m, l]) => `<button class="btn sm ${order === m ? 'pri' : ''}" data-order="${m}">${l}</button>`).join('')}</div>
<button class="btn" data-new>처음부터</button><button class="btn" data-wrong ${W.size ? '' : 'disabled'}>틀린 것만 (${W.size})</button></div><div class="lab-out">
<div class="ab-prog one"><div class="ab-tier t3"><span>맞힌 문항</span><div class="oxprog"><i style="width:${K.size}%"></i></div><b class="mono">${K.size}/100</b></div></div>`;
    if (!set.length) h += '<p>선택한 범위에 문항이 없다.</p>';
    else if (i < set.length) {
      const k = set[i], r = FOX[k], p = picks[k];
      h += `<div class="oxbar"><div class="oxprog"><i style="width:${done.length / set.length * 100}%"></i></div><span class="mono">${i + 1} / ${set.length} · 정답 ${right}</span></div>
<div class="oxcard"><div class="oxmeta"><b class="mono">문제 ${k + 1}</b> · ${WL[r[3]]}${W.has(k) && !p ? ' · <b style="color:var(--bad)">지난번에 틀림</b>' : ''}</div><div class="oxq-t">${esc(r[0])}</div>
<div class="oxbtn"><button data-ox="O" class="o ${p ? (r[1] === 'O' ? 'right' : p === 'O' ? 'wrong' : 'dim') : ''}" ${p ? 'disabled' : ''}>O</button><button data-ox="X" class="x ${p ? (r[1] === 'X' ? 'right' : p === 'X' ? 'wrong' : 'dim') : ''}" ${p ? 'disabled' : ''}>X</button></div>`;
      if (p) { const rel = termsOfOX(k + 1); h += `<div class="model"><div class="mh">${p === r[1] ? '⭕ 정답' : '❌ 오답'} — 정답은 ${r[1]}</div>${esc(r[2])}${rel.length ? `<div class="ft-rel">관련 용어 ${rel.map(t => `<span title="${esc(t[1])}">${esc(t[0])}</span>`).join('')}</div>` : ''}</div><div style="margin-top:12px"><button class="btn pri" data-next>${i + 1 < set.length ? '다음 ▶ (Enter)' : '결과 ▶'}</button></div>`; }
      h += '</div>';
    } else {
      const wr = set.filter(k => picks[k] && picks[k] !== FOX[k][1]);
      h += `<div class="big">${right} / ${done.length}</div><p class="cm">${WEEKS.filter(w => set.some(k => oxW(k) === w)).map(w => { const a = set.filter(k => oxW(k) === w && picks[k]); return `${WS[w]} ${a.filter(k => picks[k] === FOX[k][1]).length}/${a.length}`; }).join(' · ')}</p>`;
      if (wr.length) h += `<div class="oxrev">${wr.map(k => `<div><div class="oxq-t" style="font-size:15.5px"><b class="mono">${k + 1}.</b> ${esc(FOX[k][0])} <b class="mono">→ ${FOX[k][1]}</b></div><div class="cm" style="font-size:14px">${esc(FOX[k][2])}</div></div>`).join('')}</div>`;
      h += `<div style="margin-top:10px;display:flex;gap:8px"><button class="btn pri" data-new>다시</button>${wr.length ? '<button class="btn" data-wrong>틀린 것만</button>' : ''}</div>`;
    }
    box.innerHTML = h + '</div></div>';
    const rd = () => { sel = WEEKS.filter(w => box.querySelector('#fx-' + w).checked); if (!sel.length) sel = WEEKS.slice(); LS.set('fx.weeks', sel); };
    box.querySelectorAll('.lab-ctl input').forEach(c => c.onchange = () => { rd(); newSet(false); });
    box.querySelectorAll('[data-order]').forEach(b => b.onclick = () => { order = b.dataset.order; LS.set('fx.order', order); rd(); newSet(false); });
    box.querySelectorAll('[data-new]').forEach(b => b.onclick = () => { rd(); newSet(false); });
    box.querySelectorAll('[data-wrong]').forEach(b => b.onclick = () => { rd(); newSet(true); });
    box.querySelectorAll('[data-ox]').forEach(b => b.onclick = () => answer(b.dataset.ox));
    const nx = box.querySelector('[data-next]'); if (nx) nx.onclick = () => { i++; draw(); };
  }
  document.addEventListener('keydown', e => {
    if (!box.isConnected || i >= set.length || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const r = box.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const k = e.key.toLowerCase();
    if (!picks[set[i]] && (k === 'o' || k === '0')) { answer('O'); e.preventDefault(); }
    else if (!picks[set[i]] && k === 'x') { answer('X'); e.preventDefault(); }
    else if (picks[set[i]] && (k === 'enter' || k === 'arrowright')) { i++; draw(); e.preventDefault(); }
  });
  newSet(false);
}

/* ---------- OX answer sheet ---------- */
function mountKeyF(host) {
  let f = 'all', cur = -1;
  const box = document.createElement('div'); host.appendChild(box);
  function draw() {
    const W = setOf('fx.wrong'), show = FOX.map((r, k) => k).filter(k => f === 'all' || (f === 'O' || f === 'X' ? FOX[k][1] === f : f === 'wrong' ? W.has(k) : oxW(k) === f));
    let h = `<div class="lab"><div class="lab-head"><span class="tag">정답표</span>번호를 누르면 문제 · 해설 · 관련 용어</div><div class="lab-ctl"><div class="ctl"><label for="fk-f">보기</label><select id="fk-f">${[['all', '전체 100'], ['O', '정답 O만'], ['X', '정답 X만'], ['wrong', '내가 틀린 것'], ...WEEKS.map(w => [w, WL[w]])].map(([v, l]) => `<option value="${v}" ${f === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div><span class="mono cm" style="margin-left:auto">O ${FOX.filter(r => r[1] === 'O').length} · X ${FOX.filter(r => r[1] === 'X').length}${W.size ? ` · 내 오답 ${W.size}` : ''}</span></div><div class="lab-out">`;
    h += `<div class="qkey">${show.map(k => `<button data-k="${k}" class="${FOX[k][1] === 'O' ? 'o' : 'x'}${k === cur ? ' cur' : ''}${W.has(k) ? ' wr' : ''}"><span>${k + 1}</span><b>${FOX[k][1]}</b></button>`).join('') || '<p class="cm">해당 문항이 없다.</p>'}</div>`;
    if (cur >= 0) { const r = FOX[cur], rel = termsOfOX(cur + 1); h += `<div class="model"><div class="mh">문제 ${cur + 1} · ${WL[r[3]]} — 정답 ${r[1]}</div><div class="oxq-t" style="font-size:16px;margin-bottom:6px">${esc(r[0])}</div>${esc(r[2])}${rel.length ? `<div class="ft-rel">관련 용어 ${rel.map(t => `<span title="${esc(t[1])}">${esc(t[0])}</span>`).join('')}</div>` : ''}</div>`; }
    else h += `<p class="cm" style="margin:10px 0 0;font-size:13.5px">빨간 테두리 = 이 브라우저에서 틀린 적 있는 문항. 문제 1~29는 5주, 30~57은 6주, 58~85는 7주, 86~100은 9주 내용이다.</p>`;
    box.innerHTML = h + '</div></div>';
    box.querySelector('#fk-f').onchange = e => { f = e.target.value; cur = -1; draw(); };
    box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { cur = cur === +b.dataset.k ? -1 : +b.dataset.k; draw(); });
  }
  draw();
}

/* ---------- Glossary term cards ---------- */
function mountTerms(host) {
  let tiers = LS.get('ft.tiers', [3]), sel = LS.get('ft.weeks', WEEKS.slice()), mode = LS.get('ft.mode', 'learn'), deck = [], i = 0, st = [], hide = true, onlyOX = LS.get('ft.ox', false);
  if (!['learn', 'rev', 'table'].includes(mode)) mode = 'learn';
  const box = document.createElement('div'); host.appendChild(box);
  const inScope = r => tiers.includes(r.tier) && r.weeks.some(w => sel.includes(w)) && (!onlyOX || r.t[6].length);
  function newDeck(onlyWrong) {
    const W = setOf('ft.wrong'), K = setOf('ft.ok'), R = rng(); let p = TL.filter(inScope); if (onlyWrong) p = p.filter(r => W.has(r.key));
    const rank = r => (W.has(r.key) ? 0 : K.has(r.key) ? 2 : 1) * 10 + (3 - r.tier) * 2 + (r.t[6].length ? 0 : 1);
    deck = R.shuffle(p).sort((a, b) => rank(a) - rank(b)); st = deck.map(() => ({ open: false, ok: null })); i = 0; draw();
  }
  function draw() {
    const W = setOf('ft.wrong'), K = setOf('ft.ok');
    let h = `<div class="lab oxq"><div class="lab-head"><span class="tag">용어</span>용어표 5·6·7·9주 ${FT.length}개 — ★★★ 핵심부터, OX에 나온 용어 먼저</div>
<div class="lab-ctl">${tierBoxes('ft', tiers, t => TL.filter(r => r.tier === t).length)}${weekSel('ft', sel)}
<div class="ctl tog"><input type="checkbox" id="ft-ox" ${onlyOX ? 'checked' : ''}><label for="ft-ox">OX에 나온 용어만</label></div>
<div class="abseg">${[['learn', '용어 → 뜻'], ['rev', '뜻 → 용어'], ['table', '한눈에 표']].map(([m, l]) => `<button class="btn sm ${mode === m ? 'pri' : ''}" data-mode="${m}">${l}</button>`).join('')}</div>
<button class="btn" data-new>섞기</button><button class="btn" data-wrong ${W.size ? '' : 'disabled'}>헷갈린 것만 (${W.size})</button></div><div class="lab-out">${progress(TL, r => r.key, K)}`;
    if (mode === 'table') {
      const list = TL.filter(inScope);
      h += `<div style="display:flex;gap:8px;align-items:center;margin:0 0 8px"><button class="btn sm" data-hide>${hide ? '뜻 보이기' : '뜻 가리기'}</button><span class="cm" style="font-size:13px">${list.length}개${hide ? ' · 가려진 칸을 누르면 하나씩 보인다' : ''}</span></div>`;
      const topics = [...new Set(list.map(r => r.weeks[0] + '|' + r.t[4]))];
      h += '<div class="ft-scroll">' + topics.map(tp => { const [w, name] = tp.split('|'), rows = list.filter(r => r.weeks[0] + '|' + r.t[4] === tp); return `<h4 class="ab-th">${WS[w]} · ${esc(name)}</h4><div class="ab-tbl ft-tbl">${rows.map(r => `<div class="${W.has(r.key) ? 'wr' : K.has(r.key) ? 'kn' : ''}"><b><span class="ab-badge t${r.tier}">${TIER[r.tier][0]}</span> ${esc(r.t[0])}</b><div><div class="ab-mean">${termSub(r.t)} ${oxChips(r.t)}</div><div class="ft-def ${hide ? 'veil' : ''}" data-veil>${esc(r.t[2])}</div></div></div>`).join('')}</div>`; }).join('') + '</div>' + (list.length ? '' : '<p>선택한 범위에 용어가 없다.</p>');
    } else if (!deck.length) h += '<p>선택한 범위에 용어가 없다. 중요도나 주차를 넓혀 보자.</p>';
    else if (i < deck.length) {
      const r = deck[i], s = st[i], t = r.t;
      h += `<div class="oxbar"><div class="oxprog"><i style="width:${i / deck.length * 100}%"></i></div><span class="mono">${i + 1} / ${deck.length}</span></div>
<div class="oxcard"><div class="oxmeta"><span class="ab-badge t${r.tier}">${TIER[r.tier][0]} ${TIER[r.tier][1]}</span> ${r.weeks.map(w => WS[w]).join(', ')} · ${esc(t[4])} ${oxChips(t)}${W.has(r.key) && s.ok == null ? ' · <b style="color:var(--bad)">지난번에 헷갈림</b>' : ''}</div>`;
      if (mode === 'learn') h += `<div class="ft-term">${esc(t[0])}</div>${s.open ? `<div class="ab-mean" style="font-size:15px">${termSub(t)}</div><div class="ft-def big">${esc(t[2])}</div>` : '<p class="cm" style="margin:0 0 10px;font-size:14px">뜻을 내 말로 떠올려 본 뒤 펼친다.</p>'}`;
      else h += `<div class="ft-def big q">${esc(t[2])}</div>${s.open ? `<div class="ft-term">${esc(t[0])}</div><div class="ab-mean" style="font-size:15px">${termSub(t)}</div>` : '<p class="cm" style="margin:0 0 10px;font-size:14px">이 설명이 가리키는 용어는?</p>'}`;
      if (!s.open) h += `<button class="btn pri" data-open>펼치기 (Space)</button>`;
      else if (s.ok == null) h += `<div class="ab-self"><button class="btn ok" data-self="1">알았다 ✓ (1)</button><button class="btn no" data-self="0">헷갈렸다 ✗ (2)</button></div>`;
      else h += `<div style="margin-top:10px"><button class="btn pri" data-next>다음 ▶</button></div>`;
      h += '</div>';
    } else { const ok = st.filter(s => s.ok).length; h += `<div class="big">${ok} / ${deck.length}</div><p>${deck.length - ok ? `헷갈린 ${deck.length - ok}개는 다음 판에 맨 앞에 나온다.` : '이 범위는 전부 알았다. 중요도를 넓혀 보자.'}</p><button class="btn pri" data-new>다시 섞기</button>`; }
    box.innerHTML = h + '</div></div>';
    const rd = () => { tiers = [3, 2, 1].filter(t => box.querySelector('#ft-t' + t).checked); if (!tiers.length) tiers = [3]; const v = box.querySelector('#ft-wk').value; sel = v === 'all' ? WEEKS.slice() : [v]; onlyOX = box.querySelector('#ft-ox').checked; LS.set('ft.tiers', tiers); LS.set('ft.weeks', sel); LS.set('ft.ox', onlyOX); };
    box.querySelectorAll('.lab-ctl input, .lab-ctl select').forEach(c => c.onchange = () => { rd(); newDeck(false); });
    box.querySelectorAll('[data-new]').forEach(b => b.onclick = () => { rd(); newDeck(false); });
    box.querySelector('[data-wrong]').onclick = () => { rd(); if (mode === 'table') mode = 'learn'; newDeck(true); };
    box.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; LS.set('ft.mode', mode); rd(); newDeck(false); });
    const hb = box.querySelector('[data-hide]'); if (hb) hb.onclick = () => { hide = !hide; draw(); };
    box.querySelectorAll('[data-veil]').forEach(v => v.onclick = () => v.classList.remove('veil'));
    const op = box.querySelector('[data-open]'); if (op) op.onclick = () => { st[i].open = true; draw(); };
    box.querySelectorAll('[data-self]').forEach(b => b.onclick = () => self(b.dataset.self === '1'));
    const nx = box.querySelector('[data-next]'); if (nx) nx.onclick = () => { i++; draw(); };
  }
  function self(ok) { st[i].ok = ok; mark('ft', deck[i].key, ok); draw(); }
  document.addEventListener('keydown', e => {
    if (!box.isConnected || mode === 'table' || i >= deck.length || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const r = box.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const s = st[i];
    if (!s.open && (e.key === ' ' || e.key === 'Enter')) { s.open = true; draw(); e.preventDefault(); }
    else if (s.open && s.ok == null && (e.key === '1' || e.key === '2')) { self(e.key === '1'); e.preventDefault(); }
    else if (s.ok != null && (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ')) { i++; draw(); e.preventDefault(); }
  });
  newDeck(false);
}

/* ---------- Abbreviation → full name ---------- */
function mountAbbrF(host) {
  let tiers = LS.get('fa.tiers', [3]), sel = LS.get('fa.weeks', WEEKS.slice()), mode = LS.get('fa.mode', 'learn'), deck = [], i = 0, st = [], hide = true;
  if (!['learn', 'write', 'table'].includes(mode)) mode = 'learn';
  const box = document.createElement('div'); host.appendChild(box);
  const inScope = r => tiers.includes(r.tier) && r.weeks.some(w => sel.includes(w));
  function newDeck(onlyWrong) {
    const W = setOf('fa.wrong'), K = setOf('fa.ok'), R = rng(); let p = AL.filter(inScope); if (onlyWrong) p = p.filter(r => W.has(r.key));
    const rank = r => (W.has(r.key) ? 0 : K.has(r.key) ? 2 : 1) * 10 + (3 - r.tier);
    deck = R.shuffle(p).sort((a, b) => rank(a) - rank(b)); st = deck.map(() => ({ v: '', ok: null, open: false })); i = 0; draw();
  }
  function draw() {
    const W = setOf('fa.wrong'), K = setOf('fa.ok');
    let h = `<div class="lab oxq"><div class="lab-head"><span class="tag">약어</span>용어표 부록 5·6·7·9주 약어 ${FA.length}개 → 영문 원래 이름</div>
<div class="lab-ctl">${tierBoxes('fa', tiers, t => AL.filter(r => r.tier === t).length)}${weekSel('fa', sel)}
<div class="abseg">${[['learn', '외우기'], ['write', '쓰기 시험'], ['table', '한눈에 표']].map(([m, l]) => `<button class="btn sm ${mode === m ? 'pri' : ''}" data-mode="${m}">${l}</button>`).join('')}</div>
<button class="btn" data-new>섞기</button><button class="btn" data-wrong ${W.size ? '' : 'disabled'}>틀린 것만 (${W.size})</button></div><div class="lab-out">${progress(AL, r => r.key, K)}`;
    if (mode === 'table') {
      const list = AL.filter(inScope);
      h += `<div style="display:flex;gap:8px;align-items:center;margin:0 0 8px"><button class="btn sm" data-hide>${hide ? '원래 이름 보이기' : '원래 이름 가리기'}</button></div>`;
      h += [3, 2, 1].filter(t => list.some(r => r.tier === t)).map(t => `<h4 class="ab-th t${t}">${TIER[t][0]} ${TIER[t][1]}</h4><div class="ab-tbl">${list.filter(r => r.tier === t).map(r => `<div class="${W.has(r.key) ? 'wr' : K.has(r.key) ? 'kn' : ''}"><b class="mono">${esc(r.key)}</b><div><div class="ab-full ${hide ? 'veil' : ''}" data-veil>${abFull(r.a)}</div><div class="ab-mean">${esc(r.a[4])}</div></div></div>`).join('')}</div>`).join('') || '<p>선택한 범위에 약어가 없다.</p>';
    } else if (!deck.length) h += '<p>선택한 범위에 약어가 없다.</p>';
    else if (i < deck.length) {
      const r = deck[i], s = st[i];
      h += `<div class="oxbar"><div class="oxprog"><i style="width:${i / deck.length * 100}%"></i></div><span class="mono">${i + 1} / ${deck.length}</span></div>
<div class="oxcard"><div class="oxmeta"><span class="ab-badge t${r.tier}">${TIER[r.tier][0]} ${TIER[r.tier][1]}</span> ${r.weeks.map(w => WS[w]).join(', ')}${W.has(r.key) && s.ok == null ? ' · <b style="color:var(--bad)">지난번에 틀림</b>' : ''}</div><div class="ab-big mono">${esc(r.key)}</div>`;
      const card = `<div class="ab-full big">${abFull(r.a)}</div><div class="ab-mean">${esc(r.a[4])}</div>`;
      if (mode === 'learn') {
        if (!s.open) h += `<p class="cm" style="margin:0 0 10px;font-size:14px">원래 이름을 머릿속으로 말해 본 뒤 펼친다.</p><button class="btn pri" data-open>펼치기 (Space)</button>`;
        else h += card + (s.ok == null ? `<div class="ab-self"><button class="btn ok" data-self="1">알았다 ✓ (1)</button><button class="btn no" data-self="0">헷갈렸다 ✗ (2)</button></div>` : `<div style="margin-top:10px"><button class="btn pri" data-next>다음 ▶</button></div>`);
      } else {
        h += `<input type="text" class="ab-in" data-in value="${esc(s.v)}" ${s.ok != null ? 'disabled' : ''} autocomplete="off" spellcheck="false" placeholder="원래 이름을 영어로 · Enter로 채점">`;
        if (s.ok != null) h += `<div class="model"><div class="mh">${s.ok ? '⭕ 정답' : '❌ 오답'}${!s.ok ? ' <button class="btn sm" data-ov>맞은 걸로</button>' : ''}</div>${card}</div><div style="margin-top:10px"><button class="btn pri" data-next>다음 ▶</button></div>`;
        else h += `<div style="margin-top:10px;display:flex;gap:8px"><button class="btn pri" data-chk>채점</button><button class="btn" data-skip>모르겠다</button></div>`;
      }
      h += '</div>';
    } else { const ok = st.filter(s => s.ok).length; h += `<div class="big">${ok} / ${deck.length}</div><p>${deck.length - ok ? `틀린 ${deck.length - ok}개는 다음 판에 맨 앞에 나온다.` : '이 범위는 전부 외웠다.'}</p><button class="btn pri" data-new>다시 섞기</button>`; }
    box.innerHTML = h + '</div></div>';
    const rd = () => { tiers = [3, 2, 1].filter(t => box.querySelector('#fa-t' + t).checked); if (!tiers.length) tiers = [3]; const v = box.querySelector('#fa-wk').value; sel = v === 'all' ? WEEKS.slice() : [v]; LS.set('fa.tiers', tiers); LS.set('fa.weeks', sel); };
    box.querySelectorAll('.lab-ctl input, .lab-ctl select').forEach(c => c.onchange = () => { rd(); newDeck(false); });
    box.querySelectorAll('[data-new]').forEach(b => b.onclick = () => { rd(); newDeck(false); });
    box.querySelector('[data-wrong]').onclick = () => { rd(); if (mode === 'table') mode = 'learn'; newDeck(true); };
    box.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { mode = b.dataset.mode; LS.set('fa.mode', mode); rd(); newDeck(false); });
    const hb = box.querySelector('[data-hide]'); if (hb) hb.onclick = () => { hide = !hide; draw(); };
    box.querySelectorAll('[data-veil]').forEach(v => v.onclick = () => v.classList.remove('veil'));
    const next = () => { i++; draw(); const n = box.querySelector('[data-in]') || box.querySelector('[data-open]'); if (n) n.focus({ preventScroll: true }); };
    const op = box.querySelector('[data-open]'); if (op) op.onclick = () => { st[i].open = true; draw(); };
    box.querySelectorAll('[data-self]').forEach(b => b.onclick = () => res(b.dataset.self === '1'));
    const inp = box.querySelector('[data-in]');
    if (inp) { inp.oninput = () => st[i].v = inp.value; inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); if (st[i].ok == null) res(abCheck(inp.value, deck[i].a[1])); } }; }
    const c = box.querySelector('[data-chk]'); if (c) c.onclick = () => res(abCheck(inp.value, deck[i].a[1]));
    const sk = box.querySelector('[data-skip]'); if (sk) sk.onclick = () => res(false);
    const ov = box.querySelector('[data-ov]'); if (ov) ov.onclick = () => res(true);
    const nx = box.querySelector('[data-next]'); if (nx) nx.onclick = next;
    box._next = next;
  }
  function res(ok) { st[i].ok = ok; mark('fa', deck[i].key, ok); draw(); const n = box.querySelector('[data-next]'); if (n) n.focus({ preventScroll: true }); }
  document.addEventListener('keydown', e => {
    if (!box.isConnected || mode !== 'learn' || i >= deck.length || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const r = box.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const s = st[i];
    if (!s.open && (e.key === ' ' || e.key === 'Enter')) { s.open = true; draw(); e.preventDefault(); }
    else if (s.open && s.ok == null && (e.key === '1' || e.key === '2')) { res(e.key === '1'); e.preventDefault(); }
    else if (s.ok != null && (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ')) { box._next(); e.preventDefault(); }
  });
  newDeck(false);
}

/* ---------- Mock final exam ---------- */
const SIZES = { s: ['짧게', 30, 5, 5], m: ['기본', 50, 10, 10], l: ['실전', 100, 15, 15] };
function mountExamF(host) {
  let cfg = LS.get('fe.cfg', { size: 'm', weeks: WEEKS.slice() }), ex = LS.get('fe.cur', null), i = 0;
  if (!SIZES[cfg.size]) cfg.size = 'm';
  if (ex && !ex.v2) ex = null;
  const box = document.createElement('div'); host.appendChild(box);
  const save = () => LS.set('fe.cur', ex);
  function build() {
    const R = rng(), [, nOx, nAb, nTm] = SIZES[cfg.size], sel = cfg.weeks.length ? cfg.weeks : WEEKS;
    const pick = (arr, n, first) => R.shuffle(arr.filter(first)).concat(R.shuffle(arr.filter(x => !first(x)))).slice(0, n);
    const XW = setOf('fx.wrong'), XK = setOf('fx.ok');
    const oxPool = FOX.map((r, k) => k).filter(k => sel.includes(oxW(k)));
    const oxs = (nOx >= oxPool.length ? R.shuffle(oxPool) : R.shuffle(pick(oxPool, nOx, k => XW.has(k) || !XK.has(k)))).map(k => ({ t: 'ox', k, pick: null }));
    const AW = setOf('fa.wrong'), ap = AL.filter(r => r.tier >= 2 && r.weeks.some(w => sel.includes(w)));
    const n3 = Math.ceil(nAb * 3 * 0.75), a3 = pick(ap.filter(r => r.tier === 3), n3, r => AW.has(r.key));
    const aSel = R.shuffle(a3.concat(pick(ap.filter(r => !a3.includes(r)), nAb * 3 - a3.length, r => AW.has(r.key))));
    const abs = []; for (let k = 0; k < nAb && aSel.length >= (k + 1) * 3; k++) abs.push({ t: 'ab', keys: aSel.slice(k * 3, k * 3 + 3).map(r => r.k), ans: [], ov: [], checked: false });
    const TW = setOf('ft.wrong'), tp = TL.filter(r => r.tier === 3 && r.weeks.some(w => sel.includes(w)) && r.t[2].length > 12);
    const tms = pick(tp, nTm, r => TW.has(r.key) || r.t[6].length > 0).map(r => {
      const same = TL.filter(o => o.k !== r.k && o.weeks[0] === r.weeks[0] && o.tier >= 2 && o.t[4] === r.t[4]);
      const more = TL.filter(o => o.k !== r.k && o.weeks[0] === r.weeks[0] && o.tier >= 2 && !same.includes(o));
      const dis = R.shuffle(same).concat(R.shuffle(more)).slice(0, 3).map(o => o.k);
      return { t: 'tm', k: r.k, opts: R.shuffle([r.k, ...dis]), pick: null };
    });
    ex = { v2: 1, size: cfg.size, weeks: sel, items: oxs.concat(abs, tms) }; i = 0; save(); draw();
  }
  const abOk = (it, j) => it.ov[j] != null ? it.ov[j] : abCheck(it.ans[j] || '', FA[it.keys[j]][1]);
  const grade = it => it.t === 'ox' ? (it.pick && it.pick === FOX[it.k][1] ? 1 : 0) : it.t === 'ab' ? (it.checked ? it.keys.filter((_, j) => abOk(it, j)).length : 0) : (it.pick === it.k ? 1 : 0);
  const maxOf = it => it.t === 'ab' ? it.keys.length : 1;
  const answered = it => it.t === 'ab' ? it.checked : it.pick != null;
  const TYPE = { ox: 'OX', ab: '약어 원래 이름', tm: '용어 고르기' };
  function draw() {
    let h = `<div class="lab oxq mt"><div class="lab-head"><span class="tag">기말 모의시험</span>OX(예상문제 100에서만) · 약어 원래 이름 · 용어 — 틀린 것과 아직 못 맞힌 것 먼저</div>
<div class="lab-ctl"><div class="ctl"><label for="fe-size">분량</label><select id="fe-size">${Object.entries(SIZES).map(([k, v]) => `<option value="${k}" ${cfg.size === k ? 'selected' : ''}>${v[0]} · OX ${v[1]} + 약어 ${v[2]}×3 + 용어 ${v[3]}</option>`).join('')}</select></div>
${WEEKS.map(w => `<div class="ctl tog"><input type="checkbox" id="fe-${w}" ${cfg.weeks.includes(w) ? 'checked' : ''}><label for="fe-${w}">${WS[w]}</label></div>`).join('')}
<button class="btn pri" data-new>새 시험지</button></div><div class="lab-out">`;
    if (!ex) { h += '<p>분량과 범위를 고르고 <b>새 시험지</b>를 누르면 시작한다. OX는 예상문제 100에서만 나오고, “실전”은 범위 안의 100문항을 전부 섞어 낸다. 약어는 ★★★ 75% 이상, 용어는 ★★★에서만 나온다.</p>'; box.innerHTML = h + '</div></div>'; bind(); return; }
    const its = ex.items;
    h += `<div class="mt-comp"><span>OX <b>${its.filter(x => x.t === 'ox').length}</b></span><span>약어 <b>${its.filter(x => x.t === 'ab').length}</b> <i>(×3)</i></span><span>용어 <b>${its.filter(x => x.t === 'tm').length}</b></span><span class="mt-past">${ex.weeks.map(w => WS[w]).join(' · ')}</span></div>`;
    h += `<div class="oxdots">${its.map((r, k) => `<button data-go="${k}" class="${k === i ? 'cur' : answered(r) ? (grade(r) >= maxOf(r) ? 'ok' : grade(r) > 0 ? 'part' : 'no') : ''} t-${r.t}">${k + 1}</button>`).join('')}<button data-go="${its.length}" class="${i >= its.length ? 'cur' : ''}" style="width:auto;padding:0 8px">결과</button></div>`;
    if (i < its.length) {
      const it = its[i], first = its.findIndex(x => x.t === it.t), last = its.length - 1 - [...its].reverse().findIndex(x => x.t === it.t);
      h += `<div class="oxcard"><div class="oxmeta">${TYPE[it.t]} ${i - first + 1}/${last - first + 1}${it.t === 'ox' ? ` · <b class="mono">문제 ${it.k + 1}</b> · ${WS[oxW(it.k)]}` : ''}</div>`;
      if (it.t === 'ox') {
        const r = FOX[it.k], p = it.pick;
        h += `<div class="oxq-t">${esc(r[0])}</div><div class="oxbtn"><button data-ox="O" class="o ${p ? (r[1] === 'O' ? 'right' : p === 'O' ? 'wrong' : 'dim') : ''}" ${p ? 'disabled' : ''}>O</button><button data-ox="X" class="x ${p ? (r[1] === 'X' ? 'right' : p === 'X' ? 'wrong' : 'dim') : ''}" ${p ? 'disabled' : ''}>X</button></div>`;
        if (p) h += `<div class="model"><div class="mh">${p === r[1] ? '⭕ 정답' : '❌ 오답'} — 정답은 ${r[1]}</div>${esc(r[2])}</div>`;
      } else if (it.t === 'ab') {
        h += `<div class="oxq-t">다음 약어의 원래 이름(full name)을 모두 적으시오.</div><div class="ab-rows">${it.keys.map((k, j) => { const a = FA[k], ok = abOk(it, j); return `<div class="ab-row ${it.checked ? (ok ? 'ok' : 'no') : ''}"><b class="mono">${esc(a[0])}</b><input type="text" data-ab="${j}" value="${esc(it.ans[j] || '')}" ${it.checked ? 'disabled' : ''} autocomplete="off" spellcheck="false" placeholder="영문 원래 이름">${it.checked ? `<div class="ab-ans">${ok ? '⭕' : '❌'} ${abFull(a)}${!ok ? ` <button class="btn sm" data-ov="${j}">맞은 걸로</button>` : it.ov[j] ? ` <button class="btn sm" data-ov="${j}">취소</button>` : ''}</div>` : ''}</div>`; }).join('')}</div>`;
        if (!it.checked) h += `<div style="margin-top:10px"><button class="btn pri" data-abchk>채점</button> <span class="cm" style="font-size:13px">대소문자 · 띄어쓰기 · 하이픈 · 괄호 속 보충 설명은 무시한다</span></div>`;
      } else {
        const t = FT[it.k];
        h += `<div class="oxq-t">다음 설명에 해당하는 용어는?</div><div class="ft-def big q">${esc(t[2])}</div><div class="ft-choice">${it.opts.map((k, j) => `<button data-tm="${k}" class="${it.pick != null ? (k === it.k ? 'right' : k === it.pick ? 'wrong' : 'dim') : ''}" ${it.pick != null ? 'disabled' : ''}><span class="mono">${j + 1}</span> ${esc(FT[k][0])}</button>`).join('')}</div>`;
        if (it.pick != null) h += `<div class="model"><div class="mh">${it.pick === it.k ? '⭕ 정답' : '❌ 오답'} — ${esc(t[0])}</div>${termSub(t)}</div>`;
      }
      if (answered(it)) h += `<div style="margin-top:12px"><button class="btn pri" data-go="${i + 1}">${i + 1 < its.length ? '다음 문제 ▶' : '결과 보기 ▶'}</button></div>`;
      h += '</div>';
    } else {
      const sum = f => its.filter(f).reduce((s, x) => s + grade(x), 0), mx = f => its.filter(f).reduce((s, x) => s + maxOf(x), 0);
      const rows = [['OX', x => x.t === 'ox'], ['약어 원래 이름', x => x.t === 'ab'], ['용어 고르기', x => x.t === 'tm']];
      const tot = sum(() => true), tmx = mx(() => true), un = its.filter(x => !answered(x)).length;
      h += `<div class="big" style="margin-bottom:4px">${tot} / ${tmx}</div><p class="mono cm" style="margin:0 0 10px">${Math.round(tot / tmx * 100)}%${un ? ` · 안 푼 문제 ${un}` : ''}</p>`;
      h += T(['유형', '점수', '정답률'], rows.filter(([, f]) => its.some(f)).map(([l, f]) => [l, `${sum(f)} / ${mx(f)}`, `${Math.round(sum(f) / Math.max(1, mx(f)) * 100)}%`]));
      h += `<p class="cm" style="font-size:14px">OX 주차별 — ${WEEKS.filter(w => its.some(x => x.t === 'ox' && oxW(x.k) === w)).map(w => { const r = its.filter(x => x.t === 'ox' && oxW(x.k) === w); return `${WS[w]} ${r.filter(x => grade(x)).length}/${r.length}`; }).join(' · ')}</p>`;
      const wr = its.filter(x => answered(x) && grade(x) < maxOf(x));
      if (wr.length) h += `<p><b>다시 볼 문제 ${wr.length}개</b> — 각 연습과 다음 시험지에 먼저 나온다</p><div class="oxrev">${wr.map(x => x.t === 'ox' ? `<div><div class="oxq-t" style="font-size:15.5px"><b class="mono">${x.k + 1}.</b> ${esc(FOX[x.k][0])} <b class="mono">→ ${FOX[x.k][1]}</b></div><div class="cm" style="font-size:14px">${esc(FOX[x.k][2])}</div></div>` : x.t === 'ab' ? `<div><div class="oxq-t" style="font-size:15.5px">${x.keys.map(k => `<b class="mono">${esc(FA[k][0])}</b> = ${esc(FA[k][1][0])}`).join('<br>')}</div></div>` : `<div><div class="oxq-t" style="font-size:15.5px"><b>${esc(FT[x.k][0])}</b> — ${termSub(FT[x.k])}</div><div class="cm" style="font-size:14px">${esc(FT[x.k][2])}</div></div>`).join('')}</div>`;
      h += `<div style="margin-top:10px"><button class="btn pri" data-new>새 시험지</button></div>`;
    }
    box.innerHTML = h + '</div></div>'; bind();
  }
  function bind() {
    box.querySelectorAll('[data-new]').forEach(b => b.onclick = () => { cfg = { size: box.querySelector('#fe-size').value, weeks: WEEKS.filter(w => box.querySelector('#fe-' + w).checked) }; if (!cfg.weeks.length) cfg.weeks = WEEKS.slice(); LS.set('fe.cfg', cfg); build(); });
    box.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { i = +b.dataset.go; draw(); });
    if (!ex || i >= ex.items.length) return;
    const it = ex.items[i];
    box.querySelectorAll('[data-ox]').forEach(b => b.onclick = () => ans(b.dataset.ox));
    box.querySelectorAll('[data-tm]').forEach(b => b.onclick = () => ans(+b.dataset.tm));
    box.querySelectorAll('[data-ab]').forEach(inp => { inp.oninput = () => { it.ans[+inp.dataset.ab] = inp.value; save(); }; inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const n = box.querySelector(`[data-ab="${+inp.dataset.ab + 1}"]`); if (n) n.focus(); else chk(); } }; });
    const ac = box.querySelector('[data-abchk]'); if (ac) ac.onclick = chk;
    box.querySelectorAll('[data-ov]').forEach(b => b.onclick = () => { const j = +b.dataset.ov; it.ov[j] = it.ov[j] ? null : true; mark('fa', FA[it.keys[j]][0], abOk(it, j)); save(); draw(); });
    function chk() { it.checked = true; it.keys.forEach((k, j) => mark('fa', FA[k][0], abOk(it, j))); save(); draw(); }
  }
  function ans(v) {
    const it = ex && ex.items[i]; if (!it || it.pick != null || it.t === 'ab') return;
    it.pick = v;
    if (it.t === 'ox') mark('fx', it.k, FOX[it.k][1] === v); else mark('ft', FT[it.k][0], v === it.k);
    save(); draw();
  }
  document.addEventListener('keydown', e => {
    if (!box.isConnected || !ex || i >= ex.items.length || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    const r = box.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const it = ex.items[i], k = e.key.toLowerCase();
    if (it.t === 'ox' && !it.pick && (k === 'o' || k === '0')) { ans('O'); e.preventDefault(); }
    else if (it.t === 'ox' && !it.pick && k === 'x') { ans('X'); e.preventDefault(); }
    else if (it.t === 'tm' && it.pick == null && /^[1-4]$/.test(k) && it.opts[+k - 1] != null) { ans(it.opts[+k - 1]); e.preventDefault(); }
    else if ((k === 'enter' || k === 'arrowright') && answered(it)) { i++; draw(); e.preventDefault(); }
  });
  draw();
}

const cnt = (arr, f) => arr.filter(f).length;
addWeek({ id: 'fn', num: 'F', short: '기말', title: '기말 대비 — OX 100 · 용어 · 약어', range: '5·6·7·9주차',
  lead: '기말 필기(12/7)는 <b>OX와 용어만</b> 나오고, OX는 미리 준 <b>예상문제 100개가 그대로</b> 나온다. 그래서 OX는 그 100문항만 반복하고, 용어는 용어표(5·6·7·9주)를 <b>중요도 3단계</b>로 나눠 ★★★부터 외운다.',
  sections: [
{ id: 'fn.guide', title: '기말 공부 지도', slides: '기말 필기 · 용어표 Week5-9',
  blocks: [
    T(['범위', 'OX 예상문제', '용어 ★★★', '용어 ★★', '용어 ★', '약어 ★★★ / 전체'], WEEKS.map(w => [WL[w], `${cnt(FOX, r => r[3] === w)}문항`, cnt(FT, t => t[3][0] === w && t[5] === 3), cnt(FT, t => t[3][0] === w && t[5] === 2), cnt(FT, t => t[3][0] === w && t[5] === 1), `${cnt(FA, a => a[2][0] === w && a[3] === 3)} / ${cnt(FA, a => a[2][0] === w)}`]).concat([['<b>합계</b>', '<b>100</b>', `<b>${cnt(FT, t => t[5] === 3)}</b>`, cnt(FT, t => t[5] === 2), cnt(FT, t => t[5] === 1), `<b>${cnt(FA, a => a[3] === 3)}</b> / ${FA.length}`]])),
    H.key(`<b>중요도 기준</b><br>★★★ 핵심 = 예상 OX 100의 정답 근거가 되는 개념 + 강의 필기에서 강조된 용어 (${cnt(FT, t => t[5] === 3)}개).<br>★★ 중요 = 개념 설명에 함께 나오는 용어 · 헤더 · 상태 코드 (${cnt(FT, t => t[5] === 2)}개).<br>★ 참고 = 실습 명령어 · 라이브러리 · 세부 옵션 (${cnt(FT, t => t[5] === 1)}개).<br>용어 카드의 <b>“OX n번”</b> 표시는 그 용어가 예상 OX 문장에 직접 나온다는 뜻 — ${cnt(FT, t => t[6].length)}개.`),
    `<ol><li><b>OX 100</b>(F.2)을 번호순으로 한 바퀴. 틀린 것만 다시 돌려서 0개가 될 때까지. 해설은 예상문제 파일의 원문이다.</li><li><b>정답표</b>(F.3)로 O/X만 빠르게 훑는다 — “정답 X만” 보기로 함정 문장을 모아 보면 좋다.</li><li><b>용어</b>(F.4) — ★★★만 켜고 “용어 → 뜻”, 익숙해지면 “뜻 → 용어”. “OX에 나온 용어만”으로 좁힐 수도 있다.</li><li><b>약어</b>(F.5) — 중간고사처럼 원래 이름 쓰기. ★★★ ${cnt(FA, a => a[3] === 3)}개부터.</li><li><b>모의시험</b>(F.6)으로 섞어서 확인. 결과는 유형별 · 주차별로.</li></ol>`,
    H.note('용어 시험이 “약어 원래 이름 쓰기”인지 “뜻 ↔ 용어”인지 아직 모르니 둘 다 준비했다. 기록은 이 브라우저에 저장되고, 연습과 모의시험이 같은 기록을 쓴다.'),
  ] },
{ id: 'fn.ox', title: '기말 OX 예상문제 100', slides: '네트워크__기말_OX100.xlsx', tag: '그대로 출제', blocks: [{ mount: mountOXF }] },
{ id: 'fn.key', title: 'OX 100 정답표', slides: 'O 50 · X 50', tag: '정답', blocks: [{ mount: mountKeyF }] },
{ id: 'fn.terms', title: '용어 → 뜻 (중요도순)', slides: '용어표 Week5 · 6 · 7 · 9', tag: '용어', blocks: [{ mount: mountTerms }] },
{ id: 'fn.abbr', title: '약어 → 원래 이름', slides: '용어표 부록 Acronyms', tag: '용어', blocks: [{ mount: mountAbbrF }] },
{ id: 'fn.exam', title: '기말 모의시험', slides: 'OX + 용어', tag: '실전', blocks: [{ mount: mountExamF }] },
] });
})();
