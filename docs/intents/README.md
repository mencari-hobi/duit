# Intents

Every intent behind the work of the project, in the order the definitions recording them land.

## Intent I1: A visitor reaches the finance app's home page through a name and a password
- Why: The user wants a small base for a finance app whose end goals are tables and a dashboard
- Serves: A2, A3, A4

## Intent I2: Every screen of the finance app works on a phone
- Why: The user calls mobile-friendly a must for the app and for the tables and dashboard to come
- Serves: F6, R14

## Intent I3: The sidebar has the app's menu and the settings every report reads
- Why: The user's mockup of duit puts the menu and the report settings in a sidebar
- Serves: F7, F8, F9

## Intent I4: The default currency comes from a standard list of currency codes and starts as IDR
- Why: The user wants a standard source for currencies over free text, and keeps their money in rupiah
- Serves: F8

## Intent I5: Income, expense, and asset entries give the dashboard charts real data
- Why: The user chose records first, since the chart layout on a narrow phone is undecided
- Serves: F10, F11

## Intent I6: A category reads the same however it was typed
- Why: The user wants categories stored in lowercase and shown capitalized, so "Grocery" and "grocery" are one category
- Serves: R24

## Intent I7: Every date reads YYYY/MM/DD, whatever the device's locale
- Why: The user calls YYYY/MM/DD the most important date standard for the app
- Serves: F12

## Intent I8: The dashboard reads well on a phone held upright, however many months it shows
- Why: The user is unsure how to arrange the charts, and fears a wide chart squeezed onto a narrow portrait screen
- Serves: F13, F14, F15, S86

## Intent I9: The user finds, fixes, and removes their entries on the Records page
- Why: The user follows the mockup to the Records menu, after the Add page and the dashboard
- Serves: F16, F17, F18

## Intent I10: The Report page gives the monthly statement and ratios of the mockup
- Why: The user follows the mockup to its last menu, after the Records page
- Serves: F19
- Not: a "Swipe for more" text hint, since the user wants a fade that shows the table scrolls

## Intent I11: Selling an asset turns it into cash without counting the proceeds as earnings
- Why: The user wants to record a sale by picking the sold asset from the assets they still hold
- Serves: F20, R57, R58, S122

## Intent I12: The menu, page addresses, and database tables use the names of the revised mockup
- Why: The revised sidebar names the pages Dashboard, Financial Plan, Financial Diary, Financial Snapshot, and Records, and the tables should match
- Serves: R12, R60, F21, S19, S23, S85

## Intent I13: The Diary's expense form follows the spec's categories, owners, and default expense types
- Why: The Spec and Settings sheets detail the income and expense pages
- Serves: R61, R62, S40

## Intent I14: The Financial Plan sets a budget from planned income, expense, saving, and debt payment, in any timeframe
- Why: The Spec and the mockup make the Plan the budget the Snapshot checks spending against
- Serves: F22, F23, S188

## Intent I15: A wrong plan item gets fixed where the budget shows it
- Why: The user chose Edit and Delete on the View budget rows
- Serves: F24

## Intent I16: Each asset keeps one code and a history of valuations, with its gain or loss in view
- Why: The mockup and the Spec replace retyping an asset's details at each value change with a purchase and a list of updates
- Not: an "Assets" menu item outside the Financial Diary
- Serves: F11, F25, R84, S89, S96, S208, S211

## Intent I17: Liquid assets cover cash, term deposits, foreign exchanges, and mutual funds
- Why: The user counts money reachable within days as liquid
- Serves: S207

## Intent I18: A debt counts its remaining debt as a liability, falling as each installment is ticked Paid
- Why: The Spec leaves the remaining debt open, and the user chose to show unpaid installments as overdue and count the debt in net worth
- Serves: F26, F27, R31, R88, S221, S234, S235, S236

## Intent I19: A Paid tick stores an editable paid date, starting at the day of the tick
- Why: The Spec needs an editable paid date that places each payment in a report period
- Serves: R90, R113, R114, S300, S301

## Intent I20: The Spending Report compares a chosen period of the Diary with the Plan's budget
- Why: The Spec leaves "Plan vs actual" open, and the Spending Report answers it with a prorated budget, a variance, and the Plan's ratios
- Serves: F28, F29

## Intent I21: Saving matches purchases to Plan dreams through an optional link
- Why: The user chose the Spec's proposed "Linked dream" field, so each dream's saving reads against its budget
- Serves: R96, R99

## Intent I22: The Monthly report reads debt payments from the Diary Debt payment tab
- Why: The Spec moves installments out of expenses, so every debt ratio reads Debt payment, and the user wants Remaining to match the Spending Report's Free Cash Flow
- Serves: R101, R102, S110, S264

## Intent I23: A Plan dream counts in the budget only while the user saves for it
- Why: A dream counted forever, even after its months passed, so the budget read a saving the user no longer plans
- Serves: R103, R104, R105, S152, S183, S266, S271

## Intent I24: The Income categories hold earnings alone, and a sale starts from the Asset list
- Why: The mockup drops "Sales of Asset" from the Diary Income list, and the user picked a "Sell" button on each asset row
- Serves: F20, S39, S273

## Intent I25: Each Spending Report line keeps a note for the period it explains
- Why: The Spec lists an optional free-text Note on the Spending Report, and the user picked one note per line and period, saved by one button
- Serves: F30

## Intent I26: The user reads the real amount behind each bar of a month chart
- Why: The charts show millions on a rounded axis, and the user wants the real number
- Serves: R110

## Intent I27: The Monthly report's "Remaining Amount" tracks the cash the user can spend right now
- Why: The user reads the cell as spendable cash, so an unrealized move on gold misleads them, while a realized gain is income
- Serves: R111, R112

## Intent I28: The Debt payment table shows each debt's payment type and cumulative due
- Why: A row should tell a weekly debt from a monthly one and show how much has fallen due
- Serves: R115, R116
