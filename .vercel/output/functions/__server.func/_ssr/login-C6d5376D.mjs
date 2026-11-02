import { b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as signIn } from "./client-IWHfIGH2.mjs";
import { t as GROK_PROVIDERS } from "./server-BKe8vL8h.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-C6d5376D.js
var import_jsx_runtime = require_jsx_runtime();
function Login() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "grid min-h-screen place-items-center bg-ink p-6 text-parchment",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-sm space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-3xl",
					children: "Sign in"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Save craft groups to your account and open them on another device."
				}),
				GROK_PROVIDERS.map((provider) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => signIn(provider.providerId, { callbackURL: "/" }),
					className: "h-11 w-full rounded-lg border border-line bg-panel text-sm text-parchment",
					children: ["Continue with ", provider.label]
				}, provider.providerId))
			]
		})
	});
}
//#endregion
export { Login as component };
