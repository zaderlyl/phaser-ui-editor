import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { generateScreenClass } from '../../codegen/generateScreenClass'

class MockGameObject extends EventEmitter {
  constructor() {
    super()
    this.displaySize = null
  }

  setDisplaySize(width, height) {
    this.displaySize = [width, height]
    return this
  }

  setOrigin() { return this }
  setInteractive(options) { this.interactiveOptions = options; return this }
  setScrollFactor() { return this }
  setDepth() { return this }
  setVisible(visible) { this.visible = visible; return this }
  setTexture(texture) { this.texture = texture; return this }
}

class MockContainer extends MockGameObject {
  constructor(scene, x, y) {
    super()
    this.scene = scene
    this.x = x
    this.y = y
    this.children = []
  }

  add(children) {
    this.children.push(...(Array.isArray(children) ? children : [children]))
    return this
  }
}

function makeButton(id, name, parentId) {
  return {
    id,
    type: 'imagebutton',
    ...(parentId ? { parentId } : {}),
    props: {
      name,
      x: 100,
      y: 80,
      width: 160,
      height: 60,
      originX: 0.5,
      originY: 0.5,
      textureKey: `${name}-normal`,
      imageData: 'data:image/png;base64,normal',
      hoverTextureKey: `${name}-hover`,
      hoverImageData: 'data:image/png;base64,hover',
      pressedTextureKey: `${name}-pressed`,
      pressedImageData: 'data:image/png;base64,pressed',
      callback: `${name}Click`,
      hoverCallback: `${name}Hover`,
      hoverOutCallback: `${name}HoverOut`,
    },
  }
}

async function createGeneratedScreen(elements) {
  const source = generateScreenClass(elements).replace(/^export default class Screen/m, 'class Screen')
  const Screen = new Function('Phaser', `${source}\nreturn Screen`)({
    GameObjects: { Container: MockContainer },
  })
  const textures = new EventEmitter()
  textures.addBase64 = (key) => setTimeout(() => textures.emit(`addtexture-${key}`), 0)
  const scene = {
    textures,
    add: {
      image: (_x, _y, texture) => Object.assign(new MockGameObject(), { texture }),
      existing: vi.fn(),
    },
  }
  const screen = new Screen(scene)
  await new Promise((resolve) => setTimeout(resolve, 10))
  return screen
}

describe('generated ImageButton preview', () => {
  it('shows all three textures through pointer event transitions and fires callbacks', async () => {
    const screen = await createGeneratedScreen([makeButton('button', 'play')])
    const button = screen.play
    const click = vi.spyOn(screen, 'playClick')
    const hover = vi.spyOn(screen, 'playHover')
    const hoverOut = vi.spyOn(screen, 'playHoverOut')

    button.emit('pointerover')
    button.emit('pointerdown')
    expect(button.texture).toBe('play-pressed')
    button.emit('pointerout')
    expect(button.texture).toBe('play-normal')
    expect(click).not.toHaveBeenCalled()

    button.emit('pointerover')
    expect(button.texture).toBe('play-hover')
    expect(hover).toHaveBeenCalledTimes(2)

    button.emit('pointerdown')
    expect(button.texture).toBe('play-pressed')

    button.emit('pointerup')
    expect(button.texture).toBe('play-hover')
    expect(click).toHaveBeenCalledOnce()
    expect(button.displaySize).toEqual([160, 60])

    button.emit('pointerout')
    expect(button.texture).toBe('play-normal')
    expect(hoverOut).toHaveBeenCalledTimes(2)
  })

  it('adds an image button and its state textures inside a generated group', async () => {
    const group = { id: 'group', type: 'group', props: { name: 'menu', x: 200, y: 120 } }
    const button = makeButton('child', 'start', 'group')
    const screen = await createGeneratedScreen([group, button])

    expect(screen.children).toContain(screen.menu)
    expect(screen.menu.children).toContain(screen.start)
    screen.start.emit('pointerover')
    expect(screen.start.texture).toBe('start-hover')
    screen.start.emit('pointerdown')
    expect(screen.start.texture).toBe('start-pressed')
    screen.start.emit('pointerout')
    expect(screen.start.texture).toBe('start-normal')
  })
})
