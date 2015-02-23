var util = require('util');
var events = require('events');
var yauzl = require('yauzl');
var concatStream = require('concat-stream');
var Immutable = require('immutable');

util.inherits(Runzip, events.EventEmitter);

function Runzip(options) {
  events.EventEmitter.call(this);
  this._filter = (options && options.filter) || function(entry) {
    return /\.zip$/.test(entry.fileName);
  };
  this._liveZipfileCount = 0;
}

Runzip.prototype.openReadStream = function openReadStream(entry, cb) {
  return entry.openReadStream(cb);
};

Runzip.prototype._unzip = function _unzip(zipfile) {
  this._liveZipfileCount = 1;
  this._unzipNested(zipfile, new Immutable.List());
};

Runzip.prototype._unzipNested = function _unzip(zipfile, nestedPath) {
  var self = this;
  zipfile.on('entry', function(entry) {
    if (self._filter(entry)) {
      self._liveZipfileCount++;
      //console.log("^^ " + self._liveZipfileCount);
      zipfile.openReadStream(entry, function(err, readStream) {
        if (err) {
          self.emit('error', err);
          self.close();
          return;
        }
        readStream.on('error', function(err) {
          self.emit('error', err);
          self.close();
        });
        readStream.pipe(concatStream(function(buffer) {
          yauzl.fromBuffer(buffer, function(err, zipfile) {
            if (err) {
              self.emit('error', err);
              self.close();
              return;
            }
            // a wild recursion appears
            self._unzipNested(zipfile, nestedPath.push(entry.fileName));
          });
        }));
      });
    } else {
      entry.nestedPath = nestedPath.toArray();
      entry.openReadStream = function(cb) {
        zipfile.openReadStream(entry, cb);
      };
      self.emit('entry', entry);
    }
  });
  zipfile.on('end', function() {
    self._liveZipfileCount--;
    //console.log("vv " + self._liveZipfileCount);
    if (self._liveZipfileCount === 0) {
      self.emit('end');
    }
  });
};

function makeZipfileHandler(options, callback) {
  return function(err, zipfile) {
    if (err) return callback(err);
    var r = new Runzip(options);
    r._unzip(zipfile);
    callback(null, r);
  };
}

function open(path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  yauzl.open(path, options, makeZipfileHandler(options, callback));
}

function fromFd(fd, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  yauzl.fromFd(fd, options, makeZipfileHandler(options, callback));
}

function fromBuffer(buffer, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }
  yauzl.fromBuffer(fd, makeZipfileHandler(options, callback));
}

exports.open = open;
exports.fromFd = fromFd;
exports.fromBuffer = fromBuffer;

//yauzl.open('./tests/two-root-files.zip', function(err, zipfile) {
//  console.log(zipfile.__proto__.__proto__.constructor);
//});

// function test(name) {
//   return function(err, zipfile) {
//     if (err) throw err;
//     zipfile.on('entry', function(entry) {
//       console.log("entry: " + name + " " + entry.nestedPath.join("::") + " " + entry.fileName);
//     });
//     zipfile.on('end', function() {
//       console.log("end " + name);
//     });
//   };
// }

// open('./tests/two-root-files.zip', null, test("two-root-files"));
// open('./tests/four-roots-and-a-zip.zip', null, test("four-roots-and-a-zip"));
