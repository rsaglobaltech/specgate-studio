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
