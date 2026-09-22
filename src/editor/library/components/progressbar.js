// Barre de progression: a track (background) with a fill on top whose
// size (and growth edge) represents a value between minValue and
// maxValue (not necessarily 0-100 — a life bar on 0-1000, for instance)
// — position X/Y, largeur/hauteur, couleur de fond, couleur de
// remplissage (avec dégradé et une couleur de secours si la valeur est
// basse), orientation, sens de remplissage, contour, coins arrondis,
// ancrage. Built as a Phaser.GameObjects.Container (background Graphics +
// fill Graphics as children, both in container-local coordinates) exactly
// like Button's background+label, since a single Shape can't hold two
// independently colored/sized children.
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
  // Same prop name Text already uses (its own padding means something
  // different there — inner text margin, see text.js/applyTextLayout,
  // which safely no-ops for a ProgressBar since it has no such hook) —
  // reusing it here gives the properties panel's existing generic
  // "Padding" field for free. 0 means the fill is flush against the
  // track's edges, as before this prop existed.
  padding: 0,
  // 0 means square corners, as before this prop existed. Also drives
  // EditorScene's draggable corner-radius handle (see drawSelection/
  // updateCornerRadius there), gated the same generic way — any future
  // component that declares this prop gets that handle for free too.
  cornerRadius: 0,
  // A text overlay centered on the bar (e.g. "60%" or "60/100") — hidden
  // by default (opt-in, like the rest of these knobs), distinct prop
  // names (labelColor/labelFontSize) rather than reusing the generic
  // color/fontSize prop names Text/Button already use, since "Couleur"
  // would otherwise read as controlling the bar's own colors, not the
  // label's — worth the extra properties-panel fields for the clarity.
  showLabel: false,
  labelFormat: 'percent',
  labelColor: 0xffffff,
  labelFontSize: 14,
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
// orientation/direction, inset by padding on every side (an "inset" look
// — the track's own border, if any, stays at the full width/height) —
// shared by create() and syncVisual() so both always agree. orientation
// picks which axis it grows along, and direction picks which edge it's
// anchored to (i.e. which edge stays fixed while the other one moves as
// the value changes). "normal" reads left-to-right for horizontal and
// bottom-to-top for vertical (the common health/mana-bar convention of
// filling upward); "reversed" flips each to right-to-left / top-to-bottom.
function fillGeometry(width, height, ratio, orientation, direction, padding) {
  const innerWidth = Math.max(0, width - padding * 2)
  const innerHeight = Math.max(0, height - padding * 2)

  if (orientation === 'vertical') {
    const fillHeight = innerHeight * ratio
    return direction === 'reversed'
      ? { x: padding, y: padding, width: innerWidth, height: fillHeight }
      : { x: padding, y: padding + innerHeight - fillHeight, width: innerWidth, height: fillHeight }
  }
  const fillWidth = innerWidth * ratio
  return direction === 'reversed'
    ? { x: padding + innerWidth - fillWidth, y: padding, width: fillWidth, height: innerHeight }
    : { x: padding, y: padding, width: fillWidth, height: innerHeight }
}

// Per-corner radius for the fill: only the two corners on its *anchored*
// edge (the one that stays fixed as the value changes, see fillGeometry)
// are rounded, matching the track's own rounded corners there — the
// opposite (growing/cut) edge stays square, since rounding it would show
// a corner floating in the middle of the bar whenever it isn't at 0% or
// 100%. Clamped to the fill's own current size so a thin sliver near 0%
// never gets a radius bigger than itself.
function fillCornerRadius(cornerRadius, geo, orientation, direction) {
  if (cornerRadius <= 0) return 0
  const radius = Math.min(cornerRadius, geo.width / 2, geo.height / 2)
  const zero = { tl: 0, tr: 0, bl: 0, br: 0 }
  if (orientation === 'vertical') {
    return direction === 'reversed' ? { ...zero, tl: radius, tr: radius } : { ...zero, bl: radius, br: radius }
  }
  return direction === 'reversed' ? { ...zero, tr: radius, br: radius } : { ...zero, tl: radius, bl: radius }
}

// "60%" for labelFormat 'percent', "60/100" (the raw value and maxValue,
// unadjusted for minValue — the common case is minValue 0 anyway) for
// 'value'.
function labelText(value, maxValue, ratio, labelFormat) {
  return labelFormat === 'value'
    ? `${Math.round(value)}/${Math.round(maxValue)}`
    : `${Math.round(ratio * 100)}%`
}

function labelColorHex(labelColor) {
  return `#${labelColor.toString(16).padStart(6, '0')}`
}

// Draws the track as a Graphics rect (rather than a plain Rectangle Shape)
// so it can share fillRoundedRect/strokeRoundedRect with the fill below —
// Phaser's Rectangle Shape has no public rounded-corner support.
function drawBackground(graphics, width, height, backgroundColor, strokeColor, strokeThickness, cornerRadius) {
  graphics.clear()
  graphics.fillStyle(backgroundColor, 1)
  if (cornerRadius > 0) {
    graphics.fillRoundedRect(0, 0, width, height, cornerRadius)
  } else {
    graphics.fillRect(0, 0, width, height)
  }
  if (strokeThickness > 0) {
    graphics.lineStyle(strokeThickness, strokeColor, 1)
    if (cornerRadius > 0) {
      graphics.strokeRoundedRect(0, 0, width, height, cornerRadius)
    } else {
      graphics.strokeRect(0, 0, width, height)
    }
  }
}

// Draws the fill as a Graphics rect rather than a plain Rectangle, since a
// two-stop gradient (fillGradientStyle) is WebGL-only and has no Shape/
// Rectangle equivalent in Phaser — Graphics is the only game object that
// supports it (also lets it share rounded-corner support with the
// background, see fillCornerRadius). Redrawn from scratch on every change
// (Graphics has no persistent width/height/fillColor to just update in
// place, unlike a Rectangle). The gradient always runs in the natural
// reading direction — left-to-right for horizontal, top-to-bottom for
// vertical — regardless of which edge direction anchors the fill to,
// since it's purely decorative and tying it to the anchor as well would
// only add confusing edge cases.
function drawFill(graphics, geo, colorStart, colorEnd, orientation, direction, cornerRadius) {
  graphics.clear()
  if (geo.width <= 0 || geo.height <= 0) return

  if (orientation === 'vertical') {
    graphics.fillGradientStyle(colorStart, colorStart, colorEnd, colorEnd, 1)
  } else {
    graphics.fillGradientStyle(colorStart, colorEnd, colorStart, colorEnd, 1)
  }

  const radius = fillCornerRadius(cornerRadius, geo, orientation, direction)
  if (radius === 0) {
    graphics.fillRect(geo.x, geo.y, geo.width, geo.height)
  } else {
    graphics.fillRoundedRect(geo.x, geo.y, geo.width, geo.height, radius)
  }
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
    padding,
    cornerRadius,
    showLabel,
    labelFormat,
    labelColor,
    labelFontSize,
    originX,
    originY,
  } = props

  // Phaser's Graphics game object (needed below for rounded corners) has
  // no getBounds() support at all — no ComputedSize/Origin/GetBounds
  // mixin, unlike a Rectangle or Text. Container.getBounds() unions
  // whichever of its children actually implement getBounds(), silently
  // skipping ones that don't — so without this, the container's bounds
  // (and everything built on them: the selection outline, resize/radius
  // handle placement, drag-select, reparenting) would come only from the
  // label, collapsing to its small text size instead of the whole bar,
  // whenever the label is hidden even shrinking to nothing. A Zone is
  // Phaser's dedicated invisible placeholder for exactly this — it draws
  // nothing but has real width/height/origin/getBounds.
  const boundsZone = scene.add.zone(0, 0, width, height).setOrigin(0, 0)

  const background = scene.add.graphics()
  drawBackground(background, width, height, backgroundColor, strokeColor, strokeThickness, cornerRadius)

  const fill = scene.add.graphics()
  const ratio = fillRatio(value, minValue, maxValue)
  const geo = fillGeometry(width, height, ratio, orientation, direction, padding)
  const activeColor = activeFillColor(ratio, fillColor, fillColorLow, lowThreshold)
  drawFill(fill, geo, activeColor, fillGradientEnd, orientation, direction, cornerRadius)

  const label = scene.add
    .text(width / 2, height / 2, labelText(value, maxValue, ratio, labelFormat), {
      fontSize: `${labelFontSize}px`,
      color: labelColorHex(labelColor),
    })
    .setOrigin(0.5, 0.5)
    .setVisible(showLabel)

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

  const container = scene.add.container(left, top, [boundsZone, background, fill, label])
  container.setSize(width, height)
  container.setData('boundsZone', boundsZone)
  container.setData('background', background)
  container.setData('fill', fill)
  container.setData('label', label)
  return container
}

// Resyncs the background, fill and label to the current props — needed
// after any change to width/height/backgroundColor/fillColor/
// fillGradientEnd/fillColorLow/lowThreshold/value/minValue/maxValue/
// orientation/direction/strokeColor/strokeThickness/padding/cornerRadius/
// showLabel/labelFormat/labelColor/labelFontSize, since none of those
// live on the Container itself (see EditorScene's syncCompositeVisual,
// the only caller).
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
    padding,
    cornerRadius,
    showLabel,
    labelFormat,
    labelColor,
    labelFontSize,
  } = props
  const boundsZone = container.getData('boundsZone')
  const background = container.getData('background')
  const fill = container.getData('fill')
  const label = container.getData('label')

  boundsZone.setSize(width, height)

  drawBackground(background, width, height, backgroundColor, strokeColor, strokeThickness, cornerRadius)

  const ratio = fillRatio(value, minValue, maxValue)
  const geo = fillGeometry(width, height, ratio, orientation, direction, padding)
  const activeColor = activeFillColor(ratio, fillColor, fillColorLow, lowThreshold)
  drawFill(fill, geo, activeColor, fillGradientEnd, orientation, direction, cornerRadius)

  label
    .setText(labelText(value, maxValue, ratio, labelFormat))
    .setFontSize(labelFontSize)
    .setColor(labelColorHex(labelColor))
    .setPosition(width / 2, height / 2)
    .setVisible(showLabel)
}

export const progressBarComponent = {
  type: 'progressbar',
  label: 'Barre de progression',
  defaultProps,
  create,
  syncVisual,
}
