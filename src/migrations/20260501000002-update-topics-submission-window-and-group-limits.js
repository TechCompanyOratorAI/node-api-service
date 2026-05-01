"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("Topics");

    if (!table.submissionStartDate) {
      await queryInterface.addColumn("Topics", "submissionStartDate", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!table.submissionDeadline) {
      await queryInterface.addColumn("Topics", "submissionDeadline", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!table.minGroups) {
      await queryInterface.addColumn("Topics", "minGroups", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      });
    }

    if (!table.maxGroups) {
      await queryInterface.addColumn("Topics", "maxGroups", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      });
    }

    if (table.sequenceNumber && table.sequenceNumber.allowNull === false) {
      await queryInterface.changeColumn("Topics", "sequenceNumber", {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("Topics");

    if (table.sequenceNumber && table.sequenceNumber.allowNull === true) {
      await queryInterface.changeColumn("Topics", "sequenceNumber", {
        type: Sequelize.INTEGER,
        allowNull: false,
      });
    }

    if (table.maxGroups) await queryInterface.removeColumn("Topics", "maxGroups");
    if (table.minGroups) await queryInterface.removeColumn("Topics", "minGroups");
    if (table.submissionDeadline) await queryInterface.removeColumn("Topics", "submissionDeadline");
    if (table.submissionStartDate) await queryInterface.removeColumn("Topics", "submissionStartDate");
  },
};

