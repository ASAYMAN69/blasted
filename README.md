# Sandboxed Agent Studio

Web app where an AI agent performs **real work** (code execution) inside isolated,
disposable sandboxes on Vultr — returns verifiable results. Built for the **Vultr
Agent Rush Hackathon** (Challenge 1: Blast Radius Zero).

> Status: skeleton phase. Detailed implementation scheduled via parallel sub-agents
> (see `CONTEXT/AGENTS.md` and `CONTEXT/TASKS/`).

## Quick links

- Design spec: `docs/superpowers/specs/2026-11-02-vultr-agent-rush-design.md`
- Agent coordination: `CONTEXT/AGENTS.md`, `CONTEXT/CONTRACTS.md`, `CONTEXT/STATUS.md`
- Submission pack (TBD): `docs/submission/`

## Stack

Backend (FastAPI + Docker sandboxes + Vultr Serverless Inference/OpenRouter LLM) ·
Frontend (React + Vite + Tailwind) · Deployed on Vultr Cloud Compute.
