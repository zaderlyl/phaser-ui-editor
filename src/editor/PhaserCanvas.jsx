import { useEffect, useRef, useState } from 'react'
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
  const fileInputRef = useRef(null)
  // Where to place the image once a file is actually chosen — Image has
  // no sensible default content, so unlike every other component, its
  // drop doesn't call addElement() directly (see handleDrop/
  // handleImageFileChange below).
  const pendingImageDropRef = useRef(null)
  // Double-clicking a text element (see EditorScene's 'starttextedit')
  // opens this <textarea> overlay positioned right on top of it — Phaser
  // itself has no text input, so editing happens in real DOM instead, and
  // the live Text is hidden underneath for the duration (see
  // commitTextEdit/cancelTextEdit) to avoid rendering it twice.
  const [editingText, setEditingText] = useState(null)

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
      scene.events.on('starttextedit', (payload) => {
        const canvas = gameRef.current?.canvas
        const container = containerRef.current
        if (!canvas || !container) return

        // Same CSS-scaling concern as handleDrop below, just inverted: game
        // coordinates -> screen pixels, offset by the canvas's position
        // within its (possibly larger, centered) flex container.
        const canvasRect = canvas.getBoundingClientRect()
        const containerRect = container.getBoundingClientRect()
        const scaleX = canvasRect.width / width
        const scaleY = canvasRect.height / height
        const offsetLeft = canvasRect.left - containerRect.left
        const offsetTop = canvasRect.top - containerRect.top

        setEditingText({
          id: payload.id,
          value: payload.text,
          left: offsetLeft + payload.bounds.x * scaleX,
          top: offsetTop + payload.bounds.y * scaleY,
          width: payload.bounds.width * scaleX,
          height: payload.bounds.height * scaleY,
          fontSize: payload.fontSize * scaleY,
          color: payload.color,
          align: payload.align,
          padding: (payload.padding ?? 0) * scaleX,
        })
      })
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

    if (type === 'image') {
      // No sensible default content to place immediately — remember
      // where the drop happened and ask for a file instead; the element
      // is only created once handleImageFileChange's texture actually
      // finishes loading.
      pendingImageDropRef.current = { x, y }
      fileInputRef.current?.click()
      return
    }

    const element = scene.addElement(type, { x, y, originX: 0.5, originY: 0.5 })
    scene.selectElement(element.id)
  }

  // A picture larger than this on its longest side is scaled down for its
  // initial display size (still at native resolution otherwise) — purely
  // so a big photo doesn't drop in dwarfing the whole 1280x720 canvas;
  // the user can resize it larger afterward like any other element.
  const MAX_INITIAL_IMAGE_DIMENSION = 400

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0]
    const drop = pendingImageDropRef.current
    pendingImageDropRef.current = null
    event.target.value = '' // otherwise re-picking the same file wouldn't fire onChange again
    if (!file || !drop) return

    const scene = sceneRef.current
    if (!scene) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      // Unique per upload so re-importing different files never collides
      // in Phaser's shared texture cache.
      const textureKey = `image-${crypto.randomUUID()}`

      // addBase64 decodes the image asynchronously (it's a real
      // HTMLImageElement load under the hood) — the texture, and its
      // now-known natural size, aren't available until this fires.
      scene.textures.once(`addtexture-${textureKey}`, () => {
        const source = scene.textures.get(textureKey).getSourceImage()
        const scale = Math.min(1, MAX_INITIAL_IMAGE_DIMENSION / Math.max(source.width, source.height))
        const width = Math.round(source.width * scale)
        const height = Math.round(source.height * scale)

        const element = scene.addElement('image', {
          x: drop.x,
          y: drop.y,
          width,
          height,
          textureKey,
          imageData: dataUrl,
          originX: 0.5,
          originY: 0.5,
        })
        scene.selectElement(element.id)
      })
      scene.textures.addBase64(textureKey, dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const commitTextEdit = () => {
    if (!editingText) return
    sceneRef.current?.commitTextEdit(editingText.id, editingText.value)
    setEditingText(null)
  }

  const cancelTextEdit = () => {
    if (!editingText) return
    sceneRef.current?.cancelTextEdit(editingText.id)
    setEditingText(null)
  }

  // Clicking the Phaser canvas to commit-by-clicking-away doesn't reliably
  // blur the textarea — Phaser's own pointer handling on the canvas can
  // keep the DOM focus from moving the normal way. A capture-phase
  // mousedown on the whole document, which runs before Phaser's own
  // canvas listener, catches every "click away" case (canvas or anywhere
  // else in the app) regardless of whether a native blur happens to fire.
  useEffect(() => {
    if (!editingText) return

    const handlePointerDown = (event) => {
      if (event.target.closest?.('.phaser-canvas__text-editor')) return
      sceneRef.current?.commitTextEdit(editingText.id, editingText.value)
      setEditingText(null)
    }
    document.addEventListener('mousedown', handlePointerDown, true)
    return () => document.removeEventListener('mousedown', handlePointerDown, true)
  }, [editingText])

  return (
    <div
      ref={containerRef}
      className="phaser-canvas"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageFileChange}
      />
      {editingText && (
        <textarea
          autoFocus
          className="phaser-canvas__text-editor"
          style={{
            left: editingText.left,
            top: editingText.top,
            width: editingText.width,
            height: editingText.height,
            fontSize: editingText.fontSize,
            color: `#${editingText.color.toString(16).padStart(6, '0')}`,
            textAlign: editingText.align,
            padding: editingText.padding,
          }}
          value={editingText.value}
          onChange={(event) =>
            setEditingText((current) => ({ ...current, value: event.target.value }))
          }
          onBlur={commitTextEdit}
          onKeyDown={(event) => {
            // Escape discards the edit; Enter stays a plain newline (text
            // is multi-line, see text.js's word-wrap) — commit only happens
            // on blur, i.e. clicking away.
            if (event.key === 'Escape') {
              event.preventDefault()
              cancelTextEdit()
            }
          }}
        />
      )}
    </div>
  )
}
