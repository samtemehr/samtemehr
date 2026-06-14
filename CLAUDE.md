# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a GitHub profile README repository (`samtemehr/samtemehr`). Its sole artifact is `README.md`, which renders as the profile page for [github.com/samtemehr](https://github.com/samtemehr). There is no application code, build system, test suite, or CI/CD pipeline.

## What Work Looks Like Here

All changes in this repository are edits to `README.md`. Typical tasks:

- Updating professional bio, key metrics, or the "Currently" section
- Adjusting the DCMA consulting framework description
- Adding or removing tech stack badges
- Tweaking layout, formatting, or links

## README Structure

The file uses raw HTML mixed with Markdown:

- **Header block** — centered `<h1>`/`<h3>` + `<p>` + LinkedIn/location badges using `shields.io`
- **What I Do** — narrative + bullet metrics
- **DCMA Framework** — ASCII-art diagram in a fenced code block (the four-step consulting model: Diagnose → Configure → Mobilize → Assess)
- **Tech Stack** — `shields.io` badge images inside a `<p>` block
- **Currently** — short activity bullets
- **Footer** — two `github-readme-stats.vercel.app` widgets side by side

## Badge Format

Tech stack and metadata badges follow this pattern:
```
https://img.shields.io/badge/<LABEL>-<MESSAGE>-<COLOR>?style=flat&logo=<SLUG>&logoColor=<HEX>
```
Logo slugs come from [Simple Icons](https://simpleicons.org/). Color is the hex background (no `#`).

## Conventions

- All block-level HTML uses `align="center"` on the wrapping element, not inline styles.
- GitHub stats widget URLs use `hide_border=true` and `theme=default`.
- Sections are separated by `---` horizontal rules.
- No trailing whitespace; no blank lines inside `<p>` blocks.
