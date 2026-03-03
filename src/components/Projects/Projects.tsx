'use client'

import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import { projects } from '@/data/projects'
import { cardStaggerIn, cardReveal } from '@/animations/variants'
import styles from './Projects.module.css'

const ACCENT_MAP = {
  teal: {
    tagBg: 'var(--tag-teal-bg)',
    tagBorder: 'var(--tag-teal-border)',
    tagColor: 'var(--accent-primary)',
  },
  violet: {
    tagBg: 'var(--tag-violet-bg)',
    tagBorder: 'var(--tag-violet-border)',
    tagColor: '#a78bfa',
  },
  amber: {
    tagBg: 'var(--tag-amber-bg)',
    tagBorder: 'var(--tag-amber-border)',
    tagColor: 'var(--accent-tertiary)',
  },
}

export default function Projects() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>Projects</h2>
        <div className={styles.underline} />
        <p className={styles.subtitle}>Building in public. More coming soon.</p>
      </div>

      <motion.div
        className={styles.grid}
        variants={cardStaggerIn}
        initial="initial"
        animate="animate"
      >
        {projects.map((project) => {
          const accent = ACCENT_MAP[project.accentColor]
          return (
            <motion.div
              key={project.id}
              className={styles.card}
              variants={cardReveal}
              whileHover={{ y: -4 }}
            >
              <Lock size={32} className={styles.lockIcon} />
              <h3 className={styles.projectName}>{project.name}</h3>
              <p className={styles.teaser}>{project.teaser}</p>
              <span
                className={styles.statusTag}
                style={{
                  backgroundColor: accent.tagBg,
                  borderColor: accent.tagBorder,
                  color: accent.tagColor,
                }}
              >
                {project.status}
              </span>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
