'use client'
import { useState } from 'react'
import styles from '@/components/Atlas/Atlas.module.css'

export default function ContactForm() {
  const [done, setDone] = useState(false)
  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        const subject = encodeURIComponent(`Hello from ${f.get('name')}`)
        const body = encodeURIComponent(`${f.get('message')}\n\n${f.get('name')} (${f.get('email')})`)
        window.location.href = `mailto:drupesh2008@gmail.com?subject=${subject}&body=${body}`
        setDone(true)
      }}
    >
      <label>Name<input name="name" required autoComplete="name" /></label>
      <label>Email<input name="email" type="email" required autoComplete="email" /></label>
      <label>Message<textarea name="message" required /></label>
      <button type="submit" className={`${styles.btn} ${styles.btnDark}`} style={{ width: 'fit-content' }}>Send message →</button>
      <p className={styles.hint} role="status">{done ? 'Your email app should open with the message ready to send.' : 'This opens your email app with the message ready to send.'}</p>
    </form>
  )
}
