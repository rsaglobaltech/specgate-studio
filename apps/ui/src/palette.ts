import type { ActionId } from "@specgate-studio/protocol";
import type { Lang } from "./i18n.js";
import type { ViewId } from "./views.js";

/** What choosing a feature does in the workbench. */
export type Run =
  | { kind: "view"; view: ViewId; panel?: "fromTicket" }
  | { kind: "check" }
  | { kind: "language" }
  | { kind: "theme" }
  | { kind: "togglePanel" }
  | { kind: "toggleSidebar" };

export interface Feature {
  id: string;
  title: Record<Lang, string>;
  /** The specgate command the feature runs, as the person would type it; null when it runs none (A7). */
  command: string | null;
  run: Run;
  /** The action whose "?" explains it, when the feature writes, runs or sends (draft-help REQ-061). */
  action?: ActionId;
}

/** Every feature of the studio, as the command palette lists it (REQ-033). */
export const FEATURES: readonly Feature[] = [
  {
    id: "change.fromTicket",
    action: "propose-ticket",
    title: { en: "Open a change from a ticket", es: "Abrir un cambio desde un ticket" },
    command: "specgate propose --from-ticket <KEY>",
    run: { kind: "view", view: "changes", panel: "fromTicket" },
  },
  {
    id: "change.new",
    action: "propose",
    title: { en: "Open a new change", es: "Abrir un cambio nuevo" },
    command: "specgate propose <change-id>",
    run: { kind: "view", view: "changes" },
  },
  {
    id: "brief.draft",
    action: "draft-modules",
    title: { en: "Draft the modules", es: "Redactar los módulos" },
    command: "specgate propose --from-brief <module> --agent <agent>",
    run: { kind: "view", view: "brief" },
  },
  {
    id: "question.answer",
    action: "answer",
    title: { en: "Answer a question", es: "Responder una pregunta" },
    command: 'specgate answer <Q> "<answer>"',
    run: { kind: "view", view: "questions" },
  },
  {
    id: "question.reviewed",
    action: "answer-reviewed",
    title: {
      en: "Confirm the spec says an answer",
      es: "Confirmar que la spec dice una respuesta",
    },
    command: "specgate answer <Q> --reviewed",
    run: { kind: "view", view: "questions" },
  },
  {
    id: "gate.check",
    action: "check",
    title: { en: "Check the gate", es: "Comprobar el gate" },
    command: "specgate check",
    run: { kind: "check" },
  },
  {
    id: "requirement.build",
    action: "build",
    title: { en: "Build a requirement", es: "Construir un requisito" },
    command: "specgate harness run --req <REQ>",
    run: { kind: "view", view: "build" },
  },
  {
    id: "requirement.apply",
    action: "apply",
    title: { en: "Apply a requirement", es: "Aplicar un requisito" },
    command: "specgate apply <REQ>",
    run: { kind: "view", view: "changes" },
  },
  {
    id: "change.archive",
    action: "archive",
    title: { en: "Archive a change", es: "Archivar un cambio" },
    command: "specgate archive <change-id>",
    run: { kind: "view", view: "changes" },
  },
  {
    id: "project.status",
    title: { en: "Show what is left", es: "Ver lo que falta" },
    command: "specgate status",
    run: { kind: "view", view: "home" },
  },
  {
    id: "project.report",
    title: { en: "Open the report", es: "Abrir el informe" },
    command: "specgate report",
    run: { kind: "view", view: "report" },
  },
  {
    id: "project.matrix",
    title: { en: "Open the traceability matrix", es: "Abrir la matriz de trazabilidad" },
    command: "specgate matrix",
    run: { kind: "view", view: "traceability" },
  },
  {
    id: "view.live",
    title: { en: "Follow the harness live", es: "Seguir el harness en vivo" },
    command: null,
    run: { kind: "view", view: "live" },
  },
  {
    id: "view.explorer",
    title: { en: "Show Explorer", es: "Mostrar el Explorador" },
    command: null,
    run: { kind: "view", view: "explorer" },
  },
  {
    id: "view.help",
    title: { en: "Help: what each view does", es: "Ayuda: qué hace cada vista" },
    command: null,
    run: { kind: "view", view: "help" },
  },
  {
    id: "settings.language",
    title: { en: "Switch language (English / Spanish)", es: "Cambiar idioma (inglés / español)" },
    command: null,
    run: { kind: "language" },
  },
  {
    id: "settings.theme",
    title: { en: "Switch theme (dark / light)", es: "Cambiar tema (oscuro / claro)" },
    command: null,
    run: { kind: "theme" },
  },
  {
    id: "layout.panel",
    title: { en: "Show or hide the bottom panel", es: "Mostrar u ocultar el panel inferior" },
    command: null,
    run: { kind: "togglePanel" },
  },
  {
    id: "layout.sidebar",
    title: { en: "Show or hide the side bar", es: "Mostrar u ocultar la barra lateral" },
    command: null,
    run: { kind: "toggleSidebar" },
  },
];

/**
 * The features whose title — in the chosen language or in English — or
 * command contains the typed text, ignoring case (A8). Title matches first.
 */
export function filterFeatures(features: readonly Feature[], query: string, lang: Lang): Feature[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...features];
  const inTitle = (f: Feature) =>
    f.title[lang].toLowerCase().includes(q) || f.title.en.toLowerCase().includes(q);
  const inCommand = (f: Feature) => (f.command ?? "").toLowerCase().includes(q);
  return [...features.filter(inTitle), ...features.filter((f) => !inTitle(f) && inCommand(f))];
}
