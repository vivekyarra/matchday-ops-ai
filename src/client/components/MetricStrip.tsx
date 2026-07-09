import { Clock, Footprints, Leaf, UsersRound, Waypoints } from 'lucide-react'
import type { StadiumSnapshot } from '../../shared/schemas'

type MetricStripProps = {
  metrics: StadiumSnapshot['metrics']
}

export function MetricStrip({ metrics }: MetricStripProps) {
  const items = [
    {
      label: 'Attendance',
      value: metrics.attendance.toLocaleString(),
      detail: `${metrics.venueLoadPercent}% venue load`,
      icon: UsersRound,
    },
    {
      label: 'Queue',
      value: `${metrics.averageQueueMinutes} min`,
      detail: 'average wait',
      icon: Clock,
    },
    {
      label: 'Risk zones',
      value: String(metrics.highRiskZones),
      detail: `${metrics.openIncidents} open incidents`,
      icon: Waypoints,
    },
    {
      label: 'Accessibility',
      value: `${metrics.accessibilityReadinessPercent}%`,
      detail: 'readiness score',
      icon: Footprints,
    },
    {
      label: 'Sustainability',
      value: `${metrics.sustainabilityScore}%`,
      detail: 'operations score',
      icon: Leaf,
    },
  ]

  return (
    <section className="metric-strip" aria-label="Venue metrics">
      {items.map((item) => {
        const Icon = item.icon

        return (
          <article className="metric" key={item.label}>
            <Icon size={19} aria-hidden="true" />
            <div>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </div>
          </article>
        )
      })}
    </section>
  )
}
