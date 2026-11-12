import type { UserSettingsPort } from "../ports/UserSettingsPort.js";

/** The Developer's settings file in memory, at a path it only names (draft-settings REQ-141). */
export class InMemoryUserSettings implements UserSettingsPort {
  private values: Record<string, unknown>;

  constructor(
    readonly file: string = "/home/dev/.config/specgate-studio/settings.json",
    values: Record<string, unknown> = {},
  ) {
    this.values = structuredClone(values);
  }

  async read(): Promise<Record<string, unknown>> {
    return structuredClone(this.values);
  }

  async write(values: Record<string, unknown>): Promise<void> {
    this.values = structuredClone(values);
  }
}
