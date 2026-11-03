import { copyFileSync, readdirSync, readFileSync, writeFileSync } from "node:fs"

const dir = "dist/client"
const css = readdirSync(`${dir}/assets`).find((name) => name.startsWith("styles-") && name.endsWith(".css"))
if (!css) throw new Error("Pages build is missing its stylesheet")

let html = readFileSync(`${dir}/_shell.html`, "utf8")
html = html.replace(/\/albion-craft-island-labor\/assets\/styles-[^"]+\.css/g, `/albion-craft-island-labor/assets/${css}`)
html = html.replaceAll('href="/favicon.svg"', 'href="/albion-craft-island-labor/favicon.svg"')
html = html.replaceAll('href="/__grok/', 'href="/albion-craft-island-labor/__grok/')
writeFileSync(`${dir}/index.html`, html)
copyFileSync(`${dir}/index.html`, `${dir}/404.html`)
writeFileSync(`${dir}/.nojekyll`, "")
console.log(`[pages] wrote index.html with ${css}`)
