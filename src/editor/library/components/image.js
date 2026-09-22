// Image: an uploaded picture placed on the canvas — position X/Y,
// largeur/hauteur (as a display size, not the source file's own
// resolution), ancrage. Unlike every other component, there's no
// sensible default content — placing one means picking a file first, so
// this doesn't go through addElement()/create() directly from a drop the
// way Panel/Texte/Bouton do. PhaserCanvas's drop handler triggers a native
// file picker, loads the chosen file into Phaser's texture cache
// (scene.textures.addBase64), and only calls addElement() once that
// texture is actually ready — by the time create() below runs, textureKey
// already refers to a loaded texture.
const defaultProps = {
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  textureKey: '',
  // The full data: URL, kept in props (not just the texture cache key)
  // so a later export step can embed it via a generated
  // this.textures.addBase64(key, imageData) call — the live texture
  // cache is only ever session-local.
  imageData: '',
  originX: 0,
  originY: 0,
}

function create(scene, props) {
  const { x, y, width, height, textureKey, originX, originY } = props
  return scene.add.image(x, y, textureKey).setDisplaySize(width, height).setOrigin(originX, originY)
}

export const imageComponent = {
  type: 'image',
  label: 'Image',
  defaultProps,
  create,
}
