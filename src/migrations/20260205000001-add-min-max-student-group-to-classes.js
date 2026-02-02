module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Thêm cột minStudentGroup vào Classes
        await queryInterface.addColumn('Classes', 'minStudentGroup', {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
            comment: 'Số lượng tối thiểu thành viên trong 1 nhóm'
        });

        // Thêm cột maxStudentGroup vào Classes
        await queryInterface.addColumn('Classes', 'maxStudentGroup', {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
            comment: 'Số lượng tối đa thành viên trong 1 nhóm, null = không giới hạn'
        });

        // Thêm indexes
        await queryInterface.addIndex('Classes', ['minStudentGroup'], {
            name: 'idx_classes_minstudentgroup'
        });

        await queryInterface.addIndex('Classes', ['maxStudentGroup'], {
            name: 'idx_classes_maxstudentgroup'
        });
    },

    down: async (queryInterface) => {
        await queryInterface.removeIndex('Classes', 'idx_classes_minstudentgroup');
        await queryInterface.removeIndex('Classes', 'idx_classes_maxstudentgroup');
        await queryInterface.removeColumn('Classes', 'minStudentGroup');
        await queryInterface.removeColumn('Classes', 'maxStudentGroup');
    }
};
