/**
 * @Author: abbeymart | Abi Akindele | @Created: 2018-11-19 | @Updated: 2019-06-15, 2023-11-22
 * @Company: mConnect.biz | @License: MIT
 * @Description: bulk load records / documents, strictly for server-side(admin) ETL tasks
 */

// Import required module/function(s)
import { Db } from "mongodb";
import { getParamsMessage, getResMessage, MessageCodes, ResponseMessage } from "@mconnect/mcresponse";
import { isEmptyObject } from "../orm";
import { validateLoadParams } from "./ValidateCrudParam";
import { checkDb } from "../dbc";
import { ActionParamsType, CrudOptionsType, CrudParamsType, } from "./types";

class LoadRecord {
    protected params: CrudParamsType;
    protected appDb: Db;
    protected coll: string;
    protected actionParams: ActionParamsType;
    protected maxQueryLimit: number;

    constructor(params: CrudParamsType, options: CrudOptionsType = {}) {
        this.params = params;
        this.appDb = params.appDb;
        this.coll = params.coll;
        this.actionParams = params && params.actionParams ? params.actionParams : [];
        this.maxQueryLimit = options && options.maxQueryLimit ? options.maxQueryLimit : 10000;
    }

    async deleteRecord(): Promise<ResponseMessage<any>> {
        // Check/validate the attributes / parameters
        const dbCheck = checkDb(this.appDb);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }
        try {
            // use / activate database-collection
            const appDbColl = this.appDb.collection(this.coll);
            // clear the current collection documents/records, for refresh
            const deleteRes = await appDbColl.deleteMany({});
            if (deleteRes.acknowledged) {
                return  getResMessage("success", {
                    message: `${this.coll} collection - ${deleteRes.deletedCount} documents deleted successfully. Ready for data/documents refresh.`
                })
            }
            return  getResMessage("deleteError", {
                message: `Deletion task not acknowledged for ${this.coll}. Review system-error-log and retry.`
            })
        } catch (e) {
            return getResMessage('insertError', {
                message: `Error-inserting/creating new record(s). Please retry. ${e.message}`,
                value  : {
                    error: e,
                },
            });
        }
    }
    async loadRecord(): Promise<ResponseMessage<any>> {
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
        if (totalRecordCount > this.maxQueryLimit) {
            errors.maxQueryLimit = `${this.actionParams.length} records load-request, exceeded ${this.maxQueryLimit} limit. 
        Please do not send more than ${this.maxQueryLimit} records to load at a time`;
        }
        if (!isEmptyObject(errors)) {
            return getParamsMessage(errors, MessageCodes.paramsError);
        }

        // create/load multiple records
        if (totalRecordCount > 0) {
            // check if items/records exist using the existParams/actionParams
            try {
                // use / activate database-collection
                const appDbColl = this.appDb.collection(this.coll);
                // refresh (insert/create) new multiple records
                const records = await appDbColl.insertMany(this.actionParams);
                if (records.insertedCount > 0) {
                    return getResMessage('success', {
                        message: `${records.insertedCount} of ${totalRecordCount} record(s) created successfully.`,
                        value  : {
                            docCount  : records.insertedCount,
                            totalCount: totalRecordCount,
                        },
                    });
                }
                return getResMessage('insertError', {
                    message: 'Error-inserting/creating new record(s). Please retry.',
                    value  : {
                        docCount: records.insertedCount,
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
        // return insertError
        return getResMessage('insertError', {
            message: 'No records inserted. Please retry.',
        });
    }

}

// factory function
function newLoadRecord(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new LoadRecord(params, options);
}

export { LoadRecord, newLoadRecord };
