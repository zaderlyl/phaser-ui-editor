import { componentLibrary } from '../library/registry'

// Builds the constructor line for one element by delegating to its
// component's own generateCode(), the same way EditorScene.addElement()
// delegates to create() — each component type owns both its live rendering
// and its generated-code representation.
function generateElementCode(element) {
  const definition = componentLibrary.find((component) => component.type === element.type)
  if (!definition || typeof definition.generateCode !== 'function') {
    throw new Error(`Component type "${element.type}" doesn't support code generation yet`)
  }
  return definition.generateCode(element)
}

// Turns the current screen (elements in back-to-front order, same as
// EditorScene.elements) into a standalone Phaser.GameObjects.Container
// subclass, matching the cahier des charges' export format: a constructor
// that builds every named child, adds them to the container in the same
// back-to-front order (so Phaser's own paint order matches the editor's),
// and a minimal open()/close() API.
export function generateScreenClass(elements, className = 'Screen') {
  const constructorLines = elements.map((element) => `    ${generateElementCode(element)}`)
  const childRefs = elements.map((element) => `this.${element.props.name}`)
  const addChildrenLine = childRefs.length > 0 ? `    this.add([${childRefs.join(', ')}]);` : ''

  return `export default class ${className} extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    this.setScrollFactor(0).setDepth(1000).setVisible(false);

${constructorLines.join('\n')}

${addChildrenLine}
    scene.add.existing(this);
  }

  open() {
    this.setVisible(true);
  }

  close() {
    this.setVisible(false);
  }
}
`
}
