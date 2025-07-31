(async function() {
  'use strict';
  var A_demo_dbay, A_prepare_arena, A_trash, COMMAND_PARSER, DBay, FSE, GUY, PATH, Pipeline, SFMODULES, SQL, alert, debug, echo, f, get_cfg, help, info, inspect, log, plain, praise, prepare_db, reverse, rpr, run_pipeline, urge, warn, whisper;

  //===========================================================================================================
  GUY = require('guy');

  ({alert, debug, help, info, plain, praise, urge, warn, whisper} = GUY.trm.get_loggers('bricabrac'));

  ({rpr, inspect, echo, reverse, log} = GUY.trm);

  //...........................................................................................................
  FSE = require('fs-extra');

  PATH = require('node:path');

  A_trash = (require('trash')).default;

  ({DBay, SQL} = require('dbay'));

  COMMAND_PARSER = require('./command-parser');

  ({Pipeline} = require('moonriver'));

  ({f} = require('effstring'));

  SFMODULES = require('bricabrac-single-file-modules');

  //===========================================================================================================
  get_cfg = function() {
    var R, db_cfg;
    R = {};
    R.source_path = '../../hengist-NG/assets/bricabrac/interpolation-1';
    R.target_path = R.source_path.replace('/assets/', '/arena/');
    //.........................................................................................................
    R.source_path = PATH.resolve(PATH.join(__dirname, R.source_path));
    R.target_path = PATH.resolve(PATH.join(__dirname, R.target_path));
    //.........................................................................................................
    R.main_path = PATH.join(R.target_path, 'main.md');
    //.........................................................................................................
    db_cfg = {
      path: '/dev/shm/bricabrac.db'
    };
    //.........................................................................................................
    return R;
  };

  //===========================================================================================================
  A_prepare_arena = async function() {
    var cfg, message;
    cfg = get_cfg();
    //.........................................................................................................
    whisper('Ωbrbr___1', '—————————————————————————————————————————————————————————————————————');
    urge('Ωbrbr___2', `trashing: ${cfg.target_path}`);
    message = ((await A_trash(cfg.target_path))) != null ? "done" : "nothing to do";
    help('Ωbrbr___3', `trashing: ${message}`);
    whisper('Ωbrbr___4', '—————————————————————————————————————————————————————————————————————');
    urge('Ωbrbr___5', `copying from: ${cfg.source_path}`);
    urge('Ωbrbr___6', `copying   to: ${cfg.target_path}`);
    FSE.copySync(cfg.source_path, cfg.target_path, {
      overwrite: false,
      errorOnExist: true,
      dereference: true
    });
    help('Ωbrbr___7', "copying: done");
    whisper('Ωbrbr___8', '—————————————————————————————————————————————————————————————————————');
    //.........................................................................................................
    return null;
  };

  //===========================================================================================================
  prepare_db = function() {
    var cfg, db;
    cfg = get_cfg();
    db = new DBay(cfg.db_cfg);
    //.........................................................................................................
    db(SQL`drop table if exists sources;`);
    db(SQL`drop table if exists lines;`);
    db(SQL`drop table if exists cmds;`);
    db(SQL`create table sources (
source_id               integer not null,
source_path             text    not null,
unique ( source_path ),
primary key ( source_id ) ); `);
    db(SQL`create table lines (
source_id               integer not null,
line_nr                 integer not null,
line_text               text    not null,
foreign key ( source_id ) references sources,
primary key ( source_id, line_nr ) ); `);
    db(SQL`create table cmds (
source_id               integer not null,
line_nr                 integer not null,
cmd_role                text    not null,
cmd_pattern             text    not null,
cmd_prefix              text    not null,
cmd_slash               text    not null,
cmd_name                text    not null,
cmd_disposition         text        null,
cmd_p1                  text    not null,
cmd_user_eoi            text    not null,
cmd_system_eoi          text    not null,
cmd_suffix              text    not null,
-- cmd_extent indicates count of lines to be replaced plus one (including line with openening *and* line
-- with closing cmd, if any:
-- * positive for lines below,
-- * negatives above;
-- * zero indicates no insertion / replacement / export
-- * plus one means insert between cmd line and adjacent line below, *preserving* adjacent line
-- * plus two means replace open cmd line and one plain line
cmd_extent              integer not null default 0,
foreign key ( source_id, line_nr ) references lines,
primary key ( source_id, line_nr ) ); `);
    //.........................................................................................................
    return db;
  };

  //===========================================================================================================
  A_demo_dbay = async function() {
    var cfg, db;
    await A_prepare_arena();
    cfg = get_cfg();
    db = prepare_db();
    //.........................................................................................................
    run_pipeline(db);
    //.........................................................................................................
    return null;
  };

  //===========================================================================================================
  run_pipeline = function(db) {
    var P, cfg, collector, insert_cmd, insert_line, insert_source, p, row;
    cfg = get_cfg();
    // #.........................................................................................................
    // insert_source = SQL"""
    //   insert into sources ( source_path )
    //     values ( $source_path )
    //     returning *;"""
    // #.........................................................................................................
    // insert_line = SQL"""
    //   insert into lines ( source_id, line_nr, line_text )
    //     values ( $source_id, $line_nr, $line_text );"""
    //.........................................................................................................
    // insert_cmd = SQL"""
    //   insert into cmds ( source_id, line_nr, cmd_name, cmd_p1 )
    //     values ( $source_id, $line_nr, $cmd_name, $cmd_p1 );"""
    insert_source = db.create_insert({
      into: 'sources',
      exclude: ['source_id'],
      returning: '*'
    });
    insert_line = db.create_insert({
      into: 'lines'
    });
    insert_cmd = db.create_insert({
      into: 'cmds'
    });
    //.........................................................................................................
    P = {
      //.......................................................................................................
      $db_insert_source: function() {
        return ({source_path}, send) => {
          var source_id;
          // source_id = 1
          ({source_id} = db.alt.first_row(insert_source, {source_path}));
          return send({source_id, source_path});
        };
      },
      //.......................................................................................................
      $walk_lines_with_positions: function() {
        return ({source_id, source_path}, send) => {
          var eol, line_nr, line_text, y;
          for (y of GUY.fs.walk_lines_with_positions(source_path)) {
            ({
              lnr: line_nr,
              line: line_text,
              eol
            } = y);
            send({source_id, line_nr, line_text});
          }
          return null;
        };
      },
      //.......................................................................................................
      $insert_line: function() {
        return (line, send) => {
          // debug 'Ωbrbr___9', line
          db.alt(insert_line, line);
          return send(line);
        };
      },
      //.......................................................................................................
      $parse_cmd: function() {
        return (d, send) => {
          var match;
          if ((match = COMMAND_PARSER.match_line(d.line_text)) == null) {
            return send(d);
          }
          d = {...d, ...match};
          // warn 'Ωbrbr__10', GUY.trm.red GUY.trm.reverse GUY.trm.bold d.cmd_pattern
          d.cmd_role = d.cmd_slash === '/' ? 'close' : 'open';
          if (d.cmd_disposition == null) {
            d.cmd_disposition = null;
          }
          if (d.cmd_extent == null) {
            d.cmd_extent = 0;
          }
          d.p1_name = (function() {
            switch (d.cmd_name) {
              case 'insert':
                return 'src';
              case 'replace-above':
                return 'src';
              case 'replace-below':
                return 'src';
              case 'publish':
                return 'as';
              default:
                return './.';
            }
          })();
          return send(d);
        };
      },
      //.......................................................................................................
      $insert_cmd: function() {
        return (d, send) => {
          if (d.cmd_name == null) {
            return send(d);
          }
          db.alt(insert_cmd, d);
          return send(d);
        };
      },
      //.......................................................................................................
      $show: function() {
        var C, SFMODULES_dev, bg_color, color, error, fmt_header, fmt_value, header, print_row;
        SFMODULES_dev = require('../../bricabrac-single-file-modules');
        ({
          ansi_colors_and_effects: C
        } = SFMODULES_dev.require_ansi_colors_and_effects());
        color = C.black;
        bg_color = C.bg_gainsboro;
        error = `${C.bg_pink} no match ${color}${bg_color}`;
        fmt_header = function(x) {
          return `${C.bold}${C.italic} ${x} ${C.bold0}${C.italic0}${color}${bg_color}`;
        };
        fmt_value = function(x) {
          switch (x) {
            case '':
              return '';
            case void 0:
              return `${C.red} U ${color}`;
            case null:
              return `${C.red} N ${color}`;
            default:
              // when error      then  x
              return rpr(x);
          }
        };
        print_row = function(row, {is_header}) {
          var fmt;
          fmt = is_header ? fmt_header : fmt_value;
          return echo('' + f`${color + bg_color}│` + f`${C.overline1}` + f`${fmt(row.cmd_pattern)}:<20c;│` + f`${fmt(row.cmd_role)}:<20c;│` + f`${fmt(row.cmd_prefix)}:<20c;│` + f`${fmt(row.cmd_slash)}:<11c;│` + f`${fmt(row.cmd_name)}:<15c;│` + f`${fmt(row.cmd_disposition)}:<10c;│` + f`${row.p1_name + ':'}:<10c;${fmt(row.cmd_p1)}:<40c;│` + f`${fmt(row.cmd_user_eoi)}:<10c;│` + f`${fmt(row.cmd_system_eoi)}:<10c;│` + f`${fmt(row.cmd_suffix)}:<10c;` + f`${C.overline0}│${C.default + C.bg_default}`);
        };
        header = {
          cmd_pattern: 'cmd_pattern',
          cmd_role: 'role',
          cmd_pattern: 'pattern',
          cmd_prefix: 'prefix',
          cmd_slash: 'slash',
          cmd_name: 'name',
          cmd_disposition: 'disp.',
          p1_name: 'p1_name',
          cmd_p1: 'p1',
          cmd_user_eoi: 'uEOI',
          cmd_system_eoi: 'sEOI',
          cmd_suffix: 'suffix'
        };
        print_row(header, {
          is_header: true
        });
        //.....................................................................................................
        return (d) => {
          // whisper 'Ωbrbr__11', d.source_id, d.line_nr, d.line_text

          // if ( match = d.line_text.match COMMAND_PARSER.internals.patterns.similar )?
          //   debug 'Ωbrbr__12', ( GUY.trm.white GUY.trm.reverse GUY.trm.bold d.line_text ), { match.groups..., }
          if (d.cmd_pattern != null) {
            print_row(d, {
              is_header: false
            });
          }
          // help 'Ωbrbr__13',
          //   d.cmd_role,
          //   d.cmd_pattern,
          //   d.cmd_prefix,
          //   d.cmd_slash,
          //   d.cmd_name,
          //   d.cmd_disposition,
          //   d.cmd_p1,
          //   d.cmd_user_eoi,
          //   d.cmd_system_eoi,
          //   d.cmd_suffix
          return null;
        };
      }
    };
    //.........................................................................................................
    collector = [];
    p = new Pipeline();
    p.push([
      {
        source_path: cfg.main_path
      }
    ]);
    p.push(P.$db_insert_source());
    p.push(P.$walk_lines_with_positions());
    p.push(P.$insert_line());
    p.push(P.$parse_cmd());
    p.push(P.$insert_cmd());
    p.push(P.$show());
    // p.push ( d, send ) -> collector.push d #; help collector
    p.run();
    echo('—————————————————————————————————————————————————————————————————————');
    debug('Ωbrbr__14', "sources:");
    for (row of db(SQL`select * from sources;`)) {
      urge('Ωbrbr__15', row);
    }
    debug('Ωbrbr__16', "lines:");
    for (row of db(SQL`select * from lines limit 10;`)) {
      help('Ωbrbr__17', row);
    }
    debug('Ωbrbr__18', "cmds:");
    for (row of db(SQL`select * from cmds;`)) {
      info('Ωbrbr__19', row);
    }
    //.........................................................................................................
    return null;
  };

  //===========================================================================================================
  if (module === require.main) {
    await (async() => {
      await A_demo_dbay();
      return null;
    })();
  }

}).call(this);

//# sourceMappingURL=main.js.map