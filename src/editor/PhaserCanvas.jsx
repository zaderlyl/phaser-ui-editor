import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { EditorScene } from './scenes/EditorScene'
import { DEFAULT_RESOLUTION } from './config'

// Mounts a real Phaser.Game as the editing surface. Kept as a thin wrapper —
// React owns the surrounding editor UI (panels), Phaser owns the canvas contents.
export function PhaserCanvas({ width = DEFAULT_RESOLUTION.width, height = DEFAULT_RESOLUTION.height }) {
  const containerRef = useRef(null)
  const gameRef = useRef(null)

  useEffect(() => {
    if (gameRef.current) return

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width,
      height,
      backgroundColor: '#1d1f27',
      scene: [EditorScene],
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="phaser-canvas" />
}
