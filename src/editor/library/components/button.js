// Bouton: for now just a solid-color rectangle, same mechanics as Panel —
// position X/Y, largeur, hauteur, couleur de fond, ancrage. A distinct
// type (not just a Panel with a different default size/color) so later
// steps (a text label, a named callback in the exported code, a hover
// state) have somewhere to attach without reshaping Panel's own contract.
const defaultProps = {
  x: 0,
  y: 0,
  width: 160,
  height: 50,
  color: 0x3b82f6,
  originX: 0,
  originY: 0,
}

function create(scene, props) {
  const { x, y, width, height, color, originX, originY } = props
  return scene.add.rectangle(x, y, width, height, color).setOrigin(originX, originY)
}

function generateCode({ props }) {
  const { name, x, y, width, height, color, originX, originY } = props
  const hexColor = `0x${color.toString(16).padStart(6, '0')}`
  return `this.${name} = scene.add.rectangle(${Math.round(x)}, ${Math.round(y)}, ${Math.round(width)}, ${Math.round(height)}, ${hexColor}).setOrigin(${originX}, ${originY});`
}

export const buttonComponent = {
  type: 'button',
  label: 'Bouton',
  defaultProps,
  create,
  generateCode,
}
