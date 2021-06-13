import MongooseController from './mongooseController';
import MongooseQueryUtils from '../database/utils/mongooseQueryUtils';
import { IControllerOptions } from './IControllerOptions';
import lodash from 'lodash';
import Task from '../database/models/task';
import UserController from './userController';
import Project from '../database/models/project';

class TaskController {
  
  static async create(data, options: IControllerOptions) {
    const currentTenant = MongooseController.getCurrentTenant(
      options,
    );

    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    const [record] = await Task(
      options.database,
    ).create(
      [
        {
          ...data,
          tenant: currentTenant.id,
          createdBy: currentUser.id,
          updatedBy: currentUser.id,
        }
      ],
      options,
    );

    await MongooseController.refreshTwoWayRelationOneToMany(
      record,
      'project',
      Project(options.database),
      'task',
      options,
    );    

    return this.findById(record.id, options);
  }

  static async filterIdInTenant(
    id,
    options: IControllerOptions,
  ) {
    return lodash.get(
      await this.filterIdsInTenant([id], options),
      '[0]',
      null,
    );
  }

  static async filterIdsInTenant(
    ids,
    options: IControllerOptions,
  ) {
    if (!ids || !ids.length) {
      return [];
    }

    const currentTenant =
      MongooseController.getCurrentTenant(options);

    const records = await Task(options.database)
      .find({
        _id: { $in: ids },
        tenant: currentTenant.id,
      })
      .select(['_id']);

    return records.map((record) => record._id);
  }

  static async findById(id, options: IControllerOptions) {
    const currentTenant = MongooseController.getCurrentTenant(
      options,
    );

    let record = await MongooseController.wrapWithSessionIfExists(
      Task(options.database)
        .findOne({_id: id, tenant: currentTenant.id})
      .populate('assignedTo')
      .populate('project'),
      options,
    );

    if (!record) {
      throw new Error("task not found");
    }

    return this._mapRelationshipsAndFillDownloadUrl(record);
  }

  static async findAllAutocomplete(search, limit, options: IControllerOptions) {
    const currentTenant = MongooseController.getCurrentTenant(
      options,
    );

    let criteriaAnd: Array<any> = [{
      tenant: currentTenant.id,
    }];

    if (search) {
      criteriaAnd.push({
        $or: [
          {
            _id: MongooseQueryUtils.uuid(search),
          },
          
        ],
      });
    }

    const sort = MongooseQueryUtils.sort('id_ASC');
    const limitEscaped = Number(limit || 0) || undefined;

    const criteria = { $and: criteriaAnd };

    const records = await Task(options.database)
      .find(criteria)
      .limit(limitEscaped)
      .sort(sort);

    return records.map((record) => ({
      id: record.id,
      label: record.id,
    }));
  }
  static async _mapRelationshipsAndFillDownloadUrl(record) {
    if (!record) {
      return null;
    }

    const output = record.toObject
      ? record.toObject()
      : record;



    output.assignedTo = UserController.cleanupForRelationships(output.assignedTo);

    return output;
  }
}

export default TaskController;
