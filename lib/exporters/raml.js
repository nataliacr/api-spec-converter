var Endpoint = require('../entities/endpoint'),
    Exporter = require('./exporter'),
    YAML = require('json2yaml')

//TODO right now, no hiearachy support yet
//SL doesn't contain those info anyway

function RAMLDefinition(title) {
  this.title = title
  //TODO anyway to know version?
  this.version = "v1"
  this.baseUri = ""
  //TODO how to know globabl media Type from stoplight?
  this.mediaType = ""
  //TODO any way to get supported protocols?
  this.protocols = ""

  //TODO any way to get the SL documentation
  this.documentation = []
}


function RAML() {
  this.metadata = null
}

RAML.prototype = new Exporter()

function mapBody(bodyData){
  var body = {}
  if (bodyData.body) {
    //TODO default as applicaiton/json, is it OK?
    var mimeType = bodyData.mimeType || 'application/json'
    body[mimeType] = {
      example: bodyData.example || '',
      schema: bodyData.body
    }
  }
  return body
}

function mapHeaders(headerData){
  var headers = {}
  headers = headerData.properties
  return headers
}

function mapResponses(responseData){
  var responses = {}
  for(var i=0; i< responseData.length; i++) {
    resBody = responseData[i]
    if(resBody.codes.length>0) {
      var code = resBody.codes[0]
      responses[code] = {
        body: {}
      }

      var type = resBody.mimeType || 'application/json'
      responses[code]['body'][type] = {
        'schema': resBody.body,
        'example': resBody.example
      }
    }
  }
  return responses
}

function mapQueryParams(queryParams) {
  var queryString = {}
  for(var key in queryParams.properties) {
    queryString[key] = queryParams.properties[key]
    if(queryParams.required.indexOf(key) > -1){
      queryString[key].required = true
    }
  }
  return queryString
}

function mapPathParams(pathParamData) {
  var pathParams = {}
  for(var key in pathParamData) {
    pathParams[key] = {}
    if(pathParamData[key].description) {
      pathParams[key].description = pathParamData[key].description
    }
    if(pathParamData[key].type) {
      pathParams[key].type = pathParamData[key].type
    }
  }
  return pathParams
}


RAML.prototype.map = function () {
  ramlDef = new RAMLDefinition(this.project.Name)
  ramlDef.baseUri = this.project.Environment.Host + this.project.Environment.BasePath

  var endpoints = this.project.Endpoints
  for(var i in endpoints) {

    var endpoint = endpoints[i], parameters = []

    var method = {
      displayName: endpoint.Name,
      description: endpoint.Description
    }

    if (endpoint.Method.toLowerCase() === "post" || endpoint.Method.toLowerCase() === "put") {
      method.body = mapBody(endpoint.Body)
    }

    method.headers = mapHeaders(endpoint.Headers)

    method.responses = mapResponses(endpoint.Responses)

    method.queryParameters = mapQueryParams(endpoint.QueryString)

    if(!ramlDef.hasOwnProperty(endpoint.Path)) {
      //Not found, create new resource
      var resource = {
        displayName: endpoint.Path, //TODO we don't have name in group wise
      }
      resource[endpoint.Method] = method
      resource.uriParameters = mapPathParams(endpoint.PathParams)
      ramlDef[endpoint.Path] = resource
    }
    else {
      //add to existing resource
      var res = ramlDef[endpoint.Path]
      res[endpoint.Method] = method
    }
  }

  this.data = ramlDef
}

RAML.prototype.getData = function(format) {
  switch (format) {
    case 'yaml':
      return "#%RAML 0.8\n"+YAML.stringify(this.data)
    default:
      throw Error('RAML doesn not support '+format+' format')
  }
}

module.exports = RAML