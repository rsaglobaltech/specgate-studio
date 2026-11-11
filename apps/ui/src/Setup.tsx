import { useCallback, useEffect, useState } from "preact/hooks";
import type {
  AdoptPreview,
  Area,
  InitAnswers,
  ReadyItem,
  Requests,
  RunResult,
  SpecgateCommand,
} from "@specgate-studio/protocol";
import type { Rpc } from "./rpc.js";
import { HelpButton, type HelpRequest } from "./Help.js";

type Tr = (key: string, vars?: Record<string, string | number>) => string;
type Options = Requests["setup.options"]["result"];

export type SetupStep = "create" | "adopt";

export interface SetupProps {
  rpc: Rpc;
  tr: Tr;
  step: SetupStep;
  /** Runs a specgate command for a button the terminal's echo names (REQ-053). */
  run: (label: string, command: SpecgateCommand) => Promise<RunResult>;
  /** Names the button whose run comes next, for a run the host starts itself. */
  announce: (label: string) => void;
  onHelp: (r: HelpRequest) => void;
  onDone: () => void;
}

const passed = (r: RunResult) => r.ok && r.exitCode === 0;

/** The next step of a folder that is no project yet (REQ-116): it opens its setup. */
export function SetupNext(p: { tr: Tr; step: SetupStep; onOpen: () => void }) {
  return (
    <div class="next">
      <div class="k">[ {p.tr("home.next").toUpperCase()} ]</div>
      <p class="muted" style="margin:6px 0 10px">
        {p.tr(p.step === "create" ? "setup.empty" : "setup.code")}
      </p>
      <button type="button" class="btn pri" data-setup-next={p.step} onClick={p.onOpen}>
        {p.tr(p.step === "create" ? "setup.create" : "setup.adopt")}
      </button>
    </div>
  );
}

/**
 * Home after an adoption (REQ-115): the areas adoption wrote, each with its
 * folder and tests — a map, not requirements — or none and why, and the next
 * step: specify a behaviour you rely on.
 */
export function AdoptedAreas(p: { tr: Tr; byKind: boolean; areas: Area[] }) {
  return (
    <>
      <div class="next" data-next="specify">
        <div class="k">[ {p.tr("home.next").toUpperCase()} ]</div>
        <div style="margin-top:6px;font-weight:600">{p.tr("setup.specify")}</div>
        <div class="mono muted" style="margin-top:4px">
          specgate new "&lt;a behaviour you rely on&gt;"
        </div>
      </div>
      <section class="card setup-areas" style="margin-top:16px" aria-label={p.tr("setup.areas")}>
        <h2 style="margin:0 0 6px;font-size:16px">{p.tr("setup.areas")}</h2>
        {p.areas.length ? (
          <>
            <p class="muted" style="margin:0 0 8px">
              {p.tr("setup.areasNote")}
            </p>
            <ul class="setup-list">
              {p.areas.map((a) => (
                <li key={a.title} data-area={a.title}>
                  <b>{a.title}</b> <span class="mono muted">{a.folder}</span>
                  <div class="muted">
                    {p.tr("ready.tests")}:{" "}
                    {a.tests.length ? (
                      <span class="mono">{a.tests.join(", ")}</span>
                    ) : (
                      p.tr("setup.noTests")
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p class="muted" style="margin:0" data-by-kind={String(p.byKind)}>
            {p.tr(p.byKind ? "setup.byKind" : "setup.noAreas")}
          </p>
        )}
      </section>
    </>
  );
}

/** The five questions and the command they make (REQ-111). */
function Create(p: SetupProps & { onCreated: () => void }) {
  const [options, setOptions] = useState<Options | null>(null);
  const [answers, setAnswers] = useState<InitAnswers | null>(null);
  const [plan, setPlan] = useState<Requests["setup.plan"]["result"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    void p.rpc.ask("setup.options", {}).then((o) => {
      setOptions(o);
      setAnswers({
        name: o.name,
        kind: "web",
        stack: "node-react",
        agent: "claude",
        architecture: "minimal",
      } as InitAnswers);
    });
  }, [p.rpc]);
  useEffect(() => {
    if (answers) void p.rpc.ask("setup.plan", answers).then(setPlan);
  }, [p.rpc, answers]);

  if (!options || !answers) return <p class="muted">{p.tr("setup.reading")}</p>;
  const set = (k: keyof InitAnswers) => (e: Event) =>
    setAnswers({ ...answers, [k]: (e.target as HTMLInputElement).value } as InitAnswers);
  const select = (k: keyof InitAnswers, values: Array<{ id: string; label: string }>) => (
    <label class="setup-q">
      <span>{p.tr(`setup.q.${k}`)}</span>
      <select class="filter" value={answers[k]} onChange={set(k)}>
        {values.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
    </label>
  );
  const create = async () => {
    setBusy(true);
    setFailed(null);
    p.announce(p.tr("setup.createButton"));
    try {
      const r = await p.rpc.ask("setup.create", answers);
      if (passed(r)) p.onCreated();
      else setFailed(r.ok ? p.tr("setup.failed", { code: r.exitCode }) : r.message);
    } catch (e) {
      setFailed(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form class="setup" onSubmit={(e) => (e.preventDefault(), void create())}>
      <label class="setup-q">
        <span>{p.tr("setup.q.name")}</span>
        <input class="filter" value={answers.name} onInput={set("name")} />
      </label>
      {select(
        "kind",
        options.kinds.map((id) => ({ id, label: p.tr(`setup.kind.${id}`) })),
      )}
      {select("stack", options.stacks)}
      {select("agent", [...options.agents, { id: "none", label: p.tr("setup.agent.none") }])}
      {select(
        "architecture",
        options.architectures.map((id) => ({ id, label: p.tr(`setup.arch.${id}`) })),
      )}
      <h2 class="setup-h">{p.tr("setup.command")}</h2>
      {plan?.problem ? (
        <p class="setup-problem">{plan.problem}</p>
      ) : (
        <>
          {plan?.commands.map((c) => (
            <div class="mono setup-cmd" key={c}>
              {c}
            </div>
          ))}
          <pre class="mono setup-config" aria-label={p.tr("setup.config")}>
            {plan?.config}
          </pre>
        </>
      )}
      {failed && <p class="setup-problem">{failed}</p>}
      <div class="actions">
        <button
          type="submit"
          class="btn pri"
          data-setup="create"
          disabled={busy || !plan || !!plan.problem}
        >
          {p.tr("setup.createButton")}
        </button>
        <HelpButton
          label={p.tr("help.button", { feature: p.tr("setup.createButton") })}
          onOpen={() => p.onHelp({ action: "init", feature: p.tr("setup.createButton") })}
        />
      </div>
    </form>
  );
}

/** The adoption's preview — files and settings — and Adopt (REQ-112, REQ-113). */
function Adopt(p: SetupProps & { onAdopted: () => void }) {
  const [preview, setPreview] = useState<AdoptPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => {
    void p.rpc.ask("setup.preview", {}).then(setPreview);
    // specgate's own word on it, in the terminal (REQ-112).
    void p.run(p.tr("setup.adopt"), { name: "adopt-preview" });
  }, [p.rpc]);

  if (!preview) return <p class="muted">{p.tr("setup.reading")}</p>;
  const adopt = async () => {
    setBusy(true);
    setFailed(null);
    const r = await p.run(p.tr("setup.adoptButton"), { name: "adopt" });
    setBusy(false);
    if (passed(r)) p.onAdopted();
    else setFailed(r.ok ? p.tr("setup.failed", { code: r.exitCode }) : r.message);
  };
  const s = preview.settings;
  return (
    <div class="setup">
      <h2 class="setup-h">{p.tr("setup.preview")}</h2>
      <ul class="setup-list setup-files">
        {preview.files.map((f) => (
          <li class="mono" key={f}>
            {f}
          </li>
        ))}
      </ul>
      <h2 class="setup-h">{p.tr("setup.settings")}</h2>
      <ul class="setup-list setup-settings">
        <li data-setting="test_cmd">
          {s.test_cmd ? (
            <span class="mono">test_cmd: {s.test_cmd}</span>
          ) : preview.noTest ? (
            p.tr(preview.noTest.detected ? "setup.noTest" : "setup.noTestCmd")
          ) : (
            p.tr("setup.kept")
          )}
        </li>
        <li data-setting="agent">
          {s.agent ? (
            <span>
              agent: {p.tr(`agent.${s.agent}`)} <span class="mono muted">({s.agent})</span>
            </span>
          ) : (
            p.tr("setup.noAgent")
          )}
        </li>
      </ul>
      {failed && <p class="setup-problem">{failed}</p>}
      <div class="actions">
        <button
          type="button"
          class="btn pri"
          data-setup="adopt"
          disabled={busy}
          onClick={() => void adopt()}
        >
          {p.tr("setup.adoptButton")}
        </button>
        <HelpButton
          label={p.tr("help.button", { feature: p.tr("setup.adoptButton") })}
          onOpen={() => p.onHelp({ action: "adopt", feature: p.tr("setup.adoptButton") })}
        />
      </div>
    </div>
  );
}

/**
 * What is ready after the setup (REQ-114): each item set with its value, or
 * with the button that sets it by running specgate — no terminal needed.
 */
export function Readiness(p: Omit<SetupProps, "step" | "onDone" | "announce">) {
  const [items, setItems] = useState<ReadyItem[] | null>(null);
  const [agents, setAgents] = useState<Options["agents"]>([]);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [tool, setTool] = useState("claude");
  const read = useCallback(() => p.rpc.ask("setup.readiness", {}).then(setItems), [p.rpc]);
  useEffect(() => {
    void read();
    void p.rpc.ask("setup.options", {}).then((o) => setAgents(o.agents));
  }, [p.rpc, read]);
  const runThen = async (label: string, c: SpecgateCommand) => {
    await p.run(label, c);
    await read();
  };
  if (!items) return <p class="muted">{p.tr("setup.reading")}</p>;
  return (
    <section class="setup" aria-label={p.tr("setup.ready")}>
      <h2 class="setup-h">{p.tr("setup.ready")}</h2>
      <ul class="setup-list setup-ready">
        {items.map((i) => {
          const name = p.tr(`ready.${i.id}`);
          const key = i.id === "tests" ? "test_cmd" : "arch_cmd";
          return (
            <li key={i.id} data-ready={i.id} data-set={String(i.value !== null)}>
              <b>{name}</b>{" "}
              {i.value !== null ? (
                <span class="mono">{i.value}</span>
              ) : (
                <span class="setup-fix">
                  <span class="muted">{p.tr("ready.notSet")}</span>
                  {(i.id === "tests" || i.id === "architecture") && (
                    <>
                      <input
                        class="filter"
                        aria-label={p.tr("ready.command", { item: name })}
                        value={typed[i.id] ?? ""}
                        onInput={(e) =>
                          setTyped({ ...typed, [i.id]: (e.target as HTMLInputElement).value })
                        }
                      />
                      <button
                        type="button"
                        class="btn"
                        disabled={!(typed[i.id] ?? "").trim()}
                        onClick={() =>
                          void runThen(p.tr("ready.set", { item: name }), {
                            name: "config-set",
                            key,
                            value: typed[i.id]!.trim(),
                          })
                        }
                      >
                        {p.tr("ready.set", { item: name })}
                      </button>
                      <HelpButton
                        label={p.tr("help.button", { feature: p.tr("ready.set", { item: name }) })}
                        onOpen={() =>
                          p.onHelp({
                            action: "config-set",
                            feature: p.tr("ready.set", { item: name }),
                            vars: { key },
                          })
                        }
                      />
                    </>
                  )}
                  {i.id === "agent" && (
                    <>
                      <select
                        class="filter"
                        aria-label={p.tr("setup.q.agent")}
                        value={tool}
                        onChange={(e) => setTool((e.target as HTMLSelectElement).value)}
                      >
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        class="btn"
                        onClick={() =>
                          void runThen(p.tr("ready.setAgent"), { name: "agents-init", tool })
                        }
                      >
                        {p.tr("ready.setAgent")}
                      </button>
                      <HelpButton
                        label={p.tr("help.button", { feature: p.tr("ready.setAgent") })}
                        onOpen={() =>
                          p.onHelp({ action: "agents-init", feature: p.tr("ready.setAgent") })
                        }
                      />
                    </>
                  )}
                  {i.id === "ci" && (
                    <>
                      <button
                        type="button"
                        class="btn"
                        onClick={() => void runThen(p.tr("ready.installCi"), { name: "ci-init" })}
                      >
                        {p.tr("ready.installCi")}
                      </button>
                      <HelpButton
                        label={p.tr("help.button", { feature: p.tr("ready.installCi") })}
                        onOpen={() =>
                          p.onHelp({ action: "ci-init", feature: p.tr("ready.installCi") })
                        }
                      />
                    </>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The setup a folder needs, then what is ready (draft-project-setup). */
export function SetupPane(p: SetupProps) {
  const [done, setDone] = useState(false);
  return (
    <>
      <h1>{p.tr(p.step === "create" ? "setup.create" : "setup.adopt")}</h1>
      {done ? (
        <>
          <Readiness {...p} />
          <div class="actions">
            <button type="button" class="btn" data-setup="home" onClick={p.onDone}>
              {p.tr("setup.home")}
            </button>
          </div>
        </>
      ) : p.step === "create" ? (
        <Create {...p} onCreated={() => setDone(true)} />
      ) : (
        <Adopt {...p} onAdopted={() => setDone(true)} />
      )}
    </>
  );
}
