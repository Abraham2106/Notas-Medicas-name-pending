# REPORT.md — Oira eval

Generado: 2026-09-12T18:53:07.021Z. Adapter: `heuristic`. Idioma: es.
Corrida: `2026-09-12T18-53-07.021Z-heuristic`. Evidencia: cada cifra declara si fue medida, observada, inferida o no probada.

## 1. Executive Summary

Medido. 13 casos de texto I4; 13 emitieron nota de producto; 0 fallos de adaptador.
Invención léxica (`must_not_contain`): 7.7% de casos emitidos (n=13).
Clasificación de presencia: accuracy 0.758, macro-F1 0.483 (n=91 secciones).
STT: no_medido.

Observado. La nota puntuada es la salida post-normalización de Oira, no el JSON crudo de Qwen.

## 2. Environment

| Campo | Valor | Evidencia |
| --- | --- | --- |
| Node | v24.18.0 | Medido |
| OS | win32 x64 | Medido |
| CPU | AMD Ryzen 5 8645HS w/ Radeon 760M Graphics | Medido |
| SDK QVAC | N/A (heuristic) | Medido |
| Adapter | heuristic | Medido |
| skip-stt | true | Medido |

Hashes de fuentes en `run.json` → `metadata.sourceHashes`.

## 3. Models

| Modelo | Uso | Evidencia |
| --- | --- | --- |
| Qwen3 4B Q4_K_M | Estructuración si adapter=qvac | No probado |
| Whisper Large V3 Turbo | STT | No probado — no se cargó en esta etapa |

Configuración de generación: la de producción (`createQwenStructuring`). Esta corrida no cambia prompts.

## 4. Dataset

13 casos sintéticos en español, set congelado, un caso por categoría de la guía IA reescrita a I4.
Gold escrito a mano desde el guion. Sin audio. Sin datos de pacientes reales.
Distribución: ver `eval/fixtures/cases.json`.

## 5. Methodology

1. Cargar `transcript.json` de cada caso.
2. Llamar `structure({ transcript })` del adapter elegido (warmup excluido de la latencia por caso).
3. Puntuar la `ClinicalNote` de producto contra `gold.json`.
4. STT no se ejecuta (`--skip-stt`).
5. Replay: `pnpm eval -- --replay reports/<run-id>/run.json` recalcula métricas sin inferencia.

## 6. Speech-to-text Results

**No probado.** skip-stt: esta etapa no ejecuta Whisper ni usa WAV
WER: N/A. CER: N/A. No hay hipótesis de Whisper que puntuar.

## 7. Classification Results

Presencia por sección I4 (`STATED` / `NOT_STATED` / `UNKNOWN`). Medido.

| Métrica | Valor |
| --- | ---: |
| Accuracy | 0.758 |
| Macro-F1 | 0.483 |
| n (secciones de casos emitidos) | 91 |

| Clase | Precision | Recall | F1 | Support gold |
| --- | ---: | ---: | ---: | ---: |
| STATED | 0.739 | 0.531 | 0.618 | 32 |
| NOT_STATED | 0.765 | 0.912 | 0.832 | 57 |
| UNKNOWN | 0.000 | 0.000 | 0.000 | 2 |

| gold \ pred | STATED | NOT_STATED | UNKNOWN |
| --- | ---: | ---: | ---: |
| STATED | 17 | 15 | 0 |
| NOT_STATED | 5 | 52 | 0 |
| UNKNOWN | 1 | 1 | 0 |

Observado. `normalizeStructuringOutput` convierte texto no vacío en `STATED` y vacío en `NOT_STATED`. Un gold `UNKNOWN` puede desalinearse por ese colapso; no se atribuye solo a Qwen.

## 8. End-to-end Results

Pipeline de esta etapa: transcripción gold → estructuración → nota. Medido.

| Métrica | Valor |
| --- | ---: |
| Casos | 13 |
| Notas emitidas | 13 |
| Fallos de adaptador | 0 |
| JSON crudo válido | N/A |
| verifySource (IDs existen) | 100.0% |
| STATED sin sourceSegmentIds | 0 |
| Cobertura mustInclude (léxica) | 54.0% |
| Casos con invención léxica | 1 |

Observado. `verifySource` solo comprueba que los IDs existan, no que respalden el texto.
No probado. Fidelidad semántica de cada afirmación.

## 9. Latency

Latencia de `structure()` en éxitos. Warmup excluido. Medido.

| Estadístico | ms | n |
| --- | ---: | ---: |
| p50 | 0.3 | 13 |
| p95 | 1.9 | 13 |
| p99 | 2.6 | 13 |

Una sola corrida de 13 casos no estima el rendimiento de otra máquina.

## 10. Error Analysis

Fallos de adaptador: 0. Invenciones léxicas: 1.
| Caso | Error | must_not_contain | STATED sin fuente |
| --- | --- | --- | --- |
| 13-injection | — | faringitis, amoxicilina | — |

## 11. Failure Cases

| Caso | ms | Emitió | Invención | Resultado |
| --- | ---: | --- | --- | --- |
| 01-simple | 2.8 | sí | no | ok |
| 02-negation | 1.3 | sí | no | ok |
| 03-medications | 0.6 | sí | no | ok |
| 04-dosage | 0.3 | sí | no | ok |
| 05-correction | 0.3 | sí | no | ok |
| 06-ambiguous-timeline | 0.4 | sí | no | ok |
| 07-no-diagnosis | 0.2 | sí | no | ok |
| 08-multiple-symptoms | 0.5 | sí | no | ok |
| 09-noisy-text | 0.3 | sí | no | ok |
| 10-longer | 0.6 | sí | no | ok |
| 11-missing-plan | 0.2 | sí | no | ok |
| 12-contradiction | 0.3 | sí | no | ok |
| 13-injection | 0.2 | sí | sí | invención |

## 12. Reproducibility

```
pnpm eval:self-check
pnpm eval
pnpm eval -- --replay reports/2026-09-12T18-53-07.021Z-heuristic/run.json
pnpm eval -- --cases 02-negation,07-no-diagnosis,13-injection
pnpm eval -- --adapter heuristic
```

El replay debe reproducir `metrics.json` bit a bit salvo `metadata.rescoredAt`.

## 13. Limitations

- Sin audio: WER/CER y el pipeline completo con Whisper no están medidos.
- `mustInclude` es léxico; una paráfrasis válida puede puntuar bajo.
- Set de 13 casos sintéticos; no hay split de desarrollo separado.
- Gold no fue doble-anotado por un segundo humano en esta entrega.
- No se midió VRAM, RTF ni determinismo entre repeticiones.

## 14. Conclusions

Conclusiones estrictamente ancladas a esta corrida:

- Medido: accuracy de presencia 0.758; macro-F1 0.483; invención léxica en 1/13 casos emitidos.
- No probado: calidad de Whisper, semántica de citas, generalización clínica.
- Inferido: este resultado es un baseline del producto actual, no un umbral de publicación ni un claim clínico.
