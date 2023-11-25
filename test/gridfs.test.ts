import {ObjectId, GridFSBucket,} from "mongodb";
import {appDbLocal, dbOptionsLocal} from "./config";
import { newDbMongo } from "../src";
import * as fs from "fs";

(async () => {
    // DB clients/handles
    const appDbInstance = newDbMongo(appDbLocal, dbOptionsLocal);

    const appDbHandle = await appDbInstance.openDb();

    // Upload
    const bucket = new GridFSBucket(appDbHandle, {bucketName: "fs"});
    // console.log("bucket: ", bucket)

    const upstream = bucket.openUploadStream("test2.txt", {
        metadata: { field: 'testFile', value: 'test2.txt' }
    });

    // fs.createReadStream('./test.txt').
    // pipe(bucket.openUploadStream('test.txt', {
    //     chunkSizeBytes: 1048576,
    //     metadata: { field: 'testFile', value: 'test.txt' }
    // }));

    console.log("upload-completed")

    // retrieve file information
    const cursor = bucket.find({});
    console.log("query-cursor: ", await cursor.toArray())
    let docId = new ObjectId()
    for await (const doc of cursor) {
        docId = doc._id
        console.log(doc);
    }
    console.log("query-completed")
    // Metadata includes:
    // The _id of the file
    // The name of the file (filename)
    // The length/size of the file
    // The upload date and time
    // A metadata document in which you can store any other information ([key: string]: any;)

    // download file, by filename
    // bucket.openDownloadStreamByName('test.txt').
    // pipe(fs.createWriteStream('./testOut.txt'));
    // or via _id of the file (preferred)
    if (docId) {
        bucket.openDownloadStream(docId).pipe(fs.createWriteStream('./outputFile'));
    }

    // rename file
    // await bucket.rename(new ObjectId("60edece5e06275bf0463aaf3"), "newFileName");

    // delete file
    // await bucket.delete(new ObjectId("60edece5e06275bf0463aaf3"));

    // delete bucket FS
    // await bucket.drop();

})();
