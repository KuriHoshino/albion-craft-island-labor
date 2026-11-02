import { $t as union, Jt as number, Kt as literal, Qt as string, Ut as array, Vt as _enum, Wt as boolean, Yt as object, Zt as record } from "../_libs/@better-auth/core+[...].mjs";
import { n as createMiddleware } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/desk-TA8fEgQ7.js
/**
* Auth middleware for server functions — the standard way to get the caller's
* verified user id. When deployed the session cookie is same-origin and rides
* along automatically. In the live preview the client also forwards the bearer
* token (partitioned cookies) via the `.client` hook below — call sites do not
* thread it themselves.
*
*   import { createServerFn } from "@tanstack/react-start";
*   import { getSql } from "@/lib/db";
*   import { authMiddleware } from "@/lib/auth/middleware";
*
*   export const listTodos = createServerFn({ method: "GET" })
*     .middleware([authMiddleware])
*     .handler(async ({ context }) => {
*       const sql = await getSql();
*       return sql`select * from todos where user_id = ${context.userId}`;
*     });
*
* Signed out with auth on (live preview included) -> throws `UnauthorizedError`
* (see `verify.server.ts`). With auth disabled (`VITE_AUTH_ENABLED=false`, the
* shipped default) it resolves the shared dev user — but throws instead when a
* `DATABASE_URL` is also set, so an app without sign-in must not use this at
* all. On the auth-on path, use it on every server function that touches
* per-user data and scope every query by `context.userId`.
*/
var authMiddleware = createMiddleware({ type: "function" }).client(async ({ next }) => {
	const { getBearerToken } = await import("./client-IWHfIGH2.mjs").then((n) => n.n);
	return next({ sendContext: { bearerToken: getBearerToken() ?? void 0 } });
}).server(async ({ next, context }) => {
	const { assertSameSiteRequest } = await import("./isolation.server-CGNg1r0B.mjs");
	const { requireUserId } = await import("./verify.server-BIa3Repb.mjs");
	assertSameSiteRequest();
	return next({ context: { userId: await requireUserId(context.bearerToken) } });
});
var DeskSchema = object({
	server: _enum([
		"asia",
		"europe",
		"americas"
	]),
	premium: boolean(),
	buyCity: string().min(1).max(40),
	sellCity: string().min(1).max(40),
	buyMode: _enum(["instant", "order"]),
	sellMode: _enum([
		"order",
		"instant",
		"notax"
	]),
	leftover: _enum(["reuse", "sell"]),
	stationRate: number().min(0).max(1e4),
	quality: number().int().min(1).max(5),
	active: string().min(1).max(40),
	lines: array(object({
		uid: string().min(1).max(40),
		itemId: string().min(1).max(80),
		enchant: number().int().min(0).max(4),
		route: _enum(["direct", "upgrade"]),
		runs: number().int().min(1).max(1e5),
		place: _enum([
			"city",
			"island",
			"hideout"
		]),
		city: string().min(1).max(40),
		power: number().int().min(1).max(20),
		hoBiome: _enum([
			"forest",
			"swamp",
			"highland",
			"steppe",
			"mountain",
			"caerleon",
			"brecilien"
		]),
		hoQuality: number().int().min(1).max(6),
		hoRegion: _enum(["outlands", "roads"]),
		extra: number().min(0).max(100),
		focus: boolean(),
		daily: union([
			literal(0),
			literal(10),
			literal(20)
		]),
		mastery: number().min(0).max(100),
		specialist: number().min(0).max(100),
		siblings: number().min(0).max(100),
		journal: boolean(),
		productOverride: number().nullable(),
		matOverrides: record(string().max(80), number()),
		focusOverride: number().nullable()
	})).min(1).max(40)
});
function snapshotFrom(state) {
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
		lines: state.lines
	});
}
//#endregion
export { authMiddleware as n, snapshotFrom as r, DeskSchema as t };
