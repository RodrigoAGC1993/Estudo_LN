import { render } from 'preact'
import { init } from './composition'
import { App } from './app'
import './ui/styles/index.css'

// Bootstrap: wire dependencies before rendering
init()

const root = document.getElementById('app')
if (root) {
  render(<App />, root)
}
