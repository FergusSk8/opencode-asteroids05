# AGENTS.md

Asteroids clone in a single vanilla-JS file. No build, no deps, no tests.

## Run

Open `index.html` directly in a browser, or `npx serve .` → `http://localhost:3000`.

## Structure

- `index.html` — canvas (`800x600`, id `canvas`) + `<script src="game.js">`. That's it.
- `game.js` — entire game: input, `Bullet`/`Asteroid`/`ShootingStar`/`Ship`/`Particle`/`PowerUp` classes, game state, `update()`/`draw()`, `requestAnimationFrame` loop. Runs top-level; no modules, no exports.
- `README.md` — user-facing docs in Spanish.

## Conventions

- Keep everything in `game.js`; do not add a bundler, package.json, or test framework unless explicitly asked.
- UI strings and code comments are in Spanish (e.g. `NIVEL`, `PUNTAJE`). Match that.
- The game world is toroidal — entities must wrap via `wrap()` when moving; canvas size constants are `W`/`H` (800x600).
- Canvas is hardcoded `width=800 height=600` in HTML and `W`/`H` in JS; changing one requires changing the other.
- Game tuning lives in per-size lookup tables at the top of the Asteroid section (`RADII`, `SPEEDS`, `POINTS`), constants inside `Ship.update()` (`ROT`, `THRUST`, `DRAG`), ShootingStar constants (`STAR_SPEED`, `STAR_TTL`, `STAR_POINTS`, `STAR_RADIUS`, `STAR_FADE_TIME`, `STAR_SPAWN_MIN`, `STAR_SPAWN_MAX`) at its section, power-up constants (`DROP_CHANCE`, `SPEED_DURATION`, `SHIELD_HITS`, `TRIPLE_DURATION`, `TRIPLE_SPREAD`) and `PowerUp.type` at the PowerUp section, and the `SKINS` table before the Ship class (each skin has `name`, `color`, `nose`, `radius`, `multiplier`, `verts`).
- State machine: `state` is `'playing' | 'dead' | 'gameover'`; `update()` branches on it — add new states there, not in `draw()`.

## Verify changes

No automated checks exist. Manual verification: serve and play in a browser. The `webapp-testing` skill (Playwright) can be used to smoke-test that the page loads and the loop runs without console errors.
