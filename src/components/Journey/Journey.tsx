'use client'

import { motion } from 'framer-motion'
import { journeyEntries } from '@/data/journey'
import { cardStaggerIn, timelineEntry } from '@/animations/variants'
import styles from './Journey.module.css'

const DOT_COLORS = {
  teal: 'var(--accent-primary)',
  violet: 'var(--accent-secondary)',
  amber: 'var(--accent-tertiary)',
  outline: 'transparent',
}

const PERIOD_COLORS = {
  teal: 'var(--accent-primary)',
  violet: 'var(--accent-secondary)',
  amber: 'var(--accent-tertiary)',
  outline: 'var(--accent-primary)',
}

export default function Journey() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>Journey</h2>
        <div className={styles.underline} />
      </div>

      <motion.div
        className={styles.timeline}
        variants={cardStaggerIn}
        initial="initial"
        animate="animate"
      >
        {journeyEntries.map((entry, index) => (
          <motion.div
            key={entry.id}
            className={styles.entry}
            variants={timelineEntry}
          >
            <div className={styles.dotColumn}>
              <div
                className={`${styles.dot} ${entry.dotGlow ? styles.dotGlow : ''}`}
                style={{
                  backgroundColor: DOT_COLORS[entry.dotColor],
                  border: entry.dotColor === 'outline' ? '2px solid var(--accent-primary)' : 'none',
                  width: entry.dotGlow ? 12 : 10,
                  height: entry.dotGlow ? 12 : 10,
                }}
              />
              {index < journeyEntries.length - 1 && (
                <div className={styles.connector} />
              )}
            </div>

            <div className={styles.content}>
              <span
                className={styles.period}
                style={{ color: PERIOD_COLORS[entry.dotColor] }}
              >
                {entry.period}
              </span>
              <div className={styles.titleRow}>
                <h3 className={styles.entryTitle}>{entry.title}</h3>
                {entry.badge && (
                  <span
                    className={styles.badge}
                    style={{
                      color: entry.badge.color === 'amber' ? 'var(--accent-tertiary)' : 'var(--accent-primary)',
                      backgroundColor: entry.badge.color === 'amber'
                        ? 'rgba(245, 158, 11, 0.1)'
                        : 'rgba(100, 255, 218, 0.1)',
                    }}
                  >
                    {entry.badge.text}
                  </span>
                )}
              </div>
              <p className={styles.description}>{entry.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
