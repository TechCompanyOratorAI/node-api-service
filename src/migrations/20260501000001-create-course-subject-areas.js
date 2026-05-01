"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("course_subject_areas", {
      courseSubjectAreaId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      courseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Courses", key: "courseId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      subjectAreaId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "subject_areas", key: "subjectAreaId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      isPrimary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("course_subject_areas", ["courseId"], {
      name: "idx_csa_course",
    });
    await queryInterface.addIndex("course_subject_areas", ["subjectAreaId"], {
      name: "idx_csa_subject_area",
    });
    await queryInterface.addConstraint("course_subject_areas", {
      fields: ["courseId", "subjectAreaId"],
      type: "unique",
      name: "uq_csa_course_subject_area",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint("course_subject_areas", "uq_csa_course_subject_area");
    await queryInterface.removeIndex("course_subject_areas", "idx_csa_subject_area");
    await queryInterface.removeIndex("course_subject_areas", "idx_csa_course");
    await queryInterface.dropTable("course_subject_areas");
  },
};

