import { ActionParamsType, ActionParamType, CrudParamsType, ObjectRefType, TaskTypes } from "..";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";


// isEmptyObject validates is an object contains no keys and/or values
export function isEmptyObject(val: ObjectRefType): boolean {
    return !(Object.keys(val).length > 0 && Object.values(val).length > 0);
}

export function checkTaskTypeV1(params: CrudParamsType): string {
    let taskType = TaskTypes.UNKNOWN
    if (params.actionParams && params.actionParams.length > 0) {
        const actParam = params.actionParams[0]
        const recId = actParam["_id"] || actParam["id"]
        if (!recId || recId === "") {
            if (params.actionParams.length === 1 && (params.recordIds && params.recordIds?.length > 0) || params.queryParams && !isEmptyObject(params.queryParams)) {
                taskType = TaskTypes.UPDATE
            } else {
                taskType = TaskTypes.CREATE
            }
        } else {
            taskType = TaskTypes.UPDATE
        }
    }
    return taskType
}

export function checkTaskType(params: CrudParamsType): string {
    if (!params.actionParams || params.actionParams.length < 1) {
        return TaskTypes.UNKNOWN
    }
    // check task-types for actionParams === 1 or > 1
    if (params.actionParams.length === 1) {
        const actParam = params.actionParams[0]
        const recId = actParam["_id"] || actParam["id"]
        if (!recId || recId === "") {
            if (params.recordIds && params.recordIds?.length > 0 || params.queryParams && !isEmptyObject(params.queryParams)) {
                return TaskTypes.UPDATE
            } else {
                return TaskTypes.CREATE
            }
        } else {
            return TaskTypes.UPDATE
        }
    }
    if (params.actionParams.length > 1) {
        let updateCount = 0
        let createCount = 0
        for (const rec of params.actionParams) {
            const recId = rec["_id"] || rec["id"]
            if (!recId || recId === "") {
                createCount += 1
            } else {
                updateCount += 1
            }
        }
        // determine task-type
        if (updateCount > 0 && createCount > 0) {
            return TaskTypes.UNKNOWN
        }
        if (createCount > 0) {
            return TaskTypes.CREATE
        }
        if (updateCount > 0) {
            return TaskTypes.UPDATE
        }
    }

    return TaskTypes.UNKNOWN
}

export function validateActionParams(actParams: ActionParamsType = []): ResponseMessage {
    // validate req-params: actionParams must be an array or 1 or more item(s)
    if (actParams.length < 1) {
        return getResMessage('validateError', {
            message: "actionParams(record-inputs) must be an array of object values [ActionParamsType].",
        });
    }
    return getResMessage("success")
}

export function shortString(str: string, maxLength = 20): string {
    return str.toString().length > maxLength ? str.toString().substring(0, maxLength) + "..." : str.toString();
}

export function strToBool(val: string | number = "n"): boolean {
    const strVal = val.toString().toLowerCase();
    if (strVal === "true" || strVal === "t" || strVal === "yes" || strVal === "y") {
        return true;
    } else {
        return Number(strVal) > 0;
    }
}

export function camelToUnderscore(key: string): string {
    return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export const toCamelCase = (text: string, sep = '_'): string => {
    // accepts word/text and separator(' ', '_', '__', '.')
    const textArray = text.split(sep);
    // convert the first word to lowercase
    const firstWord = textArray[0].toLowerCase();
    // convert other words: first letter to upper case and other letters to lowercase
    const otherWords = textArray.slice(1,).map(item => {
        // convert first letter to upper case
        const item0 = item[0].toUpperCase();
        // convert other letters to lowercase
        const item1N = item.slice(1,).toLowerCase();
        return `${item0}${item1N}`;
    });
    return `${firstWord}${otherWords.join('')}`;
}

export const excludeEmptyIdFields = (recs: Array<ActionParamType>): Array<ActionParamType> => {
    let actParams: Array<ActionParamType> = []
    for (const rec of recs) {
        let actParam: ActionParamType = {}
        for (const [key, value] of Object.entries(rec)) {
            if ((key === "id" || key.endsWith("Id")) && (!value || value === "")) {
                continue
            }
            actParam[key] = value
        }
        actParams.push(actParam)
    }
    return actParams
}
