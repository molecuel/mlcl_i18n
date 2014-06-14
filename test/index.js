/**
 * Created by Dominic Böttger on 09.05.14.
 * @type {ok|exports}
 */
var assert = require('assert'),
  i18nmod = require('../'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  should = require('should'),
  express = require('express'),
  bodyParser = require('body-parser');

describe('i18n', function(){
  var mlcl;
  var molecuel;
  var app;
  var i18n;

  before(function (done) {
    mlcl = function() {
      return this;
    };
    util.inherits(mlcl, EventEmitter);
    molecuel = new mlcl();
    molecuel.config = {};
    molecuel.config.i18n = {
      detectLngFromPath: true,
      languages: {
        en: {
          name: 'English',
          prefix: null,
          default: true
        },
        ru: {
          name: 'Russian',
          prefix: 'ru'
        }
      }
    };

    done();
  });

  describe('i18n', function () {
    it('should be a function', function () {
      assert('function' === typeof i18nmod);
    });
  });

  describe('functions', function(){

    before(function(){
      i18n = new i18nmod(molecuel);
    });

    it('should be a object', function () {
      assert('object' === typeof i18n);
    });

    it('should return the default lang', function(done) {
      var lang = i18n.getDefaultLang();
      assert(lang === 'en');
      done();
    });
  });

  describe('middleware', function() {
    before(function() {
      app = express();
      app.use(bodyParser());
      i18n.initApplication(app);
      app.get('*', function(err, res) {
        res.send(200);
      });
      app.listen(9002);
    });

    it('testing middleware language url detection', function(done) {
      var request = require('request');
      request('http://localhost:9002/ru/mytest', function (error, response, body) {
        if (!error && response.statusCode === 200) {
          assert(body === 'OK');
          assert(response.headers['x-mlcl-i18n-language'] === 'ru');
          done();
        }
      });
    });

    it('testing middleware url change rewrite', function(done) {
      var request = require('request');
      request('http://localhost:9002/ru/mytest', function (error, response, body) {
        if (!error && response.statusCode === 200) {
          assert(body === 'OK');
          assert(response.headers['x-mlcl-i18n-nolangurl'] === '/mytest');
          done();
        }
      });
    });
  });
});