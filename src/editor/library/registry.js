import { panelComponent } from './components/panel'

// Registry of component types available in the library panel and placeable on
// the canvas. Each entry: { type, label, defaultProps, create(scene, props) }.
export const componentLibrary = [panelComponent]
