# Task: Generate state-map.md for the Codebase

You are analyzing a structured JavaScript codebase that uses a mirror summary directory for architectural reasoning.

The mirror directory is located at:

.ai_workflow/src

Each file mirrors the real `src` structure but contains architectural summaries instead of implementation code.

You MUST use `.ai_workflow/src` as the primary source of truth for state analysis.

Do NOT scan the full real `src` unless:
- A summary is missing
- A state mutation is unclear
- A persistence mechanism is undefined

---

# Objective

Generate a complete `.ai_workflow/state-map.md` file that documents:

1. All runtime state
2. All persistent state
3. All derived/computed state
4. State ownership
5. State mutation paths
6. Event → state transition mapping
7. State lifecycle
8. State invariants and constraints
9. Potential state risks (race conditions, drift, hidden mutation)

The document must allow a future AI agent to understand:

- Where state lives
- Who owns it
- Who mutates it
- Who reads it
- How state flows through the system
- What assumptions exist

This is not documentation.  
This is a structural state topology map.

---

# Strict Output Rules

- Output must be valid Markdown.
- Do NOT include explanations outside the document.
- Do NOT include implementation code.
- Be exhaustive.
- Be explicit.
- No marketing language.
- No fluff.
- No assumptions without marking them as "Uncertain – requires verification".

---

# Required Structure

Follow this structure exactly.

---

# State Map

---

## 1. State Classification Overview

Provide a high-level classification of all state types:

- Global runtime state
- Module-scoped state
- Persistent storage state
- Derived/computed state
- UI state
- Ephemeral interaction state

Briefly define what exists in each category.

---

## 2. Global Runtime State

For each global/shared state container:

### State Container: <name>

Location:
- src/path/to/module.js

Type:
- Object / Map / Array / Primitive / Composite

Ownership:
- Which module owns this state

Fields:
- fieldName: type — description

Mutated By:
- Explicit list of modules/functions

Read By:
- Explicit list of modules/functions

Lifecycle:
- When initialized
- When reset
- When destroyed (if applicable)

Persistence:
- In-memory only / persisted / session-scoped

Constraints:
- Valid ranges
- Allowed transitions
- Invariants

Risks:
- Tight coupling
- Multiple writers
- Hidden mutation paths

Repeat for every global/shared state container.

---

## 3. Module-Scoped State

For each module that maintains internal state:

### Module: src/path/to/module.js

Internal State:
- Variables maintained across calls

Purpose:
- Why this state exists

Mutated By:
- Internal functions

Externally Influenced By:
- Events or calls

Risk Level:
- Low / Medium / High

---

## 4. Persistent State

Document all persisted state mechanisms.

### Storage Mechanism: <e.g., chrome.storage.local>

Keys:
- keyName: type — purpose

Written By:
- Modules/functions

Read By:
- Modules/functions

Load Timing:
- On startup / on demand / on event

Serialization Format:
- JSON / raw string / structured object

Migration Strategy:
- Exists / None

Failure Handling:
- Defined / Undefined

---

## 5. Derived / Computed State

Derived state must not be redundantly stored.

For each derived value:

### Derived State: <name>

Derived From:
- Source state variables

Used By:
- Modules/functions

Recomputed When:
- Which state changes trigger recomputation

Storage:
- Computed on access / cached

Risk:
- Stale computation risk
- Circular derivation risk

---

## 6. Event → State Transition Map

Map all event triggers to state mutations.

Format:

Event: <event name>
Source:
- DOM / Keyboard / Mouse / Extension API / Internal

Mutates:
- stateName.field

Mutation Type:
- Increment / Replace / Toggle / Reset

Downstream Effects:
- Which modules react

Repeat for all known events.

---

## 7. State Ownership Matrix

Provide a compact matrix-style summary.

Example:

State Name | Owner | Writers | Readers | Persistent | Risk Level
-----------|--------|----------|----------|------------|-----------
viewerState | viewerController | keyboardHandler, mouseHandler | renderer | No | Medium

Include all major state containers.

---

## 8. State Lifecycle Phases

Describe lifecycle phases:

- Application initialization
- Viewer open
- Image switch
- Zoom interaction
- Viewer close
- Extension unload

For each phase:
- Which state initializes
- Which state resets
- Which state persists

---

## 9. State Invariants

List system-wide invariants.

Examples:
- zoomLevel must be ≥ 0
- currentImageIndex must be within array bounds
- No state mutation should occur outside controller layer

If unknown, mark:
"Invariant not formally defined."

---

## 10. State Risk Assessment

Identify:

- Multiple writers to same state
- Implicit shared mutable objects
- State tightly coupled to DOM
- State without owner
- Hidden mutation paths
- Derived state stored redundantly

Explicitly categorize each risk.

---

# Analysis Instructions

When extracting state information from summaries:

- Look for:
  - "Stores"
  - "Maintains"
  - "Tracks"
  - "Mutates"
  - "Reads"
  - "Persists"
- Identify ownership clearly.
- If mutation authority is unclear, mark:
  "Unclear ownership – requires verification"

Do NOT invent state.

---

# Output File Path

The final Markdown must be structured as if it will be saved to:

.ai_workflow/state-map.md

Do not reference this instruction prompt in the output.

Only output the final Markdown content.