const express = require('express');
const axios = require('axios');
let books = require("./booksdb.js");
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const public_users = express.Router();

const BASE_URL = "http://localhost:5000";

// Helpers that look books up in the data source and return Promises
const getBookList = () => new Promise((resolve) => resolve(books));

const findBooksBy = (field, value) => new Promise((resolve, reject) => {
    const matches = Object.keys(books)
        .filter((isbn) => books[isbn][field].toLowerCase() === value.toLowerCase())
        .map((isbn) => ({ isbn, ...books[isbn] }));
    if (matches.length > 0) {
        resolve(matches);
    } else {
        reject({ status: 404, message: `No books found with ${field} "${value}"` });
    }
});

public_users.post("/register", (req,res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({message: "Username and password are required"});
    }
    if (!isValid(username)) {
        return res.status(409).json({message: "User already exists"});
    }

    users.push({ username, password });
    return res.status(201).json({message: "User successfully registered. Now you can login"});
});

// Get the book list available in the shop
public_users.get('/',function (req, res) {
    getBookList()
        .then((bookList) => res.status(200).send(JSON.stringify(bookList, null, 4)))
        .catch(() => res.status(500).json({message: "Unable to retrieve books"}));
});

// Get book details based on ISBN
public_users.get('/isbn/:isbn',function (req, res) {
    const isbn = req.params.isbn;
    new Promise((resolve, reject) => {
        if (books[isbn]) {
            resolve(books[isbn]);
        } else {
            reject({ status: 404, message: `No book found with ISBN ${isbn}` });
        }
    })
        .then((book) => res.status(200).send(JSON.stringify(book, null, 4)))
        .catch((err) => res.status(err.status).json({message: err.message}));
 });

// Get book details based on author
public_users.get('/author/:author',function (req, res) {
    findBooksBy("author", req.params.author)
        .then((matches) => res.status(200).send(JSON.stringify({ booksbyauthor: matches }, null, 4)))
        .catch((err) => res.status(err.status).json({message: err.message}));
});

// Get all books based on title
public_users.get('/title/:title',function (req, res) {
    findBooksBy("title", req.params.title)
        .then((matches) => res.status(200).send(JSON.stringify({ booksbytitle: matches }, null, 4)))
        .catch((err) => res.status(err.status).json({message: err.message}));
});

//  Get book review
public_users.get('/review/:isbn',function (req, res) {
    const isbn = req.params.isbn;
    if (!books[isbn]) {
        return res.status(404).json({message: `No book found with ISBN ${isbn}`});
    }
    return res.status(200).send(JSON.stringify(books[isbn].reviews, null, 4));
});

// ---------------------------------------------------------------------------
// Axios clients: retrieve books from the running server with Promise callbacks
// (getAllBooks, getBookByISBN) and async/await (getBooksByAuthor, getBooksByTitle)
// ---------------------------------------------------------------------------

// All books, using a Promise callback
const getAllBooks = () => {
    return axios.get(`${BASE_URL}/`)
        .then((response) => response.data)
        .catch((error) => {
            console.error("Error retrieving the book list:", error.message);
            throw error;
        });
};

// Book by ISBN, using a Promise callback
const getBookByISBN = (isbn) => {
    return axios.get(`${BASE_URL}/isbn/${encodeURIComponent(isbn)}`)
        .then((response) => response.data)
        .catch((error) => {
            console.error(`Error retrieving the book with ISBN ${isbn}:`, error.message);
            throw error;
        });
};

// Books by author, using async/await
const getBooksByAuthor = async (author) => {
    try {
        const response = await axios.get(`${BASE_URL}/author/${encodeURIComponent(author)}`);
        return response.data;
    } catch (error) {
        console.error(`Error retrieving books by ${author}:`, error.message);
        throw error;
    }
};

// Books by title, using async/await
const getBooksByTitle = async (title) => {
    try {
        const response = await axios.get(`${BASE_URL}/title/${encodeURIComponent(title)}`);
        return response.data;
    } catch (error) {
        console.error(`Error retrieving books titled "${title}":`, error.message);
        throw error;
    }
};

module.exports.general = public_users;
module.exports.getAllBooks = getAllBooks;
module.exports.getBookByISBN = getBookByISBN;
module.exports.getBooksByAuthor = getBooksByAuthor;
module.exports.getBooksByTitle = getBooksByTitle;
