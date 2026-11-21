# Design: agent-placeholder

- The core's `AgentView` gains `module: string | null`: the module of the
  project's only open draft change, read from the `changes` section the host
  already holds (`draft-<module>` → `<module>`); null with none or several.
  A pure function in the domain (`agentModuleOf`) decides it; the host only
  passes the section.
- `agent.changed` is already sent when the changes section is read again, so
  the suggestion follows the open changes.
- The UI's `AgentPanel` shows `agent.placeholder` with `{module}` when it is
  set, else `agent.placeholderAny`. No business rule in the component.
- AC-1 → SCN-1012; AC-2, AC-3 → SCN-1013.
