/**
 * ============================================================================
 * 1. ARCHITECTURE OVERVIEW:
 *    Centralized, immutable registry mapping logical entity identifiers to their
 *    corresponding MySQL `v_*` database view names.
 * 
 * 2. HIERARCHY & PRIORITY:
 *    1. Alphabetical Grouping: Views are organized by domain prefix (C, G, M, N, P, R, U).
 *    2. Strict Immutability: Frozen with `as const` to prevent runtime mutation.
 * 
 * 3. IMPLEMENTATION EXAMPLES:
 *    - Import in query builders: `import VIEW_NAME from "./view.names.constants.js";`
 * ============================================================================
 */

const VIEW_NAME = {
    // ----> C
    GET_ALL_CHAT_MASTER:"vw_chat_master",
    GET_ALL_CHAT_MEMBERS:"vw_chat_participants",
    // ----> G
    GET_ALL_GROUP_ROLE_PAGE_PERMISSION:"v_group_role_page_permission",
    // ----> M
    GET_ALL_MENU_MASTER:"v_menu_master",
    // ----> N
    GET_ALL_NOTIFICATION_MASTER:"vw_user_notifications",
    // ----> P
    GET_ALL_PAGE:"v_page",
    GET_ALL_PAGE_PERMISSION:"v_page_permission",
    GET_ALL_PERMISSION:"v_permission",
    // ----> R
    GET_ALL_ROLE_MASTER:"v_role_master",
    // ----> U
    GET_ALL_USER_CHATS_SUMMARY:"vw_user_chats_summary",
    GET_ALL_USER_MASTER:"vw_active_users",
} as const;

export default VIEW_NAME;