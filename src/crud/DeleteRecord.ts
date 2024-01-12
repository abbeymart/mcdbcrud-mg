/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-04-05 | @Updated: 2020-05-16, 2023-11-23, 2024-01-06
 * Updated 2018-04-08, prototype-to-class
 * @Company: mConnect.biz | @License: MIT
 * @Description: delete one or more records / documents by recordIds or queryParams
 */

// Import required module/function(s)
import { ObjectId, } from "mongodb";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import { isEmptyObject } from "./utils";
import { deleteHashCache, QueryHashCacheParamsType, } from "@mconnect/mccache";
import Crud from "./Crud";
import {
    ActionParamType, AuditLogParamsType, CrudOptionsType, CrudParamsType,
    CrudResultType, LogRecordsType, QueryParamsType, SubItemsType,
} from "./types";
import { RelationActionTypes } from "../orm";

class DeleteRecord extends Crud {
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
        // delete / remove item(s) by recordId(s) | usually for owner, admin and by role-assignment on table/collections
        if (this.recordIds && this.recordIds.length > 0) {
            // check if records exist, for delete constraints and audit-log...
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
                // delete/remove records
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
                // delete/remove records
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
        // compute unique values of the child/target-tables
        const cTablesSet = new Set<string>()
        this.childRelations.forEach(it => {
            const tableName = it.targetModel.tableName || it.targetTable
            cTablesSet.add(tableName)
        })
        this.childTables = [...cTablesSet]
        // check if any/some of the table contain at least a sub-item/document
        const appDbColl = this.appDb.collection(this.tableName);
        const docWithSubItems = await appDbColl.findOne({
            parentId: {
                $in: this.recordIds,
            }
        });
        if (docWithSubItems && !isEmptyObject(docWithSubItems)) {
            return getResMessage("subItems", {
                message: `A record that contains sub-items cannot be deleted. Delete/remove the sub-items [from ${this.childTables.join(", ")} table/collection(s)] or update/remove the parentId field-value, first.`,
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
            // compute unique values of the child/target-tables
            const cTablesSet = new Set<string>()
            this.childRelations.forEach(it => {
                const tableName = it.targetModel.tableName || it.targetTable
                cTablesSet.add(tableName)
            })
            this.childTables = [...cTablesSet]
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
                    message: `A record that contains sub-items cannot be deleted. Delete/remove the sub-items [from ${this.childTables.join(", ")} table/collection(s)] or update/remove the referential/foreign field-value, first.`,
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
        try {
            const appDbColl = this.dbClient.db(this.dbName).collection(this.tableName);
            // id(s): convert string to ObjectId
            const recordIds = this.recordIds.map(id => new ObjectId(id));
            const removed = await appDbColl.deleteMany({
                _id: {
                    $in: recordIds,
                }
            },);
            if (!removed.acknowledged || removed.deletedCount < 1) {
                throw new Error(`document-remove-error [${removed.deletedCount} of ${this.recordIds.length} removed]`)
            }
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
            return getResMessage("removeError", {
                message: `Error removing/deleting record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        }
    }

    async removeRecordByParams(): Promise<ResponseMessage> {
        if (!this.queryParams || isEmptyObject(this.queryParams)) {
            return getResMessage("deleteError", {message: "Valid queryParams required"});
        }
        // delete/remove records and log in audit-table
        try {
            const appDbColl = this.dbClient.db(this.dbName).collection(this.tableName);
            const removed = await appDbColl.deleteMany(this.queryParams,);
            if (!removed.acknowledged || removed.deletedCount < 1) {
                throw new Error(`document-remove-error [${removed.deletedCount} of ${this.currentRecs.length} removed]`)
            }
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
            return getResMessage("removeError", {
                message: `Error removing/deleting record(s): ${e.message ? e.message : ""}`,
                value  : e,
            });
        }
    }

}

// factory function/constructor
function newDeleteRecord(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new DeleteRecord(params, options);
}

export { DeleteRecord, newDeleteRecord };
