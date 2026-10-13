export type SceneName = 'home' | 'project' | 'journey' | 'about' | 'contact' | 'clay'

export interface Pin { text: string; href?: string; x: number; y: number }

export const PLATES: Record<SceneName, { alt: string; pins?: Pin[]; focus: string }> = {
  home: {
    alt: 'Isometric terrain islands connected by glowing paths, one each for fintech, voice AI, geospatial, hardware and SpaceTech',
    focus: '62% 50%',
    pins: [
      { text: 'Fintech', href: '/journey/', x: 33, y: 17 },
      { text: 'Voice AI', href: '/journey/', x: 60, y: 27 },
      { text: 'SpaceTech', href: '/work/satellite-ml-ops/', x: 88, y: 24 },
      { text: 'Geospatial', href: '/journey/', x: 43, y: 62 },
      { text: 'Hardware', href: '/journey/', x: 76, y: 56 },
    ],
  },
  project: {
    alt: 'A SpaceTech island with a ground station dish and a satellite on a glowing orbit',
    focus: '60% 50%',
    pins: [{ text: 'SpaceTech', x: 60, y: 56 }],
  },
  journey: {
    alt: 'A chain of islands from the CLAY founder island through hardware, geospatial, SpaceTech, voice AI and fintech',
    focus: '55% 55%',
    pins: [
      { text: '2017-2019 CLAY', href: '/journey/clay/', x: 20, y: 66 },
      { text: '2020-2022 LocationIQ', x: 41, y: 48 },
      { text: '2022-2024 Skyserve.ai', href: '/work/satellite-ml-ops/', x: 53, y: 34 },
      { text: '2024-2026 SeekOut', x: 68, y: 22 },
      { text: '2026- Motilal Oswal', x: 88, y: 14 },
    ],
  },
  about: {
    alt: 'Five domain islands linked by bridges: fintech, AI, geospatial, SpaceTech and hardware',
    focus: '65% 50%',
  },
  contact: {
    alt: 'A lighthouse island with a beam of light and connected islands',
    focus: '65% 50%',
  },
  clay: {
    alt: 'An island with a phone showing connected people and location pins, for the CLAY location-based social platform',
    focus: '65% 50%',
  },
}
