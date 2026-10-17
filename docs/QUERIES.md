# Queries the product depends on

Executable query code: `server/repository.ts`. Domain applicability checks: `server/domain.ts`.

## Follow connected knowledge

```cypher
MATCH p=(a:Entity)-[:DEPENDS_ON|ASSERTS*1..6]->(topic:Entity {id: $target})
WHERE all(r IN relationships(p) WHERE r.active = true)
RETURN [n IN nodes(p) | n.id] AS ids,
       [r IN relationships(p) | type(r)] AS relations
```

Parameter: `target = 'topic-trial'`.

This powers impact analysis. It discovers documents through claims and workflows through dependent documents. The application checks the start node kind, preserves the returned evidence path, and classifies each item against the applicable policy. A dependency alone never proves a contradiction. Old inactive assertion links do not support current results.

## Load authoritative workspace data

```cypher
MATCH (n:Entity) RETURN n.payload AS payload
```

```cypher
MATCH (a:Entity)-[r]->(b:Entity) RETURN r.payload AS payload
```

These read policies, scopes, decisions, review tasks and source revisions from FalkorDB. For the small hackathon graph, policy applicability is evaluated in TypeScript over these records. It is not an LLM judgment.

## Persist a change

The write builder creates parameterized, native entity/edge upserts in a single query. Example fragment:

```cypher
MERGE (n0:Entity {id: $id0})
SET n0.payload = $p0, n0.kind = $k0
MERGE (n1:Entity {id: $id1})
SET n1.payload = $p1, n1.kind = $k1
MERGE (n0)-[r0:ASSERTS {id: $eid0}]->(n1)
SET r0.payload = $ep0, r0.active = $active0
```

Node IDs and payloads are parameters; relationship types come from an application allowlist. User and model text are never concatenated into Cypher. New graphs begin with a `RippleMeta` marker before any read-only query. A dedicated graph name prevents collision with other workspaces.

No PageRank is used. Ranking by centrality would not establish which policy is authoritative, so it is deliberately absent from this workflow.
