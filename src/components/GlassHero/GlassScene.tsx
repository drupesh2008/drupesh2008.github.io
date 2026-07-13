'use client'

import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { MeshTransmissionMaterial, Environment, Lightformer, Float } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import styles from './GlassScene.module.css'

interface CrystalProps {
  scrollRef: MutableRefObject<number>
  pointerRef: MutableRefObject<{ x: number; y: number }>
  reduced: boolean
}

function Crystal({ scrollRef, pointerRef, reduced }: CrystalProps) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    const m = ref.current
    if (!m) return
    const dt = Math.min(delta, 0.05)
    const scroll = scrollRef.current
    const px = pointerRef.current.x
    const py = pointerRef.current.y

    if (!reduced) {
      m.rotation.y += dt * 0.25
      m.rotation.z += dt * 0.06
    }
    // Cursor tilt + a quarter-turn across the hero scroll.
    const targetX = py * 0.4 + scroll * Math.PI
    m.rotation.x += (targetX - m.rotation.x) * 0.05
    // Grow slightly and drift toward the cursor.
    const targetScale = 1 + scroll * 0.35
    m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, targetScale, 0.05))
    m.position.x += (2 + px * 0.35 - m.position.x) * 0.04
    m.position.y += (0.8 - py * 0.3 - m.position.y) * 0.04
  })

  return (
    <Float speed={reduced ? 0 : 1.2} rotationIntensity={0.4} floatIntensity={0.7}>
      <mesh ref={ref} position={[2, 0.8, 0]}>
        <icosahedronGeometry args={[1, 0]} />
        <MeshTransmissionMaterial
          samples={6}
          resolution={512}
          transmission={1}
          thickness={1.3}
          roughness={0.06}
          ior={1.5}
          chromaticAberration={0.5}
          anisotropy={0.2}
          distortion={0.3}
          distortionScale={0.4}
          temporalDistortion={0.1}
          flatShading
          color="#ffffff"
          background={new THREE.Color('#f4f1ea')}
        />
      </mesh>
    </Float>
  )
}

/**
 * Liquid-glass hero centerpiece: a refractive faceted crystal lit by a
 * procedural studio environment. Client-only, sits behind the hero content.
 */
export default function GlassScene() {
  const [mounted, setMounted] = useState(false)
  const reduced = useReducedMotion()
  const scrollRef = useRef(0)
  const pointerRef = useRef({ x: 0, y: 0 })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const onScroll = () => {
      scrollRef.current = Math.min(1, Math.max(0, window.scrollY / window.innerHeight))
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

  if (!mounted) return null

  return (
    <div className={styles.wrap} aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 5], fov: 35 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.7} />
        <Crystal scrollRef={scrollRef} pointerRef={pointerRef} reduced={reduced} />
        <Environment resolution={256}>
          <Lightformer intensity={2.4} position={[6, 6, 6]} scale={[10, 10, 1]} color="#ffffff" />
          <Lightformer intensity={2.2} position={[-6, 3, 4]} scale={[8, 8, 1]} color="#2c4bff" />
          <Lightformer intensity={1.5} position={[0, -6, -4]} scale={[10, 10, 1]} color="#ffcf8f" />
        </Environment>
        {!reduced && (
          <EffectComposer>
            <Bloom mipmapBlur intensity={0.45} luminanceThreshold={0.9} radius={0.7} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  )
}
