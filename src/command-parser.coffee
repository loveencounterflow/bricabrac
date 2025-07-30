
'use strict'

#===========================================================================================================
GUY                       = require 'guy'
{ alert
  debug
  help
  info
  plain
  praise
  urge
  warn
  whisper }               = GUY.trm.get_loggers 'bricabrac'
{ rpr
  inspect
  echo
  reverse
  log     }               = GUY.trm


#===========================================================================================================
internals =
  patterns:
    insert_replace: /// ^
      (?<prefix> .*? )
      <
      <
      <
      (?<slash> \/? )
      (?<cmd_name> insert | replace )
      \x20+
      ( (?<cmd_position> below | above ) \x20+ )?
      (src\s*=\s*)?(?<cmd_p1>
        (?:
          (?: ' (?: \\' | [^ ' ]  )+ ' ) |
          (?: " (?: \\" | [^ " ]  )+ " ) |
          (?: \$ [a-zA-Z0-9]+          ) # insert JS identifier pattern
          )
        )
      >
      (?<user_eoi> [^ > ]* )
      >
      (?<system_eoi> [^ > ]* )
      >
      (?<suffix> .*? )
      $ ///
    publish: /// ^
      (?<prefix> .*? )
      <
      <
      <
      (?<slash> \/? )
      (?<cmd_name> publish )
      \x20+
      ( (?<disposition>   one   | enclosed  ) \x20+ )?
      ( (?<cmd_position>  below | above     ) \x20+ )?
      (as\s*=\s*)?(?<cmd_p1>
        (?:
          (?: ' \# (?: \\' | [^ ' ]  )+ ' ) |
          (?: " \# (?: \\" | [^ " ]  )+ " )
          )
        )
      >
      (?<user_eoi> [^ > ]* )
      >
      (?<system_eoi> [^ > ]* )
      >
      (?<suffix> .*? )
      $ ///
    generic: /// ^
      (?<prefix> .*? )
      <
      <
      <
      (?<slash> \/? )
      (?<cmd_p1> .*? )
      >
      (?<user_eoi> [^ > ]* )
      >
      (?<system_eoi> [^ > ]* )
      >
      (?<suffix> .*? )
      $ ///

#-----------------------------------------------------------------------------------------------------------
match_line = ( line ) ->
  unless ( typeof line ) is 'string'
    throw new Error "Ωcmdprs_1 expected a line of text, got #{rpr line}"
  for pattern_name, pattern of internals.patterns
    if ( match = line.match pattern )?
      groups = Object.fromEntries ( [ k, ( v ? null ), ] for k, v of match.groups )
      return { pattern_name, groups, }
  return { pattern_name: null, groups: null, }

#===========================================================================================================
module.exports = { match_line, internals, }
