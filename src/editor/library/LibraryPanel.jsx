import { componentLibrary } from './registry'
import './LibraryPanel.css'

// Sidebar listing draggable component types. Empty until concrete components
// (Panel, Texte, Image, ...) register themselves in the library. Each entry
// is a native HTML5 drag source; the component's type is the payload, read
// by PhaserCanvas's drop handler to place a real instance on the canvas.
export function LibraryPanel() {
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
          {componentLibrary.map((component) => (
            <li
              key={component.type}
              draggable
              onDragStart={handleDragStart(component.type)}
              className="library-panel__item"
            >
              {component.label}
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
