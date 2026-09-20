// Panel / Fond: solid-color rectangle background.
// Matches the cahier des charges' "Panel / Fond" component properties:
// position X/Y, largeur, hauteur, couleur de fond, ancrage.
const defaultProps = {
  x: 0,
  y: 0,
  width: 200,
  height: 120,
  color: 0x2d2f3a,
  originX: 0,
  originY: 0,
}

function create(scene, props) {
  const { x, y, width, height, color, originX, originY } = { ...defaultProps, ...props }
  return scene.add.rectangle(x, y, width, height, color).setOrigin(originX, originY)
}

export const panelComponent = {
  type: 'panel',
  label: 'Panel',
  defaultProps,
  create,
}
