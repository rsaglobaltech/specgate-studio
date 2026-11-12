export { NodeFileSystem } from "./NodeFileSystem.js";
export { NodeGit } from "./NodeGit.js";
export { NodeWatcher } from "./NodeWatcher.js";
export { NodeStore, studioHome } from "./NodeStore.js";
export { NodeUserSettings } from "./NodeUserSettings.js";
export { caseInsensitivePaths, posix } from "./paths.js";

/** ClockPort over the system clock. */
export const systemClock = { now: (): string => new Date().toISOString() };
export { NodeHarnessEvents } from "./NodeHarnessEvents.js";
export { freedesktopTrash, systemTrash, type Exec, type Trash } from "./NodeTrash.js";
export { NodeFolders, NodePrograms } from "./NodeFolders.js";
export { NodeScratch } from "./NodeScratch.js";
