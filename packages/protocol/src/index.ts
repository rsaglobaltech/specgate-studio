/**
 * The JSON-RPC contract between the UI and the core host (REQ-001): types only.
 * The UI imports this package and never core, host or an adapter (ADR-0001).
 */
import type {
  Annotations,
  ActionId,
  ArchivePreview,
  ChangeCard,
  ChangeGroup,
  ChangesView,
  Finding,
  TicketReview,
  CommandEvent,
  FolderKind,
  GitState,
  RecentProject,
  Explanation,
  HelpVars,
  Lang,
  Notice,
  RunResult,
  Section,
  SectionData,
  SpecgateCommand,
  UncommittedGroup,
  WorkspaceState,
  AdoptPreview,
  Area,
  InitAnswers,
  ReadyItem,
  BuildItem,
  BuildList,
  BuildStart,
  StopResult,
  FileGroup,
  Uncommitted,
  Estimate,
  WaitReason,
  WaitingItem,
  LiveLine,
  LiveQuestion,
  LiveRequirement,
  LiveState,
  LiveStep,
  LiveView,
  StepResult,
  Usage,
  BriefModule,
  BriefView,
  DraftResult,
} from "@specgate-studio/core";

export type { CommandEvent, RunResult, Section, SectionData, SpecgateCommand };
/** What the editor shows over a file (draft-editor). */
export type { Annotations };
/** The open folder (draft-workspace): its kind, git state and the recent projects. */
export type { FolderKind, GitState, RecentProject, UncommittedGroup, WorkspaceState };
/** What every action says about itself (draft-help). */
export type { ActionId, Explanation, HelpVars, Lang, Notice };
/** The Changes view (draft-changes). */
export type { ArchivePreview, ChangeCard, ChangeGroup, ChangesView, Finding, TicketReview };
/** Setting up a folder that is no project yet (draft-project-setup). */
export type { AdoptPreview, Area, InitAnswers, ReadyItem };
/** Build and Live (draft-build-live). */
export type {
  BuildItem,
  BuildList,
  BuildStart,
  StopResult,
  Estimate,
  FileGroup,
  Uncommitted,
  WaitReason,
  WaitingItem,
  LiveLine,
  LiveQuestion,
  LiveRequirement,
  LiveState,
  LiveStep,
  LiveView,
  StepResult,
  Usage,
};
/** The Brief view (draft-brief). */
export type { BriefModule, BriefView, DraftResult };

/** What the UI may ask, and what it gets back. */
export interface Requests {
  "project.open": { params: Record<string, never>; result: ProjectOpened };
  "section.get": { params: { section: Section }; result: SectionData };
  "command.run": { params: SpecgateCommand; result: RunResult };
  /** What kind of folder is open, its branch, team, ticket and uncommitted files (REQ-021 … REQ-025). */
  "workspace.get": { params: Record<string, never>; result: WorkspaceState };
  /** The Developer's last 10 projects, the most recent first (REQ-026). */
  "recent.list": { params: Record<string, never>; result: RecentProject[] };
  /** Open a recent project in its own host, or answer the one already open (REQ-026). */
  "recent.open": { params: { path: string }; result: { url: string; reused: boolean } };
  /** The project's files, relative with `/`, as Explorer lists them (draft-workbench REQ-032). */
  "files.list": { params: Record<string, never>; result: string[] };
  /** The "?" of an action: its five parts and their labels; runs nothing (draft-help REQ-061). */
  "help.explain": {
    params: { action: ActionId; lang: Lang; vars?: HelpVars };
    result: { labels: Record<keyof Explanation, string>; explanation: Explanation };
  };
  /** Save a file: only when the person saves (draft-editor REQ-045). */
  "file.write": { params: { path: string; text: string }; result: { path: string } };
  /** A file's findings and blocking questions (draft-editor REQ-043, REQ-044). */
  "file.annotations": { params: { path: string; text?: string }; result: Annotations };
  /** A terminal of the Developer's: their shell in the project's folder (draft-terminal REQ-051). */
  "terminal.open": { params: { cols: number; rows: number }; result: { id: string; name: string } };
  "terminal.input": { params: { id: string; data: string }; result: Record<string, never> };
  "terminal.resize": {
    params: { id: string; cols: number; rows: number };
    result: Record<string, never>;
  };
  "terminal.close": { params: { id: string }; result: Record<string, never> };
  "terminal.list": { params: Record<string, never>; result: Array<{ id: string; name: string }> };
  /** What a terminal printed, its last 10,000 lines (REQ-056). */
  "terminal.scrollback": { params: { id: string }; result: { data: string } };
  /** A file of the project, as text. */
  "file.read": { params: { path: string }; result: { path: string; text: string } };
  /** Every open change in its group: to review, in progress, ready to archive (draft-changes REQ-081). */
  "changes.get": { params: Record<string, never>; result: ChangesView };
  /** A ticket's review and what its confirmation runs; runs nothing that writes (REQ-084). */
  "changes.ticket": { params: { key: string }; result: TicketReview };
  /** What the five questions offer, and the folder's name (draft-project-setup REQ-111). */
  "setup.options": {
    params: Record<string, never>;
    result: {
      kinds: string[];
      stacks: Array<{ id: string; label: string }>;
      agents: Array<{ id: string; label: string }>;
      architectures: string[];
      name: string;
    };
  };
  /** The config and commands the answers make; runs nothing (SCN-332). */
  "setup.plan": {
    params: InitAnswers;
    result: { problem: string | null; config: string; commands: string[] };
  };
  /** Create the project in the open folder with `specgate init` (REQ-111). */
  "setup.create": { params: InitAnswers; result: RunResult };
  /** What adopting the folder writes and saves (REQ-112, REQ-113). */
  "setup.preview": { params: Record<string, never>; result: AdoptPreview };
  /** Tests, Agent, Architecture, CI gate: set or not (REQ-114). */
  "setup.readiness": { params: Record<string, never>; result: ReadyItem[] };
  /** The areas adoption wrote to `docs/specs/adoption.md` (REQ-115). */
  "setup.areas": {
    params: Record<string, never>;
    result: { adopted: boolean; byKind: boolean; areas: Area[] };
  };
  /** What is ready to build, its estimate and who codes; runs nothing (draft-build-live REQ-101). */
  "build.get": { params: Record<string, never>; result: BuildList };
  /** Build one requirement, or say why it waits; runs nothing while it waits (REQ-102). */
  "build.start": { params: { req: string }; result: BuildStart };
  /** What the Developer confirmed about the work Build waits on, then the build (REQ-102, A7). */
  "build.resolve": {
    params:
      | { req: string; choice: "commit"; message: string }
      | { req: string; choice: "stash" | "ignore" };
    result: BuildStart;
  };
  /** What Live shows: the steps, the agent's output, the queue, cost and tokens (REQ-103). */
  "live.get": { params: Record<string, never>; result: LiveView };
  /** Stop after this requirement, or now — sent once confirmed (REQ-105). */
  "build.stop": { params: { now: boolean }; result: StopResult };
  /** What the brief's last check found, for Problems (draft-brief REQ-072). */
  "problems.get": { params: Record<string, never>; result: Finding[] };
  /** The brief's modules, where each stands, and the project's agent; runs nothing (REQ-073). */
  "brief.get": { params: Record<string, never>; result: BriefView };
  /** "Draft the modules": each module not drafted yet with the agent, one at a time (REQ-073). */
  "brief.draft": { params: Record<string, never>; result: DraftResult };
}

/** What the host tells every connected UI, unasked. */
export interface Notifications {
  "state.changed": { sections: Section[] };
  "command.event": CommandEvent;
  /** A terminal's output, as it is written (draft-terminal). */
  "terminal.data": { id: string; data: string };
  "terminal.exit": { id: string; code: number };
  /** The folder changed: its new state (REQ-023). */
  "workspace.changed": { state: WorkspaceState };
  /** What Live shows changed: every open UI sees the same (draft-build-live REQ-103). */
  "live.changed": LiveView;
  /** The brief was saved and checked: what Problems lists now (draft-brief REQ-072). */
  "problems.changed": { findings: Finding[] };
}

export interface ProjectOpened {
  project: string;
  sections: Partial<Record<Section, SectionData>>;
}

export type Method = keyof Requests;

export interface RpcRequest<M extends Method = Method> {
  jsonrpc: "2.0";
  id: number;
  method: M;
  params: Requests[M]["params"];
}

export type RpcResponse<M extends Method = Method> =
  | { jsonrpc: "2.0"; id: number; result: Requests[M]["result"] }
  | { jsonrpc: "2.0"; id: number | null; error: { code: number; message: string } };

export interface RpcNotification<N extends keyof Notifications = keyof Notifications> {
  jsonrpc: "2.0";
  method: N;
  params: Notifications[N];
}

/** JSON-RPC 2.0 error codes the host answers with. */
export const RPC_ERRORS = {
  parse: -32700,
  invalid: -32600,
  method: -32601,
  params: -32602,
  /** The installed specgate is missing or older than the studio needs (REQ-013). */
  specgate: -32001,
} as const;

/** Where a question was asked: the brief, a draft, or the agent while it builds (draft-questions A3). */
export type Asked = "brief" | "draft" | "build";

/** A question as `specgate questions --json` gives it (draft-questions REQ-091). */
export interface Question {
  id: string;
  /** The change it was asked in, or `project`. */
  change: string;
  text: string;
  blocks: string[];
  /** specgate 0.33.1 and later (REQ-479). */
  options?: string[];
  /** specgate 0.33.2 and later (specgate REQ-481). */
  asked?: Asked;
  /** In `answered` only: the answer, waiting for "The spec says it" (specgate REQ-482). */
  answer?: string;
}

/** The Questions section: `specgate questions --json`. */
export interface QuestionsSection {
  questions?: {
    open?: Question[];
    /** Answered and not yet confirmed; specgate 0.33.2 and later. */
    answered?: Question[];
  };
}
