import { describe, expect, it } from 'vitest'
import { planRoute } from '../src/server/services/routePlanner'

describe('route planner', () => {
  it('keeps wheelchair routes on accessible edges', () => {
    const plan = planRoute({
      from: 'north-gate',
      to: 'section-224',
      mobility: 'wheelchair',
      avoidCrowds: true,
    })

    expect(plan.totalMinutes).toBeGreaterThan(0)
    expect(plan.steps.length).toBeGreaterThan(1)
    expect(plan.steps.every((step) => step.accessible)).toBe(true)
  })

  it('allows a shorter standard route when stairs are acceptable', () => {
    const standard = planRoute({
      from: 'east-gate',
      to: 'section-224',
      mobility: 'standard',
      avoidCrowds: false,
    })
    const wheelchair = planRoute({
      from: 'east-gate',
      to: 'section-224',
      mobility: 'wheelchair',
      avoidCrowds: false,
    })

    expect(standard.totalMinutes).toBeLessThan(wheelchair.totalMinutes)
  })

  it('rejects unknown route endpoints', () => {
    expect(() =>
      planRoute({
        from: 'unknown',
        to: 'section-224',
        mobility: 'standard',
        avoidCrowds: true,
      }),
    ).toThrow('Unknown route endpoint')
  })
})
