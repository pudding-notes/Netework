/* 진행도 저장 + 스테이지 메뉴 + Quick Check 결산 화면 */
window.NA = window.NA || {};

(function () {
  var KEY = 'net-arcade-v1';
  var mem = { qc: {}, best: {} };   // localStorage 가 막혀 있어도 세션 동안은 동작

  function load() {
    try { var s = localStorage.getItem(KEY); if (s) mem = JSON.parse(s); } catch (e) {}
    mem.qc = mem.qc || {}; mem.best = mem.best || {};
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {} }
  load();

  NA.progress = {
    data: function () { return load(); },
    isCleared: function (id) { return !!load().qc[id]; },
    clearQC: function (id) { load(); if (!mem.qc[id]) { mem.qc[id] = Date.now(); save(); } },
    best: function (gameId, stage) { var b = load().best[gameId]; return (b && b[stage]) || null; },
    saveBest: function (gameId, stage, stars, score) {
      load();
      var b = mem.best[gameId] = mem.best[gameId] || {};
      var cur = b[stage] || { stars: 0, score: 0 };
      b[stage] = { stars: Math.max(cur.stars, stars), score: Math.max(cur.score, score) };
      save();
    },
    reset: function () { mem = { qc: {}, best: {} }; save(); }
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function stars(n) { var s = ''; for (var i = 0; i < 3; i++) s += i < n ? '★' : '☆'; return s; }

  /* 1280×720 설계 화면을 부모 영역에 꽉 맞게 확대·축소 (스크롤 없음) */
  NA.fitStage = function (stage, W, H) {
    W = W || 1280; H = H || 720;
    function fit() {
      var host = stage.parentElement, r = host.getBoundingClientRect();
      var s = Math.min(r.width / W, r.height / H);
      if (!isFinite(s) || s <= 0) s = 1;
      stage.style.transform = 'scale(' + s + ')';
      stage.style.left = Math.max(0, (r.width - W * s) / 2) + 'px';
      stage.style.top = Math.max(0, (r.height - H * s) / 2) + 'px';
    }
    window.addEventListener('resize', fit);
    fit();
    return fit;
  };

  /* 허브의 무한 모드 탭에서 들어오면(#endless) 스테이지 메뉴를 건너뛴다 */
  NA.wantsEndless = function () { return location.hash === '#endless' || window.NA_HASH === '#endless'; };

  NA.ui = {
    esc: esc, stars: stars,

    /* 상단 바의 Quick Check 태그 */
    renderTags: function (gameId) {
      var el = document.querySelector('.na-top .tags'); if (!el) return;
      var g = NA.GAME_BY_ID[gameId];
      el.innerHTML = g.qc.map(function (id) {
        return '<span class="qc-tag' + (NA.progress.isCleared(id) ? ' done' : '') + '" title="' + esc(NA.QC_BY_ID[id].q) + '">QC ' + id + '</span>';
      }).join('');
    },

    /* 스테이지 선택 화면 */
    stageMenu: function (o) {
      var ov = o.overlay, gm = NA.GAME_BY_ID[o.gameId];
      var html = '<div class="na-card"><h2>' + esc(gm.title) + '</h2><p class="sub">' + esc(gm.pitch) + '</p>';
      if (o.howto) html += '<div class="howto">' + o.howto + '</div>';
      html += '<div class="stage-list">';
      o.stages.forEach(function (s, i) {
        var b = NA.progress.best(o.gameId, i);
        var prev = i === 0 ? { stars: 1 } : NA.progress.best(o.gameId, i - 1);
        var locked = !(prev && prev.stars > 0);
        html += '<button class="stage-btn" data-i="' + i + '"' + (locked ? ' disabled' : '') + '>' +
          '<span class="n">STAGE ' + (i + 1) + (s.qc ? ' · QC ' + s.qc.join(', ') : '') + '</span>' +
          '<span class="t">' + esc(s.title) + '</span><span class="d">' + esc(s.desc) + '</span>' +
          '<span class="stars">' + (locked ? '잠김' : stars(b ? b.stars : 0) + (b ? '  ' + b.score + '점' : '')) + '</span></button>';
      });
      if (o.endless) {
        var eb = NA.progress.best(o.gameId, 'endless');
        html += '<button class="stage-btn endless" data-endless><span class="n">∞ 무한 모드 · 문제 무작위</span>' +
          '<span class="t">' + esc(o.endless.title) + '</span><span class="d">' + esc(o.endless.desc) + '</span>' +
          '<span class="stars">' + (eb ? stars(eb.stars) + '  최고 ' + eb.score + '점' : '기록 없음') + '</span></button>';
      }
      html += '</div><div class="na-row"><a class="na-btn" href="../../index.html">← 아케이드 허브</a>' +
        '<button class="na-btn" data-mute>' + (NA.sfx.muted ? '소리 켜기' : '소리 끄기') + '</button></div></div>';
      ov.innerHTML = html; ov.hidden = false;
      ov.querySelectorAll('.stage-btn[data-i]').forEach(function (b) {
        b.onclick = function () { NA.sfx.unlock(); ov.hidden = true; o.onPick(+b.dataset.i); };
      });
      var ebtn = ov.querySelector('[data-endless]');
      if (ebtn) ebtn.onclick = function () { NA.sfx.unlock(); ov.hidden = true; o.endless.onPick(); };
      ov.querySelector('[data-mute]').onclick = function (e) { NA.sfx.unlock(); var m = NA.sfx.toggle(); e.target.textContent = m ? '소리 켜기' : '소리 끄기'; };
    },

    /* 짧은 안내 카드 (스테이지 시작 전 브리핑) */
    briefing: function (ov, title, bodyHTML, onGo) {
      ov.innerHTML = '<div class="na-card"><h2>' + esc(title) + '</h2><div class="howto">' + bodyHTML + '</div>' +
        '<div class="na-row"><button class="na-btn primary" data-go>시작 (Enter)</button></div></div>';
      ov.hidden = false;
      var done = false, btn = ov.querySelector('[data-go]');
      function go() { if (done) return; done = true; window.removeEventListener('keydown', kd); ov.hidden = true; onGo(); }
      function kd(e) {
        // 다른 화면으로 바뀌었으면 이 안내는 더 이상 유효하지 않다
        if (!ov.contains(btn) || ov.hidden) { done = true; window.removeEventListener('keydown', kd); return; }
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      }
      btn.onclick = go;
      setTimeout(function () { window.addEventListener('keydown', kd); }, 150);
    },

    /* 결산 화면: 성적 + Quick Check 문항 */
    debrief: function (o) {
      var ov = o.overlay;
      var prevBest = o.endless ? NA.progress.best(o.gameId, 'endless') : null;
      if (o.endless) NA.progress.saveBest(o.gameId, 'endless', o.stars, o.score);
      else if (o.win) NA.progress.saveBest(o.gameId, o.stage, o.stars, o.score);
      var showStars = o.win || o.endless;
      var ids = (o.qc || []).slice().sort(function (a, b) { return NA.progress.isCleared(a) - NA.progress.isCleared(b); });
      var idx = 0;

      var html = '<div class="na-card"><h2 style="color:' + (o.endless ? 'var(--ack)' : o.win ? 'var(--ok)' : 'var(--bad)') + '">' + esc(o.title) + '</h2>';
      if (o.endless) html += '<div class="endless-score"><b>' + o.score + '</b>점 ' + (o.score > 0 && (!prevBest || o.score > prevBest.score) ? '<span class="nb">최고 기록!</span>' : !prevBest ? '<span>첫 기록</span>' : '<span>최고 ' + prevBest.score + '점</span>') + '<span class="st">' + stars(o.stars) + '</span></div>';
      else if (showStars) html += '<div style="color:var(--ack);font-size:26px;margin-bottom:8px">' + stars(o.stars) + '</div>';
      if (o.sub) html += '<p class="sub">' + o.sub + '</p>';
      html += '<div class="stat-grid">' + (o.stats || []).map(function (s) {
        return '<div class="stat"><div class="k">' + esc(s[0]) + '</div><div class="v">' + esc(s[1]) + '</div></div>';
      }).join('') + '</div>';
      html += '<div class="qc-box" data-qc></div>';
      html += '<div class="na-row">' +
        (o.win && o.onNext ? '<button class="na-btn primary" data-next>다음 스테이지</button>' : '') +
        '<button class="na-btn' + (o.win && o.onNext ? '' : ' primary') + '" data-retry>다시 하기 (R)</button>' +
        '<button class="na-btn" data-menu>스테이지 목록</button></div></div>';
      ov.innerHTML = html; ov.hidden = false;

      var box = ov.querySelector('[data-qc]');
      function showQC() {
        if (idx >= ids.length) { box.innerHTML = ids.length ? '<div class="lbl">QUICK CHECK</div><p class="sub" style="margin:6px 0 0">이 스테이지의 Quick Check를 모두 확인했다.</p>' : ''; if (!ids.length) box.remove(); return; }
        var q = NA.QC_BY_ID[ids[idx]];
        var opts = NA.shuffle([{ t: q.a, ok: true }].concat(q.w.map(function (w) { return { t: w, ok: false }; })));
        box.innerHTML = '<div class="lbl">QUICK CHECK · WEEK ' + q.week + ' · ' + q.id + (NA.progress.isCleared(q.id) ? ' (복습)' : '') + '</div>' +
          '<div class="q">' + esc(q.q) + '</div>' +
          opts.map(function (op, i) { return '<button class="qc-opt" data-i="' + i + '">' + (i + 1) + '. ' + esc(op.t) + '</button>'; }).join('');
        var btns = box.querySelectorAll('.qc-opt');
        btns.forEach(function (b) {
          b.onclick = function () {
            var op = opts[+b.dataset.i];
            btns.forEach(function (x, j) { x.disabled = true; if (opts[j].ok) x.classList.add('right'); });
            if (!op.ok) { b.classList.add('wrong'); NA.sfx.bad(); } else { NA.sfx.good(); NA.progress.clearQC(q.id); NA.ui.renderTags(o.gameId); }
            var note = o.playNotes && o.playNotes[q.id];
            var why = document.createElement('div');
            why.className = 'qc-why';
            why.innerHTML = (op.ok ? '<b style="color:var(--ok)">정답. Quick Check 클리어!</b><br>' : '<b style="color:var(--bad)">아쉽다. 다음 판에 다시 나온다.</b><br>') +
              esc(q.why) + (note ? '<span class="play">▶ 방금 게임에서: ' + esc(note) + '</span>' : '');
            box.appendChild(why);
            if (idx + 1 < ids.length) {
              var nx = document.createElement('button'); nx.className = 'na-btn'; nx.style.marginTop = '10px'; nx.textContent = '다음 문항 →';
              nx.onclick = function () { idx++; showQC(); }; box.appendChild(nx);
            }
          };
        });
      }
      showQC();

      function cleanup() { window.removeEventListener('keydown', kd); ov.hidden = true; }
      var card = ov.querySelector('.na-card');
      function kd(e) {
        if (!ov.contains(card) || ov.hidden) { window.removeEventListener('keydown', kd); return; }
        if (e.key === 'r' || e.key === 'R') { cleanup(); o.onRetry(); }
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= 3) { var b = box.querySelector('.qc-opt[data-i="' + (n - 1) + '"]'); if (b && !b.disabled) b.click(); }
      }
      setTimeout(function () { window.addEventListener('keydown', kd); }, 300);
      var nb = ov.querySelector('[data-next]'); if (nb) nb.onclick = function () { cleanup(); o.onNext(); };
      ov.querySelector('[data-retry]').onclick = function () { cleanup(); o.onRetry(); };
      ov.querySelector('[data-menu]').onclick = function () { cleanup(); o.onMenu(); };
    }
  };
})();
