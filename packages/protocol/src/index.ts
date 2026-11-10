/**
 * The JSON-RPC contract between the UI and the core host (REQ-001): types only.
 * The UI imports this package and never core, host or an adapter (ADR-0001).
 */
import type {
  CommandEvent,
  FolderKind,
  GitState,
  RecentProject,
  RunResult,
  Section,
  SectionData,
  SpecgateCommand,
  UncommittedGroup,
  WorkspaceState,
} from "@specgate-studio/core";

export type { CommandEvent, RunResult, Section, SectionData, SpecgateCommand };
/** The open folder (draft-workspace): its kind, git state and the recent projects. */
export type { FolderKind, GitState, RecentProject, UncommittedGroup, WorkspaceState };

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
  /** A file of the project, as text. */
  "file.read": { params: { path: string }; result: { path: string; text: string } };
}

/** What the host tells every connected UI, unasked. */
export interface Notifications {
  "state.changed": { sections: Section[] };
  "command.event": CommandEvent;
  /** The folder changed: its new state (REQ-023). */
  "workspace.changed": { state: WorkspaceState };
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
