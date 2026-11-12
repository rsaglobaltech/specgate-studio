/**
 * Driven port: the Developer's own settings file (draft-settings REQ-141, A2)
 * — `settings.json` in the studio's folder of this user account, the same
 * file for the desktop app and `specgate-studio serve`. It applies to every
 * project and is never a file of one.
 */
export interface UserSettingsPort {
  /** Where the file is, to name it in the notice. */
  readonly file: string;
  /** What it keeps; nothing when it was never written. */
  read(): Promise<Record<string, unknown>>;
  /** Written whole. */
  write(values: Record<string, unknown>): Promise<void>;
}
