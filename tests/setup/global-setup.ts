import { beforeAll, afterAll } from 'vitest';

// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';

  // Suppress console logs during tests unless explicitly needed
  if (!process.env.VITEST_VERBOSE) {
    console.log = () => {};
    console.warn = () => {};
    console.info = () => {};
  }
});

afterAll(() => {
  // Cleanup after all tests
});

export {};
