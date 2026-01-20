'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Speakers', {
            speakerId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },

            presentationId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Presentations', key: 'presentationId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },

            aiSpeakerLabel: {
                type: Sequelize.STRING(50),
                allowNull: false,
                comment: 'AI-generated speaker ID like S1, S2, SPEAKER_00, etc.'
            },

            studentId: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'SET NULL', onUpdate: 'CASCADE',
                comment: 'Mapped student user ID'
            },

            isMapped: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Whether this AI speaker has been mapped to a real student'
            },

            totalDurationSeconds: {
                type: Sequelize.FLOAT,
                comment: 'Total speaking time for this speaker'
            },

            segmentCount: {
                type: Sequelize.INTEGER,
                comment: 'Number of transcript segments by this speaker'
            },

            metadata: {
                type: Sequelize.JSON,
                comment: 'Additional speaker info: voice characteristics, confidence, etc.'
            },

            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        // Unique constraint: one AI speaker label per presentation
        await queryInterface.addConstraint('Speakers', {
            fields: ['presentationId', 'aiSpeakerLabel'],
            type: 'unique',
            name: 'uq_speakers_presentation_label'
        });

        await queryInterface.addIndex('Speakers', ['presentationId'], { name: 'idx_speakers_presentation' });
        await queryInterface.addIndex('Speakers', ['studentId'], { name: 'idx_speakers_student' });
        await queryInterface.addIndex('Speakers', ['isMapped'], { name: 'idx_speakers_mapped' });
    },
    down: async (queryInterface) => queryInterface.dropTable('Speakers')
};
