import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2020",
  outfile: "main.js",
  sourcemap: true,
  external: ["obsidian"],
  logLevel: "info"
});

if (watch) {
  await ctx.watch();
  console.log("Essay Quest: watching...");
} else {
  await ctx.rebuild();
  await ctx.dispose();
}
