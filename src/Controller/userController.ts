import MongooseController from './mongooseController';
import User from '../database/models/user';
import MongooseQueryUtils from '../database/utils/mongooseQueryUtils';
import crypto from 'crypto';
import { isUserInTenant } from '../database/utils/userTenantUtils';
import { IControllerOptions } from './IControllerOptions';
import lodash from 'lodash';
export default class UserController {
  static async create(data, options: IControllerOptions) {
    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    data = this._preSave(data);

    const [user] = await User(options.database).create(
      [
        {
          email: data.email,
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          fullName: data.fullName || null,
          createdBy: currentUser.id,
          updatedBy: currentUser.id,
        },
      ],
      options,
    );


    return this.findById(user.id, {
      ...options,
      bypassPermissionValidation: true,
    });
  }

  static async createFromAuth(
    data,
    options: IControllerOptions,
  ) {
    data = this._preSave(data);

    let [user] = await User(options.database).create(
      [
        {
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          fullName: data.fullName,
        }
      ],
      options,
    );

    delete user.password;

    return this.findById(user.id, {
      ...options,
      bypassPermissionValidation: true,
    });
  }

  static async updatePassword(
    id,
    password,
    invalidateOldTokens: boolean,
    options: IControllerOptions,
  ) {
    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    const data: any = {
      password,
      updatedBy: currentUser.id,
    };

    if (invalidateOldTokens) {
      data.jwtTokenInvalidBefore = new Date();
    }

    await User(options.database).updateOne({ _id: id }, data, options);


    return this.findById(id, {
      ...options,
      bypassPermissionValidation: true,
    });
  }

  static async generateEmailVerificationToken(
    email,
    options: IControllerOptions,
  ) {
    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    const { id } = await this.findByEmail(
      email,
      options,
    );

    const emailVerificationToken = crypto
      .randomBytes(20)
      .toString('hex');
    const emailVerificationTokenExpiresAt =
      Date.now() + 24 * 60 * 60 * 1000;

    await User(options.database).updateOne(
      { _id: id },
      {
        emailVerificationToken,
        emailVerificationTokenExpiresAt,
        updatedBy: currentUser.id,
      },
      options,
    );

    return emailVerificationToken;
  }

  static async generatePasswordResetToken(
    email,
    options: IControllerOptions,
  ) {
    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    const { id } = await this.findByEmail(
      email,
      options,
    );

    const passwordResetToken = crypto
      .randomBytes(20)
      .toString('hex');
    const passwordResetTokenExpiresAt =
      Date.now() + 24 * 60 * 60 * 1000;

    await User(options.database).updateOne(
      { _id: id },
      {
        passwordResetToken,
        passwordResetTokenExpiresAt,
        updatedBy: currentUser.id,
      },
      options,
    );


    return passwordResetToken;
  }

  static async update(
    id,
    data,
    options: IControllerOptions,
  ) {
    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    data = this._preSave(data);

    await User(options.database).updateOne(
      { _id: id },
      {
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        fullName: data.fullName || null,
        updatedBy: currentUser.id,
      },
      options,
    );

    const user = await this.findById(id, options);
    return user;
  }

  static async findByEmail(
    email,
    options: IControllerOptions,
  ) {
    return MongooseController.wrapWithSessionIfExists(
      User(options.database)
        .findOne({
          email: {
            $regex: new RegExp(
              `^${MongooseQueryUtils.escapeRegExp(email)}$`,
            ),
            $options: 'i',
          },
        })
        .populate('tenants.tenant'),
      options,
    );
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
      tenants: { $elemMatch: { tenant: currentTenant.id } },
    });

    if (filter) {
      if (filter.id) {
        criteriaAnd.push({
          ['_id']: MongooseQueryUtils.uuid(filter.id),
        });
      }

      if (filter.fullName) {
        criteriaAnd.push({
          ['fullName']: {
            $regex: MongooseQueryUtils.escapeRegExp(
              filter.fullName,
            ),
            $options: 'i',
          },
        });
      }

      if (filter.email) {
        criteriaAnd.push({
          ['email']: {
            $regex: MongooseQueryUtils.escapeRegExp(
              filter.email,
            ),
            $options: 'i',
          },
        });
      }

      if (filter.role) {
        criteriaAnd.push({
          tenants: { $elemMatch: { roles: filter.role } },
        });
      }

      if (filter.status) {
        criteriaAnd.push({
          tenants: {
            $elemMatch: { status: filter.status },
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
      orderBy || 'createdAt_DESC',
    );

    const skip = Number(offset || 0) || undefined;
    const limitEscaped = Number(limit || 0) || undefined;
    const criteria = criteriaAnd.length
      ? { $and: criteriaAnd }
      : null;

    let rows = await MongooseController.wrapWithSessionIfExists(
      User(options.database)
        .find(criteria)
        .skip(skip)
        .limit(limitEscaped)
        .sort(sort)
        .populate('tenants.tenant'),
      options,
    );

    const count = await MongooseController.wrapWithSessionIfExists(
      User(options.database).countDocuments(criteria),
      options,
    );

    rows = this._mapUserForTenantForRows(
      rows,
      currentTenant,
    );
    /*rows = await Promise.all(
      rows.map((row) =>
        this._fillRelationsAndFileDownloadUrls(
          row,
          options,
        ),
      ),
    );*/

    return { rows, count };
  }

  static async findAllAutocomplete(
    search,
    limit,
    options: IControllerOptions,
  ) {
    const currentTenant = MongooseController.getCurrentTenant(
      options,
    );

    let criteriaAnd: Array<any> = [
      {
        tenants: {
          $elemMatch: { tenant: currentTenant.id },
        },
      },
    ];

    if (search) {
      criteriaAnd.push({
        $or: [
          {
            _id: MongooseQueryUtils.uuid(search),
          },
          {
            fullName: {
              $regex: MongooseQueryUtils.escapeRegExp(
                search,
              ),
              $options: 'i',
            },
          },
          {
            email: {
              $regex: MongooseQueryUtils.escapeRegExp(
                search,
              ),
              $options: 'i',
            },
          },
        ],
      });
    }

    const sort = MongooseQueryUtils.sort('fullName_ASC');
    const limitEscaped = Number(limit || 0) || undefined;

    const criteria = { $and: criteriaAnd };

    let users = await User(options.database)
      .find(criteria)
      .limit(limitEscaped)
      .sort(sort);

    users = this._mapUserForTenantForRows(
      users,
      currentTenant,
    );

    const buildText = (user) => {
      if (!user.fullName) {
        return user.email;
      }

      return `${user.fullName} <${user.email}>`;
    };

    return users.map((user) => ({
      id: user.id,
      label: buildText(user),
    }));
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
      return ids;
    }

    const currentTenant =
      MongooseController.getCurrentTenant(options);

    let users = await User(options.database)
      .find({
        _id: {
          $in: ids,
        },
        tenants: {
          $elemMatch: { tenant: currentTenant.id },
        },
      })
      .select(['_id']);

    return users.map((user) => user._id);
  }

  static async findByIdWithPassword(
    id,
    options: IControllerOptions,
  ) {
    return await MongooseController.wrapWithSessionIfExists(
      User(options.database)
        .findById(id)
        .populate('tenants.tenant'),
      options,
    );
  }

  static async findById(id, options: IControllerOptions) {
    let record = await MongooseController.wrapWithSessionIfExists(
      User(options.database)
        .findById(id)
        .populate('tenants.tenant'),
      options,
    );

    if (!record) {
      throw new Error("record not found");
    }

    const currentTenant = MongooseController.getCurrentTenant(
      options,
    );

    if (!options || !options.bypassPermissionValidation) {
      if (!isUserInTenant(record, currentTenant.id)) {
        throw new Error("user not in tenant");
      }

      record = this._mapUserForTenant(
        record,
        currentTenant,
      );
    }

    /*record = await this._fillRelationsAndFileDownloadUrls(
      record,
      options,
    );*/

    return record;
  }

  static async findPassword(
    id,
    options: IControllerOptions,
  ) {
    let record = await MongooseController.wrapWithSessionIfExists(
      User(options.database)
        .findById(id)
        .select('+password'),
      options,
    );

    if (!record) {
      return null;
    }

    return record.password;
  }

  /**
   * Finds the user by the password token if not expired.
   */
  static async findByPasswordResetToken(
    token,
    options: IControllerOptions,
  ) {
    return MongooseController.wrapWithSessionIfExists(
      User(options.database).findOne({
        passwordResetToken: token,
        passwordResetTokenExpiresAt: { $gt: Date.now() },
      }),
      options,
    );
  }

  /**
   * Finds the user by the email verification token if not expired.
   */
  static async findByEmailVerificationToken(
    token,
    options: IControllerOptions,
  ) {
    return MongooseController.wrapWithSessionIfExists(
      User(options.database).findOne({
        emailVerificationToken: token,
        emailVerificationTokenExpiresAt: {
          $gt: Date.now(),
        },
      }),
      options,
    );
  }

  static async markEmailVerified(
    id,
    options: IControllerOptions,
  ) {
    const currentUser = MongooseController.getCurrentUser(
      options,
    );

    await User(options.database).updateOne(
      { _id: id },
      {
        emailVerified: true,
        updatedBy: currentUser.id,
      },
      options,
    );


    return true;
  }

  static async count(filter, options: IControllerOptions) {
    return MongooseController.wrapWithSessionIfExists(
      User(options.database).countDocuments(filter),
      options,
    );
  }

  /**
   * Normalize the user fields.
   */
  static _preSave(data) {
    if (data.firstName || data.lastName) {
      data.fullName = `${(data.firstName || '').trim()} ${(
        data.lastName || ''
      ).trim()}`.trim();
    }

    data.email = data.email ? data.email.trim() : null;

    data.firstName = data.firstName
      ? data.firstName.trim()
      : null;

    data.lastName = data.lastName
      ? data.lastName.trim()
      : null;

    return data;
  }

  /**
   * Maps the users data to show only the current tenant related info
   */
  static _mapUserForTenantForRows(rows, tenant) {
    if (!rows) {
      return rows;
    }

    return rows.map((record) =>
      this._mapUserForTenant(record, tenant),
    );
  }

  /**
   * Maps the user data to show only the current tenant related info
   */
  static _mapUserForTenant(user, tenant) {
    if (!user || !user.tenants) {
      return user;
    }

    const tenantUser = user.tenants.find(
      (tenantUser) =>
        tenantUser &&
        tenantUser.tenant &&
        String(tenantUser.tenant.id) === String(tenant.id),
    );

    delete user.tenants;

    const status = tenantUser ? tenantUser.status : null;
    const roles = tenantUser ? tenantUser.roles : [];

    // If the user is only invited,
    // tenant members can only see its email
    const otherData =
      status === 'active' ? user.toObject() : {};

    return {
      ...otherData,
      id: user.id,
      email: user.email,
      roles,
      status,
    };
  }

  static cleanupForRelationships(userOrUsers) {
    if (!userOrUsers) {
      return userOrUsers;
    }

    if (Array.isArray(userOrUsers)) {
      return userOrUsers.map((user) =>
        lodash.pick(user, [
          '_id',
          'id',
          'firstName',
          'lastName',
          'email',
        ]),
      );
    }

    return lodash.pick(userOrUsers, [
      '_id',
      'id',
      'firstName',
      'lastName',
      'email',
    ]);
  }
}
