// 2024-01-07
import { ObjectId, DeleteResult, UpdateResult, } from "mongodb";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import { isEmptyObject } from "../utils";
import { deleteHashCache, QueryHashCacheParamsType, } from "@mconnect/mccache";
import Crud from "../Crud";
import {
    ActionParamType, AuditLogParamsType, CrudOptionsType, CrudParamsType,
    CrudResultType, LogRecordsType, QueryParamsType, SubItemsType,
} from "../types";
import { FieldDescType, RelationActionTypes } from "../../orm";

class DeleteRecordTrans extends Crud {
    protected tableRestrict: boolean;
    protected deleteRestrict: boolean;
    protected deleteSetNull: boolean;
    protected deleteSetDefault: boolean;

    constructor(params: CrudParamsType, options: CrudOptionsType = {}) {
        super(params, options);
        // Set specific instance properties
        this.currentRecs = [];
        this.tableRestrict = false;
        this.deleteRestrict = false;
        this.deleteSetNull = false;
        this.deleteSetDefault = false;
    }

    async deleteRecord(): Promise<ResponseMessage> {
        // Check/validate the attributes / parameters
        const dbCheck = this.checkDb(this.appDb);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }
        const auditDbCheck = this.checkDb(this.auditDb);
        if (auditDbCheck.code !== "success") {
            return auditDbCheck;
        }

        // for queryParams, exclude _id, if present
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            let querySpec = this.queryParams;
            const {_id, ...otherParams} = querySpec;
            this.queryParams = otherParams;
        }
        /**
         * compute/set table-constraints settings for delete task.
         * @param deleteRestrict - for same-table referential integrity checking
         * @param tableRestrict - for cross-table referential integrity checking
         * @param deleteSetDefault - for set-target-value to default-value, not currently used
         * @param deleteSetNull - for set-target-value to null-value, not currently used
         */
        this.deleteRestrict = this.childRelations.filter(item => item.onDelete === RelationActionTypes.RESTRICT).length > 0;
        this.tableRestrict = this.childRelations.filter(item => (item.onDelete === RelationActionTypes.RESTRICT && item.sourceTable === item.targetTable)).length > 0;
        this.deleteSetDefault = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_DEFAULT).length > 0;
        this.deleteSetNull = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_NULL).length > 0;
        // delete / remove item(s) by recordId(s) | usually for owner, admin and by role-assignment on table/documents
        if (this.recordIds && this.recordIds.length > 0) {
            // check if records exist, for delete and audit-log...
            if (this.logDelete || this.logCrud || this.deleteRestrict || this.deleteSetDefault || this.deleteSetNull || this.tableRestrict) {
                const recExist = await this.getCurrentRecords("id");
                if (recExist.code !== "success") {
                    return recExist;
                }
            }
            try {
                // same-table referential integrity check, sub-items
                if (this.tableRestrict) {
                    const subItem = await this.checkSubItemById();
                    if (subItem.code !== "success") {
                        return subItem;
                    }
                }
                // multi/cross-table referential integrity check, parent-child-items
                if (this.deleteRestrict) {
                    const refIntegrity = await this.checkRefIntegrityById();
                    if (refIntegrity.code !== "success") {
                        return refIntegrity;
                    }
                }
                // delete/remove records, and apply deleteSetDefault and deleteSetNull constraints
                return await this.removeRecordById();
            } catch (error) {
                return getResMessage("removeError", {
                    message: error.message ? error.message : "Error removing record(s)",
                });
            }
        }

        // delete / remove item(s) by queryParams | usually for owner, admin and by role-assignment on table-records
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            try {
                // check if records exist, for delete and audit-log
                if (this.logDelete || this.logCrud || this.deleteRestrict || this.deleteSetDefault || this.deleteSetNull || this.tableRestrict) {
                    const recExist = await this.getCurrentRecords("queryParams");
                    if (recExist.code !== "success") {
                        return recExist;
                    }
                }
                // same-table referential integrity check, sub-items
                if (this.tableRestrict) {
                    const subItem = await this.checkSubItemByParams();
                    if (subItem.code !== "success") {
                        return subItem;
                    }
                }
                // multi/cross-table referential integrity check, parent-child-items
                if (this.deleteRestrict) {
                    const refIntegrity = await this.checkRefIntegrityByParams();
                    if (refIntegrity.code !== "success") {
                        return refIntegrity;
                    }
                }
                // delete/remove records, and apply deleteSetDefault and deleteSetNull constraints
                return await this.removeRecordByParams();
            } catch (error) {
                return getResMessage("removeError", {
                    message: error.message,
                });
            }
        }
        // could not remove document
        return getResMessage("removeError", {
            message: "Unable to perform the requested action(s), due to incomplete/incorrect delete conditions. You may perform delete tasks by record-ids of queryParams only. ",
        });
    }

    // checkSubItemById checks referential integrity for same table, by id
    async checkSubItemById(): Promise<ResponseMessage> {
        // check if any/some of the table contain at least a sub-item/document
        const appDbColl = this.appDb.collection(this.tableName);
        const docWithSubItems = await appDbColl.findOne({
            parentId: {
                $in: this.recordIds,
            }
        });
        if (docWithSubItems && !isEmptyObject(docWithSubItems)) {
            return getResMessage("subItems", {
                message: "A record that includes sub-items cannot be deleted. Delete/remove the sub-items or update/remove the parentId field-value, first.",
            });
        } else {
            return getResMessage("success", {
                message: "no data integrity issue",
            });
        }
    }

    // checkSubItemByParams checks referential integrity for same table, by queryParam
    async checkSubItemByParams(): Promise<ResponseMessage> {
        // check if any/some of the table contain at least a sub-item/document
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            await this.getCurrentRecords("queryParams")
            this.recordIds = [];          // reset recordIds instance value
            this.currentRecs.forEach((item: ActionParamType) => {
                this.recordIds.push(item["_id"] as string);
            });
            return await this.checkSubItemById();
        }
        return getResMessage("paramsError", {
            message: "queryParams is required",
        })
    }

    // checkRefIntegrityById checks referential integrity for parent-child tables, by document-Id
    async checkRefIntegrityById(): Promise<ResponseMessage> {
        // required-inputs: parent/child-tables and current item-id/item-name
        if (this.childRelations.length < 1) {
            return getResMessage("success", {
                message: "no data integrity condition specified or required",
            });
        }
        if (this.recordIds.length > 0) {
            // prevent item delete, if child/target-table-items reference parent/source-table itemId
            let subItems: Array<SubItemsType> = []
            // recordIds ref-check
            const childExist = this.childRelations.some(async (relation) => {
                const targetDbTable = this.appDb.collection(relation.targetTable);
                // include foreign-key/target as the query condition
                const targetField = relation.targetField;
                const sourceField = relation.sourceField;
                const query: QueryParamsType = {}
                if (sourceField === "_id") {
                    query[targetField] = {
                        $in: this.recordIds,
                    }
                } else {
                    // other source-fields besides _id
                    const sourceFieldValues = this.currentRecs.map((item: ActionParamType) => item[sourceField]);
                    query[targetField] = {
                        $in: sourceFieldValues,
                    }
                }
                const tableRecord = targetDbTable.find(query);
                if (tableRecord && !isEmptyObject(tableRecord)) {
                    subItems.push({
                        tableName         : relation.targetTable,
                        hasRelationRecords: true,
                    });
                    return true;
                } else {
                    subItems.push({
                        tableName         : relation.targetTable,
                        hasRelationRecords: false,
                    });
                    return false;
                }
            });
            this.subItems = subItems;
            if (childExist) {
                return getResMessage("subItems", {
                    message: `A record that contains sub-items cannot be deleted. Delete/remove the sub-items [from ${this.childTables.join(", ")} table(s)], first.`,
                    value  : subItems,
                });
            } else {
                return getResMessage("success", {
                    message: "no data integrity issue",
                    value  : subItems,
                });
            }
        } else {
            return getResMessage("success", {
                message: "recordIds parameter is required for referential integrity check/validation",
            });
        }
    }

    // checkRefIntegrityByParams checks referential integrity for parent-child tables, by queryParams
    async checkRefIntegrityByParams(): Promise<ResponseMessage> {
        // required-inputs: parent/child-tables and current item-id/item-name
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            await this.getCurrentRecords("queryParams")
            this.recordIds = [];
            this.currentRecs.forEach((item: ActionParamType) => {
                this.recordIds.push(item["_id"] as string);
            });
            return await this.checkRefIntegrityById();
        }
        return getResMessage("paramsError", {
            message: "queryParams is required",
        })
    }

    async removeRecordById(): Promise<ResponseMessage> {
        if (this.recordIds.length < 1) {
            return getResMessage("deleteError", {message: "Valid record/document-ID(s) parameter is required"});
        }
        // delete/remove records and log in audit-table
        // create a transaction session
        const session = this.dbClient.startSession();
        try {
             // id(s): convert string to ObjectId
            const recordIds = this.recordIds.map(id => new ObjectId(id));
            // trx starts
            let removed: DeleteResult = {deletedCount: 0, acknowledged: false};
            await session.withTransaction(async () => {
                const appDbColl = this.dbClient.db(this.dbName).collection(this.tableName);
                removed = await appDbColl.deleteMany({
                    _id: {
                        $in: recordIds,
                    }
                }, {session});
                if (!removed.acknowledged || removed.deletedCount !== recordIds.length) {
                    await session.abortTransaction();
                    throw new Error(`Unable to delete all specified records [${removed.deletedCount} of ${recordIds.length} set to be removed]. Transaction aborted.`)
                }
                // optional, update child-collection-documents for setDefault and setNull/initialize-value?', i.e. if this.deleteSetDefault or this.deleteSetNull
                if (this.deleteSetDefault && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_DEFAULT);
                    for await (const currentRec of (this.currentRecs as Array<ActionParamType>)) {
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if targetModel is defined/specified, required to determine default-action
                            if (!cItem.targetModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Target model is required to complete the set-default-task");
                            }
                            const targetDocDesc = cItem.targetModel.tableDesc || {};
                            const targetTable = cItem.targetModel.tableName || cItem.targetTable;
                            // compute default values for the targetFields
                            const docDefaultValue = await this.computeDefaultValues(targetDocDesc);
                            const currentFieldValue = currentRec[sourceField] || null;   // current value of the targetField
                            const fieldDefaultValue = docDefaultValue[targetField] || null; // new value (default-value) of the targetField
                            if (currentFieldValue === fieldDefaultValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField default value | check if setDefault is permissible for the targetField
                            let targetFieldDesc = targetDocDesc[targetField];   // target-field-type
                            switch (typeof targetFieldDesc) {
                                case "object":
                                    targetFieldDesc = targetFieldDesc as FieldDescType
                                    // handle non-default-field
                                    if (!targetFieldDesc.defaultValue || !Object.keys(targetFieldDesc).includes("defaultValue")) {
                                        await session.abortTransaction();
                                        throw new Error("Target/foreignKey default-value is required to complete the set-default task");
                                    }
                                    break;
                                default:
                                    break;
                            }
                            let updateQuery: QueryParamsType = {};    // to determine the current-value in the target-field
                            let updateSet: ActionParamType = {};      // to set the new-default-value in the target-field
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = fieldDefaultValue;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetTable);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,}) as UpdateResult;
                            if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                } else if (this.deleteSetNull && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_NULL);
                    for await (const currentRec of (this.currentRecs as Array<ActionParamType>)) {
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if targetModel is defined/specified, required to determine allowNull-action
                            if (!cItem.targetModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Target model is required to complete the set-null-task");
                            }
                            const targetDocDesc = cItem.targetModel.tableDesc || {};
                            const initializeDocValue = this.computeInitializeValues(targetDocDesc)
                            const currentFieldValue = currentRec[sourceField] || null;  // current value of the targetField
                            const nullFieldValue = initializeDocValue[targetField] || null; // new value (null-value) of the targetField
                            if (currentFieldValue === nullFieldValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField null value | check if allowNull is permissible for the targetField
                            const targetTable = cItem.targetModel.tableName || cItem.targetTable;
                            let targetFieldDesc = targetDocDesc[targetField];
                            switch (typeof targetFieldDesc) {
                                case "object":
                                    targetFieldDesc = targetFieldDesc as FieldDescType
                                    // handle non-null-field
                                    if (!targetFieldDesc.allowNull || !Object.keys(targetFieldDesc).includes("allowNull")) {
                                        await session.abortTransaction();
                                        throw new Error("Target/foreignKey allowNull is required to complete the set-null task");
                                    }
                                    break;
                                default:
                                    break;
                            }
                            let updateQuery: QueryParamsType = {};
                            let updateSet: ActionParamType = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = nullFieldValue;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetTable);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,}) as UpdateResult;
                            if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                }
                // commit or abort trx
                if (!removed.acknowledged || removed.deletedCount !== recordIds.length) {
                    await session.abortTransaction()
                    throw new Error(`document-remove-error [${removed.deletedCount} of ${this.currentRecs.length} set to be removed]`)
                }
                await session.commitTransaction();
            });
            // perform delete cache and audit-log tasks
            const cacheParams: QueryHashCacheParamsType = {
                key : this.cacheKey,
                hash: this.tableName,
                by  : "hash",
            }
            deleteHashCache(cacheParams);
            let logRes = {code: "unknown", message: "in-determinate", resCode: 200, resMessage: "", value: null};
            if (this.logDelete || this.logCrud) {
                const logRecs: LogRecordsType = {
                    logRecords: this.currentRecs,
                    recordIds : this.recordIds,
                }
                const logParams: AuditLogParamsType = {
                    logRecords: logRecs,
                    tableName : this.tableName,
                    logBy     : this.userId,
                }
                logRes = await this.transLog.deleteLog(this.userId, logParams);
            }
            const deleteResultValue: CrudResultType = {
                recordsCount: removed.deletedCount,
                logRes,
            }
            return getResMessage("success", {
                message: `Delete task completed - [${removed.deletedCount} of ${this.currentRecs.length} removed] `,
                value  : deleteResultValue,
            });
        } catch (e) {
            await session.abortTransaction()
            return getResMessage("removeError", {
                message: `Error removing/deleting record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        } finally {
            await session.endSession();
        }
    }

    async removeRecordByParams(): Promise<ResponseMessage> {
        if (!this.queryParams || isEmptyObject(this.queryParams)) {
            return getResMessage("deleteError", {message: "Valid queryParams required"});
        }
        // delete/remove records and log in audit-table
        // create a transaction session
        const session = this.dbClient.startSession();
        try {
            // const removed = await appDbColl.deleteMany(this.queryParams,);
            // trx starts
            let removed: DeleteResult = {deletedCount: 0, acknowledged: false};
            await session.withTransaction(async () => {
                const appDbColl = this.dbClient.db(this.dbName).collection(this.tableName);
                removed = await appDbColl.deleteMany(this.queryParams, {session});
                if (!removed.acknowledged || removed.deletedCount !== this.currentRecs.length) {
                    await session.abortTransaction();
                    throw new Error(`Unable to delete all specified records [${removed.deletedCount} of ${this.currentRecs.length} set to be removed]. Transaction aborted.`)
                }
                // optional, update child-collection-documents for setDefault and setNull/initialize-value?, if this.deleteSetDefault or this.deleteSetNull
                if (this.deleteSetDefault && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_DEFAULT);
                    for await (const currentRec of (this.currentRecs as Array<ActionParamType>)) {
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField
                            // check if targetModel is defined/specified, required to determine default-action
                            if (!cItem.targetModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Target model is required to complete the set-default-task");
                            }
                            const targetDocDesc = cItem.targetModel.tableDesc || {};
                            const targetTable = cItem.targetModel.tableName || cItem.targetTable;
                            // compute default values for the targetFields
                            const docDefaultValue = await this.computeDefaultValues(targetDocDesc);
                            const currentFieldValue = currentRec[sourceField] || null;   // current value of the targetField
                            const fieldDefaultValue = docDefaultValue[targetField] || null; // new value (default-value) of the targetField
                            if (currentFieldValue === fieldDefaultValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField default value | check if setDefault is permissible for the targetField
                            let targetFieldDesc = targetDocDesc[targetField];
                            switch (typeof targetFieldDesc) {
                                case "object":
                                    targetFieldDesc = targetFieldDesc as FieldDescType
                                    // handle non-default-field
                                    if (!Object.keys(targetFieldDesc).includes("defaultValue") || !targetFieldDesc.defaultValue) {
                                        await session.abortTransaction();
                                        throw new Error("Target/foreignKey default-value is required to complete the set-default task");
                                    }
                                    break;
                                default:
                                    break;
                            }
                            let updateQuery: QueryParamsType = {};
                            let updateSet: ActionParamType = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = fieldDefaultValue;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetTable);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,}) as UpdateResult;
                            if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                } else if (this.deleteSetNull && this.childRelations.length > 0) {
                    const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_NULL);
                    for await (const currentRec of (this.currentRecs as Array<ActionParamType>)) {
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if targetModel is defined/specified, required to determine allowNull-action
                            if (!cItem.targetModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Target model is required to complete the set-null-task");
                            }
                            const targetDocDesc = cItem.targetModel.tableDesc || {};
                            const initializeDocValue = this.computeInitializeValues(targetDocDesc)
                            const currentFieldValue = currentRec[sourceField] || null;  // current value of the targetField
                            const nullFieldValue = initializeDocValue[targetField] || null; // new value (null-value) of the targetField
                            if (currentFieldValue === nullFieldValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField null value | check if allowNull is permissible for the targetField
                            const targetTable = cItem.targetModel.tableName || cItem.targetTable;
                            let targetFieldDesc = targetDocDesc[targetField];
                            switch (typeof targetFieldDesc) {
                                case "object":
                                    targetFieldDesc = targetFieldDesc as FieldDescType
                                    // handle non-null-field
                                    if (!Object.keys(targetFieldDesc).includes("allowNull") || !targetFieldDesc.allowNull) {
                                        await session.abortTransaction();
                                        throw new Error("Target/foreignKey allowNull is required to complete the set-null task");
                                    }
                                    break;
                                default:
                                    break;
                            }
                            let updateQuery: QueryParamsType = {};
                            let updateSet: ActionParamType = {};
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = nullFieldValue;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetTable);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,}) as UpdateResult;
                            if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(cascade) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                }
                // commit or abort trx
                if (!removed.acknowledged || removed.deletedCount !== this.currentRecs.length) {
                    await session.abortTransaction()
                    throw new Error(`document-remove-error [${removed.deletedCount} of ${this.currentRecs.length} set to be removed]`)
                }
                await session.commitTransaction();
            });
            // perform delete cache and audit-log tasks
            const cacheParams: QueryHashCacheParamsType = {
                key : this.cacheKey,
                hash: this.tableName,
                by  : "hash",
            }
            deleteHashCache(cacheParams);
            let logRes = {
                code: "unknown", message: "in-determinate", resCode: 200, resMessage: "", value: null
            };
            if (this.logDelete || this.logCrud) {
                const logRecs: LogRecordsType = {
                    logRecords: this.currentRecs,
                    queryParam: this.queryParams,
                }
                const logParams: AuditLogParamsType = {
                    logRecords: logRecs,
                    tableName : this.tableName,
                    logBy     : this.userId,
                }
                logRes = await this.transLog.deleteLog(this.userId, logParams);
            }
            const deleteResultValue: CrudResultType = {
                recordsCount: removed.deletedCount,
                logRes,
            }
            return getResMessage("success", {
                message: `Delete task completed - [${removed.deletedCount} of ${this.currentRecs.length} removed] `,
                value  : deleteResultValue,
            });
        } catch (e) {
            await session.abortTransaction()
            return getResMessage("removeError", {
                message: `Error removing/deleting record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        }
    }
}

// factory function/constructor
function newDeleteRecordTrans(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new DeleteRecordTrans(params, options);
}

export { DeleteRecordTrans, newDeleteRecordTrans };
