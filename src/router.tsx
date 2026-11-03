import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { previewPathRewrite } from "@/lib/preview-path-prefix";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    basepath: import.meta.env.VITE_PAGES === "1" ? "/albion-craft-island-labor" : undefined,
    rewrite: previewPathRewrite(),
    defaultErrorComponent: AppErrorComponent,
  });
}
