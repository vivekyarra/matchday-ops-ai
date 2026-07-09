import { AlertTriangle, CircleDot, RadioTower } from 'lucide-react'
import type { StadiumSnapshot, StadiumZone } from '../../shared/schemas'

type OperationsMapProps = {
  snapshot: StadiumSnapshot
  selectedZoneId: string
  onSelectZone: (zoneId: string) => void
}

export function OperationsMap({ snapshot, selectedZoneId, onSelectZone }: OperationsMapProps) {
  const selectedAssessment = snapshot.assessments.find((assessment) => assessment.zoneId === selectedZoneId)

  return (
    <section className="panel map-panel" aria-labelledby="map-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Live venue</p>
          <h2 id="map-title">Operations map</h2>
        </div>
        <span className="map-time">
          <RadioTower size={16} aria-hidden="true" />
          {new Date(snapshot.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="map-canvas" role="group" aria-label="Interactive stadium map with color coded venue zones">
        <div className="pitch" aria-hidden="true">
          <span>Field</span>
        </div>
        {snapshot.zones.map((zone) => (
          <ZoneButton
            key={zone.id}
            zone={zone}
            selected={zone.id === selectedZoneId}
            onSelectZone={onSelectZone}
          />
        ))}
      </div>

      <div className="selected-zone" aria-live="polite">
        <div>
          <span className={`risk-dot ${selectedAssessment?.riskLevel ?? 'low'}`}></span>
          <strong>{snapshot.zones.find((zone) => zone.id === selectedZoneId)?.name}</strong>
        </div>
        <p>
          Risk {selectedAssessment?.riskScore ?? 0}/100.{' '}
          {selectedAssessment?.drivers.join(', ') ?? 'No active drivers.'}
        </p>
        {selectedAssessment?.riskLevel === 'high' || selectedAssessment?.riskLevel === 'critical' ? (
          <span className="attention">
            <AlertTriangle size={16} aria-hidden="true" />
            Dispatch review needed
          </span>
        ) : null}
      </div>
    </section>
  )
}

function ZoneButton({
  zone,
  selected,
  onSelectZone,
}: {
  zone: StadiumZone
  selected: boolean
  onSelectZone: (zoneId: string) => void
}) {
  return (
    <button
      type="button"
      className={`zone-marker zone-${zone.id} ${zone.status} ${selected ? 'selected' : ''}`}
      onClick={() => onSelectZone(zone.id)}
      aria-pressed={selected}
      aria-label={`${zone.name}, ${zone.status} risk, ${zone.queueMinutes} minute queue`}
    >
      <CircleDot size={17} aria-hidden="true" />
      <span>{shortName(zone.name)}</span>
    </button>
  )
}

function shortName(name: string) {
  return name
    .replace('Accessibility', 'Access')
    .replace('Fan Fest', 'Fan')
    .replace('Medical Post', 'Medical')
}
