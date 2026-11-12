import { commandLine } from "../domain/command.js";
import { LANGS, fileNotice, type Lang, type Notice } from "../domain/help.js";
import {
  SETTINGS,
  searchSettings,
  settingValue,
  userSetting,
  type SettingsView,
} from "../domain/settings.js";
import type { SpecgatePort } from "../ports/SpecgatePort.js";
import type { UserSettingsPort } from "../ports/UserSettingsPort.js";

export interface SettingsOptions {
  /** specgate answering `config list --json`: the project settings' values (A6). */
  specgate?: Pick<SpecgatePort, "call">;
  /** The Developer's own settings file (A2). */
  user?: UserSettingsPort;
}

/** What setting a user setting answers. */
export type UserSettingResult =
  | { ok: true; key: string; value: string; notice: Record<Lang, Notice> }
  | { ok: false; code: "setting_invalid" | "no_user_file"; message: string };

/**
 * The settings editor's use cases (draft-settings REQ-141): the settings of
 * both scopes a search keeps, with their values — the project's read through
 * specgate, never from its files; the user's from the Developer's own file —
 * and a user setting written to that file alone, never to the project.
 */
export class Settings {
  constructor(private readonly options: SettingsOptions) {}

  async view(query: string, lang: Lang): Promise<SettingsView> {
    const [project, user] = await Promise.all([this.project(), this.user()]);
    return {
      userFile: this.options.user?.file ?? null,
      settings: searchSettings(SETTINGS, query, lang).map((s) => ({
        ...structuredClone(s),
        value: settingValue((s.scope === "project" ? project : user)[s.key]),
      })),
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

  private async project(): Promise<Record<string, unknown>> {
    const line = commandLine({ name: "config-list" })!;
    if (!this.options.specgate) return {};
    try {
      const answer = await this.options.specgate.call(line.args);
      const config = (answer.data as { config?: unknown } | null)?.config;
      return config && typeof config === "object" ? (config as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  private async user(): Promise<Record<string, unknown>> {
    return (await this.options.user?.read().catch(() => ({}))) ?? {};
  }
}
