import ValidatorHelper from "../../../utils/helper/validator.helper.js";

export const validatePermissionIdParam = [
    ValidatorHelper.idParam("id", "number")
];

export const validateCreatePermission = [
    ValidatorHelper.int("permission_values", false, null),
    ValidatorHelper.string("permission", false, 100, null),
    ValidatorHelper.string("ip_address", false, 100, null),
    ValidatorHelper.string("city_cordinates", false, 150, null)
];

export const validateUpdatePermission = [
    ValidatorHelper.int("permission_values", false),
    ValidatorHelper.string("permission", false, 100),
    ValidatorHelper.string("ip_address", false, 100),
    ValidatorHelper.string("city_cordinates", false, 150)
];
