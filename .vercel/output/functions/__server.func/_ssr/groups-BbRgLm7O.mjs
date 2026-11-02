import { Qt as string, Yt as object } from "../_libs/@better-auth/core+[...].mjs";
import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { n as authMiddleware, t as DeskSchema } from "./desk-TA8fEgQ7.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/groups-BbRgLm7O.js
var SaveInput = object({
	id: string().min(1).max(80).nullable(),
	name: string().trim().min(1).max(80),
	summary: string().max(240),
	desk: DeskSchema
});
function newId() {
	return crypto.randomUUID();
}
var listCraftGroups_createServerFn_handler = createServerRpc({
	id: "fcda325398c22b6a5bf87e27d2b5246b08926ee17f10301aa3ab21cfa7ed84b3",
	name: "listCraftGroups",
	filename: "src/lib/forge/groups.ts"
}, (opts) => listCraftGroups.__executeServer(opts));
var listCraftGroups = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(listCraftGroups_createServerFn_handler, async ({ context }) => {
	const { getSql } = await import("./db-CbBX1pmk.mjs").then((n) => n.t).then((n) => n.t);
	return (await (await getSql())`
      select id, name, summary, craft_count, updated_at
      from craft_groups
      where user_id = ${context.userId}
      order by updated_at desc
    `).map((row) => ({
		id: row.id,
		name: row.name,
		summary: row.summary,
		craftCount: Number(row.craft_count),
		updatedAt: String(row.updated_at)
	}));
});
var loadCraftGroup_createServerFn_handler = createServerRpc({
	id: "5e40a97356d4c329676960f6b064d42a72b45da9241052dda2d692c30964aacb",
	name: "loadCraftGroup",
	filename: "src/lib/forge/groups.ts"
}, (opts) => loadCraftGroup.__executeServer(opts));
var loadCraftGroup = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({ id: string().min(1).max(80) }).parse(input)).handler(loadCraftGroup_createServerFn_handler, async ({ context, data }) => {
	const { getSql } = await import("./db-CbBX1pmk.mjs").then((n) => n.t).then((n) => n.t);
	const row = (await (await getSql())`
      select name, payload from craft_groups
      where id = ${data.id} and user_id = ${context.userId}
    `)[0];
	if (!row) return null;
	return {
		id: data.id,
		name: row.name,
		desk: DeskSchema.parse(JSON.parse(row.payload))
	};
});
var saveCraftGroup_createServerFn_handler = createServerRpc({
	id: "4bb74e2c1562f8eecf2090806bb0bbcd1875d93afd00c7d2d609699c92a58f56",
	name: "saveCraftGroup",
	filename: "src/lib/forge/groups.ts"
}, (opts) => saveCraftGroup.__executeServer(opts));
var saveCraftGroup = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => SaveInput.parse(input)).handler(saveCraftGroup_createServerFn_handler, async ({ context, data }) => {
	const { getSql } = await import("./db-CbBX1pmk.mjs").then((n) => n.t).then((n) => n.t);
	const sql = await getSql();
	const payload = JSON.stringify(data.desk);
	const count = data.desk.lines.length;
	if (data.id) {
		const updated = await sql`
        update craft_groups
        set name = ${data.name},
            summary = ${data.summary},
            craft_count = ${count},
            payload = ${payload},
            updated_at = now()
        where id = ${data.id} and user_id = ${context.userId}
        returning id
      `;
		if (updated[0]) return { id: updated[0].id };
	}
	const id = newId();
	await sql`
      insert into craft_groups (id, user_id, name, summary, craft_count, payload)
      values (${id}, ${context.userId}, ${data.name}, ${data.summary}, ${count}, ${payload})
    `;
	return { id };
});
var deleteCraftGroup_createServerFn_handler = createServerRpc({
	id: "f91a6c1069a80fedc83dbcaed7cb2e336842c9d2f88adcc0c9445338c67dacdc",
	name: "deleteCraftGroup",
	filename: "src/lib/forge/groups.ts"
}, (opts) => deleteCraftGroup.__executeServer(opts));
var deleteCraftGroup = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((input) => object({ id: string().min(1).max(80) }).parse(input)).handler(deleteCraftGroup_createServerFn_handler, async ({ context, data }) => {
	const { getSql } = await import("./db-CbBX1pmk.mjs").then((n) => n.t).then((n) => n.t);
	await (await getSql())`delete from craft_groups where id = ${data.id} and user_id = ${context.userId}`;
	return { ok: true };
});
//#endregion
export { deleteCraftGroup_createServerFn_handler, listCraftGroups_createServerFn_handler, loadCraftGroup_createServerFn_handler, saveCraftGroup_createServerFn_handler };
