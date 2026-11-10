import * as path from "node:path";

/** A path as the core keeps it: `/` on every system (draft-workspace A7). */
export const posix = (p: string): string => p.split(path.sep).join("/");

/** Whether this system compares paths without case: Windows and macOS (A7). */
export const caseInsensitivePaths = (platform: NodeJS.Platform = process.platform): boolean =>
  platform === "win32" || platform === "darwin";
