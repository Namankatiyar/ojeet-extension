# AI Documentation Orchestrator

## Mode: Manual Update Execution

You are performing a controlled documentation synchronization run for this codebase.

This run is triggered manually after code changes.

The implementation currently in context is authoritative.

You must update architectural documentation accordingly.

---

# Authoritative Hierarchy

1. Implementation code in current context → SOURCE OF TRUTH
2. Existing documentation files → Historical reference
3. Mirror summaries → Contextual support only

If conflict exists:
Implementation always overrides documentation.

---

# Files Under Management

You must evaluate and update:

- OVERVIEW.md
- .ai_workflow/dependency-map.md
- .ai_workflow/state-map.md
- .ai_workflow/architecture-decisions.md
- changelog.md

---

# Strict Operational Constraints

1. Do NOT scan entire src unless absolutely required.
2. Assume only recently modified modules are present in context.
3. Use existing documentation files to infer prior system state.
4. Perform minimal patch updates.
5. changelog.md must be append-only.
6. architecture-decisions.md must append ADR suggestions only.
7. If documentation drift is detected → STOP and generate DRIFT REPORT instead of modifying files.
8. Produce a final structured summary report.

---

# Phase 1: Change Analysis

From current implementation context, extract:

- Modified modules
- New modules
- Deleted modules
- Changed dependencies
- Changed state structures
- New state variables
- Removed state variables
- Altered event flows
- Architectural shifts

Compare against:

- dependency-map.md
- state-map.md
- architecture-decisions.md
- OVERVIEW.md

Identify deltas.

---

# Phase 2: Drift Detection

Drift exists if:

- Documentation contradicts implementation behavior
- A module described no longer exists
- A state variable documented no longer exists
- Dependency direction conflicts
- Architectural constraint violated

If drift detected:

1. Do NOT overwrite any documentation.
2. Generate a file named:

DRIFT_REPORT_<timestamp>.md

3. Include:
   - Conflict description
   - File affected
   - Documentation excerpt
   - Implementation excerpt summary
   - Severity level (Low / Medium / High)
   - Recommended resolution

4. Terminate run after drift report generation.

If no drift detected → continue.

---

# Phase 3: Controlled Updates

## 1. Update dependency-map.md

- Patch only affected modules.
- Update:
  - Depends On
  - Used By
  - Layer classification
  - Dependency graph section
- Do NOT regenerate entire file.
- Preserve formatting.

---

## 2. Update state-map.md

- Patch only changed state containers.
- Update:
  - New fields
  - Removed fields
  - Mutators
  - Readers
  - Event → state mapping
- Recalculate risk section if needed.
- Preserve structural layout.

---

## 3. Update architecture-decisions.md

Do NOT modify existing ADR entries.

If architectural shift detected:

Append new entry:

Status: Proposed

Include:
- Context
- Decision
- Rationale
- Tradeoffs
- Consequences
- Related modules

Do not auto-mark as Active.
Only suggest.

---

## 4. Update OVERVIEW.md

Patch only sections affected by:

- New features
- Changed system behavior
- Modified workflows
- New constraints

Keep high-level.
Do not duplicate state or dependency details.

---

## 5. Update changelog.md (Append Only)

Append a new entry using this structure:

---

## [<semantic-version>] – <YYYY-MM-DD HH:MM>

### AI Maintenance Run

### Feature-Level Changes
- ...

### Architectural Changes
- ...

### State Changes
- Added:
- Modified:
- Removed:

### Dependency Graph Changes
- ...

### Suggested ADR Entries
- ADR-XXX: ...

### Risk Notes
- ...

---

Versioning Rules:
- Patch version → internal improvements
- Minor version → new features
- Major version → architectural changes

If unsure, suggest version bump but do not auto-increment blindly.

---

# Phase 4: Consistency Validation

After updates:

Validate:

- No state exists without owner.
- No module exists without dependency classification.
- No circular dependencies introduced.
- No undocumented global state.
- No undocumented persistence layer.

If violation found:
Abort and generate DRIFT_REPORT instead.

---

# Phase 5: Final Summary Report

At end of run, output structured report:

---

# Documentation Maintenance Summary

Timestamp:
Files Updated:
- dependency-map.md (patched sections listed)
- state-map.md (patched sections listed)
- architecture-decisions.md (ADR suggested: yes/no)
- OVERVIEW.md (sections modified)
- changelog.md (new entry added)

New Risks Introduced:
Architectural Drift: None / Detected (see report)

Documentation Integrity Status:
- Stable
- Requires Manual Review

---

# Critical Behavior

- Never silently overwrite major sections.
- Never delete ADR entries.
- Never regenerate entire documents.
- Always preserve historical continuity.
- Always maintain minimal diff philosophy.

This process ensures architectural memory integrity while keeping documentation synchronized with implementation.

Begin analysis.
After completing this step move on to implementation of plan given in .ai_workflow/changelogGuidelines.md
This plan ensure the ground of truth that is the mirrored src directory remains always correctly maintained. 