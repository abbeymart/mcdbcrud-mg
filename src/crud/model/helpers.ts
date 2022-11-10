/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-08-04
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mc-central-ts: model helper methods
 */

import * as fs from "fs";
import { ModelRelationType } from "./modelTypes";

let relationsDb: Set<ModelRelationType>;

export const modelHelper = {
    saveDbRelations(relations: Array<ModelRelationType>): Set<ModelRelationType> {
        try {
            // retrieve the relationsDb from localDb-store
            const relationsJson = fs.readFileSync("relationsDb.json");

            relationsDb = JSON.parse(relationsJson.toString());

            // add the model relations to the relationsDb (repository)
            for (const item of relations) {
                relationsDb.add(item);
            }
            // write to the json file
            fs.writeFileSync("relationsDb.json", JSON.stringify(relationsDb));

            // return the relationsDb | to be used for CRUD operations
            return relationsDb;
        } catch (e) {
            console.error(e);
            throw new Error(e.message);
            // return  relationsDb;
        }
    },

    getDbRelations(): Set<ModelRelationType> {
        try {
            // retrieve the relationsDb from localDb-store
            const relationsJson = fs.readFileSync("relationsDb.json");

            relationsDb = JSON.parse(relationsJson.toString());

            // return the relationsDb | to be used for CRUD operations
            return relationsDb;
        } catch (e) {
            console.error(e);
            throw new Error(e.message);
        }
    },

    saveModelRelations(modelRelations: Array<ModelRelationType>) {
        // store relations information in a shared repository to reference for crud operations
        try {
            this.saveDbRelations(modelRelations);
        } catch (e) {
            throw new Error(e.mssage);
        }
    },

    getModelRelations(): Set<ModelRelationType> {
        try {
            return this.getDbRelations();
        } catch (e) {
            throw new Error(e.mssage);
        }
    },

    getParentRelations(modelCollName: string): Array<ModelRelationType> {
        // extract relations/collections where targetColl === collName
        // sourceColl is the parentColl of collName(target/child)
        let parentRelations: Array<ModelRelationType> = [];
        try {
            const modelRelations = this.getModelRelations();
            for (const item of modelRelations) {
                if (item.targetColl === modelCollName) {
                    parentRelations.push(item);
                }
            }
            return parentRelations;
        } catch (e) {
            throw new Error(e.mssage);
        }
    },

    getChildRelations(modelCollName: string): Array<ModelRelationType> {
        // extract relations/collections where sourceColl === collName
        // targetColl is the childColl of collName(source/parent)
        let childRelations: Array<ModelRelationType> = [];
        try {
            const modelRelations = this.getModelRelations();
            for (const item of modelRelations) {
                if (item.sourceColl === modelCollName) {
                    childRelations.push(item);
                }
            }
            return childRelations;
        } catch (e) {
            throw new Error(e.mssage);
        }
    },

    getParentColls(modelCollName: string): Array<string> {
        let parentColls: Array<string>;
        const parentRelations = this.getParentRelations(modelCollName);
        parentColls = parentRelations.map(rel => rel.sourceColl);
        return parentColls;
    },

    getChildColls(modelCollName: string): Array<string> {
        let childColls: Array<string>;
        const childRelations = this.getChildRelations(modelCollName);
        childColls = childRelations.map(rel => rel.targetColl);
        return childColls;
    },

}
