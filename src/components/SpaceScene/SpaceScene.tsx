'use client'

import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import styles from './SpaceScene.module.css'

type Palette = 'cool' | 'mix' | 'accent'

interface LayerConfig {
  count: number
  spread: number
  depth: number
  size: number
  speed: number
  scroll: number
  mouse: number
  palette: Palette
}

const PALETTES: Record<Palette, THREE.Color[]> = {
  cool: [new THREE.Color('#ffffff'), new THREE.Color('#cfe9ff'), new THREE.Color('#9fe9d8')],
  mix: [new THREE.Color('#ffffff'), new THREE.Color('#64ffda'), new THREE.Color('#a78bfa')],
  accent: [new THREE.Color('#64ffda'), new THREE.Color('#7c3aed'), new THREE.Color('#f59e0b')],
}

/** Depth layers, back (slow, faint) to front (fast, bright). */
function getLayers(mobile: boolean): LayerConfig[] {
  const f = mobile ? 0.4 : 1
  return [
    { count: Math.round(1400 * f), spread: 70, depth: 45, size: 0.22, speed: 0.005, scroll: 0.12, mouse: 0.03, palette: 'cool' },
    { count: Math.round(700 * f), spread: 55, depth: 32, size: 0.38, speed: 0.009, scroll: 0.26, mouse: 0.06, palette: 'mix' },
    { count: Math.round(260 * f), spread: 42, depth: 22, size: 0.66, speed: 0.014, scroll: 0.44, mouse: 0.11, palette: 'accent' },
  ]
}

/** Soft round star sprite generated on the client (no external assets). */
function useStarTexture() {
  return useMemo(() => {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.85)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.22)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])
}

function buildLayer(config: LayerConfig) {
  const { count, spread, depth, palette } = config
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const pal = PALETTES[palette]
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread
    positions[i * 3 + 2] = (Math.random() - 0.5) * depth
    const c = pal[Math.floor(Math.random() * pal.length)]
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  return { positions, colors }
}

const StarLayer = forwardRef<THREE.Points, { config: LayerConfig; texture: THREE.Texture }>(
  function StarLayer({ config, texture }, ref) {
    const { positions, colors } = useMemo(() => buildLayer(config), [config])
    return (
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={config.size}
          map={texture}
          vertexColors
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>
    )
  }
)

interface FieldProps {
  layers: LayerConfig[]
  scrollRef: React.MutableRefObject<number>
  pointerRef: React.MutableRefObject<{ x: number; y: number }>
  reduced: boolean
}

function Starfield({ layers, scrollRef, pointerRef, reduced }: FieldProps) {
  const texture = useStarTexture()
  const refs = useRef<(THREE.Points | null)[]>([])
  const { camera } = useThree()
  const timeRef = useRef(0)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const scroll = scrollRef.current
    const px = pointerRef.current.x
    const py = pointerRef.current.y

    if (!reduced) timeRef.current += dt
    const t = timeRef.current

    // Each depth layer responds to scroll + mouse at its own rate — parallax.
    layers.forEach((cfg, i) => {
      const m = refs.current[i]
      if (!m) return
      m.rotation.y = t * cfg.speed + scroll * cfg.scroll + px * cfg.mouse
      m.rotation.x = scroll * cfg.scroll * 0.35 + py * cfg.mouse * 0.6
    })

    if (reduced) return

    // Gentle camera dolly + drift sells the "descent through space" on scroll.
    const targetZ = 7 - scroll * 3
    camera.position.z += (targetZ - camera.position.z) * 0.05
    camera.position.x += (px * 0.5 - camera.position.x) * 0.04
    camera.position.y += (-py * 0.35 - camera.position.y) * 0.04
    camera.lookAt(0, 0, 0)
  })

  return (
    <group>
      {layers.map((cfg, i) => (
        <StarLayer
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          config={cfg}
          texture={texture}
        />
      ))}
    </group>
  )
}

/**
 * Fixed, full-viewport 3D starfield that sits behind the scrolling content.
 * Client-only (guarded by `mounted`) so it never runs during static export.
 */
export default function SpaceScene() {
  const [mounted, setMounted] = useState(false)
  const [mobile, setMobile] = useState(false)
  const reduced = useReducedMotion()
  const scrollRef = useRef(0)
  const pointerRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setMobile(window.innerWidth < 768)
    setMounted(true)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollRef.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0
    }
    const onPointer = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointerRef.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointermove', onPointer, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])

  const layers = useMemo(() => getLayers(mobile), [mobile])

  if (!mounted) return null

  return (
    <div className={styles.canvasWrap} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 70 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#05050f']} />
        <fog attach="fog" args={['#05050f', 14, 46]} />
        <Starfield layers={layers} scrollRef={scrollRef} pointerRef={pointerRef} reduced={reduced} />
      </Canvas>
    </div>
  )
}
