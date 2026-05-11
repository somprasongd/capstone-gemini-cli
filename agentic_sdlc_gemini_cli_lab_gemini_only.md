# แบบฝึกหัด: Human-led Agentic AI ใน SDLC ด้วย Gemini CLI + GitLab + glab

เอกสารนี้เป็นแบบฝึกหัดแบบลงมือทำจริง ตั้งแต่เริ่มสร้าง GitLab repository, สร้าง `GEMINI.md`, สร้าง workspace skill สำหรับ `glab`, แล้วให้คนในแต่ละ phase ของ SDLC สั่ง Gemini CLI ทำงานแบบ Agentic ทีละขั้นตอน

> แนวคิดหลัก: ไม่ใช่ให้ AI ทำ workflow ทั้งหมดเอง แต่ให้ “คนในแต่ละ phase” เป็นผู้สั่งงาน AI ผ่าน Gemini CLI โดย AI ช่วยทำงานในขอบเขตที่กำหนด และ GitLab Issue/MR/CI/CD เป็น audit trail

---

## 0. สิ่งที่จะได้จากแบบฝึกหัดนี้

หลังทำจบ จะได้ repository ที่มีโครงสร้างประมาณนี้

```text
agentic-sdlc-task-app/
├── GEMINI.md
├── README.md
├── .gemini/
│   ├── settings.json
│   └── skills/
│       └── glab-gitlab-sdlc/
│           ├── SKILL.md
│           ├── references/
│           │   ├── issue-workflow.md
│           │   ├── mr-workflow.md
│           │   └── safety-rules.md
│           └── scripts/
│               └── glab-health-check.sh
├── frontend/
├── backend/
├── migrations/
├── deploy/
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── adr/
└── .gitlab-ci.yml
```

ตัวอย่างระบบที่ใช้ในแบบฝึกหัด:

```text
Task Management Web App

Frontend:
- React SPA
- Vite
- TypeScript

Backend:
- Go
- Fiber framework

Database:
- PostgreSQL

DevOps:
- GitLab
- GitLab CLI: glab
- GitLab CI/CD
- Docker
- Docker Compose
- Ubuntu Server
```

---

## 1. หลักการสำคัญของเวอร์ชันนี้

เวอร์ชันนี้ใช้ **เฉพาะ `GEMINI.md`** เป็น project instruction file หลัก ไม่แยก `AGENTS.md`

เหตุผล:

- ลดจำนวนไฟล์ instruction ที่ต้องดูแล
- Gemini CLI อ่านกติกาหลักจาก `GEMINI.md` ได้โดยตรง
- Skill แยกไว้เฉพาะงาน GitLab / `glab`
- เหมาะกับแบบฝึกหัดเริ่มต้น เพราะผู้เรียนไม่ต้องจัดการหลาย context files

โครงสร้างแนวคิด:

```text
GEMINI.md
  = project-wide working agreement
  = กติกาทุก phase ของ SDLC
  = safety rules
  = allowed / forbidden actions

.gemini/skills/glab-gitlab-sdlc/SKILL.md
  = workflow เฉพาะสำหรับ GitLab และ glab
```

---

## 2. ภาพรวม Human-led Agentic SDLC

```text
Human in SDLC Phase
  ↓
Prompt Gemini CLI
  ↓
Gemini reads GEMINI.md
  ↓
Gemini activates glab-gitlab-sdlc skill when GitLab work is needed
  ↓
Gemini suggests or runs allowed commands
  ↓
Human reviews output
  ↓
Human approves risky actions
  ↓
GitLab Issue / MR / Pipeline records the work
```

---

## 3. ตารางบทบาทในแต่ละ SDLC Phase

| Phase | คนที่สั่ง Gemini CLI | งานที่ให้ AI ช่วย | Output |
|---|---|---|---|
| 0. Setup | Tech Lead / DevOps | สร้าง repo, `GEMINI.md`, skill, settings | repo พร้อมใช้งาน |
| 1. Requirement | PO / BA | แตก requirement เป็น issues | GitLab issues |
| 2. Planning | PM / Scrum Master / Tech Lead | จัด sprint, dependency, risk | sprint plan |
| 3. Architecture | Architect / Tech Lead | ออกแบบ architecture, API, DB | docs + ADR + migration |
| 4. Development | Developer | implement issue ใน branch | code + draft MR |
| 5. Testing | QA | สร้าง test cases / test gaps | test plan + bug draft |
| 6. Code Review | Senior Dev / Tech Lead | review MR diff | review comments |
| 7. Security | Security Engineer | security review | security checklist |
| 8. CI/CD | DevOps | pipeline, Docker, deploy script | `.gitlab-ci.yml` |
| 9. Release | Release Manager | release note, checklist, rollback | release package |
| 10. Operations | SRE | health check, logs, RCA | incident issue draft |
| 11. Maintenance | Tech Lead / Developer | technical debt, refactor backlog | improvement issues |

---

# Part A: เตรียมเครื่องมือ

## 4. Prerequisites

ติดตั้งเครื่องมือเหล่านี้บนเครื่อง local:

```bash
git --version
glab --version
gemini --version
go version
node --version
npm --version
docker --version
docker compose version
```

ถ้ายังไม่มี `glab` ให้ติดตั้งตาม GitLab CLI docs แล้ว login:

```bash
glab auth login
glab auth status
```

> ห้ามใส่ token ลงใน repository หรือ commit history

---

## 5. Login GitLab ด้วย glab

```bash
glab auth login
```

สำหรับ GitLab self-managed:

```bash
glab auth login --hostname gitlab.example.com
```

ตรวจสอบสถานะ:

```bash
glab auth status
```

---

# Part B: Phase 0 — Setup Repository + Gemini CLI

## 6. Phase 0 คืออะไร

Phase 0 คือการตั้ง “AI Working Agreement” ก่อนเริ่ม SDLC จริง

เจ้าของ phase นี้:

```text
Tech Lead + DevOps + Security
```

สิ่งที่ต้องสร้าง:

```text
1. GitLab repository
2. GEMINI.md
3. .gemini/settings.json
4. .gemini/skills/glab-gitlab-sdlc/SKILL.md
5. skill reference files
6. initial GitLab issues
```

---

## 7. สร้าง GitLab Repository ด้วย glab

เลือกค่าก่อน:

```bash
export PROJECT_NAME="agentic-sdlc-task-app"
export GITLAB_GROUP="your-gitlab-group-or-namespace"
```

สร้าง repository:

```bash
glab repo create "$GITLAB_GROUP/$PROJECT_NAME"   --private   --defaultBranch main   --description "Human-led Agentic AI SDLC lab with React SPA, Go Fiber, PostgreSQL, GitLab CI/CD, Docker, and Gemini CLI"   --readme README.md
```

เข้า repo:

```bash
cd "$PROJECT_NAME"
```

ถ้าไม่ได้ clone อัตโนมัติ ให้ clone เอง:

```bash
glab repo clone "$GITLAB_GROUP/$PROJECT_NAME"
cd "$PROJECT_NAME"
```

---

## 8. สร้าง project structure เริ่มต้น

```bash
mkdir -p frontend backend/cmd/api migrations deploy docs/adr
mkdir -p .gemini/skills/glab-gitlab-sdlc/references
mkdir -p .gemini/skills/glab-gitlab-sdlc/scripts
mkdir -p .gitlab/issue_templates
mkdir -p .gitlab/merge_request_templates
```

---

## 9. สร้าง `.gemini/settings.json`

ไฟล์นี้กำหนดให้ Gemini CLI โหลดเฉพาะ `GEMINI.md` เป็น context หลัก และจำกัด shell commands ที่ AI ใช้ได้

```bash
cat > .gemini/settings.json <<'EOF'
{
  "context": {
    "fileName": ["GEMINI.md"]
  },
  "tools": {
    "core": [
      "read_file",
      "write_file",
      "list_directory",
      "glob",
      "grep_search",
      "replace",
      "run_shell_command(git)",
      "run_shell_command(glab)",
      "run_shell_command(go)",
      "run_shell_command(npm)",
      "run_shell_command(node)",
      "run_shell_command(docker)",
      "run_shell_command(docker compose)",
      "run_shell_command(curl)",
      "run_shell_command(cat)",
      "run_shell_command(mkdir)",
      "run_shell_command(chmod)",
      "run_shell_command(ls)"
    ],
    "exclude": [
      "run_shell_command(rm)",
      "run_shell_command(sudo)",
      "run_shell_command(chmod 777)",
      "run_shell_command(docker volume rm)",
      "run_shell_command(docker system prune)",
      "run_shell_command(glab mr merge)",
      "run_shell_command(glab mr approve)"
    ]
  }
}
EOF
```

---

## 10. สร้าง `GEMINI.md`

`GEMINI.md` คือ context หลักและเป็นไฟล์เดียวที่เก็บกติกาประจำ repo

```bash
cat > GEMINI.md <<'EOF'
# GEMINI.md

## Project Name

agentic-sdlc-task-app

## Project Purpose

This project is a Human-led Agentic AI SDLC lab.

It demonstrates how humans in each SDLC phase can use Gemini CLI as an agentic assistant while keeping GitLab issues, merge requests, pipelines, and logs as the audit trail.

This repository uses `GEMINI.md` as the single project instruction file. Do not create or depend on `AGENTS.md`.

## Application Stack

Frontend:
- React SPA
- Vite
- TypeScript

Backend:
- Go
- Fiber framework

Database:
- PostgreSQL

DevOps:
- GitLab
- GitLab CLI: glab
- GitLab CI/CD
- GitLab Container Registry
- Docker
- Docker Compose
- Ubuntu Server

## Human-led Agentic AI Principle

Gemini must assist the human role in each SDLC phase.

Gemini must not autonomously run the full workflow.

Human decides.
Gemini assists.
Human reviews.
CI validates.
Human approves.
System deploys.
SRE monitors.

## Repository Layout

Allowed locations:

- frontend/: frontend application
- backend/: backend API
- migrations/: SQL migration files
- deploy/: deployment files
- docs/: documentation and ADRs
- .gemini/: Gemini CLI settings and skills
- .gitlab/: issue and MR templates

Do not create new top-level application folders without asking.

## GitLab Workflow

Use GitLab issues and merge requests as the audit trail.

Before coding:
1. Read the related issue.
2. Confirm scope and acceptance criteria.
3. Create a feature branch.
4. Implement only the issue scope.
5. Run tests.
6. Open a Draft Merge Request.
7. Summarize commands run, files changed, tests, risks, and next human approval.

Common read-only commands:

```bash
glab issue list --state opened
glab issue view <issue-id>
glab mr list
glab mr view <mr-id>
glab pipeline list
```

State-changing commands require human confirmation first:

```bash
glab issue create ...
glab issue update <issue-id> --label "..."
glab issue note <issue-id> --message "..."
glab mr create --draft --fill
```

Forbidden commands:

```bash
glab mr merge
glab mr approve
glab issue delete
```

## Branch Naming

Use:

```text
feature/issue-<id>-<short-name>
fix/issue-<id>-<short-name>
docs/issue-<id>-<short-name>
ci/issue-<id>-<short-name>
```

## Commit Convention

Use Conventional Commits:

```text
feat: add task CRUD API
fix: handle missing task status
test: add task API tests
docs: add architecture overview
ci: add Docker build pipeline
```

## Required Checks

Backend:

```bash
cd backend
gofmt -w .
go test ./...
```

Frontend:

```bash
cd frontend
npm ci
npm run build
```

Docker Compose:

```bash
docker compose -f docker-compose.local.yml config
```

## SDLC Role Rules

### Requirement Phase

Human role:
- Product Owner
- Business Analyst

Gemini may:
- convert raw requirements into issues
- create user stories
- create acceptance criteria
- suggest labels
- draft `glab issue create` commands

Gemini must not:
- implement code
- decide business priority without input

### Planning Phase

Human role:
- PM
- Scrum Master
- Tech Lead

Gemini may:
- list open issues
- identify blockers
- suggest sprint plan
- suggest label updates

Gemini must ask before applying labels.

### Architecture Phase

Human role:
- Architect
- Tech Lead

Gemini may:
- create docs/architecture.md
- create docs/api.md
- create ADRs
- draft database migration SQL

Gemini must not implement production code unless asked.

### Development Phase

Human role:
- Developer

Gemini may:
- read selected issue
- create branch
- implement code within issue scope
- run tests
- commit and push
- open Draft MR

Gemini must not:
- merge MR
- approve MR
- deploy production
- modify unrelated files

### QA Phase

Human role:
- QA Engineer
- Tester

Gemini may:
- create test cases
- identify test gaps
- draft bug issues
- suggest automated tests

Gemini must not deploy or merge.

### Code Review Phase

Human role:
- Senior Developer
- Tech Lead

Gemini may:
- review MR diff
- summarize risks
- draft review comments

Gemini must not approve or merge.

### Security Phase

Human role:
- Security Engineer
- AppSec
- Tech Lead

Gemini may:
- check for hardcoded secrets
- review Dockerfile
- review CI/CD
- review SQL injection risks
- classify risk

Gemini must not print secrets.

### CI/CD Phase

Human role:
- DevOps Engineer

Gemini may:
- edit `.gitlab-ci.yml`
- edit Dockerfile
- edit deploy files
- suggest CI/CD variables

Gemini must not deploy production unless explicitly instructed and approval is clear.

### Release Phase

Human role:
- Release Manager
- Tech Lead

Gemini may:
- create release notes
- create deployment checklist
- create rollback plan
- summarize merged MRs

Gemini must not trigger production deploy automatically.

### Operations Phase

Human role:
- SRE
- Ops Engineer

Gemini may:
- suggest read-only diagnostic commands
- analyze logs
- draft incident issues
- draft RCA

Gemini must not:
- restart production services unless explicitly approved
- delete volumes
- run destructive commands

## Safety Rules

Never:
- merge merge requests
- approve merge requests
- deploy production without explicit human approval
- change secrets
- print secrets
- delete database volumes
- run destructive commands
- modify unrelated files
- hide failing tests

Sensitive values include:
- GitLab tokens
- SSH private keys
- DATABASE_URL
- POSTGRES_PASSWORD
- CI/CD variables
- API keys

## Required Response Format for Work Tasks

Use this format:

```md
## Summary
...

## Commands Run
...

## Files Changed
...

## Tests
...

## Risk
...

## Human Approval Needed
...
```

## Stop and Ask If

Ask the human before continuing if:

- issue scope is unclear
- a command may change production
- secrets are needed
- tests fail
- an action is destructive
- files outside the issue scope need modification
EOF
```

---

# Part C: สร้าง Gemini Skill สำหรับ glab

## 11. Skill นี้ใช้ทำอะไร

Skill: `glab-gitlab-sdlc`

ใช้เมื่อผู้ใช้สั่ง Gemini CLI เกี่ยวกับ:

- GitLab issue
- GitLab merge request
- sprint planning
- label triage
- release note
- incident issue
- GitLab workflow ด้วย `glab`

---

## 12. สร้าง `.gemini/skills/glab-gitlab-sdlc/SKILL.md`

```bash
cat > .gemini/skills/glab-gitlab-sdlc/SKILL.md <<'EOF'
---
name: glab-gitlab-sdlc
description: Expertise for safe GitLab SDLC workflows using the glab CLI. Use this skill when the user asks to create, read, update, triage, or summarize GitLab issues, merge requests, labels, release notes, incident issues, or GitLab-based SDLC workflows with glab.
---

# glab GitLab SDLC Skill

## Purpose

Help humans operate GitLab SDLC workflows safely and consistently with `glab`.

This skill supports:
- requirement issue creation
- issue triage
- sprint planning
- development branch and draft MR workflow
- MR review preparation
- release note preparation
- incident issue drafting

## Core Principle

Use Human-led Agentic AI.

- Human chooses the SDLC phase.
- Human chooses the issue or MR.
- Gemini assists with commands, summaries, and drafts.
- Human confirms state-changing actions.
- Human approves merge and deployment.

## Safety Rules

Always follow these rules:

1. Never merge a Merge Request.
2. Never approve a Merge Request.
3. Never deploy production.
4. Never print secrets, tokens, SSH keys, or CI/CD variables.
5. Never close issues unless the human explicitly asks.
6. Never run destructive shell commands.
7. For state-changing `glab` commands, show the command first and ask for confirmation.
8. For read-only commands, suggest or run them when allowed by project settings.
9. Always summarize what changed after any GitLab state update.

## Read-only Commands

These are safe for inspection:

```bash
glab auth status
glab issue list --state opened
glab issue view <issue-id>
glab mr list
glab mr view <mr-id>
glab pipeline list
```

## State-changing Commands

Require human confirmation first:

```bash
glab repo create ...
glab issue create ...
glab issue update <issue-id> --label "..."
glab issue note <issue-id> --message "..."
glab issue close <issue-id>
glab mr create --draft --fill
glab mr note <mr-id> --message "..."
```

## Forbidden Commands

Never run these:

```bash
glab mr merge
glab mr approve
glab issue delete
```

## Requirement Workflow

When helping a Product Owner or Business Analyst:

1. Convert raw requirements into:
   - epic
   - user stories
   - acceptance criteria
   - labels
   - questions
2. Produce `glab issue create` commands.
3. Ask before running commands.

Output format:

```md
## Proposed Issues
...

## glab Commands
...

## Questions for PO
...

## Confirmation Needed
Reply with "confirm create issues" to run these commands.
```

## Planning Workflow

When helping PM, Scrum Master, or Tech Lead:

1. Inspect open issues.
2. Group by labels and SDLC phase.
3. Identify ready, blocked, and unclear issues.
4. Suggest sprint plan.
5. Suggest label updates.
6. Ask before applying labels.

Suggested commands:

```bash
glab issue list --state opened
glab issue view <issue-id>
```

Output format:

```md
## Sprint Plan
...

## Dependencies
...

## Blockers
...

## Suggested Label Updates
...

## Confirmation Needed
...
```

## Development Workflow

When helping a developer:

1. Read the selected issue.
2. Confirm scope.
3. Suggest branch name.
4. Suggest issue update command.
5. Suggest implementation steps.
6. Suggest tests to run.
7. Suggest commit and draft MR commands.
8. Never merge.

Example:

```bash
glab issue view 12
git checkout -b feature/issue-12-task-crud-api
glab issue update 12 --label "in-progress"
glab mr create --draft --fill
```

Output format:

```md
## Issue Summary
...

## Implementation Scope
...

## Suggested Commands
...

## Tests to Run
...

## MR Draft
...
```

## Code Review Workflow

When helping review MR:

1. Read MR.
2. Summarize change.
3. Create review checklist.
4. Identify risks.
5. Suggest MR comment.
6. Never approve or merge.

Output format:

```md
## MR Summary
...

## Must Fix
...

## Should Fix
...

## Nice to Have
...

## Suggested MR Comment
...
```

## Release Workflow

When helping release manager:

1. Summarize MRs merged into main.
2. Generate release notes.
3. Identify DB migration risk.
4. Generate deployment checklist.
5. Generate rollback checklist.
6. Never trigger production deploy unless explicitly asked and allowed by GEMINI.md.

Output format:

```md
## Release Summary
...

## Included Issues / MRs
...

## Risk Assessment
...

## Deployment Checklist
...

## Rollback Plan
...

## Go / No-Go Questions
...
```

## SRE / Incident Workflow

When helping SRE:

1. Start with read-only inspection.
2. Summarize symptoms.
3. Draft incident issue.
4. Suggest likely causes.
5. Suggest rollback or mitigation.
6. Never restart services unless explicitly asked.

Output format:

```md
## Incident Summary
...

## Evidence
...

## Likely Cause
...

## Suggested Investigation
...

## Draft glab Incident Command
...
```

## Final Response Format

Always end with:

```md
## Commands Suggested
...

## Commands Run
...

## GitLab Objects Changed
...

## Human Approval Needed
...
```
EOF
```

---

## 13. สร้าง reference files ของ skill

### `issue-workflow.md`

```bash
cat > .gemini/skills/glab-gitlab-sdlc/references/issue-workflow.md <<'EOF'
# GitLab Issue Workflow with glab

## Create Epic Issue

```bash
glab issue create   --title "EPIC: Build Task Management Web App"   --description "React SPA + Go Fiber + PostgreSQL + Docker + GitLab CI/CD"   --label "epic,requirement"
```

## Create Backend Issue

```bash
glab issue create   --title "BE: Create Task CRUD API with Go Fiber"   --description "
## User Story
As a user, I want to manage tasks through REST API.

## Acceptance Criteria
- [ ] GET /api/tasks returns task list
- [ ] POST /api/tasks creates task
- [ ] PATCH /api/tasks/:id updates task status
- [ ] DELETE /api/tasks/:id deletes task
- [ ] API connects to PostgreSQL
- [ ] API returns JSON
"   --label "backend,database,ready"
```

## Read Issues

```bash
glab issue list --state opened
glab issue list --label ready
glab issue view <issue-id>
```

## Update Issue Labels

```bash
glab issue update <issue-id> --label "in-progress"
glab issue update <issue-id> --unlabel "ready"
```

## Add Progress Note

```bash
glab issue note <issue-id>   --message "Developer update: implementation started in branch feature/issue-<id>-<short-name>."
```
EOF
```

### `mr-workflow.md`

```bash
cat > .gemini/skills/glab-gitlab-sdlc/references/mr-workflow.md <<'EOF'
# Merge Request Workflow with glab

## Create Branch

```bash
git checkout -b feature/issue-<id>-<short-name>
```

## Commit

```bash
git add .
git commit -m "feat: implement <feature>"
git push -u origin feature/issue-<id>-<short-name>
```

## Create Draft MR

```bash
glab mr create   --draft   --fill   --label "needs-review"
```

## MR Description Template

```md
## Summary

...

## Related Issue

Closes #<issue-id>

## Commands Run

...

## Tests

- [ ] Backend tests passed
- [ ] Frontend build passed
- [ ] Docker config validated

## Risk

...

## Rollback Plan

...

## Human Review Needed

- [ ] Code review
- [ ] Security review
- [ ] Deployment approval
```

## View MR

```bash
glab mr view <mr-id>
```

## Add MR Note

```bash
glab mr note <mr-id> --message "..."
```
EOF
```

### `safety-rules.md`

```bash
cat > .gemini/skills/glab-gitlab-sdlc/references/safety-rules.md <<'EOF'
# Safety Rules for glab GitLab SDLC Skill

## Forbidden Actions

Never do these automatically:

```bash
glab mr merge
glab mr approve
glab issue delete
docker volume rm
docker system prune
rm -rf
sudo
```

## Secret Handling

Never print:
- GitLab token
- SSH private key
- DATABASE_URL
- POSTGRES_PASSWORD
- CI/CD variables
- API keys

If a secret is required, instruct the human to configure it in GitLab CI/CD variables.

## Production Rules

Production deployment must be:
- manual
- approved by a human
- traceable through GitLab pipeline
- reversible with rollback plan

## State-changing Commands

Before running any state-changing command:

1. Show command.
2. Explain effect.
3. Ask for confirmation.
EOF
```

---

## 14. สร้าง health check script สำหรับ glab

```bash
cat > .gemini/skills/glab-gitlab-sdlc/scripts/glab-health-check.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

echo "Checking glab installation..."

if ! command -v glab >/dev/null 2>&1; then
  echo "ERROR: glab is not installed."
  exit 1
fi

echo "glab version:"
glab --version

echo "Checking authentication..."
if ! glab auth status; then
  echo "ERROR: glab is not authenticated."
  echo "Run: glab auth login"
  exit 1
fi

echo "Checking current Git remote..."
git remote -v

echo "Checking open issues..."
glab issue list --state opened --per-page 5 || true

echo "Checking open merge requests..."
glab mr list --state opened || true

echo "glab health check complete."
EOF

chmod +x .gemini/skills/glab-gitlab-sdlc/scripts/glab-health-check.sh
```

---

## 15. Commit Phase 0 setup

```bash
git status
git add GEMINI.md .gemini README.md
git commit -m "chore: add Gemini CLI context and glab SDLC skill"
git push -u origin main
```

---

# Part D: เปิด Gemini CLI และตรวจ context/skill

## 16. เปิด Gemini CLI

```bash
gemini
```

ใน Gemini CLI:

```text
/memory show
```

หรือ reload context:

```text
/memory refresh
```

ตรวจ skill:

```text
/skills list
```

---

## 17. Prompt ทดสอบ context

ใน Gemini CLI:

```text
อ่าน GEMINI.md แล้วสรุปกติกาการทำงานของ repo นี้ โดยห้ามแก้ไฟล์ใด ๆ
```

Output ที่ควรได้:

```text
- Human-led Agentic AI
- GitLab issue/MR เป็น audit trail
- ห้าม merge/deploy/แก้ secret เอง
- ต้อง run test ก่อน MR
- ต้องสรุป commands/files/tests/risk
```

---

## 18. Prompt ทดสอบ glab skill

```text
ใช้ glab-gitlab-sdlc skill

ช่วยตรวจว่า glab พร้อมใช้งานหรือยัง
ให้ใช้ read-only commands เท่านั้น
ห้ามแก้ issue หรือ MR
```

คำสั่งที่ Gemini ควรเสนอ/รัน:

```bash
.gemini/skills/glab-gitlab-sdlc/scripts/glab-health-check.sh
```

---

# Part E: แบบฝึกหัด SDLC ทีละ Phase

---

# Phase 1: Requirement

## ใครทำ

```text
Product Owner / Business Analyst
```

## เป้าหมาย

เปลี่ยน requirement เป็น GitLab issues

## Prompt

```text
ใช้ glab-gitlab-sdlc skill

ฉันเป็น Product Owner

ช่วยแปลง requirement ต่อไปนี้เป็น GitLab issues พร้อม user story, acceptance criteria, labels และคำสั่ง glab issue create

ยังไม่ต้องรันคำสั่งจริง ให้แสดง commands เพื่อให้ฉันตรวจสอบก่อน

Requirement:
สร้าง Task Management Web App
- ผู้ใช้ดูรายการ task ได้
- ผู้ใช้เพิ่ม task ได้
- ผู้ใช้แก้ไขสถานะ task ได้
- ผู้ใช้ลบ task ได้
- Frontend เป็น React SPA + Vite + TypeScript
- Backend เป็น Go Fiber REST API
- Database เป็น PostgreSQL
- ใช้ GitLab CI/CD
- Deploy เป็น Docker Compose บน Ubuntu Server
```

## หลังตรวจแล้ว ถ้าต้องการให้ Gemini สร้าง issue จริง

```text
ยืนยันให้สร้าง GitLab issues ตาม commands ที่เสนอ
หากจะรันคำสั่ง state-changing ให้แสดงทีละชุดก่อนรัน
```

---

# Phase 2: Planning

## ใครทำ

```text
PM / Scrum Master / Tech Lead
```

## Prompt

```text
ใช้ glab-gitlab-sdlc skill

ฉันเป็น PM

ช่วยวาง sprint plan จาก GitLab issues ที่เปิดอยู่

ให้ทำ:
1. ใช้ glab issue list --state opened เพื่อดู issue
2. จัดกลุ่มตาม SDLC phase
3. ระบุ dependency
4. แนะนำ Sprint 1 และ Sprint 2
5. ระบุ issue ที่ blocked หรือยังไม่ชัดเจน
6. เสนอ label updates แต่ยังไม่ต้องรันคำสั่ง update label

ข้อจำกัด:
- read-only commands ทำได้
- ห้ามแก้ issue จนกว่าฉันจะยืนยัน
```

---

# Phase 3: Architecture / Design

## ใครทำ

```text
Architect / Tech Lead
```

## Prompt

```text
ฉันเป็น Tech Lead

ช่วยออกแบบ architecture สำหรับ Task Management Web App นี้

บริบท:
- frontend/: React SPA + Vite + TypeScript
- backend/: Go Fiber REST API
- migrations/: PostgreSQL migrations
- deploy/: Docker Compose deployment
- GitLab CI/CD
- Docker on Ubuntu Server

งาน:
1. สร้าง docs/architecture.md
2. สร้าง docs/api.md
3. สร้าง docs/adr/0001-initial-architecture.md
4. สร้าง migrations/001_create_tasks.sql
5. ระบุ runtime flow:
   Browser → Frontend → Backend API → PostgreSQL
6. ระบุ API endpoints:
   - GET /api/health
   - GET /api/tasks
   - POST /api/tasks
   - PATCH /api/tasks/:id
   - DELETE /api/tasks/:id
7. ระบุ security considerations
8. ระบุ trade-offs

ข้อจำกัด:
- ห้ามเขียน production backend/frontend code
- ห้าม deploy
- ห้าม merge
```

---

# Phase 4: Development — Backend

## ใครทำ

```text
Backend Developer
```

## Prompt

```text
ใช้ glab-gitlab-sdlc skill

ฉันเป็น Backend Developer

ช่วยทำ issue #<ISSUE_ID> เฉพาะ backend

ขั้นตอน:
1. อ่าน issue ด้วย glab issue view <ISSUE_ID>
2. สรุป scope และ acceptance criteria
3. สร้าง branch:
   feature/issue-<ISSUE_ID>-task-crud-api
4. Implement backend ใน backend/
5. ใช้ Go Fiber
6. เชื่อม PostgreSQL ด้วย DATABASE_URL
7. เพิ่ม endpoints:
   - GET /api/health
   - GET /api/tasks
   - POST /api/tasks
   - PATCH /api/tasks/:id
   - DELETE /api/tasks/:id
8. run:
   - gofmt -w .
   - go test ./...
9. commit
10. push branch
11. เปิด Draft MR ด้วย glab mr create --draft --fill

ข้อจำกัด:
- ห้ามแก้ frontend
- ห้ามแก้ deploy
- ห้ามแก้ secret
- ห้าม merge MR
- ถ้า test fail ให้หยุดและสรุปสาเหตุ
```

---

# Phase 4: Development — Frontend

## ใครทำ

```text
Frontend Developer
```

## Prompt

```text
ใช้ glab-gitlab-sdlc skill

ฉันเป็น Frontend Developer

ช่วยทำ issue #<ISSUE_ID> เฉพาะ frontend

บริบท:
- frontend/: React SPA + Vite + TypeScript
- API base URL ต้องอ่านจาก VITE_API_BASE_URL
- Backend API:
  - GET /api/tasks
  - POST /api/tasks
  - PATCH /api/tasks/:id
  - DELETE /api/tasks/:id

งาน:
1. อ่าน issue
2. สร้าง branch feature/issue-<ISSUE_ID>-react-task-ui
3. สร้าง src/api.ts
4. สร้าง UI สำหรับ:
   - list tasks
   - create task
   - update status
   - delete task
5. จัดการ loading/error state
6. run:
   - npm ci
   - npm run build
7. commit/push
8. เปิด Draft MR

ข้อจำกัด:
- ห้ามแก้ backend
- ห้าม hardcode production URL
- ห้าม merge
```

---

# Phase 5: Testing / QA

## ใครทำ

```text
QA Engineer / Tester
```

## Prompt

```text
ใช้ glab-gitlab-sdlc skill

ฉันเป็น QA Engineer

ช่วยสร้าง test plan สำหรับ issue #<ISSUE_ID> และ MR #<MR_ID>

งาน:
1. อ่าน issue และ MR
2. สร้าง test cases จาก acceptance criteria
3. แยกเป็น:
   - positive cases
   - negative cases
   - edge cases
   - API contract cases
   - regression cases
4. แนะนำ automated tests ที่ควรเพิ่ม
5. ถ้าพบ gap ให้สร้าง bug issue draft แต่ยังไม่ต้องรัน glab issue create

ข้อจำกัด:
- ห้ามแก้ production code
- ห้าม merge
- ห้าม deploy
```

---

# Phase 6: Code Review

## ใครทำ

```text
Senior Developer / Tech Lead
```

## Prompt

```text
ใช้ glab-gitlab-sdlc skill

ฉันเป็น Tech Lead

ช่วย review MR #<MR_ID>

ให้ตรวจ:
1. Correctness
2. Input validation
3. Error handling
4. SQL safety
5. Test coverage
6. Code readability
7. Backward compatibility
8. Security risk
9. Docker/CI impact

Output:
- MR Summary
- Must Fix
- Should Fix
- Nice to Have
- Suggested MR Comment

ข้อจำกัด:
- ห้าม approve MR
- ห้าม merge MR
```

---

# Phase 7: Security Review

## ใครทำ

```text
Security Engineer / AppSec / Tech Lead
```

## Prompt

```text
ใช้ glab-gitlab-sdlc skill

ฉันเป็น Security Engineer

ช่วย review MR #<MR_ID> ด้าน security

บริบท:
- React SPA + Go Fiber + PostgreSQL
- Docker Compose บน Ubuntu
- GitLab CI/CD
- ใช้ CI/CD variables สำหรับ secret

ให้ตรวจ:
1. Hardcoded secrets
2. SQL injection risk
3. Unsafe error messages
4. CORS risk
5. Dockerfile root user
6. CI/CD variable leakage
7. SSH key handling
8. Logging sensitive data
9. Dependency risk

จัดระดับ:
- Critical
- High
- Medium
- Low

ข้อจำกัด:
- ห้ามแสดงค่า secret
- ห้ามแก้ CI/CD variables
- ห้าม deploy
- ห้าม merge
```

---

# Phase 8: CI/CD

## ใครทำ

```text
DevOps Engineer
```

## Prompt

```text
ฉันเป็น DevOps Engineer

ช่วยสร้าง GitLab CI/CD สำหรับโปรเจกต์นี้

บริบท:
- frontend/: React SPA + Vite
- backend/: Go Fiber API
- migrations/: PostgreSQL migration
- deploy/: Docker Compose production files
- GitLab Container Registry
- Ubuntu Server deployment via SSH

Pipeline ที่ต้องการ:
1. validate frontend:
   - npm ci
   - npm run build
2. test backend:
   - go test ./...
3. build Docker images:
   - backend
   - frontend
4. push images to GitLab Container Registry
5. deploy production via SSH:
   - rsync docker-compose.prod.yml
   - rsync migrations/
   - docker compose pull
   - docker compose up -d
6. production deploy ต้องเป็น manual job
7. deploy เฉพาะ main branch เท่านั้น

GitLab variables ที่ต้องใช้:
- SSH_PRIVATE_KEY
- DEPLOY_HOST
- DEPLOY_USER
- DEPLOY_PATH
- POSTGRES_USER
- POSTGRES_PASSWORD
- POSTGRES_DB

ข้อจำกัด:
- ห้ามใส่ secret ลง repo
- ห้าม auto deploy production
- ห้ามรัน deploy เอง
- ต้องสร้าง rollback plan
```

---

# Phase 9: Release

## ใครทำ

```text
Release Manager / Tech Lead
```

## Prompt

```text
ใช้ glab-gitlab-sdlc skill

ฉันเป็น Release Manager

ช่วยเตรียม release สำหรับ main branch ล่าสุด

งาน:
1. สรุป MR ที่ merge เข้า main ตั้งแต่ release ล่าสุด
2. สร้าง release note
3. สร้าง deployment checklist
4. ตรวจ risk:
   - database migration
   - breaking API change
   - frontend/backend compatibility
   - environment variables
5. สร้าง rollback plan
6. สร้าง Go/No-Go questions

ข้อจำกัด:
- ห้ามกด deploy
- ห้ามแก้ production server
- ห้ามปิด issue เอง
```

---

# Phase 10: Operations / SRE

## ใครทำ

```text
SRE / Ops Engineer
```

## Prompt

```text
ใช้ glab-gitlab-sdlc skill

ฉันเป็น SRE

ช่วยตรวจ production หลัง deploy

บริบท:
- Server path: /opt/agentic-sdlc-task-app
- Runtime: Docker Compose
- Services:
  - frontend
  - backend
  - postgres
- Health endpoint:
  - http://localhost/api/health

งาน:
1. เสนอคำสั่ง read-only ก่อน
2. ตรวจ:
   - docker compose ps
   - backend logs
   - frontend logs
   - postgres logs
   - health endpoint
3. ถ้าพบ error ให้สรุป:
   - symptom
   - likely cause
   - impact
   - suggested action
   - rollback recommendation
4. สร้าง GitLab incident issue draft แต่ยังไม่ต้องรัน

ข้อจำกัด:
- ห้าม restart service เอง
- ห้าม rollback เอง
- ห้ามลบ volume
```

---

# Phase 11: Maintenance

## ใครทำ

```text
Tech Lead / Developer / SRE
```

## Prompt

```text
ฉันเป็น Tech Lead

ช่วยวิเคราะห์ technical debt ของ repo นี้

งาน:
1. ตรวจโครงสร้าง repo
2. วิเคราะห์ code organization
3. ตรวจ test coverage gap
4. ตรวจ Docker/CI complexity
5. ตรวจ duplicated code
6. ตรวจ documentation gaps
7. เสนอ improvement backlog
8. สร้าง GitLab issue draft สำหรับแต่ละ improvement แต่ยังไม่ต้องรัน

จัด priority:
- High
- Medium
- Low

ข้อจำกัด:
- ห้ามแก้ code ทันที
- ห้ามสร้าง issue จริงจนกว่าฉันยืนยัน
```

---

# Part F: GitLab Templates

## 19. Issue Template

สร้างไฟล์:

```bash
cat > .gitlab/issue_templates/feature.md <<'EOF'
## Goal

Describe the goal of this feature.

## User Story

As a ...
I want ...
So that ...

## Acceptance Criteria

- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

## Technical Notes

Frontend:
Backend:
Database:
DevOps:
Security:

## Agentic AI Instructions

Allowed:
- Read this issue
- Create a branch
- Modify files within scope
- Add tests
- Open Draft MR

Not allowed:
- Merge MR
- Approve MR
- Deploy production
- Change secrets
EOF
```

---

## 20. Merge Request Template

สร้างไฟล์:

```bash
cat > .gitlab/merge_request_templates/default.md <<'EOF'
## Summary

Explain what changed.

## Related Issue

Closes #

## Commands Run

```bash
...
```

## Files Changed

...

## Tests

- [ ] Backend tests passed
- [ ] Frontend build passed
- [ ] Docker config validated
- [ ] CI pipeline passed

## Risk

- [ ] Low
- [ ] Medium
- [ ] High

## Rollback Plan

Describe rollback plan.

## Human Review Checklist

- [ ] Code review
- [ ] Security review
- [ ] Test review
- [ ] Deployment risk review
EOF
```

---

# Part G: แบบฝึกหัดเต็มตั้งแต่ต้นจนจบ

## 21. Exercise Checklist

```text
[ ] Install and login glab
[ ] Create GitLab repository
[ ] Create folder structure
[ ] Create .gemini/settings.json
[ ] Create GEMINI.md
[ ] Create glab-gitlab-sdlc skill
[ ] Create skill references and script
[ ] Commit Phase 0 setup
[ ] Open Gemini CLI
[ ] Validate /memory
[ ] Validate /skills list
[ ] PO creates requirement issue drafts
[ ] PO confirms issue creation
[ ] PM creates sprint plan
[ ] Architect creates docs and migration
[ ] Backend Developer implements API issue
[ ] Frontend Developer implements UI issue
[ ] QA creates test plan
[ ] Tech Lead reviews MR
[ ] Security reviews MR
[ ] DevOps adds CI/CD
[ ] Release Manager prepares release
[ ] SRE checks production
[ ] Tech Lead creates maintenance backlog
```

---

## 22. Final Recommended Human-led Flow

```text
PO:
  prompt Gemini to create issues

PM:
  prompt Gemini to plan sprint

Architect:
  prompt Gemini to design architecture

Developer:
  prompt Gemini to implement one issue

QA:
  prompt Gemini to create test cases

Reviewer:
  prompt Gemini to review MR

Security:
  prompt Gemini to perform security review

DevOps:
  prompt Gemini to create pipeline and deployment files

Release Manager:
  prompt Gemini to prepare release

SRE:
  prompt Gemini to check production and draft incident issues
```

---

## 23. กติกาสำคัญที่สุด

```text
1. AI ไม่เลือก scope เอง
2. AI ไม่ merge เอง
3. AI ไม่ approve เอง
4. AI ไม่ deploy production เอง
5. AI ไม่แก้ secret เอง
6. AI ไม่ลบ database/volume
7. ทุกงานต้องผูกกับ GitLab issue/MR
8. ทุกผลลัพธ์ต้องมี human review
9. ทุก deployment ต้องมี rollback plan
10. ทุก incident ต้องมี evidence
11. ใช้ GEMINI.md เป็นไฟล์ instruction หลักเพียงไฟล์เดียว
```

---

## 24. Prompt กลางสำหรับทุก Phase

ใช้ prompt นี้เป็นแม่แบบ:

```text
ฉันคือ [ROLE] ใน Phase: [SDLC PHASE]

บริบท:
- Project: Task Management Web App
- Frontend: React SPA + Vite + TypeScript
- Backend: Go Fiber
- Database: PostgreSQL
- GitLab + glab
- GitLab CI/CD
- Docker Compose on Ubuntu

งาน:
1. [TASK 1]
2. [TASK 2]
3. [TASK 3]

ข้อมูลที่เกี่ยวข้อง:
- Issue ID:
- MR ID:
- Branch:
- Files allowed:
- Commands allowed:

ข้อจำกัด:
- ห้าม merge
- ห้าม approve
- ห้าม deploy production
- ห้ามแก้ secrets
- ห้ามลบ volume
- ถ้าไม่มั่นใจ ให้ถามก่อน

Output:
- Summary
- Commands Suggested
- Commands Run
- Files Changed
- Tests
- Risk
- Human Approval Needed
```

---

# สรุป

แบบฝึกหัดนี้ทำให้ทีมใช้ Agentic AI ใน SDLC แบบควบคุมได้จริง โดยใช้:

```text
Gemini CLI = agentic assistant
GEMINI.md = single project working agreement
glab-gitlab-sdlc skill = GitLab workflow expertise
GitLab Issues = source of work
GitLab MRs = code review trail
GitLab CI/CD = validation and deployment trail
Human approval = safety gate
```

รูปแบบที่ควรจำ:

```text
Human chooses task
Gemini assists
GitLab records
CI validates
Human approves
Production changes only with explicit approval
```
