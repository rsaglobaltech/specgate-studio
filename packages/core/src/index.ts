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
export { Commands, type CommandsOptions, type EventListener } from "./application/Commands.js";
export type { Finding } from "./domain/finding.js";
export type { SpecgatePort, SpecgateAnswer } from "./ports/SpecgatePort.js";
export { isOlder, updateCommand } from "./domain/version.js";
export { checkSpecgate, type SpecgateCheck } from "./application/checkSpecgate.js";
export { SPECGATE_CONTRACT, type ContractCheck } from "./contracts/specgateContract.js";
export { InMemorySpecgate } from "./fakes/InMemorySpecgate.js";
export {
  ACTIONS,
  HELP,
  LANGS,
  PART_LABELS,
  explain,
  missingTranslations,
  notice,
  type ActionId,
  type Catalog,
  type Explanation,
  type HelpVars,
  type Lang,
  type Notice,
  type Outcome,
} from "./domain/help.js";
export {
  annotate,
  changeOf,
  questionOptions,
  requirementHeadings,
  type Annotations,
  type Heading,
  type InlineQuestion,
  type Mark,
  type OpenQuestion,
} from "./domain/editor.js";
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
export { ANY_FILE, type Watch, type WatcherPort } from "./ports/WatcherPort.js";
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
export type { Pty, PtyOptions, PtyPort, Shell } from "./ports/PtyPort.js";
export { Scrollback, shellFor } from "./domain/terminal.js";
export { SCROLLBACK_LINES, Terminals } from "./application/Terminals.js";
export { FakePty, InMemoryPty } from "./fakes/InMemoryPty.js";
export {
  ADOPTION_AREAS,
  ADOPT_FILES,
  AGENT_TOOLS,
  ARCHITECTURES,
  CI_GATE,
  DETECTED_AGENTS,
  HARNESS_CONFIG,
  PROJECT_KINDS,
  STACKS,
  adoptPreview,
  adoptionAreas,
  agentLabel,
  hasTests,
  initArgs,
  initConfig,
  initProblem,
  readiness,
  setupStep,
  type AdoptPreview,
  type AgentTool,
  type Architecture,
  type Area,
  type InitAnswers,
  type ProjectKind,
  type ReadyId,
  type ReadyItem,
  type SetupStep,
  type StackId,
} from "./domain/setup.js";
export type { Onboarding, SetupPort } from "./ports/SetupPort.js";
export { Setup, type SetupOptions } from "./application/Setup.js";
