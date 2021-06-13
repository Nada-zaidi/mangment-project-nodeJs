import MongooseRepository from '../Controller/mongooseController';
import { IServiceOptions } from './IServiceOptions';
import ProjectRepository from '../Controller/projectController';
import TaskRepository from '../Controller/taskController';
import UserRepository from '../Controller/userController';

export default class ProjectService {
  options: IServiceOptions;

  constructor(options) {
    this.options = options;
  }

  async create(data) {
    const session = await MongooseRepository.createSession(
      this.options.database,
    );

    try {
      data.admins = await UserRepository.filterIdInTenant(data.admins, { ...this.options, session });
      data.usersList = await UserRepository.filterIdsInTenant(data.usersList, { ...this.options, session });
      data.statut = await TaskRepository.filterIdInTenant(data.statut, { ...this.options, session });
      data.task = await TaskRepository.filterIdsInTenant(data.task, { ...this.options, session });

      const record = await ProjectRepository.create(data, {
        ...this.options,
        session,
      });

      await MongooseRepository.commitTransaction(session);

      return record;
    } catch (error) {
      await MongooseRepository.abortTransaction(session);

      MongooseRepository.handleUniqueFieldError(
        error,
        'project',
      );

      throw error;
    }
  }

  async update(id, data) {
    const session = await MongooseRepository.createSession(
      this.options.database,
    );

    try {
      data.admins = await UserRepository.filterIdInTenant(data.admins, { ...this.options, session });
      data.usersList = await UserRepository.filterIdInTenant(data.usersList, { ...this.options, session });
      data.statut = await TaskRepository.filterIdInTenant(data.statut, { ...this.options, session });
      data.task = await TaskRepository.filterIdsInTenant(data.task, { ...this.options, session });

      const record = await ProjectRepository.update(
        id,
        data,
        {
          ...this.options,
          session,
        },
      );

      await MongooseRepository.commitTransaction(session);

      return record;
    } catch (error) {
      await MongooseRepository.abortTransaction(session);

      MongooseRepository.handleUniqueFieldError(
        error,
        'project',
      );

      throw error;
    }
  }

  async destroyAll(ids) {
    const session = await MongooseRepository.createSession(
      this.options.database,
    );

    try {
      for (const id of ids) {
        await ProjectRepository.destroy(id, {
          ...this.options,
          session,
        });
      }

      await MongooseRepository.commitTransaction(session);
    } catch (error) {
      await MongooseRepository.abortTransaction(session);
      throw error;
    }
  }

  async findById(id) {
    return ProjectRepository.findById(id, this.options);
  }

  async findAllAutocomplete(search, limit) {
    return ProjectRepository.findAllAutocomplete(
      search,
      limit,
      this.options,
    );
  }

  async findAndCountAll(args) {
    return ProjectRepository.findAndCountAll(
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
    const count = await ProjectRepository.count(
      {
        importHash,
      },
      this.options,
    );

    return count > 0;
  }
}
