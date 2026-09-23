// Bouton image: an imported picture that behaves like a button — a named
// click callback and hover/pressed alternate textures come in later
// steps. Unlike Bouton (a Container with a background rectangle + label,
// since a Shape can't also hold text), the image itself IS the whole
// visual here, so for now this is just a single Phaser.GameObjects.Image,
// sized/positioned exactly like Image (see image.js, whose file-import
// flow — FileReader -> base64 -> textures.addBase64 -> addElement once
// decoded — this reuses, see PhaserCanvas.jsx's handleDrop/
// handleImageFileChange) — no Container needed until/unless a genuinely
// separate visual layer is added.
const defaultProps = {
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  textureKey: '',
  // The full data: URL, kept in props (not just the texture cache key) —
  // same reason as image.js — so a later export step can embed it via a
  // generated this.textures.addBase64(key, imageData) call, since the
  // live texture cache is only ever session-local.
  imageData: '',
  originX: 0,
  originY: 0,
}

function create(scene, props) {
  const { x, y, width, height, textureKey, originX, originY } = props
  return scene.add.image(x, y, textureKey).setDisplaySize(width, height).setOrigin(originX, originY)
}

export const imageButtonComponent = {
  type: 'imagebutton',
  label: 'Bouton image',
  defaultProps,
  create,
}
