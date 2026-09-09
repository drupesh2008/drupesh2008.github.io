/**
 * trackId → { stageId → chapter prose }. The single lookup the dynamic
 * routes use; adding a pathway means adding a module here.
 */
import type { ReactNode } from 'react'
import { sections as foundations } from './foundations'
import { sections as distributedSystems } from './distributed-systems'
import { sections as systemDesign } from './system-design'
import { sections as aiEngineering } from './ai-engineering'

export const SECTIONS: Record<string, Record<string, ReactNode>> = {
  foundations,
  'distributed-systems': distributedSystems,
  'system-design': systemDesign,
  'ai-engineering': aiEngineering,
}
