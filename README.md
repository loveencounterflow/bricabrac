<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [bricabrac](#bricabrac)
  - [To Do](#to-do)
  - [Scratchpad](#scratchpad)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# bricabrac


compose files by including other files


## To Do

* **`[—]`** MVP:
  * **`[—]`** there is a `bricabrac-mappings.json` file with the following structure:
    * an object with a single key `mappings`
        * extensibility: in addition to `mappings`, optional other keys can be added:
          * `prefixes` is an object whose keys are custom schema names prefixed with a  `$` dollar sign and
            suffixed with a `:` colon
    * `mappings` is an object whose
      * keys are local paths relative to the project folder,
      * values are URLs that typically refer to single files.
        * extensibility:
          * instead of string values, optional objects can be used; in that case, the string value becomes
            value of entry with key `location`
          * another key `prefer` can be added; where present, first the value of `prefer` is tested, if it
            cannot be resolved, then `url` is used
    * resolution:
      * URL is resolved (e.g. using `fetch()`)
      * when

```json
{
  "mappings": {
    "src/bricabrac-capture-output.coffee": "https://raw.githubusercontent.com/loveencounterflow/bricabrac-sfmodules/refs/heads/main/src/unstable-capture-output.coffee"
  }
}
```


```json
{
  "prefixes": {
    "_gh:": "https://raw.githubusercontent.com",
    "_flow:": "_gh:/loveencounterflow/",
    "_sfmodules:": "_flow:/bricabrac-sfmodules/refs/heads/main/src"
    },
  "mappings": {
    "src/bricabrac-capture-output.coffee": "_sfmodules:unstable-capture-output.coffee"
  }
}
```

------------------------------------------------

```json
{
  "prefixes": {
    "_gh:": "https://raw.githubusercontent.com",
    "_flow:": "_gh:/loveencounterflow/",
    "_sfmodules:": "_flow:/bricabrac-sfmodules/refs/heads/main/src"
    },
  "strings": {
    "${bb20251002}": "c117f41b7723ffe6e912351ff583d3a60f110ba2"
  },
  "mappings": {
    "src/bricabrac-capture-output.coffee": "_gh:/loveencounterflow/bricabrac-sfmodules/${bb20251002}/src/unstable-capture-output.coffee"
  }
}
```

## Scratchpad

* **`[—]`** refer to git `head` of repo:
  * concrete: `https://raw.githubusercontent.com/loveencounterflow/bricabrac-sfmodules/refs/heads/main/lib/unstable-capture-output.js`
  * symbolic: `github:`

  `https://raw.githubusercontent.com/<user>/<repo>/<branch>/<path/to/file>`
            `https://esm.sh/gh/<user>/<repo>@<version>/<path>`
  `https://cdn.jsdelivr.net/gh/<user>/<repo>@<version>/<file>`


<!--   * Deno lets you define aliases, you can invent your own `gh://` scheme locally:

    ```json
    { "imports": { "gh:": "https://raw.githubusercontent.com/" } }
    ```
    Then in code: `import { serve } from "gh:denoland/deno_std/main/http/server.ts";`
 -->

* **`[—]`** it's conceivable that when mapping a specific set of lines from a source file that all other
  lines should be replaced by `\n` so linecounts are preserved
