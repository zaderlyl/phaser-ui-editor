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
  onReplaceImage,
  onSetProgressBarIcon,
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

  const handleStrokeColorChange = (event) => {
    onChange(id, { strokeColor: hexToColorNumber(event.target.value) })
  }

  const handleHoverColorChange = (event) => {
    onChange(id, { hoverColor: hexToColorNumber(event.target.value) })
  }

  const handleHoverStrokeColorChange = (event) => {
    onChange(id, { hoverStrokeColor: hexToColorNumber(event.target.value) })
  }

  const handlePressedColorChange = (event) => {
    onChange(id, { pressedColor: hexToColorNumber(event.target.value) })
  }

  const handlePressedStrokeColorChange = (event) => {
    onChange(id, { pressedStrokeColor: hexToColorNumber(event.target.value) })
  }

  const handleBackgroundColorChange = (event) => {
    onChange(id, { backgroundColor: hexToColorNumber(event.target.value) })
  }

  const handleFillColorChange = (event) => {
    onChange(id, { fillColor: hexToColorNumber(event.target.value) })
  }

  const handleFillColorLowChange = (event) => {
    onChange(id, { fillColorLow: hexToColorNumber(event.target.value) })
  }

  const handleFillGradientEndChange = (event) => {
    onChange(id, { fillGradientEnd: hexToColorNumber(event.target.value) })
  }

  const handleLabelColorChange = (event) => {
    onChange(id, { labelColor: hexToColorNumber(event.target.value) })
  }

  const handleLabelFormatChange = (value) => () => {
    onChange(id, { labelFormat: value })
  }

  const handleTextChange = (event) => {
    onChange(id, { text: event.target.value })
  }

  const handleCallbackChange = (event) => {
    onChange(id, { callback: event.target.value })
  }

  const handleHoverCallbackChange = (event) => {
    onChange(id, { hoverCallback: event.target.value })
  }

  const handleHoverOutCallbackChange = (event) => {
    onChange(id, { hoverOutCallback: event.target.value })
  }

  const handleCheckboxChange = (key) => (event) => {
    onChange(id, { [key]: event.target.checked })
  }

  const handleAlignChange = (value) => () => {
    onChange(id, { align: value })
  }

  const handleVerticalAlignChange = (value) => () => {
    onChange(id, { verticalAlign: value })
  }

  const handleOrientationChange = (value) => () => {
    onChange(id, { orientation: value })
  }

  const handleDirectionChange = (value) => () => {
    onChange(id, { direction: value })
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

      {'callback' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Callback (clic)</span>
          <input type="text" value={props.callback} onChange={handleCallbackChange} />
        </div>
      )}

      {'hoverCallback' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Callback (survol)</span>
          <input
            type="text"
            placeholder="(optionnel)"
            value={props.hoverCallback}
            onChange={handleHoverCallbackChange}
          />
        </div>
      )}

      {'hoverOutCallback' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Callback (fin survol)</span>
          <input
            type="text"
            placeholder="(optionnel)"
            value={props.hoverOutCallback}
            onChange={handleHoverOutCallbackChange}
          />
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

      {'bold' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Style</span>
          <div className="properties-panel__row">
            <label className="properties-panel__checkbox">
              <input type="checkbox" checked={props.bold} onChange={handleCheckboxChange('bold')} />
              Gras
            </label>
            <label className="properties-panel__checkbox">
              <input
                type="checkbox"
                checked={props.italic}
                onChange={handleCheckboxChange('italic')}
              />
              Italique
            </label>
          </div>
        </div>
      )}

      {'align' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Alignement</span>
          <div className="properties-panel__row">
            {[
              { value: 'left', label: 'Gauche' },
              { value: 'center', label: 'Centre' },
              { value: 'right', label: 'Droite' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={handleAlignChange(value)}
                className={props.align === value ? 'properties-panel__row-button--active' : ''}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {'verticalAlign' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Alignement vertical</span>
          <div className="properties-panel__row">
            {[
              { value: 'top', label: 'Haut' },
              { value: 'middle', label: 'Centre' },
              { value: 'bottom', label: 'Bas' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={handleVerticalAlignChange(value)}
                className={
                  props.verticalAlign === value ? 'properties-panel__row-button--active' : ''
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {'padding' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Padding</span>
          <input
            type="number"
            min="0"
            value={props.padding}
            onChange={handleNumberChange('padding')}
          />
        </div>
      )}

      {'textureKey' in props && (
        <button
          type="button"
          className="properties-panel__group-button"
          onClick={() => onReplaceImage(id)}
        >
          Changer l'image
        </button>
      )}

      {'minValue' in props && 'maxValue' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Plage</span>
          <div className="properties-panel__row">
            <label>
              Min
              <input
                type="number"
                value={props.minValue}
                onChange={handleNumberChange('minValue')}
              />
            </label>
            <label>
              Max
              <input
                type="number"
                value={props.maxValue}
                onChange={handleNumberChange('maxValue')}
              />
            </label>
          </div>
        </div>
      )}

      {'value' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Valeur</span>
          <input
            type="number"
            min={props.minValue ?? 0}
            max={props.maxValue ?? 100}
            value={props.value}
            onChange={handleNumberChange('value')}
          />
        </div>
      )}

      {'backgroundColor' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Couleur de fond</span>
          <input
            type="color"
            value={colorNumberToHex(props.backgroundColor)}
            onChange={handleBackgroundColorChange}
          />
        </div>
      )}

      {'fillColor' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Couleur de remplissage</span>
          <input
            type="color"
            value={colorNumberToHex(props.fillColor)}
            onChange={handleFillColorChange}
          />
        </div>
      )}

      {'fillGradientEnd' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Dégradé (fin)</span>
          <input
            type="color"
            value={colorNumberToHex(props.fillGradientEnd)}
            onChange={handleFillGradientEndChange}
          />
        </div>
      )}

      {'fillColorLow' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Couleur si valeur basse</span>
          <div className="properties-panel__row">
            <label>
              Seuil (%)
              <input
                type="number"
                min="0"
                max="100"
                value={props.lowThreshold}
                onChange={handleNumberChange('lowThreshold')}
              />
            </label>
            <label>
              Couleur
              <input
                type="color"
                value={colorNumberToHex(props.fillColorLow)}
                onChange={handleFillColorLowChange}
              />
            </label>
          </div>
        </div>
      )}

      {'showLabel' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Texte</span>
          <label className="properties-panel__checkbox">
            <input
              type="checkbox"
              checked={props.showLabel}
              onChange={handleCheckboxChange('showLabel')}
            />
            Afficher un texte sur la barre
          </label>
        </div>
      )}

      {'labelFormat' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Format du texte</span>
          <div className="properties-panel__row">
            {[
              { value: 'percent', label: 'Pourcentage' },
              { value: 'value', label: 'Valeur' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={handleLabelFormatChange(value)}
                className={props.labelFormat === value ? 'properties-panel__row-button--active' : ''}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {'labelColor' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Couleur du texte</span>
          <input
            type="color"
            value={colorNumberToHex(props.labelColor)}
            onChange={handleLabelColorChange}
          />
        </div>
      )}

      {'labelFontSize' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Taille du texte</span>
          <input
            type="number"
            min="1"
            value={props.labelFontSize}
            onChange={handleNumberChange('labelFontSize')}
          />
        </div>
      )}

      {'orientation' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Orientation</span>
          <div className="properties-panel__row">
            {[
              { value: 'horizontal', label: 'Horizontale' },
              { value: 'vertical', label: 'Verticale' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={handleOrientationChange(value)}
                className={
                  props.orientation === value ? 'properties-panel__row-button--active' : ''
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {'direction' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Sens de remplissage</span>
          <div className="properties-panel__row">
            {[
              { value: 'normal', label: 'Normal' },
              { value: 'reversed', label: 'Inversé' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={handleDirectionChange(value)}
                className={props.direction === value ? 'properties-panel__row-button--active' : ''}
              >
                {label}
              </button>
            ))}
          </div>
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

      {'strokeThickness' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Contour</span>
          <div className="properties-panel__row">
            <label>
              Épaisseur
              <input
                type="number"
                min="0"
                value={props.strokeThickness}
                onChange={handleNumberChange('strokeThickness')}
              />
            </label>
            <label>
              Couleur
              <input
                type="color"
                value={colorNumberToHex(props.strokeColor)}
                onChange={handleStrokeColorChange}
              />
            </label>
          </div>
        </div>
      )}

      {'cornerRadius' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Coins arrondis</span>
          <input
            type="number"
            min="0"
            value={Math.round(props.cornerRadius)}
            onChange={handleNumberChange('cornerRadius')}
          />
        </div>
      )}

      {'segments' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Segments</span>
          <div className="properties-panel__row">
            <label>
              Nombre
              <input
                type="number"
                min="0"
                value={props.segments}
                onChange={handleNumberChange('segments')}
              />
            </label>
            <label>
              Espacement
              <input
                type="number"
                min="0"
                value={props.segmentGap}
                onChange={handleNumberChange('segmentGap')}
              />
            </label>
          </div>
        </div>
      )}

      {'iconStartKey' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Icônes</span>
          <div className="properties-panel__row">
            <button type="button" onClick={() => onSetProgressBarIcon(id, 'Start')}>
              {props.iconStartKey ? "Changer l'icône (début)" : 'Icône (début)'}
            </button>
            <button type="button" onClick={() => onSetProgressBarIcon(id, 'End')}>
              {props.iconEndKey ? "Changer l'icône (fin)" : 'Icône (fin)'}
            </button>
          </div>
          <div className="properties-panel__row">
            <label>
              Taille
              <input
                type="number"
                min="1"
                value={props.iconSize}
                onChange={handleNumberChange('iconSize')}
              />
            </label>
            <label>
              Espacement
              <input
                type="number"
                min="0"
                value={props.iconGap}
                onChange={handleNumberChange('iconGap')}
              />
            </label>
          </div>
        </div>
      )}

      {'hoverColor' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Couleur (survol)</span>
          <div className="properties-panel__row">
            <label>
              Fond
              <input
                type="color"
                value={colorNumberToHex(props.hoverColor)}
                onChange={handleHoverColorChange}
              />
            </label>
            <label>
              Contour
              <input
                type="color"
                value={colorNumberToHex(props.hoverStrokeColor)}
                onChange={handleHoverStrokeColorChange}
              />
            </label>
          </div>
        </div>
      )}

      {'pressedColor' in props && (
        <div className="properties-panel__group">
          <span className="properties-panel__group-label">Couleur (clic)</span>
          <div className="properties-panel__row">
            <label>
              Fond
              <input
                type="color"
                value={colorNumberToHex(props.pressedColor)}
                onChange={handlePressedColorChange}
              />
            </label>
            <label>
              Contour
              <input
                type="color"
                value={colorNumberToHex(props.pressedStrokeColor)}
                onChange={handlePressedStrokeColorChange}
              />
            </label>
          </div>
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
