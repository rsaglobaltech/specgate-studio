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
