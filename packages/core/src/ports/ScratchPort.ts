/**
 * Driven port: a file outside the project, for what specgate reads from a
 * file — the brief's form to write back, the client's text to propose a form
 * from (draft-brief REQ-071, REQ-074) — so nothing of the project is written
 * but by specgate itself.
 */
export interface ScratchPort {
  /** Writes `text` to a new file named `name` outside the project; its absolute path. */
  write(name: string, text: string): Promise<string>;
  /** Removes it, and the folder it was made in. */
  remove(path: string): Promise<void>;
}
