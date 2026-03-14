'use strict';

/**
 * Migration: Create ClassRubricCriteria Table
 * Version: 20260315000002
 * 
 * Purpose:
 * - Stores actual rubric criteria used by each class for AI presentation reports
 * - Supports copying criteria from rubric template into a class
 * - Allows instructors to edit criteria for their class
 * - Allows instructors to add custom criteria for their class
 * - Keeps original rubric template unchanged
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('ClassRubricCriteria', {
            classRubricCriteriaId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                comment: 'Primary key for class rubric criteria'
            },
            classId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'Class this rubric criterion belongs to',
                references: { model: 'Classes', key: 'classId' },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE'
            },
            rubricTemplateId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Source rubric template used to initialize this criterion',
                references: { model: 'RubricTemplates', key: 'rubricTemplateId' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            sourceCriteriaId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Original template criterion ID if copied from template; NULL if instructor created manually',
                references: { model: 'RubricCriteria', key: 'criteriaId' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            criteriaName: {
                type: Sequelize.STRING(150),
                allowNull: false,
                comment: 'Name of the criterion used in this class'
            },
            criteriaDescription: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Description of the criterion for this class'
            },
            weight: {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 0.00,
                comment: 'Weight of this criterion in the class rubric'
            },
            maxScore: {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 10.00,
                comment: 'Maximum score for this criterion'
            },
            displayOrder: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 1,
                comment: 'Display order of the criterion in the class rubric'
            },
            evaluationGuide: {
                type: Sequelize.TEXT,
                allowNull: true,
                comment: 'Guidance for AI/instructor on how to evaluate this criterion'
            },
            isActive: {
                type: Sequelize.TINYINT(1),
                allowNull: false,
                defaultValue: 1,
                comment: 'Whether this criterion is active for the class'
            },
            createdBy: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'User who created this class rubric criterion',
                references: { model: 'Users', key: 'userId' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                comment: 'Timestamp when created'
            },
            updatedBy: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'User who last updated this class rubric criterion',
                references: { model: 'Users', key: 'userId' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Timestamp when last updated'
            }
        });

        // Add indexes
        await queryInterface.addIndex('ClassRubricCriteria', ['classId'], { name: 'idx_class_rubric_class' });
        await queryInterface.addIndex('ClassRubricCriteria', ['rubricTemplateId'], { name: 'idx_class_rubric_template' });
        await queryInterface.addIndex('ClassRubricCriteria', ['sourceCriteriaId'], { name: 'idx_class_rubric_source' });
        await queryInterface.addIndex('ClassRubricCriteria', ['isActive'], { name: 'idx_class_rubric_active' });
        
        // Composite index for ordering
        await queryInterface.addIndex('ClassRubricCriteria', ['classId', 'displayOrder'], { 
            name: 'idx_class_rubric_class_order' 
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('ClassRubricCriteria');
    }
};