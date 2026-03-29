'use strict';

/**
 * Migration: Add share fields to PresentationAccess table
 *
 * Changes:
 * - Add shareType ENUM('public', 'private') - 'private' = per-user invite, 'public' = public link
 * - Add shareToken VARCHAR(128) UNIQUE - UUID token for public/private link access
 * - Make userId nullable (NULL for public share rows)
 * - Add index on shareToken for fast lookup
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Allow userId to be nullable (public shares don't need a userId)
    await queryInterface.changeColumn('PresentationAccess', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'userId' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // 2. Add shareType column
    await queryInterface.addColumn('PresentationAccess', 'shareType', {
      type: Sequelize.ENUM('public', 'private'),
      allowNull: false,
      defaultValue: 'private',
      after: 'accessLevel',
    });

    // 3. Add shareToken column (unique token for link-based access)
    await queryInterface.addColumn('PresentationAccess', 'shareToken', {
      type: Sequelize.STRING(128),
      allowNull: true,
      unique: true,
      after: 'shareType',
    });

    // 4. Drop the old unique constraint (presentationId + userId) so public rows (userId NULL) can coexist
    try {
      await queryInterface.removeConstraint(
        'PresentationAccess',
        'uq_presentation_access_presentation_user'
      );
    } catch (e) {
      console.warn('Could not remove old unique constraint (may not exist):', e.message);
    }

    // 5. Add index on shareToken for fast lookup
    await queryInterface.addIndex('PresentationAccess', ['shareToken'], {
      name: 'idx_presentation_access_share_token',
      unique: true,
      where: { shareToken: { [Sequelize.Op.ne]: null } },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('PresentationAccess', 'idx_presentation_access_share_token');
    await queryInterface.removeColumn('PresentationAccess', 'shareToken');
    await queryInterface.removeColumn('PresentationAccess', 'shareType');

    // Restore userId as non-nullable
    await queryInterface.changeColumn('PresentationAccess', 'userId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'Users', key: 'userId' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // Restore old unique constraint
    await queryInterface.addConstraint('PresentationAccess', {
      fields: ['presentationId', 'userId'],
      type: 'unique',
      name: 'uq_presentation_access_presentation_user',
    });
  },
};
