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
  rotation: 0,
  flipX: false,
  flipY: false,
}

// addElement() always calls this with props already merged over defaultProps.
function create(scene, props) {
  const { x, y, width, height, color, originX, originY, rotation, flipX, flipY } = props
  return scene.add
    .rectangle(x, y, width, height, color)
    .setOrigin(originX, originY)
    .setAngle(rotation)
    .setScale(flipX ? -1 : 1, flipY ? -1 : 1)
}

// Generates the constructor line for this element in the exported screen
// class — must produce the exact same visual result as create() above,
// since that's the "rendu parfait" promise: editor and generated code have
// to match. Coordinates are rounded (drag/resize can leave sub-pixel
// values) and the color is written as a 0x hex literal.
function generateCode({ props }) {
  const { name, x, y, width, height, color, originX, originY, rotation, flipX, flipY } = props
  const hexColor = `0x${color.toString(16).padStart(6, '0')}`
  return `this.${name} = scene.add.rectangle(${Math.round(x)}, ${Math.round(y)}, ${Math.round(width)}, ${Math.round(height)}, ${hexColor}).setOrigin(${originX}, ${originY}).setAngle(${Math.round(rotation)}).setScale(${flipX ? -1 : 1}, ${flipY ? -1 : 1});`
}

// Its own contour as world-space points — the "any shape as a polygon"
// representation the boolean-op actions (Union/Soustraction/Intersection/
// Exclusion) need to treat every shape type uniformly, regardless of how
// each one actually renders. A plain getBounds() read (the original
// version of this function, before rotation existed) would only give the
// axis-aligned *bounding box* of a rotated rectangle, not its actual
// (rotated) corners — visibly wrong for a boolean op the moment a Panel is
// rotated. Same fix as Polygone/Tracé's own toPolygonPoints: compute the
// 4 corners in local space (relative to the object's own origin, the same
// anchor its rotation pivots around) and run them through the real world
// transform matrix, which correctly folds in rotation (and an ancestor
// group's scale, same benefit Polygone's own note describes).
function toPolygonPoints(element) {
  const { width, height, originX, originY } = element.props
  const localCorners = [
    { x: -originX * width, y: -originY * height },
    { x: (1 - originX) * width, y: -originY * height },
    { x: (1 - originX) * width, y: (1 - originY) * height },
    { x: -originX * width, y: (1 - originY) * height },
  ]
  const matrix = element.gameObject.getWorldTransformMatrix()
  return localCorners.map((corner) => {
    const world = {}
    matrix.transformPoint(corner.x, corner.y, world)
    return { x: world.x, y: world.y }
  })
}

export const panelComponent = {
  type: 'panel',
  label: 'Panel',
  defaultProps,
  create,
  generateCode,
  toPolygonPoints,
}
