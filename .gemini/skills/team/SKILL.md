---
name: team
description: Parallel execution using Gemini native sub-agents (generalist/codebase_investigator)
---

# Team Skill (Gemini Native)

`$team` is the parallel orchestration mode for oh-my-gemini. It leverages Gemini's native sub-agent capabilities to execute multiple tasks concurrently.

<Purpose>
Use `$team` when a task can be decomposed into independent sub-tasks that can be executed in parallel by specialist agents.
</Purpose>

<Subagent_Orchestration>
Instead of sequential execution, the "Leader" Gemini CLI session spawns "Worker" sub-agents using native tool calls:

1. **generalist**: For implementation, refactoring, and general coding tasks.
2. **codebase_investigator**: For deep analysis, architectural mapping, and bug root-cause investigation.

## Parallel Execution Pattern
When the Leader receives a `$team` request:
1. It decomposes the goal into a set of discrete `TODO` items.
2. It identifies which tasks are independent.
3. It invokes multiple sub-agents in a single turn (parallel execution) using:
   ```
   call:generalist{request: "Implement feature A..."}
   call:generalist{request: "Write tests for feature B..."}
   ```
4. The Leader waits for all sub-agents to report back.
5. The Leader integrates the results and verifies the combined output.
</Subagent_Orchestration>

<Task_Board_Management>
Maintain a `task-board.md` in the `.omg/` directory (or current workspace) to track state:

| Agent | Status | Task |
|-------|--------|------|
| Leader | Orchestrating | Integration and verification |
| Worker-1 | In Progress | [Task Description] |
| Worker-2 | Pending | [Task Description] |
</Task_Board_Management>

<Verification_Policy>
- Every worker task must include verification (tests).
- The Leader MUST run a full project verification (build/test) after all workers finish.
- If a worker fails, the Leader should diagnose using `codebase_investigator` and re-assign if necessary.
</Verification_Policy>

<Commands>
- `$team status`: Show the current task board and worker progress.
- `$team integrate`: Merge all worker outputs and run project-wide tests.
</Commands>
