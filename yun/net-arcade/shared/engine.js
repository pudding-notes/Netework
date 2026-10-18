/* net-arcade 공통 엔진 (외부 라이브러리 없음, file:// 로 바로 실행 가능)
 * NA.createGame  : 캔버스 + 게임 루프 + 입력 + 화면 맞춤
 * NA.sfx         : WebAudio 합성 효과음
 * NA.fx          : 파티클, 떠오르는 글자, 화면 흔들림
 * NA.draw        : 텍스트/도형 헬퍼
 */
window.NA = window.NA || {};

(function () {
  var C = {
    bg: '#0a0e1c', bg2: '#111833', panel: '#151d3d', line: '#26305a',
    ink: '#e8ecff', dim: '#8a93c2', data: '#4de2ff', ack: '#ffc94d',
    ok: '#5dffa0', bad: '#ff5470', vio: '#b18cff', pink: '#ff8ad8'
  };
  NA.C = C;
  NA.FONT = "'Galmuri11', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";

  NA.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  NA.lerp = function (a, b, t) { return a + (b - a) * t; };
  NA.rand = function (a, b) { return a + Math.random() * (b - a); };
  NA.randi = function (a, b) { return Math.floor(NA.rand(a, b + 1)); };
  NA.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  NA.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };
  NA.ease = {
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    outBack: function (t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
    inOut: function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  };

  /* ------------------------------------------------------------ game loop */
  NA.createGame = function (opts) {
    var W = opts.width || 1280, H = opts.height || 720;
    var mount = opts.mount;
    var canvas = document.createElement('canvas');
    mount.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var g = {
      W: W, H: H, canvas: canvas, ctx: ctx, t: 0, running: false, paused: false,
      timeScale: 1, shakeAmt: 0,
      input: { down: {}, pressed: {}, mouse: { x: 0, y: 0, down: false, clicked: false } },
      update: opts.update || function () {}, render: opts.render || function () {}
    };

    function fit() {
      var r = mount.getBoundingClientRect();
      var s = Math.min(r.width / W, r.height / H);
      if (!isFinite(s) || s <= 0) s = 1;
      var dpr = window.devicePixelRatio || 1;
      canvas.style.width = Math.floor(W * s) + 'px';
      canvas.style.height = Math.floor(H * s) + 'px';
      canvas.width = Math.floor(W * s * dpr);
      canvas.height = Math.floor(H * s * dpr);
      g.k = s * dpr;
    }
    window.addEventListener('resize', fit);
    fit();

    var KEYMAP = { ' ': 'space', 'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right', 'Escape': 'esc', 'Enter': 'enter' };
    function keyName(e) { return KEYMAP[e.key] || (e.key.length === 1 ? e.key.toLowerCase() : e.key); }
    window.addEventListener('keydown', function (e) {
      var k = keyName(e);
      if (!g.input.down[k]) g.input.pressed[k] = true;
      g.input.down[k] = true;
      if (g.running && ['space', 'up', 'down', 'left', 'right'].indexOf(k) >= 0) e.preventDefault();
      NA.sfx.unlock();
    });
    window.addEventListener('keyup', function (e) { g.input.down[keyName(e)] = false; });
    function toLocal(e) {
      var r = canvas.getBoundingClientRect();
      g.input.mouse.x = (e.clientX - r.left) / r.width * W;
      g.input.mouse.y = (e.clientY - r.top) / r.height * H;
    }
    canvas.addEventListener('pointermove', toLocal);
    canvas.addEventListener('pointerdown', function (e) { toLocal(e); g.input.mouse.down = true; g.input.mouse.clicked = true; NA.sfx.unlock(); });
    window.addEventListener('pointerup', function () { g.input.mouse.down = false; });
    window.addEventListener('blur', function () { g.input.down = {}; });

    g.pressed = function (k) { return !!g.input.pressed[k]; };
    g.clicked = function () { return g.input.mouse.clicked; };
    g.shake = function (a) { g.shakeAmt = Math.max(g.shakeAmt, a); };
    g.fit = fit;

    var last = 0;
    function frame(ts) {
      if (!g.running) return;
      var dt = Math.min(0.05, (ts - (last || ts)) / 1000);
      last = ts;
      if (!g.paused) {
        dt *= g.timeScale;
        g.t += dt;
        g.update(dt, g);
        NA.fx.update(dt);
      }
      ctx.setTransform(g.k, 0, 0, g.k, 0, 0);
      ctx.save();
      if (g.shakeAmt > 0.2) {
        ctx.translate(NA.rand(-g.shakeAmt, g.shakeAmt), NA.rand(-g.shakeAmt, g.shakeAmt));
        g.shakeAmt *= 0.86;
      } else g.shakeAmt = 0;
      g.render(ctx, g);
      NA.fx.render(ctx);
      ctx.restore();
      NA.draw.scanlines(ctx, W, H);
      g.input.pressed = {};
      g.input.mouse.clicked = false;
      requestAnimationFrame(frame);
    }
    g.start = function () { if (g.running) return; g.running = true; last = 0; requestAnimationFrame(frame); };
    g.stop = function () { g.running = false; };
    return g;
  };

  /* ------------------------------------------------------------ drawing */
  NA.draw = {
    text: function (ctx, s, x, y, o) {
      o = o || {};
      ctx.font = (o.bold ? '700 ' : '400 ') + (o.size || 16) + 'px ' + NA.FONT;
      ctx.textAlign = o.align || 'left';
      ctx.textBaseline = o.base || 'alphabetic';
      if (o.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(s, x + 2, y + 2); }
      ctx.fillStyle = o.color || C.ink;
      ctx.fillText(s, x, y);
    },
    rect: function (ctx, x, y, w, h, fill, stroke, lw) {
      if (fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }
      if (stroke) { ctx.lineWidth = lw || 2; ctx.strokeStyle = stroke; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1); }
    },
    /* 픽셀 느낌의 박스: 그림자 + 테두리 */
    box: function (ctx, x, y, w, h, fill, stroke) {
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x + 4, y + 4, w, h);
      ctx.fillStyle = fill || C.panel; ctx.fillRect(x, y, w, h);
      ctx.lineWidth = 2; ctx.strokeStyle = stroke || C.line; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    },
    glow: function (ctx, color, blur, fn) {
      ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; fn(); ctx.restore();
    },
    grid: function (ctx, W, H, t, step) {
      step = step || 40;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(77,226,255,0.05)'; ctx.lineWidth = 1;
      ctx.beginPath();
      var off = (t * 10) % step;
      for (var x = -off; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (var y = 0; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();
    },
    scanlines: function (ctx, W, H) {
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      for (var y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    },
    bar: function (ctx, x, y, w, h, ratio, color, back) {
      ctx.fillStyle = back || 'rgba(255,255,255,.08)'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = color; ctx.fillRect(x, y, Math.max(0, Math.min(1, ratio)) * w, h);
    },
    heart: function (ctx, x, y, s, on) {
      ctx.fillStyle = on ? C.bad : 'rgba(255,255,255,.15)';
      var p = [[1,0],[2,0],[4,0],[5,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[1,3],[2,3],[3,3],[4,3],[5,3],[2,4],[3,4],[4,4],[3,5]];
      for (var i = 0; i < p.length; i++) ctx.fillRect(x + p[i][0] * s, y + p[i][1] * s, s, s);
    }
  };

  /* ------------------------------------------------------------ effects */
  NA.fx = {
    parts: [], floats: [],
    burst: function (x, y, color, n, speed) {
      n = n || 14; speed = speed || 220;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, v = NA.rand(.3, 1) * speed;
        this.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: NA.rand(.35, .7), max: .7, c: color, s: NA.randi(3, 6) });
      }
    },
    float: function (x, y, s, color, size) {
      this.floats.push({ x: x, y: y, s: s, c: color || C.ink, life: 1.1, size: size || 18 });
    },
    clear: function () { this.parts = []; this.floats = []; },
    update: function (dt) {
      var p, i;
      for (i = this.parts.length - 1; i >= 0; i--) {
        p = this.parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .92; p.vy = p.vy * .92 + 300 * dt;
        if (p.life <= 0) this.parts.splice(i, 1);
      }
      for (i = this.floats.length - 1; i >= 0; i--) {
        p = this.floats[i]; p.life -= dt; p.y -= 40 * dt;
        if (p.life <= 0) this.floats.splice(i, 1);
      }
    },
    render: function (ctx) {
      var i, p;
      for (i = 0; i < this.parts.length; i++) {
        p = this.parts[i]; ctx.globalAlpha = Math.max(0, p.life / p.max);
        ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s);
      }
      ctx.globalAlpha = 1;
      for (i = 0; i < this.floats.length; i++) {
        p = this.floats[i]; ctx.globalAlpha = Math.min(1, p.life * 2);
        NA.draw.text(ctx, p.s, p.x, p.y, { size: p.size, color: p.c, align: 'center', bold: true });
      }
      ctx.globalAlpha = 1;
    }
  };

  /* ------------------------------------------------------------ sound */
  NA.sfx = {
    ac: null, muted: false, master: null,
    unlock: function () {
      if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); return; }
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        this.ac = new AC();
        this.master = this.ac.createGain(); this.master.gain.value = 0.35; this.master.connect(this.ac.destination);
      } catch (e) { this.ac = null; }
      try { this.muted = localStorage.getItem('na-muted') === '1'; } catch (e) {}
    },
    toggle: function () {
      this.muted = !this.muted;
      try { localStorage.setItem('na-muted', this.muted ? '1' : '0'); } catch (e) {}
      return this.muted;
    },
    tone: function (freq, dur, type, vol, slide, delay) {
      if (!this.ac || this.muted) return;
      var t0 = this.ac.currentTime + (delay || 0);
      var o = this.ac.createOscillator(), gn = this.ac.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
      gn.gain.setValueAtTime(vol || 0.2, t0);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(gn); gn.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.02);
    },
    noise: function (dur, vol) {
      if (!this.ac || this.muted) return;
      var len = Math.floor(this.ac.sampleRate * dur), buf = this.ac.createBuffer(1, len, this.ac.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var s = this.ac.createBufferSource(), gn = this.ac.createGain();
      s.buffer = buf; gn.gain.value = vol || 0.25; s.connect(gn); gn.connect(this.master); s.start();
    },
    good: function () { this.tone(660, .08, 'square', .15); this.tone(990, .1, 'square', .12, null, .06); },
    perfect: function () { this.tone(880, .07, 'square', .14); this.tone(1320, .12, 'triangle', .14, null, .05); },
    bad: function () { this.tone(180, .25, 'sawtooth', .18, .5); },
    pop: function () { this.tone(520, .05, 'triangle', .2, 1.6); },
    send: function () { this.tone(300, .08, 'square', .1, 2); },
    boom: function () { this.noise(.35, .3); this.tone(90, .3, 'sawtooth', .2, .4); },
    tick: function (hi) { this.tone(hi ? 1500 : 1000, .03, 'square', .06); },
    win: function () { var n = [523, 659, 784, 1046]; for (var i = 0; i < n.length; i++) this.tone(n[i], .14, 'square', .14, null, i * .09); },
    lose: function () { var n = [392, 330, 262, 196]; for (var i = 0; i < n.length; i++) this.tone(n[i], .18, 'triangle', .16, null, i * .12); }
  };
})();
