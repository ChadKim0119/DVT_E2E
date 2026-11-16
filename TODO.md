# DVT 및 E2E 운영방안 논의 — 인수인계 · TODO

- 공개 주소: https://gsp-dvt.vercel.app (Vercel 프로젝트 `gsp-dvt`, 팀 vibe-code-class, 로그인 보호 꺼짐)
- 저장소: `ChadKim0119/DVT_E2E` (`main`, **public**). 2026.11.14 에 `ChadKim0119/ccb` 의 `dvt-board` 브랜치(이전 시점 커밋 `e8338cb`)에서 이전함. 이전 이력은 ccb 쪽에 남아 있고, acos-ccb 보드와는 별개
- 현재 버전: v2.1 (2026.11.14) · 메인 3장(현황과 쟁점 · 제안 · 실행과 공수 전제) + Timeline + Appendix 11장. 근거는 메인에서 서랍(`ev:` 키, content.js `deck.ev`)으로 열리고 [부록에서 자세히 보기]로 Appendix 이동
- 구성 원칙: 결론 먼저(액션 타이틀) · SCQA · 대안 비교 후 권고 · 결정 요청 · 근거는 부록(피라미드 원칙, 커스텀 적용). 고객 전달용은 사실 · 요청 중심(내부 협상 논리 · 실명 제외)
- 기반 자료: 11/14 DVT·E2E 논의 회의록 + 화이트보드 사진 3장(미반영 불확실 항목: 12/30의 의미, VDP 2/24·HU 3/9 수치 기준)
- 데이터 기준: Confluence GSP 3차 DVT 결과 v4(11/12 누적), PM 정례 10/07·10/21·10/28·11/03·11/11, E2E 사전준비(11/11), GSP DB 이슈트래킹(11/11)
- 스타일·엔진 원본: acos-ccb 핸드오프 문서 https://claude.ai/artifact/Jb2H7fU6BsKfnhW3UA2qbp (구성 요소 1~7번 엔진 재사용)

## 파일 구조

| 파일 | 역할 |
|---|---|
| `src/content.js` | 화면의 모든 문구·숫자. 고칠 곳은 대부분 여기 |
| `src/app.js` | 페이지 렌더 함수(vSummary·vRounds·vWhy·vRemain·vPlan·Appendix)와 패널 내용(panelContent). `/*__ENGINE__*/` 자리에 engine.js가 들어감 |
| `src/engine.js` | ccb 엔진(페이지 넘김·레일·fit·휠·토글·패널·합계 오버레이·전체 화면) — 가능하면 수정하지 않음 |
| `src/shell_head.html` · `src/extra.css` | ccb CSS·셸 / DVT 보드 전용 CSS |
| `src/editor.js` | 화면 편집 기능(글자·도형·색상, 저장). `/*__EDITOR__*/` 자리에 들어감 |
| `src/assemble.py` · `src/build_html.js` | 조립·빌드 |
| `edits.json` | 화면 편집 결과(런타임에 불러와 덮어씀). 편집 화면의 [저장]이 이 파일을 커밋 |
| `index.html` | 배포물(빌드 결과를 루트로 복사) |

## 빌드·배포

```bash
cd src
python3 assemble.py              # shell_head + extra.css + app.js + engine.js + editor.js → page.html
node build_html.js               # content.js 를 page.html 에 넣어 out/index.html 생성
cp out/index.html ../index.html  # 루트 배포물 갱신
```

## 화면 편집 (✎ 편집)

상단 바의 **✎ 편집**을 켜면 화면을 직접 고칠 수 있다. 폭 980px 이상(발표 화면)에서만 동작.

| 하고 싶은 것 | 방법 |
|---|---|
| 글자 수정 | 글자를 **더블클릭** → 입력. **Enter** = 줄바꿈(한글 입력 중에도 한 번에 적용), **Esc** · 바깥 클릭 · **Ctrl/⌘+Enter** = 확정. 여러 줄 붙여넣기도 줄바꿈이 유지됨. 가로 배치(flex) 블록도 줄바꿈이 들어가면 줄이 실제로 나뉨 |
| 블록 이동 | 블록(문단 · 항목 · 카드 · 표 행) 클릭 → 툴바 **▲ 위로 / ▼ 아래로** 또는 **Alt+↑ / Alt+↓**. 같은 묶음 안에서 한 칸씩 이동. 맨 위라면 **↑ 상위**로 바깥 블록을 골라 통째로 이동. 저장 시 edits.json 의 `moves` 에 기록되고, 이동한 블록의 글자·서식 수정도 그대로 따라감 |
| 글자 서식 | **굵게 B · 기울임 I · 밑줄 U · 취소선 S**: 글자를 편집 중이면 **선택한 글자에만**(Ctrl/⌘+B·I·U 도 가능), 블록·글상자를 선택만 한 상태면 **전체**에 적용. **A− / A+** 는 블록·글상자 전체 크기(2px씩). 선택한 쪽의 현재 상태가 버튼에 눌린 모양으로 표시됨 |
| 블록 색 | **선택** 상태에서 블록 클릭 → 툴바의 배경·글자 색. 안쪽 글자만 잡히면 **↑ 상위**로 바깥 블록 선택. [서식 초기화]로 색·굵기·크기 수정을 한꺼번에 취소 |
| 도형 | 툴바에서 사각형·원·선·화살표·글상자 고르고 드래그. 이동은 드래그, 크기는 8방향 핸들(모서리 4 + 변 4, 선은 양 끝), 삭제는 Delete |
| 되돌리기 | 툴바의 되돌리기 아이콘(되감기 화살표) 또는 Ctrl/⌘+Z (글자 입력 중에는 입력 칸의 기본 동작) |
| 저장 | [저장 (git)] → `edits.json` 이 `main` 에 커밋됨 |

- **저장에는 GitHub 토큰이 필요**하다. 사이트는 누구나 열 수 있고 편집 화면도 누구나 켤 수 있지만, 토큰이 없으면 저장되지 않는다.
  - 토큰: GitHub → Settings → Developer settings → Fine-grained tokens, 대상 저장소 `ChadKim0119/DVT_E2E`, 권한 **Contents: Read and write** 만.
  - 처음 [저장]을 누르면 입력창이 뜨고, 그 브라우저에만 저장된다. [토큰] 버튼으로 바꾸거나 지울 수 있다.
- 수정은 `content.js`/`app.js` 를 고치지 않고 `edits.json` 에 쌓여 페이지를 열 때 덮어쓴다. 저장하면 커밋이 생기고 Vercel 자동 배포로 약 1분 뒤 사이트에 반영된다.
- 수정은 "페이지 + 요소 위치 + 원문 글자"로 연결된다. `content.js`/`app.js` 를 고쳐 원문이 달라지면 그 수정은 적용되지 않고 툴바에 "적용 안 된 수정 N건"으로 표시된다(파일에는 남아 있음). 해당 부분을 다시 고치면 정리된다.
- 한계: 표 숫자를 고쳐도 합계는 다시 계산되지 않는다. 도형 좌표는 발표 화면(1280×800 기준) 기준이라 모바일에서는 숨겨진다. 패널(오른쪽 상세) 안의 글자는 편집 대상이 아니다.
- 두 사람이 동시에 저장하면 나중 사람에게 "덮어쓸까요?" 확인이 뜬다.

- Vercel `gsp-dvt` 프로젝트가 이 저장소에 **Git 연결**되어야 한다(Production Branch = `main`, Framework Preset = Other, 빌드 명령 없음). 연결 후에는 `main` 에 푸시하면(편집 화면의 [저장] 커밋 포함) 자동으로 production 배포된다. 수동 배포는 불필요
- 배포 후 확인: https://gsp-dvt.vercel.app 로그인 없이 열림, `/src/content.js` 404
- `content.js` 의 `meta.changelog` 맨 위에 버전 항목 추가(v2, 날짜, 변경 내용)

## TODO (우선순위 순)

### 1. 데이터 갱신 (v2)
- [ ] 3차 DVT 결과 11/13 이후 반영 — Confluence 페이지 1133412396 (`daily.r3area`, `daily.r3day`, `rounds[2]`, `remain.r3`)
  - VDP Diag 24 TC(11/13 1차) 결과, 11/16~11/19 결과
- [ ] 11/13 HU SW 업데이트·MM Provisioning 재시험 결과 반영 (`ntWhy.blockers` 의 `hu`, `cable` 카드 when/facts)
- [ ] VDP Diag 2차(11/16~20) 진행 결과 반영 (`vdp` 카드)
- [ ] DVT 종료일 확정 여부 반영 — 출처 불일치: 11/17(E2E 세부일정) / 11/19 TBD(3차 결과표) / 11/20 전후(11/03 PM)
- [ ] 11/18 이후 PM 정례회의록에서 DVT 연장·CCB 관련 결정 확인 → `summary.status`, `plan` 문구 수정
- [ ] 각 수치 변경 시 헤드라인(`summary.headline`, 각 장 h2 — app.js 에 일부 하드코딩)도 함께 수정

### 2. 근거 보강
- [ ] TC 엑셀 본문으로 NT 사유 행 단위 집계 — v1은 엑셀을 내려받지 못해 영역 단위(CCW 236 / GS 59 / OPW 28)까지만 확정
  - 대상: 2차 결과 페이지 1103003658 첨부 `20261030_GS_DVT_SystemTestCase_v1.4.xlsx`, `20261029_eCare_DVT_SystemTestCase_v1.3.xlsx`
  - 결과로 `ntWhy.blockers[].tc` 를 건수로 바꾸고, 3장 막대를 원인 조직별 건수로 재구성
- [ ] 3차 DMS 연동 27 TC의 2차 근거 확인 — 3차 표기는 "Fail 6 + NT 21"인데 2차 Fail은 GS 5·OPW 3뿐 (`remain.carryNote`)
- [ ] "3차 범위 밖 NT 281건"(= 323 − 42) 산식 재검증 — OPW·DMS 27이 2차 OPW NT 28에 대응한다는 가정
- [ ] MM 업데이트 후 재수행 TC 건수(11/11 PM 합의)가 3차 결과표에 추가됐는지 확인

### 3. 화면 개선
- [ ] 3장 `sbar` 의 GS·OPW 구간이 좁아 라벨이 잘림 — 라벨을 막대 아래로 빼거나 툴팁 처리
- [ ] 5장 간트 핀 라벨(HU 업데이트·VDP Diag 1차)이 좁은 화면에서 왼쪽으로 잘림 — 1280×720, 폭 390 확인
- [ ] 2장 추이 그래프에 3차 일별 추이 추가 검토
- [ ] 폭 390(모바일) 전 페이지 점검, playwright로 콘솔 오류 0건 확인

### 4. 운영
- [ ] 공개 범위 재확인 — 실명·이슈 번호·TMKR 비용 의견(11/11 PM, 합의 아님) 포함. 외부 공유 전 TMKR 공유용 문구 검토 — **저장소도 public** 이라 `src/content.js` 원문이 GitHub 에서 그대로 보임
- [ ] Vercel `gsp-dvt` Git 연결을 `DVT_E2E`(`main`)로 교체했는지 확인 (2026.11.14 저장소 이전)
- [ ] 갱신 결과를 GS_DB 프로젝트 문서 `claude/GSP_DVT_결과_통합_20261114.md` 에도 반영(날짜 붙여 새 판)

## 지켜야 할 원칙
- 숫자·사실은 Confluence·회의록·GSP DB 기록 기준. 출처 없는 수치는 넣지 않고, 계산값은 "산식"으로 표시
- 원인 제공 조직 분류는 귀책 판정이 아니라 다음 행동 분류(화면 문구 유지)
- 5장 제안 일정은 "(안)" 표기 유지 — 합의 전까지 확정처럼 쓰지 않음
- 합계 숫자는 `data-sum` / `data-sp` 로 연결해 클릭 시 계산식이 맞는지 확인

## v2.0 메모
- LG U+ 조치 항목(단말 개통 · uCube · 케이블 · SASE 등) 삭제 완료
- 이전 화면 편집(edits.json)은 페이지 구조 변경으로 적용되지 않음(파일에는 남아 있음)
- 본문 장표 내용은 content.js `deck`, 새 Appendix는 `apxNew`, 일정은 `deck.tl`
- 공개 범위: 저장소 · 사이트 모두 공개 상태. 고객 전달 전 Vercel 보호 설정 검토
