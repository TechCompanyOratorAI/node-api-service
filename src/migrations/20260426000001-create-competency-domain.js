"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("majors", {
      majorId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      majorCode: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true,
      },
      majorName: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      departmentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "departments", key: "departmentId" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.createTable("subject_areas", {
      subjectAreaId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      subjectCode: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true,
      },
      subjectName: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      majorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "majors", key: "majorId" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      departmentId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "departments", key: "departmentId" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.addColumn("Courses", "majorId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "majors", key: "majorId" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addColumn("Courses", "subjectAreaId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "subject_areas", key: "subjectAreaId" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.createTable("competency_catalogs", {
      competencyId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      competencyCode: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      competencyName: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      majorId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "majors", key: "majorId" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      subjectAreaId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "subject_areas", key: "subjectAreaId" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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

    await queryInterface.createTable("course_competency_requirements", {
      courseCompetencyRequirementId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      courseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Courses", key: "courseId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      competencyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "competency_catalogs", key: "competencyId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      minLevel: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      isRequired: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "userId" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    await queryInterface.createTable("instructor_competencies", {
      instructorCompetencyId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      instructorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "userId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      competencyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "competency_catalogs", key: "competencyId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      status: {
        type: Sequelize.ENUM("pending", "approved", "rejected"),
        allowNull: false,
        defaultValue: "pending",
      },
      declaredAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      approvedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "userId" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      rejectionReason: {
        type: Sequelize.TEXT,
        allowNull: true,
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

    await queryInterface.createTable("instructor_competency_evidences", {
      evidenceId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      instructorCompetencyId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "instructor_competencies", key: "instructorCompetencyId" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      evidenceType: {
        type: Sequelize.ENUM("certificate", "project", "teaching_record", "other"),
        allowNull: false,
        defaultValue: "other",
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      url: {
        type: Sequelize.STRING(1000),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      submittedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      verifiedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      verifiedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "userId" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
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

    await queryInterface.addColumn("class_instructors", "assignmentStatus", {
      type: Sequelize.ENUM("eligible", "override"),
      allowNull: false,
      defaultValue: "eligible",
    });
    await queryInterface.addColumn("class_instructors", "overrideReason", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("class_instructors", "overrideBy", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "Users", key: "userId" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addColumn("class_instructors", "overrideAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addIndex("majors", ["departmentId"], { name: "idx_majors_department" });
    await queryInterface.addIndex("subject_areas", ["majorId"], { name: "idx_subject_areas_major" });
    await queryInterface.addIndex("subject_areas", ["departmentId"], { name: "idx_subject_areas_department" });
    await queryInterface.addIndex("Courses", ["majorId"], { name: "idx_courses_major" });
    await queryInterface.addIndex("Courses", ["subjectAreaId"], { name: "idx_courses_subject_area" });
    await queryInterface.addIndex("competency_catalogs", ["majorId"], { name: "idx_competencies_major" });
    await queryInterface.addIndex("competency_catalogs", ["subjectAreaId"], { name: "idx_competencies_subject_area" });
    await queryInterface.addIndex("course_competency_requirements", ["courseId"], { name: "idx_ccr_course" });
    await queryInterface.addIndex("course_competency_requirements", ["competencyId"], { name: "idx_ccr_competency" });
    await queryInterface.addConstraint("course_competency_requirements", {
      fields: ["courseId", "competencyId"],
      type: "unique",
      name: "uq_ccr_course_competency",
    });
    await queryInterface.addIndex("instructor_competencies", ["instructorId"], { name: "idx_ic_instructor" });
    await queryInterface.addIndex("instructor_competencies", ["competencyId"], { name: "idx_ic_competency" });
    await queryInterface.addIndex("instructor_competencies", ["status"], { name: "idx_ic_status" });
    await queryInterface.addConstraint("instructor_competencies", {
      fields: ["instructorId", "competencyId"],
      type: "unique",
      name: "uq_ic_instructor_competency",
    });
    await queryInterface.addIndex("instructor_competency_evidences", ["instructorCompetencyId"], {
      name: "idx_ice_instructor_competency",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("instructor_competency_evidences", "idx_ice_instructor_competency");
    await queryInterface.removeConstraint("instructor_competencies", "uq_ic_instructor_competency");
    await queryInterface.removeIndex("instructor_competencies", "idx_ic_status");
    await queryInterface.removeIndex("instructor_competencies", "idx_ic_competency");
    await queryInterface.removeIndex("instructor_competencies", "idx_ic_instructor");
    await queryInterface.removeConstraint("course_competency_requirements", "uq_ccr_course_competency");
    await queryInterface.removeIndex("course_competency_requirements", "idx_ccr_competency");
    await queryInterface.removeIndex("course_competency_requirements", "idx_ccr_course");
    await queryInterface.removeIndex("competency_catalogs", "idx_competencies_subject_area");
    await queryInterface.removeIndex("competency_catalogs", "idx_competencies_major");
    await queryInterface.removeIndex("Courses", "idx_courses_subject_area");
    await queryInterface.removeIndex("Courses", "idx_courses_major");
    await queryInterface.removeIndex("subject_areas", "idx_subject_areas_department");
    await queryInterface.removeIndex("subject_areas", "idx_subject_areas_major");
    await queryInterface.removeIndex("majors", "idx_majors_department");

    await queryInterface.removeColumn("class_instructors", "overrideAt");
    await queryInterface.removeColumn("class_instructors", "overrideBy");
    await queryInterface.removeColumn("class_instructors", "overrideReason");
    await queryInterface.removeColumn("class_instructors", "assignmentStatus");

    await queryInterface.dropTable("instructor_competency_evidences");
    await queryInterface.dropTable("instructor_competencies");
    await queryInterface.dropTable("course_competency_requirements");
    await queryInterface.dropTable("competency_catalogs");

    await queryInterface.removeColumn("Courses", "subjectAreaId");
    await queryInterface.removeColumn("Courses", "majorId");
    await queryInterface.dropTable("subject_areas");
    await queryInterface.dropTable("majors");
  },
};
