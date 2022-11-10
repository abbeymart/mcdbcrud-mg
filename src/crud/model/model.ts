/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-08-05
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: simple mongodb model-class for documents' relations/ref-integrity
 */

import { UniqueFieldsType, ModelOptionsType, ModelRelationType, ModelCrudOptionsType, } from "./modelTypes";
import { ActionParamsType, ExistParamsType } from "../types";
import { ObjectId } from "mongodb";

export class Model {
    private readonly collName: string;
    private readonly relations: Array<ModelRelationType>
    protected modelOptions: ModelOptionsType;
    protected uniqueFields: UniqueFieldsType;

    constructor(coll: string, relations: Array<ModelRelationType>, options: ModelCrudOptionsType = {}) {
        this.collName = coll;
        this.relations = relations;
        this.modelOptions = {
            timeStamp  : options.timeStamp ? options.timeStamp : true,
            actorStamp : options.actorStamp ? options.actorStamp : true,
            activeStamp: options.activeStamp ? options.activeStamp : true,
        };
        this.uniqueFields = options.uniqueFields ? options.uniqueFields : [];
    }

    // ***** instance methods: getters | setters *****
    get modelCollName(): string {
        return this.collName;
    }

    get modelRelations(): Array<ModelRelationType> {
        return this.relations;
    }

    get modelOptionValues(): ModelOptionsType {
        return this.modelOptions;
    }

    get modelUniqueFields(): UniqueFieldsType {
        return this.uniqueFields
    }

    // instance methods
    getParentRelations(): Array<ModelRelationType> {
        // extract relations/collections where targetColl === this.collName
        // sourceColl is the parentColl of this.collName(target/child)
        let parentRelations: Array<ModelRelationType> = [];
        if (this.modelRelations.length <= 0) {
            return parentRelations;
        }
        for (const item of this.modelRelations) {
            if (item.targetColl === this.modelCollName) {
                parentRelations.push(item);
            }
        }
        return parentRelations;
    }

    getChildRelations(): Array<ModelRelationType> {
        // extract relations/collections where sourceColl === this.collName
        // targetColl is the childColl of this.collName(source/parent)
        let childRelations: Array<ModelRelationType> = [];
        if (this.modelRelations.length <= 0) {
            return childRelations;
        }
        for (const item of this.modelRelations) {
            if (item.sourceColl === this.modelCollName) {
                childRelations.push(item);
            }
        }
        return childRelations;
    }

    getParentColls(): Array<string> {
        let parentColls: Array<string>;
        const parentRelations = this.getParentRelations();
        parentColls = parentRelations.map(rel => rel.sourceColl);
        return parentColls;
    }

    getChildColls(): Array<string> {
        let childColls: Array<string>;
        const childRelations = this.getChildRelations();
        childColls = childRelations.map(rel => rel.targetColl);
        return childColls;
    }

    computeExistParams(actionParams: ActionParamsType): ExistParamsType {
        // set the existParams for create or update action to determine record(s) uniqueness
        let existParams: ExistParamsType = [];
        actionParams.forEach((item) => {
            this.modelUniqueFields.forEach(params => {
                // compute the uniqueness object
                let uniqueObj: any = {};
                params.forEach(pItem => {
                    uniqueObj[pItem] = item[pItem]
                })
                if (item._id || item["_id"]) {
                    // add profile uniqueness object to the existParams
                    const idValue = new ObjectId((item._id || item["_id"]) as string)
                    existParams.push({
                        _id: {
                            $ne: idValue,
                        },
                        ...uniqueObj,
                    });
                } else {
                    existParams.push({
                        ...uniqueObj,
                    });
                }
            })
        });
        return existParams;
    }
}

// factory function
export function newModel(coll: string, relations: Array<ModelRelationType>, options: ModelCrudOptionsType = {}) {
    return new Model(coll, relations, options);
}
