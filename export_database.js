// showdb.js

const sqlite = require("sqlite");
const sqlite3 = require("sqlite3");
const fs = require("fs");

// Placeholder for the database file name
const dbFileName = "database.db";
const outputFileName = "data.json";

async function showDatabaseContents() {
    const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    data = {};

    // Check if the users table exists
    const usersTableExists = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='users';`);
    if (usersTableExists) {
        const users = await db.all("SELECT * FROM users");
        data["users"] = users;
    } else {
        console.log("Users table does not exist.");
    }

    // Check if the posts table exists
    const postsTableExists = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='posts';`);
    if (postsTableExists) {
        const posts = await db.all("SELECT * FROM posts");
        data["posts"] = posts;
    } else {
        console.log("Posts table does not exist.");
    }

    await db.close();


    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFile(outputFileName, jsonData, (err) => {
        if (err) {
            throw err;
        }
        console.log(`Data has been exported to ${outputFileName}`);
    });
}

showDatabaseContents().catch(err => {
    console.error("Error showing database contents:", err);
});
