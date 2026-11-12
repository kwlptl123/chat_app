import { ModuleMetadata } from '../types.js';

export function generateModelTemplate(meta: ModuleMetadata): string {
    const attrRows = meta.tableFields.map(f => `  ${f.name}${f.isAuditField || f.isPrimaryKey ? '?' : ''}: ${f.tsType};`).join('\n');
    
    const sequelizeFields = meta.tableFields.map(f => {
        let fieldDef = `      ${f.name}: {\n        type: ${f.sequelizeType},\n`;
        if (f.isPrimaryKey) fieldDef += `        primaryKey: true,\n        autoIncrement: true,\n`;
        fieldDef += `        allowNull: ${f.allowNull || f.isAuditField ? 'true' : 'false'},\n`;
        if (f.name === 'is_active') fieldDef += `        defaultValue: true,\n`;
        if (f.name === 'created_at') fieldDef += `        defaultValue: DataTypes.NOW,\n`;
        fieldDef += `      }`;
        return fieldDef;
    }).join(',\n');

    return `import { DataTypes, Sequelize, Model, Optional } from "sequelize";

export interface ${meta.entityName}Attributes {
${attrRows}
}

export interface ${meta.entityName}CreationAttributes extends Optional<${meta.entityName}Attributes, "${meta.primaryKey}"> {}

const ${meta.entityName}Model = (sequelize: Sequelize) => {
  return sequelize.define<Model<${meta.entityName}Attributes, ${meta.entityName}CreationAttributes>>(
    "${meta.tableName}",
    {
${sequelizeFields}
    },
    {
      tableName: "${meta.tableName}",
      paranoid: true,
      timestamps: false,
      defaultScope: {
        attributes: {
          exclude: [
            "created_by",
            "modified_by",
            "deleted_by",
            "deleted_at",
            "is_active",
            "created_at",
            "modified_at",
          ],
        },
      },
    }
  );
};

export default ${meta.entityName}Model;
`;
}