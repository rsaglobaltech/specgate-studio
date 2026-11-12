/**
 * The layout audit of draft-live-polish REQ-202 (A16): what the Developer
 * sees, measured in the page — no control drawn over another, nothing
 * covering a control, no empty column between the workbench's columns or a
 * view's, no side panel wider than itself.
 */
import type { Page } from "./support.js";

/** One problem the audit found, in words a failing test prints. */
export type Finding = string;

/**
 * Every problem of the page as it is drawn now. A control is a button, a
 * link, a field, a tab or a "?"; what a scrolling ancestor hides of it is not
 * seen, so only what shows is measured.
 */
export function audit(page: Page): Promise<Finding[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const W = window.innerWidth;
    const H = window.innerHeight;
    type Box = { x: number; y: number; r: number; b: number };
    const name = (el: Element) => {
      const id = el.getAttribute("data-testid") ?? el.getAttribute("data-act") ?? "";
      const label = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 30);
      return `<${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? `.${el.className.split(/\s+/).join(".")}` : ""}${id ? ` ${id}` : ""}> "${label}"`;
    };
    /** What shows of an element: its box cut by every ancestor that clips, and the window. */
    const shown = (el: Element): Box | null => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return null;
      let box: Box = { x: r.left, y: r.top, r: r.right, b: r.bottom };
      for (let a = el.parentElement; a; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.display === "contents") continue;
        const clipX = cs.overflowX !== "visible";
        const clipY = cs.overflowY !== "visible";
        if (!clipX && !clipY) continue;
        const ar = a.getBoundingClientRect();
        box = {
          x: clipX ? Math.max(box.x, ar.left) : box.x,
          r: clipX ? Math.min(box.r, ar.right) : box.r,
          y: clipY ? Math.max(box.y, ar.top) : box.y,
          b: clipY ? Math.min(box.b, ar.bottom) : box.b,
        };
      }
      box = {
        x: Math.max(box.x, 0),
        y: Math.max(box.y, 0),
        r: Math.min(box.r, W),
        b: Math.min(box.b, H),
      };
      return box.r - box.x >= 1 && box.b - box.y >= 1 ? box : null;
    };
    const visible = (el: Element) => {
      for (let a: Element | null = el; a; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0)
          return false;
      }
      return true;
    };
    const controls = [
      ...document.querySelectorAll(
        'button, a[href], input:not([type="hidden"]), select, textarea, [role="tab"], [role="separator"]',
      ),
    ]
      // Inside the editor and the terminal, the libraries draw their own.
      .filter((el) => !el.closest(".monaco-editor, .xterm, .sr"))
      .filter(visible)
      .map((el) => ({ el, box: shown(el) }))
      .filter((c): c is { el: Element; box: Box } => c.box !== null);

    // No control over another (0 px; a sash of 4 px may sit on a border, so 1 px is allowed).
    for (let i = 0; i < controls.length; i++)
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i]!;
        const b = controls[j]!;
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        // A splitter is a grab zone laid on a border, drawn as a line: it covers nothing.
        if (a.el.getAttribute("role") === "separator" || b.el.getAttribute("role") === "separator")
          continue;
        const w = Math.min(a.box.r, b.box.r) - Math.max(a.box.x, b.box.x);
        const h = Math.min(a.box.b, b.box.b) - Math.max(a.box.y, b.box.y);
        if (w > 1 && h > 1)
          out.push(`overlap ${Math.round(w)}×${Math.round(h)}: ${name(a.el)} and ${name(b.el)}`);
      }
    // Nothing drawn over a control: what is under its middle is itself.
    for (const c of controls) {
      if (c.el.getAttribute("role") === "separator") continue;
      const x = (c.box.x + c.box.r) / 2;
      const y = (c.box.y + c.box.b) / 2;
      const hit = document.elementFromPoint(x, y);
      if (hit && !c.el.contains(hit) && !hit.contains(c.el))
        out.push(`covered: ${name(c.el)} under ${name(hit)}`);
    }
    // Columns: side by side, touching, filling their row — no dead column.
    const rows = [
      ...document.querySelectorAll(".middle, .split, .lcols, .live3:not(.lboard), .workarea"),
    ];
    for (const row of rows) {
      if (!visible(row)) continue;
      const rr = row.getBoundingClientRect();
      if (rr.width < 1 || rr.height < 1) continue;
      if (getComputedStyle(row).display !== "flex" || getComputedStyle(row).flexDirection !== "row")
        continue;
      const kids = [...row.children]
        .filter(
          (k) =>
            visible(k) &&
            getComputedStyle(k).position !== "absolute" &&
            getComputedStyle(k).position !== "fixed",
        )
        .map((k) => ({ k, r: k.getBoundingClientRect() }))
        .filter((k) => k.r.width >= 1 && k.r.height >= 1)
        .sort((a, b) => a.r.left - b.r.left);
      if (kids.length === 0) continue;
      let at = rr.left;
      for (const { k, r } of kids) {
        if (r.left - at > 1)
          out.push(`dead column ${Math.round(r.left - at)} px before ${name(k)} in ${name(row)}`);
        if (at - r.left > 1)
          out.push(`overlap ${Math.round(at - r.left)} px: ${name(k)} in ${name(row)}`);
        at = Math.max(at, r.right);
      }
      if (rr.right - at > 1)
        out.push(`dead column ${Math.round(rr.right - at)} px at the end of ${name(row)}`);
    }
    // No side panel wider than itself: it scrolls down, never sideways.
    for (const side of document.querySelectorAll("aside, .side, .agent")) {
      if (!visible(side)) continue;
      const cs = getComputedStyle(side);
      if (
        side.scrollWidth > side.clientWidth + 1 &&
        cs.overflowX !== "hidden" &&
        cs.overflowX !== "clip"
      )
        out.push(`sideways scroll ${side.scrollWidth - side.clientWidth} px: ${name(side)}`);
      // Nor anything spilling out of it, seen or hidden.
      if (cs.overflowX === "hidden" || cs.overflowX === "clip") {
        const sr = side.getBoundingClientRect();
        for (const c of side.querySelectorAll("button, input, select, textarea, a[href]")) {
          if (!visible(c) || c.closest(".sr")) continue;
          const r = c.getBoundingClientRect();
          if (r.width >= 1 && r.right > sr.right + 1)
            out.push(`cut off ${Math.round(r.right - sr.right)} px: ${name(c)} in ${name(side)}`);
        }
      }
    }
    return [...new Set(out)];
  });
}
