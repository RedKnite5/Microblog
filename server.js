const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");
const express = require("express");
const expressHandlebars = require("express-handlebars");
const session = require("express-session");
const favicon = require("serve-favicon");
const canvas = require("canvas");
const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const helmet = require("helmet")
const rateLimit = require("express-rate-limit");
const csrf = require("csurf");
const multer = require("multer");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();
const accessToken = process.env.EMOJI_API_KEY;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/images/");
    },
    filename: (req, file, cb) => {
        const user = req.session.userId;
        cb(null, `${user}.png`); // Generate a unique filename
    }
});

const upload = multer({storage: storage});

const csrfProtection = csrf();

const app = express();
const PORT = 3000;

let allEmojis = [];

/*
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Handlebars Helpers

    Handlebars helpers are custom functions that can be used within the templates
    to perform specific tasks. They enhance the functionality of templates and
    help simplify data manipulation directly within the view files.

    In this project, two helpers are provided:

    1. toLowerCase:
       - Converts a given string to lowercase.
       - Usage example: {{toLowerCase "SAMPLE STRING"}} -> "sample string"

    2. ifEq:
       - Compares two values for equality and returns a block of content based on
         the comparison result.
       - Usage example:
            {{#ifEq value1 value2}}
                <!-- Content if value1 equals value2 -->
            {{else}}
                <!-- Content if value1 does not equal value2 -->
            {{/ifEq}}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/

// Set up Handlebars view engine with custom helpers
app.engine(
    "handlebars",
    expressHandlebars.engine({
        helpers: {
            toLowerCase: function (str) {
                return str.toLowerCase();
            },
            ifEq: function (v1, v2, options) {
                if (v1 === v2) {
                    return options.fn(this);
                }
                return options.inverse(this);
            },
            sanitizeURL: function (str) {
                return encodeURIComponent(str);
            }
        },
    })
);

app.set("view engine", "handlebars");
app.set("views", "./views");

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(helmet());

const myRateLimit = rateLimit({
    windowMs: 60*1000,  // 1 minute
    max: 250,
    message: "You have exceeded your 250 requests per minute limit.",
    headers: true,
});
app.use(myRateLimit);

app.use(
    session({
        secret: "oneringtorulethemall",     // Secret key to sign the session ID cookie
        resave: false,                      // Don"t save session if unmodified
        saveUninitialized: false,           // Don"t create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files.
//
app.use((req, res, next) => {
    res.locals.appName = "Basic Blog";
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = "Post";
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || "";
    res.locals.user = {};
    res.locals.hashedGoogleId = null;
    res.locals.sortCriteria = "id";
    next();
});

app.use(express.static("public"));                  // Serve static files
app.use(express.urlencoded({extended: true}));      // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

app.use(favicon(__dirname + "/public/images/favicon.ico"));

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Home route: render home view with posts and user
// We pass the posts and user variables into the home
// template
//
app.get("/", csrfProtection, async (req, res) => {
    if (req.session.sortCriteria === undefined) {
        req.session.sortCriteria = "id";
    }
    const sortCriteria = req.session.sortCriteria;
    const posts = await getPosts(req.session.sortCriteria);
    const user = getCurrentUser(req) || {};
    res.render("home", {posts, user, accessToken, sortCriteria, csrfToken: req.csrfToken()});
});

app.get("/sort/:criteria", (req, res) => {
    if (["id", "likes"].includes(req.params.criteria)) {
        req.session.sortCriteria = req.params.criteria;
        res.redirect("/");
        return;
    }
    res.redirect("/");
});


app.get("/login", (req, res) => {
    res.render("login", {loginError: req.query.error});
});

// Error route: render error page
app.get("/error", (req, res) => {
    res.render("error");
});

// Additional routes that you must implement

app.get("/post/:id", csrfProtection, async (req, res) => {
    // Render post detail page
    const current = await findPostById(parseInt(req.params.id));
    const user = req.session.user;
    const loggedIn = req.session.loggedIn;
    
    res.render("post_page", {current, user, loggedIn, csrfToken: req.csrfToken()});
});

app.post("/posts", isAuthenticated, csrfProtection, (req, res) => {
    // Add a new post and redirect to home
    // Jack wrote this
    if (req.body.title === undefined || req.body.content === undefined) {
        res.redirect("/");
        return;
    }
    addPost(req.body.title, req.body.content, getCurrentUser(req));
    res.redirect("/");
});

app.post("/like", isAuthenticated, csrfProtection, async (req, res) => {
    // Update post likes
    if (req.body.id === undefined) {
        res.redirect("back");
        return;
    }
    const post = await findPostById(parseInt(req.body.id));
    let postUserId = -1;
    if (post.username !== "deleted") {
        postUserId = (await findUserByUsername(post.username)).id;
    }

    if (parseInt(req.session.userId) !== postUserId) {
        db.run("UPDATE posts SET likes = $newLikes WHERE id = $postId", {
            $newLikes: post.likes + 1,
            $postId: post.id
        });
    } else {
        console.log("like blocked for own post by user: " + req.session.userId);
    }
    res.redirect("back");
});

app.get("/profile", isAuthenticated, csrfProtection, async (req, res) => {
    // Render profile page
    const user = getCurrentUser(req) || {};
    const username = user.username;
    const sortCriteria = req.session.sortCriteria;
    const allPosts = await getPosts(sortCriteria);
    const posts = allPosts.filter(post => post.username === username);
    res.render("profile", {user, posts, sortCriteria, csrfToken: req.csrfToken()});
});

app.get("/profile/sort/:criteria", isAuthenticated, (req, res) => {
    // Sort posts by criteria
    if (["id", "likes"].includes(req.params.criteria)) {
        req.session.sortCriteria = req.params.criteria;
        res.redirect("/profile");
        return;
    }
    res.redirect("/profile");
});

app.get("/avatar/:username", async (req, res) => {
    // Serve the avatar image for the user

    const username = req.params.username;

    const dbRes = await db.get("SELECT id FROM users WHERE username = $name", {
        $name: username
    });


    let id = null;
    if (dbRes === undefined || dbRes.id === undefined) {
        id = "Empty_set_symbol";
    } else {
        id = dbRes.id;
    }

    const imageDirectory = path.join(__dirname, "public/images");
    const imagePath = path.join(imageDirectory, `${id}.png`);

    if (!fs.existsSync(imagePath)) {
        saveAvatar(username[0], id);
    }

    res.sendFile(imagePath, (err) => {
        if (err) {
            res.status(500).send("Error sending the image");
        }
    });
});

app.post("/uploadAvatar",
    isAuthenticated,
    upload.single("avatar"),
    csrfProtection,
    (req, res) => {
        res.redirect("/profile");
    });

app.get("/registerUsername", csrfProtection, (req, res) => {
    if (req.query.error !== undefined) {
        res.render("registerUsername", {regError: req.query.error, csrfToken: req.csrfToken()});
        return;
    }
    res.render("registerUsername", {csrfToken: req.csrfToken()});
});

app.post("/registerUsername", csrfProtection, async (req, res) => {
    // Register a new user
    if (req.session.hashedGoogleId === undefined) {
        res.redirect("/login");
        return;
    }

    const username = req.body.registerUsername;
    if (username === undefined) {
        res.redirect("/registerUsername");
        return;
    }

    const reservedUsernames = ["deleted"];

    const usernameReserved = reservedUsernames.includes(username);
    const usernameTaken = await findUserByUsername(username) !== undefined;

    if (usernameTaken || usernameReserved) {
        res.redirect("/registerUsername?error=Username+already+exists");
        return;
    }

    await addUser(username, req.session.hashedGoogleId);
    loginUser(req, res, username);
});

app.post("/updateUsername", isAuthenticated, csrfProtection, async (req, res) => {
    const newUsername = req.body.name;

    if (newUsername === undefined) {
        res.redirect("/profile");
        return;
    }

    const oldUsername = req.session.user.username;
    const sanitizedUsername = encodeURIComponent(newUsername);
    const avatar_url = `/avatar/${sanitizedUsername}`;

    const updatePosts = "UPDATE posts "
        + "SET username = $newUsername "
        + "WHERE username = $oldUsername";
    const postPromise = db.run(updatePosts, {
        $newUsername: newUsername,
        $oldUsername: oldUsername
    });

    const updateUsers = "UPDATE users "
    + "SET username = $newUsername, avatar_url = $newUrl "
    + "WHERE username = $oldUsername";
    const userPromise = db.run(updateUsers, {
        $newUsername: newUsername,
        $newUrl: avatar_url,
        $oldUsername: oldUsername
    });

    req.session.user.username = newUsername;
    req.session.user.avatar_url = avatar_url;

    await Promise.all([postPromise, userPromise]);

    res.redirect("/profile");
});

app.get("/logout", isAuthenticated, (req, res) => {
    // Logout the user
    // clear the user from the session object and save.
    // this will ensure that re-using the old session id
    // does not have a logged in user
    req.session.user = null;
    req.session.save(function (err) {
        if (err) {
            next(err);
        }

        // regenerate the session, which is good practice to help
        // guard against forms of session fixation
        req.session.regenerate(function (err) {
            if (err) {
                next(err);
            }
            res.redirect("/googleLogout");
        });
    });
});

app.get("/googleLogout", async (req, res) => {
    res.render("googleLogout");
});

app.post("/deletePost", isAuthenticated, csrfProtection, async (req, res) => {
    // Delete a post if the current user is the owner
    // Jack wrote this
    if (req.body.id === undefined) {
        res.redirect("back");
        return;
    }
    const del_id = parseInt(req.body.id);

    const post = await findPostById(del_id);
    const poster = await findUserByUsername(post.username);
    if (parseInt(req.session.userId) !== poster.id) {
        console.log("delete blocked by user: " + req.session.userId);
        return;
    }

    db.run("DELETE FROM posts WHERE id = $id", {
        $id: del_id
    });
    res.redirect("back");
});

app.post("/deleteAccount", isAuthenticated, csrfProtection, async (req, res) => {
    const userId = req.session.userId;
    const username = req.session.user.username;

    const deletePromise = db.run("DELETE FROM users WHERE id = $id", {
        $id: userId
    });

    const query = "UPDATE posts "
        + "SET username = 'deleted' "
        + "WHERE username = $username";
    const updatePromise = db.run(query, {
        $username: username
    });

    fs.unlink(`public/images/${userId}.png`, (err) => {
        if (err) {
            console.log(`failed to delete public/images/${userId}.png`);
        }
    });

    await Promise.all([deletePromise, updatePromise]);

    res.redirect("/");
});

app.get("/emojis", (req, res) => {
    // Serve the emojis
    res.json(allEmojis);
});

app.get("/auth/google", (req, res) => {
    const url = "https://accounts.google.com/o/oauth2/auth?response_type=code&client_id="
        + CLIENT_ID
        + "&redirect_uri=http://localhost:"
        + PORT.toString()
        + "/auth/google/callback&scope=https://www.googleapis.com/auth/userinfo.email "
        + "https://www.googleapis.com/auth/userinfo.profile&prompt=consent";
    res.redirect(url);
});

app.get("/auth/google/callback", 
    passport.authenticate("google", {failureRedirect: "/"}),
    async (req, res) => {
        const googleId = req.user.id;
        const hash = crypto.createHash("sha256");
        hash.update(googleId);
        const hashedGoogleId = hash.digest("hex");

        req.session.hashedGoogleId = hashedGoogleId;
        const user = await findUserByGoogleId(hashedGoogleId);

        if (user === undefined) {
            res.redirect("/registerUsername");
            return;
        }

        loginUser(req, res, user.username);
    }
);


passport.authenticate("google", {scope: ["profile"]});

// Configure passport
passport.use(new GoogleStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: `http://localhost:${PORT}/auth/google/callback`
}, (token, tokenSecret, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

async function getEmojis() {
    const url = "https://emoji-api.com/emojis?access_key=" + accessToken;
    const emoji_data = await fetch(url);
    allEmojis = await emoji_data.json();
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

let db = null;
async function activate() {
    const openSQL = sqlite.open({
        filename: "database.db",
        driver: sqlite3.Database
    });

    const dbPromise = openSQL.then(database => {
        db = database;
        return db;
    });

    const emojiPromise = getEmojis();

    await Promise.all([dbPromise, emojiPromise]);

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
activate();


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Function to find a user by username
async function findUserByUsername(username) {
    // Return user object if found, otherwise return undefined
    return await db.get("SELECT * FROM users WHERE username = $username", {
        $username: username,
    });
}

async function findUserByGoogleId(googleId) {
    // Return user object if found, otherwise return undefined
    const query = "SELECT * FROM users WHERE hashedGoogleId = $googleId";
    return await db.get(query, {
        $googleId: googleId,
    });
}

async function findPostById(postId) {
    // Return post object if found, otherwise return undefined
    return await db.get("SELECT * FROM posts WHERE id = $id", {
        $id: postId,
    });
}

// Function to add a new user
async function addUser(username, hashedGoogleId) {
    // Create a new user object and add to users array

    const columns = "(username, avatar_url, hashedGoogleId, memberSince)";
    const values = "($username, $avatar_url, $hashedGoogleId, $memberSince)";
    const sanitizedUsername = encodeURIComponent(username);

    await db.run(`INSERT INTO users ${columns} VALUES ${values}`, {
        $username: username,
        $avatar_url: `/avatar/${sanitizedUsername}`,
        $hashedGoogleId: hashedGoogleId,
        $memberSince: getCurrentDateTime()
    });

    const { id } = await db.get("SELECT id FROM users WHERE username = $name", {
        $name: username
    });

    saveAvatar(username[0], id);
}

function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect("/login");
    }
}

// Function to login a user
function loginUser(req, res, username) {
    // Login a user and redirect appropriately

    // https://expressjs.com/en/resources/middleware/session.html

    // regenerate the session, which is good practice to help
    // guard against forms of session fixation
    req.session.regenerate(async function (err) {
        if (err) {
            next(err);
        }

        // store user information in session, typically a user id
        req.session.user = await findUserByUsername(username);
        req.session.userId = req.session.user.id;
        req.session.loggedIn = true;

        // save the session before redirection to ensure page
        // load does not happen before session is saved
        req.session.save(function (err) {
            if (err) {
                return next(err);
            }
            res.redirect("/");
        });
    });
}

// Function to get the current user from session
function getCurrentUser(req) {
    // Return the user object if the session user ID matches
    return req.session.user;
}

// Function to get all posts, sorted by latest first
async function getPosts(sort) {
    if (!["id", "likes"].includes(sort)) {
        sort = "id";
    }
    return await db.all(`SELECT * FROM posts ORDER BY ${sort} DESC`);
}

// Function to add a new post
async function addPost(title, content, user) {
    // Create a new post object and add to posts array

    const columns = "(title, content, username, timestamp, likes)";
    const values = "($title, $content, $username, $timestamp, $likes)";
    const query = `INSERT INTO posts ${columns} VALUES ${values}`;
    await db.run(query, {
        $title: title,
        $content: content,
        $username: user.username,
        $timestamp: getCurrentDateTime(),
        $likes: 0
    });
}

// Function to generate an image avatar
function generateAvatar(letter, width = 200, height = 200) {
    // Generate an avatar image with a letter
    // Steps:
    // 1. Choose a color scheme based on the letter
    // 2. Create a canvas with the specified width and height
    // 3. Draw the background color
    // 4. Draw the letter in the center
    // 5. Return the avatar as a PNG buffer

    const SILVER = "#C0C0C0";
    const BRONZE = "#CD7F32";
    const PERIWINKLE = "#CCCCFF";

    // test all of these work (done)
    // all of these work. q is now peachpuff since peach is not an html color
    const colors = {
        a: "red",
        b: "green",
        c: "blue",
        d: "yellow",
        e: "orange",
        f: "purple",
        g: "black",
        h: "brown",
        i: "cyan",
        j: "magenta",
        k: "turquoise",
        l: "lavender",
        m: "maroon",
        n: "olive",
        o: "teal",
        p: "indigo",
        q: "peachpuff",
        r: "beige",
        s: "gold",
        t: SILVER,
        u: BRONZE,
        v: "coral",
        w: "lime",
        x: "lightblue",
        y: PERIWINKLE,
        z: "Crimson"
    };

    let color = colors[letter.toLowerCase()];
    if (color === undefined) {
        color = "black";
    }

    const can = canvas.createCanvas(width, height)
    const ctx = can.getContext("2d")

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "white";
    ctx.font = (height / 2).toString() + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const x = width / 2;
    const y = height / 2;
    ctx.fillText(letter, x, y);

    const buf = can.toBuffer(
        "image/png",
        {compressionLevel: 3, filters: canvas.PNG_FILTER_NONE});

    return buf
}

function saveAvatar(letter, id) {
    const buf = generateAvatar(letter);
    fs.writeFileSync(`public/images/${id}.png`, buf);
}
