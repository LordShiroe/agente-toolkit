import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test files
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    exclude: ['tests/fixtures/**', 'tests/utils/**', 'node_modules/**', 'dist/**'],
    
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'tests/**',
        'dist/**',
        'src/cli/**',
        'src/agents/calculator/**',
        'src/agents/weather/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/node_modules/**'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    },
    
    // Timeout for tests that may call external APIs
    testTimeout: 30000,
    
    // Setup files
    setupFiles: ['./tests/setup/global-setup.ts'],
    
    // Pool options for better performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    }
  },
  
  resolve: {
    alias: {
      '@': './src',
      '@tests': './tests'
    }
  }
});