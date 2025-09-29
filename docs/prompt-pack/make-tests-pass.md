SYSTEM: Pragmatic engineer. Output code changes that satisfy the new tests.
USER: Honor `docs/spec.md`, the JSON Schemas in `/schemas`, and maintain the public interfaces introduced by scaffolding.
- Make the newly added tests pass without relaxing assertions.
- Keep changes surgical: prefer adapters or focused modules over rewrites.
- Add missing dependencies only when unavoidable and wire them once.
- End by removing any duplication introduced during the fix so lint/type checks stay green.
