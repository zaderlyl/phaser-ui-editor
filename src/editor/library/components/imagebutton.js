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
  // An optional alternate texture shown on pointerover, swapped back on
  // pointerout — empty key means no hover state (opt-in, like every
  // advanced Bouton/ProgressBar knob). Only ever matters in the exported
  // code, same reason as callback above: the editor canvas never
  // simulates hover.
  hoverTextureKey: '',
  hoverImageData: '',
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
//
// The optional hover texture's own addBase64/once is nested *inside* the
// normal texture's callback (rather than alongside it) so this.<name>
// definitely exists — and so pointerover/pointerout definitely have
// something to attach to — before that second decode can possibly
// resolve, regardless of which of the two images happens to finish
// decoding first. Each swap reapplies setDisplaySize(): setTexture()
// alone resets display size to the new texture's own native dimensions
// (the same gotcha replaceImage/ProgressBar's icon slots already handle),
// which would make the button visibly change size on hover if the two
// pictures don't happen to share a resolution.
function generateCode(element, containerRef = 'this') {
  const { name, x, y, width, height, textureKey, imageData, hoverTextureKey, hoverImageData, originX, originY, callback } =
    element.props
  const w = Math.round(width)
  const h = Math.round(height)

  const lines = [
    `scene.textures.addBase64('${textureKey}', '${escapeForLiteral(imageData)}');`,
    `scene.textures.once('addtexture-${textureKey}', () => {`,
    `  this.${name} = scene.add.image(${Math.round(x)}, ${Math.round(y)}, '${textureKey}').setDisplaySize(${w}, ${h}).setOrigin(${originX}, ${originY});`,
    `  this.${name}.setInteractive({ useHandCursor: true });`,
    `  this.${name}.on('pointerup', () => this.${callback}());`,
  ]

  if (hoverTextureKey) {
    lines.push(
      `  scene.textures.addBase64('${hoverTextureKey}', '${escapeForLiteral(hoverImageData)}');`,
      `  scene.textures.once('addtexture-${hoverTextureKey}', () => {`,
      `    this.${name}.on('pointerover', () => this.${name}.setTexture('${hoverTextureKey}').setDisplaySize(${w}, ${h}));`,
      `    this.${name}.on('pointerout', () => this.${name}.setTexture('${textureKey}').setDisplaySize(${w}, ${h}));`,
      `  });`,
    )
  }

  lines.push(`  ${containerRef}.add(this.${name});`, `});`)

  return lines.join('\n    ')
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
