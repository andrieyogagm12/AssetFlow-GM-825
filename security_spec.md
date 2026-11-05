# Firebase Security Specification (AssetFlow GM 825)

## 1. Data Invariants
1. An asset document cannot be created without a valid code, name, and recognized status.
2. A rotation cannot be recorded without referencing an existing asset code and destination location.
3. System timestamps (`request.time`) or recognized ISO dates must govern update states.
4. User profiles and permissions can only be altered by authorized administrators.
5. Inactive/deleted assets cannot participate in active operations without reactivation.
6. Period locks cannot be overwritten retrospectively when locked.

## 2. The "Dirty Dozen" Threat Payloads
1. **Unauthenticated Write**: Creating an asset without authentication credentials.
2. **Missing Required Fields**: Asset creation missing `code` or `locationCode`.
3. **Invalid ID Poisoning**: Document IDs with illegal path injection or length > 128 characters.
4. **Privilege Escalation**: Non-admin account modifying `isSuperAdmin` or `akses` fields.
5. **Ghost Field Injection**: Adding arbitrary undocumented keys (e.g., `bypassAudit: true`).
6. **Denial of Wallet Payload**: Storing giant string arrays (>1MB) in machine specs or tags.
7. **Cross-Location Tampering**: Submitting rotation from a branch that the user is not permitted to access.
8. **Forged System Audit**: Overwriting or deleting existing audit logs.
9. **Lock Bypass**: Mutating transactions in a period marked as `isLocked: true`.
10. **Type Confusion**: Passing boolean or integer values where string/ISO dates are mandated.
11. **Orphaned Rotation**: Creating rotation for a non-existent asset code.
12. **Double Delete**: Deleting an already deleted asset record.

## 3. Security Rules Architecture
- Default-deny catch-all rule `match /{document=**} { allow read, write: if false; }`.
- Specific rules for `/assets/{assetId}`, `/rotations/{rotationId}`, `/locations/{locationId}`, `/users/{userId}`, `/periodLocks/{lockId}`, `/auditLogs/{logId}`, and `/test/{docId}`.
- Sanitized ID validation: `isValidId(id)`.
