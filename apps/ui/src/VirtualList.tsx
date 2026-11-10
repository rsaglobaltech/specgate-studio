import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

const ROW = 28;
const OVERSCAN = 8;

/**
 * A list that renders only the rows on screen (A14), so 5,000 rows scroll at
 * 60 fps (REQ-036): the DOM holds about forty rows whatever the count.
 */
export function VirtualList(props: { count: number; row: (i: number) => ComponentChildren }) {
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
  const first = Math.max(0, Math.floor(top / ROW) - OVERSCAN);
  const last = Math.min(props.count, Math.ceil((top + height) / ROW) + OVERSCAN);
  const rows = [];
  for (let i = first; i < last; i++) {
    rows.push(
      <div
        key={i}
        style={{ position: "absolute", top: i * ROW, left: 0, right: 0, height: ROW }}
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
      <div style={{ height: props.count * ROW, position: "relative" }}>{rows}</div>
    </div>
  );
}
