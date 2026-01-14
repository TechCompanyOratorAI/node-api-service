"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Insert default roles
    await queryInterface.bulkInsert("Roles", [
      {
        roleName: "Admin",
        description: "System administrator with full access",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        roleName: "Instructor",
        description: "Course instructor who can create and manage courses",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        roleName: "Student",
        description:
          "Student who can enroll in courses and create presentations",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Remove default roles
    await queryInterface.bulkDelete("Roles", {
      roleName: ["Admin", "Instructor", "Student"],
    });
  },
};
