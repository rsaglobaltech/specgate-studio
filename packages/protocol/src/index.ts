/**
 * The JSON-RPC contract between the UI and the core host (REQ-001): types only.
 * The UI imports this package and never core, host or an adapter (ADR-0001).
 */
import type {
  CommandEvent,
  RunResult,
  Section,
  SectionData,
  SpecgateCommand,
} from "@specgate-studio/core";

export type { CommandEvent, RunResult, Section, SectionData, SpecgateCommand };

/** What the UI may ask, and what it gets back. */
export interface Requests {
  "project.open": { params: Record<string, never>; result: ProjectOpened };
  "section.get": { params: { section: Section }; result: SectionData };
  "command.run": { params: SpecgateCommand; result: RunResult };
}

/** What the host tells every connected UI, unasked. */
export interface Notifications {
  "state.changed": { sections: Section[] };
  "command.event": CommandEvent;
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
} as const;
