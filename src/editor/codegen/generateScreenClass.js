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

// Groups aren't in the component library (they're not a placeable library
// item, see groupSelected) so they're handled here instead of through
// generateElementCode: a real nested Phaser.GameObjects.Container built
// from the group's children — which are already stored in the container-
// local coordinates a real Container.add() expects, see groupSelected /
// reparentToScene — plus a setScale() when the group was resized, so the
// exported code reproduces the same visual stretch as the canvas (see
// resizeSelected's group branch, the only place props.scaleX/Y is set).
function generateGroupCode(element, elements, indent) {
  const { name, x, y, scaleX = 1, scaleY = 1 } = element.props
  const children = elements.filter((child) => child.parentId === element.id)
  const childLines = children.map((child) => generateEntryCode(child, elements, indent))
  const childRefs = children.map((child) => `this.${child.props.name}`)

  const lines = [
    `${indent}this.${name} = new Phaser.GameObjects.Container(scene, ${Math.round(x)}, ${Math.round(y)});`,
    ...childLines,
    `${indent}this.${name}.add([${childRefs.join(', ')}]);`,
  ]
  if (scaleX !== 1 || scaleY !== 1) {
    lines.push(`${indent}this.${name}.setScale(${formatScale(scaleX)}, ${formatScale(scaleY)});`)
  }
  return lines.join('\n')
}

// Rounds a scale factor to a readable precision without leaving Phaser's
// floating-point resize math (e.g. 1.9966666666666666) verbatim in the
// generated code.
function formatScale(value) {
  return Number(value.toFixed(4))
}

function generateEntryCode(element, elements, indent) {
  if (element.type === 'group') {
    return generateGroupCode(element, elements, indent)
  }
  return `${indent}${generateElementCode(element)}`
}

// Turns the current screen (elements in back-to-front order, same as
// EditorScene.elements) into a standalone Phaser.GameObjects.Container
// subclass, matching the cahier des charges' export format: a constructor
// that builds every named child (groups become nested Containers, see
// generateGroupCode), adds them to the container in the same back-to-front
// order (so Phaser's own paint order matches the editor's), and a minimal
// open()/close() API.
export function generateScreenClass(elements, className = 'Screen') {
  const topLevel = elements.filter((element) => !element.parentId)
  const constructorLines = topLevel.map((element) => generateEntryCode(element, elements, '    '))
  const childRefs = topLevel.map((element) => `this.${element.props.name}`)
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
