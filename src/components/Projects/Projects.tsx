'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Lock, ArrowUpRight } from 'lucide-react'
import { projects } from '@/data/projects'
import { cardStaggerIn, cardReveal } from '@/animations/variants'
import styles from './Projects.module.css'

const ACCENT_MAP = {
  teal: {
    tagBg: 'var(--tag-teal-bg)',
    tagBorder: 'var(--tag-teal-border)',
    tagColor: 'var(--c-teal)',
  },
  violet: {
    tagBg: 'var(--tag-violet-bg)',
    tagBorder: 'var(--tag-violet-border)',
    tagColor: 'var(--c-violet)',
  },
  amber: {
    tagBg: 'var(--tag-amber-bg)',
    tagBorder: 'var(--tag-amber-border)',
    tagColor: 'var(--c-amber)',
  },
}

// so the live cards can be links and still take the reveal variants
const MotionLink = motion.create(Link)

export default function Projects() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>Projects</h2>
        <div className={styles.underline} />
        <p className={styles.subtitle}>Built in public — two live, more brewing.</p>
      </div>

      <motion.div
        className={styles.grid}
        variants={cardStaggerIn}
        initial="initial"
        animate="animate"
      >
        {projects.map((project) => {
          const accent = ACCENT_MAP[project.accentColor]
          const tag = (
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
          )

          if (project.href) {
            return (
              <MotionLink
                key={project.id}
                href={project.href}
                className={`${styles.card} ${styles.cardLive}`}
                variants={cardReveal}
                whileHover={{ y: -4 }}
              >
                <div className={styles.liveTop}>
                  {tag}
                  <ArrowUpRight size={18} className={styles.goArrow} aria-hidden="true" />
                </div>
                <h3 className={styles.liveName}>{project.name}</h3>
                <p className={styles.liveTeaser}>{project.teaser}</p>
                {project.stats && <span className={styles.liveStats}>{project.stats}</span>}
              </MotionLink>
            )
          }

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
              {tag}
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
