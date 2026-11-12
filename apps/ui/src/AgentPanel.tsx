type Tr = (key: string, vars?: Record<string, string | number>) => string;

/**
 * The agent panel's frame on the right (draft-workbench-v2 REQ-190): shown,
 * hidden and resized. Its plans, diffs and the request field (REQ-181–183)
 * come with specgate's `agent ask` and `agent apply` (A32); until then it
 * says so.
 */
export function AgentPanel(props: { tr: Tr; width: number; onHide: () => void }) {
  const { tr } = props;
  return (
    <aside
      class="agent"
      data-testid="agent-panel"
      aria-label={tr("agent.title")}
      style={{ flex: `0 0 ${props.width}px` }}
    >
      <div class="shead">
        <span>{tr("agent.title")}</span>
        <button
          type="button"
          class="pnew"
          data-testid="agent-hide"
          aria-label={tr("agent.hide")}
          title={tr("agent.hide")}
          onClick={props.onHide}
        >
          ×
        </button>
      </div>
      <div class="agent-body">
        <p>{tr("agent.waiting")}</p>
        <p class="mono agent-cmd">specgate agent ask "…" --plan --json</p>
        <p class="mono agent-cmd">specgate agent apply &lt;plan-id&gt; --json</p>
        <p class="muted">{tr("agent.keys")}</p>
      </div>
    </aside>
  );
}
