import Phaser from 'phaser'
import { componentLibrary } from '../library/registry'

// Editing surface: a real Phaser scene, so whatever renders here is pixel-identical
// to what the exported UI will look like in the actual game.
export class EditorScene extends Phaser.Scene {
  constructor() {
    super('EditorScene')
    // Placed elements on the current screen: { id, type, props, gameObject }.
    // The generic list all future features (selection, properties panel,
    // code generation) will read from and write to.
    this.elements = []
  }

  create() {
    const { width, height } = this.scale

    this.add
      .rectangle(0, 0, width, height, 0x1d1f27)
      .setOrigin(0)

    this.add
      .text(width / 2, height / 2, `Editor canvas — ${width}×${height}`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#6b7280',
      })
      .setOrigin(0.5)
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

    const element = { id, type, props, gameObject }
    this.elements.push(element)
    return element
  }

  removeElement(id) {
    const index = this.elements.findIndex((element) => element.id === id)
    if (index === -1) return

    const [element] = this.elements.splice(index, 1)
    element.gameObject.destroy()
  }
}
