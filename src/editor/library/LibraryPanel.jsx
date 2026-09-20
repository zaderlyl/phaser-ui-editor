import { componentLibrary } from './registry'
import './LibraryPanel.css'

// Sidebar listing draggable component types. Empty until concrete components
// (Panel, Texte, Image, ...) register themselves in the library.
export function LibraryPanel() {
  return (
    <aside className="library-panel">
      <h2 className="library-panel__title">Composants</h2>
      {componentLibrary.length === 0 ? (
        <p className="library-panel__empty">Aucun composant pour le moment</p>
      ) : (
        <ul className="library-panel__list">
          {componentLibrary.map((component) => (
            <li key={component.type}>{component.label}</li>
          ))}
        </ul>
      )}
    </aside>
  )
}
