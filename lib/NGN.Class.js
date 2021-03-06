var events  = require('events'),
    utils	= require('util');

/**
 * @class NGN.Class
 * @singleton
 * @private
 * @extends Class
 * This singleton exposes core business objects that node.js can use in an application. All NGN objects
 * inherit this class. It should never be used directly in application logic, but it should be used to
 * extend the NGN namespace/API.
 *
 * The factory provides common functionality that can be used throughout multiple objects in the
 * extended API. It provides business logic that is more specific to NGN than the {@link Class}.
 *
 * The following example is an extremely abbreviated version of the NGN.system.Person class.
 *     @example
 *     var Person = NGN.Class.extend({
 *         constructor: function( config ){
 *             Person.super.constructor.call( this, config );
 * 			   this.first = config.first  || 'Unknown';
 *             this.last  = config.last   || 'Unknown';
 *             this.middle= config.middle || null
 *         },
 *         describe: function() {
 *             console.log('This is '+this.first+' '+(this.middle!==null?this.middle:'')+this.last);
 *         },
 *         register: function() {
 * 	           // Register the user or save all attributes to a database.
 *         }
 *     });
 *
 *     // Create a module out of this.
 *     module.exports = Person;
 *
 * The factory provides a foundation on which the other objects can be built. Using the `Person` in the example above,
 * a developer could create and register a new user with the following approach:
 *
 *     @example
 *     var Person = new NGN.system.Person({ first:'John', last:'Doe' });
 *
 *     Person.register();
 *
 * NGN.**user**.Person is a dynamically constructed namespace, created primarily to more easily understand the business
 * logic of the API. {@link NGN} is responsible for constructing this namespace.
 * @requires NGN
 * @aside guide class_system
 */
var NGNClass = require('./Class').extend({

	/**
	 * @constructor
	 * Create an NGN core class.
	 */
	constructor: 	function( config ) {
		config = config || {};

		NGNClass.super.constructor.call(this, config);

		Object.defineProperties(this,{

			/**
			 * @property
			 * An event emitter for the class. Used internally.
			 * @protected
			 */
			_emitter: {
				value: new events.EventEmitter(),
				enumerable: false,
				writable:	true
			}
		});

		this._emitter.setMaxListeners(25);

	},

	/**
	 * @method once
	 * Adds a one time listener for the event. This listener is invoked only the
	 * next time the event is fired, after which it is removed.
	 * @param {String} eventName
	 * The name of the event to listen for.
   * @param {Function} [handler]
   * An optional handler function.
	 */
	once: function(eventName,handler){
	  this._emitter.once(eventName,handler||function(){});
	},

	/**
	 * @method setMaxListeners
	 * Set the maximum number of event listeners allowed before firing a warning.
	 * @param {Number} eventCount
	 * The maximum number of event listeners.
	 */
	setMaxListeners: function(eventCount){
	  this._emitter.setMaxListeners(eventCount);
	},

	/**
	 * @method removeAllListeners
	 * Remove all of the the event listeners on the object.
	 */
	removeAllListeners: function(){
	  this._emitter.removeAllListeners();
	},

	/**
	 * @method emit
	 * Emits an event respective of the object context (i.e. not bubbled to a global level event)
   * @param {String} eventName
   * The name of the event to emit.
   * @param {Object} [metadata]
   * An optional JSON object of metadata emitted with the event.
	 */
	emit: function( eventName, metadata ) {
		this._emitter.emit(eventName, metadata || null);
	},

  /**
   * @method
   * Fires the specified event. Unlike #emit, this event is bubbled to the [NGN Mechanic](#!/guide/mechanic) (when it is connected).
   * @param {String} eventName
   * The name of the event to emit.
   * @param {Object} [metadata]
   * An optional JSON object of metadata emitted with the event.
   */
  fireEvent: function( eventName, metadata ) {
    this.emit( eventName, metadata );
    if (process.hasOwnProperty('mechanic')) {
    	process.mechanic.send(eventName, metadata);
    }
  },

  /**
   * @method
   * Fires a warning event.
   * @param {String} warning
	 * The warning message.
	 * @param {Function} callback
	 * If the callback returns false, the event is prevented.
	 * @preventable
   */
  fireWarning:	function( warning, callback ) {
		callback = callback || function(){return true;};
		if (callback(warning)){
			//TODO: Add to logger
				console.log('WARNING:'.yellow.underline+' '+warning.toString().yellow);
			this._emitter.emit('warn',warning);
		}
  },

  /**
   * @method
   * Fires the specified error.
   * @param {String/Error} [error]
   * An optional error message.
   */
  fireError: function(error) {
			error = typeof error === 'string' ? new Error(error) : error;

			console.log("\n========================================".red);
			utils.error(error);
			console.log("========================================".red);

			var st = require('stack-trace'),
				trace = st.parse(error);
			while (trace.length > 0 && trace[0].fileName.indexOf('/node_modules/ngn') >= 0)
				trace.shift();
			for (var i=0;i<trace.length;i++){
				utils.puts(('\nOn line #'+trace[i].lineNumber+', column #'+trace[i].columnNumber).underline.red+'\n'+(trace[i].fileName||'').bold+(trace[i].functionName !== null ? '\nFunction: '.grey+trace[i].functionName.grey:''));
			}

			this.fireEvent('error',error);
			return true;
   },

	/**
	 * @method
	 * Listens for an event name and runs the callback when it is recognized.
	 * @param {String} eventName
   * The name of the event to emit.
	 * @param {Function} callback
	 * An optional callback method.
	 */
	on: function( eventName, callback ) {
		this._emitter.on(eventName, callback || NGN.emptyFn);
	},

	/**
	 * @method
	 * Adds multiple event listeners
 	 * @param {Array} evt
 	 * An array of event listeners.
	 */
	addEventListeners: function(evt){
  	for(var i=0;i<evt.length;i++){
  		this.on(evt[i].trim().toLowerCase(),this['on'+evt[i].trim()]);
	  }
	},

	/**
	 * @event error
	 * Fired when an error occurs
	 * @param {Object} e
	 * The error object.
	 */
	onError: function(e) {
		this.fireError(e);
	}
});

// Export the module for use in require() statements
module.exports = NGNClass;