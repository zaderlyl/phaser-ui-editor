// Thin adapter around the polygon-clipping library (Martinez sweep-line
// algorithm, zero-config, MIT licensed) — chosen over hand-rolling the
// clipping math ourselves, which has too many nasty edge cases (shared
// edges, self-intersections, holes) to get right from scratch. Its own
// API already maps directly onto the four operations the Pathfinder-style
// actions (Phase 4) need: union, intersection, difference (subtraction),
// xor (exclusion) — this file only exists to translate between its
// GeoJSON-flavored nested-array format and the flat {x, y}[] point lists
// every shape's own toPolygonPoints (see Panel/Cercle/Polygone/Tracé)
// already produces, so nothing above this layer needs to know the
// library's own shape.
import polygonClipping from 'polygon-clipping'

// {x, y}[] -> the library's own Polygon type: a ring (the outer contour,
// no holes support needed yet) as an array of [x, y] pairs, explicitly
// closed by repeating the first point at the end — polygon-clipping
// requires this even though every shape here already implicitly closes
// its own last point back to the first when rendering.
function toClipperPolygon(points) {
  const ring = points.map((point) => [point.x, point.y])
  ring.push([...ring[0]])
  return [ring]
}

// The library's own MultiPolygon result (an array of Polygons, each an
// array of rings) back to a plain array of {x, y}[] point lists — one
// entry per disjoint output shape. Only the outer ring of each polygon is
// kept: a result with actual holes (e.g. a ring subtracted from the
// middle of a disc) would need its own dedicated shape representation to
// render at all (Phaser's Polygon can't punch a hole in itself), which is
// its own later concern once an action actually produces one, not
// something this translation layer should silently paper over.
function fromClipperMultiPolygon(multiPolygon) {
  return multiPolygon.map(([outerRing]) => {
    // Drop the closing point polygon-clipping always adds back (the ring
    // already implicitly closes when rendered, same as every shape's own
    // stored points), so round-tripping doesn't grow the point count.
    const ring = outerRing.slice(0, -1)
    return ring.map(([x, y]) => ({ x, y }))
  })
}

// Every one of these can return more than one disjoint shape (e.g. two
// separate polygons that don't overlap have an "intersection" of nothing,
// a union of two non-touching shapes is two separate results) — callers
// always get an array back, never assuming exactly one result.
export function unionPolygons(pointsA, pointsB) {
  const result = polygonClipping.union(toClipperPolygon(pointsA), toClipperPolygon(pointsB))
  return fromClipperMultiPolygon(result)
}

export function subtractPolygons(pointsA, pointsB) {
  const result = polygonClipping.difference(toClipperPolygon(pointsA), toClipperPolygon(pointsB))
  return fromClipperMultiPolygon(result)
}

export function intersectPolygons(pointsA, pointsB) {
  const result = polygonClipping.intersection(toClipperPolygon(pointsA), toClipperPolygon(pointsB))
  return fromClipperMultiPolygon(result)
}

export function excludePolygons(pointsA, pointsB) {
  const result = polygonClipping.xor(toClipperPolygon(pointsA), toClipperPolygon(pointsB))
  return fromClipperMultiPolygon(result)
}
