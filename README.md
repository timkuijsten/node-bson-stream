# BSONStream

Read a binary stream that contains BSON objects and emit each as a JavaScript
object. This module can be used in the browser with browserify.


## Example

Write each object of a BSON file created with mongodump to stdout:

    var fs = require('fs');
    var BSONStream = require('bson-stream');

    var rs = fs.createReadStream('/some/data.bson');

    rs.pipe(new BSONStream()).on('data', function(obj) {
      console.log(obj);
    });

Example with an object containing a Buffer object as a value. The Buffer will be
embedded when serialized by the BSON npm:

    var assert = require('assert');
    var bson = require('bson');
    var BSON = new bson.BSONPure.BSON();
    var BSONStream = require('bson-stream');

    var buf = new Buffer([65, 67, 70]); // 'ACF'
    var obj = { foo: buf };

    var bs = new BSONStream();
    bs.on('data', function(obj) {
      // the original Buffer value is embedded in a new BSON Buffer object and
      // stored at the `buffer` key
      assert.strictEqual(obj.foo.buffer.toString(), 'ACF');
    });

    bs.end(BSON.serialize(obj));


## Installation

    $ npm install bson-stream


## API

### BSONStream([opts])
* [opts] {Object} object containing optional parameters

opts:
* raw {Boolean, default false} whether to emit JavaScript objects or raw Buffers
* maxDocLength {Number, default 16777216} maximum BSON document size in bytes
* maxBytes {Number, default infinite} maximum number of bytes to receive
* debug {Boolean, default false} whether to do extra console logging or not
* hide {Boolean, default false} whether to suppress errors or not (used in tests)

Read a binary stream that contains BSON objects and emit each as a JavaScript
object (or as a Buffer if opts.raw is true).

Note: implements BSON specification 1.0 (http://bsonspec.org/spec.html), as
supported by js-bson (https://www.npmjs.org/package/bson).

Note2: Buffer objects will be embedded in a new BSON Buffer object at `buffer`.


## Tests

    $ npm test


## License

ISC

Copyright (c) 2014, 2015 Tim Kuijsten

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
