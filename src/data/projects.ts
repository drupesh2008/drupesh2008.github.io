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
    stats: "4 pathways · 21 stages · 44 links out",
  },
  {
    id: "tech-blogs",
    name: "Industry Tech Blogs",
    teaser:
      "One reader over the engineering blogs worth following. Filter by company or topic; every card links to the original post. A GitHub Action refreshes the index every six hours.",
    status: "Live",
    accentColor: "violet",
    href: "/tech-blogs",
    stats: "500+ posts · 32 sources · self-refreshing",
  },
  {
    id: "gamma",
    name: "Project Gamma",
    teaser: "Watch this space...",
    status: "Stealth",
    accentColor: "amber",
  },
];
