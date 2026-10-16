/**
 * trackId → { stageId → chapter prose }. The single lookup the dynamic
 * routes use; adding a pathway means adding a module here.
 */
import type { ReactNode } from 'react'
import { sections as foundations } from './foundations'
import { sections as distributedSystems } from './distributed-systems'
import { sections as sd1 } from './system-design-1'
import { sections as sd2 } from './system-design-2'
import { sections as sd3 } from './system-design-3'
import { sections as ai1 } from './ai-engineering-1'
import { sections as ai2 } from './ai-engineering-2'

export const SECTIONS: Record<string, Record<string, ReactNode>> = {
  foundations,
  'distributed-systems': distributedSystems,
  'system-design': { ...sd1, ...sd2, ...sd3 },
  'ai-engineering': { ...ai1, ...ai2 },
}
