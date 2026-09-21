import { useState } from 'react'
import './LayersPanel.css'

// Lists placed elements as a tree: top-level elements front-to-back (top of
// the list = frontmost, like Figma), with a group's children indented
// beneath it when expanded. EditorScene.elements is a flat list with a
// parentId per element — this just groups them by that for display.
// Dragging among top-level siblings reorders them; dragging a group's child
// onto a top-level row extracts it out of its group at that position (see
// handleDrop) — any other cross-boundary drop isn't supported yet.
export function LayersPanel({ elements, selectedIds, onSelect, onReorder, onExtractChild }) {
  // Tracks *collapsed* groups rather than expanded ones, so a newly created
  // group (not in this set yet) starts expanded — you see what you just
  // grouped without an extra click.
  const [collapsedGroupIds, setCollapsedGroupIds] = useState(new Set())

  const childrenByParent = new Map()
  for (const element of elements) {
    if (!element.parentId) continue
    if (!childrenByParent.has(element.parentId)) childrenByParent.set(element.parentId, [])
    childrenByParent.get(element.parentId).push(element)
  }

  const roots = elements.filter((element) => !element.parentId)
  const rows = []
  for (const element of [...roots].reverse()) {
    rows.push({ element, depth: 0 })
    const children = childrenByParent.get(element.id)
    if (children && !collapsedGroupIds.has(element.id)) {
      for (const child of [...children].reverse()) {
        rows.push({ element: child, depth: 1 })
      }
    }
  }

  const toggleExpanded = (id) => {
    setCollapsedGroupIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleDragStart = (id) => (event) => {
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  // A drop is either a plain top-level reorder (existing behavior) or a
  // "drag a child out of its group" — dropping a group's child onto a
  // top-level row extracts it and inserts it at that exact position, so
  // e.g. dragging a child above its own group's row turns it into a
  // standalone element sitting right there. Any other cross-boundary drop
  // (child onto a different group's child, top-level onto a child) isn't
  // supported yet and is ignored.
  const handleDrop = (targetId) => (event) => {
    event.preventDefault()
    const draggedId = event.dataTransfer.getData('text/plain')
    if (!draggedId || draggedId === targetId) return

    const draggedElement = elements.find((element) => element.id === draggedId)
    const targetElement = elements.find((element) => element.id === targetId)
    if (!draggedElement || !targetElement) return

    const isExtraction = draggedElement.parentId && !targetElement.parentId
    if (!isExtraction && (draggedElement.parentId || targetElement.parentId)) return

    const backToFront = elements.map((element) => element.id)
    const withoutDragged = backToFront.filter((id) => id !== draggedId)
    const targetIndex = withoutDragged.indexOf(targetId)
    withoutDragged.splice(targetIndex, 0, draggedId)

    if (isExtraction) {
      onExtractChild(draggedId, withoutDragged)
    } else {
      onReorder(withoutDragged)
    }
  }

  return (
    <div className="layers-panel">
      <h2 className="layers-panel__title">Calques</h2>
      {elements.length === 0 ? (
        <p className="layers-panel__empty">Aucun calque</p>
      ) : (
        <ul className="layers-panel__list">
          {rows.map(({ element, depth }) => {
            const isGroup = element.type === 'group'
            const hasChildren = childrenByParent.has(element.id)

            return (
              <li
                key={element.id}
                draggable
                onDragStart={handleDragStart(element.id)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(element.id)}
                onClick={(event) => onSelect(element.id, { additive: event.shiftKey })}
                className={
                  'layers-panel__item' +
                  (isGroup ? ' layers-panel__item--group' : '') +
                  (selectedIds.includes(element.id) ? ' layers-panel__item--selected' : '')
                }
                style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
              >
                {hasChildren && (
                  <button
                    type="button"
                    className="layers-panel__toggle"
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleExpanded(element.id)
                    }}
                  >
                    {collapsedGroupIds.has(element.id) ? '▸' : '▾'}
                  </button>
                )}
                {element.props.name}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
