# Contributing to Agente Toolkit

Thank you for your interest in contributing to Agente Toolkit! This document provides guidelines and instructions for contributing to the project.

## 🌟 Ways to Contribute

- **Report bugs** and suggest features via [GitHub Issues](https://github.com/LordShiroe/agente-toolkit/issues)
- **Improve documentation** by fixing typos, adding examples, or clarifying explanations
- **Submit bug fixes** or implement new features via Pull Requests
- **Write tests** to improve code coverage
- **Share your experience** using Agente Toolkit in your projects

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Git

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**

   ```bash
   git clone https://github.com/YOUR_USERNAME/agente-toolkit.git
   cd agente-toolkit
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Build the project:**

   ```bash
   npm run build
   ```

5. **Run tests:**

   ```bash
   npm test
   ```

6. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Development Workflow

### Code Style

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and concise
- Use async/await instead of callbacks

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
```

### Building

```bash
# Build the project
npm run build

# Build in watch mode (for development)
npm run build:watch

# Clean build artifacts
npm run build:clean
```

### Code Formatting

The project uses Prettier for code formatting and ESLint for linting:

```bash
# Format code
npm run format

# Lint code
npm run lint
```

## 🔧 Project Structure

```
agente-toolkit/
├── src/
│   ├── core/           # Core agent, execution, and memory logic
│   ├── infrastructure/ # Adapters (Claude, OpenAI, Ollama)
│   ├── agents/         # Example agents (Calculator, Weather, Manager)
│   ├── cli/            # CLI interface
│   └── shared/         # Shared utilities
├── tests/
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   ├── benchmarks/     # Performance tests
│   └── fixtures/       # Test fixtures and mocks
├── dist/               # Build output (generated)
└── coverage/           # Test coverage reports (generated)
```

## 📋 Pull Request Process

1. **Update your fork** with the latest changes from main:

   ```bash
   git checkout main
   git pull upstream main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Make your changes:**

   - Write clean, tested code
   - Add or update tests as needed
   - Update documentation if you're changing functionality
   - Follow the existing code style

3. **Commit your changes:**

   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

   **Commit Message Format:**

   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `test:` for test additions/changes
   - `refactor:` for code refactoring
   - `chore:` for maintenance tasks

4. **Push to your fork:**

   ```bash
   git push origin your-feature-branch
   ```

5. **Create a Pull Request:**

   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill in the PR template with:
     - Clear description of changes
     - Related issue numbers (if any)
     - Testing performed
     - Screenshots (if UI changes)

6. **Address review feedback:**
   - Be responsive to code review comments
   - Make requested changes
   - Push updates to the same branch

## ✅ Checklist Before Submitting

- [ ] Code follows project style guidelines
- [ ] Tests added/updated and passing
- [ ] Documentation updated (if applicable)
- [ ] No linting errors (`npm run lint`)
- [ ] All tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Commit messages follow convention
- [ ] PR description is clear and complete

## 🐛 Bug Reports

When reporting bugs, please include:

- **Description:** Clear description of the issue
- **Steps to reproduce:** Minimal code example
- **Expected behavior:** What should happen
- **Actual behavior:** What actually happens
- **Environment:**
  - Node.js version
  - OS and version
  - Package version
  - LLM provider (Claude, OpenAI, Ollama)

**Example:**

```typescript
// Minimal reproduction
import { Agent, ClaudeAdapter } from 'agente-toolkit';

const agent = new Agent();
// ... code that reproduces the bug
```

## 💡 Feature Requests

When requesting features, please include:

- **Use case:** Why is this feature needed?
- **Proposed solution:** How should it work?
- **Alternatives considered:** Other approaches you've thought about
- **Additional context:** Any other relevant information

## 🧪 Testing Guidelines

### Writing Tests

- Place unit tests in `tests/unit/`
- Place integration tests in `tests/integration/`
- Use descriptive test names
- Test edge cases and error conditions
- Mock external dependencies (API calls)

**Example:**

```typescript
import { describe, it, expect } from 'vitest';
import { Agent } from '../src/core/agent/Agent';

describe('Agent', () => {
  it('should create an agent with default settings', () => {
    const agent = new Agent();
    expect(agent).toBeDefined();
  });

  it('should add tools successfully', () => {
    const agent = new Agent();
    agent.addTool({
      name: 'test_tool',
      description: 'A test tool',
      parameters: { type: 'object', properties: {} },
      action: async () => 'result',
    });
    // Assert tool was added
  });
});
```

### Test Coverage

We aim for:

- **80%+ overall coverage**
- **90%+ coverage for core functionality**
- **100% coverage for critical paths**

## 📚 Documentation

### Code Documentation

- Add JSDoc comments for all public APIs
- Include usage examples in documentation
- Document complex algorithms or business logic
- Keep comments up-to-date with code changes

**Example:**

````typescript
/**
 * Executes an agent with the given message and adapter.
 *
 * @param message - The user's input message
 * @param adapter - The LLM adapter to use (Claude, OpenAI, etc.)
 * @param options - Optional execution configuration
 * @returns The agent's response as a string
 *
 * @example
 * ```typescript
 * const result = await agent.run(
 *   'Calculate 2 + 2',
 *   new ClaudeAdapter(apiKey),
 *   { maxSteps: 5 }
 * );
 * ```
 */
async run(
  message: string,
  adapter: ModelAdapter,
  options?: RunOptions
): Promise<string> {
  // Implementation
}
````

### README Updates

If your changes affect usage:

- Update code examples
- Add new sections if needed
- Update feature lists
- Keep examples working and tested

## 🤝 Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 📞 Getting Help

- **Questions?** Open a [GitHub Discussion](https://github.com/LordShiroe/agente-toolkit/discussions)
- **Issues?** Check [existing issues](https://github.com/LordShiroe/agente-toolkit/issues) or create a new one
- **Chat:** (Add Discord/Slack link if available)

## 📄 License

By contributing to Agente Toolkit, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---

Thank you for contributing to Agente Toolkit! 🚀
