'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add groupId column
    await queryInterface.addColumn('TopicEnrollments', 'groupId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Groups',
        key: 'groupId',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // Add index for fast lookup
    await queryInterface.addIndex('TopicEnrollments', ['groupId'], {
      name: 'idx_topic_enrollments_groupId',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('TopicEnrollments', 'idx_topic_enrollments_groupId');
    await queryInterface.removeColumn('TopicEnrollments', 'groupId');
  },
};
