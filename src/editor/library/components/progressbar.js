// Barre de progression: a track (background) with a fill on top whose
// size (and growth edge) represents a value between minValue and
// maxValue (not necessarily 0-100 — a life bar on 0-1000, for instance)
// — position X/Y, largeur/hauteur, couleur de fond, couleur de
// remplissage (avec dégradé et une couleur de secours si la valeur est
// basse), orientation, sens de remplissage, contour, ancrage. Built as a
// Phaser.GameObjects.Container (background rectangle + fill Graphics as
// children, both in container-local coordinates) exactly like Button's
// background+label, since a single Shape can't hold two independently
// colored/sized children.
const defaultProps = {
  x: 0,
  y: 0,
  width: 200,
  height: 24,
  backgroundColor: 0x374151,
  fillColor: 0x22c55e,
  // Same value as fillColor by default, so a fresh bar renders as a flat
  // color (no visible gradient) until a créa picks a different end color —
  // opt-in, like every other advanced knob here.
  fillGradientEnd: 0x22c55e,
  // When the ratio drops to/below lowThreshold percent, the fill switches
  // to fillColorLow instead — the common health/mana-bar "flash red when
  // low" pattern. Opt-in in effect, not in UI: the default threshold (20)
  // only kicks in once a créa actually lowers the value that far, so a
  // freshly dropped bar (default value 60/100) looks unaffected.
  fillColorLow: 0xef4444,
  lowThreshold: 20,
  value: 60,
  minValue: 0,
  maxValue: 100,
  orientation: 'horizontal',
  direction: 'normal',
  // Same prop names Button already uses for its border, so the
  // properties panel's generic "Contour" section (gated on
  // 'strokeThickness' in props, see PropertiesPanel.jsx) picks this up
  // with no new UI code. 0 thickness means no border by default — most
  // progress bars don't need one, this is opt-in like Button's hover/
  // pressed callbacks.
  strokeColor: 0x1e293b,
  strokeThickness: 0,
  originX: 0,
  originY: 0,
}

// 0-1, clamped so a value outside [minValue, maxValue] (typed in the
// properties panel) can't spill the fill past the track or go negative,
// and a degenerate range (maxValue <= minValue) reads as empty instead of
// dividing by zero.
function fillRatio(value, minValue, maxValue) {
  const range = maxValue - minValue
  const ratio = range > 0 ? (value - minValue) / range : 0
  return Math.max(0, Math.min(1, ratio))
}

// fillColor, unless the ratio has dropped to/below lowThreshold percent,
// in which case fillColorLow takes over instead. The gradient (see
// drawFill) still runs from whichever of these two into fillGradientEnd —
// keeping a single gradient partner rather than a second one for the low
// state is a deliberate simplification for now.
function activeFillColor(ratio, fillColor, fillColorLow, lowThreshold) {
  return ratio * 100 <= lowThreshold ? fillColorLow : fillColor
}

// The fill's literal top-left position and size for the current
// orientation/direction — shared by create() and syncVisual() so both
// always agree. orientation picks which axis it grows along, and
// direction picks which edge it's anchored to (i.e. which edge stays
// fixed while the other one moves as the value changes). "normal" reads
// left-to-right for horizontal and bottom-to-top for vertical (the common
// health/mana-bar convention of filling upward); "reversed" flips each to
// right-to-left / top-to-bottom.
function fillGeometry(width, height, ratio, orientation, direction) {
  if (orientation === 'vertical') {
    const fillHeight = height * ratio
    return direction === 'reversed'
      ? { x: 0, y: 0, width, height: fillHeight }
      : { x: 0, y: height - fillHeight, width, height: fillHeight }
  }
  const fillWidth = width * ratio
  return direction === 'reversed'
    ? { x: width - fillWidth, y: 0, width: fillWidth, height }
    : { x: 0, y: 0, width: fillWidth, height }
}

// Draws the fill as a Graphics rect rather than a plain Rectangle, since a
// two-stop gradient (fillGradientStyle) is WebGL-only and has no Shape/
// Rectangle equivalent in Phaser — Graphics is the only game object that
// supports it. Redrawn from scratch on every change (Graphics has no
// persistent width/height/fillColor to just update in place, unlike a
// Rectangle). The gradient always runs in the natural reading direction —
// left-to-right for horizontal, top-to-bottom for vertical — regardless of
// which edge direction anchors the fill to, since it's purely decorative
// and tying it to the anchor as well would only add confusing edge cases.
function drawFill(graphics, geo, colorStart, colorEnd, orientation) {
  graphics.clear()
  if (geo.width <= 0 || geo.height <= 0) return

  if (orientation === 'vertical') {
    graphics.fillGradientStyle(colorStart, colorStart, colorEnd, colorEnd, 1)
  } else {
    graphics.fillGradientStyle(colorStart, colorEnd, colorStart, colorEnd, 1)
  }
  graphics.fillRect(geo.x, geo.y, geo.width, geo.height)
}

function create(scene, props) {
  const {
    x,
    y,
    width,
    height,
    backgroundColor,
    fillColor,
    fillGradientEnd,
    fillColorLow,
    lowThreshold,
    value,
    minValue,
    maxValue,
    orientation,
    direction,
    strokeColor,
    strokeThickness,
    originX,
    originY,
  } = props

  const background = scene.add
    .rectangle(0, 0, width, height, backgroundColor)
    .setStrokeStyle(strokeThickness, strokeColor)
    .setOrigin(0, 0)

  const fill = scene.add.graphics()
  const ratio = fillRatio(value, minValue, maxValue)
  const geo = fillGeometry(width, height, ratio, orientation, direction)
  const activeColor = activeFillColor(ratio, fillColor, fillColorLow, lowThreshold)
  drawFill(fill, geo, activeColor, fillGradientEnd, orientation)

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
// change to width/height/backgroundColor/fillColor/fillGradientEnd/
// fillColorLow/lowThreshold/value/minValue/maxValue/orientation/direction/
// strokeColor/strokeThickness, since none of those live on the Container
// itself (see EditorScene's syncCompositeVisual, the only caller).
function syncVisual(container, props) {
  const {
    width,
    height,
    backgroundColor,
    fillColor,
    fillGradientEnd,
    fillColorLow,
    lowThreshold,
    value,
    minValue,
    maxValue,
    orientation,
    direction,
    strokeColor,
    strokeThickness,
  } = props
  const background = container.getData('background')
  const fill = container.getData('fill')

  background.setSize(width, height)
  background.setFillStyle(backgroundColor)
  background.setStrokeStyle(strokeThickness, strokeColor)

  const ratio = fillRatio(value, minValue, maxValue)
  const geo = fillGeometry(width, height, ratio, orientation, direction)
  const activeColor = activeFillColor(ratio, fillColor, fillColorLow, lowThreshold)
  drawFill(fill, geo, activeColor, fillGradientEnd, orientation)
}

export const progressBarComponent = {
  type: 'progressbar',
  label: 'Barre de progression',
  defaultProps,
  create,
  syncVisual,
}
