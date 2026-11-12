import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import type { Rpc } from "./rpc.js";

/** The studio's own terminal: what the studio runs, shown, never typed into (REQ-053, REQ-054). */
export const STUDIO = "specgate";

export interface TerminalPaneProps {
  rpc: Rpc;
  theme: "dark" | "light";
  visible: boolean;
  /** Everything the studio has echoed so far, labels included; it only grows. */
  echo: string;
  /** Bumped when the studio's terminal should come to the front (a button ran a command). */
  showStudio: number;
  /** Bumped when a new terminal of the Developer's should open (Ctrl+`, "Open a terminal"). */
  openShell: number;
  /** A terminal to open in a folder of the project: "Open in terminal" (draft-explorer-tree A15). */
  openShellIn?: { n: number; cwd: string } | null;
  labels: { newTerminal: string; close: string; readonly: string; openTerminal: string };
}

interface Entry {
  id: string;
  name: string;
  term: Terminal;
  fit: FitAddon;
  host: HTMLDivElement;
}

const SCROLLBACK = 10_000;

const THEMES = {
  dark: {
    background: "#111215",
    foreground: "#ECE7DE",
    cursor: "#FF5B1F",
    selectionBackground: "#3A3B44",
  },
  light: {
    background: "#F0ECE5",
    foreground: "#1D1B18",
    cursor: "#D9480F",
    selectionBackground: "#D8D2C8",
  },
};

/**
 * The bottom panel's terminals (draft-terminal): the Developer's shells, each
 * an xterm.js over a pty of the host (REQ-051, REQ-055), kept mounted with
 * 10,000 lines so switching views, tabs or the panel loses nothing (REQ-056);
 * and the studio's own terminal, where each command the studio runs is echoed
 * with the button that started it and nothing can be typed (REQ-053, REQ-054).
 */
export default function TerminalPane(p: TerminalPaneProps) {
  const box = useRef<HTMLDivElement>(null);
  const entries = useRef(new Map<string, Entry>());
  const [list, setList] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState(false);
  const echoed = useRef(0);
  const props = useRef(p);
  props.current = p;

  const studio = (globalThis as unknown as { __studio: { terms?: Map<string, Terminal> } })
    .__studio;
  studio.terms ??= new Map();

  function make(id: string, name: string): Entry {
    const host = document.createElement("div");
    host.className = "xterm-host";
    host.dataset.terminal = id;
    host.dataset.name = name;
    box.current!.appendChild(host);
    const term = new Terminal({
      scrollback: SCROLLBACK,
      fontFamily: "'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace",
      fontSize: 12,
      cursorBlink: id !== STUDIO,
      disableStdin: false,
      theme: THEMES[props.current.theme],
      convertEol: id === STUDIO,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    const e: Entry = { id, name, term, fit, host };
    entries.current.set(id, e);
    studio.terms!.set(id, term);
    if (id === STUDIO) {
      // Typed into the studio's terminal: nothing runs; say where commands go (A6).
      term.onData(() => setNote(true));
    } else {
      term.onData(
        (data) => void props.current.rpc.ask("terminal.input", { id, data }).catch(() => undefined),
      );
      term.onResize(
        ({ cols, rows }) =>
          void props.current.rpc.ask("terminal.resize", { id, cols, rows }).catch(() => undefined),
      );
    }
    return e;
  }

  function add(id: string, name: string) {
    if (!entries.current.has(id)) make(id, name);
    setList((l) => (l.some((x) => x.id === id) ? l : [...l, { id, name }]));
    setSelected(id);
  }

  async function openShell(cwd?: string) {
    const size = { cols: 100, rows: 24, ...(cwd ? { cwd } : {}) };
    const { id, name } = await props.current.rpc.ask("terminal.open", size);
    add(id, name);
  }

  function remove(id: string) {
    const e = entries.current.get(id);
    if (!e) return;
    e.term.dispose();
    e.host.remove();
    entries.current.delete(id);
    studio.terms!.delete(id);
    setList((l) => {
      const at = l.findIndex((x) => x.id === id);
      const rest = l.filter((x) => x.id !== id);
      setSelected((s) => (s === id ? (rest[Math.min(at, rest.length - 1)]?.id ?? null) : s));
      return rest;
    });
  }

  // The host's terminals, with what they printed (a reload, a second tab), and their output from now on.
  useEffect(() => {
    const offData = p.rpc.on("terminal.data", ({ id, data }) =>
      entries.current.get(id)?.term.write(data),
    );
    const offExit = p.rpc.on("terminal.exit", ({ id }) => remove(id));
    void p.rpc.ask("terminal.list", {}).then(async (open) => {
      for (const t of open) {
        if (entries.current.has(t.id)) continue;
        const e = make(t.id, t.name);
        e.term.write((await p.rpc.ask("terminal.scrollback", { id: t.id })).data);
        setList((l) => [...l, t]);
      }
    });
    return () => {
      offData();
      offExit();
    };
  }, [p.rpc]);

  // The studio's echo: opened when first needed (A3), written as it grows.
  useEffect(() => {
    if (!p.echo || p.echo.length === echoed.current) return;
    if (!entries.current.has(STUDIO)) {
      make(STUDIO, STUDIO);
      setList((l) => [{ id: STUDIO, name: STUDIO }, ...l]);
    }
    entries.current.get(STUDIO)!.term.write(p.echo.slice(echoed.current));
    echoed.current = p.echo.length;
  }, [p.echo]);

  useEffect(() => {
    if (p.showStudio > 0 && entries.current.has(STUDIO)) setSelected(STUDIO);
  }, [p.showStudio, p.echo]);

  useEffect(() => {
    if (p.openShell > 0) void openShell();
  }, [p.openShell]);

  useEffect(() => {
    if (p.openShellIn) void openShell(p.openShellIn.cwd);
  }, [p.openShellIn?.n]);

  useEffect(() => {
    for (const e of entries.current.values()) e.term.options.theme = THEMES[p.theme];
  }, [p.theme]);

  // Only the selected terminal shows — in the same frame as its tab — the others
  // stay mounted with their scrollback.
  useLayoutEffect(() => {
    for (const e of entries.current.values())
      e.host.style.display = e.id === selected ? "block" : "none";
    const e = selected ? entries.current.get(selected) : undefined;
    if (e && p.visible) {
      requestAnimationFrame(() => {
        try {
          e.fit.fit();
        } catch {
          // Not laid out yet.
        }
        if (e.id !== STUDIO) e.term.focus();
      });
    }
    if (selected !== STUDIO) setNote(false);
  }, [selected, p.visible, list]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const e = selected ? entries.current.get(selected) : undefined;
      try {
        e?.fit.fit();
      } catch {
        // Hidden.
      }
    });
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [selected]);

  return (
    <div class="terms">
      <div class="term-tabs" role="tablist" aria-label="Terminals">
        {list.map((t) => (
          <button
            type="button"
            role="tab"
            class="term-tab"
            key={t.id}
            data-terminal={t.id}
            aria-selected={t.id === selected}
            onClick={() => setSelected(t.id)}
          >
            {t.name}
            {t.id !== STUDIO && (
              <span
                class="x"
                aria-label={`${p.labels.close} ${t.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void p.rpc.ask("terminal.close", { id: t.id }).catch(() => undefined);
                  remove(t.id);
                }}
              >
                ×
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          class="term-new"
          aria-label={p.labels.newTerminal}
          title={p.labels.newTerminal}
          onClick={() => void openShell()}
        >
          +
        </button>
      </div>
      {note && selected === STUDIO && (
        <div class="term-note" role="note">
          {p.labels.readonly}{" "}
          <button type="button" class="btn" onClick={() => void openShell()}>
            {p.labels.openTerminal}
          </button>
        </div>
      )}
      <div class="term-box" ref={box} />
    </div>
  );
}
