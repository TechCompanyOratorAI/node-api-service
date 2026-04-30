"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("audit_logs", {
      auditLogId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      actorUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "Users",
          key: "userId",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      actorRole: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      entityType: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      entityId: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("success", "failure"),
        allowNull: false,
        defaultValue: "success",
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      requestId: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      ipAddress: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("audit_logs", ["actorUserId"], {
      name: "idx_audit_logs_actor_user",
    });
    await queryInterface.addIndex("audit_logs", ["action"], {
      name: "idx_audit_logs_action",
    });
    await queryInterface.addIndex("audit_logs", ["entityType", "entityId"], {
      name: "idx_audit_logs_entity",
    });
    await queryInterface.addIndex("audit_logs", ["createdAt"], {
      name: "idx_audit_logs_created_at",
    });

    await queryInterface.sequelize.query(`
      INSERT INTO Roles (roleName, description, createdAt, updatedAt)
      SELECT 'AcademicCoordinator',
             'Academic coordinator who manages curriculum, rosters, and instructor eligibility',
             NOW(),
             NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM Roles WHERE roleName = 'AcademicCoordinator'
      )
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Roles", {
      roleName: "AcademicCoordinator",
    });

    await queryInterface.dropTable("audit_logs");

  },
};
