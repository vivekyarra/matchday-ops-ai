import { AlertCircle, Bus, TrainFront, Waves } from 'lucide-react'
import type { Incident, StadiumSnapshot, TransitSignal } from '../../shared/schemas'

type SignalPanelProps = {
  snapshot: StadiumSnapshot
}

const transitIcons: Record<TransitSignal['mode'], typeof TrainFront> = {
  metro: TrainFront,
  bus: Bus,
  rideshare: Bus,
  walk: Waves,
}

export function SignalPanel({ snapshot }: SignalPanelProps) {
  const sustainability = [
    {
      label: 'Water refill use',
      value: snapshot.sustainability.waterRefillUtilization,
      target: 'Keep below 85% to avoid refill queues',
    },
    {
      label: 'Waste diversion',
      value: snapshot.sustainability.wasteDiversionRate,
      target: 'Target 70% diversion',
    },
    {
      label: 'Energy load',
      value: 100 - snapshot.sustainability.energyLoadPercent,
      target: `${snapshot.sustainability.energyLoadPercent}% venue load`,
    },
    {
      label: 'Cup returns',
      value: snapshot.sustainability.reusableCupReturnRate,
      target: 'Target 75% return rate',
    },
  ]

  return (
    <section className="panel signal-panel" aria-labelledby="signals-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Venue signals</p>
          <h2 id="signals-title">Incidents, transport, sustainability</h2>
        </div>
      </div>

      <div className="signal-grid">
        <div className="signal-column">
          <h3>Open incidents</h3>
          <ul className="signal-list">
            {snapshot.incidents.map((incident) => (
              <IncidentItem incident={incident} key={incident.id} />
            ))}
          </ul>
        </div>

        <div className="signal-column">
          <h3>Transport pressure</h3>
          <ul className="signal-list">
            {snapshot.transit.map((signal) => {
              const Icon = transitIcons[signal.mode]

              return (
                <li className="signal-row" key={`${signal.mode}-${signal.label}`}>
                  <Icon size={18} aria-hidden="true" />
                  <div>
                    <strong>{signal.label}</strong>
                    <span>
                      {signal.loadPercent}% load, next arrival {signal.nextArrivalMinutes}m
                    </span>
                  </div>
                  <span className={`tag ${signal.status}`}>{signal.status}</span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="signal-column">
          <h3>Sustainability</h3>
          <div className="sustainability-bars">
            {sustainability.map((item) => (
              <div className="bar-row" key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.target}</span>
                </div>
                <div
                  className="bar-track"
                  role="progressbar"
                  aria-label={`${item.label} ${item.value}%`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={item.value}
                >
                  <span style={{ width: `${item.value}%` }}></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function IncidentItem({ incident }: { incident: Incident }) {
  return (
    <li className="signal-row">
      <AlertCircle size={18} aria-hidden="true" />
      <div>
        <strong>{incident.title}</strong>
        <span>
          {incident.owner}: {incident.summary}
        </span>
      </div>
      <span className={`tag ${incident.severity}`}>{incident.severity}</span>
    </li>
  )
}
