# PHASE 0 — Vultr Setup Guide (hands-on, human-only)

This guide is for **you** (the human operator). Agents cannot do these steps — they
require your Vultr account, email verification, and payment/credential access.

> ⏰ Timing note: the kickoff is **2026-11-03** and the gift code is provided **at
> kickoff**. You can do steps 1–2 now; the credit claim (step 3) starts after kickoff.

---

## Step 1 — Create the Vultr account

- Go to https://www.vultr.com/ and sign up.
- ⚠️ **Use an email address NOT previously associated with Vultr** (the $200 credit
  requires a new account).
- Verify the email address (click the link they send).

## Step 2 — Prepare your SSH key (do this on your machine)

You will need an SSH key to secure the VM. If you don't have one:

```bash
ssh-keygen -t ed25519 -C "brz-hackathon" -f ~/.ssh/brz_hackathon
```

This creates `~/.ssh/brz_hackathon` (private) and `~/.ssh/brz_hackathon.pub` (public).
You'll paste the **public** key (`.pub` file contents) into Vultr's SSH key field in Step 4.

## Step 3 — Claim the $200 credit (after kickoff, when the code is revealed)

1. Log in to Vultr.
2. Go to **Billing → Promotion / Hackathon page** (the hackathon promotion entry point).
3. Enter the **gift code** provided at kickoff (Discord/kickoff announcement).
4. Apply it and verify **Remaining Credit displays $200 USD**.
5. If the code isn't there yet, wait for the kickoff announcement — don't ping support prematurely.

> After the hackathon, you must add a payment method to keep deployments running.

## Step 4 — Deploy the VM (Cloud Compute)

In the Vultr dashboard, **Deploy New Server**:

| Field | Recommendation |
|---|---|
| Type | **Cloud Compute (Regular Performance)** |
| Location | Any US region (nearest to Salt Lake City: Seattle or Los Angeles) — latency is irrelevant for the demo |
| Image | **Ubuntu 24.04 LTS** |
| Plan | **2 vCPU / 4GB RAM** (~$24/mo; the $200 credit covers it) |
| SSH Keys | Add your public key from Step 2 |
| Hostname | `brz-studio` |
| Label | `sandboxed-agent-studio` |

**Do NOT enable backups, DDoS protection add-ons, or auto-backups** — unnecessary spend.
Note the VM's **IP address** — you'll need it.

## Step 5 — Create the Vultr Serverless Inference API key

1. In the Vultr dashboard, find **Serverless Inference** (under Products/Services).
2. Create an API key/token for LLM calls.
3. Save it — you'll put it in the `.env` file (Step 8). It will be used gated behind
   `VULTR_LLM_ENABLED=true` once we finish the Vultr LLM client stub.

## Step 6 — Get an OpenRouter API key (the active LLM path for now)

Since Vultr's LLM is still a disabled stub, we run on **OpenRouter**:

1. Go to https://openrouter.ai/ → sign in → **Keys** → create a key.
2. Top it up with a small amount (a few dollars is plenty for dev/demo).
3. Save the key for Step 8.

## Step 7 — Connect to the VM and install Docker

```bash
ssh -i ~/.ssh/brz_hackathon root@<VM_IP>
```

Then run the provision script from this repo (uploads the sandbox image):

```bash
# push the repo to the VM first, e.g.:
git clone https://github.com/ASAYMAN69/blasted.git /opt/sandboxed-agent-studio
cd /opt/sandboxed-agent-studio
bash deploy/provision-sandbox.sh
```

This installs Docker and builds the `sandbox-runner:latest` image.
Verify: `docker images` should show `sandbox-runner`.

## Step 8 — Configure environment variables (on the VM)

Create `/opt/sandboxed-agent-studio/.env` (on the server — **never commit it**):

```bash
# LLM — OpenRouter (active)
OPENROUTER_API_KEY=sk-or-v1-...
OR_MODEL=anthropic/claude-3.5-sonnet

# LLM — Vultr Serverless Inference (disabled stub — leave off for now)
VULTR_LLM_ENABLED=false
VULTR_LLM_API_KEY=
VULTR_LLM_MODEL=

# Sandbox limits (sane defaults)
SANDBOX_MEMORY=512m
SANDBOX_CPUS=0.5
SANDBOX_TIMEOUT_S=60
SANDBOX_IMAGE=sandbox-runner:latest

# App
MAX_TASK_SIZE_MB=25
MAX_RETRIES=3
```

## Step 9 — Firewall / security (important)

- Only open **80/443** (web) and your SSH from your own IP.
- The sandbox containers have **no network** and are destroyed after each task — that's
  the containment story, and it also protects the host.

## Step 10 — Public demo URL

- For the submission you need a **public URL**. Shortest path: `http://<VM_IP>` (after
  the app is deployed and nginx is configured).
- Nicer (optional): point a domain/subdomain at the IP, then enable HTTPS. Not required
  to start.

---

## Checklist

- [ ] Vultr account created with a **new** email (Step 1)
- [ ] Email verified (Step 1)
- [ ] SSH key generated (Step 2)
- [ ] Gift code applied → Remaining Credit shows **$200** (Step 3)
- [ ] VM deployed (Ubuntu 24.04, 2 vCPU/4GB, SSH key) (Step 4)
- [ ] Vultr Serverless Inference API key created (Step 5)
- [ ] OpenRouter API key created (Step 6)
- [ ] Docker installed + `sandbox-runner` image built (Step 7)
- [ ] `.env` written on the VM (Step 8)
- [ ] Firewall limited to 80/443 + SSH (Step 9)
- [ ] Public URL reachable (Step 10)

## Handoff

Once checks 1–9 are done, tell the lead (Mercury) and we start deploying the sub-agents
in the order in `CONTEXT/AGENTS.md` (Dependency order): `sandbox` → `engine` → modes →
`frontend` → `qa` → `submission`.

**Never paste API keys/tokens into the repo, git commits, or any agent task brief.**
