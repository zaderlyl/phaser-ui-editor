// Texte: a plain text label. Matches the cahier des charges' "Texte"
// component: position X/Y, contenu, taille de police, couleur, gras/italique.
// Kept simple for now — no resize handling (Phaser.GameObjects.Text
// auto-sizes from its own content/font, see EditorScene.resizeSelected's
// setSize guard).
const defaultProps = {
  x: 0,
  y: 0,
  text: 'Texte',
  fontSize: 24,
  color: 0xffffff,
  bold: false,
  italic: false,
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
  const { x, y, text, fontSize, color, bold, italic, originX, originY } = props
  return scene.add
    .text(x, y, text, {
      fontSize: `${fontSize}px`,
      color: toCssColor(color),
      fontStyle: toFontStyle(bold, italic),
    })
    .setOrigin(originX, originY)
}

// Escapes the content for a single-quoted JS string literal — the only
// characters that would otherwise break the generated code.
function escapeText(text) {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

function generateCode({ props }) {
  const { name, x, y, text, fontSize, color, bold, italic, originX, originY } = props
  const fontStyle = toFontStyle(bold, italic)
  return `this.${name} = scene.add.text(${Math.round(x)}, ${Math.round(y)}, '${escapeText(text)}', { fontSize: '${fontSize}px', color: '${toCssColor(color)}', fontStyle: '${fontStyle}' }).setOrigin(${originX}, ${originY});`
}

export const textComponent = {
  type: 'text',
  label: 'Texte',
  defaultProps,
  create,
  generateCode,
}
