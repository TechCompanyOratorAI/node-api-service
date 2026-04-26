"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("competency_catalogs");
    if (!table.departmentId) {
      await queryInterface.addColumn("competency_catalogs", "departmentId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "departments", key: "departmentId" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    const indexes = await queryInterface.showIndex("competency_catalogs");
    const hasDeptIdx = indexes.some((idx) => idx.name === "idx_competencies_department");
    if (!hasDeptIdx) {
      await queryInterface.addIndex("competency_catalogs", ["departmentId"], {
        name: "idx_competencies_department",
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex("competency_catalogs");
    const hasDeptIdx = indexes.some((idx) => idx.name === "idx_competencies_department");
    if (hasDeptIdx) {
      await queryInterface.removeIndex("competency_catalogs", "idx_competencies_department");
    }

    const table = await queryInterface.describeTable("competency_catalogs");
    if (table.departmentId) {
      await queryInterface.removeColumn("competency_catalogs", "departmentId");
    }
  },
};

