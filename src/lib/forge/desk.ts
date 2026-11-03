import { z } from "zod"
import type { Line } from "./store"

export const DeskSchema = z.object({
  server: z.enum(["asia", "europe", "americas"]),
  premium: z.boolean(),
  buyCity: z.string().min(1).max(40),
  sellCity: z.string().min(1).max(40),
  buyMode: z.enum(["instant", "order"]),
  sellMode: z.enum(["order", "instant", "notax"]),
  leftover: z.enum(["reuse", "sell"]),
  stationRate: z.number().min(0).max(10000),
  quality: z.number().int().min(1).max(5),
  active: z.string().min(1).max(40),
  lines: z
    .array(
      z.object({
        uid: z.string().min(1).max(40),
        itemId: z.string().min(1).max(80),
        enchant: z.number().int().min(0).max(4),
        route: z.enum(["direct", "upgrade"]),
        runs: z.number().int().min(1).max(100000),
        place: z.enum(["city", "island", "hideout"]),
        city: z.string().min(1).max(40),
        power: z.number().int().min(1).max(20),
        hoBiome: z.enum(["forest", "swamp", "highland", "steppe", "mountain", "caerleon", "brecilien"]),
        hoQuality: z.number().int().min(1).max(6),
        hoRegion: z.enum(["outlands", "roads"]),
        extra: z.number().min(0).max(100),
        focus: z.boolean(),
        daily: z.union([z.literal(0), z.literal(10), z.literal(20)]),
        mastery: z.number().min(0).max(100),
        specialist: z.number().min(0).max(100),
        siblings: z.number().min(0).max(100),
        journal: z.boolean(),
        journalTier: z.number().int().min(2).max(8).optional(),
        productOverride: z.number().nullable(),
        matOverrides: z.record(z.string().max(80), z.number()),
        focusOverride: z.number().nullable(),
      }),
    )
    .min(1)
    .max(40),
})

export type DeskSnapshot = z.infer<typeof DeskSchema>

export function snapshotFrom(state: {
  server: DeskSnapshot["server"]
  premium: boolean
  buyCity: string
  sellCity: string
  buyMode: DeskSnapshot["buyMode"]
  sellMode: DeskSnapshot["sellMode"]
  leftover: DeskSnapshot["leftover"]
  stationRate: number
  quality: number
  active: string
  lines: Line[]
}): DeskSnapshot {
  return DeskSchema.parse({
    server: state.server,
    premium: state.premium,
    buyCity: state.buyCity,
    sellCity: state.sellCity,
    buyMode: state.buyMode,
    sellMode: state.sellMode,
    leftover: state.leftover,
    stationRate: state.stationRate,
    quality: state.quality,
    active: state.active,
    lines: state.lines,
  })
}
