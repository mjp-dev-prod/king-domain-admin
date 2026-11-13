// Reads the brand tokens in src/index.css and checks WCAG contrast in BOTH themes: every text colour on every surface
// and tinted card (4.5:1), the input edge and focus ring (3:1), and white on the violet button (4.5:1). Also reports how
// far apart the surfaces are, so "areas don't read as sections" can be measured. Exits 1 if anything fails.
// Run: npm run check:contrast
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8').split('\r\n').join('\n')

/** The body of the first rule whose selector is exactly `selector` (":root" or ".dark"). */
function block(selector) {
  const start = css.search(new RegExp('(^|\\n)' + selector.replace('.', '\\.') + '\\s*\\{'))
  if (start < 0) throw new Error('no ' + selector + ' block in index.css')
  const open = css.indexOf('{', start)
  const close = css.indexOf('\n}', open)
  return css.slice(open + 1, close)
}

function tokens(src) {
  const out = {}
  for (const m of src.matchAll(/--kd-([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}

const light = tokens(block(':root'))
const dark = { ...light, ...tokens(block('.dark')) }

function parse(v) {
  if (!v.startsWith('#')) throw new Error('cannot read colour "' + v + '"')
  const s = v.slice(1)
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16))
}
const lin = (v) => {
  v /= 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
// color-mix(in srgb, X p%, Y) is a straight mix of the channel values.
const mix = (x, p, y) => x.map((c, i) => Math.round(c * p + y[i] * (1 - p)))

let failed = 0
function check(name, got, need) {
  const ok = got >= need
  if (!ok) failed++
  return (ok ? 'ok   ' : 'FAIL ') + name.padEnd(46) + got.toFixed(2) + ' (needs ' + need + ')'
}

// The tint percentages here must match the --kd-*-tint rules in index.css.
for (const [theme, t] of [['light', light], ['dark', dark]]) {
  console.log('\n== ' + theme)
  const c = Object.fromEntries(Object.entries(t).filter(([k]) => k !== 'line' && k !== 'shadow').map(([k, v]) => [k, parse(v)]))
  const surfaces = { ground: c.ground, 'surface 1': c.s1, 'surface 2': c.s2, 'surface 3': c.s3 }
  const tints = {
    'brand card': mix(c.violet, 0.12, c.s1),
    'money card': mix(c.money, 0.12, c.s1),
    'ok card': mix(c.ok, 0.13, c.s1),
    'warn card': mix(c.warn, 0.13, c.s1),
    'bad card': mix(c.bad, 0.12, c.s1),
  }
  const where = { ...surfaces, ...tints }
  const inks = {
    text: c.text,
    'text 2': c['text-2'],
    'text 3 (hints)': c['text-3'],
    'violet text': c['violet-text'],
    'money (gold text)': c.money,
    'ok (green)': c.ok,
    'warn (amber)': c.warn,
    'bad (red)': c.bad,
  }
  for (const [iname, ink] of Object.entries(inks)) {
    let worst = { r: 99, on: '' }
    for (const [wname, bg] of Object.entries(where)) {
      const r = ratio(ink, bg)
      if (r < worst.r) worst = { r, on: wname }
    }
    console.log(check(iname + ' (worst: ' + worst.on + ')', worst.r, 4.5))
  }
  console.log(check('white on the violet button', ratio(c['on-violet'], c.violet), 4.5))
  console.log(check('input edge on a card', ratio(c.field, c.s1), 3))
  console.log(check('input edge on the page', ratio(c.field, c.ground), 3))
  console.log(check('focus ring on the page', ratio(c['violet-text'], c.ground), 3))
  console.log(check('focus ring on a card', ratio(c['violet-text'], c.s1), 3))
  console.log('info  card vs page ' + ratio(c.s1, c.ground).toFixed(2) + ', tile vs card ' + ratio(c.s2, c.s1).toFixed(2) + ', selected vs card ' + ratio(c.s3, c.s1).toFixed(2))
}

if (failed) {
  console.error('\n' + failed + ' contrast check(s) failed')
  process.exit(1)
}
console.log('\nAll contrast checks passed, light and dark.')
