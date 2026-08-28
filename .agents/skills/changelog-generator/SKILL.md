---
name: changelog-generator
description: Generate user-friendly changelogs, release notes, and product announcements from Git commits, pull requests, or issue tracker tasks. Use when generating release notes, writing changelogs, creating product announcements, or summarizing recent git changes for users.
---

# Changelog Generator

## Quick start

To generate a changelog:
1. Fetch recent git commits or PRs (e.g., since the last release tag).
2. **Filter & Group**:
   - 🚀 **New Features** (user-facing value).
   - ⚡ **Improvements** (performance, UX polish).
   - 🐛 **Bug Fixes** (resolved issues).
3. **Translate to User-Friendly Language**: Avoid code-specific terms. Explain the *benefit* to the user rather than just what changed in the database.
4. **Draft Announcement**: Write a short, engaging summary introducing the release.

## Workflows

### Changelog Creation Workflow
1. **Source Collection**: Read git history or look at completed tickets.
2. **Categorization**: Map commits to Features, Improvements, and Fixes.
3. **Translation**: Rewrite technical titles into friendly customer-facing text.
4. **Formatting**: Present as a clean Markdown list with emojis. Add a "What's Next" section if future plans are known.
