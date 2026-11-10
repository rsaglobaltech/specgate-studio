import { promises as fsp } from "node:fs";
import type { FileSystemPort } from "@specgate-studio/core";

/** FileSystemPort over Node's `fs` (draft-workspace, A7). */
export class NodeFileSystem implements FileSystemPort {
  async exists(path: string): Promise<boolean> {
    try {
      await fsp.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async list(path: string): Promise<string[]> {
    try {
      return (await fsp.readdir(path)).sort();
    } catch {
      return [];
    }
  }

  async readText(path: string): Promise<string | null> {
    try {
      return await fsp.readFile(path, "utf8");
    } catch {
      return null;
    }
  }
}
