import { useCallback, useRef, useState } from 'react'
import { PhaserCanvas } from './editor/PhaserCanvas'
import { LibraryPanel } from './editor/library/LibraryPanel'
import { LayersPanel } from './editor/layers/LayersPanel'
import { PropertiesPanel } from './editor/properties/PropertiesPanel'
import { ExportModal } from './editor/export/ExportModal'
import './App.css'

function App() {
  const sceneRef = useRef(null)
  const [selectedElement, setSelectedElement] = useState(null)
  const [elements, setElements] = useState([])
  const [isExportOpen, setExportOpen] = useState(false)

  const handleSceneReady = useCallback((scene) => {
    sceneRef.current = scene
  }, [])

  const handlePropertyChange = useCallback((id, patch) => {
    sceneRef.current?.updateElementProps(id, patch)
  }, [])

  const handleRename = useCallback((id, name) => {
    return sceneRef.current?.renameElement(id, name) ?? { success: false, error: 'Éditeur non prêt' }
  }, [])

  const handleDelete = useCallback((id) => {
    sceneRef.current?.removeElement(id)
  }, [])

  const handleSelect = useCallback((id) => {
    sceneRef.current?.selectElement(id)
  }, [])

  const handleReorder = useCallback((orderedIds) => {
    sceneRef.current?.reorderElements(orderedIds)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <span>Phaser UI Editor</span>
        <button type="button" className="app-header__export" onClick={() => setExportOpen(true)}>
          Exporter
        </button>
      </header>
      <div className="app-body">
        <div className="left-sidebar">
          <LibraryPanel />
          <LayersPanel
            elements={elements}
            selectedId={selectedElement?.id}
            onSelect={handleSelect}
            onReorder={handleReorder}
          />
        </div>
        <main className="app-main">
          <PhaserCanvas
            onSceneReady={handleSceneReady}
            onSelectionChange={setSelectedElement}
            onElementChange={setSelectedElement}
            onElementsChange={setElements}
          />
        </main>
        <PropertiesPanel
          element={selectedElement}
          onChange={handlePropertyChange}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      </div>

      {isExportOpen && <ExportModal elements={elements} onClose={() => setExportOpen(false)} />}
    </div>
  )
}

export default App
