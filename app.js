var express = require('express');
require('dotenv').config();
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var helmet = require('helmet');
var url = require('url');
var Provider = require('oidc-provider');
var configuration = require('./support/configuration');
var routes = require('./routes/index');

var corsOptions = {
  origin: ['https://assets.onfido.com', process.env.APP_URL, "https://code.jquery.com"],
  optionsSuccessStatus: 200,
};

var app = express();

app.use(cors(corsOptions));
/* app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "https://assets.onfido.com", "https://code.jquery.com", "'nonce-23453421'" ]
    }
  }
})); */

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

let server;
(async ()=> {
  const prod = process.env.NODE_ENV === 'production';

  if (prod) {
    set(configuration, 'cookies.short.secure', true);
    set(configuration, 'cookies.long.secure', true);
  }

  const provider = new Provider(process.env.ISSUER, { ...configuration });
  
  if (prod) {
    app.enable('trust proxy');
    provider.proxy = true;

    app.use((req, res, next) => {
      if (req.secure) {
        next();
      } else if (req.method === 'GET' || req.method === 'HEAD') {
        res.redirect(url.format({
          protocol: 'https',
          host: req.get('host'),
          pathname: req.originalUrl,
        }));
      } else {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'please use https',
        });
      }
    });
  }

  routes(app, provider);
  app.use(provider.callback);

  server = app.listen(process.env.PORT || 3000, () => {
    console.log(`application is listening on port: ${process.env.PORT}, check its /.well-known/openid-configuration`);
  });
})().catch((err) => {
  if (server && server.listening) server.close();
  console.error(err);
  process.exitCode = 1;
});
