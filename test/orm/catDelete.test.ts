import { assertEquals, mcTest, postTestResult, } from "../../test_deps.ts";
import { CrudParamsType, newDbMongo, AuditType } from "../../src/index.ts";
import {
    categoryColl, CategoryModel, DeleteCategoryWithSubItemById, DeleteGroupWithCategoriesById,
    groupColl,
} from "./testData.ts";
import { appDb, auditDb, dbOptions } from "../config/secure/config.ts";
import { auditColl, crudParamOptions, testUserInfo } from "../testData.ts";

(async () => {
    // DB clients/handles
    const appDbInstance = newDbMongo(appDb, dbOptions);
    const auditDbInstance = newDbMongo(auditDb, dbOptions);

    const appDbHandle = await appDbInstance.openDb();
    const appDbClient = await appDbInstance.mgServer();
    const auditDbHandle = await auditDbInstance.openDb();
    const auditDbClient = await auditDbInstance.mgServer();

    const crudParams: CrudParamsType<AuditType> = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDb.database || "",
        coll       : categoryColl,
        userInfo   : testUserInfo,
        docIds     : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDb.database;
    crudParamOptions.auditColl = auditColl;

    await mcTest({
        name    : "should return subItems for document with related-child-collection (i.e. foreignKey):",
        testFunc: async () => {
            crudParams.coll = groupColl
            crudParams.docIds = [DeleteGroupWithCategoriesById]
            crudParams.queryParams = {}
            const res = await CategoryModel.delete(crudParams, crudParamOptions);
            console.log("delete-by-id-res: ", res)
            assertEquals(res.code, "subItems", `res-code should be subItems:`);
        }
    });

    await mcTest({
        name    : "should return subItems for document with sub-items (i.e. parentId):",
        testFunc: async () => {
            crudParams.coll = categoryColl
            crudParams.docIds = [DeleteCategoryWithSubItemById]
            crudParams.queryParams = {}
            const res = await CategoryModel.delete(crudParams, crudParamOptions);
            console.log("delete-by-id-res: ", res)
            const resCode = res.code === "subItems"
            assertEquals(resCode, true, `res-code should be subItems:`);
            assertEquals(res.code, "subItems", `res-code should be subItems:`);
        }
    });


    postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
