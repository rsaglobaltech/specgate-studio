import { LANGS, fileNotice, type Lang, type Notice } from "../domain/help.js";
import {
  SETTING_SECTIONS,
  USER_SETTINGS,
  catalogOf,
  projectSettings,
  searchSettings,
  settingValue,
  shortcutSettings,
  userSetting,
  type Setting,
  type SettingsView,
} from "../domain/settings.js";
import type { SpecgatePort } from "../ports/SpecgatePort.js";
import type { UserSettingsPort } from "../ports/UserSettingsPort.js";

export interface SettingsOptions {
  /** specgate answering `config keys --json` and `config list --json` (A6, specgate 0.34). */
  specgate?: Pick<SpecgatePort, "call">;
  /** The Developer's own settings file (A2). */
  user?: UserSettingsPort;
  /** Whether the host's environment sets a variable; its value is never read here (A8). */
  envSet?: (name: string) => boolean;
}

/** What setting a user setting answers. */
export type UserSettingResult =
  | { ok: true; key: string; value: string; notice: Record<Lang, Notice> }
  | { ok: false; code: "setting_invalid" | "no_user_file"; message: string };

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};

/**
 * The settings editor's use cases (draft-settings REQ-141 … REQ-143): the
 * settings of both scopes a search keeps, with their values — the project's
 * read through specgate's catalog, never from its files; the user's from the
 * Developer's own file — and a user setting written to that file alone. A
 * project setting is saved by `specgate config set` (the `settings-save`
 * command), never here.
 */
export class Settings {
  constructor(private readonly options: SettingsOptions) {}

  async view(query: string, lang: Lang): Promise<SettingsView> {
    const [project, user] = await Promise.all([this.project(), this.user()]);
    const users: Setting[] = [
      ...USER_SETTINGS.map((d) => ({
        ...structuredClone(d),
        options: [...d.options],
        scope: "user" as const,
        file: null,
        value: settingValue(user[d.key]),
      })),
      ...shortcutSettings(),
    ];
    // In the sections' order (REQ-143), each keeping its own order.
    const at = (x: Setting) => SETTING_SECTIONS.indexOf(x.section);
    const all = [...(project?.settings ?? []), ...users].sort((a, b) => at(a) - at(b));
    return {
      userFile: this.options.user?.file ?? null,
      catalog: project !== null,
      settings: searchSettings(all, query, lang),
      adds: project?.adds ?? [],
    };
  }

  /** The user settings set in the Developer's file, each a value it takes: what the studio opens with. */
  async userValues(): Promise<Record<string, string>> {
    const values = await this.user();
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(values))
      if (userSetting(key, value)) out[key] = value as string;
    return out;
  }

  /** A user setting saved in the Developer's file (SCN-422); nothing of the project is written. */
  async setUser(key: unknown, value: unknown): Promise<UserSettingResult> {
    const def = userSetting(key, value);
    if (!def)
      return {
        ok: false,
        code: "setting_invalid",
        message: `${String(key)} is no user setting, or ${String(value)} is not one of its values.`,
      };
    const user = this.options.user;
    if (!user) return { ok: false, code: "no_user_file", message: "No user settings file." };
    await user.write({ ...(await this.user()), [def.key]: value as string });
    const vars = { key: def.key, to: value as string, path: user.file };
    const notice = Object.fromEntries(
      LANGS.map((l) => [l, fileNotice("settings-user", l, vars, { ok: true })]),
    ) as Record<Lang, Notice>;
    return { ok: true, key: def.key, value: value as string, notice };
  }

  /** The project's settings from specgate's catalog and the values set; null when specgate cannot list them. */
  private async project() {
    const specgate = this.options.specgate;
    if (!specgate) return null;
    try {
      const [keys, list] = await Promise.all([
        specgate.call(["config", "keys"]),
        specgate.call(["config", "list"]).catch(() => null),
      ]);
      const catalog = catalogOf(keys.data);
      if (!catalog) return null;
      const data = obj(list?.data);
      const files = Object.fromEntries(
        Object.entries(obj(data.files)).filter(
          (e): e is [string, string] => typeof e[1] === "string",
        ),
      );
      return projectSettings(
        catalog,
        obj(data.config),
        files,
        this.options.envSet ?? (() => false),
      );
    } catch {
      return null;
    }
  }

  private async user(): Promise<Obj> {
    return (await this.options.user?.read().catch(() => ({}))) ?? {};
  }
}
