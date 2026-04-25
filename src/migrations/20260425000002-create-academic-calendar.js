"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("academic_years", {
      academicYearId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
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

    await queryInterface.createTable("academic_blocks", {
      academicBlockId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      academicYearId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "academic_years",
          key: "academicYearId",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      blockCode: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
      },
      term: {
        type: Sequelize.ENUM("SPRING", "SUMMER", "FALL"),
        allowNull: false,
      },
      half: {
        type: Sequelize.ENUM("H1", "H2"),
        allowNull: true,
      },
      blockType: {
        type: Sequelize.ENUM("NORMAL", "BLOCK3"),
        allowNull: false,
        defaultValue: "NORMAL",
      },
      startDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      handoverStartDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      handoverEndDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
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

    await queryInterface.addIndex("academic_blocks", ["academicYearId"], {
      name: "idx_academic_blocks_year",
    });
    await queryInterface.addIndex("academic_blocks", ["term"], {
      name: "idx_academic_blocks_term",
    });
    await queryInterface.addIndex("academic_blocks", ["blockType"], {
      name: "idx_academic_blocks_type",
    });
    await queryInterface.addIndex("academic_blocks", ["startDate", "endDate"], {
      name: "idx_academic_blocks_dates",
    });

    await queryInterface.addColumn("Courses", "academicBlockId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "academic_blocks",
        key: "academicBlockId",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addColumn("Classes", "academicBlockId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "academic_blocks",
        key: "academicBlockId",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    await queryInterface.addIndex("Courses", ["academicBlockId"], {
      name: "idx_courses_academic_block",
    });
    await queryInterface.addIndex("Classes", ["academicBlockId"], {
      name: "idx_classes_academic_block",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("Classes", "idx_classes_academic_block");
    await queryInterface.removeIndex("Courses", "idx_courses_academic_block");
    await queryInterface.removeColumn("Classes", "academicBlockId");
    await queryInterface.removeColumn("Courses", "academicBlockId");
    await queryInterface.dropTable("academic_blocks");
    await queryInterface.dropTable("academic_years");
  },
};
