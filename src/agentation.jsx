import React from 'react'
import { createRoot } from 'react-dom/client'
import { Agentation } from 'agentation'

const container = document.createElement('div')
container.id = 'agentation-root'
document.body.appendChild(container)

createRoot(container).render(
  React.createElement(Agentation, { endpoint: 'http://localhost:4747' })
)
