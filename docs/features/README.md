# Features

Every feature of the product, grouped by the surface a user reaches it on.

## Area A1: App

### Feature F1: Session
- Rule R1: A page behind login sends a signed-out visitor to `/login`
  - Scenario S1: Opening `/` without a session cookie redirects to `/login`
  - Scenario S2: Opening `/` with a session cookie matching no stored session redirects to `/login`
  - Scenario S3: Opening `/` with a session created more than 30 days ago redirects to `/login`
  - Scenario S19: Opening `/add`, `/records`, or `/report` without a session cookie redirects to `/login`
- Rule R2: The session cookie stays out of reach of page scripts and cross-site requests
  - Scenario S4: The session cookie set on login has `HttpOnly` and `SameSite=Lax`

### Feature F6: Mobile layout
- Rule R11: Every page fits the width of a 360 px phone screen
  - Scenario S17: On a 360 px wide screen, `/login` fits the screen width and shows the whole "Log in" button
  - Scenario S18: On a 360 px wide screen, `/` for a signed-in user fits the screen width and shows the whole "Log out" button (happy path)
  - Scenario S41: On a 360 px wide screen, `/add` fits the screen width and shows the whole "Add entry" button
  - Scenario S86: On a 360 px wide screen, `/` with a year of entries fits the screen width, and every chart fits its card

### Feature F7: Sidebar menu
- Rule R12: The sidebar menu reaches every section of the app from every signed-in page
  - Scenario S20: Each sidebar menu item opens its page: "Dashboard" opens `/`, "Add" opens `/add`, "Records" opens `/records`, "Report" opens `/report` (happy path)
- Rule R13: The sidebar menu marks the page on screen
  - Scenario S21: On `/records`, the "Records" menu item has `aria-current="page"` and the other items lack it
- Rule R14: On a phone, the sidebar opens from a "Menu" button
  - Scenario S22: On a 360 px wide screen, the sidebar menu stays hidden until a tap on "Menu" shows it
  - Scenario S23: On a 360 px wide screen, choosing "Add" in the open sidebar opens `/add` with the sidebar hidden
  - Scenario S24: On a 1280 px wide screen, the sidebar menu shows on page load, with the "Menu" button hidden

### Feature F8: Default currency
- Rule R15: The default currency set in the sidebar stays with the account
  - Scenario S25: Setting the default currency to "USD", then reloading the page, shows "USD" in the "Default currency" field (happy path)
  - Scenario S26: A new account shows "IDR" in the "Default currency" field
  - Scenario S27: After one account sets the default currency to "USD", a second account shows "IDR"
- Rule R16: The default currency is an ISO 4217 currency code
  - Scenario S28: Saving "ABC", a code outside ISO 4217, shows "Pick a currency from the list." and keeps the stored currency

### Feature F9: Reporting start day
- Rule R17: The reporting start day set in the sidebar stays with the account
  - Scenario S29: Setting the reporting start day to 25, then reloading the page, shows 25 in the "Reporting start day" field (happy path)
  - Scenario S30: A new account shows 1 in the "Reporting start day" field
- Rule R18: The reporting start day stays between 1 and 28
  - Scenario S31: Saving 31 as the reporting start day stores 28
  - Scenario S32: Saving 0 as the reporting start day stores 1

### Feature F12: Dates
- Rule R29: The app shows and takes every date as YYYY/MM/DD
  - Scenario S62: The Add page opens with today's date in the date field as YYYY/MM/DD (happy path)
  - Scenario S63: Typing 20261103 into the date field shows "2026/11/03"
  - Scenario S64: Picking the first day of the shown month in the date field's calendar shows that date as YYYY/MM/DD
  - Scenario S65: Adding an entry dated "2026/11/03" stores the date 3 November 2026
  - Scenario S66: Adding an entry dated "2026/02/30" shows "Please pick a date." and stores no entry

## Area A6: App › Add

### Feature F10: Income and expense entries
- Rule R19: An entry added on the Add page stays with the account
  - Scenario S33: Adding an expense of 50000 under "Grocery", "Non-fixed - Essential", and "Personal", with the note "Weekly shop", stores that entry for the account and shows "Added ✓" (happy path)
  - Scenario S34: Adding an income of 5200000 under "Salary" stores an income entry without an expense type or an owner
- Rule R20: The Add page refuses an entry without a date or a numeric amount
  - Scenario S35: Adding a blank amount shows "Please enter an amount (numbers only)." and stores no entry
  - Scenario S36: Adding the amount "12abc" shows "Please enter an amount (numbers only)." and stores no entry
  - Scenario S37: Adding an entry with a blank date shows "Please pick a date." and stores no entry
- Rule R21: The amount groups thousands with a dot as the user types, and a comma marks the decimals
  - Scenario S56: Typing 1250000 into the amount shows "1.250.000"
  - Scenario S57: Adding the amount "1.250.000" stores 1250000
  - Scenario S58: Adding the amount "12,5" stores 12.5
- Rule R22: The category list follows the entry type
  - Scenario S39: With "Income" chosen, the category list shows "Salary", "Freelance", "Dividend", "Bonus", and "Other"
  - Scenario S40: With "Expense" chosen, the category list shows the mockup's expense categories, from "Grocery" to "Other Installment"
- Rule R23: The user adds a new category to the list of its type by typing it into the category list
  - Scenario S42: Typing "Pet Food" into the expense category list and pressing Enter selects "Pet Food" as a new category
  - Scenario S43: After an expense under the new category "Pet Food", the expense category list shows "Pet Food" and the income category list lacks it
- Rule R24: The app stores a category in lowercase and shows it with each word capitalized, words split by a space or a slash
  - Scenario S44: Adding an expense under "Self Care/Entertainment" stores the category "self care/entertainment"
  - Scenario S45: An expense stored under "gasoline & tolls" shows as "Gasoline & Tolls" in the expense category list
  - Scenario S46: Typing "GROCERY" as a new expense category picks the listed "Grocery", and the list shows one "Grocery"
- Rule R27: An entry stores the currency picked beside its amount, and the picker starts at the default currency
  - Scenario S52: For an account whose default currency is "USD", the currency beside the amount reads "USD" when the Add page opens
  - Scenario S53: Picking "SGD" beside the amount, then adding an expense, stores "SGD" as the expense's currency
  - Scenario S54: Adding an entry with the currency "ABC" shows "Pick a currency from the list." and stores no entry

### Feature F11: Asset and liability entries
- Rule R25: An asset or a liability added on the Add page stays with the account
  - Scenario S47: Adding the asset "Savings account" of the class "Cash", worth 12000000 and funded by "Salary", stores that asset for the account and shows "Added ✓" (happy path)
  - Scenario S48: Adding the liability "Mortgage loan", worth 300000000 with the term "Long term", stores a liability without a source of fund
  - Scenario S49: Adding an asset with a blank name shows "Please enter a name for the asset." and stores nothing
  - Scenario S55: Adding the asset "Dollar savings" with "USD" picked beside the amount stores "USD" as the asset's currency
  - Scenario S59: Adding the asset "Savings account" with the note "BCA" stores the note "BCA"
- Rule R26: A blank acquisition value falls back to the asset's last acquisition value, or to its value on a first entry
  - Scenario S50: Adding a first "Savings account" with a blank acquisition value stores its value as the acquisition value
  - Scenario S51: Adding "Savings account" again with a blank acquisition value stores the acquisition value of its last entry
- Rule R28: The acquisition value groups thousands with a dot as the user types, like the amount
  - Scenario S60: Typing 12500000 into the acquisition value shows "12.500.000"
  - Scenario S61: Adding an asset with the acquisition value "12.500.000" stores 12500000

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

### Feature F13: Summary cards
- Rule R30: The summary cards show the latest reporting month in the range
  - Scenario S67: Income of 10.000.000 and expenses of 4.000.000 in 2026/11 read "Income" 10.000.000, "Expenses" 4.000.000, "Net cash flow" 6.000.000, and "Savings rate 60%" under "Cash flow · 2026/11" (happy path)
  - Scenario S68: Expenses of 4.000.000 in 2026/11 after 5.000.000 in 2026/10 read "▼ 20.0% vs prev. month" on the expenses card
  - Scenario S69: A month without income reads "Savings rate –"
- Rule R31: Net worth sums each asset's latest value, minus each liability's latest value, up to the month
  - Scenario S70: With "Savings account" updated from 10.000.000 to 12.000.000, and "Mortgage loan" at 3.000.000, the "Net worth" card reads 9.000.000
- Rule R32: Own-funded assets leave out the assets funded by "Debt"
  - Scenario S71: With a "Cash" asset of 10.000.000 funded by "Salary" and a car of 5.000.000 funded by "Debt", the "Own-funded assets" card reads 10.000.000 and "67% of assets · debt-funded 5.000.000"
  - Scenario S72: Own-funded assets growing from 10.000.000 in 2026/10 to 12.500.000 in 2026/11 read 2.500.000 on the "Saved into assets · 2026/11" card
- Rule R33: A reporting start day past 1 moves an entry dated on or after it into the next reporting month
  - Scenario S73: With the reporting start day 25, an expense dated 2026/10/25 counts in 2026/11, and one dated 2026/10/24 in 2026/10
- Rule R34: The dashboard counts entries in the default currency, and names how many it leaves out
  - Scenario S75: With the default currency "IDR", two expenses in "USD" stay out of every total, and the dashboard reads "2 entries in other currencies are left out."

### Feature F14: Charts
- Rule R35: Income vs expense shows each reporting month's income and expenses in the range
  - Scenario S76: Entries in 2026/10 and 2026/11 give the income vs expense chart the months "2026/10" and "2026/11", each with its income and its expenses (happy path)
- Rule R36: Expenses by type stack each month's expenses by expense type, each labeled with its share of the month
  - Scenario S77: Expenses of 3.000.000 "Fixed - Essential" and 1.000.000 "Non-fixed - Essential" in 2026/11 stack as 75% and 25%
- Rule R37: Expenses by owner and top expense categories total every expense in the range
  - Scenario S78: Expenses of 2.000.000 for "Personal" and 500.000 for "Children" give the owner chart those two totals
  - Scenario S79: Expenses under ten categories give the top categories chart the eight largest, largest first
- Rule R38: Net worth growth shows each month's liabilities, equity, and net worth
  - Scenario S80: Assets of 15.000.000 and liabilities of 3.000.000 in 2026/11 give liabilities 3.000.000, equity 12.000.000, and net worth 12.000.000 for that month
- Rule R39: Asset movement by type stacks each month's asset value by class, each labeled with its share of the assets
  - Scenario S81: A "Cash" asset of 6.000.000 and a "Property" asset of 2.000.000 in 2026/11 stack as 75% and 25%
- Rule R40: The assets and liabilities table lists each asset with its latest value and its change from the update before
  - Scenario S82: "Savings account" updated from 10.000.000 to 12.000.000 reads 12.000.000 with a change of 2.000.000

### Feature F15: Dashboard range
- Rule R41: From and To narrow the dashboard to the reporting months they cover
  - Scenario S83: Setting From to 2026/11/01 leaves 2026/10 out of the charts and the cards (happy path)
  - Scenario S84: "All time" clears From and To and brings every month back
- Rule R42: The dashboard of an account without entries points to `/add`
  - Scenario S85: A new account opening `/` reads "No data yet. Add your first entry on the Add page.", and the link opens `/add`

## Area A5: Server › /healthcheck

### Feature F5: Health check
- Rule R10: The health check answers once the database answers
  - Scenario S16: `GET /healthcheck` returns status 200 with the body "OK" (happy path)
