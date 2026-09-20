import Phaser from 'phaser'
import { componentLibrary } from '../library/registry'

const SELECTION_COLOR = 0x60a5fa

// Editing surface: a real Phaser scene, so whatever renders here is pixel-identical
// to what the exported UI will look like in the actual game.
export class EditorScene extends Phaser.Scene {
  constructor() {
    super('EditorScene')
    // Placed elements on the current screen: { id, type, props, gameObject }.
    // The generic list all future features (selection, properties panel,
    // code generation) will read from and write to.
    this.elements = []
    this.selectedId = null
  }

  create() {
    const { width, height } = this.scale

    const background = this.add
      .rectangle(0, 0, width, height, 0x1d1f27)
      .setOrigin(0)
    background.setInteractive()

    this.add
      .text(8, 8, `${width}×${height}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#4b5563',
      })
      .setOrigin(0)

    this.selectionGraphics = this.add.graphics()
    this.selectionGraphics.setDepth(10000)

    // Clicking an element selects it; clicking anything else (background) deselects.
    this.input.on('gameobjectdown', (_pointer, gameObject) => {
      const elementId = gameObject.getData('elementId')
      if (elementId) {
        this.selectElement(elementId)
      } else {
        this.deselectElement()
      }
    })

    // Demo instance to prove the library → addElement → render pipeline works.
    this.addElement('panel', {
      x: width / 2,
      y: height / 2,
      width: 400,
      height: 250,
      originX: 0.5,
      originY: 0.5,
    })
  }

  // Instantiates a real Phaser GameObject for the given library component type
  // and tracks it as an element of the current screen.
  addElement(type, props = {}) {
    const definition = componentLibrary.find((component) => component.type === type)
    if (!definition) {
      throw new Error(`Unknown component type: "${type}"`)
    }

    const gameObject = definition.create(this, props)
    const id = crypto.randomUUID()
    gameObject.setData('elementId', id)
    gameObject.setData('elementType', type)
    if (typeof gameObject.setInteractive === 'function') {
      gameObject.setInteractive({ useHandCursor: true })
    }

    const element = { id, type, props, gameObject }
    this.elements.push(element)
    return element
  }

  removeElement(id) {
    const index = this.elements.findIndex((element) => element.id === id)
    if (index === -1) return

    if (id === this.selectedId) {
      this.deselectElement()
    }

    const [element] = this.elements.splice(index, 1)
    element.gameObject.destroy()
  }

  selectElement(id) {
    this.selectedId = id
    this.drawSelection()
  }

  deselectElement() {
    this.selectedId = null
    this.selectionGraphics.clear()
  }

  drawSelection() {
    const element = this.elements.find((el) => el.id === this.selectedId)
    this.selectionGraphics.clear()
    if (!element) return

    const bounds = element.gameObject.getBounds()
    this.selectionGraphics.lineStyle(2, SELECTION_COLOR, 1)
    this.selectionGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
  }
}
