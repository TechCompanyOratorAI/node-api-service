'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop old unique constraint on (courseId, sequenceNumber)
    // This was wrong because topics now belong to a class, not a course.
    // Two different classes on the same course can have topics with the same sequenceNumber.
    await queryInterface.removeConstraint('Topics', 'uq_topics_course_sequence');

    // Add new unique constraint on (classId, sequenceNumber)
    // sequenceNumber must only be unique within a single class.
    await queryInterface.addConstraint('Topics', {
      fields: ['classId', 'sequenceNumber'],
      type: 'unique',
      name: 'uq_topics_class_sequence',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('Topics', 'uq_topics_class_sequence');

    await queryInterface.addConstraint('Topics', {
      fields: ['courseId', 'sequenceNumber'],
      type: 'unique',
      name: 'uq_topics_course_sequence',
    });
  },
};
