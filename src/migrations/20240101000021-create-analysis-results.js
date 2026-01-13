'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('AnalysisResults', {
            resultId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            presentationId: {
                type: Sequelize.INTEGER, allowNull: false, unique: true,
                references: { model: 'Presentations', key: 'presentationId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            configId: {
                type: Sequelize.INTEGER,
                references: { model: 'AIConfigs', key: 'configId' },
                onDelete: 'SET NULL', onUpdate: 'CASCADE'
            },
            overallScore: { type: Sequelize.FLOAT },
            analyzedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            processingTimeSeconds: { type: Sequelize.INTEGER },
            aiModelVersion: { type: Sequelize.STRING(100) },
            status: {
                type: Sequelize.ENUM('queued', 'running', 'done', 'failed'),
                allowNull: false,
                defaultValue: 'queued'
            },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addIndex('AnalysisResults', ['status'], { name: 'idx_analysis_results_status' });

        // Now add FKs for resultId columns created earlier
        await queryInterface.addConstraint('ContentRelevance', {
            fields: ['resultId'],
            type: 'foreign key',
            name: 'fk_content_relevance_result',
            references: { table: 'AnalysisResults', field: 'resultId' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });

        await queryInterface.addConstraint('SemanticSimilarity', {
            fields: ['resultId'],
            type: 'foreign key',
            name: 'fk_semantic_similarity_result',
            references: { table: 'AnalysisResults', field: 'resultId' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });

        await queryInterface.addConstraint('AlignmentChecks', {
            fields: ['resultId'],
            type: 'foreign key',
            name: 'fk_alignment_checks_result',
            references: { table: 'AnalysisResults', field: 'resultId' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });
    },
    down: async (queryInterface) => {
        // drop child first to avoid constraint issues
        await queryInterface.removeConstraint('AlignmentChecks', 'fk_alignment_checks_result').catch(() => { });
        await queryInterface.removeConstraint('SemanticSimilarity', 'fk_semantic_similarity_result').catch(() => { });
        await queryInterface.removeConstraint('ContentRelevance', 'fk_content_relevance_result').catch(() => { });
        await queryInterface.dropTable('AnalysisResults');
    }
};
