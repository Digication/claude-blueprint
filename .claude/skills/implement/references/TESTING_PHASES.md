# Testing Phase Templates

Reference templates for unit test and E2E test phases in implementation plans. All examples are stack-agnostic — adapt to whatever test runner and framework the project uses.

---

## Unit Test Phase Template

```markdown
# Phase NN — Unit Tests

You are writing unit tests for [feature name].

**Context:** Phases 01–(NN-1) have built [summary of what was built]. This phase adds comprehensive unit tests for all new code.

**Note:** Tests must NOT make real API calls to external services. Mock all external dependencies.

## Overview

- Configure the test runner (if not already configured)
- Create test setup file with shared fixtures
- Test [module 1]
- Test [module 2]
- ...

## Steps

### 1. Configure test runner (skip if already configured)

**Files to create:** [test config file]

[Include full config with path aliases matching the project]

### 2. Create test setup

**Files to create:** [test setup file path]

[Include setup/teardown for shared resources — in-memory databases, temp dirs, mock servers]

### 3. Test [module name]

**Files to create:** [test file path following project conventions]

[Include complete test file with imports, describe blocks, and assertions]

## Verification

[Project-specific test command]
[Project-specific typecheck command]

Expected: All tests pass. No type errors.

## When done

Report: files created (with summary per file), verification results (test pass/fail counts), and any issues encountered.
```

### Unit Test Principles

**Test setup and teardown:**
- Initialize shared resources (in-memory databases, temp directories) in `beforeAll`/`beforeEach`
- Clean state between tests in `afterEach` — each test must be independent
- Release resources in `afterAll` — close connections, delete temp files

**Test factory pattern:**
- Create factory functions for test objects with sensible defaults and overrides
- Avoids repetition and makes tests more readable
- Example shape: `makeEntity(overrides: Partial<Entity>): Entity`

**Mocking external dependencies:**
- Mock at the boundary (API clients, file system, network)
- Never make real API calls in unit tests
- For modules with singleton state, use dynamic imports after overriding environment

**What to test by module type:**

| Module type | Test focus |
|---|---|
| Data loaders/stores | Load, get, create, count, edge cases (missing, duplicate) |
| Prompt/template generation | Each variant produces correct output, placeholders replaced, config fields included |
| Search/index modules | Relevant results for known queries, empty for garbage, correct by-ID lookup |
| Tool/action definitions | Execute function returns expected shape, handles missing/invalid input |
| Entity/model CRUD | Create, read, relations, required fields, constraints |
| Utility/helper functions | All branches, edge cases, error cases |

---

## E2E Test Phase Template

```markdown
# Phase NN — E2E Tests

You are writing end-to-end tests for [feature name].

**Context:** Phases 01–(NN-1) have built the complete application. This phase adds E2E tests that verify key user flows through the actual UI.

**Note:** Tests that require external API calls should skip gracefully when credentials are not available. Tests that don't need external services (navigation, listing, form interaction) should always run.

## Overview

- Configure the E2E test runner
- Write tests for: [user flow 1], [user flow 2], ...
- Handle async operations with appropriate wait strategies

## Steps

### 1. Configure E2E runner

**Files to create:** [E2E config file]

[Include full config with server startup, timeouts, browser config]

### 2. Test: [User flow name]

**Files to create:** [E2E test file path]

[Include complete test file]

## Verification

[Install browsers if needed]
[Run E2E tests]

Expected: Without external API credentials — core UI tests pass, API-dependent tests skip. With credentials — all tests pass.

## When done

Report: files created (with summary per file), verification results (test pass/fail counts), and any issues encountered.
```

### E2E Test Principles

**Server management:**
- Configure the test runner to auto-start dev servers if not already running
- Use `reuseExistingServer` options so tests work both in CI and against locally running servers
- Set generous startup timeouts — first-time builds and cold starts are slow

**Graceful degradation for API-dependent tests:**
- Check for required credentials at the top of test suites
- Skip the entire suite (not individual assertions) when credentials are missing
- Always document which tests need credentials and which don't

**Wait strategies for async UI:**
- Wait for specific content to appear, not arbitrary time delays
- Use generous timeouts for operations involving external services (AI, APIs)
- Prefer waiting for visible elements over waiting for network requests
- For streaming/real-time content, wait for the final expected state

**What to test in E2E vs unit tests:**

| Test in unit tests | Test in E2E |
|---|---|
| Business logic correctness | User can complete a workflow end-to-end |
| Edge cases and error handling | UI elements render and respond to interaction |
| Data transformation | Frontend-backend integration works |
| Individual function behavior | Streaming/real-time updates display correctly |

**What to cover in E2E:**

| Flow | What to verify |
|---|---|
| Page load | Core elements render, data loads from API |
| Navigation | Links work, URL updates, state reflects navigation |
| CRUD operations | Create/read/update/delete through the UI |
| Search/filter | Filtering reduces visible items, search returns relevant results |
| Form interaction | Fields accept input, validation works, submit succeeds |
| Real-time updates | Progressive updates appear, final state is correct |
| Error states | Graceful handling when backend is down or returns errors |

---

## Placement in Dependency Graph

Testing phases have strict dependency requirements:

```
implementation phases (01–N)
  └──► unit tests (N+1)      ← depends on all code being written
         └──► E2E tests (last) ← depends on full app working end-to-end
```

- **Unit test phase** comes after all the implementation phases it covers. If backend and frontend are separate tracks, backend unit tests can run after backend phases complete (before frontend is done).
- **E2E test phase** is always the final phase — it requires the complete, integrated application.
- Unit tests can sometimes run in parallel with later implementation phases if they only test already-completed modules.

## Verification Strategy Table

Include this in the `00-overview.md`:

```markdown
| Tier | Command | When |
|------|---------|------|
| Typecheck | [typecheck command] | After every phase |
| Unit tests | [test command] | After unit test phase |
| Build | [build command] | After frontend phases |
| E2E tests | [e2e command] | After final phase |
```
