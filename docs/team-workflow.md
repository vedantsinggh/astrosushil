# Team Workflow & Engineering Standards - Astro Sushil

This document outlines team operating procedures, Git branching rules, pull request workflows, testing requirements, and the Definition of Done for developing the **Astro Sushil** platform.

---

## 1. Git & Branching Strategy

The team follows a simplified **GitHub Flow / Feature Branch** strategy:

- **`main`**: Production-ready branch. Code in `main` must always be stable, tested, and deployable.
- **`develop`**: Integration branch for upcoming release features.
- **Feature Branches**: Formatted as `<type>/<short-description>`:
  - `feat/astrology-vimshottari-dasha`
  - `feat/nadi-directional-matrix`
  - `feat/flutter-kundli-chart-view`
  - `fix/razorpay-webhook-signature`
  - `docs/gupta-nadi-rulebook`

### Commit Message Conventions
Commits must strictly adhere to the **Conventional Commits** standard:
- `feat(astrology): add Navamsha D-9 calculation algorithm`
- `fix(api): correct timezone offset parsing in birth profile DTO`
- `docs(nadi): update BNN rule priorities for career domain`
- `test(engine): add 10 reference chart unit tests for D-1 Rashi`

---

## 2. Pull Request & Code Review Process

1. **Self-Review**: Developers must review their own code diffs before opening a Pull Request (PR).
2. **Automated Checks**: PRs must pass automated linting (`eslint`), type checks (`tsc`), and unit test suites before review.
3. **Peer Review**: Every PR targeting `develop` or `main` requires at least one approving code review from the other developer.
4. **No Direct Pushes**: Direct pushes to `main` and `develop` are strictly blocked.

---

## 3. Testing Requirements

- **Engine Packages (`packages/*`)**: 100% unit test coverage required for core mathematical formulas, chart calculations, and BNN rule evaluations.
- **Backend API (`apps/api`)**: Controller and service integration tests for all public API endpoints.
- **Client Apps (`apps/mobile`, `apps/admin`)**: Component widget testing and API integration mock tests.
- **Reference Fixture Validation**: Astrological algorithms must pass test suites against 50 verified reference charts before PR approval.

---

## 4. Task Ownership & Issue Tracking

- Tasks are managed via GitHub Issues / Project Board.
- Each issue must have an assigned owner (Developer 1 or Developer 2), priority label, and target phase/sprint.
- Issue descriptions must link to relevant specifications in `/docs`.

---

## 5. Definition of Done (DoD)

A task or feature is considered **DONE** only when:

1. **Specification Compliance**: The feature fully meets the requirements specified in `/docs`.
2. **Type Safety**: Code passes strict TypeScript compilation with zero `any` types.
3. **Test Passing**: All new unit and integration tests pass without failures.
4. **Documentation Updated**: Relevant spec docs in `/docs` updated to reflect implementation details or configuration parameters.
5. **Code Reviewed**: Approved pull request merged into target integration branch.
6. **No Security / Architecture Violations**: Verified compliance with `AGENTS.md` (no external paid astrology APIs, zero LLM calculation logic, proper channel isolation).
