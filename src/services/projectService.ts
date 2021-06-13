import MongooseController from '../Controller/mongooseController';
import { IServiceOptions } from './IServiceOptions';
import ProjectController from '../Controller/projectController';
import TaskController from '../Controller/taskController';
import UserController from '../Controller/userController';

export default class ProjectService {
  options: IServiceOptions;

  constructor(options) {
    this.options = options;
  }

  async create(data) {
    const session = await MongooseController.createSession(
      this.options.database,
    );

    try {
      data.admins = await UserController.filterIdInTenant(data.admins, { ...this.options, session });
      data.usersList = await UserController.filterIdsInTenant(data.usersList, { ...this.options, session });
      data.statut = await TaskController.filterIdInTenant(data.statut, { ...this.options, session });
      data.task = await TaskController.filterIdsInTenant(data.task, { ...this.options, session });

      const record = await ProjectController.create(data, {
        ...this.options,
        session,
      });

      await MongooseController.commitTransaction(session);

      return record;
    } catch (error) {
      await MongooseController.abortTransaction(session);

      MongooseController.handleUniqueFieldError(
        error,
        'project',
      );

      throw error;
    }
  }

  async update(id, data) {
    const session = await MongooseController.createSession(
      this.options.database,
    );

    try {
      data.admins = await UserController.filterIdInTenant(data.admins, { ...this.options, session });
      data.usersList = await UserController.filterIdInTenant(data.usersList, { ...this.options, session });
      data.statut = await TaskController.filterIdInTenant(data.statut, { ...this.options, session });
      data.task = await TaskController.filterIdsInTenant(data.task, { ...this.options, session });

      const record = await ProjectController.update(
        id,
        data,
        {
          ...this.options,
          session,
        },
      );

      await MongooseController.commitTransaction(session);

      return record;
    } catch (error) {
      await MongooseController.abortTransaction(session);

      MongooseController.handleUniqueFieldError(
        error,
        'project',
      );

      throw error;
    }
  }

  async destroyAll(ids) {
    const session = await MongooseController.createSession(
      this.options.database,
    );

    try {
      for (const id of ids) {
        await ProjectController.destroy(id, {
          ...this.options,
          session,
        });
      }

      await MongooseController.commitTransaction(session);
    } catch (error) {
      await MongooseController.abortTransaction(session);
      throw error;
    }
  }

  async findById(id) {
    return ProjectController.findById(id, this.options);
  }

  async findAllAutocomplete(search, limit) {
    return ProjectController.findAllAutocomplete(
      search,
      limit,
      this.options,
    );
  }

  async findAndCountAll(args) {
    return ProjectController.findAndCountAll(
      args,
      this.options,
    );
  }

  async import(data, importHash) {
    if (!importHash) {
      throw new Error("import Hash Required");
      
    }

    if (await this._isImportHashExistent(importHash)) {
      throw new Error('import Hash Existent');
    }

    const dataToCreate = {
      ...data,
      importHash,
    };

    return this.create(dataToCreate);
  }

  async _isImportHashExistent(importHash) {
    const count = await ProjectController.count(
      {
        importHash,
      },
      this.options,
    );

    return count > 0;
  }
}
