/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 *    Pre-compiled SQL SELECT statements mapping explicit database columns to their respective views.
 *    Eliminates "select *" ambiguity and provides a single source of truth for read operations.
 * 
 * 2. HIERARCHY & PRIORITY:
 *    1. Import the frozen `VIEW_NAME` constants to ensure view names are always accurate.
 *    2. Construct complete SQL SELECT strings defining every column explicitly.
 *    3. Freeze the object using `as const` so TypeScript validates these as strict string literals.
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 *    1. Data Layer Execution: 
 *       `const data = await sequelize.query(`${ViewFieldTableWise.USER_CHATS_SUMMARY_FIELDS} WHERE user_id = :userId`, { replacements: { userId }, type: QueryTypes.SELECT });`
 * ============================================================================
 */

// 1. Import the view names using the .js extension required by NodeNext module resolution
import VIEW_NAME from "./view.names.constants.js";

// 2. Pre-compiled, immutable SQL query strings for immediate execution
const ViewFieldTableWise = {
    // ----> C
    CHAT_MASTER_FIELDS:`SELECT chat_id, chat_type, chat_name, direct_chat_key, is_active, created_by, created_at, modified_by, modified_at, deleted_by, deleted_at FROM ${VIEW_NAME.GET_ALL_CHAT_MASTER}`,
    CHAT_MEMBERS_FIELDS:`SELECT chat_member_id, chat_id, chat_type, chat_name, direct_chat_key, user_id, user_name, email, emp_number, member_role, joined_at, member_is_active FROM ${VIEW_NAME.GET_ALL_CHAT_MEMBERS}`,
    // ----> G
    GROUP_ROLE_PAGE_PERMISSION_FIELDS:`SELECT role_page_permission_id, role_id, page_id, page_name, page_url, mobile_url, parent_id, parent_page_id, parent_page_name, parent_page_url, parent_mobile_url, permission, description, ip_address, city_cordinates, is_active, created_by, created_at, modified_by, modified_at, deleted_by, deleted_at FROM ${VIEW_NAME.GET_ALL_GROUP_ROLE_PAGE_PERMISSION}`,
    // ----> M
    MENU_MASTER_FIELDS:`SELECT menu_id, menu, is_active, created_by, created_at, modified_by, modified_at, deleted_by, deleted_at FROM ${VIEW_NAME.GET_ALL_MENU_MASTER}`,
    // ----> N
    NOTIFICATION_MASTER_FIELDS:`SELECT notification_id, recipient_id, sender_id, sender_name, sender_email, chat_id, chat_type, chat_name, firebase_message_id, notification_type, title, body, is_read, read_at, created_at FROM ${VIEW_NAME.GET_ALL_NOTIFICATION_MASTER}`,
    // ----> P
    PAGE_FIELDS:`SELECT page_id, parent_id, page_name, page_url, mobile_url, parent_page_id, parent_page_name, parent_page_url, parent_mobile_url, ip_address, city_cordinates, is_active, created_by, created_at, modified_by, modified_at, deleted_by, deleted_at FROM ${VIEW_NAME.GET_ALL_PAGE}`,
    PAGE_PERMISSION_FIELDS:`SELECT page_permission_id, page_id, parent_id, page_name, page_url, mobile_url, permission_id, permission_values, permission, ip_address, city_cordinates, is_active, created_by, created_at, modified_by, modified_at, deleted_by, deleted_at FROM ${VIEW_NAME.GET_ALL_PAGE_PERMISSION}`,
    PERMISSION_FIELDS:`SELECT permission_id, permission_values, permission, ip_address, city_cordinates, is_active, created_by, created_at, modified_by, modified_at, deleted_by, deleted_at FROM ${VIEW_NAME.GET_ALL_PERMISSION}`,
    // ----> R
    ROLE_MASTER_FIELDS:`SELECT role_id, role_name, menu_id, menu, is_active, created_by, created_at, modified_by, modified_at, deleted_by, deleted_at FROM ${VIEW_NAME.GET_ALL_ROLE_MASTER}`,
    // ----> U
    USER_CHATS_SUMMARY_FIELDS:`SELECT user_id, chat_id, chat_type, chat_name, direct_chat_key, my_role, joined_at, chat_created_at, chat_updated_at, total_members, member_ids_csv, member_ids_json FROM ${VIEW_NAME.GET_ALL_USER_CHATS_SUMMARY}`,
    USER_MASTER_FIELDS:`SELECT user_id, user_name, email, role_id, emp_number, is_active, created_at, modified_at FROM ${VIEW_NAME.GET_ALL_USER_MASTER}`,
} as const;

export default ViewFieldTableWise;