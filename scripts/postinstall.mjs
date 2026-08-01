import { execSync } from "child_process"
import { existsSync, mkdirSync } from "fs"
import { join } from "path"

const isWindows = process.platform === "win32"

if (isWindows) {
  const wsDir = join(import.meta.dirname, "..", "node_modules", "@workspace")
  if (!existsSync(wsDir)) mkdirSync(wsDir, { recursive: true })

  const packages = ["db", "auth", "email", "files", "logger", "schemas", "ui"]

  for (const pkg of packages) {
    const link = join(wsDir, pkg)
    const target = join(import.meta.dirname, "..", "packages", pkg)
    if (!existsSync(link)) {
      execSync(`mklink /J "${link}" "${target}"`, { shell: "cmd.exe" })
      console.log(`  [postinstall] linked @workspace/${pkg}`)
    }
  }
}
