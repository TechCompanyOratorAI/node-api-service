'use strict';


module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('CriterionFeedback', {
            criterionFeedbackId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                comment: 'Primary key for criterion feedback'
            },
            reportId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'FK to AIReports',
                references: { model: 'AIReports', key: 'reportId' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            classRubricCriteriaId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'FK to ClassRubricCriteria — criteria mà AI đã đánh giá trong report này',
                references: { model: 'ClassRubricCriteria', key: 'classRubricCriteriaId' },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE'
            },
            instructorId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'FK to Users — instructor who gave this feedback',
                references: { model: 'Users', key: 'userId' },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE'
            },
            score: {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: true,
                comment: 'Score given by instructor for this criterion'
            },
            comment: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Comment/feedback text for this criterion'
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                comment: 'Timestamp when created'
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Timestamp when last updated'
            }
        });

        await queryInterface.addConstraint('CriterionFeedback', {
            fields: ['reportId', 'classRubricCriteriaId'],
            type: 'unique',
            name: 'uq_criterion_feedback_report_criteria'
        });

        await queryInterface.addIndex('CriterionFeedback', ['reportId'], {
            name: 'idx_criterion_feedback_report'
        });
        await queryInterface.addIndex('CriterionFeedback', ['classRubricCriteriaId'], {
            name: 'idx_criterion_feedback_criteria'
        });
        await queryInterface.addIndex('CriterionFeedback', ['instructorId'], {
            name: 'idx_criterion_feedback_instructor'
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('CriterionFeedback');
    }
};
