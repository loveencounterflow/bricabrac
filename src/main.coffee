
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
#...........................................................................................................
FSE                       = require 'fs-extra'
PATH                      = require 'node:path'
A_trash                   = ( require 'trash' ).default


#===========================================================================================================
get_cfg = ->
  R = {}
  R.source_path = '../../hengist-NG/assets/bricabrac/interpolation-1'
  R.target_path = R.source_path.replace '/assets/', '/arena/'
  #.........................................................................................................
  R.source_path = PATH.resolve PATH.join __dirname, R.source_path
  R.target_path = PATH.resolve PATH.join __dirname, R.target_path
  #.........................................................................................................
  R.main_path   = PATH.join R.target_path, 'main.md'
  #.........................................................................................................
  return R

#===========================================================================================================
A_prepare_arena = ->
  cfg         = get_cfg()
  #.........................................................................................................
  whisper 'Ω___1', '—————————————————————————————————————————————————————————————————————'
  urge    'Ω___2', "trashing: #{cfg.target_path}"
  message = if ( await A_trash cfg.target_path )? then "done" else "nothing to do"
  help    'Ω___3', "trashing: #{message}"
  whisper 'Ω___4', '—————————————————————————————————————————————————————————————————————'
  urge    'Ω___5', "copying from: #{cfg.source_path}"
  urge    'Ω___6', "copying   to: #{cfg.target_path}"
  FSE.copySync cfg.source_path, cfg.target_path, { overwrite: false, errorOnExist: true, dereference: true, }
  help    'Ω___7', "copying: done"
  whisper 'Ω___8', '—————————————————————————————————————————————————————————————————————'
  #.........................................................................................................
  return null

#===========================================================================================================
A_demo = ->
  cfg         = get_cfg()
  #.........................................................................................................
  await A_prepare_arena()
  for line from GUY.fs.walk_lines cfg.main_path
    debug 'Ω___9', rpr line
  #.........................................................................................................
  return null


#===========================================================================================================
if module is require.main then await do =>
  await A_demo()
  return null

