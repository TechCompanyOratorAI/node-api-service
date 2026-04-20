'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, { foreignKey: 'userId', as: 'recipient' });
    }
  }

  Notification.init(
    {
      notificationId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId:  { type: DataTypes.INTEGER, allowNull: false },
      type:    { type: DataTypes.STRING(100), allowNull: false },
      title:   { type: DataTypes.STRING(255), allowNull: false },
      message: { type: DataTypes.TEXT, allowNull: false },
      data:    { type: DataTypes.JSON, defaultValue: null },
      read:    { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'Notification',
      tableName: 'Notifications',
    }
  );

  return Notification;
};
