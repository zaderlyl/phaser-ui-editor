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
  rotation: 0,
}

function create(scene, props) {
  const { x, y, width, height, color, strokeColor, strokeThickness, originX, originY, rotation } = props
  return scene.add
    .ellipse(x, y, width, height, color)
    .setStrokeStyle(strokeThickness, strokeColor)
    .setOrigin(originX, originY)
    .setAngle(rotation)
}

// Mirrors create() exactly, same reason as every other component's
// generateCode — the exported game must render pixel-identical to the
// editor.
function generateCode({ props }) {
  const { name, x, y, width, height, color, strokeColor, strokeThickness, originX, originY, rotation } = props
  const hexColor = `0x${color.toString(16).padStart(6, '0')}`
  const hexStrokeColor = `0x${strokeColor.toString(16).padStart(6, '0')}`
  return `this.${name} = scene.add.ellipse(${Math.round(x)}, ${Math.round(y)}, ${Math.round(width)}, ${Math.round(height)}, ${hexColor}).setStrokeStyle(${strokeThickness}, ${hexStrokeColor}).setOrigin(${originX}, ${originY}).setAngle(${Math.round(rotation)});`
}

// Unlike Panel/Ligne's own toPolygonPoints (their real render bounds ARE
// their 4 corners), an ellipse has no finite point list to read off — it
// has to be approximated by walking evenly-spaced angles around it and
// sampling a point at each one. 32 points is smooth enough to not visibly
// look faceted at any size this editor places shapes at, without being
// so many that a later boolean-op clip against it gets slow for no
// visual benefit.
const CIRCLE_TESSELLATION_POINTS = 32

// Tessellated in *local* space (relative to the object's own origin, same
// anchor its rotation pivots around) and transformed through the real
// world matrix — same fix as Panel's own toPolygonPoints, for the same
// reason: reading centerX/radiusX/radiusY off getBounds() (the original
// version of this function, before rotation existed) gives the rotated
// ellipse's axis-aligned *bounding box*, not its actual outline, which
// only happens to look right for a circle (width === height) at any
// angle — an actual ellipse rotated 45° would tessellate completely wrong.
function toPolygonPoints(element) {
  const { width, height, originX, originY } = element.props
  const localCenterX = (0.5 - originX) * width
  const localCenterY = (0.5 - originY) * height
  const radiusX = width / 2
  const radiusY = height / 2
  const matrix = element.gameObject.getWorldTransformMatrix()
  const points = []
  for (let i = 0; i < CIRCLE_TESSELLATION_POINTS; i++) {
    const angle = (i / CIRCLE_TESSELLATION_POINTS) * Math.PI * 2
    const local = {
      x: localCenterX + Math.cos(angle) * radiusX,
      y: localCenterY + Math.sin(angle) * radiusY,
    }
    const world = {}
    matrix.transformPoint(local.x, local.y, world)
    points.push({ x: world.x, y: world.y })
  }
  return points
}

export const circleComponent = {
  type: 'circle',
  label: 'Cercle',
  defaultProps,
  create,
  generateCode,
  toPolygonPoints,
}
