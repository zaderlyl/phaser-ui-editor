import './PropertiesPanel.css'

function colorNumberToHex(value) {
  return `#${value.toString(16).padStart(6, '0')}`
}

function hexToColorNumber(hex) {
  return Number.parseInt(hex.slice(1), 16)
}

// Basic position/size/color editor for the selected element. Edits flow
// through EditorScene.updateElementProps, which re-renders the GameObject
// and emits the updated snapshot back — so the canvas stays the source of
// truth and this panel just reflects it.
export function PropertiesPanel({ element, onChange }) {
  if (!element) {
    return (
      <aside className="properties-panel">
        <h2 className="properties-panel__title">Propriétés</h2>
        <p className="properties-panel__empty">Aucun élément sélectionné</p>
      </aside>
    )
  }

  const { id, props } = element

  const handleNumberChange = (key) => (event) => {
    const value = Number(event.target.value)
    if (Number.isNaN(value)) return
    onChange(id, { [key]: value })
  }

  const handleColorChange = (event) => {
    onChange(id, { color: hexToColorNumber(event.target.value) })
  }

  return (
    <aside className="properties-panel">
      <h2 className="properties-panel__title">Propriétés</h2>

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

      <div className="properties-panel__group">
        <span className="properties-panel__group-label">Couleur</span>
        <input type="color" value={colorNumberToHex(props.color)} onChange={handleColorChange} />
      </div>
    </aside>
  )
}
