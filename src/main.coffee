
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
demo = ->
  FSE         = require 'fs-extra'
  PATH        = require 'node:path'
  trash_async = ( require 'trash' ).default
  #.........................................................................................................
  cfg = {}
  cfg.source_path = '../../hengist-NG/assets/bricabrac/interpolation-1'
  cfg.target_path = cfg.source_path.replace '/assets/', '/arena/'
  #.........................................................................................................
  cfg.source_path = PATH.resolve PATH.join __dirname, cfg.source_path
  cfg.target_path = PATH.resolve PATH.join __dirname, cfg.target_path
  #.........................................................................................................
  whisper 'Ω___1', '—————————————————————————————————————————————————————————————————————'
  urge    'Ω___2', "trashing: #{cfg.target_path}"
  message = if ( await trash_async cfg.target_path )? then "done" else "nothing to do"
  help    'Ω___3', "trashing: #{message}"
  whisper 'Ω___4', '—————————————————————————————————————————————————————————————————————'
  urge    'Ω___5', "copying from: #{cfg.source_path}"
  urge    'Ω___6', "copying   to: #{cfg.target_path}"
  FSE.copySync cfg.source_path, cfg.target_path, { overwrite: false, errorOnExist: true, dereference: true, }
  help    'Ω___7', "copying: done"
  whisper 'Ω___8', '—————————————————————————————————————————————————————————————————————'
  return null


#===========================================================================================================
if module is require.main then await do =>
  await demo()
  return null

