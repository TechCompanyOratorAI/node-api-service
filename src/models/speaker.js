'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Speaker extends Model {
        static associate(models) {
            Speaker.belongsTo(models.Presentation, { foreignKey: 'presentationId', as: 'presentation' });
            Speaker.belongsTo(models.User, { foreignKey: 'studentId', as: 'mappedStudent' });
            Speaker.hasMany(models.TranscriptSegment, { foreignKey: 'speakerId', as: 'segments' });
        }

        // Static methods for common queries
        static async findByPresentation(presentationId, options = {}) {
            const queryOptions = {
                where: { presentationId },
                order: [['aiSpeakerLabel', 'ASC']]
            };

            if (options.includeSegments) {
                queryOptions.include = [
                    { model: sequelize.models.TranscriptSegment, as: 'segments' }
                ];
            }

            if (options.includeMappedStudent) {
                queryOptions.include = queryOptions.include || [];
                queryOptions.include.push({
                    model: sequelize.models.User,
                    as: 'mappedStudent',
                    attributes: ['userId', 'username', 'email']
                });
            }

            return this.findAll(queryOptions);
        }

        static async findUnmapped(presentationId = null) {
            const where = { isMapped: false };
            if (presentationId) where.presentationId = presentationId;

            return this.findAll({
                where,
                include: [{ model: sequelize.models.Presentation, as: 'presentation' }],
                order: [['createdAt', 'DESC']]
            });
        }

        static async findByStudent(studentId) {
            return this.findAll({
                where: { studentId, isMapped: true },
                include: [{ model: sequelize.models.Presentation, as: 'presentation' }],
                order: [['createdAt', 'DESC']]
            });
        }

        static async findByLabel(presentationId, aiSpeakerLabel) {
            return this.findOne({
                where: { presentationId, aiSpeakerLabel }
            });
        }

        // Instance methods
        async mapToStudent(studentId) {
            this.studentId = studentId;
            this.isMapped = true;
            return this.save();
        }

        async unmap() {
            this.studentId = null;
            this.isMapped = false;
            return this.save();
        }

        async updateStats(totalDurationSeconds, segmentCount) {
            this.totalDurationSeconds = totalDurationSeconds;
            this.segmentCount = segmentCount;
            return this.save();
        }

        async addMetadata(key, value) {
            this.metadata = { ...this.metadata, [key]: value };
            return this.save();
        }
    }

    Speaker.init(
        {
            speakerId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
            presentationId: { type: DataTypes.INTEGER, allowNull: false },

            aiSpeakerLabel: {
                type: DataTypes.STRING(50),
                allowNull: false,
                comment: 'AI-generated speaker ID like S1, S2, SPEAKER_00, etc.'
            },

            studentId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                comment: 'Mapped student user ID'
            },

            isMapped: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Whether this AI speaker has been mapped to a real student'
            },

            totalDurationSeconds: {
                type: DataTypes.FLOAT,
                comment: 'Total speaking time for this speaker'
            },

            segmentCount: {
                type: DataTypes.INTEGER,
                comment: 'Number of transcript segments by this speaker'
            },

            metadata: {
                type: DataTypes.JSON,
                comment: 'Additional speaker info: voice characteristics, confidence, etc.'
            }
        },
        {
            sequelize,
            modelName: 'Speaker',
            tableName: 'Speakers',
            indexes: [
                {
                    unique: true,
                    fields: ['presentationId', 'aiSpeakerLabel'],
                    name: 'uq_speakers_presentation_label'
                }
            ]
        }
    );

    return Speaker;
};
