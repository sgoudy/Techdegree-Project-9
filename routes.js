'use strict';

const express = require('express');
const router = express.Router();

const { validationResult, check } = require('express-validator');
const bcrypt = require('bcryptjs');
const auth = require('basic-auth');

// Require USER model
const User = require('./models').User;
const Course = require('./models').Course;

// User list for authentication
const users = [];

// Async Try / Catch block for global error handler
function asyncHandler(cb){
    return async (req, res, next)=>{
      try {
        await cb(req,res, next);
      } catch(err){
        next(err);
      }
    }
};

/**
 * Authenticate User using 'basic-auth'
 */

const authenticateUser = (req, res, next) => {
    let message = null;
  // Parse Credentials from Header
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
router.get('/users', authenticateUser, async (req, res) => {
  const user = req.currentUser;
  res.json({
    First_Name: user.firstName,
    Last_Name: user.lastName,
    Email: user.emailAddress,
    ID: user.id
  });
});
  
//TODO "The POST /api/users route validates that the provided email address is a valid email address and isn't already associated with an existing user."
// POST /api/users 201 - Creates a user, sets the Location header to "/", and returns no content
router.post('/users', [
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
], async (req, res, next) => {
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
  return res.status(201).redirect('/');
});



  //------- COURSE routes-----------//

// GET /api/courses 200 - Returns a list of courses (including the user that owns each course)
router.get('/courses', asyncHandler ( async (req,res)=>{
    const courses = await Course.findAll({
      attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded', 'userId']
    });
    res.json(courses);
}));


// GET /api/courses/:id 200 - Returns a the course (including the user that owns the course) for the provided course ID
router.get('/courses/:id', asyncHandler( async(req, res)=>{
    const id = req.params.id;
    const course = await Course.findByPk(id);
    if(course){
      res.json({
        Course_ID: course.id,
        Name: course.title,
        Description: course.description,
        Estimated_Time: course.estimatedTime,
        Materials_Needed: course.materialsNeeded
      });
    } else {
      res.status(404).json({message: "Course not found."})
    }
    res.status(500).json({message: err.message})
}));


// POST /api/courses 201 - Creates a course, sets the Location header to the URI for the course, and returns no content
router.post('/courses', authenticateUser, [
  check('title')
      .exists({ checkNull: true, checkFalsy: true })
      .withMessage('Please provide a value for "title"'),
  check('description')
      .exists({ checkNull: true, checkFalsy: true })
      .withMessage('Please provide a value for "description"'),
  ], asyncHandler (async (req, res, next) => {
  // Attempt to get the validation result from the Request object.
  const errors = validationResult(req);
  // If there are validation errors...
  if (!errors.isEmpty()) {
      // Use the Array `map()` method to get a list of error messages.
      const errorMessages = errors.array().map(error => error.msg);
      // Return the validation errors to the client.
      return res.status(400).json({ errors: errorMessages });
  }
  const course = await Course.create({
      id: req.body.id,
      userId: req.body.userId,
      title: req.body.title,
      description: req.body.description,
      estimatedTime: req.body.estimatedTime,
      materialsNeeded: req.body.materialsNeeded
  });
  res.status(201).json(course);
}));

// TODO "The PUT /api/courses/:id and DELETE /api/courses/:id routes return a 403 status code if the current user doesn't own the requested course."
// PUT /api/courses/:id 204 - Updates a course and returns no content
router.put('/courses/:id', authenticateUser, asyncHandler (async(req,res,next)=> {
  const course = await Course.findByPk(req.params.id);
  if (course){
    await course.update(req.body);
    res.status(204).end();
  } else {
    res.status(404).json({message: "Course Not Found."})
  }
  res.status(500).json({message: err.message})
}));

// TODO "The PUT /api/courses/:id and DELETE /api/courses/:id routes return a 403 status code if the current user doesn't own the requested course."
// DELETE /api/courses/:id 204 - Deletes a course and returns no content
router.delete('/courses/:id', authenticateUser, asyncHandler (async(req,res)=>{ 
  const course = await Course.findByPk(req.params.id);
  const owner = req.currentUser;
  console.log(owner);
  if(course){
    await course.destroy({
      where: {
        id: req.params.id
      }
    });
    res.status(204).end();
  } else {
    res.status(404).json({message: "Course Not Found."})
  }
  res.status(500).json({message: err.message})
}));

  
module.exports = router;