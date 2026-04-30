'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ClassEmailWhitelist extends Model {
    static associate(models) {
      ClassEmailWhitelist.belongsTo(models.Class, {
        foreignKey: 'classId',
        as: 'class',
      });
    }
  }

  ClassEmailWhitelist.init(
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      classId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'ClassEmailWhitelist',
      tableName: 'ClassEmailWhitelists',
      timestamps: true,
      indexes: [
        { unique: true, fields: ['classId', 'email'] },
        { fields: ['classId'] },
      ],
    }
  );

  return ClassEmailWhitelist;
};
