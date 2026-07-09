import { routeEdges, zones, type RouteEdge } from '../data/stadium'
import type { RiskLevel, RoutePlan, RouteRequest } from '../../shared/schemas'
import { riskRank } from '../../shared/constants'

type QueueItem = {
  node: string
  cost: number
  path: RouteEdge[]
}

const zoneNameById = new Map(zones.map((zone) => [zone.id, zone.name]))
const zoneRiskById = new Map(zones.map((zone) => [zone.id, zone.status]))

function getNeighbors(node: string) {
  const forward = routeEdges.filter((edge) => edge.from === node)
  const backward = routeEdges
    .filter((edge) => edge.to === node)
    .map((edge) => ({
      ...edge,
      from: edge.to,
      to: edge.from,
    }))

  return [...forward, ...backward]
}

function costForEdge(edge: RouteEdge, request: RouteRequest) {
  const accessibilityPenalty = request.mobility === 'standard' ? 0 : edge.accessible ? 0 : Number.POSITIVE_INFINITY
  const crowdPenalty = request.avoidCrowds ? edge.crowdFactor * 5 : edge.crowdFactor * 2
  const sensoryPenalty = request.mobility === 'sensory-sensitive' && edge.crowdFactor > 0.7 ? 4 : 0
  return edge.minutes + crowdPenalty + accessibilityPenalty + sensoryPenalty
}

export function planRoute(request: RouteRequest): RoutePlan {
  const from = normalizeZoneId(request.from)
  const to = normalizeZoneId(request.to)

  if (!from || !to) {
    throw new Error('Unknown route endpoint')
  }

  if (from === to) {
    throw new Error('Start and destination must be different')
  }

  const queue: QueueItem[] = [{ node: from, cost: 0, path: [] }]
  const bestCost = new Map<string, number>([[from, 0]])

  while (queue.length > 0) {
    queue.sort((left, right) => left.cost - right.cost)
    const current = queue.shift()

    if (!current) {
      break
    }

    if (current.node === to) {
      return buildRoutePlan(current.path, request, from, to)
    }

    for (const edge of getNeighbors(current.node)) {
      const edgeCost = costForEdge(edge, request)

      if (!Number.isFinite(edgeCost)) {
        continue
      }

      const nextCost = current.cost + edgeCost
      const previousBest = bestCost.get(edge.to) ?? Number.POSITIVE_INFINITY

      if (nextCost < previousBest) {
        bestCost.set(edge.to, nextCost)
        queue.push({
          node: edge.to,
          cost: nextCost,
          path: [...current.path, edge],
        })
      }
    }
  }

  throw new Error('No accessible route found for the selected constraints')
}

export function normalizeZoneId(input: string) {
  const cleaned = input.trim().toLowerCase()
  const exact = zones.find((zone) => zone.id === cleaned)

  if (exact) {
    return exact.id
  }

  return zones.find((zone) => zone.name.toLowerCase() === cleaned)?.id
}

function buildRoutePlan(path: RouteEdge[], request: RouteRequest, from: string, to: string): RoutePlan {
  const riskLevel = highestPathRisk(path)
  const totalMinutes = Math.ceil(
    path.reduce((sum, edge) => sum + costForEdge(edge, request), 0),
  )

  return {
    from,
    to,
    totalMinutes,
    riskLevel,
    steps: path.map((edge) => ({
      from: edge.from,
      to: edge.to,
      minutes: Math.ceil(edge.minutes + (request.avoidCrowds ? edge.crowdFactor * 3 : 0)),
      instruction: `Use ${edge.label} from ${zoneNameById.get(edge.from)} to ${zoneNameById.get(edge.to)}.`,
      accessible: edge.accessible,
      crowdNote: edge.crowdFactor > 0.7 ? 'High crowd pressure, keep staff visibility up.' : 'Crowd pressure is manageable.',
    })),
    assumptions: [
      request.mobility === 'standard'
        ? 'Standard walking route requested.'
        : 'Route avoids non-accessible edges for the selected mobility need.',
      request.avoidCrowds ? 'Crowd pressure is weighted higher than shortest distance.' : 'Shortest viable travel time is weighted first.',
    ],
  }
}

function highestPathRisk(path: RouteEdge[]): RiskLevel {
  return path.reduce<RiskLevel>((highest, edge) => {
    const edgeRisk = zoneRiskById.get(edge.to) ?? 'low'
    return riskRank[edgeRisk] > riskRank[highest] ? edgeRisk : highest
  }, 'low')
}

export function listRouteOptions() {
  return zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    accessible: zone.accessible,
    status: zone.status,
  }))
}
