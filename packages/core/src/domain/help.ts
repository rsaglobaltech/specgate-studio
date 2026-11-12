import type { Finding } from "./finding.js";
import { quoted } from "./args.js";

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
  "build-commit",
  "build-stash",
  "build-ignore",
  "build-stop-after",
  "build-stop-now",
  "brief-check",
  "draft-modules",
  "doctor",
  "explorer",
  "file-new",
  "folder-new",
  "file-rename",
  "file-delete",
  "file-delete-permanent",
  "copy-path",
  "open-terminal",
  "folder-open",
  "folder-clone",
  "editor-split",
  "editor-move",
  "group-close",
  "panel-position",
  "panel-maximize",
  "agent-ask",
  "agent-apply",
  "agent-discard",
  "redraft",
  "brief-form",
  "brief-propose",
  "traceability",
  "trace-fix",
  "trace-ask-agent",
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
  /** What did not happen, when it was refused or failed: the notice's headline (REQ-178, A19). */
  failed?: string;
  /** What was dropped when the person cancelled: nothing was written (draft-traceability REQ-123). */
  cancelled?: string;
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
        "The code and tests the agent may change for {req}, on a new branch; the run's log under `.harness/`. Uncommitted specification (spec.md, docs/specs/, features/) is committed first: the agent starts from the last commit.",
      doesNot:
        "It does not push, merge or open a pull request, and it never changes the specification.",
      next: "Then the gate on the branch it opens, and `specgate apply {req}` when it passes.",
      notice: {
        ranOk: "`{command}` built {req} on its branch.",
        next: "specgate check",
        after:
          "Its code and tests are on the branch `harness/{req}`; this working copy is unchanged.",
      },
    },
    es: {
      does: "Hace que el agente construya {req} en su propia rama: plan, contexto, código y gate, hasta que su test pasa.",
      command: "specgate harness run --req {req}",
      files:
        "El código y los tests que el agente puede cambiar para {req}, en una rama nueva; el registro de la ejecución en `.harness/`. La especificación sin commit (spec.md, docs/specs/, features/) se guarda antes en un commit: el agente parte del último commit.",
      doesNot: "No hace push, ni merge, ni abre un pull request, y nunca cambia la especificación.",
      next: "Después, el gate en la rama que abre, y `specgate apply {req}` cuando pase.",
      notice: {
        ranOk: "`{command}` construyó {req} en su rama.",
        next: "specgate check",
        after:
          "Su código y sus tests están en la rama `harness/{req}`; esta copia de trabajo no cambia.",
      },
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
        failed: "{change} was not archived",
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
        failed: "{change} no se archivó",
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
        failed: "{change} was not archived",
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
        failed: "{change} no se archivó",
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
  "build-commit": {
    en: {
      does: "Commits the uncommitted files Build showed, with your message, so the agent's branch — cut from the last commit — includes them; then the build of {req} starts.",
      command: 'git commit -m "<your message>" -- <the files shown>',
      files: "One commit on your current branch with exactly the files shown, grouped by folder.",
      doesNot:
        "It runs nothing before you confirm; it does not push, and it does not commit a file it did not show.",
      next: "Then the build of {req}: `specgate harness run --req {req}`.",
      notice: {
        ranOk: "`{command}` committed the {count} files shown.",
        next: "specgate harness run --req {req}",
      },
    },
    es: {
      does: "Hace commit de los archivos sin commit que mostró Construir, con tu mensaje, para que la rama del agente — cortada desde el último commit — los incluya; después empieza la construcción de {req}.",
      command: 'git commit -m "<tu mensaje>" -- <los archivos mostrados>',
      files:
        "Un commit en tu rama actual con exactamente los archivos mostrados, agrupados por carpeta.",
      doesNot:
        "No ejecuta nada antes de que confirmes; no hace push, y no incluye ningún archivo que no haya mostrado.",
      next: "Después, la construcción de {req}: `specgate harness run --req {req}`.",
      notice: {
        ranOk: "`{command}` hizo commit de los {count} archivos mostrados.",
        next: "specgate harness run --req {req}",
      },
    },
  },
  "build-stash": {
    en: {
      does: "Puts the uncommitted files Build showed aside in git's stash, untracked ones included, so the build of {req} starts from a clean working copy.",
      command: "git stash push --include-untracked",
      files:
        "Your working copy: the files shown leave it and wait in the stash; `git stash pop` brings them back.",
      doesNot: "It runs nothing before you confirm; it does not commit, push or delete your work.",
      next: "Then the build of {req}; bring your work back with `git stash pop` when you want it.",
      notice: {
        ranOk: "`{command}` put the {count} files shown in the stash.",
        next: "git stash pop",
      },
    },
    es: {
      does: "Aparta en el stash de git los archivos sin commit que mostró Construir, incluidos los no versionados, para que la construcción de {req} empiece desde una copia de trabajo limpia.",
      command: "git stash push --include-untracked",
      files:
        "Tu copia de trabajo: los archivos mostrados salen de ella y esperan en el stash; `git stash pop` los devuelve.",
      doesNot:
        "No ejecuta nada antes de que confirmes; no hace commit ni push ni borra tu trabajo.",
      next: "Después, la construcción de {req}; recupera tu trabajo con `git stash pop` cuando lo quieras.",
      notice: {
        ranOk: "`{command}` guardó en el stash los {count} archivos mostrados.",
        next: "git stash pop",
      },
    },
  },
  "build-ignore": {
    en: {
      does: "Builds {req} anyway, from the last commit, once you confirm: the agent's branch leaves the uncommitted files out, and they stay in your working copy as they are.",
      command: "specgate harness run --req {req} --allow-dirty",
      files:
        "None of the files shown: they stay uncommitted. The build's own, on its branch; uncommitted specification is committed first.",
      doesNot:
        "It does not commit, stash or delete the files shown, and the agent never sees them: code that needs them fails its gate.",
      next: "Then the gate on the branch it opens; commit the files shown when they are ready.",
      notice: {
        ranOk: "`{command}` built {req} without the uncommitted files.",
        next: "specgate check",
      },
    },
    es: {
      does: "Construye {req} igualmente, desde el último commit, cuando lo confirmas: la rama del agente deja fuera los archivos sin commit, que quedan en tu copia de trabajo como están.",
      command: "specgate harness run --req {req} --allow-dirty",
      files:
        "Ninguno de los archivos mostrados: siguen sin commit. Los de la construcción, en su rama; la especificación sin commit se commitea antes.",
      doesNot:
        "No hace commit, ni stash, ni borra los archivos mostrados, y el agente no los ve: el código que los necesite no pasará su gate.",
      next: "Después, el gate en la rama que abre; haz commit de los archivos mostrados cuando estén listos.",
      notice: {
        ranOk: "`{command}` construyó {req} sin los archivos sin commit.",
        next: "specgate check",
      },
    },
  },
  "build-stop-after": {
    en: {
      does: "Lets {req} finish — its agent, its gate and its branch — and then starts nothing else: specgate's harness is asked to start no other requirement, and the studio starts nothing it queued.",
      command: "specgate harness stop --after-current",
      files:
        "None besides what {req}'s build writes on its branch; the stop request the harness reads, in git's own folder.",
      doesNot:
        "It does not interrupt {req}, and it asks no confirmation: nothing running is ended.",
      next: "Build the queued requirements again from Build when you want them.",
      notice: {
        ranOk: "{req} finished; what was queued after it ({queued}) was not started.",
        next: "specgate check",
      },
    },
    es: {
      does: "Deja que {req} termine — su agente, su gate y su rama — y después no empieza nada más: se pide al harness de specgate que no empiece otro requisito, y el studio no inicia nada de su cola.",
      command: "specgate harness stop --after-current",
      files:
        "Ninguno aparte de lo que la construcción de {req} escribe en su rama; la petición de parada que lee el harness, en la carpeta propia de git.",
      doesNot: "No interrumpe {req} y no pide confirmación: no termina nada en marcha.",
      next: "Vuelve a construir los requisitos en cola desde Construir cuando los quieras.",
      notice: {
        ranOk: "{req} terminó; lo que estaba en cola tras él ({queued}) no empezó.",
        next: "specgate check",
      },
    },
  },
  "build-stop-now": {
    en: {
      does: "Ends the build of {req} at once, after you confirm: the harness and every process it started — the agent, its tests, the servers they started — and starts nothing queued.",
      command:
        "None of specgate's: the studio ends `specgate harness run`'s process tree (`taskkill /T` on Windows, its process group elsewhere).",
      files:
        "None: what the agent had not committed stays in its worktree under `.harness/`, its branch as it was.",
      doesNot:
        "It does not run before you confirm; it does not delete the agent's branch or undo what it committed.",
      next: "Look at the branch `harness/{req}`, then build {req} again when you want it.",
      notice: {
        ranOk:
          "The studio ended the build of {req} and every process it started; what was queued ({queued}) was not started.",
        next: "git branch --list harness/{req}",
      },
    },
    es: {
      does: "Termina en el acto la construcción de {req}, después de que confirmes: el harness y todos los procesos que inició — el agente, sus tests, los servidores que arrancaron — y no empieza nada de la cola.",
      command:
        "Ninguno de specgate: el studio termina el árbol de procesos de `specgate harness run` (`taskkill /T` en Windows, su grupo de procesos en el resto).",
      files:
        "Ninguno: lo que el agente no hizo commit queda en su worktree bajo `.harness/`, su rama como estaba.",
      doesNot:
        "No se ejecuta antes de que confirmes; no borra la rama del agente ni deshace lo que hizo commit.",
      next: "Mira la rama `harness/{req}` y vuelve a construir {req} cuando lo quieras.",
      notice: {
        ranOk:
          "El studio terminó la construcción de {req} y todos los procesos que inició; lo que estaba en cola ({queued}) no empezó.",
        next: "git branch --list harness/{req}",
      },
    },
  },
  // The agent panel (draft-workbench-v2 REQ-181 … REQ-183).
  "agent-ask": {
    en: {
      does: "Hands your request to the project's agent, which works on a scratch copy of the project and answers a plan: each file it would change (M changed, + new) and why, the specgate check it runs after, what it read and the tokens it used. @REQ-031 or @path names a requirement or a file for it to read first.",
      command: 'specgate agent ask "<request>" --plan',
      files:
        "None of the project: the plan is kept in git's own folder, under `specgate/plans/`, which `git status` does not show.",
      doesNot:
        "It writes nothing in the project, builds no code, commits nothing: a plan changes only spec.md, docs/specs/ and features/, and only once you apply it.",
      next: "Press “See the diff and apply” to read the diff and confirm it, or “Discard” to drop it.",
      notice: {
        ranOk: "`{command}` answered a plan of {count} files; nothing was written yet.",
        next: "specgate agent apply {id}",
      },
    },
    es: {
      does: "Pasa tu petición al agente del proyecto, que trabaja sobre una copia del proyecto y responde con un plan: cada archivo que cambiaría (M cambiado, + nuevo) y por qué, la comprobación de specgate que corre después, lo que leyó y los tokens que usó. @REQ-031 o @ruta nombra un requisito o un archivo para que lo lea primero.",
      command: 'specgate agent ask "<petición>" --plan',
      files:
        "Ninguno del proyecto: el plan se guarda en la carpeta propia de git, en `specgate/plans/`, que `git status` no muestra.",
      doesNot:
        "No escribe nada en el proyecto, no construye código ni hace commit: un plan solo cambia spec.md, docs/specs/ y features/, y solo cuando lo aplicas.",
      next: "Pulsa «Ver el diff y aplicar» para leer el diff y confirmarlo, o «Descartar» para tirarlo.",
      notice: {
        ranOk: "`{command}` respondió con un plan de {count} archivos; aún no se ha escrito nada.",
        next: "specgate agent apply {id}",
      },
    },
  },
  "agent-apply": {
    en: {
      does: "Writes the agent's plan after you have read its diff and confirmed it: each file exactly as the diff shows, only if none changed since the agent started, then runs the plan's specgate check.",
      command: "specgate agent apply {id}",
      files:
        "The plan's files only — spec.md, docs/specs/ or features/ — as its diff shows them. The diff stays in Changes under its change.",
      doesNot:
        "It writes nothing before you confirm, and refuses with plan_stale if a file changed since; it never stages, commits or pushes.",
      next: "Review with `git diff`, then commit; `{then}` checks it again.",
      notice: {
        ranOk: "`{command}` wrote the plan and ran `{then}`.",
        next: "{then}",
      },
    },
    es: {
      does: "Escribe el plan del agente después de que hayas leído su diff y lo confirmes: cada archivo tal como lo muestra el diff, solo si ninguno cambió desde que el agente empezó, y después corre la comprobación de specgate del plan.",
      command: "specgate agent apply {id}",
      files:
        "Solo los archivos del plan — spec.md, docs/specs/ o features/ — como los muestra su diff. El diff queda en Cambios bajo su cambio.",
      doesNot:
        "No escribe nada antes de que confirmes, y se niega con plan_stale si un archivo cambió desde entonces; nunca hace stage, commit ni push.",
      next: "Revisa con `git diff` y haz commit; `{then}` lo vuelve a comprobar.",
      notice: {
        ranOk: "`{command}` escribió el plan y corrió `{then}`.",
        next: "{then}",
      },
    },
  },
  "agent-discard": {
    en: {
      does: "Drops the agent's plan: its files are never written.",
      command: "specgate agent discard {id}",
      files: "None of the project: only the plan kept in git's folder is removed.",
      doesNot: "It writes nothing in the project and does not stop you asking again.",
      next: "Ask again, with more detail or a @REQ to read.",
      notice: {
        ranOk: "`{command}` dropped the plan; nothing of the project was written.",
        next: 'specgate agent ask "<request>" --plan',
      },
    },
    es: {
      does: "Tira el plan del agente: sus archivos no se escriben nunca.",
      command: "specgate agent discard {id}",
      files: "Ninguno del proyecto: solo se borra el plan guardado en la carpeta de git.",
      doesNot: "No escribe nada en el proyecto ni te impide volver a pedirlo.",
      next: "Vuelve a pedirlo, con más detalle o con un @REQ que leer.",
      notice: {
        ranOk: "`{command}` tiró el plan; no se escribió nada del proyecto.",
        next: 'specgate agent ask "<petición>" --plan',
      },
    },
  },
  // draft-changes REQ-083: the open notes handed to the agent.
  redraft: {
    en: {
      does: "Has the project's agent draft {module} again, handing it every open request for change of review.md — none that is addressed. specgate marks addressed each note whose requirement the agent changed, and writes its before and after below the table.",
      command: "specgate propose --from-brief {module} --agent {agent}",
      files:
        "`docs/specs/changes/draft-{module}/`: the delta the agent redrafts, and review.md, whose notes it addressed.",
      doesNot:
        "It does not approve, build or archive the draft, and does not commit or push; a note the agent did not address stays open.",
      next: "Read each addressed note's before and after in Changes, then approve the draft or ask for another change.",
      notice: {
        ranOk: "`{command}` had the agent draft {module} again with its {count} open requests.",
        next: "specgate change show draft-{module}",
      },
    },
    es: {
      does: "Hace que el agente del proyecto vuelva a redactar {module} y le pasa cada cambio pedido abierto de review.md — ninguno de los atendidos. specgate marca atendida cada nota cuyo requisito cambió el agente y escribe su antes y su después bajo la tabla.",
      command: "specgate propose --from-brief {module} --agent {agent}",
      files:
        "`docs/specs/changes/draft-{module}/`: el delta que el agente vuelve a redactar y review.md, cuyas notas atendió.",
      doesNot:
        "No aprueba, construye ni archiva el borrador, ni hace commit ni push; una nota que el agente no atendió sigue abierta.",
      next: "Lee en Cambios el antes y el después de cada nota atendida; después aprueba el borrador o pide otro cambio.",
      notice: {
        ranOk:
          "`{command}` hizo que el agente volviera a redactar {module} con sus {count} cambios pedidos abiertos.",
        next: "specgate change show draft-{module}",
      },
    },
  },
  // draft-brief REQ-071: the brief edited as a form.
  "brief-form": {
    en: {
      does: "Saves the form into docs/brief.md: specgate rewrites only the fields and lists you changed — the product, the actors, the modules and each module's rules, examples and open questions — and checks the brief.",
      command: "specgate propose --from-brief --form <form.json>",
      files:
        "docs/brief.md only; every line the form does not hold — notes, other sections, line endings — stays byte for byte. The form's file is a temporary one outside the project.",
      doesNot:
        "It does not draft a module, commit or push; markdown edits to the same file are kept.",
      next: "Fix what Problems lists, then “Draft the modules”.",
      notice: {
        ranOk: "`{command}` wrote the form into docs/brief.md and checked it.",
        next: "specgate propose --from-brief <module>",
      },
    },
    es: {
      does: "Guarda el formulario en docs/brief.md: specgate reescribe solo los campos y listas que cambiaste — el producto, los actores, los módulos y las reglas, ejemplos y preguntas abiertas de cada uno — y comprueba el brief.",
      command: "specgate propose --from-brief --form <form.json>",
      files:
        "Solo docs/brief.md; cada línea que el formulario no tiene — notas, otras secciones, finales de línea — queda byte a byte. El archivo del formulario es temporal y está fuera del proyecto.",
      doesNot:
        "No redacta ningún módulo ni hace commit ni push; lo que edites como markdown en el mismo archivo se conserva.",
      next: "Arregla lo que lista Problemas y después «Redactar los módulos».",
      notice: {
        ranOk: "`{command}` escribió el formulario en docs/brief.md y lo comprobó.",
        next: "specgate propose --from-brief <módulo>",
      },
    },
  },
  // draft-brief REQ-074: the client's text proposes the form.
  "brief-propose": {
    en: {
      does: "Hands the client's text to the project's agent, which proposes the form from it — the product, who uses it and where, the modules. You review the proposal; Accept writes it, Discard drops it.",
      command: "specgate propose --from-brief --brief <client-text> --agent {agent}",
      files:
        "None of the project: the client's text goes to a temporary file outside it, and docs/brief.md is written only when you press Accept.",
      doesNot:
        "It writes nothing in the project, drafts no module, and commits nothing; with no agent set it runs nothing.",
      next: "Review the proposed form, then Accept or Discard.",
      notice: {
        ranOk: "`{command}` proposed a form; nothing was written.",
        next: "specgate propose --from-brief --form",
      },
    },
    es: {
      does: "Pasa el texto del cliente al agente del proyecto, que propone el formulario a partir de él — el producto, quién lo usa y dónde, los módulos. Tú revisas la propuesta; Aceptar la escribe, Descartar la tira.",
      command: "specgate propose --from-brief --brief <texto-del-cliente> --agent {agent}",
      files:
        "Ninguno del proyecto: el texto del cliente va a un archivo temporal fuera de él, y docs/brief.md solo se escribe cuando pulsas Aceptar.",
      doesNot:
        "No escribe nada en el proyecto, no redacta módulos ni hace commit; sin agente configurado no ejecuta nada.",
      next: "Revisa el formulario propuesto y después Aceptar o Descartar.",
      notice: {
        ranOk: "`{command}` propuso un formulario; no se escribió nada.",
        next: "specgate propose --from-brief --form",
      },
    },
  },
  // draft-brief: the brief's checks, on every save (REQ-072).
  "brief-check": {
    en: {
      does: "Checks the brief on every save, from the form or as markdown: the brief rules B1–B13 — a vague word, a promised quantity with no number, a module with no example… Each finding goes to Problems with its code, message, fix and line, and is underlined in the editor.",
      command: "specgate propose --from-brief --check --brief docs/brief.md",
      files: "None: no file is changed.",
      doesNot:
        "It does not fix the brief, draft a module or block the save: the file is saved as you wrote it.",
      next: "Fix what Problems lists and save again; then `specgate propose --from-brief <module>` drafts a module.",
      notice: {
        ranOk: "`{command}` checked the brief: what it found is in Problems.",
        next: "specgate propose --from-brief <module>",
      },
    },
    es: {
      does: "Comprueba el brief cada vez que guardas, desde el formulario o como markdown: las reglas del brief B1–B13 — una palabra vaga, una cantidad prometida sin número, un módulo sin ejemplo… Cada hallazgo va a Problemas con su código, mensaje, arreglo y línea, y se subraya en el editor.",
      command: "specgate propose --from-brief --check --brief docs/brief.md",
      files: "Ninguno: no cambia ningún archivo.",
      doesNot:
        "No arregla el brief, no redacta ningún módulo ni impide guardar: el archivo se guarda como lo escribiste.",
      next: "Arregla lo que lista Problemas y guarda otra vez; después `specgate propose --from-brief <módulo>` redacta un módulo.",
      notice: {
        ranOk: "`{command}` comprobó el brief: lo que encontró está en Problemas.",
        next: "specgate propose --from-brief <módulo>",
      },
    },
  },
  // draft-brief: "Draft the modules", one module at a time with the agent (REQ-073).
  "draft-modules": {
    en: {
      does: "Has the project's agent draft each module of the brief not drafted yet, in the brief's order, one at a time: the next starts only when the previous one has ended. specgate checks each draft until it is ready to review.",
      command: "specgate propose --from-brief {module} --agent {agent}",
      files:
        "`docs/specs/changes/draft-{module}/` of each module: DRAFTING.md, the delta, assumptions and questions. Whatever the agent writes outside its draft is undone.",
      doesNot:
        "It does not edit the brief, approve, build or archive a draft, commit or push: a person reviews each draft in Changes. With no agent set it runs nothing.",
      next: "Review each draft in Changes; `specgate propose --from-brief {module}` checks one again.",
      notice: {
        ranOk: "`{command}` had the agent draft {module}.",
        next: "specgate propose --from-brief {module}",
      },
    },
    es: {
      does: "Hace que el agente del proyecto redacte cada módulo del brief aún sin redactar, en el orden del brief, de uno en uno: el siguiente empieza solo cuando el anterior ha terminado. specgate comprueba cada borrador hasta que está listo para revisar.",
      command: "specgate propose --from-brief {module} --agent {agent}",
      files:
        "`docs/specs/changes/draft-{module}/` de cada módulo: DRAFTING.md, el delta, los supuestos y las preguntas. Lo que el agente escriba fuera de su borrador se deshace.",
      doesNot:
        "No edita el brief, ni aprueba, construye o archiva un borrador, ni hace commit ni push: una persona revisa cada borrador en Cambios. Sin agente configurado no ejecuta nada.",
      next: "Revisa cada borrador en Cambios; `specgate propose --from-brief {module}` vuelve a comprobar uno.",
      notice: {
        ranOk: "`{command}` hizo que el agente redactara {module}.",
        next: "specgate propose --from-brief {module}",
      },
    },
  },
  // Home's "Doctor" (draft-design-conformance REQ-173, A9).
  doctor: {
    en: {
      does: "Runs every diagnostic of the project — its environment, its structure, traceability both ways, placeholders left, the specops lockfile — and prints a fix for each finding.",
      command: "specgate doctor",
      files: "None: no file is changed.",
      doesNot:
        "It fixes nothing, commits nothing and runs no test: it only says what is wrong and how to fix it.",
      next: "Fix what it lists, then check the gate: `specgate check`.",
      notice: {
        ranOk: "`{command}` ran every diagnostic: what it found is in the terminal.",
        next: "specgate check",
      },
    },
    es: {
      does: "Ejecuta todos los diagnósticos del proyecto — su entorno, su estructura, la trazabilidad en los dos sentidos, los marcadores pendientes, el lockfile de specops — y da una solución para cada hallazgo.",
      command: "specgate doctor",
      files: "Ninguno: no cambia ningún archivo.",
      doesNot:
        "No arregla nada, no hace commit y no ejecuta tests: solo dice qué falla y cómo arreglarlo.",
      next: "Arregla lo que liste y comprueba el gate: `specgate check`.",
      notice: {
        ranOk: "`{command}` ejecutó todos los diagnósticos: lo que encontró está en el terminal.",
        next: "specgate check",
      },
    },
  },
  // draft-explorer-tree: the tree and its menu (REQ-168, A19). No specgate command:
  // the host writes through its file port, inside the project only.
  explorer: {
    en: {
      does: "Shows the specification — spec.md, the brief, the open changes, capabilities and features — the modules with their requirements, and the project's files as a tree, one folder read when it is opened. M is a modified file, U an untracked one, A one added to the index; a dot on a folder says it holds one. The orange mark is the specification: spec.md, docs/specs and features.",
      command: "None: the tree reads the project's folders through the studio's host.",
      files:
        "None: the tree writes only through its menu — new file, new folder, rename and delete.",
      doesNot:
        "It shows nothing .gitignore or the studio's ignore rules name, never writes outside the project, and runs no specgate command.",
      next: "Open a file with Enter or a click; the menu of a row creates, renames or deletes.",
      notice: { ranOk: "The tree shows {path}.", next: "Open a file" },
    },
    es: {
      does: "Muestra la especificación — spec.md, el brief, los cambios abiertos, capacidades y features —, los módulos con sus requisitos, y los archivos del proyecto como árbol, leyendo una carpeta al abrirla. M es un archivo modificado, U uno sin seguimiento, A uno añadido al índice; un punto en una carpeta dice que contiene uno. La marca naranja es la especificación: spec.md, docs/specs y features.",
      command: "Ninguno: el árbol lee las carpetas del proyecto a través del host del studio.",
      files:
        "Ninguno: el árbol solo escribe desde su menú — nuevo archivo, nueva carpeta, renombrar y eliminar.",
      doesNot:
        "No muestra nada de lo que nombran .gitignore o las reglas del studio, nunca escribe fuera del proyecto y no ejecuta ningún comando de specgate.",
      next: "Abre un archivo con Enter o un clic; el menú de una fila crea, renombra o elimina.",
      notice: { ranOk: "El árbol muestra {path}.", next: "Abre un archivo" },
    },
  },
  "file-new": {
    en: {
      does: "Creates the empty file {path} and opens it in the editor.",
      command: "None: the studio's host creates {path} through its file port.",
      files: "{path}, new and empty.",
      doesNot:
        "It never overwrites a file, never writes outside the project — a link to a folder outside it included — and commits nothing.",
      next: "Write in it and save with Ctrl/Cmd+S.",
      notice: { ranOk: "Created {path}", next: "Save it with Ctrl/Cmd+S" },
    },
    es: {
      does: "Crea el archivo vacío {path} y lo abre en el editor.",
      command: "Ninguno: el host del studio crea {path} con su puerto de archivos.",
      files: "{path}, nuevo y vacío.",
      doesNot:
        "Nunca sobrescribe un archivo ni escribe fuera del proyecto — tampoco a través de un enlace a una carpeta de fuera — y no hace commit.",
      next: "Escribe en él y guarda con Ctrl/Cmd+S.",
      notice: { ranOk: "Creado {path}", next: "Guárdalo con Ctrl/Cmd+S" },
    },
  },
  "folder-new": {
    en: {
      does: "Creates the empty folder {path} and opens it in the tree.",
      command: "None: the studio's host creates {path} through its file port.",
      files: "{path}, a new empty folder.",
      doesNot:
        "It never replaces a file or folder, never writes outside the project, and commits nothing.",
      next: "Create a file in it from its menu.",
      notice: { ranOk: "Created the folder {path}", next: "New file in {path}" },
    },
    es: {
      does: "Crea la carpeta vacía {path} y la abre en el árbol.",
      command: "Ninguno: el host del studio crea {path} con su puerto de archivos.",
      files: "{path}, una carpeta nueva y vacía.",
      doesNot:
        "Nunca sustituye un archivo o carpeta, nunca escribe fuera del proyecto y no hace commit.",
      next: "Crea un archivo en ella desde su menú.",
      notice: { ranOk: "Creada la carpeta {path}", next: "Nuevo archivo en {path}" },
    },
  },
  "file-rename": {
    en: {
      does: "Renames {path} to {to}; a tab open on it follows the new name.",
      command: "None: the studio's host renames {path} through its file port.",
      files: "{path}, which becomes {to}.",
      doesNot:
        "It never overwrites an existing {to}, never moves a file outside the project, and commits nothing: git sees a deleted and a new file until you commit.",
      next: "Commit the rename when you are ready.",
      notice: { ranOk: "Renamed {path} to {to}", next: "git add {to}" },
    },
    es: {
      does: "Renombra {path} a {to}; una pestaña abierta en él sigue el nombre nuevo.",
      command: "Ninguno: el host del studio renombra {path} con su puerto de archivos.",
      files: "{path}, que pasa a ser {to}.",
      doesNot:
        "Nunca sobrescribe un {to} que ya exista, nunca saca un archivo del proyecto y no hace commit: git ve un archivo borrado y uno nuevo hasta que lo confirmes.",
      next: "Haz commit del cambio de nombre cuando quieras.",
      notice: { ranOk: "Renombrado {path} a {to}", next: "git add {to}" },
    },
  },
  "file-delete": {
    en: {
      does: "Moves {path} to the system's trash after a confirmation; a tab open on it closes.",
      command:
        "None: the studio's host moves {path} to the trash — Finder on macOS, the Recycle Bin on Windows, the freedesktop.org trash on Linux.",
      files: "{path}, moved to the trash, from where it can be restored.",
      doesNot:
        "It removes nothing for good — Shift+Delete does that, after its own confirmation — writes nothing else, and commits nothing. With no trash reachable it deletes nothing.",
      next: "Restore it from the trash if it was a mistake.",
      notice: { ranOk: "Moved {path} to the trash", next: "Restore it from the trash" },
    },
    es: {
      does: "Mueve {path} a la papelera del sistema tras una confirmación; una pestaña abierta en él se cierra.",
      command:
        "Ninguno: el host del studio mueve {path} a la papelera — el Finder en macOS, la Papelera de reciclaje en Windows, la papelera de freedesktop.org en Linux.",
      files: "{path}, movido a la papelera, desde donde se puede recuperar.",
      doesNot:
        "No borra nada para siempre — eso lo hace Mayús+Supr, tras su propia confirmación —, no escribe nada más y no hace commit. Sin papelera disponible no borra nada.",
      next: "Recupéralo de la papelera si fue un error.",
      notice: { ranOk: "Movido {path} a la papelera", next: "Recupéralo de la papelera" },
    },
  },
  "file-delete-permanent": {
    en: {
      does: "Removes {path} for good after a confirmation that says it cannot be undone; a tab open on it closes.",
      command: "None: the studio's host removes {path} through its file port.",
      files: "{path}, removed: not in the trash.",
      doesNot:
        "It cannot be undone by the studio, never removes anything outside the project, and commits nothing.",
      next: "If the file was committed, git can still bring it back: `git restore {path}`.",
      notice: { ranOk: "Deleted {path} for good", next: "git restore {path}" },
    },
    es: {
      does: "Borra {path} para siempre tras una confirmación que dice que no se puede deshacer; una pestaña abierta en él se cierra.",
      command: "Ninguno: el host del studio borra {path} con su puerto de archivos.",
      files: "{path}, borrado: no va a la papelera.",
      doesNot:
        "El studio no puede deshacerlo, nunca borra nada fuera del proyecto y no hace commit.",
      next: "Si el archivo tenía commit, git aún puede recuperarlo: `git restore {path}`.",
      notice: { ranOk: "Borrado {path} para siempre", next: "git restore {path}" },
    },
  },
  "copy-path": {
    en: {
      does: "Copies {path}, the path from the project's folder with `/`, to the clipboard — the form specgate and the agent use.",
      command: "None: the studio copies the text.",
      files: "None: no file is changed.",
      doesNot: "It writes no file and runs nothing.",
      next: "Paste it in the terminal, a note or the agent's prompt.",
      notice: { ranOk: "Copied {path}", next: "Paste it" },
    },
    es: {
      does: "Copia {path}, la ruta desde la carpeta del proyecto con `/`, al portapapeles — la forma que usan specgate y el agente.",
      command: "Ninguno: el studio copia el texto.",
      files: "Ninguno: no cambia ningún archivo.",
      doesNot: "No escribe ningún archivo ni ejecuta nada.",
      next: "Pégala en el terminal, en una nota o en el prompt del agente.",
      notice: { ranOk: "Copiado {path}", next: "Pégala" },
    },
  },
  "open-terminal": {
    en: {
      does: "Opens a new terminal of yours, with your shell, in the folder {path}.",
      command: "None: your shell starts in {path}.",
      files: "None: opening it changes no file; what you type is yours.",
      doesNot: "It runs no command for you and never opens outside the project.",
      next: "Type in it; Ctrl+` shows the terminals.",
      notice: { ranOk: "Opened a terminal in {path}", next: "Type a command" },
    },
    es: {
      does: "Abre un terminal tuyo nuevo, con tu shell, en la carpeta {path}.",
      command: "Ninguno: tu shell arranca en {path}.",
      files: "Ninguno: abrirlo no cambia ningún archivo; lo que escribas es tuyo.",
      doesNot: "No ejecuta ningún comando por ti y nunca se abre fuera del proyecto.",
      next: "Escribe en él; Ctrl+` muestra los terminales.",
      notice: { ranOk: "Abierto un terminal en {path}", next: "Escribe un comando" },
    },
  },
  "folder-open": {
    en: {
      does: "Opens a folder you choose as the project: its Explorer, Home and terminals, in a host of its own.",
      command: "None: the studio's host opens {path}.",
      files: "None: opening a folder changes no file; it joins your recent projects.",
      doesNot: "It writes nothing in the folder, runs no specgate command and commits nothing.",
      next: "If it is no specgate project yet, Home offers to create or adopt one.",
      notice: { ranOk: "Opened {path}", next: "Look at Home" },
    },
    es: {
      does: "Abre como proyecto la carpeta que elijas: su Explorador, su Inicio y sus terminales, en un host propio.",
      command: "Ninguno: el host del studio abre {path}.",
      files: "Ninguno: abrir una carpeta no cambia ningún archivo; pasa a tus proyectos recientes.",
      doesNot:
        "No escribe nada en la carpeta, no ejecuta ningún comando de specgate y no hace commit.",
      next: "Si aún no es un proyecto de specgate, Inicio ofrece crearlo o adoptarlo.",
      notice: { ranOk: "Abierta {path}", next: "Mira Inicio" },
    },
  },
  "folder-clone": {
    en: {
      does: "Clones a repository into a folder you choose — `gh repo clone` when the GitHub CLI is signed in, `git clone` otherwise — shown in the terminal, then opens it.",
      command: "gh repo clone {repo} {path}, or git clone <its URL> {path}",
      files: "{path}: a new folder with the repository; nothing else.",
      doesNot:
        "It never clones into a folder that already exists, changes no other folder, and pushes or commits nothing.",
      next: "Once open, Home says whether it is a specgate project.",
      notice: { ranOk: "Cloned {repo} into {path}", next: "Look at Home" },
    },
    es: {
      does: "Clona un repositorio en la carpeta que elijas — `gh repo clone` si la CLI de GitHub tiene sesión, `git clone` si no —, a la vista en la terminal, y luego lo abre.",
      command: "gh repo clone {repo} {path}, o git clone <su URL> {path}",
      files: "{path}: una carpeta nueva con el repositorio; nada más.",
      doesNot:
        "Nunca clona en una carpeta que ya exista, no cambia ninguna otra carpeta y no hace push ni commit.",
      next: "Una vez abierto, Inicio dice si es un proyecto de specgate.",
      notice: { ranOk: "Clonado {repo} en {path}", next: "Mira Inicio" },
    },
  },
  "editor-split": {
    en: {
      does: "Opens the file in a new editor group {side} the active one, with its own tabs; the same file in both stays one document.",
      command: "None: the studio lays out its editors.",
      files: "None: it writes no file; the layout is kept for this project.",
      doesNot: "It writes no file and runs no command.",
      next: "Ctrl/Cmd+1, 2 or 3 focuses a group; drag a splitter to resize, double-click it to even them.",
      notice: {
        ranOk: "Split the editor: a new group {side} the active one",
        next: "Ctrl/Cmd+W closes the tab",
      },
    },
    es: {
      does: "Abre el archivo en un grupo de editores nuevo {side} del activo, con sus propias pestañas; el mismo archivo en los dos sigue siendo un solo documento.",
      command: "Ninguno: el studio coloca sus editores.",
      files: "Ninguno: no escribe ningún archivo; la disposición se guarda para este proyecto.",
      doesNot: "No escribe ningún archivo y no ejecuta ningún comando.",
      next: "Ctrl/Cmd+1, 2 o 3 enfoca un grupo; arrastra un separador para cambiar el tamaño, doble clic para igualarlos.",
      notice: {
        ranOk: "Dividido el editor: un grupo nuevo {side} del activo",
        next: "Ctrl/Cmd+W cierra la pestaña",
      },
    },
  },
  "editor-move": {
    en: {
      does: "Moves the tab to another editor group: dropped on its tab strip, or on an edge of a group to make a new one there.",
      command: "None: the studio lays out its editors.",
      files: "None: it writes no file.",
      doesNot: "It writes no file, runs no command, and loses no unsaved change.",
      next: "A group whose last tab leaves closes.",
      notice: { ranOk: "Moved the tab", next: "Ctrl/Cmd+1, 2 or 3 focuses a group" },
    },
    es: {
      does: "Mueve la pestaña a otro grupo de editores: soltada en su barra de pestañas, o en un borde de un grupo para crear uno nuevo allí.",
      command: "Ninguno: el studio coloca sus editores.",
      files: "Ninguno: no escribe ningún archivo.",
      doesNot:
        "No escribe ningún archivo, no ejecuta ningún comando y no pierde cambios sin guardar.",
      next: "Un grupo cuya última pestaña sale se cierra.",
      notice: { ranOk: "Movida la pestaña", next: "Ctrl/Cmd+1, 2 o 3 enfoca un grupo" },
    },
  },
  "group-close": {
    en: {
      does: "Closes the editor group and its tabs; the groups beside it take its room. A tab with unsaved changes asks first.",
      command: "None: the studio lays out its editors.",
      files: "None: it writes no file unless you choose Save.",
      doesNot: "It discards no unsaved change without asking and runs no command.",
      next: "Ctrl/Cmd+\\ splits again.",
      notice: { ranOk: "Closed the editor group", next: "Ctrl/Cmd+\\ splits again" },
    },
    es: {
      does: "Cierra el grupo de editores y sus pestañas; los grupos de al lado ocupan su sitio. Una pestaña con cambios sin guardar pregunta antes.",
      command: "Ninguno: el studio coloca sus editores.",
      files: "Ninguno: no escribe ningún archivo salvo que elijas Guardar.",
      doesNot: "No descarta cambios sin guardar sin preguntar y no ejecuta ningún comando.",
      next: "Ctrl/Cmd+\\ vuelve a dividir.",
      notice: { ranOk: "Cerrado el grupo de editores", next: "Ctrl/Cmd+\\ vuelve a dividir" },
    },
  },
  "panel-position": {
    en: {
      does: "Moves the bottom panel — its terminals, the gate, problems — below the editor groups, or to their right or left; it is never hidden.",
      command: "None: the studio lays out its panels.",
      files: "None: it writes no file; the position is kept for this project.",
      doesNot: "It closes no terminal, stops nothing running, and runs no command.",
      next: "Choose Panel Position again to move it back.",
      notice: { ranOk: "Moved the panel", next: "Panel Position: Bottom puts it back" },
    },
    es: {
      does: "Mueve el panel inferior — sus terminales, el gate, los problemas — debajo de los grupos de editores, o a su derecha o su izquierda; nunca se oculta.",
      command: "Ninguno: el studio coloca sus paneles.",
      files: "Ninguno: no escribe ningún archivo; la posición se guarda para este proyecto.",
      doesNot: "No cierra ninguna terminal, no detiene nada en marcha y no ejecuta ningún comando.",
      next: "Elige de nuevo Posición del panel para devolverlo.",
      notice: { ranOk: "Movido el panel", next: "Posición del panel: abajo lo devuelve" },
    },
  },
  "panel-maximize": {
    en: {
      does: "Maximizes the panel over the editor area, or restores it to its size.",
      command: "None: the studio lays out its panels.",
      files: "None: it writes no file.",
      doesNot: "It closes no editor, loses no unsaved change and runs no command.",
      next: "The same button restores it.",
      notice: { ranOk: "Maximized the panel", next: "The same button restores it" },
    },
    es: {
      does: "Maximiza el panel sobre el área de editores, o lo devuelve a su tamaño.",
      command: "Ninguno: el studio coloca sus paneles.",
      files: "Ninguno: no escribe ningún archivo.",
      doesNot:
        "No cierra ningún editor, no pierde cambios sin guardar y no ejecuta ningún comando.",
      next: "El mismo botón lo restaura.",
      notice: { ranOk: "Maximizado el panel", next: "El mismo botón lo restaura" },
    },
  },

  traceability: {
    en: {
      does: "Shows one row per scenario of the project: its requirement, its feature file, the tests that name it, the code that implements it and its requirement's status. A row that lacks a feature, a test or code is a gap.",
      command: "specgate matrix --json --dry-run",
      files: "None: reading it changes no file; the matrix on disk is not regenerated.",
      doesNot:
        "It never reads the prose of docs/specs/traceability.md, never shows one row per requirement, and runs no test.",
      next: "Filter the gaps, the rows without a test or the ones waiting for an answer; Fix proposes a missing test.",
      notice: { ranOk: "`{command}` listed the scenarios", next: "Choose a filter" },
    },
    es: {
      does: "Muestra una fila por escenario del proyecto: su requisito, su feature, las pruebas que lo nombran, el código que lo implementa y el estado de su requisito. Una fila a la que le falta la feature, una prueba o código es un hueco.",
      command: "specgate matrix --json --dry-run",
      files: "Ninguno: leerla no cambia ningún archivo; la matriz en disco no se regenera.",
      doesNot:
        "Nunca lee la prosa de docs/specs/traceability.md, nunca muestra una fila por requisito y no ejecuta ninguna prueba.",
      next: "Filtra los huecos, las filas sin prueba o las que esperan respuesta; Arreglar propone una prueba que falta.",
      notice: { ranOk: "`{command}` listó los escenarios", next: "Elige un filtro" },
    },
  },
  "trace-fix": {
    en: {
      does: "Opens {scenario} in its feature file and proposes the missing test: a skeleton the studio writes from the scenario's GIVEN, WHEN and THEN, naming {req} and {scenario}, with a failing placeholder where the assertions go.",
      command:
        "None: the studio writes the skeleton from the scenario; no agent runs and nothing is spent.",
      files: "{path}, and only once you confirm; until then no file changes.",
      doesNot:
        "It runs no agent and costs nothing; it never overwrites a file, never commits, never runs the tests and never marks the requirement.",
      next: "Write the assertions, then `specgate apply {req}`.",
      notice: {
        ranOk: "Wrote {path}: the test for {scenario}, from its scenario",
        next: "specgate apply {req}",
        after: "Write its assertions; it fails until you do.",
        cancelled: "Cancelled the proposed test for {scenario}",
      },
    },
    es: {
      does: "Abre {scenario} en su feature y propone la prueba que falta: un esqueleto que el studio escribe a partir del GIVEN, WHEN y THEN del escenario, que nombra {req} y {scenario}, con un marcador que falla donde van las aserciones.",
      command:
        "Ninguno: el studio escribe el esqueleto a partir del escenario; no se ejecuta ningún agente y no cuesta nada.",
      files: "{path}, y solo cuando confirmas; hasta entonces no cambia ningún archivo.",
      doesNot:
        "No ejecuta ningún agente y no cuesta nada; nunca sobrescribe un archivo, no hace commit, no ejecuta las pruebas y no marca el requisito.",
      next: "Escribe las aserciones y luego `specgate apply {req}`.",
      notice: {
        ranOk: "Escrita {path}: la prueba de {scenario}, a partir de su escenario",
        next: "specgate apply {req}",
        after: "Escribe sus aserciones; falla hasta que lo hagas.",
        cancelled: "Cancelada la prueba propuesta para {scenario}",
      },
    },
  },
  "trace-ask-agent": {
    en: {
      does: "Has the project's agent complete the skeleton of {scenario}: specgate runs it on a scratch copy and answers its test, shown as a diff against the skeleton with the tokens and the cost of that run.",
      command:
        'specgate agent ask "<complete the test of {scenario}>" --plan --json, then specgate agent apply <plan-id> once you confirm',
      files:
        "None while you look: the plan writes nothing. Once confirmed, specgate writes {path} and runs the plan's checks.",
      doesNot:
        "It writes nothing until you confirm, never commits or pushes, and never marks the requirement. The run costs what the agent spends.",
      next: "Read the diff; confirm it, or go back to the skeleton. Then `specgate apply {req}`.",
      notice: {
        ranOk: "`specgate agent apply` wrote {path}: the agent's test for {scenario}",
        next: "specgate apply {req}",
        cancelled: "Discarded the agent's test for {scenario}",
      },
    },
    es: {
      does: "Hace que el agente del proyecto complete el esqueleto de {scenario}: specgate lo ejecuta en una copia aparte y responde con su prueba, que se ve como un diff contra el esqueleto con los tokens y el coste de esa ejecución.",
      command:
        'specgate agent ask "<completa la prueba de {scenario}>" --plan --json, y specgate agent apply <plan-id> cuando confirmas',
      files:
        "Ninguno mientras miras: el plan no escribe nada. Al confirmar, specgate escribe {path} y ejecuta las comprobaciones del plan.",
      doesNot:
        "No escribe nada hasta que confirmas, no hace commit ni push y no marca el requisito. La ejecución cuesta lo que gaste el agente.",
      next: "Lee el diff; confírmalo o vuelve al esqueleto. Luego `specgate apply {req}`.",
      notice: {
        ranOk: "`specgate agent apply` escribió {path}: la prueba del agente para {scenario}",
        next: "specgate apply {req}",
        cancelled: "Descartada la prueba del agente para {scenario}",
      },
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
  count: "<n>",
  queued: "<the queued requirements>",
  agent: "<agent>",
  command: "<command>",
  path: "<path>",
  to: "<new name>",
  repo: "<owner/name>",
  side: "<beside>",
  id: "<plan-id>",
  then: "<its checks>",
  scenario: "<SCN>",
};

export type HelpVars = Partial<
  Record<
    | "req"
    | "change"
    | "module"
    | "key"
    | "q"
    | "count"
    | "queued"
    | "agent"
    | "path"
    | "to"
    | "repo"
    | "side"
    | "id"
    | "then"
    | "scenario",
    string
  >
>;

function fill(text: string, vars: Record<string, string | undefined>): string {
  return text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = vars[name];
    if (v === undefined) return UNSET[name] ?? `{${name}}`;
    return name === "agent" ? quoted(v) : v;
  });
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
  /** It ran and ended without doing what it does: how, in specgate's words (draft-build-live). */
  ended?: { code: string; message: string; fix?: string };
}

export interface Notice {
  tone: "ok" | "refused" | "failed";
  /** For a refusal or a failure, what did not happen: "draft-pedidos was not archived" (A19). */
  title?: string;
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
  { refused: string; failed: string; ended: string; wrote: string; none: string; nothing: string }
> = {
  en: {
    refused: "`{command}` was refused with {code}: {message}",
    failed: "`{command}` ended with code {code}.",
    ended: "`{command}` ended {code}: {message}",
    wrote: "It wrote {files}.",
    none: "No file was written.",
    nothing: "Nothing was written.",
  },
  es: {
    refused: "`{command}` se rechazó con {code}: {message}",
    failed: "`{command}` terminó con código {code}.",
    ended: "`{command}` terminó {code}: {message}",
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
  const title = e.notice.failed ? { title: fill(e.notice.failed, all) } : {};
  if (refusal) {
    return {
      ...title,
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
  if (outcome.ended) {
    return {
      ...title,
      tone: "failed",
      ran: fill(say.ended, { ...all, code: outcome.ended.code, message: outcome.ended.message }),
      wrote,
      next: command,
      ...(outcome.ended.fix ? { fix: outcome.ended.fix } : {}),
    };
  }
  if (outcome.exitCode !== 0) {
    return {
      ...title,
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

/** How a write of the tree ended (REQ-166): done, refused for its path, or failed. */
export type FileOutcome =
  | { ok: true }
  | { ok: false; refused: "outside" | "name" | "exists" | "missing" }
  | { ok: false; failed: string };

const FILE_SAY: Record<
  Lang,
  Record<"outside" | "name" | "exists" | "missing" | "failed" | "nothing", string>
> = {
  en: {
    outside: "Not inside the project: {path} was not {done}",
    name: "Not a name a file can take: {path} was not {done}",
    exists: "{path} already exists: nothing was {done}",
    missing: "{path} is not there any more: nothing was {done}",
    failed: "{path} was not {done}: {message}",
    nothing: "Nothing was written.",
  },
  es: {
    outside: "Fuera del proyecto: {path} no se ha {done}",
    name: "No es un nombre que pueda tener un archivo: {path} no se ha {done}",
    exists: "{path} ya existe: no se ha {done} nada",
    missing: "{path} ya no está: no se ha {done} nada",
    failed: "{path} no se ha {done}: {message}",
    nothing: "No se escribió nada.",
  },
};

const DONE: Record<Lang, Partial<Record<ActionId, string>>> = {
  en: {
    "file-new": "created",
    "folder-new": "created",
    "file-rename": "renamed",
    "file-delete": "deleted",
    "file-delete-permanent": "deleted",
    "folder-clone": "cloned",
    "folder-open": "opened",
  },
  es: {
    "file-new": "creado",
    "folder-new": "creado",
    "file-rename": "renombrado",
    "file-delete": "borrado",
    "file-delete-permanent": "borrado",
    "folder-clone": "clonado",
    "folder-open": "abierto",
  },
};

/**
 * The notice of a write of the tree (REQ-166, REQ-168, A16): it names the
 * file and what was done, or why nothing was — in both languages.
 */
export function fileNotice(
  action: ActionId,
  lang: Lang,
  vars: HelpVars,
  outcome: FileOutcome,
): Notice {
  const e = HELP[action][lang] ?? HELP[action].en!;
  const all = { ...vars, done: DONE[lang][action] ?? "" };
  if (outcome.ok) {
    return {
      tone: "ok",
      ran: fill(e.notice.ranOk, all),
      wrote: fill(e.files, all),
      next: fill(e.notice.next, all),
    };
  }
  const say = FILE_SAY[lang];
  const ran =
    "refused" in outcome
      ? fill(say[outcome.refused], all)
      : fill(say.failed, { ...all, message: outcome.failed });
  return {
    tone: "refused" in outcome ? "refused" : "failed",
    ran,
    wrote: say.nothing,
    next: fill(e.next, all),
  };
}

/**
 * The notice of a proposal confirmed or cancelled (draft-traceability
 * REQ-123): the file written and the next step, or that nothing was written —
 * in both languages, never only "done". A refusal says why nothing was.
 */
export function proposalNotice(
  action: "trace-fix" | "trace-ask-agent",
  lang: Lang,
  vars: HelpVars,
  outcome: { written: string } | { cancelled: true } | { refused: string },
): Notice {
  const e = HELP[action][lang] ?? HELP[action].en!;
  const say = SAY[lang];
  const all = { ...vars, ...("written" in outcome ? { path: outcome.written } : {}) };
  if ("written" in outcome) {
    const wrote = fill(say.wrote, { files: `\`${outcome.written}\`` });
    return {
      tone: "ok",
      ran: fill(e.notice.ranOk, all),
      wrote: e.notice.after ? `${wrote} ${fill(e.notice.after, all)}` : wrote,
      next: fill(e.notice.next, all),
    };
  }
  if ("refused" in outcome)
    return { tone: "refused", ran: outcome.refused, wrote: say.nothing, next: fill(e.next, all) };
  return {
    tone: "ok",
    ran: fill(e.notice.cancelled ?? e.notice.ranOk, all),
    wrote: say.nothing,
    next: fill(e.next, all),
  };
}
