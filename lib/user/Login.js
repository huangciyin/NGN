var events      = require('events'),
    request     = require('request'),
    everyauth   = require('everyauth'),
    NGN			= require('../NGN.Base');

/**
 * @class NGN.user.Login
 * Represents an OAuth or other third party login such as Facebook, Twitter, LinkedIn, etc.
 * 
 * This object makes interacting with user logins simple and abstracted from the OAuth process.
 * The key to success is in the configuration:
 * 
 * **Examples**
 * 
 * In this example, a configuration object is passed providing a person ID and login type. This approach would 
 * instantiate a {@link NGN.user.Person} for the specified account (i.e. user lookup).
 * 
 *     @example
 * 	   var Login = new NGN.user.Login({
 * 			person: 	'12345',
 * 			logintype:	'fb'		// Facebook shortcut
 * 	   });
 * 
 * Alternatively, a request object can be passed as the sole argument, in which case the login is simply populated.
 * 
 *     @example
 * 	   app.get('/',function(req,res){
 * 			var Login = new NGN.user.Login(req);
 * 
 * 			Login.authorize(function( success ){
 * 				res.send(success == true ? 200 : 401 );
 * 			});
 * 	   });
 * 	   
 * A hybrid configuration can also be instantiated by passing the optional {cfg#request} reference.
 * 
 *     @example
 * 	   app.get('/:person',function(req,res){
 * 			var Login = new NGN.user.Login({
 * 				person: req.params.person,
 * 				request: req
 * 	   		});
 * 	   });
 * @param {Object} [config] Configuration Object
 * @param {Object} [request] Request Object
 * @requires NGN
 * @requires events
 * @requires request
 * @requires everyauth
 * @docauthor Corey Butler
 * @extends NGN.Base
 */
var Login = NGN.extend({
	
	/**
	 * @constructor
	 */
	constructor: function( config ){
		
		Login.super.constructor.call( this, config );
		
		//TODO: If the config is a request object, create the login
		config			= config 			|| {};
		
		Object.defineProperties(this,{
			
			/**
			 * @cfg {Object} [request]
			 * The HTTP request stream returned from an OAuth authentication.
			 *     app.get('/',function(req,res){
			 * 			var Login = new NGN.user.Login(req);
			 * 
			 * 			Login.authorize(function( success ){
			 * 				res.send(success == true ? 200 : 401 );
			 * 			});
			 * 	   });
			 * 
			 */
			_request: {
				value:		config.request || {},
				enumerable:	false,
				writable:	false
			},
			
			/**
			 * @property {Object}
			 * @private
			 * Holds the data returned from an OAuth response
			 */
			_data: {
				value:		null,
				writable:	true,
				enumerable:	false
			},
			
			_id: {
				value:		null,
				enumerable:	false,
				writable:	true
			},
			
			/**
			 * @property {String}
			 * The login ID of the OAuth/third party provider.
			 */
			ID: {
				enumerable:	true,
				get:		function(){ return this._id; }
			},
			
			_accesstoken: {     // An optional access token, available only if the person logged in with an OAuth/2 account.
	            value:          null,
	            writable:       true,
	            enumerable:     false
	        },
			
			/**
			 * @property {String}
			 * The active access token
			 */
			accesstoken: {
				value:		null,
				enumerable:	true,
				get:            function(){
	                                if (!this.oauthprovider == null)
	                                    this.bus.emit('error',{type:'InvalidAttribute',message:'The attribute does not exist.',detail:'The ID attribute is only available after a get() or authenticate() or some other lookup method.'});
	                                else if (this.oauthprovider == 'email') {
	                                    this.bus.emit('warning','Access Tokens are only available for OAuth and OAuth 2 logins.');
	                                    return null;
	                                } else
	                                    return this._accessToken || null;
	                            },
	            set:            function(value){
	                                if (this._accessToken !== value){
	                                    //TODO: Trigger a cache update
	                                }
	                                this._accessToken = value;
	                            }
			},
			
			/**
			 * @property {String} [oauthprovider=null]
			 * A lowercase string representing the OAuth service provider. Examples include `facebook`, `twitter`, and `linkedin`.
			 * This property is only available when a valid #request is provided. However, it can also be set manually.
			 */
			oauthprovider: {
				value:		null,
				enumerable:	true,
				get:		function() {
								//TODO: Return the
								return this.request.user.type.trim().toLowerCase();
							}
			},
			
			/**
			 * @property {String} [oauth=null]
			 * The lowercase abbreviation of the #oauthprovider. Example: `fb` for Facebook.
			 */
			oauth: {
				value:		null,
				enumerable:	true,
				get:		function() {
                                switch (this.oauthprovider){
                                    case 'github':
                                        return 'gh';
                                    case 'facebook':
                                        return 'fb';
                                    case 'linkedin':
                                        return 'li';
                                    case 'twitter':
                                        return 'tw';
                                    case 'google':
                                        return 'gg';
                                    case 'openid':
                                        return 'oi';
                                    case 'yahoo':
                                        return 'yh';
                                    case 'dropbox':
                                        return 'db';
                                    case 'email':
                                        return 'eml';
                                    default:
                                        return null; 
                                }
									
							}
			},
			
			_modified: {
				value:          false,
	            writable:       true,
	            enumerable:     false
			},
			
			/**
			 * @property [modified=false]
			 * @readonly
			 * When the object is modified, this will be true.
			 */
			modified: {
	            enumerable:     true,
	            get:            function(){
	                                return this._modified;
	                            },
	            set:            function(){
	                                this.emit('error',{type:'InvalidSet',message:'This attribute cannot be set.',detail:'The modified attribute cannot be set directly.'});
	                            }                        
	        }
			
		});
		
	}
	
});

/**
 * @method processHttpRequest
 * @private
 * This method extracts information from the #request or any other HTTP request stream.
 * The #ID, #oauthprovider, #oauth, #data, and #accesstoken (if applicable) are extracted using `everyauth` (node).
 * `everyauth` appends a `user` attribute to `req` as `req.user`.  
 */
Login.prototype.processHttpRequest = function( req ) {
	
	this.ID 			= req.user.id;
	this._data			= req.user;
	this._accesstoken	= req.user.accessToken;
	this._oauthprovider = function (){
							for (var obj in req.user) {
								return obj.trim().toLowerCase();
							}
						}
}

/**
 * @method
 * @param {Object} [req=request]
 * Authenticate the request stream. By default, this uses the #request object.  
 */
Login.prototype.authenticate = function ( req ){
	req = req || this._request || null;
	if (req == null) {
		this.bus.emit('error','No request stream available.');
		return;
	}
	
	//TODO: Lookup the 
}



// Create a module out of this.
module.exports = Login;