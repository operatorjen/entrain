const DEFAULT_CONFIG = {
  wField: 0.7,
  wAction: 0.3,
  fieldScale: 1.0,
  minAgentsForCoupling: 2
}
const CLAMP_MIN = 0
const CLAMP_MAX = 1
const DEFAULT_FIELD_VALUE = 0
const DEFAULT_AMOUNT_VALUE = 0
const MIN_FIELD_SCALE = 1e-6
const FIELD_SIM_BASE = 1
const ACTION_SIGN_NEUTRAL = 0
const ACTION_SIM_BOTH_NEUTRAL = 1
const ACTION_SIM_ONE_NEUTRAL = 0.5
const ACTION_SIM_SAME_DIRECTION = 1
const ACTION_SIM_OPPOSITE = 0

function clamp01(x) { return x < CLAMP_MIN ? CLAMP_MIN : x > CLAMP_MAX ? CLAMP_MAX : x }

function extractField(tr) {
  if (tr && tr.nextPercept && typeof tr.nextPercept.field === 'number') return tr.nextPercept.field
  if (tr && tr.prevPercept && typeof tr.prevPercept.field === 'number') return tr.prevPercept.field
  return DEFAULT_FIELD_VALUE
}

function extractAmount(action) {
  if (!action || typeof action !== 'object') return DEFAULT_AMOUNT_VALUE
  if (typeof action.amount === 'number') return action.amount
  if (typeof action.delta === 'number') return action.delta
  if (typeof action.signal === 'number') return action.signal
  return DEFAULT_AMOUNT_VALUE
}

function fieldSimilarity(f1, f2, scale) {
  const diff = Math.abs(f1 - f2)
  const effectiveScale = Math.max(scale, MIN_FIELD_SCALE)
  return FIELD_SIM_BASE / (FIELD_SIM_BASE + diff * effectiveScale)
}

function actionSimilarity(a1, a2) {
  const s1 = Math.sign(a1)
  const s2 = Math.sign(a2)
  if (s1 === ACTION_SIGN_NEUTRAL && s2 === ACTION_SIGN_NEUTRAL) return ACTION_SIM_BOTH_NEUTRAL
  if (s1 === ACTION_SIGN_NEUTRAL || s2 === ACTION_SIGN_NEUTRAL) return ACTION_SIM_ONE_NEUTRAL
  if (s1 === s2) return ACTION_SIM_SAME_DIRECTION
  return ACTION_SIM_OPPOSITE
}

export class Entrain {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  update(traces = []) {
    const map = new Map()
    if (!Array.isArray(traces) || traces.length === 0) { return map }
    const n = traces.length
    const { wField, wAction, fieldScale, minAgentsForCoupling } = this.config
    if (n < minAgentsForCoupling) {
      for (const tr of traces) { map.set(tr.agentId, CLAMP_MIN) }
      return map
    }
    const fields = {}
    const amounts = {}
    for (const tr of traces) {
      fields[tr.agentId] = extractField(tr)
      amounts[tr.agentId] = extractAmount(tr.action)
    }
    const ids = traces.map(tr => tr.agentId)
    const pairSims = {}
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const id1 = ids[i]
        const id2 = ids[j]
        const fSim = fieldSimilarity(fields[id1], fields[id2], fieldScale)
        const aSim = actionSimilarity(amounts[id1], amounts[id2])
        const sim = clamp01(wField * fSim + wAction * aSim)
        pairSims[`${id1}|${id2}`] = sim
        pairSims[`${id2}|${id1}`] = sim
      }
    }
    for (const id of ids) {
      let sum = 0
      let count = 0
      for (const other of ids) {
        if (other === id) continue
        const key = `${id}|${other}`
        if (pairSims[key] != null) {
          sum += pairSims[key]
          count++
        }
      }
      const coupling = count > 0 ? sum / count : CLAMP_MIN
      map.set(id, clamp01(coupling))
    }
    return map
  }
}

export default Entrain