'use client'

import { motion } from 'framer-motion'
import { Lightbulb, GraduationCap, Wrench, Coffee, Linkedin, Mail, Github } from 'lucide-react'
import { cardStaggerIn, cardReveal } from '@/animations/variants'
import { event as gaEvent } from '@/lib/gtag'
import styles from './Contact.module.css'

const interests = [
  {
    title: 'Startup Ideas & Entrepreneurship',
    description: 'Discussing innovative startup ideas and exploring entrepreneurial opportunities',
    icon: Lightbulb,
    color: 'var(--accent-primary)',
  },
  {
    title: 'Mentorship & Career Growth',
    description: 'Mentoring junior developers and helping with career guidance',
    icon: GraduationCap,
    color: 'var(--accent-secondary)',
  },
  {
    title: 'Technical Consulting',
    description: 'Consulting on technical architecture, system design, and engineering challenges',
    icon: Wrench,
    color: 'var(--accent-tertiary)',
  },
  {
    title: 'Tech Discussions & Learning',
    description: 'Chatting about technology, sharing experiences, or discussing my journey',
    icon: Coffee,
    color: 'var(--accent-primary)',
  },
]

export default function Contact() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <h2 className={styles.title}>Contact</h2>
        <div className={styles.underline} />
        <p className={styles.subtitle}>Interested in working together? Let&apos;s connect.</p>
      </div>

      {/* Interest cards */}
      <div className={styles.interestsSection}>
        <span className={styles.sectionLabel}>WHAT I&apos;M OPEN TO</span>
        <motion.div
          className={styles.interestsGrid}
          variants={cardStaggerIn}
          initial="initial"
          animate="animate"
        >
          {interests.map((interest) => {
            const Icon = interest.icon
            return (
              <motion.div
                key={interest.title}
                className={styles.interestCard}
                variants={cardReveal}
                whileHover={{ y: -4 }}
              >
                <Icon size={20} style={{ color: interest.color }} />
                <h3 className={styles.interestTitle}>{interest.title}</h3>
                <p className={styles.interestDescription}>{interest.description}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Social buttons */}
      <div className={styles.socialSection}>
        <span className={styles.sectionLabelViolet}>REACH OUT</span>
        <div className={styles.socialButtons}>
          <motion.a
            href="https://in.linkedin.com/in/d-rupesh-kumar"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkedinBtn}
            onClick={() => gaEvent({ action: 'click', category: 'contact', label: 'linkedin' })}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <Linkedin size={16} />
            LinkedIn
          </motion.a>

          <motion.a
            href="mailto:drupesh2008@gmail.com"
            className={styles.emailBtn}
            onClick={() => gaEvent({ action: 'click', category: 'contact', label: 'email' })}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <Mail size={16} />
            Email
          </motion.a>

          <motion.a
            href="https://github.com/drupesh2008"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.githubBtn}
            onClick={() => gaEvent({ action: 'click', category: 'contact', label: 'github' })}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <Github size={16} />
            GitHub
          </motion.a>
        </div>
      </div>
    </div>
  )
}
