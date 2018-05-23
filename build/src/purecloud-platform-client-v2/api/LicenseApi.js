import ApiClient from '../ApiClient.js';


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


export default LicenseApi;