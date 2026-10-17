const express = require('express');
const jwt = require('jsonwebtoken');
let books = require("./booksdb.js");
const regd_users = express.Router();

let users = [];

const isValid = (username)=>{ //returns boolean
    // A username is valid when it is a non-empty string that no one has registered yet
    if (typeof username !== 'string' || username.trim() === '') {
        return false;
    }
    return !users.some((user) => user.username === username);
}

const authenticatedUser = (username,password)=>{ //returns boolean
    // Check whether the username and password match a registered user
    return users.some((user) => user.username === username && user.password === password);
}

//only registered users can login
regd_users.post("/login", (req,res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({message: "Username and password are required"});
    }

    if (!authenticatedUser(username, password)) {
        return res.status(401).json({message: "Invalid login. Check username and password"});
    }

    const accessToken = jwt.sign({ data: username }, "access", { expiresIn: 60 * 60 });
    req.session.authorization = { accessToken, username };
    return res.status(200).json({message: "User successfully logged in"});
});

// Add or modify a book review
regd_users.put("/auth/review/:isbn", (req, res) => {
    const isbn = req.params.isbn;
    const review = req.query.review || req.body.review;
    const username = req.session.authorization.username;

    if (!books[isbn]) {
        return res.status(404).json({message: `No book found with ISBN ${isbn}`});
    }
    if (!review) {
        return res.status(400).json({message: "A review is required"});
    }

    const isUpdate = books[isbn].reviews[username] !== undefined;
    books[isbn].reviews[username] = review;

    return res.status(200).json({
        message: `Review for book ${isbn} ${isUpdate ? "modified" : "added"} successfully`,
        reviews: books[isbn].reviews
    });
});

// Delete a book review (a user can only delete their own review)
regd_users.delete("/auth/review/:isbn", (req, res) => {
    const isbn = req.params.isbn;
    const username = req.session.authorization.username;

    if (!books[isbn]) {
        return res.status(404).json({message: `No book found with ISBN ${isbn}`});
    }
    if (books[isbn].reviews[username] === undefined) {
        return res.status(404).json({message: "You have no review for this book"});
    }

    delete books[isbn].reviews[username];
    return res.status(200).json({
        message: `Review for book ${isbn} deleted successfully`,
        reviews: books[isbn].reviews
    });
});

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.users = users;
module.exports.authenticatedUser = authenticatedUser;
