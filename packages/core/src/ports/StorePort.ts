/**
 * Driven port: what the studio keeps for the Developer between sessions —
 * the recent projects (REQ-026, A6). A value is JSON; a key never written
 * reads `null`.
 */
export interface StorePort {
  read<T>(key: string): Promise<T | null>;
  write<T>(key: string, value: T): Promise<void>;
}
