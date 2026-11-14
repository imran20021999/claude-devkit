# claude-devkit

A standalone, general-purpose developer kit for Claude Code — built to carry a change through its whole life: **write → review → deploy → maintain → debug**.

The kit is a marketplace of small, independently installable plugins. You take only the phases you need.

## Plugins

| Plugin | Phase | Status |
| --- | --- | --- |
| [`code-quality`](plugins/code-quality) | Review / standards | ✅ Available |
| `deploy` | Deploy | 🔜 Planned |
| `maintain` | Maintain | 🔜 Planned |
| `debug` | Debug | 🔜 Planned |

## Install

Add the marketplace, then install the plugin(s) you want:

```bash
/plugin marketplace add <owner>/claude-devkit
/plugin install code-quality@claude-devkit
```

> Replace `<owner>` with the GitHub owner once this repo is published.

## Design

Phase designs live in [`docs/superpowers/specs/`](docs/superpowers/specs).

## Principles

- **Language-agnostic core.** Nothing is hardcoded to one stack; real linters/formatters are plugged in per project via a single config file.
- **One config, shared consumers.** The same config drives both the automated gates and the review command, so behavior stays consistent.
- **Opt-in, not all-or-nothing.** Each phase is its own plugin.
