import { useCallback, useRef, useState } from 'react'
import { PhaserCanvas } from './editor/PhaserCanvas'
import { LibraryPanel } from './editor/library/LibraryPanel'
import { PropertiesPanel } from './editor/properties/PropertiesPanel'
import './App.css'

function App() {
  const sceneRef = useRef(null)
  const [selectedElement, setSelectedElement] = useState(null)

  const handleSceneReady = useCallback((scene) => {
    sceneRef.current = scene
  }, [])

  const handlePropertyChange = useCallback((id, patch) => {
    sceneRef.current?.updateElementProps(id, patch)
  }, [])

  return (
    <div className="app">
      <header className="app-header">Phaser UI Editor</header>
      <div className="app-body">
        <LibraryPanel />
        <main className="app-main">
          <PhaserCanvas
            onSceneReady={handleSceneReady}
            onSelectionChange={setSelectedElement}
            onElementChange={setSelectedElement}
          />
        </main>
        <PropertiesPanel element={selectedElement} onChange={handlePropertyChange} />
      </div>
    </div>
  )
}

export default App
