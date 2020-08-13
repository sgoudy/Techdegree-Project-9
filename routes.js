'use strict';

const express = require('express');
const courses = require('./courses');

// Refactoring to reduce code repetition
function asyncHandler(cb){
    return async (req, res, next)=>{
      try {
        await cb(req,res, next);
      } catch(err){
        next(err);
      }
    }
  }

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
router.get('/courses', asyncHandler(async(req,res)=>{
    const courses = await courses.getCourses();
    res.json(courses);
    res.json({message: err.message});
}));



// GET /api/courses/:id 200 - Returns a the course (including the user that owns the course) for the provided course ID
router.get('/courses/:id', asyncHandler( async(req, res)=>{
    const id = req.params.id;
    const course = await courses.getCourses(id);
    if(course){
      res.json(course);
    } else {
      res.status(404).json({message: "Course not found."})
    }
    res.status(500).json({message: err.message})
}));



// POST /api/courses 201 - Creates a course, sets the Location header to the URI for the course, and returns no content
router.post('/courses', asyncHandler(async (req,res)=>{
    if(req.body.title && req.body.description){
      const course = await courses.createCourse({
        title: req.body.title,
        description: req.body.description
      });
      res.status(201).json(course);
    } else {
      res.status(400).json({message: "Title and description required."})
    }
  }));


// PUT /api/courses/:id 204 - Updates a course and returns no content
router.put('/courses/:id', asyncHandler (async(req,res)=> {
    const course = await courses.getCourse(req.params.id);
  if (course){
    course.title = req.body.title;
    course.description = req.body.description;

    await courses.updateCourse(course);
    res.status(204).end();
  } else {
    res.status(404).json({message: "Course Not Found."})
  }
    res.status(500).json({message: err.message})
}));


// DELETE /api/courses/:id 204 - Deletes a course and returns no content
router.delete('/courses/:id', asyncHandler (async(req,res)=>{ 
    const course = await courses.getCourse(req.params.id);
  if(course){
    await courses.deleteCourse(course);
    res.status(204).end();
    } else {
      res.status(404).json({message: "Course Not Found."})
    }
    res.status(500).json({message: err.message})
}));



module.exports = router;