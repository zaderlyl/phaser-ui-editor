import Phaser from 'phaser'
import { componentLibrary } from '../library/registry'

const SELECTION_COLOR = 0x60a5fa
const HANDLE_SIZE = 10
// Extra invisible margin around each handle's visual size, purely for
// hit-testing: at HANDLE_SIZE alone, missing the handle by just a few
// pixels (easy at typical cursor precision, worse on a CSS-scaled-down
// canvas) grabs whatever's underneath instead — for a grouped element,
// that misreads as "move the group" instead of "resize it".
const HANDLE_HIT_PADDING = 8
const MIN_ELEMENT_SIZE = 10
const CORNERS = ['tl', 'tr', 'bl', 'br']
// Matches a valid JS identifier — the generated code will use this name
// directly as a property (this.<name>), so it must be a legal one.
const IDENTIFIER_PATTERN = /^[A-Za-z_$][A-Za-z0-9_$]*$/

// Editing surface: a real Phaser scene, so whatever renders here is pixel-identical
// to what the exported UI will look like in the actual game.
export class EditorScene extends Phaser.Scene {
  constructor() {
    super('EditorScene')
    // Placed elements on the current screen: { id, type, props, gameObject }.
    // The generic list all future features (selection, properties panel,
    // code generation) will read from and write to.
    this.elements = []
    // Selection is a set so several elements can be selected at once
    // (shift-click). Order doesn't matter here — this.elements' own order
    // is what drives rendering, layers and iteration.
    this.selectedIds = new Set()
    // Per-type counters for generating default names (panel1, panel2, ...).
    this.typeCounters = {}
    // The group id you're currently "inside" (via double-click), or null.
    // While inside a group, clicking/dragging its direct children affects
    // them individually; otherwise a child redirects to its whole group.
    this.enteredGroupId = null
    this.lastClickedId = null
    this.lastClickTime = 0
  }

  create() {
    const { width, height } = this.scale

    this.background = this.add
      .rectangle(0, 0, width, height, 0x1d1f27)
      .setOrigin(0)
    this.background.setInteractive()
    this.input.setDraggable(this.background)

    this.add
      .text(8, 8, `${width}×${height}`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#4b5563',
      })
      .setOrigin(0)

    this.selectionGraphics = this.add.graphics()
    this.selectionGraphics.setDepth(10000)

    this.marqueeGraphics = this.add.graphics()
    this.marqueeGraphics.setDepth(9999)
    this.marqueeStart = null

    this.resizeHandles = CORNERS.map((corner) => {
      const handle = this.add
        .rectangle(0, 0, HANDLE_SIZE, HANDLE_SIZE, 0xffffff)
        .setStrokeStyle(1, SELECTION_COLOR)
        .setDepth(10001)
        .setVisible(false)
      handle.setData('isHandle', true)
      handle.setData('corner', corner)
      // A hitArea larger than the visible square, centered on the same
      // point — see HANDLE_HIT_PADDING above.
      const hitSize = HANDLE_SIZE + HANDLE_HIT_PADDING * 2
      handle.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-HANDLE_HIT_PADDING, -HANDLE_HIT_PADDING, hitSize, hitSize),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      })
      handle.input.enabled = false
      this.input.setDraggable(handle)
      return handle
    })

    // Clicking an element selects it (shift adds/removes it from the current
    // selection instead of replacing it); clicking anything else (background)
    // clears the selection, unless shift is held — a shift-click on empty
    // space is a no-op rather than wiping out what's already selected.
    // Handles are editor chrome, never a selection target themselves.
    //
    // A child of a group works like Figma's frames: clicking it while you
    // haven't "entered" its group selects (and, per the 'drag' handler,
    // moves) the whole group instead — double-clicking the same child
    // within 300ms enters that group, so it and its siblings can be
    // selected/dragged individually until you click something else.
    this.input.on('gameobjectdown', (pointer, gameObject) => {
      if (gameObject.getData('isHandle')) return

      const additive = !!pointer.event?.shiftKey
      const elementId = gameObject.getData('elementId')

      if (!elementId) {
        if (!additive) {
          this.deselectAll()
          this.enteredGroupId = null
        }
        return
      }

      const element = this.elements.find((el) => el.id === elementId)

      if (element?.parentId && element.parentId === this.enteredGroupId) {
        // Child of the group we're already inside — select it directly.
        this.selectElement(elementId, { additive })
        return
      }

      if (!element?.parentId) {
        // Top-level element (a plain element, or a group itself) — select
        // directly, and we're no longer "inside" any specific group.
        this.enteredGroupId = null
        this.selectElement(elementId, { additive })
        return
      }

      // A child of a group we haven't entered yet.
      const now = performance.now()
      const isDoubleClick = this.lastClickedId === elementId && now - this.lastClickTime < 300
      this.lastClickedId = elementId
      this.lastClickTime = now

      if (isDoubleClick) {
        this.enteredGroupId = element.parentId
        this.selectElement(elementId, { additive })
      } else {
        this.enteredGroupId = null
        this.selectElement(element.parentId, { additive })
      }
    })

    // A handle drag starts from the corner opposite the one grabbed, so that
    // corner stays fixed in place while the grabbed one follows the pointer.
    this.input.on('dragstart', (pointer, gameObject) => {
      if (gameObject === this.background) {
        // Rubber-band select: shift held means "add to the current
        // selection" (captured now, before the drag starts changing it),
        // otherwise the marquee starts from an empty selection.
        this.marqueeStart = { x: pointer.x, y: pointer.y }
        this.marqueeAdditive = !!pointer.event?.shiftKey
        this.marqueeBaseSelection = new Set(this.selectedIds)
        return
      }

      if (gameObject.getData('isHandle')) {
        const elements = this.elements.filter((el) => this.selectedIds.has(el.id))
        if (elements.length === 0) return

        const bounds = this.getBoundsUnion(elements)
        const corner = gameObject.getData('corner')
        gameObject.setData('fixedX', corner.includes('r') ? bounds.left : bounds.right)
        gameObject.setData('fixedY', corner.includes('b') ? bounds.top : bounds.bottom)

        // Snapshot every selected element's bounds relative to the group's
        // (single element or many — same math either way), so resizeSelected
        // can scale each one proportionally as the group bounds change.
        this.resizeStartBounds = bounds
        this.resizeSnapshot = elements.map((element) => {
          const elBounds = element.gameObject.getBounds()
          return {
            element,
            relLeft: elBounds.left - bounds.left,
            relTop: elBounds.top - bounds.top,
            width: elBounds.width,
            height: elBounds.height,
            // For a group: its scale *before this drag started*. 'drag'
            // fires on every pointer move, each tick recomputing the full
            // absolute size from this same fixed snapshot — reading the
            // group's *current* (already-updated-by-the-previous-tick)
            // scale instead would compound it further on every tick,
            // growing exponentially instead of tracking the pointer.
            startScaleX: element.gameObject.scaleX ?? 1,
            startScaleY: element.gameObject.scaleY ?? 1,
          }
        })
        return
      }

      // A child of a group we haven't entered: 'gameobjectdown' already
      // selected the whole group instead of this child, but Phaser's own
      // drag targets whatever was actually grabbed (the child) — redirect
      // the upcoming 'drag' ticks to move the group instead. Phaser's
      // dragX/dragY are computed relative to the child's own position, not
      // valid for the group, so raw pointer movement is tracked instead.
      const elementId = gameObject.getData('elementId')
      const element = this.elements.find((el) => el.id === elementId)
      if (element?.parentId && element.parentId !== this.enteredGroupId) {
        const groupElement = this.elements.find((el) => el.id === element.parentId)
        if (groupElement) {
          this.groupDragRedirect = {
            childId: elementId,
            groupElement,
            pointerStartX: pointer.x,
            pointerStartY: pointer.y,
            groupStartX: groupElement.gameObject.x,
            groupStartY: groupElement.gameObject.y,
          }
        }
      }
    })

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      if (gameObject === this.background) {
        this.updateMarqueeSelection(pointer.x, pointer.y)
        return
      }

      if (gameObject.getData('isHandle')) {
        this.resizeSelected(gameObject, dragX, dragY, !!pointer.event?.shiftKey)
        return
      }

      const elementId = gameObject.getData('elementId')

      if (this.groupDragRedirect?.childId === elementId) {
        const { groupElement, pointerStartX, pointerStartY, groupStartX, groupStartY } =
          this.groupDragRedirect
        groupElement.gameObject.x = groupStartX + (pointer.x - pointerStartX)
        groupElement.gameObject.y = groupStartY + (pointer.y - pointerStartY)
        groupElement.props.x = groupElement.gameObject.x
        groupElement.props.y = groupElement.gameObject.y
        this.drawSelection()
        this.events.emit('elementchange', this.getElementSnapshot(groupElement.id))
        return
      }

      const element = this.elements.find((el) => el.id === elementId)
      if (!element) return

      const deltaX = dragX - gameObject.x
      const deltaY = dragY - gameObject.y

      if (this.selectedIds.size > 1 && this.selectedIds.has(elementId)) {
        // Part of a multi-selection: move every selected element by the same
        // delta, so the whole group is dragged together.
        for (const id of this.selectedIds) {
          const el = this.elements.find((e) => e.id === id)
          if (!el) continue
          el.gameObject.x += deltaX
          el.gameObject.y += deltaY
          el.props.x = el.gameObject.x
          el.props.y = el.gameObject.y
        }
      } else {
        // Single element: keeps its stored props (and the properties panel,
        // via 'elementchange') in sync with its actual position live.
        gameObject.x = dragX
        gameObject.y = dragY
        element.props.x = dragX
        element.props.y = dragY
        this.events.emit('elementchange', this.getElementSnapshot(elementId))
      }

      this.drawSelection()
    })

    this.input.on('dragend', (_pointer, gameObject) => {
      this.groupDragRedirect = null
      if (gameObject === this.background) {
        this.marqueeGraphics.clear()
        this.marqueeStart = null
        return
      }
      // Every other drag (element move, group move, resize) touched
      // position and/or size, but the live 'elementchange'/'elementsChange'
      // emitted mid-drag (see 'drag' above and resizeSelected) only cover
      // the moved/resized element(s) — cheap per-tick updates meant for the
      // properties panel, not a full sync. Consumers that need the whole
      // list current (the layers panel, code export) only get one once the
      // drag actually settles here.
      this.events.emit('elementsChange', this.getElementsSnapshot())
    })

    // Delete/Backspace removes every selected element — but only when the
    // keypress didn't originate from a text field (e.g. the properties
    // panel's Nom input), since Phaser's keyboard plugin listens globally
    // regardless of DOM focus.
    const handleDeleteKey = (event) => {
      const target = event.target
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      if (this.selectedIds.size === 0) return

      event.preventDefault()
      this.removeSelectedElements()
    }
    this.input.keyboard.on('keydown-DELETE', handleDeleteKey)
    this.input.keyboard.on('keydown-BACKSPACE', handleDeleteKey)

    // Cmd+G (Mac) / Ctrl+G (Windows/Linux) groups the current selection;
    // adding Shift ungroups instead. Browsers default Ctrl/Cmd+G to "find
    // next" — preventDefault stops that.
    this.input.keyboard.on('keydown-G', (event) => {
      const target = event.target
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      if (!(event.ctrlKey || event.metaKey)) return

      event.preventDefault()
      if (event.shiftKey) {
        this.ungroupSelected()
      } else {
        this.groupSelected()
      }
    })
  }

  // Instantiates a real Phaser GameObject for the given library component type
  // and tracks it as an element of the current screen.
  addElement(type, props = {}) {
    const definition = componentLibrary.find((component) => component.type === type)
    if (!definition) {
      throw new Error(`Unknown component type: "${type}"`)
    }

    // Resolve against the component's defaults so element.props always holds
    // the full, current set of fields (needed by e.g. the properties panel).
    // A default name (panel1, panel2, ...) is assigned unless one was given.
    this.typeCounters[type] = (this.typeCounters[type] ?? 0) + 1
    const defaultName = `${type}${this.typeCounters[type]}`
    const resolvedProps = { ...definition.defaultProps, name: defaultName, ...props }
    const gameObject = definition.create(this, resolvedProps)
    const id = crypto.randomUUID()
    gameObject.setData('elementId', id)
    gameObject.setData('elementType', type)
    if (typeof gameObject.setInteractive === 'function') {
      gameObject.setInteractive({ useHandCursor: true })
      this.input.setDraggable(gameObject)
    }

    // parentId: null for a top-level element, or a group's id once grouped
    // (see groupSelected) — the element stays in this flat list either way,
    // just excluded from top-level views (layers panel, depth ordering).
    const element = { id, type, props: resolvedProps, gameObject, parentId: null }
    // New elements go on top, matching most editors' default stacking.
    this.elements.push(element)
    this.reindexDepths()
    this.events.emit('elementsChange', this.getElementsSnapshot())
    return element
  }

  removeElement(id) {
    if (!this.elements.some((element) => element.id === id)) return

    // Removing a group takes its children down with it — Phaser's own
    // Container.destroy() already destroys them, this just keeps
    // this.elements from holding dangling entries for destroyed gameObjects.
    // Done first so the parent's index below can't be shifted out from
    // under it by a child removal earlier in the array.
    const childIds = this.elements
      .filter((element) => element.parentId === id)
      .map((element) => element.id)
    for (const childId of childIds) {
      this.removeElement(childId)
    }

    const index = this.elements.findIndex((element) => element.id === id)
    if (index === -1) return

    const wasSelected = this.selectedIds.delete(id)
    if (wasSelected) {
      this.drawSelection()
      this.events.emit('selectionchange', this.getSelectionSnapshot())
    }

    const [element] = this.elements.splice(index, 1)
    element.gameObject.destroy()
    this.reindexDepths()
    this.events.emit('elementsChange', this.getElementsSnapshot())
  }

  removeSelectedElements() {
    for (const id of [...this.selectedIds]) {
      this.removeElement(id)
    }
  }

  // Bundles the currently selected top-level elements into a real Phaser
  // Container: a group's own entry in this.elements, whose gameObject is a
  // Container that the selected elements' gameObjects get reparented into.
  // Moving/dragging the group then moves everything inside it for free —
  // Phaser positions container children in local (container-relative)
  // space automatically, no manual per-child delta propagation needed.
  // Already-grouped elements aren't eligible for now (nested/mixed-depth
  // grouping is a later step); fewer than 2 eligible elements is a no-op.
  groupSelected() {
    const selected = this.elements.filter(
      (element) => this.selectedIds.has(element.id) && !element.parentId,
    )
    if (selected.length < 2) return

    const bounds = this.getBoundsUnion(selected)

    const container = this.add.container(bounds.left, bounds.top)
    // Container.originX/Y are a read-only 0.5 in this Phaser version, but
    // that doesn't affect positioning here: container.x/y (and its
    // children's local x/y) map directly to world coordinates with no
    // origin-based offset — verified empirically, since assuming otherwise
    // silently shifted every grouped child on first pass (see below).
    container.setSize(bounds.width, bounds.height)
    container.setInteractive({ useHandCursor: true })
    this.input.setDraggable(container)

    this.typeCounters.group = (this.typeCounters.group ?? 0) + 1
    const groupId = crypto.randomUUID()
    container.setData('elementId', groupId)
    container.setData('elementType', 'group')

    // Container.add() does NOT convert a child's existing x/y from world to
    // local space — it just keeps whatever x/y the child already has and
    // starts treating it as container-relative. So each child's world x/y
    // has to be converted to container-local (i.e. offset by the group's
    // own world position) *before* reparenting, or it visibly jumps.
    for (const element of selected) {
      element.gameObject.x -= bounds.left
      element.gameObject.y -= bounds.top
      container.add(element.gameObject)
      element.parentId = groupId
      element.props.x = element.gameObject.x
      element.props.y = element.gameObject.y
    }

    const groupElement = {
      id: groupId,
      type: 'group',
      parentId: null,
      props: { name: `group${this.typeCounters.group}`, x: bounds.left, y: bounds.top, scaleX: 1, scaleY: 1 },
      gameObject: container,
    }
    this.elements.push(groupElement)
    this.reindexDepths()

    this.selectedIds = new Set([groupId])
    this.drawSelection()
    this.events.emit('elementsChange', this.getElementsSnapshot())
    this.events.emit('selectionchange', this.getSelectionSnapshot())
  }

  // Pulls one child out of its group's Container and back onto the scene
  // directly, at its current WORLD position — getBounds() already accounts
  // for the container's position *and* scale, so a child of a group that
  // was resized (via setScale(), see resizeSelected) comes out at its
  // correctly-scaled size instead of snapping back to its pre-resize size.
  // Does not touch this.elements or emit events — callers own that, since
  // both a full ungroup (many children at once) and extracting a single
  // child need this same per-child mechanics but differ in bookkeeping.
  reparentToScene(child, group) {
    const bounds = child.gameObject.getBounds()
    group.gameObject.remove(child.gameObject, false)
    this.add.existing(child.gameObject)

    child.gameObject.setSize(bounds.width, bounds.height)
    child.gameObject.x = bounds.left + child.gameObject.originX * bounds.width
    child.gameObject.y = bounds.top + child.gameObject.originY * bounds.height
    child.parentId = null
    child.props.width = bounds.width
    child.props.height = bounds.height
    child.props.x = child.gameObject.x
    child.props.y = child.gameObject.y
  }

  // Removes a now-empty (or emptied-down-to-one-child, see ungroupSelected)
  // group's own element/Container. Callers already moved its children out.
  destroyGroup(group) {
    if (this.enteredGroupId === group.id) this.enteredGroupId = null
    const index = this.elements.findIndex((element) => element.id === group.id)
    if (index !== -1) this.elements.splice(index, 1)
    group.gameObject.destroy()
  }

  // Cmd/Ctrl+Shift+G. Two cases, both "take the selection out of its
  // group(s)":
  //  - a selected element that IS a group: the whole group dissolves, every
  //    child comes out (the full reverse of groupSelected).
  //  - a selected element that's a child of a group which *isn't* itself
  //    selected (e.g. entered via double-click, then single-clicked): just
  //    that one element is extracted, leaving its siblings grouped — unless
  //    that leaves the group with fewer than 2 children, in which case a
  //    "group" of one thing no longer means anything, so the last child
  //    comes out too and the group goes with it.
  ungroupSelected() {
    const selected = this.elements.filter((element) => this.selectedIds.has(element.id))
    const groups = selected.filter((element) => element.type === 'group')
    const loneChildren = selected.filter(
      (element) => element.parentId && !this.selectedIds.has(element.parentId),
    )
    if (groups.length === 0 && loneChildren.length === 0) return

    const freedIds = []
    const groupsToRecheck = new Set()

    for (const group of groups) {
      for (const child of this.elements.filter((element) => element.parentId === group.id)) {
        this.reparentToScene(child, group)
        freedIds.push(child.id)
      }
      this.destroyGroup(group)
    }

    for (const child of loneChildren) {
      const group = this.elements.find((element) => element.id === child.parentId)
      if (!group) continue
      this.reparentToScene(child, group)
      freedIds.push(child.id)
      groupsToRecheck.add(group.id)
    }

    for (const groupId of groupsToRecheck) {
      const group = this.elements.find((element) => element.id === groupId)
      if (!group) continue
      const remaining = this.elements.filter((element) => element.parentId === groupId)
      if (remaining.length > 1) continue
      for (const last of remaining) {
        this.reparentToScene(last, group)
        freedIds.push(last.id)
      }
      this.destroyGroup(group)
    }

    this.reindexDepths()
    this.selectedIds = new Set(freedIds)
    this.drawSelection()
    this.events.emit('elementsChange', this.getElementsSnapshot())
    this.events.emit('selectionchange', this.getSelectionSnapshot())
  }

  // Layers panel drag-out: a group's child was dropped onto a top-level
  // row, so it's extracted from its group (same rules as ungroupSelected's
  // lone-child case — the group dissolves too if that leaves it with fewer
  // than 2 children) *and* moved to sit at that exact position in paint
  // order. orderedIds is the full back-to-front id list the panel already
  // computed for a plain reorder; stale ids (a group dissolved by this same
  // call) are dropped automatically since they no longer resolve.
  extractChildToPosition(childId, orderedIds) {
    const child = this.elements.find((element) => element.id === childId)
    if (!child?.parentId) return
    const group = this.elements.find((element) => element.id === child.parentId)
    if (!group) return

    this.reparentToScene(child, group)
    const remaining = this.elements.filter((element) => element.parentId === group.id)
    if (remaining.length <= 1) {
      for (const last of remaining) this.reparentToScene(last, group)
      this.destroyGroup(group)
    }

    const byId = new Map(this.elements.map((element) => [element.id, element]))
    const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean)
    if (reordered.length === this.elements.length) {
      this.elements = reordered
    }

    this.reindexDepths()
    this.selectedIds = new Set([childId])
    this.drawSelection()
    this.events.emit('elementsChange', this.getElementsSnapshot())
    this.events.emit('selectionchange', this.getSelectionSnapshot())
  }

  // Reorders elements to match the given id order (back to front) and
  // reassigns depths accordingly — used by the layers panel's drag-to-reorder.
  reorderElements(orderedIds) {
    const byId = new Map(this.elements.map((element) => [element.id, element]))
    const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean)
    if (reordered.length !== this.elements.length) return

    this.elements = reordered
    this.reindexDepths()
    this.events.emit('elementsChange', this.getElementsSnapshot())
  }

  // Depth follows array order (index 0 = backmost), so paint order always
  // matches the elements list — including the layers panel's display order.
  // Only top-level elements are scene-depth-sorted; a grouped child's paint
  // order comes from its position in the parent Container's own child list
  // instead (see groupSelected), which Phaser manages on its own.
  reindexDepths() {
    this.elements
      .filter((element) => !element.parentId)
      .forEach((element, index) => element.gameObject.setDepth(index))
  }

  // Rubber-band select: redraws the marquee rectangle from its drag-start
  // point to the current pointer position, and updates the selection to
  // whatever placed elements it currently overlaps (shift-drag adds to the
  // selection captured at dragstart instead of replacing it). Called live
  // on every pointer move during the drag, same as a normal element drag.
  updateMarqueeSelection(currentX, currentY) {
    if (!this.marqueeStart) return

    const left = Math.min(this.marqueeStart.x, currentX)
    const right = Math.max(this.marqueeStart.x, currentX)
    const top = Math.min(this.marqueeStart.y, currentY)
    const bottom = Math.max(this.marqueeStart.y, currentY)

    this.marqueeGraphics.clear()
    this.marqueeGraphics.fillStyle(SELECTION_COLOR, 0.1)
    this.marqueeGraphics.fillRect(left, top, right - left, bottom - top)
    this.marqueeGraphics.lineStyle(1, SELECTION_COLOR, 0.8)
    this.marqueeGraphics.strokeRect(left, top, right - left, bottom - top)

    const overlapping = this.elements.filter((element) => {
      const bounds = element.gameObject.getBounds()
      return bounds.left < right && bounds.right > left && bounds.top < bottom && bounds.bottom > top
    })

    this.selectedIds = this.marqueeAdditive
      ? new Set([...this.marqueeBaseSelection, ...overlapping.map((element) => element.id)])
      : new Set(overlapping.map((element) => element.id))

    this.drawSelection()
    this.events.emit('selectionchange', this.getSelectionSnapshot())
  }

  // additive (shift-click): toggles the element in/out of the current
  // selection. Otherwise, replaces the selection with just this element.
  selectElement(id, { additive = false } = {}) {
    if (additive) {
      if (this.selectedIds.has(id)) {
        this.selectedIds.delete(id)
      } else {
        this.selectedIds.add(id)
      }
    } else {
      this.selectedIds = new Set([id])
    }

    this.drawSelection()
    this.events.emit('selectionchange', this.getSelectionSnapshot())
  }

  deselectAll() {
    if (this.selectedIds.size === 0) return

    this.selectedIds = new Set()
    this.selectionGraphics.clear()
    this.setHandlesVisible(false)
    this.events.emit('selectionchange', [])
  }

  // Applies a partial props update (e.g. from the properties panel) to an
  // element's GameObject, keeping props and rendered state in sync in both
  // directions (canvas -> panel already covered by drag/resize handlers).
  updateElementProps(id, patch) {
    const element = this.elements.find((el) => el.id === id)
    if (!element) return

    Object.assign(element.props, patch)
    const { gameObject } = element

    if ('x' in patch || 'y' in patch) {
      gameObject.setPosition(element.props.x, element.props.y)
    }
    if ('width' in patch || 'height' in patch) {
      gameObject.setSize(element.props.width, element.props.height)
    }
    if ('color' in patch) {
      // props.color is always a 0xRRGGBB number (see the color picker in
      // PropertiesPanel), but a Rectangle and a Text take it differently —
      // a Rectangle's fill vs. Text's CSS-string style color.
      if (typeof gameObject.setFillStyle === 'function') {
        gameObject.setFillStyle(element.props.color)
      } else if (typeof gameObject.setColor === 'function') {
        gameObject.setColor(`#${element.props.color.toString(16).padStart(6, '0')}`)
      }
    }
    if ('text' in patch && typeof gameObject.setText === 'function') {
      gameObject.setText(element.props.text)
    }
    if ('fontSize' in patch && typeof gameObject.setFontSize === 'function') {
      gameObject.setFontSize(element.props.fontSize)
    }
    if (('bold' in patch || 'italic' in patch) && typeof gameObject.setFontStyle === 'function') {
      // Two separate checkboxes in the properties panel, one combined CSS
      // font-style string for Phaser's Text (see text.js's toFontStyle).
      const { bold, italic } = element.props
      const fontStyle = bold && italic ? 'bold italic' : bold ? 'bold' : italic ? 'italic' : 'normal'
      gameObject.setFontStyle(fontStyle)
    }
    if ('align' in patch && typeof gameObject.setAlign === 'function') {
      gameObject.setAlign(element.props.align)
    }

    this.drawSelection()
    this.events.emit('elementchange', this.getElementSnapshot(id))
    // A properties-panel edit happens once per discrete input (a keystroke,
    // a checkbox toggle) rather than per animation-frame tick like a drag,
    // so unlike resizeSelected there's no perf reason to skip this — and
    // without it the layers panel and code export kept reading whatever
    // this element's props were before the edit (see dragend's identical
    // fix for the same staleness on drag/resize).
    this.events.emit('elementsChange', this.getElementsSnapshot())
  }

  // Renames an element after validating it as a JS identifier (it becomes
  // this.<name> in the generated code) and checking uniqueness among the
  // other placed elements. Returns { success } or { success: false, error }
  // so the UI can show the problem without touching the stored name.
  renameElement(id, name) {
    const element = this.elements.find((el) => el.id === id)
    if (!element) return { success: false, error: 'Élément introuvable' }

    if (!IDENTIFIER_PATTERN.test(name)) {
      return {
        success: false,
        error: 'Nom invalide : lettres, chiffres, _ uniquement, sans commencer par un chiffre',
      }
    }

    const isDuplicate = this.elements.some((el) => el.id !== id && el.props.name === name)
    if (isDuplicate) {
      return { success: false, error: 'Ce nom est déjà utilisé par un autre élément' }
    }

    element.props.name = name
    this.events.emit('elementchange', this.getElementSnapshot(id))
    this.events.emit('elementsChange', this.getElementsSnapshot())
    return { success: true }
  }

  // Aligns every selected element's bounding box against the extremes (or
  // center) of the overall selection bounding box — the usual Figma-style
  // align tools. No-op with fewer than 2 selected (nothing to align to).
  alignSelected(mode) {
    const elements = this.elements.filter((el) => this.selectedIds.has(el.id))
    if (elements.length < 2) return

    const boundsList = elements.map((el) => ({ el, bounds: el.gameObject.getBounds() }))
    const minLeft = Math.min(...boundsList.map(({ bounds }) => bounds.left))
    const maxRight = Math.max(...boundsList.map(({ bounds }) => bounds.right))
    const minTop = Math.min(...boundsList.map(({ bounds }) => bounds.top))
    const maxBottom = Math.max(...boundsList.map(({ bounds }) => bounds.bottom))
    const centerX = (minLeft + maxRight) / 2
    const centerY = (minTop + maxBottom) / 2

    for (const { el, bounds } of boundsList) {
      let deltaX = 0
      let deltaY = 0
      switch (mode) {
        case 'left':
          deltaX = minLeft - bounds.left
          break
        case 'right':
          deltaX = maxRight - bounds.right
          break
        case 'centerH':
          deltaX = centerX - (bounds.left + bounds.right) / 2
          break
        case 'top':
          deltaY = minTop - bounds.top
          break
        case 'bottom':
          deltaY = maxBottom - bounds.bottom
          break
        case 'centerV':
          deltaY = centerY - (bounds.top + bounds.bottom) / 2
          break
        default:
          return
      }

      el.gameObject.x += deltaX
      el.gameObject.y += deltaY
      el.props.x = el.gameObject.x
      el.props.y = el.gameObject.y
    }

    this.drawSelection()
    this.events.emit('elementsChange', this.getElementsSnapshot())
  }

  // Plain-object copy of an element (no GameObject reference), safe to hand
  // to React state without aliasing issues.
  getElementSnapshot(id) {
    const element = this.elements.find((el) => el.id === id)
    if (!element) return null
    return {
      id: element.id,
      type: element.type,
      parentId: element.parentId,
      props: { ...element.props },
    }
  }

  // Plain-object copy of the full elements list, in back-to-front order —
  // what the layers panel renders (reversed, so front is on top visually).
  // parentId is null for top-level elements, or a group's id — the layers
  // panel doesn't build a tree from it yet, that's a later step.
  getElementsSnapshot() {
    return this.elements.map((element) => ({
      id: element.id,
      type: element.type,
      parentId: element.parentId,
      props: { ...element.props },
    }))
  }

  // Snapshot of the current selection, in this.elements' (back-to-front)
  // order — what the properties panel renders (single vs. multi state).
  getSelectionSnapshot() {
    return this.elements
      .filter((element) => this.selectedIds.has(element.id))
      .map((element) => ({
        id: element.id,
        type: element.type,
        parentId: element.parentId,
        props: { ...element.props },
      }))
  }

  // Resizes the whole selection so the dragged corner follows the pointer
  // while the opposite corner (captured on dragstart) stays fixed. With one
  // selected element this just resizes it directly; with several, every
  // element is scaled proportionally to how the overall group bounds
  // changed, keeping their relative position/size within the group.
  // Holding shift locks the aspect ratio: both axes scale by the larger of
  // the two raw factors, so the anchored corner still stays put but the
  // shape grows/shrinks uniformly instead of stretching.
  resizeSelected(handle, dragX, dragY, keepAspectRatio = false) {
    if (!this.resizeSnapshot || this.resizeSnapshot.length === 0) return

    const fixedX = handle.getData('fixedX')
    const fixedY = handle.getData('fixedY')
    const corner = handle.getData('corner')
    const anchorIsLeft = corner.includes('r')
    const anchorIsTop = corner.includes('b')

    const rawWidth = Math.max(MIN_ELEMENT_SIZE, Math.abs(dragX - fixedX))
    const rawHeight = Math.max(MIN_ELEMENT_SIZE, Math.abs(dragY - fixedY))

    let scaleX = rawWidth / this.resizeStartBounds.width
    let scaleY = rawHeight / this.resizeStartBounds.height
    if (keepAspectRatio) {
      const uniformScale = Math.max(scaleX, scaleY)
      scaleX = uniformScale
      scaleY = uniformScale
    }

    const newWidth = Math.max(MIN_ELEMENT_SIZE, this.resizeStartBounds.width * scaleX)
    const newHeight = Math.max(MIN_ELEMENT_SIZE, this.resizeStartBounds.height * scaleY)
    const left = anchorIsLeft ? fixedX : fixedX - newWidth
    const top = anchorIsTop ? fixedY : fixedY - newHeight

    for (const {
      element,
      relLeft,
      relTop,
      width,
      height,
      startScaleX,
      startScaleY,
    } of this.resizeSnapshot) {
      const elWidth = Math.max(MIN_ELEMENT_SIZE, width * scaleX)
      const elHeight = Math.max(MIN_ELEMENT_SIZE, height * scaleY)
      const elLeft = left + relLeft * scaleX
      const elTop = top + relTop * scaleY

      const { gameObject } = element

      if (element.type === 'group') {
        // A group's Container has no meaningful origin (x/y is already its
        // local (0,0), i.e. its own top-left) and setSize() only affects
        // hit-testing, not how it looks — setScale() is what actually
        // stretches its children visually. 'drag' fires on every pointer
        // move, each tick recomputing the FULL absolute scale from the
        // snapshot taken at dragstart (startScaleX/Y) — never from the
        // container's *current* scale, which the previous tick already
        // updated and would compound exponentially if reused here.
        gameObject.setScale((elWidth / width) * startScaleX, (elHeight / height) * startScaleY)
        gameObject.x = elLeft
        gameObject.y = elTop
        // No props.width/height for a group: the properties panel would
        // render them as plain number inputs wired to updateElementProps'
        // setSize() path, which wouldn't visually rescale a Container the
        // way setScale() does here — leaving them out avoids that mismatch.
        // scaleX/Y IS tracked, though — it's how the exported code (see
        // generateScreenClass) reproduces this same visual stretch via a
        // real Container.setScale() call.
        element.props.x = gameObject.x
        element.props.y = gameObject.y
        element.props.scaleX = gameObject.scaleX
        element.props.scaleY = gameObject.scaleY
        continue
      }

      // Only touch size for element types that actually declare width/height
      // in their props (a Panel does, Text doesn't — it auto-sizes from its
      // own content/font). Gating on the props schema rather than probing
      // gameObject.setSize avoids two issues: Text's setSize() exists but
      // only sets the hit-area bookkeeping (it doesn't visually resize the
      // text, since that's recomputed from the canvas on the next style
      // change), and injecting width/height into a Text's props would make
      // the properties panel show a "Taille" field that does nothing.
      if ('width' in element.props) {
        gameObject.setSize(elWidth, elHeight)
        element.props.width = elWidth
        element.props.height = elHeight
      }
      gameObject.x = elLeft + gameObject.originX * elWidth
      gameObject.y = elTop + gameObject.originY * elHeight
      element.props.x = gameObject.x
      element.props.y = gameObject.y
    }

    this.drawSelection()
    if (this.resizeSnapshot.length === 1) {
      this.events.emit('elementchange', this.getElementSnapshot(this.resizeSnapshot[0].element.id))
    } else {
      this.events.emit('elementsChange', this.getElementsSnapshot())
    }
  }

  // Union of several elements' world bounds — the group's own bounding box.
  // With a single element this just returns its own bounds, so callers can
  // treat the single- and multi-selection cases identically.
  getBoundsUnion(elements) {
    const boundsList = elements.map((element) => element.gameObject.getBounds())
    const left = Math.min(...boundsList.map((bounds) => bounds.left))
    const right = Math.max(...boundsList.map((bounds) => bounds.right))
    const top = Math.min(...boundsList.map((bounds) => bounds.top))
    const bottom = Math.max(...boundsList.map((bounds) => bounds.bottom))
    return { left, right, top, bottom, width: right - left, height: bottom - top }
  }

  drawSelection() {
    this.selectionGraphics.clear()

    if (this.selectedIds.size === 0) {
      this.setHandlesVisible(false)
      return
    }

    const selected = this.elements.filter((element) => this.selectedIds.has(element.id))
    if (selected.length === 0) {
      this.setHandlesVisible(false)
      return
    }

    this.selectionGraphics.lineStyle(2, SELECTION_COLOR, 1)

    if (selected.length > 1) {
      // Outline each element individually in addition to the group bounds
      // below, so it's clear exactly what's selected inside the group.
      for (const element of selected) {
        const bounds = element.gameObject.getBounds()
        this.selectionGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
      }
    }

    const groupBounds = this.getBoundsUnion(selected)
    this.selectionGraphics.strokeRect(
      groupBounds.left,
      groupBounds.top,
      groupBounds.width,
      groupBounds.height,
    )
    this.positionHandles(groupBounds)
    this.setHandlesVisible(true)
  }

  positionHandles(bounds) {
    const positions = {
      tl: [bounds.left, bounds.top],
      tr: [bounds.right, bounds.top],
      bl: [bounds.left, bounds.bottom],
      br: [bounds.right, bounds.bottom],
    }

    for (const handle of this.resizeHandles) {
      const [x, y] = positions[handle.getData('corner')]
      handle.setPosition(x, y)
    }
  }

  setHandlesVisible(visible) {
    for (const handle of this.resizeHandles) {
      handle.setVisible(visible)
      handle.input.enabled = visible
    }
  }
}
