import { PhaserCanvas } from './editor/PhaserCanvas'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header">Phaser UI Editor</header>
      <main className="app-main">
        <PhaserCanvas />
      </main>
    </div>
  )
}

export default App
