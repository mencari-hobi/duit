# Features

Every feature of the product, grouped by the surface a user reaches it on.

## Area A1: App

### Feature F1: Session
- Rule R1: A page behind login sends a signed-out visitor to `/login`
  - Scenario S1: Opening `/` without a session cookie redirects to `/login`
  - Scenario S2: Opening `/` with a session cookie matching no stored session redirects to `/login`
  - Scenario S3: Opening `/` with a session created more than 30 days ago redirects to `/login`
  - Scenario S19: Opening `/add`, `/assets`, `/records`, or `/report` without a session cookie redirects to `/login`
- Rule R2: The session cookie stays out of reach of page scripts and cross-site requests
  - Scenario S4: The session cookie set on login has `HttpOnly` and `SameSite=Lax`

### Feature F6: Mobile layout
- Rule R11: Every page fits the width of a 360 px phone screen
  - Scenario S17: On a 360 px wide screen, `/login` fits the screen width and shows the whole "Log in" button
  - Scenario S18: On a 360 px wide screen, `/` for a signed-in user fits the screen width and shows the whole "Log out" button (happy path)
  - Scenario S41: On a 360 px wide screen, `/add` fits the screen width and shows the whole "Add entry" button
  - Scenario S86: On a 360 px wide screen, `/` with a year of entries fits the screen width, and every chart fits its card
  - Scenario S104: On a 360 px wide screen, `/records` with entries fits the screen width
  - Scenario S120: On a 360 px wide screen, `/report` with three months of entries fits the screen width
  - Scenario S167: On a 360 px wide screen, `/assets` with an asset, a liability, and a sold asset fits the screen width

### Feature F7: Sidebar menu
- Rule R12: The sidebar menu reaches every section of the app from every signed-in page
  - Scenario S20: Each sidebar menu item opens its page: "Dashboard" opens `/`, "Add" opens `/add`, "Assets" opens `/assets`, "Records" opens `/records`, "Report" opens `/report` (happy path)
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
  - Scenario S39: With "Income" chosen, the category list shows "Salary", "Freelance", "Dividend", "Bonus", "Other", and "Sales of Asset"
  - Scenario S40: With "Expense" chosen, the category list shows the mockup's expense categories, from "Grocery" to "Other Installment"
- Rule R23: The user adds a new category to the list of its type by typing it into the category list
  - Scenario S42: Typing "Pet Food" into the expense category list and pressing Enter selects "Pet Food" as a new category
  - Scenario S43: After an expense under the new category "Pet Food", the expense category list shows "Pet Food" and the income category list lacks it
- Rule R24: The app stores a category in lowercase and shows it with each word capitalized apart from "of", words split by a space or a slash
  - Scenario S44: Adding an expense under "Self Care/Entertainment" stores the category "self care/entertainment"
  - Scenario S45: An expense stored under "gasoline & tolls" shows as "Gasoline & Tolls" in the expense category list
  - Scenario S46: Typing "GROCERY" as a new expense category picks the listed "Grocery", and the list shows one "Grocery"
  - Scenario S122: An income stored under "sales of asset" shows as "Sales of Asset" in the income category list
- Rule R27: An entry stores the currency picked beside its amount, and the picker starts at the default currency
  - Scenario S52: For an account whose default currency is "USD", the currency beside the amount reads "USD" when the Add page opens
  - Scenario S53: Picking "SGD" beside the amount, then adding an expense, stores "SGD" as the expense's currency
  - Scenario S54: Adding an entry with the currency "ABC" shows "Pick a currency from the list." and stores no entry

### Feature F20: Asset sales
- Rule R54: Adding a "Sales of Asset" income stores the proceeds and sets the sold asset to 0 from the sale date
  - Scenario S123: Selling "Car" for 150.000.000 on 2026/11/03 stores an income of 150000000 under "sales of asset", and an update of "Car" dated 2026/11/03 worth 0 with an acquisition value of 0 (happy path)
  - Scenario S124: A sale with a blank note stores the note "Sale of Car"
- Rule R55: With "Sales of Asset" chosen, the "Asset sold" list offers the assets still held
  - Scenario S125: The "Asset sold" list shows each asset whose latest value is above 0, and no liability
  - Scenario S126: For an account without a held asset, the "Asset sold" list reads "No assets recorded yet"
  - Scenario S127: Adding a sale without a chosen asset shows "Choose the asset that was sold." and stores nothing
- Rule R56: Editing or deleting a sale moves the sold asset's 0 update with it
  - Scenario S128: Choosing "Edit" on a sale of "Car" opens the Add page with "Sales of Asset" and "Car" chosen
  - Scenario S129: Saving the date 2026/11/10 on an edited sale of "Car" leaves one update of "Car" worth 0, dated 2026/11/10
  - Scenario S130: Deleting a sale of "Car" removes the 0 update of "Car", and "Car" returns to the "Asset sold" list

### Feature F11: Asset and liability entries
- Rule R25: An asset or a liability added on the Add page stays with the account
  - Scenario S47: Adding the asset "Savings account" of the class "Cash", worth 12000000 and funded by "Salary", stores that asset for the account and shows "Added ✓" (happy path)
  - Scenario S48: Adding the liability "Mortgage loan", worth 300000000 with the term "Long term", stores a liability without a source of fund
  - Scenario S49: Adding an asset with a blank name shows "Please enter a name for the asset." and stores nothing
  - Scenario S55: Adding the asset "Dollar savings" with "USD" picked beside the amount stores "USD" as the asset's currency
  - Scenario S59: Adding the asset "Savings account" with the note "BCA" stores the note "BCA"
- Rule R60: For an asset, the amount is its acquisition value, and a blank market value takes the amount
  - Scenario S140: Adding "AUD Saving" with the amount 12.999.954 and the market value 12.659.563 stores a valuation worth 12.659.563 with an acquisition value of 12.999.954
  - Scenario S141: Adding an asset with a blank market value stores the amount as its market value and as its acquisition value
  - Scenario S142: With "Asset / Liability" and "Cash" chosen, the amount reads "Acquisition value (total cost)", and the field below it reads "Market value – blank = same as cost"
- Rule R61: The Add page adds a new asset, and refuses the name of an asset the account has, ignoring case
  - Scenario S143: Adding "Savings account" while the account has "savings account" shows "That asset exists. Add a valuation on the Assets page." and stores nothing
- Rule R59: A goldbar takes its purchase value as the amount, and its value is its weight times the market price per gram
  - Scenario S137: Adding the goldbar "Antam", 2,5 grams at 1.500.000 per gram and bought for 3.000.000, stores a value of 3.750.000 and an acquisition value of 3.000.000
  - Scenario S138: Adding a goldbar without a weight shows "Please enter the weight in grams (numbers only)." and stores no asset
  - Scenario S139: Editing that goldbar's valuation fills the acquisition value 3.000.000, the weight 2,5, and the market price per gram 1.500.000
- Rule R28: The market value groups thousands with a dot as the user types, like the amount
  - Scenario S60: Typing 12500000 into the market value shows "12.500.000"
  - Scenario S61: Adding an asset with the market value "12.500.000" stores 12500000

## Area A9: App › Assets

### Feature F21: Asset list
- Rule R62: The Assets page lists each asset of the account with its latest market value, acquisition value, and gain, largest value first
  - Scenario S144: "Savings account" worth 12.659.563 against an acquisition value of 12.999.954 lists with "12.659.563", "cost 12.999.954", and "−340.391 (−2.6%)" (happy path)
  - Scenario S145: "Car" worth 150.000.000 lists above "Savings account" worth 12.659.563
  - Scenario S147: The assets of another account stay out of the list
- Rule R63: Each stored asset entry is a valuation of the asset it names
  - Scenario S148: Three stored entries named "Savings account" list as one asset, whose page shows three valuations
- Rule R64: Liabilities list under "Liabilities" with their latest balance, and sold assets under "Sold"
  - Scenario S149: "Mortgage loan" at 300.000.000 lists under "Liabilities" with 300.000.000 and without a cost
  - Scenario S150: "Car" sold on 2026/11/03 lists under "Sold" and leaves the assets section
- Rule R65: The Assets page of an account without assets points to `/add`
  - Scenario S151: A new account opening `/assets` reads "No assets yet. Add your first asset on the Add page.", and the link opens `/add`

### Feature F22: Valuations
- Rule R66: An asset's page lists its valuations newest first, each with its date, market value, acquisition value, and note
  - Scenario S152: Choosing "Savings account" on the Assets page opens its page, listing the valuations dated 2026/11/10 and 2026/10/10 in that order (happy path)
  - Scenario S153: Opening the page of another account's asset shows "Asset not found" with status 404
- Rule R67: "Add valuation" stores a dated market value of the asset, and a blank acquisition value keeps the latest one
  - Scenario S154: Adding a valuation of "Savings account" dated 2026/11/30 worth 13.100.000 stores it, and the Assets page lists it at 13.100.000
  - Scenario S155: Adding a valuation with a blank acquisition value stores 12.999.954, the acquisition value of the latest valuation
  - Scenario S157: Adding a valuation with a blank market value shows "Please enter an amount (numbers only)." and stores no valuation
  - Scenario S158: Adding a valuation of the liability "Mortgage loan" worth 290.000.000 stores it without an acquisition value
  - Scenario S159: Adding a valuation of a goldbar at 2,5 grams and 1.600.000 per gram stores a market value of 4.000.000
- Rule R68: "Edit" and "Delete" change one valuation, and the asset takes its latest remaining valuation
  - Scenario S161: Saving the market value 13.000.000 on an edited valuation stores 13000000 on the same valuation and adds no valuation
  - Scenario S162: Deleting the latest valuation of "Savings account" lists it on the Assets page at the value of the valuation before it
  - Scenario S163: Deleting the only valuation of an asset removes the asset from the Assets page
- Rule R69: A valuation from an asset sale changes with its sale on the Records page alone
  - Scenario S164: The valuation of 0 from a sale of "Car" reads "Sold", without "Edit" or "Delete"

### Feature F23: Asset details
- Rule R70: Editing an asset's name, class, source of fund, or term changes it for every valuation of the asset
  - Scenario S165: Renaming "Savings account" to "BCA savings" lists every valuation of it under "BCA savings" on the Records page (happy path)
  - Scenario S166: Renaming an asset to the name of another asset of the account, ignoring case, shows "Another asset has that name." and keeps the name

## Area A7: App › Records

### Feature F16: Records list
- Rule R43: The records list shows every entry of the account, newest first
  - Scenario S87: An expense dated 2026/11/02 and an asset dated 2026/11/05 list the asset first, each with its date as YYYY/MM/DD, its type, and its amount (happy path)
  - Scenario S88: An income under "salary" lists as "Salary", with "–" for the expense type and the owner
  - Scenario S89: An asset lists with its class, its source, and its cost, e.g. "Savings account (Cash) · funded by Salary · cost 12.000.000"
  - Scenario S90: An amount of 1250000 in "USD" lists as "1.250.000" beside "USD"
  - Scenario S91: The entries of another account stay out of the list
  - Scenario S92: The Records page reads "Nothing here yet." for an account without entries

### Feature F17: Record editing
- Rule R44: "Edit" opens an income or an expense on the Add page and an asset's valuation on its asset page, and saving replaces it
  - Scenario S94: Choosing "Edit" on an expense opens the Add page with its type, date, amount, currency, category, expense type, owner, and note filled, and the button reads "Save changes" (happy path)
  - Scenario S95: Saving the amount 75.000 on an edited expense stores 75000 on the same entry, adds no entry, and opens `/records`
  - Scenario S96: Choosing "Edit" on an asset opens that valuation for editing on the asset's page
  - Scenario S97: "Cancel edit" opens `/records` and leaves the entry unchanged
  - Scenario S98: Saving changes to an entry of another account leaves that entry unchanged

### Feature F18: Record deletion
- Rule R45: The delete action on a row removes that entry
  - Scenario S99: Deleting an expense removes it from the list and from storage (happy path)
  - Scenario S100: Deleting an entry of another account leaves that entry stored
- Rule R46: "Delete all data" removes every entry of the account after the user confirms "Delete ALL records? This cannot be undone."
  - Scenario S101: Confirming "Delete all data" removes every income, expense, and asset of the account, and the list reads "Nothing here yet."
  - Scenario S102: Cancelling the confirmation keeps every entry
  - Scenario S103: Deleting all data leaves the entries of another account stored

## Area A8: App › Report

### Feature F19: Monthly report
- Rule R47: The report compares the last three reporting months, oldest first
  - Scenario S105: Entries from 2026/08 to 2026/11 give the columns "2026/09", "2026/10", and "2026/11" (happy path)
  - Scenario S106: With the reporting start day 25, an expense dated 2026/10/25 counts in the column "2026/11"
- Rule R48: The income and expense section totals income by category, saving by asset class, and expenses by expense type and category
  - Scenario S107: Incomes of 8.000.000 under "salary" and 2.000.000 under "bonus" in 2026/11 read "Total Income" 10,00, with "Salary" 8,00 and "Bonus" 2,00 under it
  - Scenario S108: An expense of 3.000.000 under "mortgage" as "Fixed - Essential" reads "Total Expense" 3,00, with "Fixed - Essential" 3,00 and "Mortgage" 3,00 under it
  - Scenario S109: A "Cash" asset funded by "Salary" growing from 10.000.000 to 12.000.000 reads "Total Saving" 2,00, with "Cash" 2,00 under it, and an asset funded by "Debt" stays out of saving
  - Scenario S110: Income of 10.000.000, saving of 2.000.000, and expenses of 4.000.000 read "Remaining Amount (income − saving − expense)" 4,00
- Rule R58: The report keeps asset sales out of "Total Income" and shows them on a memo line
  - Scenario S133: A salary of 8.000.000 and a sale of 50.000.000 in 2026/11 read "Total Income" 8,00 and "Sales of Asset (memo, not counted as income)" 50,00
  - Scenario S134: Three reporting months without a sale leave out the memo line
- Rule R49: The asset section splits assets into liquid and non-liquid, then compares them with their acquisition value and the liabilities
  - Scenario S111: A "Cash" asset of 6.000.000 and a "Property" asset of 2.000.000 read "Liquid assets" 6,00, "Non-liquid assets" 2,00, and "Total Assets (market value)" 8,00
  - Scenario S135: A "Cash" asset of 6.000.000 and a "Goldbar" asset of 2.000.000 read "Liquid assets" 6,00, "Non-liquid assets" 2,00, and "Goldbar" 2,00
  - Scenario S112: An asset worth 12.000.000 with an acquisition value of 10.000.000 reads "Acquisition value" 10,00, "Capital gain (market − acquisition)" 2,00, and "Capital gain % of acquisition value" 20.0%
  - Scenario S113: Liabilities of 1.000.000 "Short term" and 2.000.000 "Long term" against assets of 8.000.000 read "Liabilities" 3,00, split by term, and "Net Worth (assets − liabilities)" 5,00
- Rule R50: The ratios section shows nine ratios of the month
  - Scenario S114: Income of 10.000.000, fixed expenses of 3.000.000, saving of 2.000.000, a "Cash" asset of 6.000.000, a "Property" asset of 2.000.000, and a liability of 2.000.000 read saving rate 20.0%, fixed expense ÷ income 30.0%, debt ÷ total assets 25.0%, liquidity ratio 75.0%, liquid assets ÷ net worth 100.0%, non-cash assets ÷ net worth 33.3%, and net worth ÷ total assets 75.0%
  - Scenario S115: Expenses of 3.000.000 under "mortgage" and 1.000.000 under "car installment" against income of 10.000.000 read debt service ratio 40.0% and non-mortgage service ratio 10.0%
  - Scenario S116: A month without income reads "–" for every ratio divided by income
- Rule R51: The report shows amounts in millions of the default currency with two decimals, and counts entries in that currency alone
  - Scenario S117: An amount of 12.500.000 reads "12,50", and a zero reads "–"
  - Scenario S118: With the default currency "IDR", an expense in "USD" stays out of every total
- Rule R52: The report of an account without entries reads "No data yet."
  - Scenario S119: A new account opening `/report` reads "No data yet."
- Rule R53: On a phone, a report table wider than its card fades at its right edge until scrolled to its end
  - Scenario S121: On a 360 px wide screen, the income and expense table shows the fade, and scrolling it to its end hides the fade

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
- Rule R57: The dashboard's income leaves out asset sales
  - Scenario S131: A salary of 10.000.000 and a sale of 150.000.000 in 2026/11 read "Income" 10.000.000 under "Cash flow · 2026/11" and on the income vs expense chart
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
  - Scenario S136: A "Cash" asset of 6.000.000 and a "Goldbar" asset of 2.000.000 in 2026/11 stack as 75% and 25%
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
