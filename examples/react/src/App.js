import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

/* This requires that the react app's config be "ejected" and set resolve.mainFields to 
 * ['jsnext:main', 'browser', 'module', 'main']
 * This tells webpack to look for the jsnext:main entry point first and use the ES6 classes in the SDK
 */
import platformClient from 'purecloud-platform-client-v2';

class App extends Component {
	constructor(props) {
		super(props);
		this.state = {};

		// Setup
		const client = platformClient.ApiClient.instance;
		const usersApi = new platformClient.UsersApi();
		client.setPersistSettings(true, 'custom_app');
		// client.setDebugLog(console.log, 25);
		const redirectUri = 'http://localhost:8080/examples/amd/';
		const clientId = 'babbc081-0761-4f16-8f56-071aa402ebcb';
		const localState = (new Date()).getTime();
		console.log(`state=${localState}`);

		// Connect
		client.loginImplicitGrant(clientId, redirectUri, { state: localState })
			.then((res) => {
				console.log('logged in');
				console.log(res);
				console.log(res.state === localState ? 'State match' : `Different state: ${res.state}`);

				// Get logged in user's info
				return usersApi.getUsersMe();
			})
			.then((res) => {
				this.setState({ name: res.name });
				console.log(res);
			})
			.catch((err) => {
				// Handle failure response
				console.log(err);
			});
	}

	render() {
		console.log(platformClient);
		return (
			<div className="App">
				<header className="App-header">
					<img src={logo} className="App-logo" alt="logo" />
					<h1 className="App-title">Welcome to React {this.state.name}</h1>
				</header>
				<p className="App-intro">
					To get started, edit <code>src/App.js</code> and save to reload.
				</p>
			</div>
		);
	}
}

export default App;
