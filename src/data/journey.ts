export interface JourneyEntry {
  id: string;
  title: string;
  period: string;
  description: string;
  badge?: { text: string; color: 'teal' | 'amber' };
  dotColor: 'teal' | 'violet' | 'amber' | 'outline';
  dotGlow?: boolean;
}

export const journeyEntries: JourneyEntry[] = [
  {
    id: "clay",
    title: "CLAY - Entrepreneurship",
    period: "2017 — 2019",
    description:
      "Founded a location-based social networking platform. Built the full stack — backend APIs, Android app, real-time location services, and user matching system.",
    dotColor: "teal",
  },
  {
    id: "iot-safety",
    title: "IoT Women Safety Device",
    period: "2018 — 2019",
    description:
      "Patented a wearable IoT device using crowd-sourced proximity alerts. Built a real-time search system achieving sub-500ms lookups across 1 million user records.",
    badge: { text: "PATENTED", color: "amber" },
    dotColor: "amber",
  },
  {
    id: "hearing-aid",
    title: "Digital Hearing Aid — AIIMS",
    period: "2019",
    description:
      "Built an affordable digital hearing aid using STM microcontroller boards, in collaboration with AIIMS Raipur doctors. Achieved 60% noise reduction through custom DSP algorithms.",
    dotColor: "violet",
  },
  {
    id: "deloitte",
    title: "Deloitte USI",
    period: "2019 — 2020",
    description:
      "Built an Organization Space Calculator analyzing seat allocation for up to 10K employees with 20+ sharing strategies.",
    dotColor: "outline",
  },
  {
    id: "locationiq",
    title: "LocationIQ / Unwired Labs",
    period: "2020 — 2022",
    description:
      "Optimized geocoding and geolocation APIs serving 1 billion daily requests. Built schedulers processing 10-20M daily jobs and enrichment pipelines parsing 4.8 million records daily against a database of 200M cell towers and 4B WiFi access points.",
    dotColor: "teal",
  },
  {
    id: "skyserve",
    title: "Skyserve.ai — Founding Engineer",
    period: "2022 — 2024",
    description:
      "Founding engineer. Built an ML Ops platform for satellite edge computing, reduced model onboarding from months to 2-3 days. Developed synthetic image generator (250+ frames), data rendering system (700+ datasets), and led 4 product launches.",
    dotColor: "teal",
  },
  {
    id: "seekout",
    title: "SeekOut — Senior SWE",
    period: "2024 — 2026",
    description:
      "Architected agentic AI for hiring at scale. Built PitchBot voice pipeline (Deepgram/Cartesia/Pipecat), re-engineered GitHub indexing for ~50M profiles, and improved profile matching accuracy from 45% to 89%.",
    dotColor: "teal",
  },
  {
    id: "motilaloswal",
    title: "Motilal Oswal — SVP, Engineering",
    period: "2026 — Present",
    description:
      "Built the e-KYC platform onboarding millions of retail customers, lead agentic AI across teams, and re-architected legacy platforms into a modern, cloud-native stack at one of India's largest financial services firms — improving system performance by up to 80%.",
    badge: { text: "CURRENT", color: "teal" },
    dotColor: "teal",
    dotGlow: true,
  },
];
