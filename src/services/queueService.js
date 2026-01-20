import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-southeast-1';

// Initialize SQS Client
const sqsClient = new SQSClient({
    region,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    } : undefined
});

// Queue URLs from environment
const QUEUE_URLS = {
    asr: process.env.AWS_SQS_ASR_QUEUE_URL,
    analysis: process.env.AWS_SQS_ANALYSIS_QUEUE_URL,
    report: process.env.AWS_SQS_REPORT_QUEUE_URL
};

class QueueService {
    /**
     * Send message to ASR queue (for audio transcription)
     * @param {Object} data - Message data
     * @param {number} data.presentationId - Presentation ID
     * @param {number} data.jobId - Job ID
     * @param {string} data.audioUrl - S3 URL of audio file
     * @param {Object} data.metadata - Additional metadata
     * @returns {Promise<Object>} - SQS message response
     */
    async sendToASRQueue(data) {
        return this._sendMessage(QUEUE_URLS.asr, 'asr', data);
    }

    /**
     * Send message to Analysis queue (for semantic analysis)
     * @param {Object} data - Message data
     * @param {number} data.presentationId - Presentation ID
     * @param {number} data.jobId - Job ID
     * @param {number} data.transcriptId - Transcript ID
     * @param {Array} data.slideUrls - Array of slide URLs
     * @param {Object} data.metadata - Additional metadata
     * @returns {Promise<Object>} - SQS message response
     */
    async sendToAnalysisQueue(data) {
        return this._sendMessage(QUEUE_URLS.analysis, 'analysis', data);
    }

    /**
     * Send message to Report queue (for feedback generation)
     * @param {Object} data - Message data
     * @param {number} data.presentationId - Presentation ID
     * @param {number} data.jobId - Job ID
     * @param {number} data.analysisResultId - Analysis result ID
     * @param {Object} data.metadata - Additional metadata
     * @returns {Promise<Object>} - SQS message response
     */
    async sendToReportQueue(data) {
        return this._sendMessage(QUEUE_URLS.report, 'report', data);
    }

    /**
     * Internal method to send message to any queue
     * @private
     */
    async _sendMessage(queueUrl, queueType, data) {
        if (!queueUrl) {
            throw new Error(`Queue URL not configured for ${queueType}. Please set AWS_SQS_${queueType.toUpperCase()}_QUEUE_URL`);
        }

        try {
            const messageBody = JSON.stringify({
                ...data,
                queueType,
                sentAt: new Date().toISOString(),
                version: '1.0'
            });

            const command = new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: messageBody,
                MessageAttributes: {
                    presentationId: {
                        DataType: 'Number',
                        StringValue: String(data.presentationId)
                    },
                    jobId: {
                        DataType: 'Number',
                        StringValue: String(data.jobId)
                    },
                    queueType: {
                        DataType: 'String',
                        StringValue: queueType
                    }
                }
            });

            const response = await sqsClient.send(command);

            console.log(`[QueueService] Message sent to ${queueType} queue:`, {
                messageId: response.MessageId,
                presentationId: data.presentationId,
                jobId: data.jobId
            });

            return {
                success: true,
                messageId: response.MessageId,
                queueType,
                data
            };
        } catch (error) {
            console.error(`[QueueService] Failed to send message to ${queueType} queue:`, error);
            throw new Error(`Failed to send message to ${queueType} queue: ${error.message}`);
        }
    }

    /**
     * Receive messages from a queue (for worker polling)
     * @param {string} queueType - Queue type (asr, analysis, report)
     * @param {number} maxMessages - Max messages to receive (1-10)
     * @param {number} waitTimeSeconds - Long polling wait time (0-20)
     * @returns {Promise<Array>} - Array of messages
     */
    async receiveMessages(queueType, maxMessages = 1, waitTimeSeconds = 20) {
        const queueUrl = QUEUE_URLS[queueType];

        if (!queueUrl) {
            throw new Error(`Queue URL not configured for ${queueType}`);
        }

        try {
            const command = new ReceiveMessageCommand({
                QueueUrl: queueUrl,
                MaxNumberOfMessages: Math.min(Math.max(1, maxMessages), 10),
                WaitTimeSeconds: Math.min(Math.max(0, waitTimeSeconds), 20),
                MessageAttributeNames: ['All'],
                AttributeNames: ['All']
            });

            const response = await sqsClient.send(command);

            return (response.Messages || []).map(msg => ({
                messageId: msg.MessageId,
                receiptHandle: msg.ReceiptHandle,
                body: JSON.parse(msg.Body),
                attributes: msg.MessageAttributes
            }));
        } catch (error) {
            console.error(`[QueueService] Failed to receive messages from ${queueType} queue:`, error);
            throw error;
        }
    }

    /**
     * Delete message from queue (after successful processing)
     * @param {string} queueType - Queue type
     * @param {string} receiptHandle - Message receipt handle
     * @returns {Promise<void>}
     */
    async deleteMessage(queueType, receiptHandle) {
        const queueUrl = QUEUE_URLS[queueType];

        if (!queueUrl) {
            throw new Error(`Queue URL not configured for ${queueType}`);
        }

        try {
            const command = new DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: receiptHandle
            });

            await sqsClient.send(command);
            console.log(`[QueueService] Message deleted from ${queueType} queue`);
        } catch (error) {
            console.error(`[QueueService] Failed to delete message from ${queueType} queue:`, error);
            throw error;
        }
    }

    /**
     * Test queue connectivity
     * @param {string} queueType - Queue type to test
     * @returns {Promise<Object>}
     */
    async testQueue(queueType) {
        const queueUrl = QUEUE_URLS[queueType];

        if (!queueUrl) {
            return {
                success: false,
                error: `Queue URL not configured for ${queueType}`
            };
        }

        try {
            // Just try to receive messages (won't wait, just test connectivity)
            const command = new ReceiveMessageCommand({
                QueueUrl: queueUrl,
                MaxNumberOfMessages: 1,
                WaitTimeSeconds: 0
            });

            await sqsClient.send(command);

            return {
                success: true,
                queueType,
                queueUrl
            };
        } catch (error) {
            return {
                success: false,
                queueType,
                error: error.message
            };
        }
    }

    /**
     * Get queue configuration status
     * @returns {Object}
     */
    getQueueStatus() {
        return {
            asr: {
                configured: !!QUEUE_URLS.asr,
                url: QUEUE_URLS.asr || 'NOT_CONFIGURED'
            },
            analysis: {
                configured: !!QUEUE_URLS.analysis,
                url: QUEUE_URLS.analysis || 'NOT_CONFIGURED'
            },
            report: {
                configured: !!QUEUE_URLS.report,
                url: QUEUE_URLS.report || 'NOT_CONFIGURED'
            },
            region
        };
    }
}

export default new QueueService();
