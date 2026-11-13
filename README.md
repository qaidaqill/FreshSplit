# FreshSplit

**Good food. Great potential.** FreshSplit helps housemates waste less food, avoid buying things twice, and split the grocery bill fairly. Built for HackEd Beta 2026 (environment / emissions theme).

**Live demo (sample data):** https://qaidaqill.github.io/FreshSplit/
**Try it with your own receipt (empty fridge):** https://qaidaqill.github.io/FreshSplit/try.html

## The problem

Canadian households throw away about **2.3 million tonnes** of edible food a year. That's about **6.9 million tonnes of CO₂**, and over **$1,300 per household** every year ([Love Food Hate Waste Canada](https://lovefoodhatewaste.ca/about/food-waste/)). Food gets forgotten at the back of the fridge, and shared households often buy the same thing twice.

## What FreshSplit does

- **Scan a receipt photo.** Items, prices and estimated use-by dates are added automatically. It understands store abbreviations (CHKN, CHED CHS, HOMO MILK) and skips tax, totals and non-food lines.
- **Use-it-first fridge.** Everything is sorted by expiry and colour-coded, with tips for saving food that's about to go off.
- **Freezer support.** Freeze food before it expires and its date is extended (chicken: 2 days → about 9 months).
- **Recipes that use expiring food first,** and a shopping list that adds only the ingredients you're missing.
- **Overbuying warning.** It warns you before you add something you already have.
- **Split the bill.** Choose who shares each item, and see who owes who.
- **Impact tracking.** Food rescued, money saved, and kg of CO₂ avoided.

## How it works

| Part | How |
|---|---|
| Receipt reading | [Tesseract.js](https://github.com/naptha/tesseract.js) reads the photo **inside the browser**, so receipts never leave your phone. |
| Expiry dates | A table of typical shelf lives (milk 7 days, chicken 2 days…). Users can edit every date. |
| CO₂ estimate | 6.9 Mt CO₂ ÷ 2.3 Mt food ≈ **3 kg CO₂ per kg of food** rescued. |
| Food photos | Built-in photos for common foods; others are matched to a free photo from Wikipedia (Wikimedia Commons), no API key needed. |
| Data | Saved in the browser on each device (localStorage). |
| Tech | Plain HTML, CSS and JavaScript in one file, hosted free on GitHub Pages. |

Freshness dates are estimates, not a food-safety guarantee. Always check labels and the food itself.

## What's next

- AI receipt reading through a secure server, for crumpled or faded receipts
- A shared online fridge so housemates see updates live
- Reminders before food expires

## Team

- [Name]: [role]
- [Name]: design (original FreshSplit design in Figma)
- [Name]: [role]
