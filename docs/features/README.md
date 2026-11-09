# Features

Every feature of the product, grouped by the surface a user reaches it on.

## Area A1: App

### Feature F1: Session
- Rule R1: A page behind login sends a signed-out visitor to `/login`
  - Scenario S1: Opening `/` without a session cookie redirects to `/login`
  - Scenario S2: Opening `/` with a session cookie matching no stored session redirects to `/login`
  - Scenario S3: Opening `/` with a session created more than 30 days ago redirects to `/login`
- Rule R2: The session cookie stays out of reach of page scripts and cross-site requests
  - Scenario S4: The session cookie set on login has `HttpOnly` and `SameSite=Lax`

## Area A2: App › Register

### Feature F2: Registration
- Rule R3: A visitor registers with a name and a password and lands signed in on the home page
  - Scenario S5: Registering a new name with an 8-character password opens `/` showing "Welcome, <name>" (happy path)
- Rule R4: One name belongs to one account, ignoring case
  - Scenario S6: Registering a name in use shows "That name is taken." and adds no account
  - Scenario S7: Registering "ALICE" while the account "alice" exists shows "That name is taken."
- Rule R5: Registration refuses a blank name or a short password
  - Scenario S8: Registering with a blank name shows "Name is required." and adds no account
  - Scenario S9: Registering with a 7-character password shows "Password must be at least 8 characters." and adds no account
- Rule R6: The database stores a hash of the password
  - Scenario S10: After registering, the account's database row lacks the typed password

## Area A3: App › Login

### Feature F3: Login
- Rule R7: A registered name with its password opens the home page
  - Scenario S11: Logging in with a registered name and its password opens `/` showing "Welcome, <name>" (happy path)
- Rule R8: A failed login shows the same message whichever field is wrong
  - Scenario S12: Logging in with a registered name and a wrong password shows "Wrong name or password."
  - Scenario S13: Logging in with an unregistered name shows "Wrong name or password."

## Area A4: App › Home

### Feature F4: Logout
- Rule R9: Logging out ends the session on the server
  - Scenario S14: Logging out redirects to `/login` (happy path)
  - Scenario S15: Opening `/` with the session cookie captured before logout redirects to `/login`

## Area A5: Server › /healthcheck

### Feature F5: Health check
- Rule R10: The health check answers once the database answers
  - Scenario S16: `GET /healthcheck` returns status 200 with the body "OK" (happy path)
