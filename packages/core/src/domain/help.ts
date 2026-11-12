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
      does: "Would build {req} anyway, from the last commit: the agent's branch would leave the uncommitted files out, and they would stay as they are.",
      command: "specgate harness run --req {req}",
      files: "None of the files shown; the build's own, on its branch.",
      doesNot:
        "specgate 0.33.2's harness refuses to start while any file is uncommitted, so the studio cannot ignore them yet: commit or stash them.",
      next: "Commit or stash the files shown, then build {req}.",
      notice: {
        ranOk: "`{command}` built {req} without the uncommitted files.",
        next: "specgate check",
      },
    },
    es: {
      does: "Construiría {req} igualmente, desde el último commit: la rama del agente dejaría fuera los archivos sin commit, que quedarían como están.",
      command: "specgate harness run --req {req}",
      files: "Ninguno de los archivos mostrados; los de la construcción, en su rama.",
      doesNot:
        "El harness de specgate 0.33.2 se niega a empezar mientras haya archivos sin commit, así que el studio aún no puede ignorarlos: haz commit de ellos o apártalos en el stash.",
      next: "Haz commit o stash de los archivos mostrados y después construye {req}.",
      notice: {
        ranOk: "`{command}` construyó {req} sin los archivos sin commit.",
        next: "specgate check",
      },
    },
  },
  "build-stop-after": {
    en: {
      does: "Lets {req} finish — its agent, its gate and its branch — and then starts nothing else: the requirements queued after it are left unbuilt.",
      command:
        "None of specgate's: the studio does not start `specgate harness run` for what is queued.",
      files: "None besides what {req}'s build writes on its branch.",
      doesNot:
        "It does not interrupt {req}, and it asks no confirmation: nothing running is ended.",
      next: "Build the queued requirements again from Build when you want them.",
      notice: {
        ranOk: "{req} finished; what was queued after it ({queued}) was not started.",
        next: "specgate check",
      },
    },
    es: {
      does: "Deja que {req} termine — su agente, su gate y su rama — y después no empieza nada más: los requisitos en cola tras él quedan sin construir.",
      command:
        "Ninguno de specgate: el studio no inicia `specgate harness run` para lo que está en cola.",
      files: "Ninguno aparte de lo que la construcción de {req} escribe en su rama.",
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
};

export type HelpVars = Partial<
  Record<
    "req" | "change" | "module" | "key" | "q" | "count" | "queued" | "agent" | "path" | "to",
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
  },
  es: {
    "file-new": "creado",
    "folder-new": "creado",
    "file-rename": "renombrado",
    "file-delete": "borrado",
    "file-delete-permanent": "borrado",
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
