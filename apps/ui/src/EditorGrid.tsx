import { useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import {
  evenAt,
  groupOrder,
  moveTab,
  resizeAt,
  type Editors,
  type LayoutNode,
  type Side,
} from "./layout.js";

/** What a tab shows: its label, its type's mark, whether it is unsaved. */
export interface TabFace {
  label: string;
  type: string;
  dirty: boolean;
}

export interface EditorGridProps {
  editors: Editors;
  onChange: (e: Editors) => void;
  face: (path: string) => TabFace;
  /** A group's body: its breadcrumb and editor for its active file. */
  body: (group: string, path: string) => ComponentChildren;
  onClose: (group: string, path: string) => void;
  onMenu: (group: string, path: string, x: number, y: number) => void;
  labels: {
    files: string;
    unsaved: string;
    split: string;
    splitter: string;
  };
  /** The split button: right, or down with Alt (A18). */
  onSplit: (side: Side) => void;
}

const DRAG = "application/x-studio-tab";
/** The tab being dragged: its group and path (dragover cannot read the data). */
let dragging: { group: string; path: string } | null = null;
const STEP = 10;
const BIG_STEP = 50;
const MIN_W = 220;
const MIN_H = 120;
const SASH = 4;

/** Where a tab dropped on a group's body lands (A19): an edge's half, or the group itself. */
function zoneOf(e: DragEvent, el: HTMLElement): Side | "center" {
  const r = el.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  const edges: Array<[Side | "center", number]> = [
    ["left", x],
    ["right", 1 - x],
    ["up", y],
    ["down", 1 - y],
  ];
  const [side, d] = edges.sort((a, b) => a[1] - b[1])[0]!;
  return d < 0.3 ? side : "center";
}

/**
 * The editor groups in their grid (draft-workbench-v2 REQ-188, REQ-189,
 * REQ-192): each group a `group` with its own tab strip, breadcrumb and
 * editor; tabs dragged to an edge of a group, where an overlay shows the half
 * they take, or onto another group's strip; splitters that take the keyboard
 * focus and move by the arrow keys, a double-click evening the groups.
 */
export function EditorGrid(p: EditorGridProps) {
  return (
    <div class="egrid">
      <GridNode {...p} node={p.editors.root} path={[]} />
    </div>
  );
}

function GridNode(props: EditorGridProps & { node: LayoutNode; path: number[] }) {
  const { node } = props;
  const box = useRef<HTMLDivElement>(null);
  if (node.kind === "group") return <Group {...props} id={node.id} />;
  const row = node.dir === "row";
  const avail = () => {
    const r = box.current!.getBoundingClientRect();
    return (row ? r.width : r.height) - SASH * (node.children.length - 1);
  };
  const min = () => ((row ? MIN_W : MIN_H) / avail()) * 100;
  const move = (i: number, px: number) =>
    props.onChange(resizeAt(props.editors, props.path, i, (px / avail()) * 100, min()));
  return (
    <div class="esplit" data-dir={node.dir} ref={box}>
      {node.children.map((c, i) => [
        <div class="ecell" key={`c${i}`} style={{ flex: `${node.sizes[i]} 1 0px` }}>
          <GridNode {...props} node={c} path={[...props.path, i]} />
        </div>,
        i < node.children.length - 1 && (
          <div
            key={`s${i}`}
            class="splitter"
            role="separator"
            tabIndex={0}
            aria-label={props.labels.splitter}
            aria-orientation={row ? "vertical" : "horizontal"}
            aria-valuenow={Math.round(node.sizes.slice(0, i + 1).reduce((a, b) => a + b, 0))}
            aria-valuemin={0}
            aria-valuemax={100}
            onDblClick={() => props.onChange(evenAt(props.editors, props.path, i))}
            onKeyDown={(e) => {
              const step = e.shiftKey ? BIG_STEP : STEP;
              const by =
                e.key === (row ? "ArrowRight" : "ArrowDown")
                  ? step
                  : e.key === (row ? "ArrowLeft" : "ArrowUp")
                    ? -step
                    : 0;
              if (!by) return;
              e.preventDefault();
              move(i, by);
            }}
            onPointerDown={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.setPointerCapture(e.pointerId);
              const r = box.current!.getBoundingClientRect();
              const start = row ? r.left : r.top;
              const before = node.sizes.slice(0, i).reduce((a, b) => a + b, 0);
              const onMove = (ev: PointerEvent) => {
                const at = ((row ? ev.clientX : ev.clientY) - start - SASH * i) / avail();
                const want = at * 100 - before;
                props.onChange(
                  resizeAt(props.editors, props.path, i, want - node.sizes[i]!, min()),
                );
              };
              const onUp = () => {
                el.removeEventListener("pointermove", onMove);
                el.removeEventListener("pointerup", onUp);
              };
              el.addEventListener("pointermove", onMove);
              el.addEventListener("pointerup", onUp);
            }}
          />
        ),
      ])}
    </div>
  );
}

function Group(props: EditorGridProps & { id: string }) {
  const { editors, id } = props;
  const tabs = editors.groups[id]!;
  const active = editors.active === id;
  const [zone, setZone] = useState<Side | "center" | null>(null);
  const many = groupOrder(editors).length > 1;
  const focus = () => !active && props.onChange({ ...editors, active: id });
  const drop = (to: string, side?: Side) => {
    const d = dragging;
    dragging = null;
    delete document.body.dataset.tabDrag;
    setZone(null);
    if (!d) return;
    props.onChange(moveTab(editors, d.group, d.path, to, side));
  };
  return (
    <section
      class="egroup"
      role="group"
      aria-label={tabs.active ?? props.labels.files}
      data-group={id}
      data-active={active && many ? "1" : active ? "1" : undefined}
      onMouseDown={focus}
    >
      <div
        class="tabs"
        role="tablist"
        aria-label={props.labels.files}
        onDragOver={(e) => dragging && (e.preventDefault(), setZone(null))}
        onDrop={(e) => (e.preventDefault(), drop(id))}
      >
        {tabs.open.map((path) => {
          const f = props.face(path);
          return (
            <button
              type="button"
              role="tab"
              class="tab"
              key={path}
              draggable
              aria-selected={path === tabs.active}
              title={path}
              data-type={f.type}
              onClick={() =>
                props.onChange({
                  ...editors,
                  active: id,
                  groups: { ...editors.groups, [id]: { ...tabs, active: path } },
                })
              }
              onContextMenu={(e) => {
                e.preventDefault();
                props.onMenu(id, path, e.clientX, e.clientY);
              }}
              onDragStart={(e) => {
                dragging = { group: id, path };
                // Over the editors, a catcher takes the drag from Monaco (A19).
                document.body.dataset.tabDrag = "1";
                e.dataTransfer?.setData(DRAG, JSON.stringify(dragging));
                if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => {
                dragging = null;
                delete document.body.dataset.tabDrag;
                setZone(null);
              }}
            >
              {f.label}
              {f.dirty && (
                <span class="dirty" aria-label={props.labels.unsaved}>
                  ●
                </span>
              )}
              <span
                class="x"
                aria-label="×"
                onClick={(e) => (e.stopPropagation(), props.onClose(id, path))}
              >
                ×
              </span>
            </button>
          );
        })}
        <button
          type="button"
          class="split-btn"
          data-testid="split-button"
          title={props.labels.split}
          aria-label={props.labels.split}
          onClick={(e) => (focus(), props.onSplit(e.altKey ? "down" : "right"))}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM12 4v16" />
          </svg>
        </button>
      </div>
      <div
        class="content flush ebody"
        data-view="file"
        onDragOver={(e) => {
          if (!dragging) return;
          e.preventDefault();
          setZone(zoneOf(e, e.currentTarget as HTMLElement));
        }}
        onDragLeave={(e) => {
          const to = e.relatedTarget as Node | null;
          if (!to || !(e.currentTarget as HTMLElement).contains(to)) setZone(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          const z = zoneOf(e, e.currentTarget as HTMLElement);
          drop(id, z === "center" ? undefined : z);
        }}
      >
        {tabs.active && props.body(id, tabs.active)}
        <div class="drop-catcher" aria-hidden="true" />
        {zone && <div class="drop-overlay" data-zone={zone} aria-hidden="true" />}
      </div>
    </section>
  );
}
