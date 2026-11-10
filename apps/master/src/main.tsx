import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './style.css'

const root = document.getElementById('root')
if (!root) throw new Error('앱을 표시할 root 요소가 없어.')
createRoot(root).render(<StrictMode><App /></StrictMode>)
