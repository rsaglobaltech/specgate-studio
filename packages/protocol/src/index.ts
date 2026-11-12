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
  ChangeReview,
  ReviewChangeView,
  ReviewNoteView,
  RedraftResult,
  Segment,
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
  ReqEstimate,
  WaitReason,
  WaitingItem,
  LiveAttempt,
  LiveLine,
  LiveQuestion,
  LiveStage,
  LogLine,
  StageId,
  StageMark,
  LiveRequirement,
  LiveState,
  LiveStep,
  LiveView,
  StepResult,
  Usage,
  BriefModule,
  BriefView,
  BriefForm,
  BriefFormActor,
  BriefFormModule,
  BriefFormResult,
  BriefFormView,
  DraftResult,
  GitLetter,
  TreeEntry,
  Unreadable,
  HomeView,
  NextStep,
  RouteState,
  Activity,
  AgentEntry,
  AgentEntryState,
  AgentPlan,
  AgentPlanFile,
  AgentResult,
  AgentView,
  AppliedPlan,
  Mention,
  ScenarioStep,
  TestProposal,
  TraceAgentResult,
  TraceFilter,
  TraceLink,
  TraceRow,
  TraceView,
  TraceWriteResult,
  FixResult,
} from "@specgate-studio/core";

export type { CommandEvent, RunResult, Section, SectionData, SpecgateCommand };
/** What the editor shows over a file (draft-editor). */
export type { Annotations };
/** The open folder (draft-workspace): its kind, git state and the recent projects. */
export type { FolderKind, GitState, RecentProject, UncommittedGroup, WorkspaceState };
/** Home as the boards draw it (draft-design-conformance REQ-173). */
export type { Activity, HomeView, NextStep, RouteState };
/** The Explorer's tree (draft-explorer-tree). */
export type { GitLetter, TreeEntry };
/** Why a section could not be read (draft-design-conformance REQ-178). */
export type { Unreadable };
/** How a write of the tree ended, with its notice in both languages (REQ-166, REQ-168). */
export interface FileWriteResult {
  ok: boolean;
  /** The path written: the new one for a rename. */
  path: string;
  notice: Record<Lang, Notice>;
}
/** What every action says about itself (draft-help). */
export type { ActionId, Explanation, HelpVars, Lang, Notice };
/** The Changes view (draft-changes). */
export type { ArchivePreview, ChangeCard, ChangeGroup, ChangesView, Finding, TicketReview };
/** A draft's requests for change, and drafting it again with them (draft-changes REQ-082, REQ-083). */
export type { ChangeReview, RedraftResult, ReviewChangeView, ReviewNoteView, Segment };
/** Setting up a folder that is no project yet (draft-project-setup). */
export type { AdoptPreview, Area, InitAnswers, ReadyItem };
/** Build and Live (draft-build-live). */
export type {
  BuildItem,
  BuildList,
  BuildStart,
  StopResult,
  Estimate,
  ReqEstimate,
  FileGroup,
  Uncommitted,
  WaitReason,
  WaitingItem,
  LiveAttempt,
  LiveLine,
  LiveQuestion,
  LiveStage,
  LogLine,
  StageId,
  StageMark,
  LiveRequirement,
  LiveState,
  LiveStep,
  LiveView,
  StepResult,
  Usage,
};
/** The agent panel (draft-workbench-v2 REQ-181 … REQ-183). */
export type {
  AgentEntry,
  AgentEntryState,
  AgentPlan,
  AgentPlanFile,
  AgentResult,
  AgentView,
  AppliedPlan,
  Mention,
};
/** The Brief view (draft-brief). */
export type { BriefModule, BriefView, DraftResult };
/** Traceability: one row per scenario, its filters, "Fix" and "Ask the agent" (draft-traceability). */
export type {
  FixResult,
  ScenarioStep,
  TestProposal,
  TraceAgentResult,
  TraceFilter,
  TraceLink,
  TraceRow,
  TraceView,
  TraceWriteResult,
};
/** The brief as a form, and the client's text proposing one (draft-brief REQ-071, REQ-074). */
export type { BriefForm, BriefFormActor, BriefFormModule, BriefFormResult, BriefFormView };

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
  /** Home's next step, route, agent's cost and activity (draft-design-conformance REQ-173). */
  "home.get": { params: Record<string, never>; result: HomeView };
  /** One folder's entries, folders first, nothing ignored (draft-explorer-tree REQ-161). */
  "files.children": { params: { path: string }; result: { entries: TreeEntry[] } };
  /** Git's letter of each changed file (REQ-163). */
  "files.status": { params: Record<string, never>; result: { changes: Record<string, GitLetter> } };
  /** The folders left open in this project, and keeping them (REQ-161). */
  /** This project's layout as last saved, or null (draft-workbench-v2 REQ-191, A24). */
  "layout.get": { params: Record<string, never>; result: { layout: unknown } };
  /** Saves this project's layout in the Developer's store, never in the project (REQ-191). */
  "layout.set": { params: { layout: unknown }; result: Record<string, never> };
  "explorer.open.get": { params: Record<string, never>; result: { open: string[] } };
  "explorer.open.set": { params: { open: string[] }; result: Record<string, never> };
  /** The tree's writes, through the host's file port, inside the project only (REQ-166). */
  "file.create": { params: { path: string; dir: boolean }; result: FileWriteResult };
  "file.rename": { params: { from: string; to: string }; result: FileWriteResult };
  "file.delete": { params: { path: string; permanent: boolean }; result: FileWriteResult };
  /** Where a requirement is written: its file and the line of its heading (REQ-169). */
  "requirement.locate": {
    params: { req: string };
    result: { path: string; line: number } | null;
  };
  /** The "?" of an action: its five parts and their labels; runs nothing (draft-help REQ-061). */
  "help.explain": {
    params: { action: ActionId; lang: Lang; vars?: HelpVars };
    result: { labels: Record<keyof Explanation, string>; explanation: Explanation };
  };
  /** Every action's "?" in one language, for the Help view (draft-design-conformance REQ-179). */
  "help.catalog": {
    params: { lang: Lang };
    result: {
      labels: Record<keyof Explanation, string>;
      actions: Array<{ action: ActionId; explanation: Explanation }>;
    };
  };
  /** Save a file: only when the person saves (draft-editor REQ-045). */
  "file.write": { params: { path: string; text: string }; result: { path: string } };
  /** A file's findings and blocking questions (draft-editor REQ-043, REQ-044). */
  "file.annotations": { params: { path: string; text?: string }; result: Annotations };
  /** A terminal of the Developer's: their shell in the project's folder (draft-terminal REQ-051). */
  "terminal.open": {
    /** `cwd`: a folder of the project to start in (draft-explorer-tree REQ-166, A15). */
    params: { cols: number; rows: number; cwd?: string };
    result: { id: string; name: string };
  };
  "terminal.input": { params: { id: string; data: string }; result: Record<string, never> };
  "terminal.resize": {
    params: { id: string; cols: number; rows: number };
    result: Record<string, never>;
  };
  "terminal.close": { params: { id: string }; result: Record<string, never> };
  /** Whether a folder is open, and the Developer's home (draft-workbench-v2 REQ-185). */
  "folder.get": { params: Record<string, never>; result: { open: boolean; home: string } };
  /** The folders inside one, for Open Folder and Clone Repository's chooser (REQ-185). */
  "folder.browse": {
    params: { path?: string };
    result: { path: string; parent: string | null; folders: string[] };
  };
  /** Open a folder as the project, in a host of its own: its page's URL (REQ-185). */
  "folder.open": { params: { path: string }; result: { url: string } };
  /** Clone a repository into a chosen folder with gh or git, shown in the terminal, then open it (REQ-185). */
  "folder.clone": {
    params: { repo: string; parent: string };
    result: { ok: boolean; path: string; url?: string; notice: Record<Lang, Notice> };
  };
  /** The shell new terminals run and their folder, as the panel shows them (draft-workbench-v2 REQ-184). */
  "terminal.shell": { params: Record<string, never>; result: { name: string; folder: string } };
  "terminal.list": { params: Record<string, never>; result: Array<{ id: string; name: string }> };
  /** What a terminal printed, its last 10,000 lines (REQ-056). */
  "terminal.scrollback": { params: { id: string }; result: { data: string } };
  /** A file of the project, as text. */
  "file.read": { params: { path: string }; result: { path: string; text: string } };
  /** Every open change in its group: to review, in progress, ready to archive (draft-changes REQ-081). */
  "changes.get": { params: Record<string, never>; result: ChangesView };
  /** A ticket's review and what its confirmation runs; runs nothing that writes (REQ-084). */
  "changes.ticket": { params: { key: string }; result: TicketReview };
  /** "Draft again with N requested changes": the agent, handed the open notes (REQ-083). */
  "changes.redraft": { params: { change: string }; result: RedraftResult };
  /** What the five questions offer, and the folder's name (draft-project-setup REQ-111). */
  "setup.options": {
    params: Record<string, never>;
    result: {
      kinds: string[];
      stacks: Array<{ id: string; label: string }>;
      agents: Array<{ id: string; label: string; detected?: boolean }>;
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
  "build.get": { params: { named?: string | null }; result: BuildList };
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
  /** docs/brief.md as a form, read by specgate; the proposal waiting, if any (REQ-071). */
  "brief.form": { params: Record<string, never>; result: BriefFormView };
  /** `propose --from-brief --form <file>`: only what changed, every other line kept (REQ-071). */
  "brief.form.save": { params: { form: BriefForm }; result: BriefFormResult };
  /** The client's text: the agent proposes a form; nothing is written (REQ-074). */
  "brief.propose": { params: { text: string }; result: BriefFormResult };
  /** The proposal accepted: written as a save of the form is (REQ-074). */
  "brief.accept": { params: Record<string, never>; result: BriefFormResult };
  /** The proposal discarded: nothing runs, nothing is written (REQ-074). */
  "brief.discard": {
    params: Record<string, never>;
    result: BriefFormResult & { notice?: Record<Lang, Notice> };
  };
  /** The agent panel: its agent, mode and this session's requests (REQ-181). */
  "agent.get": { params: Record<string, never>; result: AgentView };
  /** `specgate agent ask "<request>" --plan --json`: a plan, nothing written (REQ-183). */
  "agent.ask": { params: { request: string }; result: AgentResult };
  /** `specgate agent apply <id> --json`, sent once the diff was seen and confirmed (REQ-182). */
  "agent.apply": { params: { n: number }; result: AgentResult };
  /** `specgate agent discard <id> --json`: nothing of the project written (REQ-182). */
  "agent.discard": { params: { n: number }; result: AgentResult };
  /** The applied plans' diffs, the newest first, for Changes (REQ-182). */
  "agent.applied": { params: Record<string, never>; result: AppliedPlan[] };
  /** What "@" offers: requirements with their titles, then files (REQ-183). */
  "agent.mentions": { params: { query: string }; result: Mention[] };
  /** One row per scenario from specgate's matrix, and each filter's count (draft-traceability REQ-121, REQ-122). */
  "trace.get": { params: Record<string, never>; result: TraceView };
  /** "Fix": the missing test proposed as a skeleton from the scenario; nothing written (REQ-123). */
  "trace.fix": { params: { requirement: string; scenario: string }; result: FixResult };
  /** The skeleton confirmed: written, never over a file; the notice names it (REQ-123). */
  "trace.confirm": {
    params: { requirement: string; scenario: string };
    result: TraceWriteResult;
  };
  /** The proposal cancelled, the agent's plan discarded with it: nothing written (REQ-123). */
  "trace.cancel": {
    params: { requirement: string; scenario: string; plan?: number };
    result: TraceWriteResult;
  };
  /** "Ask the agent": its test against the skeleton, with its cost; nothing written (REQ-123). */
  "trace.ask": { params: { requirement: string; scenario: string }; result: TraceAgentResult };
  /** The agent's test confirmed: `specgate agent apply` writes it (REQ-123). */
  "trace.agentConfirm": {
    params: { plan: number; requirement: string; scenario: string; path: string };
    result: TraceWriteResult;
  };
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
  /** The tree wrote these paths (draft-explorer-tree REQ-166): read their folders again. */
  "files.changed": { paths: string[] };
  /** What the agent panel shows changed: every open UI sees the same (REQ-181). */
  "agent.changed": AgentView;
}

export interface ProjectOpened {
  project: string;
  sections: Partial<Record<Section, SectionData>>;
  /** The sections that could not be read, and why (draft-design-conformance REQ-178). */
  unreadable?: Partial<Record<Section, Unreadable>>;
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
