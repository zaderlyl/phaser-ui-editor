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

// Shows only the child assigned to normalChildId, hiding whichever others
// are linked — the live canvas never simulates hover/pressed (a click
// there always means select/drag, same rule as every other button type),
// so the resting state is always what's visible while editing. Needs the
// scene to resolve child ids to their actual game objects, same reason
// progressbar.js's icon-slot syncVisual receives it as a third argument.
function syncVisual(container, props, scene) {
  if (!scene) return
  const { normalChildId, hoverChildId, pressedChildId } = props
  for (const childId of [normalChildId, hoverChildId, pressedChildId]) {
    if (!childId) continue
    const child = scene.elements.find((element) => element.id === childId)
    if (child) child.gameObject.setVisible(childId === normalChildId)
  }
}

export const stateButtonComponent = {
  type: 'statebutton',
  label: 'Bouton composé',
  defaultProps,
  create,
  syncVisual,
}
