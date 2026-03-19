import { spawnSync } from "child_process";

const run = (command: string, args: string[]) => {
  console.log(`\n🚀 Running: ${command} ${args.join(" ")}...`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`\n❌ Error: ${command} failed with exit code ${result.status}`);
    process.exit(1);
  }
};

console.log("🛡️ Starting Push_Underline Quality Audit\n" + "=".repeat(40));

// 1. Linting
run("bun", ["run", "lint"]);

// 2. Type Checking
run("bun", ["x", "tsc", "--noEmit"]);

// 3. Unit Tests
run("bun", ["test"]);

// 4. Production Build
run("bun", ["run", "build"]);

console.log("\n" + "=".repeat(40));
console.log("✅ Quality Audit Passed! The application is ready for deployment.");
