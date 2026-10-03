/**
 * Every paper's explainer, keyed by paper id. A paper listed in
 * src/data/papers.ts without an entry here fails the static build — no
 * placeholder pages ship.
 */
import type { ReactNode } from 'react'
import { sections as distributed } from './distributed-systems'
import { sections as databases } from './databases'
import { sections as cloud } from './cloud'
import { sections as ai } from './ai'

export const SECTIONS: Record<string, ReactNode> = { ...distributed, ...databases, ...cloud, ...ai }
