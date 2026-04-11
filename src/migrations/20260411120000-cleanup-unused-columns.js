'use strict';

/**
 * Migration: Cleanup Unused Columns
 * Version: 20260411120000
 *
 * Drops columns that are never populated by any worker or controller:
 *
 * AnalysisResults:
 *   - configId              (always null, no config system in use)
 *   - processingTimeSeconds (never set)
 *   - aiModelVersion        (never set)
 *   - slideAudioCompatibility   (added manually to DB, never set by any code)
 *   - topicRequirementsAlignment (added manually to DB, never set by any code)
 *   - learningOutcomesAlignment  (added manually to DB, never set by any code)
 *   - contentRelevanceScore      (added manually to DB, never set by any code)
 *   - semanticSimilarityScore    (added manually to DB, never set by any code)
 *   - slideAlignmentScore        (added manually to DB, never set by any code)
 *
 * SegmentAnalyses:
 *   - configId              (always null)
 *   - processingTimeMs      (never set)
 *
 * ContentRelevance:
 *   - resultId              (FK never set; the FK constraint must be removed first)
 *   - missingConcepts       (never populated)
 *
 * SemanticSimilarity:
 *   - resultId              (FK never set; the FK constraint must be removed first)
 *   - embeddingModel        (never set)
 *   - cosineDistance        (never set)
 *   - comparisonMethod      (never set)
 *
 * AlignmentChecks:
 *   - resultId              (FK never set; the FK constraint must be removed first)
 *
 * HesitationPatterns:
 *   - beforeContext         (never populated)
 *   - afterContext          (never populated)
 *   - spectralComplexity    (never populated)
 *   - energyLevel           (never populated)
 *
 * SegmentSpeechQuality:
 *   - segmentFluency        (never populated)
 *   - segmentClarity        (never populated)
 *   - segmentConfidence     (never populated)
 *   - segmentSpeakingRate   (never populated)
 *   - segmentPitchMean      (never populated)
 *   - segmentEnergyMean     (never populated)
 *   - segmentSilenceRatio   (never populated)
 */

// Helper: drop a column only if it exists (safe / idempotent)
async function dropColumnIfExists(queryInterface, table, column) {
  try {
    const [rows] = await queryInterface.sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = '${table}'
        AND COLUMN_NAME  = '${column}'
    `);
    if (rows.length > 0) {
      await queryInterface.removeColumn(table, column);
      console.log(`  ✅ Dropped ${table}.${column}`);
    } else {
      console.log(`  ⏭  ${table}.${column} not found – skipped`);
    }
  } catch (err) {
    console.warn(`  ⚠️  Could not drop ${table}.${column}: ${err.message}`);
  }
}

// Helper: drop a FK constraint by name if it exists
async function dropConstraintIfExists(queryInterface, table, constraintName) {
  try {
    await queryInterface.removeConstraint(table, constraintName);
    console.log(`  ✅ Dropped constraint ${constraintName} on ${table}`);
  } catch (err) {
    // Constraint may not exist – safe to ignore
    console.log(`  ⏭  Constraint ${constraintName} not found – skipped`);
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🧹 Starting cleanup of unused columns...\n');

    // ─────────────────────────────────────────────────────────────
    // 1. AnalysisResults
    // ─────────────────────────────────────────────────────────────
    console.log('📋 AnalysisResults');
    await dropColumnIfExists(queryInterface, 'AnalysisResults', 'configId');
    await dropColumnIfExists(queryInterface, 'AnalysisResults', 'processingTimeSeconds');
    await dropColumnIfExists(queryInterface, 'AnalysisResults', 'aiModelVersion');
    // Columns added directly to DB (no migration exists for them)
    await dropColumnIfExists(queryInterface, 'AnalysisResults', 'slideAudioCompatibility');
    await dropColumnIfExists(queryInterface, 'AnalysisResults', 'topicRequirementsAlignment');
    await dropColumnIfExists(queryInterface, 'AnalysisResults', 'learningOutcomesAlignment');
    await dropColumnIfExists(queryInterface, 'AnalysisResults', 'contentRelevanceScore');
    await dropColumnIfExists(queryInterface, 'AnalysisResults', 'semanticSimilarityScore');
    await dropColumnIfExists(queryInterface, 'AnalysisResults', 'slideAlignmentScore');

    // ─────────────────────────────────────────────────────────────
    // 2. SegmentAnalyses
    // ─────────────────────────────────────────────────────────────
    console.log('\n📋 SegmentAnalyses');
    await dropColumnIfExists(queryInterface, 'SegmentAnalyses', 'configId');
    await dropColumnIfExists(queryInterface, 'SegmentAnalyses', 'processingTimeMs');

    // ─────────────────────────────────────────────────────────────
    // 3. ContentRelevance
    //    Must remove FK constraint before dropping resultId column
    // ─────────────────────────────────────────────────────────────
    console.log('\n📋 ContentRelevance');
    await dropConstraintIfExists(queryInterface, 'ContentRelevance', 'fk_content_relevance_result');
    await dropColumnIfExists(queryInterface, 'ContentRelevance', 'resultId');
    await dropColumnIfExists(queryInterface, 'ContentRelevance', 'missingConcepts');

    // ─────────────────────────────────────────────────────────────
    // 4. SemanticSimilarity
    //    Must remove FK constraint before dropping resultId column
    // ─────────────────────────────────────────────────────────────
    console.log('\n📋 SemanticSimilarity');
    await dropConstraintIfExists(queryInterface, 'SemanticSimilarity', 'fk_semantic_similarity_result');
    await dropColumnIfExists(queryInterface, 'SemanticSimilarity', 'resultId');
    await dropColumnIfExists(queryInterface, 'SemanticSimilarity', 'embeddingModel');
    await dropColumnIfExists(queryInterface, 'SemanticSimilarity', 'cosineDistance');
    await dropColumnIfExists(queryInterface, 'SemanticSimilarity', 'comparisonMethod');

    // ─────────────────────────────────────────────────────────────
    // 5. AlignmentChecks
    //    Must remove FK constraint before dropping resultId column
    // ─────────────────────────────────────────────────────────────
    console.log('\n📋 AlignmentChecks');
    await dropConstraintIfExists(queryInterface, 'AlignmentChecks', 'fk_alignment_checks_result');
    await dropColumnIfExists(queryInterface, 'AlignmentChecks', 'resultId');

    // ─────────────────────────────────────────────────────────────
    // 6. HesitationPatterns
    // ─────────────────────────────────────────────────────────────
    console.log('\n📋 HesitationPatterns');
    await dropColumnIfExists(queryInterface, 'HesitationPatterns', 'beforeContext');
    await dropColumnIfExists(queryInterface, 'HesitationPatterns', 'afterContext');
    await dropColumnIfExists(queryInterface, 'HesitationPatterns', 'spectralComplexity');
    await dropColumnIfExists(queryInterface, 'HesitationPatterns', 'energyLevel');

    // ─────────────────────────────────────────────────────────────
    // 7. SegmentSpeechQuality
    // ─────────────────────────────────────────────────────────────
    console.log('\n📋 SegmentSpeechQuality');
    await dropColumnIfExists(queryInterface, 'SegmentSpeechQuality', 'segmentFluency');
    await dropColumnIfExists(queryInterface, 'SegmentSpeechQuality', 'segmentClarity');
    await dropColumnIfExists(queryInterface, 'SegmentSpeechQuality', 'segmentConfidence');
    await dropColumnIfExists(queryInterface, 'SegmentSpeechQuality', 'segmentSpeakingRate');
    await dropColumnIfExists(queryInterface, 'SegmentSpeechQuality', 'segmentPitchMean');
    await dropColumnIfExists(queryInterface, 'SegmentSpeechQuality', 'segmentEnergyMean');
    await dropColumnIfExists(queryInterface, 'SegmentSpeechQuality', 'segmentSilenceRatio');

    console.log('\n✅ Cleanup migration completed.');
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * DOWN migration restores the dropped columns so the migration is reversible.
     * Note: FK constraints for resultId columns are NOT re-added since the
     * original migration (20240101000021) owns those constraints.
     */
    console.log('↩️  Reverting cleanup migration...\n');

    // AnalysisResults
    await queryInterface.addColumn('AnalysisResults', 'configId', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('AnalysisResults', 'processingTimeSeconds', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('AnalysisResults', 'aiModelVersion', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('AnalysisResults', 'slideAudioCompatibility', { type: Sequelize.FLOAT, allowNull: true });
    await queryInterface.addColumn('AnalysisResults', 'topicRequirementsAlignment', { type: Sequelize.FLOAT, allowNull: true });
    await queryInterface.addColumn('AnalysisResults', 'learningOutcomesAlignment', { type: Sequelize.FLOAT, allowNull: true });
    await queryInterface.addColumn('AnalysisResults', 'contentRelevanceScore', { type: Sequelize.FLOAT, allowNull: true });
    await queryInterface.addColumn('AnalysisResults', 'semanticSimilarityScore', { type: Sequelize.FLOAT, allowNull: true });
    await queryInterface.addColumn('AnalysisResults', 'slideAlignmentScore', { type: Sequelize.FLOAT, allowNull: true });

    // SegmentAnalyses
    await queryInterface.addColumn('SegmentAnalyses', 'configId', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('SegmentAnalyses', 'processingTimeMs', { type: Sequelize.INTEGER, allowNull: true });

    // ContentRelevance
    await queryInterface.addColumn('ContentRelevance', 'resultId', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('ContentRelevance', 'missingConcepts', { type: Sequelize.TEXT, allowNull: true });

    // SemanticSimilarity
    await queryInterface.addColumn('SemanticSimilarity', 'resultId', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('SemanticSimilarity', 'embeddingModel', { type: Sequelize.STRING(100), allowNull: true });
    await queryInterface.addColumn('SemanticSimilarity', 'cosineDistance', { type: Sequelize.FLOAT, allowNull: true });
    await queryInterface.addColumn('SemanticSimilarity', 'comparisonMethod', { type: Sequelize.STRING(100), allowNull: true });

    // AlignmentChecks
    await queryInterface.addColumn('AlignmentChecks', 'resultId', { type: Sequelize.INTEGER, allowNull: true });

    // HesitationPatterns
    await queryInterface.addColumn('HesitationPatterns', 'beforeContext', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('HesitationPatterns', 'afterContext', { type: Sequelize.TEXT, allowNull: true });
    await queryInterface.addColumn('HesitationPatterns', 'spectralComplexity', { type: Sequelize.FLOAT, allowNull: true });
    await queryInterface.addColumn('HesitationPatterns', 'energyLevel', { type: Sequelize.FLOAT, allowNull: true });

    // SegmentSpeechQuality
    await queryInterface.addColumn('SegmentSpeechQuality', 'segmentFluency', { type: Sequelize.DECIMAL(5, 4), allowNull: true });
    await queryInterface.addColumn('SegmentSpeechQuality', 'segmentClarity', { type: Sequelize.DECIMAL(5, 4), allowNull: true });
    await queryInterface.addColumn('SegmentSpeechQuality', 'segmentConfidence', { type: Sequelize.DECIMAL(5, 4), allowNull: true });
    await queryInterface.addColumn('SegmentSpeechQuality', 'segmentSpeakingRate', { type: Sequelize.DECIMAL(8, 2), allowNull: true });
    await queryInterface.addColumn('SegmentSpeechQuality', 'segmentPitchMean', { type: Sequelize.DECIMAL(8, 2), allowNull: true });
    await queryInterface.addColumn('SegmentSpeechQuality', 'segmentEnergyMean', { type: Sequelize.DECIMAL(8, 4), allowNull: true });
    await queryInterface.addColumn('SegmentSpeechQuality', 'segmentSilenceRatio', { type: Sequelize.DECIMAL(5, 4), allowNull: true });

    console.log('✅ Revert completed.');
  }
};
