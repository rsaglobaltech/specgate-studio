import type { Lang } from "../i18n.js";

/**
 * The Brief view's and Problems' labels in English and Spanish (draft-brief,
 * REQ-034). Spanish is typed against English: a label missing in one does
 * not compile.
 */
const en = {
  "problems.none": "No problem: the brief's last check found nothing.",
  "problems.fix": "Fix",
  "problems.feature": "The brief's checks",
  "problems.help": "What the brief's checks do",
  "brief.intro":
    "docs/brief.md, the brief the modules are drafted from. Edit it as markdown in the editor: its checks run on every save and show in Problems.",
  "brief.open": "Open docs/brief.md",
  "brief.modules": "Modules",
  "brief.none": "The brief lists no module yet.",
  "brief.unreadable": "specgate could not read the brief's modules.",
  "brief.drafted": "drafted",
  "brief.toDraft": "to draft",
  "brief.agent": "Agent: {agent}",
  "brief.noAgent": "No agent set: `specgate agents init --tool claude` sets one.",
  "brief.draft": "Draft the modules",
  "brief.draftHelp": 'What "Draft the modules" does',
  "form.head": "BRIEF · FORM",
  "form.help": "What the brief is and what is done with it",
  "form.product": "The product in one sentence",
  "form.actors": "Who uses it and where",
  "form.addActor": "+ actor",
  "form.actorPrompt": "Name · surfaces (web, mobile, api, desktop)",
  "form.modules": "Modules",
  "form.addModule": "+ module",
  "form.modulePrompt": "A module's name: lowercase words with dashes",
  "form.rules": "Rules of «{module}»",
  "form.examples": "Examples",
  "form.questions": "Open questions",
  "form.oneEach": "One per line.",
  "form.save": "Save the form",
  "form.saveFeature": "Save the brief's form",
  "form.unread": "specgate could not read docs/brief.md as a form.",
  "form.client": "Have the client's text?",
  "form.clientBody":
    "Paste it and the agent fills the form. You review it before anything is saved.",
  "form.paste": "Paste the client's text",
  "form.pasteFeature": "Propose the form from the client's text",
  "form.propose": "Propose the form",
  "form.proposing": "The agent is reading the client's text…",
  "form.cancel": "Cancel",
  "form.proposal": "[ PROPOSAL · NOTHING SAVED YET ]",
  "form.proposalBody": "Accept writes it into docs/brief.md; Discard leaves the file as it is.",
  "form.accept": "Accept",
  "form.discard": "Discard",
};

const es: Record<keyof typeof en, string> = {
  "problems.none": "Ningún problema: la última comprobación del brief no encontró nada.",
  "problems.fix": "Arreglo",
  "problems.feature": "Las comprobaciones del brief",
  "problems.help": "Qué hacen las comprobaciones del brief",
  "brief.intro":
    "docs/brief.md, el brief del que se redactan los módulos. Edítalo como markdown en el editor: sus comprobaciones se ejecutan cada vez que guardas y aparecen en Problemas.",
  "brief.open": "Abrir docs/brief.md",
  "brief.modules": "Módulos",
  "brief.none": "El brief no lista ningún módulo todavía.",
  "brief.unreadable": "specgate no pudo leer los módulos del brief.",
  "brief.drafted": "redactado",
  "brief.toDraft": "por redactar",
  "brief.agent": "Agente: {agent}",
  "brief.noAgent": "Sin agente: `specgate agents init --tool claude` configura uno.",
  "brief.draft": "Redactar los módulos",
  "brief.draftHelp": 'Qué hace "Redactar los módulos"',
  "form.head": "BRIEF · FORMULARIO",
  "form.help": "Qué es el brief y qué se hace con él",
  "form.product": "El producto en una frase",
  "form.actors": "Quién lo usa y dónde",
  "form.addActor": "+ actor",
  "form.actorPrompt": "Nombre · superficies (web, mobile, api, desktop)",
  "form.modules": "Módulos",
  "form.addModule": "+ módulo",
  "form.modulePrompt": "El nombre del módulo: palabras en minúscula con guiones",
  "form.rules": "Reglas de «{module}»",
  "form.examples": "Ejemplos",
  "form.questions": "Preguntas abiertas",
  "form.oneEach": "Una por línea.",
  "form.save": "Guardar el formulario",
  "form.saveFeature": "Guardar el formulario del brief",
  "form.unread": "specgate no pudo leer docs/brief.md como formulario.",
  "form.client": "¿Tienes el texto del cliente?",
  "form.clientBody": "Pégalo y el agente rellena el formulario. Tú revisas antes de guardar.",
  "form.paste": "Pegar el texto del cliente",
  "form.pasteFeature": "Proponer el formulario desde el texto del cliente",
  "form.propose": "Proponer el formulario",
  "form.proposing": "El agente está leyendo el texto del cliente…",
  "form.cancel": "Cancelar",
  "form.proposal": "[ PROPUESTA · NADA GUARDADO AÚN ]",
  "form.proposalBody": "Aceptar la escribe en docs/brief.md; Descartar deja el archivo como está.",
  "form.accept": "Aceptar",
  "form.discard": "Descartar",
};

export type BriefKey = keyof typeof en;

export function bt(lang: Lang, key: BriefKey, vars?: Record<string, string | number>): string {
  const text = (lang === "es" ? es : en)[key];
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars?.[k] ?? `{${k}}`));
}
