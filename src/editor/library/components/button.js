// Bouton: a rectangle with a border and a centered text label — position
// X/Y, largeur, hauteur, couleur de fond, contour, texte, ancrage. Built as
// a Phaser.GameObjects.Container (background rectangle + label text as
// children, both in container-local coordinates) rather than a single
// Shape, since a Shape can't also hold a text child — the same mechanism
// EditorScene.groupSelected already uses for a manual Panel+Texte group,
// just packaged as one first-class component instead of two elements the
// créa has to group by hand every time.
const defaultProps = {
  x: 0,
  y: 0,
  width: 160,
  height: 50,
  color: 0x3b82f6,
  strokeColor: 0x2563eb,
  hoverColor: 0x60a5fa,
  hoverStrokeColor: 0x2563eb,
  pressedColor: 0x1d4ed8,
  pressedStrokeColor: 0x1e40af,
  strokeThickness: 2,
  text: 'Bouton',
  callback: 'onButtonClick',
  // Unlike `callback`, these are opt-in: most buttons only need the color
  // swap pointerover/pointerout already does, so an empty name means "no
  // extra method call, no stub generated for it" rather than defaulting to
  // yet another empty TODO stub every button would carry.
  hoverCallback: '',
  hoverOutCallback: '',
  originX: 0,
  originY: 0,
}

const LABEL_FONT_SIZE = 18
const LABEL_COLOR = '#ffffff'

function create(scene, props) {
  const { x, y, width, height, color, strokeColor, strokeThickness, text, originX, originY } =
    props

  const background = scene.add
    .rectangle(0, 0, width, height, color)
    .setStrokeStyle(strokeThickness, strokeColor)
    .setOrigin(0, 0)
  const label = scene.add
    .text(width / 2, height / 2, text, { fontSize: `${LABEL_FONT_SIZE}px`, color: LABEL_COLOR })
    .setOrigin(0.5, 0.5)

  // A Container has no real origin support (Phaser's Container.originX/Y
  // is a fixed read-only 0.5 that doesn't affect positioning — see
  // groupSelected's identical note) — dropping from the library always
  // asks for origin (0.5, 0.5) so the cursor lands on the button's center,
  // same as every other component. That's honored here, once, to compute
  // the initial top-left; props.x/y is mutated to match so it stays in
  // sync with the container's actual position (addElement stores this
  // same props object as the element's props right after create()
  // returns) — from then on the button behaves like a group: x/y is
  // always literal top-left, with no ongoing origin concept.
  const left = x - originX * width
  const top = y - originY * height
  props.x = left
  props.y = top

  const container = scene.add.container(left, top, [background, label])
  container.setSize(width, height)
  container.setData('background', background)
  container.setData('label', label)
  return container
}

// Resyncs the background rectangle and label to the current props — needed
// after any change to width/height/color/text/strokeColor/strokeThickness,
// since none of those live on the Container itself (see EditorScene's
// syncButtonVisual, the only caller).
function syncVisual(container, props) {
  const { width, height, color, strokeColor, strokeThickness, text } = props
  const background = container.getData('background')
  const label = container.getData('label')

  background.setSize(width, height)
  background.setFillStyle(color)
  background.setStrokeStyle(strokeThickness, strokeColor)

  label.setText(text)
  label.setPosition(width / 2, height / 2)
}

function generateCode({ props }) {
  const {
    name,
    x,
    y,
    width,
    height,
    color,
    strokeColor,
    hoverColor,
    hoverStrokeColor,
    pressedColor,
    pressedStrokeColor,
    strokeThickness,
    text,
    callback,
    hoverCallback,
    hoverOutCallback,
  } = props
  const hexColor = `0x${color.toString(16).padStart(6, '0')}`
  const hexStrokeColor = `0x${strokeColor.toString(16).padStart(6, '0')}`
  const hexHoverColor = `0x${hoverColor.toString(16).padStart(6, '0')}`
  const hexHoverStrokeColor = `0x${hoverStrokeColor.toString(16).padStart(6, '0')}`
  const hexPressedColor = `0x${pressedColor.toString(16).padStart(6, '0')}`
  const hexPressedStrokeColor = `0x${pressedStrokeColor.toString(16).padStart(6, '0')}`
  const escapedText = text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  // Empty means "no extra call" — see defaultProps' note on why these two
  // are opt-in, unlike `callback`.
  const hoverCallbackCall = hoverCallback ? ` this.${hoverCallback}();` : ''
  const hoverOutCallbackCall = hoverOutCallback ? ` this.${hoverOutCallback}();` : ''

  // generateElementCode() (see generateScreenClass.js) wraps whatever this
  // returns with a single leading indent and nothing else, so continuation
  // lines carry their own — matching the flat 4-space indent every entry
  // (top-level or nested in a group) already uses throughout that file.
  // generateScreenClass collects every button's callback names (see
  // getCallbackNames below) and adds one stub method per unique name, so
  // the file is ready to run (clicking does nothing until filled in)
  // instead of throwing on an undefined method the first time someone
  // clicks. pointerover/pointerout/pointerdown/pointerup swap the
  // background straight to the matching color pair — no state is kept for
  // it (unlike the editor's own live props), since the exported game is
  // the only place any of this actually happens.
  //
  // The click itself fires on pointerup, not pointerdown: Phaser only
  // delivers a GameObject's own 'pointerup' when the release happens while
  // the pointer is still hit-testing that object (same as 'pointerdown'
  // and 'pointerover' are), so pressing on the button, dragging off it,
  // and releasing elsewhere does *not* fire this button's callback — the
  // standard "drag off to cancel a tap" affordance, which firing on
  // pointerdown would give up entirely (the callback would already have
  // run before the user had a chance to back out). pointerup also reverts
  // to the *hover* colors rather than normal, since releasing while still
  // over the button should leave it looking hovered, not suddenly idle;
  // pointerout (pointer leaves while held down, i.e. the cancelled case)
  // already reverts to normal without ever touching the callback.
  const overExpr = `this.${name}Background.setFillStyle(${hexHoverColor}).setStrokeStyle(${strokeThickness}, ${hexHoverStrokeColor})`
  const outExpr = `this.${name}Background.setFillStyle(${hexColor}).setStrokeStyle(${strokeThickness}, ${hexStrokeColor})`
  const pointeroverLine = hoverCallback
    ? `this.${name}.on('pointerover', () => { ${overExpr};${hoverCallbackCall} });`
    : `this.${name}.on('pointerover', () => ${overExpr});`
  const pointeroutLine = hoverOutCallback
    ? `this.${name}.on('pointerout', () => { ${outExpr};${hoverOutCallbackCall} });`
    : `this.${name}.on('pointerout', () => ${outExpr});`

  return [
    `this.${name} = new Phaser.GameObjects.Container(scene, ${Math.round(x)}, ${Math.round(y)});`,
    `this.${name}Background = scene.add.rectangle(0, 0, ${Math.round(width)}, ${Math.round(height)}, ${hexColor}).setStrokeStyle(${strokeThickness}, ${hexStrokeColor}).setOrigin(0, 0);`,
    `this.${name}Label = scene.add.text(${Math.round(width) / 2}, ${Math.round(height) / 2}, '${escapedText}', { fontSize: '${LABEL_FONT_SIZE}px', color: '${LABEL_COLOR}' }).setOrigin(0.5, 0.5);`,
    `this.${name}.add([this.${name}Background, this.${name}Label]);`,
    // A Container has no inherent shape, so setInteractive() needs a size
    // to derive its (rectangular) hit area from — without this, clicking
    // the button silently does nothing at all (no error either: Phaser
    // only surfaces the missing hit area if something explicitly calls
    // hitTestPointer, confirmed empirically, not on an ordinary click).
    `this.${name}.setSize(${Math.round(width)}, ${Math.round(height)});`,
    `this.${name}.setInteractive({ useHandCursor: true });`,
    pointeroverLine,
    pointeroutLine,
    `this.${name}.on('pointerdown', () => this.${name}Background.setFillStyle(${hexPressedColor}).setStrokeStyle(${strokeThickness}, ${hexPressedStrokeColor}));`,
    `this.${name}.on('pointerup', () => { this.${name}Background.setFillStyle(${hexHoverColor}).setStrokeStyle(${strokeThickness}, ${hexHoverStrokeColor}); this.${callback}(); });`,
  ].join('\n    ')
}

// The names of the methods this button's pointer events call — read by
// generateScreenClass to build the deduplicated list of stub methods it
// appends to the class (several buttons can share a callback name; the
// stub is only generated once). hoverCallback/hoverOutCallback are opt-in
// and left out entirely when empty, so a button that doesn't use them
// doesn't carry two unused TODO stubs.
function getCallbackNames({ props }) {
  return [props.callback, props.hoverCallback, props.hoverOutCallback].filter(Boolean)
}

function generateCallbackStub(name) {
  return [`  ${name}() {`, '    // TODO: implement', '  }'].join('\n')
}

export const buttonComponent = {
  type: 'button',
  label: 'Bouton',
  defaultProps,
  create,
  generateCode,
  syncVisual,
  getCallbackNames,
  generateCallbackStub,
}
