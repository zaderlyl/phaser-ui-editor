// Bouton composé: links 2+ existing elements/groups already on the canvas
// as named states (Normal / Survol / Appui) of one button, the way Figma
// lets you flatten several layers into named variants — as opposed to
// Bouton/Bouton image, which bake their states into color or texture
// props on a single element. This is just the base structure (step 1 of
// the plan): an empty Container that adopts already-existing elements as
// children (via the "Lier comme bouton" action, not built yet) and shows
// only one of them at a time. Unlike Bouton/Bouton image, create() never
// builds any visual content itself — there is nothing to show until at
// least a normal-state child has been linked in.
const defaultProps = {
  x: 0,
  y: 0,
  width: 160,
  height: 50,
  callback: 'onStateButtonClick',
  // Each holds a child element's id (see EditorScene.elements) once
  // linked, or null when that state has no child assigned yet — a créa
  // can start with just Normal+Survol and add Appui later (step 7:
  // reassigning/adding states after the fact).
  normalChildId: null,
  hoverChildId: null,
  pressedChildId: null,
  originX: 0,
  originY: 0,
}

function create(scene, props) {
  const { x, y, width, height, originX, originY } = props
  const left = x - originX * width
  const top = y - originY * height
  // Mirrors Bouton's own convention of rewriting props.x/y to the
  // top-left immediately, since a Container's x/y IS its top-left
  // regardless of originX/Y (Container.originX/Y is a read-only 0.5 that
  // has no bearing on positioning — see groupSelected's own note).
  props.x = left
  props.y = top
  const container = scene.add.container(left, top)
  container.setSize(width, height)
  return container
}

// Shows only the child assigned to normalChildId, hiding every other
// child of this container — including one with no role assigned at all
// (see EditorScene.assignStateRole's "Aucun" option), not just the other
// named slots — the live canvas never simulates hover/pressed (a click
// there always means select/drag, same rule as every other button type),
// so the resting state is always what's visible while editing. Looks
// children up by parentId rather than iterating the three named props
// directly so a not-yet-assigned child is never left visible alongside
// the real normal state. Needs the scene to resolve the container's own
// element id and its children, same reason progressbar.js's icon-slot
// syncVisual receives it as a third argument.
function syncVisual(container, props, scene) {
  if (!scene) return
  const containerId = container.getData('elementId')
  for (const child of scene.elements) {
    if (child.parentId !== containerId) continue
    child.gameObject.setVisible(child.id === props.normalChildId)
  }
}

// Shared with the properties panel's role picker and the state-preview
// modal below, so both agree on the same normal/hover/pressed/none
// mapping instead of re-deriving it separately.
export function getChildRole(props, childId) {
  if (props.normalChildId === childId) return 'normal'
  if (props.hoverChildId === childId) return 'hover'
  if (props.pressedChildId === childId) return 'pressed'
  return null
}

// Only the roles that actually have a linked child are worth previewing —
// unlike Bouton/Bouton image, whose hover/pressed always fall back to
// showing *something* (the normal color/texture), an unassigned role here
// has nothing to show at all. `children` is the list of this container's
// own child elements — StatePreviewModal resolves and passes it, since
// this component only ever stores their ids in props, not the elements
// themselves.
function getPreviewStates(props, children = []) {
  const states = ['normal', 'hover', 'pressed'].filter((role) =>
    children.some((child) => getChildRole(props, child.id) === role),
  )
  return states.length > 0 ? states : ['normal']
}

// The state-preview modal's mini Phaser.Game has no idea these children
// even exist (they're separate elements on the *main* canvas, not props
// on this component) — so each child's own getPreviewTextures is
// gathered here via `lookupDefinition`, a small registry lookup the modal
// passes in to avoid statebutton.js importing the registry itself (which
// imports this file, and would cycle back).
function getPreviewTextures(props, children = [], lookupDefinition) {
  if (!lookupDefinition) return []
  return children.flatMap((child) => {
    const definition = lookupDefinition(child.type)
    return definition?.getPreviewTextures?.(child.props) ?? []
  })
}

// Unlike the main canvas (where children are reparented into an already-
// existing container via linkAsStates, see EditorScene), the preview
// modal's isolated Phaser.Game starts with nothing — so this builds each
// linked child fresh, via its own definition's create(), tagged with
// which state it represents so applyPreviewState can toggle it. Children
// with no role assigned (see EditorScene.assignStateRole's "Aucun") are
// skipped entirely, same as they're never shown on the main canvas either.
// Centers the whole assembly on props.x/y (the preview's center point,
// see StatePreviewModal) by width/height, mirroring how Bouton/Bouton
// image center via originX/Y 0.5 on a single game object instead.
function createPreview(scene, props, children, lookupDefinition) {
  const { x, y, width, height } = props
  const container = scene.add.container(x - width / 2, y - height / 2)
  for (const child of children) {
    const role = getChildRole(props, child.id)
    if (!role) continue
    const definition = lookupDefinition(child.type)
    if (!definition) continue
    const gameObject = definition.create(scene, { ...child.props })
    gameObject.setData('role', role)
    container.add(gameObject)
  }
  return container
}

// Toggles which linked child is showing — same principle as syncVisual on
// the main canvas, just reading the role tag createPreview stamped on
// each child instead of resolving ids through the scene's element list
// (this container's children are real Phaser children here, not entries
// in some other elements array).
function applyPreviewState(container, props, state) {
  for (const child of container.list) {
    child.setVisible(child.getData('role') === state)
  }
}

export const stateButtonComponent = {
  type: 'statebutton',
  label: 'Bouton composé',
  defaultProps,
  create,
  syncVisual,
  getPreviewStates,
  getPreviewTextures,
  createPreview,
  applyPreviewState,
}
