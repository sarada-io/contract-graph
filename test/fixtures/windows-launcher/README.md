# npm launcher fixtures

`cg.ps1` and `cg.cmd` were captured from npm 11.19.0's cmd-shim 8.0.0 for a `#!/usr/bin/env node` CLI at `node_modules/contract-graph/script/cli.js`. Tests copy these fixed files and mutate them independently of the cleanup helper. Real-package lifecycle tests also exercise npm 9.6.7's cmd-shim 6.0.1; both versions produce the accepted wrapper forms.

The recognizer intentionally accepts complete known forms, rather than a package-name substring. New/customized wrapper forms remain intact with a warning until independently measured fixtures establish their ownership. Line endings may be LF or CRLF. These fixtures are repository test data and are not shipped in the release package.
