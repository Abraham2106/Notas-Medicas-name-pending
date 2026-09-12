# Eval Oira (Capa A)

Harness de **medición** separado del producto. No cambia prompts, IPC ni UI.

## Layout

| Ruta | Rol |
| --- | --- |
| `scorer/index.mjs` | Métricas puras (presencia I4, invención léxica, latencia, WER/CER helpers) |
| `scorer.test.mjs` / `fixtures.test.mjs` | Self-check sin modelos |
| `fixtures/` | 13 casos sintéticos congelados (script + transcript + gold I4) |
| `runner.mjs` | CLI: `--skip-stt`, `--adapter qvac\|heuristic`, `--replay`, `--cases` |
| `register-ts.mjs` | Resuelve imports TS de Main / `@oira/types` |
| `report.mjs` | `REPORT.md` + `metrics.json` / `cases.json` / `errors.json` |

Salidas: [`reports/`](../reports/README.md).

## Comandos

```bash
pnpm eval:self-check
pnpm eval -- --adapter heuristic
pnpm eval -- --adapter qvac
pnpm eval -- --cases "02,07,13"
pnpm eval -- --replay reports/<run-id>/run.json
```

En PowerShell, cita `--cases` para no romper las comas.

## Pesos QVAC

Caché por defecto: `%LOCALAPPDATA%\Oira\qvac-models` (`qvac.config.mjs`, fuera de OneDrive).

```bash
# Solo Qwen (Capa A). ~2.5 GB. Reanudable.
$env:QVAC_CONFIG_PATH = (Resolve-Path "eval\qvac-local.config.mjs").Path  # opcional
node apps/desktop/scripts/prefetch-qwen.mjs
pnpm eval -- --adapter qvac
```

## Evidencia

Etiquetas obligatorias en reportes: **medido** / **observado** / **inferido** / **no_probado**.

- Capa A (`--skip-stt`): estructuración sobre transcripción gold.
- STT (WER/CER): **no_medido** hasta que existan WAV.
- Sin pesos QVAC: el runner escribe un reporte `BLOCKED` y no inventa cifras.

## Origen del patrón

Inspirado en el harness de [Albatross](https://github.com/Abraham2106/Albatross) (scorer puro + replay + hashes). **No se copió código** (LICENSE propietaria). Dominio y métricas son I4/Oira.
