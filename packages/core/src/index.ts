export { SECTIONS, type Section, type SectionData } from "./domain/section.js";
export { sectionsFedBy } from "./domain/fedBy.js";
export type { SectionReader } from "./ports/SectionReader.js";
export { ProjectState, type ChangeListener } from "./application/ProjectState.js";
export {
  commandLine,
  shown,
  type SpecgateCommand,
  type CommandLine,
  type CommandEvent,
  type RunResult,
} from "./domain/command.js";
export type { ProcessRunner } from "./ports/ProcessRunner.js";
export { Commands, type EventListener } from "./application/Commands.js";
export type { Finding } from "./domain/finding.js";
export type { SpecgatePort, SpecgateAnswer } from "./ports/SpecgatePort.js";
export { isOlder, updateCommand } from "./domain/version.js";
export { checkSpecgate, type SpecgateCheck } from "./application/checkSpecgate.js";
export { SPECGATE_CONTRACT, type ContractCheck } from "./contracts/specgateContract.js";
export { InMemorySpecgate } from "./fakes/InMemorySpecgate.js";
export {
  FOLDER_KIND_LABEL,
  IGNORED_FOLDERS,
  IgnoreRules,
  RECENT_LIMIT,
  SPECGATE_MARKER,
  SPECIFICATION_GROUP,
  branchTicket,
  folderKind,
  groupOf,
  groupUncommitted,
  projectName,
  samePath,
  toPosix,
  withOpened,
  type FolderKind,
  type GitState,
  type RecentProject,
  type UncommittedGroup,
  type WorkspaceState,
} from "./domain/workspace.js";
export type { FileSystemPort } from "./ports/FileSystemPort.js";
export type { GitPort } from "./ports/GitPort.js";
export type { Watch, WatcherPort } from "./ports/WatcherPort.js";
export type { StorePort } from "./ports/StorePort.js";
export type { ClockPort } from "./ports/ClockPort.js";
export { Workspace, type WorkspaceListener } from "./application/Workspace.js";
export { RecentProjects } from "./application/RecentProjects.js";
export {
  InMemoryFileSystem,
  InMemoryGit,
  InMemoryStore,
  InMemoryWatcher,
  SteppingClock,
} from "./fakes/InMemoryWorkspace.js";
export {
  FILE_SYSTEM_CONTRACT,
  GIT_CONTRACT,
  STORE_CONTRACT,
  WATCHER_CONTRACT,
  type MakeFileSystem,
  type MakeGit,
  type MakeStore,
  type MakeWatcher,
  type PortCheck,
} from "./contracts/workspaceContracts.js";
