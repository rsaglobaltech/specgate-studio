import { useEffect, useRef, useState } from "preact/hooks";
import type { Lang, Setting, SettingScope, SettingsView } from "@specgate-studio/protocol";
import type { Rpc } from "../rpc.js";
import type { Theme } from "../settings.js";

const SCOPES: readonly SettingScope[] = ["project", "user"];

/**
 * Settings as an editor (draft-settings REQ-141): a search box and two
 * scopes, Project and User. A search keeps, in both scopes, what the host
 * finds in the studio's language; with none, the chosen scope shows. Project
 * settings are specgate's, read through it; a user setting is saved in the
 * Developer's own file by the host, never in the project.
 */
export function SettingsEditor(p: {
  rpc: Rpc;
  lang: Lang;
  theme: Theme;
  project: string;
  tr: (k: string, v?: Record<string, string | number>) => string;
  /** A user setting chosen: the studio applies it and the host saves it. */
  onUser: (key: "lang" | "theme", value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SettingScope>("user");
  const [view, setView] = useState<SettingsView | null>(null);
  const asked = useRef(0);
  // Asked again for a search; a change of language alone asks nothing (REQ-034).
  const lang = query.trim() ? p.lang : null;
  useEffect(() => {
    const n = ++asked.current;
    p.rpc.ask("settings.get", { query, lang: p.lang }).then(
      (v) => n === asked.current && setView(v),
      () => undefined,
    );
  }, [p.rpc, query, lang]);

  const searching = query.trim() !== "";
  // The studio's language and theme show at once, before the host answers.
  const settings: Setting[] = view?.settings ?? [
    userRow("lang", p.tr("settings.language")),
    userRow("theme", p.tr("settings.theme")),
  ];
  const scopes = searching
    ? SCOPES.filter((s) => settings.some((x) => x.scope === s))
    : SCOPES.filter((s) => s === scope);
  return (
    <div class="settings">
      <h1>{p.tr("view.settings")}</h1>
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
            aria-selected={scope === s}
            onClick={() => setScope(s)}
          >
            {p.tr(`settings.scope.${s}`)}
          </button>
        ))}
      </div>
      {view && searching && scopes.length === 0 && <p class="muted">{p.tr("settings.none")}</p>}
      {scopes.map((s) => (
        <section key={s} class="settings-scope" data-scope={s}>
          <h2>{p.tr(`settings.scope.${s}`)}</h2>
          <p class="muted">
            {s === "project"
              ? p.tr("settings.where.project", { project: p.project })
              : p.tr("settings.where.user", { file: view?.userFile ?? "settings.json" })}
          </p>
          {settings
            .filter((x) => x.scope === s)
            .map((x) => (
              <div key={x.key} class="setting" data-key={x.key}>
                <div class="setting-name">{x.name[p.lang]}</div>
                {x.description[p.lang] && (
                  <div class="setting-desc muted">{x.description[p.lang]}</div>
                )}
                <SettingControl
                  setting={x}
                  lang={p.lang}
                  theme={p.theme}
                  tr={p.tr}
                  onUser={p.onUser}
                />
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}

function SettingControl(p: {
  setting: Setting;
  lang: Lang;
  theme: Theme;
  tr: (k: string, v?: Record<string, string | number>) => string;
  onUser: (key: "lang" | "theme", value: string) => void;
}) {
  const s = p.setting;
  const name = s.name[p.lang];
  if (s.key === "lang" && s.scope === "user")
    return (
      <select
        value={p.lang}
        aria-label={name}
        onChange={(e) => p.onUser("lang", (e.target as HTMLSelectElement).value)}
      >
        <option value="en">English</option>
        <option value="es">Español</option>
      </select>
    );
  if (s.key === "theme" && s.scope === "user")
    return (
      <select
        value={p.theme}
        aria-label={name}
        onChange={(e) => p.onUser("theme", (e.target as HTMLSelectElement).value)}
      >
        <option value="dark">{p.tr("settings.dark")}</option>
        <option value="light">{p.tr("settings.light")}</option>
      </select>
    );
  // A project setting is specgate's: shown here, saved through `specgate config set` (REQ-142).
  return (
    <input
      class="mono"
      readOnly
      value={s.value ?? ""}
      placeholder={p.tr("settings.notSet")}
      aria-label={name}
    />
  );
}

/** A user setting as the studio shows it before the host answers. */
function userRow(key: "lang" | "theme", name: string): Setting {
  return {
    key,
    scope: "user",
    name: { en: name, es: name },
    description: { en: "", es: "" },
    value: null,
  };
}
