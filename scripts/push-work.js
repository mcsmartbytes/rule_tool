#!/usr/bin/env node
const { execSync } = require('node:child_process')

function sh(cmd) {
  return execSync(cmd, { stdio: 'inherit' })
}

try {
  const BRANCH = process.argv[2] || 'work'
  // Ensure repo exists
  sh('git rev-parse --is-inside-work-tree')
  // Create branch if needed
  try { sh(`git rev-parse --verify ${BRANCH}`) } catch {
    sh(`git switch -c ${BRANCH}`)
  }
  // Commit anything staged/untracked
  sh('git add -A')
  try {
    sh('git commit -m "chore: update work branch"')
  } catch {}
  // Push HEAD to origin/BRANCH
  sh(`git push -u origin HEAD:${BRANCH}`)
} catch (e) {
  console.error('\nFailed to push. Tips:')
  console.error(' - Ensure remote is set: git remote -v')
  console.error(' - Login: git remote set-url origin https://github.com/<user>/area-bid-helper.git')
  console.error(' - Auth: use a PAT if prompted for password')
  process.exit(1)
}

