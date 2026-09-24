import { useCallback, useRef, useState } from 'react'
import { PhaserCanvas } from './editor/PhaserCanvas'
import { LibraryPanel } from './editor/library/LibraryPanel'
import { LayersPanel } from './editor/layers/LayersPanel'
import { PropertiesPanel } from './editor/properties/PropertiesPanel'
import { ExportModal } from './editor/export/ExportModal'
import { StatePreviewModal } from './editor/preview/StatePreviewModal'
import './App.css'

function App() {
  const sceneRef = useRef(null)
  // Always an array — 0, 1 or several selected elements (shift-click).
  const [selectedElements, setSelectedElements] = useState([])
  const [elements, setElements] = useState([])
  const [isExportOpen, setExportOpen] = useState(false)
  // The specific element to preview, snapshotted at the moment "Aperçu
  // des états" was clicked — not just "the current selection", since the
  // selection could change while the modal stays open.
  const [previewElement, setPreviewElement] = useState(null)

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

  const handleDeleteSelected = useCallback(() => {
    sceneRef.current?.removeSelectedElements()
  }, [])

  const handleSelect = useCallback((id, options) => {
    sceneRef.current?.selectElement(id, options)
  }, [])

  const handleReorder = useCallback((orderedIds) => {
    sceneRef.current?.reorderElements(orderedIds)
  }, [])

  const handleExtractChild = useCallback((childId, orderedIds) => {
    sceneRef.current?.extractChildToPosition(childId, orderedIds)
  }, [])

  const handleAlign = useCallback((mode) => {
    sceneRef.current?.alignSelected(mode)
  }, [])

  const handleGroup = useCallback(() => {
    sceneRef.current?.groupSelected()
  }, [])

  const handleUngroup = useCallback(() => {
    sceneRef.current?.ungroupSelected()
  }, [])

  const handleLinkAsStates = useCallback(() => {
    sceneRef.current?.linkAsStates()
  }, [])

  const handleAssignStateRole = useCallback((id, childId, role) => {
    sceneRef.current?.assignStateRole(id, childId, role)
  }, [])

  const handleReplaceImage = useCallback((id) => {
    sceneRef.current?.requestImageReplace(id)
  }, [])

  const handleSetProgressBarIcon = useCallback((id, slot) => {
    sceneRef.current?.requestProgressBarIcon(id, slot)
  }, [])

  const handleSetImageButtonTexture = useCallback((id, slot) => {
    sceneRef.current?.requestImageButtonTexture(id, slot)
  }, [])

  const handleOpenStatePreview = useCallback((element, children = []) => {
    setPreviewElement({ ...element, children })
  }, [])

  // Live position/size/name updates from a single-element drag, resize or
  // rename (see EditorScene's 'elementchange') only ever concern the one
  // element currently selected, so just refresh it in place.
  const handleElementChange = useCallback((snapshot) => {
    setSelectedElements(snapshot ? [snapshot] : [])
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
            selectedIds={selectedElements.map((element) => element.id)}
            onSelect={handleSelect}
            onReorder={handleReorder}
            onExtractChild={handleExtractChild}
          />
        </div>
        <main className="app-main">
          <PhaserCanvas
            onSceneReady={handleSceneReady}
            onSelectionChange={setSelectedElements}
            onElementChange={handleElementChange}
            onElementsChange={setElements}
          />
        </main>
        <PropertiesPanel
          elements={selectedElements}
          allElements={elements}
          onChange={handlePropertyChange}
          onRename={handleRename}
          onDelete={handleDelete}
          onDeleteSelected={handleDeleteSelected}
          onAlign={handleAlign}
          onGroup={handleGroup}
          onUngroup={handleUngroup}
          onLinkAsStates={handleLinkAsStates}
          onAssignStateRole={handleAssignStateRole}
          onReplaceImage={handleReplaceImage}
          onSetProgressBarIcon={handleSetProgressBarIcon}
          onSetImageButtonTexture={handleSetImageButtonTexture}
          onOpenStatePreview={handleOpenStatePreview}
        />
      </div>

      {isExportOpen && <ExportModal elements={elements} onClose={() => setExportOpen(false)} />}
      {previewElement && (
        <StatePreviewModal element={previewElement} onClose={() => setPreviewElement(null)} />
      )}
    </div>
  )
}

export default App
