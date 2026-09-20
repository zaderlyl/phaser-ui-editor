import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { EditorScene } from './scenes/EditorScene'
import { DEFAULT_RESOLUTION } from './config'
import { componentLibrary } from './library/registry'

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
  onElementsChange,
}) {
  const containerRef = useRef(null)
  const gameRef = useRef(null)
  const sceneRef = useRef(null)

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
      sceneRef.current = scene
      scene.events.on('selectionchange', (element) => onSelectionChange?.(element))
      scene.events.on('elementchange', (element) => onElementChange?.(element))
      scene.events.on('elementsChange', (elements) => onElementsChange?.(elements))
      onSceneReady?.(scene)
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dropping a library item places a real instance at the drop point. The
  // canvas can be CSS-scaled down to fit the available space (see App.css),
  // so the drop's page coordinates are converted through the canvas's actual
  // displayed size to the game's own coordinate system, not used as-is.
  const handleDragOver = (event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (event) => {
    event.preventDefault()

    const scene = sceneRef.current
    const canvas = gameRef.current?.canvas
    if (!scene || !canvas) return

    const type = event.dataTransfer.getData('text/plain')
    if (!componentLibrary.some((component) => component.type === type)) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = width / rect.width
    const scaleY = height / rect.height
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    const element = scene.addElement(type, { x, y, originX: 0.5, originY: 0.5 })
    scene.selectElement(element.id)
  }

  return (
    <div
      ref={containerRef}
      className="phaser-canvas"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  )
}
