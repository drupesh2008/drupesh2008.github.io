'use client'

import { motion } from 'framer-motion'
import { experiences } from '@/data/experience'
import { cardStaggerIn, cardReveal } from '@/animations/variants'
import styles from './WorkExperience.module.css'

const TAG_COLORS = {
  teal: { bg: 'var(--tag-teal-bg)', border: 'var(--tag-teal-border)', text: 'var(--accent-primary)' },
  violet: { bg: 'var(--tag-violet-bg)', border: 'var(--tag-violet-border)', text: '#a78bfa' },
  amber: { bg: 'var(--tag-amber-bg)', border: 'var(--tag-amber-border)', text: 'var(--accent-tertiary)' },
}

export default function WorkExperience() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>Experience</h2>
        <div className={styles.underline} />
      </div>

      <motion.div
        className={styles.cards}
        variants={cardStaggerIn}
        initial="initial"
        animate="animate"
      >
        {experiences.map((company) => (
          <motion.div
            key={company.id}
            className={styles.card}
            variants={cardReveal}
            whileHover={{ y: -4, boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardHeaderLeft}>
                <h3 className={styles.companyName}>{company.company}</h3>
                <span className={styles.role}>{company.role}</span>
              </div>
              <span className={styles.period}>{company.period}</span>
            </div>

            <div className={styles.bullets}>
              {company.bullets.map((bullet, i) => (
                <p key={i} className={styles.bullet}>• {bullet}</p>
              ))}
            </div>

            <div className={styles.tags}>
              {company.techTags.map((tag) => {
                const colors = TAG_COLORS[tag.color]
                return (
                  <span
                    key={tag.name}
                    className={styles.tag}
                    style={{
                      background: colors.bg,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  >
                    {tag.name}
                  </span>
                )
              })}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
