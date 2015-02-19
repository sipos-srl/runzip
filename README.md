# Runzip

a recursive unzip for node, built on top of [yauzl](https://github.com/thejoshwolfe/yauzl)

## Usage

```js
var unzip = require("runzip");
var fs = require("fs");
var mkdirp = require("mkdirp");

function isZip(entry) {
  return /\.(zip|jar)$/.test(entry.fileName);
}

runzip.open("path/to/file.zip", { filter: isZip }, function(err, zipfile) {
  if (err) throw err;
  zipfile.on("entry", function(entry) {
    if (/\/$/.test(entry.fileName)) {
      // directory file names end with '/'
      return;
    }
    zipfile.openReadStream(entry, function(err, readStream) {
      if (err) throw err;
      // entry.nestedPath is an array of the recursively nested zip filenames
      var outputDir = entry.nestedPath.join("/");
      // ensure the output directory exists
      mkdirp(outputDir);
      readStream.pipe(fs.createWriteStream(outputDir + "/" + entry.fileName));
    });
  });
});
```

## API

The API provided is the same as [yauzl](https://github.com/thejoshwolfe/yauzl), but with an additional `filter` option. The `filter` option should be a function that takes the zipfile entry object and produces a boolean indicating whether it is a nested zipfile. The default value is:

```js
function(entry) {
  return /\.zip$/.test(entry.fileName);
}
```

### open(path, [options], [callback])

Just like [yauzl](https://github.com/thejoshwolfe/yauzl), but with an additional `filter` option.

### fromFd(fd, [options], [callback])

Just like [yauzl](https://github.com/thejoshwolfe/yauzl), but with an additional `filter` option.

### fromBuffer(buffer, [options], [callback])

Just like [yauzl](https://github.com/thejoshwolfe/yauzl), but with an additional argument that is an options object accepting a `filter` option.

### Class: ZipFile

Same as [yauzl](https://github.com/thejoshwolfe/yauzl), but each `Entry` has an additional `nestedPath` property.

### Class: Entry

Same as [yauzl](https://github.com/thejoshwolfe/yauzl), but with an additional property:

#### nestedPath

`Array` of strings.
This array contains the stack of filenames of the recursively nested zip files containing this entry.

# License

MIT
