import MongooseController from './mongooseController';
import MongooseQueryUtils from '../database/utils/mongooseQueryUtils';
import User from '../database/models/user';
import Tenant from '../database/models/tenant';
import Project from '../database/models/project';
import Task from '../database/models/task';
//import { v4 as uuid } from 'uuid';
import { isUserInTenant } from '../database/utils/userTenantUtils';
import { IControllerOptions } from './IControllerOptions';

const forbiddenTenantUrls = ['www'];

class TenantController {
  static async create(data, options: IControllerOptions) {
    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    // URL is required,
    data.url = data.url ;

    const existsUrl = Boolean(
      await this.count({ url: data.url }, options),
    );

    if (
      forbiddenTenantUrls.includes(data.url) ||
      existsUrl
    ) {
      throw new Error('tenant.url.exists');
    }

    const [record] = await Tenant(options.database).create(
      [
        {
          ...data,
          createdBy: currentUser.id,
          updatedBy: currentUser.id,
        }
      ],
      options,
    );

    return this.findById(record.id, {
      ...options,
    });
  }

  static async update(
    id,
    data,
    options: IControllerOptions,
  ) {
    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    if (!isUserInTenant(currentUser, id)) {
      throw new Error("user not found in this tenant");
    }

    const record = await this.findById(id, options);

    // When not multi-with-subdomain, the
    // from passes the URL as undefined.
    // This way it's ensured that the URL will
    // remain the old one
    data.url = data.url || record.url;

    const existsUrl = Boolean(
      await this.count(
        { url: data.url, _id: { $ne: id } },
        options,
      ),
    );

    if (
      forbiddenTenantUrls.includes(data.url) ||
      existsUrl
    ) {
      throw new Error('tenant.url.exists');
    }

    // Does not allow user to update the plan
    // only by updating the tenant
    delete data.plan;
    delete data.planStripeCustomerId;
    delete data.planUserId;
    delete data.planStatus;

    await Tenant(options.database).updateOne(
      { _id: id },
      {
        ...data,
        updatedBy: MongooseController.getCurrentUser(
          options,
        ).id,
      },
      options,
    );

    return await this.findById(id, options);
  }

  /**
   * Updates the Tenant Plan user.
   */
  static async updatePlanUser(
    id,
    planStripeCustomerId,
    planUserId,
    options: IControllerOptions,
  ) {
    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    const data = {
      planStripeCustomerId,
      planUserId,
      updatedBy: currentUser.id,
    };

    await Tenant(options.database).updateOne(
      { _id: id },
      data,
      options,
    );

    return await this.findById(id, options);
  }

  static async updatePlanStatus(
    planStripeCustomerId,
    plan,
    planStatus,
    options: IControllerOptions,
  ) {
    const data = {
      plan,
      planStatus,
      updatedBy: null,
    };

    const record = await MongooseController.wrapWithSessionIfExists(
      Tenant(options.database).findOne({
        planStripeCustomerId,
      }),
      options,
    );

    await Tenant(options.database).updateOne(
      { _id: record.id },
      data,
      options,
    );

    return await this.findById(record.id, options);
  }

  static async destroy(id, options: IControllerOptions) {
    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    if (!isUserInTenant(currentUser, id)) {
      throw new Error("user is not find in this tenant");
    }

    let record = await MongooseController.wrapWithSessionIfExists(
      Tenant(options.database).findById(id),
      options,
    );

    await Tenant(options.database).deleteOne(
      { _id: id },
      options,
    );

    await Project(options.database).deleteMany({ tenant: id }, options);

    await Task(options.database).deleteMany({ tenant: id }, options);

    await User(options.database).updateMany(
      {},
      {
        $pull: {
          tenants: { tenant: id },
        },
      },
      options,
    );
  }

  static async count(filter, options: IControllerOptions) {
    return MongooseController.wrapWithSessionIfExists(
      Tenant(options.database).countDocuments(filter),
      options,
    );
  }

  static async findById(id, options: IControllerOptions) {
    const record = await MongooseController.wrapWithSessionIfExists(
      Tenant(options.database).findById(id),
      options,
    );

    if (!record) {
      return record;
    }

    const output = record.toObject
      ? record.toObject()
      : record;

    return output;
  }

  static async findByUrl(url, options: IControllerOptions) {
    const record = await MongooseController.wrapWithSessionIfExists(
      Tenant(options.database).findOne({ url }),
      options,
    );

    if (!record) {
      return null;
    }

    const output = record.toObject
      ? record.toObject()
      : record;

    return output;
  }

  static async findDefault(options: IControllerOptions) {
    return Tenant(options.database).findOne();
  }

  static async findAndCountAll(
    { filter, limit = 0, offset = 0, orderBy = '' },
    options: IControllerOptions,
  ) {
    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    let criteriaAnd: any = [];

    criteriaAnd.push({
      _id: {
        $in: currentUser.tenants
          .filter((userTenant) =>
            ['invited', 'active'].includes(
              userTenant.status,
            ),
          )
          .map((userTenant) => userTenant.tenant.id),
      },
    });

    if (filter) {
      /*if (filter.id) {
        criteriaAnd.push({
          ['_id']: MongooseQueryUtils.uuid(filter.id),
        });
      }*/

      if (filter.name) {
        criteriaAnd.push({
          name: {
            $regex: MongooseQueryUtils.escapeRegExp(
              filter.name,
            ),
            $options: 'i',
          },
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
      orderBy || 'name_ASC',
    );

    const skip = Number(offset || 0) || undefined;
    const limitEscaped = Number(limit || 0) || undefined;
    const criteria = criteriaAnd.length
      ? { $and: criteriaAnd }
      : null;

    const rows = await Tenant(options.database)
      .find(criteria)
      .skip(skip)
      .limit(limitEscaped)
      .sort(sort);

    const count = await Tenant(
      options.database,
    ).countDocuments(criteria);

    return { rows, count };
  }

  static async findAllAutocomplete(
    search,
    limit,
    options: IControllerOptions,
  ) {
    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    let criteriaAnd: Array<any> = [
      {
        _id: {
          $in: currentUser.tenants.map(
            (userTenant) => userTenant.tenant.id,
          ),
        },
      },
    ];

    /*if (search) {
      criteriaAnd.push({
        $or: [
          {
            _id: MongooseQueryUtils.uuid(search),
          },
          {
            name: {
              $regex: MongooseQueryUtils.escapeRegExp(
                search,
              ),
              $options: 'i',
            },
          },
        ],
      });
    }*/

    const sort = MongooseQueryUtils.sort('name_ASC');
    const limitEscaped = Number(limit || 0) || undefined;

    const criteria = { $and: criteriaAnd };

    const records = await Tenant(options.database)
      .find(criteria)
      .limit(limitEscaped)
      .sort(sort);

    return records.map((record) => ({
      id: record.id,
      label: record['name'],
    }));
  }

  

  static _isUserInTenant(user, tenantId) {
    if (!user || !user.tenants) {
      return false;
    }

    return user.tenants.some(
      (tenantUser) =>
        String(tenantUser.tenant.id) === String(tenantId),
    );
  }
}

export default TenantController;
