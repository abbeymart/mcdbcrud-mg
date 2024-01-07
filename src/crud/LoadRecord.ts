/**
 * @Author: abbeymart | Abi Akindele | @Created: 2018-11-19 | @Updated: 2019-06-15, 2023-11-22, 2024-01-06
 * @Company: mConnect.biz | @License: MIT
 * @Description: bulk load records / documents, strictly for server-side(admin) ETL tasks
 */

// Import required module/function(s)
import { Db } from "mongodb";
import { getParamsMessage, getResMessage, MessageCodes, ResponseMessage } from "@mconnect/mcresponse";
import {isEmptyObject} from "./utils";
import { validateLoadParams } from "./";
import { checkDb } from "../dbc";
import { ActionParamsType, CrudOptionsType, CrudParamsType, } from "./types";

class LoadRecord {
    protected params: CrudParamsType;
    protected appDb: Db;
    protected tableName: string;
    protected actionParams: ActionParamsType;
    protected maxQueryLimit: number;

    constructor(params: CrudParamsType, options: CrudOptionsType = {}) {
        this.params = params;
        this.appDb = params.appDb;
        this.tableName = params.tableName;
        this.actionParams = params && params.actionParams ? params.actionParams : [];
        this.maxQueryLimit = options && options.maxQueryLimit ? options.maxQueryLimit : 10000;
    }

    async deleteRecord(): Promise<ResponseMessage> {
        // Check/validate the attributes / parameters
        const dbCheck = checkDb(this.appDb);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }
        try {
            // use / activate database-collection
            const appDbColl = this.appDb.collection(this.tableName);
            // clear the current collection documents/records, for refresh
            const deleteRes = await appDbColl.deleteMany({});
            if (deleteRes.acknowledged) {
                return getResMessage("success", {
                    message: `${this.tableName} table/collection - ${deleteRes.deletedCount} records/documents deleted successfully. Ready for data(record/documents) refresh.`
                })
            }
            return getResMessage("deleteError", {
                message: `Deletion task not acknowledged for ${this.tableName}. Review system-error-log or response-message and retry.`
            })
        } catch (e) {
            return getResMessage('insertError', {
                message: `Error deleting records/documents. Please retry. ${e.message}`,
                value  : {
                    error: e,
                },
            });
        }
    }

    async loadRecord(): Promise<ResponseMessage> {
        // Check/validate the attributes / parameters
        const dbCheck = checkDb(this.appDb);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }

        // limit maximum records to bulk-load to 10,000 records
        if (this.maxQueryLimit > 10000) {
            this.maxQueryLimit = 10000;
        }

        const totalRecordCount = this.actionParams.length;
        const errors = validateLoadParams(this.params);
        // validate total-record-count
        if (totalRecordCount > this.maxQueryLimit || totalRecordCount < 1) {
            errors.maxQueryLimit = `${totalRecordCount} records load-request, exceeded ${this.maxQueryLimit} limit. 
        Please send valid records not more than ${this.maxQueryLimit} records to load at a time`;
        }
        if (!isEmptyObject(errors)) {
            return getParamsMessage(errors, MessageCodes.paramsError);
        }

        // create/load multiple records
        try {
            // use / activate database-collection
            const appDbColl = this.appDb.collection(this.tableName);
            // refresh (insert/create) new multiple records
            const records = await appDbColl.insertMany(this.actionParams);
            if (records.insertedCount > 0) {
                return getResMessage('success', {
                    message: `${records.insertedCount} of ${totalRecordCount} record(s) created successfully.`,
                    value  : {
                        recordsCount     : records.insertedCount,
                        totalRecordsCount: totalRecordCount,
                    },
                });
            }
            return getResMessage('insertError', {
                message: 'Error-inserting/creating new record(s). Please retry.',
                value  : {
                    recordsCount     : records.insertedCount,
                    totalRecordsCount: totalRecordCount,
                },
            });
        } catch (error) {
            return getResMessage('insertError', {
                message: 'Error-inserting/creating new record(s). Please retry.',
                value  : {
                    error,
                },
            });
        }
    }
}

// factory function
function newLoadRecord(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new LoadRecord(params, options);
}

export { LoadRecord, newLoadRecord };
