'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Compass, Briefcase, Layers, Code, Mail } from 'lucide-react'
import { orbitalFloat, orbitalNodeIn } from '@/animations/variants'
import type { ActiveSection } from '@/hooks/useActiveSection'
import styles from './OrbitalRing.module.css'

const ICONS: Record<string, React.ElementType> = {
  journey: Compass,
  experience: Briefcase,
  projects: Layers,
  skills: Code,
  contact: Mail,
}

const LABELS: Record<string, string> = {
  journey: 'Journey',
  experience: 'Experience',
  projects: 'Projects',
  skills: 'Skills',
  contact: 'Contact',
}

const MOBILE_LABELS: Record<string, string> = {
  journey: 'Journey',
  experience: 'Exp',
  projects: 'Projects',
  skills: 'Skills',
  contact: 'Contact',
}

// Node positions on 400px ring (angles: 270°, 342°, 54°, 126°, 198°)
const HERO_POSITIONS: Record<string, { x: number; y: number }> = {
  journey:    { x: 200, y: 0 },     // top (270°)
  experience: { x: 380, y: 145 },   // right (342°)
  projects:   { x: 325, y: 370 },   // bottom-right (54°)
  contact:    { x: 75, y: 370 },    // bottom-left (126°)
  skills:     { x: 20, y: 145 },    // left (198°)
}

// Node positions on 220x220 compressed ring (matches design frame, ring center 110,110)
const COMPRESSED_POSITIONS: Record<string, { x: number; y: number }> = {
  journey:    { x: 110, y: 10 },     // top
  experience: { x: 200, y: 93 },     // upper-right
  projects:   { x: 180, y: 183 },    // lower-right
  contact:    { x: 40, y: 183 },     // lower-left
  skills:     { x: 20, y: 93 },      // upper-left
}

// Mobile hero node positions on 230px ring
const MOBILE_POSITIONS: Record<string, { x: number; y: number }> = {
  journey:    { x: 115, y: -5 },
  experience: { x: 215, y: 85 },
  projects:   { x: 185, y: 200 },
  contact:    { x: 25, y: 200 },
  skills:     { x: -5, y: 85 },
}

interface Props {
  section: ActiveSection & string
  mode: 'hero' | 'compressed' | 'hero-mobile'
  isActive?: boolean
  onSelect: (section: ActiveSection) => void
  delay?: number
}

export default function OrbitalNode({ section, mode, isActive, onSelect, delay = 0 }: Props) {
  const Icon = ICONS[section]
  const isMobile = mode === 'hero-mobile'
  const label = isMobile ? MOBILE_LABELS[section] : LABELS[section]
  const positions = mode === 'compressed' ? COMPRESSED_POSITIONS : isMobile ? MOBILE_POSITIONS : HERO_POSITIONS
  const pos = positions[section]
  const isCompressed = mode === 'compressed'
  const iconSize = isCompressed ? 16 : isMobile ? 14 : 18
  const [hovered, setHovered] = useState(false)

  return (
    <motion.button
      className={`${styles.node} ${isCompressed ? styles.nodeCompressed : ''} ${isMobile ? styles.nodeMobile : ''} ${isActive ? styles.nodeActive : ''} ${hovered && !isCompressed ? styles.nodeHovered : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
      }}
      variants={orbitalNodeIn}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={isCompressed ? { scale: 1.2 } : undefined}
      whileTap={{ scale: 0.95 }}
      onClick={() => onSelect(section)}
      aria-label={`Navigate to ${label}`}
    >
      <motion.div
        className={styles.nodeInner}
        variants={orbitalFloat}
        animate="animate"
        style={{ animationDelay: `${delay * 0.5}s` }}
      >
        <Icon size={iconSize} />
        {!isCompressed && (
          <span className={isMobile ? styles.nodeLabelMobile : styles.nodeLabel}>{label}</span>
        )}
      </motion.div>
      {/* Tooltip for compressed mode */}
      {isCompressed && hovered && (
        <span className={styles.tooltip}>{LABELS[section]}</span>
      )}
    </motion.button>
  )
}
