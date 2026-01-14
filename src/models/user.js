'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.UserRole, { foreignKey: 'userId', as: 'userRoles' });
      User.hasMany(models.Course, { foreignKey: 'instructorId', as: 'instructedCourses' });
      User.hasMany(models.Enrollment, { foreignKey: 'studentId', as: 'enrollments' });
      User.hasMany(models.Presentation, { foreignKey: 'studentId', as: 'presentations' });
      User.hasMany(models.Feedback, { foreignKey: 'reviewerId', as: 'givenFeedbacks' });

      User.hasMany(models.PresentationAccess, { foreignKey: 'userId', as: 'presentationAccesses' });
      User.hasMany(models.PresentationAccess, { foreignKey: 'grantedBy', as: 'grantedAccesses' });

      User.hasMany(models.AIConfig, { foreignKey: 'managedBy', as: 'aiConfigs' });
      User.hasMany(models.SystemSetting, { foreignKey: 'updatedBy', as: 'updatedSettings' });
    }
  }

  User.init(
    {
      userId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      firstName: { type: DataTypes.STRING(100) },
      lastName: { type: DataTypes.STRING(100) },
      passwordHash: { type: DataTypes.TEXT, allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      isEmailVerified: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      emailVerificationToken: { type: DataTypes.STRING },
      emailVerificationExpires: { type: DataTypes.DATE },
      passwordResetToken: { type: DataTypes.STRING },
      passwordResetExpires: { type: DataTypes.DATE },
      lastLoginAt: { type: DataTypes.DATE },
      loginAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
      lockUntil: { type: DataTypes.DATE },
    },
    { sequelize, modelName: 'User', tableName: 'Users' }
  );

  return User;
};
