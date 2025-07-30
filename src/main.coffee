
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
{ DBay,
  SQL,                  } = require 'dbay'
COMMAND_PARSER            = require './command-parser'
{ Pipeline,             } = require 'moonriver'


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
  db_cfg =
    path: '/dev/shm/bricabrac.db'
  #.........................................................................................................
  return R

#===========================================================================================================
A_prepare_arena = ->
  cfg         = get_cfg()
  #.........................................................................................................
  whisper 'Ωbrbr___1', '—————————————————————————————————————————————————————————————————————'
  urge    'Ωbrbr___2', "trashing: #{cfg.target_path}"
  message = if ( await A_trash cfg.target_path )? then "done" else "nothing to do"
  help    'Ωbrbr___3', "trashing: #{message}"
  whisper 'Ωbrbr___4', '—————————————————————————————————————————————————————————————————————'
  urge    'Ωbrbr___5', "copying from: #{cfg.source_path}"
  urge    'Ωbrbr___6', "copying   to: #{cfg.target_path}"
  FSE.copySync cfg.source_path, cfg.target_path, { overwrite: false, errorOnExist: true, dereference: true, }
  help    'Ωbrbr___7', "copying: done"
  whisper 'Ωbrbr___8', '—————————————————————————————————————————————————————————————————————'
  #.........................................................................................................
  return null

#===========================================================================================================
prepare_db = ->
  cfg = get_cfg()
  db  = new DBay cfg.db_cfg
  #.........................................................................................................
  db SQL"""drop table if exists sources;"""
  db SQL"""drop table if exists lines;"""
  db SQL"""create table sources (
    source_id               integer not null,
    source_path             text    not null,
    unique ( source_path ),
    primary key ( source_id ) ); """
  db SQL"""create table lines (
    source_id               integer not null,
    line_nr                 integer not null,
    line_text               text    not null,
    foreign key ( source_id ) references sources,
    primary key ( source_id, line_nr ) ); """
  #.........................................................................................................
  return db

#===========================================================================================================
A_demo_dbay = ->
  await         A_prepare_arena()
  cfg         = get_cfg()
  db          = prepare_db()
  #.........................................................................................................
  debug 'Ωbrbr___9', get_pipeline db
  #.........................................................................................................
  return null

#===========================================================================================================
get_pipeline = ( db ) ->
  cfg           = get_cfg()
  #.........................................................................................................
  insert_source = SQL"""
    insert into sources ( source_path )
      values ( $source_path )
      returning *;"""
  #.........................................................................................................
  insert_line = SQL"""
    insert into lines ( source_id, line_nr, line_text )
      values ( $source_id, $line_nr, $line_text );"""
  #.........................................................................................................
  P =
    #.......................................................................................................
    $db_insert_source: -> ( { source_path, }, send ) =>
      # source_id = 1
      { source_id, } = db.alt.first_row insert_source, { source_path, }
      send { source_id, source_path, }
    #.......................................................................................................
    $walk_lines_with_positions: -> ( { source_id, source_path, }, send ) =>
      for { lnr: line_nr, line: line_text, eol, } from GUY.fs.walk_lines_with_positions source_path
        send { source_id, line_nr, line_text, }
      return null
    #.......................................................................................................
    $insert_line: -> ( line, send ) =>
      debug 'Ωbrbr__13', line
      db.alt insert_line, line
      send line
    #.......................................................................................................
    $parse_command: -> ( d, send ) =>
      { pattern_name, groups, } = COMMAND_PARSER.match_line d.line_text
      if groups?
        if pattern_name is 'generic'
          null
        else
          d.dsc = groups
      # debug 'Ωbrbr__11', lnr, pattern_name, { groups.groups..., } if groups?
      send d
    #.......................................................................................................
    $show: -> ( d ) =>
      whisper 'Ωbrbr__12', d.source_id, d.line_nr, d.line_text
      if d.dsc?
        debug 'Ωbrbr__13', rpr d.dsc.slash
        startstop = if d.dsc.slash is '' then 'start' else 'stop'
        help 'Ωbrbr__14', d.dsc.prefix, startstop, d.dsc.command, d.dsc.position, d.dsc.p1, d.dsc.suffix
      return null
  #.........................................................................................................
  collector = []
  p         = new Pipeline()
  p.push [ { source_path: cfg.main_path, }, ]
  p.push P.$db_insert_source()
  p.push P.$walk_lines_with_positions()
  p.push P.$insert_line()
  p.push P.$parse_command()
  p.push P.$show()
  # p.push ( d, send ) -> collector.push d #; help collector
  p.run()
  debug 'Ωbrbr__13', row for row from db SQL"""select * from lines;"""
  #.........................................................................................................
  return collector


#===========================================================================================================
if module is require.main then await do =>
  await A_demo_dbay()
  return null

