/**
 * draft-workbench-v2 without a browser: editor groups in any nested grid
 * (REQ-188, A34), their tabs, a file in two groups, moved tabs, focus and
 * splitters (REQ-189, A21), the layout saved, restored and collapsed
 * (REQ-191, A24), and the splitters' values for the keyboard (REQ-192, A25).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  closeTabIn,
  collapsed,
  evenAt,
  focusNth,
  groupOrder,
  initialEditors,
  mapAllTabs,
  moveTab,
  openIn,
  resizeAt,
  restore,
  saved,
  split,
  type Editors,
  type LayoutNode,
} from "../src/layout.js";

const shape = (n: LayoutNode): unknown =>
  n.kind === "group" ? n.id : { [n.dir]: n.children.map(shape), sizes: n.sizes };
const tabs = (e: Editors) => groupOrder(e).map((g) => e.groups[g]!.open);

test("REQ-188 SCN-561: Ctrl+\\ then Ctrl+K Down — the first left, a second right, a third under it, each with spec.md", () => {
  let e = openIn(initialEditors(), "spec.md");
  e = split(e, "right");
  e = split(e, "down");
  assert.deepEqual(shape(e.root), {
    row: ["g1", { col: ["g2", "g3"], sizes: [50, 50] }],
    sizes: [50, 50],
  });
  assert.deepEqual(tabs(e), [["spec.md"], ["spec.md"], ["spec.md"]]);
  assert.equal(e.active, "g3");
});

test("REQ-188 SCN-562: Split Up, then Split Left — a group above the first, a group left of the active one", () => {
  let e = openIn(initialEditors(), "docs/brief.md");
  e = split(e, "up");
  assert.deepEqual(shape(e.root), { col: ["g2", "g1"], sizes: [50, 50] });
  e = split(e, "left");
  assert.deepEqual(shape(e.root), {
    col: [{ row: ["g3", "g2"], sizes: [50, 50] }, "g1"],
    sizes: [50, 50],
  });
  assert.equal(e.active, "g3");
});

test("REQ-188 A34: a split in the same direction joins its row, halving the active group's share; groups unlimited", () => {
  let e = openIn(initialEditors(), "a.md");
  for (let i = 0; i < 7; i++) e = split(e, "right");
  assert.equal(groupOrder(e).length, 8);
  const root = e.root as Extract<LayoutNode, { kind: "split" }>;
  assert.equal(root.children.length, 8);
  assert.equal(Math.round(root.sizes.reduce((a, b) => a + b, 0)), 100);
});

test("REQ-188 SCN-560: REQ-031.feature dragged to the right edge — a new right group with it, the spec left", () => {
  let e = openIn(openIn(initialEditors(), "spec.md"), "features/pedidos/REQ-031.feature");
  e = moveTab(e, "g1", "features/pedidos/REQ-031.feature", "g1", "right");
  assert.deepEqual(shape(e.root), { row: ["g1", "g2"], sizes: [50, 50] });
  assert.deepEqual(tabs(e), [["spec.md"], ["features/pedidos/REQ-031.feature"]]);
});

test("REQ-189 SCN-564: the right group's last tab closed — one group fills the editor area", () => {
  let e = openIn(openIn(initialEditors(), "spec.md"), "REQ-031.feature");
  e = moveTab(e, "g1", "REQ-031.feature", "g1", "right");
  e = closeTabIn(e, "g2", "REQ-031.feature");
  assert.deepEqual(shape(e.root), "g1");
  assert.equal(e.active, "g1");
  assert.deepEqual(tabs(e), [["spec.md"]]);
});

test("REQ-189: a tab dropped on another group's strip moves there; the group it left closes when empty", () => {
  let e = openIn(initialEditors(), "a.md");
  e = split(e, "right");
  e = openIn(e, "b.md");
  e = moveTab(e, "g2", "b.md", "g1");
  assert.deepEqual(tabs(e), [["a.md", "b.md"], ["a.md"]]);
  e = moveTab(e, "g2", "a.md", "g1");
  assert.deepEqual(tabs(e), [["a.md", "b.md"]]);
  assert.equal(e.root.kind, "group");
});

test("REQ-189 SCN-565: Ctrl/Cmd+2 focuses the second group; a double-click evens 70/30 to 50/50", () => {
  let e = split(openIn(initialEditors(), "a.md"), "right");
  e = focusNth(e, 1);
  assert.equal(e.active, "g1");
  e = resizeAt(e, [], 0, 20);
  assert.deepEqual((e.root as { sizes: number[] }).sizes, [70, 30]);
  e = focusNth(e, 2);
  assert.equal(e.active, "g2");
  assert.equal(focusNth(e, 3).active, "g2", "no third group: the focus stays");
  e = evenAt(e, [], 0);
  assert.deepEqual((e.root as { sizes: number[] }).sizes, [50, 50]);
});

test("REQ-189 A21: a splitter never makes a group smaller than its minimum share", () => {
  let e = split(openIn(initialEditors(), "a.md"), "right");
  e = resizeAt(e, [], 0, 80, 20);
  assert.deepEqual((e.root as { sizes: number[] }).sizes, [80, 20]);
  e = resizeAt(e, [], 0, -75, 20);
  assert.deepEqual((e.root as { sizes: number[] }).sizes, [20, 80]);
});

test("REQ-166 REQ-189: a renamed file follows in every group; a deleted one closes everywhere", () => {
  let e = split(openIn(initialEditors(), "docs/a.md"), "right");
  e = mapAllTabs(e, (p) => (p.startsWith("docs/") ? p.replace("docs/", "notes/") : p));
  assert.deepEqual(tabs(e), [["notes/a.md"], ["notes/a.md"]]);
  e = mapAllTabs(e, () => null);
  assert.deepEqual(tabs(e), [[]]);
  assert.equal(e.root.kind, "group");
});

test("REQ-191 SCN-568: the layout saved and restored — groups, sizes, tabs, the active one; a gone file dropped", () => {
  let e = openIn(initialEditors(), "spec.md");
  e = openIn(e, "REQ-031.feature");
  e = moveTab(e, "g1", "REQ-031.feature", "g1", "right");
  e = resizeAt(e, [], 0, 10);
  const back = restore(JSON.parse(JSON.stringify(saved(e))), (p) => p !== "gone.md");
  assert.deepEqual(shape(back!.root), shape(e.root));
  assert.deepEqual(tabs(back!), tabs(e));
  assert.equal(back!.active, e.active);
  const withGone = restore(
    { ...saved(e), groups: { ...saved(e).groups, g1: { open: ["gone.md"], active: "gone.md" } } },
    (p) => p !== "gone.md",
  );
  assert.deepEqual(shape(withGone!.root), "g2");
  assert.equal(
    restore({ nonsense: true }, () => true),
    null,
  );
});

test("REQ-191 SCN-569: a narrow window — one group with every file as a tab, the saved layout untouched", () => {
  let e = openIn(openIn(initialEditors(), "spec.md"), "REQ-031.feature");
  e = moveTab(e, "g1", "REQ-031.feature", "g1", "right");
  const c = collapsed(e);
  assert.deepEqual(shape(c.root), "g1");
  assert.deepEqual(c.groups.g1!.open, ["spec.md", "REQ-031.feature"]);
  assert.equal(c.groups.g1!.active, "REQ-031.feature");
  assert.deepEqual(shape(e.root), { row: ["g1", "g2"], sizes: [50, 50] });
});
