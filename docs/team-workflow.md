# Team Workflow & Engineering Standards - Astro Sushil

This document outlines team guidelines, Git branching conventions, pull request rules, code review standards, and the Definition of Done (DoD) for developers working on the **Astro Sushil** platform.

---

## 1. Git Branching Strategy

The repository follows a modified **GitHub Flow / Git Flow** model suited for monorepos:

- **`main`**: Production-ready branch. Must always be stable, tested, and deployable. Direct commits to `main` are strictly prohibited.
- **`develop`**: Integration branch for current sprint features.
- **`feature/<domain>-<short-description>`**: Feature development branches created off `develop` (e.g. `feature/astrology-dasha-engine`, `feature/mobile-kundli-view`).
- **`fix/<issue-id>-<description>`**: Bug fix branches (e.g. `fix/razorpay-webhook-signature`).
- **`docs/<topic>`**: Documentation updates.

---

## 2. Commit Message Standards

Commits must follow **Conventional Commits** format:

```
<type>(<scope>): <short summary>

[optional body description]
```

### Types:
- `feat`: New feature or business logic addition.
- `fix`: Bug fix in existing functionality.
- `docs`: Documentation updates only.
- `refactor`: Code restructuring without changing external behavior.
- `test`: Adding or updating unit/integration tests.
- `chore`: Infrastructure, dependency, or config updates.

### Examples:
- `feat(astrology): implement Vimshottari dasha calculation engine`
- `fix(payments): resolve Razorpay webhook signature verification bug`
- `docs(specs): add BNN rule priority template to gupta-nadi-spec`

---

## 3. Pull Request (PR) & Code Review Guidelines

1. **Self-Review First**: The PR author must review their own diff before requesting review.
2. **PR Size Limit**: Keep PRs focused (`< 500 lines` of diff preferred) to facilitate thorough review.
3. **Mandatory Peer Review**: Every PR targeting `develop` or `main` requires at least one approving code review from the Primary Developer or designated reviewer.
4. **CI Checks Passing**: All automated tests, linter checks, and TypeScript typechecks (`tsc --noEmit`) must pass cleanly before merge.
5. **No Direct Pushes**: `main` and `develop` branches are protected.

---

## 4. Definition of Done (DoD)

A feature or task is considered **DONE** only when all the following criteria are met:

1. **Code Implementation**: Feature is completely implemented according to specifications in `/docs`.
2. **Type Safety & Linting**: Code strictly passes TypeScript strict checks (`"strict": true`) without `any` types, or Dart analysis.
3. **Automated Unit Tests**:
   - New business logic, astrology formulas, or BNN rules have unit tests.
   - All unit tests pass locally and in CI runner.
4. **No Regression**: Existing tests remain green.
5. **Documentation Updated**: Relevant spec docs in `/docs` or execution logs in `docs/agent-execution-log.md` are updated.
6. **Code Review Approval**: Minimum of 1 approving review from team lead / reviewer.
7. **No Unapproved Dependencies**: No new external npm / pub packages added without documented justification.
