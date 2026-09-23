// Bouton image: an imported picture that behaves like a button — hover/
// pressed alternate textures come in later steps. Unlike Bouton (a
// Container with a background rectangle + label, since a Shape can't
// also hold text), the image itself IS the whole visual here, so this is
// just a single Phaser.GameObjects.Image, sized/positioned exactly like
// Image (see image.js, whose file-import flow — FileReader -> base64 ->
// textures.addBase64 -> addElement once decoded — this reuses, see
// PhaserCanvas.jsx's handleDrop/handleImageFileChange) — no Container
// needed until/unless a genuinely separate visual layer is added.
const defaultProps = {
  x: 0,
  y: 0,
  width: 200,
  height: 200,
  textureKey: '',
  // The full data: URL, kept in props (not just the texture cache key) —
  // same reason as image.js — so generateCode can embed it via a
  // generated scene.textures.addBase64(key, imageData) call, since the
  // live texture cache is only ever session-local.
  imageData: '',
  // A named click callback, same convention as Bouton — the editor
  // canvas itself never fires it (a click there always means select/
  // drag), only the exported code's real pointerup listener does.
  callback: 'onImageButtonClick',
  originX: 0,
  originY: 0,
}

function create(scene, props) {
  const { x, y, width, height, textureKey, originX, originY } = props
  return scene.add.image(x, y, textureKey).setDisplaySize(width, height).setOrigin(originX, originY)
}

// Escapes the data: URL for a single-quoted JS string literal. Base64 data
// URLs never actually contain a quote or backslash, but this costs nothing
// and matches the same defensive escaping image.js/text.js already do.
function escapeForLiteral(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

// Same async-texture shape as image.js's own generateCode (addBase64()
// decodes asynchronously, so the Image game object — and therefore its
// setInteractive()/click listener — can't exist until that decode
// finishes; isAsync tells generateScreenClass to leave this element out
// of the surrounding synchronous add([...]) list, see image.js's fuller
// note), plus a real click listener wired to the named callback. Fires on
// pointerup rather than pointerdown, same as Bouton: Phaser only delivers
// a GameObject's own pointerup when the release happens while the
// pointer is still hit-testing that object, so pressing on the button and
// dragging off before releasing does not fire the callback — the
// standard tap-to-cancel affordance.
function generateCode(element, containerRef = 'this') {
  const { name, x, y, width, height, textureKey, imageData, originX, originY, callback } = element.props
  return [
    `scene.textures.addBase64('${textureKey}', '${escapeForLiteral(imageData)}');`,
    `scene.textures.once('addtexture-${textureKey}', () => {`,
    `  this.${name} = scene.add.image(${Math.round(x)}, ${Math.round(y)}, '${textureKey}').setDisplaySize(${Math.round(width)}, ${Math.round(height)}).setOrigin(${originX}, ${originY});`,
    `  this.${name}.setInteractive({ useHandCursor: true });`,
    `  this.${name}.on('pointerup', () => this.${callback}());`,
    `  ${containerRef}.add(this.${name});`,
    `});`,
  ].join('\n    ')
}

// Read by generateScreenClass to build the deduplicated list of stub
// methods it appends to the class — same mechanism as Bouton's, so
// several image buttons can share a callback name without generating a
// duplicate stub.
function getCallbackNames({ props }) {
  return [props.callback].filter(Boolean)
}

function generateCallbackStub(name) {
  return [`  ${name}() {`, '    // TODO: implement', '  }'].join('\n')
}

export const imageButtonComponent = {
  type: 'imagebutton',
  label: 'Bouton image',
  defaultProps,
  create,
  generateCode,
  isAsync: true,
  getCallbackNames,
  generateCallbackStub,
}
