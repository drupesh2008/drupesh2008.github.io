export interface Project {
  id: string;
  name: string;
  teaser: string;
  status: string;
  accentColor: 'teal' | 'violet' | 'amber';
  /** set for shipped work — the card links there instead of sitting locked */
  href?: string;
  /** short mono fact line shown on live cards */
  stats?: string;
}

export const projects: Project[] = [
  {
    id: "learning",
    name: "Learning Pathways",
    teaser:
      "Four free courses from zero to professional — foundations, distributed systems, system design and AI engineering — written and hosted here, with each stage linking out to the best free reading. No sign-in, no paywall.",
    status: "Live",
    accentColor: "teal",
    href: "/learning",
    stats: "4 pathways · 56 stages mapped · 95 links out",
  },
  {
    id: "tech-blogs",
    name: "Industry Tech Blogs",
    teaser:
      "One reader over the engineering blogs worth following, from Netflix and Airbnb to the research labs. Engineering write-ups only — release notes and announcements are filtered out. Filter by company or topic, including Agentic AI; every card links to the original post. A GitHub Action refreshes the index every six hours.",
    status: "Live",
    accentColor: "violet",
    href: "/tech-blogs",
    stats: "1,000 posts · 90+ engineering blogs · self-refreshing",
  },
  {
    id: "research-papers",
    name: "Research Papers, Explained",
    teaser:
      "Twenty papers that shaped how software is built — MapReduce, Dynamo, Raft, Spanner, Bigtable, Kafka, Borg, AlexNet, the Transformer and more. Each one is told problem-first in plain words, with diagrams, an interactive simulation to play with, and a link to the original paper.",
    status: "Live",
    accentColor: "amber",
    href: "/research-papers",
    stats: "4 fields · 20 papers · 20 interactive sims",
  },
];
