/* Zapret Discord — сайт: демо, тема, фон, скроллспай, PWA */

/* появление блоков при скролле */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      io.unobserve(e.target);
    }
  }
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

/* ---------- интерактивное демо ---------- */
(() => {
  const rows = [...document.querySelectorAll('.mock-row[data-node]')];
  const numEl = document.getElementById('mockNum');
  const statusEl = document.getElementById('mockStatus');
  const statusText = document.getElementById('mockStatusText');
  const subEl = document.getElementById('mockSub');
  const btn = document.getElementById('mockBtn');
  const fillEl = document.getElementById('mockFill');
  const logEl = document.getElementById('mockLog');
  if (!rows.length || !btn || !logEl) return;

  const ru = (document.documentElement.lang || 'ru') === 'ru';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const charDelay = reduced ? 0 : 14;

  const T = ru ? {
    subCur: 'Текущий туннель · ',
    subSel: 'Выбранный узел · ',
    switching: 'переключение на ',
    closed: 'соединение закрыто',
    seq: (host, lat) => [
      ['ws', 'CONNECT ' + host + ':443 — TLS handshake OK'],
      ['ws', 'GET /tunnel → 101 Switching Protocols'],
      ['ok', 'туннель установлен · RTT ' + lat + ' ms'],
    ],
    pool: [
      ['ws', 'keep-alive ping → pong 18 ms'],
      ['ok', 'RTC-трафик Discord идёт через туннель'],
      ['ws', 'замер узлов: nl-2 33ms · fi-3 14ms · se-4 47ms'],
    ],
  } : {
    subCur: 'Current tunnel · ',
    subSel: 'Selected node · ',
    switching: 'switching to ',
    closed: 'connection closed',
    seq: (host, lat) => [
      ['ws', 'CONNECT ' + host + ':443 — TLS handshake OK'],
      ['ws', 'GET /tunnel → 101 Switching Protocols'],
      ['ok', 'tunnel established · RTT ' + lat + ' ms'],
    ],
    pool: [
      ['ws', 'keep-alive ping → pong 18 ms'],
      ['ok', 'Discord RTC traffic goes through the tunnel'],
      ['ws', 'node check: nl-2 33ms · fi-3 14ms · se-4 47ms'],
    ],
  };

  let active = rows[0];
  let connected = false;
  let connecting = false;
  let gen = 0;

  const host = (row) => row.querySelector('small').textContent;
  const lat = (row) => parseInt(row.querySelector('b').textContent, 10) || 21;

  async function typeLine(tag, text) {
    const my = ++gen;
    logEl.innerHTML = '';
    const tagEl = document.createElement('i');
    tagEl.className = tag;
    tagEl.textContent = '[' + tag + ']';
    const txtEl = document.createElement('span');
    logEl.append(tagEl, txtEl);
    if (!charDelay) { txtEl.textContent = text; return my === gen; }
    // печать по реальному времени: догоняет после троттлинга таймеров в фоновой вкладке
    const start = performance.now();
    let shown = 0;
    while (shown < text.length) {
      if (my !== gen) return false;
      await wait(24);
      if (my !== gen) return false;
      shown = Math.min(text.length, Math.floor((performance.now() - start) / charDelay));
      txtEl.textContent = text.slice(0, shown);
    }
    return my === gen;
  }

  function setStatus(mode) {
    statusEl.classList.toggle('offline', mode !== 'online');
    statusText.textContent = statusEl.dataset[mode];
  }

  // живые значения: все узлы «плавают» даже без подключения,
  // индикатор всегда показывает задержку выбранного узла
  function jitterTick() {
    rows.forEach((row) => {
      const b = row.querySelector('b');
      let v = (parseInt(b.textContent, 10) || 10 + Math.floor(Math.random() * 45))
        + Math.round((Math.random() - 0.5) * 6);
      v = Math.max(9, Math.min(80, v));
      b.textContent = v;
    });
    if (!connecting) numEl.textContent = lat(active);
  }

  async function cyclePool() {
    let i = 0;
    while (connected) {
      const [tag, text] = T.pool[i++ % T.pool.length];
      const ok = await typeLine(tag, text);
      if (!ok) return;
      await wait(reduced ? 2600 : 2100);
      if (!connected || gen === 0) return;
    }
  }

  async function connect() {
    connecting = true;
    btn.classList.add('busy');
    btn.textContent = btn.dataset.connecting;
    setStatus('connecting');
    fillEl.style.opacity = '1';
    fillEl.style.width = '0%';
    void fillEl.offsetWidth;
    fillEl.style.width = '100%';

    const seq = T.seq(host(active), lat(active));
    for (const [tag, text] of seq) {
      const ok = await typeLine(tag, text);
      if (!ok) { connecting = false; btn.classList.remove('busy'); return; }
      await wait(reduced ? 200 : 650);
    }

    connected = true;
    connecting = false;
    setStatus('online');
    numEl.textContent = lat(active);
    btn.classList.remove('busy');
    btn.textContent = btn.dataset.disconnect;
    setTimeout(() => { fillEl.style.opacity = '0'; }, 500);
    cyclePool();
  }

  function disconnect() {
    connected = false;
    gen++;
    setStatus('offline');
    numEl.textContent = lat(active);
    subEl.textContent = T.subSel + active.dataset.node;
    btn.textContent = btn.dataset.connect;
    fillEl.style.opacity = '0';
    fillEl.style.width = '0%';
    typeLine('ws', T.closed);
  }

  function setActive(row) {
    rows.forEach((r) => r.classList.toggle('active', r === row));
    active = row;
    subEl.textContent = (connected ? T.subCur : T.subSel) + row.dataset.node;
    if (connected) {
      numEl.textContent = lat(row);
      typeLine('ws', T.switching + host(row));
    }
  }

  btn.addEventListener('click', () => {
    if (connecting) return;
    connected ? disconnect() : connect();
  });
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
  });

  rows.forEach((row) => {
    row.addEventListener('click', () => {
      if (connecting || row === active) return;
      setActive(row);
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); }
    });
  });

  jitterTick();
  setInterval(jitterTick, 1600);
})();

/* ---------- защита от копирования ---------- */
(() => {
  const block = (e) => e.preventDefault();
  document.addEventListener('copy', block);
  document.addEventListener('cut', block);
  document.addEventListener('contextmenu', block);
  document.addEventListener('dragstart', block);
  document.addEventListener('selectstart', block);
})();

/* ---------- переключатель темы ---------- */
(() => {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  const meta = document.querySelector('meta[name="theme-color"]');
  const isLight = () => document.documentElement.dataset.theme === 'light';

  btn.addEventListener('click', () => {
    const next = isLight() ? 'dark' : 'light';
    if (next === 'light') {
      document.documentElement.dataset.theme = 'light';
    } else {
      delete document.documentElement.dataset.theme;
    }
    try { localStorage.setItem('tgws-theme', next); } catch (e) {}
    if (meta) meta.setAttribute('content', next === 'light' ? '#fafafa' : '#000000');
    window.dispatchEvent(new CustomEvent('themechange'));
  });
})();

/* ---------- service worker ---------- */
(() => {
  const swPath = document.documentElement.dataset.sw;
  if (!swPath || !('serviceWorker' in navigator)) return;
  addEventListener('load', () => {
    navigator.serviceWorker.register(swPath).catch(() => {});
  });
})();

/* ---------- фон: живая сеть ---------- */
(() => {
  const canvas = document.getElementById('bg');
  if (!canvas) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  const N = 44;
  const LINK = 150;
  let w, h, dpr, nodes, raf = null;

  let dark = document.documentElement.dataset.theme !== 'light';
  addEventListener('themechange', () => {
    dark = document.documentElement.dataset.theme !== 'light';
  });

  function init() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    nodes = Array.from({ length: N }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.22 * dpr,
      vy: (Math.random() - 0.5) * 0.22 * dpr,
      r: (Math.random() * 1.1 + 0.5) * dpr,
    }));
  }

  function tick() {
    const lineRGB = dark ? '255,255,255' : '0,0,0';
    ctx.clearRect(0, 0, w, h);
    for (const p of nodes) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    }
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const max = LINK * dpr;
        if (d < max) {
          ctx.strokeStyle = 'rgba(' + lineRGB + ',' + (0.075 * (1 - d / max)).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.fillStyle = dark ? 'rgba(255,255,255,.4)' : 'rgba(0,0,0,.42)';
    for (const p of nodes) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  }

  init();
  tick();
  addEventListener('resize', init);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = null;
    } else if (!raf) {
      tick();
    }
  });
})();

/* ---------- скроллспай: активный пункт меню ---------- */
(() => {
  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  if (!links.length) return;
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const link = byId.get(e.target.id);
      if (link) links.forEach((a) => a.classList.toggle('active', a === link));
    }
  }, { rootMargin: '-40% 0px -55% 0px' });
  byId.forEach((a, id) => {
    const s = document.getElementById(id);
    if (s) spy.observe(s);
  });
})();

/* ---------- кнопка «наверх» ---------- */
(() => {
  const toTop = document.getElementById('toTop');
  if (!toTop) return;
  addEventListener('scroll', () => {
    toTop.classList.toggle('visible', scrollY > 700);
  }, { passive: true });
  toTop.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
})();

/* ---------- мобильная кнопка скачивания ---------- */
(() => {
  const cta = document.getElementById('mobileCta');
  const dl = document.getElementById('download');
  if (!cta || !dl) return;
  const io = new IntersectionObserver((entries) => {
    cta.classList.toggle('visible', !entries[0].isIntersecting);
  }, { threshold: 0.05 });
  io.observe(dl);
})();

/* ---------- кнопка «Поделиться» ---------- */
(() => {
  const btn = document.getElementById('shareBtn');
  if (!btn) return;
  const data = {
    title: 'Zapret Discord',
    text: document.documentElement.lang === 'ru'
      ? 'Discord через WebSocket-туннель — в один клик'
      : 'Discord over a WebSocket tunnel — one click',
    url: location.origin + location.pathname.replace(/(index\.html)?$/, ''),
  };
  btn.addEventListener('click', async () => {
    try {
      if (navigator.share) {
        await navigator.share(data);
        return;
      }
      await navigator.clipboard.writeText(data.url);
      const old = btn.textContent;
      btn.textContent = document.documentElement.lang === 'ru' ? 'Ссылка скопирована' : 'Link copied';
      setTimeout(() => { btn.textContent = old; }, 1800);
    } catch (e) {}
  });
})();

/* ---------- живой бейдж версии из GitHub Releases ---------- */
(() => {
  const meta = document.querySelector('meta[name="tgws:repo"]');
  const el = document.getElementById('dlMeta');
  if (!meta || !el) return;
  const repo = (meta.content || '').trim();
  if (!repo) return;

  const ru = (document.documentElement.lang || 'ru') === 'ru';
  const key = 'tgws-release';

  function apply(tag, date) {
    const ver = String(tag).replace(/^v/, '');
    let text = (ru ? 'Версия ' : 'Version ') + ver + (ru ? ' · Windows 10 / 11 · 64-бит' : ' · Windows 10 / 11 · 64-bit');
    if (date) {
      const d = new Date(date).toLocaleDateString(ru ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
      text += (ru ? ' · обновлено ' : ' · updated ') + d;
    }
    el.textContent = text;
  }

  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null');
    if (cached && Date.now() - cached.t < 3600e3 && cached.tag) {
      apply(cached.tag, cached.date);
      return;
    }
  } catch (e) {}

  fetch('https://api.github.com/repos/' + repo + '/releases/latest')
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d) => {
      if (!d.tag_name) return;
      try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), tag: d.tag_name, date: d.published_at })); } catch (e) {}
      apply(d.tag_name, d.published_at);
    })
    .catch(() => {});
})();
