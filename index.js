/**
 * Created by dob on 19.11.13.
 */
var molecuel;

var i18next = require('i18next');

var i18n = function() {
  this.config = molecuel.config.i18n;
  this.defaultlang = this.getDefaultLang();
  this.supportedlang = this.getSupportedLanguages();
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
  handleConfig.supportedlang = this.supportedlang;
  i18next.init(handleConfig, function() {
    self.i18next = i18next;
  });
  molecuel.on('mlcl::elements::registerSchema:pre', function(module, schemaname, schema) {
    // check if we should avoid translation for that model
    self.elements = module;
    if(!self.elements.schemaDefinitionRegistry[schemaname].config.avoidTranslate) {
      self._registerSchema(schemaname, schema);
    }
  });
};

/* ************************************************************************
 SINGLETON CLASS DEFINITION
 ************************************************************************ */
var instance = null;

/**
 * Singleton getInstance definition
 * @return singleton class
 */
var getInstance = function(){
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
 * init module
 * @param app
 */
i18n.prototype.initApplication = function(app) {
  app.use(this.i18next.handle);
  app.use(function(req, res, next) {
    if(req.language) {
      req.prelangurl = req.url;
      var path = '/'+req.language;
      var index = req.url.indexOf(path);
      if(index !== -1) {
        var str = req.url.substr(path.length);
        req.url = str;
        res.setHeader('x-mlcl-i18n-prelangurl', req.prelangurl);
        res.setHeader('x-mlcl-i18n-nolangurl', req.url);
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
i18n.prototype._registerSchema = function(schemaname) {
  var i18nschema = {
    lang: { type: String },
    translations: [
      {
        language: {type: String, enum: this.supportedlang},
        element: {type: this.elements.ObjectId, ref: schemaname}
      }
    ]
  };
  this.elements.addToSchemaDefinition(schemaname, i18nschema);
};

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

module.exports = init;