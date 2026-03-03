'use client'

import { motion } from 'framer-motion'
import { skillCategories } from '@/data/skills'
import { cardStaggerIn, pillCascade } from '@/animations/variants'
import styles from './Skills.module.css'

const LABEL_COLORS = {
  teal: 'var(--accent-primary)',
  violet: 'var(--accent-secondary)',
  amber: 'var(--accent-tertiary)',
}

export default function Skills() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>Skills</h2>
        <div className={styles.underline} />
      </div>

      <motion.div
        className={styles.categories}
        variants={cardStaggerIn}
        initial="initial"
        animate="animate"
      >
        {skillCategories.map((category) => (
          <motion.div
            key={category.name}
            className={styles.category}
            variants={pillCascade}
          >
            <span
              className={styles.categoryLabel}
              style={{ color: LABEL_COLORS[category.color] }}
            >
              {category.name}
            </span>
            <div className={styles.pills}>
              {category.skills.map((skill) => (
                <span key={skill} className={styles.pill}>{skill}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
