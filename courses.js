const fs = require('fs');

function save(data){
  return new Promise((resolve, reject) => {
    fs.writeFile('./seed/data.json', JSON.stringify(data, null, 2), (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Gets all courses
 * @param None
 */

function getCourses(){
  return new Promise((resolve, reject) => {
    fs.readFile('./seed/data.json', 'utf8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        const json = JSON.parse(data);
        resolve(json);
      }
    });
  });
};

/**
 * Gets a specific course by ID
 * @param {number} id - Accepts the ID of the specified course.
 */

async function getCourse(id){
  const courses = await getCourses();
  return courses.courses.find(course => course.id == id);
}


/**
 * Creates a new course 
 * @param {Object} newCourse- Object containing info for new course: the course text, author and year 
 */
async function createCourse(newCourse) {
  const courses = await getCourses(); 
  courses.courses.push(newCourse);
  await save(courses); 
  return newCourse; 
}

/**
 * Updates a single course
 * @param {Object} newCourse - An object containing the changes to quote: quote, author, year (all optional)
 */
async function updateCourse(newCourse){
  const courses = await getCourses();
  let course = courses.courses.find(item => item.id == newCourse.id);
  console.log(course);
  course.title = newCourse.title;
  course.description = newCourse.description;
  course.estimatedTime = newCourse.estimatedTime;
  course.materialsNeeded = newCourse.materialsNeeded;
  await save(courses);
}

/**
 * Deletes a single course
 * @param {Object} course - Accepts course to be deleted. 
 */
async function deleteCourse(course){
  const courses = await getCourses();
  courses.courses = courses.courses.filter(item => item.id != course.id);
  await save(courses);
}

module.exports = {
  getCourses,
  getCourse, 
  createCourse, 
  updateCourse, 
  deleteCourse
}
