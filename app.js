'use strict';

// load modules
const express = require('express');
const morgan = require('morgan');
const routes = require('./routes');

const db = require('./db');
const { Course, User } = db.models;
const { Op } = db.Sequelize; // provides use of operators

// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

// create the Express app
const app = express();

// Setup request body JSON parsing.
app.use(express.json());

// setup morgan which gives us http request logging
app.use(morgan('dev'));

//
(async () => {
  await db.sequelize.sync({ force: true });
  try{
    const person1 = await User.create({
        "firstName": "Joe",
        "lastName": "Smith",
        "emailAddress": "joe@smith.com",
        "password": "joepassword"
    });
    console.log(person1.toJSON());
    const course1 = await Course.create({
      "userId": 2,
      "title": "Learn How to Program",
      "description": "In this course, you'll learn how to write code like a pro!",
      "estimatedTime": "6 hours",
      "materialsNeeded": "* Notebook computer running Mac OS X or Windows\n* Text editor"
    });
    console.log(course1.toJSON());
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
        const errors = error.errors.map(err => err.message);
        console.error('Validation errors: ', errors);
      } else {
        throw error;
      }
    console.error('Error connecting to the database: ', error);
  }
})();

// Create a friendly greeting for the root route.
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the REST API Project!',
  });
});

// Add routes.
app.use('/api', routes);

//--- Error handling below, trickle-down ----//
// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

// setup a global error handler
app.use((err, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }

  res.status(err.status || 500).json({
    message: err.message,
    error: {},
  });
});

// set our port
app.set('port', process.env.PORT || 5000);

// start listening on our port
const server = app.listen(app.get('port'), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});
