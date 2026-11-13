import { useSyncExternalStore } from 'react'

/**
 * Appearance: System (the default), Light or Dark. The choice is kept per browser. `index.html` applies it before the
 * first paint so there is no flash; this module keeps it in step afterwards and follows the system when it is on System.
 */
export type Appearance = 'system' | 'light' | 'dark'

const KEY = 'kd-admin-appearance'
const listeners = new Set<() => void>()

function read(): Appearance {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system' // storage can be blocked (private windows): the default still works
  }
}

const systemDark = () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

/** What is actually shown right now: the choice, or the system's when the choice is System. */
export function resolved(pref: Appearance = read()): 'light' | 'dark' {
  return pref === 'system' ? (systemDark() ? 'dark' : 'light') : pref
}

function apply() {
  const dark = resolved() === 'dark'
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  listeners.forEach((l) => l())
}

export function setAppearance(next: Appearance) {
  try {
    if (next === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, next)
  } catch {
    // Not saved, but it still applies for this visit.
  }
  apply()
}

let watching = false
function watchSystem() {
  if (watching || typeof window === 'undefined') return
  watching = true
  // On System, a change in the operating system's theme must follow at once.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (read() === 'system') apply()
  })
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) apply() // another tab changed it
  })
}

function subscribe(l: () => void) {
  watchSystem()
  listeners.add(l)
  return () => listeners.delete(l)
}

/** The current choice and what it resolves to, kept live. */
export function useAppearance() {
  const pref = useSyncExternalStore(subscribe, read, () => 'system' as Appearance)
  const shown = useSyncExternalStore(subscribe, () => resolved(), () => 'light' as const)
  return { pref, shown, set: setAppearance }
}
