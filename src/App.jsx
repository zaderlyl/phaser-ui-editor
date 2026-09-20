import { PhaserCanvas } from './editor/PhaserCanvas'
import { LibraryPanel } from './editor/library/LibraryPanel'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">Phaser UI Editor</header>
      <div className="app-body">
        <LibraryPanel />
        <main className="app-main">
          <PhaserCanvas />
        </main>
      </div>
    </div>
  )
}

export default App
