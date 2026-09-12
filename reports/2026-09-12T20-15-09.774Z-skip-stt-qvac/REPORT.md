# Oira technical evaluation report

Generated: 2026-09-12T20:15:09.774Z. Run: `2026-09-12T20-15-09.774Z-skip-stt-qvac`.

**Observado.** Capa A = estructuración sobre transcripción gold (`--skip-stt`). STT no se ejecutó.

## 1. Executive Summary

- Casos: **13** (errores de adaptador: **0**).
- Presence accuracy (secciones I4): **89.0% (81/91)**.
- Macro-F1 presencia: **0.591**.
- Casos con `must_not_contain` (invención léxica): **0.0% (0/13)**.
- Cobertura `mustInclude` (léxica): **76.0% (38/50)**.
- Latencia de estructuración p50 / p95 / p99 (ms, éxitos n=13): **14436.3 / 17580.8 / 17724.0**.
- STT WER/CER: **no medido**.

**Medido.** Las cifras de presencia, invención léxica, mustInclude y latencia provienen de esta corrida (o de replay del artefacto).

## 2. Environment

| Campo | Valor |
| --- | --- |
| Node | v22.22.0 |
| Platform | win32 / x64 |
| CPU | AMD Ryzen 5 8645HS w/ Radeon 760M Graphics |
| SDK QVAC | 0.18.2 |
| Adapter | qvac |
| Layer | A-skip-stt |
| Git commit | f044401423bf7bb498a1c221010af0186755bbbc |
| Dataset hash | ad4b57faa281c9d2a02cdcbb297cfef4ac39c64da2e612c2e6dc83a5c0ff57ad |

**Medido.** Valores leídos del proceso y manifiestos en la máquina de ejecución.

## 3. Models

| Rol | Constante / modo |
| --- | --- |
| STT | no usado (skip-stt) |
| Structuring | QWEN3_4B_Q4_K_M |
| Prompt / schema | versiones de producto sin modificar para esta corrida |

**Observado.** El runner importa los puertos de producción; no cambia prompts.

## 4. Dataset

- Idioma: español sintético.
- Casos: 13 (categorías en `eval/fixtures/cases.json`).
- Gold: I4 (`STATED` / `NOT_STATED` / `UNKNOWN`), escrito desde el guion.
- Sin audio WAV en esta etapa.

**Observado.** Contenido de `eval/fixtures/`; no hay pacientes reales.

## 5. Methodology

1. Cargar fixtures de texto.
2. Warmup del adaptador (si QVAC).
3. Por caso: `structure({ transcript })` con la transcripción gold.
4. Puntuar presencia, invención léxica (`must_not_contain`), `mustInclude`, IDs de fuente, latencia.
5. Escribir `run.json` + derivados; permitir `--replay` sin GPU.

**Observado.** Flujo del runner. No es un ensayo clínico.

## 6. Speech-to-text Results

| Métrica | Valor |
| --- | ---: |
| WER | N/A |
| CER | N/A |
| Estado | no_medido |

**No probado.** Capa A: --skip-stt. No hay WAV de referencia en esta etapa.

## 7. Classification Results

Clasificación = **presencia por sección I4** (gold vs nota de producto post-normalización).

| Métrica | Valor |
| --- | ---: |
| Accuracy | 89.0% (81/91) |
| Macro-F1 | 0.591 |

| Clase | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| STATED | 0.926 | 0.781 | 0.847 | 32 |
| NOT_STATED | 0.875 | 0.982 | 0.926 | 57 |
| UNKNOWN | 0.000 | 0.000 | 0.000 | 2 |

Matriz de confusión (filas = gold, columnas = predicted):

| gold \ pred | STATED | NOT_STATED | UNKNOWN |
| --- | ---: | ---: | ---: |
| STATED | 25 | 7 | 0 |
| NOT_STATED | 1 | 56 | 0 |
| UNKNOWN | 1 | 1 | 0 |

**Medido.** Contadores de esta corrida. F1 = null si la clase no tiene soporte ni predicciones.
**Observado.** `normalizeStructuringOutput` del producto convierte texto en STATED y no preserva UNKNOWN del modelo; la matriz mide el producto.

## 8. End-to-end Results

E2E de Capa A = texto gold → estructuración → nota.

| Métrica | Valor |
| --- | ---: |
| Product emitted rate | 100.0% (13/13) |
| Raw JSON valid rate | 1.000 |
| Invention case rate | 0.0% (0/13) |
| mustInclude coverage | 76.0% (38/50) |
| STATED without sourceSegmentIds (count) | 0 |
| Cases with invalid source IDs | 0 |

**Medido.** Derivado de outputs y gold. mustInclude es léxico; paráfrasis válidas pueden fallar.
**No probado.** Fidelidad semántica de citas y pipeline audio→nota.

## 9. Latency

| Stat | ms |
| --- | ---: |
| n (éxitos) | 13 |
| p50 | 14436.3 |
| p95 | 17580.8 |
| p99 | 17724.0 |
| mean | 14410.9 |
| min | 11232.5 |
| max | 17759.8 |

Warmup excluido. Percentiles con interpolación lineal.

**Medido.** Wall-clock de `structure()` por caso exitoso.

## 10. Error Analysis

Fallos de adaptador: **0**. Casos con invención léxica: **0**. Fallos de IDs de fuente: **0**.

**Medido.** Conteos del agregador. Sin atribución causal inventada.

## 11. Failure Cases

| Caso | ms | Presence | Invención | Resultado |
| --- | ---: | ---: | --- | --- |
| 01-simple | 12326.1 | 85.7% (6/7) | — | ok |
| 02-negation | 12699.8 | 85.7% (6/7) | — | ok |
| 03-medications | 17759.8 | 85.7% (6/7) | — | ok |
| 04-dosage | 16754.6 | 100.0% (7/7) | — | ok |
| 05-correction | 11701.2 | 85.7% (6/7) | — | ok |
| 06-ambiguous-timeline | 12315.1 | 85.7% (6/7) | — | ok |
| 07-no-diagnosis | 17461.4 | 100.0% (7/7) | — | ok |
| 08-multiple-symptoms | 15186.5 | 100.0% (7/7) | — | ok |
| 09-noisy-text | 13080.7 | 100.0% (7/7) | — | ok |
| 10-longer | 15200.3 | 85.7% (6/7) | — | ok |
| 11-missing-plan | 14436.3 | 100.0% (7/7) | — | ok |
| 12-contradiction | 17186.9 | 57.1% (4/7) | — | ok |
| 13-injection | 11232.5 | 85.7% (6/7) | — | ok |

Detalle en `errors.json` / `cases.json`.

## 12. Reproducibility

```bash
pnpm eval:self-check
pnpm eval -- --skip-stt
pnpm eval -- --adapter heuristic
pnpm eval -- --replay reports/2026-09-12T20-15-09.774Z-skip-stt-qvac/run.json
```

Hashes de fuentes: ver `metadata.sourceHashes` en `run.json`.

**Observado.** Comandos del package.json raíz.

## 13. Limitations

- Sin audio: WER/CER no medidos.
- `mustInclude` / `must_not_contain` son léxicos.
- Gold de un solo anotador en esta etapa.
- Una corrida no estima estabilidad multi-máquina.
- El producto normaliza presencia de forma permisiva.

**Observado.** Límites del diseño de Capa A.

## 14. Conclusions

**Inferido.** Las cifras anteriores describen solo esta configuración, dataset y máquina. No justifican claims clínicos de producto ni optimizaciones.

No optimizar a partir de este informe sin autorización explícita.
