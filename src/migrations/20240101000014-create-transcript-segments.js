'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('TranscriptSegments', {
            segmentId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            transcriptId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Transcripts', key: 'transcriptId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            segmentNumber: { type: Sequelize.INTEGER, allowNull: false },
            segmentText: { type: Sequelize.TEXT, allowNull: false },
            startTimestamp: { type: Sequelize.FLOAT, allowNull: false },
            endTimestamp: { type: Sequelize.FLOAT, allowNull: false },
            wordCount: { type: Sequelize.INTEGER },
            semanticLabel: { type: Sequelize.STRING(120) },
            confidenceScore: { type: Sequelize.FLOAT },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addConstraint('TranscriptSegments', {
            fields: ['transcriptId', 'segmentNumber'],
            type: 'unique',
            name: 'uq_segments_transcript_segment_number'
        });

        await queryInterface.addIndex('TranscriptSegments', ['transcriptId', 'startTimestamp'], { name: 'idx_segments_transcript_time' });
    },
    down: async (queryInterface) => queryInterface.dropTable('TranscriptSegments')
};
