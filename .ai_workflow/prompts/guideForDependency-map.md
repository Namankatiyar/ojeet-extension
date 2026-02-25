# Task: Generate dependency-map.md for the Codebase

You are analyzing a structured JavaScript codebase that uses a mirror summary directory for architectural reasoning.

The mirror directory is located at:

.ai_workflow/src

Each file in that directory mirrors the real `src` structure but contains architectural summaries instead of implementation code.

You MUST use `.ai_workflow/src` as the primary source of architectural truth.

Do NOT scan the entire real `src` directory unless a summary is missing or incomplete.

---

# Objective

Generate a complete `.ai_workflow/dependency-map.md` file that documents:

1. Layered architectural structure
2. Per-module dependency relationships
3. Data flow direction
4. External API usage
5. Circular dependency risks
6. Dependency classification (runtime, compile-time, side-effect, etc.)

This document must allow a future AI agent to understand:

- How modules are connected
- What depends on what
- What must not depend on what
- Where architectural boundaries exist
- Where refactoring risks exist

---

# Strict Output Rules

- Output must be valid Markdown.
- Do NOT include explanations outside the document.
- Do NOT include implementation code.
- Be structurally consistent.
- Be exhaustive — include all major modules.
- Use explicit, structured sections.
- No fluff or commentary.

---

# Required Structure

Follow this structure exactly:

---

# Dependency Map

## 1. High-Level Architectural Layers

Identify logical layers based on responsibilities.

For each layer:

- Name
- Included directories/modules
- Allowed dependencies
- Forbidden dependencies

Example format:

### Layer: Core Utilities

Includes:
- src/utils/*
- src/helpers/*

Allowed Dependencies:
- None (must remain pure)

Forbidden Dependencies:
- UI layer
- State layer
- Entry points

Define all layers clearly.

---

## 2. Module Dependency Index

For every major module in `.ai_workflow/src`, include:

### Module: src/path/to/module.js

Purpose:
- One-line responsibility summary

Depends On:
- Explicit list of internal modules

Used By:
- Explicit list of internal modules

External APIs Used:
- DOM
- Browser extension APIs
- Storage
- Window events
- etc.

Dependency Type:
- Runtime dependency
- Initialization dependency
- Side-effect dependency
- State mutation dependency

Notes:
- Any architectural risks
- Tight coupling
- Cross-layer access

Repeat for every significant module.

---

## 3. Dependency Graph (Textual)

Provide a clear hierarchical dependency flow.

Example:

User Input
  ↓
Controller
  ↓
State Manager
  ↓
Renderer
  ↓
DOM

Use ASCII arrows to describe flow direction.

No diagrams. Text only.

---

## 4. Circular Dependency Analysis

List:

- Confirmed circular dependencies
- Potential circular risks
- Recommended refactors if detected

If none exist, explicitly state:

"No circular dependencies detected."

---

## 5. Cross-Layer Violations

Check for architectural boundary violations.

Example:
- UI importing deep utility internals
- State importing renderer
- Bidirectional coupling

List all violations clearly.

If none, state:

"No cross-layer violations detected."

---

## 6. Risk Assessment

Briefly list:

- High coupling modules
- Central modules (high fan-in)
- Fragile modules (high fan-out)
- Refactor-sensitive nodes

This is structural analysis only.

---

# Analysis Constraints

When analyzing summaries:

- Extract dependencies from:
  - Import mentions
  - "Depends on" sections
  - State mutation references
  - Cross-module interaction descriptions
- Do not guess.
- If dependency is unclear, mark as "Uncertain – requires verification".

---

# Output File Path

The output must be structured as if it will be saved to:

.ai_workflow/dependency-map.md

Do not reference the instruction prompt in the output.

Only output the final Markdown content.