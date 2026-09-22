// Barre de progression: a track (background) with a fill on top whose
// width represents a 0-100 value — position X/Y, largeur/hauteur, couleur
// de fond, couleur de remplissage, ancrage. Built as a
// Phaser.GameObjects.Container (background rectangle + fill rectangle as
// children, both in container-local coordinates) exactly like Button's
// background+label, since a single Shape can't hold two independently
// colored/sized rectangles.
const defaultProps = {
  x: 0,
  y: 0,
  width: 200,
  height: 24,
  backgroundColor: 0x374151,
  fillColor: 0x22c55e,
  // Kept simple for now (no properties-panel control yet, see the wider
  // Barre de progression plan) — the plumbing already supports any 0-100
  // value so a later step only needs to add the field, not touch create()/
  // syncVisual().
  value: 60,
  originX: 0,
  originY: 0,
}

// The fill's width for a given value — shared by create() and syncVisual()
// so both always agree on what "60%" actually looks like.
function fillWidthFor(width, value) {
  return Math.max(0, (width * value) / 100)
}

function create(scene, props) {
  const { x, y, width, height, backgroundColor, fillColor, value, originX, originY } = props

  const background = scene.add.rectangle(0, 0, width, height, backgroundColor).setOrigin(0, 0)
  const fill = scene.add
    .rectangle(0, 0, fillWidthFor(width, value), height, fillColor)
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
// change to width/height/backgroundColor/fillColor/value, since none of
// those live on the Container itself (see EditorScene's
// syncCompositeVisual, the only caller).
function syncVisual(container, props) {
  const { width, height, backgroundColor, fillColor, value } = props
  const background = container.getData('background')
  const fill = container.getData('fill')

  background.setSize(width, height)
  background.setFillStyle(backgroundColor)

  fill.setSize(fillWidthFor(width, value), height)
  fill.setFillStyle(fillColor)
}

export const progressBarComponent = {
  type: 'progressbar',
  label: 'Barre de progression',
  defaultProps,
  create,
  syncVisual,
}
