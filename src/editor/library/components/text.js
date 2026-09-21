// Texte: a plain text label. Matches the cahier des charges' "Texte"
// component: position X/Y, contenu, taille de police, couleur. Kept simple
// for now — no resize handling (Phaser.GameObjects.Text auto-sizes from its
// content/font, see EditorScene.resizeSelected's setSize guard).
const defaultProps = {
  x: 0,
  y: 0,
  text: 'Texte',
  fontSize: 24,
  color: 0xffffff,
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

function create(scene, props) {
  const { x, y, text, fontSize, color, originX, originY } = props
  return scene.add
    .text(x, y, text, { fontSize: `${fontSize}px`, color: toCssColor(color) })
    .setOrigin(originX, originY)
}

// Escapes the content for a single-quoted JS string literal — the only
// characters that would otherwise break the generated code.
function escapeText(text) {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

function generateCode({ props }) {
  const { name, x, y, text, fontSize, color, originX, originY } = props
  return `this.${name} = scene.add.text(${Math.round(x)}, ${Math.round(y)}, '${escapeText(text)}', { fontSize: '${fontSize}px', color: '${toCssColor(color)}' }).setOrigin(${originX}, ${originY});`
}

export const textComponent = {
  type: 'text',
  label: 'Texte',
  defaultProps,
  create,
  generateCode,
}
