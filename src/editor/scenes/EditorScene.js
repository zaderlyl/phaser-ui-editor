import Phaser from 'phaser'

// Editing surface: a real Phaser scene, so whatever renders here is pixel-identical
// to what the exported UI will look like in the actual game.
export class EditorScene extends Phaser.Scene {
  constructor() {
    super('EditorScene')
  }

  create() {
    const { width, height } = this.scale

    this.add
      .rectangle(0, 0, width, height, 0x1d1f27)
      .setOrigin(0)

    this.add
      .text(width / 2, height / 2, `Editor canvas — ${width}×${height}`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#6b7280',
      })
      .setOrigin(0.5)
  }
}
