'use strict';

module.exports = {
  async up(queryInterface) {
    const safe = async (fn) => {
      try { await fn(); } catch (e) {
        if (!e.message?.includes('Duplicate key name')) throw e;
      }
    };

    // ── Enrollments ──────────────────────────────────────────────────────────
    // status alone — used in count({ where: { status: 'enrolled' } })
    await safe(() => queryInterface.addIndex('Enrollments', ['status'], {
      name: 'idx_enrollments_status',
    }));

    // (classId, status) composite — instructor dashboard: count enrolled per class
    await safe(() => queryInterface.addIndex('Enrollments', ['classId', 'status'], {
      name: 'idx_enrollments_class_status',
    }));

    // ── AIReports ────────────────────────────────────────────────────────────
    // presentationId — FK with no index; used to load report for a presentation
    await safe(() => queryInterface.addIndex('AIReports', ['presentationId'], {
      name: 'idx_ai_reports_presentation',
    }));

    // overallScore — used in AVG() and CASE range grouping
    await safe(() => queryInterface.addIndex('AIReports', ['overallScore'], {
      name: 'idx_ai_reports_overall_score',
    }));

    // (reportStatus, overallScore) composite — score stats query filters confirmed + non-null score
    await safe(() => queryInterface.addIndex('AIReports', ['reportStatus', 'overallScore'], {
      name: 'idx_ai_reports_status_score',
    }));

    // createdAt — dashboard aggregation: reports per day (last 14 days)
    await safe(() => queryInterface.addIndex('AIReports', ['createdAt'], {
      name: 'idx_ai_reports_created_at',
    }));

    // ── Presentations ────────────────────────────────────────────────────────
    // createdAt — dashboard aggregation: presentations per day (last 30 days)
    await safe(() => queryInterface.addIndex('Presentations', ['createdAt'], {
      name: 'idx_presentations_created_at',
    }));

    // approvedBy — FK added later without index
    await safe(() => queryInterface.addIndex('Presentations', ['approvedBy'], {
      name: 'idx_presentations_approved_by',
    }));

    // (classId, createdAt) composite — instructor dashboard filters by class + date range
    await safe(() => queryInterface.addIndex('Presentations', ['classId', 'createdAt'], {
      name: 'idx_presentations_class_created_at',
    }));

    // ── Users ────────────────────────────────────────────────────────────────
    // isActive — used in User.count() and findAll({ where: { isActive: true } })
    await safe(() => queryInterface.addIndex('Users', ['isActive'], {
      name: 'idx_users_is_active',
    }));

    // ── TopicEnrollments ─────────────────────────────────────────────────────
    // status — used in findOne({ where: { status: 'enrolled' } })
    await safe(() => queryInterface.addIndex('TopicEnrollments', ['status'], {
      name: 'idx_topic_enrollments_status',
    }));
  },

  async down(queryInterface) {
    const indexes = [
      ['Enrollments',       'idx_enrollments_status'],
      ['Enrollments',       'idx_enrollments_class_status'],
      ['AIReports',         'idx_ai_reports_presentation'],
      ['AIReports',         'idx_ai_reports_overall_score'],
      ['AIReports',         'idx_ai_reports_status_score'],
      ['AIReports',         'idx_ai_reports_created_at'],
      ['Presentations',     'idx_presentations_created_at'],
      ['Presentations',     'idx_presentations_approved_by'],
      ['Presentations',     'idx_presentations_class_created_at'],
      ['Users',             'idx_users_is_active'],
      ['TopicEnrollments',  'idx_topic_enrollments_status'],
    ];

    for (const [table, name] of indexes) {
      try { await queryInterface.removeIndex(table, name); } catch {}
    }
  },
};
