# vyapaarKhata — Feature Requirements: Manual WhatsApp Invoice Sharing

**Document ID:** FR-COMMS-001  
**Version:** 1.0  
**Status:** Ready for implementation planning  
**Scope:** Initial release (manual, user-confirmed WhatsApp sharing; no WhatsApp Business API)  
**Platforms:** Shared React web application running on laptop-primary or Android-tablet-primary installations

---

## 1. Purpose

Allow a shop operator to share a posted sales invoice with a customer through WhatsApp from vyapaarKhata without integrating the paid/official WhatsApp Business Cloud API.

The first release uses WhatsApp Click to Chat (`https://wa.me/...`) to open the chat for a selected customer with a prefilled message. The operator reviews the recipient and message and manually presses **Send** in WhatsApp.

The feature also provides a separate **Share invoice PDF** action. Where browser/device capabilities permit, the application invokes the native operating-system share sheet with the generated PDF. Otherwise, it downloads the PDF and explains that the operator must attach it manually in WhatsApp.

This feature is intended for transactional invoice sharing only. It is not a bulk messaging, marketing, automated notification or WhatsApp API integration feature.

## 2. Goals

1. Let an operator open the WhatsApp conversation for the invoice's customer directly, without searching for the customer manually.
2. Prefill an accurate invoice message with customer name, business name, invoice number, invoice date and financial summary.
3. Allow the operator to review/edit the prefilled message and choose when to send it.
4. Allow the operator to share the invoice PDF using supported device/browser sharing capabilities.
5. Work with the existing offline-first vyapaarKhata architecture; invoice posting must never depend on WhatsApp being available.
6. Work from the same shared React frontend in laptop and Android tablet deployments.
7. Avoid WhatsApp API credentials, Meta business onboarding, message template approval, API webhooks and provider charges in this phase.

## 3. Explicit non-goals

The first release must NOT implement:

- WhatsApp Cloud API or any third-party WhatsApp messaging provider.
- Automatic message sending without an operator action in WhatsApp.
- Background, scheduled, bulk or campaign messaging.
- Automated delivery/read receipts or WhatsApp send-status tracking.
- Automatic PDF attachment through the `wa.me` link.
- A guarantee that the WhatsApp account is installed or the destination number has an active WhatsApp account.
- Marketing/promotional messages.
- WhatsApp OTP login/authentication.
- Tenant-level Meta Embedded Signup, business verification or permanent Meta token storage.
- A public invoice URL unless a separately reviewed secure document-sharing feature is introduced.

Do not describe the feature as “message sent” merely because WhatsApp opened. The operator must press Send inside WhatsApp; the application cannot reliably observe that action through a normal Click to Chat URL.

## 4. User roles and permissions

### 4.1 Actors

- **Owner:** can configure business communication preferences and use invoice sharing.
- **Manager:** may share invoices if granted the relevant permission.
- **Sales operator:** may share invoices if granted the relevant permission.
- **Other staff:** no access unless explicitly granted.

### 4.2 Permissions

Reuse the existing permission model where possible. Suggested permission codes:

- `sales.invoice.share_whatsapp` — open WhatsApp with invoice message.
- `sales.invoice.share_pdf` — invoke PDF sharing/download.

If the existing product uses a coarser `sales.read` or invoice permission model, map these actions to the established permission convention instead of introducing an inconsistent authorization system.

All permissions must be checked by the backend for audit/log endpoints and by the frontend for presentation. Hiding a button in React is not authorization.

## 5. User experience and entry points

### 5.1 Primary entry point: after invoice posting

After a sales invoice is successfully posted, show the existing success state with actions:

1. **Send via WhatsApp**
2. **Share invoice PDF**
3. Print invoice (if already supported)
4. View invoice

The WhatsApp action should be prominent but must not be the only way to close the success state.

### 5.2 Secondary entry point: posted invoice details

On the details page of an already posted invoice, show the same actions:

- Send via WhatsApp
- Share invoice PDF

The actions must use the persisted invoice snapshot and current authorized customer contact selection. They must not recalculate or mutate the invoice.

### 5.3 Draft invoices

Do not enable invoice-sharing actions on a draft invoice by default. The first release is for posted invoices so the shared details correspond to a finalized document.

If product later wants draft quotation sharing, implement it as a separate explicitly named action and template; do not silently reuse the posted-invoice flow.

### 5.4 Confirmation and review

Before opening WhatsApp, show a compact confirmation/review panel or dialog containing:

- Customer name.
- Selected WhatsApp number in readable international format.
- Invoice number.
- Total amount.
- Amount already paid, if any.
- Balance due.
- A preview of the message text.
- A clear indication that WhatsApp will open and the operator must press Send there.

Allow the operator to change the selected customer contact/WhatsApp number if more than one valid contact exists. Do not silently send to `alternate_phone` without showing which number will be used.

The operator may edit the message text for this one share action. Editing the share message must not modify the posted invoice or stored invoice data.

## 6. WhatsApp Click to Chat behavior

### 6.1 URL format

Use the official Click to Chat URL format:

`https://wa.me/<international-number>?text=<URL-encoded-message>`

The phone number path value must contain digits only, including country calling code, with no leading `+`, spaces, hyphens, parentheses or national trunk prefix.

Example (illustrative only):

`https://wa.me/919876543210?text=Hello%20Sharma...`

Use `encodeURIComponent` for the complete message string. Never manually concatenate unescaped customer names, invoice values or user-entered message content into the URL.

### 6.2 Number selection priority

The application must select a destination number using the following safe rules:

1. A dedicated WhatsApp number saved for the customer/contact, if present and valid.
2. Otherwise, the customer's primary phone number, if valid and explicitly selected/confirmed for WhatsApp use.
3. If multiple party contacts are available, show a selector and let the operator choose.
4. Do not silently fall back to an alternate number where the recipient is ambiguous.

The original schema has `parties.phone`, `parties.alternate_phone` and `party_contacts.phone`. Inspect the current implementation before proposing a schema change. Prefer reusing existing contact data if the UI can unambiguously distinguish the WhatsApp destination. If it cannot, propose a minimal additive `whatsapp_phone` field on the appropriate party/contact entity and document the migration. Do not rename or remove existing columns.

### 6.3 Phone normalization and validation

- Normalize to E.164 internally where possible.
- Use a maintained phone-number parsing/validation library (for example, a maintained libphonenumber implementation) rather than hand-written country-specific regexes.
- Use the tenant's configured country as the default region when the user enters a national-format number.
- For an India tenant, a 10-digit mobile number may be interpreted using country code `+91` only after validation.
- Do not assume all tenants or all customers are in India.
- Do not include a leading domestic `0` when constructing the Click to Chat number.
- Do not include the `+` in the `wa.me` path.
- Validation confirms number format, not that the number has an active WhatsApp account.
- If the number cannot be normalized unambiguously, block the action and ask the operator to correct/select the number.

### 6.4 Opening WhatsApp

- Trigger navigation only from an explicit user click/tap to avoid popup blockers.
- Use a normal external navigation or safe new-window behavior (`noopener`/`noreferrer` where applicable).
- Do not claim success before the browser/OS handles the navigation.
- If WhatsApp is installed, the OS/browser may route to the application. Otherwise, the browser may open WhatsApp Web or a web fallback and request sign-in.
- If navigation is blocked or fails, retain the invoice screen and offer a copy-message action plus the raw link/open-again option.
- Do not attempt hidden iframe-based message sending.

### 6.5 Message template

Provide one default transactional template in the first release. The template must be deterministic and must only include data available on the posted invoice.

Suggested default:

`Hello {customer_name},\n\nYour invoice {invoice_number} from {business_name} has been generated.\nInvoice date: {invoice_date}\nInvoice total: {currency}{grand_total}\nPaid: {currency}{amount_paid}\nBalance due: {currency}{balance_due}\n\nThank you for your business.`

Rules:

- If there are no payments, show paid as zero and balance due as invoice total.
- If fully paid, show balance due as zero and status as Paid (or omit a misleading due reminder).
- If partially paid, show both total and remaining balance.
- Use the business's configured display name and currency formatting.
- Use the persisted invoice number/date and posted totals; do not recalculate using current product prices or tax settings.
- Do not include sensitive internal notes, internal IDs, payment account details, customer PAN, or unnecessary personal information.
- Do not include a local-only file path or inaccessible `localhost` URL in the message.
- Message is editable by the operator before opening WhatsApp.
- Future localization/template settings are outside this first release, but structure the template builder so it can be extended without rewriting the invoice domain model.

### 6.6 Customer consent and preferences

- The application must not automatically opt customers into WhatsApp communications.
- Provide a customer-level preference/consent field or equivalent existing communication-preference mechanism if one exists.
- Capture the operator/source and timestamp when consent is recorded, where supported by the current data model.
- Provide an opt-out state and respect it in future messaging features.
- For this manual, operator-initiated share feature, show the customer's recorded preference before opening WhatsApp. If consent is absent or unknown, prompt the operator to confirm that the customer has requested/agreed to receive the invoice by WhatsApp, and record the confirmation according to the approved product/legal policy.
- Do not use this feature for promotional content.
- The exact legal/consent policy must be reviewed for the target markets; do not represent this feature as automated API messaging compliance.

## 7. Invoice PDF sharing

### 7.1 Separate capability from Click to Chat

A `wa.me` URL can prefill text and open a direct chat. It cannot attach the generated invoice PDF.

Therefore, PDF sharing is a distinct action:

- Generate or retrieve the posted invoice PDF.
- Check whether the browser supports file sharing through the Web Share API.
- If file sharing is supported, invoke the native share sheet with the PDF file and a short text/title.
- Let the operator select WhatsApp and then select the customer/chat in the share sheet/application.
- Do not claim that the share sheet can preselect the WhatsApp recipient; the standard file-share flow does not guarantee this.

### 7.2 Web Share API capability detection

Use capability detection rather than browser-name checks:

- Check `navigator.share` availability.
- Check `navigator.canShare` and whether it accepts the generated `File` in `{ files: [...] }`.
- Invoke `navigator.share({ files, title, text })` only after an explicit user gesture.
- Treat `AbortError` as a user cancellation, not as a system failure.
- Handle unsupported APIs, permission failures and share failures gracefully.

The Web Share API generally requires a secure context. `localhost` is normally treated as trustworthy for a local app, but a LAN URL such as `http://192.168.x.x` may not qualify. The implementation must test the actual laptop/tablet deployment origins. Do not assume that every local HTTP deployment supports file sharing.

### 7.3 Fallback behavior

If file sharing is unavailable:

1. Generate/download the PDF through the existing invoice PDF feature.
2. Show a clear instruction: “PDF downloaded. Open the customer's WhatsApp chat and attach the downloaded file.”
3. Offer a separate **Open WhatsApp chat** action that opens the selected customer's prefilled message.
4. Do not imply the PDF was attached.

If PDF generation is not implemented yet, do not create a fake file. Report the dependency and implement the action only when an actual invoice PDF renderer is available.

### 7.4 PDF security

- Use the existing invoice PDF generation and authorization path.
- Do not create a publicly accessible permanent invoice URL as a shortcut.
- Do not expose filesystem paths or server-local storage keys to the browser.
- Verify tenant and invoice access before producing/downloading the PDF.
- Use a short-lived protected download route if the current app architecture requires a backend route.
- Do not store or share a PDF belonging to another tenant.

## 8. Business and data requirements

### 8.1 Invoice source data

Use the posted invoice and its immutable snapshots as source data:

- Invoice identifier and number.
- Invoice date.
- Tenant/business display name.
- Customer display name.
- Customer billing/contact information as approved for display.
- Currency.
- Subtotal, discount, taxable amount, taxes, round-off and grand total.
- Amount paid and balance due from authoritative allocation/ledger calculation.
- Invoice PDF generated from the posted invoice.

The frontend must not calculate the authoritative balance due from stale client state if the backend already exposes it.

### 8.2 Customer contact data

Inspect current entities before changing schema. The original DBML includes:

- `parties.phone`
- `parties.alternate_phone`
- `party_contacts.phone`
- `party_contacts.is_primary`

If a dedicated WhatsApp destination or per-contact preference cannot be represented cleanly, propose an additive change, preferably:

- A dedicated `whatsapp_phone`/normalized phone field on the party or contact record.
- A communication preference/consent status.
- Consent timestamp and source, where needed.

Do not add a large notification-provider schema for this manual-only feature. Do not create Meta account/token/template/webhook tables in this phase.

### 8.3 Audit/history

A lightweight audit/history record may record:

- Tenant ID.
- Invoice ID.
- Actor user ID.
- Action (`WHATSAPP_CHAT_OPEN_REQUESTED`, `PDF_SHARE_REQUESTED`, `PDF_DOWNLOADED` where observable).
- Selected contact identifier or masked destination number.
- Timestamp.
- Client/platform metadata when already available.

Do not record the full message body or sensitive personal data in logs by default.

The system cannot know whether the operator pressed Send or whether the customer received/read the message. Do not create a false `SENT`, `DELIVERED` or `READ` status. Use accurate statuses such as `OPEN_REQUESTED`, `SHARE_SHEET_OPENED` (only if observable), `DOWNLOAD_COMPLETED` or `CANCELLED`.

Audit-history persistence is a product decision: reuse the existing audit/activity infrastructure; do not create a new table unless necessary.

## 9. Backend requirements

The feature should be lightweight. Do not introduce a WhatsApp provider integration or background notification worker for manual sharing.

Required backend capabilities:

1. An authorized read endpoint or existing invoice details endpoint must provide the posted invoice's sharing summary.
2. The response must include customer contact candidates with enough information for the operator to select the destination, subject to permissions and data minimization.
3. Provide invoice PDF generation/download through the existing document service if available.
4. Validate tenant ownership and posted invoice status for PDF access.
5. Optionally provide a small audit endpoint/service to record that an operator requested a share/open action.
6. If contact preference fields are added, provide create/update validation and migration.

Possible API shapes (adapt to the finalized OpenAPI naming conventions; do not create duplicates):

- `GET /api/v1/sales-invoices/{invoiceId}/share-details`
- `GET /api/v1/sales-invoices/{invoiceId}/pdf`
- `POST /api/v1/sales-invoices/{invoiceId}/share-actions`

The `share-details` response may contain:

```json
{
  "invoiceId": "...",
  "invoiceNumber": "INV/2026-27/0012",
  "status": "POSTED",
  "invoiceDate": "2026-11-22",
  "businessName": "Example Building Materials",
  "customer": {
    "id": "...",
    "displayName": "Sharma Construction",
    "contacts": [
      {
        "id": "...",
        "displayName": "Accounts",
        "phoneE164": "+919876543210",
        "isPrimary": true,
        "whatsappPreference": "UNKNOWN"
      }
    ]
  },
  "currency": "INR",
  "grandTotal": "25000.00",
  "amountPaid": "5000.00",
  "balanceDue": "20000.00",
  "pdfAvailable": true
}
```

This is illustrative only. Use the project's exact DTO naming and decimal serialization rules. Never represent money as binary floating-point numbers in authoritative calculations.

## 10. Frontend requirements

1. Add **Send via WhatsApp** and **Share invoice PDF** actions to posted invoice success/details views.
2. Check user permissions before showing actions; backend must also enforce authorization.
3. Fetch share details from the authoritative invoice endpoint.
4. Present destination selection when multiple contacts/numbers exist.
5. Show the formatted destination number and invoice summary before opening.
6. Build the message from a tested utility/template, not duplicated string logic across components.
7. Encode the message using `encodeURIComponent`.
8. Open WhatsApp only from a direct click/tap.
9. Provide Copy message and Download PDF fallbacks.
10. Handle popup blocking, missing app/browser, invalid number, offline state and file-share cancellation.
11. Do not show a sent/delivered state after merely opening WhatsApp.
12. Reuse existing UI components, design tokens, notification/toast system and modal conventions.
13. Keep all platform-specific behavior behind small capability/helper modules rather than branching business logic through the UI.

## 11. Suggested frontend interaction

### 11.1 Posted invoice success screen

Display:

- “Invoice successfully generated”.
- Invoice number and total.
- `Send via WhatsApp` primary/secondary action.
- `Share invoice PDF` action.
- Existing print/view actions.

### 11.2 WhatsApp review dialog

Fields/content:

- Customer name.
- Destination phone selector (when needed).
- Consent/preference status and confirmation when unknown.
- Editable message preview.
- **Open WhatsApp** button.
- Cancel button.

Upon clicking Open WhatsApp:
- Validate selected destination.
- Generate encoded Click to Chat URL.
- Open external URL.
- Close or retain dialog according to established UX conventions.
- Show neutral guidance: “WhatsApp opened. Review the message and press Send.”

### 11.3 PDF share action

- Generate/retrieve PDF.
- Attempt native file share when supported.
- If unsupported, download the PDF and display attachment instructions plus Open WhatsApp Chat action.
- If operator cancels the share sheet, keep the invoice unchanged and do not report failure of invoice creation.

## 12. Offline-first behavior

- Invoice posting is entirely local and must never wait for WhatsApp.
- The WhatsApp action is a client-side handoff to WhatsApp/browser and generally requires network availability to complete the conversation.
- If the device is offline, show a clear message and allow the operator to retry later. Do not roll back or modify the posted invoice.
- PDF generation/download may work offline if the renderer and assets are local.
- Do not add pending automatic-send jobs or a notification outbox for this manual-only feature.
- For LAN clients, the local primary server must provide the PDF through an authenticated route. Do not use `localhost` links that resolve to the client device instead of the primary server.

## 13. Error handling and edge cases

Handle at least:

- Customer has no phone number.
- Phone number is invalid or ambiguous.
- Country calling code is missing and cannot be safely inferred.
- Multiple customer contacts exist.
- WhatsApp preference is unknown or opted out.
- Destination number does not have an active WhatsApp account.
- WhatsApp is not installed.
- WhatsApp Web requires login.
- Browser blocks opening a new window.
- Internet connection is unavailable.
- PDF generation fails.
- Web Share API is unavailable.
- Web Share API reports unsupported file sharing.
- User cancels native share sheet (`AbortError`).
- File download is blocked/fails.
- Invoice is draft, cancelled or inaccessible.
- User lacks share permission.
- Invoice belongs to another tenant.
- Customer/contact is updated after invoice posting.
- A share action is clicked repeatedly.

A failed share must never change invoice, stock, payment, party ledger or accounting state.

## 14. Security and privacy

- Verify tenant and user permissions before serving invoice data/PDF.
- Do not leak invoice PDF URLs, local paths, credentials or tokens in the WhatsApp message.
- Do not include sensitive fields such as PAN or internal notes unless a future explicit requirement approves them.
- Avoid placing unnecessarily sensitive data in query parameters. The message text is necessarily included in the Click to Chat URL; explain this in implementation documentation and keep it limited to invoice summary data.
- Use `noopener`/`noreferrer` where opening a new browsing context.
- Do not store the Meta access token or WhatsApp API credentials; there is no API integration in this phase.
- Record opt-out/preference and respect it.
- Logs should contain action metadata, not full message contents.

## 15. LLD and design guidance

Implement the smallest useful abstractions. Do not over-engineer a manual sharing feature.

Reasonable structure (adapt to repository conventions):

- `PhoneNumberNormalizer` utility/service: validates and normalizes phone numbers using a maintained library.
- `InvoiceShareMessageBuilder`: builds the default message from a typed invoice-sharing DTO.
- `WhatsAppClickToChatUrlBuilder`: creates the URL and handles URL encoding.
- `InvoicePdfShareService` or existing document/share service: obtains a PDF and selects the supported browser share/download path.
- `BrowserShareCapabilities` helper: performs feature detection for file sharing.

A Strategy interface is only justified if the application actually supports multiple share transports with meaningfully different behavior. Do not create a factory hierarchy, provider abstraction or background notification framework for one `wa.me` URL and one PDF share action.

Keep pure functions pure and unit-test them. Keep React components responsible for presentation and invoking user actions. Keep authorization, tenant scoping and PDF access in the backend.

## 16. Implementation work breakdown

### Task WAI-01 — Inspect and document existing capabilities

- Inspect party/contact schema and forms.
- Inspect invoice details and posting response.
- Inspect invoice PDF generation/printing.
- Inspect permission codes and audit/activity logging.
- Inspect current routing and external-link handling.
- Report whether schema changes are required before coding.

**Acceptance:** a short implementation note identifies reused entities/services and any minimal schema/API changes. No duplicate domain model is introduced.

### Task WAI-02 — Customer WhatsApp contact support

- Reuse existing phone/contact data if sufficient.
- If necessary, add a dedicated WhatsApp destination field and preference/consent fields through a migration.
- Add UI to create/edit the value.
- Normalize/validate number at save or selection time.
- Preserve compatibility for existing customer records.

**Acceptance:** valid and invalid destination numbers are handled correctly; no customer is silently opted in.

### Task WAI-03 — Backend invoice share details

- Expose or extend an authorized endpoint for posted invoice sharing details.
- Return customer contact candidates, business display name, posted invoice totals and balance due.
- Reuse existing balance/ledger calculations.
- Enforce tenant and permission boundaries.

**Acceptance:** only authorized users can retrieve their tenant's invoice share details; totals match the persisted posted invoice and allocations.

### Task WAI-04 — WhatsApp message/link utility

- Implement tested phone normalization.
- Implement default message builder.
- Implement `wa.me` URL builder.
- Support international numbers and Unicode/Indian currency symbols.

**Acceptance:** URL is correctly encoded and opens the selected customer number with the expected prefilled content.

### Task WAI-05 — Frontend WhatsApp flow

- Add action to posted invoice success and details screens.
- Add contact selection and message preview/editing.
- Open WhatsApp on explicit action.
- Add copy-message fallback and clear guidance.

**Acceptance:** operator can open the correct chat and sees the message prefilled; no automatic send is claimed.

### Task WAI-06 — PDF sharing

- Reuse or complete posted invoice PDF generation.
- Detect Web Share API file support.
- Invoke share sheet after user click if supported.
- Provide download and manual-attachment fallback.
- Validate access to the PDF route.

**Acceptance:** supported devices share a real PDF through the native share UI; unsupported devices download it and receive accurate instructions.

### Task WAI-07 — Audit and observability

- Reuse activity/audit infrastructure for share attempts where appropriate.
- Record action requested, actor, invoice, masked contact and timestamp.
- Do not record a false sent/delivered/read status.

**Acceptance:** audit history reflects only observable actions and contains no unnecessary message content.

### Task WAI-08 — Cross-platform and regression testing

- Test laptop browser.
- Test Android tablet primary server in tablet browser.
- Test a LAN-connected browser client.
- Test mobile/desktop WhatsApp handoff behavior.
- Test invoice, stock, ledger and payment regressions.

**Acceptance:** sharing has no effect on financial/inventory state and fallbacks work on unsupported origins/browsers.

## 17. Test cases

### Phone and URL tests

1. Valid Indian 10-digit number with tenant default country becomes `91` plus the 10 digits.
2. Valid E.164 number is normalized correctly.
3. A number containing spaces, brackets, hyphens and a leading plus is normalized safely.
4. Invalid/ambiguous number is rejected.
5. No country is guessed for a foreign number when context is missing.
6. Customer name with spaces, ampersand, apostrophe and non-Latin characters is encoded correctly.
7. Message containing newlines, `₹`, `/`, `&` and punctuation is URL-encoded correctly.
8. Generated URL contains digits-only destination number.

### Invoice message tests

1. Fully unpaid invoice displays invoice total and full balance due.
2. Partially paid invoice displays total, amount paid and remaining balance.
3. Fully paid invoice displays zero balance due/paid state correctly.
4. Invoice message uses posted snapshots, not modified catalogue prices.
5. Message contains no local filesystem path or private storage key.

### UX/browser tests

1. Click opens the correct customer chat URL.
2. User can edit the preview without changing invoice records.
3. Popup blocking is handled with fallback.
4. Missing WhatsApp application is explained; WhatsApp Web fallback is allowed.
5. Web Share API with supported PDF invokes native share.
6. Unsupported Web Share API falls back to download.
7. `AbortError` does not show a misleading failure.
8. LAN HTTP origin where file sharing is unavailable uses download fallback.
9. Repeated clicks do not create duplicate financial operations.

### Security/regression tests

1. User from another tenant cannot access invoice share data or PDF.
2. User without permission cannot request share details/PDF.
3. Draft/cancelled invoices cannot use posted invoice sharing action.
4. Share attempts do not alter invoice status, stock, party ledger or journals.
5. No share action claims a message was sent or delivered.

## 18. Acceptance criteria — release gate

The feature is ready when all of the following are true:

- [ ] The operator can share from a successfully posted invoice.
- [ ] The destination WhatsApp chat is opened using the selected customer's validated number.
- [ ] The message is prefilled with correct business/customer/invoice/amount details.
- [ ] The operator must manually press Send in WhatsApp.
- [ ] No WhatsApp API account, API key or paid provider integration is required.
- [ ] The PDF share action shares an actual PDF when supported.
- [ ] Unsupported browsers/devices receive a working download/manual-attachment fallback.
- [ ] The feature works from laptop and Android-tablet-hosted shared React app, within tested browser capabilities.
- [ ] The feature is tenant-scoped and permission-checked.
- [ ] Customer communication preference is visible and not silently opted in.
- [ ] No false sent/delivered/read status appears.
- [ ] Invoice, stock, payment and accounting data are unchanged by share attempts.
- [ ] Unit, integration and cross-platform tests pass.

## 19. Future extension — explicitly not part of this task

A future phase may add official WhatsApp Business Platform/Cloud API integration, including tenant-level Meta onboarding, business phone registration, approved utility templates, consent management, webhook delivery statuses, encrypted tenant credentials, cloud notification worker and usage/billing controls.

Do not pre-implement those integrations now. Keep the manual Click to Chat feature small and isolate the message builder so a future provider can reuse the invoice-sharing DTO without changing invoice business logic.

## 20. Instructions to the coding agent

1. Read this feature document together with the current vyapaarKhata PRD, HLD, OpenAPI contract and DBML schema.
2. Inspect the current repository before modifying anything.
3. Reuse existing invoice, customer, contact, PDF, permission, audit and UI abstractions.
4. Do not create duplicate tables, APIs or services.
5. Do not alter the atomic invoice-posting workflow to accommodate WhatsApp.
6. Do not add Meta Cloud API, provider SDKs, paid services or automatic messaging.
7. Do not add delivery/dispatch/fleet/e-way-bill functionality.
8. Implement in the task order in §16, with a small PR/commit per task.
9. Add tests for all acceptance criteria and report unsupported browser/platform cases.
10. If a schema change is needed, show the exact additive DBML change and PostgreSQL/SQLite migrations before applying it. Never remove or rename existing schema entities for this feature.
11. Use pragmatic LLD. Prefer small, testable helpers and existing project patterns; do not overuse design patterns or create unnecessary abstractions.
12. Update OpenAPI YAML, technical docs and task status when the implementation is complete.
13. Report what is implemented, what remains unsupported and how it was tested. Never claim WhatsApp messages were sent automatically.
