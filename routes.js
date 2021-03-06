'use strict';

const express = require('express');
const router = express.Router();

const { validationResult, check } = require('express-validator');
const bcrypt = require('bcryptjs');
const auth = require('basic-auth');

// Require USER model
const User = require('./models').User;
const Course = require('./models').Course;

// Async Try / Catch block for global error handler
function asyncHandler(cb){
  return async (req, res, next)=>{
    try {
      await cb(req, res, next);
    } catch(err){
      next(err);
    }
  }
};

/**
 * Authenticate User using 'basic-auth' and 'bcrypt'
 */

const authenticateUser = async (req, res, next) => {
  let message = null;
  let user;
// Parse Credentials from Header
  const credentials = auth(req);
  if (credentials) {
    user = await User.findOne({
      attributes: ['id', 'firstName', 'lastName', 'emailAddress', 'password'],
      where: {
        emailAddress: credentials.name
      }
    });
    if (user){
      const authenticated = bcrypt.compareSync(credentials.pass, user.password);
      if (authenticated){
        console.log(`Authentication successful for: ${credentials.name}`);
        req.currentUser = user;
      } else {
        message = `Authentication failure for username: ${user.username}`;
      }
    } else {
        message = `User not found for: ${credentials.name}`;
    }       
  } else {
    message = `Auth header not found`;
  }
//FAILED AUTH
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
  const user = req.currentUser.id;
  const userInfo = await User.findOne({
    attributes: ['id', 'firstName', 'lastName', 'emailAddress'],
    where: {
      id: user
    }
  });
  res.json({userInfo});
});
  

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
], asyncHandler (async(req, res) => {
  // Good request, hash password
  try{
    // Validation Errors prior to storing new User data   
    const errors = validationResult(req);
    if (!errors.isEmpty()){
        const errorMessages = errors.array().map(error => error.msg);
        return res.status(400).json({ errors: errorMessages });
    } 
    await User.create({
      firstName: req.body.firstName, 
      lastName: req.body.lastName, 
      emailAddress: req.body.emailAddress,
      password: await bcrypt.hash(req.body.password, 10)
      });
  } catch (error){
    // Unique Email Requirement
    if (error.errors[0].type === 'unique violation'){
      return res.status(400).json({message: 'Email in use.'})
    }   
  } 
  res.status(201).location('/').end();
}));


  //------- COURSE routes-----------//

// GET /api/courses 200 - Returns a list of courses (including the user that owns each course)
router.get('/courses', asyncHandler ( async (req,res)=>{
  const courses = await Course.findAll({
    include: [{
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'emailAddress']
      }],
    attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded']
  });
  res.json(courses);
}));


// GET /api/courses/:id 200 - Returns a the course (including the user that owns the course) for the provided course ID
router.get('/courses/:id', asyncHandler( async(req, res)=>{
  const id = req.params.id;
  const course = await Course.findOne({
    include: [{
      model: User,
      attributes: ['id', 'firstName', 'lastName', 'emailAddress']
    }],
    attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded'],
  where: {
    id: id
  }});
  if (course) {
    res.json(course);
  } else {
    res.status(404).json({message: "Course not found."})
  }
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
  res.status(201).location(`/courses/${course.id}`).end();
}));


// PUT /api/courses/:id 204 - Updates a course and returns no content
router.put('/courses/:id', authenticateUser, [
  check('title')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "title"'),
  check('description')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "description"'),
  ], asyncHandler (async(req,res, next)=> {
  const id = req.params.id; 
  const owner = req.currentUser.id; 
  const course = await Course.findByPk(id);
  if (course){
    if (course && owner === course.userId){
      // Attempt to get the validation result from the Request object.
      const errors = validationResult(req);
      // If there are validation errors...
      if (!errors.isEmpty()) {
        // Use the Array `map()` method to get a list of error messages.
        const errorMessages = errors.array().map(error => error.msg);
        // Return the validation errors to the client.
        return res.status(400).json({ errors: errorMessages });
      }
      await course.update(req.body);
      res.status(204).end();
    } else {
      res.status(403).json({message: "User must be Course Owner in order to Update Course"})
    } 
  } else{
    res.status(404).json({message: "Course Not Found."})
  }
}));


// DELETE /api/courses/:id 204 - Deletes a course (if owned by requestor) and returns no content
router.delete('/courses/:id', authenticateUser, asyncHandler (async(req,res)=>{ 
  const course = await Course.findByPk(req.params.id);
  const owner = req.currentUser.id;
  const courseOwner = course.userId;
  if (course && owner=== courseOwner){
    await course.destroy({
      where: {
        id: req.params.id
      }
    });
    res.status(204).end();
  } else if (course && owner !== courseOwner){
    res.status(403).json({message: "User must be Course Owner in order to Delete Course"})
  } else {
    res.status(404).json({message: "Course Not Found."})
  }
}));

  
module.exports = router;