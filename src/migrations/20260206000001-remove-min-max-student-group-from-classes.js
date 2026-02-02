module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Remove indexes first
        await queryInterface.removeIndex('Classes', 'idx_classes_minstudentgroup');
        await queryInterface.removeIndex('Classes', 'idx_classes_maxstudentgroup');

        // Remove columns
        await queryInterface.removeColumn('Classes', 'minStudentGroup');
        await queryInterface.removeColumn('Classes', 'maxStudentGroup');
    },

    down: async (queryInterface, Sequelize) => {
        // Add columns back
        await queryInterface.addColumn('Classes', 'minStudentGroup', {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
            comment: 'Số lượng tối thiểu thành viên trong 1 nhóm'
        });

        await queryInterface.addColumn('Classes', 'maxStudentGroup', {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
            comment: 'Số lượng tối đa thành viên trong 1 nhóm, null = không giới hạn'
        });

        // Add indexes back
        await queryInterface.addIndex('Classes', ['minStudentGroup'], {
            name: 'idx_classes_minstudentgroup'
        });

        await queryInterface.addIndex('Classes', ['maxStudentGroup'], {
            name: 'idx_classes_maxstudentgroup'
        });
    }
};
