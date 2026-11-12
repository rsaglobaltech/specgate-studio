import {
  LANGS,
  Settings,
  type Lang,
  type SpecgatePort,
  type UserSettingsPort,
} from "@specgate-studio/core";

/**
 * The settings editor in the host (draft-settings REQ-141): `settings.get`,
 * the settings of both scopes a search keeps with their values;
 * `settings.user.get`, the user scope's values the studio opens with; and
 * `settings.user.set`, a user setting written to the Developer's own file —
 * never a file of the project.
 */
export function attachSettings(wiring: {
  specgate?: Pick<SpecgatePort, "call">;
  user?: UserSettingsPort;
}): { handlers: Record<string, (params: unknown) => Promise<unknown>> } {
  const settings = new Settings(wiring);
  return {
    handlers: {
      "settings.get": async (params) => {
        const p = (params ?? {}) as { query?: unknown; lang?: unknown };
        const lang: Lang = LANGS.includes(p.lang as Lang) ? (p.lang as Lang) : "en";
        return settings.view(typeof p.query === "string" ? p.query : "", lang);
      },
      // The user scope alone, read when the studio opens: no specgate is run for it.
      "settings.user.get": async () => settings.userValues(),
      "settings.user.set": async (params) => {
        const p = (params ?? {}) as { key?: unknown; value?: unknown };
        return settings.setUser(p.key, p.value);
      },
    },
  };
}
