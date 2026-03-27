'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add classId column (nullable first for existing data)
    await queryInterface.addColumn('Topics', 'classId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Classes',
        key: 'classId',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // 2. Add index for fast lookup by class
    await queryInterface.addIndex('Topics', ['classId'], {
      name: 'idx_topics_classId',
    });

    // 3. Make courseId nullable (topics now belong to class, not course directly)
    await queryInterface.changeColumn('Topics', 'courseId', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Topics', 'idx_topics_classId');
    await queryInterface.removeColumn('Topics', 'classId');

    // Restore courseId as NOT NULL
    await queryInterface.changeColumn('Topics', 'courseId', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
  },
};
