/**
 * ARCHITECTURE OVERVIEW:
 * Data mutation interceptor that automatically attaches audit trail parameters (creator, modifier, timestamps, active status) to payload objects prior to database insertion.
 * 
 * HIERARCHY & PRIORITY:
 * 1. User Context: Extract the active user ID from the request context.
 * 2. Generic Extension: Use TypeScript generics (`<T>`) and explicit type casting to preserve the original payload's type while appeasing the strict compiler during mutation.
 * 3. Operation Branching: Inject `created_*` for new records, or `modified_*` for updates.
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. Create Operation: `const insertData = createUpdateMetadata(req.body, req, false);`
 * 2. Update Operation: `const updateData = createUpdateMetadata(req.body, req, true);`
 */

import { Request } from "express";
import currentTime from "./get.current.time.ist.js";
import tokenData from "./get.user.id.by.jwt.js";

// Define the strictly typed shape of the audit fields being injected
export interface AuditMetadata {
    created_by?: number | string | null;
    created_at?: string;
    modified_by?: number | string | null;
    modified_at?: string;
    is_active?: boolean;
}

function createUpdateMetadata<T extends Record<string, any>>(
    data: T, 
    req: Request, 
    isUpdate: boolean = false
): T & AuditMetadata {
    // 1. Extract context (Fixed to only pass req)
    const currentUser = tokenData(req); 
    const timeNow = currentTime();

    const mutatedData = data as T & AuditMetadata;

    if (isUpdate) {
        mutatedData.modified_by = currentUser;
        mutatedData.modified_at = timeNow;
    } else {
        mutatedData.created_by = currentUser;
        mutatedData.created_at = timeNow;
        mutatedData.is_active = true;
    }

    return mutatedData;
}

export default createUpdateMetadata;