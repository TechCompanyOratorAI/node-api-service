module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add classId to Presentations
        await queryInterface.addColumn('Presentations', 'classId', {
            type: Sequelize.INTEGER,
            allowNull: true, // Will be NOT NULL after data migration
            references: { model: 'Classes', key: 'classId' },
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
            after: 'presentationId'
        });

        // Data migration: Set classId based on courseId
        // For now, presentations remain with NULL classId until manual data migration
        // In production, you would:
        // 1. Create a default class for each course
        // 2. UPDATE Presentations p JOIN Classes c ON p.courseId = c.courseId SET p.classId = c.classId

        // Add index for instructor filtering
        await queryInterface.addIndex('Presentations', ['classId'], {
            name: 'idx_presentations_class'
        });

        // NOTE: Uncomment this after data migration to make classId required
        // await queryInterface.changeColumn('Presentations', 'classId', {
        //   type: Sequelize.INTEGER,
        //   allowNull: false
        // });
    },

    down: async (queryInterface) => {
        // Remove index
        await queryInterface.removeIndex('Presentations', 'idx_presentations_class');

        // Remove column
        await queryInterface.removeColumn('Presentations', 'classId');
    }
};
