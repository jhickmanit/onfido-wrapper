const { strict: assert } = require('assert');
const querystring = require('querystring');
const { inspect } = require('util');

const isEmpty = require('lodash/isEmpty');
const { getUserApplicantId, generateSDKToken, createCheck} = require('../support/api');

const keys = new Set();
const debug = (obj) => querystring.stringify(Object.entries(obj).reduce((acc, [key, value]) => {
  keys.add(key);
  if (isEmpty(value)) return acc;
  acc[key] = inspect(value, { depth: null });
  return acc;
}, {}), '<br/>', ': ', {
  encodeURIComponent(value) { return keys.has(value) ? `<strong>${value}</strong>` : value; },
});

module.exports = (app, provider) => {
  const { constructor: { errors: { SessionNotFound }}} = provider;

  /* app.use((req, res, next) => {
    const orig = res.render;
    res.render = (view, locals) => {
      app.render(view, locals, (err, html) => {
        if (err) throw err;
        orig(res, 'layout', {
          ...locals,
          body: html,
        });
      });
    };
    next();
  }); */

  function setNoCache(req, res, next) {
    res.set('Pragma', 'no-cache');
    res.set('Cache-Control', 'no-cache, no-store');
    next();
  }

  app.get('/interaction/:uid', setNoCache, async (req, res, next) => {
    try {
      const {
        uid, prompt, params, session,
      } = await provider.interactionDetails(req, res);

      const client = await provider.Client.find(params.client_id);

      switch (prompt.name) {
        case 'login': {
          const applicantId = await getUserApplicantId(params.login_hint);
          const sdkToken = await generateSDKToken(applicantId);
          params.sdkToken = sdkToken;
          params.applicantId = applicantId;
          return res.render('login', {
            client,
            uid,
            details: prompt.details,
            params,
            title: 'Verify Identity',
            session: session ? debug(session): undefined,
            dbg: {
              params: debug(params),
              prompt: debug(prompt),
            },
          });
        }
        case 'consent': {
          const { prompt: { name, details } } = await provider.interactionDetails(req, res);
          assert.strictEqual(name, 'consent');
          const consent = {};
          consent.replace = false;
          const result = { consent };
          await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
        }
        default: 
          return undefined;
      }
    } catch (err) {
      return next(err);
    }
  });

  app.post('/interaction/:uid/login', setNoCache, async (req, res, next) => {
    try {
      const { prompt: { name } } = await provider.interactionDetails(req, res);
      assert.strictEqual(name, 'login');
      const applicant = req.body.applicantId;
      const userId = req.body.userId;
      createCheck(applicant, userId);
      const result = {
        login: {
          account: userId,
        },
      };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: false });
    } catch (err) {
      next(err);
    }
  });

  app.post('/interaction/:uid/confirm', setNoCache, async (req, res, next) => {
    try {
      const { prompt: { name, details } } = await provider.interactionDetails(req, res);
      assert.strictEqual(name, 'consent');
      const consent = {};
      consent.replace = false;
      const result = { consent };
      await provider.interactionFinished(req, res, result, { mergeWithLastSubmission: true });
    } catch (err) {
      next (err);
    }
  })

  app.use((err, req, res, next) => {
    if (err instanceof SessionNotFound) {
      next({err, session: 'session not found'});
    }
    next(err);
  });
}