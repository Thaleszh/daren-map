// Runs the real loadWorld() over the generated data + annotations, exactly as
// the app does at startup — so data problems surface here, not in the browser.
//   node scripts/validate-world.mjs
import { checkWorld } from "./lib/check-world.mjs";

try {
  const stats = await checkWorld();
  console.log(JSON.stringify(stats));
  console.log("✓ loadWorld OK");
} catch (err) {
  console.error("✗ loadWorld FAILED:\n", err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
