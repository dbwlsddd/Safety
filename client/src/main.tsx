import React from 'react'
import ReactDOM from 'react-dom/client'
// 🛠️ [추가] BrowserRouter 임포트
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {/* 🛠️ [수정] App을 BrowserRouter로 감싸야 라우팅 기능이 작동합니다 */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
)