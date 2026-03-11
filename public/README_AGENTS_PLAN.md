# Agents Roadmap

This document splits Lucyna's reported issues into separate delivery streams. Work must not happen directly on `main`.

## Workflow

1. Create or update work only on a dedicated `codex/*` branch.
2. Keep one branch per functional area.
3. Every feature branch must include:
   - the code fix or feature work,
   - at least one targeted test that reproduces the reported issue,
   - a smoke E2E check for the affected flow,
   - a status update in this file.
4. Merge to `main` only after tests pass and UAT is accepted.

## Branch Map

- `codex/agents-roadmap`
- `codex/fix-recommendation-word-upload`
- `codex/fix-admin-white-screen-refresh`
- `codex/fix-child-flow`
- `codex/fix-recommendation-notifications`
- `codex/fix-signup-layout-image-right`
- `codex/feature-edit-recommendations`
- `codex/fix-piotr-payment-invoices`
- `codex/feature-ai-voice-note`
- `codex/integrate-twilio-legacy-config`

## Status Legend

- `planned`
- `in_progress`
- `blocked`
- `ready_for_uat`
- `done`

## Workstreams

### 1. Recommendations And Files

#### DOC/DOCX upload for recommendations

- Status: `planned`
- Branch: `codex/fix-recommendation-word-upload`
- Business problem: Lucyna reports that Word files still do not save correctly in recommendations, while images and PDF do.
- Current symptoms:
  - `DOC` and `DOCX` upload is unreliable or stays pending.
  - Patient/admin flow works for PDF and image only.
- Areas to inspect:
  - admin recommendation creator flow,
  - storage upload path for `recommendation-files`,
  - recommendation download/open flow for non-PDF files.
- Expected outcome:
  - admin can save recommendation with `DOC` or `DOCX`,
  - saved file is visible and accessible in patient flow,
  - no hanging request and no unexpected 4xx/5xx.
- Acceptance criteria:
  - upload completes within a bounded time,
  - saved file name/type is shown correctly,
  - opening/downloading works for Word files.
- Required tests:
  - targeted upload test for `DOCX`,
  - smoke E2E: admin save -> patient open/download.
- Dependencies and risks:
  - storage bucket policies,
  - browser handling of Word files,
  - Kong/storage timeout behavior.

#### Edit existing recommendations

- Status: `planned`
- Branch: `codex/feature-edit-recommendations`
- Business problem: Lucyna asked for easy editing of recommendations already attached to a patient.
- Current symptoms:
  - there is an edit route in the app, but usability and completion of the flow must be verified.
- Areas to inspect:
  - recommendation edit route,
  - existing recommendation loading,
  - file replacement/update behavior.
- Expected outcome:
  - admin can open an existing recommendation, edit content, save changes, and keep or replace the attached file.
- Acceptance criteria:
  - edited content persists,
  - updated file path remains valid,
  - update notification behavior is correct.
- Required tests:
  - targeted edit recommendation test,
  - smoke E2E for edit flow.
- Dependencies and risks:
  - existing recommendation schema,
  - file lifecycle when replacing attachments.

#### Patient notification about new recommendations

- Status: `in_progress`
- Branch: `codex/fix-recommendation-notifications`
- Business problem: patient should receive a clear notification when a new recommendation is added.
- Current symptoms:
  - Lucyna reported this still does not work.
- Areas to inspect:
  - recommendation creation flow,
  - `send-recommendation-email`,
  - patient dashboard notification state.
- Expected outcome:
  - patient is informed about new recommendation through the intended notification channel.
- Acceptance criteria:
  - recommendation creation triggers notification once,
  - patient sees the update in UI and/or receives email as designed.
- Required tests:
  - targeted notification trigger test,
  - smoke E2E: create recommendation -> patient sees notification.
- Dependencies and risks:
  - mail provider config,
  - notification UX expectations.
- Current branch notes:
  - edge function now enforces `POST` explicitly and refreshes `download_token` before sending, so notification emails do not carry missing or expired recommendation links,
  - end-to-end delivery still depends on valid Resend configuration and a real admin-authenticated smoke run.

### 2. Admin Stability

#### White screen and refresh crash in admin

- Status: `planned`
- Branch: `codex/fix-admin-white-screen-refresh`
- Business problem: admin panel still shows a white screen on refresh.
- Current symptoms:
  - Lucyna reported admin white screen,
  - quoted error indicates `removeChild NotFoundError`,
  - patient side refresh is reportedly improved.
- Areas to inspect:
  - admin layout mount/unmount flow,
  - dialog/modal/widget cleanup,
  - route refresh behavior in admin pages.
- Expected outcome:
  - admin pages refresh cleanly without crash.
- Acceptance criteria:
  - no white screen on hard refresh,
  - no `removeChild NotFoundError` in console,
  - admin dashboard remains interactive.
- Required tests:
  - targeted reproduction for refresh crash,
  - smoke E2E for admin login -> dashboard -> refresh.
- Dependencies and risks:
  - third-party component cleanup,
  - race conditions during route teardown.

### 3. Child Flow

#### Child profile flow fixes

- Status: `planned`
- Branch: `codex/fix-child-flow`
- Business problem: child-related onboarding/profile flow is incomplete.
- Current symptoms:
  - child last name is missing,
  - child photo cannot be added,
  - no notification when child is added.
- Areas to inspect:
  - child/person profile form,
  - storage flow for child photo,
  - notification trigger for child creation.
- Expected outcome:
  - child can be created with first and last name,
  - child photo can be uploaded,
  - add-child notification is sent/displayed as intended.
- Acceptance criteria:
  - form supports separate first and last name,
  - photo persists and renders,
  - notification is emitted exactly once.
- Required tests:
  - targeted child creation test,
  - targeted child image upload test,
  - smoke E2E for full child flow.
- Dependencies and risks:
  - `person_profiles` model,
  - storage rules,
  - notification channel design.

### 4. Signup And Onboarding UI

#### Signup layout image placement

- Status: `planned`
- Branch: `codex/fix-signup-layout-image-right`
- Business problem: Lucyna wants the image on the right side during account setup, also before purchase.
- Current symptoms:
  - current onboarding layout does not match expected visual structure.
- Areas to inspect:
  - signup/onboarding layout,
  - pre-purchase state,
  - responsive behavior.
- Expected outcome:
  - image is rendered on the right side in the required state on desktop and still works on mobile.
- Acceptance criteria:
  - layout matches expected composition,
  - no regressions for unpaid users.
- Required tests:
  - visual/manual targeted check,
  - smoke E2E for signup layout rendering.
- Dependencies and risks:
  - preserving current design system and responsiveness.

### 5. Integrations And Operations

#### Piotr recurring payment and invoices

- Status: `planned`
- Branch: `codex/fix-piotr-payment-invoices`
- Business problem: Piotr is still being charged monthly and Lucyna cannot see invoices on her side.
- Current symptoms:
  - recurring charge not stopped,
  - invoices visible to customer but not to Lucyna.
- Areas to inspect:
  - Stripe subscription lifecycle,
  - webhook invoice handling,
  - admin/operator invoice visibility path.
- Expected outcome:
  - subscription state matches business expectation,
  - invoice visibility path is clear and functioning.
- Acceptance criteria:
  - recurring billing is correctly stopped or adjusted,
  - invoice handling is traceable and visible to the intended operator flow.
- Required tests:
  - targeted billing logic test where feasible,
  - smoke validation for invoice webhook path.
- Dependencies and risks:
  - Stripe external state,
  - may require manual operator step.

#### AI note as voice recording

- Status: `planned`
- Branch: `codex/feature-ai-voice-note`
- Business problem: AI note was expected to be recorded as audio, not only entered in another form.
- Current symptoms:
  - Lucyna says the AI note recording path is not aligned with the previous app pattern.
- Areas to inspect:
  - admin AI note flow,
  - audio recording/upload flow,
  - transcript or downstream usage of recorded note.
- Expected outcome:
  - admin can record the AI note in the intended place and it is saved for later processing.
- Acceptance criteria:
  - recording succeeds,
  - saved note is retrievable,
  - downstream flow can use it.
- Required tests:
  - targeted audio note test,
  - smoke E2E for record -> save -> reopen.
- Dependencies and risks:
  - audio storage/transcription path,
  - browser media permissions.

#### Twilio legacy account / number configuration

- Status: `planned`
- Branch: `codex/integrate-twilio-legacy-config`
- Business problem: Lucyna asked about reconnecting an old Twilio account/number setup.
- Current symptoms:
  - uncertainty around which account and numbers should be connected.
- Areas to inspect:
  - Twilio config/env usage,
  - SMS send function,
  - current number selection assumptions.
- Expected outcome:
  - legacy Twilio setup is documented and integrated or clearly marked as blocked by operator action.
- Acceptance criteria:
  - correct account/number mapping is known,
  - smoke SMS path passes if credentials are valid.
- Required tests:
  - targeted Twilio config validation,
  - smoke test for SMS sending.
- Dependencies and risks:
  - external credentials and account ownership,
  - may require manual provider action.

## External Dependencies

- Stripe subscription and invoice flow
- Twilio account, phone numbers, and credentials
- Mailing and notification infrastructure
- Storage buckets for `recommendation-files` and audio

## Definition Of Done

A branch is `ready_for_uat` only when:

- implementation is complete,
- targeted test reproducing the issue passes,
- smoke E2E for the affected flow passes,
- this file is updated with current status and notes,
- known external blockers are explicitly documented.
