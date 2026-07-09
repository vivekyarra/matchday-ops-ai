import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, RefreshCw, ShieldCheck } from 'lucide-react'
import { APP_NAME, CHALLENGE_VERTICAL } from '../shared/constants'
import type { StadiumSnapshot } from '../shared/schemas'
import { AccessibleRoutePlanner } from './components/AccessibleRoutePlanner'
import { AIAssistant } from './components/AIAssistant'
import { MetricStrip } from './components/MetricStrip'
import { OperationsMap } from './components/OperationsMap'
import { SignalPanel } from './components/SignalPanel'
import { ZoneTable } from './components/ZoneTable'

async function fetchSnapshot() {
  const response = await fetch('/api/stadium/snapshot')

  if (!response.ok) {
    throw new Error('Unable to load venue snapshot')
  }

  return (await response.json()) as StadiumSnapshot
}

export default function App() {
  const [snapshot, setSnapshot] = useState<StadiumSnapshot | null>(null)
  const [selectedZoneId, setSelectedZoneId] = useState('fan-fest-plaza')
  const [error, setError] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadSnapshot = useCallback(async () => {
    setIsRefreshing(true)
    setError('')

    try {
      setSnapshot(await fetchSnapshot())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Snapshot request failed')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadSnapshot()
  }, [loadSnapshot])

  const selectedZone = useMemo(() => {
    return snapshot?.zones.find((zone) => zone.id === selectedZoneId) ?? snapshot?.zones[0]
  }, [selectedZoneId, snapshot])

  return (
    <main>
      <header className="app-header" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">{CHALLENGE_VERTICAL}</p>
          <h1 id="page-title">{APP_NAME}</h1>
          <p className="header-copy">
            Harbor Park Stadium command view for crowd flow, accessibility, transport, and
            sustainability during a World Cup 2026 matchday.
          </p>
        </div>
        <div className="header-actions" aria-label="System status">
          <span className="status-pill">
            <ShieldCheck size={16} aria-hidden="true" />
            Human approved
          </span>
          <button className="icon-button" type="button" onClick={loadSnapshot} aria-label="Refresh venue snapshot">
            <RefreshCw size={18} aria-hidden="true" className={isRefreshing ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {error ? (
        <section className="alert" role="alert">
          <Activity size={18} aria-hidden="true" />
          <span>{error}</span>
        </section>
      ) : null}

      {!snapshot ? (
        <section className="loading" role="status" aria-live="polite">
          Loading venue operations snapshot
        </section>
      ) : (
        <>
          <MetricStrip metrics={snapshot.metrics} />

          <section className="layout-grid" aria-label="Operations workspace">
            <div className="workspace-primary">
              <OperationsMap
                snapshot={snapshot}
                selectedZoneId={selectedZone?.id ?? ''}
                onSelectZone={setSelectedZoneId}
              />
              <ZoneTable snapshot={snapshot} selectedZoneId={selectedZone?.id ?? ''} onSelectZone={setSelectedZoneId} />
              <SignalPanel snapshot={snapshot} />
            </div>
            <aside className="workspace-side" aria-label="Decision tools">
              <AIAssistant snapshot={snapshot} selectedZone={selectedZone} />
              <AccessibleRoutePlanner zones={snapshot.zones} />
            </aside>
          </section>
        </>
      )}
    </main>
  )
}
