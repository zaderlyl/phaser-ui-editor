import { useState } from 'react'
import './PropertiesPanel.css'

function colorNumberToHex(value) {
  return `#${value.toString(16).padStart(6, '0')}`
}

function hexToColorNumber(hex) {
  return Number.parseInt(hex.slice(1), 16)
}

// Name/position/size/color editor for the selection. Position, size and
// color edits flow through EditorScene.updateElementProps, which re-renders
// the GameObject and emits the updated snapshot back — so the canvas stays
// the source of truth and this panel just reflects it. With zero elements
// selected it shows an empty state; with exactly one, the full field set;
// with several, a lighter view (count + align tools + bulk delete), since
// there's no single coherent set of fields to edit across different
// elements yet.
export function PropertiesPanel({
  elements,
  onChange,
  onRename,
  onDelete,
  onDeleteSelected,
  onAlign,
  onGroup,
  onUngroup,
}) {
  const single = elements.length === 1 ? elements[0] : null

  // Reset the name draft during render when the selection changes (the
  // React-documented way to adjust state from a prop change without the
  // extra render pass an effect would cost here).
  const [trackedId, setTrackedId] = useState(single?.id)
  const [nameDraft, setNameDraft] = useState(single?.props.name ?? '')
  const [nameError, setNameError] = useState(null)

  if (single?.id !== trackedId) {
    setTrackedId(single?.id)
    setNameDraft(single?.props.name ?? '')
    setNameError(null)
  }

  if (elements.length === 0) {
    return (
      <aside className="properties-panel">
        <h2 className="properties-panel__title">Propriétés</h2>
        <p className="properties-panel__empty">Aucun élément sélectionné</p>
      </aside>
    )
  }

  if (elements.length > 1) {
    return (
      <aside className="properties-panel">
        <h2 className="properties-panel__title">Propriétés</h2>
        <p className="properties-panel__multi-count">{elements.length} éléments sélectionnés</p>

        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Aligner horizontalement</span>
          <div className="properties-panel__row">
            <button type="button" onClick={() => onAlign('left')}>
              Gauche
            </button>
            <button type="button" onClick={() => onAlign('centerH')}>
              Centre
            </button>
            <button type="button" onClick={() => onAlign('right')}>
              Droite
            </button>
          </div>
        </div>

        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Aligner verticalement</span>
          <div className="properties-panel__row">
            <button type="button" onClick={() => onAlign('top')}>
              Haut
            </button>
            <button type="button" onClick={() => onAlign('centerV')}>
              Centre
            </button>
            <button type="button" onClick={() => onAlign('bottom')}>
              Bas
            </button>
          </div>
        </div>

        <button type="button" className="properties-panel__group-button" onClick={onGroup}>
          Grouper (⌘G)
        </button>

        <button type="button" className="properties-panel__delete" onClick={onDeleteSelected}>
          Supprimer ({elements.length})
        </button>
      </aside>
    )
  }

  const { id, props } = single

  const handleNameChange = (event) => {
    const value = event.target.value
    setNameDraft(value)
    const result = onRename(id, value)
    setNameError(result.success ? null : result.error)
  }

  const handleNumberChange = (key) => (event) => {
    const value = Number(event.target.value)
    if (Number.isNaN(value)) return
    onChange(id, { [key]: value })
  }

  const handleColorChange = (event) => {
    onChange(id, { color: hexToColorNumber(event.target.value) })
  }

  const handleTextChange = (event) => {
    onChange(id, { text: event.target.value })
  }

  return (
    <aside className="properties-panel">
      <h2 className="properties-panel__title">Propriétés</h2>

      <div className="properties-panel__group">
        <span className="properties-panel__group-label">Nom</span>
        <input
          type="text"
          value={nameDraft}
          onChange={handleNameChange}
          className={nameError ? 'properties-panel__input--error' : ''}
        />
        {nameError && <p className="properties-panel__error">{nameError}</p>}
      </div>

      <div className="properties-panel__group">
        <span className="properties-panel__group-label">Position</span>
        <div className="properties-panel__row">
          <label>
            X
            <input type="number" value={Math.round(props.x)} onChange={handleNumberChange('x')} />
          </label>
          <label>
            Y
            <input type="number" value={Math.round(props.y)} onChange={handleNumberChange('y')} />
          </label>
        </div>
      </div>

      {'text' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Contenu</span>
          <textarea value={props.text} onChange={handleTextChange} rows={3} />
        </div>
      )}

      {'fontSize' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Taille de police</span>
          <input
            type="number"
            min="1"
            value={props.fontSize}
            onChange={handleNumberChange('fontSize')}
          />
        </div>
      )}

      {'width' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Taille</span>
          <div className="properties-panel__row">
            <label>
              L
              <input
                type="number"
                min="1"
                value={Math.round(props.width)}
                onChange={handleNumberChange('width')}
              />
            </label>
            <label>
              H
              <input
                type="number"
                min="1"
                value={Math.round(props.height)}
                onChange={handleNumberChange('height')}
              />
            </label>
          </div>
        </div>
      )}

      {'color' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Couleur</span>
          <input type="color" value={colorNumberToHex(props.color)} onChange={handleColorChange} />
        </div>
      )}

      {single.type === 'group' && (
        <button type="button" className="properties-panel__group-button" onClick={onUngroup}>
          Dégrouper (⌘⇧G)
        </button>
      )}

      {single.parentId && (
        <button type="button" className="properties-panel__group-button" onClick={onUngroup}>
          Sortir du groupe (⌘⇧G)
        </button>
      )}

      <button type="button" className="properties-panel__delete" onClick={() => onDelete(id)}>
        Supprimer
      </button>
    </aside>
  )
}
