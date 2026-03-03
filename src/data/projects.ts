export interface Project {
  id: string;
  name: string;
  teaser: string;
  status: string;
  accentColor: 'teal' | 'violet' | 'amber';
}

export const projects: Project[] = [
  {
    id: "alpha",
    name: "Project Alpha",
    teaser: "Something interesting is brewing...",
    status: "In Development",
    accentColor: "teal",
  },
  {
    id: "beta",
    name: "Project Beta",
    teaser: "Cooking up something exciting...",
    status: "Prototyping",
    accentColor: "violet",
  },
  {
    id: "gamma",
    name: "Project Gamma",
    teaser: "Watch this space...",
    status: "Stealth",
    accentColor: "amber",
  },
];
