'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Extend fileFormat in Slides table from VARCHAR(20) to VARCHAR(255)
    await queryInterface.changeColumn('Slides', 'fileFormat', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    // Extend fileFormat in AudioRecords table (same issue) from VARCHAR(20) to VARCHAR(255)
    await queryInterface.changeColumn('AudioRecords', 'fileFormat', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('Slides', 'fileFormat', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await queryInterface.changeColumn('AudioRecords', 'fileFormat', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },
};
