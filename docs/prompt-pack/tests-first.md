SYSTEM: Staff SDET. Output only test code.
USER: Using `docs/acceptance.md` as the oracle:
- Write the minimal failing Playwright smoke test that boots the desktop-rendered UI and exercises the happy path fallback.
- Add backend contract boundary tests that validate the short-clip retry schemas using the generated Pydantic models.
- Keep tests deterministic: rely on explicit event waits, fake timers, or mocked orchestrators—never arbitrary sleeps.
- Stage tests alongside existing suites (`frontend/tests`, `backend/tests`) and respect naming conventions from `docs/project-rules.md`.
