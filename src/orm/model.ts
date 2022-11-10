/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-25
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mongodb mc-orm model specifications and validation
 */

import validator from "validator";
import { getParamsMessage, getResMessage, MessageObject, ResponseMessage } from "@mconnect/mcresponse";
import { ObjectId } from "mongodb";
import {
    ComputedMethodsType,
    DataTypes,
    DefaultValueType,
    DocDescType,
    FieldDescType,
    ModelCrudOptionsType,
    ModelDescType,
    ModelOptionsType,
    ModelRelationType,
    UniqueFieldsType,
    ValidateMethodResponseType,
    ValidateResponseType,
    ValueToDataTypes,
} from "./types";
import {
    ActionParamsType,
    ActionParamType,
    CrudOptionsType,
    CrudParamsType,
    ExistParamsType,
    newDeleteRecord,
    newGetRecord,
    newGetRecordStream,
    newSaveRecord,
    TaskTypes,
    UserInfoType,
} from "../crud";
import {isEmptyObject} from "./helpers";

export class Model {
    private readonly collName: string;
    private readonly docDesc: DocDescType;
    private readonly timeStamp: boolean;
    private readonly actorStamp: boolean;
    private readonly activeStamp: boolean;
    private readonly relations: Array<ModelRelationType>;
    protected readonly uniqueFields: UniqueFieldsType;
    protected readonly primaryFields: Array<string>;
    protected requiredFields: Array<string>;
    private readonly computedMethods: ComputedMethodsType;
    private readonly validateMethod?: ValidateMethodResponseType;
    private readonly alterSyncColl: boolean;
    protected taskType: string;
    protected readonly validateKey: string;
    protected modelOptions: ModelOptionsType;
    protected checkAccess: boolean;

    constructor(model: ModelDescType, options: ModelCrudOptionsType = {}) {
        this.collName = model.collName || "";
        this.docDesc = model.docDesc || {};
        this.timeStamp = model.timeStamp || true;
        this.actorStamp = model.actorStamp || true;
        this.activeStamp = model.activeStamp || true;
        this.computedMethods = model.computedMethods || {};
        this.validateMethod = model.validateMethod? model.validateMethod : undefined;
        this.alterSyncColl = model.alterSyncColl || false;
        this.taskType = "";
        this.validateKey = "";
        this.relations = options.relations || [];
        this.uniqueFields = options.uniqueFields || [];
        this.primaryFields = options.primaryFields || [];
        this.requiredFields = options.requiredFields || [];
        this.modelOptions = {
            timeStamp  : this.timeStamp || options.timeStamp ? options.timeStamp : true,
            actorStamp : this.actorStamp || options.actorStamp ? options.actorStamp : true,
            activeStamp: this.activeStamp || options.activeStamp ? options.activeStamp : true,
        };
        this.checkAccess = true;
    }

    // ***** instance methods: getters | setters *****
    get modelCollName(): string {
        return this.collName;
    }

    get modelDocDesc(): DocDescType {
        return this.docDesc;
    }

    get modelOptionValues(): ModelOptionsType {
        return this.modelOptions;
    }

    get modelUniqueFields(): UniqueFieldsType {
        return this.uniqueFields
    }

    get modelRelations(): Array<ModelRelationType> {
        return this.relations;
    }

    get modelComputedMethods(): ComputedMethodsType {
        return this.computedMethods;
    }

    get modelValidateMethod(): ValidateMethodResponseType {
        return this.validateMethod;
    }

    get modelAlterSyncColl(): boolean {
        return this.alterSyncColl;
    }

    // instance methods
    getParentRelations(): Array<ModelRelationType> {
        // extract relations/collections where targetColl === this.collName
        // sourceColl is the parentColl of this.collName(target/child)
        let parentRelations: Array<ModelRelationType> = [];
        if (this.modelRelations.length <= 0) {
            return parentRelations;
        }
        for (const item of this.modelRelations) {
            if (item.targetColl === this.modelCollName) {
                parentRelations.push(item);
            }
        }
        return parentRelations;
    }

    getChildRelations(): Array<ModelRelationType> {
        // extract relations/collections where sourceColl === this.collName
        // targetColl is the childColl of this.collName(source/parent)
        let childRelations: Array<ModelRelationType> = [];
        if (this.modelRelations.length <= 0) {
            return childRelations;
        }
        for (const item of this.modelRelations) {
            if (item.sourceColl === this.modelCollName) {
                childRelations.push(item);
            }
        }
        return childRelations;
    }

    getParentColls(): Array<string> {
        let parentColls: Array<string>;
        const parentRelations = this.getParentRelations();
        parentColls = parentRelations.map(rel => rel.sourceColl);
        return parentColls;
    }

    getChildColls(): Array<string> {
        let childColls: Array<string>;
        const childRelations = this.getChildRelations();
        childColls = childRelations.map(rel => rel.targetColl);
        return childColls;
    }

    computeExistParams(actionParams: ActionParamsType): ExistParamsType {
        // set the existParams for create or update action to determine record(s) uniqueness
        let existParams: ExistParamsType = [];
        actionParams.forEach((item) => {
            this.modelUniqueFields.forEach(fields => {
                // compute the uniqueness object
                let uniqueObj: any = {};
                fields.forEach(field => {
                    uniqueObj[field] = item[field]
                })
                if (item._id || item["_id"]) {
                    // add profile uniqueness object to the existParams
                    const idValue = new ObjectId((item._id || item["_id"]) as string)
                    existParams.push({
                        _id: {
                            $ne: idValue,
                        },
                        ...uniqueObj,
                    });
                } else {
                    existParams.push({
                        ...uniqueObj,
                    });
                }
            })
        });
        return existParams;
    }

    computeRequiredFields(): Array<string> {
        let requiredFields: Array<string> = [];
        for (let [field, fieldDesc] of Object.entries(this.modelDocDesc)) {
            switch (typeof fieldDesc) {
                case "object":
                    fieldDesc = fieldDesc as FieldDescType;
                    if (!fieldDesc.allowNull) {
                        requiredFields.push(field);
                    }
                    break;
                default:
                    break;
            }
        }
        this.requiredFields = requiredFields;
        return requiredFields;
    }

    // ***** helper methods *****
    computeDocValueType(docValue: ActionParamType): ValueToDataTypes {
        let computedTypes: ValueToDataTypes = {};
        try {
            for (const [key, val] of Object.entries(docValue)) {
                // const val: any = docValue[key];
                if (Array.isArray(val)) {
                    if (val.every((item: any) => typeof item === "number")) {
                        computedTypes[key] = DataTypes.ARRAY_NUMBER;
                    } else if (val.every((item: any) => typeof item === "string")) {
                        computedTypes[key] = DataTypes.ARRAY_STRING;
                    } else if (val.every((item: any) => typeof item === "boolean")) {
                        computedTypes[key] = DataTypes.ARRAY_BOOLEAN;
                    } else if (val.every((item: any) => typeof item === "object")) {
                        computedTypes[key] = DataTypes.ARRAY_OBJECT;
                    } else {
                        computedTypes[key] = DataTypes.ARRAY;
                    }
                } else if (typeof val === "object") {
                    computedTypes[key] = DataTypes.OBJECT;
                } else if (typeof val === "string") {
                    // check all base string formats
                    if (validator.isDate(val)) {
                        computedTypes[key] = DataTypes.DATETIME;
                    } else if (validator.isEmail(val)) {
                        computedTypes[key] = DataTypes.EMAIL;
                    } else if (validator.isMongoId(val)) {
                        computedTypes[key] = DataTypes.MONGODB_ID;
                    } else if (validator.isUUID(val)) {
                        computedTypes[key] = DataTypes.UUID;
                    } else if (validator.isJSON(val)) {
                        computedTypes[key] = DataTypes.JSON;
                    } else if (validator.isCreditCard(val)) {
                        computedTypes[key] = DataTypes.CREDIT_CARD;
                    } else if (validator.isCurrency(val)) {
                        computedTypes[key] = DataTypes.CURRENCY;
                    } else if (validator.isURL(val)) {
                        computedTypes[key] = DataTypes.URL;
                    } else if (validator.isPort(val)) {
                        computedTypes[key] = DataTypes.PORT;
                    } else if (validator.isIP(val)) {
                        computedTypes[key] = DataTypes.IP;
                    } else if (validator.isMimeType(val)) {
                        computedTypes[key] = DataTypes.MIME;
                    } else if (validator.isMACAddress(val)) {
                        computedTypes[key] = DataTypes.MAC_ADDRESS;
                    } else if (validator.isJWT(val)) {
                        computedTypes[key] = DataTypes.JWT;
                    } else if (validator.isLatLong(val)) {
                        computedTypes[key] = DataTypes.LAT_LONG;
                    } else if (validator.isISO31661Alpha2(val)) {
                        computedTypes[key] = DataTypes.ISO2;
                    } else if (validator.isISO31661Alpha3(val)) {
                        computedTypes[key] = DataTypes.ISO3;
                    } else if (validator.isPostalCode(val, "any")) {
                        computedTypes[key] = DataTypes.POSTAL_CODE;
                    } else {
                        computedTypes[key] = DataTypes.STRING;
                    }
                } else if (typeof val === "number") {
                    if (validator.isDecimal(val.toString())) {
                        computedTypes[key] = DataTypes.DECIMAL;
                    } else if (validator.isFloat(val.toString())) {
                        computedTypes[key] = DataTypes.FLOAT;
                    } else if (validator.isInt(val.toString())) {
                        computedTypes[key] = DataTypes.INTEGER;
                    } else {
                        computedTypes[key] = DataTypes.NUMBER;
                    }
                } else if (typeof val === "boolean") {
                    computedTypes[key] = DataTypes.BOOLEAN;
                } else {
                    computedTypes[key] = DataTypes.UNKNOWN;
                }
            }
            return computedTypes;
        } catch (e) {
            console.error(e);
            throw new Error("Error computing docValue types: " + e.message);
        }
    }

    async setDefaultValues(docValue: ActionParamType): Promise<ActionParamType> {
        // set default values, for null fields | then setValue (transform), if specified
        try {
            // set base docValue
            const setDocValue = docValue;
            // perform defaultValue task
            for (const [key, val] of Object.entries(docValue)) {
                // defaultValue setting applies to FieldDescType only | otherwise, the value is null (by default, i.e. allowNull=>true)
                let docFieldDesc = this.modelDocDesc[key];
                const docFieldValue = val || null;
                // set default values for null field only
                if (!docFieldValue) {
                    switch (typeof docFieldDesc) {
                        case "object":
                            docFieldDesc = docFieldDesc as FieldDescType;
                            let defaultValue = docFieldDesc?.defaultValue ? docFieldDesc.defaultValue : null;
                            // console.log("doc-default-value: ", defaultValue)
                            // type of defaultValue and docFieldValue must be equivalent (re: validateMethod)
                            if (defaultValue) {
                                switch (typeof defaultValue) {
                                    // defaultValue may be of types: FieldValueTypes or DefaultValueType
                                    case "string":
                                    case "number":
                                    case "boolean":
                                    case "object":
                                        // defaultValue = defaultValue as FieldValueTypes
                                        setDocValue[key] = defaultValue;
                                        break;
                                    case "function":
                                        defaultValue = defaultValue as DefaultValueType;
                                        if (typeof defaultValue === "function") {
                                            setDocValue[key] = await defaultValue(docValue[key]);
                                        }
                                        break;
                                    default:
                                        break;
                                }
                            }
                            break;
                        default:
                            break;
                    }
                }
                // setValue / transform field-value prior-to/before save-task (create / update)
                switch (typeof docFieldDesc) {
                    case "object":
                        docFieldDesc = docFieldDesc as FieldDescType;
                        const fieldValue = setDocValue[key];    // set applies to existing field-value only
                        if (fieldValue && docFieldDesc.setValue) {
                            setDocValue[key] = await docFieldDesc.setValue(fieldValue);
                        }
                        break;
                    default:
                        break;
                }
            }
            return setDocValue;
        } catch (e) {
            console.log("default-error: ", e);
            throw new Error(e.message);
        }
    }

    async validateDocValue(docValue: ActionParamType, docValueTypes: ValueToDataTypes): Promise<ValidateResponseType> {
        // validate model-docValue by model definition (this.modelDocDesc)
        try {
            // use values from transform docValue, including default/set-values, prior to validation
            // model-description/definition
            const docDesc = this.modelDocDesc;
            // combine errors/messages
            let errors: MessageObject = {};
            // perform model-defined docValue validation
            for (const [key, val] of Object.entries(docValue)) {
                let fieldDesc = docDesc[key] || null;
                const fieldValue = val || null
                // check field description / definition
                if (!fieldDesc) {
                    errors[key] = `Invalid field: ${key} is not defined in the model`;
                    continue;
                }
                switch (typeof fieldDesc) {
                    case "string":
                        // validate field-value-type
                        // console.log("field-desc-1: ", fieldDesc)
                        if (fieldValue && docValueTypes[key] !== fieldDesc) {
                            errors[key] = `Invalid type for: ${key}. Expected ${fieldDesc}. Got ${docValueTypes[key]}.`;
                        }
                        break;
                    case "object":
                        // validate field-value-type,
                        fieldDesc = fieldDesc as FieldDescType;
                        // console.log("field-desc-2: ", fieldDesc.fieldType)
                        if (fieldValue && docValueTypes[key] !== fieldDesc.fieldType) {
                            errors[key] = fieldDesc.validateMessage ? fieldDesc.validateMessage :
                                `Invalid Type for: ${key}. Expected ${fieldDesc.fieldType}, Got ${docValueTypes[key]}`;
                        }
                        // validate allowNull, fieldLength, min/maxValues and pattern matching
                        // null-validation
                        if (!fieldValue && !fieldDesc.allowNull) {
                            errors[`${key}-nullValidation`] = fieldDesc.validateMessage ?
                                fieldDesc.validateMessage + ` | Value is required for: ${key}.}` :
                                `Value is required for: ${key}.}`;
                        }
                        // fieldLength-validation
                        if (fieldValue && docValueTypes[key] === DataTypes.STRING && fieldDesc.fieldLength) {
                            const fieldLength = (fieldValue as string).length;
                            if (fieldLength > fieldDesc.fieldLength) {
                                errors[`${key}-lengthValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Size of ${key} cannot be longer than ${fieldDesc.fieldLength}` :
                                    `Size of ${key} cannot be longer than ${fieldDesc.fieldLength}`;
                            }
                        }
                        // min/maxValues-validation for numbers
                        if (fieldValue && (docValueTypes[key] === DataTypes.NUMBER || docValueTypes[key] === DataTypes.INTEGER ||
                            docValueTypes[key] === DataTypes.FLOAT || docValueTypes[key] === DataTypes.BIGFLOAT ||
                            docValueTypes[key] === DataTypes.DECIMAL)) {
                            // number value for comparison
                            const numFieldValue = Number(fieldValue);
                            if (fieldDesc.minValue && fieldDesc.maxValue) {
                                const numMinValue = Number(fieldDesc.minValue);
                                const numMaxValue = Number(fieldDesc.maxValue);
                                if (numFieldValue < numMinValue || numFieldValue > numMaxValue) {
                                    errors[`${key}-minMaxValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} must be greater than ${numMinValue}, and less than ${numMaxValue}` :
                                        `Value of: ${key} must be greater than ${numMinValue}, and less than ${numMaxValue}`;
                                }
                            } else if (fieldDesc.minValue) {
                                const numMinValue = Number(fieldDesc.minValue);
                                if (numFieldValue < numMinValue) {
                                    errors[`${key}-minMaxValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} cannot be less than ${numMinValue}.` :
                                        `Value of: ${key} cannot be less than ${numMinValue}.`;
                                }
                            } else if (fieldDesc.maxValue) {
                                const numMaxValue = Number(fieldDesc.maxValue);
                                if (numFieldValue > numMaxValue) {
                                    errors[`${key}-minMaxValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} cannot be greater than ${numMaxValue}.` :
                                        `Value of: ${key} cannot be greater than ${numMaxValue}.`;
                                }
                            }
                        } else if (fieldValue && (docValueTypes[key] === DataTypes.STRING || docValueTypes[key] === DataTypes.DATETIME)) {
                            // date value for comparison
                            const dateFieldValue = new Date(fieldValue as string);
                            if (fieldDesc.minValue && fieldDesc.maxValue) {
                                const dateMinValue = new Date(fieldDesc.minValue);
                                const dateMaxValue = new Date(fieldDesc.maxValue);
                                if ((dateFieldValue < dateMinValue || dateFieldValue > dateMaxValue)) {
                                    errors[`${key}-minMaxValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} must be greater than ${dateMinValue}, and less than ${dateMaxValue}` :
                                        `Value of: ${key} must be greater than ${dateMinValue}, and less than ${dateMaxValue}`;
                                }
                            } else if (fieldDesc.minValue) {
                                const dateMinValue = new Date(fieldDesc.minValue);
                                if (dateFieldValue < dateMinValue) {
                                    errors[`${key}-minMaxValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} cannot be less than ${dateMinValue}.` :
                                        `Value of: ${key} cannot be less than ${dateMinValue}.`;
                                }
                            } else if (fieldDesc.maxValue) {
                                const dateMaxValue = new Date(fieldDesc.maxValue);
                                if (dateFieldValue > dateMaxValue) {
                                    errors[`${key}-minMaxValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} cannot be greater than ${dateMaxValue}.` :
                                        `Value of: ${key} cannot be greater than ${dateMaxValue}.`;
                                }
                            }
                        }
                        // pattern matching validation
                        if (fieldValue && fieldDesc.fieldPattern) {
                            const testPattern = (fieldDesc.fieldPattern as unknown as RegExp).test(fieldValue as string);
                            if (!testPattern) {
                                errors[`${key}-patternMatchValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} did not match the pattern ${fieldDesc.fieldPattern}.` :
                                    `Value of: ${key} did not match the pattern ${fieldDesc.fieldPattern}.`;
                            }
                        }
                        // TODO: starts/ends-with, include/exclude,
                        break;
                    default:
                        errors[key] = `Unknown field: ${key} value is not a supported type`;
                        break;
                }
            }

            // check validateErrors
            if (Object.keys(errors).length > 0) {
                return {
                    ok    : false,
                    errors: errors,
                }
            }

            // perform user-defined docValue validation
            // get validate method for the docValue by taskType or taskName
            const modelValidateMethod = this.modelValidateMethod;
            if (modelValidateMethod) {
                const valRes = modelValidateMethod(docValue);
                if (!valRes.ok || (valRes.errors && !isEmptyObject(valRes.errors))) {
                    return valRes
                }
            }
            // return success
            return {ok: true, errors: {}};
        } catch (e) {
            // throw new Error(e.message);
            return {ok: true, errors: e};
        }
    }

    // ***** crud operations / methods : interface to the CRUD modules *****

    async save(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage> {
        try {
            // model specific params
            params.coll = this.modelCollName;
            params.docDesc = this.modelDocDesc;
            this.taskType = TaskTypes.UNKNOWN;
            // set checkAccess status for crud-task-permission control
            options.checkAccess = typeof options.checkAccess !== "undefined" ? options.checkAccess : true;
            this.checkAccess = options.checkAccess;
            // validate task/action-params
            if (!params.actionParams || params.actionParams.length < 1) {
                return getResMessage('validateError', {
                    message: "actionParams(record-inputs) must be an array of object values [ActionParamsType].",
                });
            }
            // get docValue transformed types | one iteration only for actionParams[0]
            const docValueTypes = this.computeDocValueType(params.actionParams[0]);
            // validate actionParams (docValues), prior to saving, via this.validateDocValue
            let actParams: ActionParamsType = []
            for (const docValue of params.actionParams) {
                // set defaultValues, prior to save
                const modelDocValue = await this.setDefaultValues(docValue);
                // console.log("model-doc-value: ", modelDocValue)
                // validate actionParam-item (docValue) field-values
                const validateRes = await this.validateDocValue(modelDocValue, docValueTypes);
                // console.log("validate-res: ", validateRes)
                if (!validateRes.ok || !isEmptyObject(validateRes.errors)) {
                    return getParamsMessage(validateRes.errors as MessageObject);
                }
                // update actParams
                actParams.push(modelDocValue)
            }
            // update CRUD params and options
            params.actionParams = actParams
            // update unique-fields
            params.existParams = this.computeExistParams(params.actionParams);
            // console.log("exist-params: ", params.existParams)
            options = {
                ...options, ...this.modelOptionValues,
            };
            // determine / set taskType (CREATE/INSERT or UPDATE) | permission (if checkAccess: true)
            // determine taskType - create or update (not both):
            let docIds: Array<string> = [];
            for (const rec of params.actionParams) {
                if (rec["_id"]) {
                    docIds.push(rec["_id"] as string);
                }
            }
            if (docIds.length === params.actionParams.length) {
                params.taskType = TaskTypes.UPDATE;
                params.docIds = docIds;
                this.taskType = params.taskType;
            } else if (params.actionParams.length === 1 &&
                ((params.docIds && params.docIds.length > 0) ||
                    (params.queryParams && !isEmptyObject(params.queryParams)))) {
                params.taskType = TaskTypes.UPDATE;
                this.taskType = params.taskType;
            } else if (docIds.length === 0 && params.actionParams.length > 0 ) {
                params.taskType = TaskTypes.CREATE;
                this.taskType = params.taskType;
            } else {
                return getResMessage('saveError', {
                    message: "Only Create or Update tasks, not both, may be performed exclusively",
                });
            }
            // instantiate CRUD-save class & perform save-crud task (create or update)
            const crud = newSaveRecord(params, options);

            // check access permission
            let loginStatusRes = getResMessage("unknown");
            if (this.checkAccess) {
                loginStatusRes = await crud.checkLoginStatus();
                if (loginStatusRes.code !== "success") {
                    return loginStatusRes;
                }
            }

            let accessRes: ResponseMessage;
            if (this.checkAccess && !loginStatusRes.value.isAdmin) {
                if (params.taskType === TaskTypes.UPDATE) {
                    if (params.docIds!.length > 0) {
                        accessRes = await crud.taskPermissionById(params.taskType);
                        if (accessRes.code !== "success") {
                            return accessRes;
                        }
                    } else if (params.queryParams && !isEmptyObject(params.queryParams)) {
                        accessRes = await crud.taskPermissionByParams(params.taskType);
                        if (accessRes.code !== "success") {
                            return accessRes;
                        }
                    } else {
                        return getResMessage("updateError", {
                            message: "Restricted records may only be updated by ids or queryParams (owner), or by admin-role only",
                        });
                    }
                }
                if (params.taskType === TaskTypes.CREATE) {
                    // required table create-access for non-admin user
                    accessRes = await crud.checkTaskAccess(params.userInfo as UserInfoType);
                    if (accessRes.code !== "success") {
                        return accessRes;
                    }
                }
            }
            return await crud.saveRecord();
        } catch (e) {
            console.error(e);
            return getResMessage("saveError", {message: e.message});
        }
    }

    async get(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage> {
        try {
            // model specific params
            params.coll = this.modelCollName;
            params.docDesc = this.modelDocDesc;
            params.taskType = params.taskType || TaskTypes.READ;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = typeof options.checkAccess !== "undefined" ? options.checkAccess : true;
            this.checkAccess = options.checkAccess;
            // console.log("check-access: ", options.checkAccess);
            const crud = newGetRecord(params, options);
            // check access permission
            let loginStatusRes: ResponseMessage = getResMessage("unknown");
            if (this.checkAccess) {
                loginStatusRes = await crud.checkLoginStatus();
                if (loginStatusRes.code !== "success") {
                    return loginStatusRes;
                }
            }
            let accessRes: ResponseMessage;
            // loginStatusRes.value.isAdmin
            if (this.checkAccess && !loginStatusRes.value.isAdmin) {
                if (params.docIds && params.docIds.length > 0) {
                    accessRes = await crud.taskPermissionById(params.taskType);
                    if (accessRes.code !== "success") {
                        return accessRes;
                    }
                } else if (params.queryParams && !isEmptyObject(params.queryParams)) {
                    accessRes = await crud.taskPermissionByParams(params.taskType);
                    if (accessRes.code !== "success") {
                        return accessRes;
                    }
                } else {
                    return getResMessage("unAuthorized", {
                        message: "Restricted records may only be read by ids or queryParams (owner), or by admin-role only",
                    });
                }
            }
            return await crud.getRecord();
        } catch (e) {
            console.error(e);
            return getResMessage("readError");
        }
    }

    async getStream(params: CrudParamsType, options: CrudOptionsType = {}): Promise<AsyncIterable<Document>> {
        // get stream of document(s), returning a cursor or error
        try {
            // model specific params
            params.coll = this.modelCollName;
            params.docDesc = this.modelDocDesc;
            params.taskType = params.taskType || TaskTypes.READ;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = typeof options.checkAccess !== "undefined" ? options.checkAccess : true;
            this.checkAccess = options.checkAccess;
            const crud = newGetRecordStream(params, options);
            // check access permission
            let loginStatusRes: ResponseMessage = getResMessage("unknown");
            if (this.checkAccess) {
                loginStatusRes = await crud.checkLoginStatus();
                if (loginStatusRes.code !== "success") {
                    throw new Error(`${loginStatusRes.code}: ${loginStatusRes.message}`);
                }
            }
            let accessRes: ResponseMessage;
            if (this.checkAccess && !loginStatusRes.value.isAdmin) {
                if (params.docIds && params.docIds.length > 0) {
                    accessRes = await crud.taskPermissionById(params.taskType);
                    if (accessRes.code !== "success") {
                        throw new Error(`${accessRes.code}: ${accessRes.message}`);
                    }
                } else if (params.queryParams && !isEmptyObject(params.queryParams)) {
                    accessRes = await crud.taskPermissionByParams(params.taskType);
                    if (accessRes.code !== "success") {
                        throw new Error(`${accessRes.code}: ${accessRes.message}`);
                    }
                } else {
                    const accessRes = getResMessage("unAuthorized", {
                        message: "Restricted records may only be read by ids or queryParams (owner), or by admin-role only",
                    });
                    throw new Error(`${accessRes.code}: ${accessRes.message}`);
                }
            }
            return await crud.getRecordStream();
        } catch (e) {
            console.error(e);
            throw new Error(`notFound: ${e.message}`);
        }
    }

    async gets(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage> {
        // TODO: get composite/aggregate docs based on queryParams and model-relations definition
        try {
            // model specific params
            params.coll = this.modelCollName;
            params.docDesc = this.modelDocDesc;
            params.taskType = TaskTypes.READ;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = typeof options.checkAccess !== "undefined" ? options.checkAccess : true;
            this.checkAccess = options.checkAccess;
            const crud = newGetRecord(params, options);
            return await crud.getRecord();
        } catch (e) {
            console.error(e);
            return getResMessage("readError");
        }
    }

    async lookup(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage> {
        // get lookup documents based on queryParams and model-relations definition
        try {
            // model specific params
            params.coll = this.modelCollName;
            params.docDesc = this.modelDocDesc;
            params.taskType = params.taskType || TaskTypes.READ;
            this.taskType = params.taskType;
            // set access
            options.checkAccess = typeof options.checkAccess !== "undefined" ? options.checkAccess : true;
            this.checkAccess = options.checkAccess;
            const crud = newGetRecord(params, options);
            return await crud.getRecord();
        } catch (e) {
            console.error(e);
            return getResMessage("readError", {message: "Document(s) lookup fetch-error. "});
        }
    }

    async delete(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage> {
        // validate queryParams based on model/docDesc
        try {
            // model specific params
            params.coll = this.modelCollName;
            params.docDesc = this.modelDocDesc;
            params.taskType = TaskTypes.DELETE;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = typeof options.checkAccess !== "undefined" ? options.checkAccess : true;
            this.checkAccess = options.checkAccess;
            // update options
            options = {
                ...options, ...{
                    parentColls    : this.getParentColls(),
                    childColls     : this.getChildColls(),
                    parentRelations: this.getParentRelations(),
                    childRelations : this.getChildRelations(),
                }
            }
            const crud = newDeleteRecord(params, options);
            // check access permission
            let loginStatusRes: ResponseMessage = getResMessage("unknown");
            if (this.checkAccess) {
                loginStatusRes = await crud.checkLoginStatus();
                if (loginStatusRes.code !== "success") {
                    return loginStatusRes;
                }
            }
            let accessRes: ResponseMessage;
            if (this.checkAccess && !loginStatusRes.value.isAdmin) {
                if (params.docIds && params.docIds.length > 0) {
                    accessRes = await crud.taskPermissionById(params.taskType);
                    if (accessRes.code !== "success") {
                        return accessRes;
                    }
                } else if (params.queryParams && !isEmptyObject(params.queryParams)) {
                    accessRes = await crud.taskPermissionByParams(params.taskType);
                    if (accessRes.code !== "success") {
                        return accessRes;
                    }
                } else {
                    return getResMessage("deleteError", {
                        message: "Restricted records may only be deleted by ids or queryParams (owner), or by admin-role only",
                    });
                }
            }
            return await crud.deleteRecord();
        } catch (e) {
            console.error(e);
            return getResMessage("deleteError");
        }
    }
}

// factory function
export function newModel(model: ModelDescType, options: ModelCrudOptionsType = {}) {
    return new Model(model, options);
}
