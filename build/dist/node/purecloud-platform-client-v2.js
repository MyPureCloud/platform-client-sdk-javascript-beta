'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var superagent = _interopDefault(require('superagent'));

/**
 * @module purecloud-platform-client-v2/ApiClient
 * @version 26.1.1
 */
class ApiClient {
	/**
	 * Singleton getter
	 */
	get instance() {
		return ApiClient.instance;
	}

	/**
	 * Singleton setter
	 */
	set instance(value) {
		ApiClient.instance = value;
	}

	/**
	 * Manages low level client-server communications, parameter marshalling, etc. There should not be any need for an
	 * application to use this class directly - the *Api and model classes provide the public API for the service. The
	 * contents of this file should be regarded as internal but are documented for completeness.
	 * @alias module:purecloud-platform-client-v2/ApiClient
	 * @class
	 */
	constructor() {
		/**
		 * @description The default API client implementation.
		 * @type {module:purecloud-platform-client-v2/ApiClient}
		 */
		if(!ApiClient.instance){
			ApiClient.instance = this;
		}

		/**
		 * Enumeration of collection format separator strategies.
		 * @enum {String} 
		 * @readonly
		 */
		this.CollectionFormatEnum = {
			/**
			 * Comma-separated values. Value: <code>csv</code>
			 * @const
			 */
			CSV: ',',
			/**
			 * Space-separated values. Value: <code>ssv</code>
			 * @const
			 */
			SSV: ' ',
			/**
			 * Tab-separated values. Value: <code>tsv</code>
			 * @const
			 */
			TSV: '\t',
			/**
			 * Pipe(|)-separated values. Value: <code>pipes</code>
			 * @const
			 */
			PIPES: '|',
			/**
			 * Native array. Value: <code>multi</code>
			 * @const
			 */
			MULTI: 'multi'
		};

		/**
		 * @description Value is `true` if local storage exists. Otherwise, false.
		 */
		try {
			localStorage.setItem('purecloud_local_storage_test', 'purecloud_local_storage_test');
			localStorage.removeItem('purecloud_local_storage_test');
			this.hasLocalStorage = true;
		} catch(e) {
			this.hasLocalStorage = false;
		}

		/**
		 * The base URL against which to resolve every API call's (relative) path.
		 * @type {String}
		 * @default https://api.mypurecloud.com
		 */
		this.setEnvironment('https://api.mypurecloud.com');

		/**
		 * The authentication methods to be included for all API calls.
		 * @type {Array.<String>}
		 */
		this.authentications = {
			'PureCloud Auth': {type: 'oauth2'}
		};

		/**
		 * The default HTTP headers to be included for all API calls.
		 * @type {Array.<String>}
		 * @default {}
		 */
		this.defaultHeaders = {};

		/**
		 * The default HTTP timeout for all API calls.
		 * @type {Number}
		 * @default 60000
		 */
		this.timeout = 16000;

		this.authData = {};
		this.settingsPrefix = 'purecloud';

		// Expose superagent module for use with superagent-proxy
		this.superagent = superagent;

		if (typeof(window) !== 'undefined') window.ApiClient = this;
	}

	/**
	 * @description Sets the debug log to enable debug logging
	 * @param {log} debugLog - In most cases use `console.log`
	 * @param {integer} maxLines - (optional) The max number of lines to write to the log. Must be > 0.
	 */
	setDebugLog(debugLog, maxLines) {
		this.debugLog = debugLog;
		this.debugLogMaxLines = (maxLines && maxLines > 0) ? maxLines : undefined;
	}

	/**
	 * @description If set to `true`, the response object will contain additional information about the HTTP response. When `false` (default) only the body object will be returned.
	 * @param {boolean} returnExtended - `true` to return extended responses
	 */
	setReturnExtendedResponses(returnExtended) {
		this.returnExtended = returnExtended;
	}

	/**
	 * @description When `true`, persists the auth token to local storage to avoid a redirect to the login page on each page load. Defaults to `false`.
	 * @param {boolean} doPersist - `true` to persist the auth token to local storage
	 * @param {string} prefix - (Optional, default 'purecloud') The name prefix used for the local storage key
	 */
	setPersistSettings(doPersist, prefix) {
		this.persistSettings = doPersist;
		this.settingsPrefix = prefix ? prefix.replace(/\W+/g, '_') : 'purecloud';
		this._debugTrace(`this.settingsPrefix=${this.settingsPrefix}`);
	}

	/**
	 * @description Saves the auth token to local storage, if enabled.
	 */
	_saveSettings(opts) {
		try {
			if (opts.accessToken) {
				this.authData.accessToken = opts.accessToken;
				this.authentications['PureCloud Auth'].accessToken = opts.accessToken;
			}

			if (opts.state) {
				this.authData.state = opts.state;
			}

			if (opts.tokenExpiryTime) {
				this.authData.tokenExpiryTime = opts.tokenExpiryTime;
				this.authData.tokenExpiryTimeString = opts.tokenExpiryTimeString;
			}

			// Don't save settings if we aren't supposed to be persisting them
			if (this.persistSettings !== true) return;

			// Ensure we can access local storage
			if (!this.hasLocalStorage) {
				this._debugTrace('Warning: Cannot access local storage. Settings will not be saved.');
				return;
			}

			// Remove state from data so it's not persisted
			let tempData = JSON.parse(JSON.stringify(this.authData));
			delete tempData.state;

			// Save updated auth data
			localStorage.setItem(`${this.settingsPrefix}_auth_data`, JSON.stringify(tempData));
			this._debugTrace('Auth data saved to local storage');
		} catch (e) {
			console.error(e);
		}
	}

	/**
	 * @description Loads settings from local storage, if enabled.
	 */
	_loadSettings() {
		// Don't load settings if we aren't supposed to be persisting them
		if (this.persistSettings !== true) return;

		// Ensure we can access local storage
		if (!this.hasLocalStorage) {
			this._debugTrace('Warning: Cannot access local storage. Settings will not be loaded.');
			return;
		}

		// Load current auth data
		const tempState = this.authData.state;
		this.authData = localStorage.getItem(`${this.settingsPrefix}_auth_data`);
		if (!this.authData) 
			this.authData = {};
		else
			this.authData = JSON.parse(this.authData);
		if (this.authData.accessToken) this.setAccessToken(this.authData.accessToken);
		this.authData.state = tempState;
	}

	/**
	 * @description Sets the environment used by the session
	 * @param {string} environment - (Optional, default "mypurecloud.com") Environment the session use, e.g. mypurecloud.ie, mypurecloud.com.au, etc.
	 */
	setEnvironment(environment) {
		if (!environment)
			environment = 'mypurecloud.com';

		// Strip trailing slash
		environment = environment.replace(/\/+$/, '');

		// Strip protocol and subdomain
		if (environment.startsWith('https://'))
			environment = environment.substring(8);
		if (environment.startsWith('http://'))
			environment = environment.substring(7);
		if (environment.startsWith('api.'))
			environment = environment.substring(4);

		// Set vars
		this.environment = environment;
		this.basePath = `https://api.${environment}`;
		this.authUrl = `https://login.${environment}`;
	}

	/**
	 * @description Initiates the implicit grant login flow. Will attempt to load the token from local storage, if enabled.
	 * @param {string} clientId - The client ID of an OAuth Implicit Grant client
	 * @param {string} redirectUri - The redirect URI of the OAuth Implicit Grant client
	 * @param {object} opts - (optional) Additional options 
	 * @param {string} opts.state - (optional) An arbitrary string to be passed back with the login response. Used for client apps to associate login responses with a request.
	 */
	loginImplicitGrant(clientId, redirectUri, opts) {
		// Check for auth token in hash
		this._setValuesFromUrlHash();

		this.clientId = clientId;
		this.redirectUri = redirectUri;

		if (!opts) opts = {};

		return new Promise((resolve, reject) => {
			this._testTokenAccess()
				.then(() => {
					if (!this.authData.state && opts.state)
						this.authData.state = opts.state;
					resolve(this.authData);
				})
				.catch((error) => {
					this._debugTrace('Error encountered during login. This is normal if the application has not yet been authorized.');
					this._debugTrace(error);
					var query = {
						client_id: encodeURIComponent(this.clientId),
						redirect_uri: encodeURI(this.redirectUri),
						response_type: 'token'
					};
					if (opts.state)
						query.state = encodeURIComponent(opts.state);

					var url = this._buildAuthUrl('oauth/authorize', query);
					this._debugTrace(`Implicit grant: redirecting to ${url} for authorization...`);
					window.location.replace(url);
				});
		});
	}

	/**
	 * @description Initiates the client credentials login flow. Only available in node apps.
	 * @param {string} clientId - The client ID of an OAuth Implicit Grant client
	 * @param {string} clientSecret - The client secret of an OAuth Implicit Grant client
	 */
	loginClientCredentialsGrant(clientId, clientSecret) {
		this.clientId = clientId;
		var authHeader = new Buffer(`${clientId}:${clientSecret}`).toString('base64');

		return new Promise((resolve, reject) => {
			// Block browsers from using client credentials
			if (typeof window !== 'undefined') {
				reject(new Error('The client credentials grant is not supported in a browser.'));
				return;
			}

			// Build token request
			var request = superagent('POST', `https://login.${this.environment}/oauth/token`);
			if (this.proxy && request.proxy) {
				request.proxy(this.proxy);
			}
			request.set('Authorization', `Basic ${authHeader}`);
			request.send('grant_type=client_credentials');

			// Execute request
			request.end((error, response) => {
				if (error) {
					reject(error);
				} else {
					this.setAccessToken(response.body['access_token']);
					this._debugTrace(`Access token expires in ${response.body['expires_in']} seconds`);
					resolve();
				}
			});
		});
	}

	/**
	 * @description Loads token from storage, if enabled, and checks to ensure it works.
	 */
	_testTokenAccess() {
		return new Promise((resolve, reject) => {
			// Load from storage
			this._loadSettings();

			// Check if there is a token to test
			if (!this.authentications['PureCloud Auth'].accessToken) {
				reject(new Error('Token is not set'));
				return;
			}

			// Test token
			this.callApi('/api/v2/authorization/permissions', 'GET', 
				null, null, null, null, null, ['PureCloud Auth'], ['application/json'], ['application/json'])
				.then(() => {
					resolve();
				})
				.catch((error) => {
					this._saveSettings({ accessToken: undefined });
					reject(error);
				});
		});
	}

	/**
	 * @description Parses the URL hash, grabs the access token, and clears the hash. If no access token is found, no action is taken.
	 */
	_setValuesFromUrlHash() {
		// Check for window
		if(!(typeof window !== 'undefined' && window.location.hash)) return;

		// Process hash string into object
		var hash = window.location.hash
			.slice(1).split('&')
			.reduce((obj, pair) => {
				var keyValue = pair.split('=');
				obj[keyValue[0]] = keyValue[1];
				return obj;
			}, {});

		// Everything goes in here because we only want to act if we found an access token
		if (hash.access_token) {
			let opts = {};

			if (hash.state) {
				/* Auth does some interesting things with encoding. It encodes the data twice, except 
				 * for spaces, then replaces all spaces with a plus sign. This process must be done 
				 * in reverse order to properly extract the state data. 
				 */
				opts.state = decodeURIComponent(decodeURIComponent(hash.state.replace(/\+/g, '%20')));
			}

			if (hash.expires_in) {
				opts.tokenExpiryTime = (new Date()).getTime() + (parseInt(decodeURIComponent(decodeURIComponent(hash.expires_in.replace(/\+/g, '%20')))) * 1000);
				opts.tokenExpiryTimeString = (new Date(opts.tokenExpiryTime)).toUTCString();
			}
			// Set access token
			opts.accessToken = decodeURIComponent(decodeURIComponent(hash.access_token.replace(/\+/g, '%20')));

			// Remove hash from URL
			// Credit: https://stackoverflow.com/questions/1397329/how-to-remove-the-hash-from-window-location-with-javascript-without-page-refresh/5298684#5298684
			var scrollV, scrollH, loc = window.location;
			if ('replaceState' in history) {
				history.replaceState('', document.title, loc.pathname + loc.search);
			} else {
				// Prevent scrolling by storing the page's current scroll offset
				scrollV = document.body.scrollTop;
				scrollH = document.body.scrollLeft;

				// Remove hash
				loc.hash = '';

				// Restore the scroll offset, should be flicker free
				document.body.scrollTop = scrollV;
				document.body.scrollLeft = scrollH;
			}

			this._saveSettings(opts);
		}
	}

	/**
	 * @description Sets the access token to be used with requests
	 * @param {string} token - The access token
	 */
	setAccessToken(token) {
		this._saveSettings({ accessToken: token });
	}

	/**
	 * @description Sets the storage key to use when persisting the access token
	 * @param {string} storageKey - The storage key name
	 */
	setStorageKey(storageKey) {
		// Set storage key
		this.storageKey = storageKey;

		// Trigger storage of current token
		this.setAccessToken(this.authentications['PureCloud Auth'].accessToken);
	}

	/**
	 * @description Redirects the user to the PureCloud logout page
	 */
	logout() {
		if(this.hasLocalStorage) {
			this._saveSettings({
				accessToken: undefined,
				state: undefined,
				tokenExpiryTime: undefined,
				tokenExpiryTimeString: undefined
			});
		}

		var query = {
			client_id: encodeURIComponent(this.clientId),
			redirect_uri: encodeURI(this.redirectUri)
		};

		var url = this._buildAuthUrl('logout', query);
		window.location.replace(url);
	}

	/**
	 * @description Constructs a URL to the auth server
	 * @param {string} path - The path for the URL
	 * @param {object} query - An object of key/value pairs to use for querystring keys/values
	 */
	_buildAuthUrl(path, query) {
		if (!query) query = {};
		return Object.keys(query).reduce((url, key) => !query[key] ? url : `${url}&${key}=${query[key]}`, `${this.authUrl}/${path}?`);
	}

	/**
	 * Returns a string representation for an actual parameter.
	 * @param param The actual parameter.
	 * @returns {String} The string representation of <code>param</code>.
	 */
	paramToString(param) {
		if (!param) {
			return '';
		}
		if (param instanceof Date) {
			return param.toJSON();
		}
		return param.toString();
	}

	/**
	 * Builds full URL by appending the given path to the base URL and replacing path parameter place-holders with parameter values.
	 * NOTE: query parameters are not handled here.
	 * @param {String} path The path to append to the base URL.
	 * @param {Object} pathParams The parameter values to append.
	 * @returns {String} The encoded path with parameter values substituted.
	 */
	buildUrl(path, pathParams) {
		if (!path.match(/^\//)) {
			path = `/${path}`;
		}
		var url = this.basePath + path;
		url = url.replace(/\{([\w-]+)\}/g, (fullMatch, key) => {
			var value;
			if (pathParams.hasOwnProperty(key)) {
				value = this.paramToString(pathParams[key]);
			} else {
				value = fullMatch;
			}
			return encodeURIComponent(value);
		});
		return url;
	}

	/**
	 * Checks whether the given content type represents JSON.<br>
	 * JSON content type examples:<br>
	 * <ul>
	 * <li>application/json</li>
	 * <li>application/json; charset=UTF8</li>
	 * <li>APPLICATION/JSON</li>
	 * </ul>
	 * @param {String} contentType The MIME content type to check.
	 * @returns {Boolean} <code>true</code> if <code>contentType</code> represents JSON, otherwise <code>false</code>.
	 */
	isJsonMime(contentType) {
		return Boolean(contentType && contentType.match(/^application\/json(;.*)?$/i));
	}

	/**
	 * Chooses a content type from the given array, with JSON preferred; i.e. return JSON if included, otherwise return the first.
	 * @param {Array.<String>} contentTypes
	 * @returns {String} The chosen content type, preferring JSON.
	 */
	jsonPreferredMime(contentTypes) {
		for (var i = 0; i < contentTypes.length; i++) {
			if (this.isJsonMime(contentTypes[i])) {
				return contentTypes[i];
			}
		}
		return contentTypes[0];
	}

	/**
	 * Checks whether the given parameter value represents file-like content.
	 * @param param The parameter to check.
	 * @returns {Boolean} <code>true</code> if <code>param</code> represents a file. 
	 */
	isFileParam(param) {
		// fs.ReadStream in Node.js (but not in runtime like browserify)
		if (typeof window === 'undefined' &&
				typeof require === 'function' &&
				require('fs') &&
				param instanceof require('fs').ReadStream) {
			return true;
		}
		// Buffer in Node.js
		if (typeof Buffer === 'function' && param instanceof Buffer) {
			return true;
		}
		// Blob in browser
		if (typeof Blob === 'function' && param instanceof Blob) {
			return true;
		}
		// File in browser (it seems File object is also instance of Blob, but keep this for safe)
		if (typeof File === 'function' && param instanceof File) {
			return true;
		}
		return false;
	}

	/**
	 * Normalizes parameter values:
	 * <ul>
	 * <li>remove nils</li>
	 * <li>keep files and arrays</li>
	 * <li>format to string with `paramToString` for other cases</li>
	 * </ul>
	 * @param {Object.<String, Object>} params The parameters as object properties.
	 * @returns {Object.<String, Object>} normalized parameters.
	 */
	normalizeParams(params) {
		var newParams = {};
		for (var key in params) {
			if (params.hasOwnProperty(key) && params[key]) {
				var value = params[key];
				if (this.isFileParam(value) || Array.isArray(value)) {
					newParams[key] = value;
				} else {
					newParams[key] = this.paramToString(value);
				}
			}
		}
		return newParams;
	}

	/**
	 * Builds a string representation of an array-type actual parameter, according to the given collection format.
	 * @param {Array} param An array parameter.
	 * @param {module:purecloud-platform-client-v2/ApiClient.CollectionFormatEnum} collectionFormat The array element separator strategy.
	 * @returns {String|Array} A string representation of the supplied collection, using the specified delimiter. Returns
	 * <code>param</code> as is if <code>collectionFormat</code> is <code>multi</code>.
	 */
	buildCollectionParam(param, collectionFormat) {
		if (!param) return;

		switch (collectionFormat) {
			case 'csv':
				return param.map(this.paramToString).join(',');
			case 'ssv':
				return param.map(this.paramToString).join(' ');
			case 'tsv':
				return param.map(this.paramToString).join('\t');
			case 'pipes':
				return param.map(this.paramToString).join('|');
			case 'multi':
				// return the array directly as SuperAgent will handle it as expected
				return param.map(this.paramToString);
			default:
				throw new Error(`Unknown collection format: ${collectionFormat}`);
		}
	}

	/**
	 * Applies authentication headers to the request.
	 * @param {Object} request The request object created by a <code>superagent()</code> call.
	 * @param {Array.<String>} authNames An array of authentication method names.
	 */
	applyAuthToRequest(request, authNames) {
		authNames.forEach((authName) => {
			var auth = this.authentications[authName];
			switch (auth.type) {
				case 'basic':
					if (auth.username || auth.password) {
						request.auth(auth.username || '', auth.password || '');
					}
					break;
				case 'apiKey':
					if (auth.apiKey) {
						var data = {};
						if (auth.apiKeyPrefix) {
							data[auth.name] = `${auth.apiKeyPrefix} ${auth.apiKey}`;
						} else {
							data[auth.name] = auth.apiKey;
						}
						if (auth['in'] === 'header') {
							request.set(data);
						} else {
							request.query(data);
						}
					}
					break;
				case 'oauth2':
					if (auth.accessToken) {
						request.set({'Authorization': `Bearer ${auth.accessToken}`});
					}
					break;
				default:
					throw new Error(`Unknown authentication type: ${auth.type}`);
			}
		});
	}

	/**
	 * Invokes the REST service using the supplied settings and parameters.
	 * @param {String} path The base URL to invoke.
	 * @param {String} httpMethod The HTTP method to use.
	 * @param {Object.<String, String>} pathParams A map of path parameters and their values.
	 * @param {Object.<String, Object>} queryParams A map of query parameters and their values.
	 * @param {Object.<String, Object>} headerParams A map of header parameters and their values.
	 * @param {Object.<String, Object>} formParams A map of form parameters and their values.
	 * @param {Object} bodyParam The value to pass as the request body.
	 * @param {Array.<String>} authNames An array of authentication type names.
	 * @param {Array.<String>} contentTypes An array of request MIME types.
	 * @param {Array.<String>} accepts An array of acceptable response MIME types.types or the
	 * constructor for a complex type.
	 * @returns {Promise} A Promise object.
	 */
	callApi(path, httpMethod, pathParams, queryParams, headerParams, formParams, bodyParam, authNames, contentTypes, accepts) {
		var url = this.buildUrl(path, pathParams);
		var request = superagent(httpMethod, url);

		if (this.proxy && request.proxy) {
			request.proxy(this.proxy);
		}

		if(this.debugLog){
			var trace = `[REQUEST] ${httpMethod} ${url}`;
			if(pathParams && Object.keys(pathParams).count > 0 && pathParams[Object.keys(pathParams)[0]]){
				trace += `\nPath Params: ${JSON.stringify(pathParams)}`;
			}

			if(queryParams && Object.keys(queryParams).count > 0 && queryParams[Object.keys(queryParams)[0]]){
				trace += `\nQuery Params: ${JSON.stringify(queryParams)}`;
			}

			if(bodyParam){
				trace += `\nnBody: ${JSON.stringify(bodyParam)}`;
			}

			this._debugTrace(trace);
		}

		// apply authentications
		this.applyAuthToRequest(request, authNames);

		// set query parameters
		request.query(this.normalizeParams(queryParams));

		// set header parameters
		request.set(this.defaultHeaders).set(this.normalizeParams(headerParams));
		//request.set({ 'purecloud-sdk': '26.1.1' });

		// set request timeout
		request.timeout(this.timeout);

		var contentType = this.jsonPreferredMime(contentTypes);
		if (contentType) {
			request.type(contentType);
		} else if (!request.header['Content-Type']) {
			request.type('application/json');
		}

		if (contentType === 'application/x-www-form-urlencoded') {
			request.send(this.normalizeParams(formParams));
		} else if (contentType == 'multipart/form-data') {
			var _formParams = this.normalizeParams(formParams);
			for (var key in _formParams) {
				if (_formParams.hasOwnProperty(key)) {
					if (this.isFileParam(_formParams[key])) {
						// file field
						request.attach(key, _formParams[key]);
					} else {
						request.field(key, _formParams[key]);
					}
				}
			}
		} else if (bodyParam) {
			request.send(bodyParam);
		}

		var accept = this.jsonPreferredMime(accepts);
		if (accept) {
			request.accept(accept);
		}

		return new Promise((resolve, reject) => {
			request.end((error, response) => {
				if (error) {
					console.log(error);
					if (!response) {
						console.log('Response object was not defined!');
						reject({
							status: 0,
							statusText: 'error',
							headers: [],
							body: {},
							text: 'error',
							error: error
						});
						return;
					}
				}

				// Build response object
				var data = (this.returnExtended === true || error) ? {
					status: response.status,
					statusText: response.statusText,
					headers: response.headers,
					body: response.body,
					text: response.text,
					error: error
				} : response.body ? response.body : response.text;

				// Debug logging
				if (this.debugLog) {
					var trace = `[RESPONSE] ${response.status}: ${httpMethod} ${url}`;
					if (response.headers)
						trace += `\ninin-correlation-id: ${response.headers['inin-correlation-id']}`;
					if (response.body)
						trace += `\nBody: ${JSON.stringify(response.body,null,2)}`;

					// Log trace message
					this._debugTrace(trace);

					// Log stack trace
					if (error)
						this._debugTrace(error);
				}

				// Resolve promise
				if (error) {
					reject(data);
				} else {
					resolve(data);
				}
			});
		});
	}

	/**
	 * @description Parses an ISO-8601 string representation of a date value.
	 * @param {String} str The date value as a string.
	 * @returns {Date} The parsed date object.
	 */
	parseDate(str) {
		return new Date(str.replace(/T/i, ' '));
	}

	/**
	 * @description Logs to the debug log
	 * @param {String} str The date value as a string.
	 * @returns {Date} The parsed date object.
	 */
	_debugTrace(trace) {
		if (!this.debugLog) return;

		if (typeof(trace) === 'string') {
			// Truncate
			var truncTrace = '';
			var lines = trace.split('\n');
			if (this.debugLogMaxLines && lines.length > this.debugLogMaxLines) {
				for  (var i = 0; i < this.debugLogMaxLines; i++) {
					truncTrace += `${lines[i]}\n`;
				}
				truncTrace += '...response truncated...';
				trace = truncTrace;
			}
		}

		this.debugLog(trace);
	}
}

class AlertingApi {
	/**
	 * Alerting service.
	 * @module purecloud-platform-client-v2/api/AlertingApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new AlertingApi. 
	 * @alias module:purecloud-platform-client-v2/api/AlertingApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete an interaction stats alert
	 * 
	 * @param {String} alertId Alert ID
	 */
	deleteAlertingInteractionstatsAlert(alertId) { 
		// verify the required parameter 'alertId' is set
		if (alertId === undefined || alertId === null) {
			throw 'Missing the required parameter "alertId" when calling deleteAlertingInteractionstatsAlert';
		}

		return this.apiClient.callApi(
			'/api/v2/alerting/interactionstats/alerts/{alertId}', 
			'DELETE', 
			{ 'alertId': alertId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete an interaction stats rule.
	 * 
	 * @param {String} ruleId Rule ID
	 */
	deleteAlertingInteractionstatsRule(ruleId) { 
		// verify the required parameter 'ruleId' is set
		if (ruleId === undefined || ruleId === null) {
			throw 'Missing the required parameter "ruleId" when calling deleteAlertingInteractionstatsRule';
		}

		return this.apiClient.callApi(
			'/api/v2/alerting/interactionstats/rules/{ruleId}', 
			'DELETE', 
			{ 'ruleId': ruleId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets active alert count for a user.
	 * 
	 */
	getAlertingAlertsActive() { 

		return this.apiClient.callApi(
			'/api/v2/alerting/alerts/active', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an interaction stats alert
	 * 
	 * @param {String} alertId Alert ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	getAlertingInteractionstatsAlert(alertId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'alertId' is set
		if (alertId === undefined || alertId === null) {
			throw 'Missing the required parameter "alertId" when calling getAlertingInteractionstatsAlert';
		}

		return this.apiClient.callApi(
			'/api/v2/alerting/interactionstats/alerts/{alertId}', 
			'GET', 
			{ 'alertId': alertId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get interaction stats alert list.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	getAlertingInteractionstatsAlerts(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/alerting/interactionstats/alerts', 
			'GET', 
			{  }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets user unread count of interaction stats alerts.
	 * 
	 */
	getAlertingInteractionstatsAlertsUnread() { 

		return this.apiClient.callApi(
			'/api/v2/alerting/interactionstats/alerts/unread', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an interaction stats rule.
	 * 
	 * @param {String} ruleId Rule ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	getAlertingInteractionstatsRule(ruleId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'ruleId' is set
		if (ruleId === undefined || ruleId === null) {
			throw 'Missing the required parameter "ruleId" when calling getAlertingInteractionstatsRule';
		}

		return this.apiClient.callApi(
			'/api/v2/alerting/interactionstats/rules/{ruleId}', 
			'GET', 
			{ 'ruleId': ruleId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an interaction stats rule list.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	getAlertingInteractionstatsRules(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/alerting/interactionstats/rules', 
			'GET', 
			{  }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create an interaction stats rule.
	 * 
	 * @param {Object} body AlertingRule
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	postAlertingInteractionstatsRules(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAlertingInteractionstatsRules';
		}

		return this.apiClient.callApi(
			'/api/v2/alerting/interactionstats/rules', 
			'POST', 
			{  }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an interaction stats alert read status
	 * 
	 * @param {String} alertId Alert ID
	 * @param {Object} body InteractionStatsAlert
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	putAlertingInteractionstatsAlert(alertId, body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'alertId' is set
		if (alertId === undefined || alertId === null) {
			throw 'Missing the required parameter "alertId" when calling putAlertingInteractionstatsAlert';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putAlertingInteractionstatsAlert';
		}

		return this.apiClient.callApi(
			'/api/v2/alerting/interactionstats/alerts/{alertId}', 
			'PUT', 
			{ 'alertId': alertId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an interaction stats rule
	 * 
	 * @param {String} ruleId Rule ID
	 * @param {Object} body AlertingRule
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	putAlertingInteractionstatsRule(ruleId, body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'ruleId' is set
		if (ruleId === undefined || ruleId === null) {
			throw 'Missing the required parameter "ruleId" when calling putAlertingInteractionstatsRule';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putAlertingInteractionstatsRule';
		}

		return this.apiClient.callApi(
			'/api/v2/alerting/interactionstats/rules/{ruleId}', 
			'PUT', 
			{ 'ruleId': ruleId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class AnalyticsApi {
	/**
	 * Analytics service.
	 * @module purecloud-platform-client-v2/api/AnalyticsApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new AnalyticsApi. 
	 * @alias module:purecloud-platform-client-v2/api/AnalyticsApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete a scheduled report job.
	 * 
	 * @param {String} scheduleId Schedule ID
	 */
	deleteAnalyticsReportingSchedule(scheduleId) { 
		// verify the required parameter 'scheduleId' is set
		if (scheduleId === undefined || scheduleId === null) {
			throw 'Missing the required parameter "scheduleId" when calling deleteAnalyticsReportingSchedule';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/schedules/{scheduleId}', 
			'DELETE', 
			{ 'scheduleId': scheduleId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a conversation by id
	 * 
	 * @param {String} conversationId conversationId
	 */
	getAnalyticsConversationDetails(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getAnalyticsConversationDetails';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/conversations/{conversationId}/details', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get all view export requests for a user
	 * 
	 */
	getAnalyticsReportingExports() { 

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/exports', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get list of reporting metadata.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.locale Locale
	 */
	getAnalyticsReportingMetadata(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/metadata', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'locale': opts['locale'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a reporting metadata.
	 * 
	 * @param {String} reportId Report ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.locale Locale
	 */
	getAnalyticsReportingReportIdMetadata(reportId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'reportId' is set
		if (reportId === undefined || reportId === null) {
			throw 'Missing the required parameter "reportId" when calling getAnalyticsReportingReportIdMetadata';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/{reportId}/metadata', 
			'GET', 
			{ 'reportId': reportId }, 
			{ 'locale': opts['locale'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of report formats
	 * Get a list of report formats.
	 */
	getAnalyticsReportingReportformats() { 

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/reportformats', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a scheduled report job.
	 * 
	 * @param {String} scheduleId Schedule ID
	 */
	getAnalyticsReportingSchedule(scheduleId) { 
		// verify the required parameter 'scheduleId' is set
		if (scheduleId === undefined || scheduleId === null) {
			throw 'Missing the required parameter "scheduleId" when calling getAnalyticsReportingSchedule';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/schedules/{scheduleId}', 
			'GET', 
			{ 'scheduleId': scheduleId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get list of completed scheduled report jobs.
	 * 
	 * @param {String} scheduleId Schedule ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber  (default to 1)
	 * @param {Number} opts.pageSize  (default to 25)
	 */
	getAnalyticsReportingScheduleHistory(scheduleId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'scheduleId' is set
		if (scheduleId === undefined || scheduleId === null) {
			throw 'Missing the required parameter "scheduleId" when calling getAnalyticsReportingScheduleHistory';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/schedules/{scheduleId}/history', 
			'GET', 
			{ 'scheduleId': scheduleId }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get most recently completed scheduled report job.
	 * 
	 * @param {String} scheduleId Schedule ID
	 */
	getAnalyticsReportingScheduleHistoryLatest(scheduleId) { 
		// verify the required parameter 'scheduleId' is set
		if (scheduleId === undefined || scheduleId === null) {
			throw 'Missing the required parameter "scheduleId" when calling getAnalyticsReportingScheduleHistoryLatest';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/schedules/{scheduleId}/history/latest', 
			'GET', 
			{ 'scheduleId': scheduleId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * A completed scheduled report job
	 * A completed scheduled report job.
	 * @param {String} runId Run ID
	 * @param {String} scheduleId Schedule ID
	 */
	getAnalyticsReportingScheduleHistoryRunId(runId, scheduleId) { 
		// verify the required parameter 'runId' is set
		if (runId === undefined || runId === null) {
			throw 'Missing the required parameter "runId" when calling getAnalyticsReportingScheduleHistoryRunId';
		}
		// verify the required parameter 'scheduleId' is set
		if (scheduleId === undefined || scheduleId === null) {
			throw 'Missing the required parameter "scheduleId" when calling getAnalyticsReportingScheduleHistoryRunId';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/schedules/{scheduleId}/history/{runId}', 
			'GET', 
			{ 'runId': runId,'scheduleId': scheduleId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of scheduled report jobs
	 * Get a list of scheduled report jobs.
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 */
	getAnalyticsReportingSchedules(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/schedules', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of report time periods.
	 * 
	 */
	getAnalyticsReportingTimeperiods() { 

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/timeperiods', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Index conversation properties
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body request
	 */
	postAnalyticsConversationDetailsProperties(conversationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postAnalyticsConversationDetailsProperties';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsConversationDetailsProperties';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/conversations/{conversationId}/details/properties', 
			'POST', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for conversation aggregates
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsConversationsAggregatesQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsConversationsAggregatesQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/conversations/aggregates/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for conversation details
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsConversationsDetailsQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsConversationsDetailsQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/conversations/details/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for evaluation aggregates
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsEvaluationsAggregatesQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsEvaluationsAggregatesQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/evaluations/aggregates/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for queue observations
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsQueuesObservationsQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsQueuesObservationsQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/queues/observations/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Generate a view export request
	 * 
	 * @param {Object} body ReportingExportJobRequest
	 */
	postAnalyticsReportingExports(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsReportingExports';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/exports', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Place a scheduled report immediately into the reporting queue
	 * 
	 * @param {String} scheduleId Schedule ID
	 */
	postAnalyticsReportingScheduleRunreport(scheduleId) { 
		// verify the required parameter 'scheduleId' is set
		if (scheduleId === undefined || scheduleId === null) {
			throw 'Missing the required parameter "scheduleId" when calling postAnalyticsReportingScheduleRunreport';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/schedules/{scheduleId}/runreport', 
			'POST', 
			{ 'scheduleId': scheduleId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a scheduled report job
	 * Create a scheduled report job.
	 * @param {Object} body ReportSchedule
	 */
	postAnalyticsReportingSchedules(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsReportingSchedules';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/schedules', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for user aggregates
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsUsersAggregatesQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsUsersAggregatesQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/users/aggregates/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for user details
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsUsersDetailsQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsUsersDetailsQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/users/details/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for user observations
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsUsersObservationsQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsUsersObservationsQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/users/observations/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a scheduled report job.
	 * 
	 * @param {String} scheduleId Schedule ID
	 * @param {Object} body ReportSchedule
	 */
	putAnalyticsReportingSchedule(scheduleId, body) { 
		// verify the required parameter 'scheduleId' is set
		if (scheduleId === undefined || scheduleId === null) {
			throw 'Missing the required parameter "scheduleId" when calling putAnalyticsReportingSchedule';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putAnalyticsReportingSchedule';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/reporting/schedules/{scheduleId}', 
			'PUT', 
			{ 'scheduleId': scheduleId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class ArchitectApi {
	/**
	 * Architect service.
	 * @module purecloud-platform-client-v2/api/ArchitectApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new ArchitectApi. 
	 * @alias module:purecloud-platform-client-v2/api/ArchitectApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Deletes a emergency group by ID
	 * 
	 * @param {String} emergencyGroupId Emergency group ID
	 */
	deleteArchitectEmergencygroup(emergencyGroupId) { 
		// verify the required parameter 'emergencyGroupId' is set
		if (emergencyGroupId === undefined || emergencyGroupId === null) {
			throw 'Missing the required parameter "emergencyGroupId" when calling deleteArchitectEmergencygroup';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/emergencygroups/{emergencyGroupId}', 
			'DELETE', 
			{ 'emergencyGroupId': emergencyGroupId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete an IVR Config.
	 * 
	 * @param {String} ivrId IVR id
	 */
	deleteArchitectIvr(ivrId) { 
		// verify the required parameter 'ivrId' is set
		if (ivrId === undefined || ivrId === null) {
			throw 'Missing the required parameter "ivrId" when calling deleteArchitectIvr';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/ivrs/{ivrId}', 
			'DELETE', 
			{ 'ivrId': ivrId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete specified user prompt
	 * 
	 * @param {String} promptId Prompt ID
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.allResources Whether or not to delete all the prompt resources
	 */
	deleteArchitectPrompt(promptId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling deleteArchitectPrompt';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/prompts/{promptId}', 
			'DELETE', 
			{ 'promptId': promptId }, 
			{ 'allResources': opts['allResources'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete specified user prompt resource
	 * 
	 * @param {String} promptId Prompt ID
	 * @param {String} languageCode Language
	 */
	deleteArchitectPromptResource(promptId, languageCode) { 
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling deleteArchitectPromptResource';
		}
		// verify the required parameter 'languageCode' is set
		if (languageCode === undefined || languageCode === null) {
			throw 'Missing the required parameter "languageCode" when calling deleteArchitectPromptResource';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/prompts/{promptId}/resources/{languageCode}', 
			'DELETE', 
			{ 'promptId': promptId,'languageCode': languageCode }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Batch-delete a list of prompts
	 * Multiple IDs can be specified, in which case all specified prompts will be deleted.  Asynchronous.  Notification topic: v2.architect.prompts.{promptId}
	 * @param {Array.<String>} id List of Prompt IDs
	 */
	deleteArchitectPrompts(id) { 
		// verify the required parameter 'id' is set
		if (id === undefined || id === null) {
			throw 'Missing the required parameter "id" when calling deleteArchitectPrompts';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/prompts', 
			'DELETE', 
			{  }, 
			{ 'id': this.apiClient.buildCollectionParam(id, 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a schedule by id
	 * 
	 * @param {String} scheduleId Schedule ID
	 */
	deleteArchitectSchedule(scheduleId) { 
		// verify the required parameter 'scheduleId' is set
		if (scheduleId === undefined || scheduleId === null) {
			throw 'Missing the required parameter "scheduleId" when calling deleteArchitectSchedule';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/schedules/{scheduleId}', 
			'DELETE', 
			{ 'scheduleId': scheduleId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Deletes a schedule group by ID
	 * 
	 * @param {String} scheduleGroupId Schedule group ID
	 */
	deleteArchitectSchedulegroup(scheduleGroupId) { 
		// verify the required parameter 'scheduleGroupId' is set
		if (scheduleGroupId === undefined || scheduleGroupId === null) {
			throw 'Missing the required parameter "scheduleGroupId" when calling deleteArchitectSchedulegroup';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/schedulegroups/{scheduleGroupId}', 
			'DELETE', 
			{ 'scheduleGroupId': scheduleGroupId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a system prompt resource override.
	 * 
	 * @param {String} promptId Prompt ID
	 * @param {String} languageCode Language
	 */
	deleteArchitectSystempromptResource(promptId, languageCode) { 
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling deleteArchitectSystempromptResource';
		}
		// verify the required parameter 'languageCode' is set
		if (languageCode === undefined || languageCode === null) {
			throw 'Missing the required parameter "languageCode" when calling deleteArchitectSystempromptResource';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/systemprompts/{promptId}/resources/{languageCode}', 
			'DELETE', 
			{ 'promptId': promptId,'languageCode': languageCode }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete flow
	 * 
	 * @param {String} flowId Flow ID
	 */
	deleteFlow(flowId) { 
		// verify the required parameter 'flowId' is set
		if (flowId === undefined || flowId === null) {
			throw 'Missing the required parameter "flowId" when calling deleteFlow';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/{flowId}', 
			'DELETE', 
			{ 'flowId': flowId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Batch-delete a list of flows
	 * Multiple IDs can be specified, in which case all specified flows will be deleted.  Asynchronous.  Notification topic: v2.flows.{flowId}
	 * @param {Array.<String>} id List of Flow IDs
	 */
	deleteFlows(id) { 
		// verify the required parameter 'id' is set
		if (id === undefined || id === null) {
			throw 'Missing the required parameter "id" when calling deleteFlows';
		}

		return this.apiClient.callApi(
			'/api/v2/flows', 
			'DELETE', 
			{  }, 
			{ 'id': this.apiClient.buildCollectionParam(id, 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * deletes a specific datatable by id
	 * deletes an entire datatable (including schema and data) with a given id)
	 * @param {String} datatableId id of datatable
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.force force delete, even if in use (default to false)
	 */
	deleteFlowsDatatable(datatableId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'datatableId' is set
		if (datatableId === undefined || datatableId === null) {
			throw 'Missing the required parameter "datatableId" when calling deleteFlowsDatatable';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/datatables/{datatableId}', 
			'DELETE', 
			{ 'datatableId': datatableId }, 
			{ 'force': opts['force'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a row entry
	 * Deletes a row with a given rowId.
	 * @param {String} datatableId id of datatable
	 * @param {String} rowId the key for the row
	 */
	deleteFlowsDatatableRow(datatableId, rowId) { 
		// verify the required parameter 'datatableId' is set
		if (datatableId === undefined || datatableId === null) {
			throw 'Missing the required parameter "datatableId" when calling deleteFlowsDatatableRow';
		}
		// verify the required parameter 'rowId' is set
		if (rowId === undefined || rowId === null) {
			throw 'Missing the required parameter "rowId" when calling deleteFlowsDatatableRow';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/datatables/{datatableId}/rows/{rowId}', 
			'DELETE', 
			{ 'datatableId': datatableId,'rowId': rowId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Dependency Tracking objects that have a given display name
	 * 
	 * @param {String} name Object name to search for
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Array.<String>} opts.objectType Object type(s) to search for
	 * @param {Boolean} opts.consumedResources Include resources each result item consumes
	 * @param {Boolean} opts.consumingResources Include resources that consume each result item
	 * @param {Array.<String>} opts.consumedResourceType Types of consumed resources to return, if consumed resources are requested
	 * @param {Array.<String>} opts.consumingResourceType Types of consuming resources to return, if consuming resources are requested
	 */
	getArchitectDependencytracking(name, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'name' is set
		if (name === undefined || name === null) {
			throw 'Missing the required parameter "name" when calling getArchitectDependencytracking';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/dependencytracking', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'name': name,'objectType': this.apiClient.buildCollectionParam(opts['objectType'], 'multi'),'consumedResources': opts['consumedResources'],'consumingResources': opts['consumingResources'],'consumedResourceType': this.apiClient.buildCollectionParam(opts['consumedResourceType'], 'multi'),'consumingResourceType': this.apiClient.buildCollectionParam(opts['consumingResourceType'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Dependency Tracking build status for an organization
	 * 
	 */
	getArchitectDependencytrackingBuild() { 

		return this.apiClient.callApi(
			'/api/v2/architect/dependencytracking/build', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get resources that are consumed by a given Dependency Tracking object
	 * 
	 * @param {String} id Consuming object ID
	 * @param {String} version Consuming object version
	 * @param {Object} objectType Consuming object type.  Only versioned types are allowed here.
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.resourceType Types of consumed resources to show
	 */
	getArchitectDependencytrackingConsumedresources(id, version, objectType, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'id' is set
		if (id === undefined || id === null) {
			throw 'Missing the required parameter "id" when calling getArchitectDependencytrackingConsumedresources';
		}
		// verify the required parameter 'version' is set
		if (version === undefined || version === null) {
			throw 'Missing the required parameter "version" when calling getArchitectDependencytrackingConsumedresources';
		}
		// verify the required parameter 'objectType' is set
		if (objectType === undefined || objectType === null) {
			throw 'Missing the required parameter "objectType" when calling getArchitectDependencytrackingConsumedresources';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/dependencytracking/consumedresources', 
			'GET', 
			{  }, 
			{ 'id': id,'version': version,'objectType': objectType,'resourceType': this.apiClient.buildCollectionParam(opts['resourceType'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get resources that consume a given Dependency Tracking object
	 * 
	 * @param {String} id Consumed object ID
	 * @param {Object} objectType Consumed object type
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.resourceType Types of consuming resources to show.  Only versioned types are allowed here.
	 */
	getArchitectDependencytrackingConsumingresources(id, objectType, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'id' is set
		if (id === undefined || id === null) {
			throw 'Missing the required parameter "id" when calling getArchitectDependencytrackingConsumingresources';
		}
		// verify the required parameter 'objectType' is set
		if (objectType === undefined || objectType === null) {
			throw 'Missing the required parameter "objectType" when calling getArchitectDependencytrackingConsumingresources';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/dependencytracking/consumingresources', 
			'GET', 
			{  }, 
			{ 'id': id,'objectType': objectType,'resourceType': this.apiClient.buildCollectionParam(opts['resourceType'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Dependency Tracking objects that consume deleted resources
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.name Name to search for
	 * @param {Array.<String>} opts.objectType Object type(s) to search for
	 * @param {Object} opts.flowFilter Show only checkedIn or published flows
	 * @param {Boolean} opts.consumedResources Return consumed resources? (default to false)
	 * @param {Array.<String>} opts.consumedResourceType Resource type(s) to return
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 */
	getArchitectDependencytrackingDeletedresourceconsumers(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/dependencytracking/deletedresourceconsumers', 
			'GET', 
			{  }, 
			{ 'name': opts['name'],'objectType': this.apiClient.buildCollectionParam(opts['objectType'], 'multi'),'flowFilter': opts['flowFilter'],'consumedResources': opts['consumedResources'],'consumedResourceType': this.apiClient.buildCollectionParam(opts['consumedResourceType'], 'multi'),'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Dependency Tracking object
	 * 
	 * @param {String} id Object ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.version Object version
	 * @param {Object} opts.objectType Object type
	 * @param {Boolean} opts.consumedResources Include resources this item consumes
	 * @param {Boolean} opts.consumingResources Include resources that consume this item
	 * @param {Array.<String>} opts.consumedResourceType Types of consumed resources to return, if consumed resources are requested
	 * @param {Array.<String>} opts.consumingResourceType Types of consuming resources to return, if consuming resources are requested
	 */
	getArchitectDependencytrackingObject(id, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'id' is set
		if (id === undefined || id === null) {
			throw 'Missing the required parameter "id" when calling getArchitectDependencytrackingObject';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/dependencytracking/object', 
			'GET', 
			{  }, 
			{ 'id': id,'version': opts['version'],'objectType': opts['objectType'],'consumedResources': opts['consumedResources'],'consumingResources': opts['consumingResources'],'consumedResourceType': this.apiClient.buildCollectionParam(opts['consumedResourceType'], 'multi'),'consumingResourceType': this.apiClient.buildCollectionParam(opts['consumingResourceType'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Dependency Tracking type.
	 * 
	 * @param {String} typeId Type ID
	 */
	getArchitectDependencytrackingType(typeId) { 
		// verify the required parameter 'typeId' is set
		if (typeId === undefined || typeId === null) {
			throw 'Missing the required parameter "typeId" when calling getArchitectDependencytrackingType';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/dependencytracking/types/{typeId}', 
			'GET', 
			{ 'typeId': typeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Dependency Tracking types.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 */
	getArchitectDependencytrackingTypes(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/dependencytracking/types', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Dependency Tracking objects that depend on updated resources
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.name Name to search for
	 * @param {Array.<String>} opts.objectType Object type(s) to search for
	 * @param {Boolean} opts.consumedResources Return consumed resources? (default to false)
	 * @param {Array.<String>} opts.consumedResourceType Resource type(s) to return
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 */
	getArchitectDependencytrackingUpdatedresourceconsumers(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/dependencytracking/updatedresourceconsumers', 
			'GET', 
			{  }, 
			{ 'name': opts['name'],'objectType': this.apiClient.buildCollectionParam(opts['objectType'], 'multi'),'consumedResources': opts['consumedResources'],'consumedResourceType': this.apiClient.buildCollectionParam(opts['consumedResourceType'], 'multi'),'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets a emergency group by ID
	 * 
	 * @param {String} emergencyGroupId Emergency group ID
	 */
	getArchitectEmergencygroup(emergencyGroupId) { 
		// verify the required parameter 'emergencyGroupId' is set
		if (emergencyGroupId === undefined || emergencyGroupId === null) {
			throw 'Missing the required parameter "emergencyGroupId" when calling getArchitectEmergencygroup';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/emergencygroups/{emergencyGroupId}', 
			'GET', 
			{ 'emergencyGroupId': emergencyGroupId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of emergency groups.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortBy Sort by (default to name)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 * @param {String} opts.name Name of the Emergency Group to filter by.
	 */
	getArchitectEmergencygroups(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/emergencygroups', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an IVR config.
	 * 
	 * @param {String} ivrId IVR id
	 */
	getArchitectIvr(ivrId) { 
		// verify the required parameter 'ivrId' is set
		if (ivrId === undefined || ivrId === null) {
			throw 'Missing the required parameter "ivrId" when calling getArchitectIvr';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/ivrs/{ivrId}', 
			'GET', 
			{ 'ivrId': ivrId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get IVR configs.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortBy Sort by (default to name)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 * @param {String} opts.name Name of the IVR to filter by.
	 */
	getArchitectIvrs(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/ivrs', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get specified user prompt
	 * 
	 * @param {String} promptId Prompt ID
	 */
	getArchitectPrompt(promptId) { 
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling getArchitectPrompt';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/prompts/{promptId}', 
			'GET', 
			{ 'promptId': promptId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get generated prompt history
	 * 
	 * @param {String} promptId Prompt ID
	 * @param {String} historyId History request ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortOrder Sort order (default to desc)
	 * @param {Object} opts.sortBy Sort by (default to timestamp)
	 * @param {Array.<String>} opts.action Flow actions to include (omit to include all)
	 */
	getArchitectPromptHistoryHistoryId(promptId, historyId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling getArchitectPromptHistoryHistoryId';
		}
		// verify the required parameter 'historyId' is set
		if (historyId === undefined || historyId === null) {
			throw 'Missing the required parameter "historyId" when calling getArchitectPromptHistoryHistoryId';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/prompts/{promptId}/history/{historyId}', 
			'GET', 
			{ 'promptId': promptId,'historyId': historyId }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortOrder': opts['sortOrder'],'sortBy': opts['sortBy'],'action': this.apiClient.buildCollectionParam(opts['action'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get specified user prompt resource
	 * 
	 * @param {String} promptId Prompt ID
	 * @param {String} languageCode Language
	 */
	getArchitectPromptResource(promptId, languageCode) { 
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling getArchitectPromptResource';
		}
		// verify the required parameter 'languageCode' is set
		if (languageCode === undefined || languageCode === null) {
			throw 'Missing the required parameter "languageCode" when calling getArchitectPromptResource';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/prompts/{promptId}/resources/{languageCode}', 
			'GET', 
			{ 'promptId': promptId,'languageCode': languageCode }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a pageable list of user prompt resources
	 * The returned list is pageable, and query parameters can be used for filtering.
	 * @param {String} promptId Prompt ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 */
	getArchitectPromptResources(promptId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling getArchitectPromptResources';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/prompts/{promptId}/resources', 
			'GET', 
			{ 'promptId': promptId }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a pageable list of user prompts
	 * The returned list is pageable, and query parameters can be used for filtering.  Multiple names can be specified, in which case all matching prompts will be returned, and no other filters will be evaluated.
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.name Name
	 * @param {String} opts.description Description
	 * @param {String} opts.nameOrDescription Name or description
	 * @param {String} opts.sortBy Sort by (default to id)
	 * @param {String} opts.sortOrder Sort order (default to asc)
	 */
	getArchitectPrompts(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/prompts', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'name': opts['name'],'description': opts['description'],'nameOrDescription': opts['nameOrDescription'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a schedule by ID
	 * 
	 * @param {String} scheduleId Schedule ID
	 */
	getArchitectSchedule(scheduleId) { 
		// verify the required parameter 'scheduleId' is set
		if (scheduleId === undefined || scheduleId === null) {
			throw 'Missing the required parameter "scheduleId" when calling getArchitectSchedule';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/schedules/{scheduleId}', 
			'GET', 
			{ 'scheduleId': scheduleId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets a schedule group by ID
	 * 
	 * @param {String} scheduleGroupId Schedule group ID
	 */
	getArchitectSchedulegroup(scheduleGroupId) { 
		// verify the required parameter 'scheduleGroupId' is set
		if (scheduleGroupId === undefined || scheduleGroupId === null) {
			throw 'Missing the required parameter "scheduleGroupId" when calling getArchitectSchedulegroup';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/schedulegroups/{scheduleGroupId}', 
			'GET', 
			{ 'scheduleGroupId': scheduleGroupId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of schedule groups.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortBy Sort by (default to name)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 * @param {String} opts.name Name of the Schedule Group to filter by.
	 */
	getArchitectSchedulegroups(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/schedulegroups', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of schedules.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortBy Sort by (default to name)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 * @param {String} opts.name Name of the Schedule to filter by.
	 */
	getArchitectSchedules(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/schedules', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a system prompt
	 * 
	 * @param {String} promptId promptId
	 */
	getArchitectSystemprompt(promptId) { 
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling getArchitectSystemprompt';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/systemprompts/{promptId}', 
			'GET', 
			{ 'promptId': promptId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get generated prompt history
	 * 
	 * @param {String} promptId promptId
	 * @param {String} historyId History request ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortOrder Sort order (default to desc)
	 * @param {Object} opts.sortBy Sort by (default to timestamp)
	 * @param {Array.<String>} opts.action Flow actions to include (omit to include all)
	 */
	getArchitectSystempromptHistoryHistoryId(promptId, historyId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling getArchitectSystempromptHistoryHistoryId';
		}
		// verify the required parameter 'historyId' is set
		if (historyId === undefined || historyId === null) {
			throw 'Missing the required parameter "historyId" when calling getArchitectSystempromptHistoryHistoryId';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/systemprompts/{promptId}/history/{historyId}', 
			'GET', 
			{ 'promptId': promptId,'historyId': historyId }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortOrder': opts['sortOrder'],'sortBy': opts['sortBy'],'action': this.apiClient.buildCollectionParam(opts['action'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a system prompt resource.
	 * 
	 * @param {String} promptId Prompt ID
	 * @param {String} languageCode Language
	 */
	getArchitectSystempromptResource(promptId, languageCode) { 
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling getArchitectSystempromptResource';
		}
		// verify the required parameter 'languageCode' is set
		if (languageCode === undefined || languageCode === null) {
			throw 'Missing the required parameter "languageCode" when calling getArchitectSystempromptResource';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/systemprompts/{promptId}/resources/{languageCode}', 
			'GET', 
			{ 'promptId': promptId,'languageCode': languageCode }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get system prompt resources.
	 * 
	 * @param {String} promptId Prompt ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortBy Sort by (default to id)
	 * @param {String} opts.sortOrder Sort order (default to asc)
	 */
	getArchitectSystempromptResources(promptId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling getArchitectSystempromptResources';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/systemprompts/{promptId}/resources', 
			'GET', 
			{ 'promptId': promptId }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get System Prompts
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortBy Sort by (default to id)
	 * @param {String} opts.sortOrder Sort order (default to asc)
	 * @param {String} opts.name Name
	 * @param {String} opts.description Description
	 * @param {String} opts.nameOrDescription Name or description
	 */
	getArchitectSystemprompts(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/systemprompts', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'name': opts['name'],'description': opts['description'],'nameOrDescription': opts['nameOrDescription'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get flow
	 * 
	 * @param {String} flowId Flow ID
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.deleted Include deleted flows (default to false)
	 */
	getFlow(flowId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'flowId' is set
		if (flowId === undefined || flowId === null) {
			throw 'Missing the required parameter "flowId" when calling getFlow';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/{flowId}', 
			'GET', 
			{ 'flowId': flowId }, 
			{ 'deleted': opts['deleted'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get generated flow history
	 * 
	 * @param {String} flowId Flow ID
	 * @param {String} historyId History request ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortOrder Sort order (default to desc)
	 * @param {Object} opts.sortBy Sort by (default to timestamp)
	 * @param {Array.<String>} opts.action Flow actions to include (omit to include all)
	 */
	getFlowHistoryHistoryId(flowId, historyId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'flowId' is set
		if (flowId === undefined || flowId === null) {
			throw 'Missing the required parameter "flowId" when calling getFlowHistoryHistoryId';
		}
		// verify the required parameter 'historyId' is set
		if (historyId === undefined || historyId === null) {
			throw 'Missing the required parameter "historyId" when calling getFlowHistoryHistoryId';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/{flowId}/history/{historyId}', 
			'GET', 
			{ 'flowId': flowId,'historyId': historyId }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortOrder': opts['sortOrder'],'sortBy': opts['sortBy'],'action': this.apiClient.buildCollectionParam(opts['action'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the latest configuration for flow
	 * 
	 * @param {String} flowId Flow ID
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.deleted Include deleted flows (default to false)
	 */
	getFlowLatestconfiguration(flowId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'flowId' is set
		if (flowId === undefined || flowId === null) {
			throw 'Missing the required parameter "flowId" when calling getFlowLatestconfiguration';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/{flowId}/latestconfiguration', 
			'GET', 
			{ 'flowId': flowId }, 
			{ 'deleted': opts['deleted'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get flow version
	 * 
	 * @param {String} flowId Flow ID
	 * @param {String} versionId Version ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.deleted Include deleted flows
	 */
	getFlowVersion(flowId, versionId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'flowId' is set
		if (flowId === undefined || flowId === null) {
			throw 'Missing the required parameter "flowId" when calling getFlowVersion';
		}
		// verify the required parameter 'versionId' is set
		if (versionId === undefined || versionId === null) {
			throw 'Missing the required parameter "versionId" when calling getFlowVersion';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/{flowId}/versions/{versionId}', 
			'GET', 
			{ 'flowId': flowId,'versionId': versionId }, 
			{ 'deleted': opts['deleted'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create flow version configuration
	 * 
	 * @param {String} flowId Flow ID
	 * @param {String} versionId Version ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.deleted Include deleted flows
	 */
	getFlowVersionConfiguration(flowId, versionId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'flowId' is set
		if (flowId === undefined || flowId === null) {
			throw 'Missing the required parameter "flowId" when calling getFlowVersionConfiguration';
		}
		// verify the required parameter 'versionId' is set
		if (versionId === undefined || versionId === null) {
			throw 'Missing the required parameter "versionId" when calling getFlowVersionConfiguration';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/{flowId}/versions/{versionId}/configuration', 
			'GET', 
			{ 'flowId': flowId,'versionId': versionId }, 
			{ 'deleted': opts['deleted'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get flow version list
	 * 
	 * @param {String} flowId Flow ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Boolean} opts.deleted Include deleted flows
	 */
	getFlowVersions(flowId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'flowId' is set
		if (flowId === undefined || flowId === null) {
			throw 'Missing the required parameter "flowId" when calling getFlowVersions';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/{flowId}/versions', 
			'GET', 
			{ 'flowId': flowId }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'deleted': opts['deleted'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a pageable list of flows, filtered by query parameters
	 * Multiple IDs can be specified, in which case all matching flows will be returned, and no other parameters will be evaluated.
	 * @param {Object} type Type
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortBy Sort by (default to id)
	 * @param {String} opts.sortOrder Sort order (default to asc)
	 * @param {Array.<String>} opts.id ID
	 * @param {String} opts.name Name
	 * @param {String} opts.description Description
	 * @param {String} opts.nameOrDescription Name or description
	 * @param {String} opts.publishVersionId Publish version ID
	 * @param {String} opts.editableBy Editable by
	 * @param {String} opts.lockedBy Locked by
	 * @param {Object} opts.secure Secure
	 * @param {Boolean} opts.deleted Include deleted (default to false)
	 * @param {Boolean} opts.includeSchemas Include variable schemas (default to false)
	 * @param {String} opts.publishedAfter Published after
	 * @param {String} opts.publishedBefore Published before
	 */
	getFlows(type, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'type' is set
		if (type === undefined || type === null) {
			throw 'Missing the required parameter "type" when calling getFlows';
		}

		return this.apiClient.callApi(
			'/api/v2/flows', 
			'GET', 
			{  }, 
			{ 'type': type,'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'id': this.apiClient.buildCollectionParam(opts['id'], 'multi'),'name': opts['name'],'description': opts['description'],'nameOrDescription': opts['nameOrDescription'],'publishVersionId': opts['publishVersionId'],'editableBy': opts['editableBy'],'lockedBy': opts['lockedBy'],'secure': opts['secure'],'deleted': opts['deleted'],'includeSchemas': opts['includeSchemas'],'publishedAfter': opts['publishedAfter'],'publishedBefore': opts['publishedBefore'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Returns a specific datatable by id
	 * Given a datableid returns the schema associated with it.
	 * @param {String} datatableId id of datatable
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.expand Expand instructions for the result
	 */
	getFlowsDatatable(datatableId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'datatableId' is set
		if (datatableId === undefined || datatableId === null) {
			throw 'Missing the required parameter "datatableId" when calling getFlowsDatatable';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/datatables/{datatableId}', 
			'GET', 
			{ 'datatableId': datatableId }, 
			{ 'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Returns a specific row for the datatable
	 * Given a datatable id and a rowId (key)  will return the full row contents for that rowId.
	 * @param {String} datatableId id of datatable
	 * @param {String} rowId The key for the row
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.showbrief if true returns just the key field for the row (default to true)
	 */
	getFlowsDatatableRow(datatableId, rowId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'datatableId' is set
		if (datatableId === undefined || datatableId === null) {
			throw 'Missing the required parameter "datatableId" when calling getFlowsDatatableRow';
		}
		// verify the required parameter 'rowId' is set
		if (rowId === undefined || rowId === null) {
			throw 'Missing the required parameter "rowId" when calling getFlowsDatatableRow';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/datatables/{datatableId}/rows/{rowId}', 
			'GET', 
			{ 'datatableId': datatableId,'rowId': rowId }, 
			{ 'showbrief': opts['showbrief'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Returns the rows for the datatable
	 * Returns all of the rows for the datatable with the given id.  By default this will just be a shortened list returning the key for each row.  Set expand to all to return all of the row contents.
	 * @param {String} datatableId id of datatable
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Boolean} opts.showbrief If true returns just the key value of the row (default to true)
	 */
	getFlowsDatatableRows(datatableId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'datatableId' is set
		if (datatableId === undefined || datatableId === null) {
			throw 'Missing the required parameter "datatableId" when calling getFlowsDatatableRows';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/datatables/{datatableId}/rows', 
			'GET', 
			{ 'datatableId': datatableId }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'showbrief': opts['showbrief'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieve a list of datatables for the org
	 * Returns a metadata list of the datatables associated with this org, including ID, name and description.
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.expand Expand instructions for the result
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Object} opts.sortBy Sort by (default to id)
	 * @param {String} opts.sortOrder Sort order (default to ascending)
	 */
	getFlowsDatatables(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/flows/datatables', 
			'GET', 
			{  }, 
			{ 'expand': opts['expand'],'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Rebuild Dependency Tracking data for an organization
	 * Asynchronous.  Notification topic: v2.architect.dependencytracking.build
	 */
	postArchitectDependencytrackingBuild() { 

		return this.apiClient.callApi(
			'/api/v2/architect/dependencytracking/build', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Creates a new emergency group
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postArchitectEmergencygroups(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/emergencygroups', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create IVR config.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postArchitectIvrs(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/ivrs', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Generate prompt history
	 * Asynchronous.  Notification topic: v2.architect.prompts.{promptId}
	 * @param {String} promptId Prompt ID
	 */
	postArchitectPromptHistory(promptId) { 
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling postArchitectPromptHistory';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/prompts/{promptId}/history', 
			'POST', 
			{ 'promptId': promptId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new user prompt resource
	 * 
	 * @param {String} promptId Prompt ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postArchitectPromptResources(promptId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling postArchitectPromptResources';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/prompts/{promptId}/resources', 
			'POST', 
			{ 'promptId': promptId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new user prompt
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postArchitectPrompts(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/prompts', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Creates a new schedule group
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postArchitectSchedulegroups(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/schedulegroups', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new schedule.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postArchitectSchedules(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/architect/schedules', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Generate system prompt history
	 * Asynchronous.  Notification topic: v2.architect.systemprompts.{systemPromptId}
	 * @param {String} promptId promptId
	 */
	postArchitectSystempromptHistory(promptId) { 
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling postArchitectSystempromptHistory';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/systemprompts/{promptId}/history', 
			'POST', 
			{ 'promptId': promptId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create system prompt resource override.
	 * 
	 * @param {String} promptId Prompt ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postArchitectSystempromptResources(promptId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling postArchitectSystempromptResources';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/systemprompts/{promptId}/resources', 
			'POST', 
			{ 'promptId': promptId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create flow version
	 * 
	 * @param {String} flowId Flow ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postFlowVersions(flowId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'flowId' is set
		if (flowId === undefined || flowId === null) {
			throw 'Missing the required parameter "flowId" when calling postFlowVersions';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/{flowId}/versions', 
			'POST', 
			{ 'flowId': flowId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create flow
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postFlows(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/flows', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Check-in flow
	 * Asynchronous.  Notification topic: v2.flows.{flowId}
	 * @param {String} flow Flow ID
	 */
	postFlowsActionsCheckin(flow) { 
		// verify the required parameter 'flow' is set
		if (flow === undefined || flow === null) {
			throw 'Missing the required parameter "flow" when calling postFlowsActionsCheckin';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/actions/checkin', 
			'POST', 
			{  }, 
			{ 'flow': flow }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Check-out flow
	 * 
	 * @param {String} flow Flow ID
	 */
	postFlowsActionsCheckout(flow) { 
		// verify the required parameter 'flow' is set
		if (flow === undefined || flow === null) {
			throw 'Missing the required parameter "flow" when calling postFlowsActionsCheckout';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/actions/checkout', 
			'POST', 
			{  }, 
			{ 'flow': flow }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Deactivate flow
	 * 
	 * @param {String} flow Flow ID
	 */
	postFlowsActionsDeactivate(flow) { 
		// verify the required parameter 'flow' is set
		if (flow === undefined || flow === null) {
			throw 'Missing the required parameter "flow" when calling postFlowsActionsDeactivate';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/actions/deactivate', 
			'POST', 
			{  }, 
			{ 'flow': flow }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Publish flow
	 * Asynchronous.  Notification topic: v2.flows.{flowId}
	 * @param {String} flow Flow ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.version version
	 */
	postFlowsActionsPublish(flow, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'flow' is set
		if (flow === undefined || flow === null) {
			throw 'Missing the required parameter "flow" when calling postFlowsActionsPublish';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/actions/publish', 
			'POST', 
			{  }, 
			{ 'flow': flow,'version': opts['version'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Revert flow
	 * 
	 * @param {String} flow Flow ID
	 */
	postFlowsActionsRevert(flow) { 
		// verify the required parameter 'flow' is set
		if (flow === undefined || flow === null) {
			throw 'Missing the required parameter "flow" when calling postFlowsActionsRevert';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/actions/revert', 
			'POST', 
			{  }, 
			{ 'flow': flow }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Unlock flow
	 * Allows for unlocking a flow in the case where there is no flow configuration available, and thus a check-in will not unlock the flow. The user must have Architect Admin permissions to perform this action.
	 * @param {String} flow Flow ID
	 */
	postFlowsActionsUnlock(flow) { 
		// verify the required parameter 'flow' is set
		if (flow === undefined || flow === null) {
			throw 'Missing the required parameter "flow" when calling postFlowsActionsUnlock';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/actions/unlock', 
			'POST', 
			{  }, 
			{ 'flow': flow }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new row entry
	 * Will add the passed in row entry to the datatable with the given id after verifying it against the schema.
	 * @param {String} datatableId id of datatable
	 * @param {Object} dataTableRow 
	 */
	postFlowsDatatableRows(datatableId, dataTableRow) { 
		// verify the required parameter 'datatableId' is set
		if (datatableId === undefined || datatableId === null) {
			throw 'Missing the required parameter "datatableId" when calling postFlowsDatatableRows';
		}
		// verify the required parameter 'dataTableRow' is set
		if (dataTableRow === undefined || dataTableRow === null) {
			throw 'Missing the required parameter "dataTableRow" when calling postFlowsDatatableRows';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/datatables/{datatableId}/rows', 
			'POST', 
			{ 'datatableId': datatableId }, 
			{  }, 
			{  }, 
			{  }, 
			dataTableRow, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new datatable with the specified json-schema definition
	 * This will create a new datatable with fields that match the property definitions in the JSON schema.  The name of the table from the title field of the json-schema.  See also http://json-schema.org/
	 * @param {Object} body datatable json-schema
	 */
	postFlowsDatatables(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postFlowsDatatables';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/datatables', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Updates a emergency group by ID
	 * 
	 * @param {String} emergencyGroupId Emergency group ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	putArchitectEmergencygroup(emergencyGroupId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'emergencyGroupId' is set
		if (emergencyGroupId === undefined || emergencyGroupId === null) {
			throw 'Missing the required parameter "emergencyGroupId" when calling putArchitectEmergencygroup';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/emergencygroups/{emergencyGroupId}', 
			'PUT', 
			{ 'emergencyGroupId': emergencyGroupId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an IVR Config.
	 * 
	 * @param {String} ivrId IVR id
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	putArchitectIvr(ivrId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'ivrId' is set
		if (ivrId === undefined || ivrId === null) {
			throw 'Missing the required parameter "ivrId" when calling putArchitectIvr';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/ivrs/{ivrId}', 
			'PUT', 
			{ 'ivrId': ivrId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update specified user prompt
	 * 
	 * @param {String} promptId Prompt ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	putArchitectPrompt(promptId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling putArchitectPrompt';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/prompts/{promptId}', 
			'PUT', 
			{ 'promptId': promptId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update specified user prompt resource
	 * 
	 * @param {String} promptId Prompt ID
	 * @param {String} languageCode Language
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	putArchitectPromptResource(promptId, languageCode, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling putArchitectPromptResource';
		}
		// verify the required parameter 'languageCode' is set
		if (languageCode === undefined || languageCode === null) {
			throw 'Missing the required parameter "languageCode" when calling putArchitectPromptResource';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/prompts/{promptId}/resources/{languageCode}', 
			'PUT', 
			{ 'promptId': promptId,'languageCode': languageCode }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update schedule by ID
	 * 
	 * @param {String} scheduleId Schedule ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	putArchitectSchedule(scheduleId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'scheduleId' is set
		if (scheduleId === undefined || scheduleId === null) {
			throw 'Missing the required parameter "scheduleId" when calling putArchitectSchedule';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/schedules/{scheduleId}', 
			'PUT', 
			{ 'scheduleId': scheduleId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Updates a schedule group by ID
	 * 
	 * @param {String} scheduleGroupId Schedule group ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	putArchitectSchedulegroup(scheduleGroupId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'scheduleGroupId' is set
		if (scheduleGroupId === undefined || scheduleGroupId === null) {
			throw 'Missing the required parameter "scheduleGroupId" when calling putArchitectSchedulegroup';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/schedulegroups/{scheduleGroupId}', 
			'PUT', 
			{ 'scheduleGroupId': scheduleGroupId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Updates a system prompt resource override.
	 * 
	 * @param {String} promptId Prompt ID
	 * @param {String} languageCode Language
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	putArchitectSystempromptResource(promptId, languageCode, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'promptId' is set
		if (promptId === undefined || promptId === null) {
			throw 'Missing the required parameter "promptId" when calling putArchitectSystempromptResource';
		}
		// verify the required parameter 'languageCode' is set
		if (languageCode === undefined || languageCode === null) {
			throw 'Missing the required parameter "languageCode" when calling putArchitectSystempromptResource';
		}

		return this.apiClient.callApi(
			'/api/v2/architect/systemprompts/{promptId}/resources/{languageCode}', 
			'PUT', 
			{ 'promptId': promptId,'languageCode': languageCode }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update flow
	 * 
	 * @param {String} flowId Flow ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	putFlow(flowId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'flowId' is set
		if (flowId === undefined || flowId === null) {
			throw 'Missing the required parameter "flowId" when calling putFlow';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/{flowId}', 
			'PUT', 
			{ 'flowId': flowId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Updates a specific datatable by id
	 * Updates a schema for a datatable with the given id - updates are additive only, no changes or removals of existing fields.
	 * @param {String} datatableId id of datatable
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.expand Expand instructions for the result
	 * @param {Object} opts.body datatable json-schema
	 */
	putFlowsDatatable(datatableId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'datatableId' is set
		if (datatableId === undefined || datatableId === null) {
			throw 'Missing the required parameter "datatableId" when calling putFlowsDatatable';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/datatables/{datatableId}', 
			'PUT', 
			{ 'datatableId': datatableId }, 
			{ 'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a row entry
	 * Updates a row with the given to the new values.
	 * @param {String} datatableId id of datatable
	 * @param {String} rowId the key for the row
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body datatable row
	 */
	putFlowsDatatableRow(datatableId, rowId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'datatableId' is set
		if (datatableId === undefined || datatableId === null) {
			throw 'Missing the required parameter "datatableId" when calling putFlowsDatatableRow';
		}
		// verify the required parameter 'rowId' is set
		if (rowId === undefined || rowId === null) {
			throw 'Missing the required parameter "rowId" when calling putFlowsDatatableRow';
		}

		return this.apiClient.callApi(
			'/api/v2/flows/datatables/{datatableId}/rows/{rowId}', 
			'PUT', 
			{ 'datatableId': datatableId,'rowId': rowId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class AttributesApi {
	/**
	 * Attributes service.
	 * @module purecloud-platform-client-v2/api/AttributesApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new AttributesApi. 
	 * @alias module:purecloud-platform-client-v2/api/AttributesApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete an existing Attribute.
	 * This will remove attribute.
	 * @param {String} attributeId Attribute ID
	 */
	deleteAttribute(attributeId) { 
		// verify the required parameter 'attributeId' is set
		if (attributeId === undefined || attributeId === null) {
			throw 'Missing the required parameter "attributeId" when calling deleteAttribute';
		}

		return this.apiClient.callApi(
			'/api/v2/attributes/{attributeId}', 
			'DELETE', 
			{ 'attributeId': attributeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get details about an existing attribute.
	 * 
	 * @param {String} attributeId Attribute ID
	 */
	getAttribute(attributeId) { 
		// verify the required parameter 'attributeId' is set
		if (attributeId === undefined || attributeId === null) {
			throw 'Missing the required parameter "attributeId" when calling getAttribute';
		}

		return this.apiClient.callApi(
			'/api/v2/attributes/{attributeId}', 
			'GET', 
			{ 'attributeId': attributeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets a list of existing attributes.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 */
	getAttributes(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/attributes', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create an attribute.
	 * 
	 * @param {Object} body Attribute
	 */
	postAttributes(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAttributes';
		}

		return this.apiClient.callApi(
			'/api/v2/attributes', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query attributes
	 * 
	 * @param {Object} body query
	 */
	postAttributesQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAttributesQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/attributes/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an existing attribute.
	 * Fields that can be updated: name, description. The most recent version is required for updates.
	 * @param {String} attributeId Attribute ID
	 * @param {Object} body Attribute
	 */
	putAttribute(attributeId, body) { 
		// verify the required parameter 'attributeId' is set
		if (attributeId === undefined || attributeId === null) {
			throw 'Missing the required parameter "attributeId" when calling putAttribute';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putAttribute';
		}

		return this.apiClient.callApi(
			'/api/v2/attributes/{attributeId}', 
			'PUT', 
			{ 'attributeId': attributeId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class AuthorizationApi {
	/**
	 * Authorization service.
	 * @module purecloud-platform-client-v2/api/AuthorizationApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new AuthorizationApi. 
	 * @alias module:purecloud-platform-client-v2/api/AuthorizationApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete an organization role.
	 * 
	 * @param {String} roleId Role ID
	 */
	deleteAuthorizationRole(roleId) { 
		// verify the required parameter 'roleId' is set
		if (roleId === undefined || roleId === null) {
			throw 'Missing the required parameter "roleId" when calling deleteAuthorizationRole';
		}

		return this.apiClient.callApi(
			'/api/v2/authorization/roles/{roleId}', 
			'DELETE', 
			{ 'roleId': roleId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Removes all the roles from the user.
	 * 
	 * @param {String} userId User ID
	 */
	deleteUserRoles(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling deleteUserRoles';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/roles', 
			'DELETE', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get all permissions.
	 * Retrieve a list of all permission defined in the system.
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getAuthorizationPermissions(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/authorization/permissions', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of enabled products
	 * Gets the list of enabled products. Some example product names are: collaborateFree, collaboratePro, communicate, and engage.
	 */
	getAuthorizationProducts() { 

		return this.apiClient.callApi(
			'/api/v2/authorization/products', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a single organization role.
	 * Get the organization role specified by its ID.
	 * @param {String} roleId Role ID
	 */
	getAuthorizationRole(roleId) { 
		// verify the required parameter 'roleId' is set
		if (roleId === undefined || roleId === null) {
			throw 'Missing the required parameter "roleId" when calling getAuthorizationRole';
		}

		return this.apiClient.callApi(
			'/api/v2/authorization/roles/{roleId}', 
			'GET', 
			{ 'roleId': roleId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an org role to default role comparison comparison
	 * Compares any organization role to a default role id and show differences
	 * @param {String} leftRoleId Left Role ID
	 * @param {String} rightRoleId Right Role id
	 */
	getAuthorizationRoleComparedefaultRightRoleId(leftRoleId, rightRoleId) { 
		// verify the required parameter 'leftRoleId' is set
		if (leftRoleId === undefined || leftRoleId === null) {
			throw 'Missing the required parameter "leftRoleId" when calling getAuthorizationRoleComparedefaultRightRoleId';
		}
		// verify the required parameter 'rightRoleId' is set
		if (rightRoleId === undefined || rightRoleId === null) {
			throw 'Missing the required parameter "rightRoleId" when calling getAuthorizationRoleComparedefaultRightRoleId';
		}

		return this.apiClient.callApi(
			'/api/v2/authorization/roles/{leftRoleId}/comparedefault/{rightRoleId}', 
			'GET', 
			{ 'leftRoleId': leftRoleId,'rightRoleId': rightRoleId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieve a list of all roles defined for the organization
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 * @param {String} opts.name 
	 * @param {Array.<String>} opts.permission 
	 * @param {Array.<String>} opts.defaultRoleId 
	 * @param {Boolean} opts.userCount  (default to true)
	 * @param {Array.<String>} opts.id id
	 */
	getAuthorizationRoles(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/authorization/roles', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'],'name': opts['name'],'permission': this.apiClient.buildCollectionParam(opts['permission'], 'multi'),'defaultRoleId': this.apiClient.buildCollectionParam(opts['defaultRoleId'], 'multi'),'userCount': opts['userCount'],'id': this.apiClient.buildCollectionParam(opts['id'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Returns a listing of roles and permissions for a user.
	 * 
	 * @param {String} userId User ID
	 */
	getUserRoles(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserRoles';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/roles', 
			'GET', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Patch Organization Role for needsUpdate Field
	 * Patch Organization Role for needsUpdate Field
	 * @param {String} roleId Role ID
	 * @param {Object} body Organization role
	 */
	patchAuthorizationRole(roleId, body) { 
		// verify the required parameter 'roleId' is set
		if (roleId === undefined || roleId === null) {
			throw 'Missing the required parameter "roleId" when calling patchAuthorizationRole';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchAuthorizationRole';
		}

		return this.apiClient.callApi(
			'/api/v2/authorization/roles/{roleId}', 
			'PATCH', 
			{ 'roleId': roleId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an unsaved org role to default role comparison
	 * Allows users to compare their existing roles in an unsaved state to its default role
	 * @param {String} leftRoleId Left Role ID
	 * @param {String} rightRoleId Right Role id
	 * @param {Object} body Organization role
	 */
	postAuthorizationRoleComparedefaultRightRoleId(leftRoleId, rightRoleId, body) { 
		// verify the required parameter 'leftRoleId' is set
		if (leftRoleId === undefined || leftRoleId === null) {
			throw 'Missing the required parameter "leftRoleId" when calling postAuthorizationRoleComparedefaultRightRoleId';
		}
		// verify the required parameter 'rightRoleId' is set
		if (rightRoleId === undefined || rightRoleId === null) {
			throw 'Missing the required parameter "rightRoleId" when calling postAuthorizationRoleComparedefaultRightRoleId';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAuthorizationRoleComparedefaultRightRoleId';
		}

		return this.apiClient.callApi(
			'/api/v2/authorization/roles/{leftRoleId}/comparedefault/{rightRoleId}', 
			'POST', 
			{ 'leftRoleId': leftRoleId,'rightRoleId': rightRoleId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create an organization role.
	 * 
	 * @param {Object} body Organization role
	 */
	postAuthorizationRoles(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAuthorizationRoles';
		}

		return this.apiClient.callApi(
			'/api/v2/authorization/roles', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Restores all default roles
	 * This endpoint serves several purposes. 1. It provides the org with default roles. This is important for default roles that will be added after go-live (they can retroactively add the new default-role). Note: When not using a query param of force=true, it only adds the default roles not configured for the org; it does not overwrite roles. 2. Using the query param force=true, you can restore all default roles. Note: This does not have an effect on custom roles.
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.force Restore default roles (default to false)
	 */
	postAuthorizationRolesDefault(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/authorization/roles/default', 
			'POST', 
			{  }, 
			{ 'force': opts['force'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an organization role.
	 * Update
	 * @param {String} roleId Role ID
	 * @param {Object} body Organization role
	 */
	putAuthorizationRole(roleId, body) { 
		// verify the required parameter 'roleId' is set
		if (roleId === undefined || roleId === null) {
			throw 'Missing the required parameter "roleId" when calling putAuthorizationRole';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putAuthorizationRole';
		}

		return this.apiClient.callApi(
			'/api/v2/authorization/roles/{roleId}', 
			'PUT', 
			{ 'roleId': roleId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Sets the users for the role
	 * 
	 * @param {String} roleId Role ID
	 * @param {Array.<Object>} body List of user IDs
	 */
	putAuthorizationRoleUsersAdd(roleId, body) { 
		// verify the required parameter 'roleId' is set
		if (roleId === undefined || roleId === null) {
			throw 'Missing the required parameter "roleId" when calling putAuthorizationRoleUsersAdd';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putAuthorizationRoleUsersAdd';
		}

		return this.apiClient.callApi(
			'/api/v2/authorization/roles/{roleId}/users/add', 
			'PUT', 
			{ 'roleId': roleId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Removes the users from the role
	 * 
	 * @param {String} roleId Role ID
	 * @param {Array.<Object>} body List of user IDs
	 */
	putAuthorizationRoleUsersRemove(roleId, body) { 
		// verify the required parameter 'roleId' is set
		if (roleId === undefined || roleId === null) {
			throw 'Missing the required parameter "roleId" when calling putAuthorizationRoleUsersRemove';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putAuthorizationRoleUsersRemove';
		}

		return this.apiClient.callApi(
			'/api/v2/authorization/roles/{roleId}/users/remove', 
			'PUT', 
			{ 'roleId': roleId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Restore specified default roles
	 * 
	 * @param {Array.<Object>} body Organization roles list
	 */
	putAuthorizationRolesDefault(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putAuthorizationRolesDefault';
		}

		return this.apiClient.callApi(
			'/api/v2/authorization/roles/default', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Sets the user&#39;s roles
	 * 
	 * @param {String} userId User ID
	 * @param {Array.<Object>} body List of roles
	 */
	putUserRoles(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling putUserRoles';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putUserRoles';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/roles', 
			'PUT', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class BillingApi {
	/**
	 * Billing service.
	 * @module purecloud-platform-client-v2/api/BillingApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new BillingApi. 
	 * @alias module:purecloud-platform-client-v2/api/BillingApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Get a report of the billable usages (e.g. licenses and devices utilized) for a given period.
	 * 
	 * @param {Date} startDate The period start date. Date time is represented as an ISO-8601 string. For example: yyyy-MM-ddTHH:mm:ss.SSSZ
	 * @param {Date} endDate The period end date. Date time is represented as an ISO-8601 string. For example: yyyy-MM-ddTHH:mm:ss.SSSZ
	 */
	getBillingReportsBillableusage(startDate, endDate) { 
		// verify the required parameter 'startDate' is set
		if (startDate === undefined || startDate === null) {
			throw 'Missing the required parameter "startDate" when calling getBillingReportsBillableusage';
		}
		// verify the required parameter 'endDate' is set
		if (endDate === undefined || endDate === null) {
			throw 'Missing the required parameter "endDate" when calling getBillingReportsBillableusage';
		}

		return this.apiClient.callApi(
			'/api/v2/billing/reports/billableusage', 
			'GET', 
			{  }, 
			{ 'startDate': startDate,'endDate': endDate }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class ContentManagementApi {
	/**
	 * ContentManagement service.
	 * @module purecloud-platform-client-v2/api/ContentManagementApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new ContentManagementApi. 
	 * @alias module:purecloud-platform-client-v2/api/ContentManagementApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete a document.
	 * 
	 * @param {String} documentId Document ID
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.override Override any lock on the document
	 */
	deleteContentmanagementDocument(documentId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'documentId' is set
		if (documentId === undefined || documentId === null) {
			throw 'Missing the required parameter "documentId" when calling deleteContentmanagementDocument';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/documents/{documentId}', 
			'DELETE', 
			{ 'documentId': documentId }, 
			{ 'override': opts['override'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Deletes an existing share.
	 * This revokes sharing rights specified in the share record
	 * @param {String} shareId Share ID
	 */
	deleteContentmanagementShare(shareId) { 
		// verify the required parameter 'shareId' is set
		if (shareId === undefined || shareId === null) {
			throw 'Missing the required parameter "shareId" when calling deleteContentmanagementShare';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/shares/{shareId}', 
			'DELETE', 
			{ 'shareId': shareId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Cancel the command for this status
	 * 
	 * @param {String} statusId Status ID
	 */
	deleteContentmanagementStatusStatusId(statusId) { 
		// verify the required parameter 'statusId' is set
		if (statusId === undefined || statusId === null) {
			throw 'Missing the required parameter "statusId" when calling deleteContentmanagementStatusStatusId';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/status/{statusId}', 
			'DELETE', 
			{ 'statusId': statusId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a workspace
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.moveChildrenToWorkspaceId New location for objects in deleted workspace.
	 */
	deleteContentmanagementWorkspace(workspaceId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling deleteContentmanagementWorkspace';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}', 
			'DELETE', 
			{ 'workspaceId': workspaceId }, 
			{ 'moveChildrenToWorkspaceId': opts['moveChildrenToWorkspaceId'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a member from a workspace
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {String} memberId Member ID
	 */
	deleteContentmanagementWorkspaceMember(workspaceId, memberId) { 
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling deleteContentmanagementWorkspaceMember';
		}
		// verify the required parameter 'memberId' is set
		if (memberId === undefined || memberId === null) {
			throw 'Missing the required parameter "memberId" when calling deleteContentmanagementWorkspaceMember';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}/members/{memberId}', 
			'DELETE', 
			{ 'workspaceId': workspaceId,'memberId': memberId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete workspace tag
	 * Delete a tag from a workspace. Will remove this tag from all documents.
	 * @param {String} workspaceId Workspace ID
	 * @param {String} tagId Tag ID
	 */
	deleteContentmanagementWorkspaceTagvalue(workspaceId, tagId) { 
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling deleteContentmanagementWorkspaceTagvalue';
		}
		// verify the required parameter 'tagId' is set
		if (tagId === undefined || tagId === null) {
			throw 'Missing the required parameter "tagId" when calling deleteContentmanagementWorkspaceTagvalue';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}/tagvalues/{tagId}', 
			'DELETE', 
			{ 'workspaceId': workspaceId,'tagId': tagId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a document.
	 * 
	 * @param {String} documentId Document ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	getContentmanagementDocument(documentId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'documentId' is set
		if (documentId === undefined || documentId === null) {
			throw 'Missing the required parameter "documentId" when calling getContentmanagementDocument';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/documents/{documentId}', 
			'GET', 
			{ 'documentId': documentId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of audits for a document.
	 * 
	 * @param {String} documentId Document ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.transactionFilter Transaction filter
	 * @param {String} opts.level level (default to USER)
	 * @param {String} opts.sortBy Sort by
	 * @param {String} opts.sortOrder Sort order (default to ascending)
	 */
	getContentmanagementDocumentAudits(documentId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'documentId' is set
		if (documentId === undefined || documentId === null) {
			throw 'Missing the required parameter "documentId" when calling getContentmanagementDocumentAudits';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/documents/{documentId}/audits', 
			'GET', 
			{ 'documentId': documentId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'transactionFilter': opts['transactionFilter'],'level': opts['level'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Download a document.
	 * 
	 * @param {String} documentId Document ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.disposition Request how the content will be downloaded: a file attachment or inline. Default is attachment.
	 * @param {String} opts.contentType The requested format for the specified document. If supported, the document will be returned in that format. Example contentType=audio/wav
	 */
	getContentmanagementDocumentContent(documentId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'documentId' is set
		if (documentId === undefined || documentId === null) {
			throw 'Missing the required parameter "documentId" when calling getContentmanagementDocumentContent';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/documents/{documentId}/content', 
			'GET', 
			{ 'documentId': documentId }, 
			{ 'disposition': opts['disposition'],'contentType': opts['contentType'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of documents.
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.name Name
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy name or dateCreated
	 * @param {String} opts.sortOrder ascending or descending (default to ascending)
	 */
	getContentmanagementDocuments(workspaceId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling getContentmanagementDocuments';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/documents', 
			'GET', 
			{  }, 
			{ 'workspaceId': workspaceId,'name': opts['name'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query content
	 * 
	 * @param {String} queryPhrase Phrase tokens are ANDed together over all searchable fields
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy name or dateCreated (default to name)
	 * @param {String} opts.sortOrder ascending or descending (default to ascending)
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	getContentmanagementQuery(queryPhrase, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'queryPhrase' is set
		if (queryPhrase === undefined || queryPhrase === null) {
			throw 'Missing the required parameter "queryPhrase" when calling getContentmanagementQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/query', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'queryPhrase': queryPhrase,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Security Profile
	 * 
	 * @param {String} securityProfileId Security Profile Id
	 */
	getContentmanagementSecurityprofile(securityProfileId) { 
		// verify the required parameter 'securityProfileId' is set
		if (securityProfileId === undefined || securityProfileId === null) {
			throw 'Missing the required parameter "securityProfileId" when calling getContentmanagementSecurityprofile';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/securityprofiles/{securityProfileId}', 
			'GET', 
			{ 'securityProfileId': securityProfileId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a List of Security Profiles
	 * 
	 */
	getContentmanagementSecurityprofiles() { 

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/securityprofiles', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieve details about an existing share.
	 * 
	 * @param {String} shareId Share ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	getContentmanagementShare(shareId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'shareId' is set
		if (shareId === undefined || shareId === null) {
			throw 'Missing the required parameter "shareId" when calling getContentmanagementShare';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/shares/{shareId}', 
			'GET', 
			{ 'shareId': shareId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get shared documents. Securely download a shared document.
	 * This method requires the download sharing URI obtained in the get document response (downloadSharingUri). Documents may be shared between users in the same workspace. Documents may also be shared between any user by creating a content management share.
	 * @param {String} sharedId Shared ID
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.redirect Turn on or off redirect (default to true)
	 * @param {Object} opts.disposition Request how the share content will be downloaded: attached as a file or inline. Default is attachment. (default to attachment)
	 * @param {String} opts.contentType The requested format for the specified document. If supported, the document will be returned in that format. Example contentType=audio/wav
	 * @param {Object} opts.expand Expand some document fields
	 */
	getContentmanagementSharedSharedId(sharedId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'sharedId' is set
		if (sharedId === undefined || sharedId === null) {
			throw 'Missing the required parameter "sharedId" when calling getContentmanagementSharedSharedId';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/shared/{sharedId}', 
			'GET', 
			{ 'sharedId': sharedId }, 
			{ 'redirect': opts['redirect'],'disposition': opts['disposition'],'contentType': opts['contentType'],'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets a list of shares.  You must specify at least one filter (e.g. entityId).
	 * Failing to specify a filter will return 400.
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.entityId Filters the shares returned to only the entity specified by the value of this parameter.
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getContentmanagementShares(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/shares', 
			'GET', 
			{  }, 
			{ 'entityId': opts['entityId'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of statuses for pending operations
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getContentmanagementStatus(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/status', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a status.
	 * 
	 * @param {String} statusId Status ID
	 */
	getContentmanagementStatusStatusId(statusId) { 
		// verify the required parameter 'statusId' is set
		if (statusId === undefined || statusId === null) {
			throw 'Missing the required parameter "statusId" when calling getContentmanagementStatusStatusId';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/status/{statusId}', 
			'GET', 
			{ 'statusId': statusId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get usage details.
	 * 
	 */
	getContentmanagementUsage() { 

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/usage', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a workspace.
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	getContentmanagementWorkspace(workspaceId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling getContentmanagementWorkspace';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}', 
			'GET', 
			{ 'workspaceId': workspaceId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of documents.
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy name or dateCreated
	 * @param {String} opts.sortOrder ascending or descending (default to ascending)
	 */
	getContentmanagementWorkspaceDocuments(workspaceId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling getContentmanagementWorkspaceDocuments';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}/documents', 
			'GET', 
			{ 'workspaceId': workspaceId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a workspace member
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {String} memberId Member ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	getContentmanagementWorkspaceMember(workspaceId, memberId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling getContentmanagementWorkspaceMember';
		}
		// verify the required parameter 'memberId' is set
		if (memberId === undefined || memberId === null) {
			throw 'Missing the required parameter "memberId" when calling getContentmanagementWorkspaceMember';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}/members/{memberId}', 
			'GET', 
			{ 'workspaceId': workspaceId,'memberId': memberId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list workspace members
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	getContentmanagementWorkspaceMembers(workspaceId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling getContentmanagementWorkspaceMembers';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}/members', 
			'GET', 
			{ 'workspaceId': workspaceId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a workspace tag
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {String} tagId Tag ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	getContentmanagementWorkspaceTagvalue(workspaceId, tagId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling getContentmanagementWorkspaceTagvalue';
		}
		// verify the required parameter 'tagId' is set
		if (tagId === undefined || tagId === null) {
			throw 'Missing the required parameter "tagId" when calling getContentmanagementWorkspaceTagvalue';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}/tagvalues/{tagId}', 
			'GET', 
			{ 'workspaceId': workspaceId,'tagId': tagId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of workspace tags
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.value filter the list of tags returned
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	getContentmanagementWorkspaceTagvalues(workspaceId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling getContentmanagementWorkspaceTagvalues';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}/tagvalues', 
			'GET', 
			{ 'workspaceId': workspaceId }, 
			{ 'value': opts['value'],'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of workspaces.
	 * Specifying &#39;content&#39; access will return all workspaces the user has document access to, while &#39;admin&#39; access will return all group workspaces the user has administrative rights to.
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Array.<String>} opts.access Requested access level.
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	getContentmanagementWorkspaces(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'access': this.apiClient.buildCollectionParam(opts['access'], 'multi'),'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query audits
	 * 
	 * @param {Object} body Allows for a filtered query returning facet information
	 */
	postContentmanagementAuditquery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postContentmanagementAuditquery';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/auditquery', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a document.
	 * 
	 * @param {String} documentId Document ID
	 * @param {Object} body Document
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.expand Expand some document fields
	 * @param {Boolean} opts.override Override any lock on the document
	 */
	postContentmanagementDocument(documentId, body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'documentId' is set
		if (documentId === undefined || documentId === null) {
			throw 'Missing the required parameter "documentId" when calling postContentmanagementDocument';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postContentmanagementDocument';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/documents/{documentId}', 
			'POST', 
			{ 'documentId': documentId }, 
			{ 'expand': opts['expand'],'override': opts['override'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Replace the contents of a document.
	 * 
	 * @param {String} documentId Document ID
	 * @param {Object} body Replace Request
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.override Override any lock on the document
	 */
	postContentmanagementDocumentContent(documentId, body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'documentId' is set
		if (documentId === undefined || documentId === null) {
			throw 'Missing the required parameter "documentId" when calling postContentmanagementDocumentContent';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postContentmanagementDocumentContent';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/documents/{documentId}/content', 
			'POST', 
			{ 'documentId': documentId }, 
			{ 'override': opts['override'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add a document.
	 * 
	 * @param {Object} body Document
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.copySource Copy a document within a workspace or to a new workspace. Provide a document ID as the copy source.
	 * @param {String} opts.moveSource Move a document to a new workspace. Provide a document ID as the move source.
	 * @param {Boolean} opts.override Override any lock on the source document
	 */
	postContentmanagementDocuments(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postContentmanagementDocuments';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/documents', 
			'POST', 
			{  }, 
			{ 'copySource': opts['copySource'],'moveSource': opts['moveSource'],'override': opts['override'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query content
	 * 
	 * @param {Object} body Allows for a filtered query returning facet information
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.expand Expand some document fields
	 */
	postContentmanagementQuery(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postContentmanagementQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/query', 
			'POST', 
			{  }, 
			{ 'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Creates a new share or updates an existing share if the entity has already been shared
	 * 
	 * @param {Object} body CreateShareRequest - entity id and type and a single member or list of members are required
	 */
	postContentmanagementShares(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postContentmanagementShares';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/shares', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a workspace tag
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {Object} body tag
	 */
	postContentmanagementWorkspaceTagvalues(workspaceId, body) { 
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling postContentmanagementWorkspaceTagvalues';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postContentmanagementWorkspaceTagvalues';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}/tagvalues', 
			'POST', 
			{ 'workspaceId': workspaceId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Perform a prefix query on tags in the workspace
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {Object} body query
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	postContentmanagementWorkspaceTagvaluesQuery(workspaceId, body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling postContentmanagementWorkspaceTagvaluesQuery';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postContentmanagementWorkspaceTagvaluesQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}/tagvalues/query', 
			'POST', 
			{ 'workspaceId': workspaceId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a group workspace
	 * 
	 * @param {Object} body Workspace
	 */
	postContentmanagementWorkspaces(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postContentmanagementWorkspaces';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a workspace
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {Object} body Workspace
	 */
	putContentmanagementWorkspace(workspaceId, body) { 
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling putContentmanagementWorkspace';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putContentmanagementWorkspace';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}', 
			'PUT', 
			{ 'workspaceId': workspaceId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add a member to a workspace
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {String} memberId Member ID
	 * @param {Object} body Workspace Member
	 */
	putContentmanagementWorkspaceMember(workspaceId, memberId, body) { 
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling putContentmanagementWorkspaceMember';
		}
		// verify the required parameter 'memberId' is set
		if (memberId === undefined || memberId === null) {
			throw 'Missing the required parameter "memberId" when calling putContentmanagementWorkspaceMember';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putContentmanagementWorkspaceMember';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}/members/{memberId}', 
			'PUT', 
			{ 'workspaceId': workspaceId,'memberId': memberId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a workspace tag. Will update all documents with the new tag value.
	 * 
	 * @param {String} workspaceId Workspace ID
	 * @param {String} tagId Tag ID
	 * @param {Object} body Workspace
	 */
	putContentmanagementWorkspaceTagvalue(workspaceId, tagId, body) { 
		// verify the required parameter 'workspaceId' is set
		if (workspaceId === undefined || workspaceId === null) {
			throw 'Missing the required parameter "workspaceId" when calling putContentmanagementWorkspaceTagvalue';
		}
		// verify the required parameter 'tagId' is set
		if (tagId === undefined || tagId === null) {
			throw 'Missing the required parameter "tagId" when calling putContentmanagementWorkspaceTagvalue';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putContentmanagementWorkspaceTagvalue';
		}

		return this.apiClient.callApi(
			'/api/v2/contentmanagement/workspaces/{workspaceId}/tagvalues/{tagId}', 
			'PUT', 
			{ 'workspaceId': workspaceId,'tagId': tagId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class ConversationsApi {
	/**
	 * Conversations service.
	 * @module purecloud-platform-client-v2/api/ConversationsApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new ConversationsApi. 
	 * @alias module:purecloud-platform-client-v2/api/ConversationsApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete a code used to add a communication to this participant
	 * 
	 * @param {String} conversationId conversation ID
	 * @param {String} participantId participant ID
	 * @param {String} addCommunicationCode addCommunicationCode
	 */
	deleteConversationParticipantCode(conversationId, participantId, addCommunicationCode) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling deleteConversationParticipantCode';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling deleteConversationParticipantCode';
		}
		// verify the required parameter 'addCommunicationCode' is set
		if (addCommunicationCode === undefined || addCommunicationCode === null) {
			throw 'Missing the required parameter "addCommunicationCode" when calling deleteConversationParticipantCode';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/participants/{participantId}/codes/{addCommunicationCode}', 
			'DELETE', 
			{ 'conversationId': conversationId,'participantId': participantId,'addCommunicationCode': addCommunicationCode }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Cancel the transfer
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 */
	deleteConversationsCallParticipantConsult(conversationId, participantId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling deleteConversationsCallParticipantConsult';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling deleteConversationsCallParticipantConsult';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}/participants/{participantId}/consult', 
			'DELETE', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete attachment from draft
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} attachmentId attachmentId
	 */
	deleteConversationsEmailMessagesDraftAttachment(conversationId, attachmentId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling deleteConversationsEmailMessagesDraftAttachment';
		}
		// verify the required parameter 'attachmentId' is set
		if (attachmentId === undefined || attachmentId === null) {
			throw 'Missing the required parameter "attachmentId" when calling deleteConversationsEmailMessagesDraftAttachment';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}/messages/draft/attachments/{attachmentId}', 
			'DELETE', 
			{ 'conversationId': conversationId,'attachmentId': attachmentId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a conversation by id
	 * 
	 * @param {String} conversationId conversationId
	 */
	getAnalyticsConversationDetails(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getAnalyticsConversationDetails';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/conversations/{conversationId}/details', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get conversation
	 * 
	 * @param {String} conversationId conversation ID
	 */
	getConversation(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversation';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Fetch info on a secure session
	 * 
	 * @param {String} conversationId conversation ID
	 * @param {String} participantId participant ID
	 * @param {String} secureSessionId secure IVR session ID
	 */
	getConversationParticipantSecureivrsession(conversationId, participantId, secureSessionId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationParticipantSecureivrsession';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationParticipantSecureivrsession';
		}
		// verify the required parameter 'secureSessionId' is set
		if (secureSessionId === undefined || secureSessionId === null) {
			throw 'Missing the required parameter "secureSessionId" when calling getConversationParticipantSecureivrsession';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/participants/{participantId}/secureivrsessions/{secureSessionId}', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId,'secureSessionId': secureSessionId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of secure sessions for this participant.
	 * 
	 * @param {String} conversationId conversation ID
	 * @param {String} participantId participant ID
	 */
	getConversationParticipantSecureivrsessions(conversationId, participantId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationParticipantSecureivrsessions';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationParticipantSecureivrsessions';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/participants/{participantId}/secureivrsessions', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the wrap-up for this conversation participant. 
	 * 
	 * @param {String} conversationId conversation ID
	 * @param {String} participantId participant ID
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.provisional Indicates if the wrap-up code is provisional. (default to false)
	 */
	getConversationParticipantWrapup(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationParticipantWrapup';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationParticipantWrapup';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/participants/{participantId}/wrapup', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{ 'provisional': opts['provisional'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get list of wrapup codes for this conversation participant
	 * 
	 * @param {String} conversationId conversation ID
	 * @param {String} participantId participant ID
	 */
	getConversationParticipantWrapupcodes(conversationId, participantId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationParticipantWrapupcodes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationParticipantWrapupcodes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/participants/{participantId}/wrapupcodes', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get active conversations for the logged in user
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.communicationType Call or Chat communication filtering
	 */
	getConversations(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/conversations', 
			'GET', 
			{  }, 
			{ 'communicationType': opts['communicationType'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get call conversation
	 * 
	 * @param {String} conversationId conversationId
	 */
	getConversationsCall(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsCall';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the wrap-up for this conversation participant. 
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.provisional Indicates if the wrap-up code is provisional. (default to false)
	 */
	getConversationsCallParticipantWrapup(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsCallParticipantWrapup';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationsCallParticipantWrapup';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}/participants/{participantId}/wrapup', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{ 'provisional': opts['provisional'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get list of wrapup codes for this conversation participant
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 */
	getConversationsCallParticipantWrapupcodes(conversationId, participantId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsCallParticipantWrapupcodes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationsCallParticipantWrapupcodes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}/participants/{participantId}/wrapupcodes', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get callback conversation
	 * 
	 * @param {String} conversationId conversationId
	 */
	getConversationsCallback(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsCallback';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/callbacks/{conversationId}', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the wrap-up for this conversation participant. 
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.provisional Indicates if the wrap-up code is provisional. (default to false)
	 */
	getConversationsCallbackParticipantWrapup(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsCallbackParticipantWrapup';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationsCallbackParticipantWrapup';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/callbacks/{conversationId}/participants/{participantId}/wrapup', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{ 'provisional': opts['provisional'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get list of wrapup codes for this conversation participant
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 */
	getConversationsCallbackParticipantWrapupcodes(conversationId, participantId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsCallbackParticipantWrapupcodes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationsCallbackParticipantWrapupcodes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/callbacks/{conversationId}/participants/{participantId}/wrapupcodes', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get active callback conversations for the logged in user
	 * 
	 */
	getConversationsCallbacks() { 

		return this.apiClient.callApi(
			'/api/v2/conversations/callbacks', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get active call conversations for the logged in user
	 * 
	 */
	getConversationsCalls() { 

		return this.apiClient.callApi(
			'/api/v2/conversations/calls', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get call history
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size, maximum 50 (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.interval Interval string; format is ISO-8601. Separate start and end times with forward slash &#39;/&#39;
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	getConversationsCallsHistory(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/history', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'interval': opts['interval'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the maximum number of participants that this user can have on a conference
	 * 
	 */
	getConversationsCallsMaximumconferenceparties() { 

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/maximumconferenceparties', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get chat conversation
	 * 
	 * @param {String} conversationId conversationId
	 */
	getConversationsChat(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsChat';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/chats/{conversationId}', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the wrap-up for this conversation participant. 
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.provisional Indicates if the wrap-up code is provisional. (default to false)
	 */
	getConversationsChatParticipantWrapup(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsChatParticipantWrapup';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationsChatParticipantWrapup';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/chats/{conversationId}/participants/{participantId}/wrapup', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{ 'provisional': opts['provisional'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get list of wrapup codes for this conversation participant
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 */
	getConversationsChatParticipantWrapupcodes(conversationId, participantId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsChatParticipantWrapupcodes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationsChatParticipantWrapupcodes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/chats/{conversationId}/participants/{participantId}/wrapupcodes', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get active chat conversations for the logged in user
	 * 
	 */
	getConversationsChats() { 

		return this.apiClient.callApi(
			'/api/v2/conversations/chats', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get cobrowse conversation
	 * 
	 * @param {String} conversationId conversationId
	 */
	getConversationsCobrowsesession(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsCobrowsesession';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/cobrowsesessions/{conversationId}', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the wrap-up for this conversation participant. 
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.provisional Indicates if the wrap-up code is provisional. (default to false)
	 */
	getConversationsCobrowsesessionParticipantWrapup(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsCobrowsesessionParticipantWrapup';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationsCobrowsesessionParticipantWrapup';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/cobrowsesessions/{conversationId}/participants/{participantId}/wrapup', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{ 'provisional': opts['provisional'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get list of wrapup codes for this conversation participant
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 */
	getConversationsCobrowsesessionParticipantWrapupcodes(conversationId, participantId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsCobrowsesessionParticipantWrapupcodes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationsCobrowsesessionParticipantWrapupcodes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/cobrowsesessions/{conversationId}/participants/{participantId}/wrapupcodes', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get active cobrowse conversations for the logged in user
	 * 
	 */
	getConversationsCobrowsesessions() { 

		return this.apiClient.callApi(
			'/api/v2/conversations/cobrowsesessions', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get email conversation
	 * 
	 * @param {String} conversationId conversationId
	 */
	getConversationsEmail(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsEmail';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get conversation message
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} messageId messageId
	 */
	getConversationsEmailMessage(conversationId, messageId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsEmailMessage';
		}
		// verify the required parameter 'messageId' is set
		if (messageId === undefined || messageId === null) {
			throw 'Missing the required parameter "messageId" when calling getConversationsEmailMessage';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}/messages/{messageId}', 
			'GET', 
			{ 'conversationId': conversationId,'messageId': messageId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get conversation messages
	 * 
	 * @param {String} conversationId conversationId
	 */
	getConversationsEmailMessages(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsEmailMessages';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}/messages', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get conversation draft reply
	 * 
	 * @param {String} conversationId conversationId
	 */
	getConversationsEmailMessagesDraft(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsEmailMessagesDraft';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}/messages/draft', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the wrap-up for this conversation participant. 
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.provisional Indicates if the wrap-up code is provisional. (default to false)
	 */
	getConversationsEmailParticipantWrapup(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsEmailParticipantWrapup';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationsEmailParticipantWrapup';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}/participants/{participantId}/wrapup', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{ 'provisional': opts['provisional'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get list of wrapup codes for this conversation participant
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 */
	getConversationsEmailParticipantWrapupcodes(conversationId, participantId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsEmailParticipantWrapupcodes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationsEmailParticipantWrapupcodes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}/participants/{participantId}/wrapupcodes', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get active email conversations for the logged in user
	 * 
	 */
	getConversationsEmails() { 

		return this.apiClient.callApi(
			'/api/v2/conversations/emails', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get message conversation
	 * 
	 * @param {String} conversationId conversationId
	 */
	getConversationsMessage(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsMessage';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/messages/{conversationId}', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get message
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} messageId messageId
	 */
	getConversationsMessageMessage(conversationId, messageId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsMessageMessage';
		}
		// verify the required parameter 'messageId' is set
		if (messageId === undefined || messageId === null) {
			throw 'Missing the required parameter "messageId" when calling getConversationsMessageMessage';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/messages/{conversationId}/messages/{messageId}', 
			'GET', 
			{ 'conversationId': conversationId,'messageId': messageId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the wrap-up for this conversation participant. 
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.provisional Indicates if the wrap-up code is provisional. (default to false)
	 */
	getConversationsMessageParticipantWrapup(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsMessageParticipantWrapup';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationsMessageParticipantWrapup';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/messages/{conversationId}/participants/{participantId}/wrapup', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{ 'provisional': opts['provisional'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get list of wrapup codes for this conversation participant
	 * 
	 * @param {String} conversationId  conversationId
	 * @param {String} participantId participantId
	 */
	getConversationsMessageParticipantWrapupcodes(conversationId, participantId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationsMessageParticipantWrapupcodes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling getConversationsMessageParticipantWrapupcodes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/messages/{conversationId}/participants/{participantId}/wrapupcodes', 
			'GET', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get active message conversations for the logged in user
	 * 
	 */
	getConversationsMessages() { 

		return this.apiClient.callApi(
			'/api/v2/conversations/messages', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a participant.
	 * Update conversation participant.
	 * @param {String} conversationId conversation ID
	 * @param {String} participantId participant ID
	 * @param {Object} body Update request
	 */
	patchConversationParticipant(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationParticipant';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationParticipant';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationParticipant';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/participants/{participantId}', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the attributes on a conversation participant.
	 * 
	 * @param {String} conversationId conversation ID
	 * @param {String} participantId participant ID
	 * @param {Object} body Participant attributes
	 */
	patchConversationParticipantAttributes(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationParticipantAttributes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationParticipantAttributes';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationParticipantAttributes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/participants/{participantId}/attributes', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a conversation by setting it&#39;s recording state, merging in other conversations to create a conference, or disconnecting all of the participants
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body Conversation
	 */
	patchConversationsCall(conversationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsCall';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsCall';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}', 
			'PATCH', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update conversation participant
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Participant request
	 */
	patchConversationsCallParticipant(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsCallParticipant';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsCallParticipant';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsCallParticipant';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}/participants/{participantId}', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the attributes on a conversation participant.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Participant attributes
	 */
	patchConversationsCallParticipantAttributes(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsCallParticipantAttributes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsCallParticipantAttributes';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsCallParticipantAttributes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}/participants/{participantId}/attributes', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update conversation participant&#39;s communication by disconnecting it.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {String} communicationId communicationId
	 * @param {Object} body Participant
	 */
	patchConversationsCallParticipantCommunication(conversationId, participantId, communicationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsCallParticipantCommunication';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsCallParticipantCommunication';
		}
		// verify the required parameter 'communicationId' is set
		if (communicationId === undefined || communicationId === null) {
			throw 'Missing the required parameter "communicationId" when calling patchConversationsCallParticipantCommunication';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsCallParticipantCommunication';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}/participants/{participantId}/communications/{communicationId}', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId,'communicationId': communicationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Change who can speak
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body new speak to
	 */
	patchConversationsCallParticipantConsult(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsCallParticipantConsult';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsCallParticipantConsult';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsCallParticipantConsult';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}/participants/{participantId}/consult', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a conversation by disconnecting all of the participants
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body Conversation
	 */
	patchConversationsCallback(conversationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsCallback';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsCallback';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/callbacks/{conversationId}', 
			'PATCH', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update conversation participant
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Participant
	 */
	patchConversationsCallbackParticipant(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsCallbackParticipant';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsCallbackParticipant';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsCallbackParticipant';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/callbacks/{conversationId}/participants/{participantId}', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the attributes on a conversation participant.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Attributes
	 */
	patchConversationsCallbackParticipantAttributes(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsCallbackParticipantAttributes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsCallbackParticipantAttributes';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsCallbackParticipantAttributes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/callbacks/{conversationId}/participants/{participantId}/attributes', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update conversation participant&#39;s communication by disconnecting it.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {String} communicationId communicationId
	 * @param {Object} body Participant
	 */
	patchConversationsCallbackParticipantCommunication(conversationId, participantId, communicationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsCallbackParticipantCommunication';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsCallbackParticipantCommunication';
		}
		// verify the required parameter 'communicationId' is set
		if (communicationId === undefined || communicationId === null) {
			throw 'Missing the required parameter "communicationId" when calling patchConversationsCallbackParticipantCommunication';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsCallbackParticipantCommunication';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/callbacks/{conversationId}/participants/{participantId}/communications/{communicationId}', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId,'communicationId': communicationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a conversation by disconnecting all of the participants
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body Conversation
	 */
	patchConversationsChat(conversationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsChat';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsChat';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/chats/{conversationId}', 
			'PATCH', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update conversation participant
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Update request
	 */
	patchConversationsChatParticipant(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsChatParticipant';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsChatParticipant';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsChatParticipant';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/chats/{conversationId}/participants/{participantId}', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the attributes on a conversation participant.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Participant attributes
	 */
	patchConversationsChatParticipantAttributes(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsChatParticipantAttributes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsChatParticipantAttributes';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsChatParticipantAttributes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/chats/{conversationId}/participants/{participantId}/attributes', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update conversation participant&#39;s communication by disconnecting it.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {String} communicationId communicationId
	 * @param {Object} body Participant
	 */
	patchConversationsChatParticipantCommunication(conversationId, participantId, communicationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsChatParticipantCommunication';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsChatParticipantCommunication';
		}
		// verify the required parameter 'communicationId' is set
		if (communicationId === undefined || communicationId === null) {
			throw 'Missing the required parameter "communicationId" when calling patchConversationsChatParticipantCommunication';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsChatParticipantCommunication';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/chats/{conversationId}/participants/{participantId}/communications/{communicationId}', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId,'communicationId': communicationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a conversation by disconnecting all of the participants
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body Conversation
	 */
	patchConversationsCobrowsesession(conversationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsCobrowsesession';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsCobrowsesession';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/cobrowsesessions/{conversationId}', 
			'PATCH', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update conversation participant
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	patchConversationsCobrowsesessionParticipant(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsCobrowsesessionParticipant';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsCobrowsesessionParticipant';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/cobrowsesessions/{conversationId}/participants/{participantId}', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the attributes on a conversation participant.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	patchConversationsCobrowsesessionParticipantAttributes(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsCobrowsesessionParticipantAttributes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsCobrowsesessionParticipantAttributes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/cobrowsesessions/{conversationId}/participants/{participantId}/attributes', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update conversation participant&#39;s communication by disconnecting it.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {String} communicationId communicationId
	 * @param {Object} body Participant
	 */
	patchConversationsCobrowsesessionParticipantCommunication(conversationId, participantId, communicationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsCobrowsesessionParticipantCommunication';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsCobrowsesessionParticipantCommunication';
		}
		// verify the required parameter 'communicationId' is set
		if (communicationId === undefined || communicationId === null) {
			throw 'Missing the required parameter "communicationId" when calling patchConversationsCobrowsesessionParticipantCommunication';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsCobrowsesessionParticipantCommunication';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/cobrowsesessions/{conversationId}/participants/{participantId}/communications/{communicationId}', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId,'communicationId': communicationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a conversation by disconnecting all of the participants
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body Conversation
	 */
	patchConversationsEmail(conversationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsEmail';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsEmail';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}', 
			'PATCH', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update conversation participant
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Update request
	 */
	patchConversationsEmailParticipant(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsEmailParticipant';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsEmailParticipant';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsEmailParticipant';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}/participants/{participantId}', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the attributes on a conversation participant.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Participant attributes
	 */
	patchConversationsEmailParticipantAttributes(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsEmailParticipantAttributes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsEmailParticipantAttributes';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsEmailParticipantAttributes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}/participants/{participantId}/attributes', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update conversation participant&#39;s communication by disconnecting it.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {String} communicationId communicationId
	 * @param {Object} body Participant
	 */
	patchConversationsEmailParticipantCommunication(conversationId, participantId, communicationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsEmailParticipantCommunication';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsEmailParticipantCommunication';
		}
		// verify the required parameter 'communicationId' is set
		if (communicationId === undefined || communicationId === null) {
			throw 'Missing the required parameter "communicationId" when calling patchConversationsEmailParticipantCommunication';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsEmailParticipantCommunication';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}/participants/{participantId}/communications/{communicationId}', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId,'communicationId': communicationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a conversation by disconnecting all of the participants
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body Conversation
	 */
	patchConversationsMessage(conversationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsMessage';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsMessage';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/messages/{conversationId}', 
			'PATCH', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update conversation participant
	 * 
	 * @param {String} conversationId  conversationId
	 * @param {String} participantId participantId
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	patchConversationsMessageParticipant(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsMessageParticipant';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsMessageParticipant';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/messages/{conversationId}/participants/{participantId}', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the attributes on a conversation participant.
	 * 
	 * @param {String} conversationId  conversationId
	 * @param {String} participantId participantId
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	patchConversationsMessageParticipantAttributes(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsMessageParticipantAttributes';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsMessageParticipantAttributes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/messages/{conversationId}/participants/{participantId}/attributes', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update conversation participant&#39;s communication by disconnecting it.
	 * 
	 * @param {String} conversationId  conversationId
	 * @param {String} participantId participantId
	 * @param {String} communicationId communicationId
	 * @param {Object} body Participant
	 */
	patchConversationsMessageParticipantCommunication(conversationId, participantId, communicationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling patchConversationsMessageParticipantCommunication';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling patchConversationsMessageParticipantCommunication';
		}
		// verify the required parameter 'communicationId' is set
		if (communicationId === undefined || communicationId === null) {
			throw 'Missing the required parameter "communicationId" when calling patchConversationsMessageParticipantCommunication';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchConversationsMessageParticipantCommunication';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/messages/{conversationId}/participants/{participantId}/communications/{communicationId}', 
			'PATCH', 
			{ 'conversationId': conversationId,'participantId': participantId,'communicationId': communicationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Index conversation properties
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body request
	 */
	postAnalyticsConversationDetailsProperties(conversationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postAnalyticsConversationDetailsProperties';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsConversationDetailsProperties';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/conversations/{conversationId}/details/properties', 
			'POST', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for conversation aggregates
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsConversationsAggregatesQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsConversationsAggregatesQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/conversations/aggregates/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for conversation details
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsConversationsDetailsQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsConversationsDetailsQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/conversations/details/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Performs a full conversation teardown. Issues disconnect requests for any connected media. Applies a system wrap-up code to any participants that are pending wrap-up. This is not intended to be the normal way of ending interactions but is available in the event of problems with the application to allow a resyncronization of state across all components. It is recommended that users submit a support case if they are relying on this endpoint systematically as there is likely something that needs investigation.
	 * 
	 * @param {String} conversationId conversation ID
	 */
	postConversationDisconnect(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationDisconnect';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/disconnect', 
			'POST', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new callback for the specified participant on the conversation.
	 * 
	 * @param {String} conversationId conversation ID
	 * @param {String} participantId participant ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postConversationParticipantCallbacks(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationParticipantCallbacks';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling postConversationParticipantCallbacks';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/participants/{participantId}/callbacks', 
			'POST', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Sends DTMF to the participant
	 * 
	 * @param {String} conversationId conversation ID
	 * @param {String} participantId participant ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Digits
	 */
	postConversationParticipantDigits(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationParticipantDigits';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling postConversationParticipantDigits';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/participants/{participantId}/digits', 
			'POST', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Replace this participant with the specified user and/or address
	 * 
	 * @param {String} conversationId conversation ID
	 * @param {String} participantId participant ID
	 * @param {Object} body Transfer request
	 */
	postConversationParticipantReplace(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationParticipantReplace';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling postConversationParticipantReplace';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationParticipantReplace';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/participants/{participantId}/replace', 
			'POST', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create secure IVR session. Only a participant in the conversation can invoke a secure IVR.
	 * 
	 * @param {String} conversationId conversation ID
	 * @param {String} participantId participant ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postConversationParticipantSecureivrsessions(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationParticipantSecureivrsessions';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling postConversationParticipantSecureivrsessions';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/participants/{participantId}/secureivrsessions', 
			'POST', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Place a new call as part of a callback conversation.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body Conversation
	 */
	postConversationsCall(conversationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsCall';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsCall';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}', 
			'POST', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Initiate and update consult transfer
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Destination address &amp; initial speak to
	 */
	postConversationsCallParticipantConsult(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsCallParticipantConsult';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling postConversationsCallParticipantConsult';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsCallParticipantConsult';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}/participants/{participantId}/consult', 
			'POST', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Listen in on the conversation from the point of view of a given participant.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 */
	postConversationsCallParticipantMonitor(conversationId, participantId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsCallParticipantMonitor';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling postConversationsCallParticipantMonitor';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}/participants/{participantId}/monitor', 
			'POST', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Replace this participant with the specified user and/or address
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Transfer request
	 */
	postConversationsCallParticipantReplace(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsCallParticipantReplace';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling postConversationsCallParticipantReplace';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsCallParticipantReplace';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}/participants/{participantId}/replace', 
			'POST', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add participants to a conversation
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body Conversation
	 */
	postConversationsCallParticipants(conversationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsCallParticipants';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsCallParticipants';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}/participants', 
			'POST', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Replace this participant with the specified user and/or address
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Transfer request
	 */
	postConversationsCallbackParticipantReplace(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsCallbackParticipantReplace';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling postConversationsCallbackParticipantReplace';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsCallbackParticipantReplace';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/callbacks/{conversationId}/participants/{participantId}/replace', 
			'POST', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a Callback
	 * 
	 * @param {Object} body Callback
	 */
	postConversationsCallbacks(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsCallbacks';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/callbacks', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a call conversation
	 * 
	 * @param {Object} body Call request
	 */
	postConversationsCalls(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsCalls';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Replace this participant with the specified user and/or address
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Transfer request
	 */
	postConversationsChatParticipantReplace(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsChatParticipantReplace';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling postConversationsChatParticipantReplace';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsChatParticipantReplace';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/chats/{conversationId}/participants/{participantId}/replace', 
			'POST', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a web chat conversation
	 * 
	 * @param {Object} body Create web chat request
	 */
	postConversationsChats(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsChats';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/chats', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Replace this participant with the specified user and/or address
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postConversationsCobrowsesessionParticipantReplace(conversationId, participantId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsCobrowsesessionParticipantReplace';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling postConversationsCobrowsesessionParticipantReplace';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/cobrowsesessions/{conversationId}/participants/{participantId}/replace', 
			'POST', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Send an email to an external conversation. An external conversation is one where the provider is not PureCloud based. This endpoint allows the sender of the external email to reply or send a new message to the existing conversation. The new message will be treated as part of the existing conversation and chained to it.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body Send external email reply
	 */
	postConversationsEmailInboundmessages(conversationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsEmailInboundmessages';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsEmailInboundmessages';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}/inboundmessages', 
			'POST', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Send an email reply
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body Reply
	 */
	postConversationsEmailMessages(conversationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsEmailMessages';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsEmailMessages';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}/messages', 
			'POST', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Replace this participant with the specified user and/or address
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Transfer request
	 */
	postConversationsEmailParticipantReplace(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsEmailParticipantReplace';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling postConversationsEmailParticipantReplace';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsEmailParticipantReplace';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}/participants/{participantId}/replace', 
			'POST', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create an email conversation
	 * If the direction of the request is INBOUND, this will create an external conversation with a third party provider. If the direction of the the request is OUTBOUND, this will create a conversation to send outbound emails on behalf of a queue.
	 * @param {Object} body Create email request
	 */
	postConversationsEmails(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsEmails';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create Fax Conversation
	 * 
	 * @param {Object} body Fax
	 */
	postConversationsFaxes(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsFaxes';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/faxes', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Send message
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} communicationId communicationId
	 * @param {Object} body Message
	 */
	postConversationsMessageCommunicationMessages(conversationId, communicationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsMessageCommunicationMessages';
		}
		// verify the required parameter 'communicationId' is set
		if (communicationId === undefined || communicationId === null) {
			throw 'Missing the required parameter "communicationId" when calling postConversationsMessageCommunicationMessages';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsMessageCommunicationMessages';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/messages/{conversationId}/communications/{communicationId}/messages', 
			'POST', 
			{ 'conversationId': conversationId,'communicationId': communicationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get messages in batch
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} opts Optional parameters
	 * @param {Array.<Object>} opts.body messageIds
	 */
	postConversationsMessageMessagesBulk(conversationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsMessageMessagesBulk';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/messages/{conversationId}/messages/bulk', 
			'POST', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Replace this participant with the specified user and/or address
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {Object} body Transfer request
	 */
	postConversationsMessageParticipantReplace(conversationId, participantId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationsMessageParticipantReplace';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling postConversationsMessageParticipantReplace';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationsMessageParticipantReplace';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/messages/{conversationId}/participants/{participantId}/replace', 
			'POST', 
			{ 'conversationId': conversationId,'participantId': participantId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Set uuiData to be sent on future commands.
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} participantId participantId
	 * @param {String} communicationId communicationId
	 * @param {Object} body UUIData Request
	 */
	putConversationsCallParticipantCommunicationUuidata(conversationId, participantId, communicationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling putConversationsCallParticipantCommunicationUuidata';
		}
		// verify the required parameter 'participantId' is set
		if (participantId === undefined || participantId === null) {
			throw 'Missing the required parameter "participantId" when calling putConversationsCallParticipantCommunicationUuidata';
		}
		// verify the required parameter 'communicationId' is set
		if (communicationId === undefined || communicationId === null) {
			throw 'Missing the required parameter "communicationId" when calling putConversationsCallParticipantCommunicationUuidata';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putConversationsCallParticipantCommunicationUuidata';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/calls/{conversationId}/participants/{participantId}/communications/{communicationId}/uuidata', 
			'PUT', 
			{ 'conversationId': conversationId,'participantId': participantId,'communicationId': communicationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update conversation draft reply
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body Draft
	 */
	putConversationsEmailMessagesDraft(conversationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling putConversationsEmailMessagesDraft';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putConversationsEmailMessagesDraft';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/emails/{conversationId}/messages/draft', 
			'PUT', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class ExternalContactsApi {
	/**
	 * ExternalContacts service.
	 * @module purecloud-platform-client-v2/api/ExternalContactsApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new ExternalContactsApi. 
	 * @alias module:purecloud-platform-client-v2/api/ExternalContactsApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete an external contact
	 * 
	 * @param {String} contactId ExternalContact ID
	 */
	deleteExternalcontactsContact(contactId) { 
		// verify the required parameter 'contactId' is set
		if (contactId === undefined || contactId === null) {
			throw 'Missing the required parameter "contactId" when calling deleteExternalcontactsContact';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/contacts/{contactId}', 
			'DELETE', 
			{ 'contactId': contactId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a note for an external contact
	 * 
	 * @param {String} contactId ExternalContact Id
	 * @param {String} noteId Note Id
	 */
	deleteExternalcontactsContactNote(contactId, noteId) { 
		// verify the required parameter 'contactId' is set
		if (contactId === undefined || contactId === null) {
			throw 'Missing the required parameter "contactId" when calling deleteExternalcontactsContactNote';
		}
		// verify the required parameter 'noteId' is set
		if (noteId === undefined || noteId === null) {
			throw 'Missing the required parameter "noteId" when calling deleteExternalcontactsContactNote';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/contacts/{contactId}/notes/{noteId}', 
			'DELETE', 
			{ 'contactId': contactId,'noteId': noteId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete an external organization
	 * 
	 * @param {String} externalOrganizationId External Organization ID
	 */
	deleteExternalcontactsOrganization(externalOrganizationId) { 
		// verify the required parameter 'externalOrganizationId' is set
		if (externalOrganizationId === undefined || externalOrganizationId === null) {
			throw 'Missing the required parameter "externalOrganizationId" when calling deleteExternalcontactsOrganization';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations/{externalOrganizationId}', 
			'DELETE', 
			{ 'externalOrganizationId': externalOrganizationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a note for an external organization
	 * 
	 * @param {String} externalOrganizationId External Organization Id
	 * @param {String} noteId Note Id
	 */
	deleteExternalcontactsOrganizationNote(externalOrganizationId, noteId) { 
		// verify the required parameter 'externalOrganizationId' is set
		if (externalOrganizationId === undefined || externalOrganizationId === null) {
			throw 'Missing the required parameter "externalOrganizationId" when calling deleteExternalcontactsOrganizationNote';
		}
		// verify the required parameter 'noteId' is set
		if (noteId === undefined || noteId === null) {
			throw 'Missing the required parameter "noteId" when calling deleteExternalcontactsOrganizationNote';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations/{externalOrganizationId}/notes/{noteId}', 
			'DELETE', 
			{ 'externalOrganizationId': externalOrganizationId,'noteId': noteId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Unlink the Trustor for this External Organization
	 * 
	 * @param {String} externalOrganizationId External Organization ID
	 */
	deleteExternalcontactsOrganizationTrustor(externalOrganizationId) { 
		// verify the required parameter 'externalOrganizationId' is set
		if (externalOrganizationId === undefined || externalOrganizationId === null) {
			throw 'Missing the required parameter "externalOrganizationId" when calling deleteExternalcontactsOrganizationTrustor';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations/{externalOrganizationId}/trustor', 
			'DELETE', 
			{ 'externalOrganizationId': externalOrganizationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a relationship
	 * 
	 * @param {String} relationshipId Relationship Id
	 */
	deleteExternalcontactsRelationship(relationshipId) { 
		// verify the required parameter 'relationshipId' is set
		if (relationshipId === undefined || relationshipId === null) {
			throw 'Missing the required parameter "relationshipId" when calling deleteExternalcontactsRelationship';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/relationships/{relationshipId}', 
			'DELETE', 
			{ 'relationshipId': relationshipId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Fetch an external contact
	 * 
	 * @param {String} contactId ExternalContact ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand which fields, if any, to expand (externalOrganization,externalDataSources)
	 */
	getExternalcontactsContact(contactId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'contactId' is set
		if (contactId === undefined || contactId === null) {
			throw 'Missing the required parameter "contactId" when calling getExternalcontactsContact';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/contacts/{contactId}', 
			'GET', 
			{ 'contactId': contactId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Fetch a note for an external contact
	 * 
	 * @param {String} contactId ExternalContact Id
	 * @param {String} noteId Note Id
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand which fields, if any, to expand
	 */
	getExternalcontactsContactNote(contactId, noteId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'contactId' is set
		if (contactId === undefined || contactId === null) {
			throw 'Missing the required parameter "contactId" when calling getExternalcontactsContactNote';
		}
		// verify the required parameter 'noteId' is set
		if (noteId === undefined || noteId === null) {
			throw 'Missing the required parameter "noteId" when calling getExternalcontactsContactNote';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/contacts/{contactId}/notes/{noteId}', 
			'GET', 
			{ 'contactId': contactId,'noteId': noteId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List notes for an external contact
	 * 
	 * @param {String} contactId ExternalContact Id
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (limited to fetching first 1,000 records; pageNumber * pageSize must be &lt;= 1,000) (default to 20)
	 * @param {Number} opts.pageNumber Page number (limited to fetching first 1,000 records; pageNumber * pageSize must be &lt;= 1,000) (default to 1)
	 * @param {String} opts.sortOrder Sort order
	 * @param {Array.<String>} opts.expand which fields, if any, to expand
	 */
	getExternalcontactsContactNotes(contactId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'contactId' is set
		if (contactId === undefined || contactId === null) {
			throw 'Missing the required parameter "contactId" when calling getExternalcontactsContactNotes';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/contacts/{contactId}/notes', 
			'GET', 
			{ 'contactId': contactId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortOrder': opts['sortOrder'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search for external contacts
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (limited to fetching first 1,000 records; pageNumber * pageSize must be &lt;= 1,000) (default to 20)
	 * @param {Number} opts.pageNumber Page number (limited to fetching first 1,000 records; pageNumber * pageSize must be &lt;= 1,000) (default to 1)
	 * @param {String} opts.q User supplied search keywords (no special syntax is currently supported)
	 * @param {String} opts.sortOrder Sort order
	 * @param {Array.<String>} opts.expand which fields, if any, to expand
	 */
	getExternalcontactsContacts(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/contacts', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'q': opts['q'],'sortOrder': opts['sortOrder'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Fetch an external organization
	 * 
	 * @param {String} externalOrganizationId External Organization ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.expand which fields, if any, to expand (externalDataSources)
	 * @param {Boolean} opts.includeTrustors (true or false) whether or not to include trustor information embedded in the externalOrganization
	 */
	getExternalcontactsOrganization(externalOrganizationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'externalOrganizationId' is set
		if (externalOrganizationId === undefined || externalOrganizationId === null) {
			throw 'Missing the required parameter "externalOrganizationId" when calling getExternalcontactsOrganization';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations/{externalOrganizationId}', 
			'GET', 
			{ 'externalOrganizationId': externalOrganizationId }, 
			{ 'expand': opts['expand'],'includeTrustors': opts['includeTrustors'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search for external contacts in an external organization
	 * 
	 * @param {String} externalOrganizationId External Organization ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (limited to fetching first 1,000 records; pageNumber * pageSize must be &lt;= 1,000) (default to 20)
	 * @param {Number} opts.pageNumber Page number (limited to fetching first 1,000 records; pageNumber * pageSize must be &lt;= 1,000) (default to 1)
	 * @param {String} opts.q User supplied search keywords (no special syntax is currently supported)
	 * @param {String} opts.sortOrder Sort order
	 * @param {Array.<String>} opts.expand which fields, if any, to expand
	 */
	getExternalcontactsOrganizationContacts(externalOrganizationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'externalOrganizationId' is set
		if (externalOrganizationId === undefined || externalOrganizationId === null) {
			throw 'Missing the required parameter "externalOrganizationId" when calling getExternalcontactsOrganizationContacts';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations/{externalOrganizationId}/contacts', 
			'GET', 
			{ 'externalOrganizationId': externalOrganizationId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'q': opts['q'],'sortOrder': opts['sortOrder'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Fetch a note for an external organization
	 * 
	 * @param {String} externalOrganizationId External Organization Id
	 * @param {String} noteId Note Id
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand which fields, if any, to expand
	 */
	getExternalcontactsOrganizationNote(externalOrganizationId, noteId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'externalOrganizationId' is set
		if (externalOrganizationId === undefined || externalOrganizationId === null) {
			throw 'Missing the required parameter "externalOrganizationId" when calling getExternalcontactsOrganizationNote';
		}
		// verify the required parameter 'noteId' is set
		if (noteId === undefined || noteId === null) {
			throw 'Missing the required parameter "noteId" when calling getExternalcontactsOrganizationNote';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations/{externalOrganizationId}/notes/{noteId}', 
			'GET', 
			{ 'externalOrganizationId': externalOrganizationId,'noteId': noteId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List notes for an external organization
	 * 
	 * @param {String} externalOrganizationId External Organization Id
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (limited to fetching first 1,000 records; pageNumber * pageSize must be &lt;= 1,000) (default to 20)
	 * @param {Number} opts.pageNumber Page number (limited to fetching first 1,000 records; pageNumber * pageSize must be &lt;= 1,000) (default to 1)
	 * @param {String} opts.sortOrder Sort order
	 * @param {Array.<String>} opts.expand which fields, if any, to expand
	 */
	getExternalcontactsOrganizationNotes(externalOrganizationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'externalOrganizationId' is set
		if (externalOrganizationId === undefined || externalOrganizationId === null) {
			throw 'Missing the required parameter "externalOrganizationId" when calling getExternalcontactsOrganizationNotes';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations/{externalOrganizationId}/notes', 
			'GET', 
			{ 'externalOrganizationId': externalOrganizationId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortOrder': opts['sortOrder'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Fetch a relationship for an external organization
	 * 
	 * @param {String} externalOrganizationId External Organization ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (limited to fetching first 1,000 records; pageNumber * pageSize must be &lt;= 1,000) (default to 20)
	 * @param {Number} opts.pageNumber Page number (limited to fetching first 1,000 records; pageNumber * pageSize must be &lt;= 1,000) (default to 1)
	 * @param {Object} opts.expand which fields, if any, to expand
	 * @param {String} opts.sortOrder Sort order
	 */
	getExternalcontactsOrganizationRelationships(externalOrganizationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'externalOrganizationId' is set
		if (externalOrganizationId === undefined || externalOrganizationId === null) {
			throw 'Missing the required parameter "externalOrganizationId" when calling getExternalcontactsOrganizationRelationships';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations/{externalOrganizationId}/relationships', 
			'GET', 
			{ 'externalOrganizationId': externalOrganizationId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'expand': opts['expand'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search for external organizations
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (limited to fetching first 1,000 records; pageNumber * pageSize must be &lt;= 1,000) (default to 20)
	 * @param {Number} opts.pageNumber Page number (limited to fetching first 1,000 records; pageNumber * pageSize must be &lt;= 1,000) (default to 1)
	 * @param {String} opts.q Search query
	 * @param {Array.<String>} opts.trustorId Search for external organizations by trustorIds (limit 25). If supplied, the &#39;q&#39; parameters is ignored. Items are returned in the order requested
	 * @param {String} opts.sortOrder Sort order
	 * @param {Array.<String>} opts.expand which fields, if any, to expand
	 * @param {Boolean} opts.includeTrustors (true or false) whether or not to include trustor information embedded in the externalOrganization
	 */
	getExternalcontactsOrganizations(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'q': opts['q'],'trustorId': this.apiClient.buildCollectionParam(opts['trustorId'], 'multi'),'sortOrder': opts['sortOrder'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'includeTrustors': opts['includeTrustors'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Fetch a relationship
	 * 
	 * @param {String} relationshipId Relationship Id
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.expand which fields, if any, to expand
	 */
	getExternalcontactsRelationship(relationshipId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'relationshipId' is set
		if (relationshipId === undefined || relationshipId === null) {
			throw 'Missing the required parameter "relationshipId" when calling getExternalcontactsRelationship';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/relationships/{relationshipId}', 
			'GET', 
			{ 'relationshipId': relationshipId }, 
			{ 'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Lookup contacts and externalOrganizations based on an attribute
	 * 
	 * @param {String} lookupVal User supplied value to lookup contacts/externalOrganizations (supports email addresses, e164 phone numbers, Twitter screen names)
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand which field, if any, to expand
	 */
	getExternalcontactsReversewhitepageslookup(lookupVal, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'lookupVal' is set
		if (lookupVal === undefined || lookupVal === null) {
			throw 'Missing the required parameter "lookupVal" when calling getExternalcontactsReversewhitepageslookup';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/reversewhitepageslookup', 
			'GET', 
			{  }, 
			{ 'lookupVal': lookupVal,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a note for an external contact
	 * 
	 * @param {String} contactId ExternalContact Id
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body ExternalContact
	 */
	postExternalcontactsContactNotes(contactId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'contactId' is set
		if (contactId === undefined || contactId === null) {
			throw 'Missing the required parameter "contactId" when calling postExternalcontactsContactNotes';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/contacts/{contactId}/notes', 
			'POST', 
			{ 'contactId': contactId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create an external contact
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body ExternalContact
	 */
	postExternalcontactsContacts(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/contacts', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a note for an external organization
	 * 
	 * @param {String} externalOrganizationId External Organization Id
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body ExternalContact
	 */
	postExternalcontactsOrganizationNotes(externalOrganizationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'externalOrganizationId' is set
		if (externalOrganizationId === undefined || externalOrganizationId === null) {
			throw 'Missing the required parameter "externalOrganizationId" when calling postExternalcontactsOrganizationNotes';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations/{externalOrganizationId}/notes', 
			'POST', 
			{ 'externalOrganizationId': externalOrganizationId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create an external organization
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body ExternalOrganization
	 */
	postExternalcontactsOrganizations(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a relationship
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Relationship
	 */
	postExternalcontactsRelationships(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/relationships', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an external contact
	 * 
	 * @param {String} contactId ExternalContact ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body ExternalContact
	 */
	putExternalcontactsContact(contactId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'contactId' is set
		if (contactId === undefined || contactId === null) {
			throw 'Missing the required parameter "contactId" when calling putExternalcontactsContact';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/contacts/{contactId}', 
			'PUT', 
			{ 'contactId': contactId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a note for an external contact
	 * 
	 * @param {String} contactId ExternalContact Id
	 * @param {String} noteId Note Id
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Note
	 */
	putExternalcontactsContactNote(contactId, noteId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'contactId' is set
		if (contactId === undefined || contactId === null) {
			throw 'Missing the required parameter "contactId" when calling putExternalcontactsContactNote';
		}
		// verify the required parameter 'noteId' is set
		if (noteId === undefined || noteId === null) {
			throw 'Missing the required parameter "noteId" when calling putExternalcontactsContactNote';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/contacts/{contactId}/notes/{noteId}', 
			'PUT', 
			{ 'contactId': contactId,'noteId': noteId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Associate an external contact with a conversation
	 * 
	 * @param {String} conversationId Conversation ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body ConversationAssociation
	 */
	putExternalcontactsConversation(conversationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling putExternalcontactsConversation';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/conversations/{conversationId}', 
			'PUT', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an external organization
	 * 
	 * @param {String} externalOrganizationId External Organization ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body ExternalOrganization
	 */
	putExternalcontactsOrganization(externalOrganizationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'externalOrganizationId' is set
		if (externalOrganizationId === undefined || externalOrganizationId === null) {
			throw 'Missing the required parameter "externalOrganizationId" when calling putExternalcontactsOrganization';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations/{externalOrganizationId}', 
			'PUT', 
			{ 'externalOrganizationId': externalOrganizationId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a note for an external organization
	 * 
	 * @param {String} externalOrganizationId External Organization Id
	 * @param {String} noteId Note Id
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Note
	 */
	putExternalcontactsOrganizationNote(externalOrganizationId, noteId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'externalOrganizationId' is set
		if (externalOrganizationId === undefined || externalOrganizationId === null) {
			throw 'Missing the required parameter "externalOrganizationId" when calling putExternalcontactsOrganizationNote';
		}
		// verify the required parameter 'noteId' is set
		if (noteId === undefined || noteId === null) {
			throw 'Missing the required parameter "noteId" when calling putExternalcontactsOrganizationNote';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations/{externalOrganizationId}/notes/{noteId}', 
			'PUT', 
			{ 'externalOrganizationId': externalOrganizationId,'noteId': noteId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Links a Trustor with an Extenral Organization
	 * 
	 * @param {String} externalOrganizationId External Organization ID
	 * @param {String} trustorId Trustor ID
	 */
	putExternalcontactsOrganizationTrustorTrustorId(externalOrganizationId, trustorId) { 
		// verify the required parameter 'externalOrganizationId' is set
		if (externalOrganizationId === undefined || externalOrganizationId === null) {
			throw 'Missing the required parameter "externalOrganizationId" when calling putExternalcontactsOrganizationTrustorTrustorId';
		}
		// verify the required parameter 'trustorId' is set
		if (trustorId === undefined || trustorId === null) {
			throw 'Missing the required parameter "trustorId" when calling putExternalcontactsOrganizationTrustorTrustorId';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/organizations/{externalOrganizationId}/trustor/{trustorId}', 
			'PUT', 
			{ 'externalOrganizationId': externalOrganizationId,'trustorId': trustorId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a relationship
	 * 
	 * @param {String} relationshipId Relationship Id
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Relationship
	 */
	putExternalcontactsRelationship(relationshipId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'relationshipId' is set
		if (relationshipId === undefined || relationshipId === null) {
			throw 'Missing the required parameter "relationshipId" when calling putExternalcontactsRelationship';
		}

		return this.apiClient.callApi(
			'/api/v2/externalcontacts/relationships/{relationshipId}', 
			'PUT', 
			{ 'relationshipId': relationshipId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class FaxApi {
	/**
	 * Fax service.
	 * @module purecloud-platform-client-v2/api/FaxApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new FaxApi. 
	 * @alias module:purecloud-platform-client-v2/api/FaxApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete a fax document.
	 * 
	 * @param {String} documentId Document ID
	 */
	deleteFaxDocument(documentId) { 
		// verify the required parameter 'documentId' is set
		if (documentId === undefined || documentId === null) {
			throw 'Missing the required parameter "documentId" when calling deleteFaxDocument';
		}

		return this.apiClient.callApi(
			'/api/v2/fax/documents/{documentId}', 
			'DELETE', 
			{ 'documentId': documentId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a document.
	 * 
	 * @param {String} documentId Document ID
	 */
	getFaxDocument(documentId) { 
		// verify the required parameter 'documentId' is set
		if (documentId === undefined || documentId === null) {
			throw 'Missing the required parameter "documentId" when calling getFaxDocument';
		}

		return this.apiClient.callApi(
			'/api/v2/fax/documents/{documentId}', 
			'GET', 
			{ 'documentId': documentId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Download a fax document.
	 * 
	 * @param {String} documentId Document ID
	 */
	getFaxDocumentContent(documentId) { 
		// verify the required parameter 'documentId' is set
		if (documentId === undefined || documentId === null) {
			throw 'Missing the required parameter "documentId" when calling getFaxDocumentContent';
		}

		return this.apiClient.callApi(
			'/api/v2/fax/documents/{documentId}/content', 
			'GET', 
			{ 'documentId': documentId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of fax documents.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getFaxDocuments(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/fax/documents', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get fax summary
	 * 
	 */
	getFaxSummary() { 

		return this.apiClient.callApi(
			'/api/v2/fax/summary', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a fax document.
	 * 
	 * @param {String} documentId Document ID
	 * @param {Object} body Document
	 */
	putFaxDocument(documentId, body) { 
		// verify the required parameter 'documentId' is set
		if (documentId === undefined || documentId === null) {
			throw 'Missing the required parameter "documentId" when calling putFaxDocument';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putFaxDocument';
		}

		return this.apiClient.callApi(
			'/api/v2/fax/documents/{documentId}', 
			'PUT', 
			{ 'documentId': documentId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class GeneralDataProtectionRegulationApi {
	/**
	 * GeneralDataProtectionRegulation service.
	 * @module purecloud-platform-client-v2/api/GeneralDataProtectionRegulationApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new GeneralDataProtectionRegulationApi. 
	 * @alias module:purecloud-platform-client-v2/api/GeneralDataProtectionRegulationApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Get an existing GDPR request
	 * 
	 * @param {String} requestId Request id
	 */
	getGdprRequest(requestId) { 
		// verify the required parameter 'requestId' is set
		if (requestId === undefined || requestId === null) {
			throw 'Missing the required parameter "requestId" when calling getGdprRequest';
		}

		return this.apiClient.callApi(
			'/api/v2/gdpr/requests/{requestId}', 
			'GET', 
			{ 'requestId': requestId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get all GDPR requests
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getGdprRequests(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/gdpr/requests', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get GDPR subjects
	 * 
	 * @param {Object} searchType Search Type
	 * @param {String} searchValue Search Value
	 */
	getGdprSubjects(searchType, searchValue) { 
		// verify the required parameter 'searchType' is set
		if (searchType === undefined || searchType === null) {
			throw 'Missing the required parameter "searchType" when calling getGdprSubjects';
		}
		// verify the required parameter 'searchValue' is set
		if (searchValue === undefined || searchValue === null) {
			throw 'Missing the required parameter "searchValue" when calling getGdprSubjects';
		}

		return this.apiClient.callApi(
			'/api/v2/gdpr/subjects', 
			'GET', 
			{  }, 
			{ 'searchType': searchType,'searchValue': searchValue }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Submit a new GDPR request
	 * 
	 * @param {Object} body GDPR request
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.deleteConfirmed Confirm delete (default to false)
	 */
	postGdprRequests(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postGdprRequests';
		}

		return this.apiClient.callApi(
			'/api/v2/gdpr/requests', 
			'POST', 
			{  }, 
			{ 'deleteConfirmed': opts['deleteConfirmed'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class GeolocationApi {
	/**
	 * Geolocation service.
	 * @module purecloud-platform-client-v2/api/GeolocationApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new GeolocationApi. 
	 * @alias module:purecloud-platform-client-v2/api/GeolocationApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Get a organization&#39;s GeolocationSettings
	 * 
	 */
	getGeolocationsSettings() { 

		return this.apiClient.callApi(
			'/api/v2/geolocations/settings', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a user&#39;s Geolocation
	 * 
	 * @param {String} userId user Id
	 * @param {String} clientId client Id
	 */
	getUserGeolocation(userId, clientId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserGeolocation';
		}
		// verify the required parameter 'clientId' is set
		if (clientId === undefined || clientId === null) {
			throw 'Missing the required parameter "clientId" when calling getUserGeolocation';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/geolocations/{clientId}', 
			'GET', 
			{ 'userId': userId,'clientId': clientId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Patch a organization&#39;s GeolocationSettings
	 * 
	 * @param {Object} body Geolocation settings
	 */
	patchGeolocationsSettings(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchGeolocationsSettings';
		}

		return this.apiClient.callApi(
			'/api/v2/geolocations/settings', 
			'PATCH', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Patch a user&#39;s Geolocation
	 * The geolocation object can be patched one of three ways. Option 1: Set the &#39;primary&#39; property to true. This will set the client as the user&#39;s primary geolocation source.  Option 2: Provide the &#39;latitude&#39; and &#39;longitude&#39; values.  This will enqueue an asynchronous update of the &#39;city&#39;, &#39;region&#39;, and &#39;country&#39;, generating a notification. A subsequent GET operation will include the new values for &#39;city&#39;, &#39;region&#39; and &#39;country&#39;.  Option 3:  Provide the &#39;city&#39;, &#39;region&#39;, &#39;country&#39; values.  Option 1 can be combined with Option 2 or Option 3.  For example, update the client as primary and provide latitude and longitude values.
	 * @param {String} userId user Id
	 * @param {String} clientId client Id
	 * @param {Object} body Geolocation
	 */
	patchUserGeolocation(userId, clientId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling patchUserGeolocation';
		}
		// verify the required parameter 'clientId' is set
		if (clientId === undefined || clientId === null) {
			throw 'Missing the required parameter "clientId" when calling patchUserGeolocation';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchUserGeolocation';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/geolocations/{clientId}', 
			'PATCH', 
			{ 'userId': userId,'clientId': clientId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class GreetingsApi {
	/**
	 * Greetings service.
	 * @module purecloud-platform-client-v2/api/GreetingsApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new GreetingsApi. 
	 * @alias module:purecloud-platform-client-v2/api/GreetingsApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Deletes a Greeting with the given GreetingId
	 * 
	 * @param {String} greetingId Greeting ID
	 */
	deleteGreeting(greetingId) { 
		// verify the required parameter 'greetingId' is set
		if (greetingId === undefined || greetingId === null) {
			throw 'Missing the required parameter "greetingId" when calling deleteGreeting';
		}

		return this.apiClient.callApi(
			'/api/v2/greetings/{greetingId}', 
			'DELETE', 
			{ 'greetingId': greetingId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Greeting with the given GreetingId
	 * 
	 * @param {String} greetingId Greeting ID
	 */
	getGreeting(greetingId) { 
		// verify the required parameter 'greetingId' is set
		if (greetingId === undefined || greetingId === null) {
			throw 'Missing the required parameter "greetingId" when calling getGreeting';
		}

		return this.apiClient.callApi(
			'/api/v2/greetings/{greetingId}', 
			'GET', 
			{ 'greetingId': greetingId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get media playback URI for this greeting
	 * 
	 * @param {String} greetingId Greeting ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.formatId The desired media format. (default to WAV)
	 */
	getGreetingMedia(greetingId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'greetingId' is set
		if (greetingId === undefined || greetingId === null) {
			throw 'Missing the required parameter "greetingId" when calling getGreetingMedia';
		}

		return this.apiClient.callApi(
			'/api/v2/greetings/{greetingId}/media', 
			'GET', 
			{ 'greetingId': greetingId }, 
			{ 'formatId': opts['formatId'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets an Organization&#39;s Greetings
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getGreetings(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/greetings', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an Organization&#39;s DefaultGreetingList
	 * 
	 */
	getGreetingsDefaults() { 

		return this.apiClient.callApi(
			'/api/v2/greetings/defaults', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of the Group&#39;s Greetings
	 * 
	 * @param {String} groupId Group ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getGroupGreetings(groupId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling getGroupGreetings';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/{groupId}/greetings', 
			'GET', 
			{ 'groupId': groupId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Grabs the list of Default Greetings given a Group&#39;s ID
	 * 
	 * @param {String} groupId Group ID
	 */
	getGroupGreetingsDefaults(groupId) { 
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling getGroupGreetingsDefaults';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/{groupId}/greetings/defaults', 
			'GET', 
			{ 'groupId': groupId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of the User&#39;s Greetings
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getUserGreetings(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserGreetings';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/greetings', 
			'GET', 
			{ 'userId': userId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Grabs the list of Default Greetings given a User&#39;s ID
	 * 
	 * @param {String} userId User ID
	 */
	getUserGreetingsDefaults(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserGreetingsDefaults';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/greetings/defaults', 
			'GET', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a Greeting for an Organization
	 * 
	 * @param {Object} body The Greeting to create
	 */
	postGreetings(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postGreetings';
		}

		return this.apiClient.callApi(
			'/api/v2/greetings', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Creates a Greeting for a Group
	 * 
	 * @param {String} groupId Group ID
	 * @param {Object} body The Greeting to create
	 */
	postGroupGreetings(groupId, body) { 
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling postGroupGreetings';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postGroupGreetings';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/{groupId}/greetings', 
			'POST', 
			{ 'groupId': groupId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Creates a Greeting for a User
	 * 
	 * @param {String} userId User ID
	 * @param {Object} body The Greeting to create
	 */
	postUserGreetings(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling postUserGreetings';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postUserGreetings';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/greetings', 
			'POST', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Updates the Greeting with the given GreetingId
	 * 
	 * @param {String} greetingId Greeting ID
	 * @param {Object} body The updated Greeting
	 */
	putGreeting(greetingId, body) { 
		// verify the required parameter 'greetingId' is set
		if (greetingId === undefined || greetingId === null) {
			throw 'Missing the required parameter "greetingId" when calling putGreeting';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putGreeting';
		}

		return this.apiClient.callApi(
			'/api/v2/greetings/{greetingId}', 
			'PUT', 
			{ 'greetingId': greetingId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an Organization&#39;s DefaultGreetingList
	 * 
	 * @param {Object} body The updated defaultGreetingList
	 */
	putGreetingsDefaults(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putGreetingsDefaults';
		}

		return this.apiClient.callApi(
			'/api/v2/greetings/defaults', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Updates the DefaultGreetingList of the specified Group
	 * 
	 * @param {String} groupId Group ID
	 * @param {Object} body The updated defaultGreetingList
	 */
	putGroupGreetingsDefaults(groupId, body) { 
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling putGroupGreetingsDefaults';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putGroupGreetingsDefaults';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/{groupId}/greetings/defaults', 
			'PUT', 
			{ 'groupId': groupId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Updates the DefaultGreetingList of the specified User
	 * 
	 * @param {String} userId User ID
	 * @param {Object} body The updated defaultGreetingList
	 */
	putUserGreetingsDefaults(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling putUserGreetingsDefaults';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putUserGreetingsDefaults';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/greetings/defaults', 
			'PUT', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class GroupsApi {
	/**
	 * Groups service.
	 * @module purecloud-platform-client-v2/api/GroupsApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new GroupsApi. 
	 * @alias module:purecloud-platform-client-v2/api/GroupsApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete group
	 * 
	 * @param {String} groupId Group ID
	 */
	deleteGroup(groupId) { 
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling deleteGroup';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/{groupId}', 
			'DELETE', 
			{ 'groupId': groupId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Remove members
	 * 
	 * @param {String} groupId Group ID
	 * @param {String} ids Comma separated list of userIds to remove
	 */
	deleteGroupMembers(groupId, ids) { 
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling deleteGroupMembers';
		}
		// verify the required parameter 'ids' is set
		if (ids === undefined || ids === null) {
			throw 'Missing the required parameter "ids" when calling deleteGroupMembers';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/{groupId}/members', 
			'DELETE', 
			{ 'groupId': groupId }, 
			{ 'ids': ids }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Fetch field config for an entity type
	 * 
	 * @param {Object} type Field type
	 */
	getFieldconfig(type) { 
		// verify the required parameter 'type' is set
		if (type === undefined || type === null) {
			throw 'Missing the required parameter "type" when calling getFieldconfig';
		}

		return this.apiClient.callApi(
			'/api/v2/fieldconfig', 
			'GET', 
			{  }, 
			{ 'type': type }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get group
	 * 
	 * @param {String} groupId Group ID
	 */
	getGroup(groupId) { 
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling getGroup';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/{groupId}', 
			'GET', 
			{ 'groupId': groupId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get all individuals associated with the group
	 * 
	 * @param {String} groupId Group ID
	 */
	getGroupIndividuals(groupId) { 
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling getGroupIndividuals';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/{groupId}/individuals', 
			'GET', 
			{ 'groupId': groupId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get group members, includes individuals, owners, and dynamically included people
	 * 
	 * @param {String} groupId Group ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.sortOrder Ascending or descending sort order (default to ASC)
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	getGroupMembers(groupId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling getGroupMembers';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/{groupId}/members', 
			'GET', 
			{ 'groupId': groupId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortOrder': opts['sortOrder'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get group profile
	 * 
	 * @param {String} groupId groupId
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.fields Comma separated fields to return.  Allowable values can be found by querying /api/v2/fieldconfig?type=group and using the key for the elements returned by the fieldList
	 */
	getGroupProfile(groupId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling getGroupProfile';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/{groupId}/profile', 
			'GET', 
			{ 'groupId': groupId }, 
			{ 'fields': opts['fields'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a group list
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Array.<String>} opts.id id
	 * @param {Object} opts.sortOrder Ascending or descending sort order (default to ASC)
	 */
	getGroups(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/groups', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'id': this.apiClient.buildCollectionParam(opts['id'], 'multi'),'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search groups using the q64 value returned from a previous search
	 * 
	 * @param {String} q64 q64
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand expand
	 */
	getGroupsSearch(q64, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'q64' is set
		if (q64 === undefined || q64 === null) {
			throw 'Missing the required parameter "q64" when calling getGroupsSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/search', 
			'GET', 
			{  }, 
			{ 'q64': q64,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get group profile listing
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Array.<String>} opts.id id
	 * @param {Object} opts.sortOrder Ascending or descending sort order (default to ASC)
	 */
	getProfilesGroups(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/profiles/groups', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'id': this.apiClient.buildCollectionParam(opts['id'], 'multi'),'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add members
	 * 
	 * @param {String} groupId Group ID
	 * @param {Object} body Add members
	 */
	postGroupMembers(groupId, body) { 
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling postGroupMembers';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postGroupMembers';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/{groupId}/members', 
			'POST', 
			{ 'groupId': groupId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a group
	 * 
	 * @param {Object} body Group
	 */
	postGroups(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postGroups';
		}

		return this.apiClient.callApi(
			'/api/v2/groups', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search groups
	 * 
	 * @param {Object} body Search request options
	 */
	postGroupsSearch(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postGroupsSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/search', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update group
	 * 
	 * @param {String} groupId Group ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Group
	 */
	putGroup(groupId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling putGroup';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/{groupId}', 
			'PUT', 
			{ 'groupId': groupId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class IdentityProviderApi {
	/**
	 * IdentityProvider service.
	 * @module purecloud-platform-client-v2/api/IdentityProviderApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new IdentityProviderApi. 
	 * @alias module:purecloud-platform-client-v2/api/IdentityProviderApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete ADFS Identity Provider
	 * 
	 */
	deleteIdentityprovidersAdfs() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/adfs', 
			'DELETE', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Customer Interaction Center (CIC) Identity Provider
	 * 
	 */
	deleteIdentityprovidersCic() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/cic', 
			'DELETE', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete G Suite Identity Provider
	 * 
	 */
	deleteIdentityprovidersGsuite() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/gsuite', 
			'DELETE', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete IdentityNow Provider
	 * 
	 */
	deleteIdentityprovidersIdentitynow() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/identitynow', 
			'DELETE', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Okta Identity Provider
	 * 
	 */
	deleteIdentityprovidersOkta() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/okta', 
			'DELETE', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete OneLogin Identity Provider
	 * 
	 */
	deleteIdentityprovidersOnelogin() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/onelogin', 
			'DELETE', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Ping Identity Provider
	 * 
	 */
	deleteIdentityprovidersPing() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/ping', 
			'DELETE', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete PureCloud Identity Provider
	 * 
	 */
	deleteIdentityprovidersPurecloud() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/purecloud', 
			'DELETE', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Salesforce Identity Provider
	 * 
	 */
	deleteIdentityprovidersSalesforce() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/salesforce', 
			'DELETE', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * The list of identity providers
	 * 
	 */
	getIdentityproviders() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get ADFS Identity Provider
	 * 
	 */
	getIdentityprovidersAdfs() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/adfs', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Customer Interaction Center (CIC) Identity Provider
	 * 
	 */
	getIdentityprovidersCic() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/cic', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get G Suite Identity Provider
	 * 
	 */
	getIdentityprovidersGsuite() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/gsuite', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get IdentityNow Provider
	 * 
	 */
	getIdentityprovidersIdentitynow() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/identitynow', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Okta Identity Provider
	 * 
	 */
	getIdentityprovidersOkta() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/okta', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get OneLogin Identity Provider
	 * 
	 */
	getIdentityprovidersOnelogin() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/onelogin', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Ping Identity Provider
	 * 
	 */
	getIdentityprovidersPing() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/ping', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get PureCloud Identity Provider
	 * 
	 */
	getIdentityprovidersPurecloud() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/purecloud', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Salesforce Identity Provider
	 * 
	 */
	getIdentityprovidersSalesforce() { 

		return this.apiClient.callApi(
			'/api/v2/identityproviders/salesforce', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update/Create ADFS Identity Provider
	 * 
	 * @param {Object} body Provider
	 */
	putIdentityprovidersAdfs(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putIdentityprovidersAdfs';
		}

		return this.apiClient.callApi(
			'/api/v2/identityproviders/adfs', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update/Create Customer Interaction Center (CIC) Identity Provider
	 * 
	 * @param {Object} body Provider
	 */
	putIdentityprovidersCic(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putIdentityprovidersCic';
		}

		return this.apiClient.callApi(
			'/api/v2/identityproviders/cic', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update/Create G Suite Identity Provider
	 * 
	 * @param {Object} body Provider
	 */
	putIdentityprovidersGsuite(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putIdentityprovidersGsuite';
		}

		return this.apiClient.callApi(
			'/api/v2/identityproviders/gsuite', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update/Create IdentityNow Provider
	 * 
	 * @param {Object} body Provider
	 */
	putIdentityprovidersIdentitynow(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putIdentityprovidersIdentitynow';
		}

		return this.apiClient.callApi(
			'/api/v2/identityproviders/identitynow', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update/Create Okta Identity Provider
	 * 
	 * @param {Object} body Provider
	 */
	putIdentityprovidersOkta(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putIdentityprovidersOkta';
		}

		return this.apiClient.callApi(
			'/api/v2/identityproviders/okta', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update/Create OneLogin Identity Provider
	 * 
	 * @param {Object} body Provider
	 */
	putIdentityprovidersOnelogin(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putIdentityprovidersOnelogin';
		}

		return this.apiClient.callApi(
			'/api/v2/identityproviders/onelogin', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update/Create Ping Identity Provider
	 * 
	 * @param {Object} body Provider
	 */
	putIdentityprovidersPing(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putIdentityprovidersPing';
		}

		return this.apiClient.callApi(
			'/api/v2/identityproviders/ping', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update/Create PureCloud Identity Provider
	 * 
	 * @param {Object} body Provider
	 */
	putIdentityprovidersPurecloud(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putIdentityprovidersPurecloud';
		}

		return this.apiClient.callApi(
			'/api/v2/identityproviders/purecloud', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update/Create Salesforce Identity Provider
	 * 
	 * @param {Object} body Provider
	 */
	putIdentityprovidersSalesforce(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putIdentityprovidersSalesforce';
		}

		return this.apiClient.callApi(
			'/api/v2/identityproviders/salesforce', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class IntegrationsApi {
	/**
	 * Integrations service.
	 * @module purecloud-platform-client-v2/api/IntegrationsApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new IntegrationsApi. 
	 * @alias module:purecloud-platform-client-v2/api/IntegrationsApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete integration.
	 * 
	 * @param {String} integrationId Integration Id
	 */
	deleteIntegration(integrationId) { 
		// verify the required parameter 'integrationId' is set
		if (integrationId === undefined || integrationId === null) {
			throw 'Missing the required parameter "integrationId" when calling deleteIntegration';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/{integrationId}', 
			'DELETE', 
			{ 'integrationId': integrationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete an Action
	 * 
	 * @param {String} actionId actionId
	 */
	deleteIntegrationsAction(actionId) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling deleteIntegrationsAction';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}', 
			'DELETE', 
			{ 'actionId': actionId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a Draft
	 * 
	 * @param {String} actionId actionId
	 */
	deleteIntegrationsActionDraft(actionId) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling deleteIntegrationsActionDraft';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}/draft', 
			'DELETE', 
			{ 'actionId': actionId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a set of credentials
	 * 
	 * @param {String} credentialId Credential ID
	 */
	deleteIntegrationsCredential(credentialId) { 
		// verify the required parameter 'credentialId' is set
		if (credentialId === undefined || credentialId === null) {
			throw 'Missing the required parameter "credentialId" when calling deleteIntegrationsCredential';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/credentials/{credentialId}', 
			'DELETE', 
			{ 'credentialId': credentialId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get integration.
	 * 
	 * @param {String} integrationId Integration Id
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 */
	getIntegration(integrationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'integrationId' is set
		if (integrationId === undefined || integrationId === null) {
			throw 'Missing the required parameter "integrationId" when calling getIntegration';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/{integrationId}', 
			'GET', 
			{ 'integrationId': integrationId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get integration configuration.
	 * 
	 * @param {String} integrationId Integration Id
	 */
	getIntegrationConfigCurrent(integrationId) { 
		// verify the required parameter 'integrationId' is set
		if (integrationId === undefined || integrationId === null) {
			throw 'Missing the required parameter "integrationId" when calling getIntegrationConfigCurrent';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/{integrationId}/config/current', 
			'GET', 
			{ 'integrationId': integrationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List integrations
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 */
	getIntegrations(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/integrations', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieves a single Action matching id.
	 * 
	 * @param {String} actionId actionId
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.expand Indicates fields of the response which should be expanded.
	 * @param {Boolean} opts.includeConfig Show config when available (default to false)
	 */
	getIntegrationsAction(actionId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling getIntegrationsAction';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}', 
			'GET', 
			{ 'actionId': actionId }, 
			{ 'expand': opts['expand'],'includeConfig': opts['includeConfig'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieve a Draft
	 * 
	 * @param {String} actionId actionId
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.expand Indicates fields of the response which should be expanded.
	 * @param {Boolean} opts.includeConfig Show config when available (default to false)
	 */
	getIntegrationsActionDraft(actionId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling getIntegrationsActionDraft';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}/draft', 
			'GET', 
			{ 'actionId': actionId }, 
			{ 'expand': opts['expand'],'includeConfig': opts['includeConfig'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieve schema for a Draft based on filename.
	 * 
	 * @param {String} actionId actionId
	 * @param {String} fileName Name of schema file to be retrieved for this draft.
	 */
	getIntegrationsActionDraftSchema(actionId, fileName) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling getIntegrationsActionDraftSchema';
		}
		// verify the required parameter 'fileName' is set
		if (fileName === undefined || fileName === null) {
			throw 'Missing the required parameter "fileName" when calling getIntegrationsActionDraftSchema';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}/draft/schemas/{fileName}', 
			'GET', 
			{ 'actionId': actionId,'fileName': fileName }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieve templates for a Draft based on filename.
	 * 
	 * @param {String} actionId actionId
	 * @param {String} fileName Name of template file to be retrieved for this action draft.
	 */
	getIntegrationsActionDraftTemplate(actionId, fileName) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling getIntegrationsActionDraftTemplate';
		}
		// verify the required parameter 'fileName' is set
		if (fileName === undefined || fileName === null) {
			throw 'Missing the required parameter "fileName" when calling getIntegrationsActionDraftTemplate';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}/draft/templates/{fileName}', 
			'GET', 
			{ 'actionId': actionId,'fileName': fileName }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['text/plain']
		);
	}

	/**
	 * Validate current Draft configuration.
	 * 
	 * @param {String} actionId actionId
	 */
	getIntegrationsActionDraftValidation(actionId) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling getIntegrationsActionDraftValidation';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}/draft/validation', 
			'GET', 
			{ 'actionId': actionId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieve schema for an action based on filename.
	 * 
	 * @param {String} actionId actionId
	 * @param {String} fileName Name of schema file to be retrieved for this action.
	 */
	getIntegrationsActionSchema(actionId, fileName) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling getIntegrationsActionSchema';
		}
		// verify the required parameter 'fileName' is set
		if (fileName === undefined || fileName === null) {
			throw 'Missing the required parameter "fileName" when calling getIntegrationsActionSchema';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}/schemas/{fileName}', 
			'GET', 
			{ 'actionId': actionId,'fileName': fileName }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieve text of templates for an action based on filename.
	 * 
	 * @param {String} actionId actionId
	 * @param {String} fileName Name of template file to be retrieved for this action.
	 */
	getIntegrationsActionTemplate(actionId, fileName) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling getIntegrationsActionTemplate';
		}
		// verify the required parameter 'fileName' is set
		if (fileName === undefined || fileName === null) {
			throw 'Missing the required parameter "fileName" when calling getIntegrationsActionTemplate';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}/templates/{fileName}', 
			'GET', 
			{ 'actionId': actionId,'fileName': fileName }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['text/plain']
		);
	}

	/**
	 * Retrieves all actions associated with filters passed in via query param.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.category Filter by category name
	 * @param {Object} opts.secure Filter to only include secure actions. True will only include actions marked secured. False will include only unsecure actions. Do not use filter if you want all Actions.
	 * @param {Object} opts.includeAuthActions Whether or not to include authentication actions in the response. These actions are not directly executable. Some integrations create them and will run them as needed to refresh authentication information for other actions.
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 */
	getIntegrationsActions(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/integrations/actions', 
			'GET', 
			{  }, 
			{ 'category': opts['category'],'secure': opts['secure'],'includeAuthActions': opts['includeAuthActions'],'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieves all categories of available Actions
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.secure Filter to only include/exclude Action categories based on if they are considered secure. True will only include categories with Actions marked secured. False will only include categories of unsecured Actions.
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 */
	getIntegrationsActionsCategories(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/categories', 
			'GET', 
			{  }, 
			{ 'secure': opts['secure'],'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieves all action drafts associated with the filters passed in via query param.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.category Filter by category name
	 * @param {Object} opts.secure Filter to only include secure actions. True will only include actions marked secured. False will include only unsecure actions. Do not use filter if you want all Actions.
	 * @param {Object} opts.includeAuthActions Whether or not to include authentication actions in the response. These actions are not directly executable. Some integrations create them and will run them as needed to refresh authentication information for other actions.
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 */
	getIntegrationsActionsDrafts(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/drafts', 
			'GET', 
			{  }, 
			{ 'category': opts['category'],'secure': opts['secure'],'includeAuthActions': opts['includeAuthActions'],'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List permitted client app integrations for the logged in user
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 */
	getIntegrationsClientapps(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/integrations/clientapps', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a single credential with sensitive fields redacted
	 * 
	 * @param {String} credentialId Credential ID
	 */
	getIntegrationsCredential(credentialId) { 
		// verify the required parameter 'credentialId' is set
		if (credentialId === undefined || credentialId === null) {
			throw 'Missing the required parameter "credentialId" when calling getIntegrationsCredential';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/credentials/{credentialId}', 
			'GET', 
			{ 'credentialId': credentialId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List multiple sets of credentials
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 */
	getIntegrationsCredentials(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/integrations/credentials', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List all credential types
	 * 
	 */
	getIntegrationsCredentialsTypes() { 

		return this.apiClient.callApi(
			'/api/v2/integrations/credentials/types', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List all events
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy Sort by (default to timestamp)
	 * @param {String} opts.sortOrder Order by (default to descending)
	 * @param {String} opts.entityId Include only events with this entity ID
	 */
	getIntegrationsEventlog(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/integrations/eventlog', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'entityId': opts['entityId'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a single event
	 * 
	 * @param {String} eventId Event Id
	 */
	getIntegrationsEventlogEventId(eventId) { 
		// verify the required parameter 'eventId' is set
		if (eventId === undefined || eventId === null) {
			throw 'Missing the required parameter "eventId" when calling getIntegrationsEventlogEventId';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/eventlog/{eventId}', 
			'GET', 
			{ 'eventId': eventId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get integration type.
	 * 
	 * @param {String} typeId Integration Type Id
	 */
	getIntegrationsType(typeId) { 
		// verify the required parameter 'typeId' is set
		if (typeId === undefined || typeId === null) {
			throw 'Missing the required parameter "typeId" when calling getIntegrationsType';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/types/{typeId}', 
			'GET', 
			{ 'typeId': typeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get properties config schema for an integration type.
	 * 
	 * @param {String} typeId Integration Type Id
	 * @param {Object} configType Config schema type
	 */
	getIntegrationsTypeConfigschema(typeId, configType) { 
		// verify the required parameter 'typeId' is set
		if (typeId === undefined || typeId === null) {
			throw 'Missing the required parameter "typeId" when calling getIntegrationsTypeConfigschema';
		}
		// verify the required parameter 'configType' is set
		if (configType === undefined || configType === null) {
			throw 'Missing the required parameter "configType" when calling getIntegrationsTypeConfigschema';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/types/{typeId}/configschemas/{configType}', 
			'GET', 
			{ 'typeId': typeId,'configType': configType }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List integration types
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 */
	getIntegrationsTypes(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/integrations/types', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an integration.
	 * 
	 * @param {String} integrationId Integration Id
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Integration Update
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 */
	patchIntegration(integrationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'integrationId' is set
		if (integrationId === undefined || integrationId === null) {
			throw 'Missing the required parameter "integrationId" when calling patchIntegration';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/{integrationId}', 
			'PATCH', 
			{ 'integrationId': integrationId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'] }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Patch an Action
	 * 
	 * @param {String} actionId actionId
	 * @param {Object} body Input used to patch the Action.
	 */
	patchIntegrationsAction(actionId, body) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling patchIntegrationsAction';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchIntegrationsAction';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}', 
			'PATCH', 
			{ 'actionId': actionId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an existing Draft
	 * 
	 * @param {String} actionId actionId
	 * @param {Object} body Input used to patch the Action Draft.
	 */
	patchIntegrationsActionDraft(actionId, body) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling patchIntegrationsActionDraft';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchIntegrationsActionDraft';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}/draft', 
			'PATCH', 
			{ 'actionId': actionId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create an integration.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Integration
	 */
	postIntegrations(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/integrations', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new Draft from existing Action
	 * 
	 * @param {String} actionId actionId
	 */
	postIntegrationsActionDraft(actionId) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling postIntegrationsActionDraft';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}/draft', 
			'POST', 
			{ 'actionId': actionId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Publish a Draft and make it the active Action configuration
	 * 
	 * @param {String} actionId actionId
	 * @param {Object} body Input used to patch the Action.
	 */
	postIntegrationsActionDraftPublish(actionId, body) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling postIntegrationsActionDraftPublish';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postIntegrationsActionDraftPublish';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}/draft/publish', 
			'POST', 
			{ 'actionId': actionId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Test the execution of a draft. Responses will show execution steps broken out with intermediate results to help in debugging.
	 * 
	 * @param {String} actionId actionId
	 * @param {Object} body Map of parameters used for variable substitution.
	 */
	postIntegrationsActionDraftTest(actionId, body) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling postIntegrationsActionDraftTest';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postIntegrationsActionDraftTest';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}/draft/test', 
			'POST', 
			{ 'actionId': actionId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Execute Action and return response from 3rd party.  Responses will follow the schemas defined on the Action for success and error.
	 * 
	 * @param {String} actionId actionId
	 * @param {Object} body Map of parameters used for variable substitution.
	 */
	postIntegrationsActionExecute(actionId, body) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling postIntegrationsActionExecute';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postIntegrationsActionExecute';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}/execute', 
			'POST', 
			{ 'actionId': actionId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Test the execution of an action. Responses will show execution steps broken out with intermediate results to help in debugging.
	 * 
	 * @param {String} actionId actionId
	 * @param {Object} body Map of parameters used for variable substitution.
	 */
	postIntegrationsActionTest(actionId, body) { 
		// verify the required parameter 'actionId' is set
		if (actionId === undefined || actionId === null) {
			throw 'Missing the required parameter "actionId" when calling postIntegrationsActionTest';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postIntegrationsActionTest';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/{actionId}/test', 
			'POST', 
			{ 'actionId': actionId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new Action
	 * 
	 * @param {Object} body Input used to create Action.
	 */
	postIntegrationsActions(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postIntegrationsActions';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new Draft
	 * 
	 * @param {Object} body Input used to create Action Draft.
	 */
	postIntegrationsActionsDrafts(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postIntegrationsActionsDrafts';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/actions/drafts', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a set of credentials
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Credential
	 */
	postIntegrationsCredentials(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/integrations/credentials', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add a vendor connection
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postIntegrationsWorkforcemanagementVendorconnection(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/integrations/workforcemanagement/vendorconnection', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update integration configuration.
	 * 
	 * @param {String} integrationId Integration Id
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Integration Configuration
	 */
	putIntegrationConfigCurrent(integrationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'integrationId' is set
		if (integrationId === undefined || integrationId === null) {
			throw 'Missing the required parameter "integrationId" when calling putIntegrationConfigCurrent';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/{integrationId}/config/current', 
			'PUT', 
			{ 'integrationId': integrationId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a set of credentials
	 * 
	 * @param {String} credentialId Credential ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Credential
	 */
	putIntegrationsCredential(credentialId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'credentialId' is set
		if (credentialId === undefined || credentialId === null) {
			throw 'Missing the required parameter "credentialId" when calling putIntegrationsCredential';
		}

		return this.apiClient.callApi(
			'/api/v2/integrations/credentials/{credentialId}', 
			'PUT', 
			{ 'credentialId': credentialId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class LanguagesApi {
	/**
	 * Languages service.
	 * @module purecloud-platform-client-v2/api/LanguagesApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new LanguagesApi. 
	 * @alias module:purecloud-platform-client-v2/api/LanguagesApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete Language (Deprecated)
	 * This endpoint is deprecated. It has been moved to /routing/languages/{languageId}
	 * @param {String} languageId Language ID
	 */
	deleteLanguage(languageId) { 
		// verify the required parameter 'languageId' is set
		if (languageId === undefined || languageId === null) {
			throw 'Missing the required parameter "languageId" when calling deleteLanguage';
		}

		return this.apiClient.callApi(
			'/api/v2/languages/{languageId}', 
			'DELETE', 
			{ 'languageId': languageId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Language
	 * 
	 * @param {String} languageId Language ID
	 */
	deleteRoutingLanguage(languageId) { 
		// verify the required parameter 'languageId' is set
		if (languageId === undefined || languageId === null) {
			throw 'Missing the required parameter "languageId" when calling deleteRoutingLanguage';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/languages/{languageId}', 
			'DELETE', 
			{ 'languageId': languageId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get language (Deprecated)
	 * This endpoint is deprecated. It has been moved to /routing/languages/{languageId}
	 * @param {String} languageId Language ID
	 */
	getLanguage(languageId) { 
		// verify the required parameter 'languageId' is set
		if (languageId === undefined || languageId === null) {
			throw 'Missing the required parameter "languageId" when calling getLanguage';
		}

		return this.apiClient.callApi(
			'/api/v2/languages/{languageId}', 
			'GET', 
			{ 'languageId': languageId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of supported languages. (Deprecated)
	 * This endpoint is deprecated. It has been moved to /routing/languages
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.sortOrder Ascending or descending sort order (default to ASC)
	 * @param {String} opts.name Name
	 */
	getLanguages(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/languages', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortOrder': opts['sortOrder'],'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get all available languages for translation
	 * 
	 */
	getLanguagesTranslations() { 

		return this.apiClient.callApi(
			'/api/v2/languages/translations', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the builtin translation for a language
	 * 
	 * @param {String} language The language of the builtin translation to retrieve
	 */
	getLanguagesTranslationsBuiltin(language) { 
		// verify the required parameter 'language' is set
		if (language === undefined || language === null) {
			throw 'Missing the required parameter "language" when calling getLanguagesTranslationsBuiltin';
		}

		return this.apiClient.callApi(
			'/api/v2/languages/translations/builtin', 
			'GET', 
			{  }, 
			{ 'language': language }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get effective translation for an organization by language
	 * 
	 * @param {String} language The language of the translation to retrieve for the organization
	 */
	getLanguagesTranslationsOrganization(language) { 
		// verify the required parameter 'language' is set
		if (language === undefined || language === null) {
			throw 'Missing the required parameter "language" when calling getLanguagesTranslationsOrganization';
		}

		return this.apiClient.callApi(
			'/api/v2/languages/translations/organization', 
			'GET', 
			{  }, 
			{ 'language': language }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get effective language translation for a user
	 * 
	 * @param {String} userId The user id
	 */
	getLanguagesTranslationsUser(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getLanguagesTranslationsUser';
		}

		return this.apiClient.callApi(
			'/api/v2/languages/translations/users/{userId}', 
			'GET', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get language
	 * 
	 * @param {String} languageId Language ID
	 */
	getRoutingLanguage(languageId) { 
		// verify the required parameter 'languageId' is set
		if (languageId === undefined || languageId === null) {
			throw 'Missing the required parameter "languageId" when calling getRoutingLanguage';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/languages/{languageId}', 
			'GET', 
			{ 'languageId': languageId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create Language (Deprecated)
	 * This endpoint is deprecated. It has been moved to /routing/languages
	 * @param {Object} body Language
	 */
	postLanguages(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postLanguages';
		}

		return this.apiClient.callApi(
			'/api/v2/languages', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class LicenseApi {
	/**
	 * License service.
	 * @module purecloud-platform-client-v2/api/LicenseApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new LicenseApi. 
	 * @alias module:purecloud-platform-client-v2/api/LicenseApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Get PureCloud license definition.
	 * 
	 * @param {String} licenseId ID
	 */
	getLicenseDefinition(licenseId) { 
		// verify the required parameter 'licenseId' is set
		if (licenseId === undefined || licenseId === null) {
			throw 'Missing the required parameter "licenseId" when calling getLicenseDefinition';
		}

		return this.apiClient.callApi(
			'/api/v2/license/definitions/{licenseId}', 
			'GET', 
			{ 'licenseId': licenseId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get all PureCloud license definitions available for the organization.
	 * 
	 */
	getLicenseDefinitions() { 

		return this.apiClient.callApi(
			'/api/v2/license/definitions', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get license assignments for the organization.
	 * 
	 */
	getLicenseOrganization() { 

		return this.apiClient.callApi(
			'/api/v2/license/organization', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get PureCloud license feature toggle value.
	 * 
	 * @param {String} featureName featureName
	 */
	getLicenseToggle(featureName) { 
		// verify the required parameter 'featureName' is set
		if (featureName === undefined || featureName === null) {
			throw 'Missing the required parameter "featureName" when calling getLicenseToggle';
		}

		return this.apiClient.callApi(
			'/api/v2/license/toggles/{featureName}', 
			'GET', 
			{ 'featureName': featureName }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get licenses for specified user.
	 * 
	 * @param {String} userId ID
	 */
	getLicenseUser(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getLicenseUser';
		}

		return this.apiClient.callApi(
			'/api/v2/license/users/{userId}', 
			'GET', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the organization&#39;s license assignments in a batch.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body The license assignments to update.
	 */
	postLicenseOrganization(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/license/organization', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Switch PureCloud license feature toggle value.
	 * 
	 * @param {String} featureName featureName
	 */
	postLicenseToggle(featureName) { 
		// verify the required parameter 'featureName' is set
		if (featureName === undefined || featureName === null) {
			throw 'Missing the required parameter "featureName" when calling postLicenseToggle';
		}

		return this.apiClient.callApi(
			'/api/v2/license/toggles/{featureName}', 
			'POST', 
			{ 'featureName': featureName }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Fetch user licenses in a batch.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Array.<Object>} opts.body The user IDs to fetch.
	 */
	postLicenseUsers(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/license/users', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class LocationsApi {
	/**
	 * Locations service.
	 * @module purecloud-platform-client-v2/api/LocationsApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new LocationsApi. 
	 * @alias module:purecloud-platform-client-v2/api/LocationsApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Get Location by ID.
	 * 
	 * @param {String} locationId Location ID
	 */
	getLocation(locationId) { 
		// verify the required parameter 'locationId' is set
		if (locationId === undefined || locationId === null) {
			throw 'Missing the required parameter "locationId" when calling getLocation';
		}

		return this.apiClient.callApi(
			'/api/v2/locations/{locationId}', 
			'GET', 
			{ 'locationId': locationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of all locations.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.sortOrder Sort order
	 */
	getLocations(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/locations', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search locations using the q64 value returned from a previous search
	 * 
	 * @param {String} q64 q64
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand expand
	 */
	getLocationsSearch(q64, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'q64' is set
		if (q64 === undefined || q64 === null) {
			throw 'Missing the required parameter "q64" when calling getLocationsSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/locations/search', 
			'GET', 
			{  }, 
			{ 'q64': q64,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search locations
	 * 
	 * @param {Object} body Search request options
	 */
	postLocationsSearch(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postLocationsSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/locations/search', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class MobileDevicesApi {
	/**
	 * MobileDevices service.
	 * @module purecloud-platform-client-v2/api/MobileDevicesApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new MobileDevicesApi. 
	 * @alias module:purecloud-platform-client-v2/api/MobileDevicesApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete device
	 * 
	 * @param {String} deviceId Device ID
	 */
	deleteMobiledevice(deviceId) { 
		// verify the required parameter 'deviceId' is set
		if (deviceId === undefined || deviceId === null) {
			throw 'Missing the required parameter "deviceId" when calling deleteMobiledevice';
		}

		return this.apiClient.callApi(
			'/api/v2/mobiledevices/{deviceId}', 
			'DELETE', 
			{ 'deviceId': deviceId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get device
	 * 
	 * @param {String} deviceId Device ID
	 */
	getMobiledevice(deviceId) { 
		// verify the required parameter 'deviceId' is set
		if (deviceId === undefined || deviceId === null) {
			throw 'Missing the required parameter "deviceId" when calling getMobiledevice';
		}

		return this.apiClient.callApi(
			'/api/v2/mobiledevices/{deviceId}', 
			'GET', 
			{ 'deviceId': deviceId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of all devices.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.sortOrder Ascending or descending sort order (default to ascending)
	 */
	getMobiledevices(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/mobiledevices', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create User device
	 * 
	 * @param {Object} body Device
	 */
	postMobiledevices(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postMobiledevices';
		}

		return this.apiClient.callApi(
			'/api/v2/mobiledevices', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update device
	 * 
	 * @param {String} deviceId Device ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Device
	 */
	putMobiledevice(deviceId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'deviceId' is set
		if (deviceId === undefined || deviceId === null) {
			throw 'Missing the required parameter "deviceId" when calling putMobiledevice';
		}

		return this.apiClient.callApi(
			'/api/v2/mobiledevices/{deviceId}', 
			'PUT', 
			{ 'deviceId': deviceId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class NotificationsApi {
	/**
	 * Notifications service.
	 * @module purecloud-platform-client-v2/api/NotificationsApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new NotificationsApi. 
	 * @alias module:purecloud-platform-client-v2/api/NotificationsApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Remove all subscriptions
	 * 
	 * @param {String} channelId Channel ID
	 */
	deleteNotificationsChannelSubscriptions(channelId) { 
		// verify the required parameter 'channelId' is set
		if (channelId === undefined || channelId === null) {
			throw 'Missing the required parameter "channelId" when calling deleteNotificationsChannelSubscriptions';
		}

		return this.apiClient.callApi(
			'/api/v2/notifications/channels/{channelId}/subscriptions', 
			'DELETE', 
			{ 'channelId': channelId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get available notification topics.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	getNotificationsAvailabletopics(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/notifications/availabletopics', 
			'GET', 
			{  }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * The list of all subscriptions for this channel
	 * 
	 * @param {String} channelId Channel ID
	 */
	getNotificationsChannelSubscriptions(channelId) { 
		// verify the required parameter 'channelId' is set
		if (channelId === undefined || channelId === null) {
			throw 'Missing the required parameter "channelId" when calling getNotificationsChannelSubscriptions';
		}

		return this.apiClient.callApi(
			'/api/v2/notifications/channels/{channelId}/subscriptions', 
			'GET', 
			{ 'channelId': channelId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * The list of existing channels
	 * 
	 */
	getNotificationsChannels() { 

		return this.apiClient.callApi(
			'/api/v2/notifications/channels', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add a list of subscriptions to the existing list of subscriptions
	 * 
	 * @param {String} channelId Channel ID
	 * @param {Array.<Object>} body Body
	 */
	postNotificationsChannelSubscriptions(channelId, body) { 
		// verify the required parameter 'channelId' is set
		if (channelId === undefined || channelId === null) {
			throw 'Missing the required parameter "channelId" when calling postNotificationsChannelSubscriptions';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postNotificationsChannelSubscriptions';
		}

		return this.apiClient.callApi(
			'/api/v2/notifications/channels/{channelId}/subscriptions', 
			'POST', 
			{ 'channelId': channelId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new channel
	 * There is a limit of 5 channels. Creating a 6th channel will remove the channel with oldest last used date.
	 */
	postNotificationsChannels() { 

		return this.apiClient.callApi(
			'/api/v2/notifications/channels', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Replace the current list of subscriptions with a new list.
	 * 
	 * @param {String} channelId Channel ID
	 * @param {Array.<Object>} body Body
	 */
	putNotificationsChannelSubscriptions(channelId, body) { 
		// verify the required parameter 'channelId' is set
		if (channelId === undefined || channelId === null) {
			throw 'Missing the required parameter "channelId" when calling putNotificationsChannelSubscriptions';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putNotificationsChannelSubscriptions';
		}

		return this.apiClient.callApi(
			'/api/v2/notifications/channels/{channelId}/subscriptions', 
			'PUT', 
			{ 'channelId': channelId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class OAuthApi {
	/**
	 * OAuth service.
	 * @module purecloud-platform-client-v2/api/OAuthApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new OAuthApi. 
	 * @alias module:purecloud-platform-client-v2/api/OAuthApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete OAuth Client
	 * 
	 * @param {String} clientId Client ID
	 */
	deleteOauthClient(clientId) { 
		// verify the required parameter 'clientId' is set
		if (clientId === undefined || clientId === null) {
			throw 'Missing the required parameter "clientId" when calling deleteOauthClient';
		}

		return this.apiClient.callApi(
			'/api/v2/oauth/clients/{clientId}', 
			'DELETE', 
			{ 'clientId': clientId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get OAuth Client
	 * 
	 * @param {String} clientId Client ID
	 */
	getOauthClient(clientId) { 
		// verify the required parameter 'clientId' is set
		if (clientId === undefined || clientId === null) {
			throw 'Missing the required parameter "clientId" when calling getOauthClient';
		}

		return this.apiClient.callApi(
			'/api/v2/oauth/clients/{clientId}', 
			'GET', 
			{ 'clientId': clientId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * The list of OAuth clients
	 * 
	 */
	getOauthClients() { 

		return this.apiClient.callApi(
			'/api/v2/oauth/clients', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Regenerate Client Secret
	 * This operation will set the client secret to a randomly generated cryptographically random value. All clients must be updated with the new secret. This operation should be used with caution.
	 * @param {String} clientId Client ID
	 */
	postOauthClientSecret(clientId) { 
		// verify the required parameter 'clientId' is set
		if (clientId === undefined || clientId === null) {
			throw 'Missing the required parameter "clientId" when calling postOauthClientSecret';
		}

		return this.apiClient.callApi(
			'/api/v2/oauth/clients/{clientId}/secret', 
			'POST', 
			{ 'clientId': clientId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create OAuth client
	 * The OAuth Grant/Client is required in order to create an authentication token and gain access to PureCloud.  The preferred authorizedGrantTypes is &#39;CODE&#39; which requires applications to send a client ID and client secret. This is typically a web server.  If the client is unable to secure the client secret then the &#39;TOKEN&#39; grant type aka IMPLICIT should be used. This is would be for browser or mobile apps.  If a client is to be used outside of the context of a user then the &#39;CLIENT-CREDENTIALS&#39; grant may be used. In this case the client must be granted roles  via the &#39;roleIds&#39; field.
	 * @param {Object} body Client
	 */
	postOauthClients(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOauthClients';
		}

		return this.apiClient.callApi(
			'/api/v2/oauth/clients', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update OAuth Client
	 * 
	 * @param {String} clientId Client ID
	 * @param {Object} body Client
	 */
	putOauthClient(clientId, body) { 
		// verify the required parameter 'clientId' is set
		if (clientId === undefined || clientId === null) {
			throw 'Missing the required parameter "clientId" when calling putOauthClient';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOauthClient';
		}

		return this.apiClient.callApi(
			'/api/v2/oauth/clients/{clientId}', 
			'PUT', 
			{ 'clientId': clientId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class OrganizationApi {
	/**
	 * Organization service.
	 * @module purecloud-platform-client-v2/api/OrganizationApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new OrganizationApi. 
	 * @alias module:purecloud-platform-client-v2/api/OrganizationApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Fetch field config for an entity type
	 * 
	 * @param {Object} type Field type
	 */
	getFieldconfig(type) { 
		// verify the required parameter 'type' is set
		if (type === undefined || type === null) {
			throw 'Missing the required parameter "type" when calling getFieldconfig';
		}

		return this.apiClient.callApi(
			'/api/v2/fieldconfig', 
			'GET', 
			{  }, 
			{ 'type': type }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get organization.
	 * 
	 */
	getOrganizationsMe() { 

		return this.apiClient.callApi(
			'/api/v2/organizations/me', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update organization
	 * 
	 * @param {Object} featureName Organization feature
	 * @param {Object} enabled New state of feature
	 */
	patchOrganizationsFeature(featureName, enabled) { 
		// verify the required parameter 'featureName' is set
		if (featureName === undefined || featureName === null) {
			throw 'Missing the required parameter "featureName" when calling patchOrganizationsFeature';
		}
		// verify the required parameter 'enabled' is set
		if (enabled === undefined || enabled === null) {
			throw 'Missing the required parameter "enabled" when calling patchOrganizationsFeature';
		}

		return this.apiClient.callApi(
			'/api/v2/organizations/features/{featureName}', 
			'PATCH', 
			{ 'featureName': featureName }, 
			{  }, 
			{  }, 
			{  }, 
			enabled, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update organization.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Organization
	 */
	putOrganizationsMe(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/organizations/me', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class OrganizationAuthorizationApi {
	/**
	 * OrganizationAuthorization service.
	 * @module purecloud-platform-client-v2/api/OrganizationAuthorizationApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new OrganizationAuthorizationApi. 
	 * @alias module:purecloud-platform-client-v2/api/OrganizationAuthorizationApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete Org Trust
	 * 
	 * @param {String} trusteeOrgId Trustee Organization Id
	 */
	deleteOrgauthorizationTrustee(trusteeOrgId) { 
		// verify the required parameter 'trusteeOrgId' is set
		if (trusteeOrgId === undefined || trusteeOrgId === null) {
			throw 'Missing the required parameter "trusteeOrgId" when calling deleteOrgauthorizationTrustee';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustees/{trusteeOrgId}', 
			'DELETE', 
			{ 'trusteeOrgId': trusteeOrgId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Trustee User
	 * 
	 * @param {String} trusteeOrgId Trustee Organization Id
	 * @param {String} trusteeUserId Trustee User Id
	 */
	deleteOrgauthorizationTrusteeUser(trusteeOrgId, trusteeUserId) { 
		// verify the required parameter 'trusteeOrgId' is set
		if (trusteeOrgId === undefined || trusteeOrgId === null) {
			throw 'Missing the required parameter "trusteeOrgId" when calling deleteOrgauthorizationTrusteeUser';
		}
		// verify the required parameter 'trusteeUserId' is set
		if (trusteeUserId === undefined || trusteeUserId === null) {
			throw 'Missing the required parameter "trusteeUserId" when calling deleteOrgauthorizationTrusteeUser';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustees/{trusteeOrgId}/users/{trusteeUserId}', 
			'DELETE', 
			{ 'trusteeOrgId': trusteeOrgId,'trusteeUserId': trusteeUserId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Trustee User Roles
	 * 
	 * @param {String} trusteeOrgId Trustee Organization Id
	 * @param {String} trusteeUserId Trustee User Id
	 */
	deleteOrgauthorizationTrusteeUserRoles(trusteeOrgId, trusteeUserId) { 
		// verify the required parameter 'trusteeOrgId' is set
		if (trusteeOrgId === undefined || trusteeOrgId === null) {
			throw 'Missing the required parameter "trusteeOrgId" when calling deleteOrgauthorizationTrusteeUserRoles';
		}
		// verify the required parameter 'trusteeUserId' is set
		if (trusteeUserId === undefined || trusteeUserId === null) {
			throw 'Missing the required parameter "trusteeUserId" when calling deleteOrgauthorizationTrusteeUserRoles';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustees/{trusteeOrgId}/users/{trusteeUserId}/roles', 
			'DELETE', 
			{ 'trusteeOrgId': trusteeOrgId,'trusteeUserId': trusteeUserId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Org Trust
	 * 
	 * @param {String} trustorOrgId Trustor Organization Id
	 */
	deleteOrgauthorizationTrustor(trustorOrgId) { 
		// verify the required parameter 'trustorOrgId' is set
		if (trustorOrgId === undefined || trustorOrgId === null) {
			throw 'Missing the required parameter "trustorOrgId" when calling deleteOrgauthorizationTrustor';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustors/{trustorOrgId}', 
			'DELETE', 
			{ 'trustorOrgId': trustorOrgId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Trustee User
	 * 
	 * @param {String} trustorOrgId Trustor Organization Id
	 * @param {String} trusteeUserId Trustee User Id
	 */
	deleteOrgauthorizationTrustorUser(trustorOrgId, trusteeUserId) { 
		// verify the required parameter 'trustorOrgId' is set
		if (trustorOrgId === undefined || trustorOrgId === null) {
			throw 'Missing the required parameter "trustorOrgId" when calling deleteOrgauthorizationTrustorUser';
		}
		// verify the required parameter 'trusteeUserId' is set
		if (trusteeUserId === undefined || trusteeUserId === null) {
			throw 'Missing the required parameter "trusteeUserId" when calling deleteOrgauthorizationTrustorUser';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustors/{trustorOrgId}/users/{trusteeUserId}', 
			'DELETE', 
			{ 'trustorOrgId': trustorOrgId,'trusteeUserId': trusteeUserId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Pairing Info
	 * 
	 * @param {String} pairingId Pairing Id
	 */
	getOrgauthorizationPairing(pairingId) { 
		// verify the required parameter 'pairingId' is set
		if (pairingId === undefined || pairingId === null) {
			throw 'Missing the required parameter "pairingId" when calling getOrgauthorizationPairing';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/pairings/{pairingId}', 
			'GET', 
			{ 'pairingId': pairingId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Org Trust
	 * 
	 * @param {String} trusteeOrgId Trustee Organization Id
	 */
	getOrgauthorizationTrustee(trusteeOrgId) { 
		// verify the required parameter 'trusteeOrgId' is set
		if (trusteeOrgId === undefined || trusteeOrgId === null) {
			throw 'Missing the required parameter "trusteeOrgId" when calling getOrgauthorizationTrustee';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustees/{trusteeOrgId}', 
			'GET', 
			{ 'trusteeOrgId': trusteeOrgId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Trustee User
	 * 
	 * @param {String} trusteeOrgId Trustee Organization Id
	 * @param {String} trusteeUserId Trustee User Id
	 */
	getOrgauthorizationTrusteeUser(trusteeOrgId, trusteeUserId) { 
		// verify the required parameter 'trusteeOrgId' is set
		if (trusteeOrgId === undefined || trusteeOrgId === null) {
			throw 'Missing the required parameter "trusteeOrgId" when calling getOrgauthorizationTrusteeUser';
		}
		// verify the required parameter 'trusteeUserId' is set
		if (trusteeUserId === undefined || trusteeUserId === null) {
			throw 'Missing the required parameter "trusteeUserId" when calling getOrgauthorizationTrusteeUser';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustees/{trusteeOrgId}/users/{trusteeUserId}', 
			'GET', 
			{ 'trusteeOrgId': trusteeOrgId,'trusteeUserId': trusteeUserId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Trustee User Roles
	 * 
	 * @param {String} trusteeOrgId Trustee Organization Id
	 * @param {String} trusteeUserId Trustee User Id
	 */
	getOrgauthorizationTrusteeUserRoles(trusteeOrgId, trusteeUserId) { 
		// verify the required parameter 'trusteeOrgId' is set
		if (trusteeOrgId === undefined || trusteeOrgId === null) {
			throw 'Missing the required parameter "trusteeOrgId" when calling getOrgauthorizationTrusteeUserRoles';
		}
		// verify the required parameter 'trusteeUserId' is set
		if (trusteeUserId === undefined || trusteeUserId === null) {
			throw 'Missing the required parameter "trusteeUserId" when calling getOrgauthorizationTrusteeUserRoles';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustees/{trusteeOrgId}/users/{trusteeUserId}/roles', 
			'GET', 
			{ 'trusteeOrgId': trusteeOrgId,'trusteeUserId': trusteeUserId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * The list of trustee users for this organization (i.e. users granted access to this organization).
	 * 
	 * @param {String} trusteeOrgId Trustee Organization Id
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getOrgauthorizationTrusteeUsers(trusteeOrgId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'trusteeOrgId' is set
		if (trusteeOrgId === undefined || trusteeOrgId === null) {
			throw 'Missing the required parameter "trusteeOrgId" when calling getOrgauthorizationTrusteeUsers';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustees/{trusteeOrgId}/users', 
			'GET', 
			{ 'trusteeOrgId': trusteeOrgId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * The list of trustees for this organization (i.e. organizations granted access to this organization).
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getOrgauthorizationTrustees(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustees', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Org Trust
	 * 
	 * @param {String} trustorOrgId Trustor Organization Id
	 */
	getOrgauthorizationTrustor(trustorOrgId) { 
		// verify the required parameter 'trustorOrgId' is set
		if (trustorOrgId === undefined || trustorOrgId === null) {
			throw 'Missing the required parameter "trustorOrgId" when calling getOrgauthorizationTrustor';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustors/{trustorOrgId}', 
			'GET', 
			{ 'trustorOrgId': trustorOrgId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Trustee User
	 * 
	 * @param {String} trustorOrgId Trustor Organization Id
	 * @param {String} trusteeUserId Trustee User Id
	 */
	getOrgauthorizationTrustorUser(trustorOrgId, trusteeUserId) { 
		// verify the required parameter 'trustorOrgId' is set
		if (trustorOrgId === undefined || trustorOrgId === null) {
			throw 'Missing the required parameter "trustorOrgId" when calling getOrgauthorizationTrustorUser';
		}
		// verify the required parameter 'trusteeUserId' is set
		if (trusteeUserId === undefined || trusteeUserId === null) {
			throw 'Missing the required parameter "trusteeUserId" when calling getOrgauthorizationTrustorUser';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustors/{trustorOrgId}/users/{trusteeUserId}', 
			'GET', 
			{ 'trustorOrgId': trustorOrgId,'trusteeUserId': trusteeUserId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * The list of users in the trustor organization (i.e. users granted access).
	 * 
	 * @param {String} trustorOrgId Trustee Organization Id
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getOrgauthorizationTrustorUsers(trustorOrgId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'trustorOrgId' is set
		if (trustorOrgId === undefined || trustorOrgId === null) {
			throw 'Missing the required parameter "trustorOrgId" when calling getOrgauthorizationTrustorUsers';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustors/{trustorOrgId}/users', 
			'GET', 
			{ 'trustorOrgId': trustorOrgId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * The list of organizations that have authorized/trusted your organization.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getOrgauthorizationTrustors(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustors', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * A pairing id is created by the trustee and given to the trustor to create a trust.
	 * 
	 * @param {Object} body Pairing Info
	 */
	postOrgauthorizationPairings(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOrgauthorizationPairings';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/pairings', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add a user to the trust.
	 * 
	 * @param {String} trusteeOrgId Trustee Organization Id
	 * @param {Object} body Trust
	 */
	postOrgauthorizationTrusteeUsers(trusteeOrgId, body) { 
		// verify the required parameter 'trusteeOrgId' is set
		if (trusteeOrgId === undefined || trusteeOrgId === null) {
			throw 'Missing the required parameter "trusteeOrgId" when calling postOrgauthorizationTrusteeUsers';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOrgauthorizationTrusteeUsers';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustees/{trusteeOrgId}/users', 
			'POST', 
			{ 'trusteeOrgId': trusteeOrgId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new organization authorization trust. This is required to grant other organizations access to your organization.
	 * 
	 * @param {Object} body Trust
	 */
	postOrgauthorizationTrustees(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOrgauthorizationTrustees';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustees', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Org Trustee Audits
	 * 
	 * @param {Object} body Values to scope the request.
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy Sort by (default to timestamp)
	 * @param {String} opts.sortOrder Sort order (default to descending)
	 */
	postOrgauthorizationTrusteesAudits(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOrgauthorizationTrusteesAudits';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustees/audits', 
			'POST', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Org Trustor Audits
	 * 
	 * @param {Object} body Values to scope the request.
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy Sort by (default to timestamp)
	 * @param {String} opts.sortOrder Sort order (default to descending)
	 */
	postOrgauthorizationTrustorAudits(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOrgauthorizationTrustorAudits';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustor/audits', 
			'POST', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update Org Trust
	 * 
	 * @param {String} trusteeOrgId Trustee Organization Id
	 * @param {Object} body Client
	 */
	putOrgauthorizationTrustee(trusteeOrgId, body) { 
		// verify the required parameter 'trusteeOrgId' is set
		if (trusteeOrgId === undefined || trusteeOrgId === null) {
			throw 'Missing the required parameter "trusteeOrgId" when calling putOrgauthorizationTrustee';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOrgauthorizationTrustee';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustees/{trusteeOrgId}', 
			'PUT', 
			{ 'trusteeOrgId': trusteeOrgId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update Trustee User Roles
	 * 
	 * @param {String} trusteeOrgId Trustee Organization Id
	 * @param {String} trusteeUserId Trustee User Id
	 * @param {Array.<Object>} body List of roles
	 */
	putOrgauthorizationTrusteeUserRoles(trusteeOrgId, trusteeUserId, body) { 
		// verify the required parameter 'trusteeOrgId' is set
		if (trusteeOrgId === undefined || trusteeOrgId === null) {
			throw 'Missing the required parameter "trusteeOrgId" when calling putOrgauthorizationTrusteeUserRoles';
		}
		// verify the required parameter 'trusteeUserId' is set
		if (trusteeUserId === undefined || trusteeUserId === null) {
			throw 'Missing the required parameter "trusteeUserId" when calling putOrgauthorizationTrusteeUserRoles';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOrgauthorizationTrusteeUserRoles';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustees/{trusteeOrgId}/users/{trusteeUserId}/roles', 
			'PUT', 
			{ 'trusteeOrgId': trusteeOrgId,'trusteeUserId': trusteeUserId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add a Trustee user to the trust.
	 * 
	 * @param {String} trustorOrgId Trustor Organization Id
	 * @param {String} trusteeUserId Trustee User Id
	 */
	putOrgauthorizationTrustorUser(trustorOrgId, trusteeUserId) { 
		// verify the required parameter 'trustorOrgId' is set
		if (trustorOrgId === undefined || trustorOrgId === null) {
			throw 'Missing the required parameter "trustorOrgId" when calling putOrgauthorizationTrustorUser';
		}
		// verify the required parameter 'trusteeUserId' is set
		if (trusteeUserId === undefined || trusteeUserId === null) {
			throw 'Missing the required parameter "trusteeUserId" when calling putOrgauthorizationTrustorUser';
		}

		return this.apiClient.callApi(
			'/api/v2/orgauthorization/trustors/{trustorOrgId}/users/{trusteeUserId}', 
			'PUT', 
			{ 'trustorOrgId': trustorOrgId,'trusteeUserId': trusteeUserId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class OutboundApi {
	/**
	 * Outbound service.
	 * @module purecloud-platform-client-v2/api/OutboundApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new OutboundApi. 
	 * @alias module:purecloud-platform-client-v2/api/OutboundApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete attempt limits
	 * 
	 * @param {String} attemptLimitsId Attempt limits ID
	 */
	deleteOutboundAttemptlimit(attemptLimitsId) { 
		// verify the required parameter 'attemptLimitsId' is set
		if (attemptLimitsId === undefined || attemptLimitsId === null) {
			throw 'Missing the required parameter "attemptLimitsId" when calling deleteOutboundAttemptlimit';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/attemptlimits/{attemptLimitsId}', 
			'DELETE', 
			{ 'attemptLimitsId': attemptLimitsId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete callable time set
	 * 
	 * @param {String} callableTimeSetId Callable Time Set ID
	 */
	deleteOutboundCallabletimeset(callableTimeSetId) { 
		// verify the required parameter 'callableTimeSetId' is set
		if (callableTimeSetId === undefined || callableTimeSetId === null) {
			throw 'Missing the required parameter "callableTimeSetId" when calling deleteOutboundCallabletimeset';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/callabletimesets/{callableTimeSetId}', 
			'DELETE', 
			{ 'callableTimeSetId': callableTimeSetId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a dialer call analysis response set.
	 * 
	 * @param {String} callAnalysisSetId Call Analysis Response Set ID
	 */
	deleteOutboundCallanalysisresponseset(callAnalysisSetId) { 
		// verify the required parameter 'callAnalysisSetId' is set
		if (callAnalysisSetId === undefined || callAnalysisSetId === null) {
			throw 'Missing the required parameter "callAnalysisSetId" when calling deleteOutboundCallanalysisresponseset';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/callanalysisresponsesets/{callAnalysisSetId}', 
			'DELETE', 
			{ 'callAnalysisSetId': callAnalysisSetId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a campaign.
	 * 
	 * @param {String} campaignId Campaign ID
	 */
	deleteOutboundCampaign(campaignId) { 
		// verify the required parameter 'campaignId' is set
		if (campaignId === undefined || campaignId === null) {
			throw 'Missing the required parameter "campaignId" when calling deleteOutboundCampaign';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaigns/{campaignId}', 
			'DELETE', 
			{ 'campaignId': campaignId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Reset campaign progress and recycle the campaign
	 * 
	 * @param {String} campaignId Campaign ID
	 */
	deleteOutboundCampaignProgress(campaignId) { 
		// verify the required parameter 'campaignId' is set
		if (campaignId === undefined || campaignId === null) {
			throw 'Missing the required parameter "campaignId" when calling deleteOutboundCampaignProgress';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaigns/{campaignId}/progress', 
			'DELETE', 
			{ 'campaignId': campaignId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Campaign Rule
	 * 
	 * @param {String} campaignRuleId Campaign Rule ID
	 */
	deleteOutboundCampaignrule(campaignRuleId) { 
		// verify the required parameter 'campaignRuleId' is set
		if (campaignRuleId === undefined || campaignRuleId === null) {
			throw 'Missing the required parameter "campaignRuleId" when calling deleteOutboundCampaignrule';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaignrules/{campaignRuleId}', 
			'DELETE', 
			{ 'campaignRuleId': campaignRuleId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a contact list.
	 * 
	 * @param {String} contactListId ContactList ID
	 */
	deleteOutboundContactlist(contactListId) { 
		// verify the required parameter 'contactListId' is set
		if (contactListId === undefined || contactListId === null) {
			throw 'Missing the required parameter "contactListId" when calling deleteOutboundContactlist';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists/{contactListId}', 
			'DELETE', 
			{ 'contactListId': contactListId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a contact.
	 * 
	 * @param {String} contactListId Contact List ID
	 * @param {String} contactId Contact ID
	 */
	deleteOutboundContactlistContact(contactListId, contactId) { 
		// verify the required parameter 'contactListId' is set
		if (contactListId === undefined || contactListId === null) {
			throw 'Missing the required parameter "contactListId" when calling deleteOutboundContactlistContact';
		}
		// verify the required parameter 'contactId' is set
		if (contactId === undefined || contactId === null) {
			throw 'Missing the required parameter "contactId" when calling deleteOutboundContactlistContact';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists/{contactListId}/contacts/{contactId}', 
			'DELETE', 
			{ 'contactListId': contactListId,'contactId': contactId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete contacts from a contact list.
	 * 
	 * @param {String} contactListId Contact List ID
	 * @param {Array.<String>} contactIds ContactIds to delete.
	 */
	deleteOutboundContactlistContacts(contactListId, contactIds) { 
		// verify the required parameter 'contactListId' is set
		if (contactListId === undefined || contactListId === null) {
			throw 'Missing the required parameter "contactListId" when calling deleteOutboundContactlistContacts';
		}
		// verify the required parameter 'contactIds' is set
		if (contactIds === undefined || contactIds === null) {
			throw 'Missing the required parameter "contactIds" when calling deleteOutboundContactlistContacts';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists/{contactListId}/contacts', 
			'DELETE', 
			{ 'contactListId': contactListId }, 
			{ 'contactIds': this.apiClient.buildCollectionParam(contactIds, 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Contact List Filter
	 * 
	 * @param {String} contactListFilterId Contact List Filter ID
	 */
	deleteOutboundContactlistfilter(contactListFilterId) { 
		// verify the required parameter 'contactListFilterId' is set
		if (contactListFilterId === undefined || contactListFilterId === null) {
			throw 'Missing the required parameter "contactListFilterId" when calling deleteOutboundContactlistfilter';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlistfilters/{contactListFilterId}', 
			'DELETE', 
			{ 'contactListFilterId': contactListFilterId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete multiple contact lists.
	 * 
	 * @param {Array.<String>} id contact list id(s) to delete
	 */
	deleteOutboundContactlists(id) { 
		// verify the required parameter 'id' is set
		if (id === undefined || id === null) {
			throw 'Missing the required parameter "id" when calling deleteOutboundContactlists';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists', 
			'DELETE', 
			{  }, 
			{ 'id': this.apiClient.buildCollectionParam(id, 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete dialer DNC list
	 * 
	 * @param {String} dncListId DncList ID
	 */
	deleteOutboundDnclist(dncListId) { 
		// verify the required parameter 'dncListId' is set
		if (dncListId === undefined || dncListId === null) {
			throw 'Missing the required parameter "dncListId" when calling deleteOutboundDnclist';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/dnclists/{dncListId}', 
			'DELETE', 
			{ 'dncListId': dncListId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a Rule set.
	 * 
	 * @param {String} ruleSetId Rule Set ID
	 */
	deleteOutboundRuleset(ruleSetId) { 
		// verify the required parameter 'ruleSetId' is set
		if (ruleSetId === undefined || ruleSetId === null) {
			throw 'Missing the required parameter "ruleSetId" when calling deleteOutboundRuleset';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/rulesets/{ruleSetId}', 
			'DELETE', 
			{ 'ruleSetId': ruleSetId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a dialer campaign schedule.
	 * 
	 * @param {String} campaignId Campaign ID
	 */
	deleteOutboundSchedulesCampaign(campaignId) { 
		// verify the required parameter 'campaignId' is set
		if (campaignId === undefined || campaignId === null) {
			throw 'Missing the required parameter "campaignId" when calling deleteOutboundSchedulesCampaign';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/schedules/campaigns/{campaignId}', 
			'DELETE', 
			{ 'campaignId': campaignId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a dialer sequence schedule.
	 * 
	 * @param {String} sequenceId Sequence ID
	 */
	deleteOutboundSchedulesSequence(sequenceId) { 
		// verify the required parameter 'sequenceId' is set
		if (sequenceId === undefined || sequenceId === null) {
			throw 'Missing the required parameter "sequenceId" when calling deleteOutboundSchedulesSequence';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/schedules/sequences/{sequenceId}', 
			'DELETE', 
			{ 'sequenceId': sequenceId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a dialer campaign sequence.
	 * 
	 * @param {String} sequenceId Campaign Sequence ID
	 */
	deleteOutboundSequence(sequenceId) { 
		// verify the required parameter 'sequenceId' is set
		if (sequenceId === undefined || sequenceId === null) {
			throw 'Missing the required parameter "sequenceId" when calling deleteOutboundSequence';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/sequences/{sequenceId}', 
			'DELETE', 
			{ 'sequenceId': sequenceId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get attempt limits
	 * 
	 * @param {String} attemptLimitsId Attempt limits ID
	 */
	getOutboundAttemptlimit(attemptLimitsId) { 
		// verify the required parameter 'attemptLimitsId' is set
		if (attemptLimitsId === undefined || attemptLimitsId === null) {
			throw 'Missing the required parameter "attemptLimitsId" when calling getOutboundAttemptlimit';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/attemptlimits/{attemptLimitsId}', 
			'GET', 
			{ 'attemptLimitsId': attemptLimitsId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query attempt limits list
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.filterType Filter type (default to Prefix)
	 * @param {String} opts.name Name
	 * @param {String} opts.sortBy Sort by
	 * @param {Object} opts.sortOrder Sort order (default to a)
	 */
	getOutboundAttemptlimits(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/outbound/attemptlimits', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'filterType': opts['filterType'],'name': opts['name'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get callable time set
	 * 
	 * @param {String} callableTimeSetId Callable Time Set ID
	 */
	getOutboundCallabletimeset(callableTimeSetId) { 
		// verify the required parameter 'callableTimeSetId' is set
		if (callableTimeSetId === undefined || callableTimeSetId === null) {
			throw 'Missing the required parameter "callableTimeSetId" when calling getOutboundCallabletimeset';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/callabletimesets/{callableTimeSetId}', 
			'GET', 
			{ 'callableTimeSetId': callableTimeSetId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query callable time set list
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.filterType Filter type (default to Prefix)
	 * @param {String} opts.name Name
	 * @param {String} opts.sortBy Sort by
	 * @param {Object} opts.sortOrder Sort order (default to a)
	 */
	getOutboundCallabletimesets(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/outbound/callabletimesets', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'filterType': opts['filterType'],'name': opts['name'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a dialer call analysis response set.
	 * 
	 * @param {String} callAnalysisSetId Call Analysis Response Set ID
	 */
	getOutboundCallanalysisresponseset(callAnalysisSetId) { 
		// verify the required parameter 'callAnalysisSetId' is set
		if (callAnalysisSetId === undefined || callAnalysisSetId === null) {
			throw 'Missing the required parameter "callAnalysisSetId" when calling getOutboundCallanalysisresponseset';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/callanalysisresponsesets/{callAnalysisSetId}', 
			'GET', 
			{ 'callAnalysisSetId': callAnalysisSetId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query a list of dialer call analysis response sets.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.filterType Filter type (default to Prefix)
	 * @param {String} opts.name Name
	 * @param {String} opts.sortBy Sort by
	 * @param {Object} opts.sortOrder Sort order (default to a)
	 */
	getOutboundCallanalysisresponsesets(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/outbound/callanalysisresponsesets', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'filterType': opts['filterType'],'name': opts['name'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get dialer campaign.
	 * 
	 * @param {String} campaignId Campaign ID
	 */
	getOutboundCampaign(campaignId) { 
		// verify the required parameter 'campaignId' is set
		if (campaignId === undefined || campaignId === null) {
			throw 'Missing the required parameter "campaignId" when calling getOutboundCampaign';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaigns/{campaignId}', 
			'GET', 
			{ 'campaignId': campaignId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get campaign diagnostics
	 * 
	 * @param {String} campaignId Campaign ID
	 */
	getOutboundCampaignDiagnostics(campaignId) { 
		// verify the required parameter 'campaignId' is set
		if (campaignId === undefined || campaignId === null) {
			throw 'Missing the required parameter "campaignId" when calling getOutboundCampaignDiagnostics';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaigns/{campaignId}/diagnostics', 
			'GET', 
			{ 'campaignId': campaignId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get dialer campaign interactions.
	 * 
	 * @param {String} campaignId Campaign ID
	 */
	getOutboundCampaignInteractions(campaignId) { 
		// verify the required parameter 'campaignId' is set
		if (campaignId === undefined || campaignId === null) {
			throw 'Missing the required parameter "campaignId" when calling getOutboundCampaignInteractions';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaigns/{campaignId}/interactions', 
			'GET', 
			{ 'campaignId': campaignId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get campaign progress
	 * 
	 * @param {String} campaignId Campaign ID
	 */
	getOutboundCampaignProgress(campaignId) { 
		// verify the required parameter 'campaignId' is set
		if (campaignId === undefined || campaignId === null) {
			throw 'Missing the required parameter "campaignId" when calling getOutboundCampaignProgress';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaigns/{campaignId}/progress', 
			'GET', 
			{ 'campaignId': campaignId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get statistics about a Dialer Campaign
	 * 
	 * @param {String} campaignId Campaign ID
	 */
	getOutboundCampaignStats(campaignId) { 
		// verify the required parameter 'campaignId' is set
		if (campaignId === undefined || campaignId === null) {
			throw 'Missing the required parameter "campaignId" when calling getOutboundCampaignStats';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaigns/{campaignId}/stats', 
			'GET', 
			{ 'campaignId': campaignId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Campaign Rule
	 * 
	 * @param {String} campaignRuleId Campaign Rule ID
	 */
	getOutboundCampaignrule(campaignRuleId) { 
		// verify the required parameter 'campaignRuleId' is set
		if (campaignRuleId === undefined || campaignRuleId === null) {
			throw 'Missing the required parameter "campaignRuleId" when calling getOutboundCampaignrule';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaignrules/{campaignRuleId}', 
			'GET', 
			{ 'campaignRuleId': campaignRuleId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query Campaign Rule list
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.filterType Filter type (default to Prefix)
	 * @param {String} opts.name Name
	 * @param {String} opts.sortBy Sort by
	 * @param {Object} opts.sortOrder Sort order (default to a)
	 */
	getOutboundCampaignrules(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/outbound/campaignrules', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'filterType': opts['filterType'],'name': opts['name'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query a list of dialer campaigns.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.filterType Filter type (default to Prefix)
	 * @param {String} opts.name Name
	 * @param {Array.<String>} opts.id id
	 * @param {String} opts.contactListId Contact List ID
	 * @param {String} opts.dncListId DNC list ID
	 * @param {String} opts.distributionQueueId Distribution queue ID
	 * @param {String} opts.edgeGroupId Edge group ID
	 * @param {String} opts.callAnalysisResponseSetId Call analysis response set ID
	 * @param {String} opts.sortBy Sort by
	 * @param {Object} opts.sortOrder Sort order (default to a)
	 */
	getOutboundCampaigns(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/outbound/campaigns', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'filterType': opts['filterType'],'name': opts['name'],'id': this.apiClient.buildCollectionParam(opts['id'], 'multi'),'contactListId': opts['contactListId'],'dncListId': opts['dncListId'],'distributionQueueId': opts['distributionQueueId'],'edgeGroupId': opts['edgeGroupId'],'callAnalysisResponseSetId': opts['callAnalysisResponseSetId'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a dialer contact list.
	 * 
	 * @param {String} contactListId ContactList ID
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.includeImportStatus Import status (default to false)
	 * @param {Boolean} opts.includeSize Include size (default to false)
	 */
	getOutboundContactlist(contactListId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'contactListId' is set
		if (contactListId === undefined || contactListId === null) {
			throw 'Missing the required parameter "contactListId" when calling getOutboundContactlist';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists/{contactListId}', 
			'GET', 
			{ 'contactListId': contactListId }, 
			{ 'includeImportStatus': opts['includeImportStatus'],'includeSize': opts['includeSize'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a contact.
	 * 
	 * @param {String} contactListId Contact List ID
	 * @param {String} contactId Contact ID
	 */
	getOutboundContactlistContact(contactListId, contactId) { 
		// verify the required parameter 'contactListId' is set
		if (contactListId === undefined || contactListId === null) {
			throw 'Missing the required parameter "contactListId" when calling getOutboundContactlistContact';
		}
		// verify the required parameter 'contactId' is set
		if (contactId === undefined || contactId === null) {
			throw 'Missing the required parameter "contactId" when calling getOutboundContactlistContact';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists/{contactListId}/contacts/{contactId}', 
			'GET', 
			{ 'contactListId': contactListId,'contactId': contactId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the URI of a contact list export.
	 * 
	 * @param {String} contactListId ContactList ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.download Redirect to download uri (default to false)
	 */
	getOutboundContactlistExport(contactListId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'contactListId' is set
		if (contactListId === undefined || contactListId === null) {
			throw 'Missing the required parameter "contactListId" when calling getOutboundContactlistExport';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists/{contactListId}/export', 
			'GET', 
			{ 'contactListId': contactListId }, 
			{ 'download': opts['download'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get dialer contactList import status.
	 * 
	 * @param {String} contactListId ContactList ID
	 */
	getOutboundContactlistImportstatus(contactListId) { 
		// verify the required parameter 'contactListId' is set
		if (contactListId === undefined || contactListId === null) {
			throw 'Missing the required parameter "contactListId" when calling getOutboundContactlistImportstatus';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists/{contactListId}/importstatus', 
			'GET', 
			{ 'contactListId': contactListId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Contact list filter
	 * 
	 * @param {String} contactListFilterId Contact List Filter ID
	 */
	getOutboundContactlistfilter(contactListFilterId) { 
		// verify the required parameter 'contactListFilterId' is set
		if (contactListFilterId === undefined || contactListFilterId === null) {
			throw 'Missing the required parameter "contactListFilterId" when calling getOutboundContactlistfilter';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlistfilters/{contactListFilterId}', 
			'GET', 
			{ 'contactListFilterId': contactListFilterId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query Contact list filters
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.filterType Filter type (default to Prefix)
	 * @param {String} opts.name Name
	 * @param {String} opts.sortBy Sort by
	 * @param {Object} opts.sortOrder Sort order (default to a)
	 * @param {String} opts.contactListId Contact List ID
	 */
	getOutboundContactlistfilters(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlistfilters', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'filterType': opts['filterType'],'name': opts['name'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'contactListId': opts['contactListId'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query a list of contact lists.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.includeImportStatus Include import status (default to false)
	 * @param {Boolean} opts.includeSize Include size (default to false)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.filterType Filter type (default to Prefix)
	 * @param {String} opts.name Name
	 * @param {Array.<String>} opts.id id
	 * @param {String} opts.sortBy Sort by
	 * @param {Object} opts.sortOrder Sort order (default to a)
	 */
	getOutboundContactlists(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists', 
			'GET', 
			{  }, 
			{ 'includeImportStatus': opts['includeImportStatus'],'includeSize': opts['includeSize'],'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'filterType': opts['filterType'],'name': opts['name'],'id': this.apiClient.buildCollectionParam(opts['id'], 'multi'),'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get dialer DNC list
	 * 
	 * @param {String} dncListId DncList ID
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.includeImportStatus Import status (default to false)
	 * @param {Boolean} opts.includeSize Include size (default to false)
	 */
	getOutboundDnclist(dncListId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'dncListId' is set
		if (dncListId === undefined || dncListId === null) {
			throw 'Missing the required parameter "dncListId" when calling getOutboundDnclist';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/dnclists/{dncListId}', 
			'GET', 
			{ 'dncListId': dncListId }, 
			{ 'includeImportStatus': opts['includeImportStatus'],'includeSize': opts['includeSize'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the URI of a DNC list export.
	 * 
	 * @param {String} dncListId DncList ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.download Redirect to download uri (default to false)
	 */
	getOutboundDnclistExport(dncListId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'dncListId' is set
		if (dncListId === undefined || dncListId === null) {
			throw 'Missing the required parameter "dncListId" when calling getOutboundDnclistExport';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/dnclists/{dncListId}/export', 
			'GET', 
			{ 'dncListId': dncListId }, 
			{ 'download': opts['download'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get dialer dncList import status.
	 * 
	 * @param {String} dncListId DncList ID
	 */
	getOutboundDnclistImportstatus(dncListId) { 
		// verify the required parameter 'dncListId' is set
		if (dncListId === undefined || dncListId === null) {
			throw 'Missing the required parameter "dncListId" when calling getOutboundDnclistImportstatus';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/dnclists/{dncListId}/importstatus', 
			'GET', 
			{ 'dncListId': dncListId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query dialer DNC lists
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.includeImportStatus Import status (default to false)
	 * @param {Boolean} opts.includeSize Include size (default to false)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.filterType Filter type (default to Prefix)
	 * @param {String} opts.name Name
	 * @param {String} opts.sortBy Sort by
	 * @param {Object} opts.sortOrder Sort order
	 */
	getOutboundDnclists(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/outbound/dnclists', 
			'GET', 
			{  }, 
			{ 'includeImportStatus': opts['includeImportStatus'],'includeSize': opts['includeSize'],'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'filterType': opts['filterType'],'name': opts['name'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Dialer Event
	 * 
	 * @param {String} eventId Event Log ID
	 */
	getOutboundEvent(eventId) { 
		// verify the required parameter 'eventId' is set
		if (eventId === undefined || eventId === null) {
			throw 'Missing the required parameter "eventId" when calling getOutboundEvent';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/events/{eventId}', 
			'GET', 
			{ 'eventId': eventId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query Event Logs
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.filterType Filter type (default to Prefix)
	 * @param {String} opts.category Category
	 * @param {String} opts.level Level
	 * @param {String} opts.sortBy Sort by
	 * @param {Object} opts.sortOrder Sort order (default to a)
	 */
	getOutboundEvents(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/outbound/events', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'filterType': opts['filterType'],'category': opts['category'],'level': opts['level'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Rule Set by ID.
	 * 
	 * @param {String} ruleSetId Rule Set ID
	 */
	getOutboundRuleset(ruleSetId) { 
		// verify the required parameter 'ruleSetId' is set
		if (ruleSetId === undefined || ruleSetId === null) {
			throw 'Missing the required parameter "ruleSetId" when calling getOutboundRuleset';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/rulesets/{ruleSetId}', 
			'GET', 
			{ 'ruleSetId': ruleSetId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query a list of Rule Sets.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.filterType Filter type (default to Prefix)
	 * @param {String} opts.name Name
	 * @param {String} opts.sortBy Sort by
	 * @param {Object} opts.sortOrder Sort order (default to a)
	 */
	getOutboundRulesets(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/outbound/rulesets', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'filterType': opts['filterType'],'name': opts['name'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a dialer campaign schedule.
	 * 
	 * @param {String} campaignId Campaign ID
	 */
	getOutboundSchedulesCampaign(campaignId) { 
		// verify the required parameter 'campaignId' is set
		if (campaignId === undefined || campaignId === null) {
			throw 'Missing the required parameter "campaignId" when calling getOutboundSchedulesCampaign';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/schedules/campaigns/{campaignId}', 
			'GET', 
			{ 'campaignId': campaignId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for a list of dialer campaign schedules.
	 * 
	 */
	getOutboundSchedulesCampaigns() { 

		return this.apiClient.callApi(
			'/api/v2/outbound/schedules/campaigns', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a dialer sequence schedule.
	 * 
	 * @param {String} sequenceId Sequence ID
	 */
	getOutboundSchedulesSequence(sequenceId) { 
		// verify the required parameter 'sequenceId' is set
		if (sequenceId === undefined || sequenceId === null) {
			throw 'Missing the required parameter "sequenceId" when calling getOutboundSchedulesSequence';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/schedules/sequences/{sequenceId}', 
			'GET', 
			{ 'sequenceId': sequenceId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for a list of dialer sequence schedules.
	 * 
	 */
	getOutboundSchedulesSequences() { 

		return this.apiClient.callApi(
			'/api/v2/outbound/schedules/sequences', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a dialer campaign sequence.
	 * 
	 * @param {String} sequenceId Campaign Sequence ID
	 */
	getOutboundSequence(sequenceId) { 
		// verify the required parameter 'sequenceId' is set
		if (sequenceId === undefined || sequenceId === null) {
			throw 'Missing the required parameter "sequenceId" when calling getOutboundSequence';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/sequences/{sequenceId}', 
			'GET', 
			{ 'sequenceId': sequenceId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query a list of dialer campaign sequences.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.filterType Filter type (default to Prefix)
	 * @param {String} opts.name Name
	 * @param {String} opts.sortBy Sort by
	 * @param {Object} opts.sortOrder Sort order (default to a)
	 */
	getOutboundSequences(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/outbound/sequences', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'filterType': opts['filterType'],'name': opts['name'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the outbound settings for this organization
	 * 
	 */
	getOutboundSettings() { 

		return this.apiClient.callApi(
			'/api/v2/outbound/settings', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the Dialer wrap up code mapping.
	 * 
	 */
	getOutboundWrapupcodemappings() { 

		return this.apiClient.callApi(
			'/api/v2/outbound/wrapupcodemappings', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the outbound settings for this organization
	 * 
	 * @param {Object} body outboundSettings
	 */
	patchOutboundSettings(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchOutboundSettings';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/settings', 
			'PATCH', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create attempt limits
	 * 
	 * @param {Object} body AttemptLimits
	 */
	postOutboundAttemptlimits(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundAttemptlimits';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/attemptlimits', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieves audits for dialer.
	 * 
	 * @param {Object} body AuditSearch
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy Sort by (default to entity.name)
	 * @param {String} opts.sortOrder Sort order (default to ascending)
	 * @param {Boolean} opts.facetsOnly Facets only (default to false)
	 */
	postOutboundAudits(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundAudits';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/audits', 
			'POST', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'facetsOnly': opts['facetsOnly'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create callable time set
	 * 
	 * @param {Object} body DialerCallableTimeSet
	 */
	postOutboundCallabletimesets(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundCallabletimesets';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/callabletimesets', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a dialer call analysis response set.
	 * 
	 * @param {Object} body ResponseSet
	 */
	postOutboundCallanalysisresponsesets(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundCallanalysisresponsesets';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/callanalysisresponsesets', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Schedule a Callback for a Dialer Campaign (Deprecated)
	 * This endpoint is deprecated and may have unexpected results. Please use \&quot;/conversations/{conversationId}/participants/{participantId}/callbacks instead.\&quot;
	 * @param {String} campaignId Campaign ID
	 * @param {Object} body ContactCallbackRequest
	 */
	postOutboundCampaignCallbackSchedule(campaignId, body) { 
		// verify the required parameter 'campaignId' is set
		if (campaignId === undefined || campaignId === null) {
			throw 'Missing the required parameter "campaignId" when calling postOutboundCampaignCallbackSchedule';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundCampaignCallbackSchedule';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaigns/{campaignId}/callback/schedule', 
			'POST', 
			{ 'campaignId': campaignId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create Campaign Rule
	 * 
	 * @param {Object} body CampaignRule
	 */
	postOutboundCampaignrules(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundCampaignrules';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaignrules', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a campaign.
	 * 
	 * @param {Object} body Campaign
	 */
	postOutboundCampaigns(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundCampaigns';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaigns', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get progress for a list of campaigns
	 * 
	 * @param {Array.<Object>} body Campaign IDs
	 */
	postOutboundCampaignsProgress(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundCampaignsProgress';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaigns/progress', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add contacts to a contact list.
	 * 
	 * @param {String} contactListId Contact List ID
	 * @param {Array.<Object>} body Contact
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.priority Contact priority. True means the contact(s) will be dialed next; false means the contact will go to the end of the contact queue.
	 * @param {Boolean} opts.clearSystemData Clear system data. True means the system columns (attempts, callable status, etc) stored on the contact will be cleared if the contact already exists; false means they won&#39;t.
	 * @param {Boolean} opts.doNotQueue Do not queue. True means that updated contacts will not have their positions in the queue altered, so contacts that have already been dialed will not be redialed; False means that updated contacts will be requeued, according to the &#39;priority&#39; parameter.
	 */
	postOutboundContactlistContacts(contactListId, body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'contactListId' is set
		if (contactListId === undefined || contactListId === null) {
			throw 'Missing the required parameter "contactListId" when calling postOutboundContactlistContacts';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundContactlistContacts';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists/{contactListId}/contacts', 
			'POST', 
			{ 'contactListId': contactListId }, 
			{ 'priority': opts['priority'],'clearSystemData': opts['clearSystemData'],'doNotQueue': opts['doNotQueue'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get contacts from a contact list.
	 * 
	 * @param {String} contactListId Contact List ID
	 * @param {Array.<Object>} body ContactIds to get.
	 */
	postOutboundContactlistContactsBulk(contactListId, body) { 
		// verify the required parameter 'contactListId' is set
		if (contactListId === undefined || contactListId === null) {
			throw 'Missing the required parameter "contactListId" when calling postOutboundContactlistContactsBulk';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundContactlistContactsBulk';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists/{contactListId}/contacts/bulk', 
			'POST', 
			{ 'contactListId': contactListId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Initiate the export of a contact list.
	 * Returns 200 if received OK.
	 * @param {String} contactListId ContactList ID
	 */
	postOutboundContactlistExport(contactListId) { 
		// verify the required parameter 'contactListId' is set
		if (contactListId === undefined || contactListId === null) {
			throw 'Missing the required parameter "contactListId" when calling postOutboundContactlistExport';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists/{contactListId}/export', 
			'POST', 
			{ 'contactListId': contactListId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create Contact List Filter
	 * 
	 * @param {Object} body ContactListFilter
	 */
	postOutboundContactlistfilters(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundContactlistfilters';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlistfilters', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a preview of the output of a contact list filter
	 * 
	 * @param {Object} body ContactListFilter
	 */
	postOutboundContactlistfiltersPreview(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundContactlistfiltersPreview';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlistfilters/preview', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a contact List.
	 * 
	 * @param {Object} body ContactList
	 */
	postOutboundContactlists(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundContactlists';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add phone numbers to a Dialer DNC list.
	 * 
	 * @param {String} conversationId Conversation ID
	 */
	postOutboundConversationDnc(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postOutboundConversationDnc';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/conversations/{conversationId}/dnc', 
			'POST', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Initiate the export of a dnc list.
	 * Returns 200 if received OK.
	 * @param {String} dncListId DncList ID
	 */
	postOutboundDnclistExport(dncListId) { 
		// verify the required parameter 'dncListId' is set
		if (dncListId === undefined || dncListId === null) {
			throw 'Missing the required parameter "dncListId" when calling postOutboundDnclistExport';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/dnclists/{dncListId}/export', 
			'POST', 
			{ 'dncListId': dncListId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add phone numbers to a Dialer DNC list.
	 * Only Internal DNC lists may be appended to
	 * @param {String} dncListId DncList ID
	 * @param {Array.<Object>} body DNC Phone Numbers
	 */
	postOutboundDnclistPhonenumbers(dncListId, body) { 
		// verify the required parameter 'dncListId' is set
		if (dncListId === undefined || dncListId === null) {
			throw 'Missing the required parameter "dncListId" when calling postOutboundDnclistPhonenumbers';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundDnclistPhonenumbers';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/dnclists/{dncListId}/phonenumbers', 
			'POST', 
			{ 'dncListId': dncListId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create dialer DNC list
	 * 
	 * @param {Object} body DncList
	 */
	postOutboundDnclists(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundDnclists';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/dnclists', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a Dialer Call Analysis Response Set.
	 * 
	 * @param {Object} body RuleSet
	 */
	postOutboundRulesets(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundRulesets';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/rulesets', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new campaign sequence.
	 * 
	 * @param {Object} body Organization
	 */
	postOutboundSequences(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postOutboundSequences';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/sequences', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update attempt limits
	 * 
	 * @param {String} attemptLimitsId Attempt limits ID
	 * @param {Object} body AttemptLimits
	 */
	putOutboundAttemptlimit(attemptLimitsId, body) { 
		// verify the required parameter 'attemptLimitsId' is set
		if (attemptLimitsId === undefined || attemptLimitsId === null) {
			throw 'Missing the required parameter "attemptLimitsId" when calling putOutboundAttemptlimit';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundAttemptlimit';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/attemptlimits/{attemptLimitsId}', 
			'PUT', 
			{ 'attemptLimitsId': attemptLimitsId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update callable time set
	 * 
	 * @param {String} callableTimeSetId Callable Time Set ID
	 * @param {Object} body DialerCallableTimeSet
	 */
	putOutboundCallabletimeset(callableTimeSetId, body) { 
		// verify the required parameter 'callableTimeSetId' is set
		if (callableTimeSetId === undefined || callableTimeSetId === null) {
			throw 'Missing the required parameter "callableTimeSetId" when calling putOutboundCallabletimeset';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundCallabletimeset';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/callabletimesets/{callableTimeSetId}', 
			'PUT', 
			{ 'callableTimeSetId': callableTimeSetId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a dialer call analysis response set.
	 * 
	 * @param {String} callAnalysisSetId Call Analysis Response Set ID
	 * @param {Object} body ResponseSet
	 */
	putOutboundCallanalysisresponseset(callAnalysisSetId, body) { 
		// verify the required parameter 'callAnalysisSetId' is set
		if (callAnalysisSetId === undefined || callAnalysisSetId === null) {
			throw 'Missing the required parameter "callAnalysisSetId" when calling putOutboundCallanalysisresponseset';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundCallanalysisresponseset';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/callanalysisresponsesets/{callAnalysisSetId}', 
			'PUT', 
			{ 'callAnalysisSetId': callAnalysisSetId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a campaign.
	 * 
	 * @param {String} campaignId Campaign ID
	 * @param {Object} body Campaign
	 */
	putOutboundCampaign(campaignId, body) { 
		// verify the required parameter 'campaignId' is set
		if (campaignId === undefined || campaignId === null) {
			throw 'Missing the required parameter "campaignId" when calling putOutboundCampaign';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundCampaign';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaigns/{campaignId}', 
			'PUT', 
			{ 'campaignId': campaignId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Send notification that an agent&#39;s state changed 
	 * New agent state.
	 * @param {String} campaignId Campaign ID
	 * @param {String} userId Agent&#39;s user ID
	 * @param {Object} body agent
	 */
	putOutboundCampaignAgent(campaignId, userId, body) { 
		// verify the required parameter 'campaignId' is set
		if (campaignId === undefined || campaignId === null) {
			throw 'Missing the required parameter "campaignId" when calling putOutboundCampaignAgent';
		}
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling putOutboundCampaignAgent';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundCampaignAgent';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaigns/{campaignId}/agents/{userId}', 
			'PUT', 
			{ 'campaignId': campaignId,'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update Campaign Rule
	 * 
	 * @param {String} campaignRuleId Campaign Rule ID
	 * @param {Object} body CampaignRule
	 */
	putOutboundCampaignrule(campaignRuleId, body) { 
		// verify the required parameter 'campaignRuleId' is set
		if (campaignRuleId === undefined || campaignRuleId === null) {
			throw 'Missing the required parameter "campaignRuleId" when calling putOutboundCampaignrule';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundCampaignrule';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/campaignrules/{campaignRuleId}', 
			'PUT', 
			{ 'campaignRuleId': campaignRuleId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a contact list.
	 * 
	 * @param {String} contactListId ContactList ID
	 * @param {Object} body ContactList
	 */
	putOutboundContactlist(contactListId, body) { 
		// verify the required parameter 'contactListId' is set
		if (contactListId === undefined || contactListId === null) {
			throw 'Missing the required parameter "contactListId" when calling putOutboundContactlist';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundContactlist';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists/{contactListId}', 
			'PUT', 
			{ 'contactListId': contactListId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a contact.
	 * 
	 * @param {String} contactListId Contact List ID
	 * @param {String} contactId Contact ID
	 * @param {Object} body Contact
	 */
	putOutboundContactlistContact(contactListId, contactId, body) { 
		// verify the required parameter 'contactListId' is set
		if (contactListId === undefined || contactListId === null) {
			throw 'Missing the required parameter "contactListId" when calling putOutboundContactlistContact';
		}
		// verify the required parameter 'contactId' is set
		if (contactId === undefined || contactId === null) {
			throw 'Missing the required parameter "contactId" when calling putOutboundContactlistContact';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundContactlistContact';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlists/{contactListId}/contacts/{contactId}', 
			'PUT', 
			{ 'contactListId': contactListId,'contactId': contactId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update Contact List Filter
	 * 
	 * @param {String} contactListFilterId Contact List Filter ID
	 * @param {Object} body ContactListFilter
	 */
	putOutboundContactlistfilter(contactListFilterId, body) { 
		// verify the required parameter 'contactListFilterId' is set
		if (contactListFilterId === undefined || contactListFilterId === null) {
			throw 'Missing the required parameter "contactListFilterId" when calling putOutboundContactlistfilter';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundContactlistfilter';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/contactlistfilters/{contactListFilterId}', 
			'PUT', 
			{ 'contactListFilterId': contactListFilterId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update dialer DNC list
	 * 
	 * @param {String} dncListId DncList ID
	 * @param {Object} body DncList
	 */
	putOutboundDnclist(dncListId, body) { 
		// verify the required parameter 'dncListId' is set
		if (dncListId === undefined || dncListId === null) {
			throw 'Missing the required parameter "dncListId" when calling putOutboundDnclist';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundDnclist';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/dnclists/{dncListId}', 
			'PUT', 
			{ 'dncListId': dncListId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a RuleSet.
	 * 
	 * @param {String} ruleSetId Rule Set ID
	 * @param {Object} body RuleSet
	 */
	putOutboundRuleset(ruleSetId, body) { 
		// verify the required parameter 'ruleSetId' is set
		if (ruleSetId === undefined || ruleSetId === null) {
			throw 'Missing the required parameter "ruleSetId" when calling putOutboundRuleset';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundRuleset';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/rulesets/{ruleSetId}', 
			'PUT', 
			{ 'ruleSetId': ruleSetId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a new campaign schedule.
	 * 
	 * @param {String} campaignId Campaign ID
	 * @param {Object} body CampaignSchedule
	 */
	putOutboundSchedulesCampaign(campaignId, body) { 
		// verify the required parameter 'campaignId' is set
		if (campaignId === undefined || campaignId === null) {
			throw 'Missing the required parameter "campaignId" when calling putOutboundSchedulesCampaign';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundSchedulesCampaign';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/schedules/campaigns/{campaignId}', 
			'PUT', 
			{ 'campaignId': campaignId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a new sequence schedule.
	 * 
	 * @param {String} sequenceId Sequence ID
	 * @param {Object} body SequenceSchedule
	 */
	putOutboundSchedulesSequence(sequenceId, body) { 
		// verify the required parameter 'sequenceId' is set
		if (sequenceId === undefined || sequenceId === null) {
			throw 'Missing the required parameter "sequenceId" when calling putOutboundSchedulesSequence';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundSchedulesSequence';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/schedules/sequences/{sequenceId}', 
			'PUT', 
			{ 'sequenceId': sequenceId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a new campaign sequence.
	 * 
	 * @param {String} sequenceId Campaign Sequence ID
	 * @param {Object} body Organization
	 */
	putOutboundSequence(sequenceId, body) { 
		// verify the required parameter 'sequenceId' is set
		if (sequenceId === undefined || sequenceId === null) {
			throw 'Missing the required parameter "sequenceId" when calling putOutboundSequence';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundSequence';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/sequences/{sequenceId}', 
			'PUT', 
			{ 'sequenceId': sequenceId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the Dialer wrap up code mapping.
	 * 
	 * @param {Object} body wrapUpCodeMapping
	 */
	putOutboundWrapupcodemappings(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putOutboundWrapupcodemappings';
		}

		return this.apiClient.callApi(
			'/api/v2/outbound/wrapupcodemappings', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class PresenceApi {
	/**
	 * Presence service.
	 * @module purecloud-platform-client-v2/api/PresenceApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new PresenceApi. 
	 * @alias module:purecloud-platform-client-v2/api/PresenceApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete a Presence Definition
	 * 
	 * @param {String} presenceId Organization Presence ID
	 */
	deletePresencedefinition(presenceId) { 
		// verify the required parameter 'presenceId' is set
		if (presenceId === undefined || presenceId === null) {
			throw 'Missing the required parameter "presenceId" when calling deletePresencedefinition';
		}

		return this.apiClient.callApi(
			'/api/v2/presencedefinitions/{presenceId}', 
			'DELETE', 
			{ 'presenceId': presenceId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Presence Definition
	 * 
	 * @param {String} presenceId Organization Presence ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.localeCode The locale code to fetch for the presence definition. Use ALL to fetch everything.
	 */
	getPresencedefinition(presenceId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'presenceId' is set
		if (presenceId === undefined || presenceId === null) {
			throw 'Missing the required parameter "presenceId" when calling getPresencedefinition';
		}

		return this.apiClient.callApi(
			'/api/v2/presencedefinitions/{presenceId}', 
			'GET', 
			{ 'presenceId': presenceId }, 
			{ 'localeCode': opts['localeCode'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an Organization&#39;s list of Presence Definitions
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.deleted Deleted query can be TRUE, FALSE or ALL (default to false)
	 * @param {String} opts.localeCode The locale code to fetch for each presence definition. Use ALL to fetch everything.
	 */
	getPresencedefinitions(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/presencedefinitions', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'deleted': opts['deleted'],'localeCode': opts['localeCode'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of SystemPresences
	 * 
	 */
	getSystempresences() { 

		return this.apiClient.callApi(
			'/api/v2/systempresences', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a user&#39;s Presence
	 * 
	 * @param {String} userId user Id
	 * @param {String} sourceId Source
	 */
	getUserPresence(userId, sourceId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserPresence';
		}
		// verify the required parameter 'sourceId' is set
		if (sourceId === undefined || sourceId === null) {
			throw 'Missing the required parameter "sourceId" when calling getUserPresence';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/presences/{sourceId}', 
			'GET', 
			{ 'userId': userId,'sourceId': sourceId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Patch a user&#39;s Presence
	 * The presence object can be patched one of three ways. Option 1: Set the &#39;primary&#39; property to true. This will set the &#39;source&#39; defined in the path as the user&#39;s primary presence source. Option 2: Provide the presenceDefinition value. The &#39;id&#39; is the only value required within the presenceDefinition. Option 3: Provide the message value. Option 1 can be combined with Option 2 and/or Option 3.
	 * @param {String} userId user Id
	 * @param {String} sourceId Source
	 * @param {Object} body User presence
	 */
	patchUserPresence(userId, sourceId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling patchUserPresence';
		}
		// verify the required parameter 'sourceId' is set
		if (sourceId === undefined || sourceId === null) {
			throw 'Missing the required parameter "sourceId" when calling patchUserPresence';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchUserPresence';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/presences/{sourceId}', 
			'PATCH', 
			{ 'userId': userId,'sourceId': sourceId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a Presence Definition
	 * 
	 * @param {Object} body The Presence Definition to create
	 */
	postPresencedefinitions(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postPresencedefinitions';
		}

		return this.apiClient.callApi(
			'/api/v2/presencedefinitions', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a Presence Definition
	 * 
	 * @param {String} presenceId Organization Presence ID
	 * @param {Object} body The OrganizationPresence to update
	 */
	putPresencedefinition(presenceId, body) { 
		// verify the required parameter 'presenceId' is set
		if (presenceId === undefined || presenceId === null) {
			throw 'Missing the required parameter "presenceId" when calling putPresencedefinition';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putPresencedefinition';
		}

		return this.apiClient.callApi(
			'/api/v2/presencedefinitions/{presenceId}', 
			'PUT', 
			{ 'presenceId': presenceId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class QualityApi {
	/**
	 * Quality service.
	 * @module purecloud-platform-client-v2/api/QualityApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new QualityApi. 
	 * @alias module:purecloud-platform-client-v2/api/QualityApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete a calibration by id.
	 * 
	 * @param {String} calibrationId Calibration ID
	 * @param {String} calibratorId calibratorId
	 */
	deleteQualityCalibration(calibrationId, calibratorId) { 
		// verify the required parameter 'calibrationId' is set
		if (calibrationId === undefined || calibrationId === null) {
			throw 'Missing the required parameter "calibrationId" when calling deleteQualityCalibration';
		}
		// verify the required parameter 'calibratorId' is set
		if (calibratorId === undefined || calibratorId === null) {
			throw 'Missing the required parameter "calibratorId" when calling deleteQualityCalibration';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/calibrations/{calibrationId}', 
			'DELETE', 
			{ 'calibrationId': calibrationId }, 
			{ 'calibratorId': calibratorId }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete an evaluation
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} evaluationId evaluationId
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.expand evaluatorId
	 */
	deleteQualityConversationEvaluation(conversationId, evaluationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling deleteQualityConversationEvaluation';
		}
		// verify the required parameter 'evaluationId' is set
		if (evaluationId === undefined || evaluationId === null) {
			throw 'Missing the required parameter "evaluationId" when calling deleteQualityConversationEvaluation';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/conversations/{conversationId}/evaluations/{evaluationId}', 
			'DELETE', 
			{ 'conversationId': conversationId,'evaluationId': evaluationId }, 
			{ 'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete an evaluation form.
	 * 
	 * @param {String} formId Form ID
	 */
	deleteQualityForm(formId) { 
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling deleteQualityForm';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/{formId}', 
			'DELETE', 
			{ 'formId': formId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete an evaluation form.
	 * 
	 * @param {String} formId Form ID
	 */
	deleteQualityFormsEvaluation(formId) { 
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling deleteQualityFormsEvaluation';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/evaluations/{formId}', 
			'DELETE', 
			{ 'formId': formId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a survey form.
	 * 
	 * @param {String} formId Form ID
	 */
	deleteQualityFormsSurvey(formId) { 
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling deleteQualityFormsSurvey';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/surveys/{formId}', 
			'DELETE', 
			{ 'formId': formId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a keywordSet by id.
	 * 
	 * @param {String} keywordSetId KeywordSet ID
	 */
	deleteQualityKeywordset(keywordSetId) { 
		// verify the required parameter 'keywordSetId' is set
		if (keywordSetId === undefined || keywordSetId === null) {
			throw 'Missing the required parameter "keywordSetId" when calling deleteQualityKeywordset';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/keywordsets/{keywordSetId}', 
			'DELETE', 
			{ 'keywordSetId': keywordSetId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete keyword sets
	 * Bulk delete of keyword sets; this will only delete the keyword sets that match the ids specified in the query param.
	 * @param {String} ids A comma-delimited list of valid KeywordSet ids
	 */
	deleteQualityKeywordsets(ids) { 
		// verify the required parameter 'ids' is set
		if (ids === undefined || ids === null) {
			throw 'Missing the required parameter "ids" when calling deleteQualityKeywordsets';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/keywordsets', 
			'DELETE', 
			{  }, 
			{ 'ids': ids }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets a list of Agent Activities
	 * Including the number of evaluations and average evaluation score
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 * @param {Date} opts.startTime Start time of agent activity. Date time is represented as an ISO-8601 string. For example: yyyy-MM-ddTHH:mm:ss.SSSZ
	 * @param {Date} opts.endTime End time of agent activity. Date time is represented as an ISO-8601 string. For example: yyyy-MM-ddTHH:mm:ss.SSSZ
	 * @param {Array.<String>} opts.agentUserId user id of agent requested
	 * @param {String} opts.evaluatorUserId user id of the evaluator
	 * @param {String} opts.name name
	 * @param {String} opts.group group id
	 */
	getQualityAgentsActivity(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/quality/agents/activity', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'],'startTime': opts['startTime'],'endTime': opts['endTime'],'agentUserId': this.apiClient.buildCollectionParam(opts['agentUserId'], 'multi'),'evaluatorUserId': opts['evaluatorUserId'],'name': opts['name'],'group': opts['group'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a calibration by id.  Requires either calibrator id or conversation id
	 * 
	 * @param {String} calibrationId Calibration ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.calibratorId calibratorId
	 * @param {String} opts.conversationId conversationId
	 */
	getQualityCalibration(calibrationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'calibrationId' is set
		if (calibrationId === undefined || calibrationId === null) {
			throw 'Missing the required parameter "calibrationId" when calling getQualityCalibration';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/calibrations/{calibrationId}', 
			'GET', 
			{ 'calibrationId': calibrationId }, 
			{ 'calibratorId': opts['calibratorId'],'conversationId': opts['conversationId'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of calibrations
	 * 
	 * @param {String} calibratorId user id of calibrator
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 * @param {String} opts.conversationId conversation id
	 * @param {Date} opts.startTime Beginning of the calibration query. Date time is represented as an ISO-8601 string. For example: yyyy-MM-ddTHH:mm:ss.SSSZ
	 * @param {Date} opts.endTime end of the calibration query. Date time is represented as an ISO-8601 string. For example: yyyy-MM-ddTHH:mm:ss.SSSZ
	 */
	getQualityCalibrations(calibratorId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'calibratorId' is set
		if (calibratorId === undefined || calibratorId === null) {
			throw 'Missing the required parameter "calibratorId" when calling getQualityCalibrations';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/calibrations', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'],'conversationId': opts['conversationId'],'startTime': opts['startTime'],'endTime': opts['endTime'],'calibratorId': calibratorId }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get audits for conversation or recording
	 * 
	 * @param {String} conversationId Conversation ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 * @param {String} opts.recordingId id of the recording
	 * @param {String} opts.entityType entity type options: Recording, Calibration, Evaluation, Annotation, Screen_Recording (default to RECORDING)
	 */
	getQualityConversationAudits(conversationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getQualityConversationAudits';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/conversations/{conversationId}/audits', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'],'recordingId': opts['recordingId'],'entityType': opts['entityType'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an evaluation
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} evaluationId evaluationId
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.expand agent, evaluator, evaluationForm
	 */
	getQualityConversationEvaluation(conversationId, evaluationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getQualityConversationEvaluation';
		}
		// verify the required parameter 'evaluationId' is set
		if (evaluationId === undefined || evaluationId === null) {
			throw 'Missing the required parameter "evaluationId" when calling getQualityConversationEvaluation';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/conversations/{conversationId}/evaluations/{evaluationId}', 
			'GET', 
			{ 'conversationId': conversationId,'evaluationId': evaluationId }, 
			{ 'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Queries Evaluations and returns a paged list
	 * Query params must include one of conversationId, evaluatorUserId, or agentUserId
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 * @param {String} opts.conversationId conversationId specified
	 * @param {String} opts.agentUserId user id of the agent
	 * @param {String} opts.evaluatorUserId evaluator user id
	 * @param {String} opts.queueId queue id
	 * @param {String} opts.startTime start time of the evaluation query
	 * @param {String} opts.endTime end time of the evaluation query
	 * @param {Array.<String>} opts.evaluationState 
	 * @param {Boolean} opts.isReleased the evaluation has been released
	 * @param {Boolean} opts.agentHasRead agent has the evaluation
	 * @param {Boolean} opts.expandAnswerTotalScores get the total scores for evaluations
	 * @param {Number} opts.maximum maximum
	 * @param {String} opts.sortOrder sort order options for agentUserId or evaluatorUserId query. Valid options are &#39;a&#39;, &#39;asc&#39;, &#39;ascending&#39;, &#39;d&#39;, &#39;desc&#39;, &#39;descending&#39;
	 */
	getQualityEvaluationsQuery(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/quality/evaluations/query', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'],'conversationId': opts['conversationId'],'agentUserId': opts['agentUserId'],'evaluatorUserId': opts['evaluatorUserId'],'queueId': opts['queueId'],'startTime': opts['startTime'],'endTime': opts['endTime'],'evaluationState': this.apiClient.buildCollectionParam(opts['evaluationState'], 'multi'),'isReleased': opts['isReleased'],'agentHasRead': opts['agentHasRead'],'expandAnswerTotalScores': opts['expandAnswerTotalScores'],'maximum': opts['maximum'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an evaluator activity
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 * @param {Date} opts.startTime The start time specified. Date time is represented as an ISO-8601 string. For example: yyyy-MM-ddTHH:mm:ss.SSSZ
	 * @param {Date} opts.endTime The end time specified. Date time is represented as an ISO-8601 string. For example: yyyy-MM-ddTHH:mm:ss.SSSZ
	 * @param {String} opts.name Evaluator name
	 * @param {Array.<String>} opts.permission permission strings
	 * @param {String} opts.group group id
	 */
	getQualityEvaluatorsActivity(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/quality/evaluators/activity', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'],'startTime': opts['startTime'],'endTime': opts['endTime'],'name': opts['name'],'permission': this.apiClient.buildCollectionParam(opts['permission'], 'multi'),'group': opts['group'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an evaluation form
	 * 
	 * @param {String} formId Form ID
	 */
	getQualityForm(formId) { 
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling getQualityForm';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/{formId}', 
			'GET', 
			{ 'formId': formId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets all the revisions for a specific evaluation.
	 * 
	 * @param {String} formId Form ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getQualityFormVersions(formId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling getQualityFormVersions';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/{formId}/versions', 
			'GET', 
			{ 'formId': formId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of evaluation forms
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 * @param {String} opts.expand Expand
	 * @param {String} opts.name Name
	 */
	getQualityForms(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/quality/forms', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'nextPage': opts['nextPage'],'previousPage': opts['previousPage'],'expand': opts['expand'],'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an evaluation form
	 * 
	 * @param {String} formId Form ID
	 */
	getQualityFormsEvaluation(formId) { 
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling getQualityFormsEvaluation';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/evaluations/{formId}', 
			'GET', 
			{ 'formId': formId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets all the revisions for a specific evaluation.
	 * 
	 * @param {String} formId Form ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getQualityFormsEvaluationVersions(formId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling getQualityFormsEvaluationVersions';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/evaluations/{formId}/versions', 
			'GET', 
			{ 'formId': formId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of evaluation forms
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 * @param {String} opts.expand Expand
	 * @param {String} opts.name Name
	 */
	getQualityFormsEvaluations(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/quality/forms/evaluations', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'nextPage': opts['nextPage'],'previousPage': opts['previousPage'],'expand': opts['expand'],'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a survey form
	 * 
	 * @param {String} formId Form ID
	 */
	getQualityFormsSurvey(formId) { 
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling getQualityFormsSurvey';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/surveys/{formId}', 
			'GET', 
			{ 'formId': formId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets all the revisions for a specific survey.
	 * 
	 * @param {String} formId Form ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getQualityFormsSurveyVersions(formId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling getQualityFormsSurveyVersions';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/surveys/{formId}/versions', 
			'GET', 
			{ 'formId': formId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of survey forms
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 * @param {String} opts.expand Expand
	 * @param {String} opts.name Name
	 */
	getQualityFormsSurveys(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/quality/forms/surveys', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'nextPage': opts['nextPage'],'previousPage': opts['previousPage'],'expand': opts['expand'],'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a keywordSet by id.
	 * 
	 * @param {String} keywordSetId KeywordSet ID
	 */
	getQualityKeywordset(keywordSetId) { 
		// verify the required parameter 'keywordSetId' is set
		if (keywordSetId === undefined || keywordSetId === null) {
			throw 'Missing the required parameter "keywordSetId" when calling getQualityKeywordset';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/keywordsets/{keywordSetId}', 
			'GET', 
			{ 'keywordSetId': keywordSetId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of keyword sets
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 * @param {String} opts.name the keyword set name - used for filtering results in searches.
	 * @param {String} opts.queueId the queue id - used for filtering results in searches.
	 * @param {String} opts.agentId the agent id - used for filtering results in searches.
	 * @param {Object} opts.operator If agentID and queueId are both present, this determines whether the query is an AND or OR between those parameters.
	 */
	getQualityKeywordsets(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/quality/keywordsets', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'],'name': opts['name'],'queueId': opts['queueId'],'agentId': opts['agentId'],'operator': opts['operator'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the published evaluation forms.
	 * 
	 * @param {String} formId Form ID
	 */
	getQualityPublishedform(formId) { 
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling getQualityPublishedform';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/publishedforms/{formId}', 
			'GET', 
			{ 'formId': formId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the published evaluation forms.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.name Name
	 */
	getQualityPublishedforms(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/quality/publishedforms', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the most recent published version of an evaluation form.
	 * 
	 * @param {String} formId Form ID
	 */
	getQualityPublishedformsEvaluation(formId) { 
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling getQualityPublishedformsEvaluation';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/publishedforms/evaluations/{formId}', 
			'GET', 
			{ 'formId': formId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the published evaluation forms.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.name Name
	 */
	getQualityPublishedformsEvaluations(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/quality/publishedforms/evaluations', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the most recent published version of a survey form.
	 * 
	 * @param {String} formId Form ID
	 */
	getQualityPublishedformsSurvey(formId) { 
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling getQualityPublishedformsSurvey';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/publishedforms/surveys/{formId}', 
			'GET', 
			{ 'formId': formId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the published survey forms.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.name Name
	 */
	getQualityPublishedformsSurveys(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/quality/publishedforms/surveys', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Disable a particular version of a survey form and invalidates any invitations that have already been sent to customers using this version of the form.
	 * 
	 * @param {String} formId Form ID
	 * @param {Object} body Survey form
	 */
	patchQualityFormsSurvey(formId, body) { 
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling patchQualityFormsSurvey';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchQualityFormsSurvey';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/surveys/{formId}', 
			'PATCH', 
			{ 'formId': formId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for evaluation aggregates
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsEvaluationsAggregatesQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsEvaluationsAggregatesQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/evaluations/aggregates/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a calibration
	 * 
	 * @param {Object} body calibration
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.expand calibratorId
	 */
	postQualityCalibrations(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postQualityCalibrations';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/calibrations', 
			'POST', 
			{  }, 
			{ 'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create an evaluation
	 * 
	 * @param {String} conversationId conversationId
	 * @param {Object} body evaluation
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.expand evaluatorId
	 */
	postQualityConversationEvaluations(conversationId, body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postQualityConversationEvaluations';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postQualityConversationEvaluations';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/conversations/{conversationId}/evaluations', 
			'POST', 
			{ 'conversationId': conversationId }, 
			{ 'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Score evaluation
	 * 
	 * @param {Object} body evaluationAndScoringSet
	 */
	postQualityEvaluationsScoring(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postQualityEvaluationsScoring';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/evaluations/scoring', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create an evaluation form.
	 * 
	 * @param {Object} body Evaluation form
	 */
	postQualityForms(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postQualityForms';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create an evaluation form.
	 * 
	 * @param {Object} body Evaluation form
	 */
	postQualityFormsEvaluations(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postQualityFormsEvaluations';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/evaluations', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a survey form.
	 * 
	 * @param {Object} body Survey form
	 */
	postQualityFormsSurveys(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postQualityFormsSurveys';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/surveys', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a Keyword Set
	 * 
	 * @param {Object} body keywordSet
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.expand queueId
	 */
	postQualityKeywordsets(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postQualityKeywordsets';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/keywordsets', 
			'POST', 
			{  }, 
			{ 'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Publish an evaluation form.
	 * 
	 * @param {Object} body Publish request containing id of form to publish
	 */
	postQualityPublishedforms(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postQualityPublishedforms';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/publishedforms', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Publish an evaluation form.
	 * 
	 * @param {Object} body Publish request containing id of form to publish
	 */
	postQualityPublishedformsEvaluations(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postQualityPublishedformsEvaluations';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/publishedforms/evaluations', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Publish a survey form.
	 * 
	 * @param {Object} body Survey form
	 */
	postQualityPublishedformsSurveys(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postQualityPublishedformsSurveys';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/publishedforms/surveys', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieve the spotability statistic
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Keyword Set
	 */
	postQualitySpotability(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/quality/spotability', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a calibration to the specified calibration via PUT.  Editable fields include: evaluators, expertEvaluator, and scoringIndex
	 * 
	 * @param {String} calibrationId Calibration ID
	 * @param {Object} body Calibration
	 */
	putQualityCalibration(calibrationId, body) { 
		// verify the required parameter 'calibrationId' is set
		if (calibrationId === undefined || calibrationId === null) {
			throw 'Missing the required parameter "calibrationId" when calling putQualityCalibration';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putQualityCalibration';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/calibrations/{calibrationId}', 
			'PUT', 
			{ 'calibrationId': calibrationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an evaluation
	 * 
	 * @param {String} conversationId conversationId
	 * @param {String} evaluationId evaluationId
	 * @param {Object} body evaluation
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.expand evaluatorId
	 */
	putQualityConversationEvaluation(conversationId, evaluationId, body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling putQualityConversationEvaluation';
		}
		// verify the required parameter 'evaluationId' is set
		if (evaluationId === undefined || evaluationId === null) {
			throw 'Missing the required parameter "evaluationId" when calling putQualityConversationEvaluation';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putQualityConversationEvaluation';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/conversations/{conversationId}/evaluations/{evaluationId}', 
			'PUT', 
			{ 'conversationId': conversationId,'evaluationId': evaluationId }, 
			{ 'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an evaluation form.
	 * 
	 * @param {String} formId Form ID
	 * @param {Object} body Evaluation form
	 */
	putQualityForm(formId, body) { 
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling putQualityForm';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putQualityForm';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/{formId}', 
			'PUT', 
			{ 'formId': formId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an evaluation form.
	 * 
	 * @param {String} formId Form ID
	 * @param {Object} body Evaluation form
	 */
	putQualityFormsEvaluation(formId, body) { 
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling putQualityFormsEvaluation';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putQualityFormsEvaluation';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/evaluations/{formId}', 
			'PUT', 
			{ 'formId': formId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a survey form.
	 * 
	 * @param {String} formId Form ID
	 * @param {Object} body Survey form
	 */
	putQualityFormsSurvey(formId, body) { 
		// verify the required parameter 'formId' is set
		if (formId === undefined || formId === null) {
			throw 'Missing the required parameter "formId" when calling putQualityFormsSurvey';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putQualityFormsSurvey';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/forms/surveys/{formId}', 
			'PUT', 
			{ 'formId': formId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a keywordSet to the specified keywordSet via PUT.
	 * 
	 * @param {String} keywordSetId KeywordSet ID
	 * @param {Object} body keywordSet
	 */
	putQualityKeywordset(keywordSetId, body) { 
		// verify the required parameter 'keywordSetId' is set
		if (keywordSetId === undefined || keywordSetId === null) {
			throw 'Missing the required parameter "keywordSetId" when calling putQualityKeywordset';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putQualityKeywordset';
		}

		return this.apiClient.callApi(
			'/api/v2/quality/keywordsets/{keywordSetId}', 
			'PUT', 
			{ 'keywordSetId': keywordSetId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class RecordingApi {
	/**
	 * Recording service.
	 * @module purecloud-platform-client-v2/api/RecordingApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new RecordingApi. 
	 * @alias module:purecloud-platform-client-v2/api/RecordingApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete annotation
	 * 
	 * @param {String} conversationId Conversation ID
	 * @param {String} recordingId Recording ID
	 * @param {String} annotationId Annotation ID
	 */
	deleteConversationRecordingAnnotation(conversationId, recordingId, annotationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling deleteConversationRecordingAnnotation';
		}
		// verify the required parameter 'recordingId' is set
		if (recordingId === undefined || recordingId === null) {
			throw 'Missing the required parameter "recordingId" when calling deleteConversationRecordingAnnotation';
		}
		// verify the required parameter 'annotationId' is set
		if (annotationId === undefined || annotationId === null) {
			throw 'Missing the required parameter "annotationId" when calling deleteConversationRecordingAnnotation';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/recordings/{recordingId}/annotations/{annotationId}', 
			'DELETE', 
			{ 'conversationId': conversationId,'recordingId': recordingId,'annotationId': annotationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Deletes a single orphan recording
	 * 
	 * @param {String} orphanId Orphan ID
	 */
	deleteOrphanrecording(orphanId) { 
		// verify the required parameter 'orphanId' is set
		if (orphanId === undefined || orphanId === null) {
			throw 'Missing the required parameter "orphanId" when calling deleteOrphanrecording';
		}

		return this.apiClient.callApi(
			'/api/v2/orphanrecordings/{orphanId}', 
			'DELETE', 
			{ 'orphanId': orphanId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete media retention policies
	 * Bulk delete of media retention policies, this will only delete the polices that match the ids specified in the query param.
	 * @param {String} ids 
	 */
	deleteRecordingMediaretentionpolicies(ids) { 
		// verify the required parameter 'ids' is set
		if (ids === undefined || ids === null) {
			throw 'Missing the required parameter "ids" when calling deleteRecordingMediaretentionpolicies';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/mediaretentionpolicies', 
			'DELETE', 
			{  }, 
			{ 'ids': ids }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a media retention policy
	 * 
	 * @param {String} policyId Policy ID
	 */
	deleteRecordingMediaretentionpolicy(policyId) { 
		// verify the required parameter 'policyId' is set
		if (policyId === undefined || policyId === null) {
			throw 'Missing the required parameter "policyId" when calling deleteRecordingMediaretentionpolicy';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/mediaretentionpolicies/{policyId}', 
			'DELETE', 
			{ 'policyId': policyId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets a specific recording.
	 * 
	 * @param {String} conversationId Conversation ID
	 * @param {String} recordingId Recording ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.formatId The desired media format. (default to WEBM)
	 * @param {Boolean} opts.download requesting a download format of the recording (default to false)
	 * @param {String} opts.fileName the name of the downloaded fileName
	 */
	getConversationRecording(conversationId, recordingId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationRecording';
		}
		// verify the required parameter 'recordingId' is set
		if (recordingId === undefined || recordingId === null) {
			throw 'Missing the required parameter "recordingId" when calling getConversationRecording';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/recordings/{recordingId}', 
			'GET', 
			{ 'conversationId': conversationId,'recordingId': recordingId }, 
			{ 'formatId': opts['formatId'],'download': opts['download'],'fileName': opts['fileName'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get annotation
	 * 
	 * @param {String} conversationId Conversation ID
	 * @param {String} recordingId Recording ID
	 * @param {String} annotationId Annotation ID
	 */
	getConversationRecordingAnnotation(conversationId, recordingId, annotationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationRecordingAnnotation';
		}
		// verify the required parameter 'recordingId' is set
		if (recordingId === undefined || recordingId === null) {
			throw 'Missing the required parameter "recordingId" when calling getConversationRecordingAnnotation';
		}
		// verify the required parameter 'annotationId' is set
		if (annotationId === undefined || annotationId === null) {
			throw 'Missing the required parameter "annotationId" when calling getConversationRecordingAnnotation';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/recordings/{recordingId}/annotations/{annotationId}', 
			'GET', 
			{ 'conversationId': conversationId,'recordingId': recordingId,'annotationId': annotationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get annotations for recording
	 * 
	 * @param {String} conversationId Conversation ID
	 * @param {String} recordingId Recording ID
	 */
	getConversationRecordingAnnotations(conversationId, recordingId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationRecordingAnnotations';
		}
		// verify the required parameter 'recordingId' is set
		if (recordingId === undefined || recordingId === null) {
			throw 'Missing the required parameter "recordingId" when calling getConversationRecordingAnnotations';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/recordings/{recordingId}/annotations', 
			'GET', 
			{ 'conversationId': conversationId,'recordingId': recordingId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get recording metadata for a conversation. Does not return playable media.
	 * 
	 * @param {String} conversationId Conversation ID
	 */
	getConversationRecordingmetadata(conversationId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationRecordingmetadata';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/recordingmetadata', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get metadata for a specific recording. Does not return playable media.
	 * 
	 * @param {String} conversationId Conversation ID
	 * @param {String} recordingId Recording ID
	 */
	getConversationRecordingmetadataRecordingId(conversationId, recordingId) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationRecordingmetadataRecordingId';
		}
		// verify the required parameter 'recordingId' is set
		if (recordingId === undefined || recordingId === null) {
			throw 'Missing the required parameter "recordingId" when calling getConversationRecordingmetadataRecordingId';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/recordingmetadata/{recordingId}', 
			'GET', 
			{ 'conversationId': conversationId,'recordingId': recordingId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get all of a Conversation&#39;s Recordings.
	 * 
	 * @param {String} conversationId Conversation ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.maxWaitMs The maximum number of milliseconds to wait for the recording to be ready. Must be a positive value. (default to 5000)
	 * @param {Object} opts.formatId The desired media format. Possible values: NONE, MP3, WAV, or WEBM (default to WEBM)
	 */
	getConversationRecordings(conversationId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling getConversationRecordings';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/recordings', 
			'GET', 
			{ 'conversationId': conversationId }, 
			{ 'maxWaitMs': opts['maxWaitMs'],'formatId': opts['formatId'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets a single orphan recording
	 * 
	 * @param {String} orphanId Orphan ID
	 */
	getOrphanrecording(orphanId) { 
		// verify the required parameter 'orphanId' is set
		if (orphanId === undefined || orphanId === null) {
			throw 'Missing the required parameter "orphanId" when calling getOrphanrecording';
		}

		return this.apiClient.callApi(
			'/api/v2/orphanrecordings/{orphanId}', 
			'GET', 
			{ 'orphanId': orphanId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets the media of a single orphan recording
	 * A 202 response means the orphaned media is currently transcoding and will be available shortly.A 200 response denotes the transcoded orphan media is available now and is contained in the response body.
	 * @param {String} orphanId Orphan ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.formatId The desired media format. (default to WEBM)
	 * @param {Boolean} opts.download requesting a download format of the recording (default to false)
	 * @param {String} opts.fileName the name of the downloaded fileName
	 */
	getOrphanrecordingMedia(orphanId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'orphanId' is set
		if (orphanId === undefined || orphanId === null) {
			throw 'Missing the required parameter "orphanId" when calling getOrphanrecordingMedia';
		}

		return this.apiClient.callApi(
			'/api/v2/orphanrecordings/{orphanId}/media', 
			'GET', 
			{ 'orphanId': orphanId }, 
			{ 'formatId': opts['formatId'],'download': opts['download'],'fileName': opts['fileName'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets all orphan recordings
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 * @param {Boolean} opts.hasConversation Filter resulting orphans by whether the conversation is known. False returns all orphans for the organization. (default to false)
	 * @param {Object} opts.media Filter resulting orphans based on their media type
	 */
	getOrphanrecordings(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/orphanrecordings', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'],'hasConversation': opts['hasConversation'],'media': opts['media'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the status and results for a batch request job, only the user that submitted the job may retrieve results
	 * 
	 * @param {String} jobId jobId
	 */
	getRecordingBatchrequest(jobId) { 
		// verify the required parameter 'jobId' is set
		if (jobId === undefined || jobId === null) {
			throw 'Missing the required parameter "jobId" when calling getRecordingBatchrequest';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/batchrequests/{jobId}', 
			'GET', 
			{ 'jobId': jobId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the local encryption settings
	 * 
	 * @param {String} settingsId Settings Id
	 */
	getRecordingLocalkeysSetting(settingsId) { 
		// verify the required parameter 'settingsId' is set
		if (settingsId === undefined || settingsId === null) {
			throw 'Missing the required parameter "settingsId" when calling getRecordingLocalkeysSetting';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/localkeys/settings/{settingsId}', 
			'GET', 
			{ 'settingsId': settingsId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * gets a list local key settings data
	 * 
	 */
	getRecordingLocalkeysSettings() { 

		return this.apiClient.callApi(
			'/api/v2/recording/localkeys/settings', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets media retention policy list with query options to filter on name and enabled.
	 * for a less verbose response, add summary=true to this endpoint
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize The total page size requested (default to 25)
	 * @param {Number} opts.pageNumber The page number requested (default to 1)
	 * @param {String} opts.sortBy variable name requested to sort by
	 * @param {Array.<String>} opts.expand variable name requested by expand list
	 * @param {String} opts.nextPage next page token
	 * @param {String} opts.previousPage Previous page token
	 * @param {String} opts.name the policy name - used for filtering results in searches.
	 * @param {Boolean} opts.enabled checks to see if policy is enabled - use enabled = true or enabled = false
	 * @param {Boolean} opts.summary provides a less verbose response of policy lists. (default to false)
	 * @param {Boolean} opts.hasErrors provides a way to fetch all policies with errors or policies that do not have errors
	 */
	getRecordingMediaretentionpolicies(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/recording/mediaretentionpolicies', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'nextPage': opts['nextPage'],'previousPage': opts['previousPage'],'name': opts['name'],'enabled': opts['enabled'],'summary': opts['summary'],'hasErrors': opts['hasErrors'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a media retention policy
	 * 
	 * @param {String} policyId Policy ID
	 */
	getRecordingMediaretentionpolicy(policyId) { 
		// verify the required parameter 'policyId' is set
		if (policyId === undefined || policyId === null) {
			throw 'Missing the required parameter "policyId" when calling getRecordingMediaretentionpolicy';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/mediaretentionpolicies/{policyId}', 
			'GET', 
			{ 'policyId': policyId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get encryption key list
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getRecordingRecordingkeys(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/recording/recordingkeys', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get key rotation schedule
	 * 
	 */
	getRecordingRecordingkeysRotationschedule() { 

		return this.apiClient.callApi(
			'/api/v2/recording/recordingkeys/rotationschedule', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the Recording Settings for the Organization
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.createDefault If no settings are found, a new one is created with default values (default to false)
	 */
	getRecordingSettings(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/recording/settings', 
			'GET', 
			{  }, 
			{ 'createDefault': opts['createDefault'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieves a paged listing of screen recording sessions
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getRecordingsScreensessions(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/recordings/screensessions', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Patch a media retention policy
	 * 
	 * @param {String} policyId Policy ID
	 * @param {Object} body Policy
	 */
	patchRecordingMediaretentionpolicy(policyId, body) { 
		// verify the required parameter 'policyId' is set
		if (policyId === undefined || policyId === null) {
			throw 'Missing the required parameter "policyId" when calling patchRecordingMediaretentionpolicy';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchRecordingMediaretentionpolicy';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/mediaretentionpolicies/{policyId}', 
			'PATCH', 
			{ 'policyId': policyId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a screen recording session
	 * 
	 * @param {String} recordingSessionId Screen recording session ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	patchRecordingsScreensession(recordingSessionId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'recordingSessionId' is set
		if (recordingSessionId === undefined || recordingSessionId === null) {
			throw 'Missing the required parameter "recordingSessionId" when calling patchRecordingsScreensession';
		}

		return this.apiClient.callApi(
			'/api/v2/recordings/screensessions/{recordingSessionId}', 
			'PATCH', 
			{ 'recordingSessionId': recordingSessionId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create annotation
	 * 
	 * @param {String} conversationId Conversation ID
	 * @param {String} recordingId Recording ID
	 * @param {Object} body annotation
	 */
	postConversationRecordingAnnotations(conversationId, recordingId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling postConversationRecordingAnnotations';
		}
		// verify the required parameter 'recordingId' is set
		if (recordingId === undefined || recordingId === null) {
			throw 'Missing the required parameter "recordingId" when calling postConversationRecordingAnnotations';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postConversationRecordingAnnotations';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/recordings/{recordingId}/annotations', 
			'POST', 
			{ 'conversationId': conversationId,'recordingId': recordingId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Submit a batch download request for recordings. Recordings in response will be in their original format/codec - configured in the Trunk configuration.
	 * 
	 * @param {Object} body Job submission criteria
	 */
	postRecordingBatchrequests(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRecordingBatchrequests';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/batchrequests', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * create a local recording key
	 * 
	 * @param {Object} body Local Encryption body
	 */
	postRecordingLocalkeys(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRecordingLocalkeys';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/localkeys', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * create settings for local key creation
	 * 
	 * @param {Object} body Local Encryption Configuration
	 */
	postRecordingLocalkeysSettings(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRecordingLocalkeysSettings';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/localkeys/settings', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create media retention policy
	 * 
	 * @param {Object} body Policy
	 */
	postRecordingMediaretentionpolicies(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRecordingMediaretentionpolicies';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/mediaretentionpolicies', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create encryption key
	 * 
	 */
	postRecordingRecordingkeys() { 

		return this.apiClient.callApi(
			'/api/v2/recording/recordingkeys', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Updates the retention records on a recording.
	 * Currently supports updating and removing both archive and delete dates for eligible recordings. A request to change the archival date of an archived recording will result in a restoration of the recording until the new date set. 
	 * @param {String} conversationId Conversation ID
	 * @param {String} recordingId Recording ID
	 * @param {Object} body recording
	 */
	putConversationRecording(conversationId, recordingId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling putConversationRecording';
		}
		// verify the required parameter 'recordingId' is set
		if (recordingId === undefined || recordingId === null) {
			throw 'Missing the required parameter "recordingId" when calling putConversationRecording';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putConversationRecording';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/recordings/{recordingId}', 
			'PUT', 
			{ 'conversationId': conversationId,'recordingId': recordingId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update annotation
	 * 
	 * @param {String} conversationId Conversation ID
	 * @param {String} recordingId Recording ID
	 * @param {String} annotationId Annotation ID
	 * @param {Object} body annotation
	 */
	putConversationRecordingAnnotation(conversationId, recordingId, annotationId, body) { 
		// verify the required parameter 'conversationId' is set
		if (conversationId === undefined || conversationId === null) {
			throw 'Missing the required parameter "conversationId" when calling putConversationRecordingAnnotation';
		}
		// verify the required parameter 'recordingId' is set
		if (recordingId === undefined || recordingId === null) {
			throw 'Missing the required parameter "recordingId" when calling putConversationRecordingAnnotation';
		}
		// verify the required parameter 'annotationId' is set
		if (annotationId === undefined || annotationId === null) {
			throw 'Missing the required parameter "annotationId" when calling putConversationRecordingAnnotation';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putConversationRecordingAnnotation';
		}

		return this.apiClient.callApi(
			'/api/v2/conversations/{conversationId}/recordings/{recordingId}/annotations/{annotationId}', 
			'PUT', 
			{ 'conversationId': conversationId,'recordingId': recordingId,'annotationId': annotationId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Updates an orphan recording to a regular recording with retention values
	 * If this operation is successful the orphan will no longer exist. It will be replaced by the resulting recording in the response. This replacement recording is accessible by the normal Recording api.
	 * @param {String} orphanId Orphan ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	putOrphanrecording(orphanId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'orphanId' is set
		if (orphanId === undefined || orphanId === null) {
			throw 'Missing the required parameter "orphanId" when calling putOrphanrecording';
		}

		return this.apiClient.callApi(
			'/api/v2/orphanrecordings/{orphanId}', 
			'PUT', 
			{ 'orphanId': orphanId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the local encryption settings
	 * 
	 * @param {String} settingsId Settings Id
	 * @param {Object} body Local Encryption metadata
	 */
	putRecordingLocalkeysSetting(settingsId, body) { 
		// verify the required parameter 'settingsId' is set
		if (settingsId === undefined || settingsId === null) {
			throw 'Missing the required parameter "settingsId" when calling putRecordingLocalkeysSetting';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putRecordingLocalkeysSetting';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/localkeys/settings/{settingsId}', 
			'PUT', 
			{ 'settingsId': settingsId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a media retention policy
	 * 
	 * @param {String} policyId Policy ID
	 * @param {Object} body Policy
	 */
	putRecordingMediaretentionpolicy(policyId, body) { 
		// verify the required parameter 'policyId' is set
		if (policyId === undefined || policyId === null) {
			throw 'Missing the required parameter "policyId" when calling putRecordingMediaretentionpolicy';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putRecordingMediaretentionpolicy';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/mediaretentionpolicies/{policyId}', 
			'PUT', 
			{ 'policyId': policyId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update key rotation schedule
	 * 
	 * @param {Object} body KeyRotationSchedule
	 */
	putRecordingRecordingkeysRotationschedule(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putRecordingRecordingkeysRotationschedule';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/recordingkeys/rotationschedule', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the Recording Settings for the Organization
	 * 
	 * @param {Object} body Recording settings
	 */
	putRecordingSettings(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putRecordingSettings';
		}

		return this.apiClient.callApi(
			'/api/v2/recording/settings', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class ResponseManagementApi {
	/**
	 * ResponseManagement service.
	 * @module purecloud-platform-client-v2/api/ResponseManagementApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new ResponseManagementApi. 
	 * @alias module:purecloud-platform-client-v2/api/ResponseManagementApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete an existing response library.
	 * This will remove any responses associated with the library.
	 * @param {String} libraryId Library ID
	 */
	deleteResponsemanagementLibrary(libraryId) { 
		// verify the required parameter 'libraryId' is set
		if (libraryId === undefined || libraryId === null) {
			throw 'Missing the required parameter "libraryId" when calling deleteResponsemanagementLibrary';
		}

		return this.apiClient.callApi(
			'/api/v2/responsemanagement/libraries/{libraryId}', 
			'DELETE', 
			{ 'libraryId': libraryId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete an existing response.
	 * This will remove the response from any libraries associated with it.
	 * @param {String} responseId Response ID
	 */
	deleteResponsemanagementResponse(responseId) { 
		// verify the required parameter 'responseId' is set
		if (responseId === undefined || responseId === null) {
			throw 'Missing the required parameter "responseId" when calling deleteResponsemanagementResponse';
		}

		return this.apiClient.callApi(
			'/api/v2/responsemanagement/responses/{responseId}', 
			'DELETE', 
			{ 'responseId': responseId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets a list of existing response libraries.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 */
	getResponsemanagementLibraries(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/responsemanagement/libraries', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get details about an existing response library.
	 * 
	 * @param {String} libraryId Library ID
	 */
	getResponsemanagementLibrary(libraryId) { 
		// verify the required parameter 'libraryId' is set
		if (libraryId === undefined || libraryId === null) {
			throw 'Missing the required parameter "libraryId" when calling getResponsemanagementLibrary';
		}

		return this.apiClient.callApi(
			'/api/v2/responsemanagement/libraries/{libraryId}', 
			'GET', 
			{ 'libraryId': libraryId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get details about an existing response.
	 * 
	 * @param {String} responseId Response ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.expand Expand instructions for the return value.
	 */
	getResponsemanagementResponse(responseId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'responseId' is set
		if (responseId === undefined || responseId === null) {
			throw 'Missing the required parameter "responseId" when calling getResponsemanagementResponse';
		}

		return this.apiClient.callApi(
			'/api/v2/responsemanagement/responses/{responseId}', 
			'GET', 
			{ 'responseId': responseId }, 
			{ 'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets a list of existing responses.
	 * 
	 * @param {String} libraryId Library ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Object} opts.expand Expand instructions for the return value.
	 */
	getResponsemanagementResponses(libraryId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'libraryId' is set
		if (libraryId === undefined || libraryId === null) {
			throw 'Missing the required parameter "libraryId" when calling getResponsemanagementResponses';
		}

		return this.apiClient.callApi(
			'/api/v2/responsemanagement/responses', 
			'GET', 
			{  }, 
			{ 'libraryId': libraryId,'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a response library.
	 * 
	 * @param {Object} body Library
	 */
	postResponsemanagementLibraries(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postResponsemanagementLibraries';
		}

		return this.apiClient.callApi(
			'/api/v2/responsemanagement/libraries', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a response.
	 * 
	 * @param {Object} body Response
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.expand Expand instructions for the return value.
	 */
	postResponsemanagementResponses(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postResponsemanagementResponses';
		}

		return this.apiClient.callApi(
			'/api/v2/responsemanagement/responses', 
			'POST', 
			{  }, 
			{ 'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query responses
	 * 
	 * @param {Object} body Response
	 */
	postResponsemanagementResponsesQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postResponsemanagementResponsesQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/responsemanagement/responses/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an existing response library.
	 * Fields that can be updated: name. The most recent version is required for updates.
	 * @param {String} libraryId Library ID
	 * @param {Object} body Library
	 */
	putResponsemanagementLibrary(libraryId, body) { 
		// verify the required parameter 'libraryId' is set
		if (libraryId === undefined || libraryId === null) {
			throw 'Missing the required parameter "libraryId" when calling putResponsemanagementLibrary';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putResponsemanagementLibrary';
		}

		return this.apiClient.callApi(
			'/api/v2/responsemanagement/libraries/{libraryId}', 
			'PUT', 
			{ 'libraryId': libraryId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an existing response.
	 * Fields that can be updated: name, libraries, and texts. The most recent version is required for updates.
	 * @param {String} responseId Response ID
	 * @param {Object} body Response
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.expand Expand instructions for the return value.
	 */
	putResponsemanagementResponse(responseId, body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'responseId' is set
		if (responseId === undefined || responseId === null) {
			throw 'Missing the required parameter "responseId" when calling putResponsemanagementResponse';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putResponsemanagementResponse';
		}

		return this.apiClient.callApi(
			'/api/v2/responsemanagement/responses/{responseId}', 
			'PUT', 
			{ 'responseId': responseId }, 
			{ 'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class RoutingApi {
	/**
	 * Routing service.
	 * @module purecloud-platform-client-v2/api/RoutingApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new RoutingApi. 
	 * @alias module:purecloud-platform-client-v2/api/RoutingApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete a domain
	 * 
	 * @param {String} domainId domain ID
	 */
	deleteRoutingEmailDomain(domainId) { 
		// verify the required parameter 'domainId' is set
		if (domainId === undefined || domainId === null) {
			throw 'Missing the required parameter "domainId" when calling deleteRoutingEmailDomain';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/email/domains/{domainId}', 
			'DELETE', 
			{ 'domainId': domainId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a route
	 * 
	 * @param {String} domainName email domain
	 * @param {String} routeId route ID
	 */
	deleteRoutingEmailDomainRoute(domainName, routeId) { 
		// verify the required parameter 'domainName' is set
		if (domainName === undefined || domainName === null) {
			throw 'Missing the required parameter "domainName" when calling deleteRoutingEmailDomainRoute';
		}
		// verify the required parameter 'routeId' is set
		if (routeId === undefined || routeId === null) {
			throw 'Missing the required parameter "routeId" when calling deleteRoutingEmailDomainRoute';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/email/domains/{domainName}/routes/{routeId}', 
			'DELETE', 
			{ 'domainName': domainName,'routeId': routeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a queue
	 * 
	 * @param {String} queueId Queue ID
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.forceDelete forceDelete
	 */
	deleteRoutingQueue(queueId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling deleteRoutingQueue';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues/{queueId}', 
			'DELETE', 
			{ 'queueId': queueId }, 
			{ 'forceDelete': opts['forceDelete'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete queue member
	 * 
	 * @param {String} queueId Queue ID
	 * @param {String} memberId Member ID
	 */
	deleteRoutingQueueUser(queueId, memberId) { 
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling deleteRoutingQueueUser';
		}
		// verify the required parameter 'memberId' is set
		if (memberId === undefined || memberId === null) {
			throw 'Missing the required parameter "memberId" when calling deleteRoutingQueueUser';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues/{queueId}/users/{memberId}', 
			'DELETE', 
			{ 'queueId': queueId,'memberId': memberId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a wrap-up code from a queue
	 * 
	 * @param {String} queueId Queue ID
	 * @param {String} codeId Code ID
	 */
	deleteRoutingQueueWrapupcode(queueId, codeId) { 
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling deleteRoutingQueueWrapupcode';
		}
		// verify the required parameter 'codeId' is set
		if (codeId === undefined || codeId === null) {
			throw 'Missing the required parameter "codeId" when calling deleteRoutingQueueWrapupcode';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues/{queueId}/wrapupcodes/{codeId}', 
			'DELETE', 
			{ 'queueId': queueId,'codeId': codeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Routing Skill
	 * 
	 * @param {String} skillId Skill ID
	 */
	deleteRoutingSkill(skillId) { 
		// verify the required parameter 'skillId' is set
		if (skillId === undefined || skillId === null) {
			throw 'Missing the required parameter "skillId" when calling deleteRoutingSkill';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/skills/{skillId}', 
			'DELETE', 
			{ 'skillId': skillId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a phone number provisioned for SMS.
	 * 
	 * @param {String} addressId Address ID
	 */
	deleteRoutingSmsPhonenumber(addressId) { 
		// verify the required parameter 'addressId' is set
		if (addressId === undefined || addressId === null) {
			throw 'Missing the required parameter "addressId" when calling deleteRoutingSmsPhonenumber';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/sms/phonenumbers/{addressId}', 
			'DELETE', 
			{ 'addressId': addressId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete utilization settings and revert to system defaults.
	 * 
	 */
	deleteRoutingUtilization() { 

		return this.apiClient.callApi(
			'/api/v2/routing/utilization', 
			'DELETE', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete wrap-up code
	 * 
	 * @param {String} codeId Wrapup Code ID
	 */
	deleteRoutingWrapupcode(codeId) { 
		// verify the required parameter 'codeId' is set
		if (codeId === undefined || codeId === null) {
			throw 'Missing the required parameter "codeId" when calling deleteRoutingWrapupcode';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/wrapupcodes/{codeId}', 
			'DELETE', 
			{ 'codeId': codeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Remove routing language from user
	 * 
	 * @param {String} userId User ID
	 * @param {String} languageId languageId
	 */
	deleteUserRoutinglanguage(userId, languageId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling deleteUserRoutinglanguage';
		}
		// verify the required parameter 'languageId' is set
		if (languageId === undefined || languageId === null) {
			throw 'Missing the required parameter "languageId" when calling deleteUserRoutinglanguage';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routinglanguages/{languageId}', 
			'DELETE', 
			{ 'userId': userId,'languageId': languageId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Remove routing skill from user
	 * 
	 * @param {String} userId User ID
	 * @param {String} skillId skillId
	 */
	deleteUserRoutingskill(userId, skillId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling deleteUserRoutingskill';
		}
		// verify the required parameter 'skillId' is set
		if (skillId === undefined || skillId === null) {
			throw 'Missing the required parameter "skillId" when calling deleteUserRoutingskill';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routingskills/{skillId}', 
			'DELETE', 
			{ 'userId': userId,'skillId': skillId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get domain
	 * 
	 * @param {String} domainId domain ID
	 */
	getRoutingEmailDomain(domainId) { 
		// verify the required parameter 'domainId' is set
		if (domainId === undefined || domainId === null) {
			throw 'Missing the required parameter "domainId" when calling getRoutingEmailDomain';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/email/domains/{domainId}', 
			'GET', 
			{ 'domainId': domainId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a route
	 * 
	 * @param {String} domainName email domain
	 * @param {String} routeId route ID
	 */
	getRoutingEmailDomainRoute(domainName, routeId) { 
		// verify the required parameter 'domainName' is set
		if (domainName === undefined || domainName === null) {
			throw 'Missing the required parameter "domainName" when calling getRoutingEmailDomainRoute';
		}
		// verify the required parameter 'routeId' is set
		if (routeId === undefined || routeId === null) {
			throw 'Missing the required parameter "routeId" when calling getRoutingEmailDomainRoute';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/email/domains/{domainName}/routes/{routeId}', 
			'GET', 
			{ 'domainName': domainName,'routeId': routeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get routes
	 * 
	 * @param {String} domainName email domain
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.pattern Filter routes by the route&#39;s pattern property
	 */
	getRoutingEmailDomainRoutes(domainName, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'domainName' is set
		if (domainName === undefined || domainName === null) {
			throw 'Missing the required parameter "domainName" when calling getRoutingEmailDomainRoutes';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/email/domains/{domainName}/routes', 
			'GET', 
			{ 'domainName': domainName }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'pattern': opts['pattern'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get domains
	 * 
	 */
	getRoutingEmailDomains() { 

		return this.apiClient.callApi(
			'/api/v2/routing/email/domains', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get email setup
	 * 
	 */
	getRoutingEmailSetup() { 

		return this.apiClient.callApi(
			'/api/v2/routing/email/setup', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of supported languages.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.sortOrder Ascending or descending sort order (default to ASC)
	 * @param {String} opts.name Name
	 */
	getRoutingLanguages(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/routing/languages', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortOrder': opts['sortOrder'],'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a recipient
	 * 
	 * @param {String} recipientId Recipient ID
	 */
	getRoutingMessageRecipient(recipientId) { 
		// verify the required parameter 'recipientId' is set
		if (recipientId === undefined || recipientId === null) {
			throw 'Missing the required parameter "recipientId" when calling getRoutingMessageRecipient';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/message/recipients/{recipientId}', 
			'GET', 
			{ 'recipientId': recipientId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get recipients
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getRoutingMessageRecipients(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/routing/message/recipients', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get details about this queue.
	 * 
	 * @param {String} queueId Queue ID
	 */
	getRoutingQueue(queueId) { 
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling getRoutingQueue';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues/{queueId}', 
			'GET', 
			{ 'queueId': queueId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Estimated Wait Time
	 * 
	 * @param {String} queueId queueId
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.conversationId conversationId
	 */
	getRoutingQueueEstimatedwaittime(queueId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling getRoutingQueueEstimatedwaittime';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues/{queueId}/estimatedwaittime', 
			'GET', 
			{ 'queueId': queueId }, 
			{ 'conversationId': opts['conversationId'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Estimated Wait Time
	 * 
	 * @param {String} queueId queueId
	 * @param {String} mediaType mediaType
	 */
	getRoutingQueueMediatypeEstimatedwaittime(queueId, mediaType) { 
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling getRoutingQueueMediatypeEstimatedwaittime';
		}
		// verify the required parameter 'mediaType' is set
		if (mediaType === undefined || mediaType === null) {
			throw 'Missing the required parameter "mediaType" when calling getRoutingQueueMediatypeEstimatedwaittime';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues/{queueId}/mediatypes/{mediaType}/estimatedwaittime', 
			'GET', 
			{ 'queueId': queueId,'mediaType': mediaType }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the members of this queue
	 * 
	 * @param {String} queueId Queue ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy Sort by (default to name)
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 * @param {Boolean} opts.joined Filter by joined status
	 * @param {String} opts.name Filter by queue member name
	 * @param {Array.<String>} opts.profileSkills Filter by profile skill
	 * @param {Array.<String>} opts.skills Filter by skill
	 * @param {Array.<String>} opts.languages Filter by language
	 * @param {Array.<String>} opts.routingStatus Filter by routing status
	 * @param {Array.<String>} opts.presence Filter by presence
	 */
	getRoutingQueueUsers(queueId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling getRoutingQueueUsers';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues/{queueId}/users', 
			'GET', 
			{ 'queueId': queueId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'joined': opts['joined'],'name': opts['name'],'profileSkills': this.apiClient.buildCollectionParam(opts['profileSkills'], 'multi'),'skills': this.apiClient.buildCollectionParam(opts['skills'], 'multi'),'languages': this.apiClient.buildCollectionParam(opts['languages'], 'multi'),'routingStatus': this.apiClient.buildCollectionParam(opts['routingStatus'], 'multi'),'presence': this.apiClient.buildCollectionParam(opts['presence'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the wrap-up codes for a queue
	 * 
	 * @param {String} queueId Queue ID
	 */
	getRoutingQueueWrapupcodes(queueId) { 
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling getRoutingQueueWrapupcodes';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues/{queueId}/wrapupcodes', 
			'GET', 
			{ 'queueId': queueId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get list of queues.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy Sort by (default to name)
	 * @param {String} opts.name Name
	 * @param {Boolean} opts.active Active
	 */
	getRoutingQueues(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/routing/queues', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'name': opts['name'],'active': opts['active'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Routing Skill
	 * 
	 * @param {String} skillId Skill ID
	 */
	getRoutingSkill(skillId) { 
		// verify the required parameter 'skillId' is set
		if (skillId === undefined || skillId === null) {
			throw 'Missing the required parameter "skillId" when calling getRoutingSkill';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/skills/{skillId}', 
			'GET', 
			{ 'skillId': skillId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of routing skills.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.name Filter for results that start with this value
	 */
	getRoutingSkills(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/routing/skills', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of available phone numbers for SMS provisioning.
	 * This request will return up to 30 random phone numbers matching the criteria specified.  To get additional phone numbers repeat the request.
	 * @param {String} countryCode The ISO 3166-1 alpha-2 country code of the county for which available phone numbers should be returned
	 * @param {Object} phoneNumberType Type of available phone numbers searched
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.region Region/province/state that can be used to restrict the numbers returned
	 * @param {String} opts.city City that can be used to restrict the numbers returned
	 * @param {String} opts.areaCode Area code that can be used to restrict the numbers returned
	 * @param {String} opts.pattern A pattern to match phone numbers. Valid characters are &#39;*&#39; and [0-9a-zA-Z]. The &#39;*&#39; character will match any single digit.
	 * @param {Object} opts.addressRequirement This indicates whether the phone number requires to have an Address registered.
	 */
	getRoutingSmsAvailablephonenumbers(countryCode, phoneNumberType, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'countryCode' is set
		if (countryCode === undefined || countryCode === null) {
			throw 'Missing the required parameter "countryCode" when calling getRoutingSmsAvailablephonenumbers';
		}
		// verify the required parameter 'phoneNumberType' is set
		if (phoneNumberType === undefined || phoneNumberType === null) {
			throw 'Missing the required parameter "phoneNumberType" when calling getRoutingSmsAvailablephonenumbers';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/sms/availablephonenumbers', 
			'GET', 
			{  }, 
			{ 'countryCode': countryCode,'region': opts['region'],'city': opts['city'],'areaCode': opts['areaCode'],'phoneNumberType': phoneNumberType,'pattern': opts['pattern'],'addressRequirement': opts['addressRequirement'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a phone number provisioned for SMS.
	 * 
	 * @param {String} addressId Address ID
	 */
	getRoutingSmsPhonenumber(addressId) { 
		// verify the required parameter 'addressId' is set
		if (addressId === undefined || addressId === null) {
			throw 'Missing the required parameter "addressId" when calling getRoutingSmsPhonenumber';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/sms/phonenumbers/{addressId}', 
			'GET', 
			{ 'addressId': addressId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of provisioned phone numbers.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.phoneNumber Filter on phone number address. Allowable characters are the digits &#39;0-9&#39; and the wild card character &#39;\\*&#39;. If just digits are present, a contains search is done on the address pattern. For example, &#39;317&#39; could be matched anywhere in the address. An &#39;\\*&#39; will match multiple digits. For example, to match a specific area code within the US a pattern like &#39;1317*&#39; could be used.
	 * @param {Object} opts.phoneNumberType Filter on phone number type
	 * @param {Object} opts.phoneNumberStatus Filter on phone number status
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getRoutingSmsPhonenumbers(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/routing/sms/phonenumbers', 
			'GET', 
			{  }, 
			{ 'phoneNumber': opts['phoneNumber'],'phoneNumberType': opts['phoneNumberType'],'phoneNumberStatus': opts['phoneNumberStatus'],'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the utilization settings.
	 * 
	 */
	getRoutingUtilization() { 

		return this.apiClient.callApi(
			'/api/v2/routing/utilization', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get details about this wrap-up code.
	 * 
	 * @param {String} codeId Wrapup Code ID
	 */
	getRoutingWrapupcode(codeId) { 
		// verify the required parameter 'codeId' is set
		if (codeId === undefined || codeId === null) {
			throw 'Missing the required parameter "codeId" when calling getRoutingWrapupcode';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/wrapupcodes/{codeId}', 
			'GET', 
			{ 'codeId': codeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get list of wrapup codes.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.name Name
	 * @param {String} opts.sortBy Sort by (default to name)
	 */
	getRoutingWrapupcodes(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/routing/wrapupcodes', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'name': opts['name'],'sortBy': opts['sortBy'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List routing language for user
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.sortOrder Ascending or descending sort order (default to ASC)
	 */
	getUserRoutinglanguages(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserRoutinglanguages';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routinglanguages', 
			'GET', 
			{ 'userId': userId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List routing skills for user
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.sortOrder Ascending or descending sort order (default to ASC)
	 */
	getUserRoutingskills(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserRoutingskills';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routingskills', 
			'GET', 
			{ 'userId': userId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the ring number of joined status for a User in a Queue
	 * 
	 * @param {String} queueId Queue ID
	 * @param {String} memberId Member ID
	 * @param {Object} body Queue Member
	 */
	patchRoutingQueueUser(queueId, memberId, body) { 
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling patchRoutingQueueUser';
		}
		// verify the required parameter 'memberId' is set
		if (memberId === undefined || memberId === null) {
			throw 'Missing the required parameter "memberId" when calling patchRoutingQueueUser';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchRoutingQueueUser';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues/{queueId}/users/{memberId}', 
			'PATCH', 
			{ 'queueId': queueId,'memberId': memberId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Join or unjoin a set of users for a queue
	 * 
	 * @param {String} queueId Queue ID
	 * @param {Array.<Object>} body Queue Members
	 */
	patchRoutingQueueUsers(queueId, body) { 
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling patchRoutingQueueUsers';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchRoutingQueueUsers';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues/{queueId}/users', 
			'PATCH', 
			{ 'queueId': queueId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update routing language proficiency or state.
	 * 
	 * @param {String} userId User ID
	 * @param {String} languageId languageId
	 * @param {Object} body Language
	 */
	patchUserRoutinglanguage(userId, languageId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling patchUserRoutinglanguage';
		}
		// verify the required parameter 'languageId' is set
		if (languageId === undefined || languageId === null) {
			throw 'Missing the required parameter "languageId" when calling patchUserRoutinglanguage';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchUserRoutinglanguage';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routinglanguages/{languageId}', 
			'PATCH', 
			{ 'userId': userId,'languageId': languageId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for queue observations
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsQueuesObservationsQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsQueuesObservationsQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/queues/observations/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a route
	 * 
	 * @param {String} domainName email domain
	 * @param {Object} body Route
	 */
	postRoutingEmailDomainRoutes(domainName, body) { 
		// verify the required parameter 'domainName' is set
		if (domainName === undefined || domainName === null) {
			throw 'Missing the required parameter "domainName" when calling postRoutingEmailDomainRoutes';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRoutingEmailDomainRoutes';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/email/domains/{domainName}/routes', 
			'POST', 
			{ 'domainName': domainName }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a domain
	 * 
	 * @param {Object} body Domain
	 */
	postRoutingEmailDomains(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRoutingEmailDomains';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/email/domains', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create Language
	 * 
	 * @param {Object} body Language
	 */
	postRoutingLanguages(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRoutingLanguages';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/languages', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Bulk add or delete up to 100 queue members
	 * 
	 * @param {String} queueId Queue ID
	 * @param {Array.<Object>} body Queue Members
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts._delete True to delete queue members (default to false)
	 */
	postRoutingQueueUsers(queueId, body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling postRoutingQueueUsers';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRoutingQueueUsers';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues/{queueId}/users', 
			'POST', 
			{ 'queueId': queueId }, 
			{ 'delete': opts['_delete'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add up to 100 wrap-up codes to a queue
	 * 
	 * @param {String} queueId Queue ID
	 * @param {Array.<Object>} body List of wrapup codes
	 */
	postRoutingQueueWrapupcodes(queueId, body) { 
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling postRoutingQueueWrapupcodes';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRoutingQueueWrapupcodes';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues/{queueId}/wrapupcodes', 
			'POST', 
			{ 'queueId': queueId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create queue
	 * 
	 * @param {Object} body Queue
	 */
	postRoutingQueues(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRoutingQueues';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create Skill
	 * 
	 * @param {Object} body Skill
	 */
	postRoutingSkills(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRoutingSkills';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/skills', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Provision an Address for SMS
	 * 
	 * @param {Object} body SmsAddress
	 */
	postRoutingSmsAddresses(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRoutingSmsAddresses';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/sms/addresses', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Provision a phone number for SMS
	 * 
	 * @param {Object} body SmsPhoneNumber
	 */
	postRoutingSmsPhonenumbers(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRoutingSmsPhonenumbers';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/sms/phonenumbers', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a wrap-up code
	 * 
	 * @param {Object} body WrapupCode
	 */
	postRoutingWrapupcodes(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postRoutingWrapupcodes';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/wrapupcodes', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add routing language to user
	 * 
	 * @param {String} userId User ID
	 * @param {Object} body Language
	 */
	postUserRoutinglanguages(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling postUserRoutinglanguages';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postUserRoutinglanguages';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routinglanguages', 
			'POST', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add routing skill to user
	 * 
	 * @param {String} userId User ID
	 * @param {Object} body Skill
	 */
	postUserRoutingskills(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling postUserRoutingskills';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postUserRoutingskills';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routingskills', 
			'POST', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a route
	 * 
	 * @param {String} domainName email domain
	 * @param {String} routeId route ID
	 * @param {Object} body Route
	 */
	putRoutingEmailDomainRoute(domainName, routeId, body) { 
		// verify the required parameter 'domainName' is set
		if (domainName === undefined || domainName === null) {
			throw 'Missing the required parameter "domainName" when calling putRoutingEmailDomainRoute';
		}
		// verify the required parameter 'routeId' is set
		if (routeId === undefined || routeId === null) {
			throw 'Missing the required parameter "routeId" when calling putRoutingEmailDomainRoute';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putRoutingEmailDomainRoute';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/email/domains/{domainName}/routes/{routeId}', 
			'PUT', 
			{ 'domainName': domainName,'routeId': routeId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a recipient
	 * 
	 * @param {String} recipientId Recipient ID
	 * @param {Object} body Recipient
	 */
	putRoutingMessageRecipient(recipientId, body) { 
		// verify the required parameter 'recipientId' is set
		if (recipientId === undefined || recipientId === null) {
			throw 'Missing the required parameter "recipientId" when calling putRoutingMessageRecipient';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putRoutingMessageRecipient';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/message/recipients/{recipientId}', 
			'PUT', 
			{ 'recipientId': recipientId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a queue
	 * 
	 * @param {String} queueId Queue ID
	 * @param {Object} body Queue
	 */
	putRoutingQueue(queueId, body) { 
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling putRoutingQueue';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putRoutingQueue';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/queues/{queueId}', 
			'PUT', 
			{ 'queueId': queueId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a phone number provisioned for SMS.
	 * 
	 * @param {String} addressId Address ID
	 * @param {Object} body SmsPhoneNumber
	 */
	putRoutingSmsPhonenumber(addressId, body) { 
		// verify the required parameter 'addressId' is set
		if (addressId === undefined || addressId === null) {
			throw 'Missing the required parameter "addressId" when calling putRoutingSmsPhonenumber';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putRoutingSmsPhonenumber';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/sms/phonenumbers/{addressId}', 
			'PUT', 
			{ 'addressId': addressId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the utilization settings.
	 * 
	 * @param {Object} body utilization
	 */
	putRoutingUtilization(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putRoutingUtilization';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/utilization', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update wrap-up code
	 * 
	 * @param {String} codeId Wrapup Code ID
	 * @param {Object} body WrapupCode
	 */
	putRoutingWrapupcode(codeId, body) { 
		// verify the required parameter 'codeId' is set
		if (codeId === undefined || codeId === null) {
			throw 'Missing the required parameter "codeId" when calling putRoutingWrapupcode';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putRoutingWrapupcode';
		}

		return this.apiClient.callApi(
			'/api/v2/routing/wrapupcodes/{codeId}', 
			'PUT', 
			{ 'codeId': codeId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update routing skill proficiency or state.
	 * 
	 * @param {String} userId User ID
	 * @param {String} skillId skillId
	 * @param {Object} body Skill
	 */
	putUserRoutingskill(userId, skillId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling putUserRoutingskill';
		}
		// verify the required parameter 'skillId' is set
		if (skillId === undefined || skillId === null) {
			throw 'Missing the required parameter "skillId" when calling putUserRoutingskill';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putUserRoutingskill';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routingskills/{skillId}', 
			'PUT', 
			{ 'userId': userId,'skillId': skillId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class ScriptsApi {
	/**
	 * Scripts service.
	 * @module purecloud-platform-client-v2/api/ScriptsApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new ScriptsApi. 
	 * @alias module:purecloud-platform-client-v2/api/ScriptsApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Get a script
	 * 
	 * @param {String} scriptId Script ID
	 */
	getScript(scriptId) { 
		// verify the required parameter 'scriptId' is set
		if (scriptId === undefined || scriptId === null) {
			throw 'Missing the required parameter "scriptId" when calling getScript';
		}

		return this.apiClient.callApi(
			'/api/v2/scripts/{scriptId}', 
			'GET', 
			{ 'scriptId': scriptId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a page
	 * 
	 * @param {String} scriptId Script ID
	 * @param {String} pageId Page ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.scriptDataVersion Advanced usage - controls the data version of the script
	 */
	getScriptPage(scriptId, pageId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'scriptId' is set
		if (scriptId === undefined || scriptId === null) {
			throw 'Missing the required parameter "scriptId" when calling getScriptPage';
		}
		// verify the required parameter 'pageId' is set
		if (pageId === undefined || pageId === null) {
			throw 'Missing the required parameter "pageId" when calling getScriptPage';
		}

		return this.apiClient.callApi(
			'/api/v2/scripts/{scriptId}/pages/{pageId}', 
			'GET', 
			{ 'scriptId': scriptId,'pageId': pageId }, 
			{ 'scriptDataVersion': opts['scriptDataVersion'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of pages
	 * 
	 * @param {String} scriptId Script ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.scriptDataVersion Advanced usage - controls the data version of the script
	 */
	getScriptPages(scriptId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'scriptId' is set
		if (scriptId === undefined || scriptId === null) {
			throw 'Missing the required parameter "scriptId" when calling getScriptPages';
		}

		return this.apiClient.callApi(
			'/api/v2/scripts/{scriptId}/pages', 
			'GET', 
			{ 'scriptId': scriptId }, 
			{ 'scriptDataVersion': opts['scriptDataVersion'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of scripts
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.expand Expand
	 * @param {String} opts.name Name filter
	 * @param {String} opts.feature Feature filter
	 * @param {String} opts.flowId Secure flow id filter
	 * @param {Object} opts.sortBy SortBy
	 * @param {Object} opts.sortOrder SortOrder
	 * @param {String} opts.scriptDataVersion Advanced usage - controls the data version of the script
	 */
	getScripts(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/scripts', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'expand': opts['expand'],'name': opts['name'],'feature': opts['feature'],'flowId': opts['flowId'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'scriptDataVersion': opts['scriptDataVersion'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the published scripts.
	 * 
	 * @param {String} scriptId Script ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.expand Expand
	 * @param {String} opts.name Name filter
	 * @param {String} opts.feature Feature filter
	 * @param {String} opts.flowId Secure flow id filter
	 * @param {String} opts.scriptDataVersion Advanced usage - controls the data version of the script
	 */
	getScriptsPublished(scriptId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'scriptId' is set
		if (scriptId === undefined || scriptId === null) {
			throw 'Missing the required parameter "scriptId" when calling getScriptsPublished';
		}

		return this.apiClient.callApi(
			'/api/v2/scripts/published', 
			'GET', 
			{ 'scriptId': scriptId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'expand': opts['expand'],'name': opts['name'],'feature': opts['feature'],'flowId': opts['flowId'],'scriptDataVersion': opts['scriptDataVersion'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the published script.
	 * 
	 * @param {String} scriptId Script ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.scriptDataVersion Advanced usage - controls the data version of the script
	 */
	getScriptsPublishedScriptId(scriptId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'scriptId' is set
		if (scriptId === undefined || scriptId === null) {
			throw 'Missing the required parameter "scriptId" when calling getScriptsPublishedScriptId';
		}

		return this.apiClient.callApi(
			'/api/v2/scripts/published/{scriptId}', 
			'GET', 
			{ 'scriptId': scriptId }, 
			{ 'scriptDataVersion': opts['scriptDataVersion'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the published page.
	 * 
	 * @param {String} scriptId Script ID
	 * @param {String} pageId Page ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.scriptDataVersion Advanced usage - controls the data version of the script
	 */
	getScriptsPublishedScriptIdPage(scriptId, pageId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'scriptId' is set
		if (scriptId === undefined || scriptId === null) {
			throw 'Missing the required parameter "scriptId" when calling getScriptsPublishedScriptIdPage';
		}
		// verify the required parameter 'pageId' is set
		if (pageId === undefined || pageId === null) {
			throw 'Missing the required parameter "pageId" when calling getScriptsPublishedScriptIdPage';
		}

		return this.apiClient.callApi(
			'/api/v2/scripts/published/{scriptId}/pages/{pageId}', 
			'GET', 
			{ 'scriptId': scriptId,'pageId': pageId }, 
			{ 'scriptDataVersion': opts['scriptDataVersion'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of published pages
	 * 
	 * @param {String} scriptId Script ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.scriptDataVersion Advanced usage - controls the data version of the script
	 */
	getScriptsPublishedScriptIdPages(scriptId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'scriptId' is set
		if (scriptId === undefined || scriptId === null) {
			throw 'Missing the required parameter "scriptId" when calling getScriptsPublishedScriptIdPages';
		}

		return this.apiClient.callApi(
			'/api/v2/scripts/published/{scriptId}/pages', 
			'GET', 
			{ 'scriptId': scriptId }, 
			{ 'scriptDataVersion': opts['scriptDataVersion'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the published variables
	 * 
	 * @param {String} scriptId Script ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.input input
	 * @param {String} opts.output output
	 * @param {String} opts.type type
	 * @param {String} opts.scriptDataVersion Advanced usage - controls the data version of the script
	 */
	getScriptsPublishedScriptIdVariables(scriptId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'scriptId' is set
		if (scriptId === undefined || scriptId === null) {
			throw 'Missing the required parameter "scriptId" when calling getScriptsPublishedScriptIdVariables';
		}

		return this.apiClient.callApi(
			'/api/v2/scripts/published/{scriptId}/variables', 
			'GET', 
			{ 'scriptId': scriptId }, 
			{ 'input': opts['input'],'output': opts['output'],'type': opts['type'],'scriptDataVersion': opts['scriptDataVersion'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the upload status of an imported script
	 * 
	 * @param {String} uploadId Upload ID
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.longPoll Enable longPolling endpoint (default to false)
	 */
	getScriptsUploadStatus(uploadId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'uploadId' is set
		if (uploadId === undefined || uploadId === null) {
			throw 'Missing the required parameter "uploadId" when calling getScriptsUploadStatus';
		}

		return this.apiClient.callApi(
			'/api/v2/scripts/uploads/{uploadId}/status', 
			'GET', 
			{ 'uploadId': uploadId }, 
			{ 'longPoll': opts['longPoll'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Export a script via download service.
	 * 
	 * @param {String} scriptId Script ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postScriptExport(scriptId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'scriptId' is set
		if (scriptId === undefined || scriptId === null) {
			throw 'Missing the required parameter "scriptId" when calling postScriptExport';
		}

		return this.apiClient.callApi(
			'/api/v2/scripts/{scriptId}/export', 
			'POST', 
			{ 'scriptId': scriptId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class SearchApi {
	/**
	 * Search service.
	 * @module purecloud-platform-client-v2/api/SearchApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new SearchApi. 
	 * @alias module:purecloud-platform-client-v2/api/SearchApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Search documentation using the q64 value returned from a previous search
	 * 
	 * @param {String} q64 q64
	 */
	getDocumentationSearch(q64) { 
		// verify the required parameter 'q64' is set
		if (q64 === undefined || q64 === null) {
			throw 'Missing the required parameter "q64" when calling getDocumentationSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/documentation/search', 
			'GET', 
			{  }, 
			{ 'q64': q64 }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search groups using the q64 value returned from a previous search
	 * 
	 * @param {String} q64 q64
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand expand
	 */
	getGroupsSearch(q64, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'q64' is set
		if (q64 === undefined || q64 === null) {
			throw 'Missing the required parameter "q64" when calling getGroupsSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/search', 
			'GET', 
			{  }, 
			{ 'q64': q64,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search locations using the q64 value returned from a previous search
	 * 
	 * @param {String} q64 q64
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand expand
	 */
	getLocationsSearch(q64, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'q64' is set
		if (q64 === undefined || q64 === null) {
			throw 'Missing the required parameter "q64" when calling getLocationsSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/locations/search', 
			'GET', 
			{  }, 
			{ 'q64': q64,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search using the q64 value returned from a previous search.
	 * 
	 * @param {String} q64 q64
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 * @param {Boolean} opts.profile profile (default to true)
	 */
	getSearch(q64, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'q64' is set
		if (q64 === undefined || q64 === null) {
			throw 'Missing the required parameter "q64" when calling getSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/search', 
			'GET', 
			{  }, 
			{ 'q64': q64,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'profile': opts['profile'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Suggest resources using the q64 value returned from a previous suggest query.
	 * 
	 * @param {String} q64 q64
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 * @param {Boolean} opts.profile profile (default to true)
	 */
	getSearchSuggest(q64, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'q64' is set
		if (q64 === undefined || q64 === null) {
			throw 'Missing the required parameter "q64" when calling getSearchSuggest';
		}

		return this.apiClient.callApi(
			'/api/v2/search/suggest', 
			'GET', 
			{  }, 
			{ 'q64': q64,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'profile': opts['profile'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search users using the q64 value returned from a previous search
	 * 
	 * @param {String} q64 q64
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand expand
	 */
	getUsersSearch(q64, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'q64' is set
		if (q64 === undefined || q64 === null) {
			throw 'Missing the required parameter "q64" when calling getUsersSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/users/search', 
			'GET', 
			{  }, 
			{ 'q64': q64,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search voicemails using the q64 value returned from a previous search
	 * 
	 * @param {String} q64 q64
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand expand
	 */
	getVoicemailSearch(q64, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'q64' is set
		if (q64 === undefined || q64 === null) {
			throw 'Missing the required parameter "q64" when calling getVoicemailSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/search', 
			'GET', 
			{  }, 
			{ 'q64': q64,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search documentation
	 * 
	 * @param {Object} body Search request options
	 */
	postDocumentationSearch(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postDocumentationSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/documentation/search', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search groups
	 * 
	 * @param {Object} body Search request options
	 */
	postGroupsSearch(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postGroupsSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/groups/search', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search locations
	 * 
	 * @param {Object} body Search request options
	 */
	postLocationsSearch(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postLocationsSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/locations/search', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search resources.
	 * 
	 * @param {Object} body Search request options
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.profile profile (default to true)
	 */
	postSearch(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/search', 
			'POST', 
			{  }, 
			{ 'profile': opts['profile'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Suggest resources.
	 * 
	 * @param {Object} body Search request options
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.profile profile (default to true)
	 */
	postSearchSuggest(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postSearchSuggest';
		}

		return this.apiClient.callApi(
			'/api/v2/search/suggest', 
			'POST', 
			{  }, 
			{ 'profile': opts['profile'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search users
	 * 
	 * @param {Object} body Search request options
	 */
	postUsersSearch(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postUsersSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/users/search', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search voicemails
	 * 
	 * @param {Object} body Search request options
	 */
	postVoicemailSearch(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postVoicemailSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/search', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class StationsApi {
	/**
	 * Stations service.
	 * @module purecloud-platform-client-v2/api/StationsApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new StationsApi. 
	 * @alias module:purecloud-platform-client-v2/api/StationsApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Unassigns the user assigned to this station
	 * 
	 * @param {String} stationId Station ID
	 */
	deleteStationAssociateduser(stationId) { 
		// verify the required parameter 'stationId' is set
		if (stationId === undefined || stationId === null) {
			throw 'Missing the required parameter "stationId" when calling deleteStationAssociateduser';
		}

		return this.apiClient.callApi(
			'/api/v2/stations/{stationId}/associateduser', 
			'DELETE', 
			{ 'stationId': stationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get station.
	 * 
	 * @param {String} stationId Station ID
	 */
	getStation(stationId) { 
		// verify the required parameter 'stationId' is set
		if (stationId === undefined || stationId === null) {
			throw 'Missing the required parameter "stationId" when calling getStation';
		}

		return this.apiClient.callApi(
			'/api/v2/stations/{stationId}', 
			'GET', 
			{ 'stationId': stationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of available stations.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy Sort by (default to name)
	 * @param {String} opts.name Name
	 * @param {String} opts.userSelectable True for stations that the user can select otherwise false
	 * @param {String} opts.webRtcUserId Filter for the webRtc station of the webRtcUserId
	 * @param {String} opts.id Comma separated list of stationIds
	 * @param {String} opts.lineAppearanceId lineAppearanceId
	 */
	getStations(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/stations', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'name': opts['name'],'userSelectable': opts['userSelectable'],'webRtcUserId': opts['webRtcUserId'],'id': opts['id'],'lineAppearanceId': opts['lineAppearanceId'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an organization&#39;s StationSettings
	 * 
	 */
	getStationsSettings() { 

		return this.apiClient.callApi(
			'/api/v2/stations/settings', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Patch an organization&#39;s StationSettings
	 * 
	 * @param {Object} body Station settings
	 */
	patchStationsSettings(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchStationsSettings';
		}

		return this.apiClient.callApi(
			'/api/v2/stations/settings', 
			'PATCH', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class SuggestApi {
	/**
	 * Suggest service.
	 * @module purecloud-platform-client-v2/api/SuggestApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new SuggestApi. 
	 * @alias module:purecloud-platform-client-v2/api/SuggestApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Search using the q64 value returned from a previous search.
	 * 
	 * @param {String} q64 q64
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 * @param {Boolean} opts.profile profile (default to true)
	 */
	getSearch(q64, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'q64' is set
		if (q64 === undefined || q64 === null) {
			throw 'Missing the required parameter "q64" when calling getSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/search', 
			'GET', 
			{  }, 
			{ 'q64': q64,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'profile': opts['profile'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Suggest resources using the q64 value returned from a previous suggest query.
	 * 
	 * @param {String} q64 q64
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 * @param {Boolean} opts.profile profile (default to true)
	 */
	getSearchSuggest(q64, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'q64' is set
		if (q64 === undefined || q64 === null) {
			throw 'Missing the required parameter "q64" when calling getSearchSuggest';
		}

		return this.apiClient.callApi(
			'/api/v2/search/suggest', 
			'GET', 
			{  }, 
			{ 'q64': q64,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'profile': opts['profile'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search resources.
	 * 
	 * @param {Object} body Search request options
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.profile profile (default to true)
	 */
	postSearch(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/search', 
			'POST', 
			{  }, 
			{ 'profile': opts['profile'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Suggest resources.
	 * 
	 * @param {Object} body Search request options
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.profile profile (default to true)
	 */
	postSearchSuggest(body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postSearchSuggest';
		}

		return this.apiClient.callApi(
			'/api/v2/search/suggest', 
			'POST', 
			{  }, 
			{ 'profile': opts['profile'] }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class TelephonyProvidersEdgeApi {
	/**
	 * TelephonyProvidersEdge service.
	 * @module purecloud-platform-client-v2/api/TelephonyProvidersEdgeApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new TelephonyProvidersEdgeApi. 
	 * @alias module:purecloud-platform-client-v2/api/TelephonyProvidersEdgeApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete a edge.
	 * 
	 * @param {String} edgeId Edge ID
	 */
	deleteTelephonyProvidersEdge(edgeId) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling deleteTelephonyProvidersEdge';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}', 
			'DELETE', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete an edge logical interface
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {String} interfaceId Interface ID
	 */
	deleteTelephonyProvidersEdgeLogicalinterface(edgeId, interfaceId) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling deleteTelephonyProvidersEdgeLogicalinterface';
		}
		// verify the required parameter 'interfaceId' is set
		if (interfaceId === undefined || interfaceId === null) {
			throw 'Missing the required parameter "interfaceId" when calling deleteTelephonyProvidersEdgeLogicalinterface';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/logicalinterfaces/{interfaceId}', 
			'DELETE', 
			{ 'edgeId': edgeId,'interfaceId': interfaceId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Cancels any in-progress update for this edge.
	 * 
	 * @param {String} edgeId Edge ID
	 */
	deleteTelephonyProvidersEdgeSoftwareupdate(edgeId) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling deleteTelephonyProvidersEdgeSoftwareupdate';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/softwareupdate', 
			'DELETE', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a certificate authority.
	 * 
	 * @param {String} certificateId Certificate ID
	 */
	deleteTelephonyProvidersEdgesCertificateauthority(certificateId) { 
		// verify the required parameter 'certificateId' is set
		if (certificateId === undefined || certificateId === null) {
			throw 'Missing the required parameter "certificateId" when calling deleteTelephonyProvidersEdgesCertificateauthority';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/certificateauthorities/{certificateId}', 
			'DELETE', 
			{ 'certificateId': certificateId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a DID Pool by ID.
	 * 
	 * @param {String} didPoolId DID pool ID
	 */
	deleteTelephonyProvidersEdgesDidpool(didPoolId) { 
		// verify the required parameter 'didPoolId' is set
		if (didPoolId === undefined || didPoolId === null) {
			throw 'Missing the required parameter "didPoolId" when calling deleteTelephonyProvidersEdgesDidpool';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/didpools/{didPoolId}', 
			'DELETE', 
			{ 'didPoolId': didPoolId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete an edge group.
	 * 
	 * @param {String} edgeGroupId Edge group ID
	 */
	deleteTelephonyProvidersEdgesEdgegroup(edgeGroupId) { 
		// verify the required parameter 'edgeGroupId' is set
		if (edgeGroupId === undefined || edgeGroupId === null) {
			throw 'Missing the required parameter "edgeGroupId" when calling deleteTelephonyProvidersEdgesEdgegroup';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/edgegroups/{edgeGroupId}', 
			'DELETE', 
			{ 'edgeGroupId': edgeGroupId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete endpoint
	 * 
	 * @param {String} endpointId Endpoint ID
	 */
	deleteTelephonyProvidersEdgesEndpoint(endpointId) { 
		// verify the required parameter 'endpointId' is set
		if (endpointId === undefined || endpointId === null) {
			throw 'Missing the required parameter "endpointId" when calling deleteTelephonyProvidersEdgesEndpoint';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/endpoints/{endpointId}', 
			'DELETE', 
			{ 'endpointId': endpointId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete an extension pool by ID
	 * 
	 * @param {String} extensionPoolId Extension pool ID
	 */
	deleteTelephonyProvidersEdgesExtensionpool(extensionPoolId) { 
		// verify the required parameter 'extensionPoolId' is set
		if (extensionPoolId === undefined || extensionPoolId === null) {
			throw 'Missing the required parameter "extensionPoolId" when calling deleteTelephonyProvidersEdgesExtensionpool';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/extensionpools/{extensionPoolId}', 
			'DELETE', 
			{ 'extensionPoolId': extensionPoolId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Outbound Route
	 * 
	 * @param {String} outboundRouteId Outbound route ID
	 */
	deleteTelephonyProvidersEdgesOutboundroute(outboundRouteId) { 
		// verify the required parameter 'outboundRouteId' is set
		if (outboundRouteId === undefined || outboundRouteId === null) {
			throw 'Missing the required parameter "outboundRouteId" when calling deleteTelephonyProvidersEdgesOutboundroute';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/outboundroutes/{outboundRouteId}', 
			'DELETE', 
			{ 'outboundRouteId': outboundRouteId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a Phone by ID
	 * 
	 * @param {String} phoneId Phone ID
	 */
	deleteTelephonyProvidersEdgesPhone(phoneId) { 
		// verify the required parameter 'phoneId' is set
		if (phoneId === undefined || phoneId === null) {
			throw 'Missing the required parameter "phoneId" when calling deleteTelephonyProvidersEdgesPhone';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phones/{phoneId}', 
			'DELETE', 
			{ 'phoneId': phoneId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a Phone Base Settings by ID
	 * 
	 * @param {String} phoneBaseId Phone base ID
	 */
	deleteTelephonyProvidersEdgesPhonebasesetting(phoneBaseId) { 
		// verify the required parameter 'phoneBaseId' is set
		if (phoneBaseId === undefined || phoneBaseId === null) {
			throw 'Missing the required parameter "phoneBaseId" when calling deleteTelephonyProvidersEdgesPhonebasesetting';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phonebasesettings/{phoneBaseId}', 
			'DELETE', 
			{ 'phoneBaseId': phoneBaseId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a Site by ID
	 * 
	 * @param {String} siteId Site ID
	 */
	deleteTelephonyProvidersEdgesSite(siteId) { 
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling deleteTelephonyProvidersEdgesSite';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}', 
			'DELETE', 
			{ 'siteId': siteId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete Outbound Route
	 * 
	 * @param {String} siteId Site ID
	 * @param {String} outboundRouteId Outbound route ID
	 */
	deleteTelephonyProvidersEdgesSiteOutboundroute(siteId, outboundRouteId) { 
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling deleteTelephonyProvidersEdgesSiteOutboundroute';
		}
		// verify the required parameter 'outboundRouteId' is set
		if (outboundRouteId === undefined || outboundRouteId === null) {
			throw 'Missing the required parameter "outboundRouteId" when calling deleteTelephonyProvidersEdgesSiteOutboundroute';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}/outboundroutes/{outboundRouteId}', 
			'DELETE', 
			{ 'siteId': siteId,'outboundRouteId': outboundRouteId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete a Trunk Base Settings object by ID
	 * 
	 * @param {String} trunkBaseSettingsId Trunk Base ID
	 */
	deleteTelephonyProvidersEdgesTrunkbasesetting(trunkBaseSettingsId) { 
		// verify the required parameter 'trunkBaseSettingsId' is set
		if (trunkBaseSettingsId === undefined || trunkBaseSettingsId === null) {
			throw 'Missing the required parameter "trunkBaseSettingsId" when calling deleteTelephonyProvidersEdgesTrunkbasesetting';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/trunkbasesettings/{trunkBaseSettingsId}', 
			'DELETE', 
			{ 'trunkBaseSettingsId': trunkBaseSettingsId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Lists available schema categories (Deprecated)
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getConfigurationSchemasEdgesVnext(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/configuration/schemas/edges/vnext', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List schemas of a specific category (Deprecated)
	 * 
	 * @param {String} schemaCategory Schema category
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getConfigurationSchemasEdgesVnextSchemaCategory(schemaCategory, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'schemaCategory' is set
		if (schemaCategory === undefined || schemaCategory === null) {
			throw 'Missing the required parameter "schemaCategory" when calling getConfigurationSchemasEdgesVnextSchemaCategory';
		}

		return this.apiClient.callApi(
			'/api/v2/configuration/schemas/edges/vnext/{schemaCategory}', 
			'GET', 
			{ 'schemaCategory': schemaCategory }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List schemas of a specific category (Deprecated)
	 * 
	 * @param {String} schemaCategory Schema category
	 * @param {String} schemaType Schema type
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getConfigurationSchemasEdgesVnextSchemaCategorySchemaType(schemaCategory, schemaType, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'schemaCategory' is set
		if (schemaCategory === undefined || schemaCategory === null) {
			throw 'Missing the required parameter "schemaCategory" when calling getConfigurationSchemasEdgesVnextSchemaCategorySchemaType';
		}
		// verify the required parameter 'schemaType' is set
		if (schemaType === undefined || schemaType === null) {
			throw 'Missing the required parameter "schemaType" when calling getConfigurationSchemasEdgesVnextSchemaCategorySchemaType';
		}

		return this.apiClient.callApi(
			'/api/v2/configuration/schemas/edges/vnext/{schemaCategory}/{schemaType}', 
			'GET', 
			{ 'schemaCategory': schemaCategory,'schemaType': schemaType }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a json schema (Deprecated)
	 * 
	 * @param {String} schemaCategory Schema category
	 * @param {String} schemaType Schema type
	 * @param {String} schemaId Schema ID
	 */
	getConfigurationSchemasEdgesVnextSchemaCategorySchemaTypeSchemaId(schemaCategory, schemaType, schemaId) { 
		// verify the required parameter 'schemaCategory' is set
		if (schemaCategory === undefined || schemaCategory === null) {
			throw 'Missing the required parameter "schemaCategory" when calling getConfigurationSchemasEdgesVnextSchemaCategorySchemaTypeSchemaId';
		}
		// verify the required parameter 'schemaType' is set
		if (schemaType === undefined || schemaType === null) {
			throw 'Missing the required parameter "schemaType" when calling getConfigurationSchemasEdgesVnextSchemaCategorySchemaTypeSchemaId';
		}
		// verify the required parameter 'schemaId' is set
		if (schemaId === undefined || schemaId === null) {
			throw 'Missing the required parameter "schemaId" when calling getConfigurationSchemasEdgesVnextSchemaCategorySchemaTypeSchemaId';
		}

		return this.apiClient.callApi(
			'/api/v2/configuration/schemas/edges/vnext/{schemaCategory}/{schemaType}/{schemaId}', 
			'GET', 
			{ 'schemaCategory': schemaCategory,'schemaType': schemaType,'schemaId': schemaId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get metadata for a schema (Deprecated)
	 * 
	 * @param {String} schemaCategory Schema category
	 * @param {String} schemaType Schema type
	 * @param {String} schemaId Schema ID
	 * @param {String} extensionType extension
	 * @param {String} metadataId Metadata ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.type Type
	 */
	getConfigurationSchemasEdgesVnextSchemaCategorySchemaTypeSchemaIdExtensionTypeMetadataId(schemaCategory, schemaType, schemaId, extensionType, metadataId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'schemaCategory' is set
		if (schemaCategory === undefined || schemaCategory === null) {
			throw 'Missing the required parameter "schemaCategory" when calling getConfigurationSchemasEdgesVnextSchemaCategorySchemaTypeSchemaIdExtensionTypeMetadataId';
		}
		// verify the required parameter 'schemaType' is set
		if (schemaType === undefined || schemaType === null) {
			throw 'Missing the required parameter "schemaType" when calling getConfigurationSchemasEdgesVnextSchemaCategorySchemaTypeSchemaIdExtensionTypeMetadataId';
		}
		// verify the required parameter 'schemaId' is set
		if (schemaId === undefined || schemaId === null) {
			throw 'Missing the required parameter "schemaId" when calling getConfigurationSchemasEdgesVnextSchemaCategorySchemaTypeSchemaIdExtensionTypeMetadataId';
		}
		// verify the required parameter 'extensionType' is set
		if (extensionType === undefined || extensionType === null) {
			throw 'Missing the required parameter "extensionType" when calling getConfigurationSchemasEdgesVnextSchemaCategorySchemaTypeSchemaIdExtensionTypeMetadataId';
		}
		// verify the required parameter 'metadataId' is set
		if (metadataId === undefined || metadataId === null) {
			throw 'Missing the required parameter "metadataId" when calling getConfigurationSchemasEdgesVnextSchemaCategorySchemaTypeSchemaIdExtensionTypeMetadataId';
		}

		return this.apiClient.callApi(
			'/api/v2/configuration/schemas/edges/vnext/{schemaCategory}/{schemaType}/{schemaId}/{extensionType}/{metadataId}', 
			'GET', 
			{ 'schemaCategory': schemaCategory,'schemaType': schemaType,'schemaId': schemaId,'extensionType': extensionType,'metadataId': metadataId }, 
			{ 'type': opts['type'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get edge.
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Fields to expand in the response, comma-separated
	 */
	getTelephonyProvidersEdge(edgeId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling getTelephonyProvidersEdge';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}', 
			'GET', 
			{ 'edgeId': edgeId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get line
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {String} lineId Line ID
	 */
	getTelephonyProvidersEdgeLine(edgeId, lineId) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling getTelephonyProvidersEdgeLine';
		}
		// verify the required parameter 'lineId' is set
		if (lineId === undefined || lineId === null) {
			throw 'Missing the required parameter "lineId" when calling getTelephonyProvidersEdgeLine';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/lines/{lineId}', 
			'GET', 
			{ 'edgeId': edgeId,'lineId': lineId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of lines.
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getTelephonyProvidersEdgeLines(edgeId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling getTelephonyProvidersEdgeLines';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/lines', 
			'GET', 
			{ 'edgeId': edgeId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an edge logical interface
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {String} interfaceId Interface ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Field to expand in the response
	 */
	getTelephonyProvidersEdgeLogicalinterface(edgeId, interfaceId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling getTelephonyProvidersEdgeLogicalinterface';
		}
		// verify the required parameter 'interfaceId' is set
		if (interfaceId === undefined || interfaceId === null) {
			throw 'Missing the required parameter "interfaceId" when calling getTelephonyProvidersEdgeLogicalinterface';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/logicalinterfaces/{interfaceId}', 
			'GET', 
			{ 'edgeId': edgeId,'interfaceId': interfaceId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get edge logical interfaces.
	 * Retrieve a list of all configured logical interfaces from a specific edge.
	 * @param {String} edgeId Edge ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Field to expand in the response
	 */
	getTelephonyProvidersEdgeLogicalinterfaces(edgeId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling getTelephonyProvidersEdgeLogicalinterfaces';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/logicalinterfaces', 
			'GET', 
			{ 'edgeId': edgeId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an Edge logs job.
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {String} jobId Job ID
	 */
	getTelephonyProvidersEdgeLogsJob(edgeId, jobId) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling getTelephonyProvidersEdgeLogsJob';
		}
		// verify the required parameter 'jobId' is set
		if (jobId === undefined || jobId === null) {
			throw 'Missing the required parameter "jobId" when calling getTelephonyProvidersEdgeLogsJob';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/logs/jobs/{jobId}', 
			'GET', 
			{ 'edgeId': edgeId,'jobId': jobId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the edge metrics.
	 * 
	 * @param {String} edgeId Edge Id
	 */
	getTelephonyProvidersEdgeMetrics(edgeId) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling getTelephonyProvidersEdgeMetrics';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/metrics', 
			'GET', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get edge physical interface.
	 * Retrieve a physical interface from a specific edge.
	 * @param {String} edgeId Edge ID
	 * @param {String} interfaceId Interface ID
	 */
	getTelephonyProvidersEdgePhysicalinterface(edgeId, interfaceId) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling getTelephonyProvidersEdgePhysicalinterface';
		}
		// verify the required parameter 'interfaceId' is set
		if (interfaceId === undefined || interfaceId === null) {
			throw 'Missing the required parameter "interfaceId" when calling getTelephonyProvidersEdgePhysicalinterface';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/physicalinterfaces/{interfaceId}', 
			'GET', 
			{ 'edgeId': edgeId,'interfaceId': interfaceId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Retrieve a list of all configured physical interfaces from a specific edge.
	 * 
	 * @param {String} edgeId Edge ID
	 */
	getTelephonyProvidersEdgePhysicalinterfaces(edgeId) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling getTelephonyProvidersEdgePhysicalinterfaces';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/physicalinterfaces', 
			'GET', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the setup package for a locally deployed edge device. This is needed to complete the setup process for the virtual edge.
	 * 
	 * @param {String} edgeId Edge ID
	 */
	getTelephonyProvidersEdgeSetuppackage(edgeId) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling getTelephonyProvidersEdgeSetuppackage';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/setuppackage', 
			'GET', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets software update status information about any edge.
	 * 
	 * @param {String} edgeId Edge ID
	 */
	getTelephonyProvidersEdgeSoftwareupdate(edgeId) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling getTelephonyProvidersEdgeSoftwareupdate';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/softwareupdate', 
			'GET', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets all the available software versions for this edge.
	 * 
	 * @param {String} edgeId Edge ID
	 */
	getTelephonyProvidersEdgeSoftwareversions(edgeId) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling getTelephonyProvidersEdgeSoftwareversions';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/softwareversions', 
			'GET', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of available trunks for the given Edge.
	 * Trunks are created by assigning trunk base settings to an Edge or Edge Group.
	 * @param {String} edgeId Edge ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortBy Value by which to sort (default to name)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 * @param {String} opts.trunkBaseId Filter by Trunk Base Ids
	 * @param {Object} opts.trunkType Filter by a Trunk type
	 */
	getTelephonyProvidersEdgeTrunks(edgeId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling getTelephonyProvidersEdgeTrunks';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/trunks', 
			'GET', 
			{ 'edgeId': edgeId }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'trunkBase.id': opts['trunkBaseId'],'trunkType': opts['trunkType'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of edges.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.name Name
	 * @param {String} opts.siteId Filter by site.id
	 * @param {String} opts.edgeGroupId Filter by edgeGroup.id
	 * @param {String} opts.sortBy Sort by (default to name)
	 * @param {Boolean} opts.managed Filter by managed
	 */
	getTelephonyProvidersEdges(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'name': opts['name'],'site.id': opts['siteId'],'edgeGroup.id': opts['edgeGroupId'],'sortBy': opts['sortBy'],'managed': opts['managed'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of available languages.
	 * 
	 */
	getTelephonyProvidersEdgesAvailablelanguages() { 

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/availablelanguages', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of certificate authorities.
	 * 
	 */
	getTelephonyProvidersEdgesCertificateauthorities() { 

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/certificateauthorities', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a certificate authority.
	 * 
	 * @param {String} certificateId Certificate ID
	 */
	getTelephonyProvidersEdgesCertificateauthority(certificateId) { 
		// verify the required parameter 'certificateId' is set
		if (certificateId === undefined || certificateId === null) {
			throw 'Missing the required parameter "certificateId" when calling getTelephonyProvidersEdgesCertificateauthority';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/certificateauthorities/{certificateId}', 
			'GET', 
			{ 'certificateId': certificateId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a DID by ID.
	 * 
	 * @param {String} didId DID ID
	 */
	getTelephonyProvidersEdgesDid(didId) { 
		// verify the required parameter 'didId' is set
		if (didId === undefined || didId === null) {
			throw 'Missing the required parameter "didId" when calling getTelephonyProvidersEdgesDid';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/dids/{didId}', 
			'GET', 
			{ 'didId': didId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a DID Pool by ID.
	 * 
	 * @param {String} didPoolId DID pool ID
	 */
	getTelephonyProvidersEdgesDidpool(didPoolId) { 
		// verify the required parameter 'didPoolId' is set
		if (didPoolId === undefined || didPoolId === null) {
			throw 'Missing the required parameter "didPoolId" when calling getTelephonyProvidersEdgesDidpool';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/didpools/{didPoolId}', 
			'GET', 
			{ 'didPoolId': didPoolId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a listing of DID Pools
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy Sort by (default to number)
	 */
	getTelephonyProvidersEdgesDidpools(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/didpools', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a listing of DIDs
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy Sort by (default to number)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 * @param {String} opts.phoneNumber Filter by phoneNumber
	 */
	getTelephonyProvidersEdgesDids(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/dids', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'phoneNumber': opts['phoneNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get edge group.
	 * 
	 * @param {String} edgeGroupId Edge group ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Fields to expand in the response
	 */
	getTelephonyProvidersEdgesEdgegroup(edgeGroupId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'edgeGroupId' is set
		if (edgeGroupId === undefined || edgeGroupId === null) {
			throw 'Missing the required parameter "edgeGroupId" when calling getTelephonyProvidersEdgesEdgegroup';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/edgegroups/{edgeGroupId}', 
			'GET', 
			{ 'edgeGroupId': edgeGroupId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets the edge trunk base associated with the edge group
	 * 
	 * @param {String} edgegroupId Edge Group ID
	 * @param {String} edgetrunkbaseId Edge Trunk Base ID
	 */
	getTelephonyProvidersEdgesEdgegroupEdgetrunkbase(edgegroupId, edgetrunkbaseId) { 
		// verify the required parameter 'edgegroupId' is set
		if (edgegroupId === undefined || edgegroupId === null) {
			throw 'Missing the required parameter "edgegroupId" when calling getTelephonyProvidersEdgesEdgegroupEdgetrunkbase';
		}
		// verify the required parameter 'edgetrunkbaseId' is set
		if (edgetrunkbaseId === undefined || edgetrunkbaseId === null) {
			throw 'Missing the required parameter "edgetrunkbaseId" when calling getTelephonyProvidersEdgesEdgegroupEdgetrunkbase';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/edgegroups/{edgegroupId}/edgetrunkbases/{edgetrunkbaseId}', 
			'GET', 
			{ 'edgegroupId': edgegroupId,'edgetrunkbaseId': edgetrunkbaseId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of edge groups.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.name Name
	 * @param {String} opts.sortBy Sort by (default to name)
	 * @param {Boolean} opts.managed Filter by managed
	 */
	getTelephonyProvidersEdgesEdgegroups(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/edgegroups', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'name': opts['name'],'sortBy': opts['sortBy'],'managed': opts['managed'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the edge version report.
	 * The report will not have consistent data about the edge version(s) until all edges have been reset.
	 */
	getTelephonyProvidersEdgesEdgeversionreport() { 

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/edgeversionreport', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get endpoint
	 * 
	 * @param {String} endpointId Endpoint ID
	 */
	getTelephonyProvidersEdgesEndpoint(endpointId) { 
		// verify the required parameter 'endpointId' is set
		if (endpointId === undefined || endpointId === null) {
			throw 'Missing the required parameter "endpointId" when calling getTelephonyProvidersEdgesEndpoint';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/endpoints/{endpointId}', 
			'GET', 
			{ 'endpointId': endpointId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get endpoints
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.name Name
	 * @param {String} opts.sortBy Sort by (default to name)
	 */
	getTelephonyProvidersEdgesEndpoints(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/endpoints', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'name': opts['name'],'sortBy': opts['sortBy'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an extension by ID.
	 * 
	 * @param {String} extensionId Extension ID
	 */
	getTelephonyProvidersEdgesExtension(extensionId) { 
		// verify the required parameter 'extensionId' is set
		if (extensionId === undefined || extensionId === null) {
			throw 'Missing the required parameter "extensionId" when calling getTelephonyProvidersEdgesExtension';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/extensions/{extensionId}', 
			'GET', 
			{ 'extensionId': extensionId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an extension pool by ID
	 * 
	 * @param {String} extensionPoolId Extension pool ID
	 */
	getTelephonyProvidersEdgesExtensionpool(extensionPoolId) { 
		// verify the required parameter 'extensionPoolId' is set
		if (extensionPoolId === undefined || extensionPoolId === null) {
			throw 'Missing the required parameter "extensionPoolId" when calling getTelephonyProvidersEdgesExtensionpool';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/extensionpools/{extensionPoolId}', 
			'GET', 
			{ 'extensionPoolId': extensionPoolId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a listing of extension pools
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy Sort by (default to startNumber)
	 * @param {String} opts._number Number
	 */
	getTelephonyProvidersEdgesExtensionpools(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/extensionpools', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'number': opts['_number'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a listing of extensions
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy Sort by (default to number)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 * @param {String} opts._number Filter by number
	 */
	getTelephonyProvidersEdgesExtensions(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/extensions', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'number': opts['_number'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Line by ID
	 * 
	 * @param {String} lineId Line ID
	 */
	getTelephonyProvidersEdgesLine(lineId) { 
		// verify the required parameter 'lineId' is set
		if (lineId === undefined || lineId === null) {
			throw 'Missing the required parameter "lineId" when calling getTelephonyProvidersEdgesLine';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/lines/{lineId}', 
			'GET', 
			{ 'lineId': lineId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a line base settings object by ID
	 * 
	 * @param {String} lineBaseId Line base ID
	 */
	getTelephonyProvidersEdgesLinebasesetting(lineBaseId) { 
		// verify the required parameter 'lineBaseId' is set
		if (lineBaseId === undefined || lineBaseId === null) {
			throw 'Missing the required parameter "lineBaseId" when calling getTelephonyProvidersEdgesLinebasesetting';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/linebasesettings/{lineBaseId}', 
			'GET', 
			{ 'lineBaseId': lineBaseId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a listing of line base settings objects
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortBy Value by which to sort (default to name)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 */
	getTelephonyProvidersEdgesLinebasesettings(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/linebasesettings', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of Lines
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.name Name
	 * @param {String} opts.sortBy Value by which to sort (default to name)
	 * @param {Array.<String>} opts.expand Fields to expand in the response, comma-separated
	 */
	getTelephonyProvidersEdgesLines(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/lines', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'name': opts['name'],'sortBy': opts['sortBy'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Line instance template based on a Line Base Settings object. This object can then be modified and saved as a new Line instance
	 * 
	 * @param {String} lineBaseSettingsId The id of a Line Base Settings object upon which to base this Line
	 */
	getTelephonyProvidersEdgesLinesTemplate(lineBaseSettingsId) { 
		// verify the required parameter 'lineBaseSettingsId' is set
		if (lineBaseSettingsId === undefined || lineBaseSettingsId === null) {
			throw 'Missing the required parameter "lineBaseSettingsId" when calling getTelephonyProvidersEdgesLinesTemplate';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/lines/template', 
			'GET', 
			{  }, 
			{ 'lineBaseSettingsId': lineBaseSettingsId }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get edge logical interfaces.
	 * Retrieve the configured logical interfaces for a list edges. Only 100 edges can be requested at a time.
	 * @param {String} edgeIds Comma separated list of Edge Id&#39;s
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Field to expand in the response
	 */
	getTelephonyProvidersEdgesLogicalinterfaces(edgeIds, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'edgeIds' is set
		if (edgeIds === undefined || edgeIds === null) {
			throw 'Missing the required parameter "edgeIds" when calling getTelephonyProvidersEdgesLogicalinterfaces';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/logicalinterfaces', 
			'GET', 
			{  }, 
			{ 'edgeIds': edgeIds,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the metrics for a list of edges.
	 * 
	 * @param {String} edgeIds Comma separated list of Edge Id&#39;s
	 */
	getTelephonyProvidersEdgesMetrics(edgeIds) { 
		// verify the required parameter 'edgeIds' is set
		if (edgeIds === undefined || edgeIds === null) {
			throw 'Missing the required parameter "edgeIds" when calling getTelephonyProvidersEdgesMetrics';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/metrics', 
			'GET', 
			{  }, 
			{ 'edgeIds': edgeIds }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get outbound route
	 * 
	 * @param {String} outboundRouteId Outbound route ID
	 */
	getTelephonyProvidersEdgesOutboundroute(outboundRouteId) { 
		// verify the required parameter 'outboundRouteId' is set
		if (outboundRouteId === undefined || outboundRouteId === null) {
			throw 'Missing the required parameter "outboundRouteId" when calling getTelephonyProvidersEdgesOutboundroute';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/outboundroutes/{outboundRouteId}', 
			'GET', 
			{ 'outboundRouteId': outboundRouteId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get outbound routes
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.name Name
	 * @param {String} opts.siteId Filter by site.id
	 * @param {String} opts.sortBy Sort by (default to name)
	 */
	getTelephonyProvidersEdgesOutboundroutes(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/outboundroutes', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'name': opts['name'],'site.id': opts['siteId'],'sortBy': opts['sortBy'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Phone by ID
	 * 
	 * @param {String} phoneId Phone ID
	 */
	getTelephonyProvidersEdgesPhone(phoneId) { 
		// verify the required parameter 'phoneId' is set
		if (phoneId === undefined || phoneId === null) {
			throw 'Missing the required parameter "phoneId" when calling getTelephonyProvidersEdgesPhone';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phones/{phoneId}', 
			'GET', 
			{ 'phoneId': phoneId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Phone Base Settings object by ID
	 * 
	 * @param {String} phoneBaseId Phone base ID
	 */
	getTelephonyProvidersEdgesPhonebasesetting(phoneBaseId) { 
		// verify the required parameter 'phoneBaseId' is set
		if (phoneBaseId === undefined || phoneBaseId === null) {
			throw 'Missing the required parameter "phoneBaseId" when calling getTelephonyProvidersEdgesPhonebasesetting';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phonebasesettings/{phoneBaseId}', 
			'GET', 
			{ 'phoneBaseId': phoneBaseId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of Phone Base Settings objects
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy Value by which to sort (default to name)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 * @param {Array.<String>} opts.expand Fields to expand in the response, comma-separated
	 * @param {String} opts.name Name
	 */
	getTelephonyProvidersEdgesPhonebasesettings(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phonebasesettings', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of available makes and models to create a new Phone Base Settings
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getTelephonyProvidersEdgesPhonebasesettingsAvailablemetabases(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phonebasesettings/availablemetabases', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Phone Base Settings instance template from a given make and model. This object can then be modified and saved as a new Phone Base Settings instance
	 * 
	 * @param {String} phoneMetabaseId The id of a metabase object upon which to base this Phone Base Settings
	 */
	getTelephonyProvidersEdgesPhonebasesettingsTemplate(phoneMetabaseId) { 
		// verify the required parameter 'phoneMetabaseId' is set
		if (phoneMetabaseId === undefined || phoneMetabaseId === null) {
			throw 'Missing the required parameter "phoneMetabaseId" when calling getTelephonyProvidersEdgesPhonebasesettingsTemplate';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phonebasesettings/template', 
			'GET', 
			{  }, 
			{ 'phoneMetabaseId': phoneMetabaseId }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of Phone Instances
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortBy Value by which to sort (default to name)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 * @param {String} opts.siteId Filter by site.id
	 * @param {String} opts.webRtcUserId Filter by webRtcUser.id
	 * @param {String} opts.phoneBaseSettingsId Filter by phoneBaseSettings.id
	 * @param {String} opts.linesLoggedInUserId Filter by lines.loggedInUser.id
	 * @param {String} opts.linesDefaultForUserId Filter by lines.defaultForUser.id
	 * @param {String} opts.phoneHardwareId Filter by phone_hardwareId
	 * @param {String} opts.linesId Filter by lines.id
	 * @param {String} opts.linesName Filter by lines.name
	 * @param {Array.<String>} opts.expand Fields to expand in the response, comma-separated
	 * @param {Array.<String>} opts.fields Fields and properties to get, comma-separated
	 */
	getTelephonyProvidersEdgesPhones(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phones', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'site.id': opts['siteId'],'webRtcUser.id': opts['webRtcUserId'],'phoneBaseSettings.id': opts['phoneBaseSettingsId'],'lines.loggedInUser.id': opts['linesLoggedInUserId'],'lines.defaultForUser.id': opts['linesDefaultForUserId'],'phone_hardwareId': opts['phoneHardwareId'],'lines.id': opts['linesId'],'lines.name': opts['linesName'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'fields': this.apiClient.buildCollectionParam(opts['fields'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Phone instance template based on a Phone Base Settings object. This object can then be modified and saved as a new Phone instance
	 * 
	 * @param {String} phoneBaseSettingsId The id of a Phone Base Settings object upon which to base this Phone
	 */
	getTelephonyProvidersEdgesPhonesTemplate(phoneBaseSettingsId) { 
		// verify the required parameter 'phoneBaseSettingsId' is set
		if (phoneBaseSettingsId === undefined || phoneBaseSettingsId === null) {
			throw 'Missing the required parameter "phoneBaseSettingsId" when calling getTelephonyProvidersEdgesPhonesTemplate';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phones/template', 
			'GET', 
			{  }, 
			{ 'phoneBaseSettingsId': phoneBaseSettingsId }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get physical interfaces for edges.
	 * Retrieves a list of all configured physical interfaces for a list of edges. Only 100 edges can be requested at a time.
	 * @param {String} edgeIds Comma separated list of Edge Id&#39;s
	 */
	getTelephonyProvidersEdgesPhysicalinterfaces(edgeIds) { 
		// verify the required parameter 'edgeIds' is set
		if (edgeIds === undefined || edgeIds === null) {
			throw 'Missing the required parameter "edgeIds" when calling getTelephonyProvidersEdgesPhysicalinterfaces';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/physicalinterfaces', 
			'GET', 
			{  }, 
			{ 'edgeIds': edgeIds }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Site by ID.
	 * 
	 * @param {String} siteId Site ID
	 */
	getTelephonyProvidersEdgesSite(siteId) { 
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling getTelephonyProvidersEdgesSite';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}', 
			'GET', 
			{ 'siteId': siteId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Gets the basic information about an asg in a specified site
	 * 
	 * @param {String} siteId Site id associated with the asg
	 */
	getTelephonyProvidersEdgesSiteAutoscalinggroups(siteId) { 
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling getTelephonyProvidersEdgesSiteAutoscalinggroups';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}/autoscalinggroups', 
			'GET', 
			{ 'siteId': siteId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Number Plan by ID.
	 * 
	 * @param {String} siteId Site ID
	 * @param {String} numberPlanId Number Plan ID
	 */
	getTelephonyProvidersEdgesSiteNumberplan(siteId, numberPlanId) { 
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling getTelephonyProvidersEdgesSiteNumberplan';
		}
		// verify the required parameter 'numberPlanId' is set
		if (numberPlanId === undefined || numberPlanId === null) {
			throw 'Missing the required parameter "numberPlanId" when calling getTelephonyProvidersEdgesSiteNumberplan';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}/numberplans/{numberPlanId}', 
			'GET', 
			{ 'siteId': siteId,'numberPlanId': numberPlanId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of Number Plans for this Site.
	 * 
	 * @param {String} siteId Site ID
	 */
	getTelephonyProvidersEdgesSiteNumberplans(siteId) { 
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling getTelephonyProvidersEdgesSiteNumberplans';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}/numberplans', 
			'GET', 
			{ 'siteId': siteId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of Classifications for this Site
	 * 
	 * @param {String} siteId Site ID
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.classification Classification
	 */
	getTelephonyProvidersEdgesSiteNumberplansClassifications(siteId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling getTelephonyProvidersEdgesSiteNumberplansClassifications';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}/numberplans/classifications', 
			'GET', 
			{ 'siteId': siteId }, 
			{ 'classification': opts['classification'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get an outbound route
	 * 
	 * @param {String} siteId Site ID
	 * @param {String} outboundRouteId Outbound route ID
	 */
	getTelephonyProvidersEdgesSiteOutboundroute(siteId, outboundRouteId) { 
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling getTelephonyProvidersEdgesSiteOutboundroute';
		}
		// verify the required parameter 'outboundRouteId' is set
		if (outboundRouteId === undefined || outboundRouteId === null) {
			throw 'Missing the required parameter "outboundRouteId" when calling getTelephonyProvidersEdgesSiteOutboundroute';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}/outboundroutes/{outboundRouteId}', 
			'GET', 
			{ 'siteId': siteId,'outboundRouteId': outboundRouteId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get outbound routes
	 * 
	 * @param {String} siteId Site ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.name Name
	 * @param {String} opts.sortBy Sort by (default to name)
	 */
	getTelephonyProvidersEdgesSiteOutboundroutes(siteId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling getTelephonyProvidersEdgesSiteOutboundroutes';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}/outboundroutes', 
			'GET', 
			{ 'siteId': siteId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'name': opts['name'],'sortBy': opts['sortBy'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of Sites.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortBy Sort by (default to name)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 * @param {String} opts.name Name
	 * @param {String} opts.locationId Location Id
	 * @param {Boolean} opts.managed Filter by managed
	 */
	getTelephonyProvidersEdgesSites(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'name': opts['name'],'location.id': opts['locationId'],'managed': opts['managed'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of Edge-compatible time zones
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 1000)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getTelephonyProvidersEdgesTimezones(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/timezones', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Trunk by ID
	 * 
	 * @param {String} trunkId Trunk ID
	 */
	getTelephonyProvidersEdgesTrunk(trunkId) { 
		// verify the required parameter 'trunkId' is set
		if (trunkId === undefined || trunkId === null) {
			throw 'Missing the required parameter "trunkId" when calling getTelephonyProvidersEdgesTrunk';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/trunks/{trunkId}', 
			'GET', 
			{ 'trunkId': trunkId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the trunk metrics.
	 * 
	 * @param {String} trunkId Trunk Id
	 */
	getTelephonyProvidersEdgesTrunkMetrics(trunkId) { 
		// verify the required parameter 'trunkId' is set
		if (trunkId === undefined || trunkId === null) {
			throw 'Missing the required parameter "trunkId" when calling getTelephonyProvidersEdgesTrunkMetrics';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/trunks/{trunkId}/metrics', 
			'GET', 
			{ 'trunkId': trunkId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Trunk Base Settings object by ID
	 * Managed properties will not be returned unless the user is assigned the managed:all:all permission.
	 * @param {String} trunkBaseSettingsId Trunk Base ID
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.ignoreHidden Set this to true to not receive trunk properties that are meant to be hidden or for internal system usage only.
	 */
	getTelephonyProvidersEdgesTrunkbasesetting(trunkBaseSettingsId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'trunkBaseSettingsId' is set
		if (trunkBaseSettingsId === undefined || trunkBaseSettingsId === null) {
			throw 'Missing the required parameter "trunkBaseSettingsId" when calling getTelephonyProvidersEdgesTrunkbasesetting';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/trunkbasesettings/{trunkBaseSettingsId}', 
			'GET', 
			{ 'trunkBaseSettingsId': trunkBaseSettingsId }, 
			{ 'ignoreHidden': opts['ignoreHidden'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Trunk Base Settings listing
	 * Managed properties will not be returned unless the user is assigned the managed:all:all permission.
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortBy Value by which to sort (default to name)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 * @param {Boolean} opts.recordingEnabled Filter trunks by recording enabled
	 * @param {Boolean} opts.ignoreHidden Set this to true to not receive trunk properties that are meant to be hidden or for internal system usage only.
	 * @param {Boolean} opts.managed Filter by managed
	 * @param {Array.<String>} opts.expand Fields to expand in the response, comma-separated
	 * @param {String} opts.name Name of the TrunkBase to filter by
	 */
	getTelephonyProvidersEdgesTrunkbasesettings(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/trunkbasesettings', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'recordingEnabled': opts['recordingEnabled'],'ignoreHidden': opts['ignoreHidden'],'managed': opts['managed'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'name': opts['name'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of available makes and models to create a new Trunk Base Settings
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.type 
	 * @param {Number} opts.pageSize  (default to 25)
	 * @param {Number} opts.pageNumber  (default to 1)
	 */
	getTelephonyProvidersEdgesTrunkbasesettingsAvailablemetabases(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/trunkbasesettings/availablemetabases', 
			'GET', 
			{  }, 
			{ 'type': opts['type'],'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a Trunk Base Settings instance template from a given make and model. This object can then be modified and saved as a new Trunk Base Settings instance
	 * 
	 * @param {String} trunkMetabaseId The id of a metabase object upon which to base this Trunk Base Settings
	 */
	getTelephonyProvidersEdgesTrunkbasesettingsTemplate(trunkMetabaseId) { 
		// verify the required parameter 'trunkMetabaseId' is set
		if (trunkMetabaseId === undefined || trunkMetabaseId === null) {
			throw 'Missing the required parameter "trunkMetabaseId" when calling getTelephonyProvidersEdgesTrunkbasesettingsTemplate';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/trunkbasesettings/template', 
			'GET', 
			{  }, 
			{ 'trunkMetabaseId': trunkMetabaseId }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of available trunks.
	 * Trunks are created by assigning trunk base settings to an Edge or Edge Group.
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {String} opts.sortBy Value by which to sort (default to name)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 * @param {String} opts.edgeId Filter by Edge Ids
	 * @param {String} opts.trunkBaseId Filter by Trunk Base Ids
	 * @param {Object} opts.trunkType Filter by a Trunk type
	 */
	getTelephonyProvidersEdgesTrunks(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/trunks', 
			'GET', 
			{  }, 
			{ 'pageNumber': opts['pageNumber'],'pageSize': opts['pageSize'],'sortBy': opts['sortBy'],'sortOrder': opts['sortOrder'],'edge.id': opts['edgeId'],'trunkBase.id': opts['trunkBaseId'],'trunkType': opts['trunkType'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the metrics for a list of trunks.
	 * 
	 * @param {String} trunkIds Comma separated list of Trunk Id&#39;s
	 */
	getTelephonyProvidersEdgesTrunksMetrics(trunkIds) { 
		// verify the required parameter 'trunkIds' is set
		if (trunkIds === undefined || trunkIds === null) {
			throw 'Missing the required parameter "trunkIds" when calling getTelephonyProvidersEdgesTrunksMetrics';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/trunks/metrics', 
			'GET', 
			{  }, 
			{ 'trunkIds': trunkIds }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get Counts of trunks that have recording disabled or enabled
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.trunkType The type of this trunk base.
	 */
	getTelephonyProvidersEdgesTrunkswithrecording(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/trunkswithrecording', 
			'GET', 
			{  }, 
			{ 'trunkType': opts['trunkType'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create an edge logical interface.
	 * Create
	 * @param {String} edgeId Edge ID
	 * @param {Object} body Logical interface
	 */
	postTelephonyProvidersEdgeLogicalinterfaces(edgeId, body) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling postTelephonyProvidersEdgeLogicalinterfaces';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgeLogicalinterfaces';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/logicalinterfaces', 
			'POST', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Request that the specified fileIds be uploaded from the Edge.
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {String} jobId Job ID
	 * @param {Object} body Log upload request
	 */
	postTelephonyProvidersEdgeLogsJobUpload(edgeId, jobId, body) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling postTelephonyProvidersEdgeLogsJobUpload';
		}
		// verify the required parameter 'jobId' is set
		if (jobId === undefined || jobId === null) {
			throw 'Missing the required parameter "jobId" when calling postTelephonyProvidersEdgeLogsJobUpload';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgeLogsJobUpload';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/logs/jobs/{jobId}/upload', 
			'POST', 
			{ 'edgeId': edgeId,'jobId': jobId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a job to upload a list of Edge logs.
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {Object} body EdgeLogsJobRequest
	 */
	postTelephonyProvidersEdgeLogsJobs(edgeId, body) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling postTelephonyProvidersEdgeLogsJobs';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgeLogsJobs';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/logs/jobs', 
			'POST', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Reboot an Edge
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Parameters for the edge reboot
	 */
	postTelephonyProvidersEdgeReboot(edgeId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling postTelephonyProvidersEdgeReboot';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/reboot', 
			'POST', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Starts a software update for this edge.
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {Object} body Software update request
	 */
	postTelephonyProvidersEdgeSoftwareupdate(edgeId, body) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling postTelephonyProvidersEdgeSoftwareupdate';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgeSoftwareupdate';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/softwareupdate', 
			'POST', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Take an Edge in or out of service
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body Edge Service State
	 */
	postTelephonyProvidersEdgeStatuscode(edgeId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling postTelephonyProvidersEdgeStatuscode';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/statuscode', 
			'POST', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Unpair an Edge
	 * 
	 * @param {String} edgeId Edge Id
	 */
	postTelephonyProvidersEdgeUnpair(edgeId) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling postTelephonyProvidersEdgeUnpair';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/unpair', 
			'POST', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create an edge.
	 * 
	 * @param {Object} body Edge
	 */
	postTelephonyProvidersEdges(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdges';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Validates a street address
	 * 
	 * @param {Object} body Address
	 */
	postTelephonyProvidersEdgesAddressvalidation(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesAddressvalidation';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/addressvalidation', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a certificate authority.
	 * 
	 * @param {Object} body CertificateAuthority
	 */
	postTelephonyProvidersEdgesCertificateauthorities(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesCertificateauthorities';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/certificateauthorities', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new DID pool
	 * 
	 * @param {Object} body DID pool
	 */
	postTelephonyProvidersEdgesDidpools(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesDidpools';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/didpools', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create an edge group.
	 * 
	 * @param {Object} body EdgeGroup
	 */
	postTelephonyProvidersEdgesEdgegroups(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesEdgegroups';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/edgegroups', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create endpoint
	 * 
	 * @param {Object} body EndpointTemplate
	 */
	postTelephonyProvidersEdgesEndpoints(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesEndpoints';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/endpoints', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new extension pool
	 * 
	 * @param {Object} body ExtensionPool
	 */
	postTelephonyProvidersEdgesExtensionpools(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesExtensionpools';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/extensionpools', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create outbound rule
	 * 
	 * @param {Object} body OutboundRoute
	 */
	postTelephonyProvidersEdgesOutboundroutes(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesOutboundroutes';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/outboundroutes', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Reboot a Phone
	 * 
	 * @param {String} phoneId Phone Id
	 */
	postTelephonyProvidersEdgesPhoneReboot(phoneId) { 
		// verify the required parameter 'phoneId' is set
		if (phoneId === undefined || phoneId === null) {
			throw 'Missing the required parameter "phoneId" when calling postTelephonyProvidersEdgesPhoneReboot';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phones/{phoneId}/reboot', 
			'POST', 
			{ 'phoneId': phoneId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new Phone Base Settings object
	 * 
	 * @param {Object} body Phone base settings
	 */
	postTelephonyProvidersEdgesPhonebasesettings(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesPhonebasesettings';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phonebasesettings', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new Phone
	 * 
	 * @param {Object} body Phone
	 */
	postTelephonyProvidersEdgesPhones(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesPhones';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phones', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Reboot Multiple Phones
	 * 
	 * @param {Object} body Phones
	 */
	postTelephonyProvidersEdgesPhonesReboot(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesPhonesReboot';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phones/reboot', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Creates an ASG for the specified site
	 * 
	 * @param {String} siteId Site that will be associated with the asg
	 * @param {Object} body CreateAsgRequest
	 */
	postTelephonyProvidersEdgesSiteAutoscalinggroups(siteId, body) { 
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling postTelephonyProvidersEdgesSiteAutoscalinggroups';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesSiteAutoscalinggroups';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}/autoscalinggroups', 
			'POST', 
			{ 'siteId': siteId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create outbound route
	 * 
	 * @param {String} siteId Site ID
	 * @param {Object} body OutboundRoute
	 */
	postTelephonyProvidersEdgesSiteOutboundroutes(siteId, body) { 
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling postTelephonyProvidersEdgesSiteOutboundroutes';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesSiteOutboundroutes';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}/outboundroutes', 
			'POST', 
			{ 'siteId': siteId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Triggers the rebalance operation.
	 * 
	 * @param {String} siteId Site ID
	 */
	postTelephonyProvidersEdgesSiteRebalance(siteId) { 
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling postTelephonyProvidersEdgesSiteRebalance';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}/rebalance', 
			'POST', 
			{ 'siteId': siteId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a Site.
	 * 
	 * @param {Object} body Site
	 */
	postTelephonyProvidersEdgesSites(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesSites';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a Trunk Base Settings object
	 * 
	 * @param {Object} body Trunk base settings
	 */
	postTelephonyProvidersEdgesTrunkbasesettings(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postTelephonyProvidersEdgesTrunkbasesettings';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/trunkbasesettings', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a edge.
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {Object} body Edge
	 */
	putTelephonyProvidersEdge(edgeId, body) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling putTelephonyProvidersEdge';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdge';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}', 
			'PUT', 
			{ 'edgeId': edgeId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a line.
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {String} lineId Line ID
	 * @param {Object} body Line
	 */
	putTelephonyProvidersEdgeLine(edgeId, lineId, body) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling putTelephonyProvidersEdgeLine';
		}
		// verify the required parameter 'lineId' is set
		if (lineId === undefined || lineId === null) {
			throw 'Missing the required parameter "lineId" when calling putTelephonyProvidersEdgeLine';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgeLine';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/lines/{lineId}', 
			'PUT', 
			{ 'edgeId': edgeId,'lineId': lineId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an edge logical interface.
	 * 
	 * @param {String} edgeId Edge ID
	 * @param {String} interfaceId Interface ID
	 * @param {Object} body Logical interface
	 */
	putTelephonyProvidersEdgeLogicalinterface(edgeId, interfaceId, body) { 
		// verify the required parameter 'edgeId' is set
		if (edgeId === undefined || edgeId === null) {
			throw 'Missing the required parameter "edgeId" when calling putTelephonyProvidersEdgeLogicalinterface';
		}
		// verify the required parameter 'interfaceId' is set
		if (interfaceId === undefined || interfaceId === null) {
			throw 'Missing the required parameter "interfaceId" when calling putTelephonyProvidersEdgeLogicalinterface';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgeLogicalinterface';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/{edgeId}/logicalinterfaces/{interfaceId}', 
			'PUT', 
			{ 'edgeId': edgeId,'interfaceId': interfaceId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a certificate authority.
	 * 
	 * @param {String} certificateId Certificate ID
	 * @param {Object} body Certificate authority
	 */
	putTelephonyProvidersEdgesCertificateauthority(certificateId, body) { 
		// verify the required parameter 'certificateId' is set
		if (certificateId === undefined || certificateId === null) {
			throw 'Missing the required parameter "certificateId" when calling putTelephonyProvidersEdgesCertificateauthority';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesCertificateauthority';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/certificateauthorities/{certificateId}', 
			'PUT', 
			{ 'certificateId': certificateId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a DID by ID.
	 * 
	 * @param {String} didId DID ID
	 * @param {Object} body DID
	 */
	putTelephonyProvidersEdgesDid(didId, body) { 
		// verify the required parameter 'didId' is set
		if (didId === undefined || didId === null) {
			throw 'Missing the required parameter "didId" when calling putTelephonyProvidersEdgesDid';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesDid';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/dids/{didId}', 
			'PUT', 
			{ 'didId': didId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a DID Pool by ID.
	 * 
	 * @param {String} didPoolId DID pool ID
	 * @param {Object} body DID pool
	 */
	putTelephonyProvidersEdgesDidpool(didPoolId, body) { 
		// verify the required parameter 'didPoolId' is set
		if (didPoolId === undefined || didPoolId === null) {
			throw 'Missing the required parameter "didPoolId" when calling putTelephonyProvidersEdgesDidpool';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesDidpool';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/didpools/{didPoolId}', 
			'PUT', 
			{ 'didPoolId': didPoolId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an edge group.
	 * 
	 * @param {String} edgeGroupId Edge group ID
	 * @param {Object} body EdgeGroup
	 */
	putTelephonyProvidersEdgesEdgegroup(edgeGroupId, body) { 
		// verify the required parameter 'edgeGroupId' is set
		if (edgeGroupId === undefined || edgeGroupId === null) {
			throw 'Missing the required parameter "edgeGroupId" when calling putTelephonyProvidersEdgesEdgegroup';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesEdgegroup';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/edgegroups/{edgeGroupId}', 
			'PUT', 
			{ 'edgeGroupId': edgeGroupId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the edge trunk base associated with the edge group
	 * 
	 * @param {String} edgegroupId Edge Group ID
	 * @param {String} edgetrunkbaseId Edge Trunk Base ID
	 * @param {Object} body EdgeTrunkBase
	 */
	putTelephonyProvidersEdgesEdgegroupEdgetrunkbase(edgegroupId, edgetrunkbaseId, body) { 
		// verify the required parameter 'edgegroupId' is set
		if (edgegroupId === undefined || edgegroupId === null) {
			throw 'Missing the required parameter "edgegroupId" when calling putTelephonyProvidersEdgesEdgegroupEdgetrunkbase';
		}
		// verify the required parameter 'edgetrunkbaseId' is set
		if (edgetrunkbaseId === undefined || edgetrunkbaseId === null) {
			throw 'Missing the required parameter "edgetrunkbaseId" when calling putTelephonyProvidersEdgesEdgegroupEdgetrunkbase';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesEdgegroupEdgetrunkbase';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/edgegroups/{edgegroupId}/edgetrunkbases/{edgetrunkbaseId}', 
			'PUT', 
			{ 'edgegroupId': edgegroupId,'edgetrunkbaseId': edgetrunkbaseId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update endpoint
	 * 
	 * @param {String} endpointId Endpoint ID
	 * @param {Object} body EndpointTemplate
	 */
	putTelephonyProvidersEdgesEndpoint(endpointId, body) { 
		// verify the required parameter 'endpointId' is set
		if (endpointId === undefined || endpointId === null) {
			throw 'Missing the required parameter "endpointId" when calling putTelephonyProvidersEdgesEndpoint';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesEndpoint';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/endpoints/{endpointId}', 
			'PUT', 
			{ 'endpointId': endpointId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an extension by ID.
	 * 
	 * @param {String} extensionId Extension ID
	 * @param {Object} body Extension
	 */
	putTelephonyProvidersEdgesExtension(extensionId, body) { 
		// verify the required parameter 'extensionId' is set
		if (extensionId === undefined || extensionId === null) {
			throw 'Missing the required parameter "extensionId" when calling putTelephonyProvidersEdgesExtension';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesExtension';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/extensions/{extensionId}', 
			'PUT', 
			{ 'extensionId': extensionId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an extension pool by ID
	 * 
	 * @param {String} extensionPoolId Extension pool ID
	 * @param {Object} body ExtensionPool
	 */
	putTelephonyProvidersEdgesExtensionpool(extensionPoolId, body) { 
		// verify the required parameter 'extensionPoolId' is set
		if (extensionPoolId === undefined || extensionPoolId === null) {
			throw 'Missing the required parameter "extensionPoolId" when calling putTelephonyProvidersEdgesExtensionpool';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesExtensionpool';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/extensionpools/{extensionPoolId}', 
			'PUT', 
			{ 'extensionPoolId': extensionPoolId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update outbound route
	 * 
	 * @param {String} outboundRouteId Outbound route ID
	 * @param {Object} body OutboundRoute
	 */
	putTelephonyProvidersEdgesOutboundroute(outboundRouteId, body) { 
		// verify the required parameter 'outboundRouteId' is set
		if (outboundRouteId === undefined || outboundRouteId === null) {
			throw 'Missing the required parameter "outboundRouteId" when calling putTelephonyProvidersEdgesOutboundroute';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesOutboundroute';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/outboundroutes/{outboundRouteId}', 
			'PUT', 
			{ 'outboundRouteId': outboundRouteId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a Phone by ID
	 * 
	 * @param {String} phoneId Phone ID
	 * @param {Object} body Phone
	 */
	putTelephonyProvidersEdgesPhone(phoneId, body) { 
		// verify the required parameter 'phoneId' is set
		if (phoneId === undefined || phoneId === null) {
			throw 'Missing the required parameter "phoneId" when calling putTelephonyProvidersEdgesPhone';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesPhone';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phones/{phoneId}', 
			'PUT', 
			{ 'phoneId': phoneId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a Phone Base Settings by ID
	 * 
	 * @param {String} phoneBaseId Phone base ID
	 * @param {Object} body Phone base settings
	 */
	putTelephonyProvidersEdgesPhonebasesetting(phoneBaseId, body) { 
		// verify the required parameter 'phoneBaseId' is set
		if (phoneBaseId === undefined || phoneBaseId === null) {
			throw 'Missing the required parameter "phoneBaseId" when calling putTelephonyProvidersEdgesPhonebasesetting';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesPhonebasesetting';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/phonebasesettings/{phoneBaseId}', 
			'PUT', 
			{ 'phoneBaseId': phoneBaseId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a Site by ID.
	 * 
	 * @param {String} siteId Site ID
	 * @param {Object} body Site
	 */
	putTelephonyProvidersEdgesSite(siteId, body) { 
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling putTelephonyProvidersEdgesSite';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesSite';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}', 
			'PUT', 
			{ 'siteId': siteId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the list of Number Plans.
	 * 
	 * @param {String} siteId Site ID
	 * @param {Array.<Object>} body List of number plans
	 */
	putTelephonyProvidersEdgesSiteNumberplans(siteId, body) { 
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling putTelephonyProvidersEdgesSiteNumberplans';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesSiteNumberplans';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}/numberplans', 
			'PUT', 
			{ 'siteId': siteId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update outbound route
	 * 
	 * @param {String} siteId Site ID
	 * @param {String} outboundRouteId Outbound route ID
	 * @param {Object} body OutboundRoute
	 */
	putTelephonyProvidersEdgesSiteOutboundroute(siteId, outboundRouteId, body) { 
		// verify the required parameter 'siteId' is set
		if (siteId === undefined || siteId === null) {
			throw 'Missing the required parameter "siteId" when calling putTelephonyProvidersEdgesSiteOutboundroute';
		}
		// verify the required parameter 'outboundRouteId' is set
		if (outboundRouteId === undefined || outboundRouteId === null) {
			throw 'Missing the required parameter "outboundRouteId" when calling putTelephonyProvidersEdgesSiteOutboundroute';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesSiteOutboundroute';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/sites/{siteId}/outboundroutes/{outboundRouteId}', 
			'PUT', 
			{ 'siteId': siteId,'outboundRouteId': outboundRouteId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a Trunk Base Settings object by ID
	 * 
	 * @param {String} trunkBaseSettingsId Trunk Base ID
	 * @param {Object} body Trunk base settings
	 */
	putTelephonyProvidersEdgesTrunkbasesetting(trunkBaseSettingsId, body) { 
		// verify the required parameter 'trunkBaseSettingsId' is set
		if (trunkBaseSettingsId === undefined || trunkBaseSettingsId === null) {
			throw 'Missing the required parameter "trunkBaseSettingsId" when calling putTelephonyProvidersEdgesTrunkbasesetting';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putTelephonyProvidersEdgesTrunkbasesetting';
		}

		return this.apiClient.callApi(
			'/api/v2/telephony/providers/edges/trunkbasesettings/{trunkBaseSettingsId}', 
			'PUT', 
			{ 'trunkBaseSettingsId': trunkBaseSettingsId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class TokensApi {
	/**
	 * Tokens service.
	 * @module purecloud-platform-client-v2/api/TokensApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new TokensApi. 
	 * @alias module:purecloud-platform-client-v2/api/TokensApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete  auth token used to make the request.
	 * 
	 */
	deleteTokensMe() { 

		return this.apiClient.callApi(
			'/api/v2/tokens/me', 
			'DELETE', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Fetch information about the current token
	 * 
	 */
	getTokensMe() { 

		return this.apiClient.callApi(
			'/api/v2/tokens/me', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class UserRecordingsApi {
	/**
	 * UserRecordings service.
	 * @module purecloud-platform-client-v2/api/UserRecordingsApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new UserRecordingsApi. 
	 * @alias module:purecloud-platform-client-v2/api/UserRecordingsApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete a user recording.
	 * 
	 * @param {String} recordingId User Recording ID
	 */
	deleteUserrecording(recordingId) { 
		// verify the required parameter 'recordingId' is set
		if (recordingId === undefined || recordingId === null) {
			throw 'Missing the required parameter "recordingId" when calling deleteUserrecording';
		}

		return this.apiClient.callApi(
			'/api/v2/userrecordings/{recordingId}', 
			'DELETE', 
			{ 'recordingId': recordingId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a user recording.
	 * 
	 * @param {String} recordingId User Recording ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	getUserrecording(recordingId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'recordingId' is set
		if (recordingId === undefined || recordingId === null) {
			throw 'Missing the required parameter "recordingId" when calling getUserrecording';
		}

		return this.apiClient.callApi(
			'/api/v2/userrecordings/{recordingId}', 
			'GET', 
			{ 'recordingId': recordingId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Download a user recording.
	 * 
	 * @param {String} recordingId User Recording ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.formatId The desired media format. (default to WEBM)
	 */
	getUserrecordingMedia(recordingId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'recordingId' is set
		if (recordingId === undefined || recordingId === null) {
			throw 'Missing the required parameter "recordingId" when calling getUserrecordingMedia';
		}

		return this.apiClient.callApi(
			'/api/v2/userrecordings/{recordingId}/media', 
			'GET', 
			{ 'recordingId': recordingId }, 
			{ 'formatId': opts['formatId'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of user recordings.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	getUserrecordings(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/userrecordings', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get user recording summary
	 * 
	 */
	getUserrecordingsSummary() { 

		return this.apiClient.callApi(
			'/api/v2/userrecordings/summary', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a user recording.
	 * 
	 * @param {String} recordingId User Recording ID
	 * @param {Object} body UserRecording
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	putUserrecording(recordingId, body, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'recordingId' is set
		if (recordingId === undefined || recordingId === null) {
			throw 'Missing the required parameter "recordingId" when calling putUserrecording';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putUserrecording';
		}

		return this.apiClient.callApi(
			'/api/v2/userrecordings/{recordingId}', 
			'PUT', 
			{ 'recordingId': recordingId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class UsersApi {
	/**
	 * Users service.
	 * @module purecloud-platform-client-v2/api/UsersApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new UsersApi. 
	 * @alias module:purecloud-platform-client-v2/api/UsersApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete user
	 * 
	 * @param {String} userId User ID
	 */
	deleteUser(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling deleteUser';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}', 
			'DELETE', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Removes all the roles from the user.
	 * 
	 * @param {String} userId User ID
	 */
	deleteUserRoles(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling deleteUserRoles';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/roles', 
			'DELETE', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Remove routing language from user
	 * 
	 * @param {String} userId User ID
	 * @param {String} languageId languageId
	 */
	deleteUserRoutinglanguage(userId, languageId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling deleteUserRoutinglanguage';
		}
		// verify the required parameter 'languageId' is set
		if (languageId === undefined || languageId === null) {
			throw 'Missing the required parameter "languageId" when calling deleteUserRoutinglanguage';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routinglanguages/{languageId}', 
			'DELETE', 
			{ 'userId': userId,'languageId': languageId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Remove routing skill from user
	 * 
	 * @param {String} userId User ID
	 * @param {String} skillId skillId
	 */
	deleteUserRoutingskill(userId, skillId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling deleteUserRoutingskill';
		}
		// verify the required parameter 'skillId' is set
		if (skillId === undefined || skillId === null) {
			throw 'Missing the required parameter "skillId" when calling deleteUserRoutingskill';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routingskills/{skillId}', 
			'DELETE', 
			{ 'userId': userId,'skillId': skillId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Clear associated station
	 * 
	 * @param {String} userId User ID
	 */
	deleteUserStationAssociatedstation(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling deleteUserStationAssociatedstation';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/station/associatedstation', 
			'DELETE', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Clear default station
	 * 
	 * @param {String} userId User ID
	 */
	deleteUserStationDefaultstation(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling deleteUserStationDefaultstation';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/station/defaultstation', 
			'DELETE', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Fetch field config for an entity type
	 * 
	 * @param {Object} type Field type
	 */
	getFieldconfig(type) { 
		// verify the required parameter 'type' is set
		if (type === undefined || type === null) {
			throw 'Missing the required parameter "type" when calling getFieldconfig';
		}

		return this.apiClient.callApi(
			'/api/v2/fieldconfig', 
			'GET', 
			{  }, 
			{ 'type': type }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a user profile listing
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Array.<String>} opts.id id
	 * @param {Array.<String>} opts.jid jid
	 * @param {Object} opts.sortOrder Ascending or descending sort order (default to ASC)
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 * @param {Object} opts.state Only list users of this state (default to active)
	 */
	getProfilesUsers(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/profiles/users', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'id': this.apiClient.buildCollectionParam(opts['id'], 'multi'),'jid': this.apiClient.buildCollectionParam(opts['jid'], 'multi'),'sortOrder': opts['sortOrder'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'state': opts['state'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get user.
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 * @param {Object} opts.state Search for a user with this state (default to active)
	 */
	getUser(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUser';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}', 
			'GET', 
			{ 'userId': userId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'state': opts['state'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get adjacents
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	getUserAdjacents(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserAdjacents';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/adjacents', 
			'GET', 
			{ 'userId': userId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a user&#39;s CallForwarding
	 * 
	 * @param {String} userId User ID
	 */
	getUserCallforwarding(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserCallforwarding';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/callforwarding', 
			'GET', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get direct reports
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	getUserDirectreports(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserDirectreports';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/directreports', 
			'GET', 
			{ 'userId': userId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get favorites
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {String} opts.sortOrder Sort order (default to ASC)
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	getUserFavorites(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserFavorites';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/favorites', 
			'GET', 
			{ 'userId': userId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortOrder': opts['sortOrder'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a user&#39;s Geolocation
	 * 
	 * @param {String} userId user Id
	 * @param {String} clientId client Id
	 */
	getUserGeolocation(userId, clientId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserGeolocation';
		}
		// verify the required parameter 'clientId' is set
		if (clientId === undefined || clientId === null) {
			throw 'Missing the required parameter "clientId" when calling getUserGeolocation';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/geolocations/{clientId}', 
			'GET', 
			{ 'userId': userId,'clientId': clientId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a OutOfOffice
	 * 
	 * @param {String} userId User ID
	 */
	getUserOutofoffice(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserOutofoffice';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/outofoffice', 
			'GET', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get user profile
	 * 
	 * @param {String} userId userId
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	getUserProfile(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserProfile';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/profile', 
			'GET', 
			{ 'userId': userId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List profile skills for a user
	 * 
	 * @param {String} userId User ID
	 */
	getUserProfileskills(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserProfileskills';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/profileskills', 
			'GET', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get queues for user
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Boolean} opts.joined Is joined to the queue (default to true)
	 */
	getUserQueues(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserQueues';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/queues', 
			'GET', 
			{ 'userId': userId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'joined': opts['joined'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Returns a listing of roles and permissions for a user.
	 * 
	 * @param {String} userId User ID
	 */
	getUserRoles(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserRoles';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/roles', 
			'GET', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List routing language for user
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.sortOrder Ascending or descending sort order (default to ASC)
	 */
	getUserRoutinglanguages(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserRoutinglanguages';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routinglanguages', 
			'GET', 
			{ 'userId': userId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List routing skills for user
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Object} opts.sortOrder Ascending or descending sort order (default to ASC)
	 */
	getUserRoutingskills(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserRoutingskills';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routingskills', 
			'GET', 
			{ 'userId': userId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'sortOrder': opts['sortOrder'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Fetch the routing status of a user
	 * 
	 * @param {String} userId User ID
	 */
	getUserRoutingstatus(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserRoutingstatus';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routingstatus', 
			'GET', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get station information for user
	 * 
	 * @param {String} userId User ID
	 */
	getUserStation(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserStation';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/station', 
			'GET', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get superiors
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 */
	getUserSuperiors(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserSuperiors';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/superiors', 
			'GET', 
			{ 'userId': userId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List the organizations that have authorized/trusted the user.
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getUserTrustors(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getUserTrustors';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/trustors', 
			'GET', 
			{ 'userId': userId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the list of available users.
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 * @param {Array.<String>} opts.id id
	 * @param {Object} opts.sortOrder Ascending or descending sort order (default to ASC)
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand
	 * @param {Object} opts.state Only list users of this state (default to active)
	 */
	getUsers(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/users', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'id': this.apiClient.buildCollectionParam(opts['id'], 'multi'),'sortOrder': opts['sortOrder'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi'),'state': opts['state'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get current user details.
	 * This request is not valid when using the Client Credentials OAuth grant.
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand Which fields, if any, to expand.
	 */
	getUsersMe(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/users/me', 
			'GET', 
			{  }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search users using the q64 value returned from a previous search
	 * 
	 * @param {String} q64 q64
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand expand
	 */
	getUsersSearch(q64, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'q64' is set
		if (q64 === undefined || q64 === null) {
			throw 'Missing the required parameter "q64" when calling getUsersSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/users/search', 
			'GET', 
			{  }, 
			{ 'q64': q64,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update user
	 * 
	 * @param {String} userId User ID
	 * @param {Object} body User
	 */
	patchUser(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling patchUser';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchUser';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}', 
			'PATCH', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Patch a user&#39;s CallForwarding
	 * 
	 * @param {String} userId User ID
	 * @param {Object} body Call forwarding
	 */
	patchUserCallforwarding(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling patchUserCallforwarding';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchUserCallforwarding';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/callforwarding', 
			'PATCH', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Patch a user&#39;s Geolocation
	 * The geolocation object can be patched one of three ways. Option 1: Set the &#39;primary&#39; property to true. This will set the client as the user&#39;s primary geolocation source.  Option 2: Provide the &#39;latitude&#39; and &#39;longitude&#39; values.  This will enqueue an asynchronous update of the &#39;city&#39;, &#39;region&#39;, and &#39;country&#39;, generating a notification. A subsequent GET operation will include the new values for &#39;city&#39;, &#39;region&#39; and &#39;country&#39;.  Option 3:  Provide the &#39;city&#39;, &#39;region&#39;, &#39;country&#39; values.  Option 1 can be combined with Option 2 or Option 3.  For example, update the client as primary and provide latitude and longitude values.
	 * @param {String} userId user Id
	 * @param {String} clientId client Id
	 * @param {Object} body Geolocation
	 */
	patchUserGeolocation(userId, clientId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling patchUserGeolocation';
		}
		// verify the required parameter 'clientId' is set
		if (clientId === undefined || clientId === null) {
			throw 'Missing the required parameter "clientId" when calling patchUserGeolocation';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchUserGeolocation';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/geolocations/{clientId}', 
			'PATCH', 
			{ 'userId': userId,'clientId': clientId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Join or unjoin a queue for a user
	 * 
	 * @param {String} queueId Queue ID
	 * @param {String} userId User ID
	 * @param {Object} body Queue Member
	 */
	patchUserQueue(queueId, userId, body) { 
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling patchUserQueue';
		}
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling patchUserQueue';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchUserQueue';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/queues/{queueId}', 
			'PATCH', 
			{ 'queueId': queueId,'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Join or unjoin a set of queues for a user
	 * 
	 * @param {String} userId User ID
	 * @param {Array.<Object>} body User Queues
	 */
	patchUserQueues(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling patchUserQueues';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchUserQueues';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/queues', 
			'PATCH', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update routing language proficiency or state.
	 * 
	 * @param {String} userId User ID
	 * @param {String} languageId languageId
	 * @param {Object} body Language
	 */
	patchUserRoutinglanguage(userId, languageId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling patchUserRoutinglanguage';
		}
		// verify the required parameter 'languageId' is set
		if (languageId === undefined || languageId === null) {
			throw 'Missing the required parameter "languageId" when calling patchUserRoutinglanguage';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchUserRoutinglanguage';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routinglanguages/{languageId}', 
			'PATCH', 
			{ 'userId': userId,'languageId': languageId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for user aggregates
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsUsersAggregatesQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsUsersAggregatesQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/users/aggregates/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for user details
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsUsersDetailsQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsUsersDetailsQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/users/details/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query for user observations
	 * 
	 * @param {Object} body query
	 */
	postAnalyticsUsersObservationsQuery(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postAnalyticsUsersObservationsQuery';
		}

		return this.apiClient.callApi(
			'/api/v2/analytics/users/observations/query', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Send an activation email to the user
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.force Resend the invitation even if one is already outstanding (default to false)
	 */
	postUserInvite(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling postUserInvite';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/invite', 
			'POST', 
			{ 'userId': userId }, 
			{ 'force': opts['force'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Change a users password
	 * 
	 * @param {String} userId User ID
	 * @param {Object} body Password
	 */
	postUserPassword(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling postUserPassword';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postUserPassword';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/password', 
			'POST', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add routing language to user
	 * 
	 * @param {String} userId User ID
	 * @param {Object} body Language
	 */
	postUserRoutinglanguages(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling postUserRoutinglanguages';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postUserRoutinglanguages';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routinglanguages', 
			'POST', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Add routing skill to user
	 * 
	 * @param {String} userId User ID
	 * @param {Object} body Skill
	 */
	postUserRoutingskills(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling postUserRoutingskills';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postUserRoutingskills';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routingskills', 
			'POST', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create user
	 * 
	 * @param {Object} body User
	 */
	postUsers(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postUsers';
		}

		return this.apiClient.callApi(
			'/api/v2/users', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Change your password
	 * 
	 * @param {Object} body Password
	 */
	postUsersMePassword(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postUsersMePassword';
		}

		return this.apiClient.callApi(
			'/api/v2/users/me/password', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search users
	 * 
	 * @param {Object} body Search request options
	 */
	postUsersSearch(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postUsersSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/users/search', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a user&#39;s CallForwarding
	 * 
	 * @param {String} userId User ID
	 * @param {Object} body Call forwarding
	 */
	putUserCallforwarding(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling putUserCallforwarding';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putUserCallforwarding';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/callforwarding', 
			'PUT', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update an OutOfOffice
	 * 
	 * @param {String} userId User ID
	 * @param {Object} body The updated OutOffOffice
	 */
	putUserOutofoffice(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling putUserOutofoffice';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putUserOutofoffice';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/outofoffice', 
			'PUT', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update profile skills for a user
	 * 
	 * @param {String} userId User ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<Object>} opts.body Skills
	 */
	putUserProfileskills(userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling putUserProfileskills';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/profileskills', 
			'PUT', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Sets the user&#39;s roles
	 * 
	 * @param {String} userId User ID
	 * @param {Array.<Object>} body List of roles
	 */
	putUserRoles(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling putUserRoles';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putUserRoles';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/roles', 
			'PUT', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update routing skill proficiency or state.
	 * 
	 * @param {String} userId User ID
	 * @param {String} skillId skillId
	 * @param {Object} body Skill
	 */
	putUserRoutingskill(userId, skillId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling putUserRoutingskill';
		}
		// verify the required parameter 'skillId' is set
		if (skillId === undefined || skillId === null) {
			throw 'Missing the required parameter "skillId" when calling putUserRoutingskill';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putUserRoutingskill';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routingskills/{skillId}', 
			'PUT', 
			{ 'userId': userId,'skillId': skillId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the routing status of a user
	 * 
	 * @param {String} userId User ID
	 * @param {Object} body Routing Status
	 */
	putUserRoutingstatus(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling putUserRoutingstatus';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putUserRoutingstatus';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/routingstatus', 
			'PUT', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Set associated station
	 * 
	 * @param {String} userId User ID
	 * @param {String} stationId stationId
	 */
	putUserStationAssociatedstationStationId(userId, stationId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling putUserStationAssociatedstationStationId';
		}
		// verify the required parameter 'stationId' is set
		if (stationId === undefined || stationId === null) {
			throw 'Missing the required parameter "stationId" when calling putUserStationAssociatedstationStationId';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/station/associatedstation/{stationId}', 
			'PUT', 
			{ 'userId': userId,'stationId': stationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Set default station
	 * 
	 * @param {String} userId User ID
	 * @param {String} stationId stationId
	 */
	putUserStationDefaultstationStationId(userId, stationId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling putUserStationDefaultstationStationId';
		}
		// verify the required parameter 'stationId' is set
		if (stationId === undefined || stationId === null) {
			throw 'Missing the required parameter "stationId" when calling putUserStationDefaultstationStationId';
		}

		return this.apiClient.callApi(
			'/api/v2/users/{userId}/station/defaultstation/{stationId}', 
			'PUT', 
			{ 'userId': userId,'stationId': stationId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class UtilitiesApi {
	/**
	 * Utilities service.
	 * @module purecloud-platform-client-v2/api/UtilitiesApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new UtilitiesApi. 
	 * @alias module:purecloud-platform-client-v2/api/UtilitiesApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Get the current system date/time
	 * 
	 */
	getDate() { 

		return this.apiClient.callApi(
			'/api/v2/date', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get time zones list
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getTimezones(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/timezones', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Returns the information about an X509 PEM encoded certificate or certificate chain.
	 * 
	 * @param {Object} body Certificate
	 */
	postCertificateDetails(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postCertificateDetails';
		}

		return this.apiClient.callApi(
			'/api/v2/certificate/details', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class VoicemailApi {
	/**
	 * Voicemail service.
	 * @module purecloud-platform-client-v2/api/VoicemailApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new VoicemailApi. 
	 * @alias module:purecloud-platform-client-v2/api/VoicemailApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete a voicemail message.
	 * A user voicemail can only be deleted by its associated user. A group voicemail can only be deleted by a user that is a member of the group. A queue voicemail can only be deleted by a user with the acd voicemail delete permission.
	 * @param {String} messageId Message ID
	 */
	deleteVoicemailMessage(messageId) { 
		// verify the required parameter 'messageId' is set
		if (messageId === undefined || messageId === null) {
			throw 'Missing the required parameter "messageId" when calling deleteVoicemailMessage';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/messages/{messageId}', 
			'DELETE', 
			{ 'messageId': messageId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Delete all voicemail messages
	 * 
	 */
	deleteVoicemailMessages() { 

		return this.apiClient.callApi(
			'/api/v2/voicemail/messages', 
			'DELETE', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the group&#39;s mailbox information
	 * 
	 * @param {String} groupId groupId
	 */
	getVoicemailGroupMailbox(groupId) { 
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling getVoicemailGroupMailbox';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/groups/{groupId}/mailbox', 
			'GET', 
			{ 'groupId': groupId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List voicemail messages
	 * 
	 * @param {String} groupId Group ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getVoicemailGroupMessages(groupId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling getVoicemailGroupMessages';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/groups/{groupId}/messages', 
			'GET', 
			{ 'groupId': groupId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a group&#39;s voicemail policy
	 * 
	 * @param {String} groupId Group ID
	 */
	getVoicemailGroupPolicy(groupId) { 
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling getVoicemailGroupPolicy';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/groups/{groupId}/policy', 
			'GET', 
			{ 'groupId': groupId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the current user&#39;s mailbox information
	 * 
	 */
	getVoicemailMailbox() { 

		return this.apiClient.callApi(
			'/api/v2/voicemail/mailbox', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the current user&#39;s mailbox information
	 * 
	 */
	getVoicemailMeMailbox() { 

		return this.apiClient.callApi(
			'/api/v2/voicemail/me/mailbox', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List voicemail messages
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getVoicemailMeMessages(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/voicemail/me/messages', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get the current user&#39;s voicemail policy
	 * 
	 */
	getVoicemailMePolicy() { 

		return this.apiClient.callApi(
			'/api/v2/voicemail/me/policy', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a voicemail message
	 * 
	 * @param {String} messageId Message ID
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand If the caller is a known user, which fields, if any, to expand
	 */
	getVoicemailMessage(messageId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'messageId' is set
		if (messageId === undefined || messageId === null) {
			throw 'Missing the required parameter "messageId" when calling getVoicemailMessage';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/messages/{messageId}', 
			'GET', 
			{ 'messageId': messageId }, 
			{ 'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get media playback URI for this voicemail message
	 * 
	 * @param {String} messageId Message ID
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.formatId The desired media format. (default to WEBM)
	 */
	getVoicemailMessageMedia(messageId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'messageId' is set
		if (messageId === undefined || messageId === null) {
			throw 'Missing the required parameter "messageId" when calling getVoicemailMessageMedia';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/messages/{messageId}/media', 
			'GET', 
			{ 'messageId': messageId }, 
			{ 'formatId': opts['formatId'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List voicemail messages
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {String} opts.ids An optional comma separated list of VoicemailMessage ids
	 * @param {Array.<String>} opts.expand If the caller is a known user, which fields, if any, to expand
	 */
	getVoicemailMessages(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/voicemail/messages', 
			'GET', 
			{  }, 
			{ 'ids': opts['ids'],'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a policy
	 * 
	 */
	getVoicemailPolicy() { 

		return this.apiClient.callApi(
			'/api/v2/voicemail/policy', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List voicemail messages
	 * 
	 * @param {String} queueId Queue ID
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize Page size (default to 25)
	 * @param {Number} opts.pageNumber Page number (default to 1)
	 */
	getVoicemailQueueMessages(queueId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'queueId' is set
		if (queueId === undefined || queueId === null) {
			throw 'Missing the required parameter "queueId" when calling getVoicemailQueueMessages';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/queues/{queueId}/messages', 
			'GET', 
			{ 'queueId': queueId }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search voicemails using the q64 value returned from a previous search
	 * 
	 * @param {String} q64 q64
	 * @param {Object} opts Optional parameters
	 * @param {Array.<String>} opts.expand expand
	 */
	getVoicemailSearch(q64, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'q64' is set
		if (q64 === undefined || q64 === null) {
			throw 'Missing the required parameter "q64" when calling getVoicemailSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/search', 
			'GET', 
			{  }, 
			{ 'q64': q64,'expand': this.apiClient.buildCollectionParam(opts['expand'], 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a user&#39;s voicemail policy
	 * 
	 * @param {String} userId User ID
	 */
	getVoicemailUserpolicy(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getVoicemailUserpolicy';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/userpolicies/{userId}', 
			'GET', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a group&#39;s voicemail policy
	 * 
	 * @param {String} groupId Group ID
	 * @param {Object} body The group&#39;s voicemail policy
	 */
	patchVoicemailGroupPolicy(groupId, body) { 
		// verify the required parameter 'groupId' is set
		if (groupId === undefined || groupId === null) {
			throw 'Missing the required parameter "groupId" when calling patchVoicemailGroupPolicy';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchVoicemailGroupPolicy';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/groups/{groupId}/policy', 
			'PATCH', 
			{ 'groupId': groupId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update the current user&#39;s voicemail policy
	 * 
	 * @param {Object} body The user&#39;s voicemail policy
	 */
	patchVoicemailMePolicy(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchVoicemailMePolicy';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/me/policy', 
			'PATCH', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a voicemail message
	 * A user voicemail can only be modified by its associated user. A group voicemail can only be modified by a user that is a member of the group. A queue voicemail can only be modified by a participant of the conversation the voicemail is associated with.
	 * @param {String} messageId Message ID
	 * @param {Object} body VoicemailMessage
	 */
	patchVoicemailMessage(messageId, body) { 
		// verify the required parameter 'messageId' is set
		if (messageId === undefined || messageId === null) {
			throw 'Missing the required parameter "messageId" when calling patchVoicemailMessage';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchVoicemailMessage';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/messages/{messageId}', 
			'PATCH', 
			{ 'messageId': messageId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a user&#39;s voicemail policy
	 * 
	 * @param {String} userId User ID
	 * @param {Object} body The user&#39;s voicemail policy
	 */
	patchVoicemailUserpolicy(userId, body) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling patchVoicemailUserpolicy';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling patchVoicemailUserpolicy';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/userpolicies/{userId}', 
			'PATCH', 
			{ 'userId': userId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Copy a voicemail message to a user or group
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body 
	 */
	postVoicemailMessages(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/voicemail/messages', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Search voicemails
	 * 
	 * @param {Object} body Search request options
	 */
	postVoicemailSearch(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postVoicemailSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/search', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a voicemail message
	 * A user voicemail can only be modified by its associated user. A group voicemail can only be modified by a user that is a member of the group. A queue voicemail can only be modified by a participant of the conversation the voicemail is associated with.
	 * @param {String} messageId Message ID
	 * @param {Object} body VoicemailMessage
	 */
	putVoicemailMessage(messageId, body) { 
		// verify the required parameter 'messageId' is set
		if (messageId === undefined || messageId === null) {
			throw 'Missing the required parameter "messageId" when calling putVoicemailMessage';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putVoicemailMessage';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/messages/{messageId}', 
			'PUT', 
			{ 'messageId': messageId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a policy
	 * 
	 * @param {Object} body Policy
	 */
	putVoicemailPolicy(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putVoicemailPolicy';
		}

		return this.apiClient.callApi(
			'/api/v2/voicemail/policy', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class WebChatApi {
	/**
	 * WebChat service.
	 * @module purecloud-platform-client-v2/api/WebChatApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new WebChatApi. 
	 * @alias module:purecloud-platform-client-v2/api/WebChatApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Delete a WebChat deployment
	 * 
	 * @param {String} deploymentId Deployment Id
	 */
	deleteWebchatDeployment(deploymentId) { 
		// verify the required parameter 'deploymentId' is set
		if (deploymentId === undefined || deploymentId === null) {
			throw 'Missing the required parameter "deploymentId" when calling deleteWebchatDeployment';
		}

		return this.apiClient.callApi(
			'/api/v2/webchat/deployments/{deploymentId}', 
			'DELETE', 
			{ 'deploymentId': deploymentId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Remove WebChat deployment settings
	 * 
	 */
	deleteWebchatSettings() { 

		return this.apiClient.callApi(
			'/api/v2/webchat/settings', 
			'DELETE', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a WebChat deployment
	 * 
	 * @param {String} deploymentId Deployment Id
	 */
	getWebchatDeployment(deploymentId) { 
		// verify the required parameter 'deploymentId' is set
		if (deploymentId === undefined || deploymentId === null) {
			throw 'Missing the required parameter "deploymentId" when calling getWebchatDeployment';
		}

		return this.apiClient.callApi(
			'/api/v2/webchat/deployments/{deploymentId}', 
			'GET', 
			{ 'deploymentId': deploymentId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * List WebChat deployments
	 * 
	 */
	getWebchatDeployments() { 

		return this.apiClient.callApi(
			'/api/v2/webchat/deployments', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get WebChat deployment settings
	 * 
	 */
	getWebchatSettings() { 

		return this.apiClient.callApi(
			'/api/v2/webchat/settings', 
			'GET', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create WebChat deployment
	 * 
	 * @param {Object} body Deployment
	 */
	postWebchatDeployments(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling postWebchatDeployments';
		}

		return this.apiClient.callApi(
			'/api/v2/webchat/deployments', 
			'POST', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a WebChat deployment
	 * 
	 * @param {String} deploymentId Deployment Id
	 * @param {Object} body Deployment
	 */
	putWebchatDeployment(deploymentId, body) { 
		// verify the required parameter 'deploymentId' is set
		if (deploymentId === undefined || deploymentId === null) {
			throw 'Missing the required parameter "deploymentId" when calling putWebchatDeployment';
		}
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putWebchatDeployment';
		}

		return this.apiClient.callApi(
			'/api/v2/webchat/deployments/{deploymentId}', 
			'PUT', 
			{ 'deploymentId': deploymentId }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update WebChat deployment settings
	 * 
	 * @param {Object} body webChatSettings
	 */
	putWebchatSettings(body) { 
		// verify the required parameter 'body' is set
		if (body === undefined || body === null) {
			throw 'Missing the required parameter "body" when calling putWebchatSettings';
		}

		return this.apiClient.callApi(
			'/api/v2/webchat/settings', 
			'PUT', 
			{  }, 
			{  }, 
			{  }, 
			{  }, 
			body, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

class WorkforceManagementApi {
	/**
	 * WorkforceManagement service.
	 * @module purecloud-platform-client-v2/api/WorkforceManagementApi
	 * @version 26.1.1
	 */

	/**
	 * Constructs a new WorkforceManagementApi. 
	 * @alias module:purecloud-platform-client-v2/api/WorkforceManagementApi
	 * @class
	 * @param {module:purecloud-platform-client-v2/ApiClient} apiClient Optional API client implementation to use,
	 * default to {@link module:purecloud-platform-client-v2/ApiClient#instance} if unspecified.
	 */
	constructor(apiClient) {
		this.apiClient = apiClient || ApiClient.instance;
	}


	/**
	 * Get a list of UserScheduleAdherence records for the requested users
	 * 
	 * @param {Array.<String>} userId User Id(s) for which to fetch current schedule adherence information.  Min 1, Max of 100 userIds per request
	 */
	getWorkforcemanagementAdherence(userId) { 
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getWorkforcemanagementAdherence';
		}

		return this.apiClient.callApi(
			'/api/v2/workforcemanagement/adherence', 
			'GET', 
			{  }, 
			{ 'userId': this.apiClient.buildCollectionParam(userId, 'multi') }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get activity codes
	 * 
	 * @param {String} muId The ID of the management unit, or &#39;mine&#39; for the management unit of the logged-in user.
	 */
	getWorkforcemanagementManagementunitActivitycodes(muId) { 
		// verify the required parameter 'muId' is set
		if (muId === undefined || muId === null) {
			throw 'Missing the required parameter "muId" when calling getWorkforcemanagementManagementunitActivitycodes';
		}

		return this.apiClient.callApi(
			'/api/v2/workforcemanagement/managementunits/{muId}/activitycodes', 
			'GET', 
			{ 'muId': muId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get intraday queues for the given date
	 * 
	 * @param {String} muId The management unit ID of the management unit, or &#39;mine&#39; for the management unit of the logged-in user.
	 * @param {String} _date ISO-8601 date string with no time or timezone component, interpreted in the configured management unit time zone, e.g. 2017-01-23
	 */
	getWorkforcemanagementManagementunitIntradayQueues(muId, _date) { 
		// verify the required parameter 'muId' is set
		if (muId === undefined || muId === null) {
			throw 'Missing the required parameter "muId" when calling getWorkforcemanagementManagementunitIntradayQueues';
		}
		// verify the required parameter '_date' is set
		if (_date === undefined || _date === null) {
			throw 'Missing the required parameter "_date" when calling getWorkforcemanagementManagementunitIntradayQueues';
		}

		return this.apiClient.callApi(
			'/api/v2/workforcemanagement/managementunits/{muId}/intraday/queues', 
			'GET', 
			{ 'muId': muId }, 
			{ 'date': _date }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a time off request
	 * 
	 * @param {String} muId The muId of the management unit, or &#39;mine&#39; for the management unit of the logged-in user.
	 * @param {String} userId The userId to whom the Time Off Request applies.
	 * @param {String} timeOffRequestId Time Off Request Id
	 */
	getWorkforcemanagementManagementunitUserTimeoffrequest(muId, userId, timeOffRequestId) { 
		// verify the required parameter 'muId' is set
		if (muId === undefined || muId === null) {
			throw 'Missing the required parameter "muId" when calling getWorkforcemanagementManagementunitUserTimeoffrequest';
		}
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getWorkforcemanagementManagementunitUserTimeoffrequest';
		}
		// verify the required parameter 'timeOffRequestId' is set
		if (timeOffRequestId === undefined || timeOffRequestId === null) {
			throw 'Missing the required parameter "timeOffRequestId" when calling getWorkforcemanagementManagementunitUserTimeoffrequest';
		}

		return this.apiClient.callApi(
			'/api/v2/workforcemanagement/managementunits/{muId}/users/{userId}/timeoffrequests/{timeOffRequestId}', 
			'GET', 
			{ 'muId': muId,'userId': userId,'timeOffRequestId': timeOffRequestId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get a list of time off requests for a given user
	 * 
	 * @param {String} muId The muId of the management unit, or &#39;mine&#39; for the management unit of the logged-in user.
	 * @param {String} userId The userId to whom the Time Off Request applies.
	 * @param {Object} opts Optional parameters
	 * @param {Boolean} opts.recentlyReviewed Limit results to requests that have been reviewed within the preceding 30 days (default to false)
	 */
	getWorkforcemanagementManagementunitUserTimeoffrequests(muId, userId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'muId' is set
		if (muId === undefined || muId === null) {
			throw 'Missing the required parameter "muId" when calling getWorkforcemanagementManagementunitUserTimeoffrequests';
		}
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling getWorkforcemanagementManagementunitUserTimeoffrequests';
		}

		return this.apiClient.callApi(
			'/api/v2/workforcemanagement/managementunits/{muId}/users/{userId}/timeoffrequests', 
			'GET', 
			{ 'muId': muId,'userId': userId }, 
			{ 'recentlyReviewed': opts['recentlyReviewed'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get agents in the management unit
	 * 
	 * @param {String} muId The management unit ID of the management unit, or &#39;mine&#39; for the management unit of the logged-in user.
	 */
	getWorkforcemanagementManagementunitUsers(muId) { 
		// verify the required parameter 'muId' is set
		if (muId === undefined || muId === null) {
			throw 'Missing the required parameter "muId" when calling getWorkforcemanagementManagementunitUsers';
		}

		return this.apiClient.callApi(
			'/api/v2/workforcemanagement/managementunits/{muId}/users', 
			'GET', 
			{ 'muId': muId }, 
			{  }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get management units
	 * 
	 * @param {Object} opts Optional parameters
	 * @param {Number} opts.pageSize 
	 * @param {Number} opts.pageNumber  (default to 1)
	 * @param {Object} opts.expand 
	 */
	getWorkforcemanagementManagementunits(opts) { 
		opts = opts || {};
		

		return this.apiClient.callApi(
			'/api/v2/workforcemanagement/managementunits', 
			'GET', 
			{  }, 
			{ 'pageSize': opts['pageSize'],'pageNumber': opts['pageNumber'],'expand': opts['expand'] }, 
			{  }, 
			{  }, 
			null, 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Update a time off request
	 * 
	 * @param {String} muId The muId of the management unit, or &#39;mine&#39; for the management unit of the logged-in user.
	 * @param {String} userId The id of the user the requested time off request belongs to
	 * @param {String} timeOffRequestId The id of the time off request to update
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body body
	 */
	patchWorkforcemanagementManagementunitUserTimeoffrequest(muId, userId, timeOffRequestId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'muId' is set
		if (muId === undefined || muId === null) {
			throw 'Missing the required parameter "muId" when calling patchWorkforcemanagementManagementunitUserTimeoffrequest';
		}
		// verify the required parameter 'userId' is set
		if (userId === undefined || userId === null) {
			throw 'Missing the required parameter "userId" when calling patchWorkforcemanagementManagementunitUserTimeoffrequest';
		}
		// verify the required parameter 'timeOffRequestId' is set
		if (timeOffRequestId === undefined || timeOffRequestId === null) {
			throw 'Missing the required parameter "timeOffRequestId" when calling patchWorkforcemanagementManagementunitUserTimeoffrequest';
		}

		return this.apiClient.callApi(
			'/api/v2/workforcemanagement/managementunits/{muId}/users/{userId}/timeoffrequests/{timeOffRequestId}', 
			'PATCH', 
			{ 'muId': muId,'userId': userId,'timeOffRequestId': timeOffRequestId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Create a new activity code
	 * 
	 * @param {String} muId The ID of the management unit, or &#39;mine&#39; for the management unit of the logged-in user.
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body body
	 */
	postWorkforcemanagementManagementunitActivitycodes(muId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'muId' is set
		if (muId === undefined || muId === null) {
			throw 'Missing the required parameter "muId" when calling postWorkforcemanagementManagementunitActivitycodes';
		}

		return this.apiClient.callApi(
			'/api/v2/workforcemanagement/managementunits/{muId}/activitycodes', 
			'POST', 
			{ 'muId': muId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Request a historical adherence report
	 * 
	 * @param {String} muId The management unit ID of the management unit, or &#39;mine&#39; for the management unit of the logged-in user.
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body body
	 */
	postWorkforcemanagementManagementunitHistoricaladherencequery(muId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'muId' is set
		if (muId === undefined || muId === null) {
			throw 'Missing the required parameter "muId" when calling postWorkforcemanagementManagementunitHistoricaladherencequery';
		}

		return this.apiClient.callApi(
			'/api/v2/workforcemanagement/managementunits/{muId}/historicaladherencequery', 
			'POST', 
			{ 'muId': muId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Get intraday data for the given date for the requested queueIds
	 * 
	 * @param {String} muId The management unit ID of the management unit, or &#39;mine&#39; for the management unit of the logged-in user.
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body body
	 */
	postWorkforcemanagementManagementunitIntraday(muId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'muId' is set
		if (muId === undefined || muId === null) {
			throw 'Missing the required parameter "muId" when calling postWorkforcemanagementManagementunitIntraday';
		}

		return this.apiClient.callApi(
			'/api/v2/workforcemanagement/managementunits/{muId}/intraday', 
			'POST', 
			{ 'muId': muId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

	/**
	 * Query published schedules for given given time range for set of users
	 * 
	 * @param {String} muId The management unit ID of the management unit, or &#39;mine&#39; for the management unit of the logged-in user.
	 * @param {Object} opts Optional parameters
	 * @param {Object} opts.body body
	 */
	postWorkforcemanagementManagementunitSchedulesSearch(muId, opts) { 
		opts = opts || {};
		
		// verify the required parameter 'muId' is set
		if (muId === undefined || muId === null) {
			throw 'Missing the required parameter "muId" when calling postWorkforcemanagementManagementunitSchedulesSearch';
		}

		return this.apiClient.callApi(
			'/api/v2/workforcemanagement/managementunits/{muId}/schedules/search', 
			'POST', 
			{ 'muId': muId }, 
			{  }, 
			{  }, 
			{  }, 
			opts['body'], 
			['PureCloud Auth'], 
			['application/json'], 
			['application/json']
		);
	}

}

/**
 * A JavaScript library to interface with the PureCloud Platform API.<br>
 * The <code>index</code> module provides access to constructors for all the classes which comprise the public API.
 * <p>
 * An AMD (recommended!) or CommonJS application will generally do something equivalent to the following:
 * <pre>
 * var platformClient = require('purecloud-platform-client-v2/index'); // See note below*.
 * var xxxSvc = new platformClient.XxxApi(); // Allocate the API class we're going to use.
 * var yyyModel = new platformClient.Yyy(); // Construct a model instance.
 * yyyModel.someProperty = 'someValue';
 * ...
 * var zzz = xxxSvc.doSomething(yyyModel); // Invoke the service.
 * ...
 * </pre>
 * <em>*NOTE: For a top-level AMD script, use require(['purecloud-platform-client-v2/index'], function(){...})
 * and put the application logic within the callback function.</em>
 * </p>
 * <p>
 * A non-AMD browser application (discouraged) might do something like this:
 * <pre>
 * var xxxSvc = new platformClient.XxxApi(); // Allocate the API class we're going to use.
 * var yyy = new platformClient.Yyy(); // Construct a model instance.
 * yyyModel.someProperty = 'someValue';
 * ...
 * var zzz = xxxSvc.doSomething(yyyModel); // Invoke the service.
 * ...
 * </pre>
 * </p>
 * @module purecloud-platform-client-v2/index
 * @version 26.1.1
 */
class platformClient {
	constructor() {
		/**
		 * The ApiClient constructor.
		 * @property {module:purecloud-platform-client-v2/ApiClient}
		 */
		this.ApiClient = new ApiClient();
		/**
		 * The AlertingApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/AlertingApi}
		 */
		this.AlertingApi = AlertingApi;
		/**
		 * The AnalyticsApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/AnalyticsApi}
		 */
		this.AnalyticsApi = AnalyticsApi;
		/**
		 * The ArchitectApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/ArchitectApi}
		 */
		this.ArchitectApi = ArchitectApi;
		/**
		 * The AttributesApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/AttributesApi}
		 */
		this.AttributesApi = AttributesApi;
		/**
		 * The AuthorizationApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/AuthorizationApi}
		 */
		this.AuthorizationApi = AuthorizationApi;
		/**
		 * The BillingApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/BillingApi}
		 */
		this.BillingApi = BillingApi;
		/**
		 * The ContentManagementApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/ContentManagementApi}
		 */
		this.ContentManagementApi = ContentManagementApi;
		/**
		 * The ConversationsApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/ConversationsApi}
		 */
		this.ConversationsApi = ConversationsApi;
		/**
		 * The ExternalContactsApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/ExternalContactsApi}
		 */
		this.ExternalContactsApi = ExternalContactsApi;
		/**
		 * The FaxApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/FaxApi}
		 */
		this.FaxApi = FaxApi;
		/**
		 * The GeneralDataProtectionRegulationApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/GeneralDataProtectionRegulationApi}
		 */
		this.GeneralDataProtectionRegulationApi = GeneralDataProtectionRegulationApi;
		/**
		 * The GeolocationApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/GeolocationApi}
		 */
		this.GeolocationApi = GeolocationApi;
		/**
		 * The GreetingsApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/GreetingsApi}
		 */
		this.GreetingsApi = GreetingsApi;
		/**
		 * The GroupsApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/GroupsApi}
		 */
		this.GroupsApi = GroupsApi;
		/**
		 * The IdentityProviderApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/IdentityProviderApi}
		 */
		this.IdentityProviderApi = IdentityProviderApi;
		/**
		 * The IntegrationsApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/IntegrationsApi}
		 */
		this.IntegrationsApi = IntegrationsApi;
		/**
		 * The LanguagesApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/LanguagesApi}
		 */
		this.LanguagesApi = LanguagesApi;
		/**
		 * The LicenseApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/LicenseApi}
		 */
		this.LicenseApi = LicenseApi;
		/**
		 * The LocationsApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/LocationsApi}
		 */
		this.LocationsApi = LocationsApi;
		/**
		 * The MobileDevicesApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/MobileDevicesApi}
		 */
		this.MobileDevicesApi = MobileDevicesApi;
		/**
		 * The NotificationsApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/NotificationsApi}
		 */
		this.NotificationsApi = NotificationsApi;
		/**
		 * The OAuthApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/OAuthApi}
		 */
		this.OAuthApi = OAuthApi;
		/**
		 * The OrganizationApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/OrganizationApi}
		 */
		this.OrganizationApi = OrganizationApi;
		/**
		 * The OrganizationAuthorizationApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/OrganizationAuthorizationApi}
		 */
		this.OrganizationAuthorizationApi = OrganizationAuthorizationApi;
		/**
		 * The OutboundApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/OutboundApi}
		 */
		this.OutboundApi = OutboundApi;
		/**
		 * The PresenceApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/PresenceApi}
		 */
		this.PresenceApi = PresenceApi;
		/**
		 * The QualityApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/QualityApi}
		 */
		this.QualityApi = QualityApi;
		/**
		 * The RecordingApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/RecordingApi}
		 */
		this.RecordingApi = RecordingApi;
		/**
		 * The ResponseManagementApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/ResponseManagementApi}
		 */
		this.ResponseManagementApi = ResponseManagementApi;
		/**
		 * The RoutingApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/RoutingApi}
		 */
		this.RoutingApi = RoutingApi;
		/**
		 * The ScriptsApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/ScriptsApi}
		 */
		this.ScriptsApi = ScriptsApi;
		/**
		 * The SearchApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/SearchApi}
		 */
		this.SearchApi = SearchApi;
		/**
		 * The StationsApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/StationsApi}
		 */
		this.StationsApi = StationsApi;
		/**
		 * The SuggestApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/SuggestApi}
		 */
		this.SuggestApi = SuggestApi;
		/**
		 * The TelephonyProvidersEdgeApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/TelephonyProvidersEdgeApi}
		 */
		this.TelephonyProvidersEdgeApi = TelephonyProvidersEdgeApi;
		/**
		 * The TokensApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/TokensApi}
		 */
		this.TokensApi = TokensApi;
		/**
		 * The UserRecordingsApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/UserRecordingsApi}
		 */
		this.UserRecordingsApi = UserRecordingsApi;
		/**
		 * The UsersApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/UsersApi}
		 */
		this.UsersApi = UsersApi;
		/**
		 * The UtilitiesApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/UtilitiesApi}
		 */
		this.UtilitiesApi = UtilitiesApi;
		/**
		 * The VoicemailApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/VoicemailApi}
		 */
		this.VoicemailApi = VoicemailApi;
		/**
		 * The WebChatApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/WebChatApi}
		 */
		this.WebChatApi = WebChatApi;
		/**
		 * The WorkforceManagementApi service constructor.
		 * @property {module:purecloud-platform-client-v2/api/WorkforceManagementApi}
		 */
		this.WorkforceManagementApi = WorkforceManagementApi;
	}
}

//export default platformClient;
var index = new platformClient();

module.exports = index;
