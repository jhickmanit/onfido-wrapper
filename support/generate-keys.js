const fs = require('fs');
const path = require('path');
const jose = require('jose');

const keystore = new jose.JWKS.KeyStore();

Promise.all([
  keystore.generate('RSA', 2048, { use: 'sig' }),
]).then(() => {
  fs.writeFileSync(path.resolve('support/jwks.json'), JSON.stringify(keystore.toJWKS(true), null, 2));
});