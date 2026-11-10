export type Pong = { version: 1; id: string; type: 'pong'; platform: 'android' | 'ios' }

declare global {
  interface Window {
    LuckieverseBridge?: { postMessage(message: string): void }
  }
}

type Pending = { resolve(value: Pong): void; reject(reason: Error): void; timer: ReturnType<typeof setTimeout> }
const pending = new Map<string, Pending>()
let sequence = 0
const documentId = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')

export function isNativeAvailable(): boolean {
  return typeof window.LuckieverseBridge?.postMessage === 'function'
}

function finish(id: string): Pending | undefined {
  const request = pending.get(id)
  if (!request) return undefined
  clearTimeout(request.timer)
  pending.delete(id)
  if (pending.size === 0) {
    window.removeEventListener('luckieverse:response', receive)
    window.removeEventListener('pagehide', cancel)
    window.removeEventListener('beforeunload', cancel)
  }
  return request
}

function receive(event: Event) {
  if (!(event instanceof CustomEvent)) return
  const reply = event.detail
  if (reply === null || typeof reply !== 'object' || reply.version !== 1 ||
      typeof reply.id !== 'string' || reply.type !== 'pong' ||
      (reply.platform !== 'android' && reply.platform !== 'ios')) return
  finish(reply.id)?.resolve({ version: 1, id: reply.id, type: 'pong', platform: reply.platform })
}

function cancel() {
  for (const id of pending.keys()) finish(id)?.reject(new Error('페이지가 변경되어 연결 확인을 취소했어.'))
}

export function pingNative(): Promise<Pong> {
  const bridge = window.LuckieverseBridge
  if (typeof bridge?.postMessage !== 'function') return Promise.reject(new Error('앱에서 연결을 확인할 수 있어.'))
  const id = `${documentId}:${++sequence}`
  return new Promise((resolve, reject) => {
    if (pending.size === 0) {
      window.addEventListener('luckieverse:response', receive)
      window.addEventListener('pagehide', cancel)
      window.addEventListener('beforeunload', cancel)
    }
    const timer = setTimeout(() => finish(id)?.reject(new Error('응답 시간이 초과됐어. 다시 시도해 줘.')), 5000)
    pending.set(id, { resolve, reject, timer })
    try {
      bridge.postMessage(JSON.stringify({ version: 1, id, type: 'ping' }))
    } catch (error) {
      finish(id)?.reject(error instanceof Error ? error : new Error('앱 연결에 실패했어.'))
    }
  })
}

if (import.meta.hot) import.meta.hot.dispose(cancel)
