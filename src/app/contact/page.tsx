import type { Metadata } from 'next'
import AtlasShell from '@/components/Atlas/AtlasShell'
import Hero from '@/components/Atlas/Hero'
import styles from '@/components/Atlas/Atlas.module.css'
import ContactForm from './ContactForm'

export const metadata: Metadata = {
  title: 'Contact — D Rupesh Kumar',
  description: 'Interested in working together? Start a conversation.',
}

export default function Contact() {
  return (
    <AtlasShell active="contact">
      <Hero
        scene="contact"
        eyebrow="Contact"
        title={<>Let’s connect.</>}
        lede={<>Interested in working together?<br />Start a conversation.</>}
        tag={<>Different places.<br />Brighter ideas.</>}
      />
      <section className={styles.strip}>
        <div className={styles.sec}>
          <h2>Send a message</h2>
          <ContactForm />
          <div className={styles.links}>
            <a href="https://github.com/drupesh2008">GitHub</a>
            <a href="https://in.linkedin.com/in/d-rupesh-kumar">LinkedIn</a>
            <a href="mailto:drupesh2008@gmail.com">Email</a>
          </div>
        </div>
      </section>
    </AtlasShell>
  )
}
