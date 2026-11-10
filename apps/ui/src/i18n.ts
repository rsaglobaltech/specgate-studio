/**
 * Every label of the workbench in English and Spanish (REQ-034). Spanish is
 * typed against English, so a label missing in one language does not compile.
 */
const en = {
  "view.home": "Home",
  "view.explorer": "Explorer",
  "view.brief": "Brief",
  "view.changes": "Changes",
  "view.questions": "Questions",
  "view.build": "Build",
  "view.live": "Live",
  "view.traceability": "Traceability",
  "view.report": "Report",
  "view.help": "Help",
  "view.settings": "Settings",
  "panel.terminal": "Terminal",
  "panel.gate": "Gate",
  "panel.problems": "Problems",
  "panel.agent": "Agent output",
  "panel.traceability": "Traceability",
  "panel.empty": "Nothing here yet.",
  "status.branch": "Branch",
  "status.noBranch": "no branch",
  "status.noTicket": "no ticket",
  "status.gate.passed": "Gate passed",
  "status.gate.failed": "Gate failed",
  "status.gate.running": "Gate running",
  "status.gate.notRun": "Gate not run",
  "status.progress": "{done} of {total}",
  "status.cost": "Cost",
  "palette.placeholder": "Type a feature or a command",
  "palette.none": "No feature matches.",
  "palette.search": "{project} — search a feature or a command",
  "settings.language": "Language",
  "settings.theme": "Theme",
  "settings.dark": "Dark",
  "settings.light": "Light",
  "home.requirements": "Requirements",
  "home.done": "Done",
  "home.pending": "To do",
  "home.next": "Next step",
  "home.reading": "Reading the project…",
  "explorer.files": "Files",
  "explorer.empty": "No file.",
  "editor.empty": "Open a file from Explorer, or press {key}.",
  "view.soon": "This view comes with its module; the workbench frames it now.",
  "traceability.rows": "{n} requirements",
  "ticket.title": "Open a change from a ticket",
  "ticket.body":
    "Paste a ticket key (KAN-13). specgate reads the ticket and opens a change from it.",
  "error.host": "The studio lost its host. Reload when it is back.",
  "help.button": "What does “{feature}” do?",
  "help.title": "{feature}: what it does",
  "help.close": "Close",
  "home.check": "Check the gate",
  "notice.next": "Next",
  "notice.fix": "Fix",
} as const;

export type MessageKey = keyof typeof en;
export type Lang = "en" | "es";

const es: Record<MessageKey, string> = {
  "view.home": "Inicio",
  "view.explorer": "Explorador",
  "view.brief": "Brief",
  "view.changes": "Cambios",
  "view.questions": "Preguntas",
  "view.build": "Construir",
  "view.live": "En vivo",
  "view.traceability": "Trazabilidad",
  "view.report": "Informe",
  "view.help": "Ayuda",
  "view.settings": "Configuración",
  "panel.terminal": "Terminal",
  "panel.gate": "Gate",
  "panel.problems": "Problemas",
  "panel.agent": "Salida del agente",
  "panel.traceability": "Trazabilidad",
  "panel.empty": "Aún no hay nada aquí.",
  "status.branch": "Rama",
  "status.noBranch": "sin rama",
  "status.noTicket": "sin ticket",
  "status.gate.passed": "Gate verde",
  "status.gate.failed": "Gate rojo",
  "status.gate.running": "Gate en curso",
  "status.gate.notRun": "Gate sin ejecutar",
  "status.progress": "{done} de {total}",
  "status.cost": "Coste",
  "palette.placeholder": "Escribe una función o un comando",
  "palette.none": "Ninguna función coincide.",
  "palette.search": "{project} — buscar función o comando",
  "settings.language": "Idioma",
  "settings.theme": "Tema",
  "settings.dark": "Oscuro",
  "settings.light": "Claro",
  "home.requirements": "Requisitos",
  "home.done": "Hechos",
  "home.pending": "Por hacer",
  "home.next": "Siguiente paso",
  "home.reading": "Leyendo el proyecto…",
  "explorer.files": "Archivos",
  "explorer.empty": "Ningún archivo.",
  "editor.empty": "Abre un archivo desde el Explorador, o pulsa {key}.",
  "view.soon": "Esta vista llega con su módulo; el workbench ya la enmarca.",
  "traceability.rows": "{n} requisitos",
  "ticket.title": "Abrir un cambio desde un ticket",
  "ticket.body":
    "Pega la clave de un ticket (KAN-13). specgate lee el ticket y abre un cambio con él.",
  "error.host": "El studio perdió su host. Recarga cuando vuelva.",
  "help.button": "¿Qué hace «{feature}»?",
  "help.title": "{feature}: qué hace",
  "help.close": "Cerrar",
  "home.check": "Comprobar el gate",
  "notice.next": "Siguiente",
  "notice.fix": "Solución",
};

export const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, es };

/** A label in a language, with `{name}` filled from `vars`. */
export function t(lang: Lang, key: string, vars: Record<string, string | number> = {}): string {
  const text = MESSAGES[lang][key as MessageKey] ?? MESSAGES.en[key as MessageKey] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}

/** The first language: the system's when it is Spanish or English, English otherwise (A10). */
export function firstLanguage(systemLanguages: readonly string[]): Lang {
  for (const l of systemLanguages) {
    const base = l.toLowerCase().slice(0, 2);
    if (base === "es" || base === "en") return base;
  }
  return "en";
}
