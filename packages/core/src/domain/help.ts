import type { Finding } from "./finding.js";

/**
 * What every action of the studio that writes, runs, commits, pushes or sends
 * says about itself (draft-help, A3): the five parts of its "?" (REQ-061,
 * REQ-062) and the notice when it ends (REQ-063, REQ-064), in English and
 * Spanish (REQ-065). Data the UI renders; opening a "?" runs nothing (A2).
 */

export type Lang = "en" | "es";
export const LANGS: readonly Lang[] = ["en", "es"];

export const ACTIONS = [
  "check",
  "build",
  "apply",
  "archive",
  "archive-preview",
  "ask-change",
  "answer",
  "answer-reviewed",
  "propose",
  "propose-brief",
  "propose-ticket",
  "config-set",
  "init",
  "adopt",
  "agents-init",
  "ci-init",
] as const;
export type ActionId = (typeof ACTIONS)[number];

/** The five parts, in the order the "?" shows them (A1). */
export interface Explanation {
  does: string;
  command: string;
  files: string;
  doesNot: string;
  next: string;
}

/** What a notice says beyond the command and its outcome. */
interface NoticeText {
  /** What ran, when it passed: the command is `{command}`. */
  ranOk: string;
  /** The next step, as a command. */
  next: string;
  /** Said after what was written, when it passed. */
  after?: string;
}

export type Catalog = Record<ActionId, Partial<Record<Lang, Explanation & { notice: NoticeText }>>>;

export const PART_LABELS: Record<Lang, Record<keyof Explanation, string>> = {
  en: {
    does: "What it does",
    command: "Command",
    files: "Files it changes",
    doesNot: "What it does not do",
    next: "Next",
  },
  es: {
    does: "Qué hace",
    command: "Comando",
    files: "Archivos que cambia",
    doesNot: "Qué no hace",
    next: "Siguiente",
  },
};

export const HELP: Catalog = {
  check: {
    en: {
      does: "Checks the gate: the specification is valid, every requirement links to its feature and test, the architecture rules hold, and the project's tests pass.",
      command: "specgate check",
      files: "None: no file is changed.",
      doesNot: "It does not commit, push or deliver any requirement.",
      next: "Then `specgate apply {req}` for a requirement whose test passes.",
      notice: {
        ranOk: "`{command}` ran the specification, architecture and tests stages, and passed.",
        next: "specgate apply {req}",
      },
    },
    es: {
      does: "Comprueba el gate: que la especificación es válida, que cada requisito enlaza con su escenario y su test, que se cumplen las reglas de arquitectura y que pasan los tests del proyecto.",
      command: "specgate check",
      files: "Ninguno: no cambia ningún archivo.",
      doesNot: "No hace commit, ni push, ni entrega ningún requisito.",
      next: "Después, `specgate apply {req}` para un requisito cuyo test pasa.",
      notice: {
        ranOk: "`{command}` ejecutó la especificación, la arquitectura y los tests, y pasó.",
        next: "specgate apply {req}",
      },
    },
  },
  build: {
    en: {
      does: "Has the agent build {req} on its own branch: plan, context, code, the gate, until its test passes.",
      command: "specgate harness run --req {req}",
      files:
        "The code and tests the agent may change for {req}, on a new branch; the run's log under `.harness/`.",
      doesNot:
        "It does not push, merge or open a pull request, and it never changes the specification.",
      next: "Then the gate on the branch it opens, and `specgate apply {req}` when it passes.",
      notice: { ranOk: "`{command}` built {req} on its branch.", next: "specgate check" },
    },
    es: {
      does: "Hace que el agente construya {req} en su propia rama: plan, contexto, código y gate, hasta que su test pasa.",
      command: "specgate harness run --req {req}",
      files:
        "El código y los tests que el agente puede cambiar para {req}, en una rama nueva; el registro de la ejecución en `.harness/`.",
      doesNot: "No hace push, ni merge, ni abre un pull request, y nunca cambia la especificación.",
      next: "Después, el gate en la rama que abre, y `specgate apply {req}` cuando pase.",
      notice: { ranOk: "`{command}` construyó {req} en su rama.", next: "specgate check" },
    },
  },
  apply: {
    en: {
      does: "Delivers {req}: runs the gate for it and, when it passes, marks it Implemented.",
      command: "specgate apply {req}",
      files: "The requirement's status in its spec and in `docs/specs/traceability.md`.",
      doesNot: "It does not commit or push; it is refused while no test names {req}.",
      next: "Then the next requirement, or `specgate archive {change}` once all are applied.",
      notice: {
        ranOk: "`{command}` passed the gate and marked {req} Implemented.",
        next: "specgate status",
      },
    },
    es: {
      does: "Entrega {req}: ejecuta su gate y, si pasa, lo marca como Implementado.",
      command: "specgate apply {req}",
      files: "El estado del requisito en su spec y en `docs/specs/traceability.md`.",
      doesNot: "No hace commit ni push; se rechaza mientras ningún test nombre {req}.",
      next: "Después, el siguiente requisito, o `specgate archive {change}` cuando estén todos aplicados.",
      notice: {
        ranOk: "`{command}` pasó el gate y marcó {req} como Implementado.",
        next: "specgate status",
      },
    },
  },
  archive: {
    en: {
      does: "Merges the change {change} into the specification once every requirement in it is applied.",
      command: "specgate archive {change}",
      files:
        "The capability specs, `docs/specs/traceability.md`, `features/`, and the change moved to `docs/specs/changes/archive/`.",
      doesNot:
        "It does not commit or push, and it is refused while a requirement of the change is not applied.",
      next: "Then commit the archive and open its pull request.",
      notice: {
        ranOk: "`{command}` merged {change} into the specification.",
        next: "specgate status",
      },
    },
    es: {
      does: "Fusiona el cambio {change} con la especificación cuando todos sus requisitos están aplicados.",
      command: "specgate archive {change}",
      files:
        "Las specs de capacidad, `docs/specs/traceability.md`, `features/`, y el cambio movido a `docs/specs/changes/archive/`.",
      doesNot:
        "No hace commit ni push, y se rechaza mientras algún requisito del cambio no esté aplicado.",
      next: "Después, haz commit del archivo y abre su pull request.",
      notice: {
        ranOk: "`{command}` fusionó {change} con la especificación.",
        next: "specgate status",
      },
    },
  },
  "archive-preview": {
    en: {
      does: "Shows what archiving {change} would write — the capability specs, the matrix rows and the feature files — before anything is archived.",
      command: "specgate archive {change} --dry-run",
      files: "None: the preview writes nothing.",
      doesNot:
        "It does not archive: the change is archived only when you confirm the preview, and never while a requirement of it is not applied.",
      next: "Confirm the preview to run `specgate archive {change}`.",
      notice: {
        ranOk: "`{command}` previewed the archive of {change}.",
        next: "specgate archive {change}",
      },
    },
    es: {
      does: "Muestra lo que escribiría archivar {change} — las specs de capacidad, las filas de la matriz y los archivos de features — antes de archivar nada.",
      command: "specgate archive {change} --dry-run",
      files: "Ninguno: la vista previa no escribe nada.",
      doesNot:
        "No archiva: el cambio se archiva solo cuando confirmas la vista previa, y nunca mientras alguno de sus requisitos no esté aplicado.",
      next: "Confirma la vista previa para ejecutar `specgate archive {change}`.",
      notice: {
        ranOk: "`{command}` mostró la vista previa del archivo de {change}.",
        next: "specgate archive {change}",
      },
    },
  },
  "ask-change": {
    en: {
      does: "Sends your request about the draft to its author, for the next time it is drafted.",
      command: 'specgate change note {change} "<request>"',
      files: "`docs/specs/changes/{change}/review.md`, where the request is written.",
      doesNot:
        "It does not change the draft's requirements now: the draft changes only when it is drafted again.",
      next: "The draft is drafted again with `specgate propose --from-brief {module}`.",
      notice: {
        ranOk: "`{command}` wrote your request.",
        next: "specgate propose --from-brief {module}",
        after: "The draft's requirements are unchanged until it is drafted again.",
      },
    },
    es: {
      does: "Envía tu petición sobre el borrador a quien lo redacta, para la próxima vez que se redacte.",
      command: 'specgate change note {change} "<petición>"',
      files: "`docs/specs/changes/{change}/review.md`, donde se escribe la petición.",
      doesNot:
        "No cambia ahora los requisitos del borrador: el borrador cambia solo cuando se vuelve a redactar.",
      next: "El borrador se vuelve a redactar con `specgate propose --from-brief {module}`.",
      notice: {
        ranOk: "`{command}` escribió tu petición.",
        next: "specgate propose --from-brief {module}",
        after: "Los requisitos del borrador no cambian hasta que se vuelva a redactar.",
      },
    },
  },
  answer: {
    en: {
      does: "Answers the question {q} of {change}, so the requirements it blocks can go on.",
      command: 'specgate answer {q} "<answer>" --change {change}',
      files: "The change's `questions.md` and `assumptions.md`.",
      doesNot:
        "It does not rewrite the requirements: they are revised to say the answer before it is marked reviewed.",
      next: "Revise the requirements it blocks, then `specgate answer {q} --reviewed --change {change}`.",
      notice: {
        ranOk: "`{command}` recorded the answer.",
        next: "specgate answer {q} --reviewed --change {change}",
      },
    },
    es: {
      does: "Responde la pregunta {q} de {change}, para que los requisitos que bloquea puedan seguir.",
      command: 'specgate answer {q} "<respuesta>" --change {change}',
      files: "El `questions.md` y el `assumptions.md` del cambio.",
      doesNot:
        "No reescribe los requisitos: se revisan para que digan la respuesta antes de marcarla revisada.",
      next: "Revisa los requisitos que bloquea y después `specgate answer {q} --reviewed --change {change}`.",
      notice: {
        ranOk: "`{command}` guardó la respuesta.",
        next: "specgate answer {q} --reviewed --change {change}",
      },
    },
  },
  "answer-reviewed": {
    en: {
      does: "Confirms that the specification says the answer to {q} of {change}: the answer is marked reviewed, and the requirements it blocked leave Needs Clarification.",
      command: "specgate answer {q} --reviewed --change {change}",
      files:
        "The change's `questions.md` and `assumptions.md`, and the status of each requirement it blocked where that requirement is defined.",
      doesNot:
        "It does not change a requirement's text: revise it to say the answer first, in the editor or with a redraft.",
      next: "Build the requirements it blocked: `specgate status` names the next one.",
      notice: {
        ranOk: "`{command}` marked the answer reviewed.",
        next: "specgate status",
        after: "The requirements it blocked no longer wait for an answer.",
      },
    },
    es: {
      does: "Confirma que la especificación dice la respuesta a {q} de {change}: la respuesta queda revisada y los requisitos que bloqueaba salen de Needs Clarification.",
      command: "specgate answer {q} --reviewed --change {change}",
      files:
        "El `questions.md` y el `assumptions.md` del cambio, y el estado de cada requisito que bloqueaba, donde está definido.",
      doesNot:
        "No cambia el texto de ningún requisito: revísalo antes para que diga la respuesta, en el editor o redactándolo de nuevo.",
      next: "Construye los requisitos que bloqueaba: `specgate status` dice el siguiente.",
      notice: {
        ranOk: "`{command}` marcó la respuesta como revisada.",
        next: "specgate status",
        after: "Los requisitos que bloqueaba ya no esperan una respuesta.",
      },
    },
  },
  propose: {
    en: {
      does: "Opens the change {change}: a proposal, a delta to write and a reserved range of requirement ids.",
      command: "specgate propose {change}",
      files: "`docs/specs/changes/{change}/`: change.yaml, proposal.md, tasks.md and the delta.",
      doesNot: "It does not write the requirements, commit or push.",
      next: "Write the delta, then `specgate change validate {change}`.",
      notice: {
        ranOk: "`{command}` opened the change.",
        next: "specgate change validate {change}",
      },
    },
    es: {
      does: "Abre el cambio {change}: una propuesta, un delta por escribir y un rango reservado de ids de requisito.",
      command: "specgate propose {change}",
      files: "`docs/specs/changes/{change}/`: change.yaml, proposal.md, tasks.md y el delta.",
      doesNot: "No escribe los requisitos, ni hace commit ni push.",
      next: "Escribe el delta y después `specgate change validate {change}`.",
      notice: { ranOk: "`{command}` abrió el cambio.", next: "specgate change validate {change}" },
    },
  },
  "propose-brief": {
    en: {
      does: "Opens the draft of the module {module} of the brief, or checks it until it is ready to review.",
      command: "specgate propose --from-brief {module}",
      files:
        "`docs/specs/changes/draft-{module}/`: DRAFTING.md, the delta, assumptions and questions.",
      doesNot: "It does not approve or build the draft; a person reviews it.",
      next: "Write the draft as DRAFTING.md says, and run it again until it says Ready to review.",
      notice: {
        ranOk: "`{command}` opened or checked the draft.",
        next: "specgate propose --from-brief {module}",
      },
    },
    es: {
      does: "Abre el borrador del módulo {module} del brief, o lo comprueba hasta que esté listo para revisar.",
      command: "specgate propose --from-brief {module}",
      files:
        "`docs/specs/changes/draft-{module}/`: DRAFTING.md, el delta, los supuestos y las preguntas.",
      doesNot: "No aprueba ni construye el borrador; lo revisa una persona.",
      next: "Redacta el borrador como dice DRAFTING.md y vuelve a ejecutarlo hasta que diga Ready to review.",
      notice: {
        ranOk: "`{command}` abrió o comprobó el borrador.",
        next: "specgate propose --from-brief {module}",
      },
    },
  },
  "propose-ticket": {
    en: {
      does: "Opens a change from the ticket {key}, after you reviewed what specgate read from it: on the ticket's branch — the one you are on when it names {key}, else a new one — with the opening committed there.",
      command: "specgate propose --from-ticket {key}",
      files:
        "`docs/specs/changes/<change>/` with the ticket's text in `ticket.md`; a commit of that folder on the ticket's branch, and the branch pushed to origin unless you choose Don't push yet (`--no-push`).",
      doesNot:
        "It runs nothing before you confirm; it does not write to the ticket, move it on the board or build anything.",
      next: "Write the delta from the ticket, then `specgate propose --from-ticket {key}` until it says Ready to review.",
      notice: {
        ranOk: "`{command}` opened a change from {key}.",
        next: "specgate propose --from-ticket {key}",
      },
    },
    es: {
      does: "Abre un cambio desde el ticket {key}, después de que revises lo que specgate leyó de él: en la rama del ticket — en la que estás si nombra {key}, si no en una nueva — con la apertura en un commit allí.",
      command: "specgate propose --from-ticket {key}",
      files:
        "`docs/specs/changes/<cambio>/` con el texto del ticket en `ticket.md`; un commit de esa carpeta en la rama del ticket, y la rama enviada a origin salvo que elijas No hacer push todavía (`--no-push`).",
      doesNot:
        "No ejecuta nada antes de que confirmes; no escribe en el ticket, no lo mueve en el tablero y no construye nada.",
      next: "Escribe el delta desde el ticket y después `specgate propose --from-ticket {key}` hasta que diga Ready to review.",
      notice: {
        ranOk: "`{command}` abrió un cambio desde {key}.",
        next: "specgate propose --from-ticket {key}",
      },
    },
  },
  "config-set": {
    en: {
      does: "Sets the project setting {key} for specgate and the studio.",
      command: 'specgate config set {key} "<value>"',
      files: "`specgate.config.yaml` (or the file that holds the setting).",
      doesNot: "It does not run the command it configures.",
      next: "Then `specgate check` to see the gate with it.",
      notice: { ranOk: "`{command}` saved the setting.", next: "specgate check" },
    },
    es: {
      does: "Fija el ajuste {key} del proyecto para specgate y el studio.",
      command: 'specgate config set {key} "<valor>"',
      files: "`specgate.config.yaml` (o el archivo que guarda el ajuste).",
      doesNot: "No ejecuta el comando que configura.",
      next: "Después, `specgate check` para ver el gate con él.",
      notice: { ranOk: "`{command}` guardó el ajuste.", next: "specgate check" },
    },
  },
  init: {
    en: {
      does: "Creates the specgate project in this folder from your five answers: the specification, the traceability matrix, AGENTS.md and the spec gate. It is built in a folder of the studio's and moved here, so nothing in this folder is overwritten; then the agent you chose is wired in with `specgate agents init`.",
      command: "specgate init --config <your answers> --yes",
      files:
        "`spec.md`, `docs/specs/`, `features/`, `AGENTS.md`, `README.md`, the spec gate in `.github/workflows/`, and `harness.config.yaml` for the agent.",
      doesNot: "It does not write code, commit or push.",
      next: "Then set what the readiness list says is not ready yet.",
      notice: {
        ranOk: "`{command}` created the project.",
        next: "specgate status",
        after: "The readiness list says what is set and what is not.",
      },
    },
    es: {
      does: "Crea el proyecto specgate en esta carpeta con tus cinco respuestas: la especificación, la matriz de trazabilidad, AGENTS.md y el gate. Se construye en una carpeta del studio y se mueve aquí, así que no se sobrescribe nada de esta carpeta; después se conecta el agente que elegiste con `specgate agents init`.",
      command: "specgate init --config <tus respuestas> --yes",
      files:
        "`spec.md`, `docs/specs/`, `features/`, `AGENTS.md`, `README.md`, el gate en `.github/workflows/` y `harness.config.yaml` para el agente.",
      doesNot: "No escribe código, ni hace commit ni push.",
      next: "Después, fija lo que la lista de preparación dice que aún no está listo.",
      notice: {
        ranOk: "`{command}` creó el proyecto.",
        next: "specgate status",
        after: "La lista de preparación dice qué está fijado y qué no.",
      },
    },
  },
  adopt: {
    en: {
      does: "Adopts this folder in place: writes the specification, the traceability matrix, AGENTS.md and the spec gate beside your code, the areas it finds as a map in `docs/specs/adoption.md`, and saves the test command and agent the preview shows.",
      command: "specgate adopt --yes",
      files: "Only the files of the preview: never one that exists, never a line of your code.",
      doesNot: "It does not turn the areas into requirements, commit or push.",
      next: 'Then specify a behaviour you rely on: `specgate new "<behaviour>"`.',
      notice: {
        ranOk: "`{command}` adopted the folder.",
        next: 'specgate new "<a behaviour you rely on>"',
        after: "The readiness list says what is set and what is not.",
      },
    },
    es: {
      does: "Adopta esta carpeta tal cual: escribe la especificación, la matriz de trazabilidad, AGENTS.md y el gate junto a tu código, las áreas que encuentra como un mapa en `docs/specs/adoption.md`, y guarda el comando de tests y el agente que muestra la vista previa.",
      command: "specgate adopt --yes",
      files:
        "Solo los archivos de la vista previa: nunca uno que ya existe, nunca una línea de tu código.",
      doesNot: "No convierte las áreas en requisitos, ni hace commit ni push.",
      next: 'Después, especifica un comportamiento que ya usas: `specgate new "<comportamiento>"`.',
      notice: {
        ranOk: "`{command}` adoptó la carpeta.",
        next: 'specgate new "<un comportamiento que ya usas>"',
        after: "La lista de preparación dice qué está fijado y qué no.",
      },
    },
  },
  "agents-init": {
    en: {
      does: "Wires the agent you choose into the project: its /specgate commands and, for Claude Code, the command Build runs it with.",
      command: "specgate agents init --tool <tool>",
      files: "The agent's command files (e.g. `.claude/commands/`) and `harness.config.yaml`.",
      doesNot: "It does not run the agent, commit or push.",
      next: "Then Build can run the agent for a requirement.",
      notice: { ranOk: "`{command}` wired the agent in.", next: "specgate status" },
    },
    es: {
      does: "Conecta el agente que eliges al proyecto: sus comandos /specgate y, para Claude Code, el comando con el que Construir lo ejecuta.",
      command: "specgate agents init --tool <herramienta>",
      files:
        "Los archivos de comandos del agente (p. ej. `.claude/commands/`) y `harness.config.yaml`.",
      doesNot: "No ejecuta el agente, ni hace commit ni push.",
      next: "Después, Construir puede ejecutar el agente para un requisito.",
      notice: { ranOk: "`{command}` conectó el agente.", next: "specgate status" },
    },
  },
  "ci-init": {
    en: {
      does: "Writes the spec gate for your CI: it runs the specification, the tests and the architecture check on every push.",
      command: "specgate ci init",
      files: "`.github/workflows/spec-gate.yml` (or your provider's CI file).",
      doesNot: "It does not push it or run it.",
      next: "Then commit it, and `specgate ci status` says what it checks.",
      notice: { ranOk: "`{command}` wrote the spec gate.", next: "specgate ci status" },
    },
    es: {
      does: "Escribe el gate para tu CI: ejecuta la especificación, los tests y la comprobación de arquitectura en cada push.",
      command: "specgate ci init",
      files: "`.github/workflows/spec-gate.yml` (o el archivo de CI de tu proveedor).",
      doesNot: "No lo sube ni lo ejecuta.",
      next: "Después, haz commit de él, y `specgate ci status` dice qué comprueba.",
      notice: { ranOk: "`{command}` escribió el gate.", next: "specgate ci status" },
    },
  },
};

/** What a placeholder reads as when the action has no value for it yet. */
const UNSET: Record<string, string> = {
  req: "<REQ>",
  change: "<change>",
  module: "<module>",
  key: "<KEY>",
  q: "<Q>",
  command: "<command>",
};

export type HelpVars = Partial<Record<"req" | "change" | "module" | "key" | "q", string>>;

function fill(text: string, vars: Record<string, string | undefined>): string {
  return text.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? UNSET[name] ?? `{${name}}`);
}

/** The "?" of an action, filled with what the person is looking at (REQ-061, REQ-062). */
export function explain(action: ActionId, lang: Lang, vars: HelpVars = {}): Explanation {
  const e = HELP[action][lang] ?? HELP[action].en!;
  const command = fill(e.command, vars);
  const all = { ...vars, command };
  return {
    does: fill(e.does, all),
    command,
    files: fill(e.files, all),
    doesNot: fill(e.doesNot, all),
    next: fill(e.next, all),
  };
}

/** Every action and language whose explanation or notice is missing or blank (REQ-065). */
export function missingTranslations(catalog: Catalog): Array<{ action: ActionId; lang: Lang }> {
  const missing: Array<{ action: ActionId; lang: Lang }> = [];
  for (const action of ACTIONS) {
    for (const lang of LANGS) {
      const e = catalog[action]?.[lang];
      const complete =
        e &&
        [e.does, e.command, e.files, e.doesNot, e.next, e.notice?.ranOk, e.notice?.next].every(
          (part) => typeof part === "string" && part.trim() !== "",
        );
      if (!complete) missing.push({ action, lang });
    }
  }
  return missing;
}

/** How an action ended, as the port and the host know it. */
export interface Outcome {
  exitCode: number;
  findings: Finding[];
  /** The files the action wrote, relative to the project. */
  written: string[];
}

export interface Notice {
  tone: "ok" | "refused" | "failed";
  /** The command, and what it did or why it stopped. */
  ran: string;
  /** What it wrote, or that it wrote nothing. */
  wrote: string;
  /** The next step, as a command. */
  next: string;
  /** For a refusal: specgate's fix. */
  fix?: string;
}

const SAY: Record<
  Lang,
  { refused: string; failed: string; wrote: string; none: string; nothing: string }
> = {
  en: {
    refused: "`{command}` was refused with {code}: {message}",
    failed: "`{command}` ended with code {code}.",
    wrote: "It wrote {files}.",
    none: "No file was written.",
    nothing: "Nothing was written.",
  },
  es: {
    refused: "`{command}` se rechazó con {code}: {message}",
    failed: "`{command}` terminó con código {code}.",
    wrote: "Escribió {files}.",
    none: "No se escribió ningún archivo.",
    nothing: "No se escribió nada.",
  },
};

/**
 * The notice when an action ends (REQ-063, REQ-064): the command and what it
 * did, what it wrote or that it wrote nothing, and the next step — never only
 * "done". A refusal carries specgate's finding code and fix (A7).
 */
export function notice(action: ActionId, lang: Lang, vars: HelpVars, outcome: Outcome): Notice {
  const e = HELP[action][lang] ?? HELP[action].en!;
  const command = fill(e.command, vars);
  const all = { ...vars, command };
  const say = SAY[lang];
  const refusal = outcome.findings.find((f) => f.severity === "error");
  if (refusal) {
    return {
      tone: "refused",
      ran: fill(say.refused, { ...all, code: refusal.code, message: refusal.message }),
      wrote: say.nothing,
      next: command,
      ...(refusal.fix ? { fix: refusal.fix } : {}),
    };
  }
  const wrote = outcome.written.length
    ? fill(say.wrote, { files: outcome.written.map((f) => `\`${f}\``).join(", ") })
    : say.none;
  if (outcome.exitCode !== 0) {
    return {
      tone: "failed",
      ran: fill(say.failed, { ...all, code: String(outcome.exitCode) }),
      wrote,
      next: command,
    };
  }
  return {
    tone: "ok",
    ran: fill(e.notice.ranOk, all),
    wrote: e.notice.after ? `${wrote} ${fill(e.notice.after, all)}` : wrote,
    next: fill(e.notice.next, all),
  };
}
