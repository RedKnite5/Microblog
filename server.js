const express = require('express');
const expressHandlebars = require('express-handlebars');
const session = require('express-session');
const canvas = require('canvas');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Configuration and Setup
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

const app = express();
const PORT = 3000;

/*
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Handlebars Helpers

    Handlebars helpers are custom functions that can be used within the templates 
    to perform specific tasks. They enhance the functionality of templates and 
    help simplify data manipulation directly within the view files.

    In this project, two helpers are provided:
    
    1. toLowerCase:
       - Converts a given string to lowercase.
       - Usage example: {{toLowerCase 'SAMPLE STRING'}} -> 'sample string'

    2. ifEq:
       - Compares two values for equality and returns a block of content based on 
         the comparison result.
       - Usage example: 
            {{#ifEq value1 value2}}
                <!-- Content if value1 equals value2 -->
            {{else}}
                <!-- Content if value1 does not equal value2 -->
            {{/ifEq}}
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*/

// Set up Handlebars view engine with custom helpers
//
app.engine(
    'handlebars',
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
            getPosts: function (username) {
                return findPostsByUser(username);
            },
            getPostsLength: function (username) {
                return findPostsByUser(username).length;
            }
        },
    })
);

app.set('view engine', 'handlebars');
app.set('views', './views');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Middleware
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.use(
    session({
        secret: 'oneringtorulethemall',     // Secret key to sign the session ID cookie
        resave: false,                      // Don't save session if unmodified
        saveUninitialized: false,           // Don't create session until something stored
        cookie: { secure: false },          // True if using https. Set to false for development without https
    })
);

// Replace any of these variables below with constants for your application. These variables
// should be used in your template files. 
// 
app.use((req, res, next) => {
    res.locals.appName = 'Y';
    res.locals.copyrightYear = 2024;
    res.locals.postNeoType = 'Post';
    res.locals.loggedIn = req.session.loggedIn || false;
    res.locals.userId = req.session.userId || '';
    res.locals.user =  {data: 69};
    next();
});

app.use(express.static('public'));                  // Serve static files
app.use(express.urlencoded({ extended: true }));    // Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.json());                            // Parse JSON bodies (as sent by API clients)

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Routes
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Home route: render home view with posts and user
// We pass the posts and user variables into the home
// template
//
app.get('/', (req, res) => {
    const posts = getPosts();
    const user = getCurrentUser(req) || {};
    res.render('home', { posts, user });
});

// Register GET route is used for error response from registration
//
app.get('/register', (req, res) => {
    res.render('loginRegister', { regError: req.query.error });
});

// Login route GET route is used for error response from login
//
app.get('/login', (req, res) => {
    res.render('loginRegister', { loginError: req.query.error });
});

// Error route: render error page
//
app.get('/error', (req, res) => {
    res.render('error');
});

// Additional routes that you must implement


app.get('/post/:id', (req, res) => {
    // TODO: Render post detail page
});
app.post('/posts', (req, res) => {
    // TODO: Add a new post and redirect to home
});
app.post('/like/:id', (req, res) => {
    // Update post likes
    console.log("Id: ", req.params.id);

    const post = findPostById(parseInt(req.params.id));
    console.log(post);
    post.likes += 1;

    res.render("home", {posts: getPosts()});
});
app.get('/profile', isAuthenticated, (req, res) => {
    // Render profile page
    const user = getCurrentUser(req) || {};
    res.render('profile', {user});
});
app.get('/avatar/:username', (req, res) => {
    // TODO: Serve the avatar image for the user
    return handleAvatar(req, res);
});
app.post('/register', (req, res) => {
    // Register a new user

    const username = req.body.registerUsername;

    if (findUserByUsername(username) !== undefined) {
        res.redirect("/register?error=Username+alread+exists");
        return;
    }

    addUser(username);
    loginUser(req, res, username);
});
app.post('/login', (req, res) => {
    // Login a user

    const username = req.body.loginUsername;

    if (findUserByUsername(username) === undefined) {
        res.redirect("/login?error=Username+does+not+exist");
        return;
    }

    loginUser(req, res, username);
});


app.get('/logout', (req, res) => {
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
            res.redirect('/');
        });
    });
});
app.post('/delete/:id', isAuthenticated, (req, res) => {
    // TODO: Delete a post if the current user is the owner
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Server Activation
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Support Functions and Variables
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

// Example data for posts and users
let posts = [
    { id: 1, title: 'Sample Post', content: 'This is a sample post.', username: 'SampleUser', timestamp: '2024-01-01 10:00', likes: 0 },
    { id: 2, title: 'Another Post', content: 'This is another sample post.', username: 'AnotherUser', timestamp: '2024-01-02 12:00', likes: 0 },
];
let users = [
    { id: 1, username: 'SampleUser', avatar_url: undefined, memberSince: '2024-01-01 08:00' },
    { id: 2, username: 'AnotherUser', avatar_url: undefined, memberSince: '2024-01-02 09:00' },
];

// Function to find a user by username
function findUserByUsername(username) {
    // Return user object if found, otherwise return undefined
    for (const user of users) {
        if (user.username === username) {
            return user;
        }
    }
    return undefined;
}

// Function to find a user by user ID
function findUserById(userId) {
    // TODO: Return user object if found, otherwise return undefined
}

function findPostById(postId) {
    // Return post object if found, otherwise return undefined
    for (const post of posts) {
        if (post.id === postId) {
            return post;
        }
    }
    return undefined;
}

function findPostsByUser(username) {
    // Return array of posts by username
    const userPosts = [];
    for (const post of posts) {
        console.log(post, username);
        if (post.username === username) {
            userPosts.push(post);
        }
    }
    return userPosts;
}

// Function to add a new user
function addUser(username) {
    // Create a new user object and add to users array

    const id = users.length + 1;
    const avatar_url = undefined;
    const memberSince = getCurrentDateTime();

    const user = {id: id, username: username, avatar_url: avatar_url, memberSince: memberSince};
    users.push(user);
}

function getCurrentDateTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    console.log("isAuthenticated id: ", req.session.userId);
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

// Function to register a user
function registerUser(req, res) {
    // TODO: Register a new user and redirect appropriately
}

// Function to login a user
function loginUser(req, res, username) {
    // Login a user and redirect appropriately

    // https://expressjs.com/en/resources/middleware/session.html

    // regenerate the session, which is good practice to help
    // guard against forms of session fixation
    req.session.regenerate(function (err) {
        if (err) {
            next(err);
        }

        // store user information in session, typically a user id
        req.session.user = findUserByUsername(username);
        req.session.userId = req.session.user.id;
        req.session.loggedIn = true;


        // save the session before redirection to ensure page
        // load does not happen before session is saved
        req.session.save(function (err) {
            if (err) {
                return next(err);
            }
            res.redirect('/');
        });
    });
}

// Function to logout a user
function logoutUser(req, res) {
    // TODO: Destroy session and redirect appropriately
}

// Function to render the profile page
function renderProfile(req, res) {
    // TODO: Fetch user posts and render the profile page
}

// Function to update post likes
function updatePostLikes(req, res) {
    // TODO: Increment post likes if conditions are met


}

// Function to handle avatar generation and serving
function handleAvatar(req, res) {
    // Generate and serve the user's avatar image
    res.set('Content-Type', 'image/png');

    const letter = req.params.username[0];
    const buffer = generateAvatar(letter);

    // Send the image buffer as the response
    res.send(buffer);
}

// Function to get the current user from session
function getCurrentUser(req) {
    // Return the user object if the session user ID matches
    return req.session.user;
}

// Function to get all posts, sorted by latest first
function getPosts() {
    return posts.slice().reverse();
}

// Function to add a new post
function addPost(title, content, user) {
    // TODO: Create a new post object and add to posts array
}

// Function to generate an image avatar
function generateAvatar(letter, width = 100, height = 100) {
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

    // TODO: test all of these work
    const colors = {
        a: "red",
        b: "green",
        c: "blue",
        d: "yellow",
        e: "orange",
        f: "purple",
        g: "pink",
        h: "brown",
        i: "cyan",
        j: "magenta",
        k: "turquoise",
        l: "lavender",
        m: "maroon",
        n: "olive",
        o: "teal",
        p: "indigo",
        q: "peach",
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

    const color = colors[letter.toLowerCase()];


    const can = canvas.createCanvas(width, height)
    const ctx = can.getContext('2d')

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = 'white';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const x = width / 2;
    const y = height / 2;
    ctx.fillText(letter, x, y);

    const buf = can.toBuffer('image/png', { compressionLevel: 3, filters: canvas.PNG_FILTER_NONE });
    return buf
}

