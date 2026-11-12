# Questions — draft-settings

What only the person who owns the studio can decide. The brief asks none for
this module; this one comes from drafting it.

| # | Question | Blocks | Options seen | Answer | Status |
|---|---|---|---|---|---|
| Q1 | Project settings that `specgate config set` cannot save today — agent profiles, quality checks, ALM — how does Settings treat them? | REQ-143 | Shown read-only, with the file they are in and the specgate command that writes them where one exists (`specgate quality init --level strict`), until specgate adds `config set` keys for them · Ask specgate for the keys first (`profiles.<name>.agent`, `quality`, `alm.provider`, `alm.token_env` …) and ship those sections with that release · The studio edits those files itself, keeping every line it does not own (against "only through specgate") | Ask specgate for the missing config set keys first (agent profiles, quality checks, ALM). Those sections ship with that specgate release; they are not read-only meanwhile, and the studio never edits those files. | reviewed |
