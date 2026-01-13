'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Slides', {
            slideId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            presentationId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Presentations', key: 'presentationId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            slideNumber: { type: Sequelize.INTEGER, allowNull: false },

            filePath: { type: Sequelize.TEXT, allowNull: false },
            fileName: { type: Sequelize.TEXT },
            fileFormat: { type: Sequelize.STRING(20) },
            fileSizeBytes: { type: Sequelize.BIGINT },
            extractedText: { type: Sequelize.TEXT },
            thumbnailPath: { type: Sequelize.TEXT },
            uploadedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },

            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addConstraint('Slides', {
            fields: ['presentationId', 'slideNumber'],
            type: 'unique',
            name: 'uq_slides_presentation_slide_number'
        });

        await queryInterface.addIndex('Slides', ['presentationId'], { name: 'idx_slides_presentation' });
    },
    down: async (queryInterface) => queryInterface.dropTable('Slides')
};
