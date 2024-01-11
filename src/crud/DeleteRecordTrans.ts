// 2024-01-07 | requires mongodb-replicas
import { ObjectId, DeleteResult, } from "mongodb";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import { isEmptyObject } from "./utils";
import { deleteHashCache, QueryHashCacheParamsType, } from "@mconnect/mccache";
import Crud from "./Crud";
import {
    ActionParamType, AuditLogParamsType, CrudOptionsType, CrudParamsType,
    CrudResultType, LogRecordsType, QueryParamsType, SubItemsType,
} from "./types";
import { FieldDescType, RelationActionTypes, } from "../orm";

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
            // check if records exist, for delete constraints and audit-log
            const recExist = await this.getCurrentRecords("id");
            if (recExist.code !== "success") {
                return recExist;
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
                // check if records exist, for delete constraints and audit-log
                const recExist = await this.getCurrentRecords("queryParams");
                if (recExist.code !== "success") {
                    return recExist;
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
                    const currentFieldValues = this.currentRecs.map((item: ActionParamType) => item[sourceField]);
                    query[targetField] = {
                        $in: currentFieldValues,
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
        // create a transaction session
        const session = this.dbClient.startSession();
        try {
            // id(s): convert string to ObjectId
            const recordIds = this.recordIds.map(id => new ObjectId(id));
            // trx starts
            let removed: DeleteResult = {deletedCount: 0, acknowledged: false};
            let logRes = {code: "noLog", message: "in-determinate", resCode: 200, resMessage: "", value: null};
            let deleteResultValue: CrudResultType = {}
            await session.withTransaction(async () => {
                const appDbColl = this.dbClient.db(this.dbName).collection(this.tableName);
                removed = await appDbColl.deleteMany({
                    _id: {
                        $in: recordIds,
                    }
                }, {session});
                // validate transaction
                if (!removed.acknowledged || removed.deletedCount !== recordIds.length) {
                    await session.abortTransaction();
                    throw new Error(`Unable to delete all specified records [${removed.deletedCount} of ${recordIds.length} set to be removed]. Transaction aborted.`)
                }
                // optional, update child-table-records(collection-documents) for setDefault and setNull/initialize-value?', i.e. if this.deleteSetDefault or this.deleteSetNull
                if (this.deleteSetDefault) {
                    const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_DEFAULT);
                    // update child/target-tables for each of the currentRecords
                    for await (const currentRec of this.currentRecs) {
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if source and target models are defined/specified, required to determine default-action
                            if (!cItem.targetModel || !cItem.sourceModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Source & Target models are required to complete the set-default-task");
                            }
                            const sourceRecordDesc = cItem.sourceModel.recordDesc || {};
                            // compute default values for the targetFields
                            const recordDefaultValues = await this.computeRecordDefaultValues(sourceRecordDesc, currentRec);
                            const currentFieldValue = currentRec[sourceField] || null;          // current value of the targetField
                            const targetFieldValue = recordDefaultValues[sourceField] || null;  // new value (default-value) of the targetField
                            if (!targetFieldValue || currentFieldValue === targetFieldValue) {
                                // skip update for null targetFieldValue or no change in current and target values
                                continue;
                            }
                            // update-query/data-set for target table-record update
                            const updateQuery: QueryParamsType = {};    // to determine the current-value in the target-field
                            const updateSet: ActionParamType = {};      // to set the new-default-value in the target-field
                            updateQuery[targetField] = currentFieldValue;    // targetField current value
                            updateSet[targetField] = targetFieldValue;      // targetField new value
                            const targetTable = cItem.targetModel.tableName || cItem.targetTable;
                            const TargetDbColl = this.dbClient.db(this.dbName).collection(targetTable);
                            const updateRes = await TargetDbColl.updateMany(updateQuery, updateSet, {session,});
                            if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(default-value) the specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                } else if (this.deleteSetNull) {
                    const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_NULL);
                    // update child/target-tables for each of the currentRecords
                    for await (const currentRec of (this.currentRecs as Array<ActionParamType>)) {
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if source and target models are defined/specified, required to determine allowNull-action
                            if (!cItem.targetModel || !cItem.sourceModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Source and Target models are required to complete the set-null/zero-value-task");
                            }
                            const sourceRecordDesc = cItem.sourceModel.recordDesc || {};
                            const recordInitializedValues = this.computeInitializeValues(sourceRecordDesc)
                            const currentFieldValue = currentRec[sourceField] || null;      // current value of the targetField
                            const targetFieldValue = recordInitializedValues[sourceField] || null;  // new value (null-value) of the targetField
                            if (currentFieldValue === targetFieldValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField null value | check if allowNull is permissible for the targetField
                            const targetRecordDesc = cItem.targetModel.recordDesc || {};
                            let targetFieldDesc = targetRecordDesc[targetField];
                            switch (typeof targetFieldDesc) {
                                case "object":
                                    targetFieldDesc = targetFieldDesc as FieldDescType
                                    // handle non-null-field (allowNull is default to true, if not defined/specified)
                                    if (targetFieldDesc.allowNull !== undefined && !targetFieldDesc.allowNull) {
                                        await session.abortTransaction();
                                        throw new Error("Target/foreignKey allowNull is required to complete the set-null task");
                                    }
                                    break;
                                default:
                                    break;
                            }
                            // update-query/data-set for target table-record update
                            const updateQuery: QueryParamsType = {};  // to determine the current-value in the target-field
                            const updateSet: ActionParamType = {};    // to set the new-default-value in the target-field
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = targetFieldValue;
                            const targetTable = cItem.targetModel.tableName || cItem.targetTable;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetTable);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                            if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(null-value) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                }
                // perform delete cache and audit-log tasks
                const cacheParams: QueryHashCacheParamsType = {
                    key : this.cacheKey,
                    hash: this.tableName,
                    by  : "hash",
                }
                deleteHashCache(cacheParams);
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
                deleteResultValue = {
                    recordsCount: removed.deletedCount,
                    logRes,
                }
                await session.commitTransaction();
            });
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
        // create a transaction session
        const session = this.dbClient.startSession();
        try {
            // const removed = await appDbColl.deleteMany(this.queryParams,);
            // trx starts
            let removed: DeleteResult = {deletedCount: 0, acknowledged: false};
            let logRes = {code: "noLog", message: "in-determinate", resCode: 200, resMessage: "", value: null};
            let deleteResultValue: CrudResultType = {}
            await session.withTransaction(async () => {
                const appDbColl = this.dbClient.db(this.dbName).collection(this.tableName);
                removed = await appDbColl.deleteMany(this.queryParams, {session});
                if (!removed.acknowledged || removed.deletedCount !== this.currentRecs.length) {
                    await session.abortTransaction();
                    throw new Error(`Unable to delete all specified records [${removed.deletedCount} of ${this.currentRecs.length} set to be removed]. Transaction aborted.`)
                }
                // optional, update child-table-records(collection-documents) for setDefault and setNull/initialize-value?', i.e. if this.deleteSetDefault or this.deleteSetNull
                if (this.deleteSetDefault) {
                    const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_DEFAULT);
                    // update child/target-tables for each of the currentRecords
                    for await (const currentRec of this.currentRecs) {
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if source and target models are defined/specified, required to determine default-action
                            if (!cItem.targetModel || !cItem.sourceModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Source and Target models are required to complete the set-default-task");
                            }
                            const sourceRecordDesc = cItem.sourceModel.recordDesc || {};
                            // compute default values for the targetFields
                            const recordDefaultValues = await this.computeRecordDefaultValues(sourceRecordDesc, currentRec);
                            const currentFieldValue = currentRec[sourceField] || null;   // current value of the targetField
                            const targetFieldValue = recordDefaultValues[sourceField] || null;  // new value (default-value) of the targetField
                            if (!targetFieldValue || currentFieldValue === targetFieldValue) {
                                // skip update for null targetFieldValue or no change in current and target values
                                continue;
                            }
                            // update-query/data-set for target table-record update
                            const updateQuery: QueryParamsType = {};    // to determine the current-value in the target-field
                            const updateSet: ActionParamType = {};      // to set the new-default-value in the target-field
                            updateQuery[targetField] = currentFieldValue;    // targetField current value
                            updateSet[targetField] = targetFieldValue;      // targetField new value
                            const targetTable = cItem.targetModel.tableName || cItem.targetTable;
                            const TargetDbColl = this.dbClient.db(this.dbName).collection(targetTable);
                            const updateRes = await TargetDbColl.updateMany(updateQuery, updateSet, {session,});
                            if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(default-value) the specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                } else if (this.deleteSetNull) {
                    const childRelations = this.childRelations.filter(item => item.onDelete === RelationActionTypes.SET_NULL);
                    // update child/target-tables for each of the currentRecords
                    for await (const currentRec of (this.currentRecs as Array<ActionParamType>)) {
                        for await (const cItem of childRelations) {
                            const sourceField = cItem.sourceField;
                            const targetField = cItem.targetField;
                            // check if source and target models are defined/specified, required to determine allowNull-action
                            if (!cItem.targetModel || !cItem.sourceModel) {
                                // handle as error
                                await session.abortTransaction();
                                throw new Error("Source and Target models are required to complete the set-null-task");
                            }
                            const sourceRecordDesc = cItem.sourceModel.recordDesc || {};
                            const recordInitializedValues = this.computeInitializeValues(sourceRecordDesc)
                            const currentFieldValue = currentRec[sourceField] || null;  // current value of the targetField
                            const targetFieldValue = recordInitializedValues[sourceField] || null; // new value (null-value) of the targetField
                            if (currentFieldValue === targetFieldValue) {
                                // skip update
                                continue;
                            }
                            // validate targetField null value | check if allowNull is permissible for the targetField
                            const targetRecordDesc = cItem.targetModel.recordDesc || {};
                            let targetFieldDesc = targetRecordDesc[targetField];
                            switch (typeof targetFieldDesc) {
                                case "object":
                                    targetFieldDesc = targetFieldDesc as FieldDescType
                                    // handle non-null-field
                                    if (targetFieldDesc.allowNull !== undefined && !targetFieldDesc.allowNull) {
                                        await session.abortTransaction();
                                        throw new Error("Target/foreignKey allowNull is required to complete the set-null task");
                                    }
                                    break;
                                default:
                                    break;
                            }
                            // update-query/data-set for target table-record update
                            const updateQuery: QueryParamsType = {};  // to determine the current-value in the target-field
                            const updateSet: ActionParamType = {};    // to set the new-default-value in the target-field
                            updateQuery[targetField] = currentFieldValue;
                            updateSet[targetField] = targetFieldValue;
                            const targetTable = cItem.targetModel.tableName || cItem.targetTable;
                            const TargetColl = this.dbClient.db(this.dbName).collection(targetTable);
                            const updateRes = await TargetColl.updateMany(updateQuery, updateSet, {session,});
                            if (!updateRes.acknowledged || updateRes.modifiedCount !== updateRes.matchedCount) {
                                await session.abortTransaction();
                                throw new Error(`Unable to update(set-null) all specified records [${updateRes.modifiedCount} of ${updateRes.matchedCount} set to be updated]. Transaction aborted.`)
                            }
                        }
                    }
                }
                // perform delete cache and audit-log tasks
                const cacheParams: QueryHashCacheParamsType = {
                    key : this.cacheKey,
                    hash: this.tableName,
                    by  : "hash",
                }
                deleteHashCache(cacheParams);
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
                deleteResultValue = {
                    recordsCount: removed.deletedCount,
                    logRes,
                }
                await session.commitTransaction();
            });
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
