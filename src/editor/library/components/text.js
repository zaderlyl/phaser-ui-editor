// Texte: a real text BOX, not just a label — position X/Y, width/height,
// contenu, taille de police, couleur, gras/italique, alignement horizontal
// et vertical, contour, padding. Alignment only means anything once the
// content can wrap inside a fixed-size area, so this uses Phaser's
// word-wrap + setFixedSize (a canvas cropped/padded to an exact size,
// independent of content) rather than Text's default auto-sizing — which
// is also what makes it draggable through the same resize handles every
// other sized component already uses (see
// EditorScene.resizeSelected/updateElementProps's setFixedSize branch).
const defaultProps = {
  x: 0,
  y: 0,
  width: 200,
  height: 100,
  text: 'Texte',
  fontSize: 24,
  color: 0xffffff,
  bold: false,
  italic: false,
  align: 'left',
  verticalAlign: 'top',
  padding: 0,
  strokeColor: 0x000000,
  strokeThickness: 0,
  originX: 0,
  originY: 0,
  rotation: 0,
  flipX: false,
  flipY: false,
}

// props.color is stored as a 0xRRGGBB number, same as every other
// component, so the properties panel's color picker works unchanged —
// Phaser's Text style wants a CSS color string instead, so it's converted
// here rather than changing the shared data model for one component.
function toCssColor(colorNumber) {
  return `#${colorNumber.toString(16).padStart(6, '0')}`
}

// bold/italic are two separate checkboxes in the properties panel, but
// Phaser's Text style takes them as one combined CSS font-style string.
function toFontStyle(bold, italic) {
  if (bold && italic) return 'bold italic'
  if (bold) return 'bold'
  if (italic) return 'italic'
  return 'normal'
}

// Phaser has no built-in "vertical align within a fixed box" — this
// pushes the text down using its own padding.top instead: how far down
// depends on how much shorter the actual rendered (wrapped) content is
// than the box, so it has to be recomputed from the GameObject's *current*
// line count every time anything that could change wrapping or vertical
// fit does (text, fontSize, width, height, padding or verticalAlign
// itself) — see EditorScene.updateElementProps/resizeSelected, the only
// other callers. go.style.metrics.{ascent,descent} (whose sum is
// style.metrics.fontSize) plus go.lineSpacing is the actual per-line
// height Phaser's own word-wrap uses, measured from the real canvas font
// rendering — verified empirically against a screenshot rather than
// assumed, since it's not documented as public API.
function applyTextLayout(gameObject, props) {
  const { width, height, padding, verticalAlign } = props
  gameObject.setWordWrapWidth(Math.max(0, width - padding * 2), true)

  const lineHeight = gameObject.style.metrics.fontSize + gameObject.lineSpacing
  const contentHeight = gameObject.getWrappedText().length * lineHeight
  const extraTop =
    verticalAlign === 'middle'
      ? Math.max(0, (height - contentHeight) / 2)
      : verticalAlign === 'bottom'
        ? Math.max(0, height - contentHeight)
        : 0

  gameObject.setPadding({ left: padding, right: padding, top: padding + extraTop, bottom: padding })
}

function create(scene, props) {
  const {
    x,
    y,
    width,
    height,
    text,
    fontSize,
    color,
    bold,
    italic,
    align,
    strokeColor,
    strokeThickness,
    originX,
    originY,
    rotation,
    flipX,
    flipY,
  } = props
  const textObject = scene.add
    .text(x, y, text, {
      fontSize: `${fontSize}px`,
      color: toCssColor(color),
      fontStyle: toFontStyle(bold, italic),
      align,
      stroke: toCssColor(strokeColor),
      strokeThickness,
      wordWrap: { width, useAdvancedWrap: true },
    })
    .setOrigin(originX, originY)
    .setAngle(rotation)
    .setFlip(flipX, flipY)
  textObject.setFixedSize(width, height)
  applyTextLayout(textObject, props)
  return textObject
}

// Escapes the content for a single-quoted JS string literal — the only
// characters that would otherwise break the generated code.
function escapeText(text) {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

function generateCode({ props }) {
  const {
    name,
    x,
    y,
    width,
    height,
    text,
    fontSize,
    color,
    bold,
    italic,
    align,
    verticalAlign,
    padding,
    strokeColor,
    strokeThickness,
    originX,
    originY,
    rotation,
    flipX,
    flipY,
  } = props
  const fontStyle = toFontStyle(bold, italic)
  const wrapWidth = Math.max(0, Math.round(width) - padding * 2)
  const base = `this.${name} = scene.add.text(${Math.round(x)}, ${Math.round(y)}, '${escapeText(text)}', { fontSize: '${fontSize}px', color: '${toCssColor(color)}', fontStyle: '${fontStyle}', align: '${align}', stroke: '${toCssColor(strokeColor)}', strokeThickness: ${strokeThickness}, wordWrap: { width: ${wrapWidth}, useAdvancedWrap: true } }).setOrigin(${originX}, ${originY}).setFixedSize(${Math.round(width)}, ${Math.round(height)}).setAngle(${Math.round(rotation)}).setFlip(${flipX}, ${flipY});`

  if (padding === 0 && verticalAlign === 'top') {
    return base
  }

  // Centering/bottom-aligning needs the actual rendered line count, which
  // depends on the font's real canvas metrics — computed at runtime here
  // the same way the editor computes it live (applyTextLayout above),
  // rather than baking in a number that could drift from a different
  // environment's font rendering.
  const extraTopExpr =
    verticalAlign === 'middle'
      ? `Math.max(0, (${Math.round(height)} - contentHeight) / 2)`
      : verticalAlign === 'bottom'
        ? `Math.max(0, ${Math.round(height)} - contentHeight)`
        : '0'

  return [
    base,
    '{',
    `  const lineHeight = this.${name}.style.metrics.fontSize + this.${name}.lineSpacing;`,
    `  const contentHeight = this.${name}.getWrappedText().length * lineHeight;`,
    `  const extraTop = ${extraTopExpr};`,
    `  this.${name}.setPadding({ left: ${padding}, right: ${padding}, top: ${padding} + extraTop, bottom: ${padding} });`,
    '}',
  ].join('\n')
}

export const textComponent = {
  type: 'text',
  label: 'Texte',
  defaultProps,
  create,
  generateCode,
  applyTextLayout,
}
