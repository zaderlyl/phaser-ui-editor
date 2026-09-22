// Bouton: a rectangle with a border, giving it a believable "normal" (idle)
// button look instead of a flat single-color panel — position X/Y,
// largeur, hauteur, couleur de fond, contour, ancrage. Same mechanics as
// Panel plus a border, but its own type — not just a Panel with different
// defaults — so later steps (a text label, a named callback in the
// exported code, hover/pressed states) have somewhere to attach without
// reshaping Panel's own contract.
const defaultProps = {
  x: 0,
  y: 0,
  width: 160,
  height: 50,
  color: 0x3b82f6,
  strokeColor: 0x2563eb,
  strokeThickness: 2,
  originX: 0,
  originY: 0,
}

function create(scene, props) {
  const { x, y, width, height, color, strokeColor, strokeThickness, originX, originY } = props
  return scene.add
    .rectangle(x, y, width, height, color)
    .setStrokeStyle(strokeThickness, strokeColor)
    .setOrigin(originX, originY)
}

function generateCode({ props }) {
  const { name, x, y, width, height, color, strokeColor, strokeThickness, originX, originY } =
    props
  const hexColor = `0x${color.toString(16).padStart(6, '0')}`
  const hexStrokeColor = `0x${strokeColor.toString(16).padStart(6, '0')}`
  return `this.${name} = scene.add.rectangle(${Math.round(x)}, ${Math.round(y)}, ${Math.round(width)}, ${Math.round(height)}, ${hexColor}).setStrokeStyle(${strokeThickness}, ${hexStrokeColor}).setOrigin(${originX}, ${originY});`
}

export const buttonComponent = {
  type: 'button',
  label: 'Bouton',
  defaultProps,
  create,
  generateCode,
}
