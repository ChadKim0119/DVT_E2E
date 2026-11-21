(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("data").textContent);
  var R = D.rounds, Y = D.daily, Q = D.ntWhy, A = D.appendix, SRC = D.src;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var pct = function (a, b) { return (Math.round(a / b * 1000) / 10).toFixed(1); };
  var ownerOf = function (id) { return Q.owners.filter(function (o) { return o.id === id; })[0]; };
  var OC = { tmc: "var(--o-tmc)", tck: "var(--o-tck)", dsn: "var(--o-dsn)" };
  var lateWhen = function (w) { return /12월|미정|대기|11\/1[6-9]|11\/2/.test(w); };

  function table(head, rows, opt) { opt = opt || {}; return '<div class="scroll"><table class="tbl ' + (opt.cls || "") + '"><thead><tr>' + head.map(function (h, i) { return '<th class="' + ((opt.right || []).indexOf(i) >= 0 ? "r" : "") + '">' + esc(h) + '</th>'; }).join("") + '</tr></thead><tbody>' + rows.map(function (r) { return '<tr class="' + (opt.rowCls ? opt.rowCls(r) : (r[0] === "합계" ? "tot" : "")) + '">' + r.map(function (c, i) { return '<td class="' + ((opt.right || []).indexOf(i) >= 0 ? "r " : "") + ((opt.nowrap || []).indexOf(i) >= 0 ? "nw" : "") + '">' + (opt.raw ? c : esc(c)) + '</td>'; }).join("") + '</tr>'; }).join("") + '</tbody></table></div>'; }
  function numTable(o, extra) { var right = []; o.head.forEach(function (h, i) { if (i > 0 && /TC|Acted|Pass|Fail|NT|Remained|Planned|미수행/.test(h)) right.push(i); }); return table(o.head, o.rows, { right: right, nowrap: [0], cls: "num" }) + (o.notes ? '<ul class="notes">' + o.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join("") + '</ul>' : "") + (extra || ""); }
  function srcLinks(keys) { return '<p class="srcs">근거: ' + keys.map(function (k) { var s = SRC[k]; return s.u ? '<a href="' + s.u + '" target="_blank" rel="noopener">' + esc(s.t) + '</a>' : esc(s.t); }).join(" · ") + '</p>'; }

  /* ── 3 main slides + timeline ── */
  var DK = D.deck, EV = DK.ev;
  function goBtn(ev, text) { return '<button type="button" class="more" data-panel="' + ev + '">' + esc(text) + '</button>'; }
  function sheetTop(n, kicker) { return '<div class="sh-top"><span class="sheet-no"><span class="pill main">' + (n ? "메인" : "Timeline") + '</span>' + esc(kicker) + '</span></div>'; }
  function vS1() {
    var s = DK.s1;
    return '<section class="sheet hero" id="situation">' + sheetTop(1, s.kicker) + '<h2>' + esc(s.title) + '</h2><p class="lede">' + esc(s.lede) + '</p>' +
      '<div class="kpi4 num">' + s.kpis.map(function (k) { return '<button type="button" class="' + (k.hot ? "hot" : "") + '" data-panel="' + k.k + '"><small>' + esc(k.small) + '</small><span class="v"' + (k.small2 ? ' style="font-size:26px;line-height:1.45"' : "") + '>' + esc(k.v) + '<em>' + esc(k.em) + '</em></span><span class="d">' + esc(k.d) + '</span></button>'; }).join("") + '</div>' +
      '<div class="stat3 scqa">' + s.cols.map(function (c) { return '<div><span class="tag">' + esc(c.tag) + '</span><h3>' + esc(c.head) + '</h3><p>' + esc(c.body) + '</p>' + goBtn(c.ev, c.more) + '</div>'; }).join("") + '</div>' +
      '<p class="askbar">' + esc(s.ask) + '</p></section>';
  }
  function vS2() {
    var s = DK.s2;
    return '<section class="sheet" id="options">' + sheetTop(2, s.kicker) + '<h2>' + esc(s.title) + '</h2><p class="lede">' + esc(s.lede) + '</p>' +
      '<div class="cols2 opt-wrap"><div><div class="scroll"><table class="tbl opt"><thead><tr>' + s.optHead.map(function (h, i) { return '<th' + (i === 2 ? ' class="rec"' : "") + '>' + (i > 0 ? '<button type="button" class="thb" data-panel="' + s.optEv[i - 1] + '">' + esc(h) + '</button>' : "") + '</th>'; }).join("") + '</tr></thead><tbody>' +
      s.optRows.map(function (r) { return '<tr>' + r.map(function (c, i) { return (i === 0 ? '<th class="rh">' : '<td' + (i === 2 ? ' class="rec"' : "") + '>') + esc(c) + (i === 0 ? '</th>' : '</td>'); }).join("") + '</tr>'; }).join("") + '</tbody></table></div></div>' +
      '<div class="scope"><h3>' + esc(s.scopeTitle) + '</h3><div class="sc in"><b>승인 대상</b>' + s.scopeIn.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join("") + '</div><div class="sc out"><b>분리</b>' + s.scopeOut.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join("") + '</div><div class="sc open"><b>확정 필요</b>' + s.scopeOpen.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join("") + '</div>' + goBtn("ev:optB", "범위 근거 보기") + '</div></div>' +
      '<p class="word">' + esc(s.word) + '</p><p class="askbar">' + esc(s.decide) + '</p></section>';
  }
  function vS3() {
    var s = DK.s3;
    return '<section class="sheet" id="plan">' + sheetTop(3, s.kicker) + '<h2>' + esc(s.title) + '</h2><p class="lede">' + esc(s.lede) + '</p>' +
      '<div class="scroll"><table class="tbl prem"><thead><tr>' + s.premHead.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join("") + '</tr></thead><tbody>' +
      s.prem.map(function (r, i) { return '<tr data-panel="' + s.premEv[i] + '" tabindex="0">' + r.map(function (c, j) { return '<td' + (j === 0 ? ' class="nw"' : "") + '>' + (j === 1 ? '<b>' + esc(c) + '</b>' : esc(c)) + '</td>'; }).join("") + '</tr>'; }).join("") + '</tbody></table></div>' +
      '<div class="cols2" style="margin-top:16px"><div class="tracks">' + s.tracks.map(function (t) { return '<button type="button" class="trk" data-panel="' + t.ev + '"><b>' + esc(t.h) + '</b><span>' + esc(t.b) + '</span></button>'; }).join("") + '</div>' +
      '<div class="nxt"><h3>다음 단계</h3><ol>' + s.next.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ol><a class="more" href="#timeline">' + esc(s.tl) + '</a></div></div></section>';
  }
  function vBlk() {
    var s = DK.blk, br = function (t) { return esc(t).replace(/\n/g, "<br>"); };
    return '<section class="sheet" id="blocking"><div class="sh-top"><span class="sheet-no"><span class="pill main">메인</span>' + esc(s.kicker) + '</span></div><h2>' + esc(s.title) + '</h2><p class="lede">' + esc(s.lede) + '</p>' +
      '<div class="blk5">' + s.cards.map(function (c) { return '<div class="bc' + (c.hot ? " hot" : "") + '"><h3>' + esc(c.no) + ' ' + esc(c.h) + '</h3><span class="who">' + esc(c.who) + '</span><b>' + br(c.fact) + '</b><p>' + br(c.note) + '</p></div>'; }).join("") + '</div>' +
      '<h3 class="blk-t">' + esc(s.doneTitle) + '</h3>' + table(s.doneHead, s.doneRows, { nowrap: [0] }) + '<p class="blk-foot">' + esc(s.foot) + '</p></section>';
  }
  function vMan() {
    var s = DK.man;
    return '<section class="sheet" id="manpower"><div class="sh-top"><span class="sheet-no"><span class="pill main">메인</span>' + esc(s.kicker) + '</span></div><h2>' + esc(s.title) + '</h2><p class="lede">' + esc(s.lede) + '</p>' +
      '<div class="man-cols"><div><h3 class="blk-t" style="margin-top:0">' + esc(s.baseTitle) + '</h3><div class="man-cards">' + s.cards.map(function (c) { return '<div class="mc' + (c.hot ? " hot" : "") + '"><small>' + esc(c.small) + '</small><b>' + esc(c.v) + '</b><span>' + esc(c.d) + '</span></div>'; }).join("") + '</div>' +
      '<ul class="man-ul">' + s.bullets.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ul>' + table(s.perHead, s.perRows, { nowrap: [0, 1, 2], right: [1, 2] }) + '</div>' +
      '<div>' + table(s.areaHead, s.areaRows, { nowrap: [0, 1, 3, 4, 5, 6], right: [3, 4, 5, 6] }) + '<p class="blk-foot">' + esc(s.foot) + '</p></div></div></section>';
  }
  function dayN(d) { return (Date.UTC(d[0], d[1] - 1, d[2]) - Date.UTC.apply(null, [DK.tl.start[0], DK.tl.start[1] - 1, DK.tl.start[2]])) / 864e5; }
  function vTL() {
    var t = DK.tl, N2 = t.days, pc = function (d) { return (dayN(d) / N2 * 100).toFixed(3) + "%"; };
    var weeks = []; for (var w = 0; w < N2; w += 7) { var dd = new Date(Date.UTC(t.start[0], t.start[1] - 1, t.start[2] + w)); weeks.push('<span style="left:' + (w / N2 * 100).toFixed(2) + '%">' + (dd.getUTCMonth() + 1) + '/' + dd.getUTCDate() + '</span>'); }
    var marks = t.marks.map(function (m, mi) { return '<button type="button" class="tl-m' + (mi % 2 ? " lo" : "") + (m.dead ? " dead" : "") + '" style="left:' + pc(m.d) + '" data-panel="' + m.ev + '"><i></i><b>' + esc(m.l) + '</b></button>'; }).join("");
    var lanes = t.lanes.map(function (ln) {
      return '<div class="tl-row"><div class="tl-lab"><b>' + esc(ln.h) + '</b><small>' + esc(ln.sub) + '</small></div><div class="tl-tr">' + ln.bars.map(function (b, i) {
        var l = dayN(b.a), w = Math.max(dayN(b.b) - l, .8);
        return '<button type="button" class="tl-b ' + b.t + (b.dash ? " dash" : "") + (b.pin ? " pin" : "") + (!b.pin && w / N2 < .12 ? " sh" : "") + '" style="left:' + (l / N2 * 100).toFixed(3) + '%;width:' + (w / N2 * 100).toFixed(3) + '%;top:' + (i % 2 ? 40 : 6) + 'px"' + (b.ev ? ' data-panel="' + b.ev + '"' : "") + ' title="' + esc(b.l) + '"><span>' + esc(b.l) + '</span></button>';
      }).join("") + '</div></div>';
    }).join("");
    var ticks = ""; for (var k = 0; k <= N2; k += 7) ticks += '<i style="left:' + (k / N2 * 100).toFixed(2) + '%"></i>';
    return '<section class="sheet" id="timeline">' + sheetTop(0, t.kicker) + '<h2>' + esc(t.title) + '</h2><p class="lede">' + esc(t.lede) + '</p>' +
      '<div class="tl"><div class="tl-head"><span></span><div class="tl-ax">' + weeks.join("") + marks + '</div></div><div class="tl-body"><div class="tl-grid"><span></span><div>' + ticks + '</div></div>' + lanes + '</div></div>' +
      '<ul class="notes">' + t.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join("") + '</ul>' +
      '<div class="lg" style="margin-top:8px"><span><i class="sw2" style="background:var(--ink)"></i>DVT</span><span><i class="sw2" style="background:var(--accent)"></i>조건부 검증(안)</span><span><i class="sw2" style="background:#8d8793"></i>외부 환경 해소</span><span><i class="sw2" style="background:#00856a"></i>E2E</span><span><i class="sw2" style="background:none;box-shadow:inset 0 0 0 1.5px var(--ink-3)"></i>미확정 · 순연</span></div></section>';
  }

  /* ── appendix ── */
  function bR1() { return numTable(Y.r1) + srcLinks(["r1", "pm1007", "db"]); }
  function bR2() { return '<h4>전체 누적</h4>' + numTable(Y.r2cum) + '<h4>영역별 최종</h4>' + numTable(Y.r2area) + srcLinks(["r2", "pm1021", "pm1028", "pm1103"]); }
  function bR3() { return '<h4>영역별 (11/12 누적)</h4>' + numTable(Y.r3area) + '<h4>일별</h4>' + numTable(Y.r3day) + srcLinks(["r3", "pm1111", "db"]); }
  function bCause() {
    return table(["원인 제공", "차단 요인", "이슈", "영향", "해소 예정"], Q.blockers.map(function (b) { var o = ownerOf(b.owner); return ['<span class="otag" style="--oc:' + OC[o.id] + '">' + esc(o.name) + '</span>', '<button type="button" class="more" style="text-align:left;white-space:normal;font-size:13.5px;color:var(--ink)" data-panel="cause:' + b.id + '">' + esc(b.title) + '</button>', esc(b.iss), esc(b.tc), '<span class="' + (lateWhen(b.when) ? "st-wait" : "") + '">' + esc(b.when) + '</span>']; }), { raw: true, nowrap: [0, 2] }) + srcLinks(["pre", "pm1021", "pm1028", "pm1103", "db"]);
  }
  function bPre() {
    var a = A.a5, done = a.rows.filter(function (r) { return r[3] === "준비완료"; }).length;
    return '<p style="font-size:13.5px;margin-bottom:8px"><b>' + a.rows.length + '개 항목</b>(번호 17 중복 포함) 중 준비완료 <b>' + done + '</b> · 그 외 ' + (a.rows.length - done) + '</p>' +
      table(a.head, a.rows.map(function (r) { return r.map(function (c, i) { return i === 3 ? '<span class="' + (c === "준비완료" ? "st-done" : "st-wait") + '">' + esc(c) + '</span>' : esc(c); }); }), { raw: true, nowrap: [0, 1, 3, 4, 5] }) + srcLinks(["pre"]);
  }
  function bPlanHist() { return table(A.a6.head, A.a6.rows, { nowrap: [0] }) + srcLinks(["pm1007", "pm1021", "pm1103", "pm1111", "db"]); }
  function bSrc() {
    var a = A.a7;
    return '<h4>DVT 결과 페이지 첨부</h4>' + table(["차수", "파일", "올린 날", "올린 사람"], a.files, { nowrap: [0, 2, 3] }) +
      '<h4>System Test Case 문서 버전</h4>' + table(["버전", "일자", "변경 내용"], a.tcHist, { nowrap: [0, 1] }) +
      '<h4>이 보드가 참조한 문서</h4><ul class="plain">' + Object.keys(SRC).map(function (k) { var s = SRC[k]; return '<li>' + (s.u ? '<a href="' + s.u + '" target="_blank" rel="noopener">' + esc(s.t) + '</a>' : esc(s.t) + ' (' + (s.n || "프로젝트 DB 문서") + ')') + '</li>'; }).join("") + '</ul>';
  }
  function apxLabel(id) { var x = APX.filter(function (p) { return p[0].id === id; })[0]; return x ? x[0].code + " · " + x[0].title : id; }
  function bNew(o) { return function () { return table(o.head, o.rows, { nowrap: o.head[1] === "MM" ? [0, 1] : [0] }); }; }
  var N4 = D.apxNew;
  var APX = [[N4.m11, bNew(N4.m11)], [N4.m1, bNew(N4.m1)], [N4.m2, bNew(N4.m2)], [N4.m3, bNew(N4.m3)], [N4.m4, bNew(N4.m4)], [N4.m5, bNew(N4.m5)], [A.a4, bCause], [A.a1, bR1], [A.a2, bR2], [A.a3, bR3], [A.a5, bPre], [A.a6, bPlanHist], [A.a7, bSrc]];
  APX.forEach(function (x, i) { x[0].code = "A" + (i + 1); });
  function vAppendix() {
    return '<section class="sheet apx-head" id="appendix"><span class="sheet-no"><span class="pill">Appendix</span>목차</span><h2>Appendix · 근거 자료</h2><p class="lede">메인 장표의 숫자와 원인 분류가 나온 원본 기록. ' + esc(D.meta.asof) + '.</p>' +
      '<nav class="apx-index" aria-label="Appendix 목차">' + APX.map(function (x) { return '<a href="#' + x[0].id + '"><b>' + x[0].code + '</b>' + esc(x[0].title) + '</a>'; }).join("") + '</nav></section>' +
      APX.map(function (x) { return '<section class="apx" id="' + x[0].id + '"><span class="code"><span class="pill">Appendix</span>' + x[0].code + '</span><h3 class="t">' + esc(x[0].title) + '</h3><p class="msg">' + esc(x[0].message) + '</p>' + x[1]() + '</section>'; }).join("");
  }

  /* ── panels ── */
  function panelContent(key) {
    var k = key.split(":");
    if (k[0] === "doc-history") return { kicker: "보드 정보", title: "이 보드의 변경 이력", html: '<ol class="clog">' + D.meta.changelog.map(function (c, i) { return '<li><div class="hd"><b>' + esc(c.v) + '</b><span>' + esc(c.at) + '</span>' + (i === 0 ? '<span class="now">현재</span>' : "") + '</div><ul>' + c.items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ul></li>'; }).join("") + '</ol>' };
    if (k[0] === "round") {
      var r = R.filter(function (x) { return x.id === k[1]; })[0], base = r.tc - r.rest;
      var kp = '<div class="p-kpi num"><div><small>Pass</small><b>' + r.pass + '</b></div><div><small>Fail</small><b>' + r.fail + '</b></div><div class="d"><small>NT</small><b>' + r.nt + '</b></div></div>';
      var body = r.id === "r1" ? numTable(Y.r1) : r.id === "r2" ? numTable(Y.r2area) + '<h4>누적 추이</h4>' + numTable(Y.r2cum) : numTable(Y.r3area) + '<h4>일별</h4>' + numTable(Y.r3day);
      return { kicker: r.name + " DVT · " + r.period, title: r.tc + " TC · NT " + pct(r.nt, base) + "%", html: kp + '<p>' + esc(r.note) + '</p>' + body + srcLinks([r.src]) };
    }
    if (k[0] === "part") {
      var p = Q.parts.filter(function (x) { return x.k === k[1]; })[0];
      var rel = { ccw: ["cti"], gs: ["hu", "gsa", "fix"], opw: ["vdp", "dms", "dtc"] }[p.k];
      return { kicker: "2차 NT " + Q.total + "건 중", title: p.label + " " + p.n + "건 · " + p.cause, html: '<p>' + esc(p.fact) + '</p><h4>관련 차단 요인</h4>' + rel.map(function (id) { var b = Q.blockers.filter(function (x) { return x.id === id; })[0], o = ownerOf(b.owner); return '<button type="button" class="blk" data-panel="cause:' + b.id + '" style="--oc:' + OC[o.id] + '"><span class="otag">' + esc(o.name) + '</span><b style="margin-top:4px">' + esc(b.title) + '</b><span class="m">' + esc(b.tc) + ' · ' + esc(b.when) + '</span></button>'; }).join("") + srcLinks(["r2", "pm1021", "pm1028", "pm1111"]) };
    }
    if (k[0] === "cause") {
      var b = Q.blockers.filter(function (x) { return x.id === k[1]; })[0]; if (!b) return null; var o = ownerOf(b.owner);
      return { kicker: "차단 요인 · " + o.name, title: b.title, html: '<dl class="p-meta"><dt>원인 제공</dt><dd><span class="otag" style="--oc:' + OC[o.id] + '">' + esc(o.name) + '</span> ' + esc(o.sub) + '</dd><dt>이슈</dt><dd>' + esc(b.iss) + '</dd><dt>영향</dt><dd>' + esc(b.tc) + '</dd><dt>해소 예정</dt><dd><b>' + esc(b.when) + '</b></dd></dl><h4>기록된 사실</h4><ul class="fl">' + b.facts.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join("") + '</ul>' + srcLinks(b.src) };
    }
    if (k[0] === "ev") {
      var e = EV[k[1]]; if (!e) return null;
      return { kicker: e.kicker, title: e.title, html: '<ul class="fl">' + e.facts.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ul>' + (e.src ? srcLinks(e.src) : "") + '<a class="golink" href="#' + e.apx + '">부록에서 자세히 보기 <small>' + esc(apxLabel(e.apx)) + '</small><span aria-hidden="true">→</span></a>' };
    }
    if (k[0] === "src") {
      var x = SRC[k[1]]; if (!x) return null;
      var said = { pm1103: ["Kensho E2E는 현재 제약사항을 고려하여 테스트 가능한 범위를 세분화하고, 처음부터 N/T가 예상되는 TC가 최소화되도록 세부 일정을 재작성", "Kensho E2E 진입 시점에는 사전에 알고 있는 제약사항으로 N/T가 발생하지 않도록 기능별 테스트 가능시점을 기준으로 세부 일정을 재구성", "DVT 2차: 약 850 TC 중 약 520 Pass, Fail 8, N/T 약 300 — CTI 미개발 영향으로 N/T 비중이 높음"],
        pm1111: ["TMKR 내부 의견(최종 합의 아님): ACOS 규격 변경에 따른 실제 변경 개발은 추가비용 협의 가능, DVT 일정 지연에 따른 단순 대기 · 유지 인력 공수는 인정 어려움", "DVT 자체 Scope가 증가하여 실제 추가 Test · 개발 업무가 발생한 경우에는 해당 근거를 기준으로 별도 검토 가능", "DVT 3차: MM Update 이후 기존 N/T 요금제 · Provisioning 재검증, VDP Server API, e-Care API, GSA 설치 · Login, DeepLink/상품가입 Flow", "E2E는 토요타 공식 검증 Event 관점. System Architecture · Interface Spec · Test Case를 기준 문서로, Tier2의 구두 설명만으로 이슈를 종료하지 않음"] }[k[1]] || [];
      return { kicker: "근거 문서", title: x.t, html: (said.length ? '<h4>해당 기록</h4><ul class="fl">' + said.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ul>' : "") + (x.u ? '<p style="margin-top:14px"><a href="' + x.u + '" target="_blank" rel="noopener" style="color:var(--accent-deep);font-weight:600">Confluence에서 원문 열기</a></p>' : "") };
    }
    return null;
  }

  /* ── mount ── */
  $("chg").innerHTML = '변경 이력 <b>' + esc(D.meta.changelog[0].v) + '</b>'; $("chg").setAttribute("aria-label", "이 보드의 변경 이력, 현재 " + D.meta.changelog[0].v);
  $("brand").innerHTML = esc(D.meta.title) + ' <span>· ' + esc(D.meta.project) + ' · ' + esc(D.meta.date) + '</span>';
  $("nav").innerHTML = [["situation", "메인"], ["blocking", "블로킹 이슈"], ["manpower", "추가 인력"], ["options", "제안"], ["plan", "실행 · 공수 전제"], ["timeline", "Timeline"]].map(function (n) { return '<a href="#' + n[0] + '">' + n[1] + '</a>'; }).join("") + '<span class="sep"></span><a href="#appendix">Appendix</a>';
  $("app").innerHTML = vS1() + vBlk() + vMan() + vS2() + vS3() + vTL() + vAppendix();
  function setMode(m) {
    if (sumEl) clearSum();
    document.body.setAttribute("data-mode", m);
    Array.prototype.forEach.call(document.querySelectorAll("[data-set]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-set") === m)); });
  }
  /*__ENGINE__*/
  /*__EDITOR__*/
})();
