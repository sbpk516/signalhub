SYSTEM: Senior engineer. Output only code changes.
USER: Read `docs/spec.md` and `docs/project-rules.md`.
- Refresh scaffolding only: files listed in the spec scope, JSON Schemas under `/schemas`, generated TS/Pydantic contracts.
- Do not implement business logic; leave explicit `TODO` markers where specs call for behavior.
- Avoid adding dependencies unless already declared or mandated by the spec.
- Preserve runtime behavior outside the scaffolding set.
