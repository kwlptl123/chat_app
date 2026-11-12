import ValidatorHelper from "../../../utils/helper/validator.helper.js";

export const validateRoleMasterIdParam = [
    ValidatorHelper.idParam("id", "number")
];

export const validateCreateRoleMaster = [
    ValidatorHelper.string("role_name", true, 100, "Role name is required."),
    ValidatorHelper.int("menu_id", true, "Menu ID is required.")
];

export const validateUpdateRoleMaster = [
    ValidatorHelper.string("role_name", false, 100),
    ValidatorHelper.int("menu_id", false)
];
