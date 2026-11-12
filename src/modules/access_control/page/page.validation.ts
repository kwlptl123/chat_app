import ValidatorHelper from "../../../utils/helper/validator.helper.js";

export const validatePageIdParam = [
    ValidatorHelper.idParam("id", "number")
];

export const validateCreatePage = [
    ValidatorHelper.int("parent_id", false, null),
    ValidatorHelper.string("page_name", false, 100, null),
    ValidatorHelper.string("page_url", false, 100, null),
    ValidatorHelper.string("mobile_url", false, 100, null),
    ValidatorHelper.string("ip_address", false, 100, null),
    ValidatorHelper.string("city_cordinates", false, 150, null)
];

export const validateUpdatePage = [
    ValidatorHelper.int("parent_id", false),
    ValidatorHelper.string("page_name", false, 100),
    ValidatorHelper.string("page_url", false, 100),
    ValidatorHelper.string("mobile_url", false, 100),
    ValidatorHelper.string("ip_address", false, 100),
    ValidatorHelper.string("city_cordinates", false, 150)
];
