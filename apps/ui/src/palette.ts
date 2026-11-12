import type { ActionId } from "@specgate-studio/protocol";
import type { Lang } from "./i18n.js";
import type { ViewId } from "./views.js";

/** What choosing a feature does in the workbench. */
export type Run =
  | { kind: "view"; view: ViewId; panel?: "fromTicket" }
  | { kind: "check" }
  | { kind: "language" }
  | { kind: "theme" }
  | { kind: "billing" }
  | { kind: "togglePanel" }
  | { kind: "toggleSidebar" }
  | { kind: "openFile" }
  | { kind: "newTerminal" }
  | { kind: "palette" }
  | { kind: "split"; side: "right" | "left" | "down" | "up" }
  | { kind: "panelPosition"; position: "bottom" | "right" | "left" }
  | { kind: "maximizePanel" }
  | { kind: "toggleAgent" }
  | { kind: "buildReq"; req: string };

export interface Feature {
  id: string;
  title: Record<Lang, string>;
  /** The specgate command the feature runs, as the person would type it; null when it runs none (A7). */
  command: string | null;
  run: Run;
  /** The action whose "?" explains it, when the feature writes, runs or sends (draft-help REQ-061). */
  action?: ActionId;
  /** Its area, as the palette groups it (draft-design-conformance REQ-176, A15). */
  area: Area;
}

/** The palette's groups, in order (A15). */
export const AREAS = ["spec", "build", "project"] as const;
export type Area = (typeof AREAS)[number];

/** Every feature of the studio, as the command palette lists it (REQ-033). */
export const FEATURES: readonly Feature[] = [
  {
    id: "change.fromTicket",
    area: "spec",
    action: "propose-ticket",
    title: { en: "Open a change from a ticket", es: "Abrir un cambio desde un ticket" },
    command: "specgate propose --from-ticket <KEY>",
    run: { kind: "view", view: "changes", panel: "fromTicket" },
  },
  {
    id: "change.new",
    area: "spec",
    action: "propose",
    title: { en: "Open a new change", es: "Abrir un cambio nuevo" },
    command: "specgate propose <change-id>",
    run: { kind: "view", view: "changes" },
  },
  {
    id: "brief.draft",
    area: "spec",
    action: "draft-modules",
    title: { en: "Draft the modules", es: "Redactar los módulos" },
    command: "specgate propose --from-brief <module> --agent <agent>",
    run: { kind: "view", view: "brief" },
  },
  {
    id: "question.answer",
    area: "spec",
    action: "answer",
    title: { en: "Answer a question", es: "Responder una pregunta" },
    command: 'specgate answer <Q> "<answer>"',
    run: { kind: "view", view: "questions" },
  },
  {
    id: "question.reviewed",
    area: "spec",
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
    area: "build",
    action: "check",
    title: { en: "Check the gate", es: "Comprobar el gate" },
    command: "specgate check",
    run: { kind: "check" },
  },
  {
    id: "requirement.build",
    area: "build",
    action: "build",
    title: { en: "Build a requirement", es: "Construir un requisito" },
    command: "specgate harness run --req <REQ>",
    run: { kind: "view", view: "build" },
  },
  {
    id: "requirement.apply",
    area: "build",
    action: "apply",
    title: { en: "Apply a requirement", es: "Aplicar un requisito" },
    command: "specgate apply <REQ>",
    run: { kind: "view", view: "changes" },
  },
  {
    id: "change.archive",
    area: "spec",
    action: "archive",
    title: { en: "Archive a change", es: "Archivar un cambio" },
    command: "specgate archive <change-id>",
    run: { kind: "view", view: "changes" },
  },
  {
    id: "project.status",
    area: "project",
    title: { en: "Show what is left", es: "Ver lo que falta" },
    command: "specgate status",
    run: { kind: "view", view: "home" },
  },
  {
    id: "project.report",
    area: "build",
    title: { en: "Open the report", es: "Abrir el informe" },
    command: "specgate report",
    run: { kind: "view", view: "report" },
  },
  {
    id: "project.matrix",
    area: "build",
    title: { en: "Open the traceability matrix", es: "Abrir la matriz de trazabilidad" },
    command: "specgate matrix",
    run: { kind: "view", view: "traceability" },
  },
  {
    id: "view.live",
    area: "build",
    title: { en: "Follow the harness live", es: "Seguir el harness en vivo" },
    command: null,
    run: { kind: "view", view: "live" },
  },
  {
    id: "view.explorer",
    area: "project",
    title: { en: "Show Explorer", es: "Mostrar el Explorador" },
    command: null,
    run: { kind: "view", view: "explorer" },
  },
  {
    id: "view.help",
    area: "project",
    title: { en: "Help: what each view does", es: "Ayuda: qué hace cada vista" },
    command: null,
    run: { kind: "view", view: "help" },
  },
  {
    id: "settings.language",
    area: "project",
    title: { en: "Switch language (English / Spanish)", es: "Cambiar idioma (inglés / español)" },
    command: null,
    run: { kind: "language" },
  },
  {
    id: "settings.theme",
    area: "project",
    title: { en: "Switch theme (dark / light)", es: "Cambiar tema (oscuro / claro)" },
    command: null,
    run: { kind: "theme" },
  },
  {
    // The agent's dollars as what the Developer pays, or ≈ API price on a subscription (demo-findings REQ-211).
    id: "settings.billing",
    area: "project",
    action: "billing",
    title: {
      en: "Billing: pay per use of the API",
      es: "Facturación: pago por uso de la API",
    },
    command: null,
    run: { kind: "billing" },
  },
  {
    id: "layout.panel",
    area: "project",
    // Always there (draft-workbench-v2 REQ-184): folded to its tabs, never hidden.
    title: { en: "Fold or unfold the bottom panel", es: "Plegar o desplegar el panel inferior" },
    command: null,
    run: { kind: "togglePanel" },
  },
  {
    id: "layout.sidebar",
    area: "project",
    title: { en: "Show or hide the side bar", es: "Mostrar u ocultar la barra lateral" },
    command: null,
    run: { kind: "toggleSidebar" },
  },
  {
    id: "file.open",
    area: "project",
    title: { en: "Open a file", es: "Abrir un archivo" },
    command: null,
    run: { kind: "openFile" },
  },
  {
    id: "terminal.new",
    area: "project",
    title: { en: "New terminal", es: "Nuevo terminal" },
    command: null,
    run: { kind: "newTerminal" },
  },
  // Editor splits, the panel's place and the agent panel (draft-workbench-v2 REQ-188, REQ-190, A18, A22).
  ...(
    [
      ["right", "Split Editor Right", "Dividir el editor a la derecha"],
      ["left", "Split Editor Left", "Dividir el editor a la izquierda"],
      ["down", "Split Editor Down", "Dividir el editor abajo"],
      ["up", "Split Editor Up", "Dividir el editor arriba"],
    ] as const
  ).map(([side, en, es]): Feature => ({
    id: `editor.split.${side}`,
    area: "project",
    action: "editor-split",
    title: { en, es },
    command: null,
    run: { kind: "split", side },
  })),
  ...(
    [
      ["bottom", "Panel Position: Bottom", "Posición del panel: abajo"],
      ["right", "Panel Position: Right", "Posición del panel: derecha"],
      ["left", "Panel Position: Left", "Posición del panel: izquierda"],
    ] as const
  ).map(([position, en, es]): Feature => ({
    id: `panel.position.${position}`,
    area: "project",
    action: "panel-position",
    title: { en, es },
    command: null,
    run: { kind: "panelPosition", position },
  })),
  {
    id: "panel.maximize",
    area: "project",
    action: "panel-maximize",
    title: { en: "Maximize Panel", es: "Maximizar el panel" },
    command: null,
    run: { kind: "maximizePanel" },
  },
  {
    id: "layout.agent",
    area: "project",
    title: { en: "View: Toggle Agent Panel", es: "Ver: Mostrar u ocultar el agente" },
    command: null,
    run: { kind: "toggleAgent" },
  },
  {
    id: "palette.open",
    area: "project",
    title: { en: "Command palette", es: "Paleta de comandos" },
    command: null,
    run: { kind: "palette" },
  },
];

/**
 * The menu bar (draft-design-conformance REQ-172, A5): File, Spec, Build,
 * Terminal, Help, each entry a feature of the palette. The browser draws it in
 * the page; the desktop app builds the operating system's menu from the same
 * list.
 */
export const MENUS: ReadonlyArray<{ id: string; title: Record<Lang, string>; items: string[] }> = [
  {
    id: "file",
    title: { en: "File", es: "Archivo" },
    items: ["file.open", "view.explorer", "settings.language", "settings.theme"],
  },
  {
    id: "spec",
    title: { en: "Spec", es: "Spec" },
    items: [
      "change.new",
      "change.fromTicket",
      "brief.draft",
      "question.answer",
      "question.reviewed",
      "change.archive",
      "project.status",
    ],
  },
  {
    id: "build",
    title: { en: "Build", es: "Construir" },
    items: [
      "requirement.build",
      "requirement.apply",
      "gate.check",
      "view.live",
      "project.matrix",
      "project.report",
    ],
  },
  {
    id: "terminal",
    title: { en: "Terminal", es: "Terminal" },
    items: [
      "terminal.new",
      "layout.panel",
      "panel.maximize",
      "panel.position.bottom",
      "panel.position.right",
      "panel.position.left",
    ],
  },
  {
    id: "help",
    title: { en: "Help", es: "Ayuda" },
    items: ["view.help", "palette.open", "layout.sidebar", "layout.agent"],
  },
];

/**
 * "Build REQ-000" when the typed text names a requirement (draft-live-polish
 * REQ-101, A10): Build opened on it, the one way to name the adoption
 * baseline, and a short way to any other.
 */
export function requirementFeatures(query: string): Feature[] {
  const id = /\bREQ-(\d+)\b/i.exec(query)?.[1];
  if (id === undefined) return [];
  const req = `REQ-${id}`;
  return [
    {
      id: `requirement.build.${req}`,
      area: "build",
      action: "build",
      title: { en: `Build ${req}`, es: `Construir ${req}` },
      command: `specgate harness run --req ${req}`,
      run: { kind: "buildReq", req },
    },
  ];
}

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
