module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Step 1: Add classId column (nullable initially)
        await queryInterface.addColumn('Enrollments', 'classId', {
            type: Sequelize.INTEGER,
            allowNull: true, // Will be NOT NULL after data migration
            references: { model: 'Classes', key: 'classId' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            after: 'enrollmentId'
        });

        // Step 2: Data migration - TRUNCATE old enrollments
        // WARNING: This will delete all existing enrollments!
        // For production, you should create default classes and migrate data instead
        await queryInterface.sequelize.query('TRUNCATE TABLE Enrollments');

        // Step 3: Make classId NOT NULL
        await queryInterface.changeColumn('Enrollments', 'classId', {
            type: Sequelize.INTEGER,
            allowNull: false
        });

        // Step 4: Remove courseId FK and column
        // First, find the actual constraint name
        const [constraints] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'Enrollments' 
      AND COLUMN_NAME = 'courseId' 
      AND CONSTRAINT_NAME LIKE '%ibfk%'
      LIMIT 1
    `);

        if (constraints.length > 0) {
            await queryInterface.removeConstraint('Enrollments', constraints[0].CONSTRAINT_NAME);
        }

        // Remove index
        try {
            await queryInterface.removeIndex('Enrollments', 'idx_enrollments_course');
        } catch (e) {
            console.log('Index idx_enrollments_course not found, skipping...');
        }

        // Remove column
        await queryInterface.removeColumn('Enrollments', 'courseId');

        // Step 5: Update unique constraint
        try {
            await queryInterface.removeConstraint('Enrollments', 'uq_enrollments_student_course');
        } catch (e) {
            console.log('Constraint uq_enrollments_student_course not found, skipping...');
        }

        await queryInterface.addConstraint('Enrollments', {
            fields: ['studentId', 'classId'],
            type: 'unique',
            name: 'uq_enrollments_student_class'
        });

        // Add index for classId
        await queryInterface.addIndex('Enrollments', ['classId'], {
            name: 'idx_enrollments_class'
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Reverse migration - WARNING: This will lose data!

        // Add courseId back
        await queryInterface.addColumn('Enrollments', 'courseId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'Courses', key: 'courseId' },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });

        // Remove classId constraint
        await queryInterface.removeConstraint('Enrollments', 'uq_enrollments_student_class');

        // Add old constraint back
        await queryInterface.addConstraint('Enrollments', {
            fields: ['studentId', 'courseId'],
            type: 'unique',
            name: 'uq_enrollments_student_course'
        });

        // Remove classId
        await queryInterface.removeIndex('Enrollments', 'idx_enrollments_class');
        await queryInterface.removeColumn('Enrollments', 'classId');
    }
};
