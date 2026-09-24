// Cercle / Ellipse: same shape as Panel (a solid-color fill you position/
// resize/color) plus an optional contour, matching Bouton's own
// strokeColor/strokeThickness convention — width/height independent so a
// non-uniform resize gives an ellipse, not just a circle. Needs no
// syncVisual/custom updateElementProps handling at all: Ellipse is a
// Phaser Shape, same family as Panel's Rectangle, so every generic prop
// handler already wired for width/height/color/strokeColor/strokeThickness
// (see updateElementProps) picks it up for free via setFillStyle/
// setStrokeStyle/setSize, same as Panel and Bouton's own background.
const defaultProps = {
  x: 0,
  y: 0,
  width: 120,
  height: 120,
  color: 0x3b82f6,
  strokeColor: 0x2563eb,
  strokeThickness: 0,
  originX: 0,
  originY: 0,
}

function create(scene, props) {
  const { x, y, width, height, color, strokeColor, strokeThickness, originX, originY } = props
  return scene.add
    .ellipse(x, y, width, height, color)
    .setStrokeStyle(strokeThickness, strokeColor)
    .setOrigin(originX, originY)
}

// Mirrors create() exactly, same reason as every other component's
// generateCode — the exported game must render pixel-identical to the
// editor.
function generateCode({ props }) {
  const { name, x, y, width, height, color, strokeColor, strokeThickness, originX, originY } = props
  const hexColor = `0x${color.toString(16).padStart(6, '0')}`
  const hexStrokeColor = `0x${strokeColor.toString(16).padStart(6, '0')}`
  return `this.${name} = scene.add.ellipse(${Math.round(x)}, ${Math.round(y)}, ${Math.round(width)}, ${Math.round(height)}, ${hexColor}).setStrokeStyle(${strokeThickness}, ${hexStrokeColor}).setOrigin(${originX}, ${originY});`
}

export const circleComponent = {
  type: 'circle',
  label: 'Cercle',
  defaultProps,
  create,
  generateCode,
}
