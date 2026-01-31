module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('enroll_keys', {
            keyId: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            classId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Classes', key: 'classId' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            keyValue: {
                type: Sequelize.STRING(255),
                allowNull: false,
                unique: true
            },
            expiresAt: {
                type: Sequelize.DATE,
                allowNull: true
            },
            maxUses: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            usedCount: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: true
            },
            isRevoked: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            revokedAt: {
                type: Sequelize.DATE,
                allowNull: true
            },
            revokedBy: {
                type: Sequelize.INTEGER,
                allowNull: true,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'SET NULL',
                onUpdate: 'CASCADE'
            },
            createdBy: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE'
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
            }
        });

        // Add unique index for keyValue
        await queryInterface.addIndex('enroll_keys', ['keyValue'], {
            name: 'uq_enroll_key_value',
            unique: true
        });

        // Add index for classId
        await queryInterface.addIndex('enroll_keys', ['classId'], {
            name: 'idx_enroll_keys_class'
        });

        // Add composite index for active key lookups
        await queryInterface.addIndex('enroll_keys', ['isActive', 'expiresAt'], {
            name: 'idx_enroll_keys_active_expiry'
        });
    },

    down: async (queryInterface) => {
        await queryInterface.dropTable('enroll_keys');
    }
};
