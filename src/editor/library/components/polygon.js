// Polygone / Étoile: a regular N-sided polygon, or (toggling isStar) an
// N-pointed star with its own inner-point radius — same position/size/
// color/contour fields as Panel/Cercle. Unlike Rectangle/Ellipse, Phaser's
// own Polygon shape doesn't redraw when width/height change via the
// generic setSize() (its rendering reads the *points* array it was built
// from, not width/height) — so this needs its own syncVisual to rebuild
// those points from props whenever width/height/sides/isStar/
// innerRadiusRatio change, driven by the generic (now-unconditional)
// syncCompositeVisual call in updateElementProps/resizeSelected, not
// anything specific to this component.
const defaultProps = {
  x: 0,
  y: 0,
  width: 120,
  height: 120,
  sides: 5,
  isStar: false,
  innerRadiusRatio: 0.5,
  color: 0x3b82f6,
  strokeColor: 0x2563eb,
  strokeThickness: 0,
  originX: 0,
  originY: 0,
}

// Points for a regular polygon/star, normalized to fit exactly inside a
// unit circle of radius 0.5 centered on (0, 0) — first point straight up.
// Scaling this by width/height (see buildPolygonPoints) stretches it to
// the exact requested bounding box, allowing a non-uniform resize to
// produce a stretched star/polygon the same way Cercle allows an ellipse.
function computeUnitPoints(sides, isStar, innerRadiusRatio) {
  const count = isStar ? sides * 2 : sides
  const points = []
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    const radius = isStar && i % 2 === 1 ? 0.5 * innerRadiusRatio : 0.5
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
  }
  return points
}

// Shifts the unit points from (-0.5..0.5) to (0..1) then scales to the
// actual width/height, so the shape's own top-left lands at local (0, 0) —
// the same top-left convention every other component's props.x/y assumes.
function buildPolygonPoints(props) {
  const { width, height, sides, isStar, innerRadiusRatio } = props
  return computeUnitPoints(sides, isStar, innerRadiusRatio).map((point) => ({
    x: (point.x + 0.5) * width,
    y: (point.y + 0.5) * height,
  }))
}

function create(scene, props) {
  const { x, y, color, strokeColor, strokeThickness, originX, originY } = props
  const points = buildPolygonPoints(props)
  return scene.add
    .polygon(x, y, points, color)
    .setStrokeStyle(strokeThickness, strokeColor)
    .setOrigin(originX, originY)
}

// Rebuilds the polygon's own points from current props — the live-canvas
// counterpart to generateCode below.
function syncVisual(gameObject, props) {
  gameObject.setTo(buildPolygonPoints(props))
}

// Mirrors create() exactly — the literal points array is baked in at
// export time rather than recomputed at runtime, same as every other
// component's generateCode just embedding its own final numbers.
function generateCode({ props }) {
  const { name, x, y, color, strokeColor, strokeThickness, originX, originY } = props
  const hexColor = `0x${color.toString(16).padStart(6, '0')}`
  const hexStrokeColor = `0x${strokeColor.toString(16).padStart(6, '0')}`
  const pointsLiteral = JSON.stringify(buildPolygonPoints(props))
  return `this.${name} = scene.add.polygon(${Math.round(x)}, ${Math.round(y)}, ${pointsLiteral}, ${hexColor}).setStrokeStyle(${strokeThickness}, ${hexStrokeColor}).setOrigin(${originX}, ${originY});`
}

export const polygonComponent = {
  type: 'polygon',
  label: 'Polygone',
  defaultProps,
  create,
  syncVisual,
  generateCode,
}
