/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-06-26 | @Updated: 2020-06-26, 2024-01-06
 * @Company: mConnect.biz | @License: MIT
 * @Description: common validation functions
 */
import { CrudParamsType } from "./types";
import { isEmptyObject } from "./utils";
import { MessageObject } from "../orm";

export const isProvided = (param: any): boolean => {
    // Verify the Required status
    // Validate that the item is not empty / null / undefined
    return !(param === '' || param === null || param === undefined || Object.keys(param).length === 0);
};

export const isEven = (num: number): boolean => {
    return Number.isFinite(num) && (num % 2 === 0);
};

export const isOdd = (num: number): boolean => {
    return Number.isFinite(num) && (num % 2 !== 0);
};

export const isNumberDigit = (num: number | string): boolean => {
    // Validate that param is a number (digit): 100 | 99 | 33 | 44 | 200
    const numberPattern = /^[0-9]+$/;
    return numberPattern.test(num.toString());
};

export const isNumberFloat = (num: number): boolean => {
    // Validate that param is a number (float): 0.90 | 99.9 | 33.3 | 44.40
    const numberPattern = /^([0-9])+([.])?([0-9])*$/;
    return numberPattern.test(num.toString());
};

export const isObjectType = (param: object): boolean => {
    "use strict";
    // Validate param is an object, {}
    return (typeof param === 'object' && !Array.isArray(param));
};

export const isArrayType = (param: Array<any>): boolean => {
    "use strict";
    // Validate param is an object, []
    return Array.isArray(param);
};

export const isStringChar = (param: string): boolean => {
    // Validate that param is a string (characters only) -- use regEx
    const charRegEx = /^[a-zA-Z&$_\-]+$/;
    return charRegEx.test(param);
};

export const isStringAlpha = (param: string): boolean => {
    // Validate that param is a string (alphanumeric, chars/numbers only)
    const alphaNumericPattern = /^[a-zA-Z0-9-_-]+$/;
    return alphaNumericPattern.test(param);
};

export const isUsername = (param: string): boolean => {
    "use strict";
    const usernamePattern = /^([a-zA-Z0-9_])+$/; // alphanumeric, underscore, no space
    return usernamePattern.test(param);
};

export const isEmpty = (param: any): boolean => {
    "use strict";
    return (param === '' || param === null || param === undefined ||
        Object.keys(param).length === 0 ||
        (Array.isArray(param) && param.length === 0));
};

export const isNull = (infoItem: any): boolean => {
    "use strict";
    return infoItem === null;
};

export const isEmail = (param: string): boolean => {
    const testPattern = /^[0-9a-zA-Z]+([0-9a-zA-Z]*[-._+])*[0-9a-zA-Z]+@[0-9a-zA-Z]+([-.][0-9a-zA-Z]+)*([0-9a-zA-Z]*[.])[a-zA-Z]{2,6}$/;
    // const testPattern = /^[0-9a-zA-Z]+([\-._][0-9a-zA-Z]+)*@[0-9a-zA-Z]+([\-.][0-9a-zA-Z]+)*([.])[a-zA-Z]{2,6}$/;
    return testPattern.test(param);
};

export const isPassword = (param: string): boolean => {
    const testPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d.*)(?=.*\W.*)[a-zA-Z0-9\S]{6,15}$/;
    return testPattern.test(param);
};

export const isNumberOnRange = (num: number, min: number = 0, max: number = 0) => {
    if ((isNumberDigit(num) || isNumberFloat(num)) && (min < max)) {
        return (num >= min && num <= max)
    }
    return false;
};

export const isPhone = (param: string): boolean => {
    const phonePattern = /^([1-9]{1,3})?[\-. ]?(\(\d{3}\)?[\-. ]?|\d{3}?[\-. ]?)?\d{3}?[\-. ]?\d{4}$/;
    return phonePattern.test(param);
};

export const isPostalCode = (param: string): boolean => {
    const postCodePattern = /^[a-zA-Z0-9]+(\s)?[a-zA-Z0-9]*/;
    return postCodePattern.test(param);
};

export const isPostalCodeUS = (param: string): boolean => {
    const postCodePattern = /^[a-zA-Z0-9]+(\s)?[a-zA-Z0-9]*/;
    return postCodePattern.test(param);
};

export const isPostalCodeCanada = (param: string): boolean => {
    const postCodePattern = /^[a-zA-Z0-9]+(\s)?[a-zA-Z0-9]*/;
    return postCodePattern.test(param);
};

export const isPostalCodeUK = (param: string): boolean => {
    const postCodePattern = /^[a-zA-Z0-9]+(\s)?[a-zA-Z0-9]*/;
    return postCodePattern.test(param);
};

export const isName = (param: string): boolean => {
    const namePattern = /^[a-zA-Z'\-]+(\s[a-zA-Z'\-])*[a-zA-Z'\-]*/;   // Abi Charles Africa America
    return namePattern.test(param);
};

export const isURL = (param: string): boolean => {
    // Abi Charles Africa America
    const namePattern = /^[a-zA-Z0-9\-\\_.:]+$/;
    return namePattern.test(param);

};

export const isBusinessNumber = (param: string): boolean => {
    // business number format
    const bnPattern = /^[0-9\-]+$/;
    return bnPattern.test(param);
};

export const isStandardCode = (param: string): boolean => {
    // Product Group | Body & Soul10
    const standardCodePattern = /^[a-zA-Z0-9]+[&\s\-_]*[a-zA-Z0-9$#]*$/;
    return standardCodePattern.test(param);
};

export const isCountryCode = (param: string): boolean => {
    // langCode must be string of format en-US
    const countryCodePattern = /^[a-z]{2}-[A-Z]{2}$/;
    return countryCodePattern.test(param);
};

export const isLanguageCode = (param: string): boolean => {
    // langCode must be string of format en-US
    const langCodePattern = /^[a-z]{2}-[A-Z]{2}$/;
    return langCodePattern.test(param);
};

export const isWordSpace = (param: string): boolean => {
    // words with spaces and hyphens, no numbers
    const wordSpacePattern = /^[a-zA-Z0-9,()'._&]+[\s\-a-zA-Z0-9,()'._&]*[a-zA-Z0-9,()'._?]*$/;
    return wordSpacePattern.test(param);
};

export const isLabelCode = (param: string): boolean => {
    // firstName_middleName_lastName
    const labelCodePattern = /^[a-zA-Z]+[_\-a-zA-Z]*[_a-z0-9]*$/;
    return labelCodePattern.test(param);
};

export const isErrorCode = (param: string): boolean => {
    // error code format (AB10-100, AB900)
    const errorCodePattern = /^[a-zA-Z0-9]+[-]*[0-9]*$/;
    return errorCodePattern.test(param);
};

export const isPathName = (param: string) => {
    // mysite.new_base.nicelook
    const pathNamePattern = /^[a-zA-Z0-9/]+[_a-zA-Z0-9./]*[a-zA-Z0-9/]*$/;
    return pathNamePattern.test(param);
};

export const isNameNoSpace = (param: string): boolean => {
    // JohnPaul
    const nameNoSpacePattern = /[a-zA-Z]+/;
    return nameNoSpacePattern.test(param);
};

export const isDescription = (param: string): boolean => {
    "use strict";
    const descPattern = /^[a-zA-Z0-9\s\\.,:/()*_|\-!@#$%&]+$/; // Alphanumeric string with spaces, and
    // (.,:/()*_-|!@)
    return descPattern.test(param);
};

export const isCurrency = (param: string): boolean => {
    const currencyPattern = /^[a-zA-Z#$]+$/;
    return currencyPattern.test(param);
};

export const isSafeInteger = (n: number): boolean => {
    return (Math.round(n) === n &&
        Number.MIN_SAFE_INTEGER <= n &&
        n <= Number.MAX_SAFE_INTEGER);
};

// crudParams validation helper functions

export function validateSaveParams(crudParams: CrudParamsType) {
    // Initialise error object and patterns matching:
    let errors: MessageObject = {};
    try {
        if (crudParams.tableName) {
            // Check input formats/patterns
            const testItem = isStringAlpha(crudParams.tableName);
            if (!testItem) {
                errors.coll = "format-error, should be a string/alphanumeric";
            }
        } else {
            errors.coll = "required-error, info is required";
        }

        if (crudParams.recordIds) {
            // Check input formats/patterns
            const testItem = isArrayType(crudParams.recordIds);
            if (!testItem) {
                errors.docIds = "format-error, should be an array[]";
            }
        }

        if (crudParams.actionParams) {
            // Check input formats/patterns:  array
            const testObject = isArrayType(crudParams.actionParams);
            if (!testObject) {
                errors.actionParams = "format-error, should be an array";
            }
        } else {
            errors.queryParams = "required-error, info required";
        }

        if (crudParams.queryParams) {
            // Check input formats/patterns: object or array
            const testObject = isObjectType(crudParams.queryParams);
            if (!testObject) {
                errors.queryParams = "format-error, should be an object{}";
            }
        }

        if (crudParams.existParams) {
            // Check input formats/patterns
            const testItem = isArrayType(crudParams.existParams);
            if (!testItem) {
                errors.existParams = "format-error, should be an array[]";
            }
        } else {
            errors.existParams = "required-error, info is required";
        }

        if (crudParams.token) {
            // Check input formats/patterns
            const testItem = isStringAlpha(crudParams.token);
            if (!testItem) {
                errors.token = "format-error, should be a string/alphanumeric";
            }
        }

        if (crudParams.userInfo) {
            // Check input formats/patterns
            const testItem = isObjectType(crudParams.userInfo);
            if (!testItem) {
                errors.userInfo = "format-error, should be an object{}";
            }
        }

        // if (!crudParams.token && Object.keys(crudParams.userInfo).length < 1) {
        //     errors.userInfoRequired = "token or userInfo is required";
        //     errors.tokenRequired = "token or userInfo is required";
        // }
    } catch (e) {
        console.error("Error validating save-record(s) inputs");
        errors.validationError = "Error validating save-record(s) inputs";
    }

    return errors;
}

export function validateDeleteParams(crudParams: CrudParamsType) {
    // Initialise error object and patterns matching:
    let errors: MessageObject = {};

    try {
        if (crudParams.tableName) {
            // Check input formats/patterns
            const testItem = isStringAlpha(crudParams.tableName);
            if (!testItem) {
                errors.coll = "format-error, should be a string/alphanumeric";
            }
        } else {
            errors.coll = "required-error, info is required";
        }

        if (crudParams.queryParams) {
            // Check input formats/patterns
            const testItem = isObjectType(crudParams.queryParams);
            if (!testItem) {
                errors.queryParams = "format-error, should be an object{}";
            }
        }

        if (crudParams.recordIds) {
            // Check input formats/patterns
            const testItem = isArrayType(crudParams.recordIds);
            if (!testItem) {
                errors.docIds = "format-error, should be an array[]";
            }
        }

        if ((!crudParams.recordIds || crudParams.recordIds.length < 1) && (!crudParams.queryParams || isEmptyObject(crudParams.queryParams))) {
            errors.docIds = errors.docIds ? errors.docIds + " | docId or queryParams is required" :
                "docId or queryParams is required";
            errors.queryParams = errors.queryParams ? errors.queryParams + " | docId or queryParams is required" :
                "docId or queryParams is required";
        }

        if (crudParams.token) {
            // Check input formats/patterns
            const testItem = isStringAlpha(crudParams.token);
            if (!testItem) {
                errors.token = "format-error, should a string/alphanumeric";
            }
        }

        if (crudParams.userInfo) {
            // Check input formats/patterns
            const testItem = isObjectType(crudParams.userInfo);
            if (!testItem) {
                errors.userInfo = "format-error, should be an object{}";
            }
        }

        // if (!crudParams.token && Object.keys(crudParams.userInfo).length < 1) {
        //     errors.userInfoRequired = "token or userInfo is required";
        //     errors.tokenRequired = "token or userInfo is required";
        // }

    } catch (e) {
        console.error("Error validating delete-record(s) inputs");
        errors.validationError = "Error validating delete-record(s) inputs";
    }

    return errors;

}

export function validateGetParams(crudParams: CrudParamsType) {
    // Initialise error object and patterns matching:
    let errors: MessageObject = {};

    try {
        if (crudParams.tableName) {
            // Check input formats/patterns
            const testItem = isStringAlpha(crudParams.tableName);
            if (!testItem) {
                errors.coll = "format-error, collection name should be a string";
            }
        } else {
            errors.coll = "required-error, info is required";
        }

        if (crudParams.queryParams) {
            // Check input formats/patterns
            const testItem = isObjectType(crudParams.queryParams);
            if (!testItem) {
                errors.queryParams = "format-error, queryParams should be an object";
            }
        }

        if (crudParams.projectParams) {
            // Check input formats/patterns
            const testItem = isObjectType(crudParams.projectParams);
            if (!testItem) {
                errors.projectParams = "format-error, projectParams should be an object";
            }
        }

        if (crudParams.sortParams) {
            // Check input formats/patterns
            const testItem = isObjectType(crudParams.sortParams);
            if (!testItem) {
                errors.sortParams = "format-error, sortParams should be an object";
            }
        }

        if (crudParams.recordIds) {
            // Check input formats/patterns
            const testItem = isArrayType(crudParams.recordIds);
            if (!testItem) {
                errors.docId = "format-error, docId(s) should be an array";
            }
        }

        if (crudParams.token) {
            // Check input formats/patterns
            const testItem = isStringAlpha(crudParams.token);
            if (!testItem) {
                errors.token = "format-error, token should be a string/alphanumeric";
            }
        }

        if (crudParams.userInfo) {
            // Check input formats/patterns
            const testItem = isObjectType(crudParams.userInfo);
            if (!testItem) {
                errors.userInfo = "format-error, userInfo should be an object";
            }
        }

        // if (!crudParams.token && Object.keys(crudParams.userInfo).length < 1) {
        //     errors.userInfoRequired = "token or userInfo is required";
        //     errors.tokenRequired = "token or userInfo is required";
        // }

    } catch (e) {
        console.error("Error validating get-record(s) inputs");
        errors.validationError = "Error validating get-record(s) inputs";
    }

    return errors;
}

export function validateLoadParams(crudParams: CrudParamsType) {
    // Initialise error object and patterns matching:
    let errors: MessageObject = {};

    try {
        if (crudParams.tableName) {
            // Check input formats/patterns
            const testItem = isStringAlpha(crudParams.tableName);
            if (!testItem) {
                errors.coll = 'format-error, collection name should be a string/alphanumeric';
            }
        } else {
            errors.coll = 'required-error, info is required';
        }

        if (crudParams.actionParams) {
            // Check input formats/patterns
            const testItem = isArrayType(crudParams.actionParams);
            if (!testItem) {
                errors.actionParams = 'format-error, actionParams should be an array';
            }
        } else {
            errors.actionParams = 'required-error; info is required';
        }
    } catch (e) {
        console.error('Error validating load-record(s) inputs');
        errors.validationError = 'Error validating load-record(s) inputs';
    }

    return errors;
}
