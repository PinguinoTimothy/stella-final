---
description: Ejecuta tests, build y lint del proyecto y resume el resultado
---

Verifica el estado actual del proyecto ejecutando, en este orden:

1. `npm test`
2. `npm run build`
3. `npx eslint .`

Para cada paso, indica si ha pasado o fallado. Si algo falla:
- Muestra solo el error relevante (no el log completo).
- Indica el fichero y la línea.
- Distingue entre fallos que ya existían (ver la sección "Estado conocido" de CLAUDE.md) y fallos nuevos.

No intentes arreglar nada salvo que el usuario lo pida. Termina con una línea de resumen: qué pasa y qué no.
