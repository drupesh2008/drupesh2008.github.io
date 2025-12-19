'use client'

import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/animations/variants'
import styles from './Contact.module.css'

const Contact = () => {
  const interests = [
    {
      icon: '💡',
      title: 'Startup Ideas & Entrepreneurship',
      description: 'Discussing innovative startup ideas and exploring entrepreneurial opportunities'
    },
    {
      icon: '📚',
      title: 'Mentorship & Career Growth',
      description: 'Mentoring junior developers and helping with career guidance'
    },
    {
      icon: '🏗️',
      title: 'Technical Consulting',
      description: 'Consulting on technical architecture, system design, and engineering challenges'
    },
    {
      icon: '☕',
      title: 'Tech Discussions & Learning',
      description: 'Chatting about technology, sharing experiences, or discussing my journey'
    }
  ]

  return (
    <section className={styles.contact} id="contact">
      <motion.div 
        className={styles.container}
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.3 }}
      >
        {/* Header */}
        <motion.div className={styles.header} variants={fadeInUp}>
          <h2 className={styles.title}>Let&apos;s Connect</h2>
          <p className={styles.subtitle}>
            Open to startup discussions, mentoring, consulting, or tech conversations.
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div className={styles.contactCard} variants={fadeInUp}>
          {/* Interest Areas Grid */}
          <div className={styles.interestsGrid}>
            {interests.map((interest, index) => (
              <motion.div
                key={index}
                className={styles.interestCard}
                variants={fadeInUp}
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
              >
                <span className={styles.icon}>{interest.icon}</span>
                <h3 className={styles.interestTitle}>{interest.title}</h3>
                <p className={styles.interestDescription}>{interest.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Contact Buttons */}
          <div className={styles.contactButtons}>
            <h3 className={styles.contactTitle}>Get In Touch</h3>
            <div className={styles.buttonGroup}>
              <motion.a
                href="https://www.linkedin.com/in/drupesh2008"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.linkedInButton}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg 
                  className={styles.buttonIcon} 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .771 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .771 23.2 0 22.222 0h.003z"/>
                </svg>
                Connect on LinkedIn
              </motion.a>
              
              <motion.a
                href="mailto:drupesh2008@gmail.com"
                className={styles.emailButton}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg 
                  className={styles.buttonIcon} 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Send Email
              </motion.a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Contact

