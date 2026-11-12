import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

const ROW = 28;
const OVERSCAN = 8;

/**
 * A list that renders only the rows on screen (A14), so 5,000 rows scroll at
 * 60 fps (REQ-036): the DOM holds about forty rows whatever the count. The
 * Explorer's tree draws its rows 26 px high (draft-explorer-tree Q1) and
 * scrolls a revealed row into view (REQ-164).
 */
export function VirtualList(props: {
  count: number;
  row: (i: number) => ComponentChildren;
  rowHeight?: number;
  /** A row to bring into view, bumped with `n`. */
  show?: { index: number; n: number } | null;
}) {
  const ROW_H = props.rowHeight ?? ROW;
  const box = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const [height, setHeight] = useState(600);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setHeight(el.clientHeight || 600);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = box.current;
    const s = props.show;
    if (!el || !s || s.index < 0) return;
    const y = s.index * ROW_H;
    const h = el.clientHeight || height;
    if (y < el.scrollTop) el.scrollTop = y;
    else if (y + ROW_H > el.scrollTop + h) el.scrollTop = y + ROW_H - h;
    setTop(el.scrollTop);
  }, [props.show?.n, props.show?.index]);
  const first = Math.max(0, Math.floor(top / ROW_H) - OVERSCAN);
  const last = Math.min(props.count, Math.ceil((top + height) / ROW_H) + OVERSCAN);
  const rows = [];
  for (let i = first; i < last; i++) {
    rows.push(
      <div
        key={i}
        style={{ position: "absolute", top: i * ROW_H, left: 0, right: 0, height: ROW_H }}
        data-row={i}
      >
        {props.row(i)}
      </div>,
    );
  }
  return (
    <div
      class="list"
      ref={box}
      onScroll={(e) => setTop((e.target as HTMLDivElement).scrollTop)}
      data-count={props.count}
    >
      <div style={{ height: props.count * ROW_H, position: "relative" }}>{rows}</div>
    </div>
  );
}
