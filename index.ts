#!/usr/bin/env bun
import { htmlToMarkdown } from "@page2ai/core";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const [url, dir] = Bun.argv.slice(2);

if (url === "install" && dir === "skill") {
  const dest = join(homedir(), ".claude/skills/docs-fetcher/SKILL.md");
  await Bun.write(dest, Bun.file(join(import.meta.dir, "skill/SKILL.md")));
  console.log(dest);
  process.exit(0);
}

if (!url || !dir) {
  console.error("usage: bun index.ts <url> <dir>");
  process.exit(1);
}

const binDir = join(homedir(), ".local/bin");
let obscura = Bun.which("obscura") ?? Bun.which("obscura", { PATH: binDir });
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
