// Panel / Fond: solid-color rectangle background.
// Matches the cahier des charges' "Panel / Fond" component properties:
// position X/Y, largeur, hauteur, couleur de fond, ancrage.
const defaultProps = {
  x: 0,
  y: 0,
  width: 200,
  height: 120,
  color: 0x2d2f3a,
  originX: 0,
  originY: 0,
}

// addElement() always calls this with props already merged over defaultProps.
function create(scene, props) {
  const { x, y, width, height, color, originX, originY } = props
  return scene.add.rectangle(x, y, width, height, color).setOrigin(originX, originY)
}

// Generates the constructor line for this element in the exported screen
// class — must produce the exact same visual result as create() above,
// since that's the "rendu parfait" promise: editor and generated code have
// to match. Coordinates are rounded (drag/resize can leave sub-pixel
// values) and the color is written as a 0x hex literal.
function generateCode({ props }) {
  const { name, x, y, width, height, color, originX, originY } = props
  const hexColor = `0x${color.toString(16).padStart(6, '0')}`
  return `this.${name} = scene.add.rectangle(${Math.round(x)}, ${Math.round(y)}, ${Math.round(width)}, ${Math.round(height)}, ${hexColor}).setOrigin(${originX}, ${originY});`
}

export const panelComponent = {
  type: 'panel',
  label: 'Panel',
  defaultProps,
  create,
  generateCode,
}
