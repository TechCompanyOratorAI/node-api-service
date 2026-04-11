"use strict";

/**
 * 1) Remove duplicate rows for the same (reportId, classRubricCriteriaId) — keeps smallest criterionFeedbackId.
 * 2) Add UNIQUE(reportId, classRubricCriteriaId) if missing (fixes PUT creating duplicate rows on MySQL).
 *
 * Dialect: MySQL / MariaDB (project uses mysql2).
 */
module.exports = {
  up: async (queryInterface) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== "mysql" && dialect !== "mariadb") {
      console.warn(
        `[20260410000001-fix-criterion-feedback-unique-constraint] Skipped: dialect is "${dialect}" (expected mysql).`
      );
      return;
    }

    const table = "CriterionFeedback";
    const constraintName = "uq_criterion_feedback_report_criteria";

    await queryInterface.sequelize.query(`
      DELETE t1 FROM CriterionFeedback AS t1
      INNER JOIN CriterionFeedback AS t2
        ON t1.reportId = t2.reportId
        AND t1.classRubricCriteriaId = t2.classRubricCriteriaId
        AND t1.criterionFeedbackId > t2.criterionFeedbackId
    `);

    const [rows] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME AS name
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = '${table}'
        AND CONSTRAINT_NAME = '${constraintName}'
        AND CONSTRAINT_TYPE = 'UNIQUE'
    `);

    if (!rows || rows.length === 0) {
      await queryInterface.addConstraint(table, {
        fields: ["reportId", "classRubricCriteriaId"],
        type: "unique",
        name: constraintName,
      });
    }
  },

  down: async (queryInterface) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== "mysql" && dialect !== "mariadb") {
      return;
    }

    const table = "CriterionFeedback";
    const constraintName = "uq_criterion_feedback_report_criteria";

    try {
      await queryInterface.removeConstraint(table, constraintName);
    } catch (e) {
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${table}\` DROP INDEX \`${constraintName}\``
      );
    }
  },
};
