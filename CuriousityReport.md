# Curiosity Report: How GitHub Actions Runners Work Under the Hood

## Introduction

When you push code to GitHub and a workflow runs, it's easy to take for granted that *something* just executes your steps somewhere. But what is that something? How does it know a job is ready? How does it stay secure? This report dives into the internals of GitHub Actions runners (the machines that actually execute your CI/CD workflows) with a hands on experiment registering a self-hosted runner and analyzing its diagnostic logs.

---

## What is a Runner?

A **runner** is a server (virtual machine, container, or physical machine) that listens for jobs from GitHub, executes them, and reports results back. There are two kinds:

- **GitHub-hosted runners** — managed VMs spun up and torn down by GitHub on demand (Ubuntu, Windows, macOS)
- **Self-hosted runners** — machines you own and register with GitHub yourself

GitHub-hosted runners are ephemeral: a fresh VM is created for every job and destroyed afterward. Self-hosted runners are persistent and can be your laptop, a cloud VM, or anything in between.

---

## The Long-Polling Mechanism

The most interesting architectural detail of runners is *how they receive jobs*. Runners do **not** use webhooks which means GitHub does not push jobs to them. Instead, runners use a technique called **long-polling**.

### How Long-Polling Works

With short polling, a client repeatedly asks a server "do you have anything for me?" on a fixed interval, receiving mostly empty responses:

```
Runner: "Any jobs?" → GitHub: "Nope"   (wait)
Runner: "Any jobs?" → GitHub: "Nope"   (wait)
Runner: "Any jobs?" → GitHub: "Nope"   (wait)
```

With long-polling, the runner sends a request and GitHub **holds the connection open** for up to ~50 seconds until a job is available or the timeout hits:

```
Runner: "Any jobs?" → GitHub: (holds connection open...)
                               (job appears after 20 seconds)
                    → GitHub: "Here's a job!"
Runner: (immediately polls again) → GitHub: (holds again...)
```

Long polling allows for the runner to listen and wait for jobs without having to constantly poll github and using up valuable bandwidth.

### Why Not Webhooks?

GitHub could theoretically push jobs to runners via webhooks, but that would require every runner to have a **publicly accessible URL**. Self-hosted runners are often behind firewalls, on developer laptops, or in private networks which means they can't easily receive inbound connections. Since the runner always *initiates* the connection outward, long-polling works regardless of network topology. No firewall rules or port forwarding needed.

---

## Job Execution Lifecycle

When a runner receives a job, it follows this sequence:

1. **Registration** — The runner registers with GitHub using a one-time token, receiving credentials back
2. **Long-poll** — The runner calls GitHub's API waiting for a job assignment
3. **Job received** — GitHub responds with a ~20KB JSON payload containing the workflow steps, environment variables, and secret mask patterns
4. **Secret masking** — The runner loads regex patterns for all secrets so they can be scrubbed from any log output
5. **Step execution** — Each `run:` step is written to a temporary script file and executed as a subprocess
6. **Log streaming** — Step output is streamed back to GitHub in real time as it runs
7. **Cleanup** — Temp files are deleted, results are finalized, and the runner returns to polling

---

## Experiment: Registering a Self-Hosted Runner

To observe these internals directly, I registered a self-hosted runner on a local Windows machine and analyzed its diagnostic logs.

### Setup

1. Navigated to the GitHub repo → **Settings → Actions → Runners → New self-hosted runner**
2. Selected Windows and followed the PowerShell commands GitHub provided
3. Configured the runner with a custom name (`PYBLOOD-RUNNER-TEST`)
4. Started the runner with `./run.cmd`

### Test Workflow

I created a simple workflow targeting `runs-on: self-hosted`:

```yaml
name: Test Self-Hosted Runner

on: [push]

jobs:
  test:
    runs-on: self-hosted
    steps:
      - run: echo "Hello from my own machine!"
      - run: whoami
      - run: pwd
```

### Workflow Output

After pushing the workflow, the job was picked up immediately and produced:

```
Current runner version: '2.333.1'
Runner name: 'PYBLOOD-RUNNER-TEST'
Machine name: 'PATRICK-BLOOD'
GITHUB_TOKEN Permissions
Secret source: Actions

Run echo "Hello from my own machine!"
Hello from my own machine!

Run whoami
patrick-blood\pbloo

Run pwd
Path
----
C:\Users\pbloo\Projects\cs329\actions-runner\_work\action-runners\action-runners
```

Notable observations:
- **Machine name** confirms the job ran on my local machine
- **`whoami`** shows it ran as my local Windows user account 
- **`pwd`** shows GitHub automatically created a workspace directory inside the runner's `_work` folder

---

## Analyzing the Diagnostic Logs

The most revealing part of the experiment was examining the `_diag/` folder, which contains detailed logs of everything the runner does internally. Here are the key findings from the `Worker` log:

### 1. The Long-Poll Receiving a Job

```
[2026-04-02 05:25:19Z INFO Worker] Waiting to receive the job message from the channel.
[2026-04-02 05:25:19Z INFO ProcessChannel] Receiving message of length 20007, with hash '31a8eb4c...'
[2026-04-02 05:25:19Z INFO Worker] Message received.
```

This shows that the the self hosted runner is using long polling. The job payload was **20,007 bytes of JSON**, containing the full workflow definition, steps, environment variables, and metadata. The hash is used to verify the message wasn't tampered with in transit.

### 2. Secret Masking

```json
"mask": [
  { "type": "regex", "value": "***" },
  { "type": "regex", "value": "***" },
  ...18 entries total
]
```

The job payload included **18 regex patterns** for scrubbing secrets from logs. The runner uses these patterns to intercept any output that matches and replace it with `***`. This was done in a similar fashion to the logging milestone in Grafana. I would be interested in the future to learn in more depth how to properly mask secrets.

### 3. Each Step Becomes a Temp Script

```
Arguments: '-command ". 'C:\...\actions-runner\_work\_temp\f83efb10-...ps1'"'
```

Each `run:` step in the workflow is compiled into a **temporary `.ps1` script file** and executed as a subprocess with its own process ID. The runner doesn't evaluate commands inline.

### 4. Real-Time Log Streaming

```
[INFO JobServerQueue] Try to append 1 batches web console lines for record '...', success rate: 1/1.
```

As each step executed, the runner was actively streaming log lines back to GitHub. This is what enables the live output view in the GitHub Actions UI. 

### 5. PowerShell Fallback

```
[INFO ScriptHandler] pwsh: command not found.
[INFO ScriptHandler] Defaulting to powershell
[INFO ScriptHandler] Location: 'C:\WINDOWS\System32\WindowsPowerShell\v1.0\powershell.EXE'
```

The runner first looks for PowerShell Core (`pwsh`), and when it's not found, gracefully falls back to the older Windows PowerShell. This shows the runner doing runtime environment detection rather than assuming a fixed setup.

### 6. Complete Job in ~5 Seconds

```
05:25:19 - Job received
05:25:24 - Job completed
```

The entire job, receiving the 20KB payload, executing 3 steps, streaming logs, and uploading results completed in about **5 seconds**. The overhead is impressively small.

---

## Security Considerations

Self-hosted runners have important security implications worth understanding:

- **Jobs run as your local user** — as seen with `whoami` returning `patrick-blood\pbloo`. Any job on a self-hosted runner has the same permissions as that user account.
- **Don't use self-hosted runners on public repos** — a forked PR could submit a workflow that runs malicious code on your machine.
- **Secrets are never stored locally** — they're injected per job and masked from logs, but they do pass through your machine's memory during execution.
- **The runner is open source** — the full source code is available at [github.com/actions/runner](https://github.com/actions/runner), written in C#, so the polling logic and security model can be audited directly.

---

## Conclusion

GitHub Actions runners are more sophisticated than they first appear. The long-polling architecture is a deliberate design decision that enables runners to work anywhere without requiring inbound network access. The job payload contains everything the runner needs and is delivered and verified by hash. Each step gets its own subprocess and temp script, logs stream in real time, and the whole thing cleans up after itself.

Registering a self-hosted runner and reading the diagnostic logs made these abstractions concrete in a way that documentation alone doesn't. The `_diag/` folder is an underappreciated resource for anyone trying to understand what's actually happening when a workflow runs.

---

## References

- [GitHub Actions Runner source code (C#)](https://github.com/actions/runner)
- [GitHub Docs: About self-hosted runners](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners)
- [GitHub Docs: Security hardening for GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
- [GitHub Docs: Adding self-hosted runners](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/adding-self-hosted-runners)
