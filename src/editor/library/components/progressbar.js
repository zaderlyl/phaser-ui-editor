// Barre de progression: a track (background) with a fill on top whose
// width represents a value between minValue and maxValue (not
// necessarily 0-100 — a life bar on 0-1000, for instance) — position X/Y,
// largeur/hauteur, couleur de fond, couleur de remplissage, ancrage. Built
// as a Phaser.GameObjects.Container (background rectangle + fill
// rectangle as children, both in container-local coordinates) exactly
// like Button's background+label, since a single Shape can't hold two
// independently colored/sized rectangles.
const defaultProps = {
  x: 0,
  y: 0,
  width: 200,
  height: 24,
  backgroundColor: 0x374151,
  fillColor: 0x22c55e,
  value: 60,
  minValue: 0,
  maxValue: 100,
  originX: 0,
  originY: 0,
}

// The fill's width for a given value/range — shared by create() and
// syncVisual() so both always agree on what it looks like. The ratio is
// clamped to [0, 1] so a value outside [minValue, maxValue] (typed in the
// properties panel) can't spill the fill past the track or go negative,
// and a degenerate range (maxValue <= minValue) reads as empty instead of
// dividing by zero.
function fillWidthFor(width, value, minValue, maxValue) {
  const range = maxValue - minValue
  const ratio = range > 0 ? (value - minValue) / range : 0
  return width * Math.max(0, Math.min(1, ratio))
}

function create(scene, props) {
  const { x, y, width, height, backgroundColor, fillColor, value, minValue, maxValue, originX, originY } =
    props

  const background = scene.add.rectangle(0, 0, width, height, backgroundColor).setOrigin(0, 0)
  const fill = scene.add
    .rectangle(0, 0, fillWidthFor(width, value, minValue, maxValue), height, fillColor)
    .setOrigin(0, 0)

  // A Container has no real origin support (Phaser's Container.originX/Y
  // is a fixed read-only 0.5 that doesn't affect positioning — see
  // groupSelected's identical note) — dropping from the library always
  // asks for origin (0.5, 0.5) so the cursor lands on the element's
  // center, same as every other component. That's honored here, once, to
  // compute the initial top-left; props.x/y is mutated to match so it
  // stays in sync with the container's actual position (addElement stores
  // this same props object as the element's props right after create()
  // returns) — from then on this behaves like a group: x/y is always
  // literal top-left, with no ongoing origin concept.
  const left = x - originX * width
  const top = y - originY * height
  props.x = left
  props.y = top

  const container = scene.add.container(left, top, [background, fill])
  container.setSize(width, height)
  container.setData('background', background)
  container.setData('fill', fill)
  return container
}

// Resyncs the background and fill to the current props — needed after any
// change to width/height/backgroundColor/fillColor/value/minValue/
// maxValue, since none of those live on the Container itself (see
// EditorScene's syncCompositeVisual, the only caller).
function syncVisual(container, props) {
  const { width, height, backgroundColor, fillColor, value, minValue, maxValue } = props
  const background = container.getData('background')
  const fill = container.getData('fill')

  background.setSize(width, height)
  background.setFillStyle(backgroundColor)

  fill.setSize(fillWidthFor(width, value, minValue, maxValue), height)
  fill.setFillStyle(fillColor)
}

export const progressBarComponent = {
  type: 'progressbar',
  label: 'Barre de progression',
  defaultProps,
  create,
  syncVisual,
}
