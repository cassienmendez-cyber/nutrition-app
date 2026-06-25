import { spawn } from 'node:child_process'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'

// ---------------------------------------------------------------------------
// "Subscription mode" for the coach.
//
// Instead of the metered Anthropic API, this drives the Claude Code CLI in
// headless mode (`claude -p`). By default the CLI authenticates with your
// logged-in Claude subscription (Pro/Max) — so coach replies come out of the
// plan you already pay for, not API credits.
//
// Enable with COACH_MODE=cli (or =subscription). The server machine must have
// the `claude` CLI installed and logged in (run `claude` once and sign in).
// We deliberately strip ANTHROPIC_API_KEY from the child so it uses OAuth.
// ---------------------------------------------------------------------------

const BIN = process.env.CLAUDE_BIN || 'claude'

export function claudeCliEnabled() {
  const m = (process.env.COACH_MODE || '').toLowerCase()
  return m === 'cli' || m === 'subscription'
}

// A throwaway empty working directory, so the CLI doesn't pick up a CLAUDE.md
// or the repo as context — we want a clean, single-shot completion.
let sandbox
function sandboxDir() {
  if (!sandbox) sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'bloom-coach-'))
  return sandbox
}

// Run one headless completion and return the reply text. Single-shot: the full
// prompt (system persona handled separately) is passed as the user turn.
export function runClaudeCli({ system, prompt, model, timeoutMs = 60000 }) {
  return new Promise((resolve, reject) => {
    const args = ['--print', '--output-format', 'json']
    if (system) args.push('--system-prompt', system)
    const m = model || process.env.COACH_MODEL
    if (m) args.push('--model', m)
    args.push(prompt) // positional prompt LAST (no variadic flag precedes it)

    const env = { ...process.env }
    delete env.ANTHROPIC_API_KEY // force subscription (OAuth) auth, not API billing

    let child
    try {
      child = spawn(BIN, args, { cwd: sandboxDir(), env })
    } catch (e) {
      return reject(e)
    }

    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error('cli_timeout'))
    }, timeoutMs)

    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) return reject(new Error(`cli_exit_${code}: ${err.slice(0, 200)}`))
      try {
        // The last non-empty line is the result JSON.
        const line = out.trim().split('\n').filter(Boolean).pop()
        const json = JSON.parse(line)
        if (json.is_error || json.subtype !== 'success' || !json.result) {
          return reject(new Error('cli_error'))
        }
        resolve(String(json.result).trim())
      } catch {
        reject(new Error('cli_parse'))
      }
    })
  })
}
