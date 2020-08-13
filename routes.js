'use strict';

const express = require('express');

// This array is used to keep track of user records
// as they are created.
const users = [];

// Construct a router instance.
const router = express.Router();

// GET /api/users 200 - Returns the currently authenticated user
router.get('/users', (req, res) => {
    res.json(users);
});

// POST /api/users 201 - Creates a user, sets the Location header to "/", and returns no content
router.post('/users', (req, res) => {
    // Get the user from the request body.
    const user = req.body;
    // Add the user to the `users` array.
    users.push(user);
    // Set the status to 201 Created and end the response.
    res.status(201).end();
});

//------- COURSE routes-----------//

// GET /api/courses 200 - Returns a list of courses (including the user that owns each course)
// GET /api/courses/:id 200 - Returns a the course (including the user that owns the course) for the provided course ID
// POST /api/courses 201 - Creates a course, sets the Location header to the URI for the course, and returns no content
// PUT /api/courses/:id 204 - Updates a course and returns no content
// DELETE /api/courses/:id 204 - Deletes a course and returns no content

module.exports = router;