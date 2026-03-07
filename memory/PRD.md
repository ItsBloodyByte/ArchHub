# ArchHub - Product Requirements Document

## Original Problem Statement
Build a full-stack community platform for Arch Linux users with articles, Q&A, scripts, collections, package integration, and admin tools. The project is now being prepared for a clean public release on GitHub.

## User Personas
- **Arch Linux Users:** Looking for community knowledge, workarounds, scripts
- **Contributors:** Writing articles, sharing scripts, answering questions
- **Admins:** Managing content, users, site settings, legal pages

## Core Requirements
- JWT Authentication with admin/user roles
- Articles, Q&A, Scripts, Collections CRUD
- Arch package search with live status checks
- Admin dashboard for site management
- Dynamic legal pages (Privacy, Imprint, Terms)
- Bilingual support (German/English)

## Architecture
- **Frontend:** React + Tailwind CSS + Shadcn UI
- **Backend:** FastAPI + MongoDB (Motor async driver)
- **Structure:** Modular routes/, services/, models/

## What's Been Implemented
- [x] Full authentication system (JWT, registration with ToS consent)
- [x] Article editor with versioning
- [x] Q&A system with bug report separation
- [x] Script library with package linking
- [x] Collections with progress tracker
- [x] Arch package search (Official/AUR, cached)
- [x] User profiles with social links and reputation
- [x] Contributors page (admin-editable)
- [x] Dynamic footer (admin-editable, DE/EN)
- [x] Dynamic legal pages (Privacy, Imprint, Terms)
- [x] Cookie consent banner
- [x] Admin dashboard (settings, design, users, content)
- [x] Installation script (Docker, Docker-Compose, Debian, Ubuntu, Arch)
- [x] **Project cleanup for GitHub release** (2026-03-07)
  - All test data removed from database
  - Test reports and temporary files deleted
  - Admin user auto-created on startup
  - System collections preserved (blocked_usernames, email_templates, site_pages, settings)

## Credentials
- **Admin:** ItsBloodyByte / Admin123 (auto-created on startup)

## Backlog
### P1 - Upcoming
- Expanded User Settings (theme preferences, notification settings)

### P2 - Future
- Performance: Pagination for comment/answer endpoints
- Minor refactoring in routes/articles.py and routes/qa.py

## Key API Endpoints
- POST /api/auth/login, /api/auth/register
- GET/POST /api/articles, /api/qa, /api/scripts, /api/collections
- POST /api/packages/check
- GET /api/contributors, PUT /api/admin/contributors
- GET /api/site/footer, PUT /api/admin/footer
- GET /api/pages/{slug}

## 3rd Party Integrations
- Arch Linux Official Repos API (archlinux.org)
- AUR API (aur.archlinux.org)

## Language
- User communication: German (informal "Du")
