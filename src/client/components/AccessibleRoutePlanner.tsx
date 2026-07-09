import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Accessibility, Footprints, Route } from 'lucide-react'
import type { RoutePlan, RouteRequest, StadiumZone } from '../../shared/schemas'

type AccessibleRoutePlannerProps = {
  zones: StadiumZone[]
}

export function AccessibleRoutePlanner({ zones }: AccessibleRoutePlannerProps) {
  const defaultFrom = useMemo(() => zones.find((zone) => zone.id === 'north-gate')?.id ?? zones[0]?.id ?? '', [zones])
  const defaultTo = useMemo(() => zones.find((zone) => zone.id === 'section-224')?.id ?? zones[1]?.id ?? '', [zones])
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(defaultTo)
  const [mobility, setMobility] = useState<RouteRequest['mobility']>('wheelchair')
  const [avoidCrowds, setAvoidCrowds] = useState(true)
  const [plan, setPlan] = useState<RoutePlan | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function submitRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/routes/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          mobility,
          avoidCrowds,
        }),
      })

      if (!response.ok) {
        throw new Error('Route request failed')
      }

      setPlan((await response.json()) as RoutePlan)
    } catch (routeError) {
      setError(routeError instanceof Error ? routeError.message : 'Route request failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="panel route-panel" aria-labelledby="route-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Fan assistance</p>
          <h2 id="route-title">Accessible route</h2>
        </div>
        <Accessibility size={19} aria-hidden="true" />
      </div>

      <form className="route-form" onSubmit={submitRoute}>
        <label>
          From
          <select value={from} onChange={(event) => setFrom(event.target.value)}>
            {zones.map((zone) => (
              <option value={zone.id} key={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          To
          <select value={to} onChange={(event) => setTo(event.target.value)}>
            {zones.map((zone) => (
              <option value={zone.id} key={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mobility
          <select value={mobility} onChange={(event) => setMobility(event.target.value as RouteRequest['mobility'])}>
            <option value="standard">Standard</option>
            <option value="wheelchair">Wheelchair</option>
            <option value="low-vision">Low vision</option>
            <option value="sensory-sensitive">Sensory sensitive</option>
          </select>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={avoidCrowds} onChange={(event) => setAvoidCrowds(event.target.checked)} />
          Avoid crowd pressure
        </label>
        <button className="secondary-button" type="submit" disabled={isLoading || !from || !to || from === to}>
          <Route size={17} aria-hidden="true" />
          {isLoading ? 'Planning' : 'Plan route'}
        </button>
      </form>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {plan ? (
        <article className="route-output" aria-live="polite">
          <div className="route-summary">
            <Footprints size={18} aria-hidden="true" />
            <strong>{plan.totalMinutes} minutes</strong>
            <span className={`tag ${plan.riskLevel}`}>{plan.riskLevel}</span>
          </div>
          <ol>
            {plan.steps.map((step) => (
              <li key={`${step.from}-${step.to}`}>
                <strong>{step.minutes}m</strong>
                <span>{step.instruction}</span>
                <small>{step.crowdNote}</small>
              </li>
            ))}
          </ol>
        </article>
      ) : null}
    </section>
  )
}
