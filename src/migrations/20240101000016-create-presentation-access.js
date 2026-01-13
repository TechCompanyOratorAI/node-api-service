'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('PresentationAccess', {
            accessId: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
            presentationId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Presentations', key: 'presentationId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            userId: {
                type: Sequelize.INTEGER, allowNull: false,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'CASCADE', onUpdate: 'CASCADE'
            },
            accessLevel: {
                type: Sequelize.ENUM('view', 'comment', 'review', 'manage'),
                allowNull: false,
                defaultValue: 'view'
            },
            grantedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            grantedBy: {
                type: Sequelize.INTEGER,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'SET NULL', onUpdate: 'CASCADE'
            },
            expiresAt: { type: Sequelize.DATE },
            createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
            updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
        });

        await queryInterface.addConstraint('PresentationAccess', {
            fields: ['presentationId', 'userId'],
            type: 'unique',
            name: 'uq_presentation_access_presentation_user'
        });

        await queryInterface.addIndex('PresentationAccess', ['userId'], { name: 'idx_presentation_access_user' });
        await queryInterface.addIndex('PresentationAccess', ['presentationId'], { name: 'idx_presentation_access_presentation' });
    },
    down: async (queryInterface) => queryInterface.dropTable('PresentationAccess')
};
