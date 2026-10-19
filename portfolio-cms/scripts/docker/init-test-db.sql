-- Separate databases for automated tests. Both are wiped by the tests.
CREATE DATABASE portfolio_test OWNER portfolio;  -- Vitest integration tests (TEST_DATABASE_URL)
CREATE DATABASE portfolio_e2e OWNER portfolio;   -- Playwright end-to-end tests
