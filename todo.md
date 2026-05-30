# Project TODO

## Database & Backend
- [x] Extend user role enum to include 'moderator'
- [x] Create forum_categories table
- [x] Create forum_threads table (with pinned, locked fields)
- [x] Create forum_posts table (replies)
- [x] Create site_pages table (for editable About/Resources content)
- [x] Create contact_messages table
- [x] Create admin_credentials table (separate username/password for admin login)
- [x] Implement admin auth procedure (separate from OAuth)
- [x] Implement forum CRUD procedures (create/list/reply/delete threads)
- [x] Implement moderator procedures (pin/lock/delete)
- [x] Implement user management procedures (promote/demote roles)
- [x] Implement site pages CRUD (admin editable content)
- [x] Implement contact form submission with owner notification

## Frontend - Public Pages
- [x] Global layout with top navigation bar (Forum, About, Contact, Resources)
- [x] Liquid glass aesthetic design system (black/white/red palette)
- [x] Forum page with category listing and thread browsing
- [x] Thread detail page with replies
- [x] Create thread / reply forms
- [x] About page (renders editable content from DB)
- [x] Contact page with message form
- [x] Resources page (renders editable content from DB)
- [x] User authentication (login/logout via OAuth)

## Admin Dashboard
- [x] Hidden /admin route (not linked publicly)
- [x] Separate admin login with username/password
- [x] User management panel (view all users, promote/demote roles)
- [x] About page content editor
- [x] Resources page content editor
- [x] Contact messages viewer
- [x] Forum moderation panel

## Moderator Tools
- [x] Pin/unpin threads
- [x] Lock/unlock threads
- [x] Delete threads and posts
- [x] Moderator badge display on forum posts

## Bug Fixes
- [x] Fix admin login page calling login instead of setup when no credentials exist
- [x] Add user profile page accessible from username dropdown

## Articles Refactor
- [x] Replace forum with articles system (no categories, chronological list)
- [x] Create articles table (title, content with rich text, author, images)
- [x] Create comments table (replaces forum posts/replies)
- [x] Rich text editor for article submissions (formatting, headings, lists, code)
- [x] Image uploader within article editor
- [x] Articles listing page (newest to oldest)
- [x] Article detail page with comment section
- [x] Update navigation from "Forum" to "Articles"
- [x] Avatar upload support for user profiles
- [x] Post history on user profile page
- [x] Update admin dashboard for articles moderation
- [x] Remove old forum categories system

## Under Construction Mode
- [x] Add "Under Construction" front page visible to all users
- [x] Restrict Articles, About, Contact, Resources pages to admin-only access
- [x] Update site favicon/icon to the red star logo

## Site Settings
- [x] Add site_settings table to store construction mode toggle
- [x] Create API procedures to get/update site settings
- [x] Add Settings tab in admin dashboard with construction mode toggle
- [x] Update App.tsx routing to check construction mode from database

## PDF Resources Management
- [x] Add pdf_resources table to database
- [x] Create API procedures for PDF CRUD (list, create, delete)
- [x] Add "Add PDF" button to Resources page (admin-only)
- [x] Allow admins to add PDF with title and URL
- [x] Display PDF list with hyperlinks (target="_blank")
- [x] Allow admins to delete PDFs
- [x] Add PDF file upload with S3 storage integration
- [x] Add search functionality to filter PDFs by title

## Navigation & Construction Mode Fixes
- [x] Fix navigation visibility to show to all users except on /admin pages
- [x] Show Sign In button for logged-out users
- [x] Show profile dropdown for logged-in users
- [x] Fix construction mode logic so public users can access all pages when construction mode is off

## User Mute Feature
- [x] Add isMuted column to users table
- [x] Add mute/unmute toggle to Users page in admin dashboard
- [x] Create backend procedures to mute/unmute users
- [x] Enforce mute status on backend (prevent article/comment creation)
- [x] Hide article/comment submit buttons for muted users on frontend
- [x] Show muted-account message to muted users

## Article Editing
- [x] Add editedAt timestamp column to articles table
- [x] Create backend procedure to update article (with author/admin authorization check)
- [x] Add Edit button on article page (visible only to author and admins)
- [x] Create edit form/modal for updating article title, content, and metadata
- [x] Display "Edited" timestamp next to original posted timestamp
- [x] Enforce backend authorization for article updates

## Article Drafts
- [x] Add isPublished status field to articles table
- [x] Create backend procedures for draft operations (create draft, publish draft, delete draft)
- [x] Add "Save as Draft" option to article creation form
- [x] Add "Publish" button to draft edit form
- [x] Hide unpublished drafts from public article lists and search
- [x] Enforce backend authorization (only owner or admin can view/edit/publish drafts)
- [x] Add "My Drafts" section to user profile page
- [x] Display draft list with edit and publish options on profile

## Display Name Editing
- [x] Add backend procedure to update user display name (owner/admin only)
- [x] Add "Edit Display Name" UI to profile page with text input and Save button
- [x] Update display name everywhere it appears (articles, comments, profile, admin Users page)

## Article Search & Sorting
- [x] Add viewCount tracking on backend (increment on article view)
- [x] Add search bar to Articles page (search title and content)
- [x] Add sort dropdown (Newest, Oldest, Most Viewed)
- [x] Ensure search and sorting work together
- [x] Set default sort to Newest

## Latest Video Section (Homepage)
- [x] Add youtube.getLatestVideo tRPC procedure (auto-fetches from @RTSG_Main channel via built-in YouTube API)
- [x] Add settings.getFeaturedVideoUrl / setFeaturedVideoUrl procedures as admin-configurable fallback
- [x] Add Latest Video glass card section below feature boxes on homepage
- [x] Show video title, published time, and "View channel" link
- [x] Show skeleton while loading, YouTube CTA fallback if no video found
