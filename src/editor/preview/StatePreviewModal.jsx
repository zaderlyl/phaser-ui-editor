import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { componentLibrary } from '../library/registry'
import './StatePreviewModal.css'

const STATE_LABELS = { normal: 'Normal', hover: 'Survol', pressed: 'Appui' }

// Renders the selected element in its own tiny, isolated Phaser.Game —
// visually what ExportModal does in text — so a créa can actually see
// what its hover/pressed state looks like without exporting and clicking
// a real game. The ◀ ▶ arrows manually force whichever state is showing
// (via the component's own applyPreviewState, see button.js/
// imagebutton.js) rather than simulating real pointer events — the live
// canvas itself never shows these states either, for the same reason
// (clicking there always means select/drag, never hover/press).
export function StatePreviewModal({ element, onClose }) {
  const containerRef = useRef(null)
  const gameRef = useRef(null)
  const gameObjectRef = useRef(null)
  const [stateIndex, setStateIndex] = useState(0)

  const definition = componentLibrary.find((component) => component.type === element.type)
  // Only Bouton composé has children (separate elements on the main
  // canvas its own props merely reference by id — see statebutton.js) or
  // needs to resolve another type's own definition; every other type's
  // hooks simply ignore these two extra arguments.
  const children = element.children ?? []
  const lookupDefinition = (type) => componentLibrary.find((component) => component.type === type)
  const states = definition?.getPreviewStates?.(element.props, children) ?? ['normal']
  const currentState = states[stateIndex] ?? states[0]
  // Texture loading below is async — if a créa flips the arrow before it
  // resolves, the game-creation effect's own closure would otherwise
  // still see whatever `currentState` was at mount (its deps are `[]`, so
  // it never re-runs). A ref always reads the latest value instead.
  const currentStateRef = useRef(currentState)
  currentStateRef.current = currentState

  // Big enough to give the element some breathing room regardless of its
  // own size, but capped so a huge element doesn't blow up the modal.
  const previewWidth = Math.min(600, Math.max(240, element.props.width + 120))
  const previewHeight = Math.min(500, Math.max(200, element.props.height + 120))

  useEffect(() => {
    if (gameRef.current) return

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: previewWidth,
      height: previewHeight,
      backgroundColor: '#1d1f27',
      scene: {
        create() {
          const scene = this

          // This mini Phaser.Game has its own, empty texture manager,
          // entirely separate from the main editor's — a texture-based
          // component (Bouton image) needs its own copy of whichever
          // keys it references loaded here first, the same addBase64 +
          // 'addtexture-<key>' pattern used everywhere else in this
          // codebase (see image.js/imagebutton.js's own generateCode).
          // Bouton's solid colors need nothing here (getPreviewTextures
          // returns []), so this resolves immediately for it.
          const textures = definition.getPreviewTextures?.(element.props, children, lookupDefinition) ?? []
          const loaded = textures.map(
            ({ key, data }) =>
              new Promise((resolve) => {
                scene.textures.once(`addtexture-${key}`, resolve)
                scene.textures.addBase64(key, data)
              }),
          )

          Promise.all(loaded).then(() => {
            // Centered regardless of the real element's own x/y/origin on
            // the main canvas — this is a standalone preview instance,
            // not a copy of its canvas position. Spread into a new
            // object rather than mutating element.props directly:
            // Bouton's own create() rewrites props.x/y in place (see its
            // own note on why), which must not leak back into the real
            // element just because its preview was opened.
            const previewProps = { ...element.props, x: previewWidth / 2, y: previewHeight / 2, originX: 0.5, originY: 0.5 }
            // Bouton composé's children live outside its own props (see
            // above), so it gets its own builder that resolves and
            // creates them fresh in this isolated game — everything else
            // is fully described by previewProps alone.
            const gameObject = definition.createPreview
              ? definition.createPreview(scene, previewProps, children, lookupDefinition)
              : definition.create(scene, previewProps)
            gameObjectRef.current = gameObject
            definition.applyPreviewState?.(gameObject, element.props, currentStateRef.current)
          })
        },
      },
    })
    gameRef.current = game

    return () => {
      game.destroy(true)
      gameRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-applies whenever the arrows change which state is selected —
  // separate from the game-creation effect above so cycling states
  // doesn't tear down and recreate the whole mini Phaser.Game each time.
  useEffect(() => {
    if (!gameObjectRef.current) return
    definition.applyPreviewState?.(gameObjectRef.current, element.props, currentState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentState])

  const goPrev = () => setStateIndex((index) => (index - 1 + states.length) % states.length)
  const goNext = () => setStateIndex((index) => (index + 1) % states.length)

  return (
    <div className="state-preview-modal__backdrop" onClick={onClose}>
      {/* Both stopPropagation calls matter, not just one: Phaser's own
          InputManager listens for 'mousedown' directly on `window` (not
          scoped to the canvas), and only checks whether the click's
          screen coordinates fall within the canvas's own bounding rect —
          it has no notion of DOM z-index/overlays, so a click on this
          modal's own mini canvas or its arrows (this modal visually
          covers the main canvas) would otherwise still reach the *main*
          editor's Phaser instance as "clicked the canvas background" and
          deselect whatever's selected there — confirmed via a real
          repro, a stack trace through Phaser's onMouseDownWindow into
          EditorScene's deselectAll. onClick's stopPropagation alone
          doesn't prevent that: 'mousedown' fires and fully bubbles to
          `window` *before* the synthesized 'click' event even exists, so
          it needs its own stop (see ExportModal's identical fix). */}
      <div
        className="state-preview-modal"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="state-preview-modal__header">
          <span>Aperçu des états — {element.props.name}</span>
          <button type="button" className="state-preview-modal__close" onClick={onClose}>
            ×
          </button>
        </div>
        <div ref={containerRef} className="state-preview-modal__canvas" />
        <div className="state-preview-modal__nav">
          <button type="button" onClick={goPrev} disabled={states.length <= 1}>
            ◀
          </button>
          <span className="state-preview-modal__state-label">{STATE_LABELS[currentState] ?? currentState}</span>
          <button type="button" onClick={goNext} disabled={states.length <= 1}>
            ▶
          </button>
        </div>
      </div>
    </div>
  )
}
