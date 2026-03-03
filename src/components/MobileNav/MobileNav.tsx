'use client'

import { motion } from 'framer-motion'
import { Compass, Briefcase, Layers, Code, Mail, Home } from 'lucide-react'
import type { ActiveSection } from '@/hooks/useActiveSection'
import styles from './MobileNav.module.css'

const TABS: { section: ActiveSection & string; icon: React.ElementType; label: string }[] = [
  { section: 'journey', icon: Compass, label: 'Journey' },
  { section: 'experience', icon: Briefcase, label: 'Exp' },
  { section: 'skills', icon: Code, label: 'Skills' },
  { section: 'projects', icon: Layers, label: 'Projects' },
  { section: 'contact', icon: Mail, label: 'Contact' },
]

interface Props {
  active: ActiveSection
  onSelect: (section: ActiveSection) => void
  onHome: () => void
}

export default function MobileNav({ active, onSelect, onHome }: Props) {
  return (
    <nav className={styles.nav} aria-label="Section navigation">
      <motion.button
        className={styles.homeTab}
        onClick={onHome}
        whileTap={{ scale: 0.9 }}
        aria-label="Return to home"
      >
        <Home size={18} />
      </motion.button>
      {TABS.map(({ section, icon: Icon, label }) => {
        const isActive = active === section
        return (
          <motion.button
            key={section}
            className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
            onClick={() => onSelect(section)}
            whileTap={{ scale: 0.9 }}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={20} />
            <span className={styles.tabLabel}>{label}</span>
          </motion.button>
        )
      })}
    </nav>
  )
}
