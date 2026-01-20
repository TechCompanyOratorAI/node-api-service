'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add speakerId column to TranscriptSegments
        await queryInterface.addColumn('TranscriptSegments', 'speakerId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'Speakers', key: 'speakerId' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
            comment: 'Speaker who spoke this segment (from diarization)'
        });

        // Add index for speaker queries
        await queryInterface.addIndex('TranscriptSegments', ['speakerId'], {
            name: 'idx_transcript_segments_speaker'
        });

        // Add composite index for speaker + time queries
        await queryInterface.addIndex('TranscriptSegments', ['speakerId', 'startTimestamp'], {
            name: 'idx_segments_speaker_time'
        });
    },

    down: async (queryInterface) => {
        // Remove indexes first
        await queryInterface.removeIndex('TranscriptSegments', 'idx_segments_speaker_time');
        await queryInterface.removeIndex('TranscriptSegments', 'idx_transcript_segments_speaker');

        // Remove column
        await queryInterface.removeColumn('TranscriptSegments', 'speakerId');
    }
};
