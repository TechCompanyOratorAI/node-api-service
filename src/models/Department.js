const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    const Department = sequelize.define('Department', {
        departmentId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        departmentCode: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: { msg: 'Mã bộ môn không được để trống' },
                len: { args: [2, 20], msg: 'Mã bộ môn phải từ 2-20 ký tự' }
            }
        },
        departmentName: {
            type: DataTypes.STRING(200),
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Tên bộ môn không được để trống' },
                len: { args: [3, 200], msg: 'Tên bộ môn phải từ 3-200 ký tự' }
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false
        }
    }, {
        tableName: 'departments',
        timestamps: true,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci'
    });

    Department.associate = (models) => {
        Department.hasMany(models.Course, {
            foreignKey: 'departmentId',
            as: 'courses'
        });
    };

    return Department;
};
