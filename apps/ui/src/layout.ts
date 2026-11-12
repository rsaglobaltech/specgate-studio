/**
 * The editor groups (draft-workbench-v2): any number of groups in any nested
 * grid (REQ-188, A34), each with its own tabs (REQ-189); splits, moved tabs,
 * closed groups, focus and splitters (A21); what is saved per project and
 * restored, and the collapsed view of a small window (REQ-191, A24). Pure:
 * the workbench renders it.
 */
import { closeTab, openTab, type Tabs } from "./tabs.js";

export type Side = "right" | "left" | "down" | "up";
export type LayoutNode =
  | { kind: "group"; id: string }
  | { kind: "split"; dir: "row" | "col"; children: LayoutNode[]; sizes: number[] };

export interface Editors {
  root: LayoutNode;
  groups: Record<string, Tabs>;
  active: string;
  /** The next group's number. */
  next: number;
}

const MIN_SHARE = 10;

export function initialEditors(): Editors {
  return {
    root: { kind: "group", id: "g1" },
    groups: { g1: { open: [], active: null } },
    active: "g1",
    next: 2,
  };
}

/** The groups in reading order: left to right, top to bottom, depth first. */
export function groupOrder(e: Editors): string[] {
  const out: string[] = [];
  const walk = (n: LayoutNode) => (n.kind === "group" ? out.push(n.id) : n.children.forEach(walk));
  walk(e.root);
  return out;
}

/** A path of the project opened in a group (the active one by default), made its active tab. */
export function openIn(e: Editors, path: string, id = e.active): Editors {
  return { ...e, active: id, groups: { ...e.groups, [id]: openTab(e.groups[id]!, path) } };
}

const dirOf = (side: Side): "row" | "col" => (side === "right" || side === "left" ? "row" : "col");
const after = (side: Side) => side === "right" || side === "down";

/** `node` with the leaf `target` replaced by what `put` makes of it. */
function replaceLeaf(
  node: LayoutNode,
  target: string,
  put: (leaf: LayoutNode) => LayoutNode,
): LayoutNode {
  if (node.kind === "group") return node.id === target ? put(node) : node;
  return { ...node, children: node.children.map((c) => replaceLeaf(c, target, put)) };
}

/** A new leaf beside `target`: in its row or column when the direction matches, else a new split. */
function insertBeside(root: LayoutNode, target: string, leaf: LayoutNode, side: Side): LayoutNode {
  const dir = dirOf(side);
  const visit = (node: LayoutNode): LayoutNode => {
    if (node.kind === "group")
      return node.id === target
        ? {
            kind: "split",
            dir,
            children: after(side) ? [node, leaf] : [leaf, node],
            sizes: [50, 50],
          }
        : node;
    const at = node.children.findIndex((c) => c.kind === "group" && c.id === target);
    if (at >= 0 && node.dir === dir) {
      const half = node.sizes[at]! / 2;
      const children = [...node.children];
      const sizes = [...node.sizes];
      sizes[at] = half;
      const where = after(side) ? at + 1 : at;
      children.splice(where, 0, leaf);
      sizes.splice(where, 0, half);
      return { ...node, children, sizes };
    }
    return { ...node, children: node.children.map(visit) };
  };
  return visit(root);
}

/** The active group's file opened in a new group on `side` of it, which becomes active (REQ-188). */
export function split(e: Editors, side: Side, path?: string): Editors {
  const file = path ?? e.groups[e.active]?.active;
  if (!file) return e;
  return splitBeside(e, e.active, side, file);
}

function splitBeside(e: Editors, target: string, side: Side, file: string): Editors {
  const id = `g${e.next}`;
  return {
    root: insertBeside(e.root, target, { kind: "group", id }, side),
    groups: { ...e.groups, [id]: { open: [file], active: file } },
    active: id,
    next: e.next + 1,
  };
}

/** The tree without a group; a split left with one child becomes that child (REQ-189). */
function removeLeaf(node: LayoutNode, id: string): LayoutNode | null {
  if (node.kind === "group") return node.id === id ? null : node;
  const children: LayoutNode[] = [];
  const sizes: number[] = [];
  let freed = 0;
  node.children.forEach((c, i) => {
    const kept = removeLeaf(c, id);
    if (kept) {
      children.push(kept);
      sizes.push(node.sizes[i]! + freed);
      freed = 0;
    } else if (sizes.length) sizes[sizes.length - 1]! += node.sizes[i]!;
    else freed += node.sizes[i]!;
  });
  if (children.length === 0) return null;
  if (children.length === 1) return children[0]!;
  // A child of the same direction joins its parent's row or column.
  const flat: LayoutNode[] = [];
  const flatSizes: number[] = [];
  children.forEach((c, i) => {
    if (c.kind === "split" && c.dir === node.dir) {
      c.children.forEach(
        (cc, j) => (flat.push(cc), flatSizes.push((sizes[i]! * c.sizes[j]!) / 100)),
      );
    } else (flat.push(c), flatSizes.push(sizes[i]!));
  });
  return { ...node, children: flat, sizes: flatSizes };
}

function dropGroup(e: Editors, id: string): Editors {
  const order = groupOrder(e);
  if (order.length <= 1) return e;
  const root = removeLeaf(e.root, id)!;
  const { [id]: _, ...groups } = e.groups;
  const at = order.indexOf(id);
  const active = e.active === id ? (order[at - 1] ?? order[at + 1])! : e.active;
  return { ...e, root, groups, active };
}

/** A tab closed in a group; the group closes with its last tab, unless it is the only one (REQ-189). */
export function closeTabIn(e: Editors, id: string, path: string): Editors {
  const tabs = closeTab(e.groups[id]!, path);
  const next = { ...e, groups: { ...e.groups, [id]: tabs } };
  return tabs.open.length === 0 ? dropGroup(next, id) : next;
}

/** Closes a group and its tabs (REQ-192's "close a group"). */
export function closeGroup(e: Editors, id: string): Editors {
  return groupOrder(e).length > 1
    ? dropGroup(e, id)
    : { ...e, groups: { ...e.groups, [id]: { open: [], active: null } } };
}

/**
 * A tab moved (REQ-188, REQ-189, A19): onto `to`'s tab strip, or — with a
 * side — to a new group on that side of `to`; the group it left closes if
 * it is left empty.
 */
export function moveTab(e: Editors, from: string, path: string, to: string, side?: Side): Editors {
  if (!side && from === to) return e;
  let next = side ? splitBeside(e, to, side, path) : openIn(e, path, to);
  const target = next.active;
  next = closeTabIn(next, from, path);
  return next.groups[target] ? { ...next, active: target } : next;
}

/** Ctrl/Cmd+1, 2, 3: the nth group in reading order made active; none there, nothing changes. */
export function focusNth(e: Editors, n: number): Editors {
  const id = groupOrder(e)[n - 1];
  return id ? { ...e, active: id } : e;
}

function atPath(
  node: LayoutNode,
  path: number[],
  fn: (s: Extract<LayoutNode, { kind: "split" }>) => LayoutNode,
): LayoutNode {
  if (node.kind === "group") return node;
  if (path.length === 0) return fn(node);
  const [i, ...rest] = path;
  return { ...node, children: node.children.map((c, j) => (j === i ? atPath(c, rest, fn) : c)) };
}

/** The splitter after child `index` of the split at `path` moved by `delta` points of share (A21). */
export function resizeAt(
  e: Editors,
  path: number[],
  index: number,
  delta: number,
  min = MIN_SHARE,
): Editors {
  return {
    ...e,
    root: atPath(e.root, path, (s) => {
      const sizes = [...s.sizes];
      const pair = sizes[index]! + sizes[index + 1]!;
      const a = Math.min(Math.max(sizes[index]! + delta, min), pair - min);
      sizes[index] = Math.round(a * 100) / 100;
      sizes[index + 1] = Math.round((pair - a) * 100) / 100;
      return { ...s, sizes };
    }),
  };
}

/** A double-click on a splitter: the two groups beside it evened (REQ-189). */
export function evenAt(e: Editors, path: number[], index: number): Editors {
  return {
    ...e,
    root: atPath(e.root, path, (s) => {
      const sizes = [...s.sizes];
      const half = (sizes[index]! + sizes[index + 1]!) / 2;
      sizes[index] = half;
      sizes[index + 1] = half;
      return { ...s, sizes };
    }),
  };
}

/** Every tab of every group mapped — renamed, or dropped with null (REQ-166); empty groups close. */
export function mapAllTabs(e: Editors, map: (path: string) => string | null): Editors {
  let next = e;
  for (const id of groupOrder(e)) {
    const t = e.groups[id]!;
    const open = [...new Set(t.open.map(map).filter((p): p is string => p !== null))];
    const active = t.active === null ? null : map(t.active);
    next = {
      ...next,
      groups: {
        ...next.groups,
        [id]: { open, active: active && open.includes(active) ? active : (open[0] ?? null) },
      },
    };
  }
  for (const id of groupOrder(next))
    if (next.groups[id]!.open.length === 0) next = dropGroup(next, id);
  return next;
}

/** What is kept per project (REQ-191, A24). */
export type SavedEditors = Pick<Editors, "root" | "groups" | "active" | "next">;

export function saved(e: Editors): SavedEditors {
  return { root: e.root, groups: e.groups, active: e.active, next: e.next };
}

function validNode(n: unknown, seen: Set<string>): n is LayoutNode {
  if (!n || typeof n !== "object") return false;
  const o = n as Record<string, unknown>;
  if (o.kind === "group") return typeof o.id === "string" && !seen.has(o.id) && !!seen.add(o.id);
  return (
    o.kind === "split" &&
    (o.dir === "row" || o.dir === "col") &&
    Array.isArray(o.children) &&
    Array.isArray(o.sizes) &&
    o.children.length >= 2 &&
    o.children.length === o.sizes.length &&
    o.sizes.every((s) => typeof s === "number" && s > 0) &&
    o.children.every((c) => validNode(c, seen))
  );
}

/** A saved layout back, its tabs whose file is gone dropped; null when it is not one (REQ-191, A24). */
export function restore(raw: unknown, exists: (path: string) => boolean): Editors | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const ids = new Set<string>();
  if (!validNode(r.root, ids) || !r.groups || typeof r.groups !== "object") return null;
  const groups: Record<string, Tabs> = {};
  for (const id of ids) {
    const g = (r.groups as Record<string, { open?: unknown; active?: unknown }>)[id];
    if (!g || !Array.isArray(g.open)) return null;
    const open = g.open.filter((p): p is string => typeof p === "string");
    groups[id] = { open, active: typeof g.active === "string" ? g.active : null };
  }
  const order = [...ids];
  const next = typeof r.next === "number" ? r.next : order.length + 1;
  const active = typeof r.active === "string" && ids.has(r.active) ? r.active : order[0]!;
  const e: Editors = { root: r.root as LayoutNode, groups, active, next };
  return mapAllTabs(e, (p) => (exists(p) ? p : null));
}

/** A window too small for the grid: one group with every file as a tab; what is saved is untouched (REQ-191). */
export function collapsed(e: Editors): Editors {
  const order = groupOrder(e);
  if (order.length <= 1) return e;
  const open = [...new Set(order.flatMap((id) => e.groups[id]!.open))];
  const first = order[0]!;
  return {
    root: { kind: "group", id: first },
    groups: { [first]: { open, active: e.groups[e.active]!.active ?? open[0] ?? null } },
    active: first,
    next: e.next,
  };
}
