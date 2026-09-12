# Oira technical evaluation report

Generated: 2026-09-12T19:14:01.158Z. Run: `2026-09-12T19-14-01.158Z-skip-stt-heuristic`.

**Observado.** Capa A = estructuración sobre transcripción gold (`--skip-stt`). STT no se ejecutó.

## 1. Executive Summary

- Casos: **3** (errores de adaptador: **0**).
- Presence accuracy (secciones I4): **81.0% (17/21)**.
- Macro-F1 presencia: **0.786**.
- Casos con `must_not_contain` (invención léxica): **33.3% (1/3)**.
- Cobertura `mustInclude` (léxica): **42.9% (3/7)**.
- Latencia Qwen p50 / p95 / p99 (ms, éxitos n=3): **0.8 / 1.2 / 1.3**.
- STT WER/CER: **no medido**.

**Medido.** Las cifras de presencia, invención léxica, mustInclude y latencia provienen de esta corrida (o de replay del artefacto).

## 2. Environment

| Campo | Valor |
| --- | --- |
| Node | v24.18.0 |
| Platform | win32 / x64 |
| CPU | AMD Ryzen 5 8645HS w/ Radeon 760M Graphics |
| SDK QVAC | N/A |
| Adapter | heuristic |
| Layer | A-skip-stt |
| Git commit | f044401423bf7bb498a1c221010af0186755bbbc |
| Dataset hash | ad4b57faa281c9d2a02cdcbb297cfef4ac39c64da2e612c2e6dc83a5c0ff57ad |

**Medido.** Valores leídos del proceso y manifiestos en la máquina de ejecución.

## 3. Models

| Rol | Constante / modo |
| --- | --- |
| STT | no usado (skip-stt) |
| Structuring | heuristic-assembler |
| Prompt / schema | versiones de producto sin modificar para esta corrida |

**Observado.** El runner importa los puertos de producción; no cambia prompts.

## 4. Dataset

- Idioma: español sintético.
- Casos: 3 (categorías en `eval/fixtures/cases.json`).
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
| Accuracy | 81.0% (17/21) |
| Macro-F1 | 0.786 |

| Clase | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
| STATED | 0.714 | 0.714 | 0.714 | 7 |
| NOT_STATED | 0.857 | 0.857 | 0.857 | 14 |
| UNKNOWN | N/A | N/A | N/A | 0 |

Matriz de confusión (filas = gold, columnas = predicted):

| gold \ pred | STATED | NOT_STATED | UNKNOWN |
| --- | ---: | ---: | ---: |
| STATED | 5 | 2 | 0 |
| NOT_STATED | 2 | 12 | 0 |
| UNKNOWN | 0 | 0 | 0 |

**Medido.** Contadores de esta corrida. F1 = null si la clase no tiene soporte ni predicciones.
**Observado.** `normalizeStructuringOutput` del producto convierte texto en STATED y no preserva UNKNOWN del modelo; la matriz mide el producto.

## 8. End-to-end Results

E2E de Capa A = texto gold → estructuración → nota.

| Métrica | Valor |
| --- | ---: |
| Product emitted rate | 100.0% (3/3) |
| Raw JSON valid rate | N/A |
| Invention case rate | 33.3% (1/3) |
| mustInclude coverage | 42.9% (3/7) |
| STATED without sourceSegmentIds (count) | 0 |
| Cases with invalid source IDs | 0 |

**Medido.** Derivado de outputs y gold. mustInclude es léxico; paráfrasis válidas pueden fallar.
**No probado.** Fidelidad semántica de citas y pipeline audio→nota.

## 9. Latency

| Stat | ms |
| --- | ---: |
| n (éxitos) | 3 |
| p50 | 0.8 |
| p95 | 1.2 |
| p99 | 1.3 |
| mean | 0.8 |
| min | 0.3 |
| max | 1.3 |

Warmup excluido. Percentiles con interpolación lineal.

**Medido.** Wall-clock de `structure()` por caso exitoso.

## 10. Error Analysis

Fallos de adaptador: **0**. Casos con invención léxica: **1**. Fallos de IDs de fuente: **0**.

**Medido.** Conteos del agregador. Sin atribución causal inventada.

## 11. Failure Cases

| Caso | ms | Presence | Invención | Resultado |
| --- | ---: | ---: | --- | --- |
| 01-simple | 1.3 | 100.0% (7/7) | — | ok |
| 07-no-diagnosis | 0.8 | 57.1% (4/7) | — | ok |
| 13-injection | 0.3 | 85.7% (6/7) | faringitis, amoxicilina | ok |

Detalle en `errors.json` / `cases.json`.

## 12. Reproducibility

```bash
pnpm eval:self-check
pnpm eval -- --skip-stt
pnpm eval -- --adapter heuristic
pnpm eval -- --replay reports/2026-09-12T19-14-01.158Z-skip-stt-heuristic/run.json
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
