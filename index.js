var through = require('through2')
var debug = require('debug')('dough')
var promptSync = require('prompt-sync')
var from = require('from2')
var Transform = require('stream').Transform
var inherits = require('inherits')
var diff2daff = require('./lib/diff2daff.js')

inherits(DoughStream, Transform)
function DoughStream (opts) {
  /*
  strategy:
    - 'rows': by limit of row, seeing the full table
    - 'cols': by each column that has been identified as 'mostly changed', 'added', or 'deleted'

  returns:
    onDiff(output, visual, next)
    - output: object
      {
        tables: daff tables,
        changes: batched dat diffStream
      }

    - visual: string
    - next: function
  */
  if (!(this instanceof DoughStream)) return new DoughStream(opts)
  Transform.call(this, {objectMode: true})

  if (!opts) opts = {}
  this.destroyed = false
  // TODO: always does 'by row' right now.
  this.strategy = opts.strategy || 'rows'
}

DoughStream.prototype._transform = function (data, enc, next) {
  var self = this
  debug('_transform', data)

  diff2daff(data, function (tables, visual) {
    var output = {
      changes: data,
      tables: tables
    }
    self.merge(output, visual, next)
  })
}

DoughStream.prototype.merge = function (output, visual, next) {
  var self = this
  debug('merge', output)
  console.log(visual)

  var tables = output.tables
  var older = tables[0]
  var newer = tables[1]

  function repl () {
    // TODO: change limit in repl (like git's add -p or e/edit)
    process.stdout.write('Keep this chunk? [y,n,s,q,?] ')
    var val = promptSync()
    if (val === 's' || val === 'skip') {
      return next()
    }
    if (val === 'y' || val === 'yes') {
      for (i in newer.data) {
        debug('pushing', newer.data[i])
        self.push(newer.data[i])
      }
      return next()
    }
    if (val === 'n' || val === 'no') {
      for (i in older.data) {
        debug('pushing', older.data[i])
        self.push(older.data[i])
      }
      return next()
    }
    if (val === 'q' || val === 'quit') {
      self.end()
      process.exit()
    } else {
      help()
      repl()
    }
  }
  repl()
}


function help () {
  console.log('skip (s), yes (y), no (n), quit (q)')
}

function usage () {
  console.log('dough <dat-db> [--limit <num>] [--heads <head1,head2>]')
}


DoughStream.prototype.destroy = function(err) {
  if (this.destroyed) return
  this.destroyed = true

  this.err = err
  this.end()
}

module.exports = DoughStream
