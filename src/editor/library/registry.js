import { panelComponent } from './components/panel'
import { textComponent } from './components/text'
import { buttonComponent } from './components/button'
import { imageComponent } from './components/image'
import { progressBarComponent } from './components/progressbar'

// Registry of component types available in the library panel and placeable on
// the canvas. Each entry: { type, label, defaultProps, create(scene, props) }.
export const componentLibrary = [
  panelComponent,
  textComponent,
  buttonComponent,
  imageComponent,
  progressBarComponent,
]
