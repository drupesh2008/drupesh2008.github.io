'use client'

import { motion } from 'framer-motion'
import { fadeInUp, slideInLeft, slideInRight, staggerContainer } from '@/animations/variants'
import styles from './About.module.css'
import Skills from '@/components/Skills'

const About = () => {
  const timelineVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94] as const
      }
    })
  }

  return (
    <section className={styles.about} id="about">
      <motion.div 
        className={styles.container}
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.div className={styles.header} variants={fadeInUp}>
          <h2 className={styles.title}>About Me</h2>
          <p className={styles.subtitle}>
            Developer with 6+ years of professional experience and a passion for solving real-world problems
          </p>
        </motion.div>

        <div className={styles.content}>
          {/* Journey Section */}
          <motion.div className={styles.journey} id="experience" variants={slideInLeft}>
            <h3 className={styles.sectionTitle}>My Journey</h3>
            <div className={styles.timeline}>
              <motion.div 
                className={styles.timelineItem}
                custom={0}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={timelineVariants}
              >
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <h4><strong>CLAY</strong> - Started own venture</h4>
                    <span className={styles.timelineDate}>Jan 2017 - Aug 2019</span>
                  </div>
                  <p>CLAY was a location-based social networking platform, allowing people at the same location to connect without numbers or social profiles exchange for quick conversations - be it asking for help or exchanging info at places like &quot;Which food is best here at a given Brewery&quot;.</p>
                </div>
              </motion.div>
              
              <motion.div 
                className={styles.timelineItem}
                custom={1}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={timelineVariants}
              >
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <h4><strong>IoT</strong> - Women Safety App</h4>
                    <span className={styles.timelineDate}>Aug 2018 - Jan 2019</span>
                  </div>
                  <p>Developed an IoT-enabled Women Safety App with patent, showcasing my passion for impactful technology.</p>
                </div>
              </motion.div>
              
              <motion.div 
                className={styles.timelineItem}
                custom={2}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={timelineVariants}
              >
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <h4><strong>Digital Hearing</strong> - Healthcare Innovation</h4>
                    <span className={styles.timelineDate}>Jan 2019 - July 2019</span>
                  </div>
                  <p>Collaborated with AIIMS Raipur to create an affordable version of Digital Hearing Aid, demonstrating healthcare innovation.</p>
                </div>
              </motion.div>
              
              <motion.div 
                className={styles.timelineItem}
                custom={3}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={timelineVariants}
              >
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <h4><strong>Deloitte</strong></h4>
                    <span className={styles.timelineDate}>Aug 2019 - Jan 2020</span>
                  </div>
                  <p>Gained valuable experience at Deloitte, working in a collaborative environment with exceptional culture and learning from industry-leading practices.</p>
                </div>
              </motion.div>
              
              <motion.div 
                className={styles.timelineItem}
                custom={4}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={timelineVariants}
              >
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <h4><strong>LocationIQ</strong> - Geospatial Innovation</h4>
                    <span className={styles.timelineDate}>Jan 2020 - Aug 2022</span>
                  </div>
                  <p>Worked on Maps, Geocoders, Routing, and developed algorithms for back-tracing cell/wifi tower locations using IoT logs.</p>
                </div>
              </motion.div>
              
              <motion.div 
                className={styles.timelineItem}
                custom={5}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={timelineVariants}
              >
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <h4><strong>SkyServe</strong> - SpaceTech - Edge Computing</h4>
                    <span className={styles.timelineDate}>Sept 2022 - Sept 2024</span>
                  </div>
                  <p>Went beyond Earth to solve problems in SpaceTech, working on Edge computing in Satellites, Earth Observation, and Remote Sensing.</p>
                </div>
              </motion.div>
              
              <motion.div 
                className={styles.timelineItem}
                custom={6}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={timelineVariants}
              >
                <div className={styles.timelineDot}></div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineHeader}>
                    <h4><strong>SeekOut</strong> - Hiring Solutions</h4>
                    <span className={styles.timelineDate}>Nov 2024 - Current</span>
                  </div>
                  <p>Working as Senior Software Developer in hiring space, building efficient tools to hire the right talent for organizations.</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Column - Current Work + Skills */}
          <div className={styles.rightColumn}>
            {/* Current Work Section */}
            <motion.div className={styles.currentWork} variants={slideInRight}>
              <h3 className={styles.sectionTitle}>What I&apos;m Working On</h3>
              <div className={styles.workGrid}>
                <div className={styles.workCard}>
                  <h4><span className={styles.workIcon}>🎯</span> SeekOut SPOT</h4>
                  <p>Building the backend infrastructure for SeekOut Spot, an agentic AI recruiting service that delivers qualified candidates in 2 weeks. Integrating semantic AI matching, multi-step outreach campaigns, and screening workflows to process thousands of profiles and reduce time-to-hire by over 50%.</p>
                </div>
                
                <div className={styles.workCard}>
                  <h4><span className={styles.workIcon}>🤖</span> PitchBot - Voice Agent Platform</h4>
                  <p>Built PitchBot, an AI-driven platform that transforms static content into dynamic, interactive voice agents. Architected a real-time voice pipeline using Deepgram for low-latency speech-to-text transcription, Cartesia&apos;s Sonic TTS for ultra-realistic text-to-speech generation, and Pipecat for orchestrating the entire voice agent workflow. The system handles live user interactions with minimal latency, demonstrating expertise in integrating advanced voice technologies, API authentication, and real-time processing pipelines for scalable conversational AI systems.</p>
                </div>
                
                <div className={styles.workCard}>
                  <h4><span className={styles.workIcon}>⚡</span> Data Engineering</h4>
                  <p>Building large-scale ETL pipelines to ingest data from different ATS/LMS sources. Also building ETL pipelines to ingest GitHub data actively for close to 50M users on a periodic basis.</p>
                </div>
                
                <div className={styles.workCard}>
                  <h4><span className={styles.workIcon}>🔍</span> Indexes & Search</h4>
                  <p>Working on large-scale indexes with Azure SearchAI to scan through millions of documents.</p>
                </div>
              </div>
            </motion.div>

            {/* Skills Section */}
            <Skills />
          </div>
        </div>
      </motion.div>
    </section>
  )
}

export default About 