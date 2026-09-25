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
  // opt-in, like every other advanced knob here. Only takes effect with
  // square corners (cornerRadius 0 for the fill's own rounded corners,
  // see drawFill) — Phaser's fillGradientStyle doesn't interpolate
  // correctly across fillRoundedRect's arc tessellation, confirmed via a
  // real pixel scan, so a rounded fill falls back to a flat colorStart.
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
  // 0 or 1 means a continuous fill, as before this prop existed — 2+
  // splits the fill area into that many equal blocks (a "life pips" look,
  // à la Zelda) instead, each one either fully lit or not — no partial
  // fill within a block. Segmented mode keeps it simple for now: a flat
  // activeFillColor per lit block (no gradient — a gradient's "natural
  // reading direction across the whole bar" doesn't map cleanly onto
  // separate blocks) and no per-block corner rounding (only the track
  // itself still respects cornerRadius).
  segments: 0,
  segmentGap: 4,
  // A diagonal two-color (activeFillColor + stripeColor) stripe pattern
  // instead of a flat/gradient fill — the classic "in progress" barber-
  // pole look. Takes precedence over the gradient (fillGradientEnd is
  // ignored while striped) but not over segments (segmented still wins if
  // both are set, since combining discrete blocks with diagonal stripes
  // needs its own per-block handling this doesn't attempt yet); square
  // corners regardless of cornerRadius, same simplification as segmented
  // mode.
  striped: false,
  stripeColor: 0xffffff,
  stripeWidth: 16,
  // An optional icon just before/after the bar (e.g. a heart next to a
  // life bar) — empty key means no icon, same as Image's own textureKey/
  // imageData pair (imageData is kept only for a future export step, same
  // reason as image.js — the live texture cache is session-local).
  // Positioned outside the bar's own width/height box (so it's visible
  // but not part of the container's hit area/selection bounds — a purely
  // decorative extension, not draggable/resizable on its own).
  iconStartKey: '',
  iconStartData: '',
  iconEndKey: '',
  iconEndData: '',
  iconSize: 32,
  iconGap: 8,
  // Generic (gated on 'visible' in props in PropertiesPanel.jsx, not
  // specific to ProgressBar) show/hide toggle — lets a créa keep a bar
  // around without deleting it (e.g. one meant to be shown later by code
  // they'll write once export exists) while it stays selectable from the
  // layers panel, same as a hidden layer in Figma.
  visible: true,
  originX: 0,
  originY: 0,
  rotation: 0,
  flipX: false,
  flipY: false,
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

// One rect per segment, in *value order* (index 0 is the first to light
// up, i.e. the one on the anchored edge — see fillGeometry's identical
// anchor convention), each innerWidth/innerHeight-sized on the
// cross-axis and evenly sized/spaced along the growth axis within the
// padded area. Physical (left-to-right / top-to-bottom) position is
// computed first, then reversed for value order when direction is
// 'reversed' (whose anchor is the opposite edge).
function segmentRects(width, height, orientation, direction, padding, segments, segmentGap) {
  const innerWidth = Math.max(0, width - padding * 2)
  const innerHeight = Math.max(0, height - padding * 2)
  const count = Math.max(2, Math.round(segments))
  const gapTotal = segmentGap * (count - 1)

  if (orientation === 'vertical') {
    const segH = Math.max(0, (innerHeight - gapTotal) / count)
    const physical = Array.from({ length: count }, (_, i) => ({
      x: padding,
      y: padding + i * (segH + segmentGap),
      width: innerWidth,
      height: segH,
    }))
    // Physical order is top-to-bottom; 'normal' fills bottom-to-top, so
    // the bottom-most (last physical) rect is first in value order.
    return direction === 'reversed' ? physical : physical.slice().reverse()
  }

  const segW = Math.max(0, (innerWidth - gapTotal) / count)
  const physical = Array.from({ length: count }, (_, i) => ({
    x: padding + i * (segW + segmentGap),
    y: padding,
    width: segW,
    height: innerHeight,
  }))
  return direction === 'reversed' ? physical.slice().reverse() : physical
}

// "60%" for labelFormat 'percent', "60/100" (the raw value and maxValue,
// unadjusted for minValue — the common case is minValue 0 anyway) for
// 'value'.
function labelText(value, maxValue, ratio, labelFormat) {
  return labelFormat === 'value'
    ? `${Math.round(value)}/${Math.round(maxValue)}`
    : `${Math.round(ratio * 100)}%`
}

function colorToHex(color) {
  return `#${color.toString(16).padStart(6, '0')}`
}

// A seamless 45°-diagonal two-color tile: color1 fills the whole tile,
// then a color2 triangle covers the half above the tile's own main
// diagonal. Tiled edge-to-edge (via a TileSprite, see syncStripeTile),
// each tile's diagonal edge lines up with its neighbors', so the result
// reads as continuous parallel stripes rather than a checkerboard — the
// standard, simplest way to build a diagonal stripe texture without
// per-pixel drawing or masking. tileSize doubles as the visual stripe
// width. Reuses (redraws into) the same canvas texture on every call
// rather than creating a new one, since colors/width can change live from
// the properties panel and Phaser has no "just recolor this Graphics"
// equivalent for a texture.
function drawStripeTexture(scene, key, color1, color2, tileSize) {
  const texture = scene.textures.exists(key) ? scene.textures.get(key) : scene.textures.createCanvas(key, tileSize, tileSize)
  if (texture.width !== tileSize || texture.height !== tileSize) texture.setSize(tileSize, tileSize)

  const ctx = texture.getContext()
  ctx.clearRect(0, 0, tileSize, tileSize)
  ctx.fillStyle = colorToHex(color1)
  ctx.fillRect(0, 0, tileSize, tileSize)
  ctx.fillStyle = colorToHex(color2)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(tileSize, 0)
  ctx.lineTo(tileSize, tileSize)
  ctx.closePath()
  ctx.fill()
  texture.refresh()
}

// Creates, updates or hides the striped-mode TileSprite — a plain
// rectangle tiled with the stripe texture above, sized/positioned exactly
// like the continuous fill's own geometry (no rounding: see the
// defaultProps note on why). Needs the scene the same way syncIconSlot
// does, for the same reason (creating a new game object on the fly the
// first time it's actually needed).
function syncStripeTile(container, scene, geo, color1, color2, tileSize) {
  let tile = container.getData('stripeTile')

  if (geo.width <= 0 || geo.height <= 0) {
    tile?.setVisible(false)
    return
  }

  let textureKey = container.getData('stripeTextureKey')
  if (!textureKey) {
    textureKey = `progressbar-stripe-${crypto.randomUUID()}`
    container.setData('stripeTextureKey', textureKey)
  }
  drawStripeTexture(scene, textureKey, color1, color2, tileSize)

  if (!tile) {
    tile = scene.add.tileSprite(geo.x, geo.y, geo.width, geo.height, textureKey).setOrigin(0, 0)
    container.add(tile)
    container.setData('stripeTile', tile)
  }
  tile.setTexture(textureKey).setPosition(geo.x, geo.y).setSize(geo.width, geo.height).setVisible(true)
}

// Where a 'Start'/'End' icon sits, centered outside the bar's own box —
// before the bar (left for horizontal, above for vertical) for 'Start',
// after it (right / below) for 'End'. Always the bar's literal geometric
// start/end, independent of direction (which only affects the fill
// animation, not where these fixed decorations sit).
function iconPosition(slot, orientation, width, height, iconSize, iconGap) {
  const offset = iconGap + iconSize / 2
  if (orientation === 'vertical') {
    return slot === 'Start' ? { x: width / 2, y: -offset } : { x: width / 2, y: height + offset }
  }
  return slot === 'Start' ? { x: -offset, y: height / 2 } : { x: width + offset, y: height / 2 }
}

// Creates, updates or hides one icon slot's Image child. Needs the scene
// to create the Image the first time a slot actually gets a texture (see
// EditorScene's syncCompositeVisual, which passes it through) — an empty
// key just hides whatever's there rather than destroying it, so picking a
// new icon later doesn't need to recreate the game object.
function syncIconSlot(container, scene, slot, props) {
  const textureKey = props[`icon${slot}Key`]
  const dataKey = `icon${slot}`
  let icon = container.getData(dataKey)

  if (!textureKey) {
    icon?.setVisible(false)
    return
  }

  const { width, height, iconSize, orientation } = props
  const { x, y } = iconPosition(slot, orientation, width, height, iconSize, props.iconGap)

  if (!icon) {
    icon = scene.add.image(x, y, textureKey)
    // Sitting outside the bar's own width/height box (see iconPosition),
    // an icon would otherwise expand Container.getBounds() — which unions
    // every child that implements getBounds() — beyond the nominal box,
    // throwing off resizeSelected/updateElementProps' size math (both
    // compute from that same getBounds()). Phaser already skips a child
    // from that union when it has no getBounds() at all (that's how
    // Graphics — background/fill here — stays out of it, see
    // boundsZone's own comment); doing the same here keeps the icon
    // purely decorative, the same way.
    icon.getBounds = undefined
    container.add(icon)
    container.setData(dataKey, icon)
  }
  icon.setTexture(textureKey).setDisplaySize(iconSize, iconSize).setPosition(x, y).setVisible(true)
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

  const radius = fillCornerRadius(cornerRadius, geo, orientation, direction)

  if (radius === 0) {
    if (orientation === 'vertical') {
      graphics.fillGradientStyle(colorStart, colorStart, colorEnd, colorEnd, 1)
    } else {
      graphics.fillGradientStyle(colorStart, colorEnd, colorStart, colorEnd, 1)
    }
    graphics.fillRect(geo.x, geo.y, geo.width, geo.height)
  } else {
    // fillGradientStyle's 4 corner colors assume a plain rectangle's own
    // triangulation — confirmed (via a real pixel scan, not just visual
    // inspection) to interpolate incorrectly once fillRoundedRect's arc
    // tessellation is involved instead, producing a non-monotonic, banded
    // result rather than a clean gradient. Falling back to a solid
    // colorStart fill avoids that rather than shipping a broken-looking
    // gradient; the two-color gradient stays available on square corners.
    graphics.fillStyle(colorStart, 1)
    graphics.fillRoundedRect(geo.x, geo.y, geo.width, geo.height, radius)
  }
}

// Segmented mode: as many of the (value-ordered, see segmentRects) blocks
// as `ratio` covers are drawn solid in activeColor; the rest are left
// undrawn, so the track shows through them and through the gaps between
// blocks exactly as if they'd been drawn in backgroundColor. No gradient,
// no per-block rounding — see the defaultProps note on why.
function drawSegmentedFill(graphics, width, height, orientation, direction, padding, segments, segmentGap, ratio, activeColor) {
  graphics.clear()
  const rects = segmentRects(width, height, orientation, direction, padding, segments, segmentGap)
  const litCount = Math.round(ratio * rects.length)

  graphics.fillStyle(activeColor, 1)
  for (let i = 0; i < litCount; i += 1) {
    const rect = rects[i]
    if (rect.width > 0 && rect.height > 0) graphics.fillRect(rect.x, rect.y, rect.width, rect.height)
  }
}

// Dispatches to the continuous or segmented renderer depending on
// segments — shared by create() and syncVisual() so both always agree on
// which mode is active.
function renderFill(container, scene, props, ratio, activeColor) {
  const {
    width,
    height,
    orientation,
    direction,
    padding,
    cornerRadius,
    fillGradientEnd,
    segments,
    segmentGap,
    striped,
    stripeColor,
    stripeWidth,
  } = props
  const fill = container.getData('fill')
  const stripeTile = container.getData('stripeTile')

  if (segments > 1) {
    stripeTile?.setVisible(false)
    drawSegmentedFill(fill, width, height, orientation, direction, padding, segments, segmentGap, ratio, activeColor)
    return
  }

  if (striped) {
    fill.clear()
    const geo = fillGeometry(width, height, ratio, orientation, direction, padding)
    syncStripeTile(container, scene, geo, activeColor, stripeColor, stripeWidth)
    return
  }

  stripeTile?.setVisible(false)
  const geo = fillGeometry(width, height, ratio, orientation, direction, padding)
  drawFill(fill, geo, activeColor, fillGradientEnd, orientation, direction, cornerRadius)
}

function create(scene, props) {
  const {
    x,
    y,
    width,
    height,
    backgroundColor,
    fillColor,
    fillColorLow,
    lowThreshold,
    value,
    minValue,
    maxValue,
    strokeColor,
    strokeThickness,
    cornerRadius,
    showLabel,
    labelFormat,
    labelColor,
    labelFontSize,
    visible,
    originX,
    originY,
    rotation,
    flipX,
    flipY,
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

  // Drawn into (or left empty in favor of the stripeTile) below, once the
  // container actually exists — renderFill needs it (via container.
  // getData) to find/create the striped-mode TileSprite too.
  const fill = scene.add.graphics()
  const ratio = fillRatio(value, minValue, maxValue)
  const activeColor = activeFillColor(ratio, fillColor, fillColorLow, lowThreshold)

  const label = scene.add
    .text(width / 2, height / 2, labelText(value, maxValue, ratio, labelFormat), {
      fontSize: `${labelFontSize}px`,
      color: colorToHex(labelColor),
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
  container.setAngle(rotation)
  container.setScale(flipX ? -1 : 1, flipY ? -1 : 1)
  container.setVisible(visible)
  container.setData('boundsZone', boundsZone)
  container.setData('background', background)
  container.setData('fill', fill)
  container.setData('label', label)

  renderFill(container, scene, props, ratio, activeColor)
  syncIconSlot(container, scene, 'Start', props)
  syncIconSlot(container, scene, 'End', props)

  return container
}

// Resyncs the background, fill, label and icons to the current props —
// needed after any change to width/height/backgroundColor/fillColor/
// fillGradientEnd/fillColorLow/lowThreshold/value/minValue/maxValue/
// orientation/direction/strokeColor/strokeThickness/padding/cornerRadius/
// segments/segmentGap/striped/stripeColor/stripeWidth/showLabel/
// labelFormat/labelColor/labelFontSize/icon*, since none of those live on
// the Container itself (see EditorScene's syncCompositeVisual, the only
// caller — also the source of the `scene` argument, needed the first time
// an icon slot or the striped TileSprite gets created).
function syncVisual(container, props, scene) {
  const {
    width,
    height,
    backgroundColor,
    fillColor,
    fillColorLow,
    lowThreshold,
    value,
    minValue,
    maxValue,
    strokeColor,
    strokeThickness,
    cornerRadius,
    showLabel,
    labelFormat,
    labelColor,
    labelFontSize,
    visible,
  } = props
  const boundsZone = container.getData('boundsZone')
  const background = container.getData('background')
  const label = container.getData('label')

  container.setVisible(visible)
  boundsZone.setSize(width, height)

  drawBackground(background, width, height, backgroundColor, strokeColor, strokeThickness, cornerRadius)

  const ratio = fillRatio(value, minValue, maxValue)
  const activeColor = activeFillColor(ratio, fillColor, fillColorLow, lowThreshold)
  renderFill(container, scene, props, ratio, activeColor)

  label
    .setText(labelText(value, maxValue, ratio, labelFormat))
    .setFontSize(labelFontSize)
    .setColor(colorToHex(labelColor))
    .setPosition(width / 2, height / 2)
    .setVisible(showLabel)

  syncIconSlot(container, scene, 'Start', props)
  syncIconSlot(container, scene, 'End', props)
}

// The fill's runtime position/size as JS expression strings (not numbers —
// these end up as literal code in the generated file) in terms of a
// `ratio` variable that only exists inside the generated setValue
// closure. width/height/padding/orientation/direction are all static
// (baked in at export time, like everything else here) — only the value
// passed to setValue at runtime varies — so this is the exact same
// branching as fillGeometry, just emitting code instead of computing a
// number directly.
function fillGeometryExpr(width, height, padding, orientation, direction) {
  const innerWidth = Math.round(width - padding * 2)
  const innerHeight = Math.round(height - padding * 2)
  if (orientation === 'vertical') {
    return direction === 'reversed'
      ? { xExpr: `${padding}`, yExpr: `${padding}`, widthExpr: `${innerWidth}`, heightExpr: `${innerHeight} * ratio` }
      : {
          xExpr: `${padding}`,
          yExpr: `${padding} + ${innerHeight} - fillHeight`,
          widthExpr: `${innerWidth}`,
          heightExpr: `${innerHeight} * ratio`,
        }
  }
  return direction === 'reversed'
    ? {
        xExpr: `${padding} + ${innerWidth} - fillWidth`,
        yExpr: `${padding}`,
        widthExpr: `${innerWidth} * ratio`,
        heightExpr: `${innerHeight}`,
      }
    : { xExpr: `${padding}`, yExpr: `${padding}`, widthExpr: `${innerWidth} * ratio`, heightExpr: `${innerHeight}` }
}

// Same anchored-corners rule as fillCornerRadius, as a literal object
// expression using the runtime `radius` variable for the two rounded
// corners (0 for the other two) — orientation/direction pick which two,
// statically, at export time.
function radiusObjectExpr(orientation, direction) {
  if (orientation === 'vertical') {
    return direction === 'reversed' ? '{ tl: radius, tr: radius, bl: 0, br: 0 }' : '{ tl: 0, tr: 0, bl: radius, br: radius }'
  }
  return direction === 'reversed' ? '{ tl: 0, tr: radius, bl: 0, br: radius }' : '{ tl: radius, tr: 0, bl: radius, br: 0 }'
}

// Exports the bar with a genuine runtime API — `this.<name>.setValue(v)` —
// rather than a fixed snapshot of whatever value the canvas happened to
// show at export time, since the entire point of a progress bar is
// representing something that changes during play (health, a loading
// percentage, ...); a static picture would make the component pointless
// to export. setValue is a plain closure attached directly to the
// Container instance (not a method on the Screen class keyed by name)
// so multiple bars on one screen each carry their own, with no name
// collision to worry about, and reads naturally as `myBar.setValue(75)`
// on the bar itself. Its body mirrors fillGeometry/fillCornerRadius/
// activeFillColor/labelText exactly, just emitted as code (see
// fillGeometryExpr/radiusObjectExpr) instead of computed as numbers,
// since only `value` is meant to vary after export — width/height/
// orientation/direction/padding/colors are all baked in, same as
// everything else this component exports.
//
// segments, striped and the icon slots aren't supported yet — each needs
// its own generated-code shape (a segment loop; a tileable stripe texture
// baked as base64, similar to Image; an async icon load, again similar to
// Image) a value-driven redraw doesn't need on its own. Throwing here
// (matching the existing "doesn't support code generation yet" error for
// a type with no generateCode at all) beats silently exporting a bar that
// looks different from the one on the canvas.
function generateCode({ props }) {
  if (props.segments > 1) {
    throw new Error('ProgressBar export does not support segmented mode yet')
  }
  if (props.striped) {
    throw new Error('ProgressBar export does not support the striped fill yet')
  }
  if (props.iconStartKey || props.iconEndKey) {
    throw new Error('ProgressBar export does not support icons yet')
  }

  const {
    name,
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
    visible,
    rotation,
    flipX,
    flipY,
  } = props

  const hexBackground = `0x${backgroundColor.toString(16).padStart(6, '0')}`
  const hexStroke = `0x${strokeColor.toString(16).padStart(6, '0')}`
  const hexFillColor = `0x${fillColor.toString(16).padStart(6, '0')}`
  const hexFillColorLow = `0x${fillColorLow.toString(16).padStart(6, '0')}`
  const hexFillEnd = `0x${fillGradientEnd.toString(16).padStart(6, '0')}`
  const w = Math.round(width)
  const h = Math.round(height)
  const range = maxValue - minValue

  const lines = [`this.${name} = new Phaser.GameObjects.Container(scene, ${Math.round(x)}, ${Math.round(y)});`]

  lines.push(`this.${name}Background = scene.add.graphics();`)
  lines.push(`this.${name}Background.fillStyle(${hexBackground}, 1);`)
  lines.push(
    cornerRadius > 0
      ? `this.${name}Background.fillRoundedRect(0, 0, ${w}, ${h}, ${Math.round(cornerRadius)});`
      : `this.${name}Background.fillRect(0, 0, ${w}, ${h});`,
  )
  if (strokeThickness > 0) {
    lines.push(`this.${name}Background.lineStyle(${strokeThickness}, ${hexStroke}, 1);`)
    lines.push(
      cornerRadius > 0
        ? `this.${name}Background.strokeRoundedRect(0, 0, ${w}, ${h}, ${Math.round(cornerRadius)});`
        : `this.${name}Background.strokeRect(0, 0, ${w}, ${h});`,
    )
  }

  lines.push(`this.${name}Fill = scene.add.graphics();`)
  const children = [`this.${name}Background`, `this.${name}Fill`]

  if (showLabel) {
    lines.push(
      `this.${name}Label = scene.add.text(${w / 2}, ${h / 2}, '', { fontSize: '${labelFontSize}px', color: '${colorToHex(labelColor)}' }).setOrigin(0.5, 0.5);`,
    )
    children.push(`this.${name}Label`)
  }

  lines.push(`this.${name}.add([${children.join(', ')}]);`)
  lines.push(`this.${name}.setSize(${w}, ${h});`)
  lines.push(`this.${name}.setAngle(${Math.round(rotation)});`)
  lines.push(`this.${name}.setScale(${flipX ? -1 : 1}, ${flipY ? -1 : 1});`)

  const geoExpr = fillGeometryExpr(width, height, padding, orientation, direction)
  const setValueBody = [
    `  const ratio = Math.max(0, Math.min(1, ${range > 0 ? `(value - ${minValue}) / ${range}` : '0'}));`,
    `  const activeColor = ratio * 100 <= ${lowThreshold} ? ${hexFillColorLow} : ${hexFillColor};`,
    `  const fillWidth = ${geoExpr.widthExpr};`,
    `  const fillHeight = ${geoExpr.heightExpr};`,
    `  this.${name}Fill.clear();`,
    `  if (fillWidth > 0 && fillHeight > 0) {`,
  ]
  if (cornerRadius > 0) {
    setValueBody.push(
      `    const radius = Math.min(${cornerRadius}, fillWidth / 2, fillHeight / 2);`,
      `    this.${name}Fill.fillStyle(activeColor, 1);`,
      `    this.${name}Fill.fillRoundedRect(${geoExpr.xExpr}, ${geoExpr.yExpr}, fillWidth, fillHeight, ${radiusObjectExpr(orientation, direction)});`,
    )
  } else {
    // See drawFill's comment: fillGradientStyle only interpolates
    // correctly across a plain fillRect, not fillRoundedRect's arc
    // tessellation — confirmed via a real pixel scan of the rendered
    // output, not just visual inspection.
    setValueBody.push(
      orientation === 'vertical'
        ? `    this.${name}Fill.fillGradientStyle(activeColor, activeColor, ${hexFillEnd}, ${hexFillEnd}, 1);`
        : `    this.${name}Fill.fillGradientStyle(activeColor, ${hexFillEnd}, activeColor, ${hexFillEnd}, 1);`,
      `    this.${name}Fill.fillRect(${geoExpr.xExpr}, ${geoExpr.yExpr}, fillWidth, fillHeight);`,
    )
  }
  setValueBody.push(`  }`)
  if (showLabel) {
    setValueBody.push(
      labelFormat === 'value'
        ? `  this.${name}Label.setText(Math.round(value) + '/' + ${maxValue});`
        : `  this.${name}Label.setText(Math.round(ratio * 100) + '%');`,
    )
  }
  setValueBody.push(`  this.${name}.value = value;`)

  lines.push(`this.${name}.setValue = (value) => {`, ...setValueBody, `};`)
  lines.push(`this.${name}.setValue(${value});`)
  if (!visible) lines.push(`this.${name}.setVisible(false);`)

  return lines.join('\n    ')
}

export const progressBarComponent = {
  type: 'progressbar',
  label: 'Barre de progression',
  defaultProps,
  create,
  syncVisual,
  generateCode,
}
