# CLAUDE.md

Instrucciones para agentes de IA (Claude Code) que trabajen en este repositorio.

## Qué es

**PF1e Companion** (nombre en el manifiesto PWA: "Que si quesito que si"): una PWA móvil para jugar a Pathfinder 1e. Cubre hechizos y slots, inventario y party, efectos activos, bestiario, referencias de reglas (UMR, habilidades, DCs), mapas/PDF y una vista de solo lectura para jugadores (`?view=1`).

Es un proyecto de fan, no oficial. El texto de reglas y los datos de catálogo pueden venir de fuentes de terceros: no añadas texto de reglas nuevo sin indicar su origen.

## Stack

- Vue 3 + Vite 5, Pinia para el estado, JavaScript (ES modules). Sin Vue Router ni librería de componentes.
- CSS heredado del fichero HTML original (`src/styles/app.css`, `elder.css`, etc.). Reutilízalo antes de crear estilos nuevos.
- Supabase (REST sin SDK, `src/lib/supabase.js`) para guardado en la nube y vista de jugador.
- `vite-plugin-pwa` para service worker y manifiesto.
- Cloudflare: `worker/index.js` sirve la app y expone `/api/translate`. Configuración en `wrangler.jsonc`.
- Vitest + jsdom para tests. ESLint (flat config) y Prettier para estilo.

## Comandos

Node 20 recomendado (en local también funciona con Node 22).

| Acción | Comando |
| --- | --- |
| Instalar dependencias | `npm ci` |
| Servidor de desarrollo | `npm run dev` |
| Tests | `npm test` (equivale a `vitest run`) |
| Test de un fichero | `npx vitest run src/lib/sheetCalc.test.js` |
| Build de producción | `npm run build` (genera `dist/` y el service worker) |
| Lint | `npx eslint .` (no hay script `lint` en `package.json`) |
| Previsualizar build | `npm run preview` |

Antes de dar por terminado un cambio, ejecuta tests, build y lint.

**Estado conocido:** `npm test` tiene 4 tests fallando en `src/stores/sheets.test.js` ("No PDF header found" al leer el PDF generado por `tests/sheetFixture.js`). Son anteriores a cualquier cambio reciente. No los "arregles" de paso ni los ignores en silencio: si tu cambio los toca, dilo explícitamente.

## Estructura

- `src/App.vue`: shell, navegación y routing por pantalla.
- `src/main.js`: arranque de Vue y Pinia, persistencia local, sincronización en la nube.
- `src/views/`: pantallas.
- `src/components/`: componentes reutilizables, agrupados por dominio (Cast, Active, Combat, Equipment, MagicCatalog, Maps, etc.).
- `src/stores/`: estado Pinia y acciones por dominio.
- `src/lib/`: lógica pura de reglas, cálculos, mapeo, persistencia y utilidades. **Aquí va la lógica de reglas y debe tener tests.**
- `src/services/`, `src/composables/`, `src/data/`: integraciones, composables y datos de referencia.
- `src/**/*.test.js` y `tests/`: tests junto al código; `tests/sheetFixture.js` genera un PDF de ficha de ejemplo.
- `worker/`: Worker de Cloudflare y su test.
- `schema.sql`: esquema, políticas RLS y funciones de Supabase.
- `public/`: iconos, `_headers` (cabeceras y CSP) y assets estáticos.

Dónde tocar según la tarea:
- Pantalla o UI → `src/views/` y `src/components/`.
- Estado y acciones → `src/stores/`.
- Reglas, cálculos, parsing → `src/lib/`, con test.
- Base de datos → `schema.sql` (y revisar las políticas RLS).

## Convenciones

- **Estilo:** Prettier (`.prettierrc`): comillas simples, punto y coma, `printWidth` 120, coma final, `arrowParens: avoid`. Aplícalo solo a los ficheros que tocas.
- **Idioma:** textos de la interfaz y documentación en español. Identificadores de código en inglés o en el idioma que ya use el fichero; sigue el estilo local.
- **Reglas de juego:** la lógica de cálculo (BAB, CMB/CMD, modificadores, slots, DCs, etc.) va en `src/lib/` como funciones puras, sin acceso al DOM ni a Pinia. Añade o actualiza un test cuando cambies una regla.
- **Comentarios:** breves y solo cuando aporten algo que el código no dice. Los comentarios existentes están en español; mantenlos en español.
- **Dependencias:** no añadas librerías nuevas sin pedirlo. Evita duplicar utilidades que ya existan en `src/lib/`.

## Reglas de cuidado

- **Seguridad de Supabase:** la clave anon es pública por diseño. Lo que pueden leer o escribir los jugadores lo decide `schema.sql` (RLS y `public.is_admin()`). Si tocas acceso a datos, revisa las políticas, no solo el cliente.
- **Datos personales:** no metas datos reales de personajes ni de jugadores en el repo, ni en fixtures ni en tests.
- **Cabeceras y CSP:** `public/_headers` tiene la CSP en modo **solo informe** (`Content-Security-Policy-Report-Only`). No la pases a modo bloqueante sin revisar antes la consola del navegador.
- **Service worker:** `vite.config.js` define la caché. Las peticiones a Supabase van siempre por red (`NetworkOnly`). Si cambias la caché, comprueba el comportamiento offline.
- **Git:** no hagas `commit`, `push` ni crees ramas sin que el usuario lo pida.
- **Ficheros `.patch` en la raíz** (`combat-initiative-merge.patch`, `stella-cambios.patch`): son históricos. No los modifiques ni los apliques sin preguntar.

## Cosas desactualizadas en la documentación

Al leer el README o DEPLOY.md, ten en cuenta que hay referencias que no coinciden con el repo:

- El README dice que el admin se configura por email en `public.is_admin()`. El `schema.sql` actual lo decide por UUID en la tabla `public.app_admins`.
- El README menciona `index-original.html` y `MIGRATION_PROGRESS.md`; no existen en el repo.
- `DEPLOY.md` pide instalar `vite-plugin-pwa`, que ya está en `devDependencies`.
- `wrangler.jsonc` usa el nombre `gestor-de-quesitos`, distinto del de `package.json` (`pf1e-tracker`).
- `.gitignore` tiene una excepción para `.env.example`, que no existe.

Si la documentación y el código no coinciden, manda el código y menciona la discrepancia en tu respuesta.
