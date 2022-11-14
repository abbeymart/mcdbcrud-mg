/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-27
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: crud-validation helper functions
 */

import { isEmptyObject, MessageObject } from "../orm";
import * as utils from "./validate";
import { CrudParamsType } from "./types";

export function validateSaveParams(crudParams: CrudParamsType) {
    // Initialise error object and patterns matching:
    let errors: MessageObject = {};
    try {
        if (crudParams.coll) {
            // Check input formats/patterns
            const testItem = utils.isStringAlpha(crudParams.coll);
            if (!testItem) {
                errors.coll = "format-error, should be a string/alphanumeric";
            }
        } else {
            errors.coll = "required-error, info is required";
        }

        if (crudParams.docIds) {
            // Check input formats/patterns
            const testItem = utils.isArrayType(crudParams.docIds);
            if (!testItem) {
                errors.docIds = "format-error, should be an array[]";
            }
        }

        if (crudParams.actionParams) {
            // Check input formats/patterns:  array
            const testObject = utils.isArrayType(crudParams.actionParams);
            if (!testObject) {
                errors.actionParams = "format-error, should be an array";
            }
        } else {
            errors.queryParams = "required-error, info required";
        }

        if (crudParams.queryParams) {
            // Check input formats/patterns: object or array
            const testObject = utils.isObjectType(crudParams.queryParams);
            if (!testObject) {
                errors.queryParams = "format-error, should be an object{}";
            }
        }

        if (crudParams.existParams) {
            // Check input formats/patterns
            const testItem = utils.isArrayType(crudParams.existParams);
            if (!testItem) {
                errors.existParams = "format-error, should be an array[]";
            }
        } else {
            errors.existParams = "required-error, info is required";
        }

        if (crudParams.token) {
            // Check input formats/patterns
            const testItem = utils.isStringAlpha(crudParams.token);
            if (!testItem) {
                errors.token = "format-error, should be a string/alphanumeric";
            }
        }

        if (crudParams.userInfo) {
            // Check input formats/patterns
            const testItem = utils.isObjectType(crudParams.userInfo);
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
        if (crudParams.coll) {
            // Check input formats/patterns
            const testItem = utils.isStringAlpha(crudParams.coll);
            if (!testItem) {
                errors.coll = "format-error, should be a string/alphanumeric";
            }
        } else {
            errors.coll = "required-error, info is required";
        }

        if (crudParams.queryParams) {
            // Check input formats/patterns
            const testItem = utils.isObjectType(crudParams.queryParams);
            if (!testItem) {
                errors.queryParams = "format-error, should be an object{}";
            }
        }

        if (crudParams.docIds) {
            // Check input formats/patterns
            const testItem = utils.isArrayType(crudParams.docIds);
            if (!testItem) {
                errors.docIds = "format-error, should be an array[]";
            }
        }

        if ((!crudParams.docIds || crudParams.docIds.length < 1) && (!crudParams.queryParams || isEmptyObject(crudParams.queryParams))) {
            errors.docIds = errors.docIds ? errors.docIds + " | docId or queryParams is required" : "docId or queryParams is required";
            errors.queryParams = errors.queryParams ? errors.queryParams + " | docId or queryParams is required" : "docId or queryParams is required";
        }

        if (crudParams.token) {
            // Check input formats/patterns
            const testItem = utils.isStringAlpha(crudParams.token);
            if (!testItem) {
                errors.token = "format-error, should a string/alphanumeric";
            }
        }

        if (crudParams.userInfo) {
            // Check input formats/patterns
            const testItem = utils.isObjectType(crudParams.userInfo);
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
        if (crudParams.coll) {
            // Check input formats/patterns
            const testItem = utils.isStringAlpha(crudParams.coll);
            if (!testItem) {
                errors.coll = "format-error, collection name should be a string";
            }
        } else {
            errors.coll = "required-error, info is required";
        }

        if (crudParams.queryParams) {
            // Check input formats/patterns
            const testItem = utils.isObjectType(crudParams.queryParams);
            if (!testItem) {
                errors.queryParams = "format-error, queryParams should be an object";
            }
        }

        if (crudParams.projectParams) {
            // Check input formats/patterns
            const testItem = utils.isObjectType(crudParams.projectParams);
            if (!testItem) {
                errors.projectParams = "format-error, projectParams should be an object";
            }
        }

        if (crudParams.sortParams) {
            // Check input formats/patterns
            const testItem = utils.isObjectType(crudParams.sortParams);
            if (!testItem) {
                errors.sortParams = "format-error, sortParams should be an object";
            }
        }

        if (crudParams.docIds) {
            // Check input formats/patterns
            const testItem = utils.isArrayType(crudParams.docIds);
            if (!testItem) {
                errors.docId = "format-error, docId(s) should be an array";
            }
        }

        if (crudParams.token) {
            // Check input formats/patterns
            const testItem = utils.isStringAlpha(crudParams.token);
            if (!testItem) {
                errors.token = "format-error, token should be a string/alphanumeric";
            }
        }

        if (crudParams.userInfo) {
            // Check input formats/patterns
            const testItem = utils.isObjectType(crudParams.userInfo);
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
        if (crudParams.coll) {
            // Check input formats/patterns
            const testItem = utils.isStringAlpha(crudParams.coll);
            if (!testItem) {
                errors.coll = 'format-error, collection name should be a string/alphanumeric';
            }
        } else {
            errors.coll = 'required-error, info is required';
        }

        if (crudParams.actionParams) {
            // Check input formats/patterns
            const testItem = utils.isArrayType(crudParams.actionParams);
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
