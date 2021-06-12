import mongoose from 'mongoose';
const Schema = mongoose.Schema;

export default (database) => {
  try {
    return database.model('project');
  } catch (error) {
    // continue, because model doesnt exist
  }

  const ProjectSchema = new Schema(
    {
      title: {
        type: String,
      },
      description: {
        type: String,
      },
      admins: {
        type: Schema.Types.ObjectId,
        ref: 'user',
      },
      usersList: {
        type: Schema.Types.ObjectId,
        ref: 'user',
      },
      statut: {
        type: Schema.Types.ObjectId,
        ref: 'task',
      },
      task: [{
        type: Schema.Types.ObjectId,
        ref: 'task',
      }],
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
/*defined a unique index on the document properties importHash tenant.
    importHash is unique
    we have only one tenant
  */
  ProjectSchema.index(
    { importHash: 1, tenant: 1 },
    {
      unique: true,
      partialFilterExpression: {
        importHash: { $type: 'string' },
      },
    },
  );

  

  ProjectSchema.virtual('id').get(function () {
    // @ts-ignore
    return this._id.toHexString();
  });

  ProjectSchema.set('toJSON', {
    getters: true,
  });

  ProjectSchema.set('toObject', {
    getters: true,
  });

  return database.model('project', ProjectSchema);
};
