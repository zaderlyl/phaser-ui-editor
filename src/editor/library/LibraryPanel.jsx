import { componentLibrary } from './registry'
import './LibraryPanel.css'

// Sidebar listing draggable component types. Empty until concrete components
// (Panel, Texte, Image, ...) register themselves in the library. Each entry
// is a native HTML5 drag source; the component's type is the payload, read
// by PhaserCanvas's drop handler to place a real instance on the canvas.
//
// Tracé is the one exception: a pen tool has no single "drop position" the
// way every other component does (its points come from a series of later
// clicks, not the initial placement), so clicking it activates point-
// placement mode on the canvas instead of dragging a default shape onto it.
export function LibraryPanel({ onActivatePathTool }) {
  const handleDragStart = (type) => (event) => {
    event.dataTransfer.setData('text/plain', type)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <aside className="library-panel">
      <h2 className="library-panel__title">Composants</h2>
      {componentLibrary.length === 0 ? (
        <p className="library-panel__empty">Aucun composant pour le moment</p>
      ) : (
        <ul className="library-panel__list">
          {componentLibrary.map((component) =>
            component.type === 'path' ? (
              <li
                key={component.type}
                onClick={() => onActivatePathTool?.()}
                className="library-panel__item"
                title="Cliquer pour dessiner un tracé point par point"
              >
                {component.label}
              </li>
            ) : (
              <li
                key={component.type}
                draggable
                onDragStart={handleDragStart(component.type)}
                className="library-panel__item"
              >
                {component.label}
              </li>
            ),
          )}
        </ul>
      )}
    </aside>
  )
}
