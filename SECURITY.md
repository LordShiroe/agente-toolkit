# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of Agente Toolkit seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do NOT:

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before we've had a chance to address it

### Please DO:

**Report security vulnerabilities via GitHub Security Advisories:**

1. Go to the [Security tab](https://github.com/LordShiroe/agente-toolkit/security) of the repository
2. Click "Report a vulnerability"
3. Fill in the details of the vulnerability

**Or email directly:**

- Email: [Add your security contact email]
- Subject: `[SECURITY] Brief description of the issue`

### What to Include:

Please include the following information in your report:

- **Type of vulnerability** (e.g., injection, authentication bypass, etc.)
- **Full paths of source file(s)** related to the vulnerability
- **Location of the affected source code** (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof-of-concept or exploit code** (if possible)
- **Impact of the issue**, including how an attacker might exploit it

### What to Expect:

- **Acknowledgment**: We'll acknowledge receipt of your vulnerability report within 48 hours
- **Communication**: We'll keep you informed about the progress of fixing the vulnerability
- **Timeline**: We aim to patch critical vulnerabilities within 7 days
- **Credit**: We'll credit you in the security advisory (unless you prefer to remain anonymous)

## Security Best Practices for Users

### API Key Management

**DO:**

- Store API keys in environment variables or secure key management systems
- Use `.env` files for local development (never commit these)
- Rotate API keys regularly
- Use separate API keys for development, staging, and production

**DON'T:**

- Hard-code API keys in your source code
- Commit API keys to version control
- Share API keys in public channels
- Use production API keys in development

**Example (Secure):**

```typescript
import { ClaudeAdapter } from 'agente-toolkit';
import * as dotenv from 'dotenv';

dotenv.config();

// Good: API key from environment variable
const adapter = new ClaudeAdapter(process.env.ANTHROPIC_API_KEY!);
```

**Example (INSECURE - Don't do this):**

```typescript
// BAD: Never hard-code API keys!
const adapter = new ClaudeAdapter('sk-ant-api-key-here'); // ❌ NEVER DO THIS
```

### Input Validation

When building agents that accept user input:

```typescript
// Validate and sanitize user input
function sanitizeInput(input: string): string {
  // Remove potential code injection attempts
  // Limit length
  // Validate format
  return input.trim().slice(0, 1000);
}

const userMessage = sanitizeInput(getUserInput());
const result = await agent.run(userMessage, adapter);
```

### Rate Limiting

Implement rate limiting when exposing agents via APIs:

```typescript
// Example with express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/agent', limiter);
```

### Error Handling

Don't expose sensitive information in error messages:

```typescript
try {
  const result = await agent.run(message, adapter);
  return result;
} catch (error) {
  // Good: Log full error internally
  logger.error('Agent execution failed', { error, userId, timestamp });

  // Good: Return generic message to user
  return 'An error occurred. Please try again later.';

  // Bad: Don't expose stack traces or internals to users
  // return error.stack; // ❌ NEVER DO THIS
}
```

### Dependency Security

- Regularly update dependencies: `npm audit fix`
- Review dependency vulnerabilities: `npm audit`
- Use lock files (`package-lock.json`) to ensure consistent versions
- Consider using tools like Snyk or Dependabot

### Tool Security

When creating custom tools, validate inputs and outputs:

```typescript
agent.addTool({
  name: 'database_query',
  description: 'Query the database',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string' },
    },
  },
  action: async ({ query }) => {
    // Validate query before execution
    if (!isValidQuery(query)) {
      throw new Error('Invalid query format');
    }

    // Use parameterized queries to prevent SQL injection
    return await db.query(query /* parameters */);
  },
});
```

### LLM-Specific Security

- **Prompt Injection**: Be aware that users might try to manipulate prompts
- **Data Leakage**: Don't include sensitive data in prompts
- **Output Validation**: Validate LLM outputs before using them
- **Context Limits**: Be mindful of token limits to avoid truncation

## Known Security Considerations

### LLM Provider Dependencies

This library relies on third-party LLM providers (Anthropic, OpenAI, Ollama). Security considerations:

- **API Keys**: Keep your provider API keys secure
- **Data Privacy**: Be aware of what data is sent to LLM providers
- **Rate Limits**: Respect provider rate limits to avoid service disruption
- **Terms of Service**: Comply with provider terms of service

### Memory Management

The agent memory system stores conversation history:

- Clear sensitive data from memory when no longer needed
- Be cautious about what information is retained
- Consider implementing memory encryption for sensitive use cases

## Security Updates

We will publish security advisories for any vulnerabilities found in Agente Toolkit. Subscribe to:

- **GitHub Security Advisories**: Watch the repository for security updates
- **Release Notes**: Check release notes for security fixes
- **npm Advisories**: Keep your npm packages updated

## Compliance

This project aims to follow security best practices including:

- OWASP Top 10 awareness
- Secure coding guidelines
- Dependency security scanning
- Regular security updates

## Acknowledgments

We thank the security researchers and community members who help keep Agente Toolkit secure.

---

**Last Updated**: October 19, 2025
