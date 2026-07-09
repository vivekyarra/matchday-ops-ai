import { routeEdges, zones, type RouteEdge } from '../data/stadium'
import type { RiskLevel, RoutePlan, RouteRequest } from '../../shared/schemas'
import { riskRank } from '../../shared/constants'

type QueueItem = {
  node: string
  cost: number
  path: RouteEdge[]
}

export class RoutePlanningError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoutePlanningError'
  }
}

const zoneNameById = new Map(zones.map((zone) => [zone.id, zone.name]))
const zoneRiskById = new Map(zones.map((zone) => [zone.id, zone.status]))
const routeNeighborsByNode = buildRouteNeighborMap(routeEdges)

function buildRouteNeighborMap(edges: RouteEdge[]) {
  const neighbors = new Map<string, RouteEdge[]>()

  function addNeighbor(node: string, edge: RouteEdge) {
    const nodeNeighbors = neighbors.get(node)

    if (nodeNeighbors) {
      nodeNeighbors.push(edge)
      return
    }

    neighbors.set(node, [edge])
  }

  for (const edge of edges) {
    addNeighbor(edge.from, edge)
    addNeighbor(edge.to, {
      ...edge,
      from: edge.to,
      to: edge.from,
    })
  }

  return neighbors
}

function getNeighbors(node: string) {
  return routeNeighborsByNode.get(node) ?? []
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
    throw new RoutePlanningError('Unknown route endpoint')
  }

  if (from === to) {
    throw new RoutePlanningError('Start and destination must be different')
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

  throw new RoutePlanningError('No accessible route found for the selected constraints')
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
  const riskLevel = highestPathRisk(path, from)
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

function highestPathRisk(path: RouteEdge[], startZoneId: string): RiskLevel {
  return path.reduce<RiskLevel>((highest, edge) => {
    const edgeRisk = zoneRiskById.get(edge.to) ?? 'low'
    return riskRank[edgeRisk] > riskRank[highest] ? edgeRisk : highest
  }, zoneRiskById.get(startZoneId) ?? 'low')
}

export function listRouteOptions() {
  return zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    accessible: zone.accessible,
    status: zone.status,
  }))
}
