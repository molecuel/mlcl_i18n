/**
 * Created by dob on 19.11.13.
 */
var molecuel;

var i18next = require('i18next');
var middleware = require('i18next-express-middleware');
var Backend = require('i18next-node-fs-backend');
var moment = require('moment-timezone');
var fs = require('fs');
var path = require('path');
require('string.prototype.startswith');

var i18n = function() {
  this.config = molecuel.config.i18n;
  this.defaultlang = this.getDefaultLang();
  this.supportedlang = this.getSupportedLanguages();
  this.moment = moment;
  var handleConfig = {};
  if(this.config.detectLngFromPath === true) {
    handleConfig.detectLngFromPath = 0;
  }
  var self = this;
  handleConfig.useCookie = true;
  handleConfig.forceDetectLngFromPath = true;
  if(this.config.debug) {
    handleConfig.debug = true;
  }
  handleConfig.fallbackLng = this.defaultlang;
  handleConfig.whitelist = this.supportedlang;
  handleConfig.backend = {};
  // path where resources get loaded from
  handleConfig.backend.loadPath = path.resolve(process.cwd()) + '/config/locales/{{lng}}/{{ns}}.json';
  // option to defined loadPath via config
  if(molecuel.config.i18n && molecuel.config.i18n.backend && molecuel.config.i18n.backend.loadPath) {
    handleConfig.backend.loadPath = molecuel.config.i18n.backend.loadPath;
  }
  handleConfig.detection = {
    order: ['path', 'querystring', 'cookie', 'header']
  };

  i18next
  .use(middleware.LanguageDetector)
  .use(Backend)
  .init(handleConfig);

  this.i18next = i18next;

  // load all languages
  this.i18next.loadLanguages(Object.keys(this.config.languages));

  /**
   * Add plugin to the created models
   */
  molecuel.on('mlcl::elements::registerSchema:post', function(elements, schemaname, modelRegistryElement) {
    self.elements = elements;
    var options = modelRegistryElement.options;
    var model =  modelRegistryElement.schema;
    // check if the schema configuration avoids url creation.
    if(options && !options.avoidTranslate) {
      model.plugin(self._schemaPlugin, {modelname: schemaname});
    }
  });

  /**
   * Register view helper
   */
  molecuel.on('mlcl::view::register:helper', function(view) {
    self.registerViewHelpers(view);
  });

  molecuel.emit('mlcl::i18n::init:post', this);
};

/* ************************************************************************
 SINGLETON CLASS DEFINITION
 ************************************************************************ */
var instance = null;

/**
 * Singleton getInstance definition
 * @return singleton class
 */
var getInstance = function() {
  if(instance === null){
    instance = new i18n();
  }
  return instance;
};

function init(m) {
  molecuel = m;
  return getInstance();
}

/**
 * Get instances for string and date localization
 * @return {[localizationObject]} [Object containing date and string localization instances]
 */
i18n.prototype.getLocalizationInstanceForLanguage = function(lang) {
  var localizationObject = function(lang, moment, i18next) {
    this.lang = lang;
    this.origmoment = moment;
    this.i18next = i18next.cloneInstance({lng: lang});
  };
  localizationObject.prototype.setLang = function(lang) {
    this.lang = lang;
  };
  localizationObject.prototype.getLang = function() {
    return this.lang;
  };
  // set the locale in a new moment instance
  localizationObject.prototype.moment = function(datestring) {
    return this.origmoment(datestring).locale(this.lang);
  };
  return new localizationObject(lang, this.moment, this.i18next);
};

/**
 * init module
 * @param app
 */
i18n.prototype.initApplication = function(app) {
  app.use(middleware.handle(this.i18next));
  app.use(function(req, res, next) {
    if(req.language) {
      req.prelangurl = req.url;
      var path = '/'+req.language;
      //var index = req.url.indexOf(path);
      if(req.url.startsWith(path)) {
        var str = req.url.substr(path.length);
        req.url = str;
        res.setHeader('x-mlcl-i18n-prelangurl', req.prelangurl);
        res.setHeader('x-mlcl-i18n-nolangurl', req.url);
      } else {
        if (req.url.charAt(0) !== '/') {
          req.url = req.url + '/';
        }
      }
      res.setHeader('X-mlcl-i18n-language', req.language);
    }
    next();
  });
};

/**
 * Get the default language
 * @returns {string}
 */
i18n.prototype.getDefaultLang = function getDefaultLang() {
  var target = this.config.languages;
  for (var k in target){
    if (target.hasOwnProperty(k)) {
      if(target[k].default) {
        return k;
      }
    }
  }
};

/**
 * Register the model
 * @param modelname
 * @param model
 * @param indexable
 */
/**
 * Return the definition of the plugin
 * @param schema
 * @param options
 */
i18n.prototype._schemaPlugin = function _schemaPlugin(schema, options) {
  var i18n = getInstance();
  if(options.modelname) {
    schema.add({
      lang: { type: String, enum: i18n.supportedlang, required: true, list: true},
      translations: [
        {
          lang: {type: String, enum: i18n.supportedlang, form: {hidden: true}},
          url: {type: String, form: {hidden: true}},
          element: {type: i18n.elements.ObjectId, ref: options.modelname, form: {hidden: true}},
          title: {type: String, form: {hidden: true}}
        }
      ]

    });
  }
};

/**
 * Get the translations for the frontend as json or in the defined format
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
i18n.prototype.getTranslation = function getTranslation(req, res) {
  if(req.params.language) {
    var namespace = 'translation';
    if(req.params.namespace) {
      namespace = req.params.namespace;
    }
    fs.readFile(path.resolve(process.cwd()) + '/config/locales/'+req.params.language+'/'+namespace+'.json', 'utf8', function(err, file) {
      if(!err) {
        var langobject = JSON.parse(file);
        if(req.query.format === 'ng') {
          var langwrap = {};
          langwrap[req.params.language] = langobject;
          res.send(langwrap);
        } else {
          res.send(langobject);
        }
      } else {
        res.send({});
      }
    });
  } else {
    res.status(404).send();
  }
};

/**
 * Get the languages supported by the system
 * @returns {Array}
 */
i18n.prototype.getSupportedLanguages = function getSupportedLanguages() {
  var target = this.config.languages;
  var supported = [];
  for (var k in target){
    if (target.hasOwnProperty(k)) {
      supported.push(k);
    }
  }
  return supported;
};

i18n.prototype.registerViewHelpers = function registerViewHelpers(view) {

  view.registerHelper('i18n:t', function(str) {
    return i18next.t(str);
  });

  view.registerRequestHelper('i18n:l', function(view, req) {
    return function() {
      return 'the Language = ' + req.language;
    };
  });
};


module.exports = init;
