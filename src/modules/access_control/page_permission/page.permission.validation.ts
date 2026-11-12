import ValidatorHelper from "../../../utils/helper/validator.helper.js";

export const validatePagePermissionIdParam = [
    ValidatorHelper.idParam("id", "number")
];

export const validateCreatePagePermission = [
    ValidatorHelper.int("page_id", false, null),
    ValidatorHelper.int("permission_id", false, null),
    ValidatorHelper.string("ip_address", false, 100, null),
    ValidatorHelper.string("city_cordinates", false, 150, null)
];

export const validateUpdatePagePermission = [
    ValidatorHelper.int("page_id", false),
    ValidatorHelper.int("permission_id", false),
    ValidatorHelper.string("ip_address", false, 100),
    ValidatorHelper.string("city_cordinates", false, 150)
];


export const validateBulkCreateOrUpdatePagePermission = [
    ValidatorHelper.int("page_id", false), // Required integer
    ValidatorHelper.array("permissionIdList", false, 1), // Required array, minimum 1 item
    ValidatorHelper.string("ip_address", false, 100), // Required string, max 100
    ValidatorHelper.string("city_cordinates", false, 150) // Required string, max 150
];

