'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'departmentId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'departments',
        key: 'departmentId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Bộ môn của giảng viên'
    });

    // Add index for faster queries
    await queryInterface.addIndex('Users', ['departmentId'], {
      name: 'idx_user_department'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Users', 'idx_user_department');
    await queryInterface.removeColumn('Users', 'departmentId');
  }
};
