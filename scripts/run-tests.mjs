import { spawnSync } from "node:child_process";
// Tests use synthetic credentials and temporary local files. A hosted build's
// runtime secrets must never turn a mocked unit test into a Cloud/model call.
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", "tests/*.test.ts"], {
  stdio: "inherit",
  env: { ...process.env, RIPPLE_MODE: "preview", AI_PROVIDER: "offline", VERCEL: "", FALKORDB_URL: "", GEMINI_API_KEY: "", OPENAI_API_KEY: "" },
});
process.exit(result.status ?? 1);
