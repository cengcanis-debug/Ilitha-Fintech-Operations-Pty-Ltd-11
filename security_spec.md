# Zizamele Trust: Security Specification (Phase 0 TDD)

This security specification defines the Data Invariants, the "Dirty Dozen" malicious validation-violating payloads, and our test layout designed to prevent illegal or non-compliant modifications of South African citizenship verification, SAQA qualification records, and government compliance logs.

## 1. Data Invariants

- **Citizen Identity Integrity (Identity)**: A candidate profile can only be created or updated if the authenticated user (`request.auth.uid`) matches the profile ID. No user may write an ID number (`nationalId`) unless their authenticated email is verified (`request.auth.token.email_verified == true`).
- **Verifications are System-Protected (Integrity)**: The `dhaVerified` and `saqaVerified` fields, as well as automatic AI rank metrics, are strictly system-only. They are set exclusively via trusted backend routes, so direct modifications from any client SDKs are strictly blocked.
- **Qualifications Consistency (Integrity)**: Student Numbers must match strict structures, and NQF Levels must lie within the South African Standards Authority framework (range 1–10).
- **Hiring Decisions Traceability (State)**: Decisions must be justified and marked with the recording user's verified details. Once a decision is recorded as terminal ("shortlisted", "hired"), it becomes immutable except to verified systems/admin access.
- **Immutable Audit Logging (Immutability)**: Operational log entries inside the `/auditLogs/` collection are append-only. No user—regardless of role—may update or delete an audit log document. This ensures absolute compliance with the National Department of Labour requirements.

---

## 2. The "Dirty Dozen" Attack Payloads

These 12 malicious payloads are deliberately structured to bypass filters. A hardened ruleset must block every single one with a `PERMISSION_DENIED` status.

### DB-01: Spoofed Citizenship Profile Creation
*   **Attack Profile**: A signed-in attacker attempts to claim another citizen's record by creating a candidate profile using a route where they set the document ID to match a victim's user ID.
```json
// Path: /candidates/victim_user_uid_1234
{
  "id": "victim_user_uid_1234",
  "nationalId": "9412155092083",
  "firstName": "Sipho",
  "lastName": "Molefe",
  "email": "victim@domain.co.za",
  "studentNumber": "LUR123456",
  "nqfLevel": 7,
  "qualificationName": "BSc Computer Science",
  "institution": "University of Cape Town"
}
```
*   **Rejection Condition**: Blocked because `request.auth.uid != "victim_user_uid_1234"`.

### DB-02: Unverified Identity Number Registration
*   **Attack Profile**: A user tries to register or update their candidate profile with an unverified email account (`email_verified` is `false` in their authentication token).
```json
// Path: /candidates/attacker_user_uid
{
  "id": "attacker_user_uid",
  "nationalId": "9412155092083",
  "firstName": "Attacker",
  "lastName": "Spoof",
  "email": "attacker@fake.za",
  "studentNumber": "LUR999999",
  "nqfLevel": 4,
  "qualificationName": "Matric",
  "institution": "Soweto High"
}
```
*   **Rejection Condition**: Blocked because `request.auth.token.email_verified != true`.

### DB-03: Self-Attested Home Affairs (DHA) Identity Spoofing
*   **Attack Profile**: A client bypasses the secure verification server and attempts to create a profile already marked as `dhaVerified` and `saqaVerified` using direct Firestore SDK.
```json
// Path: /candidates/user_uid_555
{
  "id": "user_uid_555",
  "nationalId": "9102285112087",
  "firstName": "Thabo",
  "lastName": "Khumalo",
  "email": "thabo@khumalo.co.za",
  "studentNumber": "LUR555123",
  "nqfLevel": 8,
  "qualificationName": "BEng Electrical Engineering",
  "institution": "Wits University",
  "dhaVerified": true,
  "saqaVerified": true
}
```
*   **Rejection Condition**: Blocked because writing state fields `dhaVerified` and `saqaVerified` directly is restricted to server integrations or omitted in client-side create schema.

### DB-04: Fraudulent Level NQF Inflation
*   **Attack Profile**: An applicant attempts to elevate their qualification status by updating their verified NQF level from Level 4 (Matric) to Level 10 (PhD).
```json
// Path: /candidates/user_uid_555
// Existing: NQF 4
// Attempting update:
{
  "nqfLevel": 10
}
```
*   **Rejection Condition**: Blocked by strict `affectedKeys().hasOnly()` during client update, combined with restrictions on self-modifying qualifications once verified.

### DB-05: Absolute ID Poisoning Payload
*   **Attack Profile**: An attacker injects a highly corrupted string as a document ID to overflow memory limits or exhaust resource indices.
```json
// Path: /candidates/A_VERY_LONG_GARBAGE_STRING_REPEATED_OVER_1000_BYTES_abcdef123...
{
  "id": "A_VERY_LONG_GARBAGE_STRING_REPEATED_OVER_1000_BYTES_abcdef123...",
  "nationalId": "8505125191081",
  "firstName": "Junk",
  "lastName": "Buffer",
  "email": "junk@hack.za"
}
```
*   **Rejection Condition**: Blocked by `isValidId()` enforcing size boundaries (`id.size() <= 128`) and character matches (`^[a-zA-Z0-9_\-]+$`).

### DB-06: Direct Audit Log Erasure
*   **Attack Profile**: A malicious user or rogue employer attempts to send a `delete` call on an audit log document to hide non-compliant hiring practices.
```js
// Operation: db.collection('auditLogs').doc('log_84920').delete()
```
*   **Rejection Condition**: Blocked by default catch-all rule and explicit absence of `allow delete` on `auditLogs`.

### DB-07: Legacy Audit Log Modification (Compliance Spoof)
*   **Attack Profile**: An employer tries to retrospectively update details of an audit log entry to cover up lack of compliance or SAQA discrepancies during a hiring round.
```json
// Path: /auditLogs/log_84920
{
  "action": "DHA Verification Bypass", // Attempt to update description
  "systemHash": "99999999999fakehash"
}
```
*   **Rejection Condition**: Blocked by absolute prohibition of `update` calls on the `/auditLogs/` path.

### DB-08: Bypass Job Listing NQF Boundaries with Negatives
*   **Attack Profile**: A rogue user creates a Job posting with an NQF Level outside the authentic 1–10 framework (e.g., negative level -1 or extreme level 999).
```json
// Path: /jobs/job_101
{
  "id": "job_101",
  "title": "Unsafe Job",
  "requiredNqfLevel": 999,
  "department": "IT",
  "description": "Glitch job listing"
}
```
*   **Rejection Condition**: Blocked because NQF Level must be strictly `integer` between 1 and 10.

### DB-09: Orphaned Compliance Decision (Relational Break)
*   **Attack Profile**: A user posts a hiring decision referencing a non-existent candidate ID or non-existent job ID, aiming to inject unverified labor telemetry data.
```json
// Path: /hiringDecisions/decision_909
{
  "id": "decision_909",
  "jobId": "invalid_job_999",
  "candidateId": "does_not_exist_candidate",
  "decision": "hired"
}
```
*   **Rejection Condition**: Blocked via `exists()` validating that referenced objects strictly exist in the database before decision recording.

### DB-10: Insecure Blanket Search/Scraping Attack
*   **Attack Profile**: An unauthorized user queries the entire candidate database to scrape South African identity numbers or contact info.
```js
// Operation: db.collection('candidates').get() (without filtering by userId)
```
*   **Rejection Condition**: Blocked because `allow list` explicitly validates that queries must relate to `resource.data.id == request.auth.uid` unless the query agent belongs to a verified Department of Labour compliance auditor.

### DB-11: Client-Asserted Hired Overrides (privilege escalation)
*   **Attack Profile**: A rejected candidate attempts to update their own hiring record directly to change status from "rejected" to "shortlisted" or "hired".
```json
// Path: /hiringDecisions/decision_909
{
  "decision": "hired"
}
```
*   **Rejection Condition**: Blocked because only authorized employers/admin users are verified via rule checks during Hiring Decision writes.

### DB-12: Integrity Attack with Client-Provided Timestamps
*   **Attack Profile**: An employer attempts to update a compliance record backdated to a year ago to beat a legislative reporting deadline.
```json
// Path: /hiringDecisions/decision_909
{
  "recordedAt": "2025-01-01T00:00:00Z"
}
```
*   **Rejection Condition**: Blocked by strict validation enforcing `incoming().recordedAt == request.time` or `incoming().updatedAt == request.time`.

---

## 3. Test Runner Design

Security rules are validated by simulating operations mapping directly to the "Dirty Dozen" payloads.

```ts
// firestore.rules.test.ts Outline verified against the DRAFT_firestore.rules:
describe("Zizamele Trust Fortress Rules", () => {
  it("DB-01: Blocks spoofed citizenship profile creation", async () => {
    const db = getFirestoreForUser({ uid: "attacker_uid" });
    const ref = doc(db, "candidates", "victim_uid");
    await assertFails(setDoc(ref, mockPayload));
  });

  it("DB-02: Blocks unverified email registrations", async () => {
    const db = getFirestoreForUser({ uid: "unverified_uid", email_verified: false });
    const ref = doc(db, "candidates", "unverified_uid");
    await assertFails(setDoc(ref, mockPayload));
  });

  it("DB-03: Prevents self-attesting DHA or SAQA status", async () => {
    const db = getFirestoreForUser({ uid: "user_123", email_verified: true });
    const ref = doc(db, "candidates", "user_123");
    await assertFails(setDoc(ref, { ...mockPayload, dhaVerified: true }));
  });

  it("DB-05: Restricts oversized ID injections (ID Poisoning)", async () => {
    const db = getFirestoreForUser({ uid: "user_123", email_verified: true });
    const ref = doc(db, "candidates", "LONG_GARBAGE_ID_REPEATED_...");
    await assertFails(setDoc(ref, mockPayload));
  });

  it("DB-06: Denies direct log modifications/erasures", async () => {
    const db = getFirestoreForUser({ uid: "corporate_employer" });
    const ref = doc(db, "auditLogs", "log_123");
    await assertFails(deleteDoc(ref));
    await assertFails(setDoc(ref, { action: "tampered" }));
  });
});
```

---

## 4. Administrative Restrictions Configuration (Security & Audit Compliance)

For compliance with the Department of Labour regulations, access controls covering `auditLogs` and `hiringDecisions` (referred to as sensitive hiring decision and audit data) are locked under zero-trust administrative boundaries.

### Restricted Collections
1. **`hiringDecisions`** (Decisions Collection)
   - **Path**: `/hiringDecisions/{decisionId}`
   - **Reads (`get`, `list`)**: Restricted to verified `isAdmin()` roles only.
   - **Writes (`create`, `update`, `delete`)**: Restricted to verified `isAdmin()` roles only. Complete validation schema matching the candidate and job existence constraints is verified in tandem.

2. **`auditLogs`** (Audit Trail Collection)
   - **Path**: `/auditLogs/{logId}`
   - **Reads (`get`, `list`)**: Restricted to verified `isAdmin()` roles only.
   - **Writes (`create`)**: Append-only restricted to verified `isAdmin()` roles only. No modifications (`update`) or deletions (`delete`) are permitted even for admins.

### Administrative Identification Criteria
An authenticated query agent is validated as an administrative operator if and only if they satisfy the following criteria:
- **Presence of Authentication Token**: `request.auth != null`
- **Email Ownership**: `request.auth.token.email == "cengcanis@gmail.com"` (the dedicated supervisor identifier)
- **Identity Verification Proof**: `request.auth.token.email_verified == true`

This layout guarantees that sensitive local hiring indexes, status adjustments, justification records, and raw biometric validation feedback cannot be leaked or poisoned by ordinary applicants or external observers.

