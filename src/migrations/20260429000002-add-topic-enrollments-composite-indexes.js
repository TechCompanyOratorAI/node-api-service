'use strict';

module.exports = {
  async up(queryInterface) {
    const safe = async (fn) => {
      try { await fn(); } catch (e) {
        if (!e.message?.includes('Duplicate key name')) throw e;
      }
    };

    // Query pattern: where { topicId, groupId, status: 'enrolled' }
    await safe(() => queryInterface.addIndex('TopicEnrollments', ['topicId', 'groupId', 'status'], {
      name: 'idx_topic_enrollments_topic_group_status',
    }));

    // Query pattern: where { topicId, studentId, status: 'enrolled' }
    await safe(() => queryInterface.addIndex('TopicEnrollments', ['topicId', 'studentId', 'status'], {
      name: 'idx_topic_enrollments_topic_student_status',
    }));
  },

  async down(queryInterface) {
    const indexes = [
      ['TopicEnrollments', 'idx_topic_enrollments_topic_group_status'],
      ['TopicEnrollments', 'idx_topic_enrollments_topic_student_status'],
    ];

    for (const [table, name] of indexes) {
      try { await queryInterface.removeIndex(table, name); } catch {}
    }
  },
};

