/**
 * The five beacons on the landing globe — one per posting.
 *
 * `lat`/`lon` place the beacon on the real Earth. Three of these postings were
 * worked out of Bengaluru; at globe scale one degree is roughly five pixels, so
 * SeekOut and LocationIQ are nudged about a degree either side of the true city
 * or all three would render as a single unreadable dot. Skyserve keeps the
 * exact coordinates. Every label still reads Bengaluru.
 */
export interface Posting {
  /** matches the id in `experience.ts` */
  id: string
  company: string
  role: string
  /** short form for the HUD readout */
  years: string
  place: string
  lat: number
  lon: number
  /** beacon, leader line and legend swatch all take this colour */
  hex: string
  domain: string
  /** one line, for the HUD and the station log */
  line: string
}

export const POSTINGS: Posting[] = [
  {
    id: 'motilaloswal',
    company: 'Motilal Oswal',
    role: 'SVP — Engineering',
    years: '2026 —',
    place: 'Mumbai',
    lat: 19.08,
    lon: 72.88,
    hex: '#FFB454',
    domain: 'FinTech · e-KYC',
    line: 'An e-KYC onboarding platform built in ten weeks — the digital front door bringing millions of retail clients into the firm.',
  },
  {
    id: 'seekout',
    company: 'SeekOut',
    role: 'Sr. Software Engineer',
    years: '2024–26',
    place: 'Bengaluru',
    lat: 13.72,
    lon: 78.62,
    hex: '#A78BFA',
    domain: 'HR Tech · Agentic AI',
    line: 'Agentic recruiting backend for 750+ enterprises, and ~50M developer profiles re-indexed from 45% to 89% match accuracy.',
  },
  {
    id: 'skyserve',
    company: 'Skyserve.ai',
    role: 'Lead / Founding Engineer',
    years: '2022–24',
    place: 'Bengaluru',
    lat: 12.97,
    lon: 77.59,
    hex: '#5EE9D5',
    domain: 'SpaceTech · Edge',
    line: 'ML Ops for satellite edge compute — model onboarding cut from months to days, running on hardware already in orbit.',
  },
  {
    id: 'locationiq',
    company: 'LocationIQ',
    role: 'Full Stack Developer',
    years: '2020–22',
    place: 'Bengaluru',
    lat: 12.16,
    lon: 76.42,
    hex: '#4C8BF5',
    domain: 'Geospatial',
    line: 'Maps and geocoding at a billion requests a day — locating devices with no GPS, from 200M cell towers and 4B WiFi points.',
  },
  {
    id: 'deloitte',
    company: 'Deloitte USI',
    role: 'Business Technology Analyst',
    years: '2019–20',
    place: 'Hyderabad',
    lat: 17.39,
    lon: 78.49,
    hex: '#7BD88F',
    domain: 'Enterprise',
    line: 'Workplace systems for ten thousand people, and a first look at what software has to survive at organisational scale.',
  },
]
