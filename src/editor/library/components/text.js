// Texte: a real text BOX, not just a label — position X/Y, width/height,
// contenu, taille de police, couleur, gras/italique, alignement, contour.
// Alignment
// only means anything once the content can wrap inside a fixed-size area,
// so this uses Phaser's word-wrap + setFixedSize (a canvas cropped/padded
// to an exact size, independent of content) rather than Text's default
// auto-sizing — which is also what makes it draggable through the same
// resize handles every other sized component already uses (see
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
  strokeColor: 0x000000,
  strokeThickness: 0,
  originX: 0,
  originY: 0,
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
  textObject.setFixedSize(width, height)
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
    strokeColor,
    strokeThickness,
    originX,
    originY,
  } = props
  const fontStyle = toFontStyle(bold, italic)
  return `this.${name} = scene.add.text(${Math.round(x)}, ${Math.round(y)}, '${escapeText(text)}', { fontSize: '${fontSize}px', color: '${toCssColor(color)}', fontStyle: '${fontStyle}', align: '${align}', stroke: '${toCssColor(strokeColor)}', strokeThickness: ${strokeThickness}, wordWrap: { width: ${Math.round(width)}, useAdvancedWrap: true } }).setOrigin(${originX}, ${originY}).setFixedSize(${Math.round(width)}, ${Math.round(height)});`
}

export const textComponent = {
  type: 'text',
  label: 'Texte',
  defaultProps,
  create,
  generateCode,
}
