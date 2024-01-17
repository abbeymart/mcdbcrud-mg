/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-25 | @Updated: 2024-01-07
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mongodb mc-orm model specifications and validation
 */

import validator from "validator";
import { getParamsMessage, getResMessage, MessageObject, ResponseMessage } from "@mconnect/mcresponse";
import {
    ComputedMethodsType, DataTypes, DefaultValueType, RecordDescType,
    FieldDescType, ModelCrudOptionsType, ModelDescType, ModelOptionsType,
    ModelRelationType, UniqueFieldsType, ValidateMethodResponseType,
    ValidateResponseType, ValueToDataTypes,
} from "./types";
import {
    ActionParamsType, ActionParamType, CrudOptionsType, CrudParamsType, newDeleteRecord, newGetRecord,
    newGetRecordStream, newSaveRecord, TaskTypes, newDeleteRecordTrans, newSaveRecordTrans,
} from "../crud";
import { isEmptyObject } from "../crud";

/**
 * @class Model - the model class for the mongodb
 */
export class Model {
    private readonly tableName: string;
    private readonly recordDesc: RecordDescType;
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
        this.tableName = model.tableName || "";
        this.recordDesc = model.recordDesc || {};
        this.timeStamp = model.timeStamp !== undefined ? model.timeStamp : true;
        this.actorStamp = model.actorStamp !== undefined ? model.actorStamp : true;
        this.activeStamp = model.activeStamp !== undefined ? model.activeStamp : true;
        this.computedMethods = model.computedMethods || {};
        this.validateMethod = model.validateMethod ? model.validateMethod : undefined;
        this.alterSyncColl = model.alterSyncTable !== undefined ? model.alterSyncTable : false;
        this.taskType = "";
        this.validateKey = "";
        this.relations = options.relations || [];
        this.uniqueFields = options.uniqueFields || [];
        this.primaryFields = options.primaryFields || [];
        this.requiredFields = options.requiredFields || [];
        this.modelOptions = {
            timeStamp  : this.timeStamp !== undefined ? this.timeStamp :
                options.timeStamp !== undefined ? options.timeStamp : true,
            actorStamp : this.actorStamp !== undefined ? this.actorStamp :
                options.actorStamp !== undefined ? options.actorStamp : true,
            activeStamp: this.activeStamp !== undefined ? this.activeStamp :
                options.activeStamp !== undefined ? options.activeStamp : true,
        };
        this.checkAccess = false;
    }

    // ***** instance methods: getters | setters *****
    get modelTableName(): string {
        return this.tableName;
    }

    get modelRecordDesc(): RecordDescType {
        return this.recordDesc;
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

    // ***** instance methods *****

    /**
     * @method getParentRelations retrieves/extracts parent relations/tables(collections) for the this.tableName
     * (as targetTable), sourceTable is the parentTable of this.tableName(target/child).
     */
    getParentRelations(): Array<ModelRelationType> {
        if (this.modelRelations.length < 1) {
            return [];
        }
        const parentRelations: Array<ModelRelationType> = [];
        for (const item of this.modelRelations) {
            if (this.modelTableName === item.targetTable) {
                parentRelations.push(item);
            }
        }
        return parentRelations;
    }

    /**
     * @method getChildRelations retrieves/extracts child-relations/collections for the this.tableName (as sourceTable).
     * targetTable is the childColl of this.tableName(source/parent).
     */
    getChildRelations(): Array<ModelRelationType> {
        if (this.modelRelations.length < 1) {
            return [];
        }
        const childRelations: Array<ModelRelationType> = [];
        for (const item of this.modelRelations) {
            if (this.modelTableName === item.sourceTable) {
                childRelations.push(item);
            }
        }
        return childRelations;
    }

    /**
     * @method getParentTables retrieves the parent/source-tables from parentRelations
     */
    getParentTables(): Array<string> {
        // compute unique values of the child/target-tables
        const cTablesSet = new Set<string>()
        this.getParentRelations().forEach(it => {
            const tableName = it.sourceModel.tableName || it.sourceTable
            cTablesSet.add(tableName)
        })
        return [...cTablesSet]
    }

    /**
     * @method getChildTables retrieves the child/target-collections from childRelations
     */
    getChildTables(): Array<string> {
        // compute unique values of the child/target-tables
        const cTablesSet = new Set<string>()
        this.getChildRelations().forEach(it => {
            const tableName = it.targetModel.tableName || it.targetTable
            cTablesSet.add(tableName)
        })
        return [...cTablesSet]
    }

    // ***** helper methods *****

    /**
     * @deprecated - use the model-description for validation, see @method validateDocValue
     * @see validateDocValue
     * @method computeRequiredFields computes the non-null fields, i.e. allowNull === false.
     */
    computeRequiredFields(): Array<string> {
        let requiredFields: Array<string> = [];
        for (let [field, fieldDesc] of Object.entries(this.modelRecordDesc)) {
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

    /**
     * @deprecated - use the model-description for validation, see @method validateDocValue
     * @see validateDocValue
     * @method validateRequiredFields validates the non-null field-values, i.e. allowNull === false.
     * @param actionParam
     */
    validateRequiredFields(actionParam: ActionParamType): ValidateResponseType {
        const errors: MessageObject = {};
        const reqFields = this.computeRequiredFields()
        if (reqFields.length < 1) {
            errors["message"] = "No field validation requirements specified"
            return {
                ok: true,
                errors,
            };
        }
        // validate required field-values
        for (const field of reqFields) {
            if (!actionParam[field]) {
                errors[field] = `Field: ${field} is required (not-null)`;
            }
        }
        if (!isEmptyObject(errors)) {
            return {
                ok: false,
                errors,
            }
        }
        return {
            ok: true,
            errors,
        }
    }


    /**
     * @method computeDocValueType computes the record/document-field-value-types (DataTypes).
     * @param docValue
     */
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
                } else if (typeof val === "string") {
                    // check all base string formats
                    if (validator.isDate(val)) {
                        computedTypes[key] = DataTypes.DATETIME;
                    } else if (validator.isEmail(val)) {
                        computedTypes[key] = DataTypes.EMAIL;
                    } else if (validator.isMongoId(val)) {
                        computedTypes[key] = DataTypes.MONGODB_ID;
                    } else if (validator.isUUID(val)) {
                        computedTypes[key] = DataTypes.STRING;
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
                } else if (typeof val === "object") {
                    if (validator.isDate(val)) {
                        computedTypes[key] = DataTypes.DATETIME;
                    } else {
                        computedTypes[key] = DataTypes.OBJECT;
                    }
                } else {
                    computedTypes[key] = DataTypes.UNKNOWN;
                }
            }
            return computedTypes;
        } catch (e) {
            throw new Error("Error computing docValue types: " + e.message);
        }
    }



    /**
     * @method setDefaultValues set the default record/document-field-values for no-value fields and if specified, setValue (transform).
     * @param docValue
     */
    async setDefaultValues(docValue: ActionParamType): Promise<ActionParamType> {
        try {
            // set base docValue
            const setDocValue = docValue;
            // perform defaultValue task
            for (const [key, val] of Object.entries(docValue)) {
                // defaultValue setting applies to FieldDescType only | otherwise, the value is null (by default, i.e. allowNull=>true)
                let docFieldDesc = this.modelRecordDesc[key];
                const docFieldValue = val || null;
                // set default values for no-value field only
                if (!docFieldValue) {
                    switch (typeof docFieldDesc) {
                        case "object":
                            docFieldDesc = docFieldDesc as FieldDescType;
                            let defaultValue = docFieldDesc?.defaultValue ? docFieldDesc.defaultValue : null;
                            // type of defaultValue and docFieldValue must be equivalent (re: validateMethod)
                            if (defaultValue) {
                                switch (typeof defaultValue) {
                                    // defaultValue may be of types: FieldValueTypes or DefaultValueType
                                    case "function":
                                        defaultValue = defaultValue as DefaultValueType;
                                        if (typeof defaultValue === "function") {
                                            setDocValue[key] = await defaultValue(docValue[key]);
                                        }
                                        break;
                                    default:
                                        // defaultValue = defaultValue as FieldValueTypes
                                        setDocValue[key] = defaultValue;
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
                            setDocValue[key] = docFieldDesc.setValue(fieldValue);
                        }
                        break;
                    default:
                        break;
                }
            }
            return setDocValue;
        } catch (e) {
            throw new Error(e.message);
        }
    }

    /**
     * @method validateDocValue validates the docValue by model definition (this.modelDocDesc)
     * @param docValue
     * @param docValueTypes
     */
    async validateDocValue(docValue: ActionParamType, docValueTypes: ValueToDataTypes): Promise<ValidateResponseType> {
        let errors: MessageObject = {};
        try {
            // use values from transformed docValue, including default/set-values, prior to validation
            // model-description/definition
            const recordDesc = this.modelRecordDesc;
            // combine errors/messages
            // perform model-defined docValue (document-field-values) validation
            for (const [key, val] of Object.entries(docValue)) {
                let fieldDesc = recordDesc[key] || null;
                const fieldValue = val || null
                // check field description / definition in the model-field-description
                if (!fieldDesc) {
                    errors[key] = `Invalid field: ${key} is not defined in the model`;
                    continue;
                }
                switch (typeof fieldDesc) {
                    case "string":
                        // validate field-value-type
                        if (fieldValue && docValueTypes[key] !== fieldDesc) {
                            errors[key] = `Invalid type for: ${key}. Expected ${fieldDesc}. Got ${docValueTypes[key]}.`;
                        }
                        break;
                    case "object":
                        // validate field-value-type,
                        fieldDesc = fieldDesc as FieldDescType;
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
                        if (fieldValue && fieldDesc.fieldLength && fieldDesc.fieldLength > 0) {
                            const fieldLength = (fieldValue as string).length;
                            if (fieldLength > fieldDesc.fieldLength) {
                                errors[`${key}-lengthValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Size of ${key} cannot be longer than ${fieldDesc.fieldLength}` :
                                    `Size of ${key} cannot be longer than ${fieldDesc.fieldLength}`;
                            }
                        }
                        // min/maxValues-validation for number-types and date-type field-values
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
                            // date value, compare using milliseconds since epoch, Jan-01-1970
                            // const dateFieldValue = (new Date(fieldValue as string)).setHours(0, 0, 0, 0);
                            const dateFieldValue = (new Date(fieldValue as string)).getTime();
                            if (fieldDesc.minValue && fieldDesc.maxValue) {
                                const dateMinValue = (new Date(fieldDesc.minValue)).getTime();
                                const dateMaxValue = (new Date(fieldDesc.maxValue)).getTime();
                                if ((dateFieldValue < dateMinValue || dateFieldValue > dateMaxValue)) {
                                    errors[`${key}-minMaxValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} must be greater than ${dateMinValue}, and less than ${dateMaxValue}` :
                                        `Value of: ${key} must be greater than ${dateMinValue}, and less than ${dateMaxValue}`;
                                }
                            } else if (fieldDesc.minValue) {
                                const dateMinValue = (new Date(fieldDesc.minValue)).getTime();
                                if (dateFieldValue < dateMinValue) {
                                    errors[`${key}-minMaxValidation`] = fieldDesc.validateMessage ?
                                        fieldDesc.validateMessage + ` | Value of: ${key} cannot be less than ${dateMinValue}.` :
                                        `Value of: ${key} cannot be less than ${dateMinValue}.`;
                                }
                            } else if (fieldDesc.maxValue) {
                                const dateMaxValue = (new Date(fieldDesc.maxValue)).getTime();
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
                        // startsWith
                        if (fieldValue && fieldDesc.startsWith) {
                            const testPattern = fieldValue.toString().startsWith(fieldDesc.startsWith);
                            if (!testPattern) {
                                errors[`${key}-startsWithValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} must start with ${fieldDesc.startsWith}.` :
                                    `Value of: ${key} must start with ${fieldDesc.startsWith}.`;
                            }
                        }
                        // notStartsWith
                        if (fieldValue && fieldDesc.notStartsWith) {
                            const testPattern = fieldValue.toString().startsWith(fieldDesc.notStartsWith);
                            if (testPattern) {
                                errors[`${key}-notStartsWithValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} must not start with ${fieldDesc.notStartsWith}.` :
                                    `Value of: ${key} must not start with ${fieldDesc.notStartsWith}.`;
                            }
                        }
                        // endsWith
                        if (fieldValue && fieldDesc.endsWith) {
                            const testPattern = fieldValue.toString().endsWith(fieldDesc.endsWith);
                            if (!testPattern) {
                                errors[`${key}-endsWithValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} must end with ${fieldDesc.endsWith}.` :
                                    `Value of: ${key} must end with ${fieldDesc.endsWith}.`;
                            }
                        }
                        // notEndsWith
                        if (fieldValue && fieldDesc.notEndsWith) {
                            const testPattern = fieldValue.toString().endsWith(fieldDesc.notEndsWith);
                            if (testPattern) {
                                errors[`${key}-notEndsWithValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} must not end with ${fieldDesc.notEndsWith}.` :
                                    `Value of: ${key} must not end with ${fieldDesc.notEndsWith}.`;
                            }
                        }
                        // includes
                        if (fieldValue && fieldDesc.includes) {
                            const testPattern = fieldValue.toString().includes(fieldDesc.includes);
                            if (!testPattern) {
                                errors[`${key}-includeValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} must include ${fieldDesc.includes}.` :
                                    `Value of: ${key} must include ${fieldDesc.includes}.`;
                            }
                        }
                        // excludes
                        if (fieldValue && fieldDesc.excludes) {
                            const testPattern = fieldValue.toString().includes(fieldDesc.excludes);
                            if (testPattern) {
                                errors[`${key}-includeValidation`] = fieldDesc.validateMessage ?
                                    fieldDesc.validateMessage + ` | Value of: ${key} must exclude ${fieldDesc.excludes}.` :
                                    `Value of: ${key} must exclude ${fieldDesc.excludes}.`;
                            }
                        }
                        break;
                    default:
                        errors[key] = `Unsupported field type: ${key} value, of type[${typeof val}], is not a supported type`;
                        break;
                }
            }
            // perform user-defined document validation
            const modelValidateMethod = this.validateMethod?  this.modelValidateMethod : null;
            if (modelValidateMethod) {
                const valRes = modelValidateMethod(docValue);
                if (valRes && (!isEmptyObject(valRes.errors) || !valRes.ok)) {
                    // update docValue validation errors object
                    errors = {...errors, ...valRes.errors}
                }
            }
            // check validation errors
            if (!isEmptyObject(errors)) {
                return {
                    ok    : false,
                    errors: errors,
                }
            }
            // return success
            return {ok: true, errors: {}};
        } catch (e) {
            // throw new Error(e.message);
            errors["message"] = e.message ? e.message : "error validating the document-field-value";
            return {ok: false, errors};
        }
    }

    // validate that source/actionParam(record) and targetModel-field types match for source-target-relations
    validateSourceTargetTypes(docValueTypes: ValueToDataTypes): ValidateResponseType {
        const errors: MessageObject = {}
        const relations = this.getChildRelations()
        if (relations.length < 1) {
            return {
                ok    : true,
                errors: {}
            }
        }
        for (const relation of relations) {
            const sourceModel = relation.sourceModel
            const targetModel = relation.targetModel
            const sourceField = relation.sourceField
            const targetField = relation.targetField
            // source/expected and target/foreign field types
            const sourceFieldType = docValueTypes[sourceField]? docValueTypes[sourceField] : sourceModel.recordDesc[sourceField]
            let foreignFieldType = "n/a"
            const targetFieldDesc = targetModel.recordDesc[targetField]
            switch (typeof targetFieldDesc) {
                case "string":
                    foreignFieldType = targetFieldDesc
                    break
                case "object":
                    const fieldDesc = targetFieldDesc as FieldDescType
                    foreignFieldType = fieldDesc.fieldType
                    break
                default:
                    break;
            }
            if (foreignFieldType !== sourceFieldType) {
                errors["relation"] = `Target/foreign-field type [${foreignFieldType}] does not match source-record-field type [${sourceFieldType}]`
            }
        }
        if (!isEmptyObject(errors)) {
            return {
                ok: false,
                errors,
            }
        }
        return {
            ok    : true,
            errors: {},
        }
    }

    uniqueFieldsSetArray(): Array<string> {
        const uniqueFieldsSet = new Set<string>()
        for (const fields of this.modelUniqueFields) {
            for (const field of fields) {
                uniqueFieldsSet.add(field)
            }
        }
        return [...uniqueFieldsSet]
    }

    /**
     * @deprecated - CRUD-save-methods will skip uniqueness validation, for records with non-specified-unique-field
     * @method validateRecordUniqueFields
     * @param actionParam
     * @return ValidateResponseType
     */
    validateRecordUniqueFields(actionParam: ActionParamType): ValidateResponseType {
        const errors: MessageObject = {}
        for (const fields of this.modelUniqueFields) {
            for (const field of fields) {
                if(!Object.keys(actionParam).includes(field)) {
                    errors[field] = `record [${actionParam}] missing unique field [${field}]`
                }
            }
        }
        if (!isEmptyObject(errors)) {
            return {
                ok: false,
                errors,
            }
        }
        return {
            ok: true,
            errors,
        }
    }

    // ***** crud operations / methods : interface to the CRUD modules *****

    async save(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage> {
        try {
            // model specific params
            params.tableName = this.modelTableName;
            params.recordDesc = this.modelRecordDesc;
            this.taskType = TaskTypes.UNKNOWN;  // create or update
            // set checkAccess status for crud-task-permission control
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            // validate task/action-params
            if (!params.actionParams || params.actionParams.length < 1) {
                return getResMessage('validateError', {
                    message: "Valid actionParams(an array of object values - ActionParamsType) is required to perform save (create/update) task.",
                });
            }
            // determine taskType - create or update (not both)
            const actParam = params.actionParams[0]
            if (!actParam["_id"] || actParam["_id"] === "") {
                if (params.actionParams.length === 1 && (params.recordIds && params.recordIds?.length > 0) ||
                    params.queryParams && !isEmptyObject(params.queryParams)) {
                    this.taskType = TaskTypes.UPDATE
                } else {
                    this.taskType = TaskTypes.CREATE
                }
            } else {
                this.taskType = TaskTypes.UPDATE
            }
            params.taskType = this.taskType
            // get docValue transformed types (as DataTypes) | one iteration only for actionParams[0]
            const docValueTypes = this.computeDocValueType(params.actionParams[0]);
            // validate actionParams (docValues), prior to saving, via this.validateDocValue
            let actParams: ActionParamsType = []
            for (const docValue of params.actionParams) {
                // validate uniqueFields - removed
                // const validUniqueFields = this.validateRecordUniqueFields(docValue)
                // if (!validUniqueFields.ok || !isEmptyObject(validUniqueFields.errors)) {
                //     return getParamsMessage(validUniqueFields.errors);
                // }
                // set defaultValues, prior to save
                const modelDocValue = await this.setDefaultValues(docValue);
                // validate actionParam-item (docValue) field-values
                const validateRes = await this.validateDocValue(modelDocValue, docValueTypes);
                if (!validateRes.ok || !isEmptyObject(validateRes.errors)) {
                    return getParamsMessage(validateRes.errors);
                }
                // validate source/target(foreign-key) field types
                const typesMatchRes = this.validateSourceTargetTypes(docValueTypes)
                if (!typesMatchRes.ok || !isEmptyObject(typesMatchRes.errors)) {
                    return getParamsMessage(typesMatchRes.errors);
                }
                // update actParams, with the model-transformed document-value
                actParams.push(modelDocValue)
            }
            // update CRUD params and options
            params.actionParams = actParams
            // update unique-fields query-parameters
            options.uniqueFields = this.modelUniqueFields;
            options = {
                ...options, ...{modelOptions: this.modelOptionValues},
            };
            // instantiate CRUD-save class & perform save-crud task (create or update)
            const crud = newSaveRecord(params, options);
            // validate recordIds, for updates
            let recordIds: Array<string> = [];
            for (const rec of params.actionParams) {
                if (rec["_id"]) {
                    recordIds.push(rec["_id"] as string);
                }
            }
            if (recordIds.length > 0) {
                params.recordIds = recordIds
            }
            return await crud.saveRecord();
        } catch (e) {
            return getResMessage("saveError", {message: `${e.message ? e.message : "Unable to complete save tasks"}`});
        }
    }

    async get(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage> {
        try {
            // model specific params
            params.tableName = this.modelTableName;
            params.recordDesc = this.modelRecordDesc;
            params.taskType = TaskTypes.READ;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            const crud = newGetRecord(params, options);
            return await crud.getRecord();
        } catch (e) {
            return getResMessage("readError", {message: `${e.message ? "=> " + e.message : ""}`});
        }
    }

    async getStream(params: CrudParamsType, options: CrudOptionsType = {}): Promise<AsyncIterable<Document>> {
        // get stream of document(s), returning a cursor or error
        try {
            // model specific params
            params.tableName = this.modelTableName;
            params.recordDesc = this.modelRecordDesc;
            params.taskType = TaskTypes.READ;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            const crud = newGetRecordStream(params, options);
            return await crud.getRecordStream();
        } catch (e) {
            throw new Error(`notFound ${e.message ? "=> " + e.message : ""}`);
        }
    }

    async lookupGet(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage> {
        // get lookup documents based on queryParams and model-relations definition
        try {
            // model specific params
            params.tableName = this.modelTableName;
            params.recordDesc = this.modelRecordDesc;
            params.taskType = TaskTypes.READ;
            this.taskType = params.taskType;
            // set access
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            const crud = newGetRecord(params, options);
            return await crud.getRecord();
        } catch (e) {
            return getResMessage("readError", {
                message: `${e.message ? "=> " + e.message : ""}`
            });
        }
    }

    async delete(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage> {
        // validate queryParams based on model/docDesc
        try {
            // model specific params
            params.tableName = this.modelTableName;
            params.recordDesc = this.modelRecordDesc;
            params.taskType = TaskTypes.DELETE;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            // update options
            options = {
                ...options, ...{
                    parentColls    : this.getParentTables(),
                    childColls     : this.getChildTables(),
                    parentRelations: this.getParentRelations(),
                    childRelations : this.getChildRelations(),
                }
            }
            const crud = newDeleteRecord(params, options);
            return await crud.deleteRecord();
        } catch (e) {
            return getResMessage("deleteError", {
                message: `${e.message ? "=> " + e.message : ""}`
            });
        }
    }

    async saveTrans(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage> {
        try {
            // model specific params
            params.tableName = this.modelTableName;
            params.recordDesc = this.modelRecordDesc;
            this.taskType = TaskTypes.UNKNOWN;  // create or update
            // set checkAccess status for crud-task-permission control
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            // validate task/action-params
            if (!params.actionParams || params.actionParams.length < 1) {
                return getResMessage('validateError', {
                    message: "Valid actionParams(an array of object values - ActionParamsType) is required to perform save (create/update) task.",
                });
            }
            // determine taskType - create or update (not both)
            const actParam = params.actionParams[0]
            if (!actParam["_id"] || actParam["_id"] === "") {
                if (params.actionParams.length === 1 && (params.recordIds && params.recordIds?.length > 0) ||
                    params.queryParams && !isEmptyObject(params.queryParams)) {
                    this.taskType = TaskTypes.UPDATE
                } else {
                    this.taskType = TaskTypes.CREATE
                }
            } else {
                this.taskType = TaskTypes.UPDATE
            }
            params.taskType = this.taskType
            // get docValue transformed types (as DataTypes) | one iteration only for actionParams[0]
            const docValueTypes = this.computeDocValueType(params.actionParams[0]);
            // validate actionParams (docValues), prior to saving, via this.validateDocValue
            let actParams: ActionParamsType = []
            for (const docValue of params.actionParams) {
                // set defaultValues, prior to save
                const modelDocValue = await this.setDefaultValues(docValue);
                // validate actionParam-item (docValue) field-values
                const validateRes = await this.validateDocValue(modelDocValue, docValueTypes);
                if (!validateRes.ok || !isEmptyObject(validateRes.errors)) {
                    return getParamsMessage(validateRes.errors);
                }
                // validate source/target(foreign-key) field types
                const typesMatchRes = this.validateSourceTargetTypes(docValueTypes)
                if (!typesMatchRes.ok || !isEmptyObject(typesMatchRes.errors)) {
                    return getParamsMessage(typesMatchRes.errors);
                }
                // update actParams, with the model-transformed document-value
                actParams.push(modelDocValue)
            }
            // update CRUD params and options
            params.actionParams = actParams
            // update unique-fields query-parameters
            options.uniqueFields = this.modelUniqueFields;
            options = {
                ...options, ...{modelOptions: this.modelOptionValues},
            };
            // instantiate CRUD-save class & perform save-crud task (create or update)
            const crud = newSaveRecordTrans(params, options);
            // validate recordIds, for updates
            let recordIds: Array<string> = [];
            for (const rec of params.actionParams) {
                if (rec["_id"]) {
                    recordIds.push(rec["_id"] as string);
                }
            }
            if (recordIds.length > 0) {
                params.recordIds = recordIds
            }
            return await crud.saveRecord();
        } catch (e) {
            return getResMessage("saveError", {message: `${e.message ? e.message : "Unable to complete save tasks"}`});
        }
    }

    async deleteTrans(params: CrudParamsType, options: CrudOptionsType = {}): Promise<ResponseMessage> {
        // validate queryParams based on model/docDesc
        try {
            // model specific params
            params.tableName = this.modelTableName;
            params.recordDesc = this.modelRecordDesc;
            params.taskType = TaskTypes.DELETE;
            this.taskType = params.taskType;
            // set access:
            options.checkAccess = options.checkAccess !== undefined ? options.checkAccess : false;
            this.checkAccess = options.checkAccess;
            // update options
            options = {
                ...options, ...{
                    parentColls    : this.getParentTables(),
                    childColls     : this.getChildTables(),
                    parentRelations: this.getParentRelations(),
                    childRelations : this.getChildRelations(),
                }
            }
            const crud = newDeleteRecordTrans(params, options);
            return await crud.deleteRecord();
        } catch (e) {
            return getResMessage("deleteError", {
                message: `${e.message ? "=> " + e.message : ""}`
            });
        }
    }

}

// factory function
export function newModel(model: ModelDescType, options: ModelCrudOptionsType = {}) {
    return new Model(model, options);
}
