// 2024-01-07 | requires mongodb-replicas
import { ObjectId, DeleteResult, } from "mongodb";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import { isEmptyObject } from "./utils";
import { deleteHashCache, QueryHashCacheParamsType, } from "@mconnect/mccache";
import {
    ActionParamType, AuditLogParamsType, CrudOptionsType, CrudParamsType,
    CrudResultType, LogRecordsType, QueryParamsType,
} from "./types";
import { FieldDescType, RelationActionTypes, } from "../orm";
import { DeleteRecord } from "./DeleteRecord";

class DeleteRecordTrans extends DeleteRecord {
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
            // await session.abortTransaction()
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
            // await session.abortTransaction()
            return getResMessage("removeError", {
                message: `Error removing/deleting record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        } finally {
            await session.endSession();
        }
    }
}

// factory function/constructor
function newDeleteRecordTrans(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new DeleteRecordTrans(params, options);
}

export { DeleteRecordTrans, newDeleteRecordTrans };
