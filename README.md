# platform-client-sdk-javascript-beta

This project is a BETA version of the JavaScript SDK for the PureCloud API ([platform-client-sdk-javascript](https://github.com/MyPureCloud/platform-client-sdk-javascript)). The purpose of this repo is to allow the community to test a new build/distribution model for the SDK before it's released in production. 


## Distributions

To use this beta version, look in the `build/dist/` folder in this repo for the new distributions:


**CommonJS**

This is equivalent to the existing node package [purecloud-platform-client-v2](https://www.npmjs.com/package/purecloud-platform-client-v2).

* `build/dist/node/purecloud-platform-client-v2.js` - A CommonJS (CJS) module. 


**AMD**

An AMD module for use with require.js

* `build/dist/web-amd/purecloud-platform-client-v2.js` - An AMD module for use with require.js
* `build/dist/web-amd/purecloud-platform-client-v2.min.js` - Minified version of purecloud-platform-client-v2.js


**CommonJS for web**

This is equivalent to the existing CJS module that has been browserified and is available via the [SDK CDN](https://sdk-cdn.mypurecloud.com/javascript/26.1.0/purecloud-platform-client-v2.min.js).

* `build/dist/web-cjs/bundle.js` - A CommonJS (CJS) module. Same as the CommonJS module above, but superagent is explicitly excluded from it.
* `build/dist/web-cjs/purecloud-platform-client-v2.js` - bundle.js above, but processed with browserify to include the superagent dependency.
* `build/dist/web-cjs/purecloud-platform-client-v2.min.js` - Minified version of purecloud-platform-client-v2.js


## ES6 Source Classes

This beta version of the SDK uses the standard build process for the SDKs, but the templates have been updated to generate ES6 classes and transpile them using [rollup.js](https://rollupjs.org/). The code for this process can be found in the `API-3234-js-sdk-es6` branch in the [platform-client-sdk-common](https://github.com/purecloudlabs/platform-client-sdk-common/tree/API-3234-js-sdk-es6) repo.

The ES6 source code can be found in the repo in the `build/src/purecloud-platform-client-v2/` folder. This can be consumed directly by anything capable of consuming JavaScript classes written to ES6 standards (e.g. rollup or webpack).



# Feedback

This project exists to collect feedback from the community. So if you have something to say, good, bad, or otherwise, please post on the [PureCloud Developer Forum](https://developer.mypurecloud.com/forum/c/platform-api/javascript-sdk). If there are any build/distribution methods that you would like that haven't been implemented, please let us know what you want to see. We want to hear from you!

Additionally, this project only intends to offer additional packaging methods for the SDK. If there are changes that change how the SDK is used, they are unintentional and should be reported on the forum. 



# Example apps

## AMD

This example uses the AMD module in a web environment with [require.js](http://requirejs.org/	) to perform an implicit grant login and retrieves the user's information.

Code is in `platform-client-sdk-javascript-beta/examples/amd/`


### Running the example

1. Install the [http-server](https://www.npmjs.com/package/http-server) package globally: `npm i -g http-server`
2. In the root of this repo, run `http-server -c0` to start a web server that does not cache responses
3. Navigate to http://localhost:8080/examples/amd/ to test the page


### Notes 

* This example comes with a valid client ID that works for http://localhost:8080/examples/amd/. If you change this URL, you must generate your own OAuth client for an implicit grant.
* Superagent is not packaged with the SDK and must be resolved separately using require.js. The example does this by pulling it from a CDN.
* This example pulls the SDK locally, but once this is released, the AMD SDK js file will be hosted on a CDN.



## Node.js

This example uses the CommonJS (CJS) module in a [node.js](https://nodejs.org/) script to authenticate using client credentials and retrieve a list of users in the org.

Code is in `platform-client-sdk-javascript-beta/examples/node/`


### Running the example

1. Set environment variables: `PURECLOUD_CLIENT_ID` and `PURECLOUD_CLIENT_SECRET` to the client ID and secret for a [client credentials OAuth client](https://developer.mypurecloud.com/api/rest/authorization/use-client-credentials.html).
2. `cd` to `platform-client-sdk-javascript-beta/examples/node/`
3. Run `node index.js` to run the script


### Notes

* This example requires the module from a local path, but once this is released, this module will be published as the existing [purecloud-platform-client-v2](https://www.npmjs.com/package/purecloud-platform-client-v2).
* You must [create your own](https://developer.mypurecloud.com/api/rest/authorization/create-oauth-client-id.html) client credentials OAuth client for this example as client credentials are specific to the org in which they were created.



## React

This example is a [React](https://reactjs.org/) app that uses the SDK to perform an implicit grant login and retrieves the user's information.

Code is in `platform-client-sdk-javascript-beta/examples/react/`


### Running the example

1. `cd` to `platform-client-sdk-javascript-beta/examples/react/`
2. Run `yarn install` to install dependencies
3. Run `yarn start` to start the dev server


### Notes

* This example comes with a valid client ID that works for http://localhost:3000/. If you change this URL, you must generate your own OAuth client for an implicit grant.
* This project was created by running `create-react-app` and then `yarn eject` to eject the internal/dynamic config files. This is necessary to configure webpack to choose the correct source files for the SDK. The project is untouched except for the following edits:
	* `package.json` was edited to add the local SDK as a dependency: `"purecloud-platform-client-v2": "../../build"`
	* `config/webpack.config.dev.js` and `config/webpack.config.prod.js` were edited to add `mainFields: ['jsnext:main', 'browser', 'module', 'main'],` to the `resolve` property in the config.
	* `src/App.js` was modified to import the SDK, log in using an implicit grant, and display the logged in user's name.
