## Pre-Requisites

An Okta account. If you do not have an Okta account, you can create a Developer Edition Account at [https://developer.okta.com/signup/](https://developer.okta.com/signup/)

An Onfido account. If you do not already have one, you can request a Sandbox Account at [https://onfido.com/signup/](https://onfido.com/signup/) 

NodeJS Development Environment (NodeJS 12+)

### Add an OpenID Connect Client in Okta

* Log into the Okta Developer Dashboard, and Create New App
* Choose Single Page App (SPA) as the platform, then populate your new OpenID Connect app with values similar to:

Setting | Value
------------ | -------------
App Name | Sample Login App(must be unique)
Login redirect URIs | http://localhost:8080/login/callback
Logout redirect URIs | http://localhost:8080/login
Allowed grant types | Authorization Code

> Note: CORS is automatically enabled for the granted login redirect URIs, but please verify this in Security > API > Trusted Origin. 

### Create an Onfido API Token
* Log into the Onfido Dashboard, select Developers tab from the side menu, select Tokens, and Generate API Token. 
* Set the Token scope for either Sandbox (recommended for this guide) or Live (production or Live Trial).
* Save the API Token generated in a secure location. You will not be able to retrieve this token value after exiting the pop-up window.

### Extend Okta User Profile
Create the following profile attributes in both the default Okta profile and the OIDC Single Page App created above:
* Onfido IDV Status
  - Data Type: string
  - Display Name: Onfido IDV Status
  - Variable Name: onfidoIdvStatus
* Onfido Applicant ID
  - Data Type: string
  - Display Name: Onfido Applicant ID
  - Variable Name: onfidoApplicantId
* Registering App
  - Data Type: string
  - Display Name: Registering App
  - Variable Name: registeringApp

>Note: Once you have created the profile attributes above, make sure they are mapped to the application profile as well if it was created under the default Okta profile.

### Add Custom Claim to Okta Authorization Server
  1. Login to your Okta instance as an Admin and navigate to Security > API.
  2. On the default Authorization server, click the "Edit" Icon.
  3. Click on the Claims tab and select Add Claim.
  4. Create the following claims:
     1. onfidoApplicantId
        * Name: onfidoApplicantId
        * Include in token type: ID Token | Always
        * Value type: Expression
        * Value: user.onfidoApplicantId
        * Include In: The following scopes - profile
      2. onfidoIdvStatus
        * Name: onfidoIdvStatus
        * Include in token type: ID Token | Always
        * Value type: Expression
        * Value: user.onfidoIdvStatus
        * Include In: The following scopes - profile

### Configure IDP Factor
* Navigate to your Okta instance and go to Security > Identity Providers.
* Click Add Identity Provider and select Add OpenID Connect IdP.
* The settings used to create this will be based off of the .env configuration and the FQDN of the onfido-wrapper:
  * Name: Identity Verification
  * IdP Usage: Factor Only
  * Client ID: onfidowrapper
  * Client Secret: somerandomstring
  * Scopes: openid, profile
  * Issuer: this should match the .env config
  * Authorization endpoint: FQDN/auth
  * Token endpoint: FQDN/token
  * JWKS endpoint: FQDN/jwks
  * Userinfo endpoint: FQDN/me

### Create Dynamic Group Rules
* In your Okta instance navigate to Directory > Groups.
* Create 3 groups with the following names:
  * Example App 1
  * Example Failed IDV
  * Example IDV Always
* Click on Rules.
* Click add Rule and give it the name Require IDV.
* Set the IF to Use basic condition with User attribute, registeringApp | string, Equals, nt-app1
* Set Then to assign the user to Example App 1 Group and save.
* Create a new rule and give it the name Failed IDV.
* Set the IF to Use Okta Expression Language and use the following: user.onfidoIdvStatus != "clear" AND isMemberOfGroupName("Example App 1")
* Set the THEN to assign to Example Failed IDV group and save. 

### Assign Groups & Enrollment
* Make sure that the Example App 1 group is mapped to the Sample Login App created in the early steps of this guide.
* Navigate to Security > Multifactor.
* Configure the IDP Factor to use the OIDC Factor created above.
* Navigate to Factor Enrollment.
* Add Multifactor Policy and set only IdP Factor to required, and all others to disabled. 
* Assigned to groups Example App 1

### Wrapper Config

* APP_URL: this is the URL that the wrapper is running as, should be a FQDN.
* ISSUER: this is the OIDC Issuer the wrapper will identify as.
* PORT: the port the wrapper will run on.
* SECURE_KEYS: should provide 3 comma separated strings to secure cookie rotation. 
* OIDC_CLIENT_ID: this should match what was created in Okta for the IDP factor
* OIDC_CLIENT_SECRET: this should match what was created in Okta for the IDP factor
* OIDC_REDIRECT_URI: this comes from Okta once you create the IDP.
* OKTA_ORG_URL: this is your Okta URL
* OKTA_TOKEN: an API token for your Okta instance
* REGION: your Onfido Region
* ONFIDO_TOKEN: your Onfido API Token
* CHECK_WORKFLOW_ALIAS: the alias of the Create Check Workflow in Okta Workflows
* CHECK_WORKFLOW_TOKEN: the token of the Create Check Workflow in Okta Workflows
* WORKFLOW_URL: the base workflows URL 


### Workflows
* Import the .folder from this repo into your workflows environment.
* Navigate to the Connections and modify the Onfido Wrapper HTTP connection with the proper Token value in the Authorization Header
* In the handle webhook flow, you will need to update the webhook token once you have created one on the Onfido side. 