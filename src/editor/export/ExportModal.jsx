import { useMemo, useRef, useState } from 'react'
import { generateScreenClass } from '../codegen/generateScreenClass'
import './ExportModal.css'

// Same rule as element names: the class name becomes a real JS identifier
// in the generated file, so it must be valid. Falls back to 'Screen'
// (without touching what the user typed) until they fix it.
const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/

export function ExportModal({ elements, onClose }) {
  const [className, setClassName] = useState('Screen')
  const [copyState, setCopyState] = useState('idle') // 'idle' | 'copied' | 'error'
  const codeRef = useRef(null)

  const isValidClassName = IDENTIFIER_PATTERN.test(className)
  const effectiveClassName = isValidClassName ? className : 'Screen'
  // generateScreenClass throws for an element a component's generateCode
  // doesn't (yet) support — e.g. a ProgressBar using segments/striped/an
  // icon, or any type with no generateCode at all — rather than silently
  // exporting something that doesn't match the canvas. useMemo doesn't
  // catch that on its own, so it's caught here instead of crashing the
  // whole modal (or the app, absent an error boundary).
  const { code, error } = useMemo(() => {
    try {
      return { code: generateScreenClass(elements, effectiveClassName), error: null }
    } catch (thrown) {
      return { code: '', error: thrown.message }
    }
  }, [elements, effectiveClassName])

  // The Clipboard API can throw for reasons outside our control (denied
  // permission, insecure context, an unfocused document) — fall back to
  // selecting the code so the user can still copy it with Cmd/Ctrl+C
  // instead of the button silently doing nothing.
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopyState('copied')
    } catch {
      const range = document.createRange()
      range.selectNodeContents(codeRef.current)
      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
      setCopyState('error')
    }
    setTimeout(() => setCopyState('idle'), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/javascript' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${effectiveClassName}.js`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="export-modal__backdrop" onClick={onClose}>
      <div className="export-modal" onClick={(event) => event.stopPropagation()}>
        <div className="export-modal__header">
          <label className="export-modal__name-field">
            Nom de la classe
            <input
              type="text"
              value={className}
              onChange={(event) => setClassName(event.target.value)}
            />
          </label>
          <button type="button" className="export-modal__close" onClick={onClose}>
            ×
          </button>
        </div>

        {!isValidClassName && (
          <p className="export-modal__error">
            Nom invalide (identifiant JS requis) — exporté comme "Screen" pour l'instant
          </p>
        )}

        {error ? (
          <p className="export-modal__error">Export impossible : {error}</p>
        ) : (
          <pre className="export-modal__code">
            <code ref={codeRef}>{code}</code>
          </pre>
        )}

        {copyState === 'error' && (
          <p className="export-modal__error">
            Copie automatique impossible ici — code sélectionné, utilise Cmd/Ctrl+C
          </p>
        )}

        <div className="export-modal__actions">
          <button type="button" onClick={handleCopy} disabled={!!error}>
            {copyState === 'copied' ? 'Copié !' : 'Copier'}
          </button>
          <button type="button" onClick={handleDownload} disabled={!!error}>
            Télécharger .js
          </button>
        </div>
      </div>
    </div>
  )
}
