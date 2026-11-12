/**
 * The brief as a form (draft-brief REQ-071, REQ-074): what
 * `specgate propose --from-brief --form --json` reads from `docs/brief.md` —
 * its product, actors and modules, and each module's rules, examples and open
 * questions — and what `--form <file>` writes back, only the fields that
 * changed, every other line byte for byte (specgate REQ-486, REQ-487). The
 * client's text proposes one (`--brief <file> --agent <cmd>`, REQ-488), and
 * nothing is written until the Developer accepts it.
 */

export interface BriefFormActor {
  name: string;
  surfaces: string[];
}

export interface BriefFormModule {
  /** How `modules:` spells it. */
  key: string;
  /** As its heading writes it. */
  name: string;
  /** Whether the brief has a section for it. */
  section: boolean;
  prose: string;
  rules: string[];
  examples: string[];
  questions: string[];
}

/** The form the Brief view edits: values only, the lines left to specgate. */
export interface BriefForm {
  exists: boolean;
  product: string;
  surfaces: string[];
  actors: BriefFormActor[];
  modules: BriefFormModule[];
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const cards = (v: unknown): string[] =>
  Array.isArray(v)
    ? v
        .map((c) => (typeof c === "string" ? c : str((c as { text?: unknown } | null)?.text)))
        .filter((c) => c.trim() !== "")
    : [];
const valueOf = (v: unknown): unknown =>
  v && typeof v === "object" && !Array.isArray(v) && "value" in v
    ? (v as { value: unknown }).value
    : v;

/** The form of `propose --from-brief --form --json` (or `--brief … --agent …`), or null when there is none. */
export function briefFormOf(data: unknown): BriefForm | null {
  const f = (data as { form?: unknown } | null)?.form as Record<string, unknown> | null | undefined;
  if (!f || typeof f !== "object") return null;
  const fm = (f.frontMatter ?? {}) as Record<string, unknown>;
  const actors = valueOf(fm.actors);
  return {
    exists: f.exists !== false,
    product: str(valueOf(fm.product)),
    surfaces: strings(valueOf(fm.surfaces)),
    actors: (Array.isArray(actors) ? actors : []).flatMap((a: Record<string, unknown>) =>
      str(a?.name) ? [{ name: str(a.name), surfaces: strings(a.surfaces) }] : [],
    ),
    modules: (Array.isArray(f.modules) ? f.modules : []).flatMap((m: Record<string, unknown>) =>
      str(m?.key) || str(m?.name)
        ? [
            {
              key: str(m.key) || str(m.name),
              name: str(m.name) || str(m.key),
              section: m.section != null,
              prose:
                typeof m.prose === "string"
                  ? m.prose
                  : str((m.prose as { text?: unknown } | null)?.text),
              rules: cards(m.rules),
              examples: cards(m.examples),
              questions: cards(m.questions),
            },
          ]
        : [],
    ),
  };
}

/** What `--form <file>` takes (specgate's `BriefFormInput`): the values; specgate keeps the lines. */
export function briefFormInput(form: BriefForm): Record<string, unknown> {
  return {
    frontMatter: {
      product: form.product,
      ...(form.surfaces.length ? { surfaces: form.surfaces } : {}),
      actors: form.actors.map((a) => ({ name: a.name, surfaces: a.surfaces })),
    },
    modules: form.modules.map((m) => ({
      key: m.key,
      name: m.name,
      prose: m.prose,
      rules: m.rules,
      examples: m.examples,
      questions: m.questions,
    })),
  };
}

/** A form from the wire: each field checked, null when it is not one. */
export function formFromWire(raw: unknown): BriefForm | null {
  const f = raw as Partial<Record<keyof BriefForm, unknown>> | null;
  if (!f || typeof f !== "object" || typeof f.product !== "string" || !Array.isArray(f.modules))
    return null;
  const list = (v: unknown) =>
    strings(v)
      .map((s) => s.replace(/[\r\n]+/g, " ").trim())
      .filter(Boolean);
  const modules = (f.modules as Array<Record<string, unknown>>).flatMap((m) =>
    m && typeof m === "object" && str(m.name).trim()
      ? [
          {
            key: str(m.key).trim() || str(m.name).trim(),
            name: str(m.name).trim(),
            section: m.section !== false,
            prose: str(m.prose),
            rules: list(m.rules),
            examples: list(m.examples),
            questions: list(m.questions),
          },
        ]
      : [],
  );
  return {
    exists: true,
    product: f.product.replace(/[\r\n]+/g, " "),
    surfaces: list(f.surfaces),
    actors: (Array.isArray(f.actors) ? (f.actors as Array<Record<string, unknown>>) : []).flatMap(
      (a) =>
        str(a?.name).trim() ? [{ name: str(a.name).trim(), surfaces: list(a.surfaces) }] : [],
    ),
    modules,
  };
}

/**
 * The brief once a proposal is accepted (REQ-074): the proposal's product,
 * surfaces, actors and modules, in its order; a module keeps the rules,
 * examples and questions the brief has for it unless the proposal gives its own.
 */
export function acceptProposal(current: BriefForm | null, proposed: BriefForm): BriefForm {
  const mine = new Map((current?.modules ?? []).map((m) => [m.key, m]));
  return {
    exists: true,
    product: proposed.product || current?.product || "",
    surfaces: proposed.surfaces.length ? proposed.surfaces : (current?.surfaces ?? []),
    actors: proposed.actors.length ? proposed.actors : (current?.actors ?? []),
    modules: proposed.modules.map((p) => {
      const had = mine.get(p.key);
      const own = p.rules.length || p.examples.length || p.questions.length || p.prose;
      return own || !had ? { ...p, section: true } : { ...had, key: p.key, name: p.name };
    }),
  };
}
