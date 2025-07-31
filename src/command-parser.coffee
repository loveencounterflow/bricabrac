
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
      (?<cmd_prefix> .*? )
      <
      <
      <
      (?<cmd_slash> \/? )
      (?<cmd_name> insert | replace-above | replace-below )
      \x20+
      (src\s*=\s*)?(?<cmd_p1>
        (?:
          (?: ' (?: \\' | [^ ' ]  )+ ' ) |
          (?: " (?: \\" | [^ " ]  )+ " ) |
          (?: \$ [a-zA-Z0-9]+          ) # insert JS identifier pattern
          )
        )
      >
      (?<cmd_user_eoi> [^ > ]* )
      >
      (?<cmd_system_eoi> [^ > ]* )
      >
      (?<cmd_suffix> .*? )
      $ ///
    publish: /// ^
      (?<cmd_prefix> .*? )
      <
      <
      <
      (?<cmd_slash> \/? )
      (?<cmd_name> publish )
      \x20+
      ( (?<cmd_disposition>   one   | enclosed  ) \x20+ )?
      (as\s*=\s*)?(?<cmd_p1>
        (?:
          (?: ' \# (?: \\' | [^ ' ]  )+ ' ) |
          (?: " \# (?: \\" | [^ " ]  )+ " )
          )
        )
      >
      (?<cmd_user_eoi> [^ > ]* )
      >
      (?<cmd_system_eoi> [^ > ]* )
      >
      (?<cmd_suffix> .*? )
      $ ///
    similar: /// ^ (?<cmd_prefix> .*? ) <<< [^>]* >[^>]*>[^>]*> (?<cmd_suffix> .*? ) $ ///

#-----------------------------------------------------------------------------------------------------------
match_line = ( line ) ->
  unless ( typeof line ) is 'string'
    throw new Error "Ωcmdprs_1 expected a line of text, got #{rpr line}"
  for cmd_pattern, pattern of internals.patterns
    if ( match = line.match pattern )?
      groups = Object.fromEntries ( [ k, ( v ? null ), ] for k, v of match.groups )
      return { cmd_pattern, groups..., }
  return null

#===========================================================================================================
module.exports = { match_line, internals, }
