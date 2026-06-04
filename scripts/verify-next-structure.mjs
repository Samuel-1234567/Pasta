import { existsSync } from 'node:fs'

const hasAppDir = existsSync('app/layout.tsx')
const hasRootLayout = existsSync('layout.tsx')

if (!hasAppDir && hasRootLayout) {
  console.error(`
Build blocked: Next.js cannot find an "app" directory.

Your repo looks like the contents of app/ were uploaded to the repository root
((app), (marketing), layout.tsx, components/, lib/, etc.) instead of keeping
them inside an app/ folder next to package.json.

Fix: push the full project from your machine so the layout is:

  package.json
  next.config.ts
  app/
    layout.tsx
    (app)/
    (marketing)/
    components/
    lib/
`)
  process.exit(1)
}

if (!hasAppDir) {
  console.error('Build blocked: missing app/layout.tsx at the project root.')
  process.exit(1)
}
