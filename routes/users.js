'use strict';

const express = require('express');
const router = express.Router();

const { validationResult, check } = require('express-validator');
const bcrypt = require('bcryptjs');
const auth = require('basic-auth');
// Require USER model
const User = require('../models').User;

const users = [];

/**
 * Authenticate User using 'basic-auth'
 */

const authenticateUser = (req, res, next) => {
    let message = null;
  // Parse CREDS FROM HDR
    const credentials = auth(req);
    if (credentials) {
      const user = users.find(u => u.emailAddress === credentials.name);
      // If a user was successfully retrieved from the data store...
      console.log(users)
      if (user) {
  // Compare email to password

        const authenticated = bcrypt
          .compareSync(credentials.pass, user.password);
        // If the passwords match...
        if (authenticated) {
          console.log(`Authentication successful for name: ${user.emailAddress}`);
          req.currentUser = user;
        } else {
          message = `Authentication failure for name: ${user.emailAddress}`;
        }
      } else {
        message = `User not found for name: ${credentials.emailAddress}`;
      }
    } else {
      message = 'Auth header not found';
    }
  // FAILED AUTH
    if (message) {
      console.warn(message);
      res.status(401).json({ message: 'Access Denied' });
  // SUCCESS
    } else {
      next();
    }
  };
  
  
  //------- USER routes-----------//
  
  // GET /api/users 200 - Returns the currently authenticated user
  router.get('/', authenticateUser, (req, res) => {
    const user = req.currentUser;
    res.json({
      name: user.firstName,
      email: user.emailAddress,
    });
  });
  
  // POST /api/users 201 - Creates a user, sets the Location header to "/", and returns no content
  router.post('/', [
    check('firstName')
      .exists({ checkNull: true, checkFalsy: true })
      .withMessage('Please provide a value for "first name"'),
    check('lastName')
      .exists({ checkNull: true, checkFalsy: true })
      .withMessage('Please provide a value for "last name"'),
    check('emailAddress')
      .exists({ checkNull: true, checkFalsy: true })
      .withMessage('Please provide a value for "email"')
      .isEmail()
      .withMessage('Please provide a valid email address for "email"'),
    check('password')
      .exists({ checkNull: true, checkFalsy: true })
      .withMessage('Please provide a value for "password"'),
  ], async(req, res, next) => {
    // Attempt to get the validation result from the Request object.
    const errors = validationResult(req);
    // If there are validation errors...
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => error.msg);
      // Return the validation errors to the client.
      return res.status(400).json({ errors: errorMessages });
    }

    // Get the user from the request body.
    const user = await User.create(req.body);
    // Hash the new user's password.
    user.password = bcrypt.hashSync(user.password);
    // Add the user to the `users` array.
    users.push(user);
    // Set the status to 201 Created and end the response.
    return res.status(201).end();
  });
  
  module.exports = router;