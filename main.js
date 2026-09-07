/* ---------- static mode (?static=1, or prefers-reduced-motion) ---------- */
const STATIC = new URLSearchParams(location.search).has('static')
  || matchMedia('(prefers-reduced-motion: reduce)').matches;
if (STATIC) document.documentElement.classList.add('static-mode');

/* ---------- desktop zoom normalization ----------
   PCでは常に一定倍率（1.55）で表示し、ウィンドウを狭めても文字サイズは
   変わらず列幅だけが狭まる（claude.aiプレビューと同じ挙動）。
   スマホ・タブレット（<=820px）には一切影響しない。 */
const DESKTOP_ZOOM = 1.55;
let PAGE_ZOOM = 1;
let vhCompensation = null;
function probeVhCompensation(z) {
  /* このブラウザで 100vh が zoom の影響を受けるか実測（ブラウザ実装差を吸収） */
  const p = document.createElement('div');
  p.style.cssText = 'position:absolute;top:0;left:0;height:100vh;width:1px;visibility:hidden;pointer-events:none';
  document.body.appendChild(p);
  const h = p.getBoundingClientRect().height;
  p.remove();
  return Math.abs(h - innerHeight * z) < Math.abs(h - innerHeight);
}
function fitZoom() {
  const z = innerWidth > 820 ? DESKTOP_ZOOM : 1;
  PAGE_ZOOM = z;
  const root = document.documentElement;
  if (z > 1) {
    root.style.zoom = z;
    if (vhCompensation === null) vhCompensation = probeVhCompensation(z);
    document.querySelectorAll('.hero4, .contact4').forEach((h) => {
      h.style.minHeight = vhCompensation ? Math.round(innerHeight / z) + 'px' : '';
    });
  } else {
    root.style.zoom = '';
    document.querySelectorAll('.hero4, .contact4').forEach((h) => { h.style.minHeight = ''; });
  }
}
fitZoom();
window.addEventListener('resize', fitZoom);

/* verification helper: ?goto=<selector> scrolls there on load */
const gotoSel = new URLSearchParams(location.search).get('goto');
if (gotoSel) {
  window.addEventListener('load', () => {
    const el = document.querySelector(gotoSel);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - 100, behavior: 'instant' });
  });
}

/* ---------- scroll reveal ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- intro replay ---------- */
function playIntro() {
  const introEl = document.querySelector('.intro');
  if (!introEl || STATIC) return;
  introEl.classList.remove('play');
  void introEl.offsetWidth;
  introEl.classList.add('play');
}
playIntro();

/* ---------- rotating words (hero) ---------- */
document.querySelectorAll('.h4-rotator').forEach((rot) => {
  const words = [...rot.querySelectorAll('span')];
  if (!words.length) return;
  let wi = 0;
  words[0].classList.add('on');
  if (!STATIC) {
    setInterval(() => {
      words[wi].classList.remove('on');
      wi = (wi + 1) % words.length;
      words[wi].classList.add('on');
    }, 4600);
  }
});

/* ---------- cursor glow ---------- */
const glow = document.querySelector('.cursor-glow');
if (glow && !STATIC) {
  window.addEventListener('mousemove', (e) => {
    glow.style.transform = `translate(${e.clientX / PAGE_ZOOM - 320}px, ${e.clientY / PAGE_ZOOM - 320}px)`;
  });
}

/* ---------- flow field factory ---------- */
function makeFlow(canvas, opts) {
  if (!canvas) return;
  const o = Object.assign({ n: 850, alpha: 0.085, fade: 0.045, speed: 1.35, weaveAlpha: 0.028 }, opts);   /* 冒頭は暗く——明るさの頂点はContactの道（物語の構成） */
  const ctx = canvas.getContext('2d');
  let dpr = Math.min(devicePixelRatio, 1.6);
  let W = 0, H = 0, parts = [];

  function field(x, y, t) {
    return (
      Math.sin(x * 0.0013 + t * 0.00016) +
      Math.cos(y * 0.0011 - t * 0.00021) +
      Math.sin((x + y) * 0.0006 + t * 0.0001)
    ) * 1.9;
  }
  const spawn = () => ({ x: Math.random() * W, y: Math.random() * H, life: 60 + Math.random() * 220 });

  function stepAndDraw(t, speed, alpha) {
    ctx.strokeStyle = `rgba(150, 190, 250, ${alpha})`;
    ctx.lineWidth = dpr * 0.55;
    ctx.beginPath();
    for (const p of parts) {
      const a = field(p.x, p.y, t);
      const nx = p.x + Math.cos(a) * speed;
      const ny = p.y + Math.sin(a) * speed;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      p.x = nx; p.y = ny; p.life--;
      if (p.life <= 0 || nx < -8 || nx > W + 8 || ny < -8 || ny > H + 8) Object.assign(p, spawn());
    }
    ctx.stroke();
  }
  function staticWeave() {
    ctx.fillStyle = '#050609';
    ctx.fillRect(0, 0, W, H);
    for (let s = 0; s < 260; s++) stepAndDraw(s * 16, 2.1 * dpr, o.weaveAlpha);
  }
  function resize() {
    if (!canvas.offsetWidth) return;
    dpr = Math.min(devicePixelRatio * PAGE_ZOOM, 2);
    W = canvas.width = canvas.offsetWidth * dpr;
    H = canvas.height = canvas.offsetHeight * dpr;
    parts = Array.from({ length: o.n }, spawn);
    ctx.fillStyle = '#050609';
    ctx.fillRect(0, 0, W, H);
    if (STATIC) staticWeave();
  }
  window.addEventListener('resize', resize);

  let running = true;
  const vis = new IntersectionObserver((entries) => {
    const v = entries[0].isIntersecting;
    if (v && !running) { running = true; requestAnimationFrame(frame); }
    else if (!v) { running = false; }
  }, { threshold: 0.02 });
  vis.observe(canvas);

  function frame(t) {
    if (!running || STATIC) return;
    const cw = Math.round(canvas.offsetWidth * dpr);
    if (!W || Math.abs(cw - W) > 2) { resize(); requestAnimationFrame(frame); return; }
    ctx.fillStyle = `rgba(5, 6, 9, ${o.fade})`;
    ctx.fillRect(0, 0, W, H);
    stepAndDraw(t, o.speed * dpr, o.alpha);
    requestAnimationFrame(frame);
  }

  resize();
  if (!STATIC) requestAnimationFrame(frame);
  return { resize };
}

makeFlow(document.getElementById('flow-canvas'));

/* ---------- contact: 「同じ道を、共に歩む。」— 全流線が一つの消失点（道の先）へ収束する ---------- */
function makeRoadFlow(canvas) {
  if (!canvas) return null;
  const N = 340, FADE = 0.06, SPEED = 1.5;   /* 色はBiographyの進捗線と同系（accent 169,198,242） */
  const ctx = canvas.getContext('2d');
  let dpr = Math.min(devicePixelRatio, 1.6);
  let W = 0, H = 0, parts = [];
  let boost = 1, boostTarget = 1, entered = false;

  const spawn = () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    life: 90 + Math.random() * 220,
    seed: Math.random() * 1000,
  });

  /* 収束点＝「同じ道を、共に歩む。」（.c4-line）の実位置に追従 */
  let vpx = 0.5, vpy = 0.5;
  function locateVP() {
    const line = canvas.parentElement.querySelector('.c4-line');
    if (!line) return;
    const cr = canvas.getBoundingClientRect(), lr = line.getBoundingClientRect();
    if (cr.width > 0 && cr.height > 0 && lr.width > 0) {
      vpx = ((lr.left + lr.width / 2) - cr.left) / cr.width;
      vpy = ((lr.top + lr.height / 2) - cr.top) / cr.height;
    }
  }

  function step(t, alphaScale) {
    const vx = W * vpx, vy = H * vpy;              /* 見出しの中心へ全方位から収束 */
    const maxd = Math.hypot(W, H) * 0.5;
    const buckets = [[], [], []];
    for (const p of parts) {
      const dx = vx - p.x, dy = vy - p.y;
      const dist = Math.hypot(dx, dy) + 0.001;
      const persp = Math.min(dist / maxd, 1);       /* 手前ほど速く・明るく、道の先は霞む */
      const sp = SPEED * dpr * (0.3 + persp * 1.6) * boost;
      const a = Math.atan2(dy, dx) + Math.sin(p.seed + t * 0.0004 + dist * 0.003) * 0.18;
      const nx = p.x + Math.cos(a) * sp, ny = p.y + Math.sin(a) * sp;
      buckets[persp > 0.66 ? 2 : persp > 0.33 ? 1 : 0].push(p.x, p.y, nx, ny);
      p.x = nx; p.y = ny; p.life--;
      if (p.life <= 0 || dist < 46 * dpr || nx < -8 || nx > W + 8 || ny < -8 || ny > H + 8) Object.assign(p, spawn());
    }
    /* 奥は淡く霞み、手前は青白く発光（Biographyの進捗線と同じ言語） */
    const levels = [0.16, 0.34, 0.55];
    const widths = [0.6, 0.75, 0.95];
    ctx.save();
    buckets.forEach((seg, i) => {
      if (!seg.length) return;
      const al = Math.min(levels[i] * alphaScale * Math.min(boost, 1.6), 0.9);
      ctx.strokeStyle = `rgba(169, 198, 242, ${al})`;
      ctx.lineWidth = dpr * widths[i];
      if (i === 2) { ctx.shadowColor = 'rgba(169, 198, 242, 0.55)'; ctx.shadowBlur = 9 * dpr; }
      else { ctx.shadowBlur = 0; }
      ctx.beginPath();
      for (let k = 0; k < seg.length; k += 4) { ctx.moveTo(seg[k], seg[k + 1]); ctx.lineTo(seg[k + 2], seg[k + 3]); }
      ctx.stroke();
    });
    ctx.restore();
  }

  function resize() {
    if (!canvas.offsetWidth) return;
    dpr = Math.min(devicePixelRatio * PAGE_ZOOM, 2);
    W = canvas.width = canvas.offsetWidth * dpr;
    H = canvas.height = canvas.offsetHeight * dpr;
    locateVP();
    parts = Array.from({ length: N }, spawn);
    ctx.fillStyle = '#050609';
    ctx.fillRect(0, 0, W, H);
    if (STATIC) { for (let s = 0; s < 240; s++) step(s * 16, 0.5); }
  }
  window.addEventListener('resize', resize);

  let running = true;
  const vis = new IntersectionObserver((entries) => {
    const v = entries[0].isIntersecting;
    if (v && !running) { running = true; requestAnimationFrame(frame); }
    else if (!v) { running = false; }
    if (v && !entered) { entered = true; locateVP(); boost = 2.4; boostTarget = 1; }   /* 初回表示サージ＝道が形になる */
  }, { threshold: 0.02 });
  vis.observe(canvas);

  function frame(t) {
    if (!running || STATIC) return;
    const cw = Math.round(canvas.offsetWidth * dpr);
    if (!W || Math.abs(cw - W) > 2) { resize(); requestAnimationFrame(frame); return; }
    boost += (boostTarget - boost) * 0.05;
    ctx.fillStyle = `rgba(5, 6, 9, ${FADE})`;
    ctx.fillRect(0, 0, W, H);
    step(t, 1);
    requestAnimationFrame(frame);
  }
  resize();
  if (!STATIC) requestAnimationFrame(frame);
  return { setBoost: (v) => { boostTarget = v; }, surge: (v) => { boost = Math.max(boost, v); boostTarget = v; } };
}

const roadFlow = makeRoadFlow(document.getElementById('flow-canvas-2'));
const c4link = document.querySelector('.c4-link');
if (c4link && roadFlow && !STATIC) {
  c4link.addEventListener('mouseenter', () => roadFlow.setBoost(2.0));   /* リンクに触れると道が流れ出す */
  c4link.addEventListener('mouseleave', () => roadFlow.setBoost(1));
}
if (c4link) {
  c4link.addEventListener('click', (e) => {
    if (STATIC || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (roadFlow) roadFlow.surge(3);                                      /* 道が一気に駆けて暗転 */
    const veil = document.createElement('div');
    veil.className = 'leave-veil';
    document.body.appendChild(veil);
    requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('on')));
    setTimeout(() => { location.href = c4link.href; }, 600);
  });
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    document.querySelectorAll('.leave-veil').forEach((v) => v.remove());
    if (roadFlow) roadFlow.setBoost(1);
  });
}

/* ---------- practice rows: cinematic page-out（クリック→残光が灯って暗転→遷移） ---------- */
const prRows = [...document.querySelectorAll('a.pr-row')];
if (prRows.length) {
  prRows.forEach((a) => {
    a.addEventListener('click', (e) => {
      if (STATIC || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      const href = a.href;
      a.classList.add('pr-leave');
      const g = a.querySelector('.pr-ghost');
      if (g) {
        g.style.transition = 'transform .6s cubic-bezier(.2, .6, .3, 1), color .6s ease';
        g.style.transform = (g.style.transform || 'translateY(-50%)') + ' scale(1.16)';
      }
      const veil = document.createElement('div');
      veil.className = 'leave-veil';
      document.body.appendChild(veil);
      requestAnimationFrame(() => requestAnimationFrame(() => veil.classList.add('on')));
      setTimeout(() => { location.href = href; }, 560);
    });
  });
  /* 戻る（bfcache復元）時に暗転や残光を残さない */
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    document.querySelectorAll('.leave-veil').forEach((v) => v.remove());
    prRows.forEach((a) => a.classList.remove('pr-leave'));
    document.querySelectorAll('.pr-ghost').forEach((g) => { g.style.transition = ''; g.style.transform = ''; });
  });
}

/* ---------- scroll-driven effects: biography progress ---------- */
/* 残光漢字（.pr-ghost）のスクロールパララックスは廃止 — 位置は固定（CSSのtranslateY(-50%)のみ） */
const bioTimeline = document.querySelector('.bio-timeline');
const bioProgress = document.querySelector('.bio-progress');

if (STATIC && bioProgress) bioProgress.style.height = '100%';

if (!STATIC && bioTimeline) {
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const vh = innerHeight;
      if (bioTimeline && bioProgress) {
        const r = bioTimeline.getBoundingClientRect();
        const passed = Math.min(Math.max(vh * 0.72 - r.top, 0), r.height) / PAGE_ZOOM;
        bioProgress.style.height = passed.toFixed(0) + 'px';
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
