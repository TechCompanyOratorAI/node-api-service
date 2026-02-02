module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('Classes', 'minGroupMembers', {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: null,
            comment: 'Số lượng tối thiểu thành viên trong 1 nhóm'
        });

        await queryInterface.addIndex('Classes', ['minGroupMembers'], {
            name: 'idx_classes_mingroupmembers'
        });
    },

    down: async (queryInterface) => {
        await queryInterface.removeIndex('Classes', 'idx_classes_mingroupmembers');
        await queryInterface.removeColumn('Classes', 'minGroupMembers');
    }
};
