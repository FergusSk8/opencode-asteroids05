'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── ShootingStar ────────────────────────────────────────────────────────────
const STAR_SPEED      = 220;
const STAR_TTL        = 5;
const STAR_POINTS     = 300;
const STAR_RADIUS     = 14;
const STAR_MIN_RADIUS = 5;
const STAR_FADE_TIME  = 1.5;
const STAR_TRAIL_LEN  = 12;
const STAR_SPAWN_MIN  = 8;
const STAR_SPAWN_MAX  = 15;

class ShootingStar {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    this.vx = Math.cos(angle) * STAR_SPEED;
    this.vy = Math.sin(angle) * STAR_SPEED;
    this.ttl  = STAR_TTL;
    this.dead = false;
    this.trail = [];
  }

  get radius() {
    return Math.max(STAR_MIN_RADIUS, STAR_RADIUS * (this.ttl / STAR_TTL));
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const wx = wrap(this.x, W);
    const wy = wrap(this.y, H);
    if (this.trail.length > 0) {
      const last = this.trail[this.trail.length - 1];
      if (Math.abs(wx - last.x) > W / 2 || Math.abs(wy - last.y) > H / 2)
        this.trail = [];
    }
    this.x = wx;
    this.y = wy;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > STAR_TRAIL_LEN) this.trail.shift();
  }

  draw() {
    const alpha = Math.min(1, this.ttl / STAR_FADE_TIME);
    const r = this.radius;

    // Estela
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const t = i / this.trail.length;
        const a = (t * alpha * 0.7).toFixed(2);
        ctx.strokeStyle = `rgba(255, ${Math.floor(180 + t * 75)}, 0, ${a})`;
        ctx.lineWidth = 1 + t * 2.5;
        ctx.beginPath();
        ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.stroke();
      }
    }

    // Resplandor exterior
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.arc(this.x, this.y, r * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Núcleo
    ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(0.4, '#ffe066');
    grad.addColorStop(1, '#ff6600');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
  }
}

// ── Skins ─────────────────────────────────────────────────────────────────────
const SKINS = [
  {
    name: 'CLÁSICA',
    color: '#fff',
    nose: 21,
    verts: [[20,0],[-12,-9],[-7,0],[-12,9]]
  },
  {
    name: 'INTERCEPTOR',
    color: '#0ff',
    nose: 24,
    verts: [[23,0],[4,-3],[-8,-14],[-5,-2],[-11,0],[-5,2],[-8,14],[4,3]]
  },
  {
    name: 'DOBLE ALA',
    color: '#f0f',
    nose: 20,
    verts: [[19,0],[10,-3],[0,-14],[-6,-4],[-14,0],[-6,4],[0,14],[10,3]]
  },
  {
    name: 'DELTA',
    color: '#fa0',
    nose: 20,
    verts: [[20,0],[-14,-13],[-8,0],[-14,13]]
  },
];

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.speedTimer    = 0;
    this.tripleTimer   = 0;
    this.shield        = 0;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.speedTimer    > 0) this.speedTimer    -= dt;
    if (this.tripleTimer   > 0) this.tripleTimer   -= dt;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT     = 3.5;   // rad/s
    const THRUST  = 260 * (this.speedTimer > 0 ? 2 : 1);  // px/s²
    const DRAG    = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = SKINS[skinIndex].nose;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleTimer <= 0) return [new Bullet(ox, oy, this.angle)];
    return [-1, 0, 1].map(i => new Bullet(ox, oy, this.angle + i * TRIPLE_SPREAD));
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    if (this.shield > 0) {
      const alpha = 0.25 + 0.75 * (this.shield / SHIELD_HITS);
      ctx.strokeStyle = `rgba(68,170,255,${alpha.toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    const skin = SKINS[skinIndex];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = this.speedTimer > 0 ? 'rgba(0, 255, 255, 0.85)' : 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────────
const DROP_CHANCE      = 0.2;
const SPEED_DURATION   = 5;
const TRIPLE_DURATION  = 5;
const TRIPLE_SPREAD    = 12 * Math.PI / 180;
const SHIELD_HITS      = 3;

class PowerUp {
  constructor(x, y, type = 'speed') {
    this.x      = x;
    this.y      = y;
    this.type   = type;
    this.radius = 14;
    this.ttl    = 10;   // segundos antes de desaparecer
    this.dead   = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const blinkRate = this.ttl < 3 ? 6 : 10;
    const visible   = Math.floor(this.ttl * blinkRate) % 2 === 0;
    if (!visible) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.type === 'shield') {
      ctx.strokeStyle = '#4af';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();

      const s = 8;
      ctx.strokeStyle = '#4af';
      ctx.lineWidth   = 2.5;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo( 0,    -s);
      ctx.lineTo( s,    -s * 0.6);
      ctx.lineTo( s,     s * 0.25);
      ctx.lineTo( 0,     s);
      ctx.lineTo(-s,     s * 0.25);
      ctx.lineTo(-s,    -s * 0.6);
      ctx.closePath();
      ctx.stroke();
    } else if (this.type === 'speed') {
      const color = '#0ff';
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();

      const s = 8;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.5;
      ctx.lineJoin    = 'bevel';
      ctx.beginPath();
      ctx.moveTo( s * 0.3, -s);
      ctx.lineTo(-s * 0.2, -s * 0.15);
      ctx.lineTo( s * 0.1, -s * 0.15);
      ctx.lineTo(-s * 0.3,  s);
      ctx.lineTo( s * 0.2,  s * 0.1);
      ctx.lineTo(-s * 0.1,  s * 0.1);
      ctx.lineTo( s * 0.3, -s);
      ctx.closePath();
      ctx.stroke();
    } else {
      const color = '#ff0';
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = color;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * 6, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let shootingStars, starTimer;
let skinIndex = (() => {
  const v = parseInt(localStorage.getItem('skin'), 10);
  return v >= 0 && v < SKINS.length ? v : 0;
})();
let skinNameTimer = 0;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnShootingStar() {
  if (shootingStars.length > 0) return;
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  shootingStars.push(new ShootingStar(x, y));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  shootingStars = [];
  starTimer = rand(STAR_SPAWN_MIN, STAR_SPAWN_MAX);
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  shootingStars = [];
  starTimer = rand(STAR_SPAWN_MIN, STAR_SPAWN_MAX);
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    shootingStars.forEach(s => s.update(dt));
    shootingStars = shootingStars.filter(s => !s.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Cambiar skin
  if (pressed('KeyC')) {
    skinIndex = (skinIndex + 1) % SKINS.length;
    localStorage.setItem('skin', String(skinIndex));
    skinNameTimer = 1.5;
  }

  if (skinNameTimer > 0) skinNameTimer -= dt;

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));
  shootingStars.forEach(s => s.update(dt));

  starTimer -= dt;
  if (starTimer <= 0) {
    spawnShootingStar();
    starTimer = rand(STAR_SPAWN_MIN, STAR_SPAWN_MAX);
  }

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);
  shootingStars = shootingStars.filter(s => !s.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        if (Math.random() < DROP_CHANCE) {
          const r = Math.random();
          const type = r < 1/3 ? 'speed' : r < 2/3 ? 'shield' : 'triple';
          powerups.push(new PowerUp(a.x, a.y, type));
        }
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz
  for (const b of bullets) {
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        score += STAR_POINTS;
        explode(s.x, s.y, 10);
        const r = Math.random();
        powerups.push(new PowerUp(s.x, s.y, r < 1/3 ? 'speed' : r < 2/3 ? 'shield' : 'triple'));
      }
    }
  }
  bullets   = bullets.filter(b => !b.dead);
  shootingStars = shootingStars.filter(s => !s.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shield > 0) {
          ship.shield--;
          a.dead = true;
          explode(a.x, a.y, a.size * 5);
          ship.invincible = 1;
        } else {
          killShip();
        }
        break;
      }
    }
    asteroids = asteroids.filter(a => !a.dead);
  }

  // Nave vs power-up
  for (const p of powerups) {
    if (dist(ship, p) < ship.radius + p.radius) {
      if (p.type === 'speed')      ship.speedTimer   = SPEED_DURATION;
      else if (p.type === 'shield') ship.shield = SHIELD_HITS;
      else                          ship.tripleTimer  = TRIPLE_DURATION;
      p.dead = true;
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[skinIndex];
  const s = 0.45;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.color;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.verts[0][0] * s, skin.verts[0][1] * s);
  for (let i = 1; i < skin.verts.length; i++)
    ctx.lineTo(skin.verts[i][0] * s, skin.verts[i][1] * s);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  let hudY = 48;
  if (ship.speedTimer > 0) {
    ctx.fillStyle = '#0ff';
    ctx.fillText(`VELOCIDAD x2  ${ship.speedTimer.toFixed(1)}s`, 14, hudY);
    hudY += 22;
  }
  if (ship.tripleTimer > 0) {
    ctx.fillStyle = '#ff0';
    ctx.fillText(`TRIPLE DISPARO  ${ship.tripleTimer.toFixed(1)}s`, 14, hudY);
    hudY += 22;
  }
  if (ship.shield > 0) {
    ctx.fillStyle = '#4af';
    ctx.fillText(`ESCUDO x${ship.shield}`, 14, hudY);
    hudY += 22;
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  if (skinNameTimer > 0) {
    ctx.fillStyle = SKINS[skinIndex].color;
    ctx.fillText(`SKIN: ${SKINS[skinIndex].name}`, W / 2, 50);
  }

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(p => p.draw());
  shootingStars.forEach(s => s.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
