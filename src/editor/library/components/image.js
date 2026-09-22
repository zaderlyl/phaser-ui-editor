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

// Escapes the data: URL for a single-quoted JS string literal. Base64 data
// URLs never actually contain a quote or backslash, but this costs nothing
// and matches the same defensive escaping text.js already does for its
// (genuinely free-form, user-typed) content.
function escapeForLiteral(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

// Unlike every other component, this can't be a single synchronous
// `this.<name> = scene.add.X(...)` line: addBase64() decodes the image
// asynchronously (a real HTMLImageElement load under the hood, exactly
// like the live editor's own import flow — see PhaserCanvas's
// handleImageFileChange), so the Image game object doesn't exist yet by
// the time the constructor would otherwise reach its `this.add([...])`
// line. It adds itself into containerRef (the Screen itself at top level,
// or the enclosing group's container — see generateScreenClass/
// generateGroupCode, the only callers that pass it) once its own texture
// is actually ready instead. isAsync tells generateScreenClass to leave
// this element out of that surrounding synchronous add([...]) list.
function generateCode(element, containerRef = 'this') {
  const { name, x, y, width, height, textureKey, imageData, originX, originY } = element.props
  return [
    // Screen extends Container, not Scene — textures lives on the scene
    // passed into the constructor, not on `this`.
    `scene.textures.addBase64('${textureKey}', '${escapeForLiteral(imageData)}');`,
    `scene.textures.once('addtexture-${textureKey}', () => {`,
    `  this.${name} = scene.add.image(${Math.round(x)}, ${Math.round(y)}, '${textureKey}').setDisplaySize(${Math.round(width)}, ${Math.round(height)}).setOrigin(${originX}, ${originY});`,
    `  ${containerRef}.add(this.${name});`,
    `});`,
  ].join('\n    ')
}

export const imageComponent = {
  type: 'image',
  label: 'Image',
  defaultProps,
  create,
  generateCode,
  isAsync: true,
}
