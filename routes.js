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
 * Authenticate User using 'basic-auth'
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
      })
        if (user){

          if (user.password === credentials.pass){
            console.log(`Authentication successful for: ${credentials.name}`);
            req.currentUser = user;
          } else {
            message = `Authentication failure for username: ${user.username}`;
          }
          
        } else {
            message = `User not found for: ${credentials.name}`
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
  const user = req.currentUser;
  console.log(user)
  res.json({
    User_ID: user.id,
    First_Name: user.firstName,
    Last_Name: user.lastName,
    Email: user.emailAddress
  });
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
], async(req, res, next) => {
// Validation Errors    
  const errors = validationResult(req);
    if (!errors.isEmpty()){
        const errorMessages = errors.array().map(error => error.msg);
        return res.status(400).json({ errors: errorMessages });
    }
// Good request, hash password
    await User.create({
      firstName: req.body.firstName, 
      lastName: req.body.lastName, 
      emailAddress: req.body.emailAddress,
      password: await bcrypt.hash(req.body.password, 10)
      });
    return res.status(201).redirect('/');
  }
);


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


// PUT /api/courses/:id 204 - Updates a course and returns no content
router.put('/courses/:id', authenticateUser, asyncHandler (async(req,res, next)=> {
  const id = req.params.id;
  const course = await Course.findByPk(id);
  const owner = req.currentUser.id;
  if (course && owner === course.userId){
    await course.update(req.body);
    res.status(204).end();
  } else if (course && owner !== course.userId){
    res.status(403).json({message: "User must be Course Owner in order to Update Course"})
  } else {
    res.status(404).json({message: "Course Not Found."})
  }
  res.status(500).json({message: err.message})
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
  res.status(500).json({message: err.message})
}));

  
module.exports = router;