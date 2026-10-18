# Queries the product depends on

Executable query code: `server/repository.ts`. Domain applicability checks: `server/domain.ts`.

## Follow connected knowledge

```cypher
MATCH p=(a:Entity)-[:DEPENDS_ON|ASSERTS*1..6]->(topic:Entity {id: $target})
WHERE all(r IN relationships(p) WHERE r.active = true)
RETURN [n IN nodes(p) | n.id] AS ids,
       [r IN relationships(p) | type(r)] AS relations
```

Parameter: `target = 'topic-trial'`, `'topic-refund'`, `'topic-cancellation'` or `'topic-support'`, depending on the selected policy area.

This powers impact analysis. It discovers documents through claims and workflows through dependent documents. The application checks the start node kind, preserves the returned evidence path, and classifies each item against the applicable policy. A dependency alone never proves a contradiction. Old inactive assertion links do not support current results.

## Load authoritative workspace data

```cypher
MATCH (n:Entity) RETURN n.payload AS payload, 'node' AS category
UNION ALL
MATCH (:Entity)-[r]->(:Entity) RETURN r.payload AS payload, 'edge' AS category
UNION ALL
MATCH (m:RippleMeta {id: 'workspace'})
RETURN toString(coalesce(m.revision, 0)) AS payload, 'revision' AS category
UNION ALL
MATCH (m:RippleMeta {id: 'workspace'})
RETURN coalesce(m.commands, '[]') AS payload, 'commands' AS category
```

This single query reads policies, scopes, decisions, review tasks, source revisions and save metadata from FalkorDB in one consistent snapshot. For the small hackathon graph, policy applicability is evaluated in TypeScript over these records. It is not an LLM judgment.

## Persist a change

The write builder creates parameterized, native entity/edge upserts in one constant-shaped query. Representative fragments from the current implementation:

```cypher
UNWIND $nodes AS row
MERGE (node:Entity {id: row.id})
SET node.payload = row.payload, node.kind = row.kind
WITH count(*) AS processed
UNWIND $edges_ASSERTS AS row
MATCH (source:Entity {id: row.source}), (target:Entity {id: row.target})
MERGE (source)-[rel:ASSERTS {id: row.id}]->(target)
SET rel.payload = row.payload, rel.active = row.active
```

Node IDs and payloads are parameters; relationship types come from an application allowlist. User and model text are never concatenated into Cypher. New graphs begin with a `RippleMeta` marker before any read-only query. A dedicated graph name prevents collision with other workspaces.

The full query repeats the relationship group for each of six allowed types. The aggregation between groups carries one row through empty arrays. Its text stays constant as the dataset grows, avoiding a different cached execution plan for every workspace size. This fixed a measured plan-cache memory problem in the original implementation.

No PageRank is used. Ranking by centrality would not establish which policy is authoritative, so it is deliberately absent from this workflow.

## Atomic save precondition

`FalkorRepository.read` uses one UNION query for entities, relationships and the metadata revision, giving a consistent snapshot. Save validates the entire projected graph, filters unchanged payloads and wraps the upserts above with a revision check:

```cypher
MERGE (m:RippleMeta {id: 'workspace'})
WITH m WHERE coalesce(m.revision, 0) = $expected
SET m.revision = $expected + 1, m.token = $token, m.commands = $commands
```

Each subsequent write group checks that the metadata still has this command's random token. The whole query is atomic. A stale revision cannot write any entity or edge and returns 409. Empty write groups still pass through aggregation, so the token guard is repeated for every group. The command-key list supports bounded retry deduplication. The Cloud regression runs two independent connections with deliberately ordered conflicting saves.
