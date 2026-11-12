import ValidatorHelper from "../../../utils/helper/validator.helper.js";

export const validateUserMasterIdParam = [
    ValidatorHelper.idParam("id", "number")
];

export const validateCreateUserMaster = [
    ValidatorHelper.string("user_name", true, 100, "User name is required."),
    ValidatorHelper.string("password", true, 150, "Password is required."),
    ValidatorHelper.string("email", true, 100, "Email is required."),
    ValidatorHelper.int("role_id", true, "Role ID is required."),
    ValidatorHelper.string("emp_number", false, 50, null),
    ValidatorHelper.int("otp", false, null),
    ValidatorHelper.date("otp_time", false, null),
    ValidatorHelper.date("password_expiry_date", false, null)
];

export const validateUpdateUserMaster = [
    ValidatorHelper.string("user_name", false, 100),
    ValidatorHelper.string("password", false, 150),
    ValidatorHelper.string("email", false, 100),
    ValidatorHelper.int("role_id", false),
    ValidatorHelper.string("emp_number", false, 50),
    ValidatorHelper.int("otp", false),
    ValidatorHelper.date("otp_time", false),
    ValidatorHelper.date("password_expiry_date", false)
];
