import { componentLibrary } from '../library/registry'
import { getChildRole } from '../library/components/statebutton'

// Builds the constructor line for one element by delegating to its
// component's own generateCode(), the same way EditorScene.addElement()
// delegates to create() — each component type owns both its live rendering
// and its generated-code representation. containerRef is the expression
// ('this', or a group's 'this.<name>') an *async* component (currently
// just Image) adds itself into once ready — see isAsyncComponent below.
function generateElementCode(element, containerRef) {
  const definition = componentLibrary.find((component) => component.type === element.type)
  if (!definition || typeof definition.generateCode !== 'function') {
    throw new Error(`Component type "${element.type}" doesn't support code generation yet`)
  }
  return definition.generateCode(element, containerRef)
}

// True for a component whose generateCode() doesn't produce a game object
// synchronously (currently just Image — addBase64() decodes the picture
// asynchronously, a real HTMLImageElement load under the hood). Such a
// component adds *itself* into its container once ready, so callers here
// must leave it out of the surrounding synchronous add([...]) list —
// referencing `this.<name>` there before that callback has run would be
// undefined.
function isAsyncComponent(type) {
  const definition = componentLibrary.find((component) => component.type === type)
  return !!definition?.isAsync
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
  const containerRef = `this.${name}`
  const children = elements.filter((child) => child.parentId === element.id)
  const childLines = children.map((child) => generateEntryCode(child, elements, indent, containerRef))
  // Async children (Image) add themselves into containerRef from their own
  // callback once ready — see generateCode's containerRef param — so only
  // the synchronous ones belong in this immediate add([...]) call.
  const syncChildRefs = children
    .filter((child) => !isAsyncComponent(child.type))
    .map((child) => `this.${child.props.name}`)

  const lines = [`${indent}this.${name} = new Phaser.GameObjects.Container(scene, ${Math.round(x)}, ${Math.round(y)});`, ...childLines]
  if (syncChildRefs.length > 0) {
    lines.push(`${indent}this.${name}.add([${syncChildRefs.join(', ')}]);`)
  }
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

// Bouton composé isn't a placeable library item you can generateCode()
// for on its own either, same reason as a group above: its actual visual
// is 2-3 *other* elements it only stores the ids of (see statebutton.js),
// so building its exported subtree needs this full elements list to
// resolve them. Reuses the group branch's own child/async-ref plumbing,
// then layers on the state-toggling every button type needs — but reading
// which named child plays which role from getChildRole (statebutton.js)
// and swapping *visibility between real child game objects* rather than
// recoloring/retexturing one shared game object the way Bouton/Bouton
// image do.
function generateStateButtonCode(element, elements, indent) {
  const { name, x, y, width, height, callback } = element.props
  const containerRef = `this.${name}`
  const children = elements.filter((child) => child.parentId === element.id)
  const childLines = children.map((child) => generateEntryCode(child, elements, indent, containerRef))
  const syncChildRefs = children
    .filter((child) => !isAsyncComponent(child.type))
    .map((child) => `this.${child.props.name}`)

  const normalChild = children.find((child) => getChildRole(element.props, child.id) === 'normal')
  const hoverChild = children.find((child) => getChildRole(element.props, child.id) === 'hover')
  const pressedChild = children.find((child) => getChildRole(element.props, child.id) === 'pressed')
  if (!normalChild) {
    throw new Error(`Le bouton composé "${name}" n'a pas d'état Normal — assignez-en un avant d'exporter.`)
  }

  // Sets every linked child's visibility in one go rather than only
  // touching the ones a given event actually changes — a pointerout while
  // pressed (dragging off before releasing) needs to hide the pressed
  // child too, not just re-show normal, or both would render at once;
  // listing all three unconditionally avoids ever having to reason about
  // what a *previous* event might have left visible.
  const showOnly = (activeChild) =>
    [normalChild, hoverChild, pressedChild]
      .filter(Boolean)
      .map((child) => `this.${child.props.name}.setVisible(${child === activeChild})`)
      .join('; ')

  const w = Math.round(width)
  const h = Math.round(height)
  const lines = [
    `${indent}this.${name} = new Phaser.GameObjects.Container(scene, ${Math.round(x)}, ${Math.round(y)});`,
    ...childLines,
  ]
  if (syncChildRefs.length > 0) {
    lines.push(`${indent}this.${name}.add([${syncChildRefs.join(', ')}]);`)
  }
  lines.push(
    `${indent}this.${name}.setSize(${w}, ${h});`,
    // Same fix as EditorScene.makeInteractive, reproduced here since this
    // is standalone generated code with no scene helper to call: a
    // Container's displayOrigin is a fixed, non-configurable 0.5, and
    // Phaser always offsets the click point by it before testing the
    // hitArea — plain setInteractive({useHandCursor:true}) would only
    // make the top-left quadrant of the button actually clickable
    // (verified against Phaser's own hit-test source).
    `${indent}this.${name}.setInteractive(new Phaser.Geom.Rectangle(${w / 2}, ${h / 2}, ${w}, ${h}), Phaser.Geom.Rectangle.Contains);`,
    `${indent}this.${name}.input.cursor = 'pointer';`,
    `${indent}${showOnly(normalChild)};`,
  )

  if (hoverChild) {
    lines.push(`${indent}this.${name}.on('pointerover', () => { ${showOnly(hoverChild)}; });`)
  }
  if (hoverChild || pressedChild) {
    lines.push(`${indent}this.${name}.on('pointerout', () => { ${showOnly(normalChild)}; });`)
  }
  if (pressedChild) {
    lines.push(`${indent}this.${name}.on('pointerdown', () => { ${showOnly(pressedChild)}; });`)
  }
  // pointerup reverts to the hover child if there is one (falling back to
  // normal) before firing the callback — same convention as Bouton/Bouton
  // image: releasing while still over the button should leave it looking
  // hovered, not suddenly idle.
  const restingChild = hoverChild ?? normalChild
  lines.push(`${indent}this.${name}.on('pointerup', () => { ${showOnly(restingChild)}; this.${callback}(); });`)

  return lines.join('\n')
}

function generateEntryCode(element, elements, indent, containerRef) {
  if (element.type === 'group') {
    return generateGroupCode(element, elements, indent)
  }
  if (element.type === 'statebutton') {
    return generateStateButtonCode(element, elements, indent)
  }
  return `${indent}${generateElementCode(element, containerRef)}`
}

// One stub method per unique callback name across every element that
// declares any (currently just Button, via getCallbackNames/
// generateCallbackStub — a button reports its click callback plus
// whichever of its opt-in hover/hover-out callbacks are actually set).
// Several buttons/callbacks can share a name (e.g. two "Retry" buttons),
// so the class gets one method for it, not a duplicate per use. elements
// is the full flat list (top-level and nested group children alike), so
// this needs no recursion.
function collectCallbackStubs(elements) {
  const seen = new Set()
  const stubs = []
  for (const element of elements) {
    const definition = componentLibrary.find((component) => component.type === element.type)
    if (typeof definition?.getCallbackNames !== 'function') continue
    for (const name of definition.getCallbackNames(element)) {
      if (!name || seen.has(name)) continue
      seen.add(name)
      stubs.push(definition.generateCallbackStub(name))
    }
  }
  return stubs
}

// Turns the current screen (elements in back-to-front order, same as
// EditorScene.elements) into a standalone Phaser.GameObjects.Container
// subclass, matching the cahier des charges' export format: a constructor
// that builds every named child (groups become nested Containers, see
// generateGroupCode; an Image adds itself in once its texture loads, see
// isAsyncComponent), adds the synchronous ones to the container in the
// same back-to-front order (so Phaser's own paint order matches the
// editor's), a minimal open()/close() API, and a stub method per button
// callback so the file runs immediately instead of throwing on an
// undefined method the first time someone clicks.
export function generateScreenClass(elements, className = 'Screen') {
  const topLevel = elements.filter((element) => !element.parentId)
  const constructorLines = topLevel.map((element) =>
    generateEntryCode(element, elements, '    ', 'this'),
  )
  const syncChildRefs = topLevel
    .filter((element) => !isAsyncComponent(element.type))
    .map((element) => `this.${element.props.name}`)
  const addChildrenLine = syncChildRefs.length > 0 ? `    this.add([${syncChildRefs.join(', ')}]);` : ''
  const callbackStubs = collectCallbackStubs(elements)
  const callbackStubsBlock = callbackStubs.length > 0 ? `\n${callbackStubs.join('\n\n')}\n` : ''

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
${callbackStubsBlock}}
`
}
