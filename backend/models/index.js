const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
    idea: { type: DataTypes.TEXT, allowNull: false },
    chatHistory: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
    overviewMarkdown: { type: DataTypes.TEXT, allowNull: false, defaultValue: '' },
    archived: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Pillar = sequelize.define('Pillar', {
    pillarId: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    icon: { type: DataTypes.STRING },
    ProjectId: { type: DataTypes.INTEGER },
    parentId: { type: DataTypes.INTEGER, allowNull: true }
});

const Decision = sequelize.define('Decision', {
    decisionId: { type: DataTypes.STRING },
    question: { type: DataTypes.STRING, allowNull: false },
    context: { type: DataTypes.TEXT },
    answer: { type: DataTypes.STRING },
    conflict: { type: DataTypes.TEXT },
    rationale: { type: DataTypes.TEXT },
    constraints: { type: DataTypes.TEXT },
    tags: { type: DataTypes.JSON, defaultValue: [] },
    embedding: { type: DataTypes.TEXT, allowNull: true },
    clusterX: { type: DataTypes.FLOAT, allowNull: true },
    clusterY: { type: DataTypes.FLOAT, allowNull: true },
    clusterLabel: { type: DataTypes.STRING, allowNull: true },
    icon: { type: DataTypes.STRING, allowNull: true },
    acceptanceCriteria: { type: DataTypes.JSON, defaultValue: [] },
    technicalContext: { type: DataTypes.TEXT, allowNull: true },
    dependencies: { type: DataTypes.JSON, defaultValue: [] },
    priority: { type: DataTypes.STRING, allowNull: true },
    options: { type: DataTypes.JSON, allowNull: true },
    rawData: { type: DataTypes.JSON, defaultValue: {} },
    PillarId: { type: DataTypes.INTEGER }
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

const AppSettings = sequelize.define('AppSettings', {
    singletonKey: { type: DataTypes.STRING, unique: true, allowNull: false, defaultValue: 'global' },
    provider: { type: DataTypes.STRING, allowNull: false, defaultValue: 'mock' },
    keys: { type: DataTypes.JSON, allowNull: false, defaultValue: {} }
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
    AuditLog,
    AppSettings
};
