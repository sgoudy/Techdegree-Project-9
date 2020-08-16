'use strict';

const express = require('express');
const morgan = require('morgan');

// Import Models and Sequelize
const db = require('./models');
const sequelize = require('./models/index').sequelize; 
const User = require('./models').User;
const Course = require('./models').Course;

// variable to enable global error logging
const enableGlobalErrorLogging = process.env.ENABLE_GLOBAL_ERROR_LOGGING === 'true';

// create the Express app
const app = express();

// Setup request body JSON parsing.
app.use(express.json());

// setup morgan which gives us http request logging
app.use(morgan('dev'));


// Import Routes
const courses = require('./routes/courses');
const users = require('./routes/users');
// Add routes.
app.use('/api/courses/', courses);
app.use('/api/users', users);


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

sequelize.sync().then(() => {
  const server = app.listen(app.get('port'), () => {
    console.log(`Express server is listening on port ${server.address().port}`);
  });
});


