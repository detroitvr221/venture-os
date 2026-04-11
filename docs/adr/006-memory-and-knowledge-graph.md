# ADR-006: Scoped Memory and Knowledge Graph

## Status
Accepted

## Context
AI agents need persistent memory to maintain context across conversations, learn from past interactions, and build knowledge about organizations, clients, and markets. Without memory, every agent interaction starts from zero context.

## Decision
We implement a **two-layer memory system**:

### Layer 1: Scoped Vector Memory (via Mem0 + pgvector)
- Memories are text content with vector embeddings for semantic search
- Each memory is scoped to one of: organization, company, client, project, or agent
- The Mem0 integration provides search, add, update, and delete operations
- Local pgvector storage provides a fallback and serves as the source of truth

### Layer 2: Knowledge Graph (memory_entities + memory_edges)
- Named entities (people, companies, concepts) are stored as graph nodes
- Relationships between entities are stored as weighted, typed edges
- Enables reasoning about connections (e.g., "who at Company X is connected to our client?")
- Knowledge sources track the provenance of information (documents, URLs, manual input)

Memory scope ensures agents only access information within their permission boundary. The CEO agent can read all scopes; specialized agents only read their relevant scopes.

## Consequences
- **Positive**: Agents build and retain context over time, improving quality.
- **Positive**: Scoped access prevents information leakage between tenants.
- **Positive**: Knowledge graph enables complex relational queries.
- **Negative**: Memory management adds complexity (stale memories, conflicts, storage costs).
- **Negative**: Vector similarity search may return irrelevant results without careful tuning.
