/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-12-28
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mongodb-orm helper functions
 */

import { DataTypes, FieldDescType, ModelDescType, ValueParamsType } from "./types";
import { ActionParamsType, FieldValueTypes, ObjectType } from "../crud";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";

export function isEmptyObject(val: ObjectType): boolean {
    return !(Object.keys(val).length > 0 && Object.values(val).length > 0);
}

// validateActionParams validates actParams for save (create or update) operation
export function validateActionParams(actParams: ActionParamsType = []): ResponseMessage {
    // validate req-params: actionParams must be array or 1 or more item(s)
    if (actParams.length < 1) {
        return getResMessage('validateError', {
            message: "actionParams(record-inputs) must be an array of object values [ActionParamsType].",
        });
    }
    return getResMessage("success")
}

// camelToUnderscore converts camelCase key/field to underscore key/field for SQL database tables
export function camelToUnderscore(key: string): string {
    return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export function jsonToCrudSaveParams(model: ModelDescType, docValue: ValueParamsType): ValueParamsType {
    try {
        let result: ValueParamsType = {};

        // for each field-item in docValue, validate against corresponding model field-desc =>
        // => by fieldType, defaultValue, fieldPattern?/validateMethod?(handle by model/task validation)

        for (const [name, desc] of Object.entries(model.docDesc)) {
            switch (desc) {
                case desc as DataTypes:
                    result = dataTypesETL(desc, docValue);
                    break;
                case desc as FieldDescType:
                    result = fieldDescTypeETL(desc, docValue);
                    desc.fieldType
                    break;
                default:
                    // result[name] = docValue[name];
                    throw new Error(`No model matching type found for ${name}: ${docValue[name]}`)
            }

            // compute save params
        }
        return result;

    } catch (e) {
        throw new Error("Error computing record(s): " + e.message);
    }
}

export function dataTypesETL(desc: DataTypes, docValue: ValueParamsType): ValueParamsType {
    let result: ValueParamsType = {};

    return result;

}

export function fieldDescTypeETL(desc: FieldDescType, docValue: ValueParamsType): ValueParamsType {
    let result: ValueParamsType = {};

    return result;
}
