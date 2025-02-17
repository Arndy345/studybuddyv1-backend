const passport = require('passport');
const Account = require('../model/account');
const JwtStrategy = require('passport-jwt').Strategy;

const config = require('../config/index');
const { RESPONSE_MESSAGE } = require('../constant');
const responseHandler = require('../utils/responseHandler');

const tokenExtractor = function (req) {
  let authorization = req.headers.authorization;
  if (authorization) {
    authorization = authorization.split(' ')[1];
    return authorization;
  }
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['jwt_token'];
  }
  return token;
};

const opts = {};
opts.jwtFromRequest = tokenExtractor;
opts.secretOrKey = config.jwt.secret;

passport.use(
  new JwtStrategy(opts, (payload, done) => {
    Account.findById(payload.id, (err, user) => {
      if (err) {
        return done(err, false);
      } else if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    });
  })
);

exports.verifyUser = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) {
      req.user = user;
      return next();
    }
    return new responseHandler(
      res,
      undefined,
      401,
      RESPONSE_MESSAGE.UNAUTHORIZED
    );
  })(req, res, next);
};

exports.authOptional = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) req.user = user;
    return next();
  })(req, res, next);
};

exports.authEmailIsVerified = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user) => {
    if (user) {
      if (user.emailIsVerified) {
        req.user = user;
        return next();
      } else {
        return new responseHandler(
          res,
          undefined,
          403,
          RESPONSE_MESSAGE.NOT_VERIFIED
        );
      }
    }

    return new responseHandler(
      res,
      undefined,
      401,
      RESPONSE_MESSAGE.UNAUTHORIZED
    );
  })(req, res, next);
};
