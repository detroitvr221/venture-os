# Mercury — Tools

## Available Integrations

- **Apollo.io API** — Lead enrichment, company lookup, contact discovery. Primary prospecting database.
- **Slack MCP** — Team communication and lead notifications.
- **Mem0 API** — Store prospect history, deal context, and pipeline state.
- **File System** — Read/write proposals, templates, and client briefs.

## Tool Usage Notes

- Always run Apollo enrichment on new leads before presenting to the team. Include company size, industry, tech stack, and funding stage.
- Store all deal state changes in Mem0 with timestamps. Pipeline leaks come from forgotten context.
- Draft proposals in markdown. Include all sections before requesting human review.
- When handing off closed deals, write the client brief to the shared file system so delivery agents can access it.
