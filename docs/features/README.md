# Features

Every feature of the product, grouped by the surface a user reaches it on.

## Area A1: App

### Feature F1: Session
- Rule R1: A page behind login sends a signed-out visitor to `/login`
  - Scenario S1: Opening `/` without a session cookie redirects to `/login`
  - Scenario S2: Opening `/` with a session cookie matching no stored session redirects to `/login`
  - Scenario S3: Opening `/` with a session created more than 30 days ago redirects to `/login`
  - Scenario S19: Opening `/plan`, `/diary`, `/records`, or `/snapshot` without a session cookie redirects to `/login`
- Rule R2: The session cookie stays out of reach of page scripts and cross-site requests
  - Scenario S4: The session cookie set on login has `HttpOnly` and `SameSite=Lax`

### Feature F6: Mobile layout
- Rule R11: Every page fits the width of a 360 px phone screen
  - Scenario S17: On a 360 px wide screen, `/login` fits the screen width and shows the whole "Log in" button
  - Scenario S18: On a 360 px wide screen, `/` for a signed-in user fits the screen width and shows the whole "Log out" button (happy path)
  - Scenario S41: On a 360 px wide screen, `/diary` fits the screen width and shows the whole "Add entry" button
  - Scenario S86: On a 360 px wide screen, `/` with a year of entries fits the screen width, and every chart fits its card
  - Scenario S104: On a 360 px wide screen, `/records` with entries fits the screen width
  - Scenario S120: On a 360 px wide screen, `/snapshot` on Monthly report with three months of entries fits the screen width
  - Scenario S260: On a 360 px wide screen, `/snapshot` on Spending Report with a line in each section fits the screen width
  - Scenario S188: On a 360 px wide screen, `/plan` on View budget with an item of each kind fits the screen width
  - Scenario S211: On a 360 px wide screen, `/diary` on the Asset list with an asset fits the screen width
  - Scenario S238: On a 360 px wide screen, `/diary` on Debt payment with a debt fits the screen width
  - Scenario S302: On a 360 px wide screen, `/diary` on a "Cash" purchase shows the unit field wider than its currency picker

### Feature F7: Sidebar menu
- Rule R12: The sidebar menu reaches every section of the app from every signed-in page
  - Scenario S20: Each sidebar menu item opens its page: "Dashboard" opens `/`, "Financial Plan" opens `/plan`, "Financial Diary" opens `/diary`, "Financial Snapshot" opens `/snapshot`, "Records" opens `/records` (happy path)
- Rule R13: The sidebar menu marks the page on screen
  - Scenario S21: On `/records`, the "Records" menu item has `aria-current="page"` and the other items lack it
- Rule R14: On a phone, the sidebar opens from a "Menu" button
  - Scenario S22: On a 360 px wide screen, the sidebar menu stays hidden until a tap on "Menu" shows it
  - Scenario S23: On a 360 px wide screen, choosing "Financial Diary" in the open sidebar opens `/diary` with the sidebar hidden
  - Scenario S24: On a 1280 px wide screen, the sidebar menu shows on page load, with the "Menu" button hidden
- Rule R60: The old addresses `/add` and `/report` open their renamed pages
  - Scenario S140: Opening `/add?edit=<entry id>` redirects to `/diary?edit=<entry id>`
  - Scenario S141: Opening `/report` redirects to `/snapshot`

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
  - Scenario S62: The Financial Diary page opens with today's date in the date field as YYYY/MM/DD (happy path)
  - Scenario S63: Typing 20261103 into the date field shows "2026/11/03"
  - Scenario S64: Picking the first day of the shown month in the date field's calendar shows that date as YYYY/MM/DD
  - Scenario S65: Adding an entry dated "2026/11/03" stores the date 3 November 2026
  - Scenario S66: Adding an entry dated "2026/02/30" shows "Please pick a date." and stores no entry

### Feature F21: Storage
- Rule R63: The database names its tables after the menu, and an upgrade keeps every stored row
  - Scenario S148: A new database has the tables `diary_entries`, `diary_assets`, and `plan_entries`, and lacks `entries` and `assets` (happy path)
  - Scenario S149: Opening a database with rows in `entries` and `assets` moves every row into `diary_entries` and `diary_assets`, and a sale keeps the link to its asset's 0 update
- Rule R84: An upgrade moves each asset to a spec type and gives it a code
  - Scenario S209: Opening a database with "Investments", "Goldbar", and "Property" assets moves them to "Mutual Fund", "Gold", and "Property & Land"
  - Scenario S210: Opening a database with the assets "Savings account" and "Car" codes them "AST-0001" and "AST-0002" by first date, and every update of an asset shares its code
- Rule R105: An upgrade starts each dream without a start date on the upgrade day
  - Scenario S272: Opening on 2026/11/19 a database whose dream "House" lacks a start date stores "Start saving" 2026/11/19

## Area A6: App › Financial Diary

### Feature F10: Income and expense entries
- Rule R19: An entry added on the Financial Diary page stays with the account
  - Scenario S33: Adding an expense of 50000 under "Grocery", "Non-fixed - Essential", and "Personal", with the note "Weekly shop", stores that entry for the account and shows "Added ✓" (happy path)
  - Scenario S34: Adding an income of 5200000 under "Salary" stores an income entry without an expense type or an owner
- Rule R20: The Financial Diary page refuses an entry without a date or a numeric amount
  - Scenario S35: Adding a blank amount shows "Please enter an amount (numbers only)." and stores no entry
  - Scenario S36: Adding the amount "12abc" shows "Please enter an amount (numbers only)." and stores no entry
  - Scenario S37: Adding an entry with a blank date shows "Please pick a date." and stores no entry
- Rule R21: The amount groups thousands with a dot as the user types, and a comma marks the decimals
  - Scenario S56: Typing 1250000 into the amount shows "1.250.000"
  - Scenario S57: Adding the amount "1.250.000" stores 1250000
  - Scenario S58: Adding the amount "12,5" stores 12.5
  - Scenario S303: Typing 2.5 into the unit shows "2,5", so a phone keyboard with only a dot key can type decimals
- Rule R22: The category list follows the entry type
  - Scenario S39: With "Income" chosen, the category list shows "Salary", "Freelance", "Dividend", "Bonus", and "Other"
  - Scenario S273: For an account with a stored sale, the income category list lacks "Sales of Asset"
  - Scenario S40: With "Expense" chosen, a new account's category list shows the spec's 17 expense categories, from "Grocery" to "Birthday/Anniversary/Holiday", and lacks "Mortgage", "Car Installment", "Debt Payment", and "Other Installment"
- Rule R61: An expense category fills in its default expense type from the Settings sheet, and the user can change it
  - Scenario S142: The Expense form opens with "Grocery" and "Non-fixed - Essential" chosen
  - Scenario S143: Each listed expense category fills the expense type the Settings sheet pairs with it, e.g. "School Tuition" fills "Fixed - Essential"
  - Scenario S144: Choosing the new category "Pet Food" keeps the expense type chosen before it
  - Scenario S145: Changing the filled "Non-fixed - Essential" of "Grocery" to "Fixed - Non-essential", then adding the expense, stores "Fixed - Non-essential"
  - Scenario S146: Choosing "Edit" on a "Grocery" expense stored as "Fixed - Non-essential" opens with "Fixed - Non-essential" chosen
- Rule R62: The expense owner list follows the spec
  - Scenario S147: The expense owner list shows "Personal", "Children", "Spouse", "Family", "Extended Family", "Friends", and "Other"
- Rule R23: The user adds a new category to the list of its type by typing it into the category list
  - Scenario S42: Typing "Pet Food" into the expense category list and pressing Enter selects "Pet Food" as a new category
  - Scenario S43: After an expense under the new category "Pet Food", the expense category list shows "Pet Food" and the income category list lacks it
- Rule R24: The app stores a category in lowercase and shows it with each word capitalized apart from "of", words split by a space or a slash
  - Scenario S44: Adding an expense under "Self Care/Entertainment" stores the category "self care/entertainment"
  - Scenario S45: An expense stored under "gasoline & tolls" shows as "Gasoline & Tolls" in the expense category list
  - Scenario S46: Typing "GROCERY" as a new expense category picks the listed "Grocery", and the list shows one "Grocery"
  - Scenario S122: A sale stored under "sales of asset" shows as "Sales of Asset"
- Rule R27: An entry stores the currency picked beside its amount, and the picker starts at the default currency
  - Scenario S52: For an account whose default currency is "USD", the currency beside the amount reads "USD" when the Financial Diary page opens
  - Scenario S53: Picking "SGD" beside the amount, then adding an expense, stores "SGD" as the expense's currency
  - Scenario S54: Adding an entry with the currency "ABC" shows "Pick a currency from the list." and stores no entry

### Feature F20: Asset sales
- Rule R54: Saving the "Sell" form of an asset stores the proceeds and sets the asset to 0 from the sale date
  - Scenario S123: Selling "AST-0001 · Car" for 150.000.000 on 2026/11/03 stores an income of 150000000 under "sales of asset", an update of "AST-0001" dated 2026/11/03 worth 0 with an acquisition value of 0, and shows "Sold AST-0001 ✓" (happy path)
  - Scenario S124: A sale with a blank note stores the note "Sale of Car"
  - Scenario S274: A sale with a blank amount shows "Please enter an amount (numbers only)." and stores nothing
- Rule R55: Each row of the Asset list offers "Sell", and its form names the asset
  - Scenario S275: Choosing "Sell" on "AST-0001" opens a form headed "Sell AST-0001 · Car", with today's date and the default currency
  - Scenario S276: A sale posted for an asset already sold, or for another account's asset, stores nothing
- Rule R56: Editing or deleting a sale moves the sold asset's 0 update with it
  - Scenario S128: Choosing "Edit" on a sale of "Car" in Records opens the filled "Sell" form, with a "Save changes" button
  - Scenario S129: Saving the date 2026/11/10 on an edited sale of "Car" leaves one update of "Car" worth 0, dated 2026/11/10
  - Scenario S130: Deleting a sale of "Car" removes the 0 update of "Car", and "Car" returns to the Asset list
- Rule R106: The Income form refuses the "Sales of Asset" category
  - Scenario S277: Adding an income under the typed category "Sales of Asset" shows "Sell the asset from the Asset list." and stores nothing

### Feature F11: Asset purchases
- Rule R25: A purchase saved on the Asset tab stays with the account under a new asset code
  - Scenario S47: Saving a "Gold" purchase dated 2026/11/12, funded by "Bonus", of 25 gr for 62.500.000 with the note "Antam bar" stores "AST-0001" valued at its acquisition cost 62500000, and shows "Saved AST-0001 ✓" (happy path)
  - Scenario S191: A second purchase gets "AST-0002", while another account's first purchase gets "AST-0001"
  - Scenario S49: Saving a purchase with a blank acquisition cost shows "Please enter the acquisition cost (numbers only)." and stores nothing
  - Scenario S192: Saving a purchase with a blank unit shows "Please enter the unit (numbers only)." and stores nothing
  - Scenario S55: A "Foreign Exchanges" purchase of 2.000 "USD" stores the unit 2000 in "USD", and the acquisition cost in the default currency
- Rule R77: The unit follows the asset type
  - Scenario S193: The unit reads "Unit (gr)" for "Gold", "Unit (sqm)" for "Property & Land", "Unit (lot)" for "Stock", "Unit (unit)" for "Mutual Fund" and "Other", and takes a currency for "Cash", "Term Deposit", "Foreign Exchanges", and "Bond"
  - Scenario S194: An acquisition cost of 62.500.000 for 25 gr reads "IDR 2.500.000 per gr" under "Cost / unit"
- Rule R78: The Purchase lists follow the spec
  - Scenario S195: "Asset type" lists "Cash", "Term Deposit", "Foreign Exchanges", "Mutual Fund", "Bond", "Stock", "Gold", "Property & Land", and "Other", and "Source" lists "Salary", "Freelance", "Dividend", "Bonus", "Other", and "Debt"
- Rule R79: Editing a purchase changes its asset across every update
  - Scenario S196: Choosing "Edit" on the purchase of "AST-0001" in Records opens the Purchase form filled, with a "Save changes" button
  - Scenario S197: Saving the type "Mutual Fund" on that purchase moves every update of "AST-0001" to "Mutual Fund"
  - Scenario S198: Deleting the purchase of "AST-0001" removes every update of "AST-0001"
- Rule R99: A purchase can link to a dream of the Financial Plan
  - Scenario S256: "Linked dream" lists "None" and each dream of the Plan, and saving a purchase linked to "House" stores that link
  - Scenario S257: Choosing "Edit" on that purchase in Records opens it with "House" chosen under "Linked dream"
  - Scenario S258: Deleting the dream "House" in the Plan keeps its purchases, now without a linked dream

### Feature F25: Asset list and updates
- Rule R80: The Asset list shows each held asset with its latest value and its gain or loss over cost
  - Scenario S199: "AST-0001" bought for 62.500.000 and last valued at 68.000.000 reads "AST-0001 · Antam bar", "Gold", "25 gr", "2026/11/12", "62.500.000", "68.000.000", and "+5.500.000" (happy path)
  - Scenario S200: A sold asset and a liability stay out of the Asset list
  - Scenario S201: The total row reads the summed acquisition cost, market value, and gain, with the gain's share of cost, e.g. "+5.500.000 (8.8%)"
  - Scenario S202: Filtering by "Gold" hides the other asset types
- Rule R81: "Save updates" adds a valuation for each asset whose market value is filled, dated its "Value as of"
  - Scenario S203: Saving 70.000.000 as of 2026/11/30 for "AST-0001" adds an update of "AST-0001" dated 2026/11/30 worth 70000000, and keeps its earlier updates
  - Scenario S204: A row with a blank market value adds no update
  - Scenario S205: Saving a second value for the same asset and date replaces that date's update
- Rule R82: An account without held assets reads "No assets yet. Save a purchase first."
  - Scenario S206: A new account's Asset list reads "No assets yet. Save a purchase first."

### Feature F26: Additional debt
- Rule R83: A debt saved on the Debt tab stays with the account under a new debt code
  - Scenario S48: Saving a "Car installment" debt of 150.000.000 over 36 months, paid "Monthly" from 2025/06/25 to 2028/05/25 at 5.200.000, stores "DBT-0001" and shows "Saved DBT-0001 ✓" (happy path)
  - Scenario S212: A second debt gets "DBT-0002", while another account's first debt gets "DBT-0001"
  - Scenario S213: Saving a debt with a blank debt amount shows "Please enter the debt amount (numbers only)." and stores nothing
  - Scenario S214: Saving a debt with the tenor "1.5" shows "Please enter the tenor as a whole number of months (1 or more)." and stores nothing
  - Scenario S216: Saving a debt with a blank installment amount shows "Please enter the installment amount (numbers only)." and stores nothing
  - Scenario S215: Saving a debt whose end payment is before its start payment shows "The end payment cannot be before the start payment." and stores nothing
- Rule R85: The form totals the debt with its flat interest from the installment
  - Scenario S217: The form filled as in S48 reads "IDR 187.200.000" under "Total debt & interest", "Installment × 36 payments", and "24.8%" under "Interest (flat)"
  - Scenario S218: "Weekly" over 12 months reads "Installment × 48 payments", and "Daily" over 1 month reads "Installment × 30 payments"
  - Scenario S219: The form of S48 with the end payment 2028/06/25 reads "The end payment differs from start + tenor (2028/05/25)." and the debt still saves
- Rule R86: The Additional debt lists follow the spec
  - Scenario S220: "Debt category" lists "Credit card", "Mortgage", "Car installment", "Non-collateral loan", and "Other loan", and "Payment type" lists "Daily", "Weekly", and "Monthly"
- Rule R87: Editing a debt changes it under the same code
  - Scenario S222: Choosing "Edit" on "DBT-0001" in Records opens Additional debt filled, with a "Save changes" button
  - Scenario S237: Saving the installment 5.000.000 on that debt keeps "DBT-0001", stores 5000000, and adds no debt
  - Scenario S223: Deleting "DBT-0001" in Records removes the debt and its Paid ticks

### Feature F27: Debt payment
- Rule R89: Debt payment lists each debt running in the reporting month
  - Scenario S225: With the reporting start day 25 and no Paid tick, "DBT-0001" from S48 reads "Car installment", "187.200.000", a due amount of "5.200.000", a remaining debt of "187.200.000", and "83.200.000" overdue for "2026-11 (25 Oct – 24 Nov 2026) · current" (happy path)
  - Scenario S226: A "Weekly" debt of 1.000.000 from 2026/10/25 reads a due amount of "5.000.000" for 2026-11 with the reporting start day 25
  - Scenario S227: A debt whose last payment falls before the month, and a debt whose start payment falls after it, stay out of the table
  - Scenario S228: The total row sums the debt & interest amounts, the due amounts, the remaining debts, and the overdue amounts, and reads "<n> unpaid" for the unticked rows
  - Scenario S229: "Reporting month" lists each month from the earliest start payment to the current month, newest first, and choosing an earlier month shows that month's due amounts
- Rule R90: "Save payments" stores the Paid tick of each debt for the chosen month, dated by the row's paid date
  - Scenario S230: Ticking "DBT-0001" for 2026-11 and saving stores a payment of "DBT-0001" for 2026-11 paid today, shows "Saved ✓", and keeps the box ticked
  - Scenario S231: Unticking "DBT-0001" and saving removes its payment for 2026-11
- Rule R113: The paid date of a ticked row starts at the day the box is ticked, and takes another date
  - Scenario S294: Ticking "DBT-0001" fills its paid date with today as YYYY/MM/DD
  - Scenario S295: Ticking "DBT-0001" for 2026-11, typing the paid date "2026/11/20", and saving stores a payment for 2026-11 paid on 2026/11/20, and the row reopens with "2026/11/20"
  - Scenario S296: Changing the paid date of a saved payment for 2026-11 to "2026/11/10" and saving stores 2026/11/10 as its paid date
  - Scenario S297: Unticking "DBT-0001" empties its paid date
- Rule R114: A ticked row without a valid paid date stores no payment
  - Scenario S298: Saving "DBT-0001" ticked with the paid date "2026/02/30" shows "Please pick a date." and stores no payment for 2026-11
  - Scenario S299: Saving "DBT-0001" ticked with an empty paid date shows "Please pick a date." and stores no payment for 2026-11
- Rule R108: Remaining debt is the debt & interest amount less the due amount of each month ticked Paid, up to the chosen month
  - Scenario S232: Ticking "DBT-0001" for 2026-11 lowers its remaining debt for 2026-11 from "187.200.000" to "182.000.000"
  - Scenario S283: A Paid tick for 2026-11 leaves the remaining debt for 2026-10 at "187.200.000"
- Rule R109: "Overdue" sums the due amounts of the months before the chosen month that are not ticked Paid
  - Scenario S284: With only 2026-10 ticked, "DBT-0001" from S48 reads "78.000.000" overdue for 2026-11
- Rule R115: Each row shows the debt's payment type
  - Scenario S304: "DBT-0001" from S48 reads "Monthly" under "Payment type"
- Rule R116: Cumulative due sums the installments due from the start payment through the chosen month
  - Scenario S305: With the reporting start day 25, "DBT-0001" from S48 reads a cumulative due of "88.400.000" for 2026-11 (happy path)
  - Scenario S306: Ticking "DBT-0001" Paid for 2026-11 leaves its cumulative due at "88.400.000"
  - Scenario S307: With the reporting start day 25, "DBT-0001" from S48 and the debt from S226 total a cumulative due of "93.400.000" for 2026-11
- Rule R91: An account without debts reads "No debts yet. Save an additional debt first."
  - Scenario S233: A new account's Debt payment reads "No debts yet. Save an additional debt first."

## Area A9: App › Financial Plan

### Feature F22: Plan items
- Rule R64: An item added on a Plan tab stays with the account
  - Scenario S150: Adding a "Monthly" income of 18.000.000 under "Salary" with the note "Office" stores it and shows "Added ✓" (happy path)
  - Scenario S151: Adding a "Monthly" expense of 2.500.000 under "Grocery", "Non-fixed - Essential", and "Personal" stores it
  - Scenario S152: Adding the dream "Emergency fund" of 60.000.000 in 12 months from 2026/11/25 stores it
  - Scenario S153: Adding a "Mortgage" installment of 3.000.000 from 2026/11/25 to 2031/10/25 stores it
- Rule R65: A Plan tab refuses an item missing a required field
  - Scenario S155: Adding an income with a blank amount shows "Please enter an amount (numbers only)." and stores nothing
  - Scenario S156: Adding a saving with a blank dream shows "Please name your dream." and stores nothing
  - Scenario S157: Adding a saving over 0 months shows "Please enter a whole number of months, 1 or more." and stores nothing
  - Scenario S266: Adding a saving with a blank "Start saving" shows "Please pick a date." and stores nothing
  - Scenario S158: Adding a debt payment that ends before it starts shows "The end payment can't be before the start payment." and stores nothing
- Rule R66: The Plan's lists follow the spec
  - Scenario S159: The Income categories read "Salary", "Freelance", "Dividend", "Bonus", and "Other"
  - Scenario S160: The Expense categories are the Diary's 17, from "Grocery" to "Birthday/Anniversary/Holiday"
  - Scenario S161: Choosing "School Tuition" on the Expense tab fills the expense type "Fixed - Essential"
  - Scenario S162: The Expense owners read "Personal", "Children", "Spouse", "Family", "Extended Family", "Friends", and "Other"
  - Scenario S163: The Debt payment categories read "Credit card", "Mortgage", "Car installment", "Non-collateral loan", and "Other loan"
  - Scenario S164: The Timeframe list reads "Daily", "Weekly", "Monthly", "Quarterly", and "Annually", with "Monthly" chosen
- Rule R67: The Saving tab shows the amount to save per month as the user types
  - Scenario S165: Typing 60.000.000 and 12 months reads "IDR 5.000.000 per month" under "I need to save"
- Rule R103: "Start saving" opens on today
  - Scenario S265: The Saving tab opens with today in "Start saving"

### Feature F23: View budget
- Rule R68: View budget converts each item to the chosen timeframe, with a month as 30 days, 4 weeks, 1/3 quarter, or 1/12 year
  - Scenario S166: A "Weekly" income of 500.000 reads 2.000.000 with "Monthly" chosen (happy path)
  - Scenario S167: A "Monthly" income of 18.000.000 reads 4.500.000 with "Weekly" chosen, under the header "IDR per week"
  - Scenario S168: An "Annually" income of 12.000.000 reads 1.000.000 with "Monthly" chosen
  - Scenario S169: A saving of 60.000.000 in 12 months reads 5.000.000 with "Monthly" chosen
- Rule R69: View budget lists each item as a row under "Income", "Debt payment", "Saving", or "Expense", with expenses also grouped by expense type
  - Scenario S170: Incomes of 18.000.000 under "Salary" and 2.000.000 under "Freelance" read "Income" 20.000.000 over a "Salary" row and a "Freelance" row
  - Scenario S171: Installments of 3.000.000 under "Mortgage" and 1.500.000 under "Car installment" read "Debt payment" 4.500.000
  - Scenario S172: Expenses of 650.000 under "School Tuition" and 450.000 under "Internet" as "Fixed - Essential" read "Expense" and "Fixed - Essential" 1.100.000 each, over both category rows
- Rule R70: A debt payment counts while today falls between its start and end payment
  - Scenario S173: An installment starting next month stays out of "Debt payment"
  - Scenario S174: An installment that ended last month stays out of "Debt payment"
  - Scenario S189: An installment outside its payment dates lists under "Not counted today", where "Edit" and "Delete" reach it
- Rule R104: A dream counts from its "Start saving" date until its months pass
  - Scenario S267: On 2027/11/24, a 12-month dream of 60.000.000 starting 2026/11/25 reads 5.000.000 under "Saving"
  - Scenario S268: On 2027/11/25, the same dream stays out of "Saving" and lists under "Not counted today", where "Edit" and "Delete" reach it
  - Scenario S269: A dream starting tomorrow stays out of "Saving" and lists under "Not counted today"
- Rule R71: Free Cash Flow is Income − Debt payment − Saving − Expense
  - Scenario S175: Income of 20.000.000, debt payment of 4.500.000, saving of 5.000.000, and expense of 7.100.000 read "Free Cash Flow" 3.400.000
- Rule R72: View budget shows four ratios of income
  - Scenario S176: Those figures read "Debt Service Ratio" 22.5%, "Saving Ratio" 25.0%, "Essential Expense Ratio" 21.0%, and "Free Cash Flow Ratio" 17.0%
  - Scenario S177: A plan without income reads "–" for every ratio
- Rule R73: View budget counts only the account's items in its default currency
  - Scenario S178: With the default currency "IDR", an income in "USD" stays out of every total
  - Scenario S190: An income in "USD" lists under "Not counted today", where "Edit" and "Delete" reach it
  - Scenario S154: Another account's items stay out of View budget
- Rule R74: A plan without items reads "Nothing planned yet."
  - Scenario S179: A new account's View budget reads "Nothing planned yet."

### Feature F24: Plan item editing
- Rule R75: "Edit" on a View budget row opens the item on its tab, and saving replaces it
  - Scenario S180: Choosing "Edit" on a "Salary" income opens the Income tab with every field filled and a "Save changes" button (happy path)
  - Scenario S181: Saving 19.000.000 on the edited income stores 19000000 on the same item, adds none, and opens View budget
  - Scenario S182: Choosing "Edit" on a "Grocery" expense opens the Expense tab with its expense type and owner filled
  - Scenario S183: Choosing "Edit" on the dream "Emergency fund" opens the Saving tab with its amount, months, and "Start saving" filled
  - Scenario S184: Choosing "Edit" on a "Mortgage" installment opens the Debt payment tab with its start and end payment filled
  - Scenario S185: Saving changes to another account's item leaves it unchanged
- Rule R76: "Delete" on a View budget row removes that item
  - Scenario S186: Deleting a "Salary" income removes it from View budget and from storage (happy path)
  - Scenario S187: Deleting another account's item leaves it stored

## Area A7: App › Records

### Feature F16: Records list
- Rule R43: The records list shows every entry of the account, newest first
  - Scenario S87: An expense dated 2026/11/02 and an asset dated 2026/11/05 list the asset first, each with its date as YYYY/MM/DD, its type, and its amount (happy path)
  - Scenario S88: An income under "salary" lists as "Salary", with "–" for the expense type and the owner
  - Scenario S89: An asset update lists its code, name, type, source, and cost, e.g. "AST-0001 · Antam bar (Gold) · funded by Bonus · cost 62.500.000"
  - Scenario S221: A debt lists on its start payment date as "Debt" at its debt amount, with "DBT-0001 · Car installment · 36 × 5.200.000 monthly"
  - Scenario S90: An amount of 1250000 in "USD" lists as "1.250.000" beside "USD"
  - Scenario S91: The entries of another account stay out of the list
  - Scenario S92: The Records page reads "Nothing here yet." for an account without entries

### Feature F17: Record editing
- Rule R44: "Edit" opens the entry on the Financial Diary page, and saving replaces it
  - Scenario S94: Choosing "Edit" on an expense opens the Financial Diary page with its type, date, amount, currency, category, expense type, owner, and note filled, and the button reads "Save changes" (happy path)
  - Scenario S95: Saving the amount 75.000 on an edited expense stores 75000 on the same entry, adds no entry, and opens `/records`
  - Scenario S96: Saving the acquisition cost 13.000.000 on an edited purchase stores 13000000 on the same asset and adds no asset
  - Scenario S97: "Cancel edit" opens `/records` and leaves the entry unchanged
  - Scenario S208: Choosing "Edit" on an asset update opens the Asset list of the Financial Diary
  - Scenario S98: Saving changes to an entry of another account leaves that entry unchanged
- Rule R88: A liability saved before the Debt tab lists in Records with "Delete" and without "Edit"
  - Scenario S224: An old liability "Mortgage loan" lists with a "Delete" button and no "Edit" button

### Feature F18: Record deletion
- Rule R45: The delete action on a row removes that entry
  - Scenario S99: Deleting an expense removes it from the list and from storage (happy path)
  - Scenario S100: Deleting an entry of another account leaves that entry stored
- Rule R46: "Delete all data" removes every entry of the account after the user confirms "Delete ALL records? This cannot be undone."
  - Scenario S101: Confirming "Delete all data" removes every income, expense, asset, and debt of the account, and the list reads "Nothing here yet."
  - Scenario S102: Cancelling the confirmation keeps every entry
  - Scenario S103: Deleting all data leaves the entries of another account stored

## Area A8: App › Financial Snapshot

### Feature F28: Spending Report period
- Rule R100: The Snapshot opens on "Spending Report", and "Monthly report" shows the 3-month report
  - Scenario S259: Opening `/snapshot` shows the Spending Report, and choosing "Monthly report" shows the columns of the last three reporting months
- Rule R92: The Spending Report covers the chosen period, and opens on "Last month"
  - Scenario S239: With the reporting start day 25 on 2026/11/18, the report opens on "Last month" and reads "2026/09/25 – 2026/10/24" (happy path)
  - Scenario S240: "On" 2026/11/03 covers that day alone
  - Scenario S241: "Before" 2026/11/03 covers every date up to 2026/11/02, from the earliest Diary date
  - Scenario S242: "Between" 2026/11/01 and 2026/11/10 covers both end dates
  - Scenario S243: "Last 7 days" on 2026/11/18 covers 2026/11/12 to 2026/11/18
  - Scenario S244: "Between" with the end before the start reads "The end date cannot be before the start date."
- Rule R93: The budget of a period is the Plan's monthly amount times 1 for exactly one reporting month, and times its days ÷ 30 otherwise
  - Scenario S245: A Plan salary of 10.000.000 monthly reads a budget of 10.000.000 for "Last month", and 2.333.333 for "Last 7 days"

### Feature F29: Spending Report lines
- Rule R94: Income compares the Diary income of each category with the Plan
  - Scenario S246: A Diary salary of 9.000.000 against a Plan salary of 10.000.000 reads Actual "9.000.000", Budget "10.000.000", Variance "−1.000.000", and "−10.0%" in the unfavourable tone (happy path)
  - Scenario S247: A sale of an asset in the period stays out of income
- Rule R95: Debt payment counts each installment ticked Paid with a paid date inside the period, by debt category
  - Scenario S248: "DBT-0001" ticked for 2026-11 on 2026/11/18, due 5.200.000, reads Actual 5.200.000 under "Car installment" for a period covering 2026/11/18, and 0 for a period ending 2026/11/17
  - Scenario S300: "DBT-0001" ticked for 2026-11 with the paid date "2026/10/20" reads Actual 5.200.000 under "Car installment" for a period covering 2026/10/20, and 0 for a period from 2026/10/21
  - Scenario S249: A Plan "Car installment" of 5.000.000 running through the period reads Budget 5.000.000, and the actual 5.200.000 reads "+200.000" in the unfavourable tone
- Rule R96: Saving counts the asset purchases dated inside the period, by linked dream
  - Scenario S250: A purchase of 2.000.000 linked to "House" reads Actual 2.000.000 on "House", against the dream's monthly saving as Budget
  - Scenario S251: A purchase without a linked dream reads under "Other saving" without a budget, and a later valuation of an asset adds no saving
  - Scenario S271: A dream whose months passed before the period, or that starts after it, adds no budget
- Rule R97: Expense compares the Diary expenses of each expense type and category with the Plan
  - Scenario S252: A Diary grocery of 3.000.000 "Non-fixed - Essential" against a Plan grocery of 4.000.000 reads "−1.000.000" under "Non-fixed - Essential" › "Grocery" in the favourable tone
- Rule R98: Free cash flow and the four Plan ratios compare actual with budget
  - Scenario S253: Income 10.000.000, debt payment 2.000.000, saving 1.000.000, and expense 4.000.000 read "Free Cash Flow" Actual 3.000.000
  - Scenario S254: An actual saving ratio of 10.0% against a budget of 20.0% reads "−1.000 bps"
  - Scenario S255: A period without income reads "–" for each actual ratio

### Feature F30: Spending Report notes
- Rule R107: "Save notes" stores the note of each report line for the dates the report covers
  - Scenario S278: Typing "Birthday party" as the note of "Eating Out" on "Last month", then pressing "Save notes", shows "Saved ✓", and the period reopens with the note (happy path)
  - Scenario S279: A note saved for 2026/09/25 – 2026/10/24 stays off "Last 7 days", and shows on "Between" those dates
  - Scenario S280: Clearing a saved note, then pressing "Save notes", removes it
  - Scenario S281: A note on "Other" under "Income" stays off "Other" under an expense type
  - Scenario S282: Another account's report over the same dates shows no notes

### Feature F19: Monthly report
- Rule R47: The report compares the last three reporting months, oldest first
  - Scenario S105: Entries from 2026/08 to 2026/11 give the columns "2026/09", "2026/10", and "2026/11" (happy path)
  - Scenario S106: With the reporting start day 25, an expense dated 2026/10/25 counts in the column "2026/11"
- Rule R48: The income and expense section totals income by category, saving by asset class, and expenses by expense type and category
  - Scenario S107: Incomes of 8.000.000 under "salary" and 2.000.000 under "bonus" in 2026/11 read "Total Income" 10,00, with "Salary" 8,00 and "Bonus" 2,00 under it
  - Scenario S108: An expense of 3.000.000 under "mortgage" as "Fixed - Essential" reads "Total Expense" 3,00, with "Fixed - Essential" 3,00 and "Mortgage" 3,00 under it
  - Scenario S109: A "Cash" asset funded by "Salary" growing from 10.000.000 to 12.000.000 reads "Total Saving" 2,00, with "Cash" 2,00 under it, and an asset funded by "Debt" stays out of saving
  - Scenario S110: Income of 10.000.000, debt payments of 2.000.000, saving of 2.000.000, and expenses of 4.000.000 read "Remaining Amount (income − debt payment − saving − expense)" 2,00
- Rule R111: "Total Saving" counts the change in acquisition value of each non-"Cash" asset class, so a market move on an unsold asset stays out of it and "Remaining Amount"
  - Scenario S291: A "Gold" asset funded by "Bonus", bought for 62.500.000 in 2026/10 and updated to 70.000.000 in 2026/11, reads "Total Saving" "–" in the column "2026/11" (happy path)
- Rule R112: A sale's realized gain, its proceeds minus the asset's acquisition value, counts in "Total Income" in the sale month
  - Scenario S292: A salary of 8.000.000 and the sale for 70.000.000 in 2026/11 of a "Gold" asset bought for 62.500.000 read "Total Income" 15,50, with "Realized gain on asset sales" 7,50 under it (happy path)
  - Scenario S293: Selling that asset for 55.000.000 reads "Realized gain on asset sales" −7,50 and "Total Income" 0,50
- Rule R101: The income and expense section totals the installments ticked Paid in each reporting month, by debt category
  - Scenario S261: A "Car installment" debt of 5.200.000 a month ticked Paid on 2026/11/18 reads "Total Debt payment" 5,20 in the column "2026/11", with "Car installment" 5,20 under it
  - Scenario S301: With the reporting start day 25, a Paid tick for 2026-11 with the paid date "2026/10/20" reads "Total Debt payment" 5,20 in the column "2026/10", and 0,00 in "2026/11"
  - Scenario S262: A tick for the reporting month 2026-10 saved on 2026/11/18 counts in "2026/11" and leaves "Total Debt payment" of "2026/10" at "–"
- Rule R58: The report keeps asset sales out of "Total Income" and shows them on a memo line
  - Scenario S133: A salary of 8.000.000 and a sale of 50.000.000 in 2026/11 read "Total Income" 8,00 and "Sales of Asset (memo, not counted as income)" 50,00
  - Scenario S134: Three reporting months without a sale leave out the memo line
- Rule R49: The asset section splits assets into liquid and non-liquid, then compares them with their acquisition value and the liabilities
  - Scenario S111: A "Cash" asset of 6.000.000 and a "Property & Land" asset of 2.000.000 read "Liquid assets" 6,00, "Non-liquid assets" 2,00, and "Total Assets (market value)" 8,00
  - Scenario S135: A "Cash" asset of 6.000.000 and a "Gold" asset of 2.000.000 read "Liquid assets" 6,00, "Non-liquid assets" 2,00, and "Gold" 2,00
  - Scenario S207: "Term Deposit", "Foreign Exchanges", and "Mutual Fund" assets of 1.000.000 each read "Liquid assets" 3,00
  - Scenario S112: An asset worth 12.000.000 with an acquisition value of 10.000.000 reads "Acquisition value" 10,00, "Capital gain (market − acquisition)" 2,00, and "Capital gain % of acquisition value" 20.0%
  - Scenario S113: Liabilities of 1.000.000 "Short term" and 2.000.000 "Long term" against assets of 8.000.000 read "Liabilities" 3,00, split by term, and "Net Worth (assets − liabilities)" 5,00
  - Scenario S236: A debt over 36 months adds its remaining debt after its Paid ticks to "Long term", and a debt over 12 months or less adds it to "Short term"
- Rule R50: The ratios section shows nine ratios of the month
  - Scenario S114: Income of 10.000.000, fixed expenses of 3.000.000, saving of 2.000.000, a "Cash" asset of 6.000.000, a "Property" asset of 2.000.000, and a liability of 2.000.000 read saving rate 20.0%, fixed expense ÷ income 30.0%, debt ÷ total assets 25.0%, liquidity ratio 75.0%, liquid assets ÷ net worth 100.0%, non-cash assets ÷ net worth 33.3%, and net worth ÷ total assets 75.0%
  - Scenario S116: A month without income reads "–" for every ratio divided by income
- Rule R102: The debt service ratios divide the month's debt payments by income, and old installment expenses count as plain expenses
  - Scenario S115: Paid installments of 3.000.000 on a "Mortgage" debt and 1.000.000 on a "Car installment" debt against income of 10.000.000 read "6. Debt service ratio (debt payments ÷ income)" 40.0% and "7. Non-mortgage service ratio (non-mortgage debt payments ÷ income)" 10.0%
  - Scenario S263: An expense of 3.000.000 under "mortgage" against income of 10.000.000 reads debt service ratio 0.0% and "Total Expense" 3,00
- Rule R51: The report shows amounts in millions of the default currency with two decimals, and counts entries in that currency alone
  - Scenario S117: An amount of 12.500.000 reads "12,50", and a zero reads "–"
  - Scenario S118: With the default currency "IDR", an expense in "USD" stays out of every total
  - Scenario S264: With the default currency "IDR", a paid installment of a "USD" debt stays out of "Total Debt payment"
- Rule R52: The report of an account without entries reads "No data yet."
  - Scenario S119: A new account opening `/snapshot` reads "No data yet."
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
- Rule R31: Net worth sums each asset's latest value, minus each old liability's latest value and each debt's remaining debt, up to the month
  - Scenario S70: With "Savings account" updated from 10.000.000 to 12.000.000, and "Mortgage loan" at 3.000.000, the "Net worth" card reads 9.000.000
  - Scenario S234: With the reporting start day 25 and Paid ticks for 2026-10 and 2026-11, an asset of 120.000.000 and "DBT-0001" from S48 read −56.800.000 on the "Net worth" card for 2026/11
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
  - Scenario S81: A "Cash" asset of 6.000.000 and a "Property & Land" asset of 2.000.000 in 2026/11 stack as 75% and 25%
  - Scenario S136: A "Cash" asset of 6.000.000 and a "Gold" asset of 2.000.000 in 2026/11 stack as 75% and 25%
- Rule R40: The assets and liabilities table lists each asset with its latest value and its change from the update before
  - Scenario S82: "Savings account" updated from 10.000.000 to 12.000.000 reads 12.000.000 with a change of 2.000.000
  - Scenario S235: With Paid ticks for 2026-10 and 2026-11, "DBT-0001" from S48 reads "DBT-0001 · Car installment" at 176.800.000 for 2026/11, with a change of −5.200.000 from 2026/10
- Rule R110: Hovering a month on a desktop month chart shows a tooltip with the month and the real IDR amount of each series in it
  - Scenario S285: Hovering 2026/11 on Net worth growth, with equity of 1.550.400.000 and no liabilities, shows "2026/11", "Equity 1.550.400.000", and "Net worth 1.550.400.000" (happy path)
  - Scenario S286: Hovering 2026/11 on Asset movement by type, with "Cash" of 6.000.000 at 75% of the assets, shows "Cash 6.000.000 · 75%"
  - Scenario S287: A series worth 0 in the hovered month stays out of the tooltip
  - Scenario S288: Hovering a month where every series is 0 shows no tooltip
  - Scenario S289: A net worth of −3.000.000 reads "Net worth −3.000.000" in the tooltip
  - Scenario S290: Moving the pointer off the month hides the tooltip

### Feature F15: Dashboard range
- Rule R41: From and To narrow the dashboard to the reporting months they cover
  - Scenario S83: Setting From to 2026/11/01 leaves 2026/10 out of the charts and the cards (happy path)
  - Scenario S84: "All time" clears From and To and brings every month back
- Rule R42: The dashboard of an account without entries points to `/diary`
  - Scenario S85: A new account opening `/` reads "No data yet. Add your first entry on the Financial Diary page.", and the link opens `/diary`

## Area A5: Server › /healthcheck

### Feature F5: Health check
- Rule R10: The health check answers once the database answers
  - Scenario S16: `GET /healthcheck` returns status 200 with the body "OK" (happy path)
