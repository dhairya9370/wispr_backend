const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("../models/users");

const configurePassport = () => {
    passport.use(new LocalStrategy(User.authenticate()));
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());
    return passport;
};

module.exports = configurePassport;
