const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
    idea: { type: DataTypes.TEXT, allowNull: false },
});

const Pillar = sequelize.define('Pillar', {
    pillarId: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
});

const Decision = sequelize.define('Decision', {
    decisionId: { type: DataTypes.STRING },
    question: { type: DataTypes.STRING, allowNull: false },
    context: { type: DataTypes.TEXT },
    answer: { type: DataTypes.STRING },
    conflict: { type: DataTypes.TEXT },
    rationale: { type: DataTypes.TEXT },
    constraints: { type: DataTypes.TEXT },
    tags: { type: DataTypes.JSON, defaultValue: [] }
});

const DecisionRelationship = sequelize.define('DecisionRelationship', {
    type: { 
        type: DataTypes.ENUM('depends_on', 'conflicts', 'supersedes'), 
        allowNull: false 
    },
    strength: { type: DataTypes.FLOAT, defaultValue: 1.0 }
});

const AuditLog = sequelize.define('AuditLog', {
    action: { type: DataTypes.STRING, allowNull: false },
    summary: { type: DataTypes.TEXT },
    isAgent: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// Associations
Project.hasMany(Pillar, { onDelete: 'CASCADE' });
Pillar.belongsTo(Project);
Pillar.hasMany(Decision, { onDelete: 'CASCADE' });
Decision.belongsTo(Pillar);
Pillar.hasMany(Pillar, { as: 'subcategories', foreignKey: 'parentId', onDelete: 'CASCADE' });
Pillar.belongsTo(Pillar, { as: 'parent', foreignKey: 'parentId' });
Project.hasMany(AuditLog, { onDelete: 'SET NULL' });
AuditLog.belongsTo(Project);

// Self-referential Many-to-Many for Decisions
Decision.belongsToMany(Decision, { 
    as: 'linkedTo', 
    through: DecisionRelationship, 
    foreignKey: 'fromId', 
    otherKey: 'toId' 
});
Decision.belongsToMany(Decision, { 
    as: 'linkedBy', 
    through: DecisionRelationship, 
    foreignKey: 'toId', 
    otherKey: 'fromId' 
});

module.exports = {
    sequelize,
    Project,
    Pillar,
    Decision,
    DecisionRelationship,
    AuditLog
};
