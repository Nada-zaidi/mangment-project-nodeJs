import MongooseRepository from '../database/repositories/mongooseRepository';
import { IServiceOptions } from './IServiceOptions';
import TaskRepository from '../database/repositories/taskRepository';
import ProjectRepository from '../database/repositories/projectRepository';
import UserRepository from '../database/repositories/userRepository';

export default class TaskService {
  options: IServiceOptions;

  constructor(options) {
    this.options = options;
  }

  async create(data) {
    const session = await MongooseRepository.createSession(
      this.options.database,
    );

    try {
      data.assignedTo = await UserRepository.filterIdInTenant(data.assignedTo, { ...this.options, session });
      data.project = await ProjectRepository.filterIdInTenant(data.project, { ...this.options, session });

      const record = await TaskRepository.create(data, {
        ...this.options,
        session,
      });

      await MongooseRepository.commitTransaction(session);

      return record;
    } catch (error) {
      await MongooseRepository.abortTransaction(session);

      MongooseRepository.handleUniqueFieldError(
        error,
        'task',
      );

      throw error;
    }
  }


  async findById(id) {
    return TaskRepository.findById(id, this.options);
  }

  async findAllAutocomplete(search, limit) {
    return TaskRepository.findAllAutocomplete(
      search,
      limit,
      this.options,
    );
  }


  /*async _isImportHashExistent(importHash) {
    const count = await TaskRepository.count(
      {
        importHash,
      },
      this.options,
    );

    return count > 0;
  }*/
}
