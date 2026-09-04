'use client'

/**
 * GROUND STATION — the landing.
 *
 * Two surfaces share one fixed camera:
 *   <canvas globe>   WebGL — the Earth, its atmosphere, the starfield
 *   <canvas overlay> 2D    — beacons, satellites, uplinks, the leader line
 *
 * The camera never moves. The world turns, and each posting's beacon opens an
 * uplink as it comes around, with a HUD readout pinned beside it. While hunting
 * the next beacon the station slews faster, then settles — so it never jumps
 * and never sits idle.
 *
 * All of the per-frame work is imperative and lives inside the effect; React
 * only renders the skeleton, so there is no re-render churn at 60fps.
 */

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { LAND } from '@/data/land'
import { POSTINGS } from '@/data/postings'
import { inkOf, accVars } from '@/data/accents'
import ThemeToggle from '@/components/ThemeToggle'
import styles from './GroundStation.module.css'

const CAM_D = 3.2
const TILT = 0.36

/* how long each stage of a link lasts, in seconds */
const T_OPEN = 0.85
const T_HOLD = 4.6
const T_CLOSE = 0.55
/* the first link waits this long, so it lands ~2s after load */
const FIRST_DELAY = 1.15

const VERT = `attribute vec2 position; void main(){ gl_Position=vec4(position,0.0,1.0); }`

const FRAG = `
precision highp float;
uniform float u_time; uniform vec2 u_resolution;
uniform float u_spin; uniform float u_focal; uniform vec2 u_center;
uniform float u_dark;
uniform sampler2D u_land; uniform sampler2D u_lights;

const float CAM_D = ${CAM_D};
const float TILT  = ${TILT};

float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
mat3 rotYm(float a){ float c=cos(a),s=sin(a); return mat3(c,0.0,-s, 0.0,1.0,0.0, s,0.0,c); }
mat3 rotXm(float a){ float c=cos(a),s=sin(a); return mat3(1.0,0.0,0.0, 0.0,c,s, 0.0,-s,c); }

void main(){
  vec2 uv  = (gl_FragCoord.xy - 0.5*u_resolution)/u_resolution.y;
  vec2 guv = uv - u_center;
  vec3 ro  = vec3(0.0,0.0,CAM_D);
  vec3 rd  = normalize(vec3(guv, -u_focal));

  /* Dark: sun behind and to the right, so the face we see is mostly night and
     the continents are drawn by their own city lights. Light: the sun swings
     round toward the camera and the same Earth becomes a day-lit marble on
     paper, with the terminator pushed to the left limb. */
  vec3 sunDir = normalize(mix(vec3(0.35,0.30,0.86), vec3(0.84,0.17,0.16), u_dark));
  vec3 col;

  vec2 cell = floor(gl_FragCoord.xy/2.0);
  float sr = hash21(cell);
  float star = pow(sr,330.0)*(0.70+0.30*sin(u_time*1.6+sr*90.0));
  if(u_dark > 0.5){
    col = vec3(0.005,0.007,0.013);
    col += vec3(0.85,0.90,1.0)*star*2.4;
  } else {
    /* warm paper, gently vignetted so the globe sits IN the page —
       and the same starfield printed in ink at low opacity */
    col = vec3(0.955,0.943,0.916);
    col -= 0.05*smoothstep(0.30, 1.20, length(guv));
    col -= vec3(0.62,0.58,0.50)*star*0.75;
  }

  float b=dot(ro,rd), c=dot(ro,ro)-1.0, h=b*b-c;
  if(h > 0.0){
    float t = -b - sqrt(h);
    vec3 p = ro + rd*t;
    vec3 n = p;
    vec3 q = rotYm(-u_spin) * (rotXm(-TILT) * p);   // back into the Earth's own frame

    vec2 tuv = vec2(0.5 + atan(q.x, q.z)/6.2831853,
                    0.5 - asin(clamp(q.y,-1.0,1.0))/3.1415927);
    float land  = texture2D(u_land,  tuv).r;
    vec3  lamps = texture2D(u_lights, tuv).rgb;

    float sun   = dot(n, sunDir);
    float day   = smoothstep(-0.08, 0.36, sun);
    float night = 1.0 - day;

    /* in the dark theme the day face is barely seen, so heavy grain reads as
       texture; on the light theme's day-lit marble it reads as static — tame it */
    float grain = hash21(floor(tuv*vec2(900.0,450.0)))*mix(0.03, 0.09, u_dark);
    vec3 ocean = mix(vec3(0.004,0.009,0.022), vec3(0.040,0.115,0.240), day);
    vec3 dayLand = mix(vec3(0.150,0.160,0.124), vec3(0.120,0.138,0.114), u_dark);
    vec3 crust = mix(vec3(0.011,0.014,0.018), dayLand+grain, day);
    vec3 surf  = mix(ocean, crust, land);

    vec3 rv = reflect(rd, n);
    surf += vec3(0.42,0.52,0.68)*pow(max(dot(rv,sunDir),0.0),30.0)*(1.0-land)*0.75*day;

    float flick = 0.90 + 0.10*sin(u_time*1.6 + tuv.x*260.0);
    surf += lamps * night * 1.15 * flick;
    surf += vec3(1.0,0.55,0.22)*length(lamps)*night*0.07;

    surf += vec3(1.0,0.50,0.18)*exp(-abs(sun)*30.0)*0.14;

    float fres = pow(1.0 - max(dot(n,-rd),0.0), 3.0);
    vec3 haze = mix(vec3(0.16,0.28,0.95), vec3(0.30,0.55,1.0), u_dark);
    surf += haze*fres*(0.055 + 0.95*max(sun,0.0))*mix(0.75, 1.0, u_dark);
    col = surf;
  } else {
    float rim  = u_focal/sqrt(CAM_D*CAM_D - 1.0);
    float d    = max(length(guv) - rim, 0.0);
    float side = smoothstep(-0.6, 0.7, guv.x*1.9 + guv.y*0.5);
    if(u_dark > 0.5){
      float glow = exp(-d*17.0);
      col += vec3(0.24,0.48,0.95)*glow*(0.04 + 0.46*side);
      col += vec3(0.55,0.72,1.00)*exp(-d*58.0)*side*0.45;
    } else {
      /* on paper the atmosphere is a shadow it casts, plus a cobalt hairline */
      col -= vec3(0.060,0.052,0.038)*exp(-d*13.0)*(0.30 + 0.55*side);
      col += vec3(0.16,0.28,0.95)*exp(-d*58.0)*side*0.12;
    }
  }
  col += (hash21(gl_FragCoord.xy)-0.5)/255.0;
  gl_FragColor = vec4(col,1.0);
}`

type Vec3 = [number, number, number]
type Sat = { r: number; inc: number; phase: number; spd: number }

const SATS: Sat[] = [
  { r: 1.3, inc: 0.55, phase: 0.0, spd: 0.42 },
  { r: 1.42, inc: -0.85, phase: 2.1, spd: 0.31 },
  { r: 1.34, inc: 1.25, phase: 4.0, spd: -0.37 },
  { r: 1.52, inc: -0.25, phase: 5.4, spd: 0.24 },
]

export default function GroundStation() {
  const sceneRef = useRef<HTMLElement>(null)
  const globeRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const hudRef = useRef<HTMLDivElement>(null)
  const hDotRef = useRef<HTMLSpanElement>(null)
  const hCoRef = useRef<HTMLDivElement>(null)
  const hRoleRef = useRef<HTMLDivElement>(null)
  const hYrRef = useRef<HTMLElement>(null)
  const hPlaceRef = useRef<HTMLElement>(null)
  const stationRef = useRef<HTMLSpanElement>(null)
  const telemetryRef = useRef<HTMLDivElement>(null)
  const legendRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const scene = sceneRef.current
    const gCanvas = globeRef.current
    const oCanvas = overlayRef.current
    const hud = hudRef.current
    if (!scene || !gCanvas || !oCanvas || !hud) return

    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* ── theme ───────────────────────────────────────────────────── */
    let dark = document.documentElement.dataset.theme !== 'light'
    /* the bright accents belong to the void; on paper, their ink counterparts */
    const accent = (hex: string) => (dark ? hex : inkOf(hex))

    /* ── framing ─────────────────────────────────────────────────── */
    let FOCAL = 1.05
    let CENTER: [number, number] = [0.4, -0.02]
    const layout = (W: number) => {
      if (W < 900) { FOCAL = 0.46; CENTER = [0.0, 0.18] }
      else { FOCAL = 1.05; CENTER = [0.4, -0.02] }
    }

    /* ── maths shared with the shader ────────────────────────────── */
    const rotY = (p: Vec3, a: number): Vec3 => {
      const c = Math.cos(a), s = Math.sin(a)
      return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]
    }
    const rotX = (p: Vec3, a: number): Vec3 => {
      const c = Math.cos(a), s = Math.sin(a)
      return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]
    }
    const surfacePoint = (latDeg: number, lonDeg: number, r: number, spin: number): Vec3 => {
      const la = (latDeg * Math.PI) / 180, lo = (lonDeg * Math.PI) / 180
      const p: Vec3 = [Math.cos(la) * Math.sin(lo) * r, Math.sin(la) * r, Math.cos(la) * Math.cos(lo) * r]
      return rotX(rotY(p, spin), TILT)
    }
    const project = (p: Vec3, W: number, H: number) => {
      const denom = CAM_D - p[2], s = FOCAL / denom
      return { x: (p[0] * s + CENTER[0]) * H + W / 2, y: H / 2 - (p[1] * s + CENTER[1]) * H }
    }
    /* is this point hidden behind the globe from where the camera sits? */
    const occluded = (p: Vec3) => {
      const v: Vec3 = [p[0], p[1], p[2] - CAM_D]
      const vv = v[0] * v[0] + v[1] * v[1] + v[2] * v[2]
      const t = -(CAM_D * v[2]) / vv
      if (t <= 0 || t >= 1) return false
      const q: Vec3 = [t * v[0], t * v[1], CAM_D + t * v[2]]
      return Math.hypot(q[0], q[1], q[2]) < 0.995
    }
    const satPos = (s: Sat, t: number): Vec3 => {
      const a = s.phase + t * s.spd
      return rotY(rotX([Math.cos(a) * s.r, 0, Math.sin(a) * s.r], s.inc), t * 0.05)
    }

    /* ── Earth maps, rasterised from real coastlines ─────────────── */
    const TW = 2048, TH = 1024
    const buildLand = () => {
      const cv = document.createElement('canvas')
      cv.width = TW; cv.height = TH
      const x = cv.getContext('2d')!
      x.fillStyle = '#000'; x.fillRect(0, 0, TW, TH)
      x.fillStyle = '#fff'
      for (const ring of LAND) {
        x.beginPath()
        let prev: number | null = null, started = false
        for (let i = 0; i < ring.length; i += 2) {
          const lon = ring[i] / 10, lat = ring[i + 1] / 10
          // a ring crossing the antimeridian would otherwise smear across the map
          if (prev !== null && Math.abs(lon - prev) > 180) { x.closePath(); x.fill(); x.beginPath(); started = false }
          const px = ((lon + 180) / 360) * TW, py = ((90 - lat) / 180) * TH
          if (!started) { x.moveTo(px, py); started = true } else x.lineTo(px, py)
          prev = lon
        }
        x.closePath(); x.fill()
      }
      return cv
    }
    const buildLights = (landCv: HTMLCanvasElement) => {
      const src = landCv.getContext('2d')!.getImageData(0, 0, TW, TH).data
      const isLand = (px: number, py: number) => {
        px = ((px % TW) + TW) % TW
        py = py < 0 ? 0 : py > TH - 1 ? TH - 1 : py
        return src[(py * TW + px) * 4] > 127
      }
      const cv = document.createElement('canvas')
      cv.width = TW; cv.height = TH
      const x = cv.getContext('2d')!
      x.fillStyle = '#000'; x.fillRect(0, 0, TW, TH)
      x.globalCompositeOperation = 'lighter'
      let placed = 0, tries = 0
      while (placed < 7000 && tries < 600000) {
        tries++
        const px = (Math.random() * TW) | 0, py = (Math.random() * TH) | 0
        if (!isLand(px, py)) continue
        const lat = 90 - (py / TH) * 180
        const latW = Math.exp(-Math.pow((Math.abs(lat) - 28) / 30, 2))
        const coastal = !isLand(px + 7, py) || !isLand(px - 7, py) || !isLand(px, py + 7) || !isLand(px, py - 7)
        // a low-frequency field, so lights gather into regions and leave deserts dark
        const u = (px / TW) * Math.PI * 2, v = (py / TH) * Math.PI
        const f =
          Math.sin(u * 1.7 + 1.3) * Math.sin(v * 2.1 + 0.7) +
          0.62 * Math.sin(u * 3.1 + 4.1) * Math.sin(v * 3.4 + 2.2) +
          0.38 * Math.sin(u * 6.3 + 0.3) * Math.sin(v * 5.9 + 5.5)
        const popW = Math.max(0.12, Math.min(1, (f + 0.95) / 1.7))
        if (Math.random() > latW * popW * (coastal ? 1.15 : 0.42)) continue
        const r = 0.55 + Math.random() * 1.35, a = 0.16 + Math.random() * 0.44
        const g = x.createRadialGradient(px, py, 0, px, py, r * 2.3)
        g.addColorStop(0, `rgba(255,214,150,${a})`)
        g.addColorStop(0.4, `rgba(255,168,86,${a * 0.34})`)
        g.addColorStop(1, 'rgba(255,140,60,0)')
        x.fillStyle = g
        x.beginPath(); x.arc(px, py, r * 2.3, 0, Math.PI * 2); x.fill()
        placed++
      }
      return cv
    }

    /* ── boot WebGL ──────────────────────────────────────────────── */
    const gl = gCanvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' })
    let U: Record<string, WebGLUniformLocation | null> | null = null
    if (gl) {
      const mk = (type: number, srcTxt: string) => {
        const sh = gl.createShader(type)!
        gl.shaderSource(sh, srcTxt); gl.compileShader(sh)
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(sh)); return null }
        return sh
      }
      const vs = mk(gl.VERTEX_SHADER, VERT), fs = mk(gl.FRAGMENT_SHADER, FRAG)
      if (vs && fs) {
        const prog = gl.createProgram()!
        gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
        if (gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          gl.useProgram(prog)
          gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
          const loc = gl.getAttribLocation(prog, 'position')
          gl.enableVertexAttribArray(loc)
          gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
          U = {
            time: gl.getUniformLocation(prog, 'u_time'),
            res: gl.getUniformLocation(prog, 'u_resolution'),
            spin: gl.getUniformLocation(prog, 'u_spin'),
            focal: gl.getUniformLocation(prog, 'u_focal'),
            center: gl.getUniformLocation(prog, 'u_center'),
            dark: gl.getUniformLocation(prog, 'u_dark'),
            land: gl.getUniformLocation(prog, 'u_land'),
            lights: gl.getUniformLocation(prog, 'u_lights'),
          }
          const landCv = buildLand()
          const tex = (cv: HTMLCanvasElement, unit: number) => {
            const t = gl.createTexture()
            gl.activeTexture(gl.TEXTURE0 + unit)
            gl.bindTexture(gl.TEXTURE_2D, t)
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
            return t
          }
          tex(landCv, 0); tex(buildLights(landCv), 1)
          gl.uniform1i(U.land, 0); gl.uniform1i(U.lights, 1)
        } else console.error(gl.getProgramInfoLog(prog))
      }
    }

    const ctx = oCanvas.getContext('2d')!
    let W = 0, H = 0, DPR = 1
    const size = () => {
      const r = scene.getBoundingClientRect()
      W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height))
      layout(W)
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      gCanvas.width = Math.round(W * DPR); gCanvas.height = Math.round(H * DPR)
      oCanvas.width = Math.round(W * DPR); oCanvas.height = Math.round(H * DPR)
      if (gl) gl.viewport(0, 0, gCanvas.width, gCanvas.height)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }

    /* ── the sequence ────────────────────────────────────────────── */
    const ACQUIRE = 0, OPEN = 1, HOLD = 2, CLOSE = 3
    let phase = ACQUIRE, pt = 0, idx = 0
    // start with the first posting already on the near meridian, a shade short
    // of centre so it still drifts in, then hold before opening
    let spin = (-POSTINGS[0].lon * Math.PI) / 180 - 0.1
    let spinRate = 0.085
    let linkSat: Sat | null = null
    let firstRun = true

    const mark = () => {
      const btns = legendRef.current?.querySelectorAll('button')
      btns?.forEach((b, j) => {
        b.classList.toggle(styles.active, j === idx)
        b.style.color = j === idx ? accent(POSTINGS[j].hex) : ''
      })
    }
    const fillHud = (p: (typeof POSTINGS)[number]) => {
      const hx = accent(p.hex)
      if (hDotRef.current) { hDotRef.current.style.background = hx; hDotRef.current.style.boxShadow = `0 0 8px ${hx}` }
      if (hCoRef.current) hCoRef.current.textContent = p.company
      if (hRoleRef.current) hRoleRef.current.textContent = p.role
      if (hYrRef.current) hYrRef.current.textContent = p.years
      if (hPlaceRef.current) hPlaceRef.current.textContent = p.place
      hud.style.borderColor = `${hx}${dark ? '4D' : '66'}`
      if (stationRef.current) stationRef.current.textContent = `Ground station · ${p.place.toLowerCase()}`
    }
    const goTo = (i: number) => { idx = i; phase = ACQUIRE; pt = 0; firstRun = false; hud.classList.remove(styles.hudOn); mark() }

    const btns = Array.from(legendRef.current?.querySelectorAll('button') ?? [])
    const handlers = btns.map((b, i) => {
      const h = () => goTo(i)
      b.addEventListener('click', h)
      return h
    })
    mark()

    /* how far the globe still has to turn before this beacon faces us */
    const spinNeeded = (lonDeg: number, s: number) => {
      const want = (-lonDeg * Math.PI) / 180
      const T = Math.PI * 2
      let d = (want - s) % T
      if (d < 0) d += T
      return d
    }

    /* ── draw ────────────────────────────────────────────────────── */
    let hudAnchor: { x: number; y: number; hex: string } | null = null
    const drawOverlay = (clock: number) => {
      ctx.clearRect(0, 0, W, H)
      hudAnchor = null

      SATS.forEach((s) => {
        const p = satPos(s, clock)
        if (occluded(p)) return
        const { x, y } = project(p, W, H)
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2)
        ctx.fillStyle = dark ? 'rgba(234,238,246,.9)' : 'rgba(22,22,26,.82)'; ctx.fill()
        ctx.beginPath(); ctx.arc(x, y, 7.4, 0, Math.PI * 2)
        ctx.strokeStyle = dark ? 'rgba(94,233,213,.20)' : 'rgba(28,49,201,.22)'; ctx.lineWidth = 1; ctx.stroke()
      })

      const active = POSTINGS[idx]
      const activeHex = accent(active.hex)
      const ap = surfacePoint(active.lat, active.lon, 1.0, spin)
      const aHidden = occluded(ap)

      if ((phase === OPEN || phase === HOLD || phase === CLOSE) && linkSat && !aHidden) {
        const to = satPos(linkSat, clock)
        const mid: Vec3 = [(ap[0] + to[0]) / 2, (ap[1] + to[1]) / 2, (ap[2] + to[2]) / 2]
        const ml = Math.hypot(mid[0], mid[1], mid[2]) || 1
        const cP: Vec3 = [(mid[0] / ml) * 1.5, (mid[1] / ml) * 1.5, (mid[2] / ml) * 1.5]
        const head = phase === OPEN ? Math.min(1, pt / T_OPEN) : 1
        const fade = phase === CLOSE ? Math.max(0, 1 - pt / T_CLOSE) : 1
        const bez = (t: number): Vec3 => {
          const u = 1 - t
          return [
            u * u * ap[0] + 2 * u * t * cP[0] + t * t * to[0],
            u * u * ap[1] + 2 * u * t * cP[1] + t * t * to[1],
            u * u * ap[2] + 2 * u * t * cP[2] + t * t * to[2],
          ]
        }
        ctx.lineWidth = 1.5; ctx.lineCap = 'round'
        ctx.beginPath()
        let started = false
        for (let i = 0; i <= 30; i++) {
          const q = bez(head * (i / 30))
          if (occluded(q)) { started = false; continue }
          const s = project(q, W, H)
          if (!started) { ctx.moveTo(s.x, s.y); started = true } else ctx.lineTo(s.x, s.y)
        }
        ctx.strokeStyle = activeHex; ctx.globalAlpha = 0.75 * fade; ctx.stroke(); ctx.globalAlpha = 1

        const hq = bez(head)
        if (!occluded(hq)) {
          const s = project(hq, W, H)
          ctx.beginPath(); ctx.arc(s.x, s.y, 2.6, 0, Math.PI * 2)
          ctx.fillStyle = activeHex; ctx.globalAlpha = fade; ctx.fill(); ctx.globalAlpha = 1
        }
      }

      POSTINGS.forEach((p, i) => {
        const wp = surfacePoint(p.lat, p.lon, 1.0, spin)
        if (occluded(wp)) return
        const s = project(wp, W, H)
        const hx = accent(p.hex)
        const live = i === idx && (phase === OPEN || phase === HOLD)
        const pulse = 0.5 + 0.5 * Math.sin(clock * 2.0 + i * 1.6)

        ctx.beginPath(); ctx.arc(s.x, s.y, live ? 3.6 : 2.4, 0, Math.PI * 2)
        ctx.fillStyle = hx; ctx.globalAlpha = live ? 1 : 0.65; ctx.fill(); ctx.globalAlpha = 1

        ctx.beginPath(); ctx.arc(s.x, s.y, (live ? 9 : 6) + pulse * (live ? 9 : 4), 0, Math.PI * 2)
        ctx.strokeStyle = hx; ctx.lineWidth = 1
        ctx.globalAlpha = (live ? 0.55 : 0.22) * (1 - pulse * 0.7); ctx.stroke(); ctx.globalAlpha = 1

        if (live) {
          ctx.beginPath(); ctx.arc(s.x, s.y, 15, 0, Math.PI * 2)
          ctx.strokeStyle = hx; ctx.globalAlpha = 0.45; ctx.stroke(); ctx.globalAlpha = 1
          hudAnchor = { x: s.x, y: s.y, hex: hx }
        }
      })
    }

    /* the HUD rides beside its beacon, with a leader line back to it */
    const placeHud = () => {
      const a = hudAnchor
      if (!a || !hud.classList.contains(styles.hudOn)) return
      const w = hud.offsetWidth || 186, h = hud.offsetHeight || 90
      const gap = W < 900 ? 16 : 26
      let left = a.x + gap
      let side = 1
      if (left + w > W - 14) { left = a.x - gap - w; side = -1 }
      left = Math.max(10, Math.min(W - w - 10, left))
      const top = Math.max(h / 2 + 10, Math.min(H - h / 2 - 10, a.y))
      hud.style.left = `${left}px`
      hud.style.top = `${top}px`

      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      const tx = side > 0 ? left - 1 : left + w + 1
      ctx.lineTo(tx, top)
      ctx.strokeStyle = a.hex; ctx.globalAlpha = 0.42; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1
      ctx.beginPath(); ctx.arc(tx, top, 1.8, 0, Math.PI * 2); ctx.fillStyle = a.hex; ctx.fill()
    }

    /* ── loop ────────────────────────────────────────────────────── */
    let raf = 0, visible = true, clock = 0, last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      if (!REDUCED) clock += dt

      const p = POSTINGS[idx]
      if (!REDUCED) {
        pt += dt
        if (phase === ACQUIRE) {
          // slew faster while hunting, but never move the camera
          const need = spinNeeded(p.lon, spin)
          const wp = surfacePoint(p.lat, p.lon, 1.0, spin)
          const facing = !occluded(wp) && (need < 0.55 || need > Math.PI * 2 - 0.55)
          spinRate += ((facing ? 0.085 : 0.62) - spinRate) * Math.min(1, dt * 2.2)
          if (facing && (!firstRun || pt >= FIRST_DELAY)) {
            firstRun = false
            phase = OPEN; pt = 0
            let best: Sat | null = null, bd = 1e9
            SATS.forEach((s) => {
              const sp = satPos(s, clock)
              if (occluded(sp)) return
              const d = Math.hypot(sp[0] - wp[0], sp[1] - wp[1], sp[2] - wp[2])
              if (d < bd) { bd = d; best = s }
            })
            linkSat = best ?? SATS[0]
          }
        } else if (phase === OPEN) {
          spinRate += (0.085 - spinRate) * Math.min(1, dt * 3)
          if (pt >= T_OPEN) { phase = HOLD; pt = 0; fillHud(p); hud.classList.add(styles.hudOn) }
        } else if (phase === HOLD) {
          if (pt >= T_HOLD) { phase = CLOSE; pt = 0; hud.classList.remove(styles.hudOn) }
        } else if (phase === CLOSE) {
          if (pt >= T_CLOSE) { idx = (idx + 1) % POSTINGS.length; phase = ACQUIRE; pt = 0; linkSat = null; mark() }
        }
        spin += dt * spinRate
      }

      if (gl && U) {
        gl.uniform1f(U.time, clock)
        gl.uniform2f(U.res, gCanvas.width, gCanvas.height)
        gl.uniform1f(U.spin, spin)
        gl.uniform1f(U.focal, FOCAL)
        gl.uniform2f(U.center, CENTER[0], CENTER[1])
        gl.uniform1f(U.dark, dark ? 1 : 0)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      drawOverlay(clock)
      placeHud()

      const tel = telemetryRef.current
      if (tel) {
        const names = ['ACQUIRING', 'OPENING', 'LINK UP', 'CLOSING']
        const vis = SATS.filter((s) => !occluded(satPos(s, clock))).length
        tel.innerHTML =
          `${names[phase]}<br>ORBIT 0${vis}/0${SATS.length} IN VIEW<br>` +
          `BEACON ${String(idx + 1).padStart(2, '0')}/0${POSTINGS.length}`
      }
      raf = visible && !document.hidden ? requestAnimationFrame(frame) : 0
    }
    const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame) } }
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0 } }

    const mo = new MutationObserver(() => {
      const d = document.documentElement.dataset.theme !== 'light'
      if (d === dark) return
      dark = d
      mark()
      if (hud.classList.contains(styles.hudOn)) fillHud(POSTINGS[idx])
      if (!raf) requestAnimationFrame(frame)
    })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    const ro = new ResizeObserver(() => { size(); if (!raf) requestAnimationFrame(frame) })
    ro.observe(scene)
    const io = new IntersectionObserver(([e]) => { visible = !!(e && e.isIntersecting); if (visible) start(); else stop() }, { rootMargin: '100px' })
    io.observe(scene)
    const onVis = () => { if (document.hidden) stop(); else if (visible) start() }
    document.addEventListener('visibilitychange', onVis)

    size()
    if (REDUCED) { fillHud(POSTINGS[0]); hud.classList.add(styles.hudOn); phase = HOLD }
    start()

    return () => {
      stop()
      mo.disconnect()
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      btns.forEach((b, i) => b.removeEventListener('click', handlers[i]))
    }
  }, [])

  return (
    <div className={styles.root}>
      <section className={styles.scene} ref={sceneRef}>
        <canvas ref={globeRef} />
        <div className={styles.scrim} />
        <canvas className={styles.overlay} ref={overlayRef} />

        <span className={`${styles.corner} ${styles.tl}`} />
        <span className={`${styles.corner} ${styles.tr}`} />
        <span className={`${styles.corner} ${styles.bl}`} />
        <span className={`${styles.corner} ${styles.br}`} />

        <div className={styles.topbar}>
          <span className={styles.mark}>D Rupesh Kumar</span>
          <nav className={styles.topnav}>
            <Link href="/learning">Learning</Link>
            <Link href="/tech-blogs">Blogs</Link>
            <Link href="/about">About</Link>
            <ThemeToggle />
          </nav>
        </div>

        <div className={styles.statement}>
          <div className={styles.coords}>
            <span className={styles.live} />
            <span ref={stationRef}>Ground station · standby</span>
          </div>
          <h1>
            Where, <em>and who.</em>
          </h1>
          <p>
            Every system I&apos;ve built answers one of those two questions — from an orbit, or from a
            phone in someone&apos;s hand.
          </p>
        </div>

        <div className={styles.hud} ref={hudRef} aria-live="polite">
          <div className={styles.hstat}>
            <span className={styles.hdot} ref={hDotRef} />
            <span>Link established</span>
          </div>
          <div className={styles.hco} ref={hCoRef}>—</div>
          <div className={styles.hrole} ref={hRoleRef}>—</div>
          <div className={styles.hmeta}>
            <b ref={hYrRef}>—</b>
            <b ref={hPlaceRef}>—</b>
          </div>
        </div>

        <div className={styles.legend}>
          <div className={styles.legendCap}>
            <span className={styles.legendBar} /> Beacons · one per posting
          </div>
          <ul className={styles.legendList} ref={legendRef}>
            {POSTINGS.map((p) => (
              <li key={p.id}>
                <button type="button" className={styles.legendBtn}>
                  <span className={styles.sw} style={accVars(p.hex)} />
                  <span>{p.company}</span>
                  <span className={styles.yr}>{p.years}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <Link className={styles.enter} href="/about">
          Enter <span className={styles.arr}>→</span>
        </Link>
        <div className={styles.telemetry} ref={telemetryRef}>—</div>
      </section>

      <section className={styles.index} id="log">
        <div className={styles.indexHead}>
          <h2>Station log</h2>
          <span>Five postings · 2019 — present</span>
        </div>
        {POSTINGS.map((p) => (
          <div className={styles.row} key={p.id}>
            <span className={styles.rowSw} style={accVars(p.hex)} />
            <span className={styles.rowCo}>{p.company}</span>
            <span className={styles.rowYr}>
              {p.years} · {p.place}
            </span>
            <span className={styles.rowLn}>{p.line}</span>
          </div>
        ))}
        <div className={styles.outro}>
          <p>The rest is detail. It&apos;s one page away.</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link className={styles.readme} href="/learning">
              Learning <span className={styles.arr}>→</span>
            </Link>
            <Link className={styles.readme} href="/tech-blogs">
              Tech blogs <span className={styles.arr}>→</span>
            </Link>
            <Link className={styles.readme} href="/about">
              About me <span className={styles.arr}>→</span>
            </Link>
          </div>
        </div>
      </section>

      <p className={styles.colophon}>
        A concept landing, not a résumé. Real coastlines from{' '}
        <a href="https://github.com/topojson/world-atlas" target="_blank" rel="noopener noreferrer">
          Natural Earth
        </a>{' '}
        are rasterised at load and lit by a day/night fragment shader, with city lights seeded onto
        land.
      </p>
    </div>
  )
}
