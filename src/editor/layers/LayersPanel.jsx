import { useState } from 'react'
import './LayersPanel.css'

// Lists placed elements as a tree: top-level elements front-to-back (top of
// the list = frontmost, like Figma), with a group's children indented
// beneath it when expanded. EditorScene.elements is a flat list with a
// parentId per element — this just groups them by that for display; reorder
// (drag) still only operates on top-level siblings for now, dragging a
// child within/out of its group isn't supported yet.
export function LayersPanel({ elements, selectedIds, onSelect, onReorder }) {
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
          {rows.map(({ element, depth }) => {
            const isGroup = element.type === 'group'
            const hasChildren = childrenByParent.has(element.id)
            const isTopLevel = depth === 0

            return (
              <li
                key={element.id}
                draggable={isTopLevel}
                onDragStart={isTopLevel ? handleDragStart(element.id) : undefined}
                onDragOver={isTopLevel ? handleDragOver : undefined}
                onDrop={isTopLevel ? handleDrop(element.id) : undefined}
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
