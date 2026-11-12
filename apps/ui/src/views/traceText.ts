import type { Lang } from "../i18n.js";

/**
 * Traceability's labels in English and Spanish (draft-traceability, REQ-034).
 * Spanish is typed against English: a label missing in one does not compile.
 */
const en = {
  "trace.title": "Traceability",
  "trace.sub": "Each requirement → its scenario → its test → the code that passes it",
  "trace.help": "Where this table comes from",
  "trace.filter": "Filter by REQ, module, file…",
  "trace.filterLabel": "Filter",
  "trace.filters": "Filters",
  "trace.f.all": "All · {n}",
  "trace.f.gaps": "Gaps · {n}",
  "trace.f.noTest": "Without a test · {n}",
  "trace.f.waiting": "Waiting for an answer · {n}",
  "trace.keeps": "{n} rows",
  "trace.keepsOne": "1 row",
  "trace.withTest": "Scenarios with a test",
  "trace.of": "of {n}",
  "trace.gaps": "Gaps",
  "trace.c.req": "REQUIREMENT",
  "trace.c.scn": "SCENARIO",
  "trace.c.feature": "FEATURE",
  "trace.c.test": "TEST",
  "trace.c.code": "CODE",
  "trace.c.status": "STATUS",
  "trace.noScenario": "no scenario",
  "trace.noTest": "— no test names it",
  "trace.noFeature": "— no feature",
  "trace.none": "—",
  "trace.lacks": "Lacks {what}",
  "trace.lack.feature": "a feature",
  "trace.lack.test": "a test",
  "trace.lack.code": "code",
  "trace.and": " and ",
  "trace.waits": "waits for {q}",
  "trace.waitsNone": "waits for an answer",
  "trace.fix": "Fix",
  "trace.fixOn": "Fix {scenario}: propose its missing test",
  "trace.foot":
    "Read from `specgate matrix --json`: one row per scenario, with the tests that name each REQ and SCN. «Fix» opens the scenario and proposes the missing test; nothing is written without your confirmation.",
  "trace.empty": "No row matches.",
  "trace.unavailable":
    "Traceability needs specgate 0.34.0 or later: from that version `specgate matrix --json` lists one row per scenario. Update with `npm install -D @rsaglobaltech/specgate@latest`.",
  "trace.rowsShown": "{n} scenarios",
  "proposal.none":
    "«Fix», on a row without a test, proposes the missing test here. Nothing is written until you confirm.",
  "proposal.eyebrow": "PROPOSED TEST · NOTHING WRITTEN YET",
  "proposal.agentEyebrow": "THE AGENT'S TEST · NOTHING WRITTEN YET",
  "proposal.from": "From {scenario} of {feature} · no agent · no cost",
  "proposal.write": "Write the test",
  "proposal.ask": "Ask the agent",
  "proposal.asking": "The agent is completing the test…",
  "proposal.cancel": "Cancel",
  "proposal.writeAgent": "Write the agent's test",
  "proposal.back": "Back to the skeleton",
  "proposal.fixHelp": "What Fix does",
  "proposal.askHelp": "What Ask the agent does",
  "proposal.diff": "The agent's test against the skeleton",
  "proposal.usage": "{tokens} tokens · {cost}",
  "proposal.usageNoCost": "{tokens} tokens · cost not reported",
  "proposal.noUsage": "tokens and cost not reported",
  "proposal.noAgent": "No agent is set: `specgate agents init --tool claude` sets one.",
  "proposal.agentIs": "Agent: {agent}",
  "proposal.left": "specgate left the test out of the agent's plan:",
  "proposal.keep": "The skeleton is still here to write yourself.",
} as const;

export type TraceKey = keyof typeof en;

const es: Record<TraceKey, string> = {
  "trace.title": "Trazabilidad",
  "trace.sub": "Cada requisito → su escenario → su prueba → el código que la pasa",
  "trace.help": "De dónde sale esta tabla",
  "trace.filter": "Filtrar por REQ, módulo, archivo…",
  "trace.filterLabel": "Filtrar",
  "trace.filters": "Filtros",
  "trace.f.all": "Todos · {n}",
  "trace.f.gaps": "Huecos · {n}",
  "trace.f.noTest": "Sin prueba · {n}",
  "trace.f.waiting": "Esperan respuesta · {n}",
  "trace.keeps": "{n} filas",
  "trace.keepsOne": "1 fila",
  "trace.withTest": "Escenarios con prueba",
  "trace.of": "de {n}",
  "trace.gaps": "Huecos",
  "trace.c.req": "REQUISITO",
  "trace.c.scn": "ESCENARIO",
  "trace.c.feature": "FEATURE",
  "trace.c.test": "PRUEBA",
  "trace.c.code": "CÓDIGO",
  "trace.c.status": "ESTADO",
  "trace.noScenario": "sin escenario",
  "trace.noTest": "— ninguna prueba lo nombra",
  "trace.noFeature": "— sin feature",
  "trace.none": "—",
  "trace.lacks": "Falta {what}",
  "trace.lack.feature": "la feature",
  "trace.lack.test": "prueba",
  "trace.lack.code": "código",
  "trace.and": " y ",
  "trace.waits": "espera {q}",
  "trace.waitsNone": "espera respuesta",
  "trace.fix": "Arreglar",
  "trace.fixOn": "Arreglar {scenario}: proponer la prueba que falta",
  "trace.foot":
    "Se lee de `specgate matrix --json`: una fila por escenario, con las pruebas que nombran cada REQ y SCN. «Arreglar» abre el escenario y te propone la prueba que falta; nada se escribe sin tu confirmación.",
  "trace.empty": "Ninguna fila coincide.",
  "trace.unavailable":
    "Trazabilidad necesita specgate 0.34.0 o posterior: desde esa versión `specgate matrix --json` da una fila por escenario. Actualiza con `npm install -D @rsaglobaltech/specgate@latest`.",
  "trace.rowsShown": "{n} escenarios",
  "proposal.none":
    "«Arreglar», en una fila sin prueba, te propone aquí la prueba que falta. Nada se escribe hasta que confirmas.",
  "proposal.eyebrow": "PRUEBA PROPUESTA · NADA ESCRITO AÚN",
  "proposal.agentEyebrow": "LA PRUEBA DEL AGENTE · NADA ESCRITO AÚN",
  "proposal.from": "Desde {scenario} de {feature} · sin agente · sin coste",
  "proposal.write": "Escribir la prueba",
  "proposal.ask": "Pedir al agente",
  "proposal.asking": "El agente está completando la prueba…",
  "proposal.cancel": "Cancelar",
  "proposal.writeAgent": "Escribir la prueba del agente",
  "proposal.back": "Volver al esqueleto",
  "proposal.fixHelp": "Qué hace Arreglar",
  "proposal.askHelp": "Qué hace Pedir al agente",
  "proposal.diff": "La prueba del agente frente al esqueleto",
  "proposal.usage": "{tokens} tokens · {cost}",
  "proposal.usageNoCost": "{tokens} tokens · coste no informado",
  "proposal.noUsage": "tokens y coste no informados",
  "proposal.noAgent": "No hay agente: `specgate agents init --tool claude` lo configura.",
  "proposal.agentIs": "Agente: {agent}",
  "proposal.left": "specgate dejó la prueba fuera del plan del agente:",
  "proposal.keep": "El esqueleto sigue aquí para que lo escribas tú.",
};

const TEXT: Record<Lang, Record<TraceKey, string>> = { en, es };

/** A label of Traceability in a language, `{name}` filled from `vars`. */
export function tt(lang: Lang, key: TraceKey, vars: Record<string, string | number> = {}): string {
  return TEXT[lang][key].replace(/\{(\w+)\}/g, (_, n: string) => String(vars[n] ?? `{${n}}`));
}

/** A cost as the studio says it: `0,03 $` in Spanish, `$0.03` in English. */
export function costShown(cost: number, lang: Lang): string {
  const v = cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2);
  return lang === "es" ? `${v.replace(".", ",")} $` : `$${v}`;
}
