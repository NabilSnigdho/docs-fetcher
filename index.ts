#!/usr/bin/env bun
import { htmlToMarkdown } from "@page2ai/core";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const [url, dir] = Bun.argv.slice(2);

if (url === "install-skill") {
  // ponytail: delegates to the skills CLI (any agent); installs from the GitHub repo, so push first
  await Bun.$`bunx skills add NabilSnigdho/docs-fetcher --skill docs-fetcher -g -y`;
  process.exit(0);
}

const binDir = join(homedir(), ".local/bin");
let obscura = Bun.which("obscura") ?? Bun.which("obscura", { PATH: binDir });

if (url === "doctor") {
  const ok = (good: boolean, msg: string) => console.log(`${good ? "ok  " : "FAIL"} ${msg}`);
  ok(!!obscura, `obscura: ${obscura ?? "not found (installed on first fetch)"}`);
  if (obscura) {
    const r = await Bun.$`${obscura} fetch https://example.com --dump html`.quiet().nothrow();
    ok(r.exitCode === 0 && r.text().includes("Example Domain"), "obscura can fetch https://example.com");
  }
  // ponytail: only checks the Claude and shared-agents dirs, extend if other agents matter
  const skill = [".claude/skills", ".agents/skills"].map((d) => join(homedir(), d, "docs-fetcher/SKILL.md"));
  const found = (await Promise.all(skill.map((f) => Bun.file(f).exists()))).some(Boolean);
  ok(found, "skill installed (fix: docs-fetcher install-skill)");
  process.exit(0);
}

if (!url || !dir) {
  console.error("usage: bun index.ts <url> <dir>");
  process.exit(1);
}

if (!obscura) {
  console.error("obscura not found, installing to", binDir);
  const tar = "obscura-x86_64-linux.tar.gz";
  await mkdir(binDir, { recursive: true });
  await Bun.$`cd ${binDir} && curl -fLO https://github.com/h4ckf0r0day/obscura/releases/latest/download/${tar} && tar xzf ${tar} && rm ${tar}`;
  obscura = join(binDir, "obscura");
}

const html = await Bun.$`${obscura} fetch ${url} --dump html`.text();
const { markdown } = htmlToMarkdown(html, { baseUrl: url });

const { hostname, pathname } = new URL(url);
const name =
  `${hostname}${pathname}`.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "index";
const file = join(dir, `${name}.md`);

await mkdir(dir, { recursive: true });
await Bun.write(file, markdown);
console.log(file);
