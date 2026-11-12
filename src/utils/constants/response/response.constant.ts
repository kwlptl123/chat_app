/**
 * ARCHITECTURE OVERVIEW:
 * Centralized dictionary of standard API response messages, grouped by domain context (Authentication, Database, Validation, System).
 * 
 * HIERARCHY & PRIORITY:
 * 1. Categorization: Divide messages into logical domains to prevent a bloated, flat structure.
 * 2. Immutability: Apply `as const` to freeze the object, ensuring messages are strictly typed string literals, not mutable strings.
 * 3. Export: Export as a single nested constant for structured access across the application.
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. Authentication Error: `responseConst.AUTH.NO_TOKEN`
 * 2. Database Success: `responseConst.DB_SUCCESS.DATA_RETRIEVE_SUCCESS`
 * 3. Validation Failure: `responseConst.VALIDATION.EMAIL_IS_MANDATORY`
 */

// 1. Group constants into strict categorical domains to eliminate the unstructured "magic string" mess.
const RESPONSE_CONSTANTS = {
    // 2. SECURITY & AUTHENTICATION
    AUTH: {
        UNAUTHORIZED: "Unauthorized: Invalid or missing token",
        USER_NOT_FOUND: "User Not found.",
        LOGGED_IN_SUCCESFULLY: "Logged In Successfully",
        ERROR_LOG_IN: "An error occurred while Logging In.",
        INVALID_PASSWORD: "Invalid Password!",
        INVALID_CREDENTIAL: "Invalid Credential",
        WRONG_CREDENTIAL: "Invalid Credential.",
        OLD_PASSWORD_IS_INVALID: "Old Password Is Invalid.",
        PASSWORD_REQUIRED: "Password Is Required.",
        PASSWORD_HAS_BEEN_USED: "Password has already been used recently. Please use a new one.",
        JWT_EXPIRED: "JWT token has expired",
        UNVERIFIED_TOKEN: "Failed to verify JWT token",
        NO_TOKEN: "No Token Provided",
        INVALID_USERNAME: "Invalid Username!",
        USER_NOT_ACTIVE: "User Not Active!",
        LOGNED_USER_IS_NOT_AGENT: "Login user is not Agent",
        INVALID_OTP_KINDLY_RECHECK: "Invalid Otp Kindly Recheck.",
        OTP_HAS_EXPIRED: "OTP_HAS_BEEN_EXPIRED",
    },

    // 3. DATABASE SUCCESS OPERATIONS
    DB_SUCCESS: {
        SUCCESS_ADDING_RECORD: "Data added successfully.",
        DATA_RETRIEVE_SUCCESS: "Data retrieved successfully.",
        SUCCESS_UPDATING_RECORD: "Data updated successfully.",
        SUCCESS_DELETING_RECORD: "Data deleted successfully.",
        SSO_CREATED_SUCCESSFULLY: "SSO_CREATED_SUCCESSFULLY",
    },

    // 4. DATABASE ERROR OPERATIONS
    DB_ERROR: {
        ERROR_ADDING_RECORD: "An error occurred while adding the record.",
        DATA_NOT_FOUND: "Data not found.",
        DATA_NOT_FOUND_FOR_ID: "Data Not Found By Id.",
        ERROR_UPDATING_RECORD: "An error occurred while updating the record.",
        ERROR_DELETING_RECORD: "An error occurred while deleting the record.",
        UNIQUE_CONSTRANTS_FAILED: "A record with this unique constraint already exists.",
        DATA_IS_AMBIGIOUS: "More Than One Record Found.",
    },

    // 5. BUSINESS LOGIC & VALIDATION
    VALIDATION: {
        SERVICE_SUB_TYPE_WITH_UNIT_ALREADY_PRESENT: "Service Sub Type With Unit Already Present.",
        AGENT_EMAIL_IS_MANDATORY: "Agent Email Is Mandatory.",
        FIELDS_ARE_MISSING_IN_PASSENGER_MANIFEST: "Some Fields Are Missing kindly Recheck.",
        FIELDS_ARE_MISSING_IN_CREW_MANIFEST: "Some Fields Are Missing kindly Recheck.",
        CREW_DATA_NOT_FOUND: "Crew Data Not Found In Voyage.",
        PASSENGER_DATA_NOT_FOUND: "Passanger Data Not Found In Voyage.",
        INVALID_DATA: "INVALID DATA FOUND, RECHECK THE DATA.",
        CHARGE_NOT_ASSIGNED: "CHARGE NOT ASSIGNED.",
        TOTAL_QUANTITY_NOT_DELIVERIED_FOR_JOB: "TOTAL QUANTITY NOT DELIVERED FOR JOB.",
        ENTER_A_VALID_EMAIL: "Enter a Valid Email.",
        AGENT_CONTRACT_NOT_FOUND: "Agent Contract Not Found.",
        ONLY_JPG_AND_PDF_FORMAT_ALLOWED: "Only JPG, PDF Format Allowed.",
        EMAIL_IS_MANDATORY: "Email Id Is Mandatory.",
        EMAIL_ALREADY_IN_USE: "Email Already In Use.",
        EMAIL_IS_READY_TO_USE: "Email Ready To Use.",
        USERNAME_ALREADY_IN_USE: "User Name Already In Use.",
        USERNAME_IS_READY_TO_USE: "User Name Ready To Use.",
        AGENT_CAN_ONLY_CREATE_SSO: "Agent Can Create SSO Only.",
        SSO_CREATION_FAILED: "SSO_CREATION_FAILED",
    },

    // 6. SYSTEM & INFRASTRUCTURE ERRORS
    SYSTEM: {
        INTERNAL_SERVER_ERROR: "Internal server error",
        API_NOT_FOUND: "API endpoint not found.",
        ERROR_WHILE_SAVING_FILE_TO_SERVER: "Error While Saving File To Server.",
    }
} as const; // 7. Secure by Default: Freeze the object structure to prevent runtime modifications

export default RESPONSE_CONSTANTS;