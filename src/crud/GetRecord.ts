/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-04-05 | @Updated: 2020-05-16
 * @Company: mConnect.biz | @License: MIT
 * @Description: get records, by docIds, queryParams, all | cache-in-memory
 */

// Import required module(s)
import {ObjectId} from "mongodb";
import {getHashCache, setHashCache} from "@mconnect/mccache";
import {getResMessage, ResponseMessage} from "@mconnect/mcresponse";
import {isEmptyObject} from "../orm";
import Crud from "./Crud";
import {CrudOptionsType, CrudParamsType, GetRecordStats, GetResultType, LogDocumentsType} from "./types";

class GetRecord extends Crud {
    constructor(params: CrudParamsType, options: CrudOptionsType = {}) {
        super(params, options);
        // Set specific instance properties
    }

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
        const accessDbCheck = this.checkDb(this.accessDb);
        if (accessDbCheck.code !== "success") {
            return accessDbCheck;
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

        // check read permission
        // let roleServices: RoleServiceResponseType;

        // exclude _id, if present, from the queryParams
        if (this.queryParams && Object.keys(this.queryParams).length > 0) {
            const qParams = this.queryParams;
            const {_id, ...otherParams} = qParams; // exclude _id, if present
            this.queryParams = otherParams;
        }

        // check the audit-log settings - to perform audit-log (read/search info - params, keywords etc.)
        let logRes = getResMessage("unknown");
        if (this.logRead && this.queryParams && !isEmptyObject(this.queryParams)) {
            const logDocuments: LogDocumentsType = {
                queryParam: this.queryParams,
            }
            logRes = await this.transLog.readLog(this.coll, logDocuments, this.userId);
        } else if (this.logRead && this.docIds && this.docIds.length > 0) {
            const logDocuments: LogDocumentsType = {
                docIds: this.docIds,
            }
            logRes = await this.transLog.readLog(this.coll, logDocuments, this.userId);
        }

        // check cache for matching record(s), and return if exist
        if (this.cacheResult) {
            try {
                const cacheRes = getHashCache(this.cacheKey, this.coll);
                if (cacheRes && cacheRes.value) {
                    console.log("cache-items-before-query: ", cacheRes.value[0]);
                    return getResMessage("success", {
                        value  : cacheRes.value,
                        message: "from cache",
                    });
                }
            } catch (e) {
                console.error("error from the cache: ", e.stack);
            }
        }

        // Get the item(s) by docId(s), queryParams or all items
        if (this.docIds && this.docIds.length > 0) {
            try {
                // id(s): convert string to ObjectId
                const docIds = this.docIds.map(id => new ObjectId(id));
                // use / activate database
                const appDbColl = this.appDb.collection(this.coll);
                const result = await appDbColl.find({_id: {$in: docIds}})
                    .skip(this.skip)
                    .limit(this.limit)
                    .project(this.projectParams)
                    .sort(this.sortParams)
                    .toArray();
                const totalDocsCount = await appDbColl.countDocuments();
                if (result.length > 0 && totalDocsCount >= result.length) {
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
                    await setHashCache(this.cacheKey, this.coll, resultValue, this.cacheExpire);
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
        if (this.queryParams && Object.keys(this.queryParams).length > 0) {
            try {
                // use / activate database
                const appDbColl = this.appDb.collection(this.coll);
                const result = await appDbColl.find(this.queryParams)
                    .skip(this.skip)
                    .limit(this.limit)
                    .project(this.projectParams)
                    .sort(this.sortParams)
                    .toArray();
                const totalDocsCount = await appDbColl.countDocuments();
                if (result.length > 0 && totalDocsCount >= result.length) {
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
                    await setHashCache(this.cacheKey, this.coll, resultValue, this.cacheExpire);
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
        // get all records, up to the permissible limit
        try {
            // use / activate database
            const appDbColl = this.appDb.collection(this.coll);
            const result = await appDbColl.find()
                .skip(this.skip)
                .limit(this.limit)
                .project(this.projectParams)
                .sort(this.sortParams)
                .toArray();
            const totalDocsCount = await appDbColl.countDocuments();
            if (result.length > 0 && totalDocsCount >= result.length) {
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
                await setHashCache(this.cacheKey, this.coll, resultValue, this.cacheExpire);
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

    async getRecordsById(): Promise<ResponseMessage> {
        // Check/validate the attributes / parameters
        const dbCheck = this.checkDb(this.appDb);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }
        const auditDbCheck = this.checkDb(this.auditDb);
        if (auditDbCheck.code !== "success") {
            return auditDbCheck;
        }
        const accessDbCheck = this.checkDb(this.accessDb);
        if (accessDbCheck.code !== "success") {
            return accessDbCheck;
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

        // check read permission
        // let roleServices: RoleServiceResponseType;

        if (!this.docIds || this.docIds.length < 1) {
            return getResMessage("paramsError", {
                message: "docIds required",
            });
        }

        // check the audit-log settings - to perform audit-log (read/search info - params, keywords etc.)
        let logRes = getResMessage("unknown");
        if (this.logRead || this.logCrud) {
            const logDocuments: LogDocumentsType = {
                docIds: this.docIds,
            }
            logRes = await this.transLog.readLog(this.coll, logDocuments, this.userId);
        }

        // check cache for matching record(s), and return if exist
        if (this.cacheResult) {
            try {
                const cacheRes = getHashCache(this.cacheKey, this.coll);
                if (cacheRes && cacheRes.value) {
                    console.log("cache-items-before-query: ", cacheRes.value[0]);
                    return getResMessage("success", {
                        value  : cacheRes.value,
                        message: "from cache",
                    });
                }
            } catch (e) {
                console.error("error from the cache: ", e.stack);
            }
        }

        // Get the item(s) by docId(s)
        try {
            // id(s): convert string to ObjectId
            const docIds = this.docIds.map(id => new ObjectId(id));
            // use / activate database
            const appDbColl = this.appDb.collection(this.coll);
            const result = await appDbColl.find({_id: {$in: docIds}})
                .skip(this.skip)
                .limit(this.limit)
                .project(this.projectParams)
                .sort(this.sortParams)
                .toArray();
            const totalDocsCount = await appDbColl.countDocuments();
            if (result.length > 0 && totalDocsCount >= result.length) {
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
                await setHashCache(this.cacheKey, this.coll, resultValue, this.cacheExpire);
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

    async getRecordsByQueryParams(): Promise<ResponseMessage> {
        // Check/validate the attributes / parameters
        const dbCheck = this.checkDb(this.appDb);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }
        const auditDbCheck = this.checkDb(this.auditDb);
        if (auditDbCheck.code !== "success") {
            return auditDbCheck;
        }
        const accessDbCheck = this.checkDb(this.accessDb);
        if (accessDbCheck.code !== "success") {
            return accessDbCheck;
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

        // check read permission
        // let roleServices: RoleServiceResponseType;

        if (!this.queryParams || Object.keys(this.queryParams).length < 1) {
            return getResMessage("paramsError", {
                message: "docIds required",
            });
        }

        // exclude _id, if present, from the queryParams
        if (this.queryParams && Object.keys(this.queryParams).length > 0) {
            const qParams = this.queryParams;
            const {_id, ...otherParams} = qParams; // exclude _id, if present
            this.queryParams = otherParams;
        }

        // check the audit-log settings - to perform audit-log (read/search info - params, keywords etc.)
        let logRes = getResMessage("unknown");
        if ((this.logRead || this.logCrud) && this.queryParams && !isEmptyObject(this.queryParams)) {
            const logDocuments: LogDocumentsType = {
                queryParam: this.queryParams,
            }
            logRes = await this.transLog.readLog(this.coll, logDocuments, this.userId);
        }

        // check cache for matching record(s), and return if exist
        if (this.cacheResult) {
            try {
                const cacheRes = getHashCache(this.cacheKey, this.coll);
                if (cacheRes && cacheRes.value) {
                    console.log("cache-items-before-query: ", cacheRes.value[0]);
                    return getResMessage("success", {
                        value  : cacheRes.value,
                        message: "from cache",
                    });
                }
            } catch (e) {
                console.error("error from the cache: ", e.stack);
            }
        }

        // Get the item(s) by queryParams
        try {
            // use / activate database
            const appDbColl = this.appDb.collection(this.coll);
            const result = await appDbColl.find(this.queryParams)
                .skip(this.skip)
                .limit(this.limit)
                .project(this.projectParams)
                .sort(this.sortParams)
                .toArray();
            const totalDocsCount = await appDbColl.countDocuments();
            if (result.length > 0 && totalDocsCount >= result.length) {
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
                await setHashCache(this.cacheKey, this.coll, resultValue, this.cacheExpire);
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
        // get all records, up to the permissible limit
    }

    async getAllRecords(): Promise<ResponseMessage> {
        // Check/validate the attributes / parameters
        const dbCheck = this.checkDb(this.appDb);
        if (dbCheck.code !== "success") {
            return dbCheck;
        }
        const auditDbCheck = this.checkDb(this.auditDb);
        if (auditDbCheck.code !== "success") {
            return auditDbCheck;
        }
        const accessDbCheck = this.checkDb(this.accessDb);
        if (accessDbCheck.code !== "success") {
            return accessDbCheck;
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

        // check read permission
        // let roleServices: RoleServiceResponseType;

        // exclude _id, if present, from the queryParams
        if (this.queryParams && Object.keys(this.queryParams).length > 0) {
            const qParams = this.queryParams;
            const {_id, ...otherParams} = qParams; // exclude _id, if present
            this.queryParams = otherParams;
        }

        // check the audit-log settings - to perform audit-log (read/search info - params, keywords etc.)
        let logRes = getResMessage("unknown");
        if (this.logRead || this.logCrud) {
            const logDocuments: LogDocumentsType = {
                queryParam: {},
            }
            logRes = await this.transLog.readLog(this.coll, logDocuments, this.userId);
        }
        // check cache for matching record(s), and return if exist
        if (this.cacheResult) {
            try {
                const cacheRes = getHashCache(this.cacheKey, this.coll);
                if (cacheRes && cacheRes.value) {
                    console.log("cache-items-before-query: ", cacheRes.value[0]);
                    return getResMessage("success", {
                        value  : cacheRes.value,
                        message: "from cache",
                    });
                }
            } catch (e) {
                console.error("error from the cache: ", e.stack);
            }
        }
        // get all records, up to the permissible limit
        try {
            // use / activate database
            const appDbColl = this.appDb.collection(this.coll);
            const result = await appDbColl.find()
                .skip(this.skip)
                .limit(this.limit)
                .project(this.projectParams)
                .sort(this.sortParams)
                .toArray();
            const totalDocsCount = await appDbColl.countDocuments();
            if (result.length > 0 && totalDocsCount >= result.length) {
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
                await setHashCache(this.cacheKey, this.coll, resultValue, this.cacheExpire);
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

export {GetRecord, newGetRecord};
