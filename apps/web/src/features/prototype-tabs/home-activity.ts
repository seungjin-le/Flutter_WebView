export type HomeActivity =
  | { act: 'browse'; seconds: number }
  | { act: 'like' | 'share'; id: string }
  | { act: 'result'; id: string; resultId: string }

const pending: HomeActivity[] = []
let recipient: ((event: HomeActivity) => void) | undefined
let guest = false
let seconds = 40
let lastInteraction = -Infinity

export function subscribeHomeActivity(send: (event: HomeActivity) => void) {
  recipient = send
  for (const event of pending.splice(0)) send(event)
  return () => {
    if (recipient === send) recipient = undefined
  }
}

export function setPrototypeGuest(value: boolean) {
  guest = value
}

export function recordHomeActivity(event: HomeActivity) {
  if (guest && event.act !== 'result') return
  if (recipient) recipient(event)
  else pending.push(event)
}

export function touchFeed() {
  lastInteraction = Date.now()
}

export function browseSeconds() {
  return seconds
}

export function tickBrowse() {
  if (!guest && !document.hidden && seconds < 180 && Date.now() - lastInteraction <= 5000) {
    seconds++
    recordHomeActivity({ act: 'browse', seconds })
  }
  return seconds
}
