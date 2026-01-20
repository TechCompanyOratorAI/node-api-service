'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Job extends Model {
        static associate(models) {
            Job.belongsTo(models.Presentation, { foreignKey: 'presentationId', as: 'presentation' });
        }

        // Static methods for common queries
        static async findByPresentation(presentationId, jobType = null) {
            const where = { presentationId };
            if (jobType) where.jobType = jobType;

            return this.findAll({
                where,
                order: [['createdAt', 'DESC']]
            });
        }

        static async findPending(jobType = null) {
            const where = { status: 'queued' };
            if (jobType) where.jobType = jobType;

            return this.findAll({
                where,
                order: [['createdAt', 'ASC']]
            });
        }

        static async findRunning(jobType = null) {
            const where = { status: 'running' };
            if (jobType) where.jobType = jobType;

            return this.findAll({
                where,
                include: [{ model: sequelize.models.Presentation, as: 'presentation' }],
                order: [['startedAt', 'DESC']]
            });
        }

        static async findByType(jobType) {
            return this.findAll({
                where: { jobType },
                order: [['createdAt', 'DESC']]
            });
        }

        // Instance methods
        async markAsRunning(workerName) {
            this.status = 'running';
            this.workerName = workerName;
            this.startedAt = new Date();
            return this.save();
        }

        async markAsCompleted(result = null) {
            this.status = 'completed';
            this.completedAt = new Date();
            if (result) this.metadata = { ...this.metadata, result };
            return this.save();
        }

        async markAsFailed(errorMessage) {
            this.status = 'failed';
            this.completedAt = new Date();
            this.errorMessage = errorMessage;
            this.retryCount += 1;
            return this.save();
        }
    }

    Job.init(
        {
            jobId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            presentationId: { type: DataTypes.INTEGER, allowNull: false },

            jobType: {
                type: DataTypes.ENUM('asr', 'analysis', 'report'),
                allowNull: false
            },

            status: {
                type: DataTypes.ENUM('queued', 'running', 'completed', 'failed'),
                allowNull: false,
                defaultValue: 'queued'
            },

            sqsMessageId: { type: DataTypes.STRING(255) },
            workerName: { type: DataTypes.STRING(100) },

            startedAt: { type: DataTypes.DATE },
            completedAt: { type: DataTypes.DATE },

            errorMessage: { type: DataTypes.TEXT },
            retryCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

            metadata: { type: DataTypes.JSON }
        },
        { sequelize, modelName: 'Job', tableName: 'Jobs' }
    );

    return Job;
};
