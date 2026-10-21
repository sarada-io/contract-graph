# Historical reader fixture

`delivery-storage.mjs` is the unchanged storage reader/writer from repository commit
`73c685e` (`1.0.0 (#11)`), path `src/scripts/delivery-storage.js`, under this
repository's Apache-2.0 licence. It has no local imports. Keep it frozen: current
storage tests import it to check v1/v2 interoperability and explicit v3 limitations.
The old decoder returns unknown versions unchanged; the old delivery validator
requires logical version 1 and therefore rejects v3. A decoder-only result is not
successful lifecycle validation. Extracted-package checks cover the CLI separately.
