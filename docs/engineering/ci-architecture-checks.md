# Controles de arquitectura en CI

`scripts/architecture/check-boundaries.mjs` revisa el código productivo de
`apps/desktop/src/`. Falla con `archivo:línea` cuando encuentra alguna de estas
violaciones:

- `@qvac/sdk` fuera de `src/main/qvac/`;
- imports del Renderer hacia `src/main/`, `electron` o módulos Node;
- acceso a `window.oira` fuera de `src/renderer/bridge/`;
- exposición de `ipcRenderer`, `require` o `fs` mediante
  `contextBridge.exposeInMainWorld`.

El script usa el parser de TypeScript instalado por `apps/desktop`. Reconoce
imports y reexports estáticos, `import("literal")`, `require("literal")`,
imports bare de Node y accesos `window.oira` o `globalThis["oira"]`. También
analiza objetos declarados localmente que se pasan a `exposeInMainWorld`.

No interpreta expresiones dinámicas, aliases configurados por TypeScript ni
valores privilegiados que atraviesan funciones o módulos. Esas fronteras siguen
cubiertas por revisión y pruebas del contrato de preload.

Ejecuta los controles localmente:

```powershell
node --test scripts/architecture/check-boundaries.test.mjs
node scripts/architecture/check-boundaries.mjs
```

El workflow `.github/workflows/ci.yml` los ejecuta antes de lint, typecheck,
tests y build. Usa Windows porque el producto Electron incluye dependencias
nativas dirigidas a ese entorno. No descarga modelos ni ejecuta inferencia
QVAC real.
