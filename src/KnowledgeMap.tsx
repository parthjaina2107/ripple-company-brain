import type { GraphState, Impact } from "../shared/types";
import { policies, topicOf, type PolicyTopic } from "../shared/policies";

const positions = [
  { id: "topic-trial", x: 430, y: 52 },
  { id: "policy-trial", x: 270, y: 150 },
  { id: "policy-enterprise", x: 690, y: 150 },
  { id: "doc-onboarding", x: 110, y: 264 },
  { id: "doc-support", x: 328, y: 264 },
  { id: "doc-faq", x: 546, y: 264 },
  { id: "doc-enterprise", x: 764, y: 264 },
  { id: "flow-reminder", x: 160, y: 378 },
  { id: "memory-answer", x: 440, y: 378 },
];
const labels: Record<string, string> = {
  "topic-trial": "Trial duration",
  "policy-trial": "Self-serve policy",
  "policy-enterprise": "Enterprise policy",
  "doc-onboarding": "Getting started",
  "doc-support": "Support playbook",
  "doc-faq": "Sales FAQ",
  "doc-enterprise": "Enterprise guide",
  "flow-reminder": "Reminder sequence",
  "memory-answer": "Saved agent answer",
};

export default function KnowledgeMap({
  graph,
  impacts = [],
  onSelect,
  topic = "trial_duration",
}: {
  graph: GraphState;
  impacts?: Impact[];
  onSelect: (id: string) => void;
  topic?: PolicyTopic;
}) {
  const basePositions = topic === "trial_duration" ? positions : [
    { id: policies[topic].root, x: 430, y: 52 },
    { id: `policy-${topic}-new`, x: 270, y: 150 },
    { id: `policy-${topic}-enterprise`, x: 690, y: 150 },
    { id: `doc-${topic}-new`, x: 200, y: 264 },
    { id: `doc-${topic}-enterprise`, x: 690, y: 264 },
    { id: `memory-${topic}`, x: 430, y: 264 },
    { id: `flow-${topic}`, x: 200, y: 378 },
  ];
  const basePolicyId = topic === "trial_duration" ? "policy-trial" : `policy-${topic}-new`;
  const topicLabels = topic === "trial_duration" ? labels : {
    [policies[topic].root]: policies[topic].label,
    [basePolicyId]: "Self-serve policy",
    [`policy-${topic}-enterprise`]: "Enterprise policy",
    [`doc-${topic}-new`]: "Self-serve guide",
    [`doc-${topic}-enterprise`]: "Enterprise guide",
    [`memory-${topic}`]: "Saved agent answer",
    [`flow-${topic}`]: "Handling workflow",
  };
  const latest = graph.nodes
    .filter(
      (n) =>
        n.kind === "policy" && n.status === "approved" && n.scope === "new" && topicOf(n) === topic,
    )
    .sort(
      (a, b) =>
        (b.effectiveFrom || "").localeCompare(a.effectiveFrom || "") ||
        (b.createdAt || "").localeCompare(a.createdAt || ""),
    )[0];
  const displayed =
    latest && latest.id !== basePolicyId
      ? [
          ...basePositions.map((p) =>
            p.id === basePolicyId ? { ...p, x: 430, y: 154 } : p,
          ),
          { id: latest.id, x: 180, y: 144 },
        ]
      : basePositions;
  const lookup = new Map(displayed.map((p) => [p.id, p]));
  // Collapse hidden claim nodes, but derive every displayed connection from actual active edges.
  const links: [string, string][] = [];
  for (const source of displayed) {
    const visit = (id: string, seen: Set<string>) => {
      if (seen.size > 6) return;
      for (const e of graph.edges.filter(
        (e) =>
          e.active &&
          e.source === id &&
          ["DEPENDS_ON", "ASSERTS"].includes(e.type),
      )) {
        if (seen.has(e.target)) continue;
        if (lookup.has(e.target)) links.push([source.id, e.target]);
        else visit(e.target, new Set([...seen, e.target]));
      }
    };
    visit(source.id, new Set([source.id]));
  }
  const classification = new Map(
    impacts.map((i) => [i.artifact.id, i.classification]),
  );
  return (
    <div className="map-surface">
      <svg
        viewBox="0 0 880 440"
        role="img"
        aria-label={`${policies[topic].label} dependency map. Intermediate claim nodes are collapsed; open an impact result to see its full evidence path.`}
      >
        <defs>
          <pattern
            id="dots"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="#d9dfd4" />
          </pattern>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path
              d="M 0 0 L 10 5 L 0 10"
              fill="none"
              stroke="#a8b6a6"
              strokeWidth="1.6"
            />
          </marker>
        </defs>
        <rect width="880" height="440" fill="url(#dots)" />
        {[...new Map(links.map((link) => [link.join(":"), link])).values()].map(
          ([from, to]) => {
            const a = lookup.get(from)!;
            const b = lookup.get(to)!;
            return (
              <path
                key={from + to}
                d={`M${a.x},${a.y - 25} C${a.x},${a.y - 80} ${b.x},${b.y + 80} ${b.x},${b.y + 25}`}
                fill="none"
                stroke={
                  classification.get(from) === "conflict"
                    ? "#d6a182"
                    : "#bdc8b7"
                }
                strokeWidth="1.5"
                markerEnd="url(#arrow)"
              />
            );
          },
        )}
        {displayed.map(({ id, x, y }) => {
          const node = graph.nodes.find((n) => n.id === id);
          if (!node) return null;
          const status = classification.get(id);
          const isRoot = id === policies[topic].root;
          return (
            <g
              key={id}
              transform={`translate(${x},${y})`}
              role="button"
              tabIndex={0}
              aria-label={`Open ${node.title}`}
              onClick={() => onSelect(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(id);
                }
              }}
              className={`map-node ${isRoot ? "map-root" : ""} ${status || ""}`}
            >
              <rect x="-93" y="-27" width="186" height="54" rx="10" />
              <circle
                cx="-74"
                cy="0"
                r="4"
                fill={
                  isRoot
                    ? "#d9eeaf"
                    : status === "conflict"
                      ? "#c7774d"
                      : status === "review"
                        ? "#b69746"
                        : "#7b9377"
                }
              />
              <text x="-61" y="-2" className="map-title">
                {topicLabels[id] || "Updated self-serve policy"}
              </text>
              <text x="-61" y="13" className="map-type">
                {isRoot
                  ? "CONNECTED POLICY TOPIC"
                  : node.kind === "policy"
                    ? `${node.value} ${policies[topic].unit} · ${node.scope}`
                    : node.kind === "memory"
                      ? "AGENT MEMORY"
                      : node.kind.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="map-caption">
        <span>
          <i className="legend-dot green" />
          Policy & knowledge
        </span>
        <span>
          <i className="legend-dot orange" />
          Conflict
        </span>
        <span>
          <i className="legend-dot yellow" />
          Needs review
        </span>
        <small>Selected neighborhood · claims collapsed</small>
      </div>
    </div>
  );
}
