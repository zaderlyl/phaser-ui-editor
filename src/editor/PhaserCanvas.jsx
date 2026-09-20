import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { EditorScene } from './scenes/EditorScene'
import { DEFAULT_RESOLUTION } from './config'

// Mounts a real Phaser.Game as the editing surface. Kept as a thin wrapper —
// React owns the surrounding editor UI (panels), Phaser owns the canvas contents.
// onSceneReady hands the live EditorScene instance up to the parent so it can
// call scene methods (e.g. updateElementProps) from the properties panel.
export function PhaserCanvas({
  width = DEFAULT_RESOLUTION.width,
  height = DEFAULT_RESOLUTION.height,
  onSceneReady,
  onSelectionChange,
  onElementChange,
}) {
  const containerRef = useRef(null)
  const gameRef = useRef(null)

  useEffect(() => {
    if (gameRef.current) return

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width,
      height,
      backgroundColor: '#1d1f27',
      scene: [EditorScene],
    })
    gameRef.current = game

    game.events.once(Phaser.Core.Events.READY, () => {
      const scene = game.scene.getScene('EditorScene')
      scene.events.on('selectionchange', (element) => onSelectionChange?.(element))
      scene.events.on('elementchange', (element) => onElementChange?.(element))
      onSceneReady?.(scene)
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={containerRef} className="phaser-canvas" />
}
