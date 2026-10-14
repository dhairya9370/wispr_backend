const passport = require("passport");
const User = require("../models/users");

exports.getSessionInfo = (req, res) => {
    res.json({
        authenticated: req.isAuthenticated(),
        user: req.user,
        sessionId: req.sessionID,
        cookies: req.headers.cookie,
        headers: req.headers
    });
};

exports.login = (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            console.error("Authentication error:", err);
            return res.status(500).json({
                success: false,
                message: "Authentication error"
            });
        }

        if (!user) {
            return res.status(401).json({
                success: false,
                message: info?.message || "Invalid credentials"
            });
        }

        req.login(user, (loginErr) => {
            if (loginErr) {
                console.error("Login error:", loginErr);
                return res.status(500).json({
                    success: false,
                    message: "Login failed"
                });
            }

            const userResponse = {
                _id: user._id,
                username: user.username,
                email: user.email
            };

            res.json({
                success: true,
                message: "Login successful",
                user: userResponse
            });
        });
    })(req, res, next);
};

exports.logout = (req, res) => {
    req.logout(() => {
        req.session.destroy();
        res.json({ message: "Logged out" });
    });
};

exports.register = (req, res) => {
    const { id, email, password } = req.body;
    const newUser = new User({
        username: id.toUpperCase(),
        email,
        name: id.toUpperCase(),
        collegeId: "IIITN"
    });

    User.register(newUser, password.toString(), (err, user) => {
        if (err) {
            console.error("Register Error:", err);
            return res.status(500).json({ message: "Registration Failed", error: err.message });
        }
        req.login(user, (loginErr) => {
            if (loginErr) {
                console.error("Login after register failed:", loginErr);
                return res.status(500).json({ message: "Login Failed", error: loginErr.message });
            }
            res.json({ message: "Registered and logged in", user });
        });
    });
};

exports.setupProfile = async (req, res) => {
    try {
        const { id, formData } = req.body;

        if (!id || !formData) {
            return res.status(400).json({ message: "Missing Credentials" });
        }
        const { dp, theme, name, wallpaper, language } = formData;
        const updateFields = {};
        if (name?.trim()) updateFields.name = name;
        if (dp?.trim()) updateFields["ui.dp"] = dp;
        if (theme?.trim()) updateFields["ui.background"] = theme;
        if (wallpaper?.trim()) updateFields["ui.wallpaper"] = wallpaper;
        if (language?.trim()) updateFields["ui.language"] = language;

        const result = await User.findByIdAndUpdate(
            id.toString(),
            { $set: updateFields },
            { new: true }
        );

        return res.status(200).json({ message: "Profile updated", user: result });
    } catch (err) {
        console.error("Setup profile error:", err);
        return res.status(500).json({ message: "Failed to update profile" });
    }
};
