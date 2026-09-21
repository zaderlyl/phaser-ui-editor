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

  // dataTransfer.getData() is only readable in 'dragstart' and 'drop' (most
  // browsers return "" from 'dragover' for security reasons), but the
  // placement indicator needs to know what's being dragged on every
  // 'dragover' tick — so the dragged id is tracked in state instead, set at
  // dragstart and read back for both the indicator and the eventual drop.
  const [draggedId, setDraggedId] = useState(null)
  // Which row the pointer is currently over, and which half of it — drawn
  // as a line above/below that row so it's clear exactly where the dragged
  // item will land before it's dropped.
  const [dropTarget, setDropTarget] = useState(null)

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
    setDraggedId(id)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDropTarget(null)
  }

  // Same eligibility rule handleDrop enforces: a plain top-level reorder,
  // or a group's child dropped onto a top-level row (extracting it) — any
  // other combination (child onto a different child, top-level onto a
  // child) isn't supported yet.
  const canDropOn = (targetId) => {
    if (!draggedId || draggedId === targetId) return false
    const draggedElement = elements.find((element) => element.id === draggedId)
    const targetElement = elements.find((element) => element.id === targetId)
    if (!draggedElement || !targetElement) return false

    const isExtraction = draggedElement.parentId && !targetElement.parentId
    return isExtraction || (!draggedElement.parentId && !targetElement.parentId)
  }

  // Splits the hovered row in half so the indicator (and the eventual
  // drop) lands on whichever side of it the pointer is actually closer to,
  // instead of always inserting on one fixed side.
  const handleDragOver = (targetId) => (event) => {
    if (!canDropOn(targetId)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'

    const rect = event.currentTarget.getBoundingClientRect()
    const edge = event.clientY - rect.top < rect.height / 2 ? 'top' : 'bottom'
    setDropTarget((current) =>
      current?.id === targetId && current?.edge === edge ? current : { id: targetId, edge },
    )
  }

  const handleDragLeave = (targetId) => (event) => {
    // A dragleave fires when the pointer moves onto a child element of the
    // row too (e.g. the collapse toggle) — only clear the indicator when
    // it's actually leaving the row itself, or it flickers.
    if (event.currentTarget.contains(event.relatedTarget)) return
    setDropTarget((current) => (current?.id === targetId ? null : current))
  }

  // A drop is either a plain top-level reorder (existing behavior) or a
  // "drag a child out of its group" — dropping a group's child onto a
  // top-level row extracts it and inserts it at that exact position, so
  // e.g. dragging a child above its own group's row turns it into a
  // standalone element sitting right there. Which edge of the target row
  // it was dropped on (see handleDragOver) decides whether it lands right
  // before or right after the target.
  const handleDrop = (targetId) => (event) => {
    event.preventDefault()
    const edge = dropTarget?.id === targetId ? dropTarget.edge : 'bottom'
    setDraggedId(null)
    setDropTarget(null)

    if (!canDropOn(targetId)) return
    const draggedElement = elements.find((element) => element.id === draggedId)
    const targetElement = elements.find((element) => element.id === targetId)
    const isExtraction = draggedElement.parentId && !targetElement.parentId

    const backToFront = elements.map((element) => element.id)
    const withoutDragged = backToFront.filter((id) => id !== draggedId)
    const targetIndex = withoutDragged.indexOf(targetId)
    // Rows render frontmost-first (top of the list), the reverse of
    // this back-to-front array — so landing *above* the target row means a
    // *higher* array index (right after it here), and *below* means a
    // lower one (right before it, the array's existing default).
    const insertIndex = edge === 'top' ? targetIndex + 1 : targetIndex
    withoutDragged.splice(insertIndex, 0, draggedId)

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
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver(element.id)}
                onDragLeave={handleDragLeave(element.id)}
                onDrop={handleDrop(element.id)}
                onClick={(event) => onSelect(element.id, { additive: event.shiftKey })}
                className={
                  'layers-panel__item' +
                  (isGroup ? ' layers-panel__item--group' : '') +
                  (selectedIds.includes(element.id) ? ' layers-panel__item--selected' : '') +
                  (draggedId === element.id ? ' layers-panel__item--dragging' : '') +
                  (dropTarget?.id === element.id ? ` layers-panel__item--drop-${dropTarget.edge}` : '')
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
