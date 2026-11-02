//#region node_modules/.nitro/vite/services/ssr/assets/rules-Cs28H3-y.js
var SERVERS = [
	{
		id: "asia",
		label: "Asia"
	},
	{
		id: "europe",
		label: "Europe"
	},
	{
		id: "americas",
		label: "Americas"
	}
];
var CRAFT_CITIES = [
	"Thetford",
	"Lymhurst",
	"Bridgewatch",
	"Martlock",
	"Fort Sterling",
	"Caerleon",
	"Brecilien"
];
var MARKETS = [...CRAFT_CITIES, "Black Market"];
/** Hideout general production bonus by power level (1–9). No city base. */
var HIDEOUT_CRAFT = {
	1: 0,
	2: 6,
	3: 11,
	4: 15,
	5: 18,
	6: 20,
	7: 22,
	8: 24,
	9: 26
};
/**
* Specialty crafting base by map quality, at hideout level 1.
* Q1–Q6: 1, 6, 11, 16, 21, 26. Roads use quality 1.
*/
var HO_QUALITY_BASE = {
	1: 1,
	2: 6,
	3: 11,
	4: 16,
	5: 21,
	6: 26
};
var HO_BIOMES = [
	{
		id: "forest",
		label: "Lymhurst",
		city: "Lymhurst",
		kind: "hideout",
		refine: "fiber",
		crafts: [
			"sword",
			"bow",
			"arcanestaff",
			"leather_helmet",
			"leather_shoes"
		],
		favors: "Fiber, swords, bows, arcane staffs, leather hoods, leather shoes"
	},
	{
		id: "swamp",
		label: "Thetford",
		city: "Thetford",
		kind: "hideout",
		refine: "ore",
		crafts: [
			"mace",
			"naturestaff",
			"firestaff",
			"leather_armor",
			"cloth_helmet"
		],
		favors: "Ore, maces, fire staffs, nature staffs, leather armor, cloth cowls"
	},
	{
		id: "highland",
		label: "Martlock",
		city: "Martlock",
		kind: "hideout",
		refine: "hide",
		crafts: [
			"axe",
			"quarterstaff",
			"froststaff",
			"plate_shoes",
			"offhand"
		],
		favors: "Hide, axes, quarterstaffs, frost staffs, plate boots, off-hands"
	},
	{
		id: "steppe",
		label: "Bridgewatch",
		city: "Bridgewatch",
		kind: "hideout",
		refine: "rock",
		crafts: [
			"crossbow",
			"dagger",
			"cursestaff",
			"plate_armor",
			"cloth_shoes"
		],
		favors: "Stone, crossbows, daggers, cursed staffs, plate armor, cloth sandals"
	},
	{
		id: "mountain",
		label: "Fort Sterling",
		city: "Fort Sterling",
		kind: "hideout",
		refine: "wood",
		crafts: [
			"hammer",
			"spear",
			"holystaff",
			"plate_helmet",
			"cloth_armor"
		],
		favors: "Wood, hammers, spears, holy staffs, plate helmets, cloth robes"
	},
	{
		id: "caerleon",
		label: "Caerleon",
		city: "Caerleon",
		kind: "city",
		refine: "",
		crafts: [
			"food",
			"tools",
			"gatherergear",
			"knuckles",
			"shapeshifterstaff"
		],
		favors: "Food, tools, gathering gear, war gloves, shapeshifter staffs"
	},
	{
		id: "brecilien",
		label: "Brecilien",
		city: "Brecilien",
		kind: "city",
		refine: "",
		crafts: [
			"bag",
			"cape",
			"potion"
		],
		favors: "Bags, capes, potions"
	}
];
function clampStep(value, min, max, fallback) {
	const rounded = Math.round(Number(value));
	if (!Number.isFinite(rounded)) return fallback;
	return Math.min(max, Math.max(min, rounded));
}
function biomeById(id) {
	return HO_BIOMES.find((biome) => biome.id === id) ?? HO_BIOMES[0];
}
function biomeFavors(biomeId, category) {
	const biome = biomeById(biomeId);
	if (REFINE_CATEGORIES.includes(category)) return biome.refine === category;
	return biome.crafts.includes(category);
}
/** Specialty points added by hideout level alone: 0 at level 1, 30 at level 9. */
function hideoutSpecPower(power) {
	return (clampStep(power, 1, 9, 1) - 1) * 15 / 4;
}
var REFINE_CATEGORIES = [
	"ore",
	"wood",
	"hide",
	"fiber",
	"rock"
];
var REFINE_CITY = {
	ore: "Thetford",
	wood: "Fort Sterling",
	fiber: "Lymhurst",
	hide: "Martlock",
	rock: "Bridgewatch"
};
/** Crafting specialty percentage points. Off-hands and potions differ by city. */
var CRAFT = {
	Bridgewatch: {
		crossbow: 15,
		dagger: 15,
		cursestaff: 15,
		plate_armor: 15,
		cloth_shoes: 15,
		offhand: 10,
		potion: 10
	},
	Caerleon: {
		offhand: 10,
		potion: 10,
		gatherergear: 15,
		tools: 15,
		food: 15,
		knuckles: 15,
		shapeshifterstaff: 15
	},
	"Fort Sterling": {
		offhand: 10,
		potion: 10,
		hammer: 15,
		spear: 15,
		holystaff: 15,
		plate_helmet: 15,
		cloth_armor: 15
	},
	Lymhurst: {
		offhand: 10,
		potion: 10,
		sword: 15,
		bow: 15,
		arcanestaff: 15,
		leather_helmet: 15,
		leather_shoes: 15
	},
	Martlock: {
		offhand: 25,
		potion: 10,
		axe: 15,
		quarterstaff: 15,
		froststaff: 15,
		plate_shoes: 15
	},
	Thetford: {
		offhand: 10,
		potion: 10,
		mace: 15,
		naturestaff: 15,
		firestaff: 15,
		leather_armor: 15,
		cloth_helmet: 15
	},
	Brecilien: {
		offhand: 10,
		potion: 25,
		cape: 15,
		bag: 15
	}
};
function specialtyBonus(city, category) {
	if (REFINE_CATEGORIES.includes(category)) return REFINE_CITY[category] === city ? 40 : 0;
	return CRAFT[city]?.[category] ?? 0;
}
var GROUP_LABEL = {
	refine: "Refining",
	weapon: "Weapons",
	armor: "Armor",
	offhand: "Off-hands",
	accessory: "Bags & capes",
	tool: "Tools",
	gather: "Gathering gear",
	food: "Food",
	potion: "Potions"
};
var FORGE_STATIONS = [
	"Warrior's Forge",
	"Hunter's Lodge",
	"Mage's Tower"
];
var WEAPON_LINE = {
	sword: {
		label: "Swords",
		station: "Warrior's Forge"
	},
	axe: {
		label: "Axes",
		station: "Warrior's Forge"
	},
	mace: {
		label: "Maces",
		station: "Warrior's Forge"
	},
	hammer: {
		label: "Hammers",
		station: "Warrior's Forge"
	},
	crossbow: {
		label: "Crossbows",
		station: "Warrior's Forge"
	},
	knuckles: {
		label: "War Gloves",
		station: "Warrior's Forge"
	},
	bow: {
		label: "Bows",
		station: "Hunter's Lodge"
	},
	dagger: {
		label: "Daggers",
		station: "Hunter's Lodge"
	},
	spear: {
		label: "Spears",
		station: "Hunter's Lodge"
	},
	quarterstaff: {
		label: "Quarterstaffs",
		station: "Hunter's Lodge"
	},
	naturestaff: {
		label: "Nature Staffs",
		station: "Hunter's Lodge"
	},
	shapeshifterstaff: {
		label: "Shapeshifter Staffs",
		station: "Hunter's Lodge"
	},
	firestaff: {
		label: "Fire Staffs",
		station: "Mage's Tower"
	},
	froststaff: {
		label: "Frost Staffs",
		station: "Mage's Tower"
	},
	arcanestaff: {
		label: "Arcane Staffs",
		station: "Mage's Tower"
	},
	cursestaff: {
		label: "Cursed Staffs",
		station: "Mage's Tower"
	},
	holystaff: {
		label: "Holy Staffs",
		station: "Mage's Tower"
	}
};
var ARMOR_LINE = {
	plate: {
		label: "Plate",
		station: "Warrior's Forge",
		categories: [
			"plate_helmet",
			"plate_armor",
			"plate_shoes"
		]
	},
	leather: {
		label: "Leather",
		station: "Hunter's Lodge",
		categories: [
			"leather_helmet",
			"leather_armor",
			"leather_shoes"
		]
	},
	cloth: {
		label: "Cloth",
		station: "Mage's Tower",
		categories: [
			"cloth_helmet",
			"cloth_armor",
			"cloth_shoes"
		]
	}
};
function gearLine(item) {
	if (item.group === "weapon") return WEAPON_LINE[item.category] ? item.category : null;
	if (item.group !== "armor") return null;
	for (const [id, line] of Object.entries(ARMOR_LINE)) if (line.categories.includes(item.category)) return id;
	return null;
}
function gearLineLabel(item) {
	const id = gearLine(item);
	if (!id) return null;
	return WEAPON_LINE[id]?.label ?? ARMOR_LINE[id]?.label ?? null;
}
var SETUP_FEE = .025;
var TAX_PREMIUM = .04;
var TAX_STANDARD = .08;
var NUTRITION_FACTOR = .1125;
var REPAIR_SILVER = 16.5;
var STUDY_FACTOR = 2.75;
var STUDY_FOCUS = 1.59;
var PREMIUM_FAME = 1.5;
//#endregion
export { gearLineLabel as C, gearLine as S, specialtyBonus as T, TAX_STANDARD as _, HIDEOUT_CRAFT as a, biomeFavors as b, MARKETS as c, REPAIR_SILVER as d, SERVERS as f, TAX_PREMIUM as g, STUDY_FOCUS as h, GROUP_LABEL as i, NUTRITION_FACTOR as l, STUDY_FACTOR as m, CRAFT_CITIES as n, HO_BIOMES as o, SETUP_FEE as p, FORGE_STATIONS as r, HO_QUALITY_BASE as s, ARMOR_LINE as t, PREMIUM_FAME as u, WEAPON_LINE as v, hideoutSpecPower as w, clampStep as x, biomeById as y };
