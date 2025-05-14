import denoJson from "../deno.json" with { type: "json" };

const encoder = new TextEncoder();
const version = encoder.encode(denoJson.version);
Deno.stdout.writeSync(version);
Deno.exit(0);
