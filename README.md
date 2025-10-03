

# Bric-A-Brac

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [Bric-A-Brac](#bric-a-brac)
  - [To Do](#to-do)
    - [Major Tasks / Outline](#major-tasks--outline)
    - [Other](#other)
    - [Treatment of Slashes](#treatment-of-slashes)
  - [Scratchpad](#scratchpad)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Bric-A-Brac


compose files by including other files


## To Do

### Major Tasks / Outline

* **`[—]`** parse CoffeeScript or JavaScript sources to find all `require()` calls with static, literal
  argument:
  * calls with one static, literal path argument can (potentially) be resolved; when the path is non-local,
    it can either be a `node:` internal (in which case note is taken that the module is not suitable for
    browser usage) or a general name that should be resolvable using the npm registry (in which case a
    dependency entry should be added to `package.json` in case it's not already there)
  * *all* other uses of `require()` (e.g. `require 'my' + 'package'` and anything more complicated) generate
    warnings

* **`[—]`** transform `bric-a-brac.json` to `_bric-a-brac.compiled.json`:
  * apply templates to get default values for cache locations &c
  * resolve all key/value pairs of `strings` recursively
  * resolve all keys of `strings` contained in mapping values (non-recursively)
  * resolve symbolic and relative paths (turn them into non-symbolic absolute paths) such as
    `file:///path/to/file`, `~/path/to/file`, `./path/to/file`, `../../path/to/file`


### Other


* **`[—]`** MVP:
  * **`[—]`** there is a `bricabrac.json` file with the following structure:
    * an object with a single key `mappings`
        * extensibility: in addition to `mappings`, optional other keys can be added:
          * `strings` is an object whose keys are string constants and whose values are replacements; values
            themselves can contain keys of `strings` that will be matched recursively, as shown below;
            circular mappings are forbidden and will cause an error
    * `mappings` is an object whose
      * keys are local paths relative to the project folder,
      * values are URLs that typically refer to single files.
        * extensibility:
          * instead of string values, optional objects can be used; in that case, the string value becomes
            value of entry with key `location`
          * another key `prefer` can be added; where present, first the value of `prefer` is tested, if it
            cannot be resolved, then `location` is used
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
  "strings": {
    "$gh$": "https://raw.githubusercontent.com",
    "%flow%:": "$gh$/loveencounterflow/",
    ":sfmodules:": "%flow%:/bricabrac-sfmodules/refs/heads/main/src"
    },
  "mappings": {
    "src/bricabrac-capture-output.coffee": ":sfmodules:unstable-capture-output.coffee"
  }
}
```

------------------------------------------------

```json
{
  "strings": {
    "::gh::": "https://raw.githubusercontent.com",
    "::bb-2025-10-02::": "c117f41b7723ffe6e912351ff583d3a60f110ba2"
    },
  "mappings": {
    "src/bricabrac-capture-output.coffee": "::gh::/loveencounterflow/bricabrac-sfmodules/::bb-2025-10-02::/src/unstable-capture-output.coffee"
  }
}
```

Note that GitHub allows to shorten commit IDs; these settings are equivalent to the ones above:

```json
{
  "strings": {
    "::gh::": "https://raw.githubusercontent.com",
    "::bb-2025-10-02::": "c117"
    },
  "mappings": {
    "src/bricabrac-capture-output.coffee": "::gh::/loveencounterflow/bricabrac-sfmodules/::bb-2025-10-02::/src/unstable-capture-output.coffee"
  }
}
```

```json
{
  "strings": {
    "::gh::": "https://raw.githubusercontent.com",
    "::bb-2025-10-02::": "c117",
    "::local::": "~/jzr/"
    },
  "mappings": {
    "src/bricabrac-capture-output.coffee":
      { "location": "::gh::/loveencounterflow/bricabrac-sfmodules/::bb-2025-10-02::/src/unstable-capture-output.coffee",
        "prefer": "::local::/bricabrac-sfmodules/src/unstable-capture-output.coffee"
      }
  }
}
```

### Treatment of Slashes

Slashes are not treated specially. In order to avoid `paths/with//reduplicated//slashes`, it is good
practice to define match keys that start and end with as many slashes as the replacement values; observe how
when when one does that, all values read naturally:

```json
{ "strings": {
  "/(user)/":     "/Alice/",
  "(schema)//":   "https://",
  "(server)/":    "(schema)//example.com/",
  "(folder)":     "(server)/(user)/data",
  "(file)":       "(folder)/file.txt"
} }
```

The expanded version of the above strings catalog has all the right slashes in the right places:

```json
{ "strings": {
  "/(user)/":     "/Alice/",
  "(schema)//":   "https://",
  "(server)/":    "https://example.com/",
  "(folder)":     "https://example.com/Alice/data",
  "(file)":       "https://example.com/Alice/data/file.txt"
} }
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
