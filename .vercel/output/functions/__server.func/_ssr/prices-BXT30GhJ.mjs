import { Jt as number, Qt as string, Ut as array, Vt as _enum, Yt as object } from "../_libs/@better-auth/core+[...].mjs";
import { r as createServerFn } from "./ssr.mjs";
import { t as createServerRpc } from "./createServerRpc-CcvdN_gc.mjs";
import { l as MARKETS } from "./rules-PW92v_T8.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/prices-BXT30GhJ.js
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
function bestLevel(levels) {
	const level = levels?.find((row) => row.price > 0);
	return {
		price: level?.price || 0,
		at: level?.updated_at || ""
	};
}
async function pullChunk(host, ids, locations, qualities) {
	const loc = locations.map((name) => encodeURIComponent(name)).join(",");
	const url = `${host}/api/v2/stats/orderbook/${ids.join(",")}.json?locations=${loc}&qualities=${qualities.join(",")}`;
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
			const ask = bestLevel(row.sell);
			const bid = bestLevel(row.buy);
			const item = quotes[row.item_id] ??= {};
			const city = item[row.city] ??= {};
			city[String(row.quality)] = {
				sell: ask.price,
				buy: bid.price,
				sellDate: ask.at,
				buyDate: bid.at
			};
		}
		if (i + 40 < ids.length) await new Promise((r) => setTimeout(r, 250));
	}
	return {
		quotes,
		fetchedAt: Date.now()
	};
});
var HourInput = object({
	server: _enum([
		"asia",
		"europe",
		"americas"
	]),
	itemId: string().regex(/^[A-Z0-9_@]+$/),
	locations: array(_enum(MARKETS)).min(1).max(MARKETS.length),
	quality: number().int().min(1).max(5)
});
async function readJson(url) {
	const res = await fetch(url, {
		headers: {
			Accept: "application/json",
			"Accept-Encoding": "gzip, deflate, br"
		},
		signal: AbortSignal.timeout(2e4)
	});
	if (res.status === 429) return {
		status: 429,
		body: null
	};
	if (!res.ok) {
		const text = await res.text();
		throw new Error(text.slice(0, 180) || `Market data ${res.status}`);
	}
	return {
		status: res.status,
		body: await res.json()
	};
}
var fetchHourlyPrices_createServerFn_handler = createServerRpc({
	id: "0a31263371f71b39edf22cba1c62c98ca7292577ab4adbbbb38d999d9f4086cd",
	name: "fetchHourlyPrices",
	filename: "src/lib/forge/prices.ts"
}, (opts) => fetchHourlyPrices.__executeServer(opts));
var fetchHourlyPrices = createServerFn({ method: "POST" }).validator((input) => HourInput.parse(input)).handler(fetchHourlyPrices_createServerFn_handler, async ({ data }) => {
	const loc = [...new Set(data.locations)].map((name) => encodeURIComponent(name)).join(",");
	const chartRes = await readJson(`${HOST[data.server]}/api/v2/stats/charts/${data.itemId}.json?locations=${loc}&qualities=${data.quality}&time-scale=1`);
	if (chartRes.status === 429) throw new Error("The data project is busy. Wait a moment, then refresh.");
	const series = [];
	if (chartRes.status === 200) for (const row of chartRes.body) {
		const times = row.data?.timestamps ?? [];
		const prices = row.data?.prices_avg ?? [];
		const counts = row.data?.item_count ?? [];
		const points = [];
		for (let i = 0; i < times.length; i++) {
			const price = prices[i] ?? 0;
			if (!times[i] || price <= 0) continue;
			points.push({
				time: times[i],
				price,
				count: counts[i] ?? 0
			});
		}
		if (points.length) series.push({
			city: row.location,
			points
		});
	}
	return {
		series,
		fetchedAt: Date.now()
	};
});
//#endregion
export { fetchHourlyPrices_createServerFn_handler, fetchMarketPrices_createServerFn_handler };
