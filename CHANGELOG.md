# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2025-10-20

### Added

- **CHANGELOG.md**: Now tracking all changes with proper semantic versioning
- **Comprehensive Documentation**: Priority 1 documentation fixes
  - Added npm installation instructions to README
  - Added badges to README (npm version, license, TypeScript, Node.js)
  - Created Quick Start guide with progressive examples
  - Fixed all import examples to work for npm users
  - Added documentation links section
- **engines field**: Added Node.js >= 18.0.0 requirement to package.json

### Changed

- **README.md**: Major improvements
  - Replaced git clone with npm install as primary installation method
  - Fixed example code to not reference unavailable `./examples/agents`
  - Added proper Quick Start section
  - Updated documentation structure and links
- **LOGGING.md**: Fixed incorrect package name (`@agente-toolkit/core` → `agente-toolkit`)
- **CONTRIBUTING.md**: Updated project structure to reflect current architecture
  - Removed CLI references
  - Documented examples/ directory
  - Clarified core vs example agents
- **examples/README.md**: Complete rewrite
  - Clear instructions for copying example agents from GitHub
  - Fixed Agent constructor examples
  - Added proper usage examples with `.run()` method
  - Comprehensive guide for building custom agents

### Removed

#### Breaking Changes

- **CLI Tool**: Removed command-line interface (was a debugging tool, not intended for production)
  - Removed `src/cli/` directory
  - Removed `agente-toolkit` binary from package.json
  - Removed `commander` dependency
  - Package size reduced by 33% (90.6KB → 60.6KB)
- **Demo Agents from Core API**: CalculatorAgent and WeatherAgent no longer exported from main package
  - Old: `import { CalculatorAgent } from 'agente-toolkit';`
  - New: Copy from `examples/agents/` in GitHub repository
  - Only ManagerAgent remains as core exported agent
  - Example agents moved to `examples/agents/` directory

## [0.1.0] - 2025-10-19

### Added

#### Core Features

- **Native Tool Calling Support**: Claude adapter now supports Anthropic's native tool calling with automatic fallback to traditional planning
- **ExecutionEngine**: New execution orchestration layer that intelligently chooses between native tools and planned execution
- **ResponseProcessor**: Automatic post-processing that converts raw tool results into natural, conversational responses
- **ManagerAgent**: Intelligent agent orchestration with dynamic agent discovery, keyword-based routing, and capability awareness
- **Agent Registry System**: Functions for registering, discovering, and managing multiple specialized agents
  - `registerAgent()` - Register agents with metadata
  - `getAgent()` - Retrieve registered agents
  - `getAvailableAgents()` - List all registered agents
  - `findAgentsByCategory()` - Find agents by category
  - `findAgentsByKeywords()` - Find agents by keywords
  - `clearRegistry()` - Clear all registered agents

#### Adapters

- **ClaudeAdapter**: Full native tool calling support with automatic fallback
- **OpenAIAdapter**: Complete OpenAI integration
- **OllamaAdapter**: Local LLM support via Ollama

#### Memory & Tools

- **SlidingWindowMemoryManager**: Context-aware memory with relevance scoring
- **AgentTool**: Enhanced tool system with schema validation via TypeBox
- **Tool interface**: Clean tool definition with TypeScript types

#### Logging & Monitoring

- **Injectable Logging System**: Pluggable logger interface
- **ConsoleLogger**: Default console output logger
- **SilentLogger**: No-op logger for production
- **Structured Events**: Detailed execution tracking with metadata

#### Development Tools

- **TypeScript Support**: Full type definitions and TypeScript-first development
- **Rollup Build**: Optimized CJS, ESM, and TypeScript declaration outputs
- **Vitest Testing**: Comprehensive test suite with 90 passing tests
- **GitHub Actions CI/CD**: Automated testing and npm publishing workflows

#### Documentation

- **README.md**: Comprehensive library documentation with examples
- **CONTRIBUTING.md**: Detailed contribution guidelines
- **SECURITY.md**: Security policy and vulnerability reporting
- **LOGGING.md**: Injectable logging system documentation
- **LICENSE**: MIT License
- **ADR Documentation**: Architecture Decision Records for major decisions

#### Examples

- **CalculatorAgent**: Demonstrates basic arithmetic operations and tool registration
- **WeatherAgent**: Shows external API integration and real-world tool patterns
- **examples/README.md**: Guide for using and extending example agents

### Changed

- **Project Name**: Renamed from "AiNoob" to "agente-toolkit"
- **Package Scope**: Published as `agente-toolkit` on npm
- **Agent Architecture**: Separated concerns with ExecutionEngine, ResponseProcessor, and Planner

### Removed

- **Git History Cleanup**: Removed legacy "AiNoob" references from entire git history (339 occurrences)

### Security

- **Git History**: Removed legacy "AiNoob" references from entire git history
- **Secrets Scanning**: Added Gitleaks security scanning to CI/CD
- **Security Policy**: Established vulnerability reporting process
- **NPM 2FA**: Two-factor authentication enabled for package publishing

### Infrastructure

- **Build System**: Rollup configuration with three output formats (CJS, ESM, Types)
- **Testing**: Vitest with coverage reporting (90 tests passing)
- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier with automated formatting
- **Git Hooks**: Husky pre-commit hooks for code quality
- **CI/CD**: GitHub Actions workflows for testing and publishing

### Dependencies

#### Production Dependencies

- `@anthropic-ai/sdk` ^0.62.0 - Claude API integration
- `@sinclair/typebox` ^0.25.24 - Schema validation
- `ajv` ^8.17.1 - JSON schema validation
- `node-fetch` ^2.7.0 - HTTP client
- `openai` ^6.0.0 - OpenAI API integration
- `string-similarity` ^4.0.4 - Keyword matching
- `winston` ^3.17.0 - Logging framework

#### Development Dependencies

- `typescript` ^4.9.5 - TypeScript compiler
- `vitest` ^3.2.4 - Testing framework
- `rollup` ^4.52.2 - Module bundler
- `eslint` ^8.0.0 - Code linting
- `prettier` ^2.8.8 - Code formatting

### Performance

- **Package Size**: 60.6KB (initial release size)
- **Build Time**: ~2-3 seconds for all three output formats
- **Test Execution**: 90 tests in ~1.35 seconds

### Known Issues

- OpenAI adapter native tools support not yet implemented (falls back to planning)
- Ollama adapter native tools support not yet implemented (falls back to planning)
- Memory system does not persist across sessions

---

## Future Releases

## Future Releases

### Planned Features

- Streaming response support
- Persistent memory backends (Redis, PostgreSQL)
- Additional LLM provider adapters
- Enhanced error recovery strategies
- Rate limiting and cost tracking
- Agent composition patterns
- Plugin system for extensibility

---

## Migration Guides

### Migrating to v0.2.0 (Upcoming)

#### CLI Removal

If you were using the CLI tool, you'll need to migrate to programmatic usage:

```typescript
// Old (CLI - no longer available in v0.2.0)
// $ agente-toolkit run "message"

// New (Programmatic)
import { Agent, ClaudeAdapter } from 'agente-toolkit';

const agent = new Agent();
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY);
const result = await agent.run('message', adapter);
console.log(result);
```

#### Example Agents

CalculatorAgent and WeatherAgent will no longer be exported from the core package in v0.2.0:

```typescript
// Old (v0.1.x - will not work in v0.2.0)
import { CalculatorAgent } from 'agente-toolkit';

// New (v0.2.0+)
// 1. Copy from GitHub repository examples/agents/
// 2. Import from your local copy
import { CalculatorAgent } from './examples/agents/CalculatorAgent';
```

### Migrating from v0.0.x to v0.1.0

No breaking changes. All v0.0.x code should work with v0.1.0.

---

## Links

- [npm Package](https://www.npmjs.com/package/agente-toolkit)
- [GitHub Repository](https://github.com/LordShiroe/agente-toolkit)
- [Issue Tracker](https://github.com/LordShiroe/agente-toolkit/issues)
- [Security Policy](https://github.com/LordShiroe/agente-toolkit/blob/main/SECURITY.md)

---

**Note**: This is the first official release of agente-toolkit. Prior versions were internal development builds.
