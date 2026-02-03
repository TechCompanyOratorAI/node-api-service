'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Sync existing courses: update departmentId based on majorCode
    await queryInterface.sequelize.query(`
      UPDATE Courses 
      SET departmentId = (
        SELECT departmentId 
        FROM departments 
        WHERE departments.departmentCode COLLATE utf8mb4_unicode_ci = Courses.majorCode COLLATE utf8mb4_unicode_ci
      )
      WHERE majorCode IS NOT NULL
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback: set departmentId to null for all courses
    await queryInterface.sequelize.query(`
      UPDATE Courses SET departmentId = NULL
    `);
  }
};
