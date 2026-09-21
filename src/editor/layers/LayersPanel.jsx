import './LayersPanel.css'

// Lists placed elements front-to-back (top of the list = frontmost, like
// Figma), lets you select one by clicking it, and reorder depth by dragging
// a row onto another. EditorScene.elements is the source of truth for
// order (back to front); dropping onto a row places the dragged element
// just behind it in that order.
export function LayersPanel({ elements, selectedIds, onSelect, onReorder }) {
  const frontToBack = [...elements].reverse()

  const handleDragStart = (id) => (event) => {
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (targetId) => (event) => {
    event.preventDefault()
    const draggedId = event.dataTransfer.getData('text/plain')
    if (!draggedId || draggedId === targetId) return

    const backToFront = elements.map((element) => element.id)
    const withoutDragged = backToFront.filter((id) => id !== draggedId)
    const targetIndex = withoutDragged.indexOf(targetId)
    withoutDragged.splice(targetIndex, 0, draggedId)
    onReorder(withoutDragged)
  }

  return (
    <div className="layers-panel">
      <h2 className="layers-panel__title">Calques</h2>
      {elements.length === 0 ? (
        <p className="layers-panel__empty">Aucun calque</p>
      ) : (
        <ul className="layers-panel__list">
          {frontToBack.map((element) => (
            <li
              key={element.id}
              draggable
              onDragStart={handleDragStart(element.id)}
              onDragOver={handleDragOver}
              onDrop={handleDrop(element.id)}
              onClick={() => onSelect(element.id)}
              className={
                'layers-panel__item' +
                (selectedIds.includes(element.id) ? ' layers-panel__item--selected' : '')
              }
            >
              {element.props.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
