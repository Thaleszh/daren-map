import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { writeFile } from "node:fs/promises";

/**
 * Dev-only endpoint the in-app annotate tool posts to, so "Save" writes GM data
 * straight to a JSON file under src/data/ (and HMR reloads). No effect on the
 * production build — annotation is a GM activity done via `npm run dev`. One
 * instance per editable file (annotations, cityscapes).
 */
function saveJsonPlugin(name: string, route: string, relPath: string): Plugin {
  const target = fileURLToPath(new URL(relPath, import.meta.url));
  return {
    name,
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(route, (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          return res.end("method not allowed");
        }
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          try {
            const parsed = JSON.parse(body);
            await writeFile(target, JSON.stringify(parsed, null, 2) + "\n");
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(err) }));
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    saveJsonPlugin("save-annotations", "/__save-annotations", "./src/data/annotations.json"),
    saveJsonPlugin("save-cityscapes", "/__save-cityscapes", "./src/data/cityscapes.json"),
  ],
  // Relative base so the static export works when hosted from a subpath
  // (GitHub Pages project sites, itch.io, etc.). Override to "/" for a root host.
  base: "./",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
