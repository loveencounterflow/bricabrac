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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL21haW4uY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBO0VBQUE7QUFBQSxNQUFBLFdBQUEsRUFBQSxlQUFBLEVBQUEsT0FBQSxFQUFBLGNBQUEsRUFBQSxJQUFBLEVBQUEsR0FBQSxFQUFBLEdBQUEsRUFBQSxJQUFBLEVBQUEsUUFBQSxFQUFBLFNBQUEsRUFBQSxHQUFBLEVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQSxJQUFBLEVBQUEsQ0FBQSxFQUFBLE9BQUEsRUFBQSxJQUFBLEVBQUEsSUFBQSxFQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsS0FBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUEsT0FBQSxFQUFBLEdBQUEsRUFBQSxZQUFBLEVBQUEsSUFBQSxFQUFBLElBQUEsRUFBQSxPQUFBOzs7RUFHQSxHQUFBLEdBQTRCLE9BQUEsQ0FBUSxLQUFSOztFQUM1QixDQUFBLENBQUUsS0FBRixFQUNFLEtBREYsRUFFRSxJQUZGLEVBR0UsSUFIRixFQUlFLEtBSkYsRUFLRSxNQUxGLEVBTUUsSUFORixFQU9FLElBUEYsRUFRRSxPQVJGLENBQUEsR0FRNEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxXQUFSLENBQW9CLFdBQXBCLENBUjVCOztFQVNBLENBQUEsQ0FBRSxHQUFGLEVBQ0UsT0FERixFQUVFLElBRkYsRUFHRSxPQUhGLEVBSUUsR0FKRixDQUFBLEdBSTRCLEdBQUcsQ0FBQyxHQUpoQyxFQWJBOzs7RUFtQkEsR0FBQSxHQUE0QixPQUFBLENBQVEsVUFBUjs7RUFDNUIsSUFBQSxHQUE0QixPQUFBLENBQVEsV0FBUjs7RUFDNUIsT0FBQSxHQUE0QixDQUFFLE9BQUEsQ0FBUSxPQUFSLENBQUYsQ0FBbUIsQ0FBQzs7RUFDaEQsQ0FBQSxDQUFFLElBQUYsRUFDRSxHQURGLENBQUEsR0FDNEIsT0FBQSxDQUFRLE1BQVIsQ0FENUI7O0VBRUEsY0FBQSxHQUE0QixPQUFBLENBQVEsa0JBQVI7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J1xuXG4jPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbkdVWSAgICAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlICdndXknXG57IGFsZXJ0XG4gIGRlYnVnXG4gIGhlbHBcbiAgaW5mb1xuICBwbGFpblxuICBwcmFpc2VcbiAgdXJnZVxuICB3YXJuXG4gIHdoaXNwZXIgfSAgICAgICAgICAgICAgID0gR1VZLnRybS5nZXRfbG9nZ2VycyAnYnJpY2FicmFjJ1xueyBycHJcbiAgaW5zcGVjdFxuICBlY2hvXG4gIHJldmVyc2VcbiAgbG9nICAgICB9ICAgICAgICAgICAgICAgPSBHVVkudHJtXG4jLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbkZTRSAgICAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlICdmcy1leHRyYSdcblBBVEggICAgICAgICAgICAgICAgICAgICAgPSByZXF1aXJlICdub2RlOnBhdGgnXG5BX3RyYXNoICAgICAgICAgICAgICAgICAgID0gKCByZXF1aXJlICd0cmFzaCcgKS5kZWZhdWx0XG57IERCYXksXG4gIFNRTCwgICAgICAgICAgICAgICAgICB9ID0gcmVxdWlyZSAnZGJheSdcbkNPTU1BTkRfUEFSU0VSICAgICAgICAgICAgPSByZXF1aXJlICcuL2NvbW1hbmQtcGFyc2VyJ1xueyBQaXBlbGluZSwgICAgICAgICAgICAgfSA9IHJlcXVpcmUgJ21vb25yaXZlcidcbnsgZiwgICAgICAgICAgICAgICAgICAgIH0gPSByZXF1aXJlICdlZmZzdHJpbmcnXG5TRk1PRFVMRVMgICAgICAgICAgICAgICAgID0gcmVxdWlyZSAnYnJpY2FicmFjLXNpbmdsZS1maWxlLW1vZHVsZXMnXG5cblxuIz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5nZXRfY2ZnID0gLT5cbiAgUiA9IHt9XG4gIFIuc291cmNlX3BhdGggPSAnLi4vLi4vaGVuZ2lzdC1ORy9hc3NldHMvYnJpY2FicmFjL2ludGVycG9sYXRpb24tMSdcbiAgUi50YXJnZXRfcGF0aCA9IFIuc291cmNlX3BhdGgucmVwbGFjZSAnL2Fzc2V0cy8nLCAnL2FyZW5hLydcbiAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICBSLnNvdXJjZV9wYXRoID0gUEFUSC5yZXNvbHZlIFBBVEguam9pbiBfX2Rpcm5hbWUsIFIuc291cmNlX3BhdGhcbiAgUi50YXJnZXRfcGF0aCA9IFBBVEgucmVzb2x2ZSBQQVRILmpvaW4gX19kaXJuYW1lLCBSLnRhcmdldF9wYXRoXG4gICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgUi5tYWluX3BhdGggICA9IFBBVEguam9pbiBSLnRhcmdldF9wYXRoLCAnbWFpbi5tZCdcbiAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICBkYl9jZmcgPVxuICAgIHBhdGg6ICcvZGV2L3NobS9icmljYWJyYWMuZGInXG4gICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgcmV0dXJuIFJcblxuIz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5BX3ByZXBhcmVfYXJlbmEgPSAtPlxuICBjZmcgICAgICAgICA9IGdldF9jZmcoKVxuICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gIHdoaXNwZXIgJ86pYnJicl9fXzEnLCAn4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCU4oCUJ1xuICB1cmdlICAgICfOqWJyYnJfX18yJywgXCJ0cmFzaGluZzogI3tjZmcudGFyZ2V0X3BhdGh9XCJcbiAgbWVzc2FnZSA9IGlmICggYXdhaXQgQV90cmFzaCBjZmcudGFyZ2V0X3BhdGggKT8gdGhlbiBcImRvbmVcIiBlbHNlIFwibm90aGluZyB0byBkb1wiXG4gIGhlbHAgICAgJ86pYnJicl9fXzMnLCBcInRyYXNoaW5nOiAje21lc3NhZ2V9XCJcbiAgd2hpc3BlciAnzqlicmJyX19fNCcsICfigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJQnXG4gIHVyZ2UgICAgJ86pYnJicl9fXzUnLCBcImNvcHlpbmcgZnJvbTogI3tjZmcuc291cmNlX3BhdGh9XCJcbiAgdXJnZSAgICAnzqlicmJyX19fNicsIFwiY29weWluZyAgIHRvOiAje2NmZy50YXJnZXRfcGF0aH1cIlxuICBGU0UuY29weVN5bmMgY2ZnLnNvdXJjZV9wYXRoLCBjZmcudGFyZ2V0X3BhdGgsIHsgb3ZlcndyaXRlOiBmYWxzZSwgZXJyb3JPbkV4aXN0OiB0cnVlLCBkZXJlZmVyZW5jZTogdHJ1ZSwgfVxuICBoZWxwICAgICfOqWJyYnJfX183JywgXCJjb3B5aW5nOiBkb25lXCJcbiAgd2hpc3BlciAnzqlicmJyX19fOCcsICfigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJTigJQnXG4gICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgcmV0dXJuIG51bGxcblxuIz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5wcmVwYXJlX2RiID0gLT5cbiAgY2ZnID0gZ2V0X2NmZygpXG4gIGRiICA9IG5ldyBEQmF5IGNmZy5kYl9jZmdcbiAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICBkYiBTUUxcIlwiXCJkcm9wIHRhYmxlIGlmIGV4aXN0cyBzb3VyY2VzO1wiXCJcIlxuICBkYiBTUUxcIlwiXCJkcm9wIHRhYmxlIGlmIGV4aXN0cyBsaW5lcztcIlwiXCJcbiAgZGIgU1FMXCJcIlwiZHJvcCB0YWJsZSBpZiBleGlzdHMgY21kcztcIlwiXCJcbiAgZGIgU1FMXCJcIlwiY3JlYXRlIHRhYmxlIHNvdXJjZXMgKFxuICAgIHNvdXJjZV9pZCAgICAgICAgICAgICAgIGludGVnZXIgbm90IG51bGwsXG4gICAgc291cmNlX3BhdGggICAgICAgICAgICAgdGV4dCAgICBub3QgbnVsbCxcbiAgICB1bmlxdWUgKCBzb3VyY2VfcGF0aCApLFxuICAgIHByaW1hcnkga2V5ICggc291cmNlX2lkICkgKTsgXCJcIlwiXG4gIGRiIFNRTFwiXCJcImNyZWF0ZSB0YWJsZSBsaW5lcyAoXG4gICAgc291cmNlX2lkICAgICAgICAgICAgICAgaW50ZWdlciBub3QgbnVsbCxcbiAgICBsaW5lX25yICAgICAgICAgICAgICAgICBpbnRlZ2VyIG5vdCBudWxsLFxuICAgIGxpbmVfdGV4dCAgICAgICAgICAgICAgIHRleHQgICAgbm90IG51bGwsXG4gICAgZm9yZWlnbiBrZXkgKCBzb3VyY2VfaWQgKSByZWZlcmVuY2VzIHNvdXJjZXMsXG4gICAgcHJpbWFyeSBrZXkgKCBzb3VyY2VfaWQsIGxpbmVfbnIgKSApOyBcIlwiXCJcbiAgZGIgU1FMXCJcIlwiY3JlYXRlIHRhYmxlIGNtZHMgKFxuICAgIHNvdXJjZV9pZCAgICAgICAgICAgICAgIGludGVnZXIgbm90IG51bGwsXG4gICAgbGluZV9uciAgICAgICAgICAgICAgICAgaW50ZWdlciBub3QgbnVsbCxcbiAgICBjbWRfcm9sZSAgICAgICAgICAgICAgICB0ZXh0ICAgIG5vdCBudWxsLFxuICAgIGNtZF9wYXR0ZXJuICAgICAgICAgICAgIHRleHQgICAgbm90IG51bGwsXG4gICAgY21kX3ByZWZpeCAgICAgICAgICAgICAgdGV4dCAgICBub3QgbnVsbCxcbiAgICBjbWRfc2xhc2ggICAgICAgICAgICAgICB0ZXh0ICAgIG5vdCBudWxsLFxuICAgIGNtZF9uYW1lICAgICAgICAgICAgICAgIHRleHQgICAgbm90IG51bGwsXG4gICAgY21kX2Rpc3Bvc2l0aW9uICAgICAgICAgdGV4dCAgICAgICAgbnVsbCxcbiAgICBjbWRfcDEgICAgICAgICAgICAgICAgICB0ZXh0ICAgIG5vdCBudWxsLFxuICAgIGNtZF91c2VyX2VvaSAgICAgICAgICAgIHRleHQgICAgbm90IG51bGwsXG4gICAgY21kX3N5c3RlbV9lb2kgICAgICAgICAgdGV4dCAgICBub3QgbnVsbCxcbiAgICBjbWRfc3VmZml4ICAgICAgICAgICAgICB0ZXh0ICAgIG5vdCBudWxsLFxuICAgIC0tIGNtZF9leHRlbnQgaW5kaWNhdGVzIGNvdW50IG9mIGxpbmVzIHRvIGJlIHJlcGxhY2VkIHBsdXMgb25lIChpbmNsdWRpbmcgbGluZSB3aXRoIG9wZW5lbmluZyAqYW5kKiBsaW5lXG4gICAgLS0gd2l0aCBjbG9zaW5nIGNtZCwgaWYgYW55OlxuICAgIC0tICogcG9zaXRpdmUgZm9yIGxpbmVzIGJlbG93LFxuICAgIC0tICogbmVnYXRpdmVzIGFib3ZlO1xuICAgIC0tICogemVybyBpbmRpY2F0ZXMgbm8gaW5zZXJ0aW9uIC8gcmVwbGFjZW1lbnQgLyBleHBvcnRcbiAgICAtLSAqIHBsdXMgb25lIG1lYW5zIGluc2VydCBiZXR3ZWVuIGNtZCBsaW5lIGFuZCBhZGphY2VudCBsaW5lIGJlbG93LCAqcHJlc2VydmluZyogYWRqYWNlbnQgbGluZVxuICAgIC0tICogcGx1cyB0d28gbWVhbnMgcmVwbGFjZSBvcGVuIGNtZCBsaW5lIGFuZCBvbmUgcGxhaW4gbGluZVxuICAgIGNtZF9leHRlbnQgICAgICAgICAgICAgIGludGVnZXIgbm90IG51bGwgZGVmYXVsdCAwLFxuICAgIGZvcmVpZ24ga2V5ICggc291cmNlX2lkLCBsaW5lX25yICkgcmVmZXJlbmNlcyBsaW5lcyxcbiAgICBwcmltYXJ5IGtleSAoIHNvdXJjZV9pZCwgbGluZV9uciApICk7IFwiXCJcIlxuICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gIHJldHVybiBkYlxuXG4jPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbkFfZGVtb19kYmF5ID0gLT5cbiAgYXdhaXQgICAgICAgICBBX3ByZXBhcmVfYXJlbmEoKVxuICBjZmcgICAgICAgICA9IGdldF9jZmcoKVxuICBkYiAgICAgICAgICA9IHByZXBhcmVfZGIoKVxuICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gIHJ1bl9waXBlbGluZSBkYlxuICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gIHJldHVybiBudWxsXG5cbiM9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxucnVuX3BpcGVsaW5lID0gKCBkYiApIC0+XG4gIGNmZyAgICAgICAgICAgPSBnZXRfY2ZnKClcbiAgIyAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICMgaW5zZXJ0X3NvdXJjZSA9IFNRTFwiXCJcIlxuICAjICAgaW5zZXJ0IGludG8gc291cmNlcyAoIHNvdXJjZV9wYXRoIClcbiAgIyAgICAgdmFsdWVzICggJHNvdXJjZV9wYXRoIClcbiAgIyAgICAgcmV0dXJuaW5nICo7XCJcIlwiXG4gICMgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAjIGluc2VydF9saW5lID0gU1FMXCJcIlwiXG4gICMgICBpbnNlcnQgaW50byBsaW5lcyAoIHNvdXJjZV9pZCwgbGluZV9uciwgbGluZV90ZXh0IClcbiAgIyAgICAgdmFsdWVzICggJHNvdXJjZV9pZCwgJGxpbmVfbnIsICRsaW5lX3RleHQgKTtcIlwiXCJcbiAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAjIGluc2VydF9jbWQgPSBTUUxcIlwiXCJcbiAgIyAgIGluc2VydCBpbnRvIGNtZHMgKCBzb3VyY2VfaWQsIGxpbmVfbnIsIGNtZF9uYW1lLCBjbWRfcDEgKVxuICAjICAgICB2YWx1ZXMgKCAkc291cmNlX2lkLCAkbGluZV9uciwgJGNtZF9uYW1lLCAkY21kX3AxICk7XCJcIlwiXG4gIGluc2VydF9zb3VyY2UgPSBkYi5jcmVhdGVfaW5zZXJ0IHsgaW50bzogJ3NvdXJjZXMnLCBleGNsdWRlOiBbICdzb3VyY2VfaWQnLCBdLCByZXR1cm5pbmc6ICcqJywgfVxuICBpbnNlcnRfbGluZSAgID0gZGIuY3JlYXRlX2luc2VydCB7IGludG86ICdsaW5lcycsICAgfVxuICBpbnNlcnRfY21kICAgID0gZGIuY3JlYXRlX2luc2VydCB7IGludG86ICdjbWRzJywgICAgfVxuICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gIFAgPVxuICAgICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgJGRiX2luc2VydF9zb3VyY2U6IC0+ICggeyBzb3VyY2VfcGF0aCwgfSwgc2VuZCApID0+XG4gICAgICAjIHNvdXJjZV9pZCA9IDFcbiAgICAgIHsgc291cmNlX2lkLCB9ID0gZGIuYWx0LmZpcnN0X3JvdyBpbnNlcnRfc291cmNlLCB7IHNvdXJjZV9wYXRoLCB9XG4gICAgICBzZW5kIHsgc291cmNlX2lkLCBzb3VyY2VfcGF0aCwgfVxuICAgICMuLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gICAgJHdhbGtfbGluZXNfd2l0aF9wb3NpdGlvbnM6IC0+ICggeyBzb3VyY2VfaWQsIHNvdXJjZV9wYXRoLCB9LCBzZW5kICkgPT5cbiAgICAgIGZvciB7IGxucjogbGluZV9uciwgbGluZTogbGluZV90ZXh0LCBlb2wsIH0gZnJvbSBHVVkuZnMud2Fsa19saW5lc193aXRoX3Bvc2l0aW9ucyBzb3VyY2VfcGF0aFxuICAgICAgICBzZW5kIHsgc291cmNlX2lkLCBsaW5lX25yLCBsaW5lX3RleHQsIH1cbiAgICAgIHJldHVybiBudWxsXG4gICAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAkaW5zZXJ0X2xpbmU6IC0+ICggbGluZSwgc2VuZCApID0+XG4gICAgICAjIGRlYnVnICfOqWJyYnJfX185JywgbGluZVxuICAgICAgZGIuYWx0IGluc2VydF9saW5lLCBsaW5lXG4gICAgICBzZW5kIGxpbmVcbiAgICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLlxuICAgICRwYXJzZV9jbWQ6IC0+ICggZCwgc2VuZCApID0+XG4gICAgICByZXR1cm4gc2VuZCBkIHVubGVzcyAoIG1hdGNoID0gQ09NTUFORF9QQVJTRVIubWF0Y2hfbGluZSBkLmxpbmVfdGV4dCApP1xuICAgICAgZCAgICAgICAgICAgICAgICAgICA9IHsgZC4uLiwgbWF0Y2guLi4sIH1cbiAgICAgICMgd2FybiAnzqlicmJyX18xMCcsIEdVWS50cm0ucmVkIEdVWS50cm0ucmV2ZXJzZSBHVVkudHJtLmJvbGQgZC5jbWRfcGF0dGVyblxuICAgICAgZC5jbWRfcm9sZSAgICAgICAgICA9IGlmIGQuY21kX3NsYXNoIGlzICcvJyB0aGVuICdjbG9zZScgZWxzZSAnb3BlbidcbiAgICAgIGQuY21kX2Rpc3Bvc2l0aW9uICA/PSBudWxsXG4gICAgICBkLmNtZF9leHRlbnQgICAgICAgPz0gMFxuICAgICAgZC5wMV9uYW1lICAgICAgICAgICA9IHN3aXRjaCBkLmNtZF9uYW1lXG4gICAgICAgIHdoZW4gJ2luc2VydCcgICAgICAgICB0aGVuICAnc3JjJ1xuICAgICAgICB3aGVuICdyZXBsYWNlLWFib3ZlJyAgdGhlbiAgJ3NyYydcbiAgICAgICAgd2hlbiAncmVwbGFjZS1iZWxvdycgIHRoZW4gICdzcmMnXG4gICAgICAgIHdoZW4gJ3B1Ymxpc2gnICAgICAgICB0aGVuICAnYXMnXG4gICAgICAgIGVsc2UgICAgICAgICAgICAgICAgICAgICAgICAnLi8uJ1xuICAgICAgc2VuZCBkXG4gICAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAkaW5zZXJ0X2NtZDogLT4gKCBkLCBzZW5kICkgPT5cbiAgICAgIHJldHVybiBzZW5kIGQgdW5sZXNzIGQuY21kX25hbWU/XG4gICAgICBkYi5hbHQgaW5zZXJ0X2NtZCwgZFxuICAgICAgc2VuZCBkXG4gICAgIy4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAkc2hvdzogLT5cbiAgICAgIFNGTU9EVUxFU19kZXYgPSByZXF1aXJlICcuLi8uLi9icmljYWJyYWMtc2luZ2xlLWZpbGUtbW9kdWxlcydcbiAgICAgIHsgYW5zaV9jb2xvcnNfYW5kX2VmZmVjdHM6IEMsIH0gPSBTRk1PRFVMRVNfZGV2LnJlcXVpcmVfYW5zaV9jb2xvcnNfYW5kX2VmZmVjdHMoKVxuICAgICAgY29sb3IgICAgICAgPSBDLmJsYWNrXG4gICAgICBiZ19jb2xvciAgICA9IEMuYmdfZ2FpbnNib3JvXG4gICAgICBlcnJvciAgICAgICA9IFwiI3tDLmJnX3Bpbmt9IG5vIG1hdGNoICN7Y29sb3J9I3tiZ19jb2xvcn1cIlxuICAgICAgZm10X2hlYWRlciAgPSAoIHggKSAtPiBcIiN7Qy5ib2xkfSN7Qy5pdGFsaWN9ICN7eH0gI3tDLmJvbGQwfSN7Qy5pdGFsaWMwfSN7Y29sb3J9I3tiZ19jb2xvcn1cIlxuICAgICAgZm10X3ZhbHVlICAgPSAoIHggKSAtPlxuICAgICAgICBzd2l0Y2ggeFxuICAgICAgICAgIHdoZW4gJycgICAgICAgICB0aGVuICAnJ1xuICAgICAgICAgIHdoZW4gdW5kZWZpbmVkICB0aGVuICBcIiN7Qy5yZWR9IFUgI3tjb2xvcn1cIlxuICAgICAgICAgIHdoZW4gbnVsbCAgICAgICB0aGVuICBcIiN7Qy5yZWR9IE4gI3tjb2xvcn1cIlxuICAgICAgICAgICMgd2hlbiBlcnJvciAgICAgIHRoZW4gIHhcbiAgICAgICAgICBlbHNlICAgICAgICAgICAgICAgICAgcnByIHhcbiAgICAgIHByaW50X3JvdyA9ICggcm93LCB7IGlzX2hlYWRlciwgfSApIC0+XG4gICAgICAgIGZtdCA9IGlmIGlzX2hlYWRlciB0aGVuIGZtdF9oZWFkZXIgZWxzZSBmbXRfdmFsdWVcbiAgICAgICAgZWNobyAnJyArXG4gICAgICAgICAgZlwiI3tjb2xvcitiZ19jb2xvcn3ilIJcIiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICBmXCIje0Mub3ZlcmxpbmUxfVwiICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICBmXCIjeyBmbXQgcm93LmNtZF9wYXR0ZXJuICAgICAgICAgICAgICAgIH06PDIwYzvilIJcIiAgICAgICAgICAgICAgICAgK1xuICAgICAgICAgIGZcIiN7IGZtdCByb3cuY21kX3JvbGUgICAgICAgICAgICAgICAgICAgfTo8MjBjO+KUglwiICAgICAgICAgICAgICAgICArXG4gICAgICAgICAgZlwiI3sgZm10IHJvdy5jbWRfcHJlZml4ICAgICAgICAgICAgICAgICB9OjwyMGM74pSCXCIgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICBmXCIjeyBmbXQgcm93LmNtZF9zbGFzaCAgICAgICAgICAgICAgICAgIH06PDExYzvilIJcIiAgICAgICAgICAgICAgICAgK1xuICAgICAgICAgIGZcIiN7IGZtdCByb3cuY21kX25hbWUgICAgICAgICAgICAgICAgICAgfTo8MTVjO+KUglwiICAgICAgICAgICAgICAgICArXG4gICAgICAgICAgZlwiI3sgZm10IHJvdy5jbWRfZGlzcG9zaXRpb24gICAgICAgICAgICB9OjwxMGM74pSCXCIgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICBmXCIjeyByb3cucDFfbmFtZSArICc6J306PDEwYzsje2ZtdCByb3cuY21kX3AxIH06PDQwYzvilIJcIiAgICAgICAgICAgICAgICAgK1xuICAgICAgICAgIGZcIiN7IGZtdCByb3cuY21kX3VzZXJfZW9pICAgICAgICAgICAgICAgfTo8MTBjO+KUglwiICAgICAgICAgICAgICAgICArXG4gICAgICAgICAgZlwiI3sgZm10IHJvdy5jbWRfc3lzdGVtX2VvaSAgICAgICAgICAgICB9OjwxMGM74pSCXCIgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICBmXCIjeyBmbXQgcm93LmNtZF9zdWZmaXggICAgICAgICAgICAgICAgIH06PDEwYztcIiAgICAgICAgICAgICAgICAgICtcbiAgICAgICAgICBmXCIjeyBDLm92ZXJsaW5lMCAgICAgICAgICAgICAgICAgICAgICAgIH3ilIIje0MuZGVmYXVsdCtDLmJnX2RlZmF1bHR9XCJcbiAgICAgIGhlYWRlciA9XG4gICAgICAgIGNtZF9wYXR0ZXJuOiAnY21kX3BhdHRlcm4nLFxuICAgICAgICBjbWRfcm9sZTogICAgICAgICAncm9sZScsXG4gICAgICAgIGNtZF9wYXR0ZXJuOiAgICAgICdwYXR0ZXJuJyxcbiAgICAgICAgY21kX3ByZWZpeDogICAgICAgJ3ByZWZpeCcsXG4gICAgICAgIGNtZF9zbGFzaDogICAgICAgICdzbGFzaCcsXG4gICAgICAgIGNtZF9uYW1lOiAgICAgICAgICduYW1lJyxcbiAgICAgICAgY21kX2Rpc3Bvc2l0aW9uOiAgJ2Rpc3AuJyxcbiAgICAgICAgcDFfbmFtZTogICAgICAgICAgJ3AxX25hbWUnLFxuICAgICAgICBjbWRfcDE6ICAgICAgICAgICAncDEnLFxuICAgICAgICBjbWRfdXNlcl9lb2k6ICAgICAndUVPSScsXG4gICAgICAgIGNtZF9zeXN0ZW1fZW9pOiAgICdzRU9JJyxcbiAgICAgICAgY21kX3N1ZmZpeDogICAgICAgJ3N1ZmZpeCdcbiAgICAgIHByaW50X3JvdyBoZWFkZXIsIHsgaXNfaGVhZGVyOiB0cnVlLCB9XG4gICAgICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi5cbiAgICAgIHJldHVybiAoIGQgKSA9PlxuICAgICAgICAjIHdoaXNwZXIgJ86pYnJicl9fMTEnLCBkLnNvdXJjZV9pZCwgZC5saW5lX25yLCBkLmxpbmVfdGV4dFxuXG4gICAgICAgICMgaWYgKCBtYXRjaCA9IGQubGluZV90ZXh0Lm1hdGNoIENPTU1BTkRfUEFSU0VSLmludGVybmFscy5wYXR0ZXJucy5zaW1pbGFyICk/XG4gICAgICAgICMgICBkZWJ1ZyAnzqlicmJyX18xMicsICggR1VZLnRybS53aGl0ZSBHVVkudHJtLnJldmVyc2UgR1VZLnRybS5ib2xkIGQubGluZV90ZXh0ICksIHsgbWF0Y2guZ3JvdXBzLi4uLCB9XG4gICAgICAgIGlmIGQuY21kX3BhdHRlcm4/XG4gICAgICAgICAgcHJpbnRfcm93IGQsIHsgaXNfaGVhZGVyOiBmYWxzZSwgfVxuICAgICAgICAgICMgaGVscCAnzqlicmJyX18xMycsXG4gICAgICAgICAgIyAgIGQuY21kX3JvbGUsXG4gICAgICAgICAgIyAgIGQuY21kX3BhdHRlcm4sXG4gICAgICAgICAgIyAgIGQuY21kX3ByZWZpeCxcbiAgICAgICAgICAjICAgZC5jbWRfc2xhc2gsXG4gICAgICAgICAgIyAgIGQuY21kX25hbWUsXG4gICAgICAgICAgIyAgIGQuY21kX2Rpc3Bvc2l0aW9uLFxuICAgICAgICAgICMgICBkLmNtZF9wMSxcbiAgICAgICAgICAjICAgZC5jbWRfdXNlcl9lb2ksXG4gICAgICAgICAgIyAgIGQuY21kX3N5c3RlbV9lb2ksXG4gICAgICAgICAgIyAgIGQuY21kX3N1ZmZpeFxuICAgICAgICByZXR1cm4gbnVsbFxuICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gIGNvbGxlY3RvciA9IFtdXG4gIHAgICAgICAgICA9IG5ldyBQaXBlbGluZSgpXG4gIHAucHVzaCBbIHsgc291cmNlX3BhdGg6IGNmZy5tYWluX3BhdGgsIH0sIF1cbiAgcC5wdXNoIFAuJGRiX2luc2VydF9zb3VyY2UoKVxuICBwLnB1c2ggUC4kd2Fsa19saW5lc193aXRoX3Bvc2l0aW9ucygpXG4gIHAucHVzaCBQLiRpbnNlcnRfbGluZSgpXG4gIHAucHVzaCBQLiRwYXJzZV9jbWQoKVxuICBwLnB1c2ggUC4kaW5zZXJ0X2NtZCgpXG4gIHAucHVzaCBQLiRzaG93KClcbiAgIyBwLnB1c2ggKCBkLCBzZW5kICkgLT4gY29sbGVjdG9yLnB1c2ggZCAjOyBoZWxwIGNvbGxlY3RvclxuICBwLnJ1bigpXG4gIGVjaG8gJ+KAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlOKAlCdcbiAgZGVidWcgJ86pYnJicl9fMTQnLCBcInNvdXJjZXM6XCJcbiAgdXJnZSAnzqlicmJyX18xNScsIHJvdyBmb3Igcm93IGZyb20gZGIgU1FMXCJcIlwic2VsZWN0ICogZnJvbSBzb3VyY2VzO1wiXCJcIlxuICBkZWJ1ZyAnzqlicmJyX18xNicsIFwibGluZXM6XCJcbiAgaGVscCAnzqlicmJyX18xNycsIHJvdyBmb3Igcm93IGZyb20gZGIgU1FMXCJcIlwic2VsZWN0ICogZnJvbSBsaW5lcyBsaW1pdCAxMDtcIlwiXCJcbiAgZGVidWcgJ86pYnJicl9fMTgnLCBcImNtZHM6XCJcbiAgaW5mbyAnzqlicmJyX18xOScsIHJvdyBmb3Igcm93IGZyb20gZGIgU1FMXCJcIlwic2VsZWN0ICogZnJvbSBjbWRzO1wiXCJcIlxuICAjLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uXG4gIHJldHVybiBudWxsXG5cblxuIz09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5pZiBtb2R1bGUgaXMgcmVxdWlyZS5tYWluIHRoZW4gYXdhaXQgZG8gPT5cbiAgYXdhaXQgQV9kZW1vX2RiYXkoKVxuICByZXR1cm4gbnVsbFxuXG4iXX0=
//# sourceURL=../src/main.coffee