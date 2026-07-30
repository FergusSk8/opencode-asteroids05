# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. Incluye power-ups especiales y tipos de asteroides únicos como la estrella fugaz.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave |
| `↑`       | Propulsar  |
| `Espacio` | Disparar   |
| `C`       | Cambiar skin de la nave |

## Puntuación

| Asteroide      | Puntos |
| -------------- | ------ |
| Grande         | 20     |
| Mediano        | 50     |
| Pequeño        | 100    |
| Estrella fugaz | 300    |

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- **Estrella fugaz**: asteroide bonus que cruza rápido con estela de cometa, se encoge y desaparece al cabo de 5 segundos. 300 puntos + power-up garantizado al acertarle
- **Power-ups**: al destruir asteroides (20 % de probabilidad) puedes obtener **velocidad x2** (rayo cian, 5 s), **escudo** (cápsula azul, absorbe 3 golpes) o **triple disparo** (3 puntos amarillos, 5 s). La estrella fugaz concede un power-up aleatorio.

## Skins

La nave tiene 5 skins intercambiables con **C** durante el juego. Cada skin tiene silueta y color propio:

| Skin         | Color        | Tamaño | Puntos |
| ------------ | ------------ | ------ | ------ |
| CLÁSICA      | Blanco       | 1x     | 1x     |
| INTERCEPTOR  | Cian         | 1x     | 1x     |
| DOBLE ALA    | Magenta      | 1x     | 1x     |
| DELTA        | Naranja      | 1x     | 1x     |
| MATRIX       | Verde matrix | 2x    | 2x     |

La selección se guarda en `localStorage` y persiste entre sesiones. La skin **MATRIX** es el doble de grande y otorga el doble de puntos al destruir asteroides y estrellas fugaces (su mayor tamaño también aumenta el radio de colisión y la hace más vulnerable).
