'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Remove unique constraint on (presentationId, slideNumber)
        // This allows multiple slides with the same slideNumber (page count) in the same presentation
        await queryInterface.removeConstraint('Slides', 'uq_slides_presentation_slide_number');
        
        console.log('✅ Removed unique constraint on (presentationId, slideNumber)');
        console.log('   Now slideNumber represents page count and can be duplicated');
    },

    down: async (queryInterface, Sequelize) => {
        // Re-add unique constraint if needed to rollback
        await queryInterface.addConstraint('Slides', {
            fields: ['presentationId', 'slideNumber'],
            type: 'unique',
            name: 'uq_slides_presentation_slide_number'
        });
        
        console.log('✅ Re-added unique constraint on (presentationId, slideNumber)');
    }
};
