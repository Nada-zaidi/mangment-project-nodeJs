import MongooseController from './mongooseController';
import MongooseQueryUtils from '../database/utils/mongooseQueryUtils';
import { IControllerOptions } from './IControllerOptions';
import lodash from 'lodash';
import Project from '../database/models/project';
import UserController from './userController';
import Task from '../database/models/task';

class ProjectController {
  
  static async create(data, options: IControllerOptions) {
    const currentTenant = MongooseController.getCurrentTenant(
      options,
    );

    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    const [record] = await Project(
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

    await MongooseController.refreshTwoWayRelationManyToOne(
      record,
      Project(options.database),
      'task',
      Task(options.database),
      'project',
      options,
    );    

    return this.findById(record.id, options);
  }

  static async update(id, data, options: IControllerOptions) {
    const currentTenant = MongooseController.getCurrentTenant(
      options,
    );

    let record = await MongooseController.wrapWithSessionIfExists(
      Project(options.database).findOne({_id: id, tenant: currentTenant.id}),
      options,
    );

    if (!record) {
      throw new Error("project not found");
    }

    await Project(options.database).updateOne(
      { _id: id },
      {
        ...data,
        updatedBy: MongooseController.getCurrentUser(
          options,
        ).id,
      },
      options,
    );

    record = await this.findById(id, options);

    await MongooseController.refreshTwoWayRelationManyToOne(
      record,
      Project(options.database),
      'task',
      Task(options.database),
      'project',
      options,
    );

    return record;
  }

  static async destroy(id, options: IControllerOptions) {
    const currentTenant = MongooseController.getCurrentTenant(
      options,
    );

    let record = await MongooseController.wrapWithSessionIfExists(
      Project(options.database).findOne({_id: id, tenant: currentTenant.id}),
      options,
    );

    if (!record) {
      throw new Error("project not found");
    }

    await Project(options.database).deleteOne({ _id: id }, options);


    await MongooseController.destroyRelationToOne(
      id,
      Task(options.database),
      'project',
      options,
    );
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

    const records = await Project(options.database)
      .find({
        _id: { $in: ids },
        tenant: currentTenant.id,
      })
      .select(['_id']);

    return records.map((record) => record._id);
  }

  static async count(filter, options: IControllerOptions) {
    const currentTenant = MongooseController.getCurrentTenant(
      options,
    );

    return MongooseController.wrapWithSessionIfExists(
      Project(options.database).countDocuments({
        ...filter,
        tenant: currentTenant.id,
      }),
      options,
    );
  }

  static async findById(id, options: IControllerOptions) {
    const currentTenant = MongooseController.getCurrentTenant(
      options,
    );

    let record = await MongooseController.wrapWithSessionIfExists(
      Project(options.database)
        .findOne({_id: id, tenant: currentTenant.id})
      .populate('admins')
      .populate('usersList')
      .populate('statut')
      .populate('task'),
      options,
    );

    if (!record) {
      throw new Error("project not found");
    }

    return this._mapRelationshipsAndFillDownloadUrl(record);
  }

  static async findAndCountAll(
    { filter, limit = 0, offset = 0, orderBy = '' },
    options: IControllerOptions,
  ) {
    const currentTenant = MongooseController.getCurrentTenant(
      options,
    );

    let criteriaAnd: any = [];
    
    criteriaAnd.push({
      tenant: currentTenant.id,
    });

    if (filter) {
      if (filter.id) {
        criteriaAnd.push({
          ['_id']: MongooseQueryUtils.uuid(filter.id),
        });
      }

      if (filter.title) {
        criteriaAnd.push({
          title: {
            $regex: MongooseQueryUtils.escapeRegExp(
              filter.title,
            ),
            $options: 'i',
          },
        });
      }

      if (filter.description) {
        criteriaAnd.push({
          description: {
            $regex: MongooseQueryUtils.escapeRegExp(
              filter.description,
            ),
            $options: 'i',
          },
        });
      }

      if (filter.admins) {
        criteriaAnd.push({
          admins: MongooseQueryUtils.uuid(
            filter.admins,
          ),
        });
      }

      if (filter.usersList) {
        criteriaAnd.push({
          usersList: MongooseQueryUtils.uuid(
            filter.usersList,
          ),
        });
      }

      if (filter.statut) {
        criteriaAnd.push({
          statut: MongooseQueryUtils.uuid(
            filter.statut,
          ),
        });
      }

      if (filter.createdAtRange) {
        const [start, end] = filter.createdAtRange;

        if (
          start !== undefined &&
          start !== null &&
          start !== ''
        ) {
          criteriaAnd.push({
            ['createdAt']: {
              $gte: start,
            },
          });
        }

        if (
          end !== undefined &&
          end !== null &&
          end !== ''
        ) {
          criteriaAnd.push({
            ['createdAt']: {
              $lte: end,
            },
          });
        }
      }
    }

    const sort = MongooseQueryUtils.sort(
      orderBy || 'createdAt_DESC',
    );

    const skip = Number(offset || 0) || undefined;
    const limitEscaped = Number(limit || 0) || undefined;
    const criteria = criteriaAnd.length
      ? { $and: criteriaAnd }
      : null;

    let rows = await Project(options.database)
      .find(criteria)
      .skip(skip)
      .limit(limitEscaped)
      .sort(sort)
      .populate('admins')
      .populate('usersList')
      .populate('statut')
      .populate('task');

    const count = await Project(
      options.database,
    ).countDocuments(criteria);

    rows = await Promise.all(
      rows.map(this._mapRelationshipsAndFillDownloadUrl),
    );

    return { rows, count };
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

    const records = await Project(options.database)
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



    output.admins = UserController.cleanupForRelationships(output.admins);

    output.usersList = UserController.cleanupForRelationships(output.usersList);

    return output;
  }
}

export default ProjectController;
