import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = mkdtempSync(resolve(tmpdir(), "ytzero-video-completion-test-"));
let result: Record<string, any> = {};

beforeAll(async () => {
  const process = Bun.spawn(["bun", "app/tests/videoCompletionHarness.ts"], {
    cwd: resolve(import.meta.dir, "../.."),
    env: {
      ...Bun.env,
      DB_PATH: resolve(root, "db", "source.db"),
      AVATAR_DIR: resolve(root, "avatars"),
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode !== 0) throw new Error(`Video completion harness failed:\n${stderr}\n${stdout}`);
  const line = stdout.split("\n").find((entry) => entry.startsWith("RESULT "));
  if (!line) throw new Error(`Video completion harness returned no result:\n${stdout}`);
  result = JSON.parse(line.slice("RESULT ".length));
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("video completion", () => {
  test("a partially watched video appears in Continue watching before completion", () => {
    expect(result.beforeStatus).toBe(200);
    expect(result.beforeIds).toContain("partial1");
    expect(result.beforeIds).not.toContain("neverplayed");
  });

  test("marking a partially watched video as watched removes it from Continue watching", () => {
    expect(result.completeStatus).toBe(200);
    expect(result.afterIds).not.toContain("partial1");
    expect(result.watched).toBe(1);
  });

  test("completion aligns saved progress with the duration like natural playback", () => {
    expect(result.position).toBe(result.duration);
  });
});
