module.exports = {
    up: async (queryInterface) => {
        // Remove index first
        await queryInterface.removeIndex('Classes', 'idx_classes_mingroupmembers');

        // Remove column
        await queryInterface.removeColumn('Classes', 'minGroupMembers');
    },

    down: async (queryInterface, Sequelize) => {
        // Add column back
        await queryInterface.addColumn('Classes', 'minGroupMembers', {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
            comment: 'Số lượng tối thiểu thành viên trong 1 nhóm'
        });

        // Add index back
        await queryInterface.addIndex('Classes', ['minGroupMembers'], {
            name: 'idx_classes_mingroupmembers'
        });
    }
};
