const okta = require('@okta/okta-sdk-nodejs');
const { Onfido, Region } = require('@onfido/api');
const got = require('got');

const oktaClient = new okta.Client({
  orgUrl: process.env.OKTA_ORG_URL,
  token: process.env.OKTA_TOKEN,
});

const onfidoRegion = process.env.REGION || 'US';
const onfidoClient = new Onfido({
  apiToken: process.env.ONFIDO_TOKEN,
  region: onfidoRegion === 'EU' ? Region.EU : onfidoRegion === 'US' ? Region.US : onfidoRegion === 'CA' ? Region.CA : Region.EU, 
})

const flowUrl = process.env.WORKFLOW_URL || '';
const workflowURL = flowUrl.endsWith('/') ? flowUrl.slice(0, -1) : flowUrl;
const createCheckAlias = process.env.CHECK_WORKFLOW_ALIAS || '';
const createCheckToken = process.env.CHECK_WORKFLOW_TOKEN || ''

exports.getUserApplicantId = (userId) => {
  return oktaClient.getUser(userId).then(user => {
    return user.profile.onfidoApplicantId;
  });
};

exports.generateSDKToken = (applicantId) => {
  return onfidoClient.sdkToken.generate({ applicantId, referrer: '*://*/*'}).then(token => {
    return token;
  });
};

exports.getIssuingCountry = (documentId) => {
  return onfidoClient.autofill.perform(documentId).then(document => {
    return document.documentClassification.issuingCountry;
  })
}

exports.createCheck = (applicantId, userId, issuingCountry) => {
  return got(`${workflowURL}/api/flo/${createCheckAlias}/invoke?clientToken=${createCheckToken}`, { method: 'POST', json: {
    applicantId: applicantId,
    userId: userId,
    issuingCountry: issuingCountry,
  }}).then(response => {
    return response;
  });
}