import { panelComponent } from './panel'

// Ligne / Trait: mechanically identical to Panel (a solid-color Rectangle
// you position/resize/color) — this editor has no rotation support yet
// for any shape, so a "line" here is really just a thin bar: resizing
// width lengthens it, resizing height changes its thickness, both via the
// same corner handles every other shape already uses. Distinguished from
// Panel only by a much shorter default height and its own library entry —
// reuses Panel's own create()/generateCode() directly rather than
// reimplementing the identical Rectangle logic.
const defaultProps = {
  ...panelComponent.defaultProps,
  width: 160,
  height: 4,
}

export const lineComponent = {
  type: 'line',
  label: 'Ligne',
  defaultProps,
  create: panelComponent.create,
  generateCode: panelComponent.generateCode,
  // Same rectangle, same 4-corners-from-real-bounds logic — reused
  // directly rather than reimplemented, same reasoning as create()/
  // generateCode() above.
  toPolygonPoints: panelComponent.toPolygonPoints,
}
