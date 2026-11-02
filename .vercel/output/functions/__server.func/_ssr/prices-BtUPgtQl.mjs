import { Jt as number, Qt as string, Ut as array, Vt as _enum, Yt as object } from "../_libs/@better-auth/core+[...].mjs";
import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { c as MARKETS } from "./rules-Cs28H3-y.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/prices-BtUPgtQl.js
var HOST = {
	americas: "https://west.albion-online-data.com",
	europe: "https://europe.albion-online-data.com",
	asia: "https://east.albion-online-data.com"
};
var Input = object({
	server: _enum([
		"asia",
		"europe",
		"americas"
	]),
	itemIds: array(string().regex(/^[A-Z0-9_@]+$/)).max(400),
	locations: array(_enum(MARKETS)).min(1).max(8),
	qualities: array(number().int().min(1).max(5)).min(1).max(5)
});
async function pullChunk(host, ids, locations, qualities) {
	const loc = locations.map((name) => encodeURIComponent(name)).join(",");
	const url = `${host}/api/v2/stats/prices/${ids.join(",")}.json?locations=${loc}&qualities=${qualities.join(",")}`;
	const res = await fetch(url, {
		headers: {
			Accept: "application/json",
			"Accept-Encoding": "gzip, deflate, br"
		},
		signal: AbortSignal.timeout(2e4)
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text.slice(0, 180) || `Market data ${res.status}`);
	}
	return await res.json();
}
var fetchMarketPrices_createServerFn_handler = createServerRpc({
	id: "42f59d9d4471ffd5477b3a5b6a4ae02e4546bc795ce9cc1866e55a2aa79c129a",
	name: "fetchMarketPrices",
	filename: "src/lib/forge/prices.ts"
}, (opts) => fetchMarketPrices.__executeServer(opts));
var fetchMarketPrices = createServerFn({ method: "POST" }).validator((input) => Input.parse(input)).handler(fetchMarketPrices_createServerFn_handler, async ({ data }) => {
	const ids = [...new Set(data.itemIds)];
	const host = HOST[data.server];
	const quotes = {};
	for (let i = 0; i < ids.length; i += 40) {
		const rows = await pullChunk(host, ids.slice(i, i + 40), [...data.locations], data.qualities);
		for (const row of rows) {
			const item = quotes[row.item_id] ??= {};
			const city = item[row.city] ??= {};
			city[String(row.quality)] = {
				sell: row.sell_price_min || 0,
				buy: row.buy_price_max || 0,
				sellDate: row.sell_price_min_date || "",
				buyDate: row.buy_price_max_date || ""
			};
		}
		if (i + 40 < ids.length) await new Promise((r) => setTimeout(r, 250));
	}
	return {
		quotes,
		fetchedAt: Date.now()
	};
});
//#endregion
export { fetchMarketPrices_createServerFn_handler };
