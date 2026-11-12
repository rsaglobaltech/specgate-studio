import { useEffect, useRef, useState } from "preact/hooks";
import type {
  Finding,
  Lang,
  NewGroup,
  RunResult,
  Setting,
  SettingScope,
  SettingSection,
  SettingsView,
  SpecgateCommand,
} from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";
import type { Theme } from "../settings.js";
import { HelpButton, type HelpRequest } from "../Help.js";

type Tr = (k: string, v?: Record<string, string | number>) => string;

const SCOPES: readonly SettingScope[] = ["project", "user"];
/** The nine sections in the order Settings shows them (REQ-143); the host answers in this order too. */
const SECTIONS: readonly SettingSection[] = [
  "agents",
  "preferences",
  "guards",
  "quality",
  "alm",
  "editor",
  "terminal",
  "shortcuts",
  "appearance",
];
const SCOPE_OF: Record<SettingSection, SettingScope> = {
  agents: "project",
  preferences: "project",
  guards: "project",
  quality: "project",
  alm: "project",
  editor: "user",
  terminal: "user",
  shortcuts: "user",
  appearance: "user",
};
const MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** A value as one argument a shell reads whole: double quotes when it holds a space or a quote (REQ-142). */
const arg = (v: string) =>
  v === "<value>" || /^[\w./:=@%+,{}-]+$/.test(v) ? v : `"${v.replace(/(["\\$`])/g, "\\$1")}"`;
/** The `specgate config set` a project setting is saved with, as the Developer would type it. */
const configLine = (key: string, value: string) => `specgate config set ${key} ${arg(value)}`;
/** A shortcut's keys on this system: `Mod` is ⌘ on macOS, Ctrl elsewhere. */
const keysOf = (k: string) =>
  k
    .replace(/Mod/g, MAC ? "⌘" : "Ctrl")
    .replace(/Shift/g, "⇧")
    .replace(/Alt/g, MAC ? "⌥" : "Alt")
    .replace(/\+/g, " ");

export interface SettingsProps {
  rpc: Rpc;
  lang: Lang;
  theme: Theme;
  project: string;
  tr: Tr;
  /** A user setting chosen: the studio applies it and the host saves it in the Developer's file (REQ-141). */
  onUser: (key: string, value: string) => void;
  /** A project setting saved: `specgate config set` through the host (REQ-142). */
  run: (label: string, command: SpecgateCommand) => Promise<RunResult>;
  onHelp: (r: HelpRequest) => void;
}

type Help = (a: HelpRequest["action"], feature: string, vars?: HelpRequest["vars"]) => void;

/**
 * Settings as the Ajustes board draws it (draft-settings REQ-141 … REQ-143):
 * the nine sections down the side; a search, the two scopes Project and User,
 * and the "?" above; each setting with its name, where it is kept and its
 * control. A project setting names the `specgate config set` that saves it and
 * its file, and is saved only by it; a refusal shows specgate's code and fix.
 * A user setting is saved in the Developer's own file by the host.
 */
export function SettingsEditor(p: SettingsProps) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SettingScope>("project");
  const [view, setView] = useState<SettingsView | null>(null);
  const [current, setCurrent] = useState<SettingSection | null>(null);
  const [read, setRead] = useState(0);
  const asked = useRef(0);
  const body = useRef<HTMLDivElement>(null);
  // Asked again for a search, or after a save; a change of language alone asks nothing (REQ-034).
  const lang = query.trim() ? p.lang : null;
  useEffect(() => {
    const n = ++asked.current;
    p.rpc.ask("settings.get", { query, lang: p.lang }).then(
      (v) => n === asked.current && setView(v),
      () => undefined,
    );
  }, [p.rpc, query, lang, read]);

  const searching = query.trim() !== "";
  const settings = view?.settings ?? [];
  const scopes = searching
    ? SCOPES.filter((s) => settings.some((x) => x.scope === s))
    : SCOPES.filter((s) => s === scope);
  const section = (s: SettingSection) => p.tr(`settings.section.${s}`);
  const go = (s: SettingSection) => {
    setCurrent(s);
    if (!searching) setScope(SCOPE_OF[s]);
    requestAnimationFrame(() =>
      body.current?.querySelector(`[data-section="${s}"]`)?.scrollIntoView({ block: "start" }),
    );
  };
  const help: Help = (action, feature, vars) =>
    p.onHelp({ action, feature, ...(vars ? { vars } : {}) });
  return (
    <div class="split settings" data-view="settings">
      <aside class="side snav" aria-label={p.tr("settings.sections")}>
        {SCOPES.map((s) => (
          <div key={s} class="snav-group" data-scope={s}>
            <div class="sgroup">{p.tr(`settings.scope.${s}`)}</div>
            {SECTIONS.filter((x) => SCOPE_OF[x] === s).map((x) => (
              <button
                key={x}
                type="button"
                class="tr"
                data-section={x}
                aria-current={current === x ? "true" : undefined}
                onClick={() => go(x)}
              >
                <span class="name">{section(x)}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>
      <div class="detail settings-body" ref={body}>
        <div class="settings-bar">
          <input
            type="search"
            class="settings-search"
            value={query}
            placeholder={p.tr("settings.search")}
            aria-label={p.tr("settings.search")}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          />
          <div class="settings-scopes" role="tablist" aria-label={p.tr("settings.scopes")}>
            {SCOPES.map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                class="btn"
                aria-selected={scope === s}
                onClick={() => setScope(s)}
              >
                {p.tr(`settings.scope.${s}`)}
              </button>
            ))}
          </div>
          <HelpButton
            label={p.tr("help.button", { feature: p.tr("settings.save") })}
            onOpen={() =>
              scope === "user"
                ? help("settings-user", p.tr("settings.scope.user"), {
                    path: view?.userFile ?? "settings.json",
                  })
                : help("settings-save", p.tr("settings.save"))
            }
          />
        </div>
        {view && searching && scopes.length === 0 && <p class="muted">{p.tr("settings.none")}</p>}
        {view && !view.catalog && scopes.includes("project") && !searching && (
          <p class="muted" data-testid="settings-no-catalog">
            {p.tr("settings.noCatalog")} <code class="mono">specgate config keys --json</code>
          </p>
        )}
        {scopes.map((s) => (
          <section key={s} class="settings-scope" data-scope={s}>
            <h2>{p.tr(`settings.scope.${s}`)}</h2>
            <p class="muted settings-where">
              {s === "project"
                ? p.tr("settings.where.project", { project: p.project })
                : p.tr("settings.where.user", { file: view?.userFile ?? "settings.json" })}
            </p>
            {SECTIONS.filter((x) => SCOPE_OF[x] === s).map((x) => {
              const mine = settings.filter((y) => y.section === x);
              const adds = searching ? [] : (view?.adds ?? []).filter((a) => addSection(a) === x);
              if (!mine.length && !adds.length) return null;
              return (
                <div key={x} class="settings-section" data-section={x}>
                  <h3>{section(x)}</h3>
                  {groupsOf(mine).map(([group, rows]) => (
                    <div key={group ?? ""} class="settings-group" data-group={group ?? ""}>
                      {group && <div class="settings-group-h mono">{group}</div>}
                      {rows.map((y) => (
                        <SettingRow
                          key={y.key}
                          setting={y}
                          p={p}
                          onSaved={() => setRead((n) => n + 1)}
                          help={help}
                        />
                      ))}
                    </div>
                  ))}
                  {adds.map((a) => (
                    <AddGroup key={a.prefix} add={a} p={p} onSaved={() => setRead((n) => n + 1)} />
                  ))}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}

const addSection = (a: NewGroup): SettingSection =>
  a.prefix === "profiles" ? "agents" : "quality";

/** A section's settings, those of a profile or a check together under its name. */
function groupsOf(rows: Setting[]): Array<[string | null, Setting[]]> {
  const out: Array<[string | null, Setting[]]> = [];
  for (const r of rows) {
    const g = r.group ?? null;
    const last = out[out.length - 1];
    if (last && last[0] === g) last[1].push(r);
    else out.push([g, [r]]);
  }
  return out;
}

/** specgate's refusal, its code and fix (REQ-142 SCN-424). */
function Refusal(props: { finding: Finding; tr: Tr; file?: string | null }) {
  const f = props.finding;
  return (
    <div class="setting-refused" role="alert" data-code={f.code}>
      <code class="mono">{f.code}</code> {f.message}
      {f.fix && (
        <>
          {" · "}
          {props.tr("notice.fix")} <code class="mono setting-fix">{f.fix}</code>
        </>
      )}
      {props.file && (
        <span class="muted"> {props.tr("settings.unchanged", { file: props.file })}</span>
      )}
    </div>
  );
}

/** One setting: its name, where it is kept, its control, and for a project one the command that saves it. */
function SettingRow(props: {
  setting: Setting;
  p: SettingsProps;
  onSaved: () => void;
  help: Help;
}) {
  const { setting: s, p } = props;
  const [draft, setDraft] = useState<string | null>(null);
  const [refused, setRefused] = useState<Finding | null>(null);
  const [saving, setSaving] = useState(false);
  const name = s.name[p.lang];
  const label = s.group ? `${s.group} · ${name}` : name;
  const shortKey = s.group ? s.key.replace(`.${s.group}.`, ".<name>.") : s.key;

  if (s.scope === "user") {
    const value =
      s.key === "lang" ? p.lang : s.key === "theme" ? p.theme : (s.value ?? s.default ?? "");
    return (
      <div class="setting" data-key={s.key} data-scope="user">
        <div class="setting-name">{name}</div>
        <div class="setting-where mono muted">
          {p.tr("settings.scope.user").toLowerCase()} · {s.key.replace(/^shortcut\./, "")}
        </div>
        {s.readOnly ? (
          <div class="setting-control">
            <kbd class="setting-keys mono" data-keys={s.value ?? ""}>
              {keysOf(s.value ?? "")}
            </kbd>
          </div>
        ) : (
          <div class="setting-control">
            <select
              value={value}
              aria-label={name}
              onChange={(e) => p.onUser(s.key, (e.target as HTMLSelectElement).value)}
            >
              {(s.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {optionLabel(p.tr, s.key, o)}
                </option>
              ))}
            </select>
          </div>
        )}
        {s.description[p.lang] && <div class="setting-desc muted">{s.description[p.lang]}</div>}
      </div>
    );
  }

  // A project setting: shown with the command that saves it and its file (REQ-142).
  const pending = draft ?? s.value ?? "";
  const options = s.options;
  // An on/off setting unchanged names the command that turns it the other way (SCN-427).
  const shown =
    draft === null && options?.length === 2 && s.value && options.includes(s.value)
      ? options.find((o) => o !== s.value)!
      : pending;
  const changed = draft !== null && draft !== (s.value ?? "") && draft.trim() !== "";
  const save = async () => {
    if (!changed || saving) return;
    setSaving(true);
    setRefused(null);
    try {
      const r = await p.run(p.tr("settings.saveOf", { name: label }), {
        name: "settings-save",
        key: s.key,
        value: draft!,
      });
      const refusal = r.ok ? (r.findings ?? []).find((f) => f.severity === "error") : undefined;
      if (r.ok && r.exitCode === 0 && !refusal) {
        setDraft(null);
        props.onSaved();
      } else if (refusal) setRefused(refusal);
      else if (!r.ok) setRefused({ severity: "error", code: r.code, message: r.message });
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      class="setting"
      data-key={s.key}
      data-scope="project"
      {...(refused ? { "data-refused": refused.code } : {})}
    >
      <div class="setting-name">
        {name}
        {s.key === "agent_guard" && (
          <HelpButton
            label={p.tr("help.button", { feature: name })}
            onOpen={() => props.help("agent-guard", name, { to: shown || "off" })}
          />
        )}
      </div>
      <div class="setting-where mono muted">
        <span class="setting-file">{s.file}</span> · <span>{shortKey}</span>
      </div>
      <div class="setting-control">
        {options?.length ? (
          <select
            value={pending}
            aria-label={label}
            onChange={(e) => setDraft((e.target as HTMLSelectElement).value)}
          >
            {!pending && <option value="">{p.tr("settings.notSet")}</option>}
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <input
            class="mono"
            value={pending}
            placeholder={s.default ?? p.tr("settings.notSet")}
            aria-label={label}
            onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === "Enter" && void save()}
          />
        )}
        <button type="button" class="btn" disabled={!changed || saving} onClick={() => void save()}>
          {p.tr("settings.save")}
        </button>
      </div>
      {s.env && (
        <div class="setting-env" data-env={s.env.name} data-set={String(s.env.set)}>
          {p.tr(s.env.set ? "settings.env.set" : "settings.env.unset", { name: s.env.name })}
        </div>
      )}
      <div class="setting-cmd muted">
        {p.tr(changed ? "settings.onSave" : "settings.savedWith")}{" "}
        <code class="mono">{configLine(s.key, shown || "<value>")}</code> →{" "}
        <code class="mono">{s.file}</code>
      </div>
      {s.description[p.lang] && <div class="setting-desc muted">{s.description[p.lang]}</div>}
      {refused && <Refusal finding={refused} tr={p.tr} file={s.file} />}
    </div>
  );
}

/** "+ Add a profile" / "+ Add a check": its name and the field that makes it (REQ-143). */
function AddGroup(props: { add: NewGroup; p: SettingsProps; onSaved: () => void }) {
  const { add: a, p } = props;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [refused, setRefused] = useState<Finding | null>(null);
  const kind = a.prefix === "profiles" ? "profile" : "check";
  const key = `${a.prefix}.${name.trim() || "<name>"}.${a.field}`;
  if (!open)
    return (
      <button
        type="button"
        class="btn settings-add"
        data-add={a.prefix}
        onClick={() => setOpen(true)}
      >
        + {p.tr(`settings.add.${kind}`)}
      </button>
    );
  const save = async () => {
    setRefused(null);
    const r = await p.run(p.tr(`settings.add.${kind}`), { name: "settings-save", key, value });
    const refusal = r.ok ? (r.findings ?? []).find((f) => f.severity === "error") : undefined;
    if (r.ok && r.exitCode === 0 && !refusal) {
      setOpen(false);
      setName("");
      setValue("");
      props.onSaved();
    } else if (refusal) setRefused(refusal);
  };
  return (
    <div class="setting settings-new" data-add={a.prefix}>
      <div class="setting-control">
        <input
          class="mono"
          value={name}
          aria-label={p.tr(`settings.add.${kind}.name`)}
          placeholder={p.tr(`settings.add.${kind}.name`)}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
        />
        <input
          class="mono"
          value={value}
          aria-label={p.tr(`settings.add.${kind}.value`)}
          placeholder={p.tr(`settings.add.${kind}.value`)}
          onInput={(e) => setValue((e.target as HTMLInputElement).value)}
        />
        <button
          type="button"
          class="btn"
          disabled={!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(name.trim()) || !value.trim()}
          onClick={() => void save()}
        >
          {p.tr("settings.save")}
        </button>
      </div>
      <div class="setting-cmd muted">
        {p.tr("settings.onSave")} <code class="mono">{configLine(key, value || "<value>")}</code> →{" "}
        <code class="mono">{a.file}</code>
      </div>
      {refused && <Refusal finding={refused} tr={p.tr} file={a.file} />}
    </div>
  );
}

function optionLabel(tr: Tr, key: string, o: string): string {
  if (key === "lang") return o === "en" ? "English" : "Español";
  if (key === "theme") return tr(o === "dark" ? "settings.dark" : "settings.light");
  if (key === "editor.wordWrap") return tr(o === "on" ? "settings.on" : "settings.off");
  return o;
}
