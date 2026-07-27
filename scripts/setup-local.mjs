import { spawn } from "node:child_process";
import console from "node:console";
import process from "node:process";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL ausente. Copie .env.example para .env antes de executar pnpm setup:local.",
  );
}

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(pnpm, args, {
      env: process.env,
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else
        reject(new Error(`pnpm ${args.join(" ")} falhou com código ${code}`));
    });
  });
}

await run(["prisma:generate"]);
await run(["--filter", "@lt/server", "db:migrate"]);
console.log(
  "Ambiente local preparado: Prisma Client e migrations atualizados.",
);
