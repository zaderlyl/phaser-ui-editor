import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('phaser', () => ({
  default: {
    Scene: class Scene {
      constructor(key) {
        this.sceneKey = key
      }
    },
    Geom: {
      Rectangle: {
        Contains: () => true,
      },
    },
  },
}))

const { EditorScene } = await import('./EditorScene')

function createGameObject(type = 'Rectangle') {
  const data = new Map()
  const gameObject = {
    type,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    originX: 0,
    originY: 0,
    scaleX: 1,
    scaleY: 1,
    visible: true,
    setData(key, value) {
      data.set(key, value)
      return this
    },
    getData(key) {
      return data.get(key)
    },
    setOrigin(x, y = x) {
      this.originX = x
      this.originY = y
      return this
    },
    setPosition(x, y) {
      this.x = x
      this.y = y
      return this
    },
    setSize(width, height) {
      this.width = width
      this.height = height
      return this
    },
    setDisplaySize(width, height) {
      this.width = width
      this.height = height
      return this
    },
    setFixedSize(width, height) {
      this.width = width
      this.height = height
      return this
    },
    setFillStyle() {
      return this
    },
    setStrokeStyle() {
      return this
    },
    setInteractive() {
      return this
    },
    setText() {
      return this
    },
    setFontSize() {
      return this
    },
    setFontStyle() {
      return this
    },
    setAlign() {
      return this
    },
    setVisible(value) {
      this.visible = value
      return this
    },
    getBounds() {
      return {
        left: this.x,
        top: this.y,
        right: this.x + this.width * this.scaleX,
        bottom: this.y + this.height * this.scaleY,
        width: this.width * this.scaleX,
        height: this.height * this.scaleY,
      }
    },
    destroy() {
      this.destroyed = true
    },
  }

  if (type === 'Container') {
    gameObject.children = []
    gameObject.add = (children) => {
      for (const child of Array.isArray(children) ? children : [children]) {
        gameObject.children.push(child)
      }
      return gameObject
    }
    gameObject.remove = (child) => {
      gameObject.children = gameObject.children.filter((current) => current !== child)
      return gameObject
    }
  }

  return gameObject
}

function createScene() {
  const scene = new EditorScene()
  scene.events = { emit: vi.fn() }
  scene.input = { setDraggable: vi.fn() }
  scene.selectionGraphics = { clear: vi.fn() }
  scene.setHandlesVisible = vi.fn()
  scene.drawSelection = vi.fn()
  scene.reindexDepths = vi.fn()
  scene.syncCompositeVisual = vi.fn()
  scene.add = {
    rectangle: () => createGameObject(),
    text: () => createGameObject('Text'),
    container: () => createGameObject('Container'),
    existing: vi.fn(),
  }
  return scene
}

function addPanel(scene, x = 0, y = 0) {
  return scene.addElement('panel', { x, y })
}

describe('EditorScene undo/redo', () => {
  let scene

  beforeEach(() => {
    scene = createScene()
  })

  it('undoes and redoes an added element', () => {
    const element = addPanel(scene)
    scene.selectElement(element.id)

    scene.undo()
    expect(scene.elements).toHaveLength(0)

    scene.redo()
    expect(scene.elements.map(({ id }) => id)).toEqual([element.id])
    expect([...scene.selectedIds]).toEqual([element.id])
  })

  it('undoes a property modification', () => {
    const element = addPanel(scene)
    const initialX = element.props.x

    scene.updateElementProps(element.id, { x: 140 })
    scene.undo()

    expect(scene.elements[0].props.x).toBe(initialX)
    scene.redo()
    expect(scene.elements[0].props.x).toBe(140)
  })

  it('undoes and redoes multiple deletion as one action', () => {
    const first = addPanel(scene)
    const second = addPanel(scene, 200)
    scene.selectElement(first.id)
    scene.selectElement(second.id, { additive: true })

    scene.removeSelectedElements()
    expect(scene.elements).toHaveLength(0)

    scene.undo()
    expect(scene.elements.map(({ id }) => id)).toEqual([first.id, second.id])
    expect([...scene.selectedIds]).toEqual([first.id, second.id])

    scene.redo()
    expect(scene.elements).toHaveLength(0)
  })

  it('undoes movement and resizing', () => {
    const element = addPanel(scene)
    const initial = { x: element.props.x, width: element.props.width }

    scene.updateElementProps(element.id, { x: 80 })
    scene.undo()
    expect(scene.elements[0].props.x).toBe(initial.x)
    scene.redo()

    const resized = scene.elements[0]
    scene.resizeStartBounds = { left: 80, top: 0, width: 200, height: 120 }
    scene.resizeSnapshot = [
      {
        element: resized,
        relLeft: 0,
        relTop: 0,
        width: 200,
        height: 120,
        startScaleX: 1,
        startScaleY: 1,
      },
    ]
    const handle = { getData: (key) => ({ fixedX: 80, fixedY: 0, corner: 'br' })[key] }
    scene.resizeSelected(handle, 300, 180)
    scene.commitHistory()
    scene.undo()

    expect(scene.elements[0].props.width).toBe(initial.width)
    scene.redo()
    expect(scene.elements[0].props.width).toBeCloseTo(220)
  })

  it('undoes and redoes grouping and ungrouping', () => {
    const first = addPanel(scene)
    const second = addPanel(scene, 220)
    scene.selectElement(first.id)
    scene.selectElement(second.id, { additive: true })

    scene.groupSelected()
    const groupId = scene.elements.find((element) => element.type === 'group').id
    expect(scene.elements.filter((element) => element.parentId === groupId)).toHaveLength(2)

    scene.ungroupSelected()
    expect(scene.elements.some((element) => element.type === 'group')).toBe(false)

    scene.undo()
    expect(scene.elements.some((element) => element.id === groupId)).toBe(true)
    scene.redo()
    expect(scene.elements.some((element) => element.type === 'group')).toBe(false)
  })

  it('undoes and redoes layer reordering', () => {
    const first = addPanel(scene)
    const second = addPanel(scene, 200)
    const third = addPanel(scene, 400)

    scene.reorderElements([third.id, first.id, second.id])
    expect(scene.elements.map(({ id }) => id)).toEqual([third.id, first.id, second.id])

    scene.undo()
    expect(scene.elements.map(({ id }) => id)).toEqual([first.id, second.id, third.id])
    scene.redo()
    expect(scene.elements.map(({ id }) => id)).toEqual([third.id, first.id, second.id])
  })

  it('clears redo history after a new modification', () => {
    const first = addPanel(scene)
    scene.undo()
    expect(scene.redoStack).toHaveLength(1)

    const second = addPanel(scene, 200)
    expect(scene.redoStack).toHaveLength(0)
    scene.redo()
    expect(scene.elements.map(({ id }) => id)).toEqual([second.id])
    expect(scene.elements.map(({ id }) => id)).not.toContain(first.id)
  })

  it('keeps the latest 100 history entries', () => {
    for (let index = 0; index < 101; index += 1) addPanel(scene, index * 10)

    expect(scene.undoStack).toHaveLength(100)
    for (let index = 0; index < 100; index += 1) scene.undo()

    expect(scene.elements).toHaveLength(1)
  })
})