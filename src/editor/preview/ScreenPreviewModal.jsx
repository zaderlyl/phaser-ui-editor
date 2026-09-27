import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { generateScreenClass } from '../codegen/generateScreenClass'
import { DEFAULT_RESOLUTION } from '../config'
import './ScreenPreviewModal.css'

// Evaluate the same generated class source that ExportModal presents. Phaser
// is supplied as the global dependency expected by the exported module.
function buildScreenClass(elements) {
  const source = generateScreenClass(elements).replace(/^export default class Screen/m, 'class Screen')
  return new Function('Phaser', `${source}\nreturn Screen`)(Phaser)
}

function getImageButtonAssetIssue(elements) {
  const states = [
    ['normal', 'imageData', 'Normal'],
    ['hover', 'hoverImageData', 'Survol'],
    ['pressed', 'pressedImageData', 'Appui'],
  ]

  for (const element of elements) {
    if (element.type !== 'imagebutton') continue
    for (const [keyProp, dataProp, label] of states) {
      const key = element.props[keyProp === 'normal' ? 'textureKey' : `${keyProp}TextureKey`]
      const data = element.props[dataProp]
      if ((key && !data) || (keyProp === 'normal' && !key)) {
        return `Image ${label} manquante ou invalide pour « ${element.props.name} ».`
      }
    }
  }

  return ''
}

export function ScreenPreviewModal({ elements, onClose }) {
  const containerRef = useRef(null)
  const [error, setError] = useState('')
  const assetIssue = getImageButtonAssetIssue(elements)

  useEffect(() => {
    setError(assetIssue)
    if (assetIssue) return undefined

    let game
    try {
      const Screen = buildScreenClass(elements)
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: DEFAULT_RESOLUTION.width,
        height: DEFAULT_RESOLUTION.height,
        backgroundColor: '#1d1f27',
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: {
          create() {
            this.textures.on('onerror', (key) => {
              setError(`Phaser n’a pas pu charger l’image « ${key} ».`)
            })
            const screen = new Screen(this)
            screen.open()
          },
        },
      })
    } catch (thrown) {
      setError(thrown instanceof Error ? thrown.message : String(thrown))
    }

    return () => game?.destroy(true)
  }, [elements, assetIssue])

  return (
    <div className="screen-preview__backdrop" onClick={onClose}>
      <section
        className="screen-preview"
        role="dialog"
        aria-modal="true"
        aria-label="Aperçu de l’écran"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="screen-preview__header">
          <span>Aperçu de l’écran</span>
          <button type="button" className="screen-preview__close" onClick={onClose} aria-label="Fermer">×</button>
        </header>
        <div ref={containerRef} className="screen-preview__canvas" />
        {error && <p className="screen-preview__error" role="alert">Aperçu impossible : {error}</p>}
        <p className="screen-preview__note">Les boutons sont interactifs. Leurs callbacks sont des stubs en attente de logique métier.</p>
      </section>
    </div>
  )
}
