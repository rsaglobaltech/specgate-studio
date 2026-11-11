import type { Lang } from "../i18n.js";

/**
 * Build and Live's labels in English and Spanish (draft-build-live, REQ-034).
 * Spanish is typed against English: a label missing in one does not compile.
 */
const en = {
  "build.intro":
    "What is ready to build: approved, with its scenario, and no open question blocking it. The agent builds each one on its own branch from the last commit.",
  "build.unreadable": "specgate could not list what is ready.",
  "build.ready": "Ready to build ({n})",
  "build.noneReady": "Nothing is ready to build.",
  "build.waiting": "Not ready yet ({n})",
  "build.why.question": "waits for the answer to {q}",
  "build.why.review": "waits for a person to approve {change}",
  "build.why.scenario": "has no scenario yet",
  "build.agent": "Who codes",
  "build.noAgent": "No agent is set: Build cannot run one yet.",
  "build.setAgent": "Set one with",
  "build.estimate": "Estimate",
  "build.estimateEach": "about {minutes} min",
  "build.estimateCost": "about ${cost}",
  "build.estimateFrom": "specgate's average over {runs} past builds (harness report)",
  "build.noEstimate": "no estimate yet: no build has run here",
  "build.req": "Build {req}",
  "build.feature": "Build a requirement",
};

const es: Record<keyof typeof en, string> = {
  "build.intro":
    "Lo que está listo para construir: aprobado, con su escenario y sin pregunta abierta que lo bloquee. El agente construye cada uno en su propia rama desde el último commit.",
  "build.unreadable": "specgate no pudo listar lo que está listo.",
  "build.ready": "Listo para construir ({n})",
  "build.noneReady": "No hay nada listo para construir.",
  "build.waiting": "Aún no está listo ({n})",
  "build.why.question": "espera la respuesta a {q}",
  "build.why.review": "espera a que una persona apruebe {change}",
  "build.why.scenario": "aún no tiene escenario",
  "build.agent": "Quién programa",
  "build.noAgent": "No hay agente fijado: Construir aún no puede ejecutar ninguno.",
  "build.setAgent": "Fíjalo con",
  "build.estimate": "Estimación",
  "build.estimateEach": "unos {minutes} min",
  "build.estimateCost": "unos ${cost}",
  "build.estimateFrom":
    "la media de specgate sobre {runs} construcciones anteriores (harness report)",
  "build.noEstimate": "aún sin estimación: no se ha construido nada aquí",
  "build.req": "Construir {req}",
  "build.feature": "Construir un requisito",
};

export type BuildTextKey = keyof typeof en;

const TEXT: Record<Lang, Record<BuildTextKey, string>> = { en, es };

/** A label of Build or Live in a language, with `{name}` filled from `vars`. */
export function bt(lang: Lang, key: BuildTextKey, vars: Record<string, string | number> = {}) {
  return TEXT[lang][key].replace(/\{(\w+)\}/g, (_, n: string) => String(vars[n] ?? `{${n}}`));
}
