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
    conflict: { type: DataTypes.TEXT }
});

// Associations
Project.hasMany(Pillar, { onDelete: 'CASCADE' });
Pillar.belongsTo(Project);
Pillar.hasMany(Decision, { onDelete: 'CASCADE' });
Decision.belongsTo(Pillar);
Pillar.hasMany(Pillar, { as: 'subcategories', foreignKey: 'parentId', onDelete: 'CASCADE' });
Pillar.belongsTo(Pillar, { as: 'parent', foreignKey: 'parentId' });

module.exports = {
    sequelize,
    Project,
    Pillar,
    Decision
};
