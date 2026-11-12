import { ParsedField, RawModuleSchema, ModuleMetadata, FieldConfig } from './types.js';

const AUDIT_FIELDS = new Set([
    'created_by', 'created_at', 'modified_by', 'modified_at', 'deleted_by', 'deleted_at', 'is_active'
]);

export function parseSqlType(fieldName: string, fieldData: string | FieldConfig, isPrimaryKey: boolean): ParsedField {
    // 1. Extract data whether it's a raw string or a configuration object
    const isObject = typeof fieldData === 'object';
    const rawSql = isObject ? (fieldData as FieldConfig).type : (fieldData as string);
    
    const allowNull = isObject ? !!(fieldData as FieldConfig).allowNull : false;
    const customMessage = isObject && (fieldData as FieldConfig).message 
        ? (fieldData as FieldConfig).message!
        : `${fieldName} is required`;
    const isEmail = isObject ? !!(fieldData as FieldConfig).isEmail : false;

    // 2. Parse SQL Types
    const raw = rawSql.toLowerCase().trim();
    const isAudit = AUDIT_FIELDS.has(fieldName.toLowerCase());

    let tsType = 'any';
    let sequelizeType = 'DataTypes.STRING';
    
    // New simplified validation properties
    let valType: ParsedField['valType'] = 'string';
    let valMax: number | null = null;

    if (raw.startsWith('varchar') || raw.startsWith('char') || raw === 'text') {
        tsType = 'string';
        valType = 'string';
        const match = raw.match(/\((\d+)\)/);
        if (match) {
            sequelizeType = `DataTypes.STRING(${match[1]})`;
            valMax = parseInt(match[1], 10);
        } else {
            sequelizeType = raw === 'text' ? 'DataTypes.TEXT' : 'DataTypes.STRING';
        }
    } else if (raw.startsWith('tinyint(1)') || raw === 'boolean') {
        tsType = 'boolean';
        sequelizeType = 'DataTypes.BOOLEAN';
        valType = 'boolean';
    } else if (raw.startsWith('int') || raw.startsWith('tinyint') || raw.startsWith('smallint') || raw.startsWith('bigint')) {
        tsType = 'number';
        sequelizeType = raw.includes('bigint') ? 'DataTypes.BIGINT' : 'DataTypes.INTEGER';
        valType = 'int';
    } else if (raw.startsWith('decimal') || raw.startsWith('float') || raw.startsWith('double')) {
        tsType = 'number';
        const match = raw.match(/\((\d+)\s*,\s*(\d+)\)/);
        sequelizeType = match ? `DataTypes.DECIMAL(${match[1]}, ${match[2]})` : 'DataTypes.DECIMAL(10, 2)';
        valType = 'decimal';
    } else if (raw.startsWith('datetime') || raw.startsWith('timestamp') || raw === 'date') {
        tsType = 'Date';
        sequelizeType = 'DataTypes.DATE';
        valType = 'date';
    } else if (raw === 'json') {
        tsType = 'any';
        sequelizeType = 'DataTypes.JSON';
        valType = 'json';
    }

    // 3. Override valType if specialized validation is requested
    if (isEmail) {
        valType = 'email';
    }

    return {
        name: fieldName,
        rawSqlType: rawSql,
        tsType,
        sequelizeType,
        isPrimaryKey,
        isAuditField: isAudit,
        allowNull,
        customMessage,
        valType,
        valMax
    };
}

export function parseRawSchema(raw: RawModuleSchema): ModuleMetadata {
    const primaryKey = raw.primaryKey || Object.keys(raw.tableFields)[0];
    const tableFields: ParsedField[] = [];
    const viewFields: ParsedField[] = [];

    // Parse main table fields
    for (const [name, fieldData] of Object.entries(raw.tableFields)) {
        tableFields.push(parseSqlType(name, fieldData, name === primaryKey));
    }

    // Parse view fields (fallback to table fields if none provided)
    const views = raw.viewFields || raw.tableFields;
    for (const [name, fieldData] of Object.entries(views)) {
        viewFields.push(parseSqlType(name, fieldData, name === primaryKey));
    }

    const pkField = tableFields.find(f => f.name === primaryKey);
    
    // Calculate how many levels deep this module is to accurately point to src/
    const moduleGroup = raw.moduleGroup || '';
    const groupDepth = moduleGroup ? moduleGroup.split('/').filter(Boolean).length : 0;
    const relativeSrcPath = '../'.repeat(groupDepth + 2); // +2 for folderName and modules

    return {
        moduleGroup: raw.moduleGroup || '', // Parse the new grouping property
        relativeSrcPath,
        folderName: raw.folderName,
        entityName: raw.entityName,
        tableName: raw.tableName,
        viewName: raw.viewName || `v_${raw.tableName}`,
        primaryKey,
        primaryKeyType: pkField ? pkField.tsType : 'number',
        useJsonCache: raw.useJsonCache ?? false,
        tableFields,
        viewFields
    };
}