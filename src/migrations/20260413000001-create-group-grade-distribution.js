"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Bảng chính lưu thông tin chia điểm của leader
    await queryInterface.createTable("GroupGradeDistributions", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      groupId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Groups",
          key: "groupId",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      reportId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "AIReports",
          key: "reportId",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      leaderStudentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "userId",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      instructorGrade: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: "Điểm gốc Instructor cho (thang 10)",
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Lý do chia điểm của leader",
      },
      distributedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });

    // Index cho bảng GroupGradeDistributions
    await queryInterface.addIndex("GroupGradeDistributions", ["groupId"], {
      name: "idx_group_grade_distributions_groupId",
    });
    await queryInterface.addIndex("GroupGradeDistributions", ["reportId"], {
      name: "idx_group_grade_distributions_reportId",
    });
    await queryInterface.addIndex("GroupGradeDistributions", ["leaderStudentId"], {
      name: "idx_group_grade_distributions_leaderStudentId",
    });
    // Unique: mỗi (groupId, reportId) chỉ có 1 distribution
    await queryInterface.addIndex("GroupGradeDistributions", ["groupId", "reportId"], {
      name: "idx_group_grade_distributions_groupId_reportId",
      unique: true,
    });

    // Bảng chi tiết từng thành viên nhận điểm
    await queryInterface.createTable("GroupGradeMembers", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      distributionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "GroupGradeDistributions",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      studentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "userId",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: "Phần trăm đóng góp của thành viên (0.00 - 100.00)",
      },
      receivedGrade: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: "Điểm thực nhận = instructorGrade * percentage / 100",
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: "Lý do vì sao thành viên này được % như vậy",
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
      },
    });

    // Index cho bảng GroupGradeMembers
    await queryInterface.addIndex("GroupGradeMembers", ["distributionId"], {
      name: "idx_group_grade_members_distributionId",
    });
    await queryInterface.addIndex("GroupGradeMembers", ["studentId"], {
      name: "idx_group_grade_members_studentId",
    });
    // Unique: mỗi (distributionId, studentId) chỉ có 1 record
    await queryInterface.addIndex("GroupGradeMembers", ["distributionId", "studentId"], {
      name: "idx_group_grade_members_distributionId_studentId",
      unique: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("GroupGradeMembers");
    await queryInterface.dropTable("GroupGradeDistributions");
  },
};
