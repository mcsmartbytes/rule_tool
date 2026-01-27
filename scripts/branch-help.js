#!/usr/bin/env node
const { execSync } = require('node:child_process')

function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8' }).trim() } catch (e) { return '' }
}

const current = sh('git rev-parse --abbrev-ref HEAD') || '(detached)'
const remotes = sh('git remote -v')
const hasOrigin = /\borigin\b/.test(remotes)
const remoteBranches = sh('git branch -r')
const hasRemoteWork = /origin\/work\b/.test(remoteBranches)

console.log('\nBranch helper\n==============')
console.log('Current branch:', current)
console.log(hasOrigin ? 'Remote: origin' : 'Remote: (none)')

if (!hasOrigin) {
  console.log('\nAdd a remote then push:')
  console.log('  git remote add origin https://github.com/<user>/area-bid-helper.git')
}

if (!hasRemoteWork) {
  console.log('\nNo origin/work branch found.')
  console.log('Create/push your current HEAD to work:')
  console.log('  npm run push-work')
} else {
  console.log('\nRemote work branch exists (origin/work). To update it:')
  console.log('  npm run push-work')
}

console.log('\nOpen a PR from work -> main once pushed.')

