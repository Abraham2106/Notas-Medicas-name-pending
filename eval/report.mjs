/** Render REPORT.md + metrics/cases/errors.json from a completed run artifact. */

function pct(n, d) {
  if (d === 0 || d === null || d === undefined || n === null || n === undefined) {
    return "N/A"
  }
  return `${((100 * n) / d).toFixed(1)}% (${n}/${d})`
}

function fmt(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(n)) return "N/A"
  return typeof n === "number" ? n.toFixed(digits) : String(n)
}

function evidence(kind, text) {
  return `**${kind}.** ${text}`
}

export function buildArtifacts(run) {
  const s = run.summary
  const metrics = {
    evidence_rule: "medido | observado | inferido | no_probado",
    run_id: run.metadata.runId,
    layer: run.metadata.layer,
    presence: s.presence,
    invention: s.invention,
    mustIncludeCoverage: s.mustIncludeCoverage,
    productEmittedRate: s.productEmittedRate,
    rawJsonValidRate: s.rawJsonValidRate,
    statedWithoutSource: s.statedWithoutSource,
    sourceIdFailureCases: s.sourceIdFailureCases,
    latency: s.latency,
    stt: s.stt,
    cases: s.cases,
    errors: s.errors,
  }

  const cases = run.results.map((r) => ({
    id: r.id,
    category: r.category,
    error: r.evaluation.error,
    latencyMs: r.evaluation.latencyMs,
    productEmitted: r.evaluation.productEmitted,
    rawJsonValid: r.evaluation.rawJsonValid,
    presenceAccuracy: r.evaluation.presence.accuracy,
    inventionHits: r.evaluation.mustNotContainHits,
    mustInclude: r.evaluation.mustInclude,
    statedWithoutSource: r.evaluation.statedWithoutSource,
    sourceIdsOk: r.evaluation.verifySourceOk,
    presencePairs: r.evaluation.presencePairs,
  }))

  const errors = run.results
    .filter(
      (r) =>
        r.evaluation.error ||
        r.evaluation.invention ||
        !r.evaluation.verifySourceOk,
    )
    .map((r) => ({
      id: r.id,
      error: r.evaluation.error,
      inventionHits: r.evaluation.mustNotContainHits,
      invalidSourceIds: r.evaluation.invalidSourceIds,
      presenceMismatches: r.evaluation.presencePairs.filter((row) => row.gold !== row.pred),
    }))

  return { metrics, cases, errors, reportMarkdown: renderReport(run) }
}

export function renderReport(run) {
  const { metadata: m, summary: s, results } = run
  const matrix = s.presence.matrix

  const matrixRows = ["STATED", "NOT_STATED", "UNKNOWN"]
    .map((actual) => {
      const cells = ["STATED", "NOT_STATED", "UNKNOWN"]
        .map((predicted) => matrix[actual][predicted])
        .join(" | ")
      return `| ${actual} | ${cells} |`
    })
    .join("\n")

  const classRows = ["STATED", "NOT_STATED", "UNKNOWN"]
    .map((label) => {
      const c = s.presence.byClass[label]
      return `| ${label} | ${fmt(c.precision, 3)} | ${fmt(c.recall, 3)} | ${fmt(c.f1, 3)} | ${c.support} |`
    })
    .join("\n")

  const caseRows = results
    .map((r) => {
      const pa =
        r.evaluation.presence.n === 0
          ? "N/A"
          : pct(r.evaluation.presence.correct, r.evaluation.presence.n)
      return `| ${r.id} | ${fmt(r.evaluation.latencyMs)} | ${pa} | ${
        r.evaluation.mustNotContainHits.join(", ") || "—"
      } | ${r.evaluation.error ?? "ok"} |`
    })
    .join("\n")

  const productOk =
    s.productEmittedRate === null ? null : Math.round(s.productEmittedRate * s.cases)

  return `# Oira technical evaluation report

Generated: ${m.startedAt}. Run: \`${m.runId}\`.

${evidence("Observado", "Capa A = estructuración sobre transcripción gold (\`--skip-stt\`). STT no se ejecutó.")}

## 1. Executive Summary

- Casos: **${s.cases}** (errores de adaptador: **${s.errors}**).
- Presence accuracy (secciones I4): **${pct(s.presence.correct, s.presence.total)}**.
- Macro-F1 presencia: **${fmt(s.presence.macroF1, 3)}**.
- Casos con \`must_not_contain\` (invención léxica): **${pct(s.invention.casesWithHits, s.cases)}**.
- Cobertura \`mustInclude\` (léxica): **${
    s.mustIncludeCoverage === null ? "N/A" : pct(s.mustIncludeHits, s.mustIncludeTotal)
  }**.
- Latencia de estructuración p50 / p95 / p99 (ms, éxitos n=${s.latency.samples}): **${fmt(s.latency.p50)} / ${fmt(s.latency.p95)} / ${fmt(s.latency.p99)}**.
- STT WER/CER: **no medido**.

${evidence("Medido", "Las cifras de presencia, invención léxica, mustInclude y latencia provienen de esta corrida (o de replay del artefacto).")}

## 2. Environment

| Campo | Valor |
| --- | --- |
| Node | ${m.node} |
| Platform | ${m.hardware?.platform ?? "N/A"} / ${m.hardware?.arch ?? "N/A"} |
| CPU | ${m.hardware?.cpu ?? "N/A"} |
| SDK QVAC | ${m.sdk ?? "N/A"} |
| Adapter | ${m.adapter} |
| Layer | ${m.layer} |
| Git commit | ${m.gitCommit ?? "N/A"} |
| Dataset hash | ${m.datasetHash ?? "N/A"} |

${evidence("Medido", "Valores leídos del proceso y manifiestos en la máquina de ejecución.")}

## 3. Models

| Rol | Constante / modo |
| --- | --- |
| STT | no usado (skip-stt) |
| Structuring | ${m.models?.structuring ?? "N/A"} |
| Prompt / schema | versiones de producto sin modificar para esta corrida |

${evidence("Observado", "El runner importa los puertos de producción; no cambia prompts.")}

## 4. Dataset

- Idioma: español sintético.
- Casos: ${s.cases} (categorías en \`eval/fixtures/cases.json\`).
- Gold: I4 (\`STATED\` / \`NOT_STATED\` / \`UNKNOWN\`), escrito desde el guion.
- Sin audio WAV en esta etapa.

${evidence("Observado", "Contenido de \`eval/fixtures/\`; no hay pacientes reales.")}

## 5. Methodology

1. Cargar fixtures de texto.
2. Warmup del adaptador (si QVAC).
3. Por caso: \`structure({ transcript })\` con la transcripción gold.
4. Puntuar presencia, invención léxica (\`must_not_contain\`), \`mustInclude\`, IDs de fuente, latencia.
5. Escribir \`run.json\` + derivados; permitir \`--replay\` sin GPU.

${evidence("Observado", "Flujo del runner. No es un ensayo clínico.")}

## 6. Speech-to-text Results

| Métrica | Valor |
| --- | ---: |
| WER | N/A |
| CER | N/A |
| Estado | ${s.stt.status} |

${evidence("No probado", s.stt.reason)}

## 7. Classification Results

Clasificación = **presencia por sección I4** (gold vs nota de producto post-normalización).

| Métrica | Valor |
| --- | ---: |
| Accuracy | ${pct(s.presence.correct, s.presence.total)} |
| Macro-F1 | ${fmt(s.presence.macroF1, 3)} |

| Clase | Precision | Recall | F1 | Support |
| --- | ---: | ---: | ---: | ---: |
${classRows}

Matriz de confusión (filas = gold, columnas = predicted):

| gold \\ pred | STATED | NOT_STATED | UNKNOWN |
| --- | ---: | ---: | ---: |
${matrixRows}

${evidence("Medido", "Contadores de esta corrida. F1 = null si la clase no tiene soporte ni predicciones.")}
${evidence("Observado", "\`normalizeStructuringOutput\` del producto convierte texto en STATED y no preserva UNKNOWN del modelo; la matriz mide el producto.")}

## 8. End-to-end Results

E2E de Capa A = texto gold → estructuración → nota.

| Métrica | Valor |
| --- | ---: |
| Product emitted rate | ${productOk === null ? "N/A" : pct(productOk, s.cases)} |
| Raw JSON valid rate | ${s.rawJsonValidRate === null ? "N/A" : fmt(s.rawJsonValidRate, 3)} |
| Invention case rate | ${pct(s.invention.casesWithHits, s.cases)} |
| mustInclude coverage | ${
    s.mustIncludeCoverage === null ? "N/A" : pct(s.mustIncludeHits, s.mustIncludeTotal)
  } |
| STATED without sourceSegmentIds (count) | ${s.statedWithoutSource} |
| Cases with invalid source IDs | ${s.sourceIdFailureCases} |

${evidence("Medido", "Derivado de outputs y gold. mustInclude es léxico; paráfrasis válidas pueden fallar.")}
${evidence("No probado", "Fidelidad semántica de citas y pipeline audio→nota.")}

## 9. Latency

| Stat | ms |
| --- | ---: |
| n (éxitos) | ${s.latency.samples} |
| p50 | ${fmt(s.latency.p50)} |
| p95 | ${fmt(s.latency.p95)} |
| p99 | ${fmt(s.latency.p99)} |
| mean | ${fmt(s.latency.mean)} |
| min | ${fmt(s.latency.min)} |
| max | ${fmt(s.latency.max)} |

Warmup excluido. Percentiles con interpolación lineal.

${evidence("Medido", "Wall-clock de \`structure()\` por caso exitoso.")}

## 10. Error Analysis

Fallos de adaptador: **${s.errors}**. Casos con invención léxica: **${s.invention.casesWithHits}**. Fallos de IDs de fuente: **${s.sourceIdFailureCases}**.

${evidence("Medido", "Conteos del agregador. Sin atribución causal inventada.")}

## 11. Failure Cases

| Caso | ms | Presence | Invención | Resultado |
| --- | ---: | ---: | --- | --- |
${caseRows}

Detalle en \`errors.json\` / \`cases.json\`.

## 12. Reproducibility

\`\`\`bash
pnpm eval:self-check
pnpm eval -- --skip-stt
pnpm eval -- --adapter heuristic
pnpm eval -- --replay reports/${m.runId}/run.json
\`\`\`

Hashes de fuentes: ver \`metadata.sourceHashes\` en \`run.json\`.

${evidence("Observado", "Comandos del package.json raíz.")}

## 13. Limitations

- Sin audio: WER/CER no medidos.
- \`mustInclude\` / \`must_not_contain\` son léxicos.
- Gold de un solo anotador en esta etapa.
- Una corrida no estima estabilidad multi-máquina.
- El producto normaliza presencia de forma permisiva.

${evidence("Observado", "Límites del diseño de Capa A.")}

## 14. Conclusions

${
  s.cases === 0 || (s.errors === s.cases && s.latency.samples === 0)
    ? evidence("No probado", "No hay baseline numérico utilizable (corrida vacía o bloqueada).")
    : evidence(
        "Inferido",
        "Las cifras anteriores describen solo esta configuración, dataset y máquina. No justifican claims clínicos de producto ni optimizaciones.",
      )
}

No optimizar a partir de este informe sin autorización explícita.
`
}
