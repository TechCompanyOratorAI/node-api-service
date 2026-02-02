module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Tạo bảng GroupStudents (bảng trung gian cho M:N relationship)
        await queryInterface.createTable('GroupStudents', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            groupId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Groups', key: 'groupId' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            studentId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'Users', key: 'userId' },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            },
            joinedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            role: {
                type: Sequelize.ENUM('member', 'leader'),
                allowNull: false,
                defaultValue: 'member'
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

        // Unique index cho cặp (groupId, studentId) - 1 student chỉ join 1 group 1 lần
        await queryInterface.addIndex('GroupStudents', ['groupId', 'studentId'], {
            name: 'uq_groupstudents_group_student',
            unique: true
        });

        // Index cho studentId
        await queryInterface.addIndex('GroupStudents', ['studentId'], {
            name: 'idx_groupstudents_student'
        });

        // Index cho groupId
        await queryInterface.addIndex('GroupStudents', ['groupId'], {
            name: 'idx_groupstudents_group'
        });

        // Xóa cột groupId cũ trong Users table (xóa cột trước sẽ tự xóa foreign key)
        // Kiểm tra cột có tồn tại không trước khi xóa
        const [userColumns] = await queryInterface.sequelize.query("DESCRIBE Users");
        const hasGroupId = userColumns.some(col => col.Field === 'groupId');
        if (hasGroupId) {
            await queryInterface.removeColumn('Users', 'groupId');
        }
    },

    down: async (queryInterface) => {
        // Xóa indexes của GroupStudents trước khi xóa bảng
        await queryInterface.removeIndex('GroupStudents', 'idx_groupstudents_group');
        await queryInterface.removeIndex('GroupStudents', 'idx_groupstudents_student');
        await queryInterface.removeIndex('GroupStudents', 'uq_groupstudents_group_student');

        // Xóa bảng GroupStudents
        await queryInterface.dropTable('GroupStudents');

        // Khôi phục cột groupId trong Users
        const { Sequelize } = require('sequelize');
        await queryInterface.addColumn('Users', 'groupId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'Groups', key: 'groupId' },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });

        // Thêm lại index
        await queryInterface.addIndex('Users', ['groupId'], {
            name: 'idx_users_group'
        });
    }
};
