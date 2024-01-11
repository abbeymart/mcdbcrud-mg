/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-04-05 | @Updated: 2020-05-16, 2023-11-22, 2024-01-06
 * @Company: mConnect.biz | @License: MIT
 * @Description: get records, by recordIds, queryParams, all | cache-in-memory
 */

// Import required module(s)
import { ObjectId } from "mongodb";
import { getHashCache, HashCacheParamsType, QueryHashCacheParamsType, setHashCache } from "@mconnect/mccache";
import { getResMessage, ResponseMessage } from "@mconnect/mcresponse";
import {isEmptyObject} from "./utils";
import Crud from "./Crud";
import {
    AuditLogParamsType, CrudOptionsType, CrudParamsType, GetRecordStats, GetResultType, LogRecordsType
} from "./types";

class GetRecord extends Crud {
    constructor(params: CrudParamsType, options: CrudOptionsType = {}) {
        super(params, options);
        // Set specific instance properties
    }

    /**
     * @function getRecord - gets records/documents by recordIds, queryParams or all records
     */
    async getRecord(): Promise<ResponseMessage> {
        // Check/validate the attributes / parameters
        const dbCheck = this.checkDb(this.appDb);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }
        const auditDbCheck = this.checkDb(this.auditDb);
        if (auditDbCheck.code !== "success") {
            return auditDbCheck;
        }

        // set maximum limit and default values per query
        if (this.limit < 1) {
            this.limit = 1;
        } else if (this.limit > this.maxQueryLimit) {
            this.limit = this.maxQueryLimit;
        }
        if (this.skip < 0) {
            this.skip = 0;
        }

        // exclude _id, if present, from the queryParams
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            const qParams = this.queryParams;
            const {_id, ...otherParams} = qParams; // exclude _id, if present
            this.queryParams = otherParams;
        }

        // check the audit-log settings - to perform audit-log (read/search info - params, keywords etc.)
        let logRes = getResMessage("noLog");
        if (this.logCrud || this.logRead) {
            const logRecs: LogRecordsType = {
                queryParam: this.queryParams,
                recordIds : this.recordIds,
            }
            const logParams: AuditLogParamsType = {
                logRecords: logRecs,
                tableName : this.tableName,
                logBy     : this.userId,
            }
            logRes = await this.transLog.readLog(logParams, this.userId);
        }
        // check cache for matching record(s), and return if exist
        if (this.cacheResult) {
            try {
                const cacheParams: QueryHashCacheParamsType = {
                    key : this.cacheKey,
                    hash: this.tableName,
                    by  : "hash",
                }
                const cacheRes = getHashCache<GetResultType>(cacheParams);
                if (cacheRes.ok && cacheRes.value) {
                    return getResMessage("success", {
                        value  : cacheRes.value,
                        message: "from cache",
                    });
                }
            } catch (e) {
                console.error("error from the cache: ", e.stack);
            }
        }

        // Get the collection-documents by docId(s)
        if (this.recordIds && this.recordIds.length > 0) {
            try {
                // id(s): convert string to ObjectId
                const recordIds = this.recordIds.map(id => new ObjectId(id));
                // use / activate database
                const appDbColl = this.appDb.collection(this.tableName);
                const result = await appDbColl.find({_id: {$in: recordIds}})
                    .skip(this.skip)
                    .limit(this.limit)
                    .project(this.projectParams)
                    .sort(this.sortParams)
                    .toArray();
                const totalDocsCount = await appDbColl.countDocuments();
                if (result.length > 0) {
                    // save copy in the cache
                    const stats: GetRecordStats = {
                        skip             : this.skip,
                        limit            : this.limit,
                        recordsCount     : result.length,
                        totalRecordsCount: totalDocsCount,
                    }
                    const resultValue: GetResultType = {
                        records: result,
                        stats,
                        logRes,
                    }
                    const cacheParams: HashCacheParamsType<GetResultType> = {
                        key   : this.cacheKey,
                        hash  : this.tableName,
                        value : resultValue,
                        expire: this.cacheExpire
                    }
                    this.cacheResult && setHashCache(cacheParams);
                    return getResMessage("success", {
                        value: resultValue,
                    });
                }
                return getResMessage("notFound");
            } catch (error) {
                return getResMessage("notFound", {
                    value: error,
                });
            }
        }
        // Get the collection-documents by queryParams
        if (this.queryParams && !isEmptyObject(this.queryParams)) {
            try {
                // use / activate database
                const appDbColl = this.appDb.collection(this.tableName);
                const result = await appDbColl.find(this.queryParams)
                    .skip(this.skip)
                    .limit(this.limit)
                    .project(this.projectParams)
                    .sort(this.sortParams)
                    .toArray();
                const totalDocsCount = await appDbColl.countDocuments();
                if (result.length > 0) {
                    // save copy in the cache
                    const stats: GetRecordStats = {
                        skip             : this.skip,
                        limit            : this.limit,
                        recordsCount     : result.length,
                        totalRecordsCount: totalDocsCount,
                    }
                    const resultValue: GetResultType = {
                        records: result,
                        stats,
                        logRes,
                    }
                    const cacheParams: HashCacheParamsType<GetResultType> = {
                        key   : this.cacheKey,
                        hash  : this.tableName,
                        value : resultValue,
                        expire: this.cacheExpire
                    }
                    this.cacheResult && setHashCache(cacheParams);
                    return getResMessage("success", {
                        value: resultValue,
                    });
                }
                return getResMessage("notFound");
            } catch (error) {
                return getResMessage("notFound", {
                    value: error,
                });
            }
        }
        // get all the collection-documents, up to the permissible limit
        try {
            // use / activate database
            const appDbColl = this.appDb.collection(this.tableName);
            const result = await appDbColl.find()
                .skip(this.skip)
                .limit(this.limit)
                .project(this.projectParams)
                .sort(this.sortParams)
                .toArray();
            const totalDocsCount = await appDbColl.countDocuments();
            if (result.length > 0) {
                // save copy in the cache
                const stats: GetRecordStats = {
                    skip             : this.skip,
                    limit            : this.limit,
                    recordsCount     : result.length,
                    totalRecordsCount: totalDocsCount,
                }
                const resultValue: GetResultType = {
                    records: result,
                    stats,
                    logRes,
                }
                const cacheParams: HashCacheParamsType<GetResultType> = {
                    key   : this.cacheKey,
                    hash  : this.tableName,
                    value : resultValue,
                    expire: this.cacheExpire
                }
                this.cacheResult && setHashCache(cacheParams);
                return getResMessage("success", {
                    value: resultValue,
                });
            }
            return getResMessage("notFound");
        } catch (error) {
            return getResMessage("notFound", {
                value: error,
            });
        }
    }
}

// factory function/constructor
function newGetRecord(params: CrudParamsType, options: CrudOptionsType = {}) {
    return new GetRecord(params, options);
}

export { GetRecord, newGetRecord };
