export const INITIAL_PROJECTS = [
  {
    id: "p1",
    name: "Midnight Redesign",
    description: "Full UI overhaul of the consumer dashboard. Shipping Q2.",
    color: "#6366f1",
    progress: 68,
    tasks: { todo: 4, inProgress: 3, review: 2, done: 11 },
    members: ["AK", "JR", "MS"],
    dueDate: "Apr 30",
    tag: "Design",
  },
  {
    id: "p2",
    name: "API Gateway v3",
    description: "GraphQL migration + rate limiting + new auth layer.",
    color: "#10b981",
    progress: 42,
    tasks: { todo: 8, inProgress: 5, review: 1, done: 6 },
    members: ["TD", "LS"],
    dueDate: "May 15",
    tag: "Engineering",
  },
  {
    id: "p3",
    name: "Ops Automation",
    description: "Incident playbooks, auto-escalation, runbook generator.",
    color: "#f59e0b",
    progress: 85,
    tasks: { todo: 1, inProgress: 2, review: 3, done: 24 },
    members: ["RB", "AK", "ZW"],
    dueDate: "Apr 10",
    tag: "Operations",
  },
  {
    id: "p4",
    name: "Growth Experiments",
    description: "A/B tests, funnel analysis, referral program v2.",
    color: "#ec4899",
    progress: 20,
    tasks: { todo: 12, inProgress: 2, review: 0, done: 3 },
    members: ["JR", "TD"],
    dueDate: "Jun 01",
    tag: "Growth",
  },
];

export const INITIAL_BOARDS = {
  p1: {
    columns: [
      {
        id: "todo",
        title: "Backlog",
        cards: [
          { id: "c1", title: "Audit current component library", priority: "low", assignee: "AK", tags: ["research"], due: "Apr 5", description: "" },
          { id: "c2", title: "Define new color token system", priority: "high", assignee: "JR", tags: ["tokens", "design"], due: "Apr 8", description: "" },
          { id: "c3", title: "Motion design principles doc", priority: "medium", assignee: "MS", tags: ["docs"], due: "Apr 12", description: "" },
          { id: "c4", title: "Accessibility audit round 2", priority: "high", assignee: "AK", tags: ["a11y"], due: "Apr 20", description: "" },
        ],
      },
      {
        id: "inProgress",
        title: "In Progress",
        cards: [
          { id: "c5", title: "Redesign nav & sidebar", priority: "high", assignee: "JR", tags: ["nav", "design"], due: "Apr 6", description: "" },
          { id: "c6", title: "New card component variants", priority: "medium", assignee: "MS", tags: ["components"], due: "Apr 9", description: "" },
          { id: "c7", title: "Dark mode token pass", priority: "low", assignee: "AK", tags: ["tokens"], due: "Apr 11", description: "" },
        ],
      },
      {
        id: "review",
        title: "In Review",
        cards: [
          { id: "c8", title: "Hero section prototype", priority: "high", assignee: "JR", tags: ["prototype"], due: "Apr 4", description: "" },
          { id: "c9", title: "Onboarding flow revamp", priority: "medium", assignee: "MS", tags: ["ux", "flow"], due: "Apr 5", description: "" },
        ],
      },
      {
        id: "done",
        title: "Done",
        cards: [
          { id: "c10", title: "Initial kickoff & scope doc", priority: "low", assignee: "AK", tags: ["docs"], due: "Mar 20", description: "" },
          { id: "c11", title: "Competitor UX teardown", priority: "low", assignee: "JR", tags: ["research"], due: "Mar 22", description: "" },
        ],
      },
    ],
  },
  p2: {
    columns: [
      {
        id: "todo",
        title: "Backlog",
        cards: [
          { id: "d1", title: "Schema migration plan", priority: "high", assignee: "TD", tags: ["gql"], due: "May 2", description: "" },
          { id: "d2", title: "Rate limiter algorithm selection", priority: "medium", assignee: "LS", tags: ["infra"], due: "May 5", description: "" },
          { id: "d3", title: "Auth service abstraction", priority: "high", assignee: "TD", tags: ["auth"], due: "May 8", description: "" },
        ],
      },
      {
        id: "inProgress",
        title: "In Progress",
        cards: [
          { id: "d4", title: "GraphQL resolver layer", priority: "high", assignee: "LS", tags: ["gql", "api"], due: "Apr 28", description: "" },
          { id: "d5", title: "API versioning strategy", priority: "medium", assignee: "TD", tags: ["docs"], due: "Apr 30", description: "" },
        ],
      },
      {
        id: "review",
        title: "In Review",
        cards: [
          { id: "d6", title: "OAuth 2.0 integration PR", priority: "high", assignee: "LS", tags: ["auth"], due: "Apr 24", description: "" },
        ],
      },
      {
        id: "done",
        title: "Done",
        cards: [
          { id: "d7", title: "v2 API deprecation notice", priority: "low", assignee: "TD", tags: ["comms"], due: "Mar 30", description: "" },
        ],
      },
    ],
  },
};

export const DEFAULT_COLUMNS = [
  { id: "todo",       title: "Backlog",      cards: [] },
  { id: "inProgress", title: "In Progress",  cards: [] },
  { id: "review",     title: "In Review",    cards: [] },
  { id: "done",       title: "Done",         cards: [] },
];
