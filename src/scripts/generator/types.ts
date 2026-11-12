// src/scripts/generator/types.ts

export interface FieldConfig {
    type: string;
    allowNull?: boolean;
    isEmail?: boolean;
    message?: string;
}

export interface RawModuleSchema {
    moduleGroup?: string; // NEW: e.g., "master" or "master1/master2"
    folderName: string;
    entityName: string;
    tableName: string;
    viewName?: string;
    primaryKey?: string;
    useJsonCache?: boolean;
    tableFields: Record<string, string | FieldConfig>; 
    viewFields?: Record<string, string | FieldConfig>;
}

export interface ParsedField {
    name: string;
    rawSqlType: string;
    tsType: string;
    sequelizeType: string;
    isPrimaryKey: boolean;
    isAuditField: boolean;
    allowNull: boolean;
    customMessage: string;
    valType: 'string' | 'int' | 'boolean' | 'decimal' | 'date' | 'email' | 'json';
    valMax: number | null;
}

export interface ModuleMetadata {
    moduleGroup: string;
    relativeSrcPath: string; // NEW: Dynamically calculated path to src/
    folderName: string;
    entityName: string;
    tableName: string;
    viewName: string;
    primaryKey: string;
    primaryKeyType: string;
    useJsonCache: boolean;
    tableFields: ParsedField[];
    viewFields: ParsedField[];
}