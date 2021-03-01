const { interactionPolicy: { Prompt, base: policy } } = require('oidc-provider');
const jwks = require('./jwks.json');

const interactions = policy();

const secureKeys = process.env.SECURE_KEYS || '';

module.exports = {
  clients: [
    {
      client_id: process.env.OIDC_CLIENT_ID,
      client_secret: process.env.OIDC_CLIENT_SECRET,
      redirect_uris: [process.env.OIDC_REDIRECT_URI],
      grant_types: ['refresh_token', 'authorization_code', 'implicit'],
    },
  ],
  interactions: {
    policy: interactions,
    url(ctx, interaction) {
      return `/interaction/${ctx.oidc.uid}`;
    }
  },
  extractAccessTokenClaims: async (ctx, token) => ({
    preferred_username: token.accountId,
  }),
  findAccount: async (ctx, id) => ({
    accountId: id,
    claims: async () => ({
      sub: id,
      preferred_username: id,
    }),
  }),
  cookies: {
    long: { signed: true, maxAge: (1 * 24 * 60 * 60) * 1000 },
    short: { signed: true },
    keys: secureKeys.split(','),
  },
  claims: {
    profile: ['preferred_username'],
  },
  jwks,
  ttl: {
    AccessToken: 1 * 60 * 60,
    AuthorizationCode: 10 * 60,
    IdToken: 1 * 60 * 60,
    RefreshToken: 1 * 24 * 60 * 60,
  },
  features: {
    devInteractions: {
      enabled: false,
    },
  },
};
