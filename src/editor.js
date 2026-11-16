  /* ── 화면 편집 (글자 · 도형 · 색상) ──
     수정분은 원본(content.js)을 건드리지 않고 edits.json 에 따로 쌓여 로드 때 덮어써짐.
     저장 = 편집자의 GitHub 토큰으로 edits.json 을 이 저장소(main)에 커밋 (토큰이 없으면 저장 불가). */
  (function () {
    var REPO = "ChadKim0119/DVT_E2E", BRANCH = "main", FILE = "edits.json", TK = "dvt_gh_token";
    var S = { texts: {}, styles: {}, shapes: [], moves: {} }, hist = [], savedSig = "", loadedText = "", snapped = false;
    var on = false, tool = "sel", sel = null, selShape = 0, editing = null, pre = "", drag = null, hov = null, stale = 0, nid = 1;
    var oH = new Map(), oT = new Map(), oS = new Map(), oM = new Map(), brPending = false;
    var COLOR = /^(#[0-9a-fA-F]{3,8}|none|transparent)$/, KINDS = { rect: 1, ellipse: 1, line: 1, arrow: 1, text: 1 };
    var SP = { bg: "background", fg: "color", fw: "fontWeight", fi: "fontStyle", td: "textDecoration", fs: "fontSize" }; /* 저장 키 → CSS */
    var SV = { bg: COLOR, fg: COLOR, fw: /^(400|700)$/, fi: /^(italic|normal)$/, td: /^(none|underline|line-through|underline line-through)$/, fs: /^\d{1,3}(\.\d)?px$/ };
    var styleOf = function (el) { var o = {}; Object.keys(SP).forEach(function (k) { o[k] = el.style[SP[k]]; }); return o; };
    var Q = function (s, r) { return (r || document).querySelector(s); };
    var kids = function (el) { return Array.prototype.filter.call(el.children, function (c) { return !c.classList.contains("ed-layer"); }); };
    var norm = function (el) { return el.textContent.replace(/\s+/g, " ").trim(); };
    var r1 = function (v) { return Math.round(v * 10) / 10; };
    var num = function (v) { return typeof v === "number" && isFinite(v) ? r1(v) : null; };
    var sig = function () { return JSON.stringify(serialize()); };
    var byId = function (id) { return S.shapes.filter(function (s) { return s.id === id; })[0]; };

    /* ── 요소 ↔ 경로 ── */
    /* 순서를 바꾼 부모의 자식은 data-ed-i(원래 위치)로 경로를 만든다 → 이동해도 글자·서식 수정의 경로가 그대로 유지됨 */
    function idx(el) { var d = el.getAttribute("data-ed-i"); return d !== null ? +d : kids(el.parentNode).indexOf(el); }
    function kidAt(el, n) { var ks = kids(el); return ks.some(function (c) { return c.hasAttribute("data-ed-i"); }) ? ks.filter(function (c) { return +c.getAttribute("data-ed-i") === n; })[0] : ks[n]; }
    function key(el) { var pg = el.closest("#app > section"), a = []; while (el !== pg) { a.unshift(idx(el)); el = el.parentNode; } return pg.id + "|" + a.join("."); }
    function walkTo(k) {
      var i = k.indexOf("|"), el = document.getElementById(k.slice(0, i)), path = k.slice(i + 1);
      if (path) path.split(".").forEach(function (n) { el = el && kidAt(el, +n); });
      return el;
    }
    function find(k, o) {
      var el = walkTo(k);
      if (el && norm(el) === o) return el;
      stale++; return null;
    }
    function brFix(el, br) { /* flex · grid 블록은 <br> 로 줄이 안 바뀌므로 줄바꿈이 들어간 경우만 블록으로 표시 */
      el.classList.remove("ed-br", "ed-flex"); if (!br) return;
      el.classList.add("ed-br"); if (/flex|grid/.test(getComputedStyle(el).display)) el.classList.add("ed-flex");
    }
    function tail(p) { return p.querySelector(":scope > .ed-layer"); } /* 도형 레이어는 항상 맨 뒤(위) */
    function mark(p) { if (oM.has(p)) return; var ks = kids(p); oM.set(p, ks.slice()); ks.forEach(function (c, i) { if (!c.hasAttribute("data-ed-i")) c.setAttribute("data-ed-i", i); }); }
    function order(p, ord) { var t = tail(p); ord.forEach(function (n) { var c = kidAt(p, n); if (c) p.insertBefore(c, t); }); }
    function clean(html) { /* 허용 태그·속성만 남김 (edits.json 은 신뢰하지 않음) */
      var t = document.createElement("template"); t.innerHTML = html;
      (function walk(n) {
        Array.prototype.slice.call(n.childNodes).forEach(function (c) {
          if (c.nodeType === 3) return;
          if (c.nodeType !== 1 || !/^(B|I|U|S|STRIKE|DEL|STRONG|EM|SMALL|SPAN|BR|SUP|SUB|A)$/.test(c.tagName)) { c.replaceWith(document.createTextNode(c.textContent || "")); return; }
          Array.prototype.slice.call(c.attributes).forEach(function (a) {
            var v = a.value, ok = a.name === "class" || a.name === "style" || a.name === "title" || (/^data-/.test(a.name) && a.name !== "data-sum" && a.name !== "data-sp" && a.name !== "data-ed-i") || (a.name === "href" && /^(https?:|#)/.test(v));
            if (!ok || /url\(|expression|javascript:/i.test(v)) c.removeAttribute(a.name);
            else if (a.name === "class") { v = v.replace(/\bed-(hov|sel|ing)\b/g, "").trim(); v ? c.setAttribute("class", v) : c.removeAttribute("class"); }
          });
          walk(c);
        });
      })(t.content);
      return t.innerHTML;
    }

    /* ── 전체 적용 (원본 복원 후 S 를 다시 입힘) ── */
    function remember(el) { if (!oH.has(el)) { oH.set(el, el.innerHTML); oT.set(el, norm(el)); } }
    function applyAll() {
      oM.forEach(function (arr, p) { var t = tail(p); arr.forEach(function (c) { p.insertBefore(c, t); }); }); oM.clear();
      oH.forEach(function (h, el) { el.innerHTML = h; el.classList.remove("ed-br", "ed-flex"); });
      oS.forEach(function (v, el) { Object.keys(SP).forEach(function (k) { el.style[SP[k]] = v[k]; }); });
      oH.clear(); oT.clear(); oS.clear(); stale = 0;
      Object.keys(S.styles).forEach(function (k) { var v = S.styles[k], e = find(k, v.o); if (e) { oS.set(e, styleOf(e)); Object.keys(SP).forEach(function (n) { if (v[n]) e.style[SP[n]] = v[n]; }); } });
      Object.keys(S.texts).forEach(function (k) { var v = S.texts[k], e = find(k, v.o); if (e) { remember(e); e.innerHTML = clean(v.h); brFix(e, /<br/i.test(v.h)); } });
      Object.keys(S.moves).forEach(function (k) { var v = S.moves[k], p = walkTo(k); if (p && kids(p).length === v.n) { mark(p); order(p, v.ord); } else stale++; });
      if (sel && !document.contains(sel)) sel = null;
      renderShapes(); fit(); refresh();
    }

    /* ── 도형 ── */
    function layer(pg) {
      var l = Q(".ed-layer", pg);
      if (!l) { l = document.createElement("div"); l.className = "ed-layer"; l.innerHTML = '<i class="ed-probe"></i>'; pg.insertBefore(l, pg.firstChild); }
      return l;
    }
    function mkShape(s) {
      var d = document.createElement("div"), P = function (x, y) { return r1(x) + "," + r1(y); };
      if (s.k === "line" || s.k === "arrow") {
        var x0 = Math.min(s.x, s.x2) - 16, y0 = Math.min(s.y, s.y2) - 16, w = Math.abs(s.x2 - s.x) + 32, h = Math.abs(s.y2 - s.y) + 32;
        var a = Math.atan2(s.y2 - s.y, s.x2 - s.x), L = 9 + s.sw * 2.5, head = s.k !== "arrow" ? "" :
          '<polygon points="' + [P(s.x2, s.y2), P(s.x2 - L * Math.cos(a - .42), s.y2 - L * Math.sin(a - .42)), P(s.x2 - L * Math.cos(a + .42), s.y2 - L * Math.sin(a + .42))].join(" ") + '" fill="' + s.st + '"/>';
        var ln = function (extra) { return '<line x1="' + s.x + '" y1="' + s.y + '" x2="' + s.x2 + '" y2="' + s.y2 + '" ' + extra + '/>'; };
        d.innerHTML = '<svg class="ed-l" data-id="' + s.id + '" style="left:' + x0 + 'px;top:' + y0 + 'px;width:' + w + 'px;height:' + h + 'px" viewBox="' + [x0, y0, w, h].join(" ") + '">' +
          ln('stroke="' + s.st + '" stroke-width="' + s.sw + '" stroke-linecap="round"') + head + ln('class="ed-hit" stroke="transparent" stroke-width="18"') + '</svg>';
        return d.firstChild;
      }
      d.className = "ed-s"; d.setAttribute("data-id", s.id);
      d.style.cssText = "left:" + s.x + "px;top:" + s.y + "px;width:" + s.w + "px;height:" + s.h + "px;background:" + s.fill + ";border:" + (s.st === "none" ? 0 : s.sw) + "px solid " + (s.st === "none" ? "transparent" : s.st) + ";border-radius:" + (s.k === "ellipse" ? "50%" : "6px") + ";color:" + s.tc + (s.fw ? ";font-weight:" + s.fw : "") + (s.fi ? ";font-style:" + s.fi : "") + (s.td ? ";text-decoration:" + s.td : "") + (s.fs ? ";font-size:" + s.fs : "");
      d.textContent = s.t || "";
      return d;
    }
    function HP(s) { var x = s.x, y = s.y, w = s.w, h = s.h; return [["nw", x, y], ["n", x + w / 2, y], ["ne", x + w, y], ["e", x + w, y + h / 2], ["se", x + w, y + h], ["s", x + w / 2, y + h], ["sw", x, y + h], ["w", x, y + h / 2]]; }
    function renderShapes() {
      pages.forEach(function (pg) {
        var l = layer(pg);
        Array.prototype.slice.call(l.children, 1).forEach(function (c) { c.remove(); });
        S.shapes.forEach(function (s) {
          if (s.p !== pg.id) return;
          var e = mkShape(s); if (s.id === selShape) e.classList.add("ed-sel"); l.appendChild(e);
        });
        var s = byId(selShape);
        if (s && s.p === pg.id) (s.k === "line" || s.k === "arrow" ? [["a", s.x, s.y], ["b", s.x2, s.y2]] : HP(s)).forEach(function (h) {
          var e = document.createElement("i"); e.className = "ed-h"; e.setAttribute("data-h", h[0]); e.style.left = (h[1] - 6) + "px"; e.style.top = (h[2] - 6) + "px"; l.appendChild(e);
        });
      });
    }
    function loc(pg, ev) { var l = layer(pg), r = l.getBoundingClientRect(), k = l.firstChild.getBoundingClientRect().width / 1000; return { x: (ev.clientX - r.left) / k, y: (ev.clientY - r.top) / k }; }

    /* ── 선택 · 색 ── */
    function deselect() { if (sel) sel.classList.remove("ed-sel"); sel = null; selShape = 0; renderShapes(); syncPal(); }
    function selectEl(el) { deselect(); sel = el; el.classList.add("ed-sel"); syncPal(); }
    function selectShape(id) { if (sel) sel.classList.remove("ed-sel"); sel = null; selShape = id; renderShapes(); syncPal(); }
    function toHex(c) { var m = String(c).match(/[\d.]+/g); if (!m || (m.length > 3 && +m[3] === 0)) return "#ffffff"; return "#" + m.slice(0, 3).map(function (x) { return ("0" + Math.round(+x).toString(16)).slice(-2); }).join(""); }
    function syncPal() {
      var s = byId(selShape), v = { bg: "#ffffff", fg: "#17141a", st: "#e6007e" };
      if (s) { v.bg = s.fill === "none" ? "#ffffff" : s.fill; v.fg = s.tc; v.st = s.st === "none" ? "#e6007e" : s.st; }
      else if (sel) { var c = getComputedStyle(sel); v.bg = toHex(c.backgroundColor); v.fg = toHex(c.color); }
      ["bg", "fg", "st"].forEach(function (n) { var i = $("ed-" + n); if (i) i.value = v[n]; });
      var u = $("ed-ui"); if (u) { u.setAttribute("data-sel", s ? "shape" : sel ? "el" : ""); u.setAttribute("data-line", s && (s.k === "line" || s.k === "arrow") ? "1" : ""); }
      syncFmt();
    }
    function snap() { if (!snapped) { hist.push(JSON.stringify(S)); snapped = true; } }
    function tgt() { var s = byId(selShape); return { s: s, el: s ? null : (sel || (editing && !editing.getAttribute("data-id") ? editing : null)) }; }
    function paint(n, val) { /* 선택된 도형 · 블록(또는 편집 중인 블록) 전체에 적용 */
      var t = tgt();
      if (t.s) { snap(); if (n === "bg") t.s.fill = val; else if (n === "fg") t.s.tc = val; else if (n === "st") t.s.st = val; else t.s[n] = val; renderShapes(); }
      else if (t.el) {
        snap(); var el = t.el, k = key(el), v = S.styles[k] || (S.styles[k] = { o: oT.has(el) ? oT.get(el) : norm(el) });
        if (!oS.has(el)) oS.set(el, styleOf(el));
        v[n] = val; el.style[SP[n]] = val;
      } else return;
      refresh();
    }
    function fmtState() {
      var t = tgt(), q = function (c) { try { return document.queryCommandState(c); } catch (e) { return false; } };
      if (t.s) return { bold: t.s.fw === "700", italic: t.s.fi === "italic", underline: /underline/.test(t.s.td || ""), strike: /line-through/.test(t.s.td || "") };
      if (editing && t.el === editing) return { bold: q("bold"), italic: q("italic"), underline: q("underline"), strike: q("strikeThrough") };
      if (t.el) { var c = getComputedStyle(t.el); return { bold: parseInt(c.fontWeight, 10) >= 600, italic: c.fontStyle === "italic", underline: /underline/.test(c.textDecorationLine), strike: /line-through/.test(c.textDecorationLine) }; }
      return null;
    }
    function syncFmt() { var f = fmtState(); Array.prototype.forEach.call(document.querySelectorAll("#ed-ui [data-f]"), function (b) { var v = !!(f && f[b.getAttribute("data-f")]); b.classList.toggle("on", v); b.setAttribute("aria-pressed", String(v)); }); }
    var CMD = { bold: "bold", italic: "italic", underline: "underline", strike: "strikeThrough" };
    function fmt(k) {
      var t = tgt(); if (!t.s && !t.el) return;
      if (!t.s && editing && t.el === editing) { document.execCommand(CMD[k], false, null); syncFmt(); return; } /* 글자를 편집 중이면 선택한 글자에만 */
      if (t.s) stopEdit();
      var c = fmtState(); snapped = false;
      if (k === "bold") paint("fw", c.bold ? "400" : "700");
      else if (k === "italic") paint("fi", c.italic ? "normal" : "italic");
      else { var u = k === "underline" ? !c.underline : c.underline, x = k === "strike" ? !c.strike : c.strike; paint("td", u || x ? [u && "underline", x && "line-through"].filter(Boolean).join(" ") : "none"); }
      snapped = false; syncFmt();
    }
    function size(d) { /* 글자 크기는 블록 · 글상자 전체 단위 */
      var t = tgt(); if (!t.s && !t.el) return; if (t.s) stopEdit();
      var cur = t.s ? parseFloat(t.s.fs || 14) : parseFloat(getComputedStyle(t.el).fontSize);
      snapped = false; paint("fs", Math.max(8, Math.min(120, Math.round(cur + d))) + "px"); snapped = false;
    }

    /* ── 글자 편집 ── */
    var tidy = function (h) { return clean(h).replace(/(<br>)+((<\/[a-z]+>)*)$/, "$2"); };
    function shapeText(el) { var out = ""; (function w(n) { n.childNodes.forEach(function (c) { if (c.nodeType === 3) out += c.nodeValue; else if (c.nodeName === "BR") out += "\n"; else w(c); }); })(el); return out.replace(/\n+$/, ""); }
    function put(text) { /* 커서 위치에 글자 삽입, 줄바꿈은 <br> 로 */
      var sl = getSelection(); if (!editing || !sl.rangeCount || !editing.contains(sl.anchorNode)) return;
      var r = sl.getRangeAt(0), last; r.deleteContents();
      String(text).replace(/\r\n?/g, "\n").split("\n").forEach(function (ln, i) {
        if (i) { last = document.createElement("br"); r.insertNode(last); r.setStartAfter(last); r.collapse(true); }
        if (ln) { last = document.createTextNode(ln); r.insertNode(last); r.setStartAfter(last); r.collapse(true); }
      });
      if (last && last.nodeName === "BR") { /* 끝 줄바꿈은 뒤에 자리표시 <br> 가 있어야 커서가 다음 줄로 감 */
        var more = false;
        for (var n = last; n !== editing && !more; n = n.parentNode) { var x = n.nextSibling; while (x && x.nodeType === 3 && !x.nodeValue) { var y = x.nextSibling; x.remove(); x = y; } if (x) more = true; } /* 빈 텍스트 노드는 내용이 아님 */
        if (!more) last.parentNode.appendChild(document.createElement("br"));
      }
      sl.removeAllRanges(); sl.addRange(r);
    }
    function startEdit(el) {
      var isShape = !!el.getAttribute("data-id");
      stopEdit(); if (!isShape) deselect(); /* 도형은 deselect 가 DOM 을 다시 그려 대상이 끊김 */
      editing = el; pre = JSON.stringify(S);
      if (!isShape) remember(el);
      el.classList.add("ed-ing"); el.setAttribute("contenteditable", isShape ? "plaintext-only" : "true"); /* 페이지 글자는 서식(굵게 등)이 필요해 true, 도형 글은 순수 글자 */
      if (isShape && el.contentEditable !== "plaintext-only") el.setAttribute("contenteditable", "true");
      if (!isShape) { try { document.execCommand("styleWithCSS", false, false); } catch (e) {} $("ed-ui").setAttribute("data-edit", "1"); if (/flex|grid/.test(getComputedStyle(el).display)) el.classList.add("ed-flex"); /* flex · grid 안에서는 <br> 이 줄을 못 바꿈 → 편집·표시 중에는 블록으로 */ }
      el.focus();
      var sl = getSelection(); if (!sl.anchorNode || !el.contains(sl.anchorNode)) { var r = document.createRange(); r.selectNodeContents(el); r.collapse(false); sl.removeAllRanges(); sl.addRange(r); }
    }
    function stopEdit() {
      var el = editing; if (!el) return; editing = null; $("ed-ui").removeAttribute("data-edit");
      el.removeAttribute("contenteditable"); el.classList.remove("ed-ing");
      var id = +el.getAttribute("data-id"), s = id && byId(id);
      if (s) { s.t = shapeText(el); renderShapes(); }
      else { el.classList.remove("ed-flex"); var k = key(el), h = tidy(el.innerHTML), same = h === tidy(oH.get(el)); brFix(el, !same && /<br/i.test(h)); if (same) delete S.texts[k]; else S.texts[k] = { o: oT.get(el), h: h }; el.innerHTML = same ? oH.get(el) : h; /* 화면도 저장값(자리표시 <br> 제거)과 똑같이 */ }
      if (JSON.stringify(S) !== pre) hist.push(pre);
      fit(); refresh();
    }

    /* ── 되돌리기 · 삭제 ── */
    function commit(fn) { hist.push(JSON.stringify(S)); fn(); snapped = false; refresh(); }
    function undo() { if (!hist.length) return; stopEdit(); S = JSON.parse(hist.pop()); selShape = 0; if (sel) sel.classList.remove("ed-sel"); sel = null; applyAll(); syncPal(); }
    function move(dir) { /* 선택한 블록(문단 · 항목 · 카드 · 표 행)을 같은 부모 안에서 한 칸 위/아래로 */
      if (!sel) return msg("먼저 옮길 블록을 클릭해 선택하세요.", 1);
      var p = sel.parentElement; if (!p || !p.closest("#app > section")) return;
      var list = kids(p), i = list.indexOf(sel), j = i + dir;
      if (j < 0 || j >= list.length) return msg(dir < 0 ? "이미 맨 위입니다. ↑ 상위로 바깥 블록을 골라 옮겨 보세요." : "이미 맨 아래입니다.", 1);
      commit(function () {
        mark(p); var o = list[j]; dir < 0 ? p.insertBefore(sel, o) : p.insertBefore(o, sel);
        var ord = kids(p).map(idx), k = key(p);
        if (ord.every(function (n, x) { return n === x; })) delete S.moves[k]; else S.moves[k] = { n: ord.length, ord: ord };
        fit();
      });
    }
    function delShape() { commit(function () { S.shapes = S.shapes.filter(function (s) { return s.id !== selShape; }); selShape = 0; renderShapes(); syncPal(); }); }

    /* ── 포인터 ── */
    document.addEventListener("pointerdown", function (ev) {
      if (!on || ev.button !== 0) return;
      var t = ev.target, pg = t.closest && t.closest("#app > section");
      if (!pg || t.closest(".ed-ui") || (editing && editing.contains(t))) return;
      var p = loc(pg, ev), h = t.closest(".ed-h"), sh = t.closest("[data-id]"), s;
      ev.preventDefault(); stopEdit();
      if (h && (s = byId(selShape))) { drag = { m: "h", h: h.getAttribute("data-h"), s: s, o: JSON.parse(JSON.stringify(s)), p: p, pg: pg, pre: JSON.stringify(S) }; }
      else if (tool !== "sel") {
        var line = tool === "line" || tool === "arrow";
        s = { id: nid++, p: pg.id, k: tool, x: r1(p.x), y: r1(p.y), sw: line ? 3 : 2, st: tool === "text" ? "none" : "#e6007e", fill: tool === "rect" || tool === "ellipse" ? "#fde9f3" : "none", tc: "#17141a", t: "" };
        if (line) { s.x2 = s.x; s.y2 = s.y; } else { s.w = 0; s.h = 0; }
        drag = { m: "new", s: s, p: p, pg: pg, pre: JSON.stringify(S) }; S.shapes.push(s); selShape = s.id; renderShapes();
      }
      else if (sh) { s = byId(+sh.getAttribute("data-id")); selectShape(s.id); drag = { m: "mv", s: s, o: JSON.parse(JSON.stringify(s)), p: p, pg: pg, pre: JSON.stringify(S) }; }
      else if (!t.closest(".ed-layer")) selectEl(t);
      else deselect();
    }, true);
    document.addEventListener("pointermove", function (ev) {
      if (!drag) return;
      var q = loc(drag.pg, ev), dx = q.x - drag.p.x, dy = q.y - drag.p.y, s = drag.s, o = drag.o, line = s.k === "line" || s.k === "arrow";
      if (drag.m === "mv") { s.x = r1(o.x + dx); s.y = r1(o.y + dy); if (line) { s.x2 = r1(o.x2 + dx); s.y2 = r1(o.y2 + dy); } }
      else if (drag.m === "new") { if (line) { s.x2 = r1(q.x); s.y2 = r1(q.y); } else { s.x = r1(Math.min(drag.p.x, q.x)); s.y = r1(Math.min(drag.p.y, q.y)); s.w = r1(Math.abs(dx)); s.h = r1(Math.abs(dy)); } }
      else if (line) { if (drag.h === "a") { s.x = r1(o.x + dx); s.y = r1(o.y + dy); } else { s.x2 = r1(o.x2 + dx); s.y2 = r1(o.y2 + dy); } }
      else {
        var hh = drag.h, nw = o.w, nh = o.h; s.x = o.x; s.y = o.y;
        if (/e/.test(hh)) nw = Math.max(12, o.w + dx); if (/s/.test(hh)) nh = Math.max(12, o.h + dy);
        if (/w/.test(hh)) { nw = Math.max(12, o.w - dx); s.x = r1(o.x + o.w - nw); } if (/n/.test(hh)) { nh = Math.max(12, o.h - dy); s.y = r1(o.y + o.h - nh); }
        s.w = r1(nw); s.h = r1(nh);
      }
      renderShapes();
    });
    document.addEventListener("pointerup", function () {
      if (!drag) return; var d = drag, s = d.s, line = s.k === "line" || s.k === "arrow"; drag = null;
      if (d.m === "new") {
        if (line && Math.hypot(s.x2 - s.x, s.y2 - s.y) < 8) { S.shapes.pop(); selShape = 0; }
        else if (!line && (s.w < 8 || s.h < 8)) { s.w = tool === "text" ? 160 : 120; s.h = tool === "text" ? 36 : 70; }
        hist.push(d.pre); setTool("sel"); renderShapes(); syncPal();
        if (selShape && s.k === "text") startEdit(Q('[data-id="' + s.id + '"]'));
      } else if (JSON.stringify(S) !== d.pre) hist.push(d.pre);
      refresh();
    });
    document.addEventListener("dblclick", function (ev) {
      if (!on) return; var t = ev.target, pg = t.closest && t.closest("#app > section");
      if (!pg || t.closest(".ed-ui") || t.closest(".ed-h")) return;
      var sh = t.closest(".ed-s");
      if (sh) { startEdit(sh); return; }
      if (t.closest(".ed-layer")) return;
      var r = document.caretRangeFromPoint && document.caretRangeFromPoint(ev.clientX, ev.clientY), n = r && r.startContainer, el = n && (n.nodeType === 3 ? n.parentElement : n);
      startEdit(el && pg.contains(el) && !el.closest(".ed-layer") ? el : t);
    }, true);
    document.addEventListener("click", function (ev) { if (on && ev.target.closest && ev.target.closest("#app")) { ev.preventDefault(); ev.stopPropagation(); } }, true);
    document.addEventListener("mouseover", function (ev) {
      if (!on) return; if (hov) hov.classList.remove("ed-hov"); hov = null;
      var t = ev.target; if (!editing && t.closest && t.closest("#app") && !t.closest(".ed-layer")) { hov = t; t.classList.add("ed-hov"); }
    });
    document.addEventListener("paste", function (ev) { if (on && editing && editing.contains(ev.target)) { ev.preventDefault(); put((ev.clipboardData || window.clipboardData).getData("text/plain")); } }, true);
    document.addEventListener("focusout", function (ev) { if (editing && ev.target === editing) setTimeout(stopEdit, 0); });
    document.addEventListener("keydown", function (ev) {
      if (!on) return;
      var typing = ev.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(ev.target.tagName);
      if (typing) {
        ev.stopPropagation();
        if (editing && ev.key === "Enter" && (ev.isComposing || ev.keyCode === 229)) { if (!(ev.ctrlKey || ev.metaKey)) brPending = true; return; } /* 한글 조합 중 Enter: 조합을 끝낸 뒤 줄바꿈 */
        if (editing && ev.key === "Enter") { ev.preventDefault(); if (ev.ctrlKey || ev.metaKey) stopEdit(); else put("\n"); }
        else if (ev.key === "Escape") { ev.preventDefault(); if (editing) stopEdit(); else ev.target.blur(); }
        return;
      }
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); ev.stopPropagation(); undo(); }
      else if (ev.altKey && (ev.key === "ArrowUp" || ev.key === "ArrowDown") && sel) { ev.preventDefault(); ev.stopPropagation(); move(ev.key === "ArrowUp" ? -1 : 1); }
      else if ((ev.key === "Delete" || ev.key === "Backspace") && selShape) { ev.preventDefault(); ev.stopPropagation(); delShape(); }
      else if (ev.key === "Escape" && (sel || selShape)) { ev.stopPropagation(); deselect(); }
    }, true);

    /* ── 저장 · 불러오기 ── */
    function serialize() {
      var sp = function (k) { var i = k.indexOf("|"); return { p: k.slice(0, i), path: k.slice(i + 1) }; };
      return {
        v: 1,
        texts: Object.keys(S.texts).sort().map(function (k) { var a = sp(k), v = S.texts[k]; a.o = v.o; a.h = v.h; return a; }),
        styles: Object.keys(S.styles).sort().map(function (k) { var a = sp(k), v = S.styles[k]; a.o = v.o; Object.keys(SP).forEach(function (n) { if (v[n]) a[n] = v[n]; }); return a; }),
        shapes: S.shapes,
        moves: Object.keys(S.moves).sort().map(function (k) { var a = sp(k), v = S.moves[k]; a.n = v.n; a.ord = v.ord; return a; })
      };
    }
    function load(t) {
      var j; try { j = JSON.parse(t); } catch (e) { return; }
      (j.texts || []).forEach(function (x) { if (x && typeof x.p === "string" && typeof x.path === "string") S.texts[x.p + "|" + x.path] = { o: String(x.o || ""), h: String(x.h || "") }; });
      (j.styles || []).forEach(function (x) {
        if (!x || typeof x.p !== "string" || typeof x.path !== "string") return;
        var v = { o: String(x.o || "") }; Object.keys(SP).forEach(function (n) { if (SV[n].test(x[n])) v[n] = x[n]; }); S.styles[x.p + "|" + x.path] = v;
      });
      (j.shapes || []).forEach(function (x) {
        if (!x || !KINDS[x.k] || typeof x.p !== "string" || !COLOR.test(x.st) || !COLOR.test(x.fill) || !COLOR.test(x.tc)) return;
        var s = { id: num(x.id), p: x.p, k: x.k, x: num(x.x), y: num(x.y), sw: num(x.sw), st: x.st, fill: x.fill, tc: x.tc, t: String(x.t || "").slice(0, 500) };
        if (x.k === "line" || x.k === "arrow") { s.x2 = num(x.x2); s.y2 = num(x.y2); } else { s.w = num(x.w); s.h = num(x.h); }
        ["fw", "fi", "td", "fs"].forEach(function (n) { if (SV[n].test(x[n])) s[n] = x[n]; });
        if (Object.keys(s).every(function (n) { return s[n] !== null; })) S.shapes.push(s);
      });
      (j.moves || []).forEach(function (x) {
        if (!x || typeof x.p !== "string" || typeof x.path !== "string" || !Array.isArray(x.ord) || x.ord.length !== x.n) return;
        var ok = x.ord.slice().sort(function (a, b) { return a - b; }).every(function (v, i) { return v === i; }); /* 0 ~ n-1 순열만 */
        if (ok) S.moves[x.p + "|" + x.path] = { n: x.n, ord: x.ord.map(Number) };
      });
      nid = S.shapes.reduce(function (m, s) { return Math.max(m, s.id + 1); }, 1);
    }
    var token = function () { try { return localStorage.getItem(TK) || ""; } catch (e) { return ""; } };
    function askToken() {
      var v = prompt("GitHub 토큰을 입력하세요.\n· " + REPO + " 저장소의 Contents: Read and write 권한만 있는 fine-grained 토큰을 권장합니다.\n· 이 브라우저에만 저장됩니다. 비우면 삭제됩니다.", token());
      if (v === null) return ""; try { v ? localStorage.setItem(TK, v.trim()) : localStorage.removeItem(TK); } catch (e) {} return v.trim();
    }
    async function save() {
      stopEdit();
      var tk = token() || askToken(); if (!tk) return msg("토큰이 없어 저장하지 않았습니다.", 1);
      var txt = JSON.stringify(serialize(), null, 1) + "\n", url = "https://api.github.com/repos/" + REPO + "/contents/" + FILE;
      var H = { Authorization: "Bearer " + tk, Accept: "application/vnd.github+json" };
      msg("저장 중…");
      try {
        var g = await fetch(url + "?ref=" + BRANCH, { headers: H, cache: "no-store" }), sha, remote = "";
        if (g.status === 200) { var j = await g.json(); sha = j.sha; remote = new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\s/g, "")), function (c) { return c.charCodeAt(0); })); }
        else if (g.status !== 404) throw new Error(g.status === 401 || g.status === 403 ? "토큰 권한 오류(" + g.status + ")" : "조회 실패(" + g.status + ")");
        if (remote && remote !== loadedText && !confirm("이 화면을 연 뒤 다른 저장이 있었습니다. 내 수정으로 덮어쓸까요?")) return msg("저장을 취소했습니다.", 1);
        var bin = ""; new TextEncoder().encode(txt).forEach(function (c) { bin += String.fromCharCode(c); });
        var n = serialize(), p = await fetch(url, { method: "PUT", headers: H, body: JSON.stringify({ message: "화면 편집: 글자 " + n.texts.length + " · 서식 " + n.styles.length + " · 도형 " + n.shapes.length + " · 이동 " + n.moves.length, content: btoa(bin), branch: BRANCH, sha: sha }) });
        if (!p.ok) throw new Error(p.status === 401 || p.status === 403 ? "토큰 권한 오류(" + p.status + ")" : p.status === 409 || p.status === 422 ? "다른 저장과 충돌했습니다. 다시 시도하세요(" + p.status + ")" : "저장 실패(" + p.status + ")");
        var r = await p.json(); loadedText = txt; savedSig = sig(); msg("저장됨 · 커밋 " + String(r.commit.sha).slice(0, 7) + " (배포는 별도)"); refresh(true);
      } catch (e) { msg(String(e.message || e), 1); }
    }

    /* ── 툴바 ── */
    function msg(t, bad) { var m = $("ed-msg"); m.textContent = t; m.classList.toggle("bad", !!bad); }
    function refresh(keep) {
      if (!$("ed-msg")) return; if (keep) return;
      var n = serialize(); msg("글자 " + n.texts.length + " · 서식 " + n.styles.length + " · 도형 " + n.shapes.length + " · 이동 " + n.moves.length + (sig() !== savedSig ? " · 저장 안 됨" : "") + (stale ? " · 적용 안 된 수정 " + stale + "건" : ""));
    }
    function setTool(t) { tool = t; document.body.classList.toggle("ed-draw", t !== "sel"); Array.prototype.forEach.call(document.querySelectorAll("#ed-ui [data-t]"), function (b) { b.classList.toggle("on", b.getAttribute("data-t") === t); }); }
    function setOn(v) {
      if (v && !document.body.classList.contains("staged")) return;
      if (!v) { stopEdit(); deselect(); setTool("sel"); if (hov) hov.classList.remove("ed-hov"); }
      on = v; document.body.classList.toggle("editing", v); $("ed-ui").hidden = !v; $("ed-toggle").setAttribute("aria-pressed", String(v)); if (v) refresh();
    }
    var ui = document.createElement("div");
    ui.id = "ed-ui"; ui.className = "ed-ui"; ui.hidden = true;
    ui.innerHTML = '<div class="ed-row"><button type="button" data-t="sel" class="on" title="선택 · 더블클릭으로 글자 수정">선택</button><button type="button" data-t="rect">▭ 사각형</button><button type="button" data-t="ellipse">◯ 원</button><button type="button" data-t="line">╱ 선</button><button type="button" data-t="arrow">→ 화살표</button><button type="button" data-t="text">T 글상자</button>' +
      '<span class="sp"></span><label class="c-bg">배경 <input type="color" id="ed-bg"></label><button type="button" id="ed-nobg" class="c-bg" title="배경 없음(투명)">없음</button><label class="c-fg">글자 <input type="color" id="ed-fg"></label><label class="c-st">선 <input type="color" id="ed-st"></label>' +
      '<span class="sp c-fm"></span><span class="c-fm ed-fm"><button type="button" data-f="bold" title="굵게 (Ctrl+B)"><b>B</b></button><button type="button" data-f="italic" title="기울임 (Ctrl+I)"><i>I</i></button><button type="button" data-f="underline" title="밑줄 (Ctrl+U)"><u>U</u></button><button type="button" data-f="strike" title="취소선"><s>S</s></button><button type="button" data-z="-2" title="글자 작게 (블록·글상자 전체)">A−</button><button type="button" data-z="2" title="글자 크게 (블록·글상자 전체)">A+</button></span>' +
      '<span class="sp"></span><button type="button" id="ed-up" class="c-el" title="바로 위 요소(블록)를 선택">↑ 상위</button><button type="button" id="ed-mu" class="c-el" title="선택한 블록을 한 칸 위로 (Alt+↑)">▲ 위로</button><button type="button" id="ed-md" class="c-el" title="선택한 블록을 한 칸 아래로 (Alt+↓)">▼ 아래로</button><button type="button" id="ed-rs" class="c-el" title="이 요소의 서식(색·굵기·크기) 수정을 취소">서식 초기화</button><button type="button" id="ed-del" class="c-sh">삭제</button><button type="button" id="ed-undo" title="되돌리기 (Ctrl/⌘+Z)" aria-label="되돌리기"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></button>' +
      '<span class="sp"></span><button type="button" id="ed-save" class="pri">저장 (git)</button><button type="button" id="ed-tok" title="GitHub 토큰 입력/삭제">토큰</button></div><div class="ed-msg" id="ed-msg" role="status"></div>';
    document.body.appendChild(ui);
    var tg = document.createElement("button");
    tg.type = "button"; tg.id = "ed-toggle"; tg.className = "pg-back"; tg.setAttribute("aria-pressed", "false"); tg.title = "화면 편집 (글자 · 도형 · 색상)"; tg.textContent = "✎ 편집";
    $("fs").parentNode.insertBefore(tg, $("fs"));
    tg.addEventListener("click", function () { setOn(!on); });
    ui.addEventListener("mousedown", function (ev) { if (ev.target.closest("[data-f],[data-z]")) ev.preventDefault(); }); /* 서식 버튼은 글자 선택·편집 상태를 유지 */
    ui.addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-t")) { stopEdit(); deselect(); setTool(b.getAttribute("data-t")); }
      else if (b.hasAttribute("data-f")) fmt(b.getAttribute("data-f"));
      else if (b.hasAttribute("data-z")) size(+b.getAttribute("data-z"));
      else if (b.id === "ed-save") save();
      else if (b.id === "ed-tok") { askToken(); msg(token() ? "토큰을 저장했습니다." : "토큰을 삭제했습니다."); }
      else if (b.id === "ed-undo") undo();
      else if (b.id === "ed-del") { if (selShape) delShape(); }
      else if (b.id === "ed-mu" || b.id === "ed-md") move(b.id === "ed-mu" ? -1 : 1);
      else if (b.id === "ed-up") { if (sel && sel.parentElement && sel.parentElement.closest("#app > section")) { var u = sel.parentElement; selectEl(u); } }
      else if (b.id === "ed-rs") { if (sel && S.styles[key(sel)]) commit(function () { delete S.styles[key(sel)]; var e = sel; applyAll(); selectEl(e); }); }
      else if (b.id === "ed-nobg") { var s = byId(selShape); if (s) { snap(); s.fill = "none"; renderShapes(); snapped = false; refresh(); } else if (sel) { paint("bg", "transparent"); snapped = false; } }
    });
    ["bg", "fg", "st"].forEach(function (n) {
      var i = $("ed-" + n);
      i.addEventListener("input", function () { paint(n, i.value); });
      i.addEventListener("change", function () { snapped = false; });
    });
    document.addEventListener("compositionend", function () { if (brPending) { brPending = false; setTimeout(function () { if (editing) put("\n"); }, 0); } }, true);
    document.addEventListener("selectionchange", function () { if (on && editing) syncFmt(); });
    window.addEventListener("beforeunload", function (ev) { if (on && sig() !== savedSig) { ev.preventDefault(); ev.returnValue = ""; } });
    window.addEventListener("resize", function () { setTimeout(function () { if (on && !document.body.classList.contains("staged")) setOn(false); }, 250); });

    pages.forEach(layer);
    fetch(FILE, { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : ""; }).then(function (t) {
      loadedText = t; if (t) { load(t); applyAll(); }
      savedSig = sig();
    }).catch(function () { savedSig = sig(); });
    savedSig = sig();
  })();
