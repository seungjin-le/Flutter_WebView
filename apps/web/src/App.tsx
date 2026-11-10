import { useState } from 'react'
import { isNativeAvailable, pingNative } from './bridge'

export default function App() {
  const native = isNativeAvailable()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(native ? '앱 연결을 확인할 준비가 됐어.' : '브라우저에서 실행 중이야. 앱에서 연결을 확인할 수 있어.')

  async function checkConnection() {
    if (busy) return
    setBusy(true)
    setMessage('앱의 응답을 기다리고 있어.')
    try {
      const reply = await pingNative()
      setMessage(`${reply.platform === 'ios' ? 'iOS' : 'Android'} 앱과 연결됐어.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '앱 연결에 실패했어.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <p className="eyebrow">CONNECTION DEMO</p>
      <h1>Luckieverse</h1>
      <p className="intro">웹과 앱을 하나로 연결하는 시작점.</p>
      <section aria-labelledby="connection-title">
        <h2 id="connection-title">앱 연결</h2>
        <p role="status" aria-live="polite">{message}</p>
        <button type="button" disabled={!native || busy} onClick={checkConnection}>
          {busy ? '확인 중' : '앱 연결 확인'}
        </button>
      </section>
    </main>
  )
}
