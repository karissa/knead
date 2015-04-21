var batcher = require('byte-stream')
var through = require('through2')
var debug = require('debug')('visualdiff')
var prompt = require('prompt-sync')

var dat2daff = require('./lib/dat2daff.js')

function VisualDiff (heads, opts, cb) {
  if (!cb) cb = VisualDiff.cli
  if (!(this instanceof VisualDiff)) return new VisualDiff(heads, opts, cb)
  /*
  strategy:
    - 'rows': by limit of row, seeing the full table
    - 'cols': by each column that has been identified as 'mostly changed', 'added', or 'deleted'

  returns:
    cb(output, visual, next)
    - output: object
      {
        older: 'left' or 'right',
        heads: original heads passed,
        tables: daff tables,
        changes: batched dat diffStream
      }

    - visual: string
    - next: function
  */

  if (!opts) opts = {}
  if (!opts.db) throw new Error('db required')
  this.limit = (opts.limit || 20) * 2
  this.strategy = opts.strategy || 'rows'

  var db = opts.db

  this.diffStream = db.createDiffStream(heads[0], heads[1])
  this.mergeStream = db.createMergeStream(heads[0], heads[1])

  if (this.strategy == 'rows') {
    var batchedStream = batcher(this.limit)
    this.diffStream.on('data', function (data) {
      debug('diffstream data ', data[0], data[1])
    })
    this.diffStream
      .pipe(batchedStream)
      .pipe(through.obj(function (data, enc, next) {
        var output = {
          heads: heads,
          changes: data,
          older: getOlderChange(data)
        }
        dat2daff.fromDiff(data, opts, function (tables, visual) {
          debug('tables', tables)
          debug('output', visual)
          output.tables = tables
          cb(output, visual, next)
        })
      })
    )
  }
  else {
    throw new Error('cols not supported')
  }
}

function getOlderChange (changes) {
  // find which one is older
  for (var i = 0; i < changes.length; i++) {
    var change = changes[i]
    if (change[0] && change[1]) {
      if (change[0].change < change[1].change) {
        return 'left'
      }
      if (change[0].change > change[1].change) {
        return 'right'
      }
    }
  }
}

VisualDiff.prototype.decline = function () {

}

VisualDiff.prototype.merge = function () {
  this.mergeStream.write()
  this.next()
}

VisualDiff.cli = function (data, visual, next) {
  // TODO: modularize into a dat visual merge tool?
  var self = this

  var heads = data.heads
  var tables = data.tables
  var older = data.older // 'left' or 'right'

  console.log(visual)

  function repl () {
    // TODO: change limit in repl (like git's add -p or e/edit)
    process.stdout.write('Keep this chunk? [y,n,s,r,c,q,?] ')
    var val = prompt()
    if (val === 's' || val === 'skip') {
      return next()
    }
    if (val === 'y' || val === 'yes') {
      // TODO: choose 'newer' version
      return next()
    }
    if (val === 'n' || val === 'no') {
      // TODO: choose 'older' version
      return next()
    }
    if (val === 'r' || val === 'rows') {
      opts.strategy = 'rows'
      // differ = makeDiffer(heads)
      return
    }
    if (val === 'c' || val === 'cols') {
      opts.strategy = 'cols'
      // differ = makeDiffer(heads)
      return
    }
    if (val === 'q' || val === 'quit') {
      return process.exit()
    }
    else {
      help()
      repl()
    }
  }
  repl()
}

function help () {
  console.log('skip (s), yes (y), no (n), cols (c), rows (r), quit (q)')
}

function usage () {
  console.log("dat-visualDiff <dat-db> [--limit <num>] [--heads <head1,head2>]")
}

module.exports = VisualDiff
