import mongoose from 'mongoose';
const Schema = mongoose.Schema;

export default (database) => {
  try {
    return database.model('task');
  } catch (error) {
    // continue, because model doesnt exist
  }

  const TaskSchema = new Schema(
    {
      title: {
        type: String,
      },
      description: {
        type: String,
      },
      assignedTo: {
        type: Schema.Types.ObjectId,
        ref: 'user',
      },
      statut: {
        type: String,
        enum: [
          'New','Active' ,'Done',
          null
        ],
      },
      dateCompletion: {
        type: String,
      },
      project: {
        type: Schema.Types.ObjectId,
        ref: 'project',
      },
      tenant: {
        type: Schema.Types.ObjectId,
        ref: 'tenant',
        required: true
      },
      createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
      },
      updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
      },
      importHash: { type: String },
    },
    { timestamps: true },
  );

  TaskSchema.index(
    { importHash: 1, tenant: 1 },
    {
      unique: true,
      partialFilterExpression: {
        importHash: { $type: 'string' },
      },
    },
  );

  

  TaskSchema.virtual('id').get(function () {
    // @ts-ignore
    return this._id.toHexString();
  });

  TaskSchema.set('toJSON', {
    getters: true,
  });

  TaskSchema.set('toObject', {
    getters: true,
  });

  return database.model('task', TaskSchema);
};
