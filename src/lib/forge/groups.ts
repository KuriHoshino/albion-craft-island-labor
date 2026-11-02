import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { authMiddleware } from "@/lib/auth/middleware"
import { DeskSchema } from "./desk"

const SaveInput = z.object({
  id: z.string().min(1).max(80).nullable(),
  name: z.string().trim().min(1).max(80),
  summary: z.string().max(240),
  desk: DeskSchema,
})

export type CraftGroupCard = {
  id: string
  name: string
  summary: string
  craftCount: number
  updatedAt: string
}

function newId() {
  return crypto.randomUUID()
}

export const listCraftGroups = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getSql } = await import("@/lib/db")
    const sql = await getSql()
    const rows = await sql<{
      id: string
      name: string
      summary: string
      craft_count: number
      updated_at: string
    }>`
      select id, name, summary, craft_count, updated_at
      from craft_groups
      where user_id = ${context.userId}
      order by updated_at desc
    `
    return rows.map(
      (row): CraftGroupCard => ({
        id: row.id,
        name: row.name,
        summary: row.summary,
        craftCount: Number(row.craft_count),
        updatedAt: String(row.updated_at),
      }),
    )
  })

export const loadCraftGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db")
    const sql = await getSql()
    const rows = await sql<{ name: string; payload: string }>`
      select name, payload from craft_groups
      where id = ${data.id} and user_id = ${context.userId}
    `
    const row = rows[0]
    if (!row) return null
    return { id: data.id, name: row.name, desk: DeskSchema.parse(JSON.parse(row.payload)) }
  })

export const saveCraftGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db")
    const sql = await getSql()
    const payload = JSON.stringify(data.desk)
    const count = data.desk.lines.length
    if (data.id) {
      const updated = await sql<{ id: string }>`
        update craft_groups
        set name = ${data.name},
            summary = ${data.summary},
            craft_count = ${count},
            payload = ${payload},
            updated_at = now()
        where id = ${data.id} and user_id = ${context.userId}
        returning id
      `
      if (updated[0]) return { id: updated[0].id }
    }
    const id = newId()
    await sql`
      insert into craft_groups (id, user_id, name, summary, craft_count, payload)
      values (${id}, ${context.userId}, ${data.name}, ${data.summary}, ${count}, ${payload})
    `
    return { id }
  })

export const deleteCraftGroup = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ id: z.string().min(1).max(80) }).parse(input))
  .handler(async ({ context, data }) => {
    const { getSql } = await import("@/lib/db")
    const sql = await getSql()
    await sql`delete from craft_groups where id = ${data.id} and user_id = ${context.userId}`
    return { ok: true }
  })
