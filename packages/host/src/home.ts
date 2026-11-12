import {
  activityOf,
  agentCostOf,
  briefModuleNames,
  groupChanges,
  nextStep,
  routeOf,
  type GitPort,
  type HomeView,
  type ProjectState,
  type SpecgatePort,
} from "@specgate-studio/core";
import type { ProjectFiles } from "./files.js";

/** What Home reads beyond the sections (draft-design-conformance REQ-173). */
export interface HomeWiring {
  state: ProjectState;
  files?: ProjectFiles;
  /** specgate's `--json` answers: the changes to review, the brief's modules, the agent's cost. */
  specgate?: Pick<SpecgatePort, "call">;
  git?: Pick<GitPort, "log">;
}

/**
 * `home.get` (REQ-173): the next step as data the UI words — open questions
 * first, then a draft to review, then what `specgate status` names (A8) —
 * the route, the agent's cost and the recent activity (A9). Everything is
 * read-only; a part specgate or git cannot give is left out, never guessed.
 */
export function attachHome(
  projectDir: string,
  wiring: HomeWiring,
): { handlers: Record<string, (params: unknown) => Promise<unknown>> } {
  const call = async (args: string[]) =>
    wiring.specgate
      ? wiring.specgate.call(args).then(
          (a) => a.data,
          () => null,
        )
      : null;
  const handlers: Record<string, (params: unknown) => Promise<unknown>> = {
    "home.get": async (): Promise<HomeView> => {
      const [status, changes, questions] = await Promise.all([
        wiring.state.section("home").catch(() => null),
        wiring.state.section("changes").catch(() => null),
        wiring.state.section("questions").catch(() => null),
      ]);
      const ids = (
        ((changes as { changes?: Array<{ id?: unknown }> } | null)?.changes ?? []) as Array<{
          id?: unknown;
        }>
      )
        .map((c) => c.id)
        .filter((id): id is string => typeof id === "string");
      const [shows, report, commits, files] = await Promise.all([
        Promise.all(ids.map(async (id) => [id, await call(["change", "show", id])] as const)),
        call(["harness", "report"]),
        wiring.git?.log ? wiring.git.log(projectDir, 30).catch(() => null) : null,
        wiring.files ? wiring.files.list().catch((): string[] => []) : ([] as string[]),
      ]);
      const review = groupChanges(changes, status, Object.fromEntries(shows)).groups.review.map(
        (c) => c.id,
      );
      // The brief's modules from its own text; drafted when their draft is open or archived.
      const text =
        wiring.files && files.includes("docs/brief.md")
          ? await wiring.files.read("docs/brief.md").catch(() => "")
          : "";
      const modules = briefModuleNames(text);
      const drafted = (m: string) =>
        ids.includes(`draft-${m}`) ||
        files.some((f) => new RegExp(`^docs/specs/changes/archive/[^/]*draft-${m}/`).test(f));
      const open = (
        (questions as { questions?: { open?: unknown[] } } | null)?.questions?.open ?? []
      ).length;
      const pending = Number((status as { pending?: unknown } | null)?.pending ?? 0) || 0;
      return {
        next: nextStep(status, questions, review),
        review,
        route: routeOf({
          brief: files.includes("docs/brief.md"),
          modules: modules.length,
          undrafted: modules.filter((m) => !drafted(m)).length,
          openQuestions: open,
          toReview: review.length,
          pending,
        }),
        cost: agentCostOf(report),
        activity: activityOf(commits ?? []),
      };
    },
  };
  return { handlers };
}
