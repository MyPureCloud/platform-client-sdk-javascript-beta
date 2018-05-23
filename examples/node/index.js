const platformClient = require('../../build/dist/node/purecloud-platform-client-v2');

let clientId = process.env.PURECLOUD_CLIENT_ID;
let clientSecret = process.env.PURECLOUD_CLIENT_SECRET;

let client = platformClient.ApiClient.instance;
let usersApi = new platformClient.UsersApi();

client.loginClientCredentialsGrant(clientId, clientSecret)
	.then(() => {
		// Do authenticated things
		return usersApi.getUsers();
	})
	.then((usersList) => {
		console.log(`Got ${usersList.entities.length} users`);
	})
	.catch((err) => {
		// Handle failure response
		console.log(err);
		process.exitCode = 1;
	});
