// Bouton image: an imported picture that behaves like a button, with
// optional hover/pressed alternate textures. Unlike Bouton (a
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
  // An optional alternate texture shown on pointerdown, swapped away on
  // pointerup — same opt-in/export-only rule as hoverTextureKey.
  pressedTextureKey: '',
  pressedImageData: '',
  // Unlike hoverTextureKey, these fire independently of whether a hover
  // texture is even set — a créa might want a hover sound or tooltip with
  // no visual texture swap at all. Empty means "no extra call, no stub
  // generated for it", same convention as Bouton's own opt-in hover
  // callbacks.
  hoverCallback: '',
  hoverOutCallback: '',
  originX: 0,
  originY: 0,
  rotation: 0,
}

function create(scene, props) {
  const { x, y, width, height, textureKey, originX, originY, rotation } = props
  return scene.add
    .image(x, y, textureKey)
    .setDisplaySize(width, height)
    .setOrigin(originX, originY)
    .setAngle(rotation)
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
// The optional hover/pressed textures' own addBase64/once are each
// nested *inside* the normal texture's callback (rather than alongside
// it) so this.<name> definitely exists — and so pointerover/pointerout/
// pointerdown definitely have something to attach to — before either
// decode can possibly resolve, regardless of decode order; hover and
// pressed are independent of each other, so neither is nested inside the
// other. Each swap reapplies setDisplaySize(): setTexture() alone resets
// display size to the new texture's own native dimensions (the same
// gotcha replaceImage/ProgressBar's icon slots already handle), which
// would make the button visibly change size on hover/press if the
// pictures don't happen to share a resolution.
//
// pointerup reverts to the *hover* texture rather than straight to
// normal (falling back to normal if there's no hover texture) before
// firing the callback — same reasoning as Bouton's own color revert:
// releasing while the pointer is still over the button should leave it
// looking hovered, not suddenly idle. Harmless no-op when neither hover
// nor pressed is configured (it just re-sets the texture already showing).
//
// hoverCallback/hoverOutCallback fire independently of hoverTextureKey —
// a créa might want a hover sound with no visual swap at all — so
// pointerover/pointerout get wired whenever *either* the texture or the
// callback is set, combining both concerns in one listener when both are
// present. Only the texture swap needs to wait on an async decode
// (there's nothing to wait for to just call a callback), so a
// callback-only listener is added directly rather than nested in the
// hover texture's own addBase64/once block.
function generateCode(element, containerRef = 'this') {
  const {
    name,
    x,
    y,
    width,
    height,
    textureKey,
    imageData,
    hoverTextureKey,
    hoverImageData,
    pressedTextureKey,
    pressedImageData,
    originX,
    originY,
    rotation,
    callback,
    hoverCallback,
    hoverOutCallback,
  } = element.props
  const w = Math.round(width)
  const h = Math.round(height)
  const restingTextureKey = hoverTextureKey || textureKey

  const lines = [
    `scene.textures.addBase64('${textureKey}', '${escapeForLiteral(imageData)}');`,
    `scene.textures.once('addtexture-${textureKey}', () => {`,
    `  this.${name} = scene.add.image(${Math.round(x)}, ${Math.round(y)}, '${textureKey}').setDisplaySize(${w}, ${h}).setOrigin(${originX}, ${originY}).setAngle(${Math.round(rotation)});`,
    `  this.${name}.setInteractive({ useHandCursor: true });`,
    `  this.${name}.on('pointerup', () => { this.${name}.setTexture('${restingTextureKey}').setDisplaySize(${w}, ${h}); this.${callback}(); });`,
  ]

  if (hoverTextureKey) {
    const overCall = hoverCallback ? ` this.${hoverCallback}();` : ''
    const outCall = hoverOutCallback ? ` this.${hoverOutCallback}();` : ''
    lines.push(
      `  scene.textures.addBase64('${hoverTextureKey}', '${escapeForLiteral(hoverImageData)}');`,
      `  scene.textures.once('addtexture-${hoverTextureKey}', () => {`,
      `    this.${name}.on('pointerover', () => { this.${name}.setTexture('${hoverTextureKey}').setDisplaySize(${w}, ${h});${overCall} });`,
      `    this.${name}.on('pointerout', () => { this.${name}.setTexture('${textureKey}').setDisplaySize(${w}, ${h});${outCall} });`,
      `  });`,
    )
  } else {
    if (hoverCallback) lines.push(`  this.${name}.on('pointerover', () => this.${hoverCallback}());`)
    if (hoverOutCallback) lines.push(`  this.${name}.on('pointerout', () => this.${hoverOutCallback}());`)
  }

  if (pressedTextureKey) {
    lines.push(
      `  scene.textures.addBase64('${pressedTextureKey}', '${escapeForLiteral(pressedImageData)}');`,
      `  scene.textures.once('addtexture-${pressedTextureKey}', () => {`,
      `    this.${name}.on('pointerdown', () => this.${name}.setTexture('${pressedTextureKey}').setDisplaySize(${w}, ${h}));`,
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
  return [props.callback, props.hoverCallback, props.hoverOutCallback].filter(Boolean)
}

function generateCallbackStub(name) {
  return [`  ${name}() {`, '    // TODO: implement', '  }'].join('\n')
}

// The three named states the properties panel's state-preview window can
// force the canvas to show — always all three (unset hover/pressed
// textures just fall back to normal, see applyPreviewState), same set as
// Bouton's for a consistent experience across both button types.
const PREVIEW_STATES = ['normal', 'hover', 'pressed']

function getPreviewStates() {
  return PREVIEW_STATES
}

// Shows the button as it would look mid-interaction in the exported game
// — the exact same texture-per-state Bouton image's own generateCode
// wires to pointerover/pointerdown — without actually exporting and
// clicking it. Falls back to the normal texture for hover/pressed when
// that optional texture was never set (unlike generateCode, which then
// just never wires that listener at all — here there's always a state to
// show something for, even if it's "nothing configured yet"). Purely a
// manual, one-off override for this separate preview instance: never
// wired to real pointer events, and never called for the live canvas's
// own button (which stays on its normal texture — canvas clicks there
// still only ever mean select/drag).
function applyPreviewState(image, props, state) {
  const { textureKey, hoverTextureKey, pressedTextureKey, width, height } = props
  const keyForState = { normal: textureKey, hover: hoverTextureKey, pressed: pressedTextureKey }
  const key = keyForState[state] || textureKey
  image.setTexture(key).setDisplaySize(width, height)
}

// The state-preview window's mini Phaser.Game has its own, empty texture
// manager, separate from the main editor's — unlike Bouton's solid
// colors, this component's whole visual IS a texture, so the preview
// needs its own copy of whichever of the three are actually set, loaded
// before create()/applyPreviewState ever reference their keys.
function getPreviewTextures(props) {
  return [
    { key: props.textureKey, data: props.imageData },
    { key: props.hoverTextureKey, data: props.hoverImageData },
    { key: props.pressedTextureKey, data: props.pressedImageData },
  ].filter((texture) => texture.key)
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
  getPreviewStates,
  getPreviewTextures,
  applyPreviewState,
}
