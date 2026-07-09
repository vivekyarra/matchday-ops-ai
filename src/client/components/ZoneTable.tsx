import type { StadiumSnapshot } from '../../shared/schemas'

type ZoneTableProps = {
  snapshot: StadiumSnapshot
  selectedZoneId: string
  onSelectZone: (zoneId: string) => void
}

export function ZoneTable({ snapshot, selectedZoneId, onSelectZone }: ZoneTableProps) {
  return (
    <section className="panel" aria-labelledby="zone-table-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Command queue</p>
          <h2 id="zone-table-title">Zone priorities</h2>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <caption>Operational risk by stadium zone</caption>
          <thead>
            <tr>
              <th scope="col">Zone</th>
              <th scope="col">Risk</th>
              <th scope="col">Load</th>
              <th scope="col">Queue</th>
              <th scope="col">Staff</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.assessments.map((assessment) => {
              const zone = snapshot.zones.find((candidate) => candidate.id === assessment.zoneId)

              if (!zone) {
                return null
              }

              return (
                <tr key={zone.id} className={selectedZoneId === zone.id ? 'selected-row' : ''}>
                  <th scope="row">
                    <button type="button" className="text-button" onClick={() => onSelectZone(zone.id)}>
                      {zone.name}
                    </button>
                  </th>
                  <td>
                    <span className={`tag ${assessment.riskLevel}`}>{assessment.riskScore}</span>
                  </td>
                  <td>{Math.round((zone.occupancy / zone.capacity) * 100)}%</td>
                  <td>{zone.queueMinutes}m</td>
                  <td>
                    {zone.staffAvailable}/{zone.staffNeeded}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
