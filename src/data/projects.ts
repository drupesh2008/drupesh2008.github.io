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
    name: "Learning Hub",
    teaser:
      "A free, structured curriculum through distributed systems, system design, data and AI engineering — every resource hand-picked, every link straight to its author. No sign-in, no paywall.",
    status: "Live",
    accentColor: "teal",
    href: "/learning",
    stats: "5 tracks · 15 modules · 41 resources",
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
