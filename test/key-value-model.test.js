var expect = require('chai').expect;
var http = require('http');
var loopback = require('..');
var supertest = require('supertest');

var AN_OBJECT_VALUE = { name: 'an-object' };

describe('KeyValueModel', function() {
  var request, app, CacheItem;
  beforeEach(setupAppAndCacheItem);

  describe('REST API', function() {
    before(setupSharedHttpServer);

    it('provides "get(key)" at "GET /key"', function(done) {
      CacheItem.set('get-key', AN_OBJECT_VALUE);
      request.get('/CacheItems/get-key')
        .end(function(err, res) {
          if (err) return done(err);
          expect(res.body).to.eql(AN_OBJECT_VALUE);
          done();
        });
    });

    it('returns 404 when getting a key that does not exist', function(done) {
      request.get('/CacheItems/key-does-not-exist')
        .expect(404, done);
    });

    it('provides "set(key)" at "PUT /key"', function(done) {
      request.put('/CacheItems/set-key')
        .send(AN_OBJECT_VALUE)
        .expect(204)
        .end(function(err, res) {
          if (err) return done(err);
          CacheItem.get('set-key', function(err, value) {
            if (err) return done(err);
            expect(value).to.eql(AN_OBJECT_VALUE);
            done();
          });
        });
    });

    it('provides "set(key, ttl)" at "PUT /key?ttl={num}"', function(done) {
      request.put('/CacheItems/set-key-ttl?ttl=10')
        .send(AN_OBJECT_VALUE)
        .end(function(err, res) {
          if (err) return done(err);
          setTimeout(function() {
            CacheItem.get('set-key-ttl', function(err, value) {
              if (err) return done(err);
              expect(value).to.equal(null);
              done();
            });
          }, 20);
        });
    });

    it('provides "expire(key, ttl)" at "PUT /key/expire"',
    function(done) {
      CacheItem.set('expire-key', AN_OBJECT_VALUE, function(err) {
        if (err) return done(err);
        request.put('/CacheItems/expire-key/expire')
          .send({ ttl: 10 })
          .end(function(err, res) {
            if (err) return done(err);
            setTimeout(function() {
              CacheItem.get('set-key-ttl', function(err, value) {
                if (err) return done(err);
                expect(value).to.equal(null);
                done();
              });
            }, 20);
          });
      });
    });

    it('returns 404 when expiring a key that does not exist', function(done) {
      request.put('/CacheItems/key-does-not-exist/expire')
        .send({ ttl: 10 })
        .expect(404, done);
    });
  });

  function setupAppAndCacheItem() {
    app = loopback({ localRegistry: true, loadBuiltinModels: true });
    app.use(loopback.rest());

    CacheItem = app.registry.createModel({
      name: 'CacheItem',
      base: 'KeyValueModel',
    });

    app.dataSource('kv', { connector: 'kv-memory' });
    app.model(CacheItem, { dataSource: 'kv' });
  }

  var _server, _requestHandler; // eslint-disable-line one-var
  function setupSharedHttpServer(done) {
    _server = http.createServer(function(req, res) {
      app(req, res);
    });
    _server.listen(0, '127.0.0.1')
      .once('listening', function() {
        request = supertest('http://127.0.0.1:' + this.address().port);
        done();
      })
      .once('error', function(err) { done(err); });
  }
});
