/**
 * ARCHITECTURE OVERVIEW:
 * Standardized API Response formatter. Guarantees a consistent JSON structure for both successful payloads and error states across the entire application. 
 * Replaces legacy synchronous I/O operations with pure memory execution for maximum performance.
 * 
 * HIERARCHY & PRIORITY:
 * 1. Define strict Generic Interfaces (`ApiSuccessResponse`, `ApiErrorResponse`) to guarantee structural integrity for downstream consumers (frontend clients).
 * 2. Evaluate the `isError` flag to branch the response structure dynamically.
 * 3. Return a frozen, serialized-ready object containing the status code, success boolean, human-readable text, and the payload/error data.
 * 
 * IMPLEMENTATION EXAMPLES:
 * 1. Success Route: 
 *    `res.status(200).json(createResponse(200, "Data loaded", userData));`
 * 2. Error Route: 
 *    `res.status(400).json(createResponse(400, "Invalid Input", errDetails, true));`
 */

// 1. Strictly define the shape of a successful API response
export interface ApiSuccessResponse<T = unknown> {
    statusCode: number;
    success: true;
    message_text: string | null;
    message: string | null;
    data: T | null;
}

// 2. Strictly define the shape of an error API response
export interface ApiErrorResponse<E = unknown> {
    statusCode: number;
    success: false;
    message_text: string | null;
    error_message: string | null;
    error: E | null;
}

// 3. Create a Union Type for the return signature
export type ApiResponse<T, E> = ApiSuccessResponse<T> | ApiErrorResponse<E>;

/**
 * Constructs a standardized JSON response object.
 * 
 * @param statusCode - HTTP Status Code (e.g., 200, 400, 500)
 * @param message - Human-readable string message outlining the result
 * @param data - The core payload (for success) or error details (for failure)
 * @param isError - Boolean flag to dictate the shape of the returned object
 * @returns A strictly typed ApiResponse object ready for JSON serialization
 */
const createResponse = <T = unknown, E = unknown>(
    statusCode: number,
    message: string | null = null,
    data: T | E | null = null,
    isError: boolean = false
): ApiResponse<T, E> => {
    
    // Secure by Default: Removed console.logs to prevent polluting production logs with every API response.
    
    if (!isError) {
        // Return structured Success payload
        return {
            statusCode,
            success: true,
            message_text: message,
            message: message, // Legacy mapped codes removed, returning raw string to save memory
            data: data as T | null,
        };
    } else {
        // Return structured Error payload
        return {
            statusCode,
            success: false,
            message_text: message,
            error_message: message, // Legacy mapped codes removed, returning raw string to save memory
            error: data as E | null,
        };
    }
};

export default createResponse;