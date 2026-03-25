'use strict';

/**
 * Mở rộng bảng Feedback để hỗ trợ feedback của Instructor cho AI Report (theo từng criteria).
 * - reportId: liên kết tới AIReports (một report tối đa một dòng feedback instructor)
 * - criterionFeedbacks: JSON — [{ classRubricCriteriaId | criteriaId, criteriaName?, feedback }, ...]
 * - feedbackType: thêm giá trị 'ai_report_instructor'
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const qi = queryInterface;
    const table = 'Feedback';

    const [cols] = await qi.sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table
    `, { replacements: { table } });

    const names = cols.map((c) => c.COLUMN_NAME);

    if (!names.includes('reportId')) {
      await qi.addColumn(table, 'reportId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'FK tới AIReports — feedback của instructor cho AI report',
        references: { model: 'AIReports', key: 'reportId' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }

    if (!names.includes('criterionFeedbacks')) {
      await qi.addColumn(table, 'criterionFeedbacks', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Feedback chi tiết theo từng tiêu chí (JSON array)',
      });
    }

    const [enumCol] = await qi.sequelize.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND COLUMN_NAME = 'feedbackType'
    `, { replacements: { table } });

    const colType = enumCol[0] && enumCol[0].COLUMN_TYPE ? String(enumCol[0].COLUMN_TYPE) : '';
    if (!colType.includes('ai_report_instructor')) {
      await qi.sequelize.query(`
        ALTER TABLE \`${table}\` MODIFY COLUMN \`feedbackType\` ENUM(
          'general',
          'content',
          'delivery',
          'structure',
          'engagement',
          'ai_report_instructor'
        ) NOT NULL DEFAULT 'general'
      `);
    }

    const [idx] = await qi.sequelize.query(`
      SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table AND INDEX_NAME = 'uq_feedback_report_id'
    `, { replacements: { table } });

    if (idx.length === 0) {
      await qi.addIndex(table, ['reportId'], {
        unique: true,
        name: 'uq_feedback_report_id',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const qi = queryInterface;
    const table = 'Feedback';

    try {
      await qi.removeIndex(table, 'uq_feedback_report_id');
    } catch (e) {
      /* ignore */
    }

    await qi.sequelize.query(`
      UPDATE \`${table}\` SET feedbackType = 'general' WHERE feedbackType = 'ai_report_instructor'
    `);

    const [cols] = await qi.sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :table
    `, { replacements: { table } });

    const names = cols.map((c) => c.COLUMN_NAME);

    if (names.includes('criterionFeedbacks')) {
      await qi.removeColumn(table, 'criterionFeedbacks');
    }
    if (names.includes('reportId')) {
      await qi.removeColumn(table, 'reportId');
    }

    await qi.sequelize.query(`
      ALTER TABLE \`${table}\` MODIFY COLUMN \`feedbackType\` ENUM(
        'general',
        'content',
        'delivery',
        'structure',
        'engagement'
      ) NOT NULL DEFAULT 'general'
    `);
  },
};
