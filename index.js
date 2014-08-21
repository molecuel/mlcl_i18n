/**
 * Created by dob on 19.11.13.
 */
var molecuel;

var i18next = require('i18next');
require('string.prototype.startswith');

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
  handleConfig.supportedLngs = this.supportedlang;
  i18next.init(handleConfig);
  this.i18next = i18next;

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
      lang: { type: String, enum: i18n.supportedlang, required: true},
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

module.exports = init;
