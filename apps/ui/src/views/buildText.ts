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
  "build.button": "Build",
  "build.started": "{req} is building on its own branch.",
  "build.queued": "{req} is queued: it builds when the build running now ends.",
  "build.openLive": "Open Live",
  "build.waits.title": "Build waits: {n} uncommitted files that are not the specification",
  "build.waits.why":
    "The agent works on its own branch from the last commit, so it would leave these files out. Commit them, stash them, or ignore them; each runs only after you confirm it.",
  "build.waits.group": "{group} — {n} files",
  "build.commit": "Commit",
  "build.stash": "Stash",
  "build.ignore": "Ignore",
  "build.ignore.unsupported":
    "Not possible yet: specgate 0.33.2's harness refuses to start while any file is uncommitted.",
  "build.confirm.commit": "Commit these {n} files?",
  "build.confirm.stash": "Stash these {n} files?",
  "build.confirm.commitBody":
    "One commit on your current branch with exactly these files, then the build of {req} starts.",
  "build.confirm.stashBody":
    "They leave your working copy for git's stash (`git stash pop` brings them back), then the build of {req} starts.",
  "build.message": "Commit message",
  "build.confirm": "Confirm",
  "build.cancel": "Cancel",
  "live.intro":
    "What the agent does while it builds: each requirement's steps with their time, its output as it writes it, what is queued, and what it has cost. Read from the harness's events in .harness/events/; every open tab sees the same.",
  "live.building": "Building {req}",
  "live.idle": "No build is running.",
  "live.queue": "Queued",
  "live.queueEmpty": "nothing queued",
  "live.cost": "Cost so far",
  "live.noCost": "not reported yet",
  "live.tokens": "Tokens",
  "live.tokensText": "{input} in · {output} out · {cache} from cache",
  "live.steps": "Steps",
  "live.output": "The agent's output",
  "live.noOutput": "Nothing written yet.",
  "live.running": "running {s} s",
  "live.agent": "the agent is working",
  "live.attempt": "attempt {n}",
  "live.state.running": "building",
  "live.state.pass": "passed",
  "live.state.fail": "failed",
  "live.state.question": "asked a question",
  "live.state.stopped": "stopped",
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
  "build.button": "Construir",
  "build.started": "{req} se está construyendo en su propia rama.",
  "build.queued": "{req} está en cola: se construye cuando termine la construcción en marcha.",
  "build.openLive": "Abrir En vivo",
  "build.waits.title": "Construir espera: {n} archivos sin commit que no son la especificación",
  "build.waits.why":
    "El agente trabaja en su propia rama desde el último commit, así que dejaría fuera estos archivos. Haz commit, guárdalos en el stash o ignóralos; cada opción se ejecuta solo después de que la confirmes.",
  "build.waits.group": "{group} — {n} archivos",
  "build.commit": "Commit",
  "build.stash": "Stash",
  "build.ignore": "Ignorar",
  "build.ignore.unsupported":
    "Aún no es posible: el harness de specgate 0.33.2 se niega a empezar mientras haya archivos sin commit.",
  "build.confirm.commit": "¿Hacer commit de estos {n} archivos?",
  "build.confirm.stash": "¿Guardar estos {n} archivos en el stash?",
  "build.confirm.commitBody":
    "Un commit en tu rama actual con exactamente estos archivos; después empieza la construcción de {req}.",
  "build.confirm.stashBody":
    "Salen de tu copia de trabajo al stash de git (`git stash pop` los devuelve); después empieza la construcción de {req}.",
  "build.message": "Mensaje del commit",
  "build.confirm": "Confirmar",
  "build.cancel": "Cancelar",
  "live.intro":
    "Lo que hace el agente mientras construye: los pasos de cada requisito con su tiempo, su salida según la escribe, lo que está en cola y lo que ha costado. Se lee de los eventos del harness en .harness/events/; todas las pestañas abiertas ven lo mismo.",
  "live.building": "Construyendo {req}",
  "live.idle": "No hay ninguna construcción en marcha.",
  "live.queue": "En cola",
  "live.queueEmpty": "nada en cola",
  "live.cost": "Coste hasta ahora",
  "live.noCost": "aún sin informar",
  "live.tokens": "Tokens",
  "live.tokensText": "{input} de entrada · {output} de salida · {cache} de caché",
  "live.steps": "Pasos",
  "live.output": "La salida del agente",
  "live.noOutput": "Aún no ha escrito nada.",
  "live.running": "en marcha {s} s",
  "live.agent": "el agente está trabajando",
  "live.attempt": "intento {n}",
  "live.state.running": "construyendo",
  "live.state.pass": "pasó",
  "live.state.fail": "falló",
  "live.state.question": "hizo una pregunta",
  "live.state.stopped": "detenido",
};

export type BuildTextKey = keyof typeof en;

const TEXT: Record<Lang, Record<BuildTextKey, string>> = { en, es };

/** A label of Build or Live in a language, with `{name}` filled from `vars`. */
export function bt(lang: Lang, key: BuildTextKey, vars: Record<string, string | number> = {}) {
  return TEXT[lang][key].replace(/\{(\w+)\}/g, (_, n: string) => String(vars[n] ?? `{${n}}`));
}
