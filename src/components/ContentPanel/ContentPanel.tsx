'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { panelSlideIn, contentCrossfade } from '@/animations/variants'
import type { ActiveSection } from '@/hooks/useActiveSection'
import WorkExperience from '@/components/WorkExperience/WorkExperience'
import Journey from '@/components/Journey/Journey'
import Projects from '@/components/Projects/Projects'
import Skills from '@/components/Skills/Skills'
import Contact from '@/components/Contact/Contact'
import styles from './ContentPanel.module.css'

interface Props {
  section: ActiveSection & string
  isMobile?: boolean
}

const SECTIONS: Record<string, React.ComponentType> = {
  experience: WorkExperience,
  journey: Journey,
  projects: Projects,
  skills: Skills,
  contact: Contact,
}

export default function ContentPanel({ section, isMobile }: Props) {
  const SectionComponent = SECTIONS[section]

  return (
    <motion.div
      className={`${styles.panel} ${isMobile ? styles.panelMobile : ''}`}
      variants={panelSlideIn}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          className={styles.content}
          variants={contentCrossfade}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {SectionComponent && <SectionComponent />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
