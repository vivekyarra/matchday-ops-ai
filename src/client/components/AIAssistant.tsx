import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Languages, Send, Sparkles } from 'lucide-react'
import { languageOptions, roleLabels } from '../../shared/constants'
import type {
  DecisionResponse,
  LanguageCode,
  RiskLevel,
  Role,
  StadiumSnapshot,
  StadiumZone,
} from '../../shared/schemas'

type AIAssistantProps = {
  snapshot: StadiumSnapshot
  selectedZone?: StadiumZone
}

const urgencyOptions: RiskLevel[] = ['medium', 'high', 'critical']

export function AIAssistant({ selectedZone }: AIAssistantProps) {
  const [role, setRole] = useState<Role>('operations')
  const [language, setLanguage] = useState<LanguageCode>('en')
  const [urgency, setUrgency] = useState<RiskLevel>('high')
  const [prompt, setPrompt] = useState('')
  const [decision, setDecision] = useState<DecisionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!prompt.trim() && selectedZone) {
      setPrompt(
        `Create a safe staff action plan for ${selectedZone.name}. Include fan messaging, accessibility support, and sustainability considerations.`,
      )
    }
  }, [prompt, selectedZone])

  async function submitDecisionRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/operations/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          language,
          urgency,
          prompt,
          includePublicMessage: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Decision request failed')
      }

      setDecision((await response.json()) as DecisionResponse)
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Decision request failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="panel ai-panel" aria-labelledby="ai-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">GenAI support</p>
          <h2 id="ai-title">Ops briefing</h2>
        </div>
        <span className="status-pill compact">
          <Sparkles size={15} aria-hidden="true" />
          {decision?.source ?? 'ready'}
        </span>
      </div>

      <form className="decision-form" onSubmit={submitDecisionRequest}>
        <div className="control-grid">
          <label>
            Role
            <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
              {Object.entries(roleLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Language
            <span className="input-with-icon">
              <Languages size={16} aria-hidden="true" />
              <select value={language} onChange={(event) => setLanguage(event.target.value as LanguageCode)}>
                {languageOptions.map((option) => (
                  <option value={option.code} key={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label>
            Urgency
            <select value={urgency} onChange={(event) => setUrgency(event.target.value as RiskLevel)}>
              {urgencyOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Operator prompt
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={4} maxLength={1200} />
        </label>

        <button className="primary-button" type="submit" disabled={isLoading || prompt.trim().length < 8}>
          <Send size={17} aria-hidden="true" />
          {isLoading ? 'Generating' : 'Generate briefing'}
        </button>
      </form>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {decision ? (
        <article className="decision-output" aria-live="polite">
          <div>
            <span className={`tag ${decision.riskLevel}`}>{decision.riskLevel}</span>
            <strong>{decision.summary}</strong>
          </div>
          <ol>
            {decision.recommendedActions.map((action) => (
              <li key={`${action.owner}-${action.action}`}>
                <span>{action.priority}</span>
                <strong>{action.owner}</strong>
                <p>{action.action}</p>
                <small>{action.rationale}</small>
              </li>
            ))}
          </ol>
          <div className="briefing-grid">
            <p>
              <strong>Public</strong>
              <span dir="auto">{decision.publicMessage}</span>
            </p>
            <p>
              <strong>Access</strong>
              <span dir="auto">{decision.accessibilityNote}</span>
            </p>
            <p>
              <strong>Sustainability</strong>
              {decision.sustainabilityNote}
            </p>
          </div>
          <details className="decision-assumptions">
            <summary>Decision transparency</summary>
            <p>
              Confidence {Math.round(decision.confidence * 100)}%. Generated by {decision.source}
              {decision.cacheHit ? ' from cache' : ''}.
            </p>
            <ul>
              {decision.assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </details>
        </article>
      ) : null}
    </section>
  )
}
