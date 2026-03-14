'use strict';

/**
 * Migration: Add Rubric-based AI Reporting Tables
 * Version: 20260315000001
 * 
 * Creates:
 * - RubricTemplates: Stores reusable rubric templates
 * - RubricCriteria: Stores criteria belonging to rubric templates
 * - ClassAISettings: Stores AI setup for each class (links to AIConfigs & RubricTemplates)
 * - AIReports: Stores AI-generated report output (links to submission, class, config, rubric)
 * - Adds updatedAtConfig to existing AIConfigs table
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Step 1: Add updatedAtConfig column to existing AIConfigs table (idempotent)
        const [results] = await queryInterface.sequelize.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'AIConfigs' 
            AND COLUMN_NAME = 'updatedAtConfig'
        `);
        
        if (results.length === 0) {
            await queryInterface.addColumn('AIConfigs', 'updatedAtConfig', {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Timestamp when the config was last updated'
            });
        }

        // Step 2: Create RubricTemplates table
        await queryInterface.createTable('RubricTemplates', {
            rubricTemplateId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                comment: 'Primary key for rubric template'
            },
            templateName: {
                type: Sequelize.STRING(200),
                allowNull: false,
                comment: 'Name of the rubric template'
            },
            description: {
                type: Sequelize.TEXT,
                comment: 'Detailed description of the template'
            },
            assignmentType: {
                type: Sequelize.STRING(50),
                comment: 'Type of assignment this template applies to'
            },
            isDefault: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Whether this is the default template'
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether the template is active'
            },
            createdBy: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'User ID who created the template',
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
                comment: 'User ID who last updated',
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

        // Add indexes for RubricTemplates
        await queryInterface.addIndex('RubricTemplates', ['isActive'], { name: 'idx_rubric_templates_active' });
        await queryInterface.addIndex('RubricTemplates', ['assignmentType'], { name: 'idx_rubric_templates_assignment_type' });
        await queryInterface.addIndex('RubricTemplates', ['isDefault'], { name: 'idx_rubric_templates_default' });

        // Step 3: Create RubricCriteria table
        await queryInterface.createTable('RubricCriteria', {
            criteriaId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                comment: 'Primary key for rubric criteria'
            },
            rubricTemplateId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'FK to RubricTemplates',
                references: { model: 'RubricTemplates', key: 'rubricTemplateId' },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE'
            },
            criteriaName: {
                type: Sequelize.STRING(200),
                allowNull: false,
                comment: 'Name of the criteria'
            },
            criteriaDescription: {
                type: Sequelize.TEXT,
                comment: 'Detailed description'
            },
            weight: {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 1.00,
                comment: 'Weight in overall scoring'
            },
            maxScore: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 100,
                comment: 'Maximum possible score'
            },
            displayOrder: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
                comment: 'Order to display criteria'
            },
            evaluationGuide: {
                type: Sequelize.TEXT,
                comment: 'Guide for AI evaluation'
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether criteria is active'
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

        // Add indexes for RubricCriteria
        await queryInterface.addIndex('RubricCriteria', ['rubricTemplateId'], { name: 'idx_rubric_criteria_template' });
        await queryInterface.addIndex('RubricCriteria', ['displayOrder'], { name: 'idx_rubric_criteria_order' });

        // Step 4: Create ClassAISettings table
        await queryInterface.createTable('ClassAISettings', {
            classAiSettingId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                comment: 'Primary key for class AI settings'
            },
            classId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'FK to Classes',
                references: { model: 'Classes', key: 'classId' },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE'
            },
            configId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'FK to AIConfigs',
                references: { model: 'AIConfigs', key: 'configId' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            rubricTemplateId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'FK to RubricTemplates',
                references: { model: 'RubricTemplates', key: 'rubricTemplateId' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            enableAiReport: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether AI reporting is enabled'
            },
            requireInstructorConfirmation: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Require instructor confirmation'
            },
            allowInstructorEdit: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Instructors can edit AI reports'
            },
            enableSlideLayoutScoring: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Include slide layout in scoring'
            },
            slideLayoutWeight: {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: false,
                defaultValue: 0.10,
                comment: 'Weight for slide layout scoring'
            },
            feedbackLanguage: {
                type: Sequelize.STRING(10),
                allowNull: false,
                defaultValue: 'en',
                comment: 'Language code for feedback'
            },
            reportFormat: {
                type: Sequelize.STRING(20),
                allowNull: false,
                defaultValue: 'detailed',
                comment: 'Format of AI report'
            },
            includeCriterionComments: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Include criterion comments'
            },
            includeOverallSummary: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Include overall summary'
            },
            includeSuggestions: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Include improvement suggestions'
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether this setting is active'
            },
            createdBy: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'User who created this setting',
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
                comment: 'User who last updated',
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

        // Add unique constraint and indexes for ClassAISettings
        await queryInterface.addConstraint('ClassAISettings', {
            fields: ['classId'],
            type: 'unique',
            name: 'uq_class_ai_settings_class'
        });
        await queryInterface.addIndex('ClassAISettings', ['configId'], { name: 'idx_class_ai_settings_config' });
        await queryInterface.addIndex('ClassAISettings', ['rubricTemplateId'], { name: 'idx_class_ai_settings_rubric' });
        await queryInterface.addIndex('ClassAISettings', ['isActive'], { name: 'idx_class_ai_settings_active' });

        // Step 5: Create AIReports table
        await queryInterface.createTable('AIReports', {
            reportId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                comment: 'Primary key for AI report'
            },
            submissionId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'FK to Presentations (presentationId)'
            },
            classId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                comment: 'FK to Classes',
                references: { model: 'Classes', key: 'classId' },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE'
            },
            configId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'FK to AIConfigs',
                references: { model: 'AIConfigs', key: 'configId' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            rubricTemplateId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'FK to RubricTemplates',
                references: { model: 'RubricTemplates', key: 'rubricTemplateId' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            classAiSettingId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'FK to ClassAISettings',
                references: { model: 'ClassAISettings', key: 'classAiSettingId' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            overallScore: {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: true,
                comment: 'Overall score calculated by AI'
            },
            criterionScores: {
                type: Sequelize.JSON,
                comment: 'JSON array of scores for each criterion'
            },
            reportContent: {
                type: Sequelize.TEXT,
                comment: 'Generated report content in full text'
            },
            reportStatus: {
                type: Sequelize.ENUM('draft', 'pending_review', 'generating', 'completed', 'failed', 'confirmed', 'rejected'),
                allowNull: false,
                defaultValue: 'draft',
                comment: 'Status of the AI report'
            },
            confirmedByInstructorId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'Instructor who confirmed this report',
                references: { model: 'Users', key: 'userId' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            confirmedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Timestamp when confirmed by instructor'
            },
            generatedByModel: {
                type: Sequelize.STRING(100),
                allowNull: true,
                comment: 'Model name that generated this report'
            },
            generatedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Timestamp when report was generated'
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                comment: 'Timestamp when report was created'
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: true,
                comment: 'Timestamp when report was last updated'
            }
        });

        // Add unique constraint and indexes for AIReports
        await queryInterface.addConstraint('AIReports', {
            fields: ['submissionId'],
            type: 'unique',
            name: 'uq_ai_reports_submission'
        });
        await queryInterface.addIndex('AIReports', ['classId'], { name: 'idx_ai_reports_class' });
        await queryInterface.addIndex('AIReports', ['configId'], { name: 'idx_ai_reports_config' });
        await queryInterface.addIndex('AIReports', ['rubricTemplateId'], { name: 'idx_ai_reports_rubric' });
        await queryInterface.addIndex('AIReports', ['classAiSettingId'], { name: 'idx_ai_reports_class_setting' });
        await queryInterface.addIndex('AIReports', ['reportStatus'], { name: 'idx_ai_reports_status' });
        await queryInterface.addIndex('AIReports', ['confirmedByInstructorId'], { name: 'idx_ai_reports_confirmed' });
        await queryInterface.addIndex('AIReports', ['generatedAt'], { name: 'idx_ai_reports_generated' });
    },

    down: async (queryInterface) => {
        // Drop in reverse dependency order
        await queryInterface.dropTable('AIReports');
        await queryInterface.dropTable('ClassAISettings');
        await queryInterface.dropTable('RubricCriteria');
        await queryInterface.dropTable('RubricTemplates');
        
        // Optionally remove the added column (commented out to preserve data)
        // await queryInterface.removeColumn('AIConfigs', 'updatedAtConfig');
    }
};