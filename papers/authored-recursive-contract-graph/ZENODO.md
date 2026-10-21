# Publish this note on Zenodo

Zenodo does not ask for an endorser. After you publish, the DOI is the dated record.
Publishing is effectively permanent; you can upload a new version later, but v1 stays.

## 1. Make the PDF

Open `paper.html` in a browser → Print → Save as PDF.

Recommended print settings: A4 or US Letter, default margins, **background graphics** on if offered.

Save as:

`Sinha-2026-authored-recursive-contract-graph.pdf`

Skim `paper.md` first. Change anything that is not how you would say it. Then print.

## 2. Create a Zenodo account

1. Go to https://zenodo.org/signup/
2. Sign up with GitHub, ORCID, or email (`avi@sarada.io` is fine)
3. Confirm the mail if asked

ORCID is useful but not required.

## 3. New upload

https://zenodo.org/uploads/new

- Drag in the PDF
- **Upload type:** Publication → **Publication type:** Preprint (or Technical note if listed)
- **Title:** An Authored Recursive Contract Graph as the Control Plane for Coding Agents
- **Authors:** Avinash Sinha  
  Affiliation: Sarada Labs Limited  
  Email: avi@sarada.io
- **Copyright:** Copyright (C) 2026 Avinash Sinha, Sarada Labs Limited
- **Version:** 1.0
- **License:** Creative Commons Attribution 4.0 International (CC-BY-4.0)
- **Description:** paste the abstract from `paper.md` (the paragraph under Abstract)
- **Keywords:** software engineering, coding agents, software architecture, design by contract, encapsulation, large language models, contract graph
- **Related identifiers (optional):**
  - `https://github.com/sarada-io/contract-graph` — is supplemented by / is documented by, as you prefer
  - `https://www.npmjs.com/package/contract-graph`
- **Language:** English
- **Communities:** skip unless you already belong to one

Do **not** tick “Publish” until the preview looks right. Check author name spelling (Avinash Sinha).

## 4. Publish

Click **Publish**. Zenodo mints a DOI like `10.5281/zenodo.xxxxxxx`.

Put that DOI on the Contract Graph site or README only if you want to; it is not required.

## 5. Publish a new version

Use **New version** on the existing record, not a new upload, so the all-versions DOI
(`10.5281/zenodo.22301752`) keeps resolving to the latest version.

1. Print `paper.html` to PDF as in step 1.
2. On https://zenodo.org/records/22301753 click **New version**.
3. Remove the previous PDF from the draft and add the new one.
4. Update **Version**, **Publication date**, and **Description** (the abstract).
5. Publish, then commit the published PDF here.

DataCite auto-update adds the new DOI to the ORCID record.

## 6. arXiv

Leave the arXiv submission paused. You can still try it later with the same PDF if an endorser appears. Do not treat Zenodo and arXiv as a conflict.
