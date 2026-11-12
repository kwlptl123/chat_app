import { ModuleMetadata } from '../types.js';

export function generateValidationTemplate(meta: ModuleMetadata): string {
    const schemaProps: string[] = [];

    for (const field of meta.tableFields) {
        if (field.isPrimaryKey || field.isAuditField) continue;

        const isReq = !field.allowNull;
        const props: string[] = [`type: "${field.valType}"`];

        // 1. Requirement Rule
        if (isReq) {
            props.push(`required: true`);
        }

        // 2. Length/Max Rules (Strings & Arrays)
        if (field.valType === 'string' && field.valMax) {
            props.push(`max: ${field.valMax}`);
        }

        // 3. Custom Messages
        if (isReq && field.customMessage && field.customMessage !== `${field.name} is required`) {
            props.push(`message: "${field.customMessage}"`);
        }

        schemaProps.push(`    ${field.name}: { ${props.join(', ')} }`);
    }

    return `import ValidatorHelper, { Schema } from "${meta.relativeSrcPath}utils/helper/validator.helper.js";

/**
 * Schema Definition for ${meta.entityName}
 * This single schema drives both CREATE (strict) and UPDATE (partial) validations.
 */
const ${meta.entityName}Schema: Schema = {
${schemaProps.join(',\n')}
};

// Id param is always a number; validate() sends the 400 response itself on failure
export const validate${meta.entityName}IdParam = ValidatorHelper.validate(
    ValidatorHelper.idParam("id", "number")
);

// Enforces all 'required: true' fields (sends the 400 response itself on failure)
export const validateCreate${meta.entityName} = ValidatorHelper.schema(${meta.entityName}Schema);

// Makes all fields optional for PATCH/PUT, but strictly validates the types of provided fields
export const validateUpdate${meta.entityName} = ValidatorHelper.partial(${meta.entityName}Schema);
`;
}