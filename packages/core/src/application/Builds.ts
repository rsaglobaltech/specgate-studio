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
import { foldLive, liveQuestions, queueStarted, type LiveView } from "../domain/live.js";
import type { HarnessEventsPort } from "../ports/HarnessEventsPort.js";
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
  /** The harness's events, which Live folds (REQ-103, A9). */
  events?: HarnessEventsPort;
  /** Told what Live shows whenever it changes, while a build runs (REQ-103). */
  onLive?: (view: LiveView) => void;
  /** How often the events are read while a build runs, in ms; 250 by default. */
  pollMs?: number;
  /** The clock, in ms. */
  now?: () => number;
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
  /** The requirements to build after the current one, in order (REQ-103). */
  private queue: string[] = [];
  /** A stop after this requirement was asked (REQ-105). */
  private stopping = false;
  /** The requirements whose build the studio ended (REQ-105). */
  private readonly stopped = new Set<string>();
  /** When the run Live shows started, epoch seconds; null until the studio builds. */
  private since: number | null = null;
  private poll: ReturnType<typeof setInterval> | null = null;
  private shown = "";

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
    // One build at a time: another waits in the queue, once (REQ-103).
    if (this.current) {
      if (this.current.req !== req && !this.queue.includes(req)) this.queue.push(req);
      void this.tell();
      return { ok: true, req, queued: true };
    }
    const saved = await this.saveSpecification(req, work.specification);
    if (saved) return saved;
    this.since = Math.floor(this.now() / 1000);
    this.stopped.clear();
    this.launch(req);
    return { ok: true, req, queued: false };
  }

  /**
   * What Live shows (REQ-103): the run the studio started — or, before it
   * started one, the last run specgate recorded — folded from the harness's
   * events, with the queue the studio keeps.
   */
  async live(): Promise<LiveView> {
    const root = this.options.root ?? "";
    const read = this.options.events
      ? await this.options.events.read(root, this.since ?? 0).catch(() => null)
      : null;
    const since = this.since ?? queueStarted(read?.queue ?? null) ?? 0;
    const view = foldLive(read?.files ?? {}, since, {
      building: this.current?.req ?? null,
      queue: this.queue,
      stopping: this.stopping,
      stopped: this.stopped,
    });
    // What the agent asked, as specgate recorded it and answered it (REQ-104).
    if (view.requirements.some((r) => r.question)) {
      const questions = await this.options.sections.section("questions").catch(() => null);
      view.questions = liveQuestions(view.requirements, questions);
    }
    return view;
  }

  /** What Live shows may have changed — a question answered: it is told, if so (REQ-104). */
  refresh(): Promise<void> {
    return this.tell();
  }

  /** Live is told, when what it shows changed. */
  private async tell(): Promise<void> {
    if (!this.options.onLive) return;
    const view = await this.live();
    const text = JSON.stringify(view);
    if (text === this.shown) return;
    this.shown = text;
    this.options.onLive(view);
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }

  /** The uncommitted specification, committed before the agent's branch is cut (A6). */
  private async saveSpecification(req: string, files: string[]): Promise<BuildStart | null> {
    if (files.length === 0) return null;
    return this.commit(req, files, saveSpecification(req), [{ group: "specification", files }]);
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

  /** The host closes: the build it started is stopped, and waited for; nothing queued starts. */
  async close(): Promise<void> {
    this.queue = [];
    this.stopping = true;
    await this.current?.process?.stop();
    await this.idle();
    if (this.poll) clearInterval(this.poll);
    this.poll = null;
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
    // Live is read while it builds: the agent writes its events as it works (A9).
    if (this.options.onLive && !this.poll) {
      this.poll = setInterval(() => void this.tell(), this.options.pollMs ?? 250);
      this.poll.unref?.();
    }
    void this.tell();
    // Shown as the person would type it: `--format json` is the studio's, like `--json`.
    me.done = commands
      .track(shown(args.slice(0, 4)), false, async (output): Promise<Tracked> => {
        me.process = harness.start(args, output);
        const { exitCode, stdout } = await me.process.done;
        return { ...this.outcome(req, exitCode, stdout), action: "build", vars: { req } };
      })
      .finally(() => this.ended(me));
  }

  /**
   * A build ended: the next queued one starts — unless a stop was asked
   * (REQ-105) — and Live is told one last time once none runs.
   */
  private async ended(me: { req: string }): Promise<void> {
    this.options.onEnded?.(me.req);
    const next = this.stopping ? undefined : this.queue.shift();
    if (this.stopping) this.queue = [];
    this.stopping = false;
    // It stays the current build until the next one starts: another Build is queued meanwhile.
    if (next) {
      const files = (await this.options.git?.uncommitted(this.options.root ?? "")) ?? [];
      const saved = await this.saveSpecification(next, uncommittedWork(files).specification);
      // A commit that failed is told; what is queued after it waits for the Developer.
      if (!saved) return this.launch(next);
      this.queue = [];
    }
    if (this.current === me) this.current = null;
    if (this.poll) clearInterval(this.poll);
    this.poll = null;
    await this.tell();
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
