import PermissionService from "../../modules/access_control/permission/permission.service.js";
import GroupRolePagePermissionService from "../../modules/access_control/group_role_page_permission/group.role.page.permission.service.js";
// Assuming you have a RoleService built with the same pattern:
import RoleService from "../../modules/access_control/role_master/role.master.service.js"; 
import logger from "../../config/logs/winston.config.js";

class PermissionCache {
    // 1. Core RBAC mappings
    private roleCache: Map<number, Map<number, number>> = new Map();
    
    // 2. Global dictionaries for fast lookups
    public ACTIONS: Map<string, number> = new Map();
    public ROLES: Map<number, string> = new Map(); // Stores: { 1 => "ADMIN", 2 => "DEVELOPER" }

    public async refreshCache(): Promise<void> {
        try {
            // ==========================================
            // STEP A: Cache Global Actions (Permissions)
            // ==========================================
            const allPermissions = await PermissionService.getAll();
            const newActions = new Map<string, number>();
            
            for (const perm of allPermissions) {
                const data = (perm as any).dataValues || perm;
                if (data.is_active) {
                    const safeKey = String(data.permission).toUpperCase().replace(/\s+/g, '_');
                    newActions.set(safeKey, Number(data.permission_values));
                }
            }

            // ==========================================
            // STEP B: Cache Global Roles
            // ==========================================
            const allRoles = await RoleService.getAll();
            const newRoles = new Map<number, string>();
            
            for (const role of allRoles) {
                const data = (role as any).dataValues || role;
                // Only cache active roles
                if (data.is_active) {
                    newRoles.set(Number(data.role_id), data.role_name);
                }
            }

            // ==========================================
            // STEP C: Cache Role-to-Page Mappings
            // ==========================================
            const allRolePermissions = await GroupRolePagePermissionService.getAll();
            const newRoleCache = new Map<number, Map<number, number>>();

            for (const rpp of allRolePermissions) {
                const data = (rpp as any).dataValues || rpp;
                
                // Ensure both the mapping is active AND the role is active
                if (data.is_active && newRoles.has(Number(data.role_id))) {
                    const roleId = Number(data.role_id);
                    const pageId = Number(data.page_id);
                    const permMask = Number(data.permission);

                    if (!newRoleCache.has(roleId)) {
                        newRoleCache.set(roleId, new Map<number, number>());
                    }
                    newRoleCache.get(roleId)!.set(pageId, permMask);
                }
            }

            // ==========================================
            // STEP D: Atomic Swap (Zero Downtime)
            // ==========================================
            this.ACTIONS = newActions;
            this.ROLES = newRoles;
            this.roleCache = newRoleCache;
            
            logger.info(`RBAC Cache Refreshed: ${this.ROLES.size} Roles | ${this.ACTIONS.size} Actions | ${this.roleCache.size} Active Mappings.`);
        } catch (error) {
            logger.error("Failed to refresh RBAC cache:", error);
        }
    }

    /**
     * RBAC Check for Middleware
     */
    public hasPermission(roleId: number, pageId: number, requiredVal: number): boolean {
        // First check if the role is actually valid and active in our system!
        if (!this.ROLES.has(roleId)) return false;

        const pagesForRole = this.roleCache.get(roleId);
        if (!pagesForRole) return false; 

        const userMask = pagesForRole.get(pageId) || 0;
        return (userMask & requiredVal) === requiredVal;
    }

    /**
     * Helper to get Role Name by ID instantly anywhere in your app
     */
    public getRoleName(roleId: number): string | null {
        return this.ROLES.get(roleId) || null;
    }
}

export default new PermissionCache();