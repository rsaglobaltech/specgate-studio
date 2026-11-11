import type { Onboarding, SetupPort } from "@specgate-studio/core";
import type { SpecgateCli } from "./SpecgateCli.js";

/**
 * SetupPort over the specgate CLI (draft-project-setup): `onboard`,
 * `config list` and `ci status`, each with `--json` — what a folder to set up
 * needs, and never specgate's prose.
 */
export class SpecgateSetup implements SetupPort {
  constructor(private readonly cli: Pick<SpecgateCli, "call">) {}

  async onboard(): Promise<Onboarding> {
    const { data, findings } = await this.cli.call(["onboard"]);
    const o = (data as { onboarding?: Record<string, unknown> }).onboarding ?? {};
    const stack = o.stack as { testCommand?: unknown } | null | undefined;
    return {
      adopted: o.adopted === true,
      testCommand: typeof stack?.testCommand === "string" ? stack.testCommand : null,
      areas: Array.isArray(o.capabilities) ? o.capabilities.length : 0,
      byKind: findings.some((f) => f.code === "capabilities_by_kind"),
    };
  }

  async config(): Promise<Record<string, string>> {
    const { data } = await this.cli.call(["config", "list"]);
    const config = (data as { config?: Record<string, unknown> }).config ?? {};
    return Object.fromEntries(
      Object.entries(config).filter((e): e is [string, string] => typeof e[1] === "string"),
    );
  }

  async ciFile(): Promise<string | null> {
    const { data } = await this.cli.call(["ci", "status"]);
    const file = (data as { file?: unknown }).file;
    return typeof file === "string" && file ? file : null;
  }
}
