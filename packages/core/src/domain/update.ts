import type { Lang } from "./help.js";

/**
 * The desktop app's update, step by step (draft-desktop REQ-156, A8, A9, A17):
 * offered when the studio starts, installed only once the Developer accepts
 * it, applied on the next restart — and never while a build or a write
 * command runs. The shell asks the host which step comes next; this decides
 * it, and says it in English and Spanish.
 */
export type UpdateStep =
  /** A newer release was found on start. */
  | { phase: "offered"; from: string; to: string }
  /** The Developer accepted it; `running` is the build or write running now, if any. */
  | { phase: "accepted"; from: string; to: string; running: UpdateBlocker | null }
  /** It was downloaded, its signature verified, and installed. */
  | { phase: "installed"; from: string; to: string }
  /** It was not installed: its signature did not verify, or it could not be downloaded. */
  | { phase: "refused"; from: string; to: string; reason: "signature" | "download" };

export interface UpdateDecision {
  /** Install it now: only once accepted, and with nothing running. */
  install: boolean;
  notice: Record<Lang, string>;
}

/** The next step of an update, and what the studio says about it. */
export function updateStep(step: UpdateStep): UpdateDecision {
  const { from, to } = step;
  switch (step.phase) {
    case "offered":
      return {
        install: false,
        notice: {
          en: `Specgate Studio ${to} is available — you have ${from}. Install it? It applies when the studio restarts; if you decline, it is offered again on the next start.`,
          es: `Specgate Studio ${to} está disponible — tienes la ${from}. ¿La instalas? Se aplica al reiniciar el estudio; si la rechazas, se ofrece de nuevo en el próximo inicio.`,
        },
      };
    case "accepted":
      return step.running
        ? {
            install: false,
            notice: {
              en: `${running(step.running, "en")} is running: the update to ${to} installs once it ends. Nothing is installed meanwhile.`,
              es: `${running(step.running, "es")} está en curso: la actualización a la ${to} se instala cuando termine. Mientras, no se instala nada.`,
            },
          }
        : {
            install: true,
            notice: {
              en: `Installing ${to} over ${from}…`,
              es: `Instalando la ${to} sobre la ${from}…`,
            },
          };
    case "installed":
      return {
        install: false,
        notice: {
          en: `${to} was installed over ${from}. It applies when the studio restarts; until then ${from} keeps running.`,
          es: `La ${to} se instaló sobre la ${from}. Se aplica al reiniciar el estudio; hasta entonces sigue en marcha la ${from}.`,
        },
      };
    case "refused":
      return {
        install: false,
        notice:
          step.reason === "signature"
            ? {
                en: `The update to ${to} was refused because its signature did not verify. Nothing was installed; ${from} keeps running.`,
                es: `La actualización a la ${to} se rechazó porque su firma no se verificó. No se instaló nada; sigue en marcha la ${from}.`,
              }
            : {
                en: `The update to ${to} could not be downloaded. Nothing was installed; it is offered again on the next start.`,
                es: `La actualización a la ${to} no se pudo descargar. No se instaló nada; se ofrece de nuevo en el próximo inicio.`,
              },
      };
  }
}

/** What an update waits for: the build of a requirement, or a write command (A9). */
export type UpdateBlocker = { build: string } | { command: string };

/** What runs now that an update must wait for: the build, else the write command, else nothing. */
export function updateBlocker(
  building: string | null,
  writing: string | null,
): UpdateBlocker | null {
  if (building) return { build: building };
  return writing ? { command: writing } : null;
}

function running(b: UpdateBlocker, lang: Lang): string {
  if ("build" in b)
    return lang === "en" ? `The build of ${b.build}` : `La construcción de ${b.build}`;
  return `\`${b.command}\``;
}
