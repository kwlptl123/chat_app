import { ModuleMetadata } from '../types.js';

export function generateRouteTemplate(meta: ModuleMetadata): string {
    const baseName = meta.folderName.replace(/_/g, '.');
    // Generates clean endpoints: "berth_master" -> "/api/v1/berth"
    const endpointName = meta.folderName.replace(/_master/g, '').replace(/_/g, '-');

    return `/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 * Route definitions for the ${meta.entityName} domain module.
 * 
 * 2. HIERARCHY & PRIORITY:
 * 1. Endpoint Resolution: Mounts on clean /api/v1/${endpointName} path.
 * 2. Security: Applies JWT authentication barrier to all endpoints.
 * 3. Validation: Enforces express-validator schemas before reaching the controller.
 * ============================================================================
 */

import express from "express";
import ${meta.entityName}Controller from "./${baseName}.controller.js";
import authenticate from "${meta.relativeSrcPath}middleware/auth/authJwt.js";
import { 
    validate${meta.entityName}IdParam, 
    validateCreate${meta.entityName}, 
    validateUpdate${meta.entityName} 
} from "./${baseName}.validation.js";

const basePath = "/api/v1/${endpointName}";
const router = express.Router();

router.post(
  \`\${basePath}\`,
  authenticate,
  validateCreate${meta.entityName},
  ${meta.entityName}Controller.create
);

router.put(
  \`\${basePath}/:id\`,
  authenticate,
  [...validate${meta.entityName}IdParam, ...validateUpdate${meta.entityName}],
  ${meta.entityName}Controller.update
);

router.delete(
  \`\${basePath}/:id\`,
  authenticate,
  validate${meta.entityName}IdParam,
  ${meta.entityName}Controller.delete
);

router.get(
  \`\${basePath}\`,
  authenticate,
  ${meta.entityName}Controller.getAll
);

router.get(
  \`\${basePath}/:id\`,
  authenticate,
  validate${meta.entityName}IdParam,
  ${meta.entityName}Controller.getById
);

export default router;
`;
}