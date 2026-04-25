/**
 * Migration: Add state machine fields to GroupGradeDistributions and GroupGradeMembers
 * Run once: node src/scripts/migrateGradeDistributionStateMachine.js
 */
"use strict";

const db = require("../models");

async function migrate() {
  const queryInterface = db.sequelize.getQueryInterface();
  const DataTypes = db.Sequelize.DataTypes;

  console.log("🔧 Starting migration: Grade Distribution State Machine...");

  try {
    // === GroupGradeDistributions ===
    const distCols = await queryInterface.describeTable("GroupGradeDistributions");

    if (!distCols.status) {
      await queryInterface.addColumn("GroupGradeDistributions", "status", {
        type: DataTypes.ENUM("submitted", "reopened", "finalized"),
        allowNull: false,
        defaultValue: "submitted",
        after: "distributedAt",
      });
      console.log("  ✅ Added GroupGradeDistributions.status");
    } else {
      console.log("  ⏭  GroupGradeDistributions.status already exists");
    }

    if (!distCols.submittedCount) {
      await queryInterface.addColumn("GroupGradeDistributions", "submittedCount", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        after: "status",
      });
      // Existing rows count as 1 submit
      await db.sequelize.query(
        "UPDATE GroupGradeDistributions SET submittedCount = 1 WHERE submittedCount = 0"
      );
      console.log("  ✅ Added GroupGradeDistributions.submittedCount");
    } else {
      console.log("  ⏭  GroupGradeDistributions.submittedCount already exists");
    }

    if (!distCols.finalizedAt) {
      await queryInterface.addColumn("GroupGradeDistributions", "finalizedAt", {
        type: DataTypes.DATE,
        allowNull: true,
        after: "submittedCount",
      });
      console.log("  ✅ Added GroupGradeDistributions.finalizedAt");
    } else {
      console.log("  ⏭  GroupGradeDistributions.finalizedAt already exists");
    }

    // === GroupGradeMembers ===
    const memberCols = await queryInterface.describeTable("GroupGradeMembers");

    if (!memberCols.memberFeedback) {
      await queryInterface.addColumn("GroupGradeMembers", "memberFeedback", {
        type: DataTypes.TEXT,
        allowNull: true,
        after: "reason",
      });
      console.log("  ✅ Added GroupGradeMembers.memberFeedback");
    } else {
      console.log("  ⏭  GroupGradeMembers.memberFeedback already exists");
    }

    if (!memberCols.feedbackAt) {
      await queryInterface.addColumn("GroupGradeMembers", "feedbackAt", {
        type: DataTypes.DATE,
        allowNull: true,
        after: "memberFeedback",
      });
      console.log("  ✅ Added GroupGradeMembers.feedbackAt");
    } else {
      console.log("  ⏭  GroupGradeMembers.feedbackAt already exists");
    }

    if (!memberCols.feedbackStatus) {
      await queryInterface.addColumn("GroupGradeMembers", "feedbackStatus", {
        type: DataTypes.ENUM("pending", "accepted", "rejected"),
        allowNull: true,
        defaultValue: null,
        after: "feedbackAt",
      });
      console.log("  ✅ Added GroupGradeMembers.feedbackStatus");
    } else {
      console.log("  ⏭  GroupGradeMembers.feedbackStatus already exists");
    }

    console.log("\n✅ Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

migrate();
