import Phaser from 'phaser'
import { componentLibrary } from '../library/registry'

const SELECTION_COLOR = 0x60a5fa
const HANDLE_SIZE = 10
const MIN_ELEMENT_SIZE = 10
const CORNERS = ['tl', 'tr', 'bl', 'br']

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

    this.resizeHandles = CORNERS.map((corner) => {
      const handle = this.add
        .rectangle(0, 0, HANDLE_SIZE, HANDLE_SIZE, 0xffffff)
        .setStrokeStyle(1, SELECTION_COLOR)
        .setDepth(10001)
        .setVisible(false)
      handle.setData('isHandle', true)
      handle.setData('corner', corner)
      handle.setInteractive({ useHandCursor: true })
      handle.input.enabled = false
      this.input.setDraggable(handle)
      return handle
    })

    // Clicking an element selects it; clicking anything else (background) deselects.
    // Handles are editor chrome, not selectable/deselectable targets.
    this.input.on('gameobjectdown', (_pointer, gameObject) => {
      if (gameObject.getData('isHandle')) return

      const elementId = gameObject.getData('elementId')
      if (elementId) {
        this.selectElement(elementId)
      } else {
        this.deselectElement()
      }
    })

    // A handle drag starts from the corner opposite the one grabbed, so that
    // corner stays fixed in place while the grabbed one follows the pointer.
    this.input.on('dragstart', (_pointer, gameObject) => {
      if (!gameObject.getData('isHandle')) return

      const element = this.elements.find((el) => el.id === this.selectedId)
      if (!element) return

      const bounds = element.gameObject.getBounds()
      const corner = gameObject.getData('corner')
      gameObject.setData('fixedX', corner.includes('r') ? bounds.left : bounds.right)
      gameObject.setData('fixedY', corner.includes('b') ? bounds.top : bounds.bottom)
    })

    this.input.on('drag', (_pointer, gameObject, dragX, dragY) => {
      if (gameObject.getData('isHandle')) {
        this.resizeSelected(gameObject, dragX, dragY)
        return
      }

      // Dragging moves the element and keeps its stored props (and the
      // selection frame) in sync with its actual position.
      gameObject.x = dragX
      gameObject.y = dragY

      const element = this.elements.find((el) => el.gameObject === gameObject)
      if (element) {
        element.props.x = dragX
        element.props.y = dragY
      }

      this.drawSelection()
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
      this.input.setDraggable(gameObject)
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
    this.setHandlesVisible(false)
  }

  // Resizes the selected element so the dragged corner follows the pointer
  // while the opposite corner (captured on dragstart) stays fixed.
  resizeSelected(handle, dragX, dragY) {
    const element = this.elements.find((el) => el.id === this.selectedId)
    if (!element) return

    const fixedX = handle.getData('fixedX')
    const fixedY = handle.getData('fixedY')

    const left = Math.min(fixedX, dragX)
    const right = Math.max(fixedX, dragX)
    const top = Math.min(fixedY, dragY)
    const bottom = Math.max(fixedY, dragY)

    const width = Math.max(MIN_ELEMENT_SIZE, right - left)
    const height = Math.max(MIN_ELEMENT_SIZE, bottom - top)

    const { gameObject } = element
    gameObject.setSize(width, height)
    gameObject.x = left + gameObject.originX * width
    gameObject.y = top + gameObject.originY * height

    element.props.width = width
    element.props.height = height
    element.props.x = gameObject.x
    element.props.y = gameObject.y

    this.drawSelection()
  }

  drawSelection() {
    const element = this.elements.find((el) => el.id === this.selectedId)
    this.selectionGraphics.clear()

    if (!element) {
      this.setHandlesVisible(false)
      return
    }

    const bounds = element.gameObject.getBounds()
    this.selectionGraphics.lineStyle(2, SELECTION_COLOR, 1)
    this.selectionGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)

    this.positionHandles(bounds)
    this.setHandlesVisible(true)
  }

  positionHandles(bounds) {
    const positions = {
      tl: [bounds.left, bounds.top],
      tr: [bounds.right, bounds.top],
      bl: [bounds.left, bounds.bottom],
      br: [bounds.right, bounds.bottom],
    }

    for (const handle of this.resizeHandles) {
      const [x, y] = positions[handle.getData('corner')]
      handle.setPosition(x, y)
    }
  }

  setHandlesVisible(visible) {
    for (const handle of this.resizeHandles) {
      handle.setVisible(visible)
      handle.input.enabled = visible
    }
  }
}
