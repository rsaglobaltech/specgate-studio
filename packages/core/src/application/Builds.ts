import { commandLine, shown, type SpecgateCommand } from "../domain/command.js";
import {
  REQ_ID,
  buildList,
  harnessArgs,
  harnessReport,
  saveSpecification,
  uncommittedWork,
  type BuildList,
  type BuildStart,
  type FileGroup,
  type Resolution,
} from "../domain/build.js";
import { groupChanges, changeIds } from "../domain/changes.js";
import type { SpecgateAnswer, SpecgatePort } from "../ports/SpecgatePort.js";
import type { GitPort, GitWriter } from "../ports/GitPort.js";
import type { BuildPort, BuildProcess } from "../ports/BuildPort.js";
import type { Commands, Tracked } from "./Commands.js";
import type { SectionSource } from "./Changes.js";

export interface BuildsOptions {
  /** specgate answering `--json`: the reads Build makes. */
  specgate: Pick<SpecgatePort, "call">;
  /** The sections ProjectState keeps: `home` is `status --json`, `changes` is `change list`. */
  sections: SectionSource;
  /** The project's folder. */
  root?: string;
  /** Its git: what is uncommitted, and the commit or stash the Developer confirms. */
  git?: GitPort & GitWriter;
  /** Runs `specgate harness run` (A5). */
  harness?: BuildPort;
  /** Tells each run — the commit, the build — with its notice (help REQ-063). */
  commands?: Pick<Commands, "track">;
  /** Told when a build ends: what it changed is read again. */
  onEnded?: (req: string) => void;
}

/** Why Build waits, in the words REQ-102 asks for. */
const WAITS =
  "Build waits: these uncommitted files are not the specification. The agent works on its own branch from the last commit and would leave them out. Commit them, stash them, or ignore them.";

/** A file group as a notice names it: `src/orders (200 files)`. */
const named = (g: FileGroup) =>
  `${g.group} (${g.files.length} file${g.files.length === 1 ? "" : "s"})`;

/** git's command as the person would type it; a value a shell would split, quoted. */
const gitShown = (args: readonly string[]) => shown(args).replace(/^specgate /, "git ");

/**
 * Build and Live (draft-build-live). Build lists what is ready, its estimate
 * and who codes (REQ-101): `status` and `change list` from the kept sections,
 * each change's approval from `change show`, specgate's estimate from
 * `harness report` and the agent from `config list` — reads on the
 * allow-list, each with `--json`.
 *
 * Pressing Build on a ready requirement (REQ-102) waits while uncommitted
 * files that are not the specification would be left out of the agent's
 * branch, and says why; the commit or stash the Developer confirms runs, told
 * as a run, and the build starts. Uncommitted specification is committed
 * first, as specgate's harness starts only from a clean working copy.
 */
export class Builds {
  private current: { req: string; process: BuildProcess | null; done: Promise<unknown> } | null =
    null;

  constructor(private readonly options: BuildsOptions) {}

  async list(): Promise<BuildList> {
    const [status, changes] = await Promise.all([
      this.options.sections.section("home"),
      this.options.sections.section("changes"),
    ]);
    const shows: Record<string, unknown> = {};
    const [report, config] = await Promise.all([
      this.data({ name: "harness-report" }),
      this.data({ name: "config-list" }),
      ...changeIds(changes).map(async (change) => {
        shows[change] = await this.data({ name: "change-show", change });
      }),
    ]);
    // A draft no person approved waits for its review (A2).
    const review = new Set(groupChanges(changes, status, shows).groups.review.map((c) => c.id));
    const settings = (config as { config?: Record<string, unknown> } | null)?.config ?? {};
    return buildList(
      status,
      review,
      report,
      Object.fromEntries(
        Object.entries(settings).filter((e): e is [string, string] => typeof e[1] === "string"),
      ),
    );
  }

  /** The requirement being built, or null. */
  get building(): string | null {
    return this.current?.req ?? null;
  }

  /**
   * Build `req` (REQ-102): refused when it is not ready or no agent is set;
   * waits, saying why, while uncommitted files that are not the specification
   * would be left out; otherwise the uncommitted specification is committed
   * and `specgate harness run --req <req>` starts.
   */
  async start(req: string): Promise<BuildStart> {
    const refused = await this.refusal(req);
    if (refused) return refused;
    const { git, root } = this.wired();
    const files = await git.uncommitted(root);
    if (files === null)
      return {
        ok: false,
        code: "build_no_git",
        req,
        message: "This folder is not a git repository: the agent builds on a branch of its own.",
      };
    const work = uncommittedWork(files);
    if (work.other.total > 0)
      return { ok: false, code: "build_waits", req, message: WAITS, waits: work.other };
    if (this.current)
      return {
        ok: false,
        code: "write_busy",
        req,
        message: `${shown(harnessArgs(this.current.req)!.slice(0, 4))} is running: wait for it to end.`,
      };
    if (work.specification.length > 0) {
      const saved = await this.commit(req, work.specification, saveSpecification(req), [
        { group: "specification", files: work.specification },
      ]);
      if (saved) return saved;
    }
    this.launch(req);
    return { ok: true, req, queued: false };
  }

  /**
   * What the Developer confirmed about the work Build waits on (REQ-102, A7):
   * a commit of the files shown with their message, or a stash; then the
   * build starts. Ignore is refused: specgate 0.33.2's harness will not run
   * while any file is uncommitted.
   */
  async resolve(req: string, resolution: Resolution): Promise<BuildStart> {
    const refused = await this.refusal(req);
    if (refused) return refused;
    if (resolution.choice === "ignore")
      return {
        ok: false,
        code: "build_ignore_unsupported",
        req,
        message:
          "specgate 0.33.2's harness refuses to start while any file is uncommitted: commit or stash them.",
      };
    if (resolution.choice === "commit" && !resolution.message.trim())
      return {
        ok: false,
        code: "build_no_message",
        req,
        message: "A commit needs a message.",
      };
    const { git, root } = this.wired();
    const work = uncommittedWork((await git.uncommitted(root)) ?? []);
    if (resolution.choice === "commit") {
      const files = work.other.groups.flatMap((g) => g.files);
      const failed = await this.commit(req, files, resolution.message.trim(), work.other.groups);
      if (failed) return failed;
    } else {
      const failed = await this.stash(req, work.other.groups);
      if (failed) return failed;
    }
    return this.start(req);
  }

  /** Resolves once no build runs: for tests and for closing the host. */
  async idle(): Promise<void> {
    while (this.current) await this.current.done;
  }

  /** The host closes: the build it started is stopped, and waited for. */
  async close(): Promise<void> {
    await this.current?.process?.stop();
    await this.idle();
  }

  private async refusal(req: string): Promise<BuildStart | null> {
    const list = await this.list();
    if (!REQ_ID.test(req) || !list.ready.some((r) => r.id === req)) {
      const waiting = list.waiting.find((w) => w.id === req);
      return {
        ok: false,
        code: "build_not_ready",
        req,
        message: waiting
          ? `${req} is not ready: ${waiting.why === "question" ? `it waits for ${waiting.question}` : waiting.why === "review" ? `its draft ${waiting.change} waits for review` : "it has no scenario"}.`
          : `${req} is not a requirement ready to build.`,
      };
    }
    if (!list.agent)
      return {
        ok: false,
        code: "build_no_agent",
        req,
        message: `No agent is set to build it. Set one with ${list.setAgent}.`,
      };
    return null;
  }

  private wired() {
    const { git, root, harness, commands } = this.options;
    if (!git || root === undefined || !harness || !commands)
      throw new Error("Build is not wired to git and specgate's harness in this host.");
    return { git, root, harness, commands };
  }

  /** One commit of `files`, told as a run; a refusal when it fails. */
  private async commit(
    req: string,
    files: string[],
    message: string,
    groups: FileGroup[],
  ): Promise<BuildStart | null> {
    const { git, root, commands } = this.wired();
    const run = await commands.track(
      `${gitShown(["commit", "-m", message])} -- (${files.length} file${files.length === 1 ? "" : "s"})`,
      true,
      async (output): Promise<Tracked> => {
        const exitCode = await git.commit(root, files, message, output);
        return {
          exitCode,
          action: "build-commit",
          vars: { req, count: String(files.length) },
          written: exitCode === 0 ? groups.map(named) : [],
        };
      },
    );
    return this.gitFailed(req, run, "commit");
  }

  private async stash(req: string, groups: FileGroup[]): Promise<BuildStart | null> {
    const { git, root, commands } = this.wired();
    const count = groups.reduce((n, g) => n + g.files.length, 0);
    const run = await commands.track(
      gitShown(["stash", "push", "--include-untracked"]),
      true,
      async (output): Promise<Tracked> => {
        const exitCode = await git.stash(root, `specgate-studio: before building ${req}`, output);
        return {
          exitCode,
          action: "build-stash",
          vars: { req, count: String(count) },
          written: exitCode === 0 ? groups.map(named) : [],
        };
      },
    );
    return this.gitFailed(req, run, "stash");
  }

  private gitFailed(
    req: string,
    run: Awaited<ReturnType<Commands["track"]>>,
    what: string,
  ): BuildStart | null {
    if (!run.ok) return { ok: false, code: "write_busy", req, message: run.message };
    if (run.exitCode === 0) return null;
    return {
      ok: false,
      code: "build_git_failed",
      req,
      message: `git could not ${what} (exit ${run.exitCode}): its output is in the terminal.`,
    };
  }

  /** `specgate harness run --req <req>`, told as a run until it ends, with its notice. */
  private launch(req: string): void {
    const { harness, commands } = this.wired();
    const args = harnessArgs(req)!;
    const me: { req: string; process: BuildProcess | null; done: Promise<unknown> } = {
      req,
      process: null,
      done: Promise.resolve(),
    };
    this.current = me;
    // Shown as the person would type it: `--format json` is the studio's, like `--json`.
    me.done = commands
      .track(shown(args.slice(0, 4)), false, async (output): Promise<Tracked> => {
        me.process = harness.start(args, output);
        const { exitCode, stdout } = await me.process.done;
        return { ...this.outcome(req, exitCode, stdout), action: "build", vars: { req } };
      })
      .finally(() => {
        if (this.current === me) this.current = null;
        this.options.onEnded?.(req);
      });
  }

  /** How a build ended (help REQ-063): passed, how it ended otherwise, or specgate's refusal. */
  private outcome(
    req: string,
    exitCode: number,
    stdout: string,
  ): Pick<Tracked, "exitCode" | "findings" | "ended"> {
    const report = harnessReport(stdout);
    if (!report) return { exitCode: exitCode === 0 ? 1 : exitCode };
    const mine = report.results.find((r) => r.requirement === req) ?? report.results[0];
    if (report.findings.some((f) => f.severity === "error"))
      return { exitCode: exitCode || 1, findings: report.findings };
    if (!mine) return { exitCode: exitCode || 1 };
    if (mine.result === "pass") return { exitCode: 0 };
    return {
      exitCode: exitCode || 1,
      ended: { code: mine.result, message: mine.error ?? mine.question ?? "" },
    };
  }

  /** A read's data, or null when specgate could not answer it. */
  private async data(command: SpecgateCommand): Promise<unknown> {
    const line = commandLine(command);
    if (!line || line.write) return null;
    return this.options.specgate
      .call(line.args)
      .then((a: SpecgateAnswer) => a.data)
      .catch(() => null);
  }
}
