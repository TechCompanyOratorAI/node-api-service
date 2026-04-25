"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("course_academic_blocks", {
      courseAcademicBlockId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      courseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Courses",
          key: "courseId",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      academicBlockId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "academic_blocks",
          key: "academicBlockId",
        },
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

    await queryInterface.addIndex("course_academic_blocks", ["courseId"], {
      name: "idx_cab_course",
    });
    await queryInterface.addIndex("course_academic_blocks", ["academicBlockId"], {
      name: "idx_cab_block",
    });
    await queryInterface.addConstraint("course_academic_blocks", {
      fields: ["courseId", "academicBlockId"],
      type: "unique",
      name: "uq_cab_course_block",
    });

    await queryInterface.sequelize.query(`
      INSERT INTO course_academic_blocks (courseId, academicBlockId, isPrimary, createdAt, updatedAt)
      SELECT c.courseId, c.academicBlockId, 1, NOW(), NOW()
      FROM Courses c
      WHERE c.academicBlockId IS NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint("course_academic_blocks", "uq_cab_course_block");
    await queryInterface.removeIndex("course_academic_blocks", "idx_cab_course");
    await queryInterface.removeIndex("course_academic_blocks", "idx_cab_block");
    await queryInterface.dropTable("course_academic_blocks");
  },
};
