# 🚀 Setu -- Production-Ready Chat Application (Next.js + Supabase)

## 📌 Project Overview

Build a **modern, scalable, production-ready Chat Application** named
**Setu** using:

-   Next.js (App Router)
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   Supabase (Database + Realtime + Storage)
-   Supabase Auth (Google OAuth only)
-   Custom Email/Password Auth with NodeMailer verification

The application must support:

-   1-to-1 Private Chat
-   Group Chat

UI must be: - Modern - Clean - Professional - Unique (must visually
stand out compared to Slack or Microsoft Teams) - Responsive (mobile +
desktop) - Dark mode supported

------------------------------------------------------------------------

# 🧱 Tech Stack Requirements

## Frontend

-   Next.js (App Router)
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   React Hook Form
-   Zod validation
-   Zustand (for global state)

## Backend

-   Next.js Route Handlers (API)
-   Supabase JS (server + client)
-   Supabase Realtime
-   Supabase Storage
-   NodeMailer (email verification)

------------------------------------------------------------------------

# 🔐 Authentication System

## 1️⃣ Registration Methods

### A. Email + Password

-   User registers with:
    -   Email
    -   Password
    -   First Name
    -   Last Name
    -   Username (unique)
-   Email verification required before login
-   Send verification mail using NodeMailer
-   User cannot login until email is verified

### B. Google OAuth (ONLY OAuth provider allowed)

-   Google OAuth login via Supabase
-   On first login:
    -   Ask user to choose unique username
    -   Verify username availability instantly
-   Store provider = "google"

------------------------------------------------------------------------

## 🔑 Login Rules

-   Users registered via Email/Password:
    -   Can login ONLY using email + password
-   Users registered via Google:
    -   Login with Google
    -   Can optionally generate password later (for backup login)
-   Track auth_provider in database

------------------------------------------------------------------------

## 🔐 Session Requirements

-   Secure HttpOnly cookies
-   Session persistence
-   Middleware protected routes
-   Auto redirect if not authenticated

------------------------------------------------------------------------

# 👤 Profile System

## Profile Page Requirements

The profile page must:

-   Display all user information
-   Allow updating:
    -   First name
    -   Last name
    -   Username (with uniqueness validation)
    -   Avatar
-   NOT allow updating email
-   Show:
    -   Email
    -   Auth provider (google or email)
    -   Account creation date
    -   Last seen
    -   Online status

------------------------------------------------------------------------

# 🗄 Database Design (Supabase)

## profiles Table (Main User Table)

id (uuid, PK, references auth.users) email (text, unique) username
(text, unique) first_name (text) last_name (text) full_name (text,
generated for search indexing) avatar_url (text) auth_provider (enum:
'email' \| 'google') is_email_verified (boolean) password_hash
(nullable, only for email users) is_online (boolean) last_seen
(timestamp) created_at (timestamp) updated_at (timestamp)

Important Notes: - full_name = first_name + last_name (store for search
optimization) - email must be unique - username must be globally
unique - index username, full_name for fast search

- as per application need you can change table schema according to you.

------------------------------------------------------------------------

# 🔍 User Search

User can be searched by:

-   username
-   first_name + last_name
-   full_name (optimized index)

Search must: - Be debounced - Be fast - Return partial matches

------------------------------------------------------------------------

# 💬 Chat Types

-   One-to-One Private Chat
-   Group Chat

conversations table:

id type (private \| group) name (nullable for private) avatar_url
created_by created_at updated_at

------------------------------------------------------------------------

conversation_members

id conversation_id user_id role (admin \| member) joined_at

------------------------------------------------------------------------

# 📝 Messaging System

messages table

id conversation_id sender_id content message_type (text \| image \|
file) file_url file_name file_size reply_to is_edited is_deleted
created_at updated_at

------------------------------------------------------------------------

message_reactions

id message_id user_id reaction created_at

------------------------------------------------------------------------

read_receipts

id message_id user_id read_at

------------------------------------------------------------------------

# ⚡ Realtime Features (Supabase Realtime)

Must implement:

-   Live message sync
-   Typing indicator
-   Online/offline presence
-   Delivered status
-   Read receipts
-   Instant optimistic UI updates

------------------------------------------------------------------------

# 📎 File Storage (Supabase Buckets)

Create separate buckets:

-   profile-avatars
-   chat-images
-   chat-files

Features: - Preview before sending - Store metadata in message table -
Secure access via signed URLs

------------------------------------------------------------------------

# 😊 Interaction Features

-   Emoji picker
-   Message reactions
-   Mentions (@username)
-   Pin messages (group only)
-   Forward message
-   Reply to message
-   Edit message
-   Soft delete message
-   Infinite scroll

------------------------------------------------------------------------

# 🔔 Notifications

-   In-app notifications
-   Unread message counter
-   Browser push notifications

------------------------------------------------------------------------

# 🛠 Group Management

-   Create group
-   Add members
-   Remove members
-   Leave group
-   Rename group
-   Change group avatar
-   Delete group (admin only)

------------------------------------------------------------------------

# 🎨 UI & UX Requirements

UI must:

-   Look modern, elegant, and premium
-   Have unique identity (NOT Slack clone)
-   Clean typography
-   Smooth animations
-   Proper spacing
-   Subtle glass / gradient accents
-   Smooth hover interactions

------------------------------------------------------------------------

## Required Screens

-   Login
-   Register
-   Email verification
-   Username selection (Google first-time login)
-   Chat dashboard
-   Conversation screen
-   Profile page
-   Group settings
-   Search screen
-   Notifications panel
-   404 page
-   Loading skeletons
-   Error states
-   Empty states
-   Mobile responsive layout
-   Dark mode toggle

------------------------------------------------------------------------

# 🔐 Security (Supabase RLS)

-   Users can only read conversations they belong to
-   Users can only send messages in their conversations
-   Users can only edit/delete their own messages
-   Only admin can manage group
-   Only owner can delete group

------------------------------------------------------------------------

# ⚙️ Performance Requirements

-   Server components where possible
-   Message pagination
-   Proper indexing
-   Debounced search
-   Optimistic UI
-   Lazy load heavy components
-   Minimal re-renders

------------------------------------------------------------------------

# 📧 Email Verification (NodeMailer)

-   Send verification link with token
-   Store token in DB
-   Expire token after 24h
-   Verify before allowing login
-   Resend verification option

------------------------------------------------------------------------

# 🎯 Final Goal

Build **Setu** as:

-   Secure
-   Scalable
-   Production-ready
-   Modern
-   Real-time
-   Enterprise-level chat application

With:

-   Clean architecture
-   Proper separation of concerns
-   Strong security
-   Advanced UX polish
-   Full Supabase integration
-   Professional-level design

The final result must feel like a premium SaaS messaging product, not a
basic clone.
