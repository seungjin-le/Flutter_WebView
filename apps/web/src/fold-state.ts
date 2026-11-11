import { isNativeAvailable } from './bridge'

export type FoldState = Readonly<{
  platform: 'ios' | 'android'
  deviceType: 'ios-duo' | 'android-fold' | 'unknown'
  posture: 'folded' | 'half-opened' | 'unfolded' | 'unknown'
}>

type Pending = { resolve(state: FoldState): void; reject(error: Error): void; timer: ReturnType<typeof setTimeout> }
type Subscriber = { listener(state: FoldState): void; onError?(error: Error): void }
const pending = new Map<string, Pending>()
const subscribers = new Set<Subscriber>()
const documentId = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
let sequence = 0
let subscriptionId: string | undefined
let subscriptionTimer: ReturnType<typeof setTimeout> | undefined
let snapshot: FoldState | undefined
let listening = false
let suspended = false
const nextId = () => `${documentId}:fold:${++sequence}`
const toError = (error: unknown) => error instanceof Error ? error : new Error('기기 상태 연결에 실패했어.')
const timeoutError = () => new Error('기기 상태 응답 시간이 초과됐어. 다시 시도해 줘.')

function post(type: string, id: string) {
  if (!isNativeAvailable()) throw new Error('앱에서 기기 상태를 확인할 수 있어.')
  window.LuckieverseBridge?.postMessage(JSON.stringify({ version: 1, id, type }))
}

function listen() {
  if (listening) return
  listening = true
  window.addEventListener('luckieverse:response', receive)
  window.addEventListener('pagehide', suspend)
  window.addEventListener('pageshow', resume)
}

function cleanup() {
  if (!listening || suspended || pending.size > 0 || subscribers.size > 0) return
  listening = false
  window.removeEventListener('luckieverse:response', receive)
  window.removeEventListener('pagehide', suspend)
  window.removeEventListener('pageshow', resume)
}

function finish(id: string) {
  const request = pending.get(id)
  if (request) { clearTimeout(request.timer); pending.delete(id); cleanup() }
  return request
}

function parseState(value: unknown): FoldState | undefined {
  if (value === null || typeof value !== 'object' ||
      !('platform' in value) || !('deviceType' in value) || !('posture' in value)) return
  const { platform, deviceType, posture } = value
  if (platform !== 'ios' && platform !== 'android') return
  if (deviceType !== 'unknown' && deviceType !== 'ios-duo' && deviceType !== 'android-fold') return
  if (deviceType !== 'unknown' && deviceType !== (platform === 'ios' ? 'ios-duo' : 'android-fold')) return
  if (posture !== 'folded' && posture !== 'half-opened' && posture !== 'unfolded' && posture !== 'unknown') return
  if (deviceType === 'unknown' && posture !== 'unknown') return
  if (platform === 'android' && posture === 'folded') return
  return Object.freeze({ platform, deviceType, posture })
}

function report(subscriber: Subscriber, error: Error) {
  // A consumer's callback must not interrupt other subscribers or bridge cleanup.
  try { subscriber.onError?.(error) } catch { /* Consumer owns its error handler. */ }
}

function notify(subscriber: Subscriber, state: FoldState) {
  try { subscriber.listener(state) } catch (error) { report(subscriber, toError(error)) }
}

function receive(event: Event) {
  if (!(event instanceof CustomEvent)) return
  const reply = event.detail
  if (reply === null || typeof reply !== 'object' || reply.version !== 1 ||
      reply.type !== 'foldState' || typeof reply.id !== 'string') return
  const state = parseState(reply.state)
  if (!state) return
  const request = finish(reply.id)
  if (request) { request.resolve(state); return }
  if (reply.id !== subscriptionId || suspended) return
  clearTimeout(subscriptionTimer)
  snapshot = state
  for (const subscriber of [...subscribers]) {
    if (subscribers.has(subscriber)) notify(subscriber, state)
  }
}

function stopSubscription() {
  const id = subscriptionId
  subscriptionId = undefined
  snapshot = undefined
  clearTimeout(subscriptionTimer)
  if (id) {
    try { post('unsubscribeFoldState', id) } catch { /* Local cleanup still succeeds. */ }
  }
}

function failSubscription(error: Error) {
  stopSubscription()
  for (const subscriber of [...subscribers]) report(subscriber, error)
}

function startSubscription() {
  if (subscriptionId || suspended || subscribers.size === 0) return
  const id = nextId()
  subscriptionId = id
  subscriptionTimer = setTimeout(() => {
    if (subscriptionId === id) failSubscription(timeoutError())
  }, 5000)
  try { post('subscribeFoldState', id) } catch (error) { failSubscription(toError(error)) }
}

function suspend() {
  suspended = true
  stopSubscription()
  for (const id of pending.keys()) finish(id)?.reject(new Error('페이지가 변경되어 기기 상태 조회를 취소했어.'))
}

function resume() {
  suspended = false
  startSubscription()
  cleanup()
}

export function getFoldState(): Promise<FoldState> {
  if (suspended) return Promise.reject(new Error('페이지가 변경되어 기기 상태 조회를 취소했어.'))
  const id = nextId()
  return new Promise((resolve, reject) => {
    listen()
    const timer = setTimeout(() => finish(id)?.reject(timeoutError()), 5000)
    pending.set(id, { resolve, reject, timer })
    try { post('getFoldState', id) } catch (error) { finish(id)?.reject(toError(error)) }
  })
}

export function subscribeFoldState(listener: (state: FoldState) => void, onError?: (error: Error) => void): () => void {
  const subscriber = { listener, onError }
  subscribers.add(subscriber)
  listen()
  if (snapshot) notify(subscriber, snapshot)
  else startSubscription()
  return () => {
    if (!subscribers.delete(subscriber)) return
    if (subscribers.size === 0) stopSubscription()
    cleanup()
  }
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  suspend()
  subscribers.clear()
  suspended = false
  cleanup()
})
