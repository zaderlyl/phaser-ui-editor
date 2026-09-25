// Tracé: an arbitrary closed shape defined by a free-form list of points
// (normalized to a unit box, same convention as Polygone's own regular
// points) rather than a regular N-sided shape. This is the rendering half
// only for now (step 1 of the pen-tool plan) — points are set directly
// for testing until the actual "draw a path by clicking" tool exists
// (later steps). Only closed paths are supported for now: an open
// polyline needs a different renderer (Phaser's own Polygon shape always
// closes its last point back to the first), deferred until the drawing
// tool itself needs to decide open vs. closed based on how a créa
// finishes a path.
const defaultProps = {
  x: 0,
  y: 0,
  width: 120,
  height: 120,
  // Normalized to a 0..1 box — scaling by width/height (see
  // buildPathPoints) stretches it to the exact requested bounding box,
  // so resizing rescales the whole path proportionally instead of
  // requiring the points themselves to be rewritten.
  points: [
    { x: 0.5, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ],
  color: 0x3b82f6,
  strokeColor: 0x2563eb,
  strokeThickness: 0,
  originX: 0,
  originY: 0,
}

function buildPathPoints(props) {
  const { width, height, points } = props
  return points.map((point) => ({ x: point.x * width, y: point.y * height }))
}

function create(scene, props) {
  const { x, y, color, strokeColor, strokeThickness, originX, originY } = props
  return scene.add
    .polygon(x, y, buildPathPoints(props), color)
    .setStrokeStyle(strokeThickness, strokeColor)
    .setOrigin(originX, originY)
}

// Rebuilds the path's own points from current props — same mechanism as
// Polygone's syncVisual, needed for the same reason (Phaser's Polygon
// doesn't redraw on a generic setSize()).
function syncVisual(gameObject, props) {
  gameObject.setTo(buildPathPoints(props))
}

// Mirrors create() exactly — the literal points array is baked in at
// export time, same as Polygone's own generateCode.
function generateCode({ props }) {
  const { name, x, y, color, strokeColor, strokeThickness, originX, originY } = props
  const hexColor = `0x${color.toString(16).padStart(6, '0')}`
  const hexStrokeColor = `0x${strokeColor.toString(16).padStart(6, '0')}`
  const pointsLiteral = JSON.stringify(buildPathPoints(props))
  return `this.${name} = scene.add.polygon(${Math.round(x)}, ${Math.round(y)}, ${pointsLiteral}, ${hexColor}).setStrokeStyle(${strokeThickness}, ${hexStrokeColor}).setOrigin(${originX}, ${originY});`
}

// Same technique as Polygone's own toPolygonPoints: reads the actual
// rendered points off the live gameObject and maps each one through its
// real world transform matrix, rather than recomputing world points from
// props — stays correct even for a Tracé nested inside a resized group.
function toPolygonPoints(element) {
  const matrix = element.gameObject.getWorldTransformMatrix()
  return element.gameObject.geom.points.map((point) => {
    const world = {}
    matrix.transformPoint(point.x, point.y, world)
    return { x: world.x, y: world.y }
  })
}

export const pathComponent = {
  type: 'path',
  label: 'Tracé',
  defaultProps,
  create,
  syncVisual,
  generateCode,
  toPolygonPoints,
}
