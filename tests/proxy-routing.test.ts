import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("production edge routing", () => {
  it("strips the browser /api prefix while preserving native admin and alpha routes", async () => {
    const config = await readFile("ops/nginx/edge.conf", "utf8");
    expect(config).toContain("location /api/");
    expect(config).toContain("rewrite ^/api/(.*)$ /$1 break;");
    expect(config).toContain("location ~ ^/api/(admin|alpha)(?:/|$)");
    expect(config).not.toContain("location ~ ^/(auth|api|health|ready)");
  });
});
