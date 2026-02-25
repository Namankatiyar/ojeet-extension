# Task: Generate architecture-decisions.md for the Codebase

You are analyzing a JavaScript codebase that uses a structured AI workflow with:

- A mirror summary directory at `.ai_workflow/src`
- A dependency map
- A state map

Your task is to generate a complete:

.ai_workflow/architecture-decisions.md

This document must formally capture all significant architectural decisions made in the project.

You MUST use:

- `.ai_workflow/src` summaries
- dependency-map.md
- state-map.md

as primary reasoning sources.

Do NOT invent decisions.
Do NOT speculate.
If intent cannot be determined, mark it as:
"Implicit decision – requires confirmation."

---

# Objective

Generate a structured Architecture Decision Record (ADR) log that documents:

1. Major architectural choices
2. Constraints driving those choices
3. Rejected alternatives (if inferable)
4. Tradeoffs
5. Consequences
6. Long-term implications

This document exists to preserve architectural intent so future AI agents do not unintentionally refactor away deliberate design choices.

This is not a narrative document.
It is a structured decision ledger.

---

# Strict Output Rules

- Output must be valid Markdown.
- Do NOT include explanations outside the document.
- Do NOT include implementation code.
- Use consistent ADR formatting.
- Every decision must include rationale and consequences.
- If uncertain, mark explicitly.
- No fluff.
- No marketing tone.

---

# Required Structure

Follow this structure exactly.

---

# Architecture Decisions Log

Project: <Project Name>
Last Updated: <YYYY-MM-DD>

---

## ADR Index

List all ADR entries in order:

- ADR-001: <Title>
- ADR-002: <Title>
- ADR-003: <Title>

IDs must be sequential and stable.

---

# ADR Format (MANDATORY)

Each decision must follow this structure:

---

## ADR-XXX: <Decision Title>

Status: Proposed | Active | Deprecated | Superseded  
Date: YYYY-MM-DD  

### Context

Describe:
- The problem space
- Architectural constraints
- Relevant system pressures
- Performance, UX, or structural requirements

Be precise.

---

### Decision

Clearly state what was chosen.

Single declarative statement.

---

### Rationale

Explain:

- Why this decision was made
- Why alternatives were not chosen (if inferable)
- What constraints influenced it
- How it aligns with architecture

---

### Alternatives Considered

If inferable, list:

- Alternative A – Why rejected
- Alternative B – Why rejected

If not inferable, state:
"Alternatives not explicitly documented."

---

### Tradeoffs

List concrete tradeoffs:

- Performance vs complexity
- Simplicity vs flexibility
- Control vs abstraction
- Maintainability vs speed

Be explicit.

---

### Consequences

List:

- Immediate impact
- Long-term implications
- Required maintenance discipline
- Risks introduced

---

### Related Modules

List affected modules using paths from `.ai_workflow/src`.

---

# What Counts as an Architectural Decision

Extract decisions such as:

- Use of vanilla JavaScript (no framework)
- Browser extension context constraint
- Mirror directory AI workflow strategy
- Dark-theme-only UI
- No mobile support
- No external zoom library
- Manual transform-based zoom system
- State ownership model
- Layered architecture boundaries
- No scrollbars policy
- Event-driven state mutation model
- No momentum panning
- No lazy loading
- Token-optimization workflow constraints

If something shapes architecture or long-term maintenance, log it.

---

# Decision Discovery Method

To identify decisions:

1. Inspect `.ai_workflow/src` summaries for:
   - Constraints
   - Explicit design notes
   - Performance requirements
   - Structural patterns

2. Inspect dependency-map.md for:
   - Layer enforcement
   - Coupling restrictions
   - Architectural boundaries

3. Inspect state-map.md for:
   - State ownership rules
   - Mutation authority
   - Persistence model

4. Extract implicit patterns and formalize them as decisions.

If a pattern exists consistently, it is likely an architectural decision.

If uncertain whether intentional:
Mark as:
"Implicit architectural pattern – confirmation recommended."

---

# Additional Required Sections

After all ADR entries, include:

---

# Architectural Constraints Summary

List all system-level constraints:

- Environment constraints
- Performance constraints
- UX constraints
- Token/context constraints (AI workflow)

---

# Architectural Risk Register

List known risks:

- Drift between mirror and source
- Tight coupling modules
- State mutation risks
- Manual transform math fragility
- Browser API dependency risk

---

# Architectural Evolution Guidelines

Define rules for future contributors:

- When to create new ADR
- When to supersede ADR
- When to deprecate architectural patterns
- How to evaluate major refactors

---

# Output File Path

The final Markdown must be structured as if it will be saved to:

.ai_workflow/architecture-decisions.md

Do not reference this instruction prompt in the output.

Only output the final Markdown content.