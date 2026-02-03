'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.bulkInsert('departments', [
            {
                departmentCode: 'SE',
                departmentName: 'Software Engineering',
                description: 'Bộ môn Kỹ thuật Phần mềm',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                departmentCode: 'CS',
                departmentName: 'Computer Science',
                description: 'Bộ môn Khoa học Máy tính',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                departmentCode: 'IT',
                departmentName: 'Information Technology',
                description: 'Bộ môn Công nghệ Thông tin',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                departmentCode: 'IS',
                departmentName: 'Information Systems',
                description: 'Bộ môn Hệ thống Thông tin',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                departmentCode: 'AI',
                departmentName: 'Artificial Intelligence',
                description: 'Bộ môn Trí tuệ Nhân tạo',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], {});
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.bulkDelete('departments', null, {});
    }
};
