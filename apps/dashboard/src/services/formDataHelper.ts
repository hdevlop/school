/**
 * Form Data Helper Utilities
 * Handles conversion between complex JSON objects and FormData for multipart requests
 */

/**
 * Converts a data object to FormData, properly handling Files, Blobs, and complex objects
 * @param data - Object containing mixed data types (primitives, objects, arrays, Files)
 * @returns FormData instance ready for multipart/form-data requests
 */
export const toFormData = (data: Record<string, any>): FormData => {
    const formData = new FormData();

    for (const key in data) {
        if (data[key] !== null && data[key] !== undefined) {
            const value = data[key];

            // Handle File and Blob objects directly
            if (value instanceof File || value instanceof Blob) {
                formData.append(key, value);
            }
            // Stringify arrays and objects for proper transmission
            else if (typeof value === 'object') {
                formData.append(key, JSON.stringify(value));
            }
            // Convert primitives to string
            else {
                formData.append(key, String(value));
            }
        }
    }

    return formData;
};

/**
 * Parses JSON string fields back to objects
 * @param data - Raw data object from request
 * @param jsonFields - Array of field names that should be parsed as JSON
 * @returns Parsed data object with JSON fields converted back to objects
 */
export const parseFormData = (
    data: Record<string, any>,
    jsonFields: string[]
): Record<string, any> => {
    const parsed = { ...data };

    for (const field of jsonFields) {
        if (parsed[field] !== undefined && typeof parsed[field] === 'string') {
            try {
                parsed[field] = JSON.parse(parsed[field]);
            } catch {
                // Keep original value if parsing fails
               
            }
        }
    }

    return parsed;
};

/**
 * Check if an object contains any File or Blob instances
 * @param data - Object to check
 * @returns true if any File or Blob is found
 */
export const hasFiles = (data: any): boolean => {
    if (!data || typeof data !== 'object') {
        return false;
    }

    for (const key in data) {
        if (data[key] instanceof File || data[key] instanceof Blob) {
            return true;
        }
    }
    return false;
};

/**
 * Automatically detects complex fields in data object
 * @param data - Data object to analyze
 * @returns Array of field names containing arrays or objects (excluding Files/Blobs)
 */
export const detectJsonFields = (data: Record<string, any>): string[] => {
    const jsonFields: string[] = [];

    for (const key in data) {
        const value = data[key];
        if (
            value !== null &&
            value !== undefined &&
            typeof value === 'object' &&
            !(value instanceof File) &&
            !(value instanceof Blob)
        ) {
            jsonFields.push(key);
        }
    }

    return jsonFields;
};