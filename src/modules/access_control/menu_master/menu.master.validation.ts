import ValidatorHelper from "../../../utils/helper/validator.helper.js";

export const validateMenuMasterIdParam = [
    ValidatorHelper.idParam("id", "number")
];

export const validateCreateMenuMaster = [
    ValidatorHelper.string("menu", true, 10000, "Menu configuration is required.")
];

export const validateUpdateMenuMaster = [
    ValidatorHelper.string("menu", false, 10000)
];
