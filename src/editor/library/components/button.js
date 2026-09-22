// Bouton: a rectangle with a border and a centered text label — position
// X/Y, largeur, hauteur, couleur de fond, contour, texte, ancrage. Built as
// a Phaser.GameObjects.Container (background rectangle + label text as
// children, both in container-local coordinates) rather than a single
// Shape, since a Shape can't also hold a text child — the same mechanism
// EditorScene.groupSelected already uses for a manual Panel+Texte group,
// just packaged as one first-class component instead of two elements the
// créa has to group by hand every time.
const defaultProps = {
  x: 0,
  y: 0,
  width: 160,
  height: 50,
  color: 0x3b82f6,
  strokeColor: 0x2563eb,
  strokeThickness: 2,
  text: 'Bouton',
  originX: 0,
  originY: 0,
}

const LABEL_FONT_SIZE = 18
const LABEL_COLOR = '#ffffff'

function create(scene, props) {
  const { x, y, width, height, color, strokeColor, strokeThickness, text, originX, originY } =
    props

  const background = scene.add
    .rectangle(0, 0, width, height, color)
    .setStrokeStyle(strokeThickness, strokeColor)
    .setOrigin(0, 0)
  const label = scene.add
    .text(width / 2, height / 2, text, { fontSize: `${LABEL_FONT_SIZE}px`, color: LABEL_COLOR })
    .setOrigin(0.5, 0.5)

  // A Container has no real origin support (Phaser's Container.originX/Y
  // is a fixed read-only 0.5 that doesn't affect positioning — see
  // groupSelected's identical note) — dropping from the library always
  // asks for origin (0.5, 0.5) so the cursor lands on the button's center,
  // same as every other component. That's honored here, once, to compute
  // the initial top-left; props.x/y is mutated to match so it stays in
  // sync with the container's actual position (addElement stores this
  // same props object as the element's props right after create()
  // returns) — from then on the button behaves like a group: x/y is
  // always literal top-left, with no ongoing origin concept.
  const left = x - originX * width
  const top = y - originY * height
  props.x = left
  props.y = top

  const container = scene.add.container(left, top, [background, label])
  container.setSize(width, height)
  container.setData('background', background)
  container.setData('label', label)
  return container
}

// Resyncs the background rectangle and label to the current props — needed
// after any change to width/height/color/text/strokeColor/strokeThickness,
// since none of those live on the Container itself (see EditorScene's
// syncButtonVisual, the only caller).
function syncVisual(container, props) {
  const { width, height, color, strokeColor, strokeThickness, text } = props
  const background = container.getData('background')
  const label = container.getData('label')

  background.setSize(width, height)
  background.setFillStyle(color)
  background.setStrokeStyle(strokeThickness, strokeColor)

  label.setText(text)
  label.setPosition(width / 2, height / 2)
}

function generateCode({ props }) {
  const { name, x, y, width, height, color, strokeColor, strokeThickness, text } = props
  const hexColor = `0x${color.toString(16).padStart(6, '0')}`
  const hexStrokeColor = `0x${strokeColor.toString(16).padStart(6, '0')}`
  const escapedText = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

  // generateElementCode() (see generateScreenClass.js) wraps whatever this
  // returns with a single leading indent and nothing else, so continuation
  // lines carry their own — matching the flat 4-space indent every entry
  // (top-level or nested in a group) already uses throughout that file.
  return [
    `this.${name} = new Phaser.GameObjects.Container(scene, ${Math.round(x)}, ${Math.round(y)});`,
    `this.${name}Background = scene.add.rectangle(0, 0, ${Math.round(width)}, ${Math.round(height)}, ${hexColor}).setStrokeStyle(${strokeThickness}, ${hexStrokeColor}).setOrigin(0, 0);`,
    `this.${name}Label = scene.add.text(${Math.round(width) / 2}, ${Math.round(height) / 2}, '${escapedText}', { fontSize: '${LABEL_FONT_SIZE}px', color: '${LABEL_COLOR}' }).setOrigin(0.5, 0.5);`,
    `this.${name}.add([this.${name}Background, this.${name}Label]);`,
  ].join('\n    ')
}

export const buttonComponent = {
  type: 'button',
  label: 'Bouton',
  defaultProps,
  create,
  generateCode,
  syncVisual,
}
