'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import * as THREE from 'three'

interface Props { scrollProgressRef: React.MutableRefObject<number> }

const N_ARMS = 6
const N_DISC = 22000
const N_BULGE = 4000
const N_HALO  = 2000
const N_TOTAL = N_DISC + N_BULGE + N_HALO
const HUB_R = 2.15

function fract(x: number) { return x - Math.floor(x) }
function hash(n: number)  { return fract(Math.sin(n * 127.1) * 43758.5453) }
function gaussH(s: number): number {
  const u = Math.max(hash(s * 127.1 + 77.7), 0.001)
  const v = hash(s * 269.5 + 43.3)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// Platform brand colors adapted for visibility on light bg
const ARM_RGB: [number, number, number][] = [
  [0.910, 0.443, 0.102], // GA4 orange
  [0.259, 0.522, 0.957], // Ads blue
  [0.082, 0.553, 0.224], // GSC dark green
  [0.094, 0.467, 0.949], // Meta blue
  [0.855, 0.604, 0.027], // GBP amber
  [0.039, 0.400, 0.761], // LI navy
]

// Spectral colors: hot (blue) → warm (red)
const SPECTRAL: [number, number, number][] = [
  [0.114, 0.306, 0.847], // O/B deep blue
  [0.310, 0.275, 0.918], // A deep indigo
  [0.486, 0.227, 0.918], // F violet
  [0.706, 0.329, 0.047], // G amber
  [0.761, 0.255, 0.047], // K orange
  [0.725, 0.110, 0.110], // M red
]

const VERT = `
attribute vec3 aColor;
attribute float aSize;
attribute float aTwinkle;
uniform float uTime;
varying vec3 vColor;
varying float vOpacity;
void main() {
  vColor = aColor;
  float tw = 0.68 + 0.32 * sin(uTime * (1.1 + aTwinkle * 2.8) + aTwinkle * 47.3);
  vOpacity = tw;
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (260.0 / -mvPos.z);
  gl_Position = projectionMatrix * mvPos;
}
`

const FRAG = `
varying vec3 vColor;
varying float vOpacity;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float a = max(0.0, 1.0 - d * 2.0) * vOpacity;
  a = pow(a, 1.35);
  gl_FragColor = vec4(vColor, a * 0.88);
}
`

const PLAT = [
  { name: 'GA4',  color: '#E8711A', rgb: [232, 113,  26] as [number, number, number] },
  { name: 'Ads',  color: '#4285F4', rgb: [ 66, 133, 244] as [number, number, number] },
  { name: 'GSC',  color: '#34A853', rgb: [ 52, 168,  83] as [number, number, number] },
  { name: 'Meta', color: '#1877F2', rgb: [ 24, 119, 242] as [number, number, number] },
  { name: 'GBP',  color: '#FBBC04', rgb: [251, 188,   4] as [number, number, number] },
  { name: 'LI',   color: '#0A66C2', rgb: [ 10, 102, 194] as [number, number, number] },
]

// ─── Texture factories ────────────────────────────────────────

function makeGlowTex(r: number, g: number, b: number, s = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = s
  const ctx = c.getContext('2d')!
  const grd = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
  grd.addColorStop(0,    `rgba(${r},${g},${b},0.48)`)
  grd.addColorStop(0.45, `rgba(${r},${g},${b},0.18)`)
  grd.addColorStop(1,    `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = grd; ctx.fillRect(0, 0, s, s)
  return new THREE.CanvasTexture(c)
}

function makeAtmosTex(r: number, g: number, b: number, s = 512): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = s
  const ctx = c.getContext('2d')!
  const grd = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2)
  grd.addColorStop(0,    `rgba(${r},${g},${b},0.18)`)
  grd.addColorStop(0.4,  `rgba(${r},${g},${b},0.08)`)
  grd.addColorStop(0.75, `rgba(${r},${g},${b},0.02)`)
  grd.addColorStop(1,    `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = grd; ctx.fillRect(0, 0, s, s)
  return new THREE.CanvasTexture(c)
}

function makeLogoTex(s = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = s
  const ctx = c.getContext('2d')!
  const cx = s/2, cy = s/2, r = s * 0.28
  const halo = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, s / 2)
  halo.addColorStop(0, 'rgba(30,64,175,0.28)'); halo.addColorStop(1, 'rgba(30,64,175,0)')
  ctx.fillStyle = halo; ctx.fillRect(0, 0, s, s)
  const bg = ctx.createRadialGradient(cx - r*0.28, cy - r*0.28, 0, cx, cy, r)
  bg.addColorStop(0, '#2d5bd1'); bg.addColorStop(0.6, '#1e3fa8'); bg.addColorStop(1, '#1a2a8f')
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle = bg; ctx.fill()
  const rim = ctx.createRadialGradient(cx, cy, r * 0.72, cx, cy, r)
  rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, 'rgba(0,0,0,0.28)')
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle = rim; ctx.fill()
  const shine = ctx.createRadialGradient(cx - r*0.28, cy - r*0.38, 0, cx, cy, r * 0.85)
  shine.addColorStop(0, 'rgba(255,255,255,0.36)'); shine.addColorStop(0.42, 'rgba(255,255,255,0.10)'); shine.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle = shine; ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.96)'
  ctx.font = `900 ${Math.round(r * 1.22)}px -apple-system,"Helvetica Neue",Arial,sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('O', cx, cy + r * 0.05)
  return new THREE.CanvasTexture(c)
}

function makePlatTex(idx: number, s = 128): THREE.CanvasTexture {
  const p = PLAT[idx]; const [r, g, b] = p.rgb
  const c = document.createElement('canvas'); c.width = c.height = s
  const ctx = c.getContext('2d')!
  const cx = s/2, cy = s/2, rad = s * 0.36
  const halo = ctx.createRadialGradient(cx, cy, rad*0.6, cx, cy, s/2)
  halo.addColorStop(0, `rgba(${r},${g},${b},0.32)`); halo.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = halo; ctx.fillRect(0, 0, s, s)
  const lr = Math.min(255, r+58), lg = Math.min(255, g+58), lb = Math.min(255, b+58)
  const bg = ctx.createRadialGradient(cx-rad*0.22, cy-rad*0.22, 0, cx, cy, rad)
  bg.addColorStop(0, `rgb(${lr},${lg},${lb})`); bg.addColorStop(1, `rgb(${r},${g},${b})`)
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI*2); ctx.fillStyle = bg; ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = 'rgba(255,255,255,0.95)'
  ctx.lineWidth = rad*0.11; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  if (p.name === 'GA4') {
    const bw = rad*0.19, gap = rad*0.08, bot = cy+rad*0.3; let x = cx-(3*bw+2*gap)/2
    for (const h of [0.44, 0.72, 0.34]) { ctx.fillRect(x, bot-rad*h*1.1, bw, rad*h*1.1); x += bw+gap }
  } else if (p.name === 'Ads') {
    for (let i = 0; i < 6; i++) {
      const a = i/6*Math.PI*2
      ctx.beginPath(); ctx.moveTo(cx+Math.cos(a)*rad*0.15, cy+Math.sin(a)*rad*0.15)
      ctx.lineTo(cx+Math.cos(a)*rad*0.56, cy+Math.sin(a)*rad*0.56); ctx.stroke()
    }
    ctx.beginPath(); ctx.arc(cx, cy, rad*0.13, 0, Math.PI*2); ctx.fill()
  } else if (p.name === 'GSC') {
    const gr = rad*0.3, ox = cx-rad*0.06, oy = cy-rad*0.09; ctx.lineWidth = rad*0.12
    ctx.beginPath(); ctx.arc(ox, oy, gr, 0, Math.PI*2); ctx.stroke()
    const ha = Math.PI*0.75
    ctx.beginPath(); ctx.moveTo(ox+Math.cos(ha)*gr*0.9, oy+Math.sin(ha)*gr*0.9)
    ctx.lineTo(ox+Math.cos(ha)*(gr+rad*0.3), oy+Math.sin(ha)*(gr+rad*0.3)); ctx.stroke()
  } else if (p.name === 'Meta') {
    ctx.lineWidth = rad*0.115; const sv = rad*0.22
    ctx.beginPath(); ctx.moveTo(cx, cy)
    ctx.bezierCurveTo(cx-sv*0.8, cy-sv*1.3, cx-sv*1.8, cy-sv*1.3, cx-sv*1.8, cy)
    ctx.bezierCurveTo(cx-sv*1.8, cy+sv*1.3, cx-sv*0.8, cy+sv*1.3, cx, cy)
    ctx.bezierCurveTo(cx+sv*0.8, cy-sv*1.3, cx+sv*1.8, cy-sv*1.3, cx+sv*1.8, cy)
    ctx.bezierCurveTo(cx+sv*1.8, cy+sv*1.3, cx+sv*0.8, cy+sv*1.3, cx, cy); ctx.stroke()
  } else if (p.name === 'GBP') {
    const pr = rad*0.29, top = cy-rad*0.09
    ctx.beginPath(); ctx.arc(cx, top, pr, 0, Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.moveTo(cx-pr*0.56, top+pr*0.68); ctx.lineTo(cx, top+rad*0.52)
    ctx.lineTo(cx+pr*0.56, top+pr*0.68); ctx.closePath(); ctx.fill()
  } else {
    ctx.font = `900 ${Math.round(rad*0.82)}px Arial,sans-serif`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('in', cx, cy+rad*0.04)
  }
  return new THREE.CanvasTexture(c)
}

// ─── Components ───────────────────────────────────────────────

function GalaxyPoints() {
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  const geo = useMemo(() => {
    const pos     = new Float32Array(N_TOTAL * 3)
    const colors  = new Float32Array(N_TOTAL * 3)
    const sizes   = new Float32Array(N_TOTAL)
    const twinkle = new Float32Array(N_TOTAL)
    let idx = 0

    // Disc / arms
    for (let i = 0; i < N_DISC; i++) {
      const arm = i % N_ARMS
      const t   = i / N_DISC
      const a   = (arm * Math.PI * 2 / N_ARMS) + t * Math.PI * 7
      const rr  = 0.3 + t * 3.8
      const sx  = gaussH(i * 13.7 + arm * 7.3) * rr * 0.28
      const sy  = gaussH(i * 17.3 + arm * 11.1)
      const sz  = gaussH(i * 23.1 + arm * 5.7) * rr * 0.28
      pos[idx*3]   = Math.cos(a) * rr + sx
      pos[idx*3+1] = sy * rr * 0.10
      pos[idx*3+2] = Math.sin(a) * rr + sz

      // 65% arm color, 35% spectral
      const useSpectral = hash(i * 43.3 + 77.7) > 0.65
      const c = useSpectral
        ? SPECTRAL[Math.floor(hash(i * 89.1) * SPECTRAL.length)]
        : ARM_RGB[arm]
      colors[idx*3]   = c[0]
      colors[idx*3+1] = c[1]
      colors[idx*3+2] = c[2]

      const sizeBase = hash(i * 31.7 + arm * 3.1)
      sizes[idx]   = 0.03 + sizeBase * sizeBase * 0.18
      twinkle[idx] = hash(i * 71.9 + arm * 29.3)
      idx++
    }

    // Bulge: compressed sphere in centre
    for (let i = 0; i < N_BULGE; i++) {
      const r  = 0.15 + Math.abs(gaussH(i * 67.1 + 11.1)) * 1.0
      const th = hash(i * 47.3 + 3.1) * Math.PI * 2
      const ph = Math.acos(2 * hash(i * 19.7 + 7.3) - 1)
      pos[idx*3]   = r * Math.sin(ph) * Math.cos(th)
      pos[idx*3+1] = r * Math.sin(ph) * Math.sin(th) * 0.55
      pos[idx*3+2] = r * Math.cos(ph)
      // Warm amber/orange for bulge
      const ci = Math.floor(hash(i * 13.1) * 3) + 3
      const c = SPECTRAL[ci]
      colors[idx*3]   = c[0]; colors[idx*3+1] = c[1]; colors[idx*3+2] = c[2]
      sizes[idx]   = 0.04 + hash(i * 11.3) * 0.12
      twinkle[idx] = hash(i * 53.7 + 47.3)
      idx++
    }

    // Halo: sparse outer sphere
    for (let i = 0; i < N_HALO; i++) {
      const r  = 3.0 + hash(i * 37.1 + 13.3) * 2.2
      const th = hash(i * 89.3 + 7.7) * Math.PI * 2
      const ph = Math.acos(2 * hash(i * 53.1 + 23.3) - 1)
      pos[idx*3]   = r * Math.sin(ph) * Math.cos(th)
      pos[idx*3+1] = r * Math.sin(ph) * Math.sin(th) * 0.7
      pos[idx*3+2] = r * Math.cos(ph)
      // Cool blue/indigo for halo
      const ci = Math.floor(hash(i * 31.1) * 3)
      const c = SPECTRAL[ci]
      colors[idx*3]   = c[0]; colors[idx*3+1] = c[1]; colors[idx*3+2] = c[2]
      sizes[idx]   = 0.025 + hash(i * 17.7) * 0.07
      twinkle[idx] = hash(i * 43.3 + 61.1)
      idx++
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aColor',   new THREE.BufferAttribute(colors, 3))
    g.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1))
    g.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkle, 1))
    return g
  }, [])

  useFrame(({ clock }) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = clock.elapsedTime
  })

  return (
    <points geometry={geo}>
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{ uTime: { value: 0 } }}
        transparent
        depthWrite={false}
      />
    </points>
  )
}

function AtmosphereLayer() {
  const t1 = useMemo(() => makeAtmosTex( 37,  99, 235, 512), [])
  const t2 = useMemo(() => makeAtmosTex( 99, 102, 241, 512), [])
  const t3 = useMemo(() => makeAtmosTex( 14, 165, 233, 512), [])
  return (
    <>
      <sprite position={[ 1.5,  0.4, -2.5]} scale={[8, 8, 1]}><spriteMaterial map={t1} transparent opacity={0.10} depthWrite={false} /></sprite>
      <sprite position={[-2.0, -0.5, -2.0]} scale={[6, 6, 1]}><spriteMaterial map={t2} transparent opacity={0.08} depthWrite={false} /></sprite>
      <sprite position={[ 0.2,  1.8, -3.0]} scale={[7, 7, 1]}><spriteMaterial map={t3} transparent opacity={0.07} depthWrite={false} /></sprite>
    </>
  )
}

function CentralCore() {
  const spriteRef = useRef<THREE.Sprite>(null!)
  const halos = useRef<(THREE.Mesh | null)[]>([null, null, null])
  const tex = useMemo(() => makeLogoTex(256), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (spriteRef.current) { const s = 0.54 + Math.sin(t * 1.4) * 0.022; spriteRef.current.scale.set(s, s, 1) }
    halos.current.forEach((h, i) => {
      if (!h) return
      h.scale.setScalar(1 + Math.sin(t * 1.1 - i * 0.7) * 0.055)
      ;(h.material as THREE.MeshBasicMaterial).opacity = (0.10 - i * 0.028) * (0.78 + Math.sin(t * 1.4 + i) * 0.22)
    })
  })

  return (
    <group>
      {[0.42, 0.60, 0.80].map((r, i) => (
        <mesh key={i} ref={el => { halos.current[i] = el }}>
          <sphereGeometry args={[r, 14, 14]} />
          <meshBasicMaterial color={['#1e40af', '#2563eb', '#3b82f6'][i]} transparent opacity={0.10 - i * 0.028} />
        </mesh>
      ))}
      <sprite ref={spriteRef} scale={[0.54, 0.54, 1]}>
        <spriteMaterial map={tex} transparent opacity={0.97} depthTest={false} />
      </sprite>
    </group>
  )
}

function PlatformIcons({ platTexs }: { platTexs: THREE.CanvasTexture[] }) {
  const refs = useRef<(THREE.Sprite | null)[]>(PLAT.map(() => null))

  useFrame(({ clock }) => {
    refs.current.forEach((s, i) => {
      if (s) s.position.y = Math.sin(clock.elapsedTime * 0.68 + i * 1.1) * 0.09
    })
  })

  return (
    <>
      {PLAT.map((p, i) => {
        const angle = (i / N_ARMS) * Math.PI * 2
        const px = Math.cos(angle) * HUB_R
        const pz = Math.sin(angle) * HUB_R
        return (
          <group key={i} position={[px, 0, pz]}>
            <sprite scale={[0.88, 0.88, 1]}>
              <spriteMaterial map={platTexs[i]} transparent opacity={0.22} depthWrite={false} />
            </sprite>
            <sprite ref={el => { refs.current[i] = el }} scale={[0.40, 0.40, 1]}>
              <spriteMaterial map={platTexs[i]} transparent opacity={0.95} />
            </sprite>
          </group>
        )
      })}
    </>
  )
}

function Scene({ scrollProgressRef }: Props) {
  const groupRef  = useRef<THREE.Group>(null!)
  const platTexs  = useMemo(() => PLAT.map((_, i) => makePlatTex(i, 128)), [])
  const nebulaTex = useMemo(() => PLAT.map(p => makeGlowTex(...p.rgb, 256)), [])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    const sp = scrollProgressRef.current
    groupRef.current.rotation.y += delta * (0.09 + sp * 0.06)
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(groupRef.current.scale.x, 1.0 - sp * 0.18, delta * 3))
  })

  return (
    <>
      <ambientLight intensity={0.30} />
      <pointLight position={[0, 2, 3]} intensity={1.0} color="#93c5fd" />
      <pointLight position={[-2, -1, -3]} intensity={0.4} color="#6366f1" />
      <AtmosphereLayer />
      <group rotation={[0.65, 0, 0.38]}>
        <CentralCore />
        <group ref={groupRef}>
          <GalaxyPoints />
          {PLAT.map((_, i) => {
            const a = (i / N_ARMS) * Math.PI * 2 + 0.38
            return (
              <sprite key={i} position={[Math.cos(a)*HUB_R*1.3, i%2===0 ? 0.28 : -0.28, Math.sin(a)*HUB_R*1.3]} scale={[2.1, 2.1, 1]}>
                <spriteMaterial map={nebulaTex[i]} transparent opacity={0.14} depthWrite={false} />
              </sprite>
            )
          })}
          <PlatformIcons platTexs={platTexs} />
        </group>
      </group>
    </>
  )
}

export default function HeroScene({ scrollProgressRef }: Props) {
  return (
    <Canvas
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.8, 5.0], fov: 54 }}
      dpr={[1, 2]}
      style={{ background: 'transparent' }}
    >
      <Scene scrollProgressRef={scrollProgressRef} />
    </Canvas>
  )
}
