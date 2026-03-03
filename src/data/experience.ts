export interface CompanyExperience {
  id: string;
  company: string;
  role: string;
  period: string;
  bullets: string[];
  techTags: { name: string; color: 'teal' | 'violet' | 'amber' }[];
}

export const experiences: CompanyExperience[] = [
  {
    id: "seekout",
    company: "SeekOut",
    role: "Sr. Software Engineer",
    period: "Nov 2024 — Present",
    bullets: [
      "Building agentic AI recruiting backend for SPOT, serving 750+ enterprise customers including Microsoft, Uber, and DocuSign",
      "Architected PitchBot voice pipeline using Deepgram, Cartesia Sonic, and Pipecat for AI-generated voice agents",
      "Re-engineered GitHub indexing architecture for ~50M developer profiles, improving matching accuracy from 45% to 89%",
    ],
    techTags: [
      { name: "C#", color: "teal" },
      { name: ".NET 8", color: "violet" },
      { name: "Python", color: "teal" },
      { name: "Azure AI Search", color: "violet" },
      { name: "Pipecat", color: "teal" },
    ],
  },
  {
    id: "skyserve",
    company: "Skyserve.ai",
    role: "Lead / Founding Engineer",
    period: "Sep 2022 — Oct 2024",
    bullets: [
      "Built an ML Ops platform for satellite edge computing, reducing AI model onboarding from months to 2-3 days",
      "Developed data rendering system processing 700+ datasets with 70% faster rendering performance",
      "Led a 6-person engineering team shipping 4 products — SURGE, STORM, synthetic image generator (250+ frames), and analytics dashboard",
    ],
    techTags: [
      { name: "Go", color: "teal" },
      { name: "Python", color: "violet" },
      { name: "TensorFlow", color: "amber" },
      { name: "RabbitMQ", color: "violet" },
    ],
  },
  {
    id: "locationiq",
    company: "LocationIQ / Unwired Labs",
    role: "Full Stack Developer",
    period: "Feb 2020 — Aug 2022",
    bullets: [
      "Optimized geocoding and geolocation APIs serving 1 billion daily requests across 100K+ developers",
      "Built job schedulers processing 10-20M jobs/day and data enrichment pipeline parsing 4.8M records daily against 200M cell towers and 4B WiFi access points",
    ],
    techTags: [
      { name: "PHP", color: "teal" },
      { name: "JavaScript", color: "violet" },
      { name: "Nominatim", color: "teal" },
      { name: "Leaflet", color: "violet" },
    ],
  },
  {
    id: "deloitte",
    company: "Deloitte USI",
    role: "Business Technology Analyst",
    period: "Jul 2019 — Jan 2020",
    bullets: [
      "Built Organization Space Calculator analyzing seat allocation for 10K+ members with 20+ sharing strategies",
      "QA and development on IBM Tririga enterprise workplace management platform with SAP integration",
    ],
    techTags: [
      { name: "IBM Tririga", color: "teal" },
      { name: "SAP", color: "violet" },
    ],
  },
];
