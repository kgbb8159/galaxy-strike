(() => {
  "use strict";

  const setupEl = document.getElementById("setup");
  const gameEl = document.getElementById("game");
  const overlayEl = document.getElementById("overlay");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const playerUpload = document.getElementById("player-upload");
  const enemyUpload = document.getElementById("enemy-upload");
  const playerPreview = document.getElementById("player-preview");
  const enemyPreview = document.getElementById("enemy-preview");
  const btnStart = document.getElementById("btn-start");
  const btnRetry = document.getElementById("btn-retry");
  const btnSetup = document.getElementById("btn-setup");
  const scoreEl = document.getElementById("score");
  const waveEl = document.getElementById("wave");
  const livesEl = document.getElementById("lives");
  const toastEl = document.getElementById("toast");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayScore = document.getElementById("overlay-score");

  const assets = {
    player: null,
    special: null,
    playerDefault: null,
    specialDefault: null,
    enemies: [],
  };

  let W = 0;
  let H = 0;
  let dpr = 1;
  let running = false;
  let lastTs = 0;
  let raf = 0;

  const keys = new Set();
  const state = {
    score: 0,
    lives: 3,
    wave: 1,
    invuln: 0,
    fireCd: 0,
    player: null,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    items: [],
    particles: [],
    stars: [],
    power: { multi: 0, rapid: 0, shield: 0 },
    waveClearTimer: 0,
    bossAlive: false,
    dragging: false,
    dragOffsetX: 0,
    dragOffsetY: 0,
    touchStart: null,
    mutedToast: 0,
  };

  const PLAYER_W = 56;
  const PLAYER_H = 56;
  const FIRE_BASE = 0.15;
  const FIRE_RAPID = 0.08;

  /* ---------- Asset helpers ---------- */
  function loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  function setPreview(el, img) {
    const show = () => {
      el.innerHTML = "";
      const node = new Image();
      node.src = img.src;
      el.appendChild(node);
      el.parentElement.classList.add("ready");
    };
    if (img.complete && img.naturalWidth) show();
    else img.addEventListener("load", show, { once: true });
  }

  function activePlayer() {
    return assets.player || assets.playerDefault;
  }

  function activeSpecial() {
    return assets.special || assets.specialDefault;
  }

  playerUpload.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    assets.player = await loadImageFile(file);
    setPreview(playerPreview, assets.player);
  });

  enemyUpload.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    assets.special = await loadImageFile(file);
    setPreview(enemyPreview, assets.special);
  });

  function canvasToImage(c) {
    const img = new Image();
    img.src = c.toDataURL();
    return img;
  }

  /* Default player ship */
  function makePlayerSprite() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d");
    g.translate(32, 32);

    g.fillStyle = "#0e7490";
    g.beginPath();
    g.moveTo(0, -28);
    g.lineTo(16, 8);
    g.lineTo(8, 22);
    g.lineTo(-8, 22);
    g.lineTo(-16, 8);
    g.closePath();
    g.fill();

    g.fillStyle = "#67e8f9";
    g.beginPath();
    g.moveTo(0, -22);
    g.lineTo(8, 4);
    g.lineTo(0, 10);
    g.lineTo(-8, 4);
    g.closePath();
    g.fill();

    g.fillStyle = "#22d3ee";
    g.beginPath();
    g.moveTo(-16, 4);
    g.lineTo(-28, 16);
    g.lineTo(-10, 14);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(16, 4);
    g.lineTo(28, 16);
    g.lineTo(10, 14);
    g.closePath();
    g.fill();

    g.fillStyle = "#ecfeff";
    g.beginPath();
    g.ellipse(0, -6, 4, 6, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#fbbf24";
    g.beginPath();
    g.moveTo(-5, 22);
    g.lineTo(0, 30);
    g.lineTo(5, 22);
    g.closePath();
    g.fill();

    return canvasToImage(c);
  }

  /* Default boss / special enemy */
  function makeSpecialSprite() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d");
    g.translate(32, 32);

    g.fillStyle = "#7f1d1d";
    g.beginPath();
    g.ellipse(0, 2, 24, 16, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#ef4444";
    g.beginPath();
    g.moveTo(0, -26);
    g.lineTo(20, -2);
    g.lineTo(12, 18);
    g.lineTo(-12, 18);
    g.lineTo(-20, -2);
    g.closePath();
    g.fill();

    g.fillStyle = "#fca5a5";
    g.beginPath();
    g.ellipse(0, -4, 8, 10, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#fbbf24";
    g.beginPath();
    g.arc(-7, -8, 2.5, 0, Math.PI * 2);
    g.arc(7, -8, 2.5, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#020617";
    g.beginPath();
    g.arc(-7, -8, 1.2, 0, Math.PI * 2);
    g.arc(7, -8, 1.2, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = "#b91c1c";
    g.beginPath();
    g.moveTo(-20, 0);
    g.lineTo(-30, 14);
    g.lineTo(-12, 12);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(20, 0);
    g.lineTo(30, 14);
    g.lineTo(12, 12);
    g.closePath();
    g.fill();

    return canvasToImage(c);
  }

  /* Procedural enemy sprites */
  function makeEnemySprite(variant) {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const g = c.getContext("2d");
    const palettes = [
      ["#fb7185", "#fda4af", "#881337"],
      ["#fbbf24", "#fde68a", "#92400e"],
      ["#a78bfa", "#ddd6fe", "#4c1d95"],
      ["#38bdf8", "#bae6fd", "#0c4a6e"],
      ["#4ade80", "#bbf7d0", "#14532d"],
    ];
    const [main, light, dark] = palettes[variant % palettes.length];

    g.translate(32, 32);
    g.fillStyle = dark;
    g.beginPath();
    g.ellipse(0, 4, 22, 14, 0, 0, Math.PI * 2);
    g.fill();

    g.fillStyle = main;
    g.beginPath();
    g.moveTo(0, -24);
    g.lineTo(18, -4);
    g.lineTo(10, 16);
    g.lineTo(-10, 16);
    g.lineTo(-18, -4);
    g.closePath();
    g.fill();

    g.fillStyle = light;
    g.beginPath();
    g.ellipse(0, -2, 7, 9, 0, 0, Math.PI * 2);
    g.fill();

    // wings
    g.fillStyle = main;
    g.beginPath();
    g.moveTo(-18, 0);
    g.lineTo(-30, 10);
    g.lineTo(-14, 12);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(18, 0);
    g.lineTo(30, 10);
    g.lineTo(14, 12);
    g.closePath();
    g.fill();

    // eyes
    g.fillStyle = "#020617";
    g.beginPath();
    g.arc(-5, -6, 2.2, 0, Math.PI * 2);
    g.arc(5, -6, 2.2, 0, Math.PI * 2);
    g.fill();

    if (variant % 2 === 0) {
      g.strokeStyle = light;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, 8, 6, 0.2, Math.PI - 0.2);
      g.stroke();
    }

    const img = new Image();
    img.src = c.toDataURL();
    return img;
  }

  for (let i = 0; i < 5; i++) assets.enemies.push(makeEnemySprite(i));
  assets.playerDefault = makePlayerSprite();
  assets.specialDefault = makeSpecialSprite();
  setPreview(playerPreview, assets.playerDefault);
  setPreview(enemyPreview, assets.specialDefault);

  /* ---------- Resize ---------- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state.player) {
      state.player.x = clamp(state.player.x, PLAYER_W / 2, W - PLAYER_W / 2);
      state.player.y = clamp(state.player.y, H * 0.45, H - PLAYER_H / 2 - 12);
    }
  }

  window.addEventListener("resize", resize);

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(state.mutedToast);
    state.mutedToast = setTimeout(() => toastEl.classList.add("hidden"), 1400);
  }

  /* ---------- Stars ---------- */
  function initStars() {
    state.stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      z: rand(0.3, 2.2),
      a: rand(0.25, 0.9),
    }));
  }

  /* ---------- Entities ---------- */
  function resetGame() {
    state.score = 0;
    state.lives = 5;
    state.wave = 1;
    state.invuln = 2.2;
    state.fireCd = 0;
    state.bullets = [];
    state.enemyBullets = [];
    state.enemies = [];
    state.items = [];
    state.particles = [];
    state.power = { multi: 0, rapid: 0, shield: 0 };
    state.waveClearTimer = 0;
    state.bossAlive = false;
    state.player = {
      x: W / 2,
      y: H - 90,
      w: PLAYER_W,
      h: PLAYER_H,
    };
    updateHud();
    spawnWave(state.wave);
  }

  function updateHud() {
    scoreEl.textContent = String(state.score);
    waveEl.textContent = String(state.wave);
    livesEl.textContent = "❤ ".repeat(Math.max(0, state.lives)).trim() || "—";
  }

  function spawnWave(wave) {
    state.enemies = [];
    state.bossAlive = false;
    const cols = Math.min(7, 3 + Math.floor(wave / 2));
    const rows = Math.min(4, 1 + Math.floor((wave - 1) / 2));
    const gapX = Math.min(78, (W - 80) / cols);
    const startX = (W - (cols - 1) * gapX) / 2;
    const startY = 78;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isSpecial = Math.random() < Math.min(0.22, 0.12 + wave * 0.01);
        const type = isSpecial ? "special" : "normal";
        const sprite =
          type === "special"
            ? activeSpecial()
            : assets.enemies[(r + c + wave) % assets.enemies.length];
        state.enemies.push({
          type,
          sprite,
          x: startX + c * gapX,
          y: startY + r * 56,
          homeX: startX + c * gapX,
          homeY: startY + r * 56,
          w: type === "special" ? 48 : 40,
          h: type === "special" ? 48 : 40,
          hp: type === "special" ? 1 + Math.floor(wave / 4) : 1,
          score: type === "special" ? 200 : 50 + r * 20,
          phase: rand(0, Math.PI * 2),
          dive: null,
          shootCd: rand(2.8, 5.5),
          bob: rand(0, Math.PI * 2),
        });
      }
    }

    // Boss every 3 waves
    if (wave % 3 === 0) {
      state.bossAlive = true;
      state.enemies.push({
        type: "boss",
        sprite: activeSpecial(),
        x: W / 2,
        y: 90,
        homeX: W / 2,
        homeY: 90,
        w: 96,
        h: 96,
        hp: 12 + wave * 2,
        maxHp: 12 + wave * 2,
        score: 1000 + wave * 200,
        phase: 0,
        dive: null,
        shootCd: 1.4,
        bob: 0,
        pattern: 0,
      });
      showToast(`WAVE ${wave} · BOSS`);
    } else {
      showToast(`WAVE ${wave}`);
    }
  }

  function spawnParticles(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, 180);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.3, 0.8),
        max: 0.8,
        color,
        size: rand(1.5, 3.5),
      });
    }
  }

  function dropItem(x, y) {
    const kinds = ["multi", "rapid", "shield", "life"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    state.items.push({
      kind,
      x,
      y,
      vy: 70,
      r: 14,
      life: 10,
    });
  }

  function firePlayer() {
    if (state.fireCd > 0 || !state.player) return;
    const p = state.player;
    const rapid = state.power.rapid > 0;
    state.fireCd = rapid ? FIRE_RAPID : FIRE_BASE;
    const multi = state.power.multi > 0;

    const shots = multi
      ? [
          { dx: 0, dy: -1 },
          { dx: -0.28, dy: -0.96 },
          { dx: 0.28, dy: -0.96 },
        ]
      : [{ dx: 0, dy: -1 }];

    for (const s of shots) {
      state.bullets.push({
        x: p.x,
        y: p.y - p.h / 2,
        vx: s.dx * 520,
        vy: s.dy * 620,
        r: 3.5,
        from: "player",
      });
    }
  }

  function hurtPlayer() {
    if (state.invuln > 0) return;
    if (state.power.shield > 0) {
      state.power.shield = 0;
      state.invuln = 1.2;
      spawnParticles(state.player.x, state.player.y, "#67e8f9", 16);
      showToast("실드 파괴");
      return;
    }
    state.lives -= 1;
    state.invuln = 2.8;
    state.power.multi = Math.max(0, state.power.multi * 0.5);
    state.power.rapid = Math.max(0, state.power.rapid * 0.5);
    spawnParticles(state.player.x, state.player.y, "#fb7185", 20);
    updateHud();
    if (state.lives <= 0) {
      endGame(false);
    }
  }

  function endGame(won) {
    running = false;
    cancelAnimationFrame(raf);
    overlayTitle.textContent = won ? "CLEAR!" : "GAME OVER";
    overlayScore.textContent = `점수 ${state.score}`;
    overlayEl.classList.remove("hidden");
  }

  /* ---------- Input ---------- */
  window.addEventListener("keydown", (e) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(e.key)) {
      e.preventDefault();
    }
    keys.add(e.key);
    if (e.key === " " && running) firePlayer();
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key);
  });

  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e.changedTouches?.[0] || e;
    return {
      x: ((t.clientX - rect.left) / rect.width) * W,
      y: ((t.clientY - rect.top) / rect.height) * H,
    };
  }

  function hitPlayer(px, py) {
    const p = state.player;
    if (!p) return false;
    const pad = 28;
    return (
      px >= p.x - p.w / 2 - pad &&
      px <= p.x + p.w / 2 + pad &&
      py >= p.y - p.h / 2 - pad &&
      py <= p.y + p.h / 2 + pad
    );
  }

  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (!running || !state.player) return;
      canvas.setPointerCapture?.(e.pointerId);
      const pt = canvasPoint(e);
      state.touchStart = { x: pt.x, y: pt.y, t: performance.now(), moved: false };

      if (hitPlayer(pt.x, pt.y)) {
        state.dragging = true;
        state.dragOffsetX = state.player.x - pt.x;
        state.dragOffsetY = state.player.y - pt.y;
      }
    },
    { passive: false }
  );

  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (!running || !state.player || !state.touchStart) return;
      const pt = canvasPoint(e);
      const dx = pt.x - state.touchStart.x;
      const dy = pt.y - state.touchStart.y;
      if (Math.hypot(dx, dy) > 8) state.touchStart.moved = true;

      if (state.dragging) {
        e.preventDefault();
        state.player.x = clamp(pt.x + state.dragOffsetX, PLAYER_W / 2, W - PLAYER_W / 2);
        state.player.y = clamp(pt.y + state.dragOffsetY, H * 0.4, H - PLAYER_H / 2 - 8);
      }
    },
    { passive: false }
  );

  function endPointer(e) {
    if (!running) {
      state.dragging = false;
      state.touchStart = null;
      return;
    }
    const pt = canvasPoint(e);
    const start = state.touchStart;
    const wasDragging = state.dragging;
    state.dragging = false;

    if (start && !wasDragging && !start.moved) {
      // tap to shoot
      firePlayer();
    } else if (start && wasDragging && !start.moved && performance.now() - start.t < 220) {
      // quick tap on ship also shoots
      firePlayer();
    }

    state.touchStart = null;
  }

  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", () => {
    state.dragging = false;
    state.touchStart = null;
  });

  /* ---------- Update ---------- */
  function update(dt) {
    // stars
    for (const s of state.stars) {
      s.y += 40 * s.z * dt;
      if (s.y > H) {
        s.y = 0;
        s.x = Math.random() * W;
      }
    }

    // player keyboard
    const p = state.player;
    if (p && !state.dragging) {
      const speed = 400;
      if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) p.x -= speed * dt;
      if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) p.x += speed * dt;
      if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) p.y -= speed * dt;
      if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) p.y += speed * dt;
      p.x = clamp(p.x, PLAYER_W / 2, W - PLAYER_W / 2);
      p.y = clamp(p.y, H * 0.4, H - PLAYER_H / 2 - 8);
    }

    if (keys.has(" ")) firePlayer();

    state.fireCd = Math.max(0, state.fireCd - dt);
    state.invuln = Math.max(0, state.invuln - dt);

    for (const k of Object.keys(state.power)) {
      if (typeof state.power[k] === "number" && state.power[k] > 0 && k !== "shield") {
        state.power[k] = Math.max(0, state.power[k] - dt);
      }
    }

    // bullets
    state.bullets = state.bullets.filter((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      return b.y > -20 && b.y < H + 20 && b.x > -20 && b.x < W + 20;
    });

    state.enemyBullets = state.enemyBullets.filter((b) => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      return b.y > -20 && b.y < H + 40 && b.x > -40 && b.x < W + 40;
    });

    // enemies
    const aliveNormals = state.enemies.filter((e) => e.type !== "boss");
    for (const e of state.enemies) {
      e.bob += dt * 2.2;
      e.phase += dt;

      if (e.type === "boss") {
        e.x = W / 2 + Math.sin(e.phase * 0.9) * Math.min(160, W * 0.28);
        e.y = 90 + Math.sin(e.phase * 1.4) * 18;
        e.shootCd -= dt;
        if (e.shootCd <= 0) {
          e.shootCd = Math.max(0.9, 1.5 - state.wave * 0.02);
          e.pattern = (e.pattern + 1) % 3;
          const count = e.pattern === 0 ? 3 : e.pattern === 1 ? 2 : 4;
          for (let i = 0; i < count; i++) {
            const ang = Math.PI / 2 + (i - (count - 1) / 2) * 0.22;
            state.enemyBullets.push({
              x: e.x,
              y: e.y + e.h / 3,
              vx: Math.cos(ang) * 120,
              vy: Math.sin(ang) * 150,
              r: 5,
            });
          }
        }
        continue;
      }

      if (!e.dive) {
        e.x = e.homeX + Math.sin(e.bob + e.phase) * 10;
        e.y = e.homeY + Math.sin(e.bob * 0.8) * 6;

        // chance to dive
        if (Math.random() < dt * (0.035 + state.wave * 0.005) && aliveNormals.length) {
          e.dive = {
            t: 0,
            sx: e.x,
            sy: e.y,
            tx: p ? p.x + rand(-60, 60) : W / 2,
          };
        }
      } else {
        e.dive.t += dt;
        const t = e.dive.t;
        e.x = e.dive.sx + Math.sin(t * 2.4) * 60 + (e.dive.tx - e.dive.sx) * Math.min(1, t / 2.6);
        e.y = e.dive.sy + t * 100;
        if (e.y > H + 40) {
          e.x = e.homeX;
          e.y = e.homeY;
          e.dive = null;
        }
      }

      e.shootCd -= dt;
      if (e.shootCd <= 0 && Math.random() < 0.22) {
        e.shootCd = rand(3.2, 5.8);
        state.enemyBullets.push({
          x: e.x,
          y: e.y + e.h / 2,
          vx: 0,
          vy: 120 + state.wave * 5,
          r: 3.5,
        });
      } else if (e.shootCd <= 0) {
        e.shootCd = rand(2.0, 3.8);
      }
    }

    // collisions: player bullets vs enemies
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      let hit = false;
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        if (Math.abs(b.x - e.x) < e.w * 0.42 && Math.abs(b.y - e.y) < e.h * 0.42) {
          e.hp -= 1;
          hit = true;
          spawnParticles(b.x, b.y, "#fde68a", 4);
          if (e.hp <= 0) {
            state.score += e.score;
            spawnParticles(e.x, e.y, e.type === "boss" ? "#fbbf24" : "#67e8f9", e.type === "boss" ? 28 : 12);
            if (e.type === "special") dropItem(e.x, e.y);
            if (e.type === "boss") {
              state.bossAlive = false;
              dropItem(e.x - 20, e.y);
              dropItem(e.x + 20, e.y);
            }
            state.enemies.splice(j, 1);
            updateHud();
          }
          break;
        }
      }
      if (hit) state.bullets.splice(i, 1);
    }

    // enemy bullets vs player
    if (p) {
      for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        const b = state.enemyBullets[i];
        if (Math.abs(b.x - p.x) < p.w * 0.24 && Math.abs(b.y - p.y) < p.h * 0.24) {
          state.enemyBullets.splice(i, 1);
          hurtPlayer();
        }
      }
      // enemy body collision
      for (const e of state.enemies) {
        if (Math.abs(e.x - p.x) < (e.w + p.w) * 0.22 && Math.abs(e.y - p.y) < (e.h + p.h) * 0.22) {
          hurtPlayer();
        }
      }
    }

    // items
    state.items = state.items.filter((it) => {
      it.y += it.vy * dt;
      it.life -= dt;
      if (p && Math.hypot(it.x - p.x, it.y - p.y) < 28) {
        applyItem(it.kind);
        spawnParticles(it.x, it.y, "#fbbf24", 10);
        return false;
      }
      return it.y < H + 30 && it.life > 0;
    });

    // particles
    state.particles = state.particles.filter((pt) => {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.98;
      pt.vy *= 0.98;
      return pt.life > 0;
    });

    // wave clear
    if (state.enemies.length === 0) {
      state.waveClearTimer += dt;
      if (state.waveClearTimer > 1.4) {
        state.waveClearTimer = 0;
        state.wave += 1;
        updateHud();
        spawnWave(state.wave);
      }
    } else {
      state.waveClearTimer = 0;
    }
  }

  function applyItem(kind) {
    if (kind === "multi") {
      state.power.multi = 12;
      showToast("멀티샷");
    } else if (kind === "rapid") {
      state.power.rapid = 10;
      showToast("연사");
    } else if (kind === "shield") {
      state.power.shield = 1;
      showToast("실드");
    } else if (kind === "life") {
      state.lives = Math.min(7, state.lives + 1);
      updateHud();
      showToast("추가 생명");
    }
  }

  /* ---------- Draw ---------- */
  function draw() {
    // background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#020617");
    grad.addColorStop(0.55, "#071428");
    grad.addColorStop(1, "#04101c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    for (const s of state.stars) {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(s.x, s.y, s.z, s.z);
    }
    ctx.globalAlpha = 1;

    // soft nebula
    ctx.fillStyle = "rgba(34, 211, 238, 0.035)";
    ctx.beginPath();
    ctx.ellipse(W * 0.2, H * 0.25, W * 0.35, H * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(52, 211, 153, 0.03)";
    ctx.beginPath();
    ctx.ellipse(W * 0.8, H * 0.55, W * 0.3, H * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // enemies
    for (const e of state.enemies) {
      drawShip(e.sprite, e.x, e.y, e.w, e.h, e.type === "boss" ? Math.PI : 0);
      if (e.type === "special") {
        ctx.strokeStyle = "rgba(251, 191, 36, 0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.w * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (e.type === "boss" && e.maxHp) {
        const bw = 80;
        const ratio = e.hp / e.maxHp;
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(e.x - bw / 2, e.y - e.h / 2 - 14, bw, 5);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(e.x - bw / 2, e.y - e.h / 2 - 14, bw * ratio, 5);
      }
    }

    // items
    for (const it of state.items) {
      const colors = {
        multi: "#67e8f9",
        rapid: "#fbbf24",
        shield: "#34d399",
        life: "#fb7185",
      };
      const labels = { multi: "M", rapid: "R", shield: "S", life: "+" };
      ctx.fillStyle = colors[it.kind] || "#fff";
      ctx.beginPath();
      ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#041018";
      ctx.font = "bold 12px Orbitron, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labels[it.kind] || "?", it.x, it.y + 1);
    }

    // bullets
    for (const b of state.bullets) {
      ctx.fillStyle = "#ecfeff";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 2.2, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    for (const b of state.enemyBullets) {
      ctx.fillStyle = "#fb7185";
      ctx.shadowColor = "#fb7185";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // player
    const p = state.player;
    if (p) {
      const blink = state.invuln > 0 && Math.floor(state.invuln * 12) % 2 === 0;
      if (!blink) {
        if (state.power.shield > 0) {
          ctx.strokeStyle = "rgba(52, 211, 153, 0.85)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.w * 0.62, 0, Math.PI * 2);
          ctx.stroke();
        }
        drawShip(activePlayer(), p.x, p.y, p.w, p.h, 0);
      }
    }

    // particles
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;

    // power timers
    if (state.power.multi > 0 || state.power.rapid > 0 || state.power.shield > 0) {
      ctx.font = "11px Orbitron, sans-serif";
      ctx.fillStyle = "rgba(226,232,240,0.75)";
      ctx.textAlign = "left";
      let yy = H - 18;
      if (state.power.shield > 0) {
        ctx.fillText("SHIELD", 12, yy);
        yy -= 14;
      }
      if (state.power.rapid > 0) {
        ctx.fillText(`RAPID ${state.power.rapid.toFixed(0)}s`, 12, yy);
        yy -= 14;
      }
      if (state.power.multi > 0) {
        ctx.fillText(`MULTI ${state.power.multi.toFixed(0)}s`, 12, yy);
      }
    }
  }

  function drawShip(img, x, y, w, h, rot) {
    if (!img) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = "rgba(8, 24, 48, 0.35)";
    ctx.beginPath();
    const rx = -w / 2;
    const ry = -h / 2;
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(rx, ry, w, h, 10);
    } else {
      ctx.rect(rx, ry, w, h);
    }
    ctx.fill();
    ctx.drawImage(img, rx, ry, w, h);
    ctx.restore();
  }

  function loop(ts) {
    if (!running) return;
    const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function startGame() {
    setupEl.classList.add("hidden");
    overlayEl.classList.add("hidden");
    gameEl.classList.remove("hidden");
    resize();
    initStars();
    resetGame();
    running = true;
    lastTs = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  btnStart.addEventListener("click", startGame);
  btnRetry.addEventListener("click", () => {
    overlayEl.classList.add("hidden");
    startGame();
  });
  btnSetup.addEventListener("click", () => {
    overlayEl.classList.add("hidden");
    gameEl.classList.add("hidden");
    setupEl.classList.remove("hidden");
    running = false;
    cancelAnimationFrame(raf);
  });
})();
