import ValidatorHelper from "../../../utils/helper/validator.helper.js";

export const validateGroupRolePagePermissionIdParam = [
    ValidatorHelper.idParam("id", "number")
];

export const validateCreateGroupRolePagePermission = [
    ValidatorHelper.int("role_id", false, null),
    ValidatorHelper.int("page_id", false, null),
    ValidatorHelper.int("permission", false, null),
    ValidatorHelper.string("description", false, 150, null),
    ValidatorHelper.string("ip_address", false, 100, null),
    ValidatorHelper.string("city_cordinates", false, 150, null)
];

export const validateUpdateGroupRolePagePermission = [
    ValidatorHelper.int("role_id", false),
    ValidatorHelper.int("page_id", false),
    ValidatorHelper.int("permission", false),
    ValidatorHelper.string("description", false, 150),
    ValidatorHelper.string("ip_address", false, 100),
    ValidatorHelper.string("city_cordinates", false, 150)
];

export const validateBulkCreateUpdateGroupRolePagePermission = [
    ValidatorHelper.int("role_id", false),
    ValidatorHelper.array("pageList", false), // Validates the array payload needed for the bulk loop
    ValidatorHelper.int("permission", false),
    // 3. Mark non-critical audit fields as optional (true) if appropriate, or keep strictly required (false)
    ValidatorHelper.string("description", true, 150), 
    ValidatorHelper.string("ip_address", false, 100),
    ValidatorHelper.string("city_cordinates", false, 150)
];
