import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as random from 'maath/random/dist/maath-random.esm'

function Stars(props: any) {
  const ref = useRef<any>(null)
  
  // Use useMemo to generate positions only once
  const positions = useMemo(() => {
    // Generate 1500 points in a sphere with radius 1.2
    const sphere = new Float32Array(1500 * 3)
    random.inSphere(sphere, { radius: 1.2 })
    // Remove NaN values that might be generated
    for (let i = 0; i < sphere.length; i++) {
      if (isNaN(sphere[i])) sphere[i] = 0
    }
    return sphere
  }, [])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10
      ref.current.rotation.y -= delta / 15
    }
  })

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={positions} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color="#8b5cf6"
          size={0.005}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  )
}

export default function Constellation() {
  return (
    <div className="w-full h-full absolute inset-0 z-0 opacity-50 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 1] }}>
        <Stars />
      </Canvas>
    </div>
  )
}
