import MongooseController from '../Controller/mongooseController';
import { IServiceOptions } from './IServiceOptions';
import TaskController from '../Controller/taskController';
import ProjectController from '../Controller/projectController';
import UserController from '../Controller/userController';

export default class TaskService {
  options: IServiceOptions;

  constructor(options) {
    this.options = options;
  }

  async create(data) {
    const session = await MongooseController.createSession(
      this.options.database,
    );

    try {
      data.assignedTo = await UserController.filterIdInTenant(data.assignedTo, { ...this.options, session });
      data.project = await ProjectController.filterIdInTenant(data.project, { ...this.options, session });

      const record = await TaskController.create(data, {
        ...this.options,
        session,
      });

      await MongooseController.commitTransaction(session);

      return record;
    } catch (error) {
      await MongooseController.abortTransaction(session);

      MongooseController.handleUniqueFieldError(
        error,
        'task',
      );

      throw error;
    }
  }


  async findById(id) {
    return TaskController.findById(id, this.options);
  }

  async findAllAutocomplete(search, limit) {
    return TaskController.findAllAutocomplete(
      search,
      limit,
      this.options,
    );
  }


  /*async _isImportHashExistent(importHash) {
    const count = await TaskController.count(
      {
        importHash,
      },
      this.options,
    );

    return count > 0;
  }*/
}
