# Session: Structured Data and Enhancements


## Objective
Fix real structured-data errors and implement only semantically correct, supported markup.

## Required work
- Inspect the exact GSC enhancement report behind the 13 “Missing field location” items.
- Identify schema type and affected URLs; do not assume Event until confirmed.
- Inspect current JSON-LD and visible content.
- Add only properties supported by accurate source data. Never invent stadium/venue/address.
- Use correct types for SportsEvent/Event if applicable and valid, but do not promise a rich result; check language/region eligibility.
- Validate representative pages with Rich Results Test and structured data validators.

## Acceptance criteria
No warnings/errors introduced; data matches visible content; missing fields fixed only where true values exist; validation evidence saved.
