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

  SFMODULES = require('bricabrac-sfmodules');

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
        SFMODULES_dev = require('../../bricabrac-sfmodules');
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
          return echo('' + f`${color + bg_color}│` + f`${C.overline}` + f`${fmt(row.cmd_pattern)}:<20c;│` + f`${fmt(row.cmd_role)}:<20c;│` + f`${fmt(row.cmd_prefix)}:<20c;│` + f`${fmt(row.cmd_slash)}:<11c;│` + f`${fmt(row.cmd_name)}:<15c;│` + f`${fmt(row.cmd_disposition)}:<10c;│` + f`${row.p1_name + ':'}:<10c;${fmt(row.cmd_p1)}:<40c;│` + f`${fmt(row.cmd_user_eoi)}:<10c;│` + f`${fmt(row.cmd_system_eoi)}:<10c;│` + f`${fmt(row.cmd_suffix)}:<10c;` + f`${C.overline0}│${C.default + C.bg_default}`);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL21haW4uY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBO0VBQUE7QUFBQSxNQUFBLFdBQUEsRUFBQSxlQUFBLEVBQUEsT0FBQSxFQUFBLGNBQUEsRUFBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsUUFBQSxFQUFBLFNBQUEsRUFBQSxHQUFBLEVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsT0FBQSxFQUFBLEdBQUEsRUFBQSxZQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxPQUFBOzs7RUFHQSxHQUFBLEdBQTRCLE9BQUEsQ0FBUSxLQUFSOztFQUM1QixDQUFBLENBQUUsS0FBRixFQUNFLEtBREYsRUFFRSxJQUZGLEVBR0UsSUFIRixFQUlFLEtBSkYsRUFLRSxNQUxGLEVBTUUsSUFORixFQU9FLElBUEYsRUFRRSxPQVJGLENBQUEsR0FRNEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFSLENBQW9CLFdBQXBCLENBUjVCOztFQVNBLENBQUEsQ0FBRSxHQUFGLEVBQ0UsT0FERixFQUVFLElBRkYsRUFHRSxPQUhGLEVBSUUsR0FKRixDQUFBLEdBSTRCLEdBQUcsQ0FBQyxHQUpoQyxFQWJBOzs7RUFtQkEsR0FBQSxHQUE0QixPQUFBLENBQVEsVUFBUjs7RUFDNUIsSUFBQSxHQUE0QixPQUFBLENBQVEsV0FBUjs7RUFDNUIsT0FBQSxHQUE0QixDQUFFLE9BQUEsQ0FBUSxPQUFSLENBQUYsQ0FBbUIsQ0FBQzs7RUFDaEQsQ0FBQSxDQUFFLElBQUYsRUFDRSxHQURGLENBQUEsR0FDNEIsT0FBQSxDQUFRLE1BQVIsQ0FENUI7O0VBRUEsY0FBQSxHQUE0QixPQUFBLENBQVEsa0JBQVI7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J1xuXG4jPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbkdVWSAgICAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlICdndXknXG57IGFsZXJ0XG4gIGRlYnVnXG4gIGhlbHBcbiAgaW5mb1xuICBwbGFpblxuICBwcmFpc2VcbiAgdXJnZVxuICB3YXJuXG4gIHdoaXNwZXIgfSAgICAgICAgICAgICAgID0gR1VZLnRybS5nZXRfbG9nZ2VycyAnYnJpY2FicmFjJ1xueyBycHJcbiAgaW5zcGVjdFxuICBlY2hvXG4gIHJldmVyc2VcbiAgbG9nICAgICB9ICAgICAgICAgICAgICAgPSBHVVkudHJtXG4jLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbkZTRSAgICAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlICdmcy1leHRyYSdcblBBVEggICAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlICdub2RlOnBhdGgnXG5BX3RyYXNoICAgICAgICAgICAgICAgICAgID0gKCByZXF1aXJlICd0cmFzaCcgKS5kZWZhdWx0XG57IERCYXksXG4gIFNRTCwgICAgICAgICAgICAgICAgICB9ID0gcmVxdWlyZSAnZGJheSdcbkNPTU1BTkRfUEFSU0VSICAgICAgICAgICAgPSByZXF1aXJlICcuL2NvbW1hbmQtcGFyc2VyJ1xueyBQaXBlbGluZSwgICAgICAgICAgICAgfSA9IHJlcXVpcmUgJ21vb25yaXZlcidcbnsgZiwgICAgICAgICAgICAgICAgICAgIH0gPSByZXF1aXJlICdlZmZzdHJpbmcnXG5TRk1PRFVMRVMgICAgICAgICAgICAgICAgID0gcmVxdWlyZSAnYnJpY2FicmFjLXNmbW9kdWxlcydcblxuXG4jPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbmdldF9jZmcgPSAtPlxuICBSID0ge31cbiAgUi5zb3VyY2VfcGF0aCA9ICcuLi8uLi9oZW5naXN0LU5HL2Fzc2V0cy9icmljYWJyYWMvaW50ZXJwb2xhdGlvbi0xJ1xuICBSLnRhcmdldF9wYXRoID0gUi5zb3VyY2VfcGF0aC5yZXBsYWNlICcvYXNzZXRzLycsICcvYXJlbmEvJ1xuICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gIFIuc291cmNlX3BhdGggPSBQQVRILnJlc29sdmUgUEFUSC5qb2luIF9fZGlybmFtZSwgUi5zb3VyY2VfcGF0aFxuICBSLnRhcmdldF9wYXRoID0gUEFUSC5yZXNvbHZlIFBBVEguam9pbiBfX2Rpcm5hbWUsIFIudGFyZ2V0X3BhdGhcbiAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICBSLm1haW5fcGF0aCAgID0gUEFUSC5qb2luIFIudGFyZ2V0X3BhdGgsICdtYWluLm1kJ1xuICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gIGRiX2NmZyA9XG4gICAgcGF0aDogJy9kZXYvc2htL2JyaWNhYnJhYy5kYidcbiAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICByZXR1cm4gUlxuXG4jPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbkFfcHJlcGFyZV9hcmVuYSA9IC0+XG4gIGNmZyAgICAgICAgID0gZ2V0X2NmZygpXG4gICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgd2hpc3BlciAnzqlicmJyX19fMScsICfigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJQnXG4gIHVyZ2UgICAgJ86pYnJicl9fXzInLCBcInRyYXNoaW5nOiAje2NmZy50YXJnZXRfcGF0aH1cIlxuICBtZXNzYWdlID0gaWYgKCBhd2FpdCBBX3RyYXNoIGNmZy50YXJnZXRfcGF0aCApPyB0aGVuIFwiZG9uZVwiIGVsc2UgXCJub3RoaW5nIHRvIGRvXCJcbiAgaGVscCAgICAnzqlicmJyX19fMycsIFwidHJhc2hpbmc6ICN7bWVzc2FnZX1cIlxuICB3aGlzcGVyICfOqWJyYnJfX180JywgJ+KAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlCdcbiAgdXJnZSAgICAnzqlicmJyX19fNScsIFwiY29weWluZyBmcm9tOiAje2NmZy5zb3VyY2VfcGF0aH1cIlxuICB1cmdlICAgICfOqWJyYnJfX182JywgXCJjb3B5aW5nICAgdG86ICN7Y2ZnLnRhcmdldF9wYXRofVwiXG4gIEZTRS5jb3B5U3luYyBjZmcuc291cmNlX3BhdGgsIGNmZy50YXJnZXRfcGF0aCwgeyBvdmVyd3JpdGU6IGZhbHNlLCBlcnJvck9uRXhpc3Q6IHRydWUsIGRlcmVmZXJlbmNlOiB0cnVlLCB9XG4gIGhlbHAgICAgJ86pYnJicl9fXzcnLCBcImNvcHlpbmc6IGRvbmVcIlxuICB3aGlzcGVyICfOqWJyYnJfX184JywgJ+KAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlCdcbiAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICByZXR1cm4gbnVsbFxuXG4jPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbnByZXBhcmVfZGIgPSAtPlxuICBjZmcgPSBnZXRfY2ZnKClcbiAgZGIgID0gbmV3IERCYXkgY2ZnLmRiX2NmZ1xuICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gIGRiIFNRTFwiXCJcImRyb3AgdGFibGUgaWYgZXhpc3RzIHNvdXJjZXM7XCJcIlwiXG4gIGRiIFNRTFwiXCJcImRyb3AgdGFibGUgaWYgZXhpc3RzIGxpbmVzO1wiXCJcIlxuICBkYiBTUUxcIlwiXCJkcm9wIHRhYmxlIGlmIGV4aXN0cyBjbWRzO1wiXCJcIlxuICBkYiBTUUxcIlwiXCJjcmVhdGUgdGFibGUgc291cmNlcyAoXG4gICAgc291cmNlX2lkICAgICAgICAgICAgICAgaW50ZWdlciBub3QgbnVsbCxcbiAgICBzb3VyY2VfcGF0aCAgICAgICAgICAgICB0ZXh0ICAgIG5vdCBudWxsLFxuICAgIHVuaXF1ZSAoIHNvdXJjZV9wYXRoICksXG4gICAgcHJpbWFyeSBrZXkgKCBzb3VyY2VfaWQgKSApOyBcIlwiXCJcbiAgZGIgU1FMXCJcIlwiY3JlYXRlIHRhYmxlIGxpbmVzIChcbiAgICBzb3VyY2VfaWQgICAgICAgICAgICAgICBpbnRlZ2VyIG5vdCBudWxsLFxuICAgIGxpbmVfbnIgICAgICAgICAgICAgICAgIGludGVnZXIgbm90IG51bGwsXG4gICAgbGluZV90ZXh0ICAgICAgICAgICAgICAgdGV4dCAgICBub3QgbnVsbCxcbiAgICBmb3JlaWduIGtleSAoIHNvdXJjZV9pZCApIHJlZmVyZW5jZXMgc291cmNlcyxcbiAgICBwcmltYXJ5IGtleSAoIHNvdXJjZV9pZCwgbGluZV9uciApICk7IFwiXCJcIlxuICBkYiBTUUxcIlwiXCJjcmVhdGUgdGFibGUgY21kcyAoXG4gICAgc291cmNlX2lkICAgICAgICAgICAgICAgaW50ZWdlciBub3QgbnVsbCxcbiAgICBsaW5lX25yICAgICAgICAgICAgICAgICBpbnRlZ2VyIG5vdCBudWxsLFxuICAgIGNtZF9yb2xlICAgICAgICAgICAgICAgIHRleHQgICAgbm90IG51bGwsXG4gICAgY21kX3BhdHRlcm4gICAgICAgICAgICAgdGV4dCAgICBub3QgbnVsbCxcbiAgICBjbWRfcHJlZml4ICAgICAgICAgICAgICB0ZXh0ICAgIG5vdCBudWxsLFxuICAgIGNtZF9zbGFzaCAgICAgICAgICAgICAgIHRleHQgICAgbm90IG51bGwsXG4gICAgY21kX25hbWUgICAgICAgICAgICAgICAgdGV4dCAgICBub3QgbnVsbCxcbiAgICBjbWRfZGlzcG9zaXRpb24gICAgICAgICB0ZXh0ICAgICAgICBudWxsLFxuICAgIGNtZF9wMSAgICAgICAgICAgICAgICAgIHRleHQgICAgbm90IG51bGwsXG4gICAgY21kX3VzZXJfZW9pICAgICAgICAgICAgdGV4dCAgICBub3QgbnVsbCxcbiAgICBjbWRfc3lzdGVtX2VvaSAgICAgICAgICB0ZXh0ICAgIG5vdCBudWxsLFxuICAgIGNtZF9zdWZmaXggICAgICAgICAgICAgIHRleHQgICAgbm90IG51bGwsXG4gICAgLS0gY21kX2V4dGVudCBpbmRpY2F0ZXMgY291bnQgb2YgbGluZXMgdG8gYmUgcmVwbGFjZWQgcGx1cyBvbmUgKGluY2x1ZGluZyBsaW5lIHdpdGggb3BlbmVuaW5nICphbmQqIGxpbmVcbiAgICAtLSB3aXRoIGNsb3NpbmcgY21kLCBpZiBhbnk6XG4gICAgLS0gKiBwb3NpdGl2ZSBmb3IgbGluZXMgYmVsb3csXG4gICAgLS0gKiBuZWdhdGl2ZXMgYWJvdmU7XG4gICAgLS0gKiB6ZXJvIGluZGljYXRlcyBubyBpbnNlcnRpb24gLyByZXBsYWNlbWVudCAvIGV4cG9ydFxuICAgIC0tICogcGx1cyBvbmUgbWVhbnMgaW5zZXJ0IGJldHdlZW4gY21kIGxpbmUgYW5kIGFkamFjZW50IGxpbmUgYmVsb3csICpwcmVzZXJ2aW5nKiBhZGphY2VudCBsaW5lXG4gICAgLS0gKiBwbHVzIHR3byBtZWFucyByZXBsYWNlIG9wZW4gY21kIGxpbmUgYW5kIG9uZSBwbGFpbiBsaW5lXG4gICAgY21kX2V4dGVudCAgICAgICAgICAgICAgaW50ZWdlciBub3QgbnVsbCBkZWZhdWx0IDAsXG4gICAgZm9yZWlnbiBrZXkgKCBzb3VyY2VfaWQsIGxpbmVfbnIgKSByZWZlcmVuY2VzIGxpbmVzLFxuICAgIHByaW1hcnkga2V5ICggc291cmNlX2lkLCBsaW5lX25yICkgKTsgXCJcIlwiXG4gICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgcmV0dXJuIGRiXG5cbiM9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuQV9kZW1vX2RiYXkgPSAtPlxuICBhd2FpdCAgICAgICAgIEFfcHJlcGFyZV9hcmVuYSgpXG4gIGNmZyAgICAgICAgID0gZ2V0X2NmZygpXG4gIGRiICAgICAgICAgID0gcHJlcGFyZV9kYigpXG4gICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgcnVuX3BpcGVsaW5lIGRiXG4gICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgcmV0dXJuIG51bGxcblxuIz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5ydW5fcGlwZWxpbmUgPSAoIGRiICkgLT5cbiAgY2ZnICAgICAgICAgICA9IGdldF9jZmcoKVxuICAjICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgIyBpbnNlcnRfc291cmNlID0gU1FMXCJcIlwiXG4gICMgICBpbnNlcnQgaW50byBzb3VyY2VzICggc291cmNlX3BhdGggKVxuICAjICAgICB2YWx1ZXMgKCAkc291cmNlX3BhdGggKVxuICAjICAgICByZXR1cm5pbmcgKjtcIlwiXCJcbiAgIyAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICMgaW5zZXJ0X2xpbmUgPSBTUUxcIlwiXCJcbiAgIyAgIGluc2VydCBpbnRvIGxpbmVzICggc291cmNlX2lkLCBsaW5lX25yLCBsaW5lX3RleHQgKVxuICAjICAgICB2YWx1ZXMgKCAkc291cmNlX2lkLCAkbGluZV9uciwgJGxpbmVfdGV4dCApO1wiXCJcIlxuICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICMgaW5zZXJ0X2NtZCA9IFNRTFwiXCJcIlxuICAjICAgaW5zZXJ0IGludG8gY21kcyAoIHNvdXJjZV9pZCwgbGluZV9uciwgY21kX25hbWUsIGNtZF9wMSApXG4gICMgICAgIHZhbHVlcyAoICRzb3VyY2VfaWQsICRsaW5lX25yLCAkY21kX25hbWUsICRjbWRfcDEgKTtcIlwiXCJcbiAgaW5zZXJ0X3NvdXJjZSA9IGRiLmNyZWF0ZV9pbnNlcnQgeyBpbnRvOiAnc291cmNlcycsIGV4Y2x1ZGU6IFsgJ3NvdXJjZV9pZCcsIF0sIHJldHVybmluZzogJyonLCB9XG4gIGluc2VydF9saW5lICAgPSBkYi5jcmVhdGVfaW5zZXJ0IHsgaW50bzogJ2xpbmVzJywgICB9XG4gIGluc2VydF9jbWQgICAgPSBkYi5jcmVhdGVfaW5zZXJ0IHsgaW50bzogJ2NtZHMnLCAgICB9XG4gICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgUCA9XG4gICAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAkZGJfaW5zZXJ0X3NvdXJjZTogLT4gKCB7IHNvdXJjZV9wYXRoLCB9LCBzZW5kICkgPT5cbiAgICAgICMgc291cmNlX2lkID0gMVxuICAgICAgeyBzb3VyY2VfaWQsIH0gPSBkYi5hbHQuZmlyc3Rfcm93IGluc2VydF9zb3VyY2UsIHsgc291cmNlX3BhdGgsIH1cbiAgICAgIHNlbmQgeyBzb3VyY2VfaWQsIHNvdXJjZV9wYXRoLCB9XG4gICAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAkd2Fsa19saW5lc193aXRoX3Bvc2l0aW9uczogLT4gKCB7IHNvdXJjZV9pZCwgc291cmNlX3BhdGgsIH0sIHNlbmQgKSA9PlxuICAgICAgZm9yIHsgbG5yOiBsaW5lX25yLCBsaW5lOiBsaW5lX3RleHQsIGVvbCwgfSBmcm9tIEdVWS5mcy53YWxrX2xpbmVzX3dpdGhfcG9zaXRpb25zIHNvdXJjZV9wYXRoXG4gICAgICAgIHNlbmQgeyBzb3VyY2VfaWQsIGxpbmVfbnIsIGxpbmVfdGV4dCwgfVxuICAgICAgcmV0dXJuIG51bGxcbiAgICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICRpbnNlcnRfbGluZTogLT4gKCBsaW5lLCBzZW5kICkgPT5cbiAgICAgICMgZGVidWcgJ86pYnJicl9fXzknLCBsaW5lXG4gICAgICBkYi5hbHQgaW5zZXJ0X2xpbmUsIGxpbmVcbiAgICAgIHNlbmQgbGluZVxuICAgICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgJHBhcnNlX2NtZDogLT4gKCBkLCBzZW5kICkgPT5cbiAgICAgIHJldHVybiBzZW5kIGQgdW5sZXNzICggbWF0Y2ggPSBDT01NQU5EX1BBUlNFUi5tYXRjaF9saW5lIGQubGluZV90ZXh0ICk/XG4gICAgICBkICAgICAgICAgICAgICAgICAgID0geyBkLi4uLCBtYXRjaC4uLiwgfVxuICAgICAgIyB3YXJuICfOqWJyYnJfXzEwJywgR1VZLnRybS5yZWQgR1VZLnRybS5yZXZlcnNlIEdVWS50cm0uYm9sZCBkLmNtZF9wYXR0ZXJuXG4gICAgICBkLmNtZF9yb2xlICAgICAgICAgID0gaWYgZC5jbWRfc2xhc2ggaXMgJy8nIHRoZW4gJ2Nsb3NlJyBlbHNlICdvcGVuJ1xuICAgICAgZC5jbWRfZGlzcG9zaXRpb24gID89IG51bGxcbiAgICAgIGQuY21kX2V4dGVudCAgICAgICA/PSAwXG4gICAgICBkLnAxX25hbWUgICAgICAgICAgID0gc3dpdGNoIGQuY21kX25hbWVcbiAgICAgICAgd2hlbiAnaW5zZXJ0JyAgICAgICAgIHRoZW4gICdzcmMnXG4gICAgICAgIHdoZW4gJ3JlcGxhY2UtYWJvdmUnICB0aGVuICAnc3JjJ1xuICAgICAgICB3aGVuICdyZXBsYWNlLWJlbG93JyAgdGhlbiAgJ3NyYydcbiAgICAgICAgd2hlbiAncHVibGlzaCcgICAgICAgIHRoZW4gICdhcydcbiAgICAgICAgZWxzZSAgICAgICAgICAgICAgICAgICAgICAgICcuLy4nXG4gICAgICBzZW5kIGRcbiAgICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICRpbnNlcnRfY21kOiAtPiAoIGQsIHNlbmQgKSA9PlxuICAgICAgcmV0dXJuIHNlbmQgZCB1bmxlc3MgZC5jbWRfbmFtZT9cbiAgICAgIGRiLmFsdCBpbnNlcnRfY21kLCBkXG4gICAgICBzZW5kIGRcbiAgICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICRzaG93OiAtPlxuICAgICAgU0ZNT0RVTEVTX2RldiA9IHJlcXVpcmUgJy4uLy4uL2JyaWNhYnJhYy1zZm1vZHVsZXMnXG4gICAgICB7IGFuc2lfY29sb3JzX2FuZF9lZmZlY3RzOiBDLCB9ID0gU0ZNT0RVTEVTX2Rldi5yZXF1aXJlX2Fuc2lfY29sb3JzX2FuZF9lZmZlY3RzKClcbiAgICAgIGNvbG9yICAgICAgID0gQy5ibGFja1xuICAgICAgYmdfY29sb3IgICAgPSBDLmJnX2dhaW5zYm9yb1xuICAgICAgZXJyb3IgICAgICAgPSBcIiN7Qy5iZ19waW5rfSBubyBtYXRjaCAje2NvbG9yfSN7YmdfY29sb3J9XCJcbiAgICAgIGZtdF9oZWFkZXIgID0gKCB4ICkgLT4gXCIje0MuYm9sZH0je0MuaXRhbGljfSAje3h9ICN7Qy5ib2xkMH0je0MuaXRhbGljMH0je2NvbG9yfSN7YmdfY29sb3J9XCJcbiAgICAgIGZtdF92YWx1ZSAgID0gKCB4ICkgLT5cbiAgICAgICAgc3dpdGNoIHhcbiAgICAgICAgICB3aGVuICcnICAgICAgICAgdGhlbiAgJydcbiAgICAgICAgICB3aGVuIHVuZGVmaW5lZCAgdGhlbiAgXCIje0MucmVkfSBVICN7Y29sb3J9XCJcbiAgICAgICAgICB3aGVuIG51bGwgICAgICAgdGhlbiAgXCIje0MucmVkfSBOICN7Y29sb3J9XCJcbiAgICAgICAgICAjIHdoZW4gZXJyb3IgICAgICB0aGVuICB4XG4gICAgICAgICAgZWxzZSAgICAgICAgICAgICAgICAgIHJwciB4XG4gICAgICBwcmludF9yb3cgPSAoIHJvdywgeyBpc19oZWFkZXIsIH0gKSAtPlxuICAgICAgICBmbXQgPSBpZiBpc19oZWFkZXIgdGhlbiBmbXRfaGVhZGVyIGVsc2UgZm10X3ZhbHVlXG4gICAgICAgIGVjaG8gJycgK1xuICAgICAgICAgIGZcIiN7Y29sb3IrYmdfY29sb3J94pSCXCIgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICArXG4gICAgICAgICAgZlwiI3tDLm92ZXJsaW5lfVwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICArXG4gICAgICAgICAgZlwiI3sgZm10IHJvdy5jbWRfcGF0dGVybiAgICAgICAgICAgICAgICB9OjwyMGM74pSCXCIgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICBmXCIjeyBmbXQgcm93LmNtZF9yb2xlICAgICAgICAgICAgICAgICAgIH06PDIwYzvilIJcIiAgICAgICAgICAgICAgICAgK1xuICAgICAgICAgIGZcIiN7IGZtdCByb3cuY21kX3ByZWZpeCAgICAgICAgICAgICAgICAgfTo8MjBjO+KUglwiICAgICAgICAgICAgICAgICArXG4gICAgICAgICAgZlwiI3sgZm10IHJvdy5jbWRfc2xhc2ggICAgICAgICAgICAgICAgICB9OjwxMWM74pSCXCIgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICBmXCIjeyBmbXQgcm93LmNtZF9uYW1lICAgICAgICAgICAgICAgICAgIH06PDE1YzvilIJcIiAgICAgICAgICAgICAgICAgK1xuICAgICAgICAgIGZcIiN7IGZtdCByb3cuY21kX2Rpc3Bvc2l0aW9uICAgICAgICAgICAgfTo8MTBjO+KUglwiICAgICAgICAgICAgICAgICArXG4gICAgICAgICAgZlwiI3sgcm93LnAxX25hbWUgKyAnOid9OjwxMGM7I3tmbXQgcm93LmNtZF9wMSB9Ojw0MGM74pSCXCIgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICBmXCIjeyBmbXQgcm93LmNtZF91c2VyX2VvaSAgICAgICAgICAgICAgIH06PDEwYzvilIJcIiAgICAgICAgICAgICAgICAgK1xuICAgICAgICAgIGZcIiN7IGZtdCByb3cuY21kX3N5c3RlbV9lb2kgICAgICAgICAgICAgfTo8MTBjO+KUglwiICAgICAgICAgICAgICAgICArXG4gICAgICAgICAgZlwiI3sgZm10IHJvdy5jbWRfc3VmZml4ICAgICAgICAgICAgICAgICB9OjwxMGM7XCIgICAgICAgICAgICAgICAgICArXG4gICAgICAgICAgZlwiI3sgQy5vdmVybGluZTAgICAgICAgICAgICAgICAgICAgICAgICB94pSCI3tDLmRlZmF1bHQrQy5iZ19kZWZhdWx0fVwiXG4gICAgICBoZWFkZXIgPVxuICAgICAgICBjbWRfcGF0dGVybjogJ2NtZF9wYXR0ZXJuJyxcbiAgICAgICAgY21kX3JvbGU6ICAgICAgICAgJ3JvbGUnLFxuICAgICAgICBjbWRfcGF0dGVybjogICAgICAncGF0dGVybicsXG4gICAgICAgIGNtZF9wcmVmaXg6ICAgICAgICdwcmVmaXgnLFxuICAgICAgICBjbWRfc2xhc2g6ICAgICAgICAnc2xhc2gnLFxuICAgICAgICBjbWRfbmFtZTogICAgICAgICAnbmFtZScsXG4gICAgICAgIGNtZF9kaXNwb3NpdGlvbjogICdkaXNwLicsXG4gICAgICAgIHAxX25hbWU6ICAgICAgICAgICdwMV9uYW1lJyxcbiAgICAgICAgY21kX3AxOiAgICAgICAgICAgJ3AxJyxcbiAgICAgICAgY21kX3VzZXJfZW9pOiAgICAgJ3VFT0knLFxuICAgICAgICBjbWRfc3lzdGVtX2VvaTogICAnc0VPSScsXG4gICAgICAgIGNtZF9zdWZmaXg6ICAgICAgICdzdWZmaXgnXG4gICAgICBwcmludF9yb3cgaGVhZGVyLCB7IGlzX2hlYWRlcjogdHJ1ZSwgfVxuICAgICAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgICByZXR1cm4gKCBkICkgPT5cbiAgICAgICAgIyB3aGlzcGVyICfOqWJyYnJfXzExJywgZC5zb3VyY2VfaWQsIGQubGluZV9uciwgZC5saW5lX3RleHRcblxuICAgICAgICAjIGlmICggbWF0Y2ggPSBkLmxpbmVfdGV4dC5tYXRjaCBDT01NQU5EX1BBUlNFUi5pbnRlcm5hbHMucGF0dGVybnMuc2ltaWxhciApP1xuICAgICAgICAjICAgZGVidWcgJ86pYnJicl9fMTInLCAoIEdVWS50cm0ud2hpdGUgR1VZLnRybS5yZXZlcnNlIEdVWS50cm0uYm9sZCBkLmxpbmVfdGV4dCApLCB7IG1hdGNoLmdyb3Vwcy4uLiwgfVxuICAgICAgICBpZiBkLmNtZF9wYXR0ZXJuP1xuICAgICAgICAgIHByaW50X3JvdyBkLCB7IGlzX2hlYWRlcjogZmFsc2UsIH1cbiAgICAgICAgICAjIGhlbHAgJ86pYnJicl9fMTMnLFxuICAgICAgICAgICMgICBkLmNtZF9yb2xlLFxuICAgICAgICAgICMgICBkLmNtZF9wYXR0ZXJuLFxuICAgICAgICAgICMgICBkLmNtZF9wcmVmaXgsXG4gICAgICAgICAgIyAgIGQuY21kX3NsYXNoLFxuICAgICAgICAgICMgICBkLmNtZF9uYW1lLFxuICAgICAgICAgICMgICBkLmNtZF9kaXNwb3NpdGlvbixcbiAgICAgICAgICAjICAgZC5jbWRfcDEsXG4gICAgICAgICAgIyAgIGQuY21kX3VzZXJfZW9pLFxuICAgICAgICAgICMgICBkLmNtZF9zeXN0ZW1fZW9pLFxuICAgICAgICAgICMgICBkLmNtZF9zdWZmaXhcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICBjb2xsZWN0b3IgPSBbXVxuICBwICAgICAgICAgPSBuZXcgUGlwZWxpbmUoKVxuICBwLnB1c2ggWyB7IHNvdXJjZV9wYXRoOiBjZmcubWFpbl9wYXRoLCB9LCBdXG4gIHAucHVzaCBQLiRkYl9pbnNlcnRfc291cmNlKClcbiAgcC5wdXNoIFAuJHdhbGtfbGluZXNfd2l0aF9wb3NpdGlvbnMoKVxuICBwLnB1c2ggUC4kaW5zZXJ0X2xpbmUoKVxuICBwLnB1c2ggUC4kcGFyc2VfY21kKClcbiAgcC5wdXNoIFAuJGluc2VydF9jbWQoKVxuICBwLnB1c2ggUC4kc2hvdygpXG4gICMgcC5wdXNoICggZCwgc2VuZCApIC0+IGNvbGxlY3Rvci5wdXNoIGQgIzsgaGVscCBjb2xsZWN0b3JcbiAgcC5ydW4oKVxuICBlY2hvICfigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJQnXG4gIGRlYnVnICfOqWJyYnJfXzE0JywgXCJzb3VyY2VzOlwiXG4gIHVyZ2UgJ86pYnJicl9fMTUnLCByb3cgZm9yIHJvdyBmcm9tIGRiIFNRTFwiXCJcInNlbGVjdCAqIGZyb20gc291cmNlcztcIlwiXCJcbiAgZGVidWcgJ86pYnJicl9fMTYnLCBcImxpbmVzOlwiXG4gIGhlbHAgJ86pYnJicl9fMTcnLCByb3cgZm9yIHJvdyBmcm9tIGRiIFNRTFwiXCJcInNlbGVjdCAqIGZyb20gbGluZXMgbGltaXQgMTA7XCJcIlwiXG4gIGRlYnVnICfOqWJyYnJfXzE4JywgXCJjbWRzOlwiXG4gIGluZm8gJ86pYnJicl9fMTknLCByb3cgZm9yIHJvdyBmcm9tIGRiIFNRTFwiXCJcInNlbGVjdCAqIGZyb20gY21kcztcIlwiXCJcbiAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICByZXR1cm4gbnVsbFxuXG5cbiM9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuaWYgbW9kdWxlIGlzIHJlcXVpcmUubWFpbiB0aGVuIGF3YWl0IGRvID0+XG4gIGF3YWl0IEFfZGVtb19kYmF5KClcbiAgcmV0dXJuIG51bGxcblxuIl19
