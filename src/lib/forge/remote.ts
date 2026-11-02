import { installCatalog, type CraftItem, type JournalInfo, type MatInfo } from "./catalog"
import { useForge } from "./store"

export const GITHUB_REPO = "KuriHoshino/oasis-orbit-mist-plaza"
export const GITHUB_BRANCH = "main"
export const GITHUB_DATA_URL = `https://github.com/${GITHUB_REPO}/tree/${GITHUB_BRANCH}/src/lib/forge/data`

const RECIPE_FILES = [
  "accessory.json",
  "armor-cloth.json",
  "armor-leather.json",
  "armor-plate.json",
  "food.json",
  "gather.json",
  "offhand.json",
  "mount.json",
  "potion.json",
  "refine.json",
  "tool.json",
  "weapon-arcanestaff.json",
  "weapon-axe.json",
  "weapon-bow.json",
  "weapon-crossbow.json",
  "weapon-cursestaff.json",
  "weapon-dagger.json",
  "weapon-firestaff.json",
  "weapon-froststaff.json",
  "weapon-hammer.json",
  "weapon-holystaff.json",
  "weapon-knuckles.json",
  "weapon-mace.json",
  "weapon-naturestaff.json",
  "weapon-quarterstaff.json",
  "weapon-shapeshifterstaff.json",
  "weapon-spear.json",
  "weapon-sword.json",
] as const

const MATERIAL_FILES = [
  "materials-1.json",
  "materials-2.json",
  "materials-3.json",
  "materials-4.json",
  "materials-5.json",
  "materials-mounts.json",
] as const

const RAW = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/src/lib/forge/data`
const DB = "hearthforge-catalog"
const KEY = "snap"

type Snap = {
  sha: string
  items: CraftItem[]
  materials: Record<string, MatInfo>
  journals: JournalInfo[]
}

function rawUrl(file: string) {
  return `${RAW}/${file}?t=${Date.now()}`
}

async function readJson(file: string): Promise<unknown> {
  const res = await fetch(rawUrl(file), { cache: "no-store" })
  if (!res.ok) throw new Error(`${file} ${res.status}`)
  return res.json()
}

function asItems(value: unknown, file: string): CraftItem[] {
  if (!Array.isArray(value) || value.length === 0 || typeof value[0]?.id !== "string" || typeof value[0]?.name !== "string") {
    throw new Error(`${file} is not a recipe list`)
  }
  return value as CraftItem[]
}

function asMaterials(value: unknown, file: string): Record<string, MatInfo> {
  if (!value || Array.isArray(value) || typeof value !== "object") throw new Error(`${file} is not a material book`)
  return value as Record<string, MatInfo>
}

function asJournals(value: unknown): JournalInfo[] {
  if (!Array.isArray(value)) throw new Error("journals.json is not a list")
  return value as JournalInfo[]
}

function idbGet(): Promise<Snap | undefined> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(DB)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const tx = open.result.transaction(DB, "readonly")
      const req = tx.objectStore(DB).get(KEY)
      req.onsuccess = () => resolve(req.result as Snap | undefined)
      req.onerror = () => reject(req.error)
    }
  })
}

function idbPut(snap: Snap): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1)
    open.onupgradeneeded = () => open.result.createObjectStore(DB)
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const tx = open.result.transaction(DB, "readwrite")
      tx.objectStore(DB).put(snap, KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    }
  })
}

async function commitSha(): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits/${GITHUB_BRANCH}`, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  const body = (await res.json()) as { sha?: string }
  if (!body.sha) throw new Error("GitHub did not return a commit")
  return body.sha
}

async function downloadSnap(sha: string): Promise<Snap> {
  const [recipes, mats, journals] = await Promise.all([
    Promise.all(RECIPE_FILES.map(async (file) => asItems(await readJson(file), file))),
    Promise.all(MATERIAL_FILES.map(async (file) => asMaterials(await readJson(file), file))),
    readJson("journals.json").then(asJournals),
  ])
  return {
    sha,
    items: recipes.flat(),
    materials: Object.assign({}, ...mats),
    journals,
  }
}

function applySnap(snap: Snap, note: string) {
  installCatalog(snap)
  const state = useForge.getState()
  useForge.setState({ catalogRev: state.catalogRev + 1, catalogNote: note })
}

let syncing = false

export async function syncCatalogFromGitHub(force = false) {
  if (syncing) return
  syncing = true
  try {
    const sha = await commitSha()
    if (!force) {
      const cached = await idbGet().catch(() => undefined)
      if (cached?.sha === sha && cached.items?.length) {
        applySnap(cached, "Recipes match the latest GitHub commit.")
        return
      }
    }
    const snap = await downloadSnap(sha)
    applySnap(snap, "Recipes reloaded from GitHub. Edits on that repo are live.")
    await idbPut(snap).catch(() => undefined)
  } finally {
    syncing = false
  }
}
