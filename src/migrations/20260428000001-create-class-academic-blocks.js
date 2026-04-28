"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("class_academic_blocks", {
      classAcademicBlockId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      classId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Classes", key: "classId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      academicBlockId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "academic_blocks", key: "academicBlockId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("class_academic_blocks", ["classId"], { name: "idx_clab_class" });
    await queryInterface.addIndex("class_academic_blocks", ["academicBlockId"], { name: "idx_clab_block" });
    await queryInterface.addConstraint("class_academic_blocks", {
      fields: ["classId", "academicBlockId"],
      type: "unique",
      name: "uq_clab_class_block",
    });

    await queryInterface.sequelize.query(`
      INSERT INTO class_academic_blocks (classId, academicBlockId, isPrimary, createdAt, updatedAt)
      SELECT c.classId, c.academicBlockId, 1, NOW(), NOW()
      FROM Classes c
      WHERE c.academicBlockId IS NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint("class_academic_blocks", "uq_clab_class_block");
    await queryInterface.removeIndex("class_academic_blocks", "idx_clab_class");
    await queryInterface.removeIndex("class_academic_blocks", "idx_clab_block");
    await queryInterface.dropTable("class_academic_blocks");
  },
};
