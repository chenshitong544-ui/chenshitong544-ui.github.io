import { build } from "esbuild";
await build({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  minify: true,
  sourcemap: false,
  outfile: "app.js",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  target: ["es2020"],
});
