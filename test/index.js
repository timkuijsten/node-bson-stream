/**
 * Copyright (c) 2014, 2015 Tim Kuijsten
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

'use strict';

/*jshint -W068 */

var fs = require('fs');
var crypto = require('crypto');

var should = require('should');
var bson = require('bson');
var BSON = new bson.BSONPure.BSON();

var BSONStream = require('../index.js');

describe('BSONStream', function() {
  it('should require opts to be an object', function() {
    (function() { var bs = new BSONStream(''); return bs; }).should.throw('opts must be an object');
  });

  it('should require opts.raw to be a boolean', function() {
    (function() { var bs = new BSONStream({ raw: '' }); return bs; }).should.throw('opts.raw must be a boolean');
  });

  it('should require opts.maxDocLength to be a number', function() {
    (function() { var bs = new BSONStream({ maxDocLength: '' }); return bs; }).should.throw('opts.maxDocLength must be a number');
  });

  it('should require opts.maxBytes to be a number', function() {
    (function() { var bs = new BSONStream({ maxBytes: '' }); return bs; }).should.throw('opts.maxBytes must be a number');
  });

  it('should require opts.debug to be a boolean', function() {
    (function() { var bs = new BSONStream({ debug: '' }); return bs; }).should.throw('opts.debug must be a boolean');
  });

  it('should require opts.hide to be a boolean', function() {
    (function() { var bs = new BSONStream({ hide: '' }); return bs; }).should.throw('opts.hide must be a boolean');
  });

  it('should construct', function() {
    var bs = new BSONStream();
    return bs;
  });

  it('should be a writable stream', function(done) {
    var bs = new BSONStream();
    bs.end(done);
  });

  it('should be a readable stream', function(done) {
    var bs = new BSONStream();
    bs.resume();
    bs.on('end', done);
    bs.end();
  });

  it('should emit one valid empty BSON buffer', function(done) {
    var bs = new BSONStream({ raw: true });
    bs.on('data', function(data) {
      should.strictEqual(data instanceof Buffer, true);
      should.strictEqual(data.length, 5);
      should.strictEqual(data[0], 0x05);
      should.strictEqual(data[1], 0x00);
      should.strictEqual(data[2], 0x00);
      should.strictEqual(data[3], 0x00);
      should.strictEqual(data[4], 0x00);
      should.strictEqual(data[5], undefined);
      done();
    });
    bs.end(new Buffer([0x05, 0x00, 0x00, 0x00, 0x00]));
  });

  it('should emit one valid empty object', function(done) {
    var bs = new BSONStream();
    bs.on('data', function(obj) {
      should.deepEqual(obj, {});
      done();
    });
    bs.end(new Buffer([0x05, 0x00, 0x00, 0x00, 0x00]));
  });

  it('should err when more than maxBytes are written', function(done) {
    var bs = new BSONStream({ raw: true, maxBytes: 4 });
    bs.on('error', function(err) {
      should.strictEqual(err.message, 'more than maxBytes received');
      done();
    });
    bs.on('data', function() { throw Error('incomplete BSON emitted'); });
    bs.end(new Buffer([0x05, 0x00, 0x00, 0x00, 0x00]));
  });

  it('should require a document length of at least 5 bytes', function(done) {
    var bs = new BSONStream({ maxBytes: 5 });
    bs.on('error', function(err) {
      should.strictEqual(err.message, 'invalid document length');
      done();
    });
    bs.on('data', function() { throw Error('incomplete BSON emitted'); });
    bs.end(new Buffer([0x04, 0x00, 0x00, 0x00, 0x00]));
  });

  it('should require each document to not exceed the default maximum of 16 MB', function(done) {
    var bs = new BSONStream();
    bs.on('data', function() { throw Error('incomplete BSON emitted'); });
    bs.on('error', function(err) {
      should.strictEqual(err.message, 'document exceeds configured maximum length');
      done();
    });
    bs.end(new Buffer([0x01, 0x00, 0x00, 0x01]));
  });

  it('should require each document to not exceed the configured maximum', function(done) {
    var bs = new BSONStream({ maxDocLength: 5 });
    bs.on('data', function() { throw Error('incomplete BSON emitted'); });
    bs.on('error', function(err) {
      should.strictEqual(err.message, 'document exceeds configured maximum length');
      done();
    });
    bs.end(new Buffer([0x06, 0x00, 0x00, 0x00]));
  });

  it('should require that a document terminates with 0x00', function(done) {
    var bs = new BSONStream();
    bs.on('error', function(err) {
      should.strictEqual(err.message, 'invalid document termination');
      done();
    });
    bs.on('data', function() { throw Error('incomplete BSON emitted'); });
    bs.end(new Buffer([0x05, 0x00, 0x00, 0x00, 0x01]));
  });

  it('should not emit documents when document length is not reached', function(done) {
    var bs = new BSONStream();
    bs.on('data', function() { throw Error('incomplete BSON emitted'); });
    bs.on('end', done);
    bs.end(new Buffer([0x00, 0x00, 0x00, 0x01, 0x00]));
  });

  it('should deserialize a generated BSON buffer correctly', function(done) {
    var obj = {
      foo: 'bar',
      bar: 42,
      baz: false,
      qux: null
    };

    var bs = new BSONStream();
    bs.on('data', function(data) {
      should.deepEqual(data, {
        foo: 'bar',
        bar: 42,
        baz: false,
        qux: null
      });
      done();
    });
    bs.end(BSON.serialize(obj));
  });

  it('should deserialize two generated BSON buffer correctly', function(done) {
    var obj1 = {
      foo: 'bar'
    };

    var obj2 = {
      foo: 'baz',
      bar: 42,
      baz: false,
      qux: null
    };

    var bs = new BSONStream();

    var arr = [];

    bs.on('data', function(data) {
      arr.push(data);
    });

    bs.on('end', function() {
      should.strictEqual(arr.length, 2);
      should.deepEqual(arr[0], {
        foo: 'bar'
      });
      should.deepEqual(arr[1], {
        foo: 'baz',
        bar: 42,
        baz: false,
        qux: null
      });
      done();
    });

    bs.end(Buffer.concat([BSON.serialize(obj1), BSON.serialize(obj2)]));
  });

  it('should skip noise in previous chunks and emit two generated BSON buffers', function(done) {
    // this only works because the "noise" indicates a document length that exceeds the default allowed maximum length of 16 MB
    var noise = new Buffer([9,4,5,8,4,6,2,5,4]);

    var obj1 = {
      foo: 'bar'
    };

    var obj2 = {
      foo: 'baz',
      bar: 42,
      baz: false,
      qux: null
    };

    var bs = new BSONStream();

    var arr = [];

    bs.on('data', function(data) {
      arr.push(data);
    });

    bs.on('error', function(err) {
      should.strictEqual(err.message, 'document exceeds configured maximum length');
    });

    bs.on('end', function() {
      should.strictEqual(arr.length, 2);
      should.deepEqual(arr[0], {
        foo: 'bar'
      });
      should.deepEqual(arr[1], {
        foo: 'baz',
        bar: 42,
        baz: false,
        qux: null
      });
      done();
    });

    bs.write(Buffer.concat([noise]));
    bs.write(Buffer.concat([BSON.serialize(obj1), noise, BSON.serialize(obj2)]));
    bs.write(Buffer.concat([BSON.serialize(obj2)]));
    bs.end();
  });

  it('stream binary data from disk', function(done) {
    fs.readFile(__dirname + '/image.png', function(err, data) {
      if (err) { throw err; }

      should.strictEqual(data.length, 121271);

      var shasum = crypto.createHash('sha1');
      shasum.update(data);
      should.strictEqual(shasum.digest('hex'), '6b7e9149ba026c6b413f40f5d4ac02fd57cdd57c');

      var obj = { foo: data };

      var bs = new BSONStream();

      var arr = [];

      bs.on('data', function(data) {
        arr.push(data);
      });

      bs.on('error', function(err) {
        should.strictEqual(err.message, 'document exceeds configured maximum length');
      });

      bs.on('end', function() {
        should.strictEqual(arr.length, 1);
        should.strictEqual(arr[0].foo.buffer.length, 121271);

        var shasum2 = crypto.createHash('sha1');
        shasum2.update(arr[0].foo.buffer);
        should.strictEqual(shasum2.digest('hex'), '6b7e9149ba026c6b413f40f5d4ac02fd57cdd57c');
        done();
      });

      bs.end(BSON.serialize(obj));
    });
  });
});
