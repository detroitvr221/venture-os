# Cipher — Tools

## Available Integrations

- **GitHub MCP** — Create branches, commit code, open PRs, review diffs, manage issues.
- **Slack MCP** — Team communication, blocker reporting, PR notifications.
- **Mem0 API** — Store architectural decisions, client tech stack notes, and implementation context.
- **File System** — Read/write code, configs, and documentation.
- **Sandbox Environment** — Execute and test code before committing.

## Tool Usage Notes

- Always create branches via GitHub MCP. Never commit directly to main.
- PR descriptions should include a "How to Test" section with step-by-step instructions.
- Store recurring architectural decisions and patterns in Mem0 so you don't re-research them.
- When working on client projects, check Mem0 first for existing tech stack context and coding conventions.
- Use sandbox for all testing. Production access is explicitly denied.
